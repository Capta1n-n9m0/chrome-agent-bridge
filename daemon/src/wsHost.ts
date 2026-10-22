import { WebSocketServer, WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { isEvent, type EventMessage, type ExtensionStatusParams, type WelcomeMessage } from "@bridge/shared";
import { Bridge } from "./bridge.js";
import { ExtensionConnection } from "./connection.js";
import { parseHello } from "./handshake.js";
import { TabLayer } from "./intercept.js";
import { ClientRegistry, DEFAULT_CLIENT_NAME } from "./registry.js";
import { route, CLOSE_UPGRADING, type RouteContext, type RouteHost } from "./route.js";

/** Protocol generation spoken by this host (spec §10). */
export const PROTO = 2;
/** `build` when the entry point passes none (D3 wires the real sha256). */
export const DEFAULT_BUILD = "dev";
/** Close code for a failed handshake: bad token, unknown role, malformed hello. */
export const CLOSE_HANDSHAKE = 4001;
/** How long `shutdown` waits for close handshakes before terminating the rest. */
const SHUTDOWN_GRACE_MS = 1000;

export interface WsHostOptions {
  port: number;
  token: string;
  /**
   * Ping interval. A socket that misses one pong is terminated, so a Chrome that died (or an
   * offscreen document Chrome tore down) is detected within ~2 intervals instead of leaving a
   * stale connection on the Bridge where every call waits the full 30 s timeout. Applies to
   * clients too. Default 30 000.
   */
  heartbeatMs?: number;
  /** Build identity sent in every `welcome` and in `daemon.status`. Default `"dev"`. */
  build?: string;
  /** Clock for uptime and client `since`. Default `Date.now`. */
  now?: () => number;
  /**
   * Called once, with the code, after the first `shutdown` has finished closing every socket —
   * whoever started it (a signal, the idle timer, or a client's `daemon.shutdown`). The daemon entry
   * exits the process here (D3). An exception it throws is swallowed.
   */
  onShutdown?: (code: number) => void;
  /**
   * The daemon log (Step 7: `main.ts` wires `logger.log`). Lines carry handles, client names and
   * counts only — never a URL, title, header value, body or the token. Default: no log.
   */
  log?: (msg: string) => void;
}

/** Counters for the daemon log (counts only — never URLs, header values, bodies or the token). */
export interface HostStats {
  clients: number;
  /** `{event, params}` frames from the extension (all counted, valid or not; Step 7 acts on the valid ones). */
  extensionEvents: number;
  /** Client frames that could not be answered (unparseable, or without a usable id). */
  ignoredClientFrames: number;
}

/** One `role: "client"` socket: parses requests, routes them, answers under the client's id. */
export class ClientConnection {
  private inFlight = 0;

  constructor(
    private readonly ws: WebSocket,
    private readonly ctx: RouteContext,
    private readonly onIgnored: () => void,
  ) {}

  pending(): number {
    return this.inFlight;
  }

  isOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  /** Send a frame if the socket is still open; a closed client's late reply is dropped. */
  send(frame: unknown): boolean {
    if (!this.isOpen()) return false;
    this.ws.send(JSON.stringify(frame));
    return true;
  }

  handleFrame(data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      this.onIgnored();
      return;
    }
    this.inFlight++;
    route(parsed, this.ctx)
      .then(async (outcome) => {
        if (!outcome) {
          this.onIgnored();
          return;
        }
        this.send(outcome.response);
        await outcome.after?.();
      })
      .catch((err: unknown) => {
        console.error("[chrome-bridge] routing failed:", err instanceof Error ? err.name : typeof err);
      })
      .finally(() => {
        this.inFlight--;
      });
  }
}

type Role = "extension" | "client";

export class WsHost implements RouteHost {
  private wss: WebSocketServer | undefined;
  private boundPort: number | null = null;
  private startedAt: number;
  private shuttingDown: Promise<void> | undefined;
  private extensionEvents = 0;
  private ignoredClientFrames = 0;
  private readonly now: () => number;

  /** The connected clients (role `"client"`); the extension is never in here. */
  readonly registry: ClientRegistry<ClientConnection>;
  readonly build: string;
  /** Step 7: handles, leases, the visibility lock (applied to every client request). */
  readonly tabs: TabLayer;

  constructor(
    private readonly bridge: Bridge,
    private readonly options: WsHostOptions,
  ) {
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
    this.build = options.build ?? DEFAULT_BUILD;
    this.registry = new ClientRegistry<ClientConnection>({ now: this.now });
    this.tabs = new TabLayer({
      bridge,
      nameOf: (id) => this.registry.nameOf(id),
      sendTo: (id, frame) => {
        this.registry.get(id)?.send(frame);
      },
      log: options.log,
      now: this.now,
    });
  }

  get port(): number | null {
    return this.boundPort;
  }

  uptimeMs(): number {
    return this.now() - this.startedAt;
  }

  stats(): HostStats {
    return {
      clients: this.registry.count(),
      extensionEvents: this.extensionEvents,
      ignoredClientFrames: this.ignoredClientFrames,
    };
  }

  listen(): Promise<number> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ host: "127.0.0.1", port: this.options.port });
      wss.on("error", reject);
      wss.on("listening", () => {
        this.wss = wss;
        wss.off("error", reject);
        wss.on("connection", (ws) => this.onConnection(ws));
        this.boundPort = (wss.address() as AddressInfo).port;
        this.startedAt = this.now();
        resolve(this.boundPort);
      });
    });
  }

  /** A client connection's context: always with the tab layer; `caller` is set once registered. */
  private routeContext(): RouteContext {
    return { bridge: this.bridge, registry: this.registry, host: this, tabs: this.tabs };
  }

  private broadcast<P extends object>(frame: EventMessage<P>): void {
    for (const client of this.registry.connections()) client.send(frame);
  }

  private broadcastExtensionStatus(connected: boolean): void {
    const frame: EventMessage<ExtensionStatusParams> = { event: "extensionStatus", params: { connected } };
    this.broadcast(frame);
  }

  private onConnection(ws: WebSocket): void {
    let role: Role | undefined;
    let connection: ExtensionConnection | undefined;
    let client: ClientConnection | undefined;
    let clientId: string | undefined;

    ws.on("error", (err) => console.error("[chrome-bridge] socket error:", err.message));

    // Browsers answer WebSocket pings automatically and so does `ws`, so a missing pong means the
    // peer is gone (a dead Chrome, or a client whose event loop is blocked).
    let isAlive = true;
    ws.on("pong", () => {
      isAlive = true;
    });
    const heartbeat = setInterval(() => {
      if (!isAlive) {
        console.error(`[chrome-bridge] ${role ?? "unauthenticated peer"} stopped answering pings — dropping the connection`);
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, this.options.heartbeatMs ?? 30_000);

    ws.on("message", (raw) => {
      const data = raw.toString();
      if (!role) {
        if (this.shuttingDown) return; // shutdown is closing this socket; welcome nobody
        const hello = parseHello(data, this.options.token);
        if (!hello.ok) {
          ws.close(CLOSE_HANDSHAKE, hello.reason);
          return;
        }
        role = hello.role;
        if (role === "extension") {
          connection = new ExtensionConnection((d) => ws.send(d));
          this.bridge.setConnection(connection);
          this.sendWelcome(ws, "extension");
          this.broadcastExtensionStatus(true);
          // #42: a hello without `proto` is a stale extension (tab methods get VERSION). Read here,
          // not from parseHello, whose result shape Step 6 tests pin.
          this.tabs.extensionConnected(connection, helloProto(data) >= 2);
        } else {
          const ctx = this.routeContext();
          client = new ClientConnection(ws, ctx, () => this.ignoredClientFrames++);
          clientId = this.registry.add(client, { name: hello.name });
          ctx.caller = { clientId, name: hello.name ?? DEFAULT_CLIENT_NAME };
          this.sendWelcome(ws, clientId);
        }
        return;
      }
      if (role === "extension") this.onExtensionFrame(connection!, data);
      else client!.handleFrame(data);
    });

    ws.on("close", () => {
      clearInterval(heartbeat);
      if (connection) {
        connection.rejectAll("extension disconnected");
        // Only the current extension going away is news; an old socket closing after a newer one
        // connected changes nothing (B7).
        if (this.bridge.currentConnection() === connection) {
          this.bridge.setConnection(null);
          this.broadcastExtensionStatus(false);
        }
      }
      if (clientId) {
        this.registry.remove(clientId);
        this.tabs.clientGone(clientId); // F14: leases and the lock go with the connection
      }
    });
  }

  private sendWelcome(ws: WebSocket, clientId: string): void {
    const welcome: WelcomeMessage = {
      type: "welcome",
      build: this.build,
      proto: PROTO,
      clientId,
      extensionConnected: this.bridge.isConnected(),
    };
    ws.send(JSON.stringify(welcome));
  }

  private onExtensionFrame(connection: ExtensionConnection, data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    // Step 7 extensions push tab events: every one is counted; valid ones update the tab layer.
    if (isEvent(parsed)) {
      this.extensionEvents++;
      this.tabs.extensionEvent(connection, parsed);
      return;
    }
    connection.handleMessage(data);
  }

  /**
   * Graceful stop (decisions.md #15): stop accepting, send `close(code, reason)` to every socket —
   * clients and the extension — wait up to 1 s for their close events, then terminate the rest.
   * Idempotent. Does not exit the process.
   */
  shutdown(code: number, reason?: string): Promise<void> {
    if (this.shuttingDown) return this.shuttingDown;
    const why = reason ?? (code === CLOSE_UPGRADING ? "upgrading" : "daemon shutting down");
    this.shuttingDown = this.doShutdown(code, why).finally(() => {
      try {
        this.options.onShutdown?.(code);
      } catch {
        // the hook's failure must not turn a completed shutdown into a rejection
      }
    });
    return this.shuttingDown;
  }

  private async doShutdown(code: number, reason: string): Promise<void> {
    const wss = this.wss;
    if (!wss) return;
    // The callback fires once the listener is closed and every tracked socket has gone.
    const serverClosed = new Promise<void>((resolve) => wss.close(() => resolve()));
    const sockets = [...wss.clients];
    const allClosed = Promise.all(
      sockets.map(
        (s) =>
          new Promise<void>((resolve) => {
            if (s.readyState === WebSocket.CLOSED) return resolve();
            s.once("close", () => resolve());
          }),
      ),
    );
    for (const s of sockets) s.close(code, reason);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const grace = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SHUTDOWN_GRACE_MS);
    });
    await Promise.race([allClosed, grace]);
    clearTimeout(timer);
    for (const s of sockets) if (s.readyState !== WebSocket.CLOSED) s.terminate();
    await allClosed;
    await serverClosed;
    this.wss = undefined;
  }

  /** Immediate stop: terminate every socket (no close frame). Used by the MCP and tests. */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) return resolve();
      this.wss.close(() => resolve());
      for (const client of this.wss.clients) client.terminate();
    });
  }
}

/** The `proto` of an (already validated) hello frame, 0 when absent. */
function helloProto(data: string): number {
  try {
    const proto = (JSON.parse(data) as { proto?: unknown }).proto;
    return typeof proto === "number" ? proto : 0;
  } catch {
    return 0;
  }
}

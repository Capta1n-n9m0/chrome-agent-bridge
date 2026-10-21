// BridgeClient: one welcomed connection to the daemon, id-correlated calls, events, and the
// close-code rules of decision #15 — reconnect on 4002 only; any other close fails the client.
import {
  BridgeError,
  ErrorCodes,
  fromWire,
  isErrorResponse,
  isEvent,
  isResponse,
  type EventMessage,
  type RequestMessage,
  type WelcomeMessage,
} from "@bridge/shared";
import type { Knocked } from "./knock.js";
import type { Connection } from "./transport.js";

/** Close code the daemon sends when it is replaced (`daemon.shutdown`, handover). */
export const CLOSE_UPGRADING = 4002;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MIN_TIMEOUT_MS = 100;
export const MAX_TIMEOUT_MS = 600_000;
/** The daemon waits the bounded timeout plus this, so the extension's own timer reports first. */
export const DAEMON_SLACK_MS = 5_000;
/** The client waits 1 s longer than the daemon, so the daemon's TIMEOUT always arrives first. */
export const CLIENT_MARGIN_MS = 1_000;

/** The client's own timer for a call: `clamp(timeoutMs ?? 30000, 100, 600000) + 5000 + 1000`. */
export function clientTimeoutMs(timeoutMs: number | undefined): number {
  const requested = timeoutMs !== undefined && Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const bounded = Math.min(Math.max(requested, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  return bounded + DAEMON_SLACK_MS + CLIENT_MARGIN_MS;
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface CallOptions {
  /** Per-call timeout sent to the daemon (it bounds it to [100, 600000] and adds 5 s). */
  timeoutMs?: number;
}

/** What the client tells its knock: `reconnect` is true on the knock that follows a 4002 close. */
export interface KnockContext {
  reconnect: boolean;
}

export interface BridgeClientOptions {
  /**
   * Runs the knock (a fresh one per connect and per 4002 reconnect). `connect()` disables the
   * handover when `ctx.reconnect` is true (decision #10: one handover, never back and forth).
   */
  knock: (ctx: KnockContext) => Promise<Knocked>;
  timers?: Timers;
}

type FailureListener = (err: BridgeError) => void;
/**
 * Package-internal (not re-exported from index.ts): `connect()` uses it to stop waiting for the
 * extension as soon as the client fails. Kept off the class so the public surface does not grow.
 */
const failureListeners = new WeakMap<BridgeClient, Set<FailureListener>>();

/** Calls `listener` once if `client` fails (a non-4002 close, or a failed 4002 reconnect). */
export function onClientFailure(client: BridgeClient, listener: FailureListener): () => void {
  let set = failureListeners.get(client);
  if (!set) {
    set = new Set();
    failureListeners.set(client, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

type EventListener = (event: EventMessage) => void;
type ReconnectListener = (welcome: WelcomeMessage) => void;

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: BridgeError) => void;
  timer: unknown;
}

type State = "idle" | "connecting" | "open" | "reconnecting" | "failed" | "closed";

export class BridgeClient {
  private readonly knockFn: (ctx: KnockContext) => Promise<Knocked>;
  private readonly timers: Timers;
  private state: State = "idle";
  private conn: Connection | null = null;
  private detachConn: (() => void) | null = null;
  private ready: Promise<WelcomeMessage> | null = null;
  private failure: BridgeError | null = null;
  private readonly pending = new Map<string, Pending>();
  private nextId = 1;
  private readonly eventListeners = new Set<EventListener>();
  private readonly reconnectListeners = new Set<ReconnectListener>();
  private currentWelcome: WelcomeMessage | null = null;
  private extensionUp = false;

  constructor(options: BridgeClientOptions) {
    this.knockFn = options.knock;
    this.timers = options.timers ?? realTimers;
  }

  /**
   * The latest welcome from the daemon (build, proto, clientId, extensionConnected); null before the
   * first connect. It is replaced after every 4002 reconnect.
   */
  get welcome(): WelcomeMessage | null {
    return this.currentWelcome;
  }

  /**
   * Whether the daemon reports the Chrome extension connected: from the latest welcome, then kept
   * current by `extensionStatus` events (including any that arrived right behind the welcome).
   */
  get extensionConnected(): boolean {
    return this.extensionUp;
  }

  /** Runs the knock; resolves when welcomed. */
  async connect(): Promise<WelcomeMessage> {
    if (this.state === "open" && this.currentWelcome) return this.currentWelcome;
    if (this.state === "connecting" || this.state === "reconnecting") return this.ready!;
    if (this.state === "closed") throw this.closedError();
    if (this.state === "failed") throw this.failure!;
    this.state = "connecting";
    this.ready = this.establish(false);
    try {
      return await this.ready;
    } catch (err) {
      if (this.state === "connecting") this.state = "idle";
      throw err;
    }
  }

  async call(method: string, params?: Record<string, unknown>, options: CallOptions = {}): Promise<unknown> {
    if (this.state === "connecting" || this.state === "reconnecting") {
      try {
        await this.ready;
      } catch {
        // reported below from the state the failure left behind
      }
    }
    if (this.state === "closed") throw this.closedError();
    if (this.state === "failed") throw this.failure!;
    if (this.state !== "open" || !this.conn) {
      throw new BridgeError(ErrorCodes.NOT_CONNECTED, `Not connected to the bridge daemon (call connect() first) calling ${method}`);
    }
    return this.send(this.conn, method, params, options.timeoutMs);
  }

  /** `daemon.status` — build, uptime, clients, extension. */
  status(): Promise<unknown> {
    return this.call("daemon.status");
  }

  /**
   * `"event"`: every daemon → client event frame (e.g. `extensionStatus`).
   *
   * `"reconnected"`: fires after a 4002 reconnect has been welcomed, with the new welcome. This is
   * the hook where Step 7/8 clear the client's tab cursor (decision #11): a replaced daemon knows
   * nothing of the tabs the old one handed out. Not fired for the first connect.
   *
   * Returns an unsubscribe.
   */
  on(type: "event", listener: EventListener): () => void;
  on(type: "reconnected", listener: ReconnectListener): () => void;
  on(type: "event" | "reconnected", listener: EventListener | ReconnectListener): () => void {
    if (type === "event") {
      const l = listener as EventListener;
      this.eventListeners.add(l);
      return () => {
        this.eventListeners.delete(l);
      };
    }
    const l = listener as ReconnectListener;
    this.reconnectListeners.add(l);
    return () => {
      this.reconnectListeners.delete(l);
    };
  }

  /** Closes the socket and rejects pending calls. Never reconnects. */
  close(): void {
    if (this.state === "closed") return;
    this.state = "closed";
    const conn = this.conn;
    this.drop();
    this.rejectAll(this.closedError());
    conn?.close(1000, "client closed");
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private closedError(): BridgeError {
    return new BridgeError(ErrorCodes.NOT_CONNECTED, "BridgeClient is closed");
  }

  private async establish(reconnect: boolean): Promise<WelcomeMessage> {
    const { conn, welcome } = await this.knockFn({ reconnect });
    if (this.state === "closed") {
      conn.close(1000, "client closed");
      throw this.closedError();
    }
    this.attach(conn, welcome);
    this.state = "open";
    return welcome;
  }

  private attach(conn: Connection, welcome: WelcomeMessage): void {
    this.conn = conn;
    this.currentWelcome = welcome;
    this.extensionUp = welcome.extensionConnected;
    const offMessage = conn.onMessage((m) => this.handleMessage(m));
    const offClose = conn.onClose((code, reason) => this.handleClose(conn, code, reason));
    this.detachConn = () => {
      offMessage();
      offClose();
    };
  }

  private drop(): void {
    this.detachConn?.();
    this.detachConn = null;
    this.conn = null;
  }

  private send(
    conn: Connection,
    method: string,
    params: Record<string, unknown> | undefined,
    timeoutMs: number | undefined,
  ): Promise<unknown> {
    const id = String(this.nextId++);
    const request: RequestMessage = { id, method };
    if (params !== undefined) request.params = params;
    if (timeoutMs !== undefined) request.timeoutMs = timeoutMs;
    const wait = clientTimeoutMs(timeoutMs);
    return new Promise((resolve, reject) => {
      const timer = this.timers.setTimeout(() => {
        this.pending.delete(id);
        reject(new BridgeError(ErrorCodes.TIMEOUT, `Timed out after ${wait}ms calling ${method}`));
      }, wait);
      this.pending.set(id, { resolve, reject, timer });
      conn.send(request);
    });
  }

  private handleMessage(message: unknown): void {
    if (isResponse(message)) {
      const p = this.pending.get(message.id);
      if (!p) return;
      this.pending.delete(message.id);
      this.timers.clearTimeout(p.timer);
      if (isErrorResponse(message)) p.reject(fromWire(message.error));
      else p.resolve(message.result);
      return;
    }
    if (isEvent(message)) {
      if (message.event === "extensionStatus" && typeof message.params.connected === "boolean") {
        this.extensionUp = message.params.connected;
      }
      for (const l of [...this.eventListeners]) l(message);
    }
  }

  private handleClose(conn: Connection, code: number, reason: string): void {
    if (conn !== this.conn) return;
    this.drop();
    if (this.state === "closed") return;

    if (code === CLOSE_UPGRADING) {
      this.rejectAll(
        new BridgeError(
          ErrorCodes.NOT_CONNECTED,
          "daemon restarting (4002) — the call was in flight when the daemon was replaced; reconnecting",
        ),
      );
      this.state = "reconnecting";
      const ready = this.establish(true).then(
        (welcome) => {
          for (const l of [...this.reconnectListeners]) l(welcome);
          return welcome;
        },
        (err: unknown) => {
          if (this.state !== "closed") {
            this.state = "failed";
            this.failure =
              err instanceof BridgeError ? err : new BridgeError(ErrorCodes.NOT_CONNECTED, String(err));
            this.notifyFailure(this.failure);
          }
          throw err;
        },
      );
      ready.catch(() => {}); // surfaced by the next call()
      this.ready = ready;
      return;
    }

    const why = reason ? ` "${reason}"` : "";
    const err = new BridgeError(
      ErrorCodes.NOT_CONNECTED,
      `The connection to the bridge daemon closed (code ${code}${why}); this client does not reconnect — ` +
        "call connect() for a new client to continue",
    );
    this.state = "failed";
    this.failure = err;
    this.rejectAll(err);
    this.notifyFailure(err);
  }

  private notifyFailure(err: BridgeError): void {
    const set = failureListeners.get(this);
    if (!set) return;
    failureListeners.delete(this);
    for (const l of [...set]) l(err);
  }

  private rejectAll(err: BridgeError): void {
    for (const [id, p] of this.pending) {
      this.pending.delete(id);
      this.timers.clearTimeout(p.timer);
      p.reject(err);
    }
  }
}

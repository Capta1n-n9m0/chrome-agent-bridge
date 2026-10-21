// The real transport over `ws`, against a real server on 127.0.0.1, port 0.
import { describe, it, expect, afterEach } from "vitest";
import { WebSocketServer, type WebSocket } from "ws";
import net, { type AddressInfo } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { tryConnect } from "../src/transport.js";
import { connect } from "../src/connect.js";

let wss: WebSocketServer | null = null;
let raw: { server: net.Server; sockets: net.Socket[] } | null = null;
let tmp: string | null = null;

afterEach(async () => {
  if (wss) {
    for (const c of wss.clients) c.terminate();
    await new Promise<void>((r) => wss!.close(() => r()));
    wss = null;
  }
  if (raw) {
    for (const s of raw.sockets) s.destroy();
    await new Promise<void>((r) => raw!.server.close(() => r()));
    raw = null;
  }
  if (tmp) {
    rmSync(tmp, { recursive: true, force: true });
    tmp = null;
  }
});

function listen(): Promise<{ port: number; server: WebSocketServer }> {
  return new Promise((resolve) => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 }, () => {
      resolve({ port: (server.address() as AddressInfo).port, server });
    });
    wss = server;
  });
}

function nextSocket(server: WebSocketServer): Promise<WebSocket> {
  return new Promise((r) => server.once("connection", (s) => r(s)));
}

/** A port that was just free: bind 0, read it, close. */
async function freePort(): Promise<number> {
  const { port, server } = await listen();
  await new Promise<void>((r) => server.close(() => r()));
  wss = null;
  return port;
}

describe("tryConnect (ws transport)", () => {
  it("rejects with code ECONNREFUSED when nothing listens", async () => {
    const port = await freePort();
    await expect(tryConnect(port)).rejects.toMatchObject({ code: "ECONNREFUSED" });
  }, 15_000);

  it("sends and receives JSON, and reports the close code and reason", async () => {
    const { port, server } = await listen();
    const accepted = nextSocket(server);
    const conn = await tryConnect(port);
    const sock = await accepted;

    const fromClient = new Promise<string>((r) => sock.once("message", (d) => r(d.toString())));
    conn.send({ type: "hello", n: 1 });
    expect(JSON.parse(await fromClient)).toEqual({ type: "hello", n: 1 });

    const got = new Promise<unknown>((r) => conn.onMessage(r));
    sock.send(JSON.stringify({ type: "welcome" }));
    expect(await got).toEqual({ type: "welcome" });

    const closed = new Promise<[number, string]>((r) => conn.onClose((c, why) => r([c, why])));
    sock.close(4002, "upgrading");
    expect(await closed).toEqual([4002, "upgrading"]);
  });

  it("buffers frames that arrive while nobody listens and drops non-JSON", async () => {
    const { port, server } = await listen();
    const accepted = nextSocket(server);
    const conn = await tryConnect(port);
    const sock = await accepted;
    sock.send("not json");
    sock.send(JSON.stringify({ event: "extensionStatus", params: { connected: true } }));
    // Frames are processed in order, so once the close arrives both frames have been seen.
    const closed = new Promise<void>((r) => conn.onClose(() => r()));
    sock.close(1000);
    await closed;
    const seen: unknown[] = [];
    conn.onMessage((m) => seen.push(m));
    expect(seen).toEqual([{ event: "extensionStatus", params: { connected: true } }]);
  });

  it("onClose after the socket closed still reports it", async () => {
    const { port, server } = await listen();
    const accepted = nextSocket(server);
    const conn = await tryConnect(port);
    const sock = await accepted;
    const first = new Promise<number>((r) => conn.onClose((c) => r(c)));
    sock.close(1000);
    await first;
    const late = await new Promise<number>((r) => conn.onClose((c) => r(c)));
    expect(late).toBe(1000);
  });

  it("a listener that unsubscribes inside its callback leaves the frames of the same TCP read buffered", async () => {
    const { port, server } = await listen();
    const accepted = nextSocket(server);
    const conn = await tryConnect(port);
    const sock = await accepted;
    const first: unknown[] = [];
    const off = conn.onMessage((m) => {
      first.push(m);
      off();
    });
    const tcp = (sock as unknown as { _socket: net.Socket })._socket;
    tcp.cork();
    for (const n of [1, 2, 3]) sock.send(JSON.stringify({ n }));
    tcp.uncork();
    const closed = new Promise<void>((r) => conn.onClose(() => r()));
    sock.close(1000);
    await closed;

    const rest: unknown[] = [];
    conn.onMessage((m) => rest.push(m));
    expect(first).toEqual([{ n: 1 }]);
    expect(rest).toEqual([{ n: 2 }, { n: 3 }]);
  });

  it("rejects with code ETIMEDOUT when the port holder accepts TCP but never answers the upgrade", async () => {
    const sockets: net.Socket[] = [];
    const server = net.createServer((s) => sockets.push(s)); // accept, then stay silent
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    raw = { server, sockets };
    const port = (server.address() as AddressInfo).port;

    const started = performance.now();
    await expect(tryConnect(port, 150)).rejects.toMatchObject({ code: "ETIMEDOUT" });
    expect(performance.now() - started).toBeLessThan(1_500);
  }, 3_000);
});

describe("connect() over the real transport", () => {
  it("an extensionStatus frame in the same TCP read as the welcome is not lost: connect() resolves at once", async () => {
    const { port, server } = await listen();
    server.on("connection", (sock) => {
      sock.once("message", () => {
        // Both frames in one synchronous block, corked so they leave in one TCP write.
        const tcp = (sock as unknown as { _socket: net.Socket })._socket;
        tcp.cork();
        sock.send(JSON.stringify({ type: "welcome", build: "NEW", proto: 2, clientId: "c1", extensionConnected: false }));
        sock.send(JSON.stringify({ event: "extensionStatus", params: { connected: true } }));
        tcp.uncork();
      });
    });
    tmp = mkdtempSync(path.join(os.tmpdir(), "bridge-frameloss-"));
    const daemonFile = path.join(tmp, "daemon.js");
    writeFileSync(daemonFile, "// daemon build");

    const started = performance.now();
    const client = await connect({
      name: "frameloss",
      port,
      env: { BRIDGE_TOKEN: "frameloss-token", BRIDGE_DAEMON: daemonFile },
      io: { hashDaemon: async () => "NEW" },
      waitForExtensionMs: 1_500,
    });
    try {
      expect(client.extensionConnected).toBe(true);
      expect(performance.now() - started).toBeLessThan(1_000);
    } finally {
      client.close();
    }
  }, 5_000);
});

import { describe, it, expect, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../src/bridge.js";
import { WsHost, type WsHostOptions } from "../src/wsHost.js";

/**
 * Step 9 S3 — the daemon's half of the safety state (phase doc 0.3, 0.4, 0.6; decisions.md · 2026-10-24
 * #132 the relay, #134 the redaction and the cache, F40 the opener rule, F41 the cache clear). Over real
 * `ws` sockets on port 0, with a fake proto:2 extension that sends `safetyState` and hidden rows.
 */

const TOKEN = "tok-S3-SENTINEL-77cd";
const BUILD = "s3-build";

type Frame = Record<string, unknown>;
interface Req {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}
interface Row {
  id: number;
  title?: string;
  url?: string;
  active: boolean;
  current?: boolean;
  hidden?: "disarmed" | "blocked";
}

class Peer {
  readonly frames: Frame[] = [];
  closed = false;
  private waiters: Array<() => void> = [];
  onFrame: ((f: Frame) => void) | undefined;
  constructor(readonly ws: WebSocket) {
    ws.on("message", (raw) => {
      const f = JSON.parse(raw.toString()) as Frame;
      this.frames.push(f);
      this.onFrame?.(f);
      this.wake();
    });
    ws.on("close", () => {
      this.closed = true;
      this.wake();
    });
  }
  private wake(): void {
    const ws = this.waiters;
    this.waiters = [];
    for (const w of ws) w();
  }
  until<T>(pred: () => T | undefined | false, timeoutMs = 3000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Peer.until timed out")), timeoutMs);
      const check = () => {
        const v = pred();
        if (v) {
          clearTimeout(timer);
          resolve(v);
        } else this.waiters.push(check);
      };
      check();
    });
  }
  frame(pred: (f: Frame) => boolean, timeoutMs?: number): Promise<Frame> {
    return this.until(() => this.frames.find(pred), timeoutMs);
  }
  send(frame: unknown): void {
    this.ws.send(JSON.stringify(frame));
  }
}

function open(port: number): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const peer = new Peer(ws);
    ws.on("open", () => resolve(peer));
    ws.on("error", reject);
  });
}

const response = (id: unknown) => (f: Frame) => f.id === id && ("result" in f || "error" in f);
const isWelcome = (f: Frame) => f.type === "welcome";
const events = (p: Peer, name: string) => p.frames.filter((f) => f.event === name);
let seq = 0;
async function call(p: Peer, method: string, params?: Record<string, unknown>): Promise<Frame> {
  const id = `s${++seq}`;
  const f: Frame = { id, method };
  if (params !== undefined) f.params = params;
  p.send(f);
  return p.frame(response(id), 9000);
}
const errOf = (f: Frame) => f.error as { code: string; message: string; data?: Record<string, unknown> };
const quiet = (ms = 80) => new Promise((r) => setTimeout(r, ms));
function waitUntil(pred: () => boolean, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (pred()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("waitUntil timed out"));
      setTimeout(tick, 5);
    };
    tick();
  });
}

const ONE_URL = "http://fixture.test/one";
const TWO_URL = "http://fixture.test/two";
const ARMED = { armed: true, evaluate: true, blockedCount: 0 };
const DISARMED = { armed: false, evaluate: true, blockedCount: 0 };

class FakeExt {
  tabs: Row[] = [
    { id: 1, title: "Fixture One", url: ONE_URL, active: true, current: true },
    { id: 2, title: "Fixture Two", url: TWO_URL, active: false },
  ];
  nextId = 101;
  readonly hold = new Set<string>();
  /** Methods answered with this error. */
  readonly failWith = new Map<string, { code: string; message: string }>();
  constructor(readonly peer: Peer) {
    peer.onFrame = (f) => {
      if (typeof f.id !== "string" || typeof f.method !== "string") return;
      if (this.hold.has(f.method)) return;
      const failure = this.failWith.get(f.method);
      if (failure) return this.peer.send({ id: f.id, error: failure });
      this.answer(f as unknown as Req, this.auto(f as unknown as Req));
    };
  }
  auto(req: Req): unknown {
    switch (req.method) {
      case "listTabs":
        return { tabs: this.tabs.map((t) => ({ ...t })) };
      case "newTab": {
        const id = this.nextId++;
        this.tabs.push({ id, title: "", url: String(req.params?.url ?? ""), active: false });
        return { id };
      }
      default:
        return { ok: true, method: req.method };
    }
  }
  reqs(method?: string): Req[] {
    return this.peer.frames.filter(
      (f) => typeof f.id === "string" && typeof f.method === "string" && (!method || f.method === method),
    ) as unknown as Req[];
  }
  answer(req: Req, result: unknown): void {
    if (this.peer.ws.readyState === WebSocket.OPEN) this.peer.send({ id: req.id, result });
  }
  emit(event: string, params: Record<string, unknown>): void {
    this.peer.send({ event, params });
  }
  async waitReq(method: string, n = 1): Promise<Req> {
    await this.peer.until(() => this.reqs(method).length >= n);
    return this.reqs(method)[n - 1];
  }
}

describe("Step 9 S3 — the daemon relays and honours the safety state", () => {
  let host: WsHost | undefined;
  let logs: string[] = [];
  const peers: Peer[] = [];

  afterEach(async () => {
    // Log hygiene (0.7): no URL, title or token in any line the daemon logged during the test.
    for (const line of logs) {
      expect(line).not.toContain("://");
      expect(line).not.toContain("fixture.test");
      expect(line).not.toContain("Fixture");
      expect(line).not.toContain("Secret");
      expect(line).not.toContain(TOKEN);
    }
    for (const p of peers.splice(0)) p.ws.terminate();
    await host?.close();
    host = undefined;
    logs = [];
  });

  async function start(extra: Partial<WsHostOptions> = {}) {
    // Each test's own array: a previous host's late close must not log into this test's lines.
    const mine: string[] = [];
    logs = mine;
    host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: BUILD, log: (m) => mine.push(m), ...extra });
    return { port: await host.listen(), host };
  }
  const track = (p: Peer) => (peers.push(p), p);
  async function client(port: number, name: string): Promise<Peer> {
    const p = track(await open(port));
    p.send({ type: "hello", token: TOKEN, role: "client", name, proto: 2 });
    await p.frame(isWelcome);
    return p;
  }
  async function extension(port: number, setup?: (e: FakeExt) => void): Promise<FakeExt> {
    const p = track(await open(port));
    const ext = new FakeExt(p);
    setup?.(ext);
    p.send({ type: "hello", token: TOKEN, role: "extension", proto: 2 });
    await p.frame(isWelcome);
    await ext.waitReq("listTabs");
    await quiet(20);
    return ext;
  }
  const status = async (p: Peer) => (await call(p, "daemon.status")).result as Record<string, unknown>;
  const statusTabs = async (p: Peer) => (await status(p)).tabs as Array<Record<string, unknown>>;
  /** Emit a state and wait until the daemon reports it. */
  async function report(ext: FakeExt, p: Peer, state: Record<string, unknown>): Promise<void> {
    ext.emit("safetyState", state);
    await waitUntil(() => events(p, "safetyStatus").some((f) => JSON.stringify(f.params) === JSON.stringify(state)));
    await quiet(30); // the listTabs the change triggers
  }

  // ---------------------------------------------------------------- the relay (#132)

  it("daemon.status.safety is null until reported, then the state; one log line and one safetyStatus per change", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    expect((await status(a)).safety).toBeNull();

    ext.emit("safetyState", ARMED);
    await a.frame((f) => f.event === "safetyStatus");
    await b.frame((f) => f.event === "safetyStatus");
    expect(events(a, "safetyStatus")).toEqual([{ event: "safetyStatus", params: ARMED }]);
    expect(events(b, "safetyStatus")).toEqual([{ event: "safetyStatus", params: ARMED }]);
    expect((await status(a)).safety).toEqual(ARMED);
    expect(logs.filter((l) => l.startsWith("safety state:"))).toEqual(["safety state: armed=true evaluate=true blocked=0"]);

    ext.emit("safetyState", { armed: false, evaluate: false, blockedCount: 3 });
    await waitUntil(() => events(a, "safetyStatus").length === 2);
    expect(events(a, "safetyStatus")[1]!.params).toEqual({ armed: false, evaluate: false, blockedCount: 3 });
    expect((await status(b)).safety).toEqual({ armed: false, evaluate: false, blockedCount: 3 });
    expect(logs.filter((l) => l.startsWith("safety state:"))).toEqual([
      "safety state: armed=true evaluate=true blocked=0",
      "safety state: armed=false evaluate=false blocked=3",
    ]);
  });

  it("an identical repeat changes nothing: no log, no broadcast, no listTabs", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    await report(ext, a, ARMED);
    const listTabs = ext.reqs("listTabs").length;
    const lines = logs.length;
    ext.emit("safetyState", { ...ARMED });
    ext.emit("safetyState", { ...ARMED });
    await quiet(150);
    expect(events(a, "safetyStatus")).toHaveLength(1);
    expect(logs).toHaveLength(lines);
    expect(ext.reqs("listTabs")).toHaveLength(listTabs);
  });

  it("only the three fields are kept and relayed (an extra key never reaches a client)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    ext.emit("safetyState", { ...ARMED, patterns: ["Secret.example"] });
    await a.frame((f) => f.event === "safetyStatus");
    expect(events(a, "safetyStatus")[0]!.params).toEqual(ARMED);
    expect((await status(a)).safety).toEqual(ARMED);
  });

  it("a malformed safetyState is dropped with a content-free log line", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const listTabs = ext.reqs("listTabs").length;
    ext.emit("safetyState", { armed: "no", evaluate: true, blockedCount: 0 });
    ext.emit("safetyState", { armed: true, evaluate: true, blockedCount: -1 });
    ext.emit("safetyState", { armed: true, evaluate: true });
    await waitUntil(() => logs.filter((l) => l.startsWith("safety state:")).length === 3);
    await quiet(100);
    expect(events(a, "safetyStatus")).toEqual([]);
    expect((await status(a)).safety).toBeNull();
    expect(ext.reqs("listTabs")).toHaveLength(listTabs);
    expect(logs.filter((l) => l.startsWith("safety state:"))).toEqual([
      "safety state: malformed event dropped",
      "safety state: malformed event dropped",
      "safety state: malformed event dropped",
    ]);
  });

  it("the state goes back to null when the extension socket closes, with no null broadcast; a new extension starts null", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    await report(ext, a, ARMED);
    ext.peer.ws.close();
    await a.frame((f) => f.event === "extensionStatus" && (f.params as { connected: boolean }).connected === false);
    expect((await status(a)).safety).toBeNull();
    expect(events(a, "safetyStatus")).toHaveLength(1);

    const ext2 = await extension(port);
    expect((await status(a)).safety).toBeNull();
    await report(ext2, a, ARMED); // null → the same state is a change again
    expect(events(a, "safetyStatus")).toHaveLength(2);
  });

  it("a client that ignores safetyStatus keeps working across a broadcast (probe P3)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const raw = await client(port, "raw-v2"); // no listener of any kind: it just keeps reading frames
    ext.emit("safetyState", DISARMED);
    await raw.frame((f) => f.event === "safetyStatus");
    const r = await call(raw, "listTabs");
    expect(Array.isArray((r.result as { tabs: unknown[] }).tabs)).toBe(true);
    expect(raw.closed).toBe(false);
  });

  // ---------------------------------------------------------------- redaction while disarmed (#134, F2)

  it("while disarmed: status rows omit url, tabGone and TAB_GONE omit lastUrl/lastTitle; re-arming restores them (cache kept)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const one = (await statusTabs(a)).find((t) => t.tabId === 1)!.tab as string;
    const two = (await statusTabs(a)).find((t) => t.tabId === 2)!.tab as string;
    await call(a, "tabs.claim", { tab: one });

    await report(ext, a, DISARMED);
    for (const row of await statusTabs(b)) expect(row).not.toHaveProperty("url");

    // The extension (S2a) sends the disarmed tabRemoved without lastUrl/lastTitle; the cache still has them.
    ext.emit("tabRemoved", { tabId: 1, hidden: "disarmed" });
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone.params).toEqual({ tab: one });
    const e1 = errOf(await call(a, "snapshot", { tab: one }));
    expect(e1.code).toBe("TAB_GONE");
    expect(e1.data).toEqual({ tab: one });

    await report(ext, a, ARMED);
    expect((await statusTabs(b)).find((t) => t.tab === two)!.url).toBe(TWO_URL);
    const e2 = errOf(await call(a, "snapshot", { tab: one }));
    expect(e2.data).toEqual({ tab: one, lastUrl: ONE_URL, lastTitle: "Fixture One" });
  });

  it("while disarmed a retire-all tabGone carries no lastUrl/lastTitle", async () => {
    const { port } = await start();
    const p = track(await open(port));
    const ext = new FakeExt(p);
    p.send({ type: "hello", token: TOKEN, role: "extension", proto: 2, session: "S-A" });
    await p.frame(isWelcome);
    await ext.waitReq("listTabs");
    const a = await client(port, "A");
    const one = (await statusTabs(a)).find((t) => t.tabId === 1)!.tab as string;
    await call(a, "tabs.claim", { tab: one });
    await report(ext, a, DISARMED);
    // A second extension socket with a new session marker: every handle is retired.
    const p2 = track(await open(port));
    const ext2 = new FakeExt(p2);
    p2.send({ type: "hello", token: TOKEN, role: "extension", proto: 2, session: "S-B" });
    await p2.frame(isWelcome);
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone.params).toEqual({ tab: one });
    await ext2.waitReq("listTabs");
  });

  it("the disarmed redaction outlives the extension socket (the last state received still says disarmed)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    await report(ext, a, DISARMED);
    ext.peer.ws.close();
    await a.frame((f) => f.event === "extensionStatus" && (f.params as { connected: boolean }).connected === false);
    expect((await status(a)).safety).toBeNull();
    for (const row of await statusTabs(a)) expect(row).not.toHaveProperty("url");
  });

  it("a null state (never reported) redacts nothing: today's output", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const one = (await statusTabs(a)).find((t) => t.tabId === 1)!.tab as string;
    await call(a, "tabs.claim", { tab: one });
    expect((await statusTabs(a)).map((t) => t.url)).toEqual([ONE_URL, TWO_URL]);
    ext.emit("tabRemoved", { tabId: 1 });
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone.params).toEqual({ tab: one, lastUrl: ONE_URL, lastTitle: "Fixture One" });
  });

  it("armed with JavaScript off and blocked sites redacts nothing beyond the hidden rows", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    await report(ext, a, { armed: true, evaluate: false, blockedCount: 2 });
    expect((await statusTabs(a)).map((t) => t.url)).toEqual([ONE_URL, TWO_URL]);
  });

  // ---------------------------------------------------------------- the cache (#134, F41)

  it("a listTabs row hidden 'blocked' clears that handle's cached url/title; a later tabGone carries neither", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const two = (await statusTabs(a)).find((t) => t.tabId === 2)!.tab as string;
    await call(a, "tabs.claim", { tab: two });
    ext.tabs[1] = { id: 2, active: false, hidden: "blocked" };
    await call(a, "listTabs");
    expect((await statusTabs(a)).find((t) => t.tab === two)).not.toHaveProperty("url");
    ext.emit("tabRemoved", { tabId: 2 }); // even with no marker, nothing is left to serve
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone.params).toEqual({ tab: two });
  });

  it("a listTabs row hidden 'disarmed' does not overwrite the cache (re-arming restores the url)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    await report(ext, a, DISARMED);
    ext.tabs = ext.tabs.map((t) => ({ id: t.id, active: t.active, current: t.current, hidden: "disarmed" as const }));
    await call(a, "listTabs");
    ext.tabs = [
      { id: 1, title: "Fixture One", url: ONE_URL, active: true, current: true },
      { id: 2, title: "Fixture Two", url: TWO_URL, active: false },
    ];
    ext.hold.add("listTabs"); // keep the re-arm's listTabs from refilling the cache
    ext.emit("safetyState", ARMED);
    await a.frame((f) => f.event === "safetyStatus" && (f.params as { armed: boolean }).armed === true);
    expect((await statusTabs(a)).map((t) => t.url)).toEqual([ONE_URL, TWO_URL]);
  });

  it("a tabRemoved hidden 'blocked' marks the handle gone with no lastUrl/lastTitle, even with a cached url", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const two = (await statusTabs(a)).find((t) => t.tabId === 2)!.tab as string;
    await call(a, "tabs.claim", { tab: two });
    ext.emit("tabRemoved", { tabId: 2, hidden: "blocked" });
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone.params).toEqual({ tab: two });
    const e = errOf(await call(a, "snapshot", { tab: two }));
    expect(e.code).toBe("TAB_GONE");
    expect(e.data).toEqual({ tab: two });
  });

  it("every safety-state change runs one listTabs, so a newly blocked tab's cache clears within one round trip", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    expect((await statusTabs(a)).find((t) => t.tabId === 2)!.url).toBe(TWO_URL);
    const before = ext.reqs("listTabs").length;
    ext.tabs[1] = { id: 2, active: false, hidden: "blocked" }; // the human added a pattern
    ext.emit("safetyState", { armed: true, evaluate: true, blockedCount: 1 });
    await ext.waitReq("listTabs", before + 1);
    await quiet(30);
    expect(ext.reqs("listTabs")).toHaveLength(before + 1);
    expect((await statusTabs(a)).find((t) => t.tabId === 2)).not.toHaveProperty("url");
  });

  it("a listTabs reply requested before a safety change notes no url/title, even when it arrives after the refresh (S3 finding 5)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    expect((await statusTabs(a)).find((t) => t.tabId === 2)!.url).toBe(TWO_URL);
    ext.hold.add("listTabs");
    const before = ext.reqs("listTabs").length;
    // A client's listTabs, evaluated by the extension before the human adds a pattern (tab 3 is new).
    const id = `s${++seq}`;
    a.send({ id, method: "listTabs" });
    const stale = await ext.waitReq("listTabs", before + 1);
    const staleRows = [...ext.tabs.map((t) => ({ ...t })), { id: 3, title: "Fixture Three", url: "http://fixture.test/three", active: false }];
    // The human adds a pattern: the post-change refresh is answered first, the stale reply after it.
    ext.tabs[1] = { id: 2, active: false, hidden: "blocked" };
    ext.emit("safetyState", { armed: true, evaluate: true, blockedCount: 1 });
    const refresh = await ext.waitReq("listTabs", before + 2);
    ext.answer(refresh, { tabs: ext.tabs.map((t) => ({ ...t })) });
    await quiet(30);
    ext.answer(stale, { tabs: staleRows });
    const reply = await a.frame(response(id));
    // The reply forwarded to the client is unchanged.
    const rows = (reply.result as { tabs: Array<Record<string, unknown>> }).tabs;
    expect(rows.find((t) => t.id === 2)!.url).toBe(TWO_URL);
    ext.hold.delete("listTabs");
    const tabs = await statusTabs(a);
    expect(tabs.find((t) => t.tabId === 2)).not.toHaveProperty("url");
    // Handle bookkeeping still runs: the new tab gets a handle, but no url from the stale reply.
    const three = tabs.find((t) => t.tabId === 3);
    expect(three?.tab).toMatch(/^T\d+$/);
    expect(three).not.toHaveProperty("url");
  });

  it("a failed listTabs after a change is logged content-free and not retried", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const before = ext.reqs("listTabs").length;
    ext.failWith.set("listTabs", { code: "INTERNAL", message: "boom http://fixture.test/x" });
    ext.emit("safetyState", ARMED);
    await a.frame((f) => f.event === "safetyStatus");
    await waitUntil(() => logs.includes("safety state: listTabs after the change failed"));
    await quiet(200);
    expect(ext.reqs("listTabs")).toHaveLength(before + 1);
    expect((await status(a)).safety).toEqual(ARMED);
  });

  // ---------------------------------------------------------------- listTabs passes hidden rows through

  it("listTabs replies keep hidden and add no title/url back", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    ext.tabs[0] = { id: 1, active: true, current: true, hidden: "disarmed" };
    const rows = ((await call(a, "listTabs")).result as { tabs: Array<Record<string, unknown>> }).tabs;
    expect(rows[0]).toEqual({ id: 1, active: true, current: true, hidden: "disarmed", tab: rows[0]!.tab });
    expect(rows[0]).not.toHaveProperty("title");
    expect(rows[0]).not.toHaveProperty("url");
  });

  // ---------------------------------------------------------------- the opener rule (F40)

  it("a hidden popup's leaseGranted carries url '' and goes out at once, without the 2 s url fill", async () => {
    let t = 1_800_000_000_000;
    const { port } = await start({ now: () => t, sleep: async (ms) => void (t += ms) });
    const ext = await extension(port);
    const a = await client(port, "A");
    await call(a, "newTab", { url: "http://fixture.test/new" }); // 101, held by A
    const n = ext.reqs("listTabs").length;
    ext.tabs.push({ id: 300, active: false, hidden: "blocked" });
    const emittedAt = t;
    ext.emit("tabCreated", { tabId: 300, openerTabId: 101, url: "" });
    const lg = await a.frame((f) => f.event === "leaseGranted");
    expect((lg.params as { url: string }).url).toBe("");
    expect(t - emittedAt).toBe(0);
    expect(ext.reqs("listTabs")).toHaveLength(n + 1);
  });

  it("while disarmed a popup's leaseGranted carries url '' even if the event had one", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    await call(a, "newTab", { url: "http://fixture.test/new" }); // 101
    await report(ext, a, DISARMED);
    ext.emit("tabCreated", { tabId: 300, openerTabId: 101, url: "http://fixture.test/popup" });
    const lg = await a.frame((f) => f.event === "leaseGranted");
    expect((lg.params as { url: string }).url).toBe("");
  });
});

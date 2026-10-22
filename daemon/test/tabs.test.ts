import { describe, it, expect, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../src/bridge.js";
import { WsHost } from "../src/wsHost.js";
import { TAB_METHODS } from "../src/methods.js";

/**
 * Step 7 T2 over real `ws` sockets on port 0: handles, leases, the visibility lock and the intercepts
 * (phase doc T2, exit checks T2.2–T2.5; decisions.md #39–#44, #52–#54). A fake proto:2 extension
 * answers listTabs/newTab/networkRequests and records every request it receives.
 */

const TOKEN = "tok-T2-SENTINEL-91ab";
const BUILD = "t2-build";
const RELOAD_HINT = "the Chrome extension is an older build — reload it at chrome://extensions (↻ on Chrome Agent Bridge)";
const NO_WINDOW =
  "No normal Chrome window is focused (a DevTools or popup window may have focus) — click a normal Chrome window and retry";
const HELD = (h: string, name: string) =>
  new RegExp(`^tab ${h} is held by "${name}" since \\d\\d:\\d\\d:\\d\\d — use browser_new_tab, or browser_list_tabs to pick a free tab$`);

type Frame = Record<string, unknown>;
interface Req {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}
interface Tab {
  id: number;
  title: string;
  url: string;
  active: boolean;
  current?: boolean;
}

class Peer {
  readonly frames: Frame[] = [];
  closed: { code: number; reason: string } | null = null;
  private waiters: Array<() => void> = [];
  onFrame: ((f: Frame) => void) | undefined;

  constructor(readonly ws: WebSocket) {
    ws.on("message", (raw) => {
      const f = JSON.parse(raw.toString()) as Frame;
      this.frames.push(f);
      this.onFrame?.(f);
      this.wake();
    });
    ws.on("close", (code, reason) => {
      this.closed = { code, reason: reason.toString() };
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
  whenClosed(): Promise<unknown> {
    return this.until(() => this.closed ?? undefined);
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
function send(p: Peer, method: string, params?: Record<string, unknown>, timeoutMs?: number): string {
  const id = `r${++seq}`;
  const f: Frame = { id, method };
  if (params !== undefined) f.params = params;
  if (timeoutMs !== undefined) f.timeoutMs = timeoutMs;
  p.send(f);
  return id;
}
async function call(p: Peer, method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<Frame> {
  return p.frame(response(send(p, method, params, timeoutMs)), 9000);
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

/** A fake extension. proto:2 by default; records requests; auto-answers unless the method is held. */
class FakeExt {
  tabs: Tab[] = [
    { id: 1, title: "Fixture One", url: "http://fixture.test/one", active: true, current: true },
    { id: 2, title: "Fixture Two", url: "http://fixture.test/two", active: false },
  ];
  nextId = 101;
  /** Methods answered manually (`answer`). */
  readonly hold = new Set<string>();
  /** networkRequests `total` per tabId (default 0). */
  readonly network = new Map<number, number>();
  constructor(readonly peer: Peer) {
    peer.onFrame = (f) => {
      if (typeof f.id !== "string" || typeof f.method !== "string") return;
      if (this.hold.has(f.method)) return;
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
      case "networkRequests": {
        const tabId = req.params?.tabId as number | undefined;
        const total = tabId === undefined ? 0 : (this.network.get(tabId) ?? 0);
        return {
          entries: [
            { id: "9", tabId: 1, url: "http://fixture.test/api", method: "GET", type: "xmlhttprequest", startedAt: 1 },
            { id: "10", tabId: -1, url: "http://fixture.test/sw", method: "GET", type: "other", startedAt: 2 },
          ],
          total,
          pending: 0,
          recordingSince: 0,
        };
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

describe("Step 7 tab layer over a real WsHost", () => {
  let host: WsHost | undefined;
  let logs: string[] = [];
  const peers: Peer[] = [];
  const exts: FakeExt[] = [];

  afterEach(async () => {
    // T2.3 over every request any fake proto:2 extension received in the test.
    for (const ext of exts.splice(0)) {
      for (const r of ext.reqs()) {
        expect(r.params ?? {}, `${r.method} got a tab key`).not.toHaveProperty("tab");
        const tabCarrying = TAB_METHODS.has(r.method) || r.method === "closeTab";
        if (tabCarrying && r.params?.scope !== "all") {
          expect(typeof r.params?.tabId, `${r.method} without numeric tabId`).toBe("number");
        }
      }
    }
    // T2.5: no log line carries a URL or a title.
    for (const line of logs) {
      expect(line).not.toContain("://");
      expect(line).not.toContain("fixture.test");
      expect(line).not.toContain("Fixture");
    }
    for (const p of peers.splice(0)) p.ws.terminate();
    await host?.close();
    host = undefined;
    logs = [];
  });

  async function start() {
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: TOKEN, build: BUILD, log: (m) => logs.push(m) });
    const port = await host.listen();
    return { port, host, bridge };
  }
  const track = (p: Peer) => (peers.push(p), p);

  async function client(port: number, name: string): Promise<Peer> {
    const p = track(await open(port));
    p.send({ type: "hello", token: TOKEN, role: "client", name, proto: 2 });
    await p.frame(isWelcome);
    return p;
  }

  /** A proto:2 fake extension, after its resync listTabs has been answered. */
  async function extension(port: number, setup?: (e: FakeExt) => void, proto = true): Promise<FakeExt> {
    const p = track(await open(port));
    const ext = new FakeExt(p);
    if (proto) exts.push(ext);
    setup?.(ext);
    p.send(proto ? { type: "hello", token: TOKEN, role: "extension", proto: 2 } : { type: "hello", token: TOKEN });
    await p.frame(isWelcome);
    if (proto) {
      await ext.waitReq("listTabs");
      await quiet(20);
    }
    return ext;
  }

  async function newTab(p: Peer, url = "http://fixture.test/new"): Promise<{ id: number; tab: string }> {
    const r = await call(p, "newTab", { url });
    return r.result as { id: number; tab: string };
  }

  // ---------------------------------------------------------------- T2.2: leases

  it("A's newTab is held by A; B's click → TAB_HELD naming A; A disconnects → B can claim", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");

    const t = await newTab(a);
    expect(t.tab).toMatch(/^T\d+$/);
    expect(t.id).toBe(101);
    expect(ext.reqs("newTab")[0].params).toEqual({ url: "http://fixture.test/new" });

    const held = await call(b, "click", { tab: t.tab, ref: "e1" });
    expect(errOf(held).code).toBe("TAB_HELD");
    expect(errOf(held).message).toMatch(HELD(t.tab, "A"));
    expect(errOf(held).data).toEqual({ owner: "A", since: expect.any(Number) });
    expect(ext.reqs("click")).toHaveLength(0);

    expect((await call(a, "click", { tab: t.tab, ref: "e1" })).result).toEqual({ ok: true, method: "click" });
    expect(ext.reqs("click")[0].params).toEqual({ ref: "e1", tabId: 101 });

    a.ws.close();
    await a.whenClosed();
    await waitUntil(() => host!.registry.count() === 1);
    expect((await call(b, "tabs.claim", { tab: t.tab })).result).toEqual({ tab: t.tab });
    expect((await call(b, "click", { tab: t.tab, ref: "e2" })).result).toEqual({ ok: true, method: "click" });
  });

  it("listTabs adds handles and owner names and keeps the extension's fields", async () => {
    const { port } = await start();
    await extension(port);
    const a = await client(port, "A");
    const t = await newTab(a);
    const r = (await call(a, "listTabs")).result as { tabs: Array<Record<string, unknown>> };
    expect(r.tabs).toEqual([
      { id: 1, title: "Fixture One", url: "http://fixture.test/one", active: true, current: true, tab: "T1" },
      { id: 2, title: "Fixture Two", url: "http://fixture.test/two", active: false, tab: "T2" },
      { id: 101, title: "", url: "http://fixture.test/new", active: false, tab: t.tab, owner: "A" },
    ]);
  });

  it("tabReplaced keeps A's handle valid and still held; also for a tab nobody holds", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const t = await newTab(a);

    ext.emit("tabReplaced", { addedTabId: 555, removedTabId: 101 });
    ext.emit("tabReplaced", { addedTabId: 777, removedTabId: 2 }); // T2, unheld
    await quiet(50);
    await call(a, "snapshot", { tab: t.tab });
    expect(ext.reqs("snapshot")[0].params).toEqual({ tabId: 555 });
    expect(errOf(await call(b, "snapshot", { tab: t.tab })).code).toBe("TAB_HELD");
    await call(b, "snapshot", { tab: "T2" });
    expect(ext.reqs("snapshot")[1].params).toEqual({ tabId: 777 });
    expect(host!.stats().extensionEvents).toBe(2);
  });

  it("tabRemoved → tabGone to the holder (absent fields omitted) and TAB_GONE with lastUrl/lastTitle", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const t = await newTab(a);

    ext.emit("tabRemoved", { tabId: 101, lastUrl: "http://fixture.test/x", lastTitle: "Fixture X" });
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone).toEqual({ event: "tabGone", params: { tab: t.tab, lastUrl: "http://fixture.test/x", lastTitle: "Fixture X" } });
    expect(events(b, "tabGone")).toEqual([]);

    const r = await call(a, "click", { tab: t.tab, ref: "e1" });
    expect(errOf(r).code).toBe("TAB_GONE");
    expect(errOf(r).data).toEqual({ tab: t.tab, lastUrl: "http://fixture.test/x", lastTitle: "Fixture X" });
    expect(errOf(r).message).not.toContain("://");
    expect(ext.reqs("click")).toHaveLength(0);

    // A tab removed with no event values, never cached: tabGone carries only `tab` (never null).
    const t2 = await newTab(a, "");
    ext.tabs = ext.tabs.filter((x) => x.id !== 102);
    ext.emit("tabRemoved", { tabId: 102 });
    await a.until(() => events(a, "tabGone").length === 2);
    expect(events(a, "tabGone")[1]).toEqual({ event: "tabGone", params: { tab: t2.tab } });
    // Removing an unheld tab sends nothing; its handle answers TAB_GONE with the listTabs cache.
    ext.emit("tabRemoved", { tabId: 2 });
    await quiet(50);
    expect(events(a, "tabGone")).toHaveLength(2);
    expect(errOf(await call(b, "click", { tab: "T2", ref: "e1" })).data).toEqual({
      tab: "T2",
      lastUrl: "http://fixture.test/two",
      lastTitle: "Fixture Two",
    });
    // Unknown handle.
    const u = await call(b, "click", { tab: "T99", ref: "e1" });
    expect(errOf(u)).toEqual({ code: "TAB_UNKNOWN", message: "unknown tab handle T99 — call listTabs" });
  });

  it("invalid extension events are ignored but counted", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    ext.emit("tabRemoved", { tabId: "1" });
    ext.emit("tabCreated", { tabId: 3 }); // no url
    ext.emit("somethingElse", {});
    await quiet(50);
    expect(host!.stats().extensionEvents).toBe(3);
    await call(a, "click", { tab: "T1", ref: "e1" });
    expect(ext.reqs("click")[0].params).toEqual({ ref: "e1", tabId: 1 });
  });

  it("opener rule: a tab opened from A's tab is granted to A with leaseGranted; an unleased opener's popup stays unheld", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const t = await newTab(a);

    ext.emit("tabCreated", { tabId: 300, openerTabId: 101, url: "http://fixture.test/popup" });
    const lg = await a.frame((f) => f.event === "leaseGranted");
    expect(lg.params).toEqual({ tab: expect.stringMatching(/^T\d+$/), reason: "opener", url: "http://fixture.test/popup" });
    const popup = (lg.params as { tab: string }).tab;
    expect(popup).not.toBe(t.tab);
    expect(errOf(await call(b, "click", { tab: popup, ref: "e1" })).message).toMatch(HELD(popup, "A"));

    // Opener T1 (the human's tab) is unheld: the popup stays unheld, nobody hears of it.
    ext.emit("tabCreated", { tabId: 301, openerTabId: 1, url: "" });
    ext.emit("tabCreated", { tabId: 302, url: "" }); // no opener
    await quiet(60);
    expect(events(a, "leaseGranted")).toHaveLength(1);
    expect(events(b, "leaseGranted")).toHaveLength(0);
    const st = (await call(b, "daemon.status")).result as { tabs: Array<Record<string, unknown>> };
    const row301 = st.tabs.find((x) => x.tabId === 301)!;
    expect(row301.owner).toBeUndefined();
    await call(b, "click", { tab: row301.tab as string, ref: "e1" });
    await call(a, "click", { tab: row301.tab as string, ref: "e1" });
    expect(ext.reqs("click").map((r) => r.params?.tabId)).toEqual([301, 301]);
  });

  it("F20: tabCreated {openerTabId: A's tab} arriving before B's newTab result leaves the tab with B; A gets no leaseGranted", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a); // id 101, held by A

    ext.hold.add("newTab");
    const id = send(b, "newTab", { url: "http://fixture.test/b" });
    const req = await ext.waitReq("newTab", 2);
    // The event first, then the result, back to back (likely in one TCP read).
    ext.emit("tabCreated", { tabId: 400, openerTabId: ta.id, url: "http://fixture.test/b" });
    ext.answer(req, { id: 400 });
    const res = (await b.frame(response(id))).result as { id: number; tab: string };
    expect(res.id).toBe(400);
    await quiet(80);
    expect(events(a, "leaseGranted")).toEqual([]);
    expect(errOf(await call(a, "click", { tab: res.tab, ref: "e1" })).message).toMatch(HELD(res.tab, "B"));
  });

  it("F20 window: an unrelated popup from A's tab during B's newTab is held by A at once; A gets one leaseGranted after it settles", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const c = await client(port, "C");
    const ta = await newTab(a); // 101

    ext.hold.add("newTab");
    const id = send(b, "newTab", { url: "http://fixture.test/b" });
    const req = await ext.waitReq("newTab", 2);
    ext.emit("tabCreated", { tabId: 500, openerTabId: ta.id, url: "http://fixture.test/popup" });
    await quiet(50);
    const st = (await call(c, "daemon.status")).result as { tabs: Array<Record<string, unknown>> };
    const popup = st.tabs.find((x) => x.tabId === 500)!.tab as string;
    expect(errOf(await call(c, "click", { tab: popup, ref: "e1" })).message).toMatch(HELD(popup, "A"));
    expect(ext.reqs("click")).toHaveLength(0);
    expect(events(a, "leaseGranted")).toEqual([]); // held back while B's newTab is in flight

    ext.answer(req, { id: 501 });
    await b.frame(response(id));
    const lg = await a.frame((f) => f.event === "leaseGranted");
    expect(lg.params).toEqual({ tab: popup, reason: "opener", url: "http://fixture.test/popup" });
    await quiet(50);
    expect(events(a, "leaseGranted")).toHaveLength(1);
    expect(events(b, "leaseGranted")).toHaveLength(0);
    expect(events(c, "leaseGranted")).toHaveLength(0);
  });

  it("F20 window: the opener's holder disconnecting inside the window releases the lease and no event is sent", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const c = await client(port, "C");
    const ta = await newTab(a);

    ext.hold.add("newTab");
    const id = send(b, "newTab", { url: "http://fixture.test/b" });
    const req = await ext.waitReq("newTab", 2);
    ext.emit("tabCreated", { tabId: 600, openerTabId: ta.id, url: "" });
    await quiet(50);
    const popup = ((await call(c, "daemon.status")).result as { tabs: Array<Record<string, unknown>> }).tabs.find(
      (x) => x.tabId === 600,
    )!;
    expect(popup.owner).toBe("A");

    a.ws.close();
    await a.whenClosed();
    await waitUntil(() => host!.registry.count() === 2);
    ext.answer(req, { id: 601 });
    await b.frame(response(id));
    await quiet(80);
    expect(events(a, "leaseGranted")).toEqual([]);
    expect(events(b, "leaseGranted")).toEqual([]);
    expect(events(c, "leaseGranted")).toEqual([]);
    expect((await call(c, "tabs.claim", { tab: popup.tab as string })).result).toEqual({ tab: popup.tab });
  });

  it("closeTab by the holder: forwarded {tabId}, the handle is gone, the lease dropped, no tabGone to the closer", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const t = await newTab(a);
    expect(errOf(await call(b, "closeTab", { tab: t.tab })).code).toBe("TAB_HELD");

    ext.hold.add("closeTab");
    const id = send(a, "closeTab", { tab: t.tab });
    const req = await ext.waitReq("closeTab");
    expect(req.params).toEqual({ tabId: 101 });
    ext.emit("tabRemoved", { tabId: 101, lastUrl: "http://fixture.test/new" }); // before the result
    ext.answer(req, { ok: true });
    expect((await a.frame(response(id))).result).toEqual({ ok: true });
    await quiet(50);
    expect(events(a, "tabGone")).toEqual([]);
    expect(errOf(await call(a, "click", { tab: t.tab, ref: "e1" })).code).toBe("TAB_GONE");
    const st = (await call(a, "daemon.status")).result as { tabs: Array<{ tab: string }> };
    expect(st.tabs.map((x) => x.tab)).not.toContain(t.tab);
  });

  // ---------------------------------------------------------------- tabs.claim / tabs.release

  it("tabs.claim and tabs.release: every answer", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");

    expect(errOf(await call(a, "tabs.claim", { tab: "T42" })).code).toBe("TAB_UNKNOWN");
    expect(errOf(await call(a, "tabs.claim", {})).code).toBe("BAD_PARAMS");
    expect(errOf(await call(a, "tabs.claim", { tab: 1 })).code).toBe("BAD_PARAMS");
    expect((await call(a, "tabs.claim", { tab: "T2" })).result).toEqual({ tab: "T2" });
    expect((await call(a, "tabs.claim", { tab: "T2" })).result).toEqual({ tab: "T2" }); // idempotent
    const held = await call(b, "tabs.claim", { tab: "T2" });
    expect(errOf(held).code).toBe("TAB_HELD");
    expect(errOf(held).message).toMatch(HELD("T2", "A"));

    // {active:true} claims the human's tab (`current: true`), via listTabs.
    const before = ext.reqs("listTabs").length;
    expect((await call(b, "tabs.claim", { active: true })).result).toEqual({ tab: "T1" });
    expect(ext.reqs("listTabs").length).toBe(before + 1);

    expect(errOf(await call(a, "tabs.release", { tab: "T1" })).code).toBe("TAB_HELD");
    expect(errOf(await call(a, "tabs.release", {})).code).toBe("BAD_PARAMS");
    expect(errOf(await call(a, "tabs.release", { tab: "T42" })).code).toBe("TAB_UNKNOWN");
    expect((await call(a, "tabs.release", { tab: "T2" })).result).toEqual({ ok: true });
    expect((await call(a, "tabs.release", { tab: "T2" })).result).toEqual({ ok: true }); // unheld
    expect((await call(b, "tabs.claim", { tab: "T2" })).result).toEqual({ tab: "T2" });

    ext.emit("tabRemoved", { tabId: 2 });
    await b.frame((f) => f.event === "tabGone");
    expect(errOf(await call(b, "tabs.claim", { tab: "T2" })).code).toBe("TAB_GONE");
    expect(errOf(await call(b, "tabs.release", { tab: "T2" })).code).toBe("TAB_GONE");

    // No human's tab → the INTERNAL message.
    ext.tabs = ext.tabs.map(({ current: _current, ...x }) => x); // no human's tab
    expect(errOf(await call(a, "tabs.claim", { active: true }))).toEqual({ code: "INTERNAL", message: NO_WINDOW });
    // None of these reached the extension.
    expect(ext.reqs().filter((r) => r.method.startsWith("tabs."))).toEqual([]);
  });

  it("tabs.claim {active:true} needs the extension: NOT_CONNECTED, then VERSION for a no-proto one", async () => {
    const { port } = await start();
    const a = await client(port, "A");
    expect(errOf(await call(a, "tabs.claim", { active: true })).code).toBe("NOT_CONNECTED");
    await extension(port, undefined, false);
    expect(errOf(await call(a, "tabs.claim", { active: true }))).toEqual({ code: "VERSION", message: RELOAD_HINT });
  });

  // ---------------------------------------------------------------- T2.2: the lock

  it("two concurrent screenshots serialise: the second is not forwarded before the first is answered", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);
    const tb = await newTab(b);
    ext.hold.add("screenshot");

    const ia = send(a, "screenshot", { tab: ta.tab });
    const first = await ext.waitReq("screenshot");
    const ib = send(b, "screenshot", { tab: tb.tab });
    await quiet(100);
    expect(ext.reqs("screenshot")).toHaveLength(1);
    expect(first.params).toEqual({ tabId: 101 });

    ext.answer(first, { dataUrl: "a" });
    const second = await ext.waitReq("screenshot", 2);
    expect(second.params).toEqual({ tabId: 102 });
    ext.answer(second, { dataUrl: "b" });
    expect((await a.frame(response(ia))).result).toEqual({ dataUrl: "a" });
    expect((await b.frame(response(ib))).result).toEqual({ dataUrl: "b" });
  });

  it("focusTab and selectTab wait while a screenshot holds the lock; cdp and fullPage screenshots do not", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);
    const tb = await newTab(b);
    ext.hold.add("screenshot");

    send(a, "screenshot", { tab: ta.tab });
    const shot = await ext.waitReq("screenshot");
    const ifocus = send(b, "focusTab", { tab: tb.tab });
    const iselect = send(b, "selectTab", { id: 102 });
    send(b, "screenshot", { tab: tb.tab, mode: "cdp" });
    send(b, "screenshot", { tab: tb.tab, fullPage: true });
    await ext.waitReq("screenshot", 3);
    await quiet(100);
    expect(ext.reqs("focusTab")).toHaveLength(0);
    expect(ext.reqs("selectTab")).toHaveLength(0);
    expect(ext.reqs("screenshot").map((r) => r.params)).toEqual([
      { tabId: 101 },
      { tabId: 102, mode: "cdp" },
      { tabId: 102, fullPage: true },
    ]);

    ext.answer(shot, { dataUrl: "a" });
    expect((await b.frame(response(ifocus))).result).toEqual({ ok: true, method: "focusTab" });
    expect((await b.frame(response(iselect))).result).toEqual({ ok: true, method: "selectTab" });
    expect(ext.reqs("focusTab")[0].params).toEqual({ tabId: 102 });
    expect(ext.reqs("selectTab")[0].params).toEqual({ tabId: 102 });
  });

  it("the lock is taken even when the target is the human's active tab", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);
    ext.hold.add("screenshot");
    send(a, "screenshot", { tab: ta.tab });
    const shot = await ext.waitReq("screenshot");
    const ib = send(b, "screenshot", { tab: "T1" }); // T1 is `current: true`
    await quiet(100);
    expect(ext.reqs("screenshot")).toHaveLength(1);
    ext.answer(shot, {});
    const second = await ext.waitReq("screenshot", 2);
    expect(second.params).toEqual({ tabId: 1 });
    ext.answer(second, { dataUrl: "t1" });
    expect((await b.frame(response(ib))).result).toEqual({ dataUrl: "t1" });
  });

  it("LOCK_TIMEOUT {holder} at the waiter's deadline; the waiter is never forwarded", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);
    const tb = await newTab(b);
    ext.hold.add("screenshot");
    send(a, "screenshot", { tab: ta.tab });
    await ext.waitReq("screenshot");

    const t0 = Date.now();
    const r = await call(b, "screenshot", { tab: tb.tab }, 150);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(140);
    expect(errOf(r).code).toBe("LOCK_TIMEOUT");
    expect(errOf(r).data).toEqual({ holder: "A" });
    await quiet(50);
    expect(b.frames.filter(response(r.id))).toHaveLength(1);
    expect(ext.reqs("screenshot")).toHaveLength(1);
  });

  it(
    "ATK-L5 (verifier V1): one deadline — a waiter that gets the lock late times out at its own deadline + 5000, not a fresh wait",
    async () => {
      const { port } = await start();
      const ext = await extension(port);
      const a = await client(port, "A");
      const b = await client(port, "B");
      const ta = await newTab(a);
      const tb = await newTab(b);
      ext.hold.add("screenshot");
      send(a, "screenshot", { tab: ta.tab });
      const shotA = await ext.waitReq("screenshot");
      const t0 = Date.now();
      const ib = send(b, "screenshot", { tab: tb.tab }, 2000);
      await quiet(1500);
      ext.answer(shotA, {});
      await ext.waitReq("screenshot", 2); // B forwarded at ~1500 ms; the extension never answers
      const rb = await b.frame(response(ib), 12_000);
      const took = Date.now() - t0;
      expect(errOf(rb).code).toBe("TIMEOUT");
      expect(took).toBeGreaterThanOrEqual(6900);
      expect(took).toBeLessThan(7600); // a fresh wait after the lock would be ~8500
    },
    20_000,
  );

  it("ATK-L6 (verifier V2): a lease taken while a call waits for the lock is re-checked when the lock is granted", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const c = await client(port, "C");
    const ta = await newTab(a);
    ext.hold.add("screenshot");
    send(a, "screenshot", { tab: ta.tab });
    const shotA = await ext.waitReq("screenshot");
    const ib = send(b, "screenshot", { tab: "T2" }); // unheld now
    await quiet(50);
    expect((await call(c, "tabs.claim", { tab: "T2" })).result).toEqual({ tab: "T2" });
    ext.answer(shotA, {});
    const rb = await b.frame(response(ib));
    expect(errOf(rb).code).toBe("TAB_HELD");
    expect(errOf(rb).message).toMatch(HELD("T2", "C"));
    await quiet(50);
    expect(ext.reqs("screenshot")).toHaveLength(1);
    expect(((await call(c, "daemon.status")).result as { lock: unknown }).lock).toEqual({});
  });

  it("the holder disconnecting releases the lock at once; its late reply releases nobody else", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const c = await client(port, "C");
    const ta = await newTab(a);
    const tb = await newTab(b);
    const tc = await newTab(c);
    ext.hold.add("screenshot");

    send(a, "screenshot", { tab: ta.tab });
    const shotA = await ext.waitReq("screenshot");
    const ib = send(b, "screenshot", { tab: tb.tab });
    await quiet(50);
    expect(ext.reqs("screenshot")).toHaveLength(1);

    a.ws.close();
    const shotB = await ext.waitReq("screenshot", 2);
    expect(shotB.params).toEqual({ tabId: 102 });
    const st = (await call(c, "daemon.status")).result as { lock: { holder?: string } };
    expect(st.lock).toEqual({ holder: "B" });

    const ic = send(c, "screenshot", { tab: tc.tab });
    await quiet(50);
    ext.answer(shotA, { dataUrl: "late A" }); // A's late settle
    await quiet(100);
    expect(ext.reqs("screenshot")).toHaveLength(2); // C still waits behind B
    ext.answer(shotB, { dataUrl: "b" });
    expect((await b.frame(response(ib))).result).toEqual({ dataUrl: "b" });
    const shotC = await ext.waitReq("screenshot", 3);
    ext.answer(shotC, { dataUrl: "c" });
    expect((await c.frame(response(ic))).result).toEqual({ dataUrl: "c" });
    // A's leases died with it.
    expect((await call(c, "tabs.claim", { tab: ta.tab })).result).toEqual({ tab: ta.tab });
  });

  it(
    "one deadline (#44): the holder's forwarded call times out at deadline + 5000 and releases exactly once",
    async () => {
      const { port } = await start();
      const ext = await extension(port);
      const a = await client(port, "A");
      const b = await client(port, "B");
      const c = await client(port, "C");
      const ta = await newTab(a);
      const tb = await newTab(b);
      const tc = await newTab(c);
      ext.hold.add("screenshot");

      const t0 = Date.now();
      const ia = send(a, "screenshot", { tab: ta.tab }, 100);
      const shotA = await ext.waitReq("screenshot");
      const ib = send(b, "screenshot", { tab: tb.tab }, 100); // waiter: its deadline rejects once
      const ic = send(c, "screenshot", { tab: tc.tab }, 20_000); // waits for A's release
      const rb = await b.frame(response(ib));
      expect(errOf(rb).code).toBe("LOCK_TIMEOUT");

      const ra = await a.frame(response(ia), 9000);
      const took = Date.now() - t0;
      expect(errOf(ra).code).toBe("TIMEOUT");
      expect(took).toBeGreaterThanOrEqual(5000);
      expect(took).toBeLessThan(6500);

      const shotC = await ext.waitReq("screenshot", 2);
      expect(shotC.params).toEqual({ tabId: 103 });
      const id2 = send(b, "screenshot", { tab: tb.tab }, 20_000);
      ext.answer(shotA, {}); // A's reply after its timeout: must release nothing
      await quiet(100);
      expect(ext.reqs("screenshot")).toHaveLength(2);
      ext.answer(shotC, { dataUrl: "c" });
      expect((await c.frame(response(ic))).result).toEqual({ dataUrl: "c" });
      const shotB2 = await ext.waitReq("screenshot", 3);
      ext.answer(shotB2, { dataUrl: "b2" });
      expect((await b.frame(response(id2))).result).toEqual({ dataUrl: "b2" });
      expect(b.frames.filter(response(ib))).toHaveLength(1);
    },
    15_000,
  );

  // ---------------------------------------------------------------- T2.4 (#41): the legacy path

  it("legacy: no tab → the human's tab, numeric tabId, no lease, one log line per client", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const s6 = await client(port, "claude-code #1");
    const other = await client(port, "claude-code #2");

    expect((await call(s6, "snapshot")).result).toEqual({ ok: true, method: "snapshot" });
    expect(ext.reqs("snapshot")[0].params).toEqual({ tabId: 1 });
    await call(s6, "click", { ref: "e3" });
    expect(ext.reqs("click")[0].params).toEqual({ ref: "e3", tabId: 1 });
    await call(other, "snapshot");

    const legacy = logs.filter((l) => l.startsWith("legacy client"));
    expect(legacy).toEqual([
      'legacy client "claude-code #1": no tab — resolved to the active tab',
      'legacy client "claude-code #2": no tab — resolved to the active tab',
    ]);
    // No lease was granted.
    const st = (await call(other, "daemon.status")).result as { tabs: Array<Record<string, unknown>> };
    expect(st.tabs.find((x) => x.tab === "T1")!.owner).toBeUndefined();
  });

  it("legacy: the human's tab held by another client → TAB_HELD; no human's tab → INTERNAL", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const s6 = await client(port, "S6");
    await call(a, "tabs.claim", { active: true });
    const r = await call(s6, "snapshot");
    expect(errOf(r).message).toMatch(HELD("T1", "A"));
    expect(ext.reqs("snapshot")).toHaveLength(0);
    ext.tabs = ext.tabs.map(({ current: _current, ...x }) => x); // no human's tab
    expect(errOf(await call(s6, "snapshot"))).toEqual({ code: "INTERNAL", message: NO_WINDOW });
  });

  it("legacy: a screenshot without tab takes the lock (FIFO behind a holder, or LOCK_TIMEOUT)", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const s6 = await client(port, "S6");
    const ta = await newTab(a);
    ext.hold.add("screenshot");
    send(a, "screenshot", { tab: ta.tab });
    const shotA = await ext.waitReq("screenshot");

    const timedOut = await call(s6, "screenshot", { fullPage: false }, 150);
    expect(errOf(timedOut)).toMatchObject({ code: "LOCK_TIMEOUT", data: { holder: "A" } });
    const id = send(s6, "screenshot", { fullPage: false });
    await quiet(100);
    expect(ext.reqs("screenshot")).toHaveLength(1);
    ext.answer(shotA, {});
    const shotL = await ext.waitReq("screenshot", 2);
    expect(shotL.params).toEqual({ fullPage: false, tabId: 1 });
    ext.answer(shotL, { dataUrl: "x" });
    expect((await s6.frame(response(id))).result).toEqual({ dataUrl: "x" });
  });

  it("legacy: closeTab/selectTab with a Chrome id are resolved and lease-checked; an unknown id refreshes once, then TAB_UNKNOWN", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const s6 = await client(port, "S6");
    const ta = await newTab(a);

    expect(errOf(await call(s6, "closeTab", { id: ta.id })).message).toMatch(HELD(ta.tab, "A"));
    expect(errOf(await call(s6, "selectTab", { id: ta.id })).message).toMatch(HELD(ta.tab, "A"));
    expect(ext.reqs("closeTab")).toHaveLength(0);

    await call(s6, "selectTab", { id: 2 });
    expect(ext.reqs("selectTab")[0].params).toEqual({ tabId: 2 });

    // An id the table has never seen but Chrome has: one refresh mints it.
    ext.tabs.push({ id: 50, title: "", url: "", active: false });
    await call(s6, "closeTab", { id: 50 });
    expect(ext.reqs("closeTab")[0].params).toEqual({ tabId: 50 });

    const before = ext.reqs("listTabs").length;
    const u = await call(s6, "closeTab", { id: 9999 });
    expect(errOf(u).code).toBe("TAB_UNKNOWN");
    expect(ext.reqs("listTabs").length).toBe(before + 1);
    expect(errOf(await call(s6, "closeTab", {})).code).toBe("BAD_PARAMS");
    expect(errOf(await call(s6, "closeTab", { id: "x" })).code).toBe("BAD_PARAMS");
    expect(logs.filter((l) => l.startsWith("legacy client"))).toHaveLength(1);
  });

  it("legacy: a bare number in a network tab is a Chrome id (#54); unknown → TAB_UNKNOWN", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const s6 = await client(port, "S6");
    const ta = await newTab(a);

    await call(s6, "networkRequests", { tab: 1, limit: 5 });
    expect(ext.reqs("networkRequests")[0].params).toEqual({ limit: 5, tabId: 1 });
    expect(errOf(await call(s6, "networkClear", { tab: ta.id })).message).toMatch(HELD(ta.tab, "A"));
    expect(errOf(await call(s6, "networkRequests", { tab: 9999 })).code).toBe("TAB_UNKNOWN");
    expect(errOf(await call(s6, "networkRequests", { tab: true })).code).toBe("BAD_PARAMS");
    expect(errOf(await call(s6, "networkRequests", { tab: 1.5 })).code).toBe("BAD_PARAMS");
  });

  it("free methods need no lease: downloads, listTabs, networkRequests in every scope, daemon.*, tabs.claim/release", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);

    for (const [m, p] of [
      ["downloadStart", { url: "http://fixture.test/f.pdf" }],
      ["downloadChunk", { id: "d1", offset: 0, length: 10 }],
      ["downloadEnd", { id: "d1" }],
    ] as const) {
      expect((await call(b, m, p)).result).toEqual({ ok: true, method: m });
      expect(ext.reqs(m)[0].params).toEqual(p);
    }
    expect("result" in (await call(b, "listTabs"))).toBe(true);
    expect("result" in (await call(b, "daemon.status"))).toBe(true);

    // networkRequests: a foreign-held handle, "all", "active", absent, and an id lookup — all free.
    await call(b, "networkRequests", { tab: ta.tab });
    await call(b, "networkRequests", { tab: "all", limit: 3 });
    await call(b, "networkRequests", { tab: "active" });
    await call(b, "networkRequests", {});
    await call(b, "networkRequests", { tab: "all", id: "9" });
    expect(ext.reqs("networkRequests").map((r) => r.params)).toEqual([
      { tabId: 101 },
      { limit: 3, scope: "all" },
      { tabId: 1 },
      { tabId: 1 },
      { id: "9" },
    ]);
    expect(errOf(await call(b, "networkRequests", { tab: "bogus" })).code).toBe("TAB_UNKNOWN");
  });

  it("F12: networkRequests entries carry the handle beside tabId (not for -1)", async () => {
    const { port } = await start();
    await extension(port);
    const a = await client(port, "A");
    const r = (await call(a, "networkRequests", { tab: "all" })).result as { entries: Array<Record<string, unknown>> };
    expect(r.entries[0]).toMatchObject({ tabId: 1, tab: "T1" });
    expect(r.entries[1].tabId).toBe(-1);
    expect(r.entries[1]).not.toHaveProperty("tab");
  });

  it("V3: a network entry naming a closed tab gets its dead handle; a never-seen tab id gets no tab and no live handle", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    ext.emit("tabRemoved", { tabId: 2 });
    await quiet(40);
    const orig = ext.auto.bind(ext);
    ext.auto = (req) =>
      req.method === "networkRequests"
        ? { entries: [{ id: "1", tabId: 2 }, { id: "2", tabId: 4242 }], total: 2, pending: 0, recordingSince: 0 }
        : orig(req);
    const r = (await call(a, "networkRequests", { tab: "all" })).result as { entries: Array<Record<string, unknown>> };
    expect(r.entries[0]).toEqual({ id: "1", tabId: 2, tab: "T2" });
    expect(r.entries[1]).toEqual({ id: "2", tabId: 4242 });
    const st = (await call(a, "daemon.status")).result as { tabs: Array<Record<string, unknown>> };
    expect(st.tabs.map((t) => t.tabId)).toEqual([1]);
  });

  it("V8: networkClear {tab:'all'} fails closed — a foreign-held tab's probe with a non-number total, or a failing probe, → TAB_HELD", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);

    const orig = ext.auto.bind(ext);
    ext.auto = (req) =>
      req.method === "networkRequests" ? { entries: [], total: "lots", pending: 0, recordingSince: 0 } : orig(req);
    expect(errOf(await call(b, "networkClear", { tab: "all" })).message).toMatch(HELD(ta.tab, "A"));

    ext.auto = orig;
    ext.hold.add("networkRequests");
    const id = send(b, "networkClear", { tab: "all" });
    const probe = await ext.waitReq("networkRequests", 2); // the first probe was answered above
    expect(probe.params).toEqual({ tabId: ta.id, limit: 1 });
    ext.peer.send({ id: probe.id, error: { code: "INTERNAL", message: "probe failed" } });
    const r = await b.frame(response(id));
    expect(errOf(r).code).toBe("TAB_HELD");
    expect(errOf(r).message).toMatch(HELD(ta.tab, "A"));
    expect(errOf(r).data).toEqual({ owner: "A", since: expect.any(Number) });
    expect(ext.reqs("networkClear")).toHaveLength(0);
  });

  it("networkClear: a foreign tab → TAB_HELD; {tab:'all'} → TAB_HELD when a foreign-held tab has entries, else {scope:'all'}", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const b = await client(port, "B");
    const ta = await newTab(a);

    const held = await call(b, "networkClear", { tab: ta.tab });
    expect(errOf(held).message).toMatch(HELD(ta.tab, "A"));

    // A's tab has no entries: "all" is forwarded as a scope, with no tab key.
    expect((await call(b, "networkClear", { tab: "all" })).result).toEqual({ ok: true, method: "networkClear" });
    expect(ext.reqs("networkClear")[0].params).toEqual({ scope: "all" });
    expect(ext.reqs("networkRequests").at(-1)!.params).toEqual({ tabId: 101, limit: 1 });

    ext.network.set(101, 4);
    const refused = await call(b, "networkClear", { tab: "all" });
    expect(errOf(refused).message).toMatch(HELD(ta.tab, "A"));
    expect(ext.reqs("networkClear")).toHaveLength(1);
    // The holder itself may clear everything.
    await call(a, "networkClear", { tab: "all" });
    expect(ext.reqs("networkClear")).toHaveLength(2);
    // Own tab / the human's tab.
    await call(a, "networkClear", { tab: ta.tab });
    await call(b, "networkClear", {});
    expect(ext.reqs("networkClear").slice(2).map((r) => r.params)).toEqual([{ tabId: 101 }, { tabId: 1 }]);
  });

  it("T2.3: every tab-carrying method reaches the extension with a numeric tabId and no tab key", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "A");
    const ta = await newTab(a);
    for (const m of TAB_METHODS) {
      const params = m === "networkClear" ? { tab: ta.tab } : { tab: ta.tab, ref: "e1" };
      const r = await call(a, m, params);
      expect("result" in r, m).toBe(true);
      // and through the legacy path
      await call(a, m, m === "focusTab" || m === "selectTab" ? { id: 2 } : {});
    }
    await call(a, "someNewMethod", { tab: ta.tab, x: 1 });
    expect(ext.reqs("someNewMethod")[0].params).toEqual({ x: 1, tabId: 101 });
    for (const r of ext.reqs()) {
      expect(r.params ?? {}).not.toHaveProperty("tab");
      expect(r.params ?? {}).not.toHaveProperty("id", ta.id);
    }
    const tabReqs = ext.reqs().filter((r) => TAB_METHODS.has(r.method));
    expect(tabReqs).toHaveLength(TAB_METHODS.size * 2);
    for (const r of tabReqs) expect(typeof r.params?.tabId).toBe("number");
  });

  // ---------------------------------------------------------------- #42: a no-proto extension

  it("a no-proto extension: tab methods answer VERSION with the reload hint; free methods are forwarded as in Step 6; no resync", async () => {
    const { port } = await start();
    const a = await client(port, "A");
    // NOT_CONNECTED comes before VERSION.
    expect(errOf(await call(a, "snapshot")).code).toBe("NOT_CONNECTED");
    const ext = await extension(port, undefined, false);
    await quiet(50);
    expect(ext.reqs()).toEqual([]); // no resync

    for (const [m, p] of [
      ["snapshot", undefined],
      ["click", { tab: "T1", ref: "e1" }],
      ["screenshot", {}],
      ["closeTab", { id: 1 }],
      ["networkClear", { tab: "all" }],
      ["someNewMethod", { tab: "T1" }],
    ] as const) {
      expect(errOf(await call(a, m, p as Record<string, unknown> | undefined)), m).toEqual({
        code: "VERSION",
        message: RELOAD_HINT,
      });
    }
    await call(a, "downloadStart", { url: "u" });
    await call(a, "networkRequests", { tab: "all" });
    await call(a, "slow");
    expect(ext.reqs().map((r) => [r.method, r.params])).toEqual([
      ["downloadStart", { url: "u" }],
      ["networkRequests", { tab: "all" }],
      ["slow", undefined],
    ]);
  });

  // ---------------------------------------------------------------- F15: resync on every hello

  it("F15: a reconnecting extension's listTabs mints unseen tabs and marks missing ones gone (tabGone to holders)", async () => {
    const { port } = await start();
    const ext1 = await extension(port);
    const a = await client(port, "A");
    expect((await call(a, "tabs.claim", { tab: "T2" })).result).toEqual({ tab: "T2" });
    ext1.peer.ws.close();
    await ext1.peer.whenClosed();

    const ext2 = await extension(port, (e) => {
      e.tabs = [
        { id: 1, title: "Fixture One", url: "http://fixture.test/one", active: true, current: true },
        { id: 3, title: "Fixture Three", url: "http://fixture.test/three", active: false },
      ];
    });
    const gone = await a.frame((f) => f.event === "tabGone");
    expect(gone.params).toEqual({ tab: "T2", lastUrl: "http://fixture.test/two", lastTitle: "Fixture Two" });
    const st = (await call(a, "daemon.status")).result as { tabs: unknown[]; lock: unknown };
    expect(st.tabs).toEqual([
      { tab: "T1", tabId: 1, url: "http://fixture.test/one" },
      { tab: "T3", tabId: 3, url: "http://fixture.test/three" },
    ]);
    expect(st.lock).toEqual({});
    expect(errOf(await call(a, "click", { tab: "T2", ref: "e1" })).code).toBe("TAB_GONE");
    expect(ext2.reqs("listTabs")).toHaveLength(1);
    expect(logs.some((l) => l.startsWith("extension resync"))).toBe(true);
  });

  // ---------------------------------------------------------------- daemon.status

  it("daemon.status adds tabs (owner name, url) and lock {holder}", async () => {
    const { port } = await start();
    const ext = await extension(port);
    const a = await client(port, "alpha");
    const ta = await newTab(a, "http://fixture.test/mine");
    ext.hold.add("screenshot");
    send(a, "screenshot", { tab: ta.tab });
    await ext.waitReq("screenshot");
    const st = (await call(a, "daemon.status")).result as Record<string, unknown>;
    expect(st.build).toBe(BUILD);
    expect(st.tabs).toEqual([
      { tab: "T1", tabId: 1, url: "http://fixture.test/one" },
      { tab: "T2", tabId: 2, url: "http://fixture.test/two" },
      { tab: ta.tab, tabId: 101, owner: "alpha" },
    ]);
    expect(st.lock).toEqual({ holder: "alpha" });
  });
});

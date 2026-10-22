// Step 7 T4, cross-package: the real daemon host (handles, leases, intercept) in process on
// 127.0.0.1 port 0, the real SDK `connect()`/BridgeClient, BridgeLink, TabCursor and the 22 tools,
// against a fake proto:2 extension over real `ws`. Two MCP actors with different names share one
// daemon; then the daemon is restarted on the same port, on both the non-4002 path (a fresh client
// from BridgeLink) and the 4002 path (the same client's reconnect), and the cursor-lost notice appears.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { connect, type BridgeClient } from "@bridge/sdk";
import { Bridge } from "../../daemon/src/bridge.js";
import { WsHost } from "../../daemon/src/wsHost.js";
import { connectOptions } from "../src/config.js";
import { BridgeLink } from "../src/link.js";
import { TabCursor, lostNotice } from "../src/cursor.js";
import { registerTools } from "../src/tools/registry.js";

const TOKEN = "t4-multi-actor-token-SENTINEL";
const BUILD = "t4-build";
const HUMAN_URL = "http://localhost:8080/e2e-playground.html";

function waitUntil(pred: () => boolean, timeoutMs = 5000): Promise<void> {
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

interface FakeTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
  windowId: number;
}

/**
 * A Step 7 extension as the daemon sees it: proto:2 hello; answers listTabs (with `current` on the
 * human's tab), newTab, snapshot, click, focusTab, networkRequests, networkClear. Records every
 * request it receives, so a test can check what reached "Chrome".
 */
class FakeExtension {
  readonly received: Array<{ method: string; params: Record<string, unknown> }> = [];
  tabs: FakeTab[] = [{ id: 101, title: "Human", url: HUMAN_URL, active: true, windowId: 1 }];
  private nextId = 200;
  private ws: WebSocket | undefined;

  connect(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      this.ws = ws;
      ws.on("message", (raw) => {
        const f = JSON.parse(raw.toString()) as { type?: string; id?: string; method?: string; params?: Record<string, unknown> };
        if (f.type === "welcome") return resolve();
        if (typeof f.id !== "string" || typeof f.method !== "string") return;
        const params = f.params ?? {};
        this.received.push({ method: f.method, params });
        ws.send(JSON.stringify({ id: f.id, result: this.answer(f.method, params) }));
      });
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2 })));
      ws.on("error", reject);
    });
  }

  close(): void {
    this.ws?.terminate();
  }

  methods(): string[] {
    return this.received.map((r) => r.method);
  }

  private answer(method: string, p: Record<string, unknown>): unknown {
    switch (method) {
      case "listTabs":
        // The human's tab (#43) is tab 101 throughout; new tabs open in the background (0.8 aside).
        return { tabs: this.tabs.map((t) => (t.id === 101 ? { ...t, current: true } : { ...t })) };
      case "newTab": {
        const id = this.nextId++;
        this.tabs.push({ id, title: "New", url: String(p.url ?? "about:blank"), active: false, windowId: 1 });
        return { id };
      }
      case "snapshot": {
        const t = this.tabs.find((x) => x.id === p.tabId);
        return { url: t?.url ?? "", title: t?.title ?? "", elements: [{ ref: "e1", role: "button", name: "Go", depth: 0 }], truncated: false };
      }
      case "networkRequests":
        return {
          entries: [{ id: "1", tabId: p.tabId ?? 101, url: HUMAN_URL, method: "GET", type: "main_frame", startedAt: Date.now() - 1500, endedAt: Date.now() - 1496, durationMs: 4, status: 200, responseSize: 13_106 }],
          total: 1,
          pending: 0,
          recordingSince: Date.now() - 60_000,
        };
      case "networkClear":
        return { cleared: 0 };
      default:
        return { ok: true };
    }
  }
}

type Handler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;

interface Actor {
  name: string;
  link: BridgeLink;
  clients: BridgeClient[];
  run(tool: string, args?: Record<string, unknown>): Promise<string>;
  fail(tool: string, args?: Record<string, unknown>): Promise<Error>;
}

describe("Step 7 T4 — two MCP actors over the real daemon and SDK", () => {
  let root: string;
  let daemonPath: string;
  let port: number;
  let host: WsHost | undefined;
  let ext: FakeExtension;
  const links: BridgeLink[] = [];
  const hosts: WsHost[] = [];

  /** Starts a daemon host on `p` (0 = any) with the fake extension connected to it. */
  async function startDaemon(p: number): Promise<number> {
    const bridge = new Bridge();
    const h = new WsHost(bridge, { port: p, token: TOKEN, build: BUILD });
    hosts.push(h);
    const bound = await h.listen();
    host = h;
    await ext.connect(bound);
    await waitUntil(() => bridge.isConnected());
    return bound;
  }

  /** The SDK's spawn seam: a "spawned daemon" is a new in-process host on the same port. */
  const spawnDaemon = vi.fn(async () => {
    await startDaemon(port);
  });

  function actor(pid: number): Actor {
    const clients: BridgeClient[] = [];
    const cursor = new TabCursor({ call: (m, p) => link.call(m, p) });
    const link: BridgeLink = new BridgeLink({
      connect: async () => {
        const c = await connect({
          ...connectOptions(pid),
          port,
          env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
          io: { hashDaemon: async () => BUILD, spawnDaemon },
        });
        clients.push(c);
        return c;
      },
      retryMs: 50,
      onClient: (c) => cursor.adopt(c),
    });
    links.push(link);
    link.start();
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, link, cursor);
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })._registeredTools;
    return {
      name: connectOptions(pid).name,
      link,
      clients,
      run: async (tool, args = {}) => {
        const res = await tools[tool].handler(args, {});
        if (res.isError) throw new Error(`tool error: ${res.content[0].text}`);
        return res.content[0].text as string;
      },
      fail: async (tool, args = {}) => {
        try {
          const res = await tools[tool].handler(args, {});
          throw new Error(`expected ${tool} to fail, got: ${res.content[0].text}`);
        } catch (err) {
          return err as Error;
        }
      },
    };
  }

  beforeEach(async () => {
    root = mkdtempSync(path.join(os.tmpdir(), "bridge-t4-"));
    daemonPath = path.join(root, "daemon.js");
    writeFileSync(daemonPath, "// not run: the daemon is in process");
    ext = new FakeExtension();
    spawnDaemon.mockClear();
    port = await startDaemon(0);
  });

  afterEach(async () => {
    for (const l of links.splice(0)) l.stop();
    ext.close();
    for (const h of hosts.splice(0)) await h.shutdown(1001);
    host = undefined;
    rmSync(root, { recursive: true, force: true });
  });

  it("A claims the human tab on first touch, B is refused naming A, B's new tab works, list_tabs shows both owners", async () => {
    const a = actor(1001);
    const b = actor(1002);
    await waitUntil(() => a.link.hasClient && b.link.hasClient);
    expect(a.name).toBe("claude-code #1001");
    expect(b.name).toBe("claude-code #1002");

    // A's first untargeted call claims the human's tab (101) and acts there.
    const snap = await a.run("browser_snapshot");
    expect(snap).toBe(`url: ${HUMAN_URL}   title: "Human"\n- button "Go" [ref=e1]`);
    expect(ext.received.filter((r) => r.method === "snapshot").map((r) => r.params)).toEqual([{ tabId: 101 }]);

    // B's untargeted call: its first-touch claim of the same tab is refused, naming A.
    const held = await b.fail("browser_click", { ref: "e1" });
    expect(held.message).toMatch(/^tab T\d+ is held by "claude-code #1001" since \d\d:\d\d:\d\d — use browser_new_tab, or browser_list_tabs to pick a free tab$/);
    expect(ext.methods()).not.toContain("click");

    // B opens its own tab (active:true, 0.8) and works there.
    const opened = await b.run("browser_new_tab", { url: "http://localhost:8080/other.html" });
    expect(opened).toMatch(/^Opened tab T\d+$/);
    const bTab = opened.slice("Opened tab ".length);
    expect(ext.received.find((r) => r.method === "newTab")!.params).toEqual({ url: "http://localhost:8080/other.html", active: true });
    expect(await b.run("browser_click", { ref: "e1" })).toBe("Clicked e1");
    expect(ext.received.find((r) => r.method === "click")!.params).toEqual({ ref: "e1", trusted: false, tabId: 200 });

    // list_tabs shows both owners and marks the human's tab.
    const list = (await a.run("browser_list_tabs")).split("\n");
    const aTab = list[0].split(/[* ]/)[0];
    expect(list).toEqual([
      `${aTab}* [claude-code #1001] Human — ${HUMAN_URL}`,
      `${bTab}  [claude-code #1002] New — http://localhost:8080/other.html`,
    ]);

    // A selecting B's tab is refused naming B; selecting its own tab succeeds. Neither reaches the
    // extension as selectTab or focusTab (select claims, it does not show).
    expect((await a.fail("browser_select_tab", { tab: bTab })).message).toContain('held by "claude-code #1002"');
    expect(await a.run("browser_select_tab", { tab: aTab })).toBe(
      `Selected tab ${aTab} (now this session's tab; not brought on screen — browser_focus_tab shows it)`,
    );
    expect(ext.methods().filter((m) => m === "selectTab" || m === "focusTab")).toEqual([]);

    // browser_focus_tab is the one that reaches focusTab, on A's tab.
    expect(await a.run("browser_focus_tab")).toBe(`Focused tab ${aTab}`);
    expect(ext.received.filter((r) => r.method === "focusTab").map((r) => r.params)).toEqual([{ tabId: 101 }]);

    // Network: A's untargeted listing is its tab, labelled as before (NET-1); the entry got a handle.
    const net = (await a.run("browser_network_requests")).split("\n");
    expect(net[0]).toMatch(/^Network — active tab: showing 1 of 1 \(recording since 1m00s ago; 0 pending\)$/);
    expect(ext.received.filter((r) => r.method === "networkRequests").map((r) => r.params)).toEqual([{ tabId: 101 }]);
    const all = await a.run("browser_network_requests", { tab: "all" });
    expect(all).toContain(`tab:${aTab}`);
    expect(all).not.toContain("tab:101");

    // B clearing "all" while A holds a tab is refused naming A (#40 as amended).
    expect((await b.fail("browser_network_clear", { tab: "all" })).message).toContain('held by "claude-code #1001"');
  });

  it("non-4002 restart: BridgeLink adopts a new client, and the next untargeted call re-claims with the notice, once", async () => {
    const a = actor(1001);
    await waitUntil(() => a.link.hasClient);
    await a.run("browser_click", { ref: "e1" });
    expect(a.clients).toHaveLength(1);

    // The daemon dies with a non-4002 close (1001); the link's probe drops the client, the next
    // connect() finds the port refused and "spawns" (a new host on the same port, renumbering handles).
    ext.close();
    await host!.shutdown(1001);
    await waitUntil(() => a.clients.length === 2 && a.link.hasClient);
    expect(spawnDaemon).toHaveBeenCalled();

    const first = await a.run("browser_click", { ref: "e2" });
    const [notice, rest] = first.split("\n");
    expect(notice).toBe(lostNotice(notice.match(/holds (T\d+)/)![1]));
    expect(rest).toBe("Clicked e2");
    expect(await a.run("browser_click", { ref: "e3" })).toBe("Clicked e3");
    // Every click reached the human's tab on whichever daemon was running.
    expect(ext.received.filter((r) => r.method === "click").map((r) => r.params.tabId)).toEqual([101, 101, 101]);
  });

  it("4002 restart: the same client reconnects, and the next untargeted call re-claims with the notice, once", async () => {
    const a = actor(1001);
    await waitUntil(() => a.link.hasClient);
    await a.run("browser_click", { ref: "e1" });
    const reconnected = vi.fn();
    a.clients[0].on("reconnected", reconnected);

    // The daemon is replaced (4002): BridgeClient reconnects by itself, through the spawn seam.
    ext.close();
    await host!.shutdown(4002);
    await waitUntil(() => reconnected.mock.calls.length === 1);
    expect(a.clients).toHaveLength(1); // no new client on this path

    const first = await a.run("browser_click", { ref: "e2" });
    const [notice, rest] = first.split("\n");
    expect(notice).toMatch(/^Note: the bridge daemon restarted, so this session's tab was lost; it now holds T\d+ \(the active tab\)\.$/);
    expect(rest).toBe("Clicked e2");
    expect(await a.run("browser_click", { ref: "e3" })).toBe("Clicked e3");
  });

  it("a first-ever claim after a restart gives no notice (no cursor was held)", async () => {
    const a = actor(1001);
    await waitUntil(() => a.link.hasClient);
    ext.close();
    await host!.shutdown(1001);
    await waitUntil(() => a.clients.length === 2 && a.link.hasClient);
    expect(await a.run("browser_click", { ref: "e1" })).toBe("Clicked e1");
  });
});

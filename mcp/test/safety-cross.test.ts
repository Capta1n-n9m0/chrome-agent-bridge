// Step 9 S3, cross-package: the real daemon host in process on 127.0.0.1 port 0, the real SDK `connect()`
// / BridgeClient, a BridgeLink + the 23 MCP tools, and a raw `ws` v2 client, against a fake proto:2
// extension over real `ws` that sends `safetyState` and hidden rows (decisions.md · 2026-10-24 #132 the
// relay, #133 the codes, #134 the redaction and hidden rows; Stage 0 F2, F40, F41; probe P3).
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
import { TabCursor } from "../src/cursor.js";
import { registerTools } from "../src/tools/registry.js";

const TOKEN = "s3-cross-token-SENTINEL";
const BUILD = "s3-cross-build";
const HUMAN_URL = "http://localhost:8080/e2e-playground.html";
const OTHER_URL = "http://localhost:8081/secret-page.html";

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

interface Row {
  id: number;
  title?: string;
  url?: string;
  active: boolean;
  windowId: number;
  current?: true;
  hidden?: "disarmed" | "blocked";
}

/** A Step 9 extension as the daemon sees it: proto:2 hello, `safetyState` events, hidden rows, refusals. */
class FakeExtension {
  readonly received: Array<{ method: string; params: Record<string, unknown> }> = [];
  rows: Row[] = [
    { id: 101, title: "Human Playground", url: HUMAN_URL, active: true, windowId: 1, current: true },
    { id: 102, title: "Other Secret", url: OTHER_URL, active: false, windowId: 1 },
  ];
  /** When set, every page method is refused with this code (`data.scope` as given). */
  refuse: { code: string; scope?: string } | null = null;
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
        if (this.refuse && f.method !== "listTabs") {
          const data = this.refuse.scope ? { scope: this.refuse.scope } : undefined;
          ws.send(JSON.stringify({ id: f.id, error: { code: this.refuse.code, message: "refused by the fake extension", data } }));
          return;
        }
        ws.send(JSON.stringify({ id: f.id, result: this.answer(f.method, params) }));
      });
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2 })));
      ws.on("error", reject);
    });
  }

  emit(event: string, params: Record<string, unknown>): void {
    this.ws?.send(JSON.stringify({ event, params }));
  }

  close(): void {
    this.ws?.close();
  }

  count(method: string): number {
    return this.received.filter((r) => r.method === method).length;
  }

  private answer(method: string, p: Record<string, unknown>): unknown {
    switch (method) {
      case "listTabs":
        return { tabs: this.rows.map((r) => ({ ...r })) };
      case "newTab": {
        const id = this.nextId++;
        this.rows.push({ id, title: "New", url: String(p.url ?? "about:blank"), active: false, windowId: 1 });
        return { id };
      }
      default:
        return { ok: true };
    }
  }
}

type Handler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;

describe("Step 9 S3 — the safety state across daemon, SDK and MCP over real ws", () => {
  let root: string;
  let daemonPath: string;
  let port: number;
  let host: WsHost;
  let logs: string[];
  let ext: FakeExtension;
  const links: BridgeLink[] = [];
  const clients: BridgeClient[] = [];
  const raws: WebSocket[] = [];

  async function sdk(): Promise<BridgeClient> {
    const c = await connect({
      name: "s3-cross.ts",
      port,
      env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
      io: { hashDaemon: async () => BUILD, spawnDaemon: vi.fn(async () => {}) },
      failureReports: false,
    });
    clients.push(c);
    return c;
  }

  function mcp() {
    const cursor = new TabCursor({ call: (m, p) => link.call(m, p) });
    const link: BridgeLink = new BridgeLink({
      connect: () =>
        connect({
          ...connectOptions(7001),
          port,
          env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
          io: { hashDaemon: async () => BUILD, spawnDaemon: vi.fn(async () => {}) },
        }),
      retryMs: 50,
      onClient: (c) => cursor.adopt(c),
    });
    links.push(link);
    link.start();
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, link, cursor);
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })._registeredTools;
    return {
      link,
      run: (tool: string, args: Record<string, unknown> = {}) => tools[tool].handler(args, {}),
    };
  }

  beforeEach(async () => {
    root = mkdtempSync(path.join(os.tmpdir(), "bridge-s3-cross-"));
    daemonPath = path.join(root, "daemon.js");
    writeFileSync(daemonPath, "// not run: the daemon is in process");
    const mine: string[] = [];
    logs = mine;
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: TOKEN, build: BUILD, log: (m) => mine.push(m) });
    port = await host.listen();
    ext = new FakeExtension();
    await ext.connect(port);
    await waitUntil(() => bridge.isConnected() && ext.count("listTabs") >= 1);
  });

  afterEach(async () => {
    for (const l of links.splice(0)) l.stop();
    for (const c of clients.splice(0)) c.close();
    for (const r of raws.splice(0)) r.terminate();
    ext.close();
    await host.shutdown(1001);
    rmSync(root, { recursive: true, force: true });
    // Log hygiene (0.7): no URL, title or token in any daemon line; the safety lines are content-free.
    for (const line of logs) {
      expect(line).not.toContain("://");
      expect(line).not.toContain("localhost");
      expect(line).not.toContain("Playground");
      expect(line).not.toContain("Secret");
      expect(line).not.toContain(TOKEN);
      if (line.startsWith("safety state:")) {
        expect(line).toMatch(
          /^safety state: (armed=(true|false) evaluate=(true|false) blocked=\d+|not reported \(extension disconnected\)|listTabs after the change failed|malformed event dropped)$/,
        );
      }
    }
  });

  it("relays the state to the SDK and the MCP, redacts while disarmed, renders hidden rows, and goes null on close", async () => {
    const client = await sdk();
    const a = mcp();
    await waitUntil(() => a.link.hasClient);

    // Not reported yet.
    expect(await client.safety()).toBeNull();
    const before = await a.run("browser_status");
    expect(before.content[1]).toEqual({ type: "text", text: "Safety: not reported (reload the extension)" });

    // A raw v2 client that knows nothing of safetyStatus (probe P3).
    const raw = new WebSocket(`ws://127.0.0.1:${port}`);
    raws.push(raw);
    const rawFrames: Array<Record<string, unknown>> = [];
    raw.on("message", (d) => rawFrames.push(JSON.parse(d.toString()) as Record<string, unknown>));
    await new Promise<void>((r) => raw.on("open", () => r()));
    raw.send(JSON.stringify({ type: "hello", token: TOKEN, role: "client", name: "raw-v2", proto: 2 }));
    await waitUntil(() => rawFrames.some((f) => f.type === "welcome"));

    // Armed.
    const statuses: unknown[] = [];
    client.on("safetyStatus", (p) => statuses.push(p));
    ext.emit("safetyState", { armed: true, evaluate: true, blockedCount: 0 });
    await waitUntil(() => statuses.length === 1);
    expect(statuses[0]).toEqual({ armed: true, evaluate: true, blockedCount: 0 });
    expect(await client.safety()).toEqual({ armed: true, evaluate: true, blockedCount: 0 });
    expect((await a.run("browser_status")).content[1]!.text).toBe("Safety: armed · JavaScript on · 0 blocked sites");
    expect(((await client.status()) as { tabs: Array<{ url?: string }> }).tabs.map((t) => t.url)).toEqual([HUMAN_URL, OTHER_URL]);
    expect(rawFrames.filter((f) => f.event === "safetyStatus")).toHaveLength(1);

    // The SDK client holds the other tab (T2).
    const other = (await client.tabs()).find((t) => t.url === OTHER_URL)!;
    await client.claim(other.handle);
    const gone: unknown[] = [];
    client.on("tabGone", (p) => gone.push(p));

    // Disarmed: hidden rows, redacted daemon output.
    const listTabsBefore = ext.count("listTabs");
    ext.rows = ext.rows.map((r) => ({ id: r.id, active: r.active, windowId: r.windowId, current: r.current, hidden: "disarmed" as const }));
    ext.refuse = { code: "DISARMED", scope: "all" };
    ext.emit("safetyState", { armed: false, evaluate: true, blockedCount: 0 });
    await waitUntil(() => statuses.length === 2 && ext.count("listTabs") === listTabsBefore + 1);
    expect(await client.safety()).toEqual({ armed: false, evaluate: true, blockedCount: 0 });
    for (const t of ((await client.status()) as { tabs: Array<Record<string, unknown>> }).tabs) expect(t).not.toHaveProperty("url");
    expect(await client.tabs()).toEqual([
      { handle: "T1", title: "", url: "", current: true, hidden: "disarmed" },
      { handle: other.handle, title: "", url: "", current: false, owner: "s3-cross.ts", hidden: "disarmed" },
    ]);
    const status = await a.run("browser_status");
    expect(status.content[1]!.text).toBe("Safety: DISARMED by the user · JavaScript on · 0 blocked sites");
    expect(status.content[0]!.text).toContain("Active tab: [T1] (hidden: the bridge is off)");
    const list = (await a.run("browser_list_tabs")).content[0]!.text!;
    expect(list.split("\n")).toEqual(["T1* (hidden: the bridge is off)", `${other.handle}  [s3-cross.ts] (hidden: the bridge is off)`]);
    expect(list).not.toContain("undefined");

    // An MCP page tool refused DISARMED: the one plain line, as an error.
    const refused = await a.run("browser_snapshot");
    expect(refused).toEqual({
      isError: true,
      content: [{ type: "text", text: "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it back on; do not retry." }],
    });

    // tabGone while disarmed: no lastUrl/lastTitle, though the daemon cached both while armed.
    ext.rows = ext.rows.filter((r) => r.id !== 102);
    ext.emit("tabRemoved", { tabId: 102, hidden: "disarmed" });
    await waitUntil(() => gone.length === 1);
    expect(gone[0]).toEqual({ tab: other.handle });

    // The raw client kept working across both broadcasts.
    raw.send(JSON.stringify({ id: "r1", method: "listTabs" }));
    await waitUntil(() => rawFrames.some((f) => f.id === "r1"));
    expect(rawFrames.find((f) => f.id === "r1")).toHaveProperty("result");

    // Re-armed with one blocked site: the change's listTabs clears the now-blocked tab's cache.
    ext.refuse = null;
    ext.rows = [
      { id: 101, active: true, windowId: 1, current: true, hidden: "blocked" },
      { id: 103, title: "Third", url: "http://localhost:8080/third", active: false, windowId: 1 },
    ];
    const n = ext.count("listTabs");
    ext.emit("safetyState", { armed: true, evaluate: false, blockedCount: 1 });
    await waitUntil(() => statuses.length === 3 && ext.count("listTabs") === n + 1);
    await new Promise((r) => setTimeout(r, 30));
    const rows = ((await client.status()) as { tabs: Array<Record<string, unknown>> }).tabs;
    expect(rows.find((t) => t.tabId === 101)).not.toHaveProperty("url");
    expect(rows.find((t) => t.tabId === 103)!.url).toBe("http://localhost:8080/third");
    expect((await a.run("browser_status")).content[1]!.text).toBe("Safety: armed · JavaScript off · 1 blocked site");

    // An opener popup onto a blocked page: leaseGranted with url "", without the 2 s url fill.
    const mine = await client.newTab("http://localhost:8080/new");
    const grants: Array<{ tab: string; url: string }> = [];
    client.on("leaseGranted", (p) => grants.push(p));
    const newTabId = ext.received.filter((r) => r.method === "newTab").length + 199;
    ext.rows.push({ id: 300, active: false, windowId: 1, hidden: "blocked" });
    const sentAt = Date.now();
    ext.emit("tabCreated", { tabId: 300, openerTabId: newTabId, url: "" });
    await waitUntil(() => grants.length === 1);
    expect(Date.now() - sentAt).toBeLessThan(1000); // the fill would have waited 2000 ms
    expect(grants[0]!.url).toBe("");
    expect(mine.handle).toMatch(/^T\d+$/);

    // The extension socket closes: null again, with no null broadcast.
    ext.close();
    await waitUntil(() => client.extensionConnected === false);
    expect(await client.safety()).toBeNull();
    expect(statuses).toHaveLength(3);
    expect(logs.filter((l) => l.startsWith("safety state:"))).toEqual([
      "safety state: armed=true evaluate=true blocked=0",
      "safety state: armed=false evaluate=true blocked=0",
      "safety state: armed=true evaluate=false blocked=1",
      "safety state: not reported (extension disconnected)",
    ]);
  });
});

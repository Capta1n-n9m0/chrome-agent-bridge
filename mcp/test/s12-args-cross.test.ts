// Step 12 S2b — `args` for evaluate across the real daemon host, SDK and MCP tool, against a fake proto:2
// extension over real `ws` on port 0 (phase doc 0.4 with its Stage 0 note; decisions.md #322, #330, #332; exit
// checks B2.1 (SDK/MCP side) and B2.3 as rewritten in stage0-audit.md §5; 0.10's sentinel).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { connect, ErrorCodes, type BridgeClient } from "@bridge/sdk";
import { Bridge } from "../../daemon/src/bridge.js";
import { WsHost } from "../../daemon/src/wsHost.js";
import { registerTools } from "../src/tools/registry.js";

const TOKEN = "s12-args-token";
const BUILD = "s12-build";
const SENTINEL = "sentinel-args-K7W3-";
/** The round-trip table: nested, Unicode, numbers, null, arrays, a top-level null. */
const TABLE: unknown[] = [
  { rows: [1, 2, { z: null, a: [true, false] }], name: "é€😀", n: -0.5, big: 1e21 },
  null,
  [[], {}, "", 0],
  "plain string",
  { [SENTINEL + "key"]: SENTINEL + "value" },
];

type Received = { method: string; params: Record<string, unknown> };

/** An extension with or without the `evaluateArgs` feature; `evaluate` echoes `args` back as its value. */
class FakeExtension {
  readonly received: Received[] = [];
  private ws: WebSocket | undefined;
  constructor(private readonly features: string[] | undefined) {}

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
      const hello: Record<string, unknown> = { type: "hello", token: TOKEN, role: "extension", proto: 2 };
      if (this.features) hello.features = this.features;
      ws.on("open", () => ws.send(JSON.stringify(hello)));
      ws.on("error", reject);
    });
  }

  close(): void {
    this.ws?.terminate();
  }

  evaluateCalls(): Received[] {
    return this.received.filter((r) => r.method.startsWith("evaluate"));
  }

  private answer(method: string, p: Record<string, unknown>): unknown {
    if (method === "listTabs") return { tabs: [{ id: 101, title: "Human", url: "about:blank", active: true, windowId: 1, current: true }] };
    if (method !== "evaluate") return { ok: true };
    if ("args" in p) return { kind: "json", value: p.args, description: JSON.stringify(p.args), truncated: false };
    return { kind: "function", description: "function f()", truncated: false }; // a real function result
  }
}

type ToolResult = { content: Array<{ type: string; text?: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<ToolResult>;

describe("S2b — evaluate args through the daemon, the SDK and browser_evaluate", () => {
  let root: string;
  let host: WsHost;
  let ext: FakeExtension;
  let client: BridgeClient;
  let daemonLog: string[];
  let consoleLines: string[];
  const spies: Array<{ mockRestore(): void }> = [];

  async function start(features: string[] | undefined): Promise<void> {
    daemonLog = [];
    consoleLines = [];
    for (const k of ["log", "info", "warn", "error", "debug"] as const) {
      spies.push(vi.spyOn(console, k).mockImplementation((...a: unknown[]) => void consoleLines.push(a.map(String).join(" "))));
    }
    host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: BUILD, log: (m) => daemonLog.push(m), heartbeatMs: 60_000 });
    const port = await host.listen();
    ext = new FakeExtension(features);
    await ext.connect(port);
    const daemonPath = path.join(root, "daemon.js");
    writeFileSync(daemonPath, "// not run: the daemon is in process");
    client = await connect({
      name: "s12-args",
      port,
      failureReports: false,
      env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
      io: { hashDaemon: async () => BUILD, spawnDaemon: async () => {} },
    });
  }

  function tool(name: string): (args: Record<string, unknown>) => Promise<ToolResult> {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, client as never);
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })._registeredTools;
    return (args) => tools[name].handler(args, {});
  }

  /** The sentinel never reaches the daemon's logger or any console line. */
  function expectNoSentinel(): void {
    for (const line of [...daemonLog, ...consoleLines]) expect(line.includes(SENTINEL), `a log line of ${line.length} chars`).toBe(false);
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "bridge-s12-args-"));
  });

  afterEach(async () => {
    await client?.close();
    ext?.close();
    await host?.shutdown(1001);
    for (const s of spies.splice(0)) s.mockRestore();
    rmSync(root, { recursive: true, force: true });
  });

  it("B2.1: with the feature, every table value reaches the extension intact and comes back equal (SDK and MCP)", async () => {
    await start(["evaluateArgs"]);
    const tab = await client.claim({ active: true });
    for (const value of TABLE) {
      const back = await tab.evaluate("(a) => a", { args: value });
      expect(back).toEqual(value);
      expect(JSON.stringify(back)).toBe(JSON.stringify(value)); // key order too: toEqual ignores it (Step 13 S2)
      const res = await tool("browser_evaluate")({ expression: "(a) => a", args: value, tab: tab.handle });
      expect(res.isError).toBeFalsy();
    }
    const calls = ext.evaluateCalls();
    expect(calls).toHaveLength(TABLE.length * 2);
    for (const [i, c] of calls.entries()) {
      expect(c.params).toEqual({ expression: "(a) => a", timeoutMs: 10_000, args: TABLE[Math.floor(i / 2)], tabId: 101 });
      expect(JSON.stringify(c.params.args)).toBe(JSON.stringify(TABLE[Math.floor(i / 2)])); // key order kept
    }
    expectNoSentinel();
  });

  it("B2.3: without the feature, args on evaluate, evaluateRef, evaluateToFile and the MCP tool answer VERSION, never forwarded", async () => {
    await start(undefined);
    const tab = await client.claim({ active: true });
    const target = path.join(root, "out.json");
    const attempts: Array<() => Promise<unknown>> = [
      () => tab.evaluate("(a) => a.n", { args: { n: SENTINEL } }),
      () => tab.evaluate("(a) => a", { args: null }),
      () => tab.evaluateRef("(a) => document.getElementById(a)", { args: SENTINEL }),
      () => tab.evaluateToFile("(a) => a", { args: [SENTINEL], path: target }),
      () => client.evaluate("(a) => a", { args: 1 }),
      // The daemon's own rule, with no SDK method in between (#332).
      () => client.call("evaluate", { expression: "(a) => a", args: SENTINEL, tab: tab.handle }),
      () => client.call("evaluateSaveStart", { expression: "(a) => a", args: SENTINEL, tab: tab.handle }),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toMatchObject({ code: ErrorCodes.VERSION, message: expect.stringContaining("reload it at chrome://extensions") });
    }
    // The raw tool handler throws; the MCP SDK turns the throw into an isError result.
    await expect(tool("browser_evaluate")({ expression: "(a) => a", args: { s: SENTINEL }, tab: tab.handle })).rejects.toMatchObject({
      code: ErrorCodes.VERSION,
      message: expect.stringContaining("reload it at chrome://extensions"),
    });
    // The MCP's saveTo leg carries args too (S2b-verifier F1): without them this call would reach the fake.
    const mcpTarget = path.join(root, "m.json");
    await expect(
      tool("browser_evaluate")({ expression: "(a) => a", args: SENTINEL, saveTo: mcpTarget, tab: tab.handle }),
    ).rejects.toMatchObject({ code: ErrorCodes.VERSION, message: expect.stringContaining("reload it at chrome://extensions") });
    expect(existsSync(mcpTarget)).toBe(false);
    expect(existsSync(`${mcpTarget}.part`)).toBe(false);
    expect(ext.evaluateCalls()).toEqual([]);
    expect(existsSync(target)).toBe(false);

    // Without args, today's call reaches the old extension and a real function result stays kind "function".
    expect(await tab.evaluate("function f() {}")).toBeUndefined();
    expect(await client.call("evaluate", { expression: "function f() {}", tab: tab.handle })).toMatchObject({ kind: "function" });
    expect(ext.evaluateCalls().map((c) => c.params)).toEqual([
      { expression: "function f() {}", timeoutMs: 10_000, tabId: 101 },
      { expression: "function f() {}", tabId: 101 },
    ]);
    expectNoSentinel();
  });

  it("the SDK runs the shared guard before any wire call: refusals are BAD_PARAMS with no call and no file", async () => {
    await start(["evaluateArgs"]);
    const tab = await client.claim({ active: true });
    const target = path.join(root, "out.json");
    const cases: Array<[() => Promise<unknown>, string]> = [
      [() => tab.evaluate("(a) => a", { args: { x: undefined } }), "holds undefined"],
      [() => tab.evaluate("(a) => a", { args: "x".repeat(1_048_577) }), "over the 1 MiB cap"],
      [() => tab.evaluateRef("(a) => a", { args: 10n }), "holds a BigInt"],
      [() => tab.evaluateToFile("(a) => a", { args: () => 1, path: target }), "holds a function"],
      [() => tab.evaluate((() => 1) as unknown as string, { args: 1 }), "function source as a string"],
    ];
    for (const [attempt, text] of cases) {
      await expect(attempt()).rejects.toMatchObject({ code: ErrorCodes.BAD_PARAMS, message: expect.stringContaining(text) });
    }
    await expect(tool("browser_evaluate")({ expression: "(a) => a", args: "y".repeat(1_048_577), tab: tab.handle })).rejects.toMatchObject({
      code: ErrorCodes.BAD_PARAMS,
      message: expect.stringContaining("over the 1 MiB cap"),
    });
    expect(ext.evaluateCalls()).toEqual([]);
    expect(existsSync(target)).toBe(false);
    expect(existsSync(`${target}.part`)).toBe(false);
  });
});

// Step 12 S3b — `consoleMessages` across the real daemon host, SDK and MCP tool, against a fake proto:2 extension over
// real `ws` on port 0 (phase doc 0.5, 0.10's sentinel; decisions.md #323, #334, #344; exit checks C3.2 client side
// and C3.4): the daemon forwards `{tabId, level?, limit?}`; a console sentinel in the reply reaches the caller and
// never the daemon's log or any console line; a refused read answers exactly as a refused `snapshot` does.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { connect, ErrorCodes, type BridgeClient, type WireError } from "@bridge/sdk";
import { Bridge } from "../../daemon/src/bridge.js";
import { WsHost } from "../../daemon/src/wsHost.js";
import { registerTools } from "../src/tools/registry.js";

const TOKEN = "s12-console-token";
const BUILD = "s12-console-build";
const SENTINEL = "sentinel-console-Q4V8-";
const ENTRIES = [
  { level: "info", text: `${SENTINEL}one`, ts: Date.UTC(2026, 9, 27, 10, 0, 0, 0), kind: "console" },
  { level: "error", text: `Uncaught Error: ${SENTINEL}two`, ts: Date.UTC(2026, 9, 27, 10, 0, 1, 0), kind: "exception" },
];

type Received = { method: string; params: Record<string, unknown> };

/** Answers `consoleMessages` with ENTRIES, or every page method with `refusal` when one is set. */
class FakeExtension {
  readonly received: Received[] = [];
  refusal: WireError | undefined;
  private ws: WebSocket | undefined;

  connect(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      this.ws = ws;
      ws.on("message", (raw) => {
        const f = JSON.parse(raw.toString()) as { type?: string; id?: string; method?: string; params?: Record<string, unknown> };
        if (f.type === "welcome") return resolve();
        if (typeof f.id !== "string" || typeof f.method !== "string") return;
        this.received.push({ method: f.method, params: f.params ?? {} });
        if (f.method === "listTabs") {
          return ws.send(JSON.stringify({ id: f.id, result: { tabs: [{ id: 101, title: "Human", url: "about:blank", active: true, windowId: 1, current: true }] } }));
        }
        if (this.refusal) return ws.send(JSON.stringify({ id: f.id, error: this.refusal }));
        ws.send(JSON.stringify({ id: f.id, result: f.method === "consoleMessages" ? { entries: ENTRIES } : { ok: true } }));
      });
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2, features: ["evaluateArgs"] })));
      ws.on("error", reject);
    });
  }

  close(): void {
    this.ws?.terminate();
  }
}

type ToolResult = { content: Array<{ type: string; text?: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<ToolResult>;

describe("S3b — consoleMessages through the daemon, the SDK and browser_console_messages", () => {
  let root: string;
  let host: WsHost;
  let ext: FakeExtension;
  let client: BridgeClient;
  let daemonLog: string[];
  let consoleLines: string[];
  const spies: Array<{ mockRestore(): void }> = [];

  async function start(): Promise<void> {
    daemonLog = [];
    consoleLines = [];
    for (const k of ["log", "info", "warn", "error", "debug"] as const) {
      spies.push(vi.spyOn(console, k).mockImplementation((...a: unknown[]) => void consoleLines.push(a.map(String).join(" "))));
    }
    host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: BUILD, log: (m) => daemonLog.push(m), heartbeatMs: 60_000 });
    const port = await host.listen();
    ext = new FakeExtension();
    await ext.connect(port);
    const daemonPath = path.join(root, "daemon.js");
    writeFileSync(daemonPath, "// not run: the daemon is in process");
    client = await connect({
      name: "s12-console",
      port,
      failureReports: false,
      env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
      io: { hashDaemon: async () => BUILD, spawnDaemon: async () => {} },
    });
  }

  function tool(name: string): (args: Record<string, unknown>) => Promise<ToolResult> {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, client as never);
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler; description?: string }> })._registeredTools;
    return (args) => tools[name].handler(args, {});
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "bridge-s12-console-"));
  });

  afterEach(async () => {
    await client?.close();
    ext?.close();
    await host?.shutdown(1001);
    for (const s of spies.splice(0)) s.mockRestore();
    rmSync(root, { recursive: true, force: true });
  });

  it("C3.4: the SDK and the tool get the entries; the extension gets {tabId, level, limit}; the sentinel is 0 in daemon.log", async () => {
    await start();
    const tab = await client.claim({ active: true });
    expect(await tab.consoleMessages({ level: "info", limit: 7 })).toEqual(ENTRIES);
    const out = await tool("browser_console_messages")({ tab: tab.handle, level: "error" });
    expect(out.isError).toBeUndefined();
    expect(out.content[0]!.text).toBe(
      `2026-10-27T10:00:00.000Z info ${SENTINEL}one\n2026-10-27T10:00:01.000Z error uncaught Uncaught Error: ${SENTINEL}two`,
    );
    expect(await tool("browser_console_messages")({})).toMatchObject({ content: [{ text: expect.stringContaining(SENTINEL) }] });
    const sent = ext.received.filter((r) => r.method === "consoleMessages").map((r) => r.params);
    expect(sent).toEqual([{ tabId: 101, level: "info", limit: 7 }, { tabId: 101, level: "error" }, { tabId: 101 }]);
    expect(daemonLog.length).toBeGreaterThan(0);
    const hits = [...daemonLog, ...consoleLines].filter((line) => line.includes(SENTINEL)).length;
    expect(hits).toBe(0);
  });

  it("C3.2 client side: JS_DISABLED, DISARMED and DOMAIN_BLOCKED answer as browser_snapshot's, one plain error line", async () => {
    await start();
    const tab = await client.claim({ active: true });
    const refusals: WireError[] = [
      { code: ErrorCodes.JS_DISABLED, message: "JavaScript is off for the bridge" },
      { code: ErrorCodes.DISARMED, message: "The bridge is off", data: { scope: "all" } },
      { code: ErrorCodes.DOMAIN_BLOCKED, message: "This site is on the bridge's block list" },
    ];
    for (const refusal of refusals) {
      ext.refusal = refusal;
      await expect(tab.consoleMessages()).rejects.toMatchObject({ code: refusal.code, message: refusal.message });
      const viaConsole = await tool("browser_console_messages")({ tab: tab.handle });
      const viaSnapshot = await tool("browser_snapshot")({ tab: tab.handle });
      expect(viaConsole.isError).toBe(true);
      expect(viaConsole).toEqual(viaSnapshot);
      expect(viaConsole.content).toHaveLength(1);
    }
  });

  it("the description says it is refused while JavaScript is off, which frames are not read, and the class-name limit", () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, {} as never);
    const d = (server as unknown as { _registeredTools: Record<string, { description?: string }> })._registeredTools.browser_console_messages!.description ?? "";
    expect(d).toContain("Refused while JavaScript is off for the bridge");
    // Step 13 S3b (#379, plan-drift finding 1): only a frame in another site's process is not read (R19-CON-FRAME).
    expect(d).toContain("Messages of a frame in another site's process are not read (a same-site frame's are, and are dropped like the page's when its site is blocked);");
    expect(d).not.toContain("Messages of the page's frames are not read");
    // Step 13 S3b (#387): CON-NOTEA stays a documented limit.
    expect(d).toContain("An object logged before this call shows its class name only, not its contents.");
    expect(d).toContain("No source URL and no stack");
    expect(d).toContain("logged before the bridge was last switched on or before the extension's worker last restarted, are left out");
  });
});

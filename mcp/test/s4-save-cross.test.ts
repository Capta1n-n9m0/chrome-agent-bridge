// Step 10 S4.1 (phase doc 0.4 (B); exit check S4.1 as amended by Stage 0 F13 and verifier V6, V8): the real
// daemon host on 127.0.0.1 port 0, the real SDK `connect()`/BridgeClient/Tab, the MCP's BridgeLink, cursor
// and tools, over real `ws`, against a fake proto:2 extension that serves `evaluateSaveStart` /
// `evaluateSaveChunk` / `evaluateSaveEnd` from a value of 1 000 000 random characters (crypto; non-ASCII
// included, so bytes ≠ characters). Saved through the MCP and through the SDK: the file's sha256 equals
// sha256(TextEncoder(value)); the MCP answer is ≤ min(300, path.length + 120) characters; no 16-character run
// of the value is in the MCP answer, the SDK's return value or any captured log line (the daemon's log
// file, its raw logger lines, and the console). Then: a pull after the store is lost → a clean refusal and no
// `.part`; a refusal mid-pull → `.part` gone.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash, randomInt } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { connect, ErrorCodes, type BridgeClient } from "@bridge/sdk";
import { Bridge } from "../../daemon/src/bridge.js";
import { WsHost } from "../../daemon/src/wsHost.js";
import { createFileLogger } from "../../daemon/src/log.js";
import { connectOptions } from "../src/config.js";
import { BridgeLink } from "../src/link.js";
import { TabCursor } from "../src/cursor.js";
import { registerTools } from "../src/tools/registry.js";

const TOKEN = "s4-save-cross-token-SENTINEL";
const BUILD = "s4-build";
const HUMAN_URL = "http://localhost:8080/e2e-playground.html";
const CHUNK = 1_048_576;

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

/** 1 000 000 characters from crypto, over an alphabet with ASCII and BMP non-ASCII (one code unit each). */
function randomValue(n = 1_000_000): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" + "éжж€中ßøΩ";
  const out: string[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = alphabet[randomInt(alphabet.length)]!;
  return out.join("");
}

/** True when some 16-character run of `value` occurs in `text`. */
function leaks(text: string, value: string): boolean {
  for (let i = 0; i + 16 <= text.length; i++) if (value.includes(text.slice(i, i + 16))) return true;
  return false;
}

/** The extension's store as the daemon sees it: entries keyed by id and the tab that filled them. */
class FakeExtension {
  readonly received: Array<{ method: string; params: Record<string, unknown> }> = [];
  value = "";
  /** V8: drop every entry after this many chunks (a worker restart). */
  forgetAfterChunks = Infinity;
  /** Refuse the n-th chunk as a disarm would. */
  disarmAtChunk = Infinity;
  private store = new Map<string, { tabId: number; bytes: Buffer }>();
  private chunks = 0;
  private seq = 0;
  private nextTab = 200;
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
        try {
          ws.send(JSON.stringify({ id: f.id, result: this.answer(f.method, params) }));
        } catch (err) {
          const e = err as { code?: string; message: string; data?: unknown };
          ws.send(JSON.stringify({ id: f.id, error: { code: e.code ?? "INTERNAL", message: e.message, ...(e.data ? { data: e.data } : {}) } }));
        }
      });
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2 })));
      ws.on("error", reject);
    });
  }

  close(): void {
    this.ws?.terminate();
  }

  held(): number {
    return this.store.size;
  }

  private answer(method: string, p: Record<string, unknown>): unknown {
    switch (method) {
      case "listTabs":
        return { tabs: [{ id: 101, title: "Human", url: HUMAN_URL, active: true, windowId: 1, current: true }] };
      case "newTab":
        return { id: this.nextTab++ };
      case "evaluateSaveStart": {
        const bytes = Buffer.from(new TextEncoder().encode(this.value));
        const id = `es${++this.seq}-x`;
        this.store.set(id, { tabId: Number(p.tabId), bytes });
        return { id, bytes: bytes.length, kind: "string" };
      }
      case "evaluateSaveChunk": {
        this.chunks++;
        if (this.chunks > this.forgetAfterChunks) this.store.clear();
        if (this.chunks === this.disarmAtChunk) {
          this.store.clear();
          throw Object.assign(new Error("The user has turned the bridge off in Chrome."), { code: "DISARMED", data: { scope: "all" } });
        }
        const e = this.store.get(String(p.id));
        if (!e || e.tabId !== p.tabId) throw new Error(`Unknown or expired evaluateSave id: ${String(p.id)}`);
        const off = Number(p.offset);
        const len = Math.min(Number(p.length) || CHUNK, CHUNK);
        return { data: e.bytes.subarray(off, off + len).toString("base64") };
      }
      case "evaluateSaveEnd": {
        const e = this.store.get(String(p.id));
        if (!e || e.tabId !== p.tabId) return { released: false };
        this.store.delete(String(p.id));
        return { released: true };
      }
      default:
        return { ok: true };
    }
  }
}

type Handler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;

describe("S4.1 — saveTo over the real daemon, SDK and MCP (port 0)", () => {
  let root: string;
  let daemonPath: string;
  let logFile: string;
  let port: number;
  let ext: FakeExtension;
  let host: WsHost;
  const rawLog: string[] = [];
  const consoleLines: string[] = [];
  const links: BridgeLink[] = [];
  const clients: BridgeClient[] = [];

  beforeEach(async () => {
    root = mkdtempSync(path.join(os.tmpdir(), "bridge-s4x-"));
    daemonPath = path.join(root, "daemon.js");
    writeFileSync(daemonPath, "// not run: the daemon is in process");
    logFile = path.join(root, "daemon.log");
    rawLog.length = 0;
    consoleLines.length = 0;
    for (const m of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void consoleLines.push(a.map(String).join(" ")));
    }
    const fileLogger = createFileLogger({ path: logFile });
    fileLogger.setSecret(TOKEN);
    ext = new FakeExtension();
    const bridge = new Bridge();
    host = new WsHost(bridge, {
      port: 0,
      token: TOKEN,
      build: BUILD,
      log: (m) => {
        rawLog.push(m);
        fileLogger.log(m);
      },
    });
    port = await host.listen();
    await ext.connect(port);
    await waitUntil(() => bridge.isConnected());
  });

  afterEach(async () => {
    for (const l of links.splice(0)) l.stop();
    for (const c of clients.splice(0)) c.close();
    ext.close();
    await host.shutdown(1001);
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function sdkConnect(): Promise<BridgeClient> {
    return connect({
      name: "s4-sdk",
      port,
      env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
      io: { hashDaemon: async () => BUILD, spawnDaemon: async () => {} },
    }).then((c) => {
      clients.push(c);
      return c;
    });
  }

  function mcpActor() {
    const cursor = new TabCursor({ call: (m, p) => link.call(m, p) });
    const link: BridgeLink = new BridgeLink({
      connect: async () => {
        const c = await connect({
          ...connectOptions(4401),
          port,
          env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
          io: { hashDaemon: async () => BUILD, spawnDaemon: async () => {} },
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
    registerTools(server, link, cursor, { actorName: "s4-mcp" });
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })._registeredTools;
    return { link, run: (args: Record<string, unknown>) => tools.browser_evaluate.handler(args, {}) };
  }

  function allLogLines(): string[] {
    const file = existsSync(logFile) ? readFileSync(logFile, "utf8").split("\n") : [];
    return [...file, ...rawLog, ...consoleLines];
  }

  it("a 1 000 000-character value through the MCP and through the SDK: hash, answer bound, no 16-character run anywhere", async () => {
    const value = randomValue();
    expect(value.length).toBe(1_000_000);
    const expectedBytes = Buffer.from(new TextEncoder().encode(value));
    expect(expectedBytes.length).toBeGreaterThan(value.length); // non-ASCII: bytes ≠ characters
    const expectedSha = createHash("sha256").update(expectedBytes).digest("hex");
    ext.value = value;
    const dir = path.join(root, "out");
    rmSync(dir, { recursive: true, force: true });
    await import("node:fs/promises").then((fs) => fs.mkdir(dir));

    // Through the MCP (its cursor claims the human's tab on first touch).
    const actor = mcpActor();
    await waitUntil(() => actor.link.hasClient);
    const mcpPath = path.join(dir, "via-mcp.txt");
    expect(mcpPath.length).toBeLessThanOrEqual(180);
    const res = await actor.run({ expression: "return window.big", saveTo: mcpPath });
    expect(res.isError).toBeUndefined();
    const answer = res.content.map((c) => c.text ?? "").join("\n");
    expect(answer).toBe(`Saved ${mcpPath}\n${expectedBytes.length} bytes · string · sha256 ${expectedSha}`);
    expect(answer.length).toBeLessThanOrEqual(Math.min(300, mcpPath.length + 120));
    expect(leaks(answer, value)).toBe(false);
    expect(createHash("sha256").update(readFileSync(mcpPath)).digest("hex")).toBe(expectedSha);

    // Through the SDK, on a tab of its own.
    const client = await sdkConnect();
    const tab = await client.newTab("http://localhost:8080/other.html");
    const sdkPath = path.join(dir, "via-sdk.txt");
    const out = await tab.evaluateToFile("return window.big", { path: sdkPath });
    expect(out).toEqual({ path: sdkPath, bytes: expectedBytes.length, kind: "string", sha256: expectedSha });
    expect(leaks(JSON.stringify(out), value)).toBe(false);
    expect(createHash("sha256").update(readFileSync(sdkPath)).digest("hex")).toBe(expectedSha);

    // Pulled in slices of ≤ 1 MiB, each end sent, nothing left held, no .part left.
    const chunks = ext.received.filter((r) => r.method === "evaluateSaveChunk");
    expect(chunks.length).toBe(2 * Math.ceil(expectedBytes.length / CHUNK));
    expect(ext.received.filter((r) => r.method === "evaluateSaveEnd")).toHaveLength(2);
    for (const r of ext.received) expect(r.params).not.toHaveProperty("tab"); // the daemon forwards tabId only
    expect(ext.held()).toBe(0);
    expect(readdirSync(dir).sort()).toEqual(["via-mcp.txt", "via-sdk.txt"]);

    // The logs: live (the daemon logged its start-up lines), and clean.
    expect(rawLog.length).toBeGreaterThan(0);
    for (const line of allLogLines()) {
      expect(leaks(line, value), `a run of the value in a log line (${line.length} chars)`).toBe(false);
      expect(line).not.toContain(mcpPath);
      expect(line).not.toContain(sdkPath);
    }
  }, 60_000);

  it("V8: a pull after the store is lost is refused cleanly and leaves no .part", async () => {
    ext.value = randomValue(3 * CHUNK);
    ext.forgetAfterChunks = 1;
    const client = await sdkConnect();
    const tab = await client.newTab("http://localhost:8080/other.html");
    const target = path.join(root, "lost.txt");
    const err = await tab.evaluateToFile("x", { path: target }).catch((e: { code?: string; message: string }) => e);
    expect(err).toMatchObject({ code: ErrorCodes.INTERNAL });
    expect((err as Error).message).toMatch(/Unknown or expired evaluateSave id/);
    expect(existsSync(target)).toBe(false);
    expect(existsSync(`${target}.part`)).toBe(false);
    expect(ext.received.at(-1)?.method).toBe("evaluateSaveEnd");
  }, 30_000);

  it("a refusal mid-pull (the human disarms) through the MCP: the one safety line, .part gone", async () => {
    ext.value = randomValue(3 * CHUNK);
    ext.disarmAtChunk = 2;
    const actor = mcpActor();
    await waitUntil(() => actor.link.hasClient);
    const target = path.join(root, "mid.txt");
    const res = await actor.run({ expression: "x", saveTo: target });
    expect(res.isError).toBe(true);
    expect(res.content).toHaveLength(1);
    expect(res.content[0]!.text).toMatch(/turned the bridge off/i);
    expect(existsSync(target)).toBe(false);
    expect(existsSync(`${target}.part`)).toBe(false);
  }, 30_000);
});

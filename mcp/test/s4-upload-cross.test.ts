// Step 11 S4 (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.6, 0.8, 0.9, 0.10; exit check S4.4;
// decisions.md #238, #240, #241): the real daemon host on 127.0.0.1 port 0, the real SDK `connect()`/BridgeClient/Tab
// and the MCP's BridgeLink, cursor and tools, over real `ws`, against a fake proto:2 extension. `uploadFiles` is
// forwarded with a numeric `tabId` (never a `tab` key) and the real paths (a junction resolved); it is lease-checked
// (another client's tab → `TAB_HELD`, nothing forwarded); and it never takes the visibility lock (it completes while
// another client's default-mode screenshot holds the lock). No path, folder or file name reaches a log line.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
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

const TOKEN = "s4-upload-cross-token-SENTINEL";
const BUILD = "s4u-build";
const HUMAN_URL = "http://localhost:8080/e2e-playground.html";
/** Directory and file names that must reach no log line. */
const SENTINEL_DIR = "SENTINEL-CROSS-DIR-H5V";
const SENTINEL_FILE = "sentinel-cross-file-R2M.txt";

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

/** A proto:2 extension: tabs, `uploadFiles` → `{files: n}`, and a screenshot it answers only when told to. */
class FakeExtension {
  readonly received: Array<{ method: string; params: Record<string, unknown> }> = [];
  private nextTab = 200;
  private ws: WebSocket | undefined;
  private heldScreenshot: (() => void) | undefined;

  connect(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      this.ws = ws;
      ws.on("message", (raw) => {
        const f = JSON.parse(raw.toString()) as { type?: string; id?: string; method?: string; params?: Record<string, unknown> };
        if (f.type === "welcome") return resolve();
        if (typeof f.id !== "string" || typeof f.method !== "string") return;
        const id = f.id;
        const params = f.params ?? {};
        this.received.push({ method: f.method, params });
        if (f.method === "screenshot") {
          this.heldScreenshot = () => ws.send(JSON.stringify({ id, result: { dataUrl: "data:image/png;base64,iVBORw0KGgo=" } }));
          return;
        }
        ws.send(JSON.stringify({ id, result: this.answer(f.method, params) }));
      });
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2 })));
      ws.on("error", reject);
    });
  }

  screenshotPending(): boolean {
    return this.heldScreenshot !== undefined;
  }

  releaseScreenshot(): void {
    const send = this.heldScreenshot;
    this.heldScreenshot = undefined;
    send?.();
  }

  close(): void {
    this.ws?.terminate();
  }

  uploads(): Array<Record<string, unknown>> {
    return this.received.filter((r) => r.method === "uploadFiles").map((r) => r.params);
  }

  private answer(method: string, p: Record<string, unknown>): unknown {
    switch (method) {
      case "listTabs":
        return { tabs: [{ id: 101, title: "Human", url: HUMAN_URL, active: true, windowId: 1, current: true }] };
      case "newTab":
        return { id: this.nextTab++ };
      case "uploadFiles":
        return { files: (p.paths as unknown[]).length };
      default:
        return { ok: true };
    }
  }
}

type Handler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;

describe("S4.4 — uploadFiles over the real daemon, SDK and MCP (port 0)", () => {
  let root: string;
  let daemonPath: string;
  let logFile: string;
  let port: number;
  let ext: FakeExtension;
  let host: WsHost;
  let junction: string | undefined;
  const rawLog: string[] = [];
  const consoleLines: string[] = [];
  const links: BridgeLink[] = [];
  const clients: BridgeClient[] = [];

  beforeEach(async () => {
    root = mkdtempSync(path.join(os.tmpdir(), "bridge-s4u-"));
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
    ext.releaseScreenshot();
    ext.close();
    await host.shutdown(1001);
    vi.restoreAllMocks();
    // The junction is removed by itself first: a recursive delete never crosses it (root CLAUDE.md gotcha).
    if (junction !== undefined) {
      try {
        unlinkSync(junction);
      } catch {
        rmSync(junction, { force: true });
      }
      junction = undefined;
    }
    rmSync(root, { recursive: true, force: true });
  });

  function sdkConnect(name: string): Promise<BridgeClient> {
    return connect({
      name,
      port,
      env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: daemonPath },
      io: { hashDaemon: async () => BUILD, spawnDaemon: async () => {} },
      failureReports: false,
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
          ...connectOptions(4402),
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
    registerTools(server, link, cursor, { actorName: "s4u-mcp" });
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })._registeredTools;
    return { link, run: (args: Record<string, unknown>) => tools.browser_upload_file.handler(args, {}) };
  }

  /** `<root>/<SENTINEL_DIR>/real/<SENTINEL_FILE>` and a junction `<root>/<SENTINEL_DIR>/via` → `real`. */
  function filesBehindAJunction(content: string) {
    const base = path.join(root, SENTINEL_DIR);
    const real = path.join(base, "real");
    mkdirSync(real, { recursive: true });
    writeFileSync(path.join(real, SENTINEL_FILE), content);
    junction = path.join(base, "via");
    symlinkSync(real, junction, "junction");
    return { given: path.join(junction, SENTINEL_FILE), real: path.join(real, SENTINEL_FILE) };
  }

  function allLogLines(): string[] {
    const file = existsSync(logFile) ? readFileSync(logFile, "utf8").split("\n") : [];
    return [...file, ...rawLog, ...consoleLines];
  }

  it("SDK and MCP: forwarded with a numeric tabId and the real paths, no tab key; nothing in any log", async () => {
    const content = "the bytes on disk\n";
    const sha = createHash("sha256").update(content).digest("hex");
    const { given, real } = filesBehindAJunction(content);
    const realPath = await realpath(real);

    // The SDK, on a tab of its own (newTab → id 200).
    const client = await sdkConnect("s4u-sdk");
    const tab = await client.newTab("http://localhost:8080/upload.html");
    const out = await tab.upload({ css: "#file" }, given);
    expect(out).toEqual({ files: [{ name: SENTINEL_FILE, bytes: Buffer.byteLength(content), sha256: sha }] });

    // The MCP, on its cursor (the human's tab, id 101, claimed on first touch).
    const actor = mcpActor();
    await waitUntil(() => actor.link.hasClient);
    const res = await actor.run({ ref: "e3", paths: [given] });
    expect(res.isError).toBeUndefined();
    const answer = res.content.map((c) => c.text ?? "").join("\n");
    expect(answer).toBe(`Uploaded 1 file(s) to e3:\n${SENTINEL_FILE} · ${Buffer.byteLength(content)} bytes · sha256 ${sha}`);
    expect(answer).not.toContain(SENTINEL_DIR);

    const uploads = ext.uploads();
    expect(uploads).toEqual([
      { locator: { css: "#file" }, paths: [realPath], tabId: 200 },
      { ref: "e3", paths: [realPath], tabId: 101 },
    ]);
    for (const u of uploads) {
      expect(u).not.toHaveProperty("tab");
      expect(typeof u.tabId).toBe("number");
      expect((u.paths as string[])[0]).not.toContain(`${path.sep}via${path.sep}`);
    }

    // 0.10: no path, folder or file name in the daemon's log file, its raw lines or the console.
    expect(rawLog.length).toBeGreaterThan(0);
    for (const line of allLogLines()) {
      expect(line).not.toContain(SENTINEL_DIR);
      expect(line).not.toContain(SENTINEL_FILE);
    }
  }, 30_000);

  it("lease-checked: another client's tab → TAB_HELD, nothing forwarded", async () => {
    const { given } = filesBehindAJunction("x");
    const owner = await sdkConnect("s4u-owner");
    const theirs = await owner.newTab("http://localhost:8080/upload.html");
    const other = await sdkConnect("s4u-other");
    const err = await other
      .call("uploadFiles", { tab: theirs.handle, ref: "e1", paths: [await realpath(given)] })
      .catch((e: { code?: string }) => e);
    expect(err).toMatchObject({ code: ErrorCodes.TAB_HELD });
    // The MCP on the same handle: the same refusal, still nothing forwarded.
    const actor = mcpActor();
    await waitUntil(() => actor.link.hasClient);
    await expect(actor.run({ ref: "e1", paths: [given], tab: theirs.handle })).rejects.toMatchObject({ code: ErrorCodes.TAB_HELD });
    expect(ext.uploads()).toEqual([]);
  }, 30_000);

  it("the visibility lock is never taken: an upload completes while another client's screenshot holds it", async () => {
    const { given } = filesBehindAJunction("lockless");
    const shooter = await sdkConnect("s4u-shooter");
    const shooterTab = await shooter.newTab("http://localhost:8080/a.html");
    const uploader = await sdkConnect("s4u-uploader");
    const uploaderTab = await uploader.newTab("http://localhost:8080/b.html");

    // A default-mode screenshot takes the lock; the fake extension does not answer it yet.
    const shot = shooterTab.screenshot();
    await waitUntil(() => ext.screenshotPending());

    // Control: a second lock-taking call queues behind it (it is not forwarded while the lock is held).
    const queued = uploader.call("screenshot", { tab: uploaderTab.handle });
    await new Promise((r) => setTimeout(r, 150));
    expect(ext.received.filter((r) => r.method === "screenshot")).toHaveLength(1);

    // The upload is forwarded and answered while the lock is still held.
    const out = await uploaderTab.upload("e1", given);
    expect(out.files).toHaveLength(1);
    expect(ext.screenshotPending()).toBe(true);
    expect(ext.uploads()).toHaveLength(1);

    ext.releaseScreenshot();
    await shot;
    await waitUntil(() => ext.screenshotPending());
    ext.releaseScreenshot();
    await queued;
  }, 30_000);
});

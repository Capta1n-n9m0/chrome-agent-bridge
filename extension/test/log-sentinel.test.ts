/**
 * Step 9 S2b — S2.3 as #141 words it, second half (phase doc 0.7's F28 note): drive the gate, the matcher,
 * the network ingest gate, the toggles (S2a's store with stubbed storage, write-failed and a failed arm
 * included), the badge and its press log line, the options page's model, and the daemon's safety relay (its
 * real `WsHost` over `ws` on port 0, with a fake proto:2 extension and a client) with a sentinel pattern, URL,
 * title and token; capture every `console.*` line and every line of the daemon's injected logger; assert none
 * contains any sentinel. The capture is checked to be live (the press lines and the daemon's safety line are
 * in it), so an empty capture cannot pass. Reserved names only (`.example`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../../daemon/src/bridge.js";
import { WsHost } from "../../daemon/src/wsHost.js";
import { parseBlockList, isUrlBlocked, urlHost } from "../src/safety-match.js";
import {
  METHOD_CLASSES,
  redactListTabsRow,
  redactTabCreated,
  redactTabRemoved,
  safetyDecisionAll,
  keepInQuery,
  type SafetyTarget,
} from "../src/safety.js";
import { SafetyStore, SafetyReporter, SAFETY_KEYS, reportOf } from "../src/safety-state.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { GatedRouter } from "../src/router.js";
import { NetworkIngestGate } from "../src/safety-network.js";
import { NetworkLog } from "../src/network-log.js";
import { BadgeController, type ActionApi } from "../src/badge.js";
import { analyzeBlockList, blockListAfterStoredChange, optionsStatus } from "../src/options-model.js";
import { BridgeError } from "../src/errors.js";

// ---------------------------------------------------------------- the sentinels
const PATTERN = "sentinel-pattern-q7.example";
const URL_ = "https://www.sentinel-pattern-q7.example/secret-path-Z9?k=SENTINELQ";
const OTHER_URL = "http://sentinel-allowed-w3.example/other-path-V5";
const TITLE = "Sentinel Title X4K2";
const TOKEN = "sentinel-token-R8M3-5f1e";
const INVALID_LINE = "sentinel-invalid-J6 !!";
/** Substrings any of which, in any case, betrays a sentinel. */
const NEEDLES = ["sentinel-pattern-q7", "secret-path-z9", "sentinelq", "sentinel-allowed-w3", "other-path-v5", "x4k2", "r8m3", "sentinel-invalid-j6"];
const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const LIST_TEXT = [PATTERN, `*.${PATTERN}:8443`, `https://${PATTERN}/login`, INVALID_LINE, "# a comment naming sentinel-pattern-q7.example"].join("\n");

// ---------------------------------------------------------------- the capture
const captured: string[] = [];
function show(v: unknown): string {
  if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack ?? ""}`;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
beforeEach(() => {
  captured.length = 0;
  for (const m of ["log", "info", "warn", "error", "debug", "trace"] as const) {
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => void captured.push(`console.${m}: ${args.map(show).join(" ")}`));
  }
});
afterEach(() => vi.restoreAllMocks());

function expectClean(lines: readonly string[]): void {
  for (const line of lines) {
    const low = line.toLowerCase();
    for (const n of NEEDLES) expect(low.includes(n), `a sentinel (${n}) in a log line: ${line.length} chars`).toBe(false);
  }
}

// ---------------------------------------------------------------- the extension side
const stored: Record<string, unknown> = {};
function store(o: { setFails?: () => boolean; now?: () => number } = {}): SafetyStore {
  return new SafetyStore({
    get: async () => ({ ...stored }),
    set: async (items) => {
      if (o.setFails?.()) throw new Error(`QUOTA_BYTES exceeded writing ${JSON.stringify(items)}`);
      Object.assign(stored, items);
    },
    extensionId: OWN_ID,
    now: o.now ?? Date.now,
    onDisarm: () => {},
    onArm: () => {},
  });
}

const fakeAction = (): ActionApi & { titles: string[] } => {
  const titles: string[] = [];
  return {
    titles,
    setBadgeText: () => undefined,
    setBadgeBackgroundColor: () => undefined,
    setTitle: (d: { title: string }) => void titles.push(d.title),
  };
};

describe("0.7 sentinel test — no pattern, URL, title or token in any captured log line", () => {
  it("extension: matcher, gate, redaction, network gate, toggles, badge, options model", async () => {
    for (const k of Object.keys(stored)) delete stored[k];
    stored[SAFETY_KEYS.blockList] = LIST_TEXT;

    // The matcher.
    const list = parseBlockList(LIST_TEXT);
    expect(list.blockedCount).toBe(3);
    expect(isUrlBlocked(URL_, list)).toBe(true);
    expect(isUrlBlocked(OTHER_URL, list)).toBe(false);
    expect(urlHost(URL_)?.host).toBe(`www.${PATTERN}`);

    // The gate, every method, armed/disarmed × JS on/off, a blocked, an allowed and a gone tab.
    const ctx = { extensionId: OWN_ID, blockList: list };
    const targets: SafetyTarget[] = [
      { kind: "live", urls: [URL_, undefined] },
      { kind: "live", urls: [OTHER_URL] },
      { kind: "replaced", urls: [URL_] },
      { kind: "gone", lastUrl: URL_ },
      { kind: "own", url: URL_ },
      { kind: "none" },
    ];
    let decisions = 0;
    for (const method of Object.keys(METHOD_CLASSES)) {
      for (const armed of [true, false]) {
        for (const evaluate of [true, false]) {
          for (const t of targets) {
            for (const phase of ["receipt", "effect", "post"] as const) {
              try {
                safetyDecisionAll(method, { url: URL_, title: TITLE }, [t], { armed, evaluate }, ctx, phase);
                decisions++;
              } catch {
                // a target form the class does not take: a wiring error by design
              }
            }
          }
        }
      }
    }
    expect(decisions).toBeGreaterThan(100);
    const row = { id: 3, windowId: 1, active: true, title: TITLE, url: URL_ };
    expect(redactListTabsRow(row, { armed: true, evaluate: true }, ctx)).not.toHaveProperty("title");
    redactTabCreated({ tabId: 3, url: URL_ }, { armed: false, evaluate: true }, ctx, [URL_]);
    redactTabRemoved({ tabId: 3, lastUrl: URL_, lastTitle: TITLE }, { armed: true, evaluate: true }, ctx);
    expect(keepInQuery({ url: OTHER_URL, initiator: URL_ }, URL_, ctx)).toBe(false);

    // The gated router over CallSafety: refused, allowed, a handler that throws with the URL, the post-check.
    let disarmed = false;
    const deps: CallSafetyDeps = {
      readState: async () => {
        const v = await store().read();
        return disarmed ? { ...v, switches: { ...v.switches, armed: false } } : v;
      },
      getTab: async (id) => {
        if (id === 1) return { url: URL_, title: TITLE } as chrome.tabs.Tab;
        if (id === 2) return { url: OTHER_URL, title: TITLE } as chrome.tabs.Tab;
        throw new Error(`No tab with id: ${id}.`);
      },
      replacedBy: () => undefined,
      lastUrl: (id) => (id === 9 ? URL_ : undefined),
    };
    const router = new GatedRouter((method, params) => new CallSafety(method, params, deps));
    router.on("snapshot", async () => ({ url: URL_, title: TITLE }));
    router.on("navigate", async (p) => {
      throw new BridgeError("NAV_FAILED", `could not open ${String(p.url)} (${TITLE})`);
    });
    router.on("listTabs", async (_p, call) => call.redactRows([{ row: { ...row, id: 1 } }, { row: { ...row, id: 2, url: OTHER_URL } }]));
    router.on("evaluate", async () => {
      disarmed = true; // the human disarms mid-call: the post-check refuses
      return { value: URL_ };
    });
    const replies = [
      await router.handle(JSON.stringify({ id: "a", method: "snapshot", params: { tabId: 1 } })),
      await router.handle(JSON.stringify({ id: "b", method: "snapshot", params: { tabId: 2 } })),
      await router.handle(JSON.stringify({ id: "c", method: "navigate", params: { tabId: 2, url: URL_ } })),
      await router.handle(JSON.stringify({ id: "d", method: "navigate", params: { tabId: 2, url: OTHER_URL } })),
      await router.handle(JSON.stringify({ id: "e", method: "listTabs", params: {} })),
      await router.handle(JSON.stringify({ id: "f", method: "evaluate", params: { tabId: 2, expression: URL_ } })),
      await router.handle(JSON.stringify({ id: "g", method: "snapshot", params: { tabId: 9 } })),
      await router.handle(JSON.stringify({ id: "h", method: `nope-${URL_}`, params: {} })),
    ];
    expect(replies.every((r) => typeof r === "string")).toBe(true);
    disarmed = false;

    // The network ingest gate and the log behind it.
    const netLog = new NetworkLog({ now: () => 1 });
    const gate = new NetworkIngestGate({
      ingest: (e, d) => netLog.ingest(e, d),
      discard: (id) => void netLog.discard(id),
      tabUrl: (id) => (id === 1 ? URL_ : OTHER_URL),
      view: () => ({ switches: { armed: true, evaluate: true }, ctx, blockedCount: list.blockedCount }),
    });
    const base = { method: "GET", type: "main_frame", timeStamp: 1 };
    gate.offer("onBeforeRequest", { ...base, requestId: "1", url: URL_, tabId: 1 });
    gate.offer("onBeforeRequest", { ...base, requestId: "2", url: OTHER_URL, tabId: 2, initiator: URL_ });
    gate.offer("onBeforeRequest", { ...base, requestId: "3", url: OTHER_URL, tabId: 2 });
    gate.offer("onCompleted", { ...base, requestId: "3", url: OTHER_URL, tabId: 2, statusCode: 200 });

    // The toggles (S2a's store) through the badge's press: disarm, an ignored re-arm, arm, write-failed, a failed arm.
    let now = 10_000;
    let failing = false;
    const s = store({ setFails: () => failing, now: () => now });
    const api = fakeAction();
    const badge = new BadgeController({ api, read: async () => (await s.read()).switches });
    await badge.refresh();
    expect(await badge.press(() => s.toggle())).toBe("disarmed");
    now += 100;
    expect(await badge.press(() => s.toggle())).toBe("ignored");
    now += 5_000;
    expect(await badge.press(() => s.toggle())).toBe("armed");
    failing = true;
    now += 5_000;
    expect(await badge.press(() => s.toggle())).toBe("write-failed");
    now += 5_000;
    expect(await badge.press(() => s.toggle())).toBe("arm-failed");
    failing = false;
    s.applyChanges({ [SAFETY_KEYS.blockList]: { newValue: `${LIST_TEXT}\n${OTHER_URL}` } });
    const reporter = new SafetyReporter();
    reporter.connectionUp();
    expect(reporter.offer(reportOf(await s.read()))).not.toContain("sentinel");
    expectClean(api.titles);

    // The options page's model.
    const a = analyzeBlockList(LIST_TEXT);
    expect(a.invalidCount).toBe(1);
    expectClean([a.summary]);
    optionsStatus({ armed: true, evaluate: false, blockList: LIST_TEXT });
    blockListAfterStoredChange({ current: LIST_TEXT, loaded: "", stored: PATTERN });

    // The capture is live: the five press lines are in it.
    expect(captured.filter((l) => l.startsWith("console.log: safety: "))).toEqual([
      "console.log: safety: disarmed by the user",
      "console.log: safety: re-arm ignored (within 1 s of a disarm)",
      "console.log: safety: armed by the user",
      "console.log: safety: disarm not saved (storage write failed)",
      "console.log: safety: arm failed (storage write failed)",
    ]);
    expectClean(captured);
  });

  it("daemon: the safety relay, redaction and the token gate over real ws (port 0)", async () => {
    const daemonLog: string[] = [];
    const host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: "sentinel-build", log: (m) => daemonLog.push(m), heartbeatMs: 60_000 });
    const port = await host.listen();
    const sockets: WebSocket[] = [];
    const open = (): Promise<{ ws: WebSocket; frames: Record<string, unknown>[] }> =>
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        sockets.push(ws);
        const frames: Record<string, unknown>[] = [];
        ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
        ws.on("open", () => resolve({ ws, frames }));
        ws.on("error", reject);
      });
    const until = async (pred: () => boolean, ms = 3000) => {
      const t0 = Date.now();
      while (!pred()) {
        if (Date.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 5));
      }
    };
    try {
      // A wrong token, then the fake extension.
      const bad = await open();
      bad.ws.send(JSON.stringify({ type: "hello", token: `${TOKEN}-wrong`, role: "client", name: `n ${URL_}`, proto: 2 }));
      await until(() => bad.ws.readyState === WebSocket.CLOSED || bad.frames.length > 0);

      const ext = await open();
      let rows: Record<string, unknown>[] = [
        { id: 1, windowId: 1, active: true, current: true, title: TITLE, url: URL_ },
        { id: 2, windowId: 1, active: false, title: TITLE, url: OTHER_URL },
      ];
      ext.ws.on("message", (raw) => {
        const f = JSON.parse(raw.toString()) as { id?: string; method?: string; params?: Record<string, unknown> };
        if (typeof f.id !== "string" || typeof f.method !== "string") return;
        if (f.method === "listTabs") ext.ws.send(JSON.stringify({ id: f.id, result: { tabs: rows } }));
        else if (f.method === "snapshot") ext.ws.send(JSON.stringify({ id: f.id, error: { code: "DOMAIN_BLOCKED", message: `blocked ${URL_} ${TITLE}` } }));
        else ext.ws.send(JSON.stringify({ id: f.id, result: { url: URL_, title: TITLE } }));
      });
      ext.ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2, session: "sess-1" }));
      await until(() => ext.frames.some((f) => f.type === "welcome"));

      const client = await open();
      client.ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "client", name: "sentinel-client", proto: 2 }));
      await until(() => client.frames.some((f) => f.type === "welcome"));
      let seq = 0;
      const call = async (method: string, params?: Record<string, unknown>) => {
        const id = `c${++seq}`;
        client.ws.send(JSON.stringify({ id, method, params }));
        await until(() => client.frames.some((f) => f.id === id));
        return client.frames.find((f) => f.id === id)!;
      };

      const listed = (await call("listTabs")).result as { tabs: Array<{ tab: string }> };
      const t1 = listed.tabs[0]!.tab;
      await call("tabs.claim", { tab: t1 });
      await call("snapshot", { tab: t1 });
      await call("daemon.status");

      // The safety relay: a state with an extra key carrying a pattern, a malformed one, a change.
      ext.ws.send(JSON.stringify({ event: "safetyState", params: { armed: true, evaluate: true, blockedCount: 3, patterns: [PATTERN] } }));
      ext.ws.send(JSON.stringify({ event: "safetyState", params: { armed: "yes", url: URL_ } }));
      await until(() => client.frames.some((f) => f.event === "safetyStatus"));
      rows = [{ id: 1, windowId: 1, active: true, current: true, hidden: "disarmed" }, { id: 2, windowId: 1, active: false, hidden: "disarmed" }];
      ext.ws.send(JSON.stringify({ event: "safetyState", params: { armed: false, evaluate: true, blockedCount: 3 } }));
      await until(() => client.frames.filter((f) => f.event === "safetyStatus").length >= 2);
      ext.ws.send(JSON.stringify({ event: "tabCreated", params: { tabId: 5, url: URL_ } }));
      ext.ws.send(JSON.stringify({ event: "tabRemoved", params: { tabId: 1, lastUrl: URL_, lastTitle: TITLE } }));
      await new Promise((r) => setTimeout(r, 80));
      await call("daemon.status");

      // The capture is live: the daemon logged its safety lines.
      expect(daemonLog.some((l) => l.startsWith("safety state: armed=true evaluate=true blocked=3"))).toBe(true);
      expect(daemonLog).toContain("safety state: malformed event dropped");
      expectClean(daemonLog);
      expectClean(captured);
    } finally {
      for (const ws of sockets) ws.terminate();
      await host.close();
    }
  });
});

// ---------------------------------------------------------------- Step 10 S4.5: a sentinel value and path
// The save path end to end — the extension's CDP leg (the shipped page functions over a fake CDP), the store and
// the three handlers (a stubbed `chrome`), then the real daemon (`WsHost` on port 0, its injected logger and a real
// file logger) with a fake proto:2 extension serving the three methods, and the SDK's `Tab.evaluateToFile` writing
// to a sentinel path. No captured line may carry the value, a run of it, the expression or the path.
const SAVE_VALUE = "sentinel-value-V3Q8-" + "é€".repeat(40) + "-tail-H6";
const SAVE_EXPR = "return 'sentinel-expr-E2N4'";
const SAVE_NEEDLES = ["sentinel-value-v3q8", "-tail-h6", "é€é€é€", "sentinel-expr-e2n4", "sentinel-path-p5w2"];

function expectSaveClean(lines: readonly string[]): void {
  for (const line of lines) {
    const low = line.toLowerCase();
    for (const n of SAVE_NEEDLES) expect(low.includes(n), `a save sentinel (${n}) in a log line: ${line.length} chars`).toBe(false);
  }
}

describe("S4.5 sentinel test — no saveTo value, expression or path in any captured log line", () => {
  it("extension: the CDP leg, the store and the handlers", async () => {
    const { FakeCdp } = await import("./s4-fake-cdp.js");
    const { collectSaveText } = await import("../src/evaluate/save.js");
    const { EvaluateSaveStore } = await import("../src/evaluate-save-store.js");
    const handlers = await import("../src/handlers/evaluate-save.js");

    const cdp = new FakeCdp(() => Promise.resolve(SAVE_VALUE));
    expect((await collectSaveText(SAVE_EXPR, 1000, { send: cdp.send, sliceUnits: 7 })).text).toBe(SAVE_VALUE);
    const cyc: Record<string, unknown> = { k: SAVE_VALUE };
    cyc.self = cyc;
    await collectSaveText(SAVE_EXPR, 1000, { send: new FakeCdp(() => cyc).send }).catch(() => {});
    const s = new EvaluateSaveStore();
    const id = s.put(1, new TextEncoder().encode(SAVE_VALUE), "string");
    s.chunk(id, 1, 0, 5);
    try {
      s.chunk(id, 2, 0, 5);
    } catch {
      // another tab: refused
    }

    vi.stubGlobal("chrome", {
      tabs: { get: async (tabId: number) => ({ id: tabId, url: OTHER_URL, discarded: false }) },
      debugger: { attach: async () => {}, detach: async () => {}, sendCommand: async (_t: unknown, m: string, p: Record<string, unknown>) => cdp.send(m, p) },
    });
    try {
      const start = await handlers.evaluateSaveStart({ tabId: 4, expression: SAVE_EXPR });
      await handlers.evaluateSaveChunk({ tabId: 4, id: start.id, offset: 0 });
      await handlers.evaluateSaveChunk({ tabId: 5, id: start.id, offset: 0 }).catch(() => {});
      await handlers.evaluateSaveEnd({ tabId: 4, id: start.id });
      cdp.completion = () => undefined;
      await handlers.evaluateSaveStart({ tabId: 4, expression: SAVE_EXPR }).catch(() => {});
    } finally {
      handlers.clearEvaluateSaves();
      vi.unstubAllGlobals();
    }
    expectSaveClean(captured);
  });

  it("daemon + SDK over real ws (port 0): the value crosses, nothing of it, the expression or the path is logged", async () => {
    const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { createFileLogger } = await import("../../daemon/src/log.js");
    const { connect } = await import("../../sdk/src/connect.js");

    const root = mkdtempSync(path.join(os.tmpdir(), "bridge-s45-"));
    const dir = path.join(root, "sentinel-path-P5W2");
    mkdirSync(dir);
    writeFileSync(path.join(root, "daemon.js"), "// not run: the daemon is in process");
    const logFile = path.join(root, "daemon.log");
    const fileLogger = createFileLogger({ path: logFile });
    fileLogger.setSecret(TOKEN);
    const daemonLog: string[] = [];
    const host = new WsHost(new Bridge(), {
      port: 0,
      token: TOKEN,
      build: "sentinel-build",
      heartbeatMs: 60_000,
      log: (m) => {
        daemonLog.push(m);
        fileLogger.log(m);
      },
    });
    const port = await host.listen();
    const bytes = Buffer.from(new TextEncoder().encode(SAVE_VALUE));
    const ext = new WebSocket(`ws://127.0.0.1:${port}`);
    let client: { close(): void } | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        ext.on("message", (raw) => {
          const f = JSON.parse(raw.toString()) as { type?: string; id?: string; method?: string; params?: Record<string, unknown> };
          if (f.type === "welcome") return resolve();
          if (typeof f.id !== "string" || typeof f.method !== "string") return;
          const p = f.params ?? {};
          let result: unknown = { ok: true };
          if (f.method === "listTabs") result = { tabs: [{ id: 1, windowId: 1, active: true, current: true, title: TITLE, url: OTHER_URL }] };
          if (f.method === "newTab") result = { id: 2 };
          if (f.method === "evaluateSaveStart") result = { id: "es1-s", bytes: bytes.length, kind: "string" };
          if (f.method === "evaluateSaveChunk") result = { data: bytes.subarray(Number(p.offset), Number(p.offset) + Number(p.length)).toString("base64") };
          if (f.method === "evaluateSaveEnd") result = { released: true };
          ext.send(JSON.stringify({ id: f.id, result }));
        });
        ext.on("open", () => ext.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2, session: "s45" })));
        ext.on("error", reject);
      });
      const c = await connect({
        name: "sentinel-s45",
        port,
        env: { BRIDGE_TOKEN: TOKEN, BRIDGE_DAEMON: path.join(root, "daemon.js") },
        io: { hashDaemon: async () => "sentinel-build", spawnDaemon: async () => {} },
      });
      client = c;
      const tab = await c.newTab();
      const target = path.join(dir, "sentinel-path-P5W2.txt");
      const out = await tab.evaluateToFile(SAVE_EXPR, { path: target });
      expect(readFileSync(target).equals(bytes)).toBe(true);
      expect(JSON.stringify(out)).not.toContain("sentinel-value");
      // Refused before any call: the path is named only in the thrown message, never in a log.
      await tab.evaluateToFile(SAVE_EXPR, { path: target }).catch(() => {});

      expect(daemonLog.length).toBeGreaterThan(0); // the capture is live
      const fileLines = readFileSync(logFile, "utf8").split("\n");
      expect(fileLines.length).toBeGreaterThan(1);
      expectSaveClean(daemonLog);
      expectSaveClean(fileLines);
      expectSaveClean(captured);
      expectClean(daemonLog);
    } finally {
      client?.close();
      ext.terminate();
      await host.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------- Step 11 S2: a sentinel upload folder and path
// Phase doc 0.10 (decisions.md · 2026-10-25 · Step 11: nothing logs an upload path, and the rest of the safety
// boundary is unchanged (#242)), exit check S2.5: the matcher, the folder rule, the stored key, the file: rule (#245
// (a)) through the gated router, and the daemon forwarding `uploadFiles` over real ws — no captured line may carry
// the sentinel folder, file name or a file: URL naming them.
const UP_FOLDER_WIN = String.raw`C:\Wave\sentinel-folder-U7K3`;
const UP_FOLDER_POSIX = "/srv/sentinel-folder-u7k3-posix";
const UP_FILE_IN = String.raw`C:\Wave\sentinel-folder-U7K3\sentinel-file-F4M8.txt`;
const UP_FILE_OUT = String.raw`C:\Wave\Other\sentinel-file-F4M8.txt`;
const UP_FILE_URL = "file:///C:/Wave/sentinel-folder-U7K3/sentinel-file-F4M8.txt";
const UP_NEEDLES = ["sentinel-folder-u7k3", "sentinel-file-f4m8", "wave\\other", "c:\\wave", "c:/wave"];

function expectUploadClean(lines: readonly string[]): void {
  for (const line of lines) {
    const low = line.toLowerCase();
    for (const n of UP_NEEDLES) expect(low.includes(n), `an upload sentinel (${n}) in a log line: ${line.length} chars`).toBe(false);
  }
}

describe("Step 11 S2.5 sentinel test — no upload path, folder or file name in any captured log line", () => {
  it("extension: matcher, folder rule, stored key, file: rule through the gated router", async () => {
    const { parseUploadFolders, uploadPathsAllowed, uploadPathRefusalClass } = await import("../src/upload-paths.js");
    const { uploadRefusal } = await import("../src/safety.js");
    for (const k of Object.keys(stored)) delete stored[k];
    const foldersText = [UP_FOLDER_WIN, UP_FOLDER_POSIX, "sentinel-folder-u7k3-relative", "# sentinel-folder-u7k3 comment"].join("\n");
    stored[SAFETY_KEYS.uploadFolders] = foldersText;

    const folders = parseUploadFolders(foldersText);
    expect(folders.count).toBe(2);
    expect(uploadPathsAllowed([UP_FILE_IN], folders)).toBe(true);
    expect(uploadPathsAllowed([UP_FILE_OUT], folders)).toBe(false);
    for (const p of [UP_FILE_IN, UP_FILE_OUT, `${UP_FILE_IN}:ads`, String.raw`\\srv\sentinel-folder-U7K3\x`, ""]) uploadPathRefusalClass(p);

    const s = store();
    const view = await s.read();
    expect(uploadRefusal({ paths: [UP_FILE_IN] }, view.ctx)).toBeNull();
    const refused = uploadRefusal({ paths: [UP_FILE_OUT, 5] }, view.ctx)!;
    expect(refused.code).toBe("UPLOAD_REFUSED");
    expectUploadClean([refused.message]);
    s.applyChanges({ [SAFETY_KEYS.uploadFolders]: { newValue: `${foldersText}\n${UP_FILE_OUT}` } });
    s.applyChanges({ [SAFETY_KEYS.uploadFolders]: { newValue: 7 } }); // wrong-typed: fails closed
    stored[SAFETY_KEYS.uploadFolders] = 7;
    await s.read().catch(() => {});
    stored[SAFETY_KEYS.uploadFolders] = foldersText;

    // The file: rule (#245 (a)) through the gated router: a file: tab and a navigate to a file: URL.
    const deps: CallSafetyDeps = {
      readState: () => store().read(),
      getTab: async (id) => ({ url: id === 1 ? UP_FILE_URL : OTHER_URL }),
      replacedBy: () => undefined,
      lastUrl: () => UP_FILE_URL,
    };
    const router = new GatedRouter((method, params) => new CallSafety(method, params, deps));
    router.on("snapshot", async () => ({ url: UP_FILE_URL }));
    router.on("navigate", async () => ({ url: UP_FILE_URL }));
    const replies = [
      await router.handle(JSON.stringify({ id: "a", method: "snapshot", params: { tabId: 1 } })),
      await router.handle(JSON.stringify({ id: "b", method: "navigate", params: { tabId: 2, url: UP_FILE_URL } })),
      await router.handle(JSON.stringify({ id: "c", method: "navigate", params: { tabId: 2, url: ` FILE:${UP_FILE_IN}` } })),
      await router.handle(JSON.stringify({ id: "d", method: "uploadFiles", params: { tabId: 2, ref: "e1", paths: [UP_FILE_IN] } })),
    ];
    for (const r of replies.slice(0, 3)) expect(JSON.parse(r!).error.code).toBe("DOMAIN_BLOCKED");
    expectUploadClean(replies.slice(0, 3) as string[]);

    // The capture is live: one press line.
    const api = fakeAction();
    const badge = new BadgeController({ api, read: async () => (await s.read()).switches });
    await badge.press(() => s.toggle());
    expect(captured.some((l) => l.startsWith("console.log: safety: "))).toBe(true);
    expectUploadClean(captured);
    expectClean(captured);
  });

  it("daemon: uploadFiles forwarded over real ws (port 0) with sentinel paths; refused and answered; nothing logged", async () => {
    const daemonLog: string[] = [];
    const host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: "sentinel-build", log: (m) => daemonLog.push(m), heartbeatMs: 60_000 });
    const port = await host.listen();
    const sockets: WebSocket[] = [];
    const open = (): Promise<{ ws: WebSocket; frames: Record<string, unknown>[] }> =>
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        sockets.push(ws);
        const frames: Record<string, unknown>[] = [];
        ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
        ws.on("open", () => resolve({ ws, frames }));
        ws.on("error", reject);
      });
    const until = async (pred: () => boolean, ms = 3000) => {
      const t0 = Date.now();
      while (!pred()) {
        if (Date.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 5));
      }
    };
    try {
      const ext = await open();
      const seen: Record<string, unknown>[] = [];
      ext.ws.on("message", (raw) => {
        const f = JSON.parse(raw.toString()) as { id?: string; method?: string; params?: Record<string, unknown> };
        if (typeof f.id !== "string" || typeof f.method !== "string") return;
        if (f.method === "listTabs") ext.ws.send(JSON.stringify({ id: f.id, result: { tabs: [{ id: 1, windowId: 1, active: true, current: true, title: TITLE, url: UP_FILE_URL }] } }));
        else if (f.method === "newTab") ext.ws.send(JSON.stringify({ id: f.id, result: { id: 2 } }));
        else if (f.method === "uploadFiles") {
          seen.push(f.params ?? {});
          const n = seen.length;
          if (n === 1) ext.ws.send(JSON.stringify({ id: f.id, result: { files: 1 } }));
          else ext.ws.send(JSON.stringify({ id: f.id, error: { code: "UPLOAD_REFUSED", message: `refused ${UP_FILE_OUT}` } }));
        } else ext.ws.send(JSON.stringify({ id: f.id, result: { ok: true } }));
      });
      ext.ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2, session: "s2-up" }));
      await until(() => ext.frames.some((f) => f.type === "welcome"));
      const client = await open();
      client.ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "client", name: "sentinel-s2", proto: 2 }));
      await until(() => client.frames.some((f) => f.type === "welcome"));
      let seq = 0;
      const call = async (method: string, params?: Record<string, unknown>) => {
        const id = `u${++seq}`;
        client.ws.send(JSON.stringify({ id, method, params }));
        await until(() => client.frames.some((f) => f.id === id));
        return client.frames.find((f) => f.id === id)!;
      };
      const t = (await call("newTab", { url: UP_FILE_URL })).result as { tab: string };
      expect((await call("uploadFiles", { tab: t.tab, ref: "e1", paths: [UP_FILE_IN] })).result).toEqual({ files: 1 });
      expect(((await call("uploadFiles", { tab: t.tab, ref: "e1", paths: [UP_FILE_OUT] })).error as { code: string }).code).toBe("UPLOAD_REFUSED");
      await call("uploadFiles", { ref: "e1", paths: [UP_FILE_IN] }); // no tab: BAD_PARAMS
      await call("uploadFiles", { tab: "T999", ref: "e1", paths: [UP_FILE_IN] }); // unknown handle
      await call("daemon.status");
      expect(seen.map((p) => p.paths)).toEqual([[UP_FILE_IN], [UP_FILE_OUT]]);

      expect(daemonLog.length).toBeGreaterThan(0); // the capture is live
      expectUploadClean(daemonLog);
      expectUploadClean(captured);
      expectClean(daemonLog);
    } finally {
      for (const ws of sockets) ws.terminate();
      await host.close();
    }
  });
});

// ---------------------------------------------------------------- Step 11b S0F-b: the missing-file probe
// Exit check F.1 (phase doc `docs/plans/2026-10-26-step11b-block-list-redirects.md`): the probe of a sentinel path, on
// every outcome, logs nothing, and no refusal names the path, a segment or its file: URL.
describe("Step 11b S0F-b sentinel test — the missing-file probe names no path and logs nothing", () => {
  it("every outcome over a sentinel path: refusals clean, no captured line", async () => {
    const { checkUploadFilesExist } = await import("../src/upload-exists.js");
    const fetches: Record<string, () => Promise<unknown>> = {
      file: async () => ({ status: 200, body: null }),
      missing: async () => Promise.reject(new TypeError(`Failed to fetch ${UP_FILE_URL}`)),
      folder: async () => ({ status: 0, body: null }),
      other: async () => ({ status: 404, body: null }),
      abort: async () => Promise.reject(new DOMException(UP_FILE_URL, "AbortError")),
    };
    const messages: string[] = [];
    let seenUrls = 0;
    for (const [name, f] of Object.entries(fetches)) {
      try {
        await checkUploadFilesExist([UP_FILE_IN, UP_FILE_IN], (url) => (seenUrls += url === UP_FILE_URL ? 1 : 0, f()));
        expect(name).toBe("file");
      } catch (e) {
        messages.push((e as Error).message);
      }
    }
    expect(seenUrls).toBe(6); // the probe really ran on the sentinel's file: URL (2 for "file", 1 for each other)
    expect(messages).toHaveLength(4);
    expectUploadClean(messages);
    for (const m of messages) expect(m).not.toMatch(/file:|[\\]/);
    expect(captured).toEqual([]); // the probe has no log site
    console.log("sentinel-capture-live");
    expect(captured).toHaveLength(1); // the capture is live, so the empty check above is not vacuous
  });
});

describe("Step 12 S2a sentinel test — no args value in any captured log line", () => {
  it("extension: evaluate and evaluateSaveStart with args — success, the deadline stop, every refusal", async () => {
    const ARGS_SENT = "sentinel-args-value-T5W8";
    const { EngineCdp } = await import("./s12-engine-cdp.js");
    const { evaluate } = await import("../src/handlers/evaluate.js");
    const saves = await import("../src/handlers/evaluate-save.js");
    const cdp = new EngineCdp();
    let listeners: Array<(s: { tabId?: number }, m: string, p?: object) => void> = [];
    cdp.override["Debugger.pause"] = () => {
      queueMicrotask(() => listeners.forEach((l) => l({ tabId: 4 }, "Debugger.paused", { callFrames: [{ location: { scriptId: "fn-script-1", url: ARGS_SENT } }] })));
      return {};
    };
    vi.stubGlobal("chrome", {
      tabs: { get: async (tabId: number) => ({ id: tabId, url: OTHER_URL, discarded: false }) },
      debugger: {
        attach: async () => {},
        detach: async () => {},
        sendCommand: async (_t: unknown, m: string, p: Record<string, unknown>) => cdp.send(m, p),
        onEvent: { addListener: (l: (typeof listeners)[number]) => void listeners.push(l), removeListener: (l: (typeof listeners)[number]) => void (listeners = listeners.filter((x) => x !== l)) },
      },
    });
    const args = { s: ARGS_SENT, n: null };
    try {
      expect(await evaluate({ tabId: 4, expression: "(a) => a.s", args })).toMatchObject({ value: ARGS_SENT });
      await evaluate({ tabId: 4, expression: "(a) => { throw new Error(a.s); }", args }).catch(() => {});
      await evaluate({ tabId: 4, expression: "42", args }).catch(() => {});
      await evaluate({ tabId: 4, expression: "(a) => a", args: { s: ARGS_SENT.repeat(50_000) } }).catch(() => {});
      await evaluate({ tabId: 4, expression: "(a) => a", args: { s: ARGS_SENT, f: () => ARGS_SENT } }).catch(() => {});
      const start = await saves.evaluateSaveStart({ tabId: 4, expression: "(a) => a", args });
      await saves.evaluateSaveChunk({ tabId: 4, id: start.id, offset: 0 });
      cdp.override["Runtime.callFunctionOn"] = (p) => (String(p.functionDeclaration).includes("JSON.parse(json)") ? new Promise(() => {}) : undefined);
      const { evaluateFunctionInPage } = await import("../src/debugger.js");
      const { DEFAULT_LIMITS } = await import("../src/evaluate/serialize.js");
      await evaluateFunctionInPage(4, "(a) => { while (true) {} }", JSON.stringify(args), 50, DEFAULT_LIMITS).catch(() => {});
      expect(cdp.calls.some((c) => c.method === "Debugger.resume")).toBe(true); // the stop path ran
    } finally {
      saves.clearEvaluateSaves();
      vi.unstubAllGlobals();
    }
    expect(captured.some((l) => l.includes("[bridge] evaluate"))).toBe(true); // the capture is live
    for (const line of captured) expect(line.toLowerCase().includes(ARGS_SENT.toLowerCase()), `an args sentinel in a log line: ${line.length} chars`).toBe(false);
  });
});

/**
 * Step 12 S3a, C3.2 and C3.4's extension half (phase doc 0.5, 0.10 with the Stage 0 note; decisions.md #327, #333,
 * #334): the real `consoleMessages` handler behind `GatedRouter` with a fake `chrome`. Refused disarmed, JavaScript
 * off, on a blocked, own and `file:` page with attach and CDP counters at 0; allowed, it sends exactly
 * `Runtime.enable`/`Runtime.disable` in one session, drops blocked and own-extension sources before stripping, and a
 * console sentinel reaches the reply but no extension log.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { GatedRouter } from "../src/router.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { DISARMED_ALL_MESSAGE, FILE_PAGE_MESSAGE, JS_DISABLED_MESSAGE, OWN_PAGE_MESSAGE, BLOCKED_TAB_MESSAGE } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import type { SafetyView } from "../src/safety-state.js";
import { consoleMessages } from "../src/handlers/console.js";
import { consoleCollectors } from "../src/console-messages.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ALLOWED = "http://localhost:8080/e2e-playground.html";
const SENT = "SENTINEL-CONSOLE-Z7";

let n: { attach: number; detach: number; send: string[] };
let tabUrl: string;
let logged: string[];

function emitReplay(tabId: number): void {
  const ts = Date.now() + 60_000;
  const feed = (method: string, params: unknown) => consoleCollectors.feed({ tabId }, method, params);
  feed("Runtime.executionContextCreated", { context: { id: 1, origin: "http://localhost:8080" } });
  feed("Runtime.consoleAPICalled", { type: "log", args: [{ type: "string", value: SENT }], executionContextId: 1, timestamp: ts, stackTrace: { callFrames: [{ url: ALLOWED }] } });
  feed("Runtime.consoleAPICalled", { type: "log", args: [{ type: "string", value: "from-blocked" }], executionContextId: 1, timestamp: ts + 1, stackTrace: { callFrames: [{ url: "https://cdn.bank.example/x.js" }] } });
  feed("Runtime.consoleAPICalled", { type: "log", args: [{ type: "string", value: "from-own" }], executionContextId: 1, timestamp: ts + 2, stackTrace: { callFrames: [{ url: `chrome-extension://${OWN_ID}/content.js` }] } });
  // M-3 (M7): a `file:` frame's message; M-2 (M9): one timestamped before the worker's arm floor.
  feed("Runtime.consoleAPICalled", { type: "log", args: [{ type: "string", value: "from-file" }], executionContextId: 1, timestamp: ts + 4, stackTrace: { callFrames: [{ url: "file:///C:/fixtures/a.js" }] } });
  feed("Runtime.consoleAPICalled", { type: "log", args: [{ type: "string", value: "from-before-arm" }], executionContextId: 1, timestamp: 1, stackTrace: { callFrames: [{ url: ALLOWED }] } });
  feed("Runtime.exceptionThrown", { timestamp: ts + 3, exceptionDetails: { exceptionId: 1, text: "Uncaught", url: ALLOWED, executionContextId: 1, exception: { type: "object", subtype: "error", description: `Error: ${SENT}-E\n    at f (${ALLOWED}:1:1)` } } });
}

beforeEach(() => {
  n = { attach: 0, detach: 0, send: [] };
  tabUrl = ALLOWED;
  logged = [];
  vi.stubGlobal("chrome", {
    runtime: { id: OWN_ID },
    tabs: { get: vi.fn(async (id: number) => ({ id, url: tabUrl, discarded: false })) },
    debugger: {
      attach: vi.fn(async () => void n.attach++),
      detach: vi.fn(async () => void n.detach++),
      sendCommand: vi.fn(async (t: { tabId: number }, method: string) => {
        n.send.push(method);
        if (method === "Runtime.enable") emitReplay(t.tabId);
        return {};
      }),
    },
  });
  for (const k of ["log", "warn", "error", "info", "debug"] as const) {
    vi.spyOn(console, k).mockImplementation((...a: unknown[]) => void logged.push(a.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function view(o: { armed?: boolean; evaluate?: boolean; list?: string } = {}): SafetyView {
  const blockList = o.list ? parseBlockList(o.list) : EMPTY_BLOCK_LIST;
  return { switches: { armed: o.armed ?? true, evaluate: o.evaluate ?? true }, ctx: { extensionId: OWN_ID, blockList }, blockedCount: blockList.blockedCount };
}

function wire(state: () => SafetyView) {
  const deps: CallSafetyDeps = {
    readState: async () => state(),
    getTab: async () => ({ url: tabUrl }),
    replacedBy: () => undefined,
    lastUrl: () => tabUrl,
  };
  const router = new GatedRouter((method, p) => new CallSafety(method, p, deps));
  router.on("consoleMessages", consoleMessages);
  return async (params: Record<string, unknown> = { tabId: 7 }) =>
    JSON.parse((await router.handle(JSON.stringify({ id: "1", method: "consoleMessages", params })))!) as { error?: unknown; result?: { entries: Array<{ text: string }> } };
}

describe("C3.2 — refused through GatedRouter, nothing attached or sent", () => {
  const cases: Array<[string, () => SafetyView, string, unknown]> = [
    ["disarmed", () => view({ armed: false }), ALLOWED, { code: ErrorCodes.DISARMED, message: DISARMED_ALL_MESSAGE, data: { scope: "all" } }],
    ["JavaScript off (class evaluate, #334)", () => view({ evaluate: false }), ALLOWED, { code: ErrorCodes.JS_DISABLED, message: JS_DISABLED_MESSAGE }],
    ["a blocked page", () => view({ list: "localhost" }), ALLOWED, { code: ErrorCodes.DOMAIN_BLOCKED, message: BLOCKED_TAB_MESSAGE }],
    ["an own page", () => view(), `chrome-extension://${OWN_ID}/options.html`, { code: ErrorCodes.DOMAIN_BLOCKED, message: OWN_PAGE_MESSAGE }],
    ["a file: page", () => view(), "file:///C:/fixtures/page.html", { code: ErrorCodes.DOMAIN_BLOCKED, message: FILE_PAGE_MESSAGE }],
  ];
  for (const [name, state, url, want] of cases) {
    it(name, async () => {
      tabUrl = url;
      const r = await wire(state)();
      expect(r.error).toMatchObject(want as object);
      expect(r.result).toBeUndefined();
      expect(n).toEqual({ attach: 0, detach: 0, send: [] });
    });
  }

  it("bad params: BAD_PARAMS before any attach", async () => {
    const r = await wire(() => view())({ tabId: 7, limit: 0 });
    expect(r.error).toMatchObject({ code: ErrorCodes.BAD_PARAMS });
    expect(n.attach).toBe(0);
  });

  it("the handler refuses to run outside the gate", async () => {
    await expect(consoleMessages({ tabId: 7 })).rejects.toMatchObject({ code: ErrorCodes.INTERNAL });
    expect(n.attach).toBe(0);
  });
});

describe("allowed — one session, enable/disable only, the source filter, no log of the text", () => {
  it("answers the entries; blocked and own-extension sources dropped; no stack; the sentinel in no extension log", async () => {
    const r = await wire(() => view({ list: "bank.example" }))();
    expect(r.result!.entries.map((e) => e.text)).toEqual([SENT, `Uncaught Error: ${SENT}-E`]);
    expect(JSON.stringify(r.result)).not.toMatch(/https?:|chrome-extension:|file:|from-blocked|from-own|from-file|from-before-arm/);
    expect(n.attach).toBe(1);
    expect(n.detach).toBe(1);
    expect(n.send).toEqual(["Runtime.enable", "Runtime.disable"]);
    expect(consoleCollectors.size).toBe(0);
    expect(logged.join("\n")).not.toContain(SENT);
  });

  it("level and limit pass through", async () => {
    const r = await wire(() => view())({ tabId: 7, level: "error", limit: 1 });
    expect(r.result!.entries).toEqual([expect.objectContaining({ kind: "exception", level: "error" })]);
  });
});

describe("M-3 — the effect check before the attach, and the 10 s bound", () => {
  it("a state that refuses at the effect phase (disarmed after receipt): DISARMED, nothing attached or sent", async () => {
    let reads = 0;
    const r = await wire(() => view({ armed: ++reads === 1 }))();
    expect(reads).toBeGreaterThanOrEqual(2);
    expect(r.error).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(n).toEqual({ attach: 0, detach: 0, send: [] });
  });

  it("a Runtime.enable that never answers: TIMEOUT at 10 s, then detach, the collector closed", async () => {
    vi.useFakeTimers();
    try {
      let rejectEnable: ((e: Error) => void) | undefined;
      const dbg = (chrome as unknown as { debugger: Record<string, ReturnType<typeof vi.fn>> }).debugger;
      dbg.sendCommand!.mockImplementation((_t: unknown, method: string) => {
        n.send.push(method);
        if (method === "Runtime.enable") return new Promise((_, rej) => (rejectEnable = rej));
        return Promise.resolve({});
      });
      // Chrome rejects a pending command when the session detaches.
      dbg.detach!.mockImplementation(async () => {
        n.detach++;
        rejectEnable?.(new Error("Detached while handling command."));
      });
      let settled: { error?: { code?: string } } | undefined;
      void wire(() => view())().then((r) => (settled = r as { error?: { code?: string } }));
      await vi.advanceTimersByTimeAsync(9_999);
      expect(settled).toBeUndefined();
      await vi.advanceTimersByTimeAsync(2);
      await vi.advanceTimersByTimeAsync(50); // not runOnlyPendingTimers: it would fire any longer bound too
      expect(settled?.error).toMatchObject({ code: ErrorCodes.TIMEOUT });
      expect(n.attach).toBe(1);
      expect(n.detach).toBe(1);
      expect(consoleCollectors.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

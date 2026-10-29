// @vitest-environment jsdom
/**
 * Step 12 S5a — `uploadFiles {chooser: true}`, the extension side (phase doc `docs/plans/2026-10-27-step12-phase-f.md`
 * 0.7, 0.10 with its Stage 0 note; decisions.md #325, #336; spec §10's Step 12 S5a note; exit checks E5.1–E5.3 with
 * E5.2 as rewritten in `…-steps/stage0-audit.md` §5):
 * - E5.1: the chooser's CDP step list, and the interception off (and `Page.disable`) on every path, counted by a fake;
 * - E5.2: one shared prologue — the same gate and prologue tests run for both paths (`describe.each`); the chooser's
 *   own input rules (the event's `mode`, `backendNodeId`, `webkitdirectory`, `disabled`) separately;
 * - the no-chooser `TIMEOUT`; a refusal after the click ends the chooser (off + the use's error → detach), never
 *   `files: []`; one chooser call per tab; `JS_DISABLED` through `GatedRouter` with a CDP counter at 0;
 * - E5.3: no path in a message, no log call.
 * Fixture-like paths under a reserved folder only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import "../src/content/index.js";
import { BridgeError, toWireError } from "../src/errors.js";
import { debuggerSessions } from "../src/debugger.js";
import { DISARMED_ALL } from "../src/safety-state.js";
import {
  CHOOSER_CLICK_SRC,
  CHOOSER_MARK_PAGE_FN,
  CHOOSER_NO_INPUT_MESSAGE,
  CHOOSER_STEP_METHODS,
  CHOOSER_TIMEOUT_MESSAGE,
  CHOOSER_WAIT_MS,
  ChooserTabs,
  ChooserWaiter,
  NO_FILE_ACCESS_MESSAGE,
  UPLOAD_MARK_GONE_MESSAGE,
  UPLOAD_MARK_NOT_UNIQUE_MESSAGE,
  UPLOAD_STEP_METHODS,
  UPLOAD_WORLD_NAME,
  chooserClickExpression,
  setFilesByChooser,
} from "../src/upload-files.js";
import {
  DIRECTORY_INPUT_MESSAGE,
  DISABLED_INPUT_MESSAGE,
  SINGLE_FILE_INPUT_MESSAGE,
  UPLOAD_MARK_ATTR,
} from "../src/content/upload-target.js";
import { CHOOSER_BUSY_MESSAGE, CHOOSER_PARAM_MESSAGE, UPLOAD_PATHS_MESSAGE, UPLOAD_TARGET_REQUIRED_MESSAGE, checkUploadParams, uploadFiles } from "../src/handlers/upload.js";
import type { HandlerSafety } from "../src/safety-call.js";
import { GatedRouter } from "../src/router.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { JS_DISABLED_MESSAGE, UPLOAD_REFUSED_MESSAGE, safetyDecision } from "../src/safety.js";
import { EMPTY_BLOCK_LIST, parseBlockList } from "../src/safety-match.js";
import { parseUploadFolders } from "../src/upload-paths.js";
import type { SafetyView } from "../src/safety-state.js";
import { inject, type Step } from "./s3-upload-helpers.js";

const P1 = String.raw`C:\Wave\Up\a.txt`;
const P2 = String.raw`C:\Wave\Up\b.txt`;
const OUTSIDE = String.raw`C:\Elsewhere\x.txt`;
const ALLOWED_URL = "http://localhost:8080/e2e-playground.html";
const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const marks = () => document.querySelectorAll(`[${UPLOAD_MARK_ATTR}]`).length;
const refOf = (el: Element) => window.__agentBridge!.refs.add(el);

/** A fake CDP for the chooser leg: tracks the interception and Page domain, emits the chooser event on the click. */
class ChooserCdp {
  readonly calls: Step[] = [];
  intercept = false;
  pageOn = false;
  /** The event the click opens; null = no chooser opens. */
  event: Record<string, unknown> | null = { backendNodeId: 42, mode: "selectSingle", frameId: "FRAME-1" };
  node: Record<string, unknown> | undefined = { localName: "input", nodeName: "INPUT", attributes: ["type", "file"] };
  fail: Partial<Record<string, string>> = {};
  hang: ReadonlySet<string> = new Set();
  before: Partial<Record<string, () => void | Promise<void>>> = {};
  emit: (params: unknown) => void = () => {};

  send = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    this.calls.push({ method, params });
    await this.before[method]?.();
    if (this.hang.has(method)) return new Promise(() => {});
    const err = this.fail[method];
    if (err !== undefined) throw new Error(err);
    switch (method) {
      case "Page.enable":
        this.pageOn = true;
        return {};
      case "Page.disable":
        this.pageOn = false;
        return {};
      case "Page.setInterceptFileChooserDialog":
        this.intercept = params.enabled === true;
        return {};
      case "Page.getFrameTree":
        return { frameTree: { frame: { id: "FRAME-1" } } };
      case "Page.createIsolatedWorld":
        return { executionContextId: 77 };
      case "Runtime.evaluate": {
        const v = inject(String(params.expression));
        // As Chrome 156 (m2 E2, E5, E7): an event only with Page.enable, the interception and a user gesture.
        if (v === "clicked" && params.userGesture === true && this.intercept && this.pageOn && this.event) this.emit(this.event);
        // the input path's finder hands back its element (as FakeUploadCdp does)
        if (v !== null && typeof v === "object") return { result: { type: "object", subtype: "node", objectId: "n1" } };
        return { result: { type: typeof v, value: v } };
      }
      case "DOM.describeNode":
        return this.node ? { node: this.node } : {};
      default:
        return {};
    }
  };

  methods(): string[] {
    return this.calls.map((c) => c.method);
  }
  /** How many times the interception was switched off. */
  offs(): number {
    return this.calls.filter((c) => c.method === "Page.setInterceptFileChooserDialog" && c.params.enabled === false).length;
  }
}

let cdp: ChooserCdp;
let log: string[];
let fileAccess: unknown;
let missingUrls: Set<string>;
let listeners: ((source: { tabId?: number; sessionId?: string }, method: string, params?: unknown) => void)[];
let consoleCalls: number;

beforeEach(() => {
  missingUrls = new Set();
  listeners = [];
  consoleCalls = 0;
  for (const k of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, k).mockImplementation(() => void consoleCalls++);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    log.push("probe");
    if (missingUrls.has(url)) throw new TypeError("Failed to fetch");
    return { status: 200, body: null };
  }));
  document.body.innerHTML = "";
  log = [];
  cdp = new ChooserCdp();
  cdp.emit = (params) => {
    for (const l of [...listeners]) l({ tabId: 5 }, "Page.fileChooserOpened", params);
  };
  fileAccess = true;
  vi.stubGlobal("chrome", {
    tabs: { get: vi.fn(async (id: number) => (log.push("tabs.get"), { id, url: ALLOWED_URL, discarded: false })) },
    extension: { isAllowedFileSchemeAccess: vi.fn(async () => (log.push("fileAccess"), fileAccess)) },
    scripting: {
      executeScript: vi.fn(async (o: { files?: string[]; func?: (...a: unknown[]) => unknown; args?: unknown[] }) => {
        if (o.files) {
          log.push("inject");
          return [];
        }
        const result = o.func!(...(o.args ?? []));
        const r = result as { removed?: number; __bridgeError?: string } | null;
        log.push(r && "removed" in r ? "page:unmark" : r && r.__bridgeError ? "page:refused" : "page:mark");
        return [{ result, documentId: "DOC-1", frameId: 0 }];
      }),
    },
    debugger: {
      attach: vi.fn(async () => void log.push("attach")),
      detach: vi.fn(async () => void log.push("detach")),
      sendCommand: vi.fn(async (_t: unknown, method: string, params: Record<string, unknown>) => {
        log.push(method);
        return cdp.send(method, params);
      }),
      onEvent: {
        addListener: vi.fn((l: (typeof listeners)[number]) => void listeners.push(l)),
        removeListener: vi.fn((l: (typeof listeners)[number]) => void (listeners = listeners.filter((x) => x !== l))),
      },
    },
  });
});
afterEach(() => {
  debuggerSessions.refuse(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fakeCall(o: { refuseAt?: number; refusal?: () => Error } = {}) {
  let n = 0;
  return {
    effect: vi.fn(async () => {
      log.push("effect");
      if (++n === o.refuseAt) throw o.refusal ? o.refusal() : new BridgeError(ErrorCodes.DISARMED, DISARMED_ALL.message, { scope: "all" });
    }),
  } as unknown as HandlerSafety;
}

async function wire(p: Promise<unknown>): Promise<{ code: string; message: string; data?: unknown }> {
  try {
    await p;
  } catch (e) {
    return toWireError(e) as { code: string; message: string };
  }
  throw new Error("expected a rejection");
}

/** A waiter wired to the fake's event, as the handler's listener wires it. */
function deps() {
  const waiter = new ChooserWaiter();
  cdp.emit = (e) => waiter.feed(e);
  return { send: cdp.send, waiter };
}

const setInput = (attrs = "multiple") => {
  document.body.innerHTML = `<input id="f" type="file" ${attrs}>`;
  return refOf(document.getElementById("f")!);
};

// ------------------------------------------------------------------------------------------------
describe("E5.1 — the chooser's CDP step list, the interception off on every path (a fake counts)", () => {
  it("success: Page.enable → intercept on → frame → world → userGesture click → describe → set files {backendNodeId} → off → Page.disable", async () => {
    document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-1">Pick</button>`;
    cdp.event = { backendNodeId: 42, mode: "selectMultiple" };
    expect(await setFilesByChooser(deps(), "m-1", [P1, P2])).toBe(2);
    expect(cdp.methods()).toEqual([...CHOOSER_STEP_METHODS]);
    expect(cdp.calls[1]!.params).toEqual({ enabled: true });
    expect(cdp.calls[3]!.params).toEqual({ frameId: "FRAME-1", worldName: UPLOAD_WORLD_NAME });
    expect(cdp.calls[4]!.params).toEqual({ expression: chooserClickExpression("m-1"), contextId: 77, userGesture: true, returnByValue: true, awaitPromise: false });
    expect(cdp.calls[5]!.params).toEqual({ backendNodeId: 42 });
    expect(cdp.calls[6]!.params).toEqual({ files: [P1, P2], backendNodeId: 42 });
    expect(cdp.calls[7]!.params).toEqual({ enabled: false });
    expect([cdp.intercept, cdp.pageOn]).toEqual([false, false]);
    expect(marks()).toBe(0);
  });

  it("the clicker clicks the marked element once, in the isolated world, and removes the mark", async () => {
    document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-2">Pick</button>`;
    let clicks = 0;
    document.getElementById("b")!.addEventListener("click", () => clicks++);
    await setFilesByChooser(deps(), "m-2", [P1]);
    expect(clicks).toBe(1);
    expect(cdp.calls.filter((c) => c.method === "Runtime.evaluate").every((c) => c.params.contextId === 77)).toBe(true);
    expect(marks()).toBe(0);
  });

  const failures: [string, (c: ChooserCdp) => void, string][] = [
    ["Page.enable fails", (c) => (c.fail["Page.enable"] = "boom"), "boom"],
    ["the interception's enable fails", (c) => (c.fail["Page.setInterceptFileChooserDialog"] = "boom"), "boom"],
    ["no main frame", (c) => (c.before["Page.getFrameTree"] = () => void (c.fail["Page.getFrameTree"] = "boom")), "boom"],
    ["the isolated world fails", (c) => (c.fail["Page.createIsolatedWorld"] = "boom"), "boom"],
    ["the click's evaluate fails", (c) => (c.fail["Runtime.evaluate"] = "boom"), "boom"],
    ["DOM.describeNode fails", (c) => (c.fail["DOM.describeNode"] = "boom"), "boom"],
    ["DOM.setFileInputFiles fails", (c) => (c.fail["DOM.setFileInputFiles"] = "Not allowed"), "Not allowed"],
  ];
  for (const [name, arm, message] of failures) {
    it(`an error (${name}): the error stands; interception off (if it was asked for) and Page.disable sent`, async () => {
      document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-3">Pick</button>`;
      arm(cdp);
      await expect(setFilesByChooser(deps(), "m-3", [P1])).rejects.toThrow(message);
      const asked = name !== "Page.enable fails";
      expect(cdp.offs(), name).toBe(asked ? 1 : 0);
      expect(cdp.methods().at(-1)).toBe("Page.disable");
      expect(cdp.intercept).toBe(false);
    });
  }

  it("the off step and Page.disable failing do not mask the answer (success stays success, an error stays itself)", async () => {
    document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-4">Pick</button>`;
    cdp.before["Page.disable"] = () => void (cdp.fail["Page.disable"] = "gone");
    cdp.before["Page.setInterceptFileChooserDialog"] = () => {
      if (cdp.calls.filter((c) => c.method === "Page.setInterceptFileChooserDialog").length === 2) cdp.fail["Page.setInterceptFileChooserDialog"] = "gone";
    };
    expect(await setFilesByChooser(deps(), "m-4", [P1])).toBe(1);
    expect(cdp.offs()).toBe(1);
  });

  it("the no-chooser TIMEOUT: 5 s after the click, a fixed own message (unprefixed); interception off, no files set", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-5">Pick</button>`;
    cdp.event = null;
    const pending = setFilesByChooser(deps(), "m-5", [P1]).catch((e) => e);
    await vi.advanceTimersByTimeAsync(CHOOSER_WAIT_MS - 1);
    expect(cdp.offs()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;
    expect(toWireError(err)).toEqual({ code: ErrorCodes.TIMEOUT, message: CHOOSER_TIMEOUT_MESSAGE });
    const { describeDebuggerError } = await import("../src/debugger-errors.js");
    expect(describeDebuggerError(err, "File upload")).toEqual({ code: ErrorCodes.TIMEOUT, message: CHOOSER_TIMEOUT_MESSAGE });
    expect(cdp.methods()).not.toContain("DOM.setFileInputFiles");
    expect(cdp.offs()).toBe(1);
    expect(CHOOSER_WAIT_MS).toBe(5000);
  });

  it("without Page.enable or the gesture Chrome sends no event (m2 E5, E7): the fake agrees, so the order is load-bearing", async () => {
    document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-6">Pick</button>`;
    const d = deps();
    let got = 0;
    cdp.emit = (e) => (got++, d.waiter.feed(e));
    await setFilesByChooser(d, "m-6", [P1]);
    expect(got).toBe(1);
    expect(cdp.methods().indexOf("Page.enable")).toBeLessThan(cdp.methods().indexOf("Runtime.evaluate"));
  });
});

// ------------------------------------------------------------------------------------------------
describe("the chooser's own input rules, after the click (E5.2's second half); each ends the chooser", () => {
  const rules: [string, (c: ChooserCdp) => void, string[], { code: string; message: string }][] = [
    ["no backendNodeId (showOpenFilePicker)", (c) => (c.event = { mode: "selectSingle" }), [P1], { code: ErrorCodes.BAD_PARAMS, message: CHOOSER_NO_INPUT_MESSAGE }],
    ["two paths, mode selectSingle", (c) => (c.event = { backendNodeId: 42, mode: "selectSingle" }), [P1, P2], { code: ErrorCodes.BAD_PARAMS, message: SINGLE_FILE_INPUT_MESSAGE }],
    ["two paths, an unknown mode (fails closed)", (c) => (c.event = { backendNodeId: 42 }), [P1, P2], { code: ErrorCodes.BAD_PARAMS, message: SINGLE_FILE_INPUT_MESSAGE }],
    ["a webkitdirectory input", (c) => (c.node = { localName: "input", attributes: ["type", "file", "webkitdirectory", ""] }), [P1], { code: ErrorCodes.BAD_PARAMS, message: DIRECTORY_INPUT_MESSAGE }],
    ["a disabled input", (c) => (c.node = { localName: "input", attributes: ["type", "file", "DISABLED", ""] }), [P1], { code: ErrorCodes.BAD_PARAMS, message: DISABLED_INPUT_MESSAGE }],
  ];
  for (const [name, arm, paths, expected] of rules) {
    it(`${name}: refused (own, unprefixed); interception off and Page.disable sent; never DOM.setFileInputFiles (no files: [])`, async () => {
      document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-7">Pick</button>`;
      arm(cdp);
      const err = await setFilesByChooser(deps(), "m-7", paths).catch((e) => e);
      const { describeDebuggerError } = await import("../src/debugger-errors.js");
      expect(describeDebuggerError(err, "File upload")).toEqual(expected);
      expect(cdp.methods()).not.toContain("DOM.setFileInputFiles");
      expect(cdp.offs()).toBe(1);
      expect([cdp.intercept, cdp.pageOn]).toEqual([false, false]);
    });
  }

  it("two paths with mode selectMultiple pass; one path passes any mode", async () => {
    document.body.innerHTML = `<button id="b" ${UPLOAD_MARK_ATTR}="m-8">Pick</button>`;
    cdp.event = { backendNodeId: 9, mode: "selectMultiple" };
    expect(await setFilesByChooser(deps(), "m-8", [P1, P2])).toBe(2);
  });

  it("the mark gone or not unique: today's REF_STALE / INTERNAL texts; nothing clicked; interception off", async () => {
    expect(toWireError(await setFilesByChooser(deps(), "m-9", [P1]).catch((e) => e))).toEqual({ code: ErrorCodes.REF_STALE, message: UPLOAD_MARK_GONE_MESSAGE });
    expect(cdp.offs()).toBe(1);
    cdp = new ChooserCdp();
    document.body.innerHTML = `<b ${UPLOAD_MARK_ATTR}="m-10"></b><i ${UPLOAD_MARK_ATTR}="m-10"></i>`;
    expect(toWireError(await setFilesByChooser(deps(), "m-10", [P1]).catch((e) => e))).toEqual({ code: ErrorCodes.INTERNAL, message: UPLOAD_MARK_NOT_UNIQUE_MESSAGE });
    expect(cdp.offs()).toBe(1);
    expect(marks()).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------
describe("the waiter, the per-tab lock and the shipped sources", () => {
  it("ChooserWaiter: an event before the arm is ignored; the first after it is kept; close ends a wait", async () => {
    const w = new ChooserWaiter();
    w.feed({ backendNodeId: 1 });
    w.arm();
    w.feed({ backendNodeId: 2 });
    w.feed({ backendNodeId: 3 });
    expect(await w.wait(10)).toEqual({ backendNodeId: 2 });
    const w2 = new ChooserWaiter();
    w2.arm();
    const p = w2.wait(60_000);
    w2.close();
    expect(await p).toBeUndefined();
    w2.feed({ backendNodeId: 4 });
    expect(await w2.wait(10)).toBeUndefined();
  });

  it("ChooserTabs: one per tab; other tabs free; free again after release", () => {
    const t = new ChooserTabs();
    expect([t.take(5), t.take(5), t.take(6)]).toEqual([true, false, true]);
    t.release(5);
    expect(t.take(5)).toBe(true);
  });

  it("the shipped sources are closure-free (run alone by indirect eval) and name no module helper", () => {
    for (const src of [CHOOSER_CLICK_SRC, String(CHOOSER_MARK_PAGE_FN)]) expect(src).not.toMatch(/__name|_\w+\.js|import\(/);
    expect(inject(chooserClickExpression("nope"))).toBe("none");
    document.body.innerHTML = `<svg><circle ${UPLOAD_MARK_ATTR}="m-11"></circle></svg>`;
    let clicks = 0;
    document.querySelector("circle")!.addEventListener("click", () => clicks++);
    expect(inject(chooserClickExpression("m-11"))).toBe("clicked");
    expect(clicks).toBe(1);
    const ref = refOf(document.querySelector("circle")!);
    expect(inject(`(${String(CHOOSER_MARK_PAGE_FN)})(${JSON.stringify(ref)}, "m-12")`)).toEqual({ ok: true });
    expect(document.querySelector("circle")!.getAttribute(UPLOAD_MARK_ATTR)).toBe("m-12");
    expect(inject(`(${String(CHOOSER_MARK_PAGE_FN)})("e999999", "m-13")`)).toMatchObject({ __bridgeError: expect.stringMatching(/^REF_STALE:/) });
  });
});

// ------------------------------------------------------------------------------------------------
const PATHS = [
  { name: "the input path", extra: {} as Record<string, unknown>, steps: [...UPLOAD_STEP_METHODS] as string[] },
  { name: "the chooser path", extra: { chooser: true } as Record<string, unknown>, steps: [...CHOOSER_STEP_METHODS] as string[] },
];

describe.each(PATHS)("E5.2 — one shared prologue and the same gate rules: $name", ({ extra, steps }) => {
  /** After a prologue refusal, the same params succeed on their own path (the flag picks the leg). */
  async function succeeds(ref: string) {
    log = [];
    cdp = new ChooserCdp();
    cdp.emit = (params) => {
      for (const l of [...listeners]) l({ tabId: 5 }, "Page.fileChooserOpened", params);
    };
    missingUrls.clear();
    fileAccess = true;
    expect(await uploadFiles({ tabId: 5, ref, paths: [P1], ...extra }, fakeCall())).toEqual({ files: 1 });
    expect(log.filter((m) => /^(Page|Runtime|DOM)\./.test(m))).toEqual(steps);
  }

  it("params: a target, 1–20 non-empty paths — BAD_PARAMS before any tab read", async () => {
    const ref = setInput("");
    for (const paths of [undefined, [], [""], [1], Array(21).fill(P1)]) {
      expect(await wire(uploadFiles({ tabId: 5, ref, paths, ...extra }, fakeCall()))).toEqual({ code: ErrorCodes.BAD_PARAMS, message: UPLOAD_PATHS_MESSAGE });
    }
    expect(await wire(uploadFiles({ tabId: 5, paths: [P1], ...extra }, fakeCall()))).toEqual({ code: ErrorCodes.BAD_PARAMS, message: UPLOAD_TARGET_REQUIRED_MESSAGE });
    expect(log).toEqual([]);
    await succeeds(ref);
  });

  it("the file-URL toggle off: UPLOAD_REFUSED after the tab read, before any probe, page call or attach", async () => {
    const ref = setInput("");
    fileAccess = false;
    expect(await wire(uploadFiles({ tabId: 5, ref, paths: [P1], ...extra }, fakeCall()))).toEqual({ code: ErrorCodes.UPLOAD_REFUSED, message: NO_FILE_ACCESS_MESSAGE });
    expect(log).toEqual(["tabs.get", "fileAccess"]);
    await succeeds(ref);
  });

  it("a missing file: BAD_PARAMS naming its index, before any effect, page call or attach", async () => {
    const ref = setInput();
    missingUrls.add("file:///C:/Wave/Up/b.txt");
    expect(await wire(uploadFiles({ tabId: 5, ref, paths: [P1, P2], ...extra }, fakeCall()))).toEqual({
      code: ErrorCodes.BAD_PARAMS,
      message: "upload: paths[1] does not exist (or Chrome cannot read it); nothing was uploaded",
    });
    expect(log).toEqual(["tabs.get", "fileAccess", "probe", "probe"]);
    await succeeds(ref);
  });

  it("the gate: Upload folders, the tab's rules and the state, in every phase, as for uploadFiles (JavaScript on)", () => {
    const ctx = { extensionId: OWN_ID, blockList: parseBlockList("bank.example"), uploadFolders: parseUploadFolders(String.raw`C:\Wave\Up`) };
    const on = { armed: true, evaluate: true };
    const live = (u: string) => ({ kind: "live" as const, urls: [u] });
    for (const phase of ["receipt", "effect", "post"] as const) {
      expect(safetyDecision("uploadFiles", { paths: [P1], ...extra }, live(ALLOWED_URL), on, ctx, phase)).toBe("allow");
      expect(safetyDecision("uploadFiles", { paths: [P1, OUTSIDE], ...extra }, live(ALLOWED_URL), on, ctx, phase)).toEqual({ code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE });
      expect(safetyDecision("uploadFiles", { paths: "x", ...extra }, live(ALLOWED_URL), on, ctx, phase)).toMatchObject({ code: ErrorCodes.UPLOAD_REFUSED });
      expect(safetyDecision("uploadFiles", { paths: [P1], ...extra }, live("https://www.bank.example/a"), on, ctx, phase)).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
      expect(safetyDecision("uploadFiles", { paths: [P1], ...extra }, live("file:///C:/x.html"), on, ctx, phase)).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
      expect(safetyDecision("uploadFiles", { paths: [P1], ...extra }, live(ALLOWED_URL), { armed: false, evaluate: true }, ctx, phase)).toMatchObject({ code: ErrorCodes.DISARMED });
      expect(safetyDecision("uploadFiles", { paths: [OUTSIDE], ...extra }, { kind: "gone" }, on, ctx, phase)).toMatchObject({ code: ErrorCodes.UPLOAD_REFUSED });
      // JavaScript off: the input path is unaffected; the chooser path is refused JS_DISABLED before the tab and folders
      const off = safetyDecision("uploadFiles", { paths: [OUTSIDE], ...extra }, live("https://www.bank.example/a"), { armed: true, evaluate: false }, ctx, phase);
      if (extra.chooser) expect(off).toEqual({ code: ErrorCodes.JS_DISABLED, message: JS_DISABLED_MESSAGE });
      else expect(off).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    }
  });
});

// ------------------------------------------------------------------------------------------------
describe("the handler's chooser path", () => {
  it("chooser must be true or false (null and absent are the input path); anything else BAD_PARAMS before any tab read", async () => {
    for (const chooser of ["yes", 1, {}, []]) {
      expect(() => checkUploadParams({ ref: "e1", paths: [P1], chooser }), JSON.stringify(chooser)).toThrow(CHOOSER_PARAM_MESSAGE);
    }
    for (const chooser of [true, false, null, undefined]) expect(checkUploadParams({ ref: "e1", paths: [P1], chooser })).toEqual([P1]);
    expect(CHOOSER_PARAM_MESSAGE).toBe("uploadFiles: chooser must be true or false");
  });

  it("success: tab → file access → probe → effect → inject → effect → mark → effect → attach → steps → detach; the listener removed", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    expect(await uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall())).toEqual({ files: 1 });
    const steps: string[] = [...CHOOSER_STEP_METHODS];
    steps.splice(steps.indexOf("DOM.describeNode"), 0, "effect"); // the gate re-read after the event (V2)
    expect(log).toEqual(["tabs.get", "fileAccess", "probe", "effect", "inject", "effect", "page:mark", "effect", "attach", ...steps, "detach"]);
    expect(listeners).toHaveLength(0);
    expect(marks()).toBe(0);
  });

  it("a locator target works the same", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    expect(await uploadFiles({ tabId: 5, locator: { css: "#b" }, paths: [P1], chooser: true }, fakeCall())).toEqual({ files: 1 });
  });

  it("a child session's event and another tab's are ignored (→ TIMEOUT)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    cdp.emit = (params) => {
      for (const l of [...listeners]) {
        l({ tabId: 5, sessionId: "child" }, "Page.fileChooserOpened", params);
        l({ tabId: 6 }, "Page.fileChooserOpened", params);
        l({ tabId: 5 }, "Page.frameNavigated", params);
      }
    };
    const pending = wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()));
    await vi.advanceTimersByTimeAsync(CHOOSER_WAIT_MS);
    expect(await pending).toEqual({ code: ErrorCodes.TIMEOUT, message: CHOOSER_TIMEOUT_MESSAGE });
    expect(log.slice(-4)).toEqual(["Page.setInterceptFileChooserDialog", "Page.disable", "detach", "page:unmark"]);
    expect(listeners).toHaveLength(0);
  });

  it("a refusal after the click ends the chooser: interception off, Page.disable, then the detach; the mark swept; no files: []", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    cdp.event = { mode: "selectSingle" };
    expect(await wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()))).toEqual({ code: ErrorCodes.BAD_PARAMS, message: CHOOSER_NO_INPUT_MESSAGE });
    expect(log.slice(-4)).toEqual(["Page.setInterceptFileChooserDialog", "Page.disable", "detach", "page:unmark"]);
    expect(cdp.offs()).toBe(1);
    expect(cdp.methods()).not.toContain("DOM.setFileInputFiles");
    expect(marks()).toBe(0);
  });

  it("disarm mid-session: DISARMED; the off step still attempted; no files set", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    cdp.before["DOM.describeNode"] = async () => {
      await debuggerSessions.detachAll(DISARMED_ALL, async () => {});
      throw new Error("Detached while handling command.");
    };
    expect(await wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()))).toEqual({ code: ErrorCodes.DISARMED, message: DISARMED_ALL.message, data: { scope: "all" } });
    expect(cdp.offs()).toBe(1);
    expect(cdp.methods()).not.toContain("DOM.setFileInputFiles");
  });

  it("V2: a disarm or a block between the click and the event refuses after the event: no DOM.setFileInputFiles, the off step sent", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    const blocked = () => new BridgeError(ErrorCodes.DOMAIN_BLOCKED, "blocked");
    for (const [refusal, expected] of [
      [undefined, { code: ErrorCodes.DISARMED, message: DISARMED_ALL.message, data: { scope: "all" } }],
      [blocked, { code: ErrorCodes.DOMAIN_BLOCKED, message: "blocked" }],
    ] as const) {
      log = [];
      cdp = new ChooserCdp();
      cdp.emit = (params) => {
        for (const l of [...listeners]) l({ tabId: 5 }, "Page.fileChooserOpened", params);
      };
      // the handler's three effects pass (the keeper's re-check before the use is the third); the fourth, after the event, refuses
      const call = fakeCall({ refuseAt: 4, refusal });
      expect(await wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, call))).toEqual(expected);
      expect(cdp.methods()).not.toContain("DOM.setFileInputFiles");
      expect(cdp.methods()).not.toContain("DOM.describeNode");
      expect(cdp.offs()).toBe(1);
      expect(log.slice(log.indexOf("Runtime.evaluate"))).toEqual(["Runtime.evaluate", "effect", "Page.setInterceptFileChooserDialog", "Page.disable", "detach", "page:unmark"]);
      expect(marks()).toBe(0);
    }
  });

  it("the overall 15 s bound: TIMEOUT, detached, the mark swept", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    cdp.hang = new Set(["Page.createIsolatedWorld"]);
    const pending = wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toMatchObject({ code: ErrorCodes.TIMEOUT });
    expect(log).toContain("detach");
    expect(marks()).toBe(0);
    expect(listeners).toHaveLength(0);
  });

  it("one chooser call per tab: a second one answers today's overlap text (DEBUGGER_DEVTOOLS), with no page call or attach; free after", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    let open!: () => void;
    cdp.before["Page.enable"] = () => new Promise<void>((r) => (open = r));
    const first = uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall());
    await vi.waitFor(() => expect(log).toContain("Page.enable"));
    const before = log.length;
    const second = await wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()));
    expect(second.code).toBe("DEBUGGER_DEVTOOLS");
    expect(log.slice(before)).toEqual(["tabs.get", "fileAccess", "probe"]);
    delete cdp.before["Page.enable"];
    open();
    expect(await first).toEqual({ files: 1 });
    expect(await uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall())).toEqual({ files: 1 });
    cdp.fail["Page.getFrameTree"] = "boom";
    await wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()));
    delete cdp.fail["Page.getFrameTree"];
    expect(await uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall())).toEqual({ files: 1 });
  });

  it("Step 13 S4 (#389, T4.1): the second chooser call's message is its own fixed text, naming no DevTools; code DEBUGGER_DEVTOOLS", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    let open!: () => void;
    cdp.before["Page.enable"] = () => new Promise<void>((r) => (open = r));
    const first = uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall());
    await vi.waitFor(() => expect(log).toContain("Page.enable"));
    const second = await wire(uploadFiles({ tabId: 5, ref, paths: [P1], chooser: true }, fakeCall()));
    expect(second.code).toBe("DEBUGGER_DEVTOOLS");
    expect(second.message).toBe(CHOOSER_BUSY_MESSAGE);
    expect(CHOOSER_BUSY_MESSAGE).toBe("uploadFiles: another file chooser upload is still running on this tab; retry after it ends");
    expect(second.message).not.toMatch(/devtools/i);
    expect(second.message).not.toMatch(/\d/);
    delete cdp.before["Page.enable"];
    open();
    expect(await first).toEqual({ files: 1 });
  });

  it("Step 13 S4 (#389): an overlapping debugger use elsewhere keeps describeDebuggerError's DevTools text, byte for byte", async () => {
    const { describeDebuggerError } = await import("../src/debugger-errors.js");
    expect(describeDebuggerError(new Error("Another debugger is already attached to the tab with id: 5."), "File upload")).toEqual({
      code: "DEBUGGER_DEVTOOLS",
      message:
        "Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry.",
    });
  });

  it("E5.3: no path, segment or mark in any message the chooser path answers; no log call", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const texts: string[] = [CHOOSER_TIMEOUT_MESSAGE, CHOOSER_NO_INPUT_MESSAGE, CHOOSER_PARAM_MESSAGE];
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    const run = async (arm: () => void) => {
      cdp = new ChooserCdp();
      cdp.emit = (params) => {
        for (const l of [...listeners]) l({ tabId: 5 }, "Page.fileChooserOpened", params);
      };
      arm();
      const p = wire(uploadFiles({ tabId: 5, ref, paths: [P1, P2], chooser: true }, fakeCall()));
      await vi.advanceTimersByTimeAsync(CHOOSER_WAIT_MS);
      texts.push((await p).message);
    };
    await run(() => (cdp.event = null));
    await run(() => (cdp.event = {}));
    await run(() => (cdp.event = { backendNodeId: 1, mode: "selectSingle" }));
    await run(() => (cdp.fail["DOM.setFileInputFiles"] = "Not allowed"));
    for (const t of texts) for (const s of [P1, P2, "Wave", "a.txt", "b.txt", "C:\\"]) expect(t, t).not.toContain(s);
    expect(consoleCalls).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------
describe("JavaScript off refuses chooser: true through GatedRouter — zero CDP commands, zero page calls (#336)", () => {
  function view(evaluate: boolean): SafetyView {
    return {
      switches: { armed: true, evaluate },
      ctx: { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST, uploadFolders: parseUploadFolders(String.raw`C:\Wave\Up`) },
      blockedCount: 0,
    };
  }
  function router(evaluate: boolean) {
    const deps: CallSafetyDeps = {
      readState: vi.fn(async () => view(evaluate)),
      getTab: vi.fn(async () => ({ url: ALLOWED_URL })),
      replacedBy: () => undefined,
      lastUrl: () => undefined,
    };
    const r = new GatedRouter((method, params) => new CallSafety(method, params, deps));
    r.on("uploadFiles", uploadFiles);
    return r;
  }
  const req = (params: Record<string, unknown>) => JSON.stringify({ id: "1", method: "uploadFiles", params: { tabId: 5, paths: [P1], ...params } });
  const cdpCount = () =>
    (chrome.debugger.attach as ReturnType<typeof vi.fn>).mock.calls.length + (chrome.debugger.sendCommand as ReturnType<typeof vi.fn>).mock.calls.length;

  it("chooser: true (and any non-false value) → JS_DISABLED, no data; attach + sendCommand 0, no executeScript, no file probe", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    for (const chooser of [true, "yes", 1]) {
      const out = JSON.parse((await router(false).handle(req({ ref, chooser })))!);
      expect(out.error, String(chooser)).toEqual({ code: ErrorCodes.JS_DISABLED, message: JS_DISABLED_MESSAGE });
    }
    expect(cdpCount()).toBe(0);
    expect((chrome.scripting.executeScript as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    expect(log).toEqual([]);
  });

  it("V8: chooser: true with a path outside the Upload folders → UPLOAD_REFUSED through GatedRouter; CDP 0, no page call, no probe", async () => {
    document.body.innerHTML = `<button id="b">Pick</button>`;
    const ref = refOf(document.getElementById("b")!);
    for (const paths of [[OUTSIDE], [P1, OUTSIDE]]) {
      const out = JSON.parse((await router(true).handle(req({ ref, chooser: true, paths })))!);
      expect(out.error, String(paths.length)).toEqual({ code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE });
    }
    expect(cdpCount()).toBe(0);
    expect((chrome.scripting.executeScript as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    expect(log).toEqual([]);
  });

  it("controls: JavaScript off without chooser (or false/null) uploads as today; JavaScript on with chooser uploads", async () => {
    document.body.innerHTML = `<input id="f" type="file">`;
    const ref = refOf(document.getElementById("f")!);
    for (const extra of [{}, { chooser: false }, { chooser: null }]) {
      const out = JSON.parse((await router(false).handle(req({ ref, ...extra })))!);
      expect(out.result, JSON.stringify(extra)).toEqual({ files: 1 });
    }
    expect(cdpCount()).toBeGreaterThan(0);
    const on = JSON.parse((await router(true).handle(req({ ref, chooser: true })))!);
    expect(on.result).toEqual({ files: 1 });
  });
});

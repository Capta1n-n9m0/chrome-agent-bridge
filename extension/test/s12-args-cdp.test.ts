// @vitest-environment jsdom
/**
 * Step 12 S2a (exit checks B2.1 as rewritten in stage0-audit.md §5, B2.2; decisions.md #330, #331; spec §10's Step
 * 12 note): `evaluate` and `evaluateSaveStart` with `args` through the shipped chain (handler → `debugger.ts` →
 * `withDebugger` → `callWithArgs`) over a stubbed `chrome.debugger` whose CDP runs every shipped source in this JS
 * engine — the fixed wrapper's `JSON.parse` included. The value appears only as the JSON-string argument of the
 * wrapper call; the round trip is exact; `asRef` and `saveTo` compose; refusals are fixed; JavaScript off answers
 * `JS_DISABLED` with no attach and no CDP command; a terminated script answers today's TIMEOUT.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";

const m = vi.hoisted(() => ({ ensureContent: vi.fn(), callInPage: vi.fn() }));
vi.mock("../src/inject.js", () => ({ ensureContent: m.ensureContent, callInPage: m.callInPage }));

import { evaluate } from "../src/handlers/evaluate.js";
import { clearEvaluateSaves, evaluateSaveChunk, evaluateSaveStart } from "../src/handlers/evaluate-save.js";
import { evaluateFunctionInPage, evaluateInPage } from "../src/debugger.js";
import { CALL_WRAPPER_SRC } from "../src/evaluate/call.js";
import { EngineCdp, FN_SCRIPT } from "./s12-engine-cdp.js";
import { DEFAULT_LIMITS } from "../src/evaluate/serialize.js";
import { timeoutMessage } from "../src/debugger-errors.js";
import { toWireError } from "../src/errors.js";
import { GatedRouter } from "../src/router.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { JS_DISABLED_MESSAGE } from "../src/safety.js";
import { EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import type { SafetyView } from "../src/safety-state.js";

const SENT = "SENTINEL-ARGS-Q4";

let cdp: EngineCdp;
let n: { attach: number; detach: number; send: number };
let listeners: Array<(s: { tabId?: number }, method: string, params?: object) => void>;

beforeEach(() => {
  cdp = new EngineCdp();
  n = { attach: 0, detach: 0, send: 0 };
  listeners = [];
  vi.stubGlobal("chrome", {
    tabs: { get: vi.fn(async (id: number) => ({ id, url: "http://localhost:8080/e2e-playground.html", discarded: false })) },
    debugger: {
      attach: vi.fn(async () => void n.attach++),
      detach: vi.fn(async () => void n.detach++),
      sendCommand: vi.fn(async (_t: unknown, method: string, params: Record<string, unknown>) => {
        n.send++;
        return cdp.send(method, params);
      }),
      onEvent: {
        addListener: (l: (typeof listeners)[number]) => void listeners.push(l),
        removeListener: (l: (typeof listeners)[number]) => void (listeners = listeners.filter((x) => x !== l)),
      },
    },
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  m.ensureContent.mockResolvedValue(undefined);
  m.callInPage.mockResolvedValue({ ref: "e9", role: "button", name: "Go" });
});
afterEach(() => {
  clearEvaluateSaves();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function rejection(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return toWireError(e);
  }
  throw new Error("expected a rejection");
}

/** The wrapper call holds the JSON text as its second argument, exactly; nothing else holds the sentinel. */
function expectOnlyInWrapperArg(json: string): void {
  const wrapper = cdp.calls.filter((c) => c.params.functionDeclaration === CALL_WRAPPER_SRC);
  expect(wrapper).toHaveLength(1);
  expect((wrapper[0]!.params.arguments as Array<{ value?: unknown }>)[1]).toEqual({ value: json });
  for (const t of cdp.textsOutsideWrapperArgs()) expect(t.includes(SENT), t.slice(0, 80)).toBe(false);
  for (const c of cdp.calls) {
    if (typeof c.params.expression === "string") expect(c.params.expression).not.toContain(SENT);
    if (typeof c.params.functionDeclaration === "string") expect(c.params.functionDeclaration).not.toContain(SENT);
  }
}

describe("B2.1 the round trip is exact, and the value travels only as the wrapper's JSON-string argument", () => {
  const table: Array<[string, unknown]> = [
    ["nested", { s: SENT, o: { k: { k2: { k3: "deep" } } }, a: [[1, [2, [3, []]]], {}] }],
    ["Unicode", { s: `${SENT} héllo ✓ 日本 🎉`, e: "" }],
    ["numbers", { s: SENT, n: [0, -1, 1.5, 1e21, -0.25, 9007199254740991, 0.1] }],
    ["null in properties", { s: SENT, z: null, o: { k: null }, l: [{ x: null }, null] }],
    ["arrays", [SENT, true, false, [null], []]],
    ["key order kept", { z: 1, a: 2, m: SENT, b: { y: 1, c: 2 } }],
  ];
  for (const [name, args] of table) {
    it(name, async () => {
      const env = await evaluate({ tabId: 7, expression: "(a) => JSON.stringify(a)", args });
      expect(env).toMatchObject({ kind: "json", value: JSON.stringify(args) });
      expectOnlyInWrapperArg(JSON.stringify(args));
    });
  }

  it("null top-level arrives as null (not undefined)", async () => {
    const env = await evaluate({ tabId: 7, expression: "(a) => [a === null, JSON.stringify(a)].join(':')", args: null });
    expect(env).toMatchObject({ kind: "json", value: "true:null" });
  });

  it("an object returned whole is serialised as today, keys in the page's order", async () => {
    const args = { z: SENT, a: 1, n: null };
    const env = await evaluate({ tabId: 7, expression: "(a) => a", args });
    expect(env.kind).toBe("json");
    expect(JSON.stringify(env.value)).toBe(JSON.stringify(args));
  });

  it("an async function resolves; a function declaration form works; no return wrapper", async () => {
    expect(await evaluate({ tabId: 7, expression: "async (a) => { await null; return a.n + 1; }", args: { n: 41 } })).toMatchObject({ value: 42 });
    expect(await evaluate({ tabId: 7, expression: "function (a) { return a.n * 2; }", args: { n: 21 } })).toMatchObject({ value: 42 });
  });

  it("the source is evaluated as a parenthesised function expression: no page global", async () => {
    await evaluate({ tabId: 7, expression: "function leakS12(a) { return a; }", args: 1 });
    expect((globalThis as Record<string, unknown>).leakS12).toBeUndefined();
  });

  it("{args, asRef}: the element is marked and the ref minted; the value only in the wrapper's argument", async () => {
    document.body.innerHTML = '<button id="b-go">Go</button>';
    const env = await evaluate({ tabId: 7, expression: "(a) => document.getElementById(a.id)", args: { id: "b-go", s: SENT }, asRef: true });
    expect(env.ref).toBe("e9");
    expect(m.ensureContent).toHaveBeenCalledTimes(1);
    expect(String(m.callInPage.mock.calls[0]![2])).not.toContain(SENT);
    expectOnlyInWrapperArg(JSON.stringify({ id: "b-go", s: SENT }));
  });

  it("{args, saveTo}: evaluateSaveStart holds exactly the JSON the function returns", async () => {
    const args = { z: null, a: [SENT, "日本"], m: { k: 1 } };
    const start = await evaluateSaveStart({ tabId: 7, expression: "(a) => a", args });
    expect(start.kind).toBe("json");
    const { data } = await evaluateSaveChunk({ tabId: 7, id: start.id, offset: 0 });
    expect(Buffer.from(data, "base64").toString("utf8")).toBe(JSON.stringify(args));
    expectOnlyInWrapperArg(JSON.stringify(args));
  });

  it("without args nothing of the new path runs (no Debugger.*, no wrapper)", async () => {
    await evaluate({ tabId: 7, expression: "1 + 1" });
    await evaluateSaveStart({ tabId: 7, expression: "'x'" });
    expect(cdp.calls.some((c) => c.method.startsWith("Debugger.") || c.params.functionDeclaration === CALL_WRAPPER_SRC)).toBe(false);
  });

  it("Debugger.enable and breakpoints off come before the call; Debugger.disable before the detach", async () => {
    await evaluate({ tabId: 7, expression: "(a) => a", args: 1 });
    const ms = cdp.calls.map((c) => c.method);
    expect(ms.slice(0, 2)).toEqual(["Debugger.enable", "Debugger.setBreakpointsActive"]);
    expect(ms.at(-1)).toBe("Debugger.disable");
    expect(n.detach).toBe(1);
  });
});

describe("B2.1 refusals: fixed BAD_PARAMS messages with no part of the value, before any attach", () => {
  const cyc: Record<string, unknown> = { s: SENT };
  cyc.self = cyc;
  const cases: Array<[string, unknown, RegExp]> = [
    ["undefined inside", { s: SENT, u: undefined }, /holds undefined/],
    ["a function", { s: SENT, f: () => 1 }, /holds a function/],
    ["a BigInt", { s: SENT, n: 1n }, /holds a BigInt/],
    ["a cycle", cyc, /holds a cycle/],
    ["over 1 MiB", { s: SENT.repeat(70_000) }, /^args: the value is \d+ bytes as JSON, over the 1 MiB cap \(1048576 bytes\)$/],
  ];
  for (const [name, args, re] of cases) {
    it(name, async () => {
      for (const call of [() => evaluate({ tabId: 7, expression: "(a) => a", args }), () => evaluateSaveStart({ tabId: 7, expression: "(a) => a", args })]) {
        const w = await rejection(call());
        expect(w.code).toBe(ErrorCodes.BAD_PARAMS);
        expect(w.message).toMatch(re);
        expect(JSON.stringify(w)).not.toContain(SENT);
      }
      expect(n).toMatchObject({ attach: 0, send: 0 });
    });
  }

  it("a source that is not a function: BAD_PARAMS unprefixed, naming the type only", async () => {
    const w = await rejection(evaluate({ tabId: 7, expression: "4242", args: { s: SENT } }));
    expect(w).toEqual({ code: ErrorCodes.BAD_PARAMS, message: 'args: with args, expression must be a function source such as "(a) => a.rows.length"; it evaluated to number' });
  });
});

describe("the bound through debugger.ts: pause, terminate, today's TIMEOUT", () => {
  it("at the deadline: pause → paused in the function's script → terminate; the listener is removed; the answer equals evaluateInPage's timeout", async () => {
    cdp.override["Runtime.callFunctionOn"] = (p) => (p.functionDeclaration === CALL_WRAPPER_SRC ? new Promise(() => {}) : undefined);
    cdp.override["Debugger.pause"] = () => {
      queueMicrotask(() => {
        for (const l of [...listeners]) l({ tabId: 99 }, "Debugger.paused", { callFrames: [{ location: { scriptId: "other" } }] }); // another tab, another script: ignored (without the tabId filter it is taken and the call resumes without terminating)
        for (const l of [...listeners]) l({ tabId: 7 }, "Debugger.paused", { callFrames: [{ location: { scriptId: FN_SCRIPT } }] });
      });
      return {};
    };
    const got = await rejection(evaluateFunctionInPage(7, "(a) => { while (true) {} }", "1", 60, DEFAULT_LIMITS));
    const resume = cdp.calls.filter((c) => c.method === "Debugger.resume");
    expect(resume.map((c) => c.params)).toEqual([{ terminateOnResume: true }]);
    expect(cdp.calls.at(-1)!.method).toBe("Debugger.disable");
    expect(listeners).toHaveLength(0);

    cdp.override = { "Runtime.evaluate": () => new Promise(() => {}) };
    const today = await rejection(evaluateInPage(7, "while (true) {}", 60, DEFAULT_LIMITS));
    expect(got).toEqual(today);
    expect(got.code).toBe(ErrorCodes.TIMEOUT);
  });

  it("a terminated reply (exceptionDetails or a command error) maps to TIMEOUT with today's text", async () => {
    cdp.override["Runtime.callFunctionOn"] = (p) =>
      p.functionDeclaration === CALL_WRAPPER_SRC ? { result: { type: "object" }, exceptionDetails: { text: "Execution was terminated" } } : undefined;
    expect(await rejection(evaluateFunctionInPage(7, "(a) => a", "1", 5000, DEFAULT_LIMITS))).toEqual({ code: ErrorCodes.TIMEOUT, message: timeoutMessage(5000) });
    cdp.override["Runtime.callFunctionOn"] = (p) => (p.functionDeclaration === CALL_WRAPPER_SRC ? Promise.reject(new Error("Execution was terminated")) : undefined);
    expect(await rejection(evaluateFunctionInPage(7, "(a) => a", "1", 5000, DEFAULT_LIMITS))).toEqual({ code: ErrorCodes.TIMEOUT, message: timeoutMessage(5000) });
  });
});

describe("B2.2 JavaScript off: JS_DISABLED for evaluate {args} and evaluateSaveStart {args}, nothing attached or sent", () => {
  function view(o: { armed?: boolean; evaluate?: boolean } = {}): SafetyView {
    return { switches: { armed: o.armed ?? true, evaluate: o.evaluate ?? true }, ctx: { extensionId: "abcdefghijklmnopabcdefghijklmnop", blockList: EMPTY_BLOCK_LIST }, blockedCount: 0 };
  }
  function wire(state: () => SafetyView) {
    const deps: CallSafetyDeps = {
      readState: async () => state(),
      getTab: async () => ({ url: "http://localhost:8080/e2e-playground.html" }),
      replacedBy: () => undefined,
      lastUrl: () => undefined,
    };
    const router = new GatedRouter((method, p) => new CallSafety(method, p, deps));
    router.on("evaluate", evaluate);
    router.on("evaluateSaveStart", evaluateSaveStart);
    return async (method: string, params: Record<string, unknown>) =>
      JSON.parse((await router.handle(JSON.stringify({ id: "1", method, params })))!) as { error?: unknown; result?: unknown };
  }
  const calls: Array<[string, Record<string, unknown>]> = [
    ["evaluate", { tabId: 7, expression: "(a) => a", args: { s: SENT } }],
    ["evaluate", { tabId: 7, expression: "(a) => document.body", args: { s: SENT }, asRef: true }],
    ["evaluateSaveStart", { tabId: 7, expression: "(a) => a", args: { s: SENT } }],
  ];

  it("JavaScript off: exactly {code: JS_DISABLED, message}; attach 0, CDP commands 0", async () => {
    const send = wire(() => view({ evaluate: false }));
    for (const [method, p] of calls) expect((await send(method, p)).error).toEqual({ code: ErrorCodes.JS_DISABLED, message: JS_DISABLED_MESSAGE });
    expect(n).toEqual({ attach: 0, detach: 0, send: 0 });
    expect(m.ensureContent).not.toHaveBeenCalled();
  });

  it("control: JavaScript on, the same calls attach and run", async () => {
    const send = wire(() => view());
    const r = await send("evaluate", calls[0]![1]);
    expect(r.result).toMatchObject({ kind: "json" });
    expect(n.attach).toBe(1);
  });
});

/**
 * Step 8 S2 (phase doc 0.3; stage0-audit.md F21): the `evaluate {asRef}` handler, with `debugger.js`,
 * `inject.js` and `tabs.js` mocked. The CDP half (the composite serialiser that marks) is tested from
 * the shipped string in `evaluate-mark.test.ts`; the live round trip is E2E (SDK-5).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EvalEnvelope } from "@bridge/shared";
import { BridgeError } from "../src/errors.js";
import { DEFAULT_LIMITS } from "../src/evaluate/serialize.js";
import { UNMARK_SRC } from "../src/evaluate/mark.js";

const m = vi.hoisted(() => ({ pageTab: vi.fn(), ensureContent: vi.fn(), callInPage: vi.fn(), evaluateInPage: vi.fn() }));
vi.mock("../src/tabs.js", () => ({ pageTab: m.pageTab }));
vi.mock("../src/inject.js", () => ({ ensureContent: m.ensureContent, callInPage: m.callInPage }));
vi.mock("../src/debugger.js", () => ({ evaluateInPage: m.evaluateInPage }));

import { evaluate } from "../src/handlers/evaluate.js";

let log: string[];
let status: string | undefined;
let evalCalls: Array<{ expression: string; timeoutMs: number; limits: Record<string, unknown> }>;
let refAnswer: () => unknown;
/** The main evaluate call's envelope (before `__mark` is added). */
let mainEnv: EvalEnvelope;

const NODE_ENV: EvalEnvelope = { kind: "node", description: '<button> "Go"', truncated: false };

beforeEach(() => {
  log = [];
  evalCalls = [];
  status = "marked";
  mainEnv = NODE_ENV;
  refAnswer = () => ({ ref: "e5", role: "button", name: "Go" });
  vi.spyOn(console, "log").mockImplementation(() => {});
  m.pageTab.mockImplementation(async (_p: unknown, method: string) => {
    log.push(`pageTab:${method}`);
    return { id: 7 };
  });
  m.ensureContent.mockImplementation(async () => {
    log.push("ensureContent");
  });
  m.evaluateInPage.mockImplementation(async (_t: number, expression: string, timeoutMs: number, limits: Record<string, unknown>) => {
    log.push(expression.startsWith(`(${UNMARK_SRC})(`) ? "evaluate:unmark" : "evaluate");
    evalCalls.push({ expression, timeoutMs, limits });
    if (expression.startsWith(`(${UNMARK_SRC})(`)) return { kind: "json", value: 1, description: "1", truncated: false };
    const env: Record<string, unknown> = { ...mainEnv };
    if (status !== undefined && typeof limits.mark === "string") env.__mark = status;
    return env;
  });
  m.callInPage.mockImplementation(async (_t: number, fn: unknown, args: unknown[]) => {
    log.push(`page:${/__agentBridge!?\.(\w+)/.exec(String(fn))?.[1]}`);
    expect(args).toHaveLength(1);
    return refAnswer();
  });
});
afterEach(() => vi.restoreAllMocks());

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a rejection");
}

describe("evaluate without asRef is unchanged", () => {
  for (const asRef of [undefined, false, "true", 1]) {
    it(`asRef ${JSON.stringify(asRef)}: no ensureContent, DEFAULT_LIMITS itself, no page call`, async () => {
      const env = await evaluate({ tabId: 7, expression: "document.body", asRef });
      expect(env).toEqual(NODE_ENV);
      expect(log).toEqual(["pageTab:evaluate", "evaluate"]);
      expect(evalCalls[0]!.limits).toBe(DEFAULT_LIMITS);
      expect(evalCalls[0]!.expression).toBe("document.body");
    });
  }
});

describe("evaluate {asRef: true}", () => {
  it("ensureContent first, a fresh mark in the limits, refOfMarked(mark) → the envelope with ref, no __mark", async () => {
    const env = await evaluate({ tabId: 7, expression: "return document.querySelector('button')", asRef: true, timeoutMs: 2000 });
    expect(log).toEqual(["pageTab:evaluate", "ensureContent", "evaluate", "page:refOfMarked"]);
    expect(env).toEqual({ ...NODE_ENV, ref: "e5" });
    expect("__mark" in env).toBe(false);
    const { limits, expression, timeoutMs } = evalCalls[0]!;
    expect(timeoutMs).toBe(2000);
    expect(expression).toBe("(async () => {\nreturn document.querySelector('button')\n})()");
    expect(limits).toEqual({ ...DEFAULT_LIMITS, mark: expect.any(String) });
    expect((limits.mark as string).length).toBeGreaterThan(10);
    const pageArgs = m.callInPage.mock.calls[0]![2] as unknown[];
    expect(pageArgs).toEqual([limits.mark]);
  });

  it("each call uses a new mark", async () => {
    await evaluate({ tabId: 7, expression: "x", asRef: true });
    await evaluate({ tabId: 7, expression: "x", asRef: true });
    expect(evalCalls[0]!.limits.mark).not.toBe(evalCalls[1]!.limits.mark);
  });

  it("a failing ensureContent fails before anything is evaluated", async () => {
    m.ensureContent.mockRejectedValueOnce(new BridgeError("RESTRICTED_URL", "no"));
    const e = await rejection(evaluate({ tabId: 7, expression: "x", asRef: true }));
    expect(e.code).toBe("RESTRICTED_URL");
    expect(m.evaluateInPage).not.toHaveBeenCalled();
  });

  // Fix round 1 (S2-verifier finding 1): the absent-status row now uses the envelopes it really
  // arrives with — a primitive, null or undefined (the serialiser never ran, nothing was marked). An
  // absent status with the "other" fallback envelope is the lost-reply case, tested below.
  const PRIMITIVE: EvalEnvelope = { kind: "json", value: 3, description: "3", truncated: false };
  const NULL_ENV: EvalEnvelope = { kind: "json", value: null, description: "null", truncated: false };
  const UNDEF_ENV: EvalEnvelope = { kind: "undefined", description: "undefined", truncated: false };
  const refusals: Array<[string | undefined, EvalEnvelope, string, string]> = [
    ["not-element", NODE_ENV, "BAD_PARAMS", "asRef needs an Element; the value is not one"],
    ["not-element", { kind: "other", description: "Foo", truncated: false }, "BAD_PARAMS", "asRef needs an Element; the value is not one"],
    [undefined, PRIMITIVE, "BAD_PARAMS", "asRef needs an Element; the value is not one"],
    [undefined, NULL_ENV, "BAD_PARAMS", "asRef needs an Element; the value is not one"],
    [undefined, UNDEF_ENV, "BAD_PARAMS", "asRef needs an Element; the value is not one"],
    ["detached", NODE_ENV, "REF_STALE", "asRef: the element is not attached to the document"],
    ["closed-shadow", NODE_ENV, "BAD_PARAMS", "asRef: the element is in a closed shadow root, which the content script cannot reach"],
  ];
  for (const [st, envelope, code, message] of refusals) {
    it(`status ${String(st)} with kind ${envelope.kind} → ${code}, no page call, no cleanup`, async () => {
      status = st;
      mainEnv = envelope;
      const e = await rejection(evaluate({ tabId: 7, expression: "secretExpr", asRef: true }));
      expect(e.code).toBe(code);
      expect(e.message).toBe(message);
      expect(e.message).not.toContain("secretExpr");
      expect(log).toEqual(["pageTab:evaluate", "ensureContent", "evaluate"]);
    });
  }

  it("no status with the 'other' fallback envelope (the serialiser's reply was lost) → sweep, then INTERNAL", async () => {
    status = undefined;
    mainEnv = { kind: "other", description: "button#b", truncated: false };
    const e = await rejection(evaluate({ tabId: 7, expression: "secretExpr", asRef: true }));
    expect(e.code).toBe("INTERNAL");
    expect(e.message).toBe("asRef: the in-page serialiser's reply was lost; any mark was removed");
    expect(e.message).not.toContain("secretExpr");
    expect(e.message).not.toContain("button#b");
    expect(log).toEqual(["pageTab:evaluate", "ensureContent", "evaluate", "evaluate:unmark"]);
    expect(evalCalls[1]!.expression).toBe(`(${UNMARK_SRC})(${JSON.stringify(evalCalls[0]!.limits.mark)})`);
    expect(evalCalls[1]!.limits).toBe(DEFAULT_LIMITS);
  });

  it("the verifier's scenario: the serialiser marks, its reply is lost → the mark is swept, INTERNAL not BAD_PARAMS", async () => {
    // A fake page: the composite serialiser sets the attribute, then its CDP reply loses the race, so
    // `shapeEvaluateResult` falls back to {kind:"other"} without `__mark`. The unmark sweep removes it.
    const pageMarks = new Set<string>();
    m.evaluateInPage.mockImplementation(async (_t: number, expression: string, timeoutMs: number, limits: Record<string, unknown>) => {
      evalCalls.push({ expression, timeoutMs, limits });
      const prefix = `(${UNMARK_SRC})(`;
      if (expression.startsWith(prefix)) {
        log.push("evaluate:unmark");
        pageMarks.delete(JSON.parse(expression.slice(prefix.length, -1)) as string);
        return { kind: "json", value: 1, description: "1", truncated: false };
      }
      log.push("evaluate");
      pageMarks.add(limits.mark as string); // marked page-side …
      return { kind: "other", description: "button#b", truncated: false }; // … but the reply was lost
    });
    const e = await rejection(evaluate({ tabId: 7, expression: "x", asRef: true, timeoutMs: 200 }));
    expect(e.code).toBe("INTERNAL");
    expect(pageMarks.size).toBe(0);
    expect(m.callInPage).not.toHaveBeenCalled();
  });

  it("a failing lost-reply sweep is swallowed: still INTERNAL", async () => {
    status = undefined;
    mainEnv = { kind: "other", description: "button#b", truncated: false };
    m.evaluateInPage.mockImplementationOnce(async () => ({ ...mainEnv }));
    m.evaluateInPage.mockImplementationOnce(async () => {
      throw new BridgeError("DEBUGGER_DETACHED", "gone");
    });
    const e = await rejection(evaluate({ tabId: 7, expression: "x", asRef: true }));
    expect(e.code).toBe("INTERNAL");
    expect(m.evaluateInPage).toHaveBeenCalledTimes(2);
  });

  it("refOfMarked failing → best-effort unmark with the same mark, then the original error", async () => {
    const original = new BridgeError("REF_STALE", "gone");
    refAnswer = () => {
      throw original;
    };
    const e = await rejection(evaluate({ tabId: 7, expression: "x", asRef: true }));
    expect(e).toBe(original);
    expect(log).toEqual(["pageTab:evaluate", "ensureContent", "evaluate", "page:refOfMarked", "evaluate:unmark"]);
    expect(evalCalls[1]!.expression).toBe(`(${UNMARK_SRC})(${JSON.stringify(evalCalls[0]!.limits.mark)})`);
  });

  it("a failing cleanup is swallowed: the original error still wins", async () => {
    const original = new BridgeError("INTERNAL", "inject failed");
    refAnswer = () => {
      throw original;
    };
    m.evaluateInPage.mockImplementationOnce(async (_t: number, _e: string, _ms: number, limits: Record<string, unknown>) => ({
      ...NODE_ENV,
      __mark: typeof limits.mark === "string" ? "marked" : undefined,
    }));
    m.evaluateInPage.mockImplementationOnce(async () => {
      throw new BridgeError("DEBUGGER_DEVTOOLS", "busy");
    });
    expect(await rejection(evaluate({ tabId: 7, expression: "x", asRef: true }))).toBe(original);
  });

  it("logs only the expression length, never the expression or the mark", async () => {
    const spy = console.log as unknown as ReturnType<typeof vi.fn>;
    await evaluate({ tabId: 7, expression: "secretExpr", asRef: true });
    const text = JSON.stringify(spy.mock.calls);
    expect(text).not.toContain("secretExpr");
    expect(text).not.toContain(evalCalls[0]!.limits.mark as string);
  });
});

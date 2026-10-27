/**
 * Step 12 S2a (decisions.md #330, #331; Stage0-measurer3.md §5; spec §10's Step 12 note): the CDP steps of a call
 * with `args` (`evaluate/call.ts`) over a scripted CDP — the order of the six steps, the pause-terminate bound at the
 * deadline (terminate only the function's own script, plain resume otherwise, nothing without a paused event),
 * `Debugger.disable` on every path, and the race's TIMEOUT re-thrown unchanged.
 */
import { describe, it, expect } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { CALL_WRAPPER_SRC, callWithArgs, functionSourceParams, notAFunctionMessage, type ArgsCallDeps, type PausedEvent } from "../src/evaluate/call.js";
import { raceTimeout } from "../src/debugger.js";
import { BridgeError, toWireError } from "../src/errors.js";

type Call = { method: string; params: Record<string, unknown> };
type Reply = (params: Record<string, unknown>) => unknown | Promise<unknown>;

const FN_SCRIPT = "41";
const never = () => new Promise<never>(() => {});

function scripted(o: { replies?: Record<string, Reply>; paused?: PausedEvent | undefined; deadlineMs?: number } = {}) {
  const calls: Call[] = [];
  let listening = 0;
  const base: Record<string, Reply> = {
    "Debugger.enable": () => ({ debuggerId: "d" }),
    "Debugger.setBreakpointsActive": () => ({}),
    "Runtime.evaluate": (p) =>
      p.expression === "globalThis" ? { result: { type: "object", objectId: "g1" } } : { result: { type: "function", objectId: "f1" } },
    "Runtime.getProperties": () => ({
      result: [],
      internalProperties: [{ name: "[[FunctionLocation]]", value: { type: "object", subtype: "internal#location", value: { scriptId: FN_SCRIPT, lineNumber: 0 } } }],
    }),
    "Runtime.callFunctionOn": () => ({ result: { type: "number", value: 3 } }),
    "Debugger.pause": () => ({}),
    "Debugger.resume": () => ({}),
    "Debugger.disable": () => ({}),
  };
  const replies = { ...base, ...o.replies };
  const deps: ArgsCallDeps = {
    send: async (method, params) => {
      calls.push({ method, params });
      const r = replies[method];
      if (!r) throw new Error(`unexpected ${method}`);
      return r(params);
    },
    race: (p) => raceTimeout(p, o.deadlineMs ?? 1000, "Timed out (test)"),
    waitPaused: async () => {
      listening++;
      return "paused" in o ? o.paused : undefined;
    },
    pauseWaitMs: 20,
  };
  return { deps, calls, methods: () => calls.map((c) => c.method), listening: () => listening };
}

const run = (deps: ArgsCallDeps, then = async (raw: unknown) => raw) => callWithArgs("(a) => a.n", '{"n":3}', 5000, deps, then as never);

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a rejection");
}

describe("the six steps, in order, on success", () => {
  it("enable → breakpoints off → source → scriptId → globalThis → the wrapper call → then → disable", async () => {
    const s = scripted();
    const order: string[] = [];
    const out = await run(s.deps, async (raw) => {
      order.push(`then:${s.calls.length}`);
      return raw;
    });
    expect(out).toEqual({ result: { type: "number", value: 3 } });
    expect(s.methods()).toEqual([
      "Debugger.enable",
      "Debugger.setBreakpointsActive",
      "Runtime.evaluate",
      "Runtime.getProperties",
      "Runtime.evaluate",
      "Runtime.callFunctionOn",
      "Debugger.disable",
    ]);
    expect(order).toEqual(["then:6"]); // shaped before the disable
    expect(s.calls[1]!.params).toEqual({ active: false });
    expect(s.calls[2]!.params).toEqual(functionSourceParams("(a) => a.n", 5000));
    expect(s.calls[2]!.params).toMatchObject({ expression: "((a) => a.n\n)", userGesture: true, timeout: 5000, returnByValue: false });
    expect(s.calls[2]!.params).not.toHaveProperty("replMode");
    expect(s.calls[5]!.params).toEqual({
      objectId: "g1",
      functionDeclaration: CALL_WRAPPER_SRC,
      arguments: [{ objectId: "f1" }, { value: '{"n":3}' }],
      awaitPromise: true,
      returnByValue: false,
      userGesture: true,
      generatePreview: false,
    });
    expect(s.listening()).toBe(0); // no pause, no listener
  });

  it("the wrapper is the measured fixed source", () => {
    expect(CALL_WRAPPER_SRC).toBe("function (fn, json) { return fn(JSON.parse(json)); }");
  });
});

describe("the deadline: pause, then terminate only the function's own script", () => {
  const timedOut = (paused: PausedEvent | undefined) =>
    scripted({ replies: { "Runtime.callFunctionOn": never }, paused, deadlineMs: 30 });

  it("a paused frame in the function's script → resume {terminateOnResume:true}; the race's TIMEOUT unchanged", async () => {
    const s = timedOut({ callFrames: [{ location: { scriptId: "7" } }, { location: { scriptId: FN_SCRIPT } }] });
    const err = await rejection(run(s.deps));
    expect(err.code).toBe(ErrorCodes.TIMEOUT);
    expect(err.message).toBe("Timed out (test)");
    expect(s.methods().slice(5)).toEqual(["Runtime.callFunctionOn", "Debugger.pause", "Debugger.resume", "Debugger.disable"]);
    expect(s.calls[7]!.params).toEqual({ terminateOnResume: true });
    expect(s.listening()).toBe(1);
  });

  it("paused elsewhere (the page's own next task) → a plain resume", async () => {
    const s = timedOut({ callFrames: [{ location: { scriptId: "7" } }] });
    expect((await rejection(run(s.deps))).code).toBe(ErrorCodes.TIMEOUT);
    expect(s.methods().slice(6)).toEqual(["Debugger.pause", "Debugger.resume", "Debugger.disable"]);
    expect(s.calls[7]!.params).toEqual({});
  });

  it("no paused event within the short wait → no resume, then disable", async () => {
    const s = timedOut(undefined);
    expect((await rejection(run(s.deps))).code).toBe(ErrorCodes.TIMEOUT);
    expect(s.methods().slice(6)).toEqual(["Debugger.pause", "Debugger.disable"]);
  });

  it("no [[FunctionLocation]] → never terminates (a plain resume)", async () => {
    const s = scripted({
      replies: { "Runtime.callFunctionOn": never, "Runtime.getProperties": () => ({ result: [] }) },
      paused: { callFrames: [{ location: { scriptId: FN_SCRIPT } }] },
      deadlineMs: 30,
    });
    expect((await rejection(run(s.deps))).code).toBe(ErrorCodes.TIMEOUT);
    expect(s.calls.find((c) => c.method === "Debugger.resume")!.params).toEqual({});
  });

  it("a stop step that throws or hangs never masks the TIMEOUT, and disable still runs", async () => {
    const s = scripted({
      replies: { "Runtime.callFunctionOn": never, "Debugger.pause": () => Promise.reject(new Error("x")), "Debugger.resume": never },
      paused: { callFrames: [{ location: { scriptId: FN_SCRIPT } }] },
      deadlineMs: 30,
    });
    expect((await rejection(run(s.deps))).code).toBe(ErrorCodes.TIMEOUT);
    expect(s.methods().slice(-1)).toEqual(["Debugger.disable"]);
  });

  it("a deadline before the call (e.g. on the source step) does not pause", async () => {
    const s = scripted({ replies: { "Runtime.getProperties": never }, deadlineMs: 30 });
    expect((await rejection(run(s.deps))).code).toBe(ErrorCodes.TIMEOUT);
    expect(s.methods()).not.toContain("Debugger.pause");
    expect(s.methods().slice(-1)).toEqual(["Debugger.disable"]);
  });
});

describe("Debugger.disable on every other path", () => {
  it("a page exception in the call → the result goes to `then` (it shapes PAGE_ERROR); disable after", async () => {
    const s = scripted({ replies: { "Runtime.callFunctionOn": () => ({ result: { type: "object" }, exceptionDetails: { text: "Uncaught" } }) } });
    await rejection(run(s.deps, async () => Promise.reject(new BridgeError(ErrorCodes.PAGE_ERROR, "boom"))));
    expect(s.methods().slice(-1)).toEqual(["Debugger.disable"]);
  });

  it("a thrown CDP error on the call → that error; disable after", async () => {
    const s = scripted({ replies: { "Runtime.callFunctionOn": () => Promise.reject(new Error("Detached while handling command.")) } });
    expect((await rejection(run(s.deps))).message).toBe("Detached while handling command.");
    expect(s.methods().slice(-2)).toEqual(["Runtime.callFunctionOn", "Debugger.disable"]);
  });

  it("Debugger.enable itself failing → that error; disable still sent", async () => {
    const s = scripted({ replies: { "Debugger.enable": () => Promise.reject(new Error("enable failed")) } });
    expect((await rejection(run(s.deps))).message).toBe("enable failed");
    expect(s.methods()).toEqual(["Debugger.enable", "Debugger.disable"]);
  });

  it("a syntax error in the source → PAGE_ERROR; no call; disable", async () => {
    const s = scripted({
      replies: { "Runtime.evaluate": () => ({ result: { type: "object" }, exceptionDetails: { text: "Uncaught SyntaxError: Unexpected token" } }) },
    });
    const err = await rejection(run(s.deps));
    expect(err.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(s.methods()).toEqual(["Debugger.enable", "Debugger.setBreakpointsActive", "Runtime.evaluate", "Debugger.disable"]);
  });

  it("a source that is not a function → BAD_PARAMS naming the type only; no call; disable", async () => {
    const s = scripted({ replies: { "Runtime.evaluate": () => ({ result: { type: "number", value: 4242 } }) } });
    const err = await rejection(run(s.deps));
    expect(toWireError(err)).toEqual({ code: ErrorCodes.BAD_PARAMS, message: notAFunctionMessage("number") });
    expect(err.message).toBe('args: with args, expression must be a function source such as "(a) => a.rows.length"; it evaluated to number');
    expect(err.message).not.toContain("4242");
    expect(s.methods()).not.toContain("Runtime.callFunctionOn");
    expect(s.methods().slice(-1)).toEqual(["Debugger.disable"]);
  });

  it("an odd type word is not echoed", () => {
    expect(notAFunctionMessage("SECRET value!")).toMatch(/it evaluated to something else$/);
  });
});

describe("the extension's hello lists evaluateArgs (#332)", () => {
  it("helloFrame sends features: [\"evaluateArgs\"], with or without a session, and stays a valid hello", async () => {
    const { helloFrame, EXTENSION_FEATURES } = await import("../src/client.js");
    const { isHello } = await import("@bridge/shared");
    expect(EXTENSION_FEATURES).toEqual(["evaluateArgs"]);
    for (const h of [JSON.parse(helloFrame("tok")), JSON.parse(helloFrame("tok", "m-1"))]) {
      expect(h.features).toEqual(["evaluateArgs"]);
      expect(h.proto).toBe(2);
      expect(isHello(h)).toBe(true);
    }
  });
});

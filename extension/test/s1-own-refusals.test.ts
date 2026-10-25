// @vitest-environment jsdom
/**
 * Step 11 S1 (phase doc 0.14 (a), exit check R.1; decisions.md #229, #244 (a) as reworded by #246): the
 * bridge's own refusals raised on purpose inside `withDebugger` — the `saveTo` value refusals of
 * `evaluate/save.ts` (BAD_PARAMS, the cap, and the PAGE_ERROR of a throwing `JSON.stringify`) — reach the wire
 * with their message unchanged, through an explicit marker that `describeDebuggerError` passes through. A page
 * error (`pageError`, EVAL-5), `raceTimeout`'s TIMEOUT, a raw Chrome error and an own error WITHOUT the marker
 * keep the `[chrome.debugger] ` prefix.
 *
 * The chain is the shipped one: `evaluateToSave` (`debugger.ts`) → `withDebugger` → `runWithDebugger` →
 * `debuggerError` → `toWireError`, over a stubbed `chrome.debugger` whose `sendCommand` is the fake CDP of the
 * S4 tests (the shipped page-function sources run in jsdom).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { evaluateToSave } from "../src/debugger.js";
import { describeDebuggerError, markOwnRefusal, timeoutMessage } from "../src/debugger-errors.js";
import { BridgeError, toWireError } from "../src/errors.js";
import { collectSaveText, STRINGIFY_FAILED_MESSAGE } from "../src/evaluate/save.js";
import { tooLargeError } from "../src/evaluate-save-store.js";
import { FakeCdp } from "./s4-fake-cdp.js";

const PREFIX = "[chrome.debugger] ";

type Send = (method: string, params: Record<string, unknown>) => Promise<unknown>;

/** `chrome.debugger` stubbed: attach/detach succeed; `sendCommand` goes to `send`. */
function stubChrome(send: Send): void {
  (globalThis as { chrome?: unknown }).chrome = {
    debugger: {
      attach: async () => {},
      detach: async () => {},
      sendCommand: (_target: unknown, method: string, params: Record<string, unknown>) => send(method, params),
    },
  };
}

let saved: unknown;
beforeEach(() => {
  saved = (globalThis as { chrome?: unknown }).chrome;
});
afterEach(() => {
  (globalThis as { chrome?: unknown }).chrome = saved;
});

/** The wire error of one `evaluateSaveStart` CDP leg through the shipped `evaluateToSave`. */
async function wireOf(send: Send, timeoutMs = 10_000) {
  stubChrome(send);
  const err = await evaluateToSave(7, "expr", timeoutMs).then(
    () => {
      throw new Error("expected a refusal");
    },
    (e: unknown) => e,
  );
  return toWireError(err);
}

async function wireOfValue(completion: () => unknown) {
  return wireOf(new FakeCdp(completion).send);
}

/** The same leg's error before `withDebugger` maps it (what the code throws). */
async function rawOf(completion: () => unknown): Promise<BridgeError> {
  const cdp = new FakeCdp(completion);
  return collectSaveText("expr", 10_000, { send: cdp.send }).then(
    () => {
      throw new Error("expected a refusal");
    },
    (e: unknown) => e as BridgeError,
  );
}

describe("R.1 the saveTo refusals reach the wire unprefixed, message equal to the throwing constant", () => {
  const BAD_PARAMS_CASES: Array<[string, () => unknown, string]> = [
    ["undefined (primitive path)", () => undefined, "The value is undefined — nothing to save"],
    ["undefined (promise path)", () => Promise.resolve(undefined), "The value is undefined — nothing to save"],
    ["a function", () => () => 1, "The value is a function, which is not saveable — return a string or plain JSON data"],
    ["a symbol", () => Promise.resolve(Symbol("s")), "The value is a symbol, which is not saveable — return a string or plain JSON data"],
    ["a Map", () => new Map([[1, 2]]), "The value is a Map, which JSON turns into {} — not saveable; convert it first (e.g. Object.fromEntries(map))"],
    ["a Set", () => new Set([1]), "The value is a Set, which JSON turns into {} — not saveable; convert it first (e.g. [...set])"],
    ["a DOM node", () => document.createElement("div"), "The value is a DOM node, which is not saveable — return its text or HTML (e.g. el.outerHTML)"],
    ["JSON.stringify gives nothing", () => ({ toJSON: () => undefined }), "JSON.stringify gives nothing for the value — nothing to save"],
  ];
  for (const [name, completion, message] of BAD_PARAMS_CASES) {
    it(`${name} → BAD_PARAMS "${message.slice(0, 32)}…"`, async () => {
      expect(await wireOfValue(completion)).toEqual({ code: ErrorCodes.BAD_PARAMS, message });
    });
  }

  it("a throwing JSON.stringify (object path) → PAGE_ERROR STRINGIFY_FAILED_MESSAGE with its data", async () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(await wireOfValue(() => cyclic)).toEqual({ code: ErrorCodes.PAGE_ERROR, message: STRINGIFY_FAILED_MESSAGE, data: { name: "TypeError" } });
  });

  it("a BigInt (primitive path) → PAGE_ERROR STRINGIFY_FAILED_MESSAGE with its data", async () => {
    expect(await wireOfValue(() => 10n)).toEqual({ code: ErrorCodes.PAGE_ERROR, message: STRINGIFY_FAILED_MESSAGE, data: { name: "TypeError" } });
  });

  it("a value over the cap → BAD_PARAMS tooLargeError's text (object and primitive paths)", async () => {
    const big = "x".repeat(11);
    for (const completion of [() => Promise.resolve(big), () => big]) {
      const cdp = new FakeCdp(completion);
      const err = await collectSaveText("expr", 10_000, { send: cdp.send, maxUnits: 10 }).then(
        () => {
          throw new Error("expected a refusal");
        },
        (e: unknown) => e,
      );
      expect(describeDebuggerError(err, "browser_evaluate")).toEqual({ code: ErrorCodes.BAD_PARAMS, message: tooLargeError(10).message });
    }
  });
});

describe("R.1 everything else thrown inside withDebugger keeps the prefix (EVAL-5 unchanged)", () => {
  it("a page error (a throwing expression) → PAGE_ERROR `[chrome.debugger] <pageError's text>`", async () => {
    const thrower = () => {
      throw new Error("boom");
    };
    const raw = await rawOf(thrower);
    expect(raw.code).toBe(ErrorCodes.PAGE_ERROR);
    const wire = await wireOfValue(thrower);
    expect(wire.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(wire.message).toBe(`${PREFIX}${raw.message}`);
    expect(wire.message).toContain("Error: boom");
  });

  it("a rejected promise → PAGE_ERROR, prefixed", async () => {
    const wire = await wireOfValue(() => Promise.reject(new Error("boom in page")));
    expect(wire.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(wire.message.startsWith(PREFIX)).toBe(true);
  });

  it("raceTimeout's TIMEOUT (an idle evaluation) → TIMEOUT `[chrome.debugger] <timeoutMessage>`", async () => {
    const wire = await wireOf(() => new Promise(() => {}), 50);
    expect(wire).toEqual({ code: ErrorCodes.TIMEOUT, message: `${PREFIX}${timeoutMessage(50)}` });
  });

  it("a raw Chrome error → DEBUGGER_ATTACH `[chrome.debugger] <its text>`", async () => {
    const wire = await wireOf(async () => {
      throw new Error("Something odd happened");
    });
    expect(wire).toEqual({ code: ErrorCodes.DEBUGGER_ATTACH, message: `${PREFIX}Something odd happened` });
  });

  it("the bridge's own INTERNAL failures inside the save leg (not refusals) keep the prefix", async () => {
    const cdp = new FakeCdp(() => ({ a: 1 }));
    const wire = await wireOf(async (method, params) => {
      if (method === "Runtime.callFunctionOn" && params.functionDeclaration !== undefined && String(params.functionDeclaration).includes("[this.s.length")) {
        return { result: { type: "object", value: "garbled" } };
      }
      return cdp.send(method, params);
    });
    expect(wire.code).toBe(ErrorCodes.INTERNAL);
    expect(wire.message).toBe(`${PREFIX}The in-page holder of the value could not be read; nothing was saved`);
  });
});

describe("the marker (describeDebuggerError, pure)", () => {
  it("a marked own BridgeError passes through with code, message and data unchanged", () => {
    const e = markOwnRefusal(new BridgeError("PAGE_ERROR", "fixed text", { name: "TypeError" }));
    expect(describeDebuggerError(e, "browser_evaluate")).toEqual({ code: "PAGE_ERROR", message: "fixed text", data: { name: "TypeError" } });
    const b = markOwnRefusal(new BridgeError("BAD_PARAMS", "another fixed text"));
    const d = describeDebuggerError(b, "browser_evaluate");
    expect(d).toEqual({ code: "BAD_PARAMS", message: "another fixed text" });
    expect("data" in d).toBe(false);
  });

  it("markOwnRefusal returns the same error object", () => {
    const e = new BridgeError("BAD_PARAMS", "x");
    expect(markOwnRefusal(e)).toBe(e);
  });

  it("the marker cannot be copied by shape: an unmarked twin, or one carrying the marked error's own keys, keeps the prefix", () => {
    const marked = markOwnRefusal(new BridgeError("BAD_PARAMS", "fixed text"));
    const twin = Object.assign(new BridgeError("BAD_PARAMS", "fixed text"), { ...marked });
    expect(describeDebuggerError(twin, "browser_evaluate").message).toBe(`${PREFIX}fixed text`);
  });

  it("a marked raw (non-Bridge) Error is not passed through: only own coded errors are", () => {
    const e = markOwnRefusal(new Error("Something odd happened"));
    expect(describeDebuggerError(e)).toEqual({ code: "DEBUGGER_ATTACH", message: `${PREFIX}Something odd happened` });
  });

  it("an unmarked own PAGE_ERROR and TIMEOUT keep today's prefixed text (EVAL-5)", () => {
    expect(describeDebuggerError(new BridgeError("PAGE_ERROR", "Error: boom", { name: "Error" }), "browser_evaluate")).toEqual({
      code: "PAGE_ERROR",
      message: `${PREFIX}Error: boom`,
      data: { name: "Error" },
    });
    expect(describeDebuggerError(new BridgeError("TIMEOUT", timeoutMessage(1000)), "browser_evaluate").message).toBe(`${PREFIX}${timeoutMessage(1000)}`);
  });
});

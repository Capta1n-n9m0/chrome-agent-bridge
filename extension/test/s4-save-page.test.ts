// @vitest-environment jsdom
/**
 * Step 10 S4 (Stage 0 F2, F12; decisions.md #205, #207): the CDP leg of `evaluateSaveStart`. The value is
 * validated and JSON.stringify'd IN THE PAGE by a closure-free page function, kept on a holder object
 * (by objectId), and read out in slices of ≤ 1 MiB of code units — so on the object and promise paths no
 * single CDP reply carries the whole value. The page functions are the shipped source strings, run here
 * through a fake CDP that executes them (`new Function`), as `SERIALIZER_SRC` is tested.
 */
import { describe, it, expect } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import {
  SAVE_META_SRC,
  SAVE_PREPARE_SRC,
  SAVE_SLICE_SRC,
  SAVE_SLICE_UNITS,
  collectSaveText,
  primitiveSaveText,
  saveEvaluateParams,
} from "../src/evaluate/save.js";
import { FakeCdp } from "./s4-fake-cdp.js";

async function collect(completion: () => unknown, o: { sliceUnits?: number; maxUnits?: number } = {}) {
  const cdp = new FakeCdp(completion);
  const out = await collectSaveText("expr", 10_000, { send: cdp.send, ...o });
  return { cdp, out };
}

async function refusal(completion: () => unknown, o: { sliceUnits?: number; maxUnits?: number } = {}) {
  const cdp = new FakeCdp(completion);
  const err = await collectSaveText("expr", 10_000, { send: cdp.send, ...o }).then(
    () => {
      throw new Error("expected a refusal");
    },
    (e: unknown) => e as { code?: string; message: string },
  );
  return { cdp, err };
}

describe("the page functions are self-contained source strings", () => {
  for (const [name, src] of [["SAVE_PREPARE_SRC", SAVE_PREPARE_SRC], ["SAVE_META_SRC", SAVE_META_SRC], ["SAVE_SLICE_SRC", SAVE_SLICE_SRC]] as const) {
    it(`${name}: a function expression with no import/require/chrome reference`, () => {
      expect(src).not.toMatch(/\b(import|export|require)\b/);
      expect(src).not.toMatch(/\bchrome\./);
      expect(typeof new Function(`return (${src})`)()).toBe("function");
    });
  }

  it("slices of 1 MiB of code units by default", () => {
    expect(SAVE_SLICE_UNITS).toBe(1_048_576);
  });

  it("Runtime.evaluate is sent with evaluate's own parameters (replMode, awaitPromise, by objectId)", () => {
    expect(saveEvaluateParams("1+1", 2500)).toEqual({
      expression: "1+1",
      replMode: true,
      awaitPromise: true,
      returnByValue: false,
      userGesture: true,
      timeout: 2500,
      generatePreview: false,
    });
  });
});

describe("collectSaveText — the object and promise paths (sliced on the CDP leg)", () => {
  it("a string resolved by a promise: kept as is, kind string", async () => {
    const { out } = await collect(() => Promise.resolve("héllo"));
    expect(out).toEqual({ text: "héllo", kind: "string" });
  });

  it("an object: JSON.stringify'd in the page, kind json — no serialiser limits (items, depth, maxString)", async () => {
    const value = { long: "x".repeat(12_000), many: Array.from({ length: 500 }, (_, i) => i), deep: { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } } };
    const { out } = await collect(() => value);
    expect(out).toEqual({ text: JSON.stringify(value), kind: "json" });
  });

  it("a promise of an object; a promise of a number", async () => {
    expect((await collect(() => Promise.resolve([1, "é", null]))).out).toEqual({ text: '[1,"é",null]', kind: "json" });
    expect((await collect(() => Promise.resolve(42))).out).toEqual({ text: "42", kind: "json" });
  });

  it("no CDP reply carries the whole value; the slices rejoin it exactly, surrogate pairs included", async () => {
    const value = "ab😀cd😀😀e" + "é€😀".repeat(20) + "z";
    const { cdp, out } = await collect(() => Promise.resolve(value), { sliceUnits: 5 });
    expect(out.text).toBe(value);
    expect(Math.max(...cdp.replySizes)).toBeLessThan(value.length);
    expect(cdp.slices()).toBeGreaterThan(value.length / 5 - 1);
    // The completion value and the holder are both released.
    expect(cdp.objects.size).toBe(0);
  });

  it("a slice never ends between the two halves of a surrogate pair", () => {
    const slice = new Function(`return (${SAVE_SLICE_SRC})`)() as (o: number, n: number) => string;
    const holder = { s: "abc😀d" }; // the pair is at 3..4
    expect(slice.call(holder, 0, 4)).toBe("abc"); // would split the pair: shortened by one
    expect(slice.call(holder, 3, 2)).toBe("😀");
    expect(slice.call(holder, 0, 100)).toBe("abc😀d");
    expect(slice.call({ s: "😀" }, 0, 1)).toBe("\ud83d"); // a one-unit slice cannot shrink (progress first)
  });

  it("a rejected promise is PAGE_ERROR (the page's own exception, as evaluate reports it)", async () => {
    const { err } = await refusal(() => Promise.reject(new Error("boom in page")));
    expect(err.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(err.message).toContain("boom in page");
  });

  it("a throwing expression is PAGE_ERROR", async () => {
    const { err } = await refusal(() => {
      throw new TypeError("bad thing");
    });
    expect(err.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(err.message).toContain("bad thing");
  });
});

describe("collectSaveText — refusals: nothing to save, not saveable (F12), nothing read out", () => {
  const cases: Array<[string, () => unknown]> = [
    ["undefined (via a promise)", () => Promise.resolve(undefined)],
    ["a function", () => function f() {}],
    ["a symbol", () => Symbol("s")],
    ["a Map", () => new Map([["k", 1]])],
    ["a Set", () => new Set([1])],
    ["a DOM node", () => document.createElement("div")],
    ["a promise of a DOM node", () => Promise.resolve(document.body)],
    ["a value whose toJSON gives undefined", () => ({ toJSON: () => undefined })],
  ];
  for (const [label, completion] of cases) {
    it(`${label} → BAD_PARAMS, no slice read, holder released`, async () => {
      const { cdp, err } = await refusal(completion);
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(cdp.slices()).toBe(0);
      expect(cdp.objects.size).toBe(0);
    });
  }

  it("JSON.stringify throws (a cycle) → PAGE_ERROR whose message echoes nothing of the value", async () => {
    const v: Record<string, unknown> = { SENTINELKEYQ9: "SENTINELVALUEZ4" };
    v.self = v;
    const { cdp, err } = await refusal(() => v);
    expect(err.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(err.message).not.toMatch(/SENTINEL/i);
    expect(JSON.stringify(err)).not.toMatch(/SENTINEL/i);
    expect(cdp.slices()).toBe(0);
  });

  it("a BigInt inside an object → PAGE_ERROR (JSON.stringify throws)", async () => {
    const { err } = await refusal(() => ({ n: 10n }));
    expect(err.code).toBe(ErrorCodes.PAGE_ERROR);
  });

  // S4 fixer round 1, verifier finding 2: the node test is a real Node test, not duck typing.
  it("a plain JSON object with nodeType/nodeName keys is data, not a node — it saves", async () => {
    const value = { nodeType: 1, nodeName: "row", data: "ok" };
    const { out } = await collect(() => value);
    expect(out).toEqual({ text: JSON.stringify(value), kind: "json" });
  });

  it("an object faking only the tag on itself (Symbol.toStringTag = 'Node' as an own key) still saves", async () => {
    const value = { nodeType: 1, nodeName: "x", [Symbol.toStringTag]: "Node" };
    const { out } = await collect(() => value);
    expect(out.kind).toBe("json");
  });

  for (const [label, completion] of [
    ["a real Element", () => document.createElement("div")],
    ["a real Text node", () => document.createTextNode("t")],
    ["the Document", () => document],
    ["a DocumentFragment", () => document.createDocumentFragment()],
  ] as Array<[string, () => unknown]>) {
    it(`${label} → BAD_PARAMS "DOM node"`, async () => {
      const { cdp, err } = await refusal(completion);
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err.message).toMatch(/DOM node/);
      expect(cdp.slices()).toBe(0);
    });
  }

  it("a node from another realm (an iframe's document; instanceof Node is false here) → BAD_PARAMS \"DOM node\"", async () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    try {
      const foreign = frame.contentDocument!.createElement("span");
      expect(foreign instanceof Node).toBe(false);
      const { err } = await refusal(() => foreign);
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err.message).toMatch(/DOM node/);
    } finally {
      frame.remove();
    }
  });

  it("a value over the cap (code units ≤ bytes) → BAD_PARAMS before any slice is read", async () => {
    const { cdp, err } = await refusal(() => Promise.resolve("x".repeat(11)), { maxUnits: 10 });
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toMatch(/over the .* limit/);
    expect(cdp.slices()).toBe(0);
    expect(cdp.objects.size).toBe(0);
  });
});

describe("collectSaveText — a primitive completion value (SPEC-DISCREPANCY F2: it arrives by value)", () => {
  it("a string completion is kept as is (kind string) — CDP put it in Runtime.evaluate's own reply", async () => {
    const { cdp, out } = await collect(() => "plain-string-completion");
    expect(out).toEqual({ text: "plain-string-completion", kind: "string" });
    expect(cdp.slices()).toBe(0);
  });

  it("numbers, booleans and null are JSON.stringify'd as the page would", async () => {
    expect((await collect(() => 42)).out).toEqual({ text: "42", kind: "json" });
    expect((await collect(() => true)).out).toEqual({ text: "true", kind: "json" });
    expect((await collect(() => null)).out).toEqual({ text: "null", kind: "json" });
    expect((await collect(() => NaN)).out).toEqual({ text: "null", kind: "json" });
    expect((await collect(() => -Infinity)).out).toEqual({ text: "null", kind: "json" });
    expect((await collect(() => -0)).out).toEqual({ text: "0", kind: "json" });
  });

  it("undefined → BAD_PARAMS; a BigInt → PAGE_ERROR; a string over the cap → BAD_PARAMS", async () => {
    expect((await refusal(() => undefined)).err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect((await refusal(() => 10n)).err.code).toBe(ErrorCodes.PAGE_ERROR);
    expect((await refusal(() => "x".repeat(11), { maxUnits: 10 })).err.code).toBe(ErrorCodes.BAD_PARAMS);
  });

  it("primitiveSaveText on an unknown remote type → BAD_PARAMS", () => {
    expect(() => primitiveSaveText({ type: "weird" })).toThrow(/not saveable/);
  });
});

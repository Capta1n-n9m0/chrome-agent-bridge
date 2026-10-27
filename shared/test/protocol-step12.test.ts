/**
 * Step 12 S2a (phase doc 0.4 with its Stage 0 note; decisions.md #322, #330, #332; spec §10's Step 12 note): the
 * shared `args` guard `checkEvaluateArgs` (the caps and refusals, fixed messages naming the type or the size, never
 * the value) and the hello's optional `features`.
 */
import { describe, it, expect } from "vitest";
import { checkEvaluateArgs, EVALUATE_ARGS_MAX_BYTES, FEATURE_EVALUATE_ARGS, isHello } from "../src/protocol.js";

const SENT = "SENTINEL-ARGS-K9";

describe("checkEvaluateArgs — accepted values give their exact JSON", () => {
  const ok: Array<[string, unknown]> = [
    ["null top-level", null],
    ["a number", 1e21],
    ["a string with Unicode", "héllo ✓ 日本 🎉"],
    ["nested, key order and nulls kept", { z: null, a: 1, m: { k: null, j: [null, { x: null }] } }],
    ["an array", [0, -0.25, 9007199254740991, true, false, ""]],
    ["a Date (its toJSON is checked)", new Date(0)],
  ];
  for (const [name, v] of ok) {
    it(name, () => {
      expect(checkEvaluateArgs(v)).toEqual({ ok: true, json: JSON.stringify(v) });
    });
  }

  it("exactly 1 MiB of UTF-8 JSON passes; one byte more is refused naming the size only", () => {
    const at = "a".repeat(EVALUATE_ARGS_MAX_BYTES - 2); // + 2 quotes
    expect(checkEvaluateArgs(at)).toMatchObject({ ok: true });
    const over = checkEvaluateArgs(at + "a");
    expect(over).toEqual({ ok: false, message: "args: the value is 1048577 bytes as JSON, over the 1 MiB cap (1048576 bytes)" });
  });

  it("the size counts UTF-8 bytes, not code units", () => {
    const s = "é".repeat(EVALUATE_ARGS_MAX_BYTES / 2); // 2 bytes each, + 2 quotes
    expect(checkEvaluateArgs(s)).toEqual({ ok: false, message: `args: the value is ${EVALUATE_ARGS_MAX_BYTES + 2} bytes as JSON, over the 1 MiB cap (1048576 bytes)` });
  });
});

describe("checkEvaluateArgs — refusals are fixed messages with no part of the value", () => {
  const cyc: Record<string, unknown> = { s: SENT };
  cyc.self = cyc;
  const refused: Array<[string, unknown, string]> = [
    ["undefined top-level", undefined, "args: the value holds undefined, which JSON cannot carry — use null, or leave the key out"],
    ["undefined in a property", { s: SENT, u: undefined }, "args: the value holds undefined, which JSON cannot carry — use null, or leave the key out"],
    ["undefined in an array", [SENT, undefined], "args: the value holds undefined, which JSON cannot carry — use null, or leave the key out"],
    ["a function", { s: SENT, f: () => SENT }, "args: the value holds a function, which JSON cannot carry — pass plain JSON data"],
    ["a symbol", [Symbol(SENT)], "args: the value holds a symbol, which JSON cannot carry — pass plain JSON data"],
    ["a BigInt", { s: SENT, n: 10n }, "args: the value holds a BigInt, which JSON cannot carry — pass it as a string or a number"],
    ["NaN", { s: SENT, n: NaN }, "args: the value holds NaN or an infinite number, which JSON turns into null — pass null or a string"],
    ["Infinity", [-Infinity], "args: the value holds NaN or an infinite number, which JSON turns into null — pass null or a string"],
    ["a cycle", cyc, "args: the value holds a cycle (an object that contains itself), which JSON cannot carry"],
    [
      "a throwing getter",
      { s: SENT, get g() { throw new Error(SENT); } },
      "args: JSON.stringify threw on the value (a throwing toJSON or getter) — pass plain JSON data",
    ],
    ["a toJSON giving undefined", { s: SENT, toJSON: () => undefined }, "args: the value holds undefined, which JSON cannot carry — use null, or leave the key out"],
  ];
  for (const [name, v, message] of refused) {
    it(name, () => {
      const r = checkEvaluateArgs(v);
      expect(r).toEqual({ ok: false, message });
      expect(JSON.stringify(r)).not.toContain(SENT);
    });
  }

  it("an oversized value's refusal holds none of it", () => {
    const r = checkEvaluateArgs({ s: SENT.repeat(70_000) });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(SENT);
  });
});

describe("hello features (#332): optional, an array of strings when present", () => {
  const base = { type: "hello", token: "t", role: "extension", proto: 2 };
  it("valid and absent", () => {
    expect(isHello({ ...base, features: [FEATURE_EVALUATE_ARGS] })).toBe(true);
    expect(isHello({ ...base, features: [] })).toBe(true);
    expect(isHello({ ...base, features: ["evaluateArgs", "other"], session: "s" })).toBe(true);
    expect(isHello(base)).toBe(true);
  });
  it("refused when not an array of strings", () => {
    for (const features of ["evaluateArgs", null, {}, 5, [1], ["a", null], [["a"]]]) {
      expect(isHello({ ...base, features }), JSON.stringify(features)).toBe(false);
    }
  });
  it("the feature name is evaluateArgs", () => {
    expect(FEATURE_EVALUATE_ARGS).toBe("evaluateArgs");
  });
});

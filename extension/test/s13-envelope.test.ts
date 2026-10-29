// @vitest-environment jsdom
/**
 * Step 13 S2 (K2.1, K2.2; decisions.md #386): the serialiser's envelope crosses as one JSON string from a closure-free
 * wrapper around the unchanged `SERIALIZER_SRC`, and `parseEnvelopeText` accepts only the envelope's own keys and
 * types; anything else throws a fixed message, which `shapeEvaluateResult` turns into today's fallback.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_LIMITS, SERIALIZER_JSON_SRC, SERIALIZER_SRC, serializeForAgent } from "../src/evaluate/serialize.js";
import { parseEnvelopeText, shapeEvaluateResult } from "../src/evaluate/result.js";

const wrapper = new Function("return " + SERIALIZER_JSON_SRC)() as (this: unknown, limits: unknown) => unknown;
const SENT = "SENTINEL-ENV-S2";

describe("SERIALIZER_JSON_SRC: the unchanged serialiser inside a wrapper that returns one JSON string", () => {
  it("holds SERIALIZER_SRC byte for byte, its envelope handed to the hand-written JSON writer", () => {
    expect(SERIALIZER_JSON_SRC.startsWith("function bridgeSerializeToJson(limits) {\n  return (function envelopeJsonFn(")).toBe(true);
    expect(SERIALIZER_JSON_SRC.endsWith(")((" + SERIALIZER_SRC + ").call(this, limits));\n}")).toBe(true);
  });

  it("the writer's text is JSON.stringify's, byte for byte, when no page hook is set", () => {
    const page = { m: new Map<unknown, unknown>([["k", [1, { b: 2, a: 1 }]]]), s: new Set([1, "two"]), n: [null, true, -0, 1.5e300, NaN], q: 'quo"te\\\n ', d: new Date(0), deep: { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } }, long: Array.from({ length: 120 }, (_, i) => i) };
    expect(wrapper.call(page, DEFAULT_LIMITS)).toBe(JSON.stringify(serializeForAgent(page)));
  });

  it("page toJSON hooks on Array.prototype and Object.prototype change neither the value nor its order (S2-verifier F1)", () => {
    const page = { a: [1, 2], b: { c: [3], "2": { y: 1, b: 0 } } };
    const plain = wrapper.call(page, DEFAULT_LIMITS) as string;
    const ap = Array.prototype as { toJSON?: unknown };
    const op = Object.prototype as { toJSON?: unknown };
    ap.toJSON = function (this: unknown[]) {
      return "[" + this.join(", ") + "]";
    };
    op.toJSON = () => ({ kind: "json", value: SENT, description: "x", truncated: false });
    let hooked: unknown;
    try {
      hooked = wrapper.call(page, DEFAULT_LIMITS);
    } finally {
      delete ap.toJSON;
      delete op.toJSON;
    }
    const env = parseEnvelopeText(hooked, false);
    expect(JSON.stringify(env.value)).toBe(JSON.stringify(page));
    expect(JSON.parse(hooked as string).value).toEqual(JSON.parse(plain).value);
    expect(Object.keys(env)).toEqual(["kind", "value", "description", "truncated"]);
    // `description` is the serialiser's own page `JSON.stringify(value, null, 2)`, hooked before S2 as after (out of scope).
  });

  it("returns a string that parses to the serialiser's envelope, keys in the page's order at every depth", () => {
    const page = { z: { y: 1, b: { d: 1, c: 2 } }, a: [{ q: 1, c: 2 }, { z: 0, a: 0 }], "10": 1, "2": 2, s: "x\ud800y" };
    const text = wrapper.call(page, DEFAULT_LIMITS);
    expect(typeof text).toBe("string");
    const env = parseEnvelopeText(text, false);
    expect(env).toEqual(serializeForAgent(page));
    expect(Object.keys(env)).toEqual(["kind", "value", "description", "truncated"]);
    expect(JSON.stringify(env.value)).toBe(JSON.stringify(page));
    expect((env.value as { s: string }).s).toBe("x\ud800y"); // a lone surrogate crosses exactly
  });

  it("asRef's mark status rides the string", () => {
    document.body.innerHTML = '<p id="p1">x</p>';
    const env = parseEnvelopeText(wrapper.call(document.getElementById("p1"), { ...DEFAULT_LIMITS, mark: "m-1" }), true) as { __mark?: string };
    expect(env.__mark).toBe("marked");
    expect(document.getElementById("p1")!.getAttribute("data-__bridge-mark")).toBe("m-1");
  });
});

describe("parseEnvelopeText: the shape check", () => {
  const good = { kind: "json", value: { b: 1, a: 2 }, description: "x", truncated: false };
  const bad: Array<[string, unknown]> = [
    ["a page toJSON hook's text", JSON.stringify("HOOKED")],
    ["not JSON", `HOOKED ${SENT}`],
    ["not a string (an object as returnByValue gives it)", good],
    ["undefined", undefined],
    ["null", "null"],
    ["an array", "[]"],
    ["an extra key (ref)", JSON.stringify({ ...good, ref: "e1" })],
    ["an own __proto__ key", `{"kind":"json","value":1,"description":"1","truncated":false,"__proto__":{"ref":"e1"}}`],
    ["a kind the serialiser never sends", JSON.stringify({ ...good, kind: "other" })],
    ["no kind", JSON.stringify({ value: 1, description: "1", truncated: false })],
    ["a description that is not a string", JSON.stringify({ ...good, description: 1 })],
    ["no truncated", JSON.stringify({ kind: "json", value: 1, description: "1" })],
    ["a value beside a kind that has none", JSON.stringify({ kind: "node", value: SENT, description: "div", truncated: false })],
    ["a __mark on a call that asked for none", JSON.stringify({ ...good, __mark: "marked" })],
  ];
  for (const [name, text] of bad) {
    it(`refuses ${name} with a fixed message`, () => {
      expect(() => parseEnvelopeText(text, false)).toThrow(new Error("the serialiser's reply is not an envelope"));
    });
  }

  it("__mark only when a mark was asked for, and always then (S2-verifier F2, F3)", () => {
    const fail = new Error("the serialiser's reply is not an envelope");
    expect(() => parseEnvelopeText(JSON.stringify({ ...good, __mark: "marked" }), false)).toThrow(fail);
    expect(() => parseEnvelopeText(JSON.stringify(good), true)).toThrow(fail);
    expect(() => parseEnvelopeText(JSON.stringify({ ...good, __mark: SENT }), true)).toThrow(fail);
    expect(parseEnvelopeText(JSON.stringify({ ...good, __mark: "marked" }), true)).toEqual({ ...good, __mark: "marked" });
    expect(parseEnvelopeText(JSON.stringify(good), false)).toEqual(good);
  });

  it("accepts each kind the serialiser sends, keys and order as sent", () => {
    expect(Object.keys(parseEnvelopeText(JSON.stringify(good), false).value as object)).toEqual(["b", "a"]);
    for (const env of [
      { kind: "node", description: "div", truncated: false, __mark: "not-element" },
      { kind: "function", description: "() => 1", truncated: false },
      { kind: "error", description: "Error: x", truncated: false },
      { kind: "json", description: "undefined", truncated: true },
    ]) {
      expect(parseEnvelopeText(JSON.stringify(env), "__mark" in env)).toEqual(env);
    }
  });

  it("a refused reply reaches shapeEvaluateResult's fallback, with no part of the text", async () => {
    const raw = { result: { type: "object", objectId: "o1", description: "Object" } };
    const env = await shapeEvaluateResult(raw, { limits: DEFAULT_LIMITS, callFn: () => parseEnvelopeText(`{"kind":"json","value":"${SENT}"}`, false) });
    expect(env).toEqual({ kind: "other", description: "Object", truncated: false });
  });
});

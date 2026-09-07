import { describe, it, expect, vi } from "vitest";
import { shapeEvaluateResult, formatException, type CdpEvaluateResponse } from "../src/evaluate/result.js";
import { DEFAULT_LIMITS } from "../src/evaluate/serialize.js";
import type { EvalEnvelope } from "@bridge/shared";

const limits = DEFAULT_LIMITS;
const envelope: EvalEnvelope = { kind: "json", value: { a: 1 }, description: '{\n  "a": 1\n}', truncated: false };
const shape = (raw: CdpEvaluateResponse, callFn = vi.fn(async () => envelope), maxChars?: number) =>
  shapeEvaluateResult(raw, { limits, callFn, maxChars });

describe("formatException", () => {
  it("uses the exception description, which carries name, message and stack", () => {
    const msg = formatException({
      text: "Uncaught",
      exception: { type: "object", subtype: "error", className: "Error", description: "Error: boom\n    at <anonymous>:1:7" },
    });
    expect(msg).toContain("Error: boom");
    expect(msg).toContain("at <anonymous>:1:7");
  });

  it("handles a thrown non-Error value", () => {
    expect(formatException({ text: "Uncaught", exception: { type: "string", value: "x" } })).toBe("Uncaught x");
  });

  it("uses text plus line/col for a compile-time SyntaxError", () => {
    const msg = formatException({ text: "Uncaught SyntaxError: Unexpected end of input", lineNumber: 0, columnNumber: 4 });
    expect(msg).toBe("Uncaught SyntaxError: Unexpected end of input (line 1, col 5)");
  });

  it("trims the stack to 8 lines and the whole message to 2000 chars", () => {
    const many = ["Error: boom", ...Array.from({ length: 20 }, (_, i) => `    at frame${i}`)].join("\n");
    const msg = formatException({ exception: { type: "object", description: many } });
    expect(msg.split("\n").length).toBe(8);
    expect(msg).toContain("at frame6");
    expect(msg).not.toContain("at frame7");

    const huge = formatException({ exception: { type: "object", description: "E: " + "y".repeat(5000) } });
    expect(huge.length).toBeLessThanOrEqual(2000);
    expect(huge.endsWith("…")).toBe(true);
  });

  it("falls back to a generic message when there is nothing to say", () => {
    expect(formatException({})).toMatch(/uncaught/i);
  });
});

describe("shapeEvaluateResult — primitives", () => {
  it("shapes a number", async () => {
    await expect(shape({ result: { type: "number", value: 42 } })).resolves.toEqual({
      kind: "json",
      value: 42,
      description: "42",
      truncated: false,
    });
  });

  it("shapes a string without adding quotes", async () => {
    const env = await shape({ result: { type: "string", value: "hi" } });
    expect(env.description).toBe("hi");
    expect(env.value).toBe("hi");
  });

  it("shapes a boolean", async () => {
    const env = await shape({ result: { type: "boolean", value: false } });
    expect(env).toEqual({ kind: "json", value: false, description: "false", truncated: false });
  });

  it("shapes undefined with no value key", async () => {
    const env = await shape({ result: { type: "undefined" } });
    expect(env).toEqual({ kind: "undefined", description: "undefined", truncated: false });
    expect("value" in env).toBe(false);
  });

  it("shapes null without calling the serialiser", async () => {
    const callFn = vi.fn(async () => envelope);
    const env = await shape({ result: { type: "object", subtype: "null", value: null } }, callFn);
    expect(env).toEqual({ kind: "json", value: null, description: "null", truncated: false });
    expect(callFn).not.toHaveBeenCalled();
  });

  it("passes unserializable values through as their CDP string", async () => {
    for (const [type, text] of [
      ["number", "NaN"],
      ["number", "-0"],
      ["number", "Infinity"],
      ["bigint", "12n"],
    ] as const) {
      const env = await shape({ result: { type, unserializableValue: text } });
      expect(env).toEqual({ kind: "unserializable", description: text, truncated: false });
    }
  });
});

describe("shapeEvaluateResult — objects", () => {
  it("hands an objectId to the serialiser exactly once and returns its envelope", async () => {
    const callFn = vi.fn(async () => envelope);
    const env = await shape({ result: { type: "object", objectId: "1" } }, callFn);
    expect(callFn).toHaveBeenCalledTimes(1);
    expect(callFn).toHaveBeenCalledWith("1", limits);
    expect(env).toEqual(envelope);
  });

  it("never loses the call to a serialiser bug", async () => {
    const callFn = vi.fn(async () => {
      throw new Error("serialiser blew up");
    });
    const env = await shape({ result: { type: "object", objectId: "1", className: "Foo", description: "Foo {}" } }, callFn);
    expect(env).toEqual({ kind: "other", description: "Foo {}", truncated: false });

    const noDesc = await shape({ result: { type: "object", objectId: "1", className: "Foo" } }, callFn);
    expect(noDesc.description).toBe("Foo");
  });

  it("throws the formatted exception and never calls the serialiser", async () => {
    const callFn = vi.fn(async () => envelope);
    await expect(
      shape(
        {
          result: { type: "object", objectId: "1" },
          exceptionDetails: { text: "Uncaught", exception: { type: "object", description: "Error: boom\n    at x" } },
        },
        callFn,
      ),
    ).rejects.toThrow(/Error: boom/);
    expect(callFn).not.toHaveBeenCalled();
  });
});

describe("shapeEvaluateResult — total size cap", () => {
  it("cuts an over-long description and keeps the value intact", async () => {
    const long = "z".repeat(50);
    const callFn = vi.fn(async () => ({ kind: "json", value: { s: long }, description: long, truncated: false }) as EvalEnvelope);
    const env = await shape({ result: { type: "object", objectId: "1" } }, callFn, 10);
    expect(env.description).toBe("zzzzzzzzzz\n… [truncated: 40 more chars]");
    expect(env.truncated).toBe(true);
    expect(env.value).toEqual({ s: long });
  });

  it("caps a primitive description too", async () => {
    const env = await shape({ result: { type: "string", value: "abcdef" } }, undefined, 3);
    expect(env.description).toBe("abc\n… [truncated: 3 more chars]");
    expect(env.truncated).toBe(true);
  });

  it("leaves a description under the cap untouched", async () => {
    const env = await shape({ result: { type: "string", value: "abc" } }, undefined, 20000);
    expect(env.description).toBe("abc");
    expect(env.truncated).toBe(false);
  });
});

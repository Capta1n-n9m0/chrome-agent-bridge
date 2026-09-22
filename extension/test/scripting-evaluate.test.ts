import { describe, expect, it } from "vitest";
import { evaluateInMainWorld } from "../src/evaluate/scripting.js";
import { DEFAULT_LIMITS, SERIALIZER_SRC } from "../src/evaluate/serialize.js";

describe("evaluateInMainWorld", () => {
  it("returns the completion value of a statement list", async () => {
    const result = await evaluateInMainWorld(
      "const safariValue = 20; safariValue + 22",
      SERIALIZER_SRC,
      DEFAULT_LIMITS,
    );

    expect(result).toEqual({
      ok: true,
      value: { kind: "json", value: 42, description: "42", truncated: false },
    });
  });

  it("supports top-level await expressions", async () => {
    const result = await evaluateInMainWorld(
      "await Promise.resolve({ browser: 'safari' })",
      SERIALIZER_SRC,
      DEFAULT_LIMITS,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        kind: "json",
        value: { browser: "safari" },
        description: '{\n  "browser": "safari"\n}',
        truncated: false,
      },
    });
  });

  it("serializes page exceptions instead of losing them at the API boundary", async () => {
    const result = await evaluateInMainWorld(
      "throw new TypeError('broken')",
      SERIALIZER_SRC,
      DEFAULT_LIMITS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("TypeError: broken");
  });
});

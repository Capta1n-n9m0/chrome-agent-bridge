import { describe, it, expect } from "vitest";
import { BridgeError, ErrorCodes } from "@bridge/shared";
import { normalizeTarget, requireLocator } from "../src/locator.js";

function badParams(fn: () => unknown): BridgeError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe(ErrorCodes.BAD_PARAMS);
    return err as BridgeError;
  }
  throw new Error("expected a throw");
}

describe("normalizeTarget (phase doc S3)", () => {
  it("a non-empty string is a ref", () => {
    expect(normalizeTarget("e12")).toStrictEqual({ ref: "e12" });
  });

  it("each locator shape is a locator, passed through unchanged", () => {
    for (const loc of [
      { role: "button" },
      { role: "button", name: "Save", exact: true, nth: 1 },
      { role: "link", name: { regex: "^Next", flags: "i" } },
      { text: "Welcome", exact: false },
      { css: "#main > a", nth: 0 },
    ]) {
      const out = normalizeTarget(loc);
      expect(out).toStrictEqual({ locator: loc });
      expect((out as { locator: unknown }).locator).toBe(loc);
    }
  });

  it("{name} without role → BAD_PARAMS: use {text} or add role", () => {
    const err = badParams(() => normalizeTarget({ name: "Save" }));
    // The phase doc's exact phrase (S3 verifier finding 8).
    expect(err.message).toContain("use {text} or add role");
    expect(err.message).toContain('a locator with "name" needs "role"');
  });

  it("{ref: 'e1'} → BAD_PARAMS: pass a ref as a plain string", () => {
    expect(badParams(() => normalizeTarget({ ref: "e1" })).message).toContain("pass a ref as a plain string");
  });

  it("the empty string → BAD_PARAMS", () => {
    expect(badParams(() => normalizeTarget("")).message).toContain("empty ref");
  });

  it("anything else → BAD_PARAMS naming the three shapes", () => {
    for (const bad of [null, undefined, 3, [], {}, { role: "" }, { css: "a", text: "b" }, { role: "button", extra: 1 }, { text: "x", nth: -1 }]) {
      const msg = badParams(() => normalizeTarget(bad)).message;
      expect(msg).toContain("{role, name?}");
      expect(msg).toContain("{text}");
      expect(msg).toContain("{css}");
    }
  });
});

describe("requireLocator", () => {
  it("returns a locator; a ref string or {name} alone is BAD_PARAMS", () => {
    const loc = { css: "a" };
    expect(requireLocator(loc, "locate")).toBe(loc);
    expect(badParams(() => requireLocator("e1", "locate")).message).toContain("not a ref string");
    expect(badParams(() => requireLocator({ name: "x" }, "locate")).message).toContain("or add role");
  });
});

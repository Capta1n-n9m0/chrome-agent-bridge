import { describe, it, expect } from "vitest";
import { classifyInjectError, toSerializableArgs, unwrapResult } from "../src/inject.js";
import { BridgeError } from "../src/errors.js";

describe("toSerializableArgs", () => {
  it("replaces undefined with null (executeScript args can't contain undefined)", () => {
    expect(toSerializableArgs([undefined, "down"])).toEqual([null, "down"]);
  });
  it("leaves other serializable values untouched", () => {
    expect(toSerializableArgs(["e5", 3, true, null, ["a"]])).toEqual(["e5", 3, true, null, ["a"]]);
  });
});

describe("unwrapResult", () => {
  it("returns the result on success", () => {
    expect(unwrapResult({ result: { ok: true } })).toEqual({ ok: true });
  });
  it("throws when the injected function threw (Chrome reports result: null)", () => {
    expect(() => unwrapResult({ result: null })).toThrow(/stale|re-snapshot|browser_snapshot/i);
  });
  it("throws when the result is undefined", () => {
    expect(() => unwrapResult({ result: undefined })).toThrow();
  });
  it("throws when there is no injection frame at all", () => {
    expect(() => unwrapResult(undefined)).toThrow();
  });
});

describe("unwrapResult — codes (Step 7 0.6, #38)", () => {
  const STALE =
    "The page action returned no result — the element ref may be stale (run browser_snapshot to refresh), " +
    "or the tab may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store).";
  const caught = (fn: () => unknown): BridgeError => {
    try {
      fn();
    } catch (e) {
      return e as BridgeError;
    }
    throw new Error("expected a throw");
  };

  it("REF_STALE with the unchanged text on null", () => {
    const e = caught(() => unwrapResult({ result: null }));
    expect(e).toBeInstanceOf(BridgeError);
    expect(e.code).toBe("REF_STALE");
    expect(e.message).toBe(STALE);
  });
  it("REF_STALE on undefined", () => {
    const e = caught(() => unwrapResult({ result: undefined }));
    expect(e.code).toBe("REF_STALE");
    expect(e.message).toBe(STALE);
  });
  it("REF_STALE on a missing frame", () => {
    const e = caught(() => unwrapResult(undefined));
    expect(e.code).toBe("REF_STALE");
    expect(e.message).toBe(STALE);
  });
  it("splits a returned CODE:message marker into its code", () => {
    const e = caught(() => unwrapResult({ result: { __bridgeError: "OFFSCREEN:ref e3 is outside the viewport" } }));
    expect(e.code).toBe("OFFSCREEN");
    expect(e.message).toBe("ref e3 is outside the viewport");
  });
  it("a marker without a code prefix is INTERNAL with the whole string", () => {
    const e = caught(() => unwrapResult({ result: { __bridgeError: "something broke" } }));
    expect(e.code).toBe("INTERNAL");
    expect(e.message).toBe("something broke");
  });
  it("other results pass through, including falsy non-null ones", () => {
    expect(unwrapResult({ result: { found: false } })).toEqual({ found: false });
    expect(unwrapResult({ result: 0 })).toBe(0);
    expect(unwrapResult({ result: "" })).toBe("");
  });
});

describe("unwrapResult — data beside the marker (#82, S1 D10)", () => {
  const caught = (fn: () => unknown): BridgeError => {
    try {
      fn();
    } catch (e) {
      return e as BridgeError;
    }
    throw new Error("expected a throw");
  };

  it("hands __bridgeData on as the BridgeError's data", () => {
    const e = caught(() =>
      unwrapResult({ result: { __bridgeError: "LOCATOR_NOT_FOUND:no button", __bridgeData: { candidates: [] } } }),
    );
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.message).toBe("no button");
    expect(e.data).toEqual({ candidates: [] });
  });

  it("no __bridgeData → data undefined (unchanged)", () => {
    const e = caught(() => unwrapResult({ result: { __bridgeError: "OFFSCREEN:x" } }));
    expect(e.data).toBeUndefined();
  });
});

describe("classifyInjectError", () => {
  it("No tab with id → TAB_UNKNOWN", () => {
    expect(classifyInjectError("No tab with id: 412.")).toBe("TAB_UNKNOWN");
  });
  it("restricted pages → RESTRICTED_URL", () => {
    for (const raw of [
      "Cannot access a chrome:// URL",
      "Cannot access contents of url \"chrome-extension://abc/x.html\". Extension manifest must request permission to access this host.",
      "The extensions gallery cannot be scripted.",
      "Cannot access contents of the page.",
      "devtools://devtools/bundled is off limits",
    ]) {
      expect(classifyInjectError(raw)).toBe("RESTRICTED_URL");
    }
  });
  it("anything else → INTERNAL", () => {
    expect(classifyInjectError("Frame with ID 0 was removed.")).toBe("INTERNAL");
  });
});

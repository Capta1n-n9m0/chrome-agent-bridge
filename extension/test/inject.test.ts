import { describe, it, expect } from "vitest";
import { toSerializableArgs, unwrapResult } from "../src/inject.js";

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

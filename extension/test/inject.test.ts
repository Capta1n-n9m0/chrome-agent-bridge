import { describe, it, expect } from "vitest";
import { toSerializableArgs } from "../src/inject.js";

describe("toSerializableArgs", () => {
  it("replaces undefined with null (executeScript args can't contain undefined)", () => {
    expect(toSerializableArgs([undefined, "down"])).toEqual([null, "down"]);
  });
  it("leaves other serializable values untouched", () => {
    expect(toSerializableArgs(["e5", 3, true, null, ["a"]])).toEqual(["e5", 3, true, null, ["a"]]);
  });
});

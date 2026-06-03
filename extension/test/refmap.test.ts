// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { RefMap } from "../src/content/refmap.js";

describe("RefMap", () => {
  it("assigns stable incrementing refs and resolves them", () => {
    const map = new RefMap();
    const a = document.createElement("button");
    const b = document.createElement("a");
    expect(map.add(a)).toBe("e1");
    expect(map.add(b)).toBe("e2");
    expect(map.get("e1")).toBe(a);
    expect(map.get("e2")).toBe(b);
  });
  it("returns the same ref for the same element within a generation", () => {
    const map = new RefMap();
    const a = document.createElement("button");
    expect(map.add(a)).toBe("e1");
    expect(map.add(a)).toBe("e1");
  });
  it("reset clears the map and restarts numbering", () => {
    const map = new RefMap();
    map.add(document.createElement("button"));
    map.reset();
    expect(map.add(document.createElement("a"))).toBe("e1");
    expect(map.get("e2")).toBeUndefined();
  });
});

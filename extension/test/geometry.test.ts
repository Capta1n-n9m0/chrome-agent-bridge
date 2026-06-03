// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { centerOf } from "../src/content/geometry.js";

describe("centerOf", () => {
  it("returns the center point of a rect", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () =>
      ({ x: 10, y: 20, width: 100, height: 40, top: 20, left: 10, right: 110, bottom: 60, toJSON() {} }) as DOMRect;
    expect(centerOf(el)).toEqual({ x: 60, y: 40 });
  });
});

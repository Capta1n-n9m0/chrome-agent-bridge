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

describe("centerOf — nested frames", () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      x: left,
      y: top,
      width,
      height,
      top,
      left,
      right: left + width,
      bottom: top + height,
      toJSON() {},
    }) as DOMRect;

  it("offsets by the owning iframe so coordinates are top-document relative", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    frame.getBoundingClientRect = () => rect(30, 50, 400, 300);
    const inner = frame.contentDocument!.createElement("button");
    frame.contentDocument!.body.appendChild(inner);
    inner.getBoundingClientRect = () => rect(10, 20, 100, 40);
    expect(centerOf(inner)).toEqual({ x: 90, y: 90 });
  });

  it("falls back to the element's own rect when the frame chain is unreachable", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => rect(0, 0, 20, 20);
    expect(centerOf(el)).toEqual({ x: 10, y: 10 });
  });
});

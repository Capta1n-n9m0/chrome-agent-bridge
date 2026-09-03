// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { centerOf, isInViewport } from "../src/content/geometry.js";

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

// The zoom spike (docs/plans/2026-09-03-step2-phase-d-action-fidelity.md) showed CDP takes plain CSS
// pixels — no scaling — but a click dispatched outside the visual viewport hit-tests the root element
// and silently does nothing. This predicate is what turns that silence into an error.
describe("isInViewport", () => {
  const size = { width: 1280, height: 630 };

  it("accepts a point inside the viewport", () => {
    expect(isInViewport({ x: 635, y: 330 }, size)).toBe(true);
  });

  it("accepts the exact edges", () => {
    expect(isInViewport({ x: 0, y: 0 }, size)).toBe(true);
    expect(isInViewport({ x: 1280, y: 630 }, size)).toBe(true);
  });

  it("rejects a point below the fold — the observed 150 %-zoom failure", () => {
    expect(isInViewport({ x: 635, y: 755 }, size)).toBe(false);
  });

  it("rejects points past the right edge and above/left of the origin", () => {
    expect(isInViewport({ x: 1281, y: 300 }, size)).toBe(false);
    expect(isInViewport({ x: -1, y: 300 }, size)).toBe(false);
    expect(isInViewport({ x: 635, y: -1 }, size)).toBe(false);
  });
});

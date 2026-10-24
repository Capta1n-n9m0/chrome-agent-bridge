// @vitest-environment jsdom
/**
 * Step 8 S2 (phase doc 0.3; stage0-audit.md F21): the CDP half of node → ref. Every test runs the
 * SHIPPED strings (`MARK_SRC`, `UNMARK_SRC`, `SERIALIZER_SRC`) the way CDP does, so what is tested is
 * what ships.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MARK_ATTR, MARK_SRC, UNMARK_SRC, unmarkExpression, newMark } from "../src/evaluate/mark.js";
import { MARK_ATTR as CONTENT_MARK_ATTR, refOfMarked } from "../src/content/marked.js";
import { RefMap } from "../src/content/refmap.js";
import { SERIALIZER_SRC, DEFAULT_LIMITS, serializeForAgent } from "../src/evaluate/serialize.js";

type MarkFn = (this: unknown, mark: string) => string;
const markFn = new Function("return " + MARK_SRC)() as MarkFn;
const unmarkFn = new Function("return " + UNMARK_SRC)() as (mark: string) => number;
const composite = new Function("return " + SERIALIZER_SRC)() as (this: unknown, limits: unknown) => Record<string, unknown>;

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("the shipped sources", () => {
  it("MARK_ATTR equals the content script's", () => {
    expect(MARK_ATTR).toBe(CONTENT_MARK_ATTR);
    expect(MARK_SRC).toContain(`"${CONTENT_MARK_ATTR}"`);
    expect(UNMARK_SRC).toContain(`"${CONTENT_MARK_ATTR}"`);
  });

  it("are closure-free: no import/export/require, no chrome.*, no module identifiers", () => {
    for (const src of [MARK_SRC, UNMARK_SRC, SERIALIZER_SRC]) {
      expect(src).not.toMatch(/\b(import|export|require)\b/);
      expect(src).not.toMatch(/\bchrome\./);
      expect(src).not.toMatch(/\bMARK_ATTR\b/);
    }
  });

  it("newMark is unique per call", () => {
    const marks = new Set(Array.from({ length: 50 }, () => newMark()));
    expect(marks.size).toBe(50);
  });
});

describe("markFn (from MARK_SRC)", () => {
  it("an attached element → marked, the attribute set to the mark", () => {
    document.body.innerHTML = `<button id="b">Go</button>`;
    const b = document.getElementById("b")!;
    expect(markFn.call(b, "m1")).toBe("marked");
    expect(b.getAttribute(MARK_ATTR)).toBe("m1");
  });

  it("a text node, window, document, a plain object, null → not-element, nothing marked", () => {
    document.body.innerHTML = `<p>hello</p>`;
    const text = document.querySelector("p")!.firstChild!;
    for (const v of [text, window, document, { nodeType: 1 }, null, undefined, 42]) {
      expect(markFn.call(v, "m1")).toBe("not-element");
    }
    expect(document.querySelector(`[${MARK_ATTR}]`)).toBeNull();
  });

  it("a detached element → detached, not marked", () => {
    const d = document.createElement("div");
    expect(markFn.call(d, "m1")).toBe("detached");
    expect(d.hasAttribute(MARK_ATTR)).toBe(false);
  });

  it("an element of a windowless document → detached", () => {
    const doc = document.implementation.createHTMLDocument("x");
    expect(markFn.call(doc.body, "m1")).toBe("detached");
  });

  it("inside a closed shadow root → closed-shadow, not marked", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<button>In</button>`;
    const b = root.querySelector("button")!;
    expect(markFn.call(b, "m1")).toBe("closed-shadow");
    expect(b.hasAttribute(MARK_ATTR)).toBe(false);
  });

  it("inside an open shadow root (nested) → marked", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const inner = document.createElement("span");
    host.attachShadow({ mode: "open" }).appendChild(inner);
    const deep = inner.attachShadow({ mode: "open" });
    deep.innerHTML = `<button>Deep</button>`;
    const b = deep.querySelector("button")!;
    expect(markFn.call(b, "m2")).toBe("marked");
    expect(b.getAttribute(MARK_ATTR)).toBe("m2");
  });

  it("inside a same-origin iframe → marked", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const fdoc = frame.contentDocument!;
    fdoc.body.innerHTML = `<button id="f">F</button>`;
    const b = fdoc.getElementById("f")!;
    expect(markFn.call(b, "m3")).toBe("marked");
    expect(b.getAttribute(MARK_ATTR)).toBe("m3");
  });

  it("inside a frame whose frameElement is unreachable (a cross-origin parent: null or a throw) → detached", () => {
    for (const getter of [() => null, () => { throw new Error("SecurityError"); }]) {
      document.body.innerHTML = "";
      const frame = document.createElement("iframe");
      document.body.appendChild(frame);
      Object.defineProperty(frame.contentWindow!, "frameElement", { get: getter, configurable: true });
      const fdoc = frame.contentDocument!;
      fdoc.body.innerHTML = `<button id="f">F</button>`;
      const b = fdoc.getElementById("f")!;
      expect(markFn.call(b, "m4")).toBe("detached");
      expect(b.hasAttribute(MARK_ATTR)).toBe(false);
    }
  });

  it("an element whose probe throws → not-element, never a throw", () => {
    const poisoned = new Proxy({}, { get: () => { throw new Error("nope"); } });
    expect(markFn.call(poisoned, "m1")).toBe("not-element");
  });
});

describe("unmarkFn (from UNMARK_SRC)", () => {
  it("removes exactly this mark across the document, open shadow roots and same-origin frames", () => {
    document.body.innerHTML = `<p ${MARK_ATTR}="m1">a</p><p id="other" ${MARK_ATTR}="m2">b</p>`;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: "open" });
    sr.innerHTML = `<i ${MARK_ATTR}="m1">s</i>`;
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    frame.contentDocument!.body.innerHTML = `<b ${MARK_ATTR}="m1">f</b>`;

    expect(unmarkFn("m1")).toBe(3);
    expect(document.querySelectorAll(`[${MARK_ATTR}="m1"]`)).toHaveLength(0);
    expect(sr.querySelector(`[${MARK_ATTR}]`)).toBeNull();
    expect(frame.contentDocument!.querySelector(`[${MARK_ATTR}]`)).toBeNull();
    expect(document.getElementById("other")!.getAttribute(MARK_ATTR)).toBe("m2");
    expect(unmarkFn("m1")).toBe(0);
  });

  it("unmarkExpression evaluates to the sweep with the mark as a JSON string literal", () => {
    document.body.innerHTML = `<p ${MARK_ATTR}='we"ird'>a</p>`;
    const expr = unmarkExpression('we"ird');
    expect(expr.startsWith(`(${UNMARK_SRC})(`)).toBe(true);
    expect((0, eval)(expr)).toBe(1);
    expect(document.querySelector(`[${MARK_ATTR}]`)).toBeNull();
  });
});

describe("markFn → S1's refOfMarked: the round trip leaves no attribute", () => {
  for (const where of ["light", "open shadow", "iframe"] as const) {
    it(`${where}`, () => {
      let target: Element;
      if (where === "light") {
        document.body.innerHTML = `<button>Go</button>`;
        target = document.querySelector("button")!;
      } else if (where === "open shadow") {
        const host = document.createElement("div");
        document.body.appendChild(host);
        const sr = host.attachShadow({ mode: "open" });
        sr.innerHTML = `<button>Go</button>`;
        target = sr.querySelector("button")!;
      } else {
        const frame = document.createElement("iframe");
        document.body.appendChild(frame);
        frame.contentDocument!.body.innerHTML = `<button>Go</button>`;
        target = frame.contentDocument!.querySelector("button")!;
      }
      const mark = newMark();
      expect(markFn.call(target, mark)).toBe("marked");
      const refs = new RefMap();
      const r = refOfMarked(document, refs, mark);
      expect(refs.get(r.ref)).toBe(target);
      expect(r.role).toBe("button");
      expect(target.hasAttribute(MARK_ATTR)).toBe(false);
      expect(unmarkFn(mark)).toBe(0);
    });
  }
});

describe("SERIALIZER_SRC — the composite", () => {
  class Point {
    constructor(public x: number, public y: number) {}
  }
  function battery(): unknown[] {
    document.body.innerHTML = `<div id="d" class="c">Hello <b>world</b></div><ul><li>1</li><li>2</li></ul>`;
    const cyc: Record<string, unknown> = { a: 1 };
    cyc.self = cyc;
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 10; i++) deep = { next: deep };
    return [
      { a: 1, b: ["x", { c: true }], d: new Map([["k", 2]]) },
      [1, "two", null, undefined, 3n, Symbol("s"), NaN],
      new Map([[{ k: 1 }, new Set([1, 2])]]),
      new Set(["a", "b"]),
      new Date(0),
      /re/gi,
      new Error("boom"),
      new TypeError("bad"),
      document.getElementById("d"),
      document.getElementById("d")!.firstChild,
      document,
      window,
      document.querySelectorAll("li"),
      function named() {
        return 1;
      },
      () => 2,
      new Point(1, 2),
      cyc,
      deep,
      new Uint8Array(4),
      new ArrayBuffer(8),
      { ["x".repeat(3)]: "y".repeat(6000) },
      Array.from({ length: 150 }, (_, i) => i),
    ];
  }

  it("without a mark equals serializeForAgent for every input of the battery", () => {
    for (const v of battery()) {
      expect(composite.call(v, DEFAULT_LIMITS)).toEqual(serializeForAgent(v, DEFAULT_LIMITS));
    }
  });

  it("an empty or non-string mark is no mark", () => {
    document.body.innerHTML = `<button>Go</button>`;
    const b = document.querySelector("button")!;
    for (const mark of ["", 5, null]) {
      const env = composite.call(b, { ...DEFAULT_LIMITS, mark });
      expect("__mark" in env).toBe(false);
    }
    expect(b.hasAttribute(MARK_ATTR)).toBe(false);
  });

  it("with a mark: the same envelope plus __mark; an element is marked", () => {
    document.body.innerHTML = `<button>Go</button>`;
    const b = document.querySelector("button")!;
    const plain = serializeForAgent(b, DEFAULT_LIMITS);
    const env = composite.call(b, { ...DEFAULT_LIMITS, mark: "mk" });
    expect(env).toEqual({ ...plain, __mark: "marked" });
    expect(b.getAttribute(MARK_ATTR)).toBe("mk");
  });

  it("with a mark on a non-element: __mark not-element; detached: detached", () => {
    expect(composite.call({ a: 1 }, { ...DEFAULT_LIMITS, mark: "mk" }).__mark).toBe("not-element");
    expect(composite.call(window, { ...DEFAULT_LIMITS, mark: "mk" }).__mark).toBe("not-element");
    expect(composite.call(document.createElement("i"), { ...DEFAULT_LIMITS, mark: "mk" }).__mark).toBe("detached");
  });
});

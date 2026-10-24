// @vitest-environment jsdom
/** Step 8 S1 (design D8): `refOfMarked` turns an element marked by an evaluate into a ref. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { MARK_ATTR, refOfMarked } from "../src/content/marked.js";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";

function fail(fn: () => unknown): { code: string; message: string } {
  try {
    fn();
  } catch (e) {
    return { code: (e as { code?: string }).code ?? "(none)", message: (e as Error).message };
  }
  throw new Error("expected a throw");
}

afterEach(() => vi.restoreAllMocks());

describe("refOfMarked", () => {
  it("MARK_ATTR is the agreed attribute", () => {
    expect(MARK_ATTR).toBe("data-__bridge-mark");
  });

  it("mints a ref for the one marked element and removes the mark", () => {
    document.body.innerHTML = `<button>A</button><p id="p" ${MARK_ATTR}="m1">Para</p>`;
    const refs = new RefMap();
    const r = refOfMarked(document, refs, "m1");
    expect(r).toEqual({ ref: "e1", role: "", name: "Para" });
    expect(refs.get("e1")).toBe(document.getElementById("p"));
    expect(document.querySelector(`[${MARK_ATTR}]`)).toBeNull();
  });

  it("keeps a snapshot's refs and returns the ref an element already has", () => {
    document.body.innerHTML = `<button id="b">A</button><button>B</button>`;
    const refs = new RefMap();
    buildSnapshot(document, refs);
    const reset = vi.spyOn(RefMap.prototype, "reset");
    document.getElementById("b")!.setAttribute(MARK_ATTR, "x");
    expect(refOfMarked(document, refs, "x")).toEqual({ ref: "e1", role: "button", name: "A" });
    expect(refs.get("e2")!.textContent).toBe("B");
    expect(reset).not.toHaveBeenCalled();
  });

  it("finds a hidden element (no pruning), one in an open shadow root and one in a same-origin frame", () => {
    document.body.innerHTML = `<div style="display:none"><span id="h" ${MARK_ATTR}="h">Hidden</span></div><div id="host"></div><iframe id="f"></iframe>`;
    const root = document.getElementById("host")!.attachShadow({ mode: "open" });
    root.innerHTML = `<button ${MARK_ATTR}="s">In shadow</button>`;
    const fdoc = (document.getElementById("f") as HTMLIFrameElement).contentDocument!;
    fdoc.body.innerHTML = `<a href="/x" ${MARK_ATTR}="f">In frame</a>`;
    const refs = new RefMap();
    expect(refs.get(refOfMarked(document, refs, "h").ref)!.id).toBe("h");
    expect(refOfMarked(document, refs, "s")).toMatchObject({ role: "button", name: "In shadow" });
    expect(refOfMarked(document, refs, "f")).toMatchObject({ role: "link", name: "In frame" });
    expect(root.querySelector(`[${MARK_ATTR}]`)).toBeNull();
    expect(fdoc.querySelector(`[${MARK_ATTR}]`)).toBeNull();
  });

  it("compares the attribute value, never builds a selector from the mark", () => {
    const mark = `"]; * [x="`;
    document.body.innerHTML = `<p id="p">P</p><p id="q">Q</p>`;
    document.getElementById("q")!.setAttribute(MARK_ATTR, mark);
    expect(refOfMarked(document, new RefMap(), mark).name).toBe("Q");
  });

  it("no element carries the mark → REF_STALE", () => {
    document.body.innerHTML = `<p ${MARK_ATTR}="other">P</p>`;
    const e = fail(() => refOfMarked(document, new RefMap(), "gone"));
    expect(e.code).toBe("REF_STALE");
    expect(e.message).toMatch(/closed shadow root or a cross-origin frame/);
    // Another mark is left alone.
    expect(document.querySelector(`[${MARK_ATTR}="other"]`)).not.toBeNull();
  });

  it("a mark in a closed shadow root is not found", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    document.getElementById("host")!.attachShadow({ mode: "closed" }).innerHTML = `<button ${MARK_ATTR}="c">C</button>`;
    expect(fail(() => refOfMarked(document, new RefMap(), "c")).code).toBe("REF_STALE");
  });

  it("more than one element with the mark → INTERNAL, and every mark is removed", () => {
    document.body.innerHTML = `<p ${MARK_ATTR}="d">1</p><p ${MARK_ATTR}="d">2</p>`;
    const e = fail(() => refOfMarked(document, new RefMap(), "d"));
    expect(e.code).toBe("INTERNAL");
    expect(e.message).toMatch(/not unique/);
    expect(document.querySelector(`[${MARK_ATTR}]`)).toBeNull();
  });

  it("a non-string or empty mark → BAD_PARAMS", () => {
    document.body.innerHTML = `<p ${MARK_ATTR}="">P</p>`;
    for (const m of ["", null, undefined, 3, {}]) {
      expect(fail(() => refOfMarked(document, new RefMap(), m as unknown as string)).code).toBe("BAD_PARAMS");
    }
  });
});

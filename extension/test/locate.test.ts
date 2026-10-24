// @vitest-environment jsdom
/**
 * Step 8 S1: `locate` resolves a locator by the snapshot's own rules (phase doc 0.1; decisions.md ·
 * 2026-10-23 · #83, #86). Test names start with the S1.3 item they cover.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { locate } from "../src/content/locate.js";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";
import {
  IFRAMES_TWO,
  IFRAME_SAME_ORIGIN,
  PLAYGROUND_STATIC,
  PLAYGROUND_WITH_SCRIPT_DOM,
  SHADOW_DEPTH,
  SHADOW_OPEN,
  type SnapshotFixture,
} from "./snapshot-fixtures.js";

interface Thrown {
  code: string;
  message: string;
  data?: any;
}

function fail(fn: () => unknown): Thrown {
  try {
    fn();
  } catch (e) {
    const err = e as Error & { code?: string; data?: unknown };
    return { code: err.code ?? "(none)", message: err.message, data: err.data };
  }
  throw new Error("expected a throw");
}

const rect = (w: number, h: number) =>
  ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON() {} }) as DOMRect;

afterEach(() => {
  delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
  vi.restoreAllMocks();
});

describe("locate {role, name}", () => {
  it("S1.3 role+name substring: case-insensitive substring of the snapshot's name", () => {
    document.body.innerHTML = `<button>Delete</button><button>Create item</button><a href="/c">Create link</a>`;
    const refs = new RefMap();
    const r = locate(document, refs, { role: "button", name: "  CREATE " });
    expect(r).toEqual({ ref: "e1", role: "button", name: "Create item" });
    expect(refs.get(r.ref)).toBe(document.querySelectorAll("button")[1]);
  });

  it("the result is exactly {ref, role, name}", () => {
    document.body.innerHTML = `<button>Go</button>`;
    expect(Object.keys(locate(document, new RefMap(), { role: "button" })).sort()).toEqual(["name", "ref", "role"]);
  });

  it("S1.3 exact: case-sensitive equality with the name", () => {
    document.body.innerHTML = `<button>Save</button><button>Save draft</button>`;
    const refs = new RefMap();
    expect(locate(document, refs, { role: "button", name: "Save", exact: true }).name).toBe("Save");
    expect(fail(() => locate(document, refs, { role: "button", name: "save", exact: true })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, refs, { role: "button", name: "Save" })).code).toBe("LOCATOR_AMBIGUOUS");
  });

  it("matches the 120-character capped name, the one the snapshot shows", () => {
    const long = "word ".repeat(40).trim();
    document.body.innerHTML = `<button>${long}</button>`;
    const shown = buildSnapshot(document, new RefMap()).elements[0]!.name;
    expect(shown.endsWith("…")).toBe(true);
    expect(locate(document, new RefMap(), { role: "button", name: shown, exact: true }).name).toBe(shown);
    expect(fail(() => locate(document, new RefMap(), { role: "button", name: long, exact: true })).code).toBe("LOCATOR_NOT_FOUND");
  });

  it("S1.3 {regex}: tested against the name, with flags", () => {
    document.body.innerHTML = `<button>Save</button><button>Save draft</button>`;
    const refs = new RefMap();
    expect(locate(document, refs, { role: "button", name: { regex: "^save d", flags: "i" } }).name).toBe("Save draft");
    expect(fail(() => locate(document, refs, { role: "button", name: { regex: "^save d" } })).code).toBe("LOCATOR_NOT_FOUND");
    expect(locate(document, refs, { role: "button", name: { regex: "^Save$" } }).name).toBe("Save");
  });

  it("S1.3 {regex}: a g or y flag is not stateful across elements or calls", () => {
    // Two ADJACENT matches: without the lastIndex reset, the match on the first leaves lastIndex past
    // "a"/"ab", so the second `test()` starts there and fails — only one element would match. (A
    // non-matching element in between would reset lastIndex by accident and hide the bug.)
    document.body.innerHTML = `<button>ab</button><button>ab</button>`;
    const refs = new RefMap();
    const buttons = document.querySelectorAll("button");
    for (let i = 0; i < 3; i++) {
      const g = locate(document, refs, { role: "button", name: { regex: "ab", flags: "g" }, nth: 1 });
      expect(refs.get(g.ref)).toBe(buttons[1]);
      expect(fail(() => locate(document, refs, { role: "button", name: { regex: "ab", flags: "g" } })).code).toBe(
        "LOCATOR_AMBIGUOUS",
      );
      const y = locate(document, refs, { role: "button", name: { regex: "a", flags: "y" }, nth: 1 });
      expect(refs.get(y.ref)).toBe(buttons[1]);
      expect(fail(() => locate(document, refs, { role: "button", name: { regex: "a", flags: "y" } })).code).toBe(
        "LOCATOR_AMBIGUOUS",
      );
    }
  });

  it("no name → every element of that role", () => {
    document.body.innerHTML = `<button>A</button><input type="text" aria-label="T" /><button>B</button>`;
    const refs = new RefMap();
    expect(locate(document, refs, { role: "textbox" }).name).toBe("T");
    expect(fail(() => locate(document, refs, { role: "button" })).code).toBe("LOCATOR_AMBIGUOUS");
  });

  it("role is an exact string match", () => {
    document.body.innerHTML = `<button>A</button>`;
    expect(fail(() => locate(document, new RefMap(), { role: "Button" })).code).toBe("LOCATOR_NOT_FOUND");
  });

  it("only what a snapshot lists: a non-interactive element is never a role match", () => {
    document.body.innerHTML = `<div role="tablist" aria-label="Tabs"></div><h1>Title</h1>`;
    const e = fail(() => locate(document, new RefMap(), { role: "tablist" }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.message).toMatch(/never lists/);
    expect(e.data).toEqual({ candidates: [] });
  });
});

describe("locate — nth (0-based, #86)", () => {
  it("S1.3 nth: picks the nth match in walk order; nth ≥ count is LOCATOR_NOT_FOUND saying how many", () => {
    document.body.innerHTML = `<button>Save</button><button>Cancel</button><button>Save draft</button>`;
    const refs = new RefMap();
    expect(locate(document, refs, { role: "button", name: "save", nth: 0 }).name).toBe("Save");
    expect(locate(document, refs, { role: "button", name: "save", nth: 1 }).name).toBe("Save draft");
    const e = fail(() => locate(document, refs, { role: "button", name: "save", nth: 2 }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.message).toMatch(/2 matched/);
    expect(Array.isArray(e.data.candidates)).toBe(true);
  });

  it("nth applies to text and css too", () => {
    document.body.innerHTML = `<p class="x">one apple</p><p class="x">two apples</p>`;
    const refs = new RefMap();
    expect(locate(document, refs, { text: "apple", nth: 1 }).name).toBe("two apples");
    expect(refs.get(locate(document, refs, { css: "p.x", nth: 1 }).ref)!.textContent).toBe("two apples");
  });
});

describe("locate — ambiguity", () => {
  it("S1.3 ambiguity → LOCATOR_AMBIGUOUS with matches [{ref, name}] in walk order", () => {
    document.body.innerHTML = `<button>Save</button><button>Cancel</button><button>Save draft</button>`;
    const refs = new RefMap();
    const e = fail(() => locate(document, refs, { role: "button", name: "save" }));
    expect(e.code).toBe("LOCATOR_AMBIGUOUS");
    expect(e.data).toEqual({
      matches: [
        { ref: "e1", name: "Save" },
        { ref: "e2", name: "Save draft" },
      ],
    });
    expect(e.message).toMatch(/^2 /);
    expect(e.message).toMatch(/nth/);
    expect(refs.get("e2")).toBe(document.querySelectorAll("button")[2]);
  });

  it("matches are capped at 20 in data, the message states the total", () => {
    document.body.innerHTML = Array.from({ length: 25 }, (_, i) => `<button>Item ${i}</button>`).join("");
    const e = fail(() => locate(document, new RefMap(), { role: "button", name: "item" }));
    expect(e.code).toBe("LOCATOR_AMBIGUOUS");
    expect(e.data.matches).toHaveLength(20);
    expect(e.data.matches[19].name).toBe("Item 19");
    expect(e.message).toMatch(/^25 /);
  });
});

describe("locate — not found", () => {
  it("S1.3 not-found → LOCATOR_NOT_FOUND with up to 5 ranked same-role candidates", () => {
    document.body.innerHTML = `
      <button>Delete</button><button>Create folder</button><button>Upload</button><button>Create item</button>
      <button>Help</button><button>Archive</button><button>Cancel</button><a href="/x">Create</a>`;
    const refs = new RefMap();
    const e = fail(() => locate(document, refs, { role: "button", name: "Create", exact: true }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    const c = e.data.candidates as { ref: string; role: string; name: string }[];
    expect(c).toHaveLength(5);
    expect(c.slice(0, 2).map((x) => x.name)).toEqual(["Create item", "Create folder"]);
    expect(c.every((x) => x.role === "button")).toBe(true);
    for (const x of c) expect(refs.get(x.ref)!.textContent).toBe(x.name);
    expect(e.message).toBe('no button named "Create". Nearest: button "Create item", button "Create folder", button "Delete", button "Archive", button "Help".');
  });

  it("a regex needle is ranked by its source", () => {
    document.body.innerHTML = `<button>Other</button><button>Create item</button>`;
    const e = fail(() => locate(document, new RefMap(), { role: "button", name: { regex: "^Create$" } }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.data.candidates[0].name).toBe("Create item");
  });

  it("a role with no element at all → empty candidates", () => {
    document.body.innerHTML = `<a href="/x">L</a>`;
    const e = fail(() => locate(document, new RefMap(), { role: "button" }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.data).toEqual({ candidates: [] });
  });

  it("{text} candidates are elements owning visible text, ranked; {css} has none", () => {
    document.body.innerHTML = `<p>Loading…</p><div><span>Results ready</span></div><p>Total</p>`;
    const e = fail(() => locate(document, new RefMap(), { text: "Results: ready", exact: true }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.data.candidates[0]).toMatchObject({ role: "", name: "Results ready" });
    expect(e.data.candidates.length).toBeLessThanOrEqual(5);
    expect(fail(() => locate(document, new RefMap(), { css: ".nope" })).data).toEqual({ candidates: [] });
  });

  it("the search is not capped at the snapshot's 800 elements", () => {
    document.body.innerHTML = Array.from({ length: 900 }, (_, i) => `<button>B${i}</button>`).join("");
    expect(locate(document, new RefMap(), { role: "button", name: "B850", exact: true }).name).toBe("B850");
  });
});

describe("locate {text} (#83 item 1)", () => {
  it("S1.3 {text} over visible text: a role-less element matches", () => {
    document.body.innerHTML = `<button>Load</button><div id="async-area">Loaded: 3 items</div>`;
    const refs = new RefMap();
    const r = locate(document, refs, { text: "loaded: 3" });
    expect(refs.get(r.ref)).toBe(document.getElementById("async-area"));
    expect(r.role).toBe("");
    expect(r.name).toBe("Loaded: 3 items");
  });

  it("S1.3 {text}: text spanning child elements counts, the innermost element wins", () => {
    document.body.innerHTML = `<section><div id="d"><p id="p">Hello <b>big</b>   world</p></div></section>`;
    const refs = new RefMap();
    expect(refs.get(locate(document, refs, { text: "hello big world" }).ref)!.id).toBe("p");
    expect(locate(document, refs, { text: "big" }).ref).toBe(refs.add(document.querySelector("b")!));
  });

  it("text inside a hidden child does not make the parent match", () => {
    document.body.innerHTML = `<div id="v">Visible<span style="display:none">secret</span><span aria-hidden="true">aria</span></div>`;
    const refs = new RefMap();
    expect(fail(() => locate(document, refs, { text: "secret" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, refs, { text: "aria" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(refs.get(locate(document, refs, { text: "Visible", exact: true }).ref)!.id).toBe("v");
  });

  it("an element inside a hidden subtree never matches", () => {
    document.body.innerHTML = `<div hidden><p>Gone</p></div><div inert><p>Inert</p></div><p>Here</p>`;
    expect(fail(() => locate(document, new RefMap(), { text: "gone" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, new RefMap(), { text: "inert" })).code).toBe("LOCATOR_NOT_FOUND");
  });

  it("exact text: case-sensitive equality of the normalised text", () => {
    document.body.innerHTML = `<p>Total: 5</p><p>Total:   50</p>`;
    const refs = new RefMap();
    expect(fail(() => locate(document, refs, { text: "total: 5" })).code).toBe("LOCATOR_AMBIGUOUS");
    expect(locate(document, refs, { text: " Total:  5 ", exact: true }).name).toBe("Total: 5");
    expect(locate(document, refs, { text: "Total: 50", exact: true }).name).toBe("Total: 50");
    expect(fail(() => locate(document, refs, { text: "total: 5", exact: true })).code).toBe("LOCATOR_NOT_FOUND");
  });

  it("a shadow host's text excludes its shadow root; the shadow element matches on its own", () => {
    document.body.innerHTML = `<div id="host">Light text</div>`;
    document.getElementById("host")!.attachShadow({ mode: "open" }).innerHTML = `<p id="sp">Shadow text</p>`;
    const refs = new RefMap();
    expect(refs.get(locate(document, refs, { text: "shadow text" }).ref)!.id).toBe("sp");
    expect(refs.get(locate(document, refs, { text: "light text" }).ref)!.id).toBe("host");
  });

  it("matches come in the snapshot's walk order (shadow before light children)", () => {
    document.body.innerHTML = `<div id="host"><p id="light">Item light</p></div>`;
    document.getElementById("host")!.attachShadow({ mode: "open" }).innerHTML = `<p id="shadow">Item shadow</p><slot></slot>`;
    const refs = new RefMap();
    expect(refs.get(locate(document, refs, { text: "item", nth: 0 }).ref)!.id).toBe("shadow");
    expect(refs.get(locate(document, refs, { text: "item", nth: 1 }).ref)!.id).toBe("light");
  });
});

describe("locate {css}", () => {
  it("S1.3 {css} mints a ref for a non-interactive element, after a snapshot, without collision", () => {
    document.body.innerHTML = `<button>A</button><p id="status">status: idle</p><button>B</button>`;
    const refs = new RefMap();
    const snap = buildSnapshot(document, refs);
    expect(snap.elements.map((e) => e.ref)).toEqual(["e1", "e2"]);
    const r = locate(document, refs, { css: "#status" });
    expect(r).toEqual({ ref: "e3", role: "", name: "status: idle" });
    expect(refs.get("e3")).toBe(document.getElementById("status"));
    expect(refs.get("e1")).toBe(document.querySelectorAll("button")[0]);
    expect(refs.get("e2")).toBe(document.querySelectorAll("button")[1]);
    // An interactive element keeps the ref the snapshot gave it.
    expect(locate(document, refs, { css: "button", nth: 1 }).ref).toBe("e2");
  });

  it("an invalid selector → BAD_PARAMS", () => {
    document.body.innerHTML = `<p>x</p>`;
    expect(fail(() => locate(document, new RefMap(), { css: "p[" })).code).toBe("BAD_PARAMS");
  });

  it("a hidden element never matches (so waitFor {state:hidden} can resolve)", () => {
    document.body.innerHTML = `<div style="display:none"><p id="x">x</p></div><p id="y" hidden>y</p>`;
    expect(fail(() => locate(document, new RefMap(), { css: "#x" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, new RefMap(), { css: "#y" })).code).toBe("LOCATOR_NOT_FOUND");
  });
});

describe("locate — open shadow roots and same-origin frames", () => {
  it("S1.3 open shadow root: role, text and css reach into it; a closed root is not entered", () => {
    document.body.innerHTML = `<div id="open"></div><div id="closed"></div>`;
    const open = document.getElementById("open")!.attachShadow({ mode: "open" });
    open.innerHTML = `<button id="sb">Shadow button</button><span class="lbl">Shadow label</span>`;
    document.getElementById("closed")!.attachShadow({ mode: "closed" }).innerHTML = `<button>Sealed</button>`;
    const refs = new RefMap();
    const sb = open.getElementById("sb");
    expect(refs.get(locate(document, refs, { role: "button", name: "shadow" }).ref)).toBe(sb);
    expect(refs.get(locate(document, refs, { css: "#sb" }).ref)).toBe(sb);
    expect(locate(document, refs, { text: "shadow label" }).name).toBe("Shadow label");
    expect(fail(() => locate(document, refs, { role: "button", name: "sealed" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, refs, { text: "sealed" })).code).toBe("LOCATOR_NOT_FOUND");
  });

  it("S1.3 same-origin frame: role, text and css reach into it; a cross-origin frame is skipped", () => {
    document.body.innerHTML = `<iframe id="f"></iframe><iframe id="x"></iframe><button>Top</button>`;
    const fdoc = (document.getElementById("f") as HTMLIFrameElement).contentDocument!;
    fdoc.body.innerHTML = `<button id="fb">Iframe button</button><p id="fs">iframe: idle</p>`;
    Object.defineProperty(document.getElementById("x")!, "contentDocument", { get: () => null });
    const refs = new RefMap();
    const fb = fdoc.getElementById("fb");
    expect(refs.get(locate(document, refs, { role: "button", name: "iframe" }).ref)).toBe(fb);
    expect(refs.get(locate(document, refs, { css: "#fs" }).ref)).toBe(fdoc.getElementById("fs"));
    expect(refs.get(locate(document, refs, { text: "iframe: idle" }).ref)).toBe(fdoc.getElementById("fs"));
    expect(locate(document, refs, { role: "button", nth: 1 }).name).toBe("Top");
  });
});

describe("locate — the zero-size gate (only with layout)", () => {
  it("skips a zero-size candidate under layout for every variant, keeps it without layout", () => {
    document.body.innerHTML = `<button id="z">Zero</button><button id="o">Other</button>`;
    document.getElementById("z")!.getBoundingClientRect = () => rect(0, 0);
    document.getElementById("o")!.getBoundingClientRect = () => rect(60, 20);
    const refs = new RefMap();
    expect(locate(document, refs, { role: "button", name: "zero" }).name).toBe("Zero");
    expect(locate(document, refs, { text: "zero" }).name).toBe("Zero");
    expect(locate(document, refs, { css: "#z" }).name).toBe("Zero");
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    expect(fail(() => locate(document, refs, { role: "button", name: "zero" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, refs, { text: "zero" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(fail(() => locate(document, refs, { css: "#z" })).code).toBe("LOCATOR_NOT_FOUND");
    expect(locate(document, refs, { role: "button" }).name).toBe("Other");
  });

  it("a zero-size wrapper's laid-out child still matches; the wrapper's text reaches nobody else", () => {
    document.body.innerHTML = `<div id="w"><span id="c">Inside</span></div>`;
    document.getElementById("w")!.getBoundingClientRect = () => rect(0, 0);
    document.getElementById("c")!.getBoundingClientRect = () => rect(40, 20);
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    const refs = new RefMap();
    expect(refs.get(locate(document, refs, { text: "inside" }).ref)!.id).toBe("c");
  });
});

describe("locate — BAD_PARAMS", () => {
  const bad = [
    null,
    "button",
    [],
    {},
    { role: "button", text: "x" },
    { role: "button", css: "b" },
    { role: "   " },
    { role: "" },
    { text: " \n " },
    { css: "  " },
    { role: "button", name: "   " },
    { role: "button", name: { regex: "(" } },
    { role: "button", name: { regex: "a", flags: "zz" } },
    { role: "button", name: { regex: 3 } },
    { role: "button", name: 3 },
    { role: "button", nth: -1 },
    { role: "button", nth: 1.5 },
    { role: "button", nth: "1" },
    { role: "button", exact: "yes" },
    { css: "b", exact: true },
    { text: "x", name: "y" },
    { role: "button", bogus: 1 },
  ];
  it("rejects every malformed locator with BAD_PARAMS", () => {
    document.body.innerHTML = `<button>A</button>`;
    for (const l of bad) {
      const e = fail(() => locate(document, new RefMap(), l));
      expect([JSON.stringify(l), e.code]).toEqual([JSON.stringify(l), "BAD_PARAMS"]);
    }
  });

  it("null optional fields count as absent (executeScript args turn undefined into null)", () => {
    document.body.innerHTML = `<button>A</button>`;
    expect(locate(document, new RefMap(), { role: "button", name: null, exact: null, nth: null }).name).toBe("A");
  });
});

describe("locate never resets the RefMap", () => {
  it("S1.3 refs from a prior snapshot survive locate calls (and no variant calls reset)", () => {
    document.body.innerHTML = `<button>Save</button><a href="/x">Link</a><p id="p">Para</p><button>Save draft</button>`;
    const refs = new RefMap();
    const snap = buildSnapshot(document, refs);
    const before = snap.elements.map((e) => [e.ref, refs.get(e.ref)] as const);
    const reset = vi.spyOn(RefMap.prototype, "reset");
    locate(document, refs, { role: "button", name: "save", nth: 1 });
    locate(document, refs, { text: "para" });
    locate(document, refs, { css: "#p" });
    fail(() => locate(document, refs, { role: "button", name: "save" }));
    fail(() => locate(document, refs, { role: "button", name: "nothing" }));
    fail(() => locate(document, refs, { text: "nothing" }));
    fail(() => locate(document, refs, { css: "p[" }));
    fail(() => locate(document, refs, { role: "heading" }));
    fail(() => locate(document, refs, null));
    expect(reset).not.toHaveBeenCalled();
    for (const [ref, el] of before) expect(refs.get(ref)).toBe(el);
    // A locate does not change any snapshot ref.
    expect(locate(document, refs, { role: "link" }).ref).toBe(snap.elements[1]!.ref);
  });
});

describe("D9 invariant: locate {role, nth} walks exactly what the snapshot lists", () => {
  const fixtures: SnapshotFixture[] = [SHADOW_OPEN, SHADOW_DEPTH, IFRAME_SAME_ORIGIN, IFRAMES_TWO, PLAYGROUND_STATIC, PLAYGROUND_WITH_SCRIPT_DOM];
  for (const f of fixtures) {
    it(`${f.name}: the i-th element of each role, and nth = count is not found`, () => {
      const teardown = f.setup();
      try {
        const refs = new RefMap();
        const { elements } = buildSnapshot(document, refs);
        expect(elements.length).toBeGreaterThan(0);
        const byRole = new Map<string, typeof elements>();
        for (const e of elements) byRole.set(e.role, [...(byRole.get(e.role) ?? []), e]);
        for (const [role, list] of byRole) {
          list.forEach((e, i) => {
            expect(locate(document, refs, { role, nth: i })).toEqual({ ref: e.ref, role, name: e.name });
          });
          const e = fail(() => locate(document, refs, { role, nth: list.length }));
          expect(e.code).toBe("LOCATOR_NOT_FOUND");
        }
        // Every snapshot ref still resolves to the element it named.
        const again = buildSnapshot(document, new RefMap());
        expect(again.elements.map((e) => [e.role, e.name])).toEqual(elements.map((e) => [e.role, e.name]));
      } finally {
        teardown();
      }
    });
  }
});

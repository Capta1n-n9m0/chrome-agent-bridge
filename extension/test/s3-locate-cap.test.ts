// @vitest-environment jsdom
/**
 * Step 10 S3.1 (phase doc 0.3; decisions.md #117; stage0-audit.md F14, F18, F23): `locate` flags a match
 * past the snapshot's 800-element cap with `pastSnapshotCap: true`, and sets no key otherwise.
 *
 * The oracle is never `truncated` (F23): a listable match is flagged iff it is not among the elements of
 * `buildSnapshot(...)` (its first 800 listed), and a non-listable match iff at least 800 listable elements
 * come before it — plain index arithmetic over fixtures built from buttons.
 */
import { describe, it, expect, afterEach } from "vitest";
import { capCounter, locate } from "../src/content/locate.js";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";
import { walkElements } from "../src/content/a11y.js";
import { FIXTURES } from "./snapshot-fixtures.js";

const CAP = 800;

const buttons = (n: number, prefix = "b"): string =>
  Array.from({ length: n }, (_, i) => `<button>${prefix}${i}</button>`).join("");

const rect = (w: number, h: number) =>
  ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON() {} }) as DOMRect;

afterEach(() => {
  delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
  document.body.innerHTML = "";
});

/** Whether `el` is among the elements a snapshot taken now lists (a fresh RefMap: the oracle's own). */
function inSnapshot(el: Element): boolean {
  const refs = new RefMap();
  return buildSnapshot(document, refs).elements.some((e) => refs.get(e.ref) === el);
}

function flagOf(r: object): boolean | "absent" {
  return "pastSnapshotCap" in r ? (r as { pastSnapshotCap: boolean }).pastSnapshotCap : "absent";
}

describe("S3.1 a page with 1 000 listable elements", () => {
  it("listable element 900 → pastSnapshotCap: true (and the snapshot does not list it)", () => {
    document.body.innerHTML = buttons(1000);
    const refs = new RefMap();
    const r = locate(document, refs, { role: "button", name: "b900", exact: true });
    expect(r).toEqual({ ref: r.ref, role: "button", name: "b900", pastSnapshotCap: true });
    expect(inSnapshot(refs.get(r.ref)!)).toBe(false);
  });

  it("listable element 10 → the key is absent (not false, not undefined), and the snapshot lists it", () => {
    document.body.innerHTML = buttons(1000);
    const refs = new RefMap();
    const r = locate(document, refs, { role: "button", name: "b10", exact: true });
    expect("pastSnapshotCap" in r).toBe(false);
    expect(Object.keys(r).sort()).toEqual(["name", "ref", "role"]);
    expect(inSnapshot(refs.get(r.ref)!)).toBe(true);
  });

  it("{role} with nth past the cap → true; nth before it → absent (the flag is about the chosen match)", () => {
    document.body.innerHTML = buttons(1000);
    expect(flagOf(locate(document, new RefMap(), { role: "button", nth: 850 }))).toBe(true);
    expect(flagOf(locate(document, new RefMap(), { role: "button", nth: 5 }))).toBe("absent");
  });

  it("a non-listable {css} match before the 800th listable → absent; after it → true", () => {
    document.body.innerHTML = `${buttons(500)}<div class="before">x</div>${buttons(300, "c")}<div class="right-after">y</div>${buttons(200, "d")}<div class="after">z</div>`;
    expect(flagOf(locate(document, new RefMap(), { css: ".before" }))).toBe("absent");
    // 800 listable elements precede it: it comes after the 800th.
    expect(flagOf(locate(document, new RefMap(), { css: ".right-after" }))).toBe(true);
    expect(flagOf(locate(document, new RefMap(), { css: ".after" }))).toBe(true);
  });

  it("a non-listable {css} match with exactly 799 listable before it → absent", () => {
    document.body.innerHTML = `${buttons(799)}<div class="edge">x</div>${buttons(201, "c")}`;
    expect(flagOf(locate(document, new RefMap(), { css: ".edge" }))).toBe("absent");
  });

  it("a {text} match past the cap → true; before the cap → absent", () => {
    document.body.innerHTML = `<p>early needle</p>${buttons(1000)}<p>late haystack</p>`;
    expect(flagOf(locate(document, new RefMap(), { text: "haystack" }))).toBe(true);
    expect(flagOf(locate(document, new RefMap(), { text: "early needle" }))).toBe("absent");
  });

  it("a {css} match of a listable element follows the listable rule: index 799 absent, 800 true", () => {
    document.body.innerHTML = buttons(1000);
    expect(flagOf(locate(document, new RefMap(), { css: "button", nth: 799 }))).toBe("absent");
    expect(flagOf(locate(document, new RefMap(), { css: "button", nth: 800 }))).toBe(true);
  });
});

describe("S3.1 the boundary: 799, 800 and 801 listable elements", () => {
  // Every index is checked through the counter `locate` uses, in one walk; `locate` itself runs end to
  // end at sampled indices. One `locate` per index costs ~140 ms on an 800-button jsdom page (~110 s
  // per page, measured on the first run of this file), so a locate at every index is not run.
  /** The indices (among the page's buttons, in walk order) the counter calls past the cap. */
  function pastIndices(): number[] {
    const counter = capCounter();
    const all = Array.from(document.querySelectorAll("button"));
    const past: number[] = [];
    walkElements<null>(document, null, {
      enter: (el) => {
        if (counter.visit(el)) past.push(all.indexOf(el as HTMLButtonElement));
        return null;
      },
    });
    return counter.exceeded() ? past : [];
  }

  for (const n of [799, 800]) {
    it(`${n}-listable page → absent at every index`, () => {
      document.body.innerHTML = buttons(n);
      expect(pastIndices()).toEqual([]);
      for (const i of [0, 1, Math.floor(n / 2), n - 2, n - 1]) {
        const r = locate(document, new RefMap(), { role: "button", name: `b${i}`, exact: true });
        expect("pastSnapshotCap" in r, `index ${i}`).toBe(false);
      }
    });
  }

  it("801-listable page: the counter calls exactly index 800 past the cap", () => {
    document.body.innerHTML = buttons(801);
    expect(pastIndices()).toEqual([800]);
  });

  it("801-listable page: index 799 (the 800th) → absent, index 800 (the 801st) → true", () => {
    document.body.innerHTML = buttons(801);
    const refs = new RefMap();
    const at799 = locate(document, refs, { role: "button", name: "b799", exact: true });
    const at800 = locate(document, refs, { role: "button", name: "b800", exact: true });
    expect("pastSnapshotCap" in at799).toBe(false);
    expect(at800.pastSnapshotCap).toBe(true);
    expect(inSnapshot(refs.get(at799.ref)!)).toBe(true);
    expect(inSnapshot(refs.get(at800.ref)!)).toBe(false);
  });

  it("the 800 here is the snapshot's own cap: an 801-listable snapshot lists 800 elements", () => {
    document.body.innerHTML = buttons(801);
    expect(buildSnapshot(document, new RefMap()).elements.length).toBe(CAP);
  });
});

describe("S3 fixer 1 (verifier finding 1): nothing is past the cap on a page with at most 800 listable elements", () => {
  // Phase doc 0.3: "Nothing changes on a page with <= 800 listable elements." A non-listable match after
  // the 800th listable element is past only when the page has an 801st.
  it("800 buttons + a trailing <p> → {text} and {css} on the <p>: absent", () => {
    document.body.innerHTML = `${buttons(800)}<p class="tail">tail words</p>`;
    expect(flagOf(locate(document, new RefMap(), { text: "tail words" }))).toBe("absent");
    expect(flagOf(locate(document, new RefMap(), { css: "p.tail" }))).toBe("absent");
  });

  it("800 buttons + a <p> + 1 more button → {text} and {css} on the <p>: true", () => {
    document.body.innerHTML = `${buttons(800)}<p class="tail">tail words</p><button>one more</button>`;
    expect(flagOf(locate(document, new RefMap(), { text: "tail words" }))).toBe(true);
    expect(flagOf(locate(document, new RefMap(), { css: "p.tail" }))).toBe(true);
  });

  it("799 buttons + <button><span> (the 800th) → the span via {text}: absent", () => {
    document.body.innerHTML = `${buttons(799)}<button><span>last label</span></button>`;
    const refs = new RefMap();
    const r = locate(document, refs, { text: "last label" });
    expect(refs.get(r.ref)!.tagName).toBe("SPAN");
    expect("pastSnapshotCap" in r).toBe(false);
  });
});

describe("S3 fixer 1 (verifier finding 2): a descendant of the 800th listable element is past on a > 800 page", () => {
  // Pinned by design (step agent's ruling): phase doc 0.3 defines a non-listable match as past "when it
  // comes after the 800th listable element in walk order"; the walk is pre-order, so a descendant of the
  // 800th comes after it, and on a page with more than 800 listable elements it is flagged.
  it("799 buttons + <button><span> + 200 buttons → the span via {text}: true", () => {
    document.body.innerHTML = `${buttons(799)}<button><span>edge label</span></button>${buttons(200, "c")}`;
    const refs = new RefMap();
    const r = locate(document, refs, { text: "edge label" });
    expect(refs.get(r.ref)!.tagName).toBe("SPAN");
    expect(r.pastSnapshotCap).toBe(true);
  });
});

describe("S3.1 listable elements in an open shadow root and a same-origin frame count", () => {
  function build(inShadow: number, inFrame: number): void {
    document.body.innerHTML = `<div id="host"></div><iframe id="f"></iframe><button>target</button>`;
    document.getElementById("host")!.attachShadow({ mode: "open" }).innerHTML = buttons(inShadow, "s");
    (document.getElementById("f") as HTMLIFrameElement).contentDocument!.body.innerHTML = buttons(inFrame, "f");
  }

  it("400 in the shadow root + 400 in the frame before the target → the target is the 801st: true", () => {
    build(400, 400);
    const refs = new RefMap();
    const r = locate(document, refs, { role: "button", name: "target", exact: true });
    expect(r.pastSnapshotCap).toBe(true);
    expect(inSnapshot(refs.get(r.ref)!)).toBe(false);
  });

  it("400 + 399 before the target → the target is the 800th: absent", () => {
    build(400, 399);
    const refs = new RefMap();
    const r = locate(document, refs, { role: "button", name: "target", exact: true });
    expect("pastSnapshotCap" in r).toBe(false);
    expect(inSnapshot(refs.get(r.ref)!)).toBe(true);
  });

  it("a {text} match after them, likewise", () => {
    build(400, 400);
    expect(flagOf(locate(document, new RefMap(), { text: "target" }))).toBe(true);
  });
});

describe("S3.1 the zero-size gate: a zero-size listable-role element is not counted", () => {
  it("with layout, 799 sized buttons + 5 zero-size ones before the target: the target is the 800th listable → absent", () => {
    document.body.innerHTML = `${buttons(400)}${'<button class="zero">z</button>'.repeat(5)}${buttons(399, "c")}<button id="t">target</button>${buttons(50, "d")}`;
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    for (const el of Array.from(document.querySelectorAll("button"))) {
      const zero = el.classList.contains("zero");
      (el as HTMLElement).getBoundingClientRect = () => (zero ? rect(0, 0) : rect(80, 24));
    }
    const refs = new RefMap();
    const r = locate(document, refs, { role: "button", name: "target", exact: true });
    expect("pastSnapshotCap" in r).toBe(false);
    expect(inSnapshot(refs.get(r.ref)!)).toBe(true);
    // Control: one more sized button before it pushes it past.
    document.getElementById("t")!.insertAdjacentHTML("beforebegin", "<button>extra</button>");
    for (const el of Array.from(document.querySelectorAll("button"))) {
      const zero = el.classList.contains("zero");
      (el as HTMLElement).getBoundingClientRect = () => (zero ? rect(0, 0) : rect(80, 24));
    }
    expect(locate(document, new RefMap(), { role: "button", name: "target", exact: true }).pastSnapshotCap).toBe(true);
  });
});

describe("S3.1 cross-check over the pre-S1 fixtures (`snapshot-pre-s1.json`)", () => {
  // The capture holds 45 fixtures (its JSON array's length), not the 46 CLAUDE.md and the brief name;
  // three of them ("cap: 900 buttons", "cap: 800 buttons", "cap: 850 mixed, …") list 800 elements.
  it("there are 45 fixtures, as many as the capture", () => {
    expect(FIXTURES.length).toBe(45);
  });
  for (const f of FIXTURES) {
    it(`${f.name}: the counter agrees with the snapshot; below the cap no locate result carries the flag`, () => {
      const teardown = f.setup();
      try {
        const refs = new RefMap();
        const snap = buildSnapshot(document, refs);
        const listedEls = new Set(snap.elements.map((e) => refs.get(e.ref)));
        const counter = capCounter();
        const past: Element[] = [];
        walkElements<null>(document, null, {
          enter: (el) => {
            if (counter.visit(el)) past.push(el);
            return null;
          },
        });
        // Nothing the snapshot lists is past the cap; the counter stops one past the snapshot's own
        // cap (the 801st listable element proves the page has more than 800). On a page with at most
        // 800 listable elements nothing at all — listable or not — is past (S3 fixer 1, finding 1).
        expect(past.filter((el) => listedEls.has(el))).toEqual([]);
        if (counter.exceeded()) {
          expect(snap.elements.length).toBe(CAP);
          expect(counter.listed()).toBe(CAP + 1);
        } else {
          expect(counter.listed()).toBe(snap.elements.length);
          // Every element the walk enters after the 800th listable one (none on these fixtures, any on a
          // page like "800 buttons + <p>") is located end to end and carries no flag.
          for (const el of past.slice(0, 50)) {
            el.setAttribute("data-s3-probe", "");
            try {
              expect("pastSnapshotCap" in locate(document, new RefMap(), { css: "[data-s3-probe]" })).toBe(false);
            } finally {
              el.removeAttribute("data-s3-probe");
            }
          }
        }
        // End to end on the small pages (a locate per element; the big cap pages are covered above).
        const all = document.body.querySelectorAll("*").length;
        if (snap.elements.length < CAP && all <= 200) {
          for (let i = 0; i < all; i++) {
            let r: object;
            try {
              r = locate(document, new RefMap(), { css: "*", nth: i });
            } catch {
              break; // past the end of the walk's matches (pruned or zero-size elements)
            }
            expect("pastSnapshotCap" in r).toBe(false);
          }
        }
      } finally {
        teardown();
      }
    });
  }

  it("on the 900-button capture fixture, exactly the 100 buttons the snapshot omits are past the cap", () => {
    const f = FIXTURES.find((x) => x.name === "cap: 900 buttons")!;
    const teardown = f.setup();
    try {
      const counter = capCounter();
      let past = 0;
      walkElements<null>(document, null, {
        enter: (el) => {
          if (counter.visit(el)) past += 1;
          return null;
        },
      });
      expect(past).toBe(100);
    } finally {
      teardown();
    }
  });
});

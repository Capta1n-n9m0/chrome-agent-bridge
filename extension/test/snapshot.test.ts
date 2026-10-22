// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import type { SnapshotElement } from "@bridge/shared";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";

/** `[role, name]` of each element, in order — what the old text lines carried apart from the ref. */
const pairs = (els: SnapshotElement[]) => els.map((e) => [e.role, e.name]);
const names = (els: SnapshotElement[]) => els.map((e) => e.name);
const byName = (els: SnapshotElement[], name: string) => els.find((e) => e.name === name);

const rect = (w: number, h: number) =>
  ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON() {} }) as DOMRect;

describe("buildSnapshot", () => {
  it("lists interactive elements with role, accessible name, and ref", () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Email" />
      <button>Sign in</button>
      <a href="/forgot">Forgot password?</a>
      <p>not interactive</p>
    `;
    const map = new RefMap();
    const { elements } = buildSnapshot(document, map);
    expect(elements.map((e) => [e.role, e.name, e.ref])).toEqual([
      ["textbox", "Email", "e1"],
      ["button", "Sign in", "e2"],
      ["link", "Forgot password?", "e3"],
    ]);
    expect(names(elements)).not.toContain("not interactive");
  });

  it("skips hidden elements", () => {
    document.body.innerHTML = `<button style="display:none">Hidden</button><button>Shown</button>`;
    const map = new RefMap();
    const { elements } = buildSnapshot(document, map);
    expect(names(elements)).not.toContain("Hidden");
    expect(pairs(elements)).toEqual([["button", "Shown"]]);
  });

  it("returns a refs count matching the listed elements", () => {
    document.body.innerHTML = `<button>A</button><button>B</button>`;
    const map = new RefMap();
    const { elements } = buildSnapshot(document, map);
    expect(elements).toHaveLength(2);
    expect(elements.map((e) => e.ref)).toEqual(["e1", "e2"]);
  });

  it("names an input via an associated <label for>", () => {
    document.body.innerHTML = `<label for="email">Email address</label><input id="email" type="text" />`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements[0]).toMatchObject({ role: "textbox", name: "Email address", ref: "e1" });
  });

  it("names an input via aria-labelledby", () => {
    document.body.innerHTML = `<span id="lbl">Password</span><input aria-labelledby="lbl" type="password" />`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([["textbox", "Password"]]);
  });

  it("names an input wrapped in a <label>", () => {
    document.body.innerHTML = `<label>Username <input type="text" /></label>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([["textbox", "Username"]]);
  });

  it("prefers aria-label over an associated label", () => {
    document.body.innerHTML = `<label for="x">Wrong</label><input id="x" aria-label="Right" type="text" />`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([["textbox", "Right"]]);
  });
});

describe("buildSnapshot — hidden subtrees", () => {
  it("prunes descendants of a display:none ancestor", () => {
    document.body.innerHTML = `<div style="display:none"><button>Buried</button></div><button>Shown</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(names(elements)).not.toContain("Buried");
    expect(pairs(elements)).toEqual([["button", "Shown"]]);
  });

  it("prunes an aria-hidden subtree", () => {
    document.body.innerHTML = `<div aria-hidden="true"><button>Decorative</button></div><button>Real</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(names(elements)).not.toContain("Decorative");
    expect(pairs(elements)).toEqual([["button", "Real"]]);
  });

  it("prunes an inert subtree", () => {
    document.body.innerHTML = `<div inert><button>Behind modal</button></div><button>Modal action</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(names(elements)).not.toContain("Behind modal");
    expect(pairs(elements)).toEqual([["button", "Modal action"]]);
  });

  it("skips zero-size elements when the document reports layout", () => {
    document.body.innerHTML = `<button id="zero">Collapsed</button><button id="sized">Visible</button>`;
    // jsdom has no layout engine; fake enough of one to exercise the size filter.
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    const zero = document.getElementById("zero")!;
    const sized = document.getElementById("sized")!;
    zero.getBoundingClientRect = () => rect(0, 0);
    sized.getBoundingClientRect = () => rect(80, 24);
    try {
      const { elements } = buildSnapshot(document, new RefMap());
      expect(names(elements)).not.toContain("Collapsed");
      expect(pairs(elements)).toEqual([["button", "Visible"]]);
    } finally {
      // jsdom shares one document across the file; drop the fake layout again.
      delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
    }
  });

  it("keeps every element when the document reports no layout", () => {
    document.body.innerHTML = `<button>A</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements).toHaveLength(1);
  });
});

describe("buildSnapshot — shadow DOM", () => {
  it("descends into an open shadow root", () => {
    document.body.innerHTML = `<div id="host"></div><button>Light</button>`;
    const host = document.getElementById("host")!;
    host.attachShadow({ mode: "open" }).innerHTML = `<button>Shadow</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([
      ["button", "Shadow"],
      ["button", "Light"],
    ]);
  });

  it("does not descend into a closed shadow root", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    document.getElementById("host")!.attachShadow({ mode: "closed" }).innerHTML = `<button>Sealed</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements).toHaveLength(0);
  });

  it("assigns refs that resolve back to shadow elements", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.getElementById("host")!;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<button>Shadow</button>`;
    const map = new RefMap();
    const { elements } = buildSnapshot(document, map);
    expect(elements[0]!.ref).toBe("e1");
    expect(map.get("e1")).toBe(root.querySelector("button"));
  });
});

describe("buildSnapshot — iframes", () => {
  it("descends into a same-origin iframe", () => {
    document.body.innerHTML = `<iframe id="f"></iframe><button>Top</button>`;
    const frame = document.getElementById("f") as HTMLIFrameElement;
    frame.contentDocument!.body.innerHTML = `<button>Inner</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([
      ["button", "Inner"],
      ["button", "Top"],
    ]);
  });

  it("skips a cross-origin iframe whose document is unreachable", () => {
    document.body.innerHTML = `<iframe id="f"></iframe><button>Top</button>`;
    const frame = document.getElementById("f") as HTMLIFrameElement;
    // Chrome hands back null for a cross-origin frame rather than throwing.
    Object.defineProperty(frame, "contentDocument", { get: () => null });
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([["button", "Top"]]);
    expect(elements[0]!.frame).toBeUndefined();
  });
});

describe("buildSnapshot — roles", () => {
  it("maps additional native controls", () => {
    document.body.innerHTML = `
      <input type="number" aria-label="Qty" />
      <input type="range" aria-label="Volume" />
      <input type="file" aria-label="Avatar" />
      <select multiple aria-label="Tags"></select>
      <div contenteditable="true" aria-label="Body"></div>
    `;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([
      ["spinbutton", "Qty"],
      ["slider", "Volume"],
      ["button", "Avatar"],
      ["listbox", "Tags"],
      ["textbox", "Body"],
    ]);
  });

  it("passes through explicit interactive ARIA roles", () => {
    document.body.innerHTML = `
      <div role="tab" aria-label="Details"></div>
      <div role="menuitem" aria-label="Rename"></div>
      <div role="switch" aria-label="Dark mode"></div>
      <div role="option" aria-label="Blue"></div>
    `;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([
      ["tab", "Details"],
      ["menuitem", "Rename"],
      ["switch", "Dark mode"],
      ["option", "Blue"],
    ]);
  });

  it("lets an explicit role override the native mapping", () => {
    document.body.innerHTML = `<a href="/x" role="button">Looks like a button</a>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(pairs(elements)).toEqual([["button", "Looks like a button"]]);
    expect(elements.some((e) => e.role === "link")).toBe(false);
    expect(elements[0]!.href).toBeUndefined(); // href only for role link
  });

  it("marks disabled controls", () => {
    document.body.innerHTML = `<button disabled>Save</button><button>Cancel</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements[0]).toMatchObject({ role: "button", name: "Save", ref: "e1", disabled: true });
    expect(elements[1]).toMatchObject({ role: "button", name: "Cancel", ref: "e2" });
    expect("disabled" in elements[1]!).toBe(false);
  });

  it("ignores non-interactive ARIA roles", () => {
    document.body.innerHTML = `<div role="tablist"><div role="presentation">x</div></div>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements).toHaveLength(0);
  });
});

describe("buildSnapshot — large pages", () => {
  it("caps the number of listed elements and says so", () => {
    document.body.innerHTML = Array.from({ length: 900 }, (_, i) => `<button>B${i}</button>`).join("");
    const { elements, truncated } = buildSnapshot(document, new RefMap());
    expect(elements).toHaveLength(800);
    expect(truncated).toBe(true);
    expect(elements[799]!.name).toBe("B799");
  });
});

// --- T3.2: the structured result (Step 7 decision 0.7) --------------------------------------

describe("buildSnapshot — result shape (0.7)", () => {
  it("returns exactly {url, title, elements, truncated}", () => {
    document.title = "Fixture \"page\"";
    document.body.innerHTML = `<button>A</button>`;
    const result = buildSnapshot(document, new RefMap());
    expect(Object.keys(result).sort()).toEqual(["elements", "title", "truncated", "url"]);
    expect(result.url).toBe(document.location.href);
    expect(result.title).toBe('Fixture "page"');
    expect(result.truncated).toBe(false);
    expect("text" in result).toBe(false);
    expect("count" in result).toBe(false);
    document.title = "";
  });

  it("an element carries only ref, role, name, depth when nothing else applies", () => {
    document.body.innerHTML = `<button>Plain</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements[0]).toEqual({ ref: "e1", role: "button", name: "Plain", depth: 0 });
  });

  it("is not truncated at 799 elements and truncated at exactly 800", () => {
    document.body.innerHTML = Array.from({ length: 799 }, (_, i) => `<button>B${i}</button>`).join("");
    expect(buildSnapshot(document, new RefMap()).truncated).toBe(false);
    document.body.innerHTML = Array.from({ length: 800 }, (_, i) => `<button>B${i}</button>`).join("");
    const r = buildSnapshot(document, new RefMap());
    expect(r.elements).toHaveLength(800);
    expect(r.truncated).toBe(true);
  });
});

describe("buildSnapshot — element fields (0.7)", () => {
  it("value: inputs, textarea, spinbutton, slider, select; capped at 120 with …", () => {
    const long = "x".repeat(130);
    document.body.innerHTML = `
      <input type="text" aria-label="T" value="hello  world" />
      <textarea aria-label="Area"></textarea>
      <input type="number" aria-label="N" value="7" />
      <input type="range" aria-label="R" min="0" max="10" value="3" />
      <select aria-label="C"><option value="a">A</option><option value="b" selected>B</option></select>
      <input type="text" aria-label="Long" value="${long}" />
    `;
    (document.querySelector("textarea") as HTMLTextAreaElement).value = "line1\nline2";
    const { elements } = buildSnapshot(document, new RefMap());
    expect(byName(elements, "T")!.value).toBe("hello  world"); // no whitespace collapsing
    expect(byName(elements, "Area")!.value).toBe("line1\nline2");
    expect(byName(elements, "N")!.value).toBe("7");
    expect(byName(elements, "R")!.value).toBe("3");
    expect(byName(elements, "C")!.value).toBe("b");
    expect(byName(elements, "Long")!.value).toBe(`${"x".repeat(119)}…`);
  });

  it("value: never for a password input (key absent), never for contenteditable or a button", () => {
    document.body.innerHTML = `
      <input type="password" aria-label="Pw" value="hunter2" />
      <input type="PASSWORD" role="textbox" aria-label="Pw2" value="hunter3" />
      <div contenteditable="true" aria-label="Rich">typed</div>
      <button value="v">Btn</button>
    `;
    const result = buildSnapshot(document, new RefMap());
    for (const name of ["Pw", "Pw2", "Rich", "Btn"]) expect("value" in byName(result.elements, name)!).toBe(false);
    expect(JSON.stringify(result)).not.toContain("hunter");
  });

  it("checked: native inputs and aria-checked; omitted when absent or mixed and for other roles", () => {
    document.body.innerHTML = `
      <input type="checkbox" aria-label="On" checked />
      <input type="checkbox" aria-label="Off" />
      <input type="radio" aria-label="Radio" checked />
      <div role="switch" aria-label="Sw" aria-checked="true"></div>
      <div role="menuitemcheckbox" aria-label="Mic" aria-checked="false"></div>
      <div role="menuitemradio" aria-label="Mir" aria-checked="true"></div>
      <div role="checkbox" aria-label="Mixed" aria-checked="mixed"></div>
      <div role="checkbox" aria-label="Unset"></div>
      <button aria-checked="true">NotCheckable</button>
    `;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(byName(elements, "On")!.checked).toBe(true);
    expect(byName(elements, "Off")!.checked).toBe(false);
    expect(byName(elements, "Radio")!.checked).toBe(true);
    expect(byName(elements, "Sw")!.checked).toBe(true);
    expect(byName(elements, "Mic")!.checked).toBe(false);
    expect(byName(elements, "Mir")!.checked).toBe(true);
    for (const n of ["Mixed", "Unset", "NotCheckable"]) expect("checked" in byName(elements, n)!).toBe(false);
  });

  it("expanded: aria-expanded, and <summary> from its <details>.open", () => {
    document.body.innerHTML = `
      <button aria-expanded="true">Menu</button>
      <button aria-expanded="false">Closed</button>
      <button>NoAria</button>
      <details open><summary>Open details</summary></details>
      <details><summary>Shut details</summary></details>
    `;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(byName(elements, "Menu")!.expanded).toBe(true);
    expect(byName(elements, "Closed")!.expanded).toBe(false);
    expect("expanded" in byName(elements, "NoAria")!).toBe(false);
    expect(byName(elements, "Open details")!.expanded).toBe(true);
    expect(byName(elements, "Shut details")!.expanded).toBe(false);
  });

  it("selected: <option>.selected, else aria-selected", () => {
    document.body.innerHTML = `
      <div role="tab" aria-label="Tab1" aria-selected="true"></div>
      <div role="tab" aria-label="Tab2" aria-selected="false"></div>
      <div role="tab" aria-label="Tab3"></div>
    `;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(byName(elements, "Tab1")!.selected).toBe(true);
    expect(byName(elements, "Tab2")!.selected).toBe(false);
    expect("selected" in byName(elements, "Tab3")!).toBe(false);

    // A listed <option> (role=option on the element itself) reads the native property.
    document.body.innerHTML = `<select multiple aria-label="L"><option role="option" selected>One</option><option role="option">Two</option></select>`;
    const r = buildSnapshot(document, new RefMap());
    expect(byName(r.elements, "One")!.selected).toBe(true);
    expect(byName(r.elements, "Two")!.selected).toBe(false);
  });

  it("href: the resolved href of a link; absent elsewhere", () => {
    document.body.innerHTML = `<a href="/forgot?x=1">Forgot</a><div role="link" aria-label="Fake"></div><button>B</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(byName(elements, "Forgot")!.href).toBe(new URL("/forgot?x=1", document.location.href).href);
    expect("href" in byName(elements, "Fake")!).toBe(false);
    expect("href" in byName(elements, "B")!).toBe(false);
  });

  it("depth: the number of listed ancestors, ignoring unlisted wrappers", () => {
    document.body.innerHTML = `
      <div role="menuitem" aria-label="Outer">
        <div><span>
          <button>Inner</button>
          <div role="option" aria-label="Deep"><a href="/x">Deepest</a></div>
        </span></div>
      </div>
      <button>Sibling</button>
    `;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements.map((e) => [e.name, e.depth])).toEqual([
      ["Outer", 0],
      ["Inner", 1],
      ["Deep", 1],
      ["Deepest", 2],
      ["Sibling", 0],
    ]);
  });

  it("depth counts across an open shadow root", () => {
    document.body.innerHTML = `<div role="tab" aria-label="Host" id="host"></div>`;
    document.getElementById("host")!.attachShadow({ mode: "open" }).innerHTML = `<button>In shadow</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements.map((e) => [e.name, e.depth, e.frame])).toEqual([
      ["Host", 0, undefined],
      ["In shadow", 1, undefined],
    ]);
  });
});

describe("buildSnapshot — frames (0.7)", () => {
  it("frame: absent in the top document, the 1-based entry order inside same-origin frames", () => {
    document.body.innerHTML = `<button>Top</button><iframe id="f1"></iframe><iframe id="f2"></iframe>`;
    (document.getElementById("f1") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>In one</button>`;
    (document.getElementById("f2") as HTMLIFrameElement).contentDocument!.body.innerHTML =
      `<input type="text" aria-label="In two" value="v" /><input type="password" aria-label="Pw" value="secret" />`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements.map((e) => [e.name, e.frame, e.depth])).toEqual([
      ["Top", undefined, 0],
      ["In one", 1, 0],
      ["In two", 2, 0],
      ["Pw", 2, 0],
    ]);
    expect("frame" in elements[0]!).toBe(false);
    // Field extraction works on elements from the frame's own realm.
    expect(byName(elements, "In two")!.value).toBe("v");
    expect("value" in byName(elements, "Pw")!).toBe(false);
  });

  it("an empty same-origin frame still takes its index", () => {
    document.body.innerHTML = `<iframe id="a"></iframe><iframe id="b"></iframe>`;
    (document.getElementById("b") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>In b</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements.map((e) => [e.name, e.frame])).toEqual([["In b", 2]]);
  });

  it("a listed frame element's content is one level deeper", () => {
    document.body.innerHTML = `<div role="tab" aria-label="Tabpanel"><iframe id="f"></iframe></div>`;
    (document.getElementById("f") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>Framed</button>`;
    const { elements } = buildSnapshot(document, new RefMap());
    expect(elements.map((e) => [e.name, e.depth, e.frame])).toEqual([
      ["Tabpanel", 0, undefined],
      ["Framed", 1, 1],
    ]);
  });
});

describe("buildSnapshot — the zero-size filter stays gated on layout", () => {
  it("drops a zero-size element from elements only when documentElement reports a layout", () => {
    document.body.innerHTML = `<button id="z">Zero</button><button id="o">Other</button>`;
    document.getElementById("z")!.getBoundingClientRect = () => rect(0, 0);
    document.getElementById("o")!.getBoundingClientRect = () => rect(60, 20);
    // No layout (jsdom default for documentElement): the zero-size element stays.
    expect(names(buildSnapshot(document, new RefMap()).elements)).toEqual(["Zero", "Other"]);
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    try {
      expect(names(buildSnapshot(document, new RefMap()).elements)).toEqual(["Other"]);
    } finally {
      delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
    }
  });

  it("a zero-size wrapper is skipped but its laid-out children are kept", () => {
    document.body.innerHTML = `<div role="menuitem" aria-label="Wrapper" id="w"><button id="c">Child</button></div>`;
    document.getElementById("w")!.getBoundingClientRect = () => rect(0, 0);
    document.getElementById("c")!.getBoundingClientRect = () => rect(40, 20);
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    try {
      const { elements } = buildSnapshot(document, new RefMap());
      expect(elements.map((e) => [e.name, e.depth])).toEqual([["Child", 0]]);
    } finally {
      delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
    }
  });
});

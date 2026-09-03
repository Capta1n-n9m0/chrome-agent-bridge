// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";

describe("buildSnapshot", () => {
  it("lists interactive elements with role, accessible name, and ref", () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Email" />
      <button>Sign in</button>
      <a href="/forgot">Forgot password?</a>
      <p>not interactive</p>
    `;
    const map = new RefMap();
    const { text } = buildSnapshot(document, map);
    expect(text).toContain('textbox "Email" [ref=e1]');
    expect(text).toContain('button "Sign in" [ref=e2]');
    expect(text).toContain('link "Forgot password?" [ref=e3]');
    expect(text).not.toContain("not interactive");
  });

  it("skips hidden elements", () => {
    document.body.innerHTML = `<button style="display:none">Hidden</button><button>Shown</button>`;
    const map = new RefMap();
    const { text } = buildSnapshot(document, map);
    expect(text).not.toContain("Hidden");
    expect(text).toContain('button "Shown"');
  });

  it("returns a refs count matching the listed elements", () => {
    document.body.innerHTML = `<button>A</button><button>B</button>`;
    const map = new RefMap();
    const { count } = buildSnapshot(document, map);
    expect(count).toBe(2);
  });

  it("names an input via an associated <label for>", () => {
    document.body.innerHTML = `<label for="email">Email address</label><input id="email" type="text" />`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('textbox "Email address" [ref=e1]');
  });

  it("names an input via aria-labelledby", () => {
    document.body.innerHTML = `<span id="lbl">Password</span><input aria-labelledby="lbl" type="password" />`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('textbox "Password"');
  });

  it("names an input wrapped in a <label>", () => {
    document.body.innerHTML = `<label>Username <input type="text" /></label>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('textbox "Username"');
  });

  it("prefers aria-label over an associated label", () => {
    document.body.innerHTML = `<label for="x">Wrong</label><input id="x" aria-label="Right" type="text" />`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('textbox "Right"');
  });
});

describe("buildSnapshot — hidden subtrees", () => {
  it("prunes descendants of a display:none ancestor", () => {
    document.body.innerHTML = `<div style="display:none"><button>Buried</button></div><button>Shown</button>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).not.toContain("Buried");
    expect(text).toContain('button "Shown"');
  });

  it("prunes an aria-hidden subtree", () => {
    document.body.innerHTML = `<div aria-hidden="true"><button>Decorative</button></div><button>Real</button>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).not.toContain("Decorative");
    expect(text).toContain('button "Real"');
  });

  it("prunes an inert subtree", () => {
    document.body.innerHTML = `<div inert><button>Behind modal</button></div><button>Modal action</button>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).not.toContain("Behind modal");
    expect(text).toContain('button "Modal action"');
  });

  it("skips zero-size elements when the document reports layout", () => {
    document.body.innerHTML = `<button id="zero">Collapsed</button><button id="sized">Visible</button>`;
    const rect = (w: number, h: number) =>
      ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON() {} }) as DOMRect;
    // jsdom has no layout engine; fake enough of one to exercise the size filter.
    document.documentElement.getBoundingClientRect = () => rect(1024, 768);
    const zero = document.getElementById("zero")!;
    const sized = document.getElementById("sized")!;
    zero.getBoundingClientRect = () => rect(0, 0);
    sized.getBoundingClientRect = () => rect(80, 24);
    try {
      const { text } = buildSnapshot(document, new RefMap());
      expect(text).not.toContain("Collapsed");
      expect(text).toContain('button "Visible"');
    } finally {
      // jsdom shares one document across the file; drop the fake layout again.
      delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
    }
  });

  it("keeps every element when the document reports no layout", () => {
    document.body.innerHTML = `<button>A</button>`;
    const { count } = buildSnapshot(document, new RefMap());
    expect(count).toBe(1);
  });
});

describe("buildSnapshot — shadow DOM", () => {
  it("descends into an open shadow root", () => {
    document.body.innerHTML = `<div id="host"></div><button>Light</button>`;
    const host = document.getElementById("host")!;
    host.attachShadow({ mode: "open" }).innerHTML = `<button>Shadow</button>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('button "Shadow"');
    expect(text).toContain('button "Light"');
  });

  it("does not descend into a closed shadow root", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    document.getElementById("host")!.attachShadow({ mode: "closed" }).innerHTML = `<button>Sealed</button>`;
    const { count } = buildSnapshot(document, new RefMap());
    expect(count).toBe(0);
  });

  it("assigns refs that resolve back to shadow elements", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.getElementById("host")!;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<button>Shadow</button>`;
    const map = new RefMap();
    buildSnapshot(document, map);
    expect(map.get("e1")).toBe(root.querySelector("button"));
  });
});

describe("buildSnapshot — iframes", () => {
  it("descends into a same-origin iframe", () => {
    document.body.innerHTML = `<iframe id="f"></iframe><button>Top</button>`;
    const frame = document.getElementById("f") as HTMLIFrameElement;
    frame.contentDocument!.body.innerHTML = `<button>Inner</button>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('button "Inner"');
    expect(text).toContain('button "Top"');
  });

  it("skips a cross-origin iframe whose document is unreachable", () => {
    document.body.innerHTML = `<iframe id="f"></iframe><button>Top</button>`;
    const frame = document.getElementById("f") as HTMLIFrameElement;
    // Chrome hands back null for a cross-origin frame rather than throwing.
    Object.defineProperty(frame, "contentDocument", { get: () => null });
    const { text, count } = buildSnapshot(document, new RefMap());
    expect(text).toContain('button "Top"');
    expect(count).toBe(1);
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
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('spinbutton "Qty"');
    expect(text).toContain('slider "Volume"');
    expect(text).toContain('button "Avatar"');
    expect(text).toContain('listbox "Tags"');
    expect(text).toContain('textbox "Body"');
  });

  it("passes through explicit interactive ARIA roles", () => {
    document.body.innerHTML = `
      <div role="tab" aria-label="Details"></div>
      <div role="menuitem" aria-label="Rename"></div>
      <div role="switch" aria-label="Dark mode"></div>
      <div role="option" aria-label="Blue"></div>
    `;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('tab "Details"');
    expect(text).toContain('menuitem "Rename"');
    expect(text).toContain('switch "Dark mode"');
    expect(text).toContain('option "Blue"');
  });

  it("lets an explicit role override the native mapping", () => {
    document.body.innerHTML = `<a href="/x" role="button">Looks like a button</a>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('button "Looks like a button"');
    expect(text).not.toContain("link ");
  });

  it("marks disabled controls", () => {
    document.body.innerHTML = `<button disabled>Save</button><button>Cancel</button>`;
    const { text } = buildSnapshot(document, new RefMap());
    expect(text).toContain('button "Save" [ref=e1] [disabled]');
    expect(text).toContain('button "Cancel" [ref=e2]');
    expect(text).not.toContain('"Cancel" [ref=e2] [disabled]');
  });

  it("ignores non-interactive ARIA roles", () => {
    document.body.innerHTML = `<div role="tablist"><div role="presentation">x</div></div>`;
    const { count } = buildSnapshot(document, new RefMap());
    expect(count).toBe(0);
  });
});

describe("buildSnapshot — large pages", () => {
  it("caps the number of listed elements and says so", () => {
    document.body.innerHTML = Array.from({ length: 900 }, (_, i) => `<button>B${i}</button>`).join("");
    const { text, count } = buildSnapshot(document, new RefMap());
    expect(count).toBe(800);
    expect(text).toContain("truncated");
  });
});

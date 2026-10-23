/**
 * Snapshot fixtures for the pre-S1 capture (Step 8 S1, design D1) and the locate cross-check (D9).
 *
 * Each fixture sets `document.body` up (in jsdom) and returns a teardown. The bodies are copied from
 * `snapshot.test.ts` (which itself stays byte-unchanged), including the layout stubs, the shadow-root
 * and iframe cases, plus `test-fixtures/e2e-playground.html`'s body. Deterministic: no Date, no random.
 * Uses only DOM APIs, so it runs unchanged against any version of `buildSnapshot`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";

export interface SnapshotFixture {
  name: string;
  /** Builds the DOM; returns a teardown that undoes any stub. */
  setup: () => () => void;
}

const rect = (w: number, h: number) =>
  ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON() {} }) as DOMRect;

const noop = () => {};

/** Fake enough layout for the zero-size filter; the teardown drops the fake again. */
function withLayout(stubs: Record<string, [number, number]>): () => void {
  document.documentElement.getBoundingClientRect = () => rect(1024, 768);
  for (const [id, [w, h]] of Object.entries(stubs)) {
    document.getElementById(id)!.getBoundingClientRect = () => rect(w, h);
  }
  return () => {
    delete (document.documentElement as Partial<HTMLElement>).getBoundingClientRect;
  };
}

const html = (name: string, body: string): SnapshotFixture => ({
  name,
  setup: () => {
    document.body.innerHTML = body;
    return noop;
  },
});

function playgroundBody(): string {
  const path = fileURLToPath(new NodeURL("../../test-fixtures/e2e-playground.html", import.meta.url));
  const src = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const start = src.indexOf("<body>");
  const end = src.indexOf("</body>");
  if (start < 0 || end < 0) throw new Error("e2e-playground.html: no <body>");
  return src.slice(start + "<body>".length, end);
}

/** The DOM parts the playground's script builds (copied literally from its `<script>`). */
function playgroundScriptDom(): void {
  const openRoot = document.getElementById("shadow-open")!.attachShadow({ mode: "open" });
  openRoot.innerHTML = '<button id="shadow-btn">Shadow button</button>';
  document.getElementById("shadow-closed")!
    .attachShadow({ mode: "closed" })
    .innerHTML = '<button>Sealed button (must not be listed)</button>';
  const frameDoc = (document.getElementById("inner-frame") as HTMLIFrameElement).contentDocument!;
  frameDoc.body.innerHTML = '<button id="frame-btn">Iframe button</button><p id="frame-status">iframe: idle</p>';
}

export const SHADOW_OPEN: SnapshotFixture = {
  name: "shadow: open root",
  setup: () => {
    document.body.innerHTML = `<div id="host"></div><button>Light</button>`;
    document.getElementById("host")!.attachShadow({ mode: "open" }).innerHTML = `<button>Shadow</button>`;
    return noop;
  },
};

export const IFRAME_SAME_ORIGIN: SnapshotFixture = {
  name: "iframe: same-origin",
  setup: () => {
    document.body.innerHTML = `<iframe id="f"></iframe><button>Top</button>`;
    (document.getElementById("f") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>Inner</button>`;
    return noop;
  },
};

export const IFRAMES_TWO: SnapshotFixture = {
  name: "frames: two same-origin frames",
  setup: () => {
    document.body.innerHTML = `<button>Top</button><iframe id="f1"></iframe><iframe id="f2"></iframe>`;
    (document.getElementById("f1") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>In one</button>`;
    (document.getElementById("f2") as HTMLIFrameElement).contentDocument!.body.innerHTML =
      `<input type="text" aria-label="In two" value="v" /><input type="password" aria-label="Pw" value="secret" />`;
    return noop;
  },
};

export const SHADOW_DEPTH: SnapshotFixture = {
  name: "depth: across an open shadow root",
  setup: () => {
    document.body.innerHTML = `<div role="tab" aria-label="Host" id="host"></div>`;
    document.getElementById("host")!.attachShadow({ mode: "open" }).innerHTML = `<button>In shadow</button>`;
    return noop;
  },
};

export const PLAYGROUND_STATIC: SnapshotFixture = {
  name: "e2e-playground: body (scripts not run)",
  setup: () => {
    document.body.innerHTML = playgroundBody();
    return noop;
  },
};

export const PLAYGROUND_WITH_SCRIPT_DOM: SnapshotFixture = {
  name: "e2e-playground: body + the script's shadow roots and iframe",
  setup: () => {
    document.body.innerHTML = playgroundBody();
    playgroundScriptDom();
    return noop;
  },
};

export const FIXTURES: SnapshotFixture[] = [
  html(
    "basic: interactive elements",
    `
      <input type="text" aria-label="Email" />
      <button>Sign in</button>
      <a href="/forgot">Forgot password?</a>
      <p>not interactive</p>
    `,
  ),
  html("hidden: display:none button", `<button style="display:none">Hidden</button><button>Shown</button>`),
  html("refs: two buttons", `<button>A</button><button>B</button>`),
  html("name: label for", `<label for="email">Email address</label><input id="email" type="text" />`),
  html("name: aria-labelledby", `<span id="lbl">Password</span><input aria-labelledby="lbl" type="password" />`),
  html("name: wrapping label", `<label>Username <input type="text" /></label>`),
  html("name: aria-label wins", `<label for="x">Wrong</label><input id="x" aria-label="Right" type="text" />`),
  html("prune: display:none ancestor", `<div style="display:none"><button>Buried</button></div><button>Shown</button>`),
  html("prune: aria-hidden", `<div aria-hidden="true"><button>Decorative</button></div><button>Real</button>`),
  html("prune: inert", `<div inert><button>Behind modal</button></div><button>Modal action</button>`),
  {
    name: "layout: zero-size skipped (layout on)",
    setup: () => {
      document.body.innerHTML = `<button id="zero">Collapsed</button><button id="sized">Visible</button>`;
      return withLayout({ zero: [0, 0], sized: [80, 24] });
    },
  },
  {
    name: "layout: zero-size kept (layout off)",
    setup: () => {
      document.body.innerHTML = `<button id="z">Zero</button><button id="o">Other</button>`;
      document.getElementById("z")!.getBoundingClientRect = () => rect(0, 0);
      document.getElementById("o")!.getBoundingClientRect = () => rect(60, 20);
      return noop;
    },
  },
  {
    name: "layout: zero-size dropped (layout on, second case)",
    setup: () => {
      document.body.innerHTML = `<button id="z">Zero</button><button id="o">Other</button>`;
      return withLayout({ z: [0, 0], o: [60, 20] });
    },
  },
  {
    name: "layout: zero-size wrapper skipped, child kept",
    setup: () => {
      document.body.innerHTML = `<div role="menuitem" aria-label="Wrapper" id="w"><button id="c">Child</button></div>`;
      return withLayout({ w: [0, 0], c: [40, 20] });
    },
  },
  html("layout: none, one button", `<button>A</button>`),
  SHADOW_OPEN,
  {
    name: "shadow: closed root",
    setup: () => {
      document.body.innerHTML = `<div id="host"></div>`;
      document.getElementById("host")!.attachShadow({ mode: "closed" }).innerHTML = `<button>Sealed</button>`;
      return noop;
    },
  },
  IFRAME_SAME_ORIGIN,
  {
    name: "iframe: cross-origin (contentDocument null)",
    setup: () => {
      document.body.innerHTML = `<iframe id="f"></iframe><button>Top</button>`;
      Object.defineProperty(document.getElementById("f")!, "contentDocument", { get: () => null });
      return noop;
    },
  },
  html(
    "roles: native controls",
    `
      <input type="number" aria-label="Qty" />
      <input type="range" aria-label="Volume" />
      <input type="file" aria-label="Avatar" />
      <select multiple aria-label="Tags"></select>
      <div contenteditable="true" aria-label="Body"></div>
    `,
  ),
  html(
    "roles: explicit ARIA",
    `
      <div role="tab" aria-label="Details"></div>
      <div role="menuitem" aria-label="Rename"></div>
      <div role="switch" aria-label="Dark mode"></div>
      <div role="option" aria-label="Blue"></div>
    `,
  ),
  html("roles: explicit overrides native", `<a href="/x" role="button">Looks like a button</a>`),
  html("roles: disabled", `<button disabled>Save</button><button>Cancel</button>`),
  html("roles: non-interactive ARIA", `<div role="tablist"><div role="presentation">x</div></div>`),
  html("cap: 900 buttons", Array.from({ length: 900 }, (_, i) => `<button>B${i}</button>`).join("")),
  html("cap: 799 buttons", Array.from({ length: 799 }, (_, i) => `<button>B${i}</button>`).join("")),
  html("cap: 800 buttons", Array.from({ length: 800 }, (_, i) => `<button>B${i}</button>`).join("")),
  html(
    "cap: 850 mixed, nested past the cap",
    Array.from({ length: 425 }, (_, i) => `<div role="tab" aria-label="T${i}"><a href="/l${i}">L${i}</a></div>`).join(""),
  ),
  html("shape: plain button", `<button>Plain</button>`),
  {
    name: "fields: value",
    setup: () => {
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
      return noop;
    },
  },
  html(
    "fields: password and no-value roles",
    `
      <input type="password" aria-label="Pw" value="hunter2" />
      <input type="PASSWORD" role="textbox" aria-label="Pw2" value="hunter3" />
      <div contenteditable="true" aria-label="Rich">typed</div>
      <button value="v">Btn</button>
    `,
  ),
  html(
    "fields: checked",
    `
      <input type="checkbox" aria-label="On" checked />
      <input type="checkbox" aria-label="Off" />
      <input type="radio" aria-label="Radio" checked />
      <div role="switch" aria-label="Sw" aria-checked="true"></div>
      <div role="menuitemcheckbox" aria-label="Mic" aria-checked="false"></div>
      <div role="menuitemradio" aria-label="Mir" aria-checked="true"></div>
      <div role="checkbox" aria-label="Mixed" aria-checked="mixed"></div>
      <div role="checkbox" aria-label="Unset"></div>
      <button aria-checked="true">NotCheckable</button>
    `,
  ),
  html(
    "fields: expanded",
    `
      <button aria-expanded="true">Menu</button>
      <button aria-expanded="false">Closed</button>
      <button>NoAria</button>
      <details open><summary>Open details</summary></details>
      <details><summary>Shut details</summary></details>
    `,
  ),
  html(
    "fields: selected (tabs)",
    `
      <div role="tab" aria-label="Tab1" aria-selected="true"></div>
      <div role="tab" aria-label="Tab2" aria-selected="false"></div>
      <div role="tab" aria-label="Tab3"></div>
    `,
  ),
  html(
    "fields: selected (options)",
    `<select multiple aria-label="L"><option role="option" selected>One</option><option role="option">Two</option></select>`,
  ),
  html("fields: href", `<a href="/forgot?x=1">Forgot</a><div role="link" aria-label="Fake"></div><button>B</button>`),
  html(
    "fields: depth",
    `
      <div role="menuitem" aria-label="Outer">
        <div><span>
          <button>Inner</button>
          <div role="option" aria-label="Deep"><a href="/x">Deepest</a></div>
        </span></div>
      </div>
      <button>Sibling</button>
    `,
  ),
  SHADOW_DEPTH,
  IFRAMES_TWO,
  {
    name: "frames: empty frame takes its index",
    setup: () => {
      document.body.innerHTML = `<iframe id="a"></iframe><iframe id="b"></iframe>`;
      (document.getElementById("b") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>In b</button>`;
      return noop;
    },
  },
  {
    name: "frames: listed frame element nests its content",
    setup: () => {
      document.body.innerHTML = `<div role="tab" aria-label="Tabpanel"><iframe id="f"></iframe></div>`;
      (document.getElementById("f") as HTMLIFrameElement).contentDocument!.body.innerHTML = `<button>Framed</button>`;
      return noop;
    },
  },
  html(
    "name: long text capped, whitespace collapsed",
    `<button>${"word ".repeat(40)}</button><a href="/y">  spaced
       out   link </a><span id="l1">One</span><span id="l2">Two</span><button aria-labelledby="l1 l2"></button><input placeholder="Search here" />`,
  ),
  html(
    "prune: visibility hidden, opacity 0, hidden attribute",
    `<div style="visibility:hidden"><button>V</button></div><div style="opacity:0"><button>O</button></div><div hidden><button>H</button></div><button>Kept</button>`,
  ),
  PLAYGROUND_STATIC,
  PLAYGROUND_WITH_SCRIPT_DOM,
];

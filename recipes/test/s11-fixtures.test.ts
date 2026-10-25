// @vitest-environment jsdom
// Dry runs of Run 16's fixture pages (Step 11 S5; docs/e2e-test-plan.md §4.23) without Chrome, written 2026-10-25 by the
// S5 prep builder before any Run 16 row ran:
// - test-fixtures/s11-upload.html through the extension's own content code (`locate`, `uploadInputOf`,
//   `checkUploadInput`), so each locator the rows use reaches the input the row means, by the product's rules;
// - test-fixtures/s11-upload.js run in jsdom: the page's reporter (count, names, sizes, SHA-256, isTrusted) and its
//   MutationObserver on the bridge's upload attribute, read back through state();
// - the page carries no inline script or handler, so the same page works under `script-src 'self'` (UP-8).
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { locate } from "../../extension/src/content/locate.js";
import { RefMap } from "../../extension/src/content/refmap.js";
import { checkUploadInput, DIRECTORY_INPUT_MESSAGE, DISABLED_INPUT_MESSAGE, MANY_FILE_INPUTS_MESSAGE, markUploadTarget, NOT_FILE_INPUT_MESSAGE, SINGLE_FILE_INPUT_MESSAGE, unmarkUpload, uploadInputOf } from "../../extension/src/content/upload-target.js";

type Marks = { events: { op: string; on: string }[]; final: number };
type PageState = {
  inputs: Record<string, { files: number; names: string[]; sizes: number[]; sha256: (string | null)[]; errors: (string | null)[]; changeEvents: number; inputEvents: number; trusted: boolean[] }>;
  pending: number;
  marks: Marks;
  totals: { files: number; changeEvents: number; inputEvents: number };
  patchedCalls: number | null;
  arrivedAfterNav: boolean;
};
const EXPECT11 = {
  notFileInput: NOT_FILE_INPUT_MESSAGE,
  manyFileInputs: MANY_FILE_INPUTS_MESSAGE,
  disabledInput: DISABLED_INPUT_MESSAGE,
  directoryInput: DIRECTORY_INPUT_MESSAGE,
  singleFileInput: SINGLE_FILE_INPUT_MESSAGE,
};

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = (f: string): string => readFileSync(join(REPO, "test-fixtures", f), "utf8");
const MARK = "data-__bridge-upload";

function loadBody(html: string): void {
  const body = /<body>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
}
async function tick(ms = 0): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
function runScript(file: string): void {
  // Strict-mode IIFEs; the globals are the jsdom window's.
  new Function(fixture(file)).call(globalThis);
}
type S11 = { version: string; state: () => PageState; markCount: () => number; reset: () => void };
const s11 = (): S11 => (window as unknown as { __s11: S11 }).__s11;

function fileOf(name: string, bytes: Uint8Array): File {
  return new File([bytes as unknown as BlobPart], name);
}
function setFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, "files", { configurable: true, value: Object.assign(Object.create(null), files, { length: files.length, item: (i: number) => files[i] ?? null }) });
}
async function settle(): Promise<PageState> {
  for (let i = 0; i < 200; i++) {
    const s = s11().state();
    if (s.pending === 0) return s;
    await tick(10);
  }
  throw new Error("the reporter never went idle");
}
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

beforeEach(() => {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  history.replaceState({}, "", "/");
});
afterEach(() => {
  document.body.innerHTML = "";
  delete (window as unknown as Record<string, unknown>).__s11;
  delete (window as unknown as Record<string, unknown>).__s11PatchedCalls;
});

describe("the pages work under script-src 'self' (UP-8)", () => {
  for (const f of ["s11-upload.html", "s11-patched.html"]) {
    it(`${f}: no inline script and no inline event handler`, () => {
      const html = fixture(f);
      const scripts = html.match(/<script\b[^>]*>/g) ?? [];
      expect(scripts.length).toBeGreaterThan(0);
      for (const s of scripts) expect(s, `${f}: ${s}`).toMatch(/\bsrc="[^"]+"/);
      for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) expect(m[1]!.trim(), `${f}: a src script has an empty body`).toBe("");
      expect(html.replace(/<!--[\s\S]*?-->/g, "")).not.toMatch(/\son[a-z]+\s*=/i);
      expect(html).not.toMatch(/javascript:/i);
    });
  }
  it("the reporter script is a file of its own, loaded before the patch", () => {
    expect(fixture("s11-upload.html")).toContain('<script src="s11-upload.js"></script>');
    const p = fixture("s11-patched.html");
    expect(p.indexOf("s11-upload.js")).toBeGreaterThan(0);
    expect(p.indexOf("s11-patched.js")).toBeGreaterThan(p.indexOf("s11-upload.js"));
  });
});

describe("s11-upload.html: the locators of the rows reach the intended inputs", () => {
  beforeEach(() => {
    loadBody(fixture("s11-upload.html"));
    runScript("s11-upload.js");
  });

  it("lists every input by id, including the shadow and the frame one once the script ran", async () => {
    await tick(30);
    const ids = Object.keys(s11().state().inputs).sort();
    expect(ids).toEqual(["up-dir", "up-disabled", "up-drop-input", "up-hidden", "up-multi", "up-shadow-input", "up-single", "up-text", "up-two-a", "up-two-b"].concat(ids.includes("up-frame-input") ? ["up-frame-input"] : []).sort());
    expect(s11().version).toBe("s11-1");
  });

  it("(i) #up-single, #up-multi, #up-disabled, #up-dir are file inputs; #up-text is not", () => {
    for (const [css, id] of [["#up-single", "up-single"], ["#up-multi", "up-multi"], ["#up-disabled", "up-disabled"], ["#up-dir", "up-dir"]] as const) {
      const refs = new RefMap();
      const el = refs.get(locate(document, refs, { css }).ref)!;
      expect(uploadInputOf(el).id).toBe(id);
    }
    const refs = new RefMap();
    const text = refs.get(locate(document, refs, { css: "#up-text" }).ref)!;
    expect(() => uploadInputOf(text)).toThrow(EXPECT11.notFileInput);
  });

  it("UP-3: {text: 'Attach a file'} finds the label, whose control is the display:none input", () => {
    const refs = new RefMap();
    const r = locate(document, refs, { text: "Attach a file" });
    const el = refs.get(r.ref)!;
    expect(el.localName).toBe("label");
    expect(uploadInputOf(el).id).toBe("up-hidden");
    expect((document.getElementById("up-hidden") as HTMLElement).getAttribute("style")).toContain("display: none");
    // the text is unique in the body, so the locator cannot be ambiguous
    expect((document.body.textContent ?? "").split("Attach a file").length - 1).toBe(1);
  });

  it("UP-3: #up-drop is a wrapper with exactly one file input", () => {
    const refs = new RefMap();
    const el = refs.get(locate(document, refs, { css: "#up-drop" }).ref)!;
    expect(uploadInputOf(el).id).toBe("up-drop-input");
  });

  it("UP-4: #up-shadow-host reaches the input inside its open shadow root", () => {
    const refs = new RefMap();
    const el = refs.get(locate(document, refs, { css: "#up-shadow-host" }).ref)!;
    expect(el.shadowRoot).not.toBeNull();
    expect(uploadInputOf(el).id).toBe("up-shadow-input");
  });

  it("UP-4: #up-frame-wrap reaches the input inside the same-origin frame (src=s11-frame.html)", async () => {
    const frame = document.getElementById("up-frame") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe("s11-frame.html");
    // jsdom does not fetch the frame's src: put the frame file's own body in its document, so the target rule runs over
    // the markup the page ships. Chrome loads it itself (UP-4).
    const doc = frame.contentDocument!;
    doc.open();
    doc.write("<!doctype html><html><head></head><body>" + /<body>([\s\S]*)<\/body>/.exec(fixture("s11-frame.html"))![1]! + "</body></html>");
    doc.close();
    expect(doc.getElementById("up-frame-input")).not.toBeNull();
    expect(fixture("s11-frame.html").replace(/<!--[\s\S]*?-->/g, "")).not.toMatch(/<script/i);
    const refs = new RefMap();
    const el = refs.get(locate(document, refs, { css: "#up-frame-wrap" }).ref)!;
    expect(uploadInputOf(el).id).toBe("up-frame-input");
    // the page's reporter wires the frame once it loads (wireFrame): the input gets a record and a mark in the frame is seen
    frame.dispatchEvent(new Event("load"));
    expect(Object.keys(s11().state().inputs)).toContain("up-frame-input");
    s11().reset();
    const fin = doc.getElementById("up-frame-input")!;
    fin.setAttribute(MARK, "mf");
    await tick();
    expect(s11().markCount()).toBe(1);
    fin.removeAttribute(MARK);
    await tick();
    expect(s11().state().marks.events.map((e) => `${e.op}:${e.on}`)).toEqual(["added:up-frame-input", "removed:up-frame-input"]);
    expect(s11().state().marks.final).toBe(0);
  });

  it("UP-6B: the text input has its own change/input record", async () => {
    const t = document.getElementById("up-text") as HTMLInputElement;
    expect(s11().state().inputs["up-text"]).toMatchObject({ files: 0, changeEvents: 0, inputEvents: 0 });
    t.dispatchEvent(new Event("input", { bubbles: true }));
    t.dispatchEvent(new Event("change", { bubbles: true }));
    const s = await settle();
    expect(s.inputs["up-text"]).toMatchObject({ files: 0, names: [], changeEvents: 1, inputEvents: 1 });
  });

  it("the refusals before the attach: disabled, folder input, two paths for a single input", () => {
    const get = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;
    expect(() => checkUploadInput(get("up-disabled"), 1)).toThrow(EXPECT11.disabledInput);
    expect(() => checkUploadInput(get("up-dir"), 1)).toThrow(EXPECT11.directoryInput);
    expect(() => checkUploadInput(get("up-single"), 2)).toThrow(EXPECT11.singleFileInput);
    expect(() => checkUploadInput(get("up-multi"), 2)).not.toThrow();
    expect(() => checkUploadInput(get("up-single"), 1)).not.toThrow();
  });

  it("UP-6B: #up-two holds two file inputs, so the target rule refuses it", () => {
    const refs = new RefMap();
    const el = refs.get(locate(document, refs, { css: "#up-two" }).ref)!;
    expect(() => uploadInputOf(el)).toThrow(EXPECT11.manyFileInputs);
  });

  it("no other wrapper of the fixture holds two file inputs", () => {
    for (const css of ["#up-drop", "#up-shadow-host", "#up-frame-wrap"]) {
      const inputs = document.querySelectorAll(`${css} input[type=file]`).length;
      expect(inputs, css).toBeLessThanOrEqual(1);
    }
  });
});

describe("s11-upload.js: the page's own reporter", () => {
  beforeEach(() => {
    loadBody(fixture("s11-upload.html"));
    runScript("s11-upload.js");
  });

  it("hashes a known file to its published SHA-256 (the digest of the ASCII text abc, FIPS 180-2 test vector)", async () => {
    const input = document.getElementById("up-single") as HTMLInputElement;
    setFiles(input, [fileOf("abc.txt", new TextEncoder().encode("abc"))]);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const s = await settle();
    expect(s.inputs["up-single"]!.sha256).toEqual(["ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"]);
    expect(s.inputs["up-single"]!.errors).toEqual([null]);
  });

  it("a change with files: names, sizes and SHA-256 are the files' (jsdom events are untrusted, so isTrusted is false here; Chrome gives true)", async () => {
    const a = new Uint8Array(1024).fill(7);
    const b = new Uint8Array(0);
    const input = document.getElementById("up-multi") as HTMLInputElement;
    setFiles(input, [fileOf("a.bin", a), fileOf("b.bin", b)]);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const s = await settle();
    const want = [
      { name: "a.bin", bytes: 1024, sha256: sha(a) },
      { name: "b.bin", bytes: 0, sha256: sha(b) },
    ];
    const m = s.inputs["up-multi"]!;
    expect(m.names).toEqual(["a.bin", "b.bin"]);
    expect(m.sizes).toEqual([1024, 0]);
    expect(m.sha256).toEqual(want.map((w) => w.sha256));
    expect(m.sha256[1]).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"); // the empty text's, written out
    expect(s.inputs["up-multi"]!.trusted).toEqual([false]);
    expect(s.totals).toMatchObject({ files: 2, changeEvents: 1 });
    expect(m.sha256[0]).not.toBe("0".repeat(64));
  });

  it("a second change replaces the first (UP-TWICE): the late read of the first never overwrites the second", async () => {
    const first = new Uint8Array(4096).fill(1);
    const second = new Uint8Array(2048).fill(2);
    const bytesOf = new Map<unknown, Uint8Array>();
    let reads = 0;
    const RealReader = globalThis.FileReader;
    // A reader whose first read finishes after the second one: the late finish is what the page's gen guard must drop.
    class SlowFirstReader {
      result: ArrayBuffer | null = null;
      error: null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsArrayBuffer(f: File): void {
        const delay = reads++ === 0 ? 80 : 0;
        const b = bytesOf.get(f)!;
        setTimeout(() => {
          this.result = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
          this.onload?.();
        }, delay);
      }
    }
    Object.defineProperty(globalThis, "FileReader", { configurable: true, writable: true, value: SlowFirstReader });
    try {
      const input = document.getElementById("up-single") as HTMLInputElement;
      const f1 = fileOf("one.bin", first);
      const f2 = fileOf("two.bin", second);
      bytesOf.set(f1, first);
      bytesOf.set(f2, second);
      setFiles(input, [f1]);
      input.dispatchEvent(new Event("change", { bubbles: true }));
      setFiles(input, [f2]);
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const s = await settle(); // pending only reaches 0 after the late first read finished too
      expect(reads).toBe(2);
      expect(s.inputs["up-single"]!.changeEvents).toBe(2);
      expect(s.inputs["up-single"]).toMatchObject({ names: ["two.bin"], sizes: [2048], sha256: [sha(second)] });
    } finally {
      Object.defineProperty(globalThis, "FileReader", { configurable: true, writable: true, value: RealReader });
    }
  });

  it("a file the page cannot read is reported as a read error, not a hash (UP-RAW)", async () => {
    const input = document.getElementById("up-single") as HTMLInputElement;
    const broken = { name: "gone.bin", size: 5, type: "" } as unknown as File; // not a Blob: readAsArrayBuffer throws
    setFiles(input, [broken]);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const s = await settle();
    expect(s.inputs["up-single"]!.sha256).toEqual([null]);
    expect(s.inputs["up-single"]!.errors[0]).toBeTruthy();
  });

  it("an untouched page is untouched; reset() clears events and files", async () => {
    const u = s11().state();
    expect(u.totals).toEqual({ files: 0, changeEvents: 0, inputEvents: 0 });
    expect(u.marks).toEqual({ events: [], final: 0 });
    const input = document.getElementById("up-single") as HTMLInputElement;
    setFiles(input, [fileOf("x.bin", new Uint8Array(3))]);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    s11().reset();
    const s = s11().state();
    expect(s.inputs["up-single"]!.changeEvents).toBe(0);
    expect(s.inputs["up-single"]!.names).toEqual([]);
    expect(s.marks.events).toEqual([]);
  });

  it("the MutationObserver records the bridge's mark added then removed on the light DOM, the shadow root; the deep count sees both", async () => {
    const single = document.getElementById("up-single") as HTMLInputElement;
    single.setAttribute(MARK, "m1");
    await tick();
    expect(s11().markCount()).toBe(1);
    single.removeAttribute(MARK);
    await tick();
    const shadowInput = document.getElementById("up-shadow-host")!.shadowRoot!.getElementById("up-shadow-input")!;
    shadowInput.setAttribute(MARK, "m2");
    await tick();
    expect(s11().markCount()).toBe(1);
    expect(s11().state().marks.final).toBe(1); // the shadow mark is still there
    shadowInput.removeAttribute(MARK);
    await tick();
    const marks = s11().state().marks;
    expect(marks.events.map((e) => `${e.op}:${e.on}`)).toEqual(["added:up-single", "removed:up-single", "added:up-shadow-input", "removed:up-shadow-input"]);
    expect(marks.final).toBe(0);
  });

  it("the content script's own mark and sweep produce exactly an added then a removed (the shipped functions)", async () => {
    const refs = new RefMap();
    const ref = locate(document, refs, { css: "#up-single" }).ref;
    s11().reset();
    markUploadTarget(document, refs, ref, 1, "mark-1");
    await tick();
    expect(s11().markCount()).toBe(1);
    expect(unmarkUpload(document, "mark-1")).toEqual({ removed: 1 });
    await tick();
    expect(s11().state().marks.events.map((e) => e.op)).toEqual(["added", "removed"]);
    expect(s11().state().marks.final).toBe(0);
  });

  it("a refusal that never marks leaves 'never-set' true", async () => {
    const refs = new RefMap();
    const ref = locate(document, refs, { css: "#up-disabled" }).ref;
    expect(() => markUploadTarget(document, refs, ref, 1, "mark-2")).toThrow(EXPECT11.disabledInput);
    await tick();
    expect(s11().state().marks).toEqual({ events: [], final: 0 });
  });

  it("arrivedAfterNav is true only on the page the nav row lands on", () => {
    expect(s11().state().arrivedAfterNav).toBe(false);
    delete (window as unknown as Record<string, unknown>).__s11;
    history.replaceState({}, "", "/s11-upload.html?s11=nav-after");
    runScript("s11-upload.js");
    expect(s11().state().arrivedAfterNav).toBe(true);
  });

  it("the nav trigger is wired to ?nav=1 and leaves for ?s11=nav-after", () => {
    const src = fixture("s11-upload.js");
    expect(src).toContain("nav=1");
    expect(src).toContain("location.replace(location.pathname + \"?s11=nav-after\")");
  });
});

describe("s11-patched.html: a patched getAttribute is counted and the reporter never calls it", () => {
  it("the reporter and the mark observer leave patchedCalls at 0; the test's own call counts", async () => {
    loadBody(fixture("s11-patched.html"));
    runScript("s11-upload.js");
    const original = Element.prototype.getAttribute;
    try {
      runScript("s11-patched.js");
      const single = document.getElementById("up-single") as HTMLInputElement;
      expect(s11().state().patchedCalls).toBe(0);
      single.setAttribute(MARK, "m");
      await tick();
      single.removeAttribute(MARK);
      await tick();
      setFiles(single, [fileOf("p.bin", new Uint8Array(2))]);
      single.dispatchEvent(new Event("change", { bubbles: true }));
      const s = await settle();
      expect(s.patchedCalls).toBe(0);
      expect(s.marks.events.map((e) => e.op)).toEqual(["added", "removed"]);
      expect(single.getAttribute("id")).toBeNull(); // patched: answers null
      expect(s11().state().patchedCalls).toBe(1);
    } finally {
      Element.prototype.getAttribute = original;
    }
  });

  it("on the plain page patchedCalls is null", () => {
    loadBody(fixture("s11-upload.html"));
    runScript("s11-upload.js");
    expect(s11().state().patchedCalls).toBeNull();
  });
});

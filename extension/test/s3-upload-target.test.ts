// @vitest-environment jsdom
/**
 * Step 11 S3 — S3.1 and S3.2 (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.7 with its Stage 0 note;
 * decisions.md #239, #247, #248): the content script's target rule (i)–(iii) and its refusals, with the shipped code
 * (`content/upload-target.ts`, through the guarded `window.__agentBridge` the content script installs); the one-off
 * mark set once and removed on every path; the shipped isolated-world finder string (`UPLOAD_FINDER_SRC`) run as the
 * session runs it. Fixture-like markup and reserved values only.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import "../src/content/index.js";
import {
  DIRECTORY_INPUT_MESSAGE,
  DISABLED_INPUT_MESSAGE,
  MANY_FILE_INPUTS_MESSAGE,
  NOT_FILE_INPUT_MESSAGE,
  SINGLE_FILE_INPUT_MESSAGE,
  UPLOAD_MARK_ATTR,
  checkUploadInput,
  uploadInputOf,
} from "../src/content/upload-target.js";
import { MARK_ATTR } from "../src/content/marked.js";
import { UPLOAD_FINDER_SRC, uploadFinderExpression } from "../src/upload-files.js";
import { inject } from "./s3-upload-helpers.js";

const bridge = () => window.__agentBridge!;
const refOf = (el: Element) => bridge().refs.add(el);
const marks = () => document.querySelectorAll(`[${UPLOAD_MARK_ATTR}]`).length;

function fail(fn: () => unknown): { code: string; message: string } {
  try {
    fn();
  } catch (e) {
    return { code: (e as { code?: string }).code ?? "(none)", message: (e as Error).message };
  }
  throw new Error("expected a throw");
}

beforeAll(() => expect(bridge()).toBeDefined());
beforeEach(() => {
  document.body.innerHTML = "";
});

describe("S3.1 — the target rule (i)–(iii), in the shipped content code", () => {
  it("the mark's attribute is its own, never Step 8's asRef mark", () => {
    expect(UPLOAD_MARK_ATTR).toBe("data-__bridge-upload");
    expect(UPLOAD_MARK_ATTR).not.toBe(MARK_ATTR);
    expect(UPLOAD_FINDER_SRC).toContain('"data-__bridge-upload"');
    expect(UPLOAD_FINDER_SRC).not.toContain(MARK_ATTR);
  });

  it("(i) an <input type=file>, whatever the case of its type", () => {
    document.body.innerHTML = `<input id="f" type="FILE">`;
    expect(uploadInputOf(document.getElementById("f")!)).toBe(document.getElementById("f"));
  });

  it("(ii) a <label> whose control is a file input (for= or wrapping); a hidden input is reached", () => {
    document.body.innerHTML = `<label id="l1" for="f1">Pick</label><input id="f1" type="file" style="display:none">
      <label id="l2">Drop <input id="f2" type="file" hidden></label>`;
    expect(uploadInputOf(document.getElementById("l1")!)).toBe(document.getElementById("f1"));
    expect(uploadInputOf(document.getElementById("l2")!)).toBe(document.getElementById("f2"));
  });

  it("(iii) exactly one file-input descendant, in the light DOM, an open shadow root or a same-origin frame", () => {
    document.body.innerHTML = `<div id="z"><span>Drop here</span><input id="f" type="file"></div><div id="h"></div><div id="fr"></div>`;
    expect(uploadInputOf(document.getElementById("z")!)).toBe(document.getElementById("f"));
    const host = document.getElementById("h")!;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<input type="file">`;
    expect(uploadInputOf(host)).toBe(root.querySelector("input"));
    const iframe = document.createElement("iframe");
    document.getElementById("fr")!.appendChild(iframe);
    iframe.contentDocument!.body.innerHTML = `<input type="file">`;
    expect(uploadInputOf(document.getElementById("fr")!)).toBe(iframe.contentDocument!.querySelector("input"));
  });

  it("a closed shadow root is not searched", () => {
    document.body.innerHTML = `<div id="h"></div>`;
    const host = document.getElementById("h")!;
    host.attachShadow({ mode: "closed" }).innerHTML = `<input type="file">`;
    expect(fail(() => uploadInputOf(host))).toEqual({ code: "BAD_PARAMS", message: NOT_FILE_INPUT_MESSAGE });
  });

  it("anything else → BAD_PARAMS: a text input, a button, a label for a text input, two file inputs", () => {
    document.body.innerHTML = `<input id="t" type="text"><button id="b">Upload</button><label id="l" for="t">T</label>
      <div id="two"><input type="file"><input type="file"></div>`;
    for (const id of ["t", "b", "l"]) {
      expect(fail(() => uploadInputOf(document.getElementById(id)!)), id).toEqual({ code: "BAD_PARAMS", message: NOT_FILE_INPUT_MESSAGE });
    }
    expect(fail(() => uploadInputOf(document.getElementById("two")!))).toEqual({ code: "BAD_PARAMS", message: MANY_FILE_INPUTS_MESSAGE });
  });

  it("the refusals of 0.7 and #247: disabled, webkitdirectory, more than one path without multiple", () => {
    document.body.innerHTML = `<input id="d" type="file" disabled><input id="w" type="file" webkitdirectory>
      <input id="s" type="file"><input id="m" type="file" multiple>`;
    const el = (id: string) => document.getElementById(id) as HTMLInputElement;
    expect(fail(() => checkUploadInput(el("d"), 1))).toEqual({ code: "BAD_PARAMS", message: DISABLED_INPUT_MESSAGE });
    expect(fail(() => checkUploadInput(el("w"), 1))).toEqual({ code: "BAD_PARAMS", message: DIRECTORY_INPUT_MESSAGE });
    expect(fail(() => checkUploadInput(el("s"), 2))).toEqual({ code: "BAD_PARAMS", message: SINGLE_FILE_INPUT_MESSAGE });
    expect(() => checkUploadInput(el("s"), 1)).not.toThrow();
    expect(() => checkUploadInput(el("m"), 20)).not.toThrow();
  });

  it("the guarded content method answers each refusal as a CODE:message marker and marks nothing", () => {
    document.body.innerHTML = `<input id="w" type="file" webkitdirectory><button id="b">x</button><input id="s" type="file">`;
    expect(bridge().markUpload(refOf(document.getElementById("w")!), 1, "m-1")).toEqual({ __bridgeError: `BAD_PARAMS:${DIRECTORY_INPUT_MESSAGE}` });
    expect(bridge().markUpload(refOf(document.getElementById("b")!), 1, "m-1")).toEqual({ __bridgeError: `BAD_PARAMS:${NOT_FILE_INPUT_MESSAGE}` });
    expect(bridge().markUpload(refOf(document.getElementById("s")!), 2, "m-1")).toEqual({ __bridgeError: `BAD_PARAMS:${SINGLE_FILE_INPUT_MESSAGE}` });
    expect(bridge().markUpload("e99999", 1, "m-1")).toEqual({ __bridgeError: "REF_STALE:ref e99999 not found — call browser_snapshot to re-snapshot" });
    expect(marks()).toBe(0);
  });
});

describe("S3.2 — the mark is set once, found and removed by the shipped finder; swept on failure", () => {
  it("markUpload sets the call's mark on the chosen input only, after sweeping stray marks of earlier calls", () => {
    document.body.innerHTML = `<label id="l" for="f">Pick</label><input id="f" type="file" hidden><input id="o" type="file" ${UPLOAD_MARK_ATTR}="stale">`;
    expect(bridge().markUpload(refOf(document.getElementById("l")!), 1, "m-2")).toEqual({ ok: true });
    expect(document.getElementById("f")!.getAttribute(UPLOAD_MARK_ATTR)).toBe("m-2");
    expect(document.getElementById("o")!.hasAttribute(UPLOAD_MARK_ATTR)).toBe(false);
    expect(marks()).toBe(1);
  });

  it("the finder returns the marked input and removes the mark in the same evaluation (success)", () => {
    document.body.innerHTML = `<input id="f" type="file" multiple>`;
    bridge().markUpload(refOf(document.getElementById("f")!), 2, "m-3");
    expect(inject(uploadFinderExpression("m-3", 2))).toBe(document.getElementById("f"));
    expect(marks()).toBe(0);
  });

  it("finds it in an open shadow root and a same-origin frame", () => {
    document.body.innerHTML = `<div id="h"></div><div id="fr"></div>`;
    const root = document.getElementById("h")!.attachShadow({ mode: "open" });
    root.innerHTML = `<input type="file">`;
    bridge().markUpload(refOf(document.getElementById("h")!), 1, "m-4");
    expect(inject(uploadFinderExpression("m-4", 1))).toBe(root.querySelector("input"));
    expect(root.querySelector(`[${UPLOAD_MARK_ATTR}]`)).toBeNull();
    const iframe = document.createElement("iframe");
    document.getElementById("fr")!.appendChild(iframe);
    iframe.contentDocument!.body.innerHTML = `<input type="file">`;
    bridge().markUpload(refOf(document.getElementById("fr")!), 1, "m-5");
    expect(inject(uploadFinderExpression("m-5", 1))).toBe(iframe.contentDocument!.querySelector("input"));
    expect(iframe.contentDocument!.querySelector(`[${UPLOAD_MARK_ATTR}]`)).toBeNull();
  });

  it("zero carriers → 'none' (REF_STALE in the session); two → 'many' (INTERNAL), both marks removed", () => {
    document.body.innerHTML = `<input id="a" type="file"><input id="b" type="file">`;
    expect(inject(uploadFinderExpression("m-6", 1))).toBe("none");
    document.getElementById("a")!.setAttribute(UPLOAD_MARK_ATTR, "m-7");
    document.getElementById("b")!.setAttribute(UPLOAD_MARK_ATTR, "m-7");
    expect(inject(uploadFinderExpression("m-7", 1))).toBe("many");
    expect(marks()).toBe(0);
  });

  it("an input the page changed after the mark is refused by the finder, and its mark removed", () => {
    const rows: [string, (el: HTMLInputElement) => void, number, string][] = [
      ["type", (el) => (el.type = "text"), 1, "not-file-input"],
      ["webkitdirectory", (el) => el.setAttribute("webkitdirectory", ""), 1, "directory"],
      ["disabled", (el) => (el.disabled = true), 1, "disabled"],
      ["multiple", (el) => (el.multiple = false), 2, "single"],
    ];
    for (const [name, change, count, status] of rows) {
      document.body.innerHTML = `<input id="f" type="file" multiple>`;
      const el = document.getElementById("f") as HTMLInputElement;
      bridge().markUpload(refOf(el), count, "m-8");
      change(el);
      expect(inject(uploadFinderExpression("m-8", count)), name).toBe(status);
      expect(marks(), name).toBe(0);
    }
  });

  it("another call's mark is not the finder's: it is neither returned nor removed", () => {
    document.body.innerHTML = `<input id="f" type="file" ${UPLOAD_MARK_ATTR}="other">`;
    expect(inject(uploadFinderExpression("m-9", 1))).toBe("none");
    expect(marks()).toBe(1);
  });

  it("unmarkUpload (the failure-path sweep) removes this call's mark everywhere, and only it", () => {
    document.body.innerHTML = `<input id="f" type="file"><div id="h"></div><input id="o" type="file" ${UPLOAD_MARK_ATTR}="other">`;
    bridge().markUpload(refOf(document.getElementById("f")!), 1, "m-10");
    document.getElementById("o")!.setAttribute(UPLOAD_MARK_ATTR, "other"); // a concurrent call's, set after
    const root = document.getElementById("h")!.attachShadow({ mode: "open" });
    root.innerHTML = `<input type="file" ${UPLOAD_MARK_ATTR}="m-10">`;
    expect(bridge().unmarkUpload("m-10")).toEqual({ removed: 2 });
    expect(document.getElementById("f")!.hasAttribute(UPLOAD_MARK_ATTR)).toBe(false);
    expect(document.getElementById("o")!.getAttribute(UPLOAD_MARK_ATTR)).toBe("other");
    expect(bridge().unmarkUpload("")).toEqual({ removed: 0 });
  });

  it("a page whose getAttribute is poisoned on one element does not stop the finder", () => {
    document.body.innerHTML = `<div id="p"></div><input id="f" type="file">`;
    (document.getElementById("p") as unknown as { getAttribute: () => never }).getAttribute = () => {
      throw new Error("poisoned");
    };
    document.getElementById("f")!.setAttribute(UPLOAD_MARK_ATTR, "m-11");
    expect(inject(uploadFinderExpression("m-11", 1))).toBe(document.getElementById("f"));
  });
});

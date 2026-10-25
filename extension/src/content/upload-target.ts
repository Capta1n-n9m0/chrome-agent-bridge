/**
 * Step 11 S3 — the content-script half of `uploadFiles` (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.7
 * with its Stage 0 note; decisions.md · 2026-10-25 · Step 11: which element receives the files (#239); · Stage 0: a
 * `webkitdirectory` input is refused (#247); · Stage 0: the finder runs in an isolated world (#248)).
 *
 * - The **target rule** (`uploadInputOf`), after the ref or locator resolved: (i) an `<input type=file>`; (ii) a
 *   `<label>` whose `control` is one; (iii) an element with exactly one `<input type=file>` descendant, open shadow
 *   roots and same-origin frames included. Anything else → `BAD_PARAMS`. Not a locator rule: `a11y.ts`, `locate`
 *   and the snapshot are unchanged, so a hidden input behind a visible label is reached through the label.
 * - The **refusals before the attach** (`BAD_PARAMS`): a disabled input, a folder input (`webkitdirectory`), more
 *   than one path for an input without `multiple`.
 * - The **one-off mark** (`markUploadTarget`): `UPLOAD_MARK_ATTR` set to the call's fresh value on the chosen input,
 *   after every stray upload mark (any value, an earlier call's) is swept from the document; the service worker's
 *   CDP finder (`upload-cdp.ts`, in an isolated world) finds it and removes it. `unmarkUpload` is the
 *   best-effort sweep of this call's mark on every failure path.
 *
 * Never a path, a file name or the mark value in a message or a log. Self-contained at runtime (IIFE).
 */
import type { RefMap } from "./refmap.js";
import { codedError } from "./guard.js";

/** The upload mark's attribute. Never `MARK_ATTR`'s name (`data-__bridge-mark`, Step 8's `asRef`). */
export const UPLOAD_MARK_ATTR = "data-__bridge-upload";

export const NOT_FILE_INPUT_MESSAGE =
  "not a file input: target an <input type=file>, a <label> for one, or an element with exactly one file input inside";
export const MANY_FILE_INPUTS_MESSAGE = "the target holds more than one file input; target one of them";
export const DISABLED_INPUT_MESSAGE = "the file input is disabled";
export const DIRECTORY_INPUT_MESSAGE =
  "the file input takes a folder (webkitdirectory); the bridge uploads files only";
export const SINGLE_FILE_INPUT_MESSAGE = "the file input takes one file, and more than one path was given";

function isFileInput(el: Element | null | undefined): el is HTMLInputElement {
  // By tag and type, never `instanceof`: an element of a same-origin frame belongs to another realm.
  return !!el && el.localName === "input" && String((el as HTMLInputElement).type).toLowerCase() === "file";
}

function frameDoc(el: Element): Document | null {
  if (el.localName !== "iframe" && el.localName !== "frame") return null;
  try {
    return (el as HTMLIFrameElement).contentDocument;
  } catch {
    return null; // cross-origin
  }
}

/**
 * Every element under `root` (not `root` itself): its open shadow root's and its same-origin frame's elements, then
 * its children and theirs, recursively.
 */
function forEachDescendant(root: Element | Document | ShadowRoot, fn: (el: Element) => void): void {
  if (root.nodeType === 1) {
    const shadow = (root as HTMLElement).shadowRoot;
    if (shadow) forEachDescendant(shadow, fn);
    const doc = frameDoc(root as Element);
    if (doc) forEachDescendant(doc, fn);
  }
  for (const el of Array.from(root.children)) {
    fn(el);
    forEachDescendant(el, fn);
  }
}

/** The target rule (i)–(iii): the file input that receives the files, or a `BAD_PARAMS` throw. */
export function uploadInputOf(el: Element): HTMLInputElement {
  if (isFileInput(el)) return el;
  if (el.localName === "label") {
    const control = (el as HTMLLabelElement).control;
    if (isFileInput(control)) return control;
  }
  const found: HTMLInputElement[] = [];
  forEachDescendant(el, (d) => {
    if (isFileInput(d)) found.push(d);
  });
  if (found.length === 1) return found[0]!;
  if (found.length > 1) throw codedError("BAD_PARAMS", MANY_FILE_INPUTS_MESSAGE);
  throw codedError("BAD_PARAMS", NOT_FILE_INPUT_MESSAGE);
}

/** The refusals of 0.7 and #247 on the chosen input, for `count` paths. */
export function checkUploadInput(input: HTMLInputElement, count: number): void {
  if (input.disabled) throw codedError("BAD_PARAMS", DISABLED_INPUT_MESSAGE);
  if (input.hasAttribute("webkitdirectory") || (input as { webkitdirectory?: boolean }).webkitdirectory === true) {
    throw codedError("BAD_PARAMS", DIRECTORY_INPUT_MESSAGE);
  }
  if (count > 1 && !input.multiple) throw codedError("BAD_PARAMS", SINGLE_FILE_INPUT_MESSAGE);
}

/** Removes `UPLOAD_MARK_ATTR` (where `pick(value)` holds) from every carrier in `doc`; returns how many. */
function sweep(doc: Document, pick: (value: string) => boolean): number {
  let n = 0;
  const visit = (el: Element) => {
    const v = el.getAttribute(UPLOAD_MARK_ATTR);
    if (v !== null && pick(v)) {
      el.removeAttribute(UPLOAD_MARK_ATTR);
      n++;
    }
  };
  if (doc.documentElement) {
    visit(doc.documentElement);
    forEachDescendant(doc.documentElement, visit);
  }
  return n;
}

/**
 * Resolves `ref`, applies the target rule and the refusals, sweeps every stray upload mark, then marks the chosen
 * input with `mark`. Returns `{ok: true}` (never null: `unwrapResult` reads null as failure).
 */
export function markUploadTarget(doc: Document, refs: RefMap, ref: string, count: number, mark: string): { ok: true } {
  if (typeof mark !== "string" || mark === "") throw codedError("BAD_PARAMS", "mark must be a non-empty string");
  if (!Number.isSafeInteger(count) || count < 1) throw codedError("BAD_PARAMS", "paths must hold at least one path");
  const el = refs.get(ref);
  if (!el) throw codedError("REF_STALE", `ref ${ref} not found — call browser_snapshot to re-snapshot`);
  const input = uploadInputOf(el);
  checkUploadInput(input, count);
  sweep(doc, () => true); // a stray mark of an earlier call (a worker that died mid-call) goes first
  input.setAttribute(UPLOAD_MARK_ATTR, mark);
  return { ok: true };
}

/** The failure-path sweep: removes this call's mark wherever it is; returns how many carried it. */
export function unmarkUpload(doc: Document, mark: string): { removed: number } {
  if (typeof mark !== "string" || mark === "") return { removed: 0 };
  return { removed: sweep(doc, (v) => v === mark) };
}

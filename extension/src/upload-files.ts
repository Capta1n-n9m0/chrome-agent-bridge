/**
 * Step 11 S3 — the pure half of `uploadFiles`'s service-worker leg (phase doc
 * `docs/plans/2026-10-25-step11-file-upload.md` 0.5–0.7 with their Stage 0 notes; decisions.md · 2026-10-25 ·
 * Stage 0: uploads need Chrome's file access (#245) part (b); · Stage 0: the finder runs in an isolated world (#248);
 * · Stage 0: S1 marks the bridge's own refusals explicitly (#246)). Pure: no `chrome.*`, no log call.
 *
 * - `fileAccessRefusal`: the decision on `chrome.extension.isAllowedFileSchemeAccess()`, read before anything
 *   touches the page or attaches. Anything but `true` → `UPLOAD_REFUSED` with `NO_FILE_ACCESS_MESSAGE`.
 * - `UPLOAD_FINDER_SRC`: the closure-free finder, shipped as `String(fn)` (the jsdom tests run exactly it). It runs
 *   in an **isolated world** the session creates (`Page.createIsolatedWorld`), never the page's main world (#248),
 *   so a page-patched prototype is not called. It finds the element carrying this call's upload mark (document,
 *   open shadow roots, same-origin frames — what the content script can mark), removes the mark from every carrier
 *   in the same evaluation, re-checks the input, and returns it (CDP hands back its `objectId`) or a status string.
 * - `setFilesByMark`: the CDP steps in one session — `Page.getFrameTree` → `Page.createIsolatedWorld` →
 *   `Runtime.evaluate` (the finder) → `DOM.setFileInputFiles {files, objectId}` → `Runtime.releaseObject` (in a
 *   `finally`). `UPLOAD_STEP_METHODS` lists them, as `trusted-input.ts` lists trusted input's steps.
 *   The finder's refusals (`REF_STALE` none found, `INTERNAL` several, `BAD_PARAMS` the input changed) are raised
 *   inside the session and marked with `markOwnRefusal`, so `describeDebuggerError` passes them through unprefixed;
 *   a breakdown (no frame id, no context id, the finder threw, an unknown reply) is not marked and keeps the prefix,
 *   as the save leg's `INTERNAL` failures do (#254).
 *
 * Nothing here names a path, a file name or the mark in a message.
 */
import { BridgeError, ErrorCodes } from "./errors.js";
import { markOwnRefusal } from "./debugger-errors.js";
import {
  DIRECTORY_INPUT_MESSAGE,
  DISABLED_INPUT_MESSAGE,
  NOT_FILE_INPUT_MESSAGE,
  SINGLE_FILE_INPUT_MESSAGE,
} from "./content/upload-target.js";

/** #245 (b): the refusal when this extension may not read local files. Fixed; names no path. */
export const NO_FILE_ACCESS_MESSAGE =
  "Chrome does not allow this extension to read local files (chrome://extensions → Chrome Agent Bridge → Details → Allow access to file URLs), so the bridge cannot upload. Ask the user.";

/** #245 (b): `allowed` is what `chrome.extension.isAllowedFileSchemeAccess()` resolved to; anything else refuses. */
export function fileAccessRefusal(allowed: unknown): BridgeError | null {
  return allowed === true ? null : new BridgeError(ErrorCodes.UPLOAD_REFUSED, NO_FILE_ACCESS_MESSAGE);
}

/** The finder found no carrier of the mark. */
export const UPLOAD_MARK_GONE_MESSAGE =
  "the file input is no longer in the page (its upload mark was not found); nothing was uploaded";
/** The finder found several carriers. */
export const UPLOAD_MARK_NOT_UNIQUE_MESSAGE = "the upload mark is not unique; nothing was uploaded";

/** The isolated world's name (`Page.createIsolatedWorld`). */
export const UPLOAD_WORLD_NAME = "__bridge_upload";

/** How long the CDP leg may take, from the attach's start to the release. */
export const UPLOAD_CDP_TIMEOUT_MS = 15_000;

export function uploadTimeoutMessage(ms = UPLOAD_CDP_TIMEOUT_MS): string {
  return `File upload timed out after ${ms / 1000}s — the debugger was detached; the page may or may not have received the files`;
}

/** The finder's non-element answers. */
export type FinderStatus = "none" | "many" | "not-file-input" | "directory" | "disabled" | "single";

/**
 * Closure-free on purpose: shipped as `String(fn)`. The attribute name is a literal (`UPLOAD_MARK_ATTR` of
 * `content/upload-target.ts`; a test pins it). Never throws.
 */
function uploadFinderFn(mark: string, count: number): unknown {
  const found: any[] = [];
  function visit(root: any): void {
    let all: any;
    try {
      all = root.querySelectorAll("*");
    } catch (e) {
      return;
    }
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      try {
        if (el.getAttribute("data-__bridge-upload") === mark) found.push(el);
        if (el.shadowRoot) visit(el.shadowRoot);
        const tag = String(el.tagName).toUpperCase();
        if (tag === "IFRAME" || tag === "FRAME") {
          let doc = null;
          try {
            doc = el.contentDocument;
          } catch (e) {
            doc = null;
          }
          if (doc) visit(doc);
        }
      } catch (e) {
        /* a poisoned element must not stop the search */
      }
    }
  }
  try {
    visit(document);
  } catch (e) {
    /* nothing found */
  }
  for (let j = 0; j < found.length; j++) {
    try {
      found[j].removeAttribute("data-__bridge-upload");
    } catch (e) {
      /* best effort */
    }
  }
  if (found.length === 0) return "none";
  if (found.length > 1) return "many";
  const input = found[0];
  try {
    if (String(input.localName) !== "input" || String(input.type).toLowerCase() !== "file") return "not-file-input";
    if (input.hasAttribute("webkitdirectory") || input.webkitdirectory === true) return "directory";
    if (input.disabled) return "disabled";
    if (count > 1 && !input.multiple) return "single";
  } catch (e) {
    return "not-file-input";
  }
  return input;
}

/** The exact source the isolated world runs. */
export const UPLOAD_FINDER_SRC: string = String(uploadFinderFn);

/** The finder as an expression for `Runtime.evaluate`. */
export function uploadFinderExpression(mark: string, count: number): string {
  return `(${UPLOAD_FINDER_SRC})(${JSON.stringify(mark)}, ${JSON.stringify(count)})`;
}

/**
 * The two page functions the handler hands to `chrome.scripting.executeScript` (Chrome ships them as their source,
 * so they must be closure-free, like the finder; `s3-closure-free.test.ts` guards all three).
 */
export const UPLOAD_MARK_PAGE_FN = (r: unknown, n: unknown, m: unknown): unknown =>
  window.__agentBridge!.markUpload(r as string, n as number, m as string);
export const UPLOAD_UNMARK_PAGE_FN = (m: unknown): unknown => window.__agentBridge!.unmarkUpload(m as string);

/**
 * The failure sweep's `executeScript` target: the one document the mark was set in (its `documentId` from the mark
 * call's `InjectionResult`), never the tab, so a tab that navigated since is not scripted at all (Chrome refuses a
 * document it no longer shows). No document id → `null`: no sweep (S3 verifier MINOR 1).
 */
export function uploadSweepTarget(tabId: number, documentId: unknown): { tabId: number; documentIds: string[] } | null {
  return typeof documentId === "string" && documentId !== "" ? { tabId, documentIds: [documentId] } : null;
}

/** A finder status → the marked own refusal it raises inside the session. */
export function finderRefusal(status: FinderStatus): BridgeError {
  switch (status) {
    case "none":
      return markOwnRefusal(new BridgeError(ErrorCodes.REF_STALE, UPLOAD_MARK_GONE_MESSAGE));
    case "many":
      return markOwnRefusal(new BridgeError(ErrorCodes.INTERNAL, UPLOAD_MARK_NOT_UNIQUE_MESSAGE));
    case "not-file-input":
      return markOwnRefusal(new BridgeError(ErrorCodes.BAD_PARAMS, NOT_FILE_INPUT_MESSAGE));
    case "directory":
      return markOwnRefusal(new BridgeError(ErrorCodes.BAD_PARAMS, DIRECTORY_INPUT_MESSAGE));
    case "disabled":
      return markOwnRefusal(new BridgeError(ErrorCodes.BAD_PARAMS, DISABLED_INPUT_MESSAGE));
    case "single":
      return markOwnRefusal(new BridgeError(ErrorCodes.BAD_PARAMS, SINGLE_FILE_INPUT_MESSAGE));
  }
}

const FINDER_STATUSES: ReadonlySet<string> = new Set(["none", "many", "not-file-input", "directory", "disabled", "single"]);

/** The CDP methods of one upload, in order (the release runs in a `finally`). */
export const UPLOAD_STEP_METHODS = [
  "Page.getFrameTree",
  "Page.createIsolatedWorld",
  "Runtime.evaluate",
  "DOM.setFileInputFiles",
  "Runtime.releaseObject",
] as const;

export type CdpSend = (method: string, params: { [key: string]: unknown }) => Promise<unknown>;

/** A breakdown of the leg: an unmarked `INTERNAL`, so it reaches the wire prefixed (#254's rule). */
function breakdown(what: string): BridgeError {
  return new BridgeError(ErrorCodes.INTERNAL, `file upload: ${what}; nothing was uploaded`);
}

/**
 * The CDP steps of one upload, run inside one debugger session (the caller attaches, races the deadline and
 * detaches). Returns the number of paths handed to `DOM.setFileInputFiles` after it returned ok (#247): not proof
 * that the page took them.
 */
export async function setFilesByMark(send: CdpSend, mark: string, paths: readonly string[]): Promise<number> {
  const tree = (await send("Page.getFrameTree", {})) as { frameTree?: { frame?: { id?: unknown } } } | undefined;
  const frameId = tree?.frameTree?.frame?.id;
  if (typeof frameId !== "string" || frameId === "") throw breakdown("no main frame");
  const world = (await send("Page.createIsolatedWorld", { frameId, worldName: UPLOAD_WORLD_NAME })) as
    | { executionContextId?: unknown }
    | undefined;
  const contextId = world?.executionContextId;
  if (typeof contextId !== "number") throw breakdown("no isolated world");
  const res = (await send("Runtime.evaluate", {
    expression: uploadFinderExpression(mark, paths.length),
    contextId,
    returnByValue: false,
    awaitPromise: false,
  })) as { result?: { type?: string; subtype?: string; value?: unknown; objectId?: string }; exceptionDetails?: unknown } | undefined;
  if (!res || res.exceptionDetails !== undefined) throw breakdown("the finder failed");
  const r = res.result;
  if (r?.type === "string" && typeof r.value === "string" && FINDER_STATUSES.has(r.value)) {
    throw finderRefusal(r.value as FinderStatus);
  }
  if (r?.type !== "object" || r.subtype !== "node" || typeof r.objectId !== "string") throw breakdown("the finder's reply was not an element");
  const objectId = r.objectId;
  try {
    await send("DOM.setFileInputFiles", { files: [...paths], objectId });
  } finally {
    try {
      await send("Runtime.releaseObject", { objectId });
    } catch {
      /* best effort: the detach releases it anyway */
    }
  }
  return paths.length;
}

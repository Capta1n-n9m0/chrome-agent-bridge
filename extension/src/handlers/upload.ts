/**
 * Step 11 S3 — the `uploadFiles` handler (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.5–0.7 with their
 * Stage 0 notes; decisions.md #239, #245 (b), #247, #248). The safety gate (class `upload`) has already refused a
 * path outside the human's upload folders, a disarmed bridge and a blocked, own or `file:` tab before this runs, and
 * re-runs at every `call.effect()` and as the post-check; this handler is never reached with a refused path.
 *
 * Order: the params (`BAD_PARAMS`, no page call) → the tab → the file-access check (#245 (b): `UPLOAD_REFUSED`
 * before anything touches the page) → each path probed as an existing file (Step 11b S0F-b, #288 3c: `BAD_PARAMS`
 * naming the index, nothing touched) → effect → inject → `ref | locator` → effect → the content script's target rule
 * and one-off mark → the CDP leg (`uploadByMark`: effect before the attach, the isolated-world finder removes the
 * mark, `DOM.setFileInputFiles`) → `{files}` (+ `pastSnapshotCap`). On every failure after the mark was asked for,
 * the content script sweeps this call's mark (`sweepUploadMark`), a disarm and a newly blocked tab included: the
 * sweep only removes the bridge's own attribute, so it does not pass the gate (see the S3 report's decision). It
 * targets the document the mark was set in (`documentIds`), never the tab: a tab that navigated since is not
 * scripted (S3 verifier MINOR 1).
 *
 * Nothing here logs a path, a file name or the mark.
 */
import type { UploadFilesResult } from "@bridge/shared";
import { pageTab } from "../tabs.js";
import { ensureContent, classifyInjectError, toSerializableArgs, unwrapResult } from "../inject.js";
import { raceTimeout, send, uploadByMark, withDebugger } from "../debugger.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import { newMark } from "../evaluate/mark.js";
import {
  CHOOSER_MARK_PAGE_FN,
  ChooserTabs,
  ChooserWaiter,
  UPLOAD_CDP_TIMEOUT_MS,
  UPLOAD_MARK_PAGE_FN,
  UPLOAD_UNMARK_PAGE_FN,
  fileAccessRefusal,
  setFilesByChooser,
  uploadSweepTarget,
  uploadTimeoutMessage,
} from "../upload-files.js";
import { describeDebuggerError } from "../debugger-errors.js";
import { UPLOAD_MAX_PATHS } from "../upload-paths.js";
import { checkUploadFilesExist } from "../upload-exists.js";
import { checkTarget, resolveTargetCapped, withCapFlag } from "./target.js";
import type { HandlerSafety } from "../safety-call.js";

const present = (v: unknown): boolean => v !== undefined && v !== null;

export const UPLOAD_TARGET_REQUIRED_MESSAGE = "uploadFiles needs a ref or a locator naming the file input";
export const UPLOAD_PATHS_MESSAGE = `paths must be an array of 1 to ${UPLOAD_MAX_PATHS} absolute file paths`;
/** Step 12 S5a: `chooser` other than true, false, null or absent. */
export const CHOOSER_PARAM_MESSAGE = "uploadFiles: chooser must be true or false";

/**
 * The params alone (no page call): a target, 1–20 non-empty strings, and (Step 12 S5a) `chooser` true, false, null or
 * absent. The gate checked the folders.
 */
export function checkUploadParams(p: Record<string, unknown>): string[] {
  checkTarget(p);
  if (present(p.chooser) && typeof p.chooser !== "boolean") throw new BridgeError(ErrorCodes.BAD_PARAMS, CHOOSER_PARAM_MESSAGE);
  if (!present(p.ref) && !present(p.locator)) throw new BridgeError(ErrorCodes.BAD_PARAMS, UPLOAD_TARGET_REQUIRED_MESSAGE);
  const paths = p.paths;
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > UPLOAD_MAX_PATHS) {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, UPLOAD_PATHS_MESSAGE);
  }
  const out: string[] = [];
  for (let i = 0; i < paths.length; i++) {
    const v: unknown = paths[i];
    if (typeof v !== "string" || v === "") throw new BridgeError(ErrorCodes.BAD_PARAMS, UPLOAD_PATHS_MESSAGE);
    out.push(v);
  }
  return out;
}

/** #245 (b): `chrome.extension.isAllowedFileSchemeAccess()`; a failing read counts as not allowed. */
async function readFileAccess(): Promise<unknown> {
  try {
    return await chrome.extension.isAllowedFileSchemeAccess();
  } catch {
    return false;
  }
}

/**
 * Asks the content script to mark the input (as `callInPage` does, with its error texts). Hands the marked
 * document's id to `onDocument` before the result is judged, so a refusal still leaves the sweep its target.
 */
async function markInPage(
  tabId: number,
  args: [ref: string | undefined, count: number, mark: string] | [ref: string | undefined, mark: string],
  onDocument: (id: unknown) => void,
  func: (...a: any[]) => unknown = UPLOAD_MARK_PAGE_FN,
): Promise<void> {
  let injection: chrome.scripting.InjectionResult<any> | undefined;
  try {
    [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args: toSerializableArgs(args) as unknown[],
      world: "ISOLATED",
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new BridgeError(
      classifyInjectError(raw),
      `Could not run script in the target tab — it may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store). (${raw})`,
    );
  }
  onDocument(injection?.documentId);
  unwrapResult(injection);
}

/** Best effort: removes this call's mark in the document it was set in, and nowhere else. Never throws. */
async function sweepUploadMark(tabId: number, documentId: unknown, mark: string): Promise<void> {
  const target = uploadSweepTarget(tabId, documentId);
  if (!target) return; // no document known: never script whatever the tab shows now
  try {
    await chrome.scripting.executeScript({ target, func: UPLOAD_UNMARK_PAGE_FN, args: [mark], world: "ISOLATED" });
  } catch {
    /* the document is gone (navigated, closed) or not scriptable: nothing is left to remove there */
  }
}

/**
 * Step 12 S5a (#336): the prologue both upload paths share, in Step 11's order — the params, the tab, the file-access
 * check (#245 (b)), the missing-file check (#288 3c) — before anything touches the page. The gate's folder rule ran
 * before it (class `upload`).
 */
export async function uploadPrologue(p: Record<string, unknown>): Promise<{ paths: string[]; tab: chrome.tabs.Tab }> {
  const paths = checkUploadParams(p);
  const tab = await pageTab(p, "uploadFiles");
  const noAccess = fileAccessRefusal(await readFileAccess());
  if (noAccess) throw noAccess;
  // Step 11b S0F-b (#288 3c): every path must be an existing file, read by the worker's own `fetch` of its `file:` URL,
  // before anything touches the page; else `BAD_PARAMS` naming the index (`upload-exists.ts`). Needs file access (above).
  await checkUploadFilesExist(paths, (url, init) => fetch(url, init));
  return { paths, tab };
}

export async function uploadFiles(p: Record<string, unknown>, call?: HandlerSafety): Promise<UploadFilesResult> {
  const { paths, tab } = await uploadPrologue(p);
  if (p.chooser === true) return chooserUpload(tab.id!, p, paths, call);
  await call?.effect();
  await ensureContent(tab.id!);
  const { ref, pastSnapshotCap } = await resolveTargetCapped(tab.id!, p, call);
  const mark = newMark();
  await call?.effect();
  let done = false;
  let markedDocument: unknown;
  try {
    await markInPage(tab.id!, [ref, paths.length, mark], (id) => (markedDocument = id));
    const files = await uploadByMark(tab.id!, mark, paths, call);
    done = true;
    return withCapFlag<UploadFilesResult>({ files }, pastSnapshotCap);
  } finally {
    if (!done) await sweepUploadMark(tab.id!, markedDocument, mark);
  }
}

/** Step 12 S5a: the tabs with a chooser call in flight (one per tab, #336). Worker memory. */
const chooserTabs = new ChooserTabs();

/**
 * Step 12 S5a (#325, #336): `uploadFiles {chooser: true}` after the shared prologue — effect → inject → `ref | locator`
 * → effect → the target marked (no file-input rule) → the CDP leg on the call's own session (`chooseByMark`). The mark
 * is swept on every failure, as the input path's. A second chooser call on the tab answers today's overlap text (#335).
 */
async function chooserUpload(tabId: number, p: Record<string, unknown>, paths: string[], call?: HandlerSafety): Promise<UploadFilesResult> {
  if (!chooserTabs.take(tabId)) {
    const d = describeDebuggerError(new Error(`Another debugger is already attached to the tab with id: ${tabId}.`), "File upload");
    throw new BridgeError(d.code, d.message);
  }
  try {
    await call?.effect();
    await ensureContent(tabId);
    const { ref, pastSnapshotCap } = await resolveTargetCapped(tabId, p, call);
    const mark = newMark();
    await call?.effect();
    let done = false;
    let markedDocument: unknown;
    try {
      await markInPage(tabId, [ref, mark], (id) => (markedDocument = id), CHOOSER_MARK_PAGE_FN);
      const files = await chooseByMark(tabId, mark, paths, call);
      done = true;
      return withCapFlag<UploadFilesResult>({ files }, pastSnapshotCap);
    } finally {
      if (!done) await sweepUploadMark(tabId, markedDocument, mark);
    }
  } finally {
    chooserTabs.release(tabId);
  }
}

/**
 * The chooser's CDP leg in ONE session through the keeper (`withDebugger`, the gate re-check before the use): a
 * listener for this tab's own `Page.fileChooserOpened` (a child session's is ignored) lives only for the use and feeds
 * the call's waiter; `setFilesByChooser` runs under today's 15 s bound. Nothing here logs the event or a path.
 */
async function chooseByMark(tabId: number, mark: string, paths: readonly string[], call?: HandlerSafety): Promise<number> {
  return withDebugger(
    tabId,
    async () => {
      const waiter = new ChooserWaiter();
      const listener = (source: chrome.debugger.Debuggee & { sessionId?: string }, method: string, params?: object): void => {
        if (source.tabId === tabId && source.sessionId === undefined && method === "Page.fileChooserOpened") waiter.feed(params);
      };
      chrome.debugger.onEvent.addListener(listener);
      try {
        return await raceTimeout(
          setFilesByChooser({ send: (method, params) => send(tabId, method, params), waiter, effect: call && (() => call.effect()) }, mark, paths),
          UPLOAD_CDP_TIMEOUT_MS,
          uploadTimeoutMessage(),
        );
      } finally {
        chrome.debugger.onEvent.removeListener(listener);
        waiter.close();
      }
    },
    "File upload",
    call,
  );
}

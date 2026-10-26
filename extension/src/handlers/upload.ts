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
import { uploadByMark } from "../debugger.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import { newMark } from "../evaluate/mark.js";
import { UPLOAD_MARK_PAGE_FN, UPLOAD_UNMARK_PAGE_FN, fileAccessRefusal, uploadSweepTarget } from "../upload-files.js";
import { UPLOAD_MAX_PATHS } from "../upload-paths.js";
import { checkUploadFilesExist } from "../upload-exists.js";
import { checkTarget, resolveTargetCapped, withCapFlag } from "./target.js";
import type { HandlerSafety } from "../safety-call.js";

const present = (v: unknown): boolean => v !== undefined && v !== null;

export const UPLOAD_TARGET_REQUIRED_MESSAGE = "uploadFiles needs a ref or a locator naming the file input";
export const UPLOAD_PATHS_MESSAGE = `paths must be an array of 1 to ${UPLOAD_MAX_PATHS} absolute file paths`;

/** The params alone (no page call): a target, and 1–20 non-empty strings. The gate checked the folders. */
export function checkUploadParams(p: Record<string, unknown>): string[] {
  checkTarget(p);
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
async function markInPage(tabId: number, args: [ref: string | undefined, count: number, mark: string], onDocument: (id: unknown) => void): Promise<void> {
  let injection: chrome.scripting.InjectionResult<any> | undefined;
  try {
    [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: UPLOAD_MARK_PAGE_FN,
      args: toSerializableArgs(args) as [unknown, unknown, unknown],
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

export async function uploadFiles(p: Record<string, unknown>, call?: HandlerSafety): Promise<UploadFilesResult> {
  const paths = checkUploadParams(p);
  const tab = await pageTab(p, "uploadFiles");
  const noAccess = fileAccessRefusal(await readFileAccess());
  if (noAccess) throw noAccess;
  // Step 11b S0F-b (#288 3c): every path must be an existing file, read by the worker's own `fetch` of its `file:` URL,
  // before anything touches the page; else `BAD_PARAMS` naming the index (`upload-exists.ts`). Needs file access (above).
  await checkUploadFilesExist(paths, (url, init) => fetch(url, init));
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

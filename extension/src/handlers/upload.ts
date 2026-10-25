/**
 * Step 11 S3 — the `uploadFiles` handler (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.5–0.7 with their
 * Stage 0 notes; decisions.md #239, #245 (b), #247, #248). The safety gate (class `upload`) has already refused a
 * path outside the human's upload folders, a disarmed bridge and a blocked, own or `file:` tab before this runs, and
 * re-runs at every `call.effect()` and as the post-check; this handler is never reached with a refused path.
 *
 * Order: the params (`BAD_PARAMS`, no page call) → the tab → the file-access check (#245 (b): `UPLOAD_REFUSED`
 * before anything touches the page) → effect → inject → `ref | locator` → effect → the content script's target rule
 * and one-off mark → the CDP leg (`uploadByMark`: effect before the attach, the isolated-world finder removes the
 * mark, `DOM.setFileInputFiles`) → `{files}` (+ `pastSnapshotCap`). On every failure after the mark was asked for,
 * the content script sweeps this call's mark (`sweepUploadMark`), a disarm and a newly blocked tab included: the
 * sweep only removes the bridge's own attribute, so it does not pass the gate (see the S3 report's decision).
 *
 * Nothing here logs a path, a file name or the mark.
 */
import type { UploadFilesResult } from "@bridge/shared";
import { pageTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { uploadByMark } from "../debugger.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import { newMark } from "../evaluate/mark.js";
import { fileAccessRefusal } from "../upload-files.js";
import { UPLOAD_MAX_PATHS } from "../upload-paths.js";
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

/** Best effort: removes this call's mark wherever the content script can reach it. Never throws. */
async function sweepUploadMark(tabId: number, mark: string): Promise<void> {
  try {
    await callInPage(tabId, (m) => window.__agentBridge!.unmarkUpload(m as string), [mark]);
  } catch {
    /* the tab is gone or not scriptable: nothing is left to remove there */
  }
}

export async function uploadFiles(p: Record<string, unknown>, call?: HandlerSafety): Promise<UploadFilesResult> {
  const paths = checkUploadParams(p);
  const tab = await pageTab(p, "uploadFiles");
  const noAccess = fileAccessRefusal(await readFileAccess());
  if (noAccess) throw noAccess;
  await call?.effect();
  await ensureContent(tab.id!);
  const { ref, pastSnapshotCap } = await resolveTargetCapped(tab.id!, p, call);
  const mark = newMark();
  await call?.effect();
  let done = false;
  try {
    await callInPage(
      tab.id!,
      (r, n, m) => window.__agentBridge!.markUpload(r as string, n as number, m as string),
      [ref, paths.length, mark],
    );
    const files = await uploadByMark(tab.id!, mark, paths, call);
    done = true;
    return withCapFlag<UploadFilesResult>({ files }, pastSnapshotCap);
  } finally {
    if (!done) await sweepUploadMark(tab.id!, mark);
  }
}

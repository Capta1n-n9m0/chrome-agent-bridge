/**
 * Step 11b S0F-b — a missing file is refused by the extension (decisions.md #288 item 3c, #296; phase doc
 * `docs/plans/2026-10-26-step11b-block-list-redirects.md` 0.11; Stage 0 measured check (i) from the service worker,
 * `…-steps/stage0-dnr-3c.txt`). Before anything touches the page, each path is fetched as a `file:` URL (percent-encoded
 * segments): status 200 is a file (its first chunk is read, then the body is cancelled), a `TypeError` rejection
 * (Chrome's `Failed to fetch`) is missing — or unreadable, which the fetch cannot tell apart — and status 0 is a folder
 * (Chrome's listing). Everything else (another status, another rejection, a failing first read, a non-response, the
 * check's deadline, a path with no `file:` URL) is `unknown`, and is refused too: the upload proceeds only when every entry is a
 * file (fails closed). The check needs "Allow access to file URLs" (with it off every fetch rejects), so the handler
 * runs it after the file-access refusal (#245 (b)). Time of check to time of use is accepted (#296).
 *
 * Pure but for the injected fetch: no `chrome.*`, no log call. A refusal is `BAD_PARAMS` naming the entry's index,
 * never its path, folder, file name or URL (phase doc 0.10; worded as the SDK preflight, `sdk/src/upload.ts`, #262).
 */
import { BridgeError, ErrorCodes } from "./errors.js";
import { parseUploadPath } from "./upload-paths.js";

/**
 * The whole check's one deadline, from the first fetch to the last first chunk, however many paths (S0F-b fixer: a
 * per-path bound let 20 slow probes outlast the daemon's call wait, `daemonWaitMs` = 30 s + 5 s by default in
 * `daemon/src/route.ts`, and attach after the client got `TIMEOUT`). 5 s + the CDP leg's 15 s
 * (`UPLOAD_CDP_TIMEOUT_MS`) stays under the 30 s default. Past it, the entry being probed refuses `unknown`.
 */
export const UPLOAD_CHECK_TIMEOUT_MS = 5_000;

export type ProbeOutcome = "file" | "missing" | "folder" | "unknown";

/** The fetch the probe uses (the service worker's `fetch`; a fake in the tests). */
export type ProbeFetch = (url: string, init: { signal: AbortSignal }) => Promise<unknown>;

/** The `file:` URL of a path the path model accepts (`C:\a b\c` → `file:///C:/a%20b/c`), else null. */
export function uploadFileUrl(path: unknown): string | null {
  const parsed = parseUploadPath(path);
  if (parsed === null) return null;
  let segs: string[];
  try {
    segs = parsed.segments.map((s) => encodeURIComponent(s));
  } catch {
    return null; // a lone surrogate: no URL, so no probe (fails closed)
  }
  const root = parsed.style === "win" ? `${parsed.drive}:/` : "";
  return `file:///${root}${segs.join("/")}`;
}

interface BodyLike {
  getReader?: () => { read: () => Promise<unknown>; cancel: () => Promise<unknown> };
  cancel?: () => Promise<unknown>;
}

async function settle(fetchFn: ProbeFetch, url: string, signal: AbortSignal): Promise<ProbeOutcome> {
  let pending: Promise<unknown>;
  try {
    pending = fetchFn(url, { signal });
  } catch {
    return "unknown"; // not a fetch outcome: a fetch rejects, it never throws
  }
  let r: unknown;
  try {
    r = await pending;
  } catch (err) {
    // A DOMException (`AbortError`) is not a TypeError: the timeout is `unknown`, not missing.
    return err instanceof TypeError ? "missing" : "unknown";
  }
  if (typeof r !== "object" || r === null || typeof (r as { status?: unknown }).status !== "number") return "unknown";
  const status = (r as { status: number }).status;
  const body = (r as { body?: unknown }).body as BodyLike | null | undefined;
  if (status !== 200) {
    try {
      await body?.cancel?.();
    } catch {
      /* best effort */
    }
    return status === 0 ? "folder" : "unknown";
  }
  if (body === null || body === undefined) return "file"; // an empty file
  if (typeof body.getReader !== "function") return "unknown";
  const reader = body.getReader();
  try {
    await reader.read();
  } catch {
    return "unknown";
  }
  try {
    await reader.cancel();
  } catch {
    /* best effort */
  }
  return "file";
}

/** A deadline: at `timeoutMs` its signal aborts (every fetch under it) and `late` resolves `unknown`. */
function deadline(timeoutMs: number) {
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<ProbeOutcome>((resolve) => {
    timer = setTimeout(() => {
      ctl.abort();
      resolve("unknown");
    }, timeoutMs);
  });
  return { signal: ctl.signal, late, clear: () => clearTimeout(timer) };
}

/** One fetch raced against a deadline (`late` wins once it fired: the check stops at that entry). Never throws. */
function probeUnder(url: string, fetchFn: ProbeFetch, d: ReturnType<typeof deadline>): Promise<ProbeOutcome> {
  return Promise.race([settle(fetchFn, url, d.signal).catch((): ProbeOutcome => "unknown"), d.late]);
}

/** One path's outcome: its fetch, raced against `timeoutMs` (the fetch is aborted then). Never throws. */
export async function probeUploadFile(url: string, fetchFn: ProbeFetch, timeoutMs = UPLOAD_CHECK_TIMEOUT_MS): Promise<ProbeOutcome> {
  const d = deadline(timeoutMs);
  try {
    return await probeUnder(url, fetchFn, d);
  } finally {
    d.clear();
  }
}

/** The refusal for entry `index`: `BAD_PARAMS`, a fixed text naming the index only. */
export function uploadProbeRefusal(index: number, outcome: ProbeOutcome): BridgeError {
  const at = `paths[${index}]`;
  const what =
    outcome === "missing"
      ? `${at} does not exist (or Chrome cannot read it)`
      : outcome === "folder"
        ? `${at} is a folder, not a file — pass a file`
        : `${at} could not be checked as an existing file`;
  return new BridgeError(ErrorCodes.BAD_PARAMS, `upload: ${what}; nothing was uploaded`);
}

/**
 * Every entry probed in order under one deadline (`timeoutMs` for the whole check); the first that is not a file
 * throws its refusal. Resolves only when all are files within the deadline.
 */
export async function checkUploadFilesExist(paths: readonly string[], fetchFn: ProbeFetch, timeoutMs = UPLOAD_CHECK_TIMEOUT_MS): Promise<void> {
  const d = deadline(timeoutMs);
  try {
    for (let i = 0; i < paths.length; i++) {
      const url = uploadFileUrl(paths[i]);
      const outcome = url === null ? "unknown" : await probeUnder(url, fetchFn, d);
      if (outcome !== "file") throw uploadProbeRefusal(i, outcome);
    }
  } finally {
    d.clear();
  }
}

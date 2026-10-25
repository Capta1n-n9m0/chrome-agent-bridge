// Step 10 S4 (phase doc 0.4, transport (B); Stage 0 F11, F12, V8; decisions.md #127, #205, #207): the client half
// of `browser_evaluate {saveTo}` and `Tab.evaluateToFile`. The extension evaluates the expression into its store
// (`evaluateSaveStart`), this pulls the UTF-8 bytes in 1 MiB slices (`evaluateSaveChunk`), writes them to
// `<path>.part` (opened "wx") and moves it onto the path (a rename with `overwrite: true`; without it a hard link,
// which never replaces a file that appeared meanwhile), then drops the store's entry (`evaluateSaveEnd`).
//
// File rules (stricter than `browser_download`'s, #207), checked before any wire call: the path must be absolute,
// a file path (not an existing directory, no trailing separator), its parent directory must exist (nothing is
// created), an existing file needs `overwrite: true`, and an existing `<path>.part` is refused. Every refusal is
// `BAD_PARAMS` and leaves no file; every later failure removes the `.part` this call created. The extension never
// receives the path. Messages may name the path (the caller gave it), never any part of the value; nothing here logs.
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { link as fsLink, open as fsOpen, rename, rm, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { BridgeError, ErrorCodes, type EvaluateSaveChunkResult, type EvaluateSaveKind, type EvaluateSaveStartResult } from "@bridge/shared";

/** Bytes per pull (the extension's ceiling too). */
export const SAVE_CHUNK_BYTES = 1_048_576;
/** The extension's bound for reading the value out of the page after the page's own `timeoutMs`. */
export const SAVE_TRANSFER_MS = 120_000;
/** The page-side default, as `evaluate`'s. */
const PAGE_DEFAULT_MS = 10_000;
/** The start call outlives the extension's own bounds by this. */
const CALL_SLACK_MS = 5_000;

export interface EvaluateToFileOptions {
  /** Absolute file path. Its parent directory must exist. */
  path: string;
  /** Replace an existing file. Default false. */
  overwrite?: boolean;
  /** The page-side bound, as `evaluate`'s (default 10 000; the extension clamps to [100, 60 000]). */
  timeoutMs?: number;
}

/** What `evaluateToFile` wrote: never the value. */
export interface EvaluateToFileResult {
  path: string;
  /** UTF-8 bytes written (no BOM). */
  bytes: number;
  /** `"string"`: the value was a string, written as is; `"json"`: anything else, `JSON.stringify`'d in the page. */
  kind: EvaluateSaveKind;
  /** sha256 (hex) of the bytes written. */
  sha256: string;
}

type RawCall = (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) => Promise<unknown>;

/** Test seam: the `.part` file's opener (default `fs/promises.open`). Not part of the public surface. */
export interface SaveIo {
  open?: (file: string, flags: string) => Promise<FileHandle>;
  /** The no-replace finish's hard link (default `fs/promises.link`). */
  link?: (existing: string, created: string) => Promise<void>;
  /** Removes the `.part` (default `fs/promises.rm` with `force`; a missing file is not an error). */
  rm?: (file: string) => Promise<void>;
}

/** `link` errors that mean "this file system cannot hard-link": the finish falls back to re-check + rename. */
const LINK_UNSUPPORTED = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "EXDEV", "ENOSYS"]);

function existsError(target: string): BridgeError {
  return badParams(`${target} exists — pass overwrite: true to replace it`);
}

/** One attempt to remove the `.part`: true once it is gone (removed, or already missing). */
async function removePart(part: string, io: SaveIo): Promise<boolean> {
  try {
    await (io.rm ?? ((f: string) => rm(f, { force: true })))(part);
    return true;
  } catch {
    return false;
  }
}

/**
 * Moves the finished `.part` onto the target and answers whether the `.part` is gone. With `overwrite`, a rename
 * (it replaces). Without it, a file that appeared at the target after `checkSaveTarget` must not be replaced (S4
 * fixer round 1, verifier finding 5): `link(part, target)` fails `EEXIST` atomically → BAD_PARAMS; the caller
 * removes `.part`. After a successful link the `.part` is a second name for the same bytes, so a failed removal
 * answers false and the caller retries it (S4 fixer round 2, verifier finding R1-1). When the file system cannot
 * hard-link, the fallback re-checks the target and renames at once (a much narrower window, not none).
 */
async function finishSave(part: string, target: string, overwrite: boolean, io: SaveIo): Promise<boolean> {
  if (overwrite) {
    await rename(part, target);
    return true;
  }
  const link = io.link ?? ((a: string, b: string) => fsLink(a, b));
  try {
    await link(part, target);
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    if (code === "EEXIST") throw existsError(target);
    if (typeof code !== "string" || !LINK_UNSUPPORTED.has(code)) throw err;
    if (statOrNull(target) !== null) throw existsError(target);
    await rename(part, target);
    return true;
  }
  return removePart(part, io);
}

function badParams(message: string): BridgeError {
  return new BridgeError(ErrorCodes.BAD_PARAMS, message);
}

function statOrNull(p: string): ReturnType<typeof statSync> | null {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/**
 * The file rules that need no file to be opened (#207): the normalised absolute target, or `BAD_PARAMS`. The
 * `.part` rule is checked when the `.part` is opened ("wx").
 */
export function checkSaveTarget(requested: string, overwrite = false): string {
  if (typeof requested !== "string" || requested === "") throw badParams("saveTo needs an absolute file path");
  if (!path.isAbsolute(requested)) throw badParams(`saveTo must be an absolute file path: ${requested}`);
  if (/[\\/]$/.test(requested)) throw badParams(`saveTo must name a file, not a directory: ${requested}`);
  const target = path.normalize(requested);
  const parent = statOrNull(path.dirname(target));
  if (!parent || !parent.isDirectory()) {
    throw badParams(`saveTo's parent directory does not exist (nothing is created): ${path.dirname(target)}`);
  }
  const existing = statOrNull(target);
  if (existing?.isDirectory()) throw badParams(`saveTo must name a file, not a directory: ${target}`);
  if (existing && !overwrite) throw existsError(target);
  return target;
}

/**
 * Evaluates `expression` in `tab`'s page and writes the value to `options.path` (a string as is, anything else
 * as the page's `JSON.stringify`), UTF-8 without a BOM. `call` is a raw client call (the daemon adds nothing).
 */
export async function saveEvaluateToFile(
  call: RawCall,
  tab: string,
  expression: string,
  options: EvaluateToFileOptions,
  io: SaveIo = {},
): Promise<EvaluateToFileResult> {
  const target = checkSaveTarget(options.path, options.overwrite === true);
  const part = `${target}.part`;
  const openFile = io.open ?? ((f: string, flags: string) => fsOpen(f, flags));
  let fh: FileHandle;
  try {
    fh = await openFile(part, "wx");
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    if (code === "EEXIST") throw badParams(`${part} exists — remove it, or pick another path`);
    throw badParams(`cannot create ${part}: ${typeof code === "string" ? code : err instanceof Error ? err.message : String(err)}`);
  }

  let partLeft = true;
  let partStuck = false;
  let id: string | undefined;
  let result: EvaluateToFileResult;
  try {
    let start: EvaluateSaveStartResult;
    try {
      const pageMs = options.timeoutMs ?? PAGE_DEFAULT_MS;
      start = (await call(
        "evaluateSaveStart",
        { expression, timeoutMs: pageMs, tab },
        { timeoutMs: pageMs + SAVE_TRANSFER_MS + CALL_SLACK_MS },
      )) as EvaluateSaveStartResult;
      id = start.id;
      const hash = createHash("sha256");
      let written = 0;
      while (written < start.bytes) {
        const { data } = (await call("evaluateSaveChunk", { id, offset: written, length: SAVE_CHUNK_BYTES, tab })) as EvaluateSaveChunkResult;
        const buf = Buffer.from(data, "base64");
        if (buf.length === 0) throw new Error(`the extension returned an empty slice at byte ${written} of ${start.bytes}`);
        await fh.write(buf);
        hash.update(buf);
        written += buf.length;
      }
      if (written !== start.bytes) throw new Error(`wrote ${written} bytes, expected ${start.bytes}`);
      await fh.close();
      // `partLeft` turns false only once the `.part` is really gone (R1-1); otherwise the `finally` retries.
      partLeft = !(await finishSave(part, target, options.overwrite === true, io));
      result = { path: target, bytes: written, kind: start.kind === "string" ? "string" : "json", sha256: hash.digest("hex") };
    } finally {
      await fh.close().catch(() => {});
    }
  } finally {
    if (partLeft) partStuck = !(await removePart(part, io));
    if (id !== undefined) await call("evaluateSaveEnd", { id, tab }).catch(() => {});
  }
  // Reached only when the save itself succeeded. A `.part` that survived the retry is a second name holding the
  // whole value at a path the caller did not give (#207): never report success while it remains. The file at the
  // path stays — it is complete and is what was asked for; removing it would not remove the `.part`'s bytes.
  if (partStuck) {
    throw new BridgeError(
      ErrorCodes.INTERNAL,
      `${target} was written, but ${part} (a second name for the same bytes) could not be removed — remove it by hand`,
    );
  }
  return result;
}

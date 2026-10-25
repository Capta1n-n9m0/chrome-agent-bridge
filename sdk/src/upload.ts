// Step 11 S4 (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.8; decisions.md · 2026-10-25 · Step 11:
// `Tab.upload`'s signature and result (#240); Stage 0 F8): the client preflight of an upload, shared by `Tab.upload`
// and the MCP's `browser_upload_file` (re-exported on the `@bridge/sdk/download` subpath).
//
// Before any call, every path must be absolute, exist, be a regular file and be readable. What is sent is
// `fs.promises.realpath` of each file — it resolves a link or junction and canonicalises case and 8.3 names, where
// `fs.realpathSync` keeps the given form (Stage 0 F8) — so the extension's folder rule judges the real location. The
// sha256 and the size come from reading the bytes once. This is a convenience and the real-path step, never the
// security boundary: the folder rule is the extension's (phase doc 0.4, forbidden fixes).
//
// A refusal is `BAD_PARAMS` and names the entry by its index, never its path, folder or file name (phase doc 0.10:
// no refusal names a path). Nothing here logs.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { BridgeError, ErrorCodes, UPLOAD_FILES_MAX_PATHS } from "@bridge/shared";

/** `Tab.upload`'s options. */
export interface UploadOptions {
  /** The call's timeout (the default is the client's, 30 s). */
  timeoutMs?: number;
}

/** What `Tab.upload` resolves with: per file, its name, size and the sha256 of the bytes the client read. */
export interface UploadResult {
  files: { name: string; bytes: number; sha256: string }[];
}

/** One checked file: the real path to send, and what the result reports about it. */
export interface PreparedUpload {
  /** `fs.promises.realpath` of the given path: what goes on the wire. */
  path: string;
  /** The real path's last segment (the name Chrome gives the page's `File`). */
  name: string;
  bytes: number;
  sha256: string;
}

function refuse(message: string): BridgeError {
  return new BridgeError(ErrorCodes.BAD_PARAMS, `upload: ${message}`);
}

/** sha256 and size of `file`, read once as a stream. */
function hashFile(file: string): Promise<{ bytes: number; sha256: string }> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    let bytes = 0;
    const stream = createReadStream(file);
    stream.on("data", (chunk) => {
      const b = chunk as Buffer;
      bytes += b.length;
      hash.update(b);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve({ bytes, sha256: hash.digest("hex") }));
  });
}

/** The error's code (`ENOENT`, `EACCES`, …) without its message, which names the path. */
function errnoOf(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "an error";
}

async function prepareOne(given: unknown, at: string): Promise<PreparedUpload> {
  if (typeof given !== "string" || given === "") throw refuse(`${at} must be a non-empty string`);
  if (!path.isAbsolute(given)) throw refuse(`${at} is not an absolute path — pass an absolute file path`);
  let real: string;
  try {
    real = await realpath(given);
  } catch (err) {
    const code = errnoOf(err);
    throw refuse(code === "ENOENT" ? `${at} does not exist` : `${at} cannot be resolved (${code})`);
  }
  let isFile: boolean;
  try {
    isFile = (await stat(real)).isFile();
  } catch (err) {
    throw refuse(`${at} cannot be read (${errnoOf(err)})`);
  }
  if (!isFile) throw refuse(`${at} is not a regular file (a directory or a device) — pass a file`);
  let read: { bytes: number; sha256: string };
  try {
    read = await hashFile(real);
  } catch (err) {
    throw refuse(`${at} cannot be read (${errnoOf(err)})`);
  }
  return { path: real, name: path.basename(real), ...read };
}

/**
 * The preflight: `paths` (one path or a list of 1–`UPLOAD_FILES_MAX_PATHS`) checked in order and resolved to
 * real paths, each read once for its size and sha256. `BAD_PARAMS` on the first refusal; nothing is sent.
 */
export async function prepareUpload(paths: unknown): Promise<PreparedUpload[]> {
  if (typeof paths === "string") return [await prepareOne(paths, "paths[0]")];
  if (!Array.isArray(paths)) throw refuse("paths must be a path or a list of paths");
  if (paths.length === 0) throw refuse("paths is empty — pass at least one file");
  if (paths.length > UPLOAD_FILES_MAX_PATHS) {
    throw refuse(`at most ${UPLOAD_FILES_MAX_PATHS} paths in one upload (got ${paths.length})`);
  }
  const out: PreparedUpload[] = [];
  for (let i = 0; i < paths.length; i++) out.push(await prepareOne(paths[i], `paths[${i}]`));
  return out;
}

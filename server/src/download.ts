// `browser_download`, server half: decide where the file goes, pull the bytes the extension holds in
// chunks, write them atomically (`.part` then rename) and report size + sha256. The fetch itself
// happens in the extension (handlers/download.ts) with the profile's cookies.
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { DownloadChunkResult, DownloadStartResult } from "@bridge/shared";

export const CHUNK_BYTES = 1024 * 1024;

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * A filename safe to join onto a directory on Windows, macOS and Linux: no directory parts, no
 * control or reserved characters, no trailing dots/spaces, not a reserved device name. "" if
 * nothing usable is left.
 */
export function sanitizeFilename(name: string): string {
  let n = name.split(/[\\/]/).pop() ?? "";
  n = n.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_").replace(/[. ]+$/, "").trim();
  if (n === "" || n === "." || n === "..") return "";
  if (WINDOWS_RESERVED.test(n)) n = `_${n}`;
  if (n.length > 200) {
    const ext = path.extname(n).slice(0, 20);
    n = n.slice(0, 200 - ext.length) + ext;
  }
  return n;
}

/**
 * Where to write. `requested` must be absolute. A trailing separator or an existing directory means
 * "into this folder, under the name the response suggests" (`fallbackName` if it suggests none).
 */
export function resolveTarget(
  requested: string,
  suggested: string,
  isDirectory: (p: string) => boolean,
  fallbackName = "download",
): string {
  if (!path.isAbsolute(requested)) throw new Error(`path must be absolute: ${requested}`);
  const intoDir = /[\\/]$/.test(requested) || isDirectory(requested);
  if (!intoDir) return path.normalize(requested);
  return path.join(requested, sanitizeFilename(suggested) || fallbackName);
}

export interface DownloadOutcome {
  path: string;
  size: number;
  sha256: string;
  start: DownloadStartResult;
}

type Call = (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) => Promise<unknown>;

export async function downloadToFile(
  call: Call,
  opts: { url: string; path: string; overwrite?: boolean; timeoutMs?: number },
): Promise<DownloadOutcome> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const start = (await call("downloadStart", { url: opts.url, timeoutMs }, { timeoutMs: timeoutMs + 5_000 })) as DownloadStartResult;
  let part = "";
  try {
    const target = resolveTarget(opts.path, start.filename, (p) => existsSync(p) && statSync(p).isDirectory());
    if (existsSync(target) && !opts.overwrite) {
      throw new Error(`${target} exists — pass overwrite:true to replace it`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    part = `${target}.part`;
    const hash = createHash("sha256");
    const fh = await open(part, "w");
    let written = 0;
    try {
      while (written < start.size) {
        const { data } = (await call("downloadChunk", { id: start.id, offset: written, length: CHUNK_BYTES })) as DownloadChunkResult;
        const buf = Buffer.from(data, "base64");
        if (buf.length === 0) throw new Error(`extension returned an empty chunk at offset ${written}`);
        await fh.write(buf);
        hash.update(buf);
        written += buf.length;
      }
    } finally {
      await fh.close();
    }
    if (written !== start.size) throw new Error(`wrote ${written} bytes, expected ${start.size}`);
    await rename(part, target);
    part = "";
    return { path: target, size: written, sha256: hash.digest("hex"), start };
  } finally {
    if (part) await rm(part, { force: true }).catch(() => {});
    await call("downloadEnd", { id: start.id }).catch(() => {});
  }
}

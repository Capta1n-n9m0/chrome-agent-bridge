// recipes/blackboard/export-file.ts — pure helpers of export-grades.ts and assemble-mcp.ts (Step 8 S6):
// the export's file name, chunk ranges and reassembly, and the transfer check against the page's own
// length/bytes/sha256. Written 2026-10-23 with its tests (recipes/test/blackboard-export-file.test.ts).
import { createHash } from "node:crypto";
import path from "node:path";

/** Characters per chunk on the SDK leg: `Tab.evaluate` returns a string's full value (no 20 000 cap). */
export const SDK_CHUNK_CHARS = 100_000;
/**
 * Characters per chunk on the MCP leg: `browser_evaluate` prints a string result raw, capped at 20 000
 * characters (`extension/src/evaluate/result.ts` DEFAULT_MAX_CHARS); the export has no newlines.
 */
export const MCP_CHUNK_CHARS = 8_000;
/**
 * The MCP leg's pre-registered cap (S6 fixer r1, 2026-10-23, before any live run): at most 30 chunks
 * (240 000 characters) enter the actor's context; a longer export is "MCP leg not measured" (its length
 * recorded), never a FAIL and never transferred in part.
 */
export const MCP_MAX_CHARS = 30 * MCP_CHUNK_CHARS;

export function mcpLegPlan(length: number): { measurable: boolean; chunks: number } {
  if (!Number.isInteger(length) || length < 0) throw new Error("bad length");
  return { measurable: length <= MCP_MAX_CHARS, chunks: Math.ceil(length / MCP_CHUNK_CHARS) };
}

/**
 * `<course>-<YYYY-MM-DD, UTC>[-mcp].json`, with `dry-` in front for a dry run. `course` is an id `_N_N`
 * or (not in a dry run) a lower-case key label like `pp1` (#96: the resolved id never names a file).
 */
export function exportFileName(course: string, date: Date, opts: { dryRun: boolean; leg: "sdk" | "mcp" }): string {
  const isId = /^_\d+_\d+$/.test(course);
  if (!isId && !(/^[a-z][a-z0-9]{0,31}$/.test(course) && !opts.dryRun)) throw new Error("not a course id or label");
  const day = date.toISOString().slice(0, 10);
  return `${opts.dryRun ? "dry-" : ""}${course}-${day}${opts.leg === "mcp" ? "-mcp" : ""}.json`;
}

/** Whether `p` lies under `root` (Windows paths compared case-insensitively). */
export function isInside(root: string, p: string): boolean {
  const win = /^[A-Za-z]:[\\/]/.test(root) || root.startsWith("\\\\");
  const impl = win ? path.win32 : path.posix;
  const rel = impl.relative(win ? root.toLowerCase() : root, win ? p.toLowerCase() : p);
  return rel !== "" && !rel.startsWith("..") && !impl.isAbsolute(rel);
}

export function chunkRanges(length: number, size: number): Array<[number, number]> {
  if (!Number.isInteger(size) || size < 1) throw new Error("chunk size must be a positive integer");
  const out: Array<[number, number]> = [];
  for (let a = 0; a < length; a += size) out.push([a, Math.min(length, a + size)]);
  return out;
}

/** Joins chunks into the text of `length` characters: contiguous from 0, duplicates identical. */
export function assemble(chunks: Array<{ start: number; text: string }>, length: number): string {
  const byStart = new Map<number, string>();
  for (const c of chunks) {
    const seen = byStart.get(c.start);
    if (seen !== undefined && seen !== c.text) throw new Error(`two chunks at ${c.start} differ`);
    byStart.set(c.start, c.text);
  }
  let out = "";
  while (out.length < length) {
    const next = byStart.get(out.length);
    if (next === undefined || next.length === 0) throw new Error(`chunk missing at ${out.length} (gap in the transfer)`);
    out += next;
  }
  if (out.length !== length) throw new Error(`assembled ${out.length} characters, expected ${length}`);
  return out;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface PageDigest {
  length: number;
  bytes: number;
  sha256: string;
}

/** Throws unless the transferred text has the page's length, UTF-8 size and sha256. */
export function verifyTransfer(text: string, page: PageDigest): void {
  if (text.length !== page.length) throw new Error(`length ${text.length} ≠ the page's ${page.length}`);
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes !== page.bytes) throw new Error(`bytes ${bytes} ≠ the page's ${page.bytes}`);
  const sha = sha256Hex(text);
  if (sha !== page.sha256) throw new Error(`sha256 ${sha} ≠ the page's ${page.sha256}`);
}

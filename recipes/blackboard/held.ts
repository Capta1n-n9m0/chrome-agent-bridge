// recipes/blackboard/held.ts — SDK-7's held-export mode (decision #103, 2026-10-23, before S6.3's re-run):
// the page builds the export ONCE (one START, by the SDK leg, `export-grades.ts <course> --hold`) and keeps
// it in page memory under one key; the SDK leg and the MCP leg each read that same held export, and the
// held copy is dropped from the page after both reads (`export-grades.ts <course> --drop-held <T#>`).
// The page side is unchanged: the existing START stores the export at `window.__bridgeExport[<key>]`, and
// STATUS/CHUNK/drop read or delete it there (readonly.ts). What changes is who starts it (only the SDK leg)
// and the key both legs read (`held-<course>`). Pure; written 2026-10-23 with its tests
// (recipes/test/blackboard-held.test.ts). No line here carries a course id beyond the label given, a URL,
// a title or page content.
import { MCP_CHUNK_CHARS, MCP_MAX_CHARS } from "./export-file.js";
import { checkLoadedTab, isAdaCoursePage, Refusal, type CourseArg } from "./guard.js";
import { chunkExpression, exportKey, startExpression, statusExpression } from "./readonly.js";

/** The one key the held export lives under; both legs read it. */
export function heldKey(course: string): string {
  return exportKey("held", course);
}

/**
 * The MCP leg's plan, as the lines `--mcp-plan` prints. `held: false` is the pre-#103 plan, unchanged
 * (its own START under `mcp-<course>`); `held: true` has NO START — STATUS and CHUNK on the held key.
 */
export function mcpPlanLines(c: CourseArg, opts: { held: boolean }): string[] {
  const course = c.label;
  const out: string[] = [];
  const cap = `chunk size ${MCP_CHUNK_CHARS} characters (the MCP prints a string result raw, capped at 20 000); at most ${MCP_MAX_CHARS} characters (${MCP_MAX_CHARS / MCP_CHUNK_CHARS} chunks), else the MCP leg is not measured`;
  if (opts.held) {
    const key = heldKey(course);
    out.push(`# SDK-7 MCP leg for course ${course}, held export (#103) — paste into the actor's prompt (S6-wave-sheet.md, SDK-7)`);
    out.push(`# key ${key}; ${cap}`);
    out.push(`# no START: the SDK leg (--hold) built the export once and holds it in its tab; this leg only reads it (M1 = select the tab + the first STATUS)`);
    out.push("STATUS:");
    out.push(statusExpression(key));
  } else {
    const key = exportKey("mcp", course);
    out.push(`# SDK-7 MCP leg for course ${course} — paste into the actor's prompt (S6-wave-sheet.md, SDK-7)`);
    out.push(`# key ${key}; ${cap}`);
    if (c.kind === "key") out.push(`# a course key: START carries no course id; it runs only on the tab the SDK leg kept open (--keep-open), which carries the label mark`);
    out.push("START:");
    // An id names bb.C itself; a key label runs on the SDK leg's marked tab (bbC null: no id in the plan).
    out.push(c.kind === "key" ? startExpression(key, course, { bbC: null }) : startExpression(key, course));
    out.push("STATUS:");
    out.push(statusExpression(key));
  }
  const key = opts.held ? heldKey(course) : exportKey("mcp", course);
  out.push(`CHUNK (for start = 0, ${MCP_CHUNK_CHARS}, ${2 * MCP_CHUNK_CHARS}, … while start < length; end = start + ${MCP_CHUNK_CHARS}):`);
  out.push(chunkExpression(key, 0, MCP_CHUNK_CHARS));
  out.push(chunkExpression(key, MCP_CHUNK_CHARS, 2 * MCP_CHUNK_CHARS));
  return out;
}

/** The SDK leg's line in hold mode, after its own read: where the export is held and how it is dropped. */
export function heldLine(key: string, handle: string, course: string): string {
  return `held export under key ${key} in ${handle} (page memory, built once; the MCP leg reads it: --mcp-plan --hold; drop it after both reads: ${course} --drop-held ${handle})`;
}

export function keptHeldLine(handle: string): string {
  return `kept ${handle} open with bb loaded and the export held for the MCP leg; released when this script exits`;
}

export interface HeldStatus {
  state?: string;
  length?: number;
  bytes?: number;
  sha256?: string;
  columns?: number;
  grades?: number;
}

/** The line for the held export found before the drop; throws unless it is a finished export. */
export function heldFoundLine(key: string, handle: string, s: HeldStatus | null): string {
  if (!s) throw new Error(`no held export under key ${key} in ${handle} (already dropped, or the tab navigated)`);
  if (s.state !== "done") throw new Error(`the held export under key ${key} in ${handle} is "${String(s.state)}", not done`);
  return `held export ${key} in ${handle}: done, ${s.length} characters, ${s.bytes} bytes, sha256 ${s.sha256}`;
}

/** The drop's result line; throws unless the drop answered and STATUS on the key is gone (null) after it. */
export function droppedLine(key: string, handle: string, dropResult: unknown, after: HeldStatus | null): string {
  if (dropResult !== "dropped") throw new Error(`the drop expression answered ${typeof dropResult}, not "dropped"`);
  if (after !== null) throw new Error(`STATUS on ${key} still answers state "${String(after.state)}" after the drop`);
  return `dropped the held export ${key} from ${handle}; STATUS on ${key} now: gone (null)`;
}

/** The tab `--drop-held` may act on: unheld, and the recipe's course page (live) or its fixture page (dry run). */
export function checkHeldTab(row: { owner?: unknown; url?: unknown } | undefined, handle: string, arg: CourseArg, dryRun: boolean): void {
  if (!row) throw new Refusal(`no open tab ${handle}`);
  if (row.owner !== undefined) throw new Refusal(`${handle} is held by ${JSON.stringify(row.owner)} — end that client first`);
  if (dryRun) {
    if (arg.kind !== "id") throw new Refusal("a dry run takes a course id");
    checkLoadedTab(row.url, true, arg.id, arg.label);
    return;
  }
  if (!isAdaCoursePage(row.url)) throw new Refusal(`${handle} is not on an ada course page — nothing dropped`);
}

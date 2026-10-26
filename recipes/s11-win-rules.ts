// recipes/s11-win-rules.ts — the pure half of recipes/s11-win.ps1 (Step 11 S5-win, Run 16; docs/e2e-test-plan.md §4.23).
// No I/O, no process, no clock. The PowerShell helpers mirror these rules (the mirror is tied by
// recipes/test/s11-win-static.test.ts). Nothing here returns a folder, a block-list pattern or a hash for printing:
// restoreCheck's line holds a box name, a count and equal/DIFFERENT.
import { createHash } from "node:crypto";
import { EMPTY_SHA256 } from "./s11-rules.js";
import { overlapArea, TASKBAR_CLASSES, type ShellWindow } from "./s9-rules.js";

export const sha256Utf8 = (text: string): string => createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
/** Non-blank lines (the PowerShell side counts `-split "\r?\n"` with Trim() -ne ''). */
export const lineCount = (text: string): number => text.split(/\r?\n/).filter((l) => l.trim() !== "").length;

/** found + one line of the wave's own. The found text stays a prefix, byte for byte; the newline style is the found text's. */
export function addLine(found: string, line: string): string {
  if (/[\r\n]/.test(line)) throw new Error("addLine: the line holds a newline");
  if (found === "") return line;
  const nl = found.includes("\r\n") ? "\r\n" : "\n";
  return found.endsWith("\n") ? found + line : found + nl + line;
}

export type BoxName = "blocklist" | "uploadfolders";
/** Restore-by-hash (decision #243): equality of the two texts decided by their sha256; the line carries no text or hash. */
export function restoreCheck(box: BoxName, found: string, readBack: string): { equal: boolean; line: string } {
  const equal = sha256Utf8(found) === sha256Utf8(readBack);
  return { equal, line: `RESTORE ${box} lines=${lineCount(found)} hash=${equal ? "equal" : "DIFFERENT"}` };
}

export interface FoundInput {
  armed: boolean;
  evaluate: boolean;
  blockText: string;
  foldersText: string;
  toggle: "on" | "off" | "unreadable";
}
/** found.json as S5-actor's contract wants it (written outside the repo, so the hashes may be in it). */
export function foundJson(i: FoundInput): {
  armed: boolean;
  evaluate: boolean;
  blocklist: { lines: number; sha256: string };
  uploadfolders: { lines: number; sha256: string };
  toggle: string;
} {
  return {
    armed: i.armed,
    evaluate: i.evaluate,
    blocklist: { lines: lineCount(i.blockText), sha256: sha256Utf8(i.blockText) },
    uploadfolders: { lines: lineCount(i.foldersText), sha256: sha256Utf8(i.foldersText) },
    toggle: i.toggle,
  };
}
export { EMPTY_SHA256 };

export interface ToggleCandidate {
  name: string;
  state: "on" | "off" | "none";
}
/** UP-0: the "Allow access to file URLs" toggle. One stateful reading (duplicates agreeing) → it; none or conflicting → unreadable. */
export function toggleReading(c: readonly ToggleCandidate[]): "on" | "off" | "unreadable" {
  const s = new Set(c.filter((x) => /^Allow access to file URLs/.test(x.name) && x.state !== "none").map((x) => x.state));
  return s.size === 1 ? ([...s][0] as "on" | "off") : "unreadable";
}

// ── signal files (S5-actor's contract: <name>.ready / <name>.pressed in $S11_OUT) ────────────────────────
export const SIGNAL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
export function signalFile(out: string, name: string, kind: "ready" | "pressed"): string {
  if (!SIGNAL_NAME_RE.test(name)) throw new Error("signalFile: not a signal name");
  if (kind !== "ready" && kind !== "pressed") throw new Error("signalFile: kind");
  return `${out.replace(/[\\/]+$/, "")}\\${name}.${kind}`;
}
/** The signal names a row uses (s11.ts `sampled`, `driverChange`, `race`). Rows with no driver part give []. */
export function signalNamesFor(row: string): string[] {
  if (row === "UP-7") return ["a", "b", "c"].flatMap((l) => [`UP-7-${l}`, `UP-7-${l}-done`]);
  if (row === "UP-7J" || row === "UP-DEVT") return [row, `${row}-done`];
  if (row === "UP-RACE-A" || row === "UP-RACE-B") return [row, `${row}-loop-done`];
  if (["UP-1", "UP-6", "UP-6B", "UP-FA"].includes(row)) return [`${row}-sample`, `${row}-sampled`];
  return [];
}
/** The banner sampler's `.pressed` content: `seen` when any poll counted the banner. */
export const samplerResult = (counts: readonly number[]): "seen" | "none" => (counts.some((n) => n > 0) ? "seen" : "none");

// ── argument checks ──────────────────────────────────────────────────────────────────────────────────────
export const validHwnd = (h: number): boolean => Number.isInteger(h) && h > 0;
/** The only URLs a helper may type into a window it opened (fixtures, the extensions page, this extension's pages). */
export function allowedWindowUrl(url: string, extId: string): boolean {
  if (url === "about:blank" || url === "chrome://extensions" || url.startsWith("chrome://extensions/?id=" + extId)) return true;
  if (url.startsWith(`chrome-extension://${extId}/`)) return true;
  return /^http:\/\/(127\.0\.0\.1|localhost|[a-z0-9-]+\.localhost):(8081|8084)(\/|$)/.test(url);
}

// ── the occluder guard ───────────────────────────────────────────────────────────────────────────────────
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export interface Occluder {
  rect: Rect;
  owner: string;
  rootOwner: string;
}
export const rectsIntersect = (a: Rect, b: Rect): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const DRIVER_OWNERS = new Set(["W", "E", "D", "O"]);
/** Foreign occluders fail; an occluder owned (owner or root owner) by a driver window is exempt only when it covers none of the read rects. */
export function occluderVerdict(occ: readonly Occluder[], readRects: readonly Rect[]): { ok: boolean; foreign: number; owned: number } {
  let foreign = 0;
  let owned = 0;
  for (const o of occ) {
    const mine = DRIVER_OWNERS.has(o.owner) || DRIVER_OWNERS.has(o.rootOwner);
    if (mine && readRects.length > 0 && !readRects.some((r) => rectsIntersect(o.rect, r))) owned++;
    else foreign++;
  }
  return { ok: foreign === 0, foreign, owned };
}

// ── the static output scan of s11-win.ps1 ────────────────────────────────────────────────────────────────
/** Variables a printed line may mention: counts, flags, handles, ids, row and box names. Never a text, folder, pattern, path or hash. */
export const SAFE_VARS: readonly string[] = [
  "Hwnd", "h", "O", "O2", "W", "X", "Id", "Row", "Name", "Box", "Kind", "n", "ms", "ok", "equal", "count", "lines", "armed", "evaluate",
  "reading", "state", "On", "Which", "Why", "Gap", "GapMs", "k", "i", "seen", "total", "left", "tag", "Tag", "Leg", "foundLines", "nowLines", "occ", "ids", "cands", "pid",
  "post", "blockLines", "foldersLines", "bsShown", "fsShown", "res", "page", "daemon", "title", "cls", "procName", "What", "NoSave", "standing", "invalidCount", "warnedCount", "o2Ms", "on", "off", "foreign",
];
/** Calls that return the user's text, a folder or a pattern; they may only be assigned or hashed, never printed. */
export const TEXT_CALLS: readonly string[] = ["Get-S11Box", "Get-S11Alias", "ReadAllText", "Get-S9Text", "Get-Content"];
/** Every way a line can reach the console, the s9 log or a file (Write-S9Raw writes the log; Out-File / Add-Content / Set-Content write files). */
const SINK = /\b(Write-Host|Write-Output|Write-Warning|Write-Error|Write-Verbose|Out-Host|Out-File|Add-Content|Set-Content|Write-S9Raw|Say9|Stop9|echo|throw)\b|\[Console\]::(Write|WriteLine|Error)\b/;
/** The statement that starts at a sink keyword: up to a `;` or `}` outside quotes and parentheses. */
function sinkSegment(t: string): string {
  let q = "";
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (q) {
      if (c === q) q = "";
      else if (q === '"' && c === "$" && t[i + 1] === "(") {
        // a subexpression inside a double-quoted string: its quotes are code, not the string's end
        let d = 1;
        i += 2;
        while (i < t.length && d > 0) {
          if (t[i] === "(") d++;
          else if (t[i] === ")") d--;
          i++;
        }
        i--;
      }
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if ((c === ";" || c === "}") && depth === 0) return t.slice(0, i);
  }
  return t;
}
/** Returns one violation string (line number + reason, never the line's text) per unsafe output line. */
export function scanPs1Output(src: string): string[] {
  const bad: string[] = [];
  src.split(/\r?\n/).forEach((raw, idx) => {
    const code = raw
      // a function header is not output, but a one-line function's body is scanned like any other line
      .replace(/^\s*function\s+[\w-]+\s*(\([^{]*\))?\s*\{?/, "")
      .replace(/^\s*#.*$/, "").replace(/\s#\s.*$/, (m) => (m.includes('"') || m.includes("'") ? m : ""));
    const at = `line ${idx + 1}`;
    const sinkAt = code.search(SINK);
    const hasSink = sinkAt >= 0;
    if (hasSink) {
      const stripped = sinkSegment(code.slice(/\|\s*$/.test(code.slice(0, sinkAt)) ? 0 : sinkAt)).replace(/\$\(\$_\.Exception\.GetType\(\)\.Name\)/g, "").replace(/`\$/g, "").replace(/\$\(Now9\)/g, "");
      if ((stripped.match(/"/g) ?? []).length % 2 === 1) bad.push(`${at}: unbalanced quote in an output line`);
      for (const m of stripped.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_:]*)/g)) {
        const v = m[1]!;
        if (["true", "false", "null"].includes(v.toLowerCase())) continue;
        if (v.toLowerCase().startsWith("env:")) bad.push(`${at}: prints an environment variable`);
        else if (!SAFE_VARS.includes(v)) bad.push(`${at}: prints $${v}, which is not on the safe list`);
      }
      for (const c of TEXT_CALLS) if (stripped.includes(c)) bad.push(`${at}: prints the result of ${c}`);
      if (/token/i.test(stripped.replace(/"[^"]*"|'[^']*'/g, (s) => (/\$/.test(s) ? s : "")))) bad.push(`${at}: mentions the token in an output line`);
      if (/\.Current\.(Name|Value)|\.Exception\.Message|Format-S9Title|Get-S9DocUrl|Get-S9Omnibox|Get-S9ActionTitle|\.Text\(/i.test(stripped)) bad.push(`${at}: prints an element value, a title, a URL or an exception message`);
    }
    // a bare text variable returned or left in the pipeline
    if (/^\s*(return\s+)?\$(text|t|bt|ft|root|alias|pattern|found\w*Text|want\w*|next)\s*$/.test(code)) bad.push(`${at}: leaves a text variable in the output pipeline`);
    // a text-returning call must be assigned or hashed in place
    for (const c of TEXT_CALLS) {
      if (!code.includes(c) || /^\s*#/.test(code)) continue;
      const assigned = new RegExp(`\\$\\w+\\s*=\\s*.*${c}`).test(code) || new RegExp(`Get-S9Sha256\\s*\\(?\\s*\\(?\\s*${c}`).test(code) || /\[IO\.File\]::ReadAllText/.test(code) && c === "ReadAllText";
      if (!assigned && !hasSink) bad.push(`${at}: ${c} is called where its text could reach the output`);
      // a text put into a variable whose name is on the safe list would pass the print check: refuse it
      const into = new RegExp(`\\$(\\w+)\\s*=\\s*[^;]*${c}`).exec(code);
      if (into && SAFE_VARS.includes(into[1]!)) bad.push(`${at}: ${c} is assigned to $${into[1]}, a name on the safe list`);
    }
  });
  return bad;
}

// ── SW-2's placement of the wave's own window (S5-liveA set-up fix, #281 (c)) ─────────────────────────────────────────────────
/**
 * The rect for W: its monitor's work area, cut clear of every shell taskbar window that overlaps it with a positive area (an
 * auto-hidden taskbar's 2 px strip included: Windows reports it at y 1078..1126 on a 1080-px monitor), plus `margin` px on the
 * cut edge. A horizontal taskbar in the lower half cuts the bottom, in the upper half the top; a vertical one cuts the left or
 * right. A taskbar that does not overlap the area changes nothing. Placement only: the occlusion guard is not touched.
 * recipes/s11-win.ps1 Get-S11ClearRect mirrors this; recipes/test/s11-liveA-fixes.test.ts runs both on the same cases.
 */
export function clearPlacement(work: Rect, taskbars: ShellWindow[], margin = 8): Rect {
  const r = { ...work };
  for (const t of taskbars) {
    if (!TASKBAR_CLASSES.includes(t.cls) || overlapArea(r, t.rect) <= 0) continue;
    const tw = t.rect.right - t.rect.left;
    const th = t.rect.bottom - t.rect.top;
    if (tw >= th) {
      if ((t.rect.top + t.rect.bottom) / 2 >= (r.top + r.bottom) / 2) r.bottom = Math.min(r.bottom, t.rect.top - margin);
      else r.top = Math.max(r.top, t.rect.bottom + margin);
    } else if ((t.rect.left + t.rect.right) / 2 >= (r.left + r.right) / 2) r.right = Math.min(r.right, t.rect.left - margin);
    else r.left = Math.max(r.left, t.rect.right + margin);
  }
  return r;
}

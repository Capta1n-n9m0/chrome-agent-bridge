/**
 * Step 9 (Phase E), S2b: the options page's pure model. The DOM glue (`options.ts`) stays thin.
 *
 * - The block list is analysed by S1's own parser (`parseBlockList`, stage0-audit.md §5; decisions.md ·
 *   2026-10-24 · The block-list grammar (#135)) — never a second grammar. Invalid lines are kept, marked
 *   (by line number) and counted, and never counted as blocked; the blocked count is `parseBlockList`'s
 *   `blockedCount`, the number the `safetyState` event reports (phase doc 0.6's F23 note).
 * - Nothing here logs; the page shows the lines to the human only.
 */
import { parseBlockList } from "./safety-match.js";
import { countRules, fitsCaps, rulesOf, type DnrCaps } from "./safety-dnr.js";
import { parseUploadFolders, uploadPathRefusalClass, type ParsedUploadPath } from "./upload-paths.js";
import type { StoredSafety } from "./safety-state.js";

/** The one reason shown for an invalid line: the grammar's shapes, not a second parser's diagnosis. */
export const INVALID_LINE_REASON =
  "not a site pattern: write a host (bank.example), *.host for its subdomains only, host:port, an IP address, or paste an http(s) address";

export interface LineMark {
  /** 1-based, as the human counts the textarea's lines. */
  line: number;
  text: string;
  status: "valid" | "invalid" | "ignored";
  reason?: string;
}

export interface BlockListAnalysis {
  lines: LineMark[];
  invalid: LineMark[];
  /** Valid patterns only (F23). */
  blockedCount: number;
  invalidCount: number;
  summary: string;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function analyzeBlockList(text: string): BlockListAnalysis {
  const parsed = parseBlockList(text);
  const lines: LineMark[] = parsed.lines.map((l, i) =>
    l.kind === "invalid"
      ? { line: i + 1, text: l.text, status: "invalid", reason: INVALID_LINE_REASON }
      : { line: i + 1, text: l.text, status: l.kind },
  );
  const invalid = lines.filter((l) => l.status === "invalid");
  const blockedCount = parsed.blockedCount;
  let summary = `${plural(blockedCount, "blocked site", "blocked sites")}.`;
  if (invalid.length > 0) {
    summary += ` ${plural(invalid.length, "invalid line is", "invalid lines are")} not counted (marked below).`;
  }
  return { lines, invalid, blockedCount, invalidCount: invalid.length, summary };
}

/** The status line of the page's safety section. */
export function optionsStatus(state: StoredSafety | "unreadable"): string {
  if (state === "unreadable") return "The safety state cannot be read, so agents are refused.";
  if (!state.armed) return "Bridge OFF: agents are refused.";
  if (!state.evaluate) return "Bridge armed; JavaScript (browser_evaluate) off.";
  return "Bridge armed.";
}

/**
 * The textarea after the stored list changed (another options tab, or a save): an untouched textarea takes
 * the stored text; unsaved edits are kept, and a conflict is flagged when the stored text moved under them.
 * `loaded` is the stored text the textarea was last filled from (or saved as).
 */
export function blockListAfterStoredChange(s: { current: string; loaded: string; stored: string }): {
  text: string;
  loaded: string;
  conflict: boolean;
} {
  if (s.current === s.loaded || s.current === s.stored) return { text: s.stored, loaded: s.stored, conflict: false };
  return { text: s.current, loaded: s.stored, conflict: s.stored !== s.loaded };
}

// --- The rules' caps (Step 11b S3b; #296, #300) ----------------------------------------------------------------
// While the list is non-empty, a bridge navigation or download blocks redirects by Chrome session rules built from it
// (`safety-dnr.ts`). Past Chrome's caps, or with a regex Chrome rejects, those calls are refused (fail closed, #292).
// The warnings name no pattern; only line numbers.

/** Chrome's caps as measured on Chrome 156 (Stage0.md §4); the page passes the live ones when it can read them. */
export const MEASURED_DNR_CAPS: DnrCaps = Object.freeze({ sessionRules: 5000, regexRules: 1000 });
/** Regexes up to this length fit Chrome's per-regex cap (S1's budget, #300); a longer one may be rejected. */
export const MAX_SAFE_REGEX_CHARS = 119;

export const BLOCKLIST_CAPS_WARNING =
  "This list needs more of Chrome's blocking rules than Chrome allows, so while it is saved every agent navigation and download is refused. Shorten the list.";

export function blockListLongHostWarning(lines: number[]): string {
  const which = lines.length === 1 ? `Line ${lines[0]}` : `Lines ${lines.join(", ")}`;
  return `${which}: a very long site name with a port or *. may make a rule Chrome rejects; while it is saved, agent navigations and downloads may be refused.`;
}

/** The caps warnings for a block-list text (empty: none). */
export function blockListRuleWarnings(text: string, caps: DnrCaps = MEASURED_DNR_CAPS): string[] {
  const list = parseBlockList(text);
  const out: string[] = [];
  if (!fitsCaps([countRules(list)], caps)) out.push(BLOCKLIST_CAPS_WARNING);
  const long: number[] = [];
  list.lines.forEach((l, i) => {
    if (l.kind !== "valid") return;
    const one = { lines: [l], patterns: [l.pattern], blockedCount: 1 };
    const rules = rulesOf(one, { kind: "tab", tabId: 0 }, 1);
    if (rules.some((r) => (r.condition.regexFilter ?? "").length > MAX_SAFE_REGEX_CHARS)) long.push(i + 1);
  });
  if (long.length > 0) out.push(blockListLongHostWarning(long));
  return out;
}

export type SafetyControl = "armed" | "evaluate" | "blockList" | "uploadFolders";

/** A failed `storage.local` write, by control. Never carries a value. */
export function writeFailedMessage(control: SafetyControl): string {
  switch (control) {
    case "armed":
      return "Could not save the bridge switch (storage write failed). Showing the stored state.";
    case "evaluate":
      return "Could not save the JavaScript switch (storage write failed). Showing the stored state.";
    case "blockList":
      return "Could not save the block list (storage write failed). Your text is kept; try Save again.";
    case "uploadFolders":
      return "Could not save the upload folders (storage write failed). Your text is kept; try Save again.";
  }
}

// --- Upload folders (Step 11 S3) -------------------------------------------------------------------------------
// The "Upload folders" box (phase doc 0.4; decisions.md · 2026-10-25 · Stage 0: who the folder rule protects
// against, and the broad-folder warning (#250); · S2: the `paths` cap, the exact messages, and the folder-line rules
// (#257)). Validity is S2's own parser (`parseUploadFolders`), never a second grammar; this model only words the
// reason for an invalid line and the warnings. Nothing here logs; the page shows the lines to the human only.

/** The standing warning above the box (#250). */
export const UPLOAD_FOLDERS_WARNING =
  "An agent may upload any file inside these folders to any site it can open. Allow only folders that hold files you mean to share. A home folder, or a folder that holds home folders, is refused; never allow a folder that holds bridge.token or a .ssh folder. An agent that can also run programs on this computer can put any file into an allowed folder.";

export const UPLOAD_ROOT_REASON = "a whole drive or the filesystem root is never allowed";
export const UPLOAD_PAD_REASON = "starts or ends with a space: a folder is taken exactly as typed";
export const UPLOAD_RELATIVE_REASON = "not an absolute folder path: write it from the drive letter (C:\\…) or from / (/home/…)";
export const UPLOAD_INVALID_REASON =
  "not an allowed folder path: no network (\\\\server) or device paths, no . or .. parts, no doubled separators, no backslash in a / path, no <>\"|?* characters or reserved names (CON, NUL, …)";

/**
 * Step 11b S0F-a (#288 3b): a home folder, or a folder that holds home folders, is an invalid line (it was a warning,
 * #250). Which folders count is `isHomeFolder` (`upload-paths.ts`), shared with the gate's matcher. Names no path.
 */
export const UPLOAD_HOME_REASON =
  "a home folder, or a folder that holds home folders, is never allowed: every file in it (keys, tokens, documents) could be uploaded. Allow a folder inside it instead";
export const UPLOAD_SSH_WARNING = "a .ssh folder, or a folder inside one: it holds private keys";

function underSsh(f: ParsedUploadPath): boolean {
  return f.segments.some((seg) => (f.style === "win" ? seg.toLowerCase() : seg) === ".ssh");
}

const ROOT_LINE = /^(?:[A-Za-z]:[\\/]?|\/+)$/;

function invalidReason(text: string): string {
  if (ROOT_LINE.test(text)) return UPLOAD_ROOT_REASON;
  if (/^\s|\s$/u.test(text)) return UPLOAD_PAD_REASON;
  // The same one trailing separator `parseUploadFolderLine` allows, only to name the reason.
  const trailing = text.endsWith("/") || (text.endsWith("\\") && /^[A-Za-z]:/.test(text));
  const cls = uploadPathRefusalClass(trailing ? text.slice(0, -1) : text);
  return cls === "RELATIVE" ? UPLOAD_RELATIVE_REASON : UPLOAD_INVALID_REASON;
}

export interface UploadFolderMark extends LineMark {
  /** Valid lines only: why this folder is risky (#250). A warning never refuses the line. */
  warning?: string;
}

export interface UploadFoldersAnalysis {
  lines: UploadFolderMark[];
  invalid: UploadFolderMark[];
  warned: UploadFolderMark[];
  /** Valid folders only. */
  folderCount: number;
  invalidCount: number;
  summary: string;
}

export function analyzeUploadFolders(text: string): UploadFoldersAnalysis {
  const parsed = parseUploadFolders(text);
  const lines: UploadFolderMark[] = parsed.lines.map((l, i) => {
    if (l.kind === "invalid") {
      const reason = l.home ? UPLOAD_HOME_REASON : invalidReason(l.text);
      return { line: i + 1, text: l.text, status: "invalid", reason };
    }
    if (l.kind === "ignored") return { line: i + 1, text: l.text, status: "ignored" };
    const warning = underSsh(l.folder) ? UPLOAD_SSH_WARNING : undefined;
    return warning ? { line: i + 1, text: l.text, status: "valid", warning } : { line: i + 1, text: l.text, status: "valid" };
  });
  const invalid = lines.filter((l) => l.status === "invalid");
  const warned = lines.filter((l) => l.warning !== undefined);
  const folderCount = parsed.count;
  let summary =
    folderCount === 0 ? "No upload folder: every upload is refused." : `${plural(folderCount, "upload folder", "upload folders")}.`;
  if (invalid.length > 0) {
    summary += ` ${plural(invalid.length, "invalid line is", "invalid lines are")} not used (marked below).`;
  }
  return { lines, invalid, warned, folderCount, invalidCount: invalid.length, summary };
}

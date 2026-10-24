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

export type SafetyControl = "armed" | "evaluate" | "blockList";

/** A failed `storage.local` write, by control. Never carries a value. */
export function writeFailedMessage(control: SafetyControl): string {
  switch (control) {
    case "armed":
      return "Could not save the bridge switch (storage write failed). Showing the stored state.";
    case "evaluate":
      return "Could not save the JavaScript switch (storage write failed). Showing the stored state.";
    case "blockList":
      return "Could not save the block list (storage write failed). Your text is kept; try Save again.";
  }
}

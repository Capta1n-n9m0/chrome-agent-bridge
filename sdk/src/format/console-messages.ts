// Step 12 S3b (phase doc 0.5; decisions.md #323, #344): the `browser_console_messages` text, one line per entry,
// rendered from a `consoleMessages` result (oldest first, newest last). Pure; no log call. S5b (#345 (2)): the
// text is capped as `formatNetwork`'s is.
import type { ConsoleEntry } from "@bridge/shared";

/** The text when a read found nothing. */
export const NO_CONSOLE_MESSAGES = "No console messages.";

/** The cap on the whole text, `formatNetwork`'s default (S5b, #345 (2)). */
const MAX_TEXT_CHARS = 20_000;

export interface FormatConsoleOptions {
  /** Cap on the whole text (the marker line excluded), as `formatNetwork`'s. Default 20 000. */
  maxChars?: number;
}

/**
 * One line per entry: `<ISO time, UTC> <level> [uncaught] <text>`. A line break inside `text` prints as `\n`, so
 * each entry stays one line. No entries → `NO_CONSOLE_MESSAGES`. Whole lines are kept, oldest first, while the text
 * stays within `maxChars`; a cut ends with `… [truncated: <n> more lines, the newest — narrow with level/limit]`.
 */
export function formatConsole(entries: readonly ConsoleEntry[], opts: FormatConsoleOptions = {}): string {
  if (entries.length === 0) return NO_CONSOLE_MESSAGES;
  const maxChars = opts.maxChars ?? MAX_TEXT_CHARS;
  const rows = entries.map((e) => {
    const time = Number.isFinite(e.ts) ? new Date(e.ts).toISOString() : "-";
    const kind = e.kind === "exception" ? " uncaught" : "";
    return `${time} ${e.level}${kind} ${e.text.replace(/\r\n|\r|\n/g, "\\n")}`;
  });
  const kept: string[] = [];
  let used = 0;
  for (const row of rows) {
    const add = (kept.length === 0 ? 0 : 1) + row.length;
    if (used + add > maxChars) break;
    kept.push(row);
    used += add;
  }
  if (kept.length === rows.length) return kept.join("\n");
  const marker = `… [truncated: ${rows.length - kept.length} more lines, the newest — narrow with level/limit]`;
  return kept.length === 0 ? marker : `${kept.join("\n")}\n${marker}`;
}

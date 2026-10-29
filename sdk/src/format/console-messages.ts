// Step 12 S3b (phase doc 0.5; decisions.md #323, #344): the `browser_console_messages` text, one line per entry,
// rendered from a `consoleMessages` result (oldest first, newest last). Pure; no log call. S5b (#345 (2)): the
// text is capped in the size of `formatNetwork`'s. Step 13 S3b (#374 item 6, #379, #388): the cap keeps the newest
// lines and the text opens with one marker line counting the lines cut.
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
 * each entry stays one line. No entries → `NO_CONSOLE_MESSAGES`. Whole lines are kept from the newest back while the
 * text stays within `maxChars` (stopping at the first line that does not fit, so the kept lines are the newest
 * contiguous block), printed oldest first. A cut opens with one marker line outside the cap:
 * `… [truncated: <n> older lines cut — narrow with level/limit]`, or, when not even the newest line fits,
 * `… [truncated: <n> lines cut, none fits — narrow with level/limit]` alone; `<n>` is the number of lines cut.
 */
export function formatConsole(entries: readonly ConsoleEntry[], opts: FormatConsoleOptions = {}): string {
  if (entries.length === 0) return NO_CONSOLE_MESSAGES;
  const maxChars = opts.maxChars ?? MAX_TEXT_CHARS;
  const rows = entries.map((e) => {
    const time = Number.isFinite(e.ts) ? new Date(e.ts).toISOString() : "-";
    const kind = e.kind === "exception" ? " uncaught" : "";
    return `${time} ${e.level}${kind} ${e.text.replace(/\r\n|\r|\n/g, "\\n")}`;
  });
  let start = rows.length;
  let used = 0;
  while (start > 0) {
    const add = (start === rows.length ? 0 : 1) + rows[start - 1]!.length;
    if (used + add > maxChars) break;
    start -= 1;
    used += add;
  }
  if (start === 0) return rows.join("\n");
  if (start === rows.length) return `… [truncated: ${rows.length} lines cut, none fits — narrow with level/limit]`;
  return [`… [truncated: ${start} older lines cut — narrow with level/limit]`, ...rows.slice(start)].join("\n");
}

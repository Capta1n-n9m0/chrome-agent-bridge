// Step 12 S3b (phase doc 0.5; decisions.md #323, #344): the `browser_console_messages` text, one line per entry,
// rendered from a `consoleMessages` result (oldest first, newest last). Pure; no log call.
import type { ConsoleEntry } from "@bridge/shared";

/** The text when a read found nothing. */
export const NO_CONSOLE_MESSAGES = "No console messages.";

/**
 * One line per entry: `<ISO time, UTC> <level> [uncaught] <text>`. A line break inside `text` prints as `\n`, so
 * each entry stays one line. No entries → `NO_CONSOLE_MESSAGES`.
 */
export function formatConsole(entries: readonly ConsoleEntry[]): string {
  if (entries.length === 0) return NO_CONSOLE_MESSAGES;
  return entries
    .map((e) => {
      const time = Number.isFinite(e.ts) ? new Date(e.ts).toISOString() : "-";
      const kind = e.kind === "exception" ? " uncaught" : "";
      return `${time} ${e.level}${kind} ${e.text.replace(/\r\n|\r|\n/g, "\\n")}`;
    })
    .join("\n");
}

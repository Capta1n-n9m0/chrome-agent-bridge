// Step 12 S5b (decisions.md #345 (2)): `formatConsole`'s text is capped in the size of `formatNetwork`'s (default
// 20 000). Step 13 S3b (#374 item 6, #379, #388): whole lines are kept from the newest back while the text fits (a
// contiguous newest block), printed oldest first, and the text opens with one marker line counting the lines cut.
// Text under the cap is unchanged.
import { describe, it, expect } from "vitest";
import type { ConsoleEntry } from "@bridge/shared";
import { formatConsole } from "../src/format/index.js";

const T = Date.UTC(2026, 9, 27, 10, 0, 0, 0);
const entry = (i: number, len: number): ConsoleEntry => ({ level: "info", text: `${i}:`.padEnd(len, "x"), ts: T + i, kind: "console" });
const OLDER = (n: number): string => `… [truncated: ${n} older lines cut — narrow with level/limit]`;
const NONE_FITS = (n: number): string => `… [truncated: ${n} lines cut, none fits — narrow with level/limit]`;
const MARKER = /^… \[truncated: (\d+) (?:older lines cut|lines cut, none fits) — narrow with level\/limit\]$/;

/** Splits a capped text into its first line (the marker) and the kept lines. */
const split = (out: string): { marker: string; kept: string[] } => {
  const [marker, ...kept] = out.split("\n");
  return { marker: marker!, kept };
};

describe("formatConsole's cap (newest kept, marker first)", () => {
  it("200 entries of 2000 characters: the marker is the first line, the kept lines are the newest, oldest first, within 20 000", () => {
    const entries = Array.from({ length: 200 }, (_, i) => entry(i, 2000));
    const { marker, kept } = split(formatConsole(entries));
    const m = MARKER.exec(marker);
    expect(m).not.toBeNull();
    expect(kept.join("\n").length).toBeLessThanOrEqual(20_000);
    expect(kept.length + Number(m![1])).toBe(200);
    expect(marker).toBe(OLDER(200 - kept.length));
    expect(kept).toEqual(formatConsole(entries.slice(200 - kept.length)).split("\n"));
    expect(kept[kept.length - 1]).toContain(" info 199:");
  });

  it("text under the cap is unchanged; a line that fits exactly is kept, the next older one is cut", () => {
    const entries = [entry(0, 10), entry(1, 10), entry(2, 10)];
    const lines = formatConsole(entries).split("\n");
    expect(lines).toHaveLength(3);
    expect(formatConsole(entries)).not.toContain("truncated");
    expect(formatConsole(entries, { maxChars: lines.join("\n").length })).toBe(lines.join("\n"));
    const exact = lines[1]!.length + 1 + lines[2]!.length;
    expect(formatConsole(entries, { maxChars: exact })).toBe(`${OLDER(1)}\n${lines[1]}\n${lines[2]}`);
    expect(formatConsole(entries, { maxChars: exact - 1 })).toBe(`${OLDER(2)}\n${lines[2]}`);
  });

  it("the newest line is always kept when it fits, even when an older line is shorter", () => {
    const entries = [entry(0, 5), entry(1, 5), entry(2, 40)];
    const newest = formatConsole([entries[2]!]);
    expect(formatConsole(entries, { maxChars: newest.length })).toBe(`${OLDER(2)}\n${newest}`);
  });

  it("the kept block is contiguous: a long line stops the walk, no older short line is kept past it", () => {
    const entries = [entry(0, 5), entry(1, 60), entry(2, 5)];
    const lines = formatConsole(entries).split("\n");
    const out = formatConsole(entries, { maxChars: lines[0]!.length + 1 + lines[2]!.length });
    expect(out).toBe(`${OLDER(2)}\n${lines[2]}`);
  });

  it("the default is exactly 20 000: a joined text of 20 000 is kept whole, 20 001 is cut to the newest line", () => {
    const whole = [entry(0, 9970), entry(1, 9969)]; // two 30-character prefixes + 9970 + 9969 + one "\n" = 20 000
    expect(formatConsole(whole)).toHaveLength(20_000);
    const cut = [entry(0, 9970), entry(1, 9970)];
    expect(formatConsole(cut)).toBe(`${OLDER(1)}\n${formatConsole([cut[1]!])}`);
  });

  it("when no line fits, the marker alone counts every line and does not call them older", () => {
    const out = formatConsole([entry(0, 50), entry(1, 50)], { maxChars: 10 });
    expect(out).toBe(NONE_FITS(2));
    expect(out).not.toContain("older");
    expect(formatConsole([entry(0, 50)], { maxChars: 10 })).toBe(NONE_FITS(1));
  });
});

// Step 12 S5b (decisions.md #345 (2)): `formatConsole`'s text is capped in the form and size of `formatNetwork`'s:
// whole lines are kept while the text stays within `maxChars` (default 20 000), and a cut ends with one marker line
// saying how many lines were left out and how to narrow. Text under the cap is unchanged.
import { describe, it, expect } from "vitest";
import type { ConsoleEntry } from "@bridge/shared";
import { formatConsole } from "../src/format/index.js";

const T = Date.UTC(2026, 9, 27, 10, 0, 0, 0);
const entry = (i: number, len: number): ConsoleEntry => ({ level: "info", text: `${i}:`.padEnd(len, "x"), ts: T + i, kind: "console" });
const MARKER = /\n… \[truncated: (\d+) more lines, the newest — narrow with level\/limit\]$/;

describe("formatConsole's cap", () => {
  it("200 entries of 2000 characters stay within 20 000 characters plus one marker line naming the lines left out", () => {
    const entries = Array.from({ length: 200 }, (_, i) => entry(i, 2000));
    const out = formatConsole(entries);
    const m = MARKER.exec(out);
    expect(m).not.toBeNull();
    const body = out.slice(0, m!.index);
    expect(body.length).toBeLessThanOrEqual(20_000);
    const kept = body.split("\n");
    expect(kept.length + Number(m![1])).toBe(200);
    expect(kept).toEqual(formatConsole(entries.slice(0, kept.length)).split("\n"));
    expect(out.length).toBeLessThan(20_100);
  });

  it("text under the cap is unchanged; maxChars is honoured: a line that fits exactly is kept, the next one is cut", () => {
    const entries = [entry(0, 10), entry(1, 10), entry(2, 10)];
    expect(formatConsole(entries)).not.toMatch(MARKER);
    const lines = formatConsole(entries).split("\n");
    expect(lines).toHaveLength(3);
    const exact = lines[0]!.length + 1 + lines[1]!.length;
    expect(formatConsole(entries, { maxChars: exact })).toBe(`${lines[0]}\n${lines[1]}\n… [truncated: 1 more lines, the newest — narrow with level/limit]`);
    expect(formatConsole(entries, { maxChars: exact - 1 })).toBe(`${lines[0]}\n… [truncated: 2 more lines, the newest — narrow with level/limit]`);
  });

  it("the default is exactly 20 000: a joined text of 20 000 is kept whole, 20 001 is cut (S5b fixer, F1)", () => {
    const whole = [entry(0, 9970), entry(1, 9969)]; // two 30-character prefixes + 9970 + 9969 + one "\n" = 20 000
    expect(formatConsole(whole)).toHaveLength(20_000);
    expect(formatConsole([entry(0, 9970), entry(1, 9970)])).toMatch(/\n… \[truncated: 1 more lines,/);
  });

  it("a first line longer than maxChars leaves only the marker", () => {
    expect(formatConsole([entry(0, 50)], { maxChars: 10 })).toBe("… [truncated: 1 more lines, the newest — narrow with level/limit]");
  });
});

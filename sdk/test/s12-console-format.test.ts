// Step 12 S3b (phase doc 0.5; decisions.md #323, #344): `formatConsole` prints one line per entry, oldest first as
// given; it is on the `@bridge/sdk/format` subpath, not the main surface (the eight values stay eight).
import { describe, it, expect } from "vitest";
import type { ConsoleEntry } from "@bridge/shared";
import { formatConsole, NO_CONSOLE_MESSAGES } from "../src/format/index.js";

const T = Date.UTC(2026, 9, 27, 10, 0, 0, 123);

describe("formatConsole", () => {
  it("one line per entry: ISO time (UTC), level, `uncaught` for an exception, text", () => {
    const entries: ConsoleEntry[] = [
      { level: "info", text: "hello", ts: T, kind: "console" },
      { level: "error", text: "Uncaught Error: boom", ts: T + 1000, kind: "exception" },
      { level: "warning", text: "careful", ts: T + 2000, kind: "console" },
    ];
    expect(formatConsole(entries)).toBe(
      [
        "2026-10-27T10:00:00.123Z info hello",
        "2026-10-27T10:00:01.123Z error uncaught Uncaught Error: boom",
        "2026-10-27T10:00:02.123Z warning careful",
      ].join("\n"),
    );
  });

  it("a line break inside a text prints as \\n, so an entry stays one line", () => {
    const out = formatConsole([{ level: "debug", text: "a\nb\r\nc\rd", ts: T, kind: "console" }]);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).toBe("2026-10-27T10:00:00.123Z debug a\\nb\\nc\\nd");
  });

  it("no entries → the fixed line; a non-finite ts prints `-`", () => {
    expect(formatConsole([])).toBe(NO_CONSOLE_MESSAGES);
    expect(NO_CONSOLE_MESSAGES).toBe("No console messages.");
    expect(formatConsole([{ level: "info", text: "x", ts: Number.NaN, kind: "console" }])).toBe("- info x");
  });

  it("the main surface keeps exactly eight values (formatConsole is on the subpath only)", async () => {
    expect(typeof formatConsole).toBe("function");
    const main = await import("../src/index.js");
    expect(Object.keys(main)).toHaveLength(8);
    expect("formatConsole" in main).toBe(false);
  });
});

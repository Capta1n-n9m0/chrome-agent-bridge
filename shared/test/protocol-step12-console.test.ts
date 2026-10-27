/**
 * Step 12 S3a (phase doc 0.5 with its Stage 0 note; decisions.md #323, #333, #334): `consoleMessages`' params guard
 * and its caps. Fixed refusal texts, never a part of the value.
 */
import { describe, it, expect } from "vitest";
import { checkConsoleMessagesParams, CONSOLE_ENTRIES_MAX, CONSOLE_LEVELS, CONSOLE_TEXT_MAX } from "../src/protocol.js";

describe("checkConsoleMessagesParams", () => {
  it("the caps and the levels", () => {
    expect(CONSOLE_TEXT_MAX).toBe(2000);
    expect(CONSOLE_ENTRIES_MAX).toBe(200);
    expect([...CONSOLE_LEVELS]).toEqual(["error", "warning", "info", "debug"]);
  });

  it("absent level and limit: every level, the entry cap", () => {
    expect(checkConsoleMessagesParams({ tabId: 3 })).toEqual({ ok: true, limit: 200 });
  });

  it("each level and an in-range limit pass", () => {
    for (const level of CONSOLE_LEVELS) expect(checkConsoleMessagesParams({ level, limit: 1 })).toEqual({ ok: true, level, limit: 1 });
    expect(checkConsoleMessagesParams({ limit: 200 })).toEqual({ ok: true, limit: 200 });
  });

  it("a bad level is refused with a fixed text", () => {
    for (const level of ["log", "ERROR", "", null, 3, { x: "SENTINEL-CON" }]) {
      const r = checkConsoleMessagesParams({ level });
      expect(r).toEqual({ ok: false, message: 'consoleMessages: level must be one of "error", "warning", "info", "debug"' });
    }
  });

  it("a bad limit is refused with a fixed text", () => {
    for (const limit of [0, 201, 1.5, -1, "5", null, NaN, Infinity]) {
      const r = checkConsoleMessagesParams({ limit });
      expect(r).toEqual({ ok: false, message: "consoleMessages: limit must be an integer from 1 to 200" });
    }
  });
});

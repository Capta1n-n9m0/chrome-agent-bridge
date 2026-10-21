import { describe, it, expect } from "vitest";
import {
  ErrorCodes,
  DAEMON_ERROR_CODES,
  EXTENSION_ERROR_CODES,
  isErrorCode,
} from "../src/codes.js";

// Spec §10 of docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md — exactly these 22.
const SPEC_DAEMON = [
  "NOT_CONNECTED", "TIMEOUT", "UNKNOWN_METHOD", "BAD_PARAMS", "TAB_HELD", "TAB_GONE",
  "TAB_UNKNOWN", "LOCK_TIMEOUT", "VERSION",
];
const SPEC_EXTENSION = [
  "REF_STALE", "LOCATOR_NOT_FOUND", "LOCATOR_AMBIGUOUS", "OFFSCREEN", "RESTRICTED_URL",
  "DEBUGGER_ATTACH", "DEBUGGER_CANCELLED", "DEBUGGER_DEVTOOLS", "PAGE_ERROR", "NAV_FAILED",
  "DOWNLOAD_HTTP", "WINDOW_MINIMIZED", "INTERNAL",
];

describe("error codes (spec §10)", () => {
  it("groups exactly the 9 daemon and 13 extension codes", () => {
    expect([...DAEMON_ERROR_CODES].sort()).toEqual([...SPEC_DAEMON].sort());
    expect([...EXTENSION_ERROR_CODES].sort()).toEqual([...SPEC_EXTENSION].sort());
  });
  it("ErrorCodes holds exactly the 22 spec codes, each mapped to itself", () => {
    const keys = Object.keys(ErrorCodes).sort();
    expect(keys).toEqual([...SPEC_DAEMON, ...SPEC_EXTENSION].sort());
    expect(keys).toHaveLength(22);
    for (const [k, v] of Object.entries(ErrorCodes)) expect(v).toBe(k);
  });
  it("isErrorCode accepts a spec code and rejects anything else", () => {
    expect(isErrorCode("TAB_HELD")).toBe(true);
    expect(isErrorCode("INTERNAL")).toBe(true);
    expect(isErrorCode("NOPE")).toBe(false);
    expect(isErrorCode(42)).toBe(false);
    expect(isErrorCode("toString")).toBe(false);
  });
});

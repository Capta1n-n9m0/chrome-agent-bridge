import { describe, it, expect } from "vitest";
import {
  ErrorCodes,
  DAEMON_ERROR_CODES,
  EXTENSION_ERROR_CODES,
  SDK_ERROR_CODES,
  isErrorCode,
} from "../src/codes.js";

// Spec §10 of docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md — exactly these 23: 22 on the wire,
// plus `NO_CURSOR`, raised by the SDK alone (decisions.md · 2026-10-23 · `NO_CURSOR` enters
// `shared/src/codes.ts` as the 23rd code (#76)).
const SPEC_DAEMON = [
  "NOT_CONNECTED", "TIMEOUT", "UNKNOWN_METHOD", "BAD_PARAMS", "TAB_HELD", "TAB_GONE",
  "TAB_UNKNOWN", "LOCK_TIMEOUT", "VERSION",
];
const SPEC_EXTENSION = [
  "REF_STALE", "LOCATOR_NOT_FOUND", "LOCATOR_AMBIGUOUS", "OFFSCREEN", "RESTRICTED_URL",
  "DEBUGGER_ATTACH", "DEBUGGER_CANCELLED", "DEBUGGER_DEVTOOLS", "PAGE_ERROR", "NAV_FAILED",
  "DOWNLOAD_HTTP", "WINDOW_MINIMIZED", "INTERNAL",
];
const SPEC_SDK = ["NO_CURSOR"];

describe("error codes (spec §10)", () => {
  it("groups exactly the 9 daemon, 13 extension and 1 SDK codes", () => {
    expect([...DAEMON_ERROR_CODES].sort()).toEqual([...SPEC_DAEMON].sort());
    expect([...EXTENSION_ERROR_CODES].sort()).toEqual([...SPEC_EXTENSION].sort());
    expect([...SDK_ERROR_CODES]).toEqual(SPEC_SDK);
  });
  it("ErrorCodes holds exactly the 23 spec codes, each mapped to itself", () => {
    const keys = Object.keys(ErrorCodes).sort();
    expect(keys).toEqual([...SPEC_DAEMON, ...SPEC_EXTENSION, ...SPEC_SDK].sort());
    expect(keys).toHaveLength(23);
    for (const [k, v] of Object.entries(ErrorCodes)) expect(v).toBe(k);
  });
  it("isErrorCode accepts a spec code and rejects anything else", () => {
    expect(isErrorCode("TAB_HELD")).toBe(true);
    expect(isErrorCode("INTERNAL")).toBe(true);
    expect(isErrorCode("NO_CURSOR")).toBe(true);
    expect(isErrorCode("NOPE")).toBe(false);
    expect(isErrorCode(42)).toBe(false);
    expect(isErrorCode("toString")).toBe(false);
  });
});

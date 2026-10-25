import { describe, it, expect } from "vitest";
import {
  ErrorCodes,
  DAEMON_ERROR_CODES,
  EXTENSION_ERROR_CODES,
  SDK_ERROR_CODES,
  isErrorCode,
} from "../src/codes.js";

// Spec §10 of docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md — exactly these 25: 24 on the wire,
// plus `NO_CURSOR`, raised by the SDK alone (decisions.md · 2026-10-23 · `NO_CURSOR` enters
// `shared/src/codes.ts` as the 23rd code (#76)).
// Count 23 → 25 (Step 9 S0, 2026-10-24): `DISARMED` and `DOMAIN_BLOCKED` join the extension codes, per
// spec §10's dated Step 9 note and decisions.md · 2026-10-24 · The JavaScript switch reuses `DISARMED`
// with a scope (#133) and · The safety state travels as two events and a `daemon.status` field (#132).
// This is a count change, not an edited error text (Stage 0 F32): every earlier code is still listed.
// Count 25 → 26 (Step 10 S4b, 2026-10-25): `JS_DISABLED` joins the extension codes, per spec §10's dated
// Step 10 note and decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes
// (#202), which changed #133. Again a count change by that ruling: every earlier code is still listed.
const SPEC_DAEMON = [
  "NOT_CONNECTED", "TIMEOUT", "UNKNOWN_METHOD", "BAD_PARAMS", "TAB_HELD", "TAB_GONE",
  "TAB_UNKNOWN", "LOCK_TIMEOUT", "VERSION",
];
const SPEC_EXTENSION = [
  "REF_STALE", "LOCATOR_NOT_FOUND", "LOCATOR_AMBIGUOUS", "OFFSCREEN", "RESTRICTED_URL",
  "DEBUGGER_ATTACH", "DEBUGGER_CANCELLED", "DEBUGGER_DEVTOOLS", "PAGE_ERROR", "NAV_FAILED",
  "DOWNLOAD_HTTP", "WINDOW_MINIMIZED", "INTERNAL", "DISARMED", "DOMAIN_BLOCKED", "JS_DISABLED",
];
const SPEC_SDK = ["NO_CURSOR"];

describe("error codes (spec §10)", () => {
  it("groups exactly the 9 daemon, 16 extension and 1 SDK codes", () => {
    expect([...DAEMON_ERROR_CODES].sort()).toEqual([...SPEC_DAEMON].sort());
    expect([...EXTENSION_ERROR_CODES].sort()).toEqual([...SPEC_EXTENSION].sort());
    expect([...SDK_ERROR_CODES]).toEqual(SPEC_SDK);
  });
  it("ErrorCodes holds exactly the 26 spec codes, each mapped to itself", () => {
    const keys = Object.keys(ErrorCodes).sort();
    expect(keys).toEqual([...SPEC_DAEMON, ...SPEC_EXTENSION, ...SPEC_SDK].sort());
    expect(keys).toHaveLength(26);
    for (const [k, v] of Object.entries(ErrorCodes)) expect(v).toBe(k);
  });
  it("Step 9: DISARMED and DOMAIN_BLOCKED are extension codes on the wire (#132, #133)", () => {
    expect(EXTENSION_ERROR_CODES).toContain("DISARMED");
    expect(EXTENSION_ERROR_CODES).toContain("DOMAIN_BLOCKED");
    expect(EXTENSION_ERROR_CODES).toHaveLength(16); // 15 at Step 9; JS_DISABLED joined in Step 10 S4b (#202)
    expect(isErrorCode("DISARMED")).toBe(true);
    expect(isErrorCode("DOMAIN_BLOCKED")).toBe(true);
    expect((ErrorCodes as Record<string, string>).DISARMED).toBe("DISARMED");
    expect((ErrorCodes as Record<string, string>).DOMAIN_BLOCKED).toBe("DOMAIN_BLOCKED");
    expect(SDK_ERROR_CODES).not.toContain("DISARMED");
    expect(DAEMON_ERROR_CODES).not.toContain("DOMAIN_BLOCKED" as never);
  });
  it("S4b.1 (Step 10, #202): JS_DISABLED is an extension code on the wire; 26 codes, 25 on the wire", () => {
    expect(EXTENSION_ERROR_CODES).toContain("JS_DISABLED");
    expect(DAEMON_ERROR_CODES).not.toContain("JS_DISABLED" as never);
    expect(SDK_ERROR_CODES).not.toContain("JS_DISABLED" as never);
    expect(isErrorCode("JS_DISABLED")).toBe(true);
    expect((ErrorCodes as Record<string, string>).JS_DISABLED).toBe("JS_DISABLED");
    expect(DAEMON_ERROR_CODES.length + EXTENSION_ERROR_CODES.length).toBe(25);
    expect(DAEMON_ERROR_CODES.length + EXTENSION_ERROR_CODES.length + SDK_ERROR_CODES.length).toBe(26);
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

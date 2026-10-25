import { describe, it, expect } from "vitest";
import { DAEMON_METHODS, FREE_METHODS, NETWORK_METHODS, REMOVED_METHODS, TAB_METHODS } from "../src/methods.js";

/**
 * Step 9 exit check S3.3, the daemon's half (decisions.md · 2026-10-24 · Stricter exit checks for Step 9
 * (#141); · Where S2's and S1.1's checks close after the split (#147)): no daemon method name is added
 * beyond #132's two events. The lists below are Step 8's, copied from `git show a3ec4f5:daemon/src/methods.ts`
 * — any added, removed or renamed method fails here, whatever its name.
 */
const STEP8 = {
  TAB_METHODS: [
    "navigate",
    "snapshot",
    "screenshot",
    "click",
    "type",
    "scroll",
    "hover",
    "selectOption",
    "pressKey",
    "back",
    "forward",
    "waitFor",
    "evaluate",
    "locate",
    "networkClear",
    "focusTab",
  ],
  FREE_METHODS: ["networkRequests", "downloadStart", "downloadChunk", "downloadEnd"],
  DAEMON_METHODS: ["tabs.claim", "tabs.release"],
  NETWORK_METHODS: ["networkRequests", "networkClear"],
  REMOVED_METHODS: ["selectTab"],
};

/**
 * Step 10 S4 (2026-10-25; decisions.md #205): the three `evaluateSave*` methods added by design: tab methods, appended to Step 8's list. Step 8's lists above stay as they were; Step 10 S4's
 * additions are listed here, so any other added, removed or renamed method still fails.
 */
const STEP10_S4_TAB_METHODS = ["evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd"];

/**
 * Step 11 S2 (2026-10-25; decisions.md · 2026-10-25 · Step 11: the wire method `uploadFiles`, no visibility lock, no
 * focus (#238)): one tab method added by design, appended after Step 10 S4's; any other change still fails.
 */
const STEP11_S2_TAB_METHODS = ["uploadFiles"];

describe("S3.3 — the daemon's method tables are Step 8's", () => {
  it("each table equals Step 8's, element for element (plus Step 10 S4's three and Step 11 S2's one tab method)", () => {
    expect([...TAB_METHODS]).toEqual([...STEP8.TAB_METHODS, ...STEP10_S4_TAB_METHODS, ...STEP11_S2_TAB_METHODS]);
    expect([...FREE_METHODS]).toEqual(STEP8.FREE_METHODS);
    expect([...DAEMON_METHODS]).toEqual(STEP8.DAEMON_METHODS);
    expect([...NETWORK_METHODS]).toEqual(STEP8.NETWORK_METHODS);
    expect([...REMOVED_METHODS.keys()]).toEqual(STEP8.REMOVED_METHODS);
  });

  it("no method name in any table speaks of arming, disarming, the safety state or blocking", () => {
    const all = [...TAB_METHODS, ...FREE_METHODS, ...DAEMON_METHODS, ...NETWORK_METHODS, ...REMOVED_METHODS.keys()];
    for (const name of all) expect(name).not.toMatch(/arm|disarm|setSafety|safety|block/i);
  });
});

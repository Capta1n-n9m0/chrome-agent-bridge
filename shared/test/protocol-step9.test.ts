import { describe, it, expect } from "vitest";
import {
  isSafetyState,
  isDisarmedData,
  isHiddenReason,
  isSafetyStateEvent,
  isSafetyStatusEvent,
  isTabRemovedEvent,
  isTabCreatedEvent,
  isTabGoneEvent,
  type SafetyState,
  type SafetyScope,
  type DisarmedData,
  type HiddenReason,
  type SafetyStateParams,
  type SafetyStatusParams,
  type ExtensionEventName,
  type DaemonEventName,
  type TabRemovedParams,
  type ListTabsRow,
  type ExtensionListTabsRow,
  type DaemonStatusSafety,
} from "../src/protocol.js";

// Step 9 S0 (docs/plans/2026-10-24-step9-phase-e-safety.md, Stage S0; spec §10's Step 9 note).
// decisions.md · 2026-10-24 · The safety state travels as two events and a `daemon.status` field (#132);
// · The JavaScript switch reuses `DISARMED` with a scope (#133); · What `listTabs`, tab events and the
// daemon reveal while disarmed or for a blocked tab (#134).

const GOOD: SafetyState = { armed: true, evaluate: true, blockedCount: 0 };

/** Each required field removed, and each replaced by a value of the wrong type (null included). */
function mutations(): Array<[string, Record<string, unknown>]> {
  const out: Array<[string, Record<string, unknown>]> = [];
  for (const k of ["armed", "evaluate", "blockedCount"] as const) {
    const missing: Record<string, unknown> = { ...GOOD };
    delete missing[k];
    out.push([`missing ${k}`, missing]);
    out.push([`${k} null`, { ...GOOD, [k]: null }]);
  }
  out.push(["armed a string", { ...GOOD, armed: "true" }]);
  out.push(["armed a number", { ...GOOD, armed: 1 }]);
  out.push(["evaluate a string", { ...GOOD, evaluate: "false" }]);
  out.push(["evaluate a number", { ...GOOD, evaluate: 0 }]);
  out.push(["blockedCount a string", { ...GOOD, blockedCount: "2" }]);
  out.push(["blockedCount negative", { ...GOOD, blockedCount: -1 }]);
  out.push(["blockedCount fractional", { ...GOOD, blockedCount: 1.5 }]);
  out.push(["blockedCount NaN", { ...GOOD, blockedCount: Number.NaN }]);
  out.push(["blockedCount Infinity", { ...GOOD, blockedCount: Number.POSITIVE_INFINITY }]);
  out.push(["blockedCount a boolean", { ...GOOD, blockedCount: true }]);
  return out;
}

describe("isSafetyState (#132)", () => {
  it("accepts every armed × evaluate combination and a positive count", () => {
    for (const armed of [true, false])
      for (const evaluate of [true, false])
        for (const blockedCount of [0, 1, 37])
          expect(isSafetyState({ armed, evaluate, blockedCount })).toBe(true);
  });

  it("accepts unknown extra keys (forward-compatible, as the other guards)", () => {
    expect(isSafetyState({ ...GOOD, later: "x" })).toBe(true);
  });

  it.each(mutations())("rejects %s", (_name, v) => {
    expect(isSafetyState(v)).toBe(false);
  });

  it("rejects non-objects", () => {
    for (const v of [null, undefined, true, 0, "armed", [], [true, true, 0]]) expect(isSafetyState(v)).toBe(false);
  });
});

describe("isDisarmedData (#133)", () => {
  it("accepts both scopes, with extra keys", () => {
    expect(isDisarmedData({ scope: "all" })).toBe(true);
    expect(isDisarmedData({ scope: "evaluate" })).toBe(true);
    expect(isDisarmedData({ scope: "all", later: 1 })).toBe(true);
  });

  it("rejects a missing, null, mistyped or unknown scope, and non-objects", () => {
    for (const v of [{}, { scope: null }, { scope: 1 }, { scope: "ALL" }, { scope: "js" }, { scope: "" }, null, "all", []])
      expect(isDisarmedData(v)).toBe(false);
  });
});

describe("isHiddenReason (#134)", () => {
  it("accepts exactly the two reasons", () => {
    expect(isHiddenReason("disarmed")).toBe(true);
    expect(isHiddenReason("blocked")).toBe(true);
    for (const v of ["", "Disarmed", "hidden", null, undefined, 0, true, {}]) expect(isHiddenReason(v)).toBe(false);
  });
});

describe("safety events (#132)", () => {
  const guards = [
    ["safetyState", isSafetyStateEvent, "safetyStatus"],
    ["safetyStatus", isSafetyStatusEvent, "safetyState"],
  ] as const;

  for (const [name, guard, other] of guards) {
    describe(name, () => {
      it("accepts the exact event name with a good state", () => {
        expect(guard({ event: name, params: GOOD })).toBe(true);
        expect(guard({ event: name, params: { armed: false, evaluate: false, blockedCount: 3 } })).toBe(true);
        expect(guard({ event: name, params: { ...GOOD, later: 1 } })).toBe(true);
      });

      it.each(mutations())("rejects params with %s", (_n, p) => {
        expect(guard({ event: name, params: p })).toBe(false);
      });

      it("rejects a wrong event name, an id-carrying frame, and null or missing params", () => {
        expect(guard({ event: other, params: GOOD })).toBe(false);
        expect(guard({ event: "extensionStatus", params: GOOD })).toBe(false);
        expect(guard({ event: name.toLowerCase(), params: GOOD })).toBe(false);
        expect(guard({ id: "1", event: name, params: GOOD })).toBe(false);
        expect(guard({ event: name, params: null })).toBe(false);
        expect(guard({ event: name })).toBe(false);
        expect(guard(null)).toBe(false);
        expect(guard({ type: "hello", token: "t" })).toBe(false);
      });
    });
  }
});

describe("isTabRemovedEvent with `hidden` (#134)", () => {
  it("still accepts the Step 7 shapes", () => {
    expect(isTabRemovedEvent({ event: "tabRemoved", params: { tabId: 3 } })).toBe(true);
    expect(isTabRemovedEvent({ event: "tabRemoved", params: { tabId: 3, lastUrl: "u", lastTitle: "t" } })).toBe(true);
  });

  it("accepts a good `hidden` (with no lastUrl/lastTitle, as the extension sends it)", () => {
    expect(isTabRemovedEvent({ event: "tabRemoved", params: { tabId: 3, hidden: "disarmed" } })).toBe(true);
    expect(isTabRemovedEvent({ event: "tabRemoved", params: { tabId: 3, hidden: "blocked" } })).toBe(true);
    expect(isTabRemovedEvent({ event: "tabRemoved", params: { tabId: 3, hidden: undefined } })).toBe(true);
  });

  it("rejects a bad `hidden`", () => {
    for (const hidden of [null, "", "gone", "BLOCKED", 1, true, {}])
      expect(isTabRemovedEvent({ event: "tabRemoved", params: { tabId: 3, hidden } })).toBe(false);
  });

  it("still rejects a missing tabId and an id-carrying frame", () => {
    expect(isTabRemovedEvent({ event: "tabRemoved", params: { hidden: "blocked" } })).toBe(false);
    expect(isTabRemovedEvent({ id: "1", event: "tabRemoved", params: { tabId: 3, hidden: "blocked" } })).toBe(false);
  });

  it("tabCreated and tabGone are unchanged: url \"\" for a hidden tab, fields omitted by the daemon", () => {
    expect(isTabCreatedEvent({ event: "tabCreated", params: { tabId: 4, url: "" } })).toBe(true);
    expect(isTabGoneEvent({ event: "tabGone", params: { tab: "T4" } })).toBe(true);
  });
});

describe("Step 9 types (compile-time; npm run typecheck covers shared/test)", () => {
  it("names the new events beside the Step 7 ones", () => {
    const ext: ExtensionEventName[] = ["tabCreated", "tabRemoved", "tabReplaced", "safetyState"];
    const dmn: DaemonEventName[] = ["tabGone", "leaseGranted", "extensionStatus", "safetyStatus"];
    expect(ext).toHaveLength(4);
    expect(dmn).toHaveLength(4);
  });

  it("types the params, the scope, the hidden marker and daemon.status's safety", () => {
    const a: SafetyStateParams = GOOD;
    const b: SafetyStatusParams = a;
    const scope: SafetyScope = "evaluate";
    const data: DisarmedData = { scope };
    const reason: HiddenReason = "blocked";
    const removed: TabRemovedParams = { tabId: 1, hidden: reason };
    const unset: DaemonStatusSafety = null;
    const set: DaemonStatusSafety = b;
    expect([data.scope, removed.hidden, unset, set]).toEqual(["evaluate", "blocked", null, GOOD]);
  });

  it("types a listTabs row as it is today, and a hidden one without title/url", () => {
    const fromExtension: ExtensionListTabsRow = { id: 7, title: "t", url: "u", active: true, windowId: 1, current: true };
    const visible: ListTabsRow = { ...fromExtension, openerTabId: 6, tab: "T7", owner: "a" };
    const hidden: ListTabsRow = { id: 8, active: false, windowId: 1, tab: "T8", hidden: "disarmed" };
    expect(visible.tab).toBe("T7");
    expect(hidden.title).toBeUndefined();
    expect(hidden.url).toBeUndefined();
  });
});

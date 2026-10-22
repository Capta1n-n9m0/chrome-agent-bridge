import { describe, it, expect } from "vitest";
import { classify, takesLock, TAB_METHODS, FREE_METHODS, LEGACY_ID_METHODS, NETWORK_METHODS } from "../src/methods.js";

/** Step 7 T2 (decisions.md #39, #53): the one method table. */

describe("method table", () => {
  it("tab-carrying, lease-checked methods", () => {
    expect([...TAB_METHODS].sort()).toEqual(
      [
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
        "networkClear",
        "focusTab",
        "selectTab",
      ].sort(),
    );
    for (const m of TAB_METHODS) expect(classify(m, {})).toBe("tab");
  });

  it("closeTab is intercepted + lease-checked and only there", () => {
    expect(classify("closeTab", {})).toBe("closeTab");
    expect(TAB_METHODS.has("closeTab")).toBe(false);
    expect(FREE_METHODS.has("closeTab")).toBe(false);
  });

  it("newTab and listTabs are intercepted without a tab; the download methods and networkRequests are free", () => {
    expect(classify("newTab", {})).toBe("newTab");
    expect(classify("listTabs", {})).toBe("listTabs");
    for (const m of ["networkRequests", "downloadStart", "downloadChunk", "downloadEnd"]) {
      expect(classify(m, {})).toBe("free");
      expect(classify(m, { tab: "T1" })).toBe("free");
    }
  });

  it("daemon-handled methods", () => {
    expect(classify("daemon.status", {})).toBe("daemon");
    expect(classify("tabs.claim", {})).toBe("daemon");
    expect(classify("tabs.release", {})).toBe("daemon");
  });

  it("an unlisted method is free without tab, tab-carrying with one", () => {
    expect(classify("slow", {})).toBe("free");
    expect(classify("slow", undefined)).toBe("free");
    expect(classify("slow", { tab: "T1" })).toBe("tab");
  });

  it("lock class: default screenshot, focusTab, selectTab — never cdp or fullPage screenshots", () => {
    expect(takesLock("screenshot", {})).toBe(true);
    expect(takesLock("screenshot", undefined)).toBe(true);
    expect(takesLock("screenshot", { mode: "switch" })).toBe(true);
    expect(takesLock("screenshot", { mode: "weird" })).toBe(true);
    expect(takesLock("screenshot", { fullPage: false })).toBe(true);
    expect(takesLock("screenshot", { mode: "cdp" })).toBe(false);
    expect(takesLock("screenshot", { fullPage: true })).toBe(false);
    expect(takesLock("focusTab", {})).toBe(true);
    expect(takesLock("selectTab", {})).toBe(true);
    for (const m of ["click", "snapshot", "closeTab", "newTab", "listTabs", "networkClear", "slow"]) {
      expect(takesLock(m, {})).toBe(false);
    }
  });

  it("names the legacy-id methods and the network methods", () => {
    expect([...LEGACY_ID_METHODS].sort()).toEqual(["closeTab", "focusTab", "selectTab"]);
    expect([...NETWORK_METHODS].sort()).toEqual(["networkClear", "networkRequests"]);
  });
});

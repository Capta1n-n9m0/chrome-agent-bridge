// Step 11 S2 (S2.4; phase doc 0.6; decisions.md · 2026-10-25 · Step 11: the wire method `uploadFiles`, no
// visibility lock, no focus (#238)): `uploadFiles` is a tab method — resolved to a numeric `tabId`, lease-checked —
// and never takes the visibility lock. The lease and forwarding over real `ws` are in tabs.test.ts ("Step 11 S2.4").
import { describe, it, expect } from "vitest";
import { FREE_METHODS, NETWORK_METHODS, TAB_METHODS, classify, takesLock } from "../src/methods.js";

describe("S2.4 — uploadFiles in the daemon's method table", () => {
  it("is a tab method, not free, not a network method, and takes no lock whatever its params", () => {
    expect(TAB_METHODS.has("uploadFiles")).toBe(true);
    expect(FREE_METHODS.has("uploadFiles")).toBe(false);
    expect(NETWORK_METHODS.has("uploadFiles")).toBe(false);
    expect(classify("uploadFiles", { tab: "T1" })).toBe("tab");
    // Listed, so a call without `tab` is still a tab call (refused "tab is required" by the tab layer), not "untargeted".
    expect(classify("uploadFiles", {})).toBe("tab");
    for (const p of [undefined, {}, { tab: "T1", ref: "e1", paths: ["/a"] }, { mode: "switch" }, { fullPage: false }]) {
      expect(takesLock("uploadFiles", p)).toBe(false);
    }
  });
});

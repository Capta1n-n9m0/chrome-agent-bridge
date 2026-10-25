// Step 10 S4 (phase doc 0.4 (B), amended by Stage 0 F4; decisions.md #205): the three `evaluateSave*`
// methods carry the tab — tab methods (resolved to a numeric `tabId`, lease-checked), never the lock.
import { describe, it, expect } from "vitest";
import { FREE_METHODS, TAB_METHODS, classify, takesLock } from "../src/methods.js";

const NEW_METHODS = ["evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd"];

describe("S4 — the daemon's method table", () => {
  it("each new method is a tab method, not free, and takes no lock", () => {
    for (const m of NEW_METHODS) {
      expect(TAB_METHODS.has(m), m).toBe(true);
      expect(FREE_METHODS.has(m), m).toBe(false);
      expect(classify(m, { tab: "T1" })).toBe("tab");
      expect(classify(m, {})).toBe("tab");
      expect(takesLock(m, { tab: "T1" })).toBe(false);
    }
  });
});

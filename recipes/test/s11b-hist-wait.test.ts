// S4-live fixer 4b: the history set-up waits for each back to land before the next one.
import { describe, expect, it } from "vitest";
import { historyBackTarget, historyPlan, pollUntil17, sameUrl17 } from "../s11b-rules";

const clock = (): { now: () => number; sleep: (ms: number) => Promise<void> } => {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; } };
};

describe("pollUntil17", () => {
  it("returns true once the reader turns true, after polling", async () => {
    const k = clock();
    let n = 0;
    expect(await pollUntil17(async () => ++n >= 3, { timeoutMs: 10_000, everyMs: 100, ...k })).toBe(true);
    expect(n).toBe(3);
    expect(k.now()).toBe(200);
  });
  it("returns false at the bound, not later", async () => {
    const k = clock();
    let n = 0;
    expect(await pollUntil17(async () => (n++, false), { timeoutMs: 10_000, everyMs: 100, ...k })).toBe(false);
    expect(k.now()).toBe(10_000);
    expect(n).toBe(101);
  });
  it("lets a reader's throw through", async () => {
    await expect(pollUntil17(async () => { throw new Error("boom"); }, { timeoutMs: 100, everyMs: 10, ...clock() })).rejects.toThrow("boom");
  });
});

describe("the fwd set-up's targets", () => {
  it("back 1 lands on P1, back 2 on P0 (sheet RD-FWD)", () => {
    const p = historyPlan("fwd");
    expect(p.backs).toBe(2);
    expect(historyBackTarget(p, 1)).toBe(p.urls[1]);
    expect(historyBackTarget(p, 2)).toBe(p.urls[0]);
    expect(p.urls[0]).toContain("s11b=fw0");
  });
  it("sameUrl17 normalizes and never matches an empty (hidden) row", () => {
    expect(sameUrl17("http://localhost:8081/e2e-playground.html?s11b=fw0", "http://localhost:8081/e2e-playground.html?s11b=fw0")).toBe(true);
    expect(sameUrl17("HTTP://LOCALHOST:8081/e2e-playground.html?s11b=fw0", "http://localhost:8081/e2e-playground.html?s11b=fw0")).toBe(true);
    expect(sameUrl17("http://localhost:8081/e2e-playground.html?s11b=fw1", "http://localhost:8081/e2e-playground.html?s11b=fw0")).toBe(false);
    expect(sameUrl17("", "")).toBe(false);
  });
});

/**
 * Step 8 S2 (phase doc 0.2; exit check S2.3; stage0-audit.md F22, F23): `waitFor {locator, state}`.
 * The pure loop `pollLocator` on a virtual clock, then the handler's validation and wiring with
 * `inject.js`/`tabs.js` mocked and vitest's fake timers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BridgeError } from "../src/errors.js";
import { pollLocator, type PollLocatorOptions } from "../src/handlers/locator-wait.js";

const m = vi.hoisted(() => ({ pageTab: vi.fn(), targetTab: vi.fn(), ensureContent: vi.fn(), callInPage: vi.fn() }));
vi.mock("../src/tabs.js", () => ({ pageTab: m.pageTab, targetTab: m.targetTab }));
vi.mock("../src/inject.js", () => ({ ensureContent: m.ensureContent, callInPage: m.callInPage }));

import { waitFor, locatorWaitParams } from "../src/handlers/wait.js";

const err = (code: string, data?: unknown) => new BridgeError(code, `${code} happened`, data);

/** A virtual clock: `sleep` advances it; each attempt takes `attemptMs`. Records attempt start times. */
function harness(outcomes: (n: number) => "found" | Error, opts: { attemptMs?: number } = {}) {
  let t = 1000;
  const starts: number[] = [];
  const sleeps: number[] = [];
  let reinjects = 0;
  const o: Omit<PollLocatorOptions, "state" | "timeoutMs"> = {
    attempt: async () => {
      starts.push(t);
      const n = starts.length - 1;
      t += opts.attemptMs ?? 0;
      const r = outcomes(n);
      if (r !== "found") throw r;
      return { ref: "e1", role: "button", name: "x" };
    },
    reinject: async () => {
      reinjects++;
    },
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
  };
  return { o, starts, sleeps, reinjects: () => reinjects, rel: () => starts.map((s) => s - 1000) };
}

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a rejection");
}

describe("pollLocator — visible", () => {
  it("found at once → resolves after one attempt, no sleep", async () => {
    const h = harness(() => "found");
    expect(await pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 })).toEqual({ ok: true });
    expect(h.starts).toHaveLength(1);
    expect(h.sleeps).toEqual([]);
  });

  it("polls every 100 ms after the previous settles until found", async () => {
    const h = harness((n) => (n < 3 ? err("LOCATOR_NOT_FOUND", { candidates: [] }) : "found"), { attemptMs: 30 });
    await pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 });
    expect(h.rel()).toEqual([0, 130, 260, 390]);
    expect(h.sleeps).toEqual([100, 100, 100]);
  });

  it("10 s timeout: 101 attempts 100 ms apart, TIMEOUT with the last LOCATOR_NOT_FOUND data and no locator text", async () => {
    const h = harness((n) => err("LOCATOR_NOT_FOUND", { candidates: [{ ref: `e${n}`, role: "button", name: "n" }] }));
    const e = await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 }));
    expect(e.code).toBe("TIMEOUT");
    expect(e.message).toBe("Timed out after 10000 ms waiting for the locator to be visible");
    expect(e.data).toEqual({ candidates: [{ ref: "e100", role: "button", name: "n" }] });
    expect(h.starts).toHaveLength(101);
    expect(h.rel()[100]).toBe(10_000);
    expect(new Set(h.sleeps)).toEqual(new Set([100]));
  });

  it("a poll in flight at the deadline is awaited (overrun ≤ one poll), then TIMEOUT", async () => {
    const h = harness(() => err("LOCATOR_NOT_FOUND"), { attemptMs: 70 });
    const e = await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 300 }));
    expect(e.code).toBe("TIMEOUT");
    expect(h.rel()).toEqual([0, 170, 340]);
    expect(e.data).toBeUndefined(); // LOCATOR_NOT_FOUND without data → TIMEOUT without data
  });

  it("timeoutMs 0 → exactly one attempt", async () => {
    const h = harness(() => err("LOCATOR_NOT_FOUND", { candidates: [] }));
    const e = await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 0 }));
    expect(e.code).toBe("TIMEOUT");
    expect(h.starts).toHaveLength(1);
  });

  it("LOCATOR_AMBIGUOUS rejects at once with it", async () => {
    const amb = err("LOCATOR_AMBIGUOUS", { matches: [] });
    const h = harness((n) => (n === 0 ? err("LOCATOR_NOT_FOUND") : amb));
    const e = await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 }));
    expect(e).toBe(amb);
    expect(h.starts).toHaveLength(2);
  });

  it("REF_STALE re-injects and keeps polling; a failing re-injection is swallowed", async () => {
    const h = harness((n) => (n < 2 ? err("REF_STALE") : "found"));
    let calls = 0;
    h.o.reinject = async () => {
      calls++;
      throw err("RESTRICTED_URL");
    };
    expect(await pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 })).toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(h.starts).toHaveLength(3);
  });

  it("a timeout after only REF_STALE carries no data", async () => {
    const h = harness(() => err("REF_STALE"));
    const e = await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 250 }));
    expect(e.code).toBe("TIMEOUT");
    expect(e.data).toBeUndefined();
    expect(h.reinjects()).toBe(h.starts.length);
  });

  for (const code of ["BAD_PARAMS", "TAB_UNKNOWN", "RESTRICTED_URL", "INTERNAL", "TIMEOUT"]) {
    it(`${code} rejects at once, unchanged`, async () => {
      const e0 = err(code);
      const h = harness(() => e0);
      expect(await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 }))).toBe(e0);
      expect(h.starts).toHaveLength(1);
    });
  }

  it("a plain Error rejects at once, unchanged", async () => {
    const e0 = new Error("boom");
    const h = harness(() => e0);
    expect(await rejection(pollLocator({ ...h.o, state: "visible", timeoutMs: 10_000 }))).toBe(e0);
  });
});

describe("pollLocator — hidden resolves on LOCATOR_NOT_FOUND and on nothing else", () => {
  it("LOCATOR_NOT_FOUND at once → resolves", async () => {
    const h = harness(() => err("LOCATOR_NOT_FOUND"));
    expect(await pollLocator({ ...h.o, state: "hidden", timeoutMs: 10_000 })).toEqual({ ok: true });
    expect(h.starts).toHaveLength(1);
  });

  it("found, AMBIGUOUS and REF_STALE keep polling until LOCATOR_NOT_FOUND", async () => {
    const seq = ["found", err("LOCATOR_AMBIGUOUS"), err("REF_STALE"), "found", err("LOCATOR_NOT_FOUND")] as const;
    const h = harness((n) => seq[n] as "found" | Error);
    expect(await pollLocator({ ...h.o, state: "hidden", timeoutMs: 10_000 })).toEqual({ ok: true });
    expect(h.rel()).toEqual([0, 100, 200, 300, 400]);
    expect(h.reinjects()).toBe(1);
  });

  for (const what of ["found", "LOCATOR_AMBIGUOUS", "REF_STALE"] as const) {
    it(`only ${what} → TIMEOUT (no data)`, async () => {
      const h = harness(() => (what === "found" ? "found" : err(what, { matches: [] })));
      const e = await rejection(pollLocator({ ...h.o, state: "hidden", timeoutMs: 10_000 }));
      expect(e.code).toBe("TIMEOUT");
      expect(e.message).toBe("Timed out after 10000 ms waiting for the locator to be hidden");
      expect(e.data).toBeUndefined();
      expect(h.starts).toHaveLength(101);
    });
  }

  for (const code of ["BAD_PARAMS", "TAB_UNKNOWN", "RESTRICTED_URL", "INTERNAL", "TIMEOUT"]) {
    it(`${code} rejects at once (does not count as hidden)`, async () => {
      const e0 = err(code);
      const h = harness(() => e0);
      expect(await rejection(pollLocator({ ...h.o, state: "hidden", timeoutMs: 10_000 }))).toBe(e0);
    });
  }
});

describe("locatorWaitParams — validation", () => {
  const L = { css: "#go" };
  it("defaults: visible, 10 000 ms", () => {
    expect(locatorWaitParams({ locator: L })).toEqual({ state: "visible", timeoutMs: 10_000 });
    expect(locatorWaitParams({ locator: L, timeoutMs: null })).toEqual({ state: "visible", timeoutMs: 10_000 });
    expect(locatorWaitParams({ locator: L, text: null, seconds: null, networkIdle: false })).toEqual({ state: "visible", timeoutMs: 10_000 });
  });
  it("state hidden; timeoutMs rounded and clamped to [0, 60 000]", () => {
    expect(locatorWaitParams({ locator: L, state: "hidden", timeoutMs: 1234.6 })).toEqual({ state: "hidden", timeoutMs: 1235 });
    expect(locatorWaitParams({ locator: L, timeoutMs: -5 }).timeoutMs).toBe(0);
    expect(locatorWaitParams({ locator: L, timeoutMs: 999_999 }).timeoutMs).toBe(60_000);
  });
  const bad: Array<[string, Record<string, unknown>]> = [
    ["with text", { locator: L, text: "x" }],
    ["with seconds", { locator: L, seconds: 1 }],
    ["with networkIdle", { locator: L, networkIdle: true }],
    ["an invalid locator", { locator: { css: "a", exact: true } }],
    ["an unknown state", { locator: L, state: "attached" }],
    ["a null state", { locator: L, state: null }],
    ["a string timeoutMs", { locator: L, timeoutMs: "5000" }],
    ["a NaN timeoutMs", { locator: L, timeoutMs: NaN }],
    ["an infinite timeoutMs", { locator: L, timeoutMs: Infinity }],
  ];
  for (const [what, p] of bad) {
    it(`${what} → BAD_PARAMS`, () => {
      let e: unknown;
      try {
        locatorWaitParams(p);
      } catch (x) {
        e = x;
      }
      expect((e as BridgeError).code).toBe("BAD_PARAMS");
    });
  }
});

describe("waitFor {locator} — the handler", () => {
  let log: string[];
  let answers: Array<"found" | Error>;
  beforeEach(() => {
    log = [];
    answers = [];
    m.pageTab.mockImplementation(async (_p: unknown, method: string) => {
      log.push(`pageTab:${method}`);
      return { id: 7 };
    });
    m.ensureContent.mockImplementation(async () => {
      log.push("ensureContent");
    });
    m.callInPage.mockImplementation(async (_t: number, fn: unknown, args: unknown[]) => {
      log.push(`page:${/__agentBridge!?\.(\w+)/.exec(String(fn))?.[1]}:${JSON.stringify(args)}`);
      const a = answers.shift() ?? err("LOCATOR_NOT_FOUND", { candidates: [] });
      if (a !== "found") throw a;
      return { ref: "e1", role: "button", name: "Go" };
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("validation runs before any tab or page call", async () => {
    const e = await rejection(waitFor({ locator: { css: "#go" }, text: "x" }));
    expect(e.code).toBe("BAD_PARAMS");
    expect(log).toEqual([]);
  });

  it("pageTab('waitFor') → ensureContent → locate(locator as its own argument)", async () => {
    answers = ["found"];
    expect(await waitFor({ tabId: 7, locator: { role: "button", name: "Go" } })).toEqual({ ok: true });
    expect(log).toEqual(["pageTab:waitFor", "ensureContent", 'page:locate:[{"role":"button","name":"Go"}]']);
  });

  it("polls at 100 ms on real (fake) timers; REF_STALE re-injects; the 10 s default times out", async () => {
    vi.useFakeTimers();
    answers = [err("LOCATOR_NOT_FOUND"), err("REF_STALE")];
    const p = rejection(waitFor({ tabId: 7, locator: { css: "#go" } }));
    await vi.advanceTimersByTimeAsync(0);
    expect(log.filter((l) => l.startsWith("page:"))).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(log.filter((l) => l.startsWith("page:"))).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(log.filter((l) => l.startsWith("page:"))).toHaveLength(2);
    expect(log.at(-1)).toBe("ensureContent"); // the REF_STALE re-injection
    await vi.advanceTimersByTimeAsync(10_000);
    const e = await p;
    expect(e.code).toBe("TIMEOUT");
    expect(e.message).toBe("Timed out after 10000 ms waiting for the locator to be visible");
    expect(e.data).toEqual({ candidates: [] });
    expect(log.filter((l) => l.startsWith("page:"))).toHaveLength(101);
  });

  it("state hidden resolves on LOCATOR_NOT_FOUND", async () => {
    answers = ["found", err("LOCATOR_NOT_FOUND")];
    vi.useFakeTimers();
    const p = waitFor({ tabId: 7, locator: { css: "#go" }, state: "hidden", timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(100);
    expect(await p).toEqual({ ok: true });
  });

  // Fix round 1, S2-verifier finding 3: the locator arm (and its "alone" check) runs before every
  // other arm, so moving it below networkIdle / seconds / text fails here.
  for (const [what, extra] of [
    ["networkIdle: true", { networkIdle: true }],
    ["seconds", { seconds: 1 }],
    ["text", { text: "Go" }],
  ] as const) {
    it(`{locator, ${what}} → BAD_PARAMS, no tab or page call, no wait`, async () => {
      m.targetTab.mockImplementation(async () => {
        log.push("targetTab");
        return { id: 7 };
      });
      vi.useFakeTimers();
      const p = rejection(waitFor({ tabId: 7, locator: { css: "#go" }, ...extra }));
      await vi.advanceTimersByTimeAsync(0);
      const e = await p;
      expect(e.code).toBe("BAD_PARAMS");
      expect(log).toEqual([]);
    });
  }

  // Fix round 1, S2-verifier finding 2 (code reading, unmeasured): Chrome's frame-teardown rejection
  // during a navigation arrives as INTERNAL; the wait re-injects and keeps polling instead of failing.
  const frameMsg = (raw: string) => new BridgeError("INTERNAL", `Could not run script in the target tab — it may be a restricted URL. (${raw})`);
  for (const raw of ["Frame with ID 0 was removed.", "Frame with ID 12 is showing error page", "No frame with id 3 in tab 7."]) {
    it(`INTERNAL "${raw}" mid-wait → re-inject and keep polling`, async () => {
      vi.useFakeTimers();
      answers = [frameMsg(raw), "found"];
      const p = waitFor({ tabId: 7, locator: { css: "#go" } });
      await vi.advanceTimersByTimeAsync(100);
      expect(await p).toEqual({ ok: true });
      expect(log.filter((l) => l === "ensureContent")).toHaveLength(2); // the first + the re-injection
      expect(log.filter((l) => l.startsWith("page:"))).toHaveLength(2);
    });
  }

  it("any other INTERNAL still rejects at once, unchanged", async () => {
    const boom = frameMsg("Something else broke");
    answers = [boom];
    const e = await rejection(waitFor({ tabId: 7, locator: { css: "#go" } }));
    expect(e).toBe(boom);
    expect(log.filter((l) => l.startsWith("page:"))).toHaveLength(1);
  });

  it("without a locator the old arms are untouched: {} still names text/seconds/networkIdle", async () => {
    const e = await rejection(waitFor({}));
    expect(e.message).toBe("browser_wait_for requires one of text, seconds or networkIdle");
    const e2 = await rejection(waitFor({ locator: null }));
    expect(e2.message).toBe("browser_wait_for requires one of text, seconds or networkIdle");
  });
});

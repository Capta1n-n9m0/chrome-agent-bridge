/**
 * Step 9 S2a: the smaller pure additions — the tab-info cache keeps a closed tab's last URL for the length
 * of a call (Stage 0 R2-1 NIT) and knows replacements; the download store can be cleared at a disarm
 * (#137 item 4); the locator wait re-checks the gate every tick (#137 item 3, F5).
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { TabInfoCache, RETIRED_KEEP_MS, RETIRED_MAX } from "../src/tab-events.js";
import { DownloadStore } from "../src/download.js";
import { pollLocator } from "../src/handlers/locator-wait.js";
import { BridgeError } from "../src/errors.js";

describe("TabInfoCache: a closed tab's last URL is kept (R2-1)", () => {
  it("retire returns the entry like take, and lastUrl still answers afterwards", () => {
    const c = new TabInfoCache();
    c.update(7, { url: "http://a.example/", title: "A" });
    expect(c.retire(7)).toEqual({ url: "http://a.example/", title: "A" });
    expect(c.get(7)).toBeUndefined();
    expect(c.size).toBe(0);
    expect(c.lastUrl(7)).toBe("http://a.example/");
  });

  it("lastUrl of a live tab is its current URL; unknown → undefined", () => {
    const c = new TabInfoCache();
    c.update(7, { url: "http://a.example/" });
    c.update(7, { url: "http://b.example/" });
    expect(c.lastUrl(7)).toBe("http://b.example/");
    expect(c.lastUrl(8)).toBeUndefined();
  });

  it("a retired entry expires after RETIRED_KEEP_MS (longer than the longest call)", () => {
    let now = 0;
    const c = new TabInfoCache(() => now);
    c.update(7, { url: "http://a.example/" });
    c.retire(7);
    expect(RETIRED_KEEP_MS).toBeGreaterThanOrEqual(605_000);
    now += RETIRED_KEEP_MS - 1;
    expect(c.lastUrl(7)).toBe("http://a.example/");
    now += 2;
    expect(c.lastUrl(7)).toBeUndefined();
  });

  it("the retired set is bounded (oldest first)", () => {
    const c = new TabInfoCache();
    for (let i = 0; i <= RETIRED_MAX; i++) {
      c.update(i, { url: `http://t${i}.example/` });
      c.retire(i);
    }
    expect(c.lastUrl(0)).toBeUndefined();
    expect(c.lastUrl(RETIRED_MAX)).toBe(`http://t${RETIRED_MAX}.example/`);
  });

  it("noteReplaced records the new id; replacedBy answers it", () => {
    const c = new TabInfoCache();
    c.noteReplaced(7, 9);
    expect(c.replacedBy(7)).toBe(9);
    expect(c.replacedBy(9)).toBeUndefined();
  });

  it("take is unchanged: it forgets (no retained URL)", () => {
    const c = new TabInfoCache();
    c.update(7, { url: "http://a.example/" });
    c.take(7);
    expect(c.lastUrl(7)).toBeUndefined();
  });
});

describe("DownloadStore.clear — a disarm drops every held download", () => {
  it("clears and reports the count; later reads fail as unknown", () => {
    const s = new DownloadStore();
    const a = s.put(new Uint8Array([1]));
    s.put(new Uint8Array([2]));
    expect(s.clear()).toBe(2);
    expect(s.size).toBe(0);
    expect(() => s.chunk(a, 0, 1)).toThrow(/Unknown or expired/);
    expect(s.clear()).toBe(0);
  });
});

describe("pollLocator {check} — the locator wait re-checks the gate every tick", () => {
  it("runs the check before every attempt and ends with its refusal", async () => {
    let n = 0;
    const order: string[] = [];
    const check = vi.fn(async () => {
      order.push("check");
      if (++n === 3) throw new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" });
    });
    const attempt = vi.fn(async () => {
      order.push("attempt");
      throw new BridgeError(ErrorCodes.LOCATOR_NOT_FOUND, "no match");
    });
    let clock = 0;
    const err = await pollLocator({
      state: "visible",
      timeoutMs: 10_000,
      attempt,
      reinject: async () => {},
      now: () => (clock += 100), // a check-less loop ends in TIMEOUT instead of spinning
      sleep: async () => {},
      check,
    }).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(order).toEqual(["check", "attempt", "check", "attempt", "check"]);
  });

  it("without a check, today's behaviour", async () => {
    const out = await pollLocator({
      state: "visible",
      timeoutMs: 100,
      attempt: async () => ({}),
      reinject: async () => {},
      now: () => 0,
      sleep: async () => {},
    });
    expect(out).toEqual({ ok: true });
  });
});

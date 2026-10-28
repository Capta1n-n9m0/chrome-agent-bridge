// Step 12 S6-G2 (phase doc § S6; Stage0.md §6 "S6-G2 draft", G6.5–G6.7; decisions.md #321 Q6, #338; spec §6.4): a
// trusted `click`/`type`/`pressKey` without focus emulation is one blocking action — the daemon takes the visibility
// lock, forwards `focusTab`, re-checks caller and lease, forwards the input, replies, then holds the lock 500 ms.
// A fake extension records each forward's order, the lock holder at that moment and the timeout it was given; the
// clock and the timers are vitest's fake ones.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BridgeError, ErrorCodes } from "@bridge/shared";
import { TRUSTED_SETTLE_MS, takesLock, trustedFocus } from "../src/methods.js";
import { Bridge } from "../src/bridge.js";
import type { ExtensionConnection } from "../src/connection.js";
import { TabLayer, type Caller } from "../src/intercept.js";

interface Fwd {
  method: string;
  params: Record<string, unknown> | undefined;
  holder: string | undefined;
  timeoutMs: number | undefined;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}

const A: Caller = { clientId: "a", name: "A" };
const B: Caller = { clientId: "b", name: "B" };

/** Lets every pending promise chain run (no timer advances). */
async function flush(): Promise<void> {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

async function setup() {
  const fwd: Fwd[] = [];
  const names: Record<string, string> = { a: "A", b: "B" };
  let layer!: TabLayer;
  const conn = {
    call: (method: string, params?: Record<string, unknown>, opts?: { timeoutMs?: number }) => {
      if (method === "listTabs") {
        return Promise.resolve({
          tabs: [
            { id: 41, title: "", url: "", active: true, current: true },
            { id: 42, title: "", url: "", active: false },
          ],
        });
      }
      return new Promise((resolve, reject) =>
        fwd.push({ method, params, holder: layer.lock.holder(), timeoutMs: opts?.timeoutMs, resolve, reject }),
      );
    },
  } as unknown as ExtensionConnection;
  const bridge = new Bridge();
  bridge.setConnection(conn);
  layer = new TabLayer({ bridge, nameOf: (id) => names[id], sendTo: () => {} });
  layer.extensionConnected(conn, true);
  expect(await layer.request(A, "tabs.claim", { active: true }, undefined)).toEqual({ tab: "T1" }); // tabId 41
  expect(await layer.request(B, "tabs.claim", { tab: "T2" }, undefined)).toEqual({ tab: "T2" }); // tabId 42
  const of = (m: string) => fwd.filter((f) => f.method === m);
  const gone = (id: string) => {
    delete names[id];
    layer.clientGone(id);
  };
  return { layer, fwd, of, gone };
}

/** Settles a promise into a value so a rejection is never unhandled while the test advances timers. */
function outcome<T>(p: Promise<T>): { done: () => boolean; value: () => unknown; error: () => unknown } {
  let state: { ok: boolean; v: unknown } | undefined;
  p.then(
    (v) => (state = { ok: true, v }),
    (e) => (state = { ok: false, v: e }),
  );
  return {
    done: () => state !== undefined,
    value: () => (state?.ok ? state.v : undefined),
    error: () => (state && !state.ok ? state.v : undefined),
  };
}

const INPUTS: Array<[string, Record<string, unknown>]> = [
  ["click", { ref: "e1", trusted: true }],
  ["type", { ref: "e1", text: "hi", trusted: true }],
  ["pressKey", { key: "Enter", trusted: true }],
];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("S6-G2 trustedFocus (G6.5)", () => {
  it("is true only for click/type/pressKey with trusted: true and no focusEmulation: true", () => {
    const rows: Array<[string, Record<string, unknown> | undefined, boolean]> = [
      ["click", { trusted: true }, true],
      ["type", { trusted: true }, true],
      ["pressKey", { trusted: true }, true],
      ["click", { trusted: true, focusEmulation: false }, true],
      ["click", { trusted: true, focusEmulation: true }, false],
      ["type", { trusted: true, focusEmulation: true }, false],
      ["pressKey", { trusted: true, focusEmulation: true }, false],
      ["click", { trusted: false }, false],
      ["click", { trusted: "true" }, false],
      ["click", { trusted: 1 }, false],
      ["click", {}, false],
      ["click", undefined, false],
      ["hover", { trusted: true }, false],
      ["scroll", { trusted: true }, false],
      ["selectOption", { trusted: true }, false],
      ["focusTab", { trusted: true }, false],
      ["screenshot", { trusted: true }, false],
      ["uploadFiles", { trusted: true }, false],
      ["evaluate", { trusted: true }, false],
    ];
    for (const [m, p, want] of rows) expect([m, p, trustedFocus(m, p)]).toEqual([m, p, want]);
    expect(TRUSTED_SETTLE_MS).toBe(500);
    // takesLock stays false for these methods (the hold is trustedFocus's, not a one-forward lock).
    for (const m of ["click", "type", "pressKey"]) expect(takesLock(m, { trusted: true })).toBe(false);
  });
});

describe("S6-G2 the blocking trusted input (G6.5, G6.7)", () => {
  for (const [method, params] of INPUTS) {
    it(`${method}: the lock is taken once; focusTab then the input under it; reply before the pause; a queued screenshot runs only after it`, async () => {
      const { layer, fwd, of } = await setup();
      const acquire = vi.spyOn(layer.lock, "acquire");
      const r = outcome(layer.request(A, method, { tab: "T1", ...params }, undefined));
      await flush();
      expect(fwd.map((f) => [f.method, f.params, f.holder])).toEqual([["focusTab", { tabId: 41 }, "a"]]);
      fwd[0].resolve({ ok: true });
      await flush();
      expect(fwd.map((f) => f.method)).toEqual(["focusTab", method]);
      expect(fwd[1].params).toEqual({ ...params, tabId: 41 });
      expect(fwd[1].holder).toBe("a");

      // Another client's screenshot, sent while the input is in flight, waits.
      const shot = outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
      await flush();
      expect(of("screenshot")).toHaveLength(0);

      fwd[1].resolve({ ok: true });
      await flush();
      expect(r.done()).toBe(true); // replied before the pause
      expect(r.value()).toEqual({ ok: true });
      expect(layer.lock.holder()).toBe("a");
      expect(acquire).toHaveBeenCalledTimes(2); // A's once, B's once

      await vi.advanceTimersByTimeAsync(TRUSTED_SETTLE_MS - 1);
      expect(of("screenshot")).toHaveLength(0);
      expect(layer.lock.holder()).toBe("a");
      await vi.advanceTimersByTimeAsync(1);
      await flush();
      expect(of("screenshot")).toHaveLength(1);
      expect(of("screenshot")[0].holder).toBe("b");
      of("screenshot")[0].resolve({ dataUrl: "x" });
      await flush();
      expect(shot.value()).toEqual({ dataUrl: "x" });
      expect(layer.lock.holder()).toBeUndefined();
    });
  }

  it("the pause runs after an input error too; the error reaches the caller before it", async () => {
    const { layer, fwd } = await setup();
    const r = outcome(layer.request(A, "type", { tab: "T1", ref: "e1", text: "x", trusted: true }, undefined));
    await flush();
    fwd[0].resolve({ ok: true });
    await flush();
    fwd[1].reject(new BridgeError(ErrorCodes.REF_STALE, "stale"));
    await flush();
    expect(r.error()).toMatchObject({ code: "REF_STALE" });
    expect(layer.lock.holder()).toBe("a");
    await vi.advanceTimersByTimeAsync(TRUSTED_SETTLE_MS - 1);
    expect(layer.lock.holder()).toBe("a");
    await vi.advanceTimersByTimeAsync(1);
    expect(layer.lock.holder()).toBeUndefined();
  });

  it("a focusTab failure: the input is not forwarded, the caller gets focusTab's error, the lock is released at once", async () => {
    const { layer, fwd, of } = await setup();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, undefined));
    await flush();
    fwd[0].reject(new BridgeError(ErrorCodes.TAB_UNKNOWN, "gone"));
    await flush();
    expect(r.error()).toMatchObject({ code: "TAB_UNKNOWN" });
    expect(of("click")).toHaveLength(0);
    expect(layer.lock.holder()).toBeUndefined();
  });

  it("a client disconnect between the forwards releases at once and the input is not forwarded", async () => {
    const { layer, fwd, of, gone } = await setup();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, undefined));
    await flush();
    const shot = outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
    await flush();
    expect(of("screenshot")).toHaveLength(0);
    gone("a");
    await flush();
    expect(layer.lock.holder()).toBe("b"); // freed at once, not after the focus settles
    expect(of("screenshot")).toHaveLength(1);
    fwd[0].resolve({ ok: true }); // A's focus settles late
    await flush();
    expect(r.error()).toMatchObject({ code: "NOT_CONNECTED" });
    expect(of("click")).toHaveLength(0);
    expect(layer.lock.holder()).toBe("b"); // A's late release frees nobody else
    of("screenshot")[0].resolve({});
    await flush();
    expect(shot.done()).toBe(true);
  });

  it("a client disconnect during the pause frees the lock at once", async () => {
    const { layer, fwd, of, gone } = await setup();
    const r = outcome(layer.request(A, "pressKey", { tab: "T1", key: "Enter", trusted: true }, undefined));
    await flush();
    fwd[0].resolve({ ok: true });
    await flush();
    fwd[1].resolve({ ok: true });
    await flush();
    expect(r.value()).toEqual({ ok: true });
    outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
    await flush();
    expect(of("screenshot")).toHaveLength(0);
    gone("a");
    await flush();
    expect(of("screenshot")).toHaveLength(1);
    expect(layer.lock.holder()).toBe("b");
    await vi.advanceTimersByTimeAsync(TRUSTED_SETTLE_MS);
    expect(layer.lock.holder()).toBe("b"); // the pause's late release frees nobody else
  });

  it("the lease is re-checked between the forwards: a tab released and claimed meanwhile → TAB_HELD, no input, released at once", async () => {
    const { layer, fwd, of } = await setup();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, undefined));
    await flush();
    expect(await layer.request(A, "tabs.release", { tab: "T1" }, undefined)).toEqual({ ok: true });
    expect(await layer.request(B, "tabs.claim", { tab: "T1" }, undefined)).toEqual({ tab: "T1" });
    fwd[0].resolve({ ok: true });
    await flush();
    expect(r.error()).toMatchObject({ code: "TAB_HELD", data: { owner: "B" } });
    expect(of("click")).toHaveLength(0);
    expect(layer.lock.holder()).toBeUndefined();
  });

  it("fixer r1 (MINOR-1): the lease is re-checked after the lock wait: lost meanwhile → TAB_HELD, no focusTab forwarded", async () => {
    const { layer, fwd, of } = await setup();
    outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
    await flush();
    expect(layer.lock.holder()).toBe("b");
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, undefined));
    await flush();
    expect(await layer.request(A, "tabs.release", { tab: "T1" }, undefined)).toEqual({ ok: true });
    expect(await layer.request(B, "tabs.claim", { tab: "T1" }, undefined)).toEqual({ tab: "T1" });
    of("screenshot")[0].resolve({});
    await flush();
    expect(r.error()).toMatchObject({ code: "TAB_HELD", data: { owner: "B" } });
    expect(of("focusTab")).toHaveLength(0);
    expect(of("click")).toHaveLength(0);
    expect(fwd).toHaveLength(1);
    expect(layer.lock.holder()).toBeUndefined();
  });

  it("fixer r1 (MINOR-3): a focus that settles at the deadline → TIMEOUT, the input is not forwarded, released at once", async () => {
    const { layer, fwd, of } = await setup();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, 1000));
    await flush();
    expect(of("focusTab")).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    fwd[0].resolve({ ok: true });
    await flush();
    expect(r.error()).toMatchObject({ code: "TIMEOUT", message: "Timed out before calling click" });
    expect(of("click")).toHaveLength(0);
    expect(layer.lock.holder()).toBeUndefined();
  });

  it("focusEmulation: true, trusted: false and untrusted inputs take no lock and forward no focusTab", async () => {
    const { layer, fwd, of } = await setup();
    // B holds the lock with a pending screenshot.
    outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
    await flush();
    expect(layer.lock.holder()).toBe("b");
    const calls: Array<[string, Record<string, unknown>]> = [
      ["click", { ref: "e1", trusted: true, focusEmulation: true }],
      ["type", { ref: "e1", text: "x", trusted: true, focusEmulation: true }],
      ["pressKey", { key: "Enter", trusted: true, focusEmulation: true }],
      ["click", { ref: "e1", trusted: false }],
      ["click", { ref: "e1" }],
      ["type", { ref: "e1", text: "x" }],
      ["pressKey", { key: "Enter" }],
    ];
    for (const [m, p] of calls) {
      const before = fwd.length;
      const r = outcome(layer.request(A, m, { tab: "T1", ...p }, undefined));
      await flush();
      expect(fwd.length).toBe(before + 1);
      const last = fwd[fwd.length - 1];
      expect([last.method, last.params]).toEqual([m, { ...p, tabId: 41 }]);
      last.resolve({ ok: true });
      await flush();
      expect(r.value()).toEqual({ ok: true });
    }
    expect(of("focusTab")).toHaveLength(0);
    expect(layer.lock.holder()).toBe("b");
  });

  it("G6.7: under contention a trusted input answers LOCK_TIMEOUT {holder} at its deadline and forwards nothing", async () => {
    const { layer, fwd, of } = await setup();
    outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
    await flush();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, 1000));
    await vi.advanceTimersByTimeAsync(999);
    expect(r.done()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(r.error()).toMatchObject({ code: "LOCK_TIMEOUT", data: { holder: "B" } });
    expect(of("focusTab")).toHaveLength(0);
    expect(of("click")).toHaveLength(0);
    expect(fwd).toHaveLength(1);
  });

  it("one deadline (#44) covers the wait, both forwards and the pause; the pause is cut at the deadline", async () => {
    const { layer, fwd, of } = await setup();
    outcome(layer.request(B, "screenshot", { tab: "T2" }, undefined));
    await flush();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, 2000));
    await vi.advanceTimersByTimeAsync(1500);
    of("screenshot")[0].resolve({});
    await flush();
    expect(of("focusTab")[0].timeoutMs).toBe(2000 - 1500 + 5000);
    await vi.advanceTimersByTimeAsync(200);
    of("focusTab")[0].resolve({ ok: true });
    await flush();
    expect(of("click")[0].timeoutMs).toBe(2000 - 1700 + 5000);
    await vi.advanceTimersByTimeAsync(200);
    of("click")[0].resolve({ ok: true });
    await flush();
    expect(r.value()).toEqual({ ok: true }); // the reply is not delayed by the pause
    expect(layer.lock.holder()).toBe("a");
    await vi.advanceTimersByTimeAsync(99); // 100 ms left to the deadline, not 500
    expect(layer.lock.holder()).toBe("a");
    await vi.advanceTimersByTimeAsync(1);
    expect(layer.lock.holder()).toBeUndefined();
    expect(fwd).toHaveLength(3);
  });

  it("an input that settles after the deadline releases at once (no pause left)", async () => {
    const { layer, fwd } = await setup();
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, 1000));
    await flush();
    fwd[0].resolve({ ok: true });
    await flush();
    await vi.advanceTimersByTimeAsync(1200);
    fwd[1].resolve({ ok: true });
    await flush();
    expect(r.value()).toEqual({ ok: true });
    expect(layer.lock.holder()).toBeUndefined();
  });

  it("a client's own focusTab first (the SDK's and MCP's focusFirst) then the trusted input: two acquisitions, no deadlock", async () => {
    const { layer, fwd, of } = await setup();
    const acquire = vi.spyOn(layer.lock, "acquire");
    const f = outcome(layer.request(A, "focusTab", { tab: "T1" }, undefined));
    await flush();
    fwd[0].resolve({ ok: true });
    await flush();
    expect(f.value()).toEqual({ ok: true });
    expect(layer.lock.holder()).toBeUndefined(); // the client's focusTab releases at its reply, as before
    const r = outcome(layer.request(A, "click", { tab: "T1", ref: "e1", trusted: true }, undefined));
    await flush();
    of("focusTab")[1].resolve({ ok: true });
    await flush();
    of("click")[0].resolve({ ok: true });
    await flush();
    expect(r.value()).toEqual({ ok: true });
    expect(fwd.map((x) => [x.method, x.holder])).toEqual([
      ["focusTab", "a"],
      ["focusTab", "a"],
      ["click", "a"],
    ]);
    expect(acquire).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(TRUSTED_SETTLE_MS);
    expect(layer.lock.holder()).toBeUndefined();
  });
});

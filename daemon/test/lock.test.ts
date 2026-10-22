import { describe, it, expect } from "vitest";
import { BridgeError } from "@bridge/shared";
import { VisibilityLock } from "../src/lock.js";

/** Step 7 T2 (phase doc 0.4, decisions.md #44): the visibility lock, pure, with fake timers. */

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    setTimer: (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { at: now + Math.max(0, ms), fn });
      return id;
    },
    clearTimer: (id: unknown) => {
      timers.delete(id as number);
    },
    /** Advance and fire due timers in time order. */
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
    pending: () => timers.size,
  };
}

const names: Record<string, string> = { cA: "alpha", cB: "beta", cC: "gamma" };

function makeLock() {
  const clock = fakeClock();
  const lock = new VisibilityLock({
    nameOf: (id) => names[id] ?? id,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { lock, clock };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("VisibilityLock", () => {
  it("grants at once when free, even past the deadline (uncontended costs nothing)", async () => {
    const { lock } = makeLock();
    const release = await lock.acquire("cA", -5);
    expect(lock.holder()).toBe("cA");
    release();
    expect(lock.holder()).toBeUndefined();
  });

  it("is FIFO", async () => {
    const { lock } = makeLock();
    const order: string[] = [];
    const rA = await lock.acquire("cA", 1000);
    const pB = lock.acquire("cB", 1000).then((r) => (order.push("B"), r));
    const pC = lock.acquire("cC", 1000).then((r) => (order.push("C"), r));
    await tick();
    expect(order).toEqual([]);
    rA();
    const rB = await pB;
    await tick();
    expect(order).toEqual(["B"]);
    expect(lock.holder()).toBe("cB");
    rB();
    const rC = await pC;
    expect(order).toEqual(["B", "C"]);
    rC();
    expect(lock.holder()).toBeUndefined();
  });

  it("a waiter past its deadline rejects LOCK_TIMEOUT {holder: name} once and leaves the queue", async () => {
    const { lock, clock } = makeLock();
    const rA = await lock.acquire("cA", 10_000);
    const settled: unknown[] = [];
    const pB = lock.acquire("cB", 500);
    pB.then(
      (r) => settled.push(r),
      (e) => settled.push(e),
    );
    const pC = lock.acquire("cC", 10_000);
    clock.advance(499);
    await tick();
    expect(settled).toEqual([]);
    clock.advance(1);
    await tick();
    expect(settled).toHaveLength(1);
    const err = settled[0] as BridgeError;
    expect(err).toBeInstanceOf(BridgeError);
    expect(err.code).toBe("LOCK_TIMEOUT");
    expect(err.data).toEqual({ holder: "alpha" });
    expect(err.message).toContain('"alpha"');
    // B left the queue: releasing A goes straight to C.
    rA();
    await pC;
    expect(lock.holder()).toBe("cC");
    clock.advance(100_000);
    await tick();
    expect(settled).toHaveLength(1);
  });

  it("two waiters past their deadlines each reject exactly once", async () => {
    const { lock, clock } = makeLock();
    await lock.acquire("cA", 10_000);
    const results: string[] = [];
    lock.acquire("cB", 100).catch((e: BridgeError) => results.push(`B:${e.code}`));
    lock.acquire("cC", 200).catch((e: BridgeError) => results.push(`C:${e.code}`));
    clock.advance(1000);
    await tick();
    expect(results).toEqual(["B:LOCK_TIMEOUT", "C:LOCK_TIMEOUT"]);
    expect(clock.pending()).toBe(0);
  });

  it("a waiter whose deadline already passed while the lock is busy rejects at once", async () => {
    const { lock, clock } = makeLock();
    await lock.acquire("cA", 10_000);
    clock.advance(50);
    await expect(lock.acquire("cB", 10)).rejects.toMatchObject({ code: "LOCK_TIMEOUT", data: { holder: "alpha" } });
  });

  it("release is idempotent and never frees a later holder", async () => {
    const { lock } = makeLock();
    const rA = await lock.acquire("cA", 1000);
    const pB = lock.acquire("cB", 1000);
    rA();
    const rB = await pB;
    rA(); // second call: no effect
    expect(lock.holder()).toBe("cB");
    const pC = lock.acquire("cC", 1000);
    rA();
    await tick();
    expect(lock.holder()).toBe("cB");
    rB();
    await pC;
    expect(lock.holder()).toBe("cC");
  });

  it("releaseAllOf frees the holder's lock and drops its waiters; its late release frees nobody else", async () => {
    const { lock, clock } = makeLock();
    const rA = await lock.acquire("cA", 10_000);
    const pA2 = lock.acquire("cA", 10_000);
    const pB = lock.acquire("cB", 10_000);
    const a2 = pA2.then(
      () => "granted",
      (e: BridgeError) => e.code,
    );
    lock.releaseAllOf("cA");
    expect(await a2).not.toBe("granted");
    const rB = await pB;
    expect(lock.holder()).toBe("cB");
    rA(); // A's call settles late
    expect(lock.holder()).toBe("cB");
    rB();
    expect(lock.holder()).toBeUndefined();
    expect(clock.pending()).toBe(0);
  });

  it("releaseAllOf of a client holding nothing changes nothing", async () => {
    const { lock } = makeLock();
    const rA = await lock.acquire("cA", 1000);
    lock.releaseAllOf("cB");
    expect(lock.holder()).toBe("cA");
    rA();
  });

  it("release after releaseAllOf already freed it does not release the next holder", async () => {
    const { lock } = makeLock();
    const rA = await lock.acquire("cA", 1000);
    lock.releaseAllOf("cA");
    const rB = await lock.acquire("cB", 1000);
    rA();
    rA();
    expect(lock.holder()).toBe("cB");
    rB();
  });
});

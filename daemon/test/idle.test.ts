import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IdleTimer } from "../src/idle.js";

describe("IdleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("arms at count 0 and fires once after ms", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    expect(idle.armed).toBe(true);
    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(idle.fired).toBe(true);
    expect(idle.armed).toBe(false);
  });

  it("cancels at count 1 and never fires while a client is connected", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    vi.advanceTimersByTime(900);
    idle.update(1);
    expect(idle.armed).toBe(false);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("re-arms at 0 with the full interval", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    vi.advanceTimersByTime(900);
    idle.update(1);
    vi.advanceTimersByTime(500);
    idle.update(0);
    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("repeated 0 updates neither reset nor double-arm the timer", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    vi.advanceTimersByTime(600);
    idle.update(0);
    vi.advanceTimersByTime(400);
    expect(onIdle).toHaveBeenCalledTimes(1);
    idle.update(0);
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("counts above 1 cancel as well", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    idle.update(3);
    vi.advanceTimersByTime(2000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("fires at most once ever: updates after firing do nothing", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    vi.advanceTimersByTime(1000);
    idle.update(1);
    idle.update(0);
    vi.advanceTimersByTime(10_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(idle.armed).toBe(false);
  });

  it("dispose() cancels a pending fire and ignores later updates", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    idle.update(0);
    idle.dispose();
    idle.update(0);
    vi.advanceTimersByTime(10_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("is not armed until the first update", () => {
    const onIdle = vi.fn();
    const idle = new IdleTimer({ ms: 1000, onIdle });
    expect(idle.armed).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("uses injected timers and reports the deadline from the injected clock", () => {
    const onIdle = vi.fn();
    let pending: (() => void) | undefined;
    const setT = vi.fn((fn: () => void, _ms: number) => {
      pending = fn;
      return 7 as unknown as ReturnType<typeof setTimeout>;
    });
    const clearT = vi.fn();
    const idle = new IdleTimer({ ms: 250, onIdle, now: () => 1000, setTimeout: setT, clearTimeout: clearT });
    idle.update(0);
    expect(setT).toHaveBeenCalledTimes(1);
    expect(setT.mock.calls[0]![1]).toBe(250);
    expect(idle.deadline()).toBe(1250);
    idle.update(2);
    expect(clearT).toHaveBeenCalledWith(7);
    expect(idle.deadline()).toBeNull();
    idle.update(0);
    pending!();
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("rejects an ms outside 1..2147483647 or not a whole number with a RangeError", () => {
    for (const ms of [0, -1, 1.5, 2147483648, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new IdleTimer({ ms, onIdle: () => {} })).toThrow(RangeError);
    }
    expect(() => new IdleTimer({ ms: 1, onIdle: () => {} })).not.toThrow();
    expect(() => new IdleTimer({ ms: 2147483647, onIdle: () => {} })).not.toThrow();
  });
});

import { describe, it, expect, vi } from "vitest";
import { chooseMarker, SessionMarker, MARKER_WAIT_MS, type MarkerStore } from "../src/session-marker.js";

/**
 * Step 8 S2b.5, the extension half (decisions.md · 2026-10-23 · The extension hello carries an optional
 * session marker (#74), amended by · The session marker's mechanism (#80)): the choice is a pure function
 * over the five event orders, and the glue's state machine is tested with a fake store, random and clock.
 */

function fakeStore(init: { session?: string; local?: string } = {}) {
  const state = { ...init };
  const writes: string[] = [];
  const store: MarkerStore = {
    getSession: vi.fn(async () => state.session),
    getLocal: vi.fn(async () => state.local),
    setBoth: vi.fn(async (m: string) => {
      writes.push(m);
      state.session = m;
      state.local = m;
    }),
  };
  return { store, state, writes };
}

function randoms() {
  let n = 0;
  return () => `fresh-${++n}`;
}

/** A delay that never elapses unless `elapse()` is called. */
function manualDelay() {
  const waits: number[] = [];
  let release: (() => void) | undefined;
  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      waits.push(ms);
      release = resolve;
    });
  return { delay, waits, elapse: () => release?.() };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("chooseMarker (pure)", () => {
  const fresh = randoms();
  it("a storage.session marker is reused whatever else happened (worker restart)", () => {
    expect(chooseMarker({ session: "S", local: "L", startup: true, installed: "update" }, fresh)).toEqual({ marker: "S", source: "worker-restart" });
  });
  it("onStartup → fresh, even beside onInstalled (fresh wins)", () => {
    expect(chooseMarker({ local: "L", startup: true }, () => "F1")).toEqual({ marker: "F1", source: "chrome-start" });
    expect(chooseMarker({ local: "L", startup: true, installed: "update" }, () => "F2")).toEqual({ marker: "F2", source: "chrome-start" });
  });
  it("onInstalled install/update → storage.local's marker (extension reload), fresh when there is none", () => {
    expect(chooseMarker({ local: "L", startup: false, installed: "update" }, () => "F")).toEqual({ marker: "L", source: "reload" });
    expect(chooseMarker({ local: "L", startup: false, installed: "install" }, () => "F")).toEqual({ marker: "L", source: "reload" });
    expect(chooseMarker({ startup: false, installed: "install" }, () => "F")).toEqual({ marker: "F", source: "reload" });
  });
  it("onInstalled chrome_update / shared_module_update / anything else → fresh (a Chrome update implies a restart)", () => {
    for (const installed of ["chrome_update", "shared_module_update", "weird", ""]) {
      expect(chooseMarker({ local: "L", startup: false, installed }, () => "F")).toEqual({ marker: "F", source: "chrome-update" });
    }
  });
  it("no event → fresh", () => {
    expect(chooseMarker({ local: "L", startup: false }, () => "F")).toEqual({ marker: "F", source: "no-event" });
  });
});

describe("SessionMarker: the five event orders", () => {
  it("1. worker restart: storage.session has a marker → reused at once, no wait, never changed", async () => {
    const { store, writes } = fakeStore({ session: "S-1", local: "S-1" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    expect(await m.current()).toBe("S-1");
    expect(d.waits).toEqual([]);
    expect(store.getLocal).not.toHaveBeenCalled();
    m.installed("update"); // a late event changes nothing
    expect(await m.current()).toBe("S-1");
    expect(writes).toEqual(["S-1"]);
  });

  // 2026-10-23 (S2b fixer 1, verifier F1): was "→ storage.local's marker at once, no wait" — a reload reason
  // now waits out the bound for onStartup before reusing (see the fixer-1 tests below).
  it("2. extension reload: onInstalled(update) → storage.local's marker after the bound, written to both stores", async () => {
    const { store, state } = fakeStore({ local: "L-1" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    m.installed("update");
    const p = m.current();
    await tick();
    expect(d.waits).toEqual([MARKER_WAIT_MS]);
    d.elapse();
    expect(await p).toBe("L-1");
    expect(state).toEqual({ session: "L-1", local: "L-1" });
  });

  it("2b. extension reload with onInstalled arriving after connect() asked, within the bound", async () => {
    const { store } = fakeStore({ local: "L-1" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    const p = m.current();
    await tick();
    expect(d.waits).toEqual([MARKER_WAIT_MS]);
    m.installed("update");
    await tick();
    d.elapse(); // fixer 1: the reuse still waits out the bound for onStartup
    expect(await p).toBe("L-1");
  });

  it("3. Chrome start, onStartup before connect(): fresh, never storage.local's", async () => {
    const { store, state } = fakeStore({ local: "OLD" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    m.startup();
    expect(await m.current()).toBe("fresh-1");
    expect(d.waits).toEqual([]);
    expect(state).toEqual({ session: "fresh-1", local: "fresh-1" });
  });

  it("4. Chrome start, onStartup after connect() within the 2 s bound: fresh, without waiting out the bound", async () => {
    const { store } = fakeStore({ local: "OLD" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    const p = m.current();
    await tick();
    m.startup();
    expect(await p).toBe("fresh-1");
  });

  it("5. neither event within 2 s: fresh (costs leases, never safety)", async () => {
    const { store } = fakeStore({ local: "OLD" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    const p = m.current();
    await tick();
    expect(d.waits).toEqual([2000]);
    d.elapse();
    expect(await p).toBe("fresh-1");
  });
});

describe("SessionMarker: the stage rulings and the edges", () => {
  it("onInstalled chrome_update → fresh; both events → fresh", async () => {
    const a = fakeStore({ local: "OLD" });
    const m1 = new SessionMarker({ store: a.store, random: randoms(), delay: manualDelay().delay });
    m1.installed("chrome_update");
    expect(await m1.current()).toBe("fresh-1");
    const b = fakeStore({ local: "OLD" });
    const m2 = new SessionMarker({ store: b.store, random: randoms(), delay: manualDelay().delay });
    m2.installed("update");
    m2.startup();
    expect(await m2.current()).toBe("fresh-1");
  });

  it("a late onStartup after a reused marker rotates to a fresh one and says so (a restart is never kept)", async () => {
    const { store, state } = fakeStore({ local: "L-1" });
    const rotated: string[] = [];
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay, onRotate: (x) => rotated.push(x) });
    m.installed("update");
    const p = m.current();
    await tick();
    d.elapse(); // fixer 1: onStartup later than the bound — the rotation is the backstop
    expect(await p).toBe("L-1");
    m.startup();
    expect(await m.current()).toBe("fresh-1");
    expect(rotated).toEqual(["fresh-1"]);
    await tick();
    expect(state).toEqual({ session: "fresh-1", local: "fresh-1" });
  });

  it("a late onStartup after a fresh marker changes nothing", async () => {
    const { store } = fakeStore();
    const d = manualDelay();
    const rotated: string[] = [];
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay, onRotate: (x) => rotated.push(x) });
    const p = m.current();
    await tick();
    d.elapse();
    expect(await p).toBe("fresh-1");
    m.startup();
    expect(await m.current()).toBe("fresh-1");
    expect(rotated).toEqual([]);
  });

  it("current() is memoised: one resolution for many callers", async () => {
    const { store } = fakeStore({ session: "S" });
    const m = new SessionMarker({ store, random: randoms(), delay: manualDelay().delay });
    const [x, y] = await Promise.all([m.current(), m.current()]);
    expect([x, y]).toEqual(["S", "S"]);
    expect(store.getSession).toHaveBeenCalledTimes(1);
  });

  it("a failing store is a miss (fresh), never a crash", async () => {
    const store: MarkerStore = {
      getSession: vi.fn(async () => {
        throw new Error("no storage");
      }),
      getLocal: vi.fn(async () => {
        throw new Error("no storage");
      }),
      setBoth: vi.fn(async () => {
        throw new Error("no storage");
      }),
    };
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    m.installed("update");
    const p = m.current();
    await tick();
    d.elapse();
    expect(await p).toBe("fresh-1");
  });
});

describe("SessionMarker: onInstalled before onStartup on a Chrome start (S2b fixer 1, verifier F1)", () => {
  it("onInstalled(update), then onStartup 500 ms later within the bound → a fresh marker, no rotation, storage.local's never handed out", async () => {
    const { store, writes } = fakeStore({ local: "L-OLD" });
    const d = manualDelay();
    const rotated: string[] = [];
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay, onRotate: (x) => rotated.push(x) });
    m.installed("update");
    const p = m.current();
    await tick();
    expect(d.waits).toEqual([MARKER_WAIT_MS]); // one bound, from the start of resolve()
    m.startup(); // "500 ms later": the bound has not ended
    expect(await p).toBe("fresh-1");
    expect(rotated).toEqual([]);
    expect(writes).toEqual(["fresh-1"]);
    expect(d.waits).toEqual([MARKER_WAIT_MS]); // the bound was not restarted
  });

  it("onInstalled(update) alone → storage.local's marker is reused only after the bound ends", async () => {
    const { store } = fakeStore({ local: "L-1" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    m.installed("update");
    let settled: string | undefined;
    const p = m.current().then((x) => (settled = x));
    for (let i = 0; i < 5; i++) await tick();
    expect(settled).toBeUndefined();
    d.elapse();
    await p;
    expect(settled).toBe("L-1");
  });

  it("a worker restart (storage.session hit) never waits, even with onInstalled(update) seen", async () => {
    const { store } = fakeStore({ session: "S-1", local: "S-1" });
    const d = manualDelay();
    const m = new SessionMarker({ store, random: randoms(), delay: d.delay });
    m.installed("update");
    expect(await m.current()).toBe("S-1");
    expect(d.waits).toEqual([]);
  });
});

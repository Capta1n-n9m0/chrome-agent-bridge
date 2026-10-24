/**
 * Step 9 S2a: the safety state module (`extension/src/safety-state.ts`) — the stored keys and their
 * defaults, the per-call read that fails closed (#139), the in-memory copy updated before the write, the
 * toggle's re-arm rule (#144), the options page's setter, and the `safetyState` send decision (#132, S3's
 * handoff). Pure: storage and the clock are injected. Reserved names only.
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes, isSafetyStateEvent } from "@bridge/shared";
import {
  SAFETY_KEYS,
  SAFETY_KEY_NAMES,
  DEFAULT_STORED_SAFETY,
  DISARMED_ALL,
  REARM_GUARD_MS,
  SafetyReporter,
  SafetyStore,
  failClosedView,
  parseStoredSafety,
  reportOf,
  safetyStateFrame,
  toStorageItems,
  touchesSafety,
  writeSafety,
} from "../src/safety-state.js";
import { DISARMED_ALL_MESSAGE } from "../src/safety.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";

/** A fake `storage.local` with a fake clock. `set` records what memory looked like when it ran. */
function fakeStorage(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial };
  let clock = 1_000_000;
  const events: string[] = [];
  let failGet = false;
  let failSet = false;
  const deps = {
    get: vi.fn(async (keys: readonly string[]) => {
      if (failGet) throw new Error("storage get failed");
      const out: Record<string, unknown> = {};
      for (const k of keys) if (k in data) out[k] = data[k];
      return out;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      events.push(`set ${JSON.stringify(items)}`);
      if (failSet) throw new Error("storage set failed");
      Object.assign(data, items);
    }),
    extensionId: OWN_ID,
    now: () => clock,
    onDisarm: vi.fn(() => events.push("onDisarm")),
    onArm: vi.fn(() => events.push("onArm")),
  };
  return {
    data,
    deps,
    events,
    tick: (ms: number) => (clock += ms),
    failGet: (v: boolean) => (failGet = v),
    failSet: (v: boolean) => (failSet = v),
  };
}

describe("stored keys and parsing", () => {
  it("the keys are namespaced and never collide with port, token or the session marker (F36)", () => {
    expect(SAFETY_KEYS).toEqual({ armed: "safety.armed", evaluate: "safety.evaluate", blockList: "safety.blockList" });
    expect([...SAFETY_KEY_NAMES].sort()).toEqual(["safety.armed", "safety.blockList", "safety.evaluate"]);
    for (const k of SAFETY_KEY_NAMES) expect(["port", "token", "sessionMarker"]).not.toContain(k);
  });

  it("missing keys mean the defaults: armed, JavaScript on, an empty list (F10)", () => {
    expect(DEFAULT_STORED_SAFETY).toEqual({ armed: true, evaluate: true, blockList: "" });
    expect(parseStoredSafety({})).toEqual({ armed: true, evaluate: true, blockList: "" });
    expect(parseStoredSafety({ "safety.armed": false })).toEqual({ armed: false, evaluate: true, blockList: "" });
    expect(parseStoredSafety({ "safety.evaluate": false, "safety.blockList": "bank.example" })).toEqual({
      armed: true,
      evaluate: false,
      blockList: "bank.example",
    });
  });

  it("a present key of the wrong type is unreadable (throws, so the gate fails closed)", () => {
    expect(() => parseStoredSafety({ "safety.armed": "false" })).toThrow();
    expect(() => parseStoredSafety({ "safety.evaluate": 0 })).toThrow();
    expect(() => parseStoredSafety({ "safety.blockList": ["bank.example"] })).toThrow();
    expect(() => parseStoredSafety(null)).toThrow();
    expect(() => parseStoredSafety("x")).toThrow();
  });

  it("the thrown error names no key value (no pattern ever in a message)", () => {
    try {
      parseStoredSafety({ "safety.blockList": { secret: "bank.example" } });
      expect.unreachable();
    } catch (err) {
      expect(String((err as Error).message)).not.toContain("bank.example");
    }
  });

  it("toStorageItems maps a partial change onto the keys, nothing else", () => {
    expect(toStorageItems({ armed: false })).toEqual({ "safety.armed": false });
    expect(toStorageItems({ evaluate: true, blockList: "a.example" })).toEqual({
      "safety.evaluate": true,
      "safety.blockList": "a.example",
    });
    expect(toStorageItems({})).toEqual({});
  });

  it("touchesSafety: only a change of a safety key counts (token/port keep their own listener)", () => {
    expect(touchesSafety({ "safety.armed": { newValue: false } })).toBe(true);
    expect(touchesSafety({ "safety.blockList": { newValue: "x" } })).toBe(true);
    expect(touchesSafety({ token: { newValue: "t" }, port: { newValue: 1 } })).toBe(false);
    expect(touchesSafety({})).toBe(false);
  });

  it("DISARMED_ALL is the kill switch's refusal, scope all", () => {
    expect(DISARMED_ALL).toEqual({ code: ErrorCodes.DISARMED, message: DISARMED_ALL_MESSAGE, data: { scope: "all" } });
  });

  it("failClosedView: disarmed, JavaScript off, no pattern", () => {
    const v = failClosedView(OWN_ID);
    expect(v.switches).toEqual({ armed: false, evaluate: false });
    expect(v.ctx.extensionId).toBe(OWN_ID);
    expect(v.blockedCount).toBe(0);
  });
});

describe("SafetyStore.read — per call, after ready, fails closed (#139)", () => {
  it("reads storage.local on every call (no cache): a write by the options page is seen at once", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    expect((await store.read()).switches).toEqual({ armed: true, evaluate: true });
    s.data["safety.armed"] = false; // the options page wrote it; no onChanged delivered yet
    expect((await store.read()).switches.armed).toBe(false);
    s.data["safety.armed"] = true;
    expect((await store.read()).switches.armed).toBe(true);
    // start() loads once, then one get per read
    expect(s.deps.get.mock.calls.length).toBe(4);
  });

  it("waits for the first load (ready) before its own read", async () => {
    const s = fakeStorage();
    const order: string[] = [];
    s.deps.get.mockImplementation(async (keys: readonly string[]) => {
      order.push("get");
      return Object.fromEntries(keys.filter((k) => k in s.data).map((k) => [k, s.data[k]]));
    });
    const store = new SafetyStore(s.deps);
    await store.read();
    expect(order).toEqual(["get", "get"]); // the load, then the call's read
    expect(store.memory).not.toBeNull();
  });

  it("a failed read rejects (the caller refuses with stateUnreadableRefusal)", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    await store.start();
    s.failGet(true);
    await expect(store.read()).rejects.toThrow();
  });

  it("a wrong-typed key rejects too", async () => {
    const s = fakeStorage({ "safety.armed": "no" });
    const store = new SafetyStore(s.deps);
    await expect(store.read()).rejects.toThrow();
  });

  it("the view carries the parsed block list, the own id and the valid-pattern count", async () => {
    const s = fakeStorage({ "safety.blockList": "bank.example\nnot a host!\n# comment\n*.mail.example" });
    const store = new SafetyStore(s.deps);
    const v = await store.read();
    expect(v.ctx.extensionId).toBe(OWN_ID);
    expect(v.blockedCount).toBe(2);
    expect(v.ctx.blockList.blockedCount).toBe(2);
    expect(reportOf(v)).toEqual({ armed: true, evaluate: true, blockedCount: 2 });
  });

  it("a disarm in memory wins over a storage read that still says armed (the write in flight)", async () => {
    const s = fakeStorage();
    let release!: () => void;
    const store = new SafetyStore(s.deps);
    await store.start();
    s.deps.set.mockImplementation(() => new Promise<void>((r) => (release = r)));
    const t = store.toggle(); // memory → disarmed now; the write hangs
    await Promise.resolve();
    await Promise.resolve();
    expect(s.data["safety.armed"]).toBeUndefined(); // storage still armed (absent = default)
    expect((await store.read()).switches.armed).toBe(false);
    release();
    await t;
  });
});

describe("SafetyStore.toggle — the button and the shortcut (#144)", () => {
  it("armed → disarmed at once; memory is updated before the storage write; onDisarm before the write", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    await store.start();
    let memoryAtWrite: unknown;
    s.deps.set.mockImplementation(async (items: Record<string, unknown>) => {
      memoryAtWrite = store.memory;
      s.events.push("set");
      Object.assign(s.data, items);
    });
    expect(await store.toggle()).toBe("disarmed");
    expect(memoryAtWrite).toMatchObject({ armed: false });
    expect(s.events).toEqual(["onDisarm", "set"]);
    expect(s.data["safety.armed"]).toBe(false);
  });

  it("a re-arm within 1 000 ms of the last disarm is ignored; the state stays disarmed", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    await store.start();
    expect(REARM_GUARD_MS).toBe(1000);
    expect(await store.toggle()).toBe("disarmed");
    s.tick(999);
    expect(await store.toggle()).toBe("ignored");
    expect(s.data["safety.armed"]).toBe(false);
    expect(s.deps.onArm).not.toHaveBeenCalled();
    s.tick(1); // exactly 1 000 ms after the disarm
    expect(await store.toggle()).toBe("armed");
    expect(s.data["safety.armed"]).toBe(true);
    expect(s.deps.onArm).toHaveBeenCalledTimes(1);
  });

  it("a disarm is never debounced: arm → disarm right after the re-arm takes effect", async () => {
    const s = fakeStorage({ "safety.armed": false });
    const store = new SafetyStore(s.deps);
    await store.start();
    expect(await store.toggle()).toBe("armed"); // loaded disarmed: no disarm was observed, so no guard
    s.tick(1);
    expect(await store.toggle()).toBe("disarmed");
    s.tick(1);
    expect(await store.toggle()).toBe("ignored");
  });

  it("a disarm the options page made (onChanged) also starts the re-arm guard", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    await store.start();
    store.applyChanges({ "safety.armed": { newValue: false } });
    expect(s.deps.onDisarm).toHaveBeenCalledTimes(1);
    s.tick(500);
    s.data["safety.armed"] = false;
    expect(await store.toggle()).toBe("ignored");
  });

  it("the worker's first load of a disarmed state is not a disarm: a click right after a wake re-arms", async () => {
    const s = fakeStorage({ "safety.armed": false });
    const store = new SafetyStore(s.deps);
    // no start(): the click woke the worker
    expect(await store.toggle()).toBe("armed");
  });

  it("two clicks at once are serialised: disarm, then the re-arm is ignored", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    const [a, b] = await Promise.all([store.toggle(), store.toggle()]);
    expect([a, b]).toEqual(["disarmed", "ignored"]);
  });

  it("an unreadable state toggles toward disarmed (the safe direction)", async () => {
    const s = fakeStorage({ "safety.armed": 7 });
    const store = new SafetyStore(s.deps);
    expect(await store.toggle()).toBe("disarmed");
    expect(s.deps.set).toHaveBeenCalledWith({ "safety.armed": false });
  });

  it("only the armed key is written by the toggle", async () => {
    const s = fakeStorage({ "safety.blockList": "bank.example" });
    const store = new SafetyStore(s.deps);
    await store.toggle();
    expect(s.deps.set).toHaveBeenCalledWith({ "safety.armed": false });
  });
});

describe("SafetyStore memory — the webRequest view and onChanged", () => {
  it("ingestView is null until the first load, then the memory copy", async () => {
    const s = fakeStorage({ "safety.blockList": "bank.example" });
    const store = new SafetyStore(s.deps);
    expect(store.ingestView()).toBeNull();
    await store.start();
    const v = store.ingestView()!;
    expect(v.switches.armed).toBe(true);
    expect(v.blockedCount).toBe(1);
  });

  it("an unreadable stored state gives a fail-closed ingest view (disarmed)", async () => {
    const s = fakeStorage({ "safety.armed": "x" });
    const store = new SafetyStore(s.deps);
    await store.start();
    expect(store.ingestView()!.switches.armed).toBe(false);
  });

  it("a failed first read leaves the view unknown (events stay buffered), and a later change fills it", async () => {
    const s = fakeStorage();
    s.failGet(true);
    const store = new SafetyStore(s.deps);
    await store.start();
    expect(store.ingestView()).toBeNull();
    store.applyChanges({ "safety.armed": { newValue: true } });
    expect(store.ingestView()!.switches.armed).toBe(true);
  });

  it("applyChanges merges new values over memory; a removed key falls back to its default", async () => {
    const s = fakeStorage({ "safety.armed": false, "safety.evaluate": false });
    const store = new SafetyStore(s.deps);
    await store.start();
    store.applyChanges({ "safety.evaluate": { newValue: true } });
    expect(store.memory).toMatchObject({ armed: false, evaluate: true });
    store.applyChanges({ "safety.armed": { oldValue: false } }); // removed
    expect(store.memory).toMatchObject({ armed: true });
    expect(s.deps.onArm).toHaveBeenCalledTimes(1);
  });

  it("a wrong-typed new value makes the memory fail closed", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    await store.start();
    store.applyChanges({ "safety.armed": { newValue: "yes" } });
    expect(store.ingestView()!.switches.armed).toBe(false);
    expect(s.deps.onDisarm).toHaveBeenCalledTimes(1);
  });

  it("onDisarm fires once per transition, not on a repeated disarmed value", async () => {
    const s = fakeStorage();
    const store = new SafetyStore(s.deps);
    await store.start();
    store.applyChanges({ "safety.armed": { newValue: false } });
    store.applyChanges({ "safety.armed": { newValue: false } });
    expect(s.deps.onDisarm).toHaveBeenCalledTimes(1);
  });
});

describe("writeSafety — the options page's setter (#144: not debounced)", () => {
  it("writes the mapped keys at once, every time", async () => {
    const set = vi.fn(async () => {});
    await writeSafety(set, { armed: false });
    await writeSafety(set, { armed: true });
    await writeSafety(set, { armed: false });
    await writeSafety(set, { evaluate: false, blockList: "bank.example" });
    expect(set.mock.calls).toEqual([
      [{ "safety.armed": false }],
      [{ "safety.armed": true }],
      [{ "safety.armed": false }],
      [{ "safety.evaluate": false, "safety.blockList": "bank.example" }],
    ]);
  });
});

describe("SafetyReporter — the safetyState event (#132; S3 handoff)", () => {
  const A = { armed: true, evaluate: true, blockedCount: 0 };
  const B = { armed: false, evaluate: true, blockedCount: 0 };

  it("the frame is exactly {event:'safetyState', params:{armed, evaluate, blockedCount}} with no id", () => {
    const frame = JSON.parse(safetyStateFrame({ ...A, blockedCount: 3 }));
    expect(frame).toEqual({ event: "safetyState", params: { armed: true, evaluate: true, blockedCount: 3 } });
    expect(isSafetyStateEvent(frame)).toBe(true);
    expect("id" in frame).toBe(false);
  });

  it("the frame carries only the three fields, whatever else the object has", () => {
    const extra = { ...A, blockList: "bank.example", patterns: ["bank.example"] } as unknown as typeof A;
    const text = safetyStateFrame(extra);
    expect(text).not.toContain("bank.example");
    expect(Object.keys(JSON.parse(text).params).sort()).toEqual(["armed", "blockedCount", "evaluate"]);
  });

  it("nothing is sent while the connection is down", () => {
    const r = new SafetyReporter();
    expect(r.offer(A)).toBeNull();
  });

  it("sent when the connection comes up, even if the same state was sent on the previous connection", () => {
    const r = new SafetyReporter();
    r.connectionUp();
    expect(r.offer(A)).not.toBeNull();
    r.connectionDown();
    r.connectionUp();
    expect(r.offer(A)).not.toBeNull();
  });

  it("sent on every change of any field, not when unchanged", () => {
    const r = new SafetyReporter();
    r.connectionUp();
    expect(r.offer(A)).not.toBeNull();
    expect(r.offer({ ...A })).toBeNull();
    expect(r.offer(B)).not.toBeNull();
    expect(r.offer({ ...B, evaluate: false })).not.toBeNull();
    expect(r.offer({ ...B, evaluate: false, blockedCount: 1 })).not.toBeNull();
    expect(r.offer({ ...B, evaluate: false, blockedCount: 1 })).toBeNull();
  });

  it("after a drop, nothing is sent until the next connectionUp", () => {
    const r = new SafetyReporter();
    r.connectionUp();
    r.offer(A);
    r.connectionDown();
    expect(r.offer(B)).toBeNull();
  });
});

/**
 * Step 9 S2c (decisions.md · 2026-10-24 · A fix stage S2c before S4 … (#189); S2b.md §6 finding 1): a re-arm
 * whose `storage.local` write is rejected must not leave the memory copy armed. The toggle still rejects (#174),
 * but the memory copy returns to disarmed (so `ingestView()` and `read()` say disarmed and `onDisarm` fires,
 * fail closed), the last-disarm time is not moved (the human did not disarm: the next press is a retry, not
 * "ignored"), and a storage change that landed while the write was pending stands. The ingest half is checked
 * through the real `NetworkIngestGate` + `NetworkLog`. Pure: storage and the clock are injected.
 */
import { describe, it, expect, vi } from "vitest";
import { REARM_GUARD_MS, SafetyStore } from "../src/safety-state.js";
import { NetworkIngestGate } from "../src/safety-network.js";
import { NetworkLog, type WebRequestDetails, type WebRequestEvent } from "../src/network-log.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";

/** A fake `storage.local` with a fake clock; `set` rejects the arm write (`{"safety.armed": true}`) while `failArm`. */
function harness(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial };
  let clock = 1_000_000;
  let failArm = true;
  const events: string[] = [];
  const deps = {
    get: vi.fn(async (keys: readonly string[]) => {
      const out: Record<string, unknown> = {};
      for (const k of keys) if (k in data) out[k] = data[k];
      return out;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      events.push(`set ${JSON.stringify(items)}`);
      if (failArm && items["safety.armed"] === true) throw new Error("storage set failed");
      Object.assign(data, items);
    }),
    extensionId: OWN_ID,
    now: () => clock,
    onDisarm: vi.fn(() => events.push("onDisarm")),
    onArm: vi.fn(() => events.push("onArm")),
  };
  const store = new SafetyStore(deps);
  return { data, deps, events, store, tick: (ms: number) => (clock += ms), failArm: (v: boolean) => (failArm = v) };
}

describe("S2c — a re-arm whose write is rejected leaves the state disarmed", () => {
  it("the toggle rejects; memory, ingestView() and read() say disarmed; onDisarm fires after onArm", async () => {
    const h = harness();
    await h.store.start();
    expect(await h.store.toggle()).toBe("disarmed"); // the human's real disarm
    h.tick(REARM_GUARD_MS + 500);
    h.events.length = 0;
    h.deps.onArm.mockClear();
    h.deps.onDisarm.mockClear();

    await expect(h.store.toggle()).rejects.toThrow("storage set failed");

    expect(h.data["safety.armed"]).toBe(false); // storage still says OFF
    expect(h.store.memory).toMatchObject({ armed: false, evaluate: true, blockList: "" });
    expect(h.store.ingestView()!.switches.armed).toBe(false);
    expect((await h.store.read()).switches.armed).toBe(false);
    // memory went armed before the write (onArm), then back (onDisarm): net state disarmed, fail closed
    expect(h.events).toEqual(["onArm", 'set {"safety.armed":true}', "onDisarm"]);
    expect(h.deps.onArm).toHaveBeenCalledTimes(1);
    expect(h.deps.onDisarm).toHaveBeenCalledTimes(1);
  });

  it("the other fields survive the revert (JavaScript off and the block list stay as they were)", async () => {
    const h = harness({ "safety.armed": false, "safety.evaluate": false, "safety.blockList": "bank.example" });
    await h.store.start();
    await expect(h.store.toggle()).rejects.toThrow();
    expect(h.store.memory).toEqual({ armed: false, evaluate: false, blockList: "bank.example" });
    expect(h.store.ingestView()!.blockedCount).toBe(1);
  });

  it("the next press right after the failure is a retry of the re-arm (not a disarm, not 'ignored')", async () => {
    const h = harness();
    await h.store.start();
    expect(await h.store.toggle()).toBe("disarmed"); // lastDisarmAt = t0
    h.tick(REARM_GUARD_MS); // exactly the guard after the human's real disarm
    await expect(h.store.toggle()).rejects.toThrow();
    h.failArm(false);
    // no time passes: the guard is measured from the human's disarm (t0), not from the failed write's revert
    expect(await h.store.toggle()).toBe("armed");
    expect(h.data["safety.armed"]).toBe(true);
    expect(h.store.ingestView()!.switches.armed).toBe(true);
  });

  it("after a worker-start load of a disarmed state, a failed arm then a retry arms (the load set no guard)", async () => {
    const h = harness({ "safety.armed": false });
    await h.store.start();
    await expect(h.store.toggle()).rejects.toThrow();
    h.failArm(false);
    expect(await h.store.toggle()).toBe("armed");
  });

  it("the guard still holds against the human's real disarm: a press within 1 000 ms of it is ignored, not attempted", async () => {
    const h = harness();
    await h.store.start();
    expect(await h.store.toggle()).toBe("disarmed");
    h.tick(REARM_GUARD_MS - 1);
    expect(await h.store.toggle()).toBe("ignored");
    expect(h.deps.set).toHaveBeenCalledTimes(1); // only the disarm's write
  });

  it("a storage change that landed while the arm write was pending stands (no revert)", async () => {
    const h = harness({ "safety.armed": false });
    await h.store.start();
    let reject!: (e: Error) => void;
    h.deps.set.mockImplementationOnce(() => new Promise<void>((_, rj) => (reject = rj)));
    const t = h.store.toggle();
    await vi.waitFor(() => expect(h.deps.set).toHaveBeenCalledTimes(1));
    expect(h.store.memory).toMatchObject({ armed: true });
    // the options page armed and turned JavaScript off meanwhile; its write succeeded
    h.data["safety.armed"] = true;
    h.data["safety.evaluate"] = false;
    h.store.applyChanges({ "safety.armed": { newValue: true }, "safety.evaluate": { oldValue: true, newValue: false } });
    const newer = h.store.memory;
    h.deps.onDisarm.mockClear();
    reject(new Error("storage set failed"));
    await expect(t).rejects.toThrow("storage set failed");
    expect(h.store.memory).toBe(newer);
    expect(h.store.memory).toMatchObject({ armed: true, evaluate: false });
    expect(h.deps.onDisarm).not.toHaveBeenCalled();
  });
});

describe("S2c — the network ingest after a failed re-arm (real NetworkIngestGate + NetworkLog)", () => {
  it("an event after the failed re-arm is dropped as disarmed; after a successful retry it is recorded", async () => {
    const h = harness({ "safety.armed": false });
    await h.store.start();
    const log = new NetworkLog({ now: () => 5000 });
    const gate = new NetworkIngestGate({
      ingest: (e: WebRequestEvent, d: WebRequestDetails) => log.ingest(e, d),
      discard: (id) => log.discard(id),
      tabUrl: () => "http://localhost:8080/",
      view: () => h.store.ingestView(),
    });
    const ev = (id: string): WebRequestDetails => ({ requestId: id, url: "http://localhost:8080/app.js", method: "GET", type: "script", tabId: 5, timeStamp: 1000 });

    await expect(h.store.toggle()).rejects.toThrow();
    gate.offer("onBeforeRequest", ev("r1"));
    gate.offer("onCompleted", { ...ev("r1"), statusCode: 200 });
    expect(log.query({ tabId: "all", limit: 500 }).entries).toHaveLength(0);

    h.failArm(false);
    expect(await h.store.toggle()).toBe("armed");
    gate.offer("onBeforeRequest", ev("r2"));
    const entries = log.query({ tabId: "all", limit: 500 }).entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ url: "http://localhost:8080/app.js" });
  });
});

/**
 * S2c fixer round 1 (verifier F1): the revert must not depend on the memory copy's object identity.
 * `applyChanges` merges a change over the memory copy, so a change to only the block list or the JavaScript
 * switch while the arm write is pending carries the unsaved `armed: true` forward. Rule (step agent, D2
 * amended): after a rejected arm write memory's `armed` returns to false (the newer other fields stand),
 * `onDisarm` fires, the last-disarm time is not moved — unless a change that touched `safety.armed` landed after
 * this toggle's apply. An unreadable memory copy stays unreadable.
 */
describe("S2c fixer 1 — a change that does not touch `armed` during the pending arm write does not stop the revert", () => {
  /** Disarm at t0, wait the guard, start a re-arm whose write stays pending; returns its reject and promise. */
  async function pendingArm(h: ReturnType<typeof harness>) {
    await h.store.start();
    expect(await h.store.toggle()).toBe("disarmed"); // the human's real disarm, t0
    h.tick(REARM_GUARD_MS); // exactly the guard
    let reject!: (e: Error) => void;
    h.deps.set.mockImplementationOnce(() => new Promise<void>((_, rj) => (reject = rj)));
    const t = h.store.toggle();
    await vi.waitFor(() => expect(h.deps.set).toHaveBeenCalledTimes(2));
    expect(h.store.memory).toMatchObject({ armed: true });
    h.deps.onArm.mockClear();
    h.deps.onDisarm.mockClear();
    return { t, reject: (e: Error) => reject(e) };
  }

  it.each([
    ["the block list only", { "safety.blockList": { oldValue: "", newValue: "bank.example" } }, { evaluate: true, blockList: "bank.example" }],
    ["the JavaScript switch only", { "safety.evaluate": { oldValue: true, newValue: false } }, { evaluate: false, blockList: "" }],
  ] as const)("a change to %s: memory, ingestView() and read() say disarmed; the newer field stands; the next press is a retry", async (_label, change, rest) => {
    const h = harness();
    const { t, reject } = await pendingArm(h);
    // the options page saved that field meanwhile; its write succeeded
    for (const [k, v] of Object.entries(change)) h.data[k] = (v as { newValue: unknown }).newValue;
    h.store.applyChanges(change);
    expect(h.store.memory).toMatchObject({ armed: true }); // the merge carried the unsaved armed: true forward
    reject(new Error("storage set failed"));
    await expect(t).rejects.toThrow("storage set failed");

    expect(h.data["safety.armed"]).toBe(false);
    expect(h.store.memory).toEqual({ armed: false, ...rest });
    expect(h.store.ingestView()!.switches.armed).toBe(false);
    expect((await h.store.read()).switches.armed).toBe(false);
    expect(h.deps.onDisarm).toHaveBeenCalledTimes(1);
    expect(h.deps.onArm).not.toHaveBeenCalled();

    // the last-disarm time was not moved: no time passes, and the next press past the guard is a retry
    h.failArm(false);
    expect(await h.store.toggle()).toBe("armed");
    expect(h.store.memory).toEqual({ armed: true, ...rest });
  });

  it("a change that touched `armed` and then one that touched only the block list: the armed state stands", async () => {
    const h = harness();
    const { t, reject } = await pendingArm(h);
    h.data["safety.armed"] = true;
    h.store.applyChanges({ "safety.armed": { oldValue: false, newValue: true } });
    h.data["safety.blockList"] = "bank.example";
    h.store.applyChanges({ "safety.blockList": { oldValue: "", newValue: "bank.example" } });
    reject(new Error("storage set failed"));
    await expect(t).rejects.toThrow("storage set failed");
    expect(h.store.memory).toEqual({ armed: true, evaluate: true, blockList: "bank.example" });
    expect(h.deps.onDisarm).not.toHaveBeenCalled();
  });

  it("a change that touched `armed` (to false) during the write: no second onDisarm, memory disarmed", async () => {
    const h = harness();
    const { t, reject } = await pendingArm(h);
    h.store.applyChanges({ "safety.armed": { oldValue: false, newValue: false } });
    expect(h.deps.onDisarm).toHaveBeenCalledTimes(1);
    reject(new Error("storage set failed"));
    await expect(t).rejects.toThrow("storage set failed");
    expect(h.store.memory).toMatchObject({ armed: false });
    expect(h.deps.onDisarm).toHaveBeenCalledTimes(1);
  });

  it("an unreadable memory copy (a wrong-typed change during the write) stays unreadable", async () => {
    const h = harness();
    const { t, reject } = await pendingArm(h);
    h.store.applyChanges({ "safety.blockList": { newValue: 42 } });
    expect(h.store.memory).toEqual({ unreadable: true });
    expect(h.deps.onDisarm).toHaveBeenCalledTimes(1);
    reject(new Error("storage set failed"));
    await expect(t).rejects.toThrow("storage set failed");
    expect(h.store.memory).toEqual({ unreadable: true });
    expect(h.deps.onDisarm).toHaveBeenCalledTimes(1);
  });
});

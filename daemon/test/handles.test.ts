import { describe, it, expect } from "vitest";
import { HandleTable, DEAD_KEEP_MS, DEAD_KEEP_MAX } from "../src/handles.js";

/** Step 7 T2 (phase doc 0.2): the handle table, pure, with an injected clock. */

function table(start = 1_000) {
  let t = start;
  const handles = new HandleTable({ now: () => t });
  return { handles, set: (ms: number) => (t = ms), advance: (ms: number) => (t += ms), now: () => t };
}

describe("HandleTable — mint / resolve / handleOf", () => {
  it("mints T1, T2, … and is idempotent per live tab", () => {
    const { handles } = table();
    expect(handles.mint(412)).toBe("T1");
    expect(handles.mint(388)).toBe("T2");
    expect(handles.mint(412)).toBe("T1");
    expect(handles.handleOf(412)).toBe("T1");
    expect(handles.handleOf(999)).toBeUndefined();
  });

  it("resolves live, gone and unknown", () => {
    const { handles } = table();
    const h = handles.mint(7);
    expect(handles.resolve(h)).toEqual({ kind: "live", tabId: 7 });
    expect(handles.resolve("T99")).toEqual({ kind: "unknown" });
    expect(handles.resolve("nonsense")).toEqual({ kind: "unknown" });
    handles.remove(7, { lastUrl: "u", lastTitle: "t" });
    expect(handles.resolve(h)).toEqual({ kind: "gone", lastUrl: "u", lastTitle: "t" });
  });

  it("never reuses a number, even after a tab id comes back", () => {
    const { handles } = table();
    expect(handles.mint(5)).toBe("T1");
    handles.remove(5, {});
    expect(handles.mint(5)).toBe("T2");
    expect(handles.resolve("T1").kind).toBe("gone");
    expect(handles.resolve("T2")).toEqual({ kind: "live", tabId: 5 });
  });
});

describe("HandleTable — remove and the url/title cache", () => {
  it("returns the handle; event values win over the cache", () => {
    const { handles } = table();
    handles.mint(1);
    handles.note(1, { url: "cached-url", title: "cached-title" });
    expect(handles.remove(1, { lastUrl: "event-url" })).toBe("T1");
    expect(handles.resolve("T1")).toEqual({ kind: "gone", lastUrl: "event-url", lastTitle: "cached-title" });
  });

  it("falls back to the cache and omits fields neither side has", () => {
    const { handles } = table();
    handles.mint(1);
    handles.note(1, { url: "c" });
    handles.remove(1, {});
    expect(handles.resolve("T1")).toEqual({ kind: "gone", lastUrl: "c" });
    handles.mint(2);
    handles.remove(2, {});
    const gone = handles.resolve("T2");
    expect(gone).toEqual({ kind: "gone" });
    expect(Object.keys(gone)).toEqual(["kind"]);
  });

  it("returns undefined for a tab without a handle", () => {
    const { handles } = table();
    expect(handles.remove(42, {})).toBeUndefined();
  });

  it("note on an unknown tab does nothing; live() lists handle, tabId, url in mint order", () => {
    const { handles } = table();
    handles.note(9, { url: "x" });
    handles.mint(3);
    handles.mint(4);
    handles.note(4, { url: "four", title: "Four" });
    expect(handles.live()).toEqual([
      { handle: "T1", tabId: 3 },
      { handle: "T2", tabId: 4, url: "four" },
    ]);
    expect(handles.cached("T2")).toEqual({ url: "four", title: "Four" });
  });

  it("lastHandleOf finds the live handle, else the newest dead one", () => {
    const { handles } = table();
    handles.mint(8);
    expect(handles.lastHandleOf(8)).toBe("T1");
    handles.remove(8, {});
    expect(handles.lastHandleOf(8)).toBe("T1");
    expect(handles.lastHandleOf(80)).toBeUndefined();
  });
});

describe("HandleTable — replace", () => {
  it("the removed tab's handle now names the added tab", () => {
    const { handles } = table();
    handles.mint(10);
    expect(handles.replace(10, 11)).toEqual({ handle: "T1" });
    expect(handles.resolve("T1")).toEqual({ kind: "live", tabId: 11 });
    expect(handles.handleOf(11)).toBe("T1");
    expect(handles.handleOf(10)).toBeUndefined();
  });

  it("mints for the added tab when the removed one had no handle (idempotent if it has one)", () => {
    const { handles } = table();
    expect(handles.replace(20, 21)).toEqual({ handle: "T1" });
    expect(handles.resolve("T1")).toEqual({ kind: "live", tabId: 21 });
    expect(handles.replace(22, 21)).toEqual({ handle: "T1" });
  });

  it("an added tab's own fresh handle is retired as gone when unleased", () => {
    const { handles } = table();
    handles.mint(30); // T1, the removed tab
    handles.mint(31); // T2, the added tab's own handle
    expect(handles.replace(30, 31, () => false)).toEqual({ handle: "T1", retired: "T2" });
    expect(handles.resolve("T1")).toEqual({ kind: "live", tabId: 31 });
    expect(handles.resolve("T2").kind).toBe("gone");
  });

  it("keeps a leased added-tab handle when the removed tab's handle is unleased", () => {
    const { handles } = table();
    handles.mint(30); // T1, unleased
    handles.mint(31); // T2, leased
    expect(handles.replace(30, 31, (h) => h === "T2")).toEqual({ handle: "T2", retired: "T1" });
    expect(handles.resolve("T2")).toEqual({ kind: "live", tabId: 31 });
    expect(handles.resolve("T1").kind).toBe("gone");
  });

  it("both leased: the removed tab's handle wins", () => {
    const { handles } = table();
    handles.mint(30);
    handles.mint(31);
    expect(handles.replace(30, 31, () => true)).toEqual({ handle: "T1", retired: "T2" });
  });

  it("replacing a tab with itself is a no-op", () => {
    const { handles } = table();
    handles.mint(5);
    expect(handles.replace(5, 5)).toEqual({ handle: "T1" });
    expect(handles.resolve("T1")).toEqual({ kind: "live", tabId: 5 });
  });
});

describe("HandleTable — prune", () => {
  it("keeps a dead handle for 1 h, then forgets it", () => {
    const { handles, advance, now } = table();
    handles.mint(1);
    handles.remove(1, { lastUrl: "u" });
    advance(DEAD_KEEP_MS);
    handles.prune(now());
    expect(handles.resolve("T1").kind).toBe("gone");
    advance(1);
    handles.prune(now());
    expect(handles.resolve("T1")).toEqual({ kind: "unknown" });
  });

  it("keeps at most 1 000 dead handles, dropping the oldest first", () => {
    const { handles, advance, now } = table();
    expect(DEAD_KEEP_MAX).toBe(1000);
    for (let i = 0; i < 1002; i++) {
      handles.mint(i);
      handles.remove(i, {});
      advance(1);
    }
    handles.prune(now());
    expect(handles.resolve("T1")).toEqual({ kind: "unknown" });
    expect(handles.resolve("T2")).toEqual({ kind: "unknown" });
    expect(handles.resolve("T3").kind).toBe("gone");
    expect(handles.resolve("T1002").kind).toBe("gone");
    // Live handles are never pruned.
    handles.mint(5000);
    advance(10 * DEAD_KEEP_MS);
    handles.prune(now());
    expect(handles.resolve("T1003")).toEqual({ kind: "live", tabId: 5000 });
    expect(handles.resolve("T1002")).toEqual({ kind: "unknown" });
  });
});

import { describe, it, expect } from "vitest";
import { isHello, isTabCreatedEvent, isTabRemovedEvent, isTabReplacedEvent } from "@bridge/shared";
import {
  TabInfoCache,
  eventFrame,
  tabCreatedParams,
  tabRemovedParams,
  tabReplacedParams,
  joinedTabCreated,
} from "../src/tab-events.js";
import { helloFrame } from "../src/client.js";

const parse = (s: string) => JSON.parse(s) as Record<string, unknown>;

describe("tab event frames", () => {
  it("tabCreated: passes the guard, has no id, never null; url from pendingUrl first", () => {
    const frame = eventFrame("tabCreated", tabCreatedParams({ id: 5, pendingUrl: "http://localhost:8080/p", url: "" })!);
    expect(isTabCreatedEvent(parse(frame))).toBe(true);
    expect(parse(frame)).not.toHaveProperty("id");
    expect(frame).not.toContain("null");
    expect(parse(frame)).toEqual({ event: "tabCreated", params: { tabId: 5, url: "http://localhost:8080/p" } });
  });

  it("tabCreated: openerTabId only when defined; url falls back to url, then \"\"", () => {
    expect(tabCreatedParams({ id: 6, url: "about:blank", openerTabId: 2 })).toEqual({ tabId: 6, url: "about:blank", openerTabId: 2 });
    const bare = tabCreatedParams({ id: 7 })!;
    expect(bare).toEqual({ tabId: 7, url: "" });
    expect("openerTabId" in bare).toBe(false);
    expect(isTabCreatedEvent(parse(eventFrame("tabCreated", bare)))).toBe(true);
    expect(tabCreatedParams({})).toBeNull();
  });

  it("tabRemoved: lastUrl/lastTitle only when known", () => {
    const full = eventFrame("tabRemoved", tabRemovedParams(9, { url: "http://x/", title: "X" }));
    expect(isTabRemovedEvent(parse(full))).toBe(true);
    expect(parse(full).params).toEqual({ tabId: 9, lastUrl: "http://x/", lastTitle: "X" });

    const none = eventFrame("tabRemoved", tabRemovedParams(9, undefined));
    expect(isTabRemovedEvent(parse(none))).toBe(true);
    expect(parse(none).params).toEqual({ tabId: 9 });

    const empty = tabRemovedParams(9, { url: "", title: "" });
    expect(empty).toEqual({ tabId: 9 });
    for (const f of [full, none]) {
      expect(f).not.toContain("null");
      expect(parse(f)).not.toHaveProperty("id");
    }
  });

  it("tabReplaced: passes the guard", () => {
    const frame = eventFrame("tabReplaced", tabReplacedParams(20, 10));
    expect(isTabReplacedEvent(parse(frame))).toBe(true);
    expect(parse(frame)).toEqual({ event: "tabReplaced", params: { addedTabId: 20, removedTabId: 10 } });
    expect(frame).not.toContain("null");
  });
});

describe("TabInfoCache", () => {
  it("update keeps the last known url/title; changed fields win", () => {
    const c = new TabInfoCache();
    c.update(1, { url: "http://a/" });
    c.update(1, { title: "A" });
    expect(c.get(1)).toEqual({ url: "http://a/", title: "A" });
    c.update(1, { url: "http://b/" }, { url: "http://stale/", title: "B" });
    expect(c.get(1)).toEqual({ url: "http://b/", title: "B" });
    c.update(1, {}, { url: "", title: "" });
    expect(c.get(1)).toEqual({ url: "http://b/", title: "B" });
  });

  it("fill only sets ids not already present (live wins)", () => {
    const c = new TabInfoCache();
    c.update(1, { url: "http://live/" });
    c.fill([
      { id: 1, url: "http://refill/", title: "R" },
      { id: 2, url: "http://two/", title: "Two" },
      { url: "http://no-id/" },
    ]);
    expect(c.get(1)).toEqual({ url: "http://live/" });
    expect(c.get(2)).toEqual({ url: "http://two/", title: "Two" });
    expect(c.size).toBe(2);
  });

  it("take removes and returns", () => {
    const c = new TabInfoCache();
    c.update(3, { url: "http://c/" });
    expect(c.take(3)).toEqual({ url: "http://c/" });
    expect(c.get(3)).toBeUndefined();
    expect(c.take(3)).toBeUndefined();
  });

  it("move hands the removed tab's entry to the added id", () => {
    const c = new TabInfoCache();
    c.update(10, { url: "http://old/", title: "Old" });
    c.move(10, 20);
    expect(c.get(10)).toBeUndefined();
    expect(c.get(20)).toEqual({ url: "http://old/", title: "Old" });
  });

  it("move keeps the added id's own entry", () => {
    const c = new TabInfoCache();
    c.update(10, { url: "http://old/" });
    c.update(20, { url: "http://new/" });
    c.move(10, 20);
    expect(c.get(20)).toEqual({ url: "http://new/" });
    expect(c.get(10)).toBeUndefined();
  });
});

describe("extension hello (#42)", () => {
  it("is a v2 hello with role extension and proto 2", () => {
    const h = parse(helloFrame("tok"));
    expect(isHello(h)).toBe(true);
    expect(h).toEqual({ type: "hello", token: "tok", role: "extension", proto: 2, features: ["evaluateArgs", "uploadChooser"] });
  });
});

describe("extension hello carries the session marker (Step 8 S2b.5, decisions.md #74, #80)", () => {
  it("adds session when a marker is given; omits it when none or empty", () => {
    const h = parse(helloFrame("tok", "marker-1"));
    expect(isHello(h)).toBe(true);
    expect(h).toEqual({ type: "hello", token: "tok", role: "extension", proto: 2, session: "marker-1", features: ["evaluateArgs", "uploadChooser"] });
    expect(parse(helloFrame("tok", ""))).toEqual({ type: "hello", token: "tok", role: "extension", proto: 2, features: ["evaluateArgs", "uploadChooser"] });
    expect(parse(helloFrame("tok", undefined))).toEqual({ type: "hello", token: "tok", role: "extension", proto: 2, features: ["evaluateArgs", "uploadChooser"] });
  });
});

describe("joinedTabCreated (Step 13 S1, #385): the joined opener replaces Chrome's", () => {
  const params = { tabId: 9, url: "", openerTabId: 4 }; // 4: Chrome's value, the window's active tab
  it("joined: openerTabId is the navigation source", () => {
    expect(joinedTabCreated(params, 2)).toEqual({ tabId: 9, url: "", openerTabId: 2 });
  });
  it("not joined: no openerTabId at all, never Chrome's value", () => {
    const out = joinedTabCreated(params, undefined);
    expect(out).toEqual({ tabId: 9, url: "" });
    expect("openerTabId" in out).toBe(false);
    expect(isTabCreatedEvent(parse(eventFrame("tabCreated", out)))).toBe(true);
  });
  it("a tab without Chrome's openerTabId is unchanged (the same object)", () => {
    const bare = tabCreatedParams({ id: 7 })!;
    expect(joinedTabCreated(bare, undefined)).toBe(bare);
  });
});

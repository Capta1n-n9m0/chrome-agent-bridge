/**
 * Step 9 S2a: the per-call gate (`extension/src/safety-call.ts`) — which targets each method is tested by
 * (S1's handoff), how a tab is read (live, replaced, gone with its last URL — the R2-1 NIT), the receipt,
 * effect and post phases, fail-closed reads (#139), the download final-URL check (#140), the listTabs
 * redaction (#134), the network query filter (#137 item 6) and the relay sender check (#139, F19, V6).
 * Pure: the state and the tabs are injected. Reserved names only.
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import {
  CallSafety,
  acceptRelaySender,
  callTargets,
  resolveTabTarget,
  tabIdOf,
  type CallSafetyDeps,
} from "../src/safety-call.js";
import { METHOD_CLASSES, STATE_UNREADABLE_MESSAGE, type SafetyTarget } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import type { SafetyView } from "../src/safety-state.js";
import { BridgeError } from "../src/errors.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const OWN_PAGE = `chrome-extension://${OWN_ID}/options.html`;
const BLOCKED = "https://www.bank.example/account";
const ALLOWED = "http://localhost:8080/e2e-playground.html";
const OFFSCREEN = `chrome-extension://${OWN_ID}/offscreen.html`;

function view(o: { armed?: boolean; evaluate?: boolean; list?: string } = {}): SafetyView {
  const blockList = o.list ? parseBlockList(o.list) : EMPTY_BLOCK_LIST;
  return {
    switches: { armed: o.armed ?? true, evaluate: o.evaluate ?? true },
    ctx: { extensionId: OWN_ID, blockList },
    blockedCount: blockList.blockedCount,
  };
}

/** Tabs by id; a missing id rejects like `chrome.tabs.get`. */
function deps(o: {
  state?: SafetyView | (() => SafetyView);
  stateFails?: boolean;
  tabs?: Record<number, { url?: string; pendingUrl?: string }>;
  replaced?: Record<number, number>;
  lastUrls?: Record<number, string>;
} = {}): CallSafetyDeps & { tabs: Record<number, { url?: string; pendingUrl?: string }> } {
  const tabs = o.tabs ?? { 7: { url: ALLOWED } };
  return {
    tabs,
    readState: vi.fn(async () => {
      if (o.stateFails) throw new Error("unreadable");
      const s = o.state ?? view();
      return typeof s === "function" ? s() : s;
    }),
    getTab: vi.fn(async (id: number) => {
      const t = tabs[id];
      if (!t) throw new Error(`No tab with id: ${id}.`);
      return t;
    }),
    replacedBy: (id: number) => o.replaced?.[id],
    lastUrl: (id: number) => o.lastUrls?.[id],
  };
}

describe("tabIdOf", () => {
  it("an integer tabId only", () => {
    expect(tabIdOf({ tabId: 7 })).toBe(7);
    expect(tabIdOf({ tabId: 7.5 })).toBeUndefined();
    expect(tabIdOf({ tabId: "7" })).toBeUndefined();
    expect(tabIdOf({})).toBeUndefined();
  });
});

describe("callTargets — which targets each method is tested by (S1 handoff)", () => {
  const live: SafetyTarget = { kind: "live", urls: [ALLOWED] };

  it("every router method has targets, and none is an empty list", () => {
    for (const m of Object.keys(METHOD_CLASSES)) {
      const t = callTargets(m, { tabId: 7, url: ALLOWED }, live);
      expect(t.length, m).toBeGreaterThan(0);
    }
  });

  it("tab, evaluate and closeTab: the tab", () => {
    for (const m of ["snapshot", "click", "focusTab", "waitFor", "locate", "back", "evaluate", "closeTab"]) {
      expect(callTargets(m, { tabId: 7 }, live), m).toEqual([live]);
    }
  });

  it("a tab method without a readable tab id is tested as gone with no last URL (the handler answers)", () => {
    expect(callTargets("snapshot", {}, null)).toEqual([{ kind: "gone" }]);
  });

  it("navigate: its tab, then its own URL", () => {
    expect(callTargets("navigate", { tabId: 7, url: BLOCKED }, live)).toEqual([live, { kind: "own", url: BLOCKED }]);
  });

  it("newTab: its own URL only — never `none`, which would skip the URL check (S1 verifier finding 6)", () => {
    for (const params of [{ url: BLOCKED }, {}, { url: "" }, { url: null }, { tabId: 7, url: BLOCKED }]) {
      const t = callTargets("newTab", params as Record<string, unknown>, live);
      expect(t.every((x) => x.kind === "own"), JSON.stringify(params)).toBe(true);
      expect(t.some((x) => x.kind === "none")).toBe(false);
    }
    expect(callTargets("newTab", { url: BLOCKED }, null)).toEqual([{ kind: "own", url: BLOCKED }]);
  });

  it("downloadStart: its own URL, then the final URL once known", () => {
    expect(callTargets("downloadStart", { url: ALLOWED }, null)).toEqual([{ kind: "own", url: ALLOWED }]);
    expect(callTargets("downloadStart", { url: ALLOWED }, null, BLOCKED)).toEqual([
      { kind: "own", url: ALLOWED },
      { kind: "own", url: BLOCKED },
    ]);
  });

  it("downloadChunk, downloadEnd and listTabs: none", () => {
    for (const m of ["downloadChunk", "downloadEnd", "listTabs"]) expect(callTargets(m, { tabId: 7 }, live)).toEqual([{ kind: "none" }]);
  });

  it("network: a tabId gives its tab; scope all and an id lookup give none", () => {
    expect(callTargets("networkRequests", { tabId: 7 }, live)).toEqual([live]);
    expect(callTargets("networkRequests", { tabId: 7 }, { kind: "gone", lastUrl: BLOCKED })).toEqual([{ kind: "gone", lastUrl: BLOCKED }]);
    expect(callTargets("networkRequests", { scope: "all" }, null)).toEqual([{ kind: "none" }]);
    expect(callTargets("networkRequests", { id: "123" }, null)).toEqual([{ kind: "none" }]);
    expect(callTargets("networkClear", { scope: "all" }, null)).toEqual([{ kind: "none" }]);
  });

  it("an unclassified method throws (no default)", () => {
    expect(() => callTargets("nope", {}, null)).toThrow(/no safety class/);
  });
});

describe("resolveTabTarget — live, replaced, gone (0.1's F1 note; R2-1)", () => {
  it("a live tab: its url and pendingUrl", async () => {
    const d = deps({ tabs: { 7: { url: ALLOWED, pendingUrl: BLOCKED } } });
    expect(await resolveTabTarget(d, 7)).toEqual({ kind: "live", urls: [ALLOWED, BLOCKED] });
  });

  it("a tab replaced during the call: read under its new id", async () => {
    const d = deps({ tabs: { 9: { url: BLOCKED } }, replaced: { 7: 9 } });
    expect(await resolveTabTarget(d, 7)).toEqual({ kind: "replaced", urls: [BLOCKED, undefined] });
  });

  it("a tab gone: the last URL the worker knew", async () => {
    const d = deps({ tabs: {}, lastUrls: { 7: BLOCKED } });
    expect(await resolveTabTarget(d, 7)).toEqual({ kind: "gone", lastUrl: BLOCKED });
  });

  it("a tab gone with nothing known: gone with no URL", async () => {
    const d = deps({ tabs: {} });
    expect(await resolveTabTarget(d, 7)).toEqual({ kind: "gone" });
  });

  it("a replacement that is gone too: gone, by the newest last URL known", async () => {
    const d = deps({ tabs: {}, replaced: { 7: 9 }, lastUrls: { 7: ALLOWED, 9: BLOCKED } });
    expect(await resolveTabTarget(d, 7)).toEqual({ kind: "gone", lastUrl: BLOCKED });
  });

  it("a fallback URL (seen earlier in the call) is used when the worker knows none", async () => {
    const d = deps({ tabs: {} });
    expect(await resolveTabTarget(d, 7, BLOCKED)).toEqual({ kind: "gone", lastUrl: BLOCKED });
  });
});

describe("CallSafety.receipt", () => {
  it("armed, JS on, empty list: allow for every method on an ordinary tab", async () => {
    for (const m of Object.keys(METHOD_CLASSES)) {
      const c = new CallSafety(m, { tabId: 7, url: ALLOWED, expression: "1" }, deps());
      expect(await c.receipt(), m).toBe("allow");
    }
  });

  it("disarmed: DISARMED {scope:all} for every method but listTabs (redacted)", async () => {
    for (const m of Object.keys(METHOD_CLASSES)) {
      const c = new CallSafety(m, { tabId: 7, url: ALLOWED }, deps({ state: view({ armed: false }) }));
      const d = await c.receipt();
      if (m === "listTabs") expect(d).toEqual({ redact: "disarmed" });
      else expect(d, m).toMatchObject({ code: ErrorCodes.DISARMED, data: { scope: "all" } });
    }
  });

  it("an unreadable state refuses every method, listTabs included, with the unreadable message (fail closed)", async () => {
    for (const m of Object.keys(METHOD_CLASSES)) {
      const c = new CallSafety(m, { tabId: 7 }, deps({ stateFails: true }));
      expect(await c.receipt(), m).toEqual({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } });
    }
  });

  it("a blocked tab: DOMAIN_BLOCKED; this extension's own page: DOMAIN_BLOCKED", async () => {
    const c1 = new CallSafety("snapshot", { tabId: 7 }, deps({ tabs: { 7: { url: BLOCKED } }, state: view({ list: "bank.example" }) }));
    expect(await c1.receipt()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    const c2 = new CallSafety("click", { tabId: 7 }, deps({ tabs: { 7: { url: OWN_PAGE } } }));
    expect(await c2.receipt()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("a tab whose pendingUrl is blocked is refused (the navigation in flight)", async () => {
    const c = new CallSafety("snapshot", { tabId: 7 }, deps({ tabs: { 7: { url: ALLOWED, pendingUrl: BLOCKED } }, state: view({ list: "bank.example" }) }));
    expect(await c.receipt()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("a tab gone at receipt is left to the handler (TAB_UNKNOWN as today), even with a blocked last URL", async () => {
    const c = new CallSafety("snapshot", { tabId: 7 }, deps({ tabs: {}, lastUrls: { 7: BLOCKED }, state: view({ list: "bank.example" }) }));
    expect(await c.receipt()).toBe("allow");
  });

  it("a network tabId on a closed tab is tested by its last URL (0.3's F30 note)", async () => {
    const d = deps({ tabs: {}, lastUrls: { 7: BLOCKED }, state: view({ list: "bank.example" }) });
    expect(await new CallSafety("networkRequests", { tabId: 7 }, d).receipt()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    const d2 = deps({ tabs: {} });
    expect(await new CallSafety("networkRequests", { tabId: 7 }, d2).receipt()).toBe("allow");
  });

  it("navigate to a blocked URL, to any extension page, to a script URL with JS off", async () => {
    const d = deps({ state: view({ list: "bank.example" }) });
    expect(await new CallSafety("navigate", { tabId: 7, url: BLOCKED }, d).receipt()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(await new CallSafety("navigate", { tabId: 7, url: "chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/x.html" }, deps()).receipt()).toMatchObject({
      code: ErrorCodes.DOMAIN_BLOCKED,
    });
    expect(await new CallSafety("newTab", { url: "javascript:alert(1)" }, deps({ state: view({ evaluate: false }) })).receipt()).toMatchObject({
      code: ErrorCodes.DISARMED,
      data: { scope: "evaluate" },
    });
  });

  it("evaluate with JS off: DISARMED {scope: evaluate}; other tools still allowed", async () => {
    const d = deps({ state: view({ evaluate: false }) });
    expect(await new CallSafety("evaluate", { tabId: 7 }, d).receipt()).toMatchObject({ code: ErrorCodes.DISARMED, data: { scope: "evaluate" } });
    expect(await new CallSafety("click", { tabId: 7 }, d).receipt()).toBe("allow");
  });

  it("reads the state once per phase (no cache)", async () => {
    const d = deps();
    const c = new CallSafety("snapshot", { tabId: 7 }, d);
    await c.receipt();
    await c.effect();
    await c.post();
    expect(d.readState).toHaveBeenCalledTimes(3);
  });

  it("does not read a tab for a method that has none", async () => {
    const d = deps();
    await new CallSafety("downloadChunk", { tabId: 7 }, d).receipt();
    await new CallSafety("listTabs", {}, d).receipt();
    await new CallSafety("newTab", { url: ALLOWED }, d).receipt();
    await new CallSafety("networkRequests", { scope: "all" }, d).receipt();
    expect(d.getTab).not.toHaveBeenCalled();
  });
});

describe("CallSafety.effect — before each first side effect (#137, V17)", () => {
  it("allows, then refuses once the state turns disarmed", async () => {
    let s = view();
    const c = new CallSafety("click", { tabId: 7 }, deps({ state: () => s }));
    await expect(c.effect()).resolves.toBeUndefined();
    s = view({ armed: false });
    const err = await c.effect().catch((e) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED, data: { scope: "all" } });
  });

  it("refuses a tab the human navigated onto a blocked site during the call", async () => {
    const d = deps({ state: view({ list: "bank.example" }) });
    const c = new CallSafety("snapshot", { tabId: 7 }, d);
    expect(await c.receipt()).toBe("allow");
    d.tabs[7] = { url: BLOCKED };
    await expect(c.effect()).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("a tab gone during the call: refused only when its last URL is blocked", async () => {
    const d = deps({ tabs: {}, lastUrls: { 7: BLOCKED }, state: view({ list: "bank.example" }) });
    await expect(new CallSafety("click", { tabId: 7 }, d).effect()).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    await expect(new CallSafety("click", { tabId: 7 }, deps({ tabs: {} })).effect()).resolves.toBeUndefined();
  });

  it("the URL seen at receipt stands in when the tab closes and the worker forgot it (R2-1)", async () => {
    const d = deps({ tabs: { 7: { url: BLOCKED } }, state: view() });
    const c = new CallSafety("click", { tabId: 7 }, d);
    expect(await c.receipt()).toBe("allow"); // empty list at receipt
    delete d.tabs[7];
    (d.readState as ReturnType<typeof vi.fn>).mockImplementation(async () => view({ list: "bank.example" }));
    await expect(c.effect()).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("an unreadable state at an effect refuses (fail closed)", async () => {
    const c = new CallSafety("click", { tabId: 7 }, deps({ stateFails: true }));
    await expect(c.effect()).rejects.toMatchObject({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE });
  });
});

describe("CallSafety.post — before the reply (#137)", () => {
  it("armed, JS on, empty list: no refusal, also for a tab gone or replaced during the call (V3)", async () => {
    expect(await new CallSafety("evaluate", { tabId: 7 }, deps({ tabs: {} })).post()).toBeNull();
    expect(await new CallSafety("click", { tabId: 7 }, deps({ tabs: { 9: { url: ALLOWED } }, replaced: { 7: 9 } })).post()).toBeNull();
  });

  it("a replaced tab whose new URL is blocked → DOMAIN_BLOCKED", async () => {
    const d = deps({ tabs: { 9: { url: BLOCKED } }, replaced: { 7: 9 }, state: view({ list: "bank.example" }) });
    expect(await new CallSafety("click", { tabId: 7 }, d).post()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("disarmed during the call → DISARMED (a gone tab too)", async () => {
    expect(await new CallSafety("snapshot", { tabId: 7 }, deps({ tabs: {}, state: view({ armed: false }) })).post()).toMatchObject({
      code: ErrorCodes.DISARMED,
    });
  });

  it("newTab and closeTab post-check the state only", async () => {
    const blocked = deps({ tabs: { 7: { url: BLOCKED } }, state: view({ list: "bank.example" }) });
    expect(await new CallSafety("closeTab", { tabId: 7 }, blocked).post()).toBeNull();
    expect(await new CallSafety("newTab", { url: BLOCKED }, blocked).post()).toBeNull();
    expect(await new CallSafety("newTab", { url: ALLOWED }, deps({ state: view({ armed: false }) })).post()).toMatchObject({
      code: ErrorCodes.DISARMED,
    });
  });

  it("listTabs has no post-check (it is redacted)", async () => {
    expect(await new CallSafety("listTabs", {}, deps({ state: view({ armed: false }) })).post()).toBeNull();
  });

  it("an unreadable state refuses (fail closed)", async () => {
    expect(await new CallSafety("snapshot", { tabId: 7 }, deps({ stateFails: true })).post()).toMatchObject({
      code: ErrorCodes.DISARMED,
      message: STATE_UNREADABLE_MESSAGE,
    });
  });
});

describe("CallSafety.checkFinalUrl — downloadStart's final URL (#140)", () => {
  it("a blocked final URL is refused at once and again at the post-check", async () => {
    const d = deps({ state: view({ list: "bank.example" }) });
    const c = new CallSafety("downloadStart", { url: ALLOWED }, d);
    expect(await c.receipt()).toBe("allow");
    await expect(c.checkFinalUrl(BLOCKED)).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(await c.post()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("an allowed final URL passes, and a pattern added before the reply refuses it at the post-check", async () => {
    let s = view();
    const c = new CallSafety("downloadStart", { url: ALLOWED }, deps({ state: () => s }));
    await expect(c.checkFinalUrl(BLOCKED)).resolves.toBeUndefined();
    s = view({ list: "bank.example" });
    expect(await c.post()).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });
});

describe("CallSafety.onRefused / runRefused", () => {
  it("runs every registered cleanup once, and swallows a failing one", () => {
    const c = new CallSafety("downloadStart", { url: ALLOWED }, deps());
    const a = vi.fn();
    const b = vi.fn(() => {
      throw new Error("x");
    });
    const e = vi.fn();
    c.onRefused(a);
    c.onRefused(b);
    c.onRefused(e);
    c.runRefused();
    c.runRefused();
    expect(a).toHaveBeenCalledTimes(1);
    expect(e).toHaveBeenCalledTimes(1);
  });
});

describe("CallSafety.redactRows — listTabs (#134)", () => {
  const rows = [
    { row: { id: 1, title: "Bank", url: BLOCKED, active: true, windowId: 1, current: true as const } },
    { row: { id: 2, title: "Fixture", url: ALLOWED, active: false, windowId: 1, openerTabId: 1 } },
    { row: { id: 3, title: "Loading", url: ALLOWED, active: false, windowId: 2 }, pendingUrl: BLOCKED },
    { row: { id: 4, title: "Options", url: OWN_PAGE, active: false, windowId: 2 } },
  ];

  it("armed with an empty list: every row unchanged except this extension's own page", async () => {
    const out = await new CallSafety("listTabs", {}, deps()).redactRows(rows);
    expect(out[0]).toEqual(rows[0]!.row);
    expect(out[1]).toEqual(rows[1]!.row);
    expect(out[2]).toEqual(rows[2]!.row);
    expect(out[3]).toEqual({ id: 4, active: false, windowId: 2, hidden: "blocked" });
  });

  it("a block list hides the blocked rows, by url or pendingUrl, keeping id/windowId/active/opener/current", async () => {
    const out = await new CallSafety("listTabs", {}, deps({ state: view({ list: "bank.example" }) })).redactRows(rows);
    expect(out[0]).toEqual({ id: 1, active: true, windowId: 1, current: true, hidden: "blocked" });
    expect(out[1]).toEqual(rows[1]!.row);
    expect(out[2]).toEqual({ id: 3, active: false, windowId: 2, hidden: "blocked" });
  });

  it("disarmed: every row hidden as disarmed; nothing carries a title or URL", async () => {
    const out = await new CallSafety("listTabs", {}, deps({ state: view({ armed: false }) })).redactRows(rows);
    for (const r of out) {
      expect(r.hidden).toBe("disarmed");
      expect("title" in r).toBe(false);
      expect("url" in r).toBe(false);
    }
  });

  it("an unreadable state refuses the listing (fail closed)", async () => {
    await expect(new CallSafety("listTabs", {}, deps({ stateFails: true })).redactRows(rows)).rejects.toMatchObject({
      code: ErrorCodes.DISARMED,
    });
  });
});

describe("CallSafety.networkFilter — the query filter (#137 item 6, #155)", () => {
  it("keeps what is not blocked, drops by url, redirectUrl, initiator or the tab's top-level URL", async () => {
    const d = deps({ state: view({ list: "bank.example" }), lastUrls: { 5: BLOCKED, 6: ALLOWED } });
    const keep = await new CallSafety("networkRequests", { scope: "all" }, d).networkFilter();
    expect(keep({ tabId: 6, url: ALLOWED })).toBe(true);
    expect(keep({ tabId: 6, url: BLOCKED })).toBe(false);
    expect(keep({ tabId: 6, url: ALLOWED, redirectUrl: BLOCKED })).toBe(false);
    expect(keep({ tabId: 6, url: ALLOWED, initiator: "https://bank.example" })).toBe(false);
    expect(keep({ tabId: 5, url: ALLOWED })).toBe(false);
    expect(keep({ tabId: -1, url: ALLOWED })).toBe(true);
  });

  it("with an empty list it keeps everything but entries of a tab showing this extension's page", async () => {
    const d = deps({ lastUrls: { 4: OWN_PAGE } });
    const keep = await new CallSafety("networkRequests", { scope: "all" }, d).networkFilter();
    expect(keep({ tabId: 6, url: BLOCKED })).toBe(true);
    expect(keep({ tabId: 4, url: ALLOWED })).toBe(false);
  });

  it("an unreadable state refuses (fail closed)", async () => {
    await expect(new CallSafety("networkRequests", { scope: "all" }, deps({ stateFails: true })).networkFilter()).rejects.toMatchObject({
      code: ErrorCodes.DISARMED,
    });
  });
});

describe("acceptRelaySender — only the offscreen document reaches the router (#139, F19, V6)", () => {
  it("accepts the offscreen document (its URL, no tab)", () => {
    expect(acceptRelaySender({ url: OFFSCREEN }, OFFSCREEN)).toBe(true);
    expect(acceptRelaySender({ url: OFFSCREEN, tab: undefined, id: OWN_ID }, OFFSCREEN)).toBe(true);
  });

  it("refuses a tab showing offscreen.html, the options page, a content script, anything else", () => {
    expect(acceptRelaySender({ url: OFFSCREEN, tab: { id: 3 } }, OFFSCREEN)).toBe(false);
    expect(acceptRelaySender({ url: OWN_PAGE }, OFFSCREEN)).toBe(false);
    expect(acceptRelaySender({ url: ALLOWED, tab: { id: 3 } }, OFFSCREEN)).toBe(false);
    expect(acceptRelaySender({ url: `${OFFSCREEN}?x=1` }, OFFSCREEN)).toBe(false);
    expect(acceptRelaySender({}, OFFSCREEN)).toBe(false);
    expect(acceptRelaySender(undefined, OFFSCREEN)).toBe(false);
    expect(acceptRelaySender({ url: OFFSCREEN }, "")).toBe(false);
  });
});

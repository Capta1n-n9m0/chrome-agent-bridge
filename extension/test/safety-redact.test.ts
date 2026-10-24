/**
 * Step 9 S1: the `listTabs` row and tab-event redaction (#134, #146) and the network-log filter
 * predicate (#137 item 6; phase doc 0.4's F9 note). Pure. Reserved names only.
 */
import { describe, it, expect } from "vitest";
import type { ExtensionListTabsRow, TabCreatedParams, TabRemovedParams } from "@bridge/shared";
import { isTabCreatedEvent, isTabRemovedEvent } from "@bridge/shared";
import {
  hiddenReason,
  redactListTabsRow,
  redactTabCreated,
  redactTabRemoved,
  networkEntryBlocked,
  dropAtIngest,
  keepInQuery,
  type SafetyContext,
  type SafetySwitches,
} from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const OWN_PAGE = `chrome-extension://${OWN_ID}/options.html`;
const OTHER_PAGE = "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba/page.html";
const BLOCKED = "https://www.bank.example/account";
const ALLOWED = "http://localhost:8080/e2e-playground.html";

const ARMED: SafetySwitches = { armed: true, evaluate: true };
const ARMED_JS_OFF: SafetySwitches = { armed: true, evaluate: false };
const DISARMED: SafetySwitches = { armed: false, evaluate: true };
const ctx: SafetyContext = { extensionId: OWN_ID, blockList: parseBlockList("bank.example") };
const emptyCtx: SafetyContext = { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST };

const row = (over: Partial<ExtensionListTabsRow> = {}): ExtensionListTabsRow => ({
  id: 11,
  title: "Fixture page",
  url: ALLOWED,
  active: true,
  windowId: 3,
  openerTabId: 9,
  current: true,
  ...over,
});

describe("hiddenReason", () => {
  it("disarmed → disarmed whatever the URL; armed → blocked for a blocked URL or an own page; else null", () => {
    expect(hiddenReason([ALLOWED], DISARMED, emptyCtx)).toBe("disarmed");
    expect(hiddenReason([], DISARMED, emptyCtx)).toBe("disarmed");
    expect(hiddenReason([BLOCKED], ARMED, ctx)).toBe("blocked");
    expect(hiddenReason([ALLOWED, BLOCKED], ARMED, ctx)).toBe("blocked");
    expect(hiddenReason([OWN_PAGE], ARMED, emptyCtx)).toBe("blocked");
    expect(hiddenReason([OTHER_PAGE], ARMED, emptyCtx)).toBeNull(); // #138: own id only
    expect(hiddenReason([ALLOWED, undefined], ARMED, ctx)).toBeNull();
    expect(hiddenReason([BLOCKED], ARMED_JS_OFF, emptyCtx)).toBeNull(); // the JS switch hides nothing
  });
});

describe("listTabs row redaction (#134)", () => {
  it("a hidden row keeps id, windowId, active, openerTabId, current; drops title and url; adds hidden", () => {
    const out = redactListTabsRow(row(), DISARMED, ctx);
    expect(out).toEqual({ id: 11, active: true, windowId: 3, openerTabId: 9, current: true, hidden: "disarmed" });
    expect("title" in out).toBe(false);
    expect("url" in out).toBe(false);
  });

  it("armed: a blocked url → hidden blocked; a blocked pendingUrl too; an own page too", () => {
    expect(redactListTabsRow(row({ url: BLOCKED }), ARMED, ctx)).toEqual({ id: 11, active: true, windowId: 3, openerTabId: 9, current: true, hidden: "blocked" });
    expect(redactListTabsRow(row(), ARMED, ctx, BLOCKED).hidden).toBe("blocked");
    expect(redactListTabsRow(row({ url: OWN_PAGE }), ARMED, emptyCtx).hidden).toBe("blocked");
    expect(redactListTabsRow(row(), ARMED, emptyCtx, OWN_PAGE).hidden).toBe("blocked");
  });

  it("a row without optional fields stays without them when hidden", () => {
    const bare: ExtensionListTabsRow = { id: 2, title: "t", url: BLOCKED, active: false, windowId: 1 };
    expect(redactListTabsRow(bare, ARMED, ctx)).toEqual({ id: 2, active: false, windowId: 1, hidden: "blocked" });
  });

  it("never mutates the input row", () => {
    const r = row({ url: BLOCKED });
    const copy = { ...r };
    redactListTabsRow(r, ARMED, ctx);
    expect(r).toEqual(copy);
  });

  it("armed + JS on + empty list: every row comes back unchanged (the same object)", () => {
    for (const u of [ALLOWED, BLOCKED, "about:blank", "", "chrome://extensions", OTHER_PAGE, "data:text/html,x"]) {
      const r = row({ url: u });
      expect(redactListTabsRow(r, ARMED, emptyCtx)).toBe(r);
      expect(redactListTabsRow(r, ARMED, emptyCtx, u)).toBe(r);
    }
  });
});

describe("tab event redaction (#134, #146)", () => {
  const created: TabCreatedParams = { tabId: 5, openerTabId: 2, url: ALLOWED };

  it("tabCreated: url → \"\" with no marker, while disarmed or for a blocked/own URL (url or pendingUrl)", () => {
    expect(redactTabCreated(created, DISARMED, ctx)).toEqual({ tabId: 5, openerTabId: 2, url: "" });
    expect(redactTabCreated({ ...created, url: BLOCKED }, ARMED, ctx)).toEqual({ tabId: 5, openerTabId: 2, url: "" });
    expect(redactTabCreated(created, ARMED, ctx, [BLOCKED])).toEqual({ tabId: 5, openerTabId: 2, url: "" });
    expect(redactTabCreated({ ...created, url: OWN_PAGE }, ARMED, emptyCtx)).toEqual({ tabId: 5, openerTabId: 2, url: "" });
    const out = redactTabCreated(created, DISARMED, ctx);
    expect("hidden" in out).toBe(false);
    expect(isTabCreatedEvent({ event: "tabCreated", params: out })).toBe(true);
  });

  it("tabRemoved: drops lastUrl/lastTitle and adds hidden, while disarmed or for a blocked/own last URL", () => {
    const removed: TabRemovedParams = { tabId: 5, lastUrl: ALLOWED, lastTitle: "Fixture" };
    expect(redactTabRemoved(removed, DISARMED, ctx)).toEqual({ tabId: 5, hidden: "disarmed" });
    expect(redactTabRemoved({ ...removed, lastUrl: BLOCKED }, ARMED, ctx)).toEqual({ tabId: 5, hidden: "blocked" });
    expect(redactTabRemoved({ ...removed, lastUrl: OWN_PAGE }, ARMED, emptyCtx)).toEqual({ tabId: 5, hidden: "blocked" });
    expect(redactTabRemoved({ tabId: 6 }, DISARMED, ctx)).toEqual({ tabId: 6, hidden: "disarmed" });
    expect(isTabRemovedEvent({ event: "tabRemoved", params: redactTabRemoved(removed, DISARMED, ctx) })).toBe(true);
  });

  it("armed + JS on + empty list: events come back unchanged (the same object)", () => {
    for (const u of [ALLOWED, BLOCKED, "", OTHER_PAGE]) {
      const c: TabCreatedParams = { tabId: 1, url: u };
      expect(redactTabCreated(c, ARMED, emptyCtx)).toBe(c);
      const r: TabRemovedParams = { tabId: 1, lastUrl: u || undefined, lastTitle: "x" };
      expect(redactTabRemoved(r, ARMED, emptyCtx)).toBe(r);
    }
    const bare: TabRemovedParams = { tabId: 3 };
    expect(redactTabRemoved(bare, ARMED, emptyCtx)).toBe(bare);
  });

  it("never mutates its input", () => {
    const r: TabRemovedParams = { tabId: 5, lastUrl: BLOCKED, lastTitle: "t" };
    redactTabRemoved(r, ARMED, ctx);
    expect(r).toEqual({ tabId: 5, lastUrl: BLOCKED, lastTitle: "t" });
  });
});

describe("network-log filter predicate (#137 item 6; F9)", () => {
  const e = (url: string, extra: { redirectUrl?: string; initiator?: string } = {}) => ({ url, ...extra });

  it("an entry is blocked by its url, redirectUrl or initiator host, or by the tab's last top-level URL", () => {
    expect(networkEntryBlocked(e("https://api.bank.example/x"), undefined, ctx)).toBe(true);
    expect(networkEntryBlocked(e("https://ok.example/r", { redirectUrl: "https://bank.example/login" }), undefined, ctx)).toBe(true);
    expect(networkEntryBlocked(e("https://analytics.example/c?id=1", { initiator: "https://bank.example" }), undefined, ctx)).toBe(true);
    expect(networkEntryBlocked(e("https://cdn.example/a.js"), BLOCKED, ctx)).toBe(true);
    expect(networkEntryBlocked(e("https://cdn.example/a.js"), OWN_PAGE, ctx)).toBe(true);
    expect(networkEntryBlocked(e("https://cdn.example/a.js", { initiator: "null" }), ALLOWED, ctx)).toBe(false);
    expect(networkEntryBlocked(e("https://notbank.example/"), undefined, ctx)).toBe(false); // dot boundary
  });

  it("ingest drops everything while disarmed, and blocked entries while armed", () => {
    expect(dropAtIngest(e(ALLOWED), ALLOWED, DISARMED, emptyCtx)).toBe(true);
    expect(dropAtIngest(e(ALLOWED), undefined, DISARMED, emptyCtx)).toBe(true);
    expect(dropAtIngest(e("https://bank.example/"), undefined, ARMED, ctx)).toBe(true);
    expect(dropAtIngest(e(ALLOWED), ALLOWED, ARMED, ctx)).toBe(false);
    expect(dropAtIngest(e(ALLOWED), ALLOWED, ARMED_JS_OFF, ctx)).toBe(false);
  });

  it("the query form has no disarmed clause: it filters only by the list (a pattern added later hides older entries)", () => {
    expect(keepInQuery(e(ALLOWED), ALLOWED, ctx)).toBe(true);
    expect(keepInQuery(e("https://bank.example/"), undefined, ctx)).toBe(false);
    expect(keepInQuery(e(ALLOWED, { initiator: "https://www.bank.example" }), undefined, ctx)).toBe(false);
    // The worker's own fetches (tab -1, no top-level URL) are filtered by the entry's own URLs (F8).
    expect(keepInQuery(e("https://ok.example/f", { redirectUrl: "https://dl.bank.example/f" }), undefined, ctx)).toBe(false);
  });

  it("armed + empty list: nothing is dropped or filtered", () => {
    for (const u of [ALLOWED, BLOCKED, "data:text/html,x", OWN_PAGE]) {
      expect(dropAtIngest(e(u, { initiator: "https://bank.example", redirectUrl: BLOCKED }), ALLOWED, ARMED, emptyCtx)).toBe(false);
      expect(keepInQuery(e(u, { initiator: "https://bank.example" }), BLOCKED, emptyCtx)).toBe(true);
    }
  });
});

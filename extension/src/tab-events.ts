/**
 * Tab lifecycle events for the daemon (spec §6.2, §10; Step 7 T1; T0's shapes in
 * `shared/src/protocol.ts`). Pure: `sw.ts` feeds it from `chrome.tabs.on*` and sends the frames.
 *
 * The cache holds each tab's last URL and title so `tabRemoved` can carry them (Chrome's `onRemoved`
 * gives only the id). It lives in memory only (Stage 0 F16: no `storage.session`, which would keep
 * URLs at rest); a worker restart refills it with one `chrome.tabs.query({})`. Its contents go on the
 * wire, never into a log line.
 */
import type { TabCreatedParams, TabRemovedParams, TabReplacedParams } from "@bridge/shared";

export interface TabInfo {
  url?: string;
  title?: string;
}

/** The fields of a `chrome.tabs.Tab` this module reads. */
export interface TabLike {
  id?: number;
  url?: string;
  pendingUrl?: string;
  title?: string;
  openerTabId?: number;
}

/** The fields of `chrome.tabs.onUpdated`'s change info this module reads. */
export interface TabChangeLike {
  url?: string;
  title?: string;
}

/** Only non-empty strings count as known. */
function known(v: unknown): v is string {
  return typeof v === "string" && v !== "";
}

export class TabInfoCache {
  private readonly byId = new Map<number, TabInfo>();

  /** Seeds ids not already present: a live `onUpdated`/`onCreated` value wins over the refill. */
  fill(tabs: readonly TabLike[]): void {
    for (const t of tabs) {
      if (t.id === undefined || this.byId.has(t.id)) continue;
      this.byId.set(t.id, pick(t.url, t.title));
    }
  }

  /** From `onUpdated` (or `onCreated`): a changed field wins, else what the tab object says now. */
  update(tabId: number, change: TabChangeLike, tab?: TabLike): void {
    const prev = this.byId.get(tabId) ?? {};
    const url = known(change.url) ? change.url : known(tab?.url) ? tab!.url : prev.url;
    const title = known(change.title) ? change.title : known(tab?.title) ? tab!.title : prev.title;
    this.byId.set(tabId, pick(url, title));
  }

  /** Removes and returns the entry (for `tabRemoved`). */
  take(tabId: number): TabInfo | undefined {
    const e = this.byId.get(tabId);
    this.byId.delete(tabId);
    return e;
  }

  /** `onReplaced`: the removed tab's entry moves to the added id, unless the added id has its own. */
  move(removedTabId: number, addedTabId: number): void {
    const e = this.take(removedTabId);
    if (e && !this.byId.has(addedTabId)) this.byId.set(addedTabId, e);
  }

  get(tabId: number): TabInfo | undefined {
    return this.byId.get(tabId);
  }

  get size(): number {
    return this.byId.size;
  }
}

function pick(url: unknown, title: unknown): TabInfo {
  const out: TabInfo = {};
  if (known(url)) out.url = url;
  if (known(title)) out.title = title;
  return out;
}

/** `tabCreated` params, or null for a tab without an id. `url` may be "" (Stage 0 F33). */
export function tabCreatedParams(tab: TabLike): TabCreatedParams | null {
  if (tab.id === undefined) return null;
  return {
    tabId: tab.id,
    url: tab.pendingUrl ?? tab.url ?? "",
    ...(tab.openerTabId !== undefined ? { openerTabId: tab.openerTabId } : {}),
  };
}

/** `tabRemoved` params; `lastUrl`/`lastTitle` only when known (never null, never ""). */
export function tabRemovedParams(tabId: number, cached: TabInfo | undefined): TabRemovedParams {
  const out: TabRemovedParams = { tabId };
  if (known(cached?.url)) out.lastUrl = cached!.url;
  if (known(cached?.title)) out.lastTitle = cached!.title;
  return out;
}

export function tabReplacedParams(addedTabId: number, removedTabId: number): TabReplacedParams {
  return { addedTabId, removedTabId };
}

/** The wire frame `{"event":…,"params":…}` — no `id`, so the daemon reads it as an event. */
export function eventFrame(event: "tabCreated" | "tabRemoved" | "tabReplaced", params: object): string {
  return JSON.stringify({ event, params });
}

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

/**
 * Step 9: how long a closed tab's last URL is kept for the safety gate (Stage 0 R2-1: "for the length of a
 * call"). Longer than the longest call: the daemon's 600 s bound plus its 5 s grace.
 */
export const RETIRED_KEEP_MS = 610_000;
/** At most this many closed tabs are remembered (oldest first out). */
export const RETIRED_MAX = 1000;

export class TabInfoCache {
  private readonly byId = new Map<number, TabInfo>();
  /** Closed tabs: last URL and when they closed (Step 9, R2-1). Never logged, never sent. */
  private readonly retired = new Map<number, { url?: string; at: number }>();
  /** `onReplaced`: removed id → added id (Step 9: the gate tests a replaced tab under its new id). */
  private readonly replaced = new Map<number, number>();

  constructor(private readonly now: () => number = Date.now) {}

  /**
   * `onRemoved` (Step 9): removes and returns the entry like `take`, but keeps the last URL for
   * `RETIRED_KEEP_MS` so a call on that tab is still tested by it (#137; Stage 0 R2-1).
   */
  retire(tabId: number): TabInfo | undefined {
    const e = this.take(tabId);
    this.retired.delete(tabId);
    this.retired.set(tabId, { url: e?.url, at: this.now() });
    while (this.retired.size > RETIRED_MAX) this.retired.delete(this.retired.keys().next().value as number);
    return e;
  }

  /** The last URL the worker knew for a tab: its current one, or a recently closed tab's last. */
  lastUrl(tabId: number): string | undefined {
    const live = this.byId.get(tabId)?.url;
    if (live !== undefined) return live;
    const r = this.retired.get(tabId);
    if (!r) return undefined;
    if (this.now() - r.at >= RETIRED_KEEP_MS) {
      this.retired.delete(tabId);
      return undefined;
    }
    return r.url;
  }

  /** `onReplaced` (Step 9): remember which id replaced which (bounded like the retired set). */
  noteReplaced(removedTabId: number, addedTabId: number): void {
    this.replaced.delete(removedTabId);
    this.replaced.set(removedTabId, addedTabId);
    while (this.replaced.size > RETIRED_MAX) this.replaced.delete(this.replaced.keys().next().value as number);
  }

  replacedBy(tabId: number): number | undefined {
    return this.replaced.get(tabId);
  }

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

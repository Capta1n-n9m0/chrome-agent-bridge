// Step 7 T2 — the handle table (phase doc 0.2; spec §6.2). Pure: no sockets, an injected clock.
//
// Actors never see Chrome tab ids: the daemon mints `T1, T2, …` (monotonic per instance, never
// reused) and owns `handle → tabId`. A closed tab's handle stays "gone" for 1 h / 1 000 entries so a
// later call can answer `TAB_GONE {lastUrl, lastTitle}`. The url/title cache feeds those fields and
// `daemon.status`; nothing here is ever logged.

/** How long a dead handle is kept for the `TAB_GONE` answer. */
export const DEAD_KEEP_MS = 60 * 60 * 1000;
/** At most this many dead handles are kept; the oldest go first. */
export const DEAD_KEEP_MAX = 1000;

export type Resolved =
  | { kind: "live"; tabId: number }
  | { kind: "gone"; lastUrl?: string; lastTitle?: string }
  | { kind: "unknown" };

export interface LiveHandle {
  handle: string;
  tabId: number;
  url?: string;
}

interface Entry {
  handle: string;
  tabId: number;
  live: boolean;
  url?: string;
  title?: string;
  /** Epoch ms when it died; set only when `live` is false. */
  diedAt?: number;
}

/**
 * Where handle numbers come from (Step 8 S2b.9, decisions.md · 2026-10-23 · A new daemon never reuses a
 * handle number (#79)). `next()` returns a number never returned before, by this source or by an
 * earlier daemon's (`createHandleMark` in `handle-mark.ts`); it is called once per new handle, before
 * the handle exists.
 */
export interface HandleNumbers {
  next(): number;
}

/** Today's in-memory numbering: 1, 2, 3, … per instance. */
export function counterFrom(first = 1): HandleNumbers {
  let n = first;
  return { next: () => n++ };
}

export interface HandleTableOptions {
  now?: () => number;
  /** Default `counterFrom(1)` (T1, T2, …); production injects the high-water mark. */
  numbers?: HandleNumbers;
}

export class HandleTable {
  private readonly byHandle = new Map<string, Entry>();
  /** Live tabs only. */
  private readonly byTab = new Map<number, string>();
  /** The newest handle (live or dead) that named each tab id — for annotating old network entries. */
  private readonly lastByTab = new Map<number, string>();
  private readonly numbers: HandleNumbers;
  private readonly now: () => number;

  constructor(options: HandleTableOptions = {}) {
    this.now = options.now ?? Date.now;
    this.numbers = options.numbers ?? counterFrom(1);
  }

  /** The live handle of `tabId`, minting one when it has none. Idempotent. */
  mint(tabId: number): string {
    const existing = this.byTab.get(tabId);
    if (existing) return existing;
    const handle = `T${this.numbers.next()}`;
    this.byHandle.set(handle, { handle, tabId, live: true });
    this.byTab.set(tabId, handle);
    this.lastByTab.set(tabId, handle);
    return handle;
  }

  resolve(handle: string): Resolved {
    const e = this.byHandle.get(handle);
    if (!e) return { kind: "unknown" };
    if (e.live) return { kind: "live", tabId: e.tabId };
    const gone: Resolved = { kind: "gone" };
    if (e.url !== undefined) gone.lastUrl = e.url;
    if (e.title !== undefined) gone.lastTitle = e.title;
    return gone;
  }

  /** The live handle of `tabId`, if any. */
  handleOf(tabId: number): string | undefined {
    return this.byTab.get(tabId);
  }

  /** The live handle of `tabId`, else the newest dead one still kept. */
  lastHandleOf(tabId: number): string | undefined {
    const live = this.byTab.get(tabId);
    if (live) return live;
    const last = this.lastByTab.get(tabId);
    return last && this.byHandle.has(last) ? last : undefined;
  }

  /** Remember a live tab's url/title (from `listTabs` or `tabCreated`). Unknown tabs are ignored. */
  note(tabId: number, info: { url?: string; title?: string }): void {
    const h = this.byTab.get(tabId);
    if (!h) return;
    const e = this.byHandle.get(h)!;
    if (info.url !== undefined) e.url = info.url;
    if (info.title !== undefined) e.title = info.title;
  }

  /**
   * Step 9 (decisions.md · 2026-10-24 · What `listTabs`, tab events and the daemon reveal while disarmed or
   * for a blocked tab (#134); Stage 0 F41): forget a live tab's cached url/title, because its page is now
   * blocked — so `daemon.status`, `tabGone` and `TAB_GONE` stop serving a url learned while it was allowed.
   * Unknown tabs are ignored.
   */
  forgetPage(tabId: number): void {
    const h = this.byTab.get(tabId);
    if (!h) return;
    const e = this.byHandle.get(h)!;
    delete e.url;
    delete e.title;
  }

  /** The cached url/title of a handle (live or gone). */
  cached(handle: string): { url?: string; title?: string } {
    const e = this.byHandle.get(handle);
    const out: { url?: string; title?: string } = {};
    if (e?.url !== undefined) out.url = e.url;
    if (e?.title !== undefined) out.title = e.title;
    return out;
  }

  /**
   * `tabs.onReplaced`: the removed tab's handle now names `addedTabId` (leases are keyed by handle, so
   * they follow). With no handle on the removed tab, the added tab gets one (`mint`, idempotent).
   *
   * If the added tab already has its own handle, one of the two must go, since a tab has one live
   * handle: the removed tab's handle wins, unless it is unleased and the added tab's own handle is
   * leased (`isLeased`) — a leased handle is never retired when an unleased one can be. The loser is
   * marked gone (with its cached url/title) and returned as `retired`, so the caller can tell its
   * holder (`tabGone`) and drop its lease.
   */
  replace(
    removedTabId: number,
    addedTabId: number,
    isLeased: (handle: string) => boolean = () => false,
  ): { handle: string; retired?: string } {
    if (removedTabId === addedTabId) return { handle: this.mint(addedTabId) };
    const removedHandle = this.byTab.get(removedTabId);
    const addedHandle = this.byTab.get(addedTabId);
    if (!removedHandle) return { handle: this.mint(addedTabId) };
    if (addedHandle) {
      if (!isLeased(removedHandle) && isLeased(addedHandle)) {
        this.kill(removedHandle);
        return { handle: addedHandle, retired: removedHandle };
      }
      this.kill(addedHandle);
    }
    const e = this.byHandle.get(removedHandle)!;
    this.byTab.delete(removedTabId);
    e.tabId = addedTabId;
    this.byTab.set(addedTabId, removedHandle);
    this.lastByTab.set(addedTabId, removedHandle);
    return addedHandle ? { handle: removedHandle, retired: addedHandle } : { handle: removedHandle };
  }

  /**
   * `tabs.onRemoved`: mark the tab's handle gone, keeping `lastUrl`/`lastTitle` — the event's values
   * first, else the cache. Returns the handle, or undefined when the tab had none.
   */
  remove(tabId: number, last: { lastUrl?: string; lastTitle?: string }): string | undefined {
    const h = this.byTab.get(tabId);
    if (!h) return undefined;
    const e = this.byHandle.get(h)!;
    if (last.lastUrl !== undefined) e.url = last.lastUrl;
    if (last.lastTitle !== undefined) e.title = last.lastTitle;
    this.kill(h);
    return h;
  }

  /**
   * The extension's session changed (Step 8 S2b.5, decisions.md · 2026-10-23 · #74 as amended by #80):
   * every live handle becomes gone, keeping its cached url/title (the pre-restart page's), and its tab
   * id is freed so a reused id gets a new handle. Returns the retired handles in mint order.
   */
  retireAll(): string[] {
    const retired: string[] = [];
    for (const e of this.byHandle.values()) if (e.live) retired.push(e.handle);
    for (const h of retired) this.kill(h);
    return retired;
  }

  private kill(handle: string): void {
    const e = this.byHandle.get(handle);
    if (!e || !e.live) return;
    e.live = false;
    e.diedAt = this.now();
    if (this.byTab.get(e.tabId) === handle) this.byTab.delete(e.tabId);
  }

  /** Forget dead handles older than 1 h, then keep at most 1 000 dead ones (oldest dropped first). */
  prune(now: number): void {
    const dead: Entry[] = [];
    for (const e of this.byHandle.values()) {
      if (e.live) continue;
      if (now - (e.diedAt ?? now) > DEAD_KEEP_MS) this.forget(e);
      else dead.push(e);
    }
    if (dead.length <= DEAD_KEEP_MAX) return;
    dead.sort((a, b) => (a.diedAt ?? 0) - (b.diedAt ?? 0));
    for (const e of dead.slice(0, dead.length - DEAD_KEEP_MAX)) this.forget(e);
  }

  private forget(e: Entry): void {
    this.byHandle.delete(e.handle);
    if (this.lastByTab.get(e.tabId) === e.handle) this.lastByTab.delete(e.tabId);
  }

  /** Every live handle, in mint order. */
  live(): LiveHandle[] {
    const out: LiveHandle[] = [];
    for (const e of this.byHandle.values()) {
      if (!e.live) continue;
      const row: LiveHandle = { handle: e.handle, tabId: e.tabId };
      if (e.url !== undefined) row.url = e.url;
      out.push(row);
    }
    return out;
  }
}

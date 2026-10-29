/**
 * Step 13 S1 (G1): the real opener of a new tab (decisions.md · 2026-10-29 · Stage 0: G1 by a join in the extension —
 * `tabCreated.openerTabId` is the navigation source; no join, no grant (#385); spec §10 Note 2026-10-29).
 *
 * Chrome's `tabs.onCreated` `openerTabId` names the window's active tab when the opener is a background tab (25 of 30,
 * Stage 0). `webNavigation.onCreatedNavigationTarget`'s `sourceTabId` names the real one (60 of 60). A created tab that
 * carries Chrome's `openerTabId` is held until its navigation target arrives (either order, joined by the new tab's
 * id) or `OPENER_JOIN_HOLD_MS` pass. Joined: emitted with `openerTabId` = `sourceTabId`. Not joined: emitted with
 * none, never Chrome's value. A tab without Chrome's `openerTabId` is emitted at once, with none, as before S1.
 *
 * Pure, injected timers, tab ids only: nothing else from either event enters this module. No log call.
 * A worker restart inside the hold loses the held tab (a limit, #385; the daemon's `listTabs` resync mints it later).
 */

/** 250 ms: the smallest of 250/500/1000 at least 4 × the largest measured spread (0.6 ms; #385). */
export const OPENER_JOIN_HOLD_MS = 250;

export interface JoinTimers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realTimers: JoinTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Called once per created tab, in the order the tabs are released. */
export type JoinEmit = (tabId: number, openerTabId: number | undefined) => void;

export class OpenerJoin {
  /** Created tabs waiting for their navigation target. */
  private readonly held = new Map<number, unknown>();
  /** Navigation targets that came before their tab: new tab id → source tab id, and the drop timer. */
  private readonly early = new Map<number, { sourceTabId: number; timer: unknown }>();

  constructor(
    private readonly emit: JoinEmit,
    private readonly timers: JoinTimers = realTimers,
    private readonly holdMs: number = OPENER_JOIN_HOLD_MS,
  ) {}

  /** `tabs.onCreated`: the new tab's id and Chrome's `openerTabId` (used only to decide whether to hold). */
  created(tabId: number, chromeOpenerTabId: number | undefined): void {
    if (this.held.has(tabId)) return;
    const early = this.takeEarly(tabId);
    if (chromeOpenerTabId === undefined) return this.emit(tabId, undefined);
    if (early !== undefined) return this.emit(tabId, early);
    const timer = this.timers.set(() => {
      if (this.held.delete(tabId)) this.emit(tabId, undefined);
    }, this.holdMs);
    this.held.set(tabId, timer);
  }

  /** `webNavigation.onCreatedNavigationTarget`: the new tab's id and the tab whose page opened it. */
  navigationTarget(tabId: number, sourceTabId: number): void {
    if (this.held.has(tabId)) {
      this.timers.clear(this.held.get(tabId));
      this.held.delete(tabId);
      return this.emit(tabId, sourceTabId);
    }
    this.takeEarly(tabId);
    const timer = this.timers.set(() => void this.early.delete(tabId), this.holdMs);
    this.early.set(tabId, { sourceTabId, timer });
  }

  /** `tabs.onRemoved` / `onReplaced` (the removed id): a held tab is released first, unjoined; an early target goes. */
  gone(tabId: number): void {
    this.takeEarly(tabId);
    if (!this.held.has(tabId)) return;
    this.timers.clear(this.held.get(tabId));
    this.held.delete(tabId);
    this.emit(tabId, undefined);
  }

  private takeEarly(tabId: number): number | undefined {
    const e = this.early.get(tabId);
    if (!e) return undefined;
    this.timers.clear(e.timer);
    this.early.delete(tabId);
    return e.sourceTabId;
  }
}

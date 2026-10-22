import { asTabUnknown, humansTab, noteFocus, requireTabId, waitForLoad } from "../tabs.js";
import { BridgeError, ErrorCodes } from "../errors.js";

interface ListedTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
  windowId: number;
  /** Only when Chrome reports one. */
  openerTabId?: number;
  /** Set (true) on exactly the human's tab (#43); absent on the others. */
  current?: true;
}

/**
 * Every tab. `active` keeps Chrome's per-window meaning; `current: true` marks the one tab the
 * resolver calls the human's. If the resolver fails (no normal window), no tab gets `current` and
 * the list still succeeds.
 */
export async function listTabs(): Promise<{ tabs: ListedTab[] }> {
  const [tabs, human] = await Promise.all([chrome.tabs.query({}), humansTab().catch(() => undefined)]);
  return {
    tabs: tabs
      .filter((t) => t.id !== undefined)
      .map((t) => {
        const out: ListedTab = {
          id: t.id!,
          title: t.title ?? "",
          url: t.url ?? "",
          active: t.active ?? false,
          windowId: t.windowId,
        };
        if (t.openerTabId !== undefined) out.openerTabId = t.openerTabId;
        if (human?.id !== undefined && t.id === human.id) out.current = true;
        return out;
      }),
  };
}

/**
 * The tab id a tab-management call names: `tabId` (Step 7), else the Step 6 `id`. Neither →
 * `BAD_PARAMS`; never the active tab (Stage 0 F4: `closeTab` must not close whatever is in front).
 */
export function explicitTabId(p: Record<string, unknown>, method: string): number {
  const raw = p.tabId ?? p.id;
  if (raw === undefined || raw === null) throw new BridgeError(ErrorCodes.BAD_PARAMS, `${method} requires tabId`);
  return requireTabId(raw);
}

/**
 * Brings the tab's window to the front and activates the tab, and does not restore anything
 * (plan 0.5's one exception). The only place in the extension that focuses a window.
 */
export async function focusTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  const id = explicitTabId(p, "focusTab");
  try {
    const tab = await chrome.tabs.get(id);
    // Before anything changes: a capture that switched this window must not undo the focus (T3 V4).
    noteFocus(tab.windowId);
    if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(id, { active: true });
  } catch (err) {
    throw asTabUnknown(err);
  }
  return { ok: true };
}

/** The Step 6 name of `focusTab`, kept for one release (decisions.md · 2026-10-21); Step 8 S2 removes it. */
export const selectTab = focusTab;

/** Opens a tab in the background unless `active === true` is passed (plan 0.8). */
export async function newTab(p: Record<string, unknown>): Promise<{ id: number }> {
  const url = p.url ? String(p.url) : undefined;
  const tab = await chrome.tabs.create({ url, active: p.active === true });
  if (url) await waitForLoad(tab.id!);
  return { id: tab.id! };
}

export async function closeTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  const id = explicitTabId(p, "closeTab");
  try {
    await chrome.tabs.remove(id);
  } catch (err) {
    throw asTabUnknown(err);
  }
  return { ok: true };
}

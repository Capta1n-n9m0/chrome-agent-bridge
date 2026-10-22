import { asTabUnknown, humansTab, requireTabId, waitForLoad } from "../tabs.js";
import { BridgeError, ErrorCodes } from "../errors.js";

interface ListedTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
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
        const out: ListedTab = { id: t.id!, title: t.title ?? "", url: t.url ?? "", active: t.active ?? false };
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

export async function selectTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  const id = explicitTabId(p, "selectTab");
  try {
    const tab = await chrome.tabs.get(id);
    if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(id, { active: true });
  } catch (err) {
    throw asTabUnknown(err);
  }
  return { ok: true };
}

export async function newTab(p: Record<string, unknown>): Promise<{ id: number }> {
  const url = p.url ? String(p.url) : undefined;
  const tab = await chrome.tabs.create({ url, active: true });
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

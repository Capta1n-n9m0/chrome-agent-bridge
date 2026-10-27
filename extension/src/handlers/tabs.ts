import { asTabUnknown, humansTab, noteFocus, requireTabId, waitForLoad } from "../tabs.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { ExtensionListTabsRow } from "@bridge/shared";
import type { HandlerSafety } from "../safety-call.js";
import { BLANK_URL, openBehindRules, opensBehindRules, settleBlank } from "../newtab-open.js";

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
export async function listTabs(_p?: Record<string, unknown>, call?: HandlerSafety): Promise<{ tabs: ListedTab[] | ExtensionListTabsRow[] }> {
  const [tabs, human] = await Promise.all([chrome.tabs.query({}), humansTab().catch(() => undefined)]);
  const live = tabs.filter((t) => t.id !== undefined);
  const rows = live.map((t) => {
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
  });
  if (!call) return { tabs: rows };
  // Step 9 (#134): hidden rows drop title/url and carry `hidden`; `pendingUrl` is tested, never sent.
  return { tabs: await call.redactRows(rows.map((row, i) => (live[i]!.pendingUrl ? { row, pendingUrl: live[i]!.pendingUrl } : { row }))) };
}

/**
 * The tab id a tab-management call names: an integer `tabId`. Absent → `BAD_PARAMS`; never the
 * active tab (Stage 0 F4: `closeTab` must not close whatever is in front). The Step 6 `id` form was
 * removed in Step 8 S2b (fixer 1, verifier F3): the S2b daemon refuses `id` and never forwards it.
 */
export function explicitTabId(p: Record<string, unknown>, method: string): number {
  const raw = p.tabId;
  if (raw === undefined || raw === null) throw new BridgeError(ErrorCodes.BAD_PARAMS, `${method} requires tabId`);
  return requireTabId(raw);
}

/**
 * Brings the tab's window to the front and activates the tab, and does not restore anything
 * (plan 0.5's one exception). The only place in the extension that focuses a window.
 */
export async function focusTab(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  const id = explicitTabId(p, "focusTab");
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(id);
  } catch (err) {
    throw asTabUnknown(err);
  }
  // Step 9: the effect check before the window or the tab changes (#137); its refusal passes unchanged.
  await call?.effect();
  try {
    // Before anything changes: a capture that switched this window must not undo the focus (T3 V4).
    noteFocus(tab.windowId);
    if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(id, { active: true });
  } catch (err) {
    throw asTabUnknown(err);
  }
  return { ok: true };
}

/**
 * Opens a tab in the background unless `active === true` is passed (plan 0.8). Step 11b S6 (#311, #312): with a URL
 * other than `about:blank`, on `about:blank` first, its block-list rules held, then navigated (`newtab-open.ts`); with
 * no URL, `about:blank`, or no `call` (tests), as before.
 */
export async function newTab(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ id: number }> {
  const url = p.url ? String(p.url) : undefined;
  await call?.effect(); // Step 9 (#137)
  const hold = call?.holdRulesFor?.bind(call);
  if (hold && opensBehindRules(url)) {
    const id = await openBehindRules({
      create: async () => (await chrome.tabs.create({ url: BLANK_URL, active: p.active === true })).id!,
      settleBlank: (tabId) => settleBlank(tabId, chrome.tabs),
      holdRules: hold,
      waitLoad: (tabId) => waitForLoad(tabId),
      navigate: async (tabId) => void (await chrome.tabs.update(tabId, { url })),
      remove: (tabId) => chrome.tabs.remove(tabId),
    });
    return { id };
  }
  const tab = await chrome.tabs.create({ url, active: p.active === true });
  if (url) await waitForLoad(tab.id!);
  return { id: tab.id! };
}

export async function closeTab(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  const id = explicitTabId(p, "closeTab");
  await call?.effect(); // Step 9 (#137)
  try {
    await chrome.tabs.remove(id);
  } catch (err) {
    throw asTabUnknown(err);
  }
  return { ok: true };
}

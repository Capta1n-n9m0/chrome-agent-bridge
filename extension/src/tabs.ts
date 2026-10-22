import { BridgeError, ErrorCodes, NO_NORMAL_WINDOW } from "./errors.js";

/**
 * "The human's tab": the active tab of the window `getLastFocused` names among *normal* windows
 * (decisions.md · 2026-10-22 · #43; Stage 0 F8). Normal windows only, so a DevTools or popup window
 * holding focus does not hide the tab the human sees. Never changes window focus.
 */
export async function humansTab(): Promise<chrome.tabs.Tab> {
  let windowId: number | undefined;
  try {
    windowId = (await chrome.windows.getLastFocused({ windowTypes: ["normal"] }))?.id;
  } catch {
    throw new Error(NO_NORMAL_WINDOW);
  }
  if (windowId === undefined) throw new Error(NO_NORMAL_WINDOW);
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (!tab?.id) throw new Error(NO_NORMAL_WINDOW);
  return tab;
}

/** The Step 6 fallback target. Module-private: only `targetTab` calls it (exit check T1.2). */
async function activeTab(): Promise<chrome.tabs.Tab> {
  return humansTab();
}

/** "No tab with id: N." from `chrome.tabs.*` → `TAB_UNKNOWN` (plan 0.1); anything else unchanged. */
export function asTabUnknown(err: unknown): unknown {
  const message = err instanceof Error ? err.message : String(err);
  if (/no tab with id/i.test(message)) return new BridgeError(ErrorCodes.TAB_UNKNOWN, message);
  return err;
}

/** An explicit tab id: a number that is an integer, else `BAD_PARAMS`. */
export function requireTabId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, "tabId must be an integer");
  }
  return value;
}

const warned = new Set<string>();

/**
 * The tab a call acts on (Step 7 plan 0.1). `p.tabId` (an integer) → that tab, `TAB_UNKNOWN` when
 * Chrome has no such tab; present but not an integer → `BAD_PARAMS`. A string `p.tab` without
 * `tabId` is a handle a Step 6 daemon forwarded unresolved → `BAD_PARAMS` (Stage 0 F17). Absent →
 * the human's tab, with a warning naming the method only, once per method per worker lifetime.
 * Step 8 removes the fallback.
 */
export async function targetTab(p: Record<string, unknown>, method: string): Promise<chrome.tabs.Tab> {
  if (p.tabId !== undefined) {
    const tabId = requireTabId(p.tabId);
    try {
      return await chrome.tabs.get(tabId);
    } catch (err) {
      throw asTabUnknown(err);
    }
  }
  if (typeof p.tab === "string") {
    throw new BridgeError(
      ErrorCodes.BAD_PARAMS,
      "got a tab handle — the bridge daemon is older than the extension; run npm run build and reconnect",
    );
  }
  if (!warned.has(method)) {
    warned.add(method);
    console.warn(`[bridge] ${method}: no tabId given — falling back to the human's active window (Step 6 fallback)`);
  }
  return activeTab();
}

/**
 * The page-touching paths refuse a tab Chrome's Memory Saver discarded, rather than return whatever
 * Chrome says about a page that is not there (Stage 0 F18). `INTERNAL`: no dedicated code.
 */
export function assertNotDiscarded(tab: chrome.tabs.Tab): chrome.tabs.Tab {
  if (tab.discarded) {
    throw new Error("The tab was discarded by Chrome's Memory Saver — call browser_navigate or focus it to reload");
  }
  return tab;
}

/** `targetTab` for a call that runs in the page (content script, CDP evaluate, full-page capture). */
export async function pageTab(p: Record<string, unknown>, method: string): Promise<chrome.tabs.Tab> {
  return assertNotDiscarded(await targetTab(p, method));
}

/** Test hook: forget which methods already warned. */
export function resetFallbackWarnings(): void {
  warned.clear();
}

export function waitForLoad(tabId: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Timed out waiting for tab ${tabId} to load`));
    }, timeoutMs);
    function listener(id: number, info: chrome.tabs.OnUpdatedInfo): void {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

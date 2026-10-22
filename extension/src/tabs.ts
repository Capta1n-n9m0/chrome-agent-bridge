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

/** How long to wait for `onActivated` after switching to the target tab (plan 0.5). Never lower. */
const ACTIVATION_WAIT_MS = 1000;
/** One frame + paint after the activation, before capturing (plan 0.5). Never lower. */
const FRAME_WAIT_MS = 50;
/** Chrome allows 2 `captureVisibleTab` calls per second (Stage 0 F10): space captures this far. */
const CAPTURE_SPACING_MS = 500;
/** The wait before the one retry after Chrome's capture quota error (F10). */
const QUOTA_RETRY_MS = 500;
const QUOTA_RE = /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/;
/**
 * The longest one link holds its window's capture chain, counted from when the link started: the
 * daemon's default call timeout. A hung Chrome call must not wedge a window for the worker's
 * lifetime (spec §6.4: "a hung screenshot cannot wedge everyone"). Frees the chain only; the
 * caller's own promise and the restore are untouched.
 */
const CHAIN_RELEASE_MAX_MS = 30_000;

/** Per window: the tail of the capture chain (F19). Each link resolves once its restore settled. */
const captureChains = new Map<number, Promise<void>>();
/** The last reserved capture slot (epoch ms), across all windows (F10). */
let lastSlot = Number.NEGATIVE_INFINITY;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The `switch` screenshot mode (plan 0.5; spec §7): show `tab` in its own window, capture it with
 * `captureVisibleTab`, put the window's previous tab back. The window is never brought to the front
 * (decision 0.5: `captureVisibleTab` needs the window visible, not in front, and taking the human's
 * window is what this avoids). A minimized window is refused before anything is switched.
 *
 * Calls for one window run strictly one after another, and the next starts only after the previous
 * one's restore settled (F19), so two switches never interleave even after the daemon stopped
 * waiting for one — or, if a Chrome call hangs, `CHAIN_RELEASE_MAX_MS` after the link started. The
 * data URL is returned without waiting for the restore.
 */
export function activateForCapture(tab: chrome.tabs.Tab): Promise<string> {
  const windowId = tab.windowId;
  const prior = captureChains.get(windowId) ?? Promise.resolve();
  let release!: () => void;
  const settled = new Promise<void>((resolve) => (release = resolve));
  const link = prior.then(() => settled);
  captureChains.set(windowId, link);
  void link.then(() => {
    if (captureChains.get(windowId) === link) captureChains.delete(windowId);
  });
  return prior.then(() => captureOnce(tab, release));
}

async function captureOnce(tab: chrome.tabs.Tab, releaseChain: () => void): Promise<string> {
  const bound = setTimeout(releaseChain, CHAIN_RELEASE_MAX_MS);
  const release = (): void => {
    clearTimeout(bound);
    releaseChain();
  };
  let restored: Promise<unknown> = Promise.resolve();
  try {
    const win = await chrome.windows.get(tab.windowId);
    if (win.state === "minimized") {
      throw new BridgeError(
        ErrorCodes.WINDOW_MINIMIZED,
        `Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"`,
      );
    }
    await reserveCaptureSlot();
    const [prev] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    const switching = prev?.id !== tab.id;
    try {
      if (switching) await showTab(tab.id!);
      return await captureWithRetry(tab.windowId);
    } finally {
      // Not awaited for the result; errors swallowed (the previous tab may have closed meanwhile).
      if (switching && prev?.id !== undefined) restored = chrome.tabs.update(prev.id, { active: true }).catch(() => {});
    }
  } finally {
    void restored.then(release, release);
  }
}

/** Takes the next capture slot ≥ 500 ms after the last one (all windows), and waits for it. */
async function reserveCaptureSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, lastSlot + CAPTURE_SPACING_MS);
  lastSlot = slot;
  if (slot > now) await sleep(slot - now);
}

/** Activates `tabId` and waits for `onActivated` (at most 1 s either way), then one frame. */
async function showTab(tabId: number): Promise<void> {
  const listener = (info: chrome.tabs.OnActivatedInfo): void => {
    if (info.tabId === tabId) {
      chrome.tabs.onActivated.removeListener(listener);
      done();
    }
  };
  let done!: () => void;
  const activated = new Promise<void>((resolve) => (done = resolve));
  chrome.tabs.onActivated.addListener(listener);
  const timer = setTimeout(() => done(), ACTIVATION_WAIT_MS);
  try {
    try {
      await chrome.tabs.update(tabId, { active: true });
    } catch (err) {
      throw asTabUnknown(err);
    }
    await activated;
  } finally {
    clearTimeout(timer);
    chrome.tabs.onActivated.removeListener(listener);
  }
  await sleep(FRAME_WAIT_MS);
}

async function captureWithRetry(windowId: number): Promise<string> {
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  } catch (err) {
    if (!QUOTA_RE.test(err instanceof Error ? err.message : String(err))) throw err;
    await sleep(QUOTA_RETRY_MS);
    return await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  }
}

/** Test hook: forget the capture chains and the last capture slot. */
export function resetCaptureState(): void {
  captureChains.clear();
  lastSlot = Number.NEGATIVE_INFINITY;
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

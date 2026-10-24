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

/**
 * The tab a call acts on (Step 7 plan 0.1). `p.tabId` (an integer) → that tab, `TAB_UNKNOWN` when
 * Chrome has no such tab; present but not an integer → `BAD_PARAMS`. A string `p.tab` without
 * `tabId` is a handle a Step 6 daemon forwarded unresolved → `BAD_PARAMS` (Stage 0 F17). Absent →
 * `BAD_PARAMS`: Step 8 S2b removed the human's-tab fallback (decisions.md · 2026-10-23 · S2's daemon
 * half becomes stage S2b (#72)); the daemon always forwards a `tabId`.
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
  throw new BridgeError(ErrorCodes.BAD_PARAMS, `${method} requires tabId`);
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

/**
 * The switch mode's refusal for a minimized window. Step 8 S2b (decisions.md · 2026-10-23 · T5b's three
 * fixes (#63)): it no longer suggests mode cdp, which refuses a minimized window as well.
 */
export const SWITCH_MINIMIZED_MESSAGE =
  "Chrome's window is minimized, so the tab cannot be captured — restore the window, or call focusTab first";

export const CDP_MINIMIZED_MESSAGE =
  "Chrome's window is minimized, so CDP cannot capture the tab — restore the window, or call focusTab first";
export const CDP_HIDDEN_MESSAGE =
  "The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first";

/**
 * `screenshot {mode:"cdp"}` refuses what Run 8 measured to hang until the call timed out (T5b fix 2;
 * SCREEN-2 a background tab, SCREEN-4 a minimized window): a minimized window → `WINDOW_MINIMIZED`,
 * else a tab that is not active in its window → `OFFSCREEN`. Null → go ahead. Pure.
 */
export function cdpCaptureRefusal(tab: { active?: boolean }, windowState: string | undefined): BridgeError | null {
  if (windowState === "minimized") return new BridgeError(ErrorCodes.WINDOW_MINIMIZED, CDP_MINIMIZED_MESSAGE);
  if (tab.active !== true) return new BridgeError(ErrorCodes.OFFSCREEN, CDP_HIDDEN_MESSAGE);
  return null;
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
 * lifetime (spec §6.4: "a hung screenshot cannot wedge everyone"). If the link has switched tabs
 * by then, the restore runs first (T5b fix 1); the caller's own promise is untouched.
 */
const CHAIN_RELEASE_MAX_MS = 30_000;

/** Per window: the tail of the capture chain (F19). Each link resolves once its restore settled. */
const captureChains = new Map<number, Promise<void>>();
/** Per window: how many `focusTab` calls touched it (T3 V4). A capture's restore compares it. */
const focusEpoch = new Map<number, number>();
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

/**
 * One link of the chain. The restore of the previous tab runs at most once, on whichever comes
 * first: the capture settling (success or failure) after a switch, or `CHAIN_RELEASE_MAX_MS` expiring
 * while switched (T5b fix 1: a capture hung by an occluded window no longer leaves the target tab in
 * front). The chain is ALWAYS released no later than `CHAIN_RELEASE_MAX_MS` after the link started
 * (spec §6.4), restore pending or not (T5b fixer F1): when the capture settles first, the chain is
 * released once the restore settled (at once when none is due) or when the bound fires, whichever is
 * first; when the bound fires first, it starts the restore if one is due and releases the chain at
 * once, without waiting on it. The caller's promise is the capture's own outcome either way; the data
 * URL never waits for the restore.
 */
async function captureOnce(tab: chrome.tabs.Tab, releaseChain: () => void): Promise<string> {
  const windowId = tab.windowId;
  let restore: (() => Promise<void>) | undefined;
  let restoring: Promise<void> | undefined;
  let released = false;
  /** Starts the restore at most once; resolves when it settled (at once when none is due). */
  const startRestore = (): Promise<void> => {
    if (restore && !restoring) restoring = restore();
    return restoring ?? Promise.resolve();
  };
  // Armed until the chain is released, so a hung restore cannot hold the chain past it (F1).
  const bound = setTimeout(() => {
    void startRestore();
    release();
  }, CHAIN_RELEASE_MAX_MS);
  const release = (): void => {
    if (released) return;
    released = true;
    clearTimeout(bound);
    releaseChain();
  };
  try {
    const win = await chrome.windows.get(windowId);
    if (win.state === "minimized") {
      throw new BridgeError(ErrorCodes.WINDOW_MINIMIZED, SWITCH_MINIMIZED_MESSAGE);
    }
    await reserveCaptureSlot();
    const [prev] = await chrome.tabs.query({ active: true, windowId });
    const switching = prev?.id !== tab.id;
    if (switching && prev?.id !== undefined) {
      const prevId = prev.id;
      const epoch = focusEpoch.get(windowId) ?? 0;
      restore = () => restorePrevious(windowId, tab.id!, prevId, epoch);
    }
    if (switching) await showTab(tab.id!);
    return await captureWithRetry(windowId);
  } finally {
    void startRestore().then(release);
  }
}

/**
 * Re-activates `prevId`, but only while the switch is still what the window shows (T3 V4): the
 * window's active tab, read fresh, is still `targetId`, and no `focusTab` touched the window since
 * the switch (`noteFocus`). Never rejects: the previous tab may have closed meanwhile.
 */
async function restorePrevious(windowId: number, targetId: number, prevId: number, epoch: number): Promise<void> {
  const untouched = (): boolean => (focusEpoch.get(windowId) ?? 0) === epoch;
  try {
    if (!untouched()) return;
    const [now] = await chrome.tabs.query({ active: true, windowId });
    if (now?.id !== targetId || !untouched()) return;
    await chrome.tabs.update(prevId, { active: true });
  } catch {
    // swallowed
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

/**
 * `focusTab` calls this for the window it focuses, before it changes anything: a capture that switched
 * that window earlier then leaves the human's (or the actor's) choice alone instead of restoring.
 */
export function noteFocus(windowId: number): void {
  focusEpoch.set(windowId, (focusEpoch.get(windowId) ?? 0) + 1);
}

/** Test hook: forget the capture chains, the last capture slot and the focus counters. */
export function resetCaptureState(): void {
  captureChains.clear();
  focusEpoch.clear();
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

/**
 * Step 11b S6 (#311 item 2, #312; `…step11b…-steps/Stage0.md` §6 item 1, `stage0-dnr-newtab.txt`): the order in which
 * `newTab` with a URL opens it. `tabs.create({url})` sends its first request before any rule on the new tab's id can
 * act (10 of 10), while `about:blank` first, then the rule, then `tabs.update` sent 0 of 10. So: create on
 * `about:blank` → hold the tab's rules (the gate re-check and the keeper install, `HandlerSafety.holdRulesFor`) → let
 * the blank tab finish its own load (`settleBlank`, armed right after the create) → arm the load listener → navigate →
 * wait for the load. The settle step exists because `waitForLoad` takes the first `complete` for the id: armed while
 * the blank page still loads, the blank's own `complete` would end the wait before the URL loaded and the rules would
 * be released mid-redirect (S6 verifier V1). Pure: every step is injected (`handlers/tabs.ts` passes
 * `chrome.tabs` and `waitForLoad`), so the order is unit-tested (`extension/test/s6-newtab-blank.test.ts`).
 *
 * If the hold or the navigation call throws, the blank tab is removed (no orphan tab) and the error passes unchanged;
 * a load that times out keeps the tab, as `newTab` did before. Never logs.
 */

export const BLANK_URL = "about:blank";

/** Does a `newTab` with this URL take the about:blank sequence? A URL other than `about:blank` only. */
export function opensBehindRules(url: string | undefined): url is string {
  return url !== undefined && url !== BLANK_URL;
}

/** How long the blank tab may take to report its own load before the sequence goes on without it. */
export const BLANK_SETTLE_MS = 2_000;

/** The slice of `chrome.tabs` that `settleBlank` reads. */
export interface BlankTabs {
  get(tabId: number): Promise<{ status?: string }>;
  onUpdated: {
    addListener(l: (id: number, info: { status?: string }) => void): void;
    removeListener(l: (id: number, info: { status?: string }) => void): void;
  };
}

export interface Settling {
  /** Resolves once the blank tab reported `complete`, `get` says `complete` or fails, or the bound passed. Never rejects. */
  done: Promise<void>;
  /** Drops the listener and the timer (the sequence stopped early). */
  cancel(): void;
}

/**
 * Waits for a freshly created blank tab's own load. The listener is armed BEFORE `get` is asked, so a `complete`
 * delivered in between is not missed; a tab that never reports one ends the wait at `boundMs` (no hang).
 */
export function settleBlank(tabId: number, tabs: BlankTabs, boundMs = BLANK_SETTLE_MS): Settling {
  let finish!: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listener = (id: number, info: { status?: string }): void => {
    if (id === tabId && info.status === "complete") end();
  };
  function end(): void {
    clearTimeout(timer);
    tabs.onUpdated.removeListener(listener);
    finish();
  }
  tabs.onUpdated.addListener(listener);
  timer = setTimeout(end, boundMs);
  tabs.get(tabId).then(
    (t) => void (t.status === "complete" && end()),
    () => end(), // a tab gone already: the navigation below fails with Chrome's own error
  );
  return { done, cancel: end };
}

export interface OpenSteps {
  /** `tabs.create({url: "about:blank", active})`: the new tab's id. */
  create(): Promise<number>;
  /** `settleBlank(tabId, chrome.tabs)`: started right after the create, awaited before the load listener is armed. */
  settleBlank(tabId: number): Settling;
  /** The gate's re-check and the tab's rules installed; throws the refusal. */
  holdRules(tabId: number): Promise<void>;
  /** `waitForLoad`: armed after the blank tab settled and before `navigate` runs. */
  waitLoad(tabId: number): Promise<void>;
  /** `tabs.update(tabId, {url})`. */
  navigate(tabId: number): Promise<void>;
  /** `tabs.remove(tabId)`. */
  remove(tabId: number): Promise<void>;
}

/** The sequence; resolves to the tab's id once it loaded. */
export async function openBehindRules(steps: OpenSteps): Promise<number> {
  const id = await steps.create();
  const blank = steps.settleBlank(id); // armed at once: the blank's `complete` may come while the rules install
  try {
    await steps.holdRules(id); // nothing is requested for the URL before this resolves
  } catch (err) {
    blank.cancel();
    await steps.remove(id).catch(() => {});
    throw err;
  }
  await blank.done; // the blank's own `complete` is spent before the URL's load wait is armed (V1)
  const loaded = steps.waitLoad(id); // arm the listener BEFORE navigating (as `handlers/navigate.ts`)
  loaded.catch(() => {}); // a failed navigation below must not leave this rejection unhandled
  try {
    await steps.navigate(id);
  } catch (err) {
    await steps.remove(id).catch(() => {});
    throw err;
  }
  await loaded;
  return id;
}

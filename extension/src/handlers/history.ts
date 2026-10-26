import { targetTab } from "../tabs.js";
import type { HandlerSafety } from "../safety-call.js";

/**
 * Step 11b S3a (#301 (c)): a call holding block-list rules waits for the load it starts, so the rule is still in
 * force for its redirect hops (`goBack`/`goForward` resolve before the load). Bounded, never an error: the answer
 * stays `{ok: true}`. Not waited when the tab is not loading right after the call (a same-document entry, no
 * history, or a load already done; unmeasured, Run 17), nor when the call holds no rule (an empty list: as before).
 */
export const HISTORY_SETTLE_MS = 10_000;

/**
 * The wait for the tab's next `complete`: ends at that event, the tab's close, `stop()` or the bound, and removes its
 * listeners then (S3a fixer N1). Never rejects.
 */
export function settleWait(tabId: number, timeoutMs: number): { done: Promise<void>; stop(): void } {
  let stop = (): void => {};
  const done = new Promise<void>((resolve) => {
    const end = (): void => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(updated);
      chrome.tabs.onRemoved.removeListener(removed);
      resolve();
    };
    const updated = (id: number, info: chrome.tabs.OnUpdatedInfo): void => {
      if (id === tabId && info.status === "complete") end();
    };
    const removed = (id: number): void => {
      if (id === tabId) end();
    };
    const timer = setTimeout(end, timeoutMs);
    chrome.tabs.onUpdated.addListener(updated);
    chrome.tabs.onRemoved.addListener(removed);
    stop = end;
  });
  return { done, stop };
}

async function go(p: Record<string, unknown>, method: "back" | "forward", call?: HandlerSafety): Promise<{ ok: true }> {
  const tab = await targetTab(p, method);
  await call?.effect(); // Step 9: right before the navigation (#137); Step 11b: the rules go in here
  const id = tab.id!;
  const settle = call?.holdsRules?.() ? settleWait(id, HISTORY_SETTLE_MS) : null; // armed BEFORE the navigation
  try {
    await (method === "back" ? chrome.tabs.goBack(id) : chrome.tabs.goForward(id));
    if (settle) {
      const status = await chrome.tabs.get(id).then((t) => t.status, () => undefined);
      if (status === "loading") await settle.done;
    }
  } finally {
    settle?.stop(); // not loading, gone, or a failed goBack: the listeners end now
  }
  return { ok: true };
}

// Step 9: `call?.effect()` right before the navigation (#137).
export function back(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  return go(p, "back", call);
}

export function forward(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  return go(p, "forward", call);
}

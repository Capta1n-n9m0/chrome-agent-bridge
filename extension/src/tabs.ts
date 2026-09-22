import { browserApi } from "./browser-api.js";

export async function activeTab(): Promise<chrome.tabs.Tab> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await browserApi.tabs.query({ active: true, lastFocusedWindow: true });
  } catch {
    // Safari follows the cross-browser `currentWindow` spelling and some releases reject Chrome's
    // `lastFocusedWindow` query key rather than ignoring it.
    tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
  }
  const [tab] = tabs;
  if (!tab?.id) throw new Error("No active tab in the last-focused window");
  return tab;
}

export function waitForLoad(tabId: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      browserApi.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Timed out waiting for tab ${tabId} to load`));
    }, timeoutMs);
    function listener(id: number, info: chrome.tabs.OnUpdatedInfo): void {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        browserApi.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    browserApi.tabs.onUpdated.addListener(listener);
  });
}

export async function ensureContent(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content.js"],
    });
  } catch (err) {
    throw new Error(
      `Could not inject into the active tab — it may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store) where extensions can't run. (${(err as Error).message})`,
    );
  }
}

export async function callInPage<T>(
  tabId: number,
  fn: (...args: unknown[]) => T | PromiseLike<T>,
  args: unknown[] = [],
): Promise<T> {
  // @types/chrome ^0.1.42 ships its own `chrome.scripting.Awaited<T>` that
  // conflicts with TypeScript's built-in `Awaited<T>`, so we fall back to `any`.
  let injection: chrome.scripting.InjectionResult<any> | undefined;
  try {
    [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: fn,
      args,
      world: "ISOLATED",
    });
  } catch (err) {
    throw new Error(
      `Could not run script in the active tab — it may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store). (${(err as Error).message})`,
    );
  }
  if (!injection || injection.result === undefined) {
    throw new Error(
      "The active tab returned no result — it may be on a restricted URL (chrome://, New Tab, Web Store) where extensions can't run.",
    );
  }
  return injection.result as T;
}

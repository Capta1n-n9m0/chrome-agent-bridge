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

/**
 * chrome.scripting.executeScript cannot serialize `undefined` in its args array
 * (it throws "Value is unserializable"). Optional handler params (e.g. scroll
 * with no ref) arrive as `undefined`, so coerce them to `null`, which IS
 * serializable and is falsy in the page-side functions that check for a ref.
 */
export function toSerializableArgs(args: unknown[]): unknown[] {
  return args.map((a) => (a === undefined ? null : a));
}

/**
 * Unwrap a chrome.scripting.executeScript frame result. When an injected
 * function THROWS (e.g. a stale/unknown ref), Chrome resolves the call with a
 * frame whose `result` is `null` (not a rejection), which would otherwise be
 * silently treated as success. None of our page functions return null/undefined
 * on success, so treat either as a failure and surface an actionable error.
 */
export function unwrapResult<T>(injection: { result?: unknown } | undefined): T {
  if (!injection || injection.result === undefined || injection.result === null) {
    throw new Error(
      "The page action returned no result — the element ref may be stale (run browser_snapshot to refresh), " +
        "or the tab may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store).",
    );
  }
  return injection.result as T;
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
      args: toSerializableArgs(args),
      world: "ISOLATED",
    });
  } catch (err) {
    throw new Error(
      `Could not run script in the active tab — it may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store). (${(err as Error).message})`,
    );
  }
  return unwrapResult<T>(injection);
}

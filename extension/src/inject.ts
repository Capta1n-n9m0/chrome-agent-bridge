import { BridgeError, ErrorCodes, splitCoded } from "./errors.js";

/**
 * The code for a rejected `chrome.scripting.executeScript`, from Chrome's raw message. Pure. The
 * thrown message text itself is unchanged; only the code is chosen here.
 */
export function classifyInjectError(raw: string): string {
  if (/no tab with id/i.test(raw)) return ErrorCodes.TAB_UNKNOWN;
  if (/cannot access|chrome:\/\/|chrome-extension:\/\/|extensions gallery|cannot be scripted|devtools:\/\//i.test(raw)) {
    return ErrorCodes.RESTRICTED_URL;
  }
  return ErrorCodes.INTERNAL;
}

function rawMessage(err: unknown): string {
  return err instanceof Error ? err.message : String((err as { message?: unknown } | null)?.message ?? err);
}

export async function ensureContent(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content.js"],
    });
  } catch (err) {
    const raw = (err as Error).message;
    throw new BridgeError(
      classifyInjectError(rawMessage(err)),
      `Could not inject into the active tab — it may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store) where extensions can't run. (${raw})`,
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
 * on success, so treat either (or a missing frame) as a failure: `REF_STALE`,
 * with the restricted-URL clause kept (Stage 0 F30).
 *
 * The content script's guarded methods return `{__bridgeError: "CODE:message"}`
 * instead of throwing (decisions.md · 2026-10-22 · #38); that becomes a
 * `BridgeError` with the marker's code.
 */
export function unwrapResult<T>(injection: { result?: unknown } | undefined): T {
  if (!injection || injection.result === undefined || injection.result === null) {
    throw new BridgeError(
      ErrorCodes.REF_STALE,
      "The page action returned no result — the element ref may be stale (run browser_snapshot to refresh), " +
        "or the tab may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store).",
    );
  }
  const r = injection.result as { __bridgeError?: unknown };
  if (typeof r === "object" && typeof r.__bridgeError === "string") {
    const { code, message } = splitCoded(r.__bridgeError);
    throw new BridgeError(code, message);
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
    throw new BridgeError(
      classifyInjectError(rawMessage(err)),
      `Could not run script in the active tab — it may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store). (${(err as Error).message})`,
    );
  }
  return unwrapResult<T>(injection);
}

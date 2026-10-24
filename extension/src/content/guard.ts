/**
 * Content-script failures are returned, not thrown (decisions.md · 2026-10-22 · Content-script
 * failures are returned, not thrown, to carry `CODE:message` (#38)): a thrown injected function makes
 * `executeScript` resolve with `result: null` and its message is lost (CLAUDE.md gotcha). The page
 * functions keep throwing — with a `code` attached by `codedError` — and `guard` turns the throw into
 * `{__bridgeError: "CODE:message"}`, which `unwrapResult` (inject.ts) splits back into a `BridgeError`.
 *
 * Self-contained on purpose: the content script is an IIFE and pulls nothing from `@bridge/shared`.
 */

/**
 * The returned failure marker. Only `unwrapResult` reads it. `__bridgeData` is set only when the
 * thrown error carried plain-JSON `data` (decisions.md · 2026-10-23 · Page-function failures may
 * carry `data` beside the marker (#82)); the `__bridgeError` string is unchanged by it.
 */
export interface BridgeErrorMarker {
  __bridgeError: string;
  __bridgeData?: unknown;
}

/**
 * An `Error` carrying a protocol code (one of spec §10's), for the guard to read, and optionally
 * `data` (e.g. a locator failure's candidates), which travels as the marker's `__bridgeData`.
 */
export function codedError(code: string, message: string, data?: unknown): Error & { code: string; data?: unknown } {
  const err = new Error(message) as Error & { code: string; data?: unknown };
  err.code = code;
  if (data !== undefined) err.data = data;
  return err;
}

/** A JSON copy of `data` when it is a plain-JSON object or array; otherwise undefined. */
function jsonData(data: unknown): unknown {
  if (data === undefined) return undefined;
  try {
    const text = JSON.stringify(data);
    if (text === undefined) return undefined;
    const copy: unknown = JSON.parse(text);
    return copy !== null && typeof copy === "object" ? copy : undefined;
  } catch {
    return undefined; // a cycle, a BigInt, a throwing toJSON
  }
}

const CODE_RE = /^[A-Z][A-Z_]*$/;

/** A thrown value → its `"CODE:message"` marker; anything without a valid code is `INTERNAL`. */
export function toMarker(err: unknown): BridgeErrorMarker {
  const raw = (err as { code?: unknown } | null)?.code;
  const code = typeof raw === "string" && CODE_RE.test(raw) ? raw : "INTERNAL";
  const message = err instanceof Error ? err.message : String(err);
  const marker: BridgeErrorMarker = { __bridgeError: `${code}:${message}` };
  const data = jsonData((err as { data?: unknown } | null)?.data);
  if (data !== undefined) marker.__bridgeData = data;
  return marker;
}

/**
 * Wraps a public `window.__agentBridge` method: a throw comes back as a marker *result*. The return
 * type stays the method's success type because the handlers only ever see the result through
 * `unwrapResult`, which throws on the marker.
 */
export function guard<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return (...args: A): R => {
    try {
      return fn(...args);
    } catch (err) {
      return toMarker(err) as unknown as R;
    }
  };
}

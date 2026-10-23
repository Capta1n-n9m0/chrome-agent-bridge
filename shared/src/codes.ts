/**
 * Error codes — spec §10 of `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. Exactly these
 * 23: 22 that the daemon and the extension put on the wire (`{id, error: {code, message, data?}}`),
 * plus `NO_CURSOR`, raised by the SDK alone. Add a code only by amending the spec first.
 */

/** Raised by the daemon itself (routing, leases, handshake). */
export const DAEMON_ERROR_CODES = [
  "NOT_CONNECTED",
  "TIMEOUT",
  "UNKNOWN_METHOD",
  "BAD_PARAMS",
  "TAB_HELD",
  "TAB_GONE",
  "TAB_UNKNOWN",
  "LOCK_TIMEOUT",
  "VERSION",
] as const;

/** Raised by the extension's handlers. `INTERNAL` also wraps a v1 `{message}` error. */
export const EXTENSION_ERROR_CODES = [
  "REF_STALE",
  "LOCATOR_NOT_FOUND",
  "LOCATOR_AMBIGUOUS",
  "OFFSCREEN",
  "RESTRICTED_URL",
  "DEBUGGER_ATTACH",
  "DEBUGGER_CANCELLED",
  "DEBUGGER_DEVTOOLS",
  "PAGE_ERROR",
  "NAV_FAILED",
  "DOWNLOAD_HTTP",
  "WINDOW_MINIMIZED",
  "INTERNAL",
] as const;

/**
 * Raised by the SDK only (a Tab-less call with no cursor: "call newTab() or claim() first"), never by
 * the daemon or the extension (decisions.md · 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as
 * the 23rd code (#76)).
 */
export const SDK_ERROR_CODES = ["NO_CURSOR"] as const;

export type DaemonErrorCode = (typeof DAEMON_ERROR_CODES)[number];
export type ExtensionErrorCode = (typeof EXTENSION_ERROR_CODES)[number];
export type SdkErrorCode = (typeof SDK_ERROR_CODES)[number];
export type ErrorCode = DaemonErrorCode | ExtensionErrorCode | SdkErrorCode;

export const ErrorCodes = {
  NOT_CONNECTED: "NOT_CONNECTED",
  TIMEOUT: "TIMEOUT",
  UNKNOWN_METHOD: "UNKNOWN_METHOD",
  BAD_PARAMS: "BAD_PARAMS",
  TAB_HELD: "TAB_HELD",
  TAB_GONE: "TAB_GONE",
  TAB_UNKNOWN: "TAB_UNKNOWN",
  LOCK_TIMEOUT: "LOCK_TIMEOUT",
  VERSION: "VERSION",
  REF_STALE: "REF_STALE",
  LOCATOR_NOT_FOUND: "LOCATOR_NOT_FOUND",
  LOCATOR_AMBIGUOUS: "LOCATOR_AMBIGUOUS",
  OFFSCREEN: "OFFSCREEN",
  RESTRICTED_URL: "RESTRICTED_URL",
  DEBUGGER_ATTACH: "DEBUGGER_ATTACH",
  DEBUGGER_CANCELLED: "DEBUGGER_CANCELLED",
  DEBUGGER_DEVTOOLS: "DEBUGGER_DEVTOOLS",
  PAGE_ERROR: "PAGE_ERROR",
  NAV_FAILED: "NAV_FAILED",
  DOWNLOAD_HTTP: "DOWNLOAD_HTTP",
  WINDOW_MINIMIZED: "WINDOW_MINIMIZED",
  INTERNAL: "INTERNAL",
  NO_CURSOR: "NO_CURSOR",
} as const satisfies { [K in ErrorCode]: K };

const ALL_CODES: ReadonlySet<string> = new Set<string>([
  ...DAEMON_ERROR_CODES,
  ...EXTENSION_ERROR_CODES,
  ...SDK_ERROR_CODES,
]);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && ALL_CODES.has(value);
}

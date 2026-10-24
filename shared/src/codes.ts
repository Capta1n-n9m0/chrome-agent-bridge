/**
 * Error codes — spec §10 of `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. Exactly these
 * 25: 24 that the daemon and the extension put on the wire (`{id, error: {code, message, data?}}`),
 * plus `NO_CURSOR`, raised by the SDK alone. Add a code only by amending the spec first.
 * Step 9 S0 (2026-10-24) added `DISARMED` and `DOMAIN_BLOCKED` after spec §10's dated Step 9 note
 * (decisions.md · 2026-10-24 · The JavaScript switch reuses `DISARMED` with a scope (#133); · The safety
 * state travels as two events and a `daemon.status` field (#132)).
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

/**
 * Raised by the extension's handlers. `INTERNAL` also wraps a v1 `{message}` error.
 *
 * Step 9's two (spec §10's Step 9 notes):
 * - `DISARMED`: the human turned the bridge off in Chrome (`data: {scope: "all"}`), or JavaScript is off and
 *   the call is an `evaluate` or a `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL
 *   (`data: {scope: "evaluate"}`) — `DisarmedData` in `protocol.ts` (#133, #138).
 * - `DOMAIN_BLOCKED`: the tab's URL, or the call's own target URL, is on the human's block list; or the call
 *   is a `navigate`/`newTab` to any `chrome-extension://` URL; or the tab shows this extension's own page
 *   (#138). Its message and data reveal no host or pattern (Stage 0 row SAFE-5).
 */
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
  "DISARMED",
  "DOMAIN_BLOCKED",
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
  DISARMED: "DISARMED",
  DOMAIN_BLOCKED: "DOMAIN_BLOCKED",
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

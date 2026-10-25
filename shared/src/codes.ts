/**
 * Error codes — spec §10 of `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. Exactly these
 * 27: 26 that the daemon and the extension put on the wire (`{id, error: {code, message, data?}}`),
 * plus `NO_CURSOR`, raised by the SDK alone. Add a code only by amending the spec first.
 * Step 9 S0 (2026-10-24) added `DISARMED` and `DOMAIN_BLOCKED` after spec §10's dated Step 9 note
 * (decisions.md · 2026-10-24 · The JavaScript switch reuses `DISARMED` with a scope (#133); · The safety
 * state travels as two events and a `daemon.status` field (#132)).
 * Step 10 S4b (2026-10-25) added `JS_DISABLED` after spec §10's dated Step 10 note (decisions.md ·
 * 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202), which changed #133).
 * *Superseded 2026-10-25: was "Exactly these 25: 24 … on the wire", because S4b added `JS_DISABLED`.*
 * Step 11 S2 (2026-10-25) added `UPLOAD_REFUSED` after spec §10's dated Step 11 note (decisions.md · 2026-10-25 ·
 * Step 11: the safety class `upload` and the code `UPLOAD_REFUSED` (#237)).
 * *Superseded 2026-10-25: was "Exactly these 26: 25 … on the wire", because Step 11 S2 added `UPLOAD_REFUSED`.*
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
 * Step 9's two (spec §10's Step 9 notes) and Step 10's one (spec §10's Step 10 note):
 * - `DISARMED`: the human turned the bridge off in Chrome (`data: {scope: "all"}`) — `DisarmedData` in
 *   `protocol.ts`. *Superseded 2026-10-25: was "…, or JavaScript is off and the call is an `evaluate` or a
 *   `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL (`data: {scope: "evaluate"}`)", because
 *   #202 gave that case its own code, `JS_DISABLED`; a Step 10 extension produces only `scope: "all"`, and
 *   `"evaluate"` stays in the type for an old (Step 9) extension (Stage 0 F17).*
 * - `JS_DISABLED`: the bridge is on, JavaScript is off, and the call is an `evaluate` (with or without
 *   `asRef`), one of S4's `evaluateSave*`, or a `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL
 *   (#202, #138). No `data`; while the bridge is off `DISARMED` wins.
 * - `DOMAIN_BLOCKED`: the tab's URL, or the call's own target URL, is on the human's block list; or the call
 *   is a `navigate`/`newTab` to any `chrome-extension://` URL; or the tab shows this extension's own page
 *   (#138). Its message and data reveal no host or pattern (Stage 0 row SAFE-5). Since Step 11 S2 also every call
 *   on a `file:` tab and every `navigate`/`newTab` to a `file:` URL (#245 (a)).
 * - `UPLOAD_REFUSED` (Step 11 S2, spec §10's Step 11 note): a path given to `uploadFiles` is not strictly inside a
 *   folder the human allows for uploads, or `paths` is malformed. A fixed message naming no path, folder, count or
 *   file; no `data` (#237, #249).
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
  "JS_DISABLED",
  "UPLOAD_REFUSED",
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
  JS_DISABLED: "JS_DISABLED",
  UPLOAD_REFUSED: "UPLOAD_REFUSED",
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

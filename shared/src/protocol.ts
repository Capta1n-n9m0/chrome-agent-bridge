import type { WireError } from "./error.js";

// Who raises a code (Stage 0 audit F21): `codes.ts` groups codes by who *mainly* raises them, not
// who may. The extension also raises three it lists as daemon codes — `TAB_UNKNOWN` (Step 7 decision
// 0.1: `chrome.tabs.get` "No tab with id" when no handle was involved), `TAB_GONE` (the daemon
// resolved a valid handle but the tab closed in between) and `TIMEOUT` (0.6: `describeDebuggerError`).
// `ErrorCode` is one union, so this compiles; read the grouping as a hint, not a restriction.
export * from "./codes.js";
export * from "./error.js";

export interface RequestMessage {
  id: string;
  method: string;
  params?: Record<string, unknown>;
  /** Per-call timeout the client wants (v2); the daemon bounds and pads it. */
  timeoutMs?: number;
}

export interface SuccessResponse {
  id: string;
  result: unknown;
}

export interface ErrorResponse {
  id: string;
  /** v2 carries `code` (and maybe `data`); a v1 extension sends `{message}` only. */
  error: WireError;
}

export type ResponseMessage = SuccessResponse | ErrorResponse;

export type HelloRole = "extension" | "client";

/**
 * First frame on every connection. v1 is `{type, token}` and is accepted as an extension; v2 adds
 * the optional fields below, each validated by `isHello` when present.
 */
export interface HelloMessage {
  type: "hello";
  token: string;
  role?: HelloRole;
  name?: string;
  build?: string;
  proto?: number;
  /**
   * The extension's session marker: the same across service-worker restarts and extension reloads,
   * new after a Chrome restart. S0 adds only the field and its type check; S2b gives it behaviour (the
   * daemon retires every handle when it changes). Never log it (decisions.md · 2026-10-23 · The
   * extension hello carries an optional session marker (#74); amended by · The session marker's
   * mechanism, amended (#80)).
   */
  session?: string;
}

/** The daemon's answer to a client's hello (spec §10). */
export interface WelcomeMessage {
  type: "welcome";
  build: string;
  proto: number;
  clientId: string;
  extensionConnected: boolean;
}

/**
 * An unsolicited message: extension → daemon (`tabCreated`, `tabRemoved`, `tabReplaced`, …) or
 * daemon → client (`tabGone`, `leaseGranted`, `extensionStatus`). It never has an `id`.
 */
export interface EventMessage<P extends object = Record<string, unknown>> {
  event: string;
  params: P;
}

/** Params of the daemon → client `extensionStatus` event (spec §9.7). */
export interface ExtensionStatusParams {
  connected: boolean;
}

/**
 * Events the extension sends the daemon (spec §10). `safetyState` is Step 9's (decisions.md · 2026-10-24 ·
 * The safety state travels as two events and a `daemon.status` field (#132)).
 */
export type ExtensionEventName = "tabCreated" | "tabRemoved" | "tabReplaced" | "safetyState";

/** Events the daemon sends a client (spec §10). `safetyStatus` is Step 9's (#132). */
export type DaemonEventName = "tabGone" | "leaseGranted" | "extensionStatus" | "safetyStatus";

/**
 * Params of the extension → daemon `tabCreated` event (spec §10; Stage 0 audit F13), from
 * `chrome.tabs.onCreated`. `url` is `pendingUrl ?? url ?? ""`, so it may be "".
 * Step 9 adds no field here: for a tab created while disarmed or onto a blocked URL, `url` is `""` and
 * nothing marks it hidden (decisions.md · 2026-10-24 · What `listTabs`, tab events and the daemon reveal
 * while disarmed or for a blocked tab (#134)).
 */
export interface TabCreatedParams {
  tabId: number;
  openerTabId?: number;
  url: string;
}

/**
 * Params of the extension → daemon `tabRemoved` event (spec §10; F13), from `chrome.tabs.onRemoved`.
 * `lastUrl`/`lastTitle` are what the extension last saw, when it saw anything; never log them.
 */
export interface TabRemovedParams {
  tabId: number;
  lastUrl?: string;
  lastTitle?: string;
  /**
   * Step 9: set when the tab was removed while the bridge was disarmed, or while its URL was blocked; then
   * `lastUrl` and `lastTitle` are absent (decisions.md · 2026-10-24 · What `listTabs`, tab events and the
   * daemon reveal while disarmed or for a blocked tab (#134)).
   */
  hidden?: HiddenReason;
}

/**
 * Params of the extension → daemon `tabReplaced` event (spec §10; F13), from
 * `chrome.tabs.onReplaced`: the daemon remaps the handle to `addedTabId`. Spec §6.2 names a Memory-Saver
 * discard as a cause; not measured (Chrome documents prerender/instant; row LEASE-6 measures it, #45).
 */
export interface TabReplacedParams {
  addedTabId: number;
  removedTabId: number;
}

/**
 * Params of the daemon → client `tabGone` event (spec §10; F13): a tab the client leased closed.
 * `tab` is the daemon's handle ("T3"), never a Chrome tab id; never log `lastUrl`/`lastTitle`.
 */
export interface TabGoneParams {
  tab: string;
  lastUrl?: string;
  lastTitle?: string;
}

/**
 * Params of the daemon → client `leaseGranted` event (spec §10; F13): a tab opened from a tab the
 * client holds (`openerTabId`) is leased to it too. `url` starts as `tabCreated`'s, which for a popup
 * is often "" or "about:blank"; the daemon then polls `listTabs` (every 100 ms, about 2 s at most)
 * before sending the event, and sends the best url it has, which can still be "" or "about:blank" (T5b fix 3; decisions.md
 * · 2026-10-23 · T5b's three fixes). The lease itself takes effect at once.
 */
export interface LeaseGrantedParams {
  tab: string;
  reason: "opener";
  url: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isResponse(value: unknown): value is ResponseMessage {
  if (!isObject(value)) return false;
  const v = value;
  return typeof v.id === "string" && ("result" in v || "error" in v);
}

export function isErrorResponse(value: ResponseMessage): value is ErrorResponse {
  return "error" in value;
}

export function isHello(value: unknown): value is HelloMessage {
  if (!isObject(value)) return false;
  const v = value;
  if (v.type !== "hello" || typeof v.token !== "string") return false;
  if ("role" in v && v.role !== "extension" && v.role !== "client") return false;
  if ("name" in v && typeof v.name !== "string") return false;
  if ("build" in v && typeof v.build !== "string") return false;
  if ("proto" in v && typeof v.proto !== "number") return false;
  if ("session" in v && typeof v.session !== "string") return false;
  return true;
}

export function isWelcome(value: unknown): value is WelcomeMessage {
  if (!isObject(value)) return false;
  const v = value;
  return (
    v.type === "welcome" &&
    typeof v.build === "string" &&
    typeof v.proto === "number" &&
    typeof v.clientId === "string" &&
    typeof v.extensionConnected === "boolean"
  );
}

export function isEvent(value: unknown): value is EventMessage {
  if (!isObject(value)) return false;
  const v = value;
  return typeof v.event === "string" && !("id" in v) && isObject(v.params);
}

/** An `isEvent` frame named `name`, or null. */
function eventParams(value: unknown, name: ExtensionEventName | DaemonEventName): Record<string, unknown> | null {
  if (!isEvent(value) || value.event !== name) return null;
  return value.params as Record<string, unknown>;
}

function isTabId(v: unknown): v is number {
  return Number.isInteger(v);
}

/**
 * Absent (or `undefined`, which JSON drops anyway, so an in-process frame and its wire form agree), or a
 * value `check` accepts. `null` is not absent: it is mistyped.
 */
function optional(p: Record<string, unknown>, key: string, check: (v: unknown) => boolean): boolean {
  return p[key] === undefined || check(p[key]);
}

const isString = (v: unknown): v is string => typeof v === "string";

// The five guards below check the exact event name, then each field's type: required fields present,
// optional ones (when present) of the right type, unknown fields accepted (forward-compatible, as
// `isHello` is).

export function isTabCreatedEvent(value: unknown): value is EventMessage<TabCreatedParams> {
  const p = eventParams(value, "tabCreated");
  return p !== null && isTabId(p.tabId) && isString(p.url) && optional(p, "openerTabId", isTabId);
}

export function isTabRemovedEvent(value: unknown): value is EventMessage<TabRemovedParams> {
  const p = eventParams(value, "tabRemoved");
  return (
    p !== null &&
    isTabId(p.tabId) &&
    optional(p, "lastUrl", isString) &&
    optional(p, "lastTitle", isString) &&
    optional(p, "hidden", isHiddenReason)
  );
}

export function isTabReplacedEvent(value: unknown): value is EventMessage<TabReplacedParams> {
  const p = eventParams(value, "tabReplaced");
  return p !== null && isTabId(p.addedTabId) && isTabId(p.removedTabId);
}

export function isTabGoneEvent(value: unknown): value is EventMessage<TabGoneParams> {
  const p = eventParams(value, "tabGone");
  return p !== null && isString(p.tab) && optional(p, "lastUrl", isString) && optional(p, "lastTitle", isString);
}

export function isLeaseGrantedEvent(value: unknown): value is EventMessage<LeaseGrantedParams> {
  const p = eventParams(value, "leaseGranted");
  return p !== null && isString(p.tab) && p.reason === "opener" && isString(p.url);
}

/**
 * How `screenshot` captures (spec §7). `"switch"` (the default) activates the tab under the daemon's
 * visibility lock and uses `captureVisibleTab`; `"cdp"` uses `Page.captureScreenshot` through the
 * debugger: no lock, no tab switch, but the "extension is debugging this browser" banner. `"cdp"`
 * works only on a tab that is active in a window that is not minimized: it refuses a minimized window
 * with `WINDOW_MINIMIZED` and a background tab with `OFFSCREEN` before attaching, because Run 8
 * measured both to hang until the call timed out (T5b fix 2; decisions.md · 2026-10-23 · T5b's three
 * fixes).
 */
export type ScreenshotMode = "switch" | "cdp";

/**
 * One element of a structured snapshot (Step 7 decision 0.7). `ref` is the RefMap ref ("e12") that
 * actions take; `depth` (nesting) and `frame` (which same-origin frame, absent for the top document)
 * are what T3 fills. The SDK formatter (T4) must render a `SnapshotResult` to today's snapshot text
 * byte-identically.
 */
export interface SnapshotElement {
  ref: string;
  role: string;
  name: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  href?: string;
  depth: number;
  frame?: number;
}

/**
 * The value of a `snapshot` call. Types only — like `EvalEnvelope`, it is the `result` of a
 * response, so no runtime guard is needed. `truncated` is set when the 800-element cap was hit.
 */
export interface SnapshotResult {
  url: string;
  title: string;
  elements: SnapshotElement[];
  truncated: boolean;
}

/**
 * The value of a `browser_evaluate` call, produced either by the in-page serialiser
 * (`extension/src/evaluate/serialize.ts`) or by shaping a CDP primitive result.
 *
 * `description` is the only field the model is shown; `value` exists so a caller can reuse the data
 * programmatically. Types only — this never crosses the wire on its own, it is the `result` of an
 * `evaluate` response, so no runtime guard is needed.
 */
export interface EvalEnvelope {
  kind: "json" | "node" | "function" | "error" | "undefined" | "unserializable" | "other";
  /** Present for kind "json" only — plain JSON the agent can reuse. */
  value?: unknown;
  /** What the tool prints; for "json" it is `JSON.stringify(value, null, 2)`. */
  description: string;
  /** Any limit (depth / items / string / total chars) was hit. */
  truncated: boolean;
  /**
   * A RefMap ref ("e12") for the value, set only when the call passed `asRef: true` and the value is an
   * `Element` (Step 8 phase doc 0.3: the CDP path marks the node, the content script mints the ref).
   */
  ref?: string;
}

/**
 * One observed network request (or one hop of a redirect chain), captured by the extension's
 * `chrome.webRequest` observers — see `extension/src/network-log.ts`.
 *
 * Headers are redacted at ingest and cookies never reach the extension at all (`extraHeaders` is
 * deliberately omitted from every `extraInfoSpec`), so this shape is safe to store. Types only —
 * it only ever travels as the `result` of a `networkRequests` response, so no runtime guard.
 */
export interface NetworkEntry {
  /** Chrome's requestId; redirect hops are suffixed ":2", ":3", … */
  id: string;
  /** -1 = not attributable to a tab (site service workers, other extensions). */
  tabId: number;
  url: string;
  method: string;
  /** webRequest ResourceType: main_frame, xmlhttprequest, script, image, … */
  type: string;
  /** Origin that started the request. */
  initiator?: string;
  /** Epoch ms — `timeStamp` of onBeforeRequest. */
  startedAt: number;
  /** Epoch ms — set by onCompleted / onErrorOccurred / onBeforeRedirect. */
  endedAt?: number;
  durationMs?: number;
  /** Absent while pending or on a network error. */
  status?: number;
  statusLine?: string;
  fromCache?: boolean;
  ip?: string;
  /** Set on a 3xx hop that Chrome followed. */
  redirectUrl?: string;
  /** net::ERR_* from onErrorOccurred. */
  error?: string;
  /** content-length, when present. */
  responseSize?: number;
  /** Redacted at ingest and capped; only returned when asked for. */
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  /** ≤ 2 KB redacted summary; only returned when asked for. */
  requestBody?: string;
}

/**
 * The value of a `downloadStart` call: the extension fetched the URL with the profile's cookies and
 * holds the bytes under `id` until `downloadEnd` (or its TTL). The server then pulls them with
 * `downloadChunk` and writes the file. Only the final host is returned, never the full final URL:
 * redirect targets are often signed (S3 `X-Amz-Signature`, …).
 */
export interface DownloadStartResult {
  id: string;
  /** Bytes held. */
  size: number;
  status: number;
  /** `content-type` without parameters, "" when absent. */
  contentType: string;
  /** From `content-disposition`, else the last path segment of the final URL, else "". */
  filename: string;
  redirected: boolean;
  finalHost: string;
}

/** The value of a `downloadChunk` call. */
export interface DownloadChunkResult {
  /** Base64 of bytes [offset, offset + length). */
  data: string;
}

// ── Step 10 S4: `browser_evaluate {saveTo}` (phase doc 0.4, transport (B); decisions.md #127, #205, #207) ──
// Three tab methods, modelled on `downloadStart`/`downloadChunk`/`downloadEnd`. A client adds `tab`; the
// daemon forwards a numeric `tabId` (tab methods, lease-checked, no lock). The extension evaluates the
// expression as `evaluate` does, keeps the value's UTF-8 bytes in a store keyed by `id` AND the tab, and the
// client pulls them in slices. The value never travels in one message, never in a start result, an error
// message or a log line; the extension never receives the file path (it lives only in the client).

/** What a saved value was: a string kept as is, or any other value `JSON.stringify`'d in the page. */
export type EvaluateSaveKind = "string" | "json";

/** `evaluateSaveStart`'s own params (plus `tab` from a client, `tabId` at the extension). */
export interface EvaluateSaveStartParams {
  expression: string;
  /** The page-side bound, as `evaluate`'s (default 10 000, clamped to [100, 60 000]). */
  timeoutMs?: number;
}

/**
 * The value of an `evaluateSaveStart` call: the store holds `bytes` UTF-8 bytes (as `TextEncoder` makes them)
 * under `id` for this tab until `evaluateSaveEnd` (or its TTL, a disarm, JavaScript turned off, the tab's
 * close). Never the value, a preview or a description of it.
 */
export interface EvaluateSaveStartResult {
  id: string;
  bytes: number;
  kind: EvaluateSaveKind;
}

/** `evaluateSaveChunk`'s own params: bytes [offset, offset + length), length ≤ 1 MiB (default 1 MiB). */
export interface EvaluateSaveChunkParams {
  id: string;
  offset: number;
  length?: number;
}

/** The value of an `evaluateSaveChunk` call: base64 of the slice, as `DownloadChunkResult`. */
export type EvaluateSaveChunkResult = DownloadChunkResult;

/** `evaluateSaveEnd`'s own params; its value is `{released: boolean}`, as `downloadEnd`'s. */
export interface EvaluateSaveEndParams {
  id: string;
}

/** The value of a `browser_network_requests` call. */
export interface NetworkRequestsResult {
  /** The selected page, oldest → newest. */
  entries: NetworkEntry[];
  /** Pre-limit count after filters, so the agent knows it was truncated. */
  total: number;
  /** In flight, started less than 30 s ago. */
  pending: number;
  /** Epoch ms — when this log started (extension load / last clear of "all"). */
  recordingSince: number;
  // `text` was removed in Step 7 T4 (decisions.md #49): the SDK's `formatNetwork` renders `entries`.
}

// ── Step 8 (docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md) ───────────────────────────────
// The params below are a method's own params. The routing keys are not part of them: a client adds
// `tab` (a handle, "T3"), and the daemon replaces it with a numeric `tabId` before forwarding.

/**
 * A role locator's `name`: a string (case-insensitive substring, or equality with `exact: true`) or a
 * `{regex, flags?}` pattern, built in the page as `new RegExp(regex, flags)` (phase doc 0.1).
 */
export type LocatorName = string | { regex: string; flags?: string };

/**
 * What a script names an element by instead of a ref (phase doc 0.1). Resolved in the content script by
 * the snapshot's rules:
 * - `{role, name?}` matches only what a snapshot lists (same role and accessible name computation).
 * - `{text}` matches the innermost element that survives the snapshot's pruning gates
 *   (`aria-hidden`/`inert`/`hidden`/`display:none`, zero-size when the document has layout) whose
 *   normalised text contains the needle, case-insensitive; `exact: true` means equality (decisions.md ·
 *   2026-10-23 · Locator rules, the MCP locator schema and the exported `BridgeError` (#83) item 1).
 * - `{css}` matches any element, interactive or not; the ref is minted on the spot.
 * `nth` (0-based) picks one of several matches in the snapshot's walk order; without it more than one
 * match is `LOCATOR_AMBIGUOUS`, none `LOCATOR_NOT_FOUND`. `exact` exists on the role and text variants
 * only. The type cannot reject every mix of variants (see `shared/test/protocol-step8.test.ts`); a
 * locator that crosses the wire is checked with `isLocator`.
 */
export type Locator =
  | { role: string; name?: LocatorName; exact?: boolean; nth?: number }
  | { text: string; exact?: boolean; nth?: number }
  | { css: string; nth?: number };

/** The value of a `locate` call (phase doc 0.1). `ref` stays valid with the last snapshot's refs. */
export interface LocateResult {
  ref: string;
  role: string;
  name: string;
  /**
   * Step 10 S3 (phase doc 0.3; decisions.md #117, #206): set, and only ever to `true`, when the element
   * comes after the 800th element a snapshot taken now would list (one `browser_snapshot` never shows).
   * Absent otherwise, so a page with ≤ 800 listable elements answers exactly as before. An action
   * resolved from a locator carries the same key on its reply; `waitFor {locator}` carries none.
   */
  pastSnapshotCap?: true;
}

/**
 * `waitFor`'s params: exactly one of four arms (phase doc 0.2, 0.4). The locator arm polls `locate`
 * every 100 ms up to `timeoutMs` (default 10 s); `state: "hidden"` resolves when `locate` answers
 * `LOCATOR_NOT_FOUND`. `{text: string}` is required (not 0.4's `{text?}`, which made `{}` valid) and
 * `timeoutMs?` is on the locator arm as 0.2 says (stage0-audit.md F28, S0 step agent).
 */
export type WaitForParams =
  | { text: string }
  | { locator: Locator; state?: "visible" | "hidden"; timeoutMs?: number }
  | { networkIdle: true; idleMs?: number }
  | { seconds: number };

/** An action's target: a ref from a snapshot or a locator, exactly one (phase doc 0.2). */
export type ActionTarget = { ref: string; locator?: never } | { locator: Locator; ref?: never };

/**
 * Options of the trusted-capable input methods (`click`, `type`, `pressKey`). `trusted` sends real CDP
 * input through the debugger. `focusEmulation` asks the extension to turn on CDP focus emulation for
 * that input, so a background tab can receive it; stage FE measures whether it works, and
 * `sdk/src/policy.ts` (S3) decides when the SDK sends it (decisions.md · 2026-10-23 · FE's rows and
 * outcome table, amended before anything is measured (#78)).
 */
export interface TrustedInputOptions {
  trusted?: boolean;
  focusEmulation?: boolean;
}

/** `click`'s params (phase doc 0.2). */
export type ClickParams = ActionTarget & TrustedInputOptions;

/** `type`'s params (phase doc 0.2). `submit` presses Enter after the text. */
export type TypeParams = ActionTarget & TrustedInputOptions & { text: string; submit?: boolean };

/** `pressKey`'s params: it acts on the focused element, so it takes no target. */
export interface PressKeyParams extends TrustedInputOptions {
  key: string;
}

/**
 * `evaluate`'s params. `asRef: true` asks for a ref to the value when it is an `Element`, returned as
 * `EvalEnvelope.ref` (phase doc 0.3).
 */
export interface EvaluateParams {
  expression: string;
  timeoutMs?: number;
  asRef?: boolean;
}

const LOCATOR_KINDS = ["role", "text", "css"] as const;
const LOCATOR_KEYS: Record<(typeof LOCATOR_KINDS)[number], readonly string[]> = {
  role: ["role", "name", "exact", "nth"],
  text: ["text", "exact", "nth"],
  css: ["css", "nth"],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

/** Own keys whose value is not `undefined` (JSON drops those, so in-process and wire forms agree). */
function definedKeys(v: Record<string, unknown>): string[] {
  return Object.keys(v).filter((k) => v[k] !== undefined);
}

function isLocatorName(v: unknown): v is LocatorName {
  if (typeof v === "string") return true;
  if (!isPlainObject(v)) return false;
  if (typeof v.regex !== "string" || !optional(v, "flags", isString)) return false;
  return definedKeys(v).every((k) => k === "regex" || k === "flags");
}

/**
 * A `Locator` as it arrives untyped (from a script, the MCP or the wire): a plain object with exactly
 * one of `role`/`text`/`css` as a non-empty string; `name` (role only) a string or `{regex, flags?}`
 * with no other keys; `exact` (role and text only) a boolean; `nth` a non-negative safe integer; no
 * other key. A key whose value is `undefined` counts as absent, as in the event guards above.
 */
export function isLocator(value: unknown): value is Locator {
  if (!isPlainObject(value)) return false;
  const keys = definedKeys(value);
  const kinds = LOCATOR_KINDS.filter((k) => keys.includes(k));
  if (kinds.length !== 1) return false;
  const kind = kinds[0];
  const needle = value[kind];
  if (typeof needle !== "string" || needle === "") return false;
  if (!keys.every((k) => LOCATOR_KEYS[kind].includes(k))) return false;
  if (!optional(value, "name", isLocatorName)) return false;
  if (!optional(value, "exact", (v) => typeof v === "boolean")) return false;
  return optional(value, "nth", (v) => Number.isSafeInteger(v) && (v as number) >= 0);
}

// ── Step 9 (docs/plans/2026-10-24-step9-phase-e-safety.md; spec §10's Step 9 note) ───────────────────
// The human's three controls, enforced in the extension. Nothing here changes the safety state: no
// method of any layer arms, disarms, edits the block list or turns JavaScript on (phase doc 0.1).

/**
 * The extension's safety state as reported to the daemon and relayed to clients: `armed` (the kill
 * switch), `evaluate` (the JavaScript switch), `blockedCount` (the number of valid block-list patterns;
 * the patterns themselves never leave the extension). decisions.md · 2026-10-24 · The safety state travels
 * as two events and a `daemon.status` field (#132); the count is of valid patterns only (· The block-list
 * grammar (#135)).
 */
export interface SafetyState {
  armed: boolean;
  evaluate: boolean;
  blockedCount: number;
}

/** Params of the extension → daemon `safetyState` event: sent when the connection comes up and on every change (#132). */
export type SafetyStateParams = SafetyState;

/** Params of the daemon → client `safetyStatus` event: relayed on every change (#132). */
export type SafetyStatusParams = SafetyState;

/**
 * The type of `daemon.status`'s `safety` field: null until the extension has reported, and null again
 * after the extension socket closes (decisions.md · 2026-10-24 · The safety state travels as two events
 * and a `daemon.status` field (#132)).
 */
export type DaemonStatusSafety = SafetyState | null;

/**
 * Which switch a `DISARMED` refusal comes from: `"all"` the kill switch, `"evaluate"` the JavaScript
 * switch on an `evaluate` (decisions.md · 2026-10-24 · The JavaScript switch reuses `DISARMED` with a
 * scope (#133)).
 * *Superseded 2026-10-25 (Step 10 S4b): `"evaluate"` is no longer produced — a Step 10 extension answers
 * "JavaScript is off" with its own code, `JS_DISABLED` (no `data`), and sends `DISARMED` only with `"all"`,
 * because #202 changed #133. Both values stay: an old (Step 9) extension may still send `"evaluate"`, which
 * the SDK and the MCP render as the JavaScript-off line (Stage 0 F17).*
 */
export type SafetyScope = "all" | "evaluate";

/** `DISARMED`'s `data` (#133). */
export interface DisarmedData {
  scope: SafetyScope;
}

/**
 * Why a `listTabs` row or a `tabRemoved` event carries no title or URL: the bridge is disarmed, or the
 * tab's URL is blocked (or is one of the extension's own pages) (decisions.md · 2026-10-24 · What
 * `listTabs`, tab events and the daemon reveal while disarmed or for a blocked tab (#134)).
 */
export type HiddenReason = "disarmed" | "blocked";

/**
 * One row of a `listTabs` result as the extension sends it (`extension/src/handlers/tabs.ts`). Before
 * Step 9 `title` and `url` were always present (`""` when Chrome had none); since Step 9 a hidden row
 * omits both and carries `hidden` (#134). Types only — the `result` of a response.
 */
export interface ExtensionListTabsRow {
  id: number;
  title?: string;
  url?: string;
  active: boolean;
  windowId: number;
  /** Only when Chrome reports one. */
  openerTabId?: number;
  /** Set (true) on exactly the human's tab (#43); absent on the others. Kept on a hidden row (#134). */
  current?: true;
  /** Step 9: present exactly when `title` and `url` are withheld (#134). */
  hidden?: HiddenReason;
}

/**
 * One row of a `listTabs` result as a client receives it: the extension's row plus the daemon's handle
 * (`tab`, "T3") and the holder's actor name (`owner`, when held) (`daemon/src/intercept.ts` `listTabs`;
 * spec §10's Step 7 note). The Chrome `id` stays beside `tab` (#81).
 */
export interface ListTabsRow extends ExtensionListTabsRow {
  tab: string;
  owner?: string;
}

const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

/**
 * A `SafetyState` as it arrives untyped: `armed` and `evaluate` booleans, `blockedCount` a non-negative
 * safe integer. A missing or mistyped field (`null` included) is rejected; unknown extra keys are accepted
 * (forward-compatible, as the event guards above).
 */
export function isSafetyState(value: unknown): value is SafetyState {
  if (!isPlainObject(value)) return false;
  return (
    isBoolean(value.armed) &&
    isBoolean(value.evaluate) &&
    Number.isSafeInteger(value.blockedCount) &&
    (value.blockedCount as number) >= 0
  );
}

export function isSafetyScope(value: unknown): value is SafetyScope {
  return value === "all" || value === "evaluate";
}

/** `DISARMED`'s `data`: an object whose `scope` is `"all"` or `"evaluate"`; extra keys accepted (#133). */
export function isDisarmedData(value: unknown): value is DisarmedData {
  return isPlainObject(value) && isSafetyScope(value.scope);
}

export function isHiddenReason(value: unknown): value is HiddenReason {
  return value === "disarmed" || value === "blocked";
}

/** The extension → daemon `safetyState` event: the exact name, an `isEvent` frame (no `id`), a good state (#132). */
export function isSafetyStateEvent(value: unknown): value is EventMessage<SafetyStateParams> {
  const p = eventParams(value, "safetyState");
  return p !== null && isSafetyState(p);
}

/** The daemon → client `safetyStatus` event: the exact name, an `isEvent` frame (no `id`), a good state (#132). */
export function isSafetyStatusEvent(value: unknown): value is EventMessage<SafetyStatusParams> {
  const p = eventParams(value, "safetyStatus");
  return p !== null && isSafetyState(p);
}

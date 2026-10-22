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

/** Events the extension sends the daemon (spec §10). */
export type ExtensionEventName = "tabCreated" | "tabRemoved" | "tabReplaced";

/** Events the daemon sends a client (spec §10). */
export type DaemonEventName = "tabGone" | "leaseGranted" | "extensionStatus";

/**
 * Params of the extension → daemon `tabCreated` event (spec §10; Stage 0 audit F13), from
 * `chrome.tabs.onCreated`. `url` is `pendingUrl ?? url ?? ""`, so it may be "".
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
 * client holds (`openerTabId`) is leased to it too. `url` is `tabCreated`'s, so it may be "".
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
    p !== null && isTabId(p.tabId) && optional(p, "lastUrl", isString) && optional(p, "lastTitle", isString)
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
 * debugger: no lock, no tab switch, but the "extension is debugging this browser" banner.
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

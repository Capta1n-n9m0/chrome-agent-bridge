import type { WireError } from "./error.js";

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
  /** What the tool prints; rendered in the extension like `snapshot`. */
  text: string;
}

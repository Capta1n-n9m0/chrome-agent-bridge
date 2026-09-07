export interface RequestMessage {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface SuccessResponse {
  id: string;
  result: unknown;
}

export interface ErrorResponse {
  id: string;
  error: { message: string };
}

export type ResponseMessage = SuccessResponse | ErrorResponse;

export interface HelloMessage {
  type: "hello";
  token: string;
}

export function isResponse(value: unknown): value is ResponseMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && ("result" in v || "error" in v);
}

export function isErrorResponse(value: ResponseMessage): value is ErrorResponse {
  return "error" in value;
}

export function isHello(value: unknown): value is HelloMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === "hello" && typeof v.token === "string";
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

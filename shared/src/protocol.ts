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

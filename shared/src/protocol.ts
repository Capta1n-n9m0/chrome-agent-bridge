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

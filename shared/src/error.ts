import { ErrorCodes, type ErrorCode } from "./codes.js";

/**
 * The `error` of an error response. `code` is optional on the wire: the unmodified v1 extension
 * sends `{message}` only, and `fromWire` reads that as `INTERNAL` (spec §10, decision 0.4).
 */
export interface WireError {
  code?: ErrorCode | string;
  message: string;
  data?: unknown;
}

/** An error with a protocol code. `message` is what the MCP renders, unchanged from v1. */
export class BridgeError extends Error {
  readonly code: ErrorCode | string;
  readonly data?: unknown;

  constructor(code: ErrorCode | string, message: string, data?: unknown) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    if (data !== undefined) this.data = data;
  }

  toWire(): WireError {
    const wire: WireError = { code: this.code, message: this.message };
    if (this.data !== undefined) wire.data = this.data;
    return wire;
  }
}

/**
 * Builds a `BridgeError` from a wire error. A v2 `{code, message, data}` is preserved (a code
 * outside the 22 is kept as a string); a v1 `{message}` — or a missing/non-string/empty code —
 * becomes `INTERNAL`. Never throws.
 */
export function fromWire(err: unknown): BridgeError {
  if (typeof err !== "object" || err === null) {
    const message = typeof err === "string" && err !== "" ? err : "unknown error";
    return new BridgeError(ErrorCodes.INTERNAL, message);
  }
  const e = err as Record<string, unknown>;
  const message = typeof e.message === "string" && e.message !== "" ? e.message : "unknown error";
  const code = typeof e.code === "string" && e.code !== "" ? e.code : ErrorCodes.INTERNAL;
  return new BridgeError(code, message, e.data);
}

import type { EvalEnvelope } from "@bridge/shared";
import type { SerializeLimits } from "./serialize.js";

/** The bits of a CDP `Runtime.RemoteObject` this module reads. */
export interface CdpRemoteObject {
  type: string;
  subtype?: string;
  className?: string;
  value?: unknown;
  unserializableValue?: string;
  objectId?: string;
  description?: string;
}

/** The bits of a CDP `Runtime.ExceptionDetails` this module reads. */
export interface CdpExceptionDetails {
  text?: string;
  lineNumber?: number;
  columnNumber?: number;
  exception?: CdpRemoteObject;
}

export interface CdpEvaluateResponse {
  result: CdpRemoteObject;
  exceptionDetails?: CdpExceptionDetails;
}

export interface ShapeOptions {
  limits: SerializeLimits;
  /** Runs the in-page serialiser against `objectId` (CDP `Runtime.callFunctionOn`). */
  callFn?: (objectId: string, limits: SerializeLimits) => EvalEnvelope | Promise<EvalEnvelope>;
  /** Total description cap; the model only ever sees `description`. Default 20 000. */
  maxChars?: number;
}

const MAX_STACK_LINES = 8;
const MAX_MESSAGE_CHARS = 2000;
const DEFAULT_MAX_CHARS = 20_000;

function asString(v: unknown): string {
  try {
    return String(v);
  } catch {
    return "[unprintable]";
  }
}

/**
 * A page-side throw (or a rejected promise under `awaitPromise`) rendered as one actionable message.
 * `exception.description` is what the console prints — name, message and stack — so it wins; a thrown
 * non-Error has only `value`; a compile-time `SyntaxError` has neither and only `text` + a position.
 */
export function formatException(details: CdpExceptionDetails): string {
  const ex = details.exception;
  let message: string;
  if (ex && typeof ex.description === "string" && ex.description) {
    message = ex.description;
  } else if (ex && "value" in ex) {
    message = "Uncaught " + asString(ex.value);
  } else if (details.text) {
    message = details.text;
    // CDP positions are 0-based; the console shows them 1-based, and so do we.
    if (typeof details.lineNumber === "number") {
      const col = typeof details.columnNumber === "number" ? ", col " + (details.columnNumber + 1) : "";
      message += " (line " + (details.lineNumber + 1) + col + ")";
    }
  } else {
    message = "Uncaught (no exception details)";
  }
  message = message.split("\n").slice(0, MAX_STACK_LINES).join("\n");
  if (message.length > MAX_MESSAGE_CHARS) message = message.slice(0, MAX_MESSAGE_CHARS - 1) + "…";
  return message;
}

function cap(env: EvalEnvelope, maxChars: number): EvalEnvelope {
  if (env.description.length <= maxChars) return env;
  const over = env.description.length - maxChars;
  // `value` is left intact — only `description` is shown to the model.
  return { ...env, description: env.description.slice(0, maxChars) + `\n… [truncated: ${over} more chars]`, truncated: true };
}

/**
 * Raw CDP `Runtime.evaluate` response → `EvalEnvelope`, or a thrown `Error` for a page-side throw.
 * Pure: the second CDP round-trip (the in-page serialiser) is supplied as `callFn`, so this module
 * never touches `chrome.*`.
 */
export async function shapeEvaluateResult(raw: CdpEvaluateResponse, opts: ShapeOptions): Promise<EvalEnvelope> {
  if (raw.exceptionDetails) throw new Error(formatException(raw.exceptionDetails));

  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const r = raw.result ?? { type: "undefined" };

  // NaN / -0 / Infinity / BigInt: CDP can't put these in JSON, so it sends the source text.
  if (typeof r.unserializableValue === "string") {
    return cap({ kind: "unserializable", description: r.unserializableValue, truncated: false }, maxChars);
  }
  if (r.type === "undefined") {
    return cap({ kind: "undefined", description: "undefined", truncated: false }, maxChars);
  }
  if (r.subtype === "null") {
    return cap({ kind: "json", value: null, description: "null", truncated: false }, maxChars);
  }
  if (typeof r.objectId === "string") {
    if (opts.callFn) {
      try {
        return cap(await opts.callFn(r.objectId, opts.limits), maxChars);
      } catch {
        /* never lose the call to a serialiser bug — fall through to CDP's own description */
      }
    }
    return cap({ kind: "other", description: r.description ?? r.className ?? r.type, truncated: false }, maxChars);
  }
  // Remaining primitives (string, number, boolean). Strings get no added quotes: agents paste the
  // value straight back.
  return cap({ kind: "json", value: r.value, description: asString(r.value), truncated: false }, maxChars);
}

import type { EvalEnvelope } from "@bridge/shared";
import type { SerializeLimits } from "./serialize.js";
import { BridgeError, ErrorCodes } from "../errors.js";

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

/**
 * A page-side throw as `PAGE_ERROR {name, stack?}` (Step 7 plan 0.6), with `formatException`'s text
 * unchanged as the message. `name` is the exception's class (`"Error"` when CDP gives none, e.g. a
 * thrown string); `stack` is the formatted description, set only when it spans more than one line
 * (never `null`).
 */
export function pageError(details: CdpExceptionDetails): BridgeError {
  const message = formatException(details);
  const ex = details.exception;
  const data: { name: string; stack?: string } = {
    name: typeof ex?.className === "string" && ex.className ? ex.className : "Error",
  };
  const hasDescription = typeof ex?.description === "string" && ex.description !== "";
  if (hasDescription && message.includes("\n")) data.stack = message;
  return new BridgeError(ErrorCodes.PAGE_ERROR, message, data);
}

function cap(env: EvalEnvelope, maxChars: number): EvalEnvelope {
  if (env.description.length <= maxChars) return env;
  const over = env.description.length - maxChars;
  // `value` is left intact — only `description` is shown to the model.
  return { ...env, description: env.description.slice(0, maxChars) + `\n… [truncated: ${over} more chars]`, truncated: true };
}

/**
 * The objectId of a completion value that is *itself* an unresolved promise, or `undefined`.
 *
 * `Runtime.evaluate {awaitPromise: true}` unwraps exactly **one** level, and under `replMode: true`
 * that level is Chrome's own async wrapper around the script. So `fetch('/x')`,
 * `p.then(() => "ok")`, and the `(async () => { … })()` form `wrapExpression` emits for a bare
 * `return` all came back as `Promise {}` (observed in Chrome 152, E2E EVAL-4 / EVAL-20). The caller
 * resolves this id with a second `Runtime.awaitPromise` and shapes *that* response instead.
 */
export function pendingPromiseId(raw: CdpEvaluateResponse): string | undefined {
  if (raw.exceptionDetails) return undefined; // a page-side throw wins over the completion value
  const r = raw.result;
  if (!r || r.subtype !== "promise" || typeof r.objectId !== "string") return undefined;
  return r.objectId;
}

/**
 * Raw CDP `Runtime.evaluate` response → `EvalEnvelope`, or a thrown `Error` for a page-side throw.
 * Pure: the second CDP round-trip (the in-page serialiser) is supplied as `callFn`, so this module
 * never touches `chrome.*`.
 */
export async function shapeEvaluateResult(raw: CdpEvaluateResponse, opts: ShapeOptions): Promise<EvalEnvelope> {
  if (raw.exceptionDetails) throw pageError(raw.exceptionDetails);

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

/**
 * Errors with protocol codes on the extension side (Step 7 plan 0.6; spec §10). `BridgeError` is the
 * shared class, so the daemon and the SDK see the same `{code, message, data?}` the router sends.
 * Pure: no `chrome.*`, unit-tested under node.
 */
import { BridgeError, ErrorCodes, type ErrorCode } from "@bridge/shared";

export { BridgeError, ErrorCodes };
export type { ErrorCode };

/** The `error` member of a response frame, as the router sends it. */
export interface WireErrorOut {
  code: string;
  message: string;
  data?: unknown;
}

/**
 * Any thrown value → `{code, message, data?}`. A `BridgeError` keeps its code (and its data, when
 * set); a plain `Error` becomes `INTERNAL` with its message; anything else becomes `INTERNAL` with
 * `String(err)`, so nothing is lost during the migration (spec §10).
 */
export function toWireError(err: unknown): WireErrorOut {
  if (err instanceof BridgeError) {
    // Step 8 S2b.4 (decisions.md #73): a code is never empty on the wire.
    const code = typeof err.code === "string" && err.code !== "" ? err.code : ErrorCodes.INTERNAL;
    const out: WireErrorOut = { code, message: err.message };
    if (err.data !== undefined) out.data = err.data;
    return out;
  }
  if (err instanceof Error) return { code: ErrorCodes.INTERNAL, message: err.message };
  return { code: ErrorCodes.INTERNAL, message: String(err) };
}

const CODE_RE = /^[A-Z][A-Z_]*$/;

/**
 * Splits the content script's `"CODE:message"` marker (decisions.md · 2026-10-22 · Content-script
 * failures are returned, not thrown, to carry `CODE:message` (#38)). The code is the text before the
 * first `:` when it looks like a code; otherwise the whole string is the message, under `INTERNAL`.
 */
export function splitCoded(s: string): { code: string; message: string } {
  const i = s.indexOf(":");
  if (i > 0) {
    const code = s.slice(0, i);
    if (CODE_RE.test(code)) return { code, message: s.slice(i + 1) };
  }
  return { code: ErrorCodes.INTERNAL, message: s };
}

/** The code a thrown value would go on the wire with — for log lines that must not print messages. */
export function codeOf(err: unknown): string {
  return toWireError(err).code;
}

/**
 * The resolver's refusal when no normal window can be found (decisions.md · 2026-10-22 · "The
 * human's tab" is the active tab of the last-focused normal window (#43); Stage 0 F8). `INTERNAL`:
 * no dedicated code exists (F21).
 */
export const NO_NORMAL_WINDOW =
  "No normal Chrome window is focused (a DevTools or popup window may have focus) — click a normal Chrome window and retry";

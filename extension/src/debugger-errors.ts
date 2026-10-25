/**
 * Turn a raw `chrome.debugger` failure into a one-line, actionable message for the agent, plus the
 * protocol code for it (Step 7 plan 0.6). Pure (no `chrome.*`), so it's unit-tested under node.
 *
 * Chrome's own strings, for reference:
 *   "Another debugger is already attached to the tab with id: N."  — DevTools open, or another extension
 *   "Cannot attach to this target." / "Cannot access a chrome:// URL" — restricted page
 *   "Detached while handling command." / "Debugger is not attached to the tab with id: N." — user hit ✕
 */
export interface DescribedError {
  code: string;
  message: string;
  data?: unknown;
}

/**
 * The message strings are exactly the pre-Step-7 ones; the code names the case. A `BridgeError`
 * thrown by our own code inside `withDebugger`'s `fn` (`PAGE_ERROR`, `TIMEOUT`) keeps its code and
 * data, while its message goes through the same string logic as before (E2E EVAL-5 expects
 * `[chrome.debugger] Error: boom`).
 *
 * Step 11 S1 (decisions.md #229, #244 (a) as reworded by #246): a refusal the bridge raises ON PURPOSE inside
 * `fn` (the `saveTo` value refusals, `evaluate/save.ts`) is marked with `markOwnRefusal` where it is created and
 * passes through with its code, message and data unchanged — it is not a debugger failure. Page errors
 * (`pageError`) and `raceTimeout`'s `TIMEOUT` are not marked and keep the prefix (EVAL-5 unchanged).
 */
export function describeDebuggerError(err: unknown, what = "Trusted input"): DescribedError {
  const own = ownCoded(err);
  if (own && ownRefusals.has(err as object)) {
    const passed: DescribedError = { code: own.code, message: messageOf(err) };
    if (own.data !== undefined) passed.data = own.data;
    return passed;
  }
  const described = describeRaw(messageOf(err), what);
  if (!own) return described;
  const out: DescribedError = { code: own.code, message: described.message };
  if (own.data !== undefined) out.data = own.data;
  return out;
}

function describeRaw(raw: string, what: string): DescribedError {
  if (isExecutionTerminated(raw)) {
    return {
      code: "TIMEOUT",
      message: `${what} timed out: Chrome terminated the running script (CDP's Runtime.evaluate timeout). Page-side work already started (e.g. a fetch) continues. (${raw})`,
    };
  }
  if (/another debugger is already attached/i.test(raw)) {
    return {
      code: "DEBUGGER_DEVTOOLS",
      message:
        "Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry.",
    };
  }
  if (/cannot attach to this target|cannot access a chrome:\/\/|cannot access contents of/i.test(raw)) {
    return {
      code: "RESTRICTED_URL",
      message: `${what} is not available here: the active tab is a restricted URL (chrome://, the New Tab page, or the Chrome Web Store) where extensions can't attach a debugger. (${raw})`,
    };
  }
  if (/detached while handling command|debugger is not attached/i.test(raw)) {
    return {
      code: "DEBUGGER_CANCELLED",
      message:
        "The debugging session was cancelled mid-action (the 'is debugging this browser' banner's Cancel was clicked, or DevTools took over the tab) — retry the action.",
    };
  }
  return { code: "DEBUGGER_ATTACH", message: `[chrome.debugger] ${raw}` };
}

/**
 * The marker of the bridge's own deliberate refusals (Step 11 S1, #246): membership of a module-private
 * `WeakSet`, so it cannot be copied by shape (a spread or `Object.assign` of a marked error is not marked) and
 * holds no error alive. Only an own coded `BridgeError` is passed through; a marked plain `Error` is not.
 */
const ownRefusals = new WeakSet<object>();

/** Marks `err` as a refusal the bridge raised on purpose; returns the same object. */
export function markOwnRefusal<E extends Error>(err: E): E {
  ownRefusals.add(err);
  return err;
}

/** Our own coded error: a `BridgeError`, recognised by shape so this module stays import-free. */
function ownCoded(err: unknown): { code: string; data?: unknown } | undefined {
  if (err instanceof Error && err.name === "BridgeError") {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return { code, data: (err as { data?: unknown }).data };
  }
  return undefined;
}

/**
 * Chrome's wording when CDP's `Runtime.evaluate {timeout}` cuts a synchronous script short. It can
 * arrive either as `exceptionDetails` ("Execution was terminated", rendered by `formatException`) or
 * as a plain command error, so both paths funnel through here rather than sniffing strings in a
 * handler.
 */
export function isExecutionTerminated(err: unknown): boolean {
  return /execution was terminated|^(?:uncaught )?timed out$/i.test(messageOf(err).trim());
}

/** The single wording for a bridge-side evaluate timeout, shared by `raceTimeout` and the handler. */
export function timeoutMessage(ms: number): string {
  return `Timed out after ${ms / 1000}s — the debugger was detached; page-side work already started (e.g. a fetch) continues`;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

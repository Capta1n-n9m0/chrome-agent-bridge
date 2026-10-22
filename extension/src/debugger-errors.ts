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
 */
export function describeDebuggerError(err: unknown, what = "Trusted input"): DescribedError {
  const described = describeRaw(messageOf(err), what);
  const own = ownCoded(err);
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

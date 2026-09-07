/**
 * Turn a raw `chrome.debugger` failure into a one-line, actionable message for the agent.
 * Pure (no `chrome.*`), so it's unit-tested under node.
 *
 * Chrome's own strings, for reference:
 *   "Another debugger is already attached to the tab with id: N."  — DevTools open, or another extension
 *   "Cannot attach to this target." / "Cannot access a chrome:// URL" — restricted page
 *   "Detached while handling command." / "Debugger is not attached to the tab with id: N." — user hit ✕
 */
export function describeDebuggerError(err: unknown, what = "Trusted input"): string {
  const raw = messageOf(err);
  if (isExecutionTerminated(raw)) {
    return `${what} timed out: Chrome terminated the running script (CDP's Runtime.evaluate timeout). Page-side work already started (e.g. a fetch) continues. (${raw})`;
  }
  if (/another debugger is already attached/i.test(raw)) {
    return "Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry.";
  }
  if (/cannot attach to this target|cannot access a chrome:\/\/|cannot access contents of/i.test(raw)) {
    return `${what} is not available here: the active tab is a restricted URL (chrome://, the New Tab page, or the Chrome Web Store) where extensions can't attach a debugger. (${raw})`;
  }
  if (/detached while handling command|debugger is not attached/i.test(raw)) {
    return "The debugging session was cancelled mid-action (the 'is debugging this browser' banner's Cancel was clicked, or DevTools took over the tab) — retry the action.";
  }
  return `[chrome.debugger] ${raw}`;
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

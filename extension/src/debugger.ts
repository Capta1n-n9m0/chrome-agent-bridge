import type { EvalEnvelope } from "@bridge/shared";
import { keyEventParams, type KeyEventParams } from "./keys.js";
import { describeDebuggerError, isExecutionTerminated, timeoutMessage } from "./debugger-errors.js";
import { SERIALIZER_SRC, type SerializeLimits } from "./evaluate/serialize.js";
import { shapeEvaluateResult, pendingPromiseId, type CdpEvaluateResponse } from "./evaluate/result.js";
import { browserApi, hasDebuggerApi } from "./browser-api.js";

const PROTOCOL = "1.3";

async function send(tabId: number, method: string, params: { [key: string]: unknown } = {}): Promise<unknown> {
  return browserApi.debugger.sendCommand({ tabId }, method, params);
}

/**
 * Attach, run, always detach. `what` names the caller in the messages `describeDebuggerError`
 * produces ("Trusted input", "Full-page screenshot", "browser_evaluate") — it is the only part of
 * those strings that varies, so new Chrome wordings still belong in `debugger-errors.ts`.
 */
export async function withDebugger<T>(tabId: number, fn: () => Promise<T>, what = "Trusted input"): Promise<T> {
  if (!hasDebuggerApi()) {
    throw new Error(`${what} is not available in Safari because Safari Web Extensions do not expose the browser debugging protocol.`);
  }
  try {
    await browserApi.debugger.attach({ tabId }, PROTOCOL);
  } catch (err) {
    // Chrome allows one debugger per tab: DevTools (or another extension) wins and attach throws.
    throw new Error(describeDebuggerError(err, what));
  }
  try {
    return await fn();
  } catch (err) {
    // A cancelled session (banner ✕) surfaces here as a failed sendCommand.
    throw new Error(describeDebuggerError(err, what));
  } finally {
    try {
      await browserApi.debugger.detach({ tabId });
    } catch {
      /* already detached */
    }
  }
}

export async function trustedClick(tabId: number, x: number, y: number): Promise<void> {
  // Coords are CSS pixels of the layout viewport — exactly getBoundingClientRect's space, with no
  // scaling. Measured at zoom 1.0/1.5 and DPR 1/1.25/1.5: the event's clientX,clientY came back
  // identical to what was sent every time, so Chrome folds in both page zoom and DPR itself.
  // The caller must ensure the point is on screen (see centerForInput) — CDP does not clamp, and a
  // point past the viewport edge hit-tests the root element and does nothing.
  await send(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, buttons: 1 });
  await send(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, buttons: 0 });
}

/**
 * Real keystrokes for each character of `text`. A "\n" becomes a genuine Enter — a char-`text`-only
 * event can't express it. Assumes the target is already focused (and, for replace-semantics, that its
 * contents are selected) — see `focusForTyping` in the content script.
 */
export async function trustedType(tabId: number, text: string): Promise<void> {
  for (const ch of text) {
    if (ch === "\n" || ch === "\r") {
      await trustedPressKey(tabId, "Enter");
      continue;
    }
    await dispatchKey(tabId, keyEventParams(ch));
  }
}

/** One real key press/release, e.g. "Enter", "Tab", "ArrowDown". */
export async function trustedPressKey(tabId: number, key: string): Promise<void> {
  await dispatchKey(tabId, keyEventParams(key));
}

async function dispatchKey(tabId: number, p: KeyEventParams): Promise<void> {
  // Spread into a fresh literal: sendCommand wants an index-signature type, which the interface lacks.
  const base = { key: p.key, code: p.code, windowsVirtualKeyCode: p.windowsVirtualKeyCode, text: p.text, modifiers: p.modifiers };
  await send(tabId, "Input.dispatchKeyEvent", { ...base, type: "keyDown" });
  await send(tabId, "Input.dispatchKeyEvent", { ...base, type: "keyUp" });
}

export async function fullPageScreenshot(tabId: number): Promise<string> {
  return withDebugger(tabId, async () => {
    const result = (await send(tabId, "Page.captureScreenshot", {
      captureBeyondViewport: true,
      format: "png",
    })) as { data: string };
    return `data:image/png;base64,${result.data}`;
  }, "Full-page screenshot");
}

/**
 * Races `p` against a timer. CDP's own `Runtime.evaluate.timeout` only terminates *synchronous*
 * execution — a script parked on an `await` is not "executing", so an idle promise would hang until
 * the server's per-call timeout. `withDebugger`'s `finally` detach cancels the pending command when
 * this rejects; the loser's rejection is swallowed so the service worker never sees an unhandled one.
 */
export function raceTimeout<T>(p: Promise<T>, ms: number, message = timeoutMessage(ms)): Promise<T> {
  p.catch(() => {});
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  expired.catch(() => {});
  return Promise.race([p, expired]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Run `expression` in the page (MAIN) world via CDP and return a shaped envelope.
 *
 * Two calls: `Runtime.evaluate` keeps the result as a handle (`returnByValue:false`) because
 * returnByValue JSON-serialises in the page and turns a node, a Map and a class instance all into
 * `{}`; then `Runtime.callFunctionOn` runs the in-page serialiser with `this` = that object. Both
 * share one deadline. No `Runtime.enable` is needed, so nothing has to be torn down on detach.
 */
export async function evaluateInPage(
  tabId: number,
  expression: string,
  timeoutMs: number,
  limits: SerializeLimits,
): Promise<EvalEnvelope> {
  const deadline = Date.now() + timeoutMs;
  const remaining = () => Math.max(0, deadline - Date.now());
  try {
    return await withDebugger(
      tabId,
      async () => {
        // CDP's `timeout` covers synchronous code only (a `while(true){}`); Chrome reports it as
        // exceptionDetails "Execution was terminated" — or, in some builds, as a command error. Both
        // are recognised by `isExecutionTerminated` below and re-rendered as `Timed out after Ns`.
        // (Chrome-version behaviour to be pinned in E2E EVAL-9.)
        let raw = (await raceTimeout(
          send(tabId, "Runtime.evaluate", {
            expression,
            replMode: true, // top-level await, let/const re-declaration, completion value
            awaitPromise: true,
            returnByValue: false,
            userGesture: true,
            timeout: timeoutMs,
            generatePreview: false,
          }),
          remaining(),
          timeoutMessage(timeoutMs),
        )) as CdpEvaluateResponse;

        // `awaitPromise` unwraps one level and `replMode`'s own async wrapper consumes it, so a
        // completion value that is itself a promise arrives unresolved (`Promise {}`). Resolve it
        // with a second round-trip — this is what makes `fetch(…)`, `p.then(…)` and the
        // `(async () => { … })()` form of a bare `return` return their value. Same deadline.
        const promiseId = pendingPromiseId(raw);
        if (promiseId !== undefined) {
          raw = (await raceTimeout(
            send(tabId, "Runtime.awaitPromise", { promiseObjectId: promiseId, returnByValue: false }),
            remaining(),
            timeoutMessage(timeoutMs),
          )) as CdpEvaluateResponse;
        }

        return shapeEvaluateResult(raw, {
          limits,
          callFn: async (objectId, lim) => {
            const res = (await raceTimeout(
              send(tabId, "Runtime.callFunctionOn", {
                objectId,
                functionDeclaration: SERIALIZER_SRC,
                arguments: [{ value: lim }],
                returnByValue: true,
              }),
              remaining(),
              timeoutMessage(timeoutMs),
            )) as CdpEvaluateResponse;
            if (res.exceptionDetails) throw new Error("the in-page serialiser threw");
            try {
              await send(tabId, "Runtime.releaseObject", { objectId });
            } catch {
              /* best effort — the context may already be gone */
            }
            return res.result?.value as EvalEnvelope;
          },
        });
      },
      "browser_evaluate",
    );
  } catch (err) {
    // Whichever branch it came through, a CDP-terminated script reads as a timeout to the agent.
    if (isExecutionTerminated(err)) throw new Error(timeoutMessage(timeoutMs));
    throw err;
  }
}

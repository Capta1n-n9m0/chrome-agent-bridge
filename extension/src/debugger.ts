import type { EvalEnvelope } from "@bridge/shared";
import { trustedInputBody, trustedInputCleanup, type TrustedInput, type TrustedStep } from "./trusted-input.js";
import { describeDebuggerError, isExecutionTerminated, timeoutMessage } from "./debugger-errors.js";
import { BridgeError, ErrorCodes } from "./errors.js";
import { DebuggerSessions, runWithDebugger, type EffectGuard } from "./safety-debugger.js";
import { SERIALIZER_SRC, type SerializeLimits } from "./evaluate/serialize.js";
import { shapeEvaluateResult, pendingPromiseId, type CdpEvaluateResponse } from "./evaluate/result.js";
import { collectSaveText, type SaveText } from "./evaluate/save.js";
import { UPLOAD_CDP_TIMEOUT_MS, setFilesByMark, uploadTimeoutMessage } from "./upload-files.js";

const PROTOCOL = "1.3";

async function send(tabId: number, method: string, params: { [key: string]: unknown } = {}): Promise<unknown> {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

/**
 * Attach, run, always detach. `what` names the caller in the messages `describeDebuggerError`
 * produces ("Trusted input", "Full-page screenshot", "browser_evaluate") — it is the only part of
 * those strings that varies, so new Chrome wordings still belong in `debugger-errors.ts`.
 *
 * Step 9: every session is recorded in `debuggerSessions` (a disarm detaches them all and their errors
 * become `DISARMED`), and `guard` — the gated call's effect check — runs before attaching; no session
 * starts while the registry refuses (decisions.md · 2026-10-24 · #137 item 2; `safety-debugger.ts`).
 */
export async function withDebugger<T>(tabId: number, fn: () => Promise<T>, what = "Trusted input", guard?: EffectGuard): Promise<T> {
  return runWithDebugger(
    {
      attach: (id) => chrome.debugger.attach({ tabId: id }, PROTOCOL),
      detach: (id) => chrome.debugger.detach({ tabId: id }),
      sessions: debuggerSessions,
      // Chrome allows one debugger per tab: DevTools (or another extension) wins and attach throws; a
      // cancelled session (banner ✕) surfaces as a failed sendCommand.
      mapError: (err) => debuggerError(err, what),
    },
    tabId,
    fn,
    guard,
  );
}

/** Every debugger session this worker holds (Step 9: all detached at a disarm). */
export const debuggerSessions = new DebuggerSessions();

/** `describeDebuggerError`'s code + unchanged message (+ an own BridgeError's data) as a BridgeError. */
function debuggerError(err: unknown, what: string): BridgeError {
  const d = describeDebuggerError(err, what);
  return new BridgeError(d.code, d.message, d.data);
}

export interface TrustedRunOptions {
  /** `true` wraps the input in CDP focus emulation (stage FE); anything else sends today's commands. */
  focusEmulation: boolean;
  /**
   * `type`'s focus step (`focusForTyping` in the page). Runs inside the session, after the enable,
   * only when the option is on (#85 item 3); without it the handler focuses before attaching.
   */
  focus?: () => Promise<unknown>;
}

/**
 * One trusted input in one debugger session: attach → the steps of `trustedInputBody` → the cleanup
 * (`trustedInputCleanup`) in a `finally` → detach.
 * Returns `true` exactly when focus emulation was enabled for it.
 *
 * Without the option the steps are the pre-FE `Input.*` commands and nothing else (asserted against
 * `extension/test/fixtures/fe-cdp-baseline.json`). With it: enable → (type) focus → `Input.*` →
 * disable in a `finally`, so emulation is turned off after a failing input too. A failing disable
 * never masks the input's own error, and after a successful input it is only warned about: Chromium
 * clears focus emulation when the session detaches (`EmulationHandler::Disable()`, called by
 * `DevToolsSession::Dispose()`; stage0-audit.md §8, unconfirmed for Chrome 156), and the input has
 * already happened, so failing the call would invite a retry that repeats it.
 *
 * The steps are computed inside the session, one character at a time, so an unsupported key keeps
 * today's mapping (thrown inside `withDebugger`) and a rejected character in `type`'s text is reached
 * only after the keys before it were sent, as before. Nothing here focuses a window or activates a tab.
 */
export async function runTrustedInput(tabId: number, input: TrustedInput, opts: TrustedRunOptions, guard?: EffectGuard): Promise<boolean> {
  let pageFailure: { err: unknown } | undefined;
  await withDebugger(tabId, async () => {
    // The body is lazy (one character at a time, as the pre-FE trustedType sent them); the cleanup
    // (the disable, with the option) is known up front, so it runs even when the body throws.
    const body = trustedInputBody(input, opts.focusEmulation);
    const cleanup = trustedInputCleanup(opts.focusEmulation).filter((s): s is Extract<TrustedStep, { op: "cdp" }> => s.op === "cdp");
    let bodyDone = false;
    try {
      for (const step of body) {
        if (step.op === "focus") {
          if (!opts.focus) throw new Error("internal: the focus step has no focus function");
          try {
            await opts.focus();
          } catch (err) {
            // A page failure (stale ref, …) is not a debugger failure: hand it out unchanged, after
            // the finally below has disabled emulation and withDebugger has detached.
            pageFailure = { err };
            return;
          }
          continue;
        }
        await send(tabId, step.method, step.params);
      }
      bodyDone = true;
    } finally {
      for (const step of cleanup) {
        try {
          await send(tabId, step.method, step.params);
        } catch (err) {
          // Never mask the input's own error; detach clears emulation anyway (see above).
          if (bodyDone) console.warn("[bridge] focus emulation: disable failed; detach clears it:", describeDebuggerError(err).code);
        }
      }
    }
  }, "Trusted input", guard);
  if (pageFailure) throw pageFailure.err;
  return opts.focusEmulation;
}

export async function fullPageScreenshot(tabId: number, guard?: EffectGuard): Promise<string> {
  return withDebugger(tabId, async () => {
    const result = (await send(tabId, "Page.captureScreenshot", {
      captureBeyondViewport: true,
      format: "png",
    })) as { data: string };
    return `data:image/png;base64,${result.data}`;
  }, "Full-page screenshot", guard);
}

/**
 * The viewport of a tab through CDP (`mode:"cdp"`), shows the banner. Run 8 measured it hang on a
 * background tab and on a minimized window, so the handler refuses those first (`cdpCaptureRefusal`).
 */
export async function viewportScreenshot(tabId: number, guard?: EffectGuard): Promise<string> {
  return withDebugger(tabId, async () => {
    const result = (await send(tabId, "Page.captureScreenshot", { format: "png" })) as { data: string };
    return `data:image/png;base64,${result.data}`;
  }, "Screenshot", guard);
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
    timer = setTimeout(() => reject(new BridgeError(ErrorCodes.TIMEOUT, message)), ms);
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
  guard?: EffectGuard,
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
      guard,
    );
  } catch (err) {
    // Whichever branch it came through, a CDP-terminated script reads as a timeout to the agent.
    if (isExecutionTerminated(err)) throw new BridgeError(ErrorCodes.TIMEOUT, timeoutMessage(timeoutMs));
    throw err;
  }
}

/** Step 10 S4: how long reading a saved value out of the page may take, after the page's own `timeoutMs`. */
export const SAVE_TRANSFER_MS = 120_000;

/**
 * Step 10 S4 (phase doc 0.4 (B); Stage 0 F2): `evaluateSaveStart`'s CDP leg — `collectSaveText`
 * (`evaluate/save.ts`) in ONE debugger session, `guard` (the gated call's effect check) before the attach, as
 * `evaluateInPage`. The evaluation shares `timeoutMs`'s deadline (`raceTimeout`); reading the holder out in
 * slices gets `SAVE_TRANSFER_MS` more. A CDP-terminated script reads as a timeout, as for `evaluate`.
 */
export async function evaluateToSave(tabId: number, expression: string, timeoutMs: number, guard?: EffectGuard): Promise<SaveText> {
  const evalDeadline = Date.now() + timeoutMs;
  const transferDeadline = evalDeadline + SAVE_TRANSFER_MS;
  const left = (deadline: number) => Math.max(0, deadline - Date.now());
  const transferMessage = `Timed out after ${SAVE_TRANSFER_MS / 1000}s reading the value out of the page — nothing was saved`;
  try {
    return await withDebugger(
      tabId,
      () =>
        collectSaveText(expression, timeoutMs, {
          send: (method, params) => send(tabId, method, params),
          evalRace: (p) => raceTimeout(p, left(evalDeadline), timeoutMessage(timeoutMs)),
          transferRace: (p) => raceTimeout(p, left(transferDeadline), transferMessage),
        }),
      "browser_evaluate",
      guard,
    );
  } catch (err) {
    if (isExecutionTerminated(err)) throw new BridgeError(ErrorCodes.TIMEOUT, timeoutMessage(timeoutMs));
    throw err;
  }
}

/**
 * Step 11 S3 (phase doc 0.7; #248): `uploadFiles`'s CDP leg — `setFilesByMark` (`upload-files.ts`: the isolated-world
 * finder → `DOM.setFileInputFiles {files, objectId}` → release) in ONE debugger session, `guard` (the gated call's
 * effect check) before the attach, the whole leg bounded by `UPLOAD_CDP_TIMEOUT_MS`. The finder's refusals are
 * marked own refusals (unprefixed); the timeout and breakdowns keep `[chrome.debugger] ` (#246, #254).
 */
export async function uploadByMark(tabId: number, mark: string, paths: readonly string[], guard?: EffectGuard): Promise<number> {
  return withDebugger(
    tabId,
    () => raceTimeout(setFilesByMark((method, params) => send(tabId, method, params), mark, paths), UPLOAD_CDP_TIMEOUT_MS, uploadTimeoutMessage()),
    "File upload",
    guard,
  );
}

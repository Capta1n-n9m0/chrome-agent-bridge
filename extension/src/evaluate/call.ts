/**
 * Step 12 S2a (phase doc 0.4 with its Stage 0 note; decisions.md #330, #331; spec §10's Step 12 note): the CDP steps
 * of an `evaluate`/`evaluateSaveStart` call with `args`. Pure — `send`, the deadline race and the wait for
 * `Debugger.paused` are injected; `debugger.ts` runs it inside one debugger session.
 *
 * 1. `Debugger.enable`, then `Debugger.setBreakpointsActive {active:false}` (a `debugger;` statement does not pause).
 * 2. The source alone is evaluated to a function object (`functionSourceParams`); anything else is refused.
 * 3. The function's own `scriptId` from `Runtime.getProperties` (`[[FunctionLocation]]`).
 * 4. `Runtime.callFunctionOn` on `globalThis` runs the fixed `CALL_WRAPPER_SRC` with `[{objectId: fn}, {value: json}]`:
 *    the JSON text of `args` travels only as that argument's value, never in an expression or a declaration.
 * 5. If the deadline race loses: `Debugger.pause`; within `PAUSE_WAIT_MS` a paused frame in the function's own script
 *    → `Debugger.resume {terminateOnResume:true}`, another frame → a plain resume, no event → nothing. The race's
 *    TIMEOUT is then re-thrown unchanged.
 * 6. `Debugger.disable` on every path.
 *
 * The paused event carries page frames: only the scriptIds are compared; nothing of it is kept or logged.
 */
import { BridgeError, ErrorCodes } from "../errors.js";
import { markOwnRefusal } from "../debugger-errors.js";
import { pageError, type CdpEvaluateResponse } from "./result.js";

/** The fixed wrapper: the one place the JSON text of `args` becomes a value, inside the page. */
export const CALL_WRAPPER_SRC = "function (fn, json) { return fn(JSON.parse(json)); }";

/** How long the deadline's pause waits for `Debugger.paused`, and the bound on each stop-path command. */
export const PAUSE_WAIT_MS = 500;

/** The fields of a `Debugger.paused` event this module reads. */
export interface PausedEvent {
  callFrames?: Array<{ location?: { scriptId?: unknown } }>;
}

type Send = (method: string, params: { [key: string]: unknown }) => Promise<unknown>;

export interface ArgsCallDeps {
  send: Send;
  /** The call's deadline (`raceTimeout` with the time left); rejects with a `TIMEOUT` BridgeError. */
  race: <T>(p: Promise<T>) => Promise<T>;
  /** Starts listening for this tab's next `Debugger.paused`; resolves its params, or undefined after `ms`. */
  waitPaused: (ms: number) => Promise<PausedEvent | undefined>;
  /** Default `PAUSE_WAIT_MS`. */
  pauseWaitMs?: number;
}

/** Step 2's `Runtime.evaluate`: the source in parentheses (a function expression, so no page global), no `replMode`. */
export function functionSourceParams(source: string, timeoutMs: number): { [key: string]: unknown } {
  return {
    expression: `(${source}\n)`,
    awaitPromise: false,
    returnByValue: false,
    userGesture: true,
    timeout: timeoutMs,
    generatePreview: false,
  };
}

/** The refusal of a source that is not a function; names CDP's type word only. */
export function notAFunctionMessage(type: unknown): string {
  const t = typeof type === "string" && /^[a-z]{1,16}$/.test(type) ? type : "something else";
  return `args: with args, expression must be a function source such as "(a) => a.rows.length"; it evaluated to ${t}`;
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err as { code?: unknown }).code === ErrorCodes.TIMEOUT;
}

/** A command bounded by `ms`, its failure swallowed (the stop path never masks the call's own answer). */
async function quiet(p: Promise<unknown>, ms: number): Promise<void> {
  p.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<void>((resolve) => (timer = setTimeout(resolve, ms)));
  try {
    await Promise.race([p.then(() => {}, () => {}), t]);
  } finally {
    clearTimeout(timer);
  }
}

async function functionScriptId(send: Send, race: ArgsCallDeps["race"], objectId: string): Promise<string | undefined> {
  try {
    const r = (await race(send("Runtime.getProperties", { objectId, ownProperties: true }))) as {
      internalProperties?: Array<{ name?: string; value?: { value?: { scriptId?: unknown } } }>;
    };
    const loc = (r.internalProperties ?? []).find((p) => p?.name === "[[FunctionLocation]]");
    const id = loc?.value?.value?.scriptId;
    return typeof id === "string" && id !== "" ? id : undefined;
  } catch (err) {
    if (isTimeout(err)) throw err;
    return undefined; // no location (a bound or native function): the deadline never terminates
  }
}

/** Step 5: pause, and terminate only the function's own script. */
async function stopAtDeadline(deps: ArgsCallDeps, scriptId: string | undefined): Promise<void> {
  const ms = deps.pauseWaitMs ?? PAUSE_WAIT_MS;
  const paused = deps.waitPaused(ms);
  await quiet(deps.send("Debugger.pause", {}), ms);
  const ev = await paused.catch(() => undefined);
  if (!ev) return;
  const own = scriptId !== undefined && (ev.callFrames ?? []).some((f) => f?.location?.scriptId === scriptId);
  await quiet(deps.send("Debugger.resume", own ? { terminateOnResume: true } : {}), ms);
}

/** Steps 1–6; `then` shapes the call's raw result (the serialiser, or the save path) before the disable. */
export async function callWithArgs<T>(
  source: string,
  argsJson: string,
  timeoutMs: number,
  deps: ArgsCallDeps,
  then: (raw: CdpEvaluateResponse) => Promise<T>,
): Promise<T> {
  const { send, race } = deps;
  try {
    await race(send("Debugger.enable", {}));
    await race(send("Debugger.setBreakpointsActive", { active: false }));
    const fnRaw = (await race(send("Runtime.evaluate", functionSourceParams(source, timeoutMs)))) as CdpEvaluateResponse;
    if (fnRaw.exceptionDetails) throw pageError(fnRaw.exceptionDetails);
    const fnId = fnRaw.result?.objectId;
    if (fnRaw.result?.type !== "function" || typeof fnId !== "string") {
      throw markOwnRefusal(new BridgeError(ErrorCodes.BAD_PARAMS, notAFunctionMessage(fnRaw.result?.type)));
    }
    const scriptId = await functionScriptId(send, race, fnId);
    const g = (await race(send("Runtime.evaluate", { expression: "globalThis", returnByValue: false }))) as CdpEvaluateResponse;
    if (typeof g.result?.objectId !== "string") throw new BridgeError(ErrorCodes.INTERNAL, "args: the page's global object could not be read");
    let raw: CdpEvaluateResponse;
    try {
      raw = (await race(
        send("Runtime.callFunctionOn", {
          objectId: g.result.objectId,
          functionDeclaration: CALL_WRAPPER_SRC,
          arguments: [{ objectId: fnId }, { value: argsJson }],
          awaitPromise: true,
          returnByValue: false,
          userGesture: true,
          generatePreview: false,
        }),
      )) as CdpEvaluateResponse;
    } catch (err) {
      if (isTimeout(err)) await stopAtDeadline(deps, scriptId);
      throw err;
    }
    return await then(raw);
  } finally {
    await quiet(send("Debugger.disable", {}), deps.pauseWaitMs ?? PAUSE_WAIT_MS);
  }
}

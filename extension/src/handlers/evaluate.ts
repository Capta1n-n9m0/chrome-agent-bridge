import type { EvalEnvelope, LocateResult } from "@bridge/shared";
import { pageTab } from "../tabs.js";
import { evaluateInPage } from "../debugger.js";
import { ensureContent, callInPage } from "../inject.js";
import { DEFAULT_LIMITS } from "../evaluate/serialize.js";
import { wrapExpression } from "../evaluate/wrap.js";
import { newMark, unmarkExpression, type MarkStatus } from "../evaluate/mark.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { HandlerSafety } from "../safety-call.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 60_000;

function clampTimeout(raw: unknown): number {
  if (raw === undefined || raw === null) return DEFAULT_TIMEOUT_MS;
  const n = Number(raw);
  if (!isFinite(n)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.round(n), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

/**
 * Run JavaScript in the target tab's page (MAIN) world through CDP.
 *
 * Deliberately no `ensureContent`: this path never touches the content script or the ISOLATED world,
 * so it still works on a page whose CSP blocks injection, and `window.__agentBridge` stays invisible
 * to page code. The exception is `asRef: true` (below), which needs the content script to mint a ref.
 */
export async function evaluate(p: Record<string, unknown>, call?: HandlerSafety): Promise<EvalEnvelope> {
  const expression = typeof p.expression === "string" ? p.expression : "";
  if (!expression.trim()) {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, 'browser_evaluate requires a non-empty "expression" string');
  }
  const timeoutMs = clampTimeout(p.timeoutMs);
  const tab = await pageTab(p, "evaluate");
  // Length only — the expression and its result are never logged (they carry page secrets).
  console.log("[bridge] evaluate", expression.length, "chars");
  // Step 9: the debugger attach re-checks the gate (`call` as withDebugger's guard, #137).
  if (p.asRef !== true) return evaluateInPage(tab.id!, wrapExpression(expression), timeoutMs, DEFAULT_LIMITS, call);
  return evaluateAsRef(tab.id!, expression, timeoutMs, call);
}

/**
 * `asRef: true` (phase doc 0.3; stage0-audit.md F21): the content script first (a CSP-blocked or
 * restricted page fails before anything is marked); the in-page serialiser composite marks an Element
 * result with a one-off mark inside the debugger session; the content script's `refOfMarked` mints the
 * ref and removes the mark. If that page call fails, or the serialiser's reply is lost, a best-effort
 * sweep removes the mark. Neither the expression nor the mark is ever logged.
 */
async function evaluateAsRef(tabId: number, expression: string, timeoutMs: number, call?: HandlerSafety): Promise<EvalEnvelope> {
  await call?.effect();
  await ensureContent(tabId);
  const mark = newMark();
  const env = await evaluateInPage(tabId, wrapExpression(expression), timeoutMs, { ...DEFAULT_LIMITS, mark }, call);
  const holder = env as EvalEnvelope & { __mark?: MarkStatus };
  const status = holder.__mark;
  delete holder.__mark;
  if (status === "detached") {
    throw new BridgeError(ErrorCodes.REF_STALE, "asRef: the element is not attached to the document");
  }
  if (status === "closed-shadow") {
    throw new BridgeError(
      ErrorCodes.BAD_PARAMS,
      "asRef: the element is in a closed shadow root, which the content script cannot reach",
    );
  }
  if (status === undefined && env.kind === "other") {
    // No status, and `shapeEvaluateResult`'s fallback envelope: the serialiser call itself failed or
    // timed out (or the debugger detached) after the page may already have marked the element
    // (S2-verifier finding 1). Sweep, then blame the lost reply rather than the caller.
    await sweepMark(tabId, mark, timeoutMs, call);
    throw new BridgeError(ErrorCodes.INTERNAL, "asRef: the in-page serialiser's reply was lost; any mark was removed");
  }
  // An explicit "not-element" (the mark fn marked nothing), or no status with a primitive / null /
  // undefined value (the serialiser never ran, so nothing was marked): no sweep.
  if (status !== "marked") throw new BridgeError(ErrorCodes.BAD_PARAMS, "asRef needs an Element; the value is not one");
  let found: LocateResult;
  try {
    await call?.effect();
    found = await callInPage<LocateResult>(tabId, (m) => window.__agentBridge!.refOfMarked(m as string), [mark]);
  } catch (err) {
    await sweepMark(tabId, mark, timeoutMs, call);
    throw err;
  }
  return { ...env, ref: found.ref };
}

/**
 * Best-effort removal of this call's mark; its own failure is swallowed (the caller's error wins). Step 9:
 * the sweep is a debugger session too, so it is refused after a disarm and the mark may stay on one element
 * until the page reloads (Stage 0 F29: accepted; never exempt the sweep from the gate).
 */
async function sweepMark(tabId: number, mark: string, timeoutMs: number, call?: HandlerSafety): Promise<void> {
  try {
    await evaluateInPage(tabId, unmarkExpression(mark), timeoutMs, DEFAULT_LIMITS, call);
  } catch {
    /* best effort */
  }
}

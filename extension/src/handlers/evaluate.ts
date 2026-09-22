import type { EvalEnvelope } from "@bridge/shared";
import { activeTab } from "../tabs.js";
import { evaluateInPage } from "../debugger.js";
import { DEFAULT_LIMITS, SERIALIZER_SRC } from "../evaluate/serialize.js";
import { wrapExpression } from "../evaluate/wrap.js";
import { evaluateInMainWorld, type MainWorldEvaluateResult } from "../evaluate/scripting.js";
import { browserApi, hasDebuggerApi } from "../browser-api.js";
import { unwrapResult } from "../inject.js";

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
 * Run JavaScript in the active tab's page (MAIN) world through CDP.
 *
 * Deliberately no `ensureContent`: this path never touches the content script or the ISOLATED world,
 * so it still works on a page whose CSP blocks injection, and `window.__agentBridge` stays invisible
 * to page code.
 */
export async function evaluate(p: Record<string, unknown>): Promise<EvalEnvelope> {
  const expression = typeof p.expression === "string" ? p.expression : "";
  if (!expression.trim()) throw new Error('browser_evaluate requires a non-empty "expression" string');
  const timeoutMs = clampTimeout(p.timeoutMs);
  const tab = await activeTab();
  // Length only — the expression and its result are never logged (they carry page secrets).
  console.log("[bridge] evaluate", expression.length, "chars");
  const wrapped = wrapExpression(expression);
  if (hasDebuggerApi()) return evaluateInPage(tab.id!, wrapped, timeoutMs, DEFAULT_LIMITS);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${timeoutMs / 1000}s while evaluating in Safari`)),
      timeoutMs,
    );
  });
  try {
    const [injection] = await Promise.race([
      browserApi.scripting.executeScript({
        target: { tabId: tab.id! },
        func: evaluateInMainWorld,
        args: [wrapped, SERIALIZER_SRC, DEFAULT_LIMITS],
        world: "MAIN",
      }),
      timeout,
    ]);
    const result = unwrapResult<MainWorldEvaluateResult>(injection as { result?: unknown; error?: unknown });
    if (!result.ok) throw new Error(result.error);
    return result.value;
  } catch (err) {
    const message = (err as Error).message;
    if (/unsafe-eval|content security policy|refused to evaluate/i.test(message)) {
      throw new Error(
        `Safari blocked browser_evaluate under this page's Content Security Policy. DOM tools still work. (${message})`,
      );
    }
    throw err;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

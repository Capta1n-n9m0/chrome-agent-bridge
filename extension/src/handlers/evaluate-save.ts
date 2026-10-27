import type { EvaluateSaveChunkResult, EvaluateSaveStartResult } from "@bridge/shared";
import { pageTab, requireTabId } from "../tabs.js";
import { evaluateFunctionToSave, evaluateToSave } from "../debugger.js";
import { evaluateArgsJson } from "./evaluate.js";
import { wrapExpression } from "../evaluate/wrap.js";
import { toBase64 } from "../download.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import { EvaluateSaveStore, SAVE_CHUNK_BYTES, SAVE_MAX_VALUE_BYTES, tooLargeError } from "../evaluate-save-store.js";
import type { HandlerSafety } from "../safety-call.js";

// Step 10 S4 (phase doc 0.4, transport (B); decisions.md #127, #205, #207): `browser_evaluate {saveTo}`'s
// extension half — evaluate into the store, then the client pulls the bytes in slices and writes the file. The
// three methods are class `"evaluate"` in the safety table (the kill switch, the JavaScript switch and the block
// list refuse each at receipt and at the post-check) and tab methods in the daemon's table. The extension never
// receives the file path. Nothing here logs: not the value, a slice, its length or the expression.

const store = new EvaluateSaveStore();

/** A disarm, or JavaScript turned off: every held value goes. */
export function clearEvaluateSaves(): number {
  return store.dropAll();
}

/** The tab closed or was replaced (its id went away): its held values go. */
export function dropEvaluateSavesForTab(tabId: number): number {
  return store.dropTab(tabId);
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 60_000;

/** As `evaluate`'s clamp (`handlers/evaluate.ts`). */
function clampTimeout(raw: unknown): number {
  if (raw === undefined || raw === null) return DEFAULT_TIMEOUT_MS;
  const n = Number(raw);
  if (!isFinite(n)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.round(n), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

/** A pull's tab: an integer `tabId` (the daemon always forwards one), else `BAD_PARAMS`, with no Chrome call. */
function pullTab(p: Record<string, unknown>, method: string): number {
  if (p.tabId === undefined) throw new BridgeError(ErrorCodes.BAD_PARAMS, `${method} requires tabId`);
  return requireTabId(p.tabId);
}

/**
 * Evaluates `expression` in the tab's page as `evaluate` does (the MAIN world, through CDP, `return` allowed)
 * and holds the value's UTF-8 bytes (`TextEncoder`: a lone surrogate becomes U+FFFD) for this tab. Returns
 * `{id, bytes, kind}` only. A refused reply (the post-check) releases the held bytes, as `downloadStart`'s.
 */
export async function evaluateSaveStart(p: Record<string, unknown>, call?: HandlerSafety): Promise<EvaluateSaveStartResult> {
  const expression = typeof p.expression === "string" ? p.expression : "";
  if (!expression.trim()) {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, 'evaluateSaveStart requires a non-empty "expression" string');
  }
  const argsJson = evaluateArgsJson(p);
  const timeoutMs = clampTimeout(p.timeoutMs);
  const tab = await pageTab(p, "evaluateSaveStart");
  const tabId = tab.id!;
  // The gate is re-checked before the debugger attaches (`call` as withDebugger's guard, #137). Step 12: with
  // `args`, the source runs as a function and `args` travels only as a CDP argument.
  const { text, kind } =
    argsJson === undefined
      ? await evaluateToSave(tabId, wrapExpression(expression), timeoutMs, call)
      : await evaluateFunctionToSave(tabId, expression, argsJson, timeoutMs, call);
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > SAVE_MAX_VALUE_BYTES) throw tooLargeError();
  const id = store.put(tabId, bytes, kind);
  call?.onRefused(() => store.release(id, tabId));
  return { id, bytes: bytes.length, kind };
}

/** Bytes [offset, offset + length) as base64, at most 1 MiB, of the value this tab filled under `id`. */
export async function evaluateSaveChunk(p: Record<string, unknown>, _call?: HandlerSafety): Promise<EvaluateSaveChunkResult> {
  const tabId = pullTab(p, "evaluateSaveChunk");
  const bytes = store.chunk(String(p.id ?? ""), tabId, Number(p.offset ?? 0), Number(p.length ?? SAVE_CHUNK_BYTES));
  return { data: toBase64(bytes) };
}

/** Drops the value this tab filled under `id`. */
export async function evaluateSaveEnd(p: Record<string, unknown>, _call?: HandlerSafety): Promise<{ released: boolean }> {
  const tabId = pullTab(p, "evaluateSaveEnd");
  return { released: store.release(String(p.id ?? ""), tabId) };
}

/**
 * Step 10 S4 (phase doc 0.4, transport (B); Stage 0 F2, F12; decisions.md #205, #207): the CDP leg of
 * `evaluateSaveStart`. Pure — the CDP `send` and the timers are injected; `debugger.ts` runs it inside one
 * debugger session.
 *
 * 1. `Runtime.evaluate` with exactly `evaluate`'s parameters (`saveEvaluateParams`: `replMode`, `awaitPromise`,
 *    the result kept by objectId).
 * 2. An object completion value (a promise included: the `return` form, `fetch(…).then(…)`) is handed to
 *    `SAVE_PREPARE_SRC` by `Runtime.callFunctionOn` with `awaitPromise: true` and `returnByValue: false`. In the
 *    page it awaits a promise, validates the value (undefined, a function, a symbol, a Map, a Set or a DOM node
 *    → refused; a DOM node is `v instanceof Node`, or — for a node of another realm, e.g. a frame's — any
 *    object whose prototype chain holds a prototype tagged `[object Node]` (every realm's `Node.prototype`); a
 *    plain object with `nodeType`/`nodeName` keys is data and saves (S4 fixer round 1, verifier finding 2); a throw from `JSON.stringify` → refused without its text), keeps a string as is and
 *    `JSON.stringify`s anything else, and returns a holder object — by objectId, so the value is not in that reply.
 * 3. `SAVE_META_SRC` reads the holder's length, kind and refusal reason by value; a value over the cap is
 *    refused before anything is read out.
 * 4. `SAVE_SLICE_SRC` returns slices of at most `SAVE_SLICE_UNITS` code units by value (never ending between
 *    the halves of a surrogate pair), joined here; the caller encodes the joined string once (`TextEncoder`).
 * 5. The completion value and the holder are released.
 *
 * A PRIMITIVE completion value (a string, number, boolean, null, a BigInt) has no objectId: CDP puts it in
 * `Runtime.evaluate`'s own reply, whole (SPEC-DISCREPANCY F2 in the S4 report; a live row measures it). It is
 * still stored in slices in the worker, so no runtime message or WebSocket frame grows with it.
 *
 * The page functions are source STRINGS (not `String(fn)`), so no build step can rename or wrap anything in
 * them; each is self-contained (no closure, no import, no `chrome.*`). No message here echoes the value.
 */
import type { EvaluateSaveKind } from "@bridge/shared";
import { BridgeError, ErrorCodes } from "../errors.js";
import { pageError, type CdpEvaluateResponse, type CdpRemoteObject } from "./result.js";
import { SAVE_MAX_VALUE_BYTES, tooLargeError } from "../evaluate-save-store.js";
import { markOwnRefusal } from "../debugger-errors.js";

/** Code units per slice read out of the page (≤ 3 MiB of UTF-8, one CDP reply each). */
export const SAVE_SLICE_UNITS = 1_048_576;

/**
 * In the page, `this` = the completion value (or the promise of it). Returns a holder `{s, k, r}`: `s` the
 * text, `k` "string" | "json", `r` a refusal reason ("" when saveable). Never throws but for the awaited
 * promise's own rejection (the page's own error, as `evaluate` reports it).
 */
export const SAVE_PREPARE_SRC = `async function (awaitIt) {
  "use strict";
  var v = this;
  if (awaitIt) v = await v;
  var h = { s: "", k: "", r: "" };
  var t = typeof v;
  if (t === "string") { h.s = v; h.k = "string"; return h; }
  if (t === "undefined") { h.r = "undefined"; return h; }
  if (t === "function") { h.r = "function"; return h; }
  if (t === "symbol") { h.r = "symbol"; return h; }
  if (v !== null && t === "object") {
    var tag = "";
    try { tag = Object.prototype.toString.call(v); } catch (e) { tag = ""; }
    if (tag === "[object Map]") { h.r = "map"; return h; }
    if (tag === "[object Set]") { h.r = "set"; return h; }
    var node = false;
    try { node = typeof Node === "function" && v instanceof Node; } catch (e) { node = false; }
    if (!node) {
      try {
        var p = Object.getPrototypeOf(v);
        for (var i = 0; p !== null && i < 64; i++) {
          if (Object.prototype.toString.call(p) === "[object Node]") { node = true; break; }
          p = Object.getPrototypeOf(p);
        }
      } catch (e) { node = false; }
    }
    if (node) { h.r = "node"; return h; }
  }
  var s;
  try { s = JSON.stringify(v); } catch (e) { h.r = "stringify"; return h; }
  if (typeof s !== "string") { h.r = "unsaveable"; return h; }
  h.s = s; h.k = "json"; return h;
}`;

/** In the page, `this` = the holder: `[length in code units, kind, reason]`, by value. */
export const SAVE_META_SRC = `function () {
  "use strict";
  return [this.s.length, this.k, this.r];
}`;

/**
 * In the page, `this` = the holder: the code units [o, o + n), one shorter when that would end on the high half
 * of a surrogate pair (unless the slice is a single unit), by value.
 */
export const SAVE_SLICE_SRC = `function (o, n) {
  "use strict";
  var s = this.s;
  var e = Math.min(o + n, s.length);
  if (e < s.length && e - o > 1) {
    var c = s.charCodeAt(e - 1);
    if (c >= 0xd800 && c <= 0xdbff) e = e - 1;
  }
  return s.slice(o, e);
}`;

/** `Runtime.evaluate`'s parameters: exactly `evaluateInPage`'s (`debugger.ts`). */
export function saveEvaluateParams(expression: string, timeoutMs: number): { [key: string]: unknown } {
  return {
    expression,
    replMode: true,
    awaitPromise: true,
    returnByValue: false,
    userGesture: true,
    timeout: timeoutMs,
    generatePreview: false,
  };
}

// Refusal messages: fixed texts, never a part of the value.
const NOTHING = "nothing to save";
const REFUSALS: Record<string, string> = {
  undefined: `The value is undefined — ${NOTHING}`,
  function: "The value is a function, which is not saveable — return a string or plain JSON data",
  symbol: "The value is a symbol, which is not saveable — return a string or plain JSON data",
  map: "The value is a Map, which JSON turns into {} — not saveable; convert it first (e.g. Object.fromEntries(map))",
  set: "The value is a Set, which JSON turns into {} — not saveable; convert it first (e.g. [...set])",
  node: "The value is a DOM node, which is not saveable — return its text or HTML (e.g. el.outerHTML)",
  unsaveable: `JSON.stringify gives nothing for the value — ${NOTHING}`,
};
export const STRINGIFY_FAILED_MESSAGE =
  "JSON.stringify threw on the value in the page (a cycle, a BigInt, or a throwing toJSON or getter) — nothing was saved";

/**
 * A value refusal, marked as the bridge's own (Step 11 S1, #246): thrown inside `withDebugger`, it reaches the
 * wire with this text, not `[chrome.debugger] `-prefixed. The cap's refusal is marked at its throw sites below.
 */
function refusal(reason: string): BridgeError {
  if (reason === "stringify") return markOwnRefusal(new BridgeError(ErrorCodes.PAGE_ERROR, STRINGIFY_FAILED_MESSAGE, { name: "TypeError" }));
  return markOwnRefusal(new BridgeError(ErrorCodes.BAD_PARAMS, REFUSALS[reason] ?? `The value is not saveable — ${NOTHING}`));
}

export interface SaveText {
  text: string;
  kind: EvaluateSaveKind;
}

/**
 * A primitive completion value (no objectId), as the page's `JSON.stringify` would make it: a string as is;
 * NaN and ±Infinity → `null`; -0 → `0`; a BigInt → PAGE_ERROR (JSON.stringify throws); undefined → BAD_PARAMS.
 */
export function primitiveSaveText(r: CdpRemoteObject, maxUnits: number = SAVE_MAX_VALUE_BYTES): SaveText {
  if (typeof r.unserializableValue === "string") {
    const u = r.unserializableValue;
    if (r.type === "bigint" || /n$/.test(u)) throw refusal("stringify");
    return { text: u === "-0" ? "0" : "null", kind: "json" };
  }
  if (r.type === "undefined") throw refusal("undefined");
  if (r.subtype === "null" || r.value === null) return { text: "null", kind: "json" };
  if (r.type === "string" && typeof r.value === "string") {
    if (r.value.length > maxUnits) throw markOwnRefusal(tooLargeError(maxUnits));
    return { text: r.value, kind: "string" };
  }
  if ((r.type === "number" && typeof r.value === "number") || (r.type === "boolean" && typeof r.value === "boolean")) {
    return { text: JSON.stringify(r.value), kind: "json" };
  }
  throw refusal("unknown");
}

type Send = (method: string, params: { [key: string]: unknown }) => Promise<unknown>;
type Race = <T>(p: Promise<T>) => Promise<T>;

export interface SaveCollectDeps {
  send: Send;
  /** Bounds the evaluation (steps 1–2: the page's own work). Default: no bound. */
  evalRace?: Race;
  /** Bounds reading the holder out (steps 3–4). Default: no bound. */
  transferRace?: Race;
  /** The largest value accepted, in code units (≤ its UTF-8 bytes). Default `SAVE_MAX_VALUE_BYTES`. */
  maxUnits?: number;
  /** Code units per slice. Default `SAVE_SLICE_UNITS`. */
  sliceUnits?: number;
}

const identity: Race = (p) => p;

async function release(send: Send, objectId: string | undefined): Promise<void> {
  if (objectId === undefined) return;
  try {
    await send("Runtime.releaseObject", { objectId });
  } catch {
    /* best effort — the context may already be gone */
  }
}

/** Steps 1–5 above: the value's text and kind, or a refusal. Never puts the value in an error. */
export async function collectSaveText(expression: string, timeoutMs: number, deps: SaveCollectDeps): Promise<SaveText> {
  const { send } = deps;
  const evalRace = deps.evalRace ?? identity;
  const raw = (await evalRace(send("Runtime.evaluate", saveEvaluateParams(expression, timeoutMs)))) as CdpEvaluateResponse;
  return collectSaveFromRaw(raw, deps);
}

/**
 * Steps 2–5 from a completion value already produced (step 1's reply, or Step 12's `args` call: `evaluate/call.ts`,
 * whose own race and deadline stop bound it).
 */
export async function collectSaveFromRaw(raw: CdpEvaluateResponse, deps: SaveCollectDeps): Promise<SaveText> {
  const { send } = deps;
  const evalRace = deps.evalRace ?? identity;
  const transferRace = deps.transferRace ?? identity;
  const maxUnits = deps.maxUnits ?? SAVE_MAX_VALUE_BYTES;
  const sliceUnits = Math.max(1, Math.floor(deps.sliceUnits ?? SAVE_SLICE_UNITS));
  if (raw.exceptionDetails) throw pageError(raw.exceptionDetails);
  const r: CdpRemoteObject = raw.result ?? { type: "undefined" };
  if (typeof r.objectId !== "string") return primitiveSaveText(r, maxUnits);

  let holderId: string | undefined;
  try {
    const prep = (await evalRace(
      send("Runtime.callFunctionOn", {
        objectId: r.objectId,
        functionDeclaration: SAVE_PREPARE_SRC,
        arguments: [{ value: r.subtype === "promise" }],
        awaitPromise: true,
        returnByValue: false,
      }),
    )) as CdpEvaluateResponse;
    if (prep.exceptionDetails) throw pageError(prep.exceptionDetails);
    holderId = typeof prep.result?.objectId === "string" ? prep.result.objectId : undefined;
    if (holderId === undefined) throw new BridgeError(ErrorCodes.INTERNAL, "The in-page holder of the value was lost; nothing was saved");

    const meta = (await transferRace(
      send("Runtime.callFunctionOn", { objectId: holderId, functionDeclaration: SAVE_META_SRC, returnByValue: true }),
    )) as CdpEvaluateResponse;
    const m = meta.exceptionDetails ? undefined : (meta.result?.value as unknown);
    if (!Array.isArray(m) || typeof m[0] !== "number" || typeof m[2] !== "string") {
      throw new BridgeError(ErrorCodes.INTERNAL, "The in-page holder of the value could not be read; nothing was saved");
    }
    const [length, kind, reason] = m as [number, string, string];
    if (reason !== "") throw refusal(reason);
    if (length > maxUnits) throw markOwnRefusal(tooLargeError(maxUnits));

    const parts: string[] = [];
    let offset = 0;
    while (offset < length) {
      const res = (await transferRace(
        send("Runtime.callFunctionOn", {
          objectId: holderId,
          functionDeclaration: SAVE_SLICE_SRC,
          arguments: [{ value: offset }, { value: sliceUnits }],
          returnByValue: true,
        }),
      )) as CdpEvaluateResponse;
      const piece = res.exceptionDetails ? undefined : res.result?.value;
      if (typeof piece !== "string" || piece.length === 0) {
        throw new BridgeError(ErrorCodes.INTERNAL, "A slice of the value could not be read from the page; nothing was saved");
      }
      parts.push(piece);
      offset += piece.length;
    }
    return { text: parts.join(""), kind: kind === "string" ? "string" : "json" };
  } finally {
    await release(send, holderId);
    await release(send, r.objectId);
  }
}

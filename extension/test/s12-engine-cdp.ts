/**
 * Step 12 S2a: a CDP over this JS engine's real values for the `args` tests — objects by id, primitives by value, and
 * every shipped source (the fixed wrapper, the serialiser, the save sources) evaluated and run here. Records every call.
 */
import { CALL_WRAPPER_SRC } from "../src/evaluate/call.js";

export const FN_SCRIPT = "fn-script-1";

/**
 * Step 13 S2 (#386): what Chrome's `returnByValue` does to a value — object keys sorted at every depth (integer-like
 * first, then code-unit order: the sort, then this engine's own integer-key order), arrays in place (Stage 0, 6/6).
 */
export function byValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(byValue);
  if (v === null || typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v).sort()) out[k] = byValue((v as Record<string, unknown>)[k]);
  return out;
}
type Call = { method: string; params: Record<string, unknown> };

/** A CDP over this engine's real values: objects by id, primitives by value; shipped sources are evaluated here. */
export class EngineCdp {
  readonly calls: Call[] = [];
  readonly objects = new Map<string, unknown>();
  private seq = 0;
  /** Per-method overrides (return undefined to fall through). */
  override: Record<string, (p: Record<string, unknown>) => unknown> = {};

  remote(v: unknown): Record<string, unknown> {
    if (v === undefined) return { type: "undefined" };
    if (v === null) return { type: "object", subtype: "null", value: null };
    const t = typeof v;
    if (t !== "object" && t !== "function") return { type: t, value: v };
    const objectId = `o${++this.seq}`;
    this.objects.set(objectId, v);
    return { type: t, ...(v instanceof Promise ? { subtype: "promise" } : {}), objectId, description: t === "function" ? String(v) : "Object" };
  }

  private exc(e: unknown) {
    return { result: { type: "object" }, exceptionDetails: { text: "Uncaught", exception: { type: "object", className: "Error", description: String(e) } } };
  }

  send = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    this.calls.push({ method, params });
    const o = this.override[method]?.(params);
    if (o !== undefined) return o;
    if (method.startsWith("Debugger.")) return {};
    if (method === "Runtime.releaseObject") return {};
    if (method === "Runtime.evaluate") {
      try {
        return { result: this.remote((0, eval)(String(params.expression))) };
      } catch (e) {
        return this.exc(e);
      }
    }
    if (method === "Runtime.getProperties") {
      const f = this.objects.get(String(params.objectId));
      return { result: [], internalProperties: typeof f === "function" ? [{ name: "[[FunctionLocation]]", value: { value: { scriptId: FN_SCRIPT } } }] : [] };
    }
    if (method === "Runtime.callFunctionOn") {
      const fn = (0, eval)(`(${String(params.functionDeclaration)})`) as (...a: unknown[]) => unknown;
      const self = this.objects.get(String(params.objectId));
      const args = ((params.arguments as Array<{ value?: unknown; objectId?: string }>) ?? []).map((a) =>
        a.objectId !== undefined ? this.objects.get(a.objectId) : a.value,
      );
      let out: unknown;
      try {
        out = fn.apply(self, args);
        if (params.awaitPromise) out = await out;
      } catch (e) {
        return this.exc(e);
      }
      return params.returnByValue ? { result: { type: typeof out, value: byValue(out) } } : { result: this.remote(out) };
    }
    throw new Error(`unexpected ${method}`);
  };

  /** Every params object, as JSON, of the calls that are not the wrapper's. */
  textsOutsideWrapperArgs(): string[] {
    const out: string[] = [];
    for (const c of this.calls) {
      const { arguments: a, ...rest } = c.params;
      out.push(JSON.stringify(rest));
      if (c.params.functionDeclaration !== CALL_WRAPPER_SRC) out.push(JSON.stringify(a ?? null));
      else out.push(JSON.stringify((a as Array<{ objectId?: string }>)[0]));
    }
    return out;
  }
}

/**
 * Step 10 S4: a fake CDP over real JS values for the `evaluateSave*` tests — objects get ids, primitives
 * come by value (as Chrome does), `Runtime.callFunctionOn` runs the shipped page-function source strings.
 * Records every call and the JSON size of every reply.
 */
import { SAVE_SLICE_SRC } from "../src/evaluate/save.js";

type Remote = { type: string; subtype?: string; value?: unknown; unserializableValue?: string; objectId?: string; description?: string };

/** A fake CDP over real JS values: objects get ids, primitives come by value (as Chrome does). */
export class FakeCdp {
  readonly objects = new Map<string, unknown>();
  readonly calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  readonly replySizes: number[] = [];
  private seq = 0;

  constructor(public completion: () => unknown) {}

  private remote(v: unknown): Remote {
    if (v === undefined) return { type: "undefined" };
    if (v === null) return { type: "object", subtype: "null", value: null };
    const t = typeof v;
    if (t === "bigint") return { type: "bigint", unserializableValue: `${String(v)}n` };
    if (t === "number") {
      const n = v as number;
      if (Number.isNaN(n)) return { type: "number", unserializableValue: "NaN" };
      if (n === Infinity) return { type: "number", unserializableValue: "Infinity" };
      if (n === -Infinity) return { type: "number", unserializableValue: "-Infinity" };
      if (Object.is(n, -0)) return { type: "number", unserializableValue: "-0" };
      return { type: "number", value: n };
    }
    if (t === "string" || t === "boolean") return { type: t, value: v };
    const objectId = `o${++this.seq}`;
    this.objects.set(objectId, v);
    const subtype = v instanceof Promise ? "promise" : undefined;
    return { type: t, ...(subtype ? { subtype } : {}), objectId, description: "Object" };
  }

  private reply<T>(r: T): T {
    this.replySizes.push(JSON.stringify(r).length);
    return r;
  }

  send = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    this.calls.push({ method, params });
    if (method === "Runtime.evaluate") {
      let v: unknown;
      try {
        v = this.completion();
      } catch (e) {
        return this.reply({ result: { type: "object" }, exceptionDetails: { text: "Uncaught", exception: { type: "object", className: "Error", description: String(e) } } });
      }
      return this.reply({ result: this.remote(v) });
    }
    if (method === "Runtime.callFunctionOn") {
      const fn = new Function(`return (${String(params.functionDeclaration)})`)() as (...a: unknown[]) => unknown;
      const self = this.objects.get(String(params.objectId));
      const args = ((params.arguments as Array<{ value: unknown }>) ?? []).map((a) => a.value);
      let out: unknown;
      try {
        out = fn.apply(self, args);
        if (params.awaitPromise) out = await out;
      } catch (e) {
        return this.reply({ result: { type: "object" }, exceptionDetails: { text: "Uncaught", exception: { type: "object", className: "Error", description: String(e) } } });
      }
      if (params.returnByValue) return this.reply({ result: { type: typeof out, value: out } });
      return this.reply({ result: this.remote(out) });
    }
    if (method === "Runtime.releaseObject") {
      this.objects.delete(String(params.objectId));
      return this.reply({});
    }
    throw new Error(`unexpected ${method}`);
  };

  slices(): number {
    return this.calls.filter((c) => c.method === "Runtime.callFunctionOn" && c.params.functionDeclaration === SAVE_SLICE_SRC).length;
  }
}

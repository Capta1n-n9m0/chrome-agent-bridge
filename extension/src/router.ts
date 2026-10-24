import { ErrorCodes, toWireError } from "./errors.js";
import { methodClass, refusalError } from "./safety.js";
import type { GatedCall, HandlerSafety } from "./safety-call.js";

export type Handler = (params: Record<string, unknown>) => Promise<unknown>;

/** A handler of the gated router: it also gets the call's safety (effect checks, cleanups, redaction). */
export type GatedHandler = (params: Record<string, unknown>, call: HandlerSafety) => Promise<unknown> | unknown;

/** Builds one call's gate (in `sw.ts`: a `CallSafety` over the stored state and the tabs). */
export type GateFactory = (method: string, params: Record<string, unknown>) => GatedCall;

/**
 * Step 9 (Phase E): the router the service worker uses. Every request passes the safety gate before any
 * handler code runs — not even a handler's synchronous prologue — and again before the reply (the
 * post-check, which replaces a result or an error with the refusal) (phase doc 0.1's F1 note; decisions.md
 * · 2026-10-24 · In-flight work at disarm and on a newly blocked tab (#137)). `on` throws for a method with
 * no safety class, so a new method cannot bypass the gate (S1.1's second half; decisions.md · 2026-10-24 ·
 * Where S2's and S1.1's checks close after the split (#147)). A throw from the gate is a wiring slip and is
 * answered `INTERNAL`, never allowed. An unknown method is `UNKNOWN_METHOD` in every state: no handler
 * exists to run, and nothing about the state is revealed. `Router` above stays the ungated dispatch core.
 */
export class GatedRouter {
  private handlers = new Map<string, GatedHandler>();

  constructor(private readonly gate: GateFactory) {}

  on(method: string, handler: GatedHandler): void {
    methodClass(method); // throws: no safety class, no registration
    this.handlers.set(method, handler);
  }

  /** As `Router.handle`: the reply's JSON, or null for a frame that is not a request. */
  async handle(data: string): Promise<string | null> {
    let msg: { id?: string; method?: string; params?: Record<string, unknown> };
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
    if (!msg || !msg.id || !msg.method) return null;
    const id = msg.id;
    const handler = this.handlers.get(msg.method);
    if (!handler) {
      return JSON.stringify({ id, error: { code: ErrorCodes.UNKNOWN_METHOD, message: `unknown method: ${msg.method}` } });
    }
    const params = msg.params ?? {};
    const fail = (err: unknown) => JSON.stringify({ id, error: toWireError(err) });

    let call: GatedCall;
    try {
      call = this.gate(msg.method, params);
      const d = await call.receipt();
      if (typeof d === "object" && "code" in d) return fail(refusalError(d));
    } catch (err) {
      return fail(asInternal(err));
    }

    let result: unknown;
    let thrown: { err: unknown } | undefined;
    try {
      result = await handler(params, call);
    } catch (err) {
      thrown = { err };
    }

    try {
      const refusal = await call.post();
      if (refusal) {
        call.runRefused();
        return fail(refusalError(refusal));
      }
    } catch (err) {
      call.runRefused();
      return fail(asInternal(err));
    }
    if (thrown) return fail(thrown.err);
    return JSON.stringify({ id, result: result ?? { ok: true } });
  }
}

/** A gate failure that is not a refusal: always `INTERNAL`, whatever it carries. */
function asInternal(err: unknown): Error {
  // A plain Error goes on the wire as INTERNAL (toWireError); a BridgeError's own code is not kept.
  return new Error(err instanceof Error ? err.message : String(err));
}

export class Router {
  private handlers = new Map<string, Handler>();

  on(method: string, handler: Handler): void {
    this.handlers.set(method, handler);
  }

  /**
   * Returns the JSON string to send back, or null if the message was not a request (bad JSON, or a
   * frame without `id`/`method`, such as an `{event, params}` frame).
   */
  async handle(data: string): Promise<string | null> {
    let msg: { id?: string; method?: string; params?: Record<string, unknown> };
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
    if (!msg || !msg.id || !msg.method) return null;
    const handler = this.handlers.get(msg.method);
    if (!handler) {
      return JSON.stringify({
        id: msg.id,
        error: { code: ErrorCodes.UNKNOWN_METHOD, message: `unknown method: ${msg.method}` },
      });
    }
    try {
      const result = await handler(msg.params ?? {});
      return JSON.stringify({ id: msg.id, result: result ?? { ok: true } });
    } catch (err) {
      return JSON.stringify({ id: msg.id, error: toWireError(err) });
    }
  }
}

import type { EvalEnvelope } from "@bridge/shared";
import type { SerializeLimits } from "./serialize.js";

export type MainWorldEvaluateResult =
  | { ok: true; value: EvalEnvelope }
  | { ok: false; error: string };

/**
 * Self-contained MAIN-world evaluator used by Safari's `scripting.executeScript` path. The
 * serialiser arrives as source because an injected function cannot close over extension modules.
 * Direct eval preserves normal script completion values; the AsyncFunction fallback adds top-level
 * await support for expressions.
 */
export async function evaluateInMainWorld(
  expression: string,
  serializerSource: string,
  limits: SerializeLimits,
): Promise<MainWorldEvaluateResult> {
  function errorText(err: unknown): string {
    try {
      if (err && typeof err === "object") {
        const e = err as { name?: unknown; message?: unknown; stack?: unknown };
        const name = typeof e.name === "string" && e.name ? e.name : "Error";
        const message = typeof e.message === "string" ? e.message : String(err);
        const stack = typeof e.stack === "string" ? e.stack.split("\n").slice(1, 6).join("\n") : "";
        return `${name}: ${message}${stack ? `\n${stack}` : ""}`;
      }
      return String(err);
    } catch {
      return "Unprintable page exception";
    }
  }

  try {
    let value: unknown;
    try {
      // Direct eval returns a statement-list completion value, matching a console for common input.
      value = await globalThis.eval(expression);
    } catch (err) {
      if (!(err instanceof SyntaxError) || !/\bawait\b/.test(expression)) throw err;
      // `eval` parses as Script and rejects top-level await. Most agent calls are expressions, so
      // compile that form first; fall back to a statement body when it is not an expression.
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => () => Promise<unknown>;
      let run: () => Promise<unknown>;
      try {
        run = new AsyncFunction(`return await (\n${expression}\n)`);
      } catch (compileErr) {
        if (!(compileErr instanceof SyntaxError)) throw compileErr;
        run = new AsyncFunction(expression);
      }
      value = await run();
    }
    const serializer = globalThis.eval(`(${serializerSource})`) as (this: unknown, limits: SerializeLimits) => EvalEnvelope;
    return { ok: true, value: serializer.call(value, limits) };
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }
}

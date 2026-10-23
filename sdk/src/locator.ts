// Step 8 S3 — what a script names an element by: a ref from a snapshot ("e12") or a `Locator`
// (phase doc 0.1, 0.4). Checked here, before any call, so a malformed target fails at once with a
// message that says what to write instead.
import { BridgeError, ErrorCodes, isLocator, type Locator } from "@bridge/shared";

/** An action's target: a ref (`"e12"`, from `snapshot()` or `locate()`) or a locator. */
export type Target = string | Locator;

/** The wire half of an action's params: exactly one of `ref` / `locator` (protocol `ActionTarget`). */
export type NormalizedTarget = { ref: string } | { locator: Locator };

const SHAPES = "{role, name?}, {text} or {css} (each may add nth; role and text may add exact)";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function has(v: Record<string, unknown>, key: string): boolean {
  return v[key] !== undefined;
}

/** Why `value` is not a `Locator`, for the common mistakes; the generic text otherwise. */
function locatorProblem(value: unknown, what: string): string {
  if (isPlainObject(value)) {
    if (has(value, "name") && !has(value, "role") && !has(value, "text") && !has(value, "css")) {
      return `${what}: a locator with "name" needs "role" — use {text} or add role (e.g. {role: "button", name: …})`;
    }
    if (has(value, "ref") && Object.keys(value).every((k) => k === "ref" || value[k] === undefined)) {
      return `${what}: pass a ref as a plain string ("e12"), not {ref}`;
    }
  }
  return `${what}: not a locator — use one of ${SHAPES}`;
}

/**
 * A target as the wire wants it: a non-empty string → `{ref}`, a valid locator → `{locator}`.
 * Throws `BAD_PARAMS` (no call is made) otherwise; `{name}` without `role` gets "use {text} or add
 * role", `{ref: "e1"}` gets "pass a ref as a plain string".
 */
export function normalizeTarget(target: unknown): NormalizedTarget {
  if (typeof target === "string") {
    if (target === "") throw new BridgeError(ErrorCodes.BAD_PARAMS, "target: empty ref — pass a ref like \"e12\" or a locator");
    return { ref: target };
  }
  if (isLocator(target)) return { locator: target };
  throw new BridgeError(ErrorCodes.BAD_PARAMS, locatorProblem(target, "target"));
}

/** `value` if it is a `Locator`; `BAD_PARAMS` (no call) otherwise. `what` names the caller. */
export function requireLocator(value: unknown, what: string): Locator {
  if (isLocator(value)) return value;
  if (typeof value === "string") {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, `${what}: takes a locator, not a ref string — use one of ${SHAPES}`);
  }
  throw new BridgeError(ErrorCodes.BAD_PARAMS, locatorProblem(value, what));
}

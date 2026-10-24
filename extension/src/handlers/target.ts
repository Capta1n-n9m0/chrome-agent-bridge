/**
 * `ref | locator` (Step 8 phase doc 0.2). The one place an action's target becomes a ref. The caller
 * has already run `ensureContent`. A locator crosses to the page as its OWN top-level argument:
 * `toSerializableArgs` maps only a top-level `undefined` (stage0-audit.md F34).
 */
import { isLocator, type LocateResult } from "@bridge/shared";
import { callInPage } from "../inject.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { HandlerSafety } from "../safety-call.js";

const present = (v: unknown): boolean => v !== undefined && v !== null;

/** The content script's `locate`, the locator as its own argument. */
export function locateInPage(tabId: number, locator: unknown): Promise<LocateResult> {
  return callInPage<LocateResult>(tabId, (loc) => window.__agentBridge!.locate(loc), [locator]);
}

/**
 * Both `ref` and `locator` → `BAD_PARAMS`; an invalid locator → `BAD_PARAMS` with no page call; a
 * locator → the ref `locate` minted (its `LOCATOR_*` failures propagate unchanged); otherwise `p.ref`
 * unchanged — so a call with a ref, or with neither, behaves exactly as before Step 8.
 */
export async function resolveTarget(tabId: number, p: Record<string, unknown>, call?: HandlerSafety): Promise<string | undefined> {
  return (await resolveTargetCapped(tabId, p, call)).ref;
}

/** A resolved target: the ref, and whether `locate` said the element is past the snapshot's cap. */
export interface ResolvedTarget {
  ref: string | undefined;
  /** Step 10 S3 (#117): true only for a locator whose `locate` answered `pastSnapshotCap: true`. */
  pastSnapshotCap: boolean;
}

/** `resolveTarget`, keeping the locate's `pastSnapshotCap` (a ref, or neither, is never past the cap). */
export async function resolveTargetCapped(tabId: number, p: Record<string, unknown>, call?: HandlerSafety): Promise<ResolvedTarget> {
  checkTarget(p);
  if (present(p.locator)) {
    await call?.effect(); // Step 9: the locate is a page call too (#137)
    const found = await locateInPage(tabId, p.locator);
    return { ref: found.ref, pastSnapshotCap: found.pastSnapshotCap === true };
  }
  return { ref: p.ref as string | undefined, pastSnapshotCap: false };
}

/**
 * `reply` with `pastSnapshotCap: true` added last when `past` (an object reply only); otherwise the
 * very same `reply`, so an action without the flag answers exactly as before S3.
 */
export function withCapFlag<T>(reply: T, past: boolean): T {
  if (!past || typeof reply !== "object" || reply === null) return reply;
  return { ...reply, pastSnapshotCap: true as const };
}

/**
 * The `ref | locator` param check alone, synchronous and with no page call: the actions run it before
 * `pageTab`/`ensureContent`, so a bad target is BAD_PARAMS on any tab. A valid call adds nothing to
 * the page-call sequence (`resolveTarget` re-checks, which is free).
 */
export function checkTarget(p: Record<string, unknown>): void {
  if (present(p.ref) && present(p.locator)) {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, "pass exactly one of ref / locator");
  }
  if (present(p.locator) && !isLocator(p.locator)) {
    throw new BridgeError(
      ErrorCodes.BAD_PARAMS,
      "locator must be one of {role, name?, exact?, nth?}, {text, exact?, nth?} or {css, nth?}",
    );
  }
}

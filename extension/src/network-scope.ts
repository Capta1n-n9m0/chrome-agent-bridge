/**
 * Which tab(s) a network query or clear covers. Pure, so every form is unit-tested.
 *
 * Forms, in order (decisions.md · 2026-10-22 · #40, #52):
 *   1. `tabId` (an integer, from the daemon) → that tab. No `chrome.tabs.get`: a closed tab's log
 *      stays queryable.
 *   2. `scope: "all"` (the daemon never forwards a `tab` key) → every tab, incl. the -1 bucket.
 * Anything else → `BAD_PARAMS`. Step 8 S2b removed the Step 6 daemon's legacy `tab` forms and the
 * human's-tab fallback (#52); the daemon resolves "active"/absent to a `tabId` itself (#40, #81).
 */
import { BridgeError, ErrorCodes } from "./errors.js";
import type { Scope } from "./network-log.js";

export interface ResolvedScope {
  scope: Scope;
  /** The scope itself (kept for the result's callers). */
  label: Scope;
}

export const SCOPE_REQUIRED = 'networkRequests/networkClear need tabId (an integer) or scope "all"';

export function resolveNetworkScope(p: Record<string, unknown>): ResolvedScope {
  if (p.tabId !== undefined) {
    if (typeof p.tabId !== "number" || !Number.isInteger(p.tabId)) {
      throw new BridgeError(ErrorCodes.BAD_PARAMS, "tabId must be an integer");
    }
    return { scope: p.tabId, label: p.tabId };
  }
  if (p.scope === "all") return { scope: "all", label: "all" };
  throw new BridgeError(ErrorCodes.BAD_PARAMS, SCOPE_REQUIRED);
}

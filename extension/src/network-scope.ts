/**
 * Which tab(s) a network query or clear covers. Pure apart from the injected `fallback` (the 0.1
 * target-tab fallback), so every form is unit-tested.
 *
 * Forms, in order (decisions.md · 2026-10-22 · #40, #52):
 *   1. `tabId` (an integer, from a Step 7 daemon) → that tab. No `chrome.tabs.get`: a closed tab's log
 *      stays queryable.
 *   2. `scope: "all"` (a Step 7 daemon never forwards a `tab` key) → every tab, incl. the -1 bucket.
 *   3. the legacy `tab` of a Step 6 daemon, exactly as before: undefined/null/"active" → the fallback
 *      tab; "all"; an integer (or a numeric string, as `Number()` reads it); anything else `BAD_PARAMS`.
 */
import { BridgeError, ErrorCodes } from "./errors.js";
import type { Scope } from "./network-log.js";

export interface ResolvedScope {
  scope: Scope;
  /** What the formatter prints: `"active"` for the legacy fallback, else the scope itself. */
  label: "active" | Scope;
}

export async function resolveNetworkScope(
  p: Record<string, unknown>,
  fallback: () => Promise<number>,
): Promise<ResolvedScope> {
  if (p.tabId !== undefined) {
    if (typeof p.tabId !== "number" || !Number.isInteger(p.tabId)) {
      throw new BridgeError(ErrorCodes.BAD_PARAMS, "tabId must be an integer");
    }
    return { scope: p.tabId, label: p.tabId };
  }
  if (p.scope === "all") return { scope: "all", label: "all" };
  const tab = p.tab;
  if (tab === undefined || tab === null || tab === "active") {
    return { scope: await fallback(), label: "active" };
  }
  if (tab === "all") return { scope: "all", label: "all" };
  const n = Number(tab);
  if (!Number.isInteger(n)) {
    throw new BridgeError(ErrorCodes.BAD_PARAMS, `Invalid tab: ${String(tab)} — use "active", "all" or a tab id`);
  }
  return { scope: n, label: n };
}

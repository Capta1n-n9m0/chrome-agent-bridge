import { targetTab } from "../tabs.js";
import { flushNow, log, ready } from "../network-state.js";
import { formatEntries, formatEntry } from "../network-log.js";
import { resolveNetworkScope } from "../network-scope.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { NetworkRequestsResult } from "@bridge/shared";
import type { Scope } from "../network-log.js";

/**
 * The 0.1 fallback for the legacy `tab` forms. `targetTab` gets no params on purpose: the network
 * methods' string `tab` ("active"/"all") is a scope, not an unresolved handle (Stage 0 F17, F3).
 */
const fallbackTab = (method: string) => async (): Promise<number> => (await targetTab({}, method)).id!;

function coerceLimit(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BridgeError(ErrorCodes.BAD_PARAMS, `Invalid limit: ${String(v)}`);
  return n; // NetworkLog.query clamps to [1, 500].
}

export async function networkRequests(p: Record<string, unknown>): Promise<NetworkRequestsResult> {
  await ready;
  const id = p.id === undefined || p.id === null ? undefined : p.id;
  if (id !== undefined && typeof id !== "string") throw new BridgeError(ErrorCodes.BAD_PARAMS, "id must be a string");
  // An id lookup is global, so it must not fail merely because there is no active tab.
  const { scope, label } = id !== undefined
    ? { scope: "all" as Scope, label: "all" as const }
    : await resolveNetworkScope(p, fallbackTab("networkRequests"));

  let types: string[] | undefined;
  if (p.types !== undefined && p.types !== null) {
    if (!Array.isArray(p.types) || p.types.some((t) => typeof t !== "string")) {
      throw new BridgeError(ErrorCodes.BAD_PARAMS, "types must be an array of strings");
    }
    types = p.types as string[];
  }
  const result = log.query({
    tabId: scope,
    filter: p.filter === undefined || p.filter === null ? undefined : String(p.filter),
    types,
    failedOnly: p.failedOnly === true,
    limit: coerceLimit(p.limit),
    includeHeaders: p.includeHeaders === true,
    id,
  });

  const now = Date.now();
  const text = id !== undefined
    ? formatEntry(result.entries[0]!, { now })
    : formatEntries(result, { now, scope: label });
  return { ...result, text };
}

export async function networkClear(p: Record<string, unknown>): Promise<{ cleared: number }> {
  await ready;
  const { scope } = await resolveNetworkScope(p, fallbackTab("networkClear"));
  const cleared = log.clear(scope);
  // Not debounced: after a cull the next query rehydrates from storage, which must not still
  // hold the entries we just cleared.
  await flushNow();
  return { cleared };
}

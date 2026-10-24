import { flushNow, log, ready } from "../network-state.js";
import { resolveNetworkScope } from "../network-scope.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { NetworkRequestsResult } from "@bridge/shared";
import type { Scope } from "../network-log.js";

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
  const { scope } = id !== undefined
    ? { scope: "all" as Scope }
    : resolveNetworkScope(p);

  let types: string[] | undefined;
  if (p.types !== undefined && p.types !== null) {
    if (!Array.isArray(p.types) || p.types.some((t) => typeof t !== "string")) {
      throw new BridgeError(ErrorCodes.BAD_PARAMS, "types must be an array of strings");
    }
    types = p.types as string[];
  }
  // Data only: the text a model reads is built by the SDK formatter (T4; decisions.md #49).
  return log.query({
    tabId: scope,
    filter: p.filter === undefined || p.filter === null ? undefined : String(p.filter),
    types,
    failedOnly: p.failedOnly === true,
    limit: coerceLimit(p.limit),
    includeHeaders: p.includeHeaders === true,
    id,
  });
}

export async function networkClear(p: Record<string, unknown>): Promise<{ cleared: number }> {
  await ready;
  const { scope } = resolveNetworkScope(p);
  const cleared = log.clear(scope);
  // Not debounced: after a cull the next query rehydrates from storage, which must not still
  // hold the entries we just cleared.
  await flushNow();
  return { cleared };
}

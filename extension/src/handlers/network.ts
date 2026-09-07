import { activeTab } from "../tabs.js";
import { flushNow, log, ready } from "../network-state.js";
import { formatEntries, formatEntry } from "../network-log.js";
import type { NetworkRequestsResult } from "@bridge/shared";
import type { Scope } from "../network-log.js";

/** `undefined` / `"active"` → the active tab; `"all"` → every tab (including the -1 bucket). */
async function resolveScope(tab: unknown): Promise<{ scope: Scope; label: "active" | Scope }> {
  if (tab === undefined || tab === null || tab === "active") {
    const t = await activeTab();
    return { scope: t.id!, label: "active" };
  }
  if (tab === "all") return { scope: "all", label: "all" };
  const n = Number(tab);
  if (!Number.isInteger(n)) throw new Error(`Invalid tab: ${String(tab)} — use "active", "all" or a tab id`);
  return { scope: n, label: n };
}

function coerceLimit(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid limit: ${String(v)}`);
  return n; // NetworkLog.query clamps to [1, 500].
}

export async function networkRequests(p: Record<string, unknown>): Promise<NetworkRequestsResult> {
  await ready;
  const id = p.id === undefined || p.id === null ? undefined : p.id;
  if (id !== undefined && typeof id !== "string") throw new Error("id must be a string");
  // An id lookup is global, so it must not fail merely because there is no active tab.
  const { scope, label } = id !== undefined
    ? { scope: "all" as Scope, label: "all" as const }
    : await resolveScope(p.tab);

  let types: string[] | undefined;
  if (p.types !== undefined && p.types !== null) {
    if (!Array.isArray(p.types) || p.types.some((t) => typeof t !== "string")) {
      throw new Error("types must be an array of strings");
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
  const { scope } = await resolveScope(p.tab);
  const cleared = log.clear(scope);
  // Not debounced: after a cull the next query rehydrates from storage, which must not still
  // hold the entries we just cleared.
  await flushNow();
  return { cleared };
}

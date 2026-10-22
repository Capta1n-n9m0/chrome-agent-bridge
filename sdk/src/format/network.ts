// The `browser_network_requests` text, rendered from the extension's structured `networkRequests`
// result. Moved from `extension/src/network-log.ts` (`formatEntries` → `formatNetwork`, `formatEntry`
// and their helpers) in Step 7 T4 (decision 0.7); byte-identical to that code for the inputs it took
// (`sdk/test/format-baseline.test.ts`, captured at 51de800, #47).
//
// One addition (Stage 0 audit F12, "actors never see Chrome tab ids"): where the old code printed a
// Chrome tab id — the scope label `tab <n>` and the "all"-scope column `tab:<n>` — this prints the
// daemon's handle when it is known (`entry.tab`, which the Step 7 daemon adds; a scope given as a
// handle). With no `tab` on the entries and a numeric scope it prints exactly what the old code did.
import type { NetworkEntry, NetworkRequestsResult } from "@bridge/shared";

const MAX_URL = 300;
const MAX_TEXT_CHARS = 20_000;

/** A network entry as the Step 7 daemon returns it: `tab` is the handle of `tabId`, when it has one. */
export type FormattableEntry = NetworkEntry & { tab?: string };

/** What `formatNetwork` reads: a `networkRequests` result whose entries may carry `tab`. */
export interface FormattableResult extends Omit<NetworkRequestsResult, "entries"> {
  entries: FormattableEntry[];
}

/**
 * Which tab the listing is for: `"active"` (printed `active tab`), `"all"` (`all tabs`), or one tab —
 * a handle (`tab T3`) or, from the pre-Step-7 callers, a Chrome tab id (`tab 412`).
 */
export type NetworkScope = "active" | "all" | string | number;

export interface FormatNetworkOptions {
  /** Epoch ms the ages are measured from. */
  now: number;
  scope: NetworkScope;
  /** Cap on the whole text. Default 20 000. */
  maxChars?: number;
}

function cut(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

/** `chrome.webRequest` resource type → the DevTools name the text prints. */
function displayType(type: string): string {
  switch (type) {
    case "xmlhttprequest":
      return "xhr";
    case "main_frame":
      return "document";
    case "sub_frame":
      return "frame";
    default:
      return type;
  }
}

/** "2.1s ago" / "1m05s ago" / "1h02m ago" — relative, because "what happened after my click" is the question. */
export function formatAgo(ms: number): string {
  const d = Math.max(0, Math.round(ms));
  if (d < 60_000) return `${(d / 1000).toFixed(1)}s ago`;
  if (d < 3_600_000) {
    const m = Math.floor(d / 60_000);
    const s = Math.floor((d % 60_000) / 1000);
    return `${m}m${String(s).padStart(2, "0")}s ago`;
  }
  const h = Math.floor(d / 3_600_000);
  const m = Math.floor((d % 3_600_000) / 60_000);
  return `${h}h${String(m).padStart(2, "0")}m ago`;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function scopeLabel(scope: NetworkScope): string {
  if (scope === "active") return "active tab";
  if (scope === "all") return "all tabs";
  return `tab ${scope}`;
}

function statusColumn(e: NetworkEntry): string {
  if (e.error) return "ERR";
  if (e.status !== undefined) return String(e.status);
  return "···";
}

function statusText(e: NetworkEntry): string {
  if (e.statusLine) return e.statusLine.replace(/^HTTP\/[\d.]+\s+/, "");
  return String(e.status);
}

/** One fixed-width line; `showTab` adds the `tab:<handle or id>` column (the "all" scope). */
export function formatRow(e: FormattableEntry, now: number, showTab: boolean): string {
  const cols: string[] = [`[${e.id}]`.padEnd(6)];
  if (showTab) cols.push(`tab:${e.tab ?? e.tabId}`.padEnd(8));
  cols.push(formatAgo(now - e.startedAt).padEnd(9));
  cols.push(e.method.padEnd(6));
  cols.push(statusColumn(e).padEnd(3));
  cols.push(displayType(e.type).padEnd(9));
  if (e.endedAt === undefined) {
    cols.push("(pending)".padEnd(12));
  } else {
    cols.push((e.durationMs === undefined ? "—" : formatDuration(e.durationMs)).padStart(4));
    cols.push((e.responseSize === undefined ? "—" : formatSize(e.responseSize)).padEnd(6));
  }
  let line = cols.join("  ") + "  " + cut(e.url, MAX_URL);
  if (e.redirectUrl) line += `  → ${e.redirectUrl}`;
  if (e.error) line += `  ${e.error}`;
  return line;
}

/** The `browser_network_requests` listing: header, one fixed-width line per request, hint footer. */
export function formatNetwork(result: FormattableResult, opts: FormatNetworkOptions): string {
  const { now, scope } = opts;
  const maxChars = opts.maxChars ?? MAX_TEXT_CHARS;
  const label = scopeLabel(scope);
  const since = formatAgo(now - result.recordingSince);
  if (result.total === 0) {
    return (
      `No requests recorded for ${label} (recording since ${since}). ` +
      "Reload or act on the page, then query again."
    );
  }
  const head =
    `Network — ${label}: showing ${result.entries.length} of ${result.total} ` +
    `(recording since ${since}; ${result.pending} pending)`;
  const rows = result.entries.map((e) => formatRow(e, now, scope === "all"));
  const foot = "Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.";

  let out = head;
  let used = head.length;
  let i = 0;
  for (; i < rows.length; i++) {
    if (used + 1 + rows[i].length > maxChars) break;
    out += "\n" + rows[i];
    used += 1 + rows[i].length;
  }
  if (i < rows.length) {
    return `${out}\n… [truncated: ${rows.length - i} more lines — narrow with filter/limit]`;
  }
  return `${out}\n${foot}`;
}

/** The `id` form: one request in full, headers and body included. */
export function formatEntry(e: NetworkEntry, opts: { now: number }): string {
  const lines: string[] = [`[${e.id}] ${e.method} ${e.url}`];

  const meta = [`type: ${displayType(e.type)}`];
  if (e.initiator) meta.push(`initiator: ${e.initiator}`);
  meta.push(`started ${formatAgo(opts.now - e.startedAt)}`);
  meta.push(e.endedAt === undefined ? "(pending)" : `took ${formatDuration(e.durationMs ?? 0)}`);
  lines.push(meta.join("   "));

  const status: string[] = [];
  if (e.error) status.push(`error: ${e.error}`);
  else if (e.status !== undefined) status.push(`status: ${statusText(e)}`);
  if (e.redirectUrl) status.push(`redirect → ${e.redirectUrl}`);
  if (e.fromCache !== undefined) status.push(`from cache: ${e.fromCache ? "yes" : "no"}`);
  if (e.ip) status.push(`ip: ${e.ip}`);
  if (e.responseSize !== undefined) status.push(`size: ${formatSize(e.responseSize)}`);
  if (status.length > 0) lines.push(status.join("   "));

  pushHeaders(lines, "request headers", e.requestHeaders);
  pushHeaders(lines, "response headers", e.responseHeaders);
  if (e.requestBody) {
    lines.push("request body:");
    for (const l of e.requestBody.split("\n")) lines.push(`  ${l}`);
  }
  return lines.join("\n");
}

function pushHeaders(lines: string[], title: string, headers?: Record<string, string>): void {
  if (!headers) return;
  const names = Object.keys(headers);
  if (names.length === 0) return;
  lines.push(`${title}:`);
  for (const name of names) lines.push(`  ${name}: ${headers[name]}`);
}

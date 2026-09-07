import type { NetworkEntry, NetworkRequestsResult } from "@bridge/shared";

/**
 * The bounded, per-tab network log behind `browser_network_requests`.
 *
 * Pure: this module imports nothing from `chrome.*` so it runs under node in the unit tests. The
 * service worker owns the `chrome.webRequest` listeners and feeds their `details` objects to
 * `ingest`; everything else here (bounds, eviction, query, rendering, serialise/merge) is logic.
 *
 * Privacy (see the step-5 plan §0.4): headers are redacted and capped **at ingest**, so the redacted
 * form is the only one ever stored; `Cookie`/`Set-Cookie` never even reach the extension because the
 * listeners omit `extraHeaders`. Nothing in here logs — a URL may carry a token.
 */

/**
 * Structural shape of the `details` object every `chrome.webRequest` event carries. Deliberately not
 * `chrome.webRequest.*Details`: those names shift between `@types/chrome` releases and this module
 * must stay usable from node tests.
 */
export interface WebRequestDetails {
  requestId: string;
  url: string;
  method: string;
  type: string;
  tabId: number;
  timeStamp: number;
  initiator?: string;
  frameId?: number;
  requestHeaders?: Array<{ name: string; value?: string }>;
  responseHeaders?: Array<{ name: string; value?: string }>;
  statusCode?: number;
  statusLine?: string;
  fromCache?: boolean;
  ip?: string;
  error?: string;
  redirectUrl?: string;
  requestBody?: WebRequestBody;
}

export interface WebRequestBody {
  formData?: Record<string, string[]>;
  raw?: Array<{ bytes?: ArrayBuffer; file?: string }>;
  error?: string;
}

export type WebRequestEvent =
  | "onBeforeRequest"
  | "onSendHeaders"
  | "onHeadersReceived"
  | "onBeforeRedirect"
  | "onCompleted"
  | "onErrorOccurred";

/** A single tab, or every tab (including the `-1` bucket). */
export type Scope = number | "all";

/** What `query` returns; the handler adds `text`. */
export type NetworkQueryResult = Omit<NetworkRequestsResult, "text">;

export interface QueryOptions {
  tabId: Scope;
  filter?: string;
  types?: string[];
  failedOnly?: boolean;
  limit?: number;
  includeHeaders?: boolean;
  id?: string;
}

/** The `chrome.storage.session` payload — see `toJSON` / `merge`. */
export interface NetworkLogBlob {
  meta: { v: 1; since: number };
  tabs: Record<string, NetworkEntry[]>;
}

const PER_TAB_CAP = 500;
const TOTAL_CAP = 2000;
const MAX_HEADERS = 40;
const MAX_HEADER_VALUE = 512;
const MAX_FIELD_VALUE = 200;
const MAX_BODY_BYTES = 2048;
const MAX_URL = 300;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const PENDING_WINDOW_MS = 30_000;
const MAX_TEXT_CHARS = 20_000;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
]);
const SENSITIVE_HEADER_PARTS = ["token", "secret", "session"];
const SENSITIVE_FIELD_PARTS = ["password", "passwd", "pwd", "token", "secret", "otp", "code"];

const REDACTED = "<redacted>";

function cut(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

function isSensitiveHeader(lowerName: string): boolean {
  return SENSITIVE_HEADERS.has(lowerName) || SENSITIVE_HEADER_PARTS.some((p) => lowerName.includes(p));
}

function isSensitiveField(name: string): boolean {
  const lower = name.toLowerCase();
  return SENSITIVE_FIELD_PARTS.some((p) => lower.includes(p));
}

/**
 * Header list → lower-cased record, sensitive values replaced, at most `MAX_HEADERS` names with each
 * value cut to `MAX_HEADER_VALUE`. Duplicate names: last wins.
 */
export function redactHeaders(list?: Array<{ name: string; value?: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(list)) return out;
  let count = 0;
  for (const h of list) {
    if (!h || typeof h.name !== "string") continue;
    const name = h.name.toLowerCase();
    const known = Object.prototype.hasOwnProperty.call(out, name);
    if (!known && count >= MAX_HEADERS) continue;
    if (!known) count++;
    out[name] = isSensitiveHeader(name) ? REDACTED : cut(h.value ?? "", MAX_HEADER_VALUE);
  }
  return out;
}

/** DevTools alias → `chrome.webRequest` resource type. Unknown names pass through, lower-cased. */
export function normalizeType(name: string): string {
  const lower = String(name).toLowerCase();
  switch (lower) {
    case "xhr":
    case "fetch":
      return "xmlhttprequest";
    case "document":
      return "main_frame";
    case "frame":
    case "iframe":
      return "sub_frame";
    default:
      return lower;
  }
}

/** `normalizeType` in reverse — what the formatter prints. */
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

/** Is this request the bridge talking to its own server, or the extension loading its own pages? */
export function isOwnTraffic(url: string, port: number): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === "chrome-extension:") return true;
  const loopback = u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]" || u.hostname === "::1";
  return loopback && u.port === String(port);
}

// ---------------------------------------------------------------------------------------------
// Request-body summary
// ---------------------------------------------------------------------------------------------

function redactJson(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{")) return text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return text;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return text;
  const obj = parsed as Record<string, unknown>;
  for (const key of Object.keys(obj)) if (isSensitiveField(key)) obj[key] = REDACTED;
  return JSON.stringify(obj);
}

/**
 * A short, redacted rendering of a request body. Called **at ingest**: `raw[].bytes` is an
 * `ArrayBuffer`, which `chrome.storage.session` cannot hold and which must not stay in memory.
 */
export function summarizeBody(body: WebRequestBody | undefined): string | undefined {
  if (!body) return undefined;
  if (body.formData) {
    const parts: string[] = [];
    for (const [name, values] of Object.entries(body.formData)) {
      const list = Array.isArray(values) ? values : [String(values)];
      for (const v of list) {
        parts.push(`${name}=${isSensitiveField(name) ? REDACTED : cut(String(v), MAX_FIELD_VALUE)}`);
      }
    }
    return parts.join("&");
  }
  if (body.raw && body.raw.length > 0) {
    const file = body.raw.find((p) => typeof p.file === "string");
    if (file) return `<file upload: ${file.file}>`;
    const chunks = body.raw.map((p) => new Uint8Array(p.bytes ?? new ArrayBuffer(0)));
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const prefix = new Uint8Array(Math.min(total, MAX_BODY_BYTES));
    let at = 0;
    for (const c of chunks) {
      if (at >= prefix.length) break;
      const take = Math.min(c.length, prefix.length - at);
      prefix.set(c.subarray(0, take), at);
      at += take;
    }
    if (prefix.subarray(0, 64).includes(0)) return `<binary ${total} bytes>`;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(prefix);
    if (total > MAX_BODY_BYTES) return `${text}…[+${total - MAX_BODY_BYTES} bytes]`;
    return redactJson(text);
  }
  if (body.error) return `<unavailable: ${body.error}>`;
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------------------------

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

function scopeLabel(scope: "active" | Scope): string {
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

export interface FormatListOptions {
  now: number;
  scope: "active" | Scope;
  maxChars?: number;
}

/** The `browser_network_requests` listing: header, one fixed-width line per request, hint footer. */
export function formatEntries(result: NetworkQueryResult, opts: FormatListOptions): string {
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

function formatRow(e: NetworkEntry, now: number, showTab: boolean): string {
  const cols: string[] = [`[${e.id}]`.padEnd(6)];
  if (showTab) cols.push(`tab:${e.tabId}`.padEnd(8));
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

// ---------------------------------------------------------------------------------------------
// The log
// ---------------------------------------------------------------------------------------------

export class NetworkLog {
  private readonly nowFn: () => number;
  /** Insertion-ordered entries per tab; `-1` is the "not attributable to a tab" bucket. */
  private readonly tabs = new Map<number, NetworkEntry[]>();
  /** Entry id (with the redirect-hop suffix) → entry, for O(1) ingest and `id` lookups. */
  private readonly byId = new Map<string, NetworkEntry>();
  /** Chrome requestId → the id of the hop currently open for it. */
  private readonly current = new Map<string, string>();
  /** Chrome requestId → how many hops it has had. */
  private readonly hops = new Map<string, number>();
  private readonly lastActivity = new Map<number, number>();
  private readonly dirty = new Set<number>();
  private since: number;
  private count = 0;

  constructor(opts: { now: () => number }) {
    this.nowFn = opts.now;
    this.since = opts.now();
  }

  /** Fold one `chrome.webRequest` event into the log. Never throws on odd input. */
  ingest(event: WebRequestEvent, d: WebRequestDetails): void {
    if (!d || typeof d.requestId !== "string") return;
    const entry = event === "onBeforeRequest" ? this.openEntry(d) : this.entryFor(d);
    this.lastActivity.set(entry.tabId, Math.max(this.lastActivity.get(entry.tabId) ?? 0, d.timeStamp ?? 0));
    this.dirty.add(entry.tabId);

    switch (event) {
      case "onBeforeRequest":
        if (d.requestBody) entry.requestBody = summarizeBody(d.requestBody);
        break;
      case "onSendHeaders":
        if (d.requestHeaders) entry.requestHeaders = redactHeaders(d.requestHeaders);
        break;
      case "onHeadersReceived":
        if (entry.endedAt !== undefined) break;
        this.applyResponse(entry, d);
        break;
      case "onBeforeRedirect":
        if (entry.endedAt !== undefined) break;
        this.applyResponse(entry, d);
        if (d.redirectUrl) entry.redirectUrl = d.redirectUrl;
        this.end(entry, d);
        break;
      case "onCompleted":
        if (entry.endedAt !== undefined) break;
        this.applyResponse(entry, d);
        if (d.fromCache !== undefined) entry.fromCache = d.fromCache;
        if (d.ip) entry.ip = d.ip;
        this.end(entry, d);
        break;
      case "onErrorOccurred":
        if (entry.endedAt !== undefined) break;
        if (d.error) entry.error = d.error;
        this.end(entry, d);
        break;
    }
  }

  /** Halve every tab (keeping the newest), returning how many entries went. Used on a quota rejection. */
  evictOldest(fraction: number): number {
    let removed = 0;
    for (const [tabId, list] of this.tabs) {
      const keep = Math.ceil(list.length * Math.max(0, Math.min(1, fraction)));
      while (list.length > keep) {
        this.drop(list);
        removed++;
      }
      if (list.length > 0) this.dirty.add(tabId);
      else this.forgetTab(tabId);
    }
    return removed;
  }

  forgetTab(tabId: number): void {
    const list = this.tabs.get(tabId);
    if (list) {
      for (const e of list) this.forget(e);
      this.count -= list.length;
      this.tabs.delete(tabId);
    }
    this.lastActivity.delete(tabId);
    this.dirty.add(tabId);
  }

  /** Drop a scope's entries, returning how many went. `"all"` also restarts `recordingSince`. */
  clear(scope: Scope): number {
    let removed = 0;
    if (scope === "all") {
      for (const tabId of [...this.tabs.keys()]) {
        removed += this.tabs.get(tabId)?.length ?? 0;
        this.forgetTab(tabId);
      }
      this.since = this.nowFn();
      return removed;
    }
    removed = this.tabs.get(scope)?.length ?? 0;
    this.forgetTab(scope);
    return removed;
  }

  /** In-flight requests started within the window — a stream stays "pending" forever otherwise. */
  pending(scope: Scope, opts: { now: number; maxAgeMs?: number }): number {
    const maxAge = opts.maxAgeMs ?? PENDING_WINDOW_MS;
    let n = 0;
    for (const e of this.collect(scope)) {
      if (e.endedAt === undefined && e.startedAt >= opts.now - maxAge) n++;
    }
    return n;
  }

  /** Max `timeStamp` of any event seen for the scope; `0` when nothing was seen. */
  lastActivityAt(scope: Scope): number {
    if (scope !== "all") return this.lastActivity.get(scope) ?? 0;
    let max = 0;
    for (const t of this.lastActivity.values()) max = Math.max(max, t);
    return max;
  }

  /** Tabs touched since the previous call (ingest, eviction or forget), then reset. */
  takeDirty(): Set<number> {
    const out = new Set(this.dirty);
    this.dirty.clear();
    return out;
  }

  /** A tab's stored entries, for the flush; `undefined` when the tab is gone. */
  entriesFor(tabId: number): NetworkEntry[] | undefined {
    const list = this.tabs.get(tabId);
    return list ? list.map((e) => ({ ...e })) : undefined;
  }

  get recordingSince(): number {
    return this.since;
  }

  query(o: QueryOptions): NetworkQueryResult {
    const now = this.nowFn();
    const pending = this.pending(o.tabId, { now });
    if (o.id !== undefined) {
      const found = this.byId.get(o.id);
      if (!found) throw new Error(`No request with id ${o.id}`);
      return { entries: [{ ...found }], total: 1, pending, recordingSince: this.since };
    }

    let list = this.collect(o.tabId);
    if (o.filter) {
      const match = matcher(o.filter);
      list = list.filter((e) => match(e.url));
    }
    if (o.types && o.types.length > 0) {
      const wanted = new Set(o.types.map(normalizeType));
      list = list.filter((e) => wanted.has(e.type));
    }
    if (o.failedOnly) {
      list = list.filter((e) => e.error !== undefined || (e.status !== undefined && e.status >= 400));
    }

    const total = list.length;
    const limit = clampLimit(o.limit);
    const page = list.slice(Math.max(0, total - limit));
    const entries = page.map((e) => (o.includeHeaders ? { ...e } : stripPrivate(e)));
    return { entries, total, pending, recordingSince: this.since };
  }

  toJSON(): NetworkLogBlob {
    const tabs: Record<string, NetworkEntry[]> = {};
    for (const [tabId, list] of this.tabs) tabs[String(tabId)] = list.map((e) => ({ ...e }));
    return { meta: { v: 1, since: this.since }, tabs };
  }

  /**
   * Fold a previously stored blob in **underneath** the live entries: a live entry wins an id
   * collision, because the SW's in-memory copy is the fresher one. Tolerates any garbage.
   */
  merge(blob: unknown): void {
    if (typeof blob !== "object" || blob === null) return;
    const b = blob as Partial<NetworkLogBlob>;
    if (!b.meta || b.meta.v !== 1 || typeof b.meta.since !== "number") return;
    this.since = Math.min(this.since, b.meta.since);
    if (typeof b.tabs !== "object" || b.tabs === null) return;

    for (const [key, stored] of Object.entries(b.tabs)) {
      const tabId = Number(key);
      if (!Number.isInteger(tabId) || !Array.isArray(stored)) continue;
      const list = this.listFor(tabId);
      let added = false;
      for (const raw of stored) {
        if (!raw || typeof raw !== "object") continue;
        const e = raw as NetworkEntry;
        if (typeof e.id !== "string" || typeof e.startedAt !== "number") continue;
        if (this.byId.has(e.id)) continue;
        const entry: NetworkEntry = { ...e, tabId };
        list.push(entry);
        this.byId.set(entry.id, entry);
        this.count++;
        added = true;
        this.lastActivity.set(tabId, Math.max(this.lastActivity.get(tabId) ?? 0, entry.endedAt ?? entry.startedAt));
      }
      if (added) {
        list.sort((x, y) => x.startedAt - y.startedAt);
        this.enforceCaps(tabId);
      }
    }
  }

  // ------------------------------------------------------------------------------------------

  private openEntry(d: WebRequestDetails): NetworkEntry {
    const seen = this.hops.get(d.requestId);
    const hop = (seen ?? 0) + 1;
    this.hops.set(d.requestId, hop);
    const id = hop === 1 ? d.requestId : `${d.requestId}:${hop}`;
    const existing = this.byId.get(id);
    if (existing) return existing;
    return this.create(id, d);
  }

  private entryFor(d: WebRequestDetails): NetworkEntry {
    const id = this.current.get(d.requestId);
    const existing = id === undefined ? undefined : this.byId.get(id);
    if (existing) return existing;
    // Best effort: the SW restarted mid-request, so the opening event was lost. Every event carries
    // enough to build a usable entry — never drop one.
    this.hops.set(d.requestId, this.hops.get(d.requestId) ?? 1);
    return this.create(d.requestId, d);
  }

  private create(id: string, d: WebRequestDetails): NetworkEntry {
    const entry: NetworkEntry = {
      id,
      tabId: typeof d.tabId === "number" ? d.tabId : -1,
      url: d.url,
      method: d.method,
      type: d.type,
      startedAt: d.timeStamp,
    };
    if (d.initiator) entry.initiator = d.initiator;
    this.byId.set(id, entry);
    this.current.set(d.requestId, id);
    this.listFor(entry.tabId).push(entry);
    this.count++;
    this.enforceCaps(entry.tabId);
    return entry;
  }

  private applyResponse(entry: NetworkEntry, d: WebRequestDetails): void {
    if (d.statusCode !== undefined) entry.status = d.statusCode;
    if (d.statusLine) entry.statusLine = d.statusLine;
    if (d.responseHeaders && !entry.responseHeaders) {
      entry.responseHeaders = redactHeaders(d.responseHeaders);
      const len = Number(entry.responseHeaders["content-length"]);
      if (Number.isFinite(len)) entry.responseSize = len;
    }
  }

  private end(entry: NetworkEntry, d: WebRequestDetails): void {
    entry.endedAt = d.timeStamp;
    entry.durationMs = Math.max(0, d.timeStamp - entry.startedAt);
  }

  private listFor(tabId: number): NetworkEntry[] {
    let list = this.tabs.get(tabId);
    if (!list) {
      list = [];
      this.tabs.set(tabId, list);
    }
    return list;
  }

  private collect(scope: Scope): NetworkEntry[] {
    if (scope !== "all") return [...(this.tabs.get(scope) ?? [])];
    const all: NetworkEntry[] = [];
    for (const list of this.tabs.values()) all.push(...list);
    return all.sort((a, b) => a.startedAt - b.startedAt);
  }

  private enforceCaps(tabId: number): void {
    const list = this.tabs.get(tabId);
    if (list) {
      while (list.length > PER_TAB_CAP) {
        this.drop(list);
        this.dirty.add(tabId);
      }
    }
    // Fair eviction: the tab with the most entries pays, never the quiet tab the agent asked about.
    while (this.count > TOTAL_CAP) {
      let biggest: number | undefined;
      let size = 0;
      for (const [id, l] of this.tabs) {
        if (l.length > size) {
          size = l.length;
          biggest = id;
        }
      }
      if (biggest === undefined || size === 0) break;
      this.drop(this.tabs.get(biggest)!);
      this.dirty.add(biggest);
    }
  }

  /** Remove a list's oldest entry and its index/count bookkeeping. */
  private drop(list: NetworkEntry[]): void {
    const gone = list.shift();
    if (!gone) return;
    this.forget(gone);
    this.count--;
  }

  private forget(e: NetworkEntry): void {
    this.byId.delete(e.id);
    const bare = e.id.split(":")[0];
    if (this.current.get(bare) === e.id) {
      this.current.delete(bare);
      this.hops.delete(bare);
    }
  }
}

function clampLimit(limit?: number): number {
  const n = Number(limit);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

/** Headers and the body are only handed out when asked for. */
function stripPrivate(e: NetworkEntry): NetworkEntry {
  const copy = { ...e };
  delete copy.requestHeaders;
  delete copy.responseHeaders;
  delete copy.requestBody;
  return copy;
}

/** `/pattern/flags` → regex; anything else → case-insensitive substring. */
function matcher(filter: string): (url: string) => boolean {
  const last = filter.lastIndexOf("/");
  if (filter.startsWith("/") && last > 0) {
    const source = filter.slice(1, last);
    const flags = filter.slice(last + 1);
    let re: RegExp;
    try {
      re = new RegExp(source, flags);
    } catch (err) {
      throw new Error(`Invalid regex filter: ${filter} — ${(err as Error).message}`);
    }
    return (url) => re.test(url);
  }
  const needle = filter.toLowerCase();
  return (url) => url.toLowerCase().includes(needle);
}

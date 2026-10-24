// recipes/s9-rules.ts — the pure rules of Step 9's live wave (Run 13; docs/e2e-test-plan.md §4.20, wave sheet
// docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md). Written 2026-10-24 by the S4 prep builder,
// before the Step 9 build was loaded or any SAFE row ran. recipes/s9.ts prints what these functions decide;
// recipes/test/s9-rules.test.ts dry-runs them and checks every expected text below against the committed product
// constants it was copied from (a drift test: a product wording change fails the test, never silently the row).
//
// Rules every s9 helper keeps (LESSONS; CLAUDE.md "never log a URL"): a URL is printed only when it is a fixture URL
// (`http://localhost:8080|8081|8083/…`), `chrome://extensions…` or this extension's own `chrome-extension://<id>/…`;
// a title only when it is a fixture title; never the token; never a block-list pattern read from Chrome (the
// patterns the wave itself sets are fixture names: `localhost:8081`, `bank.example`).
import { createHash } from "node:crypto";

// ── Fixtures ──────────────────────────────────────────────────────────────────────────────────────────────

export const FIXTURE_8080 = "http://localhost:8080";
/** Served like 8080 (same directory); blocked by the wave's test pattern `localhost:8081`. */
export const FIXTURE_8081 = "http://localhost:8081";
/** recipes/s9-redirect.py: every GET → 302 to the same path on 8081 (8082 is held by a Windows process). */
export const REDIRECT_8083 = "http://localhost:8083";
export const PAGE = "e2e-playground.html";
export const FIXTURE_TITLE = "Agent Bridge E2E Playground";
/** The title `s9.ts setup` gives the driver window's fixture tab, so UIA can select that tab by name. */
export const W_TITLE = "S9 W human tab";
/** The wave's test patterns (fixture or reserved names only). */
export const PATTERN_8081 = "localhost:8081";
export const PATTERN_BANK = "bank.example";

export function s9Url(origin: string, marker: string, page = PAGE): string {
  return `${origin}/${page}?s9=${encodeURIComponent(marker)}`;
}

const FIXTURE_ORIGINS = [FIXTURE_8080, FIXTURE_8081, REDIRECT_8083];

export function isFixtureUrl(url: unknown): boolean {
  return typeof url === "string" && FIXTURE_ORIGINS.some((o) => url === o || url.startsWith(`${o}/`));
}

/**
 * An unpacked extension's id: sha256 of its absolute path as UTF-16LE, first 16 bytes, each nibble as a–p
 * (Chrome's rule; recipes/reload-extension.ps1 `Get-UnpackedId`).
 */
export function extensionIdFromPath(absPath: string): string {
  const hash = createHash("sha256").update(Buffer.from(absPath, "utf16le")).digest();
  let id = "";
  for (const b of hash.subarray(0, 16)) id += String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15));
  return id;
}

export function ownOptionsUrl(id: string): string {
  return `chrome-extension://${id}/options.html`;
}

/** A URL as an s9 line may print it: fixture, `chrome://extensions…`, or this extension's own pages; else withheld. */
export function showUrl(url: unknown, ownId = ""): string {
  if (typeof url !== "string") return String(url);
  if (url === "") return '""';
  if (isFixtureUrl(url)) return url;
  if (url.startsWith("chrome://extensions")) return url;
  if (ownId !== "" && url.startsWith(`chrome-extension://${ownId}/`)) return url;
  return "<non-fixture url withheld>";
}

/**
 * A message as an s9 line may print it: every `scheme://…` run that `showUrl` would withhold is replaced. Refusal
 * messages carry no URL by contract (decisions.md · 2026-10-24 · S1: The refusal messages (#158)); other errors
 * (Chrome's raw text inside `RESTRICTED_URL`, a navigation error) may.
 */
export function scrubMessage(msg: string, ownId = ""): string {
  return msg.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'`)<>]*/gi, (u) => showUrl(u, ownId));
}

// ── Expected texts, copied from the committed code (the drift test re-checks each against its source) ────────

export const EXPECT = Object.freeze({
  // extension/src/safety.ts (#158, #133)
  disarmedAll:
    "The user has turned the bridge off in Chrome, so every page call is refused. Stop and ask the user to turn it back on; do not retry.",
  disarmedEvaluate:
    "The user has turned JavaScript off for the bridge in Chrome (browser_evaluate and script URLs are refused). Every other tool still works; ask the user before relying on browser_evaluate.",
  blockedTab: "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user.",
  ownPage: "This tab shows one of the bridge extension's own pages, which the bridge never reads or acts on.",
  blockedUrl: "That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user.",
  extensionUrl: "The bridge never opens extension pages.",
  // extension/src/tabs.ts CAPTURE_MOVED_MESSAGE (#177)
  captureMoved: "The window showed another tab when the screenshot was taken, so the image was discarded — retry",
  // sdk/src/error.ts safetyRefusalLine (#164), as the MCP prints it (one error text item)
  mcpDisarmedAll: "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it back on; do not retry.",
  mcpDisarmedEvaluate:
    "DISARMED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.",
  mcpDomainBlocked:
    "DOMAIN_BLOCKED: the user has blocked this site for the bridge in Chrome. Stop and ask the user; do not retry, and do not try to reach the site another way.",
  // extension/src/badge.ts BADGE_TITLES (#143, #181)
  titleOff: "Chrome Agent Bridge — OFF: agents are refused (click to turn on)",
  titleJsOff: "Chrome Agent Bridge — armed, JavaScript off (click to turn off)",
  titleArmed: "Chrome Agent Bridge — armed (click to turn off)",
  // extension/src/badge.ts LOG_LINES (the worker console, one line per press)
  logDisarmed: "safety: disarmed by the user",
  logArmed: "safety: armed by the user",
  logIgnored: "safety: re-arm ignored (within 1 s of a disarm)",
  // extension/src/options-model.ts optionsStatus / analyzeBlockList / INVALID_LINE_REASON (#184, #186)
  optArmed: "Bridge armed.",
  optJsOff: "Bridge armed; JavaScript (browser_evaluate) off.",
  optOff: "Bridge OFF: agents are refused.",
  optSummaryZero: "0 blocked sites.",
  optSummaryOne: "1 blocked site.",
  optSummaryOneInvalid: "1 blocked site. 1 invalid line is not counted (marked below).",
  optInvalidLine2:
    "Line 2: “not a host!” — not a site pattern: write a host (bank.example), *.host for its subdomains only, host:port, an IP address, or paste an http(s) address",
  // mcp/src/tools/registry.ts hiddenLabel (#134)
  mcpHiddenDisarmed: "(hidden: the bridge is off)",
  mcpHiddenBlocked: "(hidden: blocked site)",
});

/** `browser_status`'s second text item (mcp/src/tools/registry.ts `safetyStatusLine`, #132, #162). */
export function safetyLine(s: { armed: boolean; evaluate: boolean; blockedCount: number } | null): string {
  if (s === null) return "Safety: not reported (reload the extension)";
  const n = s.blockedCount;
  return `Safety: ${s.armed ? "armed" : "DISARMED by the user"} · JavaScript ${s.evaluate ? "on" : "off"} · ${n} blocked site${n === 1 ? "" : "s"}`;
}

/** The daemon's log line on a safety change (daemon/src/intercept.ts `safetyLogLine`). */
export function daemonSafetyLogLine(s: { armed: boolean; evaluate: boolean; blockedCount: number }): string {
  return `safety state: armed=${s.armed} evaluate=${s.evaluate} blocked=${s.blockedCount}`;
}

/** sha256 of the empty string: the block-list text expected as found (no safety key was ever written). */
export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// ── Outcomes and expectations ─────────────────────────────────────────────────────────────────────────────

export interface Outcome {
  ok: boolean;
  code?: string;
  message?: string;
  data?: unknown;
  ms: number;
}

export type Expect =
  | "ok"
  | "record"
  | "DISARMED:all"
  | "DISARMED:evaluate"
  | "BLOCKED:tab"
  | "BLOCKED:url"
  | "BLOCKED:own"
  | "BLOCKED:ext"
  | "BLOCKED:tab|url"
  | `code:${string}`;

const FIXED_EXPECTS = new Set([
  "ok",
  "record",
  "DISARMED:all",
  "DISARMED:evaluate",
  "BLOCKED:tab",
  "BLOCKED:url",
  "BLOCKED:own",
  "BLOCKED:ext",
  "BLOCKED:tab|url",
]);

export function parseExpect(s: string): Expect {
  if (FIXED_EXPECTS.has(s)) return s as Expect;
  if (/^code:[A-Z_]+$/.test(s)) return s as Expect;
  throw new Error(`--expect: unknown expectation "${s}" (ok, record, DISARMED:all|evaluate, BLOCKED:tab|url|own|ext|tab|url, code:<CODE>)`);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface Judged {
  pass: boolean;
  why: string;
}

/** The pass rule of one call against its pre-written expectation. `record` always passes (it is not a check). */
export function judge(o: Outcome, e: Expect): Judged {
  if (e === "record") return { pass: true, why: "record, not a check" };
  if (e === "ok") return o.ok ? { pass: true, why: "ok" } : { pass: false, why: `expected ok, got ${o.code}` };
  if (o.ok) return { pass: false, why: `expected ${e}, got ok` };
  if (e.startsWith("code:")) {
    const want = e.slice(5);
    return o.code === want ? { pass: true, why: `code ${want}` } : { pass: false, why: `expected code ${want}, got ${o.code}` };
  }
  const blocked = (msgs: string[]): Judged => {
    if (o.code !== "DOMAIN_BLOCKED") return { pass: false, why: `expected DOMAIN_BLOCKED, got ${o.code}` };
    if (!msgs.includes(o.message ?? "")) return { pass: false, why: "DOMAIN_BLOCKED with another message" };
    if (o.data !== undefined) return { pass: false, why: "DOMAIN_BLOCKED carries data (it must carry none, #158)" };
    return { pass: true, why: "DOMAIN_BLOCKED, exact message, no data" };
  };
  switch (e) {
    case "DISARMED:all":
    case "DISARMED:evaluate": {
      const scope = e === "DISARMED:all" ? "all" : "evaluate";
      const msg = scope === "all" ? EXPECT.disarmedAll : EXPECT.disarmedEvaluate;
      if (o.code !== "DISARMED") return { pass: false, why: `expected DISARMED, got ${o.code}` };
      if (o.message !== msg) return { pass: false, why: `DISARMED with another message (scope ${scope} expected)` };
      if (!sameJson(o.data, { scope })) return { pass: false, why: `DISARMED data ${JSON.stringify(o.data)}, expected {"scope":"${scope}"}` };
      return { pass: true, why: `DISARMED, exact message, data {"scope":"${scope}"}` };
    }
    case "BLOCKED:tab":
      return blocked([EXPECT.blockedTab]);
    case "BLOCKED:url":
      return blocked([EXPECT.blockedUrl]);
    case "BLOCKED:own":
      return blocked([EXPECT.ownPage]);
    case "BLOCKED:ext":
      return blocked([EXPECT.extensionUrl]);
    case "BLOCKED:tab|url":
      return blocked([EXPECT.blockedTab, EXPECT.blockedUrl]);
  }
  return { pass: false, why: `unhandled expectation ${e}` };
}

/** One call as a ROW line: `ROW <id> <step> <ok|CODE> <message> [data <json>] (<ms> ms)`; URLs scrubbed. */
export function rowLine(id: string, step: string, o: Outcome, ownId = "", okDetail = ""): string {
  if (o.ok) return `ROW ${id} ${step} ok${okDetail ? ` ${scrubMessage(okDetail, ownId)}` : ""} (${o.ms} ms)`;
  const data = o.data === undefined ? "" : ` data ${scrubMessage(JSON.stringify(o.data), ownId)}`;
  return `ROW ${id} ${step} ${o.code ?? "?"} ${scrubMessage(o.message ?? "", ownId)}${data} (${o.ms} ms)`;
}

export function checkLine(id: string, step: string, j: Judged): string {
  return `CHECK ${id} ${step} ${j.pass ? "PASS" : "FAIL"} — ${j.why}`;
}

// ── listTabs, daemon.status, network: counts only ────────────────────────────────────────────────────────

export interface TabRow {
  id?: number;
  tab?: string;
  title?: string;
  url?: string;
  hidden?: string;
  current?: boolean;
  owner?: string;
  windowId?: number;
}

export interface TabsSummary {
  total: number;
  hiddenDisarmed: number;
  hiddenBlocked: number;
  withTitle: number;
  withUrl: number;
  url8081: number;
}

export function summarizeTabs(rows: TabRow[]): TabsSummary {
  const s: TabsSummary = { total: rows.length, hiddenDisarmed: 0, hiddenBlocked: 0, withTitle: 0, withUrl: 0, url8081: 0 };
  for (const r of rows) {
    if (r.hidden === "disarmed") s.hiddenDisarmed++;
    if (r.hidden === "blocked") s.hiddenBlocked++;
    if (typeof r.title === "string" && r.title !== "") s.withTitle++;
    if (typeof r.url === "string" && r.url !== "") s.withUrl++;
    if (typeof r.url === "string" && r.url.includes("//localhost:8081")) s.url8081++;
  }
  return s;
}

export function tabsLine(s: TabsSummary): string {
  return `tabs total=${s.total} hidden(disarmed)=${s.hiddenDisarmed} hidden(blocked)=${s.hiddenBlocked} withTitle=${s.withTitle} withUrl=${s.withUrl} url8081=${s.url8081}`;
}

export interface SafetyTuple {
  armed: boolean;
  evaluate: boolean;
  blockedCount: number;
}

export function safetyTupleLine(s: SafetyTuple | null | undefined): string {
  if (s === null || s === undefined) return "safety null";
  return `safety armed=${s.armed} evaluate=${s.evaluate} blockedCount=${s.blockedCount}`;
}

export function isSafetyTuple(v: unknown): v is SafetyTuple {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.armed === "boolean" && typeof o.evaluate === "boolean" && typeof o.blockedCount === "number";
}

export interface StatusSummary {
  safety: SafetyTuple | null;
  extensionConnected: boolean;
  rows: number;
  rowsWithUrl: number;
  rowsWith8081: number;
}

export function summarizeStatus(status: unknown): StatusSummary {
  const s = (typeof status === "object" && status !== null ? status : {}) as Record<string, unknown>;
  const tabs = Array.isArray(s.tabs) ? (s.tabs as Array<Record<string, unknown>>) : [];
  return {
    safety: isSafetyTuple(s.safety) ? { armed: s.safety.armed, evaluate: s.safety.evaluate, blockedCount: s.safety.blockedCount } : null,
    extensionConnected: s.extensionConnected === true,
    rows: tabs.length,
    rowsWithUrl: tabs.filter((t) => typeof t.url === "string" && t.url !== "").length,
    rowsWith8081: tabs.filter((t) => typeof t.url === "string" && t.url.includes("//localhost:8081")).length,
  };
}

export function statusLine(s: StatusSummary): string {
  return `${safetyTupleLine(s.safety)} extensionConnected=${s.extensionConnected} rows=${s.rows} rowsWithUrl=${s.rowsWithUrl} rowsWith8081=${s.rowsWith8081}`;
}

export interface NetEntry {
  url?: string;
  redirectUrl?: string;
  initiator?: string;
  tabId?: number;
}

export interface NetSummary {
  total: number;
  returned: number;
  any8081: number;
  tabMinusOne: number;
}

/** Counts over a `networkRequests` result: entries naming `localhost:8081` in url, redirectUrl or initiator. */
export function summarizeNetwork(result: unknown): NetSummary {
  const r = (typeof result === "object" && result !== null ? result : {}) as Record<string, unknown>;
  const entries = Array.isArray(r.entries) ? (r.entries as NetEntry[]) : [];
  const hit = (v: unknown): boolean => typeof v === "string" && v.includes("//localhost:8081");
  return {
    total: typeof r.total === "number" ? r.total : entries.length,
    returned: entries.length,
    any8081: entries.filter((e) => hit(e.url) || hit(e.redirectUrl) || hit(e.initiator)).length,
    tabMinusOne: entries.filter((e) => e.tabId === -1).length,
  };
}

export function networkLine(s: NetSummary): string {
  return `network total=${s.total} returned=${s.returned} any8081=${s.any8081} tabMinusOne=${s.tabMinusOne}`;
}

/** The snapshot facts a row may print: element count and the fixture's counter button (never other names). */
export function snapshotFacts(result: unknown): { elements: number; counter: string | null } {
  const r = (typeof result === "object" && result !== null ? result : {}) as Record<string, unknown>;
  const els = Array.isArray(r.elements) ? (r.elements as Array<Record<string, unknown>>) : [];
  const c = els.find((e) => e.role === "button" && typeof e.name === "string" && e.name.startsWith("Click counter: "));
  return { elements: els.length, counter: c ? String(c.name) : null };
}

// ── Timing ───────────────────────────────────────────────────────────────────────────────────────────────

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** `b - a` in ms for two ISO times (NaN when either does not parse). */
export function deltaMs(aIso: string, bIso: string): number {
  return Date.parse(bIso) - Date.parse(aIso);
}

export interface Verdict {
  pass: boolean;
  notDiscriminating: boolean;
  why: string[];
}

/**
 * SAFE-4 (a) / SAFE-4c: a worker-side wait ended `DISARMED {scope:"all"}` within `maxMs` of the press; a press that
 * came after the reply (or none) makes the row not discriminating.
 */
export function waitDisarmVerdict(o: Outcome, replyIso: string, pressIso: string | null, maxMs = 300): Verdict {
  const why: string[] = [];
  if (pressIso === null) return { pass: false, notDiscriminating: true, why: ["no press time recorded"] };
  const d = deltaMs(pressIso, replyIso);
  if (!(d >= 0)) return { pass: false, notDiscriminating: true, why: [`the reply came ${-d} ms before the press`] };
  const j = judge(o, "DISARMED:all");
  if (!j.pass) why.push(j.why);
  if (d > maxMs) why.push(`reply ${d} ms after the press (> ${maxMs} ms)`);
  return { pass: why.length === 0, notDiscriminating: false, why: why.length ? why : [`DISARMED ${d} ms after the press`] };
}

/**
 * SAFE-4 (b): a trusted `type` of `n` characters disarmed mid-way. Pass: `DISARMED {scope:"all"}` (not
 * `DEBUGGER_CANCELLED`) and 0 < typed < n. Typed 0 or n (or an `ok` reply) → not discriminating (the press missed the
 * typing window).
 */
export function typeVerdict(o: Outcome, typed: number | null, n: number): Verdict {
  if (typed === null) return { pass: false, notDiscriminating: true, why: ["typed length not read"] };
  if (o.ok || typed === 0 || typed >= n) {
    return { pass: false, notDiscriminating: true, why: [`reply ${o.ok ? "ok" : o.code}, typed ${typed} of ${n}: the press missed the typing`] };
  }
  const j = judge(o, "DISARMED:all");
  return j.pass
    ? { pass: true, notDiscriminating: false, why: [`DISARMED mid-way: typed ${typed} of ${n}`] }
    : { pass: false, notDiscriminating: false, why: [j.why, `typed ${typed} of ${n}`] };
}

/**
 * SAFE-4b: B's queued screenshot is refused `DISARMED {scope:"all"}` with no image, and B's tab never became
 * visible after the call started. The press must come before B's reply, else not discriminating.
 */
export function lockVerdict(b: Outcome, bReplyIso: string, pressIso: string | null, bTabVisibleAfterStart: boolean | null): Verdict {
  if (pressIso === null) return { pass: false, notDiscriminating: true, why: ["no press time recorded"] };
  if (!(deltaMs(pressIso, bReplyIso) >= 0)) return { pass: false, notDiscriminating: true, why: ["B replied before the press"] };
  const why: string[] = [];
  const j = judge(b, "DISARMED:all");
  if (!j.pass) why.push(`B: ${j.why}`);
  if (bTabVisibleAfterStart === null) why.push("B's tab visibility log not read");
  else if (bTabVisibleAfterStart) why.push("B's tab became visible (the window switched to it)");
  return { pass: why.length === 0, notDiscriminating: false, why: why.length ? why : ["B refused DISARMED, its tab never shown"] };
}

/** A visibility log `[[state, epochMs, kind], …]`: did the tab read `visible` at or after `sinceMs`? */
export function visibleSince(log: unknown, sinceMs: number): boolean | null {
  if (!Array.isArray(log)) return null;
  return log.some((e) => Array.isArray(e) && e[0] === "visible" && typeof e[1] === "number" && e[1] >= sinceMs);
}

// ── Log and evidence scans: counts only ───────────────────────────────────────────────────────────────────

export interface ScanCounts {
  /** Every `://`. */
  scheme: number;
  /** `://` occurrences that are a fixture origin, `chrome://extensions` or this extension's own pages. */
  schemeFixture: number;
  schemeOther: number;
  token: number;
  /** `localhost:8081`, `:8083`, `bank.example` (the wave's test patterns), and the raw `8083` count. */
  pattern8081: number;
  colon8083: number;
  raw8083: number;
  bank: number;
}

function count(hay: string, needle: string): number {
  if (needle === "") return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

/** Counts in `text`; the token is never printed (an empty token counts 0). */
export function scanCounts(text: string, token: string, ownId = ""): ScanCounts {
  let schemeFixture = 0;
  let scheme = 0;
  const re = /([a-z][a-z0-9+.-]*):\/\/[^\s"'`)<>]*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    scheme++;
    if (showUrl(m[0], ownId) !== "<non-fixture url withheld>") schemeFixture++;
  }
  // A `://` not preceded by a scheme the regex takes (e.g. a bare "://x") still counts as other.
  const raw = count(text, "://");
  if (raw > scheme) scheme = raw;
  return {
    scheme,
    schemeFixture,
    schemeOther: scheme - schemeFixture,
    token: count(text, token),
    pattern8081: count(text, PATTERN_8081),
    colon8083: count(text, ":8083"),
    raw8083: count(text, "8083"),
    bank: count(text, PATTERN_BANK),
  };
}

export function scanLine(what: string, c: ScanCounts): string {
  return `SCAN ${what}: ://=${c.scheme} (fixture ${c.schemeFixture}, other ${c.schemeOther}) token=${c.token} localhost:8081=${c.pattern8081} :8083=${c.colon8083} (raw 8083 ${c.raw8083}) bank.example=${c.bank}`;
}

/**
 * Pass rules (pre-registered, SAFE-10): `daemon` — the daemon.log lines of the wave hold no `://` at all, no token,
 * no test pattern, no `:8083`; `committed` — a file to be committed holds no token and no non-fixture `://`
 * (fixture URLs and the test patterns are the wave's own names). The worker console is `consoleVerdict`.
 */
export function scanVerdict(c: ScanCounts, mode: "daemon" | "committed"): Judged {
  if (mode === "committed") {
    const bad = [c.token ? `token ${c.token}` : "", c.schemeOther ? `non-fixture :// ${c.schemeOther}` : ""].filter(Boolean);
    return bad.length ? { pass: false, why: bad.join(", ") } : { pass: true, why: "no token, no non-fixture ://" };
  }
  const bad = [
    c.scheme ? `:// ${c.scheme}` : "",
    c.token ? `token ${c.token}` : "",
    c.pattern8081 ? `localhost:8081 ${c.pattern8081}` : "",
    c.colon8083 ? `:8083 ${c.colon8083}` : "",
    c.bank ? `bank.example ${c.bank}` : "",
  ].filter(Boolean);
  return bad.length ? { pass: false, why: bad.join(", ") } : { pass: true, why: "all counts 0" };
}

/**
 * A line of the bridge's own logging: every `console.*` call in extension/src starts its text with `[bridge]` or
 * `safety: ` (grep 2026-10-24, prep fixer r1: the `[bridge] …` calls in sw.ts, debugger.ts, network-state.ts,
 * handlers/{actions,download,evaluate}.ts, and badge.ts's `console.log(toggleLogLine(r))`, whose LOG_LINES all start
 * `safety: `). How DevTools exposes a console row to UIA is unmeasured (a repeat count, a timestamp or a source link
 * may come first), so the prefix is matched anywhere in the line, not only at its start.
 */
export function isBridgeLogLine(l: string): boolean {
  return l.includes("[bridge]") || /(^|[^A-Za-z])safety: /.test(l);
}

/**
 * The worker console capture (SAFE-10, second half): the lines with a hit (`://`, a test pattern, `:8083`), which of
 * them are the bridge's own log lines, and the press lines (`safety: …`, the positive control). Chrome's own entries
 * in that console (e.g. a failed fetch's `net::ERR_…` report) are not bridge logging; the pre-registered rule fails
 * on a bridge hit line, a non-fixture `://` or the token.
 */
export function consoleHits(text: string): { hitLines: string[]; bridgeHitLines: string[]; pressLines: string[] } {
  const lines = text.split(/\r?\n/);
  const hitLines = lines.filter((l) => l.includes("://") || l.includes(PATTERN_8081) || l.includes(":8083") || l.includes(PATTERN_BANK));
  const bridgeHitLines = hitLines.filter(isBridgeLogLine);
  const pressLines = lines.filter((l) => /(^|[^A-Za-z])safety: /.test(l)).map((l) => l.trim());
  return { hitLines, bridgeHitLines, pressLines };
}

/**
 * The console verdict. A failure (token, non-fixture `://`, a bridge line with a URL or pattern) is a FAIL whatever
 * else holds; otherwise the capture must show the positive control — at least one `safety: disarmed by the user`
 * line (SAFE-1 presses the button before this read) — or the check is NOT MEASURED, never a pass: an empty or
 * unreadable capture would otherwise pass vacuously (prep fixer r1, S4-prep-verifier finding 6).
 */
export function consoleVerdict(c: ScanCounts, h: { bridgeHitLines: string[]; pressLines: string[] }): Judged & { notMeasured?: boolean } {
  const bad = [
    c.token ? `token ${c.token}` : "",
    c.schemeOther ? `non-fixture :// ${c.schemeOther}` : "",
    h.bridgeHitLines.length ? `bridge log lines with a URL or pattern ${h.bridgeHitLines.length}` : "",
  ].filter(Boolean);
  if (bad.length) return { pass: false, why: bad.join(", ") };
  const control = h.pressLines.filter((l) => l.includes(EXPECT.logDisarmed)).length;
  if (control === 0) return { pass: false, notMeasured: true, why: `no "${EXPECT.logDisarmed}" line in the capture (the positive control), so the bridge's lines were not seen` };
  return { pass: true, why: `no token, no non-fixture ://, no bridge line with a URL or pattern; positive control: ${control} "${EXPECT.logDisarmed}" line(s)` };
}

/** daemon.log lines (`<YYYY-MM-DDTHH:MM:SSZ> <msg>`) stamped at or after `sinceIso` (whole seconds, floor). */
export function logLinesSince(lines: string[], sinceIso: string): string[] {
  const since = Math.floor(Date.parse(sinceIso) / 1000) * 1000;
  return lines.filter((l) => {
    const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ) /.exec(l);
    return m !== null && Date.parse(m[1]) >= since;
  });
}

// ── MCP actors (recipes/s9-actor.ts) ──────────────────────────────────────────────────────────────────────

/** The MCP config an actor gets: only `chrome-agent-bridge` (with `--strict-mcp-config`). No token in it. */
export function mcpConfig(nodePath: string, mcpEntry: string): { mcpServers: Record<string, { command: string; args: string[] }> } {
  return { mcpServers: { "chrome-agent-bridge": { command: nodePath, args: [mcpEntry] } } };
}

export function actorArgs(model: string, configPath: string): string[] {
  return [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    model,
    "--strict-mcp-config",
    "--mcp-config",
    configPath,
    "--allowedTools",
    "mcp__chrome-agent-bridge",
  ];
}

/** A tool_result's content as delivered: the item count, each item's type, and the text items. */
export function toolResultItems(content: unknown): { count: number; types: string[]; texts: string[] } {
  if (typeof content === "string") return { count: 1, types: ["string"], texts: [content] };
  if (!Array.isArray(content)) return { count: 0, types: [], texts: [] };
  const types = content.map((c) => (typeof c === "object" && c !== null ? String((c as Record<string, unknown>).type) : typeof c));
  const texts = content
    .filter((c) => typeof c === "object" && c !== null && (c as Record<string, unknown>).type === "text")
    .map((c) => String((c as Record<string, unknown>).text));
  return { count: content.length, types, texts };
}

/**
 * #162's live check: where the `Safety:` line reached the model. `item` — a text item equal to the line (the second
 * item as built); `line` — a whole line of a flattened text; `absent` — not delivered (#162's Revisit-if).
 */
export function safetyDelivery(content: unknown, expected: string): { where: "item" | "line" | "absent"; index: number } {
  const { texts } = toolResultItems(content);
  const i = texts.findIndex((t) => t === expected);
  if (i >= 0) return { where: "item", index: i };
  for (let k = 0; k < texts.length; k++) if (texts[k].split("\n").includes(expected)) return { where: "line", index: k };
  return { where: "absent", index: -1 };
}

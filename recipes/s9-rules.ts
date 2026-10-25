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

/**
 * Run 14's console verdict (R14-LOGS; Step 10 phase doc S1.6 as written; prep fixer r1, S1-prep-verifier F2, ruled
 * by the step agent before any measurement): every count 0 — the token, a non-fixture `://`, `localhost:8081`,
 * `:8083`, `bank.example` — WHOEVER wrote the line (a Chrome-owned entry naming the test pattern FAILS too; Run 13's
 * `consoleVerdict` above tolerated Chrome's own lines and stays as Run 13's rule). The positive control is as there:
 * no `safety: disarmed by the user` line → NOT MEASURED, never a pass; a failure wins over it.
 */
export function consoleVerdictS16(c: ScanCounts, h: { pressLines: string[] }): Judged & { notMeasured?: boolean } {
  const bad = [
    c.token ? `token ${c.token}` : "",
    c.schemeOther ? `non-fixture :// ${c.schemeOther}` : "",
    c.pattern8081 ? `localhost:8081 ${c.pattern8081}` : "",
    c.colon8083 ? `:8083 ${c.colon8083}` : "",
    c.bank ? `bank.example ${c.bank}` : "",
  ].filter(Boolean);
  if (bad.length) return { pass: false, why: `${bad.join(", ")} (S1.6: 0 whoever wrote the line)` };
  const control = h.pressLines.filter((l) => l.includes(EXPECT.logDisarmed)).length;
  if (control === 0) return { pass: false, notMeasured: true, why: `no "${EXPECT.logDisarmed}" line in the capture (the positive control), so the bridge's lines were not seen` };
  return { pass: true, why: `all S1.6 counts 0 (token, non-fixture ://, localhost:8081, :8083, bank.example); positive control: ${control} "${EXPECT.logDisarmed}" line(s)` };
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

/**
 * The MCP config an actor gets: only `chrome-agent-bridge` (with `--strict-mcp-config`). No token in it.
 * S7 wave fixer 1 (Run 15's PP1 leg, N3): an optional `failuresDir` sets the server's `BRIDGE_FAILURES_DIR` in the
 * config's `env`, so the actor's failure-report PNGs land in a folder of the leg's own; without it the config is
 * unchanged.
 */
export function mcpConfig(nodePath: string, mcpEntry: string, failuresDir?: string): { mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> } {
  if (failuresDir) return { mcpServers: { "chrome-agent-bridge": { command: nodePath, args: [mcpEntry], env: { BRIDGE_FAILURES_DIR: failuresDir } } } };
  return { mcpServers: { "chrome-agent-bridge": { command: nodePath, args: [mcpEntry] } } };
}

/**
 * The environment of an actor's `claude -p` (S7 wave fixer 2, 2026-10-25; Run 15 Return 2). With `noToolSearch`,
 * `ENABLE_TOOL_SEARCH=false`: Claude Code 2.1.310 defers MCP tools behind its `ToolSearch` tool, so an actor's first
 * turn called `ToolSearch` before the bridge tool (MCPF-1, CAP-1); the installed binary's own text names
 * `ENABLE_TOOL_SEARCH` `false` as the way to turn tool search off, and an offline probe (a dummy MCP server, the
 * actors' flags) showed `ToolSearch` gone from the init tool list and the dummy tool called first
 * (`S7-wave-fixer2.md` §2). Opt-in (`s9-actor.ts start <name> --no-tool-search`): without it the environment is the
 * parent's, unchanged (Run 13 / Run 14 behaviour), and an inherited `ENABLE_TOOL_SEARCH` is left as it is.
 */
export function actorEnv(base: NodeJS.ProcessEnv, noToolSearch: boolean): NodeJS.ProcessEnv {
  return noToolSearch ? { ...base, ENABLE_TOOL_SEARCH: "false" } : base;
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

// ── Run 14 (Step 10 S1; docs/e2e-test-plan.md §4.21) ──────────────────────────────────────────────────────
// Added 2026-10-25 by the Step 10 S1 prep builder, before any R14 row ran (decisions.md #194, #196, #197; phase doc
// 0.10). Every rule below is pure and dry-run by recipes/test/s9-rules.test.ts; s9.ts prints what they decide.

export const R14 = Object.freeze({
  /** The fixture's `Open popup` link (`e2e-playground.html?popup=1`, target=_blank), opened from tab a on 8080. */
  popupUrl: `${FIXTURE_8080}/${PAGE}?popup=1`,
  /** SAFE-POP-1's bound, kept (R9-LEASE-3). */
  popupMaxMs: 2500,
  /** R14-4b: the characters typed, the follow-up text, the banner poll. */
  typeN: 1000,
  followUpText: "R14ok",
  bannerPollMs: 250,
  bannerForMs: 20_000,
  /** extension/src/debugger-errors.ts: Chrome's "Another debugger is already attached…" maps to this code. */
  anotherDebuggerCode: "DEBUGGER_DEVTOOLS",
  /** R14-5c's positive control: two concurrent requests to 8083, each answered within 1 s. */
  concurrentN: 2,
  concurrentMaxMs: 1000,
});

/** The wave's own query marker, `?s14=<marker>` (fresh: no Run 13 log line or cache entry carries it). */
export function r14Url(origin: string, marker: string, path = PAGE): string {
  return `${origin}/${path}?s14=${encodeURIComponent(marker)}`;
}

/** STOP lines (#193): every guard and every helper throw prints one, beginning `STOP:`; URLs withheld. */
export function stopLine(msg: string): string {
  return `STOP: ${scrubAll(msg)}`;
}

// R14-REL-3 — the URL class (decisions.md #196): wrapper scheme, inner scheme, own page yes/no; never the URL.

/** extension/src/safety-match.ts WRAPPER_SCHEMES (the drift test reads the source). */
export const R14_WRAPPER_SCHEMES: readonly string[] = Object.freeze(["blob", "filesystem", "view-source"]);

export interface UrlClass {
  wrapper: string;
  inner: string;
  own: boolean;
}

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

export function urlClass(url: string, ownId: string): UrlClass {
  let wrapper = "none";
  let rest = url;
  const m = SCHEME_RE.exec(url);
  if (m && R14_WRAPPER_SCHEMES.includes(m[1].toLowerCase())) {
    wrapper = m[1].toLowerCase();
    rest = url.slice(m[0].length);
  }
  const n = SCHEME_RE.exec(rest);
  const inner = n ? n[1].toLowerCase() : "none";
  const own = ownId !== "" && rest.toLowerCase().startsWith(`chrome-extension://${ownId.toLowerCase()}/`);
  return { wrapper, inner, own };
}

export function urlClassLine(c: UrlClass): string {
  return `wrapper=${c.wrapper} inner=${c.inner} own=${c.own ? "yes" : "no"}`;
}

export const CLASS_LINE_RE = /^wrapper=(none|[a-z][a-z0-9+.-]*) inner=(none|[a-z][a-z0-9+.-]*) own=(yes|no)$/;

/** Any URL form: `scheme://…`, or a scheme Chrome navigates without `//` (wrappers, about:, data:, javascript:, …). */
const ANY_URL_SOURCE =
  "[a-z][a-z0-9+.-]*:\\/\\/[^\\s\"'`)<>]*|\\b(?:view-source|blob|filesystem|data|about|javascript|file|chrome|chrome-extension|chrome-untrusted|devtools|https?):[^\\s\"'`)<>]+";

/** A message with every URL form withheld — own pages and fixture URLs too (R14-REL-3 prints no URL at all). */
export function scrubAll(msg: string): string {
  return msg.replace(new RegExp(ANY_URL_SOURCE, "gi"), "<url withheld>");
}

/**
 * R14-REL-3's pass rule over the lines its `rel` step printed: exactly one `rel-class` line, in the agreed form —
 * `rel-class <T#> wrapper=<s|none> inner=<s|none> own=<yes|no>`, or `rel-class <T#> hidden=<h> (no url to class)`
 * when the row is hidden (the extension withholds its URL), or `rel-class <T#> not listed` — and no URL in any line.
 * Prep fixer r1 (S1-prep-verifier F4, ruled before any measurement): only a printed class or `hidden=blocked` (an
 * own page whose URL the extension withholds — the class is then "own page", by the extension's own detector) can
 * pass; `not listed` and `hidden=disarmed` print no class at all, so they are NOT MEASURED, never a pass. A URL in any
 * line, or a line in no agreed form, is a FAIL first.
 */
export function classStepVerdict(lines: string[]): Judged & { notMeasured?: boolean } {
  const anyUrl = new RegExp(ANY_URL_SOURCE, "i");
  const urls = lines.filter((l) => anyUrl.test(l));
  if (urls.length) return { pass: false, why: `${urls.length} printed line(s) carry a URL` };
  const cls = lines.filter((l) => / rel-class /.test(l));
  if (cls.length !== 1) return { pass: false, why: `${cls.length} rel-class lines (need exactly 1)` };
  const m = / rel-class (T\d+) (.*)$/.exec(cls[0]);
  const tail = m ? m[2] : "";
  if (m && CLASS_LINE_RE.test(tail)) return { pass: true, why: "the class line is printed in the agreed form and no URL is printed" };
  if (tail === "hidden=blocked (no url to class)") {
    return { pass: true, why: "hidden=blocked: an own page whose URL the extension withholds; no URL is printed" };
  }
  if (tail === "hidden=disarmed (no url to class)" || tail === "not listed") {
    return { pass: false, notMeasured: true, why: `${tail}: no class was printed (the tab is ${tail === "not listed" ? "not listed" : "hidden while disarmed"})` };
  }
  return { pass: false, why: "the rel-class line is not in the agreed form" };
}

// R14-3 — the options window visible beside the driver window, judged by window rectangles before the toolbar click.

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WinPlace {
  rect: Rect;
  minimized: boolean;
  visible: boolean;
}

export interface Placement {
  w: WinPlace;
  o: WinPlace;
  /** Every monitor's work area (the screen minus the taskbar), in the same coordinates as the rects. */
  work: Rect[];
  /**
   * Windows above O in the z-order that cover part of it (s9-win.ps1 `S9Geo.Occluders`): visible, not minimized, not
   * DWM-cloaked top-level windows with a non-empty rect intersecting O's, excluding layered windows that are
   * click-through (WS_EX_LAYERED + WS_EX_TRANSPARENT) or fully transparent (LWA_ALPHA with alpha 0). -1 = not measured.
   */
  occluders: number;
  /**
   * S1 wave fixer (Return 2, ruling (a)): who each counted occluder is — a driver window by its letter, else the
   * window's class name and process name. Never a title. Absent on Run 14 attempt 2's JSON.
   */
  occluderIds?: OccluderId[];
}

/** One occluder as s9-win.ps1 `Get-S9OccluderIds` describes it: a driver window, or class + process. */
export interface OccluderId {
  driver?: "W" | "E" | "D" | "O";
  cls?: string;
  process?: string;
  /** Round 3 (after Return 3), diagnostics only: its rect, owner and root owner (a driver letter, other, none), styles. */
  rect?: Rect;
  owner?: OwnerKind;
  rootOwner?: OwnerKind;
  styles?: StyleFlags;
}

export type OwnerKind = "W" | "E" | "D" | "O" | "other" | "none";

export interface StyleFlags {
  topmost: boolean;
  popup: boolean;
  toolwindow: boolean;
  noactivate: boolean;
}

/** GWL_STYLE / GWL_EXSTYLE → the four flags round 3 prints (WS_EX_TOPMOST 0x8, WS_POPUP 0x80000000, WS_EX_TOOLWINDOW 0x80, WS_EX_NOACTIVATE 0x08000000). */
export function styleFlags(style: number, exStyle: number): StyleFlags {
  const s = style >>> 0;
  const x = exStyle >>> 0;
  return { topmost: (x & 0x8) !== 0, popup: (s & 0x80000000) >>> 0 !== 0, toolwindow: (x & 0x80) !== 0, noactivate: (x & 0x08000000) !== 0 };
}

function ownerText(k: unknown): string {
  if (typeof k === "string" && DRIVER_LETTERS.has(k)) return `driver:${k}`;
  if (k === "other" || k === "none") return k;
  return "?";
}

/** Round 3 (after Return 3): `OCCLUDER <i> <id> rect […] owner=… rootOwner=… topmost=… popup=… toolwindow=… noactivate=…` — never a title. */
export function occluderDetailLine(i: number, o: OccluderId): string {
  const f = (b: boolean | undefined): string => (typeof b === "boolean" ? String(b) : "?");
  const st = o.styles;
  return (
    `OCCLUDER ${i} ${occluderText(o)} rect ${o.rect ? rectText(o.rect) : "not read"} owner=${ownerText(o.owner)} rootOwner=${ownerText(o.rootOwner)}` +
    ` topmost=${f(st?.topmost)} popup=${f(st?.popup)} toolwindow=${f(st?.toolwindow)} noactivate=${f(st?.noactivate)}`
  );
}

export function cursorLine(c: { x: number; y: number } | null | undefined): string {
  return c && Number.isFinite(c.x) && Number.isFinite(c.y) ? `CURSOR at (${c.x},${c.y})` : "CURSOR not read";
}

/** The diagnostic lines rect-check prints after a placement line: one per occluder, then the cursor — none when 0. */
export function placementDiagnostics(p: Placement & { cursor?: { x: number; y: number } | null }): string[] {
  const ids = Array.isArray(p.occluderIds) ? p.occluderIds : [];
  if (!ids.length) return [];
  return [...ids.map((o, i) => occluderDetailLine(i + 1, o)), cursorLine(p.cursor)];
}

/**
 * Round 3 (after Return 3), ruling (c): where the driver parks the mouse cursor before a guard a transient Chrome window
 * could trip, and after each FromPoint-verified click — a FIXED rule, written before any measurement: PARK_INSET_PX
 * right of and below the top-left corner of W's page area (UIA RootWebArea), i.e. in the page's own margin, off the
 * toolbar and its tooltips. A page area not wider and taller than 2 × the inset → null (no park; the guard runs as
 * before).
 */
export const PARK_INSET_PX = 4;
export function parkPoint(page: Rect): { x: number; y: number } | null {
  if (page.right - page.left <= 2 * PARK_INSET_PX || page.bottom - page.top <= 2 * PARK_INSET_PX) return null;
  return { x: page.left + PARK_INSET_PX, y: page.top + PARK_INSET_PX };
}

const DRIVER_LETTERS = new Set(["W", "E", "D", "O"]);

/** A class or process name as printed: only [A-Za-z0-9_.#+-] kept (others → `_`), at most 64 chars, empty → `?`. */
function idPart(s: string | undefined): string {
  const t = String(s ?? "").replace(/[^A-Za-z0-9_.#+-]/g, "_").slice(0, 64);
  return t === "" ? "?" : t;
}

/** `driver:W|E|D|O`, else `class=<ClassName> process=<name>` (S1 wave fixer, ruling (a)). */
export function occluderText(o: OccluderId): string {
  if (o.driver !== undefined && DRIVER_LETTERS.has(o.driver)) return `driver:${o.driver}`;
  return `class=${idPart(o.cls)} process=${idPart(o.process)}`;
}

function rectEmpty(r: Rect): boolean {
  return !(r.right > r.left && r.bottom > r.top);
}

/** The overlap of two rects in px² (touching edges overlap 0). */
export function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

function insideRect(r: Rect, area: Rect): boolean {
  return r.left >= area.left && r.top >= area.top && r.right <= area.right && r.bottom <= area.bottom;
}

export function rectText(r: Rect): string {
  return `[${r.left},${r.top},${r.right},${r.bottom}]`;
}

/**
 * R14-3's placement rule: neither minimized nor hidden, non-empty, no overlap, each inside one monitor's work area,
 * and (prep fixer r1, S1-prep-verifier F5) no window above O that overlaps it — 0.10's "visible (not covered)".
 */
export function placementVerdict(p: Placement): Judged {
  const why: string[] = [];
  for (const [name, x] of [
    ["W", p.w],
    ["O", p.o],
  ] as const) {
    if (x.minimized) why.push(`${name} is minimized`);
    if (!x.visible) why.push(`${name} is not visible`);
    if (rectEmpty(x.rect)) why.push(`${name}'s rect is empty`);
    else if (!p.work.some((a) => insideRect(x.rect, a))) why.push(`${name} is not inside any monitor's work area`);
  }
  if (overlapArea(p.w.rect, p.o.rect) > 0) {
    const ow = Math.min(p.w.rect.right, p.o.rect.right) - Math.max(p.w.rect.left, p.o.rect.left);
    const oh = Math.min(p.w.rect.bottom, p.o.rect.bottom) - Math.max(p.w.rect.top, p.o.rect.top);
    why.push(`W and O overlap ${ow}x${oh}`);
  }
  const occ = (p as { occluders?: unknown }).occluders;
  if (typeof occ !== "number" || !Number.isInteger(occ) || occ < 0) why.push("occluders not measured");
  else if (occ > 0) why.push(`${occ} window(s) above O overlap it (O is covered)`);
  return why.length
    ? { pass: false, why: why.join("; ") }
    : { pass: true, why: "W and O do not overlap, both lie on a monitor's work area, neither is minimized, no window above O overlaps it" };
}

export function placementLine(p: Placement): string {
  const one = (x: WinPlace): string => `${rectText(x.rect)} minimized=${x.minimized} visible=${x.visible}`;
  const occ = typeof p.occluders === "number" ? String(p.occluders) : "not measured";
  const ids = Array.isArray(p.occluderIds) && p.occluderIds.length ? ` · occluder ids ${p.occluderIds.map(occluderText).join(", ")}` : "";
  return `W ${one(p.w)} · O ${one(p.o)} · work areas ${p.work.map(rectText).join(" ")} · occluders above O ${occ}${ids}`;
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

/**
 * S1 wave fixer (Return 2, ruling (a)): the work areas R14-3 tries, in a fixed order chosen before the next attempt —
 * W's monitor work area first, then every other monitor's work area in the order the system lists them
 * (`EnumDisplayMonitors`), each once.
 */
export function placementOrder(wWork: Rect, all: Rect[]): Rect[] {
  const out: Rect[] = [wWork];
  for (const a of all) if (!out.some((x) => sameRect(x, a))) out.push(a);
  return out;
}

/** The first attempt whose `placementVerdict` passed (zero occluders and every other clause), or -1: none (STOP). */
export function firstFreePlacement(verdicts: Judged[]): number {
  return verdicts.findIndex((v) => v.pass);
}

/** The shell's taskbar window classes (primary and secondary monitors). */
export const TASKBAR_CLASSES: readonly string[] = ["Shell_TrayWnd", "Shell_SecondaryTrayWnd"];

export interface ShellWindow {
  cls: string;
  rect: Rect;
}

/**
 * S1 wave fixer round 2 (S1-wave-verifier F1, the step agent's ruling): a try's area is the work area with its bottom
 * cut to the top of any shell taskbar window (TASKBAR_CLASSES) whose rect intersects it with a positive area — an
 * auto-hidden taskbar's visible strip included. A fixed rule, no margin. Several → the highest top. Every other window
 * is left to the guard, which is unchanged (it still counts the taskbar if O overlaps it).
 */
export function taskbarCut(area: Rect, shell: ShellWindow[]): { area: Rect; cut: { y: number; cls: string } | null } {
  let cut: { y: number; cls: string } | null = null;
  for (const s of shell) {
    if (!TASKBAR_CLASSES.includes(s.cls) || overlapArea(area, s.rect) <= 0) continue;
    if (s.rect.top < area.bottom && (cut === null || s.rect.top < cut.y)) cut = { y: s.rect.top, cls: s.cls };
  }
  return { area: cut ? { ...area, bottom: cut.y } : { ...area }, cut };
}

export function taskbarCutLine(area: Rect, cut: { y: number; cls: string } | null): string {
  return cut
    ? `PLACEMENT work area ${rectText(area)} cut to y=${cut.y} by taskbar class=${cut.cls}`
    : `PLACEMENT work area ${rectText(area)} not cut (no shell taskbar intersects it)`;
}

export function placementAttemptLine(n: number, area: Rect, v: Judged): string {
  return `PLACEMENT attempt ${n} on work area ${rectText(area)}: ${v.pass ? "free" : "not free"} — ${v.why}`;
}

/** Where s9-win.ps1 puts W and O: W the left 60 % of W's monitor work area, O the right 40 %, touching, no overlap. */
export function sideBySide(area: Rect): { w: Rect; o: Rect } {
  const split = area.left + Math.floor(((area.right - area.left) * 3) / 5);
  return { w: { ...area, right: split }, o: { ...area, left: split } };
}

// R14-4b — the type verdict, the follow-up trusted call, the banner record, the one pre-registered re-run.

/**
 * R14-4b's own type verdict (prep fixer r1, S1-prep-verifier F6, ruled before any measurement). §4.20's
 * `typeVerdict` read an `ok` reply or k = n as "the press missed the typing" (NOT DISCRIMINATING); here the press
 * time decides:
 * - the press AFTER the reply → NOT DISCRIMINATING (the one pre-registered re-run), whatever the reply;
 * - the press at or before the reply AND (reply `ok` OR k = n) → FAIL: the disarm landed during the call and the call
 *   still finished — the product defect the row exists to catch;
 * - the press at or before the reply, `DISARMED {scope:"all"}`, k = 0 → NOT DISCRIMINATING (the press came before the
 *   first character: correct refusal, but not "mid-way"; §4.21's k = 0 re-run);
 * - 0 < k < n → `DISARMED {scope:"all"}` passes, any other reply FAILS;
 * - no press time, or k not read → FAIL (the row cannot pass; never a pass by default).
 */
export function r14TypeVerdict(o: Outcome, typed: number | null, n: number, pressedIso: string | null, repliedIso: string): Verdict {
  const k = typed === null ? "not read" : `${typed} of ${n}`;
  const reply = o.ok ? "ok" : String(o.code);
  if (pressedIso === null) return { pass: false, notDiscriminating: false, why: [`no press time recorded (reply ${reply}, typed ${k})`] };
  const d = deltaMs(pressedIso, repliedIso);
  if (Number.isNaN(d)) return { pass: false, notDiscriminating: false, why: ["the press or reply time does not parse"] };
  if (d < 0) return { pass: false, notDiscriminating: true, why: [`the press came ${-d} ms after the reply (reply ${reply}, typed ${k}): it missed the typing`] };
  if (o.ok || (typed !== null && typed >= n)) {
    return { pass: false, notDiscriminating: false, why: [`the press came ${d} ms before the reply and the call still finished: reply ${reply}, typed ${k}`] };
  }
  if (typed === null) return { pass: false, notDiscriminating: false, why: [`typed length not read (reply ${reply})`] };
  const j = judge(o, "DISARMED:all");
  if (typed === 0) {
    return j.pass
      ? { pass: false, notDiscriminating: true, why: [`DISARMED before the first character (press ${d} ms before the reply, typed 0 of ${n}): not mid-way`] }
      : { pass: false, notDiscriminating: false, why: [j.why, `typed 0 of ${n}`] };
  }
  return j.pass
    ? { pass: true, notDiscriminating: false, why: [`DISARMED mid-way: typed ${typed} of ${n}`] }
    : { pass: false, notDiscriminating: false, why: [j.why, `typed ${typed} of ${n}`] };
}

/** After the re-arm, a trusted `type` of R14.followUpText on the same tab: `ok`, and the page's input reads it. */
export function followUpVerdict(o: Outcome, value: string | null, expected: string): Judged {
  if (!o.ok) {
    if (o.code === R14.anotherDebuggerCode) return { pass: false, why: `another debugger error (${o.code}): the disarm left a debugger session attached` };
    return { pass: false, why: `expected ok, got ${o.code}` };
  }
  if (value === null) return { pass: false, why: "the page's input was not read" };
  if (value !== expected) return { pass: false, why: `the page's input reads ${value.length} characters, not "${expected}"` };
  return { pass: true, why: `ok, the page's input reads "${expected}" (no another-debugger error)` };
}

export interface BannerSample {
  /** ms after the press. */
  ms: number;
  shown: boolean;
}

export type BannerLifetime =
  | { kind: "not-polled" }
  | { kind: "never-shown"; n: number; spanMs: number; maxGapMs: number }
  | { kind: "still-shown"; lastMs: number; returned: number; n: number; spanMs: number; maxGapMs: number }
  | { kind: "gone"; lastShownMs: number; firstGoneMs: number; returned: number; n: number; spanMs: number; maxGapMs: number };

/**
 * The banner's lifetime from the polls (a RECORD, never a pass rule — phase doc 0.10): gone between the last poll
 * that showed it and the next poll; `returned` counts gone→shown transitions (a banner that came back).
 */
export function bannerLifetime(samples: BannerSample[]): BannerLifetime {
  if (samples.length === 0) return { kind: "not-polled" };
  const s = [...samples].sort((a, b) => a.ms - b.ms);
  const n = s.length;
  const spanMs = s[n - 1].ms - s[0].ms;
  let maxGapMs = 0;
  let returned = 0;
  for (let i = 1; i < n; i++) {
    maxGapMs = Math.max(maxGapMs, s[i].ms - s[i - 1].ms);
    if (s[i].shown && !s[i - 1].shown) returned++;
  }
  let last = -1;
  for (let i = 0; i < n; i++) if (s[i].shown) last = i;
  if (last < 0) return { kind: "never-shown", n, spanMs, maxGapMs };
  if (last === n - 1) return { kind: "still-shown", lastMs: s[last].ms, returned, n, spanMs, maxGapMs };
  return { kind: "gone", lastShownMs: s[last].ms, firstGoneMs: s[last + 1].ms, returned, n, spanMs, maxGapMs };
}

export function bannerLine(lt: BannerLifetime, atPress: boolean | null, forMs: number): string {
  const press = `banner at press ${atPress === null ? "not read" : atPress ? "yes" : "no"}`;
  if (lt.kind === "not-polled") return `${press} · not polled (record)`;
  const polls = `polls ${lt.n} over ${lt.spanMs} ms (≥ ${forMs}: ${lt.spanMs >= forMs ? "yes" : "no"}), max gap ${lt.maxGapMs} ms (record)`;
  if (lt.kind === "never-shown") return `${press} · never shown after the press · ${polls}`;
  if (lt.kind === "still-shown") {
    return `${press} · still shown at +${lt.lastMs} ms (lifetime ≥ ${lt.lastMs} ms) · returned after gone ${lt.returned} · ${polls}`;
  }
  return `${press} · gone between +${lt.lastShownMs} ms and +${lt.firstGoneMs} ms after the press (last shown, first absent) · returned after gone ${lt.returned} · ${polls}`;
}

/**
 * The one pre-registered re-run of R14-4b when k is not discriminating: k = n (the press came after the typing) →
 * half the measured typing time (≥ 100 ms); k = 0 (before the first character landed) → the delay + 400 ms; else none.
 */
export function rerunDelayMs(typed: number, n: number, startedIso: string, repliedIso: string, delayMs: number): number | null {
  if (typed >= n) {
    const d = deltaMs(startedIso, repliedIso);
    if (!(d >= 0)) return null;
    return Math.max(100, Math.floor(d / 2));
  }
  if (typed === 0) return delayMs + 400;
  return null;
}

// R14-5c — the threaded redirect server's positive control and the server-log counts (#140, #197).

export function concurrentVerdict(rs: Array<{ status: number | null; ms: number }>, n: number, maxMs: number): Judged {
  const good = rs.filter((r) => r.status === 302 && r.ms <= maxMs).length;
  if (rs.length !== n || good !== n) return { pass: false, why: `${good} of ${n} answered 302 within ${maxMs} ms (${rs.length} sent)` };
  return { pass: true, why: `${n} of ${n} answered 302 within ${maxMs} ms` };
}

/** Lines of a server log that name `key` (`name=value`) as a whole query parameter. */
export function logHits(text: string, key: string): number {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`[?&]${esc}(?![A-Za-z0-9_])`);
  return text.split(/\r?\n/).filter((l) => re.test(l)).length;
}

export interface R14LogCounts {
  hop5c1: number;
  target5c1: number;
  hop5c2: number;
  target5c2: number;
}

export function serverLogLine(c: R14LogCounts): string {
  return `server-log s14=5c1 8083=${c.hop5c1} 8081=${c.target5c1} · s14=5c2 8083=${c.hop5c2} 8081=${c.target5c2}`;
}

/** 0.10: 5c1 (refused before any fetch) is never requested; 5c2's 8083 hop and its 8081 target once each (#140). */
export function serverLogVerdict(c: R14LogCounts): Judged {
  const why: string[] = [];
  if (c.hop5c1 !== 0 || c.target5c1 !== 0) why.push(`5c1 requested (8083 ${c.hop5c1}, 8081 ${c.target5c1}; expected 0, 0)`);
  if (c.hop5c2 !== 1) why.push(`5c2's 8083 hop logged ${c.hop5c2} times (expected 1)`);
  if (c.target5c2 !== 1) why.push(`5c2's 8081 target logged ${c.target5c2} times (expected 1)`);
  return why.length
    ? { pass: false, why: why.join("; ") }
    : { pass: true, why: "5c1 0/0, 5c2 hop 1 and target 1 (the hop is still requested, #140)" };
}

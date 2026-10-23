// recipes/s6-rules.ts — the pass rules of the Step 8 S6 rows that recipes/s6.ts and recipes/sdk-login.ts
// print (docs/e2e-test-plan.md §4.19; wave sheet …-steps/S6-wave-sheet.md). Written 2026-10-23, before
// the S6 build was loaded and before any S6 row ran; every rule is pure and dry-run by
// recipes/test/s6-rules.test.ts on known-good and known-bad inputs. A rule never changes after the run
// starts (integrity floor: pass rules are written before the measurement).
//
// Where an expected text comes from (derived from the code, not guessed):
// - SDK-1: the fixture's submit handler sets `status: form submitted (email = <value>)`
//   (test-fixtures/e2e-playground.html:188-192); the email field is empty in a fresh tab.
// - SDK-2: `locate`'s not-found message `no <what>.<hint> Nearest: <label>, ….` and
//   `{candidates}` (extension/src/content/locate.ts:269-272); the candidates are `nearest()`
//   (extension/src/content/nearest.ts:53, limit MAX_CANDIDATES = 5, locate.ts:27) over the fixture's 17
//   role-button names, computed offline with that function (S6-builder.md); `button "Disabled action"` is
//   listed because a snapshot lists disabled buttons (PERC-9). The report's lines are `renderReport`'s
//   (sdk/src/error.ts:349-444).
// - SDK-3: `${n} elements match ${what}; pass nth (0-based) to pick one, or narrow the locator.`
//   (locate.ts:255-258); matches in walk order, `{ref, name}` (locate.ts:249-252), rendered `  - "<name>"`
//   (no role → no prefix; refs dropped by `remapRefs`, error.ts:310-320).
// - SDK-4: the `#load-later` handler shows `Async content loaded!` after 1500 ms (fixture:251-254).
// - SDK-5: the document `mousedown` reporter `hit at X,Y exp EX,EY on=<id> (isTrusted=<b>)`
//   (fixture:177-183); `#email` has no click reporter of its own.
import { isFixtureUrl, showUrl } from "./t5-lib.js";
import { isInside } from "./blackboard/export-file.js";

export const S6_FIXTURE_ORIGIN = process.env.S6_FIXTURE_ORIGIN?.trim() || "http://localhost:8080";

/** The fixture URL an S6 step opens for `marker`. */
export function s6Url(marker: string): string {
  return `${S6_FIXTURE_ORIGIN}/e2e-playground.html?s6=${encodeURIComponent(marker)}`;
}

export interface Verdict {
  pass: boolean;
  /** One line per failed condition, or why it passed. */
  why: string[];
  /** Recorded observations that do not decide the row. */
  findings: string[];
  notMeasured?: boolean;
}

function verdict(fails: string[], findings: string[] = []): Verdict {
  return { pass: fails.length === 0, why: fails, findings };
}

// ── stale-extension check (the first recorded line after the reload) ─────────────────────────────

export type StaleInput = { ok: true; result: unknown } | { ok: false; code: string; message: string };

/**
 * The S2 `locate` call on a fresh fixture tab: only an extension built from S2 or later answers it.
 * NEW BUILD = `{ref: e<N>, role: "button", name: "Sign in"}`. STALE = the FE-era extension's
 * `UNKNOWN_METHOD: unknown method: locate` (extension/src/router.ts:28) or a daemon `VERSION` refusal.
 */
export function staleVerdict(input: StaleInput): { verdict: "NEW BUILD" | "STALE" | "UNEXPECTED"; line: string } {
  if (input.ok) {
    const r = input.result as { ref?: unknown; role?: unknown; name?: unknown } | null;
    if (r && typeof r.ref === "string" && /^e\d+$/.test(r.ref) && r.role === "button" && r.name === "Sign in") {
      return { verdict: "NEW BUILD", line: "the loaded extension answers locate: it is the S2-or-later build" };
    }
    return { verdict: "UNEXPECTED", line: `locate answered ${JSON.stringify(r)}` };
  }
  if (input.code === "UNKNOWN_METHOD" && /unknown method: locate/.test(input.message)) {
    return { verdict: "STALE", line: "the loaded extension is older than S2 (unknown method: locate) — the reload did not take" };
  }
  if (input.code === "VERSION") return { verdict: "STALE", line: "the daemon refuses the loaded extension (VERSION) — the reload did not take" };
  return { verdict: "UNEXPECTED", line: `${input.code}: ${input.message}` };
}

// ── SDK-1 ────────────────────────────────────────────────────────────────────────────────────────

export const SDK1_STATUS = "status: form submitted (email = )";

export function sdk1Verdict(o: { located: { role?: string; name?: string }; status: string }): Verdict {
  const fails: string[] = [];
  if (o.located.role !== "button" || o.located.name !== "Sign in") fail(fails, `located ${JSON.stringify(o.located)}, not button "Sign in"`);
  if (o.status !== SDK1_STATUS) fail(fails, `status line ${JSON.stringify(o.status)}, not ${JSON.stringify(SDK1_STATUS)}`);
  return verdict(fails);
}

function fail(list: string[], msg: string): void {
  list.push(msg);
}

// ── SDK-2 ────────────────────────────────────────────────────────────────────────────────────────

export const SDK2_LOCATOR = { role: "button", name: "Sgin in" } as const;
/** `nearest("Sgin in", <the fixture's role-button names>, 5)`, computed offline (see the header). */
export const SDK2_CANDIDATES = [
  'button "Sign in"',
  'button "Disabled action"',
  'button "Load message in 1.5s"',
  'button "Shadow button"',
  'button "Trusted-only button"',
];

export interface Sdk2Input {
  code: string;
  message: string;
  /** The candidates as `role "name"` labels, in order. */
  candidates: string[];
  screenshotPath?: string;
  screenshotExists: boolean;
  attachErrors: string[];
  report: string;
  repoRoot: string;
}

export function sdk2Verdict(o: Sdk2Input): Verdict {
  const fails: string[] = [];
  const findings: string[] = [];
  if (o.code !== "LOCATOR_NOT_FOUND") fail(fails, `code ${o.code}, not LOCATOR_NOT_FOUND`);
  if (!o.message.startsWith('no button named "Sgin in". Nearest: button "Sign in"')) fail(fails, "the message does not start with the pre-registered text");
  if (o.candidates[0] !== 'button "Sign in"') fail(fails, `first candidate ${JSON.stringify(o.candidates[0])}, not button "Sign in"`);
  else if (JSON.stringify(o.candidates) !== JSON.stringify(SDK2_CANDIDATES)) {
    findings.push(`candidates after the first differ from the offline ranking: ${o.candidates.join(", ")}`);
  }
  const lines = o.report.split("\n");
  if (lines.length > 60) fail(fails, `report has ${lines.length} lines (> 60)`);
  if (!lines[0]?.startsWith("LOCATOR_NOT_FOUND: no button named \"Sgin in\".")) fail(fails, "report line 1 is not the message");
  if (!lines.includes("Nearest candidates:")) fail(fails, "report has no `Nearest candidates:` line");
  if (!lines.some((l) => /^ {2}- button "Sign in"( \[ref=e\d+\])?$/.test(l))) fail(fails, 'report lists no `  - button "Sign in"` candidate');
  if (!lines.some((l) => /^- button "Sign in" \[ref=e\d+\]/.test(l))) fail(fails, 'report has no snapshot window with `- button "Sign in" [ref=e<N>]`');
  if (o.screenshotPath === undefined) fail(fails, "no screenshotPath");
  else {
    if (!lines.includes(`Screenshot: ${o.screenshotPath}`)) fail(fails, "report does not name the screenshot path");
    if (!o.screenshotExists) fail(fails, "the screenshot file does not exist");
    if (isInside(o.repoRoot, o.screenshotPath)) fail(fails, "the screenshot is inside the repo");
  }
  if (o.attachErrors.length > 0) fail(fails, `attachErrors: ${o.attachErrors.join(" | ")}`);
  return verdict(fails, findings);
}

// ── SDK-3 ────────────────────────────────────────────────────────────────────────────────────────

export const SDK3_LOCATOR = { role: "button", name: "Fetch" } as const;
/** The fixture's role-button names containing "fetch" (case-insensitive), in document order. */
export const SDK3_MATCHES = ["Fetch JSON", "Fetch 404", "Fetch redirect", "Fetch unreachable", "Fetch black hole", "Fetch cross-origin", "Fetch 20×"];
export const SDK3_MESSAGE = '7 elements match button named "Fetch"; pass nth (0-based) to pick one, or narrow the locator.';
export const SDK3_CLICK_STATUS = "status: fetch ok.json -> 200";

export function sdk3Verdict(o: {
  code: string;
  message: string;
  matches: string[];
  report: string;
  nth1: { role?: string; name?: string };
  clickStatus: string;
}): Verdict {
  const fails: string[] = [];
  if (o.code !== "LOCATOR_AMBIGUOUS") fail(fails, `code ${o.code}, not LOCATOR_AMBIGUOUS`);
  if (o.message !== SDK3_MESSAGE) fail(fails, `message ${JSON.stringify(o.message)}`);
  if (JSON.stringify(o.matches) !== JSON.stringify(SDK3_MATCHES)) fail(fails, `matches ${JSON.stringify(o.matches)}`);
  const lines = o.report.split("\n");
  if (!lines.includes(`Matches (${SDK3_MATCHES.length}):`)) fail(fails, "report has no `Matches (7):` line");
  for (const m of SDK3_MATCHES) if (!lines.includes(`  - ${JSON.stringify(m)}`)) fail(fails, `report does not list ${JSON.stringify(m)}`);
  if (o.nth1.role !== "button" || o.nth1.name !== "Fetch 404") fail(fails, `nth:1 located ${JSON.stringify(o.nth1)}, not button "Fetch 404"`);
  if (o.clickStatus !== SDK3_CLICK_STATUS) fail(fails, `after the nth:0 click the status is ${JSON.stringify(o.clickStatus)}`);
  return verdict(fails);
}

// ── SDK-4 ────────────────────────────────────────────────────────────────────────────────────────

export const SDK4_TEXT = "Async content loaded!";

/** `visibleMs`: from the click's answer to waitFor's; `hiddenMs`: the hidden wait after the removal. */
export function sdk4Verdict(o: { visibleMs: number; hiddenMs: number }): Verdict {
  const fails: string[] = [];
  if (o.visibleMs < 1200) fail(fails, `visible after ${o.visibleMs} ms: before the 1.5 s timer could fire — the text was already there`);
  if (o.visibleMs > 5000) fail(fails, `visible after ${o.visibleMs} ms (> 5000)`);
  if (o.hiddenMs > 1000) fail(fails, `hidden after ${o.hiddenMs} ms (> 1000)`);
  return verdict(fails);
}

// ── SDK-5 ────────────────────────────────────────────────────────────────────────────────────────

export const SDK5_STATUS_RE = /^status: hit at -?\d+,-?\d+ exp -?\d+,-?\d+ on=email \(isTrusted=true\)$/;

export function sdk5Verdict(o: { ref: string; status: string; activeId: string; marks: number }): Verdict {
  const fails: string[] = [];
  if (!/^e\d+$/.test(o.ref)) fail(fails, `evaluateRef returned ${JSON.stringify(o.ref)}, not e<N>`);
  if (!SDK5_STATUS_RE.test(o.status)) fail(fails, `status ${JSON.stringify(o.status)} is not a trusted hit on #email`);
  if (o.activeId !== "email") fail(fails, `document.activeElement is #${o.activeId}, not #email`);
  if (o.marks !== 0) fail(fails, `${o.marks} element(s) still carry data-__bridge-mark`);
  return verdict(fails);
}

// ── SM-0 ─────────────────────────────────────────────────────────────────────────────────────────

export interface SeenEvent {
  event: string;
  params: Record<string, unknown>;
}

export function sm0Verdict(o: {
  tab: string;
  name: string;
  events: SeenEvent[];
  snapshotAfter: { ok: true; elements: number } | { ok: false; error: string };
  owner: string | undefined;
}): Verdict {
  const down = o.events.findIndex((e) => e.event === "extensionStatus" && e.params.connected === false);
  const up = o.events.findIndex((e, i) => i > down && e.event === "extensionStatus" && e.params.connected === true);
  if (down < 0 || up < 0) {
    return { pass: false, why: ["no extension disconnect and reconnect during the hold — the reload was not seen"], findings: [], notMeasured: true };
  }
  const fails: string[] = [];
  const gone = o.events.filter((e) => e.event === "tabGone" && e.params.tab === o.tab);
  if (gone.length > 0) fail(fails, `${gone.length} tabGone for ${o.tab}`);
  if (!o.snapshotAfter.ok) fail(fails, `snapshot ${o.tab} after the reload failed: ${o.snapshotAfter.error}`);
  if (o.owner !== o.name) fail(fails, `listTabs owner of ${o.tab} is ${JSON.stringify(o.owner)}, not ${JSON.stringify(o.name)}`);
  return verdict(fails);
}

// ── SM-1 (added 2026-10-23 by the S6 fixer, round 1, on the user's restart grant, decisions.md #96) ──
// Pre-registered text (phase doc S6 notes, stage0-audit.md F5), copied into docs/e2e-test-plan.md §4.19:
// the recipe receives exactly one `tabGone {tab: T<a>}` whose `lastUrl` is the pre-restart page's; its
// next `snapshot {tab: T<a>}` → `TAB_GONE`; `listTabs` shows no tab owned by the recipe, and every handle
// is greater than every pre-restart handle; the daemon is unchanged. FAIL on any live T<a> after the
// restart, whatever tab it names. The daemon-pid clause is the driver's process listing; the recipe adds
// what a client can see of "the same daemon": no 4002 reconnect, and an uptime that kept counting.

const handleNo = (h: string): number | null => {
  const m = /^T(\d+)$/.exec(h);
  return m ? Number(m[1]) : null;
};

export function sm1Verdict(o: {
  tab: string;
  name: string;
  preHandles: string[];
  fixtureUrl: string;
  events: SeenEvent[];
  snapshotAfter: { ok: true } | { ok: false; code: string; message: string };
  listAfter: Array<{ tab: string; owner?: string }>;
  uptimeBeforeMs: number;
  uptimeAfterMs: number;
  elapsedMs: number;
  reconnected: boolean;
}): Verdict {
  const down = o.events.findIndex((e) => e.event === "extensionStatus" && e.params.connected === false);
  const up = o.events.findIndex((e, i) => i > down && e.event === "extensionStatus" && e.params.connected === true);
  if (down < 0 || up < 0) {
    return { pass: false, why: ["the extension did not disconnect and reconnect during the hold — the restart was not seen"], findings: [], notMeasured: true };
  }
  const fails: string[] = [];
  const gone = o.events.filter((e) => e.event === "tabGone" && e.params.tab === o.tab);
  if (gone.length !== 1) fail(fails, `${gone.length} tabGone for ${o.tab} (exactly 1 expected)`);
  else if (gone[0]!.params.lastUrl !== o.fixtureUrl) fail(fails, `the tabGone's lastUrl is not the pre-restart page (${showUrl(gone[0]!.params.lastUrl)})`);
  if (o.snapshotAfter.ok) fail(fails, `snapshot ${o.tab} after the restart answered — a live ${o.tab}`);
  else if (o.snapshotAfter.code !== "TAB_GONE") fail(fails, `snapshot ${o.tab} after the restart → ${o.snapshotAfter.code}, not TAB_GONE`);
  if (o.listAfter.some((t) => t.tab === o.tab)) fail(fails, `listTabs still lists ${o.tab} — a live ${o.tab}`);
  const owned = o.listAfter.filter((t) => t.owner === o.name).map((t) => t.tab);
  if (owned.length > 0) fail(fails, `listTabs shows tab(s) owned by ${o.name}: ${owned.join(", ")}`);
  const preNos = o.preHandles.map(handleNo).filter((n): n is number => n !== null);
  const maxPre = preNos.length > 0 ? Math.max(...preNos) : 0;
  const notAbove = o.listAfter.filter((t) => {
    const n = handleNo(t.tab);
    return n === null || n <= maxPre;
  });
  if (notAbove.length > 0) fail(fails, `handle(s) not above every pre-restart handle (max T${maxPre}): ${notAbove.map((t) => t.tab).join(", ")}`);
  if (o.reconnected) fail(fails, "the client reconnected (4002) — the daemon changed during the hold");
  if (o.uptimeAfterMs - o.uptimeBeforeMs < o.elapsedMs - 5000) {
    fail(fails, `daemon uptime ${o.uptimeBeforeMs} → ${o.uptimeAfterMs} ms over ${o.elapsedMs} ms — not the same daemon`);
  }
  return verdict(fails);
}

const LOG_TS = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) (.*)$/;

/**
 * daemon.log from the quit on (`since`, an ISO time taken just before chrome://quit): exactly one
 * `extension session changed: <n> handles retired` line, `<n>` ≥ 1, nothing else on it (no marker
 * value); within 30 s of the extension's hello. The daemon logs no line for the hello itself: the retire
 * runs inside the hello handler and the hello's resync logs `extension resync: …` right after, so "within
 * 30 s of the hello" is read as "an `extension resync:` line at most 30 s after the session-changed line"
 * (resolution proposed in S6-fixer1.md).
 */
export function sm1LogVerdict(lines: string[], since: string): Verdict {
  const t0 = Date.parse(since);
  if (!Number.isFinite(t0)) throw new Error("since is not an ISO time");
  const after = lines
    .map((l) => LOG_TS.exec(l.trim()))
    .filter((m): m is RegExpExecArray => m !== null && Date.parse(m[1]!) >= Math.floor(t0 / 1000) * 1000);
  const fails: string[] = [];
  const changed = after.filter((m) => /extension session changed/.test(m[2]!));
  if (changed.length !== 1) {
    fail(fails, `${changed.length} "extension session changed" line(s) since ${since} (exactly 1 expected)`);
    return verdict(fails);
  }
  const c = changed[0]!;
  const exact = /^extension session changed: (\d+) handles retired$/.exec(c[2]!);
  if (!exact) fail(fails, "the session-changed line carries more than the count (a marker value?)");
  else if (Number(exact[1]) < 1) fail(fails, `${exact[1]} handles retired (≥ 1 expected)`);
  const tc = Date.parse(c[1]!);
  const resync = after.find((m) => /^extension resync: \d+ tabs, \d+ gone$/.test(m[2]!) && Date.parse(m[1]!) >= tc);
  if (!resync) fail(fails, "no `extension resync:` line after the session-changed line");
  else if (Date.parse(resync[1]!) - tc > 30_000) fail(fails, `the resync came ${(Date.parse(resync[1]!) - tc) / 1000} s after the session-changed line (> 30 s)`);
  return verdict(fails);
}

// ── REP-0 (added 2026-10-23, S6 resume, before its run — decisions.md · 2026-10-23 · A probe of the ──
// failure-report screenshot runs before any row that could attach a non-fixture tab (#97)).
// Method: Run 9's — page-side `visibilitychange` timestamps (t5-lib.ts VISLOG_INSTALL, epoch ms from
// `performance.timeOrigin + performance.now()`) and the hue rule on the bar (t5-png.ts `describeBar`).
// The probe tab carries a magenta bar, the human fixture tab a blue one. *2026-10-23 (S6 fixer 2, verifier
// r2 MAJOR-1, before any REP-0 run): the human's colour was cyan (t5.ts screen1's); default captures lift
// cyan/lime's red channel past the hue rule (Run 9 lime → #8fff3d; CDP cyan → #97fdfd), while blue read
// blue (#3300f8) and magenta read magenta (#dd00fa) through Run 9's default captures (T5-run9-record.md:72,86).*

export const REP0_LOCATOR = { role: "button", name: "No such button" } as const;
export const REP0_PROBE_COLOUR = "magenta";
export const REP0_HUMAN_COLOUR = "blue";
/**
 * Clock slack between Node's `Date.now()` around a call and the page's epoch timestamps, on each side
 * of the call window. 50 ms is t5.ts screen1's `t0 - 50` (Run 8/9), chosen before REP-0 ran.
 */
export const REP0_SLACK_MS = 50;

export type VisLog = Array<[state: string, epochMs: number, kind: string]>;

/** The first `visible` *change* (not the install's `start` entry) inside [t0 − slack, t1 + slack]. */
export function visibleIn(log: VisLog, t0: number, t1: number, slack = REP0_SLACK_MS): number | undefined {
  return log.find((e) => e[2] === "change" && e[0] === "visible" && e[1] >= t0 - slack && e[1] <= t1 + slack)?.[1];
}

/** The state the log was installed in (its `start` entry), or undefined. */
function startState(log: VisLog): string | undefined {
  return log.find((e) => e[2] === "start")?.[0];
}

export interface Rep0Capture {
  /** Epoch ms just before and just after the call. */
  t0: number;
  t1: number;
  /** The probe tab's visibility log, installed just before the call. */
  probeVis: VisLog;
  /** `describeBar`'s name for the image ("magenta", "blue", "mixed", "other", "unreadable"); undefined = no image. */
  pngColour: string | undefined;
}

export interface Rep0Input {
  /** The attach-set failure on the probe tab, with failure reports on. */
  report: Rep0Capture & { code: string; screenshotPath?: string; attachErrors: string[] };
  /** The positive control: an explicit default-mode screenshot of the same background probe tab. */
  control: Rep0Capture & { error?: string };
  /** The analysis-side control: a capture of the human fixture tab (current, on screen). */
  human: { pngColour: string | undefined; error?: string };
}

export interface Rep0Result {
  result: "PASS" | "FAIL" | "NOT DISCRIMINATING";
  why: string[];
}

const at = (t: number, t0: number): string => `${t - t0 >= 0 ? "+" : ""}${Math.round(t - t0)} ms`;

/**
 * REP-0's pre-registered rule (#97). PASS = the probe tab went `visible` inside the report call's window
 * AND the report PNG shows the probe tab's (magenta) bar. FAIL = no such `visible` (the capture did not
 * switch), the PNG shows another colour (blue = the human's tab), no screenshot (no path, a `screenshot:`
 * attach error, an unread PNG), or a trigger other than LOCATOR_NOT_FOUND. NOT DISCRIMINATING = a
 * control failed (the explicit screenshot did not switch to the probe or did not read magenta; the human
 * tab did not read blue) or the probe was not hidden before the call; it outranks FAIL, and the probe's
 * own reasons are then listed after "also:".
 */
export function rep0Verdict(o: Rep0Input): Rep0Result {
  const notDisc: string[] = [];
  const fails: string[] = [];
  // Controls and preconditions.
  const r = o.report;
  if (startState(r.probeVis) !== "hidden") notDisc.push(`the probe tab was not hidden before the report call (its log started ${startState(r.probeVis) ?? "empty"})`);
  const c = o.control;
  if (c.error !== undefined) notDisc.push(`the control screenshot failed: ${c.error}`);
  else {
    if (startState(c.probeVis) !== "hidden") notDisc.push(`the probe tab was not hidden before the control screenshot (its log started ${startState(c.probeVis) ?? "empty"})`);
    else if (visibleIn(c.probeVis, c.t0, c.t1) === undefined) notDisc.push("the control screenshot did not make the probe tab visible inside its call — the method does not see a switch");
    if (c.pngColour !== REP0_PROBE_COLOUR) notDisc.push(`the control PNG reads ${c.pngColour ?? "no image"}, not ${REP0_PROBE_COLOUR}`);
  }
  if (o.human.error !== undefined) notDisc.push(`the human-tab capture failed: ${o.human.error}`);
  else if (o.human.pngColour !== REP0_HUMAN_COLOUR) {
    notDisc.push(`the human tab reads ${o.human.pngColour ?? "no image"}, not ${REP0_HUMAN_COLOUR} — the hue rule does not tell the two tabs apart`);
  }
  // The probe.
  if (r.code !== "LOCATOR_NOT_FOUND") fails.push(`the trigger answered ${r.code}, not LOCATOR_NOT_FOUND`);
  const shotErrors = r.attachErrors.filter((e) => /^screenshot:/.test(e));
  if (shotErrors.length > 0) fails.push(`attachErrors: ${shotErrors.join(" | ")}`);
  if (r.screenshotPath === undefined) fails.push("no screenshot attached (no screenshotPath)");
  else if (r.pngColour === undefined) fails.push("the report PNG was not read");
  else if (r.pngColour !== REP0_PROBE_COLOUR) {
    const whose = r.pngColour === REP0_HUMAN_COLOUR ? " — the human's tab, not the failed one" : "";
    fails.push(`the report PNG shows ${r.pngColour}, not ${REP0_PROBE_COLOUR} (the probe tab's bar)${whose}`);
  }
  if (visibleIn(r.probeVis, r.t0, r.t1) === undefined) {
    const any = r.probeVis.find((e) => e[2] === "change" && e[0] === "visible");
    const outside = any ? ` (its first visible change was at ${at(any[1], r.t0)}, outside [0, ${Math.round(r.t1 - r.t0)}] ms ± ${REP0_SLACK_MS} ms)` : "";
    fails.push(`the probe tab never went visible during the report call — the capture did not switch${outside}`);
  }
  if (notDisc.length > 0) {
    return { result: "NOT DISCRIMINATING", why: [...notDisc, ...fails.map((f) => `also: ${f}`)] };
  }
  return { result: fails.length === 0 ? "PASS" : "FAIL", why: fails };
}

/** An event as one line; non-fixture URLs and titles withheld (B2; the repo is public). */
export function describeEvent(e: SeenEvent): string {
  const p: Record<string, unknown> = {};
  const fixture = Object.entries(e.params).some(([k, v]) => /url/i.test(k) && isFixtureUrl(v));
  for (const [k, v] of Object.entries(e.params)) {
    if (/url/i.test(k)) p[k] = showUrl(v);
    else if (/title/i.test(k) && !fixture) p[k] = "<non-fixture title withheld>";
    else p[k] = v;
  }
  return `${e.event} ${JSON.stringify(p)}`;
}

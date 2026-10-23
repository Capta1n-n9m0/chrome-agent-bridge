// recipes/s6.ts — the SDK-side steps of Step 8 stage S6's live rows (docs/e2e-test-plan.md §4.19;
// wave sheet docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md). Written
// 2026-10-23, before the S6 build was loaded or any S6 row ran; each row's verdict is a pure rule in
// recipes/s6-rules.ts (dry-run by recipes/test/s6-rules.test.ts), and the expected texts in §4.19 are the
// lines this script prints.
//
//   npm run recipe -- recipes/s6.ts <command> [args]      (or: npx tsx recipes/s6.ts …)
//
//   stale-check        the first recorded line after the reload: an S2 `locate` on a fresh fixture tab
//                      (only an S2-or-later extension answers it)
//   sdk2               SDK-2: LOCATOR_NOT_FOUND report (misspelt name → candidates, screenshot, snapshot)
//   sdk3               SDK-3: LOCATOR_AMBIGUOUS → matches listed; nth picks one
//   sdk4               SDK-4: waitFor({locator:{text}}) visible, then state:"hidden"
//   sdk5               SDK-5: evaluateRef('#email') → click({trusted:true}) lands (isTrusted reporter)
//   sm0 [--hold <s>]   SM-0: hold a fixture tab ≥ 120 s, printing every event, while the driver runs
//                      recipes/reload-extension.ps1; then the handle must still answer and be ours
//   sm1 [--hold <s>] [--marker m]  SM-1: claim the driver window's ?t5=<m> tab (default sm1), hold through
//                      a Chrome restart (default 900 s), then: one tabGone, snapshot → TAB_GONE, no tab
//                      ours, every handle above the old ones, same daemon (added by the S6 fixer, #96)
//   sm1-log --since <iso>  SM-1's daemon.log clause (no connect; prints only the session lines)
//   peek <t5-marker>   SDK-8 helper: the unheld `?t5=<marker>` tab's counter button, by snapshot (claims,
//                      reads, releases; refuses a held tab)
//   daemon-shutdown    MUX-1 set-up: `daemon.shutdown`, refused while any other client is connected
//   close-bb-tab <T#>  SDK-7 clean-up: close the unheld ada course tab export-grades --keep-open left
//   rep0               REP-0 (#97): does the failure report's screenshot switch to the failed tab? A
//                      LOCATOR_NOT_FOUND on a background probe tab (magenta bar) with the human fixture tab
//                      ?t5=s6-human (blue bar) current; page-side visibilitychange logs on both; the report
//                      PNG judged by the hue rule, then deleted; positive controls in the same run (added
//                      2026-10-23, S6 resume, before its run)
//   --help             this text (connects to nothing)
//
// Every tab it acts on is one it opened itself (`?s6=<marker>`, in the background) or, for `peek`, the
// driver's own `?t5=` fixture tab; it prints only fixture URLs and titles, never the token.
// Exit codes: 0 = PASS (or the helper did its job), 1 = FAIL / a bridge error (`FAILED — …`),
// 2 = set-up or refusal (nothing measured), 3 = not measured (SM-0 saw no reload; REP-0: NOT DISCRIMINATING).
import { existsSync, readdirSync, readFileSync, rmdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BridgeError, connect, type BridgeClient, type Tab } from "@bridge/sdk";
import { isInside } from "./blackboard/export-file.js";
import { isAdaCoursePage } from "./blackboard/guard.js";
import { barExpression, byMarker, COLOURS, evalJson, listTabs, showUrl, urlOf, VISLOG_INSTALL, VISLOG_READ } from "./t5-lib.js";
import { describeBar } from "./t5-png.js";
import {
  describeEvent,
  rep0Verdict,
  s6Url,
  sdk2Verdict,
  sdk3Verdict,
  sdk4Verdict,
  sdk5Verdict,
  sm0Verdict,
  sm1LogVerdict,
  sm1Verdict,
  staleVerdict,
  SDK2_LOCATOR,
  SDK3_LOCATOR,
  SDK4_TEXT,
  REP0_HUMAN_COLOUR,
  REP0_LOCATOR,
  REP0_PROBE_COLOUR,
  REP0_SLACK_MS,
  type VisLog,
  type SeenEvent,
  type StaleInput,
  type Verdict,
} from "./s6-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [command = "--help", ...rest] = process.argv.slice(2);
const started = Date.now();
let who = "s6";
const say = (msg: string): void => console.log(`${new Date().toISOString()} ${who}: ${msg}`);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const HELP = `recipes/s6.ts — Step 8 S6 rows (docs/e2e-test-plan.md §4.19)
  stale-check | sdk2 | sdk3 | sdk4 | sdk5 | sm0 [--hold <s>] | sm1 [--hold <s>] [--marker <t5-marker>]
  | sm1-log --since <iso> | peek <t5-marker> | daemon-shutdown | close-bb-tab <T#> | rep0 | --help
Exit: 0 PASS, 1 FAIL or bridge error, 2 set-up/refusal, 3 not measured (REP-0: not discriminating).`;

class SetUp extends Error {}

function option(flag: string): string | undefined {
  const i = rest.indexOf(flag);
  return i >= 0 ? rest[i + 1] : undefined;
}

function report(v: Verdict, row: string, passLine: string): void {
  for (const f of v.findings) say(`finding: ${f}`);
  if (v.notMeasured) {
    say(`${row} NOT MEASURED — ${v.why.join("; ")}`);
    process.exitCode = 3;
  } else if (v.pass) say(`${row} PASS — ${passLine}`);
  else {
    say(`${row} FAIL — ${v.why.join("; ")}`);
    process.exitCode = 1;
  }
}

/** A fixture tab of our own, in the background, loaded (`waitFor {text}` works on every build). */
async function openFixture(client: BridgeClient, marker: string): Promise<Tab> {
  const url = s6Url(marker);
  const tab = await client.newTab(url);
  say(`opened ${tab.handle} (background) at ${url}`);
  await tab.waitFor({ text: "Agent Bridge E2E Playground" });
  return tab;
}

const statusLine = (tab: Tab): Promise<string> => tab.evaluate<string>("document.getElementById('status').textContent");

function reportLines(err: BridgeError): string[] {
  return typeof err.report === "function" ? err.report().split("\n") : [];
}

function printReport(lines: string[]): void {
  say(`--- report (${lines.length} lines) ---`);
  for (const l of lines) console.log(l);
  say("--- end report ---");
}

function label(c: { role?: unknown; name?: unknown }): string {
  const role = typeof c.role === "string" && c.role !== "" ? `${c.role} ` : "";
  return `${role}${JSON.stringify(typeof c.name === "string" ? c.name : "")}`;
}

async function expectError(what: string, fn: () => Promise<unknown>): Promise<BridgeError> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof BridgeError) return err;
    throw err;
  }
  throw new Error(`${what} succeeded — the row expected an error`);
}

// ── commands ─────────────────────────────────────────────────────────────────────────────────────

async function staleCheck(client: BridgeClient): Promise<void> {
  say(`connected — daemon build ${client.welcome?.build ?? "?"}, extension ${client.extensionConnected ? "connected" : "not connected"}`);
  const tab = await openFixture(client, "stale");
  let input: StaleInput;
  const t0 = Date.now();
  try {
    // Raw call on purpose: the check is about the loaded extension, not the SDK's report.
    const result = await client.call("locate", { tab: tab.handle, locator: { role: "button", name: "Sign in" } });
    input = { ok: true, result };
    say(`locate ${tab.handle} {role:"button", name:"Sign in"} → ok ${JSON.stringify(result)} (${Date.now() - t0} ms)`);
  } catch (err) {
    if (!(err instanceof BridgeError)) throw err;
    input = { ok: false, code: String(err.code), message: err.message };
    say(`locate ${tab.handle} {role:"button", name:"Sign in"} → ${err.code}: ${err.message} (${Date.now() - t0} ms)`);
  }
  await tab.close();
  const v = staleVerdict(input);
  say(`STALE-CHECK ${v.verdict} — ${v.line}`);
  if (v.verdict !== "NEW BUILD") process.exitCode = 1;
}

async function sdk2(client: BridgeClient): Promise<void> {
  const tab = await openFixture(client, "sdk2");
  const err = await expectError("click", () => tab.click({ ...SDK2_LOCATOR }));
  say(`click {role:"button", name:"Sgin in"} → ${err.code}: ${err.message}`);
  const candidates = ((err.data as { candidates?: unknown[] } | undefined)?.candidates ?? []).map((c) => label(c as object));
  say(`candidates (${candidates.length}): ${candidates.join(", ")}`);
  const shot = err.screenshotPath;
  const exists = shot !== undefined && existsSync(shot);
  say(`screenshotPath: ${shot ?? "(none)"}; exists: ${exists ? "yes" : "no"}; outside the repo: ${shot === undefined ? "n/a" : isInside(REPO, shot) ? "no" : "yes"}`);
  say(`attachErrors: ${JSON.stringify(err.attachErrors ?? null)}`);
  const lines = reportLines(err);
  printReport(lines);
  await tab.close();
  const v = sdk2Verdict({
    code: String(err.code),
    message: err.message,
    candidates,
    screenshotPath: shot,
    screenshotExists: exists,
    attachErrors: err.attachErrors ?? [],
    report: lines.join("\n"),
    repoRoot: REPO,
  });
  report(v, "SDK-2", 'LOCATOR_NOT_FOUND names button "Sign in" first; screenshot saved outside the repo; the report shows the snapshot window');
}

async function sdk3(client: BridgeClient): Promise<void> {
  const tab = await openFixture(client, "sdk3");
  const err = await expectError("locate", () => tab.locate({ ...SDK3_LOCATOR }));
  say(`locate {role:"button", name:"Fetch"} → ${err.code}: ${err.message}`);
  const matches = ((err.data as { matches?: Array<{ name?: unknown }> } | undefined)?.matches ?? []).map((m) => String(m.name));
  say(`matches (${matches.length}): ${matches.map((m) => JSON.stringify(m)).join(", ")}`);
  const lines = reportLines(err);
  printReport(lines);
  const nth1 = await tab.locate({ ...SDK3_LOCATOR, nth: 1 });
  say(`locate {role:"button", name:"Fetch", nth:1} → ${nth1.ref} ${nth1.role} ${JSON.stringify(nth1.name)}`);
  await tab.click({ ...SDK3_LOCATOR, nth: 0 });
  say(`click {role:"button", name:"Fetch", nth:0} → ok`);
  await tab.waitFor({ text: "fetch ok.json -> 200" });
  const clickStatus = await statusLine(tab);
  say(`status line: ${JSON.stringify(clickStatus)}`);
  await tab.close();
  const v = sdk3Verdict({ code: String(err.code), message: err.message, matches, report: lines.join("\n"), nth1, clickStatus });
  report(v, "SDK-3", "7 matches listed; nth:1 is Fetch 404; nth:0 clicked Fetch JSON");
}

async function sdk4(client: BridgeClient): Promise<void> {
  const tab = await openFixture(client, "sdk4");
  await tab.click({ role: "button", name: "Load message in 1.5s" });
  const t0 = Date.now();
  say(`click {role:"button", name:"Load message in 1.5s"} → ok`);
  await tab.waitFor({ locator: { text: SDK4_TEXT } });
  const visibleMs = Date.now() - t0;
  say(`waitFor {locator:{text:"${SDK4_TEXT}"}} → ok after ${visibleMs} ms`);
  await tab.evaluate("document.getElementById('async-area').textContent = ''");
  say(`evaluate: #async-area emptied`);
  const t1 = Date.now();
  await tab.waitFor({ locator: { text: SDK4_TEXT }, state: "hidden" });
  const hiddenMs = Date.now() - t1;
  say(`waitFor {locator:{text:"${SDK4_TEXT}"}, state:"hidden"} → ok after ${hiddenMs} ms`);
  await tab.close();
  report(sdk4Verdict({ visibleMs, hiddenMs }), "SDK-4", `visible after ${visibleMs} ms, hidden after ${hiddenMs} ms`);
}

async function sdk5(client: BridgeClient): Promise<void> {
  const tab = await openFixture(client, "sdk5");
  const current = async (): Promise<string> => ((await client.tabs()).find((t) => t.handle === tab.handle)?.current ? "yes" : "no");
  say(`before: ${tab.handle} is the human's tab (current): ${await current()}`);
  const ref = await tab.evaluateRef("document.querySelector('#email')");
  say(`evaluateRef("document.querySelector('#email')") → ${ref}`);
  const marks = await tab.evaluate<number>("document.querySelectorAll('[data-__bridge-mark]').length");
  say(`elements still carrying data-__bridge-mark: ${marks}`);
  const t0 = Date.now();
  await tab.click(ref, { trusted: true });
  say(`click ${ref} {trusted:true} → ok (${Date.now() - t0} ms; policy focusFirst sends focusTab first, #89)`);
  const status = await statusLine(tab);
  const activeId = await tab.evaluate<string>("(document.activeElement && document.activeElement.id) || ''");
  say(`status line: ${JSON.stringify(status)}; document.activeElement: #${activeId}`);
  say(`after: ${tab.handle} is the human's tab (current): ${await current()} (informational: focusFirst leaves it in front)`);
  await tab.close();
  report(sdk5Verdict({ ref, status, activeId, marks }), "SDK-5", `trusted click on ${ref} reached #email (isTrusted=true); no mark left`);
}

// ── argument checks, run before connect() (NIT-1, S6 fixer r1: a set-up error never spawns a daemon) ──

function sm0Hold(): number {
  const holdS = Number(option("--hold") ?? "120");
  if (!Number.isFinite(holdS) || holdS < 120) throw new SetUp("SET-UP: --hold is seconds ≥ 120 (the row needs a hold of at least 120 s)");
  return holdS;
}

function peekMarker(): string {
  const marker = rest[0];
  if (!marker || marker.startsWith("-")) throw new SetUp("SET-UP: peek needs the ?t5= marker of the driver's tab (e.g. sdk8-human)");
  return marker;
}

function sm1Args(): { holdS: number; marker: string } {
  const holdS = Number(option("--hold") ?? "900");
  if (!Number.isInteger(holdS) || holdS < 300 || holdS > 3600) throw new SetUp("SET-UP: --hold is whole seconds from 300 to 3600 (the restart, MUX-8 and the relaunch fit in it)");
  const marker = option("--marker") ?? "sm1";
  if (!/^[a-z0-9-]{1,32}$/.test(marker)) throw new SetUp("SET-UP: --marker is the driver window's ?t5= marker (a-z, 0-9, -)");
  return { holdS, marker };
}

function sm1LogSince(): string {
  const since = option("--since");
  if (!since || !Number.isFinite(Date.parse(since)) || !/^\d{4}-\d{2}-\d{2}T/.test(since)) {
    throw new SetUp("SET-UP: sm1-log needs --since <ISO time taken just before chrome://quit>");
  }
  return since;
}

function bbTabHandle(): string {
  const h = rest[0];
  if (!h || !/^T\d+$/.test(h)) throw new SetUp("SET-UP: close-bb-tab needs the handle the Blackboard recipe printed (T<n>)");
  return h;
}

const PRECHECKS: Record<string, () => unknown> = {
  sm0: sm0Hold,
  peek: peekMarker,
  sm1: sm1Args,
  "sm1-log": sm1LogSince,
  "close-bb-tab": bbTabHandle,
  rep0: rep0FailuresDir,
};

/**
 * SDK-7 clean-up (S6 fixer r1): closes the course tab `export-grades.ts --keep-open` left open, only if it
 * is unheld and on an ada course page (checked in memory; its URL and title are never printed), so the
 * driver never closes a tab of the user's by a wrong handle.
 */
async function closeBbTab(client: BridgeClient): Promise<void> {
  const handle = bbTabHandle();
  const row = (await listTabs(client)).find((t) => t.tab === handle);
  if (!row) throw new SetUp(`SET-UP: no open tab ${handle}`);
  if (row.owner !== undefined) throw new SetUp(`SET-UP: ${handle} is held by ${JSON.stringify(row.owner)} — not closed`);
  if (!isAdaCoursePage(row.url)) throw new SetUp(`SET-UP: ${handle} is not on an ada course page — not closed`);
  const tab = await client.claim(handle);
  await tab.close();
  say(`closed ${handle} (the Blackboard recipe's course tab)`);
}

// ── SM-1 (added 2026-10-23 by the S6 fixer, round 1, on the user's restart grant, decisions.md #96) ───

/**
 * SM-1: claims the driver window's `?t5=<marker>` fixture tab (T<a>), records `daemon.status` (tab,
 * tabId, owner; every live handle; uptime), then holds, printing every event with its time, while the
 * driver quits Chrome by chrome://quit, runs MUX-8 in the quit window and relaunches Chrome. After the
 * extension is back: up to 30 s for `tabGone {tab: T<a>}`, 10 s more to catch a second one, then
 * `snapshot {tab: T<a>}` (TAB_GONE expected), `listTabs`, `daemon.status` again. Verdict: `sm1Verdict`.
 * It closes nothing: the restored fixture window is closed after the driver's counts (t5.ts cleanup).
 */
async function sm1(client: BridgeClient): Promise<void> {
  const { holdS, marker } = sm1Args();
  const fixtureUrl = urlOf(marker);
  const events: SeenEvent[] = [];
  let reconnected = false;
  client.on("reconnected", () => {
    reconnected = true;
    say(`reconnected (4002) at +${Date.now() - started} ms — the daemon changed`);
  });
  client.on("event", (m) => {
    const e = { event: m.event, params: (m.params ?? {}) as Record<string, unknown> };
    events.push(e);
    say(`event +${Date.now() - started} ms ${describeEvent(e)}`);
  });
  const row = byMarker(await listTabs(client), marker);
  if (!row) throw new SetUp(`SET-UP: no open tab for ?t5=${marker} — open the driver window first`);
  if (row.owner !== undefined) throw new SetUp(`SET-UP: ${row.tab} (?t5=${marker}) is held by ${JSON.stringify(row.owner)}`);
  const tab = await client.claim(row.tab);
  type Status = { build?: string; uptime: number; tabs?: Array<{ tab: string; tabId: number; owner?: string; url?: string }> };
  const before = (await client.status()) as Status;
  const mine = (before.tabs ?? []).find((t) => t.tab === tab.handle);
  const preHandles = (before.tabs ?? []).map((t) => t.tab);
  const maxPre = Math.max(0, ...preHandles.map((h) => Number(/^T(\d+)$/.exec(h)?.[1] ?? 0)));
  say(`daemon.status before: ${tab.handle} tabId ${mine?.tabId ?? "?"} owner ${JSON.stringify(mine?.owner ?? null)} url ${showUrl(mine?.url)}; ${preHandles.length} live handle(s), highest T${maxPre}; uptime ${before.uptime} ms; build ${(before.build ?? "?").slice(0, 12)}…`);
  const t0 = Date.now();
  say(`holding ${tab.handle} — quit Chrome now (chrome://quit), run MUX-8, relaunch; waiting up to ${holdS} s for the extension to go and come back`);
  const deadline = t0 + holdS * 1000;
  const upIndex = (): number => {
    const down = events.findIndex((e) => e.event === "extensionStatus" && e.params.connected === false);
    return down < 0 ? -1 : events.findIndex((e, i) => i > down && e.event === "extensionStatus" && e.params.connected === true);
  };
  let lastTick = Date.now();
  while (Date.now() < deadline && upIndex() < 0) {
    await sleep(500);
    if (Date.now() - lastTick >= 30_000) {
      lastTick = Date.now();
      say(`still holding (+${Math.round((Date.now() - t0) / 1000)} s; extension ${client.extensionConnected ? "connected" : "not connected"})`);
    }
  }
  if (upIndex() >= 0) {
    say(`extension back at +${Date.now() - started} ms; waiting up to 30 s for tabGone ${tab.handle}`);
    const until = Date.now() + 30_000;
    while (Date.now() < until && !events.some((e) => e.event === "tabGone" && e.params.tab === tab.handle)) await sleep(250);
    await sleep(10_000);
  }
  let snapshotAfter: { ok: true } | { ok: false; code: string; message: string };
  try {
    await client.call("snapshot", { tab: tab.handle });
    snapshotAfter = { ok: true };
    say(`snapshot ${tab.handle} after the restart → ok (a LIVE handle)`);
  } catch (err) {
    if (!(err instanceof BridgeError)) throw err;
    snapshotAfter = { ok: false, code: String(err.code), message: err.message };
    say(`snapshot ${tab.handle} after the restart → ${err.code}: ${err.message}`);
  }
  const listAfter = (await listTabs(client)).map((t) => ({ tab: t.tab, owner: t.owner }));
  say(`listTabs after: ${listAfter.length} tab(s); handles ${listAfter.map((t) => t.tab).join(", ") || "(none)"}; owned by ${who}: ${listAfter.filter((t) => t.owner === who).length}`);
  const after = (await client.status()) as Status;
  const elapsedMs = Date.now() - t0;
  say(`daemon.status after: uptime ${after.uptime} ms (+${after.uptime - before.uptime} ms over ${elapsedMs} ms); build ${(after.build ?? "?").slice(0, 12)}…; reconnected: ${reconnected ? "yes" : "no"}`);
  const v = sm1Verdict({
    tab: tab.handle,
    name: who,
    preHandles,
    fixtureUrl,
    events,
    snapshotAfter,
    listAfter,
    uptimeBeforeMs: before.uptime,
    uptimeAfterMs: after.uptime,
    elapsedMs,
    reconnected,
  });
  report(v, "SM-1", `exactly one tabGone ${tab.handle} (lastUrl ${fixtureUrl}); snapshot → TAB_GONE; no tab owned by ${who}; every handle above T${maxPre}; same daemon`);
}

/** SM-1's log clause: reads ~/.chrome-agent-bridge/daemon.log (no connect), prints only the matched lines. */
function sm1Log(): void {
  const since = sm1LogSince();
  const file = join(homedir(), ".chrome-agent-bridge", "daemon.log");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const t0 = Math.floor(Date.parse(since) / 1000) * 1000;
  for (const l of lines) {
    const m = /^(\S+) (extension session changed|extension resync)/.exec(l);
    if (m && Date.parse(m[1]!) >= t0) console.log(l);
  }
  report(sm1LogVerdict(lines, since), "SM-1 LOG", `one "extension session changed: <n> handles retired" (n ≥ 1, no marker value) since ${since}, the resync within 30 s`);
}

async function sm0(client: BridgeClient): Promise<void> {
  const holdS = sm0Hold();
  const events: SeenEvent[] = [];
  client.on("event", (m) => {
    const e = { event: m.event, params: (m.params ?? {}) as Record<string, unknown> };
    events.push(e);
    say(`event +${Date.now() - started} ms ${describeEvent(e)}`);
  });
  const tab = await openFixture(client, "sm0");
  say(`holding ${tab.handle} for ${holdS} s — run recipes/reload-extension.ps1 now`);
  for (let s = 0; s < holdS; s += 30) {
    await sleep(Math.min(30, holdS - s) * 1000);
    say(`still holding ${tab.handle} (+${Math.min(s + 30, holdS)} s; extension ${client.extensionConnected ? "connected" : "not connected"})`);
  }
  for (let i = 0; i < 30 && !client.extensionConnected; i++) await sleep(500);
  let snapshotAfter: { ok: true; elements: number } | { ok: false; error: string };
  try {
    const snap = await tab.snapshot();
    snapshotAfter = { ok: true, elements: snap.elements.length };
    say(`snapshot ${tab.handle} after the hold → ok (${snap.elements.length} elements), url ${snap.url === s6Url("sm0") ? snap.url : "<not the sm0 fixture url>"}`);
  } catch (err) {
    snapshotAfter = { ok: false, error: err instanceof BridgeError ? `${err.code}: ${err.message}` : String(err) };
    say(`snapshot ${tab.handle} after the hold → ${snapshotAfter.error}`);
  }
  const row = (await listTabs(client)).find((t) => t.tab === tab.handle);
  say(`listTabs: ${tab.handle} ${row ? `owner ${JSON.stringify(row.owner ?? null)}` : "absent"}`);
  const v = sm0Verdict({ tab: tab.handle, name: who, events, snapshotAfter, owner: row?.owner });
  await tab.close().catch(() => {});
  report(v, "SM-0", `the reload kept ${tab.handle}: no tabGone, the snapshot answered, still owned by ${who}`);
}

async function peek(client: BridgeClient): Promise<void> {
  const marker = peekMarker();
  const t = byMarker(await listTabs(client), marker);
  if (!t) throw new SetUp(`SET-UP: no open tab for ?t5=${marker}`);
  if (t.owner !== undefined) {
    say(`${t.tab} (?t5=${marker}) is held by ${JSON.stringify(t.owner)} — not peeked`);
    process.exitCode = 1;
    return;
  }
  const tab = await client.claim(t.tab);
  const snap = await tab.snapshot();
  const counter = snap.elements.find((e) => e.role === "button" && e.name.startsWith("Click counter"));
  await tab.release();
  say(`peek ${tab.handle} (?t5=${marker}, current: ${t.current ? "yes" : "no"}): ${counter ? `button ${JSON.stringify(counter.name)}` : "no counter button"}; released`);
}

async function daemonShutdown(client: BridgeClient): Promise<void> {
  const status = (await client.status()) as { build?: string; clients?: Array<{ name: string }> };
  const others = (status.clients ?? []).map((c) => c.name).filter((n) => n !== who);
  if (others.length > 0) throw new SetUp(`SET-UP: other clients are connected (${others.join(", ")}) — end them first; nothing sent`);
  await client.call("daemon.shutdown").catch((err: unknown) => {
    // The daemon may close the socket before it answers.
    if (!(err instanceof BridgeError && err.code === "NOT_CONNECTED")) throw err;
  });
  say(`daemon.shutdown sent (build ${status.build ?? "?"})`);
}

// ── REP-0 (added 2026-10-23, S6 resume, before its run — decisions.md · 2026-10-23 · A probe of the ──
// failure-report screenshot runs before any row that could attach a non-fixture tab (#97); the live
// verifier's MINOR-1: SDK-2/SDK-3's reports came back 180–190 ms after the call, where a switch capture
// took ~1.5 s in Runs 8/9). Rule: `rep0Verdict` (recipes/s6-rules.ts).

let rep0Dir: string | undefined;

/**
 * Run before connect(): the report's screenshot goes to a fresh directory under $S6_OUT (outside the
 * repo), via BRIDGE_FAILURES_DIR, so the user's ~/.chrome-agent-bridge/failures is never touched and
 * everything in that directory is this run's own.
 */
function rep0FailuresDir(): string {
  if (rep0Dir !== undefined) return rep0Dir;
  const out = process.env.S6_OUT?.trim();
  if (!out || !isAbsolute(out) || !existsSync(out)) throw new SetUp("SET-UP: rep0 needs $env:S6_OUT, an existing absolute directory outside the repo (the wave sheet's set-up)");
  const dir = join(out, `rep0-failures-${Date.now()}`);
  // The directory, not $S6_OUT, is checked: isInside(root, root) is false (export-file.ts), so S6_OUT = the
  // repo root itself would pass a check of S6_OUT (found by the builder's set-up dry run).
  if (isInside(REPO, dir)) throw new SetUp("SET-UP: $env:S6_OUT is inside the repo — the report PNG must be written outside it");
  if (existsSync(dir)) throw new SetUp(`SET-UP: ${dir} exists already — rerun for a fresh directory`);
  process.env.BRIDGE_FAILURES_DIR = dir;
  rep0Dir = dir;
  return dir;
}

/** The bar colour of a PNG by the hue rule (t5-png.ts `describeBar`, Run 9's rule), as name + line. */
function hue(buf: Buffer): { name: string; line: string } {
  try {
    return describeBar(buf);
  } catch (err) {
    return { name: "unreadable", line: `unreadable image (${err instanceof Error ? err.message : String(err)})` };
  }
}

const rel = (t: number | undefined, t0: number): string => (t === undefined ? "never" : `${t - t0 >= 0 ? "+" : ""}${Math.round(t - t0)} ms`);
const firstChange = (log: VisLog, state: string, from: number): number | undefined =>
  log.find((e) => e[2] === "change" && e[0] === state && e[1] >= from)?.[1];

/** Deletes every file in the run's own failures directory, then the directory; prints counts only. */
function rep0Cleanup(dir: string): void {
  if (!existsSync(dir)) {
    say(`failures directory: not created (nothing written)`);
    return;
  }
  const names = readdirSync(dir);
  for (const n of names) rmSync(join(dir, n), { force: true });
  rmdirSync(dir);
  say(`failures directory: ${names.length} file(s) deleted, directory removed`);
}

/**
 * REP-0. Set-up: the human's tab (current) must be the driver's `?t5=s6-human` fixture tab (the sheet's
 * step 5), else exit 2 with nothing opened. Opens its own probe tab `?s6=rep0` in the background, which
 * must be inactive and in the human tab's window (a capture that fails to switch then can only show the
 * fixture on screen, never a tab of the user's). Bars and visibility logs go in by `evaluate` (CDP: the
 * "debugging this browser" banner shows while each runs), on both tabs, as t5.ts screen1 does.
 * Order: (1) the analysis control — a capture of the human tab, which is on screen, so nothing switches —
 * must read blue; (2) the probe — the report of an attach-set failure on the background probe tab, the
 * first capture that switches to it, as in SDK-2/SDK-3 (a freshly opened tab), with no earlier
 * switch's restore in flight; (3) the positive control — an explicit default-mode `tab.screenshot()` of
 * the same background probe tab (known to switch, R9-SCREEN-1), judged by the same rule. The report PNG
 * is read and deleted at once; the control images stay in memory. Closes only its probe tab.
 */
async function rep0(client: BridgeClient): Promise<void> {
  const dir = rep0FailuresDir();
  // Everything after the directory is chosen runs inside the try, so the probe tab (once newTab returned)
  // is closed and the run's directory emptied and removed on every path, a failed waitFor included
  // (S6 fixer 2, verifier r2 MINOR-2).
  let opened: Tab | undefined;
  try {
    say(`connected — daemon build ${client.welcome?.build ?? "?"}, extension ${client.extensionConnected ? "connected" : "not connected"}; failure reports on, BRIDGE_FAILURES_DIR = ${dir}`);
    const human = (await listTabs(client)).find((t) => t.current === true);
    if (!human || human.url !== urlOf("s6-human")) {
      throw new SetUp("SET-UP: the human's tab (current) is not the ?t5=s6-human fixture — run the sheet's step 5 (Set-T5Foreground $Ws.Hwnd; B1) and retry; nothing opened");
    }
    if (human.owner !== undefined) throw new SetUp(`SET-UP: the s6-human tab ${human.tab} is held by ${JSON.stringify(human.owner)} — end that client first; nothing opened`);
    // openFixture, inlined so the handle is kept before its waitFor can throw.
    const probeUrl = s6Url("rep0");
    const probe = await client.newTab(probeUrl);
    opened = probe;
    say(`opened ${probe.handle} (background) at ${probeUrl}`);
    await probe.waitFor({ text: "Agent Bridge E2E Playground" });
    const row = (await listTabs(client)).find((t) => t.tab === probe.handle);
    if (!row) throw new SetUp(`SET-UP: the probe tab ${probe.handle} is not listed`);
    if (row.active) throw new SetUp(`SET-UP: the probe tab ${probe.handle} is active in its window — it must be in the background; nothing measured`);
    if (row.windowId !== human.windowId) throw new SetUp(`SET-UP: the probe tab ${probe.handle} opened in another window than the s6-human tab — nothing measured`);
    say(`human ${human.tab} (?t5=s6-human, current); probe ${probe.handle} (background, same window, leased to ${who})`);
    const hState = await evalJson<string>(client, human.tab, barExpression(COLOURS[REP0_HUMAN_COLOUR], "REP-0 HUMAN"));
    const pState = await evalJson<string>(client, probe.handle, barExpression(COLOURS.magenta, "REP-0 PROBE"));
    say(`bars: human ${human.tab} ${REP0_HUMAN_COLOUR} (visibilityState ${hState}); probe ${probe.handle} magenta (visibilityState ${pState})`);
    if (hState !== "visible") throw new SetUp("SET-UP: the s6-human tab is not visible — the driver's window is minimized or covered (Set-T5Topmost $Ws.Hwnd) — nothing measured");
    if (pState !== "hidden") throw new SetUp(`SET-UP: the probe tab reads ${pState}, not hidden — nothing measured`);

    // (1) Analysis control: the human tab, on screen (no switch).
    let humanColour: string | undefined;
    let humanError: string | undefined;
    try {
      const { dataUrl } = (await client.call("screenshot", { tab: human.tab })) as { dataUrl: string };
      const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
      const h = hue(buf);
      humanColour = h.name;
      say(`control A (the human tab ${human.tab}, on screen): ${buf.length} bytes, ${h.line} (expected ${REP0_HUMAN_COLOUR}; kept in memory only)`);
    } catch (err) {
      humanError = err instanceof BridgeError ? `${err.code}: ${err.message}` : String(err);
      say(`control A (the human tab ${human.tab}): screenshot → ${humanError}`);
    }
    await sleep(1000);

    // (2) The probe: an attach-set failure on the background probe tab, failure reports on.
    await evalJson(client, human.tab, VISLOG_INSTALL);
    await evalJson(client, probe.handle, VISLOG_INSTALL);
    await sleep(500);
    const t0 = Date.now();
    const err = await expectError("click", () => probe.click({ ...REP0_LOCATOR }));
    const t1 = Date.now();
    say(`click {role:"button", name:"No such button"} → ${err.code}: ${err.message.split("\n")[0]} (${t1 - t0} ms, report included)`);
    const shot = err.screenshotPath;
    const attachErrors = err.attachErrors ?? [];
    say(`screenshotPath: ${shot ?? "(none)"}; attachErrors: ${JSON.stringify(attachErrors)}`);
    await sleep(2500);
    const hl = await evalJson<VisLog>(client, human.tab, VISLOG_READ);
    const pl = await evalJson<VisLog>(client, probe.handle, VISLOG_READ);
    let reportColour: string | undefined;
    if (shot !== undefined && existsSync(shot)) {
      const buf = readFileSync(shot);
      const h = hue(buf);
      reportColour = h.name;
      rmSync(shot, { force: true });
      say(`report PNG: ${buf.length} bytes, ${h.line} (expected ${REP0_PROBE_COLOUR}); deleted: ${existsSync(shot) ? "no" : "yes"}`);
    } else if (shot !== undefined) say("report PNG: the named file does not exist");
    const pVis = firstChange(pl, "visible", t0 - REP0_SLACK_MS);
    const pHid = pVis === undefined ? undefined : firstChange(pl, "hidden", pVis);
    const hHid = firstChange(hl, "hidden", t0 - REP0_SLACK_MS);
    const hVis = hHid === undefined ? undefined : firstChange(hl, "visible", hHid);
    say(`report call: probe ${probe.handle} visible ${rel(pVis, t0)}, hidden again ${rel(pHid, t0)}; human ${human.tab} hidden ${rel(hHid, t0)}, visible again ${rel(hVis, t0)} → flash ${hHid !== undefined && hVis !== undefined ? `${Math.round(hVis - hHid)} ms` : "?"} (informational; call ${t1 - t0} ms)`);
    const mid = (await listTabs(client)).filter((t) => t.tab === human.tab || t.tab === probe.handle);
    const hNow = mid.find((t) => t.tab === human.tab);
    const pNow = mid.find((t) => t.tab === probe.handle);
    say(`after the report: human ${hNow?.active ? "active" : "not active"}${hNow?.current ? ", current" : ""}; probe ${pNow?.active ? "active" : "background"} (informational)`);

    // (3) Positive control: an explicit default-mode screenshot of the same background probe tab.
    await evalJson(client, human.tab, VISLOG_INSTALL);
    await evalJson(client, probe.handle, VISLOG_INSTALL);
    await sleep(1000);
    let controlColour: string | undefined;
    let controlError: string | undefined;
    const c0 = Date.now();
    try {
      const buf = await probe.screenshot();
      const h = hue(buf);
      controlColour = h.name;
      say(`control B (tab.screenshot() of the background probe ${probe.handle}): ${buf.length} bytes, ${h.line} (expected ${REP0_PROBE_COLOUR}; kept in memory only)`);
    } catch (e) {
      controlError = e instanceof BridgeError ? `${e.code}: ${e.message.split("\n")[0]}` : String(e);
      say(`control B: tab.screenshot() → ${controlError}`);
    }
    const c1 = Date.now();
    await sleep(2500);
    const hl2 = await evalJson<VisLog>(client, human.tab, VISLOG_READ);
    const pl2 = await evalJson<VisLog>(client, probe.handle, VISLOG_READ);
    const cVis = firstChange(pl2, "visible", c0 - REP0_SLACK_MS);
    const cHid = firstChange(hl2, "hidden", c0 - REP0_SLACK_MS);
    const cHVis = cHid === undefined ? undefined : firstChange(hl2, "visible", cHid);
    say(`control B call: ${c1 - c0} ms; probe visible ${rel(cVis, c0)}; human hidden ${rel(cHid, c0)}, visible again ${rel(cHVis, c0)} (informational)`);

    const v = rep0Verdict({
      report: { t0, t1, code: String(err.code), screenshotPath: shot, attachErrors, probeVis: pl, pngColour: reportColour },
      control: { t0: c0, t1: c1, probeVis: pl2, pngColour: controlColour, error: controlError },
      human: { pngColour: humanColour, error: humanError },
    });
    for (const w of v.why) say(`  - ${w}`);
    if (v.result === "PASS") {
      say(`REP-0 PASS — the report's capture switched to the failed tab (visible ${rel(pVis, t0)} inside the ${t1 - t0} ms call) and its PNG shows the probe's ${REP0_PROBE_COLOUR} bar; controls: the explicit screenshot switched and read ${REP0_PROBE_COLOUR}, the human tab read ${REP0_HUMAN_COLOUR}`);
    } else if (v.result === "FAIL") {
      say(`REP-0 FAIL — ${v.why.join("; ")}`);
      process.exitCode = 1;
    } else {
      say(`REP-0 NOT DISCRIMINATING — ${v.why.join("; ")}`);
      process.exitCode = 3;
    }
  } finally {
    if (opened !== undefined) {
      await opened.close().catch(() => {});
      say(`closed ${opened.handle} (the probe tab)`);
    }
    rep0Cleanup(dir);
  }
}

const COMMANDS: Record<string, (c: BridgeClient) => Promise<void>> = {
  "stale-check": staleCheck,
  sdk2,
  sdk3,
  sdk4,
  sdk5,
  sm0,
  sm1,
  peek,
  "daemon-shutdown": daemonShutdown,
  "close-bb-tab": closeBbTab,
  rep0,
};

async function main(): Promise<void> {
  if (command === "--help" || command === "-h" || command === "help") {
    console.log(HELP);
    return;
  }
  if (command === "sm1-log") {
    who = "s6-sm1-log";
    sm1Log();
    return;
  }
  const fn = COMMANDS[command];
  if (!fn) {
    console.log(HELP);
    throw new SetUp(`SET-UP: unknown command ${JSON.stringify(command)}`);
  }
  who = `s6-${command}`;
  PRECHECKS[command]?.();
  // close-bb-tab acts on a Blackboard tab: failure reports off, as in the Blackboard recipes, so no
  // report could ever save a screenshot or snapshot of it (added 2026-10-23 by S6 builder r2, #97's row
  // audit; no printed line changes).
  const client = await connect({ name: who, ...(command === "close-bb-tab" ? { failureReports: false } : {}) });
  try {
    await fn(client);
  } finally {
    client.close();
  }
}

main().catch((err: unknown) => {
  if (err instanceof SetUp) {
    say(`FAILED — ${err.message}`);
    process.exitCode = 2;
    return;
  }
  if (err instanceof BridgeError) {
    say(`FAILED — ${err.code}: ${err.message}`);
    // MINOR-3 (S6 fixer r1): a bridge error before locate is neither NEW BUILD nor STALE.
    if (command === "stale-check") say("STALE-CHECK FAILED — a bridge error before locate answered: neither NEW BUILD nor STALE — STOP the live part and report");
    if (typeof err.report === "function") printReport(err.report().split("\n"));
  } else say(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});

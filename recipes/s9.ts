// recipes/s9.ts — the SDK side of Step 9's live wave (Run 13; docs/e2e-test-plan.md §4.20, wave sheet
// docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md). Written 2026-10-24 by the S4 prep builder,
// before the Step 9 build was loaded; not run against Chrome by its author (the runner's first steps are its live
// smoke). Pass rules are pure, in recipes/s9-rules.ts (dry-run by recipes/test/s9-rules.test.ts).
//
//   npm run -s recipe -- recipes/s9.ts <command> [args]     (or: node --import tsx recipes/s9.ts …)
//
//   id                         this extension's id and its options URL (from the path of extension/)
//   setup                      find the driver window's tab (?s9=w), title it "S9 W human tab"; open own background
//                              tabs a (8080), c (8081), b5 (8080), t4 (8080); write $S9_OUT/state.json
//   perf --label <l> [--n 20]  SAFE-PERF: n snapshot round trips on tab a; median/min/max (record)
//   safe0                      SAFE-0: daemon.status safety reported; navigate a → own options page → DOMAIN_BLOCKED
//   probe [--row R]            daemon.status: safety tuple, extensionConnected, rows with url (counts)
//   wait-safety --armed <b> [--evaluate <b>] [--count <n>] [--timeout <ms>] [--row R]
//                              poll daemon.status (100 ms) until the safety tuple matches; prints the elapsed ms
//   call <ROW> <step> <op> [args] [--expect <E>]
//                              one bridge call, printed as `ROW <ROW> <step> <ok|CODE> <message> [data …] (<ms> ms)`
//                              and judged against E (s9-rules `parseExpect`) as `CHECK …`. Ops:
//                                snapshot <t> | evaluate <t> [expr] | evaluate-asref <t> | click-counter <t> |
//                                screenshot <t> [cdp] | navigate <t> <url> | newtab <url> [--as <key>] | focus <t> | close <t> |
//                                tabs | status | network [--filter f] [--tab t] | download <url> | chunk <id> |
//                                read-input <t> | waitfor-text <t> <text>
//                              <t>: a key of state.json (w a c b5 t4 …), a handle T<n>, or `blocked1` (the one
//                              listTabs row hidden "blocked"); <url> `own-options` = this extension's options page
//   safe4a | safe4c            SAFE-4 (a) waitFor {locator} 20 s / SAFE-4c waitFor {seconds:30}: writes
//                              $S9_OUT/<row>.ready, the driver presses OFF (s9-win.ps1 Invoke-S9PressWhenReady)
//   safe4-type [--n 1000]      SAFE-4 (b): trusted type of n chars into #trusted-input on t4; same protocol
//   safe4b                     SAFE-4b: client A's screenshot holds the lock, client B's queued; OFF while B waits
//   pop1                       SAFE-POP-1: the opener rule's leaseGranted still arrives (link "Open popup" on a)
//   cap1                       SAFE-CAP-1 (record): a default screenshot while the driver switches the window's tab
//   nonce                      a fresh 8-hex nonce (SAFE-8's query strings)
//   scan-log --since <iso> [--copy <file>]   SAFE-10: counts over daemon.log lines since <iso>; --copy writes them
//                              to <file> only when every count is 0
//   scan-file <file> --mode daemon|console|console-s16|committed   counts over a file (the worker console capture, a
//                              file to commit); console-s16 = Run 14's R14-LOGS rule (S1.6: every count 0, whoever
//                              wrote the line; prep fixer r1, F2)
//   wait-alone [--timeout <ms>] [--row R]   poll daemon.status until this probe is the only client (an ended
//                              actor's leases die with its connection; SAFE-5d, prep fixer r1)
//   mcp-config <file>          the MCP config for recipes/s9-actor.ts (only chrome-agent-bridge, no token)
//   cleanup                    close every tab state.json says this script opened; then lists the opened handles
//                              still listed (`cleanup: still listed …`), the keys named, so the driver can close
//                              a refused one by UIA (R14-TEARDOWN, prep fixer r1 N1)
//   daemon-shutdown            stop the daemon (refused while any other client is connected)
//
// Run 14 (Step 10 S1, docs/e2e-test-plan.md §4.21, wave sheet docs/plans/2026-10-24-step10-step8-follow-ups-steps/
// S1-wave-sheet.md; added 2026-10-25 by the S1 prep builder, before any R14 row ran):
//   call … navigate-class <t> <url>   R14-REL-3: navigate, then print the tab's URL CLASS (wrapper, inner scheme,
//                              own page yes/no), never the URL; `rel-snap` (--expect BLOCKED:own) when own=yes or hidden
//   call … download-file <url> [--file <name>]   R14-5c: the SDK's downloadToFile into $S9_OUT/r14-dl/<name>, then
//                              whether the file (or its .part) exists
//   pop14                      R14-POP-1: claim tab a FIRST (the claim line precedes the click), then the click
//   r14-type [--delay-ms <d>]  R14-4b: SAFE-4 (b)'s type + the banner record (from the driver's poll file) + a
//                              trusted follow-up on the same tab after the re-arm
//   redirect-probe [--port 8083] [--n 2] [--row R]   R14-5c's positive control: an idle socket held open, then n
//                              concurrent GETs (redirect: manual), each must answer 302 within 1 s
//   server-logs --log8083 <f> --log8081 <f> [--row R]   R14-5c's server-log counts (s14=5c1, s14=5c2)
//   rect-check --file <json> [--row R] [--step S]   R14-3's placement rule over rects s9-win.ps1 measured
//   rect-check --file <json> --attempt <n>   S1 wave fixer (Return 2): one try of the placement order — `ROW R14-3
//                              placement-attempt-<n> …` + `PLACEMENT attempt <n> on work area […]: free|not free — …`
//                              (a record, no CHECK line); exit 1 = not free
//   placement-order --file <json>   S1 wave fixer (Return 2): `PLACEMENT order <n>: […] …` — W's monitor work area
//                              first, then the others in the system's order (s9-rules `placementOrder`)
//                              round 2: JSON {wWork, work, shell}; each area cut above any shell taskbar intersecting
//                              it (`PLACEMENT work area […] cut to y=<n> by taskbar class=…`, s9-rules `taskbarCut`)
//   park-point --rect <l,t,r,b>   round 3 (after Return 3): the fixed cursor park point in W's page area (s9-rules
//                              `parkPoint`); rect-check also prints `OCCLUDER <i> …` and `CURSOR at (x,y)` lines when
//                              there is an occluder (diagnostics only, `placementDiagnostics`)
//   wait-safety … --guard      as wait-safety, but "not reached" is a STOP line (exit 2)
//
// It never prints the token, a non-fixture URL or title, or a block-list pattern read from Chrome; listTabs,
// daemon.status and the network log are printed as counts. Exit: 0 every CHECK passed, 1 a CHECK failed, 2 a STOP
// (a set-up guard or any throw: one line beginning `STOP:`, #193 — Run 14 makes every throw a STOP; Run 13 printed
// `FAILED — …` and exited 1 for a bridge error that escaped), 3 not discriminating / not measured.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { connect as netConnect } from "node:net";
import { BridgeError, connect, downloadToFile, type BridgeClient } from "@bridge/sdk";
import {
  bannerLifetime,
  bannerLine,
  classStepVerdict,
  concurrentVerdict,
  followUpVerdict,
  logHits,
  parkPoint,
  placementAttemptLine,
  placementDiagnostics,
  placementLine,
  placementOrder,
  placementVerdict,
  rectText,
  taskbarCut,
  taskbarCutLine,
  type Rect,
  type ShellWindow,
  R14,
  rerunDelayMs,
  scrubAll,
  serverLogLine,
  serverLogVerdict,
  stopLine,
  urlClass,
  urlClassLine,
  type BannerSample,
  type Placement,
  checkLine,
  consoleHits,
  consoleVerdict,
  consoleVerdictS16,
  EXPECT,
  extensionIdFromPath,
  FIXTURE_8080,
  FIXTURE_8081,
  judge,
  lockVerdict,
  logLinesSince,
  mcpConfig,
  median,
  networkLine,
  ownOptionsUrl,
  parseExpect,
  rowLine,
  s9Url,
  safetyTupleLine,
  scanCounts,
  scanLine,
  scanVerdict,
  scrubMessage,
  showUrl,
  snapshotFacts,
  statusLine,
  summarizeNetwork,
  summarizeStatus,
  summarizeTabs,
  tabsLine,
  typeVerdict,
  r14TypeVerdict,
  visibleSince,
  W_TITLE,
  waitDisarmVerdict,
  type Expect,
  type Outcome,
  type SafetyTuple,
  type TabRow,
  type Verdict,
} from "./s9-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OWN_ID = extensionIdFromPath(join(REPO, "extension"));
const OUT = process.env.S9_OUT?.trim() || join(tmpdir(), "bridge-e2e", "s9");
const STATE = join(OUT, "state.json");
const [command = "--help", ...rest] = process.argv.slice(2);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const iso = (): string => new Date().toISOString();
const say = (msg: string): void => console.log(`${iso()} ${msg}`);

class SetUp extends Error {}

function option(flag: string): string | undefined {
  const i = rest.indexOf(flag);
  return i >= 0 ? rest[i + 1] : undefined;
}

/** Positional args: `rest` without `--flag value` pairs. */
function positional(): string[] {
  const out: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      i++;
      continue;
    }
    out.push(rest[i]);
  }
  return out;
}

let failed = false;
let notMeasured = false;

function check(id: string, step: string, o: Outcome, e: Expect): boolean {
  const j = judge(o, e);
  if (e !== "record") {
    say(checkLine(id, step, j));
    if (!j.pass) failed = true;
  }
  return j.pass;
}

function verdict(id: string, step: string, v: Verdict): void {
  if (v.notDiscriminating) {
    say(`CHECK ${id} ${step} NOT DISCRIMINATING — ${v.why.join("; ")}`);
    notMeasured = true;
  } else {
    say(`CHECK ${id} ${step} ${v.pass ? "PASS" : "FAIL"} — ${v.why.join("; ")}`);
    if (!v.pass) failed = true;
  }
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────

interface State {
  id: string;
  tabs: Record<string, string>;
  opened: string[];
  at: string;
}

function loadState(): State {
  if (!existsSync(STATE)) throw new SetUp(`SET-UP: no ${STATE} — run \`s9.ts setup\` first`);
  return JSON.parse(readFileSync(STATE, "utf8")) as State;
}

function saveState(s: State): void {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}

function noteOpened(handle: string): void {
  const s = existsSync(STATE) ? loadState() : { id: OWN_ID, tabs: {}, opened: [], at: iso() };
  if (!s.opened.includes(handle)) s.opened.push(handle);
  saveState(s);
}

// ── bridge helpers ────────────────────────────────────────────────────────────────────────────────────────

async function client(name: string): Promise<BridgeClient> {
  return connect({ name, failureReports: false });
}

async function attempt(fn: () => Promise<unknown>): Promise<{ o: Outcome; result: unknown }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { o: { ok: true, ms: Date.now() - t0 }, result };
  } catch (err) {
    if (err instanceof BridgeError) return { o: { ok: false, code: String(err.code), message: err.message, data: err.data, ms: Date.now() - t0 }, result: undefined };
    return { o: { ok: false, code: "SCRIPT", message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 }, result: undefined };
  }
}

async function listRows(c: BridgeClient): Promise<TabRow[]> {
  const r = (await c.call("listTabs")) as { tabs?: TabRow[] };
  return Array.isArray(r?.tabs) ? r.tabs : [];
}

/** A tab argument → a handle: a state key, a handle `T<n>`, or `blocked1`. */
async function resolveTab(c: BridgeClient, arg: string | undefined): Promise<string> {
  if (!arg) throw new SetUp("SET-UP: a tab argument is required");
  if (/^T\d+$/.test(arg)) return arg;
  if (arg === "blocked1") {
    const hidden = (await listRows(c)).filter((r) => r.hidden === "blocked");
    if (hidden.length !== 1 || !hidden[0].tab) throw new SetUp(`SET-UP: expected exactly 1 listTabs row hidden "blocked", found ${hidden.length}`);
    return hidden[0].tab;
  }
  const h = loadState().tabs[arg];
  if (!h) throw new SetUp(`SET-UP: no tab "${arg}" in ${STATE}`);
  return h;
}

function resolveUrl(arg: string | undefined): string {
  if (!arg) throw new SetUp("SET-UP: a url argument is required");
  return arg === "own-options" ? ownOptionsUrl(OWN_ID) : arg;
}

/** The listTabs row of `handle`, as a printable fact: its url (fixture/own only), or its hidden marker. */
async function rowFact(c: BridgeClient, handle: string): Promise<string> {
  const row = (await listRows(c)).find((r) => r.tab === handle);
  if (!row) return `${handle} not listed`;
  if (row.hidden) return `${handle} hidden=${row.hidden}`;
  return `${handle} url ${showUrl(row.url, OWN_ID)}`;
}

async function safetyNow(c: BridgeClient): Promise<SafetyTuple | null> {
  return summarizeStatus(await c.call("daemon.status")).safety;
}

async function waitSafety(c: BridgeClient, want: Partial<SafetyTuple>, timeoutMs: number): Promise<{ ok: boolean; ms: number; last: SafetyTuple | null }> {
  const t0 = Date.now();
  let last: SafetyTuple | null = null;
  for (;;) {
    last = await safetyNow(c);
    const okNow =
      last !== null &&
      (want.armed === undefined || last.armed === want.armed) &&
      (want.evaluate === undefined || last.evaluate === want.evaluate) &&
      (want.blockedCount === undefined || last.blockedCount === want.blockedCount);
    if (okNow) return { ok: true, ms: Date.now() - t0, last };
    if (Date.now() - t0 > timeoutMs) return { ok: false, ms: Date.now() - t0, last };
    await sleep(100);
  }
}

function readyFile(row: string): string {
  return join(OUT, `${row}.ready`);
}
function pressedFile(row: string): string {
  return join(OUT, `${row}.pressed`);
}

function resetSignals(row: string): void {
  mkdirSync(OUT, { recursive: true });
  rmSync(readyFile(row), { force: true });
  rmSync(pressedFile(row), { force: true });
}

function signalReady(row: string): void {
  writeFileSync(readyFile(row), iso());
  say(`READY ${row} (${readyFile(row)})`);
}

async function readPressed(row: string, waitMs = 5000): Promise<string | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < waitMs) {
    if (existsSync(pressedFile(row))) {
      const t = readFileSync(pressedFile(row), "utf8").trim();
      if (t) return t;
    }
    await sleep(50);
  }
  return null;
}

async function waitLoaded(c: BridgeClient, handle: string): Promise<void> {
  await c.call("waitFor", { tab: handle, text: "Agent Bridge E2E Playground" }, { timeoutMs: 20_000 });
}

async function openTab(c: BridgeClient, url: string): Promise<string> {
  const r = (await c.call("newTab", { url })) as { tab?: string };
  if (!r?.tab) throw new Error("newTab answered without a handle");
  noteOpened(r.tab);
  await waitLoaded(c, r.tab);
  return r.tab;
}

async function evalValue(c: BridgeClient, handle: string, expression: string): Promise<unknown> {
  // S4 runner set-up fix (2026-10-24, block 30): the extension wraps an expression that contains `return` in an
  // async function body, so SAFE-4b's VISLOG IIFE came back kind "undefined" (t5-lib.ts evalJson's 2026-10-22 fix);
  // `return (<expr>);` makes the value the body's return value in every case.
  const env = (await c.call("evaluate", { tab: handle, expression: `return (${expression});`, timeoutMs: 10_000 }, { timeoutMs: 15_000 })) as { kind?: string; value?: unknown };
  if (env?.kind !== "json") throw new Error(`evaluate returned kind ${String(env?.kind)}`);
  return env.value;
}

// ── commands ──────────────────────────────────────────────────────────────────────────────────────────────

async function cmdId(): Promise<void> {
  say(`extension id ${OWN_ID} · options ${ownOptionsUrl(OWN_ID)}`);
}

async function cmdSetup(): Promise<void> {
  const c = await client("s9-setup");
  try {
    const rows = await listRows(c);
    const wUrl = s9Url(FIXTURE_8080, "w");
    const w = rows.filter((r) => r.url === wUrl);
    if (w.length !== 1 || !w[0].tab) throw new SetUp(`SET-UP: expected exactly 1 tab at ${wUrl} (the driver window), found ${w.length}`);
    const wh = w[0].tab;
    const t = await evalValue(c, wh, `(document.title = ${JSON.stringify(W_TITLE)})`);
    say(`driver tab w = ${wh} (${w[0].current ? "current" : "NOT current"}), title set to ${JSON.stringify(t)}`);
    const state: State = { id: OWN_ID, tabs: { w: wh }, opened: [], at: iso() };
    saveState(state);
    for (const [key, origin] of [
      ["a", FIXTURE_8080],
      ["c", FIXTURE_8081],
      ["b5", FIXTURE_8080],
      ["t4", FIXTURE_8080],
    ] as const) {
      const h = await openTab(c, s9Url(origin, key));
      const s = loadState();
      s.tabs[key] = h;
      saveState(s);
      say(`opened ${key} = ${h} (background) at ${s9Url(origin, key)}`);
    }
    say(`state written to ${STATE}`);
  } finally {
    c.close();
  }
}

async function cmdPerf(): Promise<void> {
  const label = option("--label") ?? "run";
  const n = Number(option("--n") ?? "20");
  const c = await client("s9-perf");
  try {
    const a = await resolveTab(c, "a");
    await c.call("snapshot", { tab: a }); // warm-up (content script injected), not counted
    const ms: number[] = [];
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      await c.call("snapshot", { tab: a });
      ms.push(performance.now() - t0);
    }
    const r = (x: number): string => x.toFixed(1);
    say(`ROW SAFE-PERF ${label} ok snapshot round trip on ${a}: median ${r(median(ms))} ms, min ${r(Math.min(...ms))} ms, max ${r(Math.max(...ms))} ms, n ${n} (record)`);
  } finally {
    c.close();
  }
}

async function cmdSafe0(): Promise<void> {
  const c = await client("s9-safe0");
  try {
    const w = await waitSafety(c, {}, 10_000);
    say(`ROW SAFE-0 safety ${safetyTupleLine(w.last)} (reported after ${w.ms} ms of polling)`);
    if (!w.ok) {
      say("CHECK SAFE-0 safety FAIL — daemon.status.safety still null after 10 s (a pre-Step-9 extension, or no safetyState sent)");
      failed = true;
    } else say("CHECK SAFE-0 safety PASS — daemon.status.safety reported (only a Step 9 extension sends safetyState)");
    const a = await resolveTab(c, "a");
    const { o } = await attempt(() => c.call("navigate", { tab: a, url: ownOptionsUrl(OWN_ID) }));
    say(rowLine("SAFE-0", "navigate-own-options", o, OWN_ID));
    check("SAFE-0", "navigate-own-options", o, "BLOCKED:ext");
    const fact = await rowFact(c, a);
    const unchanged = fact === `${a} url ${s9Url(FIXTURE_8080, "a")}`;
    say(`ROW SAFE-0 url-after ${fact}`);
    say(checkLine("SAFE-0", "url-after", unchanged ? { pass: true, why: "tab a still on its fixture URL" } : { pass: false, why: "tab a moved" }));
    if (!unchanged) failed = true;
  } finally {
    c.close();
  }
}

async function cmdProbe(): Promise<void> {
  const row = option("--row") ?? "PROBE";
  const c = await client("s9-probe");
  try {
    say(`ROW ${row} status ${statusLine(summarizeStatus(await c.call("daemon.status")))}`);
  } finally {
    c.close();
  }
}

/** A flag with no value (`--guard`): `option()` would take the next token as its value. */
function flag(name: string): boolean {
  return rest.includes(name);
}

function boolOpt(flag: string): boolean | undefined {
  const v = option(flag);
  if (v === undefined) return undefined;
  if (v !== "true" && v !== "false") throw new SetUp(`SET-UP: ${flag} takes true|false`);
  return v === "true";
}

async function cmdWaitSafety(): Promise<void> {
  const row = option("--row") ?? "WAIT";
  const want: Partial<SafetyTuple> = {};
  const a = boolOpt("--armed");
  const e = boolOpt("--evaluate");
  if (a !== undefined) want.armed = a;
  if (e !== undefined) want.evaluate = e;
  if (option("--count") !== undefined) want.blockedCount = Number(option("--count"));
  const timeout = Number(option("--timeout") ?? "5000");
  const c = await client("s9-wait");
  try {
    const w = await waitSafety(c, want, timeout);
    say(`ROW ${row} wait-safety ${w.ok ? "reached" : "NOT reached"} ${safetyTupleLine(w.last)} after ${w.ms} ms (wanted ${JSON.stringify(want)})`);
    // Run 14: --guard makes a precondition of the next row a STOP (#193) instead of a CHECK-style exit 1.
    if (!w.ok && flag("--guard")) throw new SetUp(`${row}: the safety state did not reach ${JSON.stringify(want)} within ${timeout} ms`);
    if (!w.ok) failed = true;
  } finally {
    c.close();
  }
}

/** Until this probe is the daemon's only client: an ended MCP actor's leases die with its connection (leases.ts). */
async function cmdWaitAlone(): Promise<void> {
  const row = option("--row") ?? "WAIT";
  const timeout = Number(option("--timeout") ?? "10000");
  const c = await client("s9-wait-alone");
  try {
    const t0 = Date.now();
    let n = -1;
    for (;;) {
      const st = (await c.call("daemon.status")) as { clients?: unknown[] };
      n = Array.isArray(st?.clients) ? st.clients.length : -1;
      if (n === 1 || Date.now() - t0 > timeout) break;
      await sleep(100);
    }
    say(`ROW ${row} wait-alone ${n === 1 ? "reached" : "NOT reached"} clients=${n} after ${Date.now() - t0} ms`);
    if (n !== 1) throw new SetUp(`SET-UP: ${n} clients still connected after ${timeout} ms (an actor did not end)`);
  } finally {
    c.close();
  }
}

async function cmdCall(): Promise<void> {
  const [id, step, op, ...args] = positional();
  if (!id || !step || !op) throw new SetUp("SET-UP: call <ROW> <step> <op> [args] [--expect E]");
  const e = parseExpect(option("--expect") ?? "record");
  const c = await client(`s9-${id.toLowerCase()}`);
  try {
    let detail = "";
    let res: { o: Outcome; result: unknown };
    switch (op) {
      case "snapshot": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => c.call("snapshot", { tab: t }));
        if (res.o.ok) {
          const f = snapshotFacts(res.result);
          detail = `${t} elements=${f.elements} counter=${f.counter === null ? "none" : JSON.stringify(f.counter)}`;
        }
        break;
      }
      case "evaluate": {
        const t = await resolveTab(c, args[0]);
        const expression = args[1] ?? "1+1";
        res = await attempt(() => c.call("evaluate", { tab: t, expression, timeoutMs: 10_000 }, { timeoutMs: 15_000 }));
        if (res.o.ok) {
          const env = res.result as { kind?: string; value?: unknown };
          detail = `${t} kind=${String(env?.kind)}${typeof env?.value === "number" || typeof env?.value === "boolean" ? ` value=${String(env.value)}` : ""}`;
        }
        break;
      }
      case "evaluate-asref": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => c.call("evaluate", { tab: t, expression: "document.getElementById('counter')", asRef: true, timeoutMs: 10_000 }, { timeoutMs: 15_000 }));
        if (res.o.ok) detail = `${t} ref=${String((res.result as { ref?: unknown })?.ref)}`;
        break;
      }
      case "click-counter": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => c.call("click", { tab: t, locator: { role: "button", name: "Click counter" } }));
        if (res.o.ok) {
          const after = await attempt(() => c.call("snapshot", { tab: t }));
          detail = after.o.ok ? `${t} counter now ${JSON.stringify(snapshotFacts(after.result).counter)}` : `${t} (follow-up snapshot ${after.o.code})`;
        }
        break;
      }
      case "screenshot": {
        const t = await resolveTab(c, args[0]);
        const params: Record<string, unknown> = { tab: t };
        if (args[1] === "cdp") params.mode = "cdp";
        res = await attempt(() => c.call("screenshot", params, { timeoutMs: 40_000 }));
        if (res.o.ok) detail = `${t} image ${String((res.result as { dataUrl?: string })?.dataUrl ?? "").length} chars`;
        break;
      }
      case "navigate": {
        const t = await resolveTab(c, args[0]);
        const url = resolveUrl(args[1]);
        res = await attempt(() => c.call("navigate", { tab: t, url }, { timeoutMs: 40_000 }));
        detail = await rowFact(c, t);
        if (!res.o.ok) say(`ROW ${id} ${step}-after ${detail}`);
        break;
      }
      case "newtab": {
        const url = resolveUrl(args[0]);
        const before = (await listRows(c)).length;
        res = await attempt(() => c.call("newTab", { url }));
        const after = (await listRows(c)).length;
        const h = res.o.ok ? (res.result as { tab?: string })?.tab : undefined;
        if (h) {
          noteOpened(h);
          const as = option("--as");
          if (as) {
            const s = loadState();
            s.tabs[as] = h;
            saveState(s);
          }
        }
        detail = `${h ?? ""} tabs before=${before} after=${after}`.trim();
        if (!res.o.ok) say(`ROW ${id} ${step}-after tabs before=${before} after=${after}`);
        break;
      }
      case "focus": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => c.call("focusTab", { tab: t }));
        detail = t;
        break;
      }
      case "close": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => c.call("closeTab", { tab: t }));
        detail = t;
        break;
      }
      case "tabs": {
        res = await attempt(() => listRows(c));
        if (res.o.ok) detail = tabsLine(summarizeTabs(res.result as TabRow[]));
        break;
      }
      case "status": {
        res = await attempt(() => c.call("daemon.status"));
        if (res.o.ok) detail = statusLine(summarizeStatus(res.result));
        break;
      }
      case "network": {
        const params: Record<string, unknown> = { tab: option("--tab") ?? "all", limit: 500 };
        if (option("--filter") !== undefined) params.filter = option("--filter");
        if (params.tab !== "all") params.tab = await resolveTab(c, String(params.tab));
        res = await attempt(() => c.call("networkRequests", params));
        if (res.o.ok) detail = networkLine(summarizeNetwork(res.result));
        break;
      }
      case "download": {
        const url = resolveUrl(args[0]);
        res = await attempt(() => c.call("downloadStart", { url, timeoutMs: 15_000 }, { timeoutMs: 20_000 }));
        if (res.o.ok) {
          const r = res.result as { id?: string; size?: number; redirected?: boolean };
          detail = `id=${String(r?.id)} size=${String(r?.size)} redirected=${String(r?.redirected)}`;
          if (r?.id) await attempt(() => c.call("downloadEnd", { id: r.id }));
        }
        break;
      }
      case "chunk": {
        res = await attempt(() => c.call("downloadChunk", { id: args[0] ?? "s9-none", offset: 0 }));
        break;
      }
      case "read-input": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => evalValue(c, t, "document.getElementById('trusted-input').value.length"));
        if (res.o.ok) detail = `${t} trusted-input length=${String(res.result)}`;
        break;
      }
      case "waitfor-text": {
        const t = await resolveTab(c, args[0]);
        res = await attempt(() => c.call("waitFor", { tab: t, text: args[1] ?? "Agent Bridge E2E Playground" }, { timeoutMs: 20_000 }));
        detail = t;
        break;
      }
      case "navigate-class": {
        // R14-REL-3 (decisions.md #196): the answer, then the tab's URL CLASS — never the URL, in any line (own
        // pages and fixture URLs included: scrubAll, not rowLine's scrubMessage). Prints its own lines and returns.
        const t = await resolveTab(c, args[0]);
        const url = args[1];
        if (!url) throw new SetUp("SET-UP: navigate-class <t> <url>");
        const r = await attempt(() => c.call("navigate", { tab: t, url }, { timeoutMs: 40_000 }));
        const lines: string[] = [];
        const out = (l: string): void => {
          lines.push(l);
          say(l);
        };
        const data = r.o.data === undefined ? "" : ` data ${scrubAll(JSON.stringify(r.o.data))}`;
        out(r.o.ok ? `ROW ${id} ${step} ok (${r.o.ms} ms)` : `ROW ${id} ${step} ${r.o.code ?? "?"} ${scrubAll(r.o.message ?? "")}${data} (${r.o.ms} ms)`);
        check(id, step, r.o, e);
        const row = (await listRows(c)).find((x) => x.tab === t);
        let own = false;
        if (!row) out(`ROW ${id} rel-class ${t} not listed`);
        else if (row.hidden) out(`ROW ${id} rel-class ${t} hidden=${row.hidden} (no url to class)`);
        else {
          const cls = urlClass(typeof row.url === "string" ? row.url : "", OWN_ID);
          own = cls.own;
          out(`ROW ${id} rel-class ${t} ${urlClassLine(cls)}`);
        }
        const v = classStepVerdict(lines);
        if (v.notMeasured) {
          // prep fixer r1 (F4): no class printed (not listed / hidden while disarmed) is NOT MEASURED, never a pass
          say(`CHECK ${id} rel-class NOT MEASURED — ${v.why}`);
          notMeasured = true;
        } else {
          say(checkLine(id, "rel-class", v));
          if (!v.pass) failed = true;
        }
        // As SAFE-REL-3: a tab that shows (or is hidden as) one of the extension's own pages must refuse every call.
        if (own || row?.hidden === "blocked") {
          const s = await attempt(() => c.call("snapshot", { tab: t }));
          say(rowLine(id, "rel-snap", s.o, OWN_ID, s.o.ok ? `${t} elements=${snapshotFacts(s.result).elements}` : ""));
          check(id, "rel-snap", s.o, "BLOCKED:own");
        }
        return;
      }
      case "download-file": {
        // R14-5c: the SDK's own downloadToFile (what browser_download runs), so "no file written" is a real check.
        const url = resolveUrl(args[0]);
        const name = option("--file") ?? "r14-download.txt";
        if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new SetUp("SET-UP: --file takes a plain file name");
        const dir = join(OUT, "r14-dl");
        mkdirSync(dir, { recursive: true });
        const target = join(dir, name);
        rmSync(target, { force: true });
        rmSync(`${target}.part`, { force: true });
        const r = await attempt(() => downloadToFile((m, p, o) => c.call(m, p, o), { url, path: target, timeoutMs: 15_000 }));
        const sz = r.o.ok ? (r.result as { size?: number })?.size : undefined;
        say(rowLine(id, step, r.o, OWN_ID, r.o.ok ? `${name} size=${String(sz)}` : ""));
        check(id, step, r.o, e);
        const exists = existsSync(target);
        const part = existsSync(`${target}.part`);
        say(`ROW ${id} ${step}-file ${name} exists=${exists ? "yes" : "no"} part=${part ? "yes" : "no"}`);
        if (e !== "record" && e !== "ok") {
          const none = !exists && !part;
          say(checkLine(id, `${step}-file`, none ? { pass: true, why: "no file written" } : { pass: false, why: "a file was written" }));
          if (!none) failed = true;
        }
        return;
      }
      default:
        throw new SetUp(`SET-UP: unknown op "${op}"`);
    }
    say(rowLine(id, step, res.o, OWN_ID, detail));
    check(id, step, res.o, e);
  } finally {
    c.close();
  }
}

/** SAFE-4 (a) and SAFE-4c: a worker-side wait, OFF pressed by the driver while it runs. */
async function cmdWaitRow(row: string, params: Record<string, unknown>): Promise<void> {
  const c = await client(`s9-${row.toLowerCase()}`);
  try {
    const a = await resolveTab(c, "a");
    const s = await safetyNow(c);
    if (!s?.armed) throw new SetUp(`SET-UP: ${row} needs the bridge armed (${safetyTupleLine(s)})`);
    resetSignals(row);
    signalReady(row);
    const started = iso();
    const { o } = await attempt(() => c.call("waitFor", { tab: a, ...params }, { timeoutMs: 45_000 }));
    const replied = iso();
    say(rowLine(row, "waitFor", o, OWN_ID));
    const pressed = await readPressed(row);
    say(`ROW ${row} times started ${started} pressed ${pressed ?? "none"} replied ${replied}`);
    verdict(row, "waitFor", waitDisarmVerdict(o, replied, pressed));
  } finally {
    c.close();
  }
}

async function cmdSafe4Type(): Promise<void> {
  const row = "SAFE-4-type";
  const n = Number(option("--n") ?? "1000");
  const text = "abcdefghij".repeat(Math.ceil(n / 10)).slice(0, n);
  const c = await client("s9-safe4-type");
  try {
    const t = await resolveTab(c, "t4");
    const s = await safetyNow(c);
    if (!s?.armed) throw new SetUp(`SET-UP: ${row} needs the bridge armed (${safetyTupleLine(s)})`);
    await evalValue(c, t, "(document.getElementById('trusted-input').value = '').length");
    await c.call("focusTab", { tab: t }); // the SDK's "focusFirst" policy, done by hand (CLAUDE.md: background trusted input does nothing)
    resetSignals(row);
    signalReady(row);
    const started = iso();
    const { o } = await attempt(() => c.call("type", { tab: t, locator: { css: "#trusted-input" }, text, trusted: true }, { timeoutMs: 60_000 }));
    const replied = iso();
    say(rowLine(row, "type", o, OWN_ID));
    const pressed = await readPressed(row);
    say(`ROW ${row} times started ${started} pressed ${pressed ?? "none"} replied ${replied}`);
    say(`${row}: waiting (≤ 60 s) for the driver to re-arm before reading the typed length`);
    const w = await waitSafety(c, { armed: true }, 60_000);
    let typed: number | null = null;
    if (w.ok) {
      const r = await attempt(() => evalValue(c, t, "document.getElementById('trusted-input').value.length"));
      typed = r.o.ok && typeof r.result === "number" ? r.result : null;
    }
    say(`ROW ${row} typed ${typed === null ? "not read" : `${typed} of ${n}`}`);
    verdict(row, "type", typeVerdict(o, typed, n));
  } finally {
    c.close();
  }
}

async function cmdSafe4b(): Promise<void> {
  const row = "SAFE-4b";
  const A = await client("s9-4b-A");
  const B = await client("s9-4b-B");
  try {
    const s = await safetyNow(A);
    if (!s?.armed) throw new SetUp(`SET-UP: ${row} needs the bridge armed (${safetyTupleLine(s)})`);
    const ta = await openTab(A, s9Url(FIXTURE_8080, "4b-a"));
    const tb = await openTab(B, s9Url(FIXTURE_8080, "4b-b"));
    const VISLOG =
      "(() => { const now = () => performance.timeOrigin + performance.now(); window.__s9vis = [[document.visibilityState, now(), 'start']];" +
      " if (!window.__s9visOn) { window.__s9visOn = true; document.addEventListener('visibilitychange', () => window.__s9vis.push([document.visibilityState, performance.timeOrigin + performance.now(), 'change'])); }" +
      " return document.visibilityState; })()";
    say(`${row}: A ${ta}, B ${tb}; B's tab reads ${String(await evalValue(B, tb, VISLOG))} at the start`);
    resetSignals(row);
    const aStart = Date.now();
    const aCall = attempt(() => A.call("screenshot", { tab: ta }, { timeoutMs: 40_000 }));
    await sleep(50);
    const bStart = Date.now();
    const bCall = attempt(() => B.call("screenshot", { tab: tb }, { timeoutMs: 40_000 }));
    signalReady(row);
    const [ra, rb] = await Promise.all([
      aCall.then((r) => ({ ...r, at: iso() })),
      bCall.then((r) => ({ ...r, at: iso() })),
    ]);
    say(rowLine(row, "A-screenshot", ra.o, OWN_ID, `${ta} image ${String((ra.result as { dataUrl?: string })?.dataUrl ?? "").length} chars`));
    say(rowLine(row, "B-screenshot", rb.o, OWN_ID, `${tb} image ${String((rb.result as { dataUrl?: string })?.dataUrl ?? "").length} chars`));
    const pressed = await readPressed(row);
    say(`ROW ${row} times A-start ${new Date(aStart).toISOString()} B-start ${new Date(bStart).toISOString()} pressed ${pressed ?? "none"} A-reply ${ra.at} B-reply ${rb.at}`);
    say(`${row}: waiting (≤ 60 s) for the driver to re-arm before reading B's visibility log`);
    const w = await waitSafety(B, { armed: true }, 60_000);
    let vis: boolean | null = null;
    if (w.ok) {
      const r = await attempt(() => evalValue(B, tb, "(window.__s9vis || [])"));
      if (r.o.ok) {
        vis = visibleSince(r.result, bStart);
        say(`ROW ${row} B-vislog ${JSON.stringify(r.result)}`);
      }
    }
    verdict(row, "B", lockVerdict(rb.o, rb.at, pressed, vis));
    await attempt(() => A.call("closeTab", { tab: ta }));
    await attempt(() => B.call("closeTab", { tab: tb }));
  } finally {
    A.close();
    B.close();
  }
}

async function cmdPop1(): Promise<void> {
  const row = "SAFE-POP-1";
  const c = await client("s9-pop1");
  try {
    const a = await resolveTab(c, "a");
    const want = `${FIXTURE_8080}/e2e-playground.html?popup=1`;
    const events: Array<{ at: number; p: { tab?: string; reason?: string; url?: string } }> = [];
    const off = c.on("leaseGranted", (p) => events.push({ at: Date.now(), p: p as { tab?: string; reason?: string; url?: string } }));
    const tryClick = async (trusted: boolean): Promise<boolean> => {
      const before = events.length;
      const t0 = Date.now();
      if (trusted) await attempt(() => c.call("focusTab", { tab: a }));
      const { o } = await attempt(() => c.call("click", { tab: a, locator: { role: "link", name: "Open popup" }, ...(trusted ? { trusted: true } : {}) }));
      say(rowLine(row, trusted ? "click-trusted" : "click-synthetic", o, OWN_ID));
      while (Date.now() - t0 < 5000 && events.length === before) await sleep(50);
      const ev = events[before];
      if (!ev) {
        say(`ROW ${row} ${trusted ? "trusted" : "synthetic"} no leaseGranted within 5 s`);
        return false;
      }
      say(`ROW ${row} leaseGranted ${JSON.stringify({ ...ev.p, url: showUrl(ev.p.url, OWN_ID) })} after ${ev.at - t0} ms`);
      const pass = ev.p.reason === "opener" && ev.p.url === want && ev.at - t0 <= 2500;
      say(checkLine(row, "leaseGranted", pass ? { pass: true, why: "reason opener, the popup URL, ≤ 2500 ms" } : { pass: false, why: "event differs (reason, url or > 2500 ms)" }));
      if (!pass) failed = true;
      if (ev.p.tab) {
        noteOpened(ev.p.tab);
        await attempt(() => c.call("closeTab", { tab: ev.p.tab }));
      }
      return true;
    };
    if (!(await tryClick(false)) && !(await tryClick(true))) {
      say(`CHECK ${row} leaseGranted FAIL — no leaseGranted after a synthetic and a trusted click`);
      failed = true;
    }
    off();
  } finally {
    c.close();
  }
}

async function cmdCap1(): Promise<void> {
  const row = "SAFE-CAP-1";
  const c = await client("s9-cap1");
  try {
    const k = await openTab(c, s9Url(FIXTURE_8080, "cap1"));
    resetSignals(row);
    signalReady(row);
    const { o, result } = await attempt(() => c.call("screenshot", { tab: k }, { timeoutMs: 40_000 }));
    say(rowLine(row, "screenshot", o, OWN_ID, `${k} image ${String((result as { dataUrl?: string })?.dataUrl ?? "").length} chars`));
    const pressed = await readPressed(row);
    say(`ROW ${row} driver switched the tab at ${pressed ?? "none"}; reply at ${iso()} (record, not a check: ${o.ok ? "the race was missed" : o.code === "OFFSCREEN" && o.message === EXPECT.captureMoved ? "capture verification fired" : "another answer"})`);
    await attempt(() => c.call("closeTab", { tab: k }));
  } finally {
    c.close();
  }
}

// ── Run 14 (§4.21) ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * R14-POP-1 (decisions.md #194; Stage 0 F22): the daemon grants a popup only to the holder of its opener
 * (`daemon/src/intercept.ts` applyOpener), so this client claims tab a FIRST — its claim and owner lines are printed
 * before the click — then clicks the fixture's `Open popup` link. The trusted fallback runs only when the synthetic
 * click opened no tab at all (Run 13 ran it after a popup had opened: S4-live-verifier finding 11).
 */
async function cmdR14Pop1(): Promise<void> {
  const row = "R14-POP-1";
  const name = "s9-r14-pop1";
  const c = await client(name);
  try {
    const a = await resolveTab(c, "a");
    const events: Array<{ at: number; p: { tab?: string; reason?: string; url?: string } }> = [];
    const off = c.on("leaseGranted", (p) => events.push({ at: Date.now(), p: p as { tab?: string; reason?: string; url?: string } }));
    const cl = await attempt(() => c.call("tabs.claim", { tab: a }));
    say(rowLine(row, "claim", cl.o, OWN_ID, cl.o.ok ? a : ""));
    if (!cl.o.ok) throw new SetUp(`SET-UP: ${row}: the claim of ${a} was refused (${String(cl.o.code)}) — without a held opener the row cannot test the opener rule`);
    const owner = (await listRows(c)).find((r) => r.tab === a)?.owner;
    say(`ROW ${row} claim-owner ${a} owner=${JSON.stringify(owner ?? null)}`);
    if (owner !== name) throw new SetUp(`SET-UP: ${row}: ${a} is not held by this client after the claim (owner ${JSON.stringify(owner ?? null)})`);
    say(checkLine(row, "claim", { pass: true, why: `${a} held by this client before the click` }));
    const before = new Set((await listRows(c)).map((r) => r.tab));
    const opened = async (): Promise<string[]> => (await listRows(c)).map((r) => r.tab ?? "").filter((h) => h && !before.has(h));
    const tryClick = async (trusted: boolean): Promise<"granted" | "popup-no-grant" | "nothing"> => {
      const n0 = events.length;
      const t0 = Date.now();
      if (trusted) await attempt(() => c.call("focusTab", { tab: a }));
      const { o } = await attempt(() => c.call("click", { tab: a, locator: { role: "link", name: "Open popup" }, ...(trusted ? { trusted: true } : {}) }));
      say(rowLine(row, trusted ? "click-trusted" : "click-synthetic", o, OWN_ID));
      while (Date.now() - t0 < 5000 && events.length === n0) await sleep(50);
      const ev = events[n0];
      const now = await opened();
      for (const h of now) noteOpened(h);
      say(`ROW ${row} ${trusted ? "trusted" : "synthetic"} tabs opened since the claim: ${now.length}`);
      if (!ev) {
        say(`ROW ${row} ${trusted ? "trusted" : "synthetic"} no leaseGranted within 5 s`);
        return now.length ? "popup-no-grant" : "nothing";
      }
      say(`ROW ${row} leaseGranted ${JSON.stringify({ ...ev.p, url: showUrl(ev.p.url, OWN_ID) })} after ${ev.at - t0} ms`);
      const pass = ev.p.reason === "opener" && ev.p.url === R14.popupUrl && ev.at - t0 <= R14.popupMaxMs;
      say(checkLine(row, "leaseGranted", pass ? { pass: true, why: `reason opener, the popup URL, ≤ ${R14.popupMaxMs} ms` } : { pass: false, why: `event differs (reason, url or > ${R14.popupMaxMs} ms)` }));
      if (!pass) failed = true;
      return "granted";
    };
    let r = await tryClick(false);
    if (r === "nothing") r = await tryClick(true);
    if (r !== "granted") {
      say(`CHECK ${row} leaseGranted FAIL — ${r === "popup-no-grant" ? "a popup opened from the held opener and no leaseGranted came" : "no tab opened after a synthetic and a trusted click"}`);
      failed = true;
    }
    off();
    for (const h of await opened()) {
      const { o } = await attempt(() => c.call("closeTab", { tab: h }));
      say(rowLine(row, `close-${h}`, o, OWN_ID));
    }
    const rel = await attempt(() => c.call("tabs.release", { tab: a }));
    say(rowLine(row, "release", rel.o, OWN_ID, rel.o.ok ? a : ""));
  } finally {
    c.close();
  }
}

function readBanner(row: string): { atPress: boolean | null; samples: BannerSample[] } | null {
  const f = join(OUT, `${row}.banner.json`);
  if (!existsSync(f)) return null;
  const raw = JSON.parse(readFileSync(f, "utf8").replace(/^﻿/, "")) as { atPress?: unknown; samples?: unknown };
  const samples = Array.isArray(raw.samples)
    ? (raw.samples as Array<Record<string, unknown>>).filter((s) => typeof s.ms === "number" && typeof s.shown === "boolean").map((s) => ({ ms: s.ms as number, shown: s.shown as boolean }))
    : [];
  return { atPress: typeof raw.atPress === "boolean" ? raw.atPress : null, samples };
}

/**
 * R14-4b (decisions.md #194; phase doc 0.10): SAFE-4 (b)'s trusted type of 1000 characters into #trusted-input on
 * t4, disarmed mid-call by the driver (`Invoke-S9PressWhenReady -Row R14-4b -WatchBanner -BannerForMs 20000
 * -BannerOut …`); k from the page's own input; the banner's lifetime from the driver's poll file (a RECORD); then,
 * after the driver re-armed, a trusted type of "R14ok" on the same tab, which must answer ok with no
 * "another debugger" error and land on the page.
 */
async function cmdR14Type(): Promise<void> {
  const row = "R14-4b";
  const n = R14.typeN;
  const delayMs = Number(option("--delay-ms") ?? "400");
  const text = "abcdefghij".repeat(Math.ceil(n / 10)).slice(0, n);
  const c = await client("s9-r14-4b");
  try {
    const t = await resolveTab(c, "t4");
    const s = await safetyNow(c);
    if (!s?.armed) throw new SetUp(`SET-UP: ${row} needs the bridge armed (${safetyTupleLine(s)})`);
    rmSync(join(OUT, `${row}.banner.json`), { force: true });
    await evalValue(c, t, "(document.getElementById('trusted-input').value = '').length");
    await c.call("focusTab", { tab: t }); // the SDK's "focusFirst" policy, done by hand (trusted input into a background tab does nothing)
    resetSignals(row);
    signalReady(row);
    const started = iso();
    const { o } = await attempt(() => c.call("type", { tab: t, locator: { css: "#trusted-input" }, text, trusted: true }, { timeoutMs: 60_000 }));
    const replied = iso();
    say(rowLine(row, "type", o, OWN_ID));
    const pressed = await readPressed(row);
    say(`ROW ${row} times started ${started} pressed ${pressed ?? "none"} replied ${replied} (driver delay ${delayMs} ms)`);
    say(`${row}: waiting (≤ 90 s) for the driver's banner poll and re-arm before reading the typed length`);
    const w = await waitSafety(c, { armed: true }, 90_000);
    if (!w.ok) throw new SetUp(`SET-UP: ${row}: the bridge was not re-armed within 90 s (${safetyTupleLine(w.last)})`);
    const r = await attempt(() => evalValue(c, t, "document.getElementById('trusted-input').value.length"));
    const typed = r.o.ok && typeof r.result === "number" ? r.result : null;
    say(`ROW ${row} typed ${typed === null ? "not read" : `${typed} of ${n}`}`);
    // prep fixer r1 (F6): R14-4b's own verdict — a press before the reply and the call still finishing is a FAIL;
    // NOT DISCRIMINATING only for a press after the reply (or DISARMED before the first character).
    const v = r14TypeVerdict(o, typed, n, pressed, replied);
    verdict(row, "type", v);
    if (v.notDiscriminating && typed !== null) {
      const next = rerunDelayMs(typed, n, started, replied, delayMs);
      say(`ROW ${row} RERUN-DELAY ${next === null ? "none (the times do not give one)" : `${next} ms`} (the one pre-registered re-run, §4.21)`);
    }
    // The banner record: the driver wrote its poll before re-arming.
    let b = readBanner(row);
    for (let i = 0; !b && i < 50; i++) {
      await sleep(100);
      b = readBanner(row);
    }
    say(`ROW ${row} ${b ? bannerLine(bannerLifetime(b.samples), b.atPress, R14.bannerForMs) : "banner: no poll file from the driver (record)"}`);
    // The follow-up on the same tab: a trusted call must attach again (the disarm detached the session).
    const f = await attempt(() => c.call("focusTab", { tab: t }));
    say(rowLine(row, "follow-focus", f.o, OWN_ID, f.o.ok ? t : ""));
    const fu = await attempt(() => c.call("type", { tab: t, locator: { css: "#trusted-input" }, text: R14.followUpText, trusted: true }, { timeoutMs: 30_000 }));
    say(rowLine(row, "follow-up", fu.o, OWN_ID));
    let value: string | null = null;
    if (fu.o.ok) {
      const rv = await attempt(() => evalValue(c, t, "document.getElementById('trusted-input').value"));
      value = rv.o.ok && typeof rv.result === "string" ? rv.result : null;
      say(`ROW ${row} follow-value ${t} trusted-input equals ${JSON.stringify(R14.followUpText)}: ${value === R14.followUpText ? "yes" : "no"} (length ${value === null ? "not read" : value.length})`);
    }
    const fv = followUpVerdict(fu.o, value, R14.followUpText);
    say(checkLine(row, "follow-up", fv));
    if (!fv.pass) failed = true;
  } finally {
    c.close();
  }
}

/**
 * R14-5c's positive control (phase doc 0.10): one idle TCP connection is held open first (Run 13's probable cause:
 * a connection Chrome left open held the single-threaded server), then n concurrent GETs with `redirect: "manual"`;
 * each must answer 302 within 1 s. A single-threaded server fails this; a threaded one passes.
 */
async function cmdRedirectProbe(): Promise<void> {
  const row = option("--row") ?? "R14-5c-ctl";
  const port = Number(option("--port") ?? "8083");
  const n = Number(option("--n") ?? String(R14.concurrentN));
  const idle = netConnect({ host: "127.0.0.1", port });
  const held = await new Promise<boolean>((res) => {
    idle.once("connect", () => res(true));
    idle.once("error", () => res(false));
  });
  if (!held) throw new SetUp(`SET-UP: ${row}: nothing listens on 127.0.0.1:${port}`);
  try {
    await sleep(200); // the server has accepted the idle connection before the real requests
    const one = async (i: number): Promise<{ status: number | null; ms: number }> => {
      const t0 = Date.now();
      try {
        const r = await fetch(`http://127.0.0.1:${port}/r14-ctl?n=${i}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
        await r.arrayBuffer().catch(() => undefined);
        return { status: r.status, ms: Date.now() - t0 };
      } catch {
        return { status: null, ms: Date.now() - t0 };
      }
    };
    const rs = await Promise.all(Array.from({ length: n }, (_, i) => one(i + 1)));
    say(`ROW ${row} concurrent ${rs.map((r) => `${r.status ?? "no answer"} in ${r.ms} ms`).join(", ")} (idle socket held open: yes)`);
    const v = concurrentVerdict(rs, n, R14.concurrentMaxMs);
    say(checkLine(row, "concurrent", v));
    if (!v.pass) failed = true;
  } finally {
    idle.destroy();
  }
}

async function cmdServerLogs(): Promise<void> {
  const row = option("--row") ?? "R14-5c";
  const f83 = option("--log8083");
  const f81 = option("--log8081");
  if (!f83 || !f81 || !existsSync(f83) || !existsSync(f81)) throw new SetUp("SET-UP: server-logs --log8083 <file> --log8081 <file> (both must exist)");
  const t83 = readFileSync(f83, "utf8");
  const t81 = readFileSync(f81, "utf8");
  const c = { hop5c1: logHits(t83, "s14=5c1"), target5c1: logHits(t81, "s14=5c1"), hop5c2: logHits(t83, "s14=5c2"), target5c2: logHits(t81, "s14=5c2") };
  say(`ROW ${row} ${serverLogLine(c)}`);
  const v = serverLogVerdict(c);
  say(checkLine(row, "server-log", v));
  if (!v.pass) failed = true;
}

/** R14-3: the rects s9-win.ps1 measured (`Test-S9Placement` writes them as JSON), judged by `placementVerdict`. */
async function cmdRectCheck(): Promise<void> {
  const row = option("--row") ?? "R14-3";
  const step = option("--step") ?? "placement";
  const file = option("--file");
  if (!file || !existsSync(file)) throw new SetUp("SET-UP: rect-check --file <json>");
  const p = JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, "")) as Placement;
  const v = placementVerdict(p);
  const attemptArg = option("--attempt");
  if (attemptArg !== undefined) {
    // S1 wave fixer (Return 2, ruling (a)): one try of the fixed placement order — a record line, never a CHECK (the
    // guard's own CHECK follows on the chosen placement). Exit 1 = this area is not free.
    const n = Number(attemptArg);
    const area = (p as Placement & { area?: Rect }).area;
    if (!Number.isInteger(n) || n < 1 || !area) throw new SetUp("SET-UP: rect-check --attempt <n ≥ 1> needs the JSON's `area`");
    say(`ROW ${row} placement-attempt-${n} ${placementLine(p)}`);
    for (const l of placementDiagnostics(p)) say(l);
    say(placementAttemptLine(n, area, v));
    if (!v.pass) failed = true;
    return;
  }
  say(`ROW ${row} ${step} ${placementLine(p)}`);
  for (const l of placementDiagnostics(p)) say(l); // round 3: diagnostics only (rect, owners, styles, cursor)
  say(checkLine(row, step, v));
  if (!v.pass) failed = true;
}

/**
 * S1 wave fixer (Return 2, ruling (a)): the order R14-3 tries work areas in (`placementOrder`). The JSON is
 * `{wWork: Rect, work: Rect[]}` (s9-win.ps1 `Find-S9FreePlacement`); one line `PLACEMENT order <n>: [l,t,r,b] …`.
 */
/**
 * Round 3 (after Return 3), ruling (c): the fixed park point for a page area (`parkPoint`): one line
 * `PARK point (x,y) in page [l,t,r,b]`, or `PARK none: page [l,t,r,b] too small` (exit 0 either way).
 */
async function cmdParkPoint(): Promise<void> {
  const m = /^(-?\d+),(-?\d+),(-?\d+),(-?\d+)$/.exec(option("--rect") ?? "");
  if (!m) throw new SetUp("SET-UP: park-point --rect <l,t,r,b>");
  const page: Rect = { left: Number(m[1]), top: Number(m[2]), right: Number(m[3]), bottom: Number(m[4]) };
  const pt = parkPoint(page);
  say(pt ? `PARK point (${pt.x},${pt.y}) in page ${rectText(page)}` : `PARK none: page ${rectText(page)} too small`);
}

async function cmdPlacementOrder(): Promise<void> {
  const file = option("--file");
  if (!file || !existsSync(file)) throw new SetUp("SET-UP: placement-order --file <json>");
  const j = JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, "")) as { wWork?: Rect; work?: Rect[]; shell?: ShellWindow[] };
  if (!j.wWork || !Array.isArray(j.work) || !Array.isArray(j.shell)) throw new SetUp("SET-UP: placement-order needs {wWork, work, shell}");
  // Round 2 (S1-wave-verifier F1): each area tried is cut above any shell taskbar intersecting it (taskbarCut); the
  // order line lists the areas as tried, each cut line names the uncut work area.
  const order = placementOrder(j.wWork, j.work).map((a) => {
    const c = taskbarCut(a, j.shell ?? []);
    say(taskbarCutLine(a, c.cut));
    return c.area;
  });
  say(`PLACEMENT order ${order.length}: ${order.map(rectText).join(" ")}`);
}

function tokenOf(): string {
  const env = process.env.BRIDGE_TOKEN?.trim();
  if (env) return env;
  const f = join(REPO, "bridge.token");
  return existsSync(f) ? readFileSync(f, "utf8").trim() : "";
}

async function cmdScanLog(): Promise<void> {
  const since = option("--since");
  if (!since || Number.isNaN(Date.parse(since))) throw new SetUp("SET-UP: scan-log --since <iso>");
  const file = join(homedir(), ".chrome-agent-bridge", "daemon.log");
  if (!existsSync(file)) throw new SetUp(`SET-UP: no ${file}`);
  const lines = logLinesSince(readFileSync(file, "utf8").split(/\r?\n/), since);
  const text = lines.join("\n");
  const c = scanCounts(text, tokenOf(), OWN_ID);
  say(scanLine(`daemon.log lines since ${since} (${lines.length} lines)`, c));
  const v = scanVerdict(c, "daemon");
  say(checkLine("SAFE-10", "daemon-log", v));
  if (!v.pass) failed = true;
  const copy = option("--copy");
  if (copy) {
    if (!v.pass) {
      say(`SAFE-10: --copy refused — a count is not 0, so ${copy} is not written (stop rule: nothing is committed)`);
      failed = true;
    } else {
      writeFileSync(copy, text + (text ? "\n" : ""));
      say(`SAFE-10: ${lines.length} lines written to ${copy}`);
    }
  }
}

async function cmdScanFile(): Promise<void> {
  const [file] = positional();
  const mode = option("--mode");
  if (!file || !existsSync(file)) throw new SetUp("SET-UP: scan-file <file> --mode daemon|console|console-s16|committed");
  if (mode !== "daemon" && mode !== "console" && mode !== "console-s16" && mode !== "committed") throw new SetUp("SET-UP: --mode daemon|console|console-s16|committed");
  const text = readFileSync(file, "utf8");
  const token = tokenOf();
  const c = scanCounts(text, token, OWN_ID);
  say(scanLine(file, c));
  if (mode === "console" || mode === "console-s16") {
    // The bridge's press lines are fixed strings (badge.ts); every hit line is printed with URLs scrubbed, a line
    // holding the token is withheld whole.
    const h = consoleHits(text);
    for (const l of h.pressLines) say(`CONSOLE ${l}`);
    for (const l of h.hitLines) say(`CONSOLE-HIT ${token && l.includes(token) ? "<line withheld: token>" : scrubMessage(l.trim(), OWN_ID)}`);
    // console = Run 13's SAFE-10 rule (a Chrome-owned hit tolerated); console-s16 = Run 14's R14-LOGS rule (S1.6 as
    // written: every count 0, whoever wrote the line; prep fixer r1, F2).
    const s16 = mode === "console-s16";
    const v = s16 ? consoleVerdictS16(c, h) : consoleVerdict(c, h);
    const label = s16 ? "R14-LOGS" : "SAFE-10";
    if (v.notMeasured) {
      say(`CHECK ${label} scan-console NOT MEASURED — ${v.why}`);
      notMeasured = true;
    } else {
      say(checkLine(label, "scan-console", v));
      if (!v.pass) failed = true;
    }
    return;
  }
  const v = scanVerdict(c, mode);
  say(checkLine("SAFE-10", `scan-${mode}`, v));
  if (!v.pass) failed = true;
}

async function cmdMcpConfig(): Promise<void> {
  const [file] = positional();
  if (!file) throw new SetUp("SET-UP: mcp-config <file>");
  mkdirSync(dirname(resolve(file)), { recursive: true });
  writeFileSync(file, JSON.stringify(mcpConfig(process.execPath, join(REPO, "mcp", "dist", "index.js")), null, 2));
  say(`MCP config written to ${file} (server chrome-agent-bridge only; no token, no env)`);
}

async function cmdCleanup(): Promise<void> {
  if (!existsSync(STATE)) {
    say("cleanup: no state file, nothing to close");
    return;
  }
  const s = loadState();
  const c = await client("s9-cleanup");
  try {
    const live = new Set((await listRows(c)).map((r) => r.tab));
    let closed = 0;
    let gone = 0;
    for (const h of s.opened) {
      if (!live.has(h)) {
        gone++;
        continue;
      }
      const { o } = await attempt(() => c.call("closeTab", { tab: h }));
      say(rowLine("CLEANUP", `close-${h}`, o, OWN_ID));
      if (o.ok) closed++;
    }
    // prep fixer r1 (N1): every tab the wave opened is accounted for — closed here, already gone, or still listed
    // (a closeTab the bridge refused, e.g. r3 on an own page); the driver closes those by its own window's UIA.
    const after = new Set((await listRows(c)).map((r) => r.tab));
    const left = s.opened.filter((h) => after.has(h));
    const keyOf = (h: string): string => Object.keys(s.tabs).find((k) => s.tabs[k] === h) ?? "?";
    say(`cleanup: ${closed} of ${s.opened.length} opened tabs closed, ${gone} already gone, ${left.length} still listed`);
    say(`cleanup: still listed ${left.length ? left.map((h) => `${keyOf(h)}=${h}`).join(" ") : "none"}`);
  } finally {
    c.close();
  }
}

async function cmdDaemonShutdown(): Promise<void> {
  const c = await client("s9-shutdown");
  const st = (await c.call("daemon.status")) as { clients?: unknown[] };
  const n = Array.isArray(st?.clients) ? st.clients.length : -1;
  if (n !== 1) {
    c.close();
    throw new SetUp(`SET-UP: ${n} clients connected (need only this one) — end every actor first`);
  }
  await attempt(() => c.call("daemon.shutdown"));
  say("daemon.shutdown sent");
  c.close();
}

const HELP = `recipes/s9.ts — Step 9 S4 rows (docs/e2e-test-plan.md §4.20); see the header for every command.`;

const commands: Record<string, () => Promise<void>> = {
  id: cmdId,
  setup: cmdSetup,
  perf: cmdPerf,
  safe0: cmdSafe0,
  probe: cmdProbe,
  "wait-safety": cmdWaitSafety,
  "wait-alone": cmdWaitAlone,
  call: cmdCall,
  safe4a: () => cmdWaitRow("SAFE-4a", { locator: { css: "#s9-never-there" }, timeoutMs: 20_000 }),
  safe4c: () => cmdWaitRow("SAFE-4c", { seconds: 30 }),
  "safe4-type": cmdSafe4Type,
  safe4b: cmdSafe4b,
  pop1: cmdPop1,
  cap1: cmdCap1,
  nonce: async () => say(`nonce ${randomBytes(4).toString("hex")}`),
  "scan-log": cmdScanLog,
  "scan-file": cmdScanFile,
  "mcp-config": cmdMcpConfig,
  cleanup: cmdCleanup,
  "daemon-shutdown": cmdDaemonShutdown,
  pop14: cmdR14Pop1,
  "r14-type": cmdR14Type,
  "redirect-probe": cmdRedirectProbe,
  "server-logs": cmdServerLogs,
  "rect-check": cmdRectCheck,
  "placement-order": cmdPlacementOrder,
  "park-point": cmdParkPoint,
};

const run = commands[command];
if (!run) {
  console.log(HELP);
  if (command === "--help") process.exitCode = 0;
  else {
    // prep fixer r1 (N3): an unknown command is a STOP line too (exit 2), not a bare exit code.
    console.log(`${stopLine(`s9.ts: unknown command ${JSON.stringify(command ?? "")} (a set-up error in the caller)`)} (at ${iso()})`);
    process.exitCode = 2;
  }
} else {
  run()
    .then(() => {
      process.exitCode = failed ? 1 : notMeasured ? 3 : 0;
    })
    .catch((err: unknown) => {
      // Run 14 (#193): every throw is a STOP — one line beginning `STOP:` (no timestamp before it, so a grep for
      // `^STOP:` finds it), URLs withheld, exit 2. Run 13 printed `FAILED — …` (exit 2 set-up, exit 1 otherwise).
      const msg = err instanceof SetUp ? err.message : err instanceof BridgeError ? `${String(err.code)}: ${err.message}` : err instanceof Error ? err.message : String(err);
      console.log(`${stopLine(`s9.ts ${command}: FAILED — ${msg}`)} (at ${iso()})`);
      process.exitCode = 2;
    });
}


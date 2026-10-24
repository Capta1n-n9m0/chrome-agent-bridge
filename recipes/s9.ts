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
//   scan-file <file> --mode daemon|console|committed   counts over a file (the worker console capture, a file to commit)
//   mcp-config <file>          the MCP config for recipes/s9-actor.ts (only chrome-agent-bridge, no token)
//   cleanup                    close every tab state.json says this script opened
//   daemon-shutdown            stop the daemon (refused while any other client is connected)
//
// It never prints the token, a non-fixture URL or title, or a block-list pattern read from Chrome; listTabs,
// daemon.status and the network log are printed as counts. Exit: 0 every CHECK passed, 1 a CHECK failed or a
// bridge error (`FAILED — …`), 2 set-up (nothing measured), 3 not discriminating / not measured.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { BridgeError, connect, type BridgeClient } from "@bridge/sdk";
import {
  checkLine,
  consoleHits,
  consoleVerdict,
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
  const env = (await c.call("evaluate", { tab: handle, expression, timeoutMs: 10_000 }, { timeoutMs: 15_000 })) as { kind?: string; value?: unknown };
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
    if (!w.ok) failed = true;
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
  if (!file || !existsSync(file)) throw new SetUp("SET-UP: scan-file <file> --mode daemon|console|committed");
  if (mode !== "daemon" && mode !== "console" && mode !== "committed") throw new SetUp("SET-UP: --mode daemon|console|committed");
  const text = readFileSync(file, "utf8");
  const token = tokenOf();
  const c = scanCounts(text, token, OWN_ID);
  say(scanLine(file, c));
  if (mode === "console") {
    // The bridge's press lines are fixed strings (badge.ts); every hit line is printed with URLs scrubbed, a line
    // holding the token is withheld whole.
    for (const l of text.split(/\r?\n/).filter((x) => /^\s*safety: /.test(x))) say(`CONSOLE ${l.trim()}`);
    const h = consoleHits(text);
    for (const l of h.hitLines) say(`CONSOLE-HIT ${token && l.includes(token) ? "<line withheld: token>" : scrubMessage(l.trim(), OWN_ID)}`);
    const v = consoleVerdict(c, h);
    say(checkLine("SAFE-10", "scan-console", v));
    if (!v.pass) failed = true;
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
    for (const h of s.opened) {
      if (!live.has(h)) continue;
      const { o } = await attempt(() => c.call("closeTab", { tab: h }));
      say(rowLine("CLEANUP", `close-${h}`, o, OWN_ID));
      if (o.ok) closed++;
    }
    say(`cleanup: ${closed} of ${s.opened.length} opened tabs closed (others already gone)`);
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
};

const run = commands[command];
if (!run) {
  console.log(HELP);
  process.exitCode = command === "--help" ? 0 : 2;
} else {
  run()
    .then(() => {
      process.exitCode = failed ? 1 : notMeasured ? 3 : 0;
    })
    .catch((err: unknown) => {
      if (err instanceof SetUp) {
        say(`FAILED — ${err.message}`);
        process.exitCode = 2;
      } else {
        const msg = err instanceof BridgeError ? `${String(err.code)}: ${err.message}` : err instanceof Error ? err.message : String(err);
        say(`FAILED — ${msg.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'`)<>]*/gi, (u) => showUrl(u, OWN_ID))}`);
        process.exitCode = 1;
      }
    });
}


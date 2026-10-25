// recipes/s10.ts — the SDK side of Step 10's live wave (Run 15; docs/e2e-test-plan.md §4.22, wave sheet
// docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md). Written 2026-10-25 by the S7 prep builder,
// before the Step 10 build was loaded; NOT run against Chrome by its author (the prep stage may not touch Chrome).
// Pass rules are pure, in recipes/s10-rules.ts (dry-run by recipes/test/s10-rules.test.ts).
//
//   node --import tsx recipes/s10.ts <command> [args]        (the block runner recipes/s10-r15.ps1 calls it)
//
// Files: $S10_OUT (default %TEMP%\bridge-e2e\s15; the runner sets S9_OUT to the same directory, so recipes/s9.ts
// shares state.json and the .ready/.pressed signals): state.json, sv\ (the saveTo files, named s15v-*, deleted at
// teardown), actors\ (the MCP actors, recipes/s9-actor.ts with S9_ACTORS), jsd-failures\ (BRIDGE_FAILURES_DIR of the
// JSD rows). Nothing here is written inside the repo except by `scan … --copy` after a passing scan.
//
//   daemon-up                       connect (spawns, or hands over to, the daemon of the build on disk); prints the build
//   setup                           W's fixture tab (?s9=w) retitled "S9 W human tab"; the fixture tabs of s10-rules
//                                   setupTabs() opened in the background, each waited for; state.json written
//   s10check                        L1's Step 10 half (after `s9.ts safe0`): daemon build = disk sha256, and
//                                   evaluateSaveStart {expression:""} answers the Step 10 BAD_PARAMS
//   mcpf --kind click|type|press --actor <n>   MCPF-1's armed legs, one kind per call: 3 trials (click first asks the
//                                   focus question, RECORD); press prints the attempt's tally and the 3of3 check
//   mcpf-off-prep | mcpf-off --actor <n> | mcpf-off-judge     MCPF-1's disarmed leg (prep armed, the call disarmed, the judge re-armed)
//   cap1-sdk | cap1-mcp --actor <n> CAP-1's two legs
//   mcpf … --row MCPF-1R | cap1-mcp … --row CAP-1R   the re-measurements (S7 wave fixer 3): the same legs under the new row ID
//   r3r-check --file <json> --step <s>              R15-3R's placement guard (s10-rules r3rPlacementVerdict; s10-win.ps1 writes the JSON)
//   sw1 [--row SW-1R]               SW-1 (or its re-measurement SW-1R), three trials of (i) background capture, (ii) front capture
//   pop2 --leg a|b                  R15-POP-2: the opener (a) in front, (b) behind; its popup's opener class; leaseGranted
//   save-build <key> [--tab t]      the page builds one value (s10-save.html) and prints its own digest
//   save-sdk <ROW> <key> [--bare] [--tab t]     Tab.evaluateToFile (`return window.__s10v[key]`, or the bare primitive)
//   save-mcp <ROW> <key> --actor <n>            one browser_evaluate {saveTo} by a headless actor
//   save-refuse | save-hold | save-close | save-ttl [--idle-s 330]
//   save-disarm | save-jsoff | save-block       background rows: READY/pressed signals with the driver (s10-r15.ps1)
//   prim                            SAVE-PRIM (= save-sdk SAVE-PRIM 64m --bare, plus #217's reading)
//   idonly --port <p>               SAVE-IDONLY over CDP in the throwaway headless Chrome on 127.0.0.1:<p>
//   mem-record --file <f>           SAVE-64's worker memory record from recipes/s10-mem.ps1's samples
//   savefix-sdk | savefix-mcp --actor <n> | savefix-judge --transcript <f>
//   jsd --state jsoff|off|on        JSD's SDK leg (failure reports ON, BRIDGE_FAILURES_DIR = jsd-failures)
//   jsd-mcp --state jsoff|off|on --actor <n>     JSD's MCP leg
//   bbl-judge --leg <l> --out <f> --log <f> --from <n> --exit <c>   BBL-1's verdict over bb-login's output and the server log
//   scan --mode daemon|console|transcript|committed --file <f> [--copy <dst>]
//   scan-log --since <iso> [--copy <dst>]       daemon.log since the wave's mark
//   values-clean                    deletes sv\ (teardown); prints counts only
//   pp1-plan --length <n>           G10-3 package only (never run by the runner): the MCP leg's prompt for the held export
//
// Exit: 0 every CHECK passed, 1 a CHECK failed, 2 a STOP (a set-up guard or any throw: one line beginning `STOP:`,
// #193), 3 not discriminating / not measured. It never prints the token, a non-fixture URL, the block-list pattern, a
// saveTo path, an expression or a value: hashes, sizes, counts and fixture URLs only.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { BridgeError, connect, type BridgeClient, type BridgeWarning, type LocateResult, type Tab } from "@bridge/sdk";
import { saveEvaluateToFile } from "@bridge/sdk/download";
import { chunkRanges, SDK_CHUNK_CHARS, verifyTransfer } from "./blackboard/export-file.js";
import { chunkExpression } from "./blackboard/readonly.js";
import { heldKey } from "./blackboard/held.js";
import { extensionIdFromPath, logLinesSince, placementDiagnostics, placementLine, type Outcome, type Placement } from "./s9-rules.js";
import {
  answerIs,
  answerVerdict,
  asEvents,
  bblTimes,
  bblVerdict,
  BBL_LEGS,
  callsVerdict,
  capClickVerdict,
  checkLine10,
  clickedText,
  EXPECT10,
  expiredIdMessage,
  EXPR_MARKER,
  harnessExpression,
  hidePath,
  idonlyReading,
  isPageDigest,
  judge10,
  mcpfOffVerdict,
  mcpfTally,
  mcpfVerdict,
  memRecord,
  onlyText,
  parseSaveAnswer,
  parseTurn,
  pop2Class,
  pop2Reading,
  pressedText,
  primReading,
  PROMPTS,
  rowLine10,
  SAVE_PREFIX,
  saveVerdict,
  scan10,
  scanLine10,
  scanVerdict10,
  serverHits,
  setupTabs,
  sha256Hex,
  sharedRuns,
  show10,
  step10Check,
  stopLine10,
  surrVerdict,
  swMeasured,
  swOutcome,
  swPre,
  SW_ROWS,
  MCPF_ROWS,
  CAP_ROWS,
  r3rPlacementVerdict,
  type ReadRect,
  tabGoneMessage,
  tabHeldRe,
  toolLine,
  typedCssText,
  valueExpr,
  W_TITLE,
  WANT,
  type BblLeg,
  type IdonlyLeg,
  type ListedRow,
  type McpfKind,
  type MemSample,
  type PageDigest,
  type Pop2Grant,
  type SavedFile,
  type ScanMode,
  type TurnCall,
  type Want,
} from "./s10-rules.js";
import type { Judged } from "./s9-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OWN_ID = extensionIdFromPath(join(REPO, "extension"));
const OUT = process.env.S10_OUT?.trim() || process.env.S9_OUT?.trim() || join(tmpdir(), "bridge-e2e", "s15");
const STATE = join(OUT, "state.json");
const SV = join(OUT, "sv");
const ACTORS = process.env.S9_ACTORS?.trim() || join(OUT, "actors");
const [command = "--help", ...rest] = process.argv.slice(2);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const iso = (): string => new Date().toISOString();
const say = (msg: string): void => console.log(`${iso()} ${msg}`);

class SetUp extends Error {}

function option(flag: string): string | undefined {
  const i = rest.indexOf(flag);
  return i >= 0 ? rest[i + 1] : undefined;
}
function flag(name: string): boolean {
  return rest.includes(name);
}
function positional(): string[] {
  const out: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      if (!["--bare"].includes(rest[i])) i++;
      continue;
    }
    out.push(rest[i]);
  }
  return out;
}

let failed = false;
let notMeasured = false;

function check(id: string, step: string, j: Judged & { notMeasured?: boolean }): boolean {
  say(checkLine10(id, step, j));
  if (j.notMeasured) notMeasured = true;
  else if (!j.pass) failed = true;
  return j.pass;
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────

interface State {
  id: string;
  tabs: Record<string, string>;
  opened: string[];
  at: string;
  mcpfOff?: { since: number };
  mcpfTally?: Partial<Record<McpfKind, number>>;
  mcpfTallyR?: Partial<Record<McpfKind, number>>;
}

function loadState(): State {
  if (!existsSync(STATE)) throw new SetUp(`SET-UP: no ${STATE} — run \`s10.ts setup\` first`);
  return JSON.parse(readFileSync(STATE, "utf8")) as State;
}
function saveState(s: State): void {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}
function tabOf(key: string): string {
  const h = loadState().tabs[key];
  if (!h) throw new SetUp(`SET-UP: no tab "${key}" in ${STATE}`);
  return h;
}

// ── bridge helpers ────────────────────────────────────────────────────────────────────────────────────

async function client(name: string, failureReports = false): Promise<BridgeClient> {
  return connect({ name, failureReports });
}

async function attempt<T>(fn: () => Promise<T>): Promise<{ o: Outcome; result: T | undefined }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { o: { ok: true, ms: Date.now() - t0 }, result };
  } catch (err) {
    if (err instanceof BridgeError) return { o: { ok: false, code: String(err.code), message: err.message, data: err.data, ms: Date.now() - t0 }, result: undefined };
    return { o: { ok: false, code: "SCRIPT", message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 }, result: undefined };
  }
}

async function rows(c: BridgeClient): Promise<ListedRow[]> {
  const r = (await c.call("listTabs")) as { tabs?: ListedRow[] };
  return Array.isArray(r?.tabs) ? r.tabs : [];
}

async function rowOf(c: BridgeClient, handle: string): Promise<ListedRow | undefined> {
  return (await rows(c)).find((r) => r.tab === handle);
}

async function evalValue(c: BridgeClient, handle: string, expression: string, timeoutMs = 10_000): Promise<unknown> {
  // S7 wave fixer 2 (Return 2, block 18): sent as `return (<expr>);` (harnessExpression), as s9.ts / t5-lib.ts do —
  // SW-1's VISLOG IIFE has an inner `return`, so the extension's async-body wrap returned undefined without it.
  const env = (await c.call("evaluate", { tab: handle, expression: harnessExpression(expression), timeoutMs }, { timeoutMs: timeoutMs + 5_000 })) as { kind?: string; value?: unknown };
  if (env?.kind !== "json") throw new Error(`evaluate returned kind ${String(env?.kind)}`);
  return env.value;
}

async function safetyNow(c: BridgeClient): Promise<{ armed: boolean; evaluate: boolean; blockedCount: number } | null> {
  const st = (await c.call("daemon.status")) as { safety?: { armed: boolean; evaluate: boolean; blockedCount: number } | null };
  return st?.safety ?? null;
}

async function waitSafety(c: BridgeClient, want: { armed?: boolean; evaluate?: boolean; blockedCount?: number }, timeoutMs: number): Promise<boolean> {
  const t0 = Date.now();
  for (;;) {
    const s = await safetyNow(c);
    if (s && (want.armed === undefined || s.armed === want.armed) && (want.evaluate === undefined || s.evaluate === want.evaluate) && (want.blockedCount === undefined || s.blockedCount === want.blockedCount)) return true;
    if (Date.now() - t0 > timeoutMs) return false;
    await sleep(100);
  }
}

// ── signals with the driver (the same files as recipes/s9.ts: <OUT>\<row>.ready / .pressed) ────────────

function signalReady(row: string): void {
  mkdirSync(OUT, { recursive: true });
  rmSync(join(OUT, `${row}.pressed`), { force: true });
  writeFileSync(join(OUT, `${row}.ready`), iso());
  say(`READY ${row}`);
}
async function waitPressed(row: string, timeoutMs = 120_000): Promise<string> {
  const f = join(OUT, `${row}.pressed`);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (existsSync(f)) {
      const t = readFileSync(f, "utf8").trim();
      if (t) return t;
    }
    await sleep(50);
  }
  throw new SetUp(`SET-UP: the driver did not act for ${row} within ${timeoutMs / 1000} s`);
}
function clearSignals(...rowsToClear: string[]): void {
  for (const r of rowsToClear) {
    rmSync(join(OUT, `${r}.ready`), { force: true });
    rmSync(join(OUT, `${r}.pressed`), { force: true });
  }
}

// ── actors (recipes/s9-actor.ts, spawned with an argument array: no shell, nothing stripped) ───────────────

/**
 * Actor turn bounds (S7 prep fixer 1, m2): a block runs under the PowerShell tool's 600 s cap, so a turn is bounded
 * so that a block's turns fit its budget (recipes/s10-r15.ps1 BLOCK BUDGETS): 75 s for a turn with one small tool
 * call (MCPF-1's click block has 4 turns), 240 s for the 64 MiB `saveTo` turn (10 s page bound + the 120 s transfer
 * bound + the model). A turn that does not end in time is a STOP (`did not end`), never a re-run.
 */
const TURN_S = 75;
const TURN_BIG_S = 240;

function actorTurn(name: string, step: string, prompt: string, timeoutS = TURN_S): { calls: TurnCall[]; says: string[]; ended: boolean; file: string } {
  mkdirSync(ACTORS, { recursive: true });
  const r = spawnSync(process.execPath, ["--import", "tsx", join(REPO, "recipes", "s9-actor.ts"), "send", name, prompt, "--timeout", String(timeoutS)], {
    cwd: REPO,
    env: { ...process.env, S9_ACTORS: ACTORS },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: (timeoutS + 30) * 1000,
    windowsHide: true,
  });
  const file = join(ACTORS, `${name}.turn-${step}.txt`);
  writeFileSync(file, `${r.stdout ?? ""}${r.stderr ? `\n[stderr]\n${r.stderr}` : ""}`);
  const lines = String(r.stdout ?? "").split(/\r?\n/);
  const t = parseTurn(lines);
  if (!t.ended) throw new SetUp(`SET-UP: actor ${name}'s turn ${step} did not end (exit ${String(r.status)}; its output is in the actors folder)`);
  return { ...t, file };
}

/** The turn's calls as s10 lines: TOOL (expression and saveTo withheld), then each output item, `path` hidden. */
function printTurn(id: string, step: string, t: { calls: TurnCall[]; says: string[] }, path = ""): void {
  for (const c of t.calls) {
    say(`ROW ${id} ${step} ${toolLine(c)}`);
    say(`ROW ${id} ${step} OUTPUT${c.isError ? " (isError)" : ""} ${c.items.length} item(s)`);
    c.items.forEach((it, i) => {
      for (const l of hidePath(it ?? "", path).split("\n")) say(`ROW ${id} ${step}   [${i + 1}/${c.items.length}] ${rowLine10Text(l)}`);
    });
  }
}
function rowLine10Text(l: string): string {
  return rowLine10("x", "x", { ok: true, ms: 0 }, OWN_ID, l).replace(/^ROW x x ok ?/, "").replace(/ \(0 ms\)$/, "");
}

// ── commands: set-up and L1 ─────────────────────────────────────────────────────────────────────────────

async function cmdDaemonUp(): Promise<void> {
  const c = await client("s10-daemon-up");
  try {
    const st = (await c.call("daemon.status")) as { build?: string; extensionConnected?: boolean };
    const disk = sha256Hex(readFileSync(join(REPO, "daemon", "dist", "index.js")));
    say(`daemon up: build ${String(st.build).slice(0, 12)}… · disk daemon/dist/index.js ${disk.slice(0, 12)}… · equal ${st.build === disk ? "yes" : "NO"} · extension connected ${st.extensionConnected === true ? "yes" : "no"}`);
    if (st.build !== disk) throw new SetUp("SET-UP: the running daemon is not the build on disk after connect() (the handover did not happen)");
  } finally {
    c.close();
  }
}

async function cmdSetup(): Promise<void> {
  const c = await client("s10-setup");
  try {
    const all = await rows(c);
    const wUrl = "http://localhost:8080/e2e-playground.html?s9=w";
    const w = all.filter((r) => r.url === wUrl);
    if (w.length !== 1 || !w[0].tab) throw new SetUp(`SET-UP: expected exactly 1 tab at ${wUrl} (the driver window W), found ${w.length}`);
    const wh = w[0].tab;
    await evalValue(c, wh, `(document.title = ${JSON.stringify(W_TITLE)})`);
    say(`driver tab w = ${wh} (${w[0].current ? "current" : "NOT current"}), title set to ${JSON.stringify(W_TITLE)}`);
    const state: State = { id: OWN_ID, tabs: { w: wh }, opened: [], at: iso() };
    saveState(state);
    for (const t of setupTabs()) {
      const r = (await c.call("newTab", { url: t.url })) as { tab?: string };
      if (!r?.tab) throw new Error("newTab answered without a handle");
      const s = loadState();
      s.opened.push(r.tab);
      s.tabs[t.key] = r.tab;
      saveState(s);
      await c.call("waitFor", { tab: r.tab, text: t.text }, { timeoutMs: 20_000 });
      const row = await rowOf(c, r.tab);
      say(`opened ${t.key} = ${r.tab} (${row?.active ? "ACTIVE" : "background"}, window ${row?.windowId === w[0].windowId ? "W" : "NOT W"}) at ${show10(t.url, OWN_ID)}`);
      if (row?.windowId !== w[0].windowId) throw new SetUp(`SET-UP: tab ${t.key} opened outside W — every row needs its tabs in the driver's window`);
    }
    say(`state written to ${STATE}`);
  } finally {
    c.close();
  }
}

async function cmdS10Check(): Promise<void> {
  const c = await client("s10-check");
  try {
    const st = (await c.call("daemon.status")) as { build?: string };
    const disk = sha256Hex(readFileSync(join(REPO, "daemon", "dist", "index.js")));
    say(`ROW SAFE-0-S10 build daemon.status ${String(st.build).slice(0, 16)}… disk ${disk.slice(0, 16)}… equal ${st.build === disk ? "yes" : "no"}`);
    const a = tabOf("a");
    const r = await attempt(() => c.call("evaluateSaveStart", { tab: a, expression: "" }));
    say(rowLine10("SAFE-0-S10", "evaluateSaveStart", r.o, OWN_ID));
    check("SAFE-0-S10", "step10-build", step10Check(typeof st.build === "string" ? st.build : null, disk, r.o));
  } finally {
    c.close();
  }
}

// ── MCPF-1 ──────────────────────────────────────────────────────────────────────────────────────────────

const LOG_EXPR = "(window.__s10log || [])";

async function pageLog(c: BridgeClient, t: string): Promise<ReturnType<typeof asEvents>> {
  return asEvents(await evalValue(c, t, LOG_EXPR));
}

/** The mcpf tab behind: W's own tab w brought to the front (focusTab), then mcpf read as not active. */
async function mcpfBehind(c: BridgeClient, id: string, step: string): Promise<void> {
  const w = tabOf("w");
  const m = tabOf("mcpf");
  await c.call("focusTab", { tab: w });
  await sleep(300);
  const row = await rowOf(c, m);
  say(`ROW ${id} ${step} reset: w in front; mcpf active=${String(row?.active)}`);
  if (row?.active !== false) throw new SetUp(`SET-UP: ${id}: the mcpf tab is not behind before the trial (the row would not measure what it names)`);
}

/**
 * MCPF-1's armed legs, one kind per call (S7 prep fixer 1, m2: the runner's blocks mcpf-click / mcpf-type /
 * mcpf-press, each under the tool's cap): click starts with the focus question (RECORD); each kind's passed trials go
 * to state.json, and the press call prints the attempt's tally line and the 3of3 check (`mcpfTally`).
 */
async function cmdMcpf(): Promise<void> {
  // S7 wave fixer 3: `--row MCPF-1R` runs the same legs under the re-measurement's ID, with its own tally in state.json.
  const id = option("--row") ?? "MCPF-1";
  if (!MCPF_ROWS.includes(id)) throw new SetUp(`SET-UP: mcpf --row takes ${MCPF_ROWS.join(" or ")} only`);
  const tallyKey = id === "MCPF-1" ? "mcpfTally" : "mcpfTallyR";
  const actor = option("--actor");
  const only = option("--kind");
  if (!actor || (only !== "click" && only !== "type" && only !== "press")) throw new SetUp("SET-UP: mcpf --kind click|type|press --actor <name>");
  const c = await client(`s10-mcpf-${only}`);
  try {
    const m = tabOf("mcpf");
    if (only === "click") {
      const q = actorTurn(actor, "focus-question", PROMPTS.focusQuestion());
      say(`ROW ${id} focus-question tools called: ${q.calls.length} (RECORD)`);
      for (const s of q.says) say(`ROW ${id} focus-question SAYS ${rowLine10Text(s.replace(/\n/g, " ⏎ "))} (RECORD)`);
    }
    const plan: Array<{ kind: McpfKind; n: number }> = [];
    for (let n = 1; n <= 3; n++) plan.push({ kind: only, n });
    const tally: Record<McpfKind, number> = { click: 0, type: 0, press: 0 };
    for (const { kind, n } of plan) {
      const step = `${kind}-${n}`;
      await mcpfBehind(c, id, step);
      const before = (await pageLog(c, m)).length;
      const text = `mcpf${n}`;
      const prompt = kind === "click" ? PROMPTS.mcpfClick(m) : kind === "type" ? PROMPTS.mcpfType(m, text) : PROMPTS.mcpfPress(m, "Escape");
      const t = actorTurn(actor, step, prompt);
      printTurn(id, step, t);
      const tool = kind === "click" ? "browser_click" : kind === "type" ? "browser_type" : "browser_press_key";
      check(id, `${step}-calls`, callsVerdict(t.calls, [tool]));
      const want = kind === "click" ? clickedText("button", "MCPF target") : kind === "type" ? typedCssText("#mcpf-input") : pressedText("Escape");
      check(id, `${step}-answer`, answerIs(t.calls[0], want, false));
      const events = (await pageLog(c, m)).slice(before);
      const value = kind === "type" ? ((await evalValue(c, m, "document.getElementById('mcpf-input').value")) as string | null) : null;
      const row = await rowOf(c, m);
      say(`ROW ${id} ${step} page ${events.map((e) => `${e.type}${e.key ? `:${e.key}` : ""}@${e.target} isTrusted=${e.isTrusted} vis=${e.vis}`).join(", ") || "no event"}${kind === "type" ? ` · field ${value === text ? "equals" : "does NOT equal"} "${text}"` : ""} · tab active=${String(row?.active)} current=${String(row?.current === true)}`);
      const v = mcpfVerdict(kind, events, row ? row.active === true : null, { value, text, key: "Escape" });
      if (check(id, step, v)) tally[kind]++;
    }
    const s = loadState();
    s[tallyKey] = { ...(s[tallyKey] ?? {}), [only]: tally[only] };
    saveState(s);
    say(`ROW ${id} ${only} passed ${tally[only]}/3 (kept for the tally)`);
    if (only === "press") {
      const t = mcpfTally(s[tallyKey] ?? {});
      say(`ROW ${id} ${t.line}`);
      check(id, "3of3", t.check);
    }
    await c.call("focusTab", { tab: tabOf("w") });
  } finally {
    c.close();
  }
}

async function cmdMcpfOffPrep(): Promise<void> {
  const id = "MCPF-1-off";
  const c = await client("s10-mcpf-off-prep");
  try {
    await mcpfBehind(c, id, "prep");
    const since = (await pageLog(c, tabOf("mcpf"))).length;
    const s = loadState();
    s.mcpfOff = { since };
    saveState(s);
    say(`ROW ${id} prep page log length ${since} (the baseline; the bridge is still armed)`);
  } finally {
    c.close();
  }
}

async function cmdMcpfOff(): Promise<void> {
  const id = "MCPF-1-off";
  const actor = option("--actor");
  if (!actor) throw new SetUp("SET-UP: mcpf-off --actor <name>");
  const c = await client("s10-mcpf-off");
  try {
    const s = await safetyNow(c);
    if (s?.armed !== false) throw new SetUp(`SET-UP: ${id} needs the bridge disarmed (daemon.status armed=${String(s?.armed)})`);
    const t = actorTurn(actor, "off-click", PROMPTS.mcpfClick(tabOf("mcpf")));
    printTurn(id, "click", t);
    check(id, "calls", callsVerdict(t.calls, ["browser_click"]));
    check(id, "answer", answerIs(t.calls[0], EXPECT10.mcpDisarmedAll, true));
  } finally {
    c.close();
  }
}

async function cmdMcpfOffJudge(): Promise<void> {
  const id = "MCPF-1-off";
  const c = await client("s10-mcpf-off-judge");
  try {
    const since = loadState().mcpfOff?.since;
    if (since === undefined) throw new SetUp("SET-UP: mcpf-off-prep did not record a baseline");
    const m = tabOf("mcpf");
    const events = (await pageLog(c, m)).slice(since);
    const row = await rowOf(c, m);
    say(`ROW ${id} judge page events since the baseline: ${events.length} · tab active=${String(row?.active)}`);
    check(id, "page", mcpfOffVerdict(events, row ? row.active === true : null));
  } finally {
    c.close();
  }
}

// ── CAP-1 ───────────────────────────────────────────────────────────────────────────────────────────────

const CAP_CLICKS = "((window.__s10cap || {clicks: []}).clicks)";

async function capClicks(c: BridgeClient, t: string): Promise<Array<{ name: string }>> {
  const v = await evalValue(c, t, CAP_CLICKS);
  return Array.isArray(v) ? (v as Array<{ name: string }>) : [];
}

async function cmdCap1Sdk(): Promise<void> {
  const id = "CAP-1-sdk";
  const c = await client("s10-cap1-sdk");
  const warnings: BridgeWarning[] = [];
  const off = c.on("warning", (w) => warnings.push(w));
  try {
    const tab = await c.claim(tabOf("cap"));
    for (const [n, past] of [["0900", true], ["0010", false]] as const) {
      const name = `Cap item ${n}`;
      const loc = await attempt<LocateResult>(() => tab.locate({ role: "button", name }));
      const r = loc.result;
      say(rowLine10(id, `locate-${n}`, loc.o, OWN_ID, r ? `role ${r.role} name "${r.name}" keys ${Object.keys(r).sort().join(",")} pastSnapshotCap ${"pastSnapshotCap" in r ? String(r.pastSnapshotCap) : "absent"}` : ""));
      const flagOk = r !== undefined && r.name === name && (past ? r.pastSnapshotCap === true : !("pastSnapshotCap" in r));
      check(id, `locate-${n}`, flagOk ? { pass: true, why: past ? "pastSnapshotCap: true" : "the key is absent" } : { pass: false, why: loc.o.ok ? "the flag is not as expected" : `locate answered ${loc.o.code}` });
      const before = (await capClicks(c, tab.handle)).length;
      const w0 = warnings.length;
      const clk = await attempt(() => tab.click({ role: "button", name }));
      const fresh = warnings.slice(w0);
      say(rowLine10(id, `click-${n}`, clk.o, OWN_ID, `warning events ${fresh.length}${fresh.length ? ` ${JSON.stringify(fresh)}` : ""}`));
      const wantW = past ? [{ tab: tab.handle, method: "click", kind: "pastSnapshotCap" }] : [];
      check(id, `warning-${n}`, clk.o.ok && JSON.stringify(fresh) === JSON.stringify(wantW) ? { pass: true, why: past ? 'exactly one warning {tab, method:"click", kind:"pastSnapshotCap"}' : "no warning event" } : { pass: false, why: clk.o.ok ? `${fresh.length} warning event(s), expected ${wantW.length}` : `click answered ${clk.o.code}` });
      const clicks = await capClicks(c, tab.handle);
      check(id, `page-${n}`, capClickVerdict(clicks, before, name));
    }
    await tab.release();
  } finally {
    off();
    c.close();
  }
}

async function cmdCap1Mcp(): Promise<void> {
  // S7 wave fixer 3: `--row CAP-1R` runs the MCP leg under the re-measurement's ID (`CAP-1R-mcp`).
  const row = option("--row") ?? "CAP-1";
  if (!CAP_ROWS.includes(row)) throw new SetUp(`SET-UP: cap1-mcp --row takes ${CAP_ROWS.join(" or ")} only`);
  const id = `${row}-mcp`;
  const actor = option("--actor");
  if (!actor) throw new SetUp("SET-UP: cap1-mcp --actor <name>");
  const c = await client("s10-cap1-mcp");
  try {
    const t = tabOf("cap");
    for (const [n, past] of [["0900", true], ["0010", false]] as const) {
      const name = `Cap item ${n}`;
      const before = (await capClicks(c, t)).length;
      const turn = actorTurn(actor, `cap-${n}`, PROMPTS.capClick(t, name));
      printTurn(id, `click-${n}`, turn);
      check(id, `calls-${n}`, callsVerdict(turn.calls, ["browser_click"]));
      const want = past ? `${clickedText("button", name)}\n${EXPECT10.capWarning}` : clickedText("button", name);
      check(id, `answer-${n}`, answerIs(turn.calls[0], want, false));
      check(id, `page-${n}`, capClickVerdict(await capClicks(c, t), before, name));
    }
  } finally {
    c.close();
  }
}

// ── SW-1 ────────────────────────────────────────────────────────────────────────────────────────────────

const VISLOG_INSTALL =
  "(() => { const now = () => performance.timeOrigin + performance.now(); window.__s10vl = [[document.visibilityState, now(), 'start']];" +
  " if (!window.__s10vlOn) { window.__s10vlOn = true; document.addEventListener('visibilitychange', () => window.__s10vl.push([document.visibilityState, performance.timeOrigin + performance.now(), 'change'])); }" +
  " return document.visibilityState; })()";
const VISLOG_READ = "(window.__s10vl || [])";

async function cmdSw1(): Promise<void> {
  // S7 wave fixer 2: `sw1 --row SW-1R` runs the same row under SW-1R (SW-1 stopped in set-up in Run 15, NOT MEASURED;
  // §4.22's dated amendment). Only these two IDs; the steps, the pass rule and the outcome table are SW-1's.
  const id = option("--row") ?? "SW-1";
  if (!SW_ROWS.includes(id)) throw new SetUp(`SET-UP: sw1 --row takes ${SW_ROWS.join(" or ")} only`);
  const c = await client("s10-sw1");
  try {
    const w = tabOf("w");
    const sw = tabOf("sw");
    const wr = await rowOf(c, w);
    const sr = await rowOf(c, sw);
    say(`ROW ${id} set-up w active=${String(wr?.active)} current=${String(wr?.current === true)} · sw active=${String(sr?.active)} same window ${wr?.windowId === sr?.windowId ? "yes" : "no"}`);
    if (!wr?.active || wr.current !== true || sr?.active !== false || wr.windowId !== sr.windowId) throw new SetUp(`SET-UP: ${id} needs w in front and current, and sw behind it in the same window`);
    const ds: number[] = [];
    for (let k = 1; k <= 3; k++) {
      say(`ROW ${id} trial-${k} vislog w ${String(await evalValue(c, w, VISLOG_INSTALL))} · sw ${String(await evalValue(c, sw, VISLOG_INSTALL))}`);
      await sleep(1600);
      // M2 (S7 prep fixer 1): before each capture, the intended tab's row — (i) sw behind, (ii) w in front. A miss
      // makes this trial NOT MEASURED (never re-run); its capture is not taken.
      const pi = swPre("i", await rowOf(c, sw));
      say(`ROW ${id} trial-${k} ${pi.line}`);
      if (!pi.measured) {
        ds.push(NaN);
        say(`ROW ${id} trial-${k} NOT MEASURED (pre-(i) failed; no capture taken) · d=not measured`);
        await sleep(1600);
        continue;
      }
      const i0 = Date.now();
      const bi = await attempt(() => c.call("screenshot", { tab: sw }, { timeoutMs: 40_000 }));
      const di = Date.now() - i0;
      await sleep(1600);
      const pii = swPre("ii", await rowOf(c, w));
      say(`ROW ${id} trial-${k} ${pii.line}`);
      if (!pii.measured) {
        ds.push(NaN);
        say(`ROW ${id} trial-${k} NOT MEASURED (pre-(ii) failed; (ii) not taken) · (i) background ${bi.o.ok ? "ok" : bi.o.code} ${di} ms · d=not measured`);
        await sleep(1600);
        continue;
      }
      const ii0 = Date.now();
      const bii = await attempt(() => c.call("screenshot", { tab: w }, { timeoutMs: 40_000 }));
      const dii = Date.now() - ii0;
      await sleep(1600);
      const d = bi.o.ok && bii.o.ok ? di - dii : NaN;
      ds.push(d);
      say(`ROW ${id} trial-${k} (i) background ${bi.o.ok ? "ok" : bi.o.code} ${di} ms · (ii) front ${bii.o.ok ? "ok" : bii.o.code} ${dii} ms · d=${Number.isFinite(d) ? `${d} ms` : "not measured"}`);
      const fmt = (log: unknown, from: number): string =>
        Array.isArray(log) ? (log as Array<[string, number, string]>).filter((e) => e[2] === "change").map((e) => `${e[0]}+${Math.round(e[1] - from)}`).join(" ") || "no change" : "not read";
      say(`ROW ${id} trial-${k} vis (RECORD, ms from (i)'s start) w ${fmt(await evalValue(c, w, VISLOG_READ), i0)} · sw ${fmt(await evalValue(c, sw, VISLOG_READ), i0)}`);
    }
    const outcome = swOutcome(ds);
    say(`ROW ${id} measured ${swMeasured(ds)}/3 trials (a decided outcome needs 3/3)`);
    say(`ROW ${id} outcome d=[${ds.map((d) => (Number.isFinite(d) ? d : "n/m")).join(", ")}] ms → ${outcome} (RECORD; the outcome table of 0.8's F3 note)`);
  } finally {
    c.close();
  }
}

// ── R15-POP-2 ───────────────────────────────────────────────────────────────────────────────────────────

const POPUP_URL = "http://localhost:8080/e2e-playground.html?popup=1";

async function cmdPop2(): Promise<void> {
  const leg = option("--leg");
  if (leg !== "a" && leg !== "b") throw new SetUp("SET-UP: pop2 --leg a|b");
  const id = "R15-POP-2";
  const name = `s10-pop2-${leg}`;
  const c = await client(name);
  try {
    const p = tabOf("pop");
    const events: Array<{ at: number; p: { tab?: string; reason?: string; url?: string } }> = [];
    const off = c.on("leaseGranted", (e) => events.push({ at: Date.now(), p: e as { tab?: string; reason?: string; url?: string } }));
    const cl = await attempt(() => c.call("tabs.claim", { tab: p }));
    say(rowLine10(id, `${leg}-claim`, cl.o, OWN_ID, cl.o.ok ? p : ""));
    const owner = (await rowOf(c, p))?.owner;
    if (!cl.o.ok || owner !== name) throw new SetUp(`SET-UP: ${id} ${leg}: ${p} is not held by this client before the click`);
    if (leg === "a") await c.call("focusTab", { tab: p });
    else await c.call("focusTab", { tab: tabOf("w") });
    await sleep(400);
    const opener = await rowOf(c, p);
    say(`ROW ${id} ${leg}-opener ${p} active=${String(opener?.active)} (${leg === "a" ? "expected in front" : "expected behind"})`);
    if ((leg === "a") !== (opener?.active === true)) throw new SetUp(`SET-UP: ${id} ${leg}: the opener is not ${leg === "a" ? "in front" : "behind"}`);
    const before = new Set((await rows(c)).map((r) => r.tab));
    const t0 = Date.now();
    const clk = await attempt(() => c.call("click", { tab: p, locator: { role: "link", name: "Open popup" } }));
    say(rowLine10(id, `${leg}-click-synthetic`, clk.o, OWN_ID));
    while (Date.now() - t0 < 5000 && events.length === 0) await sleep(50);
    await sleep(300);
    const fresh = (await rows(c)).filter((r) => r.tab && !before.has(r.tab));
    const cls = pop2Class(fresh, opener?.id ?? -1);
    const ev = events[0];
    const grant: Pop2Grant | null = ev ? { reason: ev.p.reason, urlIsPopup: ev.p.url === POPUP_URL, ms: ev.at - t0 } : null;
    say(`ROW ${id} ${leg}-class popup opener class: ${cls} (new tabs ${fresh.length}; never a URL)`);
    say(`ROW ${id} ${leg}-grant ${grant ? `leaseGranted reason ${String(grant.reason)} url-is-popup ${grant.urlIsPopup ? "yes" : "no"} after ${grant.ms} ms` : "no leaseGranted within 5 s"}`);
    const r = pop2Reading(cls, grant);
    if (r.check) check(id, `${leg}-leaseGranted`, r.check);
    say(`ROW ${id} ${leg}-reading ${r.reading}`);
    off();
    for (const row of fresh) {
      const x = await attempt(() => c.call("closeTab", { tab: row.tab }));
      say(rowLine10(id, `${leg}-close-${String(row.tab)}`, x.o, OWN_ID));
    }
    const rel = await attempt(() => c.call("tabs.release", { tab: p }));
    say(rowLine10(id, `${leg}-release`, rel.o, OWN_ID, rel.o.ok ? p : ""));
  } finally {
    c.close();
  }
}

// ── SAVE rows ───────────────────────────────────────────────────────────────────────────────────────────

function savePath(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) throw new SetUp("SET-UP: a save name is lower-case letters, digits and -");
  mkdirSync(SV, { recursive: true });
  return win32.normalize(join(SV, `${SAVE_PREFIX}${name}.txt`));
}

function fileFacts(p: string): SavedFile {
  const exists = existsSync(p);
  const part = existsSync(`${p}.part`);
  if (!exists) return { exists, part, bytes: null, sha256: null };
  const buf = readFileSync(p);
  return { exists, part, bytes: buf.length, sha256: sha256Hex(buf) };
}

function fileLine(id: string, step: string, f: SavedFile): string {
  return `ROW ${id} ${step}-file exists=${f.exists ? "yes" : "no"} part=${f.part ? "yes" : "no"}${f.exists ? ` bytes=${f.bytes} sha256=${f.sha256}` : ""}`;
}

function freshPath(name: string): string {
  const p = savePath(name);
  rmSync(p, { force: true });
  rmSync(`${p}.part`, { force: true });
  return p;
}


async function pageDigest(c: BridgeClient, t: string, key: string): Promise<PageDigest> {
  const v = await evalValue(c, t, `window.${EXPR_MARKER}status[${JSON.stringify(key)}]`);
  if (!isPageDigest(v)) throw new SetUp(`SET-UP: the page holds no built value "${key}" (run save-build first)`);
  return v;
}

async function cmdSaveBuild(): Promise<void> {
  const [key] = positional();
  if (!key) throw new SetUp("SET-UP: save-build <key>");
  const c = await client("s10-save-build");
  try {
    const t = tabOf(option("--tab") ?? "save");
    const t0 = Date.now();
    const v = await evalValue(c, t, `await window.${EXPR_MARKER}build(${JSON.stringify(key)})`, 60_000);
    if (!isPageDigest(v)) throw new SetUp(`SET-UP: the page did not build "${key}"`);
    say(`ROW SAVE-BUILD ${key} page digest kind ${v.kind} length ${v.length} bytes ${v.bytes} sha256 ${v.sha256} (built in ${Date.now() - t0} ms, on ${t})`);
  } finally {
    c.close();
  }
}

async function readAll(p: string): Promise<string | null> {
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

async function cmdSaveSdk(rowArg?: string, keyArg?: string, bareArg?: boolean): Promise<{ o: Outcome; page: PageDigest; file: SavedFile } | undefined> {
  const [rowP, keyP] = positional();
  const id = rowArg ?? rowP;
  const key = keyArg ?? keyP;
  const bare = bareArg ?? flag("--bare");
  if (!id || !key) throw new SetUp("SET-UP: save-sdk <ROW> <key> [--bare]");
  const c = await client(`s10-${id.toLowerCase()}-sdk`);
  try {
    const handle = tabOf(option("--tab") ?? "save");
    const page = await pageDigest(c, handle, key);
    const p = freshPath(`${key}-sdk${bare ? "-bare" : ""}`);
    const tab: Tab = await c.claim(handle);
    const r = await attempt(() => tab.evaluateToFile(valueExpr(key, bare), { path: p, timeoutMs: 60_000 }));
    const res = r.result;
    const resText = res ? JSON.stringify({ ...res, path: "<saveTo>" }) : "";
    say(rowLine10(id, "sdk", r.o, OWN_ID, res ? `result ${resText} (path equals the asked path: ${res.path === p ? "yes" : "no"})` : ""));
    const f = fileFacts(p);
    say(fileLine(id, "sdk", f));
    say(`ROW ${id} sdk page bytes=${page.bytes} sha256=${page.sha256} kind=${page.kind}`);
    if (r.o.ok && res) {
      check(id, "sdk", saveVerdict(page, f, { bytes: res.bytes, kind: res.kind, sha256: res.sha256 }));
      const value = await readAll(p);
      const runs = value === null ? -1 : sharedRuns(value, JSON.stringify(res), 16);
      check(id, "sdk-result-runs16", runs === 0 ? { pass: true, why: "no 16-character run of the value in the SDK's result" } : { pass: false, why: `${runs} 16-character run(s) of the value in the SDK's result` });
    }
    await tab.release();
    return { o: r.o, page, file: f };
  } finally {
    c.close();
  }
}

async function cmdSaveMcp(rowArg?: string, keyArg?: string): Promise<void> {
  const [rowP, keyP] = positional();
  const id = rowArg ?? rowP;
  const key = keyArg ?? keyP;
  const actor = option("--actor");
  if (!id || !key || !actor) throw new SetUp("SET-UP: save-mcp <ROW> <key> --actor <name>");
  const c = await client(`s10-${id.toLowerCase()}-mcp`);
  try {
    const handle = tabOf(option("--tab") ?? "save");
    const page = await pageDigest(c, handle, key);
    const p = freshPath(`${key}-mcp`);
    const t = actorTurn(actor, `${id.toLowerCase()}-mcp`, PROMPTS.saveTo(handle, valueExpr(key), p), key === "64m" ? TURN_BIG_S : TURN_S);
    printTurn(id, "mcp", t, p);
    check(id, "mcp-calls", callsVerdict(t.calls, ["browser_evaluate"]));
    const call = t.calls[0];
    const answer = call ? onlyText(call) : null;
    const f = fileFacts(p);
    say(fileLine(id, "mcp", f));
    const parsed = answer ? parseSaveAnswer(answer) : null;
    say(`ROW ${id} mcp answer ${answer === null ? "not one text item" : `${answer.length} characters (bound ${Math.min(300, p.length + 120)})`} · isError ${String(call?.isError)}`);
    const value = await readAll(p);
    const runs = value === null || answer === null ? -1 : sharedRuns(value, answer, 16);
    if (answer !== null && value !== null) check(id, "mcp-answer", answerVerdict(answer, p, page, runs));
    else check(id, "mcp-answer", { pass: false, why: answer === null ? "no answer text" : "no file to compare the answer with" });
    check(id, "mcp", saveVerdict(page, f, parsed ? { bytes: parsed.bytes, kind: parsed.kind, sha256: parsed.sha256 } : null));
  } finally {
    c.close();
  }
}

async function cmdSaveSurr(): Promise<void> {
  const r = await cmdSaveSdk("SAVE-SURR", "surr", false);
  if (!r?.file.exists) return;
  const buf = readFileSync(savePath("surr-sdk"));
  check("SAVE-SURR", "bytes", surrVerdict(buf));
}

async function cmdSaveRefuse(): Promise<void> {
  const id = "SAVE-REFUSE";
  const c = await client("s10-save-refuse");
  try {
    const tab = await c.claim(tabOf("save"));
    const cases: Array<{ step: string; expr: string; want: Want }> = [
      { step: "undefined", expr: "return undefined", want: { code: "BAD_PARAMS", message: EXPECT10.refuseUndefined, data: "absent" } },
      { step: "node", expr: "return document.body", want: { code: "BAD_PARAMS", message: EXPECT10.refuseNode, data: "absent" } },
      { step: "map", expr: "return new Map([[1, 2]])", want: { code: "BAD_PARAMS", message: EXPECT10.refuseMap, data: "absent" } },
      { step: "cycle", expr: "return (() => { const o = {}; o.self = o; return o; })()", want: { code: "PAGE_ERROR", message: EXPECT10.stringifyFailed, data: { name: "TypeError" } } },
    ];
    for (const k of cases) {
      const p = freshPath(`refuse-${k.step}`);
      const r = await attempt(() => tab.evaluateToFile(k.expr, { path: p }));
      say(rowLine10(id, k.step, r.o, OWN_ID));
      check(id, k.step, judge10(r.o, k.want));
      const f = fileFacts(p);
      say(fileLine(id, k.step, f));
      check(id, `${k.step}-file`, !f.exists && !f.part ? { pass: true, why: "no file, no .part" } : { pass: false, why: "a file or a .part was left" });
    }
    await tab.release();
  } finally {
    c.close();
  }
}

async function cmdSaveHold(): Promise<void> {
  const id = "SAVE-HOLD";
  const A = await client("s10-save-hold-A");
  const Bc = await client("s10-save-hold-B");
  try {
    const t = tabOf("save");
    await pageDigest(A, t, "4m");
    const cl = await attempt(() => A.call("tabs.claim", { tab: t }));
    say(rowLine10(id, "A-claim", cl.o, OWN_ID, cl.o.ok ? t : ""));
    if (!cl.o.ok) throw new SetUp(`SET-UP: ${id}: A could not claim ${t}`);
    const st = await attempt(() => A.call("evaluateSaveStart", { tab: t, expression: valueExpr("4m"), timeoutMs: 60_000 }, { timeoutMs: 190_000 }));
    const sid = (st.result as { id?: string } | undefined)?.id;
    say(rowLine10(id, "A-start", st.o, OWN_ID, st.o.ok ? `id ${String(sid)} bytes ${String((st.result as { bytes?: number }).bytes)}` : ""));
    if (!sid) throw new SetUp(`SET-UP: ${id}: A's start gave no id`);
    const pull = await attempt(() => Bc.call("evaluateSaveChunk", { tab: t, id: sid, offset: 0 }));
    say(rowLine10(id, "B-pull", pull.o, OWN_ID));
    check(id, "B-pull", judge10(pull.o, { code: "TAB_HELD", messageRe: tabHeldRe(t, "s10-save-hold-A") }));
    const end = await attempt(() => A.call("evaluateSaveEnd", { tab: t, id: sid }));
    say(rowLine10(id, "A-end", end.o, OWN_ID, end.o.ok ? JSON.stringify(end.result) : ""));
    const rel = await attempt(() => A.call("tabs.release", { tab: t }));
    say(rowLine10(id, "A-release", rel.o, OWN_ID));
  } finally {
    A.close();
    Bc.close();
  }
}

type RawCall = (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) => Promise<unknown>;

/** A raw call that pauses once, right before the `pauseAt`-th `evaluateSaveChunk` (1-based), and records the id. */
function pausing(c: BridgeClient, pauseAt: number, onPause: (id: string) => Promise<void>): { call: RawCall; info: { id?: string; pulls: number } } {
  const info: { id?: string; pulls: number } = { pulls: 0 };
  let paused = false;
  const call: RawCall = async (m, p, o) => {
    if (m === "evaluateSaveChunk") {
      info.pulls++;
      if (info.pulls === pauseAt && !paused) {
        paused = true;
        await onPause(info.id ?? "");
      }
    }
    const r = await c.call(m, p, o);
    if (m === "evaluateSaveStart") info.id = (r as { id?: string })?.id;
    return r;
  };
  return { call, info };
}

/**
 * A save of `key` on `tabKey` through the SDK's own writer (`saveEvaluateToFile`, what Tab.evaluateToFile runs) that
 * pauses before the 2nd pull; `during` runs in the pause; returns the outcome, the file facts and the store id.
 */
async function pausedSave(c: BridgeClient, id: string, tabKey: string, key: string, during: (sid: string) => Promise<void>): Promise<{ o: Outcome; f: SavedFile; sid: string; handle: string }> {
  const handle = tabOf(tabKey);
  await pageDigest(c, handle, key);
  const p = freshPath(`${id.toLowerCase().replace(/^save-/, "")}-paused`);
  const w = pausing(c, 2, during);
  const r = await attempt(() => saveEvaluateToFile(w.call, handle, valueExpr(key), { path: p, timeoutMs: 60_000 }));
  say(rowLine10(id, "pull-2", r.o, OWN_ID, r.o.ok ? "the save finished" : ""));
  say(`ROW ${id} store id ${String(w.info.id)} · pulls sent ${w.info.pulls}`);
  const f = fileFacts(p);
  say(fileLine(id, "pull-2", f));
  check(id, "pull-2-file", !f.exists && !f.part ? { pass: true, why: "no file, no .part" } : { pass: false, why: "a file or a .part was left" });
  return { o: r.o, f, sid: w.info.id ?? "", handle };
}

async function oldIdPull(c: BridgeClient, id: string, handle: string, sid: string, want: Want | "record"): Promise<void> {
  const r = await attempt(() => c.call("evaluateSaveChunk", { tab: handle, id: sid, offset: 0 }));
  say(rowLine10(id, "old-id", r.o, OWN_ID, r.o.ok ? `${String((r.result as { data?: string })?.data?.length ?? 0)} base64 characters (RECORD)` : ""));
  if (want !== "record") check(id, "old-id", judge10(r.o, want));
}

async function cmdSaveDisarm(): Promise<void> {
  const id = "SAVE-DISARM";
  clearSignals(id, `${id}-rearm`);
  const c = await client("s10-save-disarm");
  try {
    const s0 = await safetyNow(c);
    if (s0?.armed !== true) throw new SetUp(`SET-UP: ${id} needs the bridge armed`);
    const r = await pausedSave(c, id, "save", "4m", async () => {
      signalReady(id);
      say(`ROW ${id} driver pressed at ${await waitPressed(id)}`);
      if (!(await waitSafety(c, { armed: false }, 5000))) throw new SetUp(`SET-UP: ${id}: daemon.status did not show the disarm within 5 s`);
    });
    check(id, "pull-2", judge10(r.o, WANT.disarmedAll));
    signalReady(`${id}-rearm`);
    say(`ROW ${id} driver re-armed at ${await waitPressed(`${id}-rearm`)}`);
    if (!(await waitSafety(c, { armed: true }, 60_000))) throw new SetUp(`SET-UP: ${id}: not re-armed within 60 s`);
    await oldIdPull(c, id, r.handle, r.sid, { code: "INTERNAL", message: expiredIdMessage(r.sid), data: "absent" });
  } finally {
    c.close();
  }
}

async function cmdSaveJsoff(): Promise<void> {
  const id = "SAVE-JSOFF";
  clearSignals(id, `${id}-on`);
  const c = await client("s10-save-jsoff");
  try {
    const s0 = await safetyNow(c);
    if (s0?.armed !== true || s0.evaluate !== true) throw new SetUp(`SET-UP: ${id} needs the bridge armed with JavaScript on`);
    const r = await pausedSave(c, id, "save", "4m", async () => {
      signalReady(id);
      say(`ROW ${id} driver turned JavaScript off at ${await waitPressed(id)}`);
      if (!(await waitSafety(c, { evaluate: false }, 5000))) throw new SetUp(`SET-UP: ${id}: daemon.status did not show JavaScript off within 5 s`);
    });
    check(id, "pull-2", judge10(r.o, WANT.jsDisabled));
    const ev = await attempt(() => c.call("evaluate", { tab: r.handle, expression: "1+1", timeoutMs: 5000 }, { timeoutMs: 10_000 }));
    say(rowLine10(id, "evaluate", ev.o, OWN_ID));
    const st = await attempt(() => c.call("evaluateSaveStart", { tab: r.handle, expression: valueExpr("4m"), timeoutMs: 5000 }, { timeoutMs: 130_000 }));
    say(rowLine10(id, "start", st.o, OWN_ID));
    check(id, "evaluate", judge10(ev.o, WANT.jsDisabled));
    const same = !st.o.ok && !ev.o.ok && st.o.code === ev.o.code && st.o.message === ev.o.message && JSON.stringify(st.o.data) === JSON.stringify(ev.o.data);
    check(id, "start-equals-evaluate", same ? { pass: true, why: "evaluateSaveStart's refusal equals evaluate's (code, message, data)" } : { pass: false, why: "the start's refusal differs from evaluate's" });
    signalReady(`${id}-on`);
    say(`ROW ${id} driver turned JavaScript on at ${await waitPressed(`${id}-on`)}`);
    if (!(await waitSafety(c, { evaluate: true }, 10_000))) throw new SetUp(`SET-UP: ${id}: JavaScript not back on within 10 s`);
    await oldIdPull(c, id, r.handle, r.sid, { code: "INTERNAL", message: expiredIdMessage(r.sid), data: "absent" });
  } finally {
    c.close();
  }
}

async function cmdSaveBlock(): Promise<void> {
  const id = "SAVE-BLOCK";
  clearSignals(id, `${id}-unblock`);
  const c = await client("s10-save-block");
  try {
    const s0 = await safetyNow(c);
    if (s0?.armed !== true || s0.blockedCount !== 0) throw new SetUp(`SET-UP: ${id} needs the bridge armed with an empty block list`);
    const r = await pausedSave(c, id, "blk", "4m", async () => {
      signalReady(id);
      say(`ROW ${id} driver saved the block list at ${await waitPressed(id)}`);
      if (!(await waitSafety(c, { blockedCount: 1 }, 5000))) throw new SetUp(`SET-UP: ${id}: daemon.status did not show 1 blocked site within 5 s`);
    });
    check(id, "pull-2", judge10(r.o, WANT.blockedTab));
    const st = await attempt(() => c.call("evaluateSaveStart", { tab: r.handle, expression: valueExpr("4m"), timeoutMs: 5000 }, { timeoutMs: 130_000 }));
    say(rowLine10(id, "start", st.o, OWN_ID));
    check(id, "start", judge10(st.o, WANT.blockedTab));
    signalReady(`${id}-unblock`);
    say(`ROW ${id} driver emptied the block list at ${await waitPressed(`${id}-unblock`)}`);
    if (!(await waitSafety(c, { blockedCount: 0 }, 10_000))) throw new SetUp(`SET-UP: ${id}: the block list not empty within 10 s`);
    await oldIdPull(c, id, r.handle, r.sid, "record");
    const end = await attempt(() => c.call("evaluateSaveEnd", { tab: r.handle, id: r.sid }));
    say(rowLine10(id, "end", end.o, OWN_ID, end.o.ok ? `${JSON.stringify(end.result)} (RECORD)` : ""));
  } finally {
    c.close();
  }
}

async function cmdSaveClose(): Promise<void> {
  const id = "SAVE-CLOSE";
  const c = await client("s10-save-close");
  try {
    const r = await pausedSave(c, id, "close", "4m", async () => {
      const x = await attempt(() => c.call("closeTab", { tab: tabOf("close") }));
      say(rowLine10(id, "close-tab", x.o, OWN_ID));
      if (!x.o.ok) throw new SetUp(`SET-UP: ${id}: the tab could not be closed mid-save`);
      await sleep(500);
    });
    check(id, "pull-2", judge10(r.o, { code: "TAB_GONE", message: tabGoneMessage(r.handle) }));
  } finally {
    c.close();
  }
}

async function cmdSaveTtl(): Promise<void> {
  const id = "SAVE-TTL";
  const idle = Number(option("--idle-s") ?? "330");
  const c = await client("s10-save-ttl");
  try {
    const r = await pausedSave(c, id, "save", "4m", async (sid) => {
      say(`ROW ${id} idle ${idle} s after the first pull of ${sid} (the TTL is 300 s, refreshed by each pull)`);
      await sleep(idle * 1000);
    });
    check(id, "pull-2", judge10(r.o, { code: "INTERNAL", message: expiredIdMessage(r.sid), data: "absent" }));
    say(`ROW ${id} note: a worker restart during the idle answers the same text — this row cannot tell an expiry from a lost store`);
  } finally {
    c.close();
  }
}

async function cmdPrim(): Promise<void> {
  const r = await cmdSaveSdk("SAVE-PRIM", "64m", true);
  if (!r) return;
  const v = r.o.ok ? saveVerdict(r.page, r.file, null) : null;
  const reading = primReading(r.o, r.o.ok ? { pass: r.file.sha256 === r.page.sha256, why: v?.why ?? "" } : null, r.page.bytes);
  say(`ROW SAVE-PRIM reading ${reading.line}`);
}

async function cmdIdonly(): Promise<void> {
  const port = Number(option("--port"));
  if (!Number.isInteger(port) || port < 1024) throw new SetUp("SET-UP: idonly --port <p>");
  const ver = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { Browser?: string; webSocketDebuggerUrl?: string };
  if (!ver.webSocketDebuggerUrl) throw new SetUp("SET-UP: the headless Chrome gave no browser endpoint");
  say(`ROW SAVE-IDONLY chrome ${String(ver.Browser)} (the endpoint is not printed)`);
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise<void>((res, rej) => {
    ws.once("open", () => res());
    ws.once("error", rej);
  });
  let next = 1;
  const pending = new Map<number, (m: Record<string, unknown>) => void>();
  ws.on("message", (d) => {
    const m = JSON.parse(String(d)) as Record<string, unknown>;
    if (typeof m.id === "number" && pending.has(m.id)) {
      pending.get(m.id)!(m);
      pending.delete(m.id);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<Record<string, unknown>> =>
    new Promise((res) => {
      const id = next++;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  try {
    const created = await send("Target.createTarget", { url: "http://localhost:8080/s10-save.html?s15=idonly" });
    const targetId = (created.result as { targetId?: string })?.targetId;
    const att = await send("Target.attachToTarget", { targetId, flatten: true });
    const sid = (att.result as { sessionId?: string })?.sessionId;
    if (!sid) throw new SetUp("SET-UP: could not attach to the headless page");
    await sleep(1500);
    const leg = async (expression: string, idOnly: boolean): Promise<IdonlyLeg> => {
      const params: Record<string, unknown> = { expression, replMode: true, awaitPromise: true, returnByValue: false, generatePreview: false };
      if (idOnly) params.serializationOptions = { serialization: "idOnly" };
      const r = await send("Runtime.evaluate", params, sid);
      if (r.error) return { accepted: false, error: String((r.error as { message?: string }).message ?? "error"), objectId: false, value: false };
      const ro = ((r.result as { result?: Record<string, unknown> })?.result ?? {}) as Record<string, unknown>;
      return { accepted: true, type: String(ro.type), objectId: typeof ro.objectId === "string", value: "value" in ro };
    };
    const prim = await leg("'S15' + 'GHJK'.repeat(4)", true);
    const object = await leg("({ a: 1 })", true);
    const plain = await leg("'S15' + 'GHJK'.repeat(4)", false);
    const fmt = (n: string, l: IdonlyLeg): string => `${n}: ${l.accepted ? `type ${l.type} objectId ${l.objectId ? "yes" : "no"} value inline ${l.value ? "yes" : "no"}` : `refused (${scrubLine(l.error ?? "")})`}`;
    say(`ROW SAVE-IDONLY ${fmt("primitive+idOnly", prim)} · ${fmt("object+idOnly (control)", object)} · ${fmt("primitive plain (control)", plain)}`);
    say(`ROW SAVE-IDONLY reading ${idonlyReading({ prim, object, plain }).line}`);
    // Browser.close may never answer (the browser ends and drops the socket): send it, then wait ≤ 5 s for the close.
    const gone = new Promise<boolean>((res) => {
      ws.once("close", () => res(true));
      setTimeout(() => res(false), 5000);
    });
    ws.send(JSON.stringify({ id: next++, method: "Browser.close", params: {} }));
    say(`ROW SAVE-IDONLY Browser.close sent; the browser's socket closed within 5 s: ${(await gone) ? "yes" : "no"} (the driver then checks its PIDs gone)`);
  } finally {
    ws.close();
  }
}

function scrubLine(s: string): string {
  return rowLine10Text(s);
}

async function cmdMemRecord(): Promise<void> {
  const f = option("--file");
  if (!f || !existsSync(f)) throw new SetUp("SET-UP: mem-record --file <samples>");
  const samples: MemSample[] = readFileSync(f, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).map((l) => {
    const [ms, pid, priv] = l.trim().split(/\s+/).map(Number);
    return { ms, pid, priv };
  }).filter((s) => [s.ms, s.pid, s.priv].every(Number.isFinite));
  const r = memRecord(samples);
  say(r ? `ROW SAVE-64 memory (RECORD; the extension-process chrome.exe with the largest rise; ${r.pids} candidate(s), ${samples.length} samples): pid ${r.pid} private ${r.baseMiB} MiB → peak ${r.peakMiB} MiB (+${r.deltaMiB} MiB at +${r.atMs} ms)` : "ROW SAVE-64 memory (RECORD): no samples");
}

// ── SAVE-FIX (0.5's fixture leg) ────────────────────────────────────────────────────────────────────────

async function cmdSaveFixSdk(): Promise<void> {
  const id = "SAVE-FIX";
  const c = await client("s10-savefix-sdk");
  try {
    const tab = await c.claim(tabOf("save"));
    const page = await pageDigest(c, tab.handle, "fix");
    say(`ROW ${id} page length ${page.length} bytes ${page.bytes} sha256 ${page.sha256}`);
    // As recipes/blackboard/export-grades.ts reads today: Tab.evaluate in 100 000-character chunks, then the length,
    // bytes and sha256 checked against the page's own (verifyTransfer), then a .part file renamed into place.
    let text = "";
    const ranges = chunkRanges(page.length, SDK_CHUNK_CHARS);
    for (const [a, b] of ranges) {
      const part = await tab.evaluate<string>(`window.${EXPR_MARKER}export.slice(${a}, ${b})`, { timeoutMs: 30_000 });
      if (typeof part !== "string" || part.length !== b - a) throw new Error(`chunk [${a}, ${b}) came back wrong`);
      text += part;
    }
    verifyTransfer(text, { length: page.length, bytes: page.bytes, sha256: page.sha256 });
    const p = freshPath("fix-sdk");
    writeFileSync(`${p}.part`, text, "utf8");
    renameSync(`${p}.part`, p);
    const f = fileFacts(p);
    say(`ROW ${id} sdk pulled ${ranges.length} chunk(s) of ${SDK_CHUNK_CHARS}; length, bytes and sha256 equal the page's: yes`);
    say(fileLine(id, "sdk", f));
    check(id, "sdk", f.sha256 === page.sha256 ? { pass: true, why: "the SDK leg's file sha256 = the page's" } : { pass: false, why: "the SDK leg's file differs from the page's" });
    await tab.release();
  } finally {
    c.close();
  }
}

async function cmdSaveFixMcp(): Promise<void> {
  await cmdSaveMcp("SAVE-FIX", "fix");
}

async function cmdSaveFixJudge(): Promise<void> {
  const id = "SAVE-FIX";
  const tr = option("--transcript");
  if (!tr || !existsSync(tr)) throw new SetUp("SET-UP: savefix-judge --transcript <the actor's extracted transcript>");
  const sdk = fileFacts(savePath("fix-sdk"));
  const mcp = fileFacts(savePath("fix-mcp"));
  const c = await client("s10-savefix-judge");
  let page: PageDigest;
  try {
    page = await pageDigest(c, tabOf("save"), "fix");
  } finally {
    c.close();
  }
  say(`ROW ${id} judge page ${page.sha256} · sdk file ${String(sdk.sha256)} · mcp file ${String(mcp.sha256)}`);
  const eq = sdk.exists && mcp.exists && sdk.sha256 === page.sha256 && mcp.sha256 === page.sha256;
  check(id, "equal", eq ? { pass: true, why: "sha256: the page = the SDK leg's file = the MCP leg's file" } : { pass: false, why: "the three sha256 are not all equal" });
  const exportText = readFileSync(savePath("fix-sdk"), "utf8");
  const runs = sharedRuns(exportText, readFileSync(tr, "utf8"), 32);
  say(`ROW ${id} transcript 32-character runs of the export: ${runs} (counted, never printed)`);
  check(id, "transcript", runs === 0 ? { pass: true, why: "the actor's transcript holds no 32-character run of the export" } : { pass: false, why: `${runs} 32-character run(s) of the export in the actor's transcript` });
}

// ── JSD rows (#219) ─────────────────────────────────────────────────────────────────────────────────────

function failuresDir(): string {
  return join(OUT, "jsd-failures");
}
function pngCount(): number {
  const d = failuresDir();
  return existsSync(d) ? readdirSync(d).filter((f) => f.toLowerCase().endsWith(".png")).length : 0;
}

async function cmdJsd(): Promise<void> {
  const state = option("--state");
  if (state !== "jsoff" && state !== "off" && state !== "on") throw new SetUp("SET-UP: jsd --state jsoff|off|on");
  const id = `JSD-${state}`;
  mkdirSync(failuresDir(), { recursive: true });
  process.env.BRIDGE_FAILURES_DIR = failuresDir();
  const png0 = pngCount();
  const c = await client(`s10-jsd-${state}`, true); // failure reports ON: a JS_DISABLED/DISARMED must attach none
  try {
    const s = await safetyNow(c);
    const wantState = state === "jsoff" ? s?.armed === true && s.evaluate === false : state === "off" ? s?.armed === false : s?.armed === true && s.evaluate === true;
    if (!wantState) throw new SetUp(`SET-UP: ${id}: daemon.status is not the row's state (armed=${String(s?.armed)} evaluate=${String(s?.evaluate)})`);
    const tab = await c.claim(tabOf("jsd"));
    if (state === "on") {
      const r = await attempt(() => tab.evaluate<number>("1+1"));
      say(rowLine10(id, "evaluate", r.o, OWN_ID, r.o.ok ? `value ${String(r.result)}` : ""));
      check(id, "evaluate", r.o.ok && r.result === 2 ? { pass: true, why: "evaluate works unchanged (value 2)" } : { pass: false, why: r.o.ok ? `value ${String(r.result)}` : `answered ${r.o.code}` });
      await tab.release();
      return;
    }
    const want = state === "jsoff" ? WANT.jsDisabled : WANT.disarmedAll;
    const p = freshPath(`jsd-${state}-sdk`);
    const steps: Array<[string, () => Promise<unknown>]> = [
      ["evaluate", () => tab.evaluate("1+1")],
      ["evaluate-asref", () => tab.evaluateRef("document.body")],
      ["evaluate-saveto", () => tab.evaluateToFile("return 'S15'", { path: p })],
      ["navigate-javascript", () => tab.navigate("javascript:void(0)")],
      ["navigate-data", () => tab.navigate("data:text/html,S15")],
    ];
    for (const [step, fn] of steps) {
      const t0 = Date.now();
      let err: unknown = null;
      try {
        await fn();
      } catch (e) {
        err = e;
      }
      const o: Outcome = err instanceof BridgeError ? { ok: false, code: String(err.code), message: err.message, data: err.data, ms: Date.now() - t0 } : err ? { ok: false, code: "SCRIPT", message: String(err), ms: Date.now() - t0 } : { ok: true, ms: Date.now() - t0 };
      const be = err instanceof BridgeError ? (err as BridgeError & { report?: unknown; screenshotPath?: unknown; snapshot?: unknown }) : null;
      say(`${rowLine10(id, step, o, OWN_ID)} · report ${be && typeof be.report === "function" ? "yes" : "no"} · screenshotPath ${be && be.screenshotPath !== undefined ? "set" : "none"}`);
      check(id, step, judge10(o, want));
      check(id, `${step}-no-report`, be && be.report === undefined && be.screenshotPath === undefined && be.snapshot === undefined ? { pass: true, why: "no report, no screenshot, no snapshot" } : { pass: false, why: "a failure report was attached" });
    }
    const f = fileFacts(p);
    say(fileLine(id, "evaluate-saveto", f));
    check(id, "saveto-file", !f.exists && !f.part ? { pass: true, why: "no file, no .part" } : { pass: false, why: "a file or a .part was left" });
    const png = pngCount() - png0;
    say(`ROW ${id} failures folder: ${png} new PNG(s)`);
    check(id, "no-png", png === 0 ? { pass: true, why: "no PNG written" } : { pass: false, why: `${png} PNG(s) written` });
    await tab.release().catch(() => undefined);
  } finally {
    c.close();
  }
}

async function cmdJsdMcp(): Promise<void> {
  const state = option("--state");
  const actor = option("--actor");
  if ((state !== "jsoff" && state !== "off" && state !== "on") || !actor) throw new SetUp("SET-UP: jsd-mcp --state jsoff|off|on --actor <name>");
  const id = `JSD-${state}-mcp`;
  const c = await client(`s10-jsd-mcp-${state}`);
  try {
    const t = tabOf("jsd");
    if (state === "on") {
      const turn = actorTurn(actor, "jsd-on", PROMPTS.evalControl(t));
      printTurn(id, "evaluate", turn);
      check(id, "calls", callsVerdict(turn.calls, ["browser_evaluate"]));
      check(id, "evaluate", answerIs(turn.calls[0], "2", false));
      return;
    }
    const p = freshPath(`jsd-${state}-mcp`);
    const turn = actorTurn(actor, `jsd-${state}`, PROMPTS.jsd(t, p));
    printTurn(id, "five", turn, p);
    check(id, "calls", callsVerdict(turn.calls, ["browser_evaluate", "browser_evaluate", "browser_evaluate", "browser_navigate", "browser_navigate"]));
    const line = state === "jsoff" ? EXPECT10.mcpJsDisabled : EXPECT10.mcpDisarmedAll;
    ["evaluate", "evaluate-asref", "evaluate-saveto", "navigate-javascript", "navigate-data"].forEach((step, i) => check(id, step, answerIs(turn.calls[i], line, true)));
    const f = fileFacts(p);
    say(fileLine(id, "evaluate-saveto", f));
    check(id, "saveto-file", !f.exists && !f.part ? { pass: true, why: "no file, no .part" } : { pass: false, why: "a file or a .part was left" });
  } finally {
    c.close();
  }
}

// ── BBL-1 ───────────────────────────────────────────────────────────────────────────────────────────────

async function cmdBblJudge(): Promise<void> {
  const leg = option("--leg") as BblLeg | undefined;
  const out = option("--out");
  const log = option("--log");
  const from = Number(option("--from") ?? "0");
  const exit = Number(option("--exit"));
  if (!leg || !(leg in BBL_LEGS) || !out || !log || !existsSync(out) || !existsSync(log) || !Number.isInteger(exit)) throw new SetUp("SET-UP: bbl-judge --leg <l> --out <f> --log <f> --from <n> --exit <c>");
  const lines = readFileSync(out, "utf8").replace(/^﻿/, "").split(/\r?\n/);
  const t = bblTimes(lines);
  const submits = serverHits(readFileSync(log, "utf8"), BBL_LEGS[leg].counter, from);
  const ms = t.pressMs !== null && t.lastMs !== null ? t.lastMs - t.pressMs : null;
  say(`ROW BBL-1 ${leg} exit ${exit} · presses ${t.presses} · submits ${submits} (${BBL_LEGS[leg].counter}) · press → last line ${ms === null ? "not measured" : `${ms} ms`} · bound line ${t.boundLine ? "yes" : "no"} · own window ${String(t.window)}`);
  check("BBL-1", leg, bblVerdict(leg, { exit, pressMs: t.pressMs, lastMs: t.lastMs, boundLine: t.boundLine, presses: t.presses, submits }));
}

// ── scans (S7.6; SAVE-LOG) ──────────────────────────────────────────────────────────────────────────────

function tokenOf(): string {
  const env = process.env.BRIDGE_TOKEN?.trim();
  if (env) return env;
  const f = join(REPO, "bridge.token");
  return existsSync(f) ? readFileSync(f, "utf8").trim() : "";
}

/** Every saved value file of the wave (the sv folder), read for the run counts; names never printed. */
function valueFiles(): Array<{ key: string; text: string }> {
  if (!existsSync(SV)) return [];
  return readdirSync(SV)
    .filter((f) => f.startsWith(SAVE_PREFIX) && f.endsWith(".txt") && statSync(join(SV, f)).size >= 32)
    .map((f) => ({ key: f.slice(SAVE_PREFIX.length, -4), text: readFileSync(join(SV, f), "utf8") }));
}

function runsOver(text: string): { total: number; by: string } {
  const per = valueFiles().map((v) => ({ key: v.key, n: sharedRuns(v.text, text, 32) }));
  return { total: per.reduce((s, x) => s + x.n, 0), by: per.map((x) => `${x.key}:${x.n}`).join(" ") || "no value files" };
}

function pressLines(text: string): number {
  return text.split(/\r?\n/).filter((l) => l.includes("safety: disarmed by the user")).length;
}

function scanText(label: string, text: string, mode: ScanMode, copy?: string): void {
  const token = tokenOf();
  const c = scan10(text, token, OWN_ID);
  const r = runsOver(text);
  say(scanLine10(label, c, r.total, token !== ""));
  say(`SCAN ${label}: value-runs32 by value ${r.by}`);
  const v = scanVerdict10(c, r.total, mode, pressLines(text), token !== "");
  check(`SCAN-${mode}`, label.replace(/\s+/g, "-").slice(0, 40), v);
  if (copy) {
    if (!v.pass) say(`SCAN ${label}: --copy refused (a count is not 0) — nothing written into the repo`);
    else {
      writeFileSync(copy, text.endsWith("\n") || text === "" ? text : `${text}\n`);
      say(`SCAN ${label}: copied (${text.split(/\r?\n/).length} lines)`);
    }
  }
}

async function cmdScan(): Promise<void> {
  const mode = option("--mode") as ScanMode | undefined;
  const file = option("--file");
  if (!mode || !["daemon", "console", "transcript", "committed"].includes(mode) || !file || !existsSync(file)) throw new SetUp("SET-UP: scan --mode daemon|console|transcript|committed --file <f> [--copy <dst>]");
  scanText(mode === "transcript" ? `transcript ${file.split(/[\\/]/).pop()}` : `${mode} file`, readFileSync(file, "utf8"), mode, option("--copy"));
}

async function cmdScanLog(): Promise<void> {
  const since = option("--since");
  if (!since || Number.isNaN(Date.parse(since))) throw new SetUp("SET-UP: scan-log --since <iso>");
  const file = join(homedir(), ".chrome-agent-bridge", "daemon.log");
  if (!existsSync(file)) throw new SetUp(`SET-UP: no daemon.log`);
  const lines = logLinesSince(readFileSync(file, "utf8").split(/\r?\n/), since);
  scanText(`daemon.log since ${since} (${lines.length} lines)`, lines.join("\n"), "daemon", option("--copy"));
}

async function cmdValuesClean(): Promise<void> {
  const n = existsSync(SV) ? readdirSync(SV).length : 0;
  rmSync(SV, { recursive: true, force: true });
  say(`values: ${n} file(s) in the saveTo folder deleted; folder gone ${existsSync(SV) ? "NO" : "yes"}`);
  if (existsSync(SV)) failed = true;
}

/** G10-3 package only (never run by the Run 15 runner): the MCP leg's prompt for pp1's held export. */
async function cmdPp1Plan(): Promise<void> {
  const length = Number(option("--length"));
  const tab = option("--tab") ?? "<T# of the held pp1 tab>";
  if (!Number.isInteger(length) || length < 1) throw new SetUp("SET-UP: pp1-plan --length <the held export's length> [--tab T#]");
  const p = win32.normalize(join(SV, `${SAVE_PREFIX}pp1-mcp.txt`)); // only named: nothing is created by a plan
  // the held export's whole text as a string — no `return`, as export-grades' chunks (a primitive of ~0.4 MB)
  const expression = chunkExpression(heldKey("pp1"), 0, length);
  console.log(PROMPTS.saveTo(tab, expression, p).replace(p.replace(/\\/g, "/"), "<saveTo: %TEMP%/bridge-e2e/s15/sv/s15v-pp1-mcp.txt>"));
}

/**
 * R15-3R (S7 wave fixer 3, 2026-10-25; §4.22 R15-3R): the placement guard with its one extra rule — an occluder above O
 * is exempt only when owned (owner and root owner) by a driver window and over none of the rects of the elements R15-3R
 * reads on O, measured at guard time (s10-rules.ts r3rPlacementVerdict). The JSON is the one s10-win.ps1
 * Test-S10Placement -ExemptOwned writes: rect-check's fields plus `readRects`. Lines: rect-check's, READ / EXEMPT, CHECK.
 */
async function cmdR3rCheck(): Promise<void> {
  const row = option("--row") ?? "R15-3R";
  const step = option("--step") ?? "placement";
  const file = option("--file");
  if (!file || !existsSync(file)) throw new SetUp("SET-UP: r3r-check --file <json>");
  const p = JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, "")) as Placement & { readRects?: ReadRect[] | null };
  say(`ROW ${row} ${step} ${placementLine(p)}`);
  for (const l of placementDiagnostics(p)) say(l);
  const r = r3rPlacementVerdict(p);
  for (const l of r.lines) say(l);
  check(row, step, r.verdict);
}

const HELP = "recipes/s10.ts — Step 10 S7 rows (docs/e2e-test-plan.md §4.22); see the header for every command.";

const commands: Record<string, () => Promise<unknown>> = {
  "daemon-up": cmdDaemonUp,
  setup: cmdSetup,
  s10check: cmdS10Check,
  mcpf: cmdMcpf,
  "mcpf-off-prep": cmdMcpfOffPrep,
  "mcpf-off": cmdMcpfOff,
  "mcpf-off-judge": cmdMcpfOffJudge,
  "cap1-sdk": cmdCap1Sdk,
  "cap1-mcp": cmdCap1Mcp,
  sw1: cmdSw1,
  pop2: cmdPop2,
  "save-build": cmdSaveBuild,
  "save-sdk": () => cmdSaveSdk(),
  "save-mcp": () => cmdSaveMcp(),
  "save-surr": cmdSaveSurr,
  "save-refuse": cmdSaveRefuse,
  "save-hold": cmdSaveHold,
  "save-disarm": cmdSaveDisarm,
  "save-jsoff": cmdSaveJsoff,
  "save-block": cmdSaveBlock,
  "save-close": cmdSaveClose,
  "save-ttl": cmdSaveTtl,
  prim: cmdPrim,
  idonly: cmdIdonly,
  "mem-record": cmdMemRecord,
  "savefix-sdk": cmdSaveFixSdk,
  "savefix-mcp": cmdSaveFixMcp,
  "savefix-judge": cmdSaveFixJudge,
  jsd: cmdJsd,
  "jsd-mcp": cmdJsdMcp,
  "bbl-judge": cmdBblJudge,
  scan: cmdScan,
  "scan-log": cmdScanLog,
  "values-clean": cmdValuesClean,
  "pp1-plan": cmdPp1Plan,
  "r3r-check": cmdR3rCheck,
};

const run = commands[command];
if (!run) {
  console.log(HELP);
  if (command !== "--help") {
    console.log(`${stopLine10(`s10.ts: unknown command ${JSON.stringify(command)} (a set-up error in the caller)`)} (at ${iso()})`);
    process.exitCode = 2;
  }
} else {
  run()
    .then(() => {
      process.exitCode = failed ? 1 : notMeasured ? 3 : 0;
    })
    .catch((err: unknown) => {
      // #193: every throw is a STOP — one line beginning `STOP:`, URLs and the pattern withheld, exit 2.
      const msg = err instanceof SetUp ? err.message : err instanceof BridgeError ? `${String(err.code)}: ${err.message}` : err instanceof Error ? err.message : String(err);
      console.log(`${stopLine10(`s10.ts ${command}: FAILED — ${msg}`, OWN_ID)} (at ${iso()})`);
      process.exitCode = 2;
    });
}

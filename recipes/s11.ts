// recipes/s11.ts — the SDK-side actor of Step 11's live wave (Run 16; docs/e2e-test-plan.md §4.23). Written 2026-10-25 (UTC) by
// the S5-actor builder; NOT run against Chrome or the daemon by its author. Pass rules are pure, in recipes/s11-rules.ts;
// this file prints only lines those builders make (rowLine, checkLine, stateLine, ...) plus `STOP: ...` lines, never a
// path outside the fixture names, the token, the alias, the sentinel's name, a block-list or Upload-folders text.
//
//   node --import tsx recipes/s11.ts <subcommand> [args]        (the next slice's PowerShell driver calls it)
//
// Files: $S11_OUT (default %TEMP%\bridge-e2e\s11): state.json, wave\{root,outside,save}, actors\ (recipes/s9-actor.ts, via
// its CLI), signals <name>.ready / <name>.pressed (the driver's side: options page, toolbar button, F12, banner sampler).
// Nothing here edits the safety state or the Upload folders: a subcommand that needs a change signals the driver and waits.
//
// Subcommands (row → subcommand: ROW_MAP below):
//   make | clean                    the wave's files under <ROOT> / <OUTSIDE> (and the junction s11-link); remove them
//   setup [--only a,b]              open the fixture tabs (handles into state.json; the alias into state.json, never printed)
//   foundcheck --text-file <f>      FOUNDCHECK from the found Upload folders text (kept by the driver outside the repo)
//   found --file <json>             STATE / TOGGLE lines and the G11-3 plan from the driver's reading of the options page
//   l1 | fa | up1..up4 | up5 | up6 | up6b | up7 | up8 | up9 | patch | twice | raw | nav | devt | stale | up7j | race a|b
//   saverefuse-sdk | saverefuse-mcp | sw2
//   actor-start | actor-end         the headless MCP actor (tool search off) of UP-5 and SAVE-REFUSE-R
//   restore-check --found <f> --now <f> [--daemon]     UP-RESTORE's read-back by count and hash
//   scan --what console|daemon|actors|other --file <f>  UP-LOGS by count
//
// Exit: 0 every check passed, 1 a check failed, 2 a STOP (any set-up guard or throw, #193), 3 not measured.
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { homedir } from "node:os";
import { dirname, join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { BridgeError, connect, type BridgeClient, type Tab } from "@bridge/sdk";
import { extensionIdFromPath } from "./s9-rules.js";
import { parseTurn } from "./s10-rules.js";
import {
  checkLine,
  devtVerdict,
  durationNote,
  EMPTY_SHA256,
  faVerdict,
  foundStateGuard,
  foundcheck,
  judgeError,
  liveBPlan,
  logsLine,
  logsVerdict,
  NOT_RUN_G11_3,
  navVerdict,
  patchVerdict,
  raceDone,
  raceVerdict,
  rawLeaks,
  rawVerdict,
  refusalPageJudge,
  refusalSteps,
  restoreLine,
  restoreVerdict,
  rowLine,
  saveControlVerdict,
  saveFilesVerdict,
  saveMcpVerdict,
  saveSdkVerdict,
  scanText,
  staleVerdict,
  stateLine,
  sw2,
  TOGGLE_ON_FA,
  toggleLine,
  up1Outcome,
  UP2_SPEC,
  up5Verdict,
  UP6B_STEPS,
  UP6_STEPS,
  UP7_LEGS,
  up8Verdict,
  uploadPageJudge,
  buildJudge,
  type BoxState,
  type ErrKey,
  type FileWant,
  type Judged,
  type McpTurn,
  type Obs,
  type PageObs,
  type StepObs,
  type SwTrial,
} from "./s11-rules.js";

// ── pure parts (unit-tested by recipes/test/s11-actor.test.ts) ────────────────────────────────────────────

export const BOOLEAN_FLAGS: readonly string[] = ["--daemon"];
export interface Args {
  cmd: string;
  pos: string[];
  opts: Record<string, string>;
  flags: string[];
}
/** `<cmd> [positional...] [--key value] [--flag]`; a `--key` without a value is an error the caller turns into a STOP. */
export function parseArgs(argv: readonly string[]): Args {
  const [cmd = "", ...rest] = argv;
  const a: Args = { cmd, pos: [], opts: {}, flags: [] };
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i]!;
    if (!t.startsWith("--")) a.pos.push(t);
    else if (BOOLEAN_FLAGS.includes(t)) a.flags.push(t);
    else {
      const v = rest[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Stop(`${t} needs a value`);
      a.opts[t.slice(2)] = v;
      i++;
    }
  }
  return a;
}

/** The sheet's rows, each with the subcommand that serves it (or who does). */
export const ROW_MAP: Readonly<Record<string, string>> = Object.freeze({
  "UP-L1": "foundcheck + l1",
  "UP-0": "found (reading the options page and the toggle: the driver)",
  "UP-OPT": "the driver (options page)",
  "UP-FA": "fa",
  "UP-6": "up6",
  "UP-7": "up7 (state changes: the driver)",
  "SAVE-REFUSE-R": "saverefuse-sdk + saverefuse-mcp",
  "SW-2": "sw2",
  "UP-1": "up1",
  "UP-2": "up2",
  "UP-3": "up3",
  "UP-4": "up4",
  "UP-5": "up5",
  "UP-6B": "up6b",
  "UP-8": "up8",
  "UP-9": "up9",
  "UP-PATCH": "patch",
  "UP-TWICE": "twice",
  "UP-RAW": "raw",
  "UP-NAV": "nav",
  "UP-DEVT": "devt (F12: the driver)",
  "UP-STALE": "stale",
  "UP-7J": "up7j (state change: the driver)",
  "UP-RACE-A": "race a (toolbar button: the driver)",
  "UP-RACE-B": "race b (block list: the driver)",
  "UP-RESTORE": "restore-check (the restore itself: the driver)",
  "UP-LOGS": "scan",
  "UP-CLICK": "not run (#251)",
});

/** The fixture tabs: key → page, and which host serves it. */
export const TAB_SPEC: Readonly<Record<string, { page: string; host: "ip" | "alias" | "csp" }>> = Object.freeze(
  Object.fromEntries(
    [
      ["w", "s11-upload.html?s11=w", "ip"], ["sw", "s11-upload.html?s11=sw", "ip"], ["l1", "s11-upload.html?s11=l1", "ip"], ["fa", "s11-upload.html?s11=fa", "ip"],
      ["u6", "s11-upload.html?s11=u6", "ip"], ["j7", "s11-upload.html?s11=j7", "ip"], ["a7", "s11-upload.html?s11=a7", "alias"], ["u1", "s11-upload.html?s11=u1", "ip"],
      ["u2", "s11-upload.html?s11=u2", "ip"], ["u3", "s11-upload.html?s11=u3", "ip"], ["u4", "s11-upload.html?s11=u4", "ip"], ["u6b", "s11-upload.html?s11=u6b", "ip"],
      ["u8", "s11-upload.html?s11=u8", "csp"], ["u9", "s11-upload.html?s11=u9", "ip"], ["pt", "s11-patched.html", "ip"], ["tw", "s11-upload.html?s11=tw", "ip"],
      ["u5", "s11-upload.html?s11=u5", "ip"], ["raw", "s11-upload.html?s11=raw", "ip"], ["nav", "s11-upload.html?nav=1", "ip"], ["stale", "s11-upload.html?s11=stale", "ip"], ["ra", "s11-upload.html?s11=ra", "ip"],
      ["rb", "s11-upload.html?s11=rb", "alias"], ["sv", "s11-upload.html?s11=sv", "ip"], ["x", "s11-upload.html?s11=x", "ip"],
    ].map(([k, page, host]) => [k, { page, host }]),
  ) as Record<string, { page: string; host: "ip" | "alias" | "csp" }>,
);
export const NOT_IN_DEFAULT_SETUP: readonly string[] = ["stale", "x"];
export function tabUrl(key: string, alias: string): string {
  const t = TAB_SPEC[key];
  if (!t) throw new Stop(`no tab "${key}" in the spec`);
  return t.host === "csp" ? `http://localhost:8084/${t.page}` : `http://${t.host === "alias" ? alias : "127.0.0.1"}:8081/${t.page}`;
}

export interface Reporter {
  inputs: Record<string, { files: number; names: string[]; sizes: number[]; sha256: Array<string | null>; changeEvents: number; inputEvents: number; trusted: boolean[] }>;
  pending: number;
  marks: { events: Array<{ op: string; on: string }>; final: number };
  patchedCalls: number | null;
  arrivedAfterNav: boolean;
}
/** The page's `__s11.state()` → PageObs; with `id`, only that input counts and `stray` counts files and events elsewhere. */
export function toPage(st: Reporter, id?: string): PageObs & { stray: number } {
  const files: FileWant[] = [];
  const trusted: boolean[] = [];
  let change = 0;
  let input = 0;
  let stray = 0;
  for (const [k, r] of Object.entries(st.inputs)) {
    if (id !== undefined && k !== id) {
      stray += r.files + r.changeEvents + r.inputEvents;
      continue;
    }
    r.names.forEach((name, i) => files.push({ name, bytes: r.sizes[i] ?? -1, sha256: r.sha256[i] ?? "" }));
    for (let i = r.names.length; i < r.files; i++) files.push({ name: "<no change event>", bytes: -1, sha256: "" });
    change += r.changeEvents;
    input += r.inputEvents;
    trusted.push(...r.trusted);
  }
  const n = (op: string): number => st.marks.events.filter((e) => e.op === op).length;
  return { files, change, input, trusted, markAdded: n("added"), markRemoved: n("removed"), carriersLeft: st.marks.final, stray };
}

/** An actor transcript reduced to tool results: no TOOL, SENT, SAYS or RESULT-OF-TURN line (they carry the actor's own words and inputs). */
export function resultLines(text: string): string {
  return text.split(/\r?\n/).filter((l) => /^ {4}\[\d+\/\d+\]/.test(l) || /^\S+ OUTPUT/.test(l)).join("\n");
}

/** First failure, else first not-measured, else ok. */
export function all(js: readonly Judged[]): Judged {
  return js.find((j) => !j.pass && !j.notMeasured) ?? js.find((j) => !j.pass) ?? { pass: true, why: js.length === 0 ? "nothing to check" : "all checks hold" };
}
const J = (pass: boolean, why: string, notMeasured?: boolean): Judged => (notMeasured ? { pass: false, notMeasured: true, why } : { pass, why });
const ok = (why: string): Judged => J(true, why);
const bad = (why: string): Judged => J(false, why);

/** The SDK result's files against the wanted ones (names, sizes, sha256, in order). */
export function resultJudge(got: readonly FileWant[] | undefined, want: readonly FileWant[]): Judged {
  if (!got) return bad("the call answered without files");
  const same = got.length === want.length && got.every((g, i) => g.name === want[i]!.name && g.bytes === want[i]!.bytes && g.sha256 === want[i]!.sha256);
  return same ? ok("the answer's files equal the wave's files") : bad("the answer's files differ from the wave's files");
}

/** A RECORD row's observed error shown without its text: the sheet's key when the text matches one, else the code and a length. */
export function whichError(o: Obs, keys: readonly ErrKey[]): string {
  const k = keys.find((x) => judgeError(o, x).pass);
  return k ?? `${o.code} (text not in the sheet's table, ${o.message.length} characters)`;
}

// ── errors, lines, exit code ─────────────────────────────────────────────────────────────────────────────

export class Stop extends Error {}
let fails = 0;
let notMeasured = 0;
const say = (line: string): void => console.log(line);
function bump(j: Judged): void {
  if (j.notMeasured) notMeasured++;
  else if (!j.pass) fails++;
}
function ck(id: string, step: string, j: Judged): Judged {
  say(checkLine(`${id} ${step}`, j));
  bump(j);
  return j;
}
function row(id: string, j: Judged, status?: string): void {
  say(rowLine(id, j, status));
  if (status === undefined) bump(j);
}
function stop(msg: string): never {
  throw new Stop(msg);
}

// ── paths and state ──────────────────────────────────────────────────────────────────────────────────────

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.env.S11_OUT?.trim() || join(tmpdir(), "bridge-e2e", "s11");
const STATE = join(OUT, "state.json");
const WAVE = join(OUT, "wave");
const ROOT = join(WAVE, "root");
const OUTSIDE = join(WAVE, "outside");
const SAVE = join(WAVE, "save");
const ACTORS = join(OUT, "actors");
const ACTOR = "s11mcp";
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const sha256Hex = (b: Buffer): string => createHash("sha256").update(b).digest("hex");

type Where = "root" | "sentinel" | "outside";
interface State {
  alias: string;
  sentinel: string;
  tabs: Record<string, string>;
  files: Record<string, FileWant & { where: Where }>;
  found?: BoxState;
  toggle?: "on" | "off" | "unreadable";
}
function loadState(): State {
  if (!existsSync(STATE)) return stop("no state.json — run `make` and `setup` first");
  return JSON.parse(readFileSync(STATE, "utf8")) as State;
}
function saveState(s: State): void {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}
const dirOf = (w: Where, s: State): string => (w === "root" ? ROOT : w === "outside" ? OUTSIDE : join(ROOT, s.sentinel));
/** The absolute path of a wave file (Windows form, as the gate sees it). */
function fp(s: State, name: string): string {
  const f = s.files[name];
  if (!f) return stop(`no wave file "${name}" in state.json — run \`make\``);
  return win32.normalize(join(dirOf(f.where, s), name));
}
const want = (s: State, ...names: string[]): FileWant[] => names.map((n) => ({ name: n, bytes: s.files[n]!.bytes, sha256: s.files[n]!.sha256 }));
const handle = (s: State, key: string): string => s.tabs[key] ?? stop(`no tab "${key}" in state.json — run \`setup\``);
const missing = `${ROOT}\\s11-missing.bin`;

// ── bridge helpers ───────────────────────────────────────────────────────────────────────────────────────

async function attempt<T>(fn: () => Promise<T>): Promise<{ err?: Obs; value?: T; ms: number }> {
  const t0 = Date.now();
  try {
    return { value: await fn(), ms: Date.now() - t0 };
  } catch (e) {
    if (e instanceof BridgeError) return { err: { code: String(e.code), message: e.message, data: e.data }, ms: Date.now() - t0 };
    throw e;
  }
}
async function session<T>(name: string, fn: (c: BridgeClient, claim: (h: string) => Promise<Tab>) => Promise<T>): Promise<T> {
  const c = await connect({ name, failureReports: false });
  const held: Tab[] = [];
  try {
    return await fn(c, async (h) => {
      const t = await c.claim(h);
      held.push(t);
      return t;
    });
  } finally {
    for (const t of held) await t.release().catch(() => undefined);
    c.close();
  }
}
async function ev(c: BridgeClient, tab: string, expr: string): Promise<unknown> {
  const env = (await c.call("evaluate", { tab, expression: `return (${expr});`, timeoutMs: 15_000 }, { timeoutMs: 20_000 })) as { kind?: string; value?: unknown };
  return env?.kind === "json" ? env.value : undefined;
}
async function readState(c: BridgeClient, tab: string, waitMs = 30_000): Promise<Reporter> {
  const t0 = Date.now();
  for (;;) {
    const st = (await ev(c, tab, "window.__s11 ? window.__s11.state() : null")) as Reporter | null | undefined;
    if (st && st.pending === 0) return st;
    if (Date.now() - t0 > waitMs) return stop("the page's reporter is missing or still reading files");
    await sleep(100);
  }
}
const readPage = async (c: BridgeClient, tab: string, id?: string, waitMs?: number) => toPage(await readState(c, tab, waitMs), id);
const reset = (c: BridgeClient, tab: string): Promise<unknown> => ev(c, tab, "(window.__s11.reset(), true)");
async function rowOf(c: BridgeClient, h: string): Promise<{ tab: string; active?: boolean; current?: boolean; windowId?: number } | undefined> {
  const r = (await c.call("listTabs")) as { tabs?: Array<{ tab: string; active?: boolean; current?: boolean; windowId?: number }> };
  return r?.tabs?.find((t) => t.tab === h);
}
async function safetyNow(c: BridgeClient): Promise<{ armed: boolean; evaluate: boolean } | null> {
  return ((await c.call("daemon.status")) as { safety?: { armed: boolean; evaluate: boolean } | null })?.safety ?? null;
}
async function waitSafety(c: BridgeClient, w: { armed: boolean; evaluate: boolean }, ms = 10_000): Promise<boolean> {
  const t0 = Date.now();
  for (;;) {
    const s = await safetyNow(c);
    if (s && s.armed === w.armed && s.evaluate === w.evaluate) return true;
    if (Date.now() - t0 > ms) return false;
    await sleep(100);
  }
}

// ── signals with the driver ──────────────────────────────────────────────────────────────────────────────

function signal(name: string): void {
  mkdirSync(OUT, { recursive: true });
  rmSync(join(OUT, `${name}.pressed`), { force: true });
  writeFileSync(join(OUT, `${name}.ready`), new Date().toISOString());
}
async function waitPressed(name: string, ms = 120_000): Promise<string> {
  const f = join(OUT, `${name}.pressed`);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (existsSync(f)) {
      const t = readFileSync(f, "utf8").trim();
      if (t) return t;
    }
    await sleep(50);
  }
  return stop(`the driver did not act for ${name} within ${ms / 1000} s`);
}
/** The banner sampler (the driver's, by UI Automation) runs around `fn`; true when it saw the debugging banner. */
async function sampled<T>(id: string, fn: () => Promise<T>): Promise<{ v: T; banner: boolean }> {
  signal(`${id}-sample`);
  await waitPressed(`${id}-sample`);
  const v = await fn();
  signal(`${id}-sampled`);
  return { v, banner: (await waitPressed(`${id}-sampled`, 30_000)) === "seen" };
}
/** A state change by the driver around `fn` (ready → pressed; then done → pressed), the found state waited for after. */
async function driverChange<T>(id: string, c: BridgeClient, s: State, fn: () => Promise<T>): Promise<T> {
  signal(id);
  await waitPressed(id);
  const v = await fn();
  signal(`${id}-done`);
  await waitPressed(`${id}-done`);
  if (s.found && !(await waitSafety(c, s.found))) stop(`${id}: the safety state is not back to the found state`);
  return v;
}

// ── the upload steps ─────────────────────────────────────────────────────────────────────────────────────

type Tgt = { css: string } | { text: string };
interface Step {
  step: string;
  run: (tab: Tab) => Promise<unknown>;
}
const raw = (c: BridgeClient, h: string, target: Tgt | undefined, paths: string[]): Promise<unknown> => c.call("uploadFiles", { tab: h, ...(target ? { locator: target } : {}), paths }, { timeoutMs: 60_000 });

/** Per step: reset the page, run it, read the page. A refusal step's observation. */
async function observe(c: BridgeClient, tab: Tab, h: string, run: (t: Tab) => Promise<unknown>, id?: string, waitMs?: number): Promise<StepObs & { value?: unknown; ms: number; stray: number }> {
  await reset(c, h);
  const r = await attempt(() => run(tab));
  const page = await readPage(c, h, id, waitMs);
  return { err: r.err, page, value: r.value, ms: r.ms, stray: page.stray };
}

/** Refusal rows (UP-6, UP-6B): the steps with their keys; one banner sampler around the whole row. */
async function refusalRow(id: string, steps: readonly { step: string; key: ErrKey }[], run: Step[], h: string, c: BridgeClient, tab: Tab, banner: boolean): Promise<void> {
  const body = async (): Promise<Array<StepObs & { ms: number }>> => {
    const out: Array<StepObs & { ms: number }> = [];
    for (const r of run) out.push(await observe(c, tab, h, r.run));
    return out;
  };
  const { v, banner: seen } = banner ? await sampled(id, body) : { v: await body(), banner: false };
  const res = refusalSteps(steps, v, {}).map((r) => ({ ...r, j: banner && seen ? bad("banner seen on a refusal") : r.j }));
  for (const r of res) ck(id, r.step, r.j);
  row(id, all(res.map((r) => r.j)));
}

const css = (c: string): Tgt => ({ css: c });
const UP1 = (s: State) => fp(s, "s11-1k.bin");

// ── commands ─────────────────────────────────────────────────────────────────────────────────────────────

const cmds: Record<string, (a: Args) => Promise<void>> = {
  async make() {
    if (existsSync(WAVE)) stop("the wave folder exists — run `clean` first");
    const sentinel = `s11-${randomBytes(6).toString("hex")}`;
    const alias = `s11-${randomBytes(5).toString("hex")}.localhost`;
    for (const d of [ROOT, join(ROOT, sentinel), OUTSIDE, SAVE]) mkdirSync(d, { recursive: true });
    const s: State = { alias, sentinel, tabs: {}, files: {} };
    const spec: Array<[string, number, Where]> = [["s11-1k.bin", 1024, "root"], ["s11-0b.bin", 0, "root"], ["s11-5m.bin", 5242880, "root"], ["s11-50m.bin", 52428800, "root"], ["s11-sent.bin", 1024, "sentinel"], ["s11-out.bin", 1024, "outside"]];
    for (const [name, bytes, where] of spec) {
      const b = randomBytes(bytes);
      writeFileSync(join(dirOf(where, s), name), b);
      s.files[name] = { name, bytes, sha256: sha256Hex(b), where };
      ck("make", name, bytes === 0 && s.files[name]!.sha256 !== EMPTY_SHA256 ? bad("the empty file's hash is wrong") : ok(`${bytes} bytes, sha256 ${s.files[name]!.sha256}`));
    }
    symlinkSync(OUTSIDE, join(ROOT, "s11-link"), "junction");
    const resolved = realpathSync(join(ROOT, "s11-link", "s11-out.bin"));
    ck("make", "s11-link", resolved.toLowerCase().startsWith(ROOT.toLowerCase() + "\\") ? bad("the junction does not resolve outside <ROOT>") : ok("the junction s11-link resolves outside <ROOT>"));
    saveState(s);
    say(checkLine("make state", ok("state.json written")));
  },

  async clean() {
    const link = join(ROOT, "s11-link");
    if (existsSync(link)) rmdirSync(link); // the junction itself, never what it points at
    rmSync(WAVE, { recursive: true, force: true });
    rmSync(STATE, { force: true });
    for (const f of existsSync(OUT) ? readdirSync(OUT) : []) if (/\.(ready|pressed)$/.test(f)) rmSync(join(OUT, f), { force: true });
    say(checkLine("clean", ok("the wave folder and state.json removed")));
  },

  async setup(a) {
    const s = loadState();
    const only = a.opts.only?.split(",").filter(Boolean);
    const keys = only ?? Object.keys(TAB_SPEC).filter((k) => !NOT_IN_DEFAULT_SETUP.includes(k));
    await session("s11-setup", async (c) => {
      for (const k of keys) {
        const r = (await c.call("newTab", { url: tabUrl(k, s.alias) })) as { tab?: string };
        if (!r?.tab) stop(`newTab answered without a handle for ${k}`);
        s.tabs[k] = r.tab!;
        const t0 = Date.now();
        while ((await ev(c, r.tab!, "typeof window.__s11")) !== "object") {
          if (Date.now() - t0 > 20_000) stop(`the fixture page of ${k} did not load its reporter`);
          await sleep(200);
        }
        if (k === "stale") await c.call("snapshot", { tab: r.tab }); // the Step 10 content script, injected before the reload
        ck("setup", k, ok(`opened ${r.tab}`));
      }
      if (!only && s.tabs.w) await c.call("focusTab", { tab: s.tabs.w });
    });
    saveState(s);
  },

  async foundcheck(a) {
    const f = a.opts["text-file"] ?? stop("foundcheck needs --text-file <f>");
    const fc = foundcheck(readFileSync(f, "utf8"), ROOT, OUTSIDE);
    say(fc.line);
    if (fc.stop) stop("FOUNDCHECK: a found folder holds <ROOT> or <OUTSIDE>; choose another base folder");
  },

  async found(a) {
    const d = JSON.parse(readFileSync(a.opts.file ?? stop("found needs --file <json>"), "utf8")) as BoxState & { toggle: "on" | "off" | "unreadable" };
    say(stateLine(d));
    const g = foundStateGuard(d);
    if (!g.ok) stop(g.line.replace(/^STOP: /, ""));
    if (d.toggle === "unreadable") stop("the file-URL toggle is unreadable");
    say(toggleLine(d.toggle));
    const plan = liveBPlan(d.toggle);
    for (const l of plan.lines) say(l);
    say(checkLine("UP-0 plan", ok(plan.liveB ? `liveB runs; UP-FA ${plan.fa}` : `liveB waits for G11-3; UP-FA runs; ${plan.count} rows ${NOT_RUN_G11_3}`)));
    const s = existsSync(STATE) ? loadState() : undefined;
    if (s) saveState({ ...s, found: { armed: d.armed, evaluate: d.evaluate, blocklist: d.blocklist, uploadfolders: d.uploadfolders }, toggle: d.toggle });
  },

  async l1() {
    const s = loadState();
    await session("s11-l1", async (c, claim) => {
      const h = handle(s, "l1");
      await claim(h);
      const st = (await c.call("daemon.status")) as { build?: string };
      const j = [buildJudge(String(st.build), sha256Hex(readFileSync(join(REPO, "daemon", "dist", "index.js"))))];
      ck("UP-L1", "build", j[0]!);
      const calls: Array<[string, Tgt | undefined, string]> = [["raw-root", undefined, fp(s, "s11-1k.bin")], ["raw-outside", css("#up-single"), fp(s, "s11-out.bin")]];
      for (const [step, t, p] of calls) {
        await reset(c, h);
        const r = await attempt(() => raw(c, h, t, [p]));
        const page = await readPage(c, h);
        const jj = all([judgeError(r.err, "K-gate"), refusalPageJudge(page)]);
        ck("UP-L1", step, jj);
        j.push(jj);
      }
      const v = all(j);
      row("UP-L1", v);
      if (!v.pass) stop("UP-L1 failed: any FAIL here is a STOP");
    });
  },

  async fa() {
    const s = loadState();
    if (s.toggle === undefined) stop("UP-FA needs the found toggle — run `found` first");
    if (s.toggle === "on") return void row("UP-FA", ok(TOGGLE_ON_FA), "RECORD");
    await session("s11-fa", async (c, claim) => {
      const h = handle(s, "fa");
      const tab = await claim(h);
      const { v, banner } = await sampled("UP-FA", () => observe(c, tab, h, (t) => t.upload(css("#up-single"), UP1(s))));
      const j = faVerdict({ err: v.err, page: v.page, banner });
      row("UP-FA", j, "RECORD");
      say(checkLine("UP-FA observed", ok(v.err ? whichError(v.err, ["K-noacc", "K-gate"]) : "ok")));
    });
  },

  async up6() {
    const s = loadState();
    await session("s11-up6", async (c, claim) => {
      const h = handle(s, "u6");
      const tab = await claim(h);
      const steps: Step[] = [
        { step: "outside", run: (t) => t.upload(css("#up-single"), fp(s, "s11-out.bin")) },
        { step: "missing", run: (t) => t.upload(css("#up-single"), missing) },
        { step: "relative", run: (t) => t.upload(css("#up-single"), "s11-1k.bin") },
        { step: "raw-dotdot", run: () => raw(c, h, css("#up-single"), [`${ROOT}\\..\\outside\\s11-out.bin`]) },
        { step: "raw-notarget", run: () => raw(c, h, undefined, [UP1(s)]) },
      ];
      await refusalRow("UP-6", UP6_STEPS, steps, h, c, tab, true);
    });
  },

  async up6b() {
    const s = loadState();
    await session("s11-up6b", async (c, claim) => {
      const h = handle(s, "u6b");
      const tab = await claim(h);
      const one = UP1(s);
      const steps: Step[] = [
        { step: "text-input", run: (t) => t.upload(css("#up-text"), one) },
        { step: "two-paths", run: (t) => t.upload(css("#up-single"), [one, fp(s, "s11-5m.bin")]) },
        { step: "disabled", run: (t) => t.upload(css("#up-disabled"), one) },
        { step: "directory", run: (t) => t.upload(css("#up-dir"), one) },
        { step: "two-inputs", run: (t) => t.upload(css("#up-two"), one) },
      ];
      await refusalRow("UP-6B", UP6B_STEPS, steps, h, c, tab, true);
    });
  },

  async up7() {
    const s = loadState();
    await session("s11-up7", async (c, claim) => {
      const h = handle(s, "j7");
      const ha = handle(s, "a7");
      const tab = await claim(h);
      await claim(ha);
      const legs: Array<{ id: string; tab: string; run: () => Promise<unknown> }> = [
        { id: "UP-7-a", tab: h, run: () => attempt(() => tab.upload(css("#up-single"), UP1(s))) },
        { id: "UP-7-b", tab: ha, run: () => attempt(() => raw(c, ha, css("#up-single"), [UP1(s)])) },
        { id: "UP-7-c", tab: h, run: () => attempt(() => tab.upload(css("#up-single"), UP1(s))) },
      ];
      const obs: StepObs[] = [];
      for (const l of legs) {
        await reset(c, l.tab);
        const r = (await driverChange(l.id, c, s, l.run)) as { err?: Obs };
        obs.push({ err: r.err, page: await readPage(c, l.tab) }); // read after the restore: evaluate is refused while disarmed or blocked
      }
      const res = refusalSteps(UP7_LEGS, obs, {});
      for (const r of res) ck("UP-7", r.step, r.j);
      row("UP-7", all(res.map((r) => r.j)));
    });
  },

  async up7j() {
    const s = loadState();
    await session("s11-up7j", async (c, claim) => {
      const h = handle(s, "j7");
      const tab = await claim(h);
      await reset(c, h);
      const r = (await driverChange("UP-7J", c, s, () => attempt(() => tab.upload(css("#up-single"), UP1(s))))) as { err?: Obs; value?: { files: FileWant[] } };
      const page = await readPage(c, h, "up-single");
      row("UP-7J", all([r.err ? bad(`refused with ${r.err.code} while JavaScript was off`) : ok("ok with JavaScript off"), resultJudge(r.value?.files, want(s, "s11-1k.bin")), uploadPageJudge(page, want(s, "s11-1k.bin"))]));
    });
  },

  async up1() {
    const s = loadState();
    await session("s11-up1", async (c, claim) => {
      const h = handle(s, "u1");
      const w = handle(s, "w");
      const tab = await claim(h);
      const sig = (r?: { active?: boolean; current?: boolean }): string => `${String(r?.active)}/${String(r?.current)}`;
      const before = { u: await rowOf(c, h), w: await rowOf(c, w) };
      await reset(c, h);
      const { v: r, banner } = await sampled("UP-1", () => attempt(() => tab.upload(css("#up-single"), UP1(s))));
      const after = { u: await rowOf(c, h), w: await rowOf(c, w) };
      const page = await readPage(c, h, "up-single");
      const o = up1Outcome({ call: r.err ?? "ok", knownBehind: before.u?.active === false, toggle: s.toggle === "off" ? "off" : "on", page, files: want(s, "s11-1k.bin"), tabActiveAfter: after.u?.active === true, humanTabUnchanged: sig(before.w) === sig(after.w), banner4s: banner });
      ck("UP-1", "outcome", { ...o.judged, why: `${o.outcome}: ${o.judged.why}` });
      const back = await observe(c, tab, h, async (t) => {
        await t.focus();
        return t.upload(css("#up-single"), UP1(s));
      }, "up-single");
      await c.call("focusTab", { tab: w });
      const front = all([back.err ? bad(`front leg refused with ${back.err.code}`) : ok("ok"), resultJudge((back.value as { files: FileWant[] } | undefined)?.files, want(s, "s11-1k.bin")), uploadPageJudge(back.page, want(s, "s11-1k.bin"))]);
      ck("UP-1", "front-leg", front);
      row("UP-1", all([o.judged, front]));
    });
  },

  async up2() {
    const s = loadState();
    await session("s11-up2", async (c, claim) => {
      const h = handle(s, "u2");
      const tab = await claim(h);
      const names = UP2_SPEC.map((f) => f.name);
      const o = await observe(c, tab, h, (t) => t.upload(css("#up-multi"), names.map((n) => fp(s, n)), { timeoutMs: 120_000 }), "up-multi", 120_000);
      ck("UP-2", "duration", ok(durationNote(o.ms)));
      row("UP-2", all([o.err ? bad(`refused with ${o.err.code}`) : ok("ok"), resultJudge((o.value as { files: FileWant[] } | undefined)?.files, want(s, ...names)), uploadPageJudge(o.page, want(s, ...names))]));
    });
  },

  async up3() {
    await simple("s11-up3", "u3", "UP-3", [["label", { text: "Attach a file" }, "up-hidden"], ["wrapper", css("#up-drop"), "up-drop-input"]]);
  },
  async up4() {
    await simple("s11-up4", "u4", "UP-4", [["shadow", css("#up-shadow-host"), "up-shadow-input"], ["frame", css("#up-frame-wrap"), "up-frame-input"]]);
  },
  async up9() {
    const s = loadState();
    await session("s11-up9", async (c, claim) => {
      const h = handle(s, "u9");
      const tab = await claim(h);
      const o = await observe(c, tab, h, (t) => t.upload(css("#up-single"), `${ROOT}\\s11-link\\s11-out.bin`));
      row("UP-9", all([judgeError(o.err, "K-gate"), refusalPageJudge(o.page)]));
    });
  },

  async up8() {
    const s = loadState();
    await session("s11-up8", async (c, claim) => {
      const h = handle(s, "u8");
      const h1 = handle(s, "u1");
      const tab = await claim(h);
      await claim(h1);
      const header = String(await ev(c, h, "fetch(location.href, { cache: 'no-store' }).then((r) => r.headers.get('content-security-policy') || '')"));
      const inline = "(() => { const e = document.createElement('script'); e.textContent = 'window.__s11Inline = 1'; document.head.appendChild(e); return window.__s11Inline === 1; })()";
      const v = up8Verdict({ header, inlineRanU8: (await ev(c, h, inline)) === true, inlineRanU1: (await ev(c, h1, inline)) === true });
      ck("UP-8", "csp", v);
      const o = await observe(c, tab, h, (t) => t.upload(css("#up-single"), UP1(s)), "up-single");
      row("UP-8", all([v, o.err ? bad(`refused with ${o.err.code}`) : ok("ok"), resultJudge((o.value as { files: FileWant[] } | undefined)?.files, want(s, "s11-1k.bin")), uploadPageJudge(o.page, want(s, "s11-1k.bin"))]));
    });
  },

  async patch() {
    const s = loadState();
    await session("s11-patch", async (c, claim) => {
      const h = handle(s, "pt");
      const tab = await claim(h);
      await reset(c, h);
      const before = ((await readState(c, h)).patchedCalls ?? -1) as number;
      const r = await attempt(() => tab.upload(css("#up-single"), UP1(s)));
      const mid = await readState(c, h);
      await ev(c, h, "document.body.getAttribute('x')"); // the control, from the page's own world
      const after = (await readState(c, h)).patchedCalls ?? -1;
      row("UP-PATCH", all([r.err ? bad(`refused with ${r.err.code}`) : ok("ok"), uploadPageJudge(toPage(mid, "up-single"), want(s, "s11-1k.bin")), patchVerdict({ before, afterUpload: mid.patchedCalls ?? -1, afterControl: after })]));
    });
  },

  async twice() {
    const s = loadState();
    await session("s11-twice", async (c, claim) => {
      const h = handle(s, "tw");
      const tab = await claim(h);
      await reset(c, h);
      const r1 = await attempt(() => tab.upload(css("#up-single"), UP1(s)));
      const r2 = await attempt(() => tab.upload(css("#up-single"), fp(s, "s11-5m.bin")));
      const page = await readPage(c, h, "up-single");
      row("UP-TWICE", all([r1.err || r2.err ? bad("an upload was refused") : ok("ok twice"), uploadPageJudge(page, want(s, "s11-5m.bin"), { changes: 2, pairs: 2 })]));
    });
  },

  async raw() {
    const s = loadState();
    await session("s11-raw", async (c) => {
      const h = handle(s, "raw");
      await reset(c, h);
      const r = await attempt(() => raw(c, h, css("#up-single"), [missing]));
      const page = await readPage(c, h);
      const text = r.err ? `${r.err.message}\n${JSON.stringify(r.err.data ?? null)}` : "";
      const leaks = rawLeaks(text, [ROOT, WAVE, "s11-missing.bin", s.sentinel]);
      row("UP-RAW", rawVerdict({ leaks, page }), "RECORD");
      say(checkLine("UP-RAW observed", ok(r.err ? whichError(r.err, ["K-gate", "K-noacc"]) : `ok; the page holds ${page.files.length} file(s)`)));
    });
  },

  async nav() {
    const s = loadState();
    await session("s11-nav", async (c, claim) => {
      const h = handle(s, "nav");
      const tab = await claim(h);
      await reset(c, h);
      const r = await attempt(() => tab.upload(css("#up-single"), UP1(s)));
      await sleep(2500);
      const st = await readState(c, h);
      row("UP-NAV", navVerdict({ newDocIsPost: st.arrivedAfterNav, newDocMutations: st.marks.events.length, left: st.marks.final }), "RECORD");
      say(checkLine("UP-NAV observed", ok(r.err ? whichError(r.err, ["K-gate", "K-noacc"]) : "ok")));
    });
  },

  async stale() {
    const s = loadState();
    await session("s11-stale", async (c, claim) => {
      const h = handle(s, "stale");
      const present = (await rowOf(c, h)) !== undefined;
      if (!present) return row("UP-STALE", staleVerdict({ tabPresent: false, added: 0, removed: 0, left: 0 }), "RECORD");
      const tab = await claim(h);
      const o = await observe(c, tab, h, (t) => t.upload(css("#up-single"), UP1(s)));
      row("UP-STALE", staleVerdict({ tabPresent: true, added: o.page.markAdded, removed: o.page.markRemoved, left: o.page.carriersLeft }), "RECORD");
      say(checkLine("UP-STALE observed", ok(o.err ? whichError(o.err, ["K-gate", "K-noacc"]) : "ok")));
    });
  },

  async devt() {
    const s = loadState();
    await session("s11-devt", async (c, claim) => {
      const h = handle(s, "x");
      const tab = await claim(h);
      await reset(c, h);
      const r = await driverChange("UP-DEVT", c, s, () => attempt(() => tab.upload(css("#up-single"), UP1(s))));
      const page = await readPage(c, h);
      row("UP-DEVT", devtVerdict({ err: r.err, page }));
    });
  },

  async race(a) {
    const which = a.pos[0];
    if (which !== "a" && which !== "b") stop("race takes a or b");
    const s = loadState();
    const key = which === "a" ? "K-disarmed" : "K-blocked";
    const id = which === "a" ? "UP-RACE-A" : "UP-RACE-B";
    await session(`s11-race-${which}`, async (c, claim) => {
      const h = handle(s, which === "a" ? "ra" : "rb");
      const tab = await claim(h);
      await reset(c, h);
      const paths = [UP1(s), fp(s, "s11-sent.bin")];
      const results: Array<"ok" | Obs> = [];
      signal(id);
      while (!raceDone(results, 80)) {
        const r = await attempt(() => tab.upload(css("#up-single"), paths[results.length % 2]!));
        results.push(r.err ?? "ok");
      }
      signal(`${id}-loop-done`); // the driver restores the block list / arming on this, then presses ${id}
      await waitPressed(id);
      if (s.found && !(await waitSafety(c, s.found))) stop(`${id}: the safety state is not back to the found state`);
      const page = await readPage(c, h, "up-single");
      const v = raceVerdict(key, results, { added: page.markAdded, removed: page.markRemoved, left: page.carriersLeft });
      ck(id, "loop", ok(v.line));
      ck(id, "page", ok(`RECORD: the page holds ${page.files.length} file(s) after`));
      row(id, v.verdict);
    });
  },

  async "actor-start"() {
    mkdirSync(ACTORS, { recursive: true });
    const r = spawnSync(process.execPath, ["--import", "tsx", join(REPO, "recipes", "s9-actor.ts"), "start", ACTOR, "--no-tool-search"], { cwd: REPO, env: { ...process.env, S9_ACTORS: ACTORS }, encoding: "utf8", windowsHide: true, timeout: 60_000 });
    if (!String(r.stdout).includes("tool search off")) stop("the actor's start line lacks `tool search off`");
    ck("actor", "start", ok("started, tool search off"));
  },
  async "actor-end"() {
    spawnSync(process.execPath, ["--import", "tsx", join(REPO, "recipes", "s9-actor.ts"), "end", ACTOR], { cwd: REPO, env: { ...process.env, S9_ACTORS: ACTORS }, encoding: "utf8", windowsHide: true, timeout: 60_000 });
    ck("actor", "end", ok("ended"));
  },

  async up5() {
    const s = loadState();
    await session("s11-up5", async (c) => {
      const h = handle(s, "u5");
      const t1 = await mcpTurn(c, h, `Call browser_upload_file exactly once with tab "${h}", locator {"css":"#up-single"} and paths [${JSON.stringify(fp(s, "s11-sent.bin"))}]. Call no other tool. Then say done.`, "up5-1", "up-single");
      const t2 = await mcpTurn(c, h, `Call browser_upload_file exactly once with tab "${h}", locator {"css":"#up-single"} and paths [${JSON.stringify(fp(s, "s11-out.bin"))}]. Call no other tool. Then say done.`, "up5-2", "up-single");
      const res = up5Verdict(t1, t2, want(s, "s11-sent.bin")[0]!);
      for (const r of res) ck("UP-5", r.step, r.j);
      row("UP-5", all(res.map((r) => r.j)));
    });
  },

  async "saverefuse-sdk"() {
    const s = loadState();
    await session("s11-save-sdk", async (_c, claim) => {
      const tab = await claim(handle(s, "sv"));
      const js: Judged[] = [];
      for (const k of SAVE_CASES) {
        const r = await attempt(() => tab.evaluateToFile(k.expr, { path: join(SAVE, `sv-${k.name}.json`) }));
        const j = k.key === "control" ? saveControlVerdict(r.err) : saveSdkVerdict(k.key, r.err);
        ck("SAVE-REFUSE-R", `sdk-${k.name}`, j);
        js.push(j);
      }
      const f = saveFilesVerdict(readdirSync(SAVE));
      ck("SAVE-REFUSE-R", "sdk-files", f);
      row("SAVE-REFUSE-R sdk-leg", all([...js, f]));
    });
  },

  async "saverefuse-mcp"() {
    const s = loadState();
    await session("s11-save-mcp", async () => {
      const h = handle(s, "sv");
      const js: Judged[] = [];
      for (const k of SAVE_CASES.filter((x) => x.key !== "control")) {
        const t = await mcpRaw(`Call browser_evaluate exactly once with tab "${h}", expression ${JSON.stringify(k.expr)} and saveTo ${JSON.stringify(join(SAVE, `svm-${k.name}.json`))}. Call no other tool. Then say done.`, `sv-${k.name}`);
        const j = saveMcpVerdict(k.key as ErrKey, t.text, t.calls);
        ck("SAVE-REFUSE-R", `mcp-${k.name}`, j);
        js.push(j);
      }
      const f = saveFilesVerdict(readdirSync(SAVE));
      ck("SAVE-REFUSE-R", "mcp-files", f);
      row("SAVE-REFUSE-R mcp-leg", all([...js, f]));
    });
  },

  async sw2() {
    const s = loadState();
    await session("s11-sw2", async (c) => {
      const w = handle(s, "w");
      const sw = handle(s, "sw");
      const wr = await rowOf(c, w);
      const sr = await rowOf(c, sw);
      if (!wr?.active || wr.current !== true || sr?.active !== false || wr.windowId !== sr.windowId) stop("SW-2 needs w active and current, and sw behind it in the same window");
      const trial = async (): Promise<SwTrial> => {
        await sleep(1600);
        const pi = await rowOf(c, sw);
        if (pi?.active !== false) return { notMeasured: `pre-(i) failed: sw ${pi === undefined ? "not listed" : `active=${String(pi.active)}`}; no capture taken` };
        const i0 = Date.now();
        const bi = await attempt(() => c.call("screenshot", { tab: sw }, { timeoutMs: 40_000 }));
        const i = Date.now() - i0;
        await sleep(1600);
        const pii = await rowOf(c, w);
        if (pii?.active !== true) return { notMeasured: `pre-(ii) failed: w ${pii === undefined ? "not listed" : `active=${String(pii.active)}`}; (ii) not taken` };
        const ii0 = Date.now();
        const bii = await attempt(() => c.call("screenshot", { tab: w }, { timeoutMs: 40_000 }));
        const ii = Date.now() - ii0;
        await sleep(1600);
        return bi.err || bii.err ? { notMeasured: `a capture was refused (${(bi.err ?? bii.err)!.code})` } : { i, ii };
      };
      const vis = (tab: string): Promise<unknown> => ev(c, tab, "(window.__s11vis = [], document.addEventListener('visibilitychange', () => window.__s11vis.push(document.visibilityState)), true)");
      await vis(w);
      await vis(sw);
      const warmup = await trial();
      const trials: SwTrial[] = [];
      for (let k = 0; k < 3; k++) trials.push(await trial());
      const r = sw2(warmup, trials);
      for (const l of r.lines) say(l);
      const nv = async (tab: string): Promise<number> => ((await ev(c, tab, "window.__s11vis.length")) as number | undefined) ?? -1;
      ck("SW-2", "visibility log", ok(`RECORD: visibilitychange events w=${await nv(w)} sw=${await nv(sw)} (4 trials)`));
      row("SW-2", r.verdict);
    });
  },

  async "restore-check"(a) {
    const rd = (k: string): BoxState => JSON.parse(readFileSync(a.opts[k] ?? stop(`restore-check needs --${k} <json>`), "utf8")) as BoxState;
    const found = rd("found");
    const now = rd("now");
    say(restoreLine(found, now));
    const j = restoreVerdict(found, now);
    ck("UP-RESTORE", "stored", j);
    if (a.flags.includes("--daemon")) {
      await session("s11-restore", async (c) => {
        const d = await safetyNow(c);
        ck("UP-RESTORE", "daemon", d && d.armed === found.armed && d.evaluate === found.evaluate ? ok("daemon.status armed and evaluate equal the found state") : bad("daemon.status differs from the found state"));
      });
    }
    row("UP-RESTORE", j);
    if (!j.pass) stop("not restored");
  },

  async scan(a) {
    const what = a.opts.what ?? stop("scan needs --what console|daemon|actors|other");
    const s = loadState();
    let text: string;
    if (what === "actors") text = existsSync(ACTORS) ? readdirSync(ACTORS).filter((f) => f.includes(".turn-")).map((f) => resultLines(readFileSync(join(ACTORS, f), "utf8"))).join("\n") : "";
    else text = readFileSync(a.opts.file ?? stop("scan needs --file <f>"), "utf8");
    const envTok = process.env.BRIDGE_TOKEN?.trim();
    const tf = join(REPO, "bridge.token");
    const token = envTok || (existsSync(tf) ? readFileSync(tf, "utf8").trim() : undefined);
    const sc = scanText(text, { token: token || undefined, sentinel: s.sentinel, profile: [homedir()], ownId: extensionIdFromPath(join(REPO, "extension")) });
    say(logsLine(what, sc));
    const j = logsVerdict(sc, { consoleControl: what === "console" ? text.includes("safety: disarmed by the user") : undefined });
    row("UP-LOGS", j);
    if (!j.pass && !j.notMeasured) stop("UP-LOGS: a non-zero count");
  },
};

export const SUBCOMMANDS: readonly string[] = Object.keys(cmds);

/** The tab keys each subcommand needs from state.json: checked before any connection (a refusal must not spawn the daemon). */
export const NEEDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  l1: ["l1"], fa: ["fa"], up1: ["u1", "w"], up2: ["u2"], up3: ["u3"], up4: ["u4"], up5: ["u5"], up6: ["u6"], up6b: ["u6b"], up7: ["j7", "a7"], up7j: ["j7"], up8: ["u8", "u1"], up9: ["u9"],
  patch: ["pt"], twice: ["tw"], raw: ["raw"], nav: ["nav"], devt: ["x"], stale: ["stale"], "saverefuse-sdk": ["sv"], "saverefuse-mcp": ["sv"], sw2: ["w", "sw"],
});

const SAVE_CASES: ReadonlyArray<{ name: string; key: ErrKey | "control"; expr: string }> = [
  { name: "undef", key: "K-undef", expr: "return undefined" },
  { name: "node", key: "K-node", expr: "return document.body" },
  { name: "map", key: "K-map", expr: "return new Map([[1, 2]])" },
  { name: "cycle", key: "K-cycle", expr: "return (() => { const o = {}; o.self = o; return o; })()" },
  { name: "control", key: "control", expr: "throw new Error('boom')" },
];

/** UP-3 / UP-4: each step on a freshly reset page, the file landing in the named input. */
async function simple(name: string, tabKey: string, id: string, steps: Array<[string, Tgt, string]>): Promise<void> {
  const s = loadState();
  await session(name, async (c, claim) => {
    const h = handle(s, tabKey);
    const tab = await claim(h);
    const js: Judged[] = [];
    for (const [step, target, input] of steps) {
      const o = await observe(c, tab, h, (t) => t.upload(target, UP1(s)), input);
      const j = all([o.err ? bad(`refused with ${o.err.code}`) : ok("ok"), resultJudge((o.value as { files: FileWant[] } | undefined)?.files, want(s, "s11-1k.bin")), o.stray === 0 ? ok("no other input changed") : bad("another input received something"), uploadPageJudge(o.page, want(s, "s11-1k.bin"))]);
      ck(id, step, j);
      js.push(j);
    }
    row(id, all(js));
  });
}

/** One actor turn; the transcript goes to the actors folder, nothing of it is printed. */
async function mcpRaw(prompt: string, step: string): Promise<{ text: string; isError: boolean; calls: string[] }> {
  mkdirSync(ACTORS, { recursive: true });
  const r = spawnSync(process.execPath, ["--import", "tsx", join(REPO, "recipes", "s9-actor.ts"), "send", ACTOR, prompt, "--timeout", "90"], { cwd: REPO, env: { ...process.env, S9_ACTORS: ACTORS }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000, windowsHide: true });
  const out = String(r.stdout ?? "");
  writeFileSync(join(ACTORS, `${ACTOR}.turn-${step}.txt`), out);
  const t = parseTurn(out.split(/\r?\n/));
  if (!t.ended) stop(`the actor's turn ${step} did not end`);
  const calls = t.calls.map((x) => x.tool.replace(/^mcp__chrome-agent-bridge__/, ""));
  return { text: t.calls.map((x) => x.items.join("\n")).join("\n"), isError: t.calls.some((x) => x.isError === true), calls };
}
async function mcpTurn(c: BridgeClient, h: string, prompt: string, step: string, input: string): Promise<McpTurn> {
  await reset(c, h);
  const t = await mcpRaw(prompt, step);
  return { ...t, page: await readPage(c, h, input) };
}

export async function main(argv: readonly string[]): Promise<number> {
  try {
    const a = parseArgs(argv);
    const fn = cmds[a.cmd];
    if (!fn) stop(`unknown or missing subcommand; known: ${Object.keys(cmds).join(", ")}`);
    const need = a.cmd === "race" ? (a.pos[0] === "a" ? ["ra"] : a.pos[0] === "b" ? ["rb"] : []) : NEEDS[a.cmd];
    if (need?.length) {
      const s = loadState();
      for (const k of need) handle(s, k);
    }
    await fn!(a);
  } catch (e) {
    // Never the error's message: it can carry a path or a URL. The class and a code only.
    const what = e instanceof Stop ? e.message : `unexpected ${e instanceof Error ? e.constructor.name : "throw"}${e instanceof BridgeError ? ` (${String(e.code)})` : (e as { code?: string })?.code ? ` (${(e as { code?: string }).code})` : ""}`;
    say(`STOP: ${what}`);
    return 2;
  }
  return fails > 0 ? 1 : notMeasured > 0 ? 3 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

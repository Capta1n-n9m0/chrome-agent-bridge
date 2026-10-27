// recipes/s11b.ts — `B17 <sub>`: the SDK-free side of Run 17's helpers (docs/e2e-test-plan.md §4.24, closing list items 2, 3).
// Written 2026-10-27 by S4-helpers builder H4 (Claude Sonnet 5.5); NOT run against Chrome by its author. Pass rules and
// line forms are pure, in recipes/s11b-rules.ts. This file prints only lines those builders make, `EXPR`/`ROW`/`STOP:`
// lines, never a URL, path, pattern, token, alias, hash or the text of a list.
//
//   node --import tsx recipes/s11b.ts <sub> [args]
//
// THE CONSOLE CONTRACT (H6's `Invoke-S11bConsoleEval`). Console subcommands: manifest, rules, ctx, regex, stored, tabwatch (`--mode start|read`, S7-helpers H2). Two phases:
//   phase 1  `<sub> --expr <file> [opts]`   writes ONE line (no newline) to <file>: the expression to type into the worker's
//            DevTools console. Before writing, preTypeCheck(text, {token, alias, profilePath}) runs; a match prints
//            `STOP: console input holds a pattern`, exits 2 and writes nothing. Prints `EXPR <sub> ok len=<n>`. The expression
//            evaluates to undefined and prints only its own lines. `regex` also runs the in-process proof first: a
//            mismatch prints REGEX_NOT_MEASURED, exits 3, writes nothing. `--alias <a>` is optional (never printed).
//   phase 2  `<sub> --read <dumpfile>`      parses the dump of the console's text (UTF-8 or UTF-16 with BOM; the echoed
//            input may be present: only a whole line of the exact form counts) and prints the sheet's line plus a `ROW …`
//            judgement where the row has one. No line found: `NOT MEASURED: no <X> line in the console dump (nothing was read)`,
//            exit 3. For `stored` there is no dump: its listener is in this process (below).
//   opts: rules `--sample <ms> --for <ms>` (phase 1: the in-console sampler; phase 2 reads the samples line; optional
//         `--expect <N>`: judged by judgeSampleThenZero with `--after <n>`, or, without --sample, a single RULES n must equal N,
//         unequal is a STOP when N is 0); ctx `--label <l> --tag <t>` (both phases need --label, phase 1 --tag, the `s11b=<t>` query value of the row's tab; phase 2 count > 0 is a STOP, RD-7; tabs=0 is NOT MEASURED).
//   `rules --expect-from <found-file>` prints `RULES expect=<N>` (the found list + BLK; no console).
// `stored --expected <file outside the repo> --port-file <f> [--timeout <ms, default 30000>] [--for <ms>] [--signal <file>] [--expr <file>]`
//   binds 127.0.0.1 on an ephemeral port, writes the port to <port-file>, and with --expr writes the storedExpression(port, for)
//   (default --for = timeout). It accepts several POSTs (the first is the value already stored), judges each body by sha256 in
//   this process against the expected text, and on the first match: writes the signal file (`--signal`, the runner starts its
//   call the moment the file exists; it holds the epoch ms), prints `STORED match=yes lines=<n>` and `STOREDAT <epoch ms>`,
//   exits 0. On timeout: `STORED match=no lines=<n>`, exit 3 (and writes `--cancel <file>` at once, which a waiting `call --go` honours).
//   The received text and any hash are never printed or written. The listener stays open after the verdict until the typed poller's own
//   bounded time is over (its first POST + --for + 1 s), answering 204 and judging nothing: a closed port would make Chrome log a failed
//   request naming the ephemeral loopback URL in the console RD-LOGS scans (S4-helpers fixer, M4).
// Other subs: hits, ctl, scan, state, mark, judge-row, dl-record, state-compat, clean-console (below). H5's SDK subcommands are added at the marked place in `cmds`.
//
// Exit: 0 every check passed, 1 a check failed, 2 a STOP, 3 not measured / not discriminating.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { connect as netConnect } from "node:net";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve, isAbsolute, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeUploadFolders } from "../extension/src/options-model.js";
import { extensionIdFromPath } from "./s9-rules.js";
import { bannerCtlLines, consoleLine, devtLines, isSlice, legLine, rawLine, scan18, type Slice } from "./s12-rules.js";
import { buildJudge, checkLine as checkLine11, judgeError, logsLine, logsVerdict, rawLeaks, refusalPageJudge, rowLine as rowLine11, uploadPageJudge, type FileWant, type Judged, type PageObs } from "./s11-rules.js";
import {
  countHits, ctxExpression, expectedRuleCount, flipCounts, hitsLine, judgeCtl, judgeSampleThenZero, judgeStored, manifestExpression,
  parseCtxLine, parseManifestLine, parseRegexLines, parseRulesLine, parseRulesSamplesLine, preTypeCheck, regexExpression, regexProof,
  rulesExpectLine, redactChromeBlocked17, rulesExpression, rulesSampleExpression, row17Line, scan17, type Scan17Ctx, scanLine17, storedExpression, verdict17, REGEX_NOT_MEASURED,
  callLine, foundList, judgeErr17, judgeHistory, judgeRaceA, judgeSamedoc, judgeSocket, k17RawDir, k17RawMissing, K17, latLine, raceDone17, raceDue, recordLine, socketLine,
  answerOfRow, dlHopRecord, dropTitleLines, fileExistsFrom, judgeDlTrial, judgeFileTabHidden, judgeFileTabRow, type FileTabListRow, judgeRd0State, markExpression, parseCallRow, parseMarkLine, rd0StateLine, rd0ToggleLine, SOCK_MARKS, stateCompat, type SockWindow,
  historyPlan, historyBackTarget, histDiagRow17, pollUntil17, sameUrl17, HIST_POLL_MS, HIST_SETTLE_MS, HIST_WAIT_MS, unexpectedStop17, windowViolations, judgeCallAnswer, judgeCaps, judgeFHome, judgeHistoryRow, judgeTimedRules, judgeUpOpt, gapJudge, parseCtxTabs, parseRulesTimedLine, rulesTimedExpression, rulesSamplesLine, type TimedMode, RACE_MAX_CALLS, RACE_MIN_CALLS, RACE_SPACING_MS, WINDOW_AFTER_MS, WINDOW_BEFORE_MS,
  type Answer, type CallSpan, type HistoryKind, type J17, type K17Error, type Port, type RaceCall, type Reply,
} from "./s11b-rules.js";
import { buildLine, countS6Names, newtabTrialLine, NEWTAB_AWAITING, judgeBuild, judgeNewtabTrial, judgeTabwatch, pageClassOf, parseTabwatchLine, parseTabwatchStarted, s6CommitLine, S6_COMMIT, tabwatchLine, tabwatchReadExpression, tabwatchStartExpression, TABWATCH_ROWS, withOpened, type CreatedUrl } from "./s11b-r17b-build.js";
import { actLine, aggregateRows, ctlSlowLine, carriedRowLine, guardedActivate, histLine, histSetupBackOutcome, isActLabel, isR17bRow, judgeCtlSlow, judgeR17bRow, judgeRd2Snapshot, histReplyLine, parseTabRowLine, rd2TabRowLine, judgeSnapshotPage, msForJudge, R17B_ROWS, refusedStop, strictCall } from "./s11b-r17b-rules.js";

export class Stop extends Error {}
export const BOOLEAN_FLAGS: readonly string[] = ["--dry", "--no-sampler", "--sock-console", "--activate", "--to-cap"];
export interface Args { cmd: string; pos: string[]; opts: Record<string, string>; flags: string[] }
/** `<cmd> [positional...] [--key value] [--flag]`; a `--key` without a value is a STOP. */
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

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let code = 0;
const say = (line: string): void => console.log(line);
const bump = (c: number): void => {
  code = Math.max(code === 3 && c === 1 ? 1 : code, c);
};
const stop = (msg: string): never => {
  throw new Stop(msg);
};
const need = (a: Args, k: string): string => a.opts[k] ?? stop(`${a.cmd} needs --${k}`);
const int = (a: Args, k: string, d?: number): number => {
  const v = a.opts[k];
  if (v === undefined) return d ?? stop(`${a.cmd} needs --${k}`);
  if (!/^\d+$/.test(v)) return stop(`--${k} is not a whole number`);
  return Number(v);
};
/** The verdict's row line, its STOP line when it is one, and the exit code. */
function judged(id: string, j: J17): void {
  say(row17Line(id, j));
  if (j.stop) say(`STOP: ${id}: ${j.why}`);
  bump(j.pass ? 0 : j.stop ? 2 : j.notMeasured || j.nd ? 3 : 1);
}
const j17 = (pass: boolean, why: string, extra: Partial<J17> = {}): J17 => ({ pass, why, ...extra });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const lines = (f: string): string[] => readFileSync(f, "utf8").split(/\r?\n/);

/** A UIA dump may be UTF-16 with a BOM. */
export function readDump(f: string): string {
  const b = readFileSync(f);
  return b[0] === 0xff && b[1] === 0xfe ? b.subarray(2).toString("utf16le") : b.toString("utf8").replace(/^﻿/, "");
}
function token(): string | undefined {
  const t = process.env.BRIDGE_TOKEN?.trim();
  const tf = join(REPO, "bridge.token");
  return t || (existsSync(tf) ? readFileSync(tf, "utf8").trim() || undefined : undefined);
}

// ── console subcommands: the two phases ──────────────────────────────────────────────────────────────────

/** Phase 1: the pre-type check, then the file. Exits 2 on a pattern, nothing written. */
export function writeExpr(a: Args, sub: string, text: string): void {
  const hit = preTypeCheck(text, { token: token(), alias: a.opts.alias, profilePath: homedir() });
  if (hit) {
    say(hit);
    bump(2);
    return;
  }
  writeFileSync(need(a, "expr"), text);
  say(`EXPR ${sub} ok len=${text.length}`);
}
const noLine = (what: string): void => {
  say(`NOT MEASURED: no ${what} line in the console dump (nothing was read)`);
  bump(3);
};

/** `rules --mode at|inflight|empty --send <ms> --reply <ms> [--expect N] [--row R]`: the timed sampler's line judged against a call's times. */
function readTimed(a: Args, dump: string, expect: number | undefined): void {
  const mode = a.opts.mode as TimedMode;
  if (!["at", "inflight", "empty"].includes(mode)) stop("--mode is at, inflight or empty");
  const t = parseRulesTimedLine(dump);
  if (!t) return noLine("RULES timed");
  const r = judgeTimedRules(mode, t.samples, int(a, "send"), int(a, "reply"), expect ?? 0);
  const line = rulesSamplesLine(r.window);
  if (line) say(line);
  say(`RULES after=${r.after === null ? "none" : r.after}`);
  judged(`${a.opts.row ?? "RULES"} rules-${mode}`, r.verdict);
}

const twMode = (a: Args): "start" | "read" => (a.opts.mode === "start" || a.opts.mode === "read" ? a.opts.mode : stop("tabwatch needs --mode start or --mode read"));
type Console = { expr: (a: Args) => string; read: (a: Args, dump: string) => void };
const consoles: Record<string, Console> = {
  manifest: {
    expr: () => manifestExpression(),
    read(_a, dump) {
      const m = parseManifestLine(dump);
      if (!m) return noLine("MANIFEST");
      say(m.line);
      judged("RD-0 (a)", m.dnrWithHostAccess && m.staticRuleSets === "absent" ? j17(true, "dnrWithHostAccess=true, staticRuleSets=absent") : j17(false, "the manifest differs from true / absent"));
    },
  },
  rules: {
    expr: (a) => (a.opts.mode ? rulesTimedExpression(int(a, "sample"), int(a, "for")) : a.opts.sample ? rulesSampleExpression(int(a, "sample"), int(a, "for")) : rulesExpression()),
    read(a, dump) {
      const exp = a.opts.expect === undefined ? undefined : int(a, "expect");
      if (a.opts.mode) return readTimed(a, dump, exp);
      if (a.opts.sample) {
        const s = parseRulesSamplesLine(dump);
        if (!s) return noLine("RULES samples");
        say(s.line);
        if (exp !== undefined) judged("RULES samples", judgeSampleThenZero(s.samples, exp, int(a, "after")));
        return;
      }
      const r = parseRulesLine(dump);
      if (!r) return noLine("RULES");
      say(r.line);
      if (exp !== undefined) judged("RULES", r.n === exp ? j17(true, `RULES ${r.n}`) : j17(false, `RULES ${r.n}, expected ${exp}`, exp === 0 ? { stop: true } : {}));
    },
  },
  ctx: {
    expr: (a) => ctxExpression(need(a, "label"), need(a, "tag")),
    read(a, dump) {
      const c = parseCtxLine(dump, need(a, "label"));
      if (!c) return noLine("CTX");
      const tabs = parseCtxTabs(dump, need(a, "label"));
      if (tabs !== null) say(`CTX ${need(a, "label")} tabs=${tabs}`);
      say(c.line);
      if (c.count > 0) judged("RD-7", j17(false, `an extension context lives in the tab (count ${c.count})`, { stop: true }));
      else if (tabs === 0) {
        say("NOT MEASURED: CTX matched 0 tabs, so a count of 0 is not evidence (nothing was read)");
        bump(3);
        return;
      }
    },
  },
  mark: {
    expr: (a) => markExpression(need(a, "label")),
    read(a, dump) {
      const l = need(a, "label");
      if (!parseMarkLine(dump, l)) return noLine("RD-DL-SOCKET mark");
      judged(`RD-DL-SOCKET mark-${l}`, j17(true, "the mark stands in the console capture"));
    },
  },
  tabwatch: {
    // S7-helpers H2: `--mode start` types the listener (prints `TABWATCH started`), `--mode read` removes it and prints the one TABWATCH line.
    // Read phase options: `--reply-ms <n>` (the helper's LAT of the newTab reply, appended as reply-ms), `--row R17B-NEWTAB-PLAIN|R17B-RD-2|R17B-NEWTAB-LOAD`.
    expr: (a) => (twMode(a) === "read" ? tabwatchReadExpression() : tabwatchStartExpression()),
    read(a, dump) {
      if (twMode(a) === "start") {
        if (!parseTabwatchStarted(dump)) return noLine("TABWATCH started");
        return say("TABWATCH started");
      }
      const t = parseTabwatchLine(dump);
      if (!t) return noLine("TABWATCH");
      say(tabwatchLine(t, a.opts["reply-ms"] === undefined ? undefined : int(a, "reply-ms")));
      if (a.opts.row !== undefined) {
        if (!(TABWATCH_ROWS as readonly string[]).includes(a.opts.row)) stop(`tabwatch --row is one of ${TABWATCH_ROWS.join(", ")}`);
        judged(a.opts.row, judgeTabwatch(a.opts.row, t));
      }
    },
  },
  regex: {
    expr: () => regexExpression(),
    read(_a, dump) {
      const r = parseRegexLines(dump);
      if (!r) return noLine("REGEX (all five)");
      for (const x of r) say(x.line);
    },
  },
};

function consoleSub(a: Args): void {
  const c = consoles[a.cmd]!;
  if (a.cmd === "rules" && a.opts["expect-from"]) {
    say(rulesExpectLine(expectedRuleCount(readFileSync(a.opts["expect-from"], "utf8"))));
    return;
  }
  if (a.cmd === "regex") {
    const p = regexProof();
    if (p !== "equal") {
      say(p === REGEX_NOT_MEASURED ? p : REGEX_NOT_MEASURED);
      return bump(3);
    }
  }
  if (a.opts.expr) return writeExpr(a, a.cmd, c.expr(a));
  if (a.opts.read) return c.read(a, readDump(a.opts.read));
  stop(`${a.cmd} needs --expr <file> or --read <dumpfile>`);
}

// ── stored: the one-shot loopback listener ───────────────────────────────────────────────────────────────

export interface StoredRun { match: boolean; line: string; at: number | null }
/** The poller (typed into the console) keeps reading for `--for` ms from its first POST; the listener outlives it by this much (M4). */
export const STORED_LINGER_MS = 1000;
/**
 * Listens until a POSTed body equals `expected` (by sha256, in this process) or `timeoutMs` passes. That decides the verdict (judged only up
 * to the match; `onMatch` fires then, `onNoMatch` on the timeout). The listener then STAYS OPEN, answering 204 and judging nothing, until the
 * typed poller's own bounded time is over: its first POST (it POSTs its first read at once) + `forMs` + STORED_LINGER_MS. A listener that
 * closed at the match left the poller POSTing to a closed port, and Chrome logs such a failed request, naming that ephemeral loopback URL, in
 * the worker console that RD-LOGS scans (M4). No POST ever arriving: the poller never ran, the listener closes at the verdict.
 */
export async function storedListen(o: {
  expected: string;
  timeoutMs: number;
  forMs?: number;
  onPort: (port: number) => void;
  onMatch?: (at: number) => void;
  onNoMatch?: () => void;
}): Promise<StoredRun> {
  const got: string[] = [];
  let first: number | null = null;
  let verdict: StoredRun | undefined;
  let decide!: (at: number | null) => void;
  const decided = new Promise<void>((res) => {
    decide = (at) => {
      if (verdict) return;
      verdict = { ...judgeStored(got, o.expected), match: at !== null, at };
      if (at === null) o.onNoMatch?.();
      res();
    };
  });
  const server: Server = createServer((req, rsp) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size <= 4 * 1024 * 1024) chunks.push(c);
    });
    req.on("end", () => {
      rsp.writeHead(204, { "Access-Control-Allow-Origin": "*" }).end();
      if (req.method !== "POST") return;
      first ??= Date.now();
      if (verdict) return;
      got.push(Buffer.concat(chunks).toString("utf8"));
      if (judgeStored(got, o.expected).matched) {
        const at = Date.now();
        o.onMatch?.(at);
        decide(at);
      }
    });
  });
  // Known edge (S4-helpers fixer 2, n-new-3): if the poller's first POST only arrives after `timeoutMs`, `first` is still null at the verdict, the
  // listener closes at once and that POST meets a closed port. Today's timings exclude it (the poller is typed within about 10 s of the listener
  // start, the timeout is 30 s); S4-live's notes carry it. A closed port there is a logged failed request, never a false pass.
  const timer = setTimeout(() => decide(null), o.timeoutMs);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  o.onPort((server.address() as { port: number }).port);
  await decided;
  clearTimeout(timer);
  const hold = first === null ? 0 : first + (o.forMs ?? o.timeoutMs) + STORED_LINGER_MS - Date.now();
  if (hold > 0) await sleep(hold);
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  return verdict!;
}

async function stored(a: Args): Promise<void> {
  const ef = resolve(need(a, "expected"));
  const rel = relative(REPO, ef);
  if (!rel.startsWith("..") && !isAbsolute(rel)) stop("the expected text file is inside the repo");
  const expected = readFileSync(ef, "utf8");
  const timeoutMs = int(a, "timeout", 30000);
  const forMs = int(a, "for", timeoutMs);
  const r = await storedListen({
    expected,
    timeoutMs,
    forMs,
    onPort: (p) => {
      writeFileSync(need(a, "port-file"), String(p));
      if (a.opts.expr) writeExpr(a, "stored", storedExpression(p, forMs));
    },
    onMatch: (at) => {
      if (a.opts.signal) writeFileSync(a.opts.signal, String(at));
    },
    // m3: the call that waits for --go must not wait out its 60 s when the stored value never matched.
    onNoMatch: () => {
      if (a.opts.cancel) writeFileSync(a.opts.cancel, "cancel");
    },
  });
  say(r.line);
  if (r.match) say(`STOREDAT ${r.at}`);
  else bump(3);
}

// ── hits, ctl, scan ──────────────────────────────────────────────────────────────────────────────────────

/** `hits --log <redirect>[,<blocked>] --tag <t> [--flip <flip log>]`. One log: only `HITS <tag> redirect=<n>` (no blocked part). */
function hits(a: Args): void {
  const tag = need(a, "tag");
  const files = need(a, "log").split(",").filter(Boolean);
  if (files.length === 0 || files.length > 2) stop("hits --log needs one or two files");
  const [red, blk] = files.map((f) => (existsSync(f) ? lines(f) : stop("a --log file does not exist")));
  if (a.opts.only === "blocked") {
    // n2: RD-BACK and RD-FWD print the sheet's `HITS <tag> blocked=<n>` (the one log is 8085's; the flip server's log is --flip).
    if (blk) stop("hits --only blocked takes the blocked fixture's log alone");
    say(`HITS ${tag} blocked=${countHits(red!, tag)}`);
  } else say(blk ? hitsLine(tag, red!, blk) : `HITS ${tag} redirect=${countHits(red!, tag)}`);
  if (a.opts.flip) {
    const f = flipCounts(lines(a.opts.flip), tag);
    say(`FLIP ${tag} n200=${f.n200} n302=${f.n302} total=${f.total}`);
  }
}

const CTL_PORTS = { p83: 8083, p88: 8088, p89: 8089, p86: 8086, p91: 8091, p85: 8085 };
async function get(port: number, path: string): Promise<Answer> {
  const t0 = Date.now();
  try {
    const r = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    await r.arrayBuffer().catch(() => undefined);
    return { status: r.status, ms: Date.now() - t0 };
  } catch {
    return { status: 0, ms: Date.now() - t0 };
  }
}
/** RD-CTL: `ctl --log85 <8085's log> [--p83 … --p88 … --p89 … --p86 … --p91 … --p85 …]`. A miss is a STOP. */
export async function ctl(a: Args): Promise<void> {
  const p = Object.fromEntries(Object.entries(CTL_PORTS).map(([k, d]) => [k, int(a, k, d)])) as Record<keyof typeof CTL_PORTS, number>;
  const log85 = need(a, "log85");
  const idle = netConnect({ host: "127.0.0.1", port: p.p83 });
  const held = await new Promise<boolean>((res) => {
    idle.once("connect", () => res(true));
    idle.once("error", () => res(false));
  });
  try {
    await sleep(200);
    const two = async (port: number, i: number): Promise<Answer[]> => Promise.all([get(port, `/s11b-ctl?n=${i}a`), get(port, `/s11b-ctl?n=${i}b`)]);
    const skip = (a.opts.skip ?? "").split(",").filter(Boolean).map(Number); // R17B-CTL: `--skip 8088,8089` (those servers are not started)
    const ports: Partial<Record<Port, Answer[]>> = { 8083: await two(p.p83, 1), 8086: await two(p.p86, 4) };
    if (!skip.includes(8088)) ports[8088] = await two(p.p88, 2);
    if (!skip.includes(8089)) ports[8089] = await two(p.p89, 3);
    const fp = `/h/ctl?s11b=ctlflip${Date.now()}`;
    const f1 = await get(p.p91, fp);
    const f2 = await get(p.p91, fp);
    await get(p.p85, "/e2e-playground.html?s11b=ctl");
    await sleep(300);
    const r = judgeCtl({ idleSocket: held, ports, flip: [f1.status, f2.status], ctlBlocked: countHits(lines(log85), "ctl"), skipped: skip });
    for (const l of r.lines) say(l);
    judged("RD-CTL", r.verdict);
  } finally {
    idle.destroy();
  }
}

/** R17B-CTL: `ctl-slow [--p87 8087]`: one timed GET of the slow server (tag bctl); prints the sheet's `CTL 8087 slow answered after <ms> ms`. A miss is a STOP. */
export async function ctlSlow(a: Args): Promise<void> {
  const r = await get(int(a, "p87", 8087), "/slow/e2e-playground.html?s11b=bctl");
  say(ctlSlowLine(r.ms));
  judged("R17B-CTL 8087", judgeCtlSlow(r));
}

/** `--sock-lines a,b`: the daemon-log window as two line counts. */
function sockLines(v: string): SockWindow {
  const m = /^(\d+),(\d+)$/.exec(v);
  return m ? { fromLine: Number(m[1]), toLine: Number(m[2]) } : stop("--sock-lines is <from>,<to>");
}
/** The one Scan17Ctx of `scan` and `redact-console` (#306): token, state.json sentinel, `--alias` else state.json's, own extension id, profile. */
function scanCtx(a: Args, what: string): Scan17Ctx {
  let sentinel = "";
  let alias: string | undefined = a.opts.alias;
  try {
    const sf = join(S11_OUT, "state.json");
    const st = existsSync(sf) ? (JSON.parse(readFileSync(sf, "utf8")) as { sentinel?: string; alias?: string }) : {};
    sentinel = String(st.sentinel ?? "");
    alias = alias || st.alias;
  } catch {
    /* no sentinel and no alias known: the verdict says so */
  }
  return { token: token(), sentinel, profile: [homedir()], alias, ownId: extensionIdFromPath(join(REPO, "extension")), consoleStream: what === "console" };
}

/** The socket window of the scan's options (`--sock-console`, `--sock-lines`, `--mark-from/--mark-to`), shared with `redact-console`. */
function sockWindow(a: Args): SockWindow | undefined {
  return a.flags.includes("--sock-console")
    ? { start: SOCK_MARKS.start, end: SOCK_MARKS.end }
    : a.opts["sock-lines"]
      ? sockLines(a.opts["sock-lines"])
      : a.opts["mark-from"] && a.opts["mark-to"]
        ? { start: a.opts["mark-from"], end: a.opts["mark-to"] }
        : undefined;
}

/**
 * RD-LOGS: `scan --what console|daemon|actors|other [--file <f>] [--alias <a>] [--sock-console | --sock-lines <a>,<b> | --mark-from <s> --mark-to <s>]`.
 * The alias defaults to the one `S11 make` stored in state.json (never printed); a scan with no alias is NOT MEASURED. `actors` reads the
 * actors' transcripts as Run 16's `S11 scan` does (tool results only, `resultLines`) and needs no --file. A console capture loses its
 * window-title lines first (#283). `--sock-console` takes RD-DL-SOCKET's two console marks, `--sock-lines` its two daemon-log line counts.
 */
async function scanTextOf(a: Args, what: string): Promise<string> {
  let text: string;
  if (what === "actors") {
    const dir = join(S11_OUT, "actors");
    const { resultLines } = await import("./s11.js");
    text = existsSync(dir) ? readdirSync(dir).filter((f) => f.includes(".turn-")).map((f) => resultLines(readFileSync(join(dir, f), "utf8"))).join("\n") : "";
  } else text = readFileSync(need(a, "file"), "utf8");
  if (what === "console") text = dropTitleLines(text).text;
  return text;
}
async function scan(a: Args): Promise<void> {
  const what = need(a, "what");
  const text = await scanTextOf(a, what);
  const ctx = scanCtx(a, what);
  const s = scan17(text, ctx, sockWindow(a));
  say(scanLine17(what, s));
  judged("RD-LOGS", verdict17(s, { consoleControl: what === "console" ? text.includes("safety: disarmed by the user") : undefined }));
}

/** `scan18 --what console|daemon|actors|other [--file <f>]`: Run 18's scan (section 4.26's fixture definition; a bare `://` is not a URL); the `SCAN` line and a CHECK. */
async function scan18Cmd(a: Args): Promise<void> {
  const what = need(a, "what");
  const text = await scanTextOf(a, what);
  const s = scan18(text, scanCtx(a, what));
  say(logsLine(what, s));
  const j = logsVerdict(s, { consoleControl: what === "console" ? text.includes("safety: disarmed by the user") : undefined });
  say(checkLine11(`R18-LOGS scan ${what}`, j));
  bump(j.pass ? 0 : j.notMeasured ? 3 : 2);
}

/** `redact-console --file <capture> --out <evidence>`: the capture with Chrome's blocked-request lines as a label (#306); prints the count only. */
function redactConsole(a: Args): void {
  const out = outsideRepo(need(a, "out"));
  rmSync(out, { force: true }); // R3: a refusal leaves no earlier copy
  const text = dropTitleLines(readFileSync(outsideRepo(need(a, "file")), "utf8")).text;
  const ctx = scanCtx(a, "console");
  const v = verdict17(scan17(text, ctx, sockWindow(a)), { consoleControl: text.includes("safety: disarmed by the user") });
  if (!v.pass) stop("the console scan did not pass; no evidence copy is written");
  const r = redactChromeBlocked17(text, ctx);
  writeFileSync(out, r.text);
  say(`CONSOLE chrome-blocked lines redacted=${r.redacted}`);
}

/** `clean-console --file <capture>`: drops the capture's window-title lines in place (#283); prints the count only. */
function cleanConsole(a: Args): void {
  const f = outsideRepo(need(a, "file"));
  const r = dropTitleLines(readFileSync(f, "utf8"));
  writeFileSync(f, r.text);
  say(`CONSOLE window-title lines dropped=${r.dropped}`);
}
function outsideRepo(file: string): string {
  const f = resolve(file);
  const rel = relative(REPO, f);
  if (!rel.startsWith("..") && !isAbsolute(rel)) stop("a file of this command lies inside the repo");
  return f;
}

/** RD-0 (c): `state --found <found.json> --folders <found Upload folders text>`: the sheet's STATE line (valid/invalid by analyzeUploadFolders) and the TOGGLE line. */
function stateCmd(a: Args): void {
  const j = JSON.parse(readFileSync(outsideRepo(need(a, "found")), "utf8")) as { armed: boolean; evaluate: boolean; blocklist: { lines: number }; toggle: string };
  const f = analyzeUploadFolders(readFileSync(outsideRepo(need(a, "folders")), "utf8"));
  say(rd0StateLine({ armed: j.armed === true, evaluate: j.evaluate === true, blockLines: Number(j.blocklist.lines), valid: f.folderCount, invalid: f.invalidCount }));
  if (j.toggle === "on" || j.toggle === "off") say(rd0ToggleLine(j.toggle));
  judged("RD-0 (c)", judgeRd0State({ armed: j.armed === true, evaluate: j.evaluate === true, toggle: j.toggle }));
}

/**
 * `judge-row --row <label> --from <file of S9's output> --step <S9 step> --as <kind> [--lat <name>] [--rules-after <n>] [--blocked <n>]`.
 * Reads the one `ROW <id> <step> <ok|CODE> <message> (<ms> ms)` line S9 printed (the message is compared in this process, never printed).
 * kinds: dl-err, dl-hop (RD-DL-ERR / RD-DL-HOP per trial), filepage, fileurl (F-FILETAB's K-filepage / K-fileurl), tabs-hidden (F-FILETAB's
 * tabs row), lat (only the LAT line). `--lat <name>` prints the sheet's `LAT <name> <ms> ms` from S9's own time (the call, not node's start).
 */
function judgeRow(a: Args): void {
  const text = readFileSync(outsideRepo(need(a, "from")), "utf8");
  const step = need(a, "step");
  const label = need(a, "row");
  const kind = need(a, "as");
  if (!["dl-err", "dl-hop", "filepage", "fileurl", "tabs-hidden", "lat"].includes(kind)) stop("--as is dl-err, dl-hop, filepage, fileurl, tabs-hidden or lat");
  const row = parseCallRow(text, step);
  if (!row) {
    say(`NOT MEASURED: no ROW line for step ${step} in the call's output (nothing was read)`);
    return bump(3);
  }
  if (a.opts.lat) say(latLine(a.opts.lat, row.ms));
  const opt = (k: string): number | null => (a.opts[k] === undefined ? null : int(a, k));
  if (kind === "lat") return;
  if (kind === "dl-err") return judged(label, judgeDlTrial("err", row, { fileExists: null, blocked: null, rulesAfter: opt("rules-after") }));
  if (kind === "dl-hop") return judged(label, judgeDlTrial("hop", row, { fileExists: fileExistsFrom(text, step), blocked: opt("blocked"), rulesAfter: opt("rules-after") }));
  if (kind === "tabs-hidden") return judged(label, judgeFileTabRow(row));
  judged(label, judgeCallAnswer(kind, answerOfRow(row), label));
}
/**
 * `r17b-clause --kind snap-page|rd2-snap --from <S9 output file of the snapshot call> [--tabrow-from <output file of `rd2-row`>] --row <label>`
 * (S7-helpers fixer F1, F2): one clause of an R17B row as a CHECK line, with the exit code of the clause (0, 1, 3).
 */
function r17bClause(a: Args): void {
  const kind = need(a, "kind");
  const label = need(a, "row");
  const snap = parseCallRow(readFileSync(outsideRepo(need(a, "from")), "utf8"), "snap");
  let j: J17;
  if (kind === "snap-page") j = judgeSnapshotPage(snap);
  else if (kind === "rd2-snap") j = judgeRd2Snapshot(parseTabRowLine(lines(outsideRepo(need(a, "tabrow-from"))), "R17B-RD-2"), snap);
  else return stop("--kind is snap-page or rd2-snap");
  say(checkLine(label, j));
  bump(j.pass ? 0 : j.notMeasured ? 3 : 1);
}
/** `carried-row --row <R17B id> --orig <Run 17 block> --from <file of the block's new record lines>` (S7-helpers fixer F6): prints the R17B row line, bumps nothing. */
function carriedRow(a: Args): void {
  const t = readFileSync(outsideRepo(need(a, "from")), "utf8");
  say(carriedRowLine(need(a, "row"), need(a, "orig"), t.split(/\r?\n/)));
}
/** `state-compat [--file <state.json>]` (S4-live fixer 2): adds the keys s9.ts needs to the state.json s11.ts wrote (stateCompat); prints key names only. */
function stateCompatCmd(a: Args): void {
  const f = outsideRepo(a.opts.file ?? join(S11_OUT, "state.json"));
  if (!existsSync(f)) return say("STATECOMPAT no state.json (nothing to do)");
  const j = JSON.parse(readFileSync(f, "utf8")) as unknown;
  if (typeof j !== "object" || j === null || Array.isArray(j)) stop("state.json is not a JSON object");
  const r = stateCompat(j as Record<string, unknown>);
  if (r.added.length) writeFileSync(f, JSON.stringify(r.state, null, 2));
  say(r.added.length ? `STATECOMPAT added ${r.added.join(",")}` : "STATECOMPAT nothing missing");
}
/** RD-DL-HOP's RECORD line: `dl-record --hop a,b,c --err a,b,c [--rd3 <ms>]`. */
function dlRecord(a: Args): void {
  const list = (k: string): number[] => (a.opts[k] ?? "").split(",").filter(Boolean).map((x) => (/^\d+$/.test(x) ? Number(x) : stop(`--${k} is a list of whole numbers`)));
  say(dlHopRecord(list("hop"), list("err"), a.opts.rd3 === undefined ? undefined : int(a, "rd3")));
}

// ── H5: the SDK subcommands (back, forward, history, filetab, socket, race, devt, up6, raw) ─────────────────────────
// These connect with the SDK the way recipes/s11.ts does (client `s11b-<sub>`, failureReports off, the SDK's own token source,
// tab keys from $S11_OUT/state.json then $S9_OUT/state.json, handles `T<n>` as they are). s11.ts is NOT imported at load (its
// top-level imports pull the SDK and its helpers are mostly not exported): the SDK and s11.ts's `toPage` load lazily inside these
// subcommands only, so every other subcommand and the tests stay SDK-free. Nothing here prints a URL, path, hash, pattern or
// token: paths are counted, never shown; a message is shown only when it is one of the sheet's own texts.
// Signals (the PowerShell driver's contract, files in $S11_OUT; a `.ready` file holds the epoch ms it was written at):
//   race    `UP-RACE-A.ready` (T0), then the paced loop; `UP-RACE-A-loop-done.ready`; waits `UP-RACE-A.pressed`; then reads
//           `UP-RACE-A.press` (epoch ms of the OFF title, written by the driver BEFORE `.pressed`; absent = NOT MEASURED).
//   devt    `UP-DEVT.ready` -> driver sends F12 -> `UP-DEVT.pressed`; control evaluate + upload; `UP-DEVT-done.ready` -> F12
//           again -> `UP-DEVT-done.pressed`; control 2.
//   up6/raw refusal steps, one banner window per call: `<id>-sample.ready` -> sampler starts -> `<id>-sample.pressed`; 500 ms quiet;
//           the call; 2 500 ms quiet; `<id>-sampled.ready` -> the sampler's tail -> `<id>-sampled.pressed` = seen | none.
//           id = `R17-UP-6-<step>` (outside, missing, relative, raw-dotdot, raw-notarget) or the row id (F-RAW, F-RAW-2, F-RAW-DIR).
//           `--no-sampler` skips the handshake (offline only): the banner clause is then NOT MEASURED.
//   `--dry` on any of them parses and prints `PLAN <sub> ok ...` without connecting.
type Bc = import("@bridge/sdk").BridgeClient;
type SdkTab = import("@bridge/sdk").Tab;
type Obs17 = { code: string; message: string; data?: unknown };
const S11_OUT = process.env.S11_OUT?.trim() || join(process.env.TEMP ?? tmpdir(), "bridge-e2e", "s11");
const S9_OUT = process.env.S9_OUT?.trim() || join(process.env.TEMP ?? tmpdir(), "bridge-e2e", "s9");
const WAVE = join(S11_OUT, "wave");
const ROOT = join(WAVE, "root");
export interface S11State { sentinel: string; tabs: Record<string, string>; files: Record<string, FileWant & { where: "root" | "sentinel" | "outside" }> }
function s11State(): S11State {
  const f = join(S11_OUT, "state.json");
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as S11State) : stop("no state.json for the s11 wave");
}
function handleOf(key: string): string {
  if (/^T\d+$/.test(key)) return key;
  for (const f of [join(S11_OUT, "state.json"), join(S9_OUT, "state.json")]) {
    try {
      const h = (JSON.parse(readFileSync(f, "utf8")) as { tabs?: Record<string, string> }).tabs?.[key];
      if (h) return h;
    } catch {
      /* try the next state file */
    }
  }
  return stop(`no tab "${key}" in the state files`);
}
const filePath = (s: S11State, name: string): string => {
  const f = s.files[name] ?? stop(`no wave file ${name}`);
  return win32.normalize(join(f.where === "root" ? ROOT : f.where === "outside" ? join(WAVE, "outside") : join(ROOT, s.sentinel), name));
};
const rowOpt = (a: Args, ok: readonly string[]): string => (ok.includes(a.opts.row ?? "") ? a.opts.row! : stop(`${a.cmd} --row is one of ${ok.join(", ")}`));

let sdkMod: typeof import("@bridge/sdk") | undefined;
const ledger: CallSpan[] = [];
async function session<T>(name: string, fn: (c: Bc, claim: (h: string) => Promise<SdkTab>) => Promise<T>): Promise<T> {
  sdkMod = await import("@bridge/sdk");
  const c = await sdkMod.connect({ name, failureReports: false });
  const held: SdkTab[] = [];
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
/** A bridge call recorded in the ledger (the banner window's "no other call in flight" check reads it). */
async function bcall(c: Bc, method: string, params?: Record<string, unknown>, timeoutMs = 60_000): Promise<unknown> {
  const span = { start: Date.now(), end: Infinity };
  ledger.push(span);
  try {
    return await c.call(method, params, { timeoutMs });
  } finally {
    span.end = Date.now();
  }
}
async function attempt<T>(fn: () => Promise<T>): Promise<{ err?: Obs17; value?: T; ms: number }> {
  const t0 = Date.now();
  try {
    return { value: await fn(), ms: Date.now() - t0 };
  } catch (e) {
    if (sdkMod && e instanceof sdkMod.BridgeError) return { err: { code: String(e.code), message: e.message, data: e.data }, ms: Date.now() - t0 };
    throw e;
  }
}
const KNOWN_TEXTS = new Set<string>(Object.values(K17).map((k) => k.message));
/** `ok` or `CODE` plus the message only when it is one of the sheet's texts (else its length): a message can carry a URL. */
export const answerText = (err: Obs17 | undefined): string =>
  err ? `${err.code}${KNOWN_TEXTS.has(err.message) ? ` "${err.message}"` : ` <message len=${err.message.length}>`}${err.data === undefined ? "" : " +data"}` : "ok";
const asReply = (err: Obs17 | undefined): Reply => (err ? { code: err.code, message: err.message, ...(err.data === undefined ? {} : { data: err.data as Record<string, unknown> }) } : "ok");

const ev = async (c: Bc, tab: string, expr: string): Promise<unknown> => {
  const env = (await bcall(c, "evaluate", { tab, expression: `return (${expr});`, timeoutMs: 15_000 }, 20_000)) as { kind?: string; value?: unknown };
  return env?.kind === "json" ? env.value : undefined;
};
const resetPage = (c: Bc, h: string): Promise<unknown> => ev(c, h, "(window.__s11.reset(), true)");
async function readPage(c: Bc, h: string, id?: string): Promise<PageObs> {
  const { toPage } = await import("./s11.js");
  const t0 = Date.now();
  for (;;) {
    const st = (await ev(c, h, "window.__s11 ? window.__s11.state() : null")) as Parameters<typeof toPage>[0] | null | undefined;
    if (st && st.pending === 0) return toPage(st, id);
    if (Date.now() - t0 > 30_000) return stop("the page's reporter is missing or still reading files");
    await sleep(100);
  }
}

// signals
export interface WinIo { signal(name: string, content?: string): void; pressed(name: string, ms: number): Promise<string>; sleep(ms: number): Promise<void>; now(): number }
export const realIo: WinIo = {
  signal(name, content) {
    mkdirSync(S11_OUT, { recursive: true });
    rmSync(join(S11_OUT, `${name}.pressed`), { force: true });
    const f = join(S11_OUT, `${name}.ready`);
    writeFileSync(`${f}.tmp`, content ?? new Date().toISOString());
    renameSync(`${f}.tmp`, f); // atomic: the driver never reads a created-but-empty file
  },
  async pressed(name, ms) {
    const f = join(S11_OUT, `${name}.pressed`);
    for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(50)) {
      if (existsSync(f) && readFileSync(f, "utf8").trim()) return readFileSync(f, "utf8").trim();
    }
    return stop(`the driver did not act for ${name} within ${ms / 1000} s`);
  },
  sleep,
  now: () => Date.now(),
};
export interface Windowed<T> { v: T; banner: boolean | null; violations: number; callAt: number; replyAt: number }
/** One call inside the banner window: 500 ms quiet before, 2 500 ms after the reply; `io` null = no sampler (banner null). */
export async function windowed<T>(io: WinIo | null, id: string, spans: CallSpan[], fn: () => Promise<T>): Promise<Windowed<T>> {
  const now = io?.now ?? Date.now;
  if (io) {
    io.signal(`${id}-sample`);
    await io.pressed(`${id}-sample`, 120_000);
    await io.sleep(WINDOW_BEFORE_MS);
  }
  const before = spans.length;
  const callAt = now();
  const v = await fn();
  const replyAt = now();
  const own = spans.length;
  if (io) await io.sleep(WINDOW_AFTER_MS);
  const others = [...spans.slice(0, before), ...spans.slice(own)];
  const violations = windowViolations(others, callAt, replyAt) + Math.max(0, own - before - 1);
  let banner: boolean | null = null;
  if (io) {
    io.signal(`${id}-sampled`);
    banner = (await io.pressed(`${id}-sampled`, 30_000)) === "seen";
  }
  return { v, banner, violations, callAt, replyAt };
}
const mkio = (a: Args): WinIo | null => (a.flags.includes("--no-sampler") ? null : realIo);

/** The clause verdict of one refusal step: exact error, untouched page, no banner, nothing else in the window. */
export function refusalStepJudge(label: string, err: Obs17 | undefined, want: K17Error, page: PageObs, w: { banner: boolean | null; violations: number }): J17 {
  const e = judgeErr17(err, want, label);
  if (!e.pass) return e;
  const p = refusalPageJudge(page);
  if (!p.pass) return j17(false, `${label}: ${p.why}`);
  if (w.violations > 0) return j17(false, `${label}: ${w.violations} other bridge call(s) inside the banner window`);
  if (w.banner === true) return j17(false, `${label}: banner seen`);
  if (w.banner === null) return j17(false, `${label}: the banner window was not sampled`, { notMeasured: true });
  return j17(true, `${label}: exact, page untouched, no banner`);
}
const checkLine = (id: string, j: J17): string => row17Line(id, j).replace(/^ROW /, "CHECK ");
/** The worst of the clause verdicts (a failure over NOT MEASURED), printed as the row. */
export function worst(js: readonly J17[]): J17 {
  return js.find((j) => !j.pass && !j.notMeasured && !j.nd) ?? js.find((j) => !j.pass) ?? j17(true, "every clause holds");
}
const finalRow = (id: string, js: readonly J17[]): void => judged(id, worst(js));
const dry = (a: Args, text: string): boolean => {
  if (!a.flags.includes("--dry")) return false;
  say(`PLAN ${a.cmd} ok ${text}`);
  return true;
};

/** The handles this wave's helpers opened: `opened` of the s11 and s9 state files (the activation guard's list). */
function openedHandles(): string[] {
  const out: string[] = [];
  for (const f of [join(S11_OUT, "state.json"), join(S9_OUT, "state.json")]) {
    try {
      const o = (JSON.parse(readFileSync(f, "utf8")) as { opened?: unknown }).opened;
      if (Array.isArray(o)) out.push(...o.filter((x): x is string => typeof x === "string"));
    } catch {
      /* no such state file */
    }
  }
  return out;
}

// back / forward / history
const HISTORY_ROWS = ["RD-BACK", "RD-FWD", "RD-BACK-SAMEDOC", "RD-BACK-EMPTY", ...R17B_ROWS] as const;
async function historyCall(a: Args, op: "back" | "forward"): Promise<void> {
  const row = rowOpt(a, HISTORY_ROWS);
  const tabKey = need(a, "tab");
  const times = a.opts.times === undefined ? 1 : int(a, "times");
  if (times < 1 || times > 2) stop("--times is 1 or 2");
  if (dry(a, `row=${row} op=${op} times=${times}`)) return;
  await session(`s11b-${op}`, async (_c, claim) => {
    const tab = await claim(handleOf(tabKey));
    let last: { err?: Obs17; ms: number } = { ms: 0 };
    const allMs: number[] = []; // S7-helpers fixer F5: R17B-ACT-CTL judges every call's reply time
    let lastStart = 0;
    for (let i = 1; i <= times; i++) {
      lastStart = Date.now();
      last = await attempt(() => (op === "back" ? tab.back() : tab.forward()));
      allMs.push(last.ms);
      say(latLine(times > 1 && i < times ? `${row}-${i}` : row, last.ms));
      say(`ANSWER ${row}${times > 1 ? ` #${i}` : ""} ${answerText(last.err)}`);
      // S7-helpers H1 (#311): on an activated set-up with no redirect a refusal is a STOP, also the first call of a pair.
      if (last.err && isR17bRow(row) && strictCall(row, i, times)) return judged(row, refusedStop(row, last.err.code));
      if (i < times && last.err) return judged(row, j17(false, `the first ${op} did not answer ok`));
    }
    say(histReplyLine(row, !last.err ? "ok" : last.err.code === K17["K-tab"].code && last.err.message === K17["K-tab"].message ? "K-tab" : last.err.code, allMs, last.ms, lastStart));
    say(recordLine(row, { answer: last.err ? last.err.code : "ok", "reply-ms": Math.round(last.ms), "status-after": "NOT MEASURED (the SDK exposes no tab status)" }));
    const reply = asReply(last.err);
    const r17bKind = !last.err ? "ok" : last.err.code === K17["K-tab"].code && last.err.message === K17["K-tab"].message ? "K-tab" : last.err.code;
    const opt = (k: string): number | undefined => (a.opts[k] === undefined ? undefined : int(a, k));
    if (row === "R17B-BACK-NOACT") return judged(row, judgeR17bRow(row, { kind: r17bKind, ms: last.ms, rulesAfter: null }));
    if (a.opts["rules-after"] === undefined) return;
    const rules = int(a, "rules-after");
    if (isR17bRow(row)) return judged(row, judgeR17bRow(row, { kind: r17bKind, ms: msForJudge(row, allMs), rulesAfter: rules, blocked: opt("blocked"), flipTotal: opt("flip-total") }));
    if (row === "RD-BACK" || row === "RD-FWD") judged(row, judgeHistory({ blocked: int(a, "blocked"), flipTotal: int(a, "flip-total"), replyMs: last.ms, answer: reply, rulesAfter: rules }));
    else if (row === "RD-BACK-SAMEDOC") judged(row, judgeSamedoc({ replyMs: last.ms, answer: reply, rulesAfter: rules }));
    else judged(row, rules !== 0 ? j17(false, `RULES ${rules} after the reply`, { stop: true }) : reply === "ok" ? j17(true, "ok, as before Step 11b") : j17(false, `answer ${reply.code}, not ok`));
  });
}
async function history(a: Args): Promise<void> {
  const kind = need(a, "kind") as HistoryKind;
  if (!["back", "fwd", "samedoc", "empty", "p3"].includes(kind)) stop("--kind is back, fwd, samedoc, empty or p3");
  const activate = a.flags.includes("--activate");
  if (activate && !isActLabel(a.opts.label)) stop("history --activate needs --label <word>");
  const plan = historyPlan(kind, a.opts.tag);
  if (dry(a, `kind=${kind} navigations=${plan.urls.length} backs=${plan.backs}${activate ? ` activate=yes label=${a.opts.label}` : ""}`)) return;
  const tabKey = need(a, "tab");
  histStep = "connect"; // S4-live fixer 4: an unexpected STOP names the build step it met
  await session("s11b-history", async (c, claim) => {
    histStep = "claim";
    const tab = await claim(handleOf(tabKey));
    let navs = 0;
    let activated = 0;
    const opened = activate ? openedHandles() : [];
    for (const [i, u] of plan.urls.entries()) {
      histStep = `navigate ${i + 1}`;
      await tab.navigate(u); // no wait added: the navigate handler answers only after the load (handlers/navigate.ts waitForLoad)
      navs++;
      if (activate) {
        // S7-helpers H1 (#308): `evaluate 1` right after each load, on a wave fixture page the helper opened (the guard runs first).
        histStep = `activate ${i + 1}`;
        await guardedActivate({
          handle: tab.handle,
          url: (await c.tabs()).find((r) => r.handle === tab.handle)?.url,
          opened,
          stop: (m) => new Stop(m),
          activate: async () => {
            await ev(c, tab.handle, "1");
            activated++;
          },
        });
      }
    }
    for (let i = 0; i < plan.backs; i++) {
      histStep = `back ${i + 1}`;
      try {
        await tab.back();
      } catch (e) {
        // S4-live fixer 5: a set-up back's BridgeError is recorded (labels only), the build NOT BUILT and exit 3; else a STOP.
        // Under --activate a refused set-up back is a STOP (rethrown), never NOT BUILT (S7-helpers H1, section 4.25).
        const nb = histSetupBackOutcome(e, activate, { kind, step: histStep, ctx: stopCtx(a), known: KNOWN_TEXTS });
        if (!nb) throw e;
        const row = await c.tabs().then((rs) => histDiagRow17(plan, `http://127.0.0.1:8081/e2e-playground.html?s11b=${tabKey}`, rs.find((r) => r.handle === tab.handle)?.url), () => "unread");
        say(`HISTDIAG ${kind} row=${row} navigations=${navs} backs-done=${i}`);
        say(nb);
        histStep = undefined;
        bump(3);
        return;
      }
      // S4-live fixer 4b: goBack answers before its load (handlers/history.ts) and no read exposes a load status
      // (listTabs rows and TabInfo carry none), so wait until the tab's own row shows the entry the back lands on,
      // then a fixed settle for commit → complete; compared here, never printed.
      const want = historyBackTarget(plan, i + 1);
      const ok = await pollUntil17(async () => sameUrl17((await c.tabs()).find((r) => r.handle === tab.handle)?.url ?? "", want), { timeoutMs: HIST_WAIT_MS, everyMs: HIST_POLL_MS, now: Date.now, sleep });
      if (!ok) throw new Stop(`history set-up at=back ${i + 1}: the tab did not reach its history entry within ${HIST_WAIT_MS} ms`);
      await sleep(HIST_SETTLE_MS);
    }
    histStep = undefined;
    say(`HISTORY ${kind} built navigations=${plan.urls.length} backs=${plan.backs}`);
    if (activate) {
      say(histLine(a.opts.label!, navs, activated));
      say(actLine(a.opts.label!, activated));
    }
  });
}

// filetab: F-FILETAB's hidden row from the SDK's tab list (S4-helpers fixer 3, m3-2). Prints the TABSHIDDEN labels and the ROW only.
export function reportFileTabRows(rows: readonly FileTabListRow[]): void {
  const r = judgeFileTabHidden(rows);
  say(r.line);
  judged("F-FILETAB tabs hidden row", r.verdict);
}
// rd2-row (S7-helpers fixer 3, M1): R17B-RD-2's `r2` row of the SDK's tab list, found by its handle. Prints the TABROW line only (labels and
// counts, never a URL, title or handle); a key with no handle or a failed read prints an unreadable line, never a STOP. Bumps nothing.
async function rd2Row(a: Args): Promise<void> {
  const key = need(a, "tab");
  if (dry(a, "reads the tab list; prints the r2 row's hidden label only")) return;
  let h: string | null = null;
  try {
    h = handleOf(key);
  } catch {
    h = null;
  }
  let rows: { handle: string; hidden?: string }[] | null = null;
  try {
    rows = await session("s11b-rd2row", async (c) => (await c.tabs()).map((t) => ({ handle: t.handle, ...(t.hidden === undefined ? {} : { hidden: t.hidden }) })));
  } catch {
    rows = null;
  }
  say(rd2TabRowLine("R17B-RD-2", rows, h));
}
async function filetab(a: Args): Promise<void> {
  if (dry(a, "reads the tab list; prints labels and counts only")) return;
  await session("s11b-filetab", async (c) => reportFileTabRows(await c.tabs()));
}

// socket
async function socket(a: Args): Promise<void> {
  const forMs = int(a, "for");
  const sigFile = a.opts["signal-file"];
  if (dry(a, `for=${forMs} every=250 signal=${sigFile ? "yes" : "no"}`)) return;
  await session("s11b-socket", async (c) => {
    const samples: boolean[] = [];
    const t0 = Date.now();
    for (let i = 0; Date.now() - t0 < forMs && !(sigFile && existsSync(sigFile)); i++) {
      const st = (await c.call("daemon.status")) as { extensionConnected?: boolean };
      samples.push(st?.extensionConnected === true);
      await sleep(Math.max(0, t0 + (i + 1) * 250 - Date.now()));
    }
    say(socketLine(samples));
    if (a.opts.calls !== undefined && a.opts["calls-ok"] !== undefined && a.opts["rules-after"] !== undefined) {
      return judged("RD-DL-SOCKET", judgeSocket({ samples, callsOk: int(a, "calls-ok"), calls: int(a, "calls"), rulesAfter: int(a, "rules-after") }));
    }
    const all = samples.length > 0 && samples.every(Boolean);
    judged("RD-DL-SOCKET (samples only)", samples.length === 0 ? j17(false, "no connection sample", { notMeasured: true }) : all ? j17(true, `all ${samples.length} samples connected`) : j17(false, "a sample read not connected"));
  });
}

// race
/** The race loop's end: Run 17b's rule, or with `--to-cap` (R18-UP-RACE-A) the cap alone. */
export const raceLoopDone = (toCap: boolean, outcomes: readonly string[]): boolean => (toCap ? outcomes.length >= RACE_MAX_CALLS : raceDone17(outcomes));
async function race(a: Args): Promise<void> {
  const id = "UP-RACE-A";
  if (dry(a, `id=${id} spacing=${RACE_SPACING_MS} calls=${RACE_MIN_CALLS}..${RACE_MAX_CALLS}`)) return;
  const s = s11State();
  const h = handleOf("ra");
  await session("s11b-race", async (c, claim) => {
    const tab = await claim(h);
    await resetPage(c, h);
    const paths = [filePath(s, "s11-1k.bin"), filePath(s, "s11-sent.bin")];
    const calls: RaceCall[] = [];
    const errs: Array<Obs17 | undefined> = [];
    const T0 = Date.now();
    realIo.signal(id, String(T0));
    while (!raceLoopDone(a.flags.includes("--to-cap"), calls.map((x) => x.outcome))) {
      const n = calls.length + 1;
      await sleep(Math.max(0, T0 + raceDue(n) - Date.now()));
      const start = Date.now() - T0;
      const r = await attempt(() => tab.upload({ css: "#up-single" }, paths[(n - 1) % 2]!));
      const x = { n, start, reply: Date.now() - T0, outcome: r.err ? r.err.code : "ok" };
      calls.push(x);
      errs.push(r.err);
      say(callLine(x));
    }
    realIo.signal(`${id}-loop-done`, String(T0 + calls[calls.length - 1]!.reply)); // the last reply's epoch ms: R18's ON press is timed from it
    await realIo.pressed(id, 180_000);
    const pf = join(S11_OUT, `${id}.press`);
    const page = await readPage(c, h, "up-single");
    say(recordLine(id, { "page-files": page.files.length }));
    if (!existsSync(pf) || !/^\d+$/.test(readFileSync(pf, "utf8").trim())) return judged(id, j17(false, "the driver's press record (UP-RACE-A.press) is missing", { notMeasured: true }));
    const p = Number(readFileSync(pf, "utf8").trim()) - T0;
    say(`RACE P=${p} ms from ready; calls=${calls.length}`);
    const inexact = errs.map((e, i) => (e ? judgeErr17(e, K17["K-disarmed"], `call ${i + 1}`) : undefined)).find((j) => j && !j.pass);
    const marks = page.markAdded === page.markRemoved && page.carriersLeft === 0 ? j17(true, "marks paired, 0 left") : j17(false, `marks added ${page.markAdded}, removed ${page.markRemoved}, ${page.carriersLeft} left`);
    const r = judgeRaceA(calls, p);
    if (r.record) say(r.record);
    finalRow(id, [inexact ?? j17(true, "every refusal exact"), marks, r.verdict]);
  });
}

const sliceOf = (a: Args): Slice => {
  const s = need(a, "slice");
  return isSlice(s) ? s : stop("--slice is liveA18 or liveB18");
};

// devt
async function devt(a: Args): Promise<void> {
  if (dry(a, "id=UP-DEVT controls=2")) return;
  const devtSlice = a.opts.slice === undefined ? undefined : sliceOf(a); // S12: --slice and --row are validated before any call
  const devtRow = a.opts.row === undefined ? "R17-UP-DEVT" : rowOpt(a, ["R17-UP-DEVT", "R18-UP-DEVT"]);
  const s = s11State();
  const h = handleOf("x");
  await session("s11b-devt", async (c, claim) => {
    const tab = await claim(h);
    await resetPage(c, h);
    realIo.signal("UP-DEVT");
    await realIo.pressed("UP-DEVT", 120_000);
    const control = (): ReturnType<typeof attempt> => attempt(() => bcall(c, "evaluate", { tab: h, expression: "return (1);", timeoutMs: 15_000 }, 20_000));
    const ctl1 = await control();
    const up = await attempt(() => tab.upload({ css: "#up-single" }, filePath(s, "s11-1k.bin")));
    realIo.signal("UP-DEVT-done");
    await realIo.pressed("UP-DEVT-done", 120_000);
    const ctl2 = await control();
    const page = await readPage(c, h);
    say(`ANSWER UP-DEVT control1 ${answerText(ctl1.err)}`);
    say(`ANSWER UP-DEVT upload ${answerText(up.err)}`);
    say(`ANSWER UP-DEVT control2 ${answerText(ctl2.err)}`);
    if (devtSlice !== undefined) for (const l of devtLines(devtSlice, ctl1.err?.code ?? "ok", ctl2.err?.code ?? "ok")) say(l); // S12: --slice adds the DEVT lines
    finalRow(devtRow, devtJudges(ctl1.err, up.err, ctl2.err, page));
  });
}
/**
 * R18-BANNER-CTL's actors (S12): `bannerctl --leg neg|pos [--tab T<n>]` runs ONE banner window through the banner rows' handshake
 * (`R18-BANNER-CTL-<leg>-sample` / `-sampled`). neg: no session, no bridge call. pos: one `evaluate` of 1 on --tab, then
 * `ANSWER R18-BANNER-CTL pos <ok|CODE>`. `bannerctl-judge --slice S --idle-ms N --neg-polls N --neg-banner B --pos-answer A --pos-polls N
 * --pos-banner B` prints the three lines; `console-line --slice S --file <capture>` prints the CONSOLE line.
 */
async function bannerctl(a: Args): Promise<void> {
  const leg = need(a, "leg");
  if (leg !== "neg" && leg !== "pos") stop("--leg is neg or pos");
  if (dry(a, `leg=${leg}`)) return;
  const id = `R18-BANNER-CTL-${leg}`;
  if (leg === "neg") {
    const r = await windowed(realIo, id, ledger, async () => undefined);
    say(`CHECK bannerctl-neg violations=${r.violations}`);
    return;
  }
  const h = handleOf(need(a, "tab"));
  await session("s12-bannerctl", async (c, claim) => {
    await claim(h);
    const r = await windowed(realIo, id, ledger, () => attempt(() => bcall(c, "evaluate", { tab: h, expression: "1", timeoutMs: 15_000 }, 20_000)));
    say(`CHECK bannerctl-pos violations=${r.violations}`);
    say(`ANSWER R18-BANNER-CTL pos ${r.v.err?.code ?? "ok"}`); // the answer is the call's own; the CHECK line above carries the violations (the judge FAILs on > 0)
  });
}
function bannerctlJudge(a: Args): void {
  const seen = (k: string): "seen" | "none" => (a.opts[k] === "seen" ? "seen" : a.opts[k] === "none" ? "none" : stop(`--${k} is seen or none`));
  const c = { idleMs: int(a, "idle-ms"), neg: seen("neg-banner"), pos: seen("pos-banner"), posAnswer: need(a, "pos-answer"), negPolls: int(a, "neg-polls"), posPolls: int(a, "pos-polls"), violations: int(a, "violations") };
  const ls = bannerCtlLines(sliceOf(a), c);
  for (const l of ls) say(l);
  bump(ls[2]!.includes(" PASS ") ? 0 : 1);
}
/** One raw call of R18-UP-L1 as `S11 l1` judges it (K-gate and a refusal page), printed with the same CHECK line and, beside it, the call's own `RAW` line. */
export async function l1Step(label: string, err: Obs17 | undefined, page: PageObs): Promise<{ lines: string[]; j: Judged }> {
  const { all } = await import("./s11.js");
  const j = all([judgeError(err, "K-gate"), refusalPageJudge(page)]);
  return { lines: [checkLine11(`UP-L1 ${label}`, j), rawLine("R18-UP-L1", label, err, K17)], j };
}
/**
 * `raw-l1`: R18-UP-L1's whole raw-call step, in place of `S11 l1` (run `S11 foundcheck` first): the `daemon.status.build` check, then ONE
 * `raw-root` (no target) and ONE `raw-outside` (`#up-single`, `s11-out.bin`) call, each with `S11 l1`'s CHECK and its `RAW` line, then `ROW UP-L1`.
 * A failing step (an allowed upload included) is a STOP, as in `S11 l1`.
 */
async function rawL1(a: Args): Promise<void> {
  if (dry(a, "calls=2")) return;
  const s = s11State();
  const h = handleOf("l1");
  await session("s12-rawl1", async (c, claim) => {
    await claim(h);
    const v = await rawL1Run(c, h, s, createHash("sha256").update(readFileSync(join(REPO, "daemon", "dist", "index.js"))).digest("hex"));
    bump(v.pass ? 0 : 1);
    if (!v.pass) stop("UP-L1 failed: any FAIL here is a STOP");
  });
}
/** The call and check sequence of `raw-l1` (the client and the build sha are injected, so a test feeds a fake): prints every line, returns the row's verdict. */
export async function rawL1Run(c: Bc, h: string, s: S11State, distSha: string): Promise<Judged> {
  const { all } = await import("./s11.js");
  sdkMod ??= await import("@bridge/sdk");
  const st = (await c.call("daemon.status")) as { build?: string };
  const j = [buildJudge(String(st.build), distSha)];
  say(checkLine11("UP-L1 build", j[0]!));
  const calls: Array<[string, boolean, string]> = [["raw-root", false, "s11-1k.bin"], ["raw-outside", true, "s11-out.bin"]];
  for (const [label, target, name] of calls) {
    await resetPage(c, h);
    const r = await attempt(() => bcall(c, "uploadFiles", { tab: h, ...(target ? { locator: { css: "#up-single" } } : {}), paths: [filePath(s, name)] }));
    const x = await l1Step(label, r.err, await readPage(c, h));
    for (const l of x.lines) say(l);
    j.push(x.j);
  }
  const v = all(j);
  say(rowLine11("UP-L1", v));
  return v;
}
/** `leg-line --row R --leg L --from <file of the leg's record lines>`: the leg's verdict is the aggregate of its own ROW lines (none = NOT MEASURED). */
function legLineCmd(a: Args): void {
  const g = aggregateRows(lines(outsideRepo(need(a, "from"))));
  say(legLine(need(a, "row"), need(a, "leg"), g.verdict === "PASS" ? "PASS" : g.verdict === "FAIL" || g.verdict === "STOP" ? "FAIL" : "NOT MEASURED"));
}
/** `rows18 --from <file>`: WARN per ROW printed twice for one id and slice; the counted verdict (a CHECK line). */
function rows18(a: Args): void {
  const g = aggregateRows(lines(outsideRepo(need(a, "from"))));
  for (const w of g.warns) say(w);
  say(`CHECK rows n=${g.n} verdict=${g.verdict}`);
}
function consoleLineCmd(a: Args): void {
  const f = outsideRepo(need(a, "file"));
  say(consoleLine(sliceOf(a), f.split(/[\\/]/).pop()!, readFileSync(f, "utf8")));
}
/** R17-UP-DEVT: control 1 must be K-devt (else NOT MEASURED "DevTools was not attached"), the upload K-devt with the mark added then removed, control 2 ok. */
export function devtJudges(ctl1: Obs17 | undefined, up: Obs17 | undefined, ctl2: Obs17 | undefined, page: PageObs): J17[] {
  if (!judgeErr17(ctl1, K17["K-devt"], "control 1").pass) return [j17(false, "DevTools was not attached", { notMeasured: true })];
  const pg = refusalPageJudge(page, "set-and-removed");
  return [judgeErr17(up, K17["K-devt"], "upload"), j17(pg.pass, pg.why), ctl2 ? j17(false, "control 2 was refused") : j17(true, "control 2 ok")];
}

// up6 and raw: refusal steps, one banner window each
const UP6 = [
  { step: "outside", key: "K-gate" }, { step: "missing", key: "K-missing" }, { step: "relative", key: "K-relative" },
  { step: "raw-dotdot", key: "K-gate" }, { step: "raw-notarget", key: "K-notarget" },
] as const;
async function up6(a: Args): Promise<void> {
  if (dry(a, `steps=${UP6.length} window=-${WINDOW_BEFORE_MS}..+${WINDOW_AFTER_MS}`)) return;
  const s = s11State();
  const h = handleOf("u6");
  const io = mkio(a);
  await session("s11b-up6", async (c, claim) => {
    const tab = await claim(h);
    const rawUp = (paths: string[], target: boolean): Promise<unknown> => bcall(c, "uploadFiles", { tab: h, ...(target ? { locator: { css: "#up-single" } } : {}), paths });
    const run: Record<string, () => Promise<unknown>> = {
      outside: () => tab.upload({ css: "#up-single" }, filePath(s, "s11-out.bin")),
      missing: () => tab.upload({ css: "#up-single" }, `${ROOT}\\s11-missing.bin`),
      relative: () => tab.upload({ css: "#up-single" }, "s11-1k.bin"),
      "raw-dotdot": () => rawUp([`${ROOT}\\..\\outside\\s11-out.bin`], true),
      "raw-notarget": () => rawUp([filePath(s, "s11-1k.bin")], false),
    };
    const js: J17[] = [];
    for (const { step, key } of UP6) {
      await resetPage(c, h);
      const w = await windowed(io, `R17-UP-6-${step}`, ledger, () => attempt(run[step]!));
      const page = await readPage(c, h);
      const j = refusalStepJudge(step, w.v.err, K17[key], page, w);
      say(checkLine(`R17-UP-6 ${step}`, j));
      js.push(j);
    }
    finalRow("R17-UP-6", js);
  });
}

const RAW_ROWS = ["F-RAW", "F-RAW-2", "F-RAW-DIR", "F-RAW-ENC", "F-RAW-OK"] as const;
/** The wave-made folder and file names inside ROOT that F-RAW-DIR / F-RAW-ENC use unless `--dir` / `--enc` say otherwise. */
export const RAW_DEFAULTS = { dir: "s11b-dir", enc: "s11b enc #%ü.bin" };
async function raw(a: Args): Promise<void> {
  const row = rowOpt(a, RAW_ROWS);
  const dirName = a.opts.dir ?? RAW_DEFAULTS.dir;
  const encName = a.opts.enc ?? RAW_DEFAULTS.enc;
  if (dry(a, `row=${row}`)) return;
  const s = s11State();
  const h = handleOf("raw");
  const refusal = row !== "F-RAW-ENC" && row !== "F-RAW-OK";
  const paths = {
    "F-RAW": [`${ROOT}\\s11-missing.bin`],
    "F-RAW-2": [filePath(s, "s11-1k.bin"), `${ROOT}\\s11-missing.bin`],
    "F-RAW-DIR": [`${ROOT}\\${dirName}`],
    "F-RAW-ENC": [`${ROOT}\\${encName}`],
    "F-RAW-OK": [filePath(s, "s11-1k.bin")],
  }[row];
  const css = row === "F-RAW-2" ? "#up-multi" : "#up-single";
  await session("s11b-raw", async (c) => {
    await resetPage(c, h);
    const w = await windowed(refusal ? mkio(a) : null, row, ledger, () => attempt(() => bcall(c, "uploadFiles", { tab: h, locator: { css }, paths })));
    const page = await readPage(c, h, refusal ? undefined : "up-single");
    say(`ANSWER ${row} ${answerText(w.v.err)}`);
    if (!refusal) {
      let want: FileWant;
      if (row === "F-RAW-OK") want = { name: "s11-1k.bin", bytes: s.files["s11-1k.bin"]!.bytes, sha256: s.files["s11-1k.bin"]!.sha256 };
      else {
        const b = readFileSync(join(ROOT, encName));
        want = { name: encName, bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") };
      }
      const u = uploadPageJudge(page, [want]);
      return judged(row, w.v.err ? j17(false, `refused: ${answerText(w.v.err)}`) : j17(u.pass, u.why));
    }
    const want = row === "F-RAW-DIR" ? k17RawDir(0) : k17RawMissing(row === "F-RAW-2" ? 1 : 0);
    const text = w.v.err ? `${w.v.err.message}\n${JSON.stringify(w.v.err.data ?? null)}` : "";
    const leaks = rawLeaks(text, [ROOT, WAVE, "s11-missing.bin", "s11-1k.bin", dirName, s.sentinel]);
    say(`LEAKS ${row} ${leaks}`);
    finalRow(row, [refusalStepJudge(row, w.v.err, want, page, w), leaks === 0 ? j17(true, "0 path occurrences in the message") : j17(false, `${leaks} path occurrence(s) in the message`)]);
  });
}

/** RD-0 (d): `foundlist --file <found block-list text>`; prints FOUNDLIST, a found list that blocks a fixture URL is a STOP. */
function foundlist(a: Args): void {
  const r = foundList(readFileSync(need(a, "file"), "utf8"));
  say(r.line);
  judged("RD-0 (d)", r.verdict);
}

// ── H8: `call` (one timed in-flight call), the typed-lines judges, `judge-history`, `judge-gap` ──────────────
const CALL_EXPECT = ["ok", "tab-or-url", "url", "disarmed"];
/** Waits for the go file (RD-5: the stored poller's signal). A cancel file ends the wait at once (m3); 60 s without either is a STOP. */
export async function awaitGo(go: string, cancel?: string, limitMs = 60_000): Promise<"go" | "cancel"> {
  for (const t0 = Date.now(); !existsSync(go); await sleep(2)) {
    if (cancel && existsSync(cancel)) return "cancel";
    if (Date.now() - t0 > limitMs) return stop(`the go signal did not come within ${Math.round(limitMs / 1000)} s`);
  }
  return "go";
}
/**
 * `call --row R --op navigate|download --url U --expect ok|tab-or-url|url|disarmed --signal <name> [--tab <key>] [--file <n>] [--go <file> [--cancel <file>]]`.
 * Connects (and claims the tab), writes `<signal>.ready` into $S11_OUT, waits for the `--go` file when given (RD-5: the stored
 * poller's signal file), then makes the call and prints `CALLT <row> start=<epoch ms> reply=<epoch ms>`, `LAT`, `ANSWER`, and the
 * `CHECK` of the answer against the sheet's text. A download that is refused must leave no file and no `.part`.
 */
async function call(a: Args): Promise<void> {
  const row = need(a, "row");
  const op = need(a, "op");
  const expect = need(a, "expect");
  const sig = need(a, "signal");
  const url = need(a, "url");
  if (!["navigate", "download"].includes(op)) stop("--op is navigate or download");
  if (!CALL_EXPECT.includes(expect)) stop(`--expect is one of ${CALL_EXPECT.join(", ")}`);
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(sig)) stop("--signal is a plain name");
  const file = a.opts.file ?? `${row.toLowerCase()}.txt`;
  if (!/^[A-Za-z0-9._-]+$/.test(file)) stop("--file takes a plain file name");
  if (op === "navigate") need(a, "tab");
  if (dry(a, `row=${row} op=${op} expect=${expect} go=${a.opts.go ? "yes" : "no"}`)) return;
  await session("s11b-call", async (c, claim) => {
    const tab = op === "navigate" ? await claim(handleOf(need(a, "tab"))) : undefined;
    const target = join(S11_OUT, "r17-dl", file);
    if (op === "download") {
      mkdirSync(dirname(target), { recursive: true });
      rmSync(target, { force: true });
      rmSync(`${target}.part`, { force: true });
    }
    realIo.signal(sig);
    if (a.opts.go && (await awaitGo(a.opts.go, a.opts.cancel)) === "cancel") {
      say(`NOT MEASURED: ${row} was cancelled before its call (the stored list never read back holding the new pattern)`);
      return bump(3);
    }
    const start = Date.now();
    const r = await attempt(() => (async (): Promise<void> => {
      if (op === "navigate") await tab!.navigate(url);
      else await sdkMod!.downloadToFile((m, p, o) => c.call(m, p, o), { url, path: target, timeoutMs: 20_000 });
    })());
    const reply = Date.now();
    say(`CALLT ${row} start=${start} reply=${reply}`);
    say(latLine(row, r.ms));
    say(`ANSWER ${row} ${answerText(r.err)}`);
    const j = judgeCallAnswer(expect, r.err, row);
    say(checkLine(row, j));
    bump(j.pass ? 0 : j.stop ? 2 : j.notMeasured || j.nd ? 3 : 1);
    if (op === "download" && expect !== "ok") {
      const none = !existsSync(target) && !existsSync(`${target}.part`);
      say(checkLine(`${row} file`, j17(none, none ? "no file written" : "a file was written")));
      bump(none ? 0 : 1);
    }
  });
}

// ── S7-helpers H2: build-proof (R17B-0 (e)) and newtab-timed (R17B-NEWTAB-LOAD) ──────────────────────────────────
/**
 * `build-proof --tabwatch <file with a TABWATCH read> [--sw <built file>] [--ref <hex commit>]`: counts the S6 names in `extension/dist/sw.js` on
 * disk, asks git whether `--ref` (default db3f82e) is an ancestor of HEAD, takes the created-url from the file's TABWATCH line, prints the
 * BUILD and S6 lines and the verdict. Any miss is a STOP before any state change; no URL or path is printed.
 */
function buildProof(a: Args): void {
  const ref = a.opts.ref ?? S6_COMMIT;
  if (!/^[0-9a-f]{7,40}$/.test(ref)) stop("--ref is a hex commit id");
  const sw = a.opts.sw ?? join(REPO, "extension", "dist", "sw.js");
  if (!existsSync(sw)) stop("the built file extension/dist/sw.js is missing (npm run build)");
  const names = countS6Names(readFileSync(sw, "utf8"));
  const g = spawnSync("git", ["merge-base", "--is-ancestor", ref, "HEAD"], { cwd: REPO, stdio: "ignore" });
  if (g.error || (g.status !== 0 && g.status !== 1)) stop("git could not answer the ancestor question");
  const ancestor = g.status === 0;
  const tw = a.opts.tabwatch !== undefined && existsSync(a.opts.tabwatch) ? parseTabwatchLine(readDump(a.opts.tabwatch)) : null;
  const created: CreatedUrl | null = tw ? tw.createdUrl : null;
  if (created) say(buildLine(names, created));
  say(s6CommitLine(ancestor));
  judged("R17B-0 (e)(f)", judgeBuild({ names, ancestor, createdUrl: created }));
}

/** `newtab-timed --row <id> --url <fixture url> --as <key> [--blocked n --rules-after n]`: newTab, `LAT <row> <ms> ms`, then the snapshot's page class. */
async function newtabTimed(a: Args): Promise<void> {
  const row = need(a, "row");
  const url = need(a, "url");
  const key = need(a, "as");
  if (!/^[A-Za-z0-9-]{1,40}$/.test(row) || !/^[A-Za-z0-9]{1,20}$/.test(key)) stop("--row and --as are plain words");
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{4,5}\//.test(url)) stop("--url is a fixture page on loopback");
  if (dry(a, `row=${row} as=${key}`)) return;
  await session("s11b-newtab", async (c) => {
    const r = await attempt(() => c.newTab(url));
    say(latLine(row, r.ms));
    say(`ANSWER ${row} ${answerText(r.err)}`);
    const opt = (k: string): number | undefined => (a.opts[k] === undefined ? undefined : int(a, k));
    if (r.err || !r.value) return judged(row, judgeNewtabTrial({ answer: r.err?.code ?? "none", ms: r.ms, page: null }));
    const tab = r.value;
    // The same record as s9.ts `newtab --as`: the handle joins `opened`, the key names it (the activation guard and handleOf read it).
    const sf = join(S9_OUT, "state.json");
    let st = { id: "s11b", tabs: {} as Record<string, string>, opened: [] as string[], at: new Date().toISOString() };
    try {
      st = { ...st, ...(JSON.parse(readFileSync(sf, "utf8")) as typeof st) };
    } catch {
      /* no s9 state yet: a new one */
    }
    mkdirSync(S9_OUT, { recursive: true });
    writeFileSync(sf, JSON.stringify(withOpened(st, tab.handle, key), null, 2));
    const s = await attempt(() => tab.snapshot());
    const page = s.value ? pageClassOf({ url: s.value.url, title: s.value.title, elements: s.value.elements.length }) : "other";
    say(recordLine(row, { page, elements: s.value ? s.value.elements.length : 0, snapshot: s.err ? s.err.code : "ok" }));
    const nj = judgeNewtabTrial({ answer: "ok", ms: r.ms, page, blocked: opt("blocked"), rulesAfter: opt("rules-after") });
    if (nj.notMeasured && nj.why === NEWTAB_AWAITING) { say(newtabTrialLine(row, nj)); return bump(3); } // G-23: no interim NOT MEASURED ROW
    judged(row, nj);
  });
}

/** `judge-opt --kind fhome|upopt|caps --obs <json outside the repo>`: F-HOME, R17-UP-OPT, RD-CAPS-WARN's pass rules. */
function judgeOpt(a: Args): void {
  const f = resolve(need(a, "obs"));
  const rel = relative(REPO, f);
  if (!rel.startsWith("..") && !isAbsolute(rel)) stop("the observation file is inside the repo");
  const o = JSON.parse(readFileSync(f, "utf8")) as never;
  const kind = need(a, "kind");
  if (kind === "fhome") judged("F-HOME", judgeFHome(o));
  else if (kind === "upopt") judged("R17-UP-OPT", judgeUpOpt(o));
  else if (kind === "caps") judged("RD-CAPS-WARN", judgeCaps(o));
  else stop("--kind is fhome, upopt or caps");
}
/** `judge-history --row R --answer ok|K-tab|<CODE> --ms <n> [--rules-after <n>] [--blocked <n> --flip-total <n>]`. */
function judgeHistoryCmd(a: Args): void {
  const row = rowOpt(a, HISTORY_ROWS);
  const opt = (k: string): number | undefined => (a.opts[k] === undefined ? undefined : int(a, k));
  if (isR17bRow(row)) return judged(row, judgeR17bRow(row, { kind: need(a, "answer"), ms: int(a, "ms"), rulesAfter: opt("rules-after") ?? null, blocked: opt("blocked"), flipTotal: opt("flip-total") }));
  judged(row, judgeHistoryRow(row, { kind: need(a, "answer"), ms: int(a, "ms"), rulesAfter: opt("rules-after") ?? null, blocked: opt("blocked"), flipTotal: opt("flip-total") }));
}
/** `judge-gap --press <ms> --readback <ms> --call <ms>`: RD-5's `GAP` line and verdict. */
function judgeGapCmd(a: Args): void {
  const g = gapJudge(int(a, "press"), int(a, "readback"), int(a, "call"));
  say(g.line);
  judged("RD-5 gap", g.verdict);
}

export const cmds: Record<string, (a: Args) => void | Promise<void>> = {
  manifest: consoleSub,
  rules: consoleSub,
  ctx: consoleSub,
  mark: consoleSub,
  tabwatch: consoleSub,
  "r17b-clause": r17bClause,
  "carried-row": carriedRow,
  "build-proof": buildProof,
  "newtab-timed": newtabTimed,
  regex: consoleSub,
  stored,
  hits,
  ctl,
  "ctl-slow": ctlSlow,
  scan,
  foundlist,
  back: (a) => historyCall(a, "back"),
  forward: (a) => historyCall(a, "forward"),
  history,
  filetab,
  "rd2-row": rd2Row,
  socket,
  race,
  devt,
  bannerctl,
  "bannerctl-judge": bannerctlJudge,
  scan18: scan18Cmd,
  "raw-l1": rawL1,
  "leg-line": legLineCmd,
  rows18,
  "console-line": consoleLineCmd,
  up6,
  raw,
  call,
  state: stateCmd,
  "clean-console": cleanConsole,
  "redact-console": redactConsole,
  "judge-row": judgeRow,
  "dl-record": dlRecord,
  "state-compat": stateCompatCmd,
  "judge-opt": judgeOpt,
  "judge-history": judgeHistoryCmd,
  "judge-gap": judgeGapCmd,
};
export const SUBCOMMANDS: readonly string[] = Object.keys(cmds);

/** The history build's current step (fixed labels), named by an unexpected STOP; reset by `main`. */
let histStep: string | undefined;
/** The STOP's deny filter: scan's own context (token, sentinel, alias, profile); a failed read leaves the profile only. */
function stopCtx(a: Args | undefined): Scan17Ctx {
  try {
    return scanCtx(a ?? { cmd: "", pos: [], opts: {}, flags: [] }, "stop");
  } catch {
    return { token: token(), sentinel: "", profile: [homedir()] };
  }
}
export async function main(argv: readonly string[]): Promise<number> {
  code = 0;
  histStep = undefined;
  let a: Args | undefined;
  try {
    a = parseArgs(argv);
    const fn = cmds[a.cmd];
    if (!fn) stop(`unknown or missing subcommand; known: ${SUBCOMMANDS.join(", ")}`);
    await fn!(a);
  } catch (e) {
    // Never the error's message unless it is ours, a sheet text or passes scan17's deny filter; never `data` (S4-live fixer 4).
    say(`STOP: ${e instanceof Stop ? e.message : unexpectedStop17(e, { ctx: stopCtx(a), known: KNOWN_TEXTS, step: histStep })}`);
    return 2;
  }
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2)).then((c) => {
    process.exitCode = c;
  });
}

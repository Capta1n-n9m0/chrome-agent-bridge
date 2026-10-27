// Step 11b S7-helpers slice H1: pure rules of Run 17b's history helpers (docs/e2e-test-plan.md section 4.25). No I/O here.
// Written 2026-10-27 by the S7-helpers H1 builder (Claude Sonnet 5.5); NOT run against Chrome. Prints nothing itself.
import { histNotBuilt17, judgeHistory, judgeSamedoc, K17, type J17, type Reply, type Scan17Ctx } from "./s11b-rules.js";

// ===== the activation target guard (section 4.25 "Activation rule") =====
/** The STOP line, character for character. `Stop`'s message is the part after `STOP: `. */
export const ACT_STOP_MESSAGE = "activation target is not a wave fixture page";
export const ACT_STOP_LINE = `STOP: ${ACT_STOP_MESSAGE}`;
export const ACT_PORTS: readonly string[] = ["8081", "8091"];
const ACT_HOSTS: readonly string[] = ["127.0.0.1", "localhost"];

/** True only when the handle is in the helper's own `opened` list AND the URL is http on 127.0.0.1/localhost at port 8081 or 8091. */
export function isActivationTarget(handle: string, url: string | undefined, opened: readonly string[]): boolean {
  if (!handle || !opened.includes(handle) || !url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.protocol === "http:" && u.username === "" && u.password === "" && ACT_HOSTS.includes(u.hostname) && ACT_PORTS.includes(u.port);
}

/** Runs `activate` only after the guard; otherwise throws `err` (the caller passes its `Stop`) before any activation. */
export async function guardedActivate(i: { handle: string; url: string | undefined; opened: readonly string[]; activate: () => Promise<void>; stop: (m: string) => Error }): Promise<void> {
  if (!isActivationTarget(i.handle, i.url, i.opened)) throw i.stop(ACT_STOP_MESSAGE);
  await i.activate();
}

// ===== line forms (section 4.25 "Helper abbreviations") =====
export const actLine = (label: string, n: number): string => `ACT ${label} n=${n} ok`;
export const histLine = (label: string, built: number, activated: number): string => `HIST ${label} built=${built} pages activated=${activated}`;
export const ctlSlowLine = (ms: number): string => `CTL 8087 slow answered after ${Math.round(ms)} ms`;

/** `--label` of `history --activate`: the sheet's labels (act-ctl, bk, fw, sd, be), lower-case words. */
export const isActLabel = (s: string | undefined): s is string => s !== undefined && /^[a-z0-9-]{1,40}$/.test(s);

// ===== the set-up back under --activate =====
/**
 * `histNotBuilt17`'s answer, except under `--activate`: there a refused set-up back is never NOT BUILT (undefined: the caller rethrows,
 * and `main` prints the STOP line).
 */
export function histSetupBackOutcome(e: unknown, activate: boolean, o: { kind: string; step?: string; ctx: Scan17Ctx; known: ReadonlySet<string> }): string | undefined {
  return activate ? undefined : histNotBuilt17(e, o);
}

// ===== R17B-CTL =====
export const CTL_SLOW_MIN_MS = 3000;
/** R17B-CTL (8087): an answer 200 that took 3 000 ms or more; anything else is a STOP (a control missing). */
export function judgeCtlSlow(i: { status: number; ms: number }): J17 {
  if (i.status !== 200) return { pass: false, stop: true, why: `8087 answered ${i.status}, not 200` };
  return i.ms >= CTL_SLOW_MIN_MS ? { pass: true, why: `answered after ${Math.round(i.ms)} ms` } : { pass: false, stop: true, why: `answered after ${Math.round(i.ms)} ms, under ${CTL_SLOW_MIN_MS} ms` };
}

// ===== the R17B history rows =====
export const R17B_ROWS = ["R17B-ACT-CTL", "R17B-BACK", "R17B-FWD", "R17B-BACK-SAMEDOC", "R17B-BACK-EMPTY", "R17B-BACK-NOACT"] as const;
export const isR17bRow = (row: string): boolean => (R17B_ROWS as readonly string[]).includes(row);

/**
 * Call i (1-based) of `times` on this row: is a non-ok answer a STOP (the #311 clause)? ACT-CTL, SAMEDOC, EMPTY: every call.
 * FWD: the first forward of a pair only (P0 to P1, no redirect); a lone call (`--times 1`) is the second forward, judged as R17B-BACK.
 * BACK and BACK-NOACT: never.
 */
export function strictCall(row: string, i: number, times: number): boolean {
  if (row === "R17B-ACT-CTL" || row === "R17B-BACK-SAMEDOC" || row === "R17B-BACK-EMPTY") return true;
  return row === "R17B-FWD" && times === 2 && i === 1;
}
export const refusedStop = (row: string, code: string): J17 => ({ pass: false, stop: true, why: `${row}: answer ${code}, not ok on an activated set-up with no redirect` });

export interface R17bInput { kind: string; ms: number; rulesAfter: number | null; blocked?: number; flipTotal?: number }
const REPLY_MAX_MS = 12000;
/** The last call's verdict for an R17B row (`kind` is `ok`, `K-tab` or a code). RD-* rows keep their own judges. */
export function judgeR17bRow(row: string, i: R17bInput): J17 {
  if (row === "R17B-BACK-NOACT") return { pass: true, why: `recorded: answer ${i.kind}, reply ${Math.round(i.ms)} ms` };
  const answer: Reply = i.kind === "ok" ? "ok" : i.kind === "K-tab" ? K17["K-tab"] : { code: i.kind, message: "" };
  const strict = row === "R17B-ACT-CTL" || row === "R17B-BACK-SAMEDOC" || row === "R17B-BACK-EMPTY";
  if (strict && answer !== "ok") return refusedStop(row, i.kind);
  const unmeasured = i.rulesAfter === null;
  const rulesAfter = i.rulesAfter ?? 0;
  let j: J17;
  if (rulesAfter !== 0) j = { pass: false, stop: true, why: `RULES ${rulesAfter} after the reply` };
  else if (row === "R17B-BACK" || row === "R17B-FWD") j = judgeHistory({ blocked: i.blocked ?? -1, flipTotal: i.flipTotal ?? 0, replyMs: i.ms, answer, rulesAfter });
  else if (row === "R17B-BACK-SAMEDOC") j = judgeSamedoc({ replyMs: i.ms, answer, rulesAfter });
  else if (i.ms > REPLY_MAX_MS) j = { pass: false, why: `reply ${Math.round(i.ms)} ms, over ${REPLY_MAX_MS} ms` };
  else j = { pass: true, why: `ok, reply ${Math.round(i.ms)} ms` };
  return unmeasured && j.pass ? { pass: false, notMeasured: true, why: `${j.why}; RULES after the reply NOT MEASURED` } : j;
}


// ===== S7-helpers fixer: clause judges and the carried rows' R17B verdict lines =====
/** F5: R17B-ACT-CTL judges "each reply under 12 000 ms" over every call of a `--times 2` pair; the other rows judge the last call. */
export function msForJudge(row: string, allMs: readonly number[]): number {
  if (allMs.length === 0) return 0;
  return row === "R17B-ACT-CTL" ? Math.max(...allMs) : allMs[allMs.length - 1]!;
}

/** F1: R17B-NEWTAB-PLAIN's page clause from S9's own `snapshot` ROW detail (`<T> elements=<n> counter=<"text"|none>`): the playground has its counter button. */
export function snapshotPageFacts(detail: string): { elements: number; counter: boolean } | null {
  const m = /elements=(\d+) counter=(\S.*)$/.exec(detail);
  return m ? { elements: Number(m[1]), counter: m[2] !== "none" } : null;
}
export function judgeSnapshotPage(row: { code: string; message: string } | null): J17 {
  if (!row || row.code !== "ok") return { pass: false, notMeasured: true, why: "the snapshot did not answer ok" };
  const f = snapshotPageFacts(row.message);
  if (!f) return { pass: false, notMeasured: true, why: "the snapshot row holds no elements and counter facts" };
  return f.elements > 0 && f.counter ? { pass: true, why: "the snapshot shows the playground (elements and its counter)" } : { pass: false, why: "the snapshot is not the playground page (no elements or no counter)" };
}

/**
 * F2 + M1 (S7-helpers fixer 3): R17B-RD-2's "snapshot K-tab when the row is hidden, else recorded with its class", judged on the `r2` tab's
 * own row of the SDK's tab list (`client.tabs()`), found by its handle, as `judgeFileTabHidden` does; no count over every tab is read.
 */
export type Rd2RowState = "hidden" | "shown" | "unreadable";
/** A row of `client.tabs()` as the clause reads it (`hidden` set when the extension withheld the row). */
export interface Rd2TabRow { handle: string; hidden?: string }
/** The TABROW line: labels and counts only, never a handle, URL or title. `rows` null = the tab list was not read; `handle` null = no r2 key. */
export function rd2TabRowLine(label: string, rows: readonly Rd2TabRow[] | null, handle: string | null): string {
  if (!rows) return `TABROW ${label} read=failed`;
  if (!handle) return `TABROW ${label} rows=${rows.length} handle=none`;
  const own = rows.filter((r) => r.handle === handle);
  if (own.length !== 1) return `TABROW ${label} rows=${rows.length} found=${own.length === 0 ? "no" : "many"}`;
  const h = own[0]!.hidden;
  return `TABROW ${label} rows=${rows.length} found=yes hidden=${h === undefined ? "none" : h === "blocked" || h === "disarmed" ? h : "other"}`;
}
/** r2's state from the last TABROW line of `label` (bare or after an ISO time): only `found=yes hidden=blocked|none` are readable. */
export function parseTabRowLine(lines: readonly string[], label: string): Rd2RowState {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z )?TABROW ${esc} (.*)$`);
  let rest: string | undefined;
  for (const l of lines) {
    const m = re.exec(l.trim());
    if (m) rest = m[1];
  }
  const m = rest === undefined ? null : /^rows=\d+ found=yes hidden=(blocked|none)$/.exec(rest);
  return !m ? "unreadable" : m[1] === "blocked" ? "hidden" : "shown";
}
export function judgeRd2Snapshot(state: Rd2RowState, snap: { code: string; message: string } | null): J17 {
  if (state === "unreadable") return { pass: false, notMeasured: true, why: "the r2 tab's own row was not read as hidden(blocked) or not hidden" };
  if (!snap) return { pass: false, notMeasured: true, why: "no snapshot row" };
  if (state === "shown") return { pass: true, why: `the r2 row is not hidden; the snapshot is recorded (${snap.code})` };
  return snap.code === K17["K-tab"].code && snap.message === K17["K-tab"].message ? { pass: true, why: "the r2 row is hidden and the snapshot is K-tab" } : { pass: false, why: `the r2 row is hidden and the snapshot answered ${snap.code}, not K-tab` };
}

/** N1: the HISTREPLY line of `historyCall`. `ms` is the value the row is judged on (the largest of a pair for R17B-ACT-CTL); start and reply are the last call's. */
export function histReplyLine(row: string, kind: string, allMs: readonly number[], lastMs: number, lastStart: number): string {
  return `HISTREPLY ${row} kind=${kind} ms=${Math.round(msForJudge(row, allMs))} start=${lastStart} reply=${lastStart + Math.round(lastMs)}`;
}

/** F6: the R17B verdict of a carried block, derived from the block's own verdict lines (Run 17's file is not edited). */
export type CarriedVerdict = "STOP" | "FAIL" | "NOT DISCRIMINATING" | "NOT MEASURED" | "NOT RUN" | "PASS";
const CARRIED_RANK: readonly CarriedVerdict[] = ["STOP", "FAIL", "NOT DISCRIMINATING", "NOT MEASURED", "NOT RUN", "PASS"];
// S1-helpers-b (G-23): the row id may be up to three tokens (`ROW SAVE-REFUSE-R sdk-leg PASS` is one verdict line, not zero).
const VERDICT_LINE = /^(?:\S+Z )?(?:s9-win: )?ROW \S+(?: \S+){0,2}? (STOP|FAIL|NOT DISCRIMINATING|NOT MEASURED|NOT RUN|PASS|RECORD)(?=[ :]|$)/;
/** S1-helpers-b: one verdict per (row id, slice); a second `ROW` for the same id is `WARN row printed twice: <id>`, counted once (at the worse verdict). */
export function aggregateRows(lines: readonly string[]): { verdict: CarriedVerdict; n: number; warns: string[] } {
  const seen = new Map<string, number>();
  const warns: string[] = [];
  for (const l of lines) {
    const m = VERDICT_LINE.exec(l);
    if (!m) continue;
    const id = l.slice(l.indexOf("ROW ") + 4, m[0].length - m[1]!.length - 1).trim(); // everything between ROW and the verdict word
    const key = `${id}|${/ slice=([AB])\b/.exec(l)?.[1] ?? ""}`;
    const rank = CARRIED_RANK.indexOf((m[1] === "RECORD" ? "PASS" : m[1]) as CarriedVerdict);
    if (seen.has(key)) warns.push(`WARN row printed twice: ${id}`);
    seen.set(key, Math.min(seen.get(key) ?? rank, rank));
  }
  const n = seen.size;
  return { verdict: n === 0 ? "NOT MEASURED" : CARRIED_RANK[Math.min(...seen.values())]!, n, warns };
}
export function carriedVerdict(lines: readonly string[]): { verdict: CarriedVerdict; n: number } {
  let best = CARRIED_RANK.length - 1;
  let n = 0;
  for (const l of lines) {
    const m = VERDICT_LINE.exec(l);
    if (!m) continue;
    n++;
    const v = (m[1] === "RECORD" ? "PASS" : m[1]) as CarriedVerdict;
    best = Math.min(best, CARRIED_RANK.indexOf(v));
  }
  return n === 0 ? { verdict: "NOT MEASURED", n } : { verdict: CARRIED_RANK[best]!, n };
}
export function carriedRowLine(row: string, orig: string, lines: readonly string[]): string {
  const { verdict, n } = carriedVerdict(lines);
  const base = `ROW ${row} ${verdict} (as R17 ${orig.toUpperCase()}; ${n} verdict line${n === 1 ? "" : "s"}${n === 0 ? ", none printed" : ""})`;
  return row === "R17B-UP-L1" ? `${base}; its console-scan clause is judged by R17B-LOGS' SCAN line, not here` : base;
}

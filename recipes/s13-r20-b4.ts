// Step 13 S5-drivers-B4a: the actors of liveB20's rows R20-POP-BG-3, R20-POP-FG-3 and R20-POP-OTHER-3 (docs/e2e-test-plan.md section 4.28, the dated addendum of 2026-10-30, decisions #407 and #410)
// and their pure judges. The rounds are slice A's (recipes/s13-r20-a.ts popRound / prepareRound / clickGate, parametrised by `v3`, never copied); this file adds the -3 clauses: the holder text,
// the whole-capture console content check with its liveness control, the human leg's popup-opened read. Same contract as s13-r20-a.ts: sheet line forms, `LEG <row> <label> <verdict>` lines,
// exit 0 pass, 1 fail, 2 STOP (`STOPWHY <reason>`), 3 not measured. NOT run against Chrome by its author. Counts and fixed words only; a console text, a message and a name are never printed.
// The PowerShell side (recipes/s13-r20-b4.ps1) answers `<row>-<leg>-cn0` with `ok <lines> <eval>` and `<row>-<leg>-cn1` with `ok <lines> <eval> <join> <url>` (else `unread`) and the click steps as in liveA20.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { att, finish, legLine, run, say, sig, sleep, StopWhy, type Ctx, type V } from "./s12-r19-a.js";
import { clickGate, first, NAMES, peer, popRound, POPUP, sigC, U, type Peer, type Round, type Verdict20, type Who } from "./s13-r20-a.js";
type Tab = import("../sdk/src/index.js").Tab;
const WRONG = "popup-lease-wrong" as const;
const ROW_RE = /^[A-Za-z0-9][\w-]*$/, LEG_RE = /^[a-z][a-z0-9-]*$/;
// ---- the line forms (the dated addendum's `POP` form and the two CHECK forms) -------------------------------------------------------------------------
export const UNJOINED_LINE_3 = "ROW R20-POP-OTHER-3 unjoined NOT MEASURED — no unjoined tab can be made";
export const B_WINDOW_CHECK_3 = "CHECK R20-POP-OTHER-3 third b-window=W (sheet: W2)";
export interface Pop3Fields { leg: string; n: number; grantedTo: Who | "none"; inMs: number | null; others: number; heldCall: "TAB_HELD" | "ok" | "n/a"; holder: "A" | "other" | "n/a"; activeGuard: "bg" | "fg" | "n/a"; join: number | "unread"; url: number | "unread" }
const cnt = (n: number | "unread", what: string): string => {
  if (n !== "unread" && (!Number.isInteger(n) || n < 0)) throw new Error(`${what}: a count is a non-negative integer or unread`);
  return String(n);
};
export function popLine3(row: string, o: Pop3Fields): string {
  if (!ROW_RE.test(row) || !LEG_RE.test(o.leg)) throw new Error("popLine3: not a fixed row id or leg label");
  return `POP ${row} leg=${o.leg} n=${cnt(o.n, "n")} granted-to=${o.grantedTo} in-ms=${o.inMs === null ? "n/a" : cnt(o.inMs, "in-ms")} others=${cnt(o.others, "others")} held-call=${o.heldCall} holder=${o.holder} active-guard=${o.activeGuard} console-join=${cnt(o.join, "join")} console-url=${cnt(o.url, "url")}`;
}
export const recordLine3 = (row: string, leg: string, n: number | null): string => `CHECK ${row} ${leg} console-new=${n === null ? "unread" : cnt(n, "console-new")} RECORD`;
export const humanLine3 = (row: string, k: number, o: { opened: boolean; opener: "O" | "other" | "none"; grantedTo: Who | "none" }): string =>
  `CHECK ${row} human round=${k} popup-opened=${o.opened ? "yes" : "no"} opener=${o.opener} granted-to=${o.grantedTo}`;
// ---- the captures: the PowerShell side's answers (counts only) ---------------------------------------------------------------------------------------
export interface Cap3 { lines: number; evalN: number }
export interface After3 extends Cap3 { join: number; url: number }
const ints = (raw: string, n: number): number[] | null => {
  const m = new RegExp(`^ok${" (\\d{1,9})".repeat(n)}$`).exec(raw.trim());
  return m ? m.slice(1).map(Number) : null;
};
/** `ok <lines> <eval>`; anything else (the PowerShell side's `unread`, a missing or odd answer) is an unreadable capture (item 14). */
export const parseBefore = (raw: string): Cap3 | null => { const v = ints(raw, 2); return v ? { lines: v[0]!, evalN: v[1]! } : null; };
export const parseAfter = (raw: string): After3 | null => { const v = ints(raw, 4); return v ? { lines: v[0]!, evalN: v[1]!, join: v[2]!, url: v[3]! } : null; };
// ---- A's popup call: an evaluate whose expression length is unique within the slice (item 13) ------------------------------------------------------------
/** `1+0`, `1+0+0`, ...: one `+0` more per call (index 1 up). The three actors run in separate processes, so each takes its own range of indices (BASE); lengths 3, 5, ... 25 never meet
 * B's `1` (1), `window.open(...)` (over 60), R20-0B's page expressions or `(a) => a` (even length). */
export const uniqueExpr = (i: number): string => `1${"+0".repeat(i)}`;
export const BASE = { bg: 0, fg: 3, other: 6 } as const;
export const exprSeries = (base: number, count: number): string[] => Array.from({ length: count }, (_, k) => uniqueExpr(base + k + 1));
// ---- popup-opened (leg human): a tab Chrome listed after the click that no client opened (item 4) ---------------------------------------------------------
export interface Row { id?: number; tab?: string; openerTabId?: number }
export function popupRead(before: readonly Row[], after: readonly Row[], oHandle: string, own: readonly string[]): { opened: boolean; opener: "O" | "other" | "none" } {
  const seen = new Set(before.flatMap((r) => (typeof r.id === "number" ? [r.id] : [])));
  const fresh = after.filter((r) => typeof r.id === "number" && !seen.has(r.id) && !(r.tab !== undefined && own.includes(r.tab)));
  const oId = before.find((r) => r.tab === oHandle)?.id, op = fresh[0]?.openerTabId;
  return { opened: fresh.length > 0, opener: fresh.length === 0 || op === undefined ? "none" : op === oId ? "O" : "other" };
}
// ---- the judge ------------------------------------------------------------------------------------------------------------------------------------------------
export interface Pop3Judge { v: Verdict20; why?: typeof WRONG; line: string; record: string; control: boolean }
/** Order (item 12): the lease STOP; then every FAIL (a counted round's clauses, a join or URL count above 0 whatever the control reads); then too few counted rounds (a human leg with a no-popup click is NOT
 * MEASURED, else NOT DISCRIMINATING); then an unreadable after-capture or a failed liveness control (NOT MEASURED, `unread` printed for a 0 only); else PASS. Messages are never compared (item 2). */
export function judgePop3(row: string, leg: string, rounds: readonly Round[], o: { expect: "bg" | "fg"; human: boolean; before: Cap3 | null; after: After3 | null }): Pop3Judge {
  const counted = rounds.filter((r) => r.guard === o.expect && !r.preClick && (!o.human || r.r3?.popupOpened === true));
  const probed = counted.filter((r) => r.r3?.probed);
  const wrong = rounds.find((r) => (r.grantedTo !== "A" && r.grantedTo !== "none") || r.others > 0);
  const grantedTo: Who | "none" = wrong ? (wrong.grantedTo === "A" || wrong.grantedTo === "none" ? "B" : wrong.grantedTo) : counted.some((r) => r.grantedTo === "none") ? "none" : counted.length > 0 || rounds.some((r) => r.grantedTo === "A") ? "A" : "none";
  const heldOk = (r: Round): boolean => r.held === "TAB_HELD" && r.r3?.ctlHeld === true;
  const control = o.before !== null && o.after !== null && o.after.evalN > o.before.evalN;
  const hit = o.after !== null && (o.after.join > 0 || o.after.url > 0);
  const shown = (n: number | undefined): number | "unread" => (o.after === null || n === undefined || (n === 0 && !control) ? "unread" : n);
  const ms = counted.map((r) => r.inMs).filter((m): m is number => m !== null);
  const line = popLine3(row, {
    leg, n: counted.length, grantedTo, inMs: ms.length ? Math.max(...ms) : null, others: rounds.reduce((n, r) => n + r.others, 0),
    heldCall: probed.length === 0 ? "n/a" : probed.length === counted.length && probed.every(heldOk) ? "TAB_HELD" : "ok",
    holder: probed.length === 0 ? "n/a" : probed.length === counted.length && probed.every((r) => r.r3?.holder === true) ? "A" : "other",
    activeGuard: counted.length > 0 ? o.expect : (rounds[0]?.guard ?? "n/a"), join: shown(o.after?.join), url: shown(o.after?.url),
  });
  const record = recordLine3(row, leg, o.before && o.after ? Math.max(0, o.after.lines - o.before.lines) : null);
  const fin = (v: Verdict20, why?: typeof WRONG): Pop3Judge => ({ v, ...(why ? { why } : {}), line, record, control });
  if (wrong) return fin("STOP", WRONG);
  const clauseFail = counted.some((r) => r.grantedTo !== "A" || r.inMs === null || r.inMs > 1000 || !r.r3?.probed || !heldOk(r) || !r.r3.holder || !r.ownCallOk);
  if (clauseFail || hit) return fin("FAIL");
  if (counted.length < 3) return fin(o.human ? "NOT MEASURED" : "NOT DISCRIMINATING");
  return fin(o.after === null || !control ? "NOT MEASURED" : "PASS");
}
// ---- the actors -------------------------------------------------------------------------------------------------------------------------------------------------
/** The hello names of A (run() names a client `s12-r19-a-<name>`): plain ASCII, no quote or backslash (item 1). */
export const ACTOR = { bg: "popbg3", fg: "popfg3", other: "popother3" } as const;
export const holderOf = (name: string): string => `s12-r19-a-${name}`;
const listRows = async (c: Peer["c"]): Promise<Row[]> => (((await c.call("listTabs")) as { tabs?: Row[] }).tabs ?? []);
interface Leg3 { O: Tab; front: () => Promise<void>; trigger: () => Promise<unknown>; expect: "bg" | "fg"; click?: boolean; holderName: string; nextExpr: () => string; own: string[] }
async function popLeg3(row: string, leg: string, P: { A: Peer; B: Peer; C?: Peer }, o: Leg3): Promise<{ v: Verdict20; rounds: Round[] }> {
  const before = parseBefore(await sig(`${row}-${leg}-cn0`));
  const rounds: Round[] = [];
  let unsent = false;
  for (const k of [1, 2, 3]) {
    const click = (c: string): Promise<string> => sigC(`${row}-${leg}-click${k}`, c);
    if (unsent) { if (o.click) await click("skip"); continue; }
    let pre: Row[] = [];
    const trigger = o.click ? async (g: "bg" | "fg" | "n/a") => { pre = await listRows(P.A.c); return clickGate(g, click); } : o.trigger;
    const opened = o.click ? async (at: number) => { await sleep(Math.max(0, at + 1000 - Date.now())); return popupRead(pre, await listRows(P.A.c), o.O.handle, o.own); } : undefined;   // at or after sent + 1 000 ms (item 4)
    const r = await popRound(P, { O: o.O, front: o.front, trigger, v3: { holderName: o.holderName, nextExpr: o.nextExpr, ...(opened ? { opened } : {}) } }, row);
    if (r === "unsent") { unsent = true; continue; }
    rounds.push(r);
    if (o.click && r.r3?.popupOpened !== undefined) say(humanLine3(row, k, { opened: r.r3.popupOpened, opener: r.r3.opener ?? "none", grantedTo: r.grantedTo }));
  }
  const after = parseAfter(await sig(`${row}-${leg}-cn1`));   // after the last call answered and its popup was closed (popRound's sweep), item 11
  if (rounds.some((r) => r.preClick)) say(`CHECK ${row} ${leg} grant-before-click=yes`);
  if (unsent) { say(`CHECK ${row} ${leg} click-sent=no`); say(legLine(row, leg, "NOT MEASURED")); return { v: "NOT MEASURED", rounds }; }
  const j = judgePop3(row, leg, rounds, { expect: o.expect, human: o.click === true, before, after });
  say(j.line); say(j.record); say(legLine(row, leg, j.v === "STOP" ? "FAIL" : j.v));
  if (j.v === "STOP") throw new StopWhy(WRONG, `${row} ${leg}`);
  return { v: j.v, rounds };
}
const exprOf = (base: number): (() => string) => { let n = 0; return () => uniqueExpr(base + ++n); };
async function popBgFg3(x: Ctx, row: string, fg: boolean): Promise<number> {
  const port = first(x);
  const A: Peer = { c: x.c, grants: [] };
  x.c.on("leaseGranted", (e) => A.grants.push({ tab: e.tab, at: Date.now() }));
  const B = await peer(NAMES.B);
  try {
    const O = await x.open(U(port, "a1")), H = await B.c.newTab(U(port, "bc"), { active: false });
    await sleep(1200);
    const r = await popLeg3(row, fg ? "fg" : "bg", { A, B }, {
      O, expect: fg ? "fg" : "bg", front: () => (fg ? O.focus() : H.focus()), trigger: () => att(() => O.evaluate(`window.open('${POPUP(port)}') !== null`)),
      holderName: holderOf(fg ? ACTOR.fg : ACTOR.bg), nextExpr: exprOf(fg ? BASE.fg : BASE.bg), own: [O.handle, H.handle],
    });
    if (fg) say(`CHECK ${row} compare R15-POP-2 (a) leaseGranted 150 ms in-ms=${Math.max(0, ...r.rounds.map((q) => q.inMs ?? 0))}`);
    await att(() => H.close());
    return finish(row, [r.v === "NOT DISCRIMINATING" ? "NOT MEASURED" : (r.v as V)]);
  } finally { B.c.close(); }
}
/** Leg `third` as liveA20's (B's own evaluate loop, C holds the front tab), then B's loop is stopped and awaited: leg `human` has no bridge caller at all (the sheet). */
async function popOther3(x: Ctx): Promise<number> {
  const row = "R20-POP-OTHER-3", port = first(x), holderName = holderOf(ACTOR.other), nextExpr = exprOf(BASE.other);
  const A: Peer = { c: x.c, grants: [] };
  x.c.on("leaseGranted", (e) => A.grants.push({ tab: e.tab, at: Date.now() }));
  const B = await peer(NAMES.B), C = await peer(NAMES.C);
  let busy = true, loop: Promise<void> = Promise.resolve();
  try {
    const O = await x.open(U(port, "a1")), H = await C.c.newTab(U(port, "bc"), { active: false }), T = await B.c.newTab(U(port, "bc"), { active: false });
    await sleep(1200);
    loop = (async () => { while (busy) { await att(() => B.c.call("evaluate", { tab: T.handle, expression: "1" })); await sleep(300); } })();
    const legs: Verdict20[] = [], own = [O.handle, H.handle, T.handle];
    say(B_WINDOW_CHECK_3);
    legs.push((await popLeg3(row, "third", { A, B, C }, { O, expect: "bg", front: () => H.focus(), trigger: () => att(() => O.evaluate(`window.open('${POPUP(port)}') !== null`)), holderName, nextExpr, own })).v);
    busy = false; await loop;
    if (x.opts.click === "yes") legs.push((await popLeg3(row, "human", { A, B, C }, { O, expect: "fg", click: true, front: () => O.focus(), trigger: async () => undefined, holderName, nextExpr, own })).v);
    else { say(`CHECK ${row} human click=unavailable`); say(legLine(row, "human", "NOT MEASURED")); legs.push("NOT MEASURED"); }
    say(UNJOINED_LINE_3);
    await att(() => H.close()); await att(() => T.close());
    return finish(row, legs.map((v) => (v === "NOT DISCRIMINATING" ? "NOT MEASURED" : (v as V))));
  } finally { busy = false; await loop.catch(() => undefined); B.c.close(); C.c.close(); }
}
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "pop-bg-3": (a) => run(ACTOR.bg, a, (x) => popBgFg3(x, "R20-POP-BG-3", false), "R20-POP-BG-3"),
  "pop-fg-3": (a) => run(ACTOR.fg, a, (x) => popBgFg3(x, "R20-POP-FG-3", true), "R20-POP-FG-3"),
  "pop-other-3": (a) => run(ACTOR.other, a, popOther3, "R20-POP-OTHER-3"),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

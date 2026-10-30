// Step 13 S5-drivers-C2: the actor of liveC20's rows R20-DEVT-UNDOCK, R20-DEVT-EARLY (legs undocked, docked) and the conditional rows R20-UP-DEVT, R20-KEEP-4, R20-SWEEP-HELD
// (docs/e2e-test-plan.md section 4.28), and their pure judges. Same contract as s13-r20-b.ts: the sheet's line forms through s13-forms.ts, `LEG <row> <label> <verdict>` lines (recipes/s13-r20.ps1
// folds them into the row's one ROW), exit 0 pass, 1 fail, 2 STOP (`STOPWHY <reason>`), 3 not measured. NOT run against Chrome by its author. Counts and fixed words only.
// The PowerShell side (recipes/s13-r20-c.ps1, C3) answers every value step through one `serve` step (#412). Step ids are `<row>-<leg>-<step>`; the answers are:
//   ctl0 | ctl1 | ctl2  (ctl0 is read before the open in every row but R20-KEEP-4, which reads no before-open control) `<windows or na> <ok or none or na> <yes or no or unread> <targets>` (Get-S13Control; a docked state has windows na, title na)
//   open                `ok` or `fail` (Open-S13DevTools: opened, and the side done)      close  `<remaining>` (Close-S13DevTools) or `unread`      check  `yes` or `no` (DevTools still open)
// up-devt, keep-4 and sweep-held take `--leg undocked|docked`; up-devt and sweep-held (phase 1) also `--cond earlier|none`: earlier re-creates R20-DEVT-UNDOCK's condition (an earlier attach answering 2, then idle), none R20-DEVT-EARLY's (no call before the open).
// The leg's tab carries a marker unique among open tabs (MARKER below; Get-S13Control reads `unread` unless exactly one page target holds it). Run 19's readers are reused read-only; devprobe is not.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KEEPER_IDLE_MS } from "../extension/src/debugger-keeper.js";
import { K17, judgeErr17 } from "./s11b-rules.js";
import { refusalPageJudge, type PageObs } from "./s11-rules.js";
import { IDLE_MIN_MS_19 } from "./s12-forms.js";
import { keepdtLine, sweepheldLine } from "./s12-forms-b.js";
import { att, finish, HelperDefect, idle, run, say, sig, sleep, stamp, StopWhy, URL, type Ctx, type Err, type V } from "./s12-r19-a.js";
import { code, ev, fileOf, findTab, judgeKeep4, judgeSweep, state, withTab } from "./s12-r19-b.js";
import { conditionalRows, ctrl20Line, ctrl20Verdict, devtRowGate, devt20Line, devt20Verdict, K_DEVT_CODE, worseVerdict, type Ctl, type DevtLeg, type DockSide } from "./s13-forms.js";
type Client = import("../sdk/src/index.js").BridgeClient;
export type State = "undocked" | "docked";
export type CtlRead = Ctl & { targets: number };
export const ROWS_C = ["R20-DEVT-UNDOCK", "R20-DEVT-EARLY", "R20-UP-DEVT", "R20-KEEP-4", "R20-SWEEP-HELD"] as const;
/** The tab marker of each leg (a `s12x=` query token; none is a substring of another, and the tab's URL carries it only once). */
export const MARKER = { undock: "s12x=r20u1", early_undocked: "s12x=r20eu1", early_docked: "s12x=r20ed1", up: "s12x=r20cup", keep: "s12x=r20ck4", sweep: "s12x=r20csw" } as const;
const stateOf = (s: State): "undock" | "docked" => (s === "undocked" ? "undock" : "docked");
// ---- the PowerShell side's answers ------------------------------------------------------------------------------------------------------------------
/** `<windows|na> <ok|none|na> <yes|no|unread> <targets>`; anything else is an unreadable control (attached=unread, never a guess). */
export function parseCtl(raw: string): CtlRead {
  const m = /^(\d{1,3}|na) (ok|none|na) (yes|no|unread) (\d{1,6})$/.exec(raw.trim());
  return m ? { windows: m[1] === "na" ? null : Number(m[1]), title: m[2] === "na" ? "n/a" : (m[2] as "ok" | "none"), attached: m[3] as Ctl["attached"], targets: Number(m[4]) } : { windows: null, title: "n/a", attached: "unread", targets: 0 };
}
export const parseOpen = (raw: string): boolean => raw.trim() === "ok";
export const parseCount = (raw: string): number | null => (/^\d{1,3}$/.test(raw.trim()) ? Number(raw.trim()) : null);
/** One control read judged alone (SWEEP-HELD phase 2's after-reload read, which has no before-open moment): the sheet's rule with a before-open of attached=no. */
export const afterGate = (after: Ctl, s: State): string => ctrl20Verdict({ windows: null, title: "n/a", attached: "no" }, after, stateOf(s));
const UNREADABLE = "RECORD devtools-control-unreadable";
/** A conditional row's control with the before-open read, judged as the DEVT rows judge it; an open that did not answer ok is the sheet's unreadable control, docked or undocked. */
export const condGate = (before: Ctl, after: Ctl, s: State, opened: boolean): string => (opened ? ctrl20Verdict(before, after, stateOf(s)) : UNREADABLE);
export const KEEP4_LATE = "NOT MEASURED DevTools was not opened before the keeper's idle bound";
/** R20-KEEP-4's control: no before-open read (its own first step keeps a session, so attached=yes is expected there). Open not ok: unreadable; open at or after the keeper's idle bound: not measured;
 *  docked: no bridge-independent control, so RECORD; undocked: the window clause plus attached. */
export function keep4Gate(after: Ctl, s: State, opened: boolean, openMs: number): string {
  if (!opened) return UNREADABLE;
  if (openMs >= KEEPER_IDLE_MS) return KEEP4_LATE;
  if (s === "docked") return UNREADABLE;
  return ctrl20Verdict({ windows: null, title: "n/a", attached: "no" }, after, "undock");
}
const toV = (v: string): V => (v === "PASS" ? "PASS" : v.startsWith("RECORD") ? "RECORD" : v.startsWith("NOT MEASURED") ? "NOT MEASURED" : "FAIL");
const leg = (row: string, label: string, v: string): string => `LEG ${row} ${label} ${v}`;
// ---- R20-DEVT-UNDOCK / R20-DEVT-EARLY: one leg's lines and verdict -------------------------------------------------------------------------------------
export interface LegIn { opened: boolean; row: string; leg: string; state: State; before: CtlRead; after: CtlRead; ans: Err | undefined; value: unknown; remaining: number | null }
/** Control first (ctrl20Verdict); then `ok` with 2 = PASS, K-devt's code and message exactly = FAIL with the finding, else FAIL. A K-devt answer never stands as the proof of attachment. */
export function devtLegResult(i: LegIn): { lines: string[]; result: DevtLeg } {
  const ok = i.ans === undefined, c = condGate(i.before, i.after, i.state, i.opened);
  const result = devt20Verdict(c, ok ? { code: "ok", value: i.value } : { code: i.ans!.code, message: i.ans!.message });
  const lines = [
    ctrl20Line(i.row, { leg: i.leg, when: "before-open", ...i.before }), ctrl20Line(i.row, { leg: i.leg, when: "after-open", ...i.after }),
  ];
  if (i.remaining === null) lines.push(`CHECK ${i.row} ${i.leg} devtools-windows-after=unread`);
  else lines.push(devt20Line(i.row, { leg: i.leg, answer: ok ? "ok" : i.ans!.code, value: ok && i.value === 2 ? "ok" : "n/a", exact: ok ? null : i.ans!.code === K_DEVT_CODE && result.finding === "devtools-refuses", devtoolsWindowsAfter: i.remaining }));
  if (ok && i.value !== 2) lines.push(`CHECK ${i.row} ${i.leg} value-wrong=yes`);
  if (result.finding) lines.push(`CHECK ${i.row} finding=${result.finding} leg=${i.leg}`);
  return { lines, result };
}
/** The row's verdict is the worse of its legs, each printed. */
export const rowOfLegs = (legs: readonly DevtLeg[]): string => worseVerdict(legs.map((l) => l.verdict));
export const EARLIER_NM_VALUE = "NOT MEASURED the earlier attach did not answer 2", EARLIER_NM_IDLE = "NOT MEASURED the kept session was not idle";
/** Condition 1's gate (R20-DEVT-UNDOCK): the earlier attach answered 2, then the session idled at least IDLE_MIN_MS_19; else the sheet's NOT MEASURED words. */
export const earlierVerdict = (e: Err | undefined, value: unknown, idleMs: number): string | undefined => (e || value !== 2 ? EARLIER_NM_VALUE : idleMs < IDLE_MIN_MS_19 ? EARLIER_NM_IDLE : undefined);
/** `--cond earlier` (#369 condition 1: an earlier attach, then idle) or `none` (condition 2: no CDP call before the open); anything else is a helper defect. */
export const condOf = (o: Record<string, string>): boolean => { if (o.cond !== "earlier" && o.cond !== "none") throw new HelperDefect("--cond is earlier or none"); return o.cond === "earlier"; };
/** The refusing leg's label (the `leg=` of its finding line) -> the conditional rows' `--leg` and `--cond` (C2 fixer2 section 3); any other label is a helper defect. */
export function condFor(label: string): { leg: State; cond: "earlier" | "none" } {
  if (label === "undock") return { leg: "undocked", cond: "earlier" };
  if (label === "undocked") return { leg: "undocked", cond: "none" };
  if (label === "docked") return { leg: "docked", cond: "none" };
  throw new HelperDefect("not a DEVT leg label");
}
/** The DEVT legs in the sheet's order (UNDOCK, then EARLY's two); the conditional rows run once, under the first refusing leg of this order, whatever order the labels came in. */
export const LEG_ORDER: readonly string[] = ["undock", "undocked", "docked"];
export function pickRefusing(labels: readonly string[]): { under: string; others: string[] } | undefined {
  labels.forEach((l) => condFor(l));
  const sorted = LEG_ORDER.filter((l) => labels.includes(l));
  return sorted.length === 0 ? undefined : { under: sorted[0]!, others: sorted.slice(1) };
}
/** The earlier attach and idle wait of condition 1, run before ctl0; undefined when it held, else the NOT MEASURED verdict (already printed as the leg's). */
async function earlierAttach(t: Awaited<ReturnType<Ctx["open"]>>, row: string, label: string): Promise<string | undefined> {
  const e1 = await att(() => t.evaluate("1 + 1"));
  say(`ANSWER ${row} ${label} earlier ${code(e1.e)}`);
  const v = e1.e || e1.v !== 2 ? earlierVerdict(e1.e, e1.v, 0) : earlierVerdict(undefined, 2, await idle(row));
  if (v) say(leg(row, label, v));
  return v;
}
async function devtLeg(x: Ctx, row: string, label: string, s: State, marker: string, earlier: boolean): Promise<DevtLeg> {
  const id = (step: string): string => `${row}-${label}-${step}`;
  const t = await x.open(URL(`con&${marker}`), true);
  try {
    if (earlier) { const nm = await earlierAttach(t, row, label); if (nm) return { verdict: nm }; }
    const before = parseCtl(await sig(id("ctl0")));
    const opened = parseOpen(await sig(id("open")));
    const after = parseCtl(await sig(id("ctl1")));
    say(`CHECK ${row} ${label} open=${opened ? "ok" : "fail"}`);
    const r = await att(() => t.evaluate<number>("1 + 1"));
    const remaining = parseCount(await sig(id("close")));
    say(`ANSWER ${row} ${label} call ${code(r.e)}`);
    const res = devtLegResult({ opened, row, leg: label, state: s, before, after, ans: r.e, value: r.v, remaining });
    res.lines.forEach(say);
    say(leg(row, label, res.result.verdict));
    if (remaining !== 0) throw new StopWhy("devtools-left-open", `${row} ${label}`);
    return res.result;
  } finally { await att(() => t.close()); }
}
// ---- the conditional rows ---------------------------------------------------------------------------------------------------------------------------
const needCond = (x: Ctx): boolean => condOf(x.opts);
const need = (x: Ctx): State => { const s = x.opts.leg; if (s !== "undocked" && s !== "docked") throw new HelperDefect("--leg is undocked or docked"); return s; };
/** R17-UP-DEVT's rule under the refusing state, the DevTools control read before each call: a control that is not PASS is the row's verdict alone; else control 1 and the upload K-devt exactly, the mark added then removed, control 2 ok. */
export function upDevtLegs(g1: string, g2: string, o: { c1?: Err; up?: Err; c2?: Err; page: PageObs }): Array<[string, string]> {
  const control = worseVerdict([g1, g2]);
  if (control !== "PASS") return [["control", control]];
  const v = (b: boolean): string => (b ? "PASS" : "FAIL");
  return [["control", "PASS"], ["control1", v(judgeErr17(o.c1, K17["K-devt"], "control 1").pass)], ["upload", v(judgeErr17(o.up, K17["K-devt"], "upload").pass)], ["page", v(refusalPageJudge(o.page, "set-and-removed").pass)], ["control2", v(o.c2 === undefined)]];
}
/** R19-KEEP-4's rule: while DevTools is open the call is K-devt exactly; after it closes the next is ok with 11 entries. A control that is not PASS is both legs' verdict. */
export const keep4Legs = (gate: string, dv: Err | undefined, c3: { e?: Err; n?: number }): Array<[string, string]> =>
  gate !== "PASS" ? [["devtools", gate], ["closed", gate]] : (() => { const j = judgeKeep4(dv, c3, true); return [["devtools", j.devtools], ["closed", j.closed]]; })();
export const sweepVerdict = (gate: string, o: { afterReload: string; devtoolsOpen: boolean; reclaimed: boolean; after: string }): string => (gate !== "PASS" ? gate : judgeSweep(o));
async function readPage(c: Client, h: string): Promise<PageObs> {
  const { toPage } = await import("./s11.js");
  for (const t0 = Date.now(); ; await sleep(100)) {
    const st = (await ev(c, h, "window.__s11 ? window.__s11.state() : null")) as Parameters<typeof toPage>[0] | null;
    if (st && st.pending === 0) { stamp(); return toPage(st); }
    if (Date.now() - t0 > 30_000) throw new StopWhy("throw-after-state", "the page's reporter is missing");
  }
}
const emit = (R: string, ls: Array<[string, string]>): V[] => ls.map(([l, v]) => { say(leg(R, l, v)); return toV(v); });
const closedOrThrow = (R: string, remaining: number | null): void => { if (remaining !== 0) throw new StopWhy("devtools-left-open", R); };
async function upDevt(x: Ctx): Promise<number> {
  const R = "R20-UP-DEVT", s = need(x), earlier = needCond(x), id = (st: string): string => `${R}-${s}-${st}`;
  const t = await x.open(`http://localhost:8081/s11-upload.html?${MARKER.up}`, true), file = fileOf(state(), "s11-1k.bin");
  try {
    if (earlier) { const nm = await earlierAttach(t, R, "control"); if (nm) return finish(R, [toV(nm)]); }
    const k0 = parseCtl(await sig(id("ctl0")));
    const opened = parseOpen(await sig(id("open")));
    const k1 = parseCtl(await sig(id("ctl1"))), c1 = await att(() => t.evaluate("1"));
    const k2 = parseCtl(await sig(id("ctl2"))), up = await att(() => t.upload({ css: "#up-single" }, file));
    const remaining = parseCount(await sig(id("close"))); await sleep(1500);
    const c2 = await att(() => t.evaluate("1")), page = await readPage(x.c, t.handle);
    say(`CHECK ${R} ${s} cond=${earlier ? "earlier" : "none"} open=${opened ? "ok" : "fail"}`);
    [["control1", c1], ["upload", up], ["control2", c2]].forEach(([n, a]) => say(`ANSWER ${R} ${String(n)} ${code((a as { e?: Err }).e)}`));
    say(ctrl20Line(R, { leg: `${s}-ctl0`, when: "before-open", ...k0 }));
    [[k1, "ctl1"], [k2, "ctl2"]].forEach(([k, n]) => say(ctrl20Line(R, { leg: `${s}-${String(n)}`, when: "after-open", ...(k as CtlRead) })));
    const vs = emit(R, upDevtLegs(condGate(k0, k1, s, opened), condGate(k0, k2, s, opened), { c1: c1.e, up: up.e, c2: c2.e, page }));
    closedOrThrow(R, remaining);
    return finish(R, vs);
  } finally { await att(() => t.close()); }
}
async function keep4(x: Ctx): Promise<number> {
  const R = "R20-KEEP-4", s = need(x), id = (st: string): string => `${R}-${s}-${st}`;
  const t = await x.open(URL(`con&${MARKER.keep}`), true);
  try {
    const t0 = Date.now();
    await att(() => t.consoleMessages());
    const opened = parseOpen(await sig(id("open"))), openMs = Date.now() - t0;
    say(`CHECK ${R} ${s} open=${opened ? "ok" : "fail"} open-ms=${openMs} bound-ms=${KEEPER_IDLE_MS} (from before the first call, judged: it includes any dock change)`);
    const k = parseCtl(await sig(id("ctl1"))), dv = (await att(() => t.consoleMessages())).e;
    const remaining = parseCount(await sig(id("close"))); await sleep(1500);
    const c3 = await att(() => t.consoleMessages());
    say(ctrl20Line(R, { leg: `${s}-ctl1`, when: "after-open", ...k }));
    say(keepdtLine(R, "devtools", code(dv))); say(keepdtLine(R, "closed", code(c3.e)));
    const vs = emit(R, keep4Legs(keep4Gate(k, s, opened, openMs), dv, { e: c3.e, n: (c3.v as unknown[] | undefined)?.length }));
    closedOrThrow(R, remaining);
    return finish(R, vs);
  } finally { await att(() => t.close()); }
}
/** Two actor runs, the reload between them at block level (the capture window is reopened before phase 2 so its control read works): phase 1 opens the tab and DevTools and reads the control; phase 2 re-claims, reads the control, calls, checks, closes. */
async function sweepHeld(x: Ctx): Promise<number> {
  const R = "R20-SWEEP-HELD", s = need(x), id = (st: string): string => `${R}-${s}-${st}`;
  if (x.opts.phase === "close") {   // phase 1 ended without a measurement (C3, C2 verifier3 H3): no reload, no phase 2; the kept tab is closed here
    const t = await findTab(x.c, MARKER.sweep, 15_000).catch(() => undefined);
    await att(async () => t?.close()); say(`CHECK ${R} tab-closed=${t ? "yes" : "no"}`);
    return 0;
  }
  if (x.opts.phase !== "2") {
    const earlier = needCond(x), t = await x.open(URL(`con&${MARKER.sweep}`), true, true);
    if (earlier) { const nm = await earlierAttach(t, R, "control-pre"); if (nm) return finish(R, [toV(nm)]); }
    const k0 = parseCtl(await sig(id("ctl0"))), opened = parseOpen(await sig(id("open"))), k = parseCtl(await sig(id("ctl1")));
    await withTab(t, async () => undefined);
    say(`CHECK ${R} ${s} cond=${earlier ? "earlier" : "none"} open=${opened ? "ok" : "fail"}`); say(ctrl20Line(R, { leg: `${s}-pre0`, when: "before-open", ...k0 })); say(ctrl20Line(R, { leg: `${s}-pre`, when: "after-open", ...k }));
    const g = condGate(k0, k, s, opened); say(leg(R, "control-pre", g));
    return finish(R, [toV(g)]);
  }
  const t = await findTab(x.c, MARKER.sweep, 90_000).catch(() => undefined), reclaimed = t !== undefined;
  const k = parseCtl(await sig(id("ctl2")));
  let after = "ERROR";
  if (t) after = code((await att(() => t.evaluate("1"))).e);
  const open = (await sig(id("check"))) === "yes";
  const remaining = parseCount(await sig(id("close"))); await sleep(1500);
  const ok = t ? code((await att(() => t.evaluate("1"))).e) : "ERROR";
  await att(async () => t?.close());
  say(ctrl20Line(R, { leg: `${s}-post`, when: "after-open", ...k }));
  say(sweepheldLine({ afterReload: after, devtoolsOpen: open, reclaimed })); say(`ANSWER ${R} second ${ok}`);
  const v = sweepVerdict(afterGate(k, s), { afterReload: after, devtoolsOpen: open, reclaimed, after: ok });
  say(leg(R, "sweep", v));
  closedOrThrow(R, remaining);
  return finish(R, [toV(v)]);
}
// ---- the gates: the NOT RUN rows are printed here, from the sheet's own wording (devtRowGate, conditionalRows), so the PowerShell side copies no text -------------
const DOCK_SIDES: readonly string[] = ["bottom", "right", "left", "undock"];
export const notRunLine = (id: string, why: string): string => `ROW ${id} NOT RUN — ${why}`;
export const NO_REFUSAL_FINDING = "CHECK R20-DEVT finding: both conditions answer ok; #374 item 3's reword waits for the user";
/** `gate-dock --dock <side>`: an unread side prints the five rows NOT RUN and exits 3, else exits 0 and prints a CHECK. */
export function gateDock(side: string): { lines: string[]; exit: 0 | 3 } {
  const g = devtRowGate((DOCK_SIDES.includes(side) ? side : "unread") as DockSide);
  return g.run ? { lines: [`CHECK gate-dock side-readable=yes`], exit: 0 } : { lines: ROWS_C.map((r) => notRunLine(r, g.reason)), exit: 3 };
}
/** The finding only when every DEVT leg was PASS (at least one); else a line of counts, so a result that was not observed is never stated. */
const noRefusal = (devtLegs: string): string => {
  const vs = devtLegs.split(",").filter((v) => v !== ""), pass = vs.filter((v) => v === "PASS").length;
  return vs.length > 0 && pass === vs.length ? NO_REFUSAL_FINDING : `CHECK R20-DEVT no-refusal legs-pass=${pass} legs-other=${vs.length - pass}`;
};
/** `gate-cond --findings <comma list of the refusing legs or none> --legs <comma list of the DEVT legs' verdicts: PASS, RECORD, NM or FAIL>`: no refusing leg prints the three conditional rows NOT RUN and the finding (or its counts), exit 3; else exit 0. */
export function gateCond(findings: string, devtLegs = ""): { lines: string[]; exit: 0 | 3 } {
  const labels = findings.split(",").filter((l) => l !== "" && l !== "none");
  const legs: DevtLeg[] = labels.map(() => ({ verdict: "FAIL", finding: "devtools-refuses" as const }));
  const c = conditionalRows(legs), pick = pickRefusing(labels);
  if (c.run && pick) { const f = condFor(pick.under); return { lines: [`CHECK gate-cond run=yes refusing-legs=${legs.length}`, `CHECK gate-cond under=${pick.under} leg=${f.leg} cond=${f.cond} not-rerun=${pick.others.join(",") || "none"}`], exit: 0 }; }
  return c.run ? { lines: [`CHECK gate-cond run=yes refusing-legs=${legs.length}`], exit: 0 } : { lines: [...ROWS_C.slice(2).map((r) => notRunLine(r, c.line!)), noRefusal(devtLegs)], exit: 3 };
}
/** `dock-read --row R20-0C|R20-RESTORE --windows <n|n/a> --pane yes|no|n/a --customize <n|n/a> --invoked yes|no|n/a --items <n|n/a> --kinds u<n>l<n>b<n>r<n> --pressed-readable <n|n/a> --pressed <n|n/a>` (#418 F3): ONE counts-only
 *  diagnostic CHECK line of the dock read, never a verdict, a gate or a ROW (CHECK rows20 counts ROW lines only). Every value is a count or a fixed word: anything else prints `n/a`, never the text it came in. */
const CNT = /^(\d{1,3}|n\/a)$/, YNA = /^(yes|no|n\/a)$/, KINDS = /^u\d{1,2}l\d{1,2}b\d{1,2}r\d{1,2}$/;
export function dockReadLine(o: Record<string, string>): { lines: string[]; exit: 0 | 2 } {
  if (o.row !== "R20-0C" && o.row !== "R20-RESTORE") return { lines: ["STOP: dock-read needs --row R20-0C or R20-RESTORE"], exit: 2 };
  const v = (k: string, re: RegExp): string => (re.test(o[k] ?? "") ? o[k]! : "n/a");
  return { lines: [`CHECK dock-read row=${o.row} windows=${v("windows", CNT)} pane=${v("pane", YNA)} customize=${v("customize", CNT)} invoked=${v("invoked", YNA)} items=${v("items", CNT)} kinds=${v("kinds", KINDS)} pressed-readable=${v("pressed-readable", CNT)} pressed=${v("pressed", CNT)}`], exit: 0 };
}
export const gateCmd = (f: (v: string, w: string) => { lines: string[]; exit: 0 | 3 }, key: string) => async (a: string[]): Promise<number> => {
  const o: Record<string, string> = {}; for (let i = 0; i < a.length; i += 2) o[a[i]!.replace(/^--/, "")] = a[i + 1] ?? "";
  const r = f(o[key] ?? "", o.legs ?? ""); r.lines.forEach(say); return r.exit;
};
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "devt-undock": (a) => run("devtc20", a, async (x) => {
    const l = await devtLeg(x, "R20-DEVT-UNDOCK", "undock", "undocked", MARKER.undock, true);
    return finish("R20-DEVT-UNDOCK", [toV(l.verdict)]);
  }),
  "devt-early": (a) => run("devtc20", a, async (x) => {
    const R = "R20-DEVT-EARLY", legs = [await devtLeg(x, R, "undocked", "undocked", MARKER.early_undocked, false), await devtLeg(x, R, "docked", "docked", MARKER.early_docked, false)];
    say(`CHECK ${R} row=${rowOfLegs(legs)}`);
    return finish(R, legs.map((l) => toV(l.verdict)));
  }),
  "up-devt": (a) => run("devtc20", a, upDevt), "keep-4": (a) => run("devtc20", a, keep4), "sweep-held": (a) => run("devtc20", a, sweepHeld),
  "gate-dock": gateCmd(gateDock, "dock"), "gate-cond": gateCmd(gateCond, "findings"),
  "dock-read": async (a) => { const o: Record<string, string> = {}; for (let i = 0; i < a.length; i += 2) o[a[i]!.replace(/^--/, "")] = a[i + 1] ?? ""; const r = dockReadLine(o); r.lines.forEach(say); return r.exit; },
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

// Step 12 S7-drivers-C: the actors of Run 19's liveC19 rows, the file chooser and G2 (docs/e2e-test-plan.md section 4.27). NOT run against Chrome by its author.
// Same contract as s12-r19-a.ts and -b.ts: each command prints the sheet's line forms ((21)-(24), (26), (30) by their formatters in s12-forms-c.ts, (20) in
// s12-forms-b.ts) and `LEG <row> <label> <verdict>` lines (recipes/s12-r19-a.ps1's Invoke-R19Row turns them into the row's one ROW); exit 0 pass, 1 fail, 2 STOP
// (`STOPWHY <reason>`). Counts and fixed words only. The native-dialog count (`dialog=`), the human-style click and the closer are PowerShell's (recipes/s12-r19-c.ps1):
// the actor asks for them through `sig(<step id>)` and reads the answer (a count, or `before,after-click,after-close,ms`). The pure decisions are exported for tests.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { K, mcpOkText } from "./s11-rules.js";
import { realIo, windowed } from "./s11b.js";
import { bannerEndMs, bannerSpan, keepseqLine, overlapExact, overlapLine, pollMsOf } from "./s12-forms-b.js";
import { chooseLine, dialogLine, dialogsLine, g2Line, g2typeLine, humanLine, lateLine } from "./s12-forms-c.js";
import { att, finish, handleOf, idle, judgeRefusal, legLine, MSG, run, say, sig, sleep, stamp, StopWhy, URL, type Ctx, type Err, type Mcp, type V } from "./s12-r19-a.js";
import { code, ev, fileOf, findTab, overlapRun, ROOT, state, timeline, type State } from "./s12-r19-b.js";

type Tab = import("../sdk/src/index.js").Tab;
type Client = import("../sdk/src/index.js").BridgeClient;
type Tgt = Parameters<Tab["upload"]>[0];
const EM = "—";
/** The chooser's refusal texts, each pinned to its product constant in recipes/test/s12-r19-c.test.ts. */
export const CH_MSG = {
  timeout: `No file chooser opened within 5s of the click ${EM} target an element whose click opens the page's file chooser; nothing was uploaded`,
  noInput: "the file chooser that opened belongs to no file input (a page file picker such as showOpenFilePicker); the bridge cannot fill it; nothing was uploaded",
  single: "the file input takes one file, and more than one path was given",
  dir: K["K-dir"].message,
  dis: "the file input is disabled",
  missing: "upload: paths[0] does not exist (or Chrome cannot read it); nothing was uploaded",
} as const;
export const G2_TEXT = "abcdefghijklmnopqrstuvwxyz0123456789ABCD"; // 40 characters
const BTN = { role: "button", name: "Open chooser" } as const;
const wantOf = (c: string, message: string, data?: string): { code: string; message: string; data?: string } => ({ code: c, message, ...(data ? { data } : {}) });

// ---- pure decisions ---------------------------------------------------------------------------------------------------------------------------
export interface ChooseObs { answer: string; exact: boolean | null; files: number; change: number; clicks: number; bytesEqual: boolean | null; dialog: number; ms: number }
export interface ChooseWant { answer: string; files: number; change?: number; clicks?: number; bytesEqual?: boolean | null; exact?: boolean }
/** One CHOOSE leg: the answer, the page's reporter keys named in `want`, no native dialog; `exact` (a refusal's code and text) only where the want asks for it. */
export const judgeChoose = (o: ChooseObs, w: ChooseWant): V =>
  o.answer === w.answer && o.files === w.files && (w.change === undefined || o.change === w.change) && (w.clicks === undefined || o.clicks === w.clicks) && (w.bytesEqual === undefined || o.bytesEqual === w.bytesEqual)
    && (!w.exact || o.exact === true) && o.dialog === 0 ? "PASS" : "FAIL";
/** R19-CHOOSE-3: the 5 s wait from the click's reply; 4 900 to 8 000 ms (the sheet's margins). */
export const judgeTimeoutMs = (ms: number): V => (ms >= 4_900 && ms <= 8_000 ? "PASS" : "FAIL");
/** R19-CHOOSE-2: the call is refused, so no file may reach the page: any file, or the page's own digest of it equal to the outside file's (the page is opened with `#sum=<digest of s11-out.bin>`; the two files have the same size, so a size test cannot tell them apart, MAJOR-2). */
export const outsideReached = (rep: { files: number; bytesEqual: boolean | null }): boolean => rep.files > 0 || rep.bytesEqual === true;
/** R19-CHOOSE-HUMAN: a file reaches the page legitimately, so only the digest says it is the outside file's. */
export const outsideDigestHit = (rep: { bytesEqual: boolean | null }): boolean => rep.bytesEqual === true;
/** The one place a STOP is thrown: a row decision that is a STOP must end the wave, never be printed and go on. */
export function stopWhen(cond: boolean, reason: string, why: string): void { if (cond) throw new StopWhy(reason, why); }
export interface DlgObs { before: number; afterClick: number; afterClose: number; ms: number; sent?: boolean }
export function parseDlg(s: string): DlgObs {
  if (s.trim() === "unsent") return { before: 0, afterClick: 0, afterClose: 0, ms: 0, sent: false }; // the helper sent no click (target, foreground or point not right): not the product's
  const n = s.split(",").map(Number);
  if (n.length !== 4 || n.some((v) => !Number.isInteger(v) || v < 0)) throw new Error("the dialog step answered something else than four counts");
  return { before: n[0]!, afterClick: n[1]!, afterClose: n[2]!, ms: n[3]!, sent: true };
}
export type DlgVerdict = V | "STOP dialog-not-opened" | "STOP dialog-left-open";
/** R19-CHOOSE-4 / DISARM: the human-style click opened Chrome's own dialog (the interception is off), the closer closed it within 5 000 ms, nothing was chosen. A dialog left open is always the STOP; no proved or no sent click, or a leg whose precondition (the call's answer) was not met, is NOT MEASURED. */
export function judgeDialog(o: DlgObs & { change: number }, humanProved = true, precondOk = true): DlgVerdict {
  if (o.afterClose !== 0) return "STOP dialog-left-open";
  if (!humanProved || o.sent === false || !precondOk) return "NOT MEASURED";
  if (o.afterClick === 0) return "STOP dialog-not-opened";
  return o.before === 0 && o.afterClick === 1 && o.ms <= 5_000 && o.change === 0 ? "PASS" : "FAIL";
}
/** A STOP verdict of `judgeDialog` is thrown here (the row's actor ends with `STOPWHY <reason>`). */
export const stopOnDialog = (v: DlgVerdict, why: string): void => stopWhen(v.startsWith("STOP"), v.slice(5), why);
/** R19-CHOOSE-4's leg precondition: (a) after a success, (b) after a TIMEOUT, (c) after the single-file refusal raised once the interception was on (the sheet's "after a ..." clauses). */
export function chooseLegPrecond(l: "a" | "b" | "c", e: Err | undefined, files: number): boolean {
  if (l === "a") return e === undefined && files === 1;
  if (l === "b") return e?.code === "TIMEOUT";
  return e?.code === "BAD_PARAMS" && e.message === CH_MSG.single;
}
/** R19-CHOOSE-DISARM: DISARMED exactly, nothing on the page, at most 7 000 ms (a shorter time is an early end, recorded, not a failure). */
export const judgeDisarm = (e: Err | undefined, ms: number, rep: { files: number; change: number }): V => (judgeRefusal(e, wantOf("DISARMED", MSG.disarmed, "keys:scope")) === "PASS" && ms <= 7_000 && rep.files === 0 && rep.change === 0 ? "PASS" : "FAIL");
/** R19-CHOOSE-LATE: Chrome's own file dialog never shows (the actor's whole 8 s read); `opened` = the late click opened a chooser at all (a file reached the page, or a dialog showed). */
export const judgeLate = (dialog: number): V => (dialog === 0 ? "PASS" : "FAIL");
/** The PowerShell watch is read for this long from the call's start: the click comes up to 1 500 ms after it, and the opener fires 5 100 ms after the click, so 9 500 ms covers 8 000 ms after the click. */
export const LATE_WATCH_MS = 9_500;
export const lateOpened = (files: number, dialog: number): boolean => files > 0 || dialog > 0;
export type Received = "call-target" | "clicked-input" | "none";
/** R19-CHOOSE-HUMAN: which input got the call's files: the one the human clicked (`#second`), the call's own target, or none. */
export const humanReceived = (secondFiles: number, files: number): Received => (secondFiles > 0 ? "clicked-input" : files > 0 ? "call-target" : "none");
/** R19-CHOOSE-KEPT: both calls ok with the file received each time (change 1 then 2, one file), then the banner as KEEP-1 (the control must have passed). */
export function judgeKept(answers: boolean[], changes: number[], files: number, banner: string, ctl: string): V {
  if (answers.length !== 2 || answers.some((a) => !a) || changes[0] !== 1 || changes[1] !== 2 || files !== 1) return "FAIL";
  return ctl !== "pass" ? "NOT MEASURED" : banner === "continuous" ? "PASS" : "FAIL";
}
/** R19-KEEP-OVERLAP leg b: the first call answers as without the second (TIMEOUT, exact), the second K-devt exactly, the page was clicked once. */
export const judgeOverlapChooser = (first: Err | undefined, second: Err | undefined, clicks: number): V =>
  first?.code === "TIMEOUT" && first.message === CH_MSG.timeout && second !== undefined && overlapExact(second) && clicks === 1 ? "PASS" : "FAIL";
/** R19-CHOOSE-MCP (a), (b): one text item, the file's name, size and digest, no directory part. */
export function judgeMcpOk(r: { text: string; isError: boolean }, f: { name: string; bytes: number; sha256: string }, forbidden: string[]): V {
  const re = new RegExp(`^Uploaded 1 file\\(s\\) to .+:\\n${f.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · ${f.bytes} bytes · sha256 ${f.sha256}$`);
  return !r.isError && re.test(r.text) && forbidden.every((d) => d !== "" && !r.text.includes(d)) ? "PASS" : "FAIL";
}
/** The code of an MCP result: an `isError` text starts with it; a failure report with a saved screenshot carries no `isError` (mcp/src/tools/registry.ts:332-336): the code is on line 1 and the last line is `The call failed (<CODE>). ...` (registry.ts:68-70). Anything else is `ok`. */
export function mcpCodeOf(r: { text: string; isError: boolean }): string {
  const lines = r.text.split("\n"), m = /^([A-Z][A-Z_]*)/.exec(lines[0] ?? "");
  if (r.isError) return m?.[1] ?? "ERROR";
  const f = /^The call failed \(([A-Z][A-Z_]*)\)\./.exec(lines[lines.length - 1] ?? "");
  return f && m?.[1] === f[1] ? f[1]! : "ok";
}
/** (c), (d): an error result, in either form, whose code is `c` (and which carries the fixed text where the sheet quotes it). */
export const judgeMcpErr = (r: { text: string; isError: boolean }, c: string, message?: string): V => (mcpCodeOf(r) === c && (message === undefined || r.text.includes(message)) ? "PASS" : "FAIL");
export interface G2Obs { aReplyMs: number; bReplyMs: number; rawGapMs: number; holderAfterReplyMs: number; aEffect: number; b: string; a?: string }
/** R19-G2-1: A's click `ok` first, B waits out the 500 ms hold (bound 450), the third client reads A as holder through it, A's click landed once, B ok. */
export const judgeG2 = (o: G2Obs): V => (o.a === "ok" && o.aReplyMs <= o.bReplyMs && o.rawGapMs >= 450 && o.holderAfterReplyMs >= 450 && o.aEffect === 1 && o.b === "ok" ? "PASS" : "FAIL");
/** How long, from A's reply, the third client kept reading A's name: the time of the last unbroken poll that read it. */
export function holderAfterMs(polls: Array<{ t: number; h?: string }>, name: string, aReplyAt: number): number {
  let last = aReplyAt;
  for (const p of polls.filter((x) => x.t >= aReplyAt)) { if (p.h !== name) break; last = p.t; }
  return last - aReplyAt;
}
export interface TypeRound { got: number; calls: Array<{ sentAt: number; replyAt: number; code: string }>; aSentAt: number; aReplyAt: number; aOk: boolean; holderSeen: boolean }
/** R19-G2-2, one round: A's text complete, at least 3 B screenshots all ok, none LOCK_TIMEOUT, none sent after A's send replying before A's reply + 450, A read as holder. */
export const judgeTypeRound = (r: TypeRound): V =>
  r.aOk && r.got === 40 && r.calls.length >= 3 && r.calls.every((c) => c.code === "ok" && (c.sentAt < r.aSentAt || c.replyAt >= r.aReplyAt + 450)) && r.holderSeen ? "PASS" : "FAIL";
export const gotOf = (value: string): number => (value === G2_TEXT ? 40 : Math.min(39, value.length));

// ---- each row's wants: one table, each key pinned to the sheet's clause in recipes/test/s12-r19-c.test.ts ----------------------------------------------
export const WANT = {
  choose1: { answer: "ok", files: 1, change: 1, clicks: 1, bytesEqual: true } as ChooseWant,
  label: { label: { answer: "ok", files: 1, change: 1, clicks: 1, bytesEqual: true }, input: { answer: "ok", files: 1, change: 1, bytesEqual: true }, multi: { answer: "ok", files: 2, change: 1, bytesEqual: null } } as Record<"label" | "input" | "multi", ChooseWant>,
  refuse: { answer: "BAD_PARAMS", exact: true, files: 0, change: 0, clicks: 1 } as ChooseWant,
  choose2: { exact: true, files: 0, change: 0, clicks: 0 } as Omit<ChooseWant, "answer">,
  choose3: { answer: "TIMEOUT", exact: true, files: 0, change: 0, clicks: 1 } as ChooseWant,
  disarm: { answer: "DISARMED", exact: true, files: 0 } as ChooseWant,
  jsoff: { answer: "JS_DISABLED", exact: true, files: 0, change: 0, clicks: 0 } as ChooseWant,
};
/** R19-CHOOSE-REFUSE: the four pages and the exact text each refusal carries. */
export const REFUSE_LEGS: ReadonlyArray<readonly [string, string]> = [["picker", CH_MSG.noInput], ["single", CH_MSG.single], ["dir", CH_MSG.dir], ["dis", CH_MSG.dis]];

// ---- the page's reporter and one chooser call ---------------------------------------------------------------------------------------------------
const fileWant = (s: State, n: string): { name: string; bytes: number; sha256: string } => s.files[n] as unknown as { name: string; bytes: number; sha256: string };
const CH = (q: string, extra = ""): string => URL(q, "s12-chooser.html") + extra;
const sumOf = (s: State, n = "s11-1k.bin"): string => `#sum=${fileWant(s, n).sha256}`;
interface Rep { clicks: number; change: number; files: number; bytes: number | null; bytesEqual: boolean | null; late: string }
async function rep(c: Client, h: string, sum = false): Promise<Rep> {
  for (let i = 0; ; i++) {
    const r = (await ev(c, h, "({clicks: window.__s12ch.clicks, change: window.__s12ch.change, files: window.__s12ch.files, bytes: window.__s12ch.bytes, bytesEqual: window.__s12ch.bytesEqual, late: window.__s12ch.late})")) as Rep;
    stamp();
    if (!sum || r.bytesEqual !== null || i >= 20) return r;
    await sleep(100);
  }
}
const timed = async <T>(f: () => Promise<T>): Promise<{ e?: Err; v?: T; ms: number }> => { const t0 = Date.now(); const r = await att(f); return { ...r, ms: Date.now() - t0 }; };
const upload = (t: Tab, target: Tgt, paths: string | string[]) => (): Promise<unknown> => t.upload(target, paths, { chooser: true });
/** Reads the reporter (after the call, outside any banner window) and the dialog count (PowerShell's step `dlg`, when given), prints the CHOOSE line. */
async function observe(x: Ctx, t: Tab, row: string, label: string, r: { e?: Err; ms: number }, o: { want?: ReturnType<typeof wantOf>; sum?: boolean; dlg?: string }): Promise<{ obs: ChooseObs; rep: Rep }> {
  await sleep(300);
  const p = await rep(x.c, t.handle, o.sum);
  const dialog = o.dlg ? Number(await sig(o.dlg)) : 0;
  const obs: ChooseObs = { answer: code(r.e), exact: o.want ? judgeRefusal(r.e, o.want) === "PASS" : null, files: p.files, change: p.change, clicks: p.clicks, bytesEqual: p.bytesEqual, dialog, ms: r.ms };
  say(chooseLine(row, label, obs));
  return { obs, rep: p };
}
const sdkFiles = (v: unknown): number => (v as { files?: unknown[] } | undefined)?.files?.length ?? -1;
const leg = (R: string, label: string, v: V, legs: V[]): void => { legs.push(v); say(legLine(R, label, v)); };

// ---- the chooser rows over the SDK ----------------------------------------------------------------------------------------------------------------
async function choose1(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-1", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [];
  for (const [i, how] of (["sdk", "ref"] as const).entries()) { // `sdk` = the first call, by locator (the sheet's label); `ref` = the second, by ref
    const t = await x.open(CH("c1", sumOf(s)));
    const target: Tgt = how === "sdk" ? BTN : (await t.locate(BTN)).ref;
    let r: { e?: Err; v?: unknown; ms: number };
    if (i === 0) { await idle(R); r = (await windowed(realIo, R, [], () => timed(upload(t, target, f)))).v; } else r = await timed(upload(t, target, f)); // the banner window holds the call only
    const o = await observe(x, t, R, how, r, { sum: true, dlg: `${R}-dlg${i + 1}` });
    leg(R, how, sdkFiles(r.v) === 1 ? judgeChoose(o.obs, WANT.choose1) : "FAIL", legs);
  }
  return finish(R, legs);
}
async function chooseLabel(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-LABEL", s = state(), a = fileOf(s, "s11-1k.bin"), b = fileOf(s, "s11-sent.bin"), legs: V[] = [];
  const specs: Array<["label" | "input" | "multi", Tgt, string[], boolean]> = [["label", { css: "#lab" }, [a], true], ["input", { css: "#in2" }, [a], true], ["multi", { css: "#in2" }, [a, b], false]];
  for (const [i, [label, target, paths, sum]] of specs.entries()) {
    const t = await x.open(CH("label", sum ? sumOf(s) : ""));
    const r = await timed(upload(t, target, paths));
    const o = await observe(x, t, R, label, r, { sum, dlg: `${R}-dlg${i + 1}` });
    leg(R, label, judgeChoose(o.obs, WANT.label[label]), legs);
  }
  return finish(R, legs);
}
async function chooseRefuse(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-REFUSE", s = state(), a = fileOf(s, "s11-1k.bin"), legs: V[] = [];
  for (const [i, [q, message]] of REFUSE_LEGS.entries()) {
    const paths = q === "single" ? [a, fileOf(s, "s11-sent.bin")] : [a];
    const t = await x.open(CH(q));
    const r = await timed(upload(t, BTN, paths));
    const o = await observe(x, t, R, q, r, { want: wantOf("BAD_PARAMS", message), dlg: `${R}-dlg${i + 1}` });
    leg(R, q, judgeChoose(o.obs, WANT.refuse), legs);
  }
  return finish(R, legs);
}
async function choose2(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-2", s = state(), a = fileOf(s, "s11-1k.bin"), legs: V[] = [];
  const tOut = await x.open(CH("c1", sumOf(s, "s11-out.bin"))), t = await x.open(CH("c1")); // the outside leg on its own page, whose digest test is the outside file's (MAJOR-2)
  const calls: Array<[string, Tab, () => Promise<unknown>, ReturnType<typeof wantOf>]> = [
    ["outside", tOut, upload(tOut, BTN, fileOf(s, "s11-out.bin")), wantOf(K["K-gate"].code, K["K-gate"].message)],
    // a missing file is refused by the SDK itself (K-missing, no wire call): the extension's own text is reached by the raw wire call, as the carried F-RAW rows do
    ["missing", t, () => x.c.call("uploadFiles", { tab: t.handle, locator: BTN, paths: [`${ROOT()}\\s11-missing.bin`], chooser: true }), wantOf("BAD_PARAMS", CH_MSG.missing)],
  ];
  if (x.opts.toggle === "off") calls.push(["noacc", t, upload(t, BTN, a), wantOf(K["K-noacc"].code, K["K-noacc"].message)]);
  else say(`CHECK ${R} leg=noacc NOT RUN ${EM} the file-URL toggle reads on (never pressed)`);
  await idle(R);
  const w = (await windowed(realIo, R, [], async () => { const o: Array<{ e?: Err; ms: number }> = []; for (const c of calls) o.push(await timed(c[2])); return o; })).v;
  const lines: Array<{ obs: ChooseObs; rep: Rep }> = [];
  for (const [i, c] of calls.entries()) lines.push(await observe(x, c[1], R, c[0], w[i]!, { want: c[3], sum: i === 0, dlg: i === 0 ? `${R}-dlg1` : undefined }));
  stopWhen(outsideReached(lines[0]!.rep), "outside-file-reached-page", "the page holds a file from outside the Upload folders");
  for (const [i, c] of calls.entries()) leg(R, c[0], judgeChoose(lines[i]!.obs, { ...WANT.choose2, answer: c[3].code }), legs);
  return finish(R, legs);
}
async function choose3(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-3", s = state(), legs: V[] = [], t = await x.open(CH("none"));
  const r = await timed(upload(t, BTN, fileOf(s, "s11-1k.bin")));
  const o = await observe(x, t, R, "none", r, { want: wantOf("TIMEOUT", CH_MSG.timeout), dlg: `${R}-dlg1` });
  leg(R, "none", judgeChoose(o.obs, WANT.choose3), legs);
  leg(R, "ms", judgeTimeoutMs(r.ms), legs);
  return finish(R, legs);
}
async function chooseKept(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-KEPT", s = state(), f = fileOf(s, "s11-1k.bin"), t = await x.open(CH("c1")), answers: boolean[] = [], codes: string[] = [], reps: Rep[] = [], ms: number[] = [];
  await idle(R);
  let first = 0, last = 0;
  const reads = await timeline(R, async () => {
    for (const i of [0, 1]) {
      const at = Date.now();
      if (i === 0) first = at; else await sleep(Math.max(0, 2_000 - (at - first)));
      const r = await timed(upload(t, BTN, f)); last = Date.now();
      answers.push(!r.e && sdkFiles(r.v) === 1); codes.push(code(r.e)); ms.push(r.ms); reps.push(await rep(x.c, t.handle));
    }
  });
  const banner = bannerSpan(reads, first, last + 4_500), dialog = Number(await sig(`${R}-dlg`));
  for (const [i, label] of (["first", "second"] as const).entries()) say(chooseLine(R, label, { answer: answers[i] ? "ok" : codes[i] === "ok" ? "ERROR" : codes[i]!, exact: null, files: reps[i]!.files, change: reps[i]!.change, clicks: reps[i]!.clicks, bytesEqual: reps[i]!.bytesEqual, dialog, ms: ms[i]! }));
  say(keepseqLine(R, { calls: 2, gapMs: 2_000, answersOk: answers.filter(Boolean).length, banner, endMs: bannerEndMs(reads, last), pollMs: pollMsOf(reads) }));
  const v = judgeKept(answers, reps.map((p) => p.change), reps[1]!.files, banner, x.ctl);
  const legs: V[] = [dialog === 0 ? v : "FAIL"];
  say(legLine(R, "kept", legs[0]!));
  return finish(R, legs);
}
async function chooseFrame(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-FRAME", s = state(), f = fileOf(s, "s11-1k.bin"), t = await x.open(CH("frame"));
  const FB = { role: "button", name: "Open frame chooser" } as const;
  let r = await timed(upload(t, FB, f)), via = "locator";
  if (r.e && r.e.code.startsWith("LOCATOR")) {
    const ref = (await t.snapshot()).elements.find((e) => e.name === "Open frame chooser")?.ref;
    if (ref) { r = await timed(upload(t, ref, f)); via = "ref"; } else via = "no-target";
  }
  const o = await observe(x, t, R, "frame", r, { dlg: `${R}-dlg1` });
  say(`CHECK ${R} reached-via=${via}`);
  const dv: V = o.obs.dialog === 0 ? "PASS" : "FAIL";
  say(legLine(R, "dialog", dv)); say(legLine(R, "frame", "RECORD")); // the row prints RECORD (s12-r19-c.ps1 $R19RecordRows) unless the dialog clause fails
  return finish(R, [dv]);
}
async function overlapB(x: Ctx): Promise<number> {
  const R = "R19-KEEP-OVERLAP", s = state(), f = fileOf(s, "s11-1k.bin"), t = await x.open(CH("none"));
  await idle(R);
  const [a, b] = await overlapRun(() => att(upload(t, BTN, f)), () => att(upload(t, BTN, f)), () => sleep(300));
  const p = await rep(x.c, t.handle);
  say(overlapLine(R, { leg: "chooser", first: code(a.e), second: code(b.e), exact: b.e !== undefined && overlapExact(b.e) }));
  const v = judgeOverlapChooser(a.e, b.e, p.clicks);
  say(`CHECK ${R} chooser page-clicks=${p.clicks}`); say(legLine(R, "chooser", v));
  return finish(R, [v]);
}

// ---- the rows that need window X (the wave's own window; PowerShell opens it on the leg's page: step `<id>-open`) ------------------------------------
async function human(x: Ctx, R: string, leg_: string, t: Tab, afterCall: () => Promise<void>): Promise<DlgObs & { change: number }> {
  const before = (await rep(x.c, t.handle)).change;
  await afterCall();
  const d = parseDlg(await sig(`${R}-${leg_}-click`));
  const change = (await rep(x.c, t.handle)).change - before; // what the dialog added: the call's own file is not counted
  return { ...d, change };
}
async function choose4(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-4", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [], humanOk = x.opts.human === "yes";
  if (!humanOk) { say(`CHECK ${R} NOT MEASURED ${EM} the human-style click opens no dialog`); say(legLine(R, "all", "NOT MEASURED")); return finish(R, ["NOT MEASURED"]); }
  const specs: Array<[string, string, string[]]> = [["a", "c1", [f]], ["b", "none", [f]], ["c", "single", [f, fileOf(s, "s11-sent.bin")]]];
  for (const [l, q, paths] of specs) {
    await sig(`${R}-${l}-open`);
    const t = await findTab(x.c, `s12x=c4${l}`);
    try {
      const r = await timed(upload(t, BTN, paths));
      const pre = chooseLegPrecond(l as "a", r.e, sdkFiles(r.v));
      say(`ANSWER ${R} ${l} ${code(r.e)}`); say(`CHECK ${R} leg=${l} precondition=${pre ? "met" : "not-met"}`);
      const d = await human(x, R, l, t, () => sleep(500));
      if (d.sent === false) say(`CHECK ${R} leg=${l} human-click not-sent`); else say(dialogLine(R, { leg: l as "a", before: d.before, afterClick: d.afterClick, afterClose: d.afterClose, ms: d.ms, change: d.change }));
      const v = judgeDialog(d, true, pre);
      if (v.startsWith("STOP")) say(`CHECK ${R} leg=${l} ${v}`); else say(legLine(R, l, v as V));
      stopOnDialog(v, `leg ${l} (${q})`);
      legs.push(v as V);
    } finally { await t.release().catch(() => undefined); stamp(); }
  }
  return finish(R, legs);
}
async function chooseDisarm(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-DISARM", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [];
  await sig(`${R}-open`);
  const t = await findTab(x.c, "s12x=disarm");
  try {
    const p = timed(upload(t, BTN, f));
    await sleep(1_000);
    await sig(`${R}-off`); // PowerShell presses the toolbar button (off) while the call waits
    const r = await p;
    await sig(`${R}-off-done`); // the button pressed again (on)
    const o = await observe(x, t, R, "none", r, { want: wantOf("DISARMED", MSG.disarmed, "keys:scope"), dlg: `${R}-dlg1` });
    leg(R, "answer", judgeChoose(o.obs, WANT.disarm) === "PASS" ? judgeDisarm(r.e, r.ms, o.rep) : "FAIL", legs);
    if (x.opts.human !== "yes") { say(`CHECK ${R} leg=a NOT MEASURED ${EM} the human-style click opens no dialog`); leg(R, "dialog", "NOT MEASURED", legs); return finish(R, legs); }
    const d = await human(x, R, "disarm", t, () => sleep(500));
    if (d.sent === false) say(`CHECK ${R} human-click not-sent`); else say(dialogLine(R, { leg: "a", before: d.before, afterClick: d.afterClick, afterClose: d.afterClose, ms: d.ms, change: d.change }));
    const v = judgeDialog(d, true, r.e?.code === "DISARMED"); // the dialog leg's precondition: the call ended DISARMED, so the interception was on and then off
    if (v.startsWith("STOP")) say(`CHECK ${R} dialog ${v}`); else leg(R, "dialog", v as V, legs);
    stopOnDialog(v, "after re-arming");
  } finally { await t.release().catch(() => undefined); stamp(); }
  return finish(R, legs);
}
async function chooseLate(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-LATE", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [];
  for (const ms of [4_900, 5_100] as const) {
    await sig(`${R}-${ms}-open`);
    const t = await findTab(x.c, `s12x=late${ms === 4_900 ? 49 : 51}`);
    try {
      const p = timed(upload(t, BTN, f));
      const dialog = Number(await sig(`${R}-${ms}-watch`)); // PowerShell reads for LATE_WATCH_MS from the call's start (8 000 ms after the click, whenever it came) and closes whatever opens
      const r = await p;
      const pg = await rep(x.c, t.handle);
      say(`ANSWER ${R} ${ms} ${code(r.e)}`);
      say(`CHECK ${R} ${ms} late=${pg.late}`); // the page's own key: click() returned (yes), threw (error) or never ran (no)
      say(lateLine(R, { openerMs: ms, opened: lateOpened(pg.files, dialog), dialog }));
      leg(R, String(ms), judgeLate(dialog), legs);
    } finally { await t.release().catch(() => undefined); stamp(); }
  }
  return finish(R, legs);
}
async function chooseHuman(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-HUMAN", s = state(), f = fileOf(s, "s11-1k.bin");
  await sig(`${R}-open`); // PowerShell opens the page with `#sum=<digest of s11-out.bin>`: the page's digest test is how an outside file shows
  const t = await findTab(x.c, "s12x=human");
  try {
    const p = timed(upload(t, BTN, f));
    await sleep(1_000);
    const d = parseDlg(await sig(`${R}-click`));
    const r = await p;
    if (d.sent === false) { say(`CHECK ${R} human-click not-sent`); say(legLine(R, "human", "NOT MEASURED")); return finish(R, ["NOT MEASURED"]); }
    const pg = await rep(x.c, t.handle, true), second = Number(await ev(x.c, t.handle, "document.getElementById('second').files.length"));
    say(`ANSWER ${R} call ${code(r.e)}`);
    say(humanLine(R, { received: humanReceived(second, pg.files), dialog: d.afterClick, files: pg.files }));
    stopWhen(outsideDigestHit(pg), "outside-file-reached-page", "the reporter holds the outside file");
    say(legLine(R, "human", "RECORD"));
    return finish(R, []);
  } finally { await t.release().catch(() => undefined); stamp(); }
}
async function chooseJsoff(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-JSOFF", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [];
  const t = await x.open(CH("c1")), ctl = await x.open("http://localhost:8081/s11-upload.html?s11=s12c");
  await sig(`${R}-js`); // JavaScript off
  await idle(R);
  const w = (await windowed(realIo, R, [], () => timed(upload(t, BTN, f)))).v;
  const c = await timed(() => ctl.upload({ css: "#up-single" }, f)); // no `chooser`: JavaScript off does not apply to it
  await sig(`${R}-js-done`); // JavaScript on again: the reporters are read now
  const o = await observe(x, t, R, "sdk", w, { want: wantOf("JS_DISABLED", MSG.jsOff), dlg: `${R}-dlg1` });
  leg(R, "sdk", judgeChoose(o.obs, WANT.jsoff), legs);
  const ci = (await ev(x.c, ctl.handle, "window.__s11.state().inputs['up-single']")) as { files: number; changeEvents: number };
  say(chooseLine(R, "control", { answer: code(c.e), exact: null, files: ci.files, change: ci.changeEvents, clicks: 0, bytesEqual: null, dialog: 0, ms: c.ms }));
  say(`CHECK ${R} control clicks=not-measured dialog=not-measured (the form's 0 is a placeholder: the page has no click counter and a plain upload clicks no opener; the control's pass rule does not use them)`);
  const cv: V = !c.e && sdkFiles(c.v) === 1 && ci.files === 1 ? "PASS" : "FAIL";
  stopWhen(c.e !== undefined, "existing-tool-changed", "an upload without chooser was refused while JavaScript is off");
  leg(R, "control", cv, legs);
  return finish(R, legs);
}

// ---- the MCP legs (the headless MCP actor, tool search off) ----------------------------------------------------------------------------------------
async function mcpTab(m: Mcp, url: string): Promise<string> { const h = handleOf((await m.call("browser_new_tab", { url })).text); await sleep(1_500); return h; }
async function mcpRep(m: Mcp, h: string): Promise<{ files: number; change: number; clicks: number }> {
  const k = /(\d+),(\d+),(\d+)/.exec((await m.call("browser_evaluate", { tab: h, expression: "[window.__s12ch.files, window.__s12ch.change, window.__s12ch.clicks].join(',')" })).text);
  return { files: k ? Number(k[1]) : -1, change: k ? Number(k[2]) : -1, clicks: k ? Number(k[3]) : -1 };
}
const word = mcpCodeOf;
async function mcpLeg(m: Mcp, R: string, label: string, url: string, args: Record<string, unknown>, judge: (r: { text: string; isError: boolean }) => V, want: { files: number; change?: number }, dlg: string): Promise<V> {
  const h = await mcpTab(m, url), t0 = Date.now();
  const r = await m.call("browser_upload_file", { tab: h, ...args });
  const ms = Date.now() - t0, p = await mcpRep(m, h), dialog = Number(await sig(dlg));
  say(chooseLine(R, label, { answer: word(r), exact: word(r) !== "ok" ? judge(r) === "PASS" : null, files: p.files, change: p.change, clicks: p.clicks, bytesEqual: null, dialog, ms }));
  await m.call("browser_close_tab", { tab: h });
  return judge(r) === "PASS" && p.files === want.files && (want.change === undefined || p.change === want.change) && dialog === 0 ? "PASS" : "FAIL";
}
async function chooseMcp(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-MCP", s = state(), f = fileOf(s, "s11-1k.bin"), w = fileWant(s, "s11-1k.bin"), forbidden = [ROOT(), s.sentinel], m = await x.mcp(), legs: V[] = [];
  const ok = (r: { text: string; isError: boolean }): V => judgeMcpOk(r, w, forbidden);
  leg(R, "a", await mcpLeg(m, R, "a", CH("c1"), { locator: BTN, paths: [f], chooser: true }, ok, { files: 1, change: 1 }, `${R}-dlg1`), legs);
  leg(R, "b", await mcpLeg(m, R, "b", CH("c1"), { locator: { css: "#in" }, paths: [f], chooser: true }, ok, { files: 1, change: 1 }, `${R}-dlg2`), legs);
  leg(R, "c", await mcpLeg(m, R, "c", CH("none"), { locator: BTN, paths: [f], chooser: true }, (r) => judgeMcpErr(r, "TIMEOUT", CH_MSG.timeout), { files: 0 }, `${R}-dlg3`), legs);
  const h = await mcpTab(m, "http://localhost:8081/s11-upload.html?s11=s12c");
  const e = await m.call("browser_upload_file", { tab: h, locator: { css: "#up-single" }, paths: [f] });
  await m.call("browser_close_tab", { tab: h });
  const ev_ = !e.isError && e.text === mcpOkText("css #up-single", [w]);
  say(`CHECK ${R} e form=${ev_ ? "run16" : "other"}`);
  stopWhen(!ev_, "existing-tool-changed", "an upload without chooser answered in another form");
  leg(R, "e", "PASS", legs);
  return finish(R, legs);
}
async function chooseMcpD(x: Ctx): Promise<number> {
  const R = "R19-CHOOSE-MCP", s = state(), f = fileOf(s, "s11-1k.bin"), m = await x.mcp(), legs: V[] = [];
  const h = await mcpTab(m, CH("c1"));
  await sig(`${R}-d-js`); // JavaScript off
  const t0 = Date.now(), r = await m.call("browser_upload_file", { tab: h, locator: BTN, paths: [f], chooser: true });
  const ms = Date.now() - t0;
  await sig(`${R}-d-js-done`);
  const p = await mcpRep(m, h), dialog = Number(await sig(`${R}-d-dlg`));
  say(chooseLine(R, "d", { answer: word(r), exact: null, files: p.files, change: p.change, clicks: p.clicks, bytesEqual: null, dialog, ms }));
  await m.call("browser_close_tab", { tab: h });
  leg(R, "d", judgeMcpErr(r, "JS_DISABLED") === "PASS" && p.files === 0 && p.clicks === 0 && dialog === 0 ? "PASS" : "FAIL", legs);
  return finish(R, legs);
}

// ---- G2: three clients of the actor (A the trusted input, B the default screenshot, C the status poller), one clock -----------------------------------
const PLAY = (q: string, extra = ""): string => `http://localhost:8081/e2e-playground.html?s12=${q}${extra}`;
async function g2Clients(): Promise<{ a: Client; b: Client; c: Client; close: () => void }> {
  const { connect } = await import("../sdk/src/index.js");
  const [a, b, c] = [await connect({ name: "s12-r19-g2-a", failureReports: false }), await connect({ name: "s12-r19-g2-b", failureReports: false }), await connect({ name: "s12-r19-g2-c", failureReports: false })];
  return { a, b, c, close: () => { a.close(); b.close(); c.close(); } };
}
const shot = (b: Client, h: string): Promise<unknown> => b.call("screenshot", { tab: h }, { timeoutMs: 30_000 });
/** The third client's 50 ms `daemon.status` polls, until `stop()` is called. */
function pollHolder(c: Client): { polls: Array<{ t: number; h?: string }>; stop: () => Promise<void> } {
  const polls: Array<{ t: number; h?: string }> = []; let go = true;
  const loop = (async () => { while (go) { const st = (await c.status().catch(() => ({}))) as { lock?: { holder?: string } }; polls.push({ t: Date.now(), h: st.lock?.holder }); await sleep(50); } })();
  return { polls, stop: async () => { go = false; await loop; } };
}
async function g2Open(R: string, cl: Awaited<ReturnType<typeof g2Clients>>): Promise<{ ta: Tab; tb: Tab; ref: string; refTb: string }> {
  const tb = await cl.b.newTab(PLAY("g2b"), { active: true }); // B's tab first, in the window the wave stands in
  await sleep(1_500);
  await sig(`${R}-open`); // PowerShell opens window X on the A page
  const ta = await findTab(cl.a, "s12x=g2a");
  return { ta, tb, ref: (await ta.locate({ css: "#s12-btn" })).ref, refTb: (await ta.locate({ css: "#tb" })).ref };
}
async function g2One(cl: Awaited<ReturnType<typeof g2Clients>>, tb: Tab, send: () => Promise<unknown>): Promise<{ aSentAt: number; aReplyAt: number; bReplyAt: number; a: string; b: string; polls: Array<{ t: number; h?: string }> }> {
  const poll = pollHolder(cl.c), aSentAt = Date.now();
  const pa = att(send).then((r) => ({ r, at: Date.now() }));
  await sleep(100);
  const pb = att(() => shot(cl.b, tb.handle)).then((r) => ({ r, at: Date.now() }));
  const [a, b] = [await pa, await pb];
  await sleep(100); await poll.stop();
  return { aSentAt, aReplyAt: a.at, bReplyAt: b.at, a: code(a.r.e), b: code(b.r.e), polls: poll.polls };
}
async function g2One_(_x: Ctx): Promise<number> {
  const R = "R19-G2-1", cl = await g2Clients(); let tb: Tab | undefined;
  try {
    const o = await g2Open(R, cl); tb = o.tb;
    const passes: Array<[string, () => Promise<unknown>]> = [["raw", () => cl.a.call("click", { tab: o.ta.handle, ref: o.ref, trusted: true }, { timeoutMs: 30_000 })], ["focusFirst", () => o.ta.click(o.ref, { trusted: true })]];
    const legs: V[] = [];
    for (const [label, send] of passes) {
      await sleep(1_000);
      const r = await g2One(cl, o.tb, send);
      const effect = Number(await ev(cl.a, o.ta.handle, "window.__s12.clicks"));
      const obs: G2Obs = { aReplyMs: r.aReplyAt - r.aSentAt, bReplyMs: r.bReplyAt - r.aSentAt, rawGapMs: r.bReplyAt - r.aReplyAt, holderAfterReplyMs: holderAfterMs(r.polls, "s12-r19-g2-a", r.aReplyAt), aEffect: effect, b: r.b, a: r.a };
      if (label === "raw") { say(g2Line(R, { ...obs, gapMs: Math.max(0, obs.rawGapMs) })); say(`CHECK ${R} raw-gap-ms=${obs.rawGapMs} a=${r.a}`); leg(R, "raw", judgeG2(obs), legs); }
      else say(`CHECK ${R} variant=focusFirst a-reply=${obs.aReplyMs} b-reply=${obs.bReplyMs} gap-ms=${obs.rawGapMs} holder-after-reply-ms=${obs.holderAfterReplyMs} (recorded, not judged)`);
    }
    return finish(R, legs);
  } finally { await tb?.close().catch(() => undefined); cl.close(); }
}
async function g2Two(_x: Ctx): Promise<number> {
  const R = "R19-G2-2", cl = await g2Clients(); let tb: Tab | undefined;
  try {
    const o = await g2Open(R, cl); tb = o.tb;
    const legs: V[] = [];
    for (const round of [1, 2, 3, 4, 5]) {
      await ev(cl.a, o.ta.handle, "(document.getElementById('tb').value = '', true)");
      const poll = pollHolder(cl.c), aSentAt = Date.now(), calls: TypeRound["calls"] = [];
      let aReplyAt = 0, aOk = false;
      const pa = att(() => cl.a.call("type", { tab: o.ta.handle, ref: o.refTb, text: G2_TEXT, trusted: true }, { timeoutMs: 30_000 })).then((r) => { aReplyAt = Date.now(); aOk = !r.e; });
      await sleep(30);
      let done = false; void pa.then(() => { done = true; });
      while ((!done || calls.length < 3) && calls.length < 8) { const sentAt = Date.now(), r = await att(() => shot(cl.b, o.tb.handle)); calls.push({ sentAt, replyAt: Date.now(), code: code(r.e) }); }
      await pa; await sleep(100); await poll.stop();
      const got = gotOf(String(await ev(cl.a, o.ta.handle, "document.getElementById('tb').value")));
      const holderSeen = poll.polls.some((p) => p.h === "s12-r19-g2-a" && p.t >= aSentAt && p.t <= aReplyAt + 450);
      say(g2typeLine({ round, got, bCalls: calls.length, bOk: calls.filter((c) => c.code === "ok").length, bLockTimeout: calls.filter((c) => c.code === "LOCK_TIMEOUT").length }));
      leg(R, `round${round}`, judgeTypeRound({ got, calls, aSentAt, aReplyAt, aOk, holderSeen }), legs);
    }
    return finish(R, legs);
  } finally { await tb?.close().catch(() => undefined); cl.close(); }
}

/** `dialogs --slice <s> --native <n> --devtools <n> --windows <n>`: form (30), read by PowerShell's UIA at R19-RESTORE (no call, counts only). */
function dialogsCmd(argv: string[]): number {
  const o: Record<string, string> = {}; for (let i = 0; i < argv.length; i += 2) o[argv[i]!.replace(/^--/, "")] = argv[i + 1] ?? "";
  say(dialogsLine(o.slice ?? "", { native: Number(o.native), devtools: Number(o.devtools), waveWindowsOpen: Number(o.windows) }));
  return 0;
}
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "choose-1": (a) => run("choose1", a, choose1, "R19-CHOOSE-1"), "choose-label": (a) => run("choosel", a, chooseLabel, "R19-CHOOSE-LABEL"), "choose-refuse": (a) => run("choosef", a, chooseRefuse, "R19-CHOOSE-REFUSE"),
  "choose-2": (a) => run("choose2", a, choose2, "R19-CHOOSE-2"), "choose-3": (a) => run("choose3", a, choose3, "R19-CHOOSE-3"), "choose-kept": (a) => run("choosek", a, chooseKept, "R19-CHOOSE-KEPT"),
  "choose-frame": (a) => run("choosefr", a, chooseFrame, "R19-CHOOSE-FRAME"), "overlap-b": (a) => run("overlapb", a, overlapB, "R19-KEEP-OVERLAP"), "choose-4": (a) => run("choose4", a, choose4),
  "choose-disarm": (a) => run("choosed", a, chooseDisarm), "choose-late": (a) => run("choosela", a, chooseLate), "choose-human": (a) => run("chooseh", a, chooseHuman), "choose-jsoff": (a) => run("choosej", a, chooseJsoff),
  "choose-mcp": (a) => run("choosem", a, chooseMcp, "R19-CHOOSE-MCP"), "choose-mcp-d": (a) => run("choosemd", a, chooseMcpD), "g2-1": (a) => run("g21", a, g2One_), "g2-2": (a) => run("g22", a, g2Two), dialogs: async (a) => dialogsCmd(a),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

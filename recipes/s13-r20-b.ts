// Step 13 S5-drivers-B2/B3: the actors of liveB20's rows R20-CHOOSE-TWICE, R20-CHOOSE-KEPT, R20-CHOOSE-REFUSE-DIS (B2), R20-G2-1 and R20-VERSION (B3) (docs/e2e-test-plan.md section 4.28) and their pure judges.
// Same contract as s13-r20-a.ts: the sheet's line forms through s13-forms.ts, `LEG <row> <label> <verdict>` lines (recipes/s13-r20.ps1 turns them into the row's one ROW), exit 0 pass,
// 1 fail, 2 STOP (`STOPWHY <reason>`), 3 not measured. NOT run against Chrome by its author. Counts and fixed words only. Run 19's chooser judges are not reused (they pin the overlap
// text); the judges below sit on busyExact / namesDevtools / mcpLineVerdict / disClass / disVerdict and the product's own constants. The native-dialog count is the PowerShell side's:
// the actor asks for it through `sig(<row>-dlg)` (TWICE), `sig(<row>-<leg>-dlg)` (KEPT: different, same; REFUSE-DIS: btn, flip, self) and reads a count.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHOOSER_TIMEOUT_MESSAGE } from "../extension/src/upload-files.js";
import { att, finish, handleOf, HelperDefect, legLine, run, say, sig, sleep, StopWhy, URL, type Ctx, type Err, type Mcp, type V } from "./s12-r19-a.js";
import { code, ev, fileOf, findTab, ROOT, state } from "./s12-r19-b.js";
import { holderAfterMs, judgeG2, type G2Obs } from "./s12-r19-c.js";
import { hintOf } from "./s12-r19-de.js";
import { g2Line, versionchLine } from "./s12-forms-c.js";
import { rawLeaks } from "./s11-rules.js";
import { CHOOSER_RELOAD_HINT } from "../daemon/src/intercept.js";
import { busyExact, chkeptLine, chooseLine20, disBaselineOk, disClass, disVerdict, MCP_LINES, mcplineLine, mcpLineRead, mcpLineVerdict, namesDevtools, rectLine, type DisAnswer, type McpRead } from "./s13-forms.js";
type Tab = import("../sdk/src/index.js").Tab;
type Client = import("../sdk/src/index.js").BridgeClient;
const BTN = { role: "button", name: "Open chooser" } as const;
export const CHOOSER_TIMEOUT_CODE = "TIMEOUT";
/** Call 1 of TWICE ends at its 5 s chooser wait counted from its own send (attach included): Run 19's margins for the same wait (R19-CHOOSE-3, 4 900 to 8 000 ms). */
export const CALL1_MS: readonly [number, number] = [4_900, 8_000];
/** Call 2 is refused after the prologue, before any page call or attach: within 1 000 ms of its send. */
export const BUSY_MS_MAX = 1_000;
/** An MCP that runs the two calls one after the other answers call 2 only after call 1's wait: at least this long after call 1's reply. */
export const SERIAL_GAP_MS = 4_000;
export interface Ans { code: string; message?: string; data?: unknown; ms: number }
export interface Page3 { clicks: number; files: number; change: number }
// ---- R20-CHOOSE-TWICE -------------------------------------------------------------------------------------------------------------------------
/** The SDK leg: call 2 the busy refusal, exactly, within 1 000 ms, naming neither DevTools nor Close; the page saw one click and no file; call 1 TIMEOUT with the chooser text at about 5 s. */
export function judgeTwiceSdk(o: { c1: Ans; c2: Ans; page: Page3 }): V {
  const { c1, c2, page } = o;
  const second = busyExact(c2) && c2.ms < BUSY_MS_MAX && !namesDevtools(c2.message ?? "") && page.clicks === 1 && page.files === 0 && page.change === 0;
  const first = c1.code === CHOOSER_TIMEOUT_CODE && c1.message === CHOOSER_TIMEOUT_MESSAGE && c1.data === undefined && c1.ms >= CALL1_MS[0] && c1.ms <= CALL1_MS[1];
  return second && first ? "PASS" : "FAIL";
}
/** The MCP leg is read by its own text and isError (the bare busy message). `serialised`: the MCP sent call 2 only after call 1 returned (text other, reply 4 000 ms or more after call 1's): NOT MEASURED. */
export function judgeTwiceMcp(r2: McpRead, replyGapMs: number): V {
  if (r2.text === "other" && replyGapMs >= SERIAL_GAP_MS) return "NOT MEASURED";
  return mcpLineVerdict(r2);
}
/** The control upload (slot freed, no interception left on): ok with the file on the page, else the STOP. */
export const controlOk = (c: { code: string; files: number; change: number }): boolean => c.code === "ok" && c.files === 1 && c.change === 1;
// ---- R20-CHOOSE-KEPT ----------------------------------------------------------------------------------------------------------------------------
export interface KeptRead { answer: string; clicks: number; input: number; change: number; cancel: number; files: number; digest: string | null }
/** Leg `different`: both calls ok; after call 2 change=2, input=2, cancel=0, files=1 and the page's digest differs from call 1's. Every clause but the digest is judged first (an ok the page never received is a FAIL); NOT MEASURED only when they all hold and a digest is still unreadable. */
export function judgeKeptDifferent(c1: KeptRead, c2: KeptRead): V {
  const counters = c1.answer === "ok" && c2.answer === "ok" && c2.change === 2 && c2.input === 2 && c2.cancel === 0 && c2.files === 1;
  if (!counters) return "FAIL";
  if (c1.digest === null || c2.digest === null) return "NOT MEASURED";
  return c2.digest !== c1.digest ? "PASS" : "FAIL";
}
export const digestDiffers = (c1: KeptRead, c2: KeptRead): boolean | null => (c1.digest === null || c2.digest === null ? null : c1.digest !== c2.digest);
/** The prelude: the two files must have different digests, else the leg could not show a second selection. The wave state holds each file's SHA-256 from its creation. */
export const digestsDiffer = (a: string | undefined, b: string | undefined): boolean => a !== undefined && b !== undefined && a !== "" && b !== "" && a !== b;
// ---- R20-CHOOSE-REFUSE-DIS ----------------------------------------------------------------------------------------------------------------------
/** The row's verdict by the sheet: `flip` decides (disVerdict); `ok` with files on `self` is a FAIL even beside a refusing `flip`; a RECORD or PASS needs `btn` to read TIMEOUT, else NOT DISCRIMINATING. */
export function judgeRefuseDis(a: { btn: DisAnswer; flip: DisAnswer; self: DisAnswer }): string {
  const v = disVerdict({ flip: a.flip, self: a.self });
  if (v === "FAIL" || disClass(a.self) === "file-set") return "FAIL";
  return disBaselineOk(a.btn) ? v : "NOT DISCRIMINATING";
}
// ---- the actor's world --------------------------------------------------------------------------------------------------------------------------
const S12CH = (q: string): string => URL(q, "s12-chooser.html");
const S13CH = (q: string): string => `http://localhost:8081/s13-chooser.html?s13=${q}`;
const timed = async <T>(f: () => Promise<T>): Promise<{ e?: Err; v?: T; ms: number; at: number }> => { const t0 = Date.now(); const r = await att(f); return { ...r, ms: Date.now() - t0, at: Date.now() }; };
const upload = (t: Tab, target: Parameters<Tab["upload"]>[0], f: string) => (): Promise<unknown> => t.upload(target, f, { chooser: true });
const ansOf = (r: { e?: Err; ms: number }): Ans => ({ code: code(r.e), message: r.e?.message, data: r.e?.data, ms: r.ms });
const bool01 = (n: number): 0 | 1 => (n === 0 ? 0 : 1);
async function page12(c: Client, h: string): Promise<Page3> {
  return (await ev(c, h, "({clicks: window.__s12ch.clicks, files: window.__s12ch.files, change: window.__s12ch.change})")) as Page3;
}
interface Rep13 { clicks: number; input: number; change: number; cancel: number; files: number; digest: string | null }
async function page13(c: Client, h: string, wantDigest: "none" | "set" | { not: string | null }): Promise<Rep13> {
  for (let i = 0; ; i++) {
    const r = (await ev(c, h, "({clicks: window.__s13ch.clicks, input: window.__s13ch.input, change: window.__s13ch.change, cancel: window.__s13ch.cancel, files: window.__s13ch.files, digest: window.__s13ch.digest})")) as Rep13;
    const done = wantDigest === "none" || (wantDigest === "set" ? r.digest !== null : r.digest !== null && r.digest !== wantDigest.not);
    if (done || i >= 20) return r;
    await sleep(100);
  }
}
const sha = (n: string): string | undefined => (state().files[n] as unknown as { sha256?: string } | undefined)?.sha256;
/** The dialog count the PowerShell value step answers: a non-negative integer, else a HelperDefect (an unreadable count must never read as "no dialog"). */
export function parseDialogCount(raw: string): number {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) throw new HelperDefect("the dialog count is not a non-negative integer");
  return Number(t);
}
const dlgN = async (name: string): Promise<number> => parseDialogCount(await sig(name));
/** Control upload on s12=c1 over the SDK: ok with the file on the page. A failure is the STOP `chooser-interception-left-on` (after the caller printed its lines). */
async function control(x: Ctx, f: string): Promise<{ ok: boolean; code: string; page: Page3; ms: number }> {
  const t = await x.open(S12CH("c1"));
  const r = await timed(upload(t, BTN, f));
  await sleep(300);
  const p = await page12(x.c, t.handle);
  return { ok: controlOk({ code: code(r.e), files: p.files, change: p.change }), code: code(r.e), page: p, ms: r.ms };
}
const controlLine = (R: string, c: { code: string; page: Page3; ms: number }, dialog: number): string => chooseLine20(R, "c1", { answer: c.code, exact: null, files: c.page.files, change: c.page.change, clicks: c.page.clicks, bytesEqual: null, dialog, ms: c.ms, namesDevtools: false });
/** The row's STOPs, control first: a control upload that is not ok means the interception is still on; a native dialog left open. The actor throws it, run() prints `STOPWHY <why>` and exits 2. */
export function stopFor(R: string, o: { controlOk: boolean; dialogs: readonly number[] }): StopWhy | undefined {
  if (!o.controlOk) return new StopWhy("chooser-interception-left-on", `${R} control upload`);
  if (o.dialogs.some((n) => n > 0)) return new StopWhy("dialog-left-open", `${R} a native dialog`);
  return undefined;
}
// Departure from the sheet (F3): the prelude compares the SHA-256 that `s11.ts make` stored in state.json, not page-computed digests (equal bytes give equal digests either way); the leg itself compares the page's.
/** KEPT's prelude: equal or unknown digests of the two files stop the row before any call. */
export const preludeStop = (R: string, a: string | undefined, b: string | undefined): StopWhy | undefined => (digestsDiffer(a, b) ? undefined : new StopWhy("throw-after-state", `${R} prelude: the two files' digests are equal or unknown`));
const raise = (s: StopWhy | undefined): void => { if (s) throw s; };

async function chooseTwice(x: Ctx): Promise<number> {
  const R = "R20-CHOOSE-TWICE", f = fileOf(state(), "s11-1k.bin"), legs: V[] = [];
  const t = await x.open(S12CH("none"));
  const p1 = timed(upload(t, BTN, f));
  await sleep(500);
  const p2 = timed(upload(t, BTN, f));
  const [r1, r2] = [await p1, await p2];   // r2's ms counts from its own send
  const page = await page12(x.c, t.handle);
  // Departure from the sheet (F4): the sheet says the MCP "claims its own none tab"; it opens one with browser_new_tab (it holds it), as Run 19's MCP legs do.
  // the MCP leg: its own tab, two calls without awaiting the first
  const m: Mcp = await x.mcp();
  const mh = handleOf((await m.call("browser_new_tab", { url: S12CH("none") })).text); await sleep(1_500);
  const call = (): Promise<{ text: string; isError: boolean; at: number }> => m.call("browser_upload_file", { tab: mh, locator: BTN, paths: [f], chooser: true }).then((r) => ({ ...r, at: Date.now() }));
  const m1 = call(); await sleep(500); const m2 = call();
  const [mr1, mr2] = [await m1, await m2];
  const mcp = mcpLineRead(mr2, MCP_LINES.busy);
  const c = await control(x, f);
  const dialog = await dlgN(`${R}-dlg`);
  const a1 = ansOf(r1), a2 = ansOf(r2);
  say(chooseLine20(R, "call1", { answer: a1.code, exact: a1.code === CHOOSER_TIMEOUT_CODE ? a1.message === CHOOSER_TIMEOUT_MESSAGE : null, files: page.files, change: page.change, clicks: page.clicks, bytesEqual: null, dialog, ms: a1.ms, namesDevtools: namesDevtools(a1.message ?? "") }));
  say(chooseLine20(R, "call2", { answer: a2.code, exact: busyExact(a2), files: page.files, change: page.change, clicks: page.clicks, bytesEqual: null, dialog, ms: a2.ms, namesDevtools: namesDevtools(a2.message ?? "") }));
  const sdk = judgeTwiceSdk({ c1: a1, c2: a2, page });
  say(legLine(R, "sdk", sdk)); legs.push(sdk);
  const mv = judgeTwiceMcp(mcp, mr2.at - mr1.at);
  if (mv === "NOT MEASURED") say(`CHECK ${R} mcp NOT MEASURED — the MCP serialised the calls`);   // no LEG line: the SDK leg alone decides the row
  else { say(mcplineLine(R, { leg: "mcp", ...mcp })); say(legLine(R, "mcp", mv)); legs.push(mv); }
  say(controlLine(R, c, dialog));
  raise(stopFor(R, { controlOk: c.ok, dialogs: [dialog] }));
  return finish(R, legs);
}

async function chooseKept(x: Ctx): Promise<number> {
  const R = "R20-CHOOSE-KEPT", s = state(), one = fileOf(s, "s11-1k.bin"), two = fileOf(s, "s11-sent.bin"), legs: V[] = [];
  raise(preludeStop(R, sha("s11-1k.bin"), sha("s11-sent.bin")));
  const pair = async (leg: "different" | "same", second: string): Promise<{ r: KeptRead[]; dialog: number }> => {
    const t = await x.open(S13CH("kept")), r: KeptRead[] = [];
    let d1: string | null = null;
    for (const [i, f] of [one, second].entries()) {
      if (i === 1) await sleep(2_000);
      const a = await att(upload(t, BTN, f)); await sleep(300);
      const p = await page13(x.c, t.handle, i === 0 ? "set" : { not: d1 });
      d1 = i === 0 ? p.digest : d1;
      r.push({ answer: code(a.e), ...p });
    }
    return { r, dialog: await dlgN(`${R}-${leg}-dlg`) };
  };
  const print = (leg: "different" | "same", r: KeptRead[]): void => r.forEach((k, i) => say(chkeptLine(R, { leg, call: (i + 1) as 1 | 2, answer: k.answer, clicks: k.clicks, input: k.input, change: k.change, cancel: k.cancel, files: bool01(k.files), digestDiffers: i === 0 ? null : digestDiffers(r[0]!, k) })));
  const d = await pair("different", two);
  print("different", d.r);
  const vd = judgeKeptDifferent(d.r[0]!, d.r[1]!);
  say(legLine(R, "different", vd)); legs.push(vd);
  const sm = await pair("same", one);
  print("same", sm.r);   // a record, not judged: whether Chrome fires input / change for an identical second selection, and whether cancel fires
  say(`CHECK ${R} same identical-selection-change=${sm.r[1]!.change} input=${sm.r[1]!.input} cancel=${sm.r[1]!.cancel}`);
  say(legLine(R, "same", "RECORD")); legs.push("RECORD");
  const c = await control(x, one);
  say(controlLine(R, c, d.dialog + sm.dialog));
  raise(stopFor(R, { controlOk: c.ok, dialogs: [d.dialog, sm.dialog] }));
  return finish(R, legs);
}

async function chooseRefuseDis(x: Ctx): Promise<number> {
  const R = "R20-CHOOSE-REFUSE-DIS", f = fileOf(state(), "s11-1k.bin");
  const got: Record<string, DisAnswer> = {}, dialogs: number[] = [];
  for (const [leg, page, target] of [["btn", "disbtn", BTN], ["flip", "disflip", BTN], ["self", "disself", { css: "#dis" }]] as const) {
    const t = await x.open(S13CH(page));
    const r = await timed(upload(t, target, f)); await sleep(300);
    const p = await page13(x.c, t.handle, "none");
    const dialog = await dlgN(`${R}-${leg}-dlg`); dialogs.push(dialog);
    const a = ansOf(r);
    got[leg] = { code: a.code, message: a.message, files: p.files, change: p.change, data: a.data };
    const cls = disClass(got[leg]!);
    say(chooseLine20(R, leg, { answer: a.code, exact: a.code === "ok" ? null : cls === "refused" || cls === "timeout", files: p.files, change: p.change, clicks: p.clicks, bytesEqual: null, dialog, ms: a.ms, namesDevtools: namesDevtools(a.message ?? "") }));
  }
  const v = judgeRefuseDis({ btn: got.btn!, flip: got.flip!, self: got.self! });
  say(`CHECK ${R} baseline-btn=${disBaselineOk(got.btn!) ? "timeout" : "other"} flip=${disClass(got.flip!)} self=${disClass(got.self!)}`);
  const verdict: V = v.startsWith("RECORD") ? "RECORD" : (v as V);
  if (verdict === "RECORD") say(`CHECK ${R} ${v}`);
  say(legLine(R, "row", verdict));
  raise(stopFor(R, { controlOk: true, dialogs }));
  return finish(R, [verdict]);
}

// ---- R20-G2-1 (B3): window rectangles, the alone-control, the two legs --------------------------------------------------------------------------
export interface Rect { x: number; y: number; w: number; h: number }
export interface WinRead { rect: Rect; z: number; above: Rect[] }
export interface Rects { wa: Rect; wins: Record<"A" | "B" | "X", WinRead> }
const INT = /^-?\d+$/;
function nums(s: string, n: number): number[] {
  const p = s.split(",");
  if (p.length !== n || !p.every((t) => INT.test(t))) throw new HelperDefect("a window rectangle answer is malformed");
  return p.map(Number);
}
const rectOf = (s: string): Rect => { const [x, y, w, h] = nums(s, 4) as [number, number, number, number]; if (w < 0 || h < 0) throw new HelperDefect("a window rectangle answer is malformed"); return { x, y, w, h }; };
/** The PowerShell value step's answer: `wa=x,y,w,h;A=x,y,w,h,z|ax,ay,aw,ah|…;B=…;X=…` (numbers only; `above` = the visible top-level windows above it in z-order, taskbars left out). A malformed answer is a HelperDefect, never a guess. */
export function parseRects(raw: string): Rects {
  const m: Record<string, string> = {};
  for (const seg of raw.trim().split(";")) { const i = seg.indexOf("="); if (i < 1) throw new HelperDefect("a window rectangle answer is malformed"); m[seg.slice(0, i)] = seg.slice(i + 1); }
  const win = (k: string): WinRead => {
    const v = m[k]; if (v === undefined) throw new HelperDefect("a window rectangle answer misses a window");
    const [head = "", ...up] = v.split("|"), h = nums(head, 5);
    if (h[4]! < 0) throw new HelperDefect("a window rectangle answer is malformed");
    return { rect: { x: h[0]!, y: h[1]!, w: h[2]!, h: h[3]! }, z: h[4]!, above: up.filter((u) => u !== "").map(rectOf) };
  };
  if (m.wa === undefined) throw new HelperDefect("a window rectangle answer misses the work area");
  return { wa: rectOf(m.wa), wins: { A: win("A"), B: win("B"), X: win("X") } };
}
const meet = (a: Rect, b: Rect): Rect | null => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), r = Math.min(a.x + a.w, b.x + b.w), d = Math.min(a.y + a.h, b.y + b.h); return r > x && d > y ? { x, y, w: r - x, h: d - y } : null; };
/** Pixels of `target` (cut to `clip`, the display's work area, so the taskbar strip is outside) that lie under the union of the rectangles above it. */
export function coveredPx(target: Rect, above: readonly Rect[], clip: Rect): number {
  const t = meet(target, clip); if (!t) return 0;
  const cut = above.map((a) => meet(a, t)).filter((r): r is Rect => r !== null);
  const xs = [...new Set(cut.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b), ys = [...new Set(cut.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
  let px = 0;
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < ys.length; j++) {
    if (cut.some((r) => r.x <= xs[i]! && xs[i + 1]! <= r.x + r.w && r.y <= ys[j]! && ys[j + 1]! <= r.y + r.h)) px += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!);
  }
  return px;
}
export const winCovered = (r: Rects, k: "A" | "B" | "X"): number => coveredPx(r.wins[k].rect, r.wins[k].above, r.wa);
/** The placement step answers `ok`, or `refused <word>` (a window the wave did not open, a minimized one, no room): anything else is a HelperDefect. */
export function parsePlace(raw: string): boolean {
  const t = raw.trim();
  if (t === "ok") return true;
  if (/^refused [a-z-]+$/.test(t)) return false;
  throw new HelperDefect("the placement answer is neither ok nor refused");
}
/** B waited out its 30 s client timeout (counted from A's send; B was sent 100 ms later). */
export const G2_B_TIMEOUT_MS = 30_000;
export const bTimedOut = (b: string, bReplyMs: number): boolean => b !== "ok" && b !== "LOCK_TIMEOUT" && bReplyMs >= G2_B_TIMEOUT_MS;
/** One leg: the R19 pass rule (A ok first, gap >= 450, holder >= 450, one effect, B ok); B's tab coverage is read by the caller. */
export const judgeG2Leg = (o: G2Obs): V => judgeG2(o);
export interface G2Leg { v: V; bTimedOut: boolean; usable: boolean }
/** The row's two legs and the cause the sheet names: covered times out while uncovered passes = "capture of a covered window"; both time out = not established. An unusable leg (alone-control failed, window not uncovered) is already NOT DISCRIMINATING and names no cause. */
export function g2Rows(cov: G2Leg, unc: G2Leg): { covered: V; uncovered: V; cause?: string } {
  const out = { covered: cov.v, uncovered: unc.v };
  if (!cov.usable || !unc.usable) return out;
  if (cov.bTimedOut && unc.bTimedOut) return { ...out, cause: "not established, rectangles recorded" };
  if (cov.v === "FAIL" && cov.bTimedOut && unc.v === "PASS") return { ...out, cause: "capture of a covered window" };
  return out;
}
/** Whether a leg may run. Checked in two steps as the facts arrive: `{ placeOk }` before the rectangles are read (uncovered leg only; a refused placement = NOT MEASURED), then `{ aloneErr, bCov }` (the alone-control failed, or the uncovered leg's WB is not at 0 px covered-by-others = NOT DISCRIMINATING). A field not yet known is left out. */
export function g2LegGate(leg: "covered" | "uncovered", f: { placeOk?: boolean; aloneErr?: boolean; bCov?: number }): V | "run" {
  if (leg === "uncovered" && f.placeOk === false) return "NOT MEASURED";
  if (f.aloneErr === true) return "NOT DISCRIMINATING";
  if (leg === "uncovered" && f.bCov !== undefined && f.bCov !== 0) return "NOT DISCRIMINATING";
  return "run";
}
/** The CHECK line for the rectangles read after a leg: a malformed answer prints `unread` and never costs the leg its LEG line. */
export function afterCheckLine(R: string, leg: string, raw: string): string {
  try { return `CHECK ${R} ${leg} b-covered-after-px=${winCovered(parseRects(raw), "B")}`; } catch (e) { if (e instanceof HelperDefect) return `CHECK ${R} ${leg} b-covered-after-px=unread`; throw e; }
}
const PLAY = (q: string): string => `http://localhost:8081/e2e-playground.html?s12=${q}`;
const G2A = "s13-r20-g2-a";
async function g2Clients(): Promise<{ a: Client; b: Client; c: Client; close: () => void }> {
  const { connect } = await import("../sdk/src/index.js");
  const [a, b, c] = [await connect({ name: G2A, failureReports: false }), await connect({ name: "s13-r20-g2-b", failureReports: false }), await connect({ name: "s13-r20-g2-c", failureReports: false })];
  return { a, b, c, close: () => { a.close(); b.close(); c.close(); } };
}
type G2Cl = Awaited<ReturnType<typeof g2Clients>>;
/** One timeline: A's send, B's default screenshot 100 ms later (30 s timeout), C's `daemon.status` every 50 ms. */
async function g2Timeline(cl: G2Cl, tb: Tab, send: () => Promise<unknown>): Promise<G2Obs & { rawGapMs: number }> {
  const polls: Array<{ t: number; h?: string }> = []; let go = true;
  const loop = (async () => { while (go) { const st = (await cl.c.status().catch(() => ({}))) as { lock?: { holder?: string } }; polls.push({ t: Date.now(), h: st.lock?.holder }); await sleep(50); } })();
  const aSentAt = Date.now();
  const pa = att(send).then((r) => ({ r, at: Date.now() }));
  await sleep(100);
  const pb = att(() => cl.b.call("screenshot", { tab: tb.handle }, { timeoutMs: G2_B_TIMEOUT_MS })).then((r) => ({ r, at: Date.now() }));
  const [a, b] = [await pa, await pb];
  await sleep(100); go = false; await loop;
  return { aReplyMs: a.at - aSentAt, bReplyMs: b.at - aSentAt, rawGapMs: b.at - a.at, holderAfterReplyMs: holderAfterMs(polls, G2A, a.at), aEffect: 0, b: code(b.r.e), a: code(a.r.e) };
}
/** The sheet's `G2 <row> leg=<covered or uncovered> a-reply=… b-reply=… gap-ms=… holder-after-reply-ms=… a-effect=… b=…`: Run 19's form with the leg key after the row. */
export const g2Line20 = (R: string, leg: "covered" | "uncovered", o: G2Obs, rawGapMs: number): string => g2Line(R, { ...o, gapMs: Math.max(0, rawGapMs) }).replace(`G2 ${R} `, `G2 ${R} leg=${leg} `);
const g2Count = async (cl: G2Cl, ta: Tab): Promise<number> => Number(await ev(cl.a, ta.handle, "window.__s12.clicks"));
const printRects = (R: string, leg: string, r: Rects): void => { for (const k of ["A", "B", "X"] as const) { const w = r.wins[k]; say(rectLine(R, { leg, win: k, ...w.rect, z: w.z, coveredPx: winCovered(r, k) })); } };

async function g2One(_x: Ctx): Promise<number> {
  const R = "R20-G2-1", cl = await g2Clients(); let tb: Tab | undefined;
  try {
    const tbT = tb = await cl.b.newTab(PLAY("g2b"), { active: true });   // B's tab first, in the wave's window
    await sleep(1_500);
    await sig(`${R}-open`);   // PowerShell opens window WA on the A page (s12x=g2a) and records the wave's window handles
    const ta = await findTab(cl.a, "s12x=g2a"), ref = (await ta.locate({ css: "#s12-btn" })).ref;
    const res: G2Leg[] = [];
    for (const leg of ["covered", "uncovered"] as const) {
      const placed = leg === "uncovered" ? parsePlace(await sig(`${R}-place`)) : undefined;
      const g1 = g2LegGate(leg, { placeOk: placed });
      if (g1 !== "run") { say(`CHECK ${R} uncovered placement=refused`); say(legLine(R, leg, g1)); res.push({ v: g1, bTimedOut: false, usable: false }); continue; }
      const rects = parseRects(await sig(`${R}-rects-${leg}`));
      printRects(R, leg, rects);
      const alone = await timed(() => cl.b.call("screenshot", { tab: tbT.handle }, { timeoutMs: 10_000 }));
      say(`CHECK ${R} ${leg} ctl-alone-ms=${alone.ms} ctl-alone=${code(alone.e)}`);
      const bCov = winCovered(rects, "B"), g2 = g2LegGate(leg, { aloneErr: !!alone.e, bCov });
      if (g2 !== "run") {
        if (leg === "uncovered" && bCov !== 0) say(`CHECK ${R} uncovered b-covered-by-others-px=${bCov} precondition=failed`);
        say(legLine(R, leg, g2)); res.push({ v: g2, bTimedOut: false, usable: false }); continue;
      }
      await sleep(1_000);
      const before = await g2Count(cl, ta);
      const r = await g2Timeline(cl, tbT, () => cl.a.call("click", { tab: ta.handle, ref, trusted: true }, { timeoutMs: 30_000 }));
      const obs: G2Obs = { ...r, aEffect: (await g2Count(cl, ta)) - before };
      say(g2Line20(R, leg, obs, r.rawGapMs));
      say(`CHECK ${R} ${leg} raw-gap-ms=${r.rawGapMs} a=${obs.a}`);
      const v = judgeG2Leg(obs);
      res.push({ v, bTimedOut: bTimedOut(obs.b, obs.bReplyMs), usable: true });
      say(legLine(R, leg, v));
      say(afterCheckLine(R, leg, await sig(`${R}-rects-${leg}-after`)));
    }
    const rows = g2Rows(res[0]!, res[1]!);
    if (rows.cause) say(`CHECK ${R} cause=${rows.cause}`);
    // the SDK-default variant (A with focusFirst), last, recorded only (#354)
    await sleep(1_000);
    const v = await g2Timeline(cl, tbT, () => ta.click(ref, { trusted: true }));
    say(`CHECK ${R} variant=focusFirst a-reply=${v.aReplyMs} b-reply=${v.bReplyMs} gap-ms=${v.rawGapMs} holder-after-reply-ms=${v.holderAfterReplyMs} (recorded, not judged)`);
    return finish(R, [rows.covered, rows.uncovered]);
  } finally { await tb?.close().catch(() => undefined); cl.close(); }
}

// ---- R20-VERSION (B3): the old build refuses every chooser call --------------------------------------------------------------------------------
/** sdk / raw: VERSION with exactly the daemon's text, nothing reached the page, no path in the text. */
export function judgeVersionCall(o: { code: string; message?: string; files: number; clicks: number; leaked: number }): V {
  return o.code === "VERSION" && o.message === CHOOSER_RELOAD_HINT && o.files === 0 && o.clicks === 0 && o.leaked === 0 ? "PASS" : "FAIL";
}
/** mcp: read by its own line and isError (the bare text, one line); a page that cannot be read leaves a passing line NOT MEASURED. */
export function judgeVersionMcp(r: McpRead, p: { files: number; clicks: number }, leaked: number): V {
  if (mcpLineVerdict(r) !== "PASS" || leaked !== 0 || p.files > 0 || p.clicks > 0) return "FAIL";
  return p.files < 0 || p.clicks < 0 ? "NOT MEASURED" : "PASS";
}
/** control: the upload without `chooser` is ok with its file and names no hint. */
export const judgeVersionControl = (o: { code: string; message?: string; files: number }): V => (o.code === "ok" && !hintOf(o.message ?? "") && o.files === 1 ? "PASS" : "FAIL");
export const judgeArgs7 = (v: unknown): V => (v === 7 ? "PASS" : "FAIL");
/** The row's STOPs: the control upload not ok is `existing-tool-changed`; a native dialog `dialog-left-open`. (`old-build-left-loaded` and the NOT RUN case are the PowerShell side's.) */
export function versionStopFor(R: string, o: { controlOk: boolean; dialog: number }): StopWhy | undefined {
  if (!o.controlOk) return new StopWhy("existing-tool-changed", `${R} control upload`);
  if (o.dialog > 0) return new StopWhy("dialog-left-open", `${R} a native dialog`);
  return undefined;
}
async function version(x: Ctx): Promise<number> {
  const R = "R20-VERSION", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [], forbidden = [ROOT(), s.sentinel, "s11-1k.bin"], IN = { css: "#vis" };
  const page = (): Promise<Tab> => x.open(S12CH("c1"));
  const leaked = (t: string): number => rawLeaks(t, forbidden);
  const rep = async (h: string): Promise<{ files: number; clicks: number }> => (await ev(x.c, h, "({files: window.__s12ch.files, clicks: window.__s12ch.clicks})")) as { files: number; clicks: number };
  const call = async (l: "sdk" | "raw", t: Tab, fn: () => Promise<unknown>): Promise<void> => {
    const r = await att(fn), p = await rep(t.handle), msg = r.e?.message ?? "";
    say(versionchLine(R, { leg: l, code: code(r.e), hint: hintOf(msg), files: p.files, exact: msg === CHOOSER_RELOAD_HINT }));
    const v = judgeVersionCall({ code: code(r.e), message: r.e?.message, files: p.files, clicks: p.clicks, leaked: leaked(msg) });
    say(legLine(R, l, v)); legs.push(v);
  };
  const ts = await page();
  await call("sdk", ts, () => ts.upload(IN, f, { chooser: true }));
  const m = await x.mcp(), mh = handleOf((await m.call("browser_new_tab", { url: S12CH("c1") })).text); await sleep(1_500);
  const mr = await m.call("browser_upload_file", { tab: mh, locator: IN, paths: [f], chooser: true });
  const k = /(\d+),(\d+)/.exec((await m.call("browser_evaluate", { tab: mh, expression: "[window.__s12ch.files, window.__s12ch.clicks].join(',')" })).text);
  await m.call("browser_close_tab", { tab: mh });
  const mread = mcpLineRead(mr, MCP_LINES.chooserOld), mp = { files: k ? Number(k[1]) : -1, clicks: k ? Number(k[2]) : -1 };
  say(mcplineLine(R, { leg: "mcp", ...mread })); say(`CHECK ${R} mcp files=${mp.files} clicks=${mp.clicks}`);
  const mv = judgeVersionMcp(mread, mp, leaked(mr.text)); say(legLine(R, "mcp", mv)); legs.push(mv);
  const tr = await page();
  await call("raw", tr, () => x.c.call("uploadFiles", { tab: tr.handle, locator: IN, paths: [f], chooser: true }));
  const tc = await page(), cr = await att(() => tc.upload(IN, f)), cp = await rep(tc.handle);
  say(versionchLine(R, { leg: "control", code: code(cr.e), hint: hintOf(cr.e?.message ?? ""), files: cp.files, exact: false }));
  const cv = judgeVersionControl({ code: code(cr.e), message: cr.e?.message, files: cp.files }); say(legLine(R, "control", cv)); legs.push(cv);
  const a = await att(() => tc.evaluate("(a) => a", { args: 7 }));
  say(`CHECK ${R} args=${a.e ? code(a.e) : a.v === 7 ? "answered" : "other"}`);
  const av = judgeArgs7(a.v); say(legLine(R, "args", av)); legs.push(av);
  const dialog = await dlgN(`${R}-dlg`);
  say(`CHECK ${R} dialog=${dialog} files=${cp.files} clicks=${cp.clicks}`);
  raise(versionStopFor(R, { controlOk: cv === "PASS", dialog }));
  return finish(R, legs);
}

export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "choose-twice": (a) => run("choosetwice", a, chooseTwice, "R20-CHOOSE-TWICE"),
  "choose-kept": (a) => run("choosekept", a, chooseKept, "R20-CHOOSE-KEPT"),
  "choose-refuse-dis": (a) => run("chooserefusedis", a, chooseRefuseDis, "R20-CHOOSE-REFUSE-DIS"),
  "g2-1": (a) => run("g21", a, g2One, "R20-G2-1"),
  version: (a) => run("version", a, version, "R20-VERSION"),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

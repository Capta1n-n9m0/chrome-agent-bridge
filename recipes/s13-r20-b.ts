// Step 13 S5-drivers-B2: the actors of liveB20's chooser rows R20-CHOOSE-TWICE, R20-CHOOSE-KEPT and R20-CHOOSE-REFUSE-DIS (docs/e2e-test-plan.md section 4.28) and their pure judges.
// Same contract as s13-r20-a.ts: the sheet's line forms through s13-forms.ts, `LEG <row> <label> <verdict>` lines (recipes/s13-r20.ps1 turns them into the row's one ROW), exit 0 pass,
// 1 fail, 2 STOP (`STOPWHY <reason>`), 3 not measured. NOT run against Chrome by its author. Counts and fixed words only. Run 19's chooser judges are not reused (they pin the overlap
// text); the judges below sit on busyExact / namesDevtools / mcpLineVerdict / disClass / disVerdict and the product's own constants. The native-dialog count is the PowerShell side's:
// the actor asks for it through `sig(<row>-dlg)` (TWICE), `sig(<row>-<leg>-dlg)` (KEPT: different, same; REFUSE-DIS: btn, flip, self) and reads a count.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHOOSER_TIMEOUT_MESSAGE } from "../extension/src/upload-files.js";
import { att, finish, handleOf, HelperDefect, legLine, run, say, sig, sleep, StopWhy, URL, type Ctx, type Err, type Mcp, type V } from "./s12-r19-a.js";
import { code, ev, fileOf, state } from "./s12-r19-b.js";
import { busyExact, chkeptLine, chooseLine20, disBaselineOk, disClass, disVerdict, MCP_LINES, mcplineLine, mcpLineRead, mcpLineVerdict, namesDevtools, type DisAnswer, type McpRead } from "./s13-forms.js";
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

export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "choose-twice": (a) => run("choosetwice", a, chooseTwice, "R20-CHOOSE-TWICE"),
  "choose-kept": (a) => run("choosekept", a, chooseKept, "R20-CHOOSE-KEPT"),
  "choose-refuse-dis": (a) => run("chooserefusedis", a, chooseRefuseDis, "R20-CHOOSE-REFUSE-DIS"),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

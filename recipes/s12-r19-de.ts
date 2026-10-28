// Step 12 S7-drivers-DE: the actors of Run 19's old-build rows, R19-ARGS-OLD (liveD19, the pre-S2a build) and R19-VERSION (liveE19, the pre-S5a build), against
// docs/e2e-test-plan.md section 4.27. NOT run against Chrome by its author. Same contract as s12-r19-a.ts, -b.ts and -c.ts: each command prints the sheet's line forms
// ((20) OLD in s12-forms.ts, (27) VERSIONCH in s12-forms-c.ts) and `LEG <row> <label> <verdict>` lines (s12-r19-a.ps1's Invoke-R19Row turns them into the row's one ROW);
// exit 0 pass, 1 fail, 3 not measured. Counts and fixed words only. The two reload texts are the daemon's own constants, imported from daemon/src/intercept.ts, never retyped.
// Both rows change no state: the old build is loaded by the swap frame (Invoke-R19Swapped in s12-r19-lib.ps1), not here.
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { ARGS_RELOAD_HINT, CHOOSER_RELOAD_HINT } from "../daemon/src/intercept.js";
import { rawLeaks } from "./s11-rules.js";
import { oldLine, type OldLeg } from "./s12-forms.js";
import { versionchLine } from "./s12-forms-c.js";
import { att, control2Kind, finish, handleOf, legLine, run, say, sleep, URL, type Ctx, type Err, type Mcp, type V } from "./s12-r19-a.js";
import { code, ev, fileOf, ROOT, state } from "./s12-r19-b.js";
import { mcpCodeOf } from "./s12-r19-c.js";

type Tab = import("../sdk/src/index.js").Tab;
export { ARGS_RELOAD_HINT, CHOOSER_RELOAD_HINT };
/** The words both daemon texts carry (S2b's `ARGS_RELOAD_HINT`, S5c's `CHOOSER_RELOAD_HINT`). */
export const RELOAD_FRAGMENT = "reload it at chrome://extensions";
export const OLD_ARGS = { n: 1 };

// ---- R19-ARGS-OLD: pure decisions -----------------------------------------------------------------------------------------------------------------
export interface OldObs { leg: OldLeg; code: string; hint: boolean; forwarded: "yes" | "no" | "n/a" }
/** An SDK refusal carries the daemon's `ARGS_RELOAD_HINT` as its whole message (`===`: the generic RELOAD_HINT also holds the fragment and is not it). */
export const hintSdk = (e: Err | undefined): boolean => e?.message === ARGS_RELOAD_HINT;
/** An MCP result carries the same text inside its own. */
export const hintMcp = (r: { text: string }): boolean => r.text.includes(ARGS_RELOAD_HINT);
/** The raw leg: any `ok` answer means the call reached the old worker (an `ok` with `kind: "function"` is the old worker running the source as an expression). */
export const rawForwarded = (ok: boolean): "yes" | "no" => (ok ? "yes" : "no");
/** One `args` call: `VERSION` with the hint, and on the raw leg `forwarded=no`; the control is `ok` with no hint. */
export function judgeOldLeg(o: OldObs): V {
  if (o.leg === "control") return o.code === "ok" && !o.hint && o.forwarded === "n/a" ? "PASS" : "FAIL";
  return o.code === "VERSION" && o.hint && o.forwarded === (o.leg === "raw" ? "no" : "n/a") ? "PASS" : "FAIL";
}
/** The control's raw twin (#366): the same no-`args` `function f() {}` call liveA19's control-2 sends; it must answer ok. Its kind is recorded (`control2Kind`), never judged here: S7-record compares it with liveA19's. */
export const twinAnswered = (ok: boolean): boolean => ok;
export const judgeOldControl = (o: OldObs, twin: boolean): V => (judgeOldLeg(o) === "PASS" && twin ? "PASS" : "FAIL");

// ---- R19-VERSION: pure decisions ------------------------------------------------------------------------------------------------------------------
export interface VerObs { leg: "sdk" | "mcp" | "raw" | "control"; code: string; hint: boolean; exact: boolean; files: number; clicks: number; leaked: number }
export const hintOf = (text: string): boolean => text.includes(RELOAD_FRAGMENT);
/** A `chooser` call: `VERSION` with the daemon's text (`===` on the SDK and raw legs), nothing reached the page, no path in the text; the control upload is `ok` with one file. */
export function judgeVersionLeg(o: VerObs): V {
  if (o.leg === "control") return o.code === "ok" && !o.hint && o.files === 1 ? "PASS" : "FAIL";
  return o.code === "VERSION" && o.hint && o.exact && o.files === 0 && o.clicks === 0 && o.leaked === 0 ? "PASS" : "FAIL";
}
export const judgeArgsAnswer = (v: unknown): V => (v === 7 ? "PASS" : "FAIL");

// ---- shared pieces ----------------------------------------------------------------------------------------------------------------------------------
const PAGE = (q: string): string => URL(q, "s12-chooser.html");
const leg = (R: string, label: string, v: V, legs: V[]): void => { legs.push(v); say(legLine(R, label, v)); };
async function mcpNew(m: Mcp, url: string): Promise<string> { const h = handleOf((await m.call("browser_new_tab", { url })).text); await sleep(1_500); return h; }

// ---- R19-ARGS-OLD ---------------------------------------------------------------------------------------------------------------------------------
async function argsOld(x: Ctx): Promise<number> {
  const R = "R19-ARGS-OLD", legs: V[] = [], t = await x.open(PAGE("none"));
  const sdkLeg = async (l: "sdk" | "ref" | "file", call: () => Promise<unknown>): Promise<void> => {
    const r = await att(call), o: OldObs = { leg: l, code: code(r.e), hint: hintSdk(r.e), forwarded: "n/a" };
    say(oldLine(R, o)); leg(R, l, judgeOldLeg(o), legs);
  };
  await sdkLeg("sdk", () => t.evaluate("(a) => a", { args: OLD_ARGS }));
  const m = await x.mcp(), h = await mcpNew(m, PAGE("none"));
  const mr = await m.call("browser_evaluate", { tab: h, expression: "(a) => a", args: OLD_ARGS });
  const mo: OldObs = { leg: "mcp", code: mcpCodeOf(mr), hint: hintMcp(mr), forwarded: "n/a" };
  await m.call("browser_close_tab", { tab: h });
  say(oldLine(R, mo)); leg(R, "mcp", judgeOldLeg(mo), legs);
  await sdkLeg("ref", () => t.evaluateRef("(a) => document.body", { args: OLD_ARGS }));
  await sdkLeg("file", () => t.evaluateToFile("(a) => a", { args: OLD_ARGS, path: join(ROOT(), "s12-args-old.json") }));
  const raw = await att(() => x.c.call("evaluate", { expression: "(a) => a", args: 1, tab: t.handle }));
  const ro: OldObs = { leg: "raw", code: code(raw.e), hint: hintSdk(raw.e), forwarded: rawForwarded(!raw.e) };
  say(oldLine(R, ro)); leg(R, "raw", judgeOldLeg(ro), legs);
  const c1 = await att(() => t.evaluate("(a) => a")), c2 = await att(() => x.c.call("evaluate", { expression: "function f() {}", tab: t.handle }));
  const twin = twinAnswered(!c2.e), co: OldObs = { leg: "control", code: code(c1.e), hint: hintSdk(c1.e), forwarded: "n/a" };
  say(oldLine(R, co)); say(`CHECK ${R} control raw-twin kind=${control2Kind(c2.v)}`);
  leg(R, "control", judgeOldControl(co, twin), legs);
  return finish(R, legs);
}

// ---- R19-VERSION -------------------------------------------------------------------------------------------------------------------------------------
async function version(x: Ctx): Promise<number> {
  const R = "R19-VERSION", s = state(), f = fileOf(s, "s11-1k.bin"), legs: V[] = [], forbidden = [ROOT(), s.sentinel, "s11-1k.bin"], IN = { css: "#in" };
  const page = (): Promise<Tab> => x.open(PAGE("c1"));
  const reporter = async (h: string): Promise<{ files: number; clicks: number }> => (await ev(x.c, h, "({files: window.__s12ch.files, clicks: window.__s12ch.clicks})")) as { files: number; clicks: number };
  const report = async (l: VerObs["leg"], e: Err | undefined, h: string): Promise<void> => {
    const p = await reporter(h), msg = e?.message ?? "";
    const o: VerObs = { leg: l, code: code(e), hint: hintOf(msg), exact: msg === CHOOSER_RELOAD_HINT, files: p.files, clicks: p.clicks, leaked: rawLeaks(msg, forbidden) };
    say(versionchLine(R, { leg: l, code: o.code, hint: o.hint, files: o.files, exact: o.exact })); leg(R, l, judgeVersionLeg(o), legs);
  };
  const ts = await page();
  await report("sdk", (await att(() => ts.upload(IN, f, { chooser: true }))).e, ts.handle);
  const m = await x.mcp(), h = await mcpNew(m, PAGE("c1"));
  const mr = await m.call("browser_upload_file", { tab: h, locator: IN, paths: [f], chooser: true });
  const k = /(\d+),(\d+)/.exec((await m.call("browser_evaluate", { tab: h, expression: "[window.__s12ch.files, window.__s12ch.clicks].join(',')" })).text);
  await m.call("browser_close_tab", { tab: h });
  const mo: VerObs = { leg: "mcp", code: mcpCodeOf(mr), hint: hintOf(mr.text), exact: mr.text.includes(CHOOSER_RELOAD_HINT), files: k ? Number(k[1]) : -1, clicks: k ? Number(k[2]) : -1, leaked: rawLeaks(mr.text, forbidden) };
  say(versionchLine(R, { leg: "mcp", code: mo.code, hint: mo.hint, files: mo.files, exact: mo.exact })); leg(R, "mcp", judgeVersionLeg(mo), legs);
  const tr = await page();
  await report("raw", (await att(() => x.c.call("uploadFiles", { tab: tr.handle, locator: IN, paths: [f], chooser: true }))).e, tr.handle);
  const tc = await page();
  await report("control", (await att(() => tc.upload(IN, f))).e, tc.handle);
  const a = await att(() => tc.evaluate("(a) => a", { args: 7 }));
  say(`CHECK ${R} args=${a.e ? code(a.e) : a.v === 7 ? "answered" : "other"}`);
  leg(R, "args", judgeArgsAnswer(a.v), legs);
  return finish(R, legs);
}

export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "args-old": (a) => run("argsold", a, argsOld, "R19-ARGS-OLD"),
  version: (a) => run("version", a, version, "R19-VERSION"),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

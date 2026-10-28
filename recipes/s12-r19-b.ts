// Step 12 S7-drivers-B: the actors of Run 19's liveB19 rows (docs/e2e-test-plan.md section 4.27 part B) and the pure decisions they print. NOT run against Chrome by its
// author. Same contract as s12-r19-a.ts: each command prints the sheet's line forms and `LEG <row> <label> <verdict>` lines (recipes/s12-r19-a.ps1's Invoke-R19Row turns them
// into the row's one ROW); exit 0 pass, 1 fail, 2 STOP (`STOPWHY <reason>`). Counts and fixed words only. The banner is read from the PowerShell timeline (recipes/s12-r19-b.ps1).
import { readFileSync } from "node:fs";
import { join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { K, rawLeaks, type PageObs } from "./s11-rules.js";
import { K17, k17RawDir, k17RawMissing, judgeUpOpt, type J17 } from "./s11b-rules.js";
import { devtJudges, realIo, refusalStepJudge, windowed } from "./s11b.js";
import { conkeptLine, bannerEndMs, bannerSpan, devprobe, keepdtLine, keependLine, keepseqLine, overlapExact, overlapLine, parseTimeline, pollMsOf, pollUntilDevtools, sweepheldLine, type BannerRead, type KeepLeg } from "./s12-forms-b.js";
import { conmcpStats, type ConEntry } from "./s12-forms.js";
import { att, entriesOf, finish, idle, judgeLine, judgeRefusal, legLine, MSG, run, say, sig, sleep, stamp, StopWhy, URL, type Ctx, type Err, type V } from "./s12-r19-a.js";

type Tab = import("../sdk/src/index.js").Tab;
type Client = import("../sdk/src/index.js").BridgeClient;
export const DEVT_NOT_ATTACHED = "DevTools was not attached";
export const verdictOf = (j: { pass: boolean; notMeasured?: boolean }): V => (j.pass ? "PASS" : j.notMeasured ? "NOT MEASURED" : "FAIL");
export const median = (n: number[]): number => { const s = [...n].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const code = (e: Err | undefined): string => e?.code ?? "ok";

// ---- pure decisions ---------------------------------------------------------------------------------------------------------------------------
/** R19-KEEP-1: an answer that differs from today's is the STOP existing-tool-changed; a banner gap between calls 3 s apart fails (a kept session cannot drop there); a banner control that did not pass makes the banner clause NOT MEASURED. */
export const keep1Decision = (answers: boolean[], banner: string, ctl = "pass"): "PASS" | "FAIL" | "STOP" | "NOT MEASURED" => (answers.some((a) => !a) ? "STOP" : ctl !== "pass" ? "NOT MEASURED" : banner === "continuous" ? "PASS" : "FAIL");
/** R19-KEEP-2: any reading that never ended fails; a ctl leg that did not refuse BAD_PARAMS, or a ctl spread over 3 000 ms, is NOT MEASURED; else median(idle) - median(ctl) >= 3 500. */
export function judgeKeep2(idleMs: Array<number | null>, ctlMs: Array<number | null>, ctlNext: string[], bannerCtl = "pass"): { v: V; measured: boolean; idle?: number; ctl?: number } {
  if (bannerCtl !== "pass") return { v: "NOT MEASURED", measured: false };
  if ([...idleMs, ...ctlMs].some((e) => e === null || e > 25_000)) return { v: "FAIL", measured: false };
  const i = idleMs as number[], c = ctlMs as number[];
  if (ctlNext.some((n) => n !== "BAD_PARAMS") || Math.max(...c) - Math.min(...c) > 3_000) return { v: "NOT MEASURED", measured: false, idle: median(i), ctl: median(c) };
  return { v: median(i) - median(c) >= 3_500 ? "PASS" : "FAIL", measured: true, idle: median(i), ctl: median(c) };
}
export const KEEP3_WANT: Record<string, { code: string; message?: string; data?: string }> = {
  disarm: { code: "DISARMED", message: MSG.disarmed, data: "keys:scope" }, block: { code: "DOMAIN_BLOCKED", message: MSG.blocked }, "nav-blocked": { code: "DOMAIN_BLOCKED", message: MSG.blocked },
  "nav-own": { code: "DOMAIN_BLOCKED", message: MSG.own }, "nav-file": { code: "DOMAIN_BLOCKED", message: MSG.file }, close: { code: "TAB_GONE" },
};
/** R19-KEEP-3 `next`: the refusal exactly (the code alone for TAB_GONE); anything else, `ok` included, is the STOP kept-session-used. */
export function judgeKeep3Next(leg: string, e: Err | undefined): "PASS" | "STOP" {
  const w = KEEP3_WANT[leg]!;
  return e && (w.message === undefined ? e.code === w.code : judgeRefusal(e, { code: w.code, message: w.message, data: w.data }) === "PASS") ? "PASS" : "STOP";
}
/** R19-KEEP-3's end clause: within 2 000 ms of KEEP-2's ctl median and 2 500 ms below its idle median; NOT MEASURED when KEEP-2's clause was not measured. */
export function judgeKeep3End(endMs: number | null, med: { idle: number; ctl: number } | null): V {
  if (!med) return "NOT MEASURED";
  return endMs !== null && Math.abs(endMs - med.ctl) <= 2_000 && med.idle - endMs >= 2_500 ? "PASS" : "FAIL";
}
/** R19-KEEP-4: while DevTools is open the call answers K-devt exactly; after it closes the next call is ok with the 11 entries. */
export const judgeKeep4 = (devtools: Err | undefined, closed: { e?: Err; n?: number }, attached = true): { devtools: V; closed: V } => (!attached ? { devtools: "NOT MEASURED", closed: "NOT MEASURED" } : {
  devtools: devtools && overlapExact(devtools) ? "PASS" : "FAIL", closed: !closed.e && closed.n === 11 ? "PASS" : "FAIL",
});
export const judgeOverlap = (first: Err | undefined, second: Err | undefined, firstValue: unknown): V => (!first && firstValue === 1 && second !== undefined && overlapExact(second) ? "PASS" : "FAIL");
/** KEEP-OVERLAP leg a: the second call starts `gapMs` after the first STARTED and before the first has answered (the first call is not awaited before it). */
export async function overlapRun<T>(first: () => Promise<T>, second: () => Promise<T>, gap: () => Promise<void>): Promise<[T, T]> { const p1 = first(); await gap(); const p2 = second(); return [await p1, await p2]; }
/** R19-KEEP-3: a call after the event that was not refused exactly is the STOP kept-session-used. */
export function assertKept3(leg: string, e: Err | undefined): void { if (judgeKeep3Next(leg, e) === "STOP") throw new StopWhy("kept-session-used", "a call after the event was not refused"); }
/** R19-SWEEP-HELD: K-devt after the reload, DevTools still open, the tab re-claimed, then ok once DevTools is closed. */
export const judgeSweep = (o: { afterReload: string; devtoolsOpen: boolean; reclaimed: boolean; after: string }): V => (o.afterReload === K["K-devt"].code && o.devtoolsOpen && o.reclaimed && o.after === "ok" ? "PASS" : "FAIL");
/** R19-DEVT-NOFLAG's two words: the DEVPROBE answer and KEEP-4's devtools leg. `other` (a code the sheet has no word for) is a finding. */
export function devnoflagLine(probe: string, kept: string): string {
  const w = (a: string, none: string): string => (a === "" || a === "not-run" ? "not-run" : a === K["K-devt"].code ? "K-devt" : a === "ok" && none === "probe" ? "ok" : "other");
  return `DEVNOFLAG probe=${w(probe, "probe")} kept-then-devtools=${w(kept, "kept")}`;
}
/** CONKEPT: the second read with fewer entries is the STOP-class change (#352). */
export const judgeConKept = (first: ConEntry[], second: ConEntry[]): "PASS" | "FAIL" | "STOP" => {
  if (second.length < first.length) return "STOP";
  return judgeLine(conkeptLine(first, second), { first: 11, second: 11, equal: "yes", ordered: "yes" }) === "PASS" ? "PASS" : "FAIL";
};
const j17v = (j: J17): V => (j.pass ? "PASS" : j.notMeasured ? "NOT MEASURED" : "FAIL");

// ---- the actor's world: state, tabs, page reads (replicas of s11b.ts's non-exported helpers) -----------------------------------------------------
const OUT = (): string => process.env.S11_OUT ?? "";
const ROOT = (): string => join(OUT(), "wave", "root");
interface State { sentinel: string; tabs: Record<string, string>; files: Record<string, { where: string }> }
const state = (): State => JSON.parse(readFileSync(join(OUT(), "state.json"), "utf8")) as State;
const fileOf = (s: State, n: string): string => { const f = s.files[n]; if (!f) throw new StopWhy("throw-after-state", "a wave file is missing"); return win32.normalize(join(f.where === "root" ? ROOT() : f.where === "outside" ? join(OUT(), "wave", "outside") : join(ROOT(), s.sentinel), n)); };
const ev = async (c: Client, h: string, e: string): Promise<unknown> => ((await c.call("evaluate", { tab: h, expression: `return (${e});`, timeoutMs: 15_000 }, { timeoutMs: 20_000 })) as { kind?: string; value?: unknown }).value;
const reset = async (c: Client, h: string): Promise<void> => { await ev(c, h, "(window.__s11.reset(), true)"); stamp(); };
async function readPage(c: Client, h: string): Promise<PageObs> {
  const { toPage } = await import("./s11.js");
  for (const t0 = Date.now(); ; await sleep(100)) {
    const st = (await ev(c, h, "window.__s11 ? window.__s11.state() : null")) as Parameters<typeof toPage>[0] | null;
    if (st && st.pending === 0) { stamp(); return toPage(st); }
    if (Date.now() - t0 > 30_000) throw new StopWhy("throw-after-state", "the page's reporter is missing");
  }
}
/** The wave's own window's tab: the one unowned row whose URL holds the marker (the tab list has the URL unless the extension withheld it). */
export async function findTab(c: Client, marker: string, ms = 60_000): Promise<Tab> {
  for (const t0 = Date.now(); ; await sleep(500)) {
    const r = (await c.tabs()).filter((x) => x.url.includes(marker) && x.owner === undefined);
    if (r.length === 1) return c.claim(r[0]!.handle);
    if (Date.now() - t0 > ms) throw new StopWhy("throw-after-state", "the wave's window tab was not found");
  }
}
/** One timeline window: the driver samples the banner from its `-timeline.ready` until its duration ends and answers `<ms>:<1|0>,...`; `op` runs inside it. */
async function timeline(id: string, op: () => Promise<void>): Promise<BannerRead[]> {
  realIo.signal(`${id}-timeline`);
  await sleep(700);
  await op();
  return parseTimeline(await realIo.pressed(`${id}-timeline`, 180_000));
}
const clock = { now: (): number => Date.now(), sleep };
const withTab = async <T>(t: Tab, f: () => Promise<T>): Promise<T> => { try { return await f(); } finally { await t.release().catch(() => undefined); stamp(); } };

// ---- DEVPROBE and the DevTools rows -----------------------------------------------------------------------------------------------------------
async function devprobeCmd(x: Ctx): Promise<number> {
  const t = await findTab(x.c, "s12x=probe");
  const r = await withTab(t, () => devprobe({ method: "uia-menu", clock, open: () => sig("DEVPROBE"), close: () => sig("DEVPROBE-done"), call: async () => code((await att(() => t.evaluate("1"))).e) }));
  say(r.line);
  if (r.closeError) throw new StopWhy("devtools-left-open", "DevTools could not be closed");
  return 0;
}
async function upDevt(x: Ctx): Promise<number> {
  const R = "R19-UP-DEVT", s = state(), t = await findTab(x.c, "s12x=devt");
  return withTab(t, async () => {
    await reset(x.c, t.handle);
    await sig(R);
    await pollUntilDevtools(async () => code((await att(() => t.evaluate("1"))).e), clock);
    const c1 = await att(() => t.evaluate("1")), up = await att(() => t.upload({ css: "#up-single" }, fileOf(s, "s11-1k.bin")));
    await sig(`${R}-done`); await sleep(1500);
    const c2 = await att(() => t.evaluate("1")), page = await readPage(x.c, t.handle);
    say(`ANSWER ${R} control1 ${code(c1.e)}`); say(`ANSWER ${R} upload ${code(up.e)}`); say(`ANSWER ${R} control2 ${code(c2.e)}`);
    const js = devtJudges(c1.e, up.e, c2.e, page);
    js.forEach((j, i) => say(legLine(R, ["control1-upload", "page", "control2"][i] ?? "clause", j17v(j))));
    return finish(R, js.map(j17v));
  });
}
async function keep4(x: Ctx): Promise<number> {
  const R = "R19-KEEP-4", t = await findTab(x.c, "s12x=keep4");
  return withTab(t, async () => {
    await att(() => t.consoleMessages());
    await sleep(500); await sig(R);
    const p = await pollUntilDevtools(async () => code((await att(() => t.consoleMessages())).e), clock);
    const dv = (await att(() => t.consoleMessages())).e;
    say(keepdtLine(R, "devtools", p.attached ? code(dv) : "not-run")); // the judged call's own answer; a poll that never reached K-devt means DevTools did not open in this row
    await sig(`${R}-done`); await sleep(1500);
    const c3 = await att(() => t.consoleMessages());
    say(keepdtLine(R, "closed", code(c3.e)));
    say(keepdtLine(R, "cancel", "not-measured")); // no UIA method for the infobar's Cancel is sourced (4.27): recorded, never judged
    const j = judgeKeep4(dv, { e: c3.e, n: (c3.v as unknown[] | undefined)?.length }, p.attached);
    say(legLine(R, "devtools", j.devtools)); say(legLine(R, "closed", j.closed)); say(legLine(R, "cancel", "RECORD"));
    return finish(R, [j.devtools, j.closed]);
  });
}
/** R19-SWEEP-HELD in two actor runs (the reload and the R19-0 re-run happen between them, at block level): `--phase 1` polls until DevTools holds the tab and prints `SWEEPPRE attached=<yes|no>`; `--phase 2` re-claims and judges. */
async function sweepHeld(x: Ctx): Promise<number> {
  const R = "R19-SWEEP-HELD", M = "s12x=sweep";
  if (x.opts.phase !== "2") {
    const t = await findTab(x.c, M);
    await sig(R);
    const p = await withTab(t, () => pollUntilDevtools(async () => code((await att(() => t.evaluate("1"))).e), clock));
    say(`SWEEPPRE attached=${p.attached ? "yes" : "no"}`);
    return 0;
  }
  const t = await findTab(x.c, M, 90_000).catch(() => undefined);
  let after = "ERROR";
  const reclaimed = t !== undefined;
  if (t) after = code((await att(() => t.evaluate("1"))).e);
  const open = (await sig(`${R}-check`)) === "yes";
  await sig(`${R}-close`); await sleep(1500);
  const ok = t ? code((await att(() => t.evaluate("1"))).e) : "ERROR";
  await t?.release().catch(() => undefined);
  say(sweepheldLine({ afterReload: after, devtoolsOpen: open, reclaimed })); say(`ANSWER ${R} second ${ok}`);
  const v = judgeSweep({ afterReload: after, devtoolsOpen: open, reclaimed, after: ok });
  say(legLine(R, "sweep", v));
  return finish(R, [v]);
}
/** `devnoflag --probe <code> --kept <code>`: no call; the two words come from the DEVPROBE and KEEP-4's devtools leg. */
function devnoflagCmd(o: Record<string, string>): number { say(devnoflagLine(o.probe ?? "", o.kept ?? "")); say(legLine("R19-DEVT-NOFLAG", "record", "RECORD")); return 0; }
/** `upopt-judge --obs <json>`: R19-UP-OPT's pass rule (R18-UP-OPT's, unchanged) from the observations the PowerShell helper wrote; exit 0 pass, 3 not measured, 1 fail. */
function upoptCmd(o: Record<string, string>): number {
  const j = judgeUpOpt(JSON.parse(readFileSync(resolve(o.obs ?? ""), "utf8")) as never);
  say(`CHECK R19-UP-OPT upopt ${verdictOf(j)}: ${j.why}`);
  return j.pass ? 0 : j.notMeasured ? 3 : 1;
}

// ---- the carried banner rows (the PowerShell sampler runs one window per leg; the IDLE of each window is printed first) ---------------------------
const UP6 = [["outside", "K-gate"], ["missing", "K-missing"], ["relative", "K-relative"], ["raw-dotdot", "K-gate"], ["raw-notarget", "K-notarget"]] as const;
async function refusalLeg(x: Ctx, id: string, label: string, h: string, want: Parameters<typeof refusalStepJudge>[2], call: () => Promise<unknown>, idleRow = id): Promise<{ v: V; e?: Err }> {
  await reset(x.c, h);
  await idle(idleRow); // 4.27: `IDLE R19-UP-6 since-attach-ms=<n>` once per leg (the row id), the driver pairs the n-th line with the n-th leg
  const s0 = x.sent(), w = await windowed(realIo, id, [], () => att(call));
  say(`CALLS ${id} calls-sent=${x.sent() - s0}`);
  const page = await readPage(x.c, h);
  const j = refusalStepJudge(label, w.v.e, want, page, { banner: false, violations: w.violations }); // the banner is judged by the Banner rule (the `banner` command), not here
  say(`CHECK ${id} ${verdictOf(j)}: ${j.why}`);
  return { v: j17v(j), e: w.v.e };
}
async function up6(x: Ctx): Promise<number> {
  const R = "R19-UP-6", s = state(), h = s.tabs.u6 ?? "", tab = await x.c.claim(h);
  return withTab(tab, async () => {
    const raw = (paths: string[], target: boolean): Promise<unknown> => x.c.call("uploadFiles", { tab: h, ...(target ? { locator: { css: "#up-single" } } : {}), paths });
    const calls: Record<string, () => Promise<unknown>> = {
      outside: () => tab.upload({ css: "#up-single" }, fileOf(s, "s11-out.bin")), missing: () => tab.upload({ css: "#up-single" }, `${ROOT()}\\s11-missing.bin`), relative: () => tab.upload({ css: "#up-single" }, "s11-1k.bin"),
      "raw-dotdot": () => raw([`${ROOT()}\\..\\outside\\s11-out.bin`], true), "raw-notarget": () => raw([fileOf(s, "s11-1k.bin")], false),
    };
    const legs: V[] = [];
    for (const [step, key] of UP6) { const r = await refusalLeg(x, `${R}-${step}`, step, h, K17[key], calls[step]!, R); legs.push(r.v); say(legLine(R, step, r.v)); }
    return finish(R, legs);
  });
}
async function rawRow(x: Ctx): Promise<number> {
  const R = x.opts.row ?? "", s = state(), h = s.tabs.raw ?? "", dir = "s11b-dir";
  const paths = R === "R19-F-RAW" ? [`${ROOT()}\\s11-missing.bin`] : R === "R19-F-RAW-2" ? [fileOf(s, "s11-1k.bin"), `${ROOT()}\\s11-missing.bin`] : [`${ROOT()}\\${dir}`];
  const want = R === "R19-F-RAW-DIR" ? k17RawDir(0) : k17RawMissing(R === "R19-F-RAW-2" ? 1 : 0);
  const tab = await x.c.claim(h);
  return withTab(tab, async () => {
    const r = await refusalLeg(x, R, "refusal", h, want, () => x.c.call("uploadFiles", { tab: h, locator: { css: R === "R19-F-RAW-2" ? "#up-multi" : "#up-single" }, paths }));
    const text = r.e ? `${r.e.message}\n${JSON.stringify(r.e.data ?? null)}` : "";
    const leaks = rawLeaks(text, [ROOT(), join(OUT(), "wave"), "s11-missing.bin", "s11-1k.bin", dir, s.sentinel]);
    say(`LEAKS ${R} ${leaks}`);
    say(legLine(R, "refusal", r.v)); say(legLine(R, "leaks", leaks === 0 ? "PASS" : "FAIL"));
    return finish(R, [r.v, leaks === 0 ? "PASS" : "FAIL"]);
  });
}

// ---- the kept-session rows ----------------------------------------------------------------------------------------------------------------------
async function keep1(x: Ctx): Promise<number> {
  const R = "R19-KEEP-1", t = await x.open(URL("con"), true), a: boolean[] = [];
  await idle(R);
  let first = 0, last = 0;
  const reads = await timeline(R, async () => {
    const step = async (f: () => Promise<unknown>, ok: (v: unknown) => boolean): Promise<void> => { if (a.length) await sleep(3_000); const r = await att(f); last = Date.now(); a.push(!r.e && ok(r.v)); };
    first = Date.now();
    await step(() => t.evaluate("1 + 1"), (v) => v === 2);
    await step(() => entriesOf(t), (v) => (v as unknown[]).length === 11);
    await step(() => t.click({ css: "body" }, { trusted: true }), () => true);
    await step(() => t.screenshot({ mode: "cdp" }), (v) => Buffer.isBuffer(v) && v.length > 0);
    await step(() => t.evaluate("(a) => a", { args: 7 }), (v) => v === 7);
  });
  const banner = bannerSpan(reads, first, last + 4_500);
  say(keepseqLine(R, { calls: 5, gapMs: 3_000, answersOk: a.filter(Boolean).length, banner, endMs: bannerEndMs(reads, last), pollMs: pollMsOf(reads) }));
  const d = keep1Decision(a, banner, x.ctl);
  if (d === "STOP") throw new StopWhy("existing-tool-changed", "a KEEP-1 call answered differently");
  say(legLine(R, "answers", "PASS")); say(legLine(R, "banner", d)); // the sheet: the banner clause is NOT DISCRIMINATING (the row's PASS carries that note)
  return finish(R, [d]);
}
async function keep2(x: Ctx): Promise<number> {
  const R = "R19-KEEP-2", s = state(), con = await x.open(URL("con"), true), one = await x.open(URL("single", "s12-chooser.html"), true);
  const idleEnd: Array<number | null> = [], ctlEnd: Array<number | null> = [], ctlNext: string[] = [];
  for (const leg of ["idle", "idle", "idle", "ctl", "ctl", "ctl"] as const) {
    await idle(R);
    let reply = 0, next = "ok";
    const reads = await timeline(R, async () => {
      if (leg === "idle") next = code((await att(() => con.evaluate("1"))).e);
      else next = code((await att(() => one.upload({ css: "#open" }, [fileOf(s, "s11-1k.bin"), fileOf(s, "s11-sent.bin")], { chooser: true }))).e);
      reply = Date.now();
    });
    const end = bannerEndMs(reads, reply);
    (leg === "idle" ? idleEnd : ctlEnd).push(end); if (leg === "ctl") ctlNext.push(next);
    say(keependLine(R, { leg, sinceLastCallMs: 0, endMs: end, next }));
  }
  const j = judgeKeep2(idleEnd, ctlEnd, ctlNext, x.ctl);
  say(`CHECK ${R} medians idle=${j.idle ?? "na"} ctl=${j.ctl ?? "na"} measured=${j.measured ? "yes" : "no"}`);
  say(legLine(R, "end", j.v));
  return finish(R, [j.v]);
}
async function keep3(x: Ctx): Promise<number> {
  const R = "R19-KEEP-3", legs: V[] = [];
  const med = x.opts.k2idle && x.opts.k2idle !== "na" && x.opts.k2ctl && x.opts.k2ctl !== "na" ? { idle: Number(x.opts.k2idle), ctl: Number(x.opts.k2ctl) } : null; // --ctl is the runner's own (the banner control)
  const order = ["disarm", "block", "nav-blocked", "nav-own", "nav-file", "close"] as const;
  for (const leg of order) {
    if (leg === "nav-file" && x.opts.toggle !== "on") { say(`CHECK ${R} leg=${leg} NOT RUN ${String.fromCharCode(0x2014)} waits for G11-3`); continue; }
    const nav = leg.startsWith("nav-"), id = `${R}-${leg}`;
    let t: Tab;
    if (nav) { await sig(`${id}-open`); t = await findTab(x.c, `s12x=k3${leg.slice(4)}`); } else t = await x.open(leg === "block" ? "http://s12blk.localhost:8081/s12-console.html?s12=con" : URL("con"), true);
    await idle(R);
    let reply = 0, eventAt = 0, e: Err | undefined;
    const reads = await timeline(id, async () => {
      await att(() => t.evaluate("1")); reply = Date.now(); await sleep(1_000);
      if (leg === "close") { await t.close(); eventAt = Date.now(); } else eventAt = Number(await sig(id));
      await sleep(1_000);
      e = (await att(() => x.c.call("evaluate", { tab: t.handle, expression: "1" }))).e;
    });
    const end = judgeKeep3End(bannerEndMs(reads, reply), med);
    say(keependLine(R, { leg: leg as KeepLeg, sinceLastCallMs: eventAt - reply, endMs: bannerEndMs(reads, reply), next: code(e) }));
    say(legLine(R, `${leg}-end`, end));
    assertKept3(leg, e);
    say(legLine(R, `${leg}-next`, "PASS")); legs.push("PASS", end);
    await sig(`${id}-done`);
    if (nav) await t.release().catch(() => undefined);
  }
  say(`CHECK ${R} leg=replace NOT RUN ${String.fromCharCode(0x2014)} no deterministic trigger is sourced`);
  return finish(R, legs);
}
async function conKept(x: Ctx): Promise<number> {
  const R = "R19-CON-KEPT", t = await x.open(URL("con")), m = await x.mcp();
  await sleep(2_000);
  const first = await entriesOf(t), second = await entriesOf(t);
  say(conkeptLine(first, second));
  const d = judgeConKept(first, second);
  if (d === "STOP") throw new StopWhy("existing-tool-changed", "a second consoleMessages on a kept tab answered with fewer entries");
  const mt = /T\d+/.exec((await m.call("browser_new_tab", { url: URL("con") })).text)?.[0] ?? "";
  await sleep(2_000);
  const mv: V = conmcpStats((await m.call("browser_console_messages", { tab: mt })).text).lines === 11 ? "PASS" : "FAIL";
  await m.call("browser_close_tab", { tab: mt }); // the MCP's tab is not an `x.open` tab: closed here
  say(legLine(R, "sdk", d)); say(legLine(R, "mcp", mv));
  return finish(R, [d, mv]);
}
async function overlapA(x: Ctx): Promise<number> {
  const R = "R19-KEEP-OVERLAP", t = await x.open(URL("con"), true);
  await idle(R);
  const [f, s] = await overlapRun(() => att(() => t.evaluate("new Promise(r => setTimeout(() => r(1), 1500))")), () => att(() => t.evaluate("2")), () => sleep(300));
  const second = s.e;
  say(overlapLine(R, { leg: "evaluate", first: code(f.e), second: code(second), exact: second !== undefined && overlapExact(second) }));
  const v = judgeOverlap(f.e, second, f.v);
  say(legLine(R, "evaluate", v));
  return finish(R, [v]);
}

const optsOf = (argv: string[]): Record<string, string> => { const o: Record<string, string> = {}; for (let i = 0; i < argv.length; i += 2) o[argv[i]!.replace(/^--/, "")] = argv[i + 1] ?? ""; return o; };
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  devprobe: (a) => run("devprobe", a, devprobeCmd), "up-6": (a) => run("up6", a, up6), raw: (a) => run("raw", a, rawRow), "keep-1": (a) => run("keep1", a, keep1), "keep-2": (a) => run("keep2", a, keep2),
  "keep-3": (a) => run("keep3", a, keep3), "con-kept": (a) => run("conkept", a, conKept, "R19-CON-KEPT"), "overlap-a": (a) => run("overlapa", a, overlapA), "up-devt": (a) => run("updevt", a, upDevt),
  "keep-4": (a) => run("keep4", a, keep4), "sweep-held": (a) => run("sweep", a, sweepHeld), devnoflag: async (a) => devnoflagCmd(optsOf(a)), "upopt-judge": async (a) => upoptCmd(optsOf(a)),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

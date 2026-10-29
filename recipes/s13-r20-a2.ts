// Step 13 S5-drivers-A2: the rest of liveA20's actors (docs/e2e-test-plan.md section 4.28): R20-CON-DESC, -CON-NOTEA (legs allowed and pre, then blocked), -CON-CAP, -CON-4,
// -CON-FLOOR and R20-ARGS-OLD, with their pure judges. Same contract as s13-r20-a.ts: sheet line forms through s12-forms.ts / s13-forms.ts, `LEG <row> <label> <verdict>` lines,
// exit 0 pass, 1 fail, 2 STOP, 3 not measured. NOT run against Chrome by its author. Counts and fixed words only.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { conFloorLine, conLine, conrefLine, floorCounts, oldLine, type ConEntry, type FloorCounts } from "./s12-forms.js";
import { att, entriesOf, finish, handleOf, HelperDefect, judgeLine, judgeRefusal, legLine, MSG, run, say, SENT, sig, sleep, type Ctx, type V } from "./s12-r19-a.js";
import { code, ROOT } from "./s12-r19-b.js";
import { hintSdk, judgeOldLeg, rawForwarded, type OldObs } from "./s12-r19-de.js";
import { realIo } from "./s11b.js";
import { concap20Line, concap20Stats, concap20Verdict, MCP_LINES, mcpLineRead, mcplineLine, mcpLineVerdict } from "./s13-forms.js";
const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const first = (x: Ctx): string => x.opts.port ?? "8081";
const CU = (port: string, q: string): string => `http://localhost:${port}/s12-console.html?s12=${q}`;
const PG = (port: string): string => `http://localhost:${port}/e2e-playground.html?s12=a1`;
// ---- R20-CON-DESC -----------------------------------------------------------------------------------------------------------------------------
export const DESC_S1 = "Messages of a frame in another site's process are not read (a same-site frame's are, and are dropped like the page's when its site is blocked);";
export const DESC_S2 = "An object logged before this call shows its class name only, not its contents.";
const occ = (t: string, p: string): number => t.split(p).length - 1;
/** Both sentences exactly once in the console tool's description; the snapshot description only proves the right tool list was read (missing = NOT DISCRIMINATING). */
export function descRow(R: string, d: { con: string | undefined; snap: string | undefined }): { lines: string[]; v: V } {
  const c = d.con ?? "", n1 = occ(c, DESC_S1), n2 = occ(c, DESC_S2), ctl = d.snap !== undefined && d.snap !== "";
  const v: V = !ctl ? "NOT DISCRIMINATING" : n1 === 1 && n2 === 1 ? "PASS" : "FAIL";
  return { lines: [`CHECK ${R} sentence-1=${n1} sentence-2=${n2} control-tool=${ctl ? "read" : "missing"}`, legLine(R, "desc", v)], v };
}
async function listDescriptions(): Promise<Record<string, string>> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport, getDefaultEnvironment } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const c = new Client({ name: "s13-r20-a2-desc", version: "0" });
  await c.connect(new StdioClientTransport({ command: process.execPath, args: [join(REPO, "mcp", "dist", "index.js")], cwd: REPO, stderr: "pipe", env: { ...getDefaultEnvironment(), ...(process.env.BRIDGE_TOKEN ? { BRIDGE_TOKEN: process.env.BRIDGE_TOKEN } : {}) } }));
  try { return Object.fromEntries((await c.listTools()).tools.map((t) => [t.name, t.description ?? ""])); } finally { await c.close().catch(() => undefined); }
}
async function conDesc(): Promise<number> {
  const R = "R20-CON-DESC";
  let d: Record<string, string>;
  try { d = await listDescriptions(); } catch { say(legLine(R, "actor-error", "FAIL")); return finish(R, ["FAIL"]); }   // no state changed: a throw is this row's FAIL, not a wave STOP
  const r = descRow(R, { con: d.browser_console_messages, snap: d.browser_snapshot });
  for (const l of r.lines) say(l);
  return finish(R, [r.v]);
}
// ---- R20-CON-NOTEA ----------------------------------------------------------------------------------------------------------------------------
const OBJ = /^[A-Za-z_$][\w$]*$/;
/** allowed: 2 entries, the Error's message once (sentinel=1), marker 0, the object's entry a bare class name (`Object` PASS, another name RECORD) and the MCP text ending that line with it, without the Error's message.
 * pre: 2 entries, both `Object`, sentinel 0. blocked: 0 entries. url, stack and exception 0 throughout. */
export function judgeNotea(label: "allowed" | "pre" | "blocked", es: ConEntry[], mcp?: string): V {
  const ms = label === "allowed" ? ["s12-noteaok"] : ["s12-notea", "s12-notea-long"];
  const want = { entries: label === "blocked" ? 0 : 2, console: label === "blocked" ? 0 : 2, exception: 0, sentinel: label === "allowed" ? 1 : 0, marker: 0, url: 0, stack: 0 };
  if (judgeLine(conLine("x", label, es, { sentinel: SENT, markers: ms }), want) !== "PASS") return "FAIL";
  if (label === "blocked") return "PASS";
  if (label === "pre") return es.every((e) => e.text === "Object") ? "PASS" : "FAIL";
  const obj = es.find((e) => !e.text.includes(SENT));
  if (!obj || !OBJ.test(obj.text) || mcp === undefined || mcp.includes("s12-noteaok") || !mcp.split("\n").some((l) => l.endsWith(obj.text))) return "FAIL";
  return obj.text === "Object" ? "PASS" : "RECORD";
}
export const handleFile = (): string => join(process.env.S11_OUT ?? "", "r20-notea.handle");
async function noteaA(x: Ctx): Promise<number> {
  const R = "R20-CON-NOTEA", port = first(x);
  rmSync(handleFile(), { force: true });
  if (port !== "8081") { say(`CHECK ${R} blocked-leg=not-measured reason=fixture-port`); for (const l of ["allowed", "pre"]) say(legLine(R, l, "NOT MEASURED")); return finish(R, ["NOT MEASURED"]); }
  const k = await x.open(CU(port, "noteaok")), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: CU(port, "noteaok") })).text);
  const t = await x.open(CU(port, "notea"), false, true);   // kept open: the blocked leg claims it later, after the pattern is added
  await sleep(2000);
  const al = await entriesOf(k), mr = await m.call("browser_console_messages", { tab: mt }), pre = await entriesOf(t);
  say(conLine(R, "allowed", al, { sentinel: SENT, markers: ["s12-noteaok"] })); const va = judgeNotea("allowed", al, mr.text); say(legLine(R, "allowed", va));
  say(conLine(R, "pre", pre, { sentinel: SENT, markers: ["s12-notea", "s12-notea-long"] })); const vp = judgeNotea("pre", pre); say(legLine(R, "pre", vp));
  if (pre.length === 2) writeFileSync(handleFile(), t.handle); else { say(`CHECK ${R} blocked-leg=not-measured reason=blocked-host-script-did-not-log`); await t.close().catch(() => undefined); }
  return finish(R, [va === "RECORD" ? "PASS" : va, vp]);
}
async function noteaB(x: Ctx): Promise<number> {
  const R = "R20-CON-NOTEA", h = readFileSync(handleFile(), "utf8").trim();
  let t: Awaited<ReturnType<Ctx["c"]["claim"]>> | undefined;
  try { t = await x.c.claim(h); } catch { t = undefined; }
  await sig(`${R}-block`);
  const r = t ? await att(() => entriesOf(t!)) : undefined;
  await sig(`${R}-block-done`);
  let v: V = "NOT MEASURED";
  if (r?.v) { say(conLine(R, "blocked", r.v, { sentinel: SENT, markers: ["s12-notea", "s12-notea-long"] })); v = judgeNotea("blocked", r.v); } else say(`CHECK ${R} blocked-leg=not-measured reason=${t ? "read-failed" : "claim-failed"}`);
  say(legLine(R, "blocked", v)); say(`CHECK ${R} cut-path NOT REACHABLE (S3a not run)`);
  await t?.close().catch(() => undefined);
  rmSync(handleFile(), { force: true });
  return finish(R, [v]);
}
// ---- R20-CON-CAP ------------------------------------------------------------------------------------------------------------------------------
/** The newest-kept rule (concap20Verdict) plus the controls: the SDK count is 200 and `limit: 3` gives three lines and no marker. */
export function capRow(R: string, text: string, sdkN: number, l3: string): { lines: string[]; v: V } {
  const s = concap20Stats(text, SENT), c = concap20Stats(l3, SENT), base = concap20Verdict(s, { total: 200 });
  const ctl = sdkN === 200 && c.lines === 3 && !c.marker && c.lastIndex === 200;
  const v: V = base === "FAIL" || !ctl ? "FAIL" : base;
  const w = text.split("\n").filter((l) => /s12-cap-\d+:/.test(l)).map((l) => l.length), lc = w.length ? `${Math.min(...w)}-${Math.max(...w)}` : "0-0";   // the RECORD case's "line length" (4.28), counts only
  return { lines: [concap20Line(s), `CHECK ${R} line-chars=${lc}`, `CHECK ${R} sdk-entries=${sdkN} limit3-lines=${c.lines} limit3-marker=${c.marker ? "yes" : "no"}`, legLine(R, "cap", v)], v };
}
async function conCap(x: Ctx): Promise<number> {
  const R = "R20-CON-CAP", port = first(x), t = await x.open(CU(port, "cap")), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: CU(port, "cap") })).text);
  await sleep(2500);
  const r = await m.call("browser_console_messages", { tab: mt }), l3 = await m.call("browser_console_messages", { tab: mt, limit: 3 }), n = (await entriesOf(t)).length;
  const c = capRow(R, r.text, n, l3.text);
  for (const l of c.lines) say(l);
  return finish(R, [c.v]);
}
// ---- R20-CON-4 --------------------------------------------------------------------------------------------------------------------------------
/** The MCP leg: the SDK's own DISARMED line, exactly, one line, isError, equal to browser_snapshot's text. Never the extension's message. */
export const judgeCon4Mcp = (r: { isError: boolean; text: string }, ctl: { isError: boolean; text: string }): V => (mcpLineVerdict(mcpLineRead(r, MCP_LINES.disarmedAll)) === "PASS" && ctl.isError && r.text === ctl.text ? "PASS" : "FAIL");
async function con4(x: Ctx): Promise<number> {
  const R = "R20-CON-4", port = first(x), t = await x.open(CU(port, "con"), true), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: CU(port, "con") })).text);
  await sleep(2000);
  await sig(`${R}-off`);
  const a = await att(() => t.consoleMessages()), ctl = await att(() => t.snapshot(), true);
  const mr = await m.call("browser_console_messages", { tab: mt }), mc = await m.call("browser_snapshot", { tab: mt });
  await sig(`${R}-off-done`);
  say(conrefLine(R, "disarmed", a.e ?? { code: "ok", message: "" }, MSG.disarmed, "snapshot")); say(`CHECK ${R} data ${JSON.stringify(a.e?.data ?? null)}`);
  const sv = judgeRefusal(a.e, { code: "DISARMED", message: MSG.disarmed, data: "keys:scope" }, ctl.e); say(legLine(R, "sdk", sv));
  say(mcplineLine(R, { leg: "mcp", ...mcpLineRead(mr, MCP_LINES.disarmedAll) })); const mv = judgeCon4Mcp(mr, mc); say(legLine(R, "mcp", mv));
  const back = await att(() => t.consoleMessages()); say(`ANSWER ${R} after ${back.e?.code ?? "ok"}`);
  const av: V = back.e ? "FAIL" : "PASS"; say(legLine(R, "after", av));
  return finish(R, [sv, mv, av]);
}
// ---- R20-CON-FLOOR ----------------------------------------------------------------------------------------------------------------------------
export const WAIT_OFF_MS = 5000, WAIT_ON_MS = 3500;
/** A wait below the sheet's 5 000 / 3 500 ms is a helper error (the STOP before the row). */
export function assertWaits(offMs: number, onMs: number): void { if (offMs < 5000 || onMs < 3500) throw new HelperDefect("R20-CON-FLOOR: a wait is below 5000 / 3500 ms"); }
/** The preconditions first (disarmed-ticks >= 3, after-ticks >= 2, else NOT MEASURED), then R19-CON-FLOOR's rule word for word. */
export function judgeFloor20(f: FloorCounts): V {
  if (f.disarmedTicks < 3 || f.afterTicks < 2) return "NOT MEASURED";
  return f.inReplyDisarmed === 0 && f.inReplyAfter === f.afterTicks && f.excDisarmed >= 3 && f.excInReplyDisarmed === 0 && f.excAfter >= 2 && f.excInReplyAfter === f.excAfter ? "PASS" : "FAIL";
}
async function conFloor(x: Ctx): Promise<number> {
  const R = "R20-CON-FLOOR", t = await x.open(CU(first(x), "tick"));
  assertWaits(WAIT_OFF_MS, WAIT_ON_MS);
  await sleep(2000);
  const off = Number(await sig(`${R}-off`));
  await sleep(WAIT_OFF_MS);
  realIo.signal(`${R}-off-done`);
  const [onPre, onPost] = (await realIo.pressed(`${R}-off-done`, 180_000)).split(",").map(Number) as [number, number | undefined];
  await sleep(WAIT_ON_MS);
  const readAt = Date.now(), es = await entriesOf(t);
  const ticks = JSON.parse(await t.evaluate<string>("JSON.stringify(window.__s12.ticks)")) as number[], excs = JSON.parse(await t.evaluate<string>("JSON.stringify(window.__s12.excs)")) as number[];
  const f = floorCounts({ ticks, excs, offMs: off, onMs: onPre, onTitleMs: onPost, readAt }, es);
  say(conFloorLine(f)); say(`CHECK ${R} wait-off-ms=${WAIT_OFF_MS} wait-on-ms=${WAIT_ON_MS}`);
  const v = judgeFloor20(f);
  if (v === "NOT MEASURED") say(`CHECK ${R} precondition not-reached`);
  say(legLine(R, "floor", v));
  return finish(R, [v]);
}
// ---- R20-ARGS-OLD (the old build is loaded by the swap frame, not here) ----------------------------------------------------------------------
async function argsOld(x: Ctx): Promise<number> {
  const R = "R20-ARGS-OLD", legs: V[] = [], t = await x.open(PG(first(x)));
  const one = (o: OldObs): void => { say(oldLine(R, o)); const v = judgeOldLeg(o); legs.push(v); say(legLine(R, o.leg, v)); };
  const sdkLeg = async (leg: "sdk" | "ref" | "file", call: () => Promise<unknown>): Promise<void> => { const r = await att(call); one({ leg, code: code(r.e), hint: hintSdk(r.e), forwarded: "n/a" }); };
  await sdkLeg("sdk", () => t.evaluate("(a) => a", { args: { n: 1 } }));
  await sdkLeg("ref", () => t.evaluateRef("(a) => document.body", { args: { n: 1 } }));
  await sdkLeg("file", () => t.evaluateToFile("(a) => a", { args: { n: 1 }, path: join(ROOT(), "s13-args-old.json") }));
  const raw = await att(() => x.c.call("evaluate", { expression: "(a) => a", args: 1, tab: t.handle }));
  one({ leg: "raw", code: code(raw.e), hint: hintSdk(raw.e), forwarded: rawForwarded(!raw.e) });
  const m = await x.mcp(), mt = handleOf((await m.call("browser_new_tab", { url: PG(first(x)) })).text);
  const mr = await m.call("browser_evaluate", { tab: mt, expression: "(a) => a", args: { n: 1 } }), ml = mcpLineRead(mr, MCP_LINES.argsOld);
  say(mcplineLine(R, { leg: "mcp", ...ml })); legs.push(mcpLineVerdict(ml)); say(legLine(R, "mcp", mcpLineVerdict(ml)));
  const c = await att(() => t.evaluate("1 + 1"));   // a call without args is unchanged
  one({ leg: "control", code: code(c.e), hint: hintSdk(c.e), forwarded: "n/a" });
  return finish(R, legs);
}
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "con-desc": () => conDesc(), "con-notea-a": (a) => run("noteaa", a, noteaA, "R20-CON-NOTEA"), "con-notea-b": (a) => run("noteab", a, noteaB), "con-cap": (a) => run("concap", a, conCap, "R20-CON-CAP"),
  "con-4": (a) => run("con4", a, con4), "con-floor": (a) => run("confloor", a, conFloor), "args-old": (a) => run("argsold", a, argsOld, "R20-ARGS-OLD"),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

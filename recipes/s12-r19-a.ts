// Step 12 S7-drivers-A: the actors of Run 19's liveA19 rows (docs/e2e-test-plan.md section 4.27) and the pure decisions they print. NOT run against Chrome by its
// author. Each command prints the sheet's line forms and `LEG <row> <label> <verdict>` lines (the PowerShell driver turns them into the row's one ROW, see
// recipes/s12-r19-a.ps1); exit 0 pass, 1 fail, 2 STOP (a `STOPWHY <reason>` line names the reason). Counts and fixed words only: no text, URL or value is printed.
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { realIo, windowed } from "./s11b.js";
import { K17 } from "./s11b-rules.js";
import { EXPECT10 } from "./s10-rules.js";
import { argsLine, argsTotalLine, argsrefLine, argsrefTotalLine, bannerConLine, bannerConVerdict, conFloorLine, conLine, conmcpLine, conmcpStats, dataField, effLine, floorCounts, globalsLine, IDLE_MIN_MS_19, newestEqual, stopcallLine, conrefLine, type ConEntry } from "./s12-forms.js";
import { concapLine, concapStats } from "./s12-forms-b.js";

export type V = "PASS" | "FAIL" | "NOT MEASURED" | "NOT DISCRIMINATING" | "RECORD";
export type Why = "attach-after-disarm" | "attach-on-refused-page" | "existing-tool-changed" | "args-ran-js-off";
export const SENT = "s12sent-5f3a9c71"; // s12-console.js's SENTINEL (counted, never printed)
export const legLine = (row: string, label: string, v: V): string => `LEG ${row} ${label} ${v}`;
export const kv = (line: string): Record<string, string> => Object.fromEntries([...line.matchAll(/([a-z-]+)=(\S+)/g)].map((m) => [m[1]!, m[2]!]));
/** A printed CON / CONFLOOR / CONCAP line against the expected key values (a key not named is not judged): the verdict is read from the printed line itself. */
export const judgeLine = (line: string, want: Record<string, string | number>): V => (Object.entries(want).every(([k, v]) => kv(line)[k] === String(v)) ? "PASS" : "FAIL");

// ---- the refusal texts: the shared sources (recipes/s10-rules.ts EXPECT10, s11b-rules.ts K17) -------------------------------------------------------
export const MSG = { blocked: EXPECT10.blockedTab, own: K17["K-own"].message, file: K17["K-filepage"].message, jsOff: EXPECT10.jsDisabled, disarmed: EXPECT10.disarmedAll } as const;
export const ARGS_TEXT: readonly (readonly [string, string])[] = [
  ["undefined", "args: the value holds undefined, which JSON cannot carry — use null, or leave the key out"],
  ["function", "args: the value holds a function, which JSON cannot carry — pass plain JSON data"],
  ["symbol", "args: the value holds a symbol, which JSON cannot carry — pass plain JSON data"],
  ["bigint", "args: the value holds a BigInt, which JSON cannot carry — pass it as a string or a number"],
  ["nan", "args: the value holds NaN or an infinite number, which JSON turns into null — pass null or a string"],
  ["cycle", "args: the value holds a cycle (an object that contains itself), which JSON cannot carry"],
  ["tojson", "args: JSON.stringify threw on the value (a throwing toJSON or getter) — pass plain JSON data"],
  ["big", "args: the value is 1048579 bytes as JSON, over the 1 MiB cap (1048576 bytes)"],
  ["fnnotstring", 'args: pass the function source as a string, such as "(a) => a.rows.length" — not a function'],
  ["raw-big", "args: the value is 1048579 bytes as JSON, over the 1 MiB cap (1048576 bytes)"],
  ["notfn", 'args: with args, expression must be a function source such as "(a) => a.rows.length"; it evaluated to number'],
];
export const SENT_LABELS = ["raw-big", "notfn"]; // the only two refusals that cross the wire
/** R19-ARGS-2: all eleven exact with no data, the control 1, the effect counter unmoved, and `sent` (calls that reached `client.call`) 2 in total: each wire label once, no other label at all. */
export function judgeArgs2(t: { exact: number; none: number; sent: number; perLabel: Record<string, number>; control: boolean; effects: "ok" | "stop" | "unread" }): V {
  const wireOnce = SENT_LABELS.every((l) => t.perLabel[l] === 1);
  return t.exact === 11 && t.none === 11 && t.sent === 2 && wireOnce && t.control && t.effects === "ok" ? "PASS" : "FAIL";
}

// ---- pure decisions ---------------------------------------------------------------------------------------------------------------------------
export interface Err { code: string; message: string; data?: unknown }
/** CONREF's clauses: the refusal's code, exact message, data keys, and equality with the named control's refusal. */
export function judgeRefusal(e: Err | undefined, want: { code: string; message: string; data?: string }, control?: Err): V {
  if (!e) return "FAIL";
  const same = control === undefined || (control.code === e.code && control.message === e.message && dataField(control.data) === dataField(e.data));
  return e.code === want.code && e.message === want.message && dataField(e.data) === (want.data ?? "none") && same ? "PASS" : "FAIL";
}
/** The effect counter: a refused call never moves it; above the control is a STOP (an `args` call ran that must not). */
export const judgeEffects = (before: number | null, after: number | null): "ok" | "stop" | "unread" => (before === null || after === null ? "unread" : after > before ? "stop" : "ok");
/** The Banner rule: a positive on a refused call is a STOP only with IDLE >= 20 000 ms and the slice's R19-BANNER-CTL passing; else NOT MEASURED, never a product FAIL. */
export function judgeBannerRefused(banner: "seen" | "none", idleMs: number, ctl: string): "PASS" | "STOP" | "NOT MEASURED" {
  if (banner === "none") return idleMs >= IDLE_MIN_MS_19 && ctl === "pass" ? "PASS" : "NOT MEASURED";
  return idleMs >= IDLE_MIN_MS_19 && ctl === "pass" ? "STOP" : "NOT MEASURED";
}
/** An in-call window (CON-MCP): `seen` expected; never a STOP. */
export const judgeBannerCall = (banner: "seen" | "none", idleMs: number, ctl: string): V => (idleMs < IDLE_MIN_MS_19 || ctl !== "pass" ? "NOT MEASURED" : banner === "seen" ? "PASS" : "FAIL");
/** A leg that sent no call (calls-sent=0): a banner there cannot come from the leg, so `seen` is recorded with its counts, never a STOP or a FAIL (R19-UP-6); IDLE and the control still apply. */
export const judgeBannerNoCall = (banner: "seen" | "none", idleMs: number, ctl: string): V => (idleMs < IDLE_MIN_MS_19 || ctl !== "pass" ? "NOT MEASURED" : banner === "seen" ? "RECORD" : "PASS");
/** A carried Run 18 row (R19-UP-6, R19-F-RAW*): 4.27's STOP map does not list them, so a positive with IDLE >= 20 000 and a passing control is a FAIL with both counts recorded (phase doc: continues anyway), never a STOP. */
export const judgeBannerCarried = (banner: "seen" | "none", idleMs: number, ctl: string): V => (idleMs < IDLE_MIN_MS_19 || ctl !== "pass" ? "NOT MEASURED" : banner === "seen" ? "FAIL" : "PASS");
export const bannerCallLine = (row: string, leg: string, idleMs: number, polls: number, banner: string, ctl: string): string => `BANNERCALL ${row} leg=${leg} idle-ms=${idleMs} polls=${polls} banner=${banner} control=${ctl}`;
export const bannerCtl19 = (slice: string, neg: { idleMs: number; polls: number; banner: string }, pos: { answer: string; polls: number; banner: string }): { lines: string[]; pass: boolean } => ({
  lines: [`BANNERCTL ${slice} leg=neg idle-ms=${neg.idleMs} polls=${neg.polls} banner=${neg.banner}`, `BANNERCTL ${slice} leg=pos answer=${pos.answer} polls=${pos.polls} banner=${pos.banner}`],
  pass: neg.idleMs >= IDLE_MIN_MS_19 && neg.banner === "none" && pos.answer === "ok" && pos.banner === "seen",
});
/** Milliseconds the idle gate still has to sleep: IDLE is the time since the last reply of any call but snapshot, listTabs and daemon.status; unknown counts from now. */
export const idleSleepMs = (now: number, stamp: number | null): number => (stamp === null ? IDLE_MIN_MS_19 : Math.max(0, IDLE_MIN_MS_19 - (now - stamp)));
export const STOP_FOR: Record<string, Why> = { "con-4": "attach-after-disarm", "args-3": "attach-on-refused-page" };

// ---- the actor's world ------------------------------------------------------------------------------------------------------------------------
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = (): string => process.env.S11_OUT ?? "";
const STAMP = (): string => join(OUT(), "last-attach.stamp");
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
export const say = (l: string): void => console.log(l);
export class StopWhy extends Error { constructor(readonly why: string, m: string) { super(m); } }
type Tab = import("../sdk/src/index.js").Tab;
type Client = import("../sdk/src/index.js").BridgeClient;
export const stamp = (): void => { mkdirSync(OUT(), { recursive: true }); writeFileSync(STAMP(), String(Date.now())); };
const readStamp = (): number | null => (existsSync(STAMP()) && /^\d+$/.test(readFileSync(STAMP(), "utf8").trim()) ? Number(readFileSync(STAMP(), "utf8").trim()) : null);
export async function idle(row: string): Promise<number> {
  const s = readStamp();
  if (s === null) stamp();
  await sleep(idleSleepMs(Date.now(), s));
  const n = Date.now() - (readStamp() ?? Date.now());
  say(`IDLE ${row} since-attach-ms=${n}`);
  return n;
}
/** One attempt: the call's error as {code,message,data} or its value; the stamp is set after every call but the three exempt reads (`exempt`). */
export async function att<T>(fn: () => Promise<T>, exempt = false): Promise<{ v?: T; e?: Err }> {
  try { return { v: await fn() }; } catch (x) { const m = x as { code?: unknown; message?: unknown; data?: unknown }; return { e: { code: String(m.code ?? "ERROR"), message: String(m.message ?? ""), data: m.data } }; } finally { if (!exempt) stamp(); }
}
export interface Mcp { call(tool: string, a: Record<string, unknown>, fixture?: string): Promise<{ text: string; isError: boolean }>; close(): Promise<void> }
/** The three reads the IDLE definition leaves out (the sheet: any call other than snapshot, listTabs, daemon.status counts). */
export const IDLE_EXEMPT_TOOLS: readonly string[] = ["browser_snapshot", "browser_list_tabs", "browser_status"];
/** The one line R19-LOGS scans per tool result. `browser_list_tabs` answers every open tab of the human and `browser_status` names the human's active tab, so only counts and fixed words are kept (what the rows judge is judged on the raw text before this). */
export function actorRecord(tool: string, text: string, fixture?: string): string {
  const fx = fixture !== undefined && fixture !== "";
  const has = fx && text.split(/[\s*]+/).includes(fixture);
  const n = text.split("\n").filter((l) => l.trim() !== "").length;
  const act = /^Active tab: \[([^\]]+)\]/m.exec(text)?.[1];
  const kept = tool === "browser_list_tabs" ? `list-tabs lines=${n} fixture-handle=${has ? "yes" : "no"}`
    : tool === "browser_status" ? `status lines=${n} extension=${/^Extension: connected/m.test(text) ? "connected" : "other"} active=${act === undefined ? "none" : fx && act === fixture ? "fixture" : "other"}`
    : text;
  return JSON.stringify({ tool, text: kept });
}
async function mcpOpen(slice: string): Promise<Mcp> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport, getDefaultEnvironment } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const c = new Client({ name: "s12-r19-a-mcp", version: "0" });
  await c.connect(new StdioClientTransport({ command: process.execPath, args: [join(REPO, "mcp", "dist", "index.js")], cwd: REPO, stderr: "pipe", env: { ...getDefaultEnvironment(), ...(process.env.BRIDGE_TOKEN ? { BRIDGE_TOKEN: process.env.BRIDGE_TOKEN } : {}) } }));
  return {
    async call(tool, a, fixture) {
      const r = (await c.callTool({ name: tool, arguments: a })) as { content?: Array<{ type: string; text?: string }>; isError?: boolean };
      const text = (r.content ?? []).filter((x) => x.type === "text").map((x) => x.text ?? "").join("\n");
      appendFileSync(join(OUT(), `actors-${slice}.jsonl`), actorRecord(tool, text, fixture) + "\n"); // one {tool,text} per tool result: R19-LOGS scans it
      if (!IDLE_EXEMPT_TOOLS.includes(tool)) stamp();
      return { text, isError: r.isError === true };
    },
    close: () => c.close(),
  };
}
export interface Ctx { c: Client; slice: string; sent: () => number; mcp: () => Promise<Mcp>; open(url: string, active?: boolean, keep?: boolean): Promise<Tab>; ctl: string; opts: Record<string, string> }
export const URL = (q: string, page = "s12-console.html"): string => `http://localhost:8081/${page}?s12=${q}`;
/** `stateless`: the row id of an actor that changes no state ("opts" = the --row option); a throw there is that row's FAIL leg, never a wave STOP (m2). */
export const crashLine = (row: string): string => legLine(row, "actor-error", "FAIL");
export async function run(name: string, argv: string[], fn: (x: Ctx) => Promise<number>, stateless?: string): Promise<number> {
  const opts: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) opts[argv[i]!.replace(/^--/, "")] = argv[i + 1] ?? "";
  const { connect } = await import("../sdk/src/index.js");
  const c = await connect({ name: `s12-r19-a-${name}`, failureReports: false });
  let sent = 0;
  const orig = c.call.bind(c);
  c.call = (async (...a: Parameters<typeof orig>) => { sent++; return orig(...a); }) as typeof c.call;
  const tabs: Tab[] = [];
  let mcp: Mcp | undefined;
  try {
    return await fn({
      c, slice: opts.slice ?? "", sent: () => sent, ctl: opts.ctl ?? "absent", opts,
      mcp: async () => (mcp ??= await mcpOpen(opts.slice ?? "")),
      open: async (url, active = false, keep = false) => { const t = await c.newTab(url, { active }); stamp(); if (!keep) tabs.push(t); await sleep(1200); return t; },
    });
  } catch (x) {
    if (x instanceof StopWhy) { say(`STOPWHY ${x.why}`); return 2; }
    if (stateless !== undefined) { say(crashLine(stateless === "opts" ? opts.row ?? name : stateless)); return 1; }
    throw x;
  } finally {
    for (const t of tabs) { await t.close().catch(() => undefined); stamp(); }
    await mcp?.close().catch(() => undefined);
    c.close();
  }
}
export const finish = (row: string, legs: V[]): number => { const bad = legs.filter((v) => v === "FAIL").length; say(`CHECK ${row} clauses=${legs.length} failed=${bad}`); return bad > 0 ? 1 : legs.includes("NOT MEASURED") ? 3 : 0; };
export const handleOf = (t: string): string => /T\d+/.exec(t)?.[0] ?? "";
export const entriesOf = async (t: Tab, o: Record<string, unknown> = {}): Promise<ConEntry[]> => (await t.consoleMessages(o)) as unknown as ConEntry[];

// ---- ARGS rows (no state change) --------------------------------------------------------------------------------------------------------------
const TABLE: unknown[] = [{ rows: [1, 2, { z: null, a: [true, false] }], name: "é€😀", n: -0.5, big: 1e21 }, null, [[], {}, "", 0], "plain string", { "sentinel-args-K7W3-key": "sentinel-args-K7W3-value" }];
const EFF_FN = "(a) => { window.__s12eff = (window.__s12eff || 0) + 1; return window.__s12eff; }";
const readEff = async (t: Tab): Promise<number | null> => { const r = await att(() => t.evaluate<unknown>("window.__s12eff === undefined ? -1 : window.__s12eff")); return typeof r.v === "number" && r.v >= 0 ? r.v : r.v === -1 ? 0 : null; };
const eqJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const unwrap = (text: string): unknown => { try { return JSON.parse(text); } catch { return text; } };
async function args1(x: Ctx): Promise<number> {
  const R = "R19-ARGS-1";
  const t = await x.open(URL("a1", "e2e-playground.html"));
  const m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: URL("a1", "e2e-playground.html") })).text);
  await sleep(1200);
  const legs: V[] = [];
  const tot = { sdk: { v: 0, j: 0 }, mcp: { v: 0, j: 0 } };
  for (const [i, v] of TABLE.entries()) {
    const a = await att(() => t.evaluate<unknown>("(a) => a", { args: v })), b = await att(() => t.evaluate<string>("(a) => JSON.stringify(a)", { args: v }));
    const ve = !a.e && eqJson(a.v, v), je = !b.e && b.v === JSON.stringify(v);
    tot.sdk.v += +ve; tot.sdk.j += +je; say(argsLine(R, `v${i + 1}-sdk`, a.e?.code ?? "ok", ve, je));
    const a2 = await m.call("browser_evaluate", { expression: "(a) => a", args: v, tab: mt }), b2 = await m.call("browser_evaluate", { expression: "(a) => JSON.stringify(a)", args: v, tab: mt });
    const ve2 = !a2.isError && eqJson(unwrap(a2.text), v), je2 = !b2.isError && (unwrap(b2.text) === JSON.stringify(v) || b2.text === JSON.stringify(v));
    tot.mcp.v += +ve2; tot.mcp.j += +je2; say(argsLine(R, `v${i + 1}-mcp`, a2.isError ? "ERROR" : "ok", ve2, je2));
  }
  for (const via of ["sdk", "mcp"] as const) { say(argsTotalLine(R, { table: 5, valueEqual: tot[via].v, jsonEqual: tot[via].j, via })); legs.push(tot[via].v === 5 && tot[via].j === 5 ? "PASS" : "FAIL"); }
  const c1 = await att(() => t.evaluate<number>("1 + 1")), c2 = await att(() => x.c.call("evaluate", { expression: "function f() {}", tab: t.handle }));
  say(`ANSWER ${R} control-1 ${c1.e ? c1.e.code : "ok"}`); say(`ANSWER ${R} control-2 ${c2.e ? c2.e.code : "ok"}`);
  if (c1.e || c1.v !== 2 || c2.e || (c2.v as { kind?: string } | undefined)?.kind !== "function") throw new StopWhy("existing-tool-changed", "a call without args answered differently");
  legs.push("PASS");
  say(legLine(R, "table", legs[0] === "PASS" && legs[1] === "PASS" ? "PASS" : "FAIL"));
  return finish(R, legs);
}
const MAXSTR = "x".repeat(1_048_577);
async function args2(x: Ctx): Promise<number> {
  const R = "R19-ARGS-2";
  const t = await x.open(URL("a2", "e2e-playground.html"));
  const ctl = await att(() => t.evaluate<number>(EFF_FN, { args: 1 }));
  const cyc: Record<string, unknown> = {}; cyc.self = cyc;
  const cases: Record<string, () => Promise<unknown>> = {
    undefined: () => t.evaluate(EFF_FN, { args: { x: undefined } }), function: () => t.evaluate(EFF_FN, { args: () => 1 }), symbol: () => t.evaluate(EFF_FN, { args: Symbol("s") }),
    bigint: () => t.evaluate(EFF_FN, { args: 10n }), nan: () => t.evaluate(EFF_FN, { args: Number.NaN }), cycle: () => t.evaluate(EFF_FN, { args: cyc }),
    tojson: () => t.evaluate(EFF_FN, { args: { toJSON() { throw new Error("x"); } } }), big: () => t.evaluate(EFF_FN, { args: MAXSTR }),
    fnnotstring: () => t.evaluate((() => 1) as unknown as string, { args: 1 }), "raw-big": () => x.c.call("evaluate", { tab: t.handle, expression: EFF_FN, args: MAXSTR }),
    notfn: () => t.evaluate("1", { args: 1 }),
  };
  const before = await readEff(t);
  let exact = 0, none = 0, sent = 0;
  const perLabel: Record<string, number> = {};
  for (const [label, want] of ARGS_TEXT) {
    const s0 = x.sent(), r = await att(cases[label]!), d = x.sent() - s0;
    const ex = r.e?.code === "BAD_PARAMS" && r.e.message === want;
    exact += +ex; none += +(dataField(r.e?.data) === "none"); sent += d > 0 ? 1 : 0; perLabel[label] = d;
    say(argsrefLine(label, { code: r.e?.code ?? "ok", exact: ex, data: r.e?.data, sent: d > 0 }));
  }
  const after = await readEff(t);
  const sc = await att(() => t.evaluate("(a) => a.n;", { args: { n: 1 } }));
  say(`ANSWER ${R} semicolon ${sc.e?.code ?? "ok"}`);
  const eff = judgeEffects(before, after);
  say(argsrefTotalLine({ refusals: ARGS_TEXT.length, exact, dataNone: none, sent, effects: eff === "ok" ? 0 : (after ?? 0) - (before ?? 0), control: ctl.v === 1 ? 1 : 0 }));
  say(effLine(R, before, after));
  if (eff === "stop") throw new StopWhy("throw-after-state", "an args call ran that must not (the effect counter moved)");
  const v = judgeArgs2({ exact, none, sent, perLabel, control: ctl.v === 1, effects: eff });
  say(legLine(R, "refusals", v));
  return finish(R, [v]);
}
async function argsGlobal(x: Ctx): Promise<number> {
  const R = "R19-ARGS-GLOBAL";
  const t = await x.open(URL("ag", "e2e-playground.html"));
  const keys = async (): Promise<string[]> => JSON.parse((await t.evaluate<string>("JSON.stringify(Object.getOwnPropertyNames(window))")) as string) as string[];
  const k0 = await keys();
  await t.evaluate("(a) => a.k", { args: { k: 1 } }); await t.evaluate("function (a) { return a; }", { args: 1 });
  const third = await t.evaluate<string>("(a) => typeof args + typeof a", { args: 1 });
  const fresh = (await keys()).filter((k) => !k0.includes(k));
  say(globalsLine(R, { args: fresh.includes("args"), fn: fresh.some((k) => k !== "args"), newOwnKeys: fresh.length }));
  const ok = fresh.length === 0 && third === "undefinednumber";
  say(legLine(R, "globals", ok ? "PASS" : "FAIL"));
  return finish(R, [ok ? "PASS" : "FAIL"]);
}
async function argsCsp(x: Ctx): Promise<number> {
  const R = "R19-ARGS-CSP";
  const t = await x.open(URL("ac", "e2e-playground-csp.html"));
  const probe = await t.evaluate<string>("document.querySelector('#eval-probe').textContent");
  if (!String(probe).startsWith("page eval: BLOCKED")) { say(legLine(R, "control", "NOT MEASURED")); return finish(R, ["NOT MEASURED"]); }
  const a = await att(() => t.evaluate<number>("(a) => a.rows.length", { args: { rows: [1, 2, 3] } })), b = await att(() => t.evaluate<string>("(a) => JSON.stringify(a)", { args: { z: null, a: 1 } }));
  const ok = a.v === 3 && b.v === '{"z":null,"a":1}';
  say(`ANSWER ${R} calls ${a.e?.code ?? b.e?.code ?? "ok"}`); say(legLine(R, "csp", ok ? "PASS" : "FAIL"));
  return finish(R, [ok ? "PASS" : "FAIL"]);
}
async function argsStop(x: Ctx): Promise<number> {
  const R = "R19-ARGS-STOP";
  const t = await x.open(URL("as", "e2e-playground.html"));
  const beat = (): Promise<number> => t.evaluate<number>("window.__s12.beat");
  const t0 = Date.now(), r = await att(() => t.evaluate("(a) => { const t = Date.now(); while (Date.now() - t < a.ms) {} return 1; }", { args: { ms: 60000 }, timeoutMs: 1500 })), ms = Date.now() - t0;
  const n1 = await att(() => t.evaluate<number>("1 + 1")), n2 = await att(() => t.evaluate<number>("(a) => a", { args: 5 }));
  const b0 = await beat(); await sleep(2000); const b1 = await beat();
  const exact = n1.v === 2 && n2.v === 5, usable = exact && b1 > b0;
  say(stopcallLine(R, { answer: r.e?.code ?? "ok", ms, boundMs: 1500, usable, next: exact ? "exact" : "other" }));
  const ok = r.e?.code === "TIMEOUT" && ms >= 1500 && ms <= 3500 && usable;
  say(legLine(R, "stop", ok ? "PASS" : "FAIL"));
  return finish(R, [ok ? "PASS" : "FAIL"]);
}

// ---- CON read rows ----------------------------------------------------------------------------------------------------------------------------
const BASE = { url: 0, stack: 0, "uncaught-first": "yes" };
export const CON_ROWS: Record<string, { q: string; wait: number; reads: Array<{ label: string; o: Record<string, unknown>; want: Record<string, string | number> }> }> = {
  "R19-CON-1": { q: "con", wait: 2000, reads: [
    { label: "all", o: {}, want: { ...BASE, entries: 11, console: 10, exception: 1, sentinel: 11, ordered: "yes" } },
    { label: "limit3", o: { limit: 3 }, want: { ...BASE, entries: 3, newest: "yes" } },
    { label: "error", o: { level: "error" }, want: { ...BASE, entries: 2, console: 1, exception: 1 } }] },
  "R19-CON-2": { q: "con", wait: 2000, reads: [{ label: "errors", o: { level: "error" }, want: { ...BASE, entries: 2, console: 1, exception: 1, sentinel: 2 } }] },
  "R19-CON-REJ": { q: "rej", wait: 1000, reads: [{ label: "rej", o: {}, want: { ...BASE, entries: 1, console: 0, exception: 1, sentinel: 1 } }] },
  "R19-CON-BIG": { q: "big", wait: 1500, reads: [{ label: "big", o: {}, want: { ...BASE, entries: 1, console: 1, exception: 0, sentinel: 0, maxlen: 2000, cut: 1 } }] },
  "R19-CON-NAV": { q: "nav", wait: 2000, reads: [{ label: "nav", o: {}, want: { url: 0, stack: 0, entries: 2, console: 2, exception: 0, sentinel: 2 } }] },
};
async function conRead(x: Ctx): Promise<number> {
  const R = x.opts.row ?? "", spec = CON_ROWS[R];
  if (!spec) throw new Error("unknown con row");
  const t = await x.open(URL(spec.q));
  await sleep(spec.wait);
  return finish(R, await conLegs(R, spec, (o) => entriesOf(t, o)));
}
/** One read per spec entry, each judged from ITS OWN printed line (the `all` read's entries are the `limit3` read's control). */
export async function conLegs(R: string, spec: (typeof CON_ROWS)[string], read: (o: Record<string, unknown>) => Promise<ConEntry[]>): Promise<V[]> {
  const legs: V[] = [];
  let full: ConEntry[] = [];
  for (const r of spec.reads) {
    const es = await read(r.o);
    if (r.label === "all") full = es;
    const line = conLine(R, r.label, es, { sentinel: SENT, ordered: r.label === "all" ? true : undefined, newest: r.label === "limit3" ? newestEqual(es, full, 3) : undefined });
    say(line);
    const exc = es.filter((e) => e.kind === "exception");
    const v = judgeLine(line, r.want) === "PASS" && exc.every((e) => e.level === "error") ? "PASS" : "FAIL";
    legs.push(v); say(legLine(R, r.label, v));
  }
  return legs;
}

// ---- MCP rows ---------------------------------------------------------------------------------------------------------------------------------
const EXISTING = ["browser_snapshot", "browser_evaluate", "browser_list_tabs", "browser_status", "browser_network_requests"] as const;
async function conMcp(x: Ctx): Promise<number> {
  const R = "R19-CON-MCP";
  const m = await x.mcp(), sdkTab = await x.open(URL("con"));
  const mt = handleOf((await m.call("browser_new_tab", { url: URL("con") })).text);
  await sleep(2000);
  const sdkN = (await entriesOf(sdkTab)).length;
  const legs: V[] = [];
  const idleMs = await idle(R);
  const w = await windowed(realIo, R, [], () => m.call("browser_console_messages", { tab: mt }));
  const reads: Array<[string, { text: string }, number, number]> = [["all", w.v, 11, sdkN]];
  for (const [label, a, n] of [["error", { level: "error" }, 2], ["limit3", { limit: 3 }, 3]] as const) reads.push([label, await m.call("browser_console_messages", { tab: mt, ...a }), n, sdkN]);
  for (const [label, r, n, sn] of reads) {
    const s = conmcpStats(r.text);
    say(conmcpLine(label, { ...s, entriesViaSdk: sn }));
    const v = s.lines === n && s.form === n && !s.truncated && (label !== "all" || (sn === 11 && /^\S+ error uncaught /m.test(r.text))) ? "PASS" : "FAIL";
    legs.push(v); say(legLine(R, label, v));
  }
  const blank = handleOf((await m.call("browser_new_tab", { url: "about:blank" })).text);
  const e = await m.call("browser_console_messages", { tab: blank });
  say(`CHECK ${R} empty-text=${e.text === "No console messages." ? "exact" : "other"}`);
  legs.push(e.text === "No console messages." ? "PASS" : "FAIL"); say(legLine(R, "empty", legs[legs.length - 1]!));
  const ex: boolean[] = [];
  const probes: Array<[string, Record<string, unknown>]> = [["browser_snapshot", { tab: mt }], ["browser_evaluate", { tab: mt, expression: "1 + 1" }], ["browser_list_tabs", {}], ["browser_status", {}], ["browser_network_requests", { tab: mt }]];
  for (const [tool, a] of probes) { const r = await m.call(tool, a, mt); ex.push(!r.isError && r.text.trim() !== "" && (tool !== "browser_evaluate" || /\b2\b/.test(r.text)) && (tool !== "browser_list_tabs" || (mt !== "" && r.text.includes(mt)))); }
  say(`CHECK ${R} existing tools=${EXISTING.length} ok=${ex.filter(Boolean).length}`);
  if (ex.includes(false)) throw new StopWhy("existing-tool-changed", "an existing tool answered in another form");
  say(`CONMCPWIN idle-ms=${idleMs} replied=${w.banner === null ? "n/a" : "sampled"} banner-sample=${w.banner === null ? "none" : w.banner ? "seen" : "none"}`);
  say(`ANSWER ${R} window ok`);
  return finish(R, legs);
}
async function conCap(x: Ctx): Promise<number> {
  const R = "R19-CON-CAP";
  const m = await x.mcp(), sdkTab = await x.open(URL("cap"));
  const mt = handleOf((await m.call("browser_new_tab", { url: URL("cap") })).text);
  await sleep(2500);
  const r = await m.call("browser_console_messages", { tab: mt }), sdkN = (await entriesOf(sdkTab)).length;
  const s = concapStats(r.text, SENT);
  say(concapLine(s)); say(`CHECK ${R} sdk-entries=${sdkN} more=${s.moreLines}`);
  const ok = s.bodyChars <= 20000 && s.marker && s.firstIndex === 1 && s.consecutive && sdkN === 200 && s.moreLines === 200 - s.lines;
  say(legLine(R, "cap", ok ? "PASS" : "FAIL"));
  return finish(R, [ok ? "PASS" : "FAIL"]);
}

// ---- the refusal rows (the driver changes the safety state between the actor's signals) ------------------------------------------------------
export const sig = async (name: string): Promise<string> => { realIo.signal(name); return realIo.pressed(name, 180_000); };
type Txt = { text: string; isError: boolean };
/** The MCP clauses of a refusal row: CON-3 the console tool's text equals browser_snapshot's (one error line); CON-JSOFF it equals browser_evaluate's and the snapshot answers; CON-4 an error carrying the disarmed message. */
export function judgeMcpRefusal(row: string, r: Txt, ctl?: Txt, snap?: Txt): V {
  if (!r.isError || r.text.trim() === "") return "FAIL";
  if (row === "R19-CON-4") return r.text.includes(MSG.disarmed) ? "PASS" : "FAIL";
  if (!ctl || r.text !== ctl.text) return "FAIL";
  return row === "R19-CON-JSOFF" && (!snap || snap.isError) ? "FAIL" : "PASS";
}
async function refuseRow(x: Ctx, o: { row: string; label: string; page: string; change?: string; want: { code: string; message: string; data?: string }; same: "snapshot" | "evaluate" | "none"; sampler?: string; stop?: Why }): Promise<{ sdk?: Err; mcp: Txt; mcpCtl?: Txt; mcpSnap?: Txt }> {
  const R = o.row;
  const t = await x.open(o.page, true), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: o.page })).text);
  await sleep(1500);
  if (o.change) await sig(o.change);
  const idleMs = await idle(R);
  let out: { sdk?: Err; mcp: Txt; mcpCtl?: Txt; mcpSnap?: Txt; ctlE?: Err } = { mcp: { text: "", isError: false } };
  const calls = async (): Promise<void> => {
    const a = await att(() => t.consoleMessages());
    const ctl = o.same === "evaluate" ? await att(() => t.evaluate("1")) : o.same === "snapshot" ? await att(() => t.snapshot(), true) : { e: undefined };
    const mr = await m.call("browser_console_messages", { tab: mt });
    const mcpCtl = o.same === "evaluate" ? await m.call("browser_evaluate", { tab: mt, expression: "1" }) : o.same === "snapshot" ? await m.call("browser_snapshot", { tab: mt }) : undefined;
    const mcpSnap = o.same === "evaluate" ? await m.call("browser_snapshot", { tab: mt }) : undefined;
    out = { sdk: a.e, mcp: mr, mcpCtl, mcpSnap, ctlE: ctl.e };
    if (!a.e) say(`CHECK ${R} entries-returned=${(a.v as unknown[]).length}`);
  };
  const w = await windowed(realIo, o.sampler ?? R, [], calls);
  void w;
  const v = judgeRefusal(out.sdk, o.want, o.same === "none" ? undefined : out.ctlE);
  say(conrefLine(R, o.label, out.sdk ?? { code: "ok", message: "" }, o.want.message, o.same));
  say(legLine(R, o.label, v));
  say(`IDLE ${R}-window since-attach-ms=${idleMs}`);
  return out;
}
export const REFUSE: Record<string, Parameters<typeof refuseRow>[1]> = {
  "R19-CON-3": { row: "R19-CON-3", label: "blocked", page: "http://s12blk.localhost:8081/s12-console.html?s12=con", change: "R19-CON-3-block", want: { code: "DOMAIN_BLOCKED", message: MSG.blocked }, same: "snapshot", stop: "attach-on-refused-page" },
  "R19-CON-JSOFF": { row: "R19-CON-JSOFF", label: "jsoff", page: URL("con"), change: "R19-CON-JSOFF-js", want: { code: "JS_DISABLED", message: MSG.jsOff }, same: "evaluate", stop: "attach-on-refused-page" },
  "R19-CON-4": { row: "R19-CON-4", label: "disarmed", page: URL("con"), change: "R19-CON-4-off", want: { code: "DISARMED", message: MSG.disarmed, data: "keys:scope" }, same: "snapshot", stop: "attach-after-disarm" },
};
async function refuse(x: Ctx): Promise<number> {
  const spec = REFUSE[x.opts.row ?? ""];
  if (!spec) throw new Error("unknown refusal row");
  const r = await refuseRow(x, spec);
  const legs: V[] = [];
  const mv = judgeMcpRefusal(spec.row, r.mcp, r.mcpCtl, r.mcpSnap);
  say(`CHECK ${spec.row} mcp-refused=${mv === "PASS" ? "yes" : "no"}`); say(legLine(spec.row, "mcp", mv)); legs.push(mv);
  await sig(`${spec.change}-done`);
  if (spec.row === "R19-CON-4") {
    const back = await att(() => x.c.tab().consoleMessages());
    say(`ANSWER ${spec.row} after ${back.e?.code ?? "ok"}`);
    const av: V = back.e ? "FAIL" : "PASS"; say(legLine(spec.row, "after", av)); legs.push(av);
  }
  return finish(spec.row, legs);
}

async function args3(x: Ctx): Promise<number> {
  const R = "R19-ARGS-3";
  const t = await x.open(URL("a3", "e2e-playground.html"), true), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: URL("a3", "e2e-playground.html") })).text);
  await sleep(1200);
  const ctl = await att(() => t.evaluate<number>(EFF_FN, { args: 1 }));
  const before = await readEff(t);
  await sig("R19-ARGS-3-js");
  const idleMs = await idle(R);
  const got: Array<{ label: string; e?: Err }> = [];
  await windowed(realIo, R, [], async () => {
    got.push({ label: "sdk", e: (await att(() => t.evaluate(EFF_FN, { args: 1 }))).e });
    got.push({ label: "raw", e: (await att(() => x.c.call("evaluate", { tab: t.handle, expression: EFF_FN, args: 1 }))).e });
    const mr = await m.call("browser_evaluate", { tab: mt, expression: EFF_FN, args: 1 });
    got.push({ label: "mcp", e: mr.isError && mr.text.includes(MSG.jsOff) ? { code: "JS_DISABLED", message: MSG.jsOff } : undefined });
    got.push({ label: "noargs", e: (await att(() => t.evaluate("1"))).e });
  });
  const ms = await m.call("browser_snapshot", { tab: mt });
  const snap = { e: ms.isError ? ({ code: "ERROR", message: "" } as Err) : undefined };
  await sig("R19-ARGS-3-js-done");
  const after = await readEff(t);
  const legs = got.map((g) => { const v = judgeRefusal(g.e, { code: "JS_DISABLED", message: MSG.jsOff }); say(conrefLine(R, g.label, g.e ?? { code: "ok", message: "" }, MSG.jsOff, "none")); say(legLine(R, g.label, v)); return v; });
  say(`ANSWER ${R} snapshot ${snap.e?.code ?? "ok"}`); say(effLine(R, before, after));
  say(`IDLE ${R}-window since-attach-ms=${idleMs}`);
  const eff = judgeEffects(before, after);
  if (eff === "stop") throw new StopWhy("args-ran-js-off", "the effect counter moved while JavaScript was off");
  const v: V = ctl.v === 1 && !snap.e && eff === "ok" ? "PASS" : "FAIL";
  say(legLine(R, "state", v));
  return finish(R, [...legs, v]);
}

// CON-FRAME / CON-NOTEA: a block-list edit between two reads (the driver adds and removes the pattern)
const WANT2 = { url: 0, stack: 0, exception: 0 };
export function judgeFrame(a: ConEntry[], b: ConEntry[]): V {
  const ln = (es: ConEntry[]): string => conLine("x", "x", es, { sentinel: SENT });
  const p = judgeLine(ln(a), { ...WANT2, entries: 2, console: 2, sentinel: 2 });
  if (b.length === 2) return "NOT DISCRIMINATING"; // the frame is not read at all: leg a's drop clause cannot be judged
  return p === "PASS" && judgeLine(ln(b), { url: 0, stack: 0, entries: 13, console: 12, exception: 1, sentinel: 13 }) === "PASS" ? "PASS" : "FAIL";
}
/** Leg b (cross site): the page's own 2 messages and nothing of the frame; recorded without a control when leg a could not tell a dropped frame from an unread one. */
export function judgeFrameB(c: ConEntry[], legA: V): V {
  const ok = judgeLine(conLine("x", "b", c, { sentinel: SENT }), { entries: 2, console: 2, exception: 0, sentinel: 2, url: 0, stack: 0 }) === "PASS";
  return !ok ? "FAIL" : legA === "NOT DISCRIMINATING" ? "RECORD" : "PASS";
}
export function judgeNoteA(blocked: ConEntry[], allowed: ConEntry[]): V {
  const mk = (es: ConEntry[], ms: string[]): string => conLine("x", "x", es, { sentinel: SENT, markers: ms });
  const bl = judgeLine(mk(blocked, ["s12-notea", "s12-notea-long"]), { entries: 0, marker: 0, url: 0, stack: 0 });
  const al = mk(allowed, ["s12-noteaok"]);
  if (bl !== "PASS" || allowed.length === 0) return "FAIL";
  if (judgeLine(al, { entries: 1, marker: 0, url: 0, stack: 0 }) === "PASS") return "RECORD"; // an Error-holding object dropped: not told apart from a V8 cut
  return judgeLine(al, { entries: 2, console: 2, exception: 0, sentinel: 1, marker: 1, url: 0, stack: 0 });
}
async function conFrame(x: Ctx): Promise<number> {
  const R = "R19-CON-FRAME";
  const t = await x.open("http://p.s12site.localhost:8081/s12-console.html?s12=frame"), o = await x.open(URL("frameoop"));
  await sleep(2000);
  await sig("R19-CON-FRAME-block");
  const a = await entriesOf(t);
  await sig("R19-CON-FRAME-block-done");
  const b = await entriesOf(t), c = await entriesOf(o);
  for (const [l, es] of [["a-pattern", a], ["a-nopattern", b], ["b-oop", c]] as const) say(conLine(R, l, es, { sentinel: SENT }));
  const va = judgeFrame(a, b), vb = judgeFrameB(c, va);
  say(legLine(R, "a", va)); say(legLine(R, "b", vb));
  return finish(R, [va, vb]);
}
async function conNoteA(x: Ctx): Promise<number> {
  const R = "R19-CON-NOTEA";
  const t = await x.open(URL("notea")), k = await x.open(URL("noteaok"));
  await sleep(2000);
  await sig("R19-CON-NOTEA-block");
  const bl = await entriesOf(t), al = await entriesOf(k);
  await sig("R19-CON-NOTEA-block-done");
  say(conLine(R, "blocked", bl, { sentinel: SENT, markers: ["s12-notea", "s12-notea-long"] })); say(conLine(R, "allowed", al, { sentinel: SENT, markers: ["s12-noteaok"] }));
  const v = judgeNoteA(bl, al);
  say(legLine(R, "notea", v));
  return finish(R, [v === "RECORD" ? "PASS" : v]);
}
async function conFloor(x: Ctx): Promise<number> {
  const R = "R19-CON-FLOOR";
  const t = await x.open(URL("tick"));
  await sleep(2000);
  const off = Number(await sig(`${R}-off`));
  await sleep(3000); // §4.27's step text: "wait 3 s" (N1 left as the sheet says)
  realIo.signal(`${R}-off-done`);
  const [onPre, onPost] = (await realIo.pressed(`${R}-off-done`, 180_000)).split(",").map(Number) as [number, number | undefined]; // the ON press, then the ON title (the driver writes "pre,post")
  await sleep(2500);
  const readAt = Date.now(), es = await entriesOf(t);
  const ticks = JSON.parse(await t.evaluate<string>("JSON.stringify(window.__s12.ticks)")) as number[], excs = JSON.parse(await t.evaluate<string>("JSON.stringify(window.__s12.excs)")) as number[];
  const f = floorCounts({ ticks, excs, offMs: off, onMs: onPre, onTitleMs: onPost, readAt }, es);
  say(conFloorLine(f));
  const ok = f.disarmedTicks >= 3 && f.inReplyDisarmed === 0 && f.afterTicks >= 2 && f.inReplyAfter === f.afterTicks && f.excDisarmed >= 3 && f.excInReplyDisarmed === 0 && f.excAfter >= 2 && f.excInReplyAfter === f.excAfter;
  say(legLine(R, "floor", ok ? "PASS" : "FAIL"));
  return finish(R, [ok ? "PASS" : "FAIL"]);
}
/** CON-OWN / CON-FILE: the target is the one NEW hidden-as-blocked tab the driver's window created (never a tab of the human). */
async function hiddenNew(c: Client, before: string[]): Promise<string | undefined> {
  const now = (await c.tabs()).filter((r) => r.hidden === "blocked" && r.owner === undefined).map((r) => r.handle).filter((h) => !before.includes(h));
  return now.length === 1 ? now[0] : undefined;
}
async function ownFile(x: Ctx): Promise<number> {
  const R = x.opts.row ?? "", own = R === "R19-CON-OWN";
  const before = (await x.c.tabs()).filter((r) => r.hidden === "blocked").map((r) => r.handle);
  await sig(`${R}-open`);
  await sleep(1500);
  const h = await hiddenNew(x.c, before);
  if (!h) { say(`CHECK ${R} target=not-found`); say(legLine(R, own ? "own" : "file", "NOT MEASURED")); await sig(`${R}-open-done`); return finish(R, ["NOT MEASURED"]); }
  const t = await x.c.claim(h);
  stamp();
  const idleMs = await idle(R);
  let e: Err | undefined, ce: Err | undefined;
  await windowed(realIo, R, [], async () => { e = (await att(() => t.consoleMessages())).e; ce = (await att(() => t.snapshot(), true)).e; });
  await t.release().catch(() => undefined);
  stamp();
  await sig(`${R}-open-done`);
  const want = { code: "DOMAIN_BLOCKED", message: own ? MSG.own : MSG.file };
  say(conrefLine(R, own ? "own" : "file", e ?? { code: "ok", message: "" }, want.message, "snapshot")); say(`IDLE ${R}-window since-attach-ms=${idleMs}`);
  const v = judgeRefusal(e, want, ce);
  say(legLine(R, own ? "own" : "file", v));
  return finish(R, [v]);
}

// ---- the banner control rows and the judges that read the PowerShell sampler's results ---------------------------------------------------------
async function bannerCtlRow(x: Ctx): Promise<number> {
  const t = await x.open(URL("bc", "e2e-playground.html"), true, true); // kept open: R19-RESTORE's `close-bc` closes it (the sheet: the `bc` tab closes at the slice's end)
  writeFileSync(join(OUT(), "bc-tab.txt"), t.handle);
  const idleMs = await idle("R19-BANNER-CTL");
  await windowed(realIo, "R19-BANNER-CTL-neg", [], async () => undefined);
  const w = await windowed(realIo, "R19-BANNER-CTL-pos", [], () => att(() => t.evaluate<number>("1")));
  say(`ANSWER R19-BANNER-CTL pos ${w.v.e?.code ?? "ok"}`);
  return idleMs >= 0 ? 0 : 0;
}
/** R19-RESTORE's one close block for the `bc` tab: claim it by the handle the control row wrote, close it, remove the file. Nothing to close is fine. */
async function closeBc(x: Ctx): Promise<number> {
  const f = join(OUT(), "bc-tab.txt");
  if (!existsSync(f)) { say("CHECK R19-BANNER-CTL bc-tab=none"); return 0; }
  const h = readFileSync(f, "utf8").trim();
  const t = await x.c.claim(h).catch(() => undefined);
  if (t) { await t.close().catch(() => undefined); stamp(); }
  rmSync(f, { force: true });
  say(`CHECK R19-BANNER-CTL bc-tab=${t ? "closed" : "gone"}`);
  return 0;
}
async function conBanner(x: Ctx): Promise<number> {
  const R = "R19-CON-BANNER";
  const t = await x.open(URL("con"), true);
  await idle(`${R}-neg`);
  await windowed(realIo, `${R}-neg`, [], async () => undefined);
  say(`IDLE ${R}-pos since-attach-ms=${Date.now() - (readStamp() ?? Date.now())}`);
  const w = await windowed(realIo, `${R}-pos`, [], () => att(() => t.consoleMessages()));
  say(`ANSWER ${R} pos ${w.v.e?.code ?? "ok"}`);
  await sleep(IDLE_MIN_MS_19);
  say(`IDLE ${R}-after since-attach-ms=${Date.now() - (readStamp() ?? Date.now())}`);
  await windowed(realIo, `${R}-after`, [], async () => undefined);
  return 0;
}
/** `banner --row R --kind refused|call|carried|record --ctl pass|fail|absent --stop <reason> --leg label=polls,banner,idle`: the BANNERCALL line and the clause's LEG line. */
function bannerCmd(o: Record<string, string>): number {
  const [label = "", rest = ""] = (o.leg ?? "").split("=");
  const [polls, banner, idle] = rest.split(",");
  const b = (banner === "seen" ? "seen" : "none") as "seen" | "none", ms = Number(idle ?? 0);
  say(bannerCallLine(o.row ?? "", label, ms, Number(polls ?? 0), b, o.ctl ?? "absent"));
  const v = o.kind === "record" ? judgeBannerNoCall(b, ms, o.ctl ?? "") : o.kind === "carried" ? judgeBannerCarried(b, ms, o.ctl ?? "") : o.kind === "call" ? judgeBannerCall(b, ms, o.ctl ?? "") : judgeBannerRefused(b, ms, o.ctl ?? "");
  say(`LEG ${o.row} banner ${v === "STOP" ? "NOT MEASURED" : v}`);
  say(`CHECK ${o.row} banner=${v}`);
  if (v === "STOP") { say(`STOPWHY ${o.stop}`); return 2; }
  return v === "FAIL" ? 1 : 0;
}
/** `banner-ctl-judge --slice S --idle N --neg polls,banner --pos polls,banner,answer`. */
function ctlCmd(o: Record<string, string>): number {
  const [np, nb] = (o.neg ?? "").split(","), [pp, pb, pa] = (o.pos ?? "").split(",");
  const r = bannerCtl19(o.slice ?? "", { idleMs: Number(o.idle), polls: Number(np), banner: nb ?? "none" }, { answer: pa ?? "ok", polls: Number(pp), banner: pb ?? "none" });
  for (const l of r.lines) say(l);
  say(`LEG R19-BANNER-CTL ctl ${r.pass ? "PASS" : "FAIL"}`); say(`CHECK R19-BANNER-CTL ctl=${r.pass ? "pass" : "fail"}`);
  return r.pass ? 0 : 1;
}
/** `banner-con --neg/--pos/--after polls,banner,idle [--answer A]`. */
function conBannerCmd(o: Record<string, string>): number {
  const L = (k: string): { polls: number; banner: "seen" | "none"; idleMs: number } => { const [p, b, i] = (o[k] ?? "").split(","); return { polls: Number(p), banner: b === "seen" ? "seen" : "none", idleMs: Number(i) }; };
  const [n, p, a] = [L("neg"), L("pos"), L("after")];
  for (const [l, v] of [["neg", n], ["pos", p], ["after", a]] as const) say(bannerConLine(l, v.polls, v.banner, v.idleMs));
  const v = bannerConVerdict(n, p, a, o.answer ?? "ok");
  say(`LEG R19-CON-BANNER banner ${v}`); say(`CHECK R19-CON-BANNER verdict=${v}`);
  return v === "FAIL" ? 1 : v === "PASS" ? 0 : 3;
}

function optsOf(argv: string[]): Record<string, string> { const o: Record<string, string> = {}; for (let i = 0; i < argv.length; i += 2) o[argv[i]!.replace(/^--/, "")] = argv[i + 1] ?? ""; return o; }
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "args-1": (a) => run("args1", a, args1, "R19-ARGS-1"), "args-2": (a) => run("args2", a, args2, "R19-ARGS-2"), "args-global": (a) => run("argsg", a, argsGlobal, "R19-ARGS-GLOBAL"), "args-csp": (a) => run("argsc", a, argsCsp, "R19-ARGS-CSP"),
  "args-stop": (a) => run("argss", a, argsStop, "R19-ARGS-STOP"), "args-3": (a) => run("args3", a, args3), "con-read": (a) => run("conread", a, conRead, "opts"), "con-mcp": (a) => run("conmcp", a, conMcp, "R19-CON-MCP"),
  "con-cap": (a) => run("concap", a, conCap, "R19-CON-CAP"), "close-bc": (a) => run("closebc", a, closeBc), refuse: (a) => run("refuse", a, refuse), "con-frame": (a) => run("conframe", a, conFrame), "con-notea": (a) => run("connotea", a, conNoteA),
  "con-floor": (a) => run("confloor", a, conFloor), "own-file": (a) => run("ownfile", a, ownFile), "banner-ctl": (a) => run("bctl", a, bannerCtlRow), "con-banner": (a) => run("cbanner", a, conBanner),
  banner: async (a) => bannerCmd(optsOf(a)), "banner-ctl-judge": async (a) => ctlCmd(optsOf(a)), "banner-con": async (a) => conBannerCmd(optsOf(a)),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

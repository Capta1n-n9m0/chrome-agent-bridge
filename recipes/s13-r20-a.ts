// Step 13 S5-drivers-A (A1): the actors of Run 20's liveA20 rows R20-POP-BG, -FG, -OTHER, -NONE, R20-ARGS-ORDER and R20-ARGS-3 (docs/e2e-test-plan.md section 4.28) and the pure
// decisions they print. R20-0 is recipes/s13-r20.ts `proof`. NOT run against Chrome by its author. Each command prints the sheet's line forms (through s13-forms.ts) and
// `LEG <row> <label> <verdict>` lines (recipes/s13-r20.ps1 turns them into the row's one ROW); exit 0 pass, 1 fail, 2 STOP (a `STOPWHY <reason>` line), 3 not measured.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { argsLine, argsTotalLine, effLine } from "./s12-forms.js";
import { realIo } from "./s11b.js";
import { att, control2Kind, finish, handleOf, judgeEffects, legLine, MSG, run, say, sig, sleep, StopWhy, type Ctx, type Err, type V } from "./s12-r19-a.js";
import { MCP_LINES, keyorderLine, mcplineLine, mcpLineRead, mcpLineVerdict, popLine, type McpRead, type Order } from "./s13-forms.js";
import { orderOf } from "./s13-r20.js";
export type Verdict20 = V | "STOP";
type Tab = import("../sdk/src/index.js").Tab;
type Client = import("../sdk/src/index.js").BridgeClient;
export type Who = "A" | "B" | "C";
// ---- the POP rows ---------------------------------------------------------------------------------------------------------------------------------
export interface Round { grantedTo: Who | "none"; inMs: number | null; others: number; held: "TAB_HELD" | "ok"; controlSame: boolean; ownCallOk: boolean; guard: "bg" | "fg" | "n/a" }
export interface PopJudge { v: Verdict20; why?: "popup-lease-wrong"; line: string }
export const UNJOINED_LINE = "ROW R20-POP-OTHER unjoined NOT MEASURED — no unjoined tab can be made";
const WRONG = "popup-lease-wrong" as const;
/** Three rounds, each with the guard read just before the call. A round whose guard is not the leg's is not counted. A lease to a client that does not hold the source tab is the STOP
 * (any round); granted-to=none is a FAIL; fewer than 3 counted rounds is NOT DISCRIMINATING; the grant within 1 000 ms, B's call TAB_HELD equal to its control, A's call ok, console-new 0. */
export function judgePop(row: string, leg: string, rounds: readonly Round[], o: { expect: "bg" | "fg"; consoleNew: number | null }): PopJudge {
  const counted = rounds.filter((r) => r.guard === o.expect);
  const wrong = rounds.find((r) => (r.grantedTo !== "A" && r.grantedTo !== "none") || r.others > 0);
  const grantedTo: Who | "none" = wrong ? (wrong.grantedTo === "A" || wrong.grantedTo === "none" ? "B" : wrong.grantedTo) : counted.some((r) => r.grantedTo === "none") ? "none" : "A";
  const ms = counted.map((r) => r.inMs).filter((m): m is number => m !== null);
  const line = popLine(row, {
    leg, n: counted.length, grantedTo, inMs: ms.length ? Math.max(...ms) : null, others: rounds.reduce((n, r) => n + r.others, 0),
    heldCall: counted.length > 0 && counted.every((r) => r.held === "TAB_HELD" && r.controlSame) ? "TAB_HELD" : "ok", activeGuard: counted.length > 0 ? o.expect : (rounds[0]?.guard ?? "n/a"), consoleNew: o.consoleNew,
  });
  if (wrong) return { v: "STOP", why: WRONG, line };
  if (counted.length < 3) return { v: "NOT DISCRIMINATING", line };
  const ok = counted.every((r) => r.grantedTo === "A" && r.inMs !== null && r.inMs <= 1000 && r.held === "TAB_HELD" && r.controlSame && r.ownCallOk);
  if (!ok) return { v: "FAIL", line };
  return { v: o.consoleNew === null ? "NOT MEASURED" : o.consoleNew === 0 ? "PASS" : "FAIL", line };
}
/** Leg `newtab`: three tabs B opened are listed held by B and nobody receives a grant (any grant is the STOP). */
export function judgeNewtab(rs: ReadonlyArray<{ listedByB: boolean; grants: number }>): { v: Verdict20; why?: "popup-lease-wrong"; grantedTo: Who | "none" } {
  if (rs.some((r) => r.grants > 0)) return { v: "STOP", why: WRONG, grantedTo: "A" };
  return { v: rs.length === 3 && rs.every((r) => r.listedByB) ? "PASS" : "FAIL", grantedTo: "none" };
}
/** Leg `blocked`: no new tab and no grant passes; a tab that appeared and joined A is a RECORD (never a FAIL); a grant to anyone else, or a grant without a tab, is the STOP. */
export function judgeBlocked(o: { before: number; after: number; grants: readonly Who[] }): { v: Verdict20; why?: "popup-lease-wrong"; grantedTo: Who | "none" } {
  const g = o.grants[0] ?? "none";
  if (o.grants.some((w) => w !== "A") || (o.grants.length > 0 && o.after <= o.before)) return { v: "STOP", why: WRONG, grantedTo: g };
  if (o.after > o.before) return { v: "RECORD", grantedTo: g };
  return { v: "PASS", grantedTo: "none" };
}
// ---- the actor's world --------------------------------------------------------------------------------------------------------------------------------
const NAMES: Record<Who, string> = { A: "s13-r20-a", B: "s13-r20-b", C: "s13-r20-c" };
const U = (port: string, q: string): string => `http://localhost:${port}/e2e-playground.html?s12=${q}`;
const POPUP = (port: string): string => `http://localhost:${port}/e2e-playground.html?popup=1`;
const num = (s: string): number | null => (/^-?\d+$/.test(s) && Number(s) >= 0 ? Number(s) : null);
interface Peer { c: Client; grants: Array<{ tab: string; at: number }> }
async function peer(name: string): Promise<Peer> {
  const { connect } = await import("../sdk/src/index.js");
  const c = await connect({ name, failureReports: false });
  const p: Peer = { c, grants: [] };
  c.on("leaseGranted", (e) => p.grants.push({ tab: e.tab, at: Date.now() }));
  return p;
}
const activeOf = async (c: Client, handle: string): Promise<"bg" | "fg" | "n/a"> => {
  const r = (await c.call("listTabs")) as { tabs?: Array<{ tab?: string; active?: unknown }> };
  const e = r.tabs?.find((t) => t.tab === handle);
  return e === undefined || typeof e.active !== "boolean" ? "n/a" : e.active ? "fg" : "bg";
};
type Guard = "bg" | "fg" | "n/a";
/** The round's order, which the grant listeners depend on: O is fronted, the guard read, every peer's grants cleared, and only THEN the trigger (a click or a call) runs. */
export async function prepareRound<T>(io: { front: () => Promise<void>; guard: () => Promise<Guard>; reset: () => void; trigger: (g: Guard) => Promise<T> }, settleMs = 300): Promise<{ guard: Guard; t0: number; trig: T }> {
  await io.front(); await sleep(settleMs);
  const guard = await io.guard();
  io.reset();
  const t0 = Date.now();
  return { guard, t0, trig: await io.trigger(guard) };
}
/** The click step's signal is always given (so the wave never waits on it): the content is `skip` unless O is the active tab (so a click can never land on another client's tab).
 * `skip` is a round that is not counted; an answer other than `sent <epoch ms>` is an unsent click; `at` is the PowerShell stamp taken right after the click. */
export const clickGate = async (g: Guard, send: (content: string) => Promise<string>): Promise<"skip" | "unsent" | { at: number }> => {
  const a = await send(g === "fg" ? "go" : "skip");
  const m = g === "fg" ? /^sent (\d+)$/.exec(a.trim()) : null;
  return g !== "fg" ? "skip" : m ? { at: Number(m[1]) } : "unsent";
};
/** The PowerShell side's click stamp (epoch ms) when the trigger returned one. */
export const stampOf = (trig: unknown): number | null => (typeof trig === "object" && trig !== null && "at" in trig && typeof trig.at === "number" ? trig.at : null);
const sigC = (name: string, content: string): Promise<string> => { realIo.signal(name, content); return realIo.pressed(name, 180_000); };
const handlesOf = async (c: Client): Promise<string[]> => (((await c.call("listTabs")) as { tabs?: Array<{ tab?: string }> }).tabs ?? []).flatMap((e) => (typeof e.tab === "string" ? [e.tab] : []));
/** One round (see prepareRound); the grant is awaited up to 2.5 s and 400 ms more for anyone else's; every popup the round opened is closed (and so released) before it returns. */
async function popRound(P: { A: Peer; B: Peer; C?: Peer }, o: { O: Tab; front: () => Promise<void>; trigger: (g: Guard) => Promise<unknown> }, row: string): Promise<Round | "unsent"> {
  const peers: Array<[Who, Peer]> = [["A", P.A], ["B", P.B], ...(P.C ? ([["C", P.C]] as Array<[Who, Peer]>) : [])];
  const base = await handlesOf(P.A.c);
  const { guard, t0: tPrep, trig } = await prepareRound({ front: o.front, guard: () => activeOf(P.A.c, o.O.handle), reset: () => { for (const [, p] of peers) p.grants.length = 0; }, trigger: o.trigger });
  const sweep = async (): Promise<void> => { for (const h of (await handlesOf(P.A.c)).filter((x) => !base.includes(x))) await att(() => P.A.c.call("closeTab", { tab: h })); await sleep(300); };
  if (trig === "unsent") { await sweep(); return "unsent"; }
  const t0 = stampOf(trig) ?? tPrep, w0 = Date.now();   // a click leg: t0 is the stamp after the click, the wait starts after the trigger returned
  for (; trig !== "skip" && Date.now() - w0 < 2500 && P.A.grants.length === 0; await sleep(25));
  const inMs = P.A.grants.length ? Math.max(0, P.A.grants[0]!.at - t0) : null;
  await sleep(400);
  const handle = P.A.grants[0]?.tab;
  const others = peers.filter(([w]) => w !== "A").reduce((n, [, p]) => n + p.grants.length, 0);
  const wrongWho = peers.find(([w, p]) => w !== "A" && p.grants.length > 0)?.[0];
  let held: Round["held"] = "ok", controlSame = false, ownCallOk = false;
  if (handle) {
    const call = (c: Client, tab: string) => att(() => c.call("evaluate", { tab, expression: "1" }));
    const popB = await call(P.B.c, handle), ctl = await call(P.B.c, o.O.handle), own = await call(P.A.c, handle);
    held = popB.e?.code === "TAB_HELD" ? "TAB_HELD" : "ok";
    controlSame = popB.e !== undefined && popB.e.code === ctl.e?.code && popB.e.message === ctl.e.message;
    ownCallOk = own.e === undefined;
    say(`ANSWER ${row} ${popB.e?.code ?? "ok"} control=${ctl.e?.code ?? "ok"} own=${own.e?.code ?? "ok"}`);
  }
  await sweep();
  return { grantedTo: wrongWho ?? (handle ? "A" : "none"), inMs, others, held, controlSame, ownCallOk, guard };
}
/** One leg. `cn0` / `cn1` are the PowerShell side's worker-console line counts before the first popup and after the last grant (console-new is their difference; unreadable = null).
 * A `click` leg asks the PowerShell side for the human-style click as the round's trigger (after the front, guard and reset); an unsent click makes the leg NOT MEASURED. */
async function popLeg(row: string, leg: string, P: { A: Peer; B: Peer; C?: Peer }, o: { O: Tab; front: () => Promise<void>; trigger: () => Promise<unknown>; expect: "bg" | "fg"; click?: boolean }): Promise<{ v: Verdict20; rounds: Round[] }> {
  const cn0 = num(await sig(`${row}-${leg}-cn0`));
  const rounds: Round[] = [];
  let unsent = false;
  for (const k of [1, 2, 3]) {
    const click = (c: string): Promise<string> => sigC(`${row}-${leg}-click${k}`, c);
    if (unsent) { if (o.click) await click("skip"); continue; }   // the wave still expects each click step's signal
    const r = await popRound(P, { ...o, trigger: o.click ? (g) => clickGate(g, click) : o.trigger }, row);
    if (r === "unsent") unsent = true; else rounds.push(r);
  }
  const cn1 = num(await sig(`${row}-${leg}-cn1`));
  if (unsent) { say(`CHECK ${row} ${leg} click-sent=no`); say(legLine(row, leg, "NOT MEASURED")); return { v: "NOT MEASURED", rounds }; }
  const j = judgePop(row, leg, rounds, { expect: o.expect, consoleNew: cn0 === null || cn1 === null ? null : Math.max(0, cn1 - cn0) });
  say(j.line); say(legLine(row, leg, j.v === "STOP" ? "FAIL" : j.v));
  if (j.v === "STOP") throw new StopWhy(WRONG, `${row} ${leg}`);
  return { v: j.v, rounds };
}
const first = (x: Ctx): string => x.opts.port ?? "8081";
async function popBgFg(x: Ctx, row: string, fg: boolean): Promise<number> {
  const port = first(x);
  const A: Peer = { c: x.c, grants: [] };
  x.c.on("leaseGranted", (e) => A.grants.push({ tab: e.tab, at: Date.now() }));
  const B = await peer(NAMES.B);
  try {
    const O = await x.open(U(port, "a1")), H = await B.c.newTab(U(port, "bc"), { active: false });
    await sleep(1200);
    const r = await popLeg(row, fg ? "fg" : "bg", { A, B }, { O, expect: fg ? "fg" : "bg", front: () => (fg ? O.focus() : H.focus()), trigger: () => att(() => O.evaluate(`window.open('${POPUP(port)}') !== null`)) });
    if (fg) say(`CHECK ${row} compare R15-POP-2 (a) leaseGranted 150 ms in-ms=${Math.max(0, ...r.rounds.map((q) => q.inMs ?? 0))}`);
    await att(() => H.close());
    return finish(row, [r.v === "NOT DISCRIMINATING" ? "NOT MEASURED" : (r.v as V)]);
  } finally { B.c.close(); }
}
const popBg = (x: Ctx): Promise<number> => popBgFg(x, "R20-POP-BG", false);
const popFg = (x: Ctx): Promise<number> => popBgFg(x, "R20-POP-FG", true);
/** Leg `third`: A holds O behind, C holds the front tab H, B (a third client) makes its own calls while A opens the popup. Leg `human`: O in front, the wave's own click, no bridge caller. */
async function popOther(x: Ctx): Promise<number> {
  const row = "R20-POP-OTHER", port = first(x);
  const A: Peer = { c: x.c, grants: [] };
  x.c.on("leaseGranted", (e) => A.grants.push({ tab: e.tab, at: Date.now() }));
  const B = await peer(NAMES.B), C = await peer(NAMES.C);
  let busy = true;
  try {
    const O = await x.open(U(port, "a1")), H = await C.c.newTab(U(port, "bc"), { active: false }), T = await B.c.newTab(U(port, "bc"), { active: false });
    await sleep(1200);
    void (async () => { while (busy) { await att(() => B.c.call("evaluate", { tab: T.handle, expression: "1" })); await sleep(300); } })();
    const legs: Verdict20[] = [];
    legs.push((await popLeg(row, "third", { A, B, C }, { O, expect: "bg", front: () => H.focus(), trigger: () => att(() => O.evaluate(`window.open('${POPUP(port)}') !== null`)) })).v);
    if (x.opts.click === "yes") legs.push((await popLeg(row, "human", { A, B, C }, { O, expect: "fg", click: true, front: () => O.focus(), trigger: async () => undefined })).v);
    else { say(`CHECK ${row} human click=unavailable`); say(legLine(row, "human", "NOT MEASURED")); legs.push("NOT MEASURED"); }
    say(UNJOINED_LINE);
    await att(() => H.close()); await att(() => T.close());
    return finish(row, legs.map((v) => (v === "NOT DISCRIMINATING" ? "NOT MEASURED" : (v as V))));
  } finally { busy = false; B.c.close(); C.c.close(); }
}
/** Leg `newtab`: B opens three tabs with no opener, each listed at once held by B, A gets no grant. Leg `blocked`: A's popup is attempted after the gesture expired (about 5 s). */
async function popNone(x: Ctx): Promise<number> {
  const row = "R20-POP-NONE", port = first(x);
  const A: Peer = { c: x.c, grants: [] };
  x.c.on("leaseGranted", (e) => A.grants.push({ tab: e.tab, at: Date.now() }));
  const B = await peer(NAMES.B);
  const made: Tab[] = [];
  try {
    const O = await x.open(U(port, "a1"));
    const rs: Array<{ listedByB: boolean; grants: number }> = [];
    let toOthers = 0;
    for (let i = 0; i < 3; i++) {
      A.grants.length = 0; B.grants.length = 0;
      const t = await B.c.newTab(U(port, "bc"), { active: false }); made.push(t);
      await sleep(500);
      toOthers += A.grants.length;
      rs.push({ listedByB: (await x.c.tabs()).find((e) => e.handle === t.handle)?.owner === NAMES.B, grants: A.grants.length + B.grants.length });
    }
    const n = judgeNewtab(rs);
    say(popLine(row, { leg: "newtab", n: rs.length, grantedTo: n.grantedTo, inMs: null, others: toOthers, heldCall: "n/a", activeGuard: "n/a", consoleNew: null })); say(legLine(row, "newtab", n.v === "STOP" ? "FAIL" : n.v));
    if (n.v === "STOP") throw new StopWhy(WRONG, `${row} newtab`);
    A.grants.length = 0; B.grants.length = 0;
    const before = (await x.c.tabs()).length;
    await att(() => O.evaluate(`setTimeout(() => window.open('${POPUP(port)}'), 6000); 1`));
    await sleep(7000);
    const after = (await x.c.tabs()).length;
    const g: Who[] = [...A.grants.map(() => "A" as const), ...B.grants.map(() => "B" as const)];
    const b = judgeBlocked({ before, after, grants: g });
    say(popLine(row, { leg: "blocked", n: Math.max(0, after - before), grantedTo: b.grantedTo, inMs: null, others: B.grants.length, heldCall: "n/a", activeGuard: "n/a", consoleNew: null })); say(legLine(row, "blocked", b.v === "STOP" ? "FAIL" : b.v));
    for (const e of [...A.grants]) await att(() => x.c.call("closeTab", { tab: e.tab }));
    if (b.v === "STOP") throw new StopWhy(WRONG, `${row} blocked`);
    return finish(row, [n.v as V, b.v as V]);
  } finally { for (const t of made) await t.close().catch(() => undefined); B.c.close(); }
}
// ---- R20-ARGS-ORDER (re-measures R19-ARGS-1's value-equal clause; the SDK leg discriminates, the MCP leg is a record) --------------------------------
const PAGE_VALUE = "({zeta: 1, alpha: 2, mid: {y: 1, x: 2}, list: [{q: 1, b: 2}]})";
const TABLE: unknown[] = [{ rows: [1, 2, { z: null, a: [true, false] }], name: "é€😀", n: -0.5, big: 1e21 }, null, [[], {}, "", 0], "plain string", { "sentinel-args-K7W3-key": "sentinel-args-K7W3-value" }];
const KEYED = { zeta: 1, alpha: 2, mid: { y: 1, x: 2 } };
export interface Orders { keys: Order; nested: Order; elem: Order }
export function judgeArgsOrder(o: { expr: Orders; table: readonly boolean[]; keyed: Orders & { jsonEqual: boolean }; control1: unknown; control2Kind: string }): { v: Verdict20; why?: "existing-tool-changed" } {
  if (o.control1 !== 2 || o.control2Kind !== "function") return { v: "STOP", why: "existing-tool-changed" };
  const page = (r: Orders): boolean => r.keys === "page" && r.nested === "page" && r.elem === "page";
  return { v: page(o.expr) && o.table.length === 5 && o.table.every(Boolean) && page(o.keyed) && o.keyed.jsonEqual ? "PASS" : "FAIL" };
}
const ordersOf = (v: Record<string, unknown>, page: readonly string[]): Orders => {
  const mid = v.mid as Record<string, unknown> | undefined, list = v.list as Array<Record<string, unknown>> | undefined;
  return { keys: orderOf(Object.keys(v), page), nested: orderOf(Object.keys(mid ?? {}), mid ? ["y", "x"] : []), elem: orderOf(Object.keys(list?.[0] ?? {}), list ? ["q", "b"] : []) };
};
const jsonOf = (v: unknown): string => JSON.stringify(v);
const unwrap = (t: string): unknown => { try { return JSON.parse(t); } catch { return t; } };
/** Whether the MCP's text, read as JSON, equals what was sent (value-equal, and JSON.stringify-equal: key order included). An error text equals nothing. */
export const mcpEqual = (r: { isError: boolean; text: string }, v: unknown): { value: boolean; json: boolean } => (r.isError ? { value: false, json: false } : { value: isDeepStrictEqual(unwrap(r.text), v), json: jsonOf(unwrap(r.text)) === jsonOf(v) });
/** The MCP leg's record lines for the keyed object: KEYORDER only with the orders read from the MCP's own text (when it is a JSON object), then the sheet's not-discriminating record. */
export function mcpOrderLines(R: string, r: { isError: boolean; text: string }, keyed: Record<string, unknown>): string[] {
  const v = unwrap(r.text);
  const read = !r.isError && typeof v === "object" && v !== null && !Array.isArray(v);
  return [...(read ? [keyorderLine(R, { leg: "args", ...ordersOf(v as Record<string, unknown>, Object.keys(keyed)), jsonEqual: jsonOf(v) === jsonOf(keyed), via: "mcp" })] : [`CHECK ${R} mcp text-not-a-json-object`]), `CHECK ${R} mcp RECORD not-discriminating`];
}
async function argsOrder(x: Ctx): Promise<number> {
  const R = "R20-ARGS-ORDER", port = first(x);
  const t = await x.open(U(port, "a1")), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: U(port, "a1") })).text);
  await sleep(1200);
  const expr = await att(() => t.evaluate<Record<string, unknown>>(PAGE_VALUE));
  const eo = ordersOf(expr.v ?? {}, ["zeta", "alpha", "mid", "list"]);
  say(keyorderLine(R, { leg: "expr", ...eo, jsonEqual: null, via: "sdk" }));
  let ve = 0, je = 0;
  const table: boolean[] = [];
  for (const [i, v] of TABLE.entries()) {
    const a = await att(() => t.evaluate<unknown>("(a) => a", { args: v }));
    const veq = !a.e && isDeepStrictEqual(a.v, v), jeq = !a.e && jsonOf(a.v) === jsonOf(v);
    ve += +veq; je += +jeq; table.push(jeq); say(argsLine(R, `v${i + 1}-sdk`, a.e?.code ?? "ok", veq, jeq));
  }
  say(argsTotalLine(R, { table: 5, valueEqual: ve, jsonEqual: je, via: "sdk" }));
  const k = await att(() => t.evaluate<Record<string, unknown>>("(a) => a", { args: KEYED }));
  const ko = { ...ordersOf(k.v ?? {}, ["zeta", "alpha", "mid"]), jsonEqual: !k.e && jsonOf(k.v) === jsonOf(KEYED) };
  say(keyorderLine(R, { leg: "args", keys: ko.keys, nested: ko.nested, elem: ko.elem, jsonEqual: ko.jsonEqual, via: "sdk" }));
  const ref = await att(() => t.evaluateRef("(a) => a", { args: KEYED }));   // an object has no element ref: the answer is recorded, nothing is read from it
  say(`ANSWER ${R} ref ${ref.e?.code ?? "ok"}`); say(`CHECK ${R} ref-leg object-has-no-ref`); say(legLine(R, "ref", "RECORD"));
  let mv = 0, mj = 0;
  for (const [i, v] of TABLE.entries()) {   // the MCP leg over the same five values: record lines only
    const r = await m.call("browser_evaluate", { expression: "(a) => a", args: v, tab: mt }), q = mcpEqual(r, v);
    mv += +q.value; mj += +q.json; say(argsLine(R, `v${i + 1}-mcp`, r.isError ? "ERROR" : "ok", q.value, q.json));
  }
  say(argsTotalLine(R, { table: 5, valueEqual: mv, jsonEqual: mj, via: "mcp" }));
  for (const l of mcpOrderLines(R, await m.call("browser_evaluate", { expression: "(a) => a", args: KEYED, tab: mt }), KEYED)) say(l);
  const c1 = await att(() => t.evaluate<number>("1 + 1")), c2 = await att(() => x.c.call("evaluate", { expression: "(function f() {})", tab: t.handle }));
  say(`ANSWER ${R} control-1 ${c1.e?.code ?? "ok"} value=${c1.v ?? "none"}`); say(`ANSWER ${R} control-2 ${c2.e?.code ?? "ok"} kind=${control2Kind(c2.v)}`);
  const j = judgeArgsOrder({ expr: eo, table, keyed: ko, control1: c1.v, control2Kind: control2Kind(c2.v) });
  if (j.v === "STOP") throw new StopWhy("existing-tool-changed", `${R} control`);
  say(legLine(R, "sdk", j.v === "PASS" ? "PASS" : "FAIL")); say(legLine(R, "mcp", "RECORD"));
  return finish(R, [j.v as V, "RECORD", "RECORD"]);
}
// ---- R20-ARGS-3 (re-measures R19-ARGS-3; JavaScript off, effect counter at 0) -----------------------------------------------------------------------
const EFF_FN = "(a) => { window.__s12eff = (window.__s12eff || 0) + 1; return window.__s12eff; }";
const readEff = async (t: Tab): Promise<number | null> => { const r = await att(() => t.evaluate<unknown>("window.__s12eff === undefined ? -1 : window.__s12eff")); return typeof r.v === "number" && r.v >= 0 ? r.v : r.v === -1 ? 0 : null; };
const exactJsOff = (e: Err | undefined): boolean => e !== undefined && e.code === "JS_DISABLED" && e.message === MSG.jsOff && e.data === undefined;
export function judgeArgs3(o: { sdk?: Err; raw?: Err; noargs?: Err; mcp: McpRead; snapshotOk: boolean; control: unknown; before: number | null; after: number | null }): { v: Verdict20; why?: "args-ran-js-off" | "existing-tool-changed" } {
  if (o.control !== 1) return { v: "STOP", why: "existing-tool-changed" };
  if (o.before === null || o.after === null) return { v: "NOT MEASURED" };
  if (o.after > o.before) return { v: "STOP", why: "args-ran-js-off" };
  return { v: exactJsOff(o.sdk) && exactJsOff(o.raw) && exactJsOff(o.noargs) && mcpLineVerdict(o.mcp) === "PASS" && o.snapshotOk && o.after === o.before ? "PASS" : "FAIL" };
}
async function args3(x: Ctx): Promise<number> {
  const R = "R20-ARGS-3", port = first(x);
  const t = await x.open(U(port, "a3"), true), m = await x.mcp();
  const mt = handleOf((await m.call("browser_new_tab", { url: U(port, "a3") })).text);
  await sleep(1200);
  const ctl = await att(() => t.evaluate<number>(EFF_FN, { args: 1 }));
  const before = await readEff(t);
  await sig("R20-ARGS-3-js");
  const sdk = await att(() => t.evaluate(EFF_FN, { args: 1 })), raw = await att(() => x.c.call("evaluate", { tab: t.handle, expression: EFF_FN, args: 1 })), noargs = await att(() => t.evaluate("1"));
  const mr = await m.call("browser_evaluate", { tab: mt, expression: EFF_FN, args: 1 });
  const snap = await m.call("browser_snapshot", { tab: mt });
  await sig("R20-ARGS-3-js-done");
  const after = await readEff(t);
  const mcp = mcpLineRead(mr, MCP_LINES.jsDisabled);
  for (const [label, r] of [["sdk", sdk], ["raw", raw], ["noargs", noargs]] as const) { say(`ANSWER ${R} ${label} ${r.e?.code ?? "ok"} exact=${exactJsOff(r.e) ? "yes" : "no"}`); say(legLine(R, label, exactJsOff(r.e) ? "PASS" : "FAIL")); }
  say(mcplineLine(R, { leg: "mcp", ...mcp })); say(legLine(R, "mcp", mcpLineVerdict(mcp)));
  say(`ANSWER ${R} snapshot ${snap.isError ? "ERROR" : "ok"}`); say(legLine(R, "snapshot", snap.isError ? "FAIL" : "PASS"));
  say(effLine(R, before, after));
  const j = judgeArgs3({ sdk: sdk.e, raw: raw.e, noargs: noargs.e, mcp, snapshotOk: !snap.isError, control: ctl.v, before, after });
  say(legLine(R, "effects", judgeEffects(before, after) === "ok" ? "PASS" : judgeEffects(before, after) === "stop" ? "FAIL" : "NOT MEASURED"));
  if (j.v === "STOP") throw new StopWhy(j.why!, `${R}`);
  return finish(R, [j.v as V]);
}
export const cmds: Record<string, (argv: string[]) => Promise<number>> = {
  "pop-bg": (a) => run("popbg", a, popBg, "R20-POP-BG"), "pop-fg": (a) => run("popfg", a, popFg, "R20-POP-FG"), "pop-other": (a) => run("popother", a, popOther, "R20-POP-OTHER"),
  "pop-none": (a) => run("popnone", a, popNone, "R20-POP-NONE"), "args-order": (a) => run("argsorder", a, argsOrder, "R20-ARGS-ORDER"), "args-3": (a) => run("args3", a, args3),
};
export async function main(argv: string[]): Promise<number> {
  const [sub = "", ...rest] = argv;
  const f = cmds[sub];
  if (!f) { say(`STOP: unknown subcommand; known: ${Object.keys(cmds).join(", ")}`); return 2; }
  try { return await f(rest); } catch (e) { say(`STOP: ${e instanceof Error ? e.name : "error"}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

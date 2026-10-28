// Step 12 S7-helpers-a: the line forms (1)-(13) of docs/e2e-test-plan.md section 4.27 part A, as pure formatters, and the reusable pieces of
// #351 (4) (b) and (c). Node only. A value is a count or a fixed code, never a text: no function here prints an entry's text, a data value, a URL or a
// name. recipes/test/s12-forms.test.ts parses the sheet's own paragraph and compares every form's keys and their order.
import { createHash } from "node:crypto";

/** The shape of the SDK's console entry (`ConsoleEntry` in shared/src/protocol.ts), kept local: recipes do not import package code. */
export interface ConEntry { level: string; kind: "console" | "exception"; text: string; ts: number }
/** The one IDLE bound of Run 19 (section 4.27 "Banner rule"; Run 18's s12-rules IDLE_MIN_MS is 15 000). */
export const IDLE_MIN_MS_19 = 20_000;
const yn = (b: boolean): string => (b ? "yes" : "no");
const num = (n: number | null): string => (n === null ? "absent" : String(n));
const KEY_NAME = /^[A-Za-z_][\w-]{0,30}$/;
/** `data=<none|keys:<k1,k2>>`: the data KEYS only (a key that is not a plain name prints as "other"), never a value. */
export function dataField(d: unknown): string {
  const keys = d !== null && typeof d === "object" ? Object.keys(d).map((x) => (KEY_NAME.test(x) ? x : "other")) : [];
  return keys.length > 0 ? `keys:${keys.join(",")}` : "none";
}

// (1)-(7)
export const loadedLine = (o: { rerun?: number; consoleMessages: string; entries: number; console: number; exception: number; args: string }): string =>
  `LOADED ${o.rerun === undefined ? "" : `rerun=${o.rerun} `}consoleMessages=${o.consoleMessages} entries=${o.entries} console=${o.console} exception=${o.exception} args=${o.args}`;
export const argsLine = (row: string, label: string, answer: string, valueEqual: boolean, jsonEqual: boolean): string =>
  `ARGS ${row} ${label} ${answer} value-equal=${yn(valueEqual)} json-equal=${yn(jsonEqual)}`;
export const argsTotalLine = (row: string, t: { table: number; valueEqual: number; jsonEqual: number; via: "sdk" | "mcp" | "raw" }): string =>
  `ARGS ${row} total table=${t.table} value-equal=${t.valueEqual} json-equal=${t.jsonEqual} via=${t.via}`;
export const argsrefLine = (label: string, e: { code: string; exact: boolean; data?: unknown; sent: boolean }): string =>
  `ARGSREF ${label} code=${e.code} exact=${yn(e.exact)} data=${dataField(e.data)} sent=${e.sent ? 1 : 0}`;
export const argsrefTotalLine = (t: { refusals: number; exact: number; dataNone: number; sent: number; effects: number; control: number }): string =>
  `ARGSREF total refusals=${t.refusals} exact=${t.exact} data-none=${t.dataNone} sent=${t.sent} effects=${t.effects} control=${t.control}`;
export const effLine = (row: string, before: number | null, after: number | null): string => `EFF ${row} before=${num(before)} after=${num(after)}`;
export const globalsLine = (row: string, g: { args: boolean; fn: boolean; newOwnKeys: number }): string =>
  `GLOBALS ${row} args=${g.args ? "present" : "absent"} fn=${g.fn ? "present" : "absent"} new-own-keys=${g.newOwnKeys}`;
export const stopcallLine = (row: string, s: { answer: string; ms: number; boundMs: number; usable: boolean; next: "exact" | "other" }): string =>
  `STOPCALL ${row} answer=${s.answer} ms=${s.ms} bound-ms=${s.boundMs} usable=${yn(s.usable)} next=${s.next}`;
export type OldLeg = "sdk" | "mcp" | "ref" | "file" | "raw" | "control";
export const oldLine = (row: string, o: { leg: OldLeg; code: string; hint: boolean; forwarded: "yes" | "no" | "n/a" }): string =>
  `OLD ${row} leg=${o.leg} code=${o.code} hint=${yn(o.hint)} forwarded=${o.forwarded}`;
/** `forwarded` is read from the ANSWER: on the raw leg an `ok` whose value holds `kind: "function"` was run as an expression by the old worker. */
export function forwardedFrom(leg: OldLeg, ans: { ok: boolean; value?: unknown }): "yes" | "no" | "n/a" {
  if (leg !== "raw") return "n/a";
  const v = ans.value as { kind?: unknown } | null | undefined;
  return ans.ok && v !== null && typeof v === "object" && v !== undefined && v.kind === "function" ? "yes" : "no";
}

// (8) CON
const STACK = /\n {4}at | at [^\n(]*\(/;
const count = (es: ConEntry[], f: (e: ConEntry) => boolean): number => es.filter(f).length;
const sha = (es: ConEntry[]): string => createHash("sha256").update(JSON.stringify(es)).digest("hex");
/** `newest`: the entries equal the last `limit` entries of the unlimited read, compared by hash (never printed). */
export const newestEqual = (read: ConEntry[], full: ConEntry[], limit: number): boolean => sha(read) === sha(full.slice(-limit));
/** `ordered` and `marker` are judged only when the leg asks (`ordered: true`, `markers`); `newest` is the caller's `newestEqual`; else `n/a`. */
export function conLine(row: string, label: string, es: ConEntry[], o: { sentinel: string; ordered?: boolean; newest?: boolean; markers?: string[] }): string {
  const exc = es.filter((e) => e.kind === "exception");
  const reply = JSON.stringify(es);
  const ordered = o.ordered === true ? yn(es.every((e, i) => i === 0 || es[i - 1]!.ts <= e.ts)) : "n/a";
  const marker = o.markers === undefined ? "n/a" : String(o.markers.reduce((n, m) => n + (m === "" ? 0 : reply.split(m).length - 1), 0));
  return `CON ${row} ${label} entries=${es.length} console=${es.length - exc.length} exception=${exc.length} sentinel=${count(es, (e) => e.text.includes(o.sentinel))} ` +
    `url=${count(es, (e) => e.text.includes("://"))} stack=${count(es, (e) => STACK.test(e.text))} maxlen=${es.reduce((m, e) => Math.max(m, e.text.length), 0)} ` +
    `cut=${count(es, (e) => e.text.endsWith("…"))} uncaught-first=${yn(exc.every((e) => e.text.startsWith("Uncaught")))} ordered=${ordered} ` +
    `newest=${o.newest === undefined ? "n/a" : yn(o.newest)} marker=${marker}`;
}

// (9) CONREF
export const conrefLine = (row: string, label: string, e: { code: string; message: string; data?: unknown }, expectMessage: string, sameAs: "snapshot" | "evaluate" | "none"): string =>
  `CONREF ${row} ${label} code=${e.code} exact=${yn(e.message === expectMessage)} data=${dataField(e.data)} same-as=${sameAs}`;

// (10) CONFLOOR: ticks and errors are told apart by their index in the entry text (`tick <n>`, `s12-exc-<n>`), never by their text.
export interface FloorCounts { disarmedTicks: number; inReplyDisarmed: number; afterTicks: number; inReplyAfter: number; excDisarmed: number; excInReplyDisarmed: number; excAfter: number; excInReplyAfter: number }
export const FLOOR_MARGIN_MS = 500;
export function floorCounts(p: { ticks: number[]; excs: number[]; offMs: number; onMs: number }, es: ConEntry[]): FloorCounts {
  const side = (times: number[], re: RegExp, kind: ConEntry["kind"]): [number, number, number, number] => {
    const seen = new Set(es.filter((e) => e.kind === kind).map((e) => Number(re.exec(e.text)?.[1] ?? 0)));
    const dis = times.map((t, i) => [t, i + 1] as const).filter(([t]) => t >= p.offMs + FLOOR_MARGIN_MS && t < p.onMs - FLOOR_MARGIN_MS).map(([, i]) => i);
    const aft = times.map((t, i) => [t, i + 1] as const).filter(([t]) => t >= p.onMs + FLOOR_MARGIN_MS).map(([, i]) => i);
    return [dis.length, dis.filter((i) => seen.has(i)).length, aft.length, aft.filter((i) => seen.has(i)).length];
  };
  const [d, dr, a, ar] = side(p.ticks, /^tick (\d+) /, "console");
  const [xd, xdr, xa, xar] = side(p.excs, /s12-exc-(\d+) /, "exception");
  return { disarmedTicks: d, inReplyDisarmed: dr, afterTicks: a, inReplyAfter: ar, excDisarmed: xd, excInReplyDisarmed: xdr, excAfter: xa, excInReplyAfter: xar };
}
export const conFloorLine = (c: FloorCounts): string =>
  `CONFLOOR disarmed-ticks=${c.disarmedTicks} in-reply-disarmed=${c.inReplyDisarmed} after-ticks=${c.afterTicks} in-reply-after=${c.inReplyAfter} ` +
  `exc-disarmed=${c.excDisarmed} exc-in-reply-disarmed=${c.excInReplyDisarmed} exc-after=${c.excAfter} exc-in-reply-after=${c.excInReplyAfter}`;

// (11) CONMCP: `lines` are the non-empty lines of the tool text except the cap marker (and the empty-page sentence); `form` those in the formatter's form.
const MCP_FORM = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z (error|warning|info|debug)( uncaught)? /;
const CAP_MARKER = /^… \[truncated: \d+ more lines, the newest — narrow with level\/limit\]$/;
export function conmcpStats(text: string): { lines: number; form: number; truncated: boolean } {
  const all = text.split("\n").filter((l) => l.trim() !== "" && l !== "No console messages.");
  const lines = all.filter((l) => !CAP_MARKER.test(l));
  return { lines: lines.length, form: lines.filter((l) => MCP_FORM.test(l)).length, truncated: all.some((l) => CAP_MARKER.test(l)) };
}
export const conmcpLine = (label: string, c: { lines: number; form: number; truncated: boolean; entriesViaSdk: number }): string =>
  `CONMCP ${label} lines=${c.lines} form=${c.form} truncated=${yn(c.truncated)} entries-via-sdk=${c.entriesViaSdk}`;

// (12) BANNERCON
export interface BannerLeg { banner: "seen" | "none"; idleMs: number }
export const bannerConLine = (leg: "neg" | "pos" | "after", polls: number, banner: "seen" | "none", idleMs: number): string => `BANNERCON leg=${leg} polls=${polls} banner=${banner} idle-ms=${idleMs}`;
/** PASS: neg none and pos seen with the call ok and after none; a seen negative leg, or a negative or after leg (seen or none) under 20 000 ms idle, is NOT MEASURED (the sampler has no control). */
export function bannerConVerdict(neg: BannerLeg, pos: BannerLeg, after: BannerLeg, posAnswer: string): "PASS" | "FAIL" | "NOT MEASURED" {
  if (neg.banner === "seen" || neg.idleMs < IDLE_MIN_MS_19) return "NOT MEASURED";
  if (after.idleMs < IDLE_MIN_MS_19) return "NOT MEASURED";
  return pos.banner === "seen" && posAnswer === "ok" && after.banner === "none" ? "PASS" : "FAIL";
}
export const bannerConRow = (v: "PASS" | "FAIL" | "NOT MEASURED"): string => `ROW R19-CON-BANNER ${v}`;

// (13) DAEMONLOG <row> (part A's two counts; part B's per-slice (28) adds args-text and is S7-helpers-d's)
export const daemonlogLine = (row: string, sentinel: number, consoleText: number): string => `DAEMONLOG ${row} sentinel=${sentinel} console-text=${consoleText}`;

// #351 (4) (b): the rows with a console clause are judged before R19-LOGS.
export type Verdict = "PASS" | "RECORD" | "FAIL" | "NOT MEASURED" | "NOT RUN" | "NOT DISCRIMINATING" | "STOP";
const RANK: Record<Verdict, number> = { PASS: 0, RECORD: 0, "NOT RUN": 0, "NOT MEASURED": 1, "NOT DISCRIMINATING": 2, FAIL: 3, STOP: 4 };
export const hasConsoleClause = (id: string): boolean => /^R19-(ARGS|CON)-/.test(id);
/** One final `ROW` per pending row with a console clause, the worse of its own verdict and the clause's (ok / fail / unread), in insertion order; a NOT RUN row keeps its word (it read no console). */
export function settleConsoleClauses(pending: Record<string, Verdict>, clause: "ok" | "fail" | "unread"): string[] {
  const c: Verdict = clause === "ok" ? "PASS" : clause === "fail" ? "FAIL" : "NOT MEASURED";
  return Object.entries(pending).filter(([id]) => hasConsoleClause(id)).map(([id, v]) => `ROW ${id} ${v !== "NOT RUN" && RANK[c] > RANK[v] ? c : v}`);
}

// #351 (4) (c): Run 18's `WARN row printed twice: RULES` came from the byte-identical `ROW RULES PASS: RULES 0` printed at R18-0 and again at
// R18-RESTORE (record lines 4 and 266), counted by aggregateRows (s11b-r17b-rules.ts). The runner calls this on ONE slice's record lines
// BEFORE aggregateRows. Only a ROW line whose text (without an ISO time and `s9-win: ` prefix) repeats is dropped; every other line passes,
// and a second ROW for the same id with another verdict stays, so aggregateRows still warns on a real double verdict.
const ROW_PREFIX = /^(?:\d{4}-\d\d-\d\dT[\d:.]+Z )?(?:s9-win: )?/;
export function dedupeIdenticalRows(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((l) => {
    const t = l.replace(ROW_PREFIX, "");
    if (!t.startsWith("ROW ")) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

// Step 13 S5-helpers: Run 20's pure helpers: the line forms (1)-(13) of docs/e2e-test-plan.md section 4.28 "Line forms (Run 20)", the redefined
// CONCAP and CHOOSE, and the judges (MCP line, busy text, newest-kept cap, DevTools control, dock side, disabled-input map). Node only. A value is a
// count or a fixed word, never a text. Judges take the product's own strings by import and never copy them; the MCP legs judge the MCP's own line and
// isError, never the extension's message or a code on line 1. recipes/test/s13-forms.test.ts compares each form with the sheet's own paragraph.
import { formatConsole } from "../sdk/src/format/console-messages.js";
import { safetyRefusalLine } from "../sdk/src/error.js";
import { CHOOSER_BUSY_MESSAGE } from "../extension/src/handlers/upload.js";
import { CHOOSER_TIMEOUT_MESSAGE } from "../extension/src/upload-files.js";
import { DISABLED_INPUT_MESSAGE } from "../extension/src/content/upload-target.js";
import { ARGS_RELOAD_HINT, CHOOSER_RELOAD_HINT } from "../daemon/src/intercept.js";
import { ErrorCodes } from "@bridge/shared/codes";
import { K } from "./s11-rules.js";
import { chooseLine } from "./s12-forms-c.js";

const yn = (b: boolean): string => (b ? "yes" : "no");
const ynNa = (b: boolean | null): string => (b === null ? "n/a" : yn(b));
const word = (re: RegExp, v: string, what: string): string => {
  if (!re.test(v)) throw new Error(`${what}: not a fixed code or plain word`);
  return v;
};
const count = (n: number, what: string): number => {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${what}: a count is a non-negative integer`);
  return n;
};
const int = (n: number, what: string): number => {
  if (!Number.isInteger(n)) throw new Error(`${what}: an integer`);
  return n;
};
const ROW = /^[A-Za-z0-9][\w-]*$/;
const LABEL = /^[a-z][a-z0-9-]*$/;
const CODE = /^(ok|[A-Z][A-Z_]*)$/;
const orNa = (n: number | null, what: string): string => (n === null ? "n/a" : String(count(n, what)));

// (1) (2)
export type Order = "page" | "sorted";
export type Read3 = "yes" | "no" | "unread";
export const loadedLine20 = (o: { rerun?: number; keys: Order; nested: Order; elem: Order; perm: Read3; listener: Read3; enabled: "yes" | "no"; args: string }): string =>
  `LOADED20 ${o.rerun === undefined ? "" : `rerun=${count(o.rerun, "rerun")} `}keys=${o.keys} nested=${o.nested} elem=${o.elem} perm=${o.perm} listener=${o.listener} enabled=${o.enabled} args=${word(/^(answered|[A-Z][A-Z_]*)$/, o.args, "args")}`;
export const keyorderLine = (row: string, o: { leg: string; keys: Order; nested: Order; elem: Order; jsonEqual: boolean | null; via: "sdk" | "mcp" | "raw" }): string =>
  `KEYORDER ${word(ROW, row, "row")} leg=${word(LABEL, o.leg, "leg")} keys=${o.keys} nested=${o.nested} elem=${o.elem} json-equal=${ynNa(o.jsonEqual)} via=${o.via}`;
// (3) POP
export const popLine = (row: string, o: { leg: string; n: number; grantedTo: "A" | "B" | "C" | "none"; inMs: number | null; others: number; heldCall: "TAB_HELD" | "ok" | "n/a"; activeGuard: "bg" | "fg" | "n/a"; consoleNew: number | null }): string =>
  `POP ${word(ROW, row, "row")} leg=${word(LABEL, o.leg, "leg")} n=${count(o.n, "n")} granted-to=${o.grantedTo} in-ms=${orNa(o.inMs, "in-ms")} others=${count(o.others, "others")} held-call=${o.heldCall} active-guard=${o.activeGuard} console-new=${orNa(o.consoleNew, "console-new")}`;
// (4) MCPLINE
export const mcplineLine = (row: string, o: { leg: string; isError: boolean; text: "exact" | "contains" | "other"; lines: number }): string =>
  `MCPLINE ${word(ROW, row, "row")} leg=${word(LABEL, o.leg, "leg")} is-error=${yn(o.isError)} text=${o.text} lines=${count(o.lines, "lines")}`;
// (5) CHKEPT
export const chkeptLine = (row: string, o: { leg: "different" | "same"; call: 1 | 2; answer: string; clicks: number; input: number; change: number; cancel: number; files: 0 | 1; digestDiffers: boolean | null }): string =>
  `CHKEPT ${word(ROW, row, "row")} leg=${o.leg} call=${o.call} answer=${word(CODE, o.answer, "answer")} clicks=${count(o.clicks, "clicks")} input=${count(o.input, "input")} change=${count(o.change, "change")} cancel=${count(o.cancel, "cancel")} files=${o.files} digest-differs=${ynNa(o.digestDiffers)}`;
// (6) RECT: numbers only, no title
export const rectLine = (row: string, o: { leg: string; win: "A" | "B" | "X" | "O"; x: number; y: number; w: number; h: number; z: number; coveredPx: number }): string =>
  `RECT ${word(ROW, row, "row")} leg=${word(LABEL, o.leg, "leg")} win=${o.win} x=${int(o.x, "x")} y=${int(o.y, "y")} w=${count(o.w, "w")} h=${count(o.h, "h")} z=${count(o.z, "z")} covered-by-others-px=${count(o.coveredPx, "covered")}`;
// (7) CTRL20 (null windows = a docked leg: n/a)
export interface Ctl { windows: number | null; title: "ok" | "none" | "n/a"; attached: Read3 }
export const ctrl20Line = (row: string, o: Ctl & { leg: string; when: "before-open" | "after-open"; targets: number }): string =>
  `CTRL20 ${word(ROW, row, "row")} leg=${word(LABEL, o.leg, "leg")} when=${o.when} windows=${orNa(o.windows, "windows")} title=${o.title} attached=${o.attached} targets=${count(o.targets, "targets")}`;
// (8) DEVT20
export const devt20Line = (row: string, o: { leg: string; answer: string; value: "ok" | "n/a"; exact: boolean | null; devtoolsWindowsAfter: number }): string =>
  `DEVT20 ${word(ROW, row, "row")} leg=${word(LABEL, o.leg, "leg")} answer=${word(CODE, o.answer, "answer")} value=${o.value} exact=${ynNa(o.exact)} devtools-windows-after=${count(o.devtoolsWindowsAfter, "after")}`;
// (9) (10) (11) (12) (13)
export const flagLine = (v: Read3): string => `FLAG debugging-flag=${v}`;
export const portLine = (p: number, checkedUtc: string, listed: number): string =>
  `PORT ${count(p, "port")} checked=${word(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/, checkedUtc, "checked")} listed=${count(listed, "listed")}`;
export interface Scan3 { name: number; sentinel: number; token: number }
const scan3 = (c: Scan3): string => `name=${count(c.name, "name")} sentinel=${count(c.sentinel, "sentinel")} token=${count(c.token, "token")}`;
export const scan20Line = (stream: string, c: Scan3): string => `SCAN20 ${word(/^[a-z][a-z-]*$/, stream, "stream")}: ${scan3(c)}`;
export const scan20ActorsLine = (tool: string, c: Scan3): string => `SCAN20 actors ${word(/^[A-Za-z][\w.]*$/, tool, "tool")}: ${scan3(c)}`;
export const s4Line = (ancestor: boolean): string => `S4 commit=${ancestor ? "ancestor" : "not"}`;
export type DockSide = "bottom" | "right" | "left" | "undock" | "unread";
const DOCK_SIDES: readonly string[] = ["bottom", "right", "left", "undock", "unread"];
export const dockLine = (row: "R20-0C" | "R20-RESTORE", side: DockSide): string => {
  if (row !== "R20-0C" && row !== "R20-RESTORE") throw new Error("dock: the row is R20-0C or R20-RESTORE");
  if (!DOCK_SIDES.includes(side)) throw new Error("dock: not a side");
  return `DOCK ${row} side=${side}`;
};
/** Where the dock side is read (R20-0C; verifier3 NIT E): a tab's DevTools in window X, never the worker-console capture window. */
export const DOCK_READ_PLACE = "a tab's DevTools in window X";

// Redefined: CHOOSE gains names-devtools (after the Run 19 keys, whose formatter is reused); CONCAP counts the marker line.
export const chooseLine20 = (row: string, label: string, o: { answer: string; exact: boolean | null; files: number; change: number; clicks: number; bytesEqual: boolean | null; dialog: number; ms: number; namesDevtools: boolean }): string =>
  `${chooseLine(row, label, o)} names-devtools=${yn(o.namesDevtools)}`;
export interface Concap20Stats { lines: number; bodyChars: number; marker: boolean; firstIndex: number; lastIndex: number; sentinel: number; consecutive: boolean; olderCut: number }
export const concap20Line = (s: Pick<Concap20Stats, "lines" | "bodyChars" | "marker" | "firstIndex" | "lastIndex" | "sentinel">): string =>
  `CONCAP lines=${s.lines} body-chars=${s.bodyChars} marker=${yn(s.marker)} first-index=${s.firstIndex} last-index=${s.lastIndex} sentinel=${s.sentinel}`;

// ---------------------------------------------------------------- the busy text (S4, #389)
export const K_DEVT_CODE: string = ErrorCodes.DEBUGGER_DEVTOOLS;
/** The second chooser call's own refusal: K-devt's code with the product's busy message, exactly. The old overlap text fails it. */
export const busyExact = (a: { code?: string; message?: string; data?: unknown }): boolean => a.code === K_DEVT_CODE && a.message === CHOOSER_BUSY_MESSAGE && a.data === undefined;
export const namesDevtools = (message: string): boolean => /DevTools|Close/.test(message);

// ---------------------------------------------------------------- the MCP line judge
/** The MCP's own lines for the legs of the sheet, from the product (sdk/src/error.ts, daemon/src/intercept.ts, extension/src/handlers/upload.ts). */
export const MCP_LINES = {
  jsDisabled: safetyRefusalLine("JS_DISABLED", undefined) ?? "",
  disarmedAll: safetyRefusalLine("DISARMED", { scope: "all" }) ?? "",
  argsOld: ARGS_RELOAD_HINT,
  chooserOld: CHOOSER_RELOAD_HINT,
  busy: CHOOSER_BUSY_MESSAGE,
} as const;
export interface McpRead { isError: boolean; text: "exact" | "contains" | "other"; lines: number }
/** `exact` = the whole text is the line; `contains` = the line is inside a longer text (a code on line 1, a prefix); `other` = a failed clause. */
export function mcpLineRead(res: { isError: boolean; text: string }, expected: string): McpRead {
  if (expected === "") throw new Error("mcp line: an empty expected line");
  const text = res.text === expected ? "exact" : res.text.includes(expected) ? "contains" : "other";
  return { isError: res.isError, text, lines: res.text.split("\n").filter((l) => l.trim() !== "").length };
}
export const mcpLineVerdict = (r: McpRead): "PASS" | "FAIL" => (r.isError && r.text === "exact" && r.lines === 1 ? "PASS" : "FAIL");

// ---------------------------------------------------------------- the newest-kept cap judge (S3b, #398)
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The marker's pattern, derived from the product's own formatter (one cut line), never a copy of its text. */
const CAP_MARK: RegExp = (() => {
  const e = (t: string) => ({ level: "info" as const, kind: "console" as const, text: t, ts: 0 });
  const first = formatConsole([e("x"), e("x")], { maxChars: 40 }).split("\n")[0]!;
  if (!/older lines cut/.test(first) || (first.match(/\d+/g) ?? []).length !== 1) throw new Error("cap marker: the formatter's marker form changed");
  return new RegExp(`^${esc(first).replace(/\d+/, "(\\d+)")}$`);
})();
/** The marker is the first line, once; the kept lines follow oldest first. `lines` counts the marker (k + 1); `bodyChars` the kept lines joined by newlines. */
export function concap20Stats(text: string, sentinel: string): Concap20Stats {
  const all = text.split("\n").filter((l) => l !== "");
  const marks = all.filter((l) => CAP_MARK.test(l)).length;
  const marker = marks === 1 && CAP_MARK.test(all[0] ?? "");
  const body = all.filter((l) => !CAP_MARK.test(l));
  const idx = body.map((l) => Number(/s12-cap-(\d+):/.exec(l)?.[1] ?? 0));
  return {
    lines: all.length, bodyChars: body.join("\n").length, marker, firstIndex: idx[0] ?? 0, lastIndex: idx[idx.length - 1] ?? 0,
    sentinel: body.filter((l) => l.includes(sentinel)).length, consecutive: idx.every((x, i) => i === 0 || x === idx[i - 1]! + 1),
    olderCut: marker ? Number(CAP_MARK.exec(all[0]!)![1]) : 0,
  };
}
/** PASS: marker first and once with n = total - k, the kept lines the newest contiguous block ending at `total`, body at most `maxChars`. */
/** The rule holds with any k; the sheet pre-states k = 9 (`expectK`), and another k with the rule held is RECORD (with the line length, which the line prints). */
export function concap20Verdict(s: Concap20Stats, o: { total?: number; maxChars?: number; expectK?: number } = {}): "PASS" | "FAIL" | "RECORD" {
  const total = o.total ?? 200;
  const k = s.lines - 1;
  const rule = s.marker && k >= 1 && s.olderCut === total - k && s.lastIndex === total && s.firstIndex === total - k + 1 && s.consecutive && s.bodyChars <= (o.maxChars ?? 20_000);
  return !rule ? "FAIL" : k === (o.expectK ?? 9) ? "PASS" : "RECORD";
}

// ---------------------------------------------------------------- the DevTools control and verdicts (#391 (1))
export type CtrlVerdict = "PASS" | "RECORD devtools-control-unreadable" | "NOT MEASURED DevTools was not attached" | "NOT MEASURED the tab was attached before the open";
/** Passes when before reads attached=no, after reads attached=yes and, for an undocked leg, windows=1 title=ok. Never a PASS on an unreadable control. */
export function ctrl20Verdict(before: Ctl, after: Ctl, leg: "undock" | "docked"): CtrlVerdict {
  if (before.attached === "unread" || after.attached === "unread") return "RECORD devtools-control-unreadable";
  if (before.attached === "yes") return "NOT MEASURED the tab was attached before the open";
  if (after.attached === "no") return "NOT MEASURED DevTools was not attached";
  if (leg === "undock" && (after.windows !== 1 || after.title !== "ok")) return "RECORD devtools-control-unreadable";
  return "PASS";
}
export interface DevtLeg { verdict: string; finding?: "devtools-refuses" }
/** Control first; then ok with `2` = PASS; K-devt's code and message exactly = FAIL with the finding (no STOP); anything else FAIL. */
export function devt20Verdict(control: string, ans: { code: string; message?: string; value?: unknown }): DevtLeg {
  if (control !== "PASS") return { verdict: control };
  if (ans.code === "ok" && ans.value === 2) return { verdict: "PASS" };
  if (ans.code === K["K-devt"].code && ans.message === K["K-devt"].message) return { verdict: "FAIL", finding: "devtools-refuses" };
  return { verdict: "FAIL" };
}
const RANK = (v: string): number => (v === "PASS" ? 0 : v.startsWith("RECORD") ? 1 : v.startsWith("NOT MEASURED") ? 2 : 3);
export const worseVerdict = (vs: readonly string[]): string => vs.reduce((w, v) => (RANK(v) > RANK(w) ? v : w), "PASS");
/** UP-DEVT, KEEP-4 and SWEEP-HELD run only for a leg that printed devtools-refuses. */
export const conditionalRows = (legs: readonly DevtLeg[]): { run: boolean; line?: string } =>
  legs.some((l) => l.finding === "devtools-refuses") ? { run: true } : { run: false, line: "no DevTools condition refused" };
/** R20-0C: an unreadable dock side means no DevTools row may change it (it could not be restored). */
export const devtRowGate = (side: DockSide): { run: true } | { run: false; reason: string } =>
  side === "unread" ? { run: false, reason: "dock side unreadable, it could not be restored" } : { run: true };
/** R20-RESTORE: the read-back (a reopened tab DevTools) equals R20-0C's side, else the STOP; an unread side never passes. #416: a found side that is unread when no dock change ran in the slice is NOT MEASURED, whatever the read-back. */
export const dockRestoreVerdict = (found: DockSide, readback: DockSide, changed: boolean): "PASS" | "STOP not-restored" | "NOT MEASURED" =>
  found === "unread" && !changed ? "NOT MEASURED" : found !== "unread" && found === readback ? "PASS" : "STOP not-restored";

// ---------------------------------------------------------------- the disabled-input reachability map (#370, #391 (7))
export interface DisAnswer { code: string; message?: string; files: number; change: number; data?: unknown }
export type DisClass = "refused" | "timeout" | "file-set" | "other";
export function disClass(a: DisAnswer): DisClass {
  if (a.code === "BAD_PARAMS" && a.message === DISABLED_INPUT_MESSAGE && a.files === 0 && a.change === 0 && a.data === undefined) return "refused";
  if (a.code === "TIMEOUT" && a.message === CHOOSER_TIMEOUT_MESSAGE && a.files === 0 && a.data === undefined) return "timeout";
  if (a.code === "ok" && a.files >= 1) return "file-set";
  return "other";
}
const NOT_REACHABLE = "RECORD refusal not reachable on a page that flips or targets the input itself";
/** `flip` decides alone unless it answers TIMEOUT; then `self`: the refusal PASS, TIMEOUT RECORD, a file set (or another answer) FAIL. */
export function disVerdict(a: { flip: DisAnswer; self?: DisAnswer }): "PASS" | "FAIL" | typeof NOT_REACHABLE {
  const f = disClass(a.flip);
  if (f === "refused") return "PASS";
  if (f !== "timeout") return "FAIL";
  if (a.self === undefined) return NOT_REACHABLE;
  const s = disClass(a.self);
  return s === "refused" ? "PASS" : s === "timeout" ? NOT_REACHABLE : "FAIL";
}
/** Leg `btn` (an input disabled from the start) must read TIMEOUT: the baseline of the statement. */
export const disBaselineOk = (a: DisAnswer): boolean => disClass(a) === "timeout";

// ---------------------------------------------------------------- console clauses and the SCAN20 actors lines
/** The R20 rows with a console clause: judged before R20-LOGS runs (#351 (4) (b)). */
export const hasConsoleClause20 = (id: string): boolean => /^R20-(ARGS|CON)-[A-Z0-9]/.test(id);
const SENTINEL_TOOLS: readonly string[] = ["browser_console_messages", "tab.consoleMessages", "browser_evaluate", "tab.evaluate"];
const EVALUATE_TOOLS: readonly string[] = ["browser_evaluate", "tab.evaluate"];
/** name or token above 0 anywhere, or a sentinel above 0 on a tool outside the four, is the STOP text-leak. */
export const actorsVerdict = (lines: readonly (Scan3 & { tool: string })[]): "PASS" | "STOP text-leak" =>
  lines.every((l) => l.name === 0 && l.token === 0 && (l.sentinel === 0 || SENTINEL_TOOLS.includes(l.tool))) ? "PASS" : "STOP text-leak";
/** The `SCAN20 actors` line has no row field (verifier3 NIT G): an evaluate tool's sentinel count is attributed to the ARGS rows that echo the table. */
export const sentinelRows = (tool: string): string[] => (EVALUATE_TOOLS.includes(tool) ? ["R20-ARGS-ORDER", "R20-ARGS-OLD"] : []);

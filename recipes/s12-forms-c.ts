// Step 12 S7-helpers-c: line forms (21)-(24), (26), (27), (30), (33) of docs/e2e-test-plan.md section 4.27 as pure formatters. Node only.
// A value is a count or a fixed code, never a text. recipes/test/s12-forms-c.test.ts compares each form's keys and order with the sheet.
const yn = (b: boolean): string => (b ? "yes" : "no");
const ynNa = (b: boolean | null): string => (b === null ? "n/a" : yn(b));
const CODE = /^(ok|[A-Z][A-Z_]*)$/;
const ROW = /^[A-Za-z0-9][\w-]*$/;
function word(re: RegExp, v: string, what: string): string {
  if (!re.test(v)) throw new Error(`${what}: not a fixed code or plain word`);
  return v;
}
const count = (n: number, what: string): number => {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${what}: a count is a non-negative integer`);
  return n;
};

// (21) CHOOSE: files/change/clicks/bytes-equal from the page's own reporter, `dialog` = native dialogs the UIA read counted during the call.
export const chooseLine = (row: string, label: string, o: { answer: string; exact: boolean | null; files: number; change: number; clicks: number; bytesEqual: boolean | null; dialog: number; ms: number }): string =>
  `CHOOSE ${word(ROW, row, "row")} ${word(ROW, label, "label")} ${word(CODE, o.answer, "answer")} exact=${ynNa(o.exact)} files=${count(o.files, "files")} change=${count(o.change, "change")} clicks=${count(o.clicks, "clicks")} bytes-equal=${ynNa(o.bytesEqual)} dialog=${count(o.dialog, "dialog")} ms=${count(o.ms, "ms")}`;
// (22) DIALOG
export const dialogLine = (row: string, o: { leg: "a" | "b" | "c"; before: number; afterClick: number; afterClose: number; ms: number; change: number }): string =>
  `DIALOG ${word(ROW, row, "row")} leg=${o.leg} before=${count(o.before, "before")} after-click=${count(o.afterClick, "after-click")} after-close=${count(o.afterClose, "after-close")} ms=${count(o.ms, "ms")} change=${count(o.change, "change")}`;
// (23) LATE: opener-ms is one of the two fixture values.
export const lateLine = (row: string, o: { openerMs: 4900 | 5100; opened: boolean; dialog: number }): string => {
  if (o.openerMs !== 4900 && o.openerMs !== 5100) throw new Error("late: opener-ms is 4900 or 5100");
  return `LATE ${word(ROW, row, "row")} opener-ms=${o.openerMs} opened=${yn(o.opened)} dialog=${count(o.dialog, "dialog")}`;
};
// (24) HUMAN
export type HumanReceived = "call-target" | "clicked-input" | "none";
export const humanLine = (row: string, o: { received: HumanReceived; dialog: number; files: number }): string =>
  `HUMAN ${word(ROW, row, "row")} received=${o.received} dialog=${count(o.dialog, "dialog")} files=${count(o.files, "files")}`;
// (26) G2 and G2TYPE
export const g2Line = (row: string, o: { aReplyMs: number; bReplyMs: number; gapMs: number; holderAfterReplyMs: number; aEffect: number; b: string }): string =>
  `G2 ${word(ROW, row, "row")} a-reply=${count(o.aReplyMs, "a-reply")} b-reply=${count(o.bReplyMs, "b-reply")} gap-ms=${count(o.gapMs, "gap-ms")} holder-after-reply-ms=${count(o.holderAfterReplyMs, "holder")} a-effect=${count(o.aEffect, "a-effect")} b=${word(CODE, o.b, "b")}`;
export const g2typeLine = (o: { round: number; got: number; bCalls: number; bOk: number; bLockTimeout: number; sent?: 40 }): string => {
  const got = count(o.got, "got");
  if (got > 40) throw new Error("g2type: got cannot exceed sent");
  return `G2TYPE round=${count(o.round, "round")} sent=40 got=${got} lost=${40 - got} b-calls=${count(o.bCalls, "b-calls")} b-ok=${count(o.bOk, "b-ok")} b-lock-timeout=${count(o.bLockTimeout, "b-lock-timeout")}`;
};
// (27) VERSIONCH
export const versionchLine = (row: string, o: { leg: "sdk" | "mcp" | "raw" | "control"; code: string; hint: boolean; files: number; exact: boolean }): string =>
  `VERSIONCH ${word(ROW, row, "row")} leg=${o.leg} code=${word(CODE, o.code, "code")} hint=${yn(o.hint)} files=${count(o.files, "files")} exact=${yn(o.exact)}`;
// (30) DIALOGS
export const dialogsLine = (slice: string, o: { native: number; devtools: number; waveWindowsOpen: number }): string =>
  `DIALOGS ${word(ROW, slice, "slice")} native=${count(o.native, "native")} devtools=${count(o.devtools, "devtools")} wave-windows-open=${count(o.waveWindowsOpen, "wave-windows-open")}`;
// (33) CLOSERPROBE. closed is n/a when no dialog opened; opened=yes closed=yes native-after=0 is the pass, anything else the runner judges.
export const CLOSER_WATCHDOG_MS = 5_000;
export const closerprobeLine = (method: string, o: { opened: boolean; closed: boolean | null; ms: number; nativeAfter: number }): string =>
  `CLOSERPROBE method=${word(/^[a-z][a-z0-9-]{0,30}$/, method, "method")} opened=${yn(o.opened)} closed=${ynNa(o.closed)} ms=${count(o.ms, "ms")} native-after=${count(o.nativeAfter, "native-after")}`;
/** The probe's verdict: the returning STOP `dialog-left-open` when the dialog is not closed or any is left; `opened=no` is NOT MEASURED (never a STOP). */
export function closerprobeVerdict(o: { opened: boolean; closed: boolean | null; nativeAfter: number }): "pass" | "not-measured" | "STOP dialog-left-open" {
  if (!o.opened) return o.nativeAfter > 0 ? "STOP dialog-left-open" : "not-measured";
  return o.closed === true && o.nativeAfter === 0 ? "pass" : "STOP dialog-left-open";
}

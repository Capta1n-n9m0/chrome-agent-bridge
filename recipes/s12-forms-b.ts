// Step 12 S7-helpers-b: line forms (14)-(20) and (25) of docs/e2e-test-plan.md section 4.27 part B as pure formatters, plus the DEVPROBE's
// attach judgment and poll loop (over an injected call and clock). Node only. A value is a count or a fixed code, never a text.
// recipes/test/s12-forms-b.test.ts compares every form's keys and order with the sheet's own paragraph.
import { createHash } from "node:crypto";
import { K } from "./s11-rules.js";
import type { ConEntry } from "./s12-forms.js";

const yn = (b: boolean): string => (b ? "yes" : "no");
const endText = (e: number | null): string => (e === null ? "never" : String(e)); // `never` has no spelling in the sheet's form: a finding
export interface Clock { now(): number; sleep(ms: number): Promise<void> }

// (14) DEVPROBE: `attached` comes ONLY from the answer code of the control call (never from UIA, never from the opener's own success).
export const K_DEVT = "DEBUGGER_DEVTOOLS";
export const DEVPROBE_DEADLINE_MS = 15_000;
export const attachedFrom = (code: string): boolean => code === K_DEVT;
export interface PollResult { answer: string; ms: number; attached: boolean }
const METHOD = /^[a-z][a-z0-9-]{0,30}$/;
export function devprobeLine(method: string, r: { answer: string; ms: number; attached?: boolean }): string {
  if (!METHOD.test(method)) throw new Error("devprobe: the method name must be a plain word");
  return `DEVPROBE method=${method} answer=${r.answer} ms=${r.ms} attached=${yn(attachedFrom(r.answer))}`;
}
/** `evaluate "1"` until K-devt or the deadline; a throw is the answer ERROR. `ms` = start to the deciding answer (or to the deadline). */
export async function pollUntilDevtools(call: () => Promise<string>, clock: Clock, o: { deadlineMs?: number; gapMs?: number } = {}): Promise<PollResult> {
  const deadline = o.deadlineMs ?? DEVPROBE_DEADLINE_MS;
  const start = clock.now();
  for (;;) {
    let answer: string;
    try { answer = await call(); } catch { answer = "ERROR"; }
    const ms = clock.now() - start;
    if (attachedFrom(answer) || ms >= deadline) return { answer, ms, attached: attachedFrom(answer) };
    await clock.sleep(o.gapMs ?? 500);
  }
}
export interface DevprobeIn {
  method: string; clock: Clock; deadlineMs?: number; gapMs?: number;
  open: () => Promise<unknown>; close: () => Promise<unknown>; call: () => Promise<string>;
  /** a test seam for a poll that throws */
  pollOverride?: () => Promise<PollResult>;
}
/** open (its result and success are ignored), poll, close in a finally. A close that throws is reported as closeError (the caller STOPs `devtools-left-open`). */
export async function devprobe(i: DevprobeIn): Promise<{ line: string; result: PollResult; openError: boolean; closeError: boolean }> {
  let openError = false;
  let closeError = false;
  let result: PollResult;
  try {
    try { await i.open(); } catch { openError = true; }
    result = await (i.pollOverride ?? (() => pollUntilDevtools(i.call, i.clock, { deadlineMs: i.deadlineMs, gapMs: i.gapMs })))();
  } finally {
    try { await i.close(); } catch { closeError = true; }
  }
  return { line: devprobeLine(i.method, result), result, openError, closeError };
}

// the banner timeline: `<ms>:<1|0>,...` (1 = the sampler saw the banner), as s12-win-b.ps1's Format-S12Timeline prints it
export interface BannerRead { t: number; seen: boolean }
export function parseTimeline(s: string): BannerRead[] {
  if (s.trim() === "") return [];
  return s.split(",").map((p) => {
    const m = /^(\d+):([01])$/.exec(p.trim());
    if (!m) throw new Error("timeline: a read is <ms>:<0|1>");
    return { t: Number(m[1]), seen: m[2] === "1" };
  });
}
/** `continuous` when every read in [fromMs, toMs] saw the banner; else `gaps:<runs of none>`. An empty window is one gap (nothing was read). */
export function bannerSpan(reads: BannerRead[], fromMs: number, toMs: number): string {
  const w = reads.filter((r) => r.t >= fromMs && r.t <= toMs);
  if (w.length === 0) return "gaps:1";
  const gaps = w.filter((r, i) => !r.seen && (i === 0 || w[i - 1]!.seen)).length;
  return gaps === 0 ? "continuous" : `gaps:${gaps}`;
}
/** Last reply to the first read of `none` at or after it; null when no such read. */
export function bannerEndMs(reads: BannerRead[], lastReplyMs: number): number | null {
  const r = reads.find((x) => x.t >= lastReplyMs && !x.seen);
  return r === undefined ? null : r.t - lastReplyMs;
}
export const pollMsOf = (reads: BannerRead[]): number => reads.reduce((m, r, i) => (i === 0 ? m : Math.max(m, r.t - reads[i - 1]!.t)), 0);

// (15) (16)
export const keepseqLine = (row: string, o: { calls: number; gapMs: number; answersOk: number; banner: string; endMs: number | null; pollMs: number }): string =>
  `KEEPSEQ ${row} calls=${o.calls} gap-ms=${o.gapMs} answers=${o.answersOk}/${o.calls} banner=${o.banner} end-ms=${endText(o.endMs)} poll-ms=${o.pollMs}`;
export type KeepLeg = "ctl" | "idle" | "disarm" | "block" | "nav-blocked" | "nav-own" | "nav-file" | "close" | "replace";
export const keependLine = (row: string, o: { leg: KeepLeg; sinceLastCallMs: number; endMs: number | null; next: string }): string =>
  `KEEPEND ${row} leg=${o.leg} since-last-call-ms=${o.sinceLastCallMs} end-ms=${endText(o.endMs)} next=${o.next}`;

// (17) CONKEPT: equal = same entries, order and timestamps by hash (never printed); ordered = timestamps non-decreasing in both reads.
const sha = (es: ConEntry[]): string => createHash("sha256").update(JSON.stringify(es)).digest("hex");
const ordered = (es: ConEntry[]): boolean => es.every((e, i) => i === 0 || es[i - 1]!.ts <= e.ts);
export const conkeptLine = (first: ConEntry[], second: ConEntry[]): string =>
  `CONKEPT first=${first.length} second=${second.length} equal=${yn(sha(first) === sha(second))} ordered=${yn(ordered(first) && ordered(second))}`;

// (18) (19) (20)
export const sweepheldLine = (o: { afterReload: string; devtoolsOpen: boolean; reclaimed: boolean }): string =>
  `SWEEPHELD after-reload=${o.afterReload} devtools-open=${yn(o.devtoolsOpen)} reclaimed=${yn(o.reclaimed)}`;
export const keepdtLine = (row: string, leg: "devtools" | "cancel" | "closed", next: string): string => `KEEPDT ${row} leg=${leg} next=${next}`;
/** exact: the answer is K-devt's code with K-devt's message (today's overlap text, recipes/s11-rules.ts K). */
export const overlapExact = (a: { code: string; message?: string }): boolean => a.code === K["K-devt"].code && a.message === K["K-devt"].message;
export const overlapLine = (row: string, o: { leg: "evaluate" | "chooser"; first: string; second: string; exact: boolean }): string =>
  `OVERLAP ${row} leg=${o.leg} first=${o.first} second=${o.second} exact=${yn(o.exact)}`;

// (25) CONCAP: the MCP tool's text. The marker is one last line `… [truncated: <n> more lines, ...]`; the body is everything before it.
const CAP_MARK = /^… \[truncated: (\d+) more lines, the newest — narrow with level\/limit\]$/;
export interface ConcapStats { lines: number; bodyChars: number; marker: boolean; firstIndex: number; lastIndex: number; sentinel: number; consecutive: boolean; moreLines: number }
export function concapStats(text: string, sentinel: string): ConcapStats {
  const all = text.split("\n");
  const marks = all.filter((l) => CAP_MARK.test(l)).length;
  const marker = marks === 1 && CAP_MARK.test(all[all.length - 1]!);
  const body = all.filter((l) => !CAP_MARK.test(l) && l !== "");
  const idx = body.map((l) => Number(/s12-cap-(\d+):/.exec(l)?.[1] ?? 0));
  return {
    lines: body.length, bodyChars: body.join("\n").length, marker, firstIndex: idx[0] ?? 0, lastIndex: idx[idx.length - 1] ?? 0,
    sentinel: body.filter((l) => l.includes(sentinel)).length, consecutive: idx.every((x, i) => i === 0 || x === idx[i - 1]! + 1),
    moreLines: marker ? Number(CAP_MARK.exec(all[all.length - 1]!)![1]) : 0,
  };
}
export const concapLine = (s: ConcapStats): string =>
  `CONCAP lines=${s.lines} body-chars=${s.bodyChars} marker=${yn(s.marker)} first-index=${s.firstIndex} last-index=${s.lastIndex} sentinel=${s.sentinel}`;

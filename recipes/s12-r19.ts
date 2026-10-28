// Step 12 S7-helpers-d: the pure part of Run 19's block runner (docs/e2e-test-plan.md section 4.27): forms (28) DAEMONLOG, (29) SCANTOOL / SCAN actors,
// (31) STOP + RETURN, (32) FIX, the R7.6 pairing check, the one-ROW aggregator, the capture segment names, and three thin commands the PowerShell runner
// (recipes/s12-r19-lib.ps1) calls: `proof` (R19-0's new-build proof), `swap` / `restore-head` (the old-build swap of s12-oldbuild.ts).
// NOT run against Chrome by its author. Every value printed is a count or a fixed word, never a text.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateRows } from "./s11b-r17b-rules.js";
import { scan18 } from "./s12-rules.js";
import type { ScanCtx } from "./s11-rules.js";
import { hasConsoleClause, loadedLine, settleConsoleClauses, type Verdict } from "./s12-forms.js";
import { extensionIdFromPath } from "./s9-rules.js";
import { realSwapIO, restoreHead, swapOldBuild } from "./s12-oldbuild.js";

export const SLICES_19 = ["liveA19", "liveB19", "liveC19", "liveD19", "liveE19"] as const;
export type Slice19 = (typeof SLICES_19)[number];
export const isSlice19 = (s: string): s is Slice19 => (SLICES_19 as readonly string[]).includes(s);
/** Form (31)'s thirteen reasons, as the sheet lists them. */
export const STOP_REASONS = ["attach-after-disarm", "attach-on-refused-page", "kept-session-used", "dialog-not-opened", "outside-file-reached-page", "args-ran-js-off", "existing-tool-changed", "dialog-left-open", "devtools-left-open", "not-restored", "text-leak", "old-build-left-loaded", "throw-after-state"] as const;
export type StopReason = (typeof STOP_REASONS)[number];

export const stopLine = (reason: StopReason): string => `STOP ${reason}`;
export const returnLine = (seq: number, reason: StopReason, restored: "yes" | "no" | "n/a", readback: "equal" | "n/a"): string => `RETURN ${seq} after-stop=${reason} restored=${restored} readback=${readback}`;
export const fixLine = (what: string): string => `FIX ${what}`;
export const daemonlogSliceLine = (slice: string, c: { sentinel: number; consoleText: number; argsText: number }): string => `DAEMONLOG ${slice} sentinel=${c.sentinel} console-text=${c.consoleText} args-text=${c.argsText}`;

const PRE = /^(?:\d{4}-\d\d-\d\dT[\d:.]+Z )?(?:s9-win: )?/;
/** R7.6: every `STOP <reason>` has exactly one `RETURN <seq> after-stop=<same reason> …` after it, in order, before the next `ROW`; seqs run 1, 2, ... */
export function checkStopReturn(lines: readonly string[]): string[] {
  const bad: string[] = [];
  const want = new RegExp(`^STOP (${STOP_REASONS.join("|")})$`);
  let open: string | null = null;
  let seq = 0;
  for (const raw of lines) {
    const l = raw.replace(PRE, "");
    const s = want.exec(l);
    if (s) { if (open) bad.push(`STOP ${open} has no RETURN before the next STOP`); open = s[1]!; continue; }
    const r = /^RETURN (\d+) after-stop=(\S+) restored=(yes|no|n\/a) readback=(equal|n\/a)$/.exec(l);
    if (r) {
      seq++;
      if (!open) bad.push(`RETURN ${r[1]} has no STOP before it`);
      else if (open !== r[2]) bad.push(`RETURN ${r[1]} names ${r[2]}, the STOP was ${open}`);
      if (Number(r[1]) !== seq) bad.push(`RETURN seq ${r[1]} is not ${seq}`);
      open = null;
    } else if (open && l.startsWith("ROW ")) { bad.push(`STOP ${open} was followed by a ROW before its RETURN`); open = null; }
  }
  if (open) bad.push(`STOP ${open} has no RETURN`);
  return bad;
}

// ---- (29) the actors' scan: the failure report's `Screenshot:` line and the client's `[Image: source:` line are counted apart (#349) ----------------
/** `Screenshot: <abs path>\.chrome-agent-bridge\failures\<file>.png`: sdk/src/error.ts prints `Screenshot: ${path}` (pinned in sdk/test/failure-report.test.ts), the default dir is <home>/.chrome-agent-bridge/failures. */
export const SHOT_LINE_RE = /^Screenshot: .*[\\/]\.chrome-agent-bridge[\\/]failures[\\/][^\\/\r\n]+\.png\s*$/;
/** Claude Code's own line for an image item (a form from #349's prose and the Step 8 run records only: no committed test pins it, Open item 15). */
export const IMAGE_LINE_RE = /^\[Image: source: .+\.png\]\s*$/;
export interface ToolCounts { urls: number; fixture: number; other: number; token: number; sentinel: number; profileOther: number; profileAll: number; shotLine: number; imageLine: number }
export function scanToolText(text: string, ctx: ScanCtx): ToolCounts {
  const lines = text.split(/\r?\n/);
  const named = lines.filter((l) => SHOT_LINE_RE.test(l) || IMAGE_LINE_RE.test(l));
  const rest = scan18(lines.filter((l) => !named.includes(l)).join("\n"), ctx);
  const all = scan18(text, ctx);
  return { urls: all.urls, fixture: all.fixture, other: all.other, token: all.token, sentinel: all.sentinel, profileOther: rest.profile, profileAll: all.profile, shotLine: lines.filter((l) => SHOT_LINE_RE.test(l)).length, imageLine: lines.filter((l) => IMAGE_LINE_RE.test(l)).length };
}
export const scantoolLine = (slice: string, tool: string, c: ToolCounts): string => `SCANTOOL ${slice} tool=${tool} sentinel=${c.sentinel} token=${c.token} profile=${c.profileOther} shot-line=${c.shotLine} image-line=${c.imageLine}`;
export const scanActorsLine = (c: ToolCounts): string => `SCAN actors: ://=${c.urls} (fixture ${c.fixture}, other ${c.other}) token=${c.token} sentinel=${c.sentinel} profile-other=${c.profileOther} shot-line=${c.shotLine} image-line=${c.imageLine}`;
export const SENTINEL_TOOLS: readonly string[] = ["browser_console_messages", "browser_evaluate"];
/** The sheet's rule: token 0 everywhere, profile-other 0, other URLs 0, the sentinel only in the tools whose reply carries it. A bad tool name is itself a failure. */
export function scanActors(slice: string, results: ReadonlyArray<{ tool: string; text: string }>, ctx: ScanCtx): { lines: string[]; pass: boolean } {
  const by = new Map<string, string[]>();
  for (const r of results) by.set(r.tool, [...(by.get(r.tool) ?? []), r.text]);
  const lines: string[] = [];
  let pass = true;
  for (const [tool, texts] of by) {
    const c = scanToolText(texts.join("\n"), ctx);
    lines.push(scantoolLine(slice, tool, c));
    if (c.token > 0 || c.profileOther > 0 || c.other > 0 || (c.sentinel > 0 && !SENTINEL_TOOLS.includes(tool))) pass = false;
  }
  const all = scanToolText(results.map((r) => r.text).join("\n"), ctx);
  lines.push(scanActorsLine(all), `CHECK actors profile-all=${all.profileAll}`);
  return { lines, pass };
}

// ---- the one-ROW aggregator ----------------------------------------------------------------------------------------------------------------
/** Drops only a byte-identical re-print of `ROW RULES ...` (R19-0 and R19-RESTORE both print it, #351 (4) (c)); any other repeated ROW stays so aggregateRows warns on it. */
export function dedupeRulesOnly(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((l) => {
    const t = l.replace(PRE, "");
    if (!/^ROW RULES\b/.test(t)) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
export function aggregateSlice(lines: readonly string[]): { warns: string[]; n: number; stopReturn: string[] } {
  const a = aggregateRows(dedupeRulesOnly(lines));
  return { warns: a.warns, n: a.n, stopReturn: checkStopReturn(lines) };
}
/** (#351 (4) (b)) the final ROW of every row with a console clause, printed before R19-LOGS runs. */
export const settleLines = (pending: Record<string, Verdict>, clause: "ok" | "fail" | "unread"): string[] => settleConsoleClauses(pending, clause);
export { hasConsoleClause };

/** Capture segment file: one file for a slice that reloads nothing (A, C), `console-<slice>-<k>.txt` for B, D, E (Capture segments). */
export const capturePath = (slice: Slice19, k: number): string => (slice === "liveA19" || slice === "liveC19" ? `console-${slice}.txt` : `console-${slice}-${k}.txt`);
export const capsegLine = (slice: string, k: number, saved: boolean, before: "reload" | "end"): string => `CAPSEG ${slice} seg=${k} saved=${saved ? "yes" : "no"} before=${before}`;

// ---- the thin commands ------------------------------------------------------------------------------------------------------------------------
/** R19-0's new-build proof: counts only. `args` answered means the call returned 7. */
export function proofCounts(es: ReadonlyArray<{ kind: string }>, argsAnswer: unknown): { entries: number; console: number; exception: number; args: string } {
  return { entries: es.length, console: es.filter((e) => e.kind === "console").length, exception: es.filter((e) => e.kind === "exception").length, args: argsAnswer === 7 ? "answered" : "other" };
}
export const answerWord = (e: unknown): string => {
  const m = e as { code?: unknown; message?: unknown };
  return /^unknown method/.test(String(m?.message ?? "")) ? "UNKNOWN_METHOD" : typeof m?.code === "string" ? m.code : "ERROR";
};
/** The sheet: only consoleMessages=UNKNOWN_METHOD or args=VERSION is a STOP (2); any other reading that is not the expected one (args=other, an ERROR read, wrong counts) is R19-0's FAIL (1). */
export function proofExit(cm: string, args: string, c: { entries: number; console: number; exception: number }): 0 | 1 | 2 {
  const stale = (w: string): boolean => w === "UNKNOWN_METHOD" || w === "VERSION";
  if (stale(cm) || stale(args)) return 2;
  return cm === "answered" && args === "answered" && c.entries === 11 && c.console === 10 && c.exception === 1 ? 0 : 1;
}
async function proof(rerun: number | undefined): Promise<number> {
  const { connect } = await import("../sdk/src/index.js");
  const c = await connect({ name: "s12-r19-proof", failureReports: false });
  try {
    const tab = await c.newTab("http://localhost:8081/s12-console.html?s12=con");
    try {
      await new Promise((r) => setTimeout(r, 2000));
      let cm = "answered";
      let counts = { entries: 0, console: 0, exception: 0, args: "other" };
      try { counts = { ...counts, ...proofCounts(await tab.consoleMessages(), counts.args) }; } catch (e) { cm = answerWord(e); }
      let args = "other";
      try { args = proofCounts([], await tab.evaluate("(a) => a", { args: 7 })).args; } catch (e) { args = answerWord(e); }
      console.log(loadedLine({ rerun, consoleMessages: cm, entries: counts.entries, console: counts.console, exception: counts.exception, args }));
      return proofExit(cm, args, counts);
    } finally { await tab.close().catch(() => undefined); }
  } finally { c.close(); }
}
/** (28) the probe strings are fixture constants: s12-console.js's SENTINEL, the page's message prefixes, and mcp/test/s12-args-cross.test.ts's args sentinel. */
export const PROBES_19 = { sentinel: ["s12sent-5f3a9c71"], consoleText: ["s12-con-", "s12-notea"], argsText: ["sentinel-args-K7W3-"] } as const;
const occurrences = (text: string, probes: readonly string[]): number => probes.reduce((n, p) => n + text.split(p).length - 1, 0);
export const daemonlogCounts = (text: string): { sentinel: number; consoleText: number; argsText: number } => ({ sentinel: occurrences(text, PROBES_19.sentinel), consoleText: occurrences(text, PROBES_19.consoleText), argsText: occurrences(text, PROBES_19.argsText) });
function scanCtx19(repo: string): ScanCtx {
  const tf = join(repo, "bridge.token");
  const token = process.env.BRIDGE_TOKEN || (existsSync(tf) ? readFileSync(tf, "utf8").trim() : "");
  return { token, sentinel: PROBES_19.sentinel[0], profile: [homedir()], ownId: extensionIdFromPath(join(repo, "extension")) };
}
export async function main(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv;
  const opt = (k: string): string => rest[rest.indexOf(`--${k}`) + 1] ?? "";
  const repo = resolve(fileURLToPath(import.meta.url), "..", "..");
  if (sub === "proof") return proof(opt("rerun") === "" ? undefined : Number(opt("rerun")));
  if (sub === "swap") {
    // M1's wording reaches the record: the message names no path (s12-oldbuild.ts WORDING); an unhandled rejection would leave only "exited 1 with no ROW".
    try { swapOldBuild(realSwapIO(), { repo, commit: opt("commit"), tmp: opt("tmp") }); } catch (e) { console.log(`SWAP failed: ${e instanceof Error ? e.message : "error"}`); return 2; }
    console.log("SWAP old build is in extension/dist");
    return 0;
  }
  if (sub === "restore-head") { const ok = restoreHead(realSwapIO(), repo); console.log(`RESTOREHEAD ${ok ? "ok" : "failed"}`); return ok ? 0 : 2; }
  if (sub === "daemonlog") { const c = daemonlogCounts(readFileSync(opt("file"), "utf8")); console.log(daemonlogSliceLine(opt("slice"), c)); return c.sentinel + c.consoleText + c.argsText === 0 ? 0 : 2; }
  if (sub === "scan-actors") {
    const rs = readFileSync(opt("file"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as { tool: string; text: string });
    const r = scanActors(opt("slice"), rs, scanCtx19(repo));
    for (const l of r.lines) console.log(l);
    return r.pass ? 0 : 2;
  }
  if (sub === "rows19") {
    const a = aggregateSlice(readFileSync(opt("from"), "utf8").split(/\r?\n/));
    for (const w of a.warns) console.log(w);
    for (const b of a.stopReturn) console.log(`WARN ${b}`);
    console.log(`CHECK rows19 rows=${a.n} warns=${a.warns.length} stop-return=${a.stopReturn.length}`);
    return a.stopReturn.length === 0 ? 0 : 2;
  }
  console.log(`unknown subcommand ${String(sub)}`);
  return 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; });

// Step 13 S5-drivers-A: the pure shared block runner of Run 20 (docs/e2e-test-plan.md section 4.28), for all three slices: STOP and RETURN with the R5.6 pairing check,
// the one-ROW aggregator, scan20 (counts only), the restore comparison by count and hash, the capture names, R20-0's proof, and the thin commands recipes/s13-r20.ps1 calls.
// The line forms come from s13-forms.ts and are never re-implemented here. NOT run against Chrome by its author. Every value printed is a count or a fixed word.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BoxState } from "./s11-rules.js";
import { answerWord } from "./s12-r19.js";
import { actorsVerdict, loadedLine20, portLine, s4Line, scan20ActorsLine, scan20Line, type Order, type Read3, type Scan3 } from "./s13-forms.js";
export const SLICES_20 = ["liveA20", "liveB20", "liveC20"] as const;
export type Slice20 = (typeof SLICES_20)[number];
export const isSlice20 = (s: string): s is Slice20 => (SLICES_20 as readonly string[]).includes(s);
/** The sheet's STOP bullet ("STOP lines matched to a return"), in its order. */
export const STOP_REASONS_20 = ["build-not-loaded", "extension-disabled", "reload-failed", "popup-lease-wrong", "existing-tool-changed", "args-ran-js-off", "chooser-interception-left-on", "outside-file-reached-page", "dialog-left-open", "devtools-left-open", "not-restored", "text-leak", "old-build-left-loaded", "throw-after-state"] as const;
export type StopReason20 = (typeof STOP_REASONS_20)[number];
export const stopLine = (reason: StopReason20): string => `STOP ${reason}`;
export const returnLine = (seq: number, reason: StopReason20, restored: "yes" | "no" | "n/a", readback: "equal" | "n/a"): string => `RETURN ${seq} after-stop=${reason} restored=${restored} readback=${readback}`;
const PRE = /^(?:\d{4}-\d\d-\d\dT[\d:.]+Z )?(?:s9-win: )?/;
/** R5.6: every `STOP <reason>` has exactly one `RETURN <seq> after-stop=<same reason> ...` after it, in order, before the next ROW; seqs run 1, 2, ... */
export function checkStopReturn20(lines: readonly string[]): string[] {
  const bad: string[] = [];
  const want = new RegExp(`^STOP (${STOP_REASONS_20.join("|")})$`);
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
// ---- the one-ROW aggregator ---------------------------------------------------------------------------------------------------------------------
const SEVERITY = ["STOP", "FAIL", "NOT DISCRIMINATING", "NOT MEASURED", "NOT RUN", "RECORD", "PASS"] as const;
const VERDICT = /^(STOP|FAIL|NOT DISCRIMINATING|NOT MEASURED|NOT RUN|PASS|RECORD)(?=[ :]|$)/;
/** The worst verdict of a row's legs; RECORD is the mildest non-PASS. No legs is NOT MEASURED. */
export const rowVerdict20 = (vs: readonly string[]): string => (vs.length === 0 ? "NOT MEASURED" : vs.reduce((w, v) => (SEVERITY.indexOf(v as never) < SEVERITY.indexOf(w as never) ? v : w)));
/** A ROW line counts for its id only when a verdict word follows the id; a leg note (`ROW R20-POP-OTHER unjoined NOT MEASURED ...`) is not a row. The key is the id and the slice letter. */
export function aggregateRows20(lines: readonly string[]): { n: number; warns: string[]; verdicts: Record<string, string> } {
  const verdicts: Record<string, string> = {};
  const warns: string[] = [];
  for (const raw of lines) {
    const m = /^ROW (R20-[A-Z0-9-]+) (.*)$/.exec(raw.replace(PRE, ""));
    const v = m ? VERDICT.exec(m[2]!) : null;
    if (!m || !v) continue;
    const key = `${m[1]}|${/ slice=([ABC])\b/.exec(raw)?.[1] ?? ""}`;
    if (key in verdicts) warns.push(`WARN row printed twice: ${m[1]}`);
    verdicts[key] = key in verdicts ? rowVerdict20([verdicts[key]!, v[1]!]) : v[1]!;
  }
  return { n: Object.keys(verdicts).length, warns, verdicts };
}
export const capturePath20 = (slice: Slice20, k: number): string => `console-${slice}-${k}.txt`;
// ---- scan20: the user's name, the sentinel(s) and the token, counted in a text; a pattern is never printed ------------------------------------------
export interface ScanArgs { name: string; alsoNames?: readonly string[]; sentinels: readonly string[]; token: string }
const occ = (text: string, p: string): number => (p === "" ? 0 : text.split(p).length - 1);
export function scan20(text: string, a: ScanArgs): Scan3 {
  if (a.name === "" || a.token === "" || a.sentinels.length === 0 || a.sentinels.some((s) => s === "")) throw new Error("scan20: a pattern is empty");
  return { name: [a.name, ...(a.alsoNames ?? [])].reduce((n, s) => n + occ(text.toLowerCase(), s.toLowerCase()), 0), sentinel: a.sentinels.reduce((n, s) => n + occ(text, s), 0), token: occ(text, a.token) };
}
/** The console, daemon and evidence streams expect 0 for all three patterns (sheet R20-LOGS): any count is the STOP text-leak (exit 2). */
export const scanExit20 = (c: Scan3): 0 | 2 => (c.name + c.sentinel + c.token === 0 ? 0 : 2);
export const scan20Stream = (stream: string, text: string, a: ScanArgs): string => scan20Line(stream, scan20(text, a));
/** One `SCAN20 actors <tool>` line per tool, judged through actorsVerdict (form (11)). */
export function scan20Actors(results: ReadonlyArray<{ tool: string; text: string }>, a: ScanArgs): { lines: string[]; verdict: "PASS" | "STOP text-leak" } {
  const by = new Map<string, string[]>();
  for (const r of results) by.set(r.tool, [...(by.get(r.tool) ?? []), r.text]);
  const counts = [...by].map(([tool, texts]) => ({ tool, ...scan20(texts.join("\n"), a) }));
  return { lines: counts.map((c) => scan20ActorsLine(c.tool, c)), verdict: actorsVerdict(counts) };
}
// ---- the restore comparison by count and hash: fixed words out, never a hash -------------------------------------------------------------------------
export interface Restore20 { readback: "equal" | "differs"; reason: "none" | "flags" | "count" | "hash"; verdict: "PASS" | "STOP not-restored" }
export function restoreCompare20(found: BoxState, now: BoxState): Restore20 {
  const box = (a: { lines: number; sha256: string }, b: { lines: number; sha256: string }): Restore20["reason"] => (a.lines !== b.lines ? "count" : a.sha256 !== b.sha256 ? "hash" : "none");
  const reason: Restore20["reason"] = found.armed !== now.armed || found.evaluate !== now.evaluate ? "flags"
    : ([box(found.blocklist, now.blocklist), box(found.uploadfolders, now.uploadfolders)].find((r) => r !== "none") ?? "none");
  return reason === "none" ? { readback: "equal", reason, verdict: "PASS" } : { readback: "differs", reason, verdict: "STOP not-restored" };
}
// ---- R20-0's proof -------------------------------------------------------------------------------------------------------------------------------
/** `page` when the keys come back in the sender's order, else `sorted` (an empty list has nothing to reorder). */
export const orderOf = (got: readonly string[], page: readonly string[]): Order => (got.length === page.length && got.every((k, i) => k === page[i]) ? "page" : "sorted");
export interface ProofRead { keys: Order; nested: Order; elem: Order; perm: Read3; listener: Read3; enabled: "yes" | "no"; args: string }
/** exit 0 pass, 2 STOP (`why`), 1 FAIL. perm and listener unread: PASS on the keys alone and the note says the permission is NOT MEASURED. A re-run (after ARGS-OLD) asks the same: a stale one is old-build-left-loaded. */
export function proofDecision20(p: ProofRead, rerun = false): { exit: 0 | 1 | 2; why: StopReason20 | ""; note: string } {
  const stale = p.args === "VERSION" || p.args === "UNKNOWN_METHOD";
  const wrong = p.keys === "sorted" || p.nested === "sorted" || p.elem === "sorted" || p.perm === "no" || p.listener === "no" || stale;
  if (p.enabled === "no") return { exit: 2, why: rerun ? "old-build-left-loaded" : "extension-disabled", note: "" };
  if (wrong) return { exit: 2, why: rerun ? "old-build-left-loaded" : "build-not-loaded", note: "" };
  if (p.args !== "answered") return { exit: 1, why: "", note: "" };
  return { exit: 0, why: "", note: p.perm === "unread" || p.listener === "unread" ? "perm-not-measured" : "" };
}
/** The FALLBACK's note (the sheet's R20-0): the disk manifest's permission, recorded as such, only when the loaded one was unread. */
export const diskNote20 = (perm: Read3, disk: string | undefined): string => (perm === "unread" && (disk === "yes" || disk === "no") ? `CHECK R20-0 fallback disk-manifest webNavigation=${disk} (recorded as such; it cannot show what is loaded)` : "");
/** `enabled` has only yes|no in LOADED20; with no console reading the record names its source and claims no read. */
export const ENABLED_UNREAD_20 = "CHECK R20-0 enabled-source=reachability (the proof's calls reached the extension; not read from the console)";
const PAGE_VALUE = '({zeta: 1, alpha: 2, mid: {y: 1, x: 2}, list: [{q: 1, b: 2}]})';
const read3 = (v: string | undefined): Read3 => (v === "yes" || v === "no" ? v : "unread");
async function proof(o: Record<string, string>): Promise<number> {
  const { connect } = await import("../sdk/src/index.js");
  const rerun = o.rerun === undefined ? undefined : Number(o.rerun);
  const c = await connect({ name: "s13-r20-proof", failureReports: false });
  let order = { keys: "sorted" as Order, nested: "sorted" as Order, elem: "sorted" as Order };
  let args = "other";
  try {   // a throw here (daemon, fixture) is not "extension disabled": it ends the process with no LOADED20 line, which the wrapper maps to throw-after-state
    const tab = await c.newTab(`http://localhost:${o.port ?? "8081"}/e2e-playground.html?s12=a1`);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const v = (await tab.evaluate<{ zeta: number; mid: object; list: object[] }>(PAGE_VALUE));
        order = { keys: orderOf(Object.keys(v), ["zeta", "alpha", "mid", "list"]), nested: orderOf(Object.keys(v.mid), ["y", "x"]), elem: orderOf(Object.keys(v.list[0] ?? {}), ["q", "b"]) };
      } catch (e) { args = answerWord(e); }
      if (args === "other") { try { args = (await tab.evaluate<number>("(a) => a", { args: 7 })) === 7 ? "answered" : "other"; } catch (e) { args = answerWord(e); } }
    } finally { await tab.close().catch(() => undefined); }
  } finally { c.close(); }
  const p: ProofRead = { ...order, perm: read3(o.perm), listener: read3(o.listener), enabled: o.enabled === "no" ? "no" : "yes", args };
  console.log(loadedLine20({ rerun, keys: p.keys, nested: p.nested, elem: p.elem, perm: p.perm, listener: p.listener, enabled: p.enabled, args: /^(answered|[A-Z][A-Z_]*)$/.test(p.args) ? p.args : "ERROR" }));
  if (o.enabled === undefined) console.log(ENABLED_UNREAD_20);
  const d = proofDecision20(p, rerun !== undefined);
  if (d.note) console.log(`CHECK R20-0 ${d.note}`);
  const dn = diskNote20(p.perm, o.disk); if (dn) console.log(dn);
  if (d.why) console.log(`STOPWHY ${d.why}`);
  return d.exit;
}
// ---- the thin commands ---------------------------------------------------------------------------------------------------------------------------
const loginNames = (): string[] => [process.env.USERNAME ?? "", userInfo().username, basename(homedir())];
const gitName = (): string => { try { return execFileSync("git", ["config", "user.name"], { encoding: "utf8" }).trim(); } catch { return ""; } };
/** The patterns, read at run time and never printed: the git name and the login names, the fixture sentinels, the token. */
export function scanArgs20(repo: string): ScanArgs {
  const tf = resolve(repo, "bridge.token");
  const token = process.env.BRIDGE_TOKEN || (existsSync(tf) ? readFileSync(tf, "utf8").trim() : "");
  const name = gitName() || process.env.USERNAME || "";
  const also = [...new Set(loginNames().filter((s) => s !== "" && s.toLowerCase() !== name.toLowerCase()))];
  return { name, alsoNames: also, sentinels: ["s12sent-5f3a9c71", "sentinel-args-K7W3-"], token };
}
export async function main(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv;
  const o: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) o[rest[i]!.replace(/^--/, "")] = rest[i + 1] ?? "";
  const repo = resolve(fileURLToPath(import.meta.url), "..", "..");
  if (sub === "proof") return proof(o);
  if (sub === "s4") { console.log(s4Line(o.ancestor === "yes")); return 0; }
  if (sub === "port") { console.log(portLine(Number(o.port), new Date().toISOString(), Number(o.listed))); return 0; }
  if (sub === "restore-compare") {
    const rd = (k: string): BoxState => JSON.parse(readFileSync(o[k] ?? "", "utf8")) as BoxState;
    const r = restoreCompare20(rd("found"), rd("now"));
    console.log(`RESTORECHECK stored=${r.readback} differs-by=${r.reason}`);
    return r.verdict === "PASS" ? 0 : 2;
  }
  if (sub === "rows20") {
    const lines = readFileSync(o.from ?? "", "utf8").split(/\r?\n/);
    const a = aggregateRows20(lines);
    const sr = checkStopReturn20(lines);
    for (const w of [...a.warns, ...sr.map((b) => `WARN ${b}`)]) console.log(w);
    console.log(`CHECK rows20 rows=${a.n} warns=${a.warns.length} stop-return=${sr.length}`);
    return sr.length === 0 ? 0 : 2;
  }
  if (sub === "scan") { const t = readFileSync(o.file ?? "", "utf8"), a = scanArgs20(repo), c = scan20(t, a); console.log(scan20Line(o.stream ?? "", c)); return scanExit20(c); }
  if (sub === "scan-actors") {
    const rs = readFileSync(o.file ?? "", "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as { tool: string; text: string });
    const r = scan20Actors(rs, scanArgs20(repo));
    for (const l of r.lines) console.log(l);
    return r.verdict === "PASS" ? 0 : 2;
  }
  console.log(`unknown subcommand ${String(sub)}`);
  return 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, () => { console.log("ERROR s13-r20"); process.exitCode = 1; });

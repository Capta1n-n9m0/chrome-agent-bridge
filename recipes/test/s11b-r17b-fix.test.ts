// S7-helpers fixer tests (findings F1-F7, F11(a)(d)(f) of S7-helpers-verifier.md): each fails on the code before the fix.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { K17, parseCallRow } from "../s11b-rules.js";
import { carriedRowLine, carriedVerdict, histReplyLine, judgeR17bRow, judgeRd2Snapshot, judgeSnapshotPage, msForJudge, parseTabRowLine, rd2TabRowLine } from "../s11b-r17b-rules.js";
import { STOP_MAP } from "../s11b-r17b-plan.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ps = readFileSync(join(REPO, "recipes", "s11b-r17b.ps1"), "utf8");
const ts = readFileSync(join(REPO, "recipes", "s11b.ts"), "utf8");
const unit = (name: string): string => new RegExp(`\\$Blocks\\['${name}'\\] = \\{[\\s\\S]*?\\n\\}`).exec(ps)![0];
const SNAP_OK = '2026-10-27T05:00:00.000Z ROW R17B-NEWTAB-PLAIN snap ok T4 elements=31 counter="Click counter: 0" (120 ms)';
const SNAP_EMPTY = "2026-10-27T05:00:00.000Z ROW R17B-NEWTAB-PLAIN snap ok T4 elements=0 counter=none (120 ms)";
const row = (line: string, step: string) => parseCallRow(line, step);

describe("F1: R17B-NEWTAB-PLAIN's page clause is read from the snapshot ROW line", () => {
  it("passes on elements and a counter, fails on an empty page, NOT MEASURED without a row", () => {
    expect(judgeSnapshotPage(row(SNAP_OK, "snap")).pass).toBe(true);
    const e = judgeSnapshotPage(row(SNAP_EMPTY, "snap"));
    expect(e.pass).toBe(false);
    expect(e.notMeasured).toBeUndefined();
    expect(judgeSnapshotPage(null).notMeasured).toBe(true);
  });
  it("N3: either half missing fails (elements without a counter, a counter without elements)", () => {
    expect(judgeSnapshotPage(row(SNAP_OK.replace('counter="Click counter: 0"', "counter=none").replace("elements=31", "elements=12"), "snap")).pass).toBe(false);
    expect(judgeSnapshotPage(row(SNAP_OK.replace("elements=31", "elements=0"), "snap")).pass).toBe(false);
  });
  it("the block no longer looks for a title that S9 never prints", () => {
    const b = unit("r17b-newtab-plain");
    expect(b).not.toContain("Agent Bridge E2E Playground");
    expect(b).toContain("'r17b-clause', '--kind', 'snap-page'");
  });
});

describe("F2, N2 and M1: R17B-RD-2's row holds the answer clause and the snapshot clause, judged on r2's own tab row", () => {
  const kt = row(`ROW x snap ${K17["K-tab"].code} ${K17["K-tab"].message} (9 ms)`, "snap");
  const ok = row(SNAP_OK, "snap");
  const L = "R17B-RD-2";
  const state = (rows: Parameters<typeof rd2TabRowLine>[1], h: string | null = "T7") => parseTabRowLine([rd2TabRowLine(L, rows, h)], L);
  it("r2's own row hidden(blocked): the snapshot must be K-tab, else FAIL; not hidden: recorded with its class; unreadable: NOT MEASURED", () => {
    expect(judgeRd2Snapshot(state([{ handle: "T7", hidden: "blocked" }]), kt).pass).toBe(true);
    const f = judgeRd2Snapshot(state([{ handle: "T7", hidden: "blocked" }]), ok);
    expect(f.pass).toBe(false);
    expect(f.notMeasured).toBeUndefined();
    const r = judgeRd2Snapshot(state([{ handle: "T7" }]), ok);
    expect(r.pass).toBe(true);
    expect(r.why).toContain("ok");
    expect(judgeRd2Snapshot(state(null), kt)).toMatchObject({ pass: false, notMeasured: true });
    expect(judgeRd2Snapshot(state([{ handle: "T8", hidden: "blocked" }]), kt)).toMatchObject({ pass: false, notMeasured: true });
    expect(judgeRd2Snapshot(state([{ handle: "T7", hidden: "blocked" }], null), kt)).toMatchObject({ pass: false, notMeasured: true });
    expect(judgeRd2Snapshot(state([{ handle: "T7", hidden: "blocked" }]), null)).toMatchObject({ pass: false, notMeasured: true });
  });
  it("M1 (verifier 3's probe): r2 hidden, snapshot ok, another hidden tab gone during the window: not a PASS", () => {
    // before the window: r2 not yet open, two other hidden tabs; after: r2 hidden, one other hidden tab closed (a summary count stays at 2)
    const after = [{ handle: "T7", hidden: "blocked" as const }, { handle: "T2", hidden: "blocked" as const }, { handle: "T3" }];
    expect(judgeRd2Snapshot(state(after), ok).pass).toBe(false);
    // r2 not hidden while another tab joins the hidden set: recorded, not FAIL
    expect(judgeRd2Snapshot(state([{ handle: "T7" }, { handle: "T2", hidden: "blocked" }, { handle: "T3", hidden: "blocked" }]), ok).pass).toBe(true);
  });
  it("a row hidden as disarmed, or two rows under r2's handle, is NOT MEASURED, never PASS", () => {
    expect(judgeRd2Snapshot(state([{ handle: "T7", hidden: "disarmed" }]), kt)).toMatchObject({ pass: false, notMeasured: true });
    expect(judgeRd2Snapshot(state([{ handle: "T7" }, { handle: "T7", hidden: "blocked" }]), ok)).toMatchObject({ pass: false, notMeasured: true });
    expect(parseTabRowLine(["TABROW other-row rows=1 found=yes hidden=blocked"], L)).toBe("unreadable");
    expect(parseTabRowLine([], L)).toBe("unreadable");
  });
  it("the TABROW line holds labels and counts only: no handle, url or title", () => {
    const rows = [{ handle: "T7", hidden: "blocked" as const, url: "http://localhost:8085/x", title: "Secret" }, { handle: "T2", url: "http://127.0.0.1:8081/y", title: "Page" }];
    const line = rd2TabRowLine(L, rows, "T7");
    expect(line).toBe("TABROW R17B-RD-2 rows=2 found=yes hidden=blocked");
    expect(rd2TabRowLine(L, rows, "T2")).toBe("TABROW R17B-RD-2 rows=2 found=yes hidden=none");
    expect(rd2TabRowLine(L, null, "T7")).toBe("TABROW R17B-RD-2 read=failed");
    expect(rd2TabRowLine(L, rows, null)).toBe("TABROW R17B-RD-2 rows=2 handle=none");
    expect(parseTabRowLine([`2026-10-27T05:00:00.000Z ${line}`], L)).toBe("hidden");
  });
  it("N3: a K-tab code with a wrong message is not K-tab", () => {
    expect(judgeRd2Snapshot("hidden", row(`ROW x snap ${K17["K-tab"].code} some other message (9 ms)`, "snap")).pass).toBe(false);
  });
  it("the block reads r2's row by its handle over the SDK, no summary count; the clause list is the answer, the hits, the snapshot, RULES and the listener", () => {
    const b = unit("r17b-rd-2");
    expect(b).not.toContain("'--tabs-before-from'");
    expect(b).not.toContain("'--tabs-from'");
    expect(b).not.toContain("'tabs' 'tabs'");
    expect(b).toMatch(/Invoke-R17Node 's11b' @\('rd2-row', '--tab', 'r2'\)/);
    expect(b.indexOf("'open' 'newtab'")).toBeLessThan(b.indexOf("'rd2-row'"));
    expect(b.indexOf("'rd2-row'")).toBeLessThan(b.indexOf("'snap' 'snapshot'"));
    expect(b).toContain("'--tabrow-from'");
    expect(b).toMatch(/\$ans = \[int\]\(Call9 'R17B-RD-2' 'open' 'newtab'/);
    expect(b).toContain("'--kind', 'rd2-snap'");
    expect(b).toContain("$codes = @($ans, $(if ($h.Redirect -eq 1 -and $h.Blocked -eq 0) { 0 } else { 1 }), $snapC, $(if ($global:R17RulesOk)");
  });
  it("s11b.ts: rd2-row reads client.tabs() by r2's handle and an unknown key is unreadable, not a STOP; rd2-snap reads the TABROW file", () => {
    const f = ts.slice(ts.indexOf("async function rd2Row("), ts.indexOf("async function rd2Row(") + 900);
    expect(f).toContain("c.tabs()");
    expect(f).toContain("rd2TabRowLine(");
    expect(f).toMatch(/catch/);
    expect(ts).toContain('"rd2-row": rd2Row');
    expect(ts).toMatch(/judgeRd2Snapshot\(parseTabRowLine\(/);
    expect(ts).not.toContain('need(a, "tabs-before-from")');
  });
});

describe("F3 and F7: R17B-NEWTAB-REFUSED", () => {
  const b = unit("r17b-newtab-refused");
  it("keeps the listener's exit code and the answer code; the gate-refused branch is NOT MEASURED, not a pass", () => {
    expect(b).toContain("$wc = $(if ($w) { Read-R17bWatch } else { 3 })");
    expect(b).toContain("@('BAD_PARAMS', 'DOMAIN_BLOCKED')");
    expect(b).toMatch(/NOT MEASURED \(path not reached/);
    expect(b.indexOf("path not reached")).toBeLessThan(b.indexOf("ROW R17B-NEWTAB-REFUSED PASS"));
    expect(b).not.toContain("[void](Read-R17bWatch)");
  });
  it("N3: the HIST-style listener arm $wc -eq 3 is part of the not-reached branch", () => {
    expect(b).toContain("$wc -eq 3");
    expect(b).toMatch(/BAD_PARAMS', 'DOMAIN_BLOCKED'\)\) -or \$wc -eq 3 -or \$code -eq ''/);
  });
  it("N5: an accepted javascript: URL closes tab nr and the FAIL names that reason", () => {
    expect(b).toMatch(/if \(\$code -eq 'ok'\) \{ Close-R17Tab 'R17B-NEWTAB-REFUSED' 'nr' \}/);
    expect(b.indexOf("Close-R17Tab 'R17B-NEWTAB-REFUSED' 'nr'")).toBeLessThan(b.indexOf("ROW R17B-NEWTAB-REFUSED FAIL"));
    expect(b).toContain("the javascript: URL was accepted");
    expect(b).toContain("the tab-row count changed");
    expect(b).not.toContain("the tab-row count changed: a blank tab is left");
  });
  it("a leftover blank tab prints FAIL and the wave goes on (no STOP, no STOP-MAP entry)", () => {
    expect(b).toContain("ROW R17B-NEWTAB-REFUSED FAIL");
    expect(b).not.toMatch(/Stop9 'R17B-NEWTAB-REFUSED: the tab-row count/);
    expect(ps).not.toContain("STOP-MAP blank-left");
    expect(STOP_MAP.map((s) => s.id)).not.toContain("blank-left");
  });
});

describe("F4: R17B-0 copies its STOP lines to the record when it stops", () => {
  it("the finally block writes STOP, ROW, BUILD, S6 and MANIFEST lines through the record writer", () => {
    const b = unit("r17b-0");
    expect(b).toContain("$r17b0Done = $true");
    const fin = b.slice(b.indexOf("} finally {"));
    expect(fin).toContain("-not $r17b0Done");
    expect(fin).toContain("STOP: |ROW |BUILD |S6 commit=|MANIFEST ");
    expect(fin).toContain("Write-S9Raw $keep");
  });
});

describe("F5: R17B-ACT-CTL judges every call's reply time", () => {
  it("msForJudge is the largest of a pair for ACT-CTL and the last call for the other rows", () => {
    expect(msForJudge("R17B-ACT-CTL", [13000, 200])).toBe(13000);
    expect(msForJudge("R17B-ACT-CTL", [200])).toBe(200);
    expect(msForJudge("R17B-BACK", [13000, 200])).toBe(200);
    expect(msForJudge("R17B-FWD", [])).toBe(0);
  });
  it("N1: the runner's path (back x2 without --rules-after, then judge-history on the HISTREPLY ms) sees a slow first call", () => {
    const line = histReplyLine("R17B-ACT-CTL", "ok", [13000, 200], 200, 1000);
    const m = /HISTREPLY \S+ kind=(\S+) ms=(\d+) start=(\d+) reply=(\d+)/.exec(line)!;
    expect(m[2]).toBe("13000");
    expect([m[3], m[4]]).toEqual(["1000", "1200"]);
    const j = judgeR17bRow("R17B-ACT-CTL", { kind: m[1]!, ms: Number(m[2]), rulesAfter: 0 });
    expect(j.pass).toBe(false);
    expect(j.why).toContain("over 12000");
    const fast = /ms=(\d+)/.exec(histReplyLine("R17B-ACT-CTL", "ok", [100, 200], 200, 0))![1];
    expect(judgeR17bRow("R17B-ACT-CTL", { kind: "ok", ms: Number(fast), rulesAfter: 0 }).pass).toBe(true);
    expect(/ms=(\d+)/.exec(histReplyLine("R17B-BACK", "ok", [13000, 200], 200, 0))![1]).toBe("200");
    expect(ts).toContain("say(histReplyLine(row,");
  });
  it("historyCall collects every call's time and passes the judge's value", () => {
    expect(ts).toContain("allMs.push(last.ms)");
    expect(ts).toContain("ms: msForJudge(row, allMs)");
  });
});

describe("F6: the carried blocks and R17B-CTL print R17B ROW lines derived from the block's own verdicts", () => {
  const L = (v: string) => `2026-10-27T05:00:00.000Z s9-win: ROW R17-UP-OPT ${v}: why`;
  it("takes the worst verdict; RECORD counts as a pass; no verdict line is NOT MEASURED", () => {
    expect(carriedVerdict(["ROW RD-LOGS PASS: ok", "ROW RD-LOGS FAIL: x"])).toEqual({ verdict: "FAIL", n: 2 });
    expect(carriedVerdict(["ROW A PASS (by 3 clause checks)", "ROW B NOT MEASURED: z"]).verdict).toBe("NOT MEASURED");
    expect(carriedVerdict(["ROW A RECORD: r"]).verdict).toBe("PASS");
    expect(carriedVerdict([L("NOT RUN"), L("PASS")]).verdict).toBe("NOT RUN");
    expect(carriedVerdict(["ROW X step ok message (10 ms)", "CARRIED a as b"])).toEqual({ verdict: "NOT MEASURED", n: 0 });
    expect(carriedVerdict(["ROW A STOP: bad", "ROW B FAIL: bad"]).verdict).toBe("STOP");
  });
  it("the line carries the R17B id; R17B-UP-L1 says its console clause is judged by R17B-LOGS", () => {
    const l = carriedRowLine("R17B-RESTORE", "rd-restore", ["ROW RD-RESTORE PASS: equal"]);
    expect(l.startsWith("ROW R17B-RESTORE PASS")).toBe(true);
    expect(l).not.toMatch(/ROW R17-/);
    expect(carriedRowLine("R17B-UP-L1", "r17-up-l1", ["ROW R17-UP-L1 PASS: ok"])).toContain("judged by R17B-LOGS");
    expect(carriedRowLine("R17B-LOGS", "rd-logs", ["ROW RD-LOGS PASS: ok"])).not.toContain("judged by R17B-LOGS");
  });
  it("the runner prints it after every carried block and for R17B-CTL's RD-CTL part, without editing Run 17's file", () => {
    const c = /function Invoke-R17bCarried[\s\S]*?\n\}/.exec(ps)![0];
    expect(c).toContain("& $R17Blocks[$Orig]");
    expect(c.indexOf("Write-R17bCarriedRow $Row $Orig $n0")).toBeGreaterThan(c.indexOf("& $R17Blocks[$Orig]"));
    expect(ps).toContain("'carried-row', '--row', $Row, '--orig', $Orig");
    expect(unit("r17b-ctl")).toContain("Write-R17bCarriedRow 'R17B-CTL' 'rd-ctl' $n0");
    expect(ts).toContain('"carried-row": carriedRow');
  });
});

describe("F11: parse check and the manifest message", () => {
  it("(a) Run 17's file must parse clean and give exactly the 49 functions and 49 blocks", () => {
    expect(ps).toContain("$er.Count -ne 0 -or $R17Funcs -ne 49 -or $R17Blocks.Count -ne 49");
  });
  it("(d) the manifest read's STOP does not say the console cannot evaluate", () => {
    expect(ps).not.toContain("the console cannot evaluate or printed a STOP");
    expect(ps).toContain("R17B-0 (a): the manifest read did not return 0");
  });
  it("(f) the listener reads in NEWTAB-LOAD and NEWTAB-REFUSED keep their exit code and a 2 is a STOP", () => {
    expect(unit("r17b-newtab-load")).toMatch(/\$wc -eq 2\) \{ Stop9/);
    expect(unit("r17b-newtab-load")).not.toContain("[void](Read-R17bWatch");
    expect(unit("r17b-newtab-refused")).toMatch(/\$wc -eq 2\) \{ Stop9/);
  });
});

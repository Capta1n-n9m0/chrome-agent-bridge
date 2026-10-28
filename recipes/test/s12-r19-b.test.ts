// Step 12 S7-drivers-B: liveB19's row drivers against section 4.27 part B. The pure decisions (recipes/s12-r19-b.ts) are unit-tested; the PowerShell side
// (recipes/s12-r19-b.ps1, the MINOR-A fix in s12-r19-a.ps1 and N-2/N-5 in s12-r19-lib.ps1) runs with every helper stubbed (nothing touches Chrome, a daemon or a port)
// and, as named mutants, must turn its own check red. Each mutated file is parse-checked before it runs.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import * as B from "../s12-r19-b.js";
import { proofExit, STOP_REASONS } from "../s12-r19.js";
import { overlapExact } from "../s12-forms-b.js";
import { K } from "../s11-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const DOC = rd("docs/e2e-test-plan.md");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"), DOC.indexOf("## 5. Results template"));
const PSB = rd("recipes/s12-r19-b.ps1");
const PSA = rd("recipes/s12-r19-a.ps1");
const ENTRY = rd("recipes/s12-r19.ps1");
const TS = rd("recipes/s12-r19-b.ts");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const keys = (s: string): string[] => [...s.matchAll(/([a-z][a-z-]*)=/g)].map((m) => m[1]!);
const KDEVT = { code: K["K-devt"].code, message: K["K-devt"].message };

describe("the pure decisions", () => {
  it("KEEP-1: a wrong answer is the STOP existing-tool-changed; a banner gap fails; continuous with five answers passes", () => {
    expect(B.keep1Decision([true, true, true, true, true], "continuous")).toBe("PASS");
    expect(B.keep1Decision([true, false, true, true, true], "continuous")).toBe("STOP");
    expect(B.keep1Decision([true, true, true, true, true], "gaps:1")).toBe("FAIL");
  });
  it("KEEP-2: idle median minus ctl median >= 3 500; a ctl spread over 3 000 or a ctl that did not refuse BAD_PARAMS is NOT MEASURED; a banner that never ends fails", () => {
    const ok = ["BAD_PARAMS", "BAD_PARAMS", "BAD_PARAMS"];
    expect(B.judgeKeep2([5800, 5900, 6000], [300, 400, 500], ok)).toMatchObject({ v: "PASS", measured: true, idle: 5900, ctl: 400 });
    expect(B.judgeKeep2([5800, 5900, 6000], [2400, 2500, 2600], ok).v).toBe("FAIL"); // a per-call build: idle - ctl is 3 400
    expect(B.judgeKeep2([500, 600, 700], [500, 600, 700], ok).v).toBe("FAIL");
    expect(B.judgeKeep2([5800, 5900, 6000], [300, 400, 3400], ok)).toMatchObject({ v: "NOT MEASURED", measured: false });
    expect(B.judgeKeep2([5800, 5900, 6000], [300, 400, 500], ["BAD_PARAMS", "ok", "BAD_PARAMS"]).v).toBe("NOT MEASURED");
    expect(B.judgeKeep2([5800, null, 6000], [300, 400, 500], ok).v).toBe("FAIL");
    expect(B.judgeKeep2([5800, 5900, 25_001], [300, 400, 500], ok).v).toBe("FAIL");
    expect(B.median([3, 1, 2])).toBe(2);
    expect(B.median([1, 2, 3, 4])).toBe(2.5);
  });
  it("KEEP-3: the next call is the refusal exactly, else the STOP kept-session-used (ok included); the end clause needs KEEP-2's medians", () => {
    expect(B.judgeKeep3Next("disarm", { code: "DISARMED", message: B.KEEP3_WANT.disarm!.message!, data: { scope: "all" } })).toBe("PASS");
    expect(B.judgeKeep3Next("disarm", undefined)).toBe("STOP");
    expect(B.judgeKeep3Next("block", { code: "DOMAIN_BLOCKED", message: "other" })).toBe("STOP");
    expect(B.judgeKeep3Next("nav-own", { code: "DOMAIN_BLOCKED", message: B.KEEP3_WANT["nav-own"]!.message! })).toBe("PASS");
    expect(B.judgeKeep3Next("close", { code: "TAB_GONE", message: "any text" })).toBe("PASS");
    expect(B.judgeKeep3Next("close", { code: "TIMEOUT", message: "" })).toBe("STOP");
    const med = { idle: 5900, ctl: 400 };
    expect(B.judgeKeep3End(1200, med)).toBe("PASS");
    expect(B.judgeKeep3End(5900, med)).toBe("FAIL"); // a build that keeps the session across the event ends at the idle bound
    expect(B.judgeKeep3End(null, med)).toBe("FAIL");
    expect(B.judgeKeep3End(1200, null)).toBe("NOT MEASURED");
  });
  it("KEEP-4, OVERLAP, SWEEP-HELD: K-devt exactly, the second call never shares the session, DevTools stays open after the reload", () => {
    expect(B.judgeKeep4(KDEVT, { n: 11 })).toEqual({ devtools: "PASS", closed: "PASS" });
    expect(B.judgeKeep4({ code: KDEVT.code, message: "x" }, { n: 11 }).devtools).toBe("FAIL");
    expect(B.judgeKeep4(KDEVT, { n: 3 }).closed).toBe("FAIL");
    expect(B.judgeKeep4(KDEVT, { e: KDEVT }).closed).toBe("FAIL");
    expect(overlapExact(KDEVT)).toBe(true);
    expect(B.judgeOverlap(undefined, KDEVT, 1)).toBe("PASS");
    expect(B.judgeOverlap(undefined, undefined, 1)).toBe("FAIL"); // a build that lets the second share the session answers ok
    expect(B.judgeOverlap({ code: "TIMEOUT", message: "" }, KDEVT, undefined)).toBe("FAIL");
    expect(B.judgeOverlap(undefined, KDEVT, 2)).toBe("FAIL"); // the first answers as without the second: its own value, 1
    const sw = { afterReload: KDEVT.code, devtoolsOpen: true, reclaimed: true, after: "ok" };
    expect(B.judgeSweep(sw)).toBe("PASS");
    expect(B.judgeSweep({ ...sw, devtoolsOpen: false })).toBe("FAIL"); // a sweep that took the tab from DevTools
    expect(B.judgeSweep({ ...sw, afterReload: "ok" })).toBe("FAIL");
    expect(B.judgeSweep({ ...sw, reclaimed: false })).toBe("FAIL");
    expect(B.judgeSweep({ ...sw, after: KDEVT.code })).toBe("FAIL");
  });
  it("CONKEPT: a second read with fewer entries is the STOP; two equal ordered 11-entry reads pass", () => {
    const es = (n: number): Array<{ level: string; kind: "console"; text: string; ts: number }> => Array.from({ length: n }, (_, i) => ({ level: "info", kind: "console", text: `m${i}`, ts: i + 1 }));
    expect(B.judgeConKept(es(11), es(11))).toBe("PASS");
    expect(B.judgeConKept(es(11), es(10))).toBe("STOP");
    expect(B.judgeConKept(es(10), es(10))).toBe("FAIL");
  });
  it("DEVT-NOFLAG's words: K-devt, ok (the probe only), not-run; a code the sheet has no word for is `other`", () => {
    expect(B.devnoflagLine(KDEVT.code, KDEVT.code)).toBe("DEVNOFLAG probe=K-devt kept-then-devtools=K-devt");
    expect(B.devnoflagLine("ok", "ok")).toBe("DEVNOFLAG probe=ok kept-then-devtools=other");
    expect(B.devnoflagLine("not-run", "")).toBe("DEVNOFLAG probe=not-run kept-then-devtools=not-run");
    expect(B.devnoflagLine("ERROR", KDEVT.code)).toBe("DEVNOFLAG probe=other kept-then-devtools=K-devt");
  });
  it("verdictOf maps a judged clause to the sheet's word", () => {
    expect(B.verdictOf({ pass: true })).toBe("PASS");
    expect(B.verdictOf({ pass: false, notMeasured: true })).toBe("NOT MEASURED");
    expect(B.verdictOf({ pass: false })).toBe("FAIL");
  });
});

describe("the sheet's words, quoted", () => {
  it("DEVNOFLAG's keys, the NOT MEASURED text, KEEP-1's note and the KEEP-3 refusals are the sheet's", () => {
    const t = /`(DEVNOFLAG [^`]*)`/.exec(SEC)![1]!;
    expect(keys(B.devnoflagLine("ok", "ok"))).toEqual(keys(t));
    expect(SEC).toContain(`NOT MEASURED \u2014 ${B.DEVT_NOT_ATTACHED}`);
    expect(SEC).toContain("`ROW R19-KEEP-1 PASS banner-clause=NOT DISCRIMINATING`");
    expect(PSB).toContain("banner-clause=NOT DISCRIMINATING");
    for (const k of ["disarm", "block", "nav-blocked", "nav-own", "nav-file"]) expect(SEC, k).toContain(`leg=${k}`);
    expect(SEC).toContain("`leg=close … next=TAB_GONE`");
    expect(SEC).toContain("**Median(idle `end-ms`) − median(ctl `end-ms`) ≥ 3 500 ms**");
    expect(SEC).toContain("within **2 000 ms of KEEP-2's ctl median** and **at least 2 500 ms below KEEP-2's idle median**");
  });
  it("every actor command a driver runs exists, and the STOP reasons it names are the sheet's", () => {
    const ran = new Set([...(PSB + ENTRY).matchAll(/'(devprobe|up-6|raw|keep-[1-4]|con-kept|overlap-a|up-devt|sweep-held|devnoflag|upopt-judge)'/g)].map((m) => m[1]!));
    expect(ran.size).toBe(13);
    for (const c of ran) expect(Object.keys(B.cmds), c).toContain(c);
    for (const m of [...PSB.matchAll(/Stop-R19 '([a-z-]+)'/g), ...TS.matchAll(/new StopWhy\("([a-z-]+)"/g)]) expect(STOP_REASONS as readonly string[], m[1]).toContain(m[1]);
    expect(PSB.match(/\bStop9\b|\bFail-S16\b/g) ?? []).toEqual([]);
    expect((PSB.match(/(?<![-'\w])throw(?![-\w])[^\n]*/g) ?? []).map((t) => t.replace(/\s*\}\s*$/, ""))).toEqual(["throw $r19err", "throw 'row R19-UP-OPT printed a STOP'"]);
  });
  it("the carried rows' actors judge the same pass rule as Run 18: K17's refusal, a wave-made folder name, no banner inside the actor", () => {
    expect(TS).toContain("k17RawDir(0)");
    expect(TS).toContain("banner: false, violations: w.violations");
    expect(TS).toContain("await idle(idleRow);");
    expect(PSB).toContain("-Banner carried");
    expect(PSB).not.toContain("-Banner refused");
  });
});

describe("the other fixes: N-3 and the banner record kind", () => {
  it("N-3: a re-run asks only for args=answered; the first proof still demands every count; stale stays a STOP", () => {
    const c = { entries: 0, console: 0, exception: 0 };
    expect(proofExit("answered", "answered", c, true)).toBe(0);
    expect(proofExit("ERROR", "answered", c, true)).toBe(0);
    expect(proofExit("answered", "other", c, true)).toBe(1);
    expect(proofExit("answered", "answered", c)).toBe(1);
    expect(proofExit("answered", "VERSION", c, true)).toBe(2);
    expect(proofExit("UNKNOWN_METHOD", "answered", c, true)).toBe(2);
  });
  it("a leg that sent no call records a positive banner, never a STOP", async () => {
    const A = await import("../s12-r19-a.js");
    expect(A.judgeBannerNoCall("seen", 25_000, "pass")).toBe("RECORD");
    expect(A.judgeBannerNoCall("none", 25_000, "pass")).toBe("PASS");
    expect(A.judgeBannerNoCall("none", 25_000, "absent")).toBe("NOT MEASURED"); // the legs without a call obey IDLE and the control too
    expect(A.judgeBannerNoCall("seen", 5_000, "pass")).toBe("NOT MEASURED");
    const out: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
    try {
      const code = await A.main(["banner", "--row", "R19-UP-6", "--kind", "record", "--ctl", "pass", "--stop", "attach-on-refused-page", "--leg", "missing=50,seen,25000"]);
      expect(code).toBe(0);
    } finally { spy.mockRestore(); }
    expect(out).toContain("LEG R19-UP-6 banner RECORD");
    expect(out.join("\n")).not.toContain("STOPWHY");
  });
});

// ---- the PowerShell side, every helper stubbed ----------------------------------------------------------------------------------------------------
const STUBS = `
$global:R19Slice = 'liveB19'; $global:S16Stops = 0; $global:S16Changed = $false; $global:W = 7; $global:R19Pending = [ordered]@{}; $global:R19Changed = $false
$global:Calls = New-Object System.Collections.ArrayList; $global:Out = @(); $global:Armed = $true; $global:Title = $null; $global:NodeOut = @(); $global:RowThrows = $false; $global:CloseOk = $true
$global:Root = 'C:\\wave\\root'; $S9OptionsUrl = 'chrome-extension://abc/options.html'; $S9TitleArmed = 'Chrome Agent Bridge - armed'; $S9TitleOff = 'Chrome Agent Bridge - OFF'
function Say9([string]$m) { Write-Host $m }
function Show-S16([string[]]$l) { foreach ($t in $l) { Write-Host "OUT:$t" } }
function Save-S16 { }
function Stop-R19([string]$Reason, [string]$Why) { [void]$global:Calls.Add("STOP:$Reason"); throw "stop $Reason" }
function C([string]$m) { [void]$global:Calls.Add($m) }
function Set-S11Front { $true }
function Get-S12NowMs { 1000 }
function Get-R19PressMs { 1 }
function New-S16Window([string]$u) { C 'WINDOW'; 55 }
function Set-S9Foreground { $true }
function Test-S11Own { $true }
function Close-S11Window { C 'CLOSEX' }
function Close-S12DevTools { C 'CLOSEDT'; $global:CloseOk }
function Open-S12DevToolsMenu { C 'OPENDT'; $true }
function Invoke-S12DevProbe { C 'PROBEWIN'; $true }
function Invoke-R19Stamped([scriptblock]$b) { & $b }
function Save-R19Seg([string]$b) { C "SAVE:$b" }
function Open-R19Seg { C 'OPEN' }
function Invoke-R19Rerun { C 'RERUN'; $global:RerunOk }
$global:RerunOk = $true
$R17Blocks = @{ reload = { C 'RELOAD' } }
function Invoke-R19Row([string]$Id, [string[]]$Cmd, [object[]]$StepList = @(), [scriptblock]$Restore = $null, [string]$Banner = '', [string]$Why = '', [string]$Actor = 's12-r19-a', [int]$BudgetS = 300) {
  C "ROW:\${Id}:$($Cmd[0]):\${Actor}:steps=$($StepList.Count):restore=$([bool]$Restore)"; $global:R17Out = @($global:NodeOut)
  $global:R19Changed = $true
  try { if ($global:RowThrows) { throw 'the actor died' } } finally { if ($Restore -and $global:R19Changed) { & $Restore } }
}
function Invoke-R19Node { C "NODE:$($args[0]):$(@($args[1])[0])"; $global:R17Out = @($global:NodeOut); 0 }
function Switch-R19Toolbar { }
function Set-R19BlockAdd { }
function Restore-R19Block { }
function Set-S9Omnibox { }
function Set-S11bOmnibox { }
`;
const SCEN_B = `
$global:R19Devt = 'no'; Invoke-R19DevRow 'R19-UP-DEVT' 'http://127.0.0.1:8081/x' 'up-devt' @()
Write-Host "B1 not-attached=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:R19Devt = 'yes'
Invoke-R19DevRow 'R19-KEEP-4' 'http://127.0.0.1:8081/x' 'keep-4' (New-R19DevSteps 'R19-KEEP-4')
Write-Host "B2 attached=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:RowThrows = $true
try { Invoke-R19DevRow 'R19-KEEP-4' 'http://127.0.0.1:8081/x' 'keep-4' (New-R19DevSteps 'R19-KEEP-4') } catch { }
Write-Host "B3 died=$(@($global:Calls | Where-Object { $_ -eq 'CLOSEDT' }).Count),$(@($global:Calls | Where-Object { $_ -eq 'CLOSEX' }).Count)"
$global:Calls.Clear(); $global:RowThrows = $false; $global:CloseOk = $false
try { Invoke-R19DevRow 'R19-KEEP-4' 'http://127.0.0.1:8081/x' 'keep-4' (New-R19DevSteps 'R19-KEEP-4') } catch { }
Write-Host "B4 left-open=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:CloseOk = $true
# the DEVPROBE: attached comes from the answer code's line alone
$global:Calls.Clear(); $global:NodeOut = @('DEVPROBE method=uia-menu answer=ok ms=15000 attached=no')
Invoke-R19DevProbe
Write-Host "B5 probe-no=$($global:R19Devt),$($global:R19ProbeAns)"
$global:NodeOut = @('DEVPROBE method=uia-menu answer=DEBUGGER_DEVTOOLS ms=900 attached=yes'); Invoke-R19DevProbe
Write-Host "B6 probe-yes=$($global:R19Devt),$($global:R19ProbeAns)"
# SWEEP-HELD's reload: the capture saved before, reopened after, the re-run after both; a stale build after it is a STOP
$global:Calls.Clear(); Invoke-R19SweepReload
Write-Host "B7 reload=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:RerunOk = $false
try { Invoke-R19SweepReload } catch { }
Write-Host "B8 stale=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:RerunOk = $true
# KEEP-4's devtools leg answer is read from its own line, not the closed leg's
$global:NodeOut = @('KEEPDT R19-KEEP-4 leg=closed next=ok', 'KEEPDT R19-KEEP-4 leg=devtools next=DEBUGGER_DEVTOOLS'); $global:R19KeptAns = 'not-run'
$global:Calls.Clear(); Invoke-R19Keep4
Write-Host "B9 kept=$($global:R19KeptAns)"
# KEEP-2's medians feed KEEP-3 only when the clause was measured
$global:NodeOut = @('CHECK R19-KEEP-2 medians idle=5900 ctl=400 measured=yes'); Invoke-R19Keep2
Write-Host "B10 k2=$($global:R19K2.idle),$($global:R19K2.ctl)"
$global:NodeOut = @('CHECK R19-KEEP-2 medians idle=5900 ctl=2500 measured=no'); Invoke-R19Keep2
Write-Host "B11 k2-unmeasured=$([bool]$global:R19K2)"
# KEEP-3's steps: every state change has its undo, in order; nav-file only with the toggle on
$r19s = @(New-R19Keep3Steps $false)[0]
Write-Host "B12 steps=$(($r19s | ForEach-Object { "$($_.k):$($_.id)" }) -join ' ')"
Write-Host "B13 nofile=$(@($r19s | Where-Object { $_.id -like '*nav-file*' }).Count) withfile=$(@(@(New-R19Keep3Steps $true)[0] | Where-Object { $_.id -like '*nav-file*' }).Count)"
$global:Calls.Clear(); $global:R19Devt = 'yes'
# the UP-OPT gate's neighbour rows: UP-6 and F-RAW each run through one Invoke-R19Row with their sampler steps
Invoke-R19Up6; Invoke-R19FRaw 'R19-F-RAW'; Invoke-R19Keep1
Write-Host "B14 rows=$(($global:Calls | Where-Object { $_ -like 'ROW:*' }) -join ' ')"
`;
function runPs(extra: string, psb: string, scen = SCEN_B, psa = ""): string[] {
  const d = mkdtempSync(join(tmpdir(), "s12r19b-"));
  const fb = join(d, "b.ps1");
  writeFileSync(fb, psb, "utf8");
  const f = join(d, "t.ps1");
  writeFileSync(f, `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n$Record = '${d.replace(/'/g, "''")}\\r.txt'\n${STUBS}\n${extra}\n. '${fb.replace(/'/g, "''")}'\n${psa}\n${scen}`, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" });
  if (process.env.R19DBG) console.log(r.stdout, r.stderr);
  return r.stdout.split(/\r?\n/);
}
function parses(text: string): void {
  const d = mkdtempSync(join(tmpdir(), "s12r19bm-"));
  const f = join(d, "m.ps1");
  writeFileSync(f, text, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", `$e = $null; $t = $null; [void][Management.Automation.Language.Parser]::ParseFile('${f.replace(/'/g, "''")}', [ref]$t, [ref]$e); $e.Count`], { encoding: "utf8" });
  expect(r.stdout.trim(), "the mutant parses").toBe("0");
}
function mutate(src: string, from: string, to: string): string {
  expect(src.includes(from), `the mutated text exists: ${from.slice(0, 40)}`).toBe(true);
  const m = src.replace(from, () => to);
  parses(m);
  return m;
}
const has = (o: string[], l: string): boolean => o.includes(l);

describe.skipIf(!hasPs)("liveB19's drivers, with stubbed helpers", () => {
  const real = hasPs ? runPs("", PSB) : [];
  it("a DevTools row that was not attached prints NOT MEASURED and touches nothing", () => {
    expect(has(real, "OUT:ROW R19-UP-DEVT NOT MEASURED \u2014 DevTools was not attached") || has(real, "ROW R19-UP-DEVT NOT MEASURED \u2014 DevTools was not attached")).toBe(true);
    expect(has(real, "B1 not-attached=")).toBe(true);
  });
  it("an attached DevTools row opens window X, runs through Invoke-R19Row with a restore, then closes DevTools and X", () => {
    expect(has(real, "B2 attached=WINDOW,ROW:R19-KEEP-4:keep-4:s12-r19-b:steps=2:restore=True,CLOSEDT,CLOSEDT,CLOSEX")).toBe(true);
  });
  it("a row whose actor died still closes DevTools and X; a DevTools left open is the STOP devtools-left-open", () => {
    expect(has(real, "B3 died=2,1")).toBe(true);
    expect(has(real, "B4 left-open=STOP:devtools-left-open")).toBe(true);
  });
  it("`attached` comes from the DEVPROBE line's answer code alone", () => {
    expect(has(real, "B5 probe-no=no,ok")).toBe(true);
    expect(has(real, "B6 probe-yes=yes,DEBUGGER_DEVTOOLS")).toBe(true);
  });
  it("SWEEP-HELD saves the capture before the reload, reopens it after, then re-runs R19-0; a stale build is a STOP", () => {
    expect(has(real, "B7 reload=SAVE:reload,RELOAD,OPEN,RERUN")).toBe(true);
    expect(has(real, "B8 stale=STOP:old-build-left-loaded")).toBe(true);
  });
  it("KEEP-4's devtools answer is read from its own line; KEEP-3 judges against KEEP-2's medians only when they were measured", () => {
    expect(has(real, "B9 kept=DEBUGGER_DEVTOOLS")).toBe(true);
    expect(has(real, "B10 k2=5900,400")).toBe(true);
    expect(has(real, "B11 k2-unmeasured=False")).toBe(true);
  });
  it("KEEP-3's steps pair every state change with its undo, in order, and add nav-file only with the toggle", () => {
    expect(has(real, "B12 steps=t:R19-KEEP-3-disarm undo:R19-KEEP-3-disarm t:R19-KEEP-3-block undo:R19-KEEP-3-block do:R19-KEEP-3-nav-blocked-open t:R19-KEEP-3-nav-blocked undo:R19-KEEP-3-nav-blocked do:R19-KEEP-3-nav-own-open t:R19-KEEP-3-nav-own undo:R19-KEEP-3-nav-own t:R19-KEEP-3-close undo:R19-KEEP-3-close")).toBe(true);
    expect(has(real, "B13 nofile=0 withfile=3")).toBe(true);
    expect(real.some((l) => /^B14 rows=ROW:R19-UP-6:up-6:s12-r19-b:steps=5:restore=False ROW:R19-F-RAW:raw:s12-r19-b:steps=1:restore=False ROW:R19-KEEP-1:keep-1:s12-r19-b:steps=1:restore=False$/.test(l))).toBe(true);
  });
  const MUT: Array<[string, string, string, string]> = [
    ["a STOP is printed without Stop-R19", "Stop-R19 'devtools-left-open' \"$Id`: DevTools was left open\"", "Say9 'STOP devtools-left-open'", "B4 left-open=STOP:devtools-left-open"],
    ["the DevTools row has no restore", "-Restore { Close-R19DevTools } -Actor", "-Actor", "B2 attached=WINDOW,ROW:R19-KEEP-4:keep-4:s12-r19-b:steps=2:restore=True,CLOSEDT,CLOSEDT,CLOSEX"],
    ["the finally does not close DevTools or X", "finally { Close-R19DevTools; Close-R19Xk }", "finally { }", "B3 died=2,1"],
    ["attached is taken from the opener's success", "if ($r19m.Success) { $global:R19ProbeAns = $r19m.Groups[1].Value; $global:R19Devt = $r19m.Groups[2].Value }", "if ($r19m.Success) { $global:R19ProbeAns = $r19m.Groups[1].Value; $global:R19Devt = 'yes' }", "B5 probe-no=no,ok"],
    ["a DevTools row runs without the probe", "if ($global:R19Devt -ne 'yes') {", "if ($false) {", "B1 not-attached="],
    ["SWEEP-HELD does not save the capture before the reload", "  Save-R19Seg 'reload'\n", "", "B7 reload=SAVE:reload,RELOAD,OPEN,RERUN"],
    ["SWEEP-HELD does not reopen the capture after the reload", "  Open-R19Seg\n", "", "B7 reload=SAVE:reload,RELOAD,OPEN,RERUN"],
    ["SWEEP-HELD reopens the capture before the reload", "  Invoke-R19Stamped $R17Blocks['reload']\n  Open-R19Seg\n", "  Open-R19Seg\n  Invoke-R19Stamped $R17Blocks['reload']\n", "B7 reload=SAVE:reload,RELOAD,OPEN,RERUN"],
    ["a stale build after SWEEP-HELD is not a STOP", "Stop-R19 'old-build-left-loaded' 'R19-SWEEP-HELD", "Say9 'R19-SWEEP-HELD", "B8 stale=STOP:old-build-left-loaded"],
    ["the kept-then-devtools answer is read from the closed leg", "leg=devtools next=(\\S+)", "leg=closed next=(\\S+)", "B9 kept=DEBUGGER_DEVTOOLS"],
    ["KEEP-3's block edit has no undo", "$r19l += @{ k = 'undo'; id = \"$r19R-block\"; f = { Restore-R19Block } }\n", "", "B12 steps=t:R19-KEEP-3-disarm undo:R19-KEEP-3-disarm t:R19-KEEP-3-block undo:R19-KEEP-3-block do:R19-KEEP-3-nav-blocked-open t:R19-KEEP-3-nav-blocked undo:R19-KEEP-3-nav-blocked do:R19-KEEP-3-nav-own-open t:R19-KEEP-3-nav-own undo:R19-KEEP-3-nav-own t:R19-KEEP-3-close undo:R19-KEEP-3-close"],
    ["KEEP-3's disarm has no undo", "$r19l += @{ k = 'undo'; id = \"$r19R-disarm\"; f = { Switch-R19Toolbar $true } }\n", "", "B12 steps=t:R19-KEEP-3-disarm undo:R19-KEEP-3-disarm t:R19-KEEP-3-block undo:R19-KEEP-3-block do:R19-KEEP-3-nav-blocked-open t:R19-KEEP-3-nav-blocked undo:R19-KEEP-3-nav-blocked do:R19-KEEP-3-nav-own-open t:R19-KEEP-3-nav-own undo:R19-KEEP-3-nav-own t:R19-KEEP-3-close undo:R19-KEEP-3-close"],
    ["KEEP-3 judges against medians that were not measured", "measured=yes'", "measured=(?:yes|no)'", "B11 k2-unmeasured=False"],
    ["UP-6 runs without its five sampler windows", "$r19ids = 'outside', 'missing', 'relative', 'raw-dotdot', 'raw-notarget'", "$r19ids = 'outside'", "B14 rows=ROW:R19-UP-6:up-6:s12-r19-b:steps=5:restore=False ROW:R19-F-RAW:raw:s12-r19-b:steps=1:restore=False ROW:R19-KEEP-1:keep-1:s12-r19-b:steps=1:restore=False"],
  ];
  for (const [what, from, to, check] of MUT) {
    it(`mutant "${what}" turns "${check.slice(0, 40)}" red`, () => { expect(has(runPs("", mutate(PSB, from, to)), check)).toBe(false); });
  }
});

// ---- MINOR-A, N-2 and N-5, and the restore of the bc tab, each against the real file ---------------------------------------------------------------
const SCEN_TB = `
function Get-S9ActionTitle { $global:Title }
function Invoke-S9ActionButton { C 'PRESS'; $global:Title = if ($global:Title -eq $S9TitleArmed) { $S9TitleOff } else { $S9TitleArmed } }
function Start-Sleep { }
$global:Title = $null; try { Switch-R19Toolbar $false } catch { }
Write-Host "T1 null-disarm=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:Title = 'something else'; try { Switch-R19Toolbar $true } catch { }
Write-Host "T2 garbage-arm=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:Title = $S9TitleOff; Switch-R19Toolbar $false
Write-Host "T3 already-off=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:Title = $S9TitleArmed; Switch-R19Toolbar $false
Write-Host "T4 disarm=$(($global:Calls) -join ',') title=$($global:Title -eq $S9TitleOff)"
function Invoke-S9ActionButton { C 'PRESS' }
$global:Calls.Clear(); $global:Title = $S9TitleArmed; try { Switch-R19Toolbar $false } catch { }
Write-Host "T5 stuck=$(($global:Calls) -join ',')"
`;
describe.skipIf(!hasPs)("MINOR-A: the toolbar's disarm direction accepts only the exact disarmed title", () => {
  const run = (psa: string): string[] => runPs("", "", SCEN_TB, psa);
  const real = hasPs ? run(PSA.replace(/^\. .*$/m, "")) : [];
  it("a null or unreadable title is a helper failure (a STOP through Stop-R19), never `already disarmed`; the exact titles switch", () => {
    expect(has(real, "T1 null-disarm=STOP:throw-after-state")).toBe(true);
    expect(has(real, "T2 garbage-arm=STOP:not-restored")).toBe(true);
    expect(has(real, "T3 already-off=")).toBe(true);
    expect(has(real, "T4 disarm=PRESS title=True")).toBe(true);
  });
  it("mutant: the old disarm check (anything that is not armed) turns T1 red", () => {
    const m = mutate(PSA, "if ($r19t -ne $S9TitleArmed -and $r19t -ne $S9TitleOff) { Stop-R19 $r19why", "if ($false) { Stop-R19 $r19why");
    expect(has(run(m), "T1 null-disarm=STOP:throw-after-state")).toBe(false);
  });
  it("a stuck button (the press changes nothing) is a STOP, and mutant: no read-back after the press turns T5 red", () => {
    expect(has(real, "T5 stuck=PRESS,STOP:throw-after-state")).toBe(true);
    const m = mutate(PSA, "if ((Get-R19Title) -ne $(if ($WantArmed) { $S9TitleArmed } else { $S9TitleOff })) { Stop-R19 $r19why 'the toolbar button did not change the armed state' }", "");
    expect(has(run(m), "T5 stuck=PRESS,STOP:throw-after-state")).toBe(false);
  });
});

const SCEN_LIB = `
function Get-R19Head { [pscustomobject]@{ Head = 'abcdef123456'; Clean = $true } }
function Set-S12AttachStamp { }
function Fail-S16 { throw 'fail' }
function Invoke-R19Node { if ($global:Mode -eq 'crash') { return 1 }; if ($global:Mode -eq 'stale') { Show-S16 @('LOADED stale'); return 2 }; Show-S16 @('LOADED ok'); 0 }
function Write-R19RowLine { C "ROWLINE:$($args -join ' ')" }
function Stop-R19([string]$Reason, [string]$Why) { C "STOP:$Reason"; throw "stop $Reason" }
$global:Mode = 'crash'; try { Invoke-R19Zero { } } catch { }
Write-Host "Z1 crash=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:Calls.Clear(); $global:Mode = 'stale'; try { Invoke-R19Zero { } } catch { }
Write-Host "Z2 stale=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:Calls.Clear(); $global:Mode = 'ok'
try { Invoke-R19Zero { throw 'r17b-0 stopped before its MANIFEST' } } catch { }
Write-Host "Z3 stop-in-zero=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:Calls.Clear(); $global:CloseBc = 0
function Close-R19Bc { C 'CLOSEBC' }
function Test-S11Own { $false }
$R17Blocks = @{ 'rd-restore' = { C 'RDRESTORE' } }
function Invoke-R19RowBlock([string]$Id, [scriptblock]$Ops) { & $Ops }
$global:R19Slice = 'liveB19'; Invoke-R19Restore
Write-Host "Z4 restore-b=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $global:R19Slice = 'liveC19'; Invoke-R19Restore
Write-Host "Z5 restore-c=$(($global:Calls) -join ',')"
`;
describe.skipIf(!hasPs)("N-2 and N-5 (R19-0), and R19-RESTORE's bc tab in liveB19", () => {
  const LIB = rd("recipes/s12-r19-lib.ps1");
  const run = (lib: string): string[] => {
    const d = mkdtempSync(join(tmpdir(), "s12r19bl-"));
    const fl = join(d, "lib.ps1");
    writeFileSync(fl, lib, "utf8");
    const f = join(d, "t.ps1");
    writeFileSync(f, `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n$Record = '${d.replace(/'/g, "''")}\\r.txt'; $Steps = 's'; $Framing = $Record\n${STUBS}\n. '${fl.replace(/'/g, "''")}'\n${SCEN_LIB}`, "utf8");
    return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" }).stdout.split(/\r?\n/);
  };
  const real = hasPs ? run(LIB) : [];
  it("N-2: a crashed proof is throw-after-state, not a stale build; a stale proof still is old-build-left-loaded (N-2 binds R19-0, which liveB19 runs)", () => {
    expect(has(real, "Z1 crash=STOP:throw-after-state")).toBe(true);
    expect(has(real, "Z2 stale=STOP:old-build-left-loaded")).toBe(true);
  });
  it("N-5: a STOP inside r17b-0 still prints the held LOADED line", () => {
    expect(real.some((l) => l === "OUT:LOADED ok")).toBe(true);
    expect(has(real, "Z3 stop-in-zero=")).toBe(true);
  });
  it("R19-RESTORE closes the bc tab in liveA19 and liveB19 after the safety restore, not in liveC19", () => {
    expect(has(real, "Z4 restore-b=RDRESTORE,CLOSEBC")).toBe(true);
    expect(has(real, "Z5 restore-c=RDRESTORE")).toBe(true);
  });
  it("mutants: the crash is labelled stale again (N-2); the held LOADED is dropped (N-5); liveB19 does not close its bc tab", () => {
    expect(has(run(mutate(LIB, "if ($rc -ne 2 -and -not $global:R19Loaded) {", "if ($false) {")), "Z1 crash=STOP:throw-after-state")).toBe(false);
    expect(run(mutate(LIB, "; if ($global:R19Loaded) { Show-S16 @($global:R19Loaded); $global:R19Loaded = $null } }   # N-5", " }   # N-5")).some((l) => l === "OUT:LOADED ok")).toBe(false);
    expect(has(run(mutate(LIB, "-in 'liveA19', 'liveB19'", "-eq 'liveA19'")), "Z4 restore-b=RDRESTORE,CLOSEBC")).toBe(false);
  });
});

// ---- fix round 1 (F1-F11): the carried banner kind, the pure fixes, and the drivers run with their step bodies ------------------------------------------------------
describe("fix round 1: the pure decisions", () => {
  it("F1: a carried row's banner is FAIL with IDLE and a passing control, PASS on none, else NOT MEASURED, and never a STOP", async () => {
    const A = await import("../s12-r19-a.js");
    expect(A.judgeBannerCarried("seen", 25_000, "pass")).toBe("FAIL");
    expect(A.judgeBannerCarried("none", 25_000, "pass")).toBe("PASS");
    expect(A.judgeBannerCarried("seen", 19_999, "pass")).toBe("NOT MEASURED");
    expect(A.judgeBannerCarried("seen", 25_000, "fail")).toBe("NOT MEASURED");
    const out: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
    const row = async (leg: string, ctl: string): Promise<number> => A.main(["banner", "--row", "R19-UP-6", "--kind", "carried", "--ctl", ctl, "--stop", "attach-on-refused-page", "--leg", leg]);
    try {
      expect(await row("outside=50,seen,25000", "pass")).toBe(1);
      expect(await row("outside=50,none,25000", "pass")).toBe(0);
      expect(await row("outside=50,seen,25000", "absent")).toBe(0);
    } finally { spy.mockRestore(); }
    expect(out).toContain("LEG R19-UP-6 banner FAIL");
    expect(out).toContain("LEG R19-UP-6 banner PASS");
    expect(out).toContain("LEG R19-UP-6 banner NOT MEASURED");
    expect(out.join("\n")).not.toContain("STOPWHY");
  });
  it("F7: a banner control that did not pass makes KEEP-1's banner clause and KEEP-2's end clause NOT MEASURED (a wrong answer is still the STOP)", () => {
    expect(B.keep1Decision([true, true, true, true, true], "continuous", "fail")).toBe("NOT MEASURED");
    expect(B.keep1Decision([true, true, true, true, true], "gaps:1", "absent")).toBe("NOT MEASURED");
    expect(B.keep1Decision([true, false, true, true, true], "continuous", "fail")).toBe("STOP");
    expect(B.judgeKeep2([5800, 5900, 6000], [300, 400, 500], ["BAD_PARAMS", "BAD_PARAMS", "BAD_PARAMS"], "fail")).toEqual({ v: "NOT MEASURED", measured: false });
  });
  it("F5: a poll that never reached K-devt makes both KEEP-4 legs NOT MEASURED, not a product FAIL; the line carries the judged call's own answer", () => {
    expect(B.judgeKeep4(undefined, { n: 11 }, false)).toEqual({ devtools: "NOT MEASURED", closed: "NOT MEASURED" });
    expect(B.judgeKeep4(undefined, { n: 11 }, true).devtools).toBe("FAIL");
    expect(TS).toContain('keepdtLine(R, "devtools", p.attached ? code(dv) : "not-run")');
  });
  it("F4: the second call starts before the first has answered", async () => {
    const log: string[] = [];
    let done: () => void = () => undefined;
    const first = (): Promise<number> => { log.push("first-start"); return new Promise((r) => { done = () => { log.push("first-end"); r(1); }; }); };
    const second = (): Promise<number> => { log.push("second-start"); done(); return Promise.resolve(2); };
    expect(await B.overlapRun(first, second, async () => { log.push("gap"); })).toEqual([1, 2]);
    expect(log).toEqual(["first-start", "gap", "second-start", "first-end"]);
  });
  it("M11: a call after the event that is not refused exactly is the STOP kept-session-used (an ok included)", () => {
    expect(() => B.assertKept3("disarm", undefined)).toThrow(expect.objectContaining({ why: "kept-session-used" }));
    expect(() => B.assertKept3("block", { code: "DOMAIN_BLOCKED", message: "other" })).toThrow(expect.objectContaining({ why: "kept-session-used" }));
    expect(() => B.assertKept3("close", { code: "TAB_GONE", message: "" })).not.toThrow();
    expect(TS).toContain("assertKept3(leg, e);");
  });
  it("F8, F10, F11: KEEP-2's idle leg reads its answer, CON-KEPT closes its MCP tab, UP-6 prints the sheet's IDLE and calls-sent forms", () => {
    expect(TS).toContain('if (leg === "idle") next = code((await att(() => con.evaluate("1"))).e);');
    expect(TS).toContain('m.call("browser_close_tab", { tab: mt })');
    expect(TS).toContain("calls[step]!, R);");
    expect(TS).toContain("say(`CALLS ${id} calls-sent=${x.sent() - s0}`);");
    expect(PSA).toContain('"CALLS $($r19s.id) calls-sent=0"');
    expect(SEC).toContain("`IDLE R19-UP-6 since-attach-ms=<n>` per leg");
  });
});

// The real Invoke-R19Row (s12-r19-a.ps1) with Invoke-R19Node recording what the driver passes (M9, M10, M15); the drivers run through a row stub that runs the step bodies.
const XR = `
function Invoke-R19Node { C "NODE:$($args[0]):$(@($args[1]) -join ' ')"; $global:R17Out = @($global:NodeOut); 0 }
function Get-R19Verdict { 'PASS' }
function Write-R19RowLine { C "ROWLINE:$($args -join ' ')" }
`;
const BAN = `'.*--kind (\\S+) .*--leg \\S+?=(.*)$', '$1/$2'`;
const SCEN_R = `
$global:R19Ctl = 'pass'
$global:NodeOut = @('CALLS R19-UP-6-outside calls-sent=1', 'CALLS R19-UP-6-missing calls-sent=0', 'CALLS R19-UP-6-relative calls-sent=1', 'CALLS R19-UP-6-raw-dotdot calls-sent=1', 'CALLS R19-UP-6-raw-notarget calls-sent=1') + @(1..5 | ForEach-Object { "IDLE R19-UP-6 since-attach-ms=2100$_" })
Invoke-R19Up6
Write-Host "R1 first=$($global:Calls[0]) banners=$(@($global:Calls | Where-Object { $_ -like 'NODE:s12-r19-a:banner*' } | ForEach-Object { $_ -replace ${BAN} }) -join ' ')"
$global:Calls.Clear(); $global:NodeOut = @('IDLE R19-CON-3 since-attach-ms=22000')
Invoke-R19Row 'R19-CON-3' @('refuse') -StepList @(@{ k = 's'; id = 'R19-CON-3' }) -Banner refused -Why attach-on-refused-page
Write-Host "R2 first=$($global:Calls[0]) banner=$($global:Calls[1] -replace ${BAN})"
$global:Calls.Clear(); $global:NodeOut = @('IDLE R19-F-RAW since-attach-ms=23000')
Invoke-R19FRaw 'R19-F-RAW'
Write-Host "R3 first=$($global:Calls[0]) banner=$($global:Calls[1] -replace ${BAN})"
`;
const R1 = "R1 first=NODE:s12-r19-b:up-6 --slice liveB19 --ctl pass banners=carried/,,21001 record/,,21002 carried/,,21003 carried/,,21004 carried/,,21005";
const R2 = "R2 first=NODE:s12-r19-a:refuse --slice liveB19 --ctl pass banner=refused/,,22000";
const R3 = "R3 first=NODE:s12-r19-b:raw --row R19-F-RAW --slice liveB19 --ctl pass banner=carried/,,23000";
const X2 = `
function Invoke-R19Node { C "NODE:$($args[0]):$(@($args[1]) -join ' ')"; $global:R17Out = @($global:NodeOut); if ($global:RunSteps -and $args.Count -gt 2 -and $args[2]) { & $args[2] }; $global:NodeRc }
function Invoke-R19Steps([object[]]$StepList) {
  foreach ($s in $StepList) {
    C "STEP:$($s.k):$($s.id)"
    if ($s.k -eq 'do') { $global:R19Changed = $true } elseif ($s.k -eq 'undo') { $global:R19Changed = $false }
    if ($s.k -eq 'val') { C "VAL:$(& $s.f)" } elseif ($s.f) { & $s.f }
    if ($s.ev) { foreach ($e in @($s.ev.Values)) { & $e } }
  }
}
function Invoke-R19Row([string]$Id, [string[]]$Cmd, [object[]]$StepList = @(), [scriptblock]$Restore = $null, [string]$Banner = '', [string]$Why = '', [string]$Actor = 's12-r19-a', [int]$BudgetS = 300) {
  C "ROW:\${Id}:$($Cmd -join ' '):\${Actor}:restore=$([bool]$Restore)"; $global:R17Out = @($global:NodeOut); $global:R19Changed = $false
  try { if ($global:RunSteps) { Invoke-R19Steps $StepList } else { $global:R19Changed = $true }; if ($global:RowThrows) { throw 'the actor died' } } finally { if ($Restore -and $global:R19Changed) { & $Restore } }
}
function Stop-R19Actor([string]$Id, [string[]]$Out) { C "STOPACTOR:$Id"; throw "stopactor $Id" }
function Write-R19RowLine { C "ROWLINE:$($args -join ' ')" }
function Switch-R19Toolbar { C "TOOLBAR:$args" }
function Set-R19BlockAdd { C 'BLOCKADD' }
function Restore-R19Block { C 'RESTOREBLOCK' }
function Set-S9Omnibox { C 'OMNI' }
function Open-S12DevToolsMenu { C 'OPENDT'; $global:S12Dev = [pscustomobject]@{ How = 'window'; Hwnd = 900 }; $true }
function Test-S9Live { C "LIVE:$($args[0])"; $global:LiveDev }
function Open-R19Seg { C 'OPEN'; $global:D = 800 }
$global:NodeRc = 0; $global:RunSteps = $false; $global:LiveDev = $true
`;
const SCEN_2 = `
$global:R19Xk = 0
$show = { ($global:Calls | Where-Object { $_ -notlike 'STEP:*' -and $_ -notlike 'ROW:*' }) -join ',' }
$global:RowThrows = $true; $global:Calls.Clear()
try { Invoke-R19Keep3 } catch { }
Write-Host "K1 restore=$(& $show)"
$global:RowThrows = $false; $global:RunSteps = $true; $global:Calls.Clear()
Invoke-R19Keep3
Write-Host "K2 steps=$(& $show)"
$global:Calls.Clear(); $global:R19Devt = 'yes'
Invoke-R19DevRow 'R19-KEEP-4' 'http://127.0.0.1:8081/x' 'keep-4' (New-R19DevSteps 'R19-KEEP-4')
Write-Host "K3 keep4=$(($global:Calls | Where-Object { $_ -notlike 'STEP:*' }) -join ',')"
$global:R19ProbeAns = 'PROBE'; $global:R19KeptAns = 'KEPT'; $global:Calls.Clear()
Invoke-R19DevtNoflag
Write-Host "K4 noflag=$(($global:Calls) -join ',')"
$global:RunSteps = $false; $global:NodeRc = 2; $global:Calls.Clear()
try { Invoke-R19DevtNoflag } catch { }
try { Invoke-R19DevProbe } catch { }
Write-Host "K5 rc2=$(($global:Calls | Where-Object { $_ -like 'STOPACTOR:*' }) -join ',')"
$global:NodeRc = 0; $global:R19Devt = 'yes'; $global:RunSteps = $true; $global:Calls.Clear(); $global:R19Xk = 0; $global:NodeOut = @('SWEEPPRE attached=yes'); $global:S12Before = @(100, 200)
Invoke-R19SweepHeld
Write-Host "S1 sweep=$(& $show)"
Write-Host "S2 before=$($global:S12Before -join ',')"
$global:LiveDev = $false; $global:Calls.Clear(); $global:R19Xk = 0
Invoke-R19SweepHeld
Write-Host "S3 gone=$(@($global:Calls | Where-Object { $_ -like 'VAL:*' }) -join ',')"
$global:NodeOut = @('SWEEPPRE attached=no'); $global:Calls.Clear(); $global:R19Xk = 0
Invoke-R19SweepHeld
Write-Host "S4 unattached=$(($global:Calls | Where-Object { $_ -notlike 'STEP:*' }) -join ',')"
`;
const KC = {
  K1: "K1 restore=TOOLBAR:True,RESTOREBLOCK",
  K2: "K2 steps=TOOLBAR:False,TOOLBAR:True,BLOCKADD,RESTOREBLOCK,BLOCKADD,WINDOW,OMNI,CLOSEX,RESTOREBLOCK,WINDOW,OMNI,CLOSEX",
  K3: "K3 keep4=WINDOW,ROW:R19-KEEP-4:keep-4:s12-r19-b:restore=True,OPENDT,CLOSEDT,CLOSEDT,CLOSEX",
  K4: "K4 noflag=NODE:s12-r19-b:devnoflag --probe PROBE --kept KEPT,ROWLINE:R19-DEVT-NOFLAG RECORD",
  K5: "K5 rc2=STOPACTOR:R19-DEVT-NOFLAG,STOPACTOR:DEVPROBE",
  S1: "S1 sweep=WINDOW,NODE:s12-r19-b:sweep-held --phase 1 --slice liveB19,OPENDT,SAVE:reload,RELOAD,OPEN,RERUN,LIVE:900,VAL:yes,CLOSEDT,CLOSEDT,CLOSEDT,CLOSEX",
  S2: "S2 before=100,200,800",
  S3: "S3 gone=VAL:no",
  S4: "S4 unattached=WINDOW,NODE:s12-r19-b:sweep-held --phase 1 --slice liveB19,OPENDT,CLOSEDT,CLOSEX",
};
describe.skipIf(!hasPs)("fix round 1: the real row driver and the drivers' step bodies", () => {
  const rd1 = hasPs ? runPs(XR, PSB, SCEN_R, PSA) : [];
  it("F1, M9, M10, M15: UP-6 and F-RAW judge `carried` (a no-call leg `record`), a liveA19 row `refused`; the actor name is passed; leg n's IDLE is the n-th line", () => {
    for (const l of [R1, R2, R3]) expect(has(rd1, l), l).toBe(true);
  });
  const rd2 = hasPs ? runPs(X2, PSB, SCEN_2) : [];
  it("M3, M4: KEEP-3's composite restore runs when the actor dies, and nav-blocked's undo restores the block list", () => {
    expect(has(rd2, KC.K1)).toBe(true);
    expect(has(rd2, KC.K2)).toBe(true);
  });
  it("M8: a DevTools row opens DevTools by the menu method and closes it; M6: DEVT-NOFLAG passes --probe the probe's word and --kept KEEP-4's; F9: an actor STOP is a STOP", () => {
    expect(has(rd2, KC.K3)).toBe(true);
    expect(has(rd2, KC.K4)).toBe(true);
    expect(has(rd2, KC.K5)).toBe(true);
  });
  it("F3, M5: SWEEP-HELD is two actor runs with the segment, reload, capture and re-run between them at block level; F5: an unattached sweep reloads nothing", () => {
    expect(has(rd2, KC.S1)).toBe(true);
    expect(has(rd2, KC.S4)).toBe(true);
  });
  it("F2, M12: the capture window reopened by the reload joins the known windows, and devtools-open comes from X's own DevTools record", () => {
    expect(has(rd2, KC.S2)).toBe(true);
    expect(has(rd2, KC.S3)).toBe(true);
  });
  const MUT2: Array<[string, string, string, string]> = [
    ["KEEP-3 has no composite restore", " -Restore { Switch-R19Toolbar $true; Restore-R19Block; Close-R19Xk }", "", KC.K1],
    ["nav-blocked's undo does not restore the block list", "f = { Close-R19Xk; if ($r19k -eq 'blocked') { Restore-R19Block } }.GetNewClosure()", "f = { Close-R19Xk }.GetNewClosure()", KC.K2],
    ["DEVT-NOFLAG's words are swapped", "'--probe', $global:R19ProbeAns, '--kept', $global:R19KeptAns", "'--probe', $global:R19KeptAns, '--kept', $global:R19ProbeAns", KC.K4],
    ["DevTools is opened by another method", "f = { [void](Open-S12DevToolsMenu $global:R19Xk) } }, @{ k = 'undo'", "f = { [void](Open-S12DevTools $global:R19Xk) } }, @{ k = 'undo'", KC.K3],
    ["DEVPROBE drops its actor's exit code", "if ($r19rc -eq 2) { Stop-R19Actor 'DEVPROBE' $global:R17Out }", "", KC.K5],
    ["SWEEP-HELD reloads without the capture segments", "    Invoke-R19SweepReload\n", "    Invoke-R19Stamped $R17Blocks['reload']; [void](Invoke-R19Rerun)\n", KC.S1],
    ["SWEEP-HELD's devtools-open is a constant", "f = { if (Test-R19DevOpen) { 'yes' } else { 'no' } }", "f = { 'yes' }", KC.S3],
    ["the reopened capture is not added to the known windows", "  if ($global:D) { $global:S12Before = @($global:S12Before) + [long]$global:D }", "", KC.S2],
    ["SWEEP-HELD reloads when DevTools never attached", "'SWEEPPRE attached=yes'", "'SWEEPPRE'", KC.S4],
  ];
  for (const [what, from, to, check] of MUT2) {
    it(`mutant "${what}" turns "${check.slice(0, 24)}" red`, () => { expect(has(runPs(X2, mutate(PSB, from, to), SCEN_2), check)).toBe(false); });
  }
  it("mutant: UP-6 has no banner clause turns R1 red", () => { expect(has(runPs(XR, mutate(PSB, "-StepList @($r19ids) -Banner carried -Why attach-on-refused-page", "-StepList @($r19ids)"), SCEN_R, PSA), R1)).toBe(false); });
  for (const [what, from, to] of [["every banner leg is judged `record`", "{ 'record' } else { $Banner }", "{ 'record' } else { 'record' }"], ["Invoke-R19Row ignores -Actor", "Invoke-R19Node $Actor (@($Cmd)", "Invoke-R19Node 's12-r19-a' (@($Cmd)"]] as const) {
    it(`mutant: ${what} turns R1 or R2 red`, () => { const o = runPs(XR, PSB, SCEN_R, mutate(PSA, from, to)); expect(has(o, R1) && has(o, R2)).toBe(false); });
  }
});

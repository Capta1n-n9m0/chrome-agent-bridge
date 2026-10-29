// Step 13 S5-drivers-A: recipes/s13-r20.ps1 (the Run 20 wrapper over s12-r19-lib.ps1) runs in PowerShell with every helper stubbed (the s12-r19.test.ts pattern):
// nothing touches Chrome, a daemon or a port.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkStopReturn20 } from "../s13-r20.js";
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..").replace(/\\/g, "/");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const PRE = (dir: string): string => `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Toggle = 'on'
$env:S11_OUT = '${dir}'; $GlobalsFile = '${dir}\\g.clixml'; $DaemonLog = '${dir}\\daemon.log'; $global:S16Mark = 0; $global:D = 8; $global:W = 7; $global:O = 5
$Steps = 'steps'; $Framing = '${dir}\\framing.txt'; $Record = '${dir}\\record.txt'; $UpOptReport = '${dir}\\u.md'; $FoundJson = '${dir}\\found.json'; $NowJson = '${dir}\\now.json'
function Say9([string]$m) { Write-Host $m }; function Stop9([string]$m) { $global:S16Stops++; Write-Host "STOP: $m" }
function Show-S16([string[]]$l) { foreach ($t in $l) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Fail-S16([string]$m) { Stop9 $m; throw 'stop' }; function Save-S16 { }; function Load-S16 { }
function Use-S16Options { 5 }; function Restore-S11Safety($o, $b, $row) { Write-Host "RESTORE-CALLED $row"; $global:RestoreRet }; function Set-S9Foreground($h) { $true }
function Close-S16Windows { Write-Host 'CLOSE-WINDOWS' }; function End-S16Actor { }; function Stop-S16All { Write-Host 'STOP-ALL' }
function Get-S11bStopCause($e) { 'cause' }; function Test-S9Live($h) { $true }; function Save-S11bConsole($h, $f) { Set-Content -LiteralPath $f 'a'; $f }
function Close-S9Window($h) { }; function Set-S12AttachStamp { }
function Invoke-R17Node([string]$Which, [string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [switch]$StopOnFail) {
  $k = "$Which $($NodeArgs[0])"; Write-Host "NODE $k"; Write-Host "NARGS $k $($NodeArgs -join ' ')"; $global:R17Out = @($global:NodeOut[$k]); if ($global:NodeOut[$k]) { Show-S16 $global:R17Out }
  if ($global:NodeRc.ContainsKey($k)) { return $global:NodeRc[$k] }; 0
}
function Start-S11bConsoleEval([long]$c, [string]$s, [string[]]$o = @(), [string]$ExprFile = '') { if ($ExprFile) { Write-Host "EXPR-TYPED $(([IO.File]::ReadAllText($ExprFile)).Contains('getSelf'))" }; [pscustomobject]@{ Code = $global:ConsoleCode; Mark = 1; Expr = $ExprFile } }
function Get-S11bTail($l, [string]$m) { [pscustomobject]@{ Found = $true; Lines = @($global:Tail) } }
function git { if ($args[0] -eq 'rev-parse') { 'aaaaaaaaaaaabbbbbbbb' } elseif ($args[0] -eq 'status') { } }
$R17Blocks = @{ reload = { Write-Host 'RELOAD' }; console = { Write-Host 'CONSOLE'; $global:D = 8 } }
. '${REPO}/recipes/s13-r20.ps1'
function Test-R20S4Ancestor { $global:Anc }
function Stubs([string]$slice) { $global:R19Blocks = @{}; foreach ($n in @(Get-R19Order $slice)) { $nn = $n; $global:R19Blocks[$n] = { Write-Host "RAN $nn" }.GetNewClosure() } }
function T([string]$n, [scriptblock]$b) {
  Write-Host "BEGIN $n"; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16ConsoleRead = $false; $global:S16Stops = 0; $global:RestoreRet = $true; $global:Anc = $true; $global:ConsoleCode = $null; $global:Tail = @()
  $global:NodeRc = @{}; $global:NodeOut = @{}; $global:R19Slice = 'liveA20'; $global:R19Reason = ''; $global:R19Pending = [ordered]@{}; $global:R19StopSeq = 0; $global:R19Segs = @(); $global:R19SegNext = 1; $global:R19SegLost = $false; $global:R20Port = 8081
  Remove-Item -LiteralPath $Record -Force -ErrorAction Ignore
  try { $r = @(& $b)[-1]; Write-Host "RET $r" } catch { Write-Host "THREW $_" }
}
`;
const BODY = `
T order { Stubs 'liveA20'; Invoke-R19Slice 'liveA20' }
T orderBC { Write-Host "B $((Get-R19Order 'liveB20') -join ',')"; Write-Host "C $((Get-R19Order 'liveC20') -join ',')" }
T row { Write-Host "ID $(Get-R19RowId 'r20-pop-bg') $(Get-R19RecordName 'liveA20') $(Get-R19RecordName 'liveA20' 2) $(Get-R19CapName 'liveA20' 2)"; $global:R19Slice = 'liveA20'; Write-R19RowLine 'R20-0' 'PASS'; Write-R19RowLine 'R20-ARGS-3' 'PASS' }
T port { Write-Host "P $(Select-R20Port @(8081, 8082, 8084)) $(Select-R20Port @()) $(Select-R20Port @(8081, 8082, 8083))" }
T throwClean { Stubs 'liveA20'; $global:R19Blocks['r20-args-order'] = { throw 'boom' }; Invoke-R19Slice 'liveA20' }
T throwChanged { Stubs 'liveA20'; $global:S16Changed = $true; $global:R19Blocks['r20-pop-bg'] = { throw 'boom' }; Invoke-R19Slice 'liveA20' }
T restoreFails { Stubs 'liveA20'; $global:S16Changed = $true; $global:RestoreRet = $false; $global:R19Blocks['r20-pop-bg'] = { throw 'boom' }; Invoke-R19Slice 'liveA20' }
T zeroOk {
  $global:NodeOut['s13-r20 proof'] = 'LOADED20 keys=page nested=page elem=page perm=unread listener=unread enabled=yes args=answered'
  Invoke-R20Zero { Show-S16 @('MANIFEST m BUILD b'); Show-S16 @('RULES 0', 'STATE x') }; Write-Host 'END'
}
T zeroNoAnc { $global:Anc = $false; $global:NodeOut['s13-r20 proof'] = 'LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered'; Invoke-R20Zero { Show-S16 @('MANIFEST m BUILD b') } }
foreach ($w in 'build-not-loaded', 'extension-disabled') {
  $ww = $w; T "zero-$ww" { Stubs 'liveA20'; $global:NodeRc['s13-r20 proof'] = 2; $global:NodeOut['s13-r20 proof'] = @('LOADED20 keys=sorted nested=sorted elem=sorted perm=no listener=no enabled=yes args=answered', "STOPWHY $ww"); $global:R19Blocks['r20-0'] = { Invoke-R20Zero { } }; Invoke-R19Slice 'liveA20' }.GetNewClosure()
}
T zeroCrash { Stubs 'liveA20'; $global:R19Blocks['r20-0'] = { Invoke-R20Zero { } }; Invoke-R19Slice 'liveA20' }
T reloadFailed {
  Stubs 'liveA20'; Register-R20Blocks; $global:R19Blocks['preflight'] = { }; $global:R19Blocks['servers'] = { }; foreach ($n in 'files', 'window', 'console', 'r20-0', 'r20-pop-bg') { $nn = $n; $global:R19Blocks[$n] = { Write-Host "RAN $nn" }.GetNewClosure() }
  $R17Blocks['reload'] = { Add-Content -LiteralPath $Record 'reload-extension.ps1 exit 2 (attempt 2)'; throw 'reload ended in a STOP' }
  Invoke-R19Slice 'liveA20'
}
foreach ($w in 'popup-lease-wrong', 'existing-tool-changed', 'args-ran-js-off') {
  $ww = $w; T "actor-$ww" {
    $global:NodeRc['s13-r20-a pop-bg'] = 2; $global:NodeOut['s13-r20-a pop-bg'] = @("STOPWHY $ww")
    $global:S16Changed = $true
    $global:R19Blocks = @{ 'r20-pop-bg' = { Invoke-R19Row 'R20-POP-BG' @('pop-bg') -Actor 's13-r20-a' } }; $R19Order['liveA20'] = @('r20-pop-bg'); Invoke-R19Slice 'liveA20'
  }.GetNewClosure()
}
T actorNoReason { $global:NodeRc['s13-r20-a pop-bg'] = 2; $global:R19Blocks = @{ 'r20-pop-bg' = { Invoke-R19Row 'R20-POP-BG' @('pop-bg') -Actor 's13-r20-a' } }; $R19Order['liveA20'] = @('r20-pop-bg'); Invoke-R19Slice 'liveA20' }
T rowVerdict {
  $global:NodeOut['s13-r20-a pop-other'] = @('LEG R20-POP-OTHER third PASS', 'ROW R20-POP-OTHER unjoined NOT MEASURED - no unjoined tab can be made')
  Invoke-R19Row 'R20-POP-OTHER' @('pop-other') -Actor 's13-r20-a'
}
T restoreEqual { Invoke-R20RestoreCheck; Write-Host 'OK' }
T restoreDiffers { $global:NodeRc['s13-r20 restore-compare'] = 2; Stubs 'liveA20'; $global:S16Changed = $true; $global:R19Blocks['r20-pop-bg'] = { Invoke-R20RestoreCheck }; Invoke-R19Slice 'liveA20' }
T rerun { $global:R19Rerun = 0; Write-Host "RR $(Invoke-R20Rerun)"; $global:NodeRc['s13-r20 proof'] = 2; Write-Host "RR $(Invoke-R19Rerun)" }
function Fx { function Get-S11Signal([string]$n, [string]$k) { Join-Path $env:S11_OUT "$n.$k" }; function Wait-S11Ready([string]$n) { Remove-Item -LiteralPath (Get-S11Signal $n 'ready'); $true }; function Write-S11Pressed([string]$n, [string]$c = 'done') { Write-Host "PRESSED $n=$c" } }
T clickSkip { . Fx; function Find-S12UiaByName { Write-Host 'FIND-CALLED'; $null }; Set-Content -LiteralPath (Get-S11Signal 'x-human-click1' 'ready') 'skip'; $all = New-R20PopSteps 'x' @('human') $true; $s = @($all | Where-Object { $_.id -eq 'x-human-click1' })[0]; Invoke-R19StepB $s }
T clickSent {
  . Fx; function Find-S12UiaByName { 1 }; function Get-S12ElementRect($e) { [pscustomobject]@{ L = 10; R = 50; T = 10; B = 30 } }; function Get-S12WindowRect($w) { [pscustomobject]@{ L = 0; R = 100; T = 0; B = 100 } }
  function Get-S12Foreground { $global:W }; function Get-S12WindowAtPoint($x, $y) { $global:W }; function Send-S12MouseClick($x, $y) { Start-Sleep -Milliseconds 80; Write-Host "CLICKEND $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())" }
  Set-Content -LiteralPath (Get-S11Signal 'x-human-click1' 'ready') 'go'; $all = New-R20PopSteps 'x' @('human') $true; $s = @($all | Where-Object { $_.id -eq 'x-human-click1' })[0]; Invoke-R19StepB $s
}
T steps { $s = New-R20PopSteps 'R20-POP-OTHER' @('third', 'human') $true; Write-Host "IDS $(($s | ForEach-Object { $_.id }) -join ',')" }
`;
const BODY2 = `
T workerOk { $global:Tail = @('> echoed expression', 'R20READ yes yes yes'); $w = Read-R20Worker 1500; Write-Host "W $($w.Perm) $($w.Listener) $($w.Enabled) disk=$($w.Disk)" }
T workerNo { $global:Tail = @('R20READ no no no'); $w = Read-R20Worker 1500; Write-Host "W $($w.Perm) $($w.Listener) $($w.Enabled) disk=$($w.Disk)" }
T workerNoLine { $global:Tail = @('> only the echoed expression'); $w = Read-R20Worker 1500; Write-Host "W $($w.Perm) $($w.Listener) $($w.Enabled) disk=$($w.Disk)" }
T workerFallback { $global:ConsoleCode = 10; $w = Read-R20Worker 1500; Write-Host "W $($w.Perm) $($w.Listener) $($w.Enabled) disk=$($w.Disk)" }
T zeroReadsWorker {
  $global:Tail = @('R20READ yes yes no'); $global:NodeRc['s13-r20 proof'] = 2
  $global:NodeOut['s13-r20 proof'] = @('LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=no args=answered', 'STOPWHY extension-disabled')
  $R19Order['liveA20'] = @('r20-0'); $global:R19Blocks = @{ 'r20-0' = { Invoke-R20Zero { } } }; Invoke-R19Slice 'liveA20'
}
T zeroFallbackArgs { $global:ConsoleCode = 10; $global:NodeOut['s13-r20 proof'] = 'LOADED20 keys=page nested=page elem=page perm=unread listener=unread enabled=yes args=answered'; Invoke-R20Zero { Show-S16 @('MANIFEST m BUILD b') } }
`;
type Obs = Record<string, string[]>;
function run(): Obs {
  const d = mkdtempSync(join(tmpdir(), "s13r20-"));
  try {
    const f = join(d, "t.ps1");
    writeFileSync(f, PRE(d.replace(/\\/g, "\\")) + BODY + BODY2, "utf8");
    const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 120_000 }).stdout ?? "";
    const obs: Obs = {};
    let cur = "";
    for (const l of out.split(/\r?\n/)) { const m = /^BEGIN (\S+)$/.exec(l); if (m) { cur = m[1]!; obs[cur] = []; } else if (cur) obs[cur]!.push(l); }
    return obs;
  } finally { rmSync(d, { recursive: true, force: true }); }
}
const ran = (l: string[]): string[] => l.filter((x) => x.startsWith("RAN ")).map((x) => x.slice(4));
const returns = (l: string[]): string[] => l.filter((x) => /^(STOP [a-z-]+|RETURN )/.test(x));
describe.skipIf(!hasPs)("s13-r20.ps1 under PowerShell with stubbed helpers", () => {
  const o = run();
  it("runs liveA20 in the sheet's order, the A2 slots empty, restore and logs last", () => {
    expect(ran(o.order!)).toEqual(["preflight", "servers", "files", "window", "reload", "console", "r20-0", "r20-pop-bg", "r20-pop-fg", "r20-pop-other", "r20-pop-none", "r20-args-order", "r20-args-3", "r20-restore", "r20-logs"]);
    expect(o.order!.some((l) => /^RET 0/.test(l))).toBe(true);
  });
  it("lists liveB20 and liveC20 for the plan", () => {
    expect(o.orderBC![0]).toContain("r20-0b,closerprobe,r20-choose-twice");
    expect(o.orderBC![1]).toContain("r20-0c,flag,r20-devt-undock");
  });
  it("names ids, record files and captures for Run 20, and ends the shared rows with slice=A", () => {
    expect(o.row!.find((l) => l.startsWith("ID "))).toBe("ID R20-POP-BG S13-live-record-liveA20.txt S13-live-record-liveA20-att2.txt console-liveA20-2.txt");
    expect(o.row).toContain("ROW R20-0 PASS slice=A");
    expect(o.row).toContain("ROW R20-ARGS-3 PASS");
  });
  it("picks the lowest port from 8081 that is not listed", () => expect(o.port![0]).toBe("P 8083 8081 8084"));
  it("a plain throw is throw-after-state with a RETURN, restored=n/a before any state change, yes after one, no when the restore fails", () => {
    expect(returns(o.throwClean!)).toEqual(["STOP throw-after-state", "RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a"]);
    expect(returns(o.throwChanged!)).toEqual(["STOP throw-after-state", "RETURN 1 after-stop=throw-after-state restored=yes readback=equal"]);
    expect(returns(o.restoreFails!)).toEqual(["STOP throw-after-state", "RETURN 1 after-stop=throw-after-state restored=no readback=n/a"]);
    expect(o.throwChanged).toContain("RESTORE-CALLED R20-RESTORE");
  });
  it("R20-0 prints LOADED20 right after MANIFEST, then the state lines, HEAD and S4, and one ROW with slice=A", () => {
    const z = o.zeroOk!;
    const i = z.indexOf("MANIFEST m BUILD b");
    expect(z[i + 1]).toMatch(/^LOADED20 keys=page .* args=answered$/);
    expect(z.indexOf("RULES 0")).toBeGreaterThan(i + 1);
    expect(z).toContain("HEAD aaaaaaaaaaaa tree=clean");
    expect(z).toContain("NODE s13-r20 s4");
    expect(z.filter((l) => /^ROW R20-0 /.test(l))).toEqual(["ROW R20-0 PASS slice=A"]);
  });
  it("R20-0 is FAIL when the S4 commit is not an ancestor", () => expect(o.zeroNoAnc).toContain("ROW R20-0 FAIL slice=A"));
  it("build-not-loaded and extension-disabled reach a RETURN with nothing restored (no state was changed)", () => {
    for (const w of ["build-not-loaded", "extension-disabled"]) {
      expect(returns(o[`zero-${w}`]!), w).toEqual([`STOP ${w}`, `RETURN 1 after-stop=${w} restored=n/a readback=n/a`]);
      expect(o[`zero-${w}`]!.some((l) => l.startsWith("LOADED20 ")), w).toBe(true);
    }
  });
  it("a proof that printed no LOADED20 line is throw-after-state, not a stale build", () => expect(returns(o.zeroCrash!)).toEqual(["STOP throw-after-state", "RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a"]));
  it("a reload that gave up (exit 2 twice) is reload-failed", () => expect(returns(o.reloadFailed!)).toEqual(["STOP reload-failed", "RETURN 1 after-stop=reload-failed restored=n/a readback=n/a"]));
  it("an actor's STOPWHY becomes its STOP and RETURN, restored after the state change", () => {
    for (const w of ["popup-lease-wrong", "existing-tool-changed", "args-ran-js-off"]) {
      expect(returns(o[`actor-${w}`]!), w).toEqual([`STOP ${w}`, `RETURN 1 after-stop=${w} restored=yes readback=equal`]);
      expect(checkStopReturn20(o[`actor-${w}`]!), w).toEqual([]);
    }
    expect(returns(o.actorNoReason!)[0]).toBe("STOP throw-after-state");
  });
  it("an unjoined leg note does not change the row's verdict", () => expect(o.rowVerdict).toContain("ROW R20-POP-OTHER PASS"));
  it("the restore read-back by hash: equal passes, a difference is the STOP not-restored", () => {
    expect(o.restoreEqual).toContain("OK");
    expect(returns(o.restoreDiffers!)).toEqual(["STOP not-restored", "RETURN 1 after-stop=not-restored restored=yes readback=equal"]);
  });
  it("the re-run proof calls the s13 proof with the re-run count, and a stale one is false", () => {
    expect(o.rerun).toContain("NODE s13-r20 proof");
    expect(o.rerun!.filter((l) => l.startsWith("RR "))).toEqual(["RR True", "RR False"]);
  });
  it("R20-0 reads perm, listener and enabled from the worker console and types the management read", () => {
    expect(o.workerOk).toContain("EXPR-TYPED True");
    expect(o.workerOk).toContain("W yes yes yes disk=unread");
    expect(o.workerNo).toContain("W no no no disk=unread");
  });
  it("a console that answers no line, or cannot evaluate, reads unread and takes the disk-manifest fallback", () => {
    expect(o.workerNoLine!).toContain("W unread unread unread disk=yes");   // extension/manifest.json holds webNavigation
    expect(o.workerFallback!).toContain("W unread unread unread disk=yes");
    expect(o.workerFallback!.some((l) => /manifest|\Users|\.json/.test(l))).toBe(false);   // no path on any stream
  });
  it("the proof is called with the worker readings; enabled=no from management.get is the STOP extension-disabled", () => {
    expect(o.zeroReadsWorker!.some((l) => /^NARGS s13-r20 proof .*--perm yes --listener yes --enabled no/.test(l))).toBe(true);
    expect(returns(o.zeroReadsWorker!)).toEqual(["STOP extension-disabled", "RETURN 1 after-stop=extension-disabled restored=n/a readback=n/a"]);
    expect(o.zeroFallbackArgs!.some((l) => /^NARGS s13-r20 proof .*--perm unread --listener unread --disk (yes|no)/.test(l))).toBe(true);
    expect(o.zeroFallbackArgs!.some((l) => l.includes("--enabled"))).toBe(false);
  });
  it("a skip click step presses unsent and touches no element; a sent click presses a stamp taken after the click", () => {
    expect(o.clickSkip).toContain("PRESSED x-human-click1=unsent");
    expect(o.clickSkip).not.toContain("FIND-CALLED");
    const end = Number(o.clickSent!.find((l) => l.startsWith("CLICKEND "))!.split(" ")[1]);
    const st = /^PRESSED x-human-click1=sent (\d{13})$/.exec(o.clickSent!.find((l) => l.startsWith("PRESSED "))!);
    expect(st).not.toBeNull();
    expect(Number(st![1])).toBeGreaterThanOrEqual(end);
  });
  it("the POP value steps follow the actor's signal order", () => expect(o.steps![0]).toBe("IDS R20-POP-OTHER-third-cn0,R20-POP-OTHER-third-cn1,R20-POP-OTHER-human-cn0,R20-POP-OTHER-human-click1,R20-POP-OTHER-human-click2,R20-POP-OTHER-human-click3,R20-POP-OTHER-human-cn1"));
});

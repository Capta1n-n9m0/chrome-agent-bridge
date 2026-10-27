// Step 12 S1-helpers-c: Run 18's block runner. The sequencing, STOP and restore logic (recipes/s12-r18-lib.ps1) runs in PowerShell with every helper
// stubbed (the s12-ps.test.ts pattern): nothing touches Chrome, a daemon or a port. The same scenarios run on a stub lib that does nothing
// (STUB_LIB): every check must be red there. Mutants of the real file must turn a named check red. Static ties to section 4.26 follow.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { carriedVerdict } from "../s11b-r17b-rules.js";
import { answerText, refusalStepJudge, worst } from "../s11b.js";
import { K17, row17Line, type J17 } from "../s11b-rules.js";
import type { PageObs } from "../s11-rules.js";

// The banner rows' lines, generated with the helpers' own judges and line forms (s11b up6 and raw), so a wording change in s11b.ts turns a test red.
const gateErr = { code: K17["K-gate"].code, message: K17["K-gate"].message };
const clean: PageObs = { files: [], change: 0, input: 0, trusted: [], markAdded: 0, markRemoved: 0, carriersLeft: 0 };
const win = (banner: boolean | null, violations = 0): { banner: boolean | null; violations: number } => ({ banner, violations });
const checkLine = (id: string, j: J17): string => row17Line(id, j).replace(/^ROW /, "CHECK ");
type Over = Record<string, { w?: ReturnType<typeof win>; page?: PageObs }>;
function up6Lines(over: Over): string[] {
  const out: string[] = [];
  const js: J17[] = [];
  for (const step of ["outside", "missing", "relative", "raw-dotdot", "raw-notarget"]) {
    const j = refusalStepJudge(step, gateErr, K17["K-gate"], over[step]?.page ?? clean, over[step]?.w ?? win(false));
    out.push(checkLine(`R17-UP-6 ${step}`, j));
    js.push(j);
  }
  return [...out, row17Line("R17-UP-6", worst(js))];
}
function rawLines(row: string, w: ReturnType<typeof win>, page: PageObs, leaks: number): string[] {
  const j = refusalStepJudge(row, gateErr, K17["K-gate"], page, w);
  const l: J17 = leaks === 0 ? { pass: true, why: "0 path occurrences in the message" } : { pass: false, why: `${leaks} path occurrence(s) in the message` };
  return [`ANSWER ${row} ${answerText(gateErr)}`, `LEAKS ${row} ${leaks}`, row17Line(row, worst([j, l]))];
}
const rawBn = rawLines("F-RAW", win(true), clean, 0);
const psq = (s: string): string => `'${s.replace(/[^\x00-\x7f]/g, "?").replace(/'/g, "''")}'`;
const FX = Object.entries({
  upBn: up6Lines({ outside: { w: win(true) } }),
  upOth: up6Lines({ outside: { w: win(true) }, missing: { w: win(false, 1) } }),
  rawBn,
  raw2Bn: rawLines("F-RAW-2", win(true), clean, 0),
  rawLeak: rawLines("F-RAW", win(true), clean, 2),
  rawOth: rawLines("F-RAW", win(false), { ...clean, markAdded: 1 }, 0),
  rawNoLeaks: rawBn.filter((l) => !l.startsWith("LEAKS")),
}).map(([k, v]) => `$${k} = @(${v.map(psq).join(", ")})`).join("\n");

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const LIB = rd("recipes/s12-r18-lib.ps1");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

/** A lib that defines every name and does nothing: the "stub runner" the scenarios must fail on. */
const STUB_LIB = [
  "function Get-R18Order([string]$Block) { @() }",
  "function Invoke-R18Slice([string]$Block) { 0 }",
  "function Stop-R18Wave([string]$Why) { 0 }",
  "function Test-R18Lists { $true }",
  "function Invoke-R18Zero([scriptblock]$Zero) { & $Zero }",
  "function Test-R18Gate([string]$Name) { $true }",
  "function Read-R18Early { $true }",
  "function Invoke-R18RowBlock([string]$Id, [scriptblock]$Ops, [string]$Slice = '') { & $Ops }",
  "function Invoke-R18Node { Invoke-R17Node @args }",
  "function Get-R18Verdict([string[]]$Lines) { 'PASS' }",
  "function Get-R18CodesVerdict([int[]]$Codes) { 'PASS' }",
  "function Get-R18CtlArgs { @() }",
  "function Invoke-R18Main([string]$Block) { 0 }", "function Get-R18RecordName([string]$Block, [int]$Att = 1) { 'x' }", "function Invoke-R18Stamped([scriptblock]$Block) { & $Block }",
  "function Set-R18Reused { }", "function Invoke-R18Banner([string]$Row, [scriptblock]$Run) { & $Run }", "function Invoke-R18Raw { }", "function Invoke-R18BannerCtl { }",
  "function Get-R18BannerVerdict([string[]]$Lines, [string]$V) { $V }", "function Set-R18Pending { }", "function Write-R18Pending { }", "function Invoke-R18UpL1 { }",
  "function Invoke-R18UpOpt { }", "function Invoke-R18UpRaceA { }", "function Invoke-R18UpDevt { }", "function Invoke-R18Restore { }", "function Invoke-R18Logs { }",
  "function Invoke-R18Up6 { }", "function Invoke-R18SaveRefuse { }",
  "$R18Order = @{}",
].join("\n");

interface Obs { lines: string[]; result: string; ret: string }
type Groups = Record<string, Obs>;
const PRE = (lib: string, dir: string): string => `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Toggle = 'on'
$GlobalsFile = '${dir}\\globals.clixml'; $FoundDir = '${dir}'; $Root = '${dir}'; $DaemonLog = '${dir}\\daemon.log'; $env:S11_OUT = '${dir}'; $global:S16Mark = 0
$Steps = 'steps'; $S9Id = 'abc'; $Framing = '${dir}\\framing.txt'; $Record = '${dir}\\record.txt'
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$m) { $global:S16Stops++; Write-Host "STOP: $m"; Write-Host "STOPRAW $([IO.Path]::GetFileName([string]$env:S9_RAW))" }
function Show-S16([string[]]$l) { foreach ($t in $l) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Fail-S16([string]$m) { Stop9 $m; throw 'stop' }
function Save-S16 { Write-Host 'SAVE' }
function Use-S16Options { 5 }
function Get-S9Options($h) { 'doc' }
function Get-S9ById($d, [string]$id) { if ($global:Missing -contains $id) { $null } else { 'el' } }
function Restore-S11Safety($o, $b, $row) { Write-Host "RESTORE-CALLED $row"; $global:RestoreRet }
function Set-S9Foreground($h) { $true }
function Close-S16Windows { Write-Host 'CLOSE-WINDOWS' }
function End-S16Actor { Write-Host 'END-ACTOR' }
function Stop-S16All { Write-Host 'STOP-ALL' }
function Get-S11bStopCause($e) { 'cause' }
function Test-S9Live($h) { $true }
function Save-S12Console($h, $s) { Write-Host "CAPTURE-SAVED $s" }
function Set-S12AttachStamp { Write-Host 'STAMP' }
function New-S16Window($u) { 9 }
function Read-S11FileAccess($h) { $global:Reading }
function Close-S11Window($h) { }
function Load-S16 { Write-Host 'LOADED' }
function Wait-S12Idle { Write-Host 'WAIT-IDLE' }
function Test-S12Idle($r) { $global:Idle }
function Step-S16($n, [scriptblock]$d) { & $d }
function Set-S11Front($h, $r) { Write-Host "FRONT $r" }
function Call9 { Write-Host 'CALL9' }
function Test-S11Own($h) { $true }
function Write-R17File($f, $l) { Write-Host "WROTE $(Split-Path -Leaf $f)" }
function Start-S16Actor { Write-Host 'START-ACTOR' }
function Assert-R17TreeClean { }
function Invoke-R17Node([string]$Which, [string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [switch]$StopOnFail) {
  Write-Host "NODE $Which $($NodeArgs -join ',') driver=$([bool]$Driver) stopOnFail=$($StopOnFail.IsPresent)"; $global:R17Out = @()
  if ($global:NodeLines) { Add-Content -LiteralPath $Record $global:NodeLines }
  if ($NodeArgs[0] -eq 'bannerctl') { $global:R17Out = @("CHECK bannerctl-$($NodeArgs[2]) violations=0"); if ($NodeArgs[2] -eq 'pos') { $global:R17Out += 'ANSWER R18-BANNER-CTL pos ok' } }
  if ($NodeArgs[0] -eq 'leg-line') { $global:R17Out = @("LEG R18-SAVE-REFUSE $($NodeArgs[4]) PASS") }
  if ($NodeArgs[0] -eq 'bannerctl-judge') { return $global:JudgeRc }; if ($NodeArgs[0] -eq 'scan18') { return $global:ScanRc }
  0
}
function git { if ($args[0] -eq 'rev-parse') { 'aaaaaaaaaaaabbbbbbbb' } elseif ($global:Dirty) { 'M file' } }
$R17Blocks = @{ 'rd-restore' = { Write-Host 'RD-RESTORE-CALLED'; Add-Content -LiteralPath $Record 'ROW RD-RESTORE PASS' } }
$global:S12Leg = [pscustomobject]@{ IdleMs = 15200; Polls = 7; Banner = 'none' }
$global:RestoreRet = $true; $global:Missing = @(); $global:Dirty = $false; $global:Reading = 'on'; $global:W = 7; $global:D = 8
. '${lib}'
function Stubs([string]$slice, [string[]]$extra = @()) {
  $global:R18Blocks = @{}
  foreach ($n in (@(Get-R18Order $slice) + $extra)) { $nn = $n; $global:R18Blocks[$n] = { Write-Host "RAN $nn" }.GetNewClosure() }
}
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; $global:Missing = @(); $global:Dirty = $false; $global:Reading = 'on'; $global:RestoreRet = $true; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16ConsoleRead = $false; $global:S16Stops = 0; $global:Idle = $true; $global:JudgeRc = 0; $global:ScanRc = 0; $global:R18Ctl = ''; $global:R18Pending = [ordered]@{}; $global:NodeLines = $null; $global:R17ActorRan = $false; try { $r = @(& $b)[-1]; Write-Host "RET $r"; Write-Host 'RESULT ok' } catch { Write-Host 'RESULT threw' } }
`;
const BODY: Record<string, string> = {
  seq: `
T orderA { Stubs 'liveA18'; Invoke-R18Slice 'liveA18' }
T orderB { Stubs 'liveB18'; Invoke-R18Slice 'liveB18' }
T gateOff { $global:Reading = 'off'; Stubs 'liveB18'; Invoke-R18Slice 'liveB18' }
T gateUnread { $global:Reading = 'unreadable'; Stubs 'liveB18'; Invoke-R18Slice 'liveB18' }
T stopLine { Stubs 'liveA18'; $global:R18Blocks['r18-up-6'] = { Stop9 'a guard' }; Invoke-R18Slice 'liveA18' }
T throwNoChange { Stubs 'liveA18'; $global:R18Blocks['r18-up-l1'] = { throw 'boom' }; Invoke-R18Slice 'liveA18' }
T teardownOnly { Stubs 'teardown' @('teardown'); Invoke-R18Slice 'teardown' }`,
  restore: `
T throwChanged { Stubs 'liveA18'; $global:R18Blocks['r18-up-opt'] = { $global:S16Changed = $true; throw 'boom' }; $r = Invoke-R18Slice 'liveA18'; Write-Host "CHANGED $($global:S16Changed)"; $r }
T restoreFalse { $global:RestoreRet = $false; Stubs 'liveA18'; $global:R18Blocks['r18-up-opt'] = { $global:S16Changed = $true; throw 'boom' }; Invoke-R18Slice 'liveA18' }
T restoreThrows { function Restore-S11Safety($o, $b, $row) { throw 'bad' }; Stubs 'liveA18'; $global:R18Blocks['r18-up-opt'] = { $global:S16Changed = $true; throw 'boom' }; Invoke-R18Slice 'liveA18' }
T inRestore { $global:S16InRestore = $true; Stubs 'liveA18'; $global:R18Blocks['r18-restore'] = { $global:S16Changed = $true; throw 'boom' }; Invoke-R18Slice 'liveA18' }
T stopInBlockChanged { Stubs 'liveB18'; $global:R18Blocks['r18-up-race-a'] = { $global:S16Changed = $true; Stop9 'x' }; Invoke-R18Slice 'liveB18' }
T teardownStop { Stubs 'teardown' @('teardown'); $global:R18Blocks['teardown'] = { $global:S16Changed = $true; throw 'boom' }; Invoke-R18Slice 'teardown' }
T consoleOnStop { Stubs 'liveA18'; $global:R18Blocks['r18-up-6'] = { throw 'boom' }; Invoke-R18Slice 'liveA18' }`,
  zero: `
T listsOk { Test-R18Lists }
T warnedMissing { $global:Missing = @('uploadfolders-warned'); Test-R18Lists }
T invalidMissing { $global:Missing = @('uploadfolders-invalid'); Test-R18Lists }
T zeroOk { $global:R18Slice = 'liveA18'; Invoke-R18Zero { Write-Host 'ZERO-OPS' } }
T zeroMissing { $global:R18Slice = 'liveA18'; $global:Missing = @('uploadfolders-warned'); Invoke-R18Zero { Write-Host 'ZERO-OPS' } }
T zeroDirty { $global:R18Slice = 'liveA18'; $global:Dirty = $true; $global:Missing = @('uploadfolders-warned'); Invoke-R18Zero { Write-Host 'ZERO-OPS' } }
T zeroChanged { $global:R18Slice = 'liveA18'; $global:S16Changed = $true; Invoke-R18Zero { Write-Host 'ZERO-OPS' } }
T zeroInSlice { Stubs 'liveA18'; $global:R18Blocks['r18-0'] = { Invoke-R18Zero { Write-Host 'ZERO-OPS' } }; $global:Missing = @('uploadfolders-warned'); Invoke-R18Slice 'liveA18' }`,
  rows: `
[IO.File]::WriteAllText($Record, '')
T rowOk { Invoke-R18RowBlock 'R18-UP-6' { Add-Content -LiteralPath $Record 'ROW R17-UP-6 PASS' } }
T rowFail { Invoke-R18RowBlock 'R18-UP-L1' { Add-Content -LiteralPath $Record 'ROW UP-L1 PASS'; Add-Content -LiteralPath $Record 'ROW UP-L1 FAIL' } 'liveB18' }
T rowNone { Invoke-R18RowBlock 'R18-UP-OPT' { Add-Content -LiteralPath $Record 'CHECK x' } }
T rowStop { Invoke-R18RowBlock 'R18-RESTORE' { Stop9 'no'; Add-Content -LiteralPath $Record 'ROW X PASS' } 'liveA18' }
T verdicts { Write-Host "V1 $(Get-R18Verdict @('ROW A PASS', '12:00Z s9-win: ROW B NOT MEASURED x', 'ROW SAVE-REFUSE-R sdk-leg RECORD'))"; Write-Host "V2 $(Get-R18Verdict @())"; Write-Host "V3 $(Get-R18Verdict @('ROW A NOT RUN', 'ROW B NOT DISCRIMINATING (y)'))"; Write-Host "V4 $(Get-R18CodesVerdict @(0, 3))"; Write-Host "V5 $(Get-R18CodesVerdict @(0, 1))"; Write-Host "V6 $(Get-R18CodesVerdict @(0, 0))" }
T ctl { $a = Get-R18CtlArgs 'liveA18' ([pscustomobject]@{ IdleMs = 15200; Polls = 7; Banner = 'none' }) ([pscustomobject]@{ IdleMs = 100; Polls = 9; Banner = 'seen' }) @('CHECK bannerctl-neg violations=2') @('CHECK bannerctl-pos violations=1', 'ANSWER R18-BANNER-CTL pos ok'); Write-Host "ARGS $($a -join ' ')" }
T ctlNoLine { Get-R18CtlArgs 'liveA18' ([pscustomobject]@{}) ([pscustomobject]@{}) @() @('ANSWER R18-BANNER-CTL pos ok') }
T nodeWrap { Invoke-R18Node 's11b' @('up6') { 1 } -StopOnFail }
T nodeWrapThrow { function Invoke-R17Node { throw 'x' }; Invoke-R18Node 's11b' @('up6') }`,
  blocks: `
[IO.File]::WriteAllText($Record, '')
${FX}
T bannerIdle { Invoke-R18Banner 'R18-X' { Write-Host 'FIRST-CALL' } }
T bannerBusy { $global:Idle = $false; Invoke-R18Banner 'R18-X' { Write-Host 'FIRST-CALL' } }
T rawIdle { $global:R18Slice = 'liveB18'; Invoke-R18Raw 'F-RAW' }
T rawBusy { $global:R18Slice = 'liveB18'; $global:Idle = $false; Invoke-R18Raw 'F-RAW-DIR' @('--dir', 'd') }
T ctlOk { $global:R18Slice = 'liveA18'; Invoke-R18BannerCtl; Write-Host "CTL $($global:R18Ctl)" }
T ctlFail { $global:R18Slice = 'liveA18'; $global:JudgeRc = 1; Invoke-R18BannerCtl; Write-Host "CTL $($global:R18Ctl)" }
T optFlag { function Use-S16Options { throw 'opt' }; try { Invoke-R18UpOpt } catch { Write-Host "CHANGED $($global:S16Changed)" } }
T raceFlag { function Set-S11Front($h, $r) { throw 'front' }; try { Invoke-R18UpRaceA } catch { Write-Host "CHANGED $($global:S16Changed)" } }
T restoreRow { $global:R18Slice = 'liveA18'; $global:O = 5; Invoke-R18Restore }
T bvUp { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $upBn 'FAIL' }
T bvUpOther { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $upOth 'FAIL' }
T bvRaw { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $rawBn 'FAIL' }
T bvRaw2 { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $raw2Bn 'FAIL' }
T bvRawNoCtl { Get-R18BannerVerdict $rawBn 'FAIL' }
T bvRawLeak { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $rawLeak 'FAIL' }
T bvRawOther { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $rawOth 'FAIL' }
T bvRawNoLeaks { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict $rawNoLeaks 'FAIL' }
T bvCtlPass { $global:R18Ctl = 'PASS'; Get-R18BannerVerdict $rawBn 'FAIL' }
T bvPass { $global:R18Ctl = 'FAIL'; Get-R18BannerVerdict @() 'PASS' }
T rawNm { $global:R18Slice = 'liveB18'; $global:R18Ctl = 'FAIL'; $global:NodeLines = $rawBn; Invoke-R18Raw 'F-RAW' }
T rawLeakRow { $global:R18Slice = 'liveB18'; $global:R18Ctl = 'FAIL'; $global:NodeLines = $rawLeak; Invoke-R18Raw 'F-RAW' }
T rawFail { $global:R18Slice = 'liveB18'; $global:R18Ctl = 'FAIL'; $global:NodeLines = $rawOth; Invoke-R18Raw 'F-RAW' }
T rawCtlPass { $global:R18Slice = 'liveB18'; $global:R18Ctl = 'PASS'; $global:NodeLines = $rawBn; Invoke-R18Raw 'F-RAW' }
T up6Nm { $global:R18Slice = 'liveA18'; $global:R18Ctl = 'FAIL'; $global:NodeLines = $upBn; Invoke-R18Up6 }
T up6Fail { $global:R18Slice = 'liveA18'; $global:R18Ctl = 'FAIL'; $global:NodeLines = $upOth; Invoke-R18Up6 }
T up6CtlPass { $global:R18Slice = 'liveA18'; $global:R18Ctl = 'PASS'; $global:NodeLines = $upBn; Invoke-R18Up6 }
T up6Idle { $global:R18Slice = 'liveA18'; Invoke-R18Up6 }
T up6Busy { $global:R18Slice = 'liveA18'; $global:Idle = $false; Invoke-R18Up6 }
T pendUpL1 { $global:NodeLines = @('ROW UP-L1 PASS'); Invoke-R18UpL1; Write-Host 'FLUSH'; Write-R18Pending 'NOT MEASURED' }
T pendUpL1Pass { $global:NodeLines = @('ROW UP-L1 PASS'); Invoke-R18UpL1; Write-R18Pending 'PASS' }
T pendUpL1None { $global:NodeLines = @('ROW UP-L1 PASS'); Invoke-R18UpL1; Write-R18Pending '' }
T pendUpL1Fail { $global:NodeLines = @('ROW UP-L1 PASS'); Invoke-R18UpL1; Write-R18Pending 'FAIL' }
T pendSave { Invoke-R18SaveRefuse; Write-Host 'FLUSH'; Write-R18Pending 'NOT MEASURED' }
T pendSavePass { Invoke-R18SaveRefuse; Write-R18Pending 'PASS' }
T pendStop { Stubs 'liveA18'; $global:R18Blocks['r18-up-l1'] = { Invoke-R18UpL1 }; $global:R18Blocks['r18-up-6'] = { Stop9 'x' }; Invoke-R18Slice 'liveA18' }
T logsOk { Set-Content -LiteralPath $DaemonLog 'x'; Set-Content -LiteralPath (Join-Path $env:S11_OUT 'console-liveA18.txt') 'x'; $global:R18Slice = 'liveA18'; Set-R18Pending 'R18-UP-L1' 'PASS'; Invoke-R18Logs }
T logsNm { $global:ScanRc = 3; Set-Content -LiteralPath $DaemonLog 'x'; Set-Content -LiteralPath (Join-Path $env:S11_OUT 'console-liveA18.txt') 'x'; $global:R18Slice = 'liveA18'; Set-R18Pending 'R18-UP-L1' 'PASS'; Set-R18Pending 'R18-SAVE-REFUSE' 'PASS'; Invoke-R18Logs }
T reused { $global:R18Blocks = @{}; Set-R18Reused @('reload') @{ reload = { Write-Host 'RELOAD-BLOCK' } }; & $global:R18Blocks['reload'] }
T devt { $global:R18Slice = 'liveB18'; Invoke-R18UpDevt }
T names { Write-Host "N1 $(Get-R18RecordName 'liveA18')"; Write-Host "N2 $(Get-R18RecordName 'liveB18' 2)"; Write-Host "N3 $(Get-R18RecordName 'teardown')" }
T mainOk { [IO.File]::WriteAllText($Record, ''); Stubs 'liveA18'; Invoke-R18Main 'liveA18' }
T mainRecord { [IO.File]::WriteAllText($Record, 'a line'); Stubs 'liveA18'; Invoke-R18Main 'liveA18' }
T mainGlobals { [IO.File]::WriteAllText($Record, ''); [IO.File]::WriteAllText($GlobalsFile, 'x'); Stubs 'liveA18'; Invoke-R18Main 'liveA18' }
T mainTeardown { [IO.File]::WriteAllText($GlobalsFile, 'x'); [IO.File]::WriteAllText($Record, 'a line'); Stubs 'teardown' @('teardown'); Invoke-R18Main 'teardown' }`,
};

function run(group: string, lib: string): Groups {
  const d = mkdtempSync(join(tmpdir(), "s12r18-"));
  try {
    const lf = join(d, "lib.ps1");
    writeFileSync(lf, lib, "utf8");
    const f = join(d, "t.ps1");
    writeFileSync(f, PRE(lf.replace(/'/g, "''"), d.replace(/'/g, "''")) + BODY[group]!, "utf8");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 90_000 });
    const g: Groups = {};
    let cur: Obs | null = null;
    for (const l of r.stdout.split(/\r?\n/)) {
      const b = /^BEGIN (\S+)/.exec(l);
      if (b) { cur = { lines: [], result: "", ret: "" }; g[b[1]!] = cur; continue; }
      if (!cur) continue;
      if (l.startsWith("RESULT ")) cur.result = l.slice(7);
      else if (l.startsWith("RET ")) cur.ret = l.slice(4);
      else cur.lines.push(l);
    }
    if (process.env.DBG && lib === LIB) console.log(group, JSON.stringify(g, null, 1));
    return g;
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}
const has = (o: Obs | undefined, re: RegExp): boolean => !!o && o.lines.some((l) => re.test(l));
const ran = (o: Obs | undefined): string[] => (o ? o.lines.filter((l) => l.startsWith("RAN ")).map((l) => l.slice(4)) : []);
const idx = (o: Obs | undefined, re: RegExp): number => (o ? o.lines.findIndex((l) => re.test(l)) : -1);
const stops = (o: Obs | undefined): boolean => has(o, /^STOP: /);
const A = ["preflight", "servers", "files", "window", "reload", "console", "r18-0", "r18-up-l1", "r18-banner-ctl", "r18-up-opt", "r18-up-6", "r18-save-refuse", "r18-bc-close", "r18-restore", "r18-logs", "teardown"];
const NMB = "NOT MEASURED (banner clause: R18-BANNER-CTL did not pass)";
const B = ["preflight", "servers", "files", "window", "reload", "console", "r18-0", "root-add", "r18-banner-ctl", "r18-f-raw", "r18-f-raw-2", "r18-f-raw-dir", "r18-up-race-a", "r18-up-devt", "r18-bc-close", "r18-restore", "r18-logs", "teardown"];

const CHECKS: Record<string, Record<string, (g: Groups) => boolean>> = {
  seq: {
    "liveA18 runs the sheet's order and returns 0": (g) => JSON.stringify(ran(g.orderA)) === JSON.stringify(A) && g.orderA!.ret === "0",
    "liveB18 runs the sheet's order and returns 0": (g) => JSON.stringify(ran(g.orderB)) === JSON.stringify(B) && g.orderB!.ret === "0",
    "toggle OFF: five NOT RUN rows, no later block, return 3, nothing pressed": (g) => JSON.stringify(ran(g.gateOff)) === JSON.stringify(["preflight"]) && g.gateOff!.ret === "3" && g.gateOff!.lines.filter((l) => /ROW R18-(F-RAW|F-RAW-2|F-RAW-DIR|UP-RACE-A|UP-DEVT) NOT RUN — waits for G11-3$/.test(l)).length === 5,
    "an unreadable toggle is a STOP before any later block (return 2, no restore)": (g) => g.gateUnread!.ret === "2" && JSON.stringify(ran(g.gateUnread)) === JSON.stringify(["preflight"]) && !has(g.gateUnread, /RESTORE-CALLED/),
    "a STOP line ends the slice: no later block, a STOP, return 2": (g) => g.stopLine!.ret === "2" && !ran(g.stopLine).includes("r18-save-refuse") && ran(g.stopLine).includes("r18-up-opt") && has(g.stopLine, /^STOP: the wave ended/),
    "a throw before any state change restores nothing": (g) => g.throwNoChange!.ret === "2" && !has(g.throwNoChange, /RESTORE-CALLED/) && !ran(g.throwNoChange).includes("r18-banner-ctl") && has(g.throwNoChange, /^STOP-ALL$/),
    "teardown alone runs only teardown": (g) => JSON.stringify(ran(g.teardownOnly)) === JSON.stringify(["teardown"]) && g.teardownOnly!.ret === "0",
  },
  restore: {
    "a throw after the first state change restores, then ends (return 2, flag cleared)": (g) => has(g.throwChanged, /^RESTORE-CALLED R18-RESTORE$/) && g.throwChanged!.ret === "2" && has(g.throwChanged, /^CHANGED False$/) && has(g.throwChanged, /^CLOSE-WINDOWS$/) && has(g.throwChanged, /^STOP-ALL$/),
    "a restore that returns false is a STOP naming the failure": (g) => has(g.restoreFalse, /^STOP: the restore failed/) && g.restoreFalse!.ret === "2",
    "a restore that throws is a STOP and the wave still ends": (g) => has(g.restoreThrows, /^STOP: the restore failed/) && has(g.restoreThrows, /^STOP: the wave ended/) && g.restoreThrows!.ret === "2",
    "a STOP met inside the restore itself gets no second restore": (g) => !has(g.inRestore, /RESTORE-CALLED/) && has(g.inRestore, /no second restore/) && g.inRestore!.ret === "2",
    "a STOP line (no throw) after a change also restores": (g) => has(g.stopInBlockChanged, /^RESTORE-CALLED/) && g.stopInBlockChanged!.ret === "2",
    "a stop inside teardown never presses the restore, still ends the wave (return 2)": (g) => !has(g.teardownStop, /RESTORE-CALLED/) && g.teardownStop!.ret === "2" && has(g.teardownStop, /^STOP-ALL$/) && has(g.teardownStop, /not pressed again/),
    "the slice's own capture is saved on a stop": (g) => has(g.consoleOnStop, /^CAPTURE-SAVED liveA18$/),
  },
  zero: {
    "both lists found: true": (g) => g.listsOk!.ret === "True" && !stops(g.listsOk) && has(g.listsOk, /both Upload folders lists are found/),
    "the empty warned list not found: a STOP naming it, false": (g) => g.warnedMissing!.ret === "False" && has(g.warnedMissing, /^STOP: .*uploadfolders-warned/),
    "the invalid list not found: a STOP naming it, false": (g) => g.invalidMissing!.ret === "False" && has(g.invalidMissing, /^STOP: .*uploadfolders-invalid/),
    "R18-0 runs the found read, then HEAD and ROW with slice=A": (g) => g.zeroOk!.result === "ok" && has(g.zeroOk, /^ZERO-OPS$/) && has(g.zeroOk, /^HEAD aaaaaaaaaaaa tree=clean$/) && has(g.zeroOk, /ROW R18-0 PASS slice=A$/),
    "a missing list stops R18-0 before the found-state read and prints no HEAD": (g) => g.zeroMissing!.result === "threw" && !has(g.zeroMissing, /ZERO-OPS/) && !has(g.zeroMissing, /^HEAD /) && stops(g.zeroMissing),
    "a dirty tree is a STOP before the lists are looked at": (g) => g.zeroDirty!.result === "threw" && !has(g.zeroDirty, /uploadfolders/) && !has(g.zeroDirty, /ZERO-OPS/) && stops(g.zeroDirty),
    "the missing-list STOP also reaches the record file": (g) => has(g.zeroMissing, /^STOPRAW record.txt$/) && has(g.warnedMissing, /^STOPRAW record.txt$/),
    "R18-0 after a state change is refused": (g) => g.zeroChanged!.result === "threw" && !has(g.zeroChanged, /ZERO-OPS/),
    "in the slice: the missing list is a STOP, return 2, no restore, no later block": (g) => g.zeroInSlice!.ret === "2" && !ran(g.zeroInSlice).includes("r18-up-l1") && !has(g.zeroInSlice, /RESTORE-CALLED/) && !has(g.zeroInSlice, /ZERO-OPS/),
  },
  rows: {
    "a row prints its ROW once, from the lines it added": (g) => g.rowOk!.lines.filter((l) => /ROW R18-UP-6 PASS$/.test(l)).length === 1,
    "the worst verdict wins and slice=B is appended": (g) => has(g.rowFail, /ROW R18-UP-L1 FAIL slice=B$/),
    "no verdict line is NOT MEASURED": (g) => has(g.rowNone, /ROW R18-UP-OPT NOT MEASURED$/),
    "a STOP inside a row prints no ROW and throws": (g) => g.rowStop!.result === "threw" && !has(g.rowStop, /ROW R18-RESTORE/),
    "verdict ranks": (g) => has(g.verdicts, /^V1 NOT MEASURED$/) && has(g.verdicts, /^V2 NOT MEASURED$/) && has(g.verdicts, /^V3 NOT DISCRIMINATING$/) && has(g.verdicts, /^V4 NOT MEASURED$/) && has(g.verdicts, /^V5 FAIL$/) && has(g.verdicts, /^V6 PASS$/),
    "the banner judge's arguments sum the violations": (g) => has(g.ctl, /^ARGS bannerctl-judge --slice liveA18 --idle-ms 15200 --neg-polls 7 --neg-banner none --pos-answer ok --pos-polls 9 --pos-banner seen --violations 3$/),
    "a leg without its lines is a STOP": (g) => g.ctlNoLine!.result === "threw" && stops(g.ctlNoLine),
    "the node wrapper stamps the attach after the process and forwards the switch": (g) => has(g.nodeWrap, /^NODE s11b up6 driver=True stopOnFail=True$/) && g.nodeWrap!.lines.at(-1) === "STAMP",
    "the node wrapper stamps also when the process throws": (g) => g.nodeWrapThrow!.result === "threw" && has(g.nodeWrapThrow, /^STAMP$/),
  },
  blocks: {
    "banner row, idle: front, the wait, then the call": (g) => idx(g.bannerIdle, /^FRONT R18-X$/) >= 0 && idx(g.bannerIdle, /^WAIT-IDLE$/) > idx(g.bannerIdle, /^FRONT R18-X$/) && idx(g.bannerIdle, /^FIRST-CALL$/) > idx(g.bannerIdle, /^WAIT-IDLE$/),
    "banner row, not idle: no call is sent and the block throws": (g) => g.bannerBusy!.result === "threw" && !has(g.bannerBusy, /FIRST-CALL/) && has(g.bannerBusy, /^WAIT-IDLE$/),
    "F-RAW rows wait for the idle before their call": (g) => idx(g.rawIdle, /^WAIT-IDLE$/) >= 0 && idx(g.rawIdle, /^NODE s11b raw,--row,F-RAW driver=True/) > idx(g.rawIdle, /^WAIT-IDLE$/),
    "F-RAW rows send nothing when not idle": (g) => g.rawBusy!.result === "threw" && has(g.rawBusy, /^WAIT-IDLE$/) && !has(g.rawBusy, /^NODE/),
    "the control waits for the idle before its first leg and passes": (g) => idx(g.ctlOk, /^WAIT-IDLE$/) >= 0 && idx(g.ctlOk, /^NODE s11b bannerctl,--leg,neg/) > idx(g.ctlOk, /^WAIT-IDLE$/) && has(g.ctlOk, /^CTL PASS$/),
    "a failed control is kept and says so": (g) => has(g.ctlFail, /^CTL FAIL$/) && has(g.ctlFail, /^CHECK banner-clauses slice=A NOT MEASURED/),
    "R18-UP-OPT sets the state-change flag before its first call": (g) => has(g.optFlag, /^CHANGED True$/),
    "R18-UP-RACE-A sets the state-change flag before its first call": (g) => has(g.raceFlag, /^CHANGED True$/),
    "R18-RESTORE calls the restore, stamped, and prints its row": (g) => idx(g.restoreRow, /^RD-RESTORE-CALLED$/) >= 0 && idx(g.restoreRow, /^STAMP$/) > idx(g.restoreRow, /^RD-RESTORE-CALLED$/) && has(g.restoreRow, /ROW R18-RESTORE PASS slice=A$/),
    "real s11b up6 lines (multi-token CHECK label), banner clause only, failed control: NOT MEASURED": (g) => g.bvUp!.ret === NMB,
    "real s11b raw lines (the helper's own ROW line, LEAKS 0), banner clause only, failed control: NOT MEASURED (F-RAW and F-RAW-2)": (g) => g.bvRaw!.ret === NMB && g.bvRaw2!.ret === NMB && g.bvRawNoCtl!.ret === NMB,
    "up6: another failed step keeps FAIL": (g) => g.bvUpOther!.ret === "FAIL" && g.bvUp!.ret === NMB,
    "raw: a leak, another failed clause, or no LEAKS line keeps FAIL": (g) => g.bvRawLeak!.ret === "FAIL" && g.bvRawOther!.ret === "FAIL" && g.bvRawNoLeaks!.ret === "FAIL" && g.bvRaw!.ret === NMB,
    "a passed control or a PASS verdict is unchanged": (g) => g.bvCtlPass!.ret === "FAIL" && g.bvPass!.ret === "PASS" && g.bvRaw!.ret === NMB,
    "R18-F-RAW prints NOT MEASURED (banner clause) when only the banner clause failed under a failed control": (g) => has(g.rawNm, /ROW R18-F-RAW NOT MEASURED \(banner clause: R18-BANNER-CTL did not pass\) slice=B$/),
    "R18-F-RAW prints FAIL for a leak, another clause, and a passed control": (g) => has(g.rawLeakRow, /ROW R18-F-RAW FAIL slice=B$/) && has(g.rawFail, /ROW R18-F-RAW FAIL slice=B$/) && has(g.rawCtlPass, /ROW R18-F-RAW FAIL slice=B$/),
    "R18-UP-6 applies the same rule: NOT MEASURED, FAIL on another step, FAIL under a passed control": (g) => has(g.up6Nm, /ROW R18-UP-6 NOT MEASURED \(banner clause: R18-BANNER-CTL did not pass\) slice=A$/) && has(g.up6Fail, /ROW R18-UP-6 FAIL slice=A$/) && has(g.up6CtlPass, /ROW R18-UP-6 FAIL slice=A$/),
    "R18-UP-6 waits for the idle before its call": (g) => idx(g.up6Idle, /^WAIT-IDLE$/) >= 0 && idx(g.up6Idle, /^NODE s11b up6 /) > idx(g.up6Idle, /^WAIT-IDLE$/),
    "R18-UP-6 sends nothing when not idle and the block throws": (g) => g.up6Busy!.result === "threw" && has(g.up6Busy, /^WAIT-IDLE$/) && !has(g.up6Busy, /^NODE/),
    "R18-UP-L1 waits: a CHECK line now, no ROW until R18-LOGS": (g) => has(g.pendUpL1, /^CHECK R18-UP-L1 console-clause pending R18-LOGS$/) && idx(g.pendUpL1, /ROW R18-UP-L1/) > idx(g.pendUpL1, /^FLUSH$/),
    "R18-UP-L1 under a NOT MEASURED or missing R18-LOGS is FAIL; otherwise its own verdict": (g) => has(g.pendUpL1, /ROW R18-UP-L1 FAIL \(console clause not met/) && has(g.pendUpL1None, /ROW R18-UP-L1 FAIL \(console clause/) && has(g.pendUpL1Pass, /ROW R18-UP-L1 PASS$/) && has(g.pendUpL1Fail, /ROW R18-UP-L1 PASS$/),
    "R18-SAVE-REFUSE waits, and is NOT MEASURED under a NOT MEASURED R18-LOGS": (g) => has(g.pendSave, /^CHECK R18-SAVE-REFUSE console-clause pending R18-LOGS$/) && idx(g.pendSave, /ROW R18-SAVE-REFUSE/) > idx(g.pendSave, /^FLUSH$/) && has(g.pendSave, /ROW R18-SAVE-REFUSE NOT MEASURED \(console clause/) && has(g.pendSavePass, /ROW R18-SAVE-REFUSE PASS$/),
    "a STOP before R18-LOGS prints neither deferred row": (g) => g.pendStop!.ret === "2" && has(g.pendStop, /^CHECK R18-UP-L1 console-clause pending/) && !has(g.pendStop, /ROW R18-UP-L1/),
    "R18-LOGS: the deferred rows follow it, then rows18 runs over the record copy; the evidence key is EVIDENCE": (g) => idx(g.logsOk, /ROW R18-LOGS PASS slice=A$/) >= 0 && idx(g.logsOk, /ROW R18-UP-L1 PASS$/) > idx(g.logsOk, /ROW R18-LOGS/) && idx(g.logsOk, /^NODE s11b rows18,--from,.*rows18-liveA18\.txt/) > idx(g.logsOk, /ROW R18-UP-L1/) && has(g.logsOk, /EVIDENCE console copy written/) && !has(g.logsOk, /CONSOLE evidence/),
    "R18-LOGS NOT MEASURED: UP-L1 is FAIL, SAVE-REFUSE NOT MEASURED, no evidence copy": (g) => has(g.logsNm, /ROW R18-LOGS NOT MEASURED slice=A$/) && has(g.logsNm, /ROW R18-UP-L1 FAIL \(console clause/) && has(g.logsNm, /ROW R18-SAVE-REFUSE NOT MEASURED \(console clause/) && has(g.logsNm, /EVIDENCE console copy not written/),
    "a reused block runs stamped": (g) => idx(g.reused, /^RELOAD-BLOCK$/) >= 0 && idx(g.reused, /^STAMP$/) > idx(g.reused, /^RELOAD-BLOCK$/),
    "R18-UP-DEVT s11 setup goes through the stamping wrapper": (g) => idx(g.devt, /^NODE s11 setup,--only,x/) >= 0 && idx(g.devt, /^STAMP$/) > idx(g.devt, /^NODE s11 setup/) && idx(g.devt, /^STAMP$/) < idx(g.devt, /^NODE s11b devt/),
    "the record file is named per slice and attempt": (g) => has(g.names, /^N1 S1-live-record-liveA18\.txt$/) && has(g.names, /^N2 S1-live-record-liveB18-att2\.txt$/) && has(g.names, /^N3 S1-live-record-teardown\.txt$/),
    "the main loads the globals, runs the slice and returns its code": (g) => has(g.mainOk, /^LOADED$/) && g.mainOk!.ret === "0" && idx(g.mainOk, /^LOADED$/) < idx(g.mainOk, /^RAN preflight$/),
    "a record that holds text is a STOP before anything else": (g) => g.mainRecord!.ret === "2" && has(g.mainRecord, /^STOP: the record file already holds text/) && !has(g.mainRecord, /^LOADED$/) && !has(g.mainRecord, /^RAN /),
    "a previous wave's globals are a STOP before the load, nothing done": (g) => g.mainGlobals!.ret === "2" && has(g.mainGlobals, /^STOP: a previous wave's globals exist/) && !has(g.mainGlobals, /^LOADED$/) && !has(g.mainGlobals, /^RAN |RESTORE-CALLED|CLOSE-WINDOWS/),
    "teardown ignores the globals and the record guards": (g) => g.mainTeardown!.ret === "0" && has(g.mainTeardown, /^LOADED$/) && has(g.mainTeardown, /^RAN teardown$/),
  },
};

// [name, group, check that must flip, text to replace, replacement]
const MUTANTS: Array<[string, string, string, string, string]> = [
  ["restore skipped on a throw", "restore", "a throw after the first state change restores, then ends (return 2, flag cleared)", "$okr = (@(Restore-R18State)[-1] -eq $true)", "$okr = $true"],
  ["restore skipped on a STOP line", "restore", "a STOP line (no throw) after a change also restores", "if ($global:S16Changed -and -not $global:S16InRestore) {", "if ($false) {"],
  ["failed restore not a STOP", "restore", "a restore that returns false is a STOP naming the failure", "-not $okr -or", "$false -or"],
  ["second restore inside the restore", "restore", "a STOP met inside the restore itself gets no second restore", "-and -not $global:S16InRestore", ""],
  ["capture not saved on a stop", "restore", "the slice's own capture is saved on a stop", "try { Save-R18Console }", "try { }"],
  ["list check skipped", "zero", "the empty warned list not found: a STOP naming it, false", "if (-not (Get-S9ById $r18Doc $id)) {", "if ($false) {"],
  ["list check not before the read", "zero", "a missing list stops R18-0 before the found-state read and prints no HEAD", "  if (-not $okLists) { throw 'stop' }\n  Invoke-R18Stamped $Zero", "  Invoke-R18Stamped $Zero\n  if (-not $okLists) { throw 'stop' }"],
  // the entry-block mutants of the verifier (E1, E2, E4, E7, E9, E11) and the fixes F1-F10, n2
  ["E1: the IDLE guard does not stop the banner row", "blocks", "banner row, not idle: no call is sent and the block throws", "if (-not (Test-S12Idle $Row)) { throw 'stop' }", "[void](Test-S12Idle $Row)"],
  ["E2: F-RAW skips the banner wrapper", "blocks", "F-RAW rows wait for the idle before their call", "Invoke-R18Banner \"R18-$RawId\" {", "& {"],
  ["E2b: F-RAW skips the banner wrapper (no call when busy)", "blocks", "F-RAW rows send nothing when not idle", "Invoke-R18Banner \"R18-$RawId\" {", "& {"],
  ["E4: the control does not wait for the idle", "blocks", "the control waits for the idle before its first leg and passes", "Set-S11Front $global:W 'R18-BANNER-CTL' }\n  [void](Wait-S12Idle)", "Set-S11Front $global:W 'R18-BANNER-CTL' }"],
  ["E7: UP-OPT does not set the flag", "blocks", "R18-UP-OPT sets the state-change flag before its first call", "$global:S16Changed = $true; Save-S16\n    $r18O", "Save-S16\n    $r18O"],
  ["E9: UP-RACE-A does not set the flag", "blocks", "R18-UP-RACE-A sets the state-change flag before its first call", "$global:S16Changed = $true; Save-S16\n    Step-S16 'front' { Set-S11Front $global:W 'race A' }", "Save-S16\n    Step-S16 'front' { Set-S11Front $global:W 'race A' }"],
  ["E11: R18-RESTORE does not call the restore", "blocks", "R18-RESTORE calls the restore, stamped, and prints its row", "Invoke-R18Stamped $R17Blocks['rd-restore']", "$null"],
  ["F2: the failed control is not kept", "blocks", "a failed control is kept and says so", "$global:R18Ctl = $(if ($r18C -eq 0) { 'PASS' } else { 'FAIL' })", ""],
  ["F2: the banner rule never applies", "blocks", "real s11b raw lines (the helper's own ROW line, LEAKS 0), banner clause only, failed control: NOT MEASURED (F-RAW and F-RAW-2)", "if ($V -ne 'FAIL' -or $global:R18Ctl -eq 'PASS') { return $V }", "return $V"],
  ["F2: any failure counts as a banner clause", "blocks", "up6: another failed step keeps FAIL", "-or @($bad | Where-Object { $_ -notmatch $R18BanRe }).Count", "-or $false"],
  ["G1: up6's CHECK label one token, another failed step still reads banner", "blocks", "up6: another failed step keeps FAIL", "CHECK \\S+(?: \\S+){0,2}? |", "CHECK \\S+ |"],
  ["G1: F-RAW converts without its LEAKS 0 line", "blocks", "raw: a leak, another failed clause, or no LEAKS line keeps FAIL", "-and -not @($Lines | Where-Object { $_ -match ($R18Pre + 'LEAKS F-RAW\\S* 0\\s*$') }).Count", ""],
  ["G1: the helper's own ROW line is not read", "blocks", "real s11b raw lines (the helper's own ROW line, LEAKS 0), banner clause only, failed control: NOT MEASURED (F-RAW and F-RAW-2)", "|ROW \\S+ )(?:FAIL", " )(?:FAIL"],
  ["G2: UP-6 skips the banner wrapper", "blocks", "R18-UP-6 waits for the idle before its call", "Invoke-R18Banner 'R18-UP-6' {", "& {"],
  ["G2: UP-6 skips the banner wrapper (no call when busy)", "blocks", "R18-UP-6 sends nothing when not idle and the block throws", "Invoke-R18Banner 'R18-UP-6' {", "& {"],
  ["G3: a stop in teardown presses the restore", "restore", "a stop inside teardown never presses the restore, still ends the wave (return 2)", "$global:S16Changed -and $global:R18Slice -eq 'teardown'", "$false"],
  ["F2: a passed control still converts", "blocks", "a passed control or a PASS verdict is unchanged", "if ($V -ne 'FAIL' -or $global:R18Ctl -eq 'PASS') { return $V }", "if ($V -ne 'FAIL') { return $V }"],
  ["F2: F-RAW is not a banner row", "blocks", "R18-F-RAW prints NOT MEASURED (banner clause) when only the banner clause failed under a failed control", "}) } } $global:R18Slice -Banner", "}) } } $global:R18Slice"],
  ["F2: UP-6 is not a banner row", "blocks", "R18-UP-6 applies the same rule: NOT MEASURED, FAIL on another step, FAIL under a passed control", "  } $global:R18Slice -Banner", "  } $global:R18Slice"],
  ["F3: a reused block is not stamped", "blocks", "a reused block runs stamped", "{ Invoke-R18Stamped $r18B }.GetNewClosure()", "$r18B"],
  ["F3: devt setup bypasses the wrapper", "blocks", "R18-UP-DEVT s11 setup goes through the stamping wrapper", "Invoke-R18Node 's11' @('setup', '--only', 'x')", "Invoke-R17Node 's11' @('setup', '--only', 'x')"],
  ["F5: the attempt suffix is lost", "blocks", "the record file is named per slice and attempt", "-att$Att", ""],
  ["F5: a record with text is accepted", "blocks", "a record that holds text is a STOP before anything else", "if ($Block -ne 'teardown' -and @(Get-R18RecordLines", "if ($false -and @(Get-R18RecordLines"],
  ["F6: rows18 is never run", "blocks", "R18-LOGS: the deferred rows follow it, then rows18 runs over the record copy; the evidence key is EVIDENCE", "[void](Invoke-R18Node 's11b' @('rows18', '--from', $r18Rf))", ""],
  ["F7: the old CONSOLE key", "blocks", "R18-LOGS: the deferred rows follow it, then rows18 runs over the record copy; the evidence key is EVIDENCE", "'EVIDENCE console copy written", "'CONSOLE evidence copy written"],
  ["F8: UP-L1 prints before R18-LOGS", "blocks", "R18-UP-L1 waits: a CHECK line now, no ROW until R18-LOGS", "  } -Defer", "  }"],
  ["F8: UP-L1 not FAIL under a NOT MEASURED console", "blocks", "R18-UP-L1 under a NOT MEASURED or missing R18-LOGS is FAIL; otherwise its own verdict", "(-not $Logs -or $Logs -eq 'NOT MEASURED')", "$false"],
  ["F8: SAVE-REFUSE not NOT MEASURED under a NOT MEASURED console", "blocks", "R18-SAVE-REFUSE waits, and is NOT MEASURED under a NOT MEASURED R18-LOGS", "$id -eq 'R18-SAVE-REFUSE' -and $Logs -eq 'NOT MEASURED'", "$false"],
  ["F8: deferred rows are flushed by the sequencer even after a STOP", "blocks", "a STOP before R18-LOGS prints neither deferred row", "return (Stop-R18Wave", "Write-R18Pending 'PASS'; return (Stop-R18Wave"],
  ["F9: a stop does not end the wave's processes (no change)", "seq", "a throw before any state change restores nothing", "  Stop-S16All\n", ""],
  ["F9: a stop does not end the wave's processes (changed)", "restore", "a throw after the first state change restores, then ends (return 2, flag cleared)", "  Stop-S16All\n", ""],
  ["F10: the globals are loaded before the check", "blocks", "a previous wave's globals are a STOP before the load, nothing done", "if ($Block -ne 'teardown' -and (Test-Path -LiteralPath $GlobalsFile))", "if ($false -and (Test-Path -LiteralPath $GlobalsFile))"],
  ["n2: the missing-list STOP stays in the framing", "zero", "the missing-list STOP also reaches the record file", "$env:S9_RAW = $Record; Stop9 \"R18-0:", "Stop9 \"R18-0:"],
  ["warned list not checked", "zero", "the empty warned list not found: a STOP naming it, false", "'uploadfolders-invalid', 'uploadfolders-warned')", "'uploadfolders-invalid')"],
  ["tree check dropped", "zero", "a dirty tree is a STOP before the lists are looked at", "if (-not $r18H.Clean)", "if ($false)"],
  ["STOP line does not end the slice", "seq", "a STOP line ends the slice: no later block, a STOP, return 2", "if ($global:S16Stops -gt $s0) { throw \"block $Name printed a STOP\" }", ""],
  ["row moved out of order (A)", "seq", "liveA18 runs the sheet's order and returns 0", "'r18-up-opt', 'r18-up-6', 'r18-save-refuse'", "'r18-up-6', 'r18-up-opt', 'r18-save-refuse'"],
  ["row moved out of order (B)", "seq", "liveB18 runs the sheet's order and returns 0", "'r18-banner-ctl', 'r18-f-raw', 'r18-f-raw-2'", "'r18-f-raw', 'r18-banner-ctl', 'r18-f-raw-2'"],
  ["gate rows lost", "seq", "toggle OFF: five NOT RUN rows, no later block, return 3, nothing pressed", "'R18-UP-RACE-A', 'R18-UP-DEVT')", "'R18-UP-RACE-A')"],
  ["unreadable toggle passes", "seq", "an unreadable toggle is a STOP before any later block (return 2, no restore)", "if ($reading -notin 'on', 'off')", "if ($false)"],
  ["no stamp after the process", "rows", "the node wrapper stamps also when the process throws", "finally { Set-S12AttachStamp }", "finally { }"],
  ["violations not summed", "rows", "the banner judge's arguments sum the violations", "$viol += [int]$m.Groups[1].Value", "$viol = [int]$m.Groups[1].Value"],
  ["a STOP inside a row still prints it", "rows", "a STOP inside a row prints no ROW and throws", "if ($global:S16Stops -gt $s0) { throw \"row $Id printed a STOP\" }", ""],
  ["worst verdict lost", "rows", "the worst verdict wins and slice=B is appended", "[Math]::Min($best,", "[Math]::Max($best,"],
];

describe.skipIf(!hasPs)("s12-r18-lib.ps1 sequencing, STOP and restore logic, run with stubbed helpers", { timeout: 300_000 }, () => {
  for (const grp of Object.keys(CHECKS)) {
    const real = hasPs ? run(grp, LIB) : {};
    const stub = hasPs ? run(grp, STUB_LIB) : {};
    it(`${grp}: every check holds on the real lib`, () => {
      for (const [name, f] of Object.entries(CHECKS[grp]!)) expect(f(real), name).toBe(true);
    });
    it(`${grp}: every check is red on a stub runner`, () => {
      for (const [name, f] of Object.entries(CHECKS[grp]!)) expect(f(stub), `stub: ${name}`).toBe(false);
    });
  }
  for (const [name, grp, check, from, to] of MUTANTS) {
    it(`mutant "${name}" turns "${check}" red`, () => {
      expect(LIB, "the mutated text is in the lib").toContain(from);
      expect(CHECKS[grp]![check]!(run(grp, LIB.replace(from, to))), name).toBe(false);
    });
  }
  it("Get-R18Verdict ranks like carriedVerdict (s11b-r17b-rules.ts)", () => {
    const sets = [["ROW A PASS", "ROW B FAIL"], ["ROW A NOT MEASURED", "ROW B NOT RUN"], [], ["ROW SAVE-REFUSE-R sdk-leg RECORD"], ["x ROW A PASS", "2026-10-27T10:00:00.000Z s9-win: ROW A NOT DISCRIMINATING y"], ["ROW A STOP: z", "ROW B PASS"]];
    const d = mkdtempSync(join(tmpdir(), "s12r18v-"));
    try {
      const lf = join(d, "lib.ps1");
      writeFileSync(lf, LIB, "utf8");
      const body = sets.map((s, i) => `Write-Host "V${i} $(Get-R18Verdict @(${s.map((l) => `'${l}'`).join(",")}))"`).join("\n");
      const f = join(d, "t.ps1");
      writeFileSync(f, `$Record='x'; . '${lf.replace(/'/g, "''")}'\n${body}\n`, "utf8");
      const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" }).stdout;
      sets.forEach((s, i) => expect(new RegExp(`^V${i} ${carriedVerdict(s).verdict}\\s*$`, "m").test(out), `set ${i}: ${out}`).toBe(true));
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});

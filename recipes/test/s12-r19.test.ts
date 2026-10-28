// Step 12 S7-helpers-d: Run 19's block runner. Its sequencing, STOP/RETURN, restore, swap and gate logic (recipes/s12-r19-lib.ps1) runs in PowerShell with every
// helper stubbed (the s12-r18.test.ts pattern): nothing touches Chrome, a daemon or a port. The same scenarios run on a stub lib that does nothing (every
// check must be red there), and on named mutants of the real file (each must turn its named check red).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkStopReturn, capturePath, proofExit } from "../s12-r19.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIB = readFileSync(join(REPO, "recipes", "s12-r19-lib.ps1"), "utf8").replace(/\r\n/g, "\n");
const STUB_NODE = `
function Invoke-R17Node([string]\$Which, [string[]]\$NodeArgs, [scriptblock]\$Driver = \$null, [int]\$BudgetS = 300, [switch]\$StopOnFail) {
  \$k = "\$Which \$(\$NodeArgs[0])"; Write-Host "NODE \$Which \$(\$NodeArgs -join ',')"; \$global:R17Out = @(\$global:NodeOut[\$k]); if (\$global:NodeOut[\$k]) { Show-S16 \$global:R17Out }
  if (\$global:NodeRc.ContainsKey(\$k)) { return \$global:NodeRc[\$k] }; 0
}
`;
/** The real Invoke-R17Node (read from s11b-r17.ps1 by Get-R18Defs, as the runner does) with only Start-Process faked: it prints node's lines itself and throws on an exit of 2 or of 1 with no ROW/CHECK line. */
const RP = REPO.replace(/\\/g, "/");
const REAL_NODE = `
. '${RP}/recipes/s12-r18-lib.ps1'
$Repo = '${RP}'
$global:S16Pids = @{}; $global:S16Born = @{}; $global:NodeSeq = @{}
function Set-S16Pid($n, $p) { }
function Stop-S16Pid($n) { }
function Start-Process { param($FilePath, $ArgumentList, $WorkingDirectory, [switch]$NoNewWindow, [switch]$PassThru, $RedirectStandardOutput, $RedirectStandardError)
  $w = [IO.Path]::GetFileNameWithoutExtension($ArgumentList[2]); $k = "$w $($ArgumentList[3])"; Write-Host "NODE $w $((@($ArgumentList | Select-Object -Skip 3)) -join ',')"
  $out = $global:NodeOut[$k]; $rc = 0
  if ($global:NodeSeq.ContainsKey($k) -and @($global:NodeSeq[$k]).Count) { $e = @($global:NodeSeq[$k])[0]; $global:NodeSeq[$k] = @(@($global:NodeSeq[$k]) | Select-Object -Skip 1); $out = $e.out; $rc = $e.rc } elseif ($global:NodeRc.ContainsKey($k)) { $rc = $global:NodeRc[$k] }
  [IO.File]::WriteAllLines($RedirectStandardOutput, [string[]]@($(if ($out) { $out }))); [IO.File]::WriteAllText($RedirectStandardError, '')
  $p = [pscustomobject]@{ Handle = 1; Id = 4242; HasExited = $true; ExitCode = $rc }
  $p | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value { param($ms) $true }
  $p
}
$r19Defs = Get-R18Defs '${RP}/recipes/s11b-r17.ps1'
. ([scriptblock]::Create($r19Defs.Funcs['Invoke-R17Node']))
`;
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
/** N-1: a mutant is built with a replacer function (`$'` in the replacement text is not a pattern) and must still parse, or it is red for the wrong reason. */
function mutate(text: string, from: string, to: string): string {
  const m = text.replace(from, () => to);
  const f = join(mkdtempSync(join(tmpdir(), "s12r19m-")), "m.ps1");
  writeFileSync(f, m, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", `$e = $null; $t = $null; [void][Management.Automation.Language.Parser]::ParseFile('${f.replace(/'/g, "''")}', [ref]$t, [ref]$e); $e.Count`], { encoding: "utf8" });
  expect(r.stdout.trim(), "the mutant parses").toBe("0");
  return m;
}

/** A lib that defines every name and does nothing: the "stub runner" the scenarios must fail on. */
const STUB_LIB = [
  "function Get-R19Order([string]$Block) { @() }", "function Invoke-R19Slice([string]$Block) { 0 }", "function Stop-R19Wave([string]$Why) { 0 }", "function Stop-R19([string]$Reason, [string]$Why) { }",
  "function Invoke-R19Swapped([string]$Commit, [scriptblock]$Rows) { }", "function Invoke-R19Rerun { }", "function Invoke-R19Zero([scriptblock]$Zero) { & $Zero }", "function Invoke-R19Closer { }",
  "function Test-R19Gate([string]$Name) { $true }", "function Test-R19UpOptReport { $true }", "function Invoke-R19Logs { }", "function Save-R19Seg([string]$Before) { }", "function Get-R19CapName { 'x' }",
  "function Get-R19RowId([string]$Name) { $Name }", "function Write-R19RowLine { }", "$R19Order = @{}", "$R19Commit = @{}",
].join("\n");

const PRE = (lib: string, dir: string, node: string = STUB_NODE): string => `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Toggle = 'on'
$env:S11_OUT = '${dir}'; $GlobalsFile = '${dir}\\globals.clixml'; $DaemonLog = '${dir}\\daemon.log'; $global:S16Mark = 0; $global:D = 8; $global:W = 7; $global:O = 5
$Steps = 'steps'; $Framing = '${dir}\\framing.txt'; $Record = '${dir}\\record.txt'; $UpOptReport = '${dir}\\upopt.md'
function Say9([string]$m) { Write-Host $m }
function Stop9([string]$m) { $global:S16Stops++; Write-Host "STOP: $m" }
function Show-S16([string[]]$l) { foreach ($t in $l) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Fail-S16([string]$m) { Stop9 $m; throw 'stop' }
function Save-S16 { }
function Load-S16 { }
function Use-S16Options { 5 }
function Restore-S11Safety($o, $b, $row) { Write-Host "RESTORE-CALLED $row"; $global:RestoreRet }
function Set-S9Foreground($h) { $true }
function Close-S16Windows { Write-Host 'CLOSE-WINDOWS' }
function End-S16Actor { }
function Stop-S16All { Write-Host 'STOP-ALL' }
function Get-S11bStopCause($e) { 'cause' }
function Test-S9Live($h) { $true }
function Save-S11bConsole($h, $f) { Set-Content -LiteralPath $f 'safety: disarmed by the user'; $f }
function Close-S11Window($h) { Write-Host 'CLOSE-CAPTURE' }
function Set-S12AttachStamp { }
function Test-S11Own($h) { $true }
function Invoke-S12CloserProbe { $global:CloserRet }
function git { if ($args[0] -eq 'rev-parse') { 'aaaaaaaaaaaabbbbbbbb' } elseif ($args[0] -eq 'ls-files') { 'x' } elseif ($args[0] -eq 'log') { if ($global:Tracked) { 'abc123' } } elseif ($global:Dirty) { 'M f' } }
${node}
$R17Blocks = @{ reload = { Write-Host 'RELOAD' }; console = { Write-Host 'CONSOLE-REOPEN'; $global:D = 8 }; 'rd-restore' = { Write-Host 'RD-RESTORE'; Add-Content -LiteralPath $Record 'ROW RD-RESTORE PASS' } }
. '${lib}'
function Stubs([string]$slice, [string[]]$skip = @()) {
  $global:R19Blocks = @{}
  foreach ($n in @(Get-R19Order $slice)) { if ($skip -contains $n) { continue }; $nn = $n; $global:R19Blocks[$n] = { Write-Host "RAN $nn" }.GetNewClosure() }
}
function T([string]$n, [scriptblock]$b) {
  Write-Host "BEGIN $n"; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16ConsoleRead = $false; $global:S16Stops = 0; $global:RestoreRet = $true; $global:Dirty = $false; $global:Tracked = $true
  $global:NodeRc = @{}; $global:NodeOut = @{}; $global:R19RootAdded = $false; $global:R19Slice = 'liveA19'; $global:CloserRet = $true; $global:R19Reason = ''; $global:R19Pending = [ordered]@{}
  Set-Content -LiteralPath $UpOptReport 'report'; Remove-Item -LiteralPath $Record -Force -ErrorAction Ignore; Remove-Item (Join-Path $env:S11_OUT 'console-*') -Force -ErrorAction Ignore; $global:D = 8; $global:R19SegNext = 1; $global:R19Segs = @(); $global:R19SegLost = $false; $global:R19Rerun = 0
  try { $r = @(& $b)[-1]; Write-Host "RET $r" } catch { Write-Host "THREW $_" }
}
`;
const BODY = `
T orderA { Stubs 'liveA19'; Invoke-R19Slice 'liveA19' }
T orderB { Stubs 'liveB19'; Invoke-R19Slice 'liveB19' }
T orderC { Stubs 'liveC19'; Invoke-R19Slice 'liveC19' }
T orderD { Stubs 'liveD19'; Invoke-R19Slice 'liveD19' }
T orderE { Stubs 'liveE19'; Invoke-R19Slice 'liveE19' }
T throwChanged { Stubs 'liveA19'; $global:S16Changed = $true; $global:R19Blocks['r19-args-1'] = { throw 'boom' }; Invoke-R19Slice 'liveA19' }
T throwClean { Stubs 'liveA19'; $global:R19Blocks['r19-args-1'] = { throw 'boom' }; Invoke-R19Slice 'liveA19' }
T restoreFails { Stubs 'liveA19'; $global:S16Changed = $true; $global:RestoreRet = $false; $global:R19Blocks['r19-args-1'] = { throw 'boom' }; Invoke-R19Slice 'liveA19' }
T namedReason { Stubs 'liveC19'; $global:R19Blocks['r19-choose-4'] = { Stop-R19 'dialog-not-opened' 'no dialog' }; Invoke-R19Slice 'liveC19' }
T guardStop { Stubs 'liveA19'; $global:R19Blocks['r19-args-1'] = { Stop9 'a guard' }; Invoke-R19Slice 'liveA19' }
T swapThrows { $global:R19Slice = 'liveD19'; try { Invoke-R19Swapped 'abc1234' { throw 'rows died' } } catch { Write-Host "CAUGHT $_" } }
T swapFails { $global:R19Slice = 'liveD19'; $global:NodeRc['s12-r19 swap'] = 1; try { Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } } catch { Write-Host "CAUGHT $_" } }
T swapOk { $global:R19Slice = 'liveE19'; Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } }
T swapStale { $global:R19Slice = 'liveD19'; $global:NodeRc['s12-r19 proof'] = 2; Stubs 'liveD19'; $global:R19Blocks['r19-old-args'] = { Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } }; Invoke-R19Slice 'liveD19' }
T swapHeadFails { $global:R19Slice = 'liveD19'; $global:NodeRc['s12-r19 restore-head'] = 2; Stubs 'liveD19'; $global:R19Blocks['r19-old-args'] = { Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } }; Invoke-R19Slice 'liveD19' }
T upoptAbsent { Remove-Item -LiteralPath $UpOptReport -Force; Stubs 'liveB19'; Invoke-R19Slice 'liveB19' }
T upoptUntracked { $global:Tracked = $false; Stubs 'liveB19'; Invoke-R19Slice 'liveB19' }
T upoptPresent { Stubs 'liveB19'; Invoke-R19Slice 'liveB19' }
T conFileOff { $global:S16Toggle = 'off'; Stubs 'liveA19'; Invoke-R19Slice 'liveA19' }
T noDriver { Stubs 'liveE19' @('r19-old-version'); Invoke-R19Slice 'liveE19' }
T zero { $global:NodeOut['s12-r19 proof'] = 'LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered'; Invoke-R19Zero { Show-S16 @('MANIFEST m BUILD b'); Show-S16 @('RULES 0', 'STATE x') }; Write-Host 'END' }
T zeroStale { $global:NodeOut['s12-r19 proof'] = 'LOADED consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION'; $global:NodeRc['s12-r19 proof'] = 2; Stubs 'liveA19'; $global:R19Blocks['r19-0'] = { Invoke-R19Zero { Write-Host 'MUST-NOT-RUN' } }; Invoke-R19Slice 'liveA19' }
T closerStop { $global:CloserRet = $false; Stubs 'liveB19'; $global:R19Blocks['closerprobe'] = { function Invoke-S12CloserProbe { Stop9 'dialog-left-open (CLOSERPROBE)'; $false }; Invoke-R19Closer }; Invoke-R19Slice 'liveB19' }
T closerOpenedNo { $global:CloserRet = $false; Stubs 'liveB19'; $global:R19Blocks['closerprobe'] = { Invoke-R19Closer; Write-Host "HUMAN $($global:R19HumanClick)" }; Invoke-R19Slice 'liveB19' }
T segs { $global:R19Slice = 'liveB19'; $global:R19SegNext = 1; $global:R19Segs = @(); $global:R19SegLost = $false; Save-R19Seg 'reload'; Open-R19Seg; Save-R19Seg 'end'; Write-Host "SEGS $(@($global:R19Segs | ForEach-Object { Split-Path -Leaf $_ }) -join ',')" }
T logs { $global:R19Slice = 'liveA19'; $global:R19SegNext = 1; $global:R19Segs = @(); $global:R19SegLost = $false; $global:R19Pending['R19-ARGS-1'] = 'PASS'; $global:R19Pending['R19-CON-1'] = 'PASS'; Set-Content -LiteralPath $DaemonLog 'x'; Invoke-R19Logs }
T logsLeak { $global:NodeRc['s12-r19 daemonlog'] = 2; Set-Content -LiteralPath $DaemonLog 'x'; Stubs 'liveA19'; $global:R19Blocks['r19-logs'] = { Invoke-R19Logs }; Invoke-R19Slice 'liveA19' }
T restoreRow { $global:R19Slice = 'liveC19'; Invoke-R19Restore }
`;

type Obs = Record<string, string[]>;
function run(lib: string, body: string = BODY, node: string = STUB_NODE): Obs {
  const d = mkdtempSync(join(tmpdir(), "s12r19-"));
  try {
    const f = join(d, "t.ps1");
    writeFileSync(f, PRE(lib.replace(/\\/g, "/").startsWith("function") || lib.includes("\n") ? writeLib(d, lib) : lib, d.replace(/\\/g, "\\"), node) + body, "utf8");
    const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 120_000 }).stdout ?? "";
    const obs: Obs = {};
    let cur = "";
    for (const l of out.split(/\r?\n/)) { const m = /^BEGIN (\S+)$/.exec(l); if (m) { cur = m[1]!; obs[cur] = []; } else if (cur) obs[cur]!.push(l); }
    return obs;
  } finally { rmSync(d, { recursive: true, force: true }); }
}
function writeLib(dir: string, text: string): string { const p = join(dir, "lib.ps1"); writeFileSync(p, text, "utf8"); return p.replace(/\\/g, "\\\\"); }

const ids = (l: string[]): string[] => l.filter((x) => x.startsWith("RAN ")).map((x) => x.slice(4));
const rowsOf = (l: string[]): string[] => l.filter((x) => /^ROW /.test(x)).map((x) => x.split(" ")[1]!);
const PRO = ["preflight", "servers", "files", "window", "reload", "console"];
const EXPECT: Record<string, string[]> = {
  orderA: [...PRO, "r19-0", "r19-banner-ctl", "r19-args-1", "r19-args-2", "r19-args-global", "r19-args-csp", "r19-args-stop", "r19-con-1", "r19-con-2", "r19-con-rej", "r19-con-big", "r19-con-nav", "r19-con-mcp", "r19-con-cap", "r19-con-banner", "r19-args-3", "r19-con-jsoff", "r19-con-3", "r19-con-frame", "r19-con-notea", "r19-con-4", "r19-con-floor", "r19-con-own", "r19-con-file", "r19-restore", "r19-logs", "teardown"],
  orderB: [...PRO, "r19-0", "devprobe", "closerprobe", "r19-up-opt", "r19-banner-ctl", "r19-up-6", "r19-f-raw", "r19-f-raw-2", "r19-f-raw-dir", "r19-keep-1", "r19-keep-2", "r19-keep-3", "r19-con-kept", "r19-keep-overlap-a", "r19-up-devt", "r19-keep-4", "r19-devt-noflag", "r19-sweep-held", "r19-restore", "r19-logs", "teardown"],
  orderC: [...PRO, "r19-0", "root-add", "r19-banner-ctl", "closerprobe", "r19-choose-1", "r19-choose-label", "r19-choose-refuse", "r19-choose-2", "r19-choose-3", "r19-choose-mcp", "r19-choose-kept", "r19-choose-frame", "r19-choose-human", "r19-choose-late", "r19-keep-overlap-b", "r19-choose-4", "r19-choose-disarm", "r19-choose-jsoff", "r19-choose-mcp-d", "r19-g2-1", "r19-g2-2", "r19-restore", "r19-logs", "teardown"],
  orderD: [...PRO, "r19-0", "r19-old-args", "r19-restore", "r19-logs", "teardown"],
  orderE: [...PRO, "r19-0", "r19-old-version", "r19-restore", "r19-logs", "teardown"],
};
const swapBlock = (l: string[]): string[] => l.filter((x) => /^(NODE|RELOAD|CONSOLE-REOPEN|CLOSE-CAPTURE|ROWS|CAUGHT)/.test(x));

/** Every named check: [name, predicate over the observations]. Green on the real lib, red on STUB_LIB and on its mutant. */
const CHECKS: Array<[string, (o: Obs) => boolean]> = [
  ["order: liveA19..E19 run the sheet's blocks in the written order", (o) => Object.keys(EXPECT).every((k) => JSON.stringify(ids(o[k] ?? [])) === JSON.stringify(EXPECT[k]!.filter((n) => !(k === "orderB" && n === "root-add")))) && !(o.orderB ?? []).includes("RAN root-add")],
  ["order: R19-0 is the first row block of every slice", (o) => Object.keys(EXPECT).every((k) => ids(o[k] ?? []).indexOf("r19-0") === 6)],
  ["stop: a throw after a state change prints STOP then RETURN restored=yes readback=equal, after the restore call", (o) => { const l = o.throwChanged ?? []; const s = l.indexOf("STOP throw-after-state"); return s >= 0 && l.indexOf("RESTORE-CALLED R19-RESTORE") > s && /^RETURN 1 after-stop=throw-after-state restored=yes readback=equal$/.test(l[l.findIndex((x) => x.startsWith("RETURN"))] ?? "") && checkStopReturn(l).length === 0; }],
  ["stop: a throw before any state change returns restored=n/a and presses no restore", (o) => { const l = o.throwClean ?? []; return l.some((x) => x === "RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a") && !l.some((x) => x.startsWith("RESTORE-CALLED")); }],
  ["stop: a failed restore says restored=no and the wave stays over", (o) => (o.restoreFails ?? []).some((x) => /^RETURN 1 .* restored=no readback=n\/a$/.test(x))],
  ["stop: every STOP is followed by its one RETURN, in every stopping scenario", (o) => ["throwChanged", "throwClean", "restoreFails", "namedReason", "guardStop", "swapStale", "swapHeadFails", "zeroStale", "closerStop", "logsLeak"].every((k) => (o[k] ?? []).some((x) => x.startsWith("RETURN")) && checkStopReturn(o[k]!).length === 0)],
  ["stop: a named reason is the reason on both lines", (o) => (o.namedReason ?? []).includes("STOP dialog-not-opened") && (o.namedReason ?? []).some((x) => x.startsWith("RETURN 1 after-stop=dialog-not-opened"))],
  ["stop: a guard STOP: line ends the block with a returning STOP", (o) => (o.guardStop ?? []).some((x) => x.startsWith("RETURN 1"))],
  ["swap: the finally restores HEAD, reloads and re-proves when the rows throw", (o) => { const s = swapBlock(o.swapThrows ?? []); const i = s.findIndex((x) => x.includes("restore-head")); return i > 0 && s.slice(i).some((x) => x === "RELOAD") && s.slice(i).some((x) => x.includes("proof,--rerun,1")) && s.some((x) => x.startsWith("CAUGHT")); }],
  ["swap: the finally restores HEAD when the swap itself fails", (o) => (o.swapFails ?? []).some((x) => x.includes("restore-head")) && !(o.swapFails ?? []).includes("ROWS")],
  ["swap: a clean run still ends on restore-head, reload, re-proof (the old build is never the end state)", (o) => { const s = swapBlock(o.swapOk ?? []); return s.indexOf("ROWS") > 0 && s.findIndex((x) => x.includes("restore-head")) > s.indexOf("ROWS") && s.some((x) => x.includes("proof,--rerun,1")); }],
  ["swap: a failed re-proof is the STOP old-build-left-loaded and names the stale extension", (o) => (o.swapStale ?? []).includes("STOP old-build-left-loaded") && (o.swapStale ?? []).some((x) => /stale/.test(x))],
  ["swap: a restoreHead that fails is the STOP old-build-left-loaded", (o) => (o.swapHeadFails ?? []).includes("STOP old-build-left-loaded")],
  ["gate: R19-UP-OPT does not run without the investigator's report (absent, or staged but not committed)", (o) => !ids(o.upoptAbsent ?? []).includes("r19-up-opt") && !ids(o.upoptUntracked ?? []).includes("r19-up-opt") && (o.upoptAbsent ?? []).some((x) => /^ROW R19-UP-OPT NOT RUN .*report is absent/.test(x))],
  ["gate: R19-UP-OPT runs with the report, and then root-add is skipped; without it root-add runs", (o) => ids(o.upoptPresent ?? []).includes("r19-up-opt") && !ids(o.upoptPresent ?? []).includes("root-add") && ids(o.upoptAbsent ?? []).includes("root-add")],
  ["gate: R19-CON-FILE is NOT RUN waits for G11-3 when the toggle does not read on", (o) => (o.conFileOff ?? []).some((x) => /^ROW R19-CON-FILE NOT RUN .* waits for G11-3$/.test(x)) && !ids(o.conFileOff ?? []).includes("r19-con-file")],
  ["rows: a row with no driver prints one ROW NOT RUN, a probe a CHECK, a silent leg nothing", (o) => (o.noDriver ?? []).some((x) => x.startsWith("ROW R19-VERSION NOT RUN")) && rowsOf(o.noDriver ?? []).filter((r) => r === "R19-VERSION").length === 1],
  ["R19-0: LOADED is the second line (after MANIFEST, before RULES) and the row follows HEAD", (o) => { const l = (o.zero ?? []).filter((x) => /^(MANIFEST|LOADED|RULES|STATE|HEAD|ROW)/.test(x)); return l[0]!.startsWith("MANIFEST") && l[1]!.startsWith("LOADED consoleMessages=answered") && l[2] === "RULES 0" && l[l.length - 1] === "ROW R19-0 PASS slice=A"; }],
  ["R19-0: a build that does not answer is a STOP before any state change and the preflight block never runs", (o) => (o.zeroStale ?? []).includes("STOP old-build-left-loaded") && !(o.zeroStale ?? []).includes("MUST-NOT-RUN") && (o.zeroStale ?? []).some((x) => /restored=n\/a/.test(x))],
  ["closer: a left-open dialog is the returning STOP dialog-left-open; opened=no only marks the human-style rows", (o) => (o.closerStop ?? []).includes("STOP dialog-left-open") && (o.closerOpenedNo ?? []).includes("HUMAN False") && !(o.closerOpenedNo ?? []).some((x) => x.startsWith("STOP "))],
  ["segments: one file per segment for B (-1, -2), saved before the reload and the console reopened after", (o) => { const l = o.segs ?? []; return l.includes("SEGS console-liveB19-1.txt,console-liveB19-2.txt") && l.indexOf("CLOSE-CAPTURE") < l.indexOf("CONSOLE-REOPEN") && l.filter((x) => x.startsWith("CAPSEG liveB19")).length === 2; }],
  ["logs: the rows with a console clause print their ROW before R19-LOGS; text-leak is a returning STOP", (o) => { const l = o.logs ?? []; const a = l.indexOf("ROW R19-ARGS-1 PASS"); return a >= 0 && a < l.indexOf("ROW R19-LOGS PASS slice=A") && (o.logsLeak ?? []).includes("STOP text-leak"); }],
  ["restore: R19-RESTORE prints its one ROW after the restore block", (o) => (o.restoreRow ?? []).includes("ROW R19-RESTORE PASS slice=C")],
];

// ---- the same blocks as the entry registers them (recipes/s12-r19.ps1), over the REAL Invoke-R17Node: it prints node's lines and throws on a node exit of 2 (F1, F2, F3) ----
const ENTRY = readFileSync(join(REPO, "recipes", "s12-r19.ps1"), "utf8").replace(/\r\n/g, "\n");
const ENTRY_BLOCKS = ENTRY.split("\n").filter((l) => /^\$global:R19Blocks\['(r19-0|closerprobe|r19-restore|r19-logs|r19-old-args|r19-old-version)'\] = /.test(l)).join("\n");
const GOOD = "LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered";
const OLDB = "LOADED consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION";
const EMPTY = "LOADED consoleMessages=answered entries=0 console=0 exception=0 args=answered";
const REAL_BODY = `
$EntryBlocks = {
${ENTRY_BLOCKS}
}
$R17bZero = { Show-S16 @('MANIFEST m BUILD b'); Show-S16 @('RULES 0', 'STATE x') }
$Dash = [char]0x2014
function Invoke-R19OldArgs { [void](Invoke-R19Node 's12-r19' @('proof')); Say9 "ROW R19-ARGS-OLD NOT RUN $Dash stub driver" }
function Invoke-R19OldVersion { Say9 "ROW R19-VERSION NOT RUN $Dash stub driver" }
function Add-R19RootOnce { }
function Entry([string]$slice) { Stubs $slice; . $EntryBlocks; Set-Content -LiteralPath $DaemonLog 'x' }
$G = '${GOOD}'; $OLD = '${OLDB}'; $EM = '${EMPTY}'
T rZeroGood { $global:NodeOut['s12-r19 proof'] = $G; Entry 'liveA19'; Invoke-R19Slice 'liveA19' }
T rZeroStale { $global:NodeOut['s12-r19 proof'] = $OLD; $global:NodeRc['s12-r19 proof'] = 2; Entry 'liveA19'; Invoke-R19Slice 'liveA19' }
T rZeroFail { $global:NodeOut['s12-r19 proof'] = $EM; $global:NodeRc['s12-r19 proof'] = 1; Entry 'liveA19'; Invoke-R19Slice 'liveA19' }
T rOldArgs { Entry 'liveD19'; $global:NodeSeq['s12-r19 proof'] = @(@{ rc = 0; out = $G }, @{ rc = 2; out = $OLD }, @{ rc = 0; out = $G }); Invoke-R19Slice 'liveD19' }
T rHeadFails { Entry 'liveD19'; $global:NodeOut['s12-r19 restore-head'] = 'RESTOREHEAD failed'; $global:NodeRc['s12-r19 restore-head'] = 2; $global:NodeOut['s12-r19 proof'] = $G; Invoke-R19Slice 'liveD19' }
T rRerunFails { Entry 'liveD19'; $global:NodeSeq['s12-r19 proof'] = @(@{ rc = 0; out = $G }, @{ rc = 2; out = $OLD }, @{ rc = 2; out = $OLD }); Invoke-R19Slice 'liveD19' }
T rLogsLeak { Entry 'liveA19'; $global:NodeOut['s12-r19 proof'] = $G; $global:NodeOut['s12-r19 daemonlog'] = 'DAEMONLOG liveA19 sentinel=1 console-text=0 args-text=0'; $global:NodeRc['s12-r19 daemonlog'] = 2; Invoke-R19Slice 'liveA19' }
T rSwapFails { Entry 'liveD19'; $global:NodeOut['s12-r19 proof'] = $G; $global:NodeOut['s12-r19 swap'] = 'SWAP failed: the restore (HEAD rebuild) failed'; $global:NodeRc['s12-r19 swap'] = 2; Invoke-R19Slice 'liveD19' }
T rSegThrows { Entry 'liveD19'; $global:NodeOut['s12-r19 proof'] = $G; function Save-R19Seg([string]$Before) { throw 'seg' }; Invoke-R19Slice 'liveD19' }
T rReloadThrows { Entry 'liveD19'; $global:NodeOut['s12-r19 proof'] = $G; $R17Blocks = @{ reload = { throw 'reload' }; console = { $global:D = 8 }; 'rd-restore' = { Add-Content -LiteralPath $Record 'ROW RD-RESTORE PASS' } }; Invoke-R19Slice 'liveD19' }
T rVersion { Entry 'liveE19'; $global:NodeOut['s12-r19 proof'] = $G; Invoke-R19Slice 'liveE19' }
`;
const at = (l: string[], pred: (x: string) => boolean, from = 0): number => { for (let i = Math.max(from, 0); i < l.length; i++) if (pred(l[i]!)) return i; return -1; };
const stopped = (l: string[], reason: string): boolean => l.includes(`STOP ${reason}`) && l.some((x) => new RegExp(`^RETURN 1 after-stop=${reason} `).test(x)) && checkStopReturn(l).length === 0;
const CHECKS_REAL: Array<[string, (o: Obs) => boolean]> = [
  ["R19-0 real node: LOADED is printed once, as the line right after MANIFEST (R7.2), then the row", (o) => { const l = o.rZeroGood ?? []; const m = at(l, (x) => x.startsWith("MANIFEST")); return m >= 0 && l[m + 1] === GOOD && l.filter((x) => x.startsWith("LOADED ")).length === 1 && l.includes("ROW R19-0 PASS slice=A") && !l.some((x) => x.startsWith("STOP ")); }],
  ["R19-0 real node: a stale build is the STOP old-build-left-loaded, names the stale extension, runs no state change and prints its RETURN", (o) => { const l = o.rZeroStale ?? []; return stopped(l, "old-build-left-loaded") && l.some((x) => /^STOP: .*stale.*\(old-build-left-loaded\)$/.test(x)) && l.includes(OLDB) && !l.some((x) => x.startsWith("MANIFEST")) && l.some((x) => /restored=n\/a/.test(x)); }],
  ["R19-0 real node: wrong counts are the FAIL row, not a STOP", (o) => { const l = o.rZeroFail ?? []; return l.includes("ROW R19-0 FAIL slice=A") && !l.some((x) => x.startsWith("STOP ")) && l.some((x) => x.startsWith("SLICE liveA19 done")); }],
  ["R19-ARGS-OLD real node: the old build's expected UNKNOWN_METHOD proof reaches the row, then restore-head, reload and the re-proof, with no STOP", (o) => { const l = o.rOldArgs ?? []; const r = at(l, (x) => x.startsWith("ROW R19-ARGS-OLD NOT RUN")); const h = at(l, (x) => x.includes("restore-head"), r); return r >= 0 && h > r && at(l, (x) => x === "RELOAD", h) > h && at(l, (x) => x.includes("proof,--rerun,1"), h) > h && !l.some((x) => x.startsWith("STOP ")) && l.some((x) => x.startsWith("SLICE liveD19 done")); }],
  ["restore-head real node: a failed restore-head is the STOP old-build-left-loaded, and the reload and the re-proof still run", (o) => { const l = o.rHeadFails ?? []; const h = at(l, (x) => x.includes("restore-head")); return stopped(l, "old-build-left-loaded") && h >= 0 && at(l, (x) => x === "RELOAD", h) > h && at(l, (x) => x.includes("proof,--rerun,1"), h) > h && l.some((x) => /restoreHead failed/.test(x)); }],
  ["re-proof real node: a failed re-proof is the STOP old-build-left-loaded and names the stale extension", (o) => { const l = o.rRerunFails ?? []; return stopped(l, "old-build-left-loaded") && l.some((x) => /^STOP: .*stale.*\(old-build-left-loaded\)$/.test(x)); }],
  ["R19-LOGS real node: a leak prints the R19-LOGS ROW and rows19 first, then the returning STOP text-leak", (o) => { const l = o.rLogsLeak ?? []; const r = at(l, (x) => x === "ROW R19-LOGS FAIL slice=A"); const w = at(l, (x) => x.includes("NODE s12-r19 rows19")); const s = at(l, (x) => x === "STOP text-leak"); return r >= 0 && w > r && s > w && stopped(l, "text-leak"); }],
  ["swap real node: M1's message from a failing swap reaches the record, and the finally still restores HEAD", (o) => { const l = o.rSwapFails ?? []; const m = at(l, (x) => x.startsWith("SWAP failed: ")); return m >= 0 && at(l, (x) => x.includes("restore-head"), m) > m && l.some((x) => x.startsWith("RETURN 1 ")) && checkStopReturn(l).length === 0; }],
  ["F2: a throw from the segment save does not skip restore-head, the reload or the re-proof, and ends in old-build-left-loaded", (o) => { const l = o.rSegThrows ?? []; const h = at(l, (x) => x.includes("restore-head")); return stopped(l, "old-build-left-loaded") && h >= 0 && at(l, (x) => x === "RELOAD", h) > h && at(l, (x) => x.includes("proof,--rerun,1"), h) > h; }],
  ["F2: a throw from the reload does not skip the re-proof, and ends in old-build-left-loaded", (o) => { const l = o.rReloadThrows ?? []; return stopped(l, "old-build-left-loaded") && at(l, (x) => x.includes("proof,--rerun,1")) > 0; }],
  ["R19-VERSION real node: the old-build row runs inside the swap and the slice ends with the build restored and proven", (o) => { const l = o.rVersion ?? []; const r = at(l, (x) => x.startsWith("ROW R19-VERSION NOT RUN")); return r >= 0 && at(l, (x) => x.includes("proof,--rerun,1"), r) > r && !l.some((x) => x.startsWith("STOP ")); }],
];

const MUTANTS: Array<[string, string, string, string]> = [
  ["skipped restore on throw", "elseif ($global:S16Changed -and -not $global:S16InRestore) {", "elseif ($false) {", "stop: a throw after a state change"],
  ["swap without the finally restore", "  } finally {\n    $left = @()", "  } catch { throw }\n  if ($true) {\n    $left = @()", "swap: the finally restores HEAD, reloads and re-proves when the rows throw"],
  ["STOP without a RETURN", '  Say9 "RETURN $($global:R19StopSeq) after-stop=$reason restored=$restored readback=$readback"\n', "", "stop: every STOP is followed by its one RETURN"],
  ["row out of order", "'r19-args-1', 'r19-args-2'", "'r19-args-2', 'r19-args-1'", "order: liveA19..E19"],
  ["UP-OPT without the report", "if ($Name -eq 'r19-up-opt' -and -not (Test-R19UpOptReport))", "if ($false)", "gate: R19-UP-OPT does not run"],
  ["R19-0 after another block", "'r19-0', 'r19-old-args'", "'r19-old-args', 'r19-0'", "order: liveA19..E19"],
  ["LOADED not released after MANIFEST", "'^MANIFEST '", "'^NEVER '", "R19-0: LOADED is the second line"],
  ["re-proof skipped", "    try { if (-not (Invoke-R19Rerun)) {", "    try { if ($false) {", "swap: the finally restores HEAD, reloads and re-proves"],
  ["a staged file counts as committed", '([bool]"$(git log -1 --format=%H -- $UpOptReport)".Trim())', "(@(git ls-files -- $UpOptReport).Count -gt 0)", "gate: R19-UP-OPT does not run"],
];

describe.skipIf(!hasPs)("Run 19's entry blocks over the real Invoke-R17Node (a node exit of 2 throws, node's lines print themselves)", () => {
  it("the entry registers the six blocks the harness reads", () => { expect(ENTRY_BLOCKS.split("\n").length).toBe(6); });
  const real = run(LIB, REAL_BODY, REAL_NODE);
  const stub = run(STUB_LIB, REAL_BODY, REAL_NODE);
  for (const [name, pred] of CHECKS_REAL) {
    it(`green on the real lib, red on a stub: ${name}`, () => {
      expect(pred(real), "real").toBe(true);
      expect(pred(stub), "stub").toBe(false);
    });
  }
  for (const [what, from, to, check] of REAL_MUTANTS) {
    it(`mutant "${what}" turns "${check}" red`, () => {
      expect(LIB.includes(from), "the mutated text exists").toBe(true);
      const o = run(mutate(LIB, from, to), REAL_BODY, REAL_NODE);
      expect(CHECKS_REAL.filter(([n, p]) => n.startsWith(check) && !p(o)).length).toBeGreaterThan(0);
    });
  }
});

const REAL_MUTANTS: Array<[string, string, string, string]> = [
  ["a node exit of 2 is not mapped back (the stub's assumption)", "'ended in a STOP$'", "'NEVER-MATCHES$'", "R19-0 real node: a stale build"],
  ["node's exit-1-no-ROW throw is not mapped back", "'exited 1 with no ROW or CHECK line'", "'NEVER-MATCHES'", "R19-0 real node: wrong counts"],
  ["LOADED is printed by node itself, then again after MANIFEST", "{ $global:R19Held += @($l) }", "{ & $global:R19Real $l; $global:R19Held += @($l) }", "R19-0 real node: LOADED is printed once"],
  ["R19-LOGS never sees a leak code", "$codes[0] -eq 2 -or $codes[1] -eq 2 -or $codes[2] -eq 2", "$false", "R19-LOGS real node"],
  ["the segment save is not isolated in the finally", "try { Save-R19Seg 'reload' } catch { $left += 'the capture segment could not be saved' }", "Save-R19Seg 'reload'", "F2: a throw from the segment save"],
  ["the reload is not isolated in the finally", "try { Invoke-R19Stamped $R17Blocks['reload'] } catch { $left += 'the reload after restoreHead failed: the extension may still run the old build' }", "Invoke-R19Stamped $R17Blocks['reload']", "F2: a throw from the reload"],
  ["a failed restore-head is not a STOP", "if (-not $okHead) { $left +=", "if ($false) { $left +=", "restore-head real node"],
];

describe.skipIf(!hasPs)("Run 19's runner logic with stubbed helpers", () => {
  const real = run(LIB);
  const stub = run(STUB_LIB);
  for (const [name, pred] of CHECKS) {
    it(`green on the real lib, red on a stub: ${name}`, () => {
      expect(pred(real), "real").toBe(true);
      expect(pred(stub), "stub").toBe(false);
    });
  }
  for (const [what, from, to, check] of MUTANTS) {
    it(`mutant "${what}" turns "${check}" red`, () => {
      expect(LIB.includes(from), "the mutated text exists").toBe(true);
      const o = run(mutate(LIB, from, to));
      const red = CHECKS.filter(([n, p]) => n.startsWith(check) && !p(o));
      expect(red.length).toBeGreaterThan(0);
    });
  }
  it("proofExit: only UNKNOWN_METHOD or VERSION is a STOP; args=other and an ERROR read are R19-0's FAIL (F6)", () => {
    const ok = { entries: 11, console: 10, exception: 1 };
    expect(proofExit("answered", "answered", ok)).toBe(0);
    expect(proofExit("answered", "other", ok)).toBe(1);
    expect(proofExit("ERROR", "answered", ok)).toBe(1);
    expect(proofExit("answered", "answered", { entries: 0, console: 0, exception: 0 })).toBe(1);
    expect(proofExit("UNKNOWN_METHOD", "answered", ok)).toBe(2);
    expect(proofExit("answered", "VERSION", ok)).toBe(2);
  });
  it("swap prints its own failure message and exits 2, so M1's wording reaches the record (F1 f)", () => {
    const ts = readFileSync(join(REPO, "recipes", "s12-r19.ts"), "utf8");
    expect(ts).toMatch(/try \{ swapOldBuild\([^\n]*\} catch \(e\) \{ console\.log\(`SWAP failed: \$\{swapFailText\(e\)\}`\); return 2; \}/); // N-4: the text goes through swapFailText (no raw fs path)
  });
  it("a capture name matches the TS capturePath for every slice and segment", () => {
    expect(capturePath("liveA19", 1)).toBe("console-liveA19.txt");
    expect(capturePath("liveB19", 2)).toBe("console-liveB19-2.txt");
    expect(LIB).toContain('"console-$Slice.txt" } else { "console-$Slice-$K.txt"');
  });
});

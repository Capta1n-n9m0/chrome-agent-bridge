// Step 13 S5-drivers-C3: recipes/s13-r20-c.ps1 (the liveC20 entry script) and recipes/s13-r20-c-defs.ps1 run in PowerShell with every helper stubbed (the s13-r20-b-ps.test.ts pattern):
// nothing touches Chrome, a daemon or a port. The DevTools helpers (s13-devt.ps1) are loaded and then replaced by stubs.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkStopReturn20, STOP_REASONS_20, lineCmd20 } from "../s13-r20.js";
import { MARKER } from "../s13-r20-c.js";
const REPO = (process.env.S13_R20_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")).replace(/\\/g, "/");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const read = (f: string): string => readFileSync(join(REPO, "recipes", f), "utf8");
const SLICE_C_STOPS = ["build-not-loaded", "extension-disabled", "reload-failed", "dialog-left-open", "devtools-left-open", "throw-after-state", "old-build-left-loaded", "not-restored", "text-leak"];
const PRE = (dir: string): string => `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Toggle = 'on'; $global:S16Pids = @{}
$env:S11_OUT = '${dir}'; $GlobalsFile = '${dir}\\g.clixml'; $DaemonLog = '${dir}\\daemon.log'; $global:S16Mark = 0; $global:D = 8; $global:W = 7; $global:O = 5
$Repo = '${dir}'; $Steps = 'steps'; $Att = 1; New-Item -ItemType Directory -Force '${dir}\\steps' | Out-Null
$Framing = '${dir}\\framing.txt'; $Record = '${dir}\\record.txt'; $UpOptReport = '${dir}\\u.md'; $FoundJson = '${dir}\\found.json'; $NowJson = '${dir}\\now.json'
function Say9([string]$m) { Write-Host $m }; function Stop9([string]$m) { $global:S16Stops++; Write-Host "STOP: $m" }
function Show-S16([string[]]$l) { foreach ($t in $l) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Fail-S16([string]$m) { Stop9 $m; throw 'stop' }; function Save-S16 { }; function Load-S16 { }
function Use-S16Options { 5 }; function Restore-S11Safety($o, $b, $row) { Write-Host "RESTORE-CALLED $row"; $true }; function Set-S9Foreground($h) { $true }
function Close-S16Windows { }; function End-S16Actor { }; function Stop-S16All { }
function Get-S11bStopCause($e) { 'cause' }; function Test-S9Live($h) { $true }; function Save-S11bConsole($h, $f) { Set-Content -LiteralPath $f 'a'; $f }
function Close-S9Window($h) { }; function Set-S12AttachStamp { }
function Invoke-R17Node([string]$Which, [string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [switch]$StopOnFail) {
  $k = "$Which $($NodeArgs -join ' ')"; Write-Host "NODE $k"; $global:R17Out = @(); $rc = 0
  foreach ($p in @($global:NodeOut.Keys | Sort-Object { $_.Length } -Descending)) { if ($k -like "$p*") { $global:R17Out = @($global:NodeOut[$p]); break } }
  foreach ($p in @($global:NodeRc.Keys | Sort-Object { $_.Length } -Descending)) { if ($k -like "$p*") { $rc = $global:NodeRc[$p]; break } }
  if ($rc -eq 2) { throw 'node ended in a STOP' }; if ($global:R17Out.Count) { Show-S16 $global:R17Out }; $rc
}
function git { if ($args[0] -eq 'rev-parse') { 'aaaaaaaaaaaabbbbbbbb' } elseif ($args[0] -eq 'status') { } }
$R17Blocks = @{ reload = { Write-Host 'RELOAD' }; console = { Write-Host 'CONSOLE' }; 'rd-restore' = { Write-Host 'RD-RESTORE' } }; $R17bZero = { }
. '${REPO}/recipes/s12-r18-lib.ps1'   # only for Get-R18Defs, as the entry script does
. '${REPO}/recipes/s13-r20.ps1'
. '${REPO}/recipes/s13-devt.ps1'
. '${REPO}/recipes/s13-r20-c-defs.ps1'
function Set-S11Front($h, $w) { Write-Host "FRONT $h $w" }; function Test-S11Own($h) { $true }; function Close-S11Window($h) { }
function Test-S13Pane($h) { $global:Pane }; function Get-S13Titles { @($global:Titles) }; function Test-S13Marker([string]$m) { $m -match '^[A-Za-z0-9_.=&-]{1,40}$' }
function Get-S13Control($h, $p, $m, $leg) { Write-Host "CTL $m $leg"; $global:Ctl }
function Open-S13DevTools($h, $p, $s = '') { Write-Host "OPEN [$s]"; [pscustomobject]@{ opened = $global:Opened; side = $s; done = $global:Done; now = '' } }
function Close-S13DevTools($h, $p) { Write-Host 'CLOSE'; if ($global:CloseThrows) { throw 'close failed' }; [pscustomobject]@{ closed = 1; windows = 0; pane = 0; remaining = $global:Remaining } }
function Read-S13DockSide($h, $p) { Write-Host 'READSIDE'; $global:Sides[0]; $global:Sides = @($global:Sides | Select-Object -Skip 1) + @($global:Sides[0]) }
function Set-S13DockSide($h, $p, $s) { Write-Host "SETSIDE $s"; [pscustomobject]@{ done = $true; changed = $true; now = $s } }
function Read-S13Flag { $global:Flag }
function global:Get-S12DialogCount($h) { 0 }
$global:Orig = @{}; foreach ($n in 'Invoke-R20Zero', 'Invoke-R19Row', 'Save-R19Seg', 'Open-R19Seg', 'Invoke-R19Rerun', 'Invoke-R20RestoreCheck', 'Get-R19DlgWindows', 'Get-S12DialogCount', 'Invoke-R20Logs', 'Test-R19ReloadGaveUp', 'Test-S11Own') { $global:Orig[$n] = (Get-Item "function:$n").ScriptBlock }
function T([string]$n, [scriptblock]$b) {
  foreach ($k in $global:Orig.Keys) { Set-Item "function:global:$k" $global:Orig[$k] }
  Write-Host "BEGIN $n"; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Stops = 0; $global:NodeOut = @{}; $global:NodeRc = @{}; $global:R20Port = 8081
  $global:R19Slice = 'liveC20'; $global:R19Reason = ''; $global:R19Pending = [ordered]@{}; $global:R19StopSeq = 0; $global:R19Segs = @(); $global:R19SegNext = 1; $global:R19SegLost = $false; $global:R20Carry = @{}
  $global:Pane = $false; $global:Titles = @(); $global:Ctl = [pscustomobject]@{ windows = 1; title = 'ok'; attached = 'yes'; targets = 12 }; $global:Opened = $true; $global:Done = $true; $global:Remaining = 0; $global:CloseThrows = $false
  $global:Sides = @('bottom'); $global:Flag = 'yes'; $global:W = 7; $global:O = 0; $global:R19Xk = 0
  $global:R19Blocks = @{}; Register-R20Blocks; $global:R19Blocks['root-add'] = { Write-Host 'ROOT-ADD' }; Register-R20CBlocks
  try { & $b } catch { Write-Host "THREW $_" }; Write-Host "REASON [$global:R19Reason]"
}
`;
const BODY = `
T reg { Write-Host "MISSING $(@(Get-R20CMissingBlocks 'liveC20').Count)"; [void]$global:R19Blocks.Remove('flag'); Write-Host "MISS2 $(@(Get-R20CMissingBlocks 'liveC20') -join ',')"; Write-Host "ORDER $((Get-R19Order 'liveC20') -join ',')"; Write-Host "DDORDER $((Get-R19Order 'dockdiag') -join ',')"; Write-Host "DDMISSING $(@(Get-R20CMissingBlocks 'dockdiag').Count)" }
T pure {
  Write-Host "W $((Get-R20CLegWords @('2026-10-30T10:00:00.000Z LEG R20-DEVT-EARLY undocked PASS', 'LEG R20-DEVT-EARLY docked RECORD devtools-control-unreadable', 'LEG R20-DEVT-UNDOCK undock FAIL', 'LEG R20-DEVT-EARLY x NOT MEASURED the tab was attached before the open', 'ROW R20-DEVT-EARLY PASS') 'R20-DEVT-EARLY') -join ',')"
  Write-Host "R $((Get-R20CRefusing @('CHECK R20-DEVT-UNDOCK finding=devtools-refuses leg=undock', 'noise CHECK R20-DEVT-EARLY finding=devtools-refuses leg=docked', 'CHECK R20-UP-DEVT finding=devtools-refuses leg=x')) -join ',')"
  $p = Get-R20CPick @('CHECK gate-cond run=yes refusing-legs=2', 'CHECK gate-cond under=undocked leg=undocked cond=none not-rerun=docked'); Write-Host "P $($p.under) $($p.leg) $($p.cond)"
  Write-Host "PN $($null -eq (Get-R20CPick @('CHECK gate-cond run=yes refusing-legs=1')))"
  Write-Host "F $(Format-R20Ctl ([pscustomobject]@{ windows = $null; title = 'n/a'; attached = 'yes'; targets = 3 })) | $(Format-R20Ctl ([pscustomobject]@{ windows = 1; title = 'ok'; attached = 'no'; targets = 12 })) | $(Format-R20Ctl ([pscustomobject]@{ windows = 0; title = 'none'; attached = 'unread'; targets = 0 }))"
  $global:R20DockFound = 'undock'; Write-Host "S $(Get-R20CSide 'undocked') $(Get-R20CSide 'docked')"; $global:R20DockFound = 'right'; Write-Host "S2 $(Get-R20CSide 'docked')"; $global:R20DockFound = 'unread'; Write-Host "S3 $(Get-R20CSide 'docked')"
  Write-Host "M $(($R20CMark.Keys | Sort-Object | ForEach-Object { "$_=$($R20CMark[$_])" }) -join ',')"
}
T handlers {
  $h = New-R20CHandlers 'R20-DEVT-UNDOCK' 'undock' 'undock' 's12x=r20u1' @('ctl0', 'open', 'ctl1', 'close') 'undock'
  Write-Host "IDS $($h.Keys -join ',')"
  foreach ($k in $h.Keys) { Write-Host "A $k=$(& $h[$k])" }
  $global:Opened = $false; Write-Host "FAIL $(& $h['R20-DEVT-UNDOCK-undock-open'])"; $global:Opened = $true; $global:Done = $false; Write-Host "NOTDONE $(& $h['R20-DEVT-UNDOCK-undock-open'])"
  $global:CloseThrows = $true; Write-Host "UNREAD $(& $h['R20-DEVT-UNDOCK-undock-close'])"
  $c = New-R20CHandlers 'R20-SWEEP-HELD' 'docked' 'docked' 's12x=r20csw' @('ctl2', 'check', 'close'); $global:Pane = $true; Write-Host "CHECK $(& $c['R20-SWEEP-HELD-docked-check']) $(& $c['R20-SWEEP-HELD-docked-ctl2'])"
  $global:Pane = $false; Write-Host "CHECK2 $(& $c['R20-SWEEP-HELD-docked-check'])"; $global:Titles = @([pscustomobject]@{ h = 9; title = 'DevTools - localhost:8081/a.html' }); Write-Host "CHECK3 $(& $c['R20-SWEEP-HELD-docked-check'])"
  try { New-R20CHandlers 'R' 'l' 's' "x'; Remove-Item" @('ctl0') } catch { Write-Host "BADMARK $_" }
  try { New-R20CHandlers 'R' 'l' 's' 's12x=a' @('bogus') } catch { Write-Host "BADSTEP $_" }
}
T zeroRead {
  $global:Sides = @('right'); function global:Invoke-R20Zero($z, $row) { Write-Host "ZERO $row" }
  & $global:R19Blocks['r20-0c']; Write-Host "FOUND $global:R20DockFound GATE $global:R20CGate"
}
T zeroUnread {
  $global:Opened = $false; $global:NodeRc['s13-r20-c gate-dock'] = 3; function global:Invoke-R20Zero($z, $row) { Write-Host "ZERO $row" }
  & $global:R19Blocks['r20-0c']; Write-Host "FOUND $global:R20DockFound GATE $global:R20CGate"
  function global:Invoke-R19Row { Write-Host 'ROWRUN' }; & $global:R19Blocks['r20-devt-undock']; & $global:R19Blocks['r20-devt-early']; & $global:R19Blocks['r20-up-devt']; & $global:R19Blocks['r20-keep-4']; & $global:R19Blocks['r20-sweep-held']; Write-Host 'SKIPPED-ALL'
}
T zeroGateCrash { $global:NodeRc['s13-r20-c gate-dock'] = 2; function global:Invoke-R20Zero($z, $row) { }; & $global:R19Blocks['r20-0c'] }
T zeroLeft { $global:Remaining = 1; function global:Invoke-R20Zero($z, $row) { }; & $global:R19Blocks['r20-0c'] }
T flag { $global:Flag = 'unread'; & $global:R19Blocks['flag']; & $global:R19Blocks['flag'] }
T guarded {
  Invoke-R20CGuarded 'R20-X' { Write-Host 'BODY' }; Write-Host 'OK1'
  $global:Remaining = 2; try { Invoke-R20CGuarded 'R20-X' { Write-Host 'BODY' } } catch { Write-Host "LEFT $_ [$global:R19Reason]" }
  $global:R19Reason = ''; try { Invoke-R20CGuarded 'R20-X' { throw 'row failed' } } catch { Write-Host "ROWERR $_ [$global:R19Reason]" }
  $global:Remaining = 0; $global:CloseThrows = $true; try { Invoke-R20CGuarded 'R20-X' { Write-Host 'BODY' } } catch { Write-Host "CLOSEERR $_ [$global:R19Reason]" }
}
T row {
  function global:Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS) { Write-Host "ROWRUN $id $($cmd -join ' ') $($StepList[0].k) $($StepList[0].s) $($StepList[0].h.Keys -join ',') $Actor $BudgetS" }
  $global:R20CGate = 'run'; $global:R20DockFound = 'bottom'
  $global:NodeOut['s13-r20-c devt-undock'] = ''; & $global:R19Blocks['r20-devt-undock']
  & $global:R19Blocks['r20-devt-early']
}
T devtLegs {
  $global:R20CGate = 'run'
  function global:Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS) { $global:R17Out = if ($id -eq 'R20-DEVT-UNDOCK') { @('LEG R20-DEVT-UNDOCK undock FAIL', 'CHECK R20-DEVT-UNDOCK finding=devtools-refuses leg=undock') } else { @('LEG R20-DEVT-EARLY undocked PASS', 'LEG R20-DEVT-EARLY docked NOT MEASURED x') } }
  & $global:R19Blocks['r20-devt-undock']; & $global:R19Blocks['r20-devt-early']
  Write-Host "WORDS $($global:R20CWords -join ',') REFUSE $($global:R20CRefuse -join ',')"
}
T condNone {
  $global:R20CGate = 'run'; $global:R20CWords = @('PASS', 'RECORD'); $global:NodeRc['s13-r20-c gate-cond'] = 3
  function global:Invoke-R19Row { Write-Host 'ROWRUN' }; foreach ($n in 'r20-up-devt', 'r20-keep-4', 'r20-sweep-held') { & $global:R19Blocks[$n] }; Write-Host 'NONE-RAN'
}
T condNoWords {
  $global:R20CGate = 'run'; $global:R20CRefuse = @('docked', 'undocked'); $global:NodeRc['s13-r20-c gate-cond'] = 3
  [void](Test-R20CCond)
}
T condRun {
  $global:R20CGate = 'run'; $global:R20CRefuse = @('docked', 'undocked'); $global:R20CWords = @('PASS', 'FAIL', 'FAIL')
  $global:NodeOut['s13-r20-c gate-cond'] = @('CHECK gate-cond run=yes refusing-legs=2', 'CHECK gate-cond under=undocked leg=undocked cond=none not-rerun=docked')
  Write-Host "COND $(Test-R20CCond) $(Test-R20CCond)"
}
T condBad { $global:R20CGate = 'run'; $global:NodeOut['s13-r20-c gate-cond'] = @('CHECK gate-cond run=yes refusing-legs=1'); try { [void](Test-R20CCond) } catch { Write-Host "BAD $_" } }
T condStop { $global:R20CGate = 'run'; $global:NodeRc['s13-r20-c gate-cond'] = 2; try { [void](Test-R20CCond) } catch { Write-Host "STOPPED $_" } }
T upDevt {
  $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'undock'; leg = 'undocked'; cond = 'earlier' }; $global:R20CCondSet = $true
  function global:Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS) { Write-Host "ROWRUN $id $($cmd -join ' ') $($StepList[0].h.Keys -join ',')" }
  & $global:R19Blocks['r20-up-devt']; & $global:R19Blocks['r20-up-devt']; Write-Host "ROOT $global:R20CRoot"
}
T keep4 {
  $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'docked'; leg = 'docked'; cond = 'none' }; $global:R20CCondSet = $true; $global:R20DockFound = 'undock'
  function global:Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS) { Write-Host "ROWRUN $id $($cmd -join ' ') $($StepList[0].h.Keys -join ',')"; Write-Host "OPENANS $(& $StepList[0].h['R20-KEEP-4-docked-open'])" }
  & $global:R19Blocks['r20-keep-4']
}
T sweepOk {
  $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'undock'; leg = 'undocked'; cond = 'earlier' }; $global:R20CCondSet = $true
  $global:NodeOut['s13-r20-c sweep-held --leg undocked --cond earlier --phase 1'] = @('LEG R20-SWEEP-HELD control-pre PASS'); function global:Test-R19ReloadGaveUp($n) { $false }
  function global:Open-R19Seg { Write-Host 'OPENSEG' }; function global:Invoke-R19Rerun { Write-Host 'RERUN'; $true }; function global:Save-R19Seg($b) { Write-Host "SAVESEG $b" }
  function global:Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS) { Write-Host "ROWRUN $id $($cmd -join ' ') $($StepList[0].h.Keys -join ',') carry=$(@($global:R20Carry[$id]).Count)" }
  & $global:R19Blocks['r20-sweep-held']; Write-Host "CARRY-AFTER $($global:R20Carry.ContainsKey('R20-SWEEP-HELD'))"
}
T sweepNm {
  $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'undock'; leg = 'undocked'; cond = 'earlier' }; $global:R20CCondSet = $true
  $global:NodeRc['s13-r20-c sweep-held --leg undocked --cond earlier --phase 1'] = 3; $global:NodeOut['s13-r20-c sweep-held --leg undocked --cond earlier --phase 1'] = @('LEG R20-SWEEP-HELD control-pre NOT MEASURED the earlier attach did not answer 2')
  function global:Invoke-R19Rerun { Write-Host 'RERUN'; $true }; function global:Save-R19Seg($b) { Write-Host "SAVESEG $b" }; function global:Invoke-R19Row { Write-Host 'ROWRUN-PHASE2' }
  & $global:R19Blocks['r20-sweep-held']; Write-Host "CARRY-AFTER $($global:R20Carry.ContainsKey('R20-SWEEP-HELD'))"
}
T sweepStale {
  $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'undock'; leg = 'undocked'; cond = 'earlier' }; $global:R20CCondSet = $true
  function global:Open-R19Seg { }; function global:Invoke-R19Rerun { $false }; function global:Save-R19Seg($b) { }; function global:Invoke-R19Row { Write-Host 'ROWRUN-PHASE2' }
  & $global:R19Blocks['r20-sweep-held']
}
T sweepStop { $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'undock'; leg = 'undocked'; cond = 'earlier' }; $global:R20CCondSet = $true; $global:NodeRc['s13-r20-c sweep-held'] = 2; $global:NodeOut['s13-r20-c sweep-held'] = @('STOPWHY devtools-left-open'); & $global:R19Blocks['r20-sweep-held'] }
T restoreOk {
  $global:R20DockFound = 'left'; $global:Sides = @('left'); function global:Invoke-R20RestoreCheck { Write-Host 'RESTORECHECK' }; function global:Get-R19DlgWindows { @() }
  & $global:R19Blocks['r20-restore']
}
T restoreDiff { $global:NodeRc['s13-r20 dock'] = 2; $global:R20DockFound = 'left'; $global:Sides = @('bottom'); try { & $global:R19Blocks['r20-restore'] } catch { Write-Host "THREWR $_" } }
T restoreUnread { $global:NodeRc['s13-r20 dock'] = 2; $global:R20DockFound = 'unread'; $global:R20CDockChanged = $true; $global:Sides = @('bottom'); function global:Invoke-R20RestoreCheck { }; function global:Get-R19DlgWindows { @() }; try { & $global:R19Blocks['r20-restore'] } catch { Write-Host "THREWR $_" } }
T restoreUnreadNoChange {   # #416: unread found side, no dock change ran: the node call (rc 0 here, as the real NOT MEASURED exit) must not stop; the block goes on to the check and the dialogs
  $global:R20DockFound = 'unread'; $global:Sides = @('unread'); function global:Invoke-R20RestoreCheck { Write-Host 'RESTORECHECK' }; function global:Get-R19DlgWindows { @() }
  Write-Host "FLAG0 $global:R20CDockChanged"; & $global:R19Blocks['r20-restore']
}
T flagOpen { Write-Host "F0 $global:R20CDockChanged"; [void](Open-R20CDevt ''); Write-Host "F1 $global:R20CDockChanged"; [void](Open-R20CDevt 'undock'); Write-Host "F2 $global:R20CDockChanged"; Register-R20CBlocks; Write-Host "F3 $global:R20CDockChanged" }
T flagLeg {   # a leg's open step with a side sets the flag, then the restore (unread found side) is the STOP
  $global:R20DockFound = 'unread'; $global:Sides = @('bottom'); $global:NodeRc['s13-r20 dock'] = 2; function global:Invoke-R20RestoreCheck { }; function global:Get-R19DlgWindows { @() }
  $r20h = New-R20CHandlers 'R20-DEVT-UNDOCK' 'undock' 'undock' $R20CMark.undock @('open') 'undock'; [void](& $r20h['R20-DEVT-UNDOCK-undock-open'])
  try { & $global:R19Blocks['r20-restore'] } catch { Write-Host "THREWR $_" }
}
T flagKeep { $global:R20CGate = 'run'; $global:R20CPick = [pscustomobject]@{ under = 'docked'; leg = 'docked'; cond = 'none' }; $global:R20CCondSet = $true; $global:R20DockFound = 'undock'
  function global:Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS, [scriptblock]$Pre) { Write-Host "KEEPROW $global:R20CDockChanged" }; & $global:R19Blocks['r20-keep-4'] }
T flagRestoreFound { $global:R20DockFound = 'left'; $global:Sides = @('left'); function global:Invoke-R20RestoreCheck { }; function global:Get-R19DlgWindows { @() }; & $global:R19Blocks['r20-restore']; Write-Host "FR $global:R20CDockChanged" }
T restoreNever { $global:NodeRc['s13-r20 dock'] = 2; $global:R20DockFound = ''; $global:Sides = @('unread'); try { Restore-R20CDock } catch { Write-Host "THREWR $_" } }
T dialogs {
  function global:Get-R19DlgWindows { @(7) }; function global:Get-S12DialogCount($h) { 0 }; function global:Test-S11Own($h) { $h -ne 9 }   # window 9 is a human's DevTools
  Write-Host "N0 $(Get-R20CDevtCount)"; Write-R20CDialogs
  $global:Titles = @([pscustomobject]@{ h = 9; title = 'DevTools - localhost:8081/other.html' }, [pscustomobject]@{ h = 10; title = 'Fixture' }); Write-Host "N1 $(Get-R20CDevtCount)"
  try { Write-R20CDialogs } catch { Write-Host "THREWD $_ [$global:R19Reason]" }
  $global:Titles = @(); function global:Get-S12DialogCount($h) { 1 }; $global:R19Reason = ''; try { Write-R20CDialogs } catch { Write-Host "THREWD2 $_ [$global:R19Reason]" }
}
T serveNoLoad {   # without the entry script's load step the serve step has no function to call: the F1 defect
  Write-Host "DEFINED $([bool](Get-Command Invoke-R20Serve -ErrorAction Ignore))"
  try { Invoke-R19StepB @{ k = 'serve'; h = [ordered]@{ a = { 'A' } } } } catch { Write-Host "NOSERVE $($_.FullyQualifiedErrorId)" }
}
T serveLoad {   # the entry script's own load step (Get-R20CServeDefs, then the dot-source loop at top level), then one real serve step through the runner's dispatch
  function Get-S11Signal([string]$n, [string]$k) { Join-Path $env:S11_OUT "$n.$k" }
  function Wait-S11Ready([string]$n) { Remove-Item -LiteralPath (Get-S11Signal $n 'ready'); $true }
  function Write-S11Pressed([string]$n, [string]$c) { Write-Host "PRESSED $n=$c" }
  $global:S16Pids = @{ node = 2147483000 }   # the stub actor is already gone, so the serve step ends after its answers
  $r20Serve = Get-R20CServeDefs (Join-Path '${REPO}/recipes' 's13-r20-b-defs.ps1')
  Write-Host "TEXTS $($r20Serve.Count)"
  foreach ($r20S in $r20Serve) { . ([scriptblock]::Create($r20S)) }
  Write-Host "FORMAT-UNCHANGED $(-not $global:S13PriorFormatTitle)"
  Set-Content -LiteralPath (Get-S11Signal 'a' 'ready') 'x'
  Invoke-R19StepB @{ k = 'serve'; h = [ordered]@{ a = { 'A1' }; b = { 'B1' } } }
}
T serveMissing {
  $d = Join-Path $env:S11_OUT 'nob.ps1'; Set-Content -LiteralPath $d 'function Test-R20NodeAlive { $true }'
  try { [void](Get-R20CServeDefs $d) } catch { Write-Host "MISSING $_" }
}
T logs { function global:Invoke-R20Logs { Write-Host 'LOGS' }; & $global:R19Blocks['r20-logs'] }
$global:DiagFull = [pscustomobject]@{ windows = 0; pane = 'yes'; customize = 1; invoked = 'yes'; items = 4; kinds = 'u1l1b1r1'; pr = 4; pressed = 1 }
function global:Read-S13DockSide($h, $p) { Write-Host 'READSIDE'; $global:S13DockDiag = $global:DiagFull; $global:Sides[0] }
T diagZero {
  $global:Sides = @('right'); function global:Invoke-R20Zero($z, $row) { }; & $global:R19Blocks['r20-0c']
}
T diagZeroStale {   # the open failed, so no read ran: the stale diagnostic of an earlier read must not be printed
  $global:S13DockDiag = $global:DiagFull; $global:Opened = $false; $global:NodeRc['s13-r20-c gate-dock'] = 3; function global:Invoke-R20Zero($z, $row) { }; & $global:R19Blocks['r20-0c']
}
T diagRestore {
  $global:R20DockFound = 'left'; $global:Sides = @('left'); function global:Invoke-R20RestoreCheck { }; function global:Get-R19DlgWindows { @() }; & $global:R19Blocks['r20-restore']
}
T restoreLeft1 { $global:R20DockFound = 'left'; $global:Remaining = 1; try { Restore-R20CDock } catch { Write-Host "THREWR $_" } }
T restoreLeft2 { $global:R20DockFound = 'unread'; $global:Sides = @('unread'); $global:Remaining = 1; try { Restore-R20CDock } catch { Write-Host "THREWR $_" } }
T restoreCloseThrows { $global:R20DockFound = 'left'; $global:CloseThrows = $true; try { Restore-R20CDock } catch { Write-Host "THREWR $_" } }
T restoreSetThrows { $global:R20DockFound = 'left'; $global:Remaining = 1; function global:Set-S13DockSide($h, $p, $s) { throw 'boom' }; try { Restore-R20CDock } catch { Write-Host "THREWR $_" } }
T ddOk { function global:Get-S13DockDiag($h, $p, $f) { Write-Host "DIAG $h $p $([IO.Path]::GetFileName($f))" }; & $global:R19Blocks['dockdiag'] }
T ddLeft { $global:Remaining = 2; function global:Get-S13DockDiag($h, $p, $f) { Write-Host 'DIAG' }; try { & $global:R19Blocks['dockdiag'] } catch { Write-Host "THREWD $_" } }
T ddNoOpen { $global:Opened = $false; function global:Get-S13DockDiag($h, $p, $f) { Write-Host 'DIAG' }; & $global:R19Blocks['dockdiag'] }
T ddThrow { function global:Get-S13DockDiag($h, $p, $f) { throw 'diagfail' }; try { & $global:R19Blocks['dockdiag'] } catch { Write-Host "THREWD $_" } }
T ddUnread { $global:CloseThrows = $true; function global:Get-S13DockDiag($h, $p, $f) { Write-Host 'DIAG' }; try { & $global:R19Blocks['dockdiag'] } catch { Write-Host "THREWD $_" } }
foreach ($rs in @(${SLICE_C_STOPS.map((r) => `'${r}'`).join(", ")})) {
  $r = $rs; T "stop-$r" { $R19Order['liveC20'] = @('x'); $global:R19Blocks = @{ x = { Stop-R19 $r 'why' }.GetNewClosure() }; Invoke-R19Slice 'liveC20' }.GetNewClosure()
}
`;
function run(): Record<string, string[]> {
	const d = mkdtempSync(join(tmpdir(), "s13-c3-"));
	try {
		const f = join(d, "t.ps1");
		writeFileSync(f, PRE(d.replace(/\\/g, "\\")) + BODY, "utf8");
		const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 240_000 }).stdout ?? "";
		const o: Record<string, string[]> = {};
		let cur = "";
		for (const l of out.split(/\r?\n/)) { const m = /^BEGIN (\S+)$/.exec(l); if (m) { cur = m[1]!; o[cur] = []; } else if (cur) o[cur]!.push(l); }
		return o;
	} finally { rmSync(d, { recursive: true, force: true }); }
}
describe("the liveC20 entry script's text", () => {
	const e = read("s13-r20-c.ps1");
	it("loads Run 17's functions before it registers, dot-sources the s13 files at its top level, plans before anything is read, and stays on 8081", () => {
		const at = (s: string): number => e.indexOf(s);
		expect(at("Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17.ps1')")).toBeLessThan(at("\nRegister-R20Blocks"));
		for (const f of ["s13-r20.ps1", "s13-devt.ps1", "s13-r20-c-defs.ps1"]) expect(e).toMatch(new RegExp(`^\\. "\\$PSScriptRoot\\\\${f.replace(/\./g, "\\.")}"`, "m"));
		expect(at("\nRegister-R20Blocks")).toBeLessThan(at("\nRegister-R20CBlocks"));
		expect(at("-eq 'plan'")).toBeLessThan(at("Get-R18Defs (Join-Path"));
		expect(e).toContain("ValidateSet('liveC20', 'plan', 'teardown', 'dockdiag')");
		expect(e).toContain("Get-R20CMissingBlocks 'liveC20'");
		expect(e).not.toMatch(/8082|8083|s13-win|s13-r20-b4/);
		expect(e).not.toMatch(/^\. .*s13-r20-b-defs/m);   // slice B's file is never dot-sourced (it overrides Format-S9Title and resets R19Xk)
		expect(e).toContain("Get-R20CServeDefs (Join-Path $PSScriptRoot 's13-r20-b-defs.ps1')");
		expect(e).toMatch(/foreach \(\$r20S in \$r20Serve\) \{ \. \(\[scriptblock\]::Create\(\$r20S\)\) \}/);
		expect(at("Get-R20CServeDefs")).toBeLessThan(at("\nRegister-R20Blocks"));
	});
	it("the record is S13-live-record-liveC20[-att<k>].txt through the shared name function, a teardown writes to the framing file, and every PowerShell file here is ASCII", () => {
		expect(e).toContain("Get-R19RecordName $Block $Att");
		for (const f of ["s13-r20-c.ps1", "s13-r20-c-defs.ps1"]) expect(read(f)).toMatch(/^[\x20-\x7e\r\n\t]*$/);
	});
	it("the tab markers of the PowerShell side are the actor's MARKER values", () => {
		const m = /\$R20CMark = @\{ ([^}]*) \}/.exec(read("s13-r20-c-defs.ps1"))![1]!;
		const ps = Object.fromEntries(m.split("; ").map((p) => p.split(" = ").map((x) => x.replace(/'/g, "")) as [string, string]));
		expect(ps).toEqual(MARKER);
	});
});
describe("the TS side of the record lines (flag, dock)", () => {
	it("FLAG prints the word, an unknown word reads unread", () => {
		expect(lineCmd20("flag", { value: "yes" })).toEqual({ lines: ["FLAG debugging-flag=yes"], exit: 0 });
		expect(lineCmd20("flag", { value: "maybe" })!.lines).toEqual(["FLAG debugging-flag=unread"]);
		expect(lineCmd20("proof", {})).toBeUndefined();
	});
	it("DOCK R20-0C prints the side; R20-RESTORE passes only on the found side and otherwise names the found side and stops not-restored; unread never passes", () => {
		expect(lineCmd20("dock", { row: "R20-0C", side: "right" })).toEqual({ lines: ["DOCK R20-0C side=right"], exit: 0 });
		expect(lineCmd20("dock", { row: "R20-RESTORE", side: "left", found: "left" })).toEqual({ lines: ["DOCK R20-RESTORE side=left"], exit: 0 });
		expect(lineCmd20("dock", { row: "R20-RESTORE", side: "bottom", found: "left" })).toEqual({ lines: ["DOCK R20-RESTORE side=bottom", "CHECK R20-RESTORE found-side=left read-back=bottom", "STOPWHY not-restored"], exit: 2 });
		expect(lineCmd20("dock", { row: "R20-RESTORE", side: "unread", found: "unread", changed: "yes" })!.exit).toBe(2);
		expect(lineCmd20("dock", { row: "R20-RESTORE", side: "bottom", found: "unread", changed: "yes" })!.exit).toBe(2);
		expect(lineCmd20("dock", { row: "X", side: "bottom" })!.exit).toBe(2);
	});
	it("#416: found unread and --changed exactly no is NOT MEASURED (a ROW note the row verdict reads, exit 0); a missing, empty or other --changed counts as changed and stays the STOP", () => {
		const nm = lineCmd20("dock", { row: "R20-RESTORE", side: "bottom", found: "unread", changed: "no" })!;
		expect(nm).toEqual({ lines: ["DOCK R20-RESTORE side=bottom", "CHECK R20-RESTORE found-side=unread read-back=bottom NOT MEASURED found side unread, nothing changed", "ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed"], exit: 0 });
		for (const c of [undefined, "", "No", "false", "yes"]) expect(lineCmd20("dock", { row: "R20-RESTORE", side: "unread", found: "unread", ...(c === undefined ? {} : { changed: c }) })!.exit).toBe(2);
		expect(lineCmd20("dock", { row: "R20-RESTORE", side: "bottom", found: "left", changed: "no" })!.exit).toBe(2);   // a found side that was read is judged as before
	});
});
describe("every STOP reason slice C can reach is known to the pairing check", () => {
	it("is in STOP_REASONS_20", () => { for (const r of SLICE_C_STOPS) expect(STOP_REASONS_20).toContain(r); });
});
describe.skipIf(!hasPs)("s13-r20-c-defs.ps1 under PowerShell with stubbed helpers", () => {
	const o = run();
	const has = (n: string, s: string): boolean => (o[n] ?? []).some((l) => l.includes(s));
	const nodes = (n: string): string[] => (o[n] ?? []).filter((l) => l.startsWith("NODE ")).map((l) => l.slice(5));
	it("registers a block for every name of liveC20's order and names the one that is missing", () => {
		expect(o.reg).toContain("MISSING 0"); expect(o.reg).toContain("MISS2 flag");
		expect(o.reg).toContain("ORDER preflight,servers,files,window,reload,console,r20-0c,flag,r20-devt-undock,r20-devt-early,r20-up-devt,r20-keep-4,r20-sweep-held,r20-restore,r20-logs");
	});
	it("the pure readers: leg words in print order (RECORD/NM/FAIL), the refusing labels of the DEVT rows only, gate-cond's pick, the control answer, the docked side", () => {
		expect(o.pure).toEqual(expect.arrayContaining(["W PASS,RECORD,NM", "R undock,docked", "P undocked undocked none", "PN True", "F na na yes 3 | 1 ok no 12 | 0 none unread 0", "S undock bottom", "S2 right", "S3 bottom",
			"M early_docked=s12x=r20ed1,early_undocked=s12x=r20eu1,keep=s12x=r20ck4,sweep=s12x=r20csw,undock=s12x=r20u1,up=s12x=r20cup"]));
	});
	it("a leg's handlers are the actor's ids; ctl is the actor's word list; open is ok only when opened and the side is done; an unreadable close is unread; check sees a pane or a DevTools window; a marker or step outside the lists is refused", () => {
		expect(o.handlers).toEqual(expect.arrayContaining(["IDS R20-DEVT-UNDOCK-undock-ctl0,R20-DEVT-UNDOCK-undock-open,R20-DEVT-UNDOCK-undock-ctl1,R20-DEVT-UNDOCK-undock-close",
			"A R20-DEVT-UNDOCK-undock-ctl0=1 ok yes 12", "A R20-DEVT-UNDOCK-undock-open=ok", "A R20-DEVT-UNDOCK-undock-close=0", "FAIL fail", "NOTDONE fail", "UNREAD unread", "CHECK yes 1 ok yes 12", "CHECK2 no", "CHECK3 yes"]));
		expect(has("handlers", "BADMARK")).toBe(true); expect(has("handlers", "BADSTEP")).toBe(true);
		expect(has("handlers", "OPEN [undock]")).toBe(true);
	});
	it("R20-0C: the proof first, then the found side is read in X (not the capture), DOCK is printed, and gate-dock decides; an unreadable side gates every DEVT and conditional row", () => {
		expect(o.zeroRead).toEqual(expect.arrayContaining(["ZERO R20-0C", "FRONT 7 R20-0C", "OPEN []", "READSIDE", "NODE s13-r20 dock --row R20-0C --side right", "NODE s13-r20-c gate-dock --dock right", "FOUND right GATE run"]));
		expect(o.zeroRead!.indexOf("ZERO R20-0C")).toBeLessThan(o.zeroRead!.indexOf("OPEN []"));
		expect(o.zeroUnread).toEqual(expect.arrayContaining(["NODE s13-r20 dock --row R20-0C --side unread", "FOUND unread GATE notrun", "SKIPPED-ALL"]));
		expect(has("zeroUnread", "ROWRUN")).toBe(false);
		expect(o.zeroGateCrash!.join("|")).toMatch(/THREW stop/); expect(has("zeroGateCrash", "REASON [throw-after-state]")).toBe(true);
		expect(has("zeroLeft", "REASON [devtools-left-open]")).toBe(true);
	});
	it("FLAG: one line, the process list's word, once however often the block runs", () => {
		expect(nodes("flag")).toEqual(["s13-r20 flag --value unread"]);
	});
	it("a row closes DevTools after itself with X in front; a row failure keeps its own reason; a DevTools window left open or an unreadable close is the STOP devtools-left-open", () => {
		expect(o.guarded).toEqual(expect.arrayContaining(["OK1", "LEFT stop devtools-left-open [devtools-left-open]", "ROWERR row failed []", "CLOSEERR stop devtools-left-open [devtools-left-open]"]));
		expect(o.guarded!.filter((l) => l === "FRONT 7 R20-X").length).toBe(4);
	});
	it("DEVT rows run through one bounded serve step (600 s) on the actor, with the ids the actor asks for", () => {
		expect(o.row).toEqual(expect.arrayContaining(["ROWRUN R20-DEVT-UNDOCK devt-undock serve 600 R20-DEVT-UNDOCK-undock-ctl0,R20-DEVT-UNDOCK-undock-open,R20-DEVT-UNDOCK-undock-ctl1,R20-DEVT-UNDOCK-undock-close s13-r20-c 600",
			"ROWRUN R20-DEVT-EARLY devt-early serve 600 R20-DEVT-EARLY-undocked-ctl0,R20-DEVT-EARLY-undocked-open,R20-DEVT-EARLY-undocked-ctl1,R20-DEVT-EARLY-undocked-close,R20-DEVT-EARLY-docked-ctl0,R20-DEVT-EARLY-docked-open,R20-DEVT-EARLY-docked-ctl1,R20-DEVT-EARLY-docked-close s13-r20-c 600"]));
	});
	it("the DEVT legs' verdict words and refusing labels are collected for gate-cond, in the order the rows ran", () => {
		expect(o.devtLegs).toContain("WORDS FAIL,PASS,NM REFUSE undock");
	});
	it("the conditional rows: no refusing leg (exit 3) runs none of them; with no leg words --legs is omitted, never empty; a refusing leg runs them under the actor's pick, asked once", () => {
		expect(has("condNone", "NONE-RAN")).toBe(true); expect(has("condNone", "ROWRUN")).toBe(false);
		expect(nodes("condNone")).toEqual(["s13-r20-c gate-cond --findings none --legs PASS,RECORD"]);
		expect(nodes("condNoWords")).toEqual(["s13-r20-c gate-cond --findings docked,undocked"]);
		expect(o.condRun).toEqual(expect.arrayContaining(["COND True True"]));
		expect(nodes("condRun")).toEqual(["s13-r20-c gate-cond --findings docked,undocked --legs PASS,FAIL,FAIL"]);
		expect(has("condBad", "BAD stop")).toBe(true); expect(has("condBad", "REASON [throw-after-state]")).toBe(true);
		expect(has("condStop", "REASON [throw-after-state]")).toBe(true);
	});
	it("R20-UP-DEVT adds ROOT once, then runs the actor with the pick's --leg and --cond and the five steps", () => {
		expect(o.upDevt).toEqual(expect.arrayContaining(["ROOT-ADD", "ROWRUN R20-UP-DEVT up-devt --leg undocked --cond earlier R20-UP-DEVT-undocked-ctl0,R20-UP-DEVT-undocked-open,R20-UP-DEVT-undocked-ctl1,R20-UP-DEVT-undocked-ctl2,R20-UP-DEVT-undocked-close", "ROOT True"]));
		expect(o.upDevt!.filter((l) => l === "ROOT-ADD").length).toBe(1);
	});
	it("R20-KEEP-4 sets the dock side in an earlier DevTools session (open with the side, close), then its own open is plain and has no ctl0", () => {
		const k = o.keep4!;
		expect(k.indexOf("OPEN [bottom]")).toBeGreaterThan(-1);
		expect(k.indexOf("OPEN [bottom]")).toBeLessThan(k.findIndex((l) => l.startsWith("ROWRUN")));
		expect(k.slice(k.indexOf("OPEN [bottom]"), k.findIndex((l) => l.startsWith("ROWRUN")))).toContain("CLOSE");
		expect(k).toContain("ROWRUN R20-KEEP-4 keep-4 --leg docked R20-KEEP-4-docked-open,R20-KEEP-4-docked-ctl1,R20-KEEP-4-docked-close");
		expect(k).toContain("OPENANS ok");
		expect(k.filter((l) => l.startsWith("OPEN [")).at(-1)).toBe("OPEN []");
	});
	it("R20-SWEEP-HELD: phase 1, the capture saved, the reload, the capture reopened, LOADED20 rerun, then phase 2 as the one row with phase 1's lines carried (and dropped after)", () => {
		const s = o.sweepOk!;
		const at = (x: string): number => s.findIndex((l) => l.startsWith(x));
		expect([at("NODE s13-r20-c sweep-held --leg undocked --cond earlier --phase 1"), at("SAVESEG reload"), at("RELOAD"), at("OPENSEG"), at("RERUN"), at("ROWRUN R20-SWEEP-HELD")].every((i, k, a) => i > -1 && (k === 0 || i > a[k - 1]!))).toBe(true);
		expect(s).toContain("ROWRUN R20-SWEEP-HELD sweep-held --leg undocked --phase 2 R20-SWEEP-HELD-undocked-ctl2,R20-SWEEP-HELD-undocked-check,R20-SWEEP-HELD-undocked-close carry=1");
		expect(s).toContain("CARRY-AFTER False");
	});
	it("R20-SWEEP-HELD phase 1 that measured nothing: no reload, no phase 2, the tab closed, one ROW that keeps the NOT MEASURED reason on its LEG line", () => {
		const s = o.sweepNm!;
		expect(s.some((l) => l.startsWith("NODE s13-r20-c sweep-held --leg undocked --phase close"))).toBe(true);
		for (const x of ["RELOAD", "RERUN", "SAVESEG", "ROWRUN-PHASE2"]) expect(s).not.toContain(x);
		expect(s.filter((l) => l.startsWith("ROW R20-SWEEP-HELD "))).toEqual(["ROW R20-SWEEP-HELD NOT MEASURED"]);
		expect(s).toContain("LEG R20-SWEEP-HELD control-pre NOT MEASURED the earlier attach did not answer 2");
		expect(s).toContain("CARRY-AFTER False");
		expect(has("sweepStale", "REASON [old-build-left-loaded]")).toBe(true); expect(has("sweepStale", "ROWRUN-PHASE2")).toBe(false);
		expect(has("sweepStop", "REASON [devtools-left-open]")).toBe(true);
	});
	it("R20-RESTORE: Open, Set to R20-0C's side, Close, Open plain, read back, Close; then the safety restore, the folders check and the counts; a different or unread side is the STOP not-restored naming the found side", () => {
		const r = o.restoreOk!.filter((l) => /^(OPEN|SETSIDE|CLOSE|READSIDE|NODE s13-r20 dock|RD-RESTORE|RESTORECHECK|NODE s12-r19-c)/.test(l));
		expect(r.slice(0, 8)).toEqual(["OPEN []", "SETSIDE left", "CLOSE", "OPEN []", "READSIDE", "CLOSE", "NODE s13-r20 dock --row R20-RESTORE --side left --found left --changed yes", "RD-RESTORE"]);
		expect(r.slice(8)).toEqual(["RESTORECHECK", "NODE s12-r19-c dialogs --slice C --native 0 --devtools 0 --windows 0"]);
		expect(has("restoreDiff", "REASON [not-restored]")).toBe(true); expect(has("restoreDiff", "RD-RESTORE")).toBe(false);
		expect(has("restoreDiff", "--side bottom --found left")).toBe(true);
		expect(has("restoreUnread", "REASON [not-restored]")).toBe(true); expect(has("restoreUnread", "SETSIDE")).toBe(false); expect(has("restoreUnread", "--found unread --changed yes")).toBe(true);
		expect(has("restoreNever", "--side unread --found unread")).toBe(true); expect(has("restoreNever", "SETSIDE")).toBe(false);
	});
	it("#416: an unread found side with no dock change goes on (no STOP, the check and DIALOGS run); the flag is set by an open with a side, the KEEP-4 pre-open and the restore's own change, reset by Register, and never by a plain open", () => {
		const u = o.restoreUnreadNoChange!;
		expect(u).toContain("FLAG0 False"); expect(u).toContain("NODE s13-r20 dock --row R20-RESTORE --side unread --found unread --changed no");
		expect(u).toContain("RESTORECHECK"); expect(u).toContain("NODE s12-r19-c dialogs --slice C --native 0 --devtools 0 --windows 0");
		expect(u).toContain("REASON []"); expect(u.some((l) => l.startsWith("THREW"))).toBe(false);
		expect(o.flagOpen).toEqual(expect.arrayContaining(["F0 False", "F1 False", "F2 True", "F3 False"]));
		expect(o.flagLeg).toContain("REASON [not-restored]"); expect(has("flagLeg", "--found unread --changed yes")).toBe(true);
		expect(o.flagKeep).toContain("KEEPROW True");
		expect(has("flagRestoreFound", "SETSIDE left")).toBe(true); expect(o.flagRestoreFound).toContain("FR True");
		expect(has("restoreOk", "--changed yes")).toBe(true);
	});
	it("#418 F3: one dock-read CHECK line follows R20-0C's read (before its DOCK line) and R20-RESTORE's read-back (before its DOCK line); with no read it is all n/a, never a stale count", () => {
		const L = "NODE s13-r20-c dock-read --row ROW --windows 0 --pane yes --customize 1 --invoked yes --items 4 --kinds u1l1b1r1 --pressed-readable 4 --pressed 1";
		const z = nodes("diagZero"), r = nodes("diagRestore");
		expect(z.indexOf(L.slice(5).replace("ROW", "R20-0C"))).toBeGreaterThan(-1);
		expect(z.indexOf(L.slice(5).replace("ROW", "R20-0C"))).toBeLessThan(z.findIndex((l) => l.startsWith("s13-r20 dock --row R20-0C")));
		expect(r.indexOf(L.slice(5).replace("ROW", "R20-RESTORE"))).toBeGreaterThan(-1);
		expect(r.indexOf(L.slice(5).replace("ROW", "R20-RESTORE"))).toBeLessThan(r.findIndex((l) => l.startsWith("s13-r20 dock --row R20-RESTORE")));
		expect(nodes("diagZeroStale")).toContain("s13-r20-c dock-read --row R20-0C --windows n/a --pane n/a --customize n/a --invoked n/a --items n/a --kinds n/a --pressed-readable n/a --pressed n/a");
	});
	it("#418 F2: a close in R20-RESTORE that leaves DevTools open or cannot be read is the STOP devtools-left-open (after the first close no second open; after the read-back the dock record is kept first); an error of the change itself wins", () => {
		expect(has("restoreLeft1", "REASON [devtools-left-open]")).toBe(true); expect(o.restoreLeft1!.filter((l) => l.startsWith("OPEN"))).toEqual(["OPEN []"]);
		expect(has("restoreLeft1", "NODE s13-r20 dock")).toBe(false);
		expect(has("restoreLeft2", "REASON [devtools-left-open]")).toBe(true); expect(nodes("restoreLeft2").some((l) => l.startsWith("s13-r20 dock --row R20-RESTORE --side unread --found unread --changed no"))).toBe(true);
		expect(has("restoreCloseThrows", "REASON [devtools-left-open]")).toBe(true);
		expect(has("restoreSetThrows", "THREWR boom")).toBe(true); expect(has("restoreSetThrows", "REASON []")).toBe(true);
		expect(has("restoreOk", "REASON []")).toBe(true);
		// F5 (verifier): a left-open pane is named in its own CHECK line even when another STOP or a throw wins
		for (const k of ["restoreSetThrows", "restoreLeft2", "restoreLeft1"]) expect(has(k, "CHECK R20-RESTORE devtools-left-open=yes")).toBe(true);
		expect(has("restoreOk", "CHECK R20-RESTORE devtools-left-open=yes")).toBe(false);
	});
	it("#418: -Block dockdiag has its own order (preflight, servers, window, dockdiag: no files, reload, console, actor or r20-0c, so no safety change), opens DevTools plain, runs the diagnostic into S11_OUT, closes, prints remaining, changes no dock side", () => {
		expect(o.reg).toContain("DDORDER preflight,servers,window,dockdiag"); expect(o.reg).toContain("DDMISSING 0");
		const d = o.ddOk!;
		expect(d.filter((l) => /^(FRONT|OPEN|DIAG|CLOSE|READSIDE|SETSIDE)/.test(l))).toEqual(["FRONT 7 DOCKDIAG", "OPEN []", "DIAG 7 8081 dockdiag-evidence.txt", "CLOSE"]);
		expect(d).toContain("CHECK dockdiag remaining=0");
		expect(o.ddNoOpen).toContain("CHECK dockdiag opened=no"); expect(o.ddNoOpen).not.toContain("DIAG");
		expect(has("ddLeft", "CHECK dockdiag remaining=2")).toBe(true); expect(has("ddLeft", "REASON [devtools-left-open]")).toBe(true);
		expect(has("ddThrow", "CLOSE")).toBe(true); expect(has("ddThrow", "CHECK dockdiag remaining=0")).toBe(true); expect(has("ddThrow", "THREWD diagfail")).toBe(true);
		expect(has("ddUnread", "CHECK dockdiag remaining=unread")).toBe(true); expect(has("ddUnread", "REASON [devtools-left-open]")).toBe(true);
		const e = read("s13-r20-c.ps1");
		expect(e).toContain("Get-R20CMissingBlocks 'dockdiag'");
		for (const f of ["s13-devt.ps1"]) expect(read(f)).toMatch(/^[\x20-\x7e\r\n\t]*$/);
	});
	it("DIALOGS C counts EVERY DevTools window but the capture (a human's on another page too), not Close-S13DevTools's narrower remaining; one left is the STOP devtools-left-open, a native dialog dialog-left-open", () => {
		expect(o.dialogs).toEqual(expect.arrayContaining(["N0 0", "N1 1", "NODE s12-r19-c dialogs --slice C --native 0 --devtools 0 --windows 0", "NODE s12-r19-c dialogs --slice C --native 0 --devtools 1 --windows 0", "THREWD stop devtools-left-open [devtools-left-open]", "THREWD2 stop dialog-left-open [dialog-left-open]"]));
		expect(read("s13-r20-c-defs.ps1")).toMatch(/function Get-R20CDevtCount \{ @\(Get-S13Titles/);
	});
	it("the serve step: without the entry script's load step Invoke-R20Serve is undefined; with it (parser-read from slice B's file, not dot-sourced) one real serve step answers through Invoke-R19StepB; a missing function is a throw", () => {
		expect(o.serveNoLoad).toEqual(expect.arrayContaining(["DEFINED False", "NOSERVE CommandNotFoundException"]));
		expect(o.serveLoad).toEqual(expect.arrayContaining(["TEXTS 2", "FORMAT-UNCHANGED True", "PRESSED a=A1"]));
		expect(o.serveLoad!.some((l) => l.startsWith("PRESSED b="))).toBe(false); expect(has("serveLoad", "THREW")).toBe(false);
		expect(has("serveMissing", "MISSING Invoke-R20Serve was not read from nob.ps1")).toBe(true);
	});
	it("R20-LOGS is the shared one", () => { expect(o.logs).toContain("LOGS"); });
	for (const r of SLICE_C_STOPS) {
		it(`the generic STOP ${r} pairs with its RETURN line (R5.6; the pairing only)`, () => {
			const lines = o[`stop-${r}`]!.filter((l) => /^(STOP [a-z-]+|RETURN )/.test(l));
			expect(lines).toEqual([`STOP ${r}`, `RETURN 1 after-stop=${r} restored=n/a readback=n/a`]);
			expect(checkStopReturn20(lines)).toEqual([]);
		});
	}
});

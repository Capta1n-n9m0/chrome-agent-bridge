# recipes/s13-r20.ps1: the Run 20 wrapper over Run 19's block runner (Step 13 S5-drivers-A; docs/e2e-test-plan.md section 4.28). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome, a daemon or a port by its author. It holds definitions only (no main, no param block): a later entry script dot-sources the
# s9/s11/s11b/s12 window helpers, then this file, then calls Register-R20Blocks and Invoke-R19Main. recipes/test/s13-r20-ps.test.ts dot-sources it with stubs.
# Run 19's files are reused READ-ONLY: this file dot-sources s12-r19-lib.ps1 (sequencer, Stop-R19 / Stop-R19Wave / RETURN, capture segments, old-build swap) and
# s12-r19-a.ps1 (Invoke-R19Row, Complete-R19Row, step lists, Set-R19JsOff / Restore-R19Js, Switch-R19Toolbar, block-list restores), then, AFTER them, adds R20 keys to the tables they read ($R19Order, $R19Multi, $R19DeferRe) and redefines the few functions that pin Run 19's text. Top-level names carry an R20 prefix.
. "$PSScriptRoot\s12-r19-lib.ps1"
. "$PSScriptRoot\s12-r19-a.ps1"
# ---- slice and order tables (liveB20 and liveC20 are listed for the plan; their drivers are S5-drivers-B and -C) ------------------------------------------------
$R20Prologue = @('preflight', 'servers', 'files', 'window', 'reload', 'console')
# A2 fills these slots (sheet order): CON-DESC, -NOTEA, -CAP / CON-4, -FLOOR, -NOTEA blocked / ARGS-OLD.
$R20SlotCon = @(); $R20SlotAfterArgs3 = @(); $R20SlotOld = @()
$R19Order['liveA20'] = $R20Prologue + @('r20-0', 'r20-pop-bg', 'r20-pop-fg', 'r20-pop-other', 'r20-pop-none', 'r20-args-order') + $R20SlotCon + @('r20-args-3') + $R20SlotAfterArgs3 + $R20SlotOld + @('r20-restore', 'r20-logs')
$R19Order['liveB20'] = $R20Prologue + @('r20-0b', 'closerprobe', 'r20-choose-twice', 'r20-choose-kept', 'r20-choose-refuse-dis', 'r20-g2-1', 'r20-version', 'r20-restore', 'r20-logs')
$R19Order['liveC20'] = $R20Prologue + @('r20-0c', 'flag', 'r20-devt-undock', 'r20-devt-early', 'r20-up-devt', 'r20-keep-4', 'r20-sweep-held', 'r20-restore', 'r20-logs')
$R19Multi = @('R20-0', 'R20-0B', 'R20-0C', 'R20-RESTORE', 'R20-LOGS')   # the rows every slice holds end with slice=<letter>
$R19DeferRe = '^R20-(ARGS|CON)-[A-Z0-9]'                                   # the rows with a console clause are settled at R20-LOGS (#351 (4) (b))
$R20S4Commit = 'b3cbe84'
function Get-R19RecordName([string]$Block, [int]$Att = 1) { "S13-live-record-$Block$(if ($Att -gt 1) { "-att$Att" }).txt" }
function Get-R19CapName([string]$Slice, [int]$K) { "console-$Slice-$K.txt" }   # one file per segment in every slice (s13-r20.ts capturePath20)
# An unjoined line is a leg note the sheet prints as its own ROW line and says does not change the row's verdict (R20-POP-OTHER).
$R20Verdict = ${function:Get-R19Verdict}
function Get-R19Verdict([string[]]$Lines) { & $R20Verdict @($Lines | Where-Object { "$_" -notmatch '^(?:\S+Z )?(?:s9-win: )?ROW \S+ unjoined ' }) }
function Restore-R19State { $r20o = Use-S16Options; [void](Set-S9Foreground $global:W); Restore-S11Safety $r20o $global:W 'R20-RESTORE' }
function Invoke-R20Rerun { $global:R19Rerun++; [int](Invoke-R19Node 's13-r20' @('proof', '--rerun', "$($global:R19Rerun)")) -eq 0 }
function Invoke-R19Rerun { Invoke-R20Rerun }
# ---- the port (form (10)): the lowest from 8081 that neither netstat nor Get-NetTCPConnection lists; a Bound entry with no listener counts as held ------------------
function Select-R20Port([int[]]$Held) { $r20p = 8081; while ($Held -contains $r20p) { $r20p++ }; $r20p }
function Get-R20Held {
  $r20n = @(netstat -ano | ForEach-Object { if ("$_" -match '^\s*TCP\s+\S+:(\d+)\s') { [int]$Matches[1] } })
  $r20g = @(Get-NetTCPConnection -State Listen, Bound -ErrorAction Ignore | ForEach-Object { [int]$_.LocalPort })
  , @($r20n + $r20g | Sort-Object -Unique)
}
function Set-R20Port { $r20h = @(Get-R20Held)[0]; $global:R20Port = Select-R20Port @($r20h); Show-S16 @(@(Invoke-R19Node 's13-r20' @('port', '--port', "$($global:R20Port)", '--listed', "$(@($r20h).Count)")) | Where-Object { $_ -is [string] -and $_ -match '^PORT ' }) }
# ---- R20-0: the preflight lines and the loaded-build proof, before any state change. MANIFEST first, LOADED20 second, then RULES/STATE/TOGGLE/FOUNDLIST/HEAD/S4 -------
function Test-R20S4Ancestor { git merge-base --is-ancestor $R20S4Commit HEAD *> $null; $LASTEXITCODE -eq 0 }
# Sheet steps (2)+(3) in the worker console: permission, listener, management.getSelf() enabled (yes/no words), typed via Start-S11bConsoleEval (ExprFile). Unreadable = unread, then the disk manifest (FALLBACK).
function Read-R20Worker([int]$TimeoutMs = 8000) {
  $r20r = [pscustomobject]@{ Perm = 'unread'; Listener = 'unread'; Enabled = 'unread'; Disk = 'unread' }
  $r20e = Join-Path $env:S11_OUT 'r20-0-read.expr'; $r20d = Join-Path $env:S11_OUT 'r20-0-read.dump'
  $r20x = '(async () => { const s = await chrome.management.getSelf(); console.log("R20READ " + (chrome.runtime.getManifest().permissions.includes("webNavigation") ? "yes" : "no") + " " + (typeof chrome.webNavigation === "object" && chrome.webNavigation.onCreatedNavigationTarget.hasListeners() ? "yes" : "no") + " " + (s.enabled && !s.disabledReason ? "yes" : "no")); })()'
  try {
    [IO.File]::WriteAllText($r20e, $r20x, (New-Object Text.UTF8Encoding $false))
    $r20c = Start-S11bConsoleEval $global:D 'stored' @() $r20e
    if ($null -eq $r20c.Code) {
      $r20t = Get-Date
      do {
        Start-Sleep -Milliseconds 300
        $r20tl = Get-S11bTail (Save-S11bConsole $global:D $r20d) "S11B-MARK $($r20c.Mark)"
        $r20m = if ($r20tl.Found) { @($r20tl.Lines | ForEach-Object { [regex]::Match("$_", '^R20READ (yes|no) (yes|no) (yes|no)$') } | Where-Object { $_.Success }) } else { @() }
      } while ($r20m.Count -eq 0 -and ((Get-Date) - $r20t).TotalMilliseconds -lt $TimeoutMs)
      if ($r20m.Count) { $r20r.Perm = $r20m[-1].Groups[1].Value; $r20r.Listener = $r20m[-1].Groups[2].Value; $r20r.Enabled = $r20m[-1].Groups[3].Value }
    }
  } catch { } finally { Remove-Item -LiteralPath $r20e, $r20d -Force -ErrorAction Ignore }
  if ($r20r.Perm -eq 'unread') { try { $r20r.Disk = $(if ((Get-Content -Raw -ErrorAction Stop -LiteralPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'extension\manifest.json') | ConvertFrom-Json).permissions -contains 'webNavigation') { 'yes' } else { 'no' }) } catch { } }
  $r20r
}
function Invoke-R20Zero([scriptblock]$Zero) {
  if ($global:S16Changed) { Fail-S16 'R20-0 after a state change would overwrite the found texts; refused' }
  $h = Get-R19Head
  if (-not $h.Clean) { Fail-S16 'R20-0: the tracked tree is not clean outside the steps dir' }
  $w = Read-R20Worker
  $global:R19Real = ${function:Show-S16}; $global:R19Held = @()
  function global:Show-S16([string[]]$l) { $global:R19Held += @($l) }
  $r20pa = @('proof', '--port', "$($global:R20Port)", '--perm', $w.Perm, '--listener', $w.Listener); if ($w.Enabled -ne 'unread') { $r20pa += @('--enabled', $w.Enabled) }; if ($w.Disk -ne 'unread') { $r20pa += @('--disk', $w.Disk) }
  try { $rc = [int](Invoke-R19Node 's13-r20' $r20pa) } finally { Set-Item function:global:Show-S16 $global:R19Real }
  $global:R19Loaded = @($global:R19Held | Where-Object { $_ -match '^LOADED20 ' })[-1]
  $r20why = [regex]::Match(($global:R19Held -join "`n"), '(?m)^STOPWHY (\S+)')
  $r20other = @($global:R19Held | Where-Object { $_ -notmatch '^(LOADED20 |STOPWHY )' }); if ($r20other.Count) { Show-S16 $r20other }
  if ($rc -ne 2 -and -not $global:R19Loaded) { Stop-R19 'throw-after-state' 'R20-0: the proof printed no LOADED20 line (it crashed); nothing was changed' }
  if ($rc -eq 2) {
    if ($global:R19Loaded) { Show-S16 @($global:R19Loaded); $global:R19Loaded = $null }
    Stop-R19 $(if ($r20why.Success) { $r20why.Groups[1].Value } else { 'build-not-loaded' }) 'R20-0: the loaded extension is not this build or is disabled; nothing was changed'
  }
  Set-R19Raw 'r20-0'
  function global:Show-S16([string[]]$l) { & $global:R19Real $l; if ($global:R19Loaded -and (@($l | Where-Object { $_ -match '^MANIFEST ' }).Count)) { & $global:R19Real @($global:R19Loaded); $global:R19Loaded = $null } }
  try { Invoke-R19Stamped $Zero } finally { Set-Item function:global:Show-S16 $global:R19Real; if ($global:R19Loaded) { Show-S16 @($global:R19Loaded); $global:R19Loaded = $null } }
  Show-S16 @("HEAD $($h.Head) tree=clean")
  $r20anc = Test-R20S4Ancestor
  [void](Invoke-R19Node 's13-r20' @('s4', '--ancestor', $(if ($r20anc) { 'yes' } else { 'no' })))
  Write-R19RowLine 'R20-0' $(if ($rc -eq 0 -and $r20anc) { 'PASS' } else { 'FAIL' })
}
# ---- the restore read-back by count and hash (never printed): found.json against now.json, both written by Restore-S11Safety ---------------------------------------
function Invoke-R20RestoreCheck {
  if ([int](Invoke-R19Node 's13-r20' @('restore-compare', '--found', $FoundJson, '--now', $NowJson)) -ne 0) { Stop-R19 'not-restored' 'the stored state read back differs from the found state (count or hash)' }
}
# ---- the blocks of liveA20's A1 rows (A2 appends its own below the marker; none of these is rewritten) -------------------------------------------------------
function Register-R20Blocks {
  Set-R19Reused @('files', 'window', 'console', 'teardown', 'root-add') $R17Blocks
  $global:R19Blocks['reload'] = {
    $r20n0 = @(Get-R19RecordLines).Count
    try { Invoke-R19Stamped $R17Blocks['reload'] } catch { if (Test-R19ReloadGaveUp $r20n0) { Stop-R19 'reload-failed' 'reload-extension.ps1 exited 2 twice' }; throw }
  }
  $global:R19Blocks['preflight'] = { Assert-R17TreeClean; Set-R20Port; foreach ($r20k in 9234) { if (-not (Test-S16Port $r20k)) { Fail-S16 "port $r20k is held by a program the wave did not start (#251)" } }; [void](Assert-R19CaptureFree $global:R19Slice) }
  $global:R19Blocks['servers'] = {
    if ((Select-R20Port @(@(Get-R20Held)[0])) -ne $global:R20Port) { Fail-S16 "port $($global:R20Port) was taken before the server started" }   # re-checked just before the start
    Start-R17Srv $global:R20Port "-m http.server $($global:R20Port) --bind 127.0.0.1 --directory test-fixtures"
    if (-not (Test-R17Listens $global:R20Port)) { Fail-S16 'the fixture server did not answer' }
    Say9 "SERVERS $($global:R20Port) up on 127.0.0.1 under the wave's own PID"
  }
  $global:R19Blocks['r20-0'] = { Invoke-R20Zero $R17bZero }
  $global:R19Blocks['r20-pop-bg'] = { Invoke-R19Row 'R20-POP-BG' @('pop-bg', '--port', "$($global:R20Port)") -StepList (New-R20PopSteps 'R20-POP-BG' @('bg') $false) -Actor 's13-r20-a' }
  $global:R19Blocks['r20-pop-fg'] = { Invoke-R19Row 'R20-POP-FG' @('pop-fg', '--port', "$($global:R20Port)") -StepList (New-R20PopSteps 'R20-POP-FG' @('fg') $false) -Actor 's13-r20-a' }
  $global:R19Blocks['r20-pop-other'] = { $r20c = Test-R20Click; Invoke-R19Row 'R20-POP-OTHER' @('pop-other', '--port', "$($global:R20Port)", '--click', $(if ($r20c) { 'yes' } else { 'no' })) -StepList (New-R20PopSteps 'R20-POP-OTHER' $(if ($r20c) { @('third', 'human') } else { @('third') }) $r20c) -Actor 's13-r20-a' }
  $global:R19Blocks['r20-pop-none'] = { Invoke-R19Row 'R20-POP-NONE' @('pop-none', '--port', "$($global:R20Port)") -Actor 's13-r20-a' }
  $global:R19Blocks['r20-args-order'] = { Invoke-R19Row 'R20-ARGS-ORDER' @('args-order', '--port', "$($global:R20Port)") -Actor 's13-r20-a' }
  $global:R19Blocks['r20-args-3'] = { Invoke-R19Row 'R20-ARGS-3' @('args-3', '--port', "$($global:R20Port)") -StepList (New-R19Steps 'R20-ARGS-3-js' '' { Set-R19JsOff } { Restore-R19Js }) -Restore { Restore-R19Js } -Actor 's13-r20-a' }
    # A2 appends below: r20-con-*, r20-args-old, r20-restore, r20-logs
}
# The value steps of a POP row, in the actor's signal order: per leg `<row>-<leg>-cn0`, (leg human: three click steps), `<row>-<leg>-cn1`. The console count is read at cn0 and cn1.
function New-R20PopSteps([string]$Row, [string[]]$Legs, [bool]$Click) {
  $r20l = @()
  foreach ($r20g in $Legs) {
    $r20l += @{ k = 'val'; id = "$Row-$r20g-cn0"; f = { Get-R20ConsoleCount } }
    if ($r20g -eq 'human') { foreach ($r20i in 1..3) { $r20l += @{ k = 'val'; id = "$Row-human-click$r20i"; f = { param($g) Invoke-R20PopClick $g } } } }
    $r20l += @{ k = 'val'; id = "$Row-$r20g-cn1"; f = { Get-R20ConsoleCount } }
  }
  , $r20l
}
function Read-R20Ready([string]$Id, [int]$TimeoutSec = 120) {   # a click step's ready content (the guard word `skip` or empty), read before Wait-S11Ready removes the file
  $r20f = Get-S11Signal $Id 'ready'; $r20t = Get-Date
  while (-not (Test-Path -LiteralPath $r20f)) { if (((Get-Date) - $r20t).TotalSeconds -gt $TimeoutSec) { throw "no ready signal for $Id within the bound" }; Start-Sleep -Milliseconds 20 }
  (Get-Content -Raw -LiteralPath $r20f).Trim()
}
function Invoke-R19StepB($S) { if ($S.k -eq 'val') { $r20g = if ($S.id -match '-click\d$') { Read-R20Ready $S.id } else { '' }; [void](Wait-S11Ready $S.id); Write-S11Pressed $S.id "$(& $S.f $r20g)" } }
function Get-R20ConsoleCount {   # POP's console-new: the capture window saved to a scratch file and its lines counted; -1 = unreadable
  try { $r20f = Join-Path $env:S11_OUT 'cn-probe.txt'; [void](Save-S11bConsole $global:D $r20f); @(Get-Content -LiteralPath $r20f).Count } catch { -1 } finally { Remove-Item -LiteralPath (Join-Path $env:S11_OUT 'cn-probe.txt') -ErrorAction Ignore }
}
# The human-style click on the fixture's #open-popup link in the wave's own window W (UIA, plain, no modifier). 'unsent' when any guard fails: the leg is NOT MEASURED.
function Test-R20Click { [bool](Get-Command Find-S12UiaByName -ErrorAction Ignore) }
function Invoke-R20PopClick([string]$Guard = 'fg') {   # `skip` (the actor read a guard other than fg): no click, 'unsent'. A click answers `sent <epoch ms>` stamped right after the click
  if ($Guard -eq 'skip') { return 'unsent' }
  $r20el = $null; try { $r20el = Find-S12UiaByName $global:W 'Open popup*' 'Hyperlink' } catch { $r20el = $null }
  if (-not $r20el) { return 'unsent' }
  $r20b = Get-S12ElementRect $r20el; $r20r = Get-S12WindowRect $global:W
  $r20x = [int](($r20b.L + $r20b.R) / 2); $r20y = [int](($r20b.T + $r20b.B) / 2)
  if ($r20x -le $r20r.L -or $r20x -ge $r20r.R -or $r20y -le $r20r.T -or $r20y -ge $r20r.B) { return 'unsent' }
  if (-not (Set-S9Foreground $global:W) -or (Get-S12Foreground) -ne $global:W -or (Get-S12WindowAtPoint $r20x $r20y) -ne $global:W) { return 'unsent' }
  Send-S12MouseClick $r20x $r20y
  "sent $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
}

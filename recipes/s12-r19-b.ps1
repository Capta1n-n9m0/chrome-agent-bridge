# recipes/s12-r19-b.ps1: the row drivers of Run 19's liveB19 (Step 12 S7-drivers-B; docs/e2e-test-plan.md section 4.27 part B). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome by its author. recipes/s12-r19.ps1 dot-sources this file after s12-r19-a.ps1 and registers each driver in $global:R19Blocks. The actors are
# recipes/s12-r19-b.ts (node); every row goes through Invoke-R19Row (s12-r19-a.ps1), so the restore runs in a finally, a STOP goes through Stop-R19 and the verdict is the
# worst LEG line. DevTools is opened only in a window the wave opened on a fixture page, by S7-helpers-b's uia-menu method (Open-S12DevToolsMenu); the DEVPROBE's answer
# code decides whether any DevTools row runs. Top-level names carry an R19 prefix (case-insensitive: no $o, $w, $d, $x).
$global:R19PassNote = @{ 'R19-KEEP-1' = 'banner-clause=NOT DISCRIMINATING' }
$global:R19Devt = 'no'; $global:R19ProbeAns = 'not-run'; $global:R19KeptAns = 'not-run'; $global:R19Xk = 0; $global:R19K2 = $null
$R19DevtNm = 'DevTools was not attached'
$R19Fix = 'http://127.0.0.1:8081/'

# ---- the two step kinds of this slice: `t` (a banner timeline with the events that must happen inside it) and `val` (a step whose result is the pressed text) ------
function Invoke-R19Timeline($S) {
  $r19h = @(& $(if ($S.h) { $S.h } else { { @($global:W) } }) | ForEach-Object { [long]$_ })
  foreach ($r19x in $r19h) { Assert-S11Own $r19x 'banner timeline' }
  [void](Wait-S11Ready "$($S.id)-timeline"); Say9 "TIMELINE $($S.id) started"
  $r19reads = New-Object System.Collections.ArrayList; $r19t0 = Get-S12NowMs
  do {
    foreach ($r19n in @($S.ev.Keys)) {   # an event the actor asks for inside the window (a toolbar press, an options edit, a navigation): run here, in the sampler's own thread
      if (Test-Path -LiteralPath (Get-S11Signal $r19n 'ready')) { [void](Wait-S11Ready $r19n); $global:R19Changed = $true; $global:R19Press = $null; $null = & $S.ev[$r19n]; Write-S11Pressed $r19n "$(Get-R19PressMs 'post')" }
    }
    $r19at = Get-S12NowMs; $r19seen = 0
    foreach ($r19x in $r19h) { if ((Test-S9Banner $r19x) -gt 0) { $r19seen++ } }
    [void]$r19reads.Add([pscustomobject]@{ T = $r19at; Seen = ($r19seen -gt 0) })
    Start-Sleep -Milliseconds 120
  } while (((Get-S12NowMs) - $r19t0) -lt $S.ms)
  Write-S11Pressed "$($S.id)-timeline" (Format-S12Timeline $r19reads)
}
function Invoke-R19StepB($S) {
  switch ($S.k) {
    't' { Invoke-R19Timeline $S }
    'val' { [void](Wait-S11Ready $S.id); Write-S11Pressed $S.id "$(& $S.f)" }
  }
}

# ---- window X (the wave's own window on a fixture page) and the DevTools helpers ------------------------------------------------------------------------
function Close-R19Xk { if ($global:R19Xk) { try { if (Test-S11Own $global:R19Xk) { Close-S11Window $global:R19Xk } } catch { Say9 'CHECK window X could not be closed' }; $global:R19Xk = 0 } }
function Open-R19Xk([string]$Url) { Close-R19Xk; $global:R19Xk = [long](@(New-S16Window $Url)[-1]); [void](Set-S9Foreground $global:R19Xk) }
function Close-R19DevTools { try { if (-not (Close-S12DevTools $global:R19Xk)) { $global:S12Left = $true } } catch { $global:S12Left = $true } }
# The row-less DEVPROBE: its answer code alone decides `attached` (S7-helpers-b); the window procedure is Invoke-S12DevProbe.
function Invoke-R19DevProbe {
  $global:R19Devt = 'no'; $global:S12Left = $false; $r19err = $null; $r19rc = 0
  try { $r19rc = [int](@(Invoke-R19Node 's12-r19-b' @('devprobe', '--slice', $global:R19Slice) { Invoke-S12DevProbe "${R19Fix}s12-console.html?s12=con&s12x=probe" } 180)[-1]) } catch { $r19err = $_ }
  if ($global:S12Left) { Stop-R19 'devtools-left-open' 'DEVPROBE: DevTools was left open' }
  if ($r19rc -eq 2) { Stop-R19Actor 'DEVPROBE' $global:R17Out }   # the actor's own STOPWHY (devtools-left-open, a tab that was not found), never dropped
  $r19m = [regex]::Match((@($global:R17Out) -join "`n"), 'DEVPROBE method=\S+ answer=(\S+) ms=\d+ attached=(yes|no)')
  if ($r19m.Success) { $global:R19ProbeAns = $r19m.Groups[1].Value; $global:R19Devt = $r19m.Groups[2].Value }
  if ($r19err) { throw $r19err }
}
# A DevTools row: NOT MEASURED when the probe did not attach; else window X, the row, and a finally that closes DevTools and X (a DevTools left open is the STOP devtools-left-open).
function Invoke-R19DevRow([string]$Id, [string]$Url, [string]$Cmd, [object[]]$StepList, [scriptblock]$Run = $null) {
  if ($global:R19Devt -ne 'yes') { Say9 "ROW $Id NOT MEASURED $([char]0x2014) $R19DevtNm"; return }
  $global:S12Left = $false
  Open-R19Xk $Url
  try { if ($Run) { & $Run } else { Invoke-R19Row $Id @($Cmd) -StepList $StepList -Restore { Close-R19DevTools } -Actor 's12-r19-b' -BudgetS 300 } }
  finally { Close-R19DevTools; Close-R19Xk }
  if ($global:S12Left) { Stop-R19 'devtools-left-open' "$Id`: DevTools was left open" }
}
function New-R19DevSteps([string]$Id) { @(@{ k = 'do'; id = $Id; f = { [void](Open-S12DevToolsMenu $global:R19Xk) } }, @{ k = 'undo'; id = $Id; f = { Close-R19DevTools } }) }
# SWEEP-HELD's reload: the capture is saved BEFORE the reload and reopened AFTER it, before the R19-0 re-run (Capture segments); a stale build after it is a STOP.
function Invoke-R19SweepReload {
  Save-R19Seg 'reload'
  Invoke-R19Stamped $R17Blocks['reload']
  Open-R19Seg
  if ($global:D) { $global:S12Before = @($global:S12Before) + [long]$global:D }   # the reopened capture is a DevTools window too: never X's DevTools (the check and Close-S12DevTools read $S12Before)
  if (-not (Invoke-R19Rerun)) { Stop-R19 'old-build-left-loaded' 'R19-SWEEP-HELD: the loaded extension is stale after the reload (the re-run proof failed)' }
}

# ---- R19-UP-OPT (behind Test-R19Gate's report gate): as R18-UP-OPT, judged by the actor's upopt-judge so no R17 ROW line enters the record ---------------------
function Invoke-R19UpOpt {
  $r19s0 = $global:S16Stops
  $global:S16Changed = $true; Save-S16
  $r19o = Use-S16Options; $r19f = Join-Path $env:S11_OUT 'upopt-obs.json'
  $r19sum = [string](Get-S11Summary (Get-S9Options $r19o))
  Step-S16 'opt' { Invoke-S19Opt $r19o $Root $r19f }
  $r19obs = @(Get-S11bOptObs $r19o $r19f $r19sum)[-1]
  if (Test-Path -LiteralPath $r19f) { Remove-Item -LiteralPath $r19f -Force }
  $r19rc = [int](@(Invoke-R19Node 's12-r19-b' @('upopt-judge', '--obs', $r19obs))[-1])
  Remove-Item -LiteralPath $r19obs -Force -ErrorAction Ignore
  if ($global:S16Stops -gt $r19s0) { throw 'row R19-UP-OPT printed a STOP' }
  Write-R19RowLine 'R19-UP-OPT' $(if ($r19rc -eq 0) { 'PASS' } elseif ($r19rc -eq 3) { 'NOT MEASURED' } else { 'FAIL' })
}

# ---- the carried banner rows: one sampler window per leg (an `s` step per window id), IDLE >= 20 000 ms before each; kind `carried` (FAIL with counts, never a STOP: 4.27 STOP map) --------------
function Invoke-R19Up6 {
  $r19ids = 'outside', 'missing', 'relative', 'raw-dotdot', 'raw-notarget' | ForEach-Object { @{ k = 's'; id = "R19-UP-6-$_" } }
  Invoke-R19Row 'R19-UP-6' @('up-6') -StepList @($r19ids) -Banner carried -Why attach-on-refused-page -Actor 's12-r19-b' -BudgetS 600
}
function Invoke-R19FRaw([string]$Id) { Invoke-R19Row $Id @('raw', '--row', $Id) -StepList @(@{ k = 's'; id = $Id }) -Banner carried -Why attach-on-refused-page -Actor 's12-r19-b' -BudgetS 300 }

# ---- the kept-session rows ------------------------------------------------------------------------------------------------------------------------
function Invoke-R19Keep1 { Invoke-R19Row 'R19-KEEP-1' @('keep-1') -StepList @(@{ k = 't'; id = 'R19-KEEP-1'; ms = 30000; ev = @{} }) -Actor 's12-r19-b' -BudgetS 300 }
function Invoke-R19Keep2 {
  $r19l = 1..6 | ForEach-Object { @{ k = 't'; id = 'R19-KEEP-2'; ms = 32000; ev = @{} } }
  Invoke-R19Row 'R19-KEEP-2' @('keep-2') -StepList @($r19l) -Actor 's12-r19-b' -BudgetS 600
  $r19m = [regex]::Match((@($global:R17Out) -join "`n"), 'CHECK R19-KEEP-2 medians idle=(\S+) ctl=(\S+) measured=yes')
  $global:R19K2 = if ($r19m.Success) { @{ idle = $r19m.Groups[1].Value; ctl = $r19m.Groups[2].Value } } else { $null }   # KEEP-3's end clause is judged only when this clause was measured
}
function New-R19Keep3Steps([bool]$FileOn) {
  $r19R = 'R19-KEEP-3'; $r19l = @()
  $r19l += @{ k = 't'; id = "$r19R-disarm"; ms = 32000; ev = @{ "$r19R-disarm" = { Switch-R19Toolbar $false } } }
  $r19l += @{ k = 'undo'; id = "$r19R-disarm"; f = { Switch-R19Toolbar $true } }
  $r19l += @{ k = 't'; id = "$r19R-block"; ms = 32000; ev = @{ "$r19R-block" = { Set-R19BlockAdd 's12blk.localhost' } } }
  $r19l += @{ k = 'undo'; id = "$r19R-block"; f = { Restore-R19Block } }
  $r19nav = @(@('blocked', 'http://s12blk.localhost:8081/s12-console.html?s12=con'), @('own', $S9OptionsUrl))
  if ($FileOn) { $r19nav += , @('file', ([Uri](Join-Path $Root 's11b-file.html')).AbsoluteUri) }
  foreach ($r19n in $r19nav) {
    $r19k = $r19n[0]; $r19u = $r19n[1]; $r19id = "$r19R-nav-$r19k"
    $r19open = { Open-R19Xk "${R19Fix}s12-console.html?s12=con&s12x=k3$r19k" }.GetNewClosure()
    if ($r19k -eq 'blocked') { $r19open = { Set-R19BlockAdd 's12blk.localhost'; Open-R19Xk "${R19Fix}s12-console.html?s12=con&s12x=k3blocked" } }
    $r19go = if ($r19k -eq 'file') { { Set-S11bOmnibox $global:R19Xk $r19u }.GetNewClosure() } else { { Set-S9Omnibox $global:R19Xk $r19u }.GetNewClosure() }
    $r19l += @{ k = 'do'; id = "$r19id-open"; f = $r19open }
    $r19l += @{ k = 't'; id = $r19id; ms = 32000; h = { @($global:R19Xk) }; ev = @{ $r19id = $r19go } }
    $r19l += @{ k = 'undo'; id = $r19id; f = { Close-R19Xk; if ($r19k -eq 'blocked') { Restore-R19Block } }.GetNewClosure() }
  }
  $r19l += @{ k = 't'; id = "$r19R-close"; ms = 32000; ev = @{} }
  $r19l += @{ k = 'undo'; id = "$r19R-close"; f = { } }
  , $r19l
}
function Invoke-R19Keep3 {
  $r19on = ($global:S16Toggle -eq 'on')
  $r19k2 = if ($global:R19K2) { @('--k2idle', $global:R19K2.idle, '--k2ctl', $global:R19K2.ctl) } else { @('--k2idle', 'na', '--k2ctl', 'na') }
  Invoke-R19Row 'R19-KEEP-3' (@('keep-3', '--toggle', $(if ($r19on) { 'on' } else { 'off' })) + $r19k2) -StepList (New-R19Keep3Steps $r19on) -Restore { Switch-R19Toolbar $true; Restore-R19Block; Close-R19Xk } -Actor 's12-r19-b' -BudgetS 900
}
function Invoke-R19Keep4 {
  Invoke-R19DevRow 'R19-KEEP-4' "${R19Fix}s12-console.html?s12=con&s12x=keep4" 'keep-4' (New-R19DevSteps 'R19-KEEP-4')
  $r19m = [regex]::Match((@($global:R17Out) -join "`n"), 'KEEPDT R19-KEEP-4 leg=devtools next=(\S+)')
  if ($r19m.Success) { $global:R19KeptAns = $r19m.Groups[1].Value }
}
# X's own DevTools, read from its record (S12Dev): a window by its handle, a docked pane by UIA with every window already known (the capture window is never X's).
function Test-R19DevOpen {
  $r19d = $global:S12Dev
  if (-not $r19d) { return $false }
  if ($r19d.How -eq 'window') { return [bool](Test-S9Live $r19d.Hwnd) }
  [bool](Test-S12DevToolsUi $global:R19Xk @(Get-S9ChromeWindows -AnyTitle | ForEach-Object { [long]$_ }))
}
# R19-SWEEP-HELD in two actor runs with the reload between them at block level (Invoke-R17Node keeps one output file and one pid slot, so no node call may nest inside an actor):
# actor 1 holds DevTools on the tab and prints SWEEPPRE; the segment, the reload, the capture and the R19-0 re-run follow; actor 2 re-claims and judges.
function Invoke-R19SweepHeld {
  $r19R = 'R19-SWEEP-HELD'
  Invoke-R19DevRow $r19R "${R19Fix}s12-console.html?s12=con&s12x=sweep" 'sweep-held' @() -Run {
    $r19one = { Invoke-R19Steps @(@{ k = 'do'; id = 'R19-SWEEP-HELD'; f = { [void](Open-S12DevToolsMenu $global:R19Xk) } }) }
    $r19rc = [int](@(Invoke-R19Node 's12-r19-b' @('sweep-held', '--phase', '1', '--slice', $global:R19Slice) $r19one 300)[-1])
    if ($r19rc -eq 2) { Stop-R19Actor $r19R $global:R17Out }
    if (-not [regex]::IsMatch((@($global:R17Out) -join "`n"), 'SWEEPPRE attached=yes')) { Say9 "ROW $r19R NOT MEASURED $([char]0x2014) $R19DevtNm"; return }
    Invoke-R19SweepReload
    $r19two = @(
      @{ k = 'val'; id = "$r19R-check"; f = { if (Test-R19DevOpen) { 'yes' } else { 'no' } } },
      @{ k = 'do'; id = "$r19R-close"; f = { Close-R19DevTools } })
    Invoke-R19Row $r19R @('sweep-held', '--phase', '2') -StepList $r19two -Restore { Close-R19DevTools } -Actor 's12-r19-b' -BudgetS 300
  }
}
function Invoke-R19DevtNoflag {
  $r19rc = [int](@(Invoke-R19Node 's12-r19-b' @('devnoflag', '--probe', $global:R19ProbeAns, '--kept', $global:R19KeptAns))[-1])
  if ($r19rc -eq 2) { Stop-R19Actor 'R19-DEVT-NOFLAG' $global:R17Out }
  Write-R19RowLine 'R19-DEVT-NOFLAG' 'RECORD'
}

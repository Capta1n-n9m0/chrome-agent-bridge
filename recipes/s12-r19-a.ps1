# recipes/s12-r19-a.ps1: the row drivers of Run 19's liveA19 (Step 12 S7-drivers-A; docs/e2e-test-plan.md section 4.27). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome by its author. recipes/s12-r19.ps1 dot-sources this file and registers each driver in $global:R19Blocks. The actors are
# recipes/s12-r19-a.ts (node); this file runs the sampler and the state changes beside them (the signal pairs of Invoke-S11Change) and turns the actor's
# `LEG <row> <label> <verdict>` lines into the row's one ROW (settled at R19-LOGS for a row with a console clause). Top-level names carry an R19 prefix.
# Every STOP is reached through Stop-R19 (s12-r19-lib.ps1); every state change has a restore that runs in a finally when the actor ended before its undo.
$R19DeferRe = '^R19-(ARGS|CON)-'
function Get-R19CtlWord { if ($global:R19Ctl) { $global:R19Ctl } else { 'absent' } }
function Get-R19IdleOf([string[]]$Out, [string]$Id) {
  $r19m = [regex]::Matches(($Out -join "`n"), "IDLE $([regex]::Escape($Id)) since-attach-ms=(\d+)")
  if ($r19m.Count) { [long]$r19m[$r19m.Count - 1].Groups[1].Value } else { 0 }
}
# A step list the actor's signals drive, in the actor's order: do (state change, then pressed), s (one banner sampler pass), undo (the restore, then pressed).
# The time a step reports to the actor: a toolbar switch records the instant before its press (pre) and the instant its new title was read (post); a step with no press reports now. A do step writes post; an undo step writes "pre,post".
function Get-R19PressMs([string]$Which) { if ($global:R19Press) { $global:R19Press[$Which] } else { Get-S12NowMs } }
function Invoke-R19Steps([object[]]$StepList) {
  foreach ($r19s in $StepList) {
    switch ($r19s.k) {
      'do' { [void](Wait-S11Ready $r19s.id); $global:R19Changed = $true; $global:R19Press = $null; $null = & $r19s.f; Write-S11Pressed $r19s.id "$(Get-R19PressMs 'post')" }
      's' { $global:R19Bw[$r19s.id] = Invoke-S12Sampler $r19s.id @($global:W) }
      'undo' { [void](Wait-S11Ready "$($r19s.id)-done"); $global:R19Press = $null; $null = & $r19s.f; $global:R19Changed = $false; Write-S11Pressed "$($r19s.id)-done" "$(Get-R19PressMs 'pre'),$(Get-R19PressMs 'post')" }
    }
  }
}
function New-R19Steps([string]$Id, [string]$Sampler, [scriptblock]$Do, [scriptblock]$Undo) {
  $r19l = @(@{ k = 'do'; id = $Id; f = $Do })
  if ($Sampler) { $r19l += @{ k = 's'; id = $Sampler } }
  $r19l += @{ k = 'undo'; id = $Id; f = $Undo }
  , $r19l
}
function Stop-R19Actor([string]$Id, [string[]]$Out, [string]$Default = 'throw-after-state') {
  $r19w = [regex]::Match(($Out -join "`n"), '(?m)^STOPWHY (\S+)')
  Stop-R19 $(if ($r19w.Success) { $r19w.Groups[1].Value } else { $Default }) "$Id stopped"
}
# One row: the actor beside its steps, the restore in a finally, the banner clause judged from the sampler's own result, the verdict from the LEG lines.
function Invoke-R19Row([string]$Id, [string[]]$Cmd, [object[]]$StepList = @(), [scriptblock]$Restore = $null, [string]$Banner = '', [string]$Why = 'attach-on-refused-page') {
  $global:R19Bw = @{}; $global:R19Changed = $false; $r19drv = $null
  if ($StepList.Count) { $r19sp = $StepList; $r19drv = { Invoke-R19Steps $r19sp }.GetNewClosure() }
  if (@($StepList | Where-Object { $_.k -eq 'do' }).Count) { $global:S16Changed = $true; Save-S16 }
  if (@($StepList | Where-Object { $_.k -eq 's' }).Count) { [void](Set-S11Front $global:W $Id) }
  $r19rc = 0
  try { $r19rc = [int](@(Invoke-R19Node 's12-r19-a' (@($Cmd) + @('--slice', $global:R19Slice, '--ctl', (Get-R19CtlWord))) $r19drv)[-1]) }
  finally { if ($Restore -and $global:R19Changed) { & $Restore; $global:R19Changed = $false } }
  $r19out = @($global:R17Out)
  if ($r19rc -eq 2) { Stop-R19Actor $Id $r19out }
  $r19b = @()
  if ($Banner) {
    foreach ($r19s in @($StepList | Where-Object { $_.k -eq 's' })) {
      $r19r = $global:R19Bw[$r19s.id]
      $r19c = [int](@(Invoke-R19Node 's12-r19-a' @('banner', '--row', $Id, '--kind', $Banner, '--ctl', (Get-R19CtlWord), '--stop', $Why, '--leg', "$Banner=$($r19r.Polls),$($r19r.Banner),$(Get-R19IdleOf $r19out $r19s.id)"))[-1])
      $r19b += @($global:R17Out)
      if ($r19c -eq 2) { Stop-R19Actor $Id $global:R17Out $Why }
    }
  }
  Complete-R19Row $Id ($r19out + $r19b)
}
function Complete-R19Row([string]$Id, [string[]]$Lines) {
  $r19v = Get-R19Verdict @($Lines | ForEach-Object { $_ -replace '^LEG ', 'ROW ' })
  if ($Id -match $R19DeferRe) { $global:R19Pending[$Id] = $r19v; Show-S16 @("CHECK $Id console-clause pending R19-LOGS") } else { Write-R19RowLine $Id $r19v }
}

# ---- the restores: each reads back and is a STOP (not-restored) when the state is not as found ---------------------------------------------------------
function Restore-R19Js { $r19o = Use-S16Options; if (-not @(Set-S11Flag $r19o 'evaluate' $true)[-1]) { Stop-R19 'not-restored' 'JavaScript did not read back on' } }
function Restore-R19Block { $r19o = Use-S16Options; if (-not @(Set-S11BoxVerified $r19o 'blocklist' (Get-S11FoundText 'blocklist'))[-1]) { Stop-R19 'not-restored' 'the block list did not read back as found' } }
function Set-R19BlockAdd([string]$Pattern) {
  $r19o = Use-S16Options; $r19t = (Get-S11FoundText 'blocklist').TrimEnd()
  [void](Set-S11Box $r19o 'blocklist' $(if ($r19t) { "$r19t`n$Pattern" } else { $Pattern }))
}
function Set-R19JsOff { $r19o = Use-S16Options; if (-not @(Set-S11Flag $r19o 'evaluate' $false)[-1]) { Stop-R19 'throw-after-state' 'JavaScript did not read back off' } }
function Test-R19Armed { "$(@(Get-S9ActionTitle $global:W)[-1])" -eq $S9TitleArmed }   # the toolbar title (s9-win.ps1), exactly: not '*armed*' ('disarmed' contains it), not the worker's log line
function Switch-R19Toolbar([bool]$WantArmed) {
  if ((Test-R19Armed) -eq $WantArmed) { return }
  [void](Set-S11Front $global:W 'R19 toolbar'); $r19pre = Get-S12NowMs; [void](Invoke-S9ActionButton $global:W); Start-Sleep -Milliseconds 700
  if ((Test-R19Armed) -ne $WantArmed) { Stop-R19 $(if ($WantArmed) { 'not-restored' } else { 'throw-after-state' }) 'the toolbar button did not change the armed state' }
  $global:R19Press = @{ pre = $r19pre; post = (Get-S12NowMs) }
}
function Open-R19OwnWindow { if (Test-S11Own $global:O) { Close-S11Window $global:O; $global:O = 0 }; [void](Use-S16Options) }
function Open-R19FileWindow {
  $global:R19Fw = [long](@(Open-S11bFileWindow $Root (Join-Path $Root 's11b-file.html'))[-1])
  if ($global:R19Fw -le 0) { Stop-R19 'throw-after-state' 'the file window did not open' }
}
function Close-R19FileWindow { if ($global:R19Fw) { Close-S11Window $global:R19Fw; $global:R19Fw = 0 } }

# ---- R19-BANNER-CTL and R19-CON-BANNER: three or two sampler passes beside one actor, judged from the passes' own results ----------------------------
function Get-R19Leg([string]$Id, [string[]]$Out) { $r19r = $global:R19Bw[$Id]; "$($r19r.Polls),$($r19r.Banner),$(Get-R19IdleOf $Out $Id)" }
function Invoke-R19BannerCtl {
  $global:R19Bw = @{}; [void](Set-S11Front $global:W 'R19-BANNER-CTL')
  $r19sp = @(@{ k = 's'; id = 'R19-BANNER-CTL-neg' }, @{ k = 's'; id = 'R19-BANNER-CTL-pos' })
  $r19rc = [int](@(Invoke-R19Node 's12-r19-a' @('banner-ctl', '--slice', $global:R19Slice) { Invoke-R19Steps $r19sp })[-1])
  $r19o = @($global:R17Out)
  if ($r19rc -eq 2) { Stop-R19Actor 'R19-BANNER-CTL' $r19o }
  $r19n = $global:R19Bw['R19-BANNER-CTL-neg']; $r19p = $global:R19Bw['R19-BANNER-CTL-pos']
  $r19a = [regex]::Match(($r19o -join "`n"), 'ANSWER R19-BANNER-CTL pos (\S+)')
  $r19c = [int](@(Invoke-R19Node 's12-r19-a' @('banner-ctl-judge', '--slice', $global:R19Slice, '--idle', "$(Get-R19IdleOf $r19o 'R19-BANNER-CTL')", '--neg', "$($r19n.Polls),$($r19n.Banner)", '--pos', "$($r19p.Polls),$($r19p.Banner),$(if ($r19a.Success) { $r19a.Groups[1].Value } else { 'ERROR' })"))[-1])
  $global:R19Ctl = $(if ($r19c -eq 0) { 'pass' } else { 'fail' })
  Complete-R19Row 'R19-BANNER-CTL' @($global:R17Out)
}
function Invoke-R19ConBanner {
  $global:R19Bw = @{}; [void](Set-S11Front $global:W 'R19-CON-BANNER')
  $r19ids = 'R19-CON-BANNER-neg', 'R19-CON-BANNER-pos', 'R19-CON-BANNER-after'
  $r19sp = @($r19ids | ForEach-Object { @{ k = 's'; id = $_ } })
  $r19rc = [int](@(Invoke-R19Node 's12-r19-a' @('con-banner', '--slice', $global:R19Slice) { Invoke-R19Steps $r19sp })[-1])
  $r19o = @($global:R17Out)
  if ($r19rc -eq 2) { Stop-R19Actor 'R19-CON-BANNER' $r19o }
  $r19a = [regex]::Match(($r19o -join "`n"), 'ANSWER R19-CON-BANNER pos (\S+)')
  [void](Invoke-R19Node 's12-r19-a' @('banner-con', '--neg', (Get-R19Leg $r19ids[0] $r19o), '--pos', (Get-R19Leg $r19ids[1] $r19o), '--after', (Get-R19Leg $r19ids[2] $r19o), '--answer', $(if ($r19a.Success) { $r19a.Groups[1].Value } else { 'ERROR' })))
  Complete-R19Row 'R19-CON-BANNER' @($global:R17Out)
}
# R19-RESTORE (Invoke-R19Restore in s12-r19-lib.ps1) calls this in liveA19 only: the one close block for the control row's `bc` tab (the sheet: it closes at the slice's end).
function Close-R19Bc { [void](Invoke-R19Node 's12-r19-a' @('close-bc', '--slice', $global:R19Slice)) }

# recipes/s12-r19-c.ps1: the row drivers of Run 19's liveC19 (Step 12 S7-drivers-C; docs/e2e-test-plan.md section 4.27: the file chooser and G2). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome by its author. recipes/s12-r19.ps1 dot-sources this file after s12-r19-a.ps1 and -b.ps1 and registers each driver in $global:R19Blocks. The actors are
# recipes/s12-r19-c.ts (node); every row goes through Invoke-R19Row (s12-r19-a.ps1), so a STOP goes through Stop-R19 and the verdict is the worst LEG line. The actor asks for the
# native-dialog count, the human-style click and the closer by a step id (a `val` step): the step list below is built in the actor's own order. Every chooser row ends in a
# finally that runs the closer on the wave's windows and closes window X; a dialog the closer cannot close is the returning STOP dialog-left-open. Names carry an R19 prefix.
$R19Fx = 'http://127.0.0.1:8081/'
$R19McpLegs = @()

# ---- the dialog closer for the rows: counts are UIA's, owner = a window the wave opened (S7-helpers-c) --------------------------------------------------
function Get-R19DlgWindows { @(@($global:W, $global:R19Xk) | Where-Object { $_ -and (Test-S9Live $_) } | ForEach-Object { [long]$_ } | Select-Object -Unique) }
# Closes every native dialog the wave's windows own, never another window's; a dialog left is the STOP. Returns how many dialogs it saw.
function Close-R19Dialogs {
  $r19n = 0
  foreach ($r19h in (Get-R19DlgWindows)) {
    $r19c = [int](Get-S12DialogCount $r19h)
    if ($r19c -le 0) { continue }
    $r19n += $r19c; $r19s0 = $global:S16Stops
    [void](Close-S12Dialog $r19h)
    if ($global:S16Stops -gt $r19s0 -or [int](Get-S12DialogCount $r19h) -ne 0) { Stop-R19 'dialog-left-open' 'a native file dialog was left open after the closer' }
  }
  $r19n
}
# The `dlg` value step: the count seen (before it is closed, so the next leg starts clean).
function Get-R19DialogN { [int](Close-R19Dialogs) }
# The human-style click on window X, the wait for Chrome's own dialog, then the wave closes it: `before,after-click,after-close,ms`. A click the helper did not send
# (target, foreground or point not right) answers `unsent`: the actor records NOT MEASURED, never the product's STOP dialog-not-opened.
function Invoke-R19HumanDialog([long]$Hwnd) {
  $r19b = [int](Get-S12DialogCount $Hwnd)
  if (-not (@(Invoke-S12HumanClick $Hwnd)[-1] -eq $true)) { return 'unsent' }
  $r19a = [int](Wait-S12DialogOpen $Hwnd 3000); $r19ms = 0; $r19z = $r19a
  if ($r19a -gt 0) {
    $r19s0 = $global:S16Stops; $r19r = Close-S12Dialog $Hwnd; $r19ms = [int]$r19r.Ms; $r19z = [int](Get-S12DialogCount $Hwnd)
    if ($global:S16Stops -gt $r19s0) { Stop-R19 'dialog-left-open' 'the closer left a native dialog open' }
  }
  "$r19b,$r19a,$r19z,$r19ms"
}
# The LATE watch: reads for $Ms from the step (the call's start; the actor's LATE_WATCH_MS = 8 000 ms after the click plus the click's lead), closes whatever opens at once, answers the most seen.
function Watch-R19Dialogs([int]$Ms) {
  $r19t0 = Get-S12NowMs; $r19max = 0
  do { $r19c = [int](Close-R19Dialogs); if ($r19c -gt $r19max) { $r19max = $r19c }; Start-Sleep -Milliseconds 200 } while (((Get-S12NowMs) - $r19t0) -lt $Ms)
  $r19max
}
# The human-style click is proved by the row-less CLOSERPROBE first (Invoke-R19Closer sets $global:R19HumanClick); anything but $true is NOT MEASURED, never a product STOP.
function Test-R19HumanOk { $global:R19HumanClick -eq $true }
function Get-R19HumanWord { if (Test-R19HumanOk) { 'yes' } else { 'no' } }
# The page's digest test for CHOOSE-HUMAN: `#sum=<sha256 of the outside file>`, so an outside file reaching the page shows as bytes-equal (same size as the Upload folder's file).
function Get-R19OutSumFrag {
  $r19p = Join-Path $env:S11_OUT 'wave\outside\s11-out.bin'
  if (-not (Test-Path -LiteralPath $r19p)) { Stop-R19 'throw-after-state' 'the outside file is missing' }
  '#sum=' + (Get-FileHash -LiteralPath $r19p -Algorithm SHA256).Hash.ToLower()
}
# DevTools windows other than the worker-console capture window ($global:D), by window title.
function Get-R19DevToolsCount { $r19d = 0; foreach ($r19c in @(Get-S9ChromeWindows -AnyTitle)) { if ([long]$r19c -ne [long]$global:D -and ([S9Win]::Text([IntPtr]$r19c) -match '^DevTools')) { $r19d++ } }; $r19d }
# R19-RESTORE's DIALOGS line for liveC19 (form (30)): UIA counts at the slice's end; a dialog or DevTools window left open is the returning STOP.
function Write-R19Dialogs {
  $r19n = 0; foreach ($r19h in (Get-R19DlgWindows)) { $r19n += [int](Get-S12DialogCount $r19h) }
  $r19d = [int](Get-R19DevToolsCount)
  $r19w = @(@($global:R19Xk, $global:O) | Where-Object { $_ -and (Test-S9Live $_) } | Select-Object -Unique).Count
  [void](Invoke-R19Node 's12-r19-c' @('dialogs', '--slice', "$global:R19Slice", '--native', "$r19n", '--devtools', "$r19d", '--windows', "$r19w"))
  if ($r19n -gt 0) { Stop-R19 'dialog-left-open' 'a native file dialog is still open at the slice end' }
  if ($r19d -gt 0) { Stop-R19 'devtools-left-open' 'a DevTools window is still open at the slice end' }
}
# CHOOSE-FRAME and CHOOSE-HUMAN are RECORD rows: Complete-R19Row prints ROW <id> RECORD unless a clause failed.
$global:R19RecordRows = @('R19-CHOOSE-FRAME', 'R19-CHOOSE-HUMAN')

# ---- step lists ---------------------------------------------------------------------------------------------------------------------------------
function New-R19Dlg([string]$Id, [int]$N) { , @(1..$N | ForEach-Object { @{ k = 'val'; id = "$Id-dlg$_"; f = { Get-R19DialogN } } }) }
function New-R19Open([string]$Id, [string]$Url) { @{ k = 'do'; id = "$Id-open"; f = { Open-R19Xk $Url }.GetNewClosure() } }
function New-R19ClickStep([string]$Id) { @{ k = 'val'; id = $Id; f = { Invoke-R19HumanDialog $global:R19Xk } } }
# One chooser row: Invoke-R19Row, then the closer and window X's close in a finally whatever happened (a failure path closes what it caused).
function Invoke-R19Ch([string]$Id, [string[]]$Cmd, [object[]]$StepList = @(), [scriptblock]$Restore = $null, [string]$Banner = '', [string]$Why = 'attach-on-refused-page') {
  try { Invoke-R19Row $Id $Cmd -StepList $StepList -Restore $Restore -Banner $Banner -Why $Why -Actor 's12-r19-c' -BudgetS 600 }
  finally { [void](Close-R19Dialogs); Close-R19Xk }
}

# ---- the rows ---------------------------------------------------------------------------------------------------------------------------------------
function Invoke-R19Choose1 { Invoke-R19Ch 'R19-CHOOSE-1' @('choose-1') -StepList (@(@{ k = 's'; id = 'R19-CHOOSE-1' }) + @((New-R19Dlg 'R19-CHOOSE-1' 2))) -Banner call }
function Invoke-R19ChooseLabel { Invoke-R19Ch 'R19-CHOOSE-LABEL' @('choose-label') -StepList @((New-R19Dlg 'R19-CHOOSE-LABEL' 3)) }
function Invoke-R19ChooseRefuse { Invoke-R19Ch 'R19-CHOOSE-REFUSE' @('choose-refuse') -StepList @((New-R19Dlg 'R19-CHOOSE-REFUSE' 4)) }
function Invoke-R19Choose2 { Invoke-R19Ch 'R19-CHOOSE-2' @('choose-2', '--toggle', $(if ($global:S16Toggle -eq 'off') { 'off' } else { 'on' })) -StepList (@(@{ k = 's'; id = 'R19-CHOOSE-2' }) + @((New-R19Dlg 'R19-CHOOSE-2' 1))) -Banner refused -Why attach-on-refused-page }
function Invoke-R19Choose3 { Invoke-R19Ch 'R19-CHOOSE-3' @('choose-3') -StepList @((New-R19Dlg 'R19-CHOOSE-3' 1)) }
function Invoke-R19ChooseKept { Invoke-R19Ch 'R19-CHOOSE-KEPT' @('choose-kept') -StepList @(@{ k = 't'; id = 'R19-CHOOSE-KEPT'; ms = 16000; ev = @{} }, @{ k = 'val'; id = 'R19-CHOOSE-KEPT-dlg'; f = { Get-R19DialogN } }) }
function Invoke-R19ChooseFrame { Invoke-R19Ch 'R19-CHOOSE-FRAME' @('choose-frame') -StepList @((New-R19Dlg 'R19-CHOOSE-FRAME' 1)) }
function Invoke-R19KeepOverlapB { Invoke-R19Ch 'R19-KEEP-OVERLAP' @('overlap-b') }
function Invoke-R19ChooseHuman {
  if (-not (Test-R19HumanOk)) { Say9 "ROW R19-CHOOSE-HUMAN NOT MEASURED $Dash the human-style click opens no dialog"; return }
  $r19R = 'R19-CHOOSE-HUMAN'
  Invoke-R19Ch $r19R @('choose-human') -StepList @((New-R19Open $r19R "${R19Fx}s12-chooser.html?s12=human&s12x=human$(Get-R19OutSumFrag)"), (New-R19ClickStep "$r19R-click")) -Restore { [void](Close-R19Dialogs); Close-R19Xk }
}
function Invoke-R19ChooseLate {
  $r19R = 'R19-CHOOSE-LATE'
  $r19l = @(); foreach ($r19k in 4900, 5100) { $r19q = $(if ($r19k -eq 4900) { 'late49' } else { 'late51' }); $r19l += (New-R19Open "$r19R-$r19k" "${R19Fx}s12-chooser.html?s12=$r19q&s12x=$r19q"); $r19l += @{ k = 'val'; id = "$r19R-$r19k-watch"; f = { Watch-R19Dialogs 9500 } } }
  Invoke-R19Ch $r19R @('choose-late') -StepList $r19l -Restore { [void](Close-R19Dialogs); Close-R19Xk }
}
function Invoke-R19Choose4 {
  if (-not (Test-R19HumanOk)) { Say9 "ROW R19-CHOOSE-4 NOT MEASURED $Dash the human-style click opens no dialog"; return }
  $r19R = 'R19-CHOOSE-4'
  $r19l = @(); foreach ($r19s in @(@('a', 'c1'), @('b', 'none'), @('c', 'single'))) { $r19l += (New-R19Open "$r19R-$($r19s[0])" "${R19Fx}s12-chooser.html?s12=$($r19s[1])&s12x=c4$($r19s[0])"); $r19l += (New-R19ClickStep "$r19R-$($r19s[0])-click") }
  Invoke-R19Ch $r19R @('choose-4', '--human', 'yes') -StepList $r19l -Restore { [void](Close-R19Dialogs); Close-R19Xk }
}
# DISARM: the first half needs no click; the second half (re-armed, a human-style click) only when the click was proved.
function Invoke-R19ChooseDisarm {
  $r19R = 'R19-CHOOSE-DISARM'; $r19hy = Test-R19HumanOk
  $r19l = @((New-R19Open $r19R "${R19Fx}s12-chooser.html?s12=none&s12x=disarm"), @{ k = 'do'; id = "$r19R-off"; f = { Switch-R19Toolbar $false } }, @{ k = 'undo'; id = "$r19R-off"; f = { Switch-R19Toolbar $true } })
  $r19l += @((New-R19Dlg $r19R 1))
  if ($r19hy) { $r19l += (New-R19ClickStep "$r19R-disarm-click") }
  Invoke-R19Ch $r19R @('choose-disarm', '--human', (Get-R19HumanWord)) -StepList $r19l -Restore { Switch-R19Toolbar $true; [void](Close-R19Dialogs); Close-R19Xk }
}
function Invoke-R19ChooseJsoff {
  $r19R = 'R19-CHOOSE-JSOFF'
  $r19l = @((New-R19Steps "$r19R-js" $r19R { Set-R19JsOff } { Restore-R19Js })) + @((New-R19Dlg $r19R 1))
  Invoke-R19Ch $r19R @('choose-jsoff') -StepList $r19l -Restore { Restore-R19Js } -Banner refused -Why attach-on-refused-page
}
# CHOOSE-MCP spans two blocks (W4): legs a-c, e print no ROW (their LEG lines are held); leg d, with JavaScript off, completes the row.
function Invoke-R19McpLegs {
  $global:R19McpLegs = @()
  $r19sp = @((New-R19Dlg 'R19-CHOOSE-MCP' 3)); $r19drv = { Invoke-R19Steps $r19sp }.GetNewClosure()
  $r19rc = 0
  try { $r19rc = [int](@(Invoke-R19Node 's12-r19-c' @('choose-mcp', '--slice', $global:R19Slice, '--ctl', (Get-R19CtlWord)) $r19drv 600)[-1]) }
  finally { [void](Close-R19Dialogs) }
  $global:R19McpLegs = @($global:R17Out)
  if ($r19rc -eq 2) { Stop-R19Actor 'R19-CHOOSE-MCP' $global:R19McpLegs }
}
function Invoke-R19McpD {
  $r19R = 'R19-CHOOSE-MCP'
  $r19sp = @((New-R19Steps "$r19R-d-js" '' { Set-R19JsOff } { Restore-R19Js })) + @(@{ k = 'val'; id = "$r19R-d-dlg"; f = { Get-R19DialogN } })
  $global:S16Changed = $true; Save-S16
  $global:R19Changed = $false; $r19drv = { Invoke-R19Steps $r19sp }.GetNewClosure(); $r19rc = 0
  try { $r19rc = [int](@(Invoke-R19Node 's12-r19-c' @('choose-mcp-d', '--slice', $global:R19Slice, '--ctl', (Get-R19CtlWord)) $r19drv 600)[-1]) }
  finally { if ($global:R19Changed) { Restore-R19Js; $global:R19Changed = $false }; [void](Close-R19Dialogs) }
  $r19o = @($global:R17Out)
  if ($r19rc -eq 2) { Stop-R19Actor $r19R $r19o }
  Complete-R19Row $r19R (@($global:R19McpLegs) + $r19o)
}
# G2: window X on the A page (the actor opens B's tab first, in the window the wave stands in); no state change.
function Invoke-R19G2([string]$Id, [string]$Cmd) {
  [void](Set-S11Front $global:W $Id)   # B's tab opens active in the wave's own window, never in another one (S7-drivers-C fixer, MINOR-9)
  Invoke-R19Ch $Id @($Cmd) -StepList @((New-R19Open $Id "${R19Fx}e2e-playground.html?s12=g2a&s12x=g2a")) -Restore { Close-R19Xk }
}

# recipes/s13-r20-c-defs.ps1: the PowerShell side of liveC20 (Step 13 S5-drivers-C3; docs/e2e-test-plan.md section 4.28). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome, a daemon or a port by its author. Definitions only (no main, no param block): recipes/s13-r20-c.ps1 dot-sources it at its top level AFTER s13-r20.ps1 and s13-devt.ps1,
# then calls Register-R20Blocks and Register-R20CBlocks (this file's, last: it replaces the restore block). The actor is recipes/s13-r20-c.ts (interface: S5-drivers-C2-fixer2.md section 3); the DevTools
# helpers are recipes/s13-devt.ps1. Window X is the wave's window W (it shows the fixture page of Run 17's window block; the actors open their tabs active in it). Run 17/19 files are read-only; names carry R20C.
# Every actor row is answered through ONE `serve` step (#412: 120 s idle, 600 s per row; a throw is the STOP throw-after-state). DevTools is opened only in X on a fixture page, closed by the wave after each row.
$global:R20DockFound = ''; $global:R20CGate = ''; $global:R20CRoot = $false; $global:R20CWords = @(); $global:R20CRefuse = @(); $global:R20CPick = $null; $global:R20CCondSet = $false; $global:R20CFlagDone = $false; $global:R20CDockChanged = $false
# The legs' tab markers: tied to MARKER in recipes/s13-r20-c.ts by a test.
$R19Order['dockdiag'] = @('preflight', 'servers', 'window', 'dockdiag')   # #418: the diagnostic of the dock read needs window X and the fixture server only: no files, no reload (the safety state is never changed), no capture window, no actor
$R20CMark = @{ undock = 's12x=r20u1'; early_undocked = 's12x=r20eu1'; early_docked = 's12x=r20ed1'; up = 's12x=r20cup'; keep = 's12x=r20ck4'; sweep = 's12x=r20csw' }
# ---- pure parts (tested with stubs: recipes/test/s13-r20-c-ps.test.ts) -----------------------------------------------------------------------------------
function ConvertTo-R20CLegWord([string]$Verdict) { if ($Verdict -eq 'PASS') { 'PASS' } elseif ($Verdict -like 'RECORD*') { 'RECORD' } elseif ($Verdict -like 'NOT MEASURED*') { 'NM' } else { 'FAIL' } }
# The verdict words of one DEVT row's LEG lines, in print order (the `--legs` of gate-cond); the line may carry the s9 time prefix.
function Get-R20CLegWords([string[]]$Lines, [string]$Row) {
  @($Lines | ForEach-Object { [regex]::Match("$_", '(?:^|\s)LEG ' + [regex]::Escape($Row) + ' \S+ (.+?)\s*$') } | Where-Object { $_.Success } | ForEach-Object { ConvertTo-R20CLegWord $_.Groups[1].Value })
}
# The labels of the DEVT legs that printed the finding (the `--findings` of gate-cond).
function Get-R20CRefusing([string[]]$Lines) {
  @($Lines | ForEach-Object { [regex]::Match("$_", '(?:^|\s)CHECK R20-DEVT-(?:UNDOCK|EARLY) finding=devtools-refuses leg=(\S+)\s*$') } | Where-Object { $_.Success } | ForEach-Object { $_.Groups[1].Value })
}
# gate-cond's chosen leg and condition (the actor chooses; this only reads its line).
function Get-R20CPick([string[]]$Lines) {
  $r20m = @($Lines | ForEach-Object { [regex]::Match("$_", '(?:^|\s)CHECK gate-cond under=(\S+) leg=(undocked|docked) cond=(earlier|none) not-rerun=(\S+)\s*$') } | Where-Object { $_.Success })
  if (-not $r20m.Count) { return $null }
  [pscustomobject]@{ under = $r20m[-1].Groups[1].Value; leg = $r20m[-1].Groups[2].Value; cond = $r20m[-1].Groups[3].Value }
}
# Get-S13Control's object -> the actor's `<windows|na> <ok|none|na> <yes|no|unread> <targets>`.
function Format-R20Ctl($C) {
  $r20w = if ($null -eq $C.windows) { 'na' } else { "$($C.windows)" }; $r20t = if ("$($C.title)" -eq 'n/a') { 'na' } else { "$($C.title)" }
  "$r20w $r20t $($C.attached) $([int]$C.targets)"
}
function Get-R20CX { [long]$global:W }
function Get-R20CSide([string]$State) { if ($State -ne 'docked') { return 'undock' }; if ($global:R20DockFound -in 'bottom', 'right', 'left') { $global:R20DockFound } else { 'bottom' } }   # a docked leg keeps the found docked side, else bottom: fewest changes
# ---- the answers ---------------------------------------------------------------------------------------------------------------------------------------
function Read-R20CCtl([string]$Marker, [string]$State) { Format-R20Ctl (Get-S13Control (Get-R20CX) 8081 $Marker $(if ($State -eq 'docked') { 'docked' } else { 'undock' })) }
function Open-R20CDevt([string]$Side) { if ($Side) { $global:R20CDockChanged = $true }; $r20r = Open-S13DevTools (Get-R20CX) 8081 $Side; if ($r20r.opened -and $r20r.done) { 'ok' } else { 'fail' } }
function Close-R20CDevt { try { "$((Close-S13DevTools (Get-R20CX) 8081).remaining)" } catch { 'unread' } }
function Read-R20CCheck { if ((Test-S13Pane (Get-R20CX)) -or @(Get-S13Titles | Where-Object { (Test-S13DevtTitle $_.title 8081) -or ($_.title -match '^DevTools' -and (Test-S11Own $_.h)) }).Count) { 'yes' } else { 'no' } }
# One leg's handlers: <row>-<leg>-<step>, the steps in the actor's names. The marker and the side are fixed words, so the blocks are built from text and carry no closure.
function New-R20CHandlers([string]$Row, [string]$Leg, [string]$State, [string]$Marker, [string[]]$Steps, [string]$Side = '', $Into = $null) {
  if (-not (Test-S13Marker $Marker)) { throw 'the marker is not a fixed plain word' }
  $r20h = if ($Into) { $Into } else { [ordered]@{} }
  foreach ($r20s in $Steps) {
    $r20h["$Row-$Leg-$r20s"] = switch -Regex ($r20s) {
      '^ctl\d$' { [scriptblock]::Create("Read-R20CCtl '$Marker' '$State'") }
      '^open$' { [scriptblock]::Create("Open-R20CDevt '$Side'") }
      '^close$' { [scriptblock]::Create('Close-R20CDevt') }
      '^check$' { [scriptblock]::Create('Read-R20CCheck') }
      default { throw "no answer for the step $r20s" }
    }
  }
  $r20h
}
# ---- one actor row ---------------------------------------------------------------------------------------------------------------------------------------
# X in front first; the row (or $Body) runs; DevTools is closed afterwards whatever happened (a failure of the row wins over the left-open STOP, so its reason is kept); a DevTools window or pane still there is the STOP devtools-left-open.
function Invoke-R20CGuarded([string]$Id, [scriptblock]$Body) {
  [void](Set-S11Front (Get-R20CX) $Id); $r20err = $null
  try { & $Body } catch { $r20err = $_ }
  $r20left = $true; try { $r20left = ((Close-S13DevTools (Get-R20CX) 8081).remaining -gt 0) } catch { }
  if ($r20err) { throw $r20err }
  if ($r20left) { Stop-R19 'devtools-left-open' "$Id`: DevTools was left open" }
}
function Invoke-R20CRow([string]$Id, [string[]]$Cmd, $Handlers, [scriptblock]$Pre = $null) {
  $r20sp = @(@{ k = 'serve'; h = $Handlers; s = 600 })
  Invoke-R20CGuarded $Id { if ($Pre) { & $Pre }; Invoke-R19Row $Id $Cmd -StepList $r20sp -Actor 's13-r20-c' -BudgetS 600 }.GetNewClosure()
}
# #418 F3: ONE fixed-word CHECK line with the counts of the last dock read (Read-S13DockSide leaves them in $global:S13DockDiag; none left = n/a). A diagnostic, never a verdict or a row.
function Write-R20CDockRead([string]$Row) {
  $r20d = $global:S13DockDiag; $r20v = { param($n) if ($r20d -and "$($r20d.$n)" -ne '') { "$($r20d.$n)" } else { 'n/a' } }
  [void](Invoke-R19Node 's13-r20-c' @('dock-read', '--row', $Row, '--windows', (& $r20v 'windows'), '--pane', (& $r20v 'pane'), '--customize', (& $r20v 'customize'), '--invoked', (& $r20v 'invoked'), '--items', (& $r20v 'items'), '--kinds', (& $r20v 'kinds'), '--pressed-readable', (& $r20v 'pr'), '--pressed', (& $r20v 'pressed'), '--try', (& $r20v 'trynum')))
}
# ---- R20-0C, FLAG --------------------------------------------------------------------------------------------------------------------------------------
# R20-0C is R20-0's proof under its own row id; its ROW line comes first (Invoke-R20Zero ends with it), then DOCK, then the gate. A DOCK side that cannot be read is no failure of the proof: it gates the five rows below (gate-dock).
function Invoke-R20CZero {
  Invoke-R20Zero $R17bZero 'R20-0C'
  $r20read = @{ side = 'unread' }   # a reference the closure fills
  $global:S13DockDiag = $null
  Invoke-R20CGuarded 'R20-0C' { $r20o = Open-S13DevTools (Get-R20CX) 8081; if ($r20o.opened) { $r20read.side = Read-S13DockSide (Get-R20CX) 8081 } }.GetNewClosure()
  Write-R20CDockRead 'R20-0C'
  $global:R20DockFound = "$($r20read.side)"
  [void](Invoke-R19Node 's13-r20' @('dock', '--row', 'R20-0C', '--side', $global:R20DockFound))
  $r20rc = [int](@(Invoke-R19Node 's13-r20-c' @('gate-dock', '--dock', $global:R20DockFound))[-1])
  if ($r20rc -eq 0) { $global:R20CGate = 'run' } elseif ($r20rc -eq 3) { $global:R20CGate = 'notrun' } else { Stop-R19Actor 'gate-dock' $global:R17Out }
}
# FLAG: exactly one line in the slice, after R20-0C's ROW and DOCK lines (its own block in the order); a record, never a verdict.
function Write-R20CFlag { if ($global:R20CFlagDone) { return }; $global:R20CFlagDone = $true; [void](Invoke-R19Node 's13-r20' @('flag', '--value', (Read-S13Flag))) }
# ---- R20-DEVT-UNDOCK, R20-DEVT-EARLY ---------------------------------------------------------------------------------------------------------------------
function Add-R20CDevtResult([string]$Row) {
  $r20o = @($global:R17Out)
  $global:R20CWords = @($global:R20CWords) + @(Get-R20CLegWords $r20o $Row)
  $global:R20CRefuse = @($global:R20CRefuse) + @(Get-R20CRefusing $r20o)
}
function Invoke-R20CUndock {
  $r20h = New-R20CHandlers 'R20-DEVT-UNDOCK' 'undock' 'undock' $R20CMark.undock @('ctl0', 'open', 'ctl1', 'close') 'undock'
  Invoke-R20CRow 'R20-DEVT-UNDOCK' @('devt-undock') $r20h
  Add-R20CDevtResult 'R20-DEVT-UNDOCK'
}
function Invoke-R20CEarly {
  $r20h = New-R20CHandlers 'R20-DEVT-EARLY' 'undocked' 'undock' $R20CMark.early_undocked @('ctl0', 'open', 'ctl1', 'close') 'undock'
  [void](New-R20CHandlers 'R20-DEVT-EARLY' 'docked' 'docked' $R20CMark.early_docked @('ctl0', 'open', 'ctl1', 'close') (Get-R20CSide 'docked') $r20h)
  Invoke-R20CRow 'R20-DEVT-EARLY' @('devt-early') $r20h
  Add-R20CDevtResult 'R20-DEVT-EARLY'
}
# ---- the conditional rows --------------------------------------------------------------------------------------------------------------------------------
# gate-cond runs once, at the first conditional block: no refusing leg prints the three NOT RUN rows and the finding (exit 3); else it names the leg to run under and the condition (condFor, in the actor).
function Test-R20CCond {
  if ($global:R20CGate -ne 'run') { return $false }
  if (-not $global:R20CCondSet) {
    $global:R20CCondSet = $true
    $r20a = @('gate-cond', '--findings', $(if (@($global:R20CRefuse).Count) { @($global:R20CRefuse) -join ',' } else { 'none' }))
    if (@($global:R20CWords).Count) { $r20a += @('--legs', (@($global:R20CWords) -join ',')) }   # an empty argument would be dropped (recipes/CLAUDE.md), so none means no --legs
    $r20rc = [int](@(Invoke-R19Node 's13-r20-c' $r20a)[-1])
    if ($r20rc -eq 0) { $global:R20CPick = Get-R20CPick $global:R17Out; if (-not $global:R20CPick) { Stop-R19 'throw-after-state' 'gate-cond named no leg to run under' } }
    elseif ($r20rc -ne 3) { Stop-R19Actor 'gate-cond' $global:R17Out }
  }
  [bool]$global:R20CPick
}
function Invoke-R20CUpDevt {
  $r20p = $global:R20CPick
  if (-not $global:R20CRoot) { & $global:R19Blocks['root-add']; $global:R20CRoot = $true }   # ROOT for UP-DEVT only; R20-RESTORE removes it (rd-restore restores the found Upload folders)
  $r20s = if ($r20p.leg -eq 'docked') { 'docked' } else { 'undock' }
  $r20h = New-R20CHandlers 'R20-UP-DEVT' $r20p.leg $r20s $R20CMark.up @('ctl0', 'open', 'ctl1', 'ctl2', 'close') (Get-R20CSide $r20p.leg)
  Invoke-R20CRow 'R20-UP-DEVT' @('up-devt', '--leg', $r20p.leg, '--cond', $r20p.cond) $r20h
}
# KEEP-4: the dock side is set in an EARLIER DevTools session, so the row's own open is plain and needs no dock change (C2 fixer1: a change inside the open could pass the keeper's 5 s bound and make both legs NOT MEASURED).
function Invoke-R20CKeep4 {
  $r20p = $global:R20CPick; $r20side = Get-R20CSide $r20p.leg
  $r20h = New-R20CHandlers 'R20-KEEP-4' $r20p.leg $(if ($r20p.leg -eq 'docked') { 'docked' } else { 'undock' }) $R20CMark.keep @('open', 'ctl1', 'close') ''
  Invoke-R20CRow 'R20-KEEP-4' @('keep-4', '--leg', $r20p.leg) $r20h -Pre { $global:R20CDockChanged = $true; try { [void](Open-S13DevTools (Get-R20CX) 8081 $r20side) } finally { [void](Close-S13DevTools (Get-R20CX) 8081) } }.GetNewClosure()
}
# SWEEP-HELD: two actor runs and ONE row. Phase 1 holds DevTools open; unless it ended in a measurement (exit 0) there is no reload and no phase 2, and the tab is closed (C2 verifier3 H3). Otherwise the
# capture is saved before the reload and reopened after it, the build is proven again (LOADED20 rerun=<k>), and phase 2 judges. Phase 1's lines are carried (R20Carry) into the row phase 2 (or the early exit) completes.
function Invoke-R20CReload {
  Save-R19Seg 'reload'
  & $global:R19Blocks['reload']
  Open-R19Seg
  if (-not (Invoke-R19Rerun)) { Stop-R19 'old-build-left-loaded' 'R20-SWEEP-HELD: the loaded extension is stale after the reload (the re-run proof failed)' }
}
function Invoke-R20CSweep {
  $r20p = $global:R20CPick; $r20row = 'R20-SWEEP-HELD'
  $r20s = if ($r20p.leg -eq 'docked') { 'docked' } else { 'undock' }
  $r20h1 = New-R20CHandlers $r20row $r20p.leg $r20s $R20CMark.sweep @('ctl0', 'open', 'ctl1') (Get-R20CSide $r20p.leg)
  $r20h2 = New-R20CHandlers $r20row $r20p.leg $r20s $R20CMark.sweep @('ctl2', 'check', 'close')
  Invoke-R20CGuarded $r20row {
    $r20sp = @(@{ k = 'serve'; h = $r20h1; s = 600 })
    $r20drv = { Invoke-R19Steps $r20sp }.GetNewClosure()
    $r20rc = [int](@(Invoke-R19Node 's13-r20-c' @('sweep-held', '--leg', $r20p.leg, '--cond', $r20p.cond, '--phase', '1', '--slice', $global:R19Slice, '--ctl', (Get-R19CtlWord)) $r20drv 600)[-1])
    $r20o1 = @($global:R17Out)
    if ($r20rc -eq 2) { Stop-R19Actor $r20row $r20o1 }
    $global:R20Carry[$r20row] = @($r20o1 | Where-Object { "$_" -match '(?:^|\s)LEG ' })
    try {
      if ($r20rc -ne 0) {   # no measurement: the tab is closed, nothing is reloaded, and phase 1's verdict is the row's
        [void](Invoke-R19Node 's13-r20-c' @('sweep-held', '--leg', $r20p.leg, '--phase', 'close', '--slice', $global:R19Slice, '--ctl', (Get-R19CtlWord)))
        Complete-R19Row $r20row @()
        return
      }
      Invoke-R20CReload
      Invoke-R19Row $r20row @('sweep-held', '--leg', $r20p.leg, '--phase', '2') -StepList @(@{ k = 'serve'; h = $r20h2; s = 600 }) -Actor 's13-r20-c' -BudgetS 600
    } finally { $global:R20Carry.Remove($r20row) }
  }.GetNewClosure()
}
# ---- R20-RESTORE (slice C), R20-LOGS ---------------------------------------------------------------------------------------------------------------------
# Counts: native dialogs (UIA, the wave's windows), DevTools windows by title over EVERY Chrome window but the capture (Get-S13Titles leaves $global:D out; a human's DevTools counts too: C1 verifier2 N1,
# not Close-S13DevTools's narrower `remaining`), wave windows. The slice letter is printed as the sheet writes it (DIALOGS C ...).
function Get-R20CDevtCount { @(Get-S13Titles | Where-Object { $_.title -match '^DevTools' }).Count }
function Write-R20CDialogs {
  $r20n = 0; foreach ($r20h in (Get-R19DlgWindows)) { $r20n += [int](Get-S12DialogCount $r20h) }
  $r20d = [int](Get-R20CDevtCount)
  $r20w = @(@($global:R19Xk, $global:O) | Where-Object { $_ -and (Test-S9Live $_) } | Select-Object -Unique).Count
  [void](Invoke-R19Node 's12-r19-c' @('dialogs', '--slice', (Get-R19SliceLetter $global:R19Slice), '--native', "$r20n", '--devtools', "$r20d", '--windows', "$r20w"))
  if ($r20n -gt 0) { Stop-R19 'dialog-left-open' 'a native file dialog is still open at the slice end' }
  if ($r20d -gt 0) { Stop-R19 'devtools-left-open' 'a DevTools window is still open at the slice end' }
}
# The dock side back as found, in a tab's DevTools in X (C1 verifier1 F4): Open -> Set to R20-0C's side -> Close -> Open plain -> read back (this is DOCK R20-RESTORE) -> Close. A different or unread side is the
# STOP not-restored (dockRestoreVerdict, in the node line), and the record names the found side. A found side of unread (R20-0C could not read it, or never ran) skips the change and still reads back.
# #416: it is then NOT MEASURED ("found side unread, nothing changed", exit 0, the slice goes on) only when $global:R20CDockChanged is $false; the flag is set BEFORE every call that can change the side (Open-R20CDevt with a side, KEEP-4's pre-open, this function's own Set), so a throw mid-change still counts. Else it stays the STOP.
# F2 (#418): a close that leaves DevTools open (remaining above 0) or cannot be read is the STOP devtools-left-open, as Invoke-R20CGuarded has it; an error of the change itself wins over it (the throw passes through the finally).
function Close-R20CChecked([long]$X) { $r20left = $true; try { $r20left = ((Close-S13DevTools $X 8081).remaining -gt 0) } catch { }; $r20left }
function Restore-R20CDock {
  $r20x = Get-R20CX; $r20found = if ($global:R20DockFound) { $global:R20DockFound } else { 'unread' }; $r20rb = 'unread'; $r20left = $false
  [void](Set-S11Front $r20x 'R20-RESTORE')
  if ($r20found -ne 'unread') { try { $r20o = Open-S13DevTools $r20x 8081; if ($r20o.opened) { $global:R20CDockChanged = $true; [void](Set-S13DockSide $r20x 8081 $r20found) } } finally { if (Close-R20CChecked $r20x) { $r20left = $true; Say9 'CHECK R20-RESTORE devtools-left-open=yes' } } }
  if ($r20left) { Stop-R19 'devtools-left-open' 'R20-RESTORE: DevTools was left open after the dock change' }
  $global:S13DockDiag = $null
  try { $r20o2 = Open-S13DevTools $r20x 8081; if ($r20o2.opened) { $r20rb = Read-S13DockSide $r20x 8081 } } finally { if (Close-R20CChecked $r20x) { $r20left = $true; Say9 'CHECK R20-RESTORE devtools-left-open=yes' } }
  Write-R20CDockRead 'R20-RESTORE'
  if ([int](Invoke-R19Node 's13-r20' @('dock', '--row', 'R20-RESTORE', '--side', $r20rb, '--found', $r20found, '--changed', $(if ($global:R20CDockChanged) { 'yes' } else { 'no' }))) -eq 2) { Stop-R19 'not-restored' 'the DevTools dock side read back differs from R20-0C''s (the record names the found side)' }
  if ($r20left) { Stop-R19 'devtools-left-open' 'R20-RESTORE: DevTools was left open after the read-back' }
}
function Invoke-R20CRestore {
  Invoke-R19RowBlock 'R20-RESTORE' {
    Restore-R20CDock
    if (Test-S11Own $global:O) { Close-S11Window $global:O; $global:O = 0 }
    Invoke-R19Stamped $R17Blocks['rd-restore']   # the safety state, and ROOT out of the Upload folders if UP-DEVT added it
    Invoke-R20RestoreCheck
    Write-R20CDialogs
  }
}
# #418: the one live diagnostic read of the DevTools UIA structure in window X (-Block dockdiag). Opens DevTools plain (no side), reads, closes; it changes no dock side and invokes no Dock side button. The evidence file is in S11_OUT.
function Invoke-R20CDockDiag {
  $r20x = Get-R20CX; [void](Set-S11Front $r20x 'DOCKDIAG'); $r20err = $null
  try {
    $r20o = Open-S13DevTools $r20x 8081
    if ($r20o.opened) { Start-Sleep -Milliseconds 1500; [void](Get-S13DockDiag $r20x 8081 (Join-Path $env:S11_OUT 'dockdiag-evidence.txt'))
      $global:S13DockDiag = $null; $r20side = Read-S13DockSide $r20x 8081   # the real reader once, after the instrument's Escape; it presses no Dock side button
      Write-R20CDockRead 'DOCKDIAG'; [void](Invoke-R19Node 's13-r20-c' @('dock-side', '--side', "$r20side")) } else { Say9 'CHECK dockdiag opened=no' }
  } catch { $r20err = $_ }
  $r20rem = 'unread'; try { $r20rem = [int](Close-S13DevTools $r20x 8081).remaining } catch { }
  Say9 "CHECK dockdiag remaining=$r20rem"
  if ($r20err) { throw $r20err }
  if ($r20rem -ne 0) { Stop-R19 'devtools-left-open' 'DOCKDIAG: DevTools was left open' }
}
function Get-R20CMissingBlocks([string]$Slice) { Get-R19Order $Slice | Where-Object { -not $global:R19Blocks.ContainsKey($_) } }   # callers wrap it in @()
function Register-R20CBlocks {
  $global:R20DockFound = ''; $global:R20CGate = ''; $global:R20CRoot = $false; $global:R20CWords = @(); $global:R20CRefuse = @(); $global:R20CPick = $null; $global:R20CCondSet = $false; $global:R20CFlagDone = $false; $global:R20CDockChanged = $false
  $global:R19Blocks['r20-0c'] = { Invoke-R20CZero }
  $global:R19Blocks['flag'] = { Write-R20CFlag }
  $global:R19Blocks['r20-devt-undock'] = { if ($global:R20CGate -eq 'run') { Invoke-R20CUndock } }
  $global:R19Blocks['r20-devt-early'] = { if ($global:R20CGate -eq 'run') { Invoke-R20CEarly } }
  $global:R19Blocks['r20-up-devt'] = { if (Test-R20CCond) { Invoke-R20CUpDevt } }
  $global:R19Blocks['r20-keep-4'] = { if (Test-R20CCond) { Invoke-R20CKeep4 } }
  $global:R19Blocks['r20-sweep-held'] = { if (Test-R20CCond) { Invoke-R20CSweep } }
  $global:R19Blocks['r20-restore'] = { Invoke-R20CRestore }
  $global:R19Blocks['r20-logs'] = { Invoke-R20Logs }
  $global:R19Blocks['dockdiag'] = { Invoke-R20CDockDiag }
}
# ---- the serve step (C3 fixer 1, F1) --------------------------------------------------------------------------------------------------------------------------
# Every actor row of this slice answers through a `serve` step, which Run 19's Invoke-R19StepB (s13-r20.ps1) sends to Invoke-R20Serve and Test-R20NodeAlive. They are defined only in slice B's file, which this slice must not
# dot-source whole (it overrides Format-S9Title and resets R19Xk). The entry script reads exactly those two function texts from it with PowerShell's own parser (Get-R18Defs, as it reads Run 17's) and dot-sources them at its
# top level; a missing one throws, and the entry script turns that into a STOP before any state change. Needs Get-R18Defs (s12-r18-lib.ps1).
function Get-R20CServeDefs([string]$File) {
  $r20d = Get-R18Defs $File; $r20t = @()
  foreach ($r20n in 'Test-R20NodeAlive', 'Invoke-R20Serve') { if (-not $r20d.Funcs[$r20n]) { throw "$r20n was not read from $(Split-Path -Leaf $File)" }; $r20t += $r20d.Funcs[$r20n] }
  , $r20t
}

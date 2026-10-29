# recipes/s13-r20-b-defs.ps1: the PowerShell side of liveB20 (Step 13 S5-drivers-B4b; docs/e2e-test-plan.md section 4.28). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome, a daemon or a port by its author. Definitions only (no main, no param block): recipes/s13-r20-b.ps1 dot-sources it at its top level AFTER s13-r20.ps1, s13-win.ps1 and
# s13-r20-b4.ps1, then calls Register-R20Blocks, Register-R20B4Blocks and Register-R20BBlocks (this file's, last: it replaces the restore and logs blocks). The actors are recipes/s13-r20-b.ts
# (chooser rows, G2-1, VERSION) and recipes/s13-r20-b4.ts (the -3 POP rows). Run 17/19 files are read-only; every name here carries an R20 prefix.
# The actor asks for a value step by id and reads the answer. A row that can skip steps (a refused placement, a gated leg) uses ONE `serve` step: Invoke-R20Serve answers whichever of its ids the
# actor asks for, in any order, and ends when the actor's process is gone, so a step the actor never asks for cannot hang the driver (B3 verifier2 N2).
$global:R19Xk = 0; $global:S13Hwnd = $null; $global:S13Owned = [long[]]@(); $global:R20BRoot = $false
# ---- the window guard: the chooser fixture of Step 13 (s12-win.ps1 does this for Run 19's pages; the title is tied to test-fixtures/s13-chooser.html by a test) ---------------------------------------
if (-not $global:S13PriorFormatTitle -and (Get-Command Format-S9Title -ErrorAction Ignore)) { $global:S13PriorFormatTitle = ${function:Format-S9Title} }
function Format-S9Title([string]$t) {
  if ($t -match '^S13 chooser fixture( - Google Chrome)?$') { return $t }
  if ($global:S13PriorFormatTitle) { return (& $global:S13PriorFormatTitle $t) }
  '<other window>'
}
# ---- the serve step ---------------------------------------------------------------------------------------------------------------------------------------------
function Test-R20NodeAlive {   # the PID is the wave's own node only while its start time is the recorded one (Run 17's S16Born); a reused PID is "gone"
  $r20i = $global:S16Pids['node']; if (-not $r20i) { return $false }
  $r20p = Get-Process -Id $r20i -ErrorAction SilentlyContinue; if (-not $r20p) { return $false }
  $r20b = if ($global:S16Born -and $global:S16Born.ContainsKey('node')) { $global:S16Born['node'] } else { $null }
  if ($null -ne $r20b -and $r20p.StartTime.Ticks -ne $r20b) { return $false }
  $true
}
# Two bounds, as Invoke-R17Node's budget and Wait-S11Ready's 120 s: the row's whole budget, and an idle bound since the start or the last answer. Either throws (the runner's path then kills the actor and STOPs throw-after-state after the restore).
function Invoke-R20Serve($Handlers, [int]$BudgetS = 600, [int]$IdleS = 120) {   # $Handlers: [ordered]@{ <step id> = <scriptblock whose output is the answer> }
  $r20t0 = Get-Date; $r20ta = $r20t0
  while ($true) {
    $r20hit = $false
    foreach ($r20id in @($Handlers.Keys)) {
      if (Test-Path -LiteralPath (Get-S11Signal $r20id 'ready')) { [void](Wait-S11Ready $r20id); Write-S11Pressed $r20id "$(& $Handlers[$r20id])"; $r20hit = $true; $r20ta = Get-Date }
    }
    if (-not $r20hit) {
      if (-not (Test-R20NodeAlive)) { return }
      $r20n = Get-Date
      if (($r20n - $r20t0).TotalSeconds -gt $BudgetS) { throw "serve exceeded its budget of $BudgetS s" }
      if (($r20n - $r20ta).TotalSeconds -gt $IdleS) { throw "no ready signal for serve within the bound ($IdleS s)" }
      Start-Sleep -Milliseconds 20
    }
  }
}
function New-R20Dlg([string[]]$Ids) { $r20h = [ordered]@{}; foreach ($r20d in $Ids) { $r20h[$r20d] = { Get-R19DialogN } }; $r20h }
# One slice-B actor row: the chooser fixture rows open tabs through the bridge into the wave's window W, so W is in front first; the closer and window WA's close run in a finally.
function Invoke-R20Ch([string]$Id, [string[]]$Cmd, $Handlers) {
  [void](Set-S11Front $global:W $Id)
  try { Invoke-R19Row $Id $Cmd -StepList @(@{ k = 'serve'; h = $Handlers; s = 600 }) -Actor 's13-r20-b' -BudgetS 600 }
  finally { [void](Close-R19Dialogs); Close-R20Xk }
}
function Close-R20Xk { if ($global:R19Xk) { try { if (Test-S11Own $global:R19Xk) { Close-S11Window $global:R19Xk } } catch { Say9 'CHECK window WA could not be closed' }; $global:R19Xk = 0 } }
function Open-R20Xk([string]$Url) { Close-R20Xk; $global:R19Xk = [long](@(New-S16Window $Url)[-1]); [void](Set-S9Foreground $global:R19Xk) }
# ---- R20-G2-1: the wave's windows. WB is the owned window whose document URL holds B's marker (read, compared, never printed); WA is opened by the wave; X is the foreground wave window ------------
function Get-R20OwnedHandles { [long[]]@(@($global:S11Own.Keys) + @($global:W, $global:R19Xk, $global:D, $global:E) | Where-Object { $_ } | ForEach-Object { [long]$_ } | Select-Object -Unique) }
function Find-R20WinB([string]$Marker) {
  foreach ($r20h in @(@($global:W) + @($global:S11Own.Keys) | Where-Object { $_ } | ForEach-Object { [long]$_ } | Select-Object -Unique)) {
    $r20u = ''; try { $r20u = Get-S9DocUrl $r20h } catch { }
    if ("$r20u".Contains($Marker)) { return [long]$r20h }
  }
  [long]0
}
function Invoke-R20G2Open {   # answers ok, or wb-unknown (B's window was not found: the rects steps then fail loudly, never guess)
  $r20wb = Find-R20WinB 's12=g2b'
  Open-R20Xk 'http://localhost:8081/e2e-playground.html?s12=g2a&s12x=g2a'
  $r20wa = [long]$global:R19Xk; $r20fg = [long](Get-S12Foreground)
  $global:S13Owned = [long[]](Get-R20OwnedHandles)
  $global:S13Hwnd = [ordered]@{ A = $r20wa; B = $r20wb; X = $(if ($global:S13Owned -contains $r20fg) { $r20fg } else { $r20wa }) }
  if ($r20wb -eq 0) { 'wb-unknown' } else { 'ok' }
}
function New-R20G2Handlers {
  $r20h = [ordered]@{ 'R20-G2-1-open' = { Invoke-R20G2Open }; 'R20-G2-1-place' = { Invoke-S13Place ([long]$global:S13Hwnd['A']) ([long]$global:S13Hwnd['B']) $global:S13Owned } }
  foreach ($r20s in 'covered', 'covered-after', 'uncovered', 'uncovered-after') { $r20h["R20-G2-1-rects-$r20s"] = { Get-S13RectsAnswer $global:S13Hwnd } }
  $r20h
}
# ---- R20-VERSION, inside Invoke-R19Swapped: the old build's own proof first (the row runs only when the proof reads the old build), then the actor ----------------------------------------------------
function Test-R20OldLoaded {
  $r20w = Read-R20Worker
  $global:R19Real = ${function:Show-S16}; $global:R19Held = @()
  function global:Show-S16([string[]]$l) { $global:R19Held += @($l) }
  try { [void](Invoke-R19Node 's13-r20' (Get-R20ProofArgs $r20w)) } finally { Set-Item function:global:Show-S16 $global:R19Real }
  $r20l = @($global:R19Held | Where-Object { $_ -match '^LOADED20 ' })
  if ($r20l.Count) { Show-S16 @($r20l[-1]) }
  [bool]($r20l.Count -and "$($r20l[-1])" -match 'keys=sorted|perm=no')
}
function Invoke-R20Version {
  if (-not (Test-R20OldLoaded)) { Say9 "ROW R20-VERSION NOT RUN $([char]0x2014) old build not loadable (the proof reads neither keys=sorted nor perm=no)"; return }
  Invoke-R20Ch 'R20-VERSION' @('version') (New-R20Dlg @('R20-VERSION-dlg'))
}
# ---- the -3 rows' evidence file (counts only, in S11_OUT): rotated at the slice's start, copied into the steps dir at R20-LOGS and at teardown ---------------------------------------------------
function Get-R20EvidenceCopy { Join-Path $Repo "$Steps/S13-live-evidence-liveB20-pop3$(if ($Att -gt 1) { "-att$Att" }).txt" }
function Reset-R20Pop3Evidence { $r20p = & $R20Pop3Evidence; if (Test-Path -LiteralPath $r20p) { Move-Item -LiteralPath $r20p -Destination "$r20p.prev-$(Get-Date -Format yyyyMMddHHmmssfff)" -Force } }
function Copy-R20Pop3Evidence { $r20p = & $R20Pop3Evidence; if (Test-Path -LiteralPath $r20p) { Copy-Item -LiteralPath $r20p -Destination (Get-R20EvidenceCopy) -Force } }
function Invoke-R20BRestore { Close-R20Xk; $global:S13Hwnd = $null; Invoke-R20Restore }   # WA is closed first, so DIALOGS counts no wave window of it
function Invoke-R20BLogs { try { Invoke-R20Logs } finally { Copy-R20Pop3Evidence } }
function Get-R20MissingBlocks([string]$Slice) { Get-R19Order $Slice | Where-Object { -not $global:R19Blocks.ContainsKey($_) } }   # callers wrap it in @()
function Register-R20BBlocks {
  $global:R20BRoot = $false
  $global:R19Blocks['r20-0b'] = { Reset-R20Pop3Evidence; Invoke-R20Zero $R17bZero 'R20-0B' }
  $r20ra = $global:R19Blocks['root-add']
  $global:R19Blocks['root-add'] = { & $r20ra; $global:R20BRoot = $true }.GetNewClosure()
  $global:R19Blocks['closerprobe'] = { Invoke-R19Closer }
  $global:R19Blocks['r20-choose-twice'] = { Invoke-R20Ch 'R20-CHOOSE-TWICE' @('choose-twice') (New-R20Dlg @('R20-CHOOSE-TWICE-dlg')) }
  $global:R19Blocks['r20-choose-kept'] = { Invoke-R20Ch 'R20-CHOOSE-KEPT' @('choose-kept') (New-R20Dlg @('R20-CHOOSE-KEPT-different-dlg', 'R20-CHOOSE-KEPT-same-dlg')) }
  $global:R19Blocks['r20-choose-refuse-dis'] = { Invoke-R20Ch 'R20-CHOOSE-REFUSE-DIS' @('choose-refuse-dis') (New-R20Dlg @('R20-CHOOSE-REFUSE-DIS-btn-dlg', 'R20-CHOOSE-REFUSE-DIS-flip-dlg', 'R20-CHOOSE-REFUSE-DIS-self-dlg')) }
  $global:R19Blocks['r20-g2-1'] = {
    if ($global:O -and (Test-S11Own $global:O)) { Close-S11Window $global:O; $global:O = 0 }   # the options window must not cover or crowd the two windows (B3 verifier F1)
    try { Invoke-R20Ch 'R20-G2-1' @('g2-1') (New-R20G2Handlers) } finally { $global:S13Hwnd = $null }
  }
  $global:R19Blocks['r20-version'] = {
    if (-not $global:R20BRoot) { Say9 "ROW R20-VERSION NOT RUN $([char]0x2014) ROOT is not in the Upload folders"; return }
    Invoke-R19Swapped $R19Commit['liveE19'] { Invoke-R20Version } 'R20-VERSION'
  }
  $global:R19Blocks['r20-restore'] = { Invoke-R20BRestore }
  $global:R19Blocks['r20-logs'] = { Invoke-R20BLogs }
}

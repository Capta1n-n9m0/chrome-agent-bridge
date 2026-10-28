# recipes/s12-win-b.ps1: Windows helpers for Run 19's liveB19 (docs/e2e-test-plan.md section 4.27 part B), S7-helpers-b.
# Windows PowerShell 5.1, ASCII only. Dot-source it AFTER s9-win.ps1, s11-win.ps1, s11b-win.ps1 and s12-win.ps1 (it loads none; it edits none).
# NOT run against Chrome by its author. Prints no title, URL, path or token: handles, counts and the sheet's own words only.
# Top-level names carry an S12 prefix so none shadows a global the runner reads (case-insensitive: $o vs $global:O, Run 17b).

# The DEVPROBE's opening method (named in `method=` of the DEVPROBE line). F12 and Ctrl+Shift+I (s12-win.ps1 Open-S12DevTools) attached nothing
# twice in Run 18 (#351 (3)); this one sends no opening key: it invokes Chrome's own menu (Customize and control -> More tools -> Developer tools) by UIA.
# The only key it can send is a closing Escape to window X after a missed step (a menu may be open, or the page in X gets it).
# Whether it opens DevTools is NOT claimed here: the DEVPROBE decides, from the control call's answer code alone.
$S12DevMethod = 'uia-menu'

# The windows searched for a menu's contents: X first, then the top-level Chrome windows that appeared after the press (not in $global:S12Before),
# as Set-S9Pin does (s9-win.ps1, $menus / $scopes): Chrome 156 draws a toolbar menu in a window of its own. Never a window that was already open.
function Get-S12SearchHwnds([long]$Hwnd) {
  $new = @(Get-S9ChromeWindows -AnyTitle | ForEach-Object { [long]$_ } | Where-Object { $_ -ne $Hwnd -and @($global:S12Before) -notcontains $_ })
  @($Hwnd) + $new
}
# One UIA element by name pattern (-like) and control type name ('Button', 'MenuItem') in window X, then in the new windows; $null when none.
# Names are matched, never printed.
function Find-S12UiaByName([long]$Hwnd, [string]$Like, [string]$Kind) {
  foreach ($w in (Get-S12SearchHwnds $Hwnd)) {
    $root = $S9UIA::FromHandle([IntPtr]$w)
    $all = $root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition)
    foreach ($e in $all) { if ($e.Current.ControlType.ProgrammaticName -eq "ControlType.$Kind" -and $e.Current.Name -like $Like) { return $e } }
  }
  $null
}
# Invoke or expand an element: InvokePattern, else ExpandCollapsePattern. $false when it offers neither or the pattern throws (Chrome 156:
# ExpandCollapse.Expand() answered E_FAIL live, s9-win.ps1 Set-S9Pin) - never a throw, never a false $true.
function Invoke-S12UiaElement($El) {
  $p = $null
  try {
    if ($El.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return $true }
    if ($El.TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$p)) { $p.Expand(); return $true }
  } catch { return $false }
  $false
}
# Escape into window X only, foreground checked first (closes a menu a failed opener left open).
function Send-S12Escape([long]$Hwnd) {
  Assert-S11Own $Hwnd 'menu escape'
  if (-not (Set-S9Foreground $Hwnd)) { Stop9 "window $Hwnd is not in the foreground - no key sent"; throw 'not in the foreground' }
  [S9Win]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x1B, 0, 2, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 300
}
# Chrome's menu button -> "More tools" -> "Developer tools", in the wave's own window X on an 8081 fixture only. Returns $true when every step was
# invoked; $false (with a CHECK line naming the step, and Escape sent) when one is missing. The return value is a CHECK, never the probe's verdict.
function Open-S12DevToolsMenu([long]$Hwnd) {
  Assert-S11Own $Hwnd 'DevTools menu'
  if (([string](Get-S9DocUrl $Hwnd)) -notmatch '^http://(127\.0\.0\.1|localhost):8081/') { Stop9 "window $Hwnd is not on a fixture (8081) - the menu is not opened"; throw 'not the fixture' }
  $global:S12Before = @(Get-S9ChromeWindows -AnyTitle | ForEach-Object { [long]$_ }); $global:S12Dev = $null
  $steps = @(@('menu-button', 'Customize and control*', 'Button'), @('more-tools', 'More tools*', 'MenuItem'), @('developer-tools', 'Developer tools*', 'MenuItem'))
  foreach ($s in $steps) {
    $el = $null; try { $el = Find-S12UiaByName $Hwnd $s[1] $s[2] } catch { $el = $null }
    if (-not $el -or -not (Invoke-S12UiaElement $el)) { Say9 "CHECK devtools-menu step=$($s[0]) found=no"; Send-S12Escape $Hwnd; return $false }
    Say9 "CHECK devtools-menu step=$($s[0]) found=yes"
    Start-Sleep -Milliseconds 700
  }
  Start-Sleep -Milliseconds 1500
  $seen = Test-S12DevToolsUi $Hwnd $global:S12Before
  Say9 "CHECK devtools-ui method=$S12DevMethod found=$(if ($seen) { $seen.How } else { 'none' })"
  if ($seen) { if ($seen.How -eq 'window') { $global:S11Own[[string]$seen.Hwnd] = $true }; $global:S12Dev = $seen }
  [bool]$seen
}
# The row-less DEVPROBE's window procedure for the actor (`UP-DEVT`-style signal pair 'DEVPROBE'): window X on a fixture page, open on
# DEVPROBE.ready, close on DEVPROBE-done.ready, then X closed. Returns $false after a STOP line (DevTools left open). The actor's `evaluate "1"`
# loop runs between the two pressed signals; the DEVPROBE line is printed by the actor from the control's code (s12-forms-b.ts devprobe).
function Invoke-S12DevProbe([string]$Url = 'http://127.0.0.1:8081/s12-console.html?s12=con') {
  if (-not (Get-Command New-S16Window -CommandType Function -ErrorAction SilentlyContinue)) { Stop9 'New-S16Window is missing (dot-source the block runner first)'; return $false }
  $global:S12ProbeX = New-S16Window $Url
  $global:S12Left = $false
  Invoke-S11Change 'DEVPROBE' { [void](Open-S12DevToolsMenu $global:S12ProbeX) } { if (-not (Close-S12DevTools $global:S12ProbeX)) { $global:S12Left = $true } }
  if ($global:S12Left) { return $false }
  Close-S9Window $global:S12ProbeX
  $global:S11Own.Remove([string]$global:S12ProbeX)
  $true
}

# The banner timeline for KEEPSEQ / KEEPEND: polls Test-S9Banner on the given windows every $PollMs for $DurationMs from the start signal
# (`<Row>-timeline.ready`), then writes `<epoch ms>:<1|0>,...` as the pressed signal's text (parsed by s12-forms-b.ts parseTimeline).
# The epoch is the same clock as the actor's Date.now(). One read = one poll of all windows (1 when any shows the banner).
function Format-S12Timeline($Reads) { ($Reads | ForEach-Object { "$($_.T):$(if ($_.Seen) { 1 } else { 0 })" }) -join ',' }
function Invoke-S12Timeline([string]$Row, [long[]]$Hwnds, [int]$DurationMs, [int]$PollMs = 120) {
  foreach ($h in $Hwnds) { Assert-S11Own $h 'banner timeline' }
  [void](Wait-S11Ready "$Row-timeline")
  Say9 "TIMELINE $Row started"
  $reads = New-Object System.Collections.ArrayList
  $t0 = Get-S12NowMs
  do {
    $stamp = Get-S12NowMs
    $n = 0; foreach ($h in $Hwnds) { if ((Test-S9Banner $h) -gt 0) { $n++ } }
    [void]$reads.Add([pscustomobject]@{ T = $stamp; Seen = ($n -gt 0) })
    Start-Sleep -Milliseconds $PollMs
  } while (((Get-S12NowMs) - $t0) -lt $DurationMs)
  Write-S11Pressed "$Row-timeline" (Format-S12Timeline $reads)
  Say9 "TIMELINE $Row reads=$($reads.Count)"
}

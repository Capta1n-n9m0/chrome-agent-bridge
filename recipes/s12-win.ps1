# recipes/s12-win.ps1: Windows helpers for Step 12's Run 18 (docs/e2e-test-plan.md section 4.26), S1-helpers-a.
# Windows PowerShell 5.1, ASCII only. Dot-source it AFTER s9-win.ps1, s11-win.ps1 and s11b-win.ps1 (it loads none; it edits none).
# NOT run against Chrome by its author. Rules mirrored from recipes/s12-rules.ts (tied by recipes/test/s12-helpers.test.ts).
# Prints no folder, path, title, URL or token: file NAMES, counts, handles and the sheet's own line forms only.
# Top-level names carry an S12 prefix so none shadows a global the runner reads (case-insensitive: $o vs $global:O, Run 17b).

# The banner window ends 2 500 ms after the reply (the actor sleeps it, WINDOW_AFTER_MS). s11-win.ps1 adds a 4 000 ms tail after that;
# this override (same scope, after s11-win.ps1) makes it 0. The do-while in Invoke-S11Sampler still polls once after the signal.
$S11SampleTailMs = 0
$S12IdleMinMs = 15000

function Assert-S12Tail { if ($S11SampleTailMs -ne 0) { Stop9 'the sampler tail is not 0 (dot-source s12-win.ps1 after s11-win.ps1)'; throw 'sampler tail' } }

# ---- the sampler: Invoke-S11Sampler unchanged; its SAMPLER line is re-printed as it was and parsed for the poll count ---------------
function Invoke-S12Sampler([string]$Row, [long[]]$Hwnds) {
  Assert-S12Tail
  $res = [pscustomobject]@{ Polls = -1; Banner = 'none' }
  Invoke-S11Sampler $Row $Hwnds 6>&1 | ForEach-Object {
    $t = if ($_ -is [Management.Automation.InformationRecord]) { "$($_.MessageData)" } else { "$_" }
    Write-Host $t
    $m = [regex]::Match($t, 'SAMPLER \S+ polls=(\d+) \(after the reply \d+\) banner=(seen|none)')
    if ($m.Success) { $res.Polls = [int]$m.Groups[1].Value; $res.Banner = $m.Groups[2].Value }
  }
  if ($res.Polls -lt 0) { Stop9 "$Row : the sampler printed no SAMPLER line"; throw 'no sampler line' }
  $res
}

# ---- the idle since the last attach: a stamp file (epoch ms) in the wave's out folder -------------------------------------------
function Get-S12NowMs { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
function Set-S12AttachStamp { New-Item -ItemType Directory -Force $S11Out | Out-Null; [IO.File]::WriteAllText((Join-Path $S11Out 'last-attach.stamp'), "$(Get-S12NowMs)", $S11Utf8) }
# Milliseconds since the stamp, or $null when it is missing or unreadable (unknown).
function Get-S12IdleMs {
  $f = Join-Path $S11Out 'last-attach.stamp'
  if (-not (Test-Path -LiteralPath $f)) { return $null }
  $at = [long]0
  if (-not [long]::TryParse(([IO.File]::ReadAllText($f, $S11Utf8)).Trim(), [ref]$at)) { return $null }
  [long][Math]::Max(0, (Get-S12NowMs) - $at)
}
# Waits until the idle is at least 15 s (an unknown stamp: the full 15 s from now, counted from a stamp written now). Returns the idle.
function Wait-S12Idle {
  $since = Get-S12IdleMs
  if ($null -eq $since) { Set-S12AttachStamp; $ms = $S12IdleMinMs } else { $ms = [Math]::Max(0, $S12IdleMinMs - $since) }
  if ($ms -gt 0) { Start-Sleep -Milliseconds $ms }
  Say9 "idle wait: $ms ms"
  Get-S12IdleMs
}
# The guard before a banner row's first call: prints IDLE; under 15 000 ms, or unknown, is a STOP (never a NOT MEASURED).
function Test-S12Idle([string]$Row) {
  Assert-S12Tail
  $n = Get-S12IdleMs
  if ($null -eq $n) { Stop9 "$Row : no attach stamp, the idle since the last attach is unknown; no call sent"; return $false }
  Say9 "IDLE $Row since-attach-ms=$n"
  if ($n -lt $S12IdleMinMs) { Stop9 "$Row : idle since the last attach is under $S12IdleMinMs ms; no call sent"; return $false }
  $true
}

# ---- R18-BANNER-CTL: the driver of one leg (run beside `s11b bannerctl --leg <leg>`). The result {Leg, IdleMs, Polls, Banner} is also left in
# $global:S12Leg (Invoke-R17Node returns only the exit code). An idle under 15 000 ms is NOT a STOP here: the judge FAILs the row (sheet rule).
function Invoke-S12BannerLeg([ValidateSet('neg', 'pos')][string]$Leg, [long[]]$Hwnds) {
  $idle = Get-S12IdleMs
  if ($Leg -eq 'neg' -and $null -eq $idle) { Stop9 'R18-BANNER-CTL neg: no attach stamp, the idle is unknown; no window started'; throw 'idle unknown' }
  $r = Invoke-S12Sampler "R18-BANNER-CTL-$Leg" $Hwnds
  $global:S12Leg = [pscustomobject]@{ Leg = $Leg; IdleMs = $idle; Polls = $r.Polls; Banner = $r.Banner }
  $global:S12Leg
}

# ---- the worker console, one file per slice ------------------------------------------------------------------------------------------
# Raw capture to <out>\console-<slice>.txt (outside the repo); a path that already holds text is a STOP. Returns the full path (never printed).
# Assert-S12CaptureFree runs in the runner's prologue, before R18-0 (a later attempt uses a fresh out folder); Save-S12Console checks again.
function Assert-S12CaptureFree([string]$Slice) {
  if ($Slice -cnotin 'liveA18', 'liveB18') { throw 'not a slice' }
  $cap = Assert-S11Outside (Join-Path $S11Out "console-$Slice.txt")
  if ((Test-Path -LiteralPath $cap) -and (([IO.File]::ReadAllText($cap, $S11Utf8)).Trim() -ne '')) { Stop9 "the capture file of $Slice already holds text; it is never overwritten"; throw 'capture exists' }
  $cap
}
function Save-S12Console([long]$Hwnd, [string]$Slice) {
  $cap = Assert-S12CaptureFree $Slice
  [void](Save-S11bConsole $Hwnd $cap)
  $cap
}

# ---- R18-UP-DEVT: DevTools into window X only (G-22). Success is proven by control 1's code, never by anything here ------------------
# A new DevTools window (not in $Before) or a docked pane in window X (UIA), as a record {How, Hwnd}; $null when neither shows.
function Test-S12DevToolsUi([long]$Hwnd, [long[]]$Before) {
  foreach ($cand in @(Get-S9ChromeWindows -AnyTitle)) {
    if (($Before -notcontains [long]$cand) -and ([S9Win]::Text([IntPtr]$cand) -match '^DevTools')) { return [pscustomobject]@{ How = 'window'; Hwnd = [long]$cand } }
  }
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $tabItem = [Windows.Automation.ControlType]::TabItem
  $pane = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -match '^DevTools' -or ($_.Current.ControlType -eq $tabItem -and $_.Current.Name -in 'Elements', 'Console') }).Count
  if ($pane -gt 0) { return [pscustomobject]@{ How = 'pane'; Hwnd = [long]$Hwnd } }
  $null
}
function Send-S12Key([long]$Hwnd, [string]$Key) {
  Assert-S11Own $Hwnd 'DevTools key'
  if (-not (Set-S9Foreground $Hwnd)) { Stop9 "window $Hwnd is not in the foreground - no key sent"; throw 'not in the foreground' }
  if ($Key -eq 'F12') { [S9Win]::keybd_event(0x7B, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x7B, 0, 2, [UIntPtr]::Zero) }
  else {
    foreach ($vk in 0x11, 0x10, 0x49) { [S9Win]::keybd_event($vk, 0, 0, [UIntPtr]::Zero) }
    foreach ($vk in 0x49, 0x10, 0x11) { [S9Win]::keybd_event($vk, 0, 2, [UIntPtr]::Zero) }
  }
  Start-Sleep -Milliseconds 1800
  Say9 "KEY $Key pressed into window $Hwnd"
}
# F12, checked; when no DevTools shows, Ctrl+Shift+I, checked (the foreground is checked before each key). Returns whether the UI shows DevTools.
function Open-S12DevTools([long]$Hwnd) {
  Assert-S11Own $Hwnd 'DevTools key'
  if (([string](Get-S9DocUrl $Hwnd)) -notmatch '^http://(127\.0\.0\.1|localhost):8081/') { Stop9 "window $Hwnd is not on the upload fixture (8081) - no key sent"; throw 'not the upload fixture' }
  $global:S12Before = @(Get-S9ChromeWindows -AnyTitle | ForEach-Object { [long]$_ }); $global:S12Dev = $null
  foreach ($key in 'F12', 'CtrlShiftI') {
    Send-S12Key $Hwnd $key
    $seen = Test-S12DevToolsUi $Hwnd $global:S12Before
    Say9 "CHECK devtools-ui key=$key found=$(if ($seen) { $seen.How } else { 'none' })"
    if ($seen) {
      if ($seen.How -eq 'window') { $global:S11Own[[string]$seen.Hwnd] = $true }
      $global:S12Dev = $seen; return $true
    }
  }
  $false
}
# Closes what Open-S12DevTools recorded, then checks again: a DevTools window or pane left is a STOP line and $false.
function Close-S12DevTools([long]$Hwnd) {
  Assert-S11Own $Hwnd 'DevTools close'
  $dev = $global:S12Dev
  if ($dev -and $dev.How -eq 'window') { if (Test-S9Live $dev.Hwnd) { Close-S9Window $dev.Hwnd }; $global:S11Own.Remove([string]$dev.Hwnd) }
  elseif ($dev -and $dev.How -eq 'pane') { Send-S12Key $Hwnd 'F12' }
  $global:S12Dev = $null
  Start-Sleep -Milliseconds 800
  $before = if ($global:S12Before) { $global:S12Before } else { @(Get-S9ChromeWindows -AnyTitle | ForEach-Object { [long]$_ }) }
  if (Test-S12DevToolsUi $Hwnd $before) { Stop9 'a DevTools window or pane is left open'; return $false }
  $true
}
# The row's signal pair for the actor (`s11b devt`): UP-DEVT.ready -> open -> .pressed; UP-DEVT-done.ready -> close -> .pressed. $false after a STOP.
function Invoke-S12DevtRow([long]$Hwnd) {
  $global:S12Left = $false
  Invoke-S11Change 'UP-DEVT' { [void](Open-S12DevTools $Hwnd) } { if (-not (Close-S12DevTools $Hwnd)) { $global:S12Left = $true } }
  if ($global:S12Left) { return $false }
  if (-not (Test-S9DaemonSafety ([bool]$global:S11Found.armed) ([bool]$global:S11Found.evaluate) ([int]$global:S11Found.count) 'UP-DEVT' 5000)) { Stop9 'UP-DEVT : daemon.status is not back to the found state'; return $false }
  $true
}

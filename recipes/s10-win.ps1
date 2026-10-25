# recipes/s10-win.ps1: Windows helpers for Step 10's live wave (Run 15; docs/e2e-test-plan.md section 4.22, wave sheet
# docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md). Windows PowerShell 5.1. Written 2026-10-25 by
# the S7 prep builder, before any R15 row ran; NOT run against Chrome by its author (the prep stage may not touch Chrome).
#
#   . .\recipes\s10-win.ps1        # dot-sources recipes/s9-win.ps1 (unchanged: Run 14's helpers), then adds:
#
#   Format-S9Title (override)      s9-win's title filter, plus the S10 fixture pages' titles (a driver window W may show
#                                  one after a focusTab); everything else as in s9-win
#   Test-S10Placement / Find-S10FreePlacement   R14-3's placement guard and order with the row name a parameter (R15-3);
#                                  the same S9Geo walk, the same s9.ts rect-check / placement-order rules
#   Write-S10Cursor <why>          one `CURSOR at (x,y) (<why>)` line, always (R15-3 prints it before the re-arm)
#   Close-S10Foreign <hwnd> <what> closes a window a wave script opened and named by handle (bb-login's own window):
#                                  only a visible Chrome_WidgetWin_1 window of a chrome.exe; prints no title
#   Start-S10Mem / Stop-S10Mem     SAVE-64's memory sampler (recipes/s10-mem.ps1), its PID tracked by the caller
#   Get-S10HeadlessPids <dir>      chrome.exe processes whose command line names the throwaway profile <dir> (SAVE-IDONLY)
#
# It prints no title or URL of anything that is not the wave's own, never the token, never the block-list text.
. "$PSScriptRoot\s9-win.ps1"

# The S10 fixture pages (test-fixtures/s10-*.html) are the wave's own: a driver window showing one stays "the driver's"
# for Test-S9Live (s9-win.ps1). Everything else as in s9-win.ps1's Format-S9Title.
function Format-S9Title([string]$t) {
  if ($t -match '^(Agent Bridge E2E Playground|S9 W human tab|S10 MCPF fixture|S10 CAP fixture|S10 SAVE fixture|Extensions|Extensions - Keyboard shortcuts|Chrome Agent Bridge — Options|about:blank|New Tab)( - Google Chrome)?$') { return $t }
  if ($t -match "^DevTools - chrome-extension://$S9Id/") { return $t }
  if ($t -match '^DevTools') { return '<DevTools window>' }
  '<other window>'
}

function Write-S10Cursor([string]$Why) {
  $c = "$([S9Geo]::Cursor())".Split(' ')
  if ($c.Count -eq 2) { Say9 "CURSOR at ($($c[0]),$($c[1])) ($Why)" } else { Say9 "CURSOR not read ($Why)" }
}

# R14-3's guard with the row as a parameter (s9-win.ps1 Test-S9Placement hard-codes R14-3): both rects, the flags, every
# work area, the occluders above O with their ids and diagnostics, the cursor -> s9.ts rect-check (placementVerdict).
#
# S7 wave fixer 3 (2026-10-25; R15-3R, #212 and the session agent's order after Return 3): -ExemptOwned adds the rects of
# the elements R15-3R reads on O (Get-S10OptionsReadRects, measured now) and is judged by `s10.ts r3r-check`
# (s10-rules.ts r3rPlacementVerdict: an occluder owned - owner and root owner - by a driver window and over none of those
# rects is exempt; any other occluder still fails). Without the switch nothing changes (R15-3's guard, s9.ts rect-check).
function Test-S10Placement([long]$W, [long]$O, [string]$Step = 'placement', [int]$Attempt = 0, $Area = $null, [string]$Row = 'R15-3', [switch]$ExemptOwned) {
  $work = @([S9Geo]::WorkAreas() | ForEach-Object { [pscustomobject]@{ left = $_.Left; top = $_.Top; right = $_.Right; bottom = $_.Bottom } })
  $ids = @(Get-S9OccluderIds $O)
  $cur = "$([S9Geo]::Cursor())".Split(' ')
  $p = [pscustomobject]@{ w = (Get-S9WinPlace $W); o = (Get-S9WinPlace $O); work = $work; occluders = $ids.Count; occluderIds = $ids; cursor = $(if ($cur.Count -eq 2) { [pscustomobject]@{ x = [int]$cur[0]; y = [int]$cur[1] } } else { $null }) }
  if ($Attempt -gt 0) { $p | Add-Member -NotePropertyName area -NotePropertyValue ([pscustomobject]@{ left = $Area.Left; top = $Area.Top; right = $Area.Right; bottom = $Area.Bottom }) }
  if ($ExemptOwned) { $p | Add-Member -NotePropertyName readRects -NotePropertyValue @(Get-S10OptionsReadRects $O) }
  $f = Join-Path $env:S9_OUT 'r15-placement.json'
  [IO.File]::WriteAllText($f, ($p | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding $false))
  Push-Location $S9Repo
  try {
    $extra = if ($Attempt -gt 0) { @('--attempt', "$Attempt") } else { @() }
    $out = if ($ExemptOwned) { @(node --import tsx recipes/s10.ts r3r-check --file $f --row $Row --step $Step) } else { @(node --import tsx recipes/s9.ts rect-check --file $f --row $Row --step $Step @extra) }
    $code = $LASTEXITCODE
    foreach ($l in $out) { Write-Host $l }; Write-S9Raw $out
    $code -eq 0
  } finally { Pop-Location }
}

# R15-3R (S7 wave fixer 3): the screen rects, by UI Automation now, of what R15-3R reads on O - its page area
# (RootWebArea), the two checkboxes, the status and the block-list summary (s10-rules.ts R3R_READ_ELEMENTS, same order).
# A missing element or an empty / infinite rect gives rect $null (r3rReadMeasured then says not measured: nothing exempt).
# Never a text or a title: names and rects only.
function Get-S10OptionsReadRects([long]$O) {
  $box = { param($e)
    if (-not $e) { return $null }
    $r = $e.Current.BoundingRectangle
    if ($r.IsEmpty -or [double]::IsInfinity($r.Width) -or [double]::IsInfinity($r.Height) -or $r.Width -le 0 -or $r.Height -le 0) { return $null }
    [pscustomobject]@{ left = [int][Math]::Floor($r.Left); top = [int][Math]::Floor($r.Top); right = [int][Math]::Ceiling($r.Right); bottom = [int][Math]::Ceiling($r.Bottom) } }
  $doc = $null
  try { $doc = Get-S9Options $O } catch { $doc = $null }
  $summary = $null
  if ($doc) {
    $summary = Get-S9ById $doc 'blocklist-summary'
    if (-not $summary) {
      $t = @($doc.FindAll([Windows.Automation.TreeScope]::Descendants, (New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Text))) | Where-Object { $_.Current.Name -match '^\d+ blocked sites?\.' })
      if ($t.Count -eq 1) { $summary = $t[0] }
    }
  }
  $els = [ordered]@{ 'page' = $doc; 'armed' = $(if ($doc) { Get-S9ById $doc 'armed' }); 'evaluate' = $(if ($doc) { Get-S9ById $doc 'evaluate' }); 'safety-status' = $(if ($doc) { Get-S9ById $doc 'safety-status' }); 'blocklist-summary' = $summary }
  foreach ($k in $els.Keys) { [pscustomobject]@{ name = $k; rect = (& $box $els[$k]) } }
}

# s9-win.ps1 Find-S9FreePlacement with the row as a parameter: W's monitor work area first, then the others, each cut at
# the taskbar (s9.ts placement-order); the first free try is kept; none free -> $false (the caller's STOP).
function Find-S10FreePlacement([long]$W, [long]$O, [string]$Row = 'R15-3') {
  $wa = [S9Geo]::WorkOf([IntPtr]$W)
  $rect = { param($r) [pscustomobject]@{ left = $r.Left; top = $r.Top; right = $r.Right; bottom = $r.Bottom } }
  $shell = @([S9Geo]::ShellTrays() | ForEach-Object { $x = "$_".Split(' '); [pscustomobject]@{ cls = $x[0]; rect = [pscustomobject]@{ left = [int]$x[1]; top = [int]$x[2]; right = [int]$x[3]; bottom = [int]$x[4] } } })
  $j = [pscustomobject]@{ wWork = (& $rect $wa); work = @([S9Geo]::WorkAreas() | ForEach-Object { & $rect $_ }); shell = $shell }
  $f = Join-Path $env:S9_OUT 'r15-placement-order.json'
  [IO.File]::WriteAllText($f, ($j | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding $false))
  Push-Location $S9Repo
  try { $out = @(node --import tsx recipes/s9.ts placement-order --file $f); $code = $LASTEXITCODE } finally { Pop-Location }
  foreach ($l in $out) { Write-Host $l }; Write-S9Raw $out
  $line = @($out | Where-Object { "$_" -match 'PLACEMENT order \d+:' }) | Select-Object -Last 1
  if ($code -ne 0 -or -not $line) { Say9 'PLACEMENT order not computed - no placement tried'; return $false }
  $areas = @([regex]::Matches(($line -replace '^.*PLACEMENT order \d+:', ''), '\[(-?\d+),(-?\d+),(-?\d+),(-?\d+)\]') | ForEach-Object {
      [pscustomobject]@{ Left = [int]$_.Groups[1].Value; Top = [int]$_.Groups[2].Value; Right = [int]$_.Groups[3].Value; Bottom = [int]$_.Groups[4].Value } })
  $n = 0
  foreach ($a in $areas) {
    $n++
    Set-S9SideBySide $W $O -Area $a
    Park-S9Cursor "before placement attempt $n"
    if (Test-S10Placement $W $O "placement-attempt-$n" -Attempt $n -Area $a -Row $Row) { Say9 "PLACEMENT chosen: attempt $n of $($areas.Count)"; return $true }
  }
  Say9 "PLACEMENT none of the $($areas.Count) work areas is free"
  $false
}

# A window a wave script opened and printed by handle (bb-login.ps1's `own window <H> opened`): closed by WM_CLOSE only
# when it is a visible Chrome_WidgetWin_1 window owned by a chrome.exe. Returns $true when it is gone. No title printed.
function Close-S10Foreign([long]$Hwnd, [string]$What) {
  if (-not $Hwnd) { return $true }
  $ip = [IntPtr]$Hwnd
  if (-not [S9Win]::IsWindow($ip)) { Say9 "$What window $Hwnd already gone"; return $true }
  $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId($ip, [ref]$wpid)
  $proc = Get-Process -Id ([int]$wpid) -ErrorAction SilentlyContinue
  if ([S9Win]::Cls($ip) -ne 'Chrome_WidgetWin_1' -or -not $proc -or $proc.ProcessName -ne 'chrome') { Say9 "$What window $Hwnd is not a Chrome window any more - not touched"; return $false }
  [void][S9Win]::PostMessage($ip, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
  $t0 = Get-Date
  while ([S9Win]::IsWindow($ip) -and ((Get-Date) - $t0).TotalSeconds -lt 5) { Start-Sleep -Milliseconds 200 }
  $gone = -not [S9Win]::IsWindow($ip)
  Say9 "$What window $Hwnd $(if ($gone) { 'closed' } else { 'did NOT close' })"
  $gone
}

# SAVE-64's memory record (step-agent ruling D3: a RECORD, no bound). The sampler is a separate hidden powershell
# process (recipes/s10-mem.ps1) writing `ms pid privateBytes` lines; it stops when <out>.stop appears, or after 300 s.
function Start-S10Mem([string]$Out) {
  Remove-Item -LiteralPath $Out, "$Out.stop" -Force -ErrorAction SilentlyContinue
  $p = Start-Process -PassThru -WindowStyle Hidden -FilePath powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\s10-mem.ps1", '-Out', $Out
  $null = $p.Handle
  Say9 "memory sampler PID $($p.Id) started (samples to the wave's folder; a RECORD)"
  $p
}
function Stop-S10Mem([string]$Out, $Proc) {
  [IO.File]::WriteAllText("$Out.stop", (Now9))
  if ($Proc -and -not $Proc.WaitForExit(5000)) { Say9 "memory sampler PID $($Proc.Id) did not stop within 5 s" }
  else { Say9 'memory sampler stopped' }
}

function Get-S10HeadlessPids([string]$ProfileDir) {
  $needle = $ProfileDir.ToLower()
  @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { "$($_.CommandLine)".ToLower().Contains($needle) } | ForEach-Object { [int]$_.ProcessId })
}

# ---- Which processes the wave may kill (S7 prep fixer 2, the verifier's W1). The rules are recipes/s10-rules.ts's
# descendants / treeKillable / headlessKillable / sameProcess, mirrored here and tied by recipes/test/s10-rules.test.ts.
# Windows keeps a dead parent's PID in ParentProcessId and reuses PIDs, so s9-win.ps1's Get-ProcTree (ParentProcessId
# only) can take the orphans of an earlier holder of a PID - the user's Chrome after its launcher exited - as children.

# A process's creation time as UTC ticks; 0 when it cannot be read.
function Get-S10Born($Cim) { if ($Cim -and $Cim.CreationDate) { [long]$Cim.CreationDate.ToUniversalTime().Ticks } else { [long]0 } }
function Get-S10BornOf([int]$Id) { Get-S10Born (Get-CimInstance Win32_Process -Filter "ProcessId=$Id" -ErrorAction SilentlyContinue) }

# One snapshot of the process table: Pid, Ppid, Born (UTC ticks), Name, Cmd.
function Get-S10ProcTable {
  @(Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{ Pid = [int]$_.ProcessId; Ppid = [int]$_.ParentProcessId; Born = (Get-S10Born $_); Name = "$($_.Name)"; Cmd = "$($_.CommandLine)" } })
}

# The root and its descendants, level by level: a child only if its ParentProcessId is a member's PID and it was
# created no earlier than that member (an unknown creation time excludes it). The root first.
function Get-S10Descendants([int]$Root, $Table) {
  $r = @($Table | Where-Object { $_.Pid -eq $Root })
  if (-not $r.Count) { return @() }
  $out = @($r[0]); $seen = @{}; $seen[$Root] = $true; $level = @($r[0])
  while ($level.Count) {
    $next = @()
    foreach ($p in $level) {
      foreach ($c in $Table) {
        if ($seen.ContainsKey($c.Pid)) { continue }
        if ($c.Ppid -eq $p.Pid -and $p.Born -gt 0 -and $c.Born -gt 0 -and $c.Born -ge $p.Born) { $seen[$c.Pid] = $true; $next += $c; $out += $c }
      }
    }
    $level = $next
  }
  $out
}

# What the tree gained after it was identified (a member started a child between the snapshot and its own kill):
# for each member m, a process with ParentProcessId m.Pid created no earlier than m and - when another process now
# holds m.Pid (reused) - before that holder; plus its descendants. A member still alive with its recorded creation time
# is skipped (it was not killed). Mirrors s10-rules.ts lateChildren.
function Get-S10LateChildren($Members, $Table) {
  $out = @(); $seen = @{}
  foreach ($m in $Members) { $seen[[int]$m.Pid] = $true }
  foreach ($m in $Members) {
    if (-not ($m.Born -gt 0)) { continue }
    $holder = @($Table | Where-Object { $_.Pid -eq $m.Pid })
    if ($holder.Count -and $holder[0].Born -eq $m.Born) { continue }
    $upper = if ($holder.Count) { [long]$holder[0].Born } else { [long]::MaxValue }
    foreach ($c in $Table) {
      if ($c.Ppid -ne $m.Pid -or $seen.ContainsKey([int]$c.Pid)) { continue }
      if (-not ($c.Born -gt 0 -and $c.Born -ge $m.Born -and $c.Born -lt $upper)) { continue }
      foreach ($d in @(Get-S10Descendants $c.Pid $Table)) {
        if ($seen.ContainsKey([int]$d.Pid)) { continue }
        $seen[[int]$d.Pid] = $true; $out += $d
      }
    }
  }
  $out
}

# The only images a node call's tree may hold that the wave kills; chrome.exe is never one of them.
$S10TreeNames = @('node.exe', 'claude.exe', 'cmd.exe', 'conhost.exe', 'esbuild.exe')
function Test-S10TreeKillable($Row) { $n = "$($Row.Name)".ToLower(); ($n -ne 'chrome.exe') -and ($S10TreeNames -contains $n) }

# SAVE-IDONLY's headless Chrome: chrome.exe, created at or after the wave's launch stamp, its command line naming the
# throwaway --user-data-dir, which lies under %TEMP%\bridge-e2e\s15.
function Test-S10HeadlessKillable($Row, [long]$LaunchBorn, [string]$ProfileDir) {
  $d = $ProfileDir.ToLower().TrimEnd('\', '/')
  $base = ($env:TEMP.ToLower().TrimEnd('\', '/')) + '\bridge-e2e\s15\'
  if ("$($Row.Name)".ToLower() -ne 'chrome.exe') { return $false }
  if (-not $d.StartsWith($base)) { return $false }
  if (-not ($LaunchBorn -gt 0 -and $Row.Born -ge $LaunchBorn)) { return $false }
  $cmd = "$($Row.Cmd)".ToLower() + ' '   # the value must end at the directory (idonly-profile2 is not idonly-profile)
  $cmd.Contains("--user-data-dir=$d ") -or $cmd.Contains("--user-data-dir=`"$d`"")
}

# ---- The toolbar pin reader (S7 wave fixer 1, after Run 15's Return 1 and #221). Runner 1 read 0 buttons in its fresh
# window W while the user says the button is pinned. Measured read-only in the fixer's own window (Chrome 156): the
# pinned action is a Button of class ToolbarActionView, present 149-285 ms after the window appeared; at 516 px width
# Chrome overflows it into the Extensions menu and no ToolbarActionView exists (present at 600 px and wider). So no
# button is not "unpinned": this reader polls up to $S10PinWaitMs, widens ITS OWN window once (never a click), and only
# then says unpinned. The rules (name match, the poll's decision) are recipes/s10-rules.ts pinNameMatches / pinStep,
# mirrored here and tied by recipes/test/s10-rules.test.ts.
$S10PinWaitMs = 5000
$S10PinWidenAfterMs = 1000
$S10PinNarrowPx = 1000
$S10PinWidenToPx = 1200

# The extension's toolbar action(s) in window $Hwnd: first line of the Name starts with the extension's name, and class
# ToolbarActionView or type Button (s10-rules.ts pinNameMatches).
function Find-S10ActionButtons([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.OrCondition(
    (New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Button)),
    (New-Object Windows.Automation.PropertyCondition($S9UIA::ClassNameProperty, 'ToolbarActionView')))
  @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object {
      $first = ("$($_.Current.Name)" -split "`r?`n")[0]
      $first.StartsWith($S9Name) -and (($_.Current.ClassName -eq 'ToolbarActionView') -or ($_.Current.ControlType -eq [Windows.Automation.ControlType]::Button)) })
}

# $true = pinned (a button found), $false = not found after the bounded wait and one widening of a narrow window.
# -WaitMs 0 reads once. Prints one line per decision; only counts, widths and the verdict (no title or URL).
function Get-S10PinState([long]$Hwnd, [int]$WaitMs = $S10PinWaitMs, [switch]$Quiet) {
  $t0 = Get-Date; $widened = $false; $n = 0; $width = 0
  while ($true) {
    $n = @(Find-S10ActionButtons $Hwnd).Count
    $r = [S9Geo]::Rect([IntPtr]$Hwnd); $width = $r.Right - $r.Left
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    # s10-rules.ts pinStep (mirrored): found -> pinned; narrow, not widened, past the widen point -> widen; past the bound -> unpinned
    $step = if ($n -ge 1) { 'pinned' } elseif ((-not $widened) -and $width -lt $S10PinNarrowPx -and $ms -ge $S10PinWidenAfterMs -and $WaitMs -gt 0) { 'widen' } elseif ($ms -ge $WaitMs) { 'unpinned' } else { 'wait' }
    if ($step -eq 'pinned' -or $step -eq 'unpinned') { break }
    if ($step -eq 'widen') {
      # Verifier N1: only the wave's own recorded window is ever moved (Test-S9Live: recorded at open time, same owner
      # pid, Chrome_WidgetWin_1, one of the wave's titles); otherwise nothing moves and the answer is not-pinned (the
      # caller's existing STOP path).
      if (-not (Test-S9Live $Hwnd)) { if (-not $Quiet) { Say9 "PIN read: no button after $ms ms in a $width px window, and window $Hwnd is not the wave's own - not moved -> pinned=false" }; return $false }
      $wa = [S9Geo]::WorkOf([IntPtr]$Hwnd)
      $to = [Math]::Min($S10PinWidenToPx, $wa.Right - $wa.Left)
      $left = [Math]::Max($wa.Left, [Math]::Min($r.Left, $wa.Right - $to))
      $top = [Math]::Max($wa.Top, $r.Top); $h = [Math]::Min($r.Bottom - $r.Top, $wa.Bottom - $top)
      if ([S9Win]::IsIconic([IntPtr]$Hwnd)) { [void][S9Win]::ShowWindow([IntPtr]$Hwnd, 9) }
      [void][S9Geo]::MoveWindow([IntPtr]$Hwnd, $left, $top, $to, $h, $true)
      $widened = $true
      if (-not $Quiet) { Say9 "PIN read: no button after $ms ms in a $width px window - widened my own window $Hwnd to $to px (nothing clicked)" }
    }
    Start-Sleep -Milliseconds 200
  }
  if (-not $Quiet) { Say9 "toolbar buttons named '$S9Name…': $n after $ms ms (window $width px$(if ($widened) { ', widened' })) -> pinned=$(if ($n -ge 1) { 'true' } else { 'false' })" }
  $n -ge 1
}

# s9-win.ps1's Get-S9PinState read once, with no wait, and took an overflowed (narrow-window) action for "unpinned".
# Every s9 helper that re-reads the pin (Restore-S9Desk's unpin check, Set-S9Pin's final check) calls Get-S9PinState, so
# it is overridden here (as Format-S9Title is) - s9-win.ps1 itself is unchanged.
function Get-S9PinState([long]$Hwnd) { Get-S10PinState $Hwnd }

# ---- PP1 and RET-1 after the teardown (S7 wave fixer 1; decisions.md #221, widened by #222). Each leg starts and ends
# with this check: a window of its own on this extension's options page (a fresh page, so the stored state), the
# stored tuple and the block list's sha256 compared with the found state (armed, JavaScript on, the empty text's
# sha256 - the only found state the wave runs from, R15-FOUND), and daemon.status (s9.ts wait-safety). Prints the
# STATE line (the sha256 only when it is the empty text's) and one `LEG <leg> <phase>: …` line; on a mismatch a STOP
# line. The window is closed. Returns $true when equal. It presses nothing.
#
# S7 fixer #223 (2026-10-25; decisions.md #223, after Return 5): Return 5's read after RET-1's relaunch threw `expected
# exactly 1 new Chrome window, found 2` - session restore was bringing the user's windows back while the helper waited for
# its own - and so printed "NOT equal" for a state it never compared. Now, before the check window is opened:
#   1. Wait-S10StableWindows: every visible Chrome window (-AnyTitle, so a restore window still untitled or a bubble
#      counts too) is polled every $S10LegPollMs; the set (handles, order ignored) must stay unchanged for
#      $S10LegQuietMs, within $S10LegBoundMs. Past the bound -> a STOP, no window opened. No chrome.exe at all -> a STOP
#      (opening a window would START Chrome).
#   2. Open-S10MarkedWindow: `chrome.exe --new-window "data:text/html,<title>s15leg-<guid>"` - a per-call marker in the
#      window title (Chrome 156 measured: the title is `<marker> - Google Chrome`, the omnibox shows the data: URL; probe
#      in S7-fix223.md). Exactly one titled Chrome window carrying the marker is mine; 0 or >= 2 -> a STOP saying how many,
#      and nothing is typed into, moved or closed in any window. The omnibox must show the marker URL before the
#      options URL is typed into that window (Set-S9Omnibox); the window is closed by its handle only, and only while the
#      handle still names it (Close-S10MarkedWindow: same pid and class, AND the title recorded at pick time or the
#      marker / options URL exactly in its address bar - #223 round 2; else "not closed", nothing touched).
# A window STOP returns $false before any read: it is never folded into "the read threw -> NOT equal". The rules are
# recipes/s10-rules.ts legWinStep / markedVerdict, mirrored here and tied by recipes/test/s10-rules.test.ts.
$S10LegQuietMs = 5000
$S10LegBoundMs = 60000
$S10LegPollMs = 500
$S10LegMarkWaitMs = 15000
$S10LegSettleMs = 700

# $true = the set of visible Chrome windows did not change for $S10LegQuietMs; $false = a STOP line was printed (the
# bound passed, or Chrome is not running). It opens, types into, moves and closes nothing; it prints counts only.
function Wait-S10StableWindows([string]$Leg, [string]$Phase) {
  $t0 = Get-Date; $prev = $null; $since = $t0; $changes = 0; $set = @(); $same = 0; $el = 0; $chrome = 0
  while ($true) {
    $chrome = @(Get-Process chrome -ErrorAction SilentlyContinue).Count
    $set = @(Get-S9ChromeWindows -AnyTitle | Sort-Object)
    $now = Get-Date
    $key = $set -join ','
    if ($null -eq $prev -or $key -ne $prev) { if ($null -ne $prev) { $changes++ }; $prev = $key; $since = $now }
    $same = [int]($now - $since).TotalMilliseconds; $el = [int]($now - $t0).TotalMilliseconds
    # s10-rules.ts legWinStep (mirrored)
    $step = if ($chrome -eq 0) { 'no-chrome' } elseif ($same -ge $S10LegQuietMs) { 'stable' } elseif ($el -ge $S10LegBoundMs) { 'timeout' } else { 'wait' }
    if ($step -ne 'wait') { break }
    Start-Sleep -Milliseconds $S10LegPollMs
  }
  if ($step -eq 'no-chrome') { Stop9 "LEG $Leg ${Phase}: not read - Chrome is NOT running (0 chrome processes); no window opened (it would start Chrome); RETURN to the step agent"; return $false }
  if ($step -eq 'timeout') { Stop9 "LEG $Leg ${Phase}: not read - Chrome's set of windows did not stay unchanged for $S10LegQuietMs ms within $S10LegBoundMs ms ($changes change(s), $($set.Count) window(s) at the end); no window opened, nothing typed, moved or closed; RETURN to the step agent"; return $false }
  Say9 "LEG $Leg ${Phase}: Chrome's window set stable - $($set.Count) visible window(s) unchanged for $same ms (after $el ms, $changes change(s)); $chrome chrome process(es)"
  $true
}

# The titled Chrome windows whose title contains $Marker (a plain substring match, no wildcard). Handles only.
function Get-S10MarkedWindows([string]$Marker) {
  @(Get-S9ChromeWindows | Where-Object { [S9Win]::Text([IntPtr]$_).Contains($Marker) })
}

# Opens the check window on a fresh per-call marker and returns @{ h; pid; marker } for the ONE window carrying it, or
# $null after a STOP line (0 or >= 2 marked windows: none is touched; or the marked window's omnibox not on the marker
# URL: that window - mine by its marker - is closed by its handle). It types nothing (the caller types the options URL).
function Open-S10MarkedWindow([string]$Leg, [string]$Phase) {
  $marker = 's15leg-' + [guid]::NewGuid().ToString('N')
  $url = "data:text/html,<title>$marker</title>"
  Start-Process -FilePath (Get-S9Chrome) -ArgumentList '--new-window', $url
  $t0 = Get-Date; $m = @()
  do { Start-Sleep -Milliseconds 300; $m = @(Get-S10MarkedWindows $marker) } until ($m.Count -ge 1 -or ((Get-Date) - $t0).TotalMilliseconds -ge $S10LegMarkWaitMs)
  Start-Sleep -Milliseconds $S10LegSettleMs
  $m = @(Get-S10MarkedWindows $marker)
  $ms = [int]((Get-Date) - $t0).TotalMilliseconds
  # s10-rules.ts markedVerdict (mirrored)
  $v = if ($m.Count -eq 1) { 'one' } elseif ($m.Count -eq 0) { 'none' } else { 'several' }
  if ($v -ne 'one') { Stop9 "LEG $Leg ${Phase}: not read - $($m.Count) Chrome window(s) carry this call's marker (need exactly 1) after $ms ms; nothing typed, moved or closed in any window; RETURN to the step agent"; return $null }
  $h = [long]$m[0]
  $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId([IntPtr]$h, [ref]$wpid)
  if (-not $global:S9WinIds) { $global:S9WinIds = @{} }
  $global:S9WinIds[[string]$h] = [int]$wpid
  $mw = @{ h = $h; pid = [int]$wpid; marker = $marker; url = $url; title = [S9Win]::Text([IntPtr]$h) }
  $u = ''
  try {
    $omni = Get-S9Omnibox $h
    $t1 = Get-Date
    do { $u = "$($omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value)"; if ($u -cne $url) { Start-Sleep -Milliseconds 200 } } until ($u -ceq $url -or ((Get-Date) - $t1).TotalSeconds -gt 5)
  } catch { $u = '' }
  if ($u -cne $url) {
    Stop9 "LEG $Leg ${Phase}: not read - the one marked window $h does not show the marker URL in its address bar; nothing typed; it is closed by its handle; RETURN to the step agent"
    Close-S10MarkedWindow $mw
    return $null
  }
  Say9 "LEG $Leg ${Phase}: my check window $h - the only window carrying this call's marker (after $ms ms), its address bar on the marker URL"
  $mw
}

# The address bar's text and the document URL of window $Hwnd, each read ONCE (no wait loop: Get-S9Omnibox polls up to
# 15 s); a failed read gives ''. Read-only: nothing focused, typed or moved. Not printed (URLs are never logged).
function Get-S10WindowUrls([long]$Hwnd) {
  $o = ''; $d = ''
  try {
    $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ClassNameProperty, 'OmniboxViewViews')
    $e = $S9UIA::FromHandle([IntPtr]$Hwnd).FindFirst([Windows.Automation.TreeScope]::Descendants, $c)
    if ($e) { $o = "$($e.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value)" }
  } catch { $o = '' }
  try { $d = "$(Get-S9DocUrl $Hwnd)" } catch { $d = '' }
  @($o, $d)
}

# Closes the marked window by its handle, only while it can still be PROVED to be the check window (#223 round 2,
# verifier MINOR: every Chrome window shares the browser pid, so pid + class alone cannot tell it from another Chrome
# window that reused the handle): a live window of the recorded pid and class Chrome_WidgetWin_1 AND either its title
# exactly the one recorded when it was picked (it carries the per-call marker) or its address bar / document URL exactly
# the marker URL or this extension's options URL. Otherwise a "not closed" line and nothing touched. The rule is
# recipes/s10-rules.ts closeMarkedVerdict, mirrored by the $v line (tied by recipes/test/s10-rules.test.ts).
function Close-S10MarkedWindow($Mw) {
  $h = [long]$Mw.h
  $wpid = [uint32]0; $cls = ''; $title = ''; $urls = @()
  $live = [S9Win]::IsWindow([IntPtr]$h)
  if ($live) {
    [void][S9Win]::GetWindowThreadProcessId([IntPtr]$h, [ref]$wpid)
    $cls = [S9Win]::Cls([IntPtr]$h)
    $title = [S9Win]::Text([IntPtr]$h)
    $urls = @(Get-S10WindowUrls $h)
  }
  # s10-rules.ts closeMarkedVerdict (mirrored)
  $v = if (-not $live) { 'gone' } elseif ([int]$wpid -ne [int]$Mw.pid -or $cls -ne 'Chrome_WidgetWin_1') { 'not-mine' } elseif (($title -and $title -ceq $Mw.title) -or ($Mw.url -and $urls -ccontains $Mw.url) -or ($urls -ccontains $S9OptionsUrl)) { 'close' } else { 'not-mine' }
  if ($v -eq 'close') { Close-S9Window $h }
  elseif ($v -eq 'gone') { Say9 "window $h is gone - not closed" }
  else { Say9 "window $h cannot be proved to be my check window (pid, class, title or address no longer match) - not closed" }
}

function Test-S10LegState([ValidateSet('PP1', 'RET-1', 'RET-1R')][string]$Leg, [ValidateSet('start', 'end')][string]$Phase) {
  $s = $null; $d = $false; $mw = $null
  if (-not (Wait-S10StableWindows $Leg $Phase)) { return $false }
  $mw = Open-S10MarkedWindow $Leg $Phase
  if (-not $mw) { return $false }
  try {
    Set-S9Omnibox $mw.h $S9OptionsUrl
    $s = Read-S9SafetyState $mw.h -PassThru
    $d = Test-S9DaemonSafety $true $true 0 "$Leg-$Phase" 5000
  } catch { Say9 "LEG $Leg ${Phase}: the read threw: $($_.Exception.Message)" }
  finally { Close-S10MarkedWindow $mw }
  $page = $s -and ($s.armed -eq $true) -and ($s.evaluate -eq $true) -and ($s.count -eq '0') -and ($s.lines -eq 0)
  $shaEq = if ($s -and $s.sha256 -eq $S9EmptySha) { 'equal' } else { 'DIFFERENT' }
  $ok = $page -and $d -and ($shaEq -eq 'equal')
  Say9 "LEG $Leg ${Phase}: stored armed+JavaScript on+0 sites $("$page".ToLower()), block-list sha256 vs found $shaEq, daemon.status equal $("$d".ToLower()) -> $(if ($ok) { 'equal' } else { 'NOT equal' })"
  if (-not $ok) { Stop9 "LEG $Leg ${Phase}: the safety state is not the found state (armed, JavaScript on, an empty list) - $(if ($Phase -eq 'start') { 'the leg does not run; nothing was changed' } else { 'nothing more is pressed in Chrome' }); RETURN to the step agent" }
  $ok
}

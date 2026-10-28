# recipes/s12-win-c.ps1: Windows helpers for Run 19's liveC19 (docs/e2e-test-plan.md section 4.27, Open item 12), S7-helpers-c.
# Windows PowerShell 5.1, ASCII only. Dot-source it AFTER s9-win.ps1, s11-win.ps1, s11b-win.ps1, s12-win.ps1 and s12-win-b.ps1 (it loads none; it edits none).
# NOT run against Chrome by its author. Prints no title, URL, path or token: handles, counts and the sheet's own words only.
# Top-level names carry an S12 prefix so none shadows a global the runner reads (case-insensitive: $o vs $global:O, Run 17b).
# The native file-dialog CLOSER: it finds the dialogs OWNED by window X (a window the wave opened; GW_OWNER = X) and acts on those only:
# the window's own close pattern, then the Cancel button, then Escape sent to that dialog only (foreground checked first), under a watchdog.
# Every primitive that acts re-checks that the dialog is owned by X; a dialog owned by any other window is never touched.

$S12CloserWatchdogMs = 5000
$S12CloserMethod = 'uia-owner'

if (-not ('S12Dlg' -as [type])) {
  Add-Type -TypeDefinition @'
using System; using System.Collections.Generic; using System.Runtime.InteropServices; using System.Text;
public static class S12Dlg {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  // Visible top-level #32770 windows as {hwnd, owner} pairs (a native common dialog).
  public static long[][] Dialogs() {
    var list = new List<long[]>();
    EnumProc f = (IntPtr h, IntPtr l) => {
      var sb = new StringBuilder(64); GetClassName(h, sb, 64);
      if (sb.ToString() == "#32770" && IsWindowVisible(h)) list.Add(new long[] { (long)h, (long)GetWindow(h, 4) });
      return true;
    };
    EnumWindows(f, IntPtr.Zero); GC.KeepAlive(f);
    return list.ToArray();
  }
}
'@
}

# ---- primitives (the tests stub these) ----------------------------------------------------------------------------------
function Get-S12AllDialogs { @([S12Dlg]::Dialogs() | ForEach-Object { [pscustomobject]@{ Hwnd = [long]$_[0]; Owner = [long]$_[1] } }) }
function Get-S12Foreground { [long][S12Dlg]::GetForegroundWindow() }
function Send-S12EscapeKey { [S9Win]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x1B, 0, 2, [UIntPtr]::Zero) }
function Send-S12MouseClick([int]$X, [int]$Y) { [void][S12Dlg]::SetCursorPos($X, $Y); [S12Dlg]::mouse_event(0x2, 0, 0, 0, [UIntPtr]::Zero); [S12Dlg]::mouse_event(0x4, 0, 0, 0, [UIntPtr]::Zero) }
function Get-S12WindowRect([long]$Hwnd) { $r = [S9Geo]::Rect([IntPtr]$Hwnd); [pscustomobject]@{ L = $r.Left; T = $r.Top; R = $r.Right; B = $r.Bottom } }
# Search list for the human click: window X only, never another Chrome window (the click helper reads and acts in the wave's own window).
function Get-S12ClickSearchHwnds([long]$Hwnd) { @($Hwnd) }
function Find-S12ClickTarget([long]$Hwnd, [string]$Like) {
  foreach ($w in (Get-S12ClickSearchHwnds $Hwnd)) {
    try {
      $root = $S9UIA::FromHandle([IntPtr]$w)
      foreach ($e in $root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition)) {
        if ($e.Current.ControlType.ProgrammaticName -eq 'ControlType.Button' -and $e.Current.Name -like $Like) { return $e }
      }
    } catch { }
  }
  $null
}
# The top-level window (HWND) UIA reports at a screen point; 0 when it cannot be read.
function Get-S12WindowAtPoint([int]$X, [int]$Y) {
  try {
    $cur = $S9UIA::FromPoint((New-Object System.Windows.Point($X, $Y)))
    $walker = [Windows.Automation.TreeWalker]::ControlViewWalker; $desk = [Windows.Automation.AutomationElement]::RootElement
    while ($cur) {
      $par = $walker.GetParent($cur)
      if ($par -and [Windows.Automation.Automation]::Compare($par, $desk)) { return [long]$cur.Current.NativeWindowHandle }
      $cur = $par
    }
  } catch { }
  [long]0
}
function Get-S12ElementRect($El) { $b = $El.Current.BoundingRectangle; [pscustomobject]@{ L = [int]$b.Left; T = [int]$b.Top; R = [int]$b.Right; B = [int]$b.Bottom } }
function Invoke-S12WindowClose([long]$Hwnd) {
  $p = $null
  try { $root = $S9UIA::FromHandle([IntPtr]$Hwnd); if ($root.TryGetCurrentPattern([Windows.Automation.WindowPattern]::Pattern, [ref]$p)) { $p.Close(); return $true } } catch { return $false }
  $false
}
function Find-S12DialogButton([long]$Hwnd, [string]$Like) {
  try {
    $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
    foreach ($e in $root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition)) {
      if ($e.Current.ControlType.ProgrammaticName -eq 'ControlType.Button' -and $e.Current.Name -like $Like) { return $e }
    }
  } catch { return $null }
  $null
}

# ---- the owner rule -----------------------------------------------------------------------------------------------------
# The dialogs owned by window X, nobody else's. Never a count of all dialogs.
function Get-S12OwnedDialogs([long]$Hwnd) { @(Get-S12AllDialogs | Where-Object { $_.Owner -eq $Hwnd } | ForEach-Object { [long]$_.Hwnd }) }
function Get-S12DialogCount([long]$Hwnd) { @(Get-S12OwnedDialogs $Hwnd).Count }
# Re-read at the moment of acting: $true only when $Dlg is a live dialog owned by X.
function Test-S12DialogOwned([long]$Hwnd, [long]$Dlg) { @(Get-S12OwnedDialogs $Hwnd) -contains $Dlg }

function Invoke-S12DialogClosePattern([long]$Hwnd, [long]$Dlg) {
  if (-not (Test-S12DialogOwned $Hwnd $Dlg)) { return $false }
  [bool](Invoke-S12WindowClose $Dlg)
}
function Invoke-S12DialogCancel([long]$Hwnd, [long]$Dlg) {
  if (-not (Test-S12DialogOwned $Hwnd $Dlg)) { return $false }
  $btn = Find-S12DialogButton $Dlg 'Cancel*'
  if (-not $btn) { return $false }
  [bool](Invoke-S12UiaElement $btn)
}
# Escape goes to this dialog only: owned by X, and in the foreground at the moment of the key. Never a key to whatever is in front.
function Send-S12DialogEscape([long]$Hwnd, [long]$Dlg) {
  if (-not (Test-S12DialogOwned $Hwnd $Dlg)) { return $false }
  [void](Set-S9Foreground $Dlg)
  if ((Get-S12Foreground) -ne $Dlg) { Say9 'CHECK dialog-escape foreground=other - no key sent'; return $false }
  Send-S12EscapeKey
  $true
}

# Waits up to $MaxMs (polling) for X to own no dialog, never past the watchdog; $true when none is left.
function Wait-S12DialogsGone([long]$Hwnd, [int]$MaxMs, [long]$StartMs, [int]$WatchdogMs) {
  $w0 = Get-S12NowMs
  do {
    if ((Get-S12DialogCount $Hwnd) -eq 0) { return $true }
    Start-Sleep -Milliseconds 100
  } while (((Get-S12NowMs) - $w0) -lt $MaxMs -and ((Get-S12NowMs) - $StartMs) -lt $WatchdogMs)
  (Get-S12DialogCount $Hwnd) -eq 0
}
# The closer. Returns @{ Closed; Ms; Method; Left }. A dialog left is a STOP line (`dialog-left-open`) and Closed = $false. Window X must be the wave's own.
function Close-S12Dialog([long]$Hwnd, [int]$WatchdogMs = $S12CloserWatchdogMs) {
  Assert-S11Own $Hwnd 'dialog close'
  $t0 = Get-S12NowMs; $method = 'none'
  foreach ($step in 'close', 'cancel', 'escape') {
    if ((Get-S12DialogCount $Hwnd) -eq 0) { break }
    if (((Get-S12NowMs) - $t0) -ge $WatchdogMs) { break }
    foreach ($d in @(Get-S12OwnedDialogs $Hwnd)) {
      try {
        if ($step -eq 'close') { [void](Invoke-S12DialogClosePattern $Hwnd $d) }
        elseif ($step -eq 'cancel') { [void](Invoke-S12DialogCancel $Hwnd $d) }
        else { [void](Send-S12DialogEscape $Hwnd $d) }
      } catch { }
    }
    $method = $step
    if (Wait-S12DialogsGone $Hwnd 700 $t0 $WatchdogMs) { break }
  }
  $left = Get-S12DialogCount $Hwnd
  $ms = (Get-S12NowMs) - $t0
  if ($left -ne 0) { Stop9 "dialog-left-open: $left native dialog(s) owned by window $Hwnd after $ms ms (method $method)" }
  [pscustomobject]@{ Closed = ($left -eq 0); Ms = $ms; Method = $method; Left = $left }
}
# Reads the count for up to $MaxMs (default 3 000) until a dialog owned by X shows; returns the last count.
function Wait-S12DialogOpen([long]$Hwnd, [int]$MaxMs = 3000) {
  $w0 = Get-S12NowMs
  do {
    $n = Get-S12DialogCount $Hwnd
    if ($n -gt 0) { return $n }
    Start-Sleep -Milliseconds 100
  } while (((Get-S12NowMs) - $w0) -lt $MaxMs)
  Get-S12DialogCount $Hwnd
}

# A real mouse click at the centre of the page's visible file input (Chrome names it a Choose File button), not through the bridge.
# Window X must be the wave's own, on an 8081 fixture, in the foreground; the point must lie inside X. Returns $true when the click was sent.
function Invoke-S12HumanClick([long]$Hwnd) {
  Assert-S11Own $Hwnd 'human click'
  if (([string](Get-S9DocUrl $Hwnd)) -notmatch '^http://(127\.0\.0\.1|localhost):8081/') { Stop9 "window $Hwnd is not on a fixture (8081) - no click sent"; throw 'not the fixture' }
  $el = $null; try { $el = Find-S12ClickTarget $Hwnd 'Choose File*' } catch { $el = $null }
  if (-not $el) { Say9 'CHECK human-click target=none'; return $false }
  $b = Get-S12ElementRect $el; $w = Get-S12WindowRect $Hwnd
  $cx = [int](($b.L + $b.R) / 2); $cy = [int](($b.T + $b.B) / 2)
  if ($cx -le $w.L -or $cx -ge $w.R -or $cy -le $w.T -or $cy -ge $w.B) { Say9 'CHECK human-click point=outside - no click sent'; return $false }
  if (-not (Set-S9Foreground $Hwnd) -or (Get-S12Foreground) -ne $Hwnd) { Say9 'CHECK human-click foreground=other - no click sent'; return $false }
  if ((Get-S12WindowAtPoint $cx $cy) -ne $Hwnd) { Say9 'CHECK human-click at-point=other-window - no click sent'; return $false }
  Send-S12MouseClick $cx $cy
  Say9 'CHECK human-click sent=yes'
  $true
}

# The row-less CLOSERPROBE (R19-CLOSER): window X opens the chooser fixture, the helper's own human-style click raises Chrome's dialog (no bridge call),
# the closer closes it, X is closed. Prints form (33). Returns $true on the pass (opened=yes closed=yes native-after=0); $false after a STOP line
# (the returning STOP `dialog-left-open`) or on opened=no (NOT MEASURED, the runner marks the human-style rows). X is always closed in a finally.
function Invoke-S12CloserProbe([string]$Url = 'http://localhost:8081/s12-chooser.html?s12=c1') {
  if (-not (Get-Command New-S16Window -CommandType Function -ErrorAction SilentlyContinue)) { Stop9 'New-S16Window is missing (dot-source the block runner first)'; return $false }
  $x = New-S16Window $Url
  $opened = $false; $closed = $null; $ms = 0; $after = 0; $stopped = $false
  try {
    Assert-S11Own $x 'closer probe'
    [void](Invoke-S12HumanClick $x)
    $opened = ((Wait-S12DialogOpen $x 3000) -gt 0)
    if ($opened) { $r = Close-S12Dialog $x; $closed = [bool]$r.Closed; $ms = $r.Ms; $stopped = (-not $closed) }
    $after = Get-S12DialogCount $x
  } finally {
    if (Test-S9Live $x) { Close-S9Window $x }
    $global:S11Own.Remove([string]$x)
  }
  Say9 "CLOSERPROBE method=$S12CloserMethod opened=$(if ($opened) { 'yes' } else { 'no' }) closed=$(if ($null -eq $closed) { 'n/a' } elseif ($closed) { 'yes' } else { 'no' }) ms=$ms native-after=$after"
  # the TS rule (closerprobeVerdict): any dialog of X left is the STOP, whatever `opened` says; one STOP line (the closer's own counts)
  if ($after -gt 0 -or ($opened -and -not ($closed -and $after -eq 0))) { if (-not $stopped) { Stop9 'dialog-left-open (CLOSERPROBE)' }; return $false }
  [bool]($opened -and $closed -and $after -eq 0)
}

# recipes/t5-win.ps1: Windows helpers for the Step 7 T5 wave (Windows PowerShell 5.1). Written
# 2026-10-22 before any run; not run before the wave (the autonomous part may not touch Chrome), so a
# helper bug found live is fixed and recorded as a set-up fix - a helper never changes a row's
# expected text or PASS rule.
#
#   . .\recipes\t5-win.ps1                      # load the functions into this PowerShell
#   powershell -NoProfile -File .\recipes\t5-win.ps1 -Capture -Hwnd <h> -Seconds 20 -IntervalMs 200 -OutDir <dir>
#                                               # capture loop (PrintWindow), for the banner checks
#
# Every function acts on a window handle the driver obtained from Open-T5Window or
# Get-T5ChromeWindows; titles of windows that are not the wave's own print as '<other window>'
# (the user's own windows are never named, touched or captured).
param(
  [switch]$Capture,
  [long]$Hwnd = 0,
  [int]$Seconds = 20,
  [int]$IntervalMs = 200,
  [string]$OutDir = "$env:TEMP\bridge-e2e\frames"
)

Add-Type -AssemblyName System.Drawing
if (-not ('T5Win' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class T5Win {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  public static string Text(IntPtr h) { var s = new StringBuilder(512); GetWindowText(h, s, 512); return s.ToString(); }
  public static string Cls(IntPtr h) { var s = new StringBuilder(256); GetClassName(h, s, 256); return s.ToString(); }
}
'@
}

# Titles the wave's own windows carry (fixture pages, the T5 titles the scripts set, Chrome's own pages),
# anchored. A DevTools title carries the inspected URL, so only an extension's console
# (`DevTools - chrome-extension://...`) is named; any other DevTools window prints as '<DevTools window>'
# (verifier M4: a user's DevTools title would leak a URL of the user's tab).
$T5Titles = '^Agent Bridge E2E Playground - Google Chrome$|^T5 [A-Za-z0-9 -]+ - Google Chrome$|^DevTools - chrome-extension://|^Discards - Google Chrome$|^Extensions - Google Chrome$'

function Format-T5Title([string]$t, [string]$Like = $T5Titles) {
  if ($t -match $Like) { $t } elseif ($t -match '^DevTools') { '<DevTools window>' } else { '<other window>' }
}

function Get-T5ChromeWindows([string]$Like = $T5Titles) {
  $found = New-Object System.Collections.ArrayList
  $cb = [T5Win+EnumProc]{ param($h, $l)
    if ([T5Win]::IsWindowVisible($h) -and [T5Win]::Cls($h) -eq 'Chrome_WidgetWin_1') {
      $t = [T5Win]::Text($h)
      if ($t -match ' - Google Chrome$' -or $t -match '^DevTools') {
        $r = New-Object T5Win+RECT; [void][T5Win]::GetWindowRect($h, [ref]$r)
        [void]$found.Add([pscustomobject]@{
          Hwnd = [long]$h; Title = (Format-T5Title $t $Like)
          Minimized = [T5Win]::IsIconic($h); Rect = "$($r.Left),$($r.Top) $($r.Right - $r.Left)x$($r.Bottom - $r.Top)"
        })
      }
    }
    $true }
  [void][T5Win]::EnumWindows($cb, [IntPtr]::Zero)
  $found
}

function Get-T5Chrome {
  $p = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
  if (-not $p) { $p = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" }
  $p
}

# Opens a new Chrome window on $Url and returns its handle (the one window that was not there before).
function Open-T5Window([string]$Url, [int]$TimeoutSec = 15) {
  $before = @(Get-T5ChromeWindows '.' | ForEach-Object { $_.Hwnd })
  Start-Process -FilePath (Get-T5Chrome) -ArgumentList '--new-window', $Url
  $s = Get-Date
  do {
    Start-Sleep -Milliseconds 300
    $new = @(Get-T5ChromeWindows | Where-Object { $before -notcontains $_.Hwnd })
  } until ($new.Count -ge 1 -or ((Get-Date) - $s).TotalSeconds -gt $TimeoutSec)
  if ($new.Count -ne 1) { throw "Open-T5Window: expected 1 new Chrome window, found $($new.Count)" }
  $new[0]
}

# Opens $Url as a new tab of the last-focused Chrome window (no --new-window).
function Open-T5Tab([string]$Url) { Start-Process -FilePath (Get-T5Chrome) -ArgumentList $Url }

function Set-T5Foreground([long]$H) {
  # Windows lets a process take the foreground after a key event; an ALT tap is the usual way in.
  [T5Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [T5Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
  if ([T5Win]::IsIconic([IntPtr]$H)) { [void][T5Win]::ShowWindow([IntPtr]$H, 9) }
  [void][T5Win]::SetForegroundWindow([IntPtr]$H)
  Start-Sleep -Milliseconds 300
  ([long][T5Win]::GetForegroundWindow()) -eq $H
}

function Get-T5Foreground {
  $h = [T5Win]::GetForegroundWindow(); $t = [T5Win]::Text($h)
  [pscustomobject]@{ Hwnd = [long]$h; Title = (Format-T5Title $t) }
}

# Topmost without activation (keeps a window uncovered, so Chrome does not mark its tabs hidden).
function Set-T5Topmost([long]$H, [switch]$Off) {
  $after = if ($Off) { [IntPtr](-2) } else { [IntPtr](-1) }   # HWND_NOTOPMOST / HWND_TOPMOST
  [void][T5Win]::SetWindowPos([IntPtr]$H, $after, 0, 0, 0, 0, 0x0013)  # NOSIZE|NOMOVE|NOACTIVATE
}

function Move-T5Window([long]$H, [int]$X, [int]$Y, [int]$W, [int]$Hgt) {
  [void][T5Win]::SetWindowPos([IntPtr]$H, [IntPtr]::Zero, $X, $Y, $W, $Hgt, 0x0014)  # NOZORDER|NOACTIVATE
}

function Hide-T5Window([long]$H) { [void][T5Win]::ShowWindow([IntPtr]$H, 6); Start-Sleep -Milliseconds 500; [T5Win]::IsIconic([IntPtr]$H) }   # SW_MINIMIZE
function Show-T5Window([long]$H) { [void][T5Win]::ShowWindow([IntPtr]$H, 4); Start-Sleep -Milliseconds 500; -not [T5Win]::IsIconic([IntPtr]$H) } # SW_SHOWNOACTIVATE
function Test-T5Minimized([long]$H) { [T5Win]::IsIconic([IntPtr]$H) }

# Closes one window by posting WM_CLOSE (what the title-bar X does): "by hand", not through the bridge.
function Close-T5Window([long]$H) { [void][T5Win]::PostMessage([IntPtr]$H, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }

# UI Automation: invoke the first element under window $H whose Name matches $NameLike (a link or
# button in a chrome:// page, e.g. the "service worker" link or a discard action). With $RowText,
# only inside the nearest ancestor of the element named $RowText that also contains a match.
function Invoke-T5Uia([long]$H, [string]$NameLike, [string]$RowText = '') {
  Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
  $root = [Windows.Automation.AutomationElement]::FromHandle([IntPtr]$H)
  $all = $root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition)
  $scope = $null
  if ($RowText) {
    $anchor = $null; foreach ($e in $all) { if ($e.Current.Name -eq $RowText) { $anchor = $e; break } }
    if (-not $anchor) { throw "Invoke-T5Uia: no element named '$RowText'" }
    $walker = [Windows.Automation.TreeWalker]::ControlViewWalker; $p = $walker.GetParent($anchor)
    while ($p) {
      $hits = @($p.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -match $NameLike })
      if ($hits.Count) { $scope = $hits; break }
      $p = $walker.GetParent($p)
    }
  } else {
    $scope = @($all | Where-Object { $_.Current.Name -match $NameLike })
  }
  if (-not $scope -or -not $scope.Count) { throw "Invoke-T5Uia: nothing named like '$NameLike'" }
  $target = $scope[0]
  $pat = $null
  if ($target.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$pat)) { $pat.Invoke() }
  else { throw "Invoke-T5Uia: '$($target.Current.Name)' has no Invoke pattern" }
  "invoked: $($target.Current.ControlType.ProgrammaticName) '$($target.Current.Name)'"
}

# One PrintWindow capture of window $H (PW_RENDERFULLCONTENT, works when the window is covered).
function Save-T5Frame([long]$H, [string]$Path) {
  $r = New-Object T5Win+RECT; [void][T5Win]::GetWindowRect([IntPtr]$H, [ref]$r)
  $w = $r.Right - $r.Left; $hh = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
  [void][T5Win]::PrintWindow([IntPtr]$H, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
  # Band signature: the mean colour of rows 60-140 (the infobar area under the toolbar), coarse.
  $sum = 0; $n = 0
  for ($y = 60; $y -lt [Math]::Min(140, $hh); $y += 4) { for ($x = 10; $x -lt $w - 10; $x += 16) { $c = $bmp.GetPixel($x, $y); $sum += $c.R + $c.G + $c.B; $n++ } }
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  if ($n) { [int]($sum / $n / 3) } else { -1 }
}

if ($Capture) {
  if (-not $Hwnd) { throw '-Capture needs -Hwnd' }
  New-Item -ItemType Directory -Force $OutDir | Out-Null
  $csv = Join-Path $OutDir 'frames.csv'
  'utc,file,band' | Set-Content -Encoding ASCII $csv
  $end = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $end) {
    $t = [DateTime]::UtcNow; $f = Join-Path $OutDir ('frame-{0:HHmmss.fff}.png' -f $t)
    $sig = Save-T5Frame $Hwnd $f
    ('{0:o},{1},{2}' -f $t, (Split-Path $f -Leaf), $sig) | Add-Content -Encoding ASCII $csv
    Start-Sleep -Milliseconds $IntervalMs
  }
}

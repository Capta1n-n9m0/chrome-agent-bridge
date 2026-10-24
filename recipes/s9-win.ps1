# recipes/s9-win.ps1: Windows UI Automation helpers for Step 9's live wave (Run 13; docs/e2e-test-plan.md section 4.20,
# wave sheet docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md). Windows PowerShell 5.1.
# Written 2026-10-24 by the S4 prep builder, before the Step 9 build was loaded; NOT run against Chrome by its author
# (the prep stage may not touch Chrome), so a helper bug found live is fixed and recorded as a set-up fix - a helper
# never changes a row's expected text or pass rule.
#
#   . .\recipes\s9-win.ps1          # dot-source: loads the functions (and sets UTF-8 output, LESSONS)
#
# Every function acts on a window handle the driver obtained from Open-S9Window / Open-S9ChromePage (a HWND diff:
# the one new Chrome window), never on the user's windows or tabs. It prints no title, URL or name of anything that
# is not the wave's own (fixture pages, this extension's pages and button, chrome://extensions), never the token
# (the options page's Token field is never read), and never the block-list text: Read-S9SafetyState prints only
# its line count and sha256 (UTF-8 of the textarea value as UIA ValuePattern reads it).
#
# Functions (each prints one or more stamped lines; "returns" = the pipeline value):
#   Open-S9Window <url>                      chrome.exe --new-window <http url>; returns the new HWND
#   Open-S9ChromePage <url>                  a new about:blank window navigated by its own omnibox to a chrome:// or
#                                            chrome-extension:// URL (Chrome opens those as a New Tab page on the
#                                            command line); returns the HWND
#   Set-S9Omnibox <hwnd> <url>               navigate that window's active tab by its omnibox (UIA SetValue + Enter)
#   Set-S9Foreground <hwnd> / Close-S9Window <hwnd>
#   Get-S9PinState <hwnd> / Set-S9Pin <hwnd> -Pin|-Unpin          the toolbar button (G9-2)
#   Get-S9ActionTitle <hwnd> / Wait-S9ActionTitle <hwnd> -Expect <t> [-TimeoutMs]
#   Invoke-S9ActionButton <hwnd> [-Times n] [-GapMs ms]           returns the last press time (ISO)
#   Get-S9BadgePixels <hwnd>                 record only: red/amber pixel counts on the button
#   Get-S9KeyboardLayouts / Send-S9Shortcut <hwnd> / Restore-S9Layout <hwnd> <hkl>   Alt+Shift+K; put a switched layout back
#   Read-S9Shortcuts <hwnd>                  window on chrome://extensions/shortcuts: is our command Alt+Shift+K?
#   Open-S9WorkerConsole <hwnd> / Read-S9WorkerConsole <hwnd> -Out <file>
#   Read-S9SafetyState <hwnd> [-PassThru]    the page as shown (waits for the stored state to arrive) / Read-S9OptionsLines <hwnd> [-ShowInvalid]
#   Read-S9StoredState <hwnd> [-PassThru]    STORED state: O to about:blank, then a fresh options page, then Read-S9SafetyState
#   Test-S9FoundState <hwnd>                 block 8's guard: armed + JS on + empty list (O and daemon.status), else STOP
#   Set-S9Switch <hwnd> -Which armed|evaluate -On $true|$false / Set-S9BlockList <hwnd> -Lines <s[]> | -FromFile <f>
#   Get-S9CardEnabled <hwnd>                 window on chrome://extensions: our card's enable toggle (SAFE-7d)
#   Get-S9ChromeStart                        the oldest chrome.exe start time (a changed value = Chrome restarted)
#   Restore-S9All [-Why <s>]                 THE restore entry point, idempotent, callable from any block: Restore-S9Safety
#                                            (armed, JS on, empty list; stored read-back + daemon.status + title), then
#                                            Restore-S9Desk (pin state, keyboard layout, the driver windows). $false = STOP.
#   Run 14 (Step 10 S1, 2026-10-25; driven by recipes/s9-r14.ps1): Stop9 / Write-S9Raw (STOP lines and the raw output
#   file $env:S9_RAW), Set-S9Pin -UiaOnly (or $global:S9PinUiaOnly: never the mouse), Get-S9WinPlace /
#   Set-S9SideBySide / Test-S9Placement (R14-3), Wait-S9OptionsStatus (R14-3), Invoke-S9PressWhenReady -BannerOut
#   -BannerForMs -BannerPollMs (R14-4b); Read-S9StoredState proves the old page gone; STATE prints a non-empty
#   list's sha256 as withheld(non-empty).
#   S1 wave fixer (Return 2, 2026-10-25): Get-S9OccluderIds (each occluder of O as driver:W|E|D|O or class + process,
#   never a title), Find-S9FreePlacement (W's monitor work area, then each other monitor's, first free kept),
#   Set-S9SideBySide -Area (and E, D moved inside W's rect), Test-S9Placement -Attempt -Area.
#   Invoke-S9OptionsButton <hwnd> -Id <html id>
#   Invoke-S9PressWhenReady <hwnd> -Row <r> -DelayMs <ms> [-Via Button|Shortcut] [-WatchBanner] [-RearmAfterMs <ms>]
#   Invoke-S9WhenReady -Row <r> -DelayMs <ms> -Action { ... }
#   Test-S9Banner <hwnd> / Select-S9Tab <hwnd> -TitlePrefix <p> / Close-S9Tab <hwnd> -TitlePrefix <p>
#   Get-BridgeClients (bridge MCP processes, count + PIDs) / Get-BridgeDaemon / Get-BridgeLog / Get-DriverChain / Get-ProcTree / Test-SafeToKill   (section 1 item 8, copied)
#
# Signals: s9.ts writes $env:S9_OUT\<row>.ready; Invoke-S9PressWhenReady writes $env:S9_OUT\<row>.pressed (ISO time
# of the press) - the default $env:S9_OUT is %TEMP%\bridge-e2e\s9, the same as s9.ts's.

[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Drawing, System.Windows.Forms
if (-not ('S9Win' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class S9Win {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint thread);
  [DllImport("user32.dll")] public static extern int GetKeyboardLayoutList(int n, IntPtr[] list);
  public static string Text(IntPtr h) { var s = new StringBuilder(512); GetWindowText(h, s, 512); return s.ToString(); }
  public static string Cls(IntPtr h) { var s = new StringBuilder(256); GetClassName(h, s, 256); return s.ToString(); }
  public static uint Thread(IntPtr h) { uint pid; return GetWindowThreadProcessId(h, out pid); }
}
'@
}
# Run 14 (R14-3, 2026-10-25): window rectangles, monitor work areas, moving the driver's own windows, and a count of
# visible windows above a window that overlap it (R14-3 guard: none allowed). One process, one DPI context: GetWindowRect,
# GetMonitorInfo and MoveWindow all use the same (possibly virtualised) coordinates.
if (-not ('S9Geo' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class S9Geo {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  public delegate bool MonitorEnumProc(IntPtr hMon, IntPtr hdc, ref RECT r, IntPtr data);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hgt, bool repaint);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr hMon, ref MONITORINFO mi);
  [DllImport("user32.dll")] public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorEnumProc f, IntPtr data);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int v, int size);
  public static RECT Rect(IntPtr h) { RECT r; GetWindowRect(h, out r); return r; }
  public static RECT[] WorkAreas() {
    var list = new List<RECT>();
    MonitorEnumProc f = (IntPtr m, IntPtr d, ref RECT r, IntPtr p) => { var mi = new MONITORINFO(); mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO)); if (GetMonitorInfo(m, ref mi)) list.Add(mi.rcWork); return true; };
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, f, IntPtr.Zero);
    GC.KeepAlive(f);
    return list.ToArray();
  }
  public static RECT WorkOf(IntPtr h) { var mi = new MONITORINFO(); mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO)); GetMonitorInfo(MonitorFromWindow(h, 2), ref mi); return mi.rcWork; }
  [DllImport("user32.dll", EntryPoint = "GetWindowLong")] public static extern int GetWindowLong32(IntPtr h, int idx);
  [DllImport("user32.dll")] public static extern bool GetLayeredWindowAttributes(IntPtr h, out uint key, out byte alpha, out uint flags);
  static bool Cloaked(IntPtr h) { int v; return DwmGetWindowAttribute(h, 14, out v, 4) == 0 && v != 0; }
  // A layered window that cannot cover anything: click-through (WS_EX_LAYERED 0x80000 + WS_EX_TRANSPARENT 0x20), or
  // fully transparent (GetLayeredWindowAttributes gives LWA_ALPHA 0x2 with alpha 0).
  static bool SeeThrough(IntPtr h) {
    int ex = GetWindowLong32(h, -20);
    if ((ex & 0x80000) == 0) return false;
    if ((ex & 0x20) != 0) return true;
    uint key; byte alpha; uint flags;
    return GetLayeredWindowAttributes(h, out key, out alpha, out flags) && (flags & 0x2) != 0 && alpha == 0;
  }
  // R14-3's occluder rule (prep fixer r1, S1-prep-verifier F5): top-level windows ABOVE target in the z-order
  // (GetWindow GW_HWNDPREV, walked to the top) that are visible, not minimized, not DWM-cloaked, not see-through
  // (above), with a non-empty rect intersecting target's with a positive area (touching edges do not count).
  public static int Occluders(IntPtr target) { return OccluderList(target).Length; }
  // Round 3 (after Return 3), diagnostics only: an occluder's owner (GW_OWNER), root owner (GA_ROOTOWNER), styles, and
  // the cursor position. Nothing here changes what OccluderList counts.
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  public static IntPtr OwnerOf(IntPtr h) { return GetWindow(h, 4); }
  public static IntPtr RootOwnerOf(IntPtr h) { return GetAncestor(h, 3); }
  public static int StyleOf(IntPtr h) { return GetWindowLong32(h, -16); }
  public static int ExStyleOf(IntPtr h) { return GetWindowLong32(h, -20); }
  public static string Cursor() { POINT p; return GetCursorPos(out p) ? (p.X + " " + p.Y) : ""; }
  // S1 wave fixer round 2 (S1-wave-verifier F1): every top-level shell taskbar window (Shell_TrayWnd,
  // Shell_SecondaryTrayWnd) and its rect, visible or not - recipes/s9-rules.ts taskbarCut decides which one cuts.
  public delegate bool WndEnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(WndEnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
  public static string[] ShellTrays() {
    var list = new List<string>();
    WndEnumProc f = (IntPtr h, IntPtr l) => {
      var sb = new System.Text.StringBuilder(256); GetClassName(h, sb, 256); string c = sb.ToString();
      if (c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd") { RECT r = Rect(h); list.Add(c + " " + r.Left + " " + r.Top + " " + r.Right + " " + r.Bottom); }
      return true;
    };
    EnumWindows(f, IntPtr.Zero);
    GC.KeepAlive(f);
    return list.ToArray();
  }
  // S1 wave fixer (Return 2, ruling (a)): the same walk, returning the handles it counts (s9-win.ps1
  // Get-S9OccluderIds names each as a driver window or by class + process - never by title).
  public static IntPtr[] OccluderList(IntPtr target) {
    RECT t = Rect(target); var list = new List<IntPtr>(); IntPtr h = GetWindow(target, 3);
    while (h != IntPtr.Zero) {
      if (IsWindowVisible(h) && !IsIconic(h) && !Cloaked(h) && !SeeThrough(h)) {
        RECT r = Rect(h);
        bool empty = !(r.Right > r.Left && r.Bottom > r.Top);
        if (!empty && Math.Min(r.Right, t.Right) > Math.Max(r.Left, t.Left) && Math.Min(r.Bottom, t.Bottom) > Math.Max(r.Top, t.Top)) list.Add(h);
      }
      h = GetWindow(h, 3);
    }
    return list.ToArray();
  }
}
'@
}

$S9UIA = [Windows.Automation.AutomationElement]
$S9Name = 'Chrome Agent Bridge'
$S9Id = 'cpnemjbgecfbeicldpaaegbhjgjgjfep'   # section 1 item 9; recomputed by `s9.ts id`
# extension/src/badge.ts BADGE_TITLES (#143), copied; recipes/test/s9-rules.test.ts checks EXPECT against the source.
$S9TitleOff = 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)'
$S9TitleArmed = 'Chrome Agent Bridge — armed (click to turn off)'
$S9TitleJsOff = 'Chrome Agent Bridge — armed, JavaScript off (click to turn off)'
if (-not $env:S9_OUT) { $env:S9_OUT = Join-Path $env:TEMP 'bridge-e2e\s9' }
$S9Repo = Split-Path -Parent $PSScriptRoot
$S9OptionsUrl = "chrome-extension://$S9Id/options.html"
$S9EmptySha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'   # sha256 of the empty text
# The wave's state for Restore-S9All lives in GLOBAL variables the wave sheet sets: $W $O $E $D (HWNDs), $WinStart,
# $PinnedBefore, $L0 (W's keyboard layout at block 4), $S9ChromeStart (block 1), $S9Found (Test-S9FoundState).

# Run 14 (Step 10 S1, 2026-10-25): every printed line is also appended, UTF-8, to $env:S9_RAW when it is set (the
# wave's raw output, which the live verifier greps for STOP lines - phase doc S1.5 with Stage 0 F20).
function Write-S9Raw([string[]]$Lines) {
  if (-not $env:S9_RAW) { return }
  try { [IO.File]::AppendAllText($env:S9_RAW, (($Lines | ForEach-Object { "$_" }) -join "`n") + "`n", (New-Object Text.UTF8Encoding $false)) } catch { }
}
function Say9([string]$m) { $l = ('{0:yyyy-MM-ddTHH:mm:ss.fffZ} s9-win: {1}' -f [DateTime]::UtcNow, $m); Write-Host $l; Write-S9Raw $l }
function Now9 { [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ') }
# A STOP line (#193): it begins with `STOP:` (no timestamp before it, so `^STOP:` finds it). The caller then throws or
# returns $false; the Run 14 block runner (recipes/s9-r14.ps1) turns either into the stop procedure.
function Stop9([string]$m) { $l = "STOP: $m (at $(Now9))"; Write-Host $l; Write-S9Raw $l }

# A title as this file may print it: the wave's own windows only.
function Format-S9Title([string]$t) {
  if ($t -match '^(Agent Bridge E2E Playground|S9 W human tab|Extensions|Extensions - Keyboard shortcuts|Chrome Agent Bridge — Options|about:blank|New Tab)( - Google Chrome)?$') { return $t }
  if ($t -match "^DevTools - chrome-extension://$S9Id/") { return $t }
  if ($t -match '^DevTools') { return '<DevTools window>' }
  '<other window>'
}

function Get-S9Chrome {
  $p = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
  if (-not $p) { $p = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)' }
  foreach ($c in @($p, "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")) { if ($c -and (Test-Path $c)) { return $c } }
  throw 'chrome.exe not found'
}

# Visible top-level Chrome windows (class Chrome_WidgetWin_1, a chrome.exe process); -AnyTitle includes untitled ones (bubbles).
function Get-S9ChromeWindows([switch]$AnyTitle) {
  $pids = @(Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
  $found = New-Object System.Collections.ArrayList
  $cb = [S9Win+EnumProc]{ param($h, $l)
    if ([S9Win]::IsWindowVisible($h) -and [S9Win]::Cls($h) -eq 'Chrome_WidgetWin_1') {
      $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId($h, [ref]$wpid)
      if ($pids -contains $wpid -and ($AnyTitle -or [S9Win]::Text($h))) { [void]$found.Add([long]$h) }
    }
    $true }
  [void][S9Win]::EnumWindows($cb, [IntPtr]::Zero)
  # S4 runner set-up fix (2026-10-24, block 4): was `, @($found)`, which wrote the array as ONE pipeline object, so
  # `Get-S9ChromeWindows | Where-Object …` filtered the array itself and `@(Get-S9ChromeWindows).Count` was always 1.
  @($found)
}

function Wait-S9NewWindow($before, [int]$TimeoutSec = 15, [string]$TitleLike = '') {
  $t0 = Get-Date; $new = @()
  do {
    Start-Sleep -Milliseconds 300
    $new = @(Get-S9ChromeWindows | Where-Object { $before -notcontains $_ } | Where-Object { -not $TitleLike -or ([S9Win]::Text([IntPtr]$_) -like $TitleLike) })
  } until ($new.Count -ge 1 -or ((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec)
  if ($new.Count -ne 1) { throw "expected exactly 1 new Chrome window, found $($new.Count) - not knowing which is mine, none is touched" }
  $h = [long]$new[0]
  # Prep fixer r2 (R2-1): the driver's windows are recorded with their owning pid at open time; Test-S9Live acts only
  # on a handle that still matches (a reused handle is never closed or typed into).
  $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId([IntPtr]$h, [ref]$wpid)
  if (-not $global:S9WinIds) { $global:S9WinIds = @{} }
  $global:S9WinIds[[string]$h] = [int]$wpid
  $h
}

function Open-S9Window([string]$Url) {
  if ($Url -notmatch '^http://localhost:808[013]/') { throw "Open-S9Window opens fixture URLs only" }
  $before = Get-S9ChromeWindows
  Start-Process -FilePath (Get-S9Chrome) -ArgumentList '--new-window', $Url
  $h = Wait-S9NewWindow $before
  Say9 "opened window $h on $Url ('$(Format-S9Title ([S9Win]::Text([IntPtr]$h)))')"
  $h
}

function Get-S9Omnibox([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ClassNameProperty, 'OmniboxViewViews')
  $t0 = Get-Date; $o = $null
  while (-not $o -and ((Get-Date) - $t0).TotalSeconds -lt 15) { $o = $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $c); if (-not $o) { Start-Sleep -Milliseconds 300 } }
  if (-not $o) { throw "no address bar in window $Hwnd" }
  $o
}

function Set-S9Foreground([long]$Hwnd) {
  if ([S9Win]::IsIconic([IntPtr]$Hwnd)) { [void][S9Win]::ShowWindow([IntPtr]$Hwnd, 9) }
  if (([long][S9Win]::GetForegroundWindow()) -ne $Hwnd) {
    # An ALT tap lets this process set the foreground (as recipes/reload-extension.ps1 does).
    [S9Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [void][S9Win]::SetForegroundWindow([IntPtr]$Hwnd); Start-Sleep -Milliseconds 300
  }
  ([long][S9Win]::GetForegroundWindow()) -eq $Hwnd
}

function Get-S9Doc([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::AutomationIdProperty, 'RootWebArea')
  $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $c)
}

function Get-S9DocUrl([long]$Hwnd) {
  $d = Get-S9Doc $Hwnd; $vp = $null
  if ($d -and $d.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern, [ref]$vp)) { return $vp.Current.Value }
  ''
}

function Set-S9Omnibox([long]$Hwnd, [string]$Url, [int]$TimeoutSec = 15) {
  Park-S9Cursor 'before the omnibox foreground/focus guard'   # round 3, ruling (c)
  $omni = Get-S9Omnibox $Hwnd
  if (-not (Set-S9Foreground $Hwnd)) { throw "window $Hwnd is not in the foreground - no key sent" }
  $omni.SetFocus()
  $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).SetValue($Url)
  Start-Sleep -Milliseconds 300
  $focused = $S9UIA::FocusedElement
  if (([long][S9Win]::GetForegroundWindow()) -ne $Hwnd -or -not $focused -or -not [Windows.Automation.Automation]::Compare($focused, $omni)) { throw "window $Hwnd or its address bar lost the focus - no key sent" }
  [S9Win]::keybd_event(0x0D, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x0D, 0, 2, [UIntPtr]::Zero)
  # Run 14 (S4-live-verifier finding 7): about:blank exposes no document URL to UIA (Run 13 printed "did NOT reach
  # about:blank" every time), so for about:blank "reached" = the document URL is empty or about:blank.
  $reached = { param([string]$x) if ($Url -eq 'about:blank') { $x -eq '' -or $x.StartsWith('about:blank') } else { $x.StartsWith($Url.TrimEnd('/')) } }
  $t0 = Get-Date; $u = ''
  do { Start-Sleep -Milliseconds 300; $u = Get-S9DocUrl $Hwnd } until ((& $reached $u) -or ((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec)
  if (& $reached $u) { Say9 "window $Hwnd now shows $Url" } else { Say9 "window $Hwnd did NOT reach $Url within $TimeoutSec s" }
}

function Open-S9ChromePage([string]$Url) {
  if ($Url -notmatch "^(chrome://extensions|chrome-extension://$S9Id/)") { throw "Open-S9ChromePage opens chrome://extensions… or this extension's pages only" }
  Park-S9Cursor 'before the one-new-window guard'   # round 3, ruling (c)
  $before = Get-S9ChromeWindows
  Start-Process -FilePath (Get-S9Chrome) -ArgumentList '--new-window', 'about:blank'
  $h = Wait-S9NewWindow $before
  $omni = Get-S9Omnibox $h
  $u0 = ''; $t0 = Get-Date
  do { $u0 = $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value; if ($u0 -ne 'about:blank') { Start-Sleep -Milliseconds 200 } } until ($u0 -eq 'about:blank' -or ((Get-Date) - $t0).TotalSeconds -gt 5)
  if ($u0 -ne 'about:blank') { throw "the new window $h is not on about:blank - not surely mine, nothing typed" }
  Set-S9Omnibox $h $Url
  $h
}

function Close-S9Window([long]$Hwnd) {
  [void][S9Win]::PostMessage([IntPtr]$Hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
  $t0 = Get-Date
  while ([S9Win]::IsWindow([IntPtr]$Hwnd) -and ((Get-Date) - $t0).TotalSeconds -lt 5) { Start-Sleep -Milliseconds 200 }
  if ([S9Win]::IsWindow([IntPtr]$Hwnd)) { Say9 "window $Hwnd did NOT close" } else { Say9 "window $Hwnd closed" }
}

# ---------------------------------------------------------------------------------------------- toolbar button

# Buttons in the window's own UI (outside the page) whose name starts with the extension's name.
function Find-S9ActionButtons([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Button)
  @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { $_.Current.Name -and $_.Current.Name.StartsWith($S9Name) })
}

function Get-S9PinState([long]$Hwnd) {
  $b = Find-S9ActionButtons $Hwnd
  Say9 "toolbar buttons named '$S9Name…': $($b.Count) -> pinned=$(if ($b.Count -ge 1) { 'true' } else { 'false' })"
  $b.Count -ge 1
}

function Get-S9ActionTitle([long]$Hwnd) {
  $b = Find-S9ActionButtons $Hwnd
  if ($b.Count -ne 1) { Say9 "ACTION buttons found: $($b.Count) (need exactly 1)"; return $null }
  $n = $b[0].Current.Name; $help = $b[0].Current.HelpText
  Say9 ("ACTION name ""$n""" + $(if ($help) { " help ""$help""" } else { '' }) + " class '$($b[0].Current.ClassName)'")
  $n
}

function Wait-S9ActionTitle([long]$Hwnd, [string]$Expect, [int]$TimeoutMs = 2000) {
  $t0 = Get-Date; $n = ''
  do {
    $b = Find-S9ActionButtons $Hwnd
    if ($b.Count -eq 1) { $n = $b[0].Current.Name; if ($n -eq $Expect -or $n.StartsWith($Expect)) { break } }
    Start-Sleep -Milliseconds 50
  } until (((Get-Date) - $t0).TotalMilliseconds -gt $TimeoutMs)
  $ms = [int]((Get-Date) - $t0).TotalMilliseconds
  if ($n -eq $Expect -or $n.StartsWith($Expect)) { Say9 "TITLE ok after $ms ms: ""$n""" } else { Say9 "TITLE TIMEOUT after $ms ms: last name ""$n"" (expected ""$Expect"")" }
}

function Invoke-S9ActionButton([long]$Hwnd, [int]$Times = 1, [int]$GapMs = 200) {
  $b = Find-S9ActionButtons $Hwnd
  if ($b.Count -ne 1) { throw "toolbar buttons named '$S9Name…': $($b.Count) (need exactly 1) - nothing pressed (is it pinned? G9-2)" }
  $pat = $null
  # S4 runner set-up fix (2026-10-24, block 14): Chrome 156's ToolbarActionView exposes no Invoke pattern; the button
  # is then clicked with the mouse (Click-S9Element: W foreground, the element at the point is the button).
  $hasInvoke = $b[0].TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$pat)
  $last = ''
  for ($i = 1; $i -le $Times; $i++) {
    if ($hasInvoke) { $pat.Invoke() } else { Click-S9Element $Hwnd $b[0] }
    $last = Now9
    Say9 "PRESS button $i/$Times at $last"
    if ($i -lt $Times) { Start-Sleep -Milliseconds $GapMs }
  }
  $last
}

# S4 runner set-up fix (2026-10-24, block 9): a left click at an element's centre, sent only when window $Hwnd is in
# the foreground and UIA's element at that point is the element itself (so nothing else can be hit).
if (-not ('S9Mouse' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class S9Mouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, UIntPtr e);
}
'@
}
function Click-S9Element([long]$Hwnd, $El) {
  # Round 3 (after Return 3), ruling (c): the cursor parked in W's page area before the foreground and FromPoint guards
  # (a tooltip or hover card under a resting cursor could be the element at the point), and again after the click.
  Park-S9Cursor 'before the click guards'
  if (-not (Set-S9Foreground $Hwnd)) { throw "window $Hwnd is not in the foreground - nothing clicked" }
  $r = $El.Current.BoundingRectangle
  $x = [int]($r.X + $r.Width / 2); $y = [int]($r.Y + $r.Height / 2)
  $at = $S9UIA::FromPoint((New-Object System.Windows.Point($x, $y)))
  if (-not $at -or -not [Windows.Automation.Automation]::Compare($at, $El)) { throw "the element at ($x,$y) is not the target - nothing clicked" }
  [void][S9Mouse]::SetCursorPos($x, $y); Start-Sleep -Milliseconds 50
  [S9Mouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero); [S9Mouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  Say9 "CLICK '$($El.Current.Name)' at ($x,$y)"
  Park-S9Cursor 'after the click'
}

# Pins (-Pin) or unpins (-Unpin) the button through W's Extensions menu. Prints only our row's element names.
# Run 14 (2026-10-25; #192/#202 do not pre-approve pinning by mouse click): with -UiaOnly, or when the wave sets
# $global:S9PinUiaOnly, the Extensions button is opened by UIA patterns only (Invoke, else ExpandCollapse.Expand);
# when neither works nothing is clicked and the result is $false - a human gate the caller turns into a STOP.
function Set-S9Pin([long]$Hwnd, [switch]$Pin, [switch]$Unpin, [switch]$UiaOnly) {
  if ($Pin -eq $Unpin) { throw 'Set-S9Pin: pass exactly one of -Pin, -Unpin' }
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Button)
  $ext = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { $_.Current.Name -eq 'Extensions' })
  if ($ext.Count -ne 1) { if ($UiaOnly -or $global:S9PinUiaOnly) { Say9 "Extensions buttons in window ${Hwnd}: $($ext.Count) (need 1) - nothing pressed"; return $false }; throw "Extensions buttons in window ${Hwnd}: $($ext.Count) (need 1) - nothing pressed (G9-2: ask the user)" }
  $before = Get-S9ChromeWindows -AnyTitle
  # S4 runner set-up fix (2026-10-24, block 9): Chrome 156's Extensions button (class ExtensionsToolbarButton) has no
  # Invoke pattern, only ExpandCollapse (and ScrollItem); expand it when Invoke is absent.
  # ExpandCollapse.Expand() answered E_FAIL live and UIA SetFocus moved the focus to the app menu button instead, so
  # the button is clicked with the mouse at its centre - only after UIA's element at that point IS this button and W
  # is in the foreground (Click-S9Element).
  $ip = $null; $ep = $null
  if ($ext[0].TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$ip)) { $ip.Invoke() }
  elseif ($UiaOnly -or $global:S9PinUiaOnly) {
    # Run 14: UIA patterns only - never the mouse (pinning by mouse click waits for the user's grant).
    if (-not $ext[0].TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$ep)) { Say9 'Extensions button: neither Invoke nor ExpandCollapse - nothing clicked (UIA only; a mouse click needs the user''s grant)'; return $false }
    try { $ep.Expand() } catch { Say9 "Extensions button: no Invoke pattern, and ExpandCollapse.Expand failed ($($_.Exception.Message)) - nothing clicked (UIA only; a mouse click needs the user's grant)"; return $false }
    Say9 'Extensions button expanded by its UIA pattern (no mouse)'
  }
  else { Click-S9Element $Hwnd $ext[0] }
  Start-Sleep -Milliseconds 800
  $menus = @(Get-S9ChromeWindows -AnyTitle | Where-Object { $before -notcontains $_ })
  $scopes = @($menus | ForEach-Object { $S9UIA::FromHandle([IntPtr]$_) }) + @($root)
  $row = $null
  foreach ($s in $scopes) {
    $hit = @($s.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -and $_.Current.Name.StartsWith($S9Name) -and -not ($_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $s -eq $root) })
    if ($hit.Count) { $row = [Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($hit[0]); break }
  }
  if (-not $row) { Say9 'Extensions menu: no row named for this extension - nothing pinned (G9-2: ask the user)'; return $false }
  $items = @($row.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))
  Say9 ("menu row elements: " + (($items | ForEach-Object { "$($_.Current.ControlType.ProgrammaticName -replace 'ControlType\.','') '$($_.Current.Name)'" }) -join '; '))
  $want = if ($Pin) { '(?i)^(?!.*\bunpin\b).*\bpin\b' } else { '(?i)\bunpin\b' }
  $btn = @($items | Where-Object { $_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and (($_.Current.Name -match $want) -or ($_.Current.HelpText -match $want)) })
  if ($btn.Count -ne 1) {
    Say9 "pin buttons matching ${want}: $($btn.Count) (need 1) - nothing pressed"
    [S9Win]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x1B, 0, 2, [UIntPtr]::Zero)
    return $false
  }
  $btn[0].GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  Say9 "invoked '$($btn[0].Current.Name)'"
  Start-Sleep -Milliseconds 500
  if (@(Get-S9ChromeWindows -AnyTitle | Where-Object { $before -notcontains $_ }).Count) { [S9Win]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x1B, 0, 2, [UIntPtr]::Zero) }
  Start-Sleep -Milliseconds 300
  $now = Get-S9PinState $Hwnd
  if ($Pin) { $now } else { -not $now }
}

# Record only: red (#d93025-ish) and amber (#e37400-ish) pixels on the button, screen capture (W must be uncovered).
function Get-S9BadgePixels([long]$Hwnd) {
  $b = Find-S9ActionButtons $Hwnd
  if ($b.Count -ne 1) { Say9 "BADGE pixels: no single button"; return }
  $r = $b[0].Current.BoundingRectangle
  $w = [int]$r.Width; $h = [int]$r.Height
  if ($w -le 0 -or $h -le 0) { Say9 'BADGE pixels: the button has no area'; return }
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen([int]$r.X, [int]$r.Y, 0, 0, $bmp.Size); $g.Dispose()
  $red = 0; $amber = 0
  for ($y = 0; $y -lt $h; $y++) { for ($x = 0; $x -lt $w; $x++) { $p = $bmp.GetPixel($x, $y)
      if ($p.R -gt 150 -and $p.G -lt 90 -and $p.B -lt 90) { $red++ } elseif ($p.R -gt 170 -and $p.G -ge 90 -and $p.G -le 170 -and $p.B -lt 70) { $amber++ } } }
  $bmp.Dispose()
  Say9 "BADGE pixels red=$red amber=$amber on ${w}x$h (record, not a check)"
}

# ----------------------------------------------------------------------------------------------- the shortcut

function Get-S9KeyboardLayouts {
  $n = [S9Win]::GetKeyboardLayoutList(0, $null); $a = New-Object IntPtr[] $n; [void][S9Win]::GetKeyboardLayoutList($n, $a)
  Say9 ("keyboard layouts installed: $n (" + (($a | ForEach-Object { '0x{0:x8}' -f $_.ToInt64() }) -join ', ') + ')')
}

function Get-S9Layout([long]$Hwnd) { '0x{0:x8}' -f ([S9Win]::GetKeyboardLayout([S9Win]::Thread([IntPtr]$Hwnd))).ToInt64() }

function Send-S9Shortcut([long]$Hwnd) {
  if (-not (Set-S9Foreground $Hwnd)) { throw "window $Hwnd is not in the foreground - no key sent" }
  $before = Get-S9Layout $Hwnd
  [S9Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)      # Alt down
  [S9Win]::keybd_event(0x10, 0, 0, [UIntPtr]::Zero)      # Shift down
  [S9Win]::keybd_event(0x4B, 0, 0, [UIntPtr]::Zero)      # K down
  [S9Win]::keybd_event(0x4B, 0, 2, [UIntPtr]::Zero)      # K up
  $at = Now9
  [S9Win]::keybd_event(0x10, 0, 2, [UIntPtr]::Zero)      # Shift up
  [S9Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)      # Alt up
  Start-Sleep -Milliseconds 400
  $after = Get-S9Layout $Hwnd
  Say9 "SHORTCUT pressed Alt+Shift+K at $at into window $Hwnd; layout before $before after $after"
  $at
}

# If Alt+Shift switched the input language (SAFE-2), tap Windows' own Alt+Shift until window $Hwnd reads $Want again
# (at most 4 taps); prints each reading. Only the layout the wave changed is put back.
function Restore-S9Layout([long]$Hwnd, [string]$Want) {
  for ($i = 0; $i -lt 4 -and (Get-S9Layout $Hwnd) -ne $Want; $i++) {
    Park-S9Cursor 'before the layout tap foreground guard'   # round 3, ruling (c)
    if (-not (Set-S9Foreground $Hwnd)) { throw "window $Hwnd is not in the foreground - no key sent" }
    [S9Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x10, 0, 0, [UIntPtr]::Zero)
    [S9Win]::keybd_event(0x10, 0, 2, [UIntPtr]::Zero); [S9Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 400
    Say9 "LAYOUT tap $($i + 1): now $(Get-S9Layout $Hwnd)"
  }
  $now = Get-S9Layout $Hwnd
  Say9 "LAYOUT $(if ($now -eq $Want) { 'restored' } else { 'NOT restored' }): $now (wanted $Want)"
}

# A window on chrome://extensions/shortcuts: our card's command and key (prints our card's matching texts only).
function Read-S9Shortcuts([long]$Hwnd) {
  $u = Get-S9DocUrl $Hwnd
  if (-not $u.StartsWith('chrome://extensions/shortcuts')) { throw "window $Hwnd is not on chrome://extensions/shortcuts" }
  $all = @((Get-S9Doc $Hwnd).FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))
  $start = -1; for ($i = 0; $i -lt $all.Count; $i++) { if ($all[$i].Current.Name -eq $S9Name) { $start = $i; break } }
  if ($start -lt 0) { Say9 "SHORTCUT card '$S9Name' not found"; return 'not-found' }
  $assigned = $false; $shown = @()
  for ($i = $start + 1; $i -lt [Math]::Min($all.Count, $start + 40); $i++) {
    $e = $all[$i]
    if ($e.Current.AutomationId -eq 'name' -and $e.Current.Name -ne $S9Name) { break }   # the next card
    $v = ''; $vp = $null; if ($e.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern, [ref]$vp)) { $v = $vp.Current.Value }
    foreach ($t in @($e.Current.Name, $v)) {
      if ($t -match '(?i)Activate the extension|Alt|Shift|Ctrl|Not set|shortcut') { $shown += $t }
      if ($t -match '(?i)Alt\s*\+\s*Shift\s*\+\s*K') { $assigned = $true }
    }
  }
  Say9 ("SHORTCUT card texts: " + (($shown | Select-Object -Unique | ForEach-Object { "'$_'" }) -join '; '))
  $res = if ($assigned) { 'assigned' } else { 'unassigned' }
  Say9 "SHORTCUT $res"
  $res
}

# --------------------------------------------------------------------------------------------- worker console

function Find-S9Card([long]$Hwnd) {
  $all = @((Get-S9Doc $Hwnd).FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))
  $starts = @(); for ($i = 0; $i -lt $all.Count; $i++) { if ($all[$i].Current.AutomationId -eq 'name') { $starts += $i } }
  for ($k = 0; $k -lt $starts.Count; $k++) {
    $s = $starts[$k]; $e = if ($k + 1 -lt $starts.Count) { $starts[$k + 1] } else { $all.Count }
    if ($all[$s].Current.Name -ne $S9Name) { continue }
    $span = @($all[$s..($e - 1)])
    if (@($span | Where-Object { $_.Current.Name -match "(^|\s)$S9Id$" }).Count -eq 1) { return , $span }
  }
  $null
}

# SAFE-7d's card read (prep fixer r1): our card's enable toggle (AutomationId enableToggle, docs/e2e-test-plan.md
# section 1) on a window showing chrome://extensions. Prints and returns 'on' | 'off' | 'not-found' (a record).
function Get-S9CardEnabled([long]$Hwnd) {
  if (-not (Get-S9DocUrl $Hwnd).StartsWith('chrome://extensions')) { throw "window $Hwnd is not on chrome://extensions" }
  $span = Find-S9Card $Hwnd
  $res = 'not-found'
  if ($span) {
    $t = @($span | Where-Object { $_.Current.AutomationId -eq 'enableToggle' })
    $tp = $null
    if ($t.Count -eq 1 -and $t[0].TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern, [ref]$tp)) { $res = if ($tp.Current.ToggleState -eq [Windows.Automation.ToggleState]::On) { 'on' } else { 'off' } }
  }
  Say9 "CARD $S9Name enable toggle: $res"
  $res
}

function Open-S9WorkerConsole([long]$Hwnd) {
  if (-not (Get-S9DocUrl $Hwnd).StartsWith('chrome://extensions')) { throw "window $Hwnd is not on chrome://extensions" }
  $span = Find-S9Card $Hwnd
  if (-not $span) { throw "no card for $S9Name ($S9Id) in window $Hwnd" }
  $link = @($span | Where-Object { $_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -like 'service worker*' })
  if ($link.Count -ne 1) { throw "service worker links on our card: $($link.Count) (need 1)" }
  Park-S9Cursor 'before the one-new-window guard'   # round 3, ruling (c)
  $before = Get-S9ChromeWindows
  $link[0].GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  $d = Wait-S9NewWindow $before 15 'DevTools*'
  Say9 "worker console window $d '$(Format-S9Title ([S9Win]::Text([IntPtr]$d)))'"
  $d
}

# Writes every text UIA exposes in the DevTools window (the Console panel selected first) to -Out, UTF-8, one per
# line, in tree order. Prints the line count only; s9.ts scan-file … --mode console judges it.
function Read-S9WorkerConsole([long]$Hwnd, [string]$Out) {
  if (-not [S9Win]::IsWindow([IntPtr]$Hwnd)) { Say9 'worker console window is gone - SAFE-10 console half NOT MEASURED'; return }
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $tab = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, (New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::TabItem))) | Where-Object { $_.Current.Name -eq 'Console' })
  if ($tab.Count -ge 1) { $sp = $null; if ($tab[0].TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern, [ref]$sp)) { $sp.Select(); Start-Sleep -Milliseconds 500 } }
  $lines = New-Object System.Collections.ArrayList
  foreach ($e in @($root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))) {
    $n = $e.Current.Name; if ($n) { [void]$lines.Add(($n -replace "`r?`n", ' ')) }
  }
  [IO.File]::WriteAllText($Out, (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding $false))
  Say9 "worker console: $($lines.Count) texts written to $Out (not printed; Console tab found: $($tab.Count -ge 1))"
}

# ----------------------------------------------------------------------------------------------- options page

function Get-S9Options([long]$Hwnd) {
  $u = Get-S9DocUrl $Hwnd
  if (-not $u.StartsWith("chrome-extension://$S9Id/options.html")) { throw "window $Hwnd is not on this extension's options page" }
  Get-S9Doc $Hwnd
}

function Get-S9ById($doc, [string]$Id) {
  $doc.FindFirst([Windows.Automation.TreeScope]::Descendants, (New-Object Windows.Automation.PropertyCondition($S9UIA::AutomationIdProperty, $Id)))
}

# An element's text: its Name, else the names of its descendants joined by a space.
function Get-S9Text($e) {
  if (-not $e) { return '' }
  if ($e.Current.Name) { return $e.Current.Name }
  (@($e.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) | ForEach-Object { $_.Current.Name } | Where-Object { $_ }) -join ' ')
}

# A checkbox's state, by AutomationId AND accessible name (options.html's labels; null when either does not match).
function Get-S9Toggle($doc, [string]$Id) {
  $e = Get-S9ById $doc $Id; $tp = $null
  $label = @{ armed = 'Bridge on*'; evaluate = 'Allow JavaScript*' }[$Id]
  if (-not $e -or ($label -and $e.Current.Name -notlike $label)) { return $null }
  if (-not $e.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern, [ref]$tp)) { return $null }
  $tp.Current.ToggleState -eq [Windows.Automation.ToggleState]::On
}

# S4 runner set-up fix (2026-10-24, block 8): Chrome 156 does not expose <p id="blocklist-summary"> under its id
# (it has no role, so UIA shows only its text, as a Text element with an empty AutomationId); the summary is that
# Text, the one whose name starts "<n> blocked site". By id first, in case a later build gives it a role.
function Get-S9Summary($doc) {
  $s = Get-S9Text (Get-S9ById $doc 'blocklist-summary')
  if ($s) { return $s }
  $t = @($doc.FindAll([Windows.Automation.TreeScope]::Descendants, (New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Text))) | Where-Object { $_.Current.Name -match '^\d+ blocked sites?\.' })
  if ($t.Count -eq 1) { return $t[0].Current.Name }
  ''
}

function Get-S9Sha256([string]$s) {
  $h = [Security.Cryptography.SHA256]::Create().ComputeHash((New-Object Text.UTF8Encoding $false).GetBytes($s))
  -join ($h | ForEach-Object { $_.ToString('x2') })
}

# The options page as shown. It first waits (<= 10 s) until the page has rendered a stored state: options.ts leaves
# #safety-status empty until its first storage.local read lands (refreshSafety -> render). The block list is printed
# only as its line count and sha256 (never its text); -PassThru also returns the values as an object.
function Read-S9SafetyState([long]$Hwnd, [switch]$PassThru) {
  $doc = Get-S9Options $Hwnd
  $t0 = Get-Date; $status = ''
  do { $status = Get-S9Text (Get-S9ById $doc 'safety-status'); if (-not $status) { Start-Sleep -Milliseconds 100; $doc = Get-S9Options $Hwnd } } until ($status -or ((Get-Date) - $t0).TotalSeconds -gt 10)
  if (-not $status) { throw "the options page in window $Hwnd rendered no stored state within 10 s (#safety-status empty)" }
  $armed = Get-S9Toggle $doc 'armed'; $eval = Get-S9Toggle $doc 'evaluate'
  $ta = Get-S9ById $doc 'blocklist'; $vp = $null
  if (-not $ta -or -not $ta.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern, [ref]$vp)) { throw 'no block-list textarea with a ValuePattern' }
  $text = $vp.Current.Value
  $lines = @($text -split "`r?`n" | Where-Object { $_.Trim() -ne '' }).Count
  $summary = Get-S9Summary $doc
  $count =if ($summary -match '^(\d+) blocked site') { $Matches[1] } else { '?' }
  $sha = Get-S9Sha256 $text
  # Run 14: the hash is printed only when it is the empty text's - the hash of a short non-empty list (the user's
  # own patterns) could be guessed back, so it is compared in memory (-PassThru) and printed as withheld.
  $shaShown = if ($sha -eq $S9EmptySha) { $sha } else { 'withheld(non-empty)' }
  $l = ('{0} s9-win: STATE armed={1} evaluate={2} count={3} lines={4} sha256={5} status "{6}" summary "{7}"' -f (Now9), "$armed".ToLower(), "$eval".ToLower(), $count, $lines, $shaShown, $status, $summary)
  Write-Host $l; Write-S9Raw $l
  if ($PassThru) { [pscustomobject]@{ armed = $armed; evaluate = $eval; count = $count; lines = $lines; sha256 = $sha; status = $status } }
}

# The STORED state: O is sent to about:blank and then to a fresh options page, so nothing the wave typed into the old
# page can be read back; the new page fills its checkboxes and textarea from storage.local (options.ts render with
# loadedList null), and Read-S9SafetyState waits until that read has landed.
# Run 14 (S4-live-verifier finding 7): the old page's departure is now proven - the document must stop being the
# options page after the about:blank navigation (else a throw: no fresh page, no stored read).
function Read-S9StoredState([long]$Hwnd, [switch]$PassThru) {
  Set-S9Omnibox $Hwnd 'about:blank'
  $t0 = Get-Date
  while ((Get-S9DocUrl $Hwnd).StartsWith($S9OptionsUrl)) { if (((Get-Date) - $t0).TotalSeconds -gt 10) { throw "window $Hwnd still shows the options page after the about:blank navigation - no fresh page, no stored read" }; Start-Sleep -Milliseconds 200 }
  Say9 "STORED read: the old options page in window $Hwnd is gone after $([int]((Get-Date) - $t0).TotalMilliseconds) ms"
  Set-S9Omnibox $Hwnd $S9OptionsUrl
  $t0 = Get-Date
  while (-not (Get-S9DocUrl $Hwnd).StartsWith($S9OptionsUrl)) { if (((Get-Date) - $t0).TotalSeconds -gt 10) { throw "window $Hwnd did not reach the options page" }; Start-Sleep -Milliseconds 200 }
  Say9 "STORED read: window $Hwnd reloaded onto a fresh options page"
  Read-S9SafetyState $Hwnd -PassThru:$PassThru
}

# daemon.status's safety tuple, through s9.ts wait-safety (exit 0 = reached within the timeout). Prints s9.ts's line.
function Test-S9DaemonSafety([bool]$Armed, [bool]$Evaluate, [int]$Count, [string]$Row, [int]$TimeoutMs = 5000) {
  Push-Location $S9Repo
  try {
    $a = "$Armed".ToLower(); $e = "$Evaluate".ToLower()
    $out = @(node --import tsx recipes/s9.ts wait-safety --armed $a --evaluate $e --count $Count --timeout $TimeoutMs --row $Row)
    $code = $LASTEXITCODE
    foreach ($l in $out) { Write-Host $l }; Write-S9Raw $out
    $code -eq 0
  } finally { Pop-Location }
}

# Block 8's pre-registered guard (prep fixer r1): every toggle in the wave sheet is a blind press and the restore
# targets armed + JS on + an empty list, so the wave may toggle only when that is what it found - on O (a stored read)
# AND in daemon.status. Sets $global:S9Found. $false = STOP before block 14 (nothing changed yet; nothing is saved).
function Test-S9FoundState([long]$Hwnd, [string]$Row = 'SAFE-11-start-guard') {
  $s = Read-S9StoredState $Hwnd -PassThru
  $d = Test-S9DaemonSafety $true $true 0 $Row 3000
  $def = ($s.armed -eq $true) -and ($s.evaluate -eq $true) -and ($s.count -eq '0') -and ($s.lines -eq 0) -and ($s.sha256 -eq $S9EmptySha)
  $global:S9Found = [pscustomobject]@{ Default = ($def -and $d); State = $s }
  if ($def -and $d) { Say9 'FOUND STATE = the expected default (armed, JavaScript on, empty list; O and daemon.status agree): the toggles may run'; return $true }
  Say9 "FOUND STATE differs from the expected default (O default: $("$def".ToLower()), daemon.status agrees: $("$d".ToLower())) - STOP before any toggle; the step agent asks the user. Nothing was changed."
  Stop9 "found-state guard: the safety state found is not armed + JavaScript on + an empty list (or daemon.status disagrees); nothing was changed"
  $false
}

function Read-S9OptionsLines([long]$Hwnd, [switch]$ShowInvalid) {
  $doc = Get-S9Options $Hwnd
  Say9 ("OPTIONS armed=" + "$(Get-S9Toggle $doc 'armed')".ToLower() + " evaluate=" + "$(Get-S9Toggle $doc 'evaluate')".ToLower())
  foreach ($id in @('safety-status', 'safety-error', 'blocklist-summary', 'blocklist-saved', 'blocklist-conflict', 'blocklist-error')) {
    $v = if ($id -eq 'blocklist-summary') { Get-S9Summary $doc } else { Get-S9Text (Get-S9ById $doc $id) }
    Say9 "OPTIONS $id ""$v"""
  }
  $ul = Get-S9ById $doc 'invalid-lines'
  $items = if ($ul) { @($ul.FindAll([Windows.Automation.TreeScope]::Children, [Windows.Automation.Condition]::TrueCondition)) } else { @() }
  if ($ShowInvalid) { $i = 0; foreach ($li in $items) { $i++; Say9 "OPTIONS invalid-lines[$i] ""$(Get-S9Text $li)""" } }
  Say9 "OPTIONS invalid-lines count $($items.Count)$(if (-not $ShowInvalid) { ' (texts not printed: -ShowInvalid only when the list is the wave''s own)' })"
}

function Set-S9Switch([long]$Hwnd, [ValidateSet('armed', 'evaluate')][string]$Which, [bool]$On) {
  $doc = Get-S9Options $Hwnd
  $e = Get-S9ById $doc $Which
  $label = if ($Which -eq 'armed') { 'Bridge on*' } else { 'Allow JavaScript*' }
  if (-not $e -or $e.Current.Name -notlike $label) { throw "no checkbox '$Which' named like '$label'" }
  $tp = $e.GetCurrentPattern([Windows.Automation.TogglePattern]::Pattern)
  $is = $tp.Current.ToggleState -eq [Windows.Automation.ToggleState]::On
  if ($is -eq $On) { Say9 "SWITCH $Which already $("$On".ToLower()) - nothing pressed"; return (Now9) }
  $tp.Toggle(); $at = Now9
  Start-Sleep -Milliseconds 300
  Say9 "SWITCH $Which -> $("$On".ToLower()) at $at (now $("$(Get-S9Toggle $doc $Which)".ToLower()))"
  $at
}

function Set-S9BlockList([long]$Hwnd, [string[]]$Lines = @(), [string]$FromFile = '') {
  $doc = Get-S9Options $Hwnd
  $text = if ($FromFile) { [IO.File]::ReadAllText($FromFile, (New-Object Text.UTF8Encoding $false)) } else { $Lines -join "`n" }
  $ta = Get-S9ById $doc 'blocklist'
  $ta.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).SetValue($text)
  Start-Sleep -Milliseconds 200
  $save = Get-S9ById $doc 'save-blocklist'
  if (-not $save -or $save.Current.Name -ne 'Save blocked sites') { throw "no button 'Save blocked sites'" }
  $save.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke(); $at = Now9
  Start-Sleep -Milliseconds 500
  $what = if ($FromFile) { 'the saved found text (not printed)' } else { "$($Lines.Count) line(s) of the wave's own" }
  # Prep fixer r1 (N2): a list read from a file may be the human's own - its sha256 is printed only when it is the
  # empty text's. The wave's own -Lines (the test pattern) are printed as before (§4.21 R14-5c's expected text).
  $sha = Get-S9Sha256 $text
  $shaShown = if ((-not $FromFile) -or ($sha -eq $S9EmptySha)) { $sha } else { 'withheld(non-empty)' }
  Say9 "BLOCKLIST set to $what, sha256 $shaShown, saved at $at"
  $at
}

function Invoke-S9OptionsButton([long]$Hwnd, [string]$Id) {
  $doc = Get-S9Options $Hwnd
  $b = Get-S9ById $doc $Id
  if (-not $b) { throw "no element with id '$Id'" }
  $b.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  Say9 "invoked options button '$($b.Current.Name)' at $(Now9)"
}

# ------------------------------------------------------------------------------------- presses on a signal

function Test-S9Banner([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  @($root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -and $_.Current.Name.Contains('started debugging this browser') }).Count
}

function Wait-S9Ready([string]$Row, [int]$TimeoutSec = 120) {
  $f = Join-Path $env:S9_OUT "$Row.ready"
  $t0 = Get-Date
  while (-not (Test-Path $f)) { if (((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec) { throw "no $f within $TimeoutSec s" }; Start-Sleep -Milliseconds 20 }
  Say9 "READY seen for $Row"
}

function Write-S9Pressed([string]$Row, [string]$At) {
  [IO.File]::WriteAllText((Join-Path $env:S9_OUT "$Row.pressed"), $At, (New-Object Text.UTF8Encoding $false))
}

# Run 14 (R14-4b, 2026-10-25): with -BannerOut <file> the banner is polled every -BannerPollMs (a poll starts every
# BannerPollMs, or at once when the previous one took longer) for at least -BannerForMs after the press, never stopping
# early, and every sample {ms after the press, shown} goes to the file as JSON for s9.ts (bannerLifetime: a RECORD).
# Without -BannerOut it behaves exactly as in Run 13 (100 ms polls, stop at gone, 3000 ms).
function Invoke-S9PressWhenReady([long]$Hwnd, [string]$Row, [int]$DelayMs = 0, [ValidateSet('Button', 'Shortcut')][string]$Via = 'Button', [switch]$WatchBanner, [int]$RearmAfterMs = 0, [int]$TimeoutSec = 120, [int]$BannerForMs = 3000, [int]$BannerPollMs = 100, [string]$BannerOut = '') {
  Wait-S9Ready $Row $TimeoutSec
  if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
  $atPress = $null
  if ($WatchBanner) { $atPress = (Test-S9Banner $Hwnd) -gt 0; Say9 "BANNER at press $(if ($atPress) { 'yes' } else { 'no' })" }
  $at = if ($Via -eq 'Button') { Invoke-S9ActionButton $Hwnd | Select-Object -Last 1 } else { Send-S9Shortcut $Hwnd | Select-Object -Last 1 }
  $at = ($at -split ' ')[-1]
  Write-S9Pressed $Row $at
  Say9 "PRESSED $Row (off) at $at"
  $t0 = [DateTime]::UtcNow
  if ($WatchBanner -and $BannerOut) {
    $samples = New-Object System.Collections.ArrayList
    do {
      $s0 = [DateTime]::UtcNow
      $shown = (Test-S9Banner $Hwnd) -gt 0
      [void]$samples.Add([pscustomobject]@{ ms = [int]($s0 - $t0).TotalMilliseconds; shown = $shown })
      $left = $BannerPollMs - [int](([DateTime]::UtcNow) - $s0).TotalMilliseconds
      if ($left -gt 0) { Start-Sleep -Milliseconds $left }
    } while ((([DateTime]::UtcNow) - $t0).TotalMilliseconds -lt ($BannerForMs + $BannerPollMs))
    $json = [pscustomobject]@{ atPress = $atPress; pollMs = $BannerPollMs; forMs = $BannerForMs; samples = @($samples) } | ConvertTo-Json -Depth 4 -Compress
    [IO.File]::WriteAllText($BannerOut, $json, (New-Object Text.UTF8Encoding $false))
    $nShown = @($samples | Where-Object { $_.shown }).Count
    $span = if ($samples.Count) { $samples[$samples.Count - 1].ms } else { 0 }
    Say9 "BANNER polled $($samples.Count) times over $span ms after the press ($nShown showed it); samples written to $BannerOut (s9.ts prints the lifetime, a record)"
  } elseif ($WatchBanner) {
    $gone = $null
    while ((([DateTime]::UtcNow) - $t0).TotalMilliseconds -lt $BannerForMs) { if ((Test-S9Banner $Hwnd) -eq 0) { $gone = [int](([DateTime]::UtcNow) - $t0).TotalMilliseconds; break }; Start-Sleep -Milliseconds $BannerPollMs }
    if ($null -ne $gone) { Say9 "BANNER gone after $gone ms" } else { Say9 "BANNER still shown $BannerForMs ms after the press" }
  }
  if ($RearmAfterMs -gt 0) {
    $left = $RearmAfterMs - [int](([DateTime]::UtcNow) - $t0).TotalMilliseconds
    if ($left -gt 0) { Start-Sleep -Milliseconds $left }
    $re = Invoke-S9ActionButton $Hwnd | Select-Object -Last 1
    Say9 "RE-ARM pressed $Row at $(($re -split ' ')[-1])"
    Wait-S9ActionTitle $Hwnd ($S9TitleArmed.Substring(0, 27)) 2000   # 'Chrome Agent Bridge — armed' (also the JS-off title)
  }
}

function Invoke-S9WhenReady([string]$Row, [int]$DelayMs = 0, [scriptblock]$Action, [int]$TimeoutSec = 120) {
  Wait-S9Ready $Row $TimeoutSec
  if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
  & $Action
  $at = Now9
  Write-S9Pressed $Row $at
  Say9 "ACTION done for $Row at $at"
}

# The tab strip's tab (ClassName 'Tab') in window $Hwnd whose name starts with $TitlePrefix.
function Get-S9Tab([long]$Hwnd, [string]$TitlePrefix) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ClassNameProperty, 'Tab')
  $t = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { $_.Current.Name.StartsWith($TitlePrefix) })
  if ($t.Count -ne 1) { throw "tabs in window $Hwnd named '$TitlePrefix…': $($t.Count) (need 1)" }
  $t[0]
}

function Select-S9Tab([long]$Hwnd, [string]$TitlePrefix) {
  $t = Get-S9Tab $Hwnd $TitlePrefix; $sp = $null
  if ($t.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern, [ref]$sp)) { $sp.Select() }
  else { $t.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke() }
  Say9 "selected the tab '$TitlePrefix…' in window $Hwnd at $(Now9)"
}

# Run 14 teardown (prep fixer r1, N1): close the ONE tab in window $Hwnd's strip whose name does not start with
# $KeepPrefix (R14-REL-3's r3, which may show an own page or a view-source: title carrying a URL): no title is printed.
# More or fewer than one such tab is a throw (the caller's STOP). Untested live (Run 13 never closed r3 this way).
function Close-S9OtherTab([long]$Hwnd, [string]$KeepPrefix) {
  if (-not (Test-S9Live $Hwnd)) { throw "window $Hwnd is not taken as the driver's - no tab closed" }
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ClassNameProperty, 'Tab')
  $t = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { -not $_.Current.Name.StartsWith($KeepPrefix) })
  if ($t.Count -ne 1) { throw "tabs in window $Hwnd not named '$KeepPrefix…': $($t.Count) (need 1)" }
  $b = New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Button)
  $x = @($t[0].FindAll([Windows.Automation.TreeScope]::Descendants, $b) | Where-Object { $_.Current.Name -eq 'Close' })
  if ($x.Count -ne 1) { throw "close buttons on that tab: $($x.Count) (need 1)" }
  $x[0].GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  Say9 "closed the one tab in window $Hwnd not named '$KeepPrefix…' (title not printed)"
}

function Close-S9Tab([long]$Hwnd, [string]$TitlePrefix) {
  $t = Get-S9Tab $Hwnd $TitlePrefix
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Button)
  $x = @($t.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { $_.Current.Name -eq 'Close' })
  if ($x.Count -ne 1) { throw "close buttons on that tab: $($x.Count) (need 1)" }
  $x[0].GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  Say9 "closed the tab '$TitlePrefix…' in window $Hwnd"
}

# ------------------------------------------------------------------------------- Run 14: R14-3 placement

# A window's rect (GetWindowRect), minimized and visible flags, as the JSON recipes/s9-rules.ts placementVerdict reads.
function Get-S9WinPlace([long]$Hwnd) {
  $r = [S9Geo]::Rect([IntPtr]$Hwnd)
  [pscustomobject]@{ rect = [pscustomobject]@{ left = $r.Left; top = $r.Top; right = $r.Right; bottom = $r.Bottom }; minimized = [bool][S9Win]::IsIconic([IntPtr]$Hwnd); visible = [bool][S9Win]::IsWindowVisible([IntPtr]$Hwnd) }
}

# R14-3: W the left 60 % and O the right 40 % of W's monitor work area (recipes/s9-rules.ts sideBySide, the same
# split), both restored first (not maximized or minimized), then O and W brought to the front in that order, so O is
# second in the z-order, above every other window it might overlap. Moves the driver's own windows only.
#
# S1 wave fixer (Return 2, ruling (a)): -Area places them on a given work area (an attempt of Find-S9FreePlacement;
# default W's monitor work area, as before). The other driver windows E and D are moved INSIDE W's new rect first
# (restored, same rect as W), so they cannot overlap O whatever their z-order; O then W are brought to the front after.
function Set-S9SideBySide([long]$W, [long]$O, $Area = $null) {
  foreach ($h in @($W, $O)) { if (-not (Test-S9Live $h)) { throw "window $h is not taken as the driver's - nothing moved" } }
  $a = if ($null -ne $Area) { $Area } else { [S9Geo]::WorkOf([IntPtr]$W) }
  $split = $a.Left + [Math]::Floor((($a.Right - $a.Left) * 3) / 5)
  foreach ($h in @($W, $O)) { [void][S9Win]::ShowWindow([IntPtr]$h, 9) }
  Start-Sleep -Milliseconds 300
  [void][S9Geo]::MoveWindow([IntPtr]$W, $a.Left, $a.Top, $split - $a.Left, $a.Bottom - $a.Top, $true)
  foreach ($n in 'E', 'D') {
    $h = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue
    if ($h -and (Test-S9Live $h)) {
      [void][S9Win]::ShowWindow([IntPtr][long]$h, 9)
      [void][S9Geo]::MoveWindow([IntPtr][long]$h, $a.Left, $a.Top, $split - $a.Left, $a.Bottom - $a.Top, $true)
      Say9 "MOVED driver window $n inside W's rect [$($a.Left),$($a.Top),$split,$($a.Bottom)] (off O's rect)"
    }
  }
  [void][S9Geo]::MoveWindow([IntPtr]$O, $split, $a.Top, $a.Right - $split, $a.Bottom - $a.Top, $true)
  Start-Sleep -Milliseconds 500
  [void](Set-S9Foreground $O); [void](Set-S9Foreground $W)
  Say9 "PLACED W left and O right on W's monitor work area [$($a.Left),$($a.Top),$($a.Right),$($a.Bottom)] (split at x=$split); O then W brought to the front"
}

# S1 wave fixer (Return 2, ruling (a)): each window S9Geo.OccluderList counts above $O, named as a driver window
# (driver = W|E|D|O, by handle) or by its class name and owning process name. Never a title. recipes/s9-rules.ts
# occluderText formats it (and strips anything that could carry a URL).
function Get-S9OccluderIds([long]$O) {
  $drivers = @{}
  foreach ($n in 'W', 'E', 'D', 'O') { $h = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue; if ($h) { $drivers[[string][long]$h] = $n } }
  # Round 3 (after Return 3), diagnostics only: each occluder also carries its rect, whether its owner and root owner
  # are a driver window (W/E/D/O), another window or none, and its style flags (s9-rules occluderDetailLine prints them).
  $kind = { param([IntPtr]$x) if ($x -eq [IntPtr]::Zero) { 'none' } elseif ($drivers.ContainsKey([string][long]$x)) { $drivers[[string][long]$x] } else { 'other' } }
  @([S9Geo]::OccluderList([IntPtr]$O) | ForEach-Object {
      $k = [string][long]$_
      $r = [S9Geo]::Rect($_)
      $root = [S9Geo]::RootOwnerOf($_); if ($root -eq $_) { $root = [IntPtr]::Zero }   # GA_ROOTOWNER of an unowned window is itself
      $st = [int][S9Geo]::StyleOf($_); $ex = [int][S9Geo]::ExStyleOf($_)
      $d = [pscustomobject]@{
        rect = [pscustomobject]@{ left = $r.Left; top = $r.Top; right = $r.Right; bottom = $r.Bottom }
        owner = (& $kind ([S9Geo]::OwnerOf($_))); rootOwner = (& $kind $root)
        styles = [pscustomobject]@{ topmost = (($ex -band 0x8) -ne 0); popup = (($st -band [int]::MinValue) -ne 0); toolwindow = (($ex -band 0x80) -ne 0); noactivate = (($ex -band 0x08000000) -ne 0) }
      }
      if ($drivers.ContainsKey($k)) { $d | Add-Member -NotePropertyName driver -NotePropertyValue $drivers[$k] }
      else {
        $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId($_, [ref]$wpid)
        $pn = (Get-Process -Id ([int]$wpid) -ErrorAction SilentlyContinue).ProcessName
        $d | Add-Member -NotePropertyName cls -NotePropertyValue ([S9Win]::Cls($_))
        $d | Add-Member -NotePropertyName process -NotePropertyValue "$pn"
      }
      $d
    })
}

# Round 3 (after Return 3), ruling (c): park the mouse cursor at the FIXED point of recipes/s9-rules.ts parkPoint -
# PARK_INSET_PX (4) right of and below the top-left corner of W's page area (UIA RootWebArea of $global:W) - before a
# guard a transient Chrome window (tooltip, hover card, bubble) could trip, and after every FromPoint-verified click.
# The point comes from `s9.ts park-point` once per page rect and process (cached, keyed by W's window rect), so the
# timed press path of R14-4b costs one SetCursorPos. No W, no page area, or a page too small -> one PARK line and no
# move (the guard then runs as before). Never moves any window; prints no title.
$global:S9ParkCache = @{}
function Park-S9Cursor([string]$Why) {
  $w = $global:W
  if (-not $w -or -not [S9Win]::IsWindow([IntPtr][long]$w)) { Say9 "PARK skipped ($Why): no driver window W"; return }
  $wr = [S9Geo]::Rect([IntPtr][long]$w); $key = "$w $($wr.Left) $($wr.Top) $($wr.Right) $($wr.Bottom)"
  if (-not $global:S9ParkCache.ContainsKey($key)) {
    $doc = Get-S9Doc ([long]$w)
    if (-not $doc) { Say9 "PARK skipped ($Why): W shows no page area"; return }
    $b = $doc.Current.BoundingRectangle
    $rect = "$([int]$b.Left),$([int]$b.Top),$([int]$b.Right),$([int]$b.Bottom)"
    Push-Location $S9Repo
    try { $out = @(node --import tsx recipes/s9.ts park-point --rect $rect) } finally { Pop-Location }
    foreach ($l in $out) { Write-Host $l }; Write-S9Raw $out
    $m = [regex]::Match("$($out | Select-Object -Last 1)", 'PARK point \((-?\d+),(-?\d+)\)')
    $global:S9ParkCache[$key] = if ($m.Success) { @([int]$m.Groups[1].Value, [int]$m.Groups[2].Value) } else { $null }
  }
  $pt = $global:S9ParkCache[$key]
  if (-not $pt) { Say9 "PARK skipped ($Why): no park point for W's page area"; return }
  [void][S9Mouse]::SetCursorPos($pt[0], $pt[1])
  Say9 "PARK cursor at ($($pt[0]),$($pt[1])) in W's page area ($Why)"
}

# S1 wave fixer (Return 2, ruling (a)): R14-3's placement, tried in the order fixed before attempt 3 - W's monitor work
# area, then each other monitor's work area in the order the system lists them (s9.ts placement-order). Each attempt
# places W and O side by side there (Set-S9SideBySide -Area) and judges it (Test-S9Placement -Attempt: a
# `PLACEMENT attempt <n> …` line, no CHECK); the first free one is kept. $true = one is free (the caller's guard then
# re-checks it, unchanged); $false = none free (the caller's existing STOP).
function Find-S9FreePlacement([long]$W, [long]$O) {
  $wa = [S9Geo]::WorkOf([IntPtr]$W)
  $rect = { param($r) [pscustomobject]@{ left = $r.Left; top = $r.Top; right = $r.Right; bottom = $r.Bottom } }
  # Round 2 (S1-wave-verifier F1): the shell taskbars go with it; s9.ts cuts each area above any that intersects it.
  $shell = @([S9Geo]::ShellTrays() | ForEach-Object { $x = "$_".Split(' '); [pscustomobject]@{ cls = $x[0]; rect = [pscustomobject]@{ left = [int]$x[1]; top = [int]$x[2]; right = [int]$x[3]; bottom = [int]$x[4] } } })
  $j = [pscustomobject]@{ wWork = (& $rect $wa); work = @([S9Geo]::WorkAreas() | ForEach-Object { & $rect $_ }); shell = $shell }
  $f = Join-Path $env:S9_OUT 'r14-placement-order.json'
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
    if (Test-S9Placement $W $O "placement-attempt-$n" -Attempt $n -Area $a) { Say9 "PLACEMENT chosen: attempt $n of $($areas.Count)"; return $true }
  }
  Say9 "PLACEMENT none of the $($areas.Count) work areas is free"
  $false
}

# R14-3's guard: both rects, the minimized/visible flags, every monitor's work area and a count of windows above O
# that overlap it (S9Geo.Occluders; 0 needed since prep fixer r1, F5) go to $env:S9_OUT\r14-placement.json; `s9.ts rect-check` judges them (placementVerdict).
# Returns $true on PASS. A FAIL is the caller's STOP (the row would not measure what it names).
# S1 wave fixer (Return 2, ruling (a)): the JSON also carries `occluderIds` (Get-S9OccluderIds, printed after the count
# only when there are some); -Attempt <n> -Area <rect> makes it one try of Find-S9FreePlacement (a record line, no CHECK).
function Test-S9Placement([long]$W, [long]$O, [string]$Step = 'placement', [int]$Attempt = 0, $Area = $null) {
  $work = @([S9Geo]::WorkAreas() | ForEach-Object { [pscustomobject]@{ left = $_.Left; top = $_.Top; right = $_.Right; bottom = $_.Bottom } })
  $ids = @(Get-S9OccluderIds $O)
  $cur = "$([S9Geo]::Cursor())".Split(' ')
  $p = [pscustomobject]@{ w = (Get-S9WinPlace $W); o = (Get-S9WinPlace $O); work = $work; occluders = $ids.Count; occluderIds = $ids; cursor = $(if ($cur.Count -eq 2) { [pscustomobject]@{ x = [int]$cur[0]; y = [int]$cur[1] } } else { $null }) }
  if ($Attempt -gt 0) { $p | Add-Member -NotePropertyName area -NotePropertyValue ([pscustomobject]@{ left = $Area.Left; top = $Area.Top; right = $Area.Right; bottom = $Area.Bottom }) }
  $f = Join-Path $env:S9_OUT 'r14-placement.json'
  [IO.File]::WriteAllText($f, ($p | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding $false))
  Push-Location $S9Repo
  try {
    $extra = if ($Attempt -gt 0) { @('--attempt', "$Attempt") } else { @() }
    $out = @(node --import tsx recipes/s9.ts rect-check --file $f --row R14-3 --step $Step @extra)
    $code = $LASTEXITCODE
    foreach ($l in $out) { Write-Host $l }; Write-S9Raw $out
    $code -eq 0
  } finally { Pop-Location }
}

# R14-3: poll the options page AS SHOWN (never reloaded) until #safety-status reads $Expect, at most $TimeoutMs.
function Wait-S9OptionsStatus([long]$Hwnd, [string]$Expect, [int]$TimeoutMs = 2000) {
  $t0 = Get-Date; $s = ''
  do {
    $s = Get-S9Text (Get-S9ById (Get-S9Options $Hwnd) 'safety-status')
    if ($s -eq $Expect) { break }
    Start-Sleep -Milliseconds 100
  } until (((Get-Date) - $t0).TotalMilliseconds -gt $TimeoutMs)
  $ms = [int]((Get-Date) - $t0).TotalMilliseconds
  if ($s -eq $Expect) { Say9 "OPTIONS-WAIT reached '$Expect' after $ms ms (the page as shown, not reloaded)"; return $true }
  Say9 "OPTIONS-WAIT NOT reached '$Expect' within $TimeoutMs ms (the page as shown); last '$s'"
  $false
}

# ------------------------------------------------------------------------------------ the restore (G9-1)
# Prep fixer r1 (S4-prep-verifier finding 1): ONE idempotent entry point, Restore-S9All, that the runner calls on any
# stop or helper throw from any block, and at the wave's end (blocks 40 and 43 call its two halves). Each half
# re-reads before it acts, so a second call presses nothing. It returns $true only when everything read back equal;
# $false is a STOP that escalates (the step agent asks the user; nothing else is touched in Chrome).

function Get-S9ChromeStart {
  $p = @(Get-Process chrome -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1)
  if ($p.Count) { $p[0].StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ') } else { '' }
}

# A driver window still alive AND still the driver's (prep fixer r2, S4-prep-verifier R2-1): IsWindow, class
# Chrome_WidgetWin_1, owned by a running chrome.exe whose pid equals the one Wait-S9NewWindow recorded for this
# handle at open time, and a title Format-S9Title recognises as the wave's own. Anything else counts as gone: the
# restore never closes or types into it (a window it should have closed then shows up as a count mismatch -> STOP).
function Test-S9Live($h) {
  if (-not $h) { return $false }
  $ip = [IntPtr][long]$h
  if (-not [S9Win]::IsWindow($ip)) { return $false }
  $why = ''
  $want = if ($global:S9WinIds) { $global:S9WinIds[[string][long]$h] } else { $null }
  $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId($ip, [ref]$wpid)
  $proc = Get-Process -Id ([int]$wpid) -ErrorAction SilentlyContinue
  if ($null -eq $want) { $why = 'not recorded at open time' }
  elseif ([S9Win]::Cls($ip) -ne 'Chrome_WidgetWin_1') { $why = 'class changed' }
  elseif (-not $proc -or $proc.ProcessName -ne 'chrome') { $why = 'not owned by chrome.exe' }
  elseif ([int]$wpid -ne $want) { $why = "owner pid $wpid, recorded $want" }
  elseif ((Format-S9Title ([S9Win]::Text($ip))) -eq '<other window>') { $why = 'title not one of the wave''s own' }
  if ($why) { Say9 "window $h is alive but not taken as the driver's ($why) - not touched"; return $false }
  $true
}

# Armed, JavaScript on, empty list - the found state block 8's guard verified ($global:S9Found.Default); read back
# from a fresh options page (stored), from daemon.status, and from the toolbar title.
function Restore-S9Safety([string]$Row = 'SAFE-11-end') {
  $f = $global:S9Found
  if (-not $f) { Say9 'RESTORE safety: nothing to restore (no found state was read, so no toggle ran)'; return $true }
  if (-not $f.Default) { Say9 'RESTORE safety: not touched (the found state was not the default, so the wave stopped before any toggle)'; return $true }
  if ($global:S9ChromeStart -and (Get-S9ChromeStart) -ne $global:S9ChromeStart) {
    Say9 'RESTORE safety: NOT attempted - Chrome restarted since block 1 (a restart needs a fresh grant); the state as last read stands in the record'
    return $false
  }
  $o = $global:O
  try {
    if (-not (Test-S9Live $o)) { $o = Open-S9ChromePage $S9OptionsUrl; $global:O = $o; Say9 "RESTORE safety: options page reopened in window $o" }
    $s = Read-S9StoredState $o -PassThru
    Start-Sleep -Milliseconds 1500   # margin after any disarm (#144 is the toolbar's rule; the options switch writes directly)
    [void](Set-S9Switch $o -Which armed -On $true)
    [void](Set-S9Switch $o -Which evaluate -On $true)
    if ($s.sha256 -ne $S9EmptySha) { [void](Set-S9BlockList $o -Lines @()) } else { Say9 'RESTORE safety: the stored list is already empty - not saved again' }
  } catch { Say9 "RESTORE safety: a step threw: $($_.Exception.Message)" }
  $ok = $false
  try {
    $r = Read-S9StoredState $o -PassThru
    $d = Test-S9DaemonSafety $true $true 0 $Row 5000
    $page = ($r.armed -eq $true) -and ($r.evaluate -eq $true) -and ($r.count -eq '0') -and ($r.lines -eq 0) -and ($r.sha256 -eq $S9EmptySha) -and ($r.status -eq $f.State.status)
    $title = $true
    if (Test-S9Live $global:W) { $n = Get-S9ActionTitle $global:W; $title = ($n -eq $S9TitleArmed) -or ("$n".StartsWith($S9TitleArmed)) }
    else { Say9 'RESTORE safety: W is gone - the title is not read (record)' }
    # Prep fixer r1 (F7/F8, S1.4): the block-list hashes are compared here and only the result is printed - the
    # sha256 of a non-empty list never is (the empty text's may be, on the STATE lines).
    $shaEq = if ($r.sha256 -eq $f.State.sha256) { 'equal' } else { 'DIFFERENT' }
    $ok = $page -and $d -and $title -and ($shaEq -eq 'equal')
    Say9 "RESTORE safety read-back: stored page equal $("$page".ToLower()), daemon.status equal $("$d".ToLower()), title armed $("$title".ToLower()), block-list sha256 vs found $shaEq"
  } catch { Say9 "RESTORE safety: the read-back threw: $($_.Exception.Message)" }
  $ok
}

# The pin state found (block 9), W's keyboard layout at block 4, then the driver windows D, O, E, W closed and the
# Chrome window count back to $WinStart.
function Restore-S9Desk {
  $ok = $true
  $any = @($global:W, $global:O, $global:E | Where-Object { Test-S9Live $_ })
  if ($global:PinnedBefore -eq $false) {
    if ($any.Count) {
      try { if (Get-S9PinState $any[0]) { if (-not (Set-S9Pin $any[0] -Unpin)) { $ok = $false; Say9 'RESTORE desk: unpin FAILED' } } }
      catch { $ok = $false; Say9 "RESTORE desk: unpin threw: $($_.Exception.Message)" }
    } else { $ok = $false; Say9 'RESTORE desk: no driver window left to unpin from (record; the step agent asks)' }
  }
  if ($global:L0 -and (Test-S9Live $global:W)) {
    try { Restore-S9Layout $global:W $global:L0; if ((Get-S9Layout $global:W) -ne $global:L0) { $ok = $false } }
    catch { $ok = $false; Say9 "RESTORE desk: layout threw: $($_.Exception.Message)" }
  }
  foreach ($n in 'D', 'O', 'E', 'W') {
    $h = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue
    if (Test-S9Live $h) { Close-S9Window $h; if (Test-S9Live $h) { $ok = $false } }
  }
  if ($null -ne $global:WinStart) {
    # Round 3, ruling (c): W is closed by now, so Park-S9Cursor skips; the count is of titled windows (a tooltip or
    # hover card has no title), recorded as listed in the sheet.
    Park-S9Cursor 'before the window-count guard'
    $now = @(Get-S9ChromeWindows).Count
    Say9 "RESTORE desk: Chrome windows now $now (found $($global:WinStart))"
    if ($now -ne $global:WinStart) { $ok = $false }
  }
  $ok
}

function Restore-S9All([string]$Why = 'stop', [string]$Row = 'SAFE-11-end') {
  Say9 "RESTORE begins ($Why)"
  $s = Restore-S9Safety $Row
  $k = Restore-S9Desk
  if ($s -and $k) { Say9 'RESTORE ok: safety state, pin, layout and windows as found' }
  else {
    Say9 "RESTORE FAILED (safety $("$s".ToLower()), desk $("$k".ToLower())) - STOP: record the last STATE line; the step agent asks the user (G9-1)"
    Stop9 "RESTORE FAILED (safety $("$s".ToLower()), desk $("$k".ToLower())): nothing more is pressed in Chrome; the step agent asks the user"
  }
  $s -and $k
}

# ------------------------------------------------------------------- section 1 item 8 helpers (copied verbatim)

$log = "$HOME\.chrome-agent-bridge\daemon.log"
function Get-BridgeLog([int]$n = 10) { Get-Content $log -Tail $n -Encoding UTF8 }
function Get-BridgeDaemon { Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'daemon[\\/]dist[\\/]index\.js' } | Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine }
# Prep fixer r2 (R2-2): bridge MCP processes (node running mcp/dist/index.js) - another session's MCP would join the
# wave's daemon as a client (it retries every 5 s) and keep `s9.ts wait-alone` from reaching 1. Prints count + PIDs.
function Get-BridgeClients {
  $m = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'mcp[\\/]dist[\\/]index\.js' })
  Say9 "bridge MCP processes: $($m.Count)$(if ($m.Count) { ' (PIDs ' + (($m | ForEach-Object { $_.ProcessId }) -join ', ') + ')' })"
  $m.Count
}
function Get-DriverChain { $ids = @(); $p = $PID; for ($i = 0; $p -and $i -lt 32; $i++) { $ids += $p; $p = (Get-CimInstance Win32_Process -Filter "ProcessId=$p").ParentProcessId }; $ids }
function Get-ProcTree([int]$Root) { $all = @(Get-CimInstance Win32_Process); $ids = @($Root); $i = 0; while ($i -lt $ids.Count) { $c = $ids[$i]; $ids += @($all | Where-Object { $_.ParentProcessId -eq $c -and $ids -notcontains $_.ProcessId } | ForEach-Object { $_.ProcessId }); $i++ }; $ids }
function Test-SafeToKill([int]$Root) { $chain = Get-DriverChain; $hit = @(Get-ProcTree $Root | Where-Object { $chain -contains $_ }); if ($hit.Count) { "UNSAFE: the tree of $Root contains driver PID(s) $($hit -join ', ')" } else { "safe: the tree of $Root does not contain the driver" } }

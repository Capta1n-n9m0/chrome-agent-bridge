# recipes/bgf-quit.ps1: quit the user's Chrome GRACEFULLY (session saved) by typing chrome://quit into
# the address bar of a window this script opens itself (Windows PowerShell 5.1). Written 2026-10-23,
# stage BG-FLAGS (decisions.md 2026-10-23 #64 (2)). Window handling copied from
# recipes/reload-extension.ps1 (RELOAD-AUTO).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-quit.ps1 [-WaitSec 60]
#
#   1. Opens ONE new Chrome window of its own (chrome.exe --new-window about:blank).
#   2. Checks its address bar reads about:blank (else it is not surely its own: nothing typed, exit 2).
#   3. Sets the address bar to chrome://quit (UIA ValuePattern) and sends ONE Enter key, only while that
#      window is the foreground window and its address bar has the keyboard focus (else exit 2, its
#      window closed). chrome://quit is Chrome's own "Exit": every window closes, the session is saved.
#   4. Waits up to -WaitSec for no chrome.exe process to remain. It NEVER kills chrome.exe: if Chrome
#      is still running at the deadline it exits 3 and the driver stops.
#
# Prints no title or URL of any window. Exit codes: 0 Chrome exited; 2 nothing typed or sent (a
# precondition or doubt); 3 Enter sent but chrome.exe still running at the deadline; 1 script error.
param([int]$WaitSec = 60, [int]$TimeoutSec = 15)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
if (-not ('QuitWin' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class QuitWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  public static string Cls(IntPtr h) { var s = new StringBuilder(256); GetClassName(h, s, 256); return s.ToString(); }
  public static string Text(IntPtr h) { var s = new StringBuilder(512); GetWindowText(h, s, 512); return s.ToString(); }
}
'@
}
function Say([string]$m) { Write-Output ('{0:yyyy-MM-ddTHH:mm:ss.fffZ} bgf-quit: {1}' -f [DateTime]::UtcNow, $m) }
$UIA = [Windows.Automation.AutomationElement]

function Get-ChromeWindows {
  $chromePids = @(Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
  $found = New-Object System.Collections.ArrayList
  $cb = [QuitWin+EnumProc]{ param($h, $l)
    if ([QuitWin]::IsWindowVisible($h) -and [QuitWin]::Cls($h) -eq 'Chrome_WidgetWin_1') {
      $wpid = [uint32]0; [void][QuitWin]::GetWindowThreadProcessId($h, [ref]$wpid)
      if ($chromePids -contains $wpid -and [QuitWin]::Text($h)) { [void]$found.Add([long]$h) }
    }
    $true }
  [void][QuitWin]::EnumWindows($cb, [IntPtr]::Zero)
  ,@($found)
}

$chrome = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
if (-not $chrome -or -not (Test-Path $chrome)) { Say 'chrome.exe not found - nothing sent'; exit 2 }
if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Say 'Chrome is not running - nothing to quit'; exit 2 }

$before = Get-ChromeWindows
Start-Process -FilePath $chrome -ArgumentList '--new-window', 'about:blank'
$t0 = Get-Date; $new = @()
do { Start-Sleep -Milliseconds 300; $now = Get-ChromeWindows; $new = @($now | Where-Object { $before -notcontains $_ }) } until ($new.Count -ge 1 -or ((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec)
if ($new.Count -ne 1) { Say "expected exactly 1 new Chrome window, found $($new.Count) - none is touched - nothing sent"; exit 2 }
$H = [long]$new[0]
Say "own window $H opened"

function Close-Own([string]$why) {
  [void][QuitWin]::PostMessage([IntPtr]$H, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
  Say "$why - nothing sent; own window $H closed (WM_CLOSE)"
}

$root = $UIA::FromHandle([IntPtr]$H)
$c = New-Object Windows.Automation.PropertyCondition($UIA::ClassNameProperty, 'OmniboxViewViews')
$omni = $null; $t0 = Get-Date
while (-not $omni -and ((Get-Date) - $t0).TotalSeconds -lt $TimeoutSec) { $omni = $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $c); if (-not $omni) { Start-Sleep -Milliseconds 300 } }
if (-not $omni) { Say "no address bar in the new window $H - not surely mine: nothing typed, sent or closed"; exit 2 }
$u0 = ''; $t0 = Get-Date
do { $u0 = $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value; if ($u0 -ne 'about:blank') { Start-Sleep -Milliseconds 200 } } until ($u0 -eq 'about:blank' -or ((Get-Date) - $t0).TotalSeconds -gt 5)
if ($u0 -ne 'about:blank') { Say "the new window $H is not on about:blank - not surely mine: nothing typed, sent or closed"; exit 2 }
if (([long][QuitWin]::GetForegroundWindow()) -ne $H) {
  [QuitWin]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [QuitWin]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
  [void][QuitWin]::SetForegroundWindow([IntPtr]$H); Start-Sleep -Milliseconds 300
}
$omni.SetFocus()
$omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).SetValue('chrome://quit')
Start-Sleep -Milliseconds 300
$focused = $UIA::FocusedElement
$fg = [long][QuitWin]::GetForegroundWindow()
$val = $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value
if ($fg -ne $H -or -not $focused -or -not [Windows.Automation.Automation]::Compare($focused, $omni) -or $val -ne 'chrome://quit') {
  Close-Own 'my window or its address bar does not have the keyboard focus, or the address bar does not read chrome://quit'
  exit 2
}
[QuitWin]::keybd_event(0x0D, 0, 0, [UIntPtr]::Zero); [QuitWin]::keybd_event(0x0D, 0, 2, [UIntPtr]::Zero)  # Enter
$sent = [DateTime]::UtcNow
Say 'sent Enter on chrome://quit in my own window'
$t0 = Get-Date; $n = -1
do { Start-Sleep -Milliseconds 500; $n = @(Get-Process chrome -ErrorAction SilentlyContinue).Count } until ($n -eq 0 -or ((Get-Date) - $t0).TotalSeconds -gt $WaitSec)
$waited = ([DateTime]::UtcNow - $sent).TotalSeconds
if ($n -ne 0) { Say ("CHROME STILL RUNNING - {0} chrome.exe process(es) after {1:N1} s; nothing killed (the driver stops here)" -f $n, $waited); exit 3 }
Say ("QUIT OK - no chrome.exe process remains, {0:N1} s after the Enter" -f $waited)
exit 0

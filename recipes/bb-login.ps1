# recipes/bb-login.ps1: SDK-6/SDK-7's login step on https://ada.blackboard.com (Windows PowerShell 5.1).
# Written 2026-10-23 by the Step 8 S6 fixer (round 1), before any live run, under the user's grant
# (decisions.md 2026-10-23 #96: "my credentials should be autofilled, feel free to use them"). Window
# handling copied from recipes/bgf-quit.ps1 (BG-FLAGS). Not run before the wave.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1 [-SettleSec 20]
#
#   1. Opens ONE new Chrome window of its own on https://ada.blackboard.com/ (exactly one new window,
#      else nothing is touched: exit 2).
#   2. Waits until its address bar stops changing (redirects done), at most -SettleSec.
#   3. Looks, by UI Automation, for Button controls named exactly "Sign in" / "Sign In" / "Log in" /
#      "Log In" / "Login" in that window, and whether the address bar's host is ada.blackboard.com.
#      It prints COUNTS and yes/no only: never a title, a URL, a field, a label or a value. It never
#      reads an Edit control, never types, never takes a screenshot or a snapshot, never evaluates.
#   4. No sign-in button and on ada -> logged in: exit 0, its window closed.
#      Exactly one sign-in button -> Chrome's autofill has filled the form (or not; it cannot tell and
#      does not look): it invokes that one button ONCE (the submit), waits, looks again. No sign-in
#      button and on ada -> exit 0, window closed. Anything else -> exit 4.
#      Zero buttons off ada (an SSO page, a picker, MFA), two or more buttons -> exit 4, nothing pressed.
#   Exit 4 = "waits for the user": the row is recorded so, the window is LEFT OPEN for the user, and
#   nothing is retried or typed. The recipes' own course lookup (HTTP 200 vs 401) is the judge of the
#   login; this script's exit 0 only lets the driver go on to it.
#
# Exit codes: 0 logged in (as far as it can tell without reading the page); 2 nothing touched (a
# precondition or doubt); 4 waits for the user; 1 script error.
param([int]$SettleSec = 20, [int]$TimeoutSec = 15)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
if (-not ('LoginWin' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class LoginWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
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
function Say([string]$m) { Write-Output ('{0:yyyy-MM-ddTHH:mm:ss.fffZ} bb-login: {1}' -f [DateTime]::UtcNow, $m) }
$UIA = [Windows.Automation.AutomationElement]

function Get-ChromeWindows {
  $chromePids = @(Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
  $found = New-Object System.Collections.ArrayList
  $cb = [LoginWin+EnumProc]{ param($h, $l)
    if ([LoginWin]::IsWindowVisible($h) -and [LoginWin]::Cls($h) -eq 'Chrome_WidgetWin_1') {
      $wpid = [uint32]0; [void][LoginWin]::GetWindowThreadProcessId($h, [ref]$wpid)
      if ($chromePids -contains $wpid -and [LoginWin]::Text($h)) { [void]$found.Add([long]$h) }
    }
    $true }
  [void][LoginWin]::EnumWindows($cb, [IntPtr]::Zero)
  ,@($found)
}

$chrome = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
if (-not $chrome -or -not (Test-Path $chrome)) { Say 'chrome.exe not found - nothing touched'; exit 2 }
if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Say 'Chrome is not running - nothing touched'; exit 2 }

$before = Get-ChromeWindows
Start-Process -FilePath $chrome -ArgumentList '--new-window', 'https://ada.blackboard.com/'
$t0 = Get-Date; $new = @()
do { Start-Sleep -Milliseconds 300; $now = Get-ChromeWindows; $new = @($now | Where-Object { $before -notcontains $_ }) } until ($new.Count -ge 1 -or ((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec)
if ($new.Count -ne 1) { Say "expected exactly 1 new Chrome window, found $($new.Count) - none is touched"; exit 2 }
$H = [long]$new[0]
Say "own window $H opened"
$root = $UIA::FromHandle([IntPtr]$H)
$omniCond = New-Object Windows.Automation.PropertyCondition($UIA::ClassNameProperty, 'OmniboxViewViews')
$omni = $null; $t0 = Get-Date
while (-not $omni -and ((Get-Date) - $t0).TotalSeconds -lt $TimeoutSec) { $omni = $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $omniCond); if (-not $omni) { Start-Sleep -Milliseconds 300 } }
if (-not $omni) { Say "no address bar in window $H - nothing pressed (window left open)"; exit 2 }

# The address bar's value is compared in memory, never printed.
function Get-Addr { try { $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value } catch { '' } }
function Test-OnAda([string]$a) {
  $s = $a; if ($s -notmatch '^[a-z]+://') { $s = 'https://' + $s }
  try { ([Uri]$s).Host -eq 'ada.blackboard.com' } catch { $false }
}
function Wait-Settled {
  $last = Get-Addr; $stable = Get-Date; $t = Get-Date
  while (((Get-Date) - $t).TotalSeconds -lt $SettleSec) {
    Start-Sleep -Milliseconds 500
    $a = Get-Addr
    if ($a -ne $last) { $last = $a; $stable = Get-Date }
    elseif (((Get-Date) - $stable).TotalSeconds -ge 4) { break }
  }
}
$btnCond = New-Object Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Button)
function Get-SignInButtons {
  @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $btnCond) | Where-Object { $_.Current.Name -cmatch '^(Sign in|Sign In|Log in|Log In|Login)$' })
}

Wait-Settled
$onAda = Test-OnAda (Get-Addr)
$btns = Get-SignInButtons
Say ("after load: on ada.blackboard.com: {0}; sign-in buttons: {1}" -f $(if ($onAda) { 'yes' } else { 'no' }), $btns.Count)
if ($btns.Count -eq 0 -and $onAda) {
  [void][LoginWin]::PostMessage([IntPtr]$H, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
  Say "LOGGED IN - no sign-in control; own window $H closed"; exit 0
}
if ($btns.Count -ne 1) {
  Say "WAITS FOR THE USER - not a single sign-in button (SSO, a picker, MFA or an unknown page); nothing pressed; window $H left open"; exit 4
}
if (([long][LoginWin]::GetForegroundWindow()) -ne $H) {
  [LoginWin]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [LoginWin]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
  [void][LoginWin]::SetForegroundWindow([IntPtr]$H); Start-Sleep -Milliseconds 300
}
if (([long][LoginWin]::GetForegroundWindow()) -ne $H) { Say "my window is not in front - nothing pressed; window $H left open"; exit 2 }
$pat = $null
if (-not $btns[0].TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$pat)) { Say "the sign-in button has no Invoke pattern - nothing pressed; window $H left open"; exit 4 }
$pat.Invoke()
Say 'invoked the one sign-in button once (the autofilled form submitted; nothing typed, nothing read)'
Start-Sleep -Seconds 3
Wait-Settled
$onAda = Test-OnAda (Get-Addr)
$btns = Get-SignInButtons
Say ("after submit: on ada.blackboard.com: {0}; sign-in buttons: {1}" -f $(if ($onAda) { 'yes' } else { 'no' }), $btns.Count)
if ($btns.Count -eq 0 -and $onAda) {
  [void][LoginWin]::PostMessage([IntPtr]$H, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
  Say "SIGNED IN - autofill + one submit; own window $H closed"; exit 0
}
Say "WAITS FOR THE USER - the submit did not end on ada without a sign-in control (empty autofill, MFA, a picker or an error); no retry; window $H left open"
exit 4

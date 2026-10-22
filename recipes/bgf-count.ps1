# recipes/bgf-count.ps1: count Chrome's browser windows and their tabs, printing COUNTS ONLY (never a
# title or URL). Written 2026-10-23, stage BG-FLAGS (decisions.md 2026-10-23 #64), for the session-
# restore check around a Chrome restart. Windows PowerShell 5.1; read-only (UI Automation finds, never
# invokes; no window is activated).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-count.ps1
#
# A browser window = a visible top-level window of class Chrome_WidgetWin_1 owned by a chrome.exe
# process whose title ends in " - Google Chrome". Its tabs = the UIA elements of ControlType TabItem
# AND ClassName "Tab" in that window (Chrome's tab strip). Set-up fix 2026-10-23 (prereg verifier, MAJOR
# 1): ControlType TabItem alone also matched a page's role="tab" elements (ClassName empty), measured: the
# user's window read 2 TabItems = 1 "Tab" + 1 web element. Also counts chrome.exe processes and the browser process(es)
# (no --type= on the command line) and prints the browser process's switches (names only, values cut).
# "blank windows" = browser windows titled exactly "about:blank - Google Chrome" with exactly 1 tab: the
# window bgf-quit.ps1 opens is saved in the session and comes back after the restore.
#   -CloseBlank -Expect <N>   closes the blank window (WM_CLOSE, as the title-bar X) ONLY when exactly
#                 one exists AND there are exactly N + 1 browser windows; otherwise it closes nothing
#                 and says so. Then prints the counts again.
param([switch]$CloseBlank, [int]$Expect = -1)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
if (-not ('BgfWin' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class BgfWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  public static string Cls(IntPtr h) { var s = new StringBuilder(256); GetClassName(h, s, 256); return s.ToString(); }
  public static string Text(IntPtr h) { var s = new StringBuilder(512); GetWindowText(h, s, 512); return s.ToString(); }
}
'@
}
function Get-Counts {
  $procs = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'")
  $chromePids = @($procs | ForEach-Object { [uint32]$_.ProcessId })
  $wins = New-Object System.Collections.ArrayList
  $cb = [BgfWin+EnumProc]{ param($h, $l)
    if ([BgfWin]::IsWindowVisible($h) -and [BgfWin]::Cls($h) -eq 'Chrome_WidgetWin_1') {
      $wpid = [uint32]0; [void][BgfWin]::GetWindowThreadProcessId($h, [ref]$wpid)
      if ($chromePids -contains $wpid -and [BgfWin]::Text($h) -match ' - Google Chrome$') { [void]$wins.Add([long]$h) }
    }
    $true }
  [void][BgfWin]::EnumWindows($cb, [IntPtr]::Zero)
  $tabCond = New-Object Windows.Automation.AndCondition(
    (New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty, [Windows.Automation.ControlType]::TabItem)),
    (New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ClassNameProperty, 'Tab')))
  $per = @(); $total = 0; $min = 0; $blank = @()
  foreach ($h in $wins) {
    $root = [Windows.Automation.AutomationElement]::FromHandle([IntPtr]$h)
    $n = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $tabCond)).Count
    if ([BgfWin]::IsIconic([IntPtr]$h)) { $min++ }
    if ($n -eq 1 -and [BgfWin]::Text([IntPtr]$h) -eq 'about:blank - Google Chrome') { $blank += $h }
    $per += $n; $total += $n
  }
  $browser = @($procs | Where-Object { $_.CommandLine -notmatch '--type=' })
  $sw = @($browser | ForEach-Object { ([regex]::Matches($_.CommandLine, '(?<= )--[a-z0-9-]+') | ForEach-Object { $_.Value }) -join ' ' })
  Write-Output ('{0:yyyy-MM-ddTHH:mm:ss.fffZ} bgf-count: chrome.exe processes {1}; browser processes {2}; browser windows {3} (minimized {4}); tabs {5} (per window, sorted: {6}); blank windows {7}; browser switches: [{8}]' -f [DateTime]::UtcNow, $procs.Count, $browser.Count, $wins.Count, $min, $total, ((@($per | Sort-Object)) -join ','), $blank.Count, ($sw -join '] ['))
  $script:blank = $blank
  $script:nwin = $wins.Count
}
Get-Counts
if ($CloseBlank) {
  if ($Expect -lt 0) { Write-Output "bgf-count: -CloseBlank needs -Expect <N> - nothing closed" }
  elseif ($script:blank.Count -ne 1 -or $script:nwin -ne $Expect + 1) { Write-Output "bgf-count: -CloseBlank: $($script:blank.Count) blank windows, $($script:nwin) browser windows (need exactly 1 and $($Expect + 1)) - nothing closed" }
  else {
    $h = [long]$script:blank[0]
    [void][BgfWin]::PostMessage([IntPtr]$h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    $t0 = Get-Date
    while ([BgfWin]::IsWindow([IntPtr]$h) -and ((Get-Date) - $t0).TotalSeconds -lt 5) { Start-Sleep -Milliseconds 200 }
    Write-Output ("bgf-count: -CloseBlank: closed the blank window $h (WM_CLOSE); gone: " + $(if ([BgfWin]::IsWindow([IntPtr]$h)) { 'no' } else { 'yes' }))
    Get-Counts
  }
}

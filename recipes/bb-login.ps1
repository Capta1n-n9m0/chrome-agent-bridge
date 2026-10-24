# recipes/bb-login.ps1: SDK-6/SDK-7's login step on https://ada.blackboard.com (Windows PowerShell 5.1).
# Written 2026-10-23 by the Step 8 S6 fixer (round 1), before any live run, under the user's grant
# (decisions.md 2026-10-23 #96: "my credentials should be autofilled, feel free to use them"). Window
# handling copied from recipes/bgf-quit.ps1 (BG-FLAGS). Not run before the wave.
# Extended 2026-10-23 by S6 builder r3 for ADA's SSO (decisions.md 2026-10-23 #99 (1), the user:
# "ada.blackboard.com ridirects to ada sso, you can login there using my credentials and then it redicrect
# back blackboard"), before S6 Part 3, with a localhost dry run (-DryRunBase). Run 12 Part 2 ended here
# with "after load: on ada.blackboard.com: no; sign-in buttons: 0": the page was the SSO page, and the
# zero may also be Chrome building the page's accessibility tree lazily (a hypothesis: the old script
# scanned once, at once) - the scan is now retried for up to -ScanSec.
#
# Changed 2026-10-25 (Step 10 S5): the wait after the one press (step 6) is a poll on a condition inside one
# -WaitSec bound from the press, because a fixed 3 s sleep + settle + one look read the SSO page ~8 s after
# the press while the login had worked (Run 12; decisions.md 2026-10-23 #102, planned by #129, bound per #209).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1 [-SettleSec 20] [-ScanSec 10] [-WaitSec 90]
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1 -DryRunBase http://127.0.0.1:<port>/ [-DryRunPage bb-standin.html] [-WaitSec 90]
#
#   1. Opens ONE new Chrome window of its own on https://ada.blackboard.com/ (exactly one new window,
#      else nothing is touched: exit 2).
#   2. Waits until its address bar stops changing (redirects done), at most -SettleSec.
#   3. Scans, by UI Automation, the page's document in that window (retried every second for up to
#      -ScanSec, until two scans agree), and reads the address bar's host IN MEMORY.
#      It prints COUNTS, yes/no and (only for a host on the SSO host allowlist below) a host name: never
#      a title, a URL, a path, a query, a field, a label, a control's name or a value. It never reads a
#      page Edit control's value (the address bar, itself an Edit control, is read in memory only), never
#      types or sends keys into the page, never takes a screenshot or a snapshot, never evaluates.
#   4. On ada.blackboard.com:
#        no sign-in button -> logged in: exit 0, its window closed;
#        exactly one button named Sign in / Log in / Login (any case) -> Blackboard's own form: invoke it
#        ONCE, settle, look again (step 6);
#        two or more -> exit 4, nothing pressed.
#   5. Off ada.blackboard.com on a host on the SSO host allowlist ($SsoExact / $SsoSuffix below: ada.edu.az
#      or a host under it, or exactly login.microsoftonline.com), and not read as http -> the SSO page. Any
#      other host, an empty or unreadable address bar, or a host that does not parse -> exit 4, nothing
#      pressed (printed as `other host` / `address bar unreadable`; the host itself only if allowlisted).
#      It prints whether the host is under
#      ada.edu.az, the host if allowlisted, the counts of Edit and Button controls, and how many buttons
#      have a whole name (any case) on the fixed submit allowlist below - never any other name (an account
#      picker's tiles carry e-mail addresses). Exactly one allowlisted button -> Chrome's autofill has
#      filled the form (or not; the script cannot tell and does not look): it invokes that one button ONCE
#      (the submit) and looks again (step 6). Zero, or two or more -> exit 4, nothing pressed.
#      Off ada on an allowlisted host read as http (an explicit http:// or Chrome's "Not secure" chip) ->
#      exit 4, nothing pressed. The https reading is only a BACKSTOP behind the host allowlist and is
#      UNPROVEN: Chrome shows no chip for localhost (the dry run never sees one), and a non-English Chrome
#      may name the chip differently, so an http page can read "assumed". Its failure direction is "no
#      press" only: it can veto a press the host allowlist allows, never allow one the allowlist refuses.
#   6. After the one press it POLLS (about once a second, single scans, never pressing) until -WaitSec
#      (default 90) after the press; the bound covers every scan and sleep. Any page is tolerated meanwhile
#      (the SSO page, an intermediate host, MFA, a page with a sign-in control). Exit 0, window closed, as soon
#      as the address shows ada.blackboard.com, unchanged for >= 4 s, and two consecutive scans (~1 s apart,
#      both after the last address change) found the document with >= 1 control and no sign-in button. At
#      the bound -> exit 4 whatever the page, window left open, nothing more pressed; the line prints the
#      time from the press, what the last poll saw (counts, yes/no, an allowlisted host only) and the poll
#      count. No scan starts with less than max(5 s, the slowest scan so far) left, and a scan that ends past
#      the bound leads to exit 4, never exit 0: the exit comes at most -WaitSec plus (one scan - 5 s), so <= 95 s
#      with the default whenever one scan takes <= 10 s (a scan is one synchronous UIA call and cannot be cut).
#      An address read or a scan that throws counts as "not scanned"; if the own window is gone -> exit 4 at
#      once, nothing more pressed. AT MOST ONE PRESS in a whole run.
#      *Changed 2026-10-25 (Step 10 S5 fixer r1, verifier F1-F4): was "Worst case: -WaitSec plus one poll
#      step", because a scan started just before the bound ran past it (23.1 s at -WaitSec 20 on an 8 000-button
#      page), a clean scan ending past the bound still exited 0, a vanished window was waited on to the bound and then reported as left open, and the
#      address compare ignored case.*
#      *Changed 2026-10-25 (Step 10 S5): was "sleep 3 s, settle (<= -SettleSec), one stable scan (<= -ScanSec);
#      on ada.blackboard.com with no sign-in button -> exit 0, anything else -> exit 4", because the SSO
#      redirect back can take longer than that (#102) and the old wait had no single bound (stage0-audit F10).*
#   Exit 4 = "waits for the user": the row is recorded so, the window is LEFT OPEN for the user, and
#   nothing is retried or typed. The recipes' own course lookup (HTTP 200 vs 401) is the judge of the
#   login; this script's exit 0 only lets the driver go on to it.
#
# Dry run (-DryRunBase): the start page is <DryRunBase><DryRunPage> (default bb-standin.html, a file of
# recipes/fixtures/); DryRunBase must be http on 127.0.0.1 or localhost (anything else: exit 2, nothing
# opened). Its host stands in for ada.blackboard.com and the OTHER loopback name (127.0.0.1 <-> localhost)
# is the dry run's whole SSO host allowlist, tested by the same Test-SsoHost as the live list; https is
# not required there (the stand-ins are http). Any other host is refused like an unknown live host:
# bb-standin-otherhost.html redirects to sso.localhost (Chrome resolves *.localhost to loopback itself,
# no DNS, so the same 127.0.0.1 server answers) and must end in exit 4 with nothing pressed. Step 10 S5's
# post-press legs (2026-10-25), each submit counted by one request line in the server's log:
# bb-standin-delayed.html (the redirect back arrives 12 s after the submit page loads: exit 0;
# counter /sso-submit-delayed.html), bb-standin-stuck.html (stays on the SSO stand-in: exit 4 at the bound;
# counter /submit-stuck), bb-standin-elsewhere.html (ends on sso.localhost: exit 4 at the bound; counter
# /elsewhere-landing.html). The pages are served by
#   python -I -m http.server <port> --bind 127.0.0.1 --directory recipes/fixtures
#
# Exit codes: 0 logged in (as far as it can tell without reading the page); 2 nothing touched (a
# precondition or doubt); 4 waits for the user; 1 script error.
param([int]$SettleSec = 20, [int]$TimeoutSec = 15, [int]$ScanSec = 10, [string]$DryRunBase = '', [string]$DryRunPage = 'bb-standin.html', [int]$WaitSec = 90)
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
function Say([string]$m) { Write-Output ('{0:yyyy-MM-ddTHH:mm:ss.fffZ} bb-login: {1}' -f [DateTime]::UtcNow, $m) }
function YesNo($b) { if ($b) { 'yes' } else { 'no' } }
$UIA = [Windows.Automation.AutomationElement]
$CT = [Windows.Automation.ControlType]

# ---- target: the live site, or the localhost stand-ins of the dry run --------------------------------
$Dry = $DryRunBase -ne ''
if ($Dry) {
  $base = $null
  try { $base = [Uri]$DryRunBase } catch { $base = $null }
  if (-not $base -or -not $base.IsAbsoluteUri -or $base.Scheme -ne 'http' -or @('127.0.0.1', 'localhost') -notcontains $base.Host) {
    Say 'DRY RUN refused - -DryRunBase must be http://127.0.0.1:<port>/ or http://localhost:<port>/ - nothing opened'; exit 2
  }
  if ($DryRunPage -notmatch '^[a-z0-9-]+\.html$') { Say 'DRY RUN refused - -DryRunPage must be a file name like bb-standin.html - nothing opened'; exit 2 }
  $BbHost = $base.Host
  $SsoStandIn = if ($BbHost -eq '127.0.0.1') { 'localhost' } else { '127.0.0.1' }
  $Start = $base.GetLeftPart([UriPartial]::Authority) + '/' + $DryRunPage
  $BbLabel = "the blackboard stand-in ($BbHost)"
  Say "DRY RUN on the loopback stand-ins: blackboard = $BbHost, SSO = $SsoStandIn (port $($base.Port)); no real site is contacted"
} else {
  $BbHost = 'ada.blackboard.com'
  $SsoStandIn = $null
  $Start = 'https://ada.blackboard.com/'
  $BbLabel = 'ada.blackboard.com'
}

# Blackboard's own sign-in button names (the pre-SSO rule, kept; now any case).
$BbSignIn = @('sign in', 'log in', 'login')
# The SSO submit allowlist: whole name, any case. English; Azerbaijani "daxil ol" (sign in), "giris"
# (login, with s-cedilla), "novbeti" (next, with o-umlaut and schwa), "davam et" (continue); Russian
# "voyti" (sign in), "vkhod" (login), "dalee" (next), "prodolzhit" (continue) - the words Microsoft's and
# ADA's sign-in pages use in the az and ru locales. Non-ASCII letters are built from code points so this
# file stays ASCII (Windows PowerShell 5.1 reads a BOM-less script as ANSI).
function U([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }
$Allow = @('sign in', 'log in', 'login', 'log on', 'next', 'submit', 'continue', 'daxil ol', 'davam et',
  (U 0x67,0x69,0x72,0x69,0x15F),                         # giris
  (U 0x6E,0xF6,0x76,0x62,0x259,0x74,0x69),               # novbeti
  (U 0x432,0x43E,0x439,0x442,0x438),                     # voyti
  (U 0x432,0x445,0x43E,0x434),                           # vkhod
  (U 0x434,0x430,0x43B,0x435,0x435),                     # dalee
  (U 0x43F,0x440,0x43E,0x434,0x43E,0x43B,0x436,0x438,0x442,0x44C))  # prodolzhit
# The SSO HOST ALLOWLIST - the one place it is written (S6 fixer r3, F1). Live: ada.edu.az or any host
# under it (suffix .ada.edu.az), or exactly login.microsoftonline.com. A press on the SSO path needs the
# post-redirect host on this list; only a host on it is ever printed (any other prints as "other host").
$SsoExact = @('ada.edu.az', 'login.microsoftonline.com')
$SsoSuffix = @('.ada.edu.az')
function Test-SsoHost([string]$h, [string[]]$exact, [string[]]$suffix) {
  if (-not $h) { return $false }
  if ($exact -contains $h) { return $true }
  foreach ($x in $suffix) { if ($h.EndsWith($x) -and $h.Length -gt $x.Length) { return $true } }
  $false
}
# Dry run: the whole allowlist is the other loopback name (no suffix rule), tested by the same function.
if ($Dry) { $SsoExact = @($SsoStandIn); $SsoSuffix = @() }

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
Start-Process -FilePath $chrome -ArgumentList '--new-window', $Start
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

# The address bar's value is parsed in memory, never printed.
function Get-Addr { try { $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value } catch { '' } }
function Get-Where([string]$a) {
  # Chrome hides the scheme in the address bar for http and https alike, so "https" is read from an
  # explicit scheme, else from the absence of Chrome's "Not secure" chip outside the page.
  $shown = $a -match '^[a-z][a-z0-9+.-]*://'
  $s = $a; if (-not $shown) { $s = 'https://' + $s }
  $u = $null; try { $u = [Uri]$s } catch { $u = $null }
  $h = if ($u -and $u.IsAbsoluteUri) { $u.Host.ToLowerInvariant() } else { '' }
  $https = 'no'
  if ($shown) { if ($u -and $u.Scheme -eq 'https') { $https = 'yes' } }
  elseif (Test-NotSecureChip) { $https = 'no (Not secure chip)' }
  else { $https = 'assumed (scheme hidden, no Not secure chip)' }
  [pscustomobject]@{ Host = $h; Https = $https; SchemeShown = $shown; AddrRead = [bool]$a }
}
$notSecureCond = New-Object Windows.Automation.PropertyCondition($UIA::NameProperty, 'Not secure')
function Test-NotSecureChip {
  $hits = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $notSecureCond))
  $doc = Get-Doc
  foreach ($e in $hits) { if (-not $doc -or -not (Test-Inside $e $doc)) { return $true } }
  $false
}
$docCond = New-Object Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Document)
function Get-Doc { $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $docCond) }
$walker = [Windows.Automation.TreeWalker]::ControlViewWalker
function Test-Inside($e, $anc) {
  $p = $e
  for ($i = 0; $p -and $i -lt 64; $i++) { if ([Windows.Automation.Automation]::Compare($p, $anc)) { return $true }; $p = $walker.GetParent($p) }
  $false
}
$btnCond = New-Object Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Button)
$editCond = New-Object Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Edit)
function Norm([string]$n) { if ($n) { ($n.Trim() -replace '\s+', ' ').ToLowerInvariant() } else { '' } }
# One scan of the page's document: counts and the matching buttons, names compared in memory only.
function Get-Scan([string[]]$names) {
  $doc = Get-Doc
  if (-not $doc) { return [pscustomobject]@{ Doc = $false; Edits = 0; Buttons = 0; Match = @() } }
  $edits = @($doc.FindAll([Windows.Automation.TreeScope]::Descendants, $editCond))
  $btns = @($doc.FindAll([Windows.Automation.TreeScope]::Descendants, $btnCond))
  $match = @($btns | Where-Object { $names -contains (Norm $_.Current.Name) })
  [pscustomobject]@{ Doc = $true; Edits = $edits.Count; Buttons = $btns.Count; Match = $match }
}
# Retried every second for up to -ScanSec: Chrome builds a page's accessibility tree lazily, so the first
# scan can see nothing. Ends early when two scans in a row agree and found a control.
function Get-StableScan([string[]]$names) {
  $t = Get-Date; $last = $null; $n = 0
  while ($true) {
    $s = Get-Scan $names; $n++
    if ($last -and $s.Doc -and ($s.Edits + $s.Buttons) -gt 0 -and $s.Edits -eq $last.Edits -and $s.Buttons -eq $last.Buttons -and $s.Match.Count -eq $last.Match.Count) { break }
    if (((Get-Date) - $t).TotalSeconds -ge $ScanSec) { break }
    $last = $s; Start-Sleep -Seconds 1
  }
  $s | Add-Member -NotePropertyName Scans -NotePropertyValue $n -PassThru
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
function Close-Own { [void][LoginWin]::PostMessage([IntPtr]$H, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }

$script:Pressed = 0
$script:InvokeOk = $false
# Invokes $btn ONCE in the whole run and sets $script:InvokeOk; called as a statement, never inside an `if`
# (a function's output is its return value in PowerShell, so a `Say` inside a tested call was swallowed - the
# known-good dry run printed no "invoked" line; fixed 2026-10-23 by S6 builder r3 after that run).
function Invoke-Once($btn, [string]$what) {
  if ($script:Pressed -ne 0) { Say "a second press was asked for - refused; nothing more pressed; window $H left open"; $script:InvokeOk = $false; return }
  if (([long][LoginWin]::GetForegroundWindow()) -ne $H) {
    # One Alt tap (no character) lets SetForegroundWindow take effect; it reaches whatever window is in front,
    # possibly the user's (verifier r3 N2: known, harmless, not a key into any page; left as it was).
    [LoginWin]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [LoginWin]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [void][LoginWin]::SetForegroundWindow([IntPtr]$H); Start-Sleep -Milliseconds 300
  }
  if (([long][LoginWin]::GetForegroundWindow()) -ne $H) { Say "my window is not in front - nothing pressed; window $H left open"; exit 2 }
  $pat = $null
  if (-not $btn.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$pat)) { Say "the $what has no Invoke pattern - nothing pressed; window $H left open"; exit 4 }
  $script:Pressed = 1
  $script:PressSw = [Diagnostics.Stopwatch]::StartNew()   # the press instant: -WaitSec runs from here
  $pat.Invoke()
  $script:InvokeOk = $true
  Say "invoked the one $what once (the autofilled form submitted; nothing typed, nothing read)"
}
# The address bar's host only (no "Not secure" chip lookup, which walks the whole window): the post-press
# poll needs nothing else. Parsed in memory, never printed unless allowlisted (Show-Host).
function Get-AddrHost([string]$a) {
  $s = $a; if ($a -notmatch '^[a-z][a-z0-9+.-]*://') { $s = 'https://' + $a }
  $u = $null; try { $u = [Uri]$s } catch { $u = $null }
  if ($a -and $u -and $u.IsAbsoluteUri) { $u.Host.ToLowerInvariant() } else { '' }
}
# What may be printed of a host: the blackboard host, an SSO-allowlisted host, else a fixed phrase.
function Show-Host([string]$a, [string]$hn) {
  if (-not $a) { 'address bar unreadable' }
  elseif ($hn -eq $BbHost) { $BbHost }
  elseif (Test-SsoHost $hn $SsoExact $SsoSuffix) { if ($Dry) { "stand-in SSO host ($hn)" } else { $hn } }
  else { 'other host' }
}
function Sec([long]$ms) { ($ms / 1000.0).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture) + ' s' }
# After the one press (changed 2026-10-25, Step 10 S5; see the header): poll, never press again, inside ONE
# deadline of -WaitSec from the press that covers every scan and sleep. Exit 0 as soon as the address shows the
# blackboard host, unchanged for >= 4 s, and two consecutive single scans (~1 s apart, both after the last
# address change) found the document with >= 1 control and no sign-in control. Any page is tolerated while
# polling (the SSO page, an intermediate host, a page with a sign-in control). At the deadline: exit 4, whatever
# the page, window left open. PowerShell names are case-insensitive: a local $h here would hide the window
# handle $H from Close-Own (it did, in this stage's first dry run: exit 1), hence $hn.
# Bound by construction (fixer r1, F1/F2): no scan STARTS with less than max(5 s, the slowest scan so far) left,
# and after every scan the deadline is checked again before exit 0 (past it -> the exit-4 path). A scan or an
# address read that throws is "not scanned" for that poll (F3); the own window gone -> exit 4 at once.
function Test-OwnWindow { [LoginWin]::IsWindow([IntPtr]$H) -and [LoginWin]::Cls([IntPtr]$H) -eq 'Chrome_WidgetWin_1' }
function Exit-WindowGone($sw, [int]$polls, [int]$scans) {
  Say ("after submit: own window {0} is gone (closed outside the script) at {1} from the press (polls: {2}; scans: {3})" -f $H, (Sec $sw.ElapsedMilliseconds), $polls, $scans)
  Say "WAITS FOR THE USER - the own window is gone; nothing more pressed"
  exit 4
}
function Finish-AfterPress([string]$kind) {
  $sw = $script:PressSw
  $deadline = [long]$WaitSec * 1000
  $slack = 5000L
  $polls = 0; $clean = 0; $lastAddr = $null; $since = 0L; $worstScan = 0L; $scans = 0; $skipped = 0
  $seen = [pscustomobject]@{ Addr = ''; Host = ''; Scanned = $false; Why = 'off the blackboard host'; Doc = $false; Controls = 0; SignIn = 0 }
  while ($sw.ElapsedMilliseconds -lt $deadline) {
    $polls++
    if (-not (Test-OwnWindow)) { Exit-WindowGone $sw $polls $scans }
    $a = ''
    try { $a = [string](Get-Addr) } catch { $a = '' }
    if ($a -cne $lastAddr) { $lastAddr = $a; $since = $sw.ElapsedMilliseconds; $clean = 0 }
    $hn = Get-AddrHost $a
    $seen = [pscustomobject]@{ Addr = $a; Host = $hn; Scanned = $false; Why = 'off the blackboard host'; Doc = $false; Controls = 0; SignIn = 0 }
    $margin = [Math]::Max($slack, $worstScan)
    if ($a -and $hn -eq $BbHost -and ($deadline - $sw.ElapsedMilliseconds) -lt $margin) {
      $skipped++; $clean = 0
      $seen = [pscustomobject]@{ Addr = $a; Host = $hn; Scanned = $false; Why = ('less than {0} left before the bound' -f (Sec $margin)); Doc = $false; Controls = 0; SignIn = 0 }
    } elseif ($a -and $hn -eq $BbHost) {
      $t = $sw.ElapsedMilliseconds
      $s = $null
      try { $s = Get-Scan $BbSignIn } catch { $s = $null }
      $scans++; $dt = $sw.ElapsedMilliseconds - $t; if ($dt -gt $worstScan) { $worstScan = $dt }
      if (-not $s) {
        $clean = 0
        if (-not (Test-OwnWindow)) { Exit-WindowGone $sw $polls $scans }
        $seen = [pscustomobject]@{ Addr = $a; Host = $hn; Scanned = $false; Why = 'the scan failed'; Doc = $false; Controls = 0; SignIn = 0 }
      } else {
        $seen = [pscustomobject]@{ Addr = $a; Host = $hn; Scanned = $true; Why = ''; Doc = $s.Doc; Controls = $s.Edits + $s.Buttons; SignIn = $s.Match.Count }
        $a2 = $null
        try { $a2 = [string](Get-Addr) } catch { $a2 = $null }
        if ($a2 -cne $lastAddr) { $clean = 0 }   # moved during the scan (or unreadable): the next poll restarts the window
        elseif ($s.Doc -and ($s.Edits + $s.Buttons) -gt 0 -and $s.Match.Count -eq 0) { $clean++ }
        else { $clean = 0 }
      }
      if ($sw.ElapsedMilliseconds -ge $deadline) { break }   # F2: a scan that ended past the bound never exits 0
      if ($clean -ge 2 -and ($sw.ElapsedMilliseconds - $since) -ge 4000) {
        $el = $sw.ElapsedMilliseconds
        Close-Own
        Say ("after submit: on {0}: yes; sign-in buttons: 0 on 2 consecutive scans; controls: {1}; address stable {2}; {3} from the press (polls: {4}; scans: {5}; worst single scan {6} ms)" -f $BbLabel, $seen.Controls, (Sec ($el - $since)), (Sec $el), $polls, $scans, $worstScan)
        Say "SIGNED IN - $kind; own window $H closed"; exit 0
      }
    } else { $clean = 0 }
    $left = $deadline - $sw.ElapsedMilliseconds
    if ($left -gt 0) { Start-Sleep -Milliseconds ([Math]::Min(1000, $left)) }
  }
  $el = $sw.ElapsedMilliseconds
  if (-not (Test-OwnWindow)) { Exit-WindowGone $sw $polls $scans }
  $scanText = if ($seen.Scanned) { "document: {0}; controls: {1}; sign-in buttons: {2}" -f (YesNo $seen.Doc), $seen.Controls, $seen.SignIn } else { "not scanned ($($seen.Why))" }
  Say ("after submit: bound of {0} s reached at {1} from the press; last poll: on {2}: {3}; host: {4}; address stable {5}; {6} (polls: {7}; scans: {8}; skipped near the bound: {9}; worst single scan {10})" -f $WaitSec, (Sec $el), $BbLabel, (YesNo ($seen.Host -eq $BbHost -and $seen.Addr)), (Show-Host $seen.Addr $seen.Host), (Sec ($el - $since)), $scanText, $polls, $scans, $skipped, $(if ($scans) { "$worstScan ms" } else { "n/a" }))
  Say "WAITS FOR THE USER - the submit did not end on $BbLabel without a sign-in control within $WaitSec s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window $H left open"
  exit 4
}

Wait-Settled
$w = Get-Where (Get-Addr)
$onBb = $w.Host -eq $BbHost
if ($onBb) {
  $s = Get-StableScan $BbSignIn
  Say ("after load: on {0}: yes; sign-in buttons: {1} (document: {2}; scans: {3})" -f $BbLabel, $s.Match.Count, (YesNo $s.Doc), $s.Scans)
  if ($s.Match.Count -eq 0) { Close-Own; Say "LOGGED IN - no sign-in control; own window $H closed"; exit 0 }
  if ($s.Match.Count -ne 1) { Say "WAITS FOR THE USER - $($s.Match.Count) sign-in buttons on $BbLabel; nothing pressed; window $H left open"; exit 4 }
  Invoke-Once $s.Match[0] 'sign-in button'
  if ($script:InvokeOk) { Finish-AfterPress 'autofill + one submit' }
  exit 4
}

# Off the blackboard host: the SSO page only if the host is on the SSO host allowlist (F1, S6 fixer r3; the
# dry run's list is the other loopback name). The https reading (live only) is a backstop that can only
# veto: it is unproven (no chip on localhost; another UI language may name it differently), see the header.
$underAda = $w.Host -eq 'ada.edu.az' -or $w.Host.EndsWith('.ada.edu.az')
$hostOk = Test-SsoHost $w.Host $SsoExact $SsoSuffix
$httpsVeto = (-not $Dry) -and ($w.Https -eq 'no' -or $w.Https -like 'no *')
$isSso = $hostOk -and -not $httpsVeto
if (-not $w.AddrRead) { $hostShown = 'address bar unreadable' }
elseif (-not $hostOk) { $hostShown = 'other host' }
elseif ($Dry) { $hostShown = "stand-in SSO host ($($w.Host))" }
else { $hostShown = $w.Host }
$s = Get-StableScan $Allow
Say ("after load: on {0}: no; SSO page: {1}; host under ada.edu.az: {2}; host: {3}; https: {4}" -f $BbLabel, (YesNo $isSso), (YesNo $underAda), $hostShown, $w.Https)
Say ("SSO scan: document: {0}; Edit controls: {1}; Button controls: {2}; allowlisted submit buttons: {3} (scans: {4})" -f (YesNo $s.Doc), $s.Edits, $s.Buttons, $s.Match.Count, $s.Scans)
if (-not $isSso) {
  $why = if (-not $w.AddrRead) { 'address bar unreadable' } elseif (-not $hostOk) { 'other host' } else { 'read as http' }
  Say "WAITS FOR THE USER - off $BbLabel on a page that is not the SSO page ($($why): the host must be on the SSO host allowlist and not read as http); nothing pressed; window $H left open"; exit 4
}
if ($s.Match.Count -ne 1) { Say "WAITS FOR THE USER - $($s.Match.Count) allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window $H left open"; exit 4 }
Invoke-Once $s.Match[0] 'allowlisted SSO submit button'
if ($script:InvokeOk) { Finish-AfterPress 'SSO autofill + one submit' }
exit 4

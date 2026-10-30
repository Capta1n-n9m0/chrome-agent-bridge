// Step 13 S5-drivers-C1: recipes/s13-devt.ps1 (liveC20's DevTools helpers) runs in PowerShell with every window, UIA, console and process call stubbed (the s13-win-ps.test.ts pattern):
// no window is listed, no key sent, no console typed into, no process read. The pure parts are driven directly; the flows run over a small state machine standing in for DevTools.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
const REPO = (process.env.S13_DEVT_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")).replace(/\\/g, "/");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
. '${REPO}/recipes/s13-devt.ps1'
$global:D = 99; $global:Log = @(); $global:State = 'bottom'; $global:S11Own = @{ '1' = $true }; $global:S9WinIds = @{ '1' = 1 }; $global:S12Dev = $null; $global:Dead = @{}; $global:Url = 'http://localhost:8081/e2e-playground.html?s12=con'
$global:Opener = $true; $global:Pane = $null; $global:Foreign = $false; $global:ForeignOther = $false; $global:NoPressed = $false; $global:NoButton = $false; $global:PressFail = $false; $global:TwoButtons = $false; $global:ThreeItems = $false; $global:TwoPressed = $false; $global:CustFail = $false; $global:Pair = $false; $global:Pair2 = $false; $global:OpenOn = 1; $global:MenuOpen = $false
function Stop9([string]$m) { $global:Log += 'STOP' }
function Assert-S11Own([long]$h, [string]$w) { if (-not $global:S11Own.ContainsKey([string]$h)) { throw 'not own' } }
function Test-S13Alive([long]$h) { -not $global:Dead.ContainsKey([string]$h) -and -not ([string]$h -eq '50' -and $global:State -ne 'undock') }
function Get-S13WinPid([long]$h) { 4242 }
function Test-S9Live($h) { (Test-S13Alive $h) -and $global:S9WinIds.ContainsKey([string]$h) }   # the real rule: a handle with no pid recorded at open time is not live
function Test-S11Own([long]$h) { $global:S11Own.ContainsKey([string]$h) -and (Test-S9Live $h) }
function Get-S9DocUrl([long]$h) { $global:Url }
function Open-S12DevToolsMenu([long]$h) { $global:Log += 'open'; if ($global:Opener) { $global:State = 'bottom' }; $global:Opener }
function Send-S12Escape([long]$h) { $global:Log += "esc$h"; $global:MenuOpen = $false }
function Send-S12Key([long]$h, [string]$k) { $global:Log += "key$k$h"; $global:State = 'closed' }
function Close-S9Window([long]$h) { $global:Log += "close$h"; $global:Dead[[string]$h] = $true; if ($h -eq 50) { $global:State = 'closed' } }
function Test-S13Pane([long]$h) { if ($null -ne $global:Pane) { $global:Pane } else { $global:State -notin 'undock', 'closed' } }
function Get-S13Titles {
  $l = @([pscustomobject]@{ h = 1; title = 'Fixture page' })
  if ($global:State -eq 'undock' -and -not $global:Dead.ContainsKey('50')) { $l += [pscustomobject]@{ h = 50; title = 'DevTools - localhost:8081/e2e-playground.html?s12=con' } }
  if ($global:Foreign) { $l += [pscustomobject]@{ h = 60; title = 'DevTools - localhost:8081/other.html' } }
  if ($global:ForeignOther) { $l += [pscustomobject]@{ h = 61; title = 'DevTools - example.com/x.html' } }
  $l
}
function Get-S13UiaItems([long]$h) {
  if ($global:State -eq 'closed') { return }
  if ($h -eq 1 -and $global:State -eq 'undock') { return }
  if ($h -eq 50 -and $global:State -ne 'undock') { return }
  if (-not $global:NoButton -and -not $global:Pair) { [pscustomobject]@{ name = 'Customize and control DevTools'; type = 'Button'; el = 'customize' } }
  if ($global:Pair) {
    $p = @([pscustomobject]@{ name = 'Customize and control DevTools'; type = 'Button'; el = 'customize'; cls = 'toolbar-button main-menu' }, [pscustomobject]@{ name = 'Customize and control DevTools'; type = 'Button'; el = 'inner'; cls = ' icon only-icon ' })
    if ($global:Pair2) { [array]::Reverse($p) }
    $p
  }
  if ($global:TwoButtons) { [pscustomobject]@{ name = 'Customize and control DevTools'; type = 'Button'; el = 'customize' } }
  if ($global:Pair -and -not $global:MenuOpen) { return }
  foreach ($p in @(@('Undock into separate window', 'undock'), @('Dock to left', 'left'), @('Dock to bottom (Ctrl + Shift + D)', 'bottom'), @('Dock to right', 'right'))) { if ($global:ThreeItems -and $p[1] -eq 'right') { continue }; [pscustomobject]@{ name = $p[0]; type = 'Button'; el = "dock:$($p[1])" } }
  [pscustomobject]@{ name = 'Dock side'; type = 'Text'; el = 'label' }
}
function Get-S13Pressed($el) { if ($global:NoPressed) { return $null }; if ($global:TwoPressed -and "$el" -eq 'dock:left') { return $true }; "$el" -eq "dock:$global:State" }
function Invoke-S13Item($el) { $global:Log += "inv:$el"; if ($global:Pair) { $global:MenuOpen = ("$el" -eq 'customize' -and $global:OpenOn -eq 1) -or ("$el" -eq 'inner' -and $global:OpenOn -eq 2) }; if ($global:CustFail -and "$el" -eq 'customize') { return $false }; if ("$el" -like 'dock:*' -and $global:PressFail) { return $false }; if ("$el" -like 'dock:*') { $global:State = "$el".Substring(5) }; $true }
function T([string]$n, [scriptblock]$b) {
  Write-Host "BEGIN $n"; $global:Log = @(); $global:State = 'bottom'; $global:S11Own = @{ '1' = $true }; $global:S9WinIds = @{ '1' = 1 }; $global:S12Dev = $null; $global:Dead = @{}; $global:Url = 'http://localhost:8081/e2e-playground.html?s12=con'
  $global:Opener = $true; $global:Pane = $null; $global:Foreign = $false; $global:ForeignOther = $false; $global:NoPressed = $false; $global:NoButton = $false; $global:PressFail = $false; $global:TwoButtons = $false; $global:ThreeItems = $false; $global:TwoPressed = $false; $global:CustFail = $false; $global:Pair = $false; $global:Pair2 = $false; $global:OpenOn = 1; $global:MenuOpen = $false
  try { Write-Host "RET $(@(& $b)[-1])" } catch { Write-Host "THREW $_" }
  Write-Host "LOG $($global:Log -join ',')"
}
function Itm($k, $p) { [pscustomobject]@{ kind = $k; pressed = $p } }
function Four($pressed) { @('undock', 'left', 'bottom', 'right') | ForEach-Object { Itm $_ ($_ -eq $pressed) } }

T title { (@('DevTools - localhost:8081/a.html?x=1', 'DevTools - 127.0.0.1:8081/a', 'DevTools', 'DevTools - Profile 1', 'DevTools - localhost:8082/a', 'DevTools - example.com:8081/a', 'localhost:8081/') | ForEach-Object { if (Test-S13DevtTitle $_ 8081) { 1 } else { 0 } }) -join '' }
T read0 { $r = Get-S13TitleRead @('Fixture', 'DevTools') 8081 's12=con'; "$($r.windows) $($r.title)" }
T read1 { $r = Get-S13TitleRead @('DevTools - localhost:8081/a.html?s12=con') 8081 's12=con'; "$($r.windows) $($r.title)" }
T read1x { $r = Get-S13TitleRead @('DevTools - localhost:8081/a.html?s12=other') 8081 's12=con'; "$($r.windows) $($r.title)" }
T read2 { $r = Get-S13TitleRead @('DevTools - localhost:8081/a.html?s12=con', 'DevTools - localhost:8081/b.html') 8081 's12=con'; "$($r.windows) $($r.title)" }
T readNoMarker { $r = Get-S13TitleRead @('DevTools - localhost:8081/b.html') 8081; "$($r.windows) $($r.title)" }
T kind { (@('Undock into separate window', 'Dock to left', 'Dock to bottom (Ctrl + Shift + D)', 'Dock to right', 'Customize', '') | ForEach-Object { $k = ConvertTo-S13DockKind $_; if ($k) { $k } else { '-' } }) -join ',' }
T sideWin1 { ConvertTo-S13DockSide @() 1 }
T sideWin2 { ConvertTo-S13DockSide @() 2 }
T sideBottom { ConvertTo-S13DockSide (Four 'bottom') 0 }
T sideRight { ConvertTo-S13DockSide (Four 'right') 0 }
T sideLeft { ConvertTo-S13DockSide (Four 'left') 0 }
T sideUndockNoWin { ConvertTo-S13DockSide (Four 'undock') 0 }
T sideNonePressed { ConvertTo-S13DockSide (Four 'none') 0 }
T sideTwoPressed { ConvertTo-S13DockSide @((Itm 'undock' $false), (Itm 'left' $true), (Itm 'bottom' $true), (Itm 'right' $false)) 0 }
T sideNull { ConvertTo-S13DockSide @((Itm 'undock' $false), (Itm 'left' $null), (Itm 'bottom' $true), (Itm 'right' $false)) 0 }
T sideMissing { ConvertTo-S13DockSide @((Itm 'undock' $false), (Itm 'bottom' $true), (Itm 'right' $false)) 0 }
T sideDup { ConvertTo-S13DockSide (@(Four 'bottom') + @(Itm 'left' $false)) 0 }
T sideEmpty { ConvertTo-S13DockSide @() 0 }
T expr { $e = New-S13TargetsExpr 's12=con'; $a = $e.Contains('includes("s12=con")'); $b = $e.Contains('getTargets()'); $c = ($e -match '^[ -~]+$'); $d = $e.Contains('console.log("S13DEVT "'); "$a $b $c $d" }
T exprBad { @(foreach ($m in 's12=con")+x("', '', 'a b', 'x"y') { try { [void](New-S13TargetsExpr $m); 'ACCEPTED' } catch { 'refused' } }) -join ',' }
T parse { $r = Get-S13TargetsRead @('> (async () => { console.log("S13DEVT " + x) })()', 'S13DEVT no 7', 'noise', 'S13DEVT yes 12'); "$($r.attached) $($r.targets)" }
T parseUnread { $r = Get-S13TargetsRead @('S13DEVT unread 3'); "$($r.attached) $($r.targets)" }
T parseNone { $r = Get-S13TargetsRead @('> S13DEVT yes 12 extra', 'S13DEVT maybe 1'); "NULL=$($null -eq $r)" }
T flagYes { Get-S13FlagWord @('"C:\\x\\chrome.exe" --enable-unsafe-extension-debugging --flag', '"C:\\x\\chrome.exe" --type=renderer') }
T flagEq { Get-S13FlagWord @('chrome.exe --enable-unsafe-extension-debugging=1') }
T flagNo { Get-S13FlagWord @('"C:\\x\\chrome.exe" --flag', '"C:\\x\\chrome.exe" --type=gpu-process') }
T flagRendererOnly { Get-S13FlagWord @('chrome.exe --type=renderer --enable-unsafe-extension-debugging') }
T flagPrefix { Get-S13FlagWord @('chrome.exe --enable-unsafe-extension-debugging-x') }
T flagEmpty { Get-S13FlagWord @('', $null) }
T flagNone { Get-S13FlagWord @() }
T flagThrow { function Get-CimInstance { [CmdletBinding()] param([string]$ClassName, [string]$Filter) throw 'denied' }; Read-S13Flag }
T flagRead { function Get-CimInstance { [CmdletBinding()] param([string]$ClassName, [string]$Filter) [pscustomobject]@{ CommandLine = 'chrome.exe --enable-unsafe-extension-debugging' } }; Read-S13Flag }

$env:S11_OUT = Join-Path $env:TEMP 's13-devt-test'; New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$global:Console = 'ok'
function Start-S11bConsoleEval([long]$c, [string]$s, [string[]]$o, [string]$f) { $global:Log += 'eval'; if ($global:Console -eq 'code2') { [pscustomobject]@{ Code = 2; Mark = 0 } } elseif ($global:Console -eq 'throw') { throw 'x' } else { [pscustomobject]@{ Code = $null; Mark = 5 } } }
function Save-S11bConsole([long]$c, [string]$o) { $global:Log += 'save'; if ($global:Console -eq 'silent') { @('S11B-MARK 5') } else { @('S11B-MARK 5', 'S13DEVT yes 12') } }
function Get-S11bTail([string[]]$l, [string]$m) { $i = [array]::IndexOf($l, $m); if ($i -lt 0) { [pscustomobject]@{ Found = $false; Lines = @() } } else { [pscustomobject]@{ Found = $true; Lines = @($l | Select-Object -Skip ($i + 1)) } } }
T targets { $global:Console = 'ok'; $r = Read-S13Targets 's12=con' 2000; "$($r.attached) $($r.targets)" }
T targetsBadMarker { $r = Read-S13Targets 'a"b'; "$($r.attached) $($r.targets)" }
T targetsCode2 { $global:Console = 'code2'; $r = Read-S13Targets 's12=con' 2000; "$($r.attached) $($r.targets)" }
T targetsThrow { $global:Console = 'throw'; $r = Read-S13Targets 's12=con' 2000; "$($r.attached) $($r.targets)" }
T targetsSilent { $global:Console = 'silent'; $r = Read-S13Targets 's12=con' 700; "$($r.attached) $($r.targets)" }
T ctlDocked { $global:Console = 'ok'; $r = Get-S13Control 1 8081 's12=con' 'docked'; "$($null -eq $r.windows) $($r.title) $($r.attached) $($r.targets)" }
T ctlUndockBefore { $global:Console = 'ok'; $global:State = 'closed'; $r = Get-S13Control 1 8081 's12=con' 'undock'; "$($r.windows) $($r.title) $($r.attached)" }
T ctlUndockAfter { $global:Console = 'ok'; $global:State = 'undock'; $r = Get-S13Control 1 8081 's12=con' 'undock'; "$($r.windows) $($r.title) $($r.attached) $($r.targets)" }
T ctlPort { Get-S13Control 1 8082 's12=con' 'undock' }
T ctlForeign { Get-S13Control 7 8081 's12=con' 'undock' }
T readDocked { Read-S13DockSide 1 8081 }
T readDockedLog { [void](Read-S13DockSide 1 8081) }
T readRight { $global:State = 'right'; Read-S13DockSide 1 8081 }
T readUndock { $global:State = 'undock'; Read-S13DockSide 1 8081 }
T readNoPane { $global:Pane = $false; Read-S13DockSide 1 8081 }
T readNoButton { $global:NoButton = $true; Read-S13DockSide 1 8081 }
T readNoPressed { $global:NoPressed = $true; Read-S13DockSide 1 8081 }
T readPort { Read-S13DockSide 1 8083 }
function Dg { $d = $global:S13DockDiag; "$($d.windows) $($d.pane) $($d.customize) $($d.invoked) $($d.items) $($d.kinds) $($d.pr) $($d.pressed)" }
T diagOk { [void](Read-S13DockSide 1 8081); Dg }
T diagWin { $global:State = 'undock'; [void](Read-S13DockSide 1 8081); Dg }
T diagNoPane { $global:Pane = $false; [void](Read-S13DockSide 1 8081); Dg }
T diagNoButton { $global:NoButton = $true; [void](Read-S13DockSide 1 8081); Dg }
T diagTwoButtons { $global:TwoButtons = $true; [void](Read-S13DockSide 1 8081); Dg }
T diagInvFail { $global:CustFail = $true; [void](Read-S13DockSide 1 8081); Dg }
T diagThree { $global:ThreeItems = $true; [void](Read-S13DockSide 1 8081); "$(Read-S13DockSide 1 8081) $(Dg)" }
T diagNoPressed { $global:NoPressed = $true; [void](Read-S13DockSide 1 8081); Dg }
T diagTwoPressed { $global:TwoPressed = $true; $a = Read-S13DockSide 1 8081; "$a $(Dg)" }
T diagReset { [void](Read-S13DockSide 1 8081); $global:Pane = $false; [void](Read-S13DockSide 1 8081); Dg }
T diagSkip { (@(@('Profile 1', ''), @('x', 'AvatarButton'), @('Your account', ''), @('Dock side', 'dock')) | ForEach-Object { if (Test-S13DiagSkip $_[0] $_[1]) { 1 } else { 0 } }) -join '' }
T diagKw { (@('Customize and control DevTools', 'Dock to left', 'More options', 'File menu', 'Elements', 'Reload') | ForEach-Object { if (Test-S13DiagKeyword $_) { 1 } else { 0 } }) -join '' }
T diagText { "$((Format-S13DiagText ('a' * 70)).Length) [$(Format-S13DiagText ('x|y' + [char]10 + 'z'))] [$(Format-S13DiagText $null)]" }
T diagSkipClass { (@('BookmarkButton', 'ToolbarActionViewButton', 'ExtensionsToolbarContainer', 'AvatarToolbarButton', 'TabHoverCardBubbleView', 'Tab', 'OmniboxViewViews', 'LocationBarView', 'SidePanel', 'DownloadBubble', 'InfoBarView', 'BrowserView', 'Button', '') | ForEach-Object { if (Test-S13DiagSkip 'x' 'y' $_) { 1 } else { 0 } }) -join '' }
T diagFixed { (@('Customize and control DevTools. More', 'Dock side', 'Undock into separate window', 'Dock to bottom', 'More tools', 'My bookmark', 'Docker', '') | ForEach-Object { if (Test-S13FixedName $_) { 1 } else { 0 } }) -join '' }
T diagStateName { (@('Dock to left', 'Undock into separate window', 'Customize and control DevTools', 'My bookmark', 'Reload') | ForEach-Object { if (Test-S13DiagStateName $_) { 1 } else { 0 } }) -join '' }
T diagLegacy { "$(Format-S13DiagLegacy 24) $(Format-S13DiagLegacy 2) $(Format-S13DiagLegacy 0) $(Format-S13DiagLegacy 'n/a') $(Format-S13DiagLegacy $null)" }
T diagPopup { "$(Test-S13PopupMenu 'Menu' 'x') $(Test-S13PopupMenu 'Window' '#32768') $(Test-S13PopupMenu 'Window' 'MenuHostWindow') $(Test-S13PopupMenu 'Window' 'Chrome_WidgetWin_1') $(Test-S13PopupMenu 'Pane' '')" }
T diagNewWin { "$(Format-S13NewWinSkip 'Window' 'Chrome_WidgetWin_1') | $(Format-S13NewWinSkip 'Pane' 'My Profile Title') | $(Format-S13NewWinSkip 'Pane' '')" }
T pollFound { $global:PollN = 0; $r = Invoke-S13Poll { param($t, $ms) $global:PollN = $t; $t -eq 3 } 6000 300 { param($m) }; "$($r.found) $($r.tries) $global:PollN" }
T pollNever { $r = Invoke-S13Poll { param($t, $ms) $false } 900 300 { param($m) }; "$($r.found) $($r.tries)" }
T diagCounts { Format-S13DiagCounts 'at-700ms' (New-S13DockDiag 0 'yes' 1 'yes' @((Itm 'left' $true), (Itm 'right' $false), (Itm 'right' $null))) }
function Cm($cls, $n = 'Customize and control DevTools') { [pscustomobject]@{ name = $n; type = 'Button'; el = "e-$cls"; cls = $cls } }
function Ch($m) { (@(Get-S13CustomizeTries $m) | ForEach-Object { $_.cls.Trim() }) -join '/' }
T chooseOne { Ch @(Cm 'x') }
T choosePair { Ch @((Cm 'toolbar-button main-menu'), (Cm ' icon only-icon ')) }
T choosePairRev { Ch @((Cm ' icon only-icon '), (Cm 'toolbar-button main-menu')) }
T chooseNoMenu { "[$(Ch @((Cm 'a'), (Cm 'b')))]" }
T chooseBothMenu { "[$(Ch @((Cm 'main-menu'), (Cm 'main-menu x')))]" }
T chooseThree { "[$(Ch @((Cm 'main-menu'), (Cm 'a'), (Cm 'b')))]" }
T chooseZero { "[$(Ch @())]" }
T tryFirst { $global:Pair = $true; $r = Read-S13DockSide 1 8081; "$r $(Dg) try=$($global:S13DockDiag.trynum)" }
T trySecond { $global:Pair = $true; $global:OpenOn = 2; $r = Read-S13DockSide 1 8081; "$r try=$($global:S13DockDiag.trynum)" }
T trySecondRev { $global:Pair = $true; $global:Pair2 = $true; $global:OpenOn = 2; $r = Read-S13DockSide 1 8081; "$r try=$($global:S13DockDiag.trynum)" }
T tryNone { $global:Pair = $true; $global:OpenOn = 0; $r = Read-S13DockSide 1 8081; "$r try=$($global:S13DockDiag.trynum)" }
T tryNoChoice { $global:TwoButtons = $true; $r = Read-S13DockSide 1 8081; "$r try=$($global:S13DockDiag.trynum)" }
T trySet { $global:Pair = $true; $global:OpenOn = 2; $global:State = 'bottom'; $r = Set-S13DockSide 1 8081 'left'; "$($r.done) $($r.changed) $($r.now)" }
T setSame { $r = Set-S13DockSide 1 8081 'bottom'; "$($r.done) $($r.changed) $($r.now)" }
T setUnread { $global:NoPressed = $true; $r = Set-S13DockSide 1 8081 'left'; "$($r.done) $($r.changed) $($r.now)" }
T setLeft { $r = Set-S13DockSide 1 8081 'left'; "$($r.done) $($r.changed) $($r.now)" }
T setUndock { $r = Set-S13DockSide 1 8081 'undock'; "$($r.done) $($r.changed) $($r.now) OWN50=$($global:S11Own.ContainsKey('50'))" }
T setDockBack { $global:State = 'undock'; $global:S11Own['50'] = $true; $global:S9WinIds['50'] = 4242; $r = Set-S13DockSide 1 8081 'right'; "$($r.done) $($r.changed) $($r.now) OWN50=$($global:S11Own.ContainsKey('50')) OWN1=$($global:S11Own.ContainsKey('1'))" }
T undockCloseDockBack { [void](Open-S13DevTools 1 8081 'undock'); $a = "own50=$(Test-S11Own 50)"; $c = Close-S13DevTools 1 8081; $b = "closed=$($c.closed) rem=$($c.remaining)"; $global:Dead.Remove('50'); [void](Open-S13DevTools 1 8081 'undock'); $r = Set-S13DockSide 1 8081 'bottom'; "$a $b done=$($r.done) now=$($r.now)" }
T setUndockPid { [void](Set-S13DockSide 1 8081 'undock'); "pid=$($global:S9WinIds['50'])" }
T openAdopt { $global:S12Dev = [pscustomobject]@{ How = 'window'; Hwnd = 70 }; [void](Open-S13DevTools 1 8081); "pid=$($global:S9WinIds['70']) own=$($global:S11Own.ContainsKey('70'))" }
T setKeepOthers { $global:S11Own['2'] = $true; [void](Set-S13DockSide 1 8081 'undock'); "OWN2=$($global:S11Own.ContainsKey('2'))" }
T setUndockThenDock { [void](Set-S13DockSide 1 8081 'undock'); $r = Set-S13DockSide 1 8081 'left'; "$($r.done) $($r.now) OWN1=$($global:S11Own.ContainsKey('1')) OWN50=$($global:S11Own.ContainsKey('50'))" }
T setPressFailX { $global:PressFail = $true; $r = Set-S13DockSide 1 8081 'left'; "$($r.done) $($r.changed) $($r.now)" }
T setPressFailOwn { $global:State = 'undock'; $global:S11Own['50'] = $true; $global:S9WinIds['50'] = 4242; $global:PressFail = $true; $r = Set-S13DockSide 1 8081 'bottom'; "$($r.done) $($r.changed) $($r.now)" }
T closeHumanOther { $global:State = 'closed'; $global:ForeignOther = $true; $r = Close-S13DevTools 1 8081; "$($r.closed) $($r.windows) $($r.remaining)" }
T setForeign { $global:Foreign = $true; $r = Set-S13DockSide 1 8081 'bottom'; "$($r.done) $($r.changed) $($r.now)" }
T setBadSide { Set-S13DockSide 1 8081 'top' }
T openPlain { $r = Open-S13DevTools 1 8081; "$($r.opened) $($r.done) [$($r.now)]" }
T openUndock { $r = Open-S13DevTools 1 8081 'undock'; "$($r.opened) $($r.side) $($r.done) $($r.now)" }
T openFail { $global:Opener = $false; $r = Open-S13DevTools 1 8081 'undock'; "$($r.opened) $($r.done)" }
T openNotFixture { $global:Url = 'https://example.com/'; Open-S13DevTools 1 8081 }
T openPort { Open-S13DevTools 1 8082 }
T openForeign { Open-S13DevTools 7 8081 }
T closeWin { $global:State = 'undock'; $global:S11Own['50'] = $true; $global:S9WinIds['50'] = 4242; $r = Close-S13DevTools 1 8081; "$($r.closed) $($r.windows) $($r.pane) $($r.remaining) OWN50=$($global:S11Own.ContainsKey('50'))" }
T closePane { $r = Close-S13DevTools 1 8081; "$($r.closed) $($r.windows) $($r.pane) $($r.remaining)" }
T closeNothing { $global:State = 'closed'; $r = Close-S13DevTools 1 8081; "$($r.closed) $($r.remaining)" }
T closeForeign { $global:State = 'closed'; $global:Foreign = $true; $r = Close-S13DevTools 1 8081; "$($r.closed) $($r.windows) $($r.remaining)" }
T closeStuckPane { $global:Pane = $true; $r = Close-S13DevTools 1 8081; "$($r.closed) $($r.pane) $($r.remaining)" }
T closeForeignX { Close-S13DevTools 7 8081 }
Remove-Item -LiteralPath $env:S11_OUT -Recurse -Force -ErrorAction Ignore
`;
const run = (): Record<string, string[]> => {
	const dir = mkdtempSync(join(tmpdir(), "s13-devt-"));
	const f = join(dir, "t.ps1");
	writeFileSync(f, SCRIPT.replace(/\r?\n/g, "\r\n"), "ascii");
	const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 120_000 });
	rmSync(dir, { recursive: true, force: true });
	const o: Record<string, string[]> = {}; let cur = "";
	for (const l of r.stdout.split(/\r?\n/)) { if (l.startsWith("BEGIN ")) { cur = l.slice(6); o[cur] = []; } else if (cur && l) o[cur]!.push(l); }
	return o;
};
describe.skipIf(!hasPs)("recipes/s13-devt.ps1 (every window, UIA, console and process call stubbed)", () => {
	const o = run();
	const ret = (n: string): string => (o[n] ?? []).find((l) => l.startsWith("RET "))?.slice(4) ?? (o[n] ?? []).filter((l) => !l.startsWith("LOG ")).join("|") ?? "";
	const log = (n: string): string => (o[n] ?? []).find((l) => l.startsWith("LOG "))?.slice(4) ?? "";
	const threw = (n: string): string => (o[n] ?? []).find((l) => l.startsWith("THREW "))?.slice(6) ?? "";
	it("an undocked window's title is DevTools - <fixture host>:<port>/...; the capture window, a profile name, another port or host never match", () => {
		expect(ret("title")).toBe("1100000");
	});
	it("the title read counts matching windows and says ok only when one carries the row's marker", () => {
		expect([ret("read0"), ret("read1"), ret("read1x"), ret("read2"), ret("readNoMarker")]).toEqual(["0 none", "1 ok", "1 none", "2 ok", "1 ok"]);
	});
	it("a Dock side button's name maps to its word, any other name to nothing", () => {
		expect(ret("kind")).toBe("undock,left,bottom,right,-,-");
	});
	it("the dock word: one window is undock; more than one, a missing, duplicated or unreadable button, none or two pressed, or Undock pressed without a window is unread", () => {
		expect(["sideWin1", "sideWin2", "sideBottom", "sideRight", "sideLeft", "sideUndockNoWin", "sideNonePressed", "sideTwoPressed", "sideNull", "sideMissing", "sideDup", "sideEmpty"].map(ret)).toEqual(["undock", "unread", "bottom", "right", "left", "unread", "unread", "unread", "unread", "unread", "unread", "unread"]);
	});
	it("the console expression picks the tab by the marker inside it, prints one word-and-count line, is plain ASCII, and a marker with a quote, a space or nothing is refused", () => {
		expect(ret("expr")).toBe("True True True True");
		expect(ret("exprBad")).toBe("refused,refused,refused,refused");
		const src = readFileSync(resolve(REPO, "recipes", "s13-devt.ps1"), "utf8");
		expect(src).toMatch(/Test-S13Marker \$Marker\)\) \{ throw/);
	});
	it("the target read takes the last whole S13DEVT line, never the typed expression's echo, and none gives null", () => {
		expect([ret("parse"), ret("parseUnread"), ret("parseNone")]).toEqual(["yes 12", "unread 3", "NULL=True"]);
	});
	it("FLAG: yes on a browser process carrying it (also with =), no when browser lines are read without it, unread when none can be read; a renderer's line and a longer flag name do not count", () => {
		expect(["flagYes", "flagEq", "flagNo", "flagRendererOnly", "flagPrefix", "flagEmpty", "flagNone", "flagThrow", "flagRead"].map(ret)).toEqual(["yes", "yes", "no", "unread", "no", "unread", "unread", "unread", "yes"]);
	});
	it("the target read: parsed on success; unread (0) for a bad marker, a console that did not take the input, a throw, or no line within the bound; the console is not touched for a bad marker", () => {
		expect([ret("targets"), ret("targetsBadMarker"), ret("targetsCode2"), ret("targetsThrow"), ret("targetsSilent")]).toEqual(["yes 12", "unread 0", "unread 0", "unread 0", "unread 0"]);
		expect(log("targetsBadMarker")).toBe("");
	});
	it("the control: a docked leg has windows null, title n/a; an undocked leg counts windows and compares the title; attached comes from the console; X must be the wave's, on port 8081", () => {
		expect([ret("ctlDocked"), ret("ctlUndockBefore"), ret("ctlUndockAfter")]).toEqual(["True n/a yes 12", "0 none yes", "1 ok yes 12"]);
		expect(threw("ctlPort")).toMatch(/fixture port/);
		expect(threw("ctlForeign")).toMatch(/not own/);
	});
	it("the dock read: a DevTools window means undock with no menu opened; a docked pane opens the Customize menu, reads the pressed button and escapes into X once", () => {
		expect([ret("readDocked"), ret("readRight"), ret("readUndock")]).toEqual(["bottom", "right", "undock"]);
		expect(log("readDockedLog")).toBe("inv:customize,esc1");
		expect(log("readUndock")).toBe("");
	});
	it("the dock read is unread, never a guess, when no pane shows, the Customize button is missing, or the buttons expose no pressed state; a fixture port other than 8081 is refused", () => {
		expect([ret("readNoPane"), ret("readNoButton"), ret("readNoPressed")]).toEqual(["unread", "unread", "unread"]);
		expect(log("readNoPane")).toBe("");
		expect(threw("readPort")).toMatch(/fixture port/);
	});
	it("a dock change: nothing to do when already on the side or when the side is unreadable; otherwise it presses the one Dock side button and reads the side back", () => {
		expect([ret("setSame"), ret("setUnread"), ret("setLeft")]).toEqual(["True False bottom", "False False unread", "True True left"]);
		expect(log("setSame")).toBe("inv:customize,esc1");
		expect(log("setLeft")).toBe("inv:customize,esc1,inv:customize,inv:dock:left,inv:customize,esc1");
	});
	it("undocking records the new DevTools window as the wave's own; docking back drops the dead handle; a DevTools window the wave did not open leaves the change refused", () => {
		expect(ret("setUndock")).toBe("True True undock OWN50=True");
		expect(ret("setDockBack")).toBe("True True right OWN50=False OWN1=True");
			expect(log("setDockBack")).not.toMatch(/esc50/);
		expect(ret("setForeign")).toBe("False False undock");
		expect(log("setForeign")).not.toMatch(/dock:/);
		expect(threw("setBadSide")).toMatch(/top/);
	});
	it("a DevTools window the wave adopts gets its owner pid recorded (Test-S9Live needs it): it can be closed and docked back; a live wave window is never pruned", () => {
			expect(ret("undockCloseDockBack")).toBe("own50=True closed=1 rem=0 done=True now=bottom");
			expect(ret("setUndockPid")).toBe("pid=4242");
			expect(ret("openAdopt")).toBe("pid=4242 own=True");
			expect(ret("setKeepOthers")).toBe("OWN2=True");
			expect(ret("setUndockThenDock")).toBe("True left OWN1=True OWN50=False");
		});
it("opening goes through Run 19's menu opener on a wave window showing an 8081 fixture only, then (when asked) the dock change", () => {
		expect([ret("openPlain"), ret("openUndock"), ret("openFail")]).toEqual(["True True []", "True undock True undock", "False False"]);
		expect(log("openFail")).toBe("open");
		expect(threw("openNotFixture")).toMatch(/fixture/);
		expect(log("openNotFixture")).toBe("STOP");
		expect(threw("openPort")).toMatch(/fixture port/);
		expect(threw("openForeign")).toMatch(/not own/);
		expect(log("openForeign")).toBe("");
	});
	it("closing closes only the wave's own DevTools windows (the Run 19 S11Own rule), F12 only for a pane UIA shows, and counts what remains", () => {
		expect(ret("closeWin")).toBe("1 0 0 0 OWN50=False");
		expect(log("closeWin")).toBe("close50");
		expect(ret("closePane")).toBe("1 0 0 0");
		expect(log("closePane")).toBe("keyF121");
		expect(ret("closeNothing")).toBe("0 0");
		expect(log("closeNothing")).toBe("");
		expect(ret("closeForeign")).toBe("0 1 1");
		expect(log("closeForeign")).toBe("");
		expect(ret("closeHumanOther")).toBe("0 0 0");
			expect(ret("closeStuckPane")).toBe("1 1 1");
		expect(threw("closeForeignX")).toMatch(/not own/);
	});
	it("a failed press changes nothing and closes the menu it opened: an Escape into X for a menu in X, and no key at all for a menu in the wave's own DevTools window (C1 verifier2 N2)", () => {
		expect(ret("setPressFailX")).toBe("False False bottom");
		expect(log("setPressFailX")).toBe("inv:customize,esc1,inv:customize,inv:dock:left,esc1");
		expect(ret("setPressFailOwn")).toBe("False False undock");
		expect(log("setPressFailOwn")).toBe("inv:customize,inv:dock:bottom");
		expect(log("setPressFailOwn")).not.toMatch(/esc/);
	});
	it("#418 F4 chooser: one match is the try; the measured nested pair gives the menu opener (main-menu) first and the Invoke element second in either order; two without it, two with it both, three or zero give none", () => {
		expect([ret("chooseOne"), ret("choosePair"), ret("choosePairRev")]).toEqual(["x", "toolbar-button main-menu/icon only-icon", "toolbar-button main-menu/icon only-icon"]);
		expect([ret("chooseNoMenu"), ret("chooseBothMenu"), ret("chooseThree"), ret("chooseZero")]).toEqual(["[]", "[]", "[]", "[]"]);
	});
	it("#418 F4 tries: try 1 opens; try 1 fails then try 2 opens (an Escape between); both fail = unread with an Escape after each; no choice invokes nothing; Set-S13DockSide still opens once and presses the side", () => {
		expect(ret("tryFirst")).toBe("bottom 0 yes 2 yes 4 u1l1b1r1 4 1 try=1");
		expect(log("tryFirst")).toBe("inv:customize,esc1");
		expect(ret("trySecond")).toBe("bottom try=2");
		expect(log("trySecond")).toBe("inv:customize,esc1,inv:inner,esc1");
		expect(ret("trySecondRev")).toBe("bottom try=2");
		expect(ret("tryNone")).toBe("unread try=none");
		expect(log("tryNone")).toBe("inv:customize,esc1,inv:inner,esc1");
		expect(ret("tryNoChoice")).toBe("unread try=none");
		expect(log("tryNoChoice")).toBe("");
		expect(ret("trySet")).toBe("True True left");
		expect(log("trySet")).toMatch(/^inv:customize,esc1,inv:inner,esc1,inv:customize,esc1,inv:inner,inv:dock:left,/);
	});
	it("the dock read leaves a counts-only diagnostic: the failing UIA step shows in it (no pane, no button, the button twice, the invoke failing, 3 of 4 items, pressed unreadable, two pressed, one pressed), and a window leaves the rest n/a", () => {
		expect(ret("diagOk")).toBe("0 yes 1 yes 4 u1l1b1r1 4 1");
		expect(ret("diagWin")).toBe("1 n/a n/a n/a 0 u0l0b0r0 0 0");
		expect(ret("diagNoPane")).toBe("0 no n/a n/a 0 u0l0b0r0 0 0");
		expect(ret("diagNoButton")).toBe("0 yes 0 n/a 0 u0l0b0r0 0 0");
		expect(ret("diagTwoButtons")).toBe("0 yes 2 n/a 0 u0l0b0r0 0 0");
		expect(ret("diagInvFail")).toBe("0 yes 1 no 0 u0l0b0r0 0 0");
		expect(ret("diagThree")).toBe("unread 0 yes 1 yes 3 u1l1b1r0 3 1");
		expect(ret("diagNoPressed")).toBe("0 yes 1 yes 4 u1l1b1r1 0 0");
		expect(ret("diagTwoPressed")).toBe("unread 0 yes 1 yes 4 u1l1b1r1 4 2");
		expect(ret("diagReset")).toBe("0 no n/a n/a 0 u0l0b0r0 0 0");
	});
	it("the return value of the dock read and its key log are unchanged by the diagnostic (a plain side word)", () => {
		expect(ret("diagOk")).not.toMatch(/^(bottom|right|left|undock|unread)/);
		expect(ret("readDocked")).toBe("bottom");
		expect(log("readDockedLog")).toBe("inv:customize,esc1");
	});
	it("the live diagnostic's pure parts: the profile, account and avatar elements are skipped, the keyword filter, the 60-character cut with no pipe or newline, and the counts line", () => {
		expect(ret("diagSkip")).toBe("1110");
		expect(ret("diagKw")).toBe("111100");
		expect(ret("diagText")).toBe("60 [x y z] []");
		// #418 verifier F1-F4
		expect(ret("diagSkipClass")).toBe("11111111111100");
		expect(ret("diagFixed")).toBe("11111000");
		expect(ret("diagStateName")).toBe("11100");
		expect(ret("diagLegacy")).toBe("Leg=24(pressed,checked) Leg=2(selected) Leg=0() Leg=n/a Leg=n/a");
		expect(ret("diagPopup")).toBe("True True True False False");
		expect(ret("diagNewWin")).toBe("NEWWIN skipped type=Window class=Chrome_WidgetWin_1 | NEWWIN skipped type=Pane class=- | NEWWIN skipped type=Pane class=-");
		expect(ret("pollFound")).toBe("True 3 3");
		expect(ret("pollNever")).toBe("False 4");
		expect(ret("diagCounts")).toBe("COUNTS at-700ms windows=0 pane=yes customize=1 invoked=yes items=3 kinds=u0l1b0r2 pressed-readable=2 pressed=1");
	});
	it("the file is ASCII, defines only S13-named functions, prints nothing (no Write-Host, Say9 or Show-S16) and reads no window text but through the one title wrapper", () => {
		const src = readFileSync(resolve(REPO, "recipes", "s13-devt.ps1"), "utf8");
		expect(src).toMatch(/^[\x00-\x7f]*$/);
		const fns = [...src.matchAll(/^function ([\w-]+)/gm)].map((m) => m[1]!);
		expect(fns.length).toBeGreaterThanOrEqual(24);
		expect(fns.filter((n) => !/-S13[A-Za-z]+$/.test(n))).toEqual([]);
		expect(src).not.toMatch(/Write-Host|Write-Output|Say9|Show-S16|Out-File/);
		expect(src.match(/\[S9Win\]::Text/g)).toHaveLength(1);
		expect(src).not.toMatch(/^\$[A-Za-z]/m);
	});
});

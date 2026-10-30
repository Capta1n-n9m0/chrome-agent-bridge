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
$global:Opener = $true; $global:Pane = $null; $global:Foreign = $false; $global:ForeignOther = $false; $global:NoPressed = $false; $global:NoButton = $false; $global:PressFail = $false
function Stop9([string]$m) { $global:Log += 'STOP' }
function Assert-S11Own([long]$h, [string]$w) { if (-not $global:S11Own.ContainsKey([string]$h)) { throw 'not own' } }
function Test-S13Alive([long]$h) { -not $global:Dead.ContainsKey([string]$h) -and -not ([string]$h -eq '50' -and $global:State -ne 'undock') }
function Get-S13WinPid([long]$h) { 4242 }
function Test-S9Live($h) { (Test-S13Alive $h) -and $global:S9WinIds.ContainsKey([string]$h) }   # the real rule: a handle with no pid recorded at open time is not live
function Test-S11Own([long]$h) { $global:S11Own.ContainsKey([string]$h) -and (Test-S9Live $h) }
function Get-S9DocUrl([long]$h) { $global:Url }
function Open-S12DevToolsMenu([long]$h) { $global:Log += 'open'; if ($global:Opener) { $global:State = 'bottom' }; $global:Opener }
function Send-S12Escape([long]$h) { $global:Log += "esc$h" }
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
  if (-not $global:NoButton) { [pscustomobject]@{ name = 'Customize and control DevTools'; type = 'Button'; el = 'customize' } }
  foreach ($p in @(@('Undock into separate window', 'undock'), @('Dock to left', 'left'), @('Dock to bottom (Ctrl + Shift + D)', 'bottom'), @('Dock to right', 'right'))) { [pscustomobject]@{ name = $p[0]; type = 'Button'; el = "dock:$($p[1])" } }
  [pscustomobject]@{ name = 'Dock side'; type = 'Text'; el = 'label' }
}
function Get-S13Pressed($el) { if ($global:NoPressed) { return $null }; "$el" -eq "dock:$global:State" }
function Invoke-S13Item($el) { $global:Log += "inv:$el"; if ("$el" -like 'dock:*' -and $global:PressFail) { return $false }; if ("$el" -like 'dock:*') { $global:State = "$el".Substring(5) }; $true }
function T([string]$n, [scriptblock]$b) {
  Write-Host "BEGIN $n"; $global:Log = @(); $global:State = 'bottom'; $global:S11Own = @{ '1' = $true }; $global:S9WinIds = @{ '1' = 1 }; $global:S12Dev = $null; $global:Dead = @{}; $global:Url = 'http://localhost:8081/e2e-playground.html?s12=con'
  $global:Opener = $true; $global:Pane = $null; $global:Foreign = $false; $global:ForeignOther = $false; $global:NoPressed = $false; $global:NoButton = $false; $global:PressFail = $false
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

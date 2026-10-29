// Step 12 S7-helpers-b: the guards of recipes/s12-win-b.ps1 run in PowerShell with stubbed helpers (the s12-ps.test.ts pattern). Nothing
// touches Chrome, a daemon or a port. Each mutant text must flip its check (red).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = readFileSync(join(REPO, "recipes", "s12-win-b.ps1"), "utf8").replace(/\r\n/g, "\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

interface Obs { lines: string[]; result: string; ret: string }
type Groups = Record<string, Obs>;
const PRE = (src: string): string => `
$global:S11Own = @{}; $global:Clock = 1000000000000; $global:Have = @(); $global:Ui = $null; $global:Url = 'http://127.0.0.1:8081/s12-console.html'; $global:CloseOk = $true; $global:ReadCost = 0; $global:Wins = @(); $global:Reads = @{}; $global:Appear = @{}; $global:SrcPath = '${src}'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
. '${src}'
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$m) { Write-Host "STOP: $m" }
function Assert-S11Own($h, $w) { if ($h -eq 99) { throw 'not own' } }
function Get-S9DocUrl($h) { $global:Url }
function Get-S9ChromeWindows { $global:Wins }
function Start-Sleep { param([int]$Milliseconds) $global:Clock += $Milliseconds }
function Get-S12NowMs { $global:Clock }
function Test-S12DevToolsUi([long]$Hwnd, [long[]]$Before) { $global:Ui }
function Find-S12UiaByName([long]$Hwnd, [string]$Like, [string]$Kind) { Write-Host "FIND $Like"; $global:Reads[$Like] = 1 + [int]$global:Reads[$Like]; if (($global:Have -contains $Like) -and $global:Reads[$Like] -ge [int]$global:Appear[$Like]) { [pscustomobject]@{ N = $Like } } else { $null } }
function Find-S12AppMenuButton([long]$Hwnd) { Write-Host 'FIND BrowserAppMenuButton'; if ($global:Have -contains 'BrowserAppMenuButton') { [pscustomobject]@{ N = 'BrowserAppMenuButton' } } else { $null } }
function Invoke-S12UiaElement($El) { $true }
function Open-S12UiaItem($El) { $true }
function Send-S12Escape([long]$Hwnd) { Write-Host "ESCAPE $Hwnd" }
function Close-S12DevTools([long]$Hwnd) { Write-Host 'CLOSE-DEVTOOLS'; $global:CloseOk }
function Close-S9Window([long]$Hwnd) { Write-Host "CLOSEWIN $Hwnd" }
function New-S16Window([string]$Url) { Write-Host 'NEWWIN'; 55 }
function Invoke-S11Change([string]$Id, [scriptblock]$Do, [scriptblock]$Undo) { & $Do; & $Undo }
function Wait-S11Ready([string]$Id) { Write-Host "READY $Id" }
function Write-S11Pressed([string]$Id, [string]$At) { Write-Host "PRESSED $Id $At" }
function Test-S9Banner([long]$Hwnd) { $global:Clock += $global:ReadCost; if ($global:Clock - 1000000000000 -lt 300) { 1 } else { 0 } }
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; $global:Reads = @{}; $global:Appear = @{}; try { $r = & $b; Write-Host "RET $r"; Write-Host 'RESULT ok' } catch { Write-Host 'RESULT threw' } }
$FIX = 'http://127.0.0.1:8081/s12-console.html'; $ALL = @('BrowserAppMenuButton', 'More tools*', 'Developer tools*')
`;
// Re-dot-sourced bodies: the real helpers back, the UIA and key primitives stubbed below the file's own functions.
const REAL = "\n. $global:SrcPath\n";
const MKEL = `
function mkEl([string]$Kind, [bool]$Throws) {
  $global:Kind = $Kind; $global:Throws = $Throws
  $e = New-Object psobject
  Add-Member -InputObject $e -MemberType ScriptMethod -Name TryGetCurrentPattern -Value {
    param($pat, $r)
    $want = if ($global:Kind -eq 'invoke') { 'Invoke' } elseif ($global:Kind -eq 'expand') { 'ExpandCollapse' } else { 'none' }
    if ($pat.ProgrammaticName -notlike "$want*") { return $false }
    $p = New-Object psobject
    Add-Member -InputObject $p -MemberType ScriptMethod -Name Invoke -Value { if ($global:Throws) { throw 'E_FAIL' } }
    Add-Member -InputObject $p -MemberType ScriptMethod -Name Expand -Value { if ($global:Throws) { throw 'E_FAIL' } }
    $p | Add-Member -MemberType NoteProperty -Name Current -Value ([pscustomobject]@{ ExpandCollapseState = [Windows.Automation.ExpandCollapseState]::Collapsed })
    $r.Value = $p; return $true
  }
  $e
}`;
const BODY: Record<string, string> = {
  search: `${REAL}
T new-only { $global:S12Before = @(7, 8); $global:Wins = @(7, 8, 20, 21); (Get-S12SearchHwnds 7) -join ',' }
T none-new { $global:S12Before = @(7); $global:Wins = @(7); (Get-S12SearchHwnds 7) -join ',' }
T find-uses-scopes { [string]((Get-Command Find-S12UiaByName).Definition -match 'foreach \\(\\$w in \\(Get-S12SearchHwnds \\$Hwnd\\)\\)') }
function mkEl2([string]$Name, [string]$Cls, [string]$Kind = 'Button') { [pscustomobject]@{ Current = [pscustomobject]@{ Name = $Name; ClassName = $Cls; ControlType = [pscustomobject]@{ ProgrammaticName = "ControlType.$Kind" } } } }
function mkRoot([long]$H) {
  $r = [pscustomobject]@{ H = $H }
  Add-Member -InputObject $r -MemberType ScriptMethod -Name FindAll -Value {
    param($scope, $cond)
    Write-Host "COND $($cond.Property.ProgrammaticName) $($cond.Value)"
    @($global:Els[[string]$this.H] | Where-Object { $_ -and ($null -eq $cond.Value -or $_.Current.ClassName -eq $cond.Value) })
  }
  $r
}
class UiaStub {
  static [object] $RootElement = $null
  static [object] FromHandle([IntPtr]$h) { Write-Host "FH $([long]$h)"; return (mkRoot ([long]$h)) }
}
[UiaStub]::RootElement = (mkRoot 0)
$S9UIA = [UiaStub]
$global:Els = @{ '7' = @((mkEl2 'Customize and control Chrome' '')); '30' = @((mkEl2 'Chrome' 'BrowserAppMenuButton'), (mkEl2 'More tools' 'MenuItemView' 'MenuItem')) }
T find-roots { $global:S12Before = @(7, 8); $global:Wins = @(7, 8, 30); $f = Find-S12UiaByName 7 'More tools*' 'MenuItem'; Write-Host "FOUND $(if ($f) { 'yes' } else { 'no' })" }
T btn-name-only { $global:Els['7'] = @((mkEl2 'Customize and control Chrome' '')); $f = Find-S12AppMenuButton 7; Write-Host "BTN $(if ($f) { 'yes' } else { 'no' })" }
T btn-class { $global:Els['7'] = @((mkEl2 'Chrome' 'BrowserAppMenuButton')); $f = Find-S12AppMenuButton 7; Write-Host "BTN $(if ($f) { 'yes' } else { 'no' })" }
T btn-two { $global:Els['7'] = @((mkEl2 'Chrome' 'BrowserAppMenuButton'), (mkEl2 'Chrome' 'BrowserAppMenuButton')); $f = Find-S12AppMenuButton 7; Write-Host "BTN $(if ($f) { 'yes' } else { 'no' })" }
T btn-newwin { $global:S12Before = @(7); $global:Wins = @(7, 30); $global:Els['7'] = @(); $f = Find-S12AppMenuButton 7; Write-Host "BTN $(if ($f) { 'yes' } else { 'no' })" }`,
  uia: `${REAL}${MKEL}
function Send-S12Escape([long]$Hwnd) { Write-Host "ESCAPE $Hwnd" }
T inv-throw-C { $ErrorActionPreference = 'Continue'; Invoke-S12UiaElement (mkEl 'invoke' $true) }
T inv-throw-S { $ErrorActionPreference = 'Stop'; Invoke-S12UiaElement (mkEl 'invoke' $true) }
T exp-throw-C { $ErrorActionPreference = 'Continue'; Invoke-S12UiaElement (mkEl 'expand' $true) }
T exp-throw-S { $ErrorActionPreference = 'Stop'; Invoke-S12UiaElement (mkEl 'expand' $true) }
T inv-ok { Invoke-S12UiaElement (mkEl 'invoke' $false) }
T exp-ok { Invoke-S12UiaElement (mkEl 'expand' $false) }
T neither { Invoke-S12UiaElement (mkEl 'none' $false) }
T open-throw-C { $ErrorActionPreference = 'Continue'; $global:Url = $FIX; function Find-S12AppMenuButton { mkEl 'expand' $true }; Open-S12DevToolsMenu 7 }
T open-throw-S { $ErrorActionPreference = 'Stop'; $global:Url = $FIX; function Find-S12AppMenuButton { mkEl 'expand' $true }; Open-S12DevToolsMenu 7 }
T open-find-throw { $global:Url = $FIX; function Find-S12AppMenuButton { throw 'com' }; Open-S12DevToolsMenu 7 }
T open-find-throw2 { $global:Url = $FIX; function Find-S12AppMenuButton { mkEl 'expand' $false }; function Find-S12UiaByName { throw 'com' }; Open-S12DevToolsMenu 7 }`,
  item: `${REAL}
function mkItem([string]$Patterns, [string]$State, [bool]$Throws) {
  $global:IPat = $Patterns; $global:IState = $State; $global:IThrows = $Throws
  $e = New-Object psobject
  Add-Member -InputObject $e -MemberType ScriptMethod -Name TryGetCurrentPattern -Value {
    param($pat, $r)
    $n = $pat.ProgrammaticName
    $isExp = $n -like 'ExpandCollapse*'; $isInv = $n -like 'Invoke*'
    if (-not (($isExp -and $global:IPat -like '*E*') -or ($isInv -and $global:IPat -like '*I*'))) { return $false }
    $p = New-Object psobject
    Add-Member -InputObject $p -MemberType ScriptMethod -Name Invoke -Value { Write-Host 'DO INVOKE'; if ($global:IThrows) { throw 'E_FAIL' } }
    Add-Member -InputObject $p -MemberType ScriptMethod -Name Expand -Value { Write-Host 'DO EXPAND'; if ($global:IThrows) { throw 'E_FAIL' } }
    $st = if ($global:IState -eq 'Expanded') { [Windows.Automation.ExpandCollapseState]::Expanded } else { [Windows.Automation.ExpandCollapseState]::Collapsed }
    $p | Add-Member -MemberType NoteProperty -Name Current -Value ([pscustomobject]@{ ExpandCollapseState = $st })
    $r.Value = $p; return $true
  }
  $e
}
T exp-collapsed { Open-S12UiaItem (mkItem 'E' 'Collapsed' $false) }
T exp-expanded { Open-S12UiaItem (mkItem 'E' 'Expanded' $false) }
T inv-only { Open-S12UiaItem (mkItem 'I' 'Collapsed' $false) }
T both { Open-S12UiaItem (mkItem 'EI' 'Collapsed' $false) }
T neither { Open-S12UiaItem (mkItem '' 'Collapsed' $false) }
T exp-throw-C { $ErrorActionPreference = 'Continue'; Open-S12UiaItem (mkItem 'E' 'Collapsed' $true) }
T exp-throw-S { $ErrorActionPreference = 'Stop'; Open-S12UiaItem (mkItem 'E' 'Collapsed' $true) }
T inv-throw-S { $ErrorActionPreference = 'Stop'; Open-S12UiaItem (mkItem 'I' 'Collapsed' $true) }
T open-expanded { $global:Url = $FIX; function Send-S12Escape([long]$Hwnd) { Write-Host "ESCAPE $Hwnd" }; function Find-S12AppMenuButton { mkItem 'E' 'Expanded' $true }; function Find-S12UiaByName { mkItem 'E' 'Expanded' $true }; Open-S12DevToolsMenu 7 }`,
  escape: `${REAL}
Add-Type 'public static class S9Win { public static int N; public static void keybd_event(byte a, byte b, uint c, System.UIntPtr d) { N++; } }'
function Assert-S11Own($h, $w) { Write-Host "ASSERT $h"; if ($h -eq 99) { throw 'not own' } }
function Set-S9Foreground($h) { Write-Host "FG $h"; $global:Fg }
T ok { $global:Fg = $true; [S9Win]::N = 0; Send-S12Escape 7; Write-Host "KEYS $([S9Win]::N)" }
T foreign { $global:Fg = $true; [S9Win]::N = 0; try { Send-S12Escape 99 } catch { }; Write-Host "KEYS $([S9Win]::N)" }
T nofg { $global:Fg = $false; [S9Win]::N = 0; try { Send-S12Escape 7 } catch { }; Write-Host "KEYS $([S9Win]::N)" }`,
  menu: `
T off-fixture { $global:Url = 'http://localhost:8084/x.html'; $global:Have = $ALL; Open-S12DevToolsMenu 7 }
T blank { $global:Url = ''; $global:Have = $ALL; Open-S12DevToolsMenu 7 }
T foreign { $global:Url = $FIX; $global:Have = $ALL; Open-S12DevToolsMenu 99 }
T full-ui { $global:Url = $FIX; $global:Have = $ALL; $global:Ui = [pscustomobject]@{ How = 'window'; Hwnd = 9 }; Open-S12DevToolsMenu 7 }
T full-noui { $global:Url = $FIX; $global:Have = $ALL; $global:Ui = $null; Open-S12DevToolsMenu 7 }
T no-more { $global:Url = $FIX; $global:Have = @('BrowserAppMenuButton', 'Developer tools*'); Open-S12DevToolsMenu 7 }
T no-button { $global:Url = $FIX; $global:Have = @(); Open-S12DevToolsMenu 7 }
T late2 { $global:Url = $FIX; $global:Ui = [pscustomobject]@{ How = 'window'; Hwnd = 9 }; $global:Have = $ALL; $global:Appear = @{ 'More tools*' = 2 }; Open-S12DevToolsMenu 7 }
T late3 { $global:Url = $FIX; $global:Ui = [pscustomobject]@{ How = 'window'; Hwnd = 9 }; $global:Have = $ALL; $global:Appear = @{ 'Developer tools*' = 3 }; Open-S12DevToolsMenu 7 }
T never { $global:Url = $FIX; $global:Have = @('BrowserAppMenuButton', 'Developer tools*'); $c0 = $global:Clock; $r = Open-S12DevToolsMenu 7; Write-Host "ELAPSED $($global:Clock - $c0)"; $r }
T never-dev { $global:Url = $FIX; $global:Have = @('BrowserAppMenuButton', 'More tools*'); $c0 = $global:Clock; $r = Open-S12DevToolsMenu 7; Write-Host "ELAPSED $($global:Clock - $c0)"; $r }`,
  timeline: `
T cost { $global:ReadCost = 50; Invoke-S12Timeline 'R19-KEEP-1' @(7) 300 100; $global:ReadCost = 0; $global:Clock = 1000000000000 }
T reads { Invoke-S12Timeline 'R19-KEEP-1' @(7) 600 100 }
T foreign { Invoke-S12Timeline 'R19-KEEP-1' @(99) 600 100 }
T fmt { Format-S12Timeline @([pscustomobject]@{ T = 5; Seen = $true }, [pscustomobject]@{ T = 9; Seen = $false }) }`,
  probe: `
T ok { $global:CloseOk = $true; Invoke-S12DevProbe }
T left { $global:CloseOk = $false; Invoke-S12DevProbe }`,
};

function run(group: string, src: string): Groups {
  const d = mkdtempSync(join(tmpdir(), "s12psb-"));
  try {
    const sf = join(d, "s12-win-b.ps1");
    writeFileSync(sf, src, "utf8");
    const f = join(d, "t.ps1");
    writeFileSync(f, PRE(sf.replace(/'/g, "''")) + BODY[group]!, "utf8");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 60_000 });
    const g: Groups = {};
    let cur: Obs | null = null;
    for (const l of r.stdout.split(/\r?\n/)) {
      const b = /^BEGIN (\S+)/.exec(l);
      if (b) { cur = { lines: [], result: "", ret: "" }; g[b[1]!] = cur; continue; }
      if (!cur) continue;
      if (l.startsWith("RESULT ")) cur.result = l.slice(7);
      else if (l.startsWith("RET ")) cur.ret = l.slice(4);
      else cur.lines.push(l);
    }
    return g;
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}
const has = (o: Obs, re: RegExp): boolean => o.lines.some((l) => re.test(l));
const count = (o: Obs, re: RegExp): number => o.lines.filter((l) => re.test(l)).length;
const stops = (o: Obs): boolean => has(o, /^STOP: /);

const CHECKS: Record<string, Record<string, (g: Groups) => boolean>> = {
  search: {
    "X first, then only the windows opened after the press; none new: X alone": (g) => g["new-only"]!.ret === "7,20,21" && g["none-new"]!.ret === "7",
    "the finder walks those windows": (g) => g["find-uses-scopes"]!.ret === "True",
    "the finder asks UIA for exactly the search list (X, then the new window), never the desktop root, and returns a match in a new window": (g) =>
      g["find-roots"]!.lines.filter((l) => /^FH /.test(l)).join("|") === "FH 7|FH 30" && has(g["find-roots"]!, /^FOUND yes$/),
    "the app-menu button is found by ClassName BrowserAppMenuButton in X: a Name-only 'Customize and control Chrome' button no longer matches, a 'Chrome'/BrowserAppMenuButton one does": (g) =>
      has(g["btn-name-only"]!, /^BTN no$/) && has(g["btn-class"]!, /^BTN yes$/) && has(g["btn-class"]!, /^COND .*ClassName.* BrowserAppMenuButton$/),
    "two matches is not found, and only window X is searched (a match in a new window is ignored)": (g) =>
      has(g["btn-two"]!, /^BTN no$/) && has(g["btn-newwin"]!, /^BTN no$/) && g["btn-newwin"]!.lines.filter((l) => /^FH /.test(l)).join("|") === "FH 7",
  },
  uia: {
    "a pattern that throws gives false under Continue and Stop, never a throw, never a false true": (g) =>
      ["inv-throw-C", "inv-throw-S", "exp-throw-C", "exp-throw-S"].every((k) => g[k]!.result === "ok" && g[k]!.ret === "False"),
    "a working pattern gives true; an element with neither gives false": (g) => g["inv-ok"]!.ret === "True" && g["exp-ok"]!.ret === "True" && g.neither!.ret === "False",
    "the opener with a throwing press: found=no, Escape to X, false, no throw, no found=yes (Continue and Stop)": (g) =>
      ["open-throw-C", "open-throw-S"].every((k) => g[k]!.result === "ok" && g[k]!.ret === "False" && has(g[k]!, /step=menu-button found=no/) && has(g[k]!, /^ESCAPE 7/) && !has(g[k]!, /found=yes/)),
    "a throw while finding is found=no too (the button finder and the by-name finder)": (g) =>
      ["open-find-throw", "open-find-throw2"].every((k) => g[k]!.result === "ok" && g[k]!.ret === "False" && has(g[k]!, /^ESCAPE 7/)),
  },
  item: {
    "ExpandCollapse not yet expanded: Expand, true, no Invoke": (g) => g["exp-collapsed"]!.ret === "True" && has(g["exp-collapsed"]!, /^DO EXPAND$/) && !has(g["exp-collapsed"]!, /^DO INVOKE$/),
    "already Expanded: no second Expand (it threw 0x80131509), true": (g) => g["exp-expanded"]!.ret === "True" && !has(g["exp-expanded"]!, /^DO /),
    "Invoke-only item: Invoke; an item offering both: Expand; neither: false": (g) =>
      g["inv-only"]!.ret === "True" && has(g["inv-only"]!, /^DO INVOKE$/) && g.both!.ret === "True" && has(g.both!, /^DO EXPAND$/) && !has(g.both!, /^DO INVOKE$/) && g.neither!.ret === "False",
    "a throwing pattern gives false under Continue and Stop, never a throw": (g) =>
      ["exp-throw-C", "exp-throw-S", "inv-throw-S"].every((k) => g[k]!.result === "ok" && g[k]!.ret === "False"),
    "the opener presses with Open-S12UiaItem: already-Expanded items whose Expand throws are found=yes, no Expand, no Escape": (g) =>
      has(g["open-expanded"]!, /step=more-tools found=yes/) && has(g["open-expanded"]!, /step=developer-tools found=yes/) && !has(g["open-expanded"]!, /found=no$|^DO |^ESCAPE/),
  },
  escape: {
    "own check, then foreground, then the two key events": (g) => {
      const l = g.ok!.lines;
      return l.indexOf("ASSERT 7") >= 0 && l.indexOf("ASSERT 7") < l.indexOf("FG 7") && has(g.ok!, /^KEYS 2$/);
    },
    "a foreign window: no foreground call, no key": (g) => !has(g.foreign!, /^FG /) && has(g.foreign!, /^KEYS 0$/),
    "not in the foreground: a STOP and no key": (g) => has(g.nofg!, /^STOP: /) && has(g.nofg!, /^FG 7$/) && has(g.nofg!, /^KEYS 0$/),
  },
  menu: {
    "a window that is not on an 8081 fixture, a blank URL or a foreign window: a throw, no UIA lookup": (g) =>
      g["off-fixture"]!.result === "threw" && stops(g["off-fixture"]!) && count(g["off-fixture"]!, /^FIND /) === 0 && g.blank!.result === "threw" && count(g.blank!, /^FIND /) === 0 && g.foreign!.result === "threw" && count(g.foreign!, /^FIND /) === 0,
    "all three steps found: true, the DevTools window recorded as the wave's own, no Escape": (g) =>
      g["full-ui"]!.ret === "True" && count(g["full-ui"]!, /^FIND /) === 3 && has(g["full-ui"]!, /step=developer-tools found=yes/) && !has(g["full-ui"]!, /^ESCAPE/),
    "all three steps invoked but no DevTools UI: false, no throw, no STOP (the UI never decides the probe)": (g) =>
      g["full-noui"]!.ret === "False" && g["full-noui"]!.result === "ok" && !stops(g["full-noui"]!) && has(g["full-noui"]!, /found=none/),
    "a missing step: false, Escape to the window, the later steps not looked for": (g) =>
      g["no-more"]!.ret === "False" && has(g["no-more"]!, /step=more-tools found=no/) && has(g["no-more"]!, /^ESCAPE 7/) && count(g["no-more"]!, /^FIND Developer/) === 0 && count(g["no-more"]!, /^FIND More/) > 1 && g["no-button"]!.ret === "False" && count(g["no-button"]!, /^FIND /) === 1,
    "a menu item that appears on the 2nd or 3rd read is found and opened; the button is read once": (g) =>
      g.late2!.ret === "True" && count(g.late2!, /^FIND More/) === 2 && has(g.late2!, /step=more-tools found=yes/) && !has(g.late2!, /^ESCAPE/) &&
      g.late3!.ret === "True" && count(g.late3!, /^FIND Developer/) === 3 && count(g.late3!, /^FIND BrowserAppMenuButton/) === 1,
    "an item that never appears: found=no and Escape after a poll bounded to 3 000 ms from the previous success (every 200 ms), for both items": (g) => {
      const e = (o: Obs): number => Number(/^ELAPSED (\d+)$/.exec(o.lines.find((l) => /^ELAPSED /.test(l)) ?? "")?.[1] ?? "-1");
      return g.never!.ret === "False" && has(g.never!, /step=more-tools found=no/) && has(g.never!, /^ESCAPE 7/) && e(g.never!) >= 3000 && e(g.never!) <= 3200 &&
        count(g.never!, /^FIND More/) >= 10 && count(g.never!, /^FIND Developer/) === 0 &&
        g["never-dev"]!.ret === "False" && has(g["never-dev"]!, /step=developer-tools found=no/) && has(g["never-dev"]!, /^ESCAPE 7/) && e(g["never-dev"]!) >= 3700 && e(g["never-dev"]!) <= 4000 &&
        count(g["never-dev"]!, /^FIND Developer/) >= 10;
    },
    "no line prints a name, a URL or a title": (g) => !JSON.stringify(g).includes("s12-console"),
  },
  timeline: {
    "reads for the whole duration, 1 then 0, epoch-ms stamps, counted line only": (g) =>
      g.reads!.result === "ok" && has(g.reads!, /^PRESSED R19-KEEP-1-timeline 1000000000\d{3}:1,(\d+:[01],)*\d+:0$/) && has(g.reads!, /^SAY TIMELINE R19-KEEP-1 reads=[5-9]$/),
    "a window that is not the wave's: a throw before any read": (g) => g.foreign!.result === "threw" && !has(g.foreign!, /^PRESSED/),
    "the first read is stamped before the read, not after it (a slow read must not bias the stamp), and a start line is printed": (g) =>
      has(g.cost!, /^PRESSED R19-KEEP-1-timeline 1000000000000:1,/) && has(g.cost!, /^SAY TIMELINE R19-KEEP-1 started$/),
    "Format-S12Timeline is t:flag pairs joined by commas": (g) => g.fmt!.ret === "5:1,9:0",
  },
  probe: {
    "DevTools closed: X closed, true": (g) => g.ok!.ret === "True" && has(g.ok!, /^CLOSEWIN 55/) && has(g.ok!, /^CLOSE-DEVTOOLS/),
    "DevTools left: false and X is NOT closed (a STOP return, not a hidden close)": (g) => g.left!.ret === "False" && !has(g.left!, /^CLOSEWIN/),
  },
};

// [name, group, check that must flip, text to replace, replacement]
const MUTANTS: Array<[string, string, string, string, string]> = [
  ["B1 fixture check removed", "menu", "a window that is not on an 8081 fixture, a blank URL or a foreign window: a throw, no UIA lookup", "-notmatch '^http://(127\\.0\\.0\\.1|localhost):8081/'", "-notmatch '^$'"],
  ["B2 8084 allowed", "menu", "a window that is not on an 8081 fixture, a blank URL or a foreign window: a throw, no UIA lookup", "localhost):8081/'", "localhost):(8081|8084)/'"],
  ["B3 a missing step passes", "menu", "a missing step: false, Escape to the window, the later steps not looked for", "Send-S12Escape $Hwnd; return $false }", "Send-S12Escape $Hwnd; return $true }"],
  ["B4 no Escape after a miss", "menu", "a missing step: false, Escape to the window, the later steps not looked for", "Send-S12Escape $Hwnd; return $false }", "return $false }"],
  ["B5 the UI decides (STOP when it is absent)", "menu", "all three steps invoked but no DevTools UI: false, no throw, no STOP (the UI never decides the probe)", "[bool]$seen\n}", "if (-not $seen) { Stop9 'no ui' }; [bool]$seen\n}"],
  ["B6 one read only", "timeline", "reads for the whole duration, 1 then 0, epoch-ms stamps, counted line only", "} while (((Get-S12NowMs) - $t0) -lt $DurationMs)", "} while ($false)"],
  ["B7 own check dropped", "timeline", "a window that is not the wave's: a throw before any read", "foreach ($h in $Hwnds) { Assert-S11Own $h 'banner timeline' }", ""],
  ["B8 X closed after a left DevTools", "probe", "DevTools left: false and X is NOT closed (a STOP return, not a hidden close)", "if ($global:S12Left) { return $false }\n  Close-S9Window", "Close-S9Window"],
  ["B9 stamp after the read", "timeline", "the first read is stamped before the read, not after it (a slow read must not bias the stamp), and a start line is printed", "$stamp = Get-S12NowMs\n    $n = 0; foreach ($h in $Hwnds) { if ((Test-S9Banner $h) -gt 0) { $n++ } }\n    [void]$reads.Add([pscustomobject]@{ T = $stamp;", "$n = 0; foreach ($h in $Hwnds) { if ((Test-S9Banner $h) -gt 0) { $n++ } }\n    [void]$reads.Add([pscustomobject]@{ T = (Get-S12NowMs);"],
  ["B10 no start line", "timeline", "the first read is stamped before the read, not after it (a slow read must not bias the stamp), and a start line is printed", 'Say9 "TIMELINE $Row started"', ""],
  ["B11 X-only scope", "search", "X first, then only the windows opened after the press; none new: X alone", "@($Hwnd) + $new", "@($Hwnd)"],
  ["B12 no before filter", "search", "X first, then only the windows opened after the press; none new: X alone", "-notcontains $_ })", "-ne 0 })"],
  ["B13 finder X only", "search", "the finder walks those windows", "foreach ($w in (Get-S12SearchHwnds $Hwnd))", "foreach ($w in @($Hwnd))"],
  ["B13b finder walks the desktop root", "search", "the finder asks UIA for exactly the search list (X, then the new window), never the desktop root, and returns a match in a new window", "$S9UIA::FromHandle([IntPtr]$w)", "$S9UIA::RootElement"],
  ["B14 a throw is rethrown", "uia", "a pattern that throws gives false under Continue and Stop, never a throw, never a false true", "} catch { return $false }", "} catch { throw }"],
  ["B15 a throw counts as invoked", "uia", "a pattern that throws gives false under Continue and Stop, never a throw, never a false true", "} catch { return $false }", "} catch { return $true }"],
  ["B16 the item press rethrows (seen through the opener)", "uia", "the opener with a throwing press: found=no, Escape to X, false, no throw, no found=yes (Continue and Stop)", "  } catch { return $false }\n  $false\n}\n# Escape", "  } catch { throw }\n  $false\n}\n# Escape"],
  ["B18 escape: own check removed", "escape", "a foreign window: no foreground call, no key", "  Assert-S11Own $Hwnd 'menu escape'\n", ""],
  ["B19 escape: foreground not checked", "escape", "not in the foreground: a STOP and no key", "  if (-not (Set-S9Foreground $Hwnd)) { Stop9 \"window $Hwnd is not in the foreground - no key sent\"; throw 'not in the foreground' }\n", "  [void](Set-S9Foreground $Hwnd)\n"],
  ["B20 escape: foreground before own check", "escape", "own check, then foreground, then the two key events", "  Assert-S11Own $Hwnd 'menu escape'\n  if (-not (Set-S9Foreground $Hwnd))", "  [void](Set-S9Foreground $Hwnd)\n  Assert-S11Own $Hwnd 'menu escape'\n  if (-not (Set-S9Foreground $Hwnd))"],
  ["B17 a find throw escapes", "uia", "a throw while finding is found=no too (the button finder and the by-name finder)", "} catch { $el = $null }", "} catch { throw }"],
  ["B21 button by name again", "search", "the app-menu button is found by ClassName BrowserAppMenuButton in X: a Name-only 'Customize and control Chrome' button no longer matches, a 'Chrome'/BrowserAppMenuButton one does", "'BrowserAppMenuButton')", "'Chrome')"],
  ["B22 two matches accepted", "search", "two matches is not found, and only window X is searched (a match in a new window is ignored)", "if ($b.Count -eq 1)", "if ($b.Count -ge 1)"],
  ["B23 expand always", "item", "already Expanded: no second Expand (it threw 0x80131509), true", "if ($p.Current.ExpandCollapseState -ne [Windows.Automation.ExpandCollapseState]::Expanded) { $p.Expand() }", "$p.Expand()"],
  ["B24 invoke before expand", "item", "Invoke-only item: Invoke; an item offering both: Expand; neither: false", "[ref]$p)) {\n      if ($p.Current", "[ref]$p)) { $p.Invoke(); return $true }\n    if ($El.TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$p)) {\n      if ($p.Current"],
  ["B26 opener presses with Invoke-S12UiaElement", "item", "the opener presses with Open-S12UiaItem: already-Expanded items whose Expand throws are found=yes, no Expand, no Escape", "-not (Open-S12UiaItem $el)", "-not (Invoke-S12UiaElement $el)"],
  ["B27 items read once (no poll)", "menu", "a menu item that appears on the 2nd or 3rd read is found and opened; the button is read once", "if ($el -or $s[0] -eq 'menu-button' -or ((Get-S12NowMs) - $t0) -ge 3000) { break }", "break"],
  ["B28 bound 300 ms", "menu", "an item that never appears: found=no and Escape after a poll bounded to 3 000 ms from the previous success (every 200 ms), for both items", "-ge 3000) { break }", "-ge 300) { break }"],
  ["B29 bound 30 000 ms", "menu", "an item that never appears: found=no and Escape after a poll bounded to 3 000 ms from the previous success (every 200 ms), for both items", "-ge 3000) { break }", "-ge 30000) { break }"],
  ["B30 button polled too", "menu", "a missing step: false, Escape to the window, the later steps not looked for", "-or $s[0] -eq 'menu-button' -or", "-or"],
  ["B25 item throw escapes", "item", "a throwing pattern gives false under Continue and Stop, never a throw", "  } catch { return $false }\n  $false\n}\n# Escape", "  } catch { throw }\n  $false\n}\n# Escape"],
];

describe.skipIf(!hasPs)("s12-win-b.ps1 guards, run with stubbed helpers", { timeout: 120_000 }, () => {
  it("the file sends no F12 / Ctrl+Shift+I key (the method that attached nothing twice)", () => {
    expect(SRC).not.toMatch(/0x7B|CtrlShiftI|'F12'/);
  });
  for (const grp of Object.keys(CHECKS)) {
    it(`${grp}: every check holds on the real file`, () => {
      const g = run(grp, SRC);
      for (const [name, f] of Object.entries(CHECKS[grp]!)) expect(f(g), name).toBe(true);
    });
  }
  for (const [name, grp, check, from, to] of MUTANTS) {
    it(`mutant ${name} turns "${check}" red`, () => {
      expect(SRC, "the mutated text is in the file").toContain(from);
      expect(CHECKS[grp]![check]!(run(grp, SRC.replace(from, to))), name).toBe(false);
    });
  }
});

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
$global:S11Own = @{}; $global:Clock = 1000000000000; $global:Have = @(); $global:Ui = $null; $global:Url = 'http://127.0.0.1:8081/s12-console.html'; $global:CloseOk = $true; $global:ReadCost = 0; $global:Wins = @(); $global:SrcPath = '${src}'
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
function Find-S12UiaByName([long]$Hwnd, [string]$Like, [string]$Kind) { Write-Host "FIND $Like"; if ($global:Have -contains $Like) { [pscustomobject]@{ N = $Like } } else { $null } }
function Invoke-S12UiaElement($El) { $true }
function Send-S12Escape([long]$Hwnd) { Write-Host "ESCAPE $Hwnd" }
function Close-S12DevTools([long]$Hwnd) { Write-Host 'CLOSE-DEVTOOLS'; $global:CloseOk }
function Close-S9Window([long]$Hwnd) { Write-Host "CLOSEWIN $Hwnd" }
function New-S16Window([string]$Url) { Write-Host 'NEWWIN'; 55 }
function Invoke-S11Change([string]$Id, [scriptblock]$Do, [scriptblock]$Undo) { & $Do; & $Undo }
function Wait-S11Ready([string]$Id) { Write-Host "READY $Id" }
function Write-S11Pressed([string]$Id, [string]$At) { Write-Host "PRESSED $Id $At" }
function Test-S9Banner([long]$Hwnd) { $global:Clock += $global:ReadCost; if ($global:Clock - 1000000000000 -lt 300) { 1 } else { 0 } }
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; try { $r = & $b; Write-Host "RET $r"; Write-Host 'RESULT ok' } catch { Write-Host 'RESULT threw' } }
$FIX = 'http://127.0.0.1:8081/s12-console.html'; $ALL = @('Customize and control*', 'More tools*', 'Developer tools*')
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
    $r.Value = $p; return $true
  }
  $e
}`;
const BODY: Record<string, string> = {
  search: `${REAL}
T new-only { $global:S12Before = @(7, 8); $global:Wins = @(7, 8, 20, 21); (Get-S12SearchHwnds 7) -join ',' }
T none-new { $global:S12Before = @(7); $global:Wins = @(7); (Get-S12SearchHwnds 7) -join ',' }
T find-uses-scopes { [string]((Get-Command Find-S12UiaByName).Definition -match 'foreach \\(\\$w in \\(Get-S12SearchHwnds \\$Hwnd\\)\\)') }
function mkRoot([long]$H) {
  $r = [pscustomobject]@{ H = $H }
  Add-Member -InputObject $r -MemberType ScriptMethod -Name FindAll -Value {
    param($scope, $cond)
    if ($this.H -ne 30) { return @() }
    @([pscustomobject]@{ Current = [pscustomobject]@{ Name = 'Customize and control Chrome'; ControlType = [pscustomobject]@{ ProgrammaticName = 'ControlType.Button' } } })
  }
  $r
}
class UiaStub {
  static [object] $RootElement = $null
  static [object] FromHandle([IntPtr]$h) { Write-Host "FH $([long]$h)"; return (mkRoot ([long]$h)) }
}
[UiaStub]::RootElement = (mkRoot 0)
$S9UIA = [UiaStub]
T find-roots { $global:S12Before = @(7, 8); $global:Wins = @(7, 8, 30); $f = Find-S12UiaByName 7 'Customize and control*' 'Button'; Write-Host "FOUND $(if ($f) { 'yes' } else { 'no' })"; Write-Host "BYHWND-OTHER $(@(Find-S12UiaByName 7 'More tools*' 'MenuItem').Count)" }`,
  uia: `${REAL}${MKEL}
function Send-S12Escape([long]$Hwnd) { Write-Host "ESCAPE $Hwnd" }
T inv-throw-C { $ErrorActionPreference = 'Continue'; Invoke-S12UiaElement (mkEl 'invoke' $true) }
T inv-throw-S { $ErrorActionPreference = 'Stop'; Invoke-S12UiaElement (mkEl 'invoke' $true) }
T exp-throw-C { $ErrorActionPreference = 'Continue'; Invoke-S12UiaElement (mkEl 'expand' $true) }
T exp-throw-S { $ErrorActionPreference = 'Stop'; Invoke-S12UiaElement (mkEl 'expand' $true) }
T inv-ok { Invoke-S12UiaElement (mkEl 'invoke' $false) }
T exp-ok { Invoke-S12UiaElement (mkEl 'expand' $false) }
T neither { Invoke-S12UiaElement (mkEl 'none' $false) }
T open-throw-C { $ErrorActionPreference = 'Continue'; $global:Url = $FIX; function Find-S12UiaByName { mkEl 'expand' $true }; Open-S12DevToolsMenu 7 }
T open-throw-S { $ErrorActionPreference = 'Stop'; $global:Url = $FIX; function Find-S12UiaByName { mkEl 'expand' $true }; Open-S12DevToolsMenu 7 }
T open-find-throw { $global:Url = $FIX; function Find-S12UiaByName { throw 'com' }; Open-S12DevToolsMenu 7 }`,
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
T no-more { $global:Url = $FIX; $global:Have = @('Customize and control*', 'Developer tools*'); Open-S12DevToolsMenu 7 }
T no-button { $global:Url = $FIX; $global:Have = @(); Open-S12DevToolsMenu 7 }`,
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
      g["find-roots"]!.lines.filter((l) => /^FH /.test(l)).join("|") === "FH 7|FH 30|FH 7|FH 30" && has(g["find-roots"]!, /^FOUND yes$/),
  },
  uia: {
    "a pattern that throws gives false under Continue and Stop, never a throw, never a false true": (g) =>
      ["inv-throw-C", "inv-throw-S", "exp-throw-C", "exp-throw-S"].every((k) => g[k]!.result === "ok" && g[k]!.ret === "False"),
    "a working pattern gives true; an element with neither gives false": (g) => g["inv-ok"]!.ret === "True" && g["exp-ok"]!.ret === "True" && g.neither!.ret === "False",
    "the opener with a throwing press: found=no, Escape to X, false, no throw, no found=yes (Continue and Stop)": (g) =>
      ["open-throw-C", "open-throw-S"].every((k) => g[k]!.result === "ok" && g[k]!.ret === "False" && has(g[k]!, /step=menu-button found=no/) && has(g[k]!, /^ESCAPE 7/) && !has(g[k]!, /found=yes/)),
    "a throw while finding is found=no too": (g) => g["open-find-throw"]!.result === "ok" && g["open-find-throw"]!.ret === "False" && has(g["open-find-throw"]!, /^ESCAPE 7/),
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
      g["no-more"]!.ret === "False" && has(g["no-more"]!, /step=more-tools found=no/) && has(g["no-more"]!, /^ESCAPE 7/) && count(g["no-more"]!, /^FIND /) === 2 && g["no-button"]!.ret === "False" && count(g["no-button"]!, /^FIND /) === 1,
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
  ["B16 no try around Invoke", "uia", "the opener with a throwing press: found=no, Escape to X, false, no throw, no found=yes (Continue and Stop)", "  try {\n    if ($El.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return $true }\n    if ($El.TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$p)) { $p.Expand(); return $true }\n  } catch { return $false }", "  if ($El.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return $true }\n  if ($El.TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$p)) { $p.Expand(); return $true }"],
  ["B17 a find throw escapes", "uia", "a throw while finding is found=no too", "} catch { $el = $null }", "} catch { throw }"],
  ["B18 escape: own check removed", "escape", "a foreign window: no foreground call, no key", "  Assert-S11Own $Hwnd 'menu escape'\n", ""],
  ["B19 escape: foreground not checked", "escape", "not in the foreground: a STOP and no key", "  if (-not (Set-S9Foreground $Hwnd)) { Stop9 \"window $Hwnd is not in the foreground - no key sent\"; throw 'not in the foreground' }\n", "  [void](Set-S9Foreground $Hwnd)\n"],
  ["B20 escape: foreground before own check", "escape", "own check, then foreground, then the two key events", "  Assert-S11Own $Hwnd 'menu escape'\n  if (-not (Set-S9Foreground $Hwnd))", "  [void](Set-S9Foreground $Hwnd)\n  Assert-S11Own $Hwnd 'menu escape'\n  if (-not (Set-S9Foreground $Hwnd))"],
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

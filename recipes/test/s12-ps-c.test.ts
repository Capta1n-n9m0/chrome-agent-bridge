// Step 12 S7-helpers-c: the native file-dialog closer, the human-style click and the CLOSERPROBE of recipes/s12-win-c.ps1, run in PowerShell with the
// UIA, key and mouse primitives stubbed (the s12-ps-b.test.ts pattern). No real UIA call, no Chrome, no dialog. Each mutant text must flip its check.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = readFileSync(join(REPO, "recipes", "s12-win-c.ps1"), "utf8").replace(/\r\n/g, "\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

interface Obs { lines: string[]; result: string }
const PRE = (src: string): string => `
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$global:S11Own = @{ '1' = $true; '55' = $true }; $global:Clock = 1000000000000; $global:Dialogs = @(); $global:Fg = 0; $global:FgOk = $true
$global:CloseWorks = $false; $global:CancelWorks = $false; $global:EscWorks = $false; $global:HasCancel = $true
$global:Url = 'http://localhost:8081/s12-chooser.html'; $global:El = $null; $global:ER = $null; $global:WR = $null; $global:Click = $true; $global:At = 1
. '${src}'
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$m) { Write-Host "STOP: $m" }
function Assert-S11Own($h, $w) { if ($h -eq 99) { throw 'not own' } }
function Start-Sleep { param([int]$Milliseconds) $global:Clock += $Milliseconds }
function Get-S12NowMs { $global:Clock }
function Get-S12AllDialogs { $global:Dialogs }
function Drop-Dlg([long]$h) { $global:Dialogs = @($global:Dialogs | Where-Object { $_.Hwnd -ne $h }) }
function Dlg([long]$h, [long]$own) { [pscustomobject]@{ Hwnd = $h; Owner = $own } }
function Invoke-S12WindowClose([long]$Hwnd) { Write-Host "LOG closepat $Hwnd"; if ($global:CloseWorks) { Drop-Dlg $Hwnd; $true } else { $false } }
function Find-S12DialogButton([long]$Hwnd, [string]$Like) { if ($global:HasCancel) { [pscustomobject]@{ Dlg = $Hwnd } } else { $null } }
function Invoke-S12UiaElement($El) { Write-Host "LOG cancel $($El.Dlg)"; if ($global:CancelWorks) { Drop-Dlg $El.Dlg; $true } else { $false } }
function Set-S9Foreground([long]$h) { Write-Host "LOG fg $h"; if ($global:FgOk) { $global:Fg = $h }; $global:FgOk }
function Get-S12Foreground { $global:Fg }
function Send-S12EscapeKey { Write-Host "LOG esckey $($global:Fg)"; if ($global:EscWorks) { Drop-Dlg $global:Fg } }
function Get-S9DocUrl($h) { $global:Url }
function Find-S12UiaByName([long]$Hwnd, [string]$Like, [string]$Kind) { Write-Host 'LOG widesearch'; $global:El }
function Find-S12ClickTarget([long]$Hwnd, [string]$Like) { Write-Host "LOG search $Hwnd"; $global:El }
function Get-S12WindowAtPoint([int]$X, [int]$Y) { $global:At }
function Get-S12ElementRect($El) { $global:ER }
function Get-S12WindowRect([long]$Hwnd) { $global:WR }
function Send-S12MouseClick([int]$X, [int]$Y) { Write-Host "LOG click $X $Y" }
function New-S16Window([string]$Url) { Write-Host 'LOG newwin'; 55 }
function Test-S9Live($h) { $true }
function Close-S9Window([long]$h) { Write-Host "LOG closewin $h" }
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; $global:Clock = 1000000000000; $global:Dialogs = @(); $global:Fg = 0; $global:FgOk = $true; $global:CloseWorks = $false; $global:CancelWorks = $false; $global:EscWorks = $false; $global:HasCancel = $true; $global:Click = $true; $global:At = 1; $global:Url = 'http://localhost:8081/s12-chooser.html'; try { & $b; Write-Host 'RESULT ok' } catch { Write-Host 'RESULT threw' } }
function Show($r) { Write-Host "R closed=$($r.Closed) method=$($r.Method) left=$($r.Left) ms=$($r.Ms)" }
`;
const BODY: Record<string, string> = {
  closer: `
T none { Show (Close-S12Dialog 1) }
T pattern { $global:Dialogs = @((Dlg 100 1), (Dlg 200 5)); $global:CloseWorks = $true; Show (Close-S12Dialog 1); Write-Host "REMAIN $(@($global:Dialogs | ForEach-Object { $_.Hwnd }) -join ',')" }
T cancel { $global:Dialogs = @((Dlg 100 1)); $global:CancelWorks = $true; Show (Close-S12Dialog 1) }
T nocancelbutton { $global:Dialogs = @((Dlg 100 1)); $global:HasCancel = $false; $global:EscWorks = $true; Show (Close-S12Dialog 1) }
T escape { $global:Dialogs = @((Dlg 100 1)); $global:EscWorks = $true; $global:Fg = 7; Show (Close-S12Dialog 1) }
T escape-wrong-fg { $global:Dialogs = @((Dlg 100 1)); $global:EscWorks = $true; $global:FgOk = $false; $global:Fg = 777; Show (Close-S12Dialog 1) }
T foreign-only { $global:Dialogs = @((Dlg 200 5)); $global:CloseWorks = $true; $global:CancelWorks = $true; $global:EscWorks = $true; Show (Close-S12Dialog 1) }
T two-owners { $global:Dialogs = @((Dlg 100 1), (Dlg 200 5)); $global:CancelWorks = $true; $global:EscWorks = $true; Show (Close-S12Dialog 1); Write-Host "REMAIN $(@($global:Dialogs | ForEach-Object { $_.Hwnd }) -join ',')" }
T watchdog { $global:Dialogs = @((Dlg 100 1)); Show (Close-S12Dialog 1 1000) }
T default-watchdog { Write-Host "WD $S12CloserWatchdogMs" }
T own-only { $global:Dialogs = @((Dlg 100 1)); Show (Close-S12Dialog 99) }`,
  guards: `
T cancel-foreign { $global:Dialogs = @((Dlg 200 5)); Write-Host "RET $(Invoke-S12DialogCancel 1 200)" }
T pattern-foreign { $global:Dialogs = @((Dlg 200 5)); Write-Host "RET $(Invoke-S12DialogClosePattern 1 200)" }
T escape-foreign { $global:Dialogs = @((Dlg 200 5)); $global:Fg = 200; Write-Host "RET $(Send-S12DialogEscape 1 200)" }
T escape-owned { $global:Dialogs = @((Dlg 100 1)); Write-Host "RET $(Send-S12DialogEscape 1 100)" }
T escape-owned-notfront { $global:Dialogs = @((Dlg 100 1)); $global:FgOk = $false; $global:Fg = 5; Write-Host "RET $(Send-S12DialogEscape 1 100)" }`,
  human: `
function Ready { $global:El = [pscustomobject]@{ N = 1 }; $global:ER = [pscustomobject]@{ L = 100; T = 200; R = 140; B = 220 }; $global:WR = [pscustomobject]@{ L = 0; T = 0; R = 800; B = 600 } }
T ok { Ready; Write-Host "RET $(Invoke-S12HumanClick 1)" }
T foreign { Ready; Invoke-S12HumanClick 99 }
T off-fixture { Ready; $global:Url = 'http://localhost:8084/x.html'; Invoke-S12HumanClick 1 }
T no-target { Ready; $global:El = $null; Write-Host "RET $(Invoke-S12HumanClick 1)" }
T outside { Ready; $global:ER = [pscustomobject]@{ L = 900; T = 200; R = 940; B = 220 }; Write-Host "RET $(Invoke-S12HumanClick 1)" }
T other-window { Ready; $global:At = 4242; Write-Host "RET $(Invoke-S12HumanClick 1)" }
T no-at-point { Ready; $global:At = 0; Write-Host "RET $(Invoke-S12HumanClick 1)" }
T searchlist { Write-Host "LIST $((Get-S12ClickSearchHwnds 7) -join ',')" }
T not-front { Ready; $global:FgOk = $false; $global:Fg = 5; Write-Host "RET $(Invoke-S12HumanClick 1)" }`,
  probe: `
function Invoke-S12HumanClick([long]$Hwnd) { Write-Host 'LOG human'; if ($global:Click) { $global:Dialogs = @((Dlg 100 $Hwnd)) }; $global:Click }
function Wait-S12DialogOpen([long]$Hwnd, [int]$MaxMs = 3000) { if ($global:NoOpen) { 0 } else { Get-S12DialogCount $Hwnd } }
T pass { $global:CloseWorks = $true; Write-Host "RET $(Invoke-S12CloserProbe)" }
T not-opened { $global:Click = $false; Write-Host "RET $(Invoke-S12CloserProbe)" }
T left { Write-Host "RET $(Invoke-S12CloserProbe)" }
T late-dialog { $global:NoOpen = $true; $global:Click = $false; $global:Dialogs = @((Dlg 300 55)); Write-Host "RET $(Invoke-S12CloserProbe)" }`,
  realtypes: `
. '__SRC__'
$t = Get-Content -Raw -Encoding UTF8 '__S9WIN__'
foreach ($m in [regex]::Matches($t, "(?s)Add-Type -TypeDefinition @'\\r?\\n(.*?)\\r?\\n'@")) { if ($m.Groups[1].Value -match 'class (S9Win|S9Geo)\\b') { Add-Type -TypeDefinition $m.Groups[1].Value } }
T rect { $r = Get-S12WindowRect 0; Write-Host "RECT $($r.L) $($r.R)" }
T members { Write-Host "KEYBD $([bool]([S9Win].GetMethod('keybd_event'))) RECTM $([bool]([S9Geo].GetMethod('Rect')))" }`,
};

function run(group: string, src: string): Record<string, Obs> {
  const d = mkdtempSync(join(tmpdir(), "s12psc-"));
  try {
    const sf = join(d, "s12-win-c.ps1");
    writeFileSync(sf, src, "utf8");
    const f = join(d, "t.ps1");
    writeFileSync(f, PRE(sf.replace(/'/g, "''")) + BODY[group]!.replace("__S9WIN__", S9WIN.replace(/'/g, "''")).replace("__SRC__", sf.replace(/'/g, "''")), "utf8");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 90_000 });
    if (process.env.S12PS_DEBUG) console.log(group, r.stdout, r.stderr);
    const g: Record<string, Obs> = {};
    let cur: Obs | null = null;
    for (const l of r.stdout.split(/\r?\n/)) {
      const b = /^BEGIN (\S+)/.exec(l);
      if (b) { cur = { lines: [], result: "" }; g[b[1]!] = cur; continue; }
      if (!cur) continue;
      if (l.startsWith("RESULT ")) cur.result = l.slice(7); else cur.lines.push(l);
    }
    return g;
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}
const has = (o: Obs, re: RegExp): boolean => o.lines.some((l) => re.test(l));
const logs = (o: Obs): string[] => o.lines.filter((l) => l.startsWith("LOG ")).map((l) => l.slice(4));
const S9WIN = join(REPO, "recipes", "s9-win.ps1");
const mut = (from: string, to: string): string => {
  expect(SRC.split(from).length, `mutant anchor: ${from}`).toBe(2);
  return SRC.replace(from, to);
};
const d = hasPs ? describe : describe.skip;

// the checks, each as a predicate over the observations so a mutant can be run through the same predicate
const closerChecks = {
  onlyOwned: (g: Record<string, Obs>) => !logs(g["pattern"]!).some((l) => /\b200\b/.test(l)) && has(g["pattern"]!, /^REMAIN 200$/),
  foreignUntouched: (g: Record<string, Obs>) => logs(g["foreign-only"]!).length === 0 && has(g["foreign-only"]!, /R closed=True method=none/),
  twoOwners: (g: Record<string, Obs>) => !logs(g["two-owners"]!).some((l) => /\b200\b/.test(l)) && has(g["two-owners"]!, /^REMAIN 200$/),
  escapeFront: (g: Record<string, Obs>) => !logs(g["escape-wrong-fg"]!).some((l) => l.startsWith("esckey")),
};
const guardChecks = {
  cancel: (g: Record<string, Obs>) => logs(g["cancel-foreign"]!).length === 0 && has(g["cancel-foreign"]!, /^RET False$/),
  pattern: (g: Record<string, Obs>) => logs(g["pattern-foreign"]!).length === 0 && has(g["pattern-foreign"]!, /^RET False$/),
  escape: (g: Record<string, Obs>) => logs(g["escape-foreign"]!).length === 0 && has(g["escape-foreign"]!, /^RET False$/),
  escapeFront: (g: Record<string, Obs>) => !logs(g["escape-owned-notfront"]!).some((l) => l.startsWith("esckey")),
};

d("the closer (Open item 12): owner X, close pattern, Cancel, Escape to that dialog only, under a watchdog", () => {
  const g = run("closer", SRC);
  it("nothing to close: closed, no action", () => {
    expect(has(g["none"]!, /R closed=True method=none left=0/)).toBe(true);
    expect(logs(g["none"]!)).toEqual([]);
  });
  it("the close pattern first, on X's dialog only; another window's dialog stays", () => {
    expect(logs(g["pattern"]!)).toEqual(["closepat 100"]);
    expect(has(g["pattern"]!, /method=close left=0/)).toBe(true);
    expect(closerChecks.onlyOwned(g)).toBe(true);
  });
  it("Cancel when the pattern does not close it", () => {
    expect(logs(g["cancel"]!)).toEqual(["closepat 100", "cancel 100"]);
    expect(has(g["cancel"]!, /method=cancel/)).toBe(true);
  });
  it("Escape when there is no Cancel button, after the foreground is that dialog", () => {
    expect(logs(g["nocancelbutton"]!)).toEqual(["closepat 100", "fg 100", "esckey 100"]);
    expect(has(g["escape"]!, /method=escape left=0/)).toBe(true);
  });
  it("Escape is not sent when the dialog cannot be put in front: a STOP dialog-left-open and Closed false", () => {
    expect(closerChecks.escapeFront(g)).toBe(true);
    expect(has(g["escape-wrong-fg"]!, /^STOP: dialog-left-open/)).toBe(true);
    expect(has(g["escape-wrong-fg"]!, /R closed=False .* left=1/)).toBe(true);
  });
  it("a dialog owned by another window is never acted on (nothing is even tried)", () => {
    expect(closerChecks.foreignUntouched(g)).toBe(true);
    expect(closerChecks.twoOwners(g)).toBe(true);
  });
  it("the watchdog bounds the closer: with 1 000 ms no Escape step starts and the time stays near the bound", () => {
    const w = g["watchdog"]!;
    expect(has(w, /^STOP: dialog-left-open/)).toBe(true);
    expect(logs(w).some((l) => l.startsWith("esckey"))).toBe(false);
    const ms = Number(/ms=(\d+)/.exec(w.lines.find((l) => l.startsWith("R "))!)![1]);
    expect(ms).toBeLessThanOrEqual(1100);
    expect(has(g["default-watchdog"]!, /^WD 5000$/)).toBe(true);
  });
  it("window X must be the wave's own", () => {
    expect(g["own-only"]!.result).toBe("threw");
    expect(logs(g["own-only"]!)).toEqual([]);
  });
  it("MUTANT: Escape to whatever is in front (no foreground check) goes red", () => {
    const m = run("closer", mut("  if ((Get-S12Foreground) -ne $Dlg) { Say9 'CHECK dialog-escape foreground=other - no key sent'; return $false }\n", ""));
    expect(closerChecks.escapeFront(m)).toBe(false);
  });
  it("MUTANT: the closer lists every dialog, not X's, goes red", () => {
    const m = run("closer", mut("Where-Object { $_.Owner -eq $Hwnd }", "Where-Object { $true }"));
    expect(closerChecks.foreignUntouched(m) && closerChecks.onlyOwned(m) && closerChecks.twoOwners(m)).toBe(false);
  });
});

d("each acting primitive re-checks the owner", () => {
  const g = run("guards", SRC);
  it("Cancel, close pattern and Escape on a foreign dialog do nothing and answer false", () => {
    expect(guardChecks.cancel(g) && guardChecks.pattern(g) && guardChecks.escape(g)).toBe(true);
  });
  it("Escape on X's own dialog needs it in front", () => {
    expect(logs(g["escape-owned"]!)).toEqual(["fg 100", "esckey 100"]);
    expect(guardChecks.escapeFront(g)).toBe(true);
  });
  it("MUTANT: no owner check in Send-S12DialogEscape goes red", () => {
    const m = run("guards", mut("function Send-S12DialogEscape([long]$Hwnd, [long]$Dlg) {\n  if (-not (Test-S12DialogOwned $Hwnd $Dlg)) { return $false }\n", "function Send-S12DialogEscape([long]$Hwnd, [long]$Dlg) {\n"));
    expect(guardChecks.escape(m)).toBe(false);
  });
  it("MUTANT: no owner check in Invoke-S12DialogCancel goes red", () => {
    const m = run("guards", mut("function Invoke-S12DialogCancel([long]$Hwnd, [long]$Dlg) {\n  if (-not (Test-S12DialogOwned $Hwnd $Dlg)) { return $false }\n", "function Invoke-S12DialogCancel([long]$Hwnd, [long]$Dlg) {\n"));
    expect(guardChecks.cancel(m)).toBe(false);
  });
  it("MUTANT: no owner check in Invoke-S12DialogClosePattern goes red", () => {
    const m = run("guards", mut("function Invoke-S12DialogClosePattern([long]$Hwnd, [long]$Dlg) {\n  if (-not (Test-S12DialogOwned $Hwnd $Dlg)) { return $false }\n", "function Invoke-S12DialogClosePattern([long]$Hwnd, [long]$Dlg) {\n"));
    expect(guardChecks.pattern(m)).toBe(false);
  });
});

d("the human-style click", () => {
  const g = run("human", SRC);
  it("clicks once at the centre of the input when X is own, on a fixture, the point inside X and X in front", () => {
    expect(logs(g["ok"]!).filter((l) => l.startsWith("click"))).toEqual(["click 120 210"]);
    expect(has(g["ok"]!, /^RET True$/)).toBe(true);
  });
  it("the target search covers window X only, and the point must belong to X (FromPoint): another window there, or none, sends nothing", () => {
    expect(has(g["searchlist"]!, /^LIST 7$/)).toBe(true);
    expect(logs(g["ok"]!)).toContain("search 1");
    expect(logs(g["ok"]!)).not.toContain("widesearch");
    for (const k of ["other-window", "no-at-point"]) {
      expect(logs(g[k]!).some((l) => l.startsWith("click")), k).toBe(false);
      expect(has(g[k]!, /^RET False$/), k).toBe(true);
    }
  });
  it("MUTANT: no at-point check, or a search through every Chrome window, goes red", () => {
    const m1 = run("human", mut("  if ((Get-S12WindowAtPoint $cx $cy) -ne $Hwnd) { Say9 'CHECK human-click at-point=other-window - no click sent'; return $false }\n", ""));
    expect(logs(m1["other-window"]!).some((l) => l.startsWith("click"))).toBe(true);
    const m2 = run("human", mut("Find-S12ClickTarget $Hwnd 'Choose File*'", "Find-S12UiaByName $Hwnd 'Choose File*' 'Button'"));
    expect(logs(m2["ok"]!)).toContain("widesearch");
  });
  it("sends nothing for a foreign window, a non-fixture page, no target, a point outside X, or X not in front", () => {
    for (const k of ["foreign", "off-fixture", "no-target", "outside", "not-front"]) expect(logs(g[k]!).some((l) => l.startsWith("click")), k).toBe(false);
    expect(g["foreign"]!.result).toBe("threw");
    expect(g["off-fixture"]!.result).toBe("threw");
    for (const k of ["no-target", "outside", "not-front"]) expect(has(g[k]!, /^RET False$/), k).toBe(true);
  });
});

d("CLOSERPROBE (33)", () => {
  const g = run("probe", SRC);
  it("pass: opened, closed, none left; X closed after", () => {
    expect(has(g["pass"]!, /^SAY CLOSERPROBE method=uia-owner opened=yes closed=yes ms=\d+ native-after=0$/)).toBe(true);
    expect(has(g["pass"]!, /^RET True$/)).toBe(true);
    expect(logs(g["pass"]!).at(-1)).toBe("closewin 55");
  });
  it("opened=no is not a STOP and not a pass", () => {
    expect(has(g["not-opened"]!, /^SAY CLOSERPROBE method=uia-owner opened=no closed=n\/a ms=0 native-after=0$/)).toBe(true);
    expect(has(g["not-opened"]!, /^STOP:/)).toBe(false);
    expect(has(g["not-opened"]!, /^RET False$/)).toBe(true);
  });
  it("a dialog that will not close is the STOP dialog-left-open, and X is still closed", () => {
    expect(has(g["left"]!, /^SAY CLOSERPROBE method=uia-owner opened=yes closed=no ms=\d+ native-after=1$/)).toBe(true);
    expect(has(g["left"]!, /^STOP: dialog-left-open/)).toBe(true);
    expect(logs(g["left"]!).includes("closewin 55")).toBe(true);
  });
  it("opened=no with a dialog of X still present is the STOP too (the TS rule); one STOP line per failed probe", () => {
    expect(has(g["late-dialog"]!, /^STOP: dialog-left-open/)).toBe(true);
    expect(g["late-dialog"]!.lines.filter((l) => l.startsWith("STOP:")).length).toBe(1);
    expect(has(g["late-dialog"]!, /^RET False$/)).toBe(true);
    expect(g["left"]!.lines.filter((l) => l.startsWith("STOP:")).length).toBe(1);
  });
  it("MUTANT: the old guard (STOP only when opened) goes red on a late dialog", () => {
    const m = run("probe", mut("if ($after -gt 0 -or ($opened -and", "if (($opened -and"));
    expect(has(m["late-dialog"]!, /^STOP:/)).toBe(false);
  });
});

d("the real Win32 types (nothing stubbed on the call)", () => {
  const g = run("realtypes", SRC);
  it("Get-S12WindowRect reaches a type that exists; the Win32 members the helper names are on the compiled types", () => {
    expect(g["rect"]!.result).toBe("ok");
    expect(has(g["rect"]!, /^RECT 0 0$/)).toBe(true);
    expect(has(g["members"]!, /^KEYBD True RECTM True$/)).toBe(true);
  });
  it("MUTANT: [S9Win]::Rect goes red", () => {
    const m = run("realtypes", mut("[S9Geo]::Rect([IntPtr]$Hwnd)", "[S9Win]::Rect([IntPtr]$Hwnd)"));
    expect(m["rect"]!.result).toBe("threw");
  });
});

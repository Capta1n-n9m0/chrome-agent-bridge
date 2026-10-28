// Step 12 S7-helpers-e (decisions.md #363): (1) R19-UP-OPT brings O2 to the front after the save and before the conflict read, timed from the save;
// (2) liveA19's and liveB19's R19-RESTORE print the DIALOGS line. PowerShell pieces run for real with stubbed helpers. No Chrome, daemon or port.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = (...p: string[]): string => join(REPO, "recipes", ...p);
const rd = (f: string): string => readFileSync(R(f), "utf8").replace(/\r\n/g, "\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const q = (s: string): string => s.replace(/'/g, "''");
function runPs(script: string): string[] {
  const d = mkdtempSync(join(tmpdir(), "s12he-")), f = join(d, "t.ps1");
  writeFileSync(f, `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n${script}`, "utf8");
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 120_000 }).stdout.split(/\r?\n/);
}
// Functions of a recipe file by its own parser, dot-sourced (the s12-helpers-b pattern).
const LOAD = (file: string, names: string[]): string => `foreach ($x in @(${names.map((n) => `'${n}'`).join(",")})) {
  $tk = $null; $er = $null; $ast = [Management.Automation.Language.Parser]::ParseFile('${q(R(file))}', [ref]$tk, [ref]$er)
  $fn = $ast.Find({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $x }, $true); . ([scriptblock]::Create($fn.Extent.Text)) }`;

// ---- (1) the UP-OPT poll ------------------------------------------------------------------------------------------------------------------------------
const OPT = `
$S11Out = Join-Path $env:TEMP 's12he-out'; $S11Utf8 = New-Object Text.UTF8Encoding($false); $S9Id = 'cpnemjbgecfbeicldpaaegbhjgjgjfep'
$global:Clock = 1000000000000; $global:Log = New-Object System.Collections.ArrayList; $global:FgCost = 400; $global:FgOk = $true; $global:FgCalls = 0
function Say9([string]$m) { Write-Host "SAY $m" }; function Stop9([string]$m) { Write-Host "STOP: $m" }
function Start-Sleep { param([int]$Milliseconds) $global:Clock += $Milliseconds }
function Get-S11Sha($t) { $t }
function Get-S11Box($o, $b) { [void]$global:Log.Add('READ'); if ($global:Clock -ge $global:MatchAt) { 'sha' } else { 'other' } }
function Set-S9Foreground([long]$h) { [void]$global:Log.Add('FG'); $global:Clock += $global:FgCost; $global:FgCalls++; if ("$global:FgOk" -eq 'split') { $global:FgCalls -eq 1 } else { $global:FgOk } }
function Set-S11Box($o, $b, $t, [switch]$NoSave) { if (-not $NoSave) { [void]$global:Log.Add('SAVE') }; 'sha' }
function Find-S11Texts($d, $re) { if ($re -match 'changed elsewhere') { [void]$global:Log.Add('CONFLICT') }; @() }
function Assert-S11Own($o, $w) { }; function Assert-S11Outside($p) { $p }; function Get-S11FoundText($k) { 'F1' }; function Get-S11Lines($t) { 1 }
function Add-S11Line($t, $l) { "$t|$l" }; function Open-S11Options { 99 }; function Get-S9Options($o) { $null }; function Get-S9ById($d, $id) { $id }
function Close-S11Window($o) { }; function Read-S11Stored($o, [switch]$PassThru) { [pscustomobject]@{ foldersSha = 'x' } }; function Read-S11State($o, [switch]$PassThru) { [pscustomobject]@{ foldersSha = 'x' } }
function Get-S11Summary($d) { 's' }; $S11Warning = 'STAND'; $S11Typed = @('a', 'b', 'c')
${LOAD("s11-win.ps1", ["Invoke-S11Opt"])}
foreach ($x in @(@('s9-win.ps1','Set-S9Omnibox'), @('s11b-r17b.ps1','Set-S17Raw'))) {
  $tk = $null; $er = $null; $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path '${q(R(""))}' $x[0]), [ref]$tk, [ref]$er)
  $fn = $ast.Find({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $x[1] }, $true); . ([scriptblock]::Create($fn.Extent.Text)) }
. '${q(R("s12-win.ps1"))}'
function Get-S12NowMs { $global:Clock }   # after s12-win.ps1, which defines its own
function Run($name, $cmd, $fgOk) {
  $global:Log.Clear(); $global:FgCalls = 0; $global:FgOk = $fgOk; $global:MatchAt = $global:Clock + 1000
  Write-Host "BEGIN $name"
  & $cmd 1 'R' (Join-Path $S11Out "$name.json") | Out-Null
  Write-Host "END $name $($global:Log -join ',')"
}
New-Item -ItemType Directory -Force $S11Out | Out-Null
Run 'R19' { param($a, $b, $c) Invoke-S19Opt $a $b $c } $true
Run 'R19S' { param($a, $b, $c) Invoke-S19Opt $a $b $c } 'split'
Run 'R19F' { param($a, $b, $c) Invoke-S19Opt $a $b $c } $false
Run 'R18' { param($a, $b, $c) Invoke-S12Opt $a $b $c } $true
Run 'R16' { param($a, $b, $c) Invoke-S11Opt $a $b $c } $true
`;
describe.skipIf(!hasPs)("R19-UP-OPT: O2 is brought to the front after the save, timed from the save (#363)", () => {
  const out = runPs(OPT);
  const part = (n: string): string[] => out.slice(out.indexOf(`BEGIN ${n}`), out.findIndex((l) => l.startsWith(`END ${n} `)));
  const log = (n: string): string => out.find((l) => l.startsWith(`END ${n} `))!.slice(`END ${n} `.length).replace(/(READ,)+/g, "READ,");
  it("R19: save, foreground, the O2 reads, foreground, the conflict read (in that order)", () => { expect(log("R19")).toBe("SAVE,FG,READ,FG,CONFLICT"); });
  it("the time counts from the save: the 400 ms foreground call shows in at and polled-ms; the 15 s poll cap is unmoved", () => {
    expect(part("R19").some((l) => l.endsWith("OPT O2 shown=yes at=1000 polled-ms=1000"))).toBe(true);
    expect(rd("s12-win.ps1")).toContain("$S12O2PollMaxMs = 15000");
  });
  it("the front line records the result (yes/yes, or no/no without a throw), the FIX line prints once, the O2 line's form is intact", () => {
    expect(part("R19").filter((l) => l.endsWith("OPT O2 front after-save=yes before-conflict-read=yes"))).toHaveLength(1);
    expect(part("R19S").filter((l) => l.endsWith("OPT O2 front after-save=yes before-conflict-read=no"))).toHaveLength(1);
    expect(part("R19F").filter((l) => l.endsWith("OPT O2 front after-save=no before-conflict-read=no"))).toHaveLength(1);
    for (const n of ["R19", "R19F"]) { expect(part(n).filter((l) => / FIX R19-UP-OPT: /.test(l)), n).toHaveLength(1); expect(part(n).filter((l) => /OPT O2 shown=(yes|no) at=(\d+|none) polled-ms=\d+$/.test(l)), n).toHaveLength(1); }
  });
  it("Run 18's Invoke-S12Opt and Run 16/17's Invoke-S11Opt never call the foreground and print no FIX or front line", () => {
    expect(log("R18")).toBe("SAVE,READ,CONFLICT"); expect(log("R16")).toBe("SAVE,READ,CONFLICT");
    expect(part("R18").some((l) => /FIX|front/.test(l))).toBe(false);
    expect(part("R16").some((l) => /FIX|front/.test(l))).toBe(false);
  });
  it("only the R19 path calls it; Invoke-S11Opt's text is not patched", () => {
    expect(rd("s12-r19-b.ps1")).toContain("Invoke-S19Opt $r19o $Root $r19f");
    expect(rd("s12-r18-lib.ps1")).toContain("Invoke-S12Opt $r18O $Root $r18Of");
    expect(rd("s11-win.ps1")).not.toMatch(/Set-S9Foreground \$O2|S19/);
    expect(rd("s12-r19.ps1")).toContain("Get-Command Invoke-S19Opt");
  });
});

// ---- (2) the DIALOGS line at liveA19's and liveB19's R19-RESTORE ---------------------------------------------------------------------------------------
const DLG = (slice: string): string => `
$global:R19Slice = '${slice}'; $global:W = 7; $global:R19Xk = 0; $global:O = 0; $global:D = 900; $global:Native = @{ '7' = 0; '55' = 0 }; $global:Windows = @(7, 900); $global:Log = New-Object System.Collections.ArrayList
Add-Type 'public static class S9Win { public static System.Collections.Hashtable T = new System.Collections.Hashtable(); public static string Text(System.IntPtr h) { return (string)T[h.ToInt64()]; } }'
[S9Win]::T[[long]900] = 'DevTools - capture'; [S9Win]::T[[long]901] = 'DevTools - other'; [S9Win]::T[[long]7] = 'wave'
function Say9([string]$m) { }; function Test-S9Live { $true }; function Get-S9ChromeWindows { $global:Windows }
function Get-S12DialogCount([long]$h) { [int]$global:Native["$h"] }
function Stop-R19([string]$r, [string]$w) { [void]$global:Log.Add("STOP:$r"); throw "stop $r" }
function Invoke-R19Node { [void]$global:Log.Add("ARGS:$(@($args[1]) -join ' ')") }
${LOAD("s12-r19-c.ps1", ["Get-R19DlgWindows", "Get-R19DevToolsCount", "Write-R19Dialogs"])}
function Go($name) { $global:Log.Clear(); try { Write-R19Dialogs } catch { }; Write-Host "$name $($global:Log -join ',')" }
Go 'D0'
$global:Native['7'] = 1; Go 'D1'; $global:Native['7'] = 0
$global:Windows = @(7, 900, 901); Go 'D2'; $global:Windows = @(7, 900)
$global:R19Xk = 55; $global:O = 66; Go 'D3'
`;
describe.skipIf(!hasPs)("liveA19's and liveB19's DIALOGS line: native and DevTools counts stop, the capture window and wave windows do not", () => {
  for (const s of ["liveA19", "liveB19"]) {
    const out = runPs(DLG(s));
    const line = (n: string): string => out.find((l) => l.startsWith(`${n} `)) ?? "";
    const a = (nat: number, dev: number, win: number): string => `ARGS:dialogs --slice ${s} --native ${nat} --devtools ${dev} --windows ${win}`;
    it(`${s}: the capture window is not counted, and 0/0 prints the line with no STOP`, () => { expect(line("D0")).toBe(`D0 ${a(0, 0, 0)}`); });
    it(`${s}: a native dialog and a DevTools window other than the capture are STOPs, after the line`, () => {
      expect(line("D1")).toBe(`D1 ${a(1, 0, 0)},STOP:dialog-left-open`);
      expect(line("D2")).toBe(`D2 ${a(0, 1, 0)},STOP:devtools-left-open`);
    });
    it(`${s}: open wave windows are printed and never judged`, () => { expect(line("D3")).toBe(`D3 ${a(0, 0, 2)}`); });
  }
  it("R19-RESTORE calls Write-R19Dialogs in all five slices (liveD19 and liveE19 too, #364)", () => {
    const run = (s: string): boolean => runPs(`$global:R19Slice = '${s}'; $global:O = 0
function Invoke-R19RowBlock($id, $sb) { & $sb }; function Test-S11Own($o) { $false }; function Invoke-R19Stamped($b) { }; $R17Blocks = @{ 'rd-restore' = 1 }; function Close-R19Bc { }; function Say9($m) { }
function Write-R19Dialogs { Write-Host 'DIALOGS-CALLED' }
${LOAD("s12-r19-lib.ps1", ["Invoke-R19Restore"])}
Invoke-R19Restore`).includes("DIALOGS-CALLED");
    expect(["liveA19", "liveB19", "liveC19", "liveD19", "liveE19"].map(run)).toEqual([true, true, true, true, true]);
  });
});

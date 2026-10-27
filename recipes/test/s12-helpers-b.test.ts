// Step 12 S1-helpers-b: line forms (5)-(8) of section 4.26, the UP-OPT poll, the UP-RACE-A driver, class-only URL lines, the
// banner-control violations check. PowerShell pieces run for real with stubbed helpers (the s12-ps.test.ts pattern). No Chrome, daemon or port.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bannerCtlPass, isFixture18, legLine, optO2Line, optObservedLine, O2_POLL_MAX_MS, rawLine, raceOnLine } from "../s12-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = (...p: string[]): string => join(REPO, "recipes", ...p);
const sheet = (() => { const d = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8"); return d.slice(d.indexOf("### 4.26 R18 rows")); })();
const s11b = readFileSync(R("s11b.ts"), "utf8");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const q = (s: string): string => s.replace(/'/g, "''");

// The forms by key: each skeleton is in section 4.26's "Line forms" paragraph; each output must match its regex.
const FORMS: Array<[string, string, RegExp]> = [
  ["raw", "`RAW <row> <label> code=<CODE|ok> key=<K-…|other|none> data=<none|keys:<k1,k2>>`", /^RAW \S+ \S+ code=(ok|[A-Z_]+) key=(K-[\w-]+|other|none) data=(none|keys:[\w-]+(,[\w-]+)*)$/],
  ["opt", "`OPT observed standing x<n> invalid items <fi+3 when the found folders hold fi invalid lines> warned items <n>`", /^OPT observed standing x\d+ invalid items \d+ warned items \d+$/],
  ["o2", "`OPT O2 shown=<yes|no> at=<ms|none> polled-ms=<n>`", /^OPT O2 shown=(yes|no) at=(\d+|none) polled-ms=\d+$/],
  ["race", "`RACE ON pressed <ms> after last reply`", /^RACE ON pressed \d+ after last reply$/],
  ["leg", "`LEG <row> <leg> <PASS|FAIL|NOT MEASURED>`", /^LEG \S+ \S+ (PASS|FAIL|NOT MEASURED)$/],
];
const form = (k: string): RegExp => FORMS.find((f) => f[0] === k)![2];

describe("line forms (5)-(8) match section 4.26 by key", () => {
  it("every skeleton is written in the sheet", () => { for (const [k, sk] of FORMS) expect(sheet, k).toContain(sk); });
  it("RAW prints the code, the K key and data KEYS only", () => {
    const K = { "K-gate": { code: "UPLOAD_REFUSED", message: "m" } };
    expect(rawLine("R18-UP-L1", "raw-root", { code: "UPLOAD_REFUSED", message: "m" }, K)).toBe("RAW R18-UP-L1 raw-root code=UPLOAD_REFUSED key=K-gate data=none");
    const l = rawLine("R18-UP-L1", "raw-outside", { code: "UPLOAD_REFUSED", message: "x", data: { scope: "all", "C:\\secret": "VALUE" } }, K);
    expect(l).toBe("RAW R18-UP-L1 raw-outside code=UPLOAD_REFUSED key=other data=keys:scope,other");
    expect(rawLine("R", "l", undefined, K)).toBe("RAW R l code=ok key=none data=none");
    for (const x of [l, rawLine("R", "l", undefined, K)]) expect(x).toMatch(form("raw"));
  });
  it("OPT, RACE and LEG lines", () => {
    expect(optObservedLine(1, 3, 0)).toMatch(form("opt"));
    expect(optO2Line(true, 5200, 5300)).toBe("OPT O2 shown=yes at=5200 polled-ms=5300");
    expect(optO2Line(false, null, 15000)).toBe("OPT O2 shown=no at=none polled-ms=15000");
    expect(raceOnLine(1612)).toMatch(form("race"));
    expect(legLine("R18-SAVE-REFUSE", "sdk-leg", "PASS")).toMatch(form("leg"));
    expect(O2_POLL_MAX_MS).toBe(15000);
  });
});

describe("F-b: the banner control's answer stays the call's own", () => {
  const ok = { idleMs: 15000, neg: "none", pos: "seen", posAnswer: "ok" } as const;
  it("a violation FAILs the row while the answer stays ok", () => {
    expect(bannerCtlPass({ ...ok, violations: 0 })).toBe(true);
    expect(bannerCtlPass({ ...ok, violations: 1 })).toBe(false);
  });
  it("s11b.ts no longer prints VIOLATION as an answer and the judge takes --violations", () => {
    expect(s11b).not.toMatch(/"VIOLATION"/);
    expect(s11b).toContain('say(`ANSWER R18-BANNER-CTL pos ${r.v.err?.code ?? "ok"}`)');
    expect(s11b).toContain('violations: int(a, "violations")');
  });
  it("the race actor ends at the cap with --to-cap and signals the last reply's epoch", () => {
    expect(s11b).toContain('"--to-cap"');
    expect(s11b).toContain("realIo.signal(`${id}-loop-done`, String(T0 + calls[calls.length - 1]!.reply))");
  });
});

const PRE = (out: string): string => `
$S11Out = '${q(out)}'; $S11Utf8 = New-Object Text.UTF8Encoding($false); $S9Id = 'cpnemjbgecfbeicldpaaegbhjgjgjfep'; $S9TitleArmed = 'armed'
$global:Clock = 1000000000000; $global:C0 = 0
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$m) { Write-Host "STOP: $m" }
function Start-Sleep { param([int]$Milliseconds) $global:Clock += $Milliseconds; if ($global:FillPath) { [IO.File]::WriteAllText($global:FillPath, "$($global:FillVal)"); $global:FillPath = $null } }
foreach ($x in @(@('s11-win.ps1','Invoke-S11Opt'), @('s9-win.ps1','Set-S9Omnibox'), @('s11b-r17b.ps1','Set-S17Raw'))) {
  $tk = $null; $er = $null
  $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path '${q(R("s12-win.ps1")).replace(/s12-win.ps1$/, "")}' $x[0]), [ref]$tk, [ref]$er)
  $fn = $ast.Find({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $x[1] }, $true)
  . ([scriptblock]::Create($fn.Extent.Text))
}
. '${q(R("s12-win.ps1"))}'
function Get-S12NowMs { $global:Clock }
function Get-S11Sha($t) { $t }
function Get-S11Box($o, $b) { if ($global:Clock -ge $global:MatchAt) { 'sha' } else { 'other' } }
function Test-S11ButtonReady($b) { $true }; function Park-S9Cursor($x) { }; function Wait-S11Ready($n, $t) { $true }
function Invoke-S9ActionButton($b) { Write-Host "PRESS $($global:Clock - $global:C0)" }
function Test-S11bTitleOff($b) { $true }
function Get-S11Signal($n, $k) { Join-Path $S11Out "$n.$k" }
function Wait-S9ActionTitle($a, $b, $c) { }; function Get-S9ActionTitle($b) { $S9TitleArmed }
function Test-S9DaemonSafety { $true }; function Write-S11Pressed($i) { Write-Host 'PRESSED' }
$global:S11Found = [pscustomobject]@{ armed = $true; evaluate = $true; count = 0 }
New-Item -ItemType Directory -Force $S11Out | Out-Null
$S11Warning = 'STAND'; $S11Typed = @('relative\\fixture-folder', 'C:\\', 'C:\\Users\\fixture-home')
function Assert-S11Own($o, $w) { }; function Assert-S11Outside($p) { $p }; function Get-S11FoundText($k) { 'F1' }; function Get-S11Lines($t) { 1 }
function Add-S11Line($t, $l) { "$t|$l" }; function Open-S11Options { 99 }; function Get-S9Options($o) { $null }
function Get-S9ById($d, $id) { if ($global:NullId -eq $id) { $null } else { $id } }; $global:Block = @(); $global:Warned = @(); $global:NullId = ''
function Find-S11Texts($d, $re) { $src = if ($d -eq 'invalid-lines') { $global:Block } elseif ("$d" -eq 'uploadfolders-invalid') { $global:Page } elseif ("$d" -eq 'uploadfolders-warned') { $global:Warned } else { @($global:Page) + @($global:Block) }; @($src | Where-Object { $_ -match $re }) }
function Set-S11Box($o, $b, $t, [switch]$NoSave) { 'sha' }; function Close-S11Window($o) { }
function Read-S11Stored($o, [switch]$PassThru) { [pscustomobject]@{ foldersSha = 'x' } }; function Read-S11State($o, [switch]$PassThru) { [pscustomobject]@{ foldersSha = 'x' } }
function Get-S11Summary($d) { 's' }
`;
export const URL_TABLE: Array<[string, boolean]> = [
  ["http://127.0.0.1:8081/s11-upload.html", true], ["http://localhost:8081?x=1", true], ["http://a.b.localhost:8081/", true], ["chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html", true],
  ["chrome://extensions/?id=a", true], ["http://localhost:8084/x", false], ["http://127.0.0.1:9234/", false], ["https://example.com/", false], ["chrome://extensionsx", false],
  ["chrome-extension://other/o.html", false], ["https://127.0.0.1:8081/", false], ["HTTP://evil.example/", false], ["http://127.0.0.1:8081.evil/", false],
  ["http://localhost:80810/", false], ["http://localhost:8081@evil.example/", false], ["chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfepx/", false],
];
const BODY = `
$ot = (Get-Command Invoke-S12Opt).ScriptBlock.Ast.Extent.Text; $mt = (Get-Command Set-S9Omnibox).ScriptBlock.Ast.Extent.Text
Write-Host ('PATCH opt ' + [bool]($ot -match 'Wait-S12O2 \\$O2 \\$setSha') + ' ' + [bool]($ot -match 'TotalSeconds -lt 6') + ' ' + [bool]($ot -match 'Format-S12OptObserved'))
Write-Host ('PATCH omni ' + [bool]($mt -match 'now shows \\$\\(Get-S12UrlClass') + ' ' + [bool]($mt -match 'now shows \\$Url"'))
Assert-S12Patched; Write-Host 'ASSERT ok'
try { [void](Get-S12PatchedFunction 'Set-S17Raw' 'X' @(,@('no such text', 'y'))); Write-Host 'NOMATCH no throw' } catch { Write-Host 'NOMATCH threw' }
$global:MatchAt = $global:Clock + 8000; $c = $global:Clock; $r = Wait-S12O2 1 'sha'; Write-Host "O2LATE $(Format-S12OptO2 $r)"
$global:MatchAt = [long]::MaxValue; $r = Wait-S12O2 1 'sha'; Write-Host "O2NEVER $(Format-S12OptO2 $r)"
$global:MatchAt = 0; $r = Wait-S12O2 1 'sha'; Write-Host "O2NOW $(Format-S12OptO2 $r)"
Write-Host "OPTLINE $(Format-S12OptObserved 1 3 0)"
try { [void](Get-S12PatchedFunction 'Set-S17Raw' 'X' @(,@('\\$(Framing|Record)', 'y'))); Write-Host 'NOMATCH2 no throw' } catch { Write-Host 'NOMATCH2 threw' }
$q1 = [string][char]0x201c; $q2 = [string][char]0x201d; $dd = [string][char]0x2014
function L($n, $t, $why) { 'Line {0}: {1}{2}{3} {4} {5}' -f $n, $q1, $t, $q2, $dd, $why }
$global:MatchAt = 0
$global:Block = @((L 2 'bad-block*' 'a block-list reason'), (L 3 'warn-block' 'warning: a block-list warning'))
$global:Page = @('STAND', (L 1 'C:\\found-bad' 'not absolute'), (L 5 $S11Typed[0] 'rel'), (L 6 $S11Typed[1] 'root'), (L 7 $S11Typed[2] 'home'))
$global:Warned = @()
[void](Invoke-S12Opt 1 'R' (Join-Path $S11Out 'o1.json'))
$global:Page = @('STAND', (L 1 'C:\\found-warn' 'warning: x'), (L 5 $S11Typed[0] 'rel'), (L 6 $S11Typed[1] 'root'), (L 7 $S11Typed[2] 'home'))
$global:Warned = @((L 1 'C:\\found-warn' 'warning: x'))
[void](Invoke-S12Opt 1 'R' (Join-Path $S11Out 'o2.json'))
$ErrorActionPreference = 'Continue'
foreach ($nid in 'uploadfolders-invalid', 'uploadfolders-warned') { $global:NullId = $nid; try { [void](Invoke-S12Opt 1 'R' (Join-Path $S11Out 'o3.json')); Write-Host "NULLLIST $nid no throw" } catch { Write-Host "NULLLIST $nid threw" } }
$global:NullId = ''
$ff = Join-Path $S11Out 'empty.ready'; [IO.File]::WriteAllText($ff, ''); $global:FillPath = $ff; $global:FillVal = 12345
Write-Host "READ1 $(Read-S12ReplyMs $ff)"
[IO.File]::WriteAllText($ff, ''); $global:FillPath = $null; Write-Host "READ2 $(Read-S12ReplyMs $ff)"
$ui = 0; foreach ($u in @(${URL_TABLE.map(([u]) => `'${q(u)}'`).join(",")})) { Write-Host "UC $ui $(Get-S12UrlClass $u)"; $ui++ }
foreach ($u in 'http://127.0.0.1:8081/s11-upload.html?x=1', 'about:blank', 'chrome://extensions/?id=a', "chrome-extension://$S9Id/options.html", 'http://localhost:8084/x') { Write-Host "CLASS $(Get-S12UrlClass $u)" }
$env:S9_RAW = ''; $FramingBlocks = @('preflight'); $Framing = 'F'; $Record = 'R'
foreach ($n in 'r17b-history', 'preflight', 'root-add', 'r17b-0') { Set-S17Raw $n; Write-Host "RAW $n $env:S9_RAW" }
$global:C0 = $global:Clock; [IO.File]::WriteAllText((Join-Path $S11Out 'UP-RACE-A-loop-done.ready'), "$($global:Clock + 9000)")
$ret = Invoke-S12RaceA 1; Write-Host "RACEA1 ret=$ret"
Remove-Item (Join-Path $S11Out 'UP-RACE-A-loop-done.ready') -ErrorAction SilentlyContinue
$global:C0 = $global:Clock; $ret = Invoke-S12RaceA 1; Write-Host "RACEA2 ret=$ret"
`;

// Fixer round 1 (S1-live attempt 1): PowerShell variable names are case-insensitive, so a patched-in `$o2` result overwrote the second
// options window's `$O2` and the next Get-S9Options (a [long] parameter) threw. The stubs below keep the real [long] parameters and record
// the handle each later call received: it must still be the handle Open-S11Options returned (777).
const HANDLE_BODY = `
function Open-S11Options { 777 }
function Get-S9Options([long]$o) { Write-Host "HANDLE Get-S9Options $o"; $null }
function Close-S11Window([long]$o) { Write-Host "HANDLE Close-S11Window $o" }
$q1 = [string][char]0x201c; $q2 = [string][char]0x201d; $dd = [string][char]0x2014
function L($n, $t, $why) { 'Line {0}: {1}{2}{3} {4} {5}' -f $n, $q1, $t, $q2, $dd, $why }
$global:MatchAt = 0
$global:Page = @('STAND', (L 1 'C:\\\\found-bad' 'not absolute'))
try { [void](Invoke-S12Opt 5 'R' (Join-Path $S11Out 'h.json')); Write-Host 'HANDLE-RUN ok' } catch { Write-Host "HANDLE-RUN threw $($_.Exception.GetType().Name)" }
`;
describe.skipIf(!hasPs)("Invoke-S12Opt keeps the second options window's handle (variable names are case-insensitive)", () => {
  const d = mkdtempSync(join(tmpdir(), "s12h-"));
  const f = join(d, "t.ps1");
  writeFileSync(f, PRE(join(d, "out")) + HANDLE_BODY, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 90_000 });
  rmSync(d, { recursive: true, force: true });
  const out = r.stdout.split(/\r?\n/);
  it("the Get-S9Options and Close-S11Window calls after the O2 poll receive the O2 handle, and the run does not throw", () => {
    expect(out).toContain("HANDLE Get-S9Options 777");
    expect(out).toContain("HANDLE Close-S11Window 777");
    expect(out.filter((l) => l === "HANDLE Close-S11Window 777").length).toBe(2);
    expect(out).toContain("HANDLE-RUN ok");
  });
  it("the OPT lines still print as before", () => {
    expect(out.some((l) => /^SAY OPT O2 shown=yes at=0 polled-ms=0$/.test(l))).toBe(true);
    expect(out.some((l) => /^SAY OPT observed standing x1 invalid items \d+ warned items \d+$/.test(l))).toBe(true);
  });
});

describe.skipIf(!hasPs)("the s12 PowerShell pieces, run with stubbed helpers", () => {
  const d = mkdtempSync(join(tmpdir(), "s12b-"));
  const f = join(d, "t.ps1");
  writeFileSync(f, PRE(join(d, "out")) + BODY, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 90_000 });
  rmSync(d, { recursive: true, force: true });
  const out = r.stdout.split(/\r?\n/);
  const get = (re: RegExp): string => out.find((l) => re.test(l)) ?? `<missing ${re}> ${r.stderr.slice(0, 900)}`;

  it("Invoke-S12Opt: the 15 s poll and the sheet's OPT lines replace the 6 s loop and the old print", () => {
    expect(get(/^PATCH opt/)).toBe("PATCH opt True False True");
    expect(get(/^ASSERT/)).toBe("ASSERT ok");
    expect(get(/^NOMATCH/)).toBe("NOMATCH threw");
    expect(get(/^OPTLINE/)).toMatch(/^OPTLINE OPT observed standing x1 invalid items 3 warned items 0$/);
  });
  it("Invoke-S12Opt run with stubs: the counts come from the page (fi = 1 gives invalid 4, warned 0; a warned found item counts)", () => {
    expect(out.filter((l) => l.startsWith("SAY OPT observed"))).toEqual(["SAY OPT observed standing x1 invalid items 4 warned items 0", "SAY OPT observed standing x1 invalid items 3 warned items 1"]);
    expect(get(/^NOMATCH2/)).toBe("NOMATCH2 threw");
  });
  it("an absent Upload-folders list is a STOP line and a throw under $ErrorActionPreference Continue, never a silent 0", () => {
    for (const id of ["invalid", "warned"]) {
      expect(out).toContain(`STOP: uploadfolders-${id} list not found`);
      expect(out).toContain(`NULLLIST uploadfolders-${id} threw`);
    }
  });
  it("an empty loop-done file is re-read until it holds the epoch (200 ms), else 0", () => {
    expect(get(/^READ1/)).toBe("READ1 12345");
    expect(get(/^READ2/)).toBe("READ2 0");
  });
  it("Get-S12UrlClass and isFixture18 agree on the table", () => {
    const cls = out.filter((l) => l.startsWith("UC ")).map((l) => l.split(" ")[2]!);
    expect(cls.length).toBe(URL_TABLE.length);
    URL_TABLE.forEach(([u, f], i) => {
      expect(isFixture18(u, "cpnemjbgecfbeicldpaaegbhjgjgjfep"), u).toBe(f);
      expect(["url-class=fixture", "url-class=chrome-extensions", "url-class=own-page"].includes(cls[i]!), u).toBe(f);
    });
  });
  it("O2: shown late (8 s, past the old 6 s stop) is recorded, never-shown polls to 15 000 ms, shown at once stops at once", () => {
    const late = /shown=yes at=(\d+) polled-ms=(\d+)/.exec(get(/^O2LATE/))!;
    expect(Number(late[1])).toBeGreaterThanOrEqual(8000);
    expect(Number(late[1])).toBeLessThan(8200);
    expect(get(/^O2NEVER/)).toMatch(/^O2NEVER OPT O2 shown=no at=none polled-ms=1(5\d\d\d)$/);
    expect(Number(/polled-ms=(\d+)/.exec(get(/^O2NEVER/))![1])).toBeGreaterThanOrEqual(15000);
    expect(get(/^O2NOW/)).toMatch(/^O2NOW OPT O2 shown=yes at=0 polled-ms=0$/);
    for (const k of ["O2LATE", "O2NEVER", "O2NOW"]) expect(get(new RegExp(`^${k}`)).slice(k.length + 1)).toMatch(form("o2"));
  });
  it("the omnibox line prints a URL class only (never the URL)", () => {
    expect(get(/^PATCH omni/)).toBe("PATCH omni True False");
    expect(out.filter((l) => l.startsWith("CLASS "))).toEqual(["CLASS url-class=fixture", "CLASS url-class=about-blank", "CLASS url-class=chrome-extensions", "CLASS url-class=own-page", "CLASS url-class=other"]);
  });
  it("r17b-history set-up lines go to the record stream, the framing blocks to the framing file", () => {
    expect(out).toContain("RAW r17b-history R");
    expect(out).toContain("RAW preflight F");
    expect(out).toContain("RAW root-add F");
  });
  it("UP-RACE-A: OFF at ready + 1.5 s, ON 1 600 ms after the LAST reply (not after the OFF press); no loop-done: ON at once and a STOP", () => {
    const presses = out.filter((l) => /^PRESS \d+$/.test(l)).map((l) => Number(l.slice(6)));
    expect(presses.length).toBe(4);
    expect(presses[0]).toBeGreaterThanOrEqual(1500);
    expect(presses[0]).toBeLessThan(1600);
    expect(presses[1]).toBeGreaterThanOrEqual(10600);
    expect(presses[1]).toBeLessThan(10700);
    const on = /^SAY (RACE ON pressed (\d+) after last reply)$/.exec(get(/^SAY RACE ON/))!;
    expect(on[1]).toMatch(form("race"));
    expect(Number(on[2])).toBeGreaterThanOrEqual(1600);
    expect(get(/^RACEA1/)).toBe("RACEA1 ret=True");
    expect(get(/^RACEA2/)).toBe("RACEA2 ret=False");
    expect(out.some((l) => /^STOP: RACE A: no loop-done reply time/.test(l))).toBe(true);
    expect(presses[3]).toBeGreaterThanOrEqual(120000);
  });
});

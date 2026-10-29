// Step 13 S5-drivers-B4a: recipes/s13-r20-b4.ps1 (the -3 rows' capture steps) runs in PowerShell with every Chrome helper stubbed; nothing touches Chrome, a daemon or a port.
// New-R20PopSteps is read out of recipes/s13-r20.ps1 by its own text (the whole file needs Run 19's helpers), so the test runs the real function.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
const REPO = (process.env.S13_R20_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")).replace(/\\/g, "/");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const steps = /^function New-R20PopSteps[\s\S]*?\r?\n}\r?\n/m.exec(readFileSync(join(REPO, "recipes", "s13-r20.ps1"), "utf8"))![0];
const SECRET = "PRIVATE-WINDOW-TITLE";
const body = (d: string): string => `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$env:S11_OUT = '${d}'; $global:D = 8; $global:R20Port = 8081; $global:Lines = @(); $global:Root = '${SECRET}'; $global:SaveThrows = $false
function Save-S11bConsole($h, $f) { if ($global:SaveThrows) { throw 'no window' }; [IO.File]::WriteAllText($f, (($global:Lines -join "\`n") + "\`n"), (New-Object Text.UTF8Encoding $false)); $f }
function Get-R20ConsoleCount { 'PLAIN' }
function Invoke-R20PopClick($g) { "click:$g" }
${steps}
. '${REPO}/recipes/s13-r20-b4.ps1'
function Get-R20RootName { $global:Root }
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; try { foreach ($x in @(& $b)) { Write-Host "OUT $x" } } catch { Write-Host "THREW $_" } }
T counts {
  $c = Get-R20Pop3Counts @('[bridge] evaluate 3 chars', '[BRIDGE] EVALUATE 3', 'x [bridge] evaluate 9 chars [bridge] evaluate', 'OpenerJoin failed', 'a OPENER_JOIN b', 'opener-join', 'at http://LOCALHOST:8081/e2e', 'E2E-Playground.html?Popup', 'POPUP=1 and localhost:8081', 'localhost:8082', '${SECRET} localhost:8081 [bridge] evaluate', '${SECRET}') '8081' '${SECRET}'
  "L=$($c.Lines) E=$($c.Eval) J=$($c.Join) U=$($c.Url)"
}
T capture {
  $global:Lines = @('${SECRET}', '[bridge] evaluate 1 chars', 'noise'); Invoke-R20Pop3Cap 'R-3' 'bg' 'before'
  $global:Lines = @('${SECRET}', '[bridge] evaluate 1 chars', '[bridge] evaluate 3 chars', 'noise'); Invoke-R20Pop3Cap 'R-3' 'bg' 'after'
}
T hitFirst {
  Remove-Item -LiteralPath (& $R20Pop3Evidence) -ErrorAction Ignore
  $global:Lines = @('opener-join'); Invoke-R20Pop3Cap 'R-3' 'bg' 'after'; $global:Lines = @('opener-join', 'popup=1'); Invoke-R20Pop3Cap 'R-3' 'fg' 'after'
  Write-Host "OUT EVID $((Get-Content -LiteralPath (& $R20Pop3Evidence)) -join ' | ')"
}
T unreadSave { $global:SaveThrows = $true; Invoke-R20Pop3Cap 'R-3' 'bg' 'before' }
T unreadRoot { $global:Root = ''; $global:Lines = @('a'); Invoke-R20Pop3Cap 'R-3' 'bg' 'after' }
T stepsPlain { $s = New-R20PopSteps 'R' @('bg') $false; "$(& $s[0].f) $(& $s[1].f)" }
T stepsPop3 {
  function Invoke-R20Pop3Cap([string]$r, [string]$l, [string]$w) { "CAP $r $l $w" }
  $s = New-R20PopSteps 'R-3' @('third', 'human') $true -Pop3; Write-Host "OUT IDS $(($s | ForEach-Object { $_.id }) -join ',')"
  Write-Host "OUT F $(& $s[0].f) / $(& $s[1].f) / $(& $s[2].f) / $(& $s[3].f) / $(& $s[4].f) / $(& $s[5].f) / $(& $s[6].f)"
}
T leftovers { Write-Host "OUT FILES $(@(Get-ChildItem -LiteralPath $env:S11_OUT -Name | Where-Object { $_ -ne 't.ps1' } | Sort-Object) -join ',')" }
`;
function run(): Record<string, string[]> {
  const d = mkdtempSync(join(tmpdir(), "s13-b4-"));
  try {
    const f = join(d, "t.ps1");
    writeFileSync(f, body(d.replace(/\\/g, "\\")), "utf8");
    const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 120_000 }).stdout ?? "";
    const o: Record<string, string[]> = {};
    let cur = "";
    for (const l of out.split(/\r?\n/)) { const m = /^BEGIN (\S+)$/.exec(l); if (m) { cur = m[1]!; o[cur] = []; } else if (cur) o[cur]!.push(l); }
    return o;
  } finally { rmSync(d, { recursive: true, force: true }); }
}
describe.skipIf(!hasPs)("s13-r20-b4.ps1", () => {
  const o = run();
  it("counts per capture line, case rules as the verifier fixed them (items 6, 9, 10), the root Name dropped first", () => {
    // 12 lines, the root line dropped: 11 kept; eval 3 (the case miss is not counted, the two-piece line counts once); join 3; url 4 (the nine-part line counts once)
    expect(o.counts).toEqual(["OUT L=11 E=3 J=3 U=4"]);
  });
  it("answers before with `ok <lines> <eval>` and after with `ok <lines> <eval> <join> <url>`, never a text", () => {
    expect(o.capture).toEqual(["OUT ok 2 1", "OUT ok 3 2 0 0"]);
    expect(o.capture!.join("\n")).not.toContain(SECRET);
  });
  it("writes the evaluate counts of both captures and, once, the leg where a join or URL count first rose (items 15, 17), counts only", () => {
    const e = o.hitFirst!.find((l) => l.startsWith("OUT EVID "))!.slice(4);
    expect(e).toBe("EVID R-3 bg after lines=1 eval=0 join=1 url=0 | first-hit R-3 bg join=1 url=0 | R-3 fg after lines=2 eval=0 join=1 url=1");
    expect(e).not.toContain(SECRET);
  });
  it("an unreadable capture, or an unreadable root Name, answers unread (item 14)", () => {
    expect(o.unreadSave).toEqual(["OUT unread"]);
    expect(o.unreadRoot).toEqual(["OUT unread"]);
  });
  it("New-R20PopSteps without -Pop3 is liveA20's (the plain count), with -Pop3 its ids are unchanged and its value steps are the capture steps", () => {
    expect(o.stepsPlain).toEqual(["OUT PLAIN PLAIN"]);
    expect(o.stepsPop3![0]).toBe("OUT IDS R-3-third-cn0,R-3-third-cn1,R-3-human-cn0,R-3-human-click1,R-3-human-click2,R-3-human-click3,R-3-human-cn1");
    expect(o.stepsPop3![1]).toBe("OUT F CAP R-3 third before / CAP R-3 third after / CAP R-3 human before / click: / click: / click: / CAP R-3 human after");
  });
  it("leaves no scratch capture behind", () => expect(o.leftovers![0]).toBe("OUT FILES r20-pop3-evidence.txt"));
  it("registers the three blocks on the -3 actor, with its commands", () => {
    const src = readFileSync(join(REPO, "recipes", "s13-r20-b4.ps1"), "utf8");
    for (const [b, cmd] of [["r20-pop-bg-3", "pop-bg-3"], ["r20-pop-fg-3", "pop-fg-3"], ["r20-pop-other-3", "pop-other-3"]]) {
      expect(src).toMatch(new RegExp(`R19Blocks\\['${b}'\\].*'${cmd}'.*-Pop3\\) -Actor 's13-r20-b4'`));
    }
    expect(src).toMatch(/^[\x20-\x7e\r\n\t]*$/);
  });
});

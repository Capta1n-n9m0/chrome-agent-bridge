// Tests of the S5-runner fixer round: the real text of recipes/s11-r16.ps1's functions and blocks runs in PowerShell with the
// UIA, node and Chrome helpers stubbed. Nothing here touches Chrome, a daemon or a port (the node cases run a throwaway script).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sliceBlocks } from "../s11-r16-plan.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(join(REPO, "recipes", "s11-r16.ps1"), "utf8").replace(/\r/g, "");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const fnText = (name: string): string => {
  const m = new RegExp(`function ${name}[\\s\\S]*?\\n}\\n`).exec(src);
  expect(m, name).not.toBeNull();
  return m![0];
};
const blkText = (n: string): string => {
  const m = new RegExp(`\\$Blocks\\['${n}'\\] = \\{[\\s\\S]*?\\n}\\n`).exec(src);
  expect(m, n).not.toBeNull();
  return m![0];
};
const mainText = (): string => src.slice(src.indexOf("try {\n  Load-S16"));
const q = (s: string): string => s.replace(/'/g, "''");

function runPs(script: string): { out: string[]; code: number | null } {
  const d = mkdtempSync(join(tmpdir(), "s11r16f-"));
  try {
    const f = join(d, "t.ps1");
    writeFileSync(f, script, "utf8");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" });
    return { out: r.stdout.split(/\r?\n/).filter(Boolean), code: r.status };
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}

/** The REAL up-restore block through the real Step-S16, Invoke-S16Block, Stop-S16Wave and main try/catch. */
function restoreHarness(restoreBody: string): string {
  return `
$ErrorActionPreference = 'Continue'
$FramingBlocks = @('teardown'); $NeedsAccess = @(); $Block = 'up-restore'
$global:S16Stops = 0; $global:S16Changed = $true; $global:S16InRestore = $false; $global:W = 1; $global:S16Fail = 0; $global:S16NM = 0
function Now9 { 'T' }
function Show-S16([string[]]$Lines) { foreach ($t in $Lines) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Say9([string]$Msg) { Show-S16 @("SAY $Msg") }
function Stop9([string]$Why) { Show-S16 @("STOP: $Why") }
function Load-S16 { }
function Save-S16 { }
function Set-S16Raw($n) { }
function Use-S16Options { 5 }
function Set-S9Foreground($h) { $true }
function Restore-S11Safety($a, $b, $c) { Write-Host 'RESTORE-CALLED'; ${restoreBody} }
function Invoke-S16Node { 0 }
function End-S16Actor { }
function Close-S16Windows { }
function Stop-S16All { }
function Test-S16Gate($n) { $true }
${fnText("Step-S16")}
${fnText("Stop-S16Wave")}
$Blocks = @{}
${blkText("up-restore")}
${fnText("Invoke-S16Block")}
${mainText()}`;
}

describe.skipIf(!hasPs)("MAJOR-1: a failed UP-RESTORE never restores a second time (the real block, the real catch)", () => {
  const calls = (o: string[]): number => o.filter((l) => l === "RESTORE-CALLED").length;
  it("a restore that returns false and prints a STOP: one restore, exit 2", () => {
    const r = runPs(restoreHarness("Stop9 'RESTORE FAILED (stub)'; $false"));
    expect(calls(r.out)).toBe(1);
    expect(r.code).toBe(2);
    expect(r.out.some((l) => l.includes("no second restore"))).toBe(true);
  });
  it("a restore that throws: one restore, exit 2", () => {
    const r = runPs(restoreHarness("throw 'uia'"));
    expect(calls(r.out)).toBe(1);
    expect(r.code).toBe(2);
  });
  it("a clean restore passes the block and exits 0", () => {
    const r = runPs(restoreHarness("$true"));
    expect(calls(r.out)).toBe(1);
    expect(r.code).toBe(0);
  });
});

describe.skipIf(!hasPs)("MINOR-2: liveB refuses before any state change when the toggle read is off", () => {
  const run = (reading: string, block: string): { out: string[]; code: number | null } =>
    runPs(`
$ErrorActionPreference = 'Continue'
${[...src.matchAll(/^\$(SliceA|SliceB|NeedsAccess) = .*$/gm)].map((m) => m[0]).join("\n")}
$Block = '${block}'; $global:S16Toggle = $null; $global:S16Gone = $false; $global:S16Fail = 0; $global:S16NM = 0
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$m) { Write-Host "STOP: $m" }
function Fail-S16([string]$m) { Stop9 $m; throw 'stop' }
function Load-S16 { }
function Save-S16 { }
function Invoke-S16Block([string]$n) { Write-Host "BLOCK $n" }
function Stop-S16Wave($w) { Write-Host 'STOPWAVE'; exit 2 }
function New-S16Window($u) { Write-Host 'OPEN-WINDOW'; 7 }
function Read-S11FileAccess($h) { '${reading}' }
function Close-S11Window($h) { Write-Host 'CLOSE-WINDOW' }
${fnText("Test-S16Gate")}
${fnText("Read-S16Early")}
${mainText()}`);
  it("off: only preflight runs, the window is closed, exit 3 (no reload, no servers, no tabs)", () => {
    const r = run("off", "liveB");
    expect(r.code).toBe(3);
    expect(r.out.filter((l) => l.startsWith("BLOCK"))).toEqual(["BLOCK preflight"]);
    expect(r.out).toContain("CLOSE-WINDOW");
  });
  it("on: liveB runs the whole slice; liveA never reads early", () => {
    const b = run("on", "liveB");
    expect(b.code).toBe(0);
    expect(b.out.filter((l) => l.startsWith("BLOCK")).length).toBe(sliceBlocks("B").length);
    const a = run("off", "liveA");
    expect(a.code).toBe(0);
    expect(a.out).not.toContain("OPEN-WINDOW");
  });
});

describe.skipIf(!hasPs)("MINOR-3 / MINOR-4: Invoke-S16Node and Stop-S16Pid, the real functions", () => {
  const node = (js: string): string[] => {
    const d = mkdtempSync(join(tmpdir(), "s11r16n-"));
    try {
      const f = join(d, "x.mjs");
      writeFileSync(f, js, "utf8");
      return runPs(`
$ErrorActionPreference = 'Continue'
$Repo = '${q(REPO)}'; $env:S11_OUT = '${q(d)}'
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Pids = @{}; $global:S16Born = @{}
function Show-S16([string[]]$Lines) { foreach ($t in $Lines) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Set-S16Pid($n, $i) { }
function Stop-S16Pid($n) { }
function Clear-S11Signals { }
${fnText("Invoke-S16Node")}
try { $r = Invoke-S16Node @() $null 60 '${q(f)}'; Write-Output "RESULT $r FAIL $($global:S16Fail)" } catch { Write-Output "THREW $($_.Exception.Message)" }
`).out;
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  };
  it("an exit 1 with no ROW or CHECK line (a crash) is a STOP, not a failed check", () => {
    const o = node("process.exit(1)");
    expect(o.some((l) => l.startsWith("THREW"))).toBe(true);
    expect(o.some((l) => l.startsWith("RESULT"))).toBe(false);
  });
  it("an exit 1 that printed a CHECK or ROW line is a recorded failed check", () => {
    expect(node("console.log('CHECK x FAIL'); process.exit(1)")).toContain("RESULT 1 FAIL 1");
    expect(node("console.log('ROW UP-X FAIL'); process.exit(1)")).toContain("RESULT 1 FAIL 1");
  });
  it("Stop-S16Pid ends a node process without its tree, and the two servers with /T", () => {
    const kill = (name: string): string[] =>
      runPs(`
$global:S16Pids = @{ '${name}' = 4242 }; $global:S16Born = @{ '${name}' = 99 }
function Get-Process { [CmdletBinding()] param($Id) [pscustomobject]@{ StartTime = [datetime]::FromBinary(0).AddTicks(99) } }
function taskkill { Write-Host ('KILL ' + ($args -join ' ')) }
function Say9([string]$m) { }
${fnText("Stop-S16Pid")}
Stop-S16Pid '${name}'
`).out.filter((l) => l.startsWith("KILL"));
    expect(kill("node")).toEqual(["KILL /F /PID 4242"]);
    expect(kill("srv8081")).toEqual(["KILL /T /F /PID 4242"]);
    expect(kill("srv8084")).toEqual(["KILL /T /F /PID 4242"]);
  });
});

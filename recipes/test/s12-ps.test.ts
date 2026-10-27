// Step 12 S1-helpers-a (fix round 1, F1): the guards that actually run are PowerShell, so they run here, with stubbed helpers (the
// s11-r16-runner.test.ts pattern). Nothing touches Chrome, a daemon or a port. Each mutant text must flip its check (red).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = readFileSync(join(REPO, "recipes", "s12-win.ps1"), "utf8").replace(/\r\n/g, "\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

interface Obs { lines: string[]; result: string; ret: string }
type Groups = Record<string, Obs>;
const PRE = (src: string, out: string): string => `
$S11Out = '${out}'; $S11Utf8 = New-Object Text.UTF8Encoding($false); $global:S11Own = @{}; $global:Clock = 1000000000000
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$m) { Write-Host "STOP: $m" }
function Assert-S11Outside([string]$p) { $p }
function Assert-S11Own($h, $w) { }
function Save-S11bConsole($h, $p) { Write-Host 'SAVED' }
function Get-S9DocUrl($h) { $global:Url }
function Get-S9ChromeWindows { @() }
function Start-Sleep { param([int]$Milliseconds) Write-Host "SLEEP $Milliseconds" }
. '${src}'
function Get-S12NowMs { $global:Clock }
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; try { $r = & $b; Write-Host "RET $r"; Write-Host 'RESULT ok' } catch { Write-Host 'RESULT threw' } }
function Stamp([long]$ago) { [IO.File]::WriteAllText((Join-Path $S11Out 'last-attach.stamp'), "$($global:Clock - $ago)") }
function NoStamp { Remove-Item (Join-Path $S11Out 'last-attach.stamp') -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force $S11Out | Out-Null
`;
const BODY: Record<string, string> = {
  cap: `
$cap = Join-Path $S11Out 'console-liveA18.txt'
T absent { Save-S12Console 1 'liveA18' }
[IO.File]::WriteAllText($cap, " \`r\`n ")
T blank { Save-S12Console 1 'liveA18' }
[IO.File]::WriteAllText($cap, 'SECRETTEXT')
T text { Save-S12Console 1 'liveA18' }
T free-text { Assert-S12CaptureFree 'liveA18' }
T free-other { Assert-S12CaptureFree 'liveB18' }
T bad-slice { Assert-S12CaptureFree 'liveC' }`,
  idle: `
T s14999 { Stamp 14999; Test-S12Idle 'R18-UP-6' }
T s15000 { Stamp 15000; Test-S12Idle 'R18-UP-6' }
T missing { NoStamp; Test-S12Idle 'R18-UP-6' }
T tail4000 { $S11SampleTailMs = 4000; Stamp 20000; Test-S12Idle 'R18-UP-6' }
T wait-unknown { NoStamp; Wait-S12Idle }
T wait-4000 { Stamp 4000; Wait-S12Idle }
T wait-ok { Stamp 15000; Wait-S12Idle }`,
  leg: `
function Invoke-S12Sampler([string]$Row, [long[]]$Hwnds) { Write-Host "SAMPLER-CALLED $Row"; [pscustomobject]@{ Polls = 3; Banner = 'none' } }
T neg5000 { Stamp 5000; [void](Invoke-S12BannerLeg 'neg' @(1)); Write-Host "G idle=$($global:S12Leg.IdleMs) polls=$($global:S12Leg.Polls) banner=$($global:S12Leg.Banner)" }
T neg-unknown { NoStamp; [void](Invoke-S12BannerLeg 'neg' @(1)) }
T pos { Stamp 100; [void](Invoke-S12BannerLeg 'pos' @(1)); Write-Host "G leg=$($global:S12Leg.Leg)" }`,
  devt: `
function Send-S12Key([long]$Hwnd, [string]$Key) { Write-Host "KEYSENT $Key" }
function Test-S12DevToolsUi([long]$Hwnd, [long[]]$Before) { $global:Ui }
T blank { $global:Url = 'about:blank'; Open-S12DevTools 7 }
T p8084 { $global:Url = 'http://localhost:8084/x.html'; Open-S12DevTools 7 }
T none { $global:Url = 'http://localhost:8081/s11-upload.html'; $global:Ui = $null; Open-S12DevTools 7 }
T pane { $global:Ui = [pscustomobject]@{ How = 'pane'; Hwnd = 7 }; Open-S12DevTools 7 }
T close-left { $global:S12Dev = $null; $global:S12Before = @(); $global:Ui = [pscustomobject]@{ How = 'pane'; Hwnd = 7 }; Close-S12DevTools 7 }
T close-clean { $global:Ui = $null; Close-S12DevTools 7 }`,
};

function run(group: string, src: string): Groups {
  const d = mkdtempSync(join(tmpdir(), "s12ps-"));
  try {
    const out = join(d, "out");
    const sf = join(d, "s12-win.ps1");
    writeFileSync(sf, src, "utf8");
    const f = join(d, "t.ps1");
    writeFileSync(f, PRE(sf.replace(/'/g, "''"), out.replace(/'/g, "''")) + BODY[group]!, "utf8");
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
const stops = (o: Obs): boolean => has(o, /^STOP: /);
const keys = (o: Obs): number => o.lines.filter((l) => l.startsWith("KEYSENT")).length;

const CHECKS: Record<string, Record<string, (g: Groups) => boolean>> = {
  cap: {
    "absent and blank are saved": (g) => g.absent!.result === "ok" && has(g.absent!, /^SAVED$/) && g.blank!.result === "ok" && has(g.blank!, /^SAVED$/),
    "text is a STOP with a throw, no save, never echoed": (g) => stops(g.text!) && g.text!.result === "threw" && !has(g.text!, /^SAVED$/) && !JSON.stringify(g).includes("SECRETTEXT"),
    "the prologue check STOPs on text and passes the other slice": (g) => g["free-text"]!.result === "threw" && stops(g["free-text"]!) && g["free-other"]!.result === "ok" && g["bad-slice"]!.result === "threw",
  },
  idle: {
    "14999 is a STOP and false": (g) => stops(g.s14999!) && g.s14999!.ret === "False" && has(g.s14999!, /IDLE R18-UP-6 since-attach-ms=14999$/),
    "15000 prints IDLE and is true": (g) => !stops(g.s15000!) && g.s15000!.ret === "True" && has(g.s15000!, /IDLE R18-UP-6 since-attach-ms=15000$/),
    "a missing stamp is a STOP with no IDLE line": (g) => stops(g.missing!) && g.missing!.ret === "False" && !has(g.missing!, /IDLE /),
    "a tail that is not 0 stops the banner rows' guard": (g) => g.tail4000!.result === "threw" && stops(g.tail4000!),
    "the wait: the remainder, the full 15 s when unknown, none when enough": (g) => has(g["wait-unknown"]!, /^SLEEP 15000$/) && has(g["wait-4000"]!, /^SLEEP 11000$/) && !has(g["wait-ok"]!, /^SLEEP /),
  },
  leg: {
    "neg under 15000 runs the window and records the idle (the judge FAILs it)": (g) => g.neg5000!.result === "ok" && has(g.neg5000!, /^SAMPLER-CALLED R18-BANNER-CTL-neg$/) && has(g.neg5000!, /^G idle=5000 polls=3 banner=none$/) && !stops(g.neg5000!),
    "neg with an unknown stamp is a STOP before the window": (g) => g["neg-unknown"]!.result === "threw" && stops(g["neg-unknown"]!) && !has(g["neg-unknown"]!, /SAMPLER-CALLED/),
    "the result is left in $global:S12Leg": (g) => has(g.pos!, /^G leg=pos$/),
  },
  devt: {
    "a window that is not on 8081 gets no key (about:blank, 8084)": (g) => g.blank!.result === "threw" && g.p8084!.result === "threw" && keys(g.blank!) === 0 && keys(g.p8084!) === 0 && stops(g.p8084!),
    "no DevTools shown: both keys, false; a pane after F12: true": (g) => g.none!.ret === "False" && keys(g.none!) === 2 && g.pane!.ret === "True" && keys(g.pane!) === 1,
    "a DevTools left after the close is a STOP and false": (g) => stops(g["close-left"]!) && g["close-left"]!.ret === "False",
    "a clean close is true with no STOP": (g) => g["close-clean"]!.ret === "True" && !stops(g["close-clean"]!),
  },
};

// [name, group, check that must flip, text to replace, replacement]
const MUTANTS: Array<[string, string, string, string, string]> = [
  ["M10 capture STOP inverted", "cap", "text is a STOP with a throw, no save, never echoed", ".Trim() -ne '')", ".Trim() -eq '')"],
  ["M11 capture throw removed", "cap", "the prologue check STOPs on text and passes the other slice", "throw 'capture exists'", "$null"],
  ["M15 idle -lt to -le", "idle", "15000 prints IDLE and is true", "if ($n -lt $S12IdleMinMs)", "if ($n -le $S12IdleMinMs)"],
  ["M16 no return after the idle STOP", "idle", "14999 is a STOP and false", 'no call sent"; return $false }\n  $true', 'no call sent" }\n  $true'],
  ["M17 an unknown stamp passes", "idle", "a missing stamp is a STOP with no IDLE line", 'unknown; no call sent"; return $false }', 'unknown; no call sent"; return $true }'],
  ["F4 no tail guard in Test-S12Idle", "idle", "a tail that is not 0 stops the banner rows' guard", "function Test-S12Idle([string]$Row) {\n  Assert-S12Tail\n", "function Test-S12Idle([string]$Row) {\n"],
  ["M-wait the wait skips an unknown stamp", "idle", "the wait: the remainder, the full 15 s when unknown, none when enough", "$ms = $S12IdleMinMs }", "$ms = 0 }"],
  ["F2 the idle STOP back in the neg leg", "leg", "neg under 15000 runs the window and records the idle (the judge FAILs it)", "$Leg -eq 'neg' -and $null -eq $idle)", "$Leg -eq 'neg' -and ($null -eq $idle -or $idle -lt $S12IdleMinMs))"],
  ["M18 neg-leg unknown guard removed", "leg", "neg with an unknown stamp is a STOP before the window", "throw 'idle unknown'", "$null"],
  ["F6 the leg result not left global", "leg", "the result is left in $global:S12Leg", "$global:S12Leg = [pscustomobject]", "$S12Leg = [pscustomobject]"],
  ["M19 fixture check removed", "devt", "a window that is not on 8081 gets no key (about:blank, 8084)", "-notmatch '^http://(127\\.0\\.0\\.1|localhost):8081/'", "-notmatch '^$'"],
  ["F9 8084 allowed", "devt", "a window that is not on 8081 gets no key (about:blank, 8084)", "localhost):8081/'", "localhost):(8081|8084)/'"],
  ["M20 close never STOPs", "devt", "a DevTools left after the close is a STOP and false", "{ Stop9 'a DevTools window or pane is left open'; return $false }", "{ return $true }"],
];

describe.skipIf(!hasPs)("s12-win.ps1 guards, run with stubbed helpers", { timeout: 120_000 }, () => {
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

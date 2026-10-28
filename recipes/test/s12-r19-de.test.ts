// Step 12 S7-drivers-DE: liveD19's R19-ARGS-OLD and liveE19's R19-VERSION against section 4.27. The pure decisions (recipes/s12-r19-de.ts) are unit-tested, each with the
// discrimination mutants the rows name; the PowerShell side (recipes/s12-r19-de.ps1 and the swap frame in s12-r19-lib.ps1) runs with every helper stubbed (no Chrome, daemon or port).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as D from "../s12-r19-de.js";
import { STOP_REASONS, swapFailText } from "../s12-r19.js";
import { WORDING } from "../s12-oldbuild.js";
import { oldLine } from "../s12-forms.js";
import { versionchLine } from "../s12-forms-c.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const DOC = rd("docs/e2e-test-plan.md");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"), DOC.indexOf("## 5. Results template"));
const ENTRY = rd("recipes/s12-r19.ps1");
const LIB = rd("recipes/s12-r19-lib.ps1");
const PSD = rd("recipes/s12-r19-de.ps1");
const TS = rd("recipes/s12-r19-de.ts");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const INTERCEPT = rd("daemon/src/intercept.ts");
const constOf = (name: string): string => new RegExp(`export const ${name} =\\s*\\n?\\s*"([^"]*)"`).exec(INTERCEPT)![1]!;

describe("the reload texts are the daemon's, not retyped", () => {
  it("the actor's constants equal the ones in daemon/src/intercept.ts and the sheet's quotes", () => {
    expect(D.ARGS_RELOAD_HINT).toBe(constOf("ARGS_RELOAD_HINT"));
    expect(D.CHOOSER_RELOAD_HINT).toBe(constOf("CHOOSER_RELOAD_HINT"));
    expect(SEC).toContain(D.ARGS_RELOAD_HINT);
    expect(SEC).toContain(D.CHOOSER_RELOAD_HINT);
    expect(D.ARGS_RELOAD_HINT).toContain(D.RELOAD_FRAGMENT);
    expect(D.CHOOSER_RELOAD_HINT).toContain(D.RELOAD_FRAGMENT);
    expect(TS).not.toContain("older build without");
  });
});

describe("R19-ARGS-OLD's decisions", () => {
  const ok = (leg: D.OldObs["leg"], over: Partial<D.OldObs> = {}): D.OldObs => ({ leg, code: "VERSION", hint: true, forwarded: leg === "raw" ? "no" : "n/a", ...over });
  it("each args call: VERSION with the hint; the raw leg also forwarded=no", () => {
    for (const l of ["sdk", "mcp", "ref", "file", "raw"] as const) expect(D.judgeOldLeg(ok(l)), l).toBe("PASS");
  });
  it("mutants: raw forwarded=yes, an SDK leg answering non-VERSION, a missing hint, a wrong forwarded word", () => {
    expect(D.judgeOldLeg(ok("raw", { forwarded: "yes" }))).toBe("FAIL");
    expect(D.judgeOldLeg(ok("raw", { forwarded: "n/a" }))).toBe("FAIL");
    for (const l of ["sdk", "mcp", "ref", "file", "raw"] as const) {
      expect(D.judgeOldLeg(ok(l, { code: "ok" })), l).toBe("FAIL");
      expect(D.judgeOldLeg(ok(l, { code: "PAGE_ERROR" })), l).toBe("FAIL");
      expect(D.judgeOldLeg(ok(l, { hint: false })), l).toBe("FAIL");
    }
    expect(D.judgeOldLeg(ok("sdk", { forwarded: "yes" }))).toBe("FAIL");
  });
  it("the hint is the daemon's ARGS_RELOAD_HINT, not any text holding the fragment (the generic RELOAD_HINT does)", () => {
    expect(D.hintSdk({ code: "VERSION", message: D.ARGS_RELOAD_HINT })).toBe(true);
    expect(D.hintSdk({ code: "VERSION", message: constOf("RELOAD_HINT") })).toBe(false);
    expect(D.hintSdk({ code: "VERSION", message: D.CHOOSER_RELOAD_HINT })).toBe(false);
    expect(D.hintSdk(undefined)).toBe(false);
    expect(D.hintMcp({ text: `VERSION: ${D.ARGS_RELOAD_HINT}` })).toBe(true);
    expect(D.hintMcp({ text: "VERSION: reload it at chrome://extensions" })).toBe(false);
  });
  it("the raw leg's forwarded word comes from the answer: any ok means it reached the old worker", () => {
    expect([D.rawForwarded(true), D.rawForwarded(false)]).toEqual(["yes", "no"]);
    expect(D.twinIsFunction(true, { kind: "function" })).toBe(true);
    for (const [okk, v] of [[true, undefined], [true, { kind: "value" }], [false, { kind: "function" }], [true, null]] as Array<[boolean, unknown]>) expect(D.twinIsFunction(okk, v)).toBe(false);
  });
  it("the control: ok with no hint, and its raw twin kind function; either missing is a FAIL", () => {
    const c: D.OldObs = { leg: "control", code: "ok", hint: false, forwarded: "n/a" };
    expect(D.judgeOldControl(c, true)).toBe("PASS");
    expect(D.judgeOldControl(c, false)).toBe("FAIL");
    expect(D.judgeOldControl({ ...c, code: "VERSION" }, true)).toBe("FAIL");
    expect(D.judgeOldControl({ ...c, hint: true }, true)).toBe("FAIL");
  });
  it("the printed line is form (20) with the sheet's keys", () => {
    expect(oldLine("R19-ARGS-OLD", { leg: "raw", code: "VERSION", hint: true, forwarded: "no" })).toBe("OLD R19-ARGS-OLD leg=raw code=VERSION hint=yes forwarded=no");
    expect(SEC).toContain("`OLD R19-ARGS-OLD leg=<sdk|mcp|ref|file|raw> code=VERSION hint=yes forwarded=<no on raw, n/a elsewhere>`");
  });
});

describe("R19-VERSION's decisions", () => {
  const v = (leg: D.VerObs["leg"], over: Partial<D.VerObs> = {}): D.VerObs => ({ leg, code: "VERSION", hint: true, exact: true, files: 0, clicks: 0, leaked: 0, ...over });
  it("each chooser call: VERSION, the daemon's text exactly, nothing on the page, no path in the text", () => {
    for (const l of ["sdk", "mcp", "raw"] as const) expect(D.judgeVersionLeg(v(l)), l).toBe("PASS");
  });
  it("mutants: chooser leg files=1, clicks, a missing hint, a message not === CHOOSER_RELOAD_HINT, a non-VERSION answer, a path in the text", () => {
    for (const l of ["sdk", "mcp", "raw"] as const) {
      for (const bad of [{ files: 1 }, { clicks: 1 }, { hint: false }, { exact: false }, { code: "ok" }, { code: "BAD_PARAMS" }, { leaked: 1 }] as Array<Partial<D.VerObs>>) expect(D.judgeVersionLeg(v(l, bad)), `${l} ${JSON.stringify(bad)}`).toBe("FAIL");
    }
  });
  it("the control upload (no chooser) is ok with one file; not ok, a hint, or no file is a FAIL", () => {
    const c = v("control", { code: "ok", hint: false, exact: false, files: 1 });
    expect(D.judgeVersionLeg(c)).toBe("PASS");
    for (const bad of [{ code: "K-gate" }, { code: "VERSION" }, { hint: true }, { files: 0 }, { files: 2 }] as Array<Partial<D.VerObs>>) expect(D.judgeVersionLeg({ ...c, ...bad })).toBe("FAIL");
  });
  it("hint and args: the fragment decides the hint; evaluate with args answers 7", () => {
    expect([D.hintOf(D.CHOOSER_RELOAD_HINT), D.hintOf("VERSION"), D.hintOf("")]).toEqual([true, false, false]);
    expect([7, "7", undefined, null, 8].map(D.judgeArgsAnswer)).toEqual(["PASS", "FAIL", "FAIL", "FAIL", "FAIL"]);
  });
  it("the printed line is form (27) with the sheet's keys", () => {
    expect(versionchLine("R19-VERSION", { leg: "sdk", code: "VERSION", hint: true, files: 0, exact: true })).toBe("VERSIONCH R19-VERSION leg=sdk code=VERSION hint=yes files=0 exact=yes");
    expect(SEC).toContain("`VERSIONCH R19-VERSION leg=sdk code=VERSION hint=yes files=0 exact=yes`");
    expect(SEC).toContain("`leg=control code=ok hint=no files=1`");
  });
});

describe("N-4: the swap's failure text names no path", () => {
  it("an fs error (it carries a path) is the fixed word; the swap's own wording passes through and holds no path", () => {
    expect(swapFailText(new Error("EPERM: operation not permitted, unlink 'C:\\Users\\x\\repo\\extension\\dist\\sw.js'"))).toBe("error");
    expect(swapFailText("C:\\x")).toBe("error");
    expect(swapFailText(new Error("ENOENT: no such file or directory, open '/home/x/y'"))).toBe("error");
    for (const w of Object.values(WORDING)) { expect(swapFailText(new Error(w))).toBe(w); expect(w).not.toMatch(/[\\/]/); }
    expect(swapFailText(new Error("swap: npm-ci failed"))).toBe("swap: npm-ci failed");
    expect(rd("recipes/s12-r19.ts")).not.toMatch(/SWAP failed: \$\{e instanceof Error \? e\.message/);
  });
});

// ---- the PowerShell side ---------------------------------------------------------------------------------------------------------------------------------
const STUBS = `
$global:S16Stops = 0; $global:Rec = @(); $global:Calls = New-Object System.Collections.ArrayList; $global:R17Out = @(); $global:RootAdded = 0; $global:R19RootAdded = $false; $Dash = [char]0x2014
$global:ReloadBody = { }
function C([string]$m) { [void]$global:Calls.Add($m); Write-Host $m }
function Say9([string]$m) { Write-Host "SAY $m" }
function Save-R19Seg([string]$b) { C 'SEG' }
function Open-R19Seg { C 'OPEN' }
function Get-R19RecordLines { @($global:Rec) }
function Invoke-R19Node { C "NODE:$(@($args[1])[0])"; 0 }
function Invoke-R19Stamped([scriptblock]$b) { & $b }
function Invoke-R19Rerun { C 'RERUN'; $true }
function Stop-R19([string]$r, [string]$w) { C "STOP:$r"; throw "stop $r" }
function Invoke-R19Row([string]$Id, [string[]]$Cmd, [string]$Actor = 'a') { C "ROW:$($Id):$($Cmd -join ' '):$Actor" }
$env:S11_OUT = $env:TEMP
$R17Blocks = @{ reload = { $global:RL++; if ($global:RL -eq 1) { & $global:ReloadBody } }; 'root-add' = { $global:RootAdded++ } }
`;
const SCEN = `
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; $global:Calls.Clear(); $global:S16Stops = 0; $global:RL = 0; try { & $b } catch { Write-Host "CAUGHT $_" }; Write-Host "STOPS $($global:S16Stops)"; Write-Host "END $n" }
$GAVE = { $global:Rec += '2026 s9-win: reload-extension.ps1 exit 2 (attempt 2)'; $global:S16Stops++; throw 'stop' }
T ok { $global:ReloadBody = { }; Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } 'R19-X' }
T gaveup { $global:ReloadBody = $GAVE; Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } 'R19-X' }
T gaveupNoId { $global:ReloadBody = $GAVE; Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } }
T exit3 { $global:ReloadBody = { $global:Rec += 's9-win: reload-extension.ps1 exit 3 (attempt 1)'; $global:S16Stops++; throw 'stop' }; Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } 'R19-X' }
T oldGaveEarlier { $global:Rec = @('reload-extension.ps1 exit 2 (attempt 2)'); $global:ReloadBody = { $global:S16Stops++; throw 'stop' }; Invoke-R19Swapped 'abc1234' { Write-Host 'ROWS' } 'R19-X' }
T argsOld { $global:R17Out = @('LOADED consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION'); Invoke-R19OldArgs }
T argsAnswered { $global:R17Out = @('LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered'); Invoke-R19OldArgs }
T argsNoLine { $global:R17Out = @(); Invoke-R19OldArgs }
T version { Invoke-R19OldVersion }
T rootOnce { Add-R19RootOnce; Add-R19RootOnce; Write-Host "ROOTS $($global:RootAdded)" }
`;
function runPs(lib: string, de: string): string[] {
  const d = mkdtempSync(join(tmpdir(), "s12de-"));
  writeFileSync(join(d, "lib.ps1"), lib, "utf8"); writeFileSync(join(d, "de.ps1"), de, "utf8");
  const f = join(d, "t.ps1"), q = (s: string): string => s.replace(/'/g, "''");
  writeFileSync(f, `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n. '${q(join(d, "lib.ps1"))}'\n. '${q(join(d, "de.ps1"))}'\n${STUBS}\n${SCEN}`, "utf8");
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 120_000 }).stdout.split(/\r?\n/);
}
const sect = (o: string[], n: string): string[] => o.slice(o.indexOf(`BEGIN ${n}`) + 1, o.indexOf(`END ${n}`));
const NOTLOAD = /^SAY ROW R19-X NOT RUN \u2014 old build not loadable/;
function mutate(src: string, from: string, to: string): string {
  expect(src.includes(from), `the mutated text exists: ${from.slice(0, 40)}`).toBe(true);
  return src.replace(from, () => to);
}
type Check = [string, (o: string[]) => boolean];
const CHECKS: Check[] = [
  ["a reload that works runs the rows, then restore-head and the re-proof", (o) => { const s = sect(o, "ok"); return s.includes("ROWS") && !s.some((l) => NOTLOAD.test(l)) && s.indexOf("NODE:restore-head") > s.indexOf("ROWS") && s.includes("RERUN"); }],
  ["a reload that gave up (exit 2 twice) is the row's NOT RUN, runs no row, clears the guard count, and the finally still restores", (o) => { const s = sect(o, "gaveup"); return s.some((l) => NOTLOAD.test(l)) && !s.includes("ROWS") && s.includes("STOPS 0") && s.includes("NODE:restore-head") && s.includes("RERUN") && !s.some((l) => l.startsWith("STOP:") || l.startsWith("CAUGHT")); }],
  ["without a row id the failure is thrown as before (the frame is not widened)", (o) => { const s = sect(o, "gaveupNoId"); return s.some((l) => l.startsWith("CAUGHT")) && !s.includes("ROWS") && s.includes("NODE:restore-head") && s.includes("RERUN"); }],
  ["any other reload failure (exit 3) is still thrown and the finally still restores", (o) => { const s = sect(o, "exit3"); return s.some((l) => l.startsWith("CAUGHT")) && !s.some((l) => NOTLOAD.test(l)) && !s.includes("ROWS") && s.includes("NODE:restore-head") && s.includes("RERUN"); }],
  ["a give-up line from before this reload does not excuse a later failure", (o) => { const s = sect(o, "oldGaveEarlier"); return s.some((l) => l.startsWith("CAUGHT")) && !s.some((l) => NOTLOAD.test(l)); }],
  ["ARGS-OLD: the proof is run, and only UNKNOWN_METHOD lets the row run, as the args-old actor of s12-r19-de", (o) => { const s = sect(o, "argsOld"); return s[0] === "NODE:proof" && s.includes("ROW:R19-ARGS-OLD:args-old:s12-r19-de"); }],
  ["ARGS-OLD: a proof that answers (the old build is not loaded), or prints no LOADED line, makes the row NOT RUN and sends no args call", (o) => ["argsAnswered", "argsNoLine"].every((n) => { const s = sect(o, n); return s.some((l) => /^SAY ROW R19-ARGS-OLD NOT RUN \u2014 old build not loadable/.test(l)) && !s.some((l) => l.startsWith("ROW:")); })],
  ["VERSION: the version actor", (o) => sect(o, "version").includes("ROW:R19-VERSION:version:s12-r19-de")],
  ["VERSION: the Upload folders get ROOT once, on the current build", (o) => sect(o, "rootOnce").includes("ROOTS 1")],
];
describe.skipIf(!hasPs)("the old-build drivers and the swap frame, with stubbed helpers", () => {
  const real = runPs(LIB, PSD);
  for (const [n, p] of CHECKS) it(`holds on the real files: ${n}`, () => { expect(p(real)).toBe(true); }, 60_000);
  const MUT: Array<[string, string, string, string, string[]]> = [
    ["a give-up is not recognised", "lib", "(attempt 2\\)'", "(attempt 9\\)'", ["a reload that gave up"]],
    ["the guard count is not cleared", "lib", "$global:S16Stops = $r19s0 }", "}", ["a reload that gave up"]],
    ["a row id is not needed to excuse a failure", "lib", "if (-not ($RowId -and (Test-R19ReloadGaveUp $r19n0))) { throw }", "if (-not (Test-R19ReloadGaveUp $r19n0)) { throw }", ["without a row id"]],
    ["any reload failure is excused", "lib", "if (-not ($RowId -and (Test-R19ReloadGaveUp $r19n0))) { throw }", "if ($false) { throw }", ["any other reload failure", "a give-up line from before"]],
    ["the rows run on an unloadable build", "lib", "if ($r19loaded) { & $Rows } else {", "if ($true) { & $Rows } else {", ["a reload that gave up"]],
    ["the give-up reads the whole record, not this reload's lines", "lib", "Select-Object -Skip $Skip", "Select-Object -Skip 0", ["a give-up line from before"]],
    ["the proof is not required to read UNKNOWN_METHOD", "de", "-match 'consoleMessages=UNKNOWN_METHOD'", "-match 'consoleMessages='", ["ARGS-OLD: a proof that answers"]],
    ["the row runs without the proof", "de", "  [void](Invoke-R19Node 's12-r19' @('proof'))\n", "", ["ARGS-OLD: the proof is run"]],
    ["root is added on every run", "de", "if ($global:R19RootAdded) { return }", "", ["VERSION: the Upload folders"]],
  ];
  for (const [what, file, from, to, names] of MUT) {
    it(`mutant "${what}" turns ${names.length} check(s) red`, () => {
      const o = file === "lib" ? runPs(mutate(LIB, from, to), PSD) : runPs(LIB, mutate(PSD, from, to));
      for (const n of names) { const c = CHECKS.find(([k]) => k.startsWith(n))!; expect(c[1](o), n).toBe(false); }
    }, 90_000);
  }
});

// ---- the static checks: every liveD19 and liveE19 block has a driver -------------------------------------------------------------------------------------
describe("every liveD19 and liveE19 block has a driver (S7-drivers-DE)", () => {
  const registered = new Set([...ENTRY.matchAll(/\$global:R19Blocks\['([^']+)'\] = \{/g)].map((m) => m[1]!));
  for (const r of (/Set-R19Reused @\(([^)]*)\)/.exec(ENTRY)![1]!).matchAll(/'([^']+)'/g)) registered.add(r[1]!);
  const blocks = (s: string): string[] => [...new RegExp(`${s} = \\$R19Prologue \\+ @\\(([^)]*)\\)`).exec(LIB)![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  for (const [s, row, block] of [["liveD19", "R19-ARGS-OLD", "r19-old-args"], ["liveE19", "R19-VERSION", "r19-old-version"]] as const) {
    it(`${s}: each block of its order is registered and the sheet's line names its row`, () => {
      for (const b of blocks(s)) expect(registered.has(b), b).toBe(true);
      expect(blocks(s)).toContain(block);
      expect(/^- \*\*liveD19 \(old build[^\n]*$/m.exec(SEC)![0]).toContain(`**${row}**`);
    });
  }
  it("the old-build blocks run their drivers inside the swap frame with the row id, from the sheet's commits; nothing prints `no driver built`", () => {
    expect(ENTRY).toContain("$global:R19Blocks['r19-old-args'] = { Invoke-R19Swapped $R19Commit['liveD19'] { Invoke-R19OldArgs } 'R19-ARGS-OLD' }");
    expect(ENTRY).toContain("$global:R19Blocks['r19-old-version'] = { Add-R19RootOnce; Invoke-R19Swapped $R19Commit['liveE19'] { Invoke-R19OldVersion } 'R19-VERSION' }");
    expect(ENTRY).toContain('. "$PSScriptRoot\\s12-r19-de.ps1"');
    expect(PSD).not.toContain("no driver built");
    expect(ENTRY).not.toMatch(/R19-(ARGS-OLD|VERSION) NOT RUN \$Dash no driver built/);
  });
  it("the actor commands the drivers run exist, the rows are the sheet's, the STOP words are the sheet's and go through Stop-R19", () => {
    const ran = [...PSD.matchAll(/Invoke-R19Row '[A-Z0-9-]+' @\('([a-z-]+)'\)/g)].map((m) => m[1]!);
    expect(ran.sort()).toEqual(["args-old", "version"]);
    expect(Object.keys(D.cmds).sort()).toEqual(["args-old", "version"]);
    for (const m of [...TS.matchAll(/new StopWhy\("([a-z-]+)"/g), ...PSD.matchAll(/Stop-R19 '([a-z-]+)'/g)]) expect(STOP_REASONS as readonly string[]).toContain(m[1]);
    expect(SEC).toContain("`NOT RUN — old build not loadable`");
    expect(PSD.match(/\bStop9\b|\bFail-S16\b|SilentlyContinue/g) ?? []).toEqual([]);
  });
  it("R19-RESTORE prints DIALOGS in all five slices (#364), and the driver file is ASCII and parses", () => {
    expect(LIB).toContain("$global:R19Slice -in 'liveA19', 'liveB19', 'liveC19', 'liveD19', 'liveE19' -and (Get-Command Write-R19Dialogs");
    expect(/^[\x00-\x7f]*$/.test(readFileSync(join(REPO, "recipes", "s12-r19-de.ps1"), "utf8"))).toBe(true);
    if (hasPs) expect(spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$e=$null;$t=$null;[void][Management.Automation.Language.Parser]::ParseFile('${join(REPO, "recipes", "s12-r19-de.ps1")}',[ref]$t,[ref]$e);$e.Count`], { encoding: "utf8" }).stdout.trim()).toBe("0");
  });
});

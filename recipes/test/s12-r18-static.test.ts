// Step 12 S1-helpers-c: static checks of Run 18's block runner (recipes/s12-r18.ps1 and s12-r18-lib.ps1) against its sources: the files parse and are
// ASCII, no SilentlyContinue, every command the runner calls exists (a helper file, the runner, or PowerShell itself), every s11/s11b subcommand it
// runs exists, and the lines the runner itself prints and the order it runs match docs/e2e-test-plan.md section 4.26 by key.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cmds as s11bCmds } from "../s11b.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const ENTRY = rd("recipes/s12-r18.ps1");
const LIB = rd("recipes/s12-r18-lib.ps1");
const PLAN = rd("docs/e2e-test-plan.md");
const SHEET = PLAN.slice(PLAN.indexOf("### 4.26 "), PLAN.indexOf("## 5. Results template"));
const HELPERS = ["s9-win.ps1", "s11-win.ps1", "s11b-win.ps1", "s12-win.ps1", "s11b-r17.ps1", "s11b-r17b.ps1", "s12-r18.ps1", "s12-r18-lib.ps1"];
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

/** Every command name the two runner files call, minus those defined in a helper file or resolvable by PowerShell itself (stdout: one name per line). */
function unresolved(): { all: string[]; missing: string[] } {
  const d = mkdtempSync(join(tmpdir(), "s12r18s-"));
  try {
    const f = join(d, "t.ps1");
    const files = (a: string[]): string => a.map((x) => `'${join(REPO, "recipes", x).replace(/'/g, "''")}'`).join(",");
    writeFileSync(f, `
$called = @{}; $defined = @{}
foreach ($p in ${files(HELPERS)}) {
  $tk = $null; $er = $null; $ast = [Management.Automation.Language.Parser]::ParseFile($p, [ref]$tk, [ref]$er)
  foreach ($fn in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] }, $true)) { $defined[$fn.Name] = $true }
  if ($p -like '*s12-r18*') { foreach ($c in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.CommandAst] }, $true)) { $nm = $c.GetCommandName(); if ($nm) { $called[$nm] = $true } } }
}
if ((Get-Content -Raw (Join-Path (Split-Path ${files(["s12-win.ps1"])} -Parent) "s12-win.ps1")) -match "Invoke-S11Opt. .Invoke-S12Opt") { $defined["Invoke-S12Opt"] = $true }
$missing = @(); foreach ($k in $called.Keys) { if (-not $defined.ContainsKey($k) -and -not (Get-Command $k -ErrorAction Ignore)) { $missing += $k } }
"ALL " + (($called.Keys | Sort-Object) -join ',')
"MISSING " + ($missing -join ',')
`, "utf8");
    const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" }).stdout;
    const pick = (k: string): string[] => (new RegExp(`^${k} (.*)$`, "m").exec(out)?.[1] ?? "").trim().split(",").filter(Boolean);
    return { all: pick("ALL"), missing: pick("MISSING") };
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}

describe("the runner's source", () => {
  for (const [name, src] of [["s12-r18.ps1", ENTRY], ["s12-r18-lib.ps1", LIB]] as const) {
    it(`${name} is ASCII and never writes SilentlyContinue`, () => {
      expect(/^[\x00-\x7f]*$/.test(readFileSync(join(REPO, "recipes", name), "utf8"))).toBe(true);
      expect(src.includes("SilentlyContinue")).toBe(false);
    });
    it.skipIf(!hasPs)(`${name} parses with 0 errors`, () => {
      const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$e=$null;$t=$null;[void][Management.Automation.Language.Parser]::ParseFile('${join(REPO, "recipes", name)}',[ref]$t,[ref]$e);$e.Count`], { encoding: "utf8" });
      expect(r.stdout.trim()).toBe("0");
    });
  }
  it.skipIf(!hasPs)("every command the runner calls exists in a helper file, the runner, or PowerShell", () => {
    const u = unresolved();
    // the helper entry points named in the report
    for (const n of ["Assert-S12CaptureFree", "Save-S12Console", "Wait-S12Idle", "Test-S12Idle", "Invoke-S12BannerLeg", "Invoke-S12Opt", "Invoke-S12RaceA", "Invoke-S12DevtRow", "Assert-S12Patched", "Set-S12AttachStamp", "Invoke-S11bSamplerPasses", "Get-S11bOptObs", "Read-S11FileAccess", "Restore-S11Safety", "Test-S11Own", "Get-S9ById", "Get-S9Options", "Invoke-R17Node", "Invoke-R17Judge", "Get-S11bStopCause"]) expect(u.all, n).toContain(n);
    expect(u.missing).toEqual([]);
  });
  it("every s11 and s11b subcommand the runner runs exists", () => {
    const run = [...(ENTRY + LIB).matchAll(/Invoke-R(?:17|18)Node '(s11b?)' (?:@\('([a-z0-9-]+)'|\(@\('([a-z0-9-]+)')/g)];
    expect(run.length).toBeGreaterThan(12);
    const s11 = rd("recipes/s11.ts");
    for (const m of run) {
      const sub = (m[2] ?? m[3])!;
      if (m[1] === "s11b") expect(Object.keys(s11bCmds), `s11b ${sub}`).toContain(sub);
      else expect(new RegExp(`(async )?"?${sub}"?\\(`).test(s11) || s11.includes(`"${sub}"`), `s11 ${sub}`).toBe(true);
    }
    for (const sub of ["bannerctl", "bannerctl-judge", "raw-l1", "leg-line", "scan18", "console-line", "devt", "race", "up6", "raw", "clean-console"]) expect(ENTRY + LIB, sub).toContain(`'${sub}'`);
  });
  it("the human gates: a UIA-only toolbar, no press of the file-URL toggle, DevTools only in window X", () => {
    expect(ENTRY).toContain("$global:S9PinUiaOnly = $true");
    expect((ENTRY + LIB).match(/[\w-]*FileAccess\w*/g)!.every((w) => w === "Read-S11FileAccess")).toBe(true);
    expect(LIB).toMatch(/Invoke-S12DevtRow \$global:X/);
    expect(ENTRY).not.toMatch(/Start-Process[^\n]*chrome/i);
  });
  it("the entry only maps each block name to its lib function, runs no node process itself, and exits with the main's code", () => {
    const map: Array<[string, string]> = [["r18-0", "Invoke-R18Zero $R17bZero"], ["r18-up-l1", "Invoke-R18UpL1"], ["r18-banner-ctl", "Invoke-R18BannerCtl"], ["r18-up-opt", "Invoke-R18UpOpt"], ["r18-up-6", "Invoke-R18Up6"], ["r18-f-raw", "Invoke-R18Raw 'F-RAW'"], ["r18-f-raw-2", "Invoke-R18Raw 'F-RAW-2'"], ["r18-f-raw-dir", "Invoke-R18Raw 'F-RAW-DIR' @('--dir', 's11b-dir')"], ["r18-save-refuse", "Invoke-R18SaveRefuse"], ["r18-up-race-a", "Invoke-R18UpRaceA"], ["r18-up-devt", "Invoke-R18UpDevt"], ["r18-restore", "Invoke-R18Restore"], ["r18-logs", "Invoke-R18Logs"]];
    for (const [k, fn] of map) expect(ENTRY, k).toContain(`$global:R18Blocks['${k}'] = { ${fn} }`);
    expect(ENTRY).not.toContain("Invoke-R17Node");
    expect(LIB.match(/Invoke-R17Node/g)!.length - (LIB.match(/Invoke-R17Node @args/g) ?? []).length).toBe(1 /* the header comment */);
    expect(ENTRY).toContain("Set-R18Reused @('files', 'window', 'reload', 'console', 'teardown', 'root-add') $R17Blocks");
    expect(ENTRY).toContain("exit ([int](@(Invoke-R18Main $Block)[-1]))");
    expect(ENTRY).toContain("[int]$Att = 1");
    expect(ENTRY).toContain("(Get-R18RecordName $Block $Att)");
  });
  it("-Block teardown writes to the framing file, never a record file in the steps dir", () => {
    expect(ENTRY).toContain("$Record = if ($Block -eq 'teardown') { $Framing } else {");
    expect(ENTRY.indexOf("$Framing = Join-Path")).toBeLessThan(ENTRY.indexOf("$Record = if"));
  });
  it("the handoff names the rule: after a STOP that names a failed restore, no teardown and no re-run", () => {
    expect(ENTRY).toMatch(/failed restore[^\n]*never run -Block teardown or re-run; return to the user/);
  });
  it("the preflight's probes ignore a missing command so their own STOP prints, and a missing S12 helper is a STOP line", () => {
    expect(ENTRY).toContain("-Name python -CommandType Application -ErrorAction Ignore).Count) { Fail-S16 'python was not found' }");
    expect(ENTRY).toContain("(Get-Command Invoke-S12Opt -ErrorAction Ignore)) { Write-Host 'STOP: Run 17b''s r17b-0 block or the S12 helpers were not read'; exit 2 }");
    expect(ENTRY).not.toMatch(/ErrorAction Stop/);
  });
});

describe("the runner against section 4.26", () => {
  const bold = (s: string): string[] => [...s.matchAll(/\*\*(R18-[A-Z0-9-]+)\*\*/g)].map((m) => m[1]!);
  const sheetA = bold(/Order of \*\*liveA18\*\*: ([^\n]*?)\. Order of/.exec(SHEET)![1]!);
  const sheetB = ["R18-0", ...bold(/Order of \*\*liveB18\*\*: ([^\n]*?)\. A row that/.exec(SHEET)![1]!)];
  const ids = (slice: string): string[] => {
    const m = new RegExp(`${slice} = @\\(([^)]*)\\)`).exec(LIB)![1]!;
    return [...m.matchAll(/'(r18-[a-z0-9-]+|root-add)'/g)].map((x) => x[1]!).filter((x) => x !== "r18-bc-close").map((x) => (x === "root-add" ? "" : x.toUpperCase())).filter(Boolean);
  };
  it("the row order of each slice is the sheet's (the ledger blocks aside)", () => {
    expect(sheetA.length).toBe(8);
    expect(ids("liveA18")).toEqual(sheetA);
    expect(ids("liveB18")).toEqual(sheetB);
  });
  it("the sheet's own order puts the prologue first and the banner control before each slice's first banner row", () => {
    expect(SHEET).toMatch(/preflight, servers, files/);
    expect(ids("liveA18").indexOf("R18-BANNER-CTL")).toBeLessThan(ids("liveA18").indexOf("R18-UP-6"));
    expect(ids("liveB18").indexOf("R18-BANNER-CTL")).toBeLessThan(ids("liveB18").indexOf("R18-F-RAW"));
    expect(ids("liveA18").indexOf("R18-UP-L1")).toBeLessThan(ids("liveA18").indexOf("R18-UP-OPT"));
  });
  it("every row the runner prints exists in the sheet's table; the helper-printed ones are named", () => {
    const printed = new Set([...(ENTRY + LIB).matchAll(/(?:Invoke-R18RowBlock|Write-R18RowLine|Invoke-R18Raw|Set-R18Pending) ['"](?:R18-)?([A-Z0-9-]+)/g)].map((m) => (m[0].includes("Invoke-R18Raw") ? `R18-${m[1]}` : m[1]!.startsWith("R18-") ? m[1]! : `R18-${m[1]}`)));
    printed.delete("R18-");
    const table = new Set([...SHEET.matchAll(/^\| (R18-[A-Z0-9-]+)/gm)].map((m) => m[1]!));
    expect(table.size).toBe(13);
    for (const p of printed) expect(table.has(p), p).toBe(true);
    for (const own of ["R18-BANNER-CTL", "R18-UP-DEVT"]) expect(table.has(own)).toBe(true); // printed by s11b bannerctl-judge and s11b devt
    expect([...printed].sort()).toEqual(["R18-0", "R18-F-RAW", "R18-F-RAW-2", "R18-F-RAW-DIR", "R18-LOGS", "R18-RESTORE", "R18-SAVE-REFUSE", "R18-UP-6", "R18-UP-L1", "R18-UP-OPT", "R18-UP-RACE-A"]);
  });
  it("the forms the runner prints are the sheet's: ROW with the six verdicts, HEAD, NOT RUN, slice=", () => {
    expect(SHEET).toContain("`HEAD <12 hex> tree=clean`");
    expect(LIB).toContain('Show-S16 @("HEAD $($r18H.Head) tree=clean")');
    expect(SHEET).toContain("NOT RUN — waits for G11-3");
    expect(LIB).toContain("NOT RUN $([char]0x2014) waits for G11-3");
    expect(SHEET).toContain("`ROW <id> <STOP|FAIL|NOT DISCRIMINATING|NOT MEASURED|NOT RUN|PASS|RECORD>[ …]`");
    expect(LIB).toContain("'STOP', 'FAIL', 'NOT DISCRIMINATING', 'NOT MEASURED', 'NOT RUN', 'PASS'");
    expect(SHEET).toContain("rows run in both slices end the verdict with `slice=<A|B>`");
    expect(LIB).toContain('" slice=$(Get-R18SliceLetter $Slice)"');
    expect(SHEET).toContain("`CHECK …`");
    expect(LIB).toContain("CHECK banner-clauses slice=");
    for (const row of ["R18-F-RAW", "R18-F-RAW-2", "R18-F-RAW-DIR", "R18-UP-RACE-A", "R18-UP-DEVT"]) {
      expect(LIB).toContain(`'${row}'`);
      expect(SHEET).toContain(`${row}★`.replace("★", ""));
    }
    expect(SHEET).toContain("R18-F-RAW, -F-RAW-2, -F-RAW-DIR, R18-UP-RACE-A and R18-UP-DEVT are written `NOT RUN");
  });
  it("the console capture is per slice and the control and idle rules are the sheet's", () => {
    expect(SHEET).toContain("`console-liveA18.txt` and `console-liveB18.txt`");
    expect(LIB).toContain('"console-$r18Sl.txt"');
    expect(SHEET).toContain("at least 15 s after the last attach");
    expect(LIB).toMatch(/Wait-S12Idle[\s\S]{0,80}Test-S12Idle \$Row/);
    expect(LIB).toContain("-Hwnds @($global:W)");
    expect(LIB).toContain("'http://localhost:8081/e2e-playground.html?s12=bc'");
    expect(SHEET).toContain("http://localhost:8081/e2e-playground.html?s12=bc");
  });
});

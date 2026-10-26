// S4-helpers fixer tests of the PowerShell side (recipes/s11b-r17.ps1, s11b-win.ps1): findings M1-M5, m1-m6, n2 and the two runner mutants of m4.
// The .ps1 files are read as text; a few functions run in a PowerShell child with stubs. Nothing touches Chrome, a daemon or a port.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STOP_MAP } from "../s11b-r17-plan.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runner = readFileSync(join(REPO, "recipes", "s11b-r17.ps1"), "utf8");
const win = readFileSync(join(REPO, "recipes", "s11b-win.ps1"), "utf8");
const b17 = readFileSync(join(REPO, "recipes", "s11b.ts"), "utf8");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
function unit(src: string, head: RegExp): string {
  const lines = src.split(/\r?\n/);
  const s = lines.findIndex((l) => head.test(l));
  expect(s, String(head)).toBeGreaterThanOrEqual(0);
  let e = s + 1;
  while (e < lines.length && !/^(\$Blocks\['|function |# ----|try \{)/.test(lines[e]!)) e++;
  return lines.slice(s, e).join("\n");
}
const block = (name: string): string => unit(runner, new RegExp(`^\\$Blocks\\['${name}'\\] =`));
const fn = (src: string, name: string): string => unit(src, new RegExp(`^function ${name}\\b`));
const before = (text: string, a: string, b: string): void => {
  expect(text.indexOf(a), a).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(b), b).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(a), `${a} before ${b}`).toBeLessThan(text.indexOf(b));
};
const ps = (script: string): { out: string[]; status: number | null } | null => {
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
  if (r.error) return null;
  return { out: r.stdout.split(/\r?\n/).filter(Boolean), status: r.status };
};

describe("M1: RD-0 (a) is the first thing that reaches the record (D4.2)", () => {
  const rd0 = block("rd0");
  it("the manifest eval runs first, with only its MANIFEST and ROW lines routed to the record; the toggle, the found read and the chatter go to the framing file", () => {
    const m = rd0.indexOf("Invoke-S11bConsoleEval $global:D 'manifest'");
    expect(m).toBeGreaterThan(0);
    // nothing but the state guard stands before it
    const head = rd0.slice(0, m);
    for (const x of ["Say9", "Invoke-R17Node", "Read-S11FileAccess", "Save-S11Found", "Read-R17Rules", "Stop9"]) expect(head, x).not.toContain(x);
    before(rd0, "$env:S9_RAW = $Framing; $global:S11bRecordFile = $Record", "Invoke-S11bConsoleEval $global:D 'manifest'");
    expect(rd0).toContain("finally { $global:S11bRecordFile = $null; Set-S16Raw 'rd0' }");
    before(rd0, "Invoke-S11bConsoleEval $global:D 'manifest'", "Read-R17Rules");
    before(rd0, "Read-R17Rules", "Read-S11FileAccess");
    before(rd0, "Invoke-S11bConsoleEval $global:D 'manifest'", "Save-S11Found");
    // the second framing switch stands before the toggle read and is undone after the found state
    const sw = rd0.indexOf("$env:S9_RAW = $Framing", m);
    expect(sw).toBeGreaterThan(m);
    expect(sw).toBeLessThan(rd0.indexOf("Read-S11FileAccess"));
    before(rd0, "'found', '--file'", "} finally { Set-S16Raw 'rd0' }\n  if ($global:R17Fallback) { Invoke-R17CapsWarn -First }");
  });
  it("the FALLBACK branch: its notice goes to the framing file, RD-CAPS-WARN's typing chatter too, and (a-prime) runs before STATE and the found-list check", () => {
    expect(rd0).toContain("$env:S9_RAW = $Framing; Say9 'RD-0 FALLBACK");
    expect(fn(runner, "Invoke-R17CapsWarn")).toContain("if ($First) { $env:S9_RAW = $Framing }");
    expect(fn(runner, "Invoke-R17CapsWarn")).toContain("finally { if ($First) { $env:S9_RAW = $Record } }");
    before(rd0, "Invoke-R17CapsWarn -First", "'state'");
    before(rd0, "'state'", "'foundlist'");
  });
  it("the record router: only MANIFEST and ROW lines follow $global:S11bRecordFile, and the print exemption is still the one filtered line", () => {
    const o = fn(win, "Write-S11bB17Out");
    expect(o).toContain("$global:S11bRecordFile -and $l -match '^(MANIFEST |ROW )'");
    expect(o).toContain("$env:S9_RAW = $keep");
    expect(win.split(/\r?\n/).filter((l) => l.includes("# s11b-print-ok"))).toHaveLength(1);
  });
  it.skipIf(!hasPs)("run in PowerShell: with the record file set MANIFEST and its ROW go to it, every other line to the framing file; the file is restored after", () => {
    const re = /^\$S11bPrintRe = '.*'$/m.exec(win)![0];
    const script =
      `${re}\nfunction Say9([string]$m) { 'SAY ' + $m }\nfunction Write-S9Raw([string]$l) { 'RAW[' + $env:S9_RAW + '] ' + $l }\n${fn(win, "Write-S11bB17Out")}\n` +
      "$res = [pscustomobject]@{ Lines = @('EXPR manifest ok len=3', 'MANIFEST dnrWithHostAccess=true staticRuleSets=absent', 'ROW RD-0 (a) PASS: x', 'CONSOLE noise') }\n" +
      "$env:S9_RAW = 'FRAMING'; $global:S11bRecordFile = 'RECORD'; Write-S11bB17Out $res; 'AFTER ' + $env:S9_RAW\n" +
      "$global:S11bRecordFile = $null; Write-S11bB17Out $res";
    const r = ps(script);
    if (!r) return;
    const keep = r.out.filter((l) => /^(RAW\[|AFTER|SAY)/.test(l));
    expect(keep).toEqual([
      "RAW[FRAMING] EXPR manifest ok len=3", "RAW[RECORD] MANIFEST dnrWithHostAccess=true staticRuleSets=absent", "RAW[RECORD] ROW RD-0 (a) PASS: x", "SAY B17: 1 other line(s) withheld", "AFTER FRAMING",
      "RAW[FRAMING] EXPR manifest ok len=3", "RAW[FRAMING] MANIFEST dnrWithHostAccess=true staticRuleSets=absent", "RAW[FRAMING] ROW RD-0 (a) PASS: x", "SAY B17: 1 other line(s) withheld",
    ]);
  });
});

describe("M2: RD-0 (c) prints the sheet's STATE line through B17 state", () => {
  it("the block calls B17 state with the found json and the found Upload folders text, after S11 found, and S11 found's Run 16 line stays in the framing file", () => {
    const rd0 = block("rd0");
    expect(rd0).toContain("'state', '--found', $FoundJson, '--folders', (Join-Path $FoundDir 'found-uploadfolders.txt')) -StopOnFail");
    before(rd0, "'found', '--file', $FoundJson", "'state', '--found'");
    before(rd0, "'state', '--found'", "'foundlist'");
  });
});

describe("M3: RD-LOGS passes the alias, the socket window and scans the actors with B17", () => {
  const logs = block("rd-logs");
  it("clean-console runs before any scan; the alias goes to each scan; the actors are scanned with B17 scan only when an actor ran", () => {
    before(logs, "'clean-console'", "'scan', '--what', 'console'");
    expect(logs).toContain("$al = Get-R17Alias");
    expect(logs).toContain("@(if ($al) { '--alias', $al })");
    for (const w of ["console", "daemon", "actors"]) expect(logs).toMatch(new RegExp(`'scan', '--what', '${w}'[^\\n]*\\+ \\$ac`));
    expect(logs).toContain("if ($global:R17ActorRan)");
    expect(logs).not.toContain("'s11' @('scan'");
    expect(fn(runner, "Get-R17Alias")).toContain("state.json");
    expect(block("r17-save-refuse")).toContain("$global:R17ActorRan = $true");
  });
  it("sock127: the console marks and the daemon-log window are passed only when RD-DL-SOCKET ran", () => {
    expect(logs).toContain("if ($global:R17SockRan) { $sc = @('--sock-console'); $sd = @('--sock-lines', \"$($global:R17SockLog0),$($global:R17SockLog1)\") }");
    const b = block("rd-dl-socket");
    before(b, "Invoke-R17SockMark 'start'", "Start-R17Bg");
    before(b, "R17SockLog0", "Invoke-R17SockMark 'start'");
    before(b, "1..12", "Invoke-R17SockMark 'end'");
    before(b, "Invoke-R17SockMark 'end'", "R17SockLog1");
    before(b, "R17SockLog1", "sock-close");
    expect(b).toContain("$global:R17SockRan = $true");
    const m = fn(runner, "Invoke-R17SockMark");
    expect(m).toContain("Invoke-S11bConsoleEval $global:D 'mark' @('--label', $Label) @('--label', $Label)");
    expect(m).toContain("if ($global:R17Fallback) { return }");
    for (const g of ["R17SockRan", "R17SockLog0", "R17SockLog1", "R17ActorRan", "R17ErrMs", "R17HopMs", "R17Rd3Ms"]) expect(runner).toMatch(new RegExp(`\\$Persist = @\\([^)]*'${g}'`));
  });
});

describe("m1: RD-DL-ERR, RD-DL-HOP, RD-1 and RD-3 time and judge from S9's own row", () => {
  it("both rows record the call, judge it with B17 judge-row (not S9's code:INTERNAL expectation) and print LAT in the sheet's form", () => {
    for (const [b, kind] of [["rd-dl-err", "dl-err"], ["rd-dl-hop", "dl-hop"]] as const) {
      const t = block(b);
      expect(t, b).toContain("'record')");
      expect(t, b).not.toContain("code:INTERNAL");
      expect(t, b).not.toContain("Stopwatch");
      expect(t, b).not.toContain("node start included");
      expect(t, b).toContain("'judge-row'");
      expect(t, b).toContain(`'${kind}'`);
      expect(t, b).toContain("'--lat'");
    }
    const hop = block("rd-dl-hop");
    expect(hop).toContain("'dl-record', '--hop'");
    expect(hop).toContain("'--err'");
    expect(hop).toContain("'--rd3'");
    before(hop, "'judge-row'", "'dl-record'");
    expect(block("rd-dl-err")).toContain("$global:R17ErrMs += $ms");
    expect(block("rd1")).toContain("'lat' 'RD-1'");
    expect(block("rd3")).toContain("'lat' 'RD-3'");
  });
});

describe("M5: F-FILETAB judges its three answers and runs the control", () => {
  const b = block("f-filetab");
  it("tabs, snapshot and navigate on the hidden tab, the tab untouched, and the control navigate of a fixture tab to the file: URL", () => {
    expect(b).toContain("'F-FILETAB tabs' 'tabs' 'tabs-hidden'");
    expect(b).toContain("'F-FILETAB snapshot' 'snap' 'filepage'");
    expect(b).toContain("'F-FILETAB navigate' 'nav' 'filepage'");
    expect(b).toContain("'F-FILETAB untouched' 'tabs2' 'tabs-hidden'");
    expect(b).toContain("'F-FILETAB control' 'ctl' 'fileurl'");
    expect(b).toContain("New-R17Tab 'F-FILETAB' 'ft' 'ftp'");
    expect(b).toContain("[Uri](Join-Path $Root 's11b-file.html')).AbsoluteUri");
    before(b, "'F-FILETAB navigate'", "New-R17Tab 'F-FILETAB' 'ft'");
    before(b, "'F-FILETAB control'", "Close-S11Window $FW");
    expect(b).toContain("tabCreated url-empty=NOT MEASURED");
  });
});

describe("n2 and m2: the history rows print the sheet's HITS form; RD-7 and RD-8 read RULES after the reply", () => {
  it("-BlockedOnly goes through Get-R17Hits as --only blocked, and Invoke-R17History uses it with the flip log", () => {
    expect(fn(runner, "Get-R17Hits")).toContain("if ($BlockedOnly) { $a += @('--only', 'blocked') }");
    expect(fn(runner, "Invoke-R17History")).toContain("Get-R17Hits $Tag -BlockedOnly -Flip");
  });
  it("RD-7 and RD-8 call Read-R17Rules right after their navigate reply, and RD-7 names the UIA read it cannot do", () => {
    for (const [b, row] of [["rd7", "RD-7"], ["rd8", "RD-8"]] as const) {
      const t = block(b);
      const nav = t.indexOf(`Call9 '${row}' 'nav'`);
      expect(nav, b).toBeGreaterThan(0);
      const rules = t.indexOf("Read-R17Rules", nav);
      expect(rules, b).toBeGreaterThan(nav);
      expect(rules, b).toBeLessThan(t.indexOf("Start-Sleep -Seconds 2", nav));
    }
    expect(block("rd7")).toContain("UIA read of the options heading NOT MEASURED");
  });
});

describe("M-new (fixer 2): RD-7 on the console FALLBACK branch makes no call", () => {
  const b = block("rd7");
  it("the FALLBACK guard prints NOT RUN with its reason and returns before the tab, the navigate and any call", () => {
    expect(b).toContain("if ($global:R17Fallback) { Say9 'ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)'; $global:S16NM++; return }");
    before(b, "$global:R17Fallback", "New-R17Tab");
    before(b, "$global:R17Fallback", "Call9");
    before(b, "$global:R17Fallback", "Invoke-S11bConsoleEval");
    // fixer 3 (m3-1) adds the probe's re-check: the guard and the re-check are the only two returns before the tab opens
    expect(b.slice(0, b.indexOf("New-R17Tab")).match(/return/g)).toHaveLength(2);
  });
  it("RD-8's stopper is the snapshot text, not the console, so RD-8 needs no such guard", () => {
    const e = block("rd8");
    expect(e).not.toContain("Invoke-S11bConsoleEval");
    expect(e).toContain("This tab shows a local file");
    expect(e).not.toContain("R17Fallback");
  });
  it("F-FILETAB judges the hidden row's no-url-no-title clause by B17 filetab (fixer 3, m3-2), with no RECORD-prefixed NOT MEASURED line", () => {
    const f = block("f-filetab");
    expect(f).toContain("[void](Invoke-R17Node 's11b' @('filetab'))");
    before(f, "'F-FILETAB tabs' 'tabs' 'tabs-hidden'", "@('filetab')");
    before(f, "@('filetab')", "Close-S11Window $FW");
    expect(f).not.toContain("tabs hidden row has no url, no title: NOT MEASURED");
    expect(f).not.toMatch(/RECORD F-FILETAB tabs hidden/);
  });
});

describe("m3: RD-5 does not wait out the call's 60 s when the stored value never matched", () => {
  const b = block("rd5");
  it("a cancel file reaches both the stored listener and the waiting call, and the hits are not judged when nothing matched", () => {
    expect(b).toContain("'--go', $sf, '--cancel', $cf)");
    expect(b).toContain("'--signal', $sf, '--cancel', $cf, '--expr', $xf");
    expect(b).toContain("Remove-Item -LiteralPath $pf, $sf, $xf, $cf");
    expect(b).toContain("$codes += $(if ($codes[0] -eq 0) { Get-R17HitCode 'rd5' } else { 3 })");
  });
});

describe("m4: the STOP map's covered-call and tree rows, and the two runner guards that had no test", () => {
  it("covered-proceeds-hop, -rd5 and -rd5b are in the map with a marker on a line that stops; the tree check runs at the preflight and at the end of RD-LOGS", () => {
    for (const id of ["covered-proceeds-hop", "covered-proceeds-rd5", "covered-proceeds-rd5b"]) {
      expect(STOP_MAP.map((s) => s.id), id).toContain(id);
      expect(runner, id).toContain(`# STOP-MAP ${id}`);
    }
    expect(fn(runner, "Assert-R17TreeClean")).toMatch(/Fail-S16[^\n]*# STOP-MAP tree-dirty/);
    expect(block("preflight")).toContain("Assert-R17TreeClean");
    expect(block("rd-logs")).toContain("Assert-R17TreeClean");
    before(block("rd-logs"), "'scan', '--what', 'actors'", "Assert-R17TreeClean");
  });
  it.skipIf(!hasPs)("Stop-S16Wave restores exactly once when the stop is outside the restore, and never when it met the restore itself (the no-double-restore condition)", () => {
    const run = (inRestore: boolean) =>
      ps(
        "$global:RestoreCalls = 0; $global:S16Changed = $true; $global:S16Stops = 0; $global:W = 1\n" +
          "function Say9([string]$m) { 'SAY ' + $m }\nfunction Stop9([string]$m) { 'STOP restores=' + $global:RestoreCalls }\nfunction Use-S16Options { 1 }\n" +
          "function Restore-S11Safety { $global:RestoreCalls++; $true }\nfunction End-S16Actor { }\nfunction Close-S16Windows { }\nfunction Stop-S16All { }\nfunction Save-S16 { }\n" +
          `${fn(runner, "Stop-S16Wave")}\n$global:S16InRestore = $${inRestore}\nStop-S16Wave 'test'`,
      );
    const a = run(false);
    const c = run(true);
    if (!a || !c) return;
    expect(a.status).toBe(2);
    expect(a.out).toContain("STOP restores=1");
    expect(a.out.some((l) => l.includes("no second restore"))).toBe(false);
    expect(c.status).toBe(2);
    expect(c.out).toContain("STOP restores=0");
    expect(c.out.some((l) => l.includes("the stop met the restore itself; no second restore"))).toBe(true);
  });
  it.skipIf(!hasPs)("Read-R17Rules throws after its STOP line when RULES is not 0 (without the throw the block runs on past a STOP), notes NOT MEASURED, and falls back on code 10", () => {
    const r = ps(
      "$global:D = 1; $global:S16NM = 0\nfunction Say9([string]$m) { }\nfunction Stop9([string]$m) { 'STOP ' + $m }\nfunction Invoke-S11bConsoleEval { [int]$global:Code }\n" +
        `${fn(runner, "Read-R17Rules")}\n` +
        "foreach ($c in 0, 3, 10, 2) { $global:Code = $c; $global:R17Fallback = $false; $global:R17RulesOk = $null; try { Read-R17Rules; \"DONE $c ok=$($global:R17RulesOk) nm=$($global:S16NM) fb=$($global:R17Fallback)\" } catch { \"THREW $c\" } }",
    );
    if (!r) return;
    expect(r.out.filter((l) => /^(DONE|THREW)/.test(l))).toEqual(["DONE 0 ok=True nm=0 fb=False", "DONE 3 ok=False nm=1 fb=False", "DONE 10 ok=False nm=1 fb=True", "THREW 2"]);
    expect(r.out.filter((l) => l.startsWith("STOP"))).toHaveLength(1);
    expect(r.out.indexOf(r.out.find((l) => l.startsWith("STOP"))!)).toBeLessThan(r.out.indexOf("THREW 2"));
  });
});

describe("m6: S11 setup opens only the Run 17 tabs, and no history key collides with an S11 key", () => {
  it("reload runs `S11 setup --only` with exactly the tabs the blocks use (not u8 on localhost:8084)", async () => {
    const m = /'setup', '--only', '([^']+)'/.exec(block("reload"));
    expect(m).not.toBeNull();
    const only = m![1]!.split(",");
    expect(only.sort()).toEqual(["a7", "j7", "l1", "ra", "raw", "sv", "u6"]);
    const { TAB_SPEC, NEEDS } = await import("../s11.js");
    for (const k of only) expect(Object.keys(TAB_SPEC), k).toContain(k);
    expect(only).not.toContain("u8");
    // every key a Run 17 call needs is opened: the S11 subcommands the runner calls, the B17 subcommands that read state.json
    const subs = [...runner.matchAll(/Invoke-R17Node 's11' @\('([a-z0-9-]+)'/g)].map((x) => x[1]!);
    const need = new Set<string>([...subs.flatMap((s) => [...(NEEDS[s] ?? [])]), ...[...b17.matchAll(/handleOf\("([a-z0-9]+)"\)/g)].map((x) => x[1]!)]);
    for (const k of need) expect([...only, "x"], `tab ${k}`).toContain(k);
    expect(block("r17-up-devt")).toContain("'setup', '--only', 'x'");
  });
  it("the tab keys the runner creates (S9 --as) are not S11 keys, so the shared state.json never loses one", async () => {
    const { TAB_SPEC } = await import("../s11.js");
    const keys = [...runner.matchAll(/New-R17Tab '[^']+' '([^']+)'/g)].map((x) => x[1]!);
    for (const t of runner.matchAll(/--tab', '([a-z0-9]+)'/g)) keys.push(t[1]!);
    for (const t of runner.matchAll(/Invoke-R17History '[^']+' '[^']+' '([a-z0-9]+)'/g)) keys.push(t[1]!);
    expect(keys.length).toBeGreaterThan(10);
    for (const k of new Set(keys)) expect(Object.keys(TAB_SPEC), `runner tab key ${k}`).not.toContain(k);
    for (const k of ["hb", "hf", "hs", "he"]) expect(keys).toContain(k);
  });
});

describe("fixer 3: m3-1, RD-7 probes the console just before its tab, and a console lost at the CTX read is FALLBACK", () => {
  const b = block("rd7");
  it("the probe is a RULES read (only what B17 rules --expr builds is typed), after the guard and before New-R17Tab, then FALLBACK is re-checked", () => {
    const pre = b.slice(0, b.indexOf("New-R17Tab"));
    expect(pre.match(/Read-R17Rules/g)).toHaveLength(1);
    expect(pre.match(/if \(\$global:R17Fallback\) \{ Say9 'ROW RD-7 NOT RUN - no stopper without the console \(the UIA read is not built\)'; \$global:S16NM\+\+; return \}/g)).toHaveLength(2);
    before(pre, "Read-R17Rules", "# the probe fell back");
    // nothing else is typed before the tab: no direct console entry, no keys
    for (const t of ["Enter-S11bConsoleText", "SendKeys", "Start-S11bConsoleEval", "Invoke-S11bConsoleEval"]) expect(pre, t).not.toContain(t);
    // Read-R17Rules types only through the console contract: B17 `rules --expr` (pattern-checked) and its marker
    expect(fn(runner, "Read-R17Rules")).toContain("Invoke-S11bConsoleEval $global:D 'rules' @() @('--expect', '0')");
    expect(b).toContain("if ($c -eq 10) { $global:R17Fallback = $true }");
    expect(b).toContain("Say9 'CTX NOT MEASURED (see the line above)'");
    expect(b).not.toContain("no CTX line from the console");
  });
  const stubs = (probe: string, ctx: number): string =>
    [
      "$global:S16NM = 0; $global:R17Fallback = $false; $global:D = 1",
      "function Say9([string]$m) { 'SAY ' + $m }",
      "function Stop9([string]$m) { 'STOP ' + $m }",
      `function Read-R17Rules { 'PROBE'; ${probe} }`,
      "function New-R17Tab { 'NEWTAB' }",
      "function Call9 { 'CALL ' + $args[2] }",
      "function Close-R17Tab { 'CLOSE' }",
      "function Get-R17Hits { }",
      "function Start-Sleep { }",
      `function Invoke-S11bConsoleEval { ${ctx} }`,
      "$Blocks = @{}",
      b,
      "& $Blocks['rd7']",
      "'FALLBACK=' + $global:R17Fallback",
    ].join("\n");
  it.skipIf(!hasPs)("a console lost at the probe: NOT RUN, no tab, no navigate (a mutant without the probe dies here)", () => {
    const r = ps(stubs("$global:R17Fallback = $true", 0));
    if (!r) return;
    expect(r.out).toContain("PROBE");
    expect(r.out).toContain("SAY ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)");
    expect(r.out).not.toContain("NEWTAB");
    expect(r.out.some((l) => l.startsWith("CALL"))).toBe(false);
  });
  it.skipIf(!hasPs)("a console that answers the probe but returns 10 at the CTX read sets FALLBACK for later rows; a working console leaves it unset", () => {
    const lost = ps(stubs("", 10));
    const ok = ps(stubs("", 0));
    if (!lost || !ok) return;
    expect(lost.out).toContain("NEWTAB");
    expect(lost.out).toContain("SAY CTX NOT MEASURED (see the line above)");
    expect(lost.out).toContain("FALLBACK=True");
    expect(ok.out).toContain("FALLBACK=False");
    expect(ok.out.some((l) => l.includes("CTX NOT MEASURED"))).toBe(false);
  });
});

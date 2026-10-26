// Tests of Run 16's block runner (recipes/s11-r16.ps1) and its pure plan (recipes/s11-r16-plan.ts). Nothing here touches Chrome, a
// daemon or a port: the .ps1 is read as text, parsed by PowerShell's own parser, and two of its functions run with stubbed helpers.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALL_BLOCKS, EXTRA_BLOCKS, FRAMING_BLOCKS, ROW_BLOCKS, WAVE_PORTS, liveBGate, needsFileAccess, portVerdict, restoreFailed, scanR16, sliceBlocks, stopPlan, isStopLine,
} from "../s11-r16-plan.js";
import { UP_WAITING_ROWS } from "../s11-rules.js";
import { judgeOpt } from "../s11-r16-opt.js";
import { optExpected, optSummary, K, OPT_TYPED } from "../s11-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(join(REPO, "recipes", "s11-r16.ps1"), "utf8");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

/** Section 4.23's row table: [ID, Live column] in the sheet's order (UP-CLICK included). */
function sheetRows(): Array<{ id: string; live: string }> {
  const doc = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
  const a = doc.indexOf("### 4.23 R16 rows");
  const b = doc.indexOf("## 5. Results template");
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  const out: Array<{ id: string; live: string }> = [];
  for (const l of doc.slice(a, b).split(/\r?\n/)) {
    const m = /^\| ((?:UP|SAVE|SW)-[^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(l);
    if (m) out.push({ id: m[1]!.replace(/\s*\(RECORD\)/, "").replace(/\s*★/, "").trim(), live: m[2]! });
  }
  return out;
}
const psList = (name: string): string[] => {
  const m = new RegExp(`^\\$${name} = @\\(([^)]*)\\)`, "m").exec(src);
  expect(m, name).not.toBeNull();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
};
const fnText = (name: string): string => {
  const m = new RegExp(`function ${name}[\\s\\S]*?\\n}\\n`).exec(src);
  expect(m, name).not.toBeNull();
  return m![0];
};

describe("the row -> block map against section 4.23", () => {
  const rows = sheetRows().filter((r) => !r.live.startsWith("—"));
  it("has every sheet row with a live slice, once, in the sheet's order (UP-CLICK has none)", () => {
    expect(sheetRows().length).toBe(rows.length + 1);
    expect(ROW_BLOCKS.map((r) => r.row)).toEqual(rows.map((r) => r.id));
    expect(new Set(ROW_BLOCKS.map((r) => r.block)).size).toBe(ROW_BLOCKS.length);
  });
  it("puts each row in the slices its Live column names", () => {
    for (const r of rows) {
      const want = [/\bA\b/.test(r.live) ? "A" : "", /\bB\b/.test(r.live) ? "B" : ""].filter(Boolean);
      expect(ROW_BLOCKS.find((x) => x.row === r.id)!.slices, r.id).toEqual(want);
    }
  });
  it("each slice runs its rows in sheet order, each row's block present", () => {
    for (const s of ["A", "B"] as const) {
      const blocks = sliceBlocks(s);
      const want = ROW_BLOCKS.filter((r) => r.slices.includes(s)).map((r) => r.block);
      expect(blocks.filter((b) => want.includes(b))).toEqual(want);
      expect(blocks.at(-1)).toBe("teardown");
      expect(blocks.indexOf("up-restore")).toBeLessThan(blocks.indexOf("up-logs"));
    }
    expect(sliceBlocks("A").indexOf("reload")).toBeLessThan(sliceBlocks("A").indexOf("up-l1"));
    expect(sliceBlocks("A").indexOf("up-l1")).toBeLessThan(sliceBlocks("A").indexOf("up-0"));
    expect(sliceBlocks("B")[sliceBlocks("B").indexOf("up-0") + 1]).toBe("root-add");
    expect(sliceBlocks("B").indexOf("prestale")).toBeLessThan(sliceBlocks("B").indexOf("reload"));
  });
  it("liveB holds the 17 G11-3 rows; liveA holds none of them", () => {
    const b = ROW_BLOCKS.filter((r) => r.slices.includes("B") && !r.slices.includes("A")).map((r) => r.row);
    expect(UP_WAITING_ROWS.length).toBe(17);
    expect(UP_WAITING_ROWS.every((r) => b.includes(r))).toBe(true);
    expect(ROW_BLOCKS.filter((r) => r.slices.includes("A")).some((r) => UP_WAITING_ROWS.includes(r.row))).toBe(false);
    expect(ROW_BLOCKS.filter((r) => needsFileAccess(r.block)).map((r) => r.row).sort()).toEqual([...UP_WAITING_ROWS].sort());
    expect(needsFileAccess("root-add")).toBe(true);
    expect(needsFileAccess("up-fa")).toBe(false);
  });
});

describe("the .ps1 is tied to the plan", () => {
  it("-Block's ValidateSet is ALL_BLOCKS", () => {
    const m = /\[ValidateSet\(([^)]*)\)\]/.exec(src)!;
    expect([...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!).sort()).toEqual([...ALL_BLOCKS].sort());
    expect(EXTRA_BLOCKS).toEqual(["root-add"]);
  });
  it("slice lists, framing list and the file-access list equal the plan's", () => {
    expect(psList("SliceA")).toEqual(sliceBlocks("A"));
    expect(psList("SliceB")).toEqual(sliceBlocks("B"));
    expect(psList("FramingBlocks")).toEqual([...FRAMING_BLOCKS]);
    expect(psList("NeedsAccess")).toEqual(ALL_BLOCKS.filter((b) => needsFileAccess(b)));
  });
  it("every block has a body, and no body is for an unknown block", () => {
    const bodies = [...src.matchAll(/^\$Blocks\['([^']+)'\] = /gm)].map((m) => m[1]!);
    expect(bodies.sort()).toEqual(ALL_BLOCKS.filter((b) => b !== "liveA" && b !== "liveB").sort());
  });
  it("the ports are the wave's (8081, 8084 under its own PIDs; 9234 the daemon's) and the servers are started on them", () => {
    expect([...WAVE_PORTS]).toEqual([8081, 8084, 9234]);
    expect(src).toMatch(/'http\.server', '8081', '--bind', '127\.0\.0\.1', '--directory', 'test-fixtures'/);
    expect(src).toMatch(/'recipes\\s11-csp\.py', '8084'/);
    expect(src).toMatch(/foreach \(\$k in 8081, 8084, 9234\)/);
    expect(src).toMatch(/reload-extension\.ps1/);
    expect(src).toMatch(/if \(\$n -ne 2\) \{ break \}/); // one re-run on exit 2
    expect(src).toContain("-Quiet");
  });
});

describe("the pure decisions", () => {
  it("G11-3: liveB starts only when the toggle read ON", () => {
    expect(liveBGate("on")).toEqual({ start: true, exit: 0 });
    expect(liveBGate("off")).toEqual({ start: false, exit: 3 });
    expect(liveBGate("unreadable")).toEqual({ start: false, exit: 2 });
  });
  it("the stop plan restores after a state change, never twice, and always exits non-zero", () => {
    expect(stopPlan({ changed: false, inRestore: false })).toEqual({ restore: false, exit: 2 });
    expect(stopPlan({ changed: true, inRestore: false })).toEqual({ restore: true, exit: 2 });
    expect(stopPlan({ changed: true, inRestore: true })).toEqual({ restore: false, exit: 2 });
  });
  it("a restore that threw, returned false/null or printed a STOP is failed", () => {
    expect(restoreFailed({ returned: true, threw: false, stopsBefore: 1, stopsAfter: 1 })).toBe(false);
    expect(restoreFailed({ returned: true, threw: false, stopsBefore: 1, stopsAfter: 2 })).toBe(true);
    expect(restoreFailed({ returned: false, threw: false, stopsBefore: 0, stopsAfter: 0 })).toBe(true);
    expect(restoreFailed({ returned: null, threw: false, stopsBefore: 0, stopsAfter: 0 })).toBe(true);
    expect(restoreFailed({ returned: true, threw: true, stopsBefore: 0, stopsAfter: 0 })).toBe(true);
  });
  it("STOP lines begin with STOP: and nothing before it", () => {
    expect(isStopLine("STOP: x")).toBe(true);
    expect(isStopLine("2026-10-26T00:00:00Z STOP: x")).toBe(false);
  });
  it("the port rule", () => {
    expect(portVerdict(8081, [])).toBe("free");
    expect(portVerdict(8081, [{ own: true, daemon: false }])).toBe("ours");
    expect(portVerdict(8081, [{ own: false, daemon: true }])).toBe("foreign");
    expect(portVerdict(9234, [{ own: false, daemon: true }])).toBe("ours");
    expect(portVerdict(9234, [{ own: true, daemon: false }])).toBe("foreign");
  });
});

describe("static checks of s11-r16.ps1", () => {
  it("parses with zero errors (PowerShell's own parser)", () => {
    if (!hasPs) return;
    const f = join(REPO, "recipes", "s11-r16.ps1").replace(/'/g, "''");
    const cmd = `$e = $null; $t = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${f}', [ref]$t, [ref]$e); if ($e.Count) { 'ERRORS ' + $e.Count } else { 'PARSE OK' }`;
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { encoding: "utf8" });
    expect(r.stdout.trim()).toBe("PARSE OK");
  });
  it("is ASCII only and within the 500-line cap", () => {
    expect(/[^\x00-\x7f]/.test(src)).toBe(false);
    expect(src.split("\n").length).toBeLessThanOrEqual(500);
  });
  it("prints no folder, pattern, non-fixture path or token (the #279 sources and sinks included)", () => {
    expect(scanR16(src)).toEqual([]);
  });
  it("catches planted leaks", () => {
    const bad = [
      'Say9 "folder $Root"',
      'Fail-S16 "bad $FoundDir"',
      'throw "no $Dir"',
      '$x = Get-S11FoundText "blocklist"',
      '$x | Tee-Object -FilePath $f',
      "[IO.File]::WriteAllText($f, $x)",
      "Write-S11Pressed $Id $x",
      'Say9 "$env:USERPROFILE"',
      "Get-Content $f",
      "$tok = $env:BRIDGE_TOKEN",
      // MINOR-1 (S5-runner verifier): sinks and sources the first scan missed
      'Show-S16 @("root $Root")',
      "Show-S16 $FoundDir",
      "Show-S16 @($env:USERPROFILE)",
      "[IO.File]::WriteAllLines($Record, [string[]]@($Root))",
      "$Root | Export-Clixml $Record",
      "$Root | Out-String",
      "  $Root",
      "  $FoundJson",
      '  "$DaemonLog"',
    ];
    for (const l of bad) expect(scanR16(`${src}\n${l}`).length, l).toBeGreaterThan(0);
    // a second vetted printing site is refused
    expect(scanR16(`${src}\nWrite-Host $q   # vetted-node-output`).length).toBeGreaterThan(0);
    // ... and so are a second vetted file write and a second vetted clixml write
    expect(scanR16(`${src}\n$a | Export-Clixml $f   # vetted-clixml`).length).toBeGreaterThan(0);
    expect(scanR16(`${src}\n[IO.File]::WriteAllLines($a, $b)   # vetted-file-write`).length).toBeGreaterThan(0);
  });
  it("the two vetted Show-S16 arguments stay allowed (the s11.ts lines and the reload script's lines)", () => {
    expect(scanR16(`${src}\n    Show-S16 $out`)).toEqual([]);
    expect(scanR16(`${src}\n    Show-S16 ([string[]]$o)`)).toEqual([]);
  });
  it("kills only the wave's recorded PIDs (start time checked) and never chrome", () => {
    expect(src).not.toMatch(/Stop-Process|Get-Process\s+chrome[^\r\n]*\|\s*(Stop|Kill)|taskkill[^\r\n]*\/IM|\.Kill\(\)/i);
    const kills = src.split("\n").filter((l) => /taskkill/.test(l));
    expect(kills.length).toBe(1);
    expect(fnText("Stop-S16Pid")).toMatch(/StartTime\.Ticks -eq \$global:S16Born\[\$Name\]/);
  });
  it("starts the preflight with the clean-tree check and the loaded-build proof is a reload with one re-run", () => {
    expect(src).toMatch(/git status --porcelain --untracked-files=no -- \. ":\(exclude\)\$Steps"/);
    expect(src.indexOf("function Test-S16Port")).toBeLessThan(src.indexOf("$Blocks['preflight']"));
  });
});

/** Runs PowerShell source from a temp file; returns stdout lines and the exit code. */
function runPs(script: string): { out: string[]; code: number | null } {
  const d = mkdtempSync(join(tmpdir(), "s11r16-"));
  try {
    const f = join(d, "t.ps1");
    writeFileSync(f, script, "utf8");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" });
    return { out: r.stdout.split(/\r?\n/).filter(Boolean), code: r.status };
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}
const STUBS = (restore: string, changed: boolean, inRestore: boolean): string => `
$global:S16Stops = 0; $global:S16Changed = $${changed}; $global:S16InRestore = $${inRestore}; $global:W = 1
function Say9([string]$m) { Write-Host "SAY $m" }
function Stop9([string]$w) { $global:S16Stops++; Write-Output "STOP: $w" }
function Use-S16Options { 5 }
function Restore-S11Safety($a, $b, $c) { Write-Host 'RESTORE-CALLED'; ${restore} }
function End-S16Actor { }
function Close-S16Windows { }
function Stop-S16All { }
function Save-S16 { }
${fnText("Stop-S16Wave")}
Stop-S16Wave 'test'
Write-Output 'NOT-REACHED'
`;
describe.skipIf(!hasPs)("the stop procedure, run with stubbed helpers", () => {
  it("a STOP printed during the restore ends the wave non-zero, with no second restore", () => {
    const r = runPs(STUBS("Stop9 'inner'; $true", true, false));
    expect(r.code).toBe(2);
    expect(r.out.filter((l) => l === "RESTORE-CALLED").length).toBe(1);
    expect(r.out.some((l) => l.startsWith("STOP: the restore failed"))).toBe(true);
    expect(r.out).not.toContain("NOT-REACHED");
  });
  it("a restore that returns false is a failed restore too", () => {
    const r = runPs(STUBS("$false", true, false));
    expect(r.code).toBe(2);
    expect(r.out.some((l) => l.startsWith("STOP: the restore failed"))).toBe(true);
  });
  it("a restore that throws is a failed restore too", () => {
    const r = runPs(STUBS("throw 'x'", true, false));
    expect(r.code).toBe(2);
    expect(r.out.some((l) => l.startsWith("STOP: the restore failed"))).toBe(true);
  });
  it("a clean restore still ends the wave with exit 2 (the stop itself)", () => {
    const r = runPs(STUBS("$true", true, false));
    expect(r.code).toBe(2);
    expect(r.out.some((l) => l.startsWith("STOP: the restore failed"))).toBe(false);
    expect(r.out.some((l) => l.startsWith("STOP: the wave ended"))).toBe(true);
  });
  it("no state change: no restore; a stop inside the restore block: no second restore", () => {
    expect(runPs(STUBS("$true", false, false)).out).not.toContain("RESTORE-CALLED");
    const r = runPs(STUBS("$true", true, true));
    expect(r.out).not.toContain("RESTORE-CALLED");
    expect(r.code).toBe(2);
  });
});
describe.skipIf(!hasPs)("liveB's G11-3 refusal, run with the real gate function", () => {
  const gate = (toggle: string, name: string): string => {
    const s = `
${[...src.matchAll(/^\$NeedsAccess = .*$/gm)][0]![0]}
function Say9([string]$m) { Write-Host "SAY $m" }
$global:S16Toggle = ${toggle}
${fnText("Test-S16Gate")}
Write-Output ("RESULT " + (Test-S16Gate '${name}'))
`;
    return runPs(s).out.filter((l) => l.startsWith("RESULT"))[0]!;
  };
  it("refuses every upload block unless the toggle read on", () => {
    for (const t of ["'off'", "'unreadable'", "$null"]) expect(gate(t, "up-1")).toBe("RESULT False");
    expect(gate("'off'", "root-add")).toBe("RESULT False");
    expect(gate("'on'", "up-1")).toBe("RESULT True");
  });
  it("lets the rows that need no file access run when the toggle is off", () => {
    for (const b of ["up-6", "up-fa", "sw-2", "save-refuse-r", "up-restore", "up-logs", "up-0"]) expect(gate("'off'", b)).toBe("RESULT True");
  });
});
describe("liveB and liveA bodies are wired to the gate and the stop path", () => {
  it("the slice loop gates every block, ends liveB with a teardown and exit 3, and the main catch runs the stop procedure", () => {
    expect(src).toMatch(/if \(-not \(Test-S16Gate \$b\)\) \{ Invoke-S16Block 'teardown'; exit 3 \}/);
    expect(src).toMatch(/\} catch \{[\s\S]*Stop-S16Wave/);
    expect(src).toMatch(/\$global:S16Changed = \$true; Save-S16/);
    expect(fnText("Stop-S16Wave")).toMatch(/exit 2/);
  });
  it("every state-changing block marks the change before it acts", () => {
    for (const b of ["up-opt", "root-add", "up-7", "up-7j", "up-race-a", "up-race-b"]) {
      const m = new RegExp(`\\$Blocks\\['${b}'\\] = \\{\\s*\\n\\s*\\$global:S16Changed = \\$true; Save-S16`).test(src);
      expect(m, b).toBe(true);
    }
  });
});

describe("the UP-OPT judge", () => {
  const good = () => {
    const e = optExpected(2, 3);
    return {
      standingCount: 1, summaryAfterSave: e.summaryAfterSave, summaryTyped: e.summaryTyped, summaryAfterRevert: e.summaryAfterSave,
      invalidItems: e.invalidItems, warnedItems: e.warnedItems, setSha: "a".repeat(64), storedSha: "a".repeat(64), storedWhileTypingSha: "a".repeat(64),
      o2Ms: 400, o2Conflict: false, foundCount: 2, firstTypedLine: 3,
    };
  };
  it("passes the pre-written observation and fails a changed summary; prints no page text", () => {
    const g = judgeOpt(good());
    expect(g.pass).toBe(true);
    expect(g.lines.at(-1)).toMatch(/^ROW UP-OPT PASS/);
    const b = judgeOpt({ ...good(), summaryTyped: optSummary(9) });
    expect(b.pass).toBe(false);
    expect(b.lines.join("\n")).not.toContain(OPT_TYPED[0]!);
    expect(b.lines.join("\n")).not.toContain(K["K-opt-stand"]);
  });
});

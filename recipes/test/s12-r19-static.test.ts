// Step 12 S7-helpers-d: Run 19's runner against section 4.27 and its sources: forms (28), (29), (31), (32) by key, the Screenshot / Image line forms pinned
// against the committed failure-report code and test, the aggregator, M1's three wordings, and a static check that every entry point the runner calls exists.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cmds as s11bCmds } from "../s11b.js";
import * as R from "../s12-r19.js";
import * as W from "../s12-oldbuild.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const DOC = rd("docs/e2e-test-plan.md");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"), DOC.indexOf("## 5. Results template"));
const ENTRY = rd("recipes/s12-r19.ps1");
const LIB = rd("recipes/s12-r19-lib.ps1");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
/** The backticked template of form n, e.g. `DAEMONLOG <slice> sentinel=<n> ...`, from the sheet's own paragraph. */
const template = (n: number): string => { const i = SEC.indexOf(`(${n}) \``, SEC.indexOf("**Line forms (part B).**")); return SEC.slice(i + 6, SEC.indexOf("`", i + 6)); };
const keys = (s: string): string[] => [...s.matchAll(/([a-z][a-z-]*)=/g)].map((m) => m[1]!);
const CTX = { token: "TOK", sentinel: "SENT", profile: ["C:\\Users\\someone"], ownId: "abc" };
const SLICES = ["liveA19", "liveB19", "liveC19", "liveD19", "liveE19"];

describe("the forms by key, against section 4.27", () => {
  it("(28) DAEMONLOG, (31) STOP and RETURN, (32) FIX", () => {
    const line = R.daemonlogSliceLine("liveA19", { sentinel: 0, consoleText: 0, argsText: 0 });
    expect(line.split(" ")[0]).toBe(template(28).split(" ")[0]);
    expect(keys(line)).toEqual(keys(template(28)));
    expect(SEC).toContain("`RETURN <seq> after-stop=<reason> restored=<yes|no|n/a> readback=<equal|n/a>`");
    expect(keys(R.returnLine(1, "not-restored", "yes", "equal"))).toEqual(["after-stop", "restored", "readback"]);
    expect(R.stopLine("text-leak")).toBe("STOP text-leak");
    expect(SEC).toContain("(31) `STOP <reason>`");
    expect(R.fixLine("poll")).toBe("FIX poll");
    expect(SEC).toContain("(32) `FIX <what>`");
  });
  it("the thirteen STOP reasons are exactly the sheet's list", () => {
    const m = /`<reason>` one of ([^;]*?), and `RETURN/.exec(SEC)![1]!;
    expect([...m.matchAll(/`([a-z-]+)`/g)].map((x) => x[1])).toEqual([...R.STOP_REASONS]);
  });
  it("(29) SCANTOOL and SCAN actors keys, in order", () => {
    const c = R.scanToolText("x", CTX);
    expect(keys(R.scantoolLine("liveA19", "browser_snapshot", c))).toEqual(keys(template(29)));
    const all = SEC.slice(SEC.indexOf("(29) `SCANTOOL"), SEC.indexOf("(30)"));
    expect(keys(R.scanActorsLine(c))).toEqual(keys(/`(SCAN actors:[^`]*)`/.exec(all)![1]!));
    expect(R.scanActorsLine(c)).toMatch(/^SCAN actors: :\/\/=0 \(fixture 0, other 0\) token=0 sentinel=0 profile-other=0 shot-line=0 image-line=0$/);
    expect(all).toContain("`profile-all`");
  });
  it("DAEMONLOG probes are the sheet's: SENTINEL, s12-con-, s12-notea, the args sentinel", () => {
    expect(SEC).toContain("`SENTINEL`, `s12-con-`, `s12-notea`, the args sentinel");
    expect(R.daemonlogCounts("a s12sent-5f3a9c71 s12-con-3 s12-notea-long sentinel-args-K7W3-key")).toEqual({ sentinel: 1, consoleText: 2, argsText: 1 });
    expect(rd("mcp/test/s12-args-cross.test.ts")).toContain('const SENTINEL = "sentinel-args-K7W3-"');
    expect(rd("test-fixtures/s12-console.js")).toContain('"s12sent-5f3a9c71"');
  });
});

describe("shot-line and image-line (#349), pinned against the committed failure report", () => {
  const dir = "C:\\Users\\someone\\.chrome-agent-bridge\\failures";
  it("the product prints `Screenshot: <path>` and the default failures directory is <home>/.chrome-agent-bridge/failures", () => {
    expect(rd("sdk/src/error.ts")).toContain("tail.push(`Screenshot: ${input.screenshotPath}`)");
    expect(rd("sdk/src/error.ts")).toContain('path.join(homedir(), ".chrome-agent-bridge", "failures")');
    expect(rd("sdk/test/failure-report.test.ts")).toContain("expect(text).toContain(`Screenshot: ${path.join(dir, FILE)}`)");
    expect(rd("mcp/test/s5-cross.test.ts")).toContain("expect(report).toContain(`Screenshot: ${failures}`)");
    expect(R.SHOT_LINE_RE.test(`Screenshot: ${dir}\\fail-1.png`)).toBe(true);
    expect(R.SHOT_LINE_RE.test(`Screenshot: ${dir.replace(/\\/g, "/")}/fail-1.png`)).toBe(true);
    expect(R.SHOT_LINE_RE.test("Screenshot: C:\\Users\\someone\\Documents\\x.png")).toBe(false);
  });
  it("the image line form comes from #349's prose and the Step 8 run records only (Open item 15: no committed test)", () => {
    expect(R.IMAGE_LINE_RE.test("[Image: source: C:\\Users\\someone\\.claude\\projects\\p\\sid\\tool-results\\mcp-x.png]")).toBe(true);
    expect(R.IMAGE_LINE_RE.test("see [Image: source: x.png] here")).toBe(false);
  });
  it("the two named lines are counted apart; a profile path elsewhere is profile-other; profile-all is the sum", () => {
    const shot = `Screenshot: ${dir}\\fail-1.png`;
    const img = "[Image: source: C:\\Users\\someone\\.claude\\x\\tool-results\\a.png]";
    expect(R.scanToolText(`error line\n${shot}\n${img}\nplain`, CTX)).toMatchObject({ shotLine: 1, imageLine: 1, profileOther: 0, profileAll: 2, token: 0 });
    expect(R.scanToolText(`opened C:\\Users\\someone\\x.txt\n${shot}`, CTX)).toMatchObject({ shotLine: 1, profileOther: 1, profileAll: 2 });
  });
  it("the sentinel is expected only in the tools whose reply carries it; a token, a profile-other or a stray URL fails", () => {
    const ok = R.scanActors("liveA19", [{ tool: "browser_console_messages", text: "SENT here" }, { tool: "browser_snapshot", text: "page" }], CTX);
    expect(ok.pass).toBe(true);
    expect(ok.lines.filter((l) => l.startsWith("SCANTOOL"))).toHaveLength(2);
    expect(R.scanActors("liveA19", [{ tool: "browser_snapshot", text: "SENT" }], CTX).pass).toBe(false);
    expect(R.scanActors("liveA19", [{ tool: "browser_evaluate", text: "TOK" }], CTX).pass).toBe(false);
    expect(R.scanActors("liveA19", [{ tool: "browser_evaluate", text: "http://example.com/x" }], CTX).pass).toBe(false);
  });
});

describe("the aggregator and the R7.6 pairing", () => {
  it("dedupes only a byte-identical ROW RULES; a genuine re-print of another row still warns", () => {
    const rules = ["ROW RULES PASS: RULES 0", "ROW RULES PASS: RULES 0", "ROW R19-X PASS", "ROW R19-X PASS"];
    expect(R.dedupeRulesOnly(rules)).toEqual(["ROW RULES PASS: RULES 0", "ROW R19-X PASS", "ROW R19-X PASS"]);
    expect(R.aggregateSlice(rules).warns).toEqual(["WARN row printed twice: R19-X"]);
    expect(R.aggregateSlice(["ROW RULES PASS: RULES 0", "ROW RULES PASS: RULES 0"]).warns).toEqual([]);
  });
  it("checkStopReturn: a STOP needs its RETURN with the same reason before the next ROW, seqs 1, 2", () => {
    const good = ["STOP not-restored", "RETURN 1 after-stop=not-restored restored=no readback=n/a", "ROW A PASS", "STOP text-leak", "RETURN 2 after-stop=text-leak restored=n/a readback=n/a"];
    expect(R.checkStopReturn(good)).toEqual([]);
    expect(R.checkStopReturn(["STOP text-leak", "ROW A PASS"])).not.toEqual([]);
    expect(R.checkStopReturn(["STOP text-leak"])).not.toEqual([]);
    expect(R.checkStopReturn(["STOP text-leak", "RETURN 1 after-stop=not-restored restored=no readback=n/a"])).not.toEqual([]);
    expect(R.checkStopReturn(["RETURN 1 after-stop=text-leak restored=no readback=n/a"])).not.toEqual([]);
    expect(R.checkStopReturn(["STOP text-leak", "RETURN 2 after-stop=text-leak restored=no readback=n/a"])).not.toEqual([]);
  });
  it("settleLines prints the final ROW of the console-clause rows only", () => {
    expect(R.settleLines({ "R19-ARGS-1": "PASS", "R19-UP-6": "PASS", "R19-CON-1": "FAIL" }, "ok")).toEqual(["ROW R19-ARGS-1 PASS", "ROW R19-CON-1 FAIL"]);
    expect(R.settleLines({ "R19-ARGS-1": "PASS" }, "unread")).toEqual(["ROW R19-ARGS-1 NOT MEASURED"]);
  });
  it("the CAPSEG form and the segment names", () => {
    expect(R.capsegLine("liveD19", 2, true, "reload")).toBe("CAPSEG liveD19 seg=2 saved=yes before=reload");
    expect(keys(R.capsegLine("liveD19", 2, true, "reload"))).toEqual(keys(/`(CAPSEG [^`]*)`/.exec(SEC)![1]!));
    expect(R.capturePath("liveD19", 2)).toBe("console-liveD19-2.txt");
  });
});

describe("M1: the old-build swap's three error wordings", () => {
  const io = (o: { linkLeft?: boolean; gitCode?: number; gitThrows?: boolean }): W.SwapIO => ({
    run: (cmd, args) => {
      if (cmd === "git" && args[0] === "worktree" && args[1] === "remove") { if (o.gitThrows) throw new Error("spawn"); return { code: o.gitCode ?? 0 }; }
      return { code: 0 };
    },
    reparsePoints: () => (o.linkLeft ? ["x"] : []),
    replaceDir: () => undefined,
  });
  const opts = { repo: "C:\\repo", commit: "abc1234", tmp: "C:\\tmp" };
  it("a link left: says a link is left and that no HEAD rebuild ran", () => {
    expect(() => W.swapOldBuild(io({ linkLeft: true }), opts)).toThrow(W.WORDING.link);
    expect(W.WORDING.link).toMatch(/a link is left.*no HEAD rebuild ran/);
  });
  it("git worktree remove exiting non-zero: does not say a link is left", () => {
    expect(() => W.swapOldBuild(io({ gitCode: 1 }), opts)).toThrow(W.WORDING.gitExit);
    expect(W.WORDING.gitExit).toMatch(/exited non-zero.*no link is left/);
  });
  it("git worktree remove throwing: does not say the restore failed (none ran)", () => {
    expect(() => W.swapOldBuild(io({ gitThrows: true }), opts)).toThrow(W.WORDING.removeThrew);
    expect(W.WORDING.removeThrew).not.toMatch(/restore \(HEAD rebuild\) failed/);
    expect(W.WORDING.removeThrew).toMatch(/no restore was attempted/);
  });
  it("a restore that did run and failed is still worded as a failed restore", () => {
    const bad = io({});
    const real = bad.run;
    bad.replaceDir = () => { throw new Error("copy"); };
    bad.run = (c, a, w) => (/^npm/.test(c) && a[0] === "run" && w === "C:\\repo" ? { code: 1 } : real(c, a, w));
    expect(() => W.swapOldBuild(bad, opts)).toThrow("the restore (HEAD rebuild) failed");
  });
  it("every wording asks for restoreHead", () => { for (const w of Object.values(W.WORDING)) expect(w).toContain("call restoreHead"); });
});

/** Every command name the runner files call, minus those a helper file defines or PowerShell resolves. */
function unresolved(): { all: string[]; missing: string[] } {
  const d = mkdtempSync(join(tmpdir(), "s12r19s-"));
  try {
    const f = join(d, "t.ps1");
    const names = ["s9-win.ps1", "s11-win.ps1", "s11b-win.ps1", "s12-win.ps1", "s12-win-b.ps1", "s12-win-c.ps1", "s11b-r17.ps1", "s11b-r17b.ps1", "s12-r18.ps1", "s12-r18-lib.ps1", "s12-r19.ps1", "s12-r19-lib.ps1", "s12-r19-a.ps1"];
    const files = names.map((x) => `'${join(REPO, "recipes", x).replace(/'/g, "''")}'`).join(",");
    writeFileSync(f, `
$called = @{}; $defined = @{}
foreach ($p in ${files}) {
  $tk = $null; $er = $null; $ast = [Management.Automation.Language.Parser]::ParseFile($p, [ref]$tk, [ref]$er)
  foreach ($fn in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] }, $true)) { $defined[$fn.Name] = $true }
  if ($p -like '*s12-r19*') { foreach ($c in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.CommandAst] }, $true)) { $nm = $c.GetCommandName(); if ($nm) { $called[$nm] = $true } } }
}
$missing = @(); foreach ($k in $called.Keys) { if (-not $defined.ContainsKey($k) -and -not (Get-Command $k -ErrorAction Ignore)) { $missing += $k } }
"ALL " + (($called.Keys | Sort-Object) -join ',')
"MISSING " + ($missing -join ',')
`, "utf8");
    const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" }).stdout;
    const pick = (k: string): string[] => (new RegExp(`^${k} (.*)$`, "m").exec(out)?.[1] ?? "").trim().split(",").filter(Boolean);
    return { all: pick("ALL"), missing: pick("MISSING") };
  } finally { rmSync(d, { recursive: true, force: true }); }
}

describe("the runner's source", () => {
  for (const name of ["s12-r19.ps1", "s12-r19-lib.ps1"]) {
    const src = name === "s12-r19.ps1" ? ENTRY : LIB;
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
    for (const n of ["Invoke-S12CloserProbe", "Save-S11bConsole", "Close-S11Window", "Get-R18Defs", "Invoke-R17Node", "Restore-S11Safety", "Set-S12AttachStamp", "Get-S11bStopCause", "Test-S11Own"]) expect(u.all, n).toContain(n);
    expect(u.missing).toEqual([]);
  });
  it("every node subcommand the runner runs exists (s12-r19 in s12-r19.ts, s11b in s11b.ts)", () => {
    const run = [...(ENTRY + LIB).matchAll(/Invoke-R19Node '(s11b|s12-r19)' @\('([a-z0-9-]+)'/g)];
    expect(run.length).toBeGreaterThan(8);
    const own = rd("recipes/s12-r19.ts");
    for (const m of run) {
      if (m[1] === "s11b") expect(Object.keys(s11bCmds), `s11b ${m[2]}`).toContain(m[2]);
      else expect(own, `s12-r19 ${m[2]}`).toContain(`sub === "${m[2]}"`);
    }
  });
  it("the human gates: a UIA-only toolbar, no press of the file-URL toggle, the swap only inside the lib's try/finally", () => {
    expect(ENTRY).toContain("$global:S9PinUiaOnly = $true");
    expect((ENTRY + LIB).match(/[\w-]*FileAccess\w*/g) ?? []).toEqual([]);
    expect(LIB).toMatch(/try \{\n[\s\S]*'swap'[\s\S]*\} finally \{\n[\s\S]*restore-head/);
    expect(ENTRY).not.toMatch(/Start-Process[^\n]*chrome/i);
    expect(ENTRY).toContain("exit ([int](@(Invoke-R19Main $Block)[-1]))");
  });
  it("the entry maps block names to lib functions; the UP-OPT report and the two old commits are as the sheet says", () => {
    for (const [k, fn] of [["r19-0", "Invoke-R19Zero $R17bZero"], ["closerprobe", "Invoke-R19Closer"], ["r19-restore", "Invoke-R19Restore"], ["r19-logs", "Invoke-R19Logs"]]) expect(ENTRY, k).toContain(`$global:R19Blocks['${k}'] = { ${fn} }`);
    expect(ENTRY).toContain('$UpOptReport = Join-Path $Repo "$Steps/S7-up-opt-investigator.md"');
    expect(ENTRY).toContain("$R19Commit['liveD19']");
    expect(LIB).toContain("$R19Commit = @{ liveD19 = '3ab9207'; liveE19 = '63c771c' }");
    expect(SEC).toContain("`3ab9207`");
    expect(SEC).toContain("`63c771c`");
  });
});

describe("the runner against section 4.27's slices", () => {
  const rows = (slice: string): string[] => { const m = new RegExp(`${slice} = \\$R19Prologue \\+ @\\(([^)]*)\\)`).exec(LIB)![1]!; return [...m.matchAll(/'([^']+)'/g)].map((x) => x[1]!); };
  const table = new Set([...SEC.matchAll(/^\| (R19-[A-Z0-9-]+)/gm)].map((m) => m[1]!));
  const aside = /^(root-add|devprobe|closerprobe|teardown|r19-old-args|r19-old-version|r19-choose-mcp-d|r19-keep-overlap-[ab])$/;
  it("every row block names a row of the sheet's table", () => {
    for (const s of SLICES) for (const b of rows(s)) if (!aside.test(b)) expect(table.has(b.toUpperCase()) || SEC.includes(`${b.toUpperCase()} ★`) || SEC.includes(`, ${b.toUpperCase()}`), `${s} ${b}`).toBe(true);
    for (const id of ["R19-ARGS-OLD", "R19-VERSION", "R19-KEEP-OVERLAP", "R19-CHOOSE-MCP", "R19-CLOSER"]) expect(table.has(id), id).toBe(true);
  });
  it("R19-0 is first in every slice, restore then logs end it, and the controls and probes sit where the sheet says", () => {
    for (const s of SLICES) { const r = rows(s); expect(r[0]).toBe("r19-0"); expect(r.slice(-3)).toEqual(["r19-restore", "r19-logs", "teardown"]); }
    const a = rows("liveA19"), b = rows("liveB19"), c = rows("liveC19");
    expect(a.indexOf("r19-banner-ctl")).toBeLessThan(a.indexOf("r19-args-3"));
    expect(b.indexOf("r19-up-opt")).toBeLessThan(b.indexOf("r19-banner-ctl"));
    expect(b.indexOf("r19-banner-ctl")).toBeLessThan(b.indexOf("r19-up-6"));
    expect(b.indexOf("closerprobe")).toBeLessThan(b.indexOf("r19-keep-2"));
    expect(b.indexOf("devprobe")).toBeLessThan(b.indexOf("closerprobe"));
    expect(c.indexOf("closerprobe")).toBeLessThan(c.indexOf("r19-choose-1"));
    expect(b.indexOf("r19-sweep-held")).toBe(b.indexOf("r19-restore") - 1);
  });
  it("each of liveA19..C19's sheet bullet names every row the runner lists for it", () => {
    for (const s of ["liveA19", "liveB19", "liveC19"]) {
      const at = SEC.indexOf(`- **${s} (`);
      const sheet = [...SEC.slice(at, SEC.indexOf("\n", at)).matchAll(/R19-[A-Z0-9-]+/g)].map((m) => m[0]);
      for (const b of rows(s)) if (!aside.test(b) && !/^r19-f-raw-(2|dir)$/.test(b)) expect(sheet, `${s} ${b}`).toContain(b.toUpperCase());
    }
  });
});

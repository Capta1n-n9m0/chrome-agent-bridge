// Static tests of the eight blocks H8 built into recipes/s11b-r17.ps1 and the typed-lines helpers of s11b-win.ps1. The .ps1 files are read
// as text; two pure functions run in a PowerShell child on the same cases as their TypeScript twins. Nothing here touches Chrome.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { H119, H120, H121, HOME_TYPED, K17_TEXT } from "../s11b-rules.js";
import { ALL_BLOCKS, NOT_BUILT, STOP_MAP, sliceBlocks } from "../s11b-r17-plan.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runner = readFileSync(join(REPO, "recipes", "s11b-r17.ps1"), "utf8");
const win = readFileSync(join(REPO, "recipes", "s11b-win.ps1"), "utf8");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const EIGHT = ["f-home", "rd-caps-warn", "rd-rebuild-narrow", "rd-disarm", "rd5", "rd5b", "rd-dl-socket", "r17-up-opt"];
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

describe("the eight blocks are built", () => {
  it("none prints NOT BUILT: the plan's list and the runner's are empty, and every one has a block in both slices' order", () => {
    expect(NOT_BUILT).toEqual([]);
    expect(runner).toContain("$NotBuilt = @()");
    for (const b of EIGHT) {
      expect(ALL_BLOCKS).toContain(b);
      expect(sliceBlocks("A")).toContain(b);
      expect(runner.includes(`$Blocks['${b}'] =`), b).toBe(true);
    }
  });
  it("reload runs before the console in both slices (a reload detaches the worker's DevTools window)", () => {
    for (const s of ["A", "B"] as const) {
      const o = sliceBlocks(s);
      expect(o.indexOf("reload")).toBeGreaterThan(o.indexOf("window"));
      expect(o.indexOf("console")).toBeGreaterThan(o.indexOf("reload"));
      expect(o.indexOf("console")).toBeLessThan(o.indexOf("rd0"));
    }
  });
  it("the typed-lines rows use the sheet's helpers by call, and the home and caps rows never save", () => {
    expect(block("f-home")).toContain("Get-S11bHomeObs");
    expect(fn(win, "Get-S11bHomeObs")).toContain("Set-S11bTyped");
    expect(fn(win, "Set-S11bTyped")).toContain("-NoSave");
    expect(fn(win, "Get-S11bCapsObs")).toContain("Get-S11bCaps");
    expect(fn(win, "Get-S11bCapsObs")).toContain("Undo-S11bTyped");
    expect(fn(win, "Undo-S11bTyped")).toContain("Read-S11Stored");
    const up = block("r17-up-opt");
    expect(up).toContain("Invoke-S11Opt $O $Root");
    expect(up).toContain("'upopt'");
    expect(up.indexOf("Invoke-S11Opt")).toBeLessThan(up.indexOf("Get-S11bOptObs"));
  });
  it("RD-0 (a-prime): the FALLBACK branch runs RD-CAPS-WARN first, and the block then does not run it twice", () => {
    const rd0 = block("rd0");
    expect(rd0.indexOf("Invoke-R17CapsWarn")).toBeGreaterThan(rd0.indexOf("R17Fallback = $true"));
    expect(rd0.indexOf("Invoke-R17CapsWarn")).toBeLessThan(rd0.indexOf("foundlist"));
    expect(block("rd-caps-warn")).toContain("$global:R17CapsDone");
    expect(fn(runner, "Invoke-R17CapsWarn")).toContain("R17CapsDone = $true");
    expect(runner).toMatch(/\$Persist = @\([^)]*'R17CapsDone'/);
  });
  it("the in-flight rows time their driver from the call's ready signal and judge with the sheet's modes", () => {
    const narrow = block("rd-rebuild-narrow");
    expect(narrow).toContain("Start-Sleep -Milliseconds 1000");
    expect((narrow.match(/Set-S11Flag \$O 'evaluate'/g) ?? []).length).toBe(2);
    expect(narrow).toContain("'inflight'");
    expect(narrow).toContain("'ok'");
    expect(narrow).toContain("e2e-playground.html?s11b=rn");
    for (const b of ["rd-disarm", "rd5b"]) {
      expect(block(b)).toContain("'at'");
      expect(block(b)).toContain("Get-R17Expect");
      expect(block(b)).toContain(b === "rd-disarm" ? "AddMilliseconds(1000)" : "Start-Sleep -Milliseconds 1000");
    }
    const dis = block("rd-disarm");
    expect(dis.indexOf("Test-S11ButtonReady")).toBeLessThan(dis.indexOf("Invoke-R17Flight"));
    expect(dis).toContain("Invoke-S11ButtonPair $global:W -GapMs 1600");
    expect(dis).toContain("'disarmed'");
    expect(dis).toContain("localhost:8086");
    expect(block("rd5b")).toContain("localhost:8086");
    expect(block("rd5b")).toContain("'tab-or-url'");
  });
  it("RD-5 starts the call from the stored poller's own signal file, and judges GAP from the press, the read-back and the call start", () => {
    const b = block("rd5");
    expect(b).toContain("'--go', $sf");
    expect(b).toContain("'--signal', $sf");
    expect(b).toContain("'judge-gap'");
    expect(b).toContain("STOREDAT");
    expect(b.indexOf("Start-S11bConsoleEval")).toBeLessThan(b.indexOf("Save-S11bBlockList"));
    expect(b.indexOf("Wait-S11Ready 'RD-5'")).toBeLessThan(b.indexOf("Save-S11bBlockList"));
    expect(b).toContain("Remove-Item -LiteralPath $ef");
  });
  it("RD-DL-SOCKET runs twelve calls on 8087 under list = found + 127.0.0.1 with the sampler beside them, and restores the list", () => {
    const b = block("rd-dl-socket");
    expect(b).toContain("@('127.0.0.1')");
    expect(b).toContain("1..12");
    expect(b).toContain("localhost:8087/slow/hello.txt?s11b=sk$i");
    expect(b).not.toContain("127.0.0.1:8087");
    expect(b.indexOf("'socket'")).toBeLessThan(b.indexOf("1..12"));
    expect(b.indexOf("sock-close")).toBeGreaterThan(b.indexOf("Wait-R17Bg"));
  });
  it("RD-7 reads CTX by the query tag; the history rows end in the judge, not only a record", () => {
    expect(block("rd7")).toContain("'--tag', 'rd7'");
    expect(block("rd7")).not.toContain("CTX NOT MEASURED: the tab");
    for (const [b, row] of [["rd-back", "RD-BACK"], ["rd-fwd", "RD-FWD"], ["rd-back-samedoc", "RD-BACK-SAMEDOC"], ["rd-back-empty", "RD-BACK-EMPTY"]] as const) expect(block(b)).toContain(`Invoke-R17History '${row}'`);
    const h = fn(runner, "Invoke-R17History");
    expect(h).toContain("'judge-history'");
    expect(h).toContain("'--flip-total'");
    expect(h).toContain("'--rules-after', '0'");
    expect(h.indexOf("Get-R17Hits")).toBeLessThan(h.indexOf("Invoke-R17Node 's11b' $j"));
    expect(h.indexOf("Read-R17Rules")).toBeLessThan(h.indexOf("Invoke-R17Node 's11b' $j"));
  });
});

describe("every STOP clause of the eight rows maps to an exit that returns", () => {
  it("the unpinned button, the stuck rules and RD-BACK-EMPTY's answer are in the STOP map, each with its marker in its block or the function it calls", () => {
    const ids = STOP_MAP.map((s) => s.id);
    for (const id of ["stuck-narrow", "unpinned-disarm", "stuck-disarm", "stuck-rd5", "stuck-rd5b", "stuck-socket", "rules-stuck-empty", "answer-changed"]) expect(ids, id).toContain(id);
    for (const s of STOP_MAP.filter((x) => ["stuck-narrow", "unpinned-disarm", "stuck-disarm", "stuck-rd5", "stuck-rd5b", "rules-stuck-empty"].includes(x.id))) {
      const line = block(s.block).split(/\r?\n/).find((l) => l.includes(`# STOP-MAP ${s.id}`));
      expect(line, s.id).toBeDefined();
      expect(line, s.id).toMatch(/throw/);
    }
    const rules = fn(runner, "Read-R17Rules");
    expect(rules).toContain("# STOP-MAP stuck-socket");
    expect(block("rd-dl-socket")).toContain("Read-R17Rules");
  });
  it("a STOP code from a clause ends the wave: Write-R17Row throws on STOP, after printing", () => {
    const f = fn(runner, "Write-R17Row");
    expect(f.indexOf("Say9")).toBeLessThan(f.indexOf("throw 'stop'"));
  });
});

describe("pure PowerShell functions, run on the same cases as their TypeScript twins", () => {
  it.skipIf(!hasPs)("Write-R17Row gives PASS, NOT MEASURED, FAIL and STOP in that order of severity, and throws only on STOP", () => {
    const script =
      "function Say9([string]$m) { 'SAY ' + $m }\nfunction Stop9([string]$m) { 'STOP ' + $m }\n" + fn(runner, "Write-R17Row") +
      "\nforeach ($c in @(@(0, 0), @(0, 3), @(3, 1), @(1, 2, 0), @(0))) { try { Write-R17Row 'X' ([int[]]$c) } catch { 'THREW' } }";
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
    if (r.error) return;
    const out = r.stdout.split(/\r?\n/).filter(Boolean);
    expect(out.filter((l) => l.startsWith("SAY ROW")).map((l) => l.split(" ").slice(3, -4).join(" "))).toEqual(["PASS", "NOT MEASURED", "FAIL", "STOP", "PASS"]);
    expect(out.filter((l) => l === "THREW")).toHaveLength(1);
  });
  it.skipIf(!hasPs)("Get-S11bLongHost builds H119, H120 and H121 exactly (labels of 24, 24 and 22, 23, 24 with the port)", () => {
    const script = fn(win, "Get-S11bLongHost") + "\n22, 23, 24 | ForEach-Object { Get-S11bLongHost $_ }";
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
    if (r.error) return;
    expect(r.stdout.split(/\r?\n/).filter(Boolean)).toEqual([H119, H120, H121]);
  });
});

describe("the constants of s11b-win.ps1 equal the TypeScript ones", () => {
  it("K-opt-stand and F-HOME's five typed lines", () => {
    expect(win).toContain(`$S11bStand = '${K17_TEXT["K-opt-stand"]}'`);
    expect(win).toContain(`$S11bHomeTyped = @(${HOME_TYPED.map((l) => `'${l}'`).join(", ")})`);
  });
  it("the typed text is never printed or returned by the observation helpers (only a path, a count or a flag)", () => {
    for (const f of ["Set-S11bTyped", "Get-S11bHomeObs", "Get-S11bCapsObs", "Get-S11bOptObs", "Write-S11bExpected", "Save-S11bBlockList"]) {
      const body = fn(win, f);
      expect(body, f).not.toMatch(/Write-Host|Say9[^\n]*\$t\b/);
    }
    expect(fn(win, "Write-S11bObs")).toContain("Assert-S11Outside");
    expect(fn(win, "Write-S11bExpected")).toContain("Assert-S11Outside");
  });
});

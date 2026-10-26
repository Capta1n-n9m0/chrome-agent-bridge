// Static tests of Run 17's block runner (recipes/s11b-r17.ps1) against its plan. The .ps1 is read as text and parsed by PowerShell's
// own parser; nothing runs against Chrome, a daemon or a port.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALL_BLOCKS, NOT_BUILT, STOP_MAP, WAITS_FOR_G11_3, sliceBlocks } from "../s11b-r17-plan.js";
import { scanR16 } from "../s11-r16-plan.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const path = join(REPO, "recipes", "s11b-r17.ps1");
const src = readFileSync(path, "utf8");
const code = src.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join("\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const list = (name: string): string[] => {
  const m = new RegExp(`^\\$${name} = @\\(([^)]*)\\)`, "m").exec(src);
  expect(m, name).not.toBeNull();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
};
interface Unit { kind: "block" | "function" | "top"; name: string; text: string }
/** The top-level unit (a `$Blocks['x'] = {` or a `function f`) that holds line `i`. */
function unitOf(lines: string[], i: number): Unit {
  let s = i;
  while (s >= 0 && !/^(\$Blocks\['|function )/.test(lines[s]!)) s--;
  if (s < 0) return { kind: "top", name: "", text: "" };
  let e = s + 1;
  while (e < lines.length && !/^(\$Blocks\['|function |try \{|\$Blocks = )/.test(lines[e]!)) e++;
  const head = lines[s]!;
  const bm = /^\$Blocks\['([^']+)'\]/.exec(head);
  const text = lines.slice(s, e).join("\n");
  return bm ? { kind: "block", name: bm[1]!, text } : { kind: "function", name: /^function ([\w-]+)/.exec(head)![1]!, text };
}

describe("s11b-r17.ps1 against the plan", () => {
  it("ValidateSet is the plan's list; the slices, framing, gate and not-built lists equal the plan's", () => {
    const vs = /\[ValidateSet\(([^)]*)\)\]/.exec(src)!;
    expect([...vs[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1])).toEqual([...ALL_BLOCKS]);
    expect(list("SliceA")).toEqual(sliceBlocks("A"));
    expect(list("SliceB")).toEqual(sliceBlocks("B"));
    expect(list("FramingBlocks")).toEqual(["preflight", "servers", "files", "window", "reload", "console", "teardown"]);
    expect(list("NeedsAccess")).toEqual(["root-add", ...WAITS_FOR_G11_3.map((r) => r.toLowerCase())]);
    expect(list("NotBuilt")).toEqual([...NOT_BUILT]);
  });
  it("defines a block for every built entry, and none for the not-built ones", () => {
    for (const b of ALL_BLOCKS.filter((x) => !["liveA", "liveB", "plan"].includes(x))) {
      expect(src.includes(`$Blocks['${b}'] =`), b).toBe(!NOT_BUILT.includes(b));
    }
  });
  it("every STOP of the map has a marker on a Stop9/Fail/throw/StopOnFail line of the block (or the function it calls)", () => {
    const lines = src.split(/\r?\n/);
    for (const s of STOP_MAP.filter((x) => x.block !== "ANY")) {
      const ats = lines.map((l, i) => (l.includes(`# STOP-MAP ${s.id}`) ? i : -1)).filter((i) => i >= 0);
      expect(ats.length, s.id).toBeGreaterThan(0);
      const blockText = unitOf(lines, lines.findIndex((l) => l.startsWith(`$Blocks['${s.block}'] =`))).text;
      const reached = ats.some((at) => {
        const u = unitOf(lines, at);
        const ok = s.gap ? /NOT MEASURED/.test(lines[at]!) : /Stop9|Fail-S16|throw|StopOnFail|Step-S16|Test-S16Port/.test(lines[at]!);
        return ok && (u.kind === "block" ? u.name === s.block : blockText.includes(u.name));
      });
      expect(reached, s.id).toBe(true);
    }
    for (const m of src.matchAll(/# STOP-MAP ([a-z0-9-]+)/g)) expect(STOP_MAP.map((x) => x.id)).toContain(m[1]);
  });
  it("any STOP line or throw ends the wave through the one stop procedure with exit 2, restoring first", () => {
    expect(src).toContain('if ($global:S16Stops -gt $s0) { throw "block $Name printed a STOP" }');
    expect(src).toMatch(/catch \{[^}]*Stop-S16Wave/);
    const f = /function Stop-S16Wave[\s\S]*?\n}\r?\n/.exec(src)![0];
    expect(f.indexOf("Restore-S11Safety")).toBeGreaterThan(0);
    expect(f.indexOf("Restore-S11Safety")).toBeLessThan(f.indexOf("Stop-S16All"));
    expect(f).toContain("no second restore");
    expect(f).toContain("exit 2");
  });
  it("starts no chrome.exe and clicks no toolbar button by mouse", () => {
    expect(code).not.toMatch(/chrome\.exe/i);
    expect(code).not.toMatch(/Start-Process[^\n]*chrome/i);
    expect(src).toContain("$global:S9PinUiaOnly = $true");
    expect(code).not.toMatch(/mouse_event|Click-S9|Invoke-S9Click/);
  });
  it("dot-sources the three helper files in order and binds the servers to 127.0.0.1", () => {
    const a = src.indexOf('s9-win.ps1"');
    const b = src.indexOf('s11-win.ps1"');
    const c = src.indexOf('s11b-win.ps1"');
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(src).toContain("--bind 127.0.0.1");
    expect(code).not.toContain("0.0.0.0");
  });
  it("keeps logs and wave files outside the repo and the record in the steps dir", () => {
    expect(src).toContain("$env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\\s11b'");
    expect(src).toContain('$Record = Join-Path $Repo "$Steps/S4-run-record.md"');
    expect(src).toContain("$Steps = 'docs/plans/2026-10-26-step11b-block-list-redirects-steps'");
  });
  it("is ASCII only", () => {
    expect([...src].filter((c) => c.charCodeAt(0) > 127).length).toBe(0);
  });
  it("prints through one site and never a pattern literal (the block-list pattern, H119's labels, the bank host)", () => {
    const lines = src.split(/\r?\n/);
    for (const l of lines.filter((x) => /Say9|Stop9|Fail-S16|Write-Host|throw/.test(x))) {
      expect(l, l).not.toMatch(/localhost:8085|bank\.example|a{24}/);
    }
    expect((src.match(/Write-Host/g) ?? []).length).toBe(4); // Show-S16 and the three `plan` lines
    expect(scanR16(src)).toEqual([]);
  });
  it.skipIf(!hasPs)("parses clean under PowerShell's own parser, and -Block plan runs nothing", () => {
    const cmd = `$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${path}',[ref]$t,[ref]$e);$e.Count`;
    expect(spawnSync("powershell.exe", ["-NoProfile", "-Command", cmd], { encoding: "utf8" }).stdout.trim()).toBe("0");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path, "-Block", "plan"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`PLAN liveA: ${sliceBlocks("A").join(" ")}`);
    expect(r.stdout).toContain(`PLAN liveB: ${sliceBlocks("B").join(" ")}`);
  });
});

// Static tests of Run 17b's block runner (recipes/s11b-r17b.ps1) against its plan and section 4.25. The .ps1 is read as text and parsed by
// PowerShell's own parser; nothing runs against Chrome, a daemon or a port.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALL_BLOCKS, FRAMING_BLOCKS, NOT_RUN_LINE, ROW_BLOCKS, STOP_MAP, WAITS_FOR_G11_3, sliceBlocks } from "../s11b-r17b-plan.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const path = join(REPO, "recipes", "s11b-r17b.ps1");
const src = readFileSync(path, "utf8");
const doc = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
const sheet = doc.slice(doc.indexOf("### 4.25 R17B rows"), doc.indexOf("*Known limits, recorded before the run:* the investigation"));
const code = src.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join("\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const list = (name: string): string[] => {
  const m = new RegExp(`^\\$${name} = @\\(([^)]*)\\)`, "m").exec(src);
  expect(m, name).not.toBeNull();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
};
/** The `$Blocks['x'] = {` or `function f` unit that holds line `i`. */
function unitOf(lines: string[], i: number): string {
  let s = i;
  while (s >= 0 && !/^(\$Blocks\['|function )/.test(lines[s]!)) s--;
  const h = s < 0 ? "" : lines[s]!;
  return /^\$Blocks\['([^']+)'\]/.exec(h)?.[1] ?? /^function ([\w-]+)/.exec(h)?.[1] ?? "";
}

describe("s11b-r17b.ps1 against the plan and the sheet", () => {
  it("ValidateSet is the plan's list; the slices, framing, gate list and carried map equal the plan's", () => {
    const vs = /\[ValidateSet\(([^)]*)\)\]/.exec(src)!;
    expect([...vs[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1])).toEqual([...ALL_BLOCKS]);
    expect(list("SliceA")).toEqual(sliceBlocks("A"));
    expect(list("SliceB")).toEqual(sliceBlocks("B"));
    expect(list("FramingBlocks")).toEqual([...FRAMING_BLOCKS]);
    expect(list("NeedsAccess")).toEqual(["root-add", ...WAITS_FOR_G11_3.map((r) => r.toLowerCase())]);
    expect(list("GateRows")).toEqual([...WAITS_FOR_G11_3]);
    const carried = [...src.match(/^\$Carried = @\{(.*)\}$/m)![1]!.matchAll(/'([^']+)' = '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(carried).toEqual(ROW_BLOCKS.filter((r) => r.carried).map((r) => [r.block, r.carried]));
  });
  it("every r17b block named in the sheet's Helper column exists in the .ps1, with every plan block", () => {
    const named = [...sheet.matchAll(/`R17B (r17b-[a-z0-9-]+)`/g)].map((m) => m[1]!);
    expect(named.length).toBeGreaterThanOrEqual(14);
    const own = [...src.matchAll(/^\$Blocks\['([^']+)'\] =/gm)].map((m) => m[1]!);
    const carried = ROW_BLOCKS.filter((r) => r.carried).map((r) => r.block);
    for (const b of named) expect([...own, ...carried], b).toContain(b);
    for (const b of ALL_BLOCKS.filter((x) => !["liveA17B", "liveB17B", "plan"].includes(x))) {
      const viaFor = /foreach \(\$r17bN in ([^)]*)\) \{ \$Blocks\[\$r17bN\]/.exec(src)![1]!;
      expect(own.includes(b) || carried.includes(b) || viaFor.includes(`'${b}'`), b).toBe(true);
    }
  });
  it("each STOP of the map has its marker on a stopping line of the named block or function", () => {
    const lines = src.split(/\r?\n/);
    for (const s of STOP_MAP) {
      const ats = lines.map((l, i) => (l.includes(`# STOP-MAP ${s.id}`) ? i : -1)).filter((i) => i >= 0);
      expect(ats.length, s.id).toBeGreaterThan(0);
      expect(ats.some((at) => /Stop9|Fail-S16|throw|StopOnFail|Step-S16|Test-S16Port|Invoke-R17History|Assert-R17TreeClean|Invoke-R17Node/.test(lines[at]!) && unitOf(lines, at) === s.where), s.id).toBe(true);
    }
    for (const m of src.matchAll(/# STOP-MAP ([a-z0-9-]+)/g)) expect(STOP_MAP.map((x) => x.id)).toContain(m[1]);
  });
  it("any STOP line or throw ends the wave through Run 17's stop procedure (exit 2), and there is no NOT BUILT path", () => {
    expect(src).toContain('if ($global:S16Stops -gt $s0) { throw "block $Name printed a STOP" }');
    expect(src).toMatch(/catch \{[^}]*Stop-S16Wave/);
    expect(code).not.toMatch(/NOT BUILT|NotBuilt|R17FwdNotBuilt|histNotBuilt/);
    expect(code).not.toMatch(/exit 0\s*\n\}/);
  });
  it("a set-up history is built under --activate on tabs opened by New-R17Tab (S9 newtab --as), never by S11 make", () => {
    const h = /\$Blocks\['r17b-history'\] = \{[\s\S]*?\n\}/.exec(src)![0];
    expect(h.match(/New-R17Tab/g)!.length).toBe(3);
    expect((h.match(/'--activate', '--label'/g) ?? []).length).toBe(3);
    for (const k of ["back", "fwd", "samedoc"]) expect(h).toContain(`'--kind', '${k}'`);
    expect(code).not.toMatch(/'s11' @\('make'\)/);
    const fwd = /\$Blocks\['r17b-fwd'\] = \{ Invoke-R17History 'R17B-FWD' 'forward' 'hf' 'bfw' 2 \}/;
    expect(src).toMatch(fwd);
    const act = /\$Blocks\['r17b-act-ctl'\] = \{[\s\S]*?\n\}/.exec(src)![0];
    expect(act).toContain("'--kind', 'p3'");
    expect(act).toContain("'--activate', '--label', 'act-ctl'");
    expect(act.match(/Invoke-R17History 'R17B-ACT-CTL'/g)!.length).toBe(2);
    const noact = /\$Blocks\['r17b-back-noact'\] = \{[\s\S]*?\n\}/.exec(src)![0];
    expect(noact.replace(/#.*/g, "")).not.toContain("--activate");
  });
  it("R17B-0 prints the MANIFEST text joined to the BUILD text as one line, to the record, before the other lines", () => {
    const z = /\$Blocks\['r17b-0'\] = \{[\s\S]*?\n\}/.exec(src)![0];
    expect(z).toContain('$first = "$man $bld"');
    expect(z.indexOf("Show-S16 @($first)")).toBeGreaterThan(z.indexOf("$first = "));
    expect(z.indexOf("Show-S16 @($first)")).toBeLessThan(z.indexOf("Show-S16 @($all"));
    expect(z).toContain("'build-proof', '--tabwatch'");
    expect(z).toContain("'open' 'newtab' @('http://localhost:8081/e2e-playground.html?s11b=b0', '--as', 'b0')");
  });
  it("the G11-3 branch writes NOT RUN with the sheet's dash for the seven rows and exits 3", () => {
    const e = /function Read-S17Early \{[\s\S]*?\n\}/.exec(src)![0];
    expect(e).toContain('"ROW $Row NOT RUN $Dash waits for G11-3"');
    expect(src).toContain("$Dash = [char]0x2014");
    expect(NOT_RUN_LINE).toBe(`NOT RUN — waits for G11-3`);
    expect(e).toContain("return $false");
    expect(src).toMatch(/Read-S17Early\)\[-1\]\) \{ exit 3 \}/);
    expect(src).toMatch(/Test-S17Gate \$r17bSlot\)\) \{ Invoke-S17Block 'teardown'; exit 3 \}/);
  });
  it("R17B-DISARM presses ON after the reply, reads G1's count (found + 1), and R17B-CTL skips the two servers not started", () => {
    const d = /\$Blocks\['r17b-disarm'\] = \{[\s\S]*?\n\}/.exec(src)![0];
    expect(d).toContain("Invoke-S11bPressAfterReply $global:W 'R17B-DISARM' -ReplyFile (Join-Path $env:S11_OUT 'node-out.txt') -Checked");
    expect(d).toContain("[int]$global:S11Found.count + 1");
    expect(src).toContain("'--skip', '8088,8089'");
    expect(code).not.toMatch(/Start-R17Srv 808[89]/);
  });
  it("reads Run 17's file by its parser and never dot-sources it; dot-sources the three helper files in order", () => {
    expect(code).not.toMatch(/\.\s+["']?\$PSScriptRoot\\s11b-r17\.ps1/);
    expect(src).toContain("ParseFile((Join-Path $PSScriptRoot 's11b-r17.ps1')");
    const a = src.indexOf('s9-win.ps1"');
    expect(src.indexOf('s11-win.ps1"')).toBeGreaterThan(a);
    expect(src.indexOf('s11b-win.ps1"')).toBeGreaterThan(src.indexOf('s11-win.ps1"'));
    expect(code).not.toMatch(/chrome\.exe/i);
    expect(src).toContain("$global:S9PinUiaOnly = $true");
    expect(code).not.toContain("0.0.0.0");
    expect(src).toContain("--bind 127.0.0.1");
  });
  it("is ASCII only; prints through Run 17's one site and holds no URL, token, list text or rule in an output line", () => {
    expect([...src].filter((c) => c.charCodeAt(0) > 127).length).toBe(0);
    expect((src.match(/Write-Host/g) ?? []).length).toBe(3); // the two `plan` lines and the one refusal when Run 17's blocks were not read
    for (const l of src.split(/\r?\n/).filter((x) => /Say9|Stop9|Fail-S16|Write-Host|throw/.test(x))) {
      expect(l, l).not.toMatch(/https?:\/\/|localhost:8085|bank\.example|a{24}|token|\$Blk|\$text/i);
    }
  });
  it.skipIf(!hasPs)("parses clean under PowerShell's own parser, and -Block plan runs offline and lists both slices in the sheet's order", () => {
    const cmd = `$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${path}',[ref]$t,[ref]$e);$e.Count`;
    expect(spawnSync("powershell.exe", ["-NoProfile", "-Command", cmd], { encoding: "utf8" }).stdout.trim()).toBe("0");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path, "-Block", "plan"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`PLAN liveA17B: ${sliceBlocks("A").join(" ")}`);
    expect(r.stdout).toContain(`PLAN liveB17B: ${sliceBlocks("B").join(" ")}`);
  });
});

// Tests of the S5-liveB set-up fixes (#282): (F3) UP-6-style rows print every clause verdict, then the banner verdict; (F4) the
// scanners count scheme://host matches, not a bare "://"; (F5) the CLICK print shows the first line only; (console) the stop path
// saves the worker console. Nothing here touches Chrome, a window or a port.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evidenceCounts } from "../s11-evidence.js";
import { refusalRowVerdicts, scanText, UP6_STEPS, type StepObs } from "../s11-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (f: string): string => readFileSync(join(REPO, "recipes", f), "utf8").replace(/^\uFEFF/, "").replace(/\r/g, "");

describe("F3 refusalRowVerdicts", () => {
  const missing: StepObs[] = [];
  it("with a banner seen, every clause keeps its own verdict and the banner verdict follows; the row fails as before", () => {
    const r = refusalRowVerdicts(UP6_STEPS, missing, true, true);
    expect(r.clauses.map((c) => c.j.why)).toEqual(UP6_STEPS.map(() => "no observation"));
    expect(r.banner).toMatchObject({ pass: false });
    expect(r.row.pass).toBe(false);
  });
  it("no banner: banner verdict ok; sampler off: no banner verdict; the row verdict equals the clauses'", () => {
    expect(refusalRowVerdicts(UP6_STEPS, missing, true, false).banner).toMatchObject({ pass: true });
    expect(refusalRowVerdicts(UP6_STEPS, missing, false, false).banner).toBeUndefined();
    expect(refusalRowVerdicts([], [], true, false).row.pass).toBe(true);
    expect(refusalRowVerdicts([], [], true, true).row.pass).toBe(true); // nothing to judge, as the old map over no steps
  });
});

describe("F4 scheme://host counting", () => {
  const ctx = { sentinel: "zz", profile: [] as string[] };
  it("the helpers' own SCAN / EVIDENCE lines do not count", () => {
    const t = "SCAN console: ://=0 (fixture 0, other 0)\nEVIDENCE rec.md: ://=22 (fixture 19, other 3)";
    expect(scanText(t, ctx)).toMatchObject({ urls: 0, fixture: 0, other: 0 });
    expect(evidenceCounts(t, ctx)).toMatchObject({ urls: 0, other: 0 });
  });
  it("real URLs still count: fixture, non-fixture, file:///, and a placeholder with a host", () => {
    const t = "http://127.0.0.1:8081/a https://example.com/x file:///C:/q chrome://extensions scheme://host";
    expect(scanText(t, ctx)).toMatchObject({ urls: 5, fixture: 2, other: 3 });
  });
});

describe("F5 / console (static)", () => {
  it("the CLICK print uses the first line", () => {
    const s9 = rd("s9-win.ps1");
    expect(s9).toContain("Say9 \"CLICK '$((Get-S9FirstLine $El.Current.Name).First)'");
    expect(s9).not.toContain("CLICK '$($El.Current.Name)'");
  });
  const r16 = rd("s11-r16.ps1");
  it("liveB opens the console before UP-0", () => {
    const m = /\$SliceB = @\(([^)]*)\)/.exec(r16)![1]!;
    expect(m.indexOf("'console'")).toBeGreaterThan(-1);
    expect(m.indexOf("'console'")).toBeLessThan(m.indexOf("'up-0'"));
  });
  it("Close-S16Windows saves the console first, once, to console.txt; UP-LOGS marks it read", () => {
    const close = /function Close-S16Windows \{[\s\S]*?\n}\n/.exec(r16)![0];
    expect(close.indexOf("Save-S16Console")).toBeGreaterThan(-1);
    expect(close.indexOf("Save-S16Console")).toBeLessThan(close.indexOf("Close-S9Window"));
    const save = /function Save-S16Console \{[\s\S]*?\n}\n/.exec(r16)![0];
    expect(save).toContain("Read-S9WorkerConsole $global:D (Join-Path $env:S11_OUT 'console.txt')");
    expect(save).toContain("if ($global:S16ConsoleRead) { return }");
    expect(/\$Persist = [^\n]*'S16ConsoleRead'/.test(r16)).toBe(true);
    const logs = /\$Blocks\['up-logs'\] = \{[\s\S]*?\n}\n/.exec(r16)![0];
    expect(logs).toContain("$global:S16ConsoleRead = $true");
    // the stop path closes windows through it
    expect(/function Stop-S16Wave[\s\S]*?Close-S16Windows/.test(r16)).toBe(true);
  });
});

describe("F3 wiring (static)", () => {
  it("refusalRow prints the clauses, then the banner, from refusalRowVerdicts", () => {
    const s = rd("s11.ts");
    const f = /async function refusalRow[\s\S]*?\n}\n/.exec(s)![0];
    expect(f).toContain("refusalRowVerdicts(steps, v, banner, seen)");
    expect(f.indexOf("res.clauses")).toBeLessThan(f.indexOf("res.banner"));
    expect(f).not.toContain("j: banner && seen");
  });
});

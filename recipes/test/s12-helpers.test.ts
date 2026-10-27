// Step 12 S1-helpers-a: the capture-per-slice guards, R18-BANNER-CTL's rule, the idle guard, the DEVT lines (recipes/s12-rules.ts), and
// static ties of recipes/s12-win.ps1 and recipes/s11b.ts to them and to section 4.26. Nothing here runs Chrome, a daemon or a port.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  bannerCtlLines, bannerCtlPass, captureStop, committedCaptureName, CONTROL_TEXT, consoleLine, devtLines, dropTitleLines, idleCheck, IDLE_MIN_MS,
  idleWaitMs, rawCaptureName, SAMPLE_TAIL_MS, SLICES,
} from "../s12-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (...p: string[]): string => readFileSync(join(REPO, ...p), "utf8");
const doc = read("docs", "e2e-test-plan.md");
const sheet = doc.slice(doc.indexOf("### 4.26 R18 rows"));
const ps = read("recipes", "s12-win.ps1");
const s11b = read("recipes", "s11b.ts").replace(/\r\n/g, "\n");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

/** The static ties of s11b.ts to the sheet (F3): the problems found in a text of the file; none in the real one. Mutants are fed to it below. */
function s11bTies(text: string): string[] {
  const bad: string[] = [];
  const body = /async function bannerctl\([^]*?\nfunction bannerctlJudge/.exec(text)?.[0] ?? "";
  const neg = /if \(leg === "neg"\) \{[^]*?\n  \}\n/.exec(body)?.[0] ?? "";
  if (neg === "") bad.push("no neg branch");
  if (/session\(|bcall\(|connect/.test(neg)) bad.push("the neg leg makes a bridge call or a connection");
  if (!/devtLines\(devtSlice, ctl1\.err\?\.code \?\? "ok", ctl2\.err\?\.code \?\? "ok"\)/.test(text)) bad.push("devtLines is not fed control 1's own code");
  if ((body.match(/bcall\(/g) ?? []).length !== 1 || !/bcall\(c, "evaluate", \{ tab: h, expression: "1", /.test(body)) bad.push("the pos leg is not exactly one evaluate of 1");
  if (!/function bannerctlJudge[^]*?bump\(ls\[2\]!\.includes\(" PASS "\) \? 0 : 1\)/.test(text)) bad.push("the judge does not exit non-zero on FAIL");
  if (!/const devtRow = [^\n]*rowOpt\(a, \[/.test(text) || !/const devtSlice = [^\n]*sliceOf\(a\)/.test(text)) bad.push("--row/--slice are not validated up front");
  if (text.indexOf("const devtRow") > text.indexOf('tab.upload({ css: "#up-single" }', text.indexOf("async function devt("))) bad.push("--row is validated after the upload");
  return bad;
}

describe("the console capture, one file per slice", () => {
  it("the two slices' paths differ, and the names are the sheet's", () => {
    expect(rawCaptureName("liveA18")).toBe("console-liveA18.txt");
    expect(rawCaptureName("liveB18")).toBe("console-liveB18.txt");
    expect(rawCaptureName("liveA18")).not.toBe(rawCaptureName("liveB18"));
    expect(committedCaptureName("liveA18")).toBe("S1-live-console-liveA18.txt");
    expect(committedCaptureName("liveB18", 3)).toBe("S1-live-console-liveB18-att3.txt");
    for (const sl of ["liveA18", "liveB18"] as const) for (const n of [rawCaptureName(sl), committedCaptureName(sl)]) expect(sheet, n).toContain(n);
    expect(sheet).toContain("`-att2`"); // the later-attempt suffix committedCaptureName(s, 2) adds
  });
  it("a path that already holds text is a STOP; absent or blank is free", () => {
    expect(captureStop(null)).toBeNull();
    expect(captureStop(" \n\r\n")).toBeNull();
    expect(captureStop("one line")).toMatch(/^the capture file already holds text/);
    expect(captureStop("one line")).not.toContain("one line");
  });
  it("the control line is badge.ts's `disarmed`, read as text", () => {
    expect(CONTROL_TEXT).toBe("safety: disarmed by the user");
    expect(read("extension", "src", "badge.ts")).toMatch(new RegExp(`disarmed: "${CONTROL_TEXT}"`));
  });
  it("the CONSOLE line drops title lines before counting; file name only", () => {
    const raw = ["DevTools - someprofile", "a", "", `x ${CONTROL_TEXT} y`, "Page - Google Chrome", CONTROL_TEXT].join("\n");
    expect(dropTitleLines(raw)).toEqual({ text: ["a", "", `x ${CONTROL_TEXT} y`, CONTROL_TEXT].join("\n"), dropped: 2 });
    expect(consoleLine("liveA18", "console-liveA18.txt", raw)).toBe("CONSOLE liveA18 capture=console-liveA18.txt texts=3 control-disarmed=2");
    expect(() => consoleLine("liveA18", "C:\\x\\console-liveA18.txt", raw)).toThrow();
    expect(() => consoleLine("liveA18", "console-liveB18.txt", raw)).toThrow();
  });
  it("the title-line rule is the one in s11b-rules.ts (tie by text)", () => {
    const r = read("recipes", "s11b-rules.ts");
    expect(r).toContain("/^DevTools(?: - .*)?$/i.test(l.trim()) || / - (?:Google )?Chrome$/i.test(l.trim())");
    expect(read("recipes", "s12-rules.ts")).toContain("/^DevTools(?: - .*)?$/i.test(l.trim()) || / - (?:Google )?Chrome$/i.test(l.trim())");
  });
});

describe("R18-BANNER-CTL", () => {
  const ok = { idleMs: 15_000, neg: "none", pos: "seen", posAnswer: "ok" } as const;
  it("passes only on neg none, pos seen, pos answer ok, idle >= 15000", () => {
    expect(bannerCtlPass(ok)).toBe(true);
    expect(bannerCtlPass({ ...ok, idleMs: 14_999 })).toBe(false);
    expect(bannerCtlPass({ ...ok, neg: "seen" })).toBe(false);
    expect(bannerCtlPass({ ...ok, pos: "none" })).toBe(false);
    expect(bannerCtlPass({ ...ok, posAnswer: "DEBUGGER_DEVTOOLS" })).toBe(false);
  });
  it("prints the sheet's three lines", () => {
    expect(bannerCtlLines("liveB18", { ...ok, idleMs: 16_200, negPolls: 30, posPolls: 31 })).toEqual([
      "BANNERCTL liveB18 leg=neg idle-ms=16200 polls=30 banner=none",
      "BANNERCTL liveB18 leg=pos answer=ok polls=31 banner=seen",
      "ROW R18-BANNER-CTL PASS slice=B",
    ]);
    expect(bannerCtlLines("liveA18", { ...ok, neg: "seen", negPolls: 1, posPolls: 1 })[2]).toBe("ROW R18-BANNER-CTL FAIL slice=A");
  });
  it("each form is in section 4.26 by key", () => {
    for (const k of ["BANNERCTL <slice> leg=neg idle-ms=<n> polls=<n> banner=<seen|none>", "BANNERCTL <slice> leg=pos answer=<ok|CODE> polls=<n> banner=<seen|none>", "ROW R18-BANNER-CTL <PASS|FAIL> slice=<A|B>", "IDLE <row> since-attach-ms=<n>", "DEVT <slice> control1 <ok|CODE> attached=<yes|no>", "DEVT <slice> control2 <ok|CODE>", "CONSOLE <slice> capture=<file name only> texts=<n> control-disarmed=<n>"]) expect(sheet, k).toContain(k);
    expect(SLICES).toEqual({ liveA18: "A", liveB18: "B" });
  });
});

describe("the idle guard", () => {
  it("prints IDLE and passes at 15000 or more; under it, or unknown, is a STOP before the call", () => {
    expect(IDLE_MIN_MS).toBe(15_000);
    expect(idleCheck("R18-UP-6", 15_000)).toEqual({ line: "IDLE R18-UP-6 since-attach-ms=15000", stop: null });
    expect(idleCheck("R18-UP-6", 14_999)).toEqual({ line: "IDLE R18-UP-6 since-attach-ms=14999", stop: expect.stringMatching(/under 15000 ms/) });
    expect(idleCheck("R18-UP-6", null).line).toBeNull();
    expect(idleCheck("R18-UP-6", null).stop).toMatch(/no attach stamp/);
  });
  it("the wait is the remainder, or the full 15 s when the stamp is unknown", () => {
    expect(idleWaitMs(4_000)).toBe(11_000);
    expect(idleWaitMs(15_000)).toBe(0);
    expect(idleWaitMs(40_000)).toBe(0);
    expect(idleWaitMs(null)).toBe(15_000);
  });
});

describe("the DEVT lines", () => {
  it("attached=yes exactly when control 1 answered DEBUGGER_DEVTOOLS", () => {
    expect(devtLines("liveB18", "DEBUGGER_DEVTOOLS", "ok")).toEqual(["DEVT liveB18 control1 DEBUGGER_DEVTOOLS attached=yes", "DEVT liveB18 control2 ok"]);
    expect(devtLines("liveB18", "ok", "ok")[0]).toBe("DEVT liveB18 control1 ok attached=no");
    expect(devtLines("liveB18", "TAB_HELD", "DEBUGGER_DEVTOOLS")[0]).toBe("DEVT liveB18 control1 TAB_HELD attached=no");
  });
});

describe("s12-win.ps1 and s11b.ts (static)", () => {
  it.skipIf(!hasPs)("is ASCII and parses with zero errors", () => {
    expect(/^[\x00-\x7f]*$/.test(ps)).toBe(true);
    const f = join(REPO, "recipes", "s12-win.ps1").replace(/'/g, "''");
    const cmd = `$e = $null; $t = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${f}', [ref]$t, [ref]$e); if ($e.Count) { $e | ForEach-Object { 'ERR ' + $_.Message }; exit 1 } else { 'PARSE OK' }`;
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { encoding: "utf8" });
    expect(r.stdout).toContain("PARSE OK");
  });
  it("sets the sampler tail to the TS constant and refuses to sample unless it reads 0", () => {
    expect(SAMPLE_TAIL_MS).toBe(0);
    expect(ps).toMatch(/^\$S11SampleTailMs = 0\b/m);
    expect(ps).toMatch(/function Assert-S12Tail[^]*?\$S11SampleTailMs -ne 0[^]*?Stop9/);
    expect(ps).toMatch(/function Invoke-S12Sampler[^]*?Assert-S12Tail[^]*?Invoke-S11Sampler[^]*?6>&1/);
    expect(read("recipes", "s11-win.ps1")).toMatch(/^\$S11SampleTailMs = 4000\b/m); // the older pin stays; the override is s12's
  });
  it("mirrors the threshold, the file names, the IDLE form and the SAMPLER line it parses", () => {
    expect(ps).toContain(`$S12IdleMinMs = ${IDLE_MIN_MS}`);
    expect(ps).toContain("console-$Slice.txt");
    expect(ps).toContain("IDLE $Row since-attach-ms=$n");
    const re = /\[regex\]::Match\(\$t, '([^']+)'\)/.exec(ps);
    expect(re, "sampler regex").not.toBeNull();
    expect(read("recipes", "s11-win.ps1")).toContain("SAMPLER $Row polls=$total (after the reply $post) banner=$res");
    const m = new RegExp(re![1]!).exec("2026-10-27T10:00:00.000Z s9-win: SAMPLER R18-BANNER-CTL-neg polls=31 (after the reply 1) banner=none");
    expect(m?.slice(1)).toEqual(["31", "none"]);
  });
  it("guards the capture path (outside the repo, a STOP when it holds text) and the DevTools window X", () => {
    expect(ps).toMatch(/function Assert-S12CaptureFree[^]*?Assert-S11Outside[^]*?Stop9[^]*?throw/);
    expect(ps).toMatch(/function Save-S12Console[^]*?Assert-S12CaptureFree[^]*?Save-S11bConsole/);
    expect(ps).toMatch(/function Send-S12Key[^]*?Assert-S11Own[^]*?Set-S9Foreground[^]*?KEY /);
    expect(ps).toMatch(/function Close-S12DevTools[^]*?Stop9 'a DevTools window or pane is left open/);
    expect(ps).not.toMatch(/attached=yes/); // attachment is proven by control 1's code only
  });
  it("s11b.ts: bannerctl actors, the judge, and devt's --slice are wired from s12-rules; the default devt is kept", () => {
    expect(s11b).toMatch(/"bannerctl-judge"/);
    expect(s11b).toMatch(/bannerctl,/);
    expect(s11b).toMatch(/"console-line"/);
    expect(s11b).toContain("finalRow(devtRow, devtJudges(ctl1.err, up.err, ctl2.err, page))");
    expect(s11b).toContain('say(`ANSWER UP-DEVT control1 ${answerText(ctl1.err)}`)');
    expect(s11bTies(s11b)).toEqual([]);
  });
  it("each tie fails on its mutant (M21 forced code, M22 bridge call in the neg leg, M23 other expression, M26 judge exits 0, F11 late validation)", () => {
    const mut = (a: string, b: string): string[] => { expect(s11b).toContain(a); return s11bTies(s11b.replace(a, b)); };
    expect(mut('ctl1.err?.code ?? "ok", ctl2', '"DEBUGGER_DEVTOOLS", ctl2')).toContain("devtLines is not fed control 1's own code");
    expect(mut('const r = await windowed(realIo, id, ledger, async () => undefined);', 'const r = await windowed(realIo, id, ledger, () => attempt(() => bcall(c, "evaluate", {}, 1)));')).toContain("the neg leg makes a bridge call or a connection");
    expect(mut('expression: "1", ', 'expression: "2", ')).toContain("the pos leg is not exactly one evaluate of 1");
    expect(mut('bump(ls[2]!.includes(" PASS ") ? 0 : 1)', "bump(0)")).toContain("the judge does not exit non-zero on FAIL");
    expect(mut('const devtRow = a.opts.row === undefined ? "R17-UP-DEVT" : rowOpt(', 'const devtRow = a.opts.row ?? (')).toContain("--row/--slice are not validated up front");
  });
});

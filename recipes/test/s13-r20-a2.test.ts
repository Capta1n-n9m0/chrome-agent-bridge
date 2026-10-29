// Step 13 S5-drivers-A2: the pure decisions of recipes/s13-r20-a2.ts (CON-DESC, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR) and the entry script's shape.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MCP_LINES } from "../s13-forms.js";
import type { ConEntry, FloorCounts } from "../s12-forms.js";
import { assertWaits, capRow, cmds, DESC_S1, DESC_S2, descRow, judgeCon4Mcp, judgeFloor20, judgeNotea, WAIT_OFF_MS, WAIT_ON_MS } from "../s13-r20-a2.js";
const SENT = "s12sent-5f3a9c71";
const e = (text: string, kind: ConEntry["kind"] = "console"): ConEntry => ({ level: "info", kind, text, ts: 1 });
describe("R20-CON-DESC", () => {
  it("passes with both sentences exactly once; a pre-S3b description lacking the second fails; a missing control tool is NOT DISCRIMINATING", () => {
    expect(descRow("R", { con: `a ${DESC_S1} b ${DESC_S2}`, snap: "Take a snapshot" }).v).toBe("PASS");
    expect(descRow("R", { con: `a ${DESC_S1}`, snap: "x" }).v).toBe("FAIL");
    expect(descRow("R", { con: `${DESC_S1} ${DESC_S2} ${DESC_S2}`, snap: "x" }).v).toBe("FAIL");
    expect(descRow("R", { con: `${DESC_S1} ${DESC_S1} ${DESC_S2}`, snap: "x" }).v).toBe("FAIL");
    expect(descRow("R", { con: `${DESC_S1} ${DESC_S2}`, snap: undefined }).v).toBe("NOT DISCRIMINATING");
    expect(descRow("R", { con: undefined, snap: "x" }).lines[0]).toBe("CHECK R sentence-1=0 sentence-2=0 control-tool=read");
  });
});
describe("R20-CON-NOTEA", () => {
  it("allowed passes on the sheet's reading and fails when the marker or the contents appear", () => {
    expect(judgeNotea("allowed", [e(SENT), e("Object")], "t info Object")).toBe("PASS");
    expect(judgeNotea("allowed", [e(SENT), e("Object")], "t info Object s12-noteaok")).toBe("FAIL");
    expect(judgeNotea("allowed", [e(SENT), e("Object")], undefined)).toBe("FAIL");
    expect(judgeNotea("allowed", [e(SENT), e("Foo")], "t info Foo")).toBe("RECORD");
    expect(judgeNotea("allowed", [e(SENT), e("a://b")], "t info a://b")).toBe("FAIL");
  });
  it("pre: two entries both `Object` and no sentinel; blocked: zero entries; one entry left is a FAIL", () => {
    expect(judgeNotea("pre", [e("Object"), e("Object")])).toBe("PASS");
    expect(judgeNotea("pre", [e("Object"), e("Other")])).toBe("FAIL");
    expect(judgeNotea("pre", [e("Object")])).toBe("FAIL");
    expect(judgeNotea("blocked", [])).toBe("PASS");
    expect(judgeNotea("blocked", [e("Object")])).toBe("FAIL");
  });
});
describe("R20-CON-CAP", () => {
  const body = (from: number, to: number): string => { const o: string[] = []; for (let i = from; i <= to; i++) o.push(`2026-01-01T00:00:00.000Z info s12-cap-${i}: ${"x".repeat(1900)}`); return o.join("\n"); };
  const marker = (n: number): string => `… [truncated: ${n} older lines cut — narrow with level/limit]`;
  it("newest nine with the marker first passes with the controls; the oldest kept (Run 19's formatter) fails", () => {
    const l3 = body(198, 200);
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 200, l3).v).toBe("PASS");
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 200, l3).lines[0]).toMatch(/^CONCAP lines=10 .*marker=yes first-index=192 last-index=200/);
    expect(capRow("R", body(1, 9), 200, l3).v).toBe("FAIL");
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 200, l3).lines[1]).toBe("CHECK R line-chars=1943-1943");   // the RECORD case's line length (min-max over the kept lines, marker excluded)
    expect(capRow("R", `${marker(191)}\n${body(98, 100)}`, 200, l3).lines[1]).toBe("CHECK R line-chars=1942-1943");
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 199, l3).v).toBe("FAIL");
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 200, `${marker(197)}\n${body(198, 200)}`).v).toBe("FAIL");
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 200, `${marker(198)}\n${body(199, 200)}`).v).toBe("FAIL");   // three lines, but one is the marker
    expect(capRow("R", `${marker(191)}\n${body(192, 200)}`, 200, body(1, 3)).v).toBe("FAIL");   // three lines, not the last three entries
  });
});
describe("R20-CON-4", () => {
  const line = MCP_LINES.disarmedAll;
  it("the MCP leg is the SDK's own line, exactly, equal to the snapshot control; the extension's message is a FAIL", () => {
    expect(judgeCon4Mcp({ isError: true, text: line }, { isError: true, text: line })).toBe("PASS");
    expect(judgeCon4Mcp({ isError: true, text: `DISARMED\n${line}` }, { isError: true, text: line })).toBe("FAIL");
    expect(judgeCon4Mcp({ isError: true, text: "The user has turned the bridge off in Chrome" }, { isError: true, text: line })).toBe("FAIL");
    expect(judgeCon4Mcp({ isError: true, text: line }, { isError: true, text: `${line} other` })).toBe("FAIL");   // exact line, but not the control's text
    expect(judgeCon4Mcp({ isError: false, text: "ok" }, { isError: true, text: line })).toBe("FAIL");
  });
});
describe("R20-CON-FLOOR", () => {
  const f = (o: Partial<FloorCounts> = {}): FloorCounts => ({ disarmedTicks: 3, inReplyDisarmed: 0, afterTicks: 2, inReplyAfter: 2, excDisarmed: 3, excInReplyDisarmed: 0, excAfter: 2, excInReplyAfter: 2, ...o });
  it("checks the preconditions first (NOT MEASURED), then the rule", () => {
    expect(judgeFloor20(f())).toBe("PASS");
    expect(judgeFloor20(f({ disarmedTicks: 2, inReplyDisarmed: 0 }))).toBe("NOT MEASURED");
    expect(judgeFloor20(f({ afterTicks: 1, inReplyAfter: 1 }))).toBe("NOT MEASURED");
    expect(judgeFloor20(f({ inReplyDisarmed: 1 }))).toBe("FAIL");
    expect(judgeFloor20(f({ excInReplyDisarmed: 1 }))).toBe("FAIL");
    expect(judgeFloor20(f({ inReplyAfter: 1 }))).toBe("FAIL");
  });
  it("the waits are the sheet's 5 000 and 3 500 ms; a shorter one is a helper error", () => {
    expect([WAIT_OFF_MS, WAIT_ON_MS]).toEqual([5000, 3500]);
    expect(() => assertWaits(5000, 3500)).not.toThrow();
    expect(() => assertWaits(4999, 3500)).toThrow(/below/);
    expect(() => assertWaits(5000, 3000)).toThrow(/below/);
  });
});
describe("commands and the entry script", () => {
  it("names the six actors the PowerShell rows call", () => expect(Object.keys(cmds).sort()).toEqual(["args-old", "con-4", "con-cap", "con-desc", "con-floor", "con-notea-a", "con-notea-b"].sort()));
  const entry = readFileSync(fileURLToPath(new URL("../s13-r20-a.ps1", import.meta.url)), "utf8");
  it("the header says never to run teardown after restored=no and to run a slice in the background", () => {
    const head = entry.split("\n").slice(0, 14).join("\n");
    expect(head).toMatch(/restored=no[^\n]*never run -Block teardown/);
    expect(head).toMatch(/run it in the background/);
  });
  it("the entry script is ASCII, takes -Block, dot-sources the window helpers before s13-r20.ps1, registers the blocks and runs Invoke-R19Main", () => {
    expect(/^[\x00-\x7f]*$/.test(entry)).toBe(true);
    expect(entry).toContain("[ValidateSet('liveA20', 'plan', 'teardown')]");
    const at = (s: string): number => entry.indexOf(s);
    const S13 = String.raw`. "$PSScriptRoot\s13-r20.ps1"`, WINC = String.raw`. "$PSScriptRoot\s12-win-c.ps1"`;
    expect(at(WINC)).toBeGreaterThan(0);
    expect(at(S13)).toBeGreaterThan(at(WINC));
    expect(at("Register-R20Blocks")).toBeGreaterThan(at(S13));
    expect(at("Invoke-R19Main $Block")).toBeGreaterThan(at("Register-R20Blocks"));
    expect(entry.split("\n").length).toBeLessThan(80);
  });
  it("the entry script parses under Windows PowerShell", () => {
    const p = spawnSync("powershell.exe", ["-NoProfile", "-Command", `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${fileURLToPath(new URL("../s13-r20-a.ps1", import.meta.url)).replace(/'/g, "''")}', [ref]$null, [ref]$e); exit $e.Count`], { encoding: "utf8" });
    if (p.error === undefined) expect(p.status).toBe(0);
  });
});

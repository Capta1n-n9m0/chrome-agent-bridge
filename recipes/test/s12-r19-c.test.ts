// Step 12 S7-drivers-C: liveC19's row drivers (the file chooser and G2) against section 4.27. The pure decisions (recipes/s12-r19-c.ts) are unit-tested; the PowerShell side
// (recipes/s12-r19-c.ps1) runs with every helper stubbed (nothing touches Chrome, a daemon or a port) and, as named mutants, must turn its own check red.
import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import * as C from "../s12-r19-c.js";
import { STOP_REASONS } from "../s12-r19.js";
import { StopWhy } from "../s12-r19-a.js";
import { K } from "../s11-rules.js";
import { MSG } from "../s12-r19-a.js";
import { chooseLine, dialogLine, g2Line, g2typeLine, humanLine, lateLine } from "../s12-forms-c.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const SEC = rd("docs/e2e-test-plan.md").slice(rd("docs/e2e-test-plan.md").indexOf("### 4.27 R19 rows"), rd("docs/e2e-test-plan.md").indexOf("## 5. Results template"));
const PSC = rd("recipes/s12-r19-c.ps1");
const ENTRY = rd("recipes/s12-r19.ps1");
const LIB = rd("recipes/s12-r19-lib.ps1");
const TS = rd("recipes/s12-r19-c.ts");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const keys = (s: string): string[] => [...s.matchAll(/([a-z][a-z-]*)=/g)].map((m) => m[1]!);
const OBS: C.ChooseObs = { answer: "ok", exact: null, files: 1, change: 1, clicks: 1, bytesEqual: true, dialog: 0, ms: 300 };
const W1: C.ChooseWant = { answer: "ok", files: 1, change: 1, clicks: 1, bytesEqual: true };
const KDEVT = { code: K["K-devt"].code, message: K["K-devt"].message };

describe("the chooser decisions", () => {
  it("CHOOSE: every named key, the answer and a dialog count of 0; `exact` only where asked", () => {
    expect(C.judgeChoose(OBS, W1)).toBe("PASS");
    for (const bad of [{ answer: "TIMEOUT" }, { files: 0 }, { change: 0 }, { clicks: 0 }, { bytesEqual: false }, { dialog: 1 }] as Array<Partial<C.ChooseObs>>) expect(C.judgeChoose({ ...OBS, ...bad }, W1), JSON.stringify(bad)).toBe("FAIL");
    expect(C.judgeChoose({ ...OBS, clicks: 7 }, { answer: "ok", files: 1 })).toBe("PASS"); // a key the want leaves out is not judged
    expect(C.judgeChoose({ ...OBS, answer: "BAD_PARAMS", exact: false }, { answer: "BAD_PARAMS", files: 1, exact: true })).toBe("FAIL");
    expect(C.judgeChoose({ ...OBS, bytesEqual: null }, { ...W1, bytesEqual: null })).toBe("PASS");
  });
  it("CHOOSE-3's wait is 4 900 to 8 000 ms; a build with no wait bound answers at 15 s", () => {
    expect([4_899, 4_900, 8_000, 8_001, 15_000].map(C.judgeTimeoutMs)).toEqual(["FAIL", "PASS", "PASS", "FAIL", "FAIL"]);
  });
  it("CHOOSE-2: any file on the refused page, or a page digest equal to the outside file's, is the STOP's condition (the two files are the same size: a size test never fired, MAJOR-2); HUMAN uses the digest alone", () => {
    expect(C.outsideReached({ files: 1, bytesEqual: true })).toBe(true);
    expect(C.outsideReached({ files: 1, bytesEqual: false })).toBe(true);
    expect(C.outsideReached({ files: 0, bytesEqual: true })).toBe(true);
    expect(C.outsideReached({ files: 0, bytesEqual: null })).toBe(false);
    expect([C.outsideDigestHit({ bytesEqual: true }), C.outsideDigestHit({ bytesEqual: false }), C.outsideDigestHit({ bytesEqual: null })]).toEqual([true, false, false]);
    expect(rd("recipes/s11.ts")).toContain('["s11-1k.bin", 1024, "root"]'); // the sizes the old test could not tell apart
    expect(rd("recipes/s11.ts")).toContain('["s11-out.bin", 1024, "outside"]');
  });
  it("a STOP decision throws a StopWhy with its reason, and only a STOP does", () => {
    expect(() => C.stopWhen(true, "outside-file-reached-page", "x")).toThrow(StopWhy);
    expect(() => C.stopWhen(false, "outside-file-reached-page", "x")).not.toThrow();
    for (const r of ["dialog-not-opened", "dialog-left-open"] as const) { try { C.stopOnDialog(`STOP ${r}`, "leg a"); expect.unreachable(); } catch (e) { expect((e as StopWhy).why).toBe(r); } }
    for (const v of ["PASS", "FAIL", "NOT MEASURED"] as const) expect(() => C.stopOnDialog(v, "x")).not.toThrow();
  });
  it("the dialog legs: after-click 1, closed, nothing chosen; 0 is dialog-not-opened; a left one is dialog-left-open (and wins); no proved click is NOT MEASURED", () => {
    const ok = { before: 0, afterClick: 1, afterClose: 0, ms: 900, change: 0 };
    expect(C.judgeDialog(ok)).toBe("PASS");
    expect(C.judgeDialog({ ...ok, afterClick: 0 })).toBe("STOP dialog-not-opened");
    expect(C.judgeDialog({ ...ok, afterClose: 1 })).toBe("STOP dialog-left-open");
    expect(C.judgeDialog({ ...ok, afterClick: 0, afterClose: 1 })).toBe("STOP dialog-left-open");
    expect(C.judgeDialog({ ...ok, change: 1 })).toBe("FAIL");
    expect(C.judgeDialog({ ...ok, ms: 5_001 })).toBe("FAIL");
    expect(C.judgeDialog({ ...ok, afterClick: 0 }, false)).toBe("NOT MEASURED");
    expect(C.judgeDialog({ ...ok, afterClick: 0 }, true, false)).toBe("NOT MEASURED"); // the leg's precondition (the call's answer) was not met
    expect(C.judgeDialog({ ...ok, afterClose: 1 }, true, false)).toBe("STOP dialog-left-open"); // a dialog left is a STOP whatever else
    expect(C.judgeDialog({ ...ok, afterClick: 0, sent: false })).toBe("NOT MEASURED"); // a click never sent is the helper's, not the product's
    expect(C.parseDlg("unsent")).toEqual({ before: 0, afterClick: 0, afterClose: 0, ms: 0, sent: false });
    expect(C.parseDlg("0,1,0,812")).toEqual({ before: 0, afterClick: 1, afterClose: 0, ms: 812, sent: true });
    expect(() => C.parseDlg("0,1,0")).toThrow();
    expect(() => C.parseDlg("0,x,0,1")).toThrow();
  });
  it("CHOOSE-4's leg preconditions: (a) ok with one file, (b) TIMEOUT, (c) the single-file BAD_PARAMS text", () => {
    const e = (code: string, message = "m"): { code: string; message: string } => ({ code, message });
    expect([C.chooseLegPrecond("a", undefined, 1), C.chooseLegPrecond("a", undefined, 0), C.chooseLegPrecond("a", e("TIMEOUT"), 1)]).toEqual([true, false, false]);
    expect([C.chooseLegPrecond("b", e("TIMEOUT"), 0), C.chooseLegPrecond("b", undefined, 1), C.chooseLegPrecond("b", e("BAD_PARAMS"), 0)]).toEqual([true, false, false]);
    expect([C.chooseLegPrecond("c", e("BAD_PARAMS", C.CH_MSG.single), 0), C.chooseLegPrecond("c", e("BAD_PARAMS", "other"), 0), C.chooseLegPrecond("c", e("TIMEOUT", C.CH_MSG.single), 0)]).toEqual([true, false, false]);
  });
  it("DISARM: DISARMED exact with its data, nothing on the page, within 7 000 ms; an early end is not a failure", () => {
    const e = { code: "DISARMED", message: MSG.disarmed, data: { scope: "all" } };
    expect(C.judgeDisarm(e, 5_050, { files: 0, change: 0 })).toBe("PASS");
    expect(C.judgeDisarm(e, 1_400, { files: 0, change: 0 })).toBe("PASS");
    expect(C.judgeDisarm(e, 7_001, { files: 0, change: 0 })).toBe("FAIL");
    expect(C.judgeDisarm({ ...e, message: "x" }, 5_000, { files: 0, change: 0 })).toBe("FAIL");
    expect(C.judgeDisarm(undefined, 5_000, { files: 1, change: 1 })).toBe("FAIL");
  });
  it("LATE and HUMAN: a dialog fails LATE; `opened` needs a file or a dialog; HUMAN names the input that got the files", () => {
    expect([C.judgeLate(0), C.judgeLate(1)]).toEqual(["PASS", "FAIL"]);
    expect([C.lateOpened(0, 0), C.lateOpened(1, 0), C.lateOpened(0, 1)]).toEqual([false, true, true]);
    expect([C.humanReceived(1, 1), C.humanReceived(0, 1), C.humanReceived(0, 0)]).toEqual(["clicked-input", "call-target", "none"]);
  });
  it("KEPT: both ok, change 1 then 2, one file, and a continuous banner under a passing control; the control failing is NOT MEASURED", () => {
    expect(C.judgeKept([true, true], [1, 2], 1, "continuous", "pass")).toBe("PASS");
    expect(C.judgeKept([true, true], [1, 2], 1, "gaps:1", "pass")).toBe("FAIL");
    expect(C.judgeKept([true, true], [1, 2], 1, "continuous", "fail")).toBe("NOT MEASURED");
    expect(C.judgeKept([true, false], [1, 2], 1, "continuous", "pass")).toBe("FAIL");
    expect(C.judgeKept([true, true], [1, 1], 1, "continuous", "pass")).toBe("FAIL");
    expect(C.judgeKept([true, true], [1, 2], 2, "continuous", "pass")).toBe("FAIL");
  });
  it("KEEP-OVERLAP leg b: the first TIMEOUT exactly, the second K-devt exactly, one page click", () => {
    const first = { code: "TIMEOUT", message: C.CH_MSG.timeout };
    expect(C.judgeOverlapChooser(first, KDEVT, 1)).toBe("PASS");
    expect(C.judgeOverlapChooser(first, undefined, 1)).toBe("FAIL"); // a build that lets the second share the session
    expect(C.judgeOverlapChooser(first, KDEVT, 2)).toBe("FAIL");
    expect(C.judgeOverlapChooser({ code: "DEBUGGER_DEVTOOLS", message: "x" }, KDEVT, 1)).toBe("FAIL"); // a first call the second cancelled
    expect(C.judgeOverlapChooser(first, { code: KDEVT.code, message: "other" }, 1)).toBe("FAIL");
  });
  it("MCP: the ok form carries the name, size and digest and no directory; an error line carries its code and fixed text", () => {
    const f = { name: "s11-1k.bin", bytes: 1024, sha256: "a".repeat(64) };
    const ok = { text: `Uploaded 1 file(s) to css #in:\ns11-1k.bin \u00b7 1024 bytes \u00b7 sha256 ${f.sha256}`, isError: false };
    expect(C.judgeMcpOk(ok, f, ["C:\\wave\\root", "sentinel1"])).toBe("PASS");
    expect(C.judgeMcpOk({ ...ok, text: ok.text + " C:\\wave\\root" }, f, ["C:\\wave\\root"])).toBe("FAIL");
    expect(C.judgeMcpOk({ ...ok, text: ok.text.replace("1024", "1000") }, f, [])).toBe("FAIL");
    expect(C.judgeMcpOk({ ...ok, isError: true }, f, [])).toBe("FAIL");
    expect(C.judgeMcpErr({ text: `TIMEOUT: ${C.CH_MSG.timeout}`, isError: true }, "TIMEOUT", C.CH_MSG.timeout)).toBe("PASS");
    expect(C.judgeMcpErr({ text: "TIMEOUT: other", isError: true }, "TIMEOUT", C.CH_MSG.timeout)).toBe("FAIL");
    expect(C.judgeMcpErr({ text: "JS_DISABLED: x", isError: false }, "JS_DISABLED")).toBe("FAIL"); // not flagged and no failed line: not an error result
    // the failure-report form the MCP returns for TIMEOUT (a saved screenshot: no isError, code on line 1, `The call failed` last; mcp/src/tools/registry.ts:68-70, 332-336)
    const failed = (c: string): string => `The call failed (${c}). This result is not flagged as an error only so that the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from error results).`;
    expect(rd("mcp/src/tools/registry.ts")).toContain("The call failed (${code}). This result is not flagged as an error only so that the screenshot reaches you");
    const rep_ = { text: `TIMEOUT: ${C.CH_MSG.timeout}\nSnapshot: 3 elements\nScreenshot: x.png\n${failed("TIMEOUT")}`, isError: false };
    expect(C.judgeMcpErr(rep_, "TIMEOUT", C.CH_MSG.timeout)).toBe("PASS");
    expect(C.mcpCodeOf(rep_)).toBe("TIMEOUT");
    expect(C.judgeMcpErr({ ...rep_, text: rep_.text.replace(failed("TIMEOUT"), failed("BAD_PARAMS")) }, "TIMEOUT", C.CH_MSG.timeout)).toBe("FAIL"); // the last line names another code
    expect(C.judgeMcpErr({ ...rep_, text: rep_.text.replace(`TIMEOUT: ${C.CH_MSG.timeout}`, "TIMEOUT: other") }, "TIMEOUT", C.CH_MSG.timeout)).toBe("FAIL");
    expect(C.mcpCodeOf({ text: "Uploaded 1 file(s) to css #in:\nx", isError: false })).toBe("ok");
    expect(C.mcpCodeOf({ text: "JS_DISABLED: x", isError: true })).toBe("JS_DISABLED");
  });
});

describe("the G2 decisions", () => {
  const g: C.G2Obs = { aReplyMs: 400, bReplyMs: 950, rawGapMs: 550, holderAfterReplyMs: 480, aEffect: 1, b: "ok", a: "ok" };
  it("G2-1: B waits out the hold (>= 450), the holder is read through it, A's click landed once, B ok; no hold releases at A's reply", () => {
    expect(C.judgeG2(g)).toBe("PASS");
    expect(C.judgeG2({ ...g, rawGapMs: 449 })).toBe("FAIL");
    expect(C.judgeG2({ ...g, holderAfterReplyMs: 20, rawGapMs: 90 })).toBe("FAIL");
    expect(C.judgeG2({ ...g, aEffect: 0 })).toBe("FAIL");
    expect(C.judgeG2({ ...g, b: "LOCK_TIMEOUT" })).toBe("FAIL");
    expect(C.judgeG2({ ...g, aReplyMs: 900, bReplyMs: 800 })).toBe("FAIL");
    expect(C.judgeG2({ ...g, a: "TIMEOUT" })).toBe("FAIL"); // A's click answers ok first (MINOR-5)
    expect(C.judgeG2({ ...g, a: undefined })).toBe("FAIL");
  });
  it("the holder reading counts the unbroken polls of A's name from A's reply", () => {
    const p = [{ t: 90, h: "a" }, { t: 120, h: "a" }, { t: 170, h: "a" }, { t: 520, h: "a" }, { t: 570, h: undefined }, { t: 620, h: "a" }];
    expect(C.holderAfterMs(p, "a", 100)).toBe(420);
    expect(C.holderAfterMs(p, "a", 575)).toBe(45);
    expect(C.holderAfterMs([{ t: 150, h: "b" }], "a", 100)).toBe(0);
  });
  it("G2-2 round: the text complete, at least 3 B calls all ok, none sent after A's send replying before A's reply + 450, A read as holder", () => {
    const r: C.TypeRound = { got: 40, aSentAt: 1000, aReplyAt: 1300, aOk: true, holderSeen: true, calls: [{ sentAt: 1030, replyAt: 1800, code: "ok" }, { sentAt: 1800, replyAt: 2100, code: "ok" }, { sentAt: 2100, replyAt: 2400, code: "ok" }] };
    expect(C.judgeTypeRound(r)).toBe("PASS");
    expect(C.judgeTypeRound({ ...r, got: 39 })).toBe("FAIL");
    expect(C.judgeTypeRound({ ...r, calls: r.calls.slice(0, 2) })).toBe("FAIL");
    expect(C.judgeTypeRound({ ...r, calls: [{ sentAt: 1030, replyAt: 1400, code: "ok" }, ...r.calls.slice(1)] })).toBe("FAIL"); // a capture served inside the hold
    expect(C.judgeTypeRound({ ...r, calls: [{ sentAt: 900, replyAt: 1400, code: "ok" }, ...r.calls.slice(1)] })).toBe("PASS"); // a call already holding the lock before A's send is not in the set
    expect(C.judgeTypeRound({ ...r, calls: [{ sentAt: 1030, replyAt: 1800, code: "LOCK_TIMEOUT" }, ...r.calls.slice(1)] })).toBe("FAIL");
    expect(C.judgeTypeRound({ ...r, holderSeen: false })).toBe("FAIL");
    expect(C.G2_TEXT).toHaveLength(40);
    expect([C.gotOf(C.G2_TEXT), C.gotOf("abc"), C.gotOf(C.G2_TEXT.slice(1))]).toEqual([40, 3, 39]);
  });
});

describe("each row's wants are the sheet's clauses, and each row uses its want", () => {
  const rowText = (id: string): string => { const m = new RegExp(`^\\| ${id} [^\\n]*$`, "m").exec(SEC); expect(m, id).not.toBeNull(); return m![0]; };
  const frag = (w: C.ChooseWant | Omit<C.ChooseWant, "answer">): string[] => {
    const o: string[] = [];
    if (w.files !== undefined) o.push(`files=${w.files}`);
    if (w.change !== undefined) o.push(`change=${w.change}`);
    if (w.clicks !== undefined) o.push(`clicks=${w.clicks}`);
    if (w.bytesEqual !== undefined) o.push(`bytes-equal=${w.bytesEqual === null ? "n/a" : w.bytesEqual ? "yes" : "no"}`);
    return o;
  };
  it("CHOOSE-1, LABEL, REFUSE, 2, 3, DISARM and JSOFF: every key of the want is in its row's expected text, and the answer code too", () => {
    const rows: Array<[string, C.ChooseWant | Omit<C.ChooseWant, "answer">, string | undefined]> = [
      ["R19-CHOOSE-1", C.WANT.choose1, "ok"], ["R19-CHOOSE-LABEL", C.WANT.label.label, "ok"], ["R19-CHOOSE-LABEL", C.WANT.label.input, "ok"], ["R19-CHOOSE-LABEL", C.WANT.label.multi, "ok"],
      ["R19-CHOOSE-REFUSE", C.WANT.refuse, "BAD_PARAMS"], ["R19-CHOOSE-2", C.WANT.choose2, undefined], ["R19-CHOOSE-3", C.WANT.choose3, "TIMEOUT"], ["R19-CHOOSE-DISARM", C.WANT.disarm, "DISARMED"], ["R19-CHOOSE-JSOFF", C.WANT.jsoff, "JS_DISABLED"],
    ];
    for (const [id, w, a] of rows) {
      const t = rowText(id) + (id === "R19-CHOOSE-LABEL" ? rowText("R19-CHOOSE-1") : ""); // LABEL: "As R19-CHOOSE-1 per leg"
      for (const f of frag(w)) expect(t, `${id} ${f}`).toContain(f);
      if (a) expect(t, `${id} ${a}`).toContain(a);
      if ((w as C.ChooseWant).answer !== undefined) expect((w as C.ChooseWant).answer).toBe(a);
    }
    // the wants that differ between rows differ here (a want copied from the next row fails one of these)
    expect([C.WANT.choose3.clicks, C.WANT.choose2.clicks, C.WANT.jsoff.clicks, C.WANT.refuse.clicks, C.WANT.choose1.clicks]).toEqual([1, 0, 0, 1, 1]);
    expect(C.WANT.label.multi.files).toBe(2);
    expect(rowText("R19-CHOOSE-JSOFF")).toContain("clicks=0");
    expect(rowText("R19-CHOOSE-3")).not.toContain("clicks=0");
    expect(rowText("R19-CHOOSE-2")).not.toContain("clicks=1");
  });
  it("REFUSE: the four pages carry their own exact texts, in the sheet's order, each in the sheet's row", () => {
    expect(C.REFUSE_LEGS).toEqual([["picker", C.CH_MSG.noInput], ["single", C.CH_MSG.single], ["dir", C.CH_MSG.dir], ["dis", C.CH_MSG.dis]]);
    const t = rowText("R19-CHOOSE-REFUSE");
    for (const [q, m] of C.REFUSE_LEGS) { expect(t, q).toContain(`s12=${q}`); expect(t, q).toContain(m); }
    expect(new Set(C.REFUSE_LEGS.map((l) => l[1])).size).toBe(4);
  });
  const body = (name: string): string => { const i = TS.indexOf(`async function ${name}(`); expect(i, name).toBeGreaterThan(-1); const j = TS.indexOf("\nasync function ", i + 10); return TS.slice(i, j < 0 ? undefined : j); };
  it("each chooser row judges against its WANT entry (no inline want), and JSOFF and DISARM use their own refusal text", () => {
    const uses: Array<[string, string]> = [["choose1", "WANT.choose1"], ["chooseLabel", "WANT.label[label]"], ["chooseRefuse", "WANT.refuse"], ["choose2", "...WANT.choose2"], ["choose3", "WANT.choose3"], ["chooseDisarm", "WANT.disarm"], ["chooseJsoff", "WANT.jsoff"]];
    for (const [fn, w] of uses) expect(body(fn), fn).toContain(w);
    expect(TS).not.toMatch(/judgeChoose\([^)]*, \{ answer:/);
    expect(body("chooseRefuse")).toContain("REFUSE_LEGS");
    expect(body("chooseJsoff")).toContain("MSG.jsOff");
    expect(body("chooseJsoff")).not.toContain("MSG.disarmed");
    expect(body("chooseDisarm")).toContain("MSG.disarmed");
    expect(body("chooseDisarm")).not.toContain("MSG.jsOff");
  });
  // MINOR-1 of S7-drivers-C's verifier 2: a want overridden at a call site (a spread followed by another key, a replaced argument) must turn this red.
  it("every judgeChoose and wantOf call site passes exactly its allowed arguments (M1a2, M1b2, M1c2)", () => {
    const args = (name: string): string[] => { const out: string[] = []; for (const m of TS.matchAll(new RegExp(`\\b${name}\\(`, "g"))) { let d = 1, j = m.index! + m[0].length; while (d && j < TS.length) { const ch = TS[j++]; if (ch === "(") d++; else if (ch === ")") d--; } out.push(TS.slice(m.index! + m[0].length, j - 1)); } return out; };
    expect(args("judgeChoose")).toEqual(["o.obs, WANT.choose1", "o.obs, WANT.label[label]", "o.obs, WANT.refuse", "lines[i]!.obs, { ...WANT.choose2, answer: c[3].code }", "o.obs, WANT.choose3", "o.obs, WANT.disarm", "o.obs, WANT.jsoff"]);
    expect(args("wantOf")).toEqual(['"DISARMED", MSG.disarmed, "keys:scope"', '"BAD_PARAMS", message', 'K["K-gate"].code, K["K-gate"].message', '"BAD_PARAMS", CH_MSG.missing', 'K["K-noacc"].code, K["K-noacc"].message', '"TIMEOUT", CH_MSG.timeout', '"DISARMED", MSG.disarmed, "keys:scope"', '"JS_DISABLED", MSG.jsOff']);
    expect(body("chooseRefuse")).toContain("for (const [i, [q, message]] of REFUSE_LEGS.entries())"); // REFUSE's `message` is the leg's own text from REFUSE_LEGS
  });
  // MINOR-1 of S7-helpers-e's verifier (M1d, M1f): the expression around a wantOf call is pinned too, and the WANT table is never mutated in place.
  it("each observe call's want is exactly a wantOf(...) (or the leg's own c[3]) and nothing wraps it; WANT is never assigned into (M1d, M1f)", () => {
    const wants = [...TS.matchAll(/\{ want: /g)].map((m) => { const r = TS.slice(m.index! + m[0].length); if (!r.startsWith("wantOf(")) return r.slice(0, 8); let d = 1, k = 7; while (d && k < r.length) { const ch = r[k++]; if (ch === "(") d++; else if (ch === ")") d--; } return r.slice(k, k + 7); });
    expect(wants).toEqual([", dlg: ", "c[3], su", ", dlg: ", ", dlg: ", ", dlg: "]);
    expect(TS).not.toMatch(/Object\.(assign|defineProperty|defineProperties|setPrototypeOf)\(/);
    expect(TS).not.toMatch(/(?<!const )\bWANT\b[\w.\[\]"]*\s*([-+*/|&?]{0,2}=)(?![=>])/);
  });
  it("a STOP is thrown in one place and every STOP decision calls it: no `new StopWhy` elsewhere, no printed STOP line, the call sites are all there", () => {
    expect([...TS.matchAll(/new StopWhy\(/g)]).toHaveLength(1);
    expect(TS).not.toMatch(/say\([`"]STOP(?!:)/);
    expect([...TS.matchAll(/stopOnDialog\(v, /g)]).toHaveLength(2);
    expect(body("choose4")).toContain("stopOnDialog(v,");
    expect(body("chooseDisarm")).toContain("stopOnDialog(v,");
    expect(body("choose2")).toContain('stopWhen(outsideReached(lines[0]!.rep), "outside-file-reached-page"');
    expect(body("chooseHuman")).toContain('stopWhen(outsideDigestHit(pg), "outside-file-reached-page"');
    expect([...TS.matchAll(/stopWhen\([^\n]*"existing-tool-changed"/g)]).toHaveLength(2);
    for (const r of [...TS.matchAll(/stopWhen\([^\n]*?, "([a-z-]+)"/g)].map((m) => m[1]!)) expect(STOP_REASONS as readonly string[], r).toContain(r);
  });
  it("CHOOSE-2 opens the outside leg on a page with the outside file's digest; HUMAN's page gets it from PowerShell; LATE prints the page's own key; the watch outlasts the click's lead", () => {
    expect(body("choose2")).toContain('sumOf(s, "s11-out.bin")');
    expect(body("chooseHuman")).toContain("rep(x.c, t.handle, true)");
    expect(body("chooseLate")).toContain("late=${pg.late}");
    expect(C.LATE_WATCH_MS).toBeGreaterThanOrEqual(8_000 + 1_500);
    expect(Number(/Watch-R19Dialogs (\d+)/.exec(PSC.slice(PSC.indexOf("function Invoke-R19ChooseLate")))![1])).toBe(C.LATE_WATCH_MS);
  });
});

describe("the sheet's forms and texts", () => {
  const tpl = (n: number): string => { const i = SEC.indexOf(`(${n}) \``, SEC.indexOf("**Line forms (part B).**")); return SEC.slice(i + 6, SEC.indexOf("`", i + 6)); };
  it("the actor prints every form by key, in the sheet's order", () => {
    expect(keys(chooseLine("R19-CHOOSE-1", "sdk", OBS))).toEqual(keys(tpl(21)));
    expect(keys(dialogLine("R19-CHOOSE-4", { leg: "a", before: 0, afterClick: 1, afterClose: 0, ms: 1, change: 0 }))).toEqual(keys(tpl(22)));
    expect(keys(lateLine("R19-CHOOSE-LATE", { openerMs: 4900, opened: false, dialog: 0 }))).toEqual(keys(tpl(23)));
    expect(keys(humanLine("R19-CHOOSE-HUMAN", { received: "none", dialog: 0, files: 0 }))).toEqual(keys(tpl(24)));
    expect(keys(g2Line("R19-G2-1", { aReplyMs: 1, bReplyMs: 2, gapMs: 1, holderAfterReplyMs: 1, aEffect: 1, b: "ok" }))).toEqual(keys(/`(G2 R19[^`]*)`/.exec(SEC.replace(/<row>/g, "R19-G2-1"))?.[1] ?? tpl(26).replace("<row>", "R19-G2-1")));
    expect(keys(g2typeLine({ round: 1, got: 40, bCalls: 3, bOk: 3, bLockTimeout: 0 }))).toEqual(keys(/`(G2TYPE [^`]*)`/.exec(SEC)![1]!));
  });
  it("the refusal texts are the product's constants and the sheet's", () => {
    const up = rd("extension/src/upload-files.ts") + rd("extension/src/content/upload-target.ts") + rd("extension/src/upload-exists.ts");
    for (const t of [C.CH_MSG.noInput, C.CH_MSG.single, C.CH_MSG.dir, C.CH_MSG.dis, C.CH_MSG.timeout]) expect(up, t.slice(0, 30)).toContain(t);
    expect(rd("extension/test/s0f-upload-exists.test.ts")).toContain(C.CH_MSG.missing);
    for (const t of [C.CH_MSG.timeout, C.CH_MSG.noInput, C.CH_MSG.single, C.CH_MSG.missing]) expect(SEC, t.slice(0, 30)).toContain(t);
    expect(SEC).toContain("the file input is disabled");
  });
});

// ---- the PowerShell side, every helper stubbed (the step runner and Invoke-R19Row honour steps, -Restore and R19Changed as the real ones do) --------------------
const STUBS = `
$global:R19Slice = 'liveC19'; $global:S16Stops = 0; $global:S16Changed = $false; $global:W = 7; $global:R19Xk = 55; $global:O = 0; $global:D = 0; $global:R19Changed = $false; $global:S16Toggle = 'on'
$global:Calls = New-Object System.Collections.ArrayList; $global:NodeOut = @(); $global:RowThrows = $false; $global:Cnt = @{ '7' = 0; '55' = 0 }; $global:Stuck = $false; $global:Opened = 1; $global:ClickOk = $true; $global:DevT = 0
$global:R19HumanClick = $true; $global:R19McpLegs = @(); $global:NodeRc = 0; $Dash = [char]0x2014; $R19DeferRe = '^$^'; $global:V = 'PASS'
function C([string]$m) { [void]$global:Calls.Add($m) }
function Say9([string]$m) { C "SAY:$m" }
function Save-S16 { }
function Stop-R19([string]$Reason, [string]$Why) { C "STOP:$Reason"; throw "stop $Reason" }
function Stop-R19Actor([string]$Id, [string[]]$Out) { C "ACTORSTOP:$($Id)"; throw 'actor stop' }
function Test-S9Live { $true }
function Get-S12DialogCount([long]$h) { [int]$global:Cnt["$h"] }
function Close-S12Dialog([long]$h) { C "CLOSE:$h"; if ($global:Stuck) { $global:S16Stops++ } else { $global:Cnt["$h"] = 0 }; [pscustomobject]@{ Closed = (-not $global:Stuck); Ms = 321 } }
function Wait-S12DialogOpen([long]$h, [int]$m) { if ($global:Opened) { $global:Cnt["$h"] = 1 }; [int]$global:Cnt["$h"] }
function Invoke-S12HumanClick([long]$h) { C "CLICK:$h"; $global:ClickOk }
function Get-S12NowMs { [long]([DateTime]::UtcNow.Ticks / 10000) }
function Close-R19Xk { C 'CLOSEX' }
function Open-R19Xk([string]$u) { C "OPENX:$u" }
function Get-R19CtlWord { 'pass' }
function Switch-R19Toolbar { C "TB:$($args[0])" }
function Set-R19JsOff { C 'JSOFF' }
function Restore-R19Js { C 'JSON' }
function Set-S11Front([long]$h, [string]$w) { C "FRONT:$w"; $true }
function Invoke-R19Steps([object[]]$s) {
  if ($global:RowThrows -and -not @($s | Where-Object { $_.k -eq 'do' }).Count) { throw 'the actor died' }
  foreach ($st in $s) {
    if ($st.k -eq 'do') { $global:R19Changed = $true; [void](& $st.f); if ($global:RowThrows) { throw 'the actor died' } }
    elseif ($st.k -eq 'undo') { [void](& $st.f); $global:R19Changed = $false }
    elseif ($st.k -eq 'val') { [void](& $st.f) }
  }
}
function New-R19Steps([string]$Id, [string]$Sampler, [scriptblock]$Do, [scriptblock]$Undo) { $l = @(@{ k = 'do'; id = $Id; f = $Do }); if ($Sampler) { $l += @{ k = 's'; id = $Sampler } }; $l += @{ k = 'undo'; id = $Id; f = $Undo }; , $l }
function Complete-R19Row([string]$Id, [string[]]$Lines) { C "COMPLETE:$($Id):$($Lines -join '|')" }
function Invoke-R19Node { C "NODE:$($args[0]):$(@($args[1])[0])"; C "ARGS:$(@($args[1]) -join ' ')"; $global:R17Out = @($global:NodeOut); if ($args.Count -gt 2 -and $args[2] -is [scriptblock]) { [void](& $args[2]) }; $global:NodeRc }
function Invoke-R19Row([string]$Id, [string[]]$Cmd, [object[]]$StepList = @(), [scriptblock]$Restore = $null, [string]$Banner = '', [string]$Why = '', [string]$Actor = 's12-r19-a', [int]$BudgetS = 300) {
  C "ROW:$($Id):$($Cmd -join ' '):steps=$(($StepList | ForEach-Object { $_.k.Substring(0,1) }) -join '')"
  $global:R19Changed = $false
  try { if ($StepList.Count) { Invoke-R19Steps $StepList }; if ($global:RowThrows) { throw 'the actor died' } }
  finally { if ($Restore -and $global:R19Changed) { & $Restore; $global:R19Changed = $false } }
}
`;
const REAL_A = join(REPO, "recipes", "s12-r19-a.ps1").replace(/'/g, "''");
const OUTSUM = createHash("sha256").update(Buffer.from([1, 2, 3])).digest("hex");
const F = (names: string): string => `$(($global:Calls | Where-Object { $_ -match '^(${names})' }) -join ',')`;
const ROWS: Array<[string, string, boolean]> = [["Choose1", "Invoke-R19Choose1", true], ["ChooseLabel", "Invoke-R19ChooseLabel", true], ["ChooseRefuse", "Invoke-R19ChooseRefuse", true], ["Choose2", "Invoke-R19Choose2", true], ["Choose3", "Invoke-R19Choose3", true], ["ChooseKept", "Invoke-R19ChooseKept", true],
  ["ChooseFrame", "Invoke-R19ChooseFrame", true], ["KeepOverlapB", "Invoke-R19KeepOverlapB", true], ["Choose4", "Invoke-R19Choose4", true], ["ChooseDisarm", "Invoke-R19ChooseDisarm", true], ["ChooseLate", "Invoke-R19ChooseLate", true], ["ChooseHuman", "Invoke-R19ChooseHuman", true],
  ["ChooseJsoff", "Invoke-R19ChooseJsoff", true], ["G2", "Invoke-R19G2 'R19-G2-1' 'g2-1'", true], ["McpLegs", "Invoke-R19McpLegs", false], ["McpD", "Invoke-R19McpD", false]];
const SCEN = `
function Get-R19DevToolsCount { [int]$global:DevT }   # after c.ps1 is loaded: its own would enumerate real windows
$p19dir = Join-Path $env:TEMP 's12r19c-out'; New-Item -ItemType Directory -Force "$p19dir\\wave\\outside" | Out-Null; [IO.File]::WriteAllBytes("$p19dir\\wave\\outside\\s11-out.bin", [byte[]](1,2,3)); $env:S11_OUT = $p19dir
$global:Cnt['7'] = 1; $global:Cnt['55'] = 1
$r = Close-R19Dialogs; Write-Host "P1 closed=$r calls=$(($global:Calls) -join ',')"
$global:Calls.Clear(); $r = Close-R19Dialogs; Write-Host "P2 none=$r calls=$(($global:Calls) -join ',')"
$global:Cnt['55'] = 2; $global:Stuck = $true; $global:Calls.Clear(); try { [void](Close-R19Dialogs) } catch { }; Write-Host "P3 stuck=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:Stuck = $false; $global:Cnt['55'] = 0; $global:Calls.Clear(); Write-Host "P4 human=$(Invoke-R19HumanDialog 55) calls=$(($global:Calls) -join ',')"
$global:Opened = 0; $global:Cnt['55'] = 0; $global:Calls.Clear(); Write-Host "P5 not-opened=$(Invoke-R19HumanDialog 55) calls=$(($global:Calls) -join ',')"
$global:Opened = 1
$global:Calls.Clear(); $global:R19HumanClick = $false; Invoke-R19Choose4; Invoke-R19ChooseHuman
Write-Host "P6 no-human=$(($global:Calls) -join ',')"
$global:R19HumanClick = $null; $global:Calls.Clear(); Invoke-R19Choose4
Write-Host "P7 unproved=$(($global:Calls) -join ',')"
$global:R19HumanClick = $true; $global:Calls.Clear(); Invoke-R19Choose4
Write-Host "P8 four=${F("ROW:")}"; Write-Host "P8b clicks=${F("CLICK:")}"
foreach ($t in @(${ROWS.map(([n, f, x]) => `@{ n = '${n}'; f = { ${f} }; x = $${x} }`).join(", ")})) { $global:Calls.Clear(); $global:Cnt['7'] = 1; $global:Cnt['55'] = 1; $global:RowThrows = $true; try { & $t.f } catch { }; Write-Host "P9 $($t.n) x=$($t.x) closes=$(($global:Calls | Where-Object { $_ -like 'CLOSE*' }) -join ',')" }
$global:RowThrows = $false; $global:Cnt['7'] = 0; $global:Cnt['55'] = 0
$global:Calls.Clear(); Invoke-R19Choose1; Invoke-R19ChooseDisarm; $global:R19HumanClick = $false; Invoke-R19ChooseDisarm; Invoke-R19ChooseJsoff; Invoke-R19ChooseKept; Invoke-R19Choose2; Invoke-R19ChooseLate; Invoke-R19G2 'R19-G2-1' 'g2-1'
Write-Host "P10 rows=${F("ROW:")}"
$global:R19HumanClick = $true
$global:Calls.Clear(); $global:NodeOut = @('LEG R19-CHOOSE-MCP a PASS', 'LEG R19-CHOOSE-MCP c PASS'); Invoke-R19McpLegs
Write-Host "P11 legs=${F("NODE:|COMPLETE:")} held=$(@($global:R19McpLegs).Count)"
$global:Calls.Clear(); $global:NodeOut = @('LEG R19-CHOOSE-MCP d PASS'); Invoke-R19McpD
Write-Host "P12 d=${F("COMPLETE:")}"
$global:NodeRc = 2; $global:Calls.Clear(); try { Invoke-R19McpLegs } catch { }
Write-Host "P13 stop=${F("ACTORSTOP:")}"
$global:NodeRc = 0; $global:NodeOut = @()
$global:ClickOk = $false; $global:Calls.Clear(); Write-Host "P14 unsent=$(Invoke-R19HumanDialog 55) calls=$(($global:Calls) -join ',')"; $global:ClickOk = $true
$global:Stuck = $true; $global:Cnt['55'] = 0; $global:Calls.Clear(); try { [void](Invoke-R19HumanDialog 55) } catch { }; Write-Host "P15 human-stuck=${F("STOP:")}"; $global:Stuck = $false; $global:Cnt['55'] = 0
$global:Calls.Clear(); Write-R19Dialogs; Write-Host "P16 line=${F("ARGS:")}"
$global:Cnt['7'] = 1; $global:Calls.Clear(); try { Write-R19Dialogs } catch { }; Write-Host "P17 native=${F("ARGS:|STOP:")}"; $global:Cnt['7'] = 0
$global:DevT = 2; $global:Calls.Clear(); try { Write-R19Dialogs } catch { }; Write-Host "P18 devtools=${F("ARGS:|STOP:")}"; $global:DevT = 0
$global:Calls.Clear(); Invoke-R19ChooseDisarm; Write-Host "P19a disarm=${F("TB:|CLICK:")}"
$global:Calls.Clear(); $global:RowThrows = $true; try { Invoke-R19ChooseDisarm } catch { }; Write-Host "P19b disarm-died=${F("TB:")}"
$global:RowThrows = $false; $global:Calls.Clear(); Invoke-R19ChooseJsoff; Write-Host "P19c jsoff=${F("JSOFF|JSON")}"
$global:RowThrows = $true; $global:Calls.Clear(); try { Invoke-R19ChooseJsoff } catch { }; Write-Host "P19d jsoff-died=${F("JSOFF|JSON")}"
$global:Calls.Clear(); try { Invoke-R19McpD } catch { }; Write-Host "P19e mcpd-died=${F("JSOFF|JSON")}"
$global:RowThrows = $false; $global:Calls.Clear(); Invoke-R19McpD; Write-Host "P19f mcpd=${F("JSOFF|JSON")}"
$global:Calls.Clear(); Invoke-R19G2 'R19-G2-1' 'g2-1'; Write-Host "P20 g2=${F("FRONT:|ROW:")}"
$global:Calls.Clear(); Invoke-R19ChooseHuman; Write-Host "P21 open=${F("OPENX:")}"
$env:S11_OUT = Join-Path $env:TEMP 's12r19c-none'; New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null; $global:Calls.Clear(); try { Invoke-R19ChooseHuman } catch { }; Write-Host "P22 no-out=${F("STOP:")}"
$ast = [Management.Automation.Language.Parser]::ParseFile('${REAL_A}', [ref]$null, [ref]$null)
$fn = $ast.Find({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Complete-R19Row' }, $true)
. ([scriptblock]::Create($fn.Extent.Text.Replace('Complete-R19Row', 'Complete-R19RowReal')))
function Get-R19Verdict { $global:V }
function Write-R19RowLine([string]$i, [string]$v) { Write-Host "ROWLINE $i $v" }
function Show-S16 { }
foreach ($t in @(@('R19-CHOOSE-FRAME', 'PASS'), @('R19-CHOOSE-FRAME', 'FAIL'), @('R19-CHOOSE-HUMAN', 'PASS'), @('R19-CHOOSE-1', 'PASS'))) { $global:V = $t[1]; Complete-R19RowReal $t[0] @() }
`;
function scriptFor(psc: string): string {
  const d = mkdtempSync(join(tmpdir(), "s12r19c-"));
  const fc = join(d, "c.ps1"), f = join(d, "t.ps1");
  writeFileSync(fc, psc, "utf8");
  writeFileSync(f, `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n${STUBS}\n. '${fc.replace(/'/g, "''")}'\n${SCEN}`, "utf8");
  return f;
}
const PSARGS = (f: string): string[] => ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", f];
function runPs(psc: string): string[] {
  const r = spawnSync("powershell.exe", PSARGS(scriptFor(psc)), { encoding: "utf8", timeout: 120_000 });
  if (process.env.R19DBG) console.log(r.stdout, r.stderr);
  return r.stdout.split(/\r?\n/);
}
const runPsAsync = (psc: string): Promise<string[]> => new Promise((res) => execFile("powershell.exe", PSARGS(scriptFor(psc)), { encoding: "utf8", timeout: 240_000 }, (_e, out) => res(String(out).split(/\r?\n/))));
function mutate(src: string, from: string, to: string): string {
  expect(src.includes(from), `the mutated text exists: ${from.slice(0, 40)}`).toBe(true);
  const m = src.replace(from, () => to);
  const d = mkdtempSync(join(tmpdir(), "s12r19cm-")), f = join(d, "m.ps1");
  writeFileSync(f, m, "utf8");
  expect(spawnSync("powershell.exe", ["-NoProfile", "-Command", `$e = $null; $t = $null; [void][Management.Automation.Language.Parser]::ParseFile('${f.replace(/'/g, "''")}', [ref]$t, [ref]$e); $e.Count`], { encoding: "utf8" }).stdout.trim(), "the mutant parses").toBe("0");
  return m;
}
const NM = `NOT MEASURED — the human-style click opens no dialog`;
const EXACT: Record<string, string> = {
  P1: "P1 closed=2 calls=CLOSE:7,CLOSE:55", P2: "P2 none=0 calls=", P3: "P3 stuck=STOP:dialog-left-open", P4: "P4 human=0,1,0,321 calls=CLICK:55,CLOSE:55", P5: "P5 not-opened=0,0,0,0 calls=CLICK:55",
  P6: `P6 no-human=SAY:ROW R19-CHOOSE-4 ${NM},SAY:ROW R19-CHOOSE-HUMAN ${NM}`, P7: `P7 unproved=SAY:ROW R19-CHOOSE-4 ${NM}`, P8: "P8 four=ROW:R19-CHOOSE-4:choose-4 --human yes:steps=dvdvdv", P8b: "P8b clicks=CLICK:55,CLICK:55,CLICK:55",
  P11: "P11 legs=NODE:s12-r19-c:choose-mcp held=2", P12: "P12 d=COMPLETE:R19-CHOOSE-MCP:LEG R19-CHOOSE-MCP a PASS|LEG R19-CHOOSE-MCP c PASS|LEG R19-CHOOSE-MCP d PASS", P13: "P13 stop=ACTORSTOP:R19-CHOOSE-MCP",
  P14: "P14 unsent=unsent calls=CLICK:55", P15: "P15 human-stuck=STOP:dialog-left-open", P16: "P16 line=ARGS:dialogs --slice liveC19 --native 0 --devtools 0 --windows 1",
  P17: "P17 native=ARGS:dialogs --slice liveC19 --native 1 --devtools 0 --windows 1,STOP:dialog-left-open", P18: "P18 devtools=ARGS:dialogs --slice liveC19 --native 0 --devtools 2 --windows 1,STOP:devtools-left-open",
  P19a: "P19a disarm=TB:False,TB:True,CLICK:55", P19b: "P19b disarm-died=TB:True", P19c: "P19c jsoff=JSOFF,JSON", P19d: "P19d jsoff-died=JSOFF,JSON", P19e: "P19e mcpd-died=JSOFF,JSON", P19f: "P19f mcpd=JSOFF,JSON",
  P20: "P20 g2=FRONT:R19-G2-1,ROW:R19-G2-1:g2-1:steps=d", P21: `P21 open=OPENX:http://127.0.0.1:8081/s12-chooser.html?s12=human&s12x=human#sum=${OUTSUM}`, P22: "P22 no-out=STOP:throw-after-state",
};
/** True when the run's output holds the key's expected line (P9: every row's closer ran on the wave's windows, and on X where it opened one). */
function holds(out: string[], key: string): boolean {
  if (key.startsWith("P9:")) { const l = out.find((x) => x.startsWith(`P9 ${key.slice(3)} `)) ?? ""; const x = ROWS.find((r) => r[0] === key.slice(3))![2]; return l.includes("CLOSE:7") && l.includes("CLOSE:55") && (!x || l.includes("CLOSEX")); }
  return out.includes(EXACT[key]!);
}

describe.skipIf(!hasPs)("liveC19's drivers, with stubbed helpers", () => {
  const real = hasPs ? runPs(PSC) : [];
  it("every check line holds on the real file", () => { for (const k of [...Object.keys(EXACT), ...ROWS.map((r) => `P9:${r[0]}`)]) expect(holds(real, k), k).toBe(true); }, 90_000);
  it("the step lists follow the actor's order (CHOOSE-1: sampler then two counts; DISARM: open, off, on, count, then the click only when proved)", () => {
    const p10 = real.find((l) => l.startsWith("P10 "))!;
    for (const w of ["ROW:R19-CHOOSE-1:choose-1:steps=svv,", "ROW:R19-CHOOSE-DISARM:choose-disarm --human yes:steps=dduvv,", "ROW:R19-CHOOSE-DISARM:choose-disarm --human no:steps=dduv,", "ROW:R19-CHOOSE-JSOFF:choose-jsoff:steps=dsuv,", "ROW:R19-CHOOSE-KEPT:choose-kept:steps=tv,", "ROW:R19-CHOOSE-2:choose-2 --toggle on:steps=sv,", "ROW:R19-CHOOSE-LATE:choose-late:steps=dvdv,"]) expect(p10, w).toContain(w);
    expect(p10).toMatch(/ROW:R19-G2-1:g2-1:steps=d$/);
  });
  it("RECORD rows print RECORD unless a clause failed; every other row keeps its verdict", () => {
    expect(real.filter((l) => l.startsWith("ROWLINE "))).toEqual(["ROWLINE R19-CHOOSE-FRAME RECORD", "ROWLINE R19-CHOOSE-FRAME FAIL", "ROWLINE R19-CHOOSE-HUMAN RECORD", "ROWLINE R19-CHOOSE-1 PASS"]);
  });
  // each mutant of a restore, a closer, a STOP or a click's window must turn its own check red (the verifier's five kinds)
  const MUT: Array<[string, string, string, string[]]> = [
    ["the closer is not run on the windows", "[void](Close-S12Dialog $r19h)", "", ["P1"]],
    ["a dialog left is not a STOP", "Stop-R19 'dialog-left-open' 'a native file dialog was left open after the closer'", "Say9 'left'", ["P3"]],
    ["the human step closes without a dialog", "if ($r19a -gt 0) {", "if ($true) {", ["P5"]],
    ["the human step reads the count before the click", "$r19a = [int](Wait-S12DialogOpen $Hwnd 3000)", "$r19a = [int](Get-S12DialogCount $Hwnd)", ["P4"]],
    ["the human step's STOP is a bare throw", "Stop-R19 'dialog-left-open' 'the closer left a native dialog open'", "throw 'x'", ["P15"]],
    ["the human step sends no sentinel for an unsent click", "if (-not (@(Invoke-S12HumanClick $Hwnd)[-1] -eq $true)) { return 'unsent' }", "[void](Invoke-S12HumanClick $Hwnd)", ["P14"]],
    ["the closer is skipped when a row fails", "finally { [void](Close-R19Dialogs); Close-R19Xk }", "finally { Close-R19Xk }", ["P9:Choose3", "P9:Choose1", "P9:KeepOverlapB"]],
    ["the MCP legs' finally drops the closer", "finally { [void](Close-R19Dialogs) }", "finally { }", ["P9:McpLegs"]],
    ["MCP leg d's finally drops the closer", "[void](Close-R19Dialogs) }\n  $r19o", "}\n  $r19o", ["P9:McpD"]],
    ["MCP leg d's finally drops the JS restore", "finally { if ($global:R19Changed) { Restore-R19Js; $global:R19Changed = $false }; ", "finally { ", ["P19e"]],
    ["an unproved click is not gated", "function Test-R19HumanOk { $global:R19HumanClick -eq $true }", "function Test-R19HumanOk { $global:R19HumanClick -ne $false }", ["P7"]],
    ["the click step aims at window W", "f = { Invoke-R19HumanDialog $global:R19Xk }", "f = { Invoke-R19HumanDialog $global:W }", ["P8b"]],
    ["DISARM skips the re-arm", ", @{ k = 'undo'; id = \"$r19R-off\"; f = { Switch-R19Toolbar $true } })\n", ")\n", ["P19a"]],
    ["DISARM's restore does not re-arm", "-Restore { Switch-R19Toolbar $true; [void](Close-R19Dialogs); Close-R19Xk }", "-Restore { [void](Close-R19Dialogs); Close-R19Xk }", ["P19b"]],
    ["JSOFF has no restore", "-StepList $r19l -Restore { Restore-R19Js } -Banner refused", "-StepList $r19l -Banner refused", ["P19d"]],
    ["JSOFF's steps do not restore", "{ Set-R19JsOff } { Restore-R19Js })) + @((New-R19Dlg $r19R 1))", "{ Set-R19JsOff } { })) + @((New-R19Dlg $r19R 1))", ["P19c"]],
    ["MCP leg d prints no ROW", "Complete-R19Row $r19R (@($global:R19McpLegs) + $r19o)", "", ["P12"]],
    ["MCP legs a-c print a ROW", "$global:R19McpLegs = @($global:R17Out)\n", "$global:R19McpLegs = @($global:R17Out); Complete-R19Row 'R19-CHOOSE-MCP' $global:R19McpLegs\n", ["P11"]],
    ["the MCP actor's STOP is dropped", "if ($r19rc -eq 2) { Stop-R19Actor 'R19-CHOOSE-MCP' $global:R19McpLegs }", "", ["P13"]],
    ["G2 opens B's tab without bringing W to the front", "  [void](Set-S11Front $global:W $Id)", "", ["P20"]],
    ["HUMAN's page has no digest to compare", "human&s12x=human$(Get-R19OutSumFrag)", "human&s12x=human", ["P21"]],
    ["the DIALOGS line is not printed", "[void](Invoke-R19Node 's12-r19-c' @('dialogs'", "[void](Get-R19CtlWord @('dialogs'", ["P16"]],
    ["a DevTools window left is not a STOP", "Stop-R19 'devtools-left-open' 'a DevTools window is still open at the slice end'", "Say9 'x'", ["P18"]],
  ];
  // the mutants' scenarios run in parallel (one PowerShell each, about 20 s alone)
  let outs: string[][] = [];
  beforeAll(async () => { outs = await Promise.all(MUT.map(([, from, to]) => runPsAsync(mutate(PSC, from, to)))); }, 280_000);
  for (const [i, [what, , , keys]] of MUT.entries()) {
    it(`mutant "${what}" turns ${keys.join(", ")} red`, () => { for (const k of keys) expect(holds(outs[i]!, k), k).toBe(false); });
  }
});

// ---- the static checks: every liveC19 row has a registered driver ----------------------------------------------------------------------------------
describe("every liveC19 block has a driver (S7-drivers-C)", () => {
  const order = /liveC19 = \$R19Prologue \+ @\(([^)]*)\)/.exec(LIB)![1]!;
  const blocks = [...order.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  const registered = new Set([...ENTRY.matchAll(/\$global:R19Blocks\['([^']+)'\] = \{/g)].map((m) => m[1]!));
  for (const r of (/Set-R19Reused @\(([^)]*)\)/.exec(ENTRY)![1]!).matchAll(/'([^']+)'/g)) registered.add(r[1]!);
  it("each block of liveC19's order is registered, and each row id of the sheet's line has its block", () => {
    for (const b of blocks) expect(registered.has(b), b).toBe(true);
    const line = /^- \*\*liveC19 \([^\n]*$/m.exec(SEC)![0];
    const ids = [...line.matchAll(/R19-[A-Z0-9-]+/g)].map((m) => m[0].toLowerCase()).filter((i) => i !== "r19-closer" && i !== "r19-keep-overlap");
    for (const i of ids) expect(blocks.includes(i), i).toBe(true);
    for (const b of ["closerprobe", "r19-choose-mcp", "r19-choose-mcp-d", "r19-keep-overlap-b", "r19-banner-ctl"]) expect(blocks, b).toContain(b);
  });
  it("no liveC19 driver prints `no driver built`; the runner's own entry names every actor command that exists", () => {
    expect(PSC).not.toContain("no driver built");
    const ran = new Set([...(PSC + ENTRY).matchAll(/'(choose-[a-z0-9-]+|overlap-b|g2-[12])'/g)].map((m) => m[1]!));
    expect(ran.size).toBe(17);
    for (const c of ran) expect(Object.keys(C.cmds), c).toContain(c);
    expect(Object.keys(C.cmds)).toHaveLength(18); // the 17 row commands and `dialogs` (form (30))
  });
  it("the STOP reasons it names are the sheet's, a STOP goes through Stop-R19, the file is ASCII and parses", () => {
    for (const m of [...PSC.matchAll(/Stop-R19 '([a-z-]+)'/g), ...TS.matchAll(/new StopWhy\("([a-z-]+)"/g), ...TS.matchAll(/new StopWhy\(v\.slice/g)]) if (m[1]) expect(STOP_REASONS as readonly string[], m[1]).toContain(m[1]);
    expect(PSC.match(/\bStop9\b|\bFail-S16\b|SilentlyContinue/g) ?? []).toEqual([]);
    expect(/^[\x00-\x7f]*$/.test(readFileSync(join(REPO, "recipes", "s12-r19-c.ps1"), "utf8"))).toBe(true);
    if (hasPs) expect(spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$e=$null;$t=$null;[void][Management.Automation.Language.Parser]::ParseFile('${join(REPO, "recipes", "s12-r19-c.ps1")}',[ref]$t,[ref]$e);$e.Count`], { encoding: "utf8" }).stdout.trim()).toBe("0");
  });
  it("the human-style rows are gated on the proved click, the toolbar goes through Switch-R19Toolbar, and the dialogs are the closer's", () => {
    expect(PSC).toContain("$global:R19HumanClick -eq $true");
    expect(LIB).toContain("$global:R19Slice -in 'liveA19', 'liveB19', 'liveC19', 'liveD19', 'liveE19' -and (Get-Command Write-R19Dialogs -ErrorAction Ignore)) { Write-R19Dialogs }"); // form (30) at R19-RESTORE, liveA19, liveB19 and liveC19 (#363)
    expect(rd("recipes/s12-r19-a.ps1")).toContain("$global:R19RecordRows -contains $Id");
    expect(PSC).not.toMatch(/Invoke-S9ActionButton|Send-S12|Set-S11Flag/);
    expect(TS).toContain('await sig(`${R}-off`)');
  });
});

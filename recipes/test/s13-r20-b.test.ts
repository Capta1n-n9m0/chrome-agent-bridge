// Step 13 S5-drivers-B2: the pure decisions of recipes/s13-r20-b.ts: R20-CHOOSE-TWICE, R20-CHOOSE-KEPT and R20-CHOOSE-REFUSE-DIS (docs/e2e-test-plan.md section 4.28), with the product's own texts.
import { describe, expect, it } from "vitest";
import { CHOOSER_BUSY_MESSAGE } from "../../extension/src/handlers/upload.js";
import { CHOOSER_TIMEOUT_MESSAGE } from "../../extension/src/upload-files.js";
import { DISABLED_INPUT_MESSAGE } from "../../extension/src/content/upload-target.js";
import { catchDecision, HelperDefect, StopWhy } from "../s12-r19-a.js";
import { CHOOSER_RELOAD_HINT } from "../../daemon/src/intercept.js";
import { MCP_LINES, chkeptLine, chooseLine20, mcpLineRead } from "../s13-forms.js";
import { afterCheckLine, bTimedOut, g2LegGate, cmds, controlOk, coveredPx, g2Line20, g2Rows, judgeArgs7, judgeG2Leg, judgeVersionCall, judgeVersionControl, judgeVersionMcp, parsePlace, parseRects, versionStopFor, winCovered, digestDiffers, judgeKeptDifferent, judgeRefuseDis, judgeTwiceMcp, judgeTwiceSdk, parseDialogCount, preludeStop, stopFor, type Ans, type KeptRead } from "../s13-r20-b.js";
const OVERLAP = "Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry.";
const c1: Ans = { code: "TIMEOUT", message: CHOOSER_TIMEOUT_MESSAGE, ms: 5_300 };
const c2: Ans = { code: "DEBUGGER_DEVTOOLS", message: CHOOSER_BUSY_MESSAGE, ms: 40 };
const page = { clicks: 1, files: 0, change: 0 };
describe("R20-CHOOSE-TWICE", () => {
  it("call 2 the exact busy refusal within 1 000 ms, naming neither DevTools nor Close, call 1 TIMEOUT at about 5 s, one click: PASS", () => {
    expect(judgeTwiceSdk({ c1, c2, page })).toBe("PASS");
  });
  it("the old overlap text (which names DevTools) fails, as the discrimination says", () => {
    expect(judgeTwiceSdk({ c1, c2: { ...c2, message: OVERLAP }, page })).toBe("FAIL");
  });
  it("another code, a busy message with data, a slow refusal, a second click, a file or a wrong call 1 each FAIL", () => {
    expect(judgeTwiceSdk({ c1, c2: { ...c2, code: "TIMEOUT" }, page })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1, c2: { ...c2, data: { x: 1 } }, page })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1, c2: { ...c2, ms: 1_000 }, page })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1, c2, page: { ...page, clicks: 2 } })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1, c2, page: { ...page, files: 1 } })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1: { ...c1, code: "ok" }, c2, page })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1: { ...c1, message: "other" }, c2, page })).toBe("FAIL");
    expect(judgeTwiceSdk({ c1: { ...c1, ms: 1_000 }, c2, page })).toBe("FAIL");
  });
  it("prints the sheet's CHOOSE line with names-devtools=no", () => {
    expect(chooseLine20("R20-CHOOSE-TWICE", "call2", { answer: "DEBUGGER_DEVTOOLS", exact: true, files: 0, change: 0, clicks: 1, bytesEqual: null, dialog: 0, ms: 40, namesDevtools: false })).toMatch(/^CHOOSE R20-CHOOSE-TWICE call2 DEBUGGER_DEVTOOLS exact=yes files=0 change=0 clicks=1 .* names-devtools=no$/);
  });
  it("the MCP leg: the bare busy message, is-error yes, one line, PASS; the extension's text, a code on line 1 or a non-error FAIL", () => {
    const ok = mcpLineRead({ isError: true, text: CHOOSER_BUSY_MESSAGE }, MCP_LINES.busy);
    expect(judgeTwiceMcp(ok, -4_000)).toBe("PASS");
    expect(judgeTwiceMcp(mcpLineRead({ isError: true, text: `DEBUGGER_DEVTOOLS\n${CHOOSER_BUSY_MESSAGE}` }, MCP_LINES.busy), -4_000)).toBe("FAIL");
    expect(judgeTwiceMcp(mcpLineRead({ isError: false, text: CHOOSER_BUSY_MESSAGE }, MCP_LINES.busy), -4_000)).toBe("FAIL");
    expect(judgeTwiceMcp(mcpLineRead({ isError: true, text: OVERLAP }, MCP_LINES.busy), -4_000)).toBe("FAIL");
  });
  it("an MCP that serialised the calls (call 2 timed out like call 1, 4 000 ms or more after call 1's reply) is NOT MEASURED; a timeout that is not later is a FAIL", () => {
    const timeout = mcpLineRead({ isError: true, text: CHOOSER_TIMEOUT_MESSAGE }, MCP_LINES.busy);
    expect(judgeTwiceMcp(timeout, 5_000)).toBe("NOT MEASURED");
    expect(judgeTwiceMcp(timeout, 4_000)).toBe("NOT MEASURED");
    expect(judgeTwiceMcp(timeout, 3_999)).toBe("FAIL");
    expect(judgeTwiceMcp(timeout, -4_000)).toBe("FAIL");
  });
  it("the control upload is ok only with the file received", () => {
    expect(controlOk({ code: "ok", files: 1, change: 1 })).toBe(true);
    expect(controlOk({ code: "DEBUGGER_DEVTOOLS", files: 0, change: 0 })).toBe(false);
    expect(controlOk({ code: "ok", files: 0, change: 0 })).toBe(false);
  });
});
const k = (o: Partial<KeptRead> = {}): KeptRead => ({ answer: "ok", clicks: 1, input: 1, change: 1, cancel: 0, files: 1, digest: "aa", ...o });
describe("R20-CHOOSE-KEPT", () => {
  it("leg different passes with change=2 input=2 cancel=0 files=1 and a different digest", () => {
    expect(judgeKeptDifferent(k(), k({ clicks: 2, input: 2, change: 2, digest: "bb" }))).toBe("PASS");
    expect(digestDiffers(k(), k({ digest: "bb" }))).toBe(true);
  });
  it("change=1 after call 2 is the FAIL that stands (R19's finding), with input and cancel recorded", () => {
    expect(judgeKeptDifferent(k(), k({ clicks: 2, input: 2, change: 1, digest: "bb" }))).toBe("FAIL");
    expect(chkeptLine("R20-CHOOSE-KEPT", { leg: "different", call: 2, answer: "ok", clicks: 2, input: 2, change: 1, cancel: 0, files: 1, digestDiffers: true })).toBe("CHKEPT R20-CHOOSE-KEPT leg=different call=2 answer=ok clicks=2 input=2 change=1 cancel=0 files=1 digest-differs=yes");
  });
  it("each other counter or answer off its pre-written value FAILs; the same digest FAILs", () => {
    const two = { clicks: 2, input: 2, change: 2, digest: "bb" };
    expect(judgeKeptDifferent(k(), k({ ...two, input: 1 }))).toBe("FAIL");
    expect(judgeKeptDifferent(k(), k({ ...two, cancel: 1 }))).toBe("FAIL");
    expect(judgeKeptDifferent(k(), k({ ...two, files: 0 }))).toBe("FAIL");
    expect(judgeKeptDifferent(k(), k({ ...two, digest: "aa" }))).toBe("FAIL");
    expect(judgeKeptDifferent(k({ answer: "TIMEOUT" }), k(two))).toBe("FAIL");
    expect(judgeKeptDifferent(k(), k({ ...two, answer: "DEBUGGER_DEVTOOLS" }))).toBe("FAIL");
  });
  it("a digest unreadable while every counter holds (change=2 input=2 cancel=0 files=1) is NOT MEASURED, printed n/a", () => {
    expect(judgeKeptDifferent(k(), k({ change: 2, input: 2, digest: null }))).toBe("NOT MEASURED");
    expect(judgeKeptDifferent(k({ digest: null }), k({ change: 2, input: 2, digest: "bb" }))).toBe("NOT MEASURED");
    expect(digestDiffers(k(), k({ digest: null }))).toBeNull();
  });
  it("an ok the page never received is a FAIL even with no digest (F1)", () => {
    expect(judgeKeptDifferent(k({ change: 1, input: 1, digest: "aa" }), k({ change: 1, input: 1, digest: null }))).toBe("FAIL");
    expect(judgeKeptDifferent(k({ change: 0, input: 0, files: 0, digest: null }), k({ change: 0, input: 0, files: 0, digest: null }))).toBe("FAIL");
    expect(judgeKeptDifferent(k(), k({ change: 2, input: 2, files: 0, digest: null }))).toBe("FAIL");
  });
  it("an unreadable dialog count is a HelperDefect, never 0 (F2)", () => {
    expect(parseDialogCount("0")).toBe(0);
    expect(parseDialogCount(" 2\r\n")).toBe(2);
    for (const bad of ["", "abc", "-1", "1.5", "NaN"]) expect(() => parseDialogCount(bad)).toThrow(HelperDefect);
  });
  it("the prelude stops on equal or unknown digests of the two files", () => {
    expect(preludeStop("R", "aa", "bb")).toBeUndefined();
    expect(preludeStop("R", "aa", "aa")?.why).toBe("throw-after-state");
    expect(preludeStop("R", undefined, "bb")?.why).toBe("throw-after-state");
    expect(preludeStop("R", "", "bb")?.why).toBe("throw-after-state");
  });
});
const A = (code: string, message: string | undefined, files = 0, change = 0, data?: unknown) => ({ code, message, files, change, data });
const TIMEOUT = A("TIMEOUT", CHOOSER_TIMEOUT_MESSAGE);
const REFUSED = A("BAD_PARAMS", DISABLED_INPUT_MESSAGE);
describe("R20-CHOOSE-REFUSE-DIS", () => {
  it("flip refused with the exact message, files=0 change=0, btn TIMEOUT: PASS", () => {
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: REFUSED, self: TIMEOUT })).toBe("PASS");
  });
  it("flip TIMEOUT, self refused: PASS (reachable by the input itself); self TIMEOUT too: RECORD", () => {
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: TIMEOUT, self: REFUSED })).toBe("PASS");
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: TIMEOUT, self: TIMEOUT })).toMatch(/^RECORD refusal not reachable on a page that flips or targets the input itself$/);
  });
  it("ok with a file set on flip or on self is a FAIL, also beside a refusing flip", () => {
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: A("ok", undefined, 1, 1), self: TIMEOUT })).toBe("FAIL");
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: TIMEOUT, self: A("ok", undefined, 1, 1) })).toBe("FAIL");
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: REFUSED, self: A("ok", undefined, 1, 1) })).toBe("FAIL");
  });
  it("any other flip answer is a FAIL: another code, another message, data, a path", () => {
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: A("BAD_PARAMS", "other"), self: TIMEOUT })).toBe("FAIL");
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: A("ERROR", DISABLED_INPUT_MESSAGE), self: TIMEOUT })).toBe("FAIL");
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: A("BAD_PARAMS", DISABLED_INPUT_MESSAGE, 0, 0, { path: "x" }), self: TIMEOUT })).toBe("FAIL");
    expect(judgeRefuseDis({ btn: TIMEOUT, flip: A("BAD_PARAMS", DISABLED_INPUT_MESSAGE, 0, 1), self: TIMEOUT })).toBe("FAIL");
  });
  it("a btn that does not read TIMEOUT (the baseline) makes a PASS or a RECORD NOT DISCRIMINATING, never a FAIL's cover", () => {
    expect(judgeRefuseDis({ btn: REFUSED, flip: REFUSED, self: TIMEOUT })).toBe("NOT DISCRIMINATING");
    expect(judgeRefuseDis({ btn: A("ok", undefined, 1, 1), flip: TIMEOUT, self: TIMEOUT })).toBe("NOT DISCRIMINATING");
    expect(judgeRefuseDis({ btn: REFUSED, flip: A("ok", undefined, 1, 1), self: TIMEOUT })).toBe("FAIL");
  });
});
describe("the STOPs return through the shared stop path", () => {
  it("a control upload that is not ok is chooser-interception-left-on, before a dialog; a dialog is dialog-left-open", () => {
    expect(stopFor("R", { controlOk: true, dialogs: [0, 0] })).toBeUndefined();
    expect(stopFor("R", { controlOk: false, dialogs: [0] })?.why).toBe("chooser-interception-left-on");
    expect(stopFor("R", { controlOk: false, dialogs: [2] })?.why).toBe("chooser-interception-left-on");
    expect(stopFor("R", { controlOk: true, dialogs: [0, 1] })?.why).toBe("dialog-left-open");
  });
  it("run() turns each StopWhy into `STOPWHY <why>` and exit 2", () => {
    for (const s of [stopFor("R", { controlOk: false, dialogs: [] }), stopFor("R", { controlOk: true, dialogs: [1] }), preludeStop("R", "a", "a")]) {
      expect(s).toBeInstanceOf(StopWhy);
      expect(catchDecision(s, "R", {}, "x")).toEqual({ kind: "stop", line: `STOPWHY ${s!.why}` });
    }
  });
  it("registers the three rows' commands", () => {
    expect(Object.keys(cmds).sort()).toEqual(["choose-kept", "choose-refuse-dis", "choose-twice", "g2-1", "version"]);
  });
});
// ---- B3: R20-G2-1 and R20-VERSION --------------------------------------------------------------------------------------------------------------
const OBS = { a: "ok", aReplyMs: 520, bReplyMs: 1_100, rawGapMs: 580, holderAfterReplyMs: 480, aEffect: 1, b: "ok" };
const RAW = "wa=0,0,1920,1040;A=100,100,800,600,0;B=300,200,800,600,1|100,100,800,600;X=50,50,400,300,2";
describe("R20-G2-1 window arithmetic", () => {
	it("the covered pixels are the union of the rectangles above, cut to the work area (overlaps counted once, the taskbar strip outside)", () => {
		const wa = { x: 0, y: 0, w: 1920, h: 1040 }, t = { x: 100, y: 100, w: 100, h: 100 };
		expect(coveredPx(t, [], wa)).toBe(0);
		expect(coveredPx(t, [{ x: 0, y: 0, w: 150, h: 150 }], wa)).toBe(2_500);
		expect(coveredPx(t, [{ x: 0, y: 0, w: 150, h: 150 }, { x: 120, y: 120, w: 20, h: 20 }, { x: 100, y: 100, w: 100, h: 100 }], wa)).toBe(10_000);
		expect(coveredPx(t, [{ x: 200, y: 100, w: 50, h: 50 }], wa)).toBe(0);
		expect(coveredPx({ x: 0, y: 1000, w: 100, h: 100 }, [{ x: 0, y: 1040, w: 100, h: 40 }], wa)).toBe(0);
		expect(coveredPx({ x: 0, y: 1000, w: 100, h: 100 }, [{ x: 0, y: 1020, w: 100, h: 20 }], wa)).toBe(2_000);
		expect(coveredPx({ x: 5_000, y: 0, w: 10, h: 10 }, [{ x: 0, y: 0, w: 9_000, h: 9_000 }], wa)).toBe(0);
	});
	it("parses the PowerShell answer and reads each window's coverage from it", () => {
		const r = parseRects(RAW);
		expect(r.wins.B.z).toBe(1);
		expect(winCovered(r, "B")).toBe(600 * 500);
		expect(winCovered(r, "A")).toBe(0);
	});
	it("a malformed, short or incomplete answer is a HelperDefect, never a guess", () => {
		for (const bad of ["", "A=1,2,3", RAW.replace("wa=0,0,1920,1040;", ""), RAW.replace(";X=50,50,400,300,2", ""), RAW.replace("100,100,800,600,0", "100,100,800,x,0"), RAW.replace("600,0;", "600,-1;")]) expect(() => parseRects(bad)).toThrow(HelperDefect);
	});
	it("the placement answer is ok, refused <word>, or a HelperDefect", () => {
		expect(parsePlace("ok\r\n")).toBe(true);
		expect(parsePlace("refused not-wave-window")).toBe(false);
		expect(() => parsePlace("")).toThrow(HelperDefect);
		expect(() => parsePlace("okay")).toThrow(HelperDefect);
	});
});
describe("R20-G2-1 fix round 1 (F2, F3, N1, N2)", () => {
	it("coverage cuts to the work area in what the actor reads: a rectangle only in the taskbar strip covers nothing (T8)", () => {
		const r = parseRects("wa=0,0,1920,1040;A=100,100,800,600,0;B=300,1000,800,100,1|0,1040,1920,40;X=50,50,400,300,2");
		expect(winCovered(r, "B")).toBe(0);
	});
	it("the 30 000 ms boundary counts as timed out (T1); a negative work-area size and a bare `refused` are defects (T22, T23)", () => {
		expect(bTimedOut("TIMEOUT", 30_000)).toBe(true);
		expect(() => parseRects(RAW.replace("wa=0,0,1920,1040", "wa=0,0,-1,1040"))).toThrow(HelperDefect);
		expect(() => parsePlace("refused")).toThrow(HelperDefect);
	});
	const L = (v: "PASS" | "FAIL", t = false) => ({ v, bTimedOut: t, usable: true });
	it("covered times out while uncovered FAILs without a timeout: no cause is named (T4)", () => {
		expect(g2Rows(L("FAIL", true), L("FAIL"))).toEqual({ covered: "FAIL", uncovered: "FAIL" });
	});
	it("a leg that uploaded nothing but whose files count is 1 is a FAIL even with every other clause right (T10)", () => {
		expect(judgeVersionCall({ code: "VERSION", message: CHOOSER_RELOAD_HINT, files: 1, clicks: 0, leaked: 0 })).toBe("FAIL");
	});
	it("g2LegGate: a refused placement is NOT MEASURED (uncovered only); a failed alone-control or an uncovered WB not at 0 px is NOT DISCRIMINATING; else run", () => {
		expect(g2LegGate("uncovered", { placeOk: false })).toBe("NOT MEASURED");
		expect(g2LegGate("covered", { placeOk: false })).toBe("run");
		expect(g2LegGate("uncovered", { placeOk: true })).toBe("run");
		expect(g2LegGate("covered", { aloneErr: true, bCov: 0 })).toBe("NOT DISCRIMINATING");
		expect(g2LegGate("uncovered", { aloneErr: true, bCov: 0 })).toBe("NOT DISCRIMINATING");
		expect(g2LegGate("uncovered", { aloneErr: false, bCov: 1 })).toBe("NOT DISCRIMINATING");
		expect(g2LegGate("uncovered", { aloneErr: false, bCov: 0 })).toBe("run");
		expect(g2LegGate("covered", { aloneErr: false, bCov: 480_000 })).toBe("run");
	});
	it("the after-leg read prints a number, or `unread` for a malformed answer, and never throws on one; other errors still throw", () => {
		expect(afterCheckLine("R", "covered", RAW)).toBe("CHECK R covered b-covered-after-px=" + 600 * 500);
		expect(afterCheckLine("R", "covered", "garbage")).toBe("CHECK R covered b-covered-after-px=unread");
		expect(afterCheckLine("R", "covered", "")).toBe("CHECK R covered b-covered-after-px=unread");
	});
});
describe("R20-G2-1 judges", () => {
	it("a leg passes on the R19 pass rule with the 450 ms bounds", () => {
		expect(judgeG2Leg({ ...OBS, rawGapMs: 450 } as never)).toBe("PASS");
	});
	it("each clause failing is a FAIL: a no-hold build (gap near 0), no holder, no effect, A not ok, B not ok", () => {
		expect(judgeG2Leg({ ...OBS, rawGapMs: 449 } as never)).toBe("FAIL");
		expect(judgeG2Leg({ ...OBS, rawGapMs: 700, holderAfterReplyMs: 449 } as never)).toBe("FAIL");
		expect(judgeG2Leg({ ...OBS, rawGapMs: 700, aEffect: 0 } as never)).toBe("FAIL");
		expect(judgeG2Leg({ ...OBS, rawGapMs: 700, aEffect: 2 } as never)).toBe("FAIL");
		expect(judgeG2Leg({ ...OBS, rawGapMs: 700, a: "TIMEOUT" } as never)).toBe("FAIL");
		expect(judgeG2Leg({ ...OBS, rawGapMs: 700, b: "LOCK_TIMEOUT" } as never)).toBe("FAIL");
	});
	it("B timed out is a code other than ok and LOCK_TIMEOUT at 30 000 ms or later", () => {
		expect(bTimedOut("TIMEOUT", 30_100)).toBe(true);
		expect(bTimedOut("TIMEOUT", 29_999)).toBe(false);
		expect(bTimedOut("LOCK_TIMEOUT", 31_000)).toBe(false);
		expect(bTimedOut("ok", 31_000)).toBe(false);
	});
	const L = (v: "PASS" | "FAIL" | "NOT DISCRIMINATING", t = false, usable = true) => ({ v, bTimedOut: t, usable });
	it("covered times out, uncovered passes: FAIL for covered with the cause named; both time out: FAIL, cause not established", () => {
		expect(g2Rows(L("FAIL", true), L("PASS"))).toEqual({ covered: "FAIL", uncovered: "PASS", cause: "capture of a covered window" });
		expect(g2Rows(L("FAIL", true), L("FAIL", true))).toEqual({ covered: "FAIL", uncovered: "FAIL", cause: "not established, rectangles recorded" });
	});
	it("no cause for plain passes, a plain FAIL, or a leg that was not usable (alone-control failed)", () => {
		expect(g2Rows(L("PASS"), L("PASS"))).toEqual({ covered: "PASS", uncovered: "PASS" });
		expect(g2Rows(L("FAIL"), L("PASS"))).toEqual({ covered: "FAIL", uncovered: "PASS" });
		expect(g2Rows(L("FAIL", true), L("NOT DISCRIMINATING", false, false))).toEqual({ covered: "FAIL", uncovered: "NOT DISCRIMINATING" });
		expect(g2Rows(L("NOT DISCRIMINATING", false, false), L("PASS"))).toEqual({ covered: "NOT DISCRIMINATING", uncovered: "PASS" });
	});
	it("prints the sheet's G2 line with the leg key, and a negative gap as 0", () => {
		expect(g2Line20("R20-G2-1", "covered", { ...OBS }, 580)).toBe("G2 R20-G2-1 leg=covered a-reply=520 b-reply=1100 gap-ms=580 holder-after-reply-ms=480 a-effect=1 b=ok");
		expect(g2Line20("R20-G2-1", "uncovered", { ...OBS }, -3)).toContain("leg=uncovered a-reply=520 b-reply=1100 gap-ms=0 ");
	});
});
const HINT = CHOOSER_RELOAD_HINT;
describe("R20-VERSION judges", () => {
	const call = { code: "VERSION", message: HINT, files: 0, clicks: 0, leaked: 0 };
	it("sdk and raw pass on VERSION with exactly the daemon's text and nothing on the page", () => {
		expect(judgeVersionCall(call)).toBe("PASS");
	});
	it("a build that uploads (files=1, ok), another text, a click on the page or a path in the text each FAIL", () => {
		expect(judgeVersionCall({ ...call, code: "ok", message: undefined, files: 1 })).toBe("FAIL");
		expect(judgeVersionCall({ ...call, message: `${HINT} x` })).toBe("FAIL");
		expect(judgeVersionCall({ ...call, code: "BAD_PARAMS" })).toBe("FAIL");
		expect(judgeVersionCall({ ...call, clicks: 1 })).toBe("FAIL");
		expect(judgeVersionCall({ ...call, leaked: 1 })).toBe("FAIL");
	});
	const mr = (o: { isError?: boolean; text?: string } = {}) => mcpLineRead({ isError: o.isError ?? true, text: o.text ?? HINT }, MCP_LINES.chooserOld);
	it("the MCP leg is the bare text with isError, read by its own line, and the page untouched", () => {
		expect(judgeVersionMcp(mr(), { files: 0, clicks: 0 }, 0)).toBe("PASS");
		expect(MCP_LINES.chooserOld).toBe(HINT);
	});
	it("a code on line 1, the extension's text, no isError, a touched page or a leak FAIL; an unreadable page leaves NOT MEASURED", () => {
		expect(judgeVersionMcp(mr({ text: `VERSION\n${HINT}` }), { files: 0, clicks: 0 }, 0)).toBe("FAIL");
		expect(judgeVersionMcp(mr({ text: "other" }), { files: 0, clicks: 0 }, 0)).toBe("FAIL");
		expect(judgeVersionMcp(mr({ isError: false }), { files: 0, clicks: 0 }, 0)).toBe("FAIL");
		expect(judgeVersionMcp(mr(), { files: 1, clicks: 0 }, 0)).toBe("FAIL");
		expect(judgeVersionMcp(mr(), { files: 0, clicks: 1 }, 0)).toBe("FAIL");
		expect(judgeVersionMcp(mr(), { files: 0, clicks: 0 }, 1)).toBe("FAIL");
		expect(judgeVersionMcp(mr(), { files: -1, clicks: -1 }, 0)).toBe("NOT MEASURED");
		expect(judgeVersionMcp(mr({ text: "other" }), { files: -1, clicks: -1 }, 0)).toBe("FAIL");
	});
	it("the control upload is ok with one file and no hint; the args call answers 7", () => {
		expect(judgeVersionControl({ code: "ok", files: 1 })).toBe("PASS");
		expect(judgeVersionControl({ code: "VERSION", message: HINT, files: 0 })).toBe("FAIL");
		expect(judgeVersionControl({ code: "ok", files: 0 })).toBe("FAIL");
		expect(judgeVersionControl({ code: "ok", message: HINT, files: 1 })).toBe("FAIL");
		expect(judgeArgs7(7)).toBe("PASS");
		expect(judgeArgs7("7")).toBe("FAIL");
		expect(judgeArgs7(undefined)).toBe("FAIL");
	});
	it("a control that is not ok is existing-tool-changed, before a dialog (dialog-left-open); both return exit 2 through run()", () => {
		expect(versionStopFor("R", { controlOk: true, dialog: 0 })).toBeUndefined();
		const s1 = versionStopFor("R", { controlOk: false, dialog: 1 }), s2 = versionStopFor("R", { controlOk: true, dialog: 2 });
		expect([s1?.why, s2?.why]).toEqual(["existing-tool-changed", "dialog-left-open"]);
		for (const s of [s1, s2]) expect(catchDecision(s, "R", {}, "x")).toEqual({ kind: "stop", line: `STOPWHY ${s!.why}` });
	});
});

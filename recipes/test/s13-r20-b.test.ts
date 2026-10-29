// Step 13 S5-drivers-B2: the pure decisions of recipes/s13-r20-b.ts: R20-CHOOSE-TWICE, R20-CHOOSE-KEPT and R20-CHOOSE-REFUSE-DIS (docs/e2e-test-plan.md section 4.28), with the product's own texts.
import { describe, expect, it } from "vitest";
import { CHOOSER_BUSY_MESSAGE } from "../../extension/src/handlers/upload.js";
import { CHOOSER_TIMEOUT_MESSAGE } from "../../extension/src/upload-files.js";
import { DISABLED_INPUT_MESSAGE } from "../../extension/src/content/upload-target.js";
import { catchDecision, HelperDefect, StopWhy } from "../s12-r19-a.js";
import { MCP_LINES, chkeptLine, chooseLine20, mcpLineRead } from "../s13-forms.js";
import { cmds, controlOk, digestDiffers, judgeKeptDifferent, judgeRefuseDis, judgeTwiceMcp, judgeTwiceSdk, parseDialogCount, preludeStop, stopFor, type Ans, type KeptRead } from "../s13-r20-b.js";
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
    expect(Object.keys(cmds).sort()).toEqual(["choose-kept", "choose-refuse-dis", "choose-twice"]);
  });
});

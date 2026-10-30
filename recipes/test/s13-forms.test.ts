// Step 13 S5-helpers: the forms (1)-(13) of docs/e2e-test-plan.md section 4.28 "Line forms (Run 20)", the redefined CONCAP / CHOOSE, and the Run 20 judges.
// Every form's keys and alternatives are compared with the sheet's own paragraph, parsed at test time. The judges are tested against the product's own
// strings (imported, never copied) and against the OLD texts as mutants, fed in memory. No Chrome, daemon or port.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as F from "../s13-forms.js";
import { K } from "../s11-rules.js";
import { formatConsole } from "../../sdk/src/format/console-messages.js";
import { CHOOSER_BUSY_MESSAGE } from "../../extension/src/handlers/upload.js";
import { CHOOSER_TIMEOUT_MESSAGE } from "../../extension/src/upload-files.js";
import { DISABLED_INPUT_MESSAGE } from "../../extension/src/content/upload-target.js";
import { JS_DISABLED_MESSAGE } from "../../extension/src/safety.js";
import { ARGS_RELOAD_HINT, CHOOSER_RELOAD_HINT } from "../../daemon/src/intercept.js";
import { safetyRefusalLine } from "../../sdk/src/error.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8").replace(/\r\n/g, "\n");
const SEC = DOC.slice(DOC.indexOf("### 4.28 R20 rows"));
const PARA = (() => { const i = SEC.indexOf("**Line forms (Run 20).**"); return SEC.slice(i, SEC.indexOf("\n", i)); })();
const NEW = PARA.slice(PARA.indexOf("**New**"));

/** The backticked templates of item n of the "New" list; `[rerun=<k> ]` expands to both spellings. */
function templates(n: number): string[] {
  const at = [...NEW.matchAll(/\((\d{1,2})\) `/g)].map((m) => ({ n: Number(m[1]), i: m.index! }));
  const k = at.findIndex((a) => a.n === n);
  const item = NEW.slice(at[k]!.i, at[k + 1]?.i ?? NEW.length);
  const out: string[] = [];
  for (const m of item.matchAll(/`([A-Z][A-Z0-9]+ [^`]*=[^`]*|[A-Z][A-Z0-9]+ \S+=[^`]*)`/g)) {
    const t = m[1]!;
    if (t.includes("[rerun=<k> ]")) out.push(t.replace("[rerun=<k> ]", ""), t.replace("[rerun=<k> ]", "rerun=<k> "));
    else out.push(t);
  }
  return out;
}
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** `<a or b or c>` becomes an alternation; any other `<placeholder>` is one token. */
function toRegex(t: string): RegExp {
  const parts = t.split(/(<[^>]*>)/).map((p) => {
    if (!p.startsWith("<")) return esc(p);
    const alts = p.slice(1, -1).split(" or ");
    const one = (a: string): string => (a === "n" ? "\\d+" : a === "CODE" ? "[A-Z][A-Z_]*" : esc(a));
    return alts.length > 1 ? `(?:${alts.map(one).join("|")})` : "\\S+";
  });
  return new RegExp(`^${parts.join("")}$`);
}
const ok = (n: number, line: string): void => { expect(templates(n).some((t) => toRegex(t).test(line)), `${line} vs ${templates(n).join(" / ")}`).toBe(true); };
const keysOf = (l: string): string[] => l.split(" ").map((x) => x.split("=")[0]!);

describe("the sheet's forms are found by the parser (a test that cannot find a form is itself a failure)", () => {
  it("every item 1-13 has a template; item 1 has two spellings and item 11 two forms", () => {
    for (let n = 1; n <= 13; n++) expect(templates(n).length, `item ${n}`).toBeGreaterThanOrEqual(n === 1 || n === 11 ? 2 : 1);
  });
  it("a mutant line fails the matcher", () => {
    expect(templates(9).some((t) => toRegex(t).test("FLAG debugging-flag=maybe"))).toBe(false);
  });
});

describe("forms (1)-(13)", () => {
  it("(1) LOADED20, with and without rerun", () => {
    const o = { keys: "page", nested: "page", elem: "page", perm: "yes", listener: "yes", enabled: "yes", args: "answered" } as const;
    const a = F.loadedLine20(o);
    expect(a).toBe("LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered");
    ok(1, a);
    ok(1, F.loadedLine20({ ...o, rerun: 2, keys: "sorted", perm: "unread", args: "VERSION" }));
    expect(F.loadedLine20({ ...o, rerun: 2 })).toContain("LOADED20 rerun=2 keys=page");
  });
  it("(2) KEYORDER", () => {
    const l = F.keyorderLine("R20-ARGS-ORDER", { leg: "args", keys: "page", nested: "page", elem: "page", jsonEqual: true, via: "sdk" });
    ok(2, l);
    ok(2, F.keyorderLine("R20-ARGS-ORDER", { leg: "expr", keys: "page", nested: "page", elem: "page", jsonEqual: null, via: "sdk" }));
    expect(l).toBe("KEYORDER R20-ARGS-ORDER leg=args keys=page nested=page elem=page json-equal=yes via=sdk");
  });
  it("(3) POP, a number or n/a for in-ms", () => {
    const o = { leg: "bg", n: 3, grantedTo: "A", inMs: 210, others: 0, heldCall: "TAB_HELD", activeGuard: "bg", consoleNew: 0 } as const;
    expect(F.popLine("R20-POP-BG", o)).toBe("POP R20-POP-BG leg=bg n=3 granted-to=A in-ms=210 others=0 held-call=TAB_HELD active-guard=bg console-new=0");
    ok(3, F.popLine("R20-POP-BG", o));
    // the form (3) lists bg or fg only; the POP-NONE row itself prints n/a for the keys it does not use (a sheet row, not a form, is the source here)
    const none = F.popLine("R20-POP-NONE", { ...o, leg: "newtab", grantedTo: "none", inMs: null, heldCall: "n/a", activeGuard: "n/a" });
    expect(SEC).toContain(none.replace(/ console-new=\d+$/, ""));
  });
  it("(4) MCPLINE", () => {
    const l = F.mcplineLine("R20-CON-4", { leg: "mcp", isError: true, text: "exact", lines: 1 });
    expect(l).toBe("MCPLINE R20-CON-4 leg=mcp is-error=yes text=exact lines=1");
    ok(4, l);
    ok(4, F.mcplineLine("R20-CON-4", { leg: "mcp", isError: false, text: "other", lines: 3 }));
  });
  it("(5) CHKEPT", () => {
    const l = F.chkeptLine("R20-CHOOSE-KEPT", { leg: "different", call: 2, answer: "ok", clicks: 2, input: 2, change: 2, cancel: 0, files: 1, digestDiffers: true });
    expect(l).toBe("CHKEPT R20-CHOOSE-KEPT leg=different call=2 answer=ok clicks=2 input=2 change=2 cancel=0 files=1 digest-differs=yes");
    ok(5, l);
    ok(5, F.chkeptLine("R20-CHOOSE-KEPT", { leg: "same", call: 1, answer: "TIMEOUT", clicks: 1, input: 1, change: 1, cancel: 0, files: 0, digestDiffers: null }));
  });
  it("(6) RECT, numbers only", () => {
    const l = F.rectLine("R20-G2-1", { leg: "covered", win: "B", x: 10, y: -4, w: 800, h: 600, z: 2, coveredPx: 0 });
    expect(l).toBe("RECT R20-G2-1 leg=covered win=B x=10 y=-4 w=800 h=600 z=2 covered-by-others-px=0");
    expect(() => F.rectLine("R20-G2-1", { leg: "covered", win: "B", x: 1.5, y: 0, w: 1, h: 1, z: 0, coveredPx: 0 })).toThrow(/x: an integer/);
  });
  it("(7) CTRL20, a docked leg has n/a windows and title", () => {
    const o = { leg: "undock", when: "after-open", windows: 1, title: "ok", attached: "yes", targets: 3 } as const;
    expect(F.ctrl20Line("R20-DEVT-UNDOCK", o)).toBe("CTRL20 R20-DEVT-UNDOCK leg=undock when=after-open windows=1 title=ok attached=yes targets=3");
    ok(7, F.ctrl20Line("R20-DEVT-UNDOCK", o));
    const docked = F.ctrl20Line("R20-DEVT-EARLY", { ...o, leg: "docked", windows: null, title: "n/a" });
    expect(docked).toContain("windows=n/a title=n/a");
    ok(7, docked);
  });
  it("(8) DEVT20", () => {
    const l = F.devt20Line("R20-DEVT-UNDOCK", { leg: "undock", answer: "ok", value: "ok", exact: null, devtoolsWindowsAfter: 0 });
    expect(l).toBe("DEVT20 R20-DEVT-UNDOCK leg=undock answer=ok value=ok exact=n/a devtools-windows-after=0");
    ok(8, l);
    ok(8, F.devt20Line("R20-DEVT-UNDOCK", { leg: "undock", answer: "DEBUGGER_DEVTOOLS", value: "n/a", exact: true, devtoolsWindowsAfter: 1 }));
  });
  it("(9) FLAG, (10) PORT, (12) S4", () => {
    for (const v of ["yes", "no", "unread"] as const) ok(9, F.flagLine(v));
    expect(F.flagLine("yes")).toBe("FLAG debugging-flag=yes");
    const p = F.portLine(8081, "2026-10-29T10:00:00Z", 0);
    expect(p).toBe("PORT 8081 checked=2026-10-29T10:00:00Z listed=0");
    ok(10, p);
    ok(12, F.s4Line(true));
    ok(12, F.s4Line(false));
    expect(F.s4Line(true)).toBe("S4 commit=ancestor");
  });
  it("(11) SCAN20 stream and per-tool actors line", () => {
    const l = F.scan20Line("console", { name: 0, sentinel: 0, token: 0 });
    expect(l).toBe("SCAN20 console: name=0 sentinel=0 token=0");
    ok(11, l);
    const a = F.scan20ActorsLine("browser_console_messages", { name: 0, sentinel: 4, token: 0 });
    expect(a).toBe("SCAN20 actors browser_console_messages: name=0 sentinel=4 token=0");
    ok(11, a);
  });
  it("(13) DOCK, a side is one of five words", () => {
    for (const s of ["bottom", "right", "left", "undock", "unread"] as const) ok(13, F.dockLine("R20-0C", s));
    ok(13, F.dockLine("R20-RESTORE", "right"));
    expect(() => F.dockLine("R20-0C", "top" as never)).toThrow(/not a side/);
    expect(() => F.dockLine("R20-LOGS" as never, "right")).toThrow(/R20-0C or R20-RESTORE/);
  });
  it("a count that is not a non-negative integer is refused (no text can ride in a count)", () => {
    expect(() => F.portLine(8081, "2026-10-29T10:00:00Z", -1)).toThrow(/listed: a count/);
    expect(() => F.scan20Line("console", { name: 0, sentinel: Number.NaN, token: 0 })).toThrow(/sentinel: a count/);
    expect(() => F.scan20Line("con sole", { name: 0, sentinel: 0, token: 0 })).toThrow(/stream: not a fixed code/);
  });
});

describe("the redefined forms", () => {
  it("CONCAP counts the marker line: lines=k+1", () => {
    const tmpl = /`(CONCAP lines=<k\+1>[^`]*)`/.exec(PARA)![1]!;
    const s = { lines: 10, bodyChars: 18278, marker: true, firstIndex: 192, lastIndex: 200, sentinel: 9 };
    const l = F.concap20Line(s);
    expect(l).toBe("CONCAP lines=10 body-chars=18278 marker=yes first-index=192 last-index=200 sentinel=9");
    expect(toRegex(tmpl).test(l)).toBe(true);
    expect(keysOf(l)).toEqual(keysOf(tmpl.replace(/<[^>]*>/g, "x").replace(/ =/g, "=")));
  });
  it("CHOOSE gains names-devtools, after the Run 19 keys", () => {
    const l = F.chooseLine20("R20-CHOOSE-TWICE", "call2", { answer: "DEBUGGER_DEVTOOLS", exact: true, files: 0, change: 0, clicks: 1, bytesEqual: null, dialog: 0, ms: 120, namesDevtools: false });
    expect(l).toBe("CHOOSE R20-CHOOSE-TWICE call2 DEBUGGER_DEVTOOLS exact=yes files=0 change=0 clicks=1 bytes-equal=n/a dialog=0 ms=120 names-devtools=no");
    expect(PARA).toContain("names-devtools=<yes or no>");
  });
});

// ---------------------------------------------------------------- judges
describe("busyExact (R20-CHOOSE-TWICE)", () => {
  it("accepts the product's own busy message under DEBUGGER_DEVTOOLS only", () => {
    expect(F.busyExact({ code: "DEBUGGER_DEVTOOLS", message: CHOOSER_BUSY_MESSAGE })).toBe(true);
    expect(F.busyExact({ code: "TIMEOUT", message: CHOOSER_BUSY_MESSAGE })).toBe(false);
    expect(F.busyExact({ code: "DEBUGGER_DEVTOOLS", message: `${CHOOSER_BUSY_MESSAGE} ` })).toBe(false);
  });
  it("MUTANT: the old overlap text (K-devt, names DevTools) fails busyExact and names-devtools", () => {
    expect(F.busyExact({ code: K["K-devt"].code, message: K["K-devt"].message })).toBe(false);
    expect(F.namesDevtools(K["K-devt"].message)).toBe(true);
    expect(F.namesDevtools(CHOOSER_BUSY_MESSAGE)).toBe(false);
  });
  it("a busy answer that carries data fails", () => { expect(F.busyExact({ code: "DEBUGGER_DEVTOOLS", message: CHOOSER_BUSY_MESSAGE, data: {} })).toBe(false); });
  it("a busy message with no message fails", () => { expect(F.busyExact({ code: "DEBUGGER_DEVTOOLS" })).toBe(false); });
});

describe("the MCP-line judge reads the MCP's own line and isError", () => {
  const JS = safetyRefusalLine("JS_DISABLED", undefined)!;
  const DIS = safetyRefusalLine("DISARMED", { scope: "all" })!;
  it("the expected lines come from the product", () => {
    expect(F.MCP_LINES.jsDisabled).toBe(JS);
    expect(F.MCP_LINES.disarmedAll).toBe(DIS);
    expect(F.MCP_LINES.argsOld).toBe(ARGS_RELOAD_HINT);
    expect(F.MCP_LINES.chooserOld).toBe(CHOOSER_RELOAD_HINT);
    expect(F.MCP_LINES.busy).toBe(CHOOSER_BUSY_MESSAGE);
    expect(JS.startsWith("JS_DISABLED: ")).toBe(true);
  });
  it("PASS: isError and the whole text is the line", () => {
    const r = F.mcpLineRead({ isError: true, text: JS }, F.MCP_LINES.jsDisabled);
    expect(r).toEqual({ isError: true, text: "exact", lines: 1 });
    expect(F.mcpLineVerdict(r)).toBe("PASS");
    expect(F.mcpLineVerdict(F.mcpLineRead({ isError: true, text: DIS }, F.MCP_LINES.disarmedAll))).toBe("PASS");
  });
  it("MUTANT: a reader of the extension's text (no code prefix) on the MCP leg is `other`, not a pass", () => {
    const ext = JS_DISABLED_MESSAGE;
    const r = F.mcpLineRead({ isError: true, text: ext }, F.MCP_LINES.jsDisabled);
    expect(r.text).toBe("other");
    expect(F.mcpLineVerdict(r)).toBe("FAIL");
  });
  it("MUTANT: a code on line 1 over a bare-message leg is `other` (the Run 19 reader's shape)", () => {
    const r = F.mcpLineRead({ isError: true, text: `VERSION\n${ARGS_RELOAD_HINT}` }, F.MCP_LINES.argsOld);
    expect(r.text).toBe("contains");
    expect(r.lines).toBe(2);
    expect(F.mcpLineVerdict(r)).toBe("FAIL");
    expect(F.mcpLineVerdict(F.mcpLineRead({ isError: true, text: `VERSION: ${ARGS_RELOAD_HINT}` }, F.MCP_LINES.argsOld))).toBe("FAIL");
    expect(F.mcpLineVerdict(F.mcpLineRead({ isError: true, text: ARGS_RELOAD_HINT }, F.MCP_LINES.argsOld))).toBe("PASS");
  });
  it("isError false fails even when the text is exact", () => {
    expect(F.mcpLineVerdict(F.mcpLineRead({ isError: false, text: JS }, F.MCP_LINES.jsDisabled))).toBe("FAIL");
  });
});

describe("the newest-kept cap judge (R20-CON-CAP, #398)", () => {
  const SENT = "SENTINEL-X";
  const entries = Array.from({ length: 200 }, (_, i) => ({ level: "info" as const, kind: "console" as const, text: `s12-cap-${i + 1}:${SENT}`.padEnd(2000, "x"), ts: i }));
  const text = formatConsole(entries);
  it("the product's own formatter output passes with k = 9, marker `191 older lines cut`", () => {
    const s = F.concap20Stats(text, SENT);
    expect(s).toMatchObject({ lines: 10, marker: true, firstIndex: 192, lastIndex: 200, olderCut: 191, consecutive: true, sentinel: 9 });
    expect(s.bodyChars).toBeLessThanOrEqual(20_000);
    expect(F.concap20Verdict(s)).toBe("PASS");
    expect(F.concap20Line(s)).toBe("CONCAP lines=10 body-chars=18278 marker=yes first-index=192 last-index=200 sentinel=9");
  });
  it("MUTANT: the Run 19 text (oldest nine kept, marker last, `more lines, the newest`) fails", () => {
    const rows = text.split("\n").slice(1);
    const old = [...rows.slice(0, 9), "… [truncated: 191 more lines, the newest — narrow with level/limit]"].join("\n");
    const s = F.concap20Stats(old, SENT);
    expect(s.marker).toBe(false);
    expect(F.concap20Verdict(s)).toBe("FAIL");
  });
  it("MUTANT: the new marker at the end, a gap in the kept block, or an uncapped body each fail", () => {
    const [m, ...rows] = text.split("\n");
    expect(F.concap20Verdict(F.concap20Stats([...rows, m].join("\n"), SENT))).toBe("FAIL");
    expect(F.concap20Verdict(F.concap20Stats([m, rows[0], ...rows.slice(2)].join("\n"), SENT))).toBe("FAIL");
    expect(F.concap20Verdict(F.concap20Stats(formatConsole(entries, { maxChars: 500_000 }), SENT))).toBe("FAIL");
  });
  it("MUTANT: the oldest nine under the NEW marker (last-index=9) fail: the newest-kept clause", () => {
    const m = text.split(String.fromCharCode(10))[0]!;
    const oldest = formatConsole(entries, { maxChars: 500_000 }).split(String.fromCharCode(10)).slice(0, 9);
    const s = F.concap20Stats([m, ...oldest].join(String.fromCharCode(10)), SENT);
    expect(s).toMatchObject({ marker: true, olderCut: 191, lines: 10, firstIndex: 1, lastIndex: 9, consecutive: true });
    expect(F.concap20Verdict(s)).toBe("FAIL");
  });
  it("another k with the rule held is RECORD, the expected k is PASS", () => {
    const s = F.concap20Stats(text, SENT);
    expect(F.concap20Verdict(s, { expectK: 9 })).toBe("PASS");
    expect(F.concap20Verdict(s, { expectK: 8 })).toBe("RECORD");
    const three = F.concap20Stats(formatConsole(entries, { maxChars: 7000 }), SENT);
    expect(three.lines - 1).toBeLessThan(9);
    expect(F.concap20Verdict(three)).toBe("RECORD");
  });
  it("a marker that miscounts the cut lines fails", () => {
    const wrong = text.replace("191 older", "190 older");
    expect(F.concap20Verdict(F.concap20Stats(wrong, SENT))).toBe("FAIL");
  });
});

describe("the DevTools control and verdicts (#391 (1))", () => {
  const before = { windows: 0, title: "none", attached: "no" } as const;
  const after = { windows: 1, title: "ok", attached: "yes" } as const;
  it("PASS needs before attached=no, after attached=yes and, undocked, windows=1 title=ok", () => {
    expect(F.ctrl20Verdict(before, after, "undock")).toBe("PASS");
    expect(F.ctrl20Verdict({ windows: null, title: "n/a", attached: "no" }, { windows: null, title: "n/a", attached: "yes" }, "docked")).toBe("PASS");
  });
  it("an unreadable control is RECORD, never a PASS", () => {
    expect(F.ctrl20Verdict(before, { ...after, attached: "unread" }, "undock")).toBe("RECORD devtools-control-unreadable");
    expect(F.ctrl20Verdict({ ...before, attached: "unread" }, after, "undock")).toBe("RECORD devtools-control-unreadable");
    expect(F.ctrl20Verdict(before, { windows: 0, title: "none", attached: "yes" }, "undock")).toBe("RECORD devtools-control-unreadable");
  });
  it("attached=no after the open is NOT MEASURED; attached=yes before the open is NOT MEASURED", () => {
    expect(F.ctrl20Verdict(before, { ...after, attached: "no" }, "undock")).toBe("NOT MEASURED DevTools was not attached");
    expect(F.ctrl20Verdict({ ...before, attached: "yes" }, after, "docked")).toBe("NOT MEASURED the tab was attached before the open");
  });
  it("devt20Verdict: ok with 2 under a passing control is PASS; the refusal is FAIL with the finding and no STOP", () => {
    expect(F.devt20Verdict("PASS", { code: "ok", value: 2 })).toEqual({ verdict: "PASS" });
    expect(F.devt20Verdict("PASS", { code: K["K-devt"].code, message: K["K-devt"].message })).toEqual({ verdict: "FAIL", finding: "devtools-refuses" });
    expect(F.devt20Verdict("PASS", { code: "ok", value: 3 })).toEqual({ verdict: "FAIL" });
    expect(F.devt20Verdict("PASS", { code: "DEBUGGER_DEVTOOLS", message: "another text" })).toEqual({ verdict: "FAIL" });
  });
  it("devt20Verdict: no control, no PASS and no finding, whatever the call answered", () => {
    expect(F.devt20Verdict("RECORD devtools-control-unreadable", { code: "ok", value: 2 })).toEqual({ verdict: "RECORD devtools-control-unreadable" });
    expect(F.devt20Verdict("NOT MEASURED DevTools was not attached", { code: K["K-devt"].code, message: K["K-devt"].message })).toEqual({ verdict: "NOT MEASURED DevTools was not attached" });
  });
  it("the row verdict of a two-leg row is the worse leg", () => {
    expect(F.worseVerdict(["PASS", "FAIL"])).toBe("FAIL");
    expect(F.worseVerdict(["PASS", "RECORD devtools-control-unreadable"])).toBe("RECORD devtools-control-unreadable");
    expect(F.worseVerdict(["PASS", "PASS"])).toBe("PASS");
  });
  it("the conditional rows run only for a leg that printed devtools-refuses", () => {
    expect(F.conditionalRows(["PASS", "PASS"].map((v) => ({ verdict: v })))).toEqual({ run: false, line: "no DevTools condition refused" });
    expect(F.conditionalRows([{ verdict: "PASS" }, { verdict: "FAIL", finding: "devtools-refuses" }]).run).toBe(true);
  });
});

describe("the dock side (R20-0C, R20-RESTORE; verifier3 NITs E and F)", () => {
  it("an unreadable side makes the DevTools rows NOT RUN", () => {
    expect(F.devtRowGate("unread")).toEqual({ run: false, reason: "dock side unreadable, it could not be restored" });
    expect(F.devtRowGate("right")).toEqual({ run: true });
  });
  it("the restore read-back equals the found side, else the STOP not-restored; an unread read-back never passes", () => {
    expect(F.dockRestoreVerdict("right", "right", true)).toBe("PASS");
    expect(F.dockRestoreVerdict("right", "right", false)).toBe("PASS");
    expect(F.dockRestoreVerdict("right", "bottom", false)).toBe("STOP not-restored");
    expect(F.dockRestoreVerdict("right", "unread", true)).toBe("STOP not-restored");
    expect(F.dockRestoreVerdict("unread", "unread", true)).toBe("STOP not-restored");
    expect(F.dockRestoreVerdict("unread", "bottom", true)).toBe("STOP not-restored");
  });
  it("#416: an unread found side with no dock change is NOT MEASURED whatever the read-back; with a change it stays the STOP", () => {
    expect(F.dockRestoreVerdict("unread", "unread", false)).toBe("NOT MEASURED");
    expect(F.dockRestoreVerdict("unread", "bottom", false)).toBe("NOT MEASURED");
  });
  it("the sheet reads the side in a tab's DevTools in window X, never the capture window", () => {
    expect(F.DOCK_READ_PLACE).toBe("a tab's DevTools in window X");
    expect(SEC).toContain("in a tab's DevTools");
  });
});

describe("the disabled-input reachability map (R20-CHOOSE-REFUSE-DIS)", () => {
  const exact = { code: "BAD_PARAMS", message: DISABLED_INPUT_MESSAGE, files: 0, change: 0 };
  const timeout = { code: "TIMEOUT", message: CHOOSER_TIMEOUT_MESSAGE, files: 0, change: 0 };
  const fileSet = { code: "ok", files: 1, change: 1 };
  it("classifies each answer", () => {
    expect(F.disClass(exact)).toBe("refused");
    expect(F.disClass(timeout)).toBe("timeout");
    expect(F.disClass(fileSet)).toBe("file-set");
    expect(F.disClass({ ...exact, data: { path: "x" } })).toBe("other");
    expect(F.disClass({ ...exact, files: 1 })).toBe("other");
    expect(F.disClass({ code: "BAD_PARAMS", message: "another", files: 0, change: 0 })).toBe("other");
  });
  it("flip decides alone unless it answers TIMEOUT", () => {
    expect(F.disVerdict({ flip: exact, self: timeout })).toBe("PASS");
    expect(F.disVerdict({ flip: fileSet })).toBe("FAIL");
    expect(F.disVerdict({ flip: { code: "NOT_FOUND", message: "m", files: 0, change: 0 } })).toBe("FAIL");
  });
  it("on a flip TIMEOUT, self decides: refusal PASS, TIMEOUT RECORD, a file set FAIL", () => {
    expect(F.disVerdict({ flip: timeout, self: exact })).toBe("PASS");
    expect(F.disVerdict({ flip: timeout, self: timeout })).toBe("RECORD refusal not reachable on a page that flips or targets the input itself");
    expect(F.disVerdict({ flip: timeout, self: fileSet })).toBe("FAIL");
    expect(F.disVerdict({ flip: timeout })).toBe("RECORD refusal not reachable on a page that flips or targets the input itself");
  });
  it("the btn control must read TIMEOUT, else the baseline is not confirmed", () => {
    expect(F.disBaselineOk(timeout)).toBe(true);
    expect(F.disBaselineOk(exact)).toBe(false);
  });
});

describe("hasConsoleClause20 and the SCAN20 actors attribution (verifier3 NIT G)", () => {
  it("R20 ARGS and CON rows have a console clause; the rest do not", () => {
    for (const id of ["R20-ARGS-ORDER", "R20-ARGS-3", "R20-ARGS-OLD", "R20-CON-DESC", "R20-CON-CAP", "R20-CON-FLOOR"]) expect(F.hasConsoleClause20(id), id).toBe(true);
    for (const id of ["R20-0", "R20-POP-BG", "R20-LOGS", "R20-CHOOSE-TWICE", "R19-ARGS-1", "R20-ARGSX"]) expect(F.hasConsoleClause20(id), id).toBe(false);
  });
  it("a sentinel above 0 is allowed only on the four tools that echo values; name or token above 0 is text-leak always", () => {
    expect(F.actorsVerdict([{ tool: "browser_console_messages", name: 0, sentinel: 9, token: 0 }, { tool: "tab.evaluate", name: 0, sentinel: 2, token: 0 }])).toBe("PASS");
    expect(F.actorsVerdict([{ tool: "browser_snapshot", name: 0, sentinel: 1, token: 0 }])).toBe("STOP text-leak");
    expect(F.actorsVerdict([{ tool: "tab.consoleMessages", name: 1, sentinel: 0, token: 0 }])).toBe("STOP text-leak");
    expect(F.actorsVerdict([{ tool: "browser_evaluate", name: 0, sentinel: 0, token: 1 }])).toBe("STOP text-leak");
  });
  it("the line has no row field: the evaluate tools' count is attributed to the ARGS rows", () => {
    expect(F.sentinelRows("tab.evaluate")).toEqual(["R20-ARGS-ORDER", "R20-ARGS-OLD"]);
    expect(F.sentinelRows("browser_evaluate")).toEqual(["R20-ARGS-ORDER", "R20-ARGS-OLD"]);
    expect(F.sentinelRows("browser_snapshot")).toEqual([]);
  });
});

describe("the fixture page", () => {
  const js = readFileSync(join(REPO, "test-fixtures", "s13-chooser.js"), "utf8");
  const html = readFileSync(join(REPO, "test-fixtures", "s13-chooser.html"), "utf8");
  it("serves the four queries and the reporter the sheet reads", () => {
    for (const q of ["kept", "disflip", "disself", "disbtn"]) expect(js, q).toContain(`${q}:`);
    for (const k of ["clicks", "input", "change", "cancel", "size", "digest", "files"]) expect(js, k).toContain(k);
    expect(js).toContain("window.__s13ch");
    expect(html).toContain('src="s13-chooser.js"');
  });
  it("disflip clicks the enabled input and then disables it; disself's input is disabled from the start", () => {
    expect(js).toMatch(/q === "disflip"[^\n]*input\.click\(\); input\.disabled = true;/);
    expect(js).toMatch(/disself: '[^']*id="dis" type="file" disabled/);
    expect(js).toMatch(/disbtn: BTN \+ '<input id="in" type="file" disabled/);
  });
  it("the sheet names the same four queries and css:#dis", () => {
    for (const q of ["kept", "disflip", "disself", "disbtn"]) expect(SEC).toContain(`s13=${q}`);
    expect(SEC).toContain("css:#dis");
  });
});

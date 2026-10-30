// Step 13 S5-drivers-C2: the pure decisions of recipes/s13-r20-c.ts (liveC20's actor, docs/e2e-test-plan.md section 4.28).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { IDLE_MIN_MS_19 } from "../s12-forms.js";
import { K17 } from "../s11b-rules.js";
import type { PageObs } from "../s11-rules.js";
import { KEEPER_IDLE_MS } from "../../extension/src/debugger-keeper.js";
import { LEG_ORDER, MARKER, NO_REFUSAL_FINDING, condFor, pickRefusing, ROWS_C, EARLIER_NM_IDLE, EARLIER_NM_VALUE, afterGate, cmds, condGate, condOf, earlierVerdict, devtLegResult, gateCond, gateDock, keep4Gate, keep4Legs, notRunLine, parseCount, parseCtl, parseOpen, rowOfLegs, sweepVerdict, upDevtLegs, type CtlRead, type LegIn } from "../s13-r20-c.js";
const K = K17["K-devt"];
const refusal = { code: K.code, message: K.message };
const NO: CtlRead = { windows: 0, title: "none", attached: "no", targets: 7 };
const UN: CtlRead = { windows: 1, title: "ok", attached: "yes", targets: 8 };
const DK: CtlRead = { windows: null, title: "n/a", attached: "yes", targets: 8 };
const L = (o: Partial<LegIn> = {}): LegIn => ({ opened: true, row: "R20-DEVT-UNDOCK", leg: "undock", state: "undocked", before: NO, after: UN, ans: undefined, value: 2, remaining: 0, ...o });
const page = (o: Partial<PageObs> = {}): PageObs => ({ files: [], change: 0, input: 0, trusted: [], markAdded: 1, markRemoved: 1, carriersLeft: 0, ...o });
describe("the PowerShell side's answers", () => {
  it("parses a control, a docked control, and reads anything odd as unread", () => {
    expect(parseCtl("0 none no 7")).toEqual(NO);
    expect(parseCtl("1 ok yes 8")).toEqual(UN);
    expect(parseCtl("na na yes 8")).toEqual({ windows: null, title: "n/a", attached: "yes", targets: 8 });
    for (const bad of ["", "unread", "1 ok maybe 8", "1 ok yes", "x ok yes 8", "1 ok yes 8 9", "9 1 ok yes 8"]) expect(parseCtl(bad).attached).toBe("unread");
  });
  it("parses open and the remaining count; a non-count is null", () => {
    expect(parseOpen("ok")).toBe(true); expect(parseOpen("fail")).toBe(false); expect(parseOpen("")).toBe(false);
    expect(parseCount("0")).toBe(0); expect(parseCount(" 2 ")).toBe(2); expect(parseCount("unread")).toBeNull(); expect(parseCount("-1")).toBeNull();
  });
  it("uses a marker per leg that is no substring of another and carries no text beyond a plain token", () => {
    const m = Object.values(MARKER);
    expect(new Set(m).size).toBe(m.length);
    for (const a of m) { expect(a).toMatch(/^s12x=[a-z0-9]+$/); for (const b of m) if (a !== b) expect(b.includes(a)).toBe(false); }
  });
});
describe("a DevTools leg (R20-DEVT-UNDOCK / -EARLY)", () => {
  it("passes on both controls, ok and the value 2, and prints the sheet's three lines", () => {
    const r = devtLegResult(L());
    expect(r.result).toEqual({ verdict: "PASS" });
    expect(r.lines).toEqual([
      "CTRL20 R20-DEVT-UNDOCK leg=undock when=before-open windows=0 title=none attached=no targets=7",
      "CTRL20 R20-DEVT-UNDOCK leg=undock when=after-open windows=1 title=ok attached=yes targets=8",
      "DEVT20 R20-DEVT-UNDOCK leg=undock answer=ok value=ok exact=n/a devtools-windows-after=0",
    ]);
  });
  it("a docked leg prints windows=n/a title=n/a and is judged by attached alone", () => {
    const r = devtLegResult(L({ row: "R20-DEVT-EARLY", leg: "docked", state: "docked", before: { ...DK, attached: "no" }, after: DK }));
    expect(r.result.verdict).toBe("PASS");
    expect(r.lines[1]).toBe("CTRL20 R20-DEVT-EARLY leg=docked when=after-open windows=n/a title=n/a attached=yes targets=8");
  });
  it("K-devt exactly is FAIL with the finding, exact=yes, and the finding line names the leg", () => {
    const r = devtLegResult(L({ ans: refusal, value: undefined }));
    expect(r.result).toEqual({ verdict: "FAIL", finding: "devtools-refuses" });
    expect(r.lines).toContain("DEVT20 R20-DEVT-UNDOCK leg=undock answer=DEBUGGER_DEVTOOLS value=n/a exact=yes devtools-windows-after=0");
    expect(r.lines).toContain("CHECK R20-DEVT-UNDOCK finding=devtools-refuses leg=undock");
  });
  it("the right code with another message, or another code, is a plain FAIL with exact=no and no finding", () => {
    const a = devtLegResult(L({ ans: { code: K.code, message: "other" }, value: undefined }));
    expect(a.result).toEqual({ verdict: "FAIL" }); expect(a.lines.join("\n")).toContain("exact=no"); expect(a.lines.join("\n")).not.toContain("finding=");
    expect(devtLegResult(L({ ans: { code: "TIMEOUT", message: "x" }, value: undefined })).result.verdict).toBe("FAIL");
  });
  it("an ok with a value other than 2 is FAIL and says so", () => {
    const r = devtLegResult(L({ value: 3 }));
    expect(r.result.verdict).toBe("FAIL"); expect(r.lines).toContain("CHECK R20-DEVT-UNDOCK undock value-wrong=yes");
  });
  it("never a PASS without the control: unread is RECORD, attached=no after is NOT MEASURED, attached before is NOT MEASURED, a missing window is RECORD", () => {
    expect(devtLegResult(L({ after: { ...UN, attached: "unread" } })).result.verdict).toBe("RECORD devtools-control-unreadable");
    expect(devtLegResult(L({ after: { ...UN, attached: "no" } })).result.verdict).toBe("NOT MEASURED DevTools was not attached");
    expect(devtLegResult(L({ before: { ...NO, attached: "yes" } })).result.verdict).toBe("NOT MEASURED the tab was attached before the open");
    expect(devtLegResult(L({ after: { ...UN, windows: 0, title: "none" } })).result.verdict).toBe("RECORD devtools-control-unreadable");
    expect(devtLegResult(L({ after: { ...UN, attached: "no" }, ans: refusal, value: undefined })).result.finding).toBeUndefined();
  });
  it("an open that did not answer ok is RECORD devtools-control-unreadable in either state, even with both controls and the call reading ok", () => {
    expect(devtLegResult(L({ opened: false })).result.verdict).toBe("RECORD devtools-control-unreadable");
    expect(devtLegResult(L({ opened: false, row: "R20-DEVT-EARLY", leg: "docked", state: "docked", before: { ...DK, attached: "no" }, after: DK })).result.verdict).toBe("RECORD devtools-control-unreadable");
    expect(devtLegResult(L({ opened: false, ans: refusal, value: undefined })).result.finding).toBeUndefined();
  });
  it("an unread remaining count prints no DEVT20 line (the form needs a count)", () => {
    const r = devtLegResult(L({ remaining: null }));
    expect(r.lines.some((l) => l.startsWith("DEVT20"))).toBe(false); expect(r.lines).toContain("CHECK R20-DEVT-UNDOCK undock devtools-windows-after=unread");
  });
  it("the row is the worse of its legs", () => {
    expect(rowOfLegs([{ verdict: "PASS" }, { verdict: "RECORD devtools-control-unreadable" }])).toBe("RECORD devtools-control-unreadable");
    expect(rowOfLegs([{ verdict: "PASS" }, { verdict: "FAIL", finding: "devtools-refuses" }])).toBe("FAIL");
    expect(rowOfLegs([{ verdict: "NOT MEASURED x" }, { verdict: "RECORD y" }])).toBe("NOT MEASURED x");
  });
});
describe("the control read before a conditional call", () => {
  it("passes on attached=yes (and, undocked, one titled window), else the sheet's non-PASS words", () => {
    expect(afterGate(UN, "undocked")).toBe("PASS"); expect(afterGate(DK, "docked")).toBe("PASS");
    expect(afterGate({ ...UN, windows: 0 }, "undocked")).toBe("RECORD devtools-control-unreadable");
    expect(afterGate({ ...UN, attached: "no" }, "docked")).toBe("NOT MEASURED DevTools was not attached");
    expect(afterGate({ ...UN, attached: "unread" }, "undocked")).toBe("RECORD devtools-control-unreadable");
  });
});
describe("the control of a conditional row (before and after the open)", () => {
  it("reads the before-open control as the DEVT rows do", () => {
    expect(condGate(NO, UN, "undocked", true)).toBe("PASS"); expect(condGate({ ...DK, attached: "no" }, DK, "docked", true)).toBe("PASS");
    expect(condGate({ ...NO, attached: "yes" }, UN, "undocked", true)).toBe("NOT MEASURED the tab was attached before the open");
    expect(condGate({ ...NO, attached: "unread" }, UN, "undocked", true)).toBe("RECORD devtools-control-unreadable");
    expect(condGate(NO, { ...UN, attached: "no" }, "docked", true)).toBe("NOT MEASURED DevTools was not attached");
  });
  it("an open that did not answer ok is RECORD devtools-control-unreadable, docked or undocked", () => {
    expect(condGate(NO, UN, "undocked", false)).toBe("RECORD devtools-control-unreadable");
    expect(condGate({ ...DK, attached: "no" }, DK, "docked", false)).toBe("RECORD devtools-control-unreadable");
  });
});
describe("R20-UP-DEVT (R17-UP-DEVT's rule with a control before each call)", () => {
  const ok = { c1: refusal, up: refusal, c2: undefined, page: page({ files: [] }) };
  it("a pass is five PASS legs; a failing control is the only leg", () => {
    expect(upDevtLegs("PASS", "PASS", ok).every(([, v]) => v === "PASS")).toBe(true);
    expect(upDevtLegs("PASS", "NOT MEASURED DevTools was not attached", ok)).toEqual([["control", "NOT MEASURED DevTools was not attached"]]);
    expect(upDevtLegs("RECORD devtools-control-unreadable", "PASS", ok)).toEqual([["control", "RECORD devtools-control-unreadable"]]);
  });
  it("a control that passes but whose call is not refused is a FAIL, never NOT MEASURED", () => {
    expect(upDevtLegs("PASS", "PASS", { ...ok, c1: undefined }).find(([l]) => l === "control1")![1]).toBe("FAIL");
    expect(upDevtLegs("PASS", "PASS", { ...ok, up: undefined }).find(([l]) => l === "upload")![1]).toBe("FAIL");
    expect(upDevtLegs("PASS", "PASS", { ...ok, up: { code: K.code, message: "x" } }).find(([l]) => l === "upload")![1]).toBe("FAIL");
    expect(upDevtLegs("PASS", "PASS", { ...ok, c2: refusal }).find(([l]) => l === "control2")![1]).toBe("FAIL");
    expect(upDevtLegs("PASS", "PASS", { ...ok, page: page({ markRemoved: 0 }) }).find(([l]) => l === "page")![1]).toBe("FAIL");
  });
});
describe("R20-KEEP-4 and R20-SWEEP-HELD", () => {
  it("KEEP-4: K-devt then ok with 11 entries passes; 10 entries or another answer fails; a control gate wins", () => {
    expect(keep4Legs("PASS", refusal, { n: 11 })).toEqual([["devtools", "PASS"], ["closed", "PASS"]]);
    expect(keep4Legs("PASS", refusal, { n: 10 })[1]).toEqual(["closed", "FAIL"]);
    expect(keep4Legs("PASS", undefined, { n: 11 })[0]).toEqual(["devtools", "FAIL"]);
    expect(keep4Legs("RECORD devtools-control-unreadable", refusal, { n: 11 })).toEqual([["devtools", "RECORD devtools-control-unreadable"], ["closed", "RECORD devtools-control-unreadable"]]);
  });
  it("KEEP-4's control: no before-open read; undocked needs the window clause; docked is RECORD, never PASS or FAIL", () => {
    expect(keep4Gate(UN, "undocked", true, 100)).toBe("PASS");
    expect(keep4Gate({ ...UN, windows: 0, title: "none" }, "undocked", true, 100)).toBe("RECORD devtools-control-unreadable");
    expect(keep4Gate({ ...UN, attached: "no" }, "undocked", true, 100)).toBe("NOT MEASURED DevTools was not attached");
    expect(keep4Gate({ ...UN, attached: "unread" }, "undocked", true, 100)).toBe("RECORD devtools-control-unreadable");
    expect(keep4Gate(DK, "docked", true, 100)).toBe("RECORD devtools-control-unreadable");
    expect(keep4Gate({ ...DK, attached: "no" }, "docked", true, 100)).toBe("RECORD devtools-control-unreadable");
    expect(keep4Gate(UN, "undocked", false, 100)).toBe("RECORD devtools-control-unreadable");
    expect(keep4Gate(DK, "docked", false, 100)).toBe("RECORD devtools-control-unreadable");
  });
  it("KEEP-4: an open at or after the keeper's idle bound is NOT MEASURED in both legs; just under it still passes", () => {
    const nm = "NOT MEASURED DevTools was not opened before the keeper's idle bound";
    expect(keep4Gate(UN, "undocked", true, KEEPER_IDLE_MS)).toBe(nm);
    expect(keep4Gate(UN, "undocked", true, KEEPER_IDLE_MS + 1)).toBe(nm);
    expect(keep4Gate(UN, "undocked", true, KEEPER_IDLE_MS - 1)).toBe("PASS");
    expect(keep4Legs(nm, refusal, { n: 11 })).toEqual([["devtools", nm], ["closed", nm]]);
  });
  it("SWEEP-HELD: K-devt after the reload, still open, reclaimed, then ok passes; any one missing fails; a control gate wins", () => {
    const o = { afterReload: K.code, devtoolsOpen: true, reclaimed: true, after: "ok" };
    expect(sweepVerdict("PASS", o)).toBe("PASS");
    for (const bad of [{ afterReload: "ok" }, { devtoolsOpen: false }, { reclaimed: false }, { after: "DEBUGGER_DEVTOOLS" }]) expect(sweepVerdict("PASS", { ...o, ...bad })).toBe("FAIL");
    expect(sweepVerdict("NOT MEASURED DevTools was not attached", o)).toBe("NOT MEASURED DevTools was not attached");
  });
});
describe("the gates print the sheet's NOT RUN texts", () => {
  it("an unreadable dock side makes all five rows NOT RUN with the sheet's text and exit 3; a readable side runs", () => {
    const g = gateDock("unread");
    expect(g.exit).toBe(3);
    expect(g.lines).toEqual(ROWS_C.map((r) => `ROW ${r} NOT RUN — dock side unreadable, it could not be restored`));
    expect(gateDock("anything else").exit).toBe(3);
    for (const s of ["bottom", "right", "left", "undock"]) expect(gateDock(s)).toEqual({ lines: ["CHECK gate-dock side-readable=yes"], exit: 0 });
  });
  it("no refusing leg makes the three conditional rows NOT RUN; the finding line only when every DEVT leg was PASS, else counts only", () => {
    const nr = ["R20-UP-DEVT", "R20-KEEP-4", "R20-SWEEP-HELD"].map((r) => `ROW ${r} NOT RUN — no DevTools condition refused`);
    const g = gateCond("none", "PASS,PASS,PASS");
    expect(g.exit).toBe(3);
    expect(g.lines).toEqual(nr.concat([NO_REFUSAL_FINDING]));
    expect(gateCond("", "PASS,PASS,PASS").exit).toBe(3);
    const o = gateCond("none", "PASS,RECORD,NM");
    expect(o.exit).toBe(3);
    expect(o.lines).toEqual(nr.concat(["CHECK R20-DEVT no-refusal legs-pass=1 legs-other=2"]));
    expect(gateCond("none", "FAIL").lines.at(-1)).toBe("CHECK R20-DEVT no-refusal legs-pass=0 legs-other=1");
    expect(gateCond("none").lines.at(-1)).toBe("CHECK R20-DEVT no-refusal legs-pass=0 legs-other=0");
    expect(gateCond("undock", "FAIL,PASS")).toEqual({ lines: ["CHECK gate-cond run=yes refusing-legs=1", "CHECK gate-cond under=undock leg=undocked cond=earlier not-rerun=none"], exit: 0 });
    expect(gateCond("undocked,docked").exit).toBe(0);
    expect(notRunLine("R20-X", "why")).toBe("ROW R20-X NOT RUN — why");
  });
});
describe("the conditional rows re-create the refusing leg's condition (--cond)", () => {
  it("earlier: the earlier attach must answer 2 and the session idle the full bound, else the sheet's NOT MEASURED words", () => {
    expect(earlierVerdict(undefined, 2, IDLE_MIN_MS_19)).toBeUndefined();
    expect(earlierVerdict(undefined, 2, IDLE_MIN_MS_19 - 1)).toBe(EARLIER_NM_IDLE);
    expect(earlierVerdict(undefined, 3, IDLE_MIN_MS_19)).toBe(EARLIER_NM_VALUE);
    expect(earlierVerdict({ code: "X", message: "m" }, undefined, IDLE_MIN_MS_19)).toBe(EARLIER_NM_VALUE);
    expect(EARLIER_NM_VALUE).toBe("NOT MEASURED the earlier attach did not answer 2"); expect(EARLIER_NM_IDLE).toBe("NOT MEASURED the kept session was not idle");
  });
  it("--cond is earlier or none; a missing or other value is a helper defect, never a default", () => {
    expect(condOf({ cond: "earlier" })).toBe(true); expect(condOf({ cond: "none" })).toBe(false);
    for (const bad of [{} as Record<string, string>, { cond: "" }, { cond: "Earlier" }, { cond: "yes" }]) expect(() => condOf(bad)).toThrow("--cond");
  });
  it("gate-cond reads --findings and --legs from argv: all PASS prints the finding, else counts, a refusing leg runs", async () => {
    const out: string[] = [], spy = vi.spyOn(console, "log").mockImplementation((l: string) => { out.push(l); });
    try {
      expect(await cmds["gate-cond"]!(["--findings", "none", "--legs", "PASS,RECORD"])).toBe(3);
      expect(out.at(-1)).toBe("CHECK R20-DEVT no-refusal legs-pass=1 legs-other=1");
      out.length = 0;
      expect(await cmds["gate-cond"]!(["--findings", "none", "--legs", "PASS,PASS"])).toBe(3);
      expect(out.at(-1)).toBe(NO_REFUSAL_FINDING);
      out.length = 0;
      expect(await cmds["gate-cond"]!(["--findings", "undock", "--legs", "FAIL"])).toBe(0);
      expect(out).toEqual(["CHECK gate-cond run=yes refusing-legs=1", "CHECK gate-cond under=undock leg=undocked cond=earlier not-rerun=none"]);
    } finally { spy.mockRestore(); }
  });
  it("a refusing leg maps to the conditional rows' --leg and --cond exactly as C2 fixer2 section 3 says; any other label is a helper defect (C2 verifier3 H2)", () => {
    expect([condFor("undock"), condFor("undocked"), condFor("docked")]).toEqual([{ leg: "undocked", cond: "earlier" }, { leg: "undocked", cond: "none" }, { leg: "docked", cond: "none" }]);
    for (const bad of ["", "none", "Undock", "control", "undocked,docked"]) expect(() => condFor(bad)).toThrow("DEVT leg label");
  });
  it("the conditional rows run once, under the first refusing leg in sheet order whatever order the labels arrive in; the others are named as not re-run", () => {
    expect(LEG_ORDER).toEqual(["undock", "undocked", "docked"]);
    expect(pickRefusing(["docked", "undocked"])).toEqual({ under: "undocked", others: ["docked"] });
    expect(pickRefusing(["docked", "undock", "undocked"])).toEqual({ under: "undock", others: ["undocked", "docked"] });
    expect(pickRefusing([])).toBeUndefined();
    expect(() => pickRefusing(["undock", "other"])).toThrow("DEVT leg label");
    expect(gateCond("docked,undocked").lines).toEqual(["CHECK gate-cond run=yes refusing-legs=2", "CHECK gate-cond under=undocked leg=undocked cond=none not-rerun=docked"]);
    expect(() => gateCond("bogus")).toThrow("DEVT leg label");
  });
  it("UP-DEVT and SWEEP-HELD phase 1 run the earlier attach (with its idle wait) before the first control read, and earlierAttach attaches and idles (verifier3 H1: mutants e1, e2, e6)", () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "s13-r20-c.ts"), "utf8");
    const body = (name: string): string => { const i = src.indexOf(`async function ${name}(`); expect(i).toBeGreaterThan(-1); const j = src.indexOf("\nasync function ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
    const up = body("upDevt"), sw = body("sweepHeld"), ea = body("earlierAttach");
    expect(up.indexOf("if (earlier) { const nm = await earlierAttach(t, R, \"control\")")).toBeGreaterThan(-1);
    expect(up.indexOf("earlierAttach(")).toBeLessThan(up.indexOf("sig(id(\"ctl0\"))"));
    const p1 = sw.slice(sw.indexOf("if (x.opts.phase !== \"2\")"));
    expect(p1.indexOf("earlierAttach(t, R, \"control-pre\")")).toBeGreaterThan(-1);
    expect(p1.indexOf("earlierAttach(")).toBeLessThan(p1.indexOf("sig(id(\"ctl0\"))"));
    expect(ea).toContain('t.evaluate("1 + 1")'); expect(ea).toContain("await idle(row)"); expect(ea).toContain("earlierVerdict(");
  });
});

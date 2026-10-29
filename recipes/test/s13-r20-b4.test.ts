// Step 13 S5-drivers-B4a: the pure decisions of recipes/s13-r20-b4.ts (the -3 POP rows of docs/e2e-test-plan.md section 4.28's dated addendum, decisions #407 and #410).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Round } from "../s13-r20-a.js";
import { ACTOR, BASE, B_WINDOW_CHECK_3, exprSeries, holderOf, humanLine3, judgePop3, parseAfter, parseBefore, popLine3, popupRead, recordLine3, UNJOINED_LINE_3, uniqueExpr, type After3, type Cap3 } from "../s13-r20-b4.js";
type R3 = NonNullable<Round["r3"]>;
const R = (o: Partial<Round> = {}, r3: Partial<R3> = {}): Round => ({ grantedTo: "A", inMs: 40, others: 0, held: "TAB_HELD", controlSame: false, ownCallOk: true, guard: "bg", r3: { probed: true, ctlHeld: true, holder: true, ...r3 }, ...o });
const three = (o: Partial<Round> = {}, r3: Partial<R3> = {}): Round[] => [R(o, r3), R(o, r3), R(o, r3)];
const B: Cap3 = { lines: 10, evalN: 4 }, A: After3 = { lines: 25, evalN: 9, join: 0, url: 0 };
type JO = Parameters<typeof judgePop3>[3];
const J = (rs: Round[], o: Partial<JO> = {}) => judgePop3("R20-POP-BG-3", "bg", rs, { expect: "bg", human: false, before: B, after: A, ...o });
describe("the -3 line forms", () => {
  it("prints the dated addendum's POP form and its two CHECK forms", () => {
    const j = J([R({ inMs: 10 }), R({ inMs: 120 }), R({ inMs: 30 })]);
    expect(j.v).toBe("PASS");
    expect(j.line).toBe("POP R20-POP-BG-3 leg=bg n=3 granted-to=A in-ms=120 others=0 held-call=TAB_HELD holder=A active-guard=bg console-join=0 console-url=0");
    expect(j.record).toBe("CHECK R20-POP-BG-3 bg console-new=15 RECORD");
    expect(humanLine3("R20-POP-OTHER-3", 2, { opened: true, opener: "other", grantedTo: "A" })).toBe("CHECK R20-POP-OTHER-3 human round=2 popup-opened=yes opener=other granted-to=A");
    expect(UNJOINED_LINE_3).toBe("ROW R20-POP-OTHER-3 unjoined NOT MEASURED — no unjoined tab can be made");
    expect(B_WINDOW_CHECK_3).toBe("CHECK R20-POP-OTHER-3 third b-window=W (sheet: W2)");
  });
  it("refuses a value that is not a count or a fixed word", () => {
    const f = { leg: "bg", n: 3, grantedTo: "A", inMs: 1, others: 0, heldCall: "n/a", holder: "n/a", activeGuard: "bg", join: 0, url: 0 } as const;
    expect(() => popLine3("bad id", f)).toThrow();
    expect(() => popLine3("R20-POP-BG-3", { ...f, join: -1 })).toThrow();
    expect(recordLine3("R20-POP-BG-3", "bg", null)).toBe("CHECK R20-POP-BG-3 bg console-new=unread RECORD");
  });
});
describe("the lease, holder and held-call clauses (items 1, 2, 3, 5)", () => {
  it("a grant to B or C in any round is the STOP popup-lease-wrong, and a lease to A only passes", () => {
    expect(J(three({ grantedTo: "B", others: 1 }))).toMatchObject({ v: "STOP", why: "popup-lease-wrong" });
    expect(J([R(), R({ grantedTo: "C" }), R()]).v).toBe("STOP");
    expect(J([R(), R({ others: 1 }), R()]).v).toBe("STOP");
  });
  it("holder=A needs B's popup call TAB_HELD with the holder text; the control must be TAB_HELD by code; messages are never compared", () => {
    expect(J(three({}, { holder: false })).v).toBe("FAIL");
    expect(J(three({}, { holder: false })).line).toContain("holder=other");
    expect(J(three({}, { ctlHeld: false })).v).toBe("FAIL");
    expect(J(three({ held: "ok" }, { holder: false })).line).toContain("held-call=ok");
    expect(J(three({ controlSame: false })).v).toBe("PASS");
  });
  it("granted-to=none, a slow grant and a failed own call fail; a missing probe fails", () => {
    for (const o of [{ grantedTo: "none" as const, inMs: null }, { inMs: 1001 }, { ownCallOk: false }]) expect(J(three(o)).v).toBe("FAIL");
    expect(J(three({}, { probed: false })).v).toBe("FAIL");
  });
  it("a round whose guard is not the leg's is not counted: NOT DISCRIMINATING, n=2", () => {
    const j = J([R(), R({ guard: "fg" }), R()]);
    expect(j.v).toBe("NOT DISCRIMINATING");
    expect(j.line).toContain("n=2 ");
  });
});
describe("the console clause (items 6, 10, 12, 14, 16)", () => {
  it("a join or URL count above 0 is printed and FAILs whatever the control reads", () => {
    for (const control of [{ evalN: 9 }, { evalN: 4 }]) {
      const j = J(three(), { after: { ...A, ...control, join: 2 } });
      expect(j.v).toBe("FAIL");
      expect(j.line).toContain("console-join=2");
    }
    expect(J(three(), { after: { ...A, url: 1 } }).line).toContain("console-url=1");
    expect(J(three(), { after: { ...A, evalN: 4, url: 1 }, before: null }).v).toBe("FAIL");
  });
  it("a failed control turns a would-be PASS into NOT MEASURED and replaces only a 0 with unread", () => {
    for (const after of [{ ...A, evalN: 4 }, { ...A, evalN: 3 }]) {
      const j = J(three(), { after });
      expect(j.v).toBe("NOT MEASURED");
      expect(j.line).toContain("console-join=unread console-url=unread");
    }
    expect(J(three(), { after: { ...A, evalN: 4, join: 1 } }).line).toContain("console-join=1 console-url=unread");
  });
  it("an unreadable before-capture fails only the control; an unreadable after-capture prints unread for both and is NOT MEASURED (items 14, 16)", () => {
    const nb = J(three(), { before: null });
    expect(nb.v).toBe("NOT MEASURED");
    expect(nb.line).toContain("console-join=unread console-url=unread");
    expect(nb.record).toBe("CHECK R20-POP-BG-3 bg console-new=unread RECORD");
    const na = J(three(), { after: null });
    expect(na.v).toBe("NOT MEASURED");
    expect(na.line).toContain("console-join=unread console-url=unread");
  });
  it("every other clause is judged first: a FAIL or STOP stands whatever the console reads (item 12)", () => {
    expect(J(three({ inMs: 2000 }), { after: null }).v).toBe("FAIL");
    expect(J(three({ grantedTo: "none", inMs: null }), { before: null }).v).toBe("FAIL");
    expect(J(three({ grantedTo: "B" }), { after: null }).v).toBe("STOP");
  });
  it("console-new is a RECORD count, clamped at 0, never judged", () => {
    expect(J(three(), { after: { ...A, lines: 3 } }).record).toBe("CHECK R20-POP-BG-3 bg console-new=0 RECORD");
    expect(J(three()).v).toBe("PASS");
  });
});
describe("leg human (items 3, 4, #407 clause 3)", () => {
  const H = (o: Partial<Round> = {}, r3: Partial<R3> = {}): Round => R({ guard: "fg", ...o }, { popupOpened: true, opener: "O", ...r3 });
  const Jh = (rs: Round[], o: Partial<JO> = {}) => judgePop3("R20-POP-OTHER-3", "human", rs, { expect: "fg", human: true, before: B, after: A, ...o });
  it("passes only when all three clicks opened a popup and each meets the clauses", () => {
    const j = Jh([H(), H(), H()]);
    expect(j.v).toBe("PASS");
    expect(j.line).toBe("POP R20-POP-OTHER-3 leg=human n=3 granted-to=A in-ms=40 others=0 held-call=TAB_HELD holder=A active-guard=fg console-join=0 console-url=0");
  });
  it("a click with no popup tab is NOT MEASURED, not counted, held-call n/a", () => {
    const none = H({ grantedTo: "none", inMs: null }, { popupOpened: false, opener: "none", probed: false });
    const j = Jh([H(), H(), none]);
    expect(j.v).toBe("NOT MEASURED");
    expect(j.line).toContain("n=2 ");
    expect(Jh([none, none, none]).line).toContain("held-call=n/a holder=n/a");
  });
  it("a popup opened and granted to nobody is a FAIL whatever the console reads; a grant to B or C is the STOP", () => {
    const nog = H({ grantedTo: "none", inMs: null }, { probed: false });
    expect(Jh([H(), H(), nog], { after: null }).v).toBe("FAIL");
    expect(Jh([H(), H(), nog]).line).toContain("granted-to=none");
    expect(Jh([H(), H({ grantedTo: "C" }), H()])).toMatchObject({ v: "STOP", why: "popup-lease-wrong" });
  });
  it("a held-call that is not as clause (1) is a FAIL", () => expect(Jh([H(), H({}, { holder: false }), H()]).v).toBe("FAIL"));
});
describe("popup-opened (item 4)", () => {
  const before = [{ id: 1, tab: "T1" }, { id: 2, tab: "T2" }];
  it("a row absent before the click that no actor opened is a popup; its opener is a label only", () => {
    expect(popupRead(before, [...before, { id: 9, tab: "T9", openerTabId: 1 }], "T1", ["T1", "T2"])).toEqual({ opened: true, opener: "O" });
    expect(popupRead(before, [...before, { id: 9, tab: "T9", openerTabId: 2 }], "T1", [])).toEqual({ opened: true, opener: "other" });
    expect(popupRead(before, [...before, { id: 9, tab: "T9" }], "T1", [])).toEqual({ opened: true, opener: "none" });
  });
  it("no new row, or a new row an actor opened with newTab, is not a popup", () => {
    expect(popupRead(before, before, "T1", [])).toEqual({ opened: false, opener: "none" });
    expect(popupRead(before, [...before, { id: 9, tab: "T9", openerTabId: 1 }], "T1", ["T9"])).toEqual({ opened: false, opener: "none" });
  });
});
describe("A's popup call (item 13), the hello names (item 1) and the captures", () => {
  it("every popup call's expression length is unique in the slice and differs from B's `1`, window.open and R20-0B's expressions", () => {
    const all = [...exprSeries(BASE.bg, 3), ...exprSeries(BASE.fg, 3), ...exprSeries(BASE.other, 6)];
    expect(new Set(all.map((e) => e.length)).size).toBe(12);
    const others = ["1", "window.open('http://localhost:8081/e2e-playground.html?popup=1') !== null", "(a) => a", "({zeta: 1, alpha: 2, mid: {y: 1, x: 2}, list: [{q: 1, b: 2}]})"];
    for (const e of all) { expect(others.map((x) => x.length)).not.toContain(e.length); expect(Function(`return (${e})`)()).toBe(1); }
    expect(uniqueExpr(1)).toBe("1+0");
  });
  it("the hello names are plain ASCII with no quote or backslash, and equal what run() will give the client", () => {
    for (const n of Object.values(ACTOR)) expect(holderOf(n)).toMatch(/^[A-Za-z0-9._-]+$/);
    const src = readFileSync(fileURLToPath(new URL("../s13-r20-b4.ts", import.meta.url)), "utf8");
    for (const k of ["bg", "fg", "other"]) expect(src).toContain(`run(ACTOR.${k},`);
    expect(readFileSync(fileURLToPath(new URL("../s12-r19-a.ts", import.meta.url)), "utf8")).toContain("name: `s12-r19-a-${name}`");
  });
  it("parses the PowerShell answers strictly; anything else is an unreadable capture", () => {
    expect(parseBefore("ok 12 3")).toEqual({ lines: 12, evalN: 3 });
    expect(parseAfter("ok 12 3 0 1")).toEqual({ lines: 12, evalN: 3, join: 0, url: 1 });
    for (const bad of ["unread", "", "ok 1 2 3", "ok -1 2", "ok 1 x", "undefined"]) expect(parseBefore(bad)).toBeNull();
    for (const bad of ["unread", "ok 1 2", "ok 1 2 3 x"]) expect(parseAfter(bad)).toBeNull();
  });
});

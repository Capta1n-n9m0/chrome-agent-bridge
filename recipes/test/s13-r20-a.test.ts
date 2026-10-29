// Step 13 S5-drivers-A (A1 rows): the pure decisions of recipes/s13-r20-a.ts: the POP verdicts, ARGS-ORDER's key order, ARGS-3's effect counter and MCP line.
import { describe, expect, it } from "vitest";
import { MCP_LINES, mcpLineRead, popLine } from "../s13-forms.js";
import { MSG } from "../s12-r19-a.js";
import { clickGate, stampOf, judgeArgs3, judgeArgsOrder, judgeBlocked, judgeNewtab, judgePop, mcpEqual, mcpOrderLines, prepareRound, UNJOINED_LINE, type Round } from "../s13-r20-a.js";
const R = (o: Partial<Round> = {}): Round => ({ grantedTo: "A", inMs: 40, others: 0, held: "TAB_HELD", controlSame: true, ownCallOk: true, guard: "bg", ...o });
const three = (o: Partial<Round> = {}): Round[] => [R(o), R(o), R(o)];
describe("POP rows", () => {
  it("passes 3 of 3 background rounds and prints the sheet's line", () => {
    const j = judgePop("R20-POP-BG", "bg", [R({ inMs: 10 }), R({ inMs: 120 }), R({ inMs: 30 })], { expect: "bg", consoleNew: 0 });
    expect(j.v).toBe("PASS");
    expect(j.line).toBe("POP R20-POP-BG leg=bg n=3 granted-to=A in-ms=120 others=0 held-call=TAB_HELD active-guard=bg console-new=0");
    expect(j.line).toBe(popLine("R20-POP-BG", { leg: "bg", n: 3, grantedTo: "A", inMs: 120, others: 0, heldCall: "TAB_HELD", activeGuard: "bg", consoleNew: 0 }));
  });
  it("a grant to B (the holder of the active tab) is the STOP popup-lease-wrong", () => {
    const j = judgePop("R20-POP-BG", "bg", three({ grantedTo: "B", others: 1 }), { expect: "bg", consoleNew: 0 });
    expect(j).toMatchObject({ v: "STOP", why: "popup-lease-wrong" });
    expect(j.line).toContain("granted-to=B");
  });
  it("a grant to C on the third leg, and any grant to another client, is the STOP", () => {
    expect(judgePop("R20-POP-OTHER", "third", three({ grantedTo: "C" }), { expect: "bg", consoleNew: 0 }).why).toBe("popup-lease-wrong");
    expect(judgePop("R20-POP-OTHER", "third", [R(), R({ others: 1 }), R()], { expect: "bg", consoleNew: 0 }).v).toBe("STOP");
  });
  it("granted-to=none is a FAIL", () => {
    const j = judgePop("R20-POP-BG", "bg", three({ grantedTo: "none", inMs: null }), { expect: "bg", consoleNew: 0 });
    expect(j.v).toBe("FAIL");
    expect(j.line).toContain("granted-to=none");
  });
  it("a round whose active-guard reads fg is not counted: NOT DISCRIMINATING, n=2", () => {
    const j = judgePop("R20-POP-BG", "bg", [R(), R({ guard: "fg" }), R()], { expect: "bg", consoleNew: 0 });
    expect(j.v).toBe("NOT DISCRIMINATING");
    expect(j.line).toContain("n=2 ");
  });
  it("fails a slow grant, an ok held-call, a held-call unequal to its control, a failed own call", () => {
    for (const o of [{ inMs: 1001 }, { held: "ok" as const }, { controlSame: false }, { ownCallOk: false }]) expect(judgePop("R20-POP-FG", "fg", three({ ...o, guard: "fg" }), { expect: "fg", consoleNew: 0 }).v, JSON.stringify(o)).toBe("FAIL");
  });
  it("console-new above 0 fails, unread is NOT MEASURED", () => {
    expect(judgePop("R20-POP-BG", "bg", three(), { expect: "bg", consoleNew: 2 }).v).toBe("FAIL");
    expect(judgePop("R20-POP-BG", "bg", three(), { expect: "bg", consoleNew: null }).v).toBe("NOT MEASURED");
  });
  it("newtab: B holds all three, no grant passes; any grant is the STOP; a missing listing fails", () => {
    expect(judgeNewtab([{ listedByB: true, grants: 0 }, { listedByB: true, grants: 0 }, { listedByB: true, grants: 0 }]).v).toBe("PASS");
    expect(judgeNewtab([{ listedByB: true, grants: 1 }, { listedByB: true, grants: 0 }, { listedByB: true, grants: 0 }])).toMatchObject({ v: "STOP", why: "popup-lease-wrong" });
    expect(judgeNewtab([{ listedByB: false, grants: 0 }, { listedByB: true, grants: 0 }, { listedByB: true, grants: 0 }]).v).toBe("FAIL");
  });
  it("blocked: no tab and no grant passes; a tab that joined A is a RECORD; a grant elsewhere is the STOP", () => {
    expect(judgeBlocked({ before: 4, after: 4, grants: [] }).v).toBe("PASS");
    expect(judgeBlocked({ before: 4, after: 5, grants: ["A"] }).v).toBe("RECORD");
    expect(judgeBlocked({ before: 4, after: 5, grants: ["B"] })).toMatchObject({ v: "STOP", why: "popup-lease-wrong" });
    expect(judgeBlocked({ before: 4, after: 4, grants: ["A"] }).v).toBe("STOP");
  });
  it("prints the pre-declared unjoined line", () => expect(UNJOINED_LINE).toBe("ROW R20-POP-OTHER unjoined NOT MEASURED — no unjoined tab can be made"));
});
describe("R20-ARGS-ORDER", () => {
  const ok = { expr: { keys: "page", nested: "page", elem: "page" } as const, table: [true, true, true, true, true], keyed: { keys: "page", nested: "page", elem: "page", jsonEqual: true } as const, control1: 2, control2Kind: "function" };
  it("passes when every value keeps the sender's key order", () => expect(judgeArgsOrder(ok)).toEqual({ v: "PASS" }));
  it("fails sorted keys (the build before S2), a table value that differs by key order only, a keyed object that differs", () => {
    expect(judgeArgsOrder({ ...ok, expr: { ...ok.expr, keys: "sorted" } }).v).toBe("FAIL");
    expect(judgeArgsOrder({ ...ok, table: [true, false, true, true, true] }).v).toBe("FAIL");
    expect(judgeArgsOrder({ ...ok, keyed: { ...ok.keyed, jsonEqual: false } }).v).toBe("FAIL");
  });
  it("a changed control is the STOP existing-tool-changed", () => {
    expect(judgeArgsOrder({ ...ok, control1: 3 })).toEqual({ v: "STOP", why: "existing-tool-changed" });
    expect(judgeArgsOrder({ ...ok, control2Kind: "undefined" })).toEqual({ v: "STOP", why: "existing-tool-changed" });
  });
});
describe("R20-ARGS-3", () => {
  const e = { code: "JS_DISABLED", message: MSG.jsOff };
  const mcp = mcpLineRead({ isError: true, text: MCP_LINES.jsDisabled }, MCP_LINES.jsDisabled);
  const ok = { sdk: e, raw: e, noargs: e, mcp, snapshotOk: true, control: 1, before: 1, after: 1 };
  it("passes three exact refusals, the MCP's own line, the snapshot and an unmoved counter", () => expect(judgeArgs3(ok)).toEqual({ v: "PASS" }));
  it("an effect counter above its control is the STOP args-ran-js-off", () => expect(judgeArgs3({ ...ok, after: 2 })).toEqual({ v: "STOP", why: "args-ran-js-off" }));
  it("a control that does not answer 1 is the STOP existing-tool-changed", () => expect(judgeArgs3({ ...ok, control: 0 })).toEqual({ v: "STOP", why: "existing-tool-changed" }));
  it("a wrong message, data, or a text with a code on line 1 on the MCP leg fails", () => {
    expect(judgeArgs3({ ...ok, sdk: { ...e, message: "x" } }).v).toBe("FAIL");
    expect(judgeArgs3({ ...ok, raw: { ...e, data: {} } }).v).toBe("FAIL");
    expect(judgeArgs3({ ...ok, mcp: mcpLineRead({ isError: true, text: `JS_DISABLED\n${MCP_LINES.jsDisabled}` }, MCP_LINES.jsDisabled) }).v).toBe("FAIL");
    expect(judgeArgs3({ ...ok, snapshotOk: false }).v).toBe("FAIL");
  });
  it("an unread counter is NOT MEASURED", () => expect(judgeArgs3({ ...ok, after: null }).v).toBe("NOT MEASURED"));
});
describe("fixer 1: POP-OTHER round order (MAJOR 1)", () => {
  it("fronts O, reads the guard, clears the grants, and only then triggers", async () => {
    const seq: string[] = [];
    const r = await prepareRound({ front: async () => { seq.push("front"); }, guard: async () => { seq.push("guard"); return "fg" as const; }, reset: () => { seq.push("reset"); }, trigger: async (g) => { seq.push(`trigger:${g}`); return "sent"; } }, 0);
    expect(seq).toEqual(["front", "guard", "reset", "trigger:fg"]);
    expect(r.guard).toBe("fg");
    expect(r.trig).toBe("sent");
  });
  it("the human click is sent only when O is in front; a background O is never clicked", async () => {
    const got: string[] = [];
    const send = async (c: string): Promise<string> => { got.push(c); return "sent 1700000000123"; };
    expect(await clickGate("bg", send)).toBe("skip");
    expect(await clickGate("n/a", send)).toBe("skip");
    expect(got).toEqual(["skip", "skip"]);   // the click step's signal is given every time, with `skip` for a guard other than fg
    expect(await clickGate("fg", send)).toEqual({ at: 1700000000123 });
    expect(got[2]).toBe("go");
    expect(await clickGate("fg", async () => "unsent")).toBe("unsent");
    expect(await clickGate("fg", async () => "sent")).toBe("unsent");   // no stamp, no click time
  });
  it("a skipped (non-fg) round is not counted: the leg is NOT DISCRIMINATING, never a FAIL or a throw", () => {
    expect(judgePop("R", "human", three({ guard: "bg", grantedTo: "none", inMs: null }), { expect: "fg", consoleNew: 0 }).v).toBe("NOT DISCRIMINATING");
  });
  it("t0 comes from the click stamp the PowerShell side wrote, else from before the trigger", () => {
    expect(stampOf({ at: 123 })).toBe(123);
    expect(stampOf("sent")).toBeNull();
    expect(stampOf("skip")).toBeNull();
    expect(stampOf(undefined)).toBeNull();
  });
});
describe("fixer 1: the MCP leg of R20-ARGS-ORDER (MAJOR 3)", () => {
  const KEYED = { zeta: 1, alpha: 2, mid: { y: 1, x: 2 } };
  it("prints the key order read from the MCP's own text, never fixed words", () => {
    const page = mcpOrderLines("R20-ARGS-ORDER", { isError: false, text: JSON.stringify(KEYED) }, KEYED);
    expect(page[0]).toBe("KEYORDER R20-ARGS-ORDER leg=args keys=page nested=page elem=page json-equal=yes via=mcp");
    const sorted = mcpOrderLines("R20-ARGS-ORDER", { isError: false, text: JSON.stringify({ alpha: 2, mid: { x: 2, y: 1 }, zeta: 1 }) }, KEYED);
    expect(sorted[0]).toBe("KEYORDER R20-ARGS-ORDER leg=args keys=sorted nested=sorted elem=page json-equal=no via=mcp");
    expect(page).toContain("CHECK R20-ARGS-ORDER mcp RECORD not-discriminating");
  });
  it("a text that is not a JSON object yields no KEYORDER line, only the record", () => {
    const l = mcpOrderLines("R20-ARGS-ORDER", { isError: false, text: "description: Object" }, KEYED);
    expect(l.some((x) => x.startsWith("KEYORDER"))).toBe(false);
    expect(l).toContain("CHECK R20-ARGS-ORDER mcp RECORD not-discriminating");
  });
  it("compares each of the five values as the MCP printed them", () => {
    expect(mcpEqual({ isError: false, text: '{"a":1}' }, { a: 1 })).toEqual({ value: true, json: true });
    expect(mcpEqual({ isError: false, text: "Object" }, { a: 1 })).toEqual({ value: false, json: false });
    expect(mcpEqual({ isError: true, text: "1" }, 1)).toEqual({ value: false, json: false });
  });
});

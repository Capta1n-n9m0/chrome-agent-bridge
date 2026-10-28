// Step 11b S4-helpers H8: the typed-lines judges (F-HOME, R17-UP-OPT, RD-CAPS-WARN), the timed RULES windows, the history and
// gap judges, and their B17 subcommands. Pure: nothing here touches Chrome, the daemon or a port.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { main } from "../s11b";
import {
  HOME_TYPED, K17, K17_TEXT, OPT_TYPED, gapJudge, itemsFrom, judgeCallAnswer, judgeCaps, judgeFHome, judgeHistoryRow, judgeTimedRules, judgeUpOpt,
  k17Caps, k17OptItem, k17OptSum, parseOptSum,
} from "../s11b-rules";

const tmp = mkdtempSync(join(tmpdir(), "s11b-h8-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
let out: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
});
afterEach(() => {
  out = [];
});
afterAll(() => spy.mockRestore());
const run = async (...argv: string[]): Promise<{ code: number; text: string }> => {
  out = [];
  const code = await main(argv);
  return { code, text: out.join("\n") };
};

const home = (k: number, idx: number[]): string[] => idx.map((i) => k17OptItem(k + i, HOME_TYPED[i]!, K17_TEXT["K-opt-home"]));
const fhome = (over: Record<string, unknown> = {}): Parameters<typeof judgeFHome>[0] => ({
  foundSummary: k17OptSum(2, 1), standing: 1, summaryTyped: k17OptSum(3, 5), foundCount: 4, storedEqual: true,
  items: [k17OptItem(2, "old", "x"), ...home(5, [0, 1, 3, 4])], ...over,
});

describe("parseOptSum and itemsFrom", () => {
  it("reads K-opt-sum's three forms back", () => {
    expect(parseOptSum(k17OptSum(0, 0))).toEqual({ valid: 0, invalid: 0 });
    expect(parseOptSum(k17OptSum(1, 1))).toEqual({ valid: 1, invalid: 1 });
    expect(parseOptSum(k17OptSum(4, 3))).toEqual({ valid: 4, invalid: 3 });
    expect(parseOptSum("4 folders.")).toBeNull();
  });
  it("keeps the items from a line up, in line order, and accepts one scalar (PowerShell unrolls one-item arrays)", () => {
    expect(itemsFrom(["Line 9: b", "Line 2: a", "Line 5: c"], 5)).toEqual(["Line 5: c", "Line 9: b"]);
    expect(itemsFrom("Line 5: c", 5)).toEqual(["Line 5: c"]);
    expect(itemsFrom(undefined, 1)).toEqual([]);
  });
});

describe("F-HOME", () => {
  it("passes: f+1 valid and fi+4 invalid, four home items for k, k+1, k+3, k+4, the old item below k ignored", () => {
    expect(judgeFHome(fhome()).pass).toBe(true);
  });
  it("singular and zero forms follow K-opt-sum", () => {
    expect(judgeFHome(fhome({ foundSummary: k17OptSum(0, 0), summaryTyped: k17OptSum(1, 4) })).pass).toBe(true);
  });
  it("fails on the summary, a missing, an extra (the work line) or a warning item, the standing text and a stored change", () => {
    expect(judgeFHome(fhome({ summaryTyped: k17OptSum(3, 4) })).pass).toBe(false);
    expect(judgeFHome(fhome({ items: home(5, [0, 1, 3]) })).pass).toBe(false);
    expect(judgeFHome(fhome({ items: [...home(5, [0, 1, 2, 3, 4])] })).pass).toBe(false);
    expect(judgeFHome(fhome({ items: [...home(5, [0, 1, 3, 4]), k17OptItem(7, HOME_TYPED[2]!, "warning: x")] })).pass).toBe(false);
    expect(judgeFHome(fhome({ standing: 0 })).pass).toBe(false);
    expect(judgeFHome(fhome({ storedEqual: false })).pass).toBe(false);
    expect(judgeFHome(fhome({ foundSummary: "garbled" })).notMeasured).toBe(true);
  });
  it("types the sheet's five lines, the third a folder inside a home folder", () => {
    expect(HOME_TYPED).toHaveLength(5);
    expect(HOME_TYPED[2]).toBe(`${HOME_TYPED[0]}\\work`);
  });
});

describe("R17-UP-OPT", () => {
  const up = (over: Record<string, unknown> = {}): Parameters<typeof judgeUpOpt>[0] => ({
    foundSummary: k17OptSum(2, 0), standing: 1, summaryAfterSave: k17OptSum(3, 0), summaryTyped: k17OptSum(3, 3), summaryAfterRevert: k17OptSum(3, 0),
    foundCount: 2, storedEqual: true, firstTypedLine: 4, o2Ms: 900, o2Conflict: false, setSha: "a", storedSha: "a", storedWhileTypingSha: "a",
    items: [k17OptItem(4, OPT_TYPED[0]!, K17_TEXT["K-opt-rel"]), k17OptItem(5, OPT_TYPED[1]!, K17_TEXT["K-opt-root"]), k17OptItem(6, OPT_TYPED[2]!, K17_TEXT["K-opt-home"])],
    ...over,
  });
  it("passes with S0F-a's expectations: rel, root and home items, fi+3 while typed", () => {
    expect(judgeUpOpt(up()).pass).toBe(true);
    expect(judgeUpOpt(up({ foundSummary: k17OptSum(2, 1), summaryAfterSave: k17OptSum(3, 1), summaryTyped: k17OptSum(3, 4), summaryAfterRevert: k17OptSum(3, 1) })).pass).toBe(true);
  });
  it("fails on a summary, the third item (Run 16's warning text), the shas, a conflict and an O2 time over 5 000 ms (6 061 failed in Run 16)", () => {
    expect(judgeUpOpt(up({ summaryTyped: k17OptSum(3, 2) })).pass).toBe(false);
    expect(judgeUpOpt(up({ items: [...(up().items as string[]).slice(0, 2), k17OptItem(6, OPT_TYPED[2]!, "warning: x")] })).pass).toBe(false);
    expect(judgeUpOpt(up({ storedSha: "b" })).pass).toBe(false);
    expect(judgeUpOpt(up({ storedWhileTypingSha: "b" })).pass).toBe(false);
    expect(judgeUpOpt(up({ o2Conflict: true })).pass).toBe(false);
    expect(judgeUpOpt(up({ o2Ms: 6061 })).pass).toBe(false);
    expect(judgeUpOpt(up({ o2Ms: 5000 })).pass).toBe(true);
  });
  it("the row text of an O2 over the bound does not say O2 showed the text (Run 18 helper note 2: a never-shown O2 feeds its polled time)", () => {
    const j = judgeUpOpt(up({ o2Ms: 15136 }));
    expect(j.pass).toBe(false);
    expect(j.why).toBe("O2 did not show the saved text within 5 000 ms (observed 15136 ms)");
  });
});

describe("RD-CAPS-WARN", () => {
  it("passes on K-caps for line bl+2, then lines bl+2, bl+3 (the sheet's two forms)", () => {
    expect(judgeCaps({ bl: 3, afterTwo: [k17Caps([5])], afterThree: [k17Caps([5, 6])], storedEqual: true }).pass).toBe(true);
    expect(judgeCaps({ bl: 0, afterTwo: k17Caps([2]), afterThree: [k17Caps([2, 3])], storedEqual: true }).pass).toBe(true);
  });
  it("fails on H119 warned (a second item), a wrong line, no item, or a stored change", () => {
    expect(judgeCaps({ bl: 3, afterTwo: [k17Caps([4]), k17Caps([5])], afterThree: [k17Caps([5, 6])], storedEqual: true }).pass).toBe(false);
    expect(judgeCaps({ bl: 3, afterTwo: [k17Caps([4])], afterThree: [k17Caps([5, 6])], storedEqual: true }).pass).toBe(false);
    expect(judgeCaps({ bl: 3, afterTwo: [k17Caps([5])], afterThree: [], storedEqual: true }).pass).toBe(false);
    expect(judgeCaps({ bl: 3, afterTwo: [k17Caps([5])], afterThree: [k17Caps([5, 6])], storedEqual: false }).pass).toBe(false);
  });
});

describe("timed RULES windows", () => {
  const at = (t0: number, ns: number[]): Array<{ t: number; n: number }> => ns.map((n, i) => ({ t: t0 + i * 100, n }));
  it("at: the samples 2.3-2.7 s after the send equal N and 0 after the reply (RD-5b, RD-DISARM)", () => {
    const ns = Array.from({ length: 70 }, (_, i) => (i < 8 ? 1 : i < 40 ? 3 : 0));
    const r = judgeTimedRules("at", at(0, ns), 0, 4000, 3);
    expect(r.window).toEqual([3, 3, 3, 3, 3]);
    expect(r.after).toBe(0);
    expect(r.verdict.pass).toBe(true);
    expect(judgeTimedRules("at", at(0, ns), 0, 4000, 2).verdict.pass).toBe(false);
  });
  it("at: a rule left after the reply is a STOP, no sample after the reply is NOT MEASURED", () => {
    const stuck = at(0, Array.from({ length: 70 }, () => 3));
    expect(judgeTimedRules("at", stuck, 0, 4000, 3).verdict.stop).toBe(true);
    expect(judgeTimedRules("at", at(0, [3, 3, 3]), 0, 4000, 3).verdict.notMeasured).toBe(true);
  });
  it("inflight: never 0 from 300 ms after the send to 300 ms before the reply (RD-REBUILD-NARROW)", () => {
    const ok = judgeTimedRules("inflight", at(0, Array.from({ length: 70 }, (_, i) => (i < 40 ? 2 : 0))), 0, 4000);
    expect(ok.verdict.pass).toBe(true);
    const bad = judgeTimedRules("inflight", at(0, Array.from({ length: 70 }, (_, i) => (i === 15 ? 0 : i < 40 ? 2 : 0))), 0, 4000);
    expect(bad.verdict.pass).toBe(false);
  });
  it("empty: max 0 from the send to the reply (RD-BACK-EMPTY)", () => {
    expect(judgeTimedRules("empty", at(0, [0, 0, 0, 0]), 0, 300).verdict.pass).toBe(true);
    expect(judgeTimedRules("empty", at(0, [0, 1, 0, 0]), 0, 300).verdict.pass).toBe(false);
  });
});

describe("history rows", () => {
  const ok = { kind: "ok", ms: 2000, rulesAfter: 0, blocked: 0, flipTotal: 2 };
  it("RD-BACK / RD-FWD: blocked 0 and two flip requests; ok or K-tab; <= 12 000 ms", () => {
    expect(judgeHistoryRow("RD-BACK", ok).pass).toBe(true);
    expect(judgeHistoryRow("RD-FWD", { ...ok, kind: "K-tab" }).pass).toBe(true);
    expect(judgeHistoryRow("RD-BACK", { ...ok, blocked: 1 }).pass).toBe(false);
    expect(judgeHistoryRow("RD-BACK", { ...ok, flipTotal: 1 }).nd).toBe(true);
    expect(judgeHistoryRow("RD-BACK", { ...ok, ms: 12001 }).pass).toBe(false);
    expect(judgeHistoryRow("RD-BACK", { ...ok, kind: "DISARMED" }).pass).toBe(false);
    expect(judgeHistoryRow("RD-BACK", { ...ok, rulesAfter: 2 }).stop).toBe(true);
  });
  it("RD-BACK-SAMEDOC: ok in under 1 000 ms", () => {
    expect(judgeHistoryRow("RD-BACK-SAMEDOC", { kind: "ok", ms: 999, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeHistoryRow("RD-BACK-SAMEDOC", { kind: "ok", ms: 1000, rulesAfter: 0 }).pass).toBe(false);
  });
  it("RD-BACK-EMPTY: any answer but ok, or a rule, is a row-level STOP", () => {
    expect(judgeHistoryRow("RD-BACK-EMPTY", { kind: "ok", ms: 50, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeHistoryRow("RD-BACK-EMPTY", { kind: "K-tab", ms: 50, rulesAfter: 0 }).stop).toBe(true);
    expect(judgeHistoryRow("RD-BACK-EMPTY", { kind: "ok", ms: 50, rulesAfter: 1 }).stop).toBe(true);
  });
  it("RULES not measured never lets a row pass", () => {
    expect(judgeHistoryRow("RD-BACK", { ...ok, rulesAfter: null }).notMeasured).toBe(true);
    expect(judgeHistoryRow("RD-BACK", { ...ok, rulesAfter: null, blocked: 3 }).pass).toBe(false);
  });
});

describe("call answers and the gap", () => {
  it("tab-or-url takes K-tab or K-url exactly; disarmed needs its data; ok means no error", () => {
    expect(judgeCallAnswer("tab-or-url", K17["K-tab"], "x").pass).toBe(true);
    expect(judgeCallAnswer("tab-or-url", K17["K-url"], "x").pass).toBe(true);
    expect(judgeCallAnswer("tab-or-url", { code: "DOMAIN_BLOCKED", message: "other" }, "x").pass).toBe(false);
    expect(judgeCallAnswer("tab-or-url", undefined, "x").pass).toBe(false);
    expect(judgeCallAnswer("disarmed", K17["K-disarmed"], "x").pass).toBe(true);
    expect(judgeCallAnswer("disarmed", { code: K17["K-disarmed"].code, message: K17["K-disarmed"].message }, "x").pass).toBe(false);
    expect(judgeCallAnswer("ok", undefined, "x").pass).toBe(true);
    expect(judgeCallAnswer("url", K17["K-url"], "x").pass).toBe(true);
  });
  it("GAP is call minus press; over 1 000 ms or a call before the read-back is NOT DISCRIMINATING", () => {
    expect(gapJudge(1000, 1500, 1800)).toMatchObject({ line: "GAP 800 ms", verdict: { pass: true } });
    expect(gapJudge(1000, 1500, 2100).verdict.nd).toBe(true);
    expect(gapJudge(1000, 1500, 1400).verdict.nd).toBe(true);
  });
});

describe("the subcommands", () => {
  const obs = (name: string, o: unknown): string => {
    writeFileSync(join(tmp, name), JSON.stringify(o));
    return join(tmp, name);
  };
  it("judge-opt reads an observation file outside the repo and prints the ROW line; a file inside the repo is a STOP", async () => {
    const r = await run("judge-opt", "--kind", "caps", "--obs", obs("c.json", { bl: 1, afterTwo: k17Caps([3]), afterThree: [k17Caps([3, 4])], storedEqual: true }));
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/^ROW RD-CAPS-WARN PASS/);
    const f = await run("judge-opt", "--kind", "fhome", "--obs", obs("f.json", fhome({ storedEqual: false })));
    expect(f.code).toBe(1);
    expect((await run("judge-opt", "--kind", "caps", "--obs", "package.json")).code).toBe(2);
    expect((await run("judge-opt", "--kind", "zzz", "--obs", obs("z.json", {}))).code).toBe(2);
  });
  it("judge-history and judge-gap print their ROW and GAP lines with the right exit", async () => {
    const h = await run("judge-history", "--row", "RD-BACK", "--answer", "ok", "--ms", "1500", "--blocked", "0", "--flip-total", "2", "--rules-after", "0");
    expect(h).toMatchObject({ code: 0 });
    expect(h.text).toMatch(/^ROW RD-BACK PASS/);
    expect((await run("judge-history", "--row", "RD-BACK", "--answer", "ok", "--ms", "1500", "--blocked", "0", "--flip-total", "1", "--rules-after", "0")).code).toBe(3);
    expect((await run("judge-history", "--row", "RD-BACK-EMPTY", "--answer", "DISARMED", "--ms", "10", "--rules-after", "0")).code).toBe(2);
    expect((await run("judge-history", "--row", "RD-BACK", "--answer", "ok", "--ms", "10", "--blocked", "0", "--flip-total", "2")).code).toBe(3);
    const g = await run("judge-gap", "--press", "100", "--readback", "400", "--call", "500");
    expect(g.code).toBe(0);
    expect(g.text.split("\n")[0]).toBe("GAP 400 ms");
  });
  it("rules --mode reads the timed line against a call's times", async () => {
    const dump = join(tmp, "t.txt");
    const body = `RULES timed t0=1000 [${Array.from({ length: 60 }, (_, i) => `${i * 100}:${i < 40 ? 2 : 0}`).join(",")}]`;
    writeFileSync(dump, `> echo\r\nundefined\r\n${body}\r\n`);
    const r = await run("rules", "--read", dump, "--mode", "at", "--send", "1000", "--reply", "4800", "--expect", "2", "--row", "RD-5B");
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/RULES samples=\[2,2,2,2,2\] min=2 max=2/);
    expect(r.text).toContain("RULES after=0");
    expect((await run("rules", "--read", dump, "--mode", "at", "--send", "1000", "--reply", "4800", "--expect", "3")).code).toBe(1);
    expect((await run("rules", "--read", dump, "--mode", "zzz", "--send", "1", "--reply", "2")).code).toBe(2);
    writeFileSync(dump, "RULES 0\r\n");
    expect((await run("rules", "--read", dump, "--mode", "at", "--send", "1", "--reply", "2")).code).toBe(3);
  });
  it("call parses and says what it would do (--dry), and refuses a bad expectation, op or signal name", async () => {
    const a = ["call", "--row", "RD-5B", "--op", "navigate", "--tab", "r5b", "--url", "http://x.test/", "--signal", "RD-5B"];
    expect(await run(...a, "--expect", "tab-or-url", "--dry")).toEqual({ code: 0, text: "PLAN call ok row=RD-5B op=navigate expect=tab-or-url go=no" });
    expect((await run(...a, "--expect", "maybe", "--dry")).code).toBe(2);
    expect((await run("call", "--row", "R", "--op", "kill", "--url", "u", "--signal", "S", "--expect", "ok", "--dry")).code).toBe(2);
    expect((await run("call", "--row", "R", "--op", "download", "--url", "u", "--signal", "a/b", "--expect", "ok", "--dry")).code).toBe(2);
  });
});

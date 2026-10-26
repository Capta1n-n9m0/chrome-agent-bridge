// Tests for recipes/s11b-rules.ts sections H3a-H3c: RULES sampling, FOUNDLIST, timing lines and the row judges.
import { describe, expect, it } from "vitest";
import {
  K17,
  RD_CTL_LIMITS,
  callLine,
  ctlFlipLine,
  ctlRowLine,
  dlHopD,
  dlHopReading,
  expectedRuleCount,
  foundList,
  gapLine,
  judgeBackEmpty,
  judgeCtl,
  judgeDlErrTrial,
  judgeDlHopTrial,
  judgeGap,
  judgeHistory,
  judgeInFlight,
  judgeRaceA,
  judgeSamedoc,
  judgeSampleThenZero,
  judgeSocket,
  latLine,
  recordLine,
  row17Line,
  rulesExpectLine,
  rulesSamplesLine,
  sampleWindow,
  socketLine,
} from "../s11b-rules.js";

describe("RULES sampling", () => {
  const s = [
    { t: 1000, n: 0 },
    { t: 1300, n: 1 },
    { t: 1400, n: 1 },
    { t: 4700, n: 2 },
    { t: 4701, n: 0 },
  ];
  it("keeps samples from send+300 to reply-300, edges included", () => {
    expect(sampleWindow(s, 1000, 5000)).toEqual([1, 1, 2]);
    expect(sampleWindow(s, 1001, 5000)).toEqual([1, 2]);
    expect(sampleWindow(s, 1000, 4999)).toEqual([1, 1]);
  });
  it("prints the sheet's line form and none for an empty window", () => {
    expect(rulesSamplesLine([1, 1, 2])).toBe("RULES samples=[1,1,2] min=1 max=2");
    expect(rulesSamplesLine([])).toBeNull();
    expect(rulesExpectLine(3)).toBe("RULES expect=3");
  });
  it("counts the rules of found + BLK, found lines kept", () => {
    expect(expectedRuleCount("")).toBe(1);
    expect(expectedRuleCount("one.test\ntwo.test")).toBe(2);
    expect(expectedRuleCount("one.test:9000")).toBe(2);
    expect(expectedRuleCount("one.test\ntwo.test:9000")).toBe(3);
  });
  it("RD-REBUILD-NARROW: min >= 1 in flight and 0 after", () => {
    expect(judgeInFlight([1, 2], 0).pass).toBe(true);
    expect(judgeInFlight([1, 0, 1], 0).pass).toBe(false);
    expect(judgeInFlight([1], 1).pass).toBe(false);
    expect(judgeInFlight([], 0).notMeasured).toBe(true);
  });
  it("RD-5b / RD-DISARM: sample = N then 0", () => {
    expect(judgeSampleThenZero([2, 2], 2, 0).pass).toBe(true);
    expect(judgeSampleThenZero([2, 1], 2, 0).pass).toBe(false);
    expect(judgeSampleThenZero([1], 1, 0).pass).toBe(true);
    expect(judgeSampleThenZero([2], 2, 1)).toMatchObject({ pass: false, stop: true });
    expect(judgeSampleThenZero([], 2, 0).notMeasured).toBe(true);
  });
  it("RD-BACK-EMPTY: max = 0", () => {
    expect(judgeBackEmpty([0, 0]).pass).toBe(true);
    expect(judgeBackEmpty([0, 1]).pass).toBe(false);
    expect(judgeBackEmpty([]).notMeasured).toBe(true);
  });
});

describe("FOUNDLIST", () => {
  it("is no for a list that blocks no fixture and yes (a STOP) for one that does", () => {
    expect(foundList("bank.test\nother.test:443")).toMatchObject({ blocks: false, line: "FOUNDLIST blocks-fixtures=no" });
    expect(foundList("").blocks).toBe(false);
    const y = foundList("localhost");
    expect(y).toMatchObject({ blocks: true, line: "FOUNDLIST blocks-fixtures=yes" });
    expect(y.verdict.stop).toBe(true);
    expect(foundList("127.0.0.1:8091").blocks).toBe(true);
    expect(foundList("*.localhost").blocks).toBe(false); // subdomains only
    expect(foundList("localhost:8085").blocks).toBe(true);
  });
});

describe("timing lines", () => {
  it("LAT and GAP", () => {
    expect(latLine("RD-1", 123.4)).toBe("LAT RD-1 123 ms");
    expect(gapLine(88)).toBe("GAP 88 ms");
  });
  it("RD-5 GAP: <= 1000 and call start at or after the read-back", () => {
    expect(judgeGap({ pressT: 0, readbackT: 400, callT: 1000 })).toMatchObject({ pass: true });
    const late = judgeGap({ pressT: 0, readbackT: 400, callT: 1001 });
    expect(late).toMatchObject({ pass: false, nd: true });
    const early = judgeGap({ pressT: 0, readbackT: 400, callT: 399 });
    expect(early).toMatchObject({ pass: false, nd: true });
    expect(judgeGap({ pressT: 0, readbackT: 400, callT: 400 }).pass).toBe(true);
  });
});

describe("RD-CTL", () => {
  const two = (a: number, b: number, st = 302) => [
    { status: st, ms: a },
    { status: st, ms: b },
  ];
  const good = {
    idleSocket: true,
    ports: { 8083: two(10, 20), 8088: two(10, 20), 8089: two(10, 20), 8086: two(4000, 5000) },
    flip: [200, 302] as [number, number],
    ctlBlocked: 1,
  };
  it("line forms", () => {
    expect(ctlRowLine(two(12, 14), true)).toBe("ROW RD-CTL concurrent 302 in 12 ms, 302 in 14 ms (idle socket held open: yes)");
    expect(ctlFlipLine([200, 302])).toBe("CTL 8091 flip 200 then 302");
    expect(RD_CTL_LIMITS[8086]).toBe(5000);
  });
  it("passes when every control holds, bounds inclusive", () => {
    const r = judgeCtl({ ...good, ports: { ...good.ports, 8083: two(1000, 1000) } });
    expect(r.verdict.pass).toBe(true);
    expect(r.lines).toContain("CTL 8091 flip 200 then 302");
  });
  it("every miss is a STOP", () => {
    for (const bad of [
      { ...good, ports: { ...good.ports, 8088: two(10, 1001) } },
      { ...good, ports: { ...good.ports, 8086: two(10, 5001) } },
      { ...good, ports: { ...good.ports, 8089: two(10, 20, 200) } },
      { ...good, flip: [200, 200] as [number, number] },
      { ...good, ctlBlocked: 0 },
      { ...good, ctlBlocked: 2 },
      { ...good, idleSocket: false },
    ])
      expect(judgeCtl(bad).verdict).toMatchObject({ pass: false, stop: true });
  });
});

describe("RD-BACK / RD-FWD / RD-BACK-SAMEDOC", () => {
  const base = { blocked: 0, flipTotal: 2, replyMs: 3000, answer: "ok" as const, rulesAfter: 0 };
  it("passes with ok or K-tab", () => {
    expect(judgeHistory(base).pass).toBe(true);
    expect(judgeHistory({ ...base, answer: K17["K-tab"] }).pass).toBe(true);
  });
  it("fails on blocked, another answer, a slow reply", () => {
    expect(judgeHistory({ ...base, blocked: 1 }).pass).toBe(false);
    expect(judgeHistory({ ...base, answer: { code: "TIMEOUT", message: "x" } }).pass).toBe(false);
    expect(judgeHistory({ ...base, answer: { ...K17["K-tab"], data: { a: 1 } } }).pass).toBe(false);
    expect(judgeHistory({ ...base, replyMs: 12000 }).pass).toBe(true);
    expect(judgeHistory({ ...base, replyMs: 12001 }).pass).toBe(false);
  });
  it("one request is NOT DISCRIMINATING; none is not measured; a rule left is a STOP", () => {
    expect(judgeHistory({ ...base, flipTotal: 1 })).toMatchObject({ pass: false, nd: true });
    expect(judgeHistory({ ...base, flipTotal: 0 }).notMeasured).toBe(true);
    expect(judgeHistory({ ...base, rulesAfter: 1 }).stop).toBe(true);
  });
  it("a failure outranks not discriminating", () => {
    expect(judgeHistory({ ...base, flipTotal: 1, blocked: 1 }).nd).toBeUndefined();
  });
  it("same-document back is under 1000 ms", () => {
    expect(judgeSamedoc({ replyMs: 999, answer: "ok", rulesAfter: 0 }).pass).toBe(true);
    expect(judgeSamedoc({ replyMs: 1000, answer: "ok", rulesAfter: 0 }).pass).toBe(false);
    expect(judgeSamedoc({ replyMs: 10, answer: K17["K-tab"], rulesAfter: 0 }).pass).toBe(false);
  });
});

describe("RD-DL-*", () => {
  it("d is the median difference, read per the sheet's three readings", () => {
    expect(dlHopD([10, 20, 300], [310, 320, 900])).toBe(20 - 320);
    expect(dlHopReading(-300)).toMatch(/in hand at the rejection/);
    expect(dlHopReading(-250)).toMatch(/in hand/);
    expect(dlHopReading(0)).toMatch(/revisit trigger of #303/);
    expect(dlHopReading(50)).toMatch(/revisit trigger/);
    expect(dlHopReading(51)).toMatch(/unexplained/);
    expect(dlHopReading(-150)).toMatch(/between/);
    expect(dlHopReading(NaN)).toMatch(/not measured/);
  });
  it("hop trial: K-url, no data, no file, blocked 0, rules 0", () => {
    const o = { answer: K17["K-url"], fileExists: false, blocked: 0, rulesAfter: 0 };
    expect(judgeDlHopTrial(o).pass).toBe(true);
    expect(judgeDlHopTrial({ ...o, fileExists: true }).pass).toBe(false);
    expect(judgeDlHopTrial({ ...o, blocked: 1 }).pass).toBe(false);
    expect(judgeDlHopTrial({ ...o, answer: K17["K-tab"] }).pass).toBe(false);
    expect(judgeDlHopTrial({ ...o, rulesAfter: 1 }).stop).toBe(true);
  });
  it("err trial: not DOMAIN_BLOCKED; a text other than K-fetch is recorded, not failed", () => {
    const f = K17["K-fetch"];
    expect(judgeDlErrTrial({ answer: f, rulesAfter: 0 })).toMatchObject({ pass: true });
    expect(judgeDlErrTrial({ answer: { code: "INTERNAL", message: "other" }, rulesAfter: 0 }).why).toMatch(/NOT as pre-written/);
    expect(judgeDlErrTrial({ answer: { code: "INTERNAL", message: "other" }, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeDlErrTrial({ answer: K17["K-url"], rulesAfter: 0 }).pass).toBe(false);
    expect(judgeDlErrTrial({ answer: f, rulesAfter: 2 }).stop).toBe(true);
  });
  it("SOCKET line and judge", () => {
    expect(socketLine([true, true, false])).toBe("SOCKET samples=3 connected=2");
    const ok = { samples: [true, true], callsOk: 12, calls: 12, rulesAfter: 0 };
    expect(judgeSocket(ok).pass).toBe(true);
    expect(judgeSocket({ ...ok, samples: [true, false] }).pass).toBe(false);
    expect(judgeSocket({ ...ok, callsOk: 11 }).pass).toBe(false);
    expect(judgeSocket({ ...ok, samples: [] }).notMeasured).toBe(true);
    expect(judgeSocket({ ...ok, rulesAfter: 1 }).stop).toBe(true);
  });
});

describe("R17-UP-RACE-A", () => {
  const c = (n: number, start: number, outcome: string) => ({ n, start, reply: start + 50, outcome });
  it("CALL line", () => {
    expect(callLine(c(3, 450, "ok"))).toBe("CALL 3 start=450 reply=500 ok");
    expect(callLine(c(4, 600, "DISARMED"))).toBe("CALL 4 start=600 reply=650 DISARMED");
  });
  it("no ok from a call started at or after P + 1000", () => {
    const calls = [c(1, 0, "ok"), c(2, 1500, "ok"), c(3, 2000, "DISARMED")];
    expect(judgeRaceA(calls, 1500).verdict.pass).toBe(true);
    expect(judgeRaceA([...calls, c(4, 2500, "ok")], 1500).verdict.pass).toBe(false);
    // exactly P + 1000 counts as late
    expect(judgeRaceA([c(1, 0, "ok"), c(2, 100, "DISARMED"), c(3, 2500, "ok")], 1500).verdict.pass).toBe(false);
    expect(judgeRaceA([c(1, 0, "ok"), c(2, 100, "DISARMED"), c(3, 2499, "ok")], 1500).verdict.pass).toBe(true);
  });
  it("needs an ok and a refusal, else not discriminating; records first refusal start minus P", () => {
    expect(judgeRaceA([c(1, 0, "ok"), c(2, 100, "ok")], 1500).verdict).toMatchObject({ pass: false, nd: true });
    expect(judgeRaceA([c(1, 0, "DISARMED")], 1500).verdict.nd).toBe(true);
    const r = judgeRaceA([c(1, 0, "ok"), c(2, 1700, "DISARMED"), c(3, 1600, "DISARMED")], 1500);
    expect(r.record).toBe("RECORD R17-UP-RACE-A first-refusal-after-P=100 ms");
  });
});

describe("row and record lines", () => {
  it("prints PASS, FAIL, NOT MEASURED, NOT DISCRIMINATING and STOP", () => {
    expect(row17Line("X", { pass: true, why: "w" })).toBe("ROW X PASS: w");
    expect(row17Line("X", { pass: false, why: "w" })).toBe("ROW X FAIL: w");
    expect(row17Line("X", { pass: false, notMeasured: true, why: "w" })).toBe("ROW X NOT MEASURED: w");
    expect(row17Line("X", { pass: false, nd: true, why: "w" })).toBe("ROW X NOT DISCRIMINATING: w");
    expect(row17Line("X", { pass: false, stop: true, why: "w" })).toBe("ROW X STOP: w");
  });
  it("RECORD line", () => {
    expect(recordLine("RD-BACK", { answer: "ok", reply: 812, loading: false })).toBe("RECORD RD-BACK answer=ok reply=812 loading=false");
  });
});

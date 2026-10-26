// recipes/s11b.ts, H5: the SDK subcommands' pure parts and their argument parsing (--dry never connects).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { answerText, devtJudges, main, RAW_DEFAULTS, refusalStepJudge, SUBCOMMANDS, windowed, worst, type WinIo } from "../s11b";
import {
  historyPlan, judgeErr17, K17, k17RawDir, k17RawMissing, RACE_MAX_CALLS, RACE_MIN_CALLS, raceDone17, raceDue, windowViolations,
} from "../s11b-rules";
import { rawLeaks, type PageObs } from "../s11-rules";

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
const clean: PageObs = { files: [], change: 0, input: 0, trusted: [], markAdded: 0, markRemoved: 0, carriersLeft: 0 };

describe("argument parsing (dry runs; nothing connects)", () => {
  it("lists the H5 subcommands", () => {
    expect(SUBCOMMANDS).toEqual(expect.arrayContaining(["back", "forward", "history", "socket", "race", "devt", "up6", "raw"]));
  });
  const ok: Array<[string[], RegExp]> = [
    [["back", "--row", "RD-BACK", "--tab", "r1", "--dry"], /^PLAN back ok row=RD-BACK op=back times=1$/],
    [["forward", "--row", "RD-FWD", "--tab", "T3", "--times", "2", "--dry"], /^PLAN forward ok row=RD-FWD op=forward times=2$/],
    [["history", "--kind", "fwd", "--tab", "r1", "--dry"], /^PLAN history ok kind=fwd navigations=3 backs=2$/],
    [["socket", "--for", "40000", "--signal-file", "x", "--dry"], /^PLAN socket ok for=40000 every=250 signal=yes$/],
    [["race", "--dry"], /^PLAN race ok id=UP-RACE-A spacing=150 calls=60\.\.120$/],
    [["devt", "--dry"], /^PLAN devt ok id=UP-DEVT controls=2$/],
    [["up6", "--dry", "--no-sampler"], /^PLAN up6 ok steps=5 window=-500\.\.\+2500$/],
    [["raw", "--row", "F-RAW-2", "--dry"], /^PLAN raw ok row=F-RAW-2$/],
  ];
  it.each(ok)("%j", async (argv, re) => {
    const r = await run(...argv);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(re);
  });
  it.each([
    [["back", "--tab", "r1", "--dry"], /--row is one of/],
    [["back", "--row", "RD-BACK", "--dry"], /needs --tab/],
    [["forward", "--row", "RD-FWD", "--tab", "r1", "--times", "3", "--dry"], /--times is 1 or 2/],
    [["history", "--kind", "up", "--tab", "r1", "--dry"], /--kind is/],
    [["socket", "--dry"], /needs --for/],
    [["raw", "--row", "F-RAW-X", "--dry"], /--row is one of/],
  ])("refuses %j", async (argv, re) => {
    const r = await run(...(argv as string[]));
    expect(r.code).toBe(2);
    expect(r.text).toMatch(re);
  });
});

describe("history plan, the sheet's URLs and tags", () => {
  it("RD-BACK: the flip page first, then an 8081 page", () => {
    expect(historyPlan("back")).toEqual({ urls: ["http://localhost:8091/h/back?s11b=bk", "http://localhost:8081/e2e-playground.html?s11b=bkp"], backs: 0 });
  });
  it("RD-FWD: P0, P1, the flip page, then back twice", () => {
    const p = historyPlan("fwd");
    expect(p.urls).toEqual(["http://localhost:8081/e2e-playground.html?s11b=fw0", "http://localhost:8081/e2e-playground.html?s11b=fw1", "http://localhost:8091/h/fwd?s11b=fw"]);
    expect(p.backs).toBe(2);
  });
  it("same-document and empty-list histories", () => {
    expect(historyPlan("samedoc").urls[1]).toBe(`${historyPlan("samedoc").urls[0]}#h2`);
    expect(historyPlan("empty").urls).toHaveLength(2);
  });
});

describe("race pacing", () => {
  it("is scheduled from the ready signal, 150 ms apart, never from the reply", () => {
    expect([1, 2, 3, 60].map(raceDue)).toEqual([0, 150, 300, 8850]);
  });
  it("runs at least 60 and at most 120 calls", () => {
    expect(raceDone17(Array(59).fill("DISARMED"))).toBe(false);
    expect(raceDone17([...Array(55).fill("ok"), ...Array(5).fill("DISARMED")])).toBe(true);
    expect(raceDone17([...Array(70).fill("ok"), "DISARMED", "DISARMED"])).toBe(false);
    expect(raceDone17(Array(RACE_MAX_CALLS).fill("ok"))).toBe(true);
    expect(RACE_MIN_CALLS).toBe(60);
  });
});

describe("the banner window", () => {
  it("counts only other calls inside [call - 500, reply + 2 500]", () => {
    expect(windowViolations([{ start: 0, end: 500 }], 1000, 1100)).toBe(1);
    expect(windowViolations([{ start: 0, end: 499 }], 1000, 1100)).toBe(0);
    expect(windowViolations([{ start: 3601, end: 3700 }], 1000, 1100)).toBe(0);
    expect(windowViolations([{ start: 3600, end: 3700 }], 1000, 1100)).toBe(1);
  });
  it("runs the handshake in order with the quiet times, and reports seen", async () => {
    const log: string[] = [];
    let t = 0;
    const io: WinIo = {
      signal: (n) => void log.push(`signal ${n}`),
      pressed: async (n) => (log.push(`pressed ${n}`), n.endsWith("-sampled") ? "seen" : "done"),
      sleep: async (ms) => void ((t += ms), log.push(`sleep ${ms}`)),
      now: () => t,
    };
    const w = await windowed(io, "X", [], async () => (log.push("call"), 7));
    expect(log).toEqual(["signal X-sample", "pressed X-sample", "sleep 500", "call", "sleep 2500", "signal X-sampled", "pressed X-sampled"]);
    expect(w).toMatchObject({ v: 7, banner: true, violations: 0 });
  });
  it("a second own call or an earlier overlapping call is a violation; no sampler leaves the banner unmeasured", async () => {
    const spans = [{ start: 0, end: 10 }];
    const w = await windowed(null, "X", spans, async () => (spans.push({ start: 5, end: 6 }, { start: 7, end: 8 }), 1));
    expect(w.banner).toBeNull();
    expect(w.violations).toBeGreaterThanOrEqual(1);
  });
});

describe("judges with injected outcomes", () => {
  const gate = { code: K17["K-gate"].code, message: K17["K-gate"].message };
  it("exact error: code, message, and no data", () => {
    expect(judgeErr17(gate, K17["K-gate"], "s").pass).toBe(true);
    expect(judgeErr17({ ...gate, data: {} }, K17["K-gate"], "s").pass).toBe(false);
    expect(judgeErr17({ ...gate, message: "x" }, K17["K-gate"], "s").pass).toBe(false);
    expect(judgeErr17(undefined, K17["K-gate"], "s").pass).toBe(false);
  });
  it("a refusal step needs the error, a clean page, a quiet window and no banner", () => {
    const w = { banner: false, violations: 0 };
    expect(refusalStepJudge("s", gate, K17["K-gate"], clean, w).pass).toBe(true);
    expect(refusalStepJudge("s", gate, K17["K-gate"], clean, { ...w, banner: true }).why).toMatch(/banner seen/);
    expect(refusalStepJudge("s", gate, K17["K-gate"], clean, { ...w, violations: 1 }).why).toMatch(/other bridge call/);
    expect(refusalStepJudge("s", gate, K17["K-gate"], { ...clean, markAdded: 1 }, w).pass).toBe(false);
    expect(refusalStepJudge("s", gate, K17["K-gate"], clean, { ...w, banner: null }).notMeasured).toBe(true);
  });
  it("the raw refusals name the index and are the K17 texts", () => {
    expect(judgeErr17(k17RawMissing(1), k17RawMissing(1), "r").pass).toBe(true);
    expect(judgeErr17(k17RawMissing(0), k17RawMissing(1), "r").pass).toBe(false);
    expect(k17RawDir(0).message).toContain("paths[0] is a folder");
  });
  it("DevTools: a control that does not fail is NOT MEASURED, never a product failure", () => {
    const devt = { code: K17["K-devt"].code, message: K17["K-devt"].message };
    const opened = { ...clean, markAdded: 1, markRemoved: 1 };
    expect(devtJudges(undefined, devt, undefined, opened)[0]).toMatchObject({ notMeasured: true, why: "DevTools was not attached" });
    expect(worst(devtJudges(devt, devt, undefined, opened)).pass).toBe(true);
    expect(worst(devtJudges(devt, undefined, undefined, opened)).pass).toBe(false);
    expect(worst(devtJudges(devt, devt, devt, opened)).pass).toBe(false);
  });
  it("worst: a failure outranks NOT MEASURED", () => {
    expect(worst([{ pass: false, notMeasured: true, why: "a" }, { pass: false, why: "b" }]).why).toBe("b");
  });
});

describe("what is printed, and the path-leak check", () => {
  it("shows a message only when it is one of the sheet's texts", () => {
    expect(answerText(undefined)).toBe("ok");
    expect(answerText({ code: "UPLOAD_REFUSED", message: K17["K-gate"].message })).toContain(K17["K-gate"].message);
    expect(answerText({ code: "BAD_PARAMS", message: "C:\\secret\\file.bin" })).toBe("BAD_PARAMS <message len=18>");
  });
  it("counts a path in slash, backslash and JSON-escaped forms, case-insensitively", () => {
    const root = "C:\\w\\wave\\root";
    expect(rawLeaks(`a ${root} b ${root.replace(/\\/g, "/")} c ${JSON.stringify(root)}`, [root])).toBe(3 + 0);
    expect(rawLeaks(k17RawMissing(0).message, [root, "s11-missing.bin", RAW_DEFAULTS.enc])).toBe(0);
    expect(rawLeaks("see S11-MISSING.BIN", ["s11-missing.bin"])).toBe(1);
  });
});

// Step 11b S7-helpers H1: Run 17b's history helpers (docs/e2e-test-plan.md section 4.25): the activation guard, the three-page plan,
// --activate in place of NOT BUILT, the STOP for a refused target call, the new line forms compared with the sheet by key.
import { BridgeError } from "@bridge/shared/error";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { main, SUBCOMMANDS } from "../s11b";
import { histNotBuilt17, historyPlan, judgeHistoryRow, K17, type Scan17Ctx } from "../s11b-rules";
import {
  ACT_STOP_LINE, actLine, ctlSlowLine, guardedActivate, histLine, histSetupBackOutcome, isActivationTarget, judgeCtlSlow, judgeR17bRow, R17B_ROWS, refusedStop, strictCall,
} from "../s11b-r17b-rules";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sheet = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
const b17 = readFileSync(join(REPO, "recipes", "s11b.ts"), "utf8");

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

describe("the activation target guard", () => {
  const opened = ["T3", "T4"];
  it("accepts 8081 and 8091 on 127.0.0.1 and localhost for a handle the helper opened", () => {
    for (const h of ["127.0.0.1", "localhost"]) for (const p of [8081, 8091]) expect(isActivationTarget("T3", `http://${h}:${p}/e2e-playground.html?s11b=ac1`, opened), `${h}:${p}`).toBe(true);
  });
  it("refuses a handle that is not in the opened list", () => {
    expect(isActivationTarget("T9", "http://localhost:8081/x", opened)).toBe(false);
    expect(isActivationTarget("", "http://localhost:8081/x", opened)).toBe(false);
    expect(isActivationTarget("T3", "http://localhost:8081/x", [])).toBe(false);
  });
  it("refuses other ports, other hosts, chrome://, file:, a blank url and userinfo tricks", () => {
    for (const u of [
      "http://localhost:8080/x", "http://localhost:8083/x", "http://localhost:8085/x", "http://localhost:8087/x", "http://localhost/x", "https://localhost:8081/x",
      "http://example.test:8081/x", "http://localhost.example.test:8081/x", "http://localhost:8081@example.test/x", "http://user@localhost:8081/x",
      "chrome://extensions", "chrome-extension://abc/options.html", "file:///x/y.html", "about:blank", "", "not a url",
    ]) expect(isActivationTarget("T3", u, opened), u).toBe(false);
    expect(isActivationTarget("T3", undefined, opened)).toBe(false);
  });
  it("guardedActivate runs the activation only after the guard, else throws the STOP message first", async () => {
    let n = 0;
    const call = (url: string, handle = "T3"): Promise<void> => guardedActivate({ handle, url, opened, stop: (m) => new Error(m), activate: async () => void n++ });
    await call("http://localhost:8081/x");
    expect(n).toBe(1);
    await expect(call("chrome://extensions")).rejects.toThrow("activation target is not a wave fixture page");
    await expect(call("http://localhost:8081/x", "T9")).rejects.toThrow("activation target is not a wave fixture page");
    expect(n).toBe(1);
  });
});

describe("the three-page plan", () => {
  it("is three 8081 pages with no set-up back, tags 1 to 3", () => {
    expect(historyPlan("p3", "ac")).toEqual({ urls: [1, 2, 3].map((n) => `http://localhost:8081/e2e-playground.html?s11b=ac${n}`), backs: 0 });
    expect(historyPlan("p3").urls[2]).toBe("http://localhost:8081/e2e-playground.html?s11b=ac3");
  });
  it("the earlier kinds are unchanged", () => {
    expect(historyPlan("fwd").backs).toBe(2);
    expect(historyPlan("back").urls).toHaveLength(2);
  });
  it("the sheet names the same tags (ac1, ac2, ac3)", () => {
    for (const t of historyPlan("p3", "ac").urls.map((u) => u.split("s11b=")[1]!)) expect(sheet).toContain(`s11b=${t}`);
  });
});

describe("--activate in place of NOT BUILT", () => {
  const ctx: Scan17Ctx = { token: "tok3n-secret", sentinel: "sentinel-x9", profile: ["C:\\Users\\someone"] };
  const known = new Set(Object.values(K17).map((k) => k.message));
  const o = { kind: "fwd", step: "back 1", ctx, known };
  const refused = new BridgeError("INTERNAL", "Cannot find a next page in history.");
  it("without --activate the answer is Run 17's NOT BUILT line, unchanged", () => {
    expect(histSetupBackOutcome(refused, false, o)).toBe(histNotBuilt17(refused, o));
    expect(histSetupBackOutcome(refused, false, o)).toContain("NOT BUILT");
  });
  it("with --activate there is no NOT BUILT outcome (the caller rethrows: a STOP)", () => {
    expect(histSetupBackOutcome(refused, true, o)).toBeUndefined();
    expect(histSetupBackOutcome(refused, true, { ...o, step: "back 2" })).toBeUndefined();
  });
  it("history() wires it: the flag is boolean, the guard runs per page, and the NOT BUILT tail is kept", () => {
    const h = b17.slice(b17.indexOf("async function history("), b17.indexOf("// filetab:"));
    expect(h).toContain("histSetupBackOutcome(e, activate,");
    expect(h).toContain("if (!nb) throw e;");
    expect(h.indexOf("guardedActivate(")).toBeGreaterThan(h.indexOf("await tab.navigate(u)"));
    expect(h.indexOf("guardedActivate(")).toBeLessThan(h.indexOf("for (let i = 0; i < plan.backs; i++)"));
    expect(h).toContain("histLine(a.opts.label!, navs, activated)");
  });
  it("--dry: byte-identical without --activate; with it a label is required", async () => {
    expect(await run("history", "--kind", "fwd", "--tab", "r1", "--dry")).toEqual({ code: 0, text: "PLAN history ok kind=fwd navigations=3 backs=2" });
    expect(await run("history", "--kind", "p3", "--tab", "r1", "--dry")).toEqual({ code: 0, text: "PLAN history ok kind=p3 navigations=3 backs=0" });
    expect(await run("history", "--kind", "p3", "--tab", "r1", "--activate", "--label", "act-ctl", "--dry")).toEqual({
      code: 0,
      text: "PLAN history ok kind=p3 navigations=3 backs=0 activate=yes label=act-ctl",
    });
    const r = await run("history", "--kind", "p3", "--tab", "r1", "--activate", "--dry");
    expect(r.code).toBe(2);
    expect(r.text).toContain("STOP: history --activate needs --label");
  });
});

describe("the STOP for a refused target call", () => {
  it("ACT-CTL, SAMEDOC and EMPTY are strict on every call; FWD on the first of a pair; BACK and NOACT never", () => {
    for (const r of ["R17B-ACT-CTL", "R17B-BACK-SAMEDOC", "R17B-BACK-EMPTY"]) for (const [i, t] of [[1, 1], [1, 2], [2, 2]] as const) expect(strictCall(r, i, t), `${r} ${i}/${t}`).toBe(true);
    expect(strictCall("R17B-FWD", 1, 2)).toBe(true);
    expect(strictCall("R17B-FWD", 2, 2)).toBe(false);
    expect(strictCall("R17B-FWD", 1, 1)).toBe(false);
    for (const r of ["R17B-BACK", "R17B-BACK-NOACT", "RD-BACK", "RD-BACK-EMPTY", "RD-FWD"]) expect(strictCall(r, 1, 2), r).toBe(false);
  });
  it("a refusal is a STOP verdict with the row's id", () => {
    const j = refusedStop("R17B-ACT-CTL", "INTERNAL");
    expect(j).toMatchObject({ pass: false, stop: true });
    expect(j.why).toContain("R17B-ACT-CTL");
    for (const r of ["R17B-ACT-CTL", "R17B-BACK-SAMEDOC", "R17B-BACK-EMPTY"]) expect(judgeR17bRow(r, { kind: "INTERNAL", ms: 50, rulesAfter: 0 }), r).toMatchObject({ pass: false, stop: true });
  });
  it("s11b.ts stops on the first call of a pair, before the old row FAIL, and still FAILs RD-* rows", () => {
    const h = b17.slice(b17.indexOf("async function historyCall("), b17.indexOf("async function history("));
    const strict = h.indexOf("isR17bRow(row) && strictCall(row, i, times)");
    expect(strict).toBeGreaterThan(0);
    expect(strict).toBeLessThan(h.indexOf("the first ${op} did not answer ok"));
    expect(h).toContain("the first ${op} did not answer ok"); // RD-* rows keep their FAIL
    expect(h).toContain('j17(false, `answer ${reply.code}, not ok`)'); // RD-BACK-EMPTY's FAIL
  });
  it("RD-* judges are unchanged: judge-history keeps answering RD-* rows as before", () => {
    expect(judgeHistoryRow("RD-BACK-SAMEDOC", { kind: "ok", ms: 100, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeHistoryRow("RD-BACK-EMPTY", { kind: "ok", ms: 100, rulesAfter: 0 }).pass).toBe(true);
  });
  it("R17B judges: pass, record, fail", () => {
    expect(judgeR17bRow("R17B-ACT-CTL", { kind: "ok", ms: 800, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeR17bRow("R17B-ACT-CTL", { kind: "ok", ms: 12001, rulesAfter: 0 })).toMatchObject({ pass: false });
    expect(judgeR17bRow("R17B-BACK-SAMEDOC", { kind: "ok", ms: 999, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeR17bRow("R17B-BACK-SAMEDOC", { kind: "ok", ms: 1000, rulesAfter: 0 }).pass).toBe(false);
    expect(judgeR17bRow("R17B-BACK-EMPTY", { kind: "ok", ms: 50, rulesAfter: 3 })).toMatchObject({ stop: true });
    expect(judgeR17bRow("R17B-BACK", { kind: "ok", ms: 50, rulesAfter: 0, blocked: 0, flipTotal: 2 }).pass).toBe(true);
    expect(judgeR17bRow("R17B-BACK", { kind: "ok", ms: 50, rulesAfter: 0, blocked: 0, flipTotal: 1 })).toMatchObject({ nd: true });
    expect(judgeR17bRow("R17B-BACK", { kind: "INTERNAL", ms: 50, rulesAfter: 0, blocked: 0, flipTotal: 2 })).toMatchObject({ pass: false });
    expect(judgeR17bRow("R17B-BACK", { kind: "INTERNAL", ms: 50, rulesAfter: 0, blocked: 0, flipTotal: 2 }).stop).toBeUndefined();
    expect(judgeR17bRow("R17B-FWD", { kind: "K-tab", ms: 50, rulesAfter: 0, blocked: 0, flipTotal: 2 }).pass).toBe(true);
    expect(judgeR17bRow("R17B-BACK-NOACT", { kind: "INTERNAL", ms: 40, rulesAfter: null }).pass).toBe(true);
    expect(judgeR17bRow("R17B-BACK-NOACT", { kind: "ok", ms: 40, rulesAfter: null }).pass).toBe(true);
  });
  it("the R17B ids are accepted by back, forward and judge-history; the RD ids still are", async () => {
    for (const r of [...R17B_ROWS, "RD-BACK", "RD-FWD", "RD-BACK-SAMEDOC", "RD-BACK-EMPTY"]) {
      expect((await run("back", "--row", r, "--tab", "r1", "--dry")).code, r).toBe(0);
    }
    expect((await run("judge-history", "--row", "R17B-BACK-EMPTY", "--answer", "INTERNAL", "--ms", "10", "--rules-after", "0")).text).toContain("ROW R17B-BACK-EMPTY STOP");
    expect((await run("judge-history", "--row", "R17B-ACT-CTL", "--answer", "ok", "--ms", "10", "--rules-after", "0")).text).toBe("ROW R17B-ACT-CTL PASS: ok, reply 10 ms");
  });
});

describe("each new expected text, compared with section 4.25 by key", () => {
  it("ACT", () => {
    expect(sheet).toContain(actLine("act-ctl", 3));
    expect(sheet).toContain(actLine("<label>", 0).replace("n=0", "n=<k>"));
  });
  it("HIST", () => {
    expect(sheet).toContain(histLine("act-ctl", 3, 3));
    expect(sheet).toContain(histLine("<label>", 0, 0).replace("built=0", "built=<n>").replace("activated=0", "activated=<n>"));
  });
  it("the activation STOP line", () => {
    expect(sheet).toContain(`\`${ACT_STOP_LINE}\``);
  });
  it("CTL 8087", () => {
    expect(sheet).toContain(ctlSlowLine(1234).replace("1234", "<ms>"));
    expect(ctlSlowLine(3012.4)).toBe("CTL 8087 slow answered after 3012 ms");
  });
  it("R17B-CTL judge: 3 000 ms or more and 200, else a STOP", () => {
    expect(judgeCtlSlow({ status: 200, ms: 3000 }).pass).toBe(true);
    expect(judgeCtlSlow({ status: 200, ms: 2999 })).toMatchObject({ pass: false, stop: true });
    expect(judgeCtlSlow({ status: 0, ms: 5000 })).toMatchObject({ pass: false, stop: true });
  });
  it("the row ids are all in the sheet and the ctl-slow op exists", () => {
    for (const r of R17B_ROWS) expect(sheet).toContain(r);
    expect(SUBCOMMANDS).toContain("ctl-slow");
  });
});

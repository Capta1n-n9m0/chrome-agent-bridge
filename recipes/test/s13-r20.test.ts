// Step 13 S5-drivers-A: the pure shared block runner of Run 20 (recipes/s13-r20.ts): STOP/RETURN pairing, the one-ROW aggregator, scan20, the restore comparison, the proof decision.
import { describe, expect, it } from "vitest";
import { actorsVerdict } from "../s13-forms.js";
import { aggregateRows20, capturePath20, checkStopReturn20, diskNote20, orderOf, proofDecision20, restoreCompare20, returnLine, rowVerdict20, scan20, scan20Actors, scan20Stream, scanArgs20, STOP_REASONS_20, stopLine } from "../s13-r20.js";
import { ENABLED_UNREAD_20 } from "../s13-r20.js";
const NAME = "Zed Quux", SENT = "s12sent-5f3a9c71", TOKEN = "tok-9f8e7d6c5b4a";
const A = { name: NAME, sentinels: [SENT, "sentinel-args-K7W3-"], token: TOKEN };
describe("STOP and RETURN (R5.6)", () => {
  it("has the fourteen reasons of the sheet bullet, and each pairs with its RETURN", () => {
    expect(STOP_REASONS_20).toHaveLength(14);
    for (const r of STOP_REASONS_20) {
      expect(checkStopReturn20([stopLine(r), returnLine(1, r, "n/a", "n/a"), "ROW R20-X PASS"]), r).toEqual([]);
    }
  });
  it("flags a STOP with no RETURN, a wrong reason, a ROW before the RETURN, a bad seq and a RETURN with no STOP", () => {
    expect(checkStopReturn20(["STOP popup-lease-wrong"]).join()).toMatch(/no RETURN/);
    expect(checkStopReturn20(["STOP popup-lease-wrong", returnLine(1, "text-leak", "no", "n/a")]).join()).toMatch(/names text-leak/);
    expect(checkStopReturn20(["STOP not-restored", "ROW R20-X PASS", returnLine(1, "not-restored", "no", "n/a")]).join()).toMatch(/followed by a ROW/);
    expect(checkStopReturn20(["STOP not-restored", returnLine(2, "not-restored", "no", "n/a")]).join()).toMatch(/seq 2 is not 1/);
    expect(checkStopReturn20([returnLine(1, "not-restored", "no", "n/a")]).join()).toMatch(/no STOP before/);
  });
});
describe("one ROW per id and slice, verdict ranking", () => {
  it("ranks the worst first and counts RECORD as a pass", () => {
    expect(rowVerdict20(["PASS", "RECORD", "PASS"])).toBe("RECORD");
    expect(rowVerdict20(["PASS", "NOT MEASURED", "RECORD"])).toBe("NOT MEASURED");
    expect(rowVerdict20(["NOT MEASURED", "NOT DISCRIMINATING"])).toBe("NOT DISCRIMINATING");
    expect(rowVerdict20(["NOT DISCRIMINATING", "FAIL", "PASS"])).toBe("FAIL");
    expect(rowVerdict20(["FAIL", "STOP"])).toBe("STOP");
    expect(rowVerdict20([])).toBe("NOT MEASURED");
  });
  it("warns when an id is printed twice in a slice, not when R20-0 runs in slices A and B", () => {
    expect(aggregateRows20(["ROW R20-ARGS-3 PASS", "ROW R20-ARGS-3 FAIL"]).warns).toEqual(["WARN row printed twice: R20-ARGS-3"]);
    expect(aggregateRows20(["ROW R20-0 PASS slice=A", "ROW R20-0 PASS slice=B"]).warns).toEqual([]);
    expect(aggregateRows20(["ROW R20-0 PASS slice=A", "ROW R20-0 FAIL slice=A"]).warns).toHaveLength(1);
  });
  it("counts ids, ignores a leg note such as the unjoined line, and tolerates a time prefix", () => {
    const a = aggregateRows20(["2026-10-29T10:00:00.000Z ROW R20-POP-OTHER PASS", "ROW R20-POP-OTHER unjoined NOT MEASURED — no unjoined tab can be made", "ROW R20-ARGS-ORDER RECORD"]);
    expect(a.n).toBe(2);
    expect(a.warns).toEqual([]);
    expect(a.verdicts["R20-POP-OTHER|"]).toBe("PASS");
  });
});
describe("scan20 counts and never prints a match", () => {
  const text = `a ${NAME} b\n${NAME.toLowerCase()}\n${SENT} ${SENT}\nsentinel-args-K7W3-x\n${TOKEN}`;
  it("counts the name (any case), the sentinels and the token", () => {
    expect(scan20(text, A)).toEqual({ name: 2, sentinel: 3, token: 1 });
    expect(scan20("nothing here", A)).toEqual({ name: 0, sentinel: 0, token: 0 });
  });
  it("prints only counts: no output line holds a pattern", () => {
    const lines = [scan20Stream("console", text, A), ...scan20Actors([{ tool: "browser_evaluate", text }, { tool: "browser_snapshot", text: "clean" }], A).lines];
    for (const l of lines) for (const p of [NAME, NAME.toLowerCase(), SENT, TOKEN, "sentinel-args-K7W3-"]) expect(l).not.toContain(p);
    expect(lines[0]).toBe("SCAN20 console: name=2 sentinel=3 token=1");
    expect(lines).toContain("SCAN20 actors browser_snapshot: name=0 sentinel=0 token=0");
  });
  it("judges the actors' lines through actorsVerdict (a name or token is the STOP, a sentinel only outside the four tools)", () => {
    expect(scan20Actors([{ tool: "browser_evaluate", text: SENT }], A).verdict).toBe("PASS");
    expect(scan20Actors([{ tool: "browser_snapshot", text: SENT }], A).verdict).toBe("STOP text-leak");
    expect(scan20Actors([{ tool: "browser_evaluate", text: TOKEN }], A).verdict).toBe("STOP text-leak");
    expect(scan20Actors([{ tool: "browser_click", text: NAME }], A).verdict).toBe("STOP text-leak");
    expect(actorsVerdict([{ tool: "browser_click", name: 1, sentinel: 0, token: 0 }])).toBe("STOP text-leak");
  });
  it("an empty pattern throws without naming any pattern", () => {
    expect(() => scan20("x", { ...A, token: "" })).toThrow(/empty/);
    expect(() => scan20("x", { ...A, name: "" })).toThrow(/^((?!Quux).)*$/);
  });
});
describe("restore by count and hash", () => {
  const st = (n: number, h: string) => ({ armed: true, evaluate: true, blocklist: { lines: n, sha256: h }, uploadfolders: { lines: 1, sha256: "f".repeat(64) } });
  it("equal passes", () => expect(restoreCompare20(st(2, "a".repeat(64)), st(2, "a".repeat(64)))).toEqual({ readback: "equal", reason: "none", verdict: "PASS" }));
  it("a different count is the STOP not-restored", () => expect(restoreCompare20(st(2, "a".repeat(64)), st(3, "a".repeat(64)))).toEqual({ readback: "differs", reason: "count", verdict: "STOP not-restored" }));
  it("a different hash at the same count is the STOP, and no result holds a hash", () => {
    const r = restoreCompare20(st(2, "a".repeat(64)), st(2, "b".repeat(64)));
    expect(r).toEqual({ readback: "differs", reason: "hash", verdict: "STOP not-restored" });
    expect(JSON.stringify(r)).not.toMatch(/[ab]{16}/);
  });
  it("a flipped switch is the STOP", () => expect(restoreCompare20({ ...st(2, "a"), evaluate: false }, st(2, "a")).verdict).toBe("STOP not-restored"));
});
describe("capture names and the R20-0 proof decision", () => {
  it("names one file per segment", () => expect([capturePath20("liveA20", 1), capturePath20("liveA20", 2)]).toEqual(["console-liveA20-1.txt", "console-liveA20-2.txt"]));
  it("reads page and sorted order", () => {
    expect(orderOf(["zeta", "alpha", "mid"], ["zeta", "alpha", "mid"])).toBe("page");
    expect(orderOf(["alpha", "mid", "zeta"], ["zeta", "alpha", "mid"])).toBe("sorted");
  });
  const ok = { keys: "page", nested: "page", elem: "page", perm: "yes", listener: "yes", enabled: "yes", args: "answered" } as const;
  it("passes the expected reading", () => expect(proofDecision20(ok)).toEqual({ exit: 0, why: "", note: "" }));
  it("maps each reading to its STOP", () => {
    expect(proofDecision20({ ...ok, keys: "sorted" })).toMatchObject({ exit: 2, why: "build-not-loaded" });
    expect(proofDecision20({ ...ok, perm: "no" })).toMatchObject({ exit: 2, why: "build-not-loaded" });
    expect(proofDecision20({ ...ok, listener: "no" })).toMatchObject({ exit: 2, why: "build-not-loaded" });
    expect(proofDecision20({ ...ok, args: "VERSION" })).toMatchObject({ exit: 2, why: "build-not-loaded" });
    expect(proofDecision20({ ...ok, enabled: "no" })).toMatchObject({ exit: 2, why: "extension-disabled" });
    expect(proofDecision20({ ...ok, args: "BAD_PARAMS" })).toMatchObject({ exit: 1 });
  });
  it("an unread permission passes on the keys alone and says so", () => expect(proofDecision20({ ...ok, perm: "unread", listener: "unread" })).toEqual({ exit: 0, why: "", note: "perm-not-measured" }));
  it("a re-run names the old build as left loaded", () => {
    expect(proofDecision20({ ...ok, keys: "sorted" }, true)).toMatchObject({ exit: 2, why: "old-build-left-loaded" });
    expect(proofDecision20(ok, true)).toMatchObject({ exit: 0 });
  });
});
describe("fixer 1: both names are counted (MINOR scanArgs20) and the fallback note (MAJOR 2)", () => {
  const B = { name: "Quux Person", sentinels: ["SENT-1"], token: "tok-123" };
  it("counts the git name and the login name together, by argument", () => {
    expect(scan20("quux person and loginz", { ...B, alsoNames: ["loginz"] }).name).toBe(2);
    expect(scan20("quux person and loginz", B).name).toBe(1);
    expect(scan20("x", { ...B, alsoNames: [""] }).name).toBe(0);
  });
  it("scanArgs20 carries the login name from the environment without printing it", () => {
    const old = process.env.USERNAME;
    process.env.USERNAME = "loginz-test";
    try {
      const a = scanArgs20(process.cwd());
      expect([a.name, ...(a.alsoNames ?? [])].map((s) => s.toLowerCase())).toContain("loginz-test");
    } finally { if (old === undefined) delete process.env.USERNAME; else process.env.USERNAME = old; }
  });
  it("the disk-manifest fallback is recorded as such, and only when the permission was unread", () => {
    expect(diskNote20("unread", "yes")).toBe("CHECK R20-0 fallback disk-manifest webNavigation=yes (recorded as such; it cannot show what is loaded)");
    expect(diskNote20("unread", "no")).toContain("webNavigation=no");
    expect(diskNote20("yes", "yes")).toBe("");
    expect(diskNote20("unread", undefined)).toBe("");
  });
});
describe("R20-0 enabled with no console reading", () => {
  it("names its source and does not claim a read", () => {
    expect(ENABLED_UNREAD_20).toMatch(/^CHECK R20-0 enabled-source=reachability /);
    expect(ENABLED_UNREAD_20).not.toMatch(/enabled=(yes|no)/);
  });
});

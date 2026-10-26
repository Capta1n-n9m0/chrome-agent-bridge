// Tests for recipes/s11-rules.ts — Run 16's expected lines and verdicts (docs/e2e-test-plan.md §4.23). Written before
// the code (S5-rules). Texts quoted below are copied literally from the sheet; the drift tests tie them to the product.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { safetyRefusalLine } from "@bridge/sdk/report";
import { BLOCKED_TAB_MESSAGE, DISARMED_ALL_MESSAGE, UPLOAD_REFUSED_MESSAGE } from "../../extension/src/safety.js";
import { NO_FILE_ACCESS_MESSAGE } from "../../extension/src/upload-files.js";
import { STRINGIFY_FAILED_MESSAGE } from "../../extension/src/evaluate/save.js";
import { UPLOAD_TARGET_REQUIRED_MESSAGE } from "../../extension/src/handlers/upload.js";
import {
  UPLOAD_FOLDERS_WARNING,
  UPLOAD_HOME_REASON,
  UPLOAD_RELATIVE_REASON,
  UPLOAD_ROOT_REASON,
} from "../../extension/src/options-model.js";
import {
  EMPTY_SHA256,
  K,
  MCP_UP_LINE,
  NOT_RUN_G11_3,
  UP_WAITING_ROWS,
  foundStateGuard,
  foundcheck,
  judgeError,
  liveBPlan,
  logsLine,
  logsVerdict,
  mcpOkText,
  optExpected,
  optSummary,
  optVerdict,
  raceDone,
  raceVerdict,
  rawLeaks,
  refusalSteps,
  restoreLine,
  restoreVerdict,
  rowLine,
  saveMcpVerdict,
  saveSdkVerdict,
  saveControlVerdict,
  scanText,
  isFixture11,
  stateLine,
  sw2,
  sw2TrialLine,
  toggleLine,
  up1Outcome,
  up5Verdict,
  uploadPageJudge,
  UP6_STEPS,
  UP6B_STEPS,
  UP2_SPEC,
  buildJudge,
  checkLine,
  faVerdict,
  navVerdict,
  patchVerdict,
  rawVerdict,
  saveFilesVerdict,
  staleVerdict,
  up8Verdict,
  UP7_LEGS,
  devtVerdict,
  type BoxState,
  type PageObs,
} from "../s11-rules.js";

const H1 = "a".repeat(64);
const H2 = "b".repeat(64);
const page0: PageObs = { files: [], change: 0, input: 0, trusted: [], markAdded: 0, markRemoved: 0, carriersLeft: 0 };
const file1k = { name: "s11-1k.bin", bytes: 1024, sha256: H1 };
const pageOk: PageObs = { files: [file1k], change: 1, input: 1, trusted: [true], markAdded: 1, markRemoved: 1, carriersLeft: 0 };
const box = (o: Partial<BoxState> = {}): BoxState => ({
  armed: true,
  evaluate: true,
  blocklist: { lines: 2, sha256: H1 },
  uploadfolders: { lines: 1, sha256: H2 },
  ...o,
});

describe("expected texts, byte for byte against the sheet's table", () => {
  it("K-gate and K-noacc", () => {
    expect(K["K-gate"]).toEqual({
      code: "UPLOAD_REFUSED",
      message:
        "That file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders); the bridge will not upload it. Ask the user.",
    });
    expect(K["K-noacc"].message).toBe(
      "Chrome does not allow this extension to read local files (chrome://extensions → Chrome Agent Bridge → Details → Allow access to file URLs), so the bridge cannot upload. Ask the user.",
    );
  });
  it("the BAD_PARAMS texts of UP-6B and UP-6", () => {
    expect(K["K-notarget"].message).toBe("uploadFiles needs a ref or a locator naming the file input");
    expect(K["K-notinput"].message).toBe(
      "not a file input: target an <input type=file>, a <label> for one, or an element with exactly one file input inside",
    );
    expect(K["K-many"].message).toBe("the target holds more than one file input; target one of them");
    expect(K["K-disabled"].message).toBe("the file input is disabled");
    expect(K["K-dir"].message).toBe("the file input takes a folder (webkitdirectory); the bridge uploads files only");
    expect(K["K-single"].message).toBe("the file input takes one file, and more than one path was given");
    expect(K["K-missing"].message).toBe("upload: paths[0] does not exist");
    expect(K["K-relative"].message).toBe("upload: paths[0] is not an absolute path — pass an absolute file path");
  });
  it("K-disarmed, K-blocked, K-devt carry the sheet's data", () => {
    expect(K["K-disarmed"]).toEqual({
      code: "DISARMED",
      message:
        "The user has turned the bridge off in Chrome, so every page call is refused. Stop and ask the user to turn it back on; do not retry.",
      data: { scope: "all" },
    });
    expect(K["K-blocked"].message).toBe(
      "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user.",
    );
    expect(K["K-devt"].code).toBe("DEBUGGER_DEVTOOLS");
    expect(K["K-devt"].message).toBe(
      "Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry.",
    );
  });
  it("the save texts", () => {
    expect(K["K-undef"].message).toBe("The value is undefined — nothing to save");
    expect(K["K-node"].message).toBe(
      "The value is a DOM node, which is not saveable — return its text or HTML (e.g. el.outerHTML)",
    );
    expect(K["K-map"].message).toBe(
      "The value is a Map, which JSON turns into {} — not saveable; convert it first (e.g. Object.fromEntries(map))",
    );
    expect(K["K-cycle"]).toEqual({
      code: "PAGE_ERROR",
      message:
        "JSON.stringify threw on the value in the page (a cycle, a BigInt, or a throwing toJSON or getter) — nothing was saved",
      data: { name: "TypeError" },
    });
  });
  it("drift: equal to the product constants", () => {
    expect(K["K-noacc"].message).toBe(NO_FILE_ACCESS_MESSAGE);
    expect(K["K-gate"].message).toBe(UPLOAD_REFUSED_MESSAGE);
    expect(K["K-disarmed"].message).toBe(DISARMED_ALL_MESSAGE);
    expect(K["K-blocked"].message).toBe(BLOCKED_TAB_MESSAGE);
    expect(K["K-notarget"].message).toBe(UPLOAD_TARGET_REQUIRED_MESSAGE);
    expect(K["K-cycle"].message).toBe(STRINGIFY_FAILED_MESSAGE);
    expect(MCP_UP_LINE).toBe(safetyRefusalLine("UPLOAD_REFUSED", undefined));
    expect(K["K-opt-root"]).toBe(UPLOAD_ROOT_REASON);
    expect(K["K-opt-rel"]).toBe(UPLOAD_RELATIVE_REASON);
  });

  // Dated note 2026-10-26 (Step 11b S0F-a; decisions.md #288 item 3b changes #250): after Run 16 the product refuses a
  // home folder instead of warning, so K-opt-stand's home sentence and K-opt-home (a warning) are Run 16's record, no
  // longer the product's text. The sheet's text is never edited after its run (agent-rules §2); this test pins that
  // the product moved exactly where #288 says, and nowhere else in these two texts.
  it("drift after Run 16 (#288 3b): K-opt-stand and K-opt-home are Run 16's record; the product changed only the home part", () => {
    const RUN16_HOME = "Never allow your home folder, or any folder that holds bridge.token or a .ssh folder.";
    const NOW_HOME = "A home folder, or a folder that holds home folders, is refused; never allow a folder that holds bridge.token or a .ssh folder.";
    expect(K["K-opt-stand"].replace(RUN16_HOME, NOW_HOME)).toBe(UPLOAD_FOLDERS_WARNING);
    expect(K["K-opt-home"]).toBe("a home folder, or a folder that holds home folders: every file in it (keys, tokens, documents) could be uploaded");
    expect(UPLOAD_HOME_REASON.startsWith("a home folder, or a folder that holds home folders, is never allowed: every file in it (keys, tokens, documents) could be uploaded")).toBe(true);
  });
});

describe("judgeError", () => {
  it("is exact on code, message and data", () => {
    expect(judgeError(K["K-gate"], "K-gate").pass).toBe(true);
    expect(judgeError({ ...K["K-gate"], message: K["K-gate"].message + " " }, "K-gate").pass).toBe(false);
    expect(judgeError({ ...K["K-gate"], data: {} }, "K-gate").pass).toBe(false);
    expect(judgeError({ ...K["K-disarmed"], data: { scope: "tab" } }, "K-disarmed").pass).toBe(false);
    expect(judgeError(undefined, "K-gate").pass).toBe(false);
  });
});

describe("UP-L1 and UP-0", () => {
  it("FOUNDCHECK stops when only <OUTSIDE> is allowed", () => {
    const o = foundcheck("C:\\w\\outside", "C:\\w\\root", "C:\\w\\outside");
    expect(o.line).toBe("FOUNDCHECK root=not outside=allowed");
    expect(o.stop).toBe(true);
  });
  it("FOUNDCHECK uses the gate's matcher", () => {
    expect(foundcheck("", "C:\\w\\root", "C:\\w\\outside").line).toBe("FOUNDCHECK root=not outside=not");
    const a = foundcheck("C:\\w\\root", "C:\\w\\root", "C:\\w\\outside");
    expect(a.line).toBe("FOUNDCHECK root=allowed outside=not");
    expect(a.stop).toBe(true);
    expect(foundcheck("C:\\W", "C:\\w\\root", "C:\\w\\outside").line).toBe("FOUNDCHECK root=allowed outside=allowed");
    expect(foundcheck("C:\\w\\root", "C:\\w\\root", "C:\\w\\outside").line).not.toContain("w\\root");
  });
  it("STATE and TOGGLE lines", () => {
    expect(stateLine(box({ blocklist: { lines: 0, sha256: EMPTY_SHA256 }, uploadfolders: { lines: 3, sha256: H2 } }))).toBe(
      `STATE armed=true evaluate=true blocklist lines=0 sha256=${EMPTY_SHA256} uploadfolders lines=3`,
    );
    expect(stateLine(box())).toBe("STATE armed=true evaluate=true blocklist lines=2 uploadfolders lines=1");
    expect(stateLine(box())).not.toContain(H1);
    expect(toggleLine("on")).toBe("TOGGLE reading on");
    expect(toggleLine("off")).toBe("TOGGLE reading off");
    expect(foundStateGuard(box()).ok).toBe(true);
    expect(foundStateGuard(box({ armed: false })).ok).toBe(false);
    expect(foundStateGuard(box({ evaluate: false })).ok).toBe(false);
  });
  it("the G11-3 branch", () => {
    expect(UP_WAITING_ROWS).toHaveLength(17);
    expect(NOT_RUN_G11_3).toBe("NOT RUN — waits for G11-3");
    const off = liveBPlan("off");
    expect(off.liveB).toBe(false);
    expect(off.fa).toBe("run");
    expect(off.count).toBe(17);
    expect(off.lines[0]).toBe("UP-1 NOT RUN — waits for G11-3");
    const on = liveBPlan("on");
    expect(on.liveB).toBe(true);
    expect(on.fa).toBe("not run — the toggle is on");
    expect(on.lines).toEqual([]);
    expect(liveBPlan("unreadable").stop).toBe(true);
  });
  it("UP-L1: both raw calls K-gate, page untouched", () => {
    const steps = [{ step: "root", key: "K-gate" as const }, { step: "outside", key: "K-gate" as const }];
    const r = refusalSteps(steps, [{ err: K["K-gate"], page: page0 }, { err: K["K-gate"], page: page0 }], {});
    expect(r.every((x) => x.j.pass)).toBe(true);
  });
});

describe("refusal rows UP-6, UP-7, UP-6B, UP-DEVT", () => {
  it("UP-6 order and keys", () => {
    expect(UP6_STEPS.map((s) => s.key)).toEqual(["K-gate", "K-missing", "K-relative", "K-gate", "K-notarget"]);
  });
  it("UP-7 legs and UP-6B order", () => {
    expect(UP7_LEGS.map((s) => s.key)).toEqual(["K-disarmed", "K-blocked", "K-gate"]);
    expect(UP6B_STEPS.map((s) => s.key)).toEqual(["K-notinput", "K-single", "K-disabled", "K-dir", "K-many"]);
  });
  it("a refusal that reached the page fails", () => {
    const obs = UP6_STEPS.map((s) => ({ err: K[s.key], page: page0, banner: false }));
    expect(refusalSteps(UP6_STEPS, obs, { banner: true }).every((x) => x.j.pass)).toBe(true);
    const bad = obs.map((o) => ({ ...o }));
    bad[1] = { ...bad[1]!, page: { ...page0, change: 1 } };
    expect(refusalSteps(UP6_STEPS, bad, { banner: true })[1]!.j.pass).toBe(false);
    bad[1] = { ...bad[1]!, page: { ...page0, markAdded: 1, markRemoved: 1 } };
    expect(refusalSteps(UP6_STEPS, bad, { banner: true })[1]!.j.pass).toBe(false);
    bad[1] = { ...obs[1]!, banner: true };
    expect(refusalSteps(UP6_STEPS, bad, { banner: true })[1]!.j.pass).toBe(false);
    expect(refusalSteps(UP6_STEPS, obs.slice(0, 2), {}).some((x) => !x.j.pass)).toBe(true);
  });
  it("UP-DEVT: success is NOT MEASURED, refusal needs the mark added and removed", () => {
    const p = { ...page0, markAdded: 1, markRemoved: 1 };
    expect(devtVerdict({ err: K["K-devt"], page: p }).pass).toBe(true);
    expect(devtVerdict({ err: K["K-devt"], page: page0 }).pass).toBe(false);
    const nm = devtVerdict({ err: undefined, page: pageOk });
    expect(nm.notMeasured).toBe(true);
    expect(nm.pass).toBe(false);
  });
});

describe("upload page clauses", () => {
  it("passes a good page and fails each wrong clause", () => {
    expect(uploadPageJudge(pageOk, [file1k]).pass).toBe(true);
    expect(uploadPageJudge({ ...pageOk, files: [{ ...file1k, sha256: H2 }] }, [file1k]).pass).toBe(false);
    expect(uploadPageJudge({ ...pageOk, trusted: [false] }, [file1k]).pass).toBe(false);
    expect(uploadPageJudge({ ...pageOk, carriersLeft: 1 }, [file1k]).pass).toBe(false);
    expect(uploadPageJudge({ ...pageOk, markRemoved: 0 }, [file1k]).pass).toBe(false);
    expect(uploadPageJudge({ ...pageOk, change: 2, trusted: [true, true] }, [file1k]).pass).toBe(false);
    expect(uploadPageJudge({ ...pageOk, files: [] }, [file1k]).pass).toBe(false);
    expect(uploadPageJudge({ ...pageOk, change: 2, trusted: [true, true], markAdded: 2, markRemoved: 2 }, [file1k], { changes: 2, pairs: 2 }).pass).toBe(true);
  });
  it("order of files matters", () => {
    const b = { name: "s11-5m.bin", bytes: 5242880, sha256: H2 };
    const p = { ...pageOk, files: [file1k, b] };
    expect(uploadPageJudge(p, [file1k, b]).pass).toBe(true);
    expect(uploadPageJudge(p, [b, file1k]).pass).toBe(false);
  });
});

describe("UP-1 outcome table", () => {
  const base = { call: "ok" as const, knownBehind: true, toggle: "on" as const, page: pageOk, files: [file1k], tabActiveAfter: false, humanTabUnchanged: true, banner4s: true };
  it("received on a background tab", () => {
    const r = up1Outcome(base);
    expect(r.outcome).toBe("received on a background tab: no focus needed");
    expect(r.judged.pass).toBe(true);
  });
  it("each other branch", () => {
    expect(up1Outcome({ ...base, knownBehind: false }).judged.notMeasured).toBe(true);
    expect(up1Outcome({ ...base, page: page0 }).judged.pass).toBe(false);
    expect(up1Outcome({ ...base, page: page0 }).judged.why).toContain("focus first");
    expect(up1Outcome({ ...base, page: { ...pageOk, trusted: [false] } }).judged.pass).toBe(false);
    expect(up1Outcome({ ...base, call: K["K-noacc"] }).judged.why).toContain("UP-0's reading is contradicted");
    expect(up1Outcome({ ...base, call: K["K-gate"] }).judged.pass).toBe(false);
    expect(up1Outcome({ ...base, tabActiveAfter: true }).judged.pass).toBe(false);
    expect(up1Outcome({ ...base, humanTabUnchanged: false }).judged.pass).toBe(false);
    expect(up1Outcome({ ...base, banner4s: false }).judged.pass).toBe(false);
  });
});

describe("UP-5", () => {
  it("K-mcp-ok text matches the product handler (mcp/src/tools/registry.ts)", () => {
    const src = readFileSync(fileURLToPath(new URL("../../mcp/src/tools/registry.ts", import.meta.url)), "utf8");
    expect(src).toContain("`Uploaded ${files.length} file(s) to ${describeTarget(target)}:`");
    expect(src).toContain("`${f.name} · ${f.bytes} bytes · sha256 ${f.sha256}`");
    expect(src).toContain('lines.join("\\n")');
  });
  it("K-mcp-ok text", () => {
    expect(mcpOkText("css #up-single", [{ name: "s11-sent.bin", bytes: 1024, sha256: H1 }])).toBe(
      `Uploaded 1 file(s) to css #up-single:\ns11-sent.bin · 1024 bytes · sha256 ${H1}`,
    );
  });
  const sent = { name: "s11-sent.bin", bytes: 1024, sha256: H1 };
  const t1 = { text: mcpOkText("css #up-single", [sent]), isError: false, calls: ["browser_upload_file"], page: { ...pageOk, files: [sent] } };
  const t2 = { text: MCP_UP_LINE, isError: true, calls: ["browser_upload_file"], page: page0 };
  it("passes both turns and fails on wrong parts", () => {
    expect(up5Verdict(t1, t2, sent).every((x) => x.j.pass)).toBe(true);
    expect(up5Verdict({ ...t1, calls: ["ToolSearch", "browser_upload_file"] }, t2, sent)[0]!.j.pass).toBe(false);
    expect(up5Verdict({ ...t1, text: t1.text.replace("s11-sent.bin", "C:\\x\\s11-sent.bin") }, t2, sent)[0]!.j.pass).toBe(false);
    expect(up5Verdict(t1, { ...t2, isError: false }, sent)[1]!.j.pass).toBe(false);
    expect(up5Verdict(t1, { ...t2, text: "UPLOAD_REFUSED" }, sent)[1]!.j.pass).toBe(false);
  });
});

describe("SAVE-REFUSE-R", () => {
  it("SDK side is equality, no prefix", () => {
    expect(saveSdkVerdict("K-undef", K["K-undef"]).pass).toBe(true);
    expect(saveSdkVerdict("K-undef", { ...K["K-undef"], message: "[chrome.debugger] " + K["K-undef"].message }).pass).toBe(false);
    expect(saveSdkVerdict("K-cycle", K["K-cycle"]).pass).toBe(true);
    expect(saveSdkVerdict("K-cycle", { ...K["K-cycle"], data: undefined }).pass).toBe(false);
    expect(saveSdkVerdict("K-map", K["K-node"]).pass).toBe(false);
  });
  it("control keeps the prefix", () => {
    expect(saveControlVerdict({ code: "PAGE_ERROR", message: "[chrome.debugger] Error: boom" }).pass).toBe(true);
    expect(saveControlVerdict({ code: "PAGE_ERROR", message: "Error: boom" }).pass).toBe(false);
    expect(saveControlVerdict({ code: "PAGE_ERROR", message: "[chrome.debugger] Error: other" }).pass).toBe(false);
    expect(saveControlVerdict({ code: "BAD_PARAMS", message: "[chrome.debugger] boom" }).pass).toBe(false);
  });
  it("MCP side is containment, no prefix, one call", () => {
    const t = `x\n${K["K-map"].message}\ny`;
    expect(saveMcpVerdict("K-map", t, ["browser_evaluate"]).pass).toBe(true);
    expect(saveMcpVerdict("K-map", t + "[chrome.debugger]", ["browser_evaluate"]).pass).toBe(false);
    expect(saveMcpVerdict("K-map", t, ["ToolSearch", "browser_evaluate"]).pass).toBe(false);
    expect(saveMcpVerdict("K-map", "other", ["browser_evaluate"]).pass).toBe(false);
  });
});

describe("SW-2", () => {
  const T = (d: number) => ({ i: 1000 + d, ii: 1000 });
  it("trial line", () => {
    expect(sw2TrialLine({ i: 1520, ii: 480 })).toBe("(i) background ok 1520 ms · (ii) front ok 480 ms · d=1040 ms");
  });
  it("runs to its bound: d >= 950 in 3/3, warm-up excluded", () => {
    const r = sw2(T(10), [T(950), T(1200), T(960)]);
    expect(r.outcome).toBe("the wait runs to its bound");
    expect(r.s5b).toBe(true);
    expect(r.lines.at(-1)).toBe("d=[950, 1200, 960] ms → the wait runs to its bound");
    expect(r.lines).toContain("measured 3/3 trials");
    expect(r.verdict.pass).toBe(true);
  });
  it("threshold edges", () => {
    expect(sw2(T(0), [T(949), T(1200), T(1200)]).outcome).toBe("undetermined");
    expect(sw2(T(0), [T(950), T(950), T(950)]).s5b).toBe(true);
    expect(sw2(T(0), [T(300), T(300), T(300)]).outcome).toBe("the event ends the wait");
    expect(sw2(T(0), [T(301), T(300), T(300)]).outcome).toBe("undetermined");
    expect(sw2(T(0), [T(300), T(-50), T(0)]).outcome).toBe("the event ends the wait");
  });
  it("the warm-up never counts", () => {
    expect(sw2(T(1200), [T(100), T(100), T(1200)]).outcome).toBe("undetermined");
    expect(sw2(T(1200), [T(1200), T(1200), T(100)]).s5b).toBe(false);
    expect(sw2(T(100), [T(1200), T(1200), T(1200)]).outcome).toBe("the wait runs to its bound");
    expect(sw2(T(100), [T(100), T(100), T(100)]).outcome).toBe("the event ends the wait");
    const r = sw2(T(5000), [T(100), T(100), T(100)]);
    expect(r.ds).toEqual([100, 100, 100]);
    expect(r.lines.some((l) => l.startsWith("warm-up"))).toBe(true);
  });
  it("a trial not measured leaves 'anything else'", () => {
    const r = sw2(T(0), [T(1200), { notMeasured: "sw row active=true" }, T(1200)]);
    expect(r.outcome).toBe("undetermined");
    expect(r.measured).toBe(2);
    expect(r.s5b).toBe(false);
    expect(r.lines).toContain("measured 2/3 trials");
    expect(r.verdict.pass).toBe(false);
    expect(r.verdict.notMeasured).toBe(true);
  });
  // §4.23 is silent on both cases below; the conservative reading is pinned: never a pass.
  it("a warm-up that was itself not measured is not a pass", () => {
    const r = sw2({ notMeasured: "warm-up row" }, [T(1200), T(1200), T(1200)]);
    expect(r.verdict.pass).toBe(false);
    expect(r.verdict.notMeasured).toBe(true);
    expect(r.lines.some((l) => l.startsWith("warm-up") && l.includes("NOT MEASURED"))).toBe(true);
  });
  it("a trial list not three long is not a pass", () => {
    const four = sw2(T(0), [T(1200), T(1200), T(1200), T(1200)]);
    expect(four.outcome).toBe("undetermined");
    expect(four.verdict.pass).toBe(false);
    const two = sw2(T(0), [T(1200), T(1200)]);
    expect(two.verdict.pass).toBe(false);
  });
  it("a missing warm-up is a finding, not a pass", () => {
    expect(sw2(undefined, [T(1200), T(1200), T(1200)]).verdict.pass).toBe(false);
  });
});

describe("UP-OPT", () => {
  it("summary texts", () => {
    expect(optSummary(0)).toBe("No upload folder: every upload is refused.");
    expect(optSummary(1)).toBe("1 upload folder.");
    expect(optSummary(3)).toBe("3 upload folders.");
    expect(optSummary(3, 1)).toBe("3 upload folders. 1 invalid line is not used (marked below).");
    expect(optSummary(2, 2)).toBe("2 upload folders. 2 invalid lines are not used (marked below).");
  });
  it("expected lines", () => {
    const e = optExpected(1, 2);
    expect(e.summaryAfterSave).toBe("2 upload folders.");
    expect(e.summaryTyped).toBe("3 upload folders. 2 invalid lines are not used (marked below).");
    expect(e.invalidItems).toEqual([
      "Line 2: “relative\\fixture-folder” — not an absolute folder path: write it from the drive letter (C:\\…) or from / (/home/…)",
      "Line 3: “C:\\” — a whole drive or the filesystem root is never allowed",
    ]);
    expect(e.warnedItems).toEqual([
      "Line 4: “C:\\Users\\fixture-home” — warning: a home folder, or a folder that holds home folders: every file in it (keys, tokens, documents) could be uploaded",
    ]);
    expect(optExpected(0, 1).summaryAfterSave).toBe("1 upload folder.");
  });
  const e = optExpected(1, 2);
  const good = {
    standingCount: 1,
    summaryAfterSave: e.summaryAfterSave,
    summaryTyped: e.summaryTyped,
    summaryAfterRevert: e.summaryAfterSave,
    invalidItems: e.invalidItems,
    warnedItems: e.warnedItems,
    setSha: H1,
    storedSha: H1,
    storedWhileTypingSha: H1,
    o2Ms: 800,
    o2Conflict: false,
  };
  it("verdicts", () => {
    expect(optVerdict(good, e).every((x) => x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, storedSha: H2 }, e).some((x) => !x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, storedWhileTypingSha: H2 }, e).some((x) => !x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, o2Ms: 5001 }, e).some((x) => !x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, o2Conflict: true }, e).some((x) => !x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, standingCount: 2 }, e).some((x) => !x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, warnedItems: [] }, e).some((x) => !x.j.pass)).toBe(true);
    expect(optVerdict({ ...good, summaryAfterRevert: e.summaryTyped }, e).some((x) => !x.j.pass)).toBe(true);
  });
});

describe("UP-RESTORE: read-back by count and hash", () => {
  it("equal state passes, and the line prints no hash", () => {
    expect(restoreVerdict(box(), box()).pass).toBe(true);
    const line = restoreLine(box(), box());
    expect(line).not.toContain(H1);
    expect(line).not.toContain(H2);
    expect(line).toBe("RESTORE armed=equal evaluate=equal blocklist lines=2 hash=equal uploadfolders lines=1 hash=equal");
  });
  it("a changed hash with the same count fails", () => {
    expect(restoreVerdict(box(), box({ blocklist: { lines: 2, sha256: H2 } })).pass).toBe(false);
    expect(restoreVerdict(box(), box({ uploadfolders: { lines: 1, sha256: H1 } })).pass).toBe(false);
    expect(restoreLine(box(), box({ blocklist: { lines: 2, sha256: H2 } }))).toContain("blocklist lines=2 hash=DIFFERENT");
  });
  it("count, armed, evaluate and unreadable hash fail", () => {
    expect(restoreVerdict(box(), box({ blocklist: { lines: 3, sha256: H1 } })).pass).toBe(false);
    expect(restoreVerdict(box(), box({ armed: false })).pass).toBe(false);
    expect(restoreVerdict(box(), box({ evaluate: false })).pass).toBe(false);
    expect(restoreVerdict(box(), box({ blocklist: { lines: 2, sha256: "zz" } })).pass).toBe(false);
    const w = restoreVerdict(box(), box({ blocklist: { lines: 2, sha256: H2 } })).why;
    expect(w).not.toContain(H2);
  });
});

describe("isFixture11 (#277 (b))", () => {
  it("counts only http on 127.0.0.1 / *.localhost at 8081 and 8084, chrome://extensions, and the own extension id", () => {
    for (const u of ["http://127.0.0.1:8081/s11-upload.html", "http://127.0.0.1:8084/x", "http://localhost:8084/s11-upload.html", "http://s11-ab12.localhost:8081/x", "chrome://extensions", "chrome://extensions/?id=abc"]) expect(isFixture11(u), u).toBe(true);
    expect(isFixture11("chrome-extension://ownid/options.html", "ownid")).toBe(true);
    expect(isFixture11("chrome-extension://OWNID/options.html", "ownid")).toBe(true);
  });
  it("everything else counts as other, another loopback port included", () => {
    for (const u of ["http://127.0.0.1:8080/", "http://127.0.0.1:9234/", "http://localhost:8083/", "http://127.0.0.1/", "http://127.0.0.1:80811/", "ws://127.0.0.1:8081/", "https://127.0.0.1:8081/", "https://example.com/", "http://evil.com:8081/", "http://x@evil.com:8081/", "http://127.0.0.1.evil.com:8081/", "chrome://settings", "chrome-extension://other/x"]) expect(isFixture11(u, "ownid"), u).toBe(false);
    expect(isFixture11("chrome-extension://ownid/x")).toBe(false);
    expect(isFixture11("not a url")).toBe(false);
  });
  it("scanText applies it, with the own id", () => {
    const base = { sentinel: "sd", profile: [] as string[] };
    expect(scanText("http://127.0.0.1:8080/a http://127.0.0.1:8081/b", base)).toMatchObject({ urls: 2, fixture: 1, other: 1 });
    expect(scanText("chrome-extension://ownid/options.html", { ...base, ownId: "ownid" })).toMatchObject({ fixture: 1, other: 0 });
    expect(scanText("chrome-extension://ownid/options.html", base)).toMatchObject({ fixture: 0, other: 1 });
  });
});

describe("UP-LOGS", () => {
  const ctx = { token: "tok-SECRET-123", sentinel: "sentinelDir", profile: ["C:\\Users\\someone"] };
  it("counts and the SCAN line", () => {
    const clean = "GET http://127.0.0.1:8081/s11-upload.html and http://localhost:8084/x and http://upblk.localhost:8081/x and chrome://extensions/";
    const s = scanText(clean, ctx);
    expect(s).toMatchObject({ urls: 4, fixture: 4, other: 0, token: 0, sentinel: 0, profile: 0, tokenKnown: true });
    expect(logsLine("daemon.log", s)).toBe("SCAN daemon.log: ://=4 (fixture 4, other 0) token=0 sentinel=0 profile=0");
    expect(logsVerdict(s, {}).pass).toBe(true);
  });
  it("each leak is counted and is a STOP", () => {
    const dirty = "https://example.com/a tok-SECRET-123 SENTINELDIR C:\\Users\\someone C:/Users/someone C:\\\\Users\\\\someone";
    const s = scanText(dirty, ctx);
    expect(s.other).toBe(1);
    expect(s.token).toBe(1);
    expect(s.sentinel).toBe(1);
    expect(s.profile).toBe(3);
    const v = logsVerdict(s, {});
    expect(v.pass).toBe(false);
    expect(v.why).toMatch(/^STOP/);
    expect(v.why).not.toContain("tok-SECRET-123");
    expect(logsVerdict(scanText("chrome-extension://abc/x", ctx), {}).pass).toBe(false);
    expect(logsVerdict(scanText("tok-SECRET-123", ctx), {}).pass).toBe(false);
  });
  it("an unknown token is NOT MEASURED; the console control is required", () => {
    const s = scanText("nothing", { ...ctx, token: undefined });
    expect(logsVerdict(s, {}).notMeasured).toBe(true);
    expect(logsVerdict(scanText("nothing", ctx), { consoleControl: false }).notMeasured).toBe(true);
    expect(logsVerdict(scanText("nothing", ctx), { consoleControl: true }).pass).toBe(true);
  });
});

describe("UP-RAW, UP-RACE, row lines", () => {
  it("rawLeaks counts slash, backslash and JSON-escaped forms", () => {
    expect(rawLeaks("x C:\\w\\root y C:/w/root z C:\\\\w\\\\root", ["C:\\w\\root"])).toBe(3);
    expect(rawLeaks("clean", ["C:\\w\\root"])).toBe(0);
  });
  it("race: oks then exact refusals, discriminating only with both", () => {
    const ok = "ok" as const;
    const d = K["K-disarmed"];
    const marks = { added: 4, removed: 4, left: 0 };
    const r = raceVerdict("K-disarmed", [ok, ok, d, d, d, d, d], marks);
    expect(r.line).toBe("2 ok, then 5 K-disarmed");
    expect(r.verdict.pass).toBe(true);
    expect(raceVerdict("K-disarmed", [ok, ok, ok], marks).verdict.notMeasured).toBe(true);
    expect(raceVerdict("K-disarmed", [d, d, d], marks).verdict.notMeasured).toBe(true);
    expect(raceVerdict("K-disarmed", [ok, { ...d, message: "x" }], marks).verdict.pass).toBe(false);
    expect(raceVerdict("K-disarmed", [ok, d, ok, d], marks).verdict.pass).toBe(false);
    expect(raceVerdict("K-disarmed", [ok, d], { added: 2, removed: 1, left: 0 }).verdict.pass).toBe(false);
    expect(raceDone([ok, d, d, d, d, d], 80)).toBe(true);
    expect(raceDone([d, d, d, d, ok, d], 80)).toBe(false);
    expect(raceDone(new Array(80).fill(ok), 80)).toBe(true);
  });
  it("row lines", () => {
    expect(rowLine("UP-6", { pass: true, why: "all five" })).toBe("ROW UP-6 PASS: all five");
    expect(rowLine("UP-6", { pass: false, why: "w" })).toBe("ROW UP-6 FAIL: w");
    expect(rowLine("UP-FA", { pass: false, notMeasured: true, why: "w" })).toBe("ROW UP-FA NOT MEASURED: w");
  });
});

describe("remaining rows", () => {
  it("UP-L1 build, UP-2 spec, UP-8, UP-PATCH", () => {
    expect(buildJudge(H1, H1).pass).toBe(true);
    expect(buildJudge(H1, H2).pass).toBe(false);
    expect(UP2_SPEC.map((f) => f.bytes)).toEqual([0, 5242880, 52428800]);
    const u8 = { header: "default-src 'self'; script-src 'self'", inlineRanU8: false, inlineRanU1: true };
    expect(up8Verdict(u8).pass).toBe(true);
    expect(up8Verdict({ ...u8, header: "x" }).pass).toBe(false);
    expect(up8Verdict({ ...u8, inlineRanU8: true }).pass).toBe(false);
    expect(up8Verdict({ ...u8, inlineRanU1: false }).notMeasured).toBe(true);
    expect(patchVerdict({ before: 2, afterUpload: 2, afterControl: 3 }).pass).toBe(true);
    expect(patchVerdict({ before: 2, afterUpload: 3, afterControl: 4 }).pass).toBe(false);
    expect(patchVerdict({ before: 2, afterUpload: 2, afterControl: 2 }).notMeasured).toBe(true);
  });
  it("UP-FA, UP-RAW, UP-NAV, UP-STALE, save files, check line", () => {
    expect(faVerdict({ err: K["K-noacc"], page: page0 }).why).toContain("pre-written");
    expect(faVerdict({ err: K["K-gate"], page: page0 }).why).toContain("NOT as pre-written");
    expect(faVerdict({ err: K["K-noacc"], page: page0, banner: true }).pass).toBe(false);
    expect(rawVerdict({ leaks: 0, page: page0 }).pass).toBe(true);
    expect(rawVerdict({ leaks: 1, page: page0 }).pass).toBe(false);
    expect(navVerdict({ newDocIsPost: false, newDocMutations: 0, left: 0 }).notMeasured).toBe(true);
    expect(navVerdict({ newDocIsPost: true, newDocMutations: 1, left: 0 }).pass).toBe(false);
    expect(staleVerdict({ tabPresent: false, added: 0, removed: 0, left: 0 }).notMeasured).toBe(true);
    expect(staleVerdict({ tabPresent: true, added: 1, removed: 0, left: 1 }).pass).toBe(false);
    expect(saveFilesVerdict([]).pass).toBe(true);
    expect(saveFilesVerdict(["a.part"]).pass).toBe(false);
    expect(checkLine("x", { pass: true, why: "w" })).toBe("CHECK x PASS: w");
  });
});

// Tests for recipes/s10-rules.ts — the pass rules and expected texts of Step 10's live rows (docs/e2e-test-plan.md
// §4.22, Run 15), dry-run on known-good and known-bad inputs before the wave, and a drift test: every expected text
// is compared with the committed product constant (or the source line) it was copied from, so a wording change
// fails here first. Written 2026-10-25 by the S7 prep builder, before any R15 row ran.
import { readFileSync } from "node:fs";
import { dirname, join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { safetyRefusalLine } from "@bridge/sdk/report";
import { BridgeError } from "@bridge/shared";
import { BLOCKED_TAB_MESSAGE, DISARMED_ALL_MESSAGE, EXTENSION_URL_MESSAGE, JS_DISABLED_MESSAGE } from "../../extension/src/safety.js";
import { CAP_WARNING_LINE } from "../../mcp/src/tools/registry.js";
import { collectSaveText, primitiveSaveText, STRINGIFY_FAILED_MESSAGE } from "../../extension/src/evaluate/save.js";
import { EvaluateSaveStore } from "../../extension/src/evaluate-save-store.js";
import { evaluateSaveStart } from "../../extension/src/handlers/evaluate-save.js";
import { actorEnv, mcpConfig, W_TITLE as S9_W_TITLE, s9Url } from "../s9-rules.js";
import { RETURN_RE, wrapExpression } from "../../extension/src/evaluate/wrap.js";
import {
  answerBound,
  answerIs,
  answerVerdict,
  BBL_LEGS,
  BBL_OLD_COMMIT,
  bblTimes,
  bblVerdict,
  BLK_PATTERN,
  callsVerdict,
  capClickVerdict,
  checkLine10,
  clickedText,
  EXPECT10,
  expiredIdMessage,
  EXPR_MARKER,
  FIXTURE_TEXT,
  hidePath,
  idonlyReading,
  isFixture10,
  isPageDigest,
  judge10,
  mcpfOffVerdict,
  mcpfVerdict,
  memRecord,
  onlyText,
  PAGES,
  parseSaveAnswer,
  parseTurn,
  pop2Class,
  pop2Reading,
  pressedText,
  primReading,
  promptPath,
  PROMPTS,
  ret1Verdict,
  retiredCount,
  rowLine10,
  SAVE_PREFIX,
  saveAnswer,
  saveVerdict,
  scan10,
  scanLine10,
  scanVerdict10,
  scrub10,
  serverHits,
  setupTabs,
  sha256Hex,
  sharedRuns,
  show10,
  step10Check,
  stopLine10,
  SURR,
  surrVerdict,
  swOutcome,
  descendants,
  lateChildren,
  headlessKillable,
  PIN_NAME,
  PIN_NARROW_PX,
  PIN_WAIT_MS,
  PIN_WIDEN_AFTER_MS,
  PIN_WIDEN_TO_PX,
  pinNameMatches,
  pinStep,
  sameProcess,
  TREE_KILL_NAMES,
  treeKillable,
  type ProcRow,
  swMeasured,
  swPre,
  blockDependencyGaps,
  mcpfTally,
  runnerBlocks,
  runnerCalls,
  runnerLists,
  S10_VALUE_NEEDS,
  tabGoneMessage,
  tabHeldRe,
  toolLine,
  typedCssText,
  W_TITLE,
  WANT,
  type PageDigest,
  type PageEvent,
  harnessExpression,
  SW_ROWS,
  valueExpr,
} from "../s10-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = (p: string): string => readFileSync(join(REPO, p), "utf8");
const OWN = "cpnemjbgecfbeicldpaaegbhjgjgjfep";

describe("drift: every expected text equals the committed product text it was copied from", () => {
  it("the safety messages and the MCP's one-line refusals", () => {
    expect(EXPECT10.disarmedAll).toBe(DISARMED_ALL_MESSAGE);
    expect(EXPECT10.jsDisabled).toBe(JS_DISABLED_MESSAGE);
    expect(EXPECT10.blockedTab).toBe(BLOCKED_TAB_MESSAGE);
    expect(EXPECT10.extensionUrl).toBe(EXTENSION_URL_MESSAGE);
    expect(EXPECT10.mcpDisarmedAll).toBe(safetyRefusalLine("DISARMED", { scope: "all" }));
    expect(EXPECT10.mcpJsDisabled).toBe(safetyRefusalLine("JS_DISABLED", undefined));
  });

  it("the cap warning line (S3)", () => {
    expect(EXPECT10.capWarning).toBe(CAP_WARNING_LINE);
  });

  it("the Step 10 build check: evaluateSaveStart's empty-expression refusal, before any Chrome call", async () => {
    const err = await evaluateSaveStart({ tabId: 1, expression: "" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe("BAD_PARAMS");
    expect((err as BridgeError).message).toBe(EXPECT10.saveStartEmpty);
  });

  it("the save refusals (extension/src/evaluate/save.ts)", async () => {
    expect(() => primitiveSaveText({ type: "undefined" })).toThrow(EXPECT10.refuseUndefined);
    const reason = async (r: string): Promise<string> => {
      const send = async (method: string, params: Record<string, unknown>): Promise<unknown> => {
        if (method === "Runtime.evaluate") return { result: { type: "object", objectId: "o1" } };
        if (method === "Runtime.callFunctionOn" && params.objectId === "o1") return { result: { type: "object", objectId: "h1" } };
        if (method === "Runtime.callFunctionOn") return { result: { type: "object", value: [0, "", r] } };
        return {};
      };
      const e = await collectSaveText("x", 1000, { send }).catch((x: unknown) => x);
      return (e as Error).message;
    };
    expect(await reason("undefined")).toBe(EXPECT10.refuseUndefined);
    expect(await reason("node")).toBe(EXPECT10.refuseNode);
    expect(await reason("map")).toBe(EXPECT10.refuseMap);
    expect(await reason("stringify")).toBe(EXPECT10.stringifyFailed);
    expect(EXPECT10.stringifyFailed).toBe(STRINGIFY_FAILED_MESSAGE);
  });

  it("the store's unknown-or-expired id text", () => {
    const s = new EvaluateSaveStore();
    expect(() => s.chunk("es9-test", 1, 0, 10)).toThrow(expiredIdMessage("es9-test"));
    let now = 0;
    const t = new EvaluateSaveStore({ now: () => now });
    const id = t.put(7, new Uint8Array(10), "string");
    now += 5 * 60_000 + 1; // the TTL (300 s) passed with no pull
    expect(() => t.chunk(id, 7, 0, 10)).toThrow(expiredIdMessage(id));
  });

  it("the daemon's TAB_HELD and TAB_GONE texts (source lines of daemon/src/intercept.ts)", () => {
    const d = src("daemon/src/intercept.ts");
    expect(d).toContain("`tab ${handle} is held by ${JSON.stringify(owner)} since ${hhmmss(c.since)} — use browser_new_tab, or browser_list_tabs to pick a free tab`");
    expect(d).toContain("return new Date(epochMs).toISOString().slice(11, 19);");
    expect(d).toContain("`tab ${handle} was closed — call listTabs to pick another tab`");
    expect(tabHeldRe("T12", "s10-save-hold-A").test('tab T12 is held by "s10-save-hold-A" since 21:04:05 — use browser_new_tab, or browser_list_tabs to pick a free tab')).toBe(true);
    expect(tabHeldRe("T12", "s10-save-hold-A").test('tab T12 is held by "other" since 21:04:05 — use browser_new_tab, or browser_list_tabs to pick a free tab')).toBe(false);
    expect(tabGoneMessage("T7")).toBe("tab T7 was closed — call listTabs to pick another tab");
  });

  it("the MCP answers (source lines of mcp/src/tools/registry.ts)", () => {
    const r = src("mcp/src/tools/registry.ts");
    expect(r).toContain("return capped(reply, `Clicked ${describeTarget(target)}`);");
    expect(r).toContain("return capped(reply, `Typed into ${describeTarget(target)}`);");
    expect(r).toContain("return capped(reply, `Pressed ${key}`);");
    expect(r).toContain('if ("role" in l) s = typeof l.name === "string" ? `${l.role} "${l.name}"` : l.role;');
    expect(r).toContain("else s = `css ${l.css}`;");
    expect(r).toContain("return text(`Saved ${r.path}\\n${r.bytes} bytes · ${r.kind} · sha256 ${r.sha256}`);");
    expect(r).toContain("return text(past ? `${message}\\n${CAP_WARNING_LINE}` : message);");
    expect(clickedText("button", "Cap item 0900")).toBe('Clicked button "Cap item 0900"');
    expect(typedCssText("#mcpf-input")).toBe("Typed into css #mcpf-input");
    expect(pressedText("Escape")).toBe("Pressed Escape");
    expect(saveAnswer("C:\\x\\s15v-a.txt", 3, "string", "a".repeat(64))).toBe(`Saved C:\\x\\s15v-a.txt\n3 bytes · string · sha256 ${"a".repeat(64)}`);
  });

  it("the fixtures: titles and the texts setup waits for; W keeps Run 14's title; tab a keeps Run 14's URL", () => {
    for (const [page, text] of Object.entries(FIXTURE_TEXT)) {
      const html = src(`test-fixtures/${page}`);
      expect(html).toContain(text);
    }
    expect(src(`test-fixtures/${PAGES.mcpf}`)).toContain("<title>S10 MCPF fixture</title>");
    expect(src(`test-fixtures/${PAGES.cap}`)).toContain("<title>S10 CAP fixture</title>");
    expect(src(`test-fixtures/${PAGES.save}`)).toContain("<title>S10 SAVE fixture</title>");
    expect(W_TITLE).toBe(S9_W_TITLE);
    const tabs = setupTabs();
    expect(tabs.find((t) => t.key === "a")?.url).toBe(s9Url("http://localhost:8080", "a"));
    expect(new Set(tabs.map((t) => t.key)).size).toBe(tabs.length);
    expect(tabs.find((t) => t.key === "blk")?.url.startsWith(`http://${BLK_PATTERN}:8080/`)).toBe(true);
    // the popup link R15-POP-2 clicks on its playground tab
    expect(src("test-fixtures/e2e-playground.html")).toContain('<a id="open-popup" href="e2e-playground.html?popup=1" target="_blank">Open popup</a>');
  });

  it("BBL-1's legs: each fixture page and counter exists (recipes/fixtures, S5)", () => {
    for (const leg of Object.values(BBL_LEGS)) {
      expect(src(`recipes/fixtures/${leg.page}`).length).toBeGreaterThan(0);
    }
    expect(src("recipes/fixtures/sso-standin-delayed.html")).toContain("/sso-submit-delayed.html?t=");
    expect(src("recipes/fixtures/sso-standin-stuck.html")).toContain("submit-stuck");
    expect(src("recipes/fixtures/sso-standin-elsewhere.html")).toContain("/elsewhere-landing.html?t=");
    expect(BBL_OLD_COMMIT).toMatch(/^[0-9a-f]{7}$/);
    // the new script's own lines the verdict reads (recipes/bb-login.ps1, S5)
    const b = src("recipes/bb-login.ps1");
    expect(b).toContain('Say "own window $H opened"');
    expect(b).toContain('Say "invoked the one $what once (the autofilled form submitted; nothing typed, nothing read)"');
    expect(b).toContain('Say ("after submit: bound of {0} s reached at {1} from the press;');
  });
});

describe("sharedRuns: no k-character run of a value in a text", () => {
  it("counts the text positions whose k-window occurs in the value", () => {
    expect(sharedRuns("GHJKLMNPQRSTUVWXYZ", "xx JKLMNP yy", 6)).toBe(1);
    expect(sharedRuns("GHJKLMNPQRSTUVWXYZ", "xx JKLMNPQ yy", 6)).toBe(2);
    expect(sharedRuns("GHJKLMNPQRSTUVWXYZ", "xx JKLMN yy", 6)).toBe(0);
    expect(sharedRuns("abc", "abc", 4)).toBe(0);
    expect(sharedRuns("", "", 1)).toBe(0);
    expect(() => sharedRuns("a", "a", 0)).toThrow();
  });

  it("finds a run at the very start and the very end of a large value, and none in a disjoint alphabet", () => {
    const value = "GH".repeat(100_000) + "QRSTUVWXYZQRSTUVWXYZQRSTUVWXYZQR" + "JK".repeat(100_000);
    expect(sharedRuns(value, "[GHGHGHGHGHGHGHGHGHGHGHGHGHGHGHGH]", 32)).toBe(1);
    expect(sharedRuns(value, "QRSTUVWXYZQRSTUVWXYZQRSTUVWXYZQR", 32)).toBe(1);
    expect(sharedRuns(value, "JKJKJKJKJKJKJKJKJKJKJKJKJKJKJKJK!", 32)).toBe(1);
    expect(sharedRuns(value, "Saved C:\\Users\\x\\s15v-1m.txt\n1048576 bytes · string · sha256 " + "0123456789abcdef".repeat(4), 16)).toBe(0);
  });

  it("works on UTF-16 code units (an astral character and a lone surrogate)", () => {
    const v = "AAAA\u{1F600}BBBB\uD800CCCC";
    expect(sharedRuns(v, "x\u{1F600}BBy", 5)).toBe(0);
    expect(sharedRuns(v, "y\u{1F600}BBBz", 5)).toBe(1);
    expect(sharedRuns(v, "B\uD800CC", 4)).toBe(1);
  });
});

const PAGE: PageDigest = { key: "1m", kind: "string", length: 10, bytes: 10, sha256: "a".repeat(64) };

describe("the SAVE rules", () => {
  it("saveVerdict: page = file = report, no .part", () => {
    const f = { exists: true, part: false, bytes: 10, sha256: "a".repeat(64) };
    expect(saveVerdict(PAGE, f, { bytes: 10, kind: "string", sha256: "a".repeat(64) }).pass).toBe(true);
    expect(saveVerdict(PAGE, { ...f, sha256: "b".repeat(64) }, { bytes: 10, kind: "string", sha256: "a".repeat(64) }).pass).toBe(false);
    expect(saveVerdict(PAGE, { ...f, part: true }, { bytes: 10, kind: "string", sha256: "a".repeat(64) }).pass).toBe(false);
    expect(saveVerdict(PAGE, f, { bytes: 10, kind: "json", sha256: "a".repeat(64) }).pass).toBe(false);
    expect(saveVerdict(PAGE, f, null).pass).toBe(false);
    expect(saveVerdict(PAGE, { exists: false, part: false, bytes: null, sha256: null }, null).pass).toBe(false);
  });

  it("the answer: the exact form, the bound min(300, path + 120), no 16-character run", () => {
    const path = "C:\\Users\\aliev\\AppData\\Local\\Temp\\bridge-e2e\\s15\\sv\\s15v-1m-mcp.txt";
    const a = saveAnswer(path, 10, "string", "a".repeat(64));
    expect(answerBound(path)).toBe(path.length + 120);
    expect(answerBound("C:\\" + "x".repeat(400))).toBe(300);
    expect(answerVerdict(a, path, PAGE, 0).pass).toBe(true);
    expect(answerVerdict(`${a}\n`, path, PAGE, 0).pass).toBe(false);
    expect(answerVerdict(a, path, PAGE, 1).pass).toBe(false);
    expect(answerVerdict(a.replace("string", "json"), path, PAGE, 0).pass).toBe(false);
    expect(parseSaveAnswer(a)).toEqual({ path, bytes: 10, kind: "string", sha256: "a".repeat(64) });
    expect(parseSaveAnswer("Saved x")).toBeNull();
  });

  it("hidePath hides both slash forms; promptPath uses forward slashes", () => {
    const p = "C:\\T\\sv\\s15v-x.txt";
    expect(hidePath(`Saved ${p}`, p)).toBe("Saved <saveTo>");
    expect(hidePath("at C:/T/sv/s15v-x.txt.", p)).toBe("at <saveTo>.");
    expect(promptPath(p)).toBe("C:/T/sv/s15v-x.txt");
    expect(win32.normalize(promptPath(p))).toBe(p);
  });

  it("SURR: the file layout of s10-save.html's `surr` value", () => {
    const MIB = 1048576;
    const v = "G".repeat(MIB - 1) + "\uD83D\uDE00" + "H".repeat(100) + "\uD800" + "J".repeat(100) + "\uDC00" + "K".repeat(MIB);
    expect(v.length).toBe(SURR.length);
    const bytes = new TextEncoder().encode(v);
    expect(surrVerdict(bytes)).toEqual({ pass: true, why: expect.stringContaining("whole across") });
    const broken = new Uint8Array(bytes);
    broken[SURR.loneHighAt] = 0x3f;
    expect(surrVerdict(broken).pass).toBe(false);
    expect(surrVerdict(null).pass).toBe(false);
  });

  it("primReading: #217's outcome table", () => {
    expect(primReading({ ok: true, ms: 1 }, { pass: true, why: "" }, 67108871).revisit).toBe("not met");
    expect(primReading({ ok: false, code: "INTERNAL", ms: 1 }, null, 67108871).revisit).toBe("met");
    expect(primReading({ ok: true, ms: 1 }, { pass: false, why: "x" }, 67108871).revisit).toBe("corrupt");
  });

  it("idonlyReading: #217's outcome table, with the object control", () => {
    const yes = { accepted: true, type: "object", objectId: true, value: false };
    const prim = { accepted: true, type: "string", objectId: false, value: true };
    expect(idonlyReading({ prim, object: yes, plain: prim }).revisit).toBe("not met");
    expect(idonlyReading({ prim: { ...prim, objectId: true }, object: yes, plain: prim }).revisit).toBe("met");
    expect(idonlyReading({ prim: { accepted: false, error: "Invalid parameters", objectId: false, value: false }, object: yes, plain: prim }).revisit).toBe("not met");
    expect(idonlyReading({ prim, object: { ...yes, objectId: false }, plain: prim }).revisit).toBe("not measured");
  });

  it("isPageDigest", () => {
    expect(isPageDigest(PAGE)).toBe(true);
    expect(isPageDigest({ ...PAGE, sha256: "xyz" })).toBe(false);
    expect(isPageDigest(null)).toBe(false);
  });
});

describe("judging calls", () => {
  it("judge10: code, exact message, data absent or equal", () => {
    expect(judge10({ ok: false, code: "JS_DISABLED", message: EXPECT10.jsDisabled, ms: 1 }, WANT.jsDisabled).pass).toBe(true);
    expect(judge10({ ok: false, code: "JS_DISABLED", message: EXPECT10.jsDisabled, data: { scope: "evaluate" }, ms: 1 }, WANT.jsDisabled).pass).toBe(false);
    expect(judge10({ ok: false, code: "DISARMED", message: EXPECT10.jsDisabled, data: { scope: "evaluate" }, ms: 1 }, WANT.jsDisabled).pass).toBe(false);
    expect(judge10({ ok: false, code: "DISARMED", message: EXPECT10.disarmedAll, data: { scope: "all" }, ms: 1 }, WANT.disarmedAll).pass).toBe(true);
    expect(judge10({ ok: true, ms: 1 }, WANT.disarmedAll).pass).toBe(false);
    expect(judge10({ ok: false, code: "TAB_HELD", message: 'tab T1 is held by "A" since 01:02:03 — use browser_new_tab, or browser_list_tabs to pick a free tab', ms: 1 }, { code: "TAB_HELD", messageRe: tabHeldRe("T1", "A") }).pass).toBe(true);
  });

  it("step10Check: the disk build and the Step 10 handler's refusal", () => {
    const sha = "c".repeat(64);
    const good = { ok: false, code: "BAD_PARAMS", message: EXPECT10.saveStartEmpty, ms: 3 };
    expect(step10Check(sha, sha, good).pass).toBe(true);
    expect(step10Check("d".repeat(64), sha, good).pass).toBe(false);
    expect(step10Check(sha, sha, { ok: false, code: "UNKNOWN_METHOD", message: "unknown method: evaluateSaveStart", ms: 3 }).why).toContain("not the Step 10 build");
    expect(step10Check(null, sha, good).pass).toBe(false);
  });

  it("rowLine10 / checkLine10 / stopLine10 never carry the pattern or a non-fixture URL", () => {
    const l = rowLine10("X", "s", { ok: false, code: "NAV_FAILED", message: `at https://bank.example/x and http://${BLK_PATTERN}:8080/s10-save.html`, ms: 2 }, OWN);
    expect(l).not.toContain(BLK_PATTERN);
    expect(l).not.toContain("bank.example");
    expect(l).toContain("<non-fixture url withheld>");
    expect(stopLine10(`x http://${BLK_PATTERN}:8080/y`)).toBe("STOP: x <blocked-fixture url>");
    expect(checkLine10("X", "s", { pass: false, notMeasured: true, why: "w" })).toBe("CHECK X s NOT MEASURED — w");
    expect(show10("http://localhost:8080/s10-cap.html?s15=cap")).toBe("http://localhost:8080/s10-cap.html?s15=cap");
    expect(show10(`chrome-extension://${OWN}/options.html`, OWN)).toBe(`chrome-extension://${OWN}/options.html`);
    expect(show10("https://example.com/")).toBe("<non-fixture url withheld>");
    expect(scrub10(`a ${BLK_PATTERN} b`)).toBe("a <blocked-fixture> b");
  });
});

describe("MCPF-1 and CAP-1 page reporters", () => {
  const ev = (type: string, isTrusted: boolean, target: string, key = ""): PageEvent => ({ n: 1, type, isTrusted, target, key, vis: "visible" });
  it("click / type / press: trusted on the page and the tab in front", () => {
    expect(mcpfVerdict("click", [ev("click", true, "mcpf-btn")], true).pass).toBe(true);
    expect(mcpfVerdict("click", [ev("click", true, "mcpf-btn")], false).pass).toBe(false);
    expect(mcpfVerdict("click", [ev("click", false, "mcpf-btn")], true).pass).toBe(false);
    expect(mcpfVerdict("click", [], true).pass).toBe(false);
    expect(mcpfVerdict("type", [ev("input", true, "mcpf-input")], true, { value: "mcpf1", text: "mcpf1" }).pass).toBe(true);
    expect(mcpfVerdict("type", [ev("input", true, "mcpf-input")], true, { value: "mcp", text: "mcpf1" }).pass).toBe(false);
    expect(mcpfVerdict("type", [ev("input", true, "mcpf-input"), ev("input", false, "mcpf-input")], true, { value: "mcpf1", text: "mcpf1" }).pass).toBe(false);
    expect(mcpfVerdict("press", [ev("keydown", true, "mcpf-input", "Escape")], true, { key: "Escape" }).pass).toBe(true);
    expect(mcpfVerdict("press", [ev("keydown", true, "mcpf-input", "Enter")], true, { key: "Escape" }).pass).toBe(false);
    expect(mcpfVerdict("press", [ev("keydown", true, "document", "Escape")], null, { key: "Escape" }).pass).toBe(false);
  });
  it("the no-untrusted clauses (S7 prep fixer 1, m1): a trusted plus an untrusted event fails click and type", () => {
    const click = mcpfVerdict("click", [ev("click", true, "mcpf-btn"), ev("click", false, "mcpf-btn")], true);
    expect(click.pass).toBe(false);
    expect(click.why).toBe("an untrusted click reached the button");
    const type = mcpfVerdict("type", [ev("input", true, "mcpf-input"), ev("input", false, "mcpf-input")], true, { value: "mcpf1", text: "mcpf1" });
    expect(type.pass).toBe(false);
    expect(type.why).toBe("an untrusted input reached the field");
    // press: §4.22's rule names no untrusted clause ("press — ≥ 1 trusted keydown Escape"); the fixer may not add one
    // (a pass-rule change) — pinned as written, and an untrusted-only keydown still fails.
    expect(mcpfVerdict("press", [ev("keydown", true, "mcpf-input", "Escape"), ev("keydown", false, "mcpf-input", "Escape")], true, { key: "Escape" }).pass).toBe(true);
    expect(mcpfVerdict("press", [ev("keydown", false, "mcpf-input", "Escape")], true, { key: "Escape" }).pass).toBe(false);
  });
  it("the disarmed leg: nothing reached the page and the tab stayed behind", () => {
    expect(mcpfOffVerdict([], false).pass).toBe(true);
    expect(mcpfOffVerdict([ev("click", true, "mcpf-btn")], false).pass).toBe(false);
    expect(mcpfOffVerdict([], true).pass).toBe(false);
  });
  it("CAP-1: exactly one new click, on the named element", () => {
    expect(capClickVerdict([{ name: "Cap item 0001" }, { name: "Cap item 0900" }], 1, "Cap item 0900").pass).toBe(true);
    expect(capClickVerdict([{ name: "Cap item 0899" }], 0, "Cap item 0900").pass).toBe(false);
    expect(capClickVerdict([], 0, "Cap item 0900").pass).toBe(false);
  });
});

describe("SW-1's outcome table (0.8 with Stage 0 F3)", () => {
  it("3/3 ≥ 950 → runs to its bound; 3/3 ≤ 300 → the event ends the wait; else undetermined", () => {
    expect(swOutcome([950, 1200, 1001])).toBe("runs to its bound");
    expect(swOutcome([300, 12, 0])).toBe("the event ends the wait");
    expect(swOutcome([949, 1200, 1001])).toBe("undetermined");
    expect(swOutcome([301, 12, 0])).toBe("undetermined");
    expect(swOutcome([1000, 1000])).toBe("undetermined");
    expect(swOutcome([1000, NaN, 1000])).toBe("undetermined");
  });
  it("a trial whose pre-check fails is NOT MEASURED and the outcome needs 3/3 measured (S7 prep fixer 1, M2)", () => {
    // (i) needs sw behind, (ii) needs w in front; anything else (or an unlisted tab) is not measured.
    expect(swPre("i", { active: false }).measured).toBe(true);
    expect(swPre("i", { active: true })).toEqual({ measured: false, line: "pre-(i) sw active=true (needs active=false) → NOT MEASURED (never re-run)" });
    expect(swPre("ii", { active: true }).measured).toBe(true);
    expect(swPre("ii", { active: false }).measured).toBe(false);
    expect(swPre("ii", undefined)).toEqual({ measured: false, line: "pre-(ii) w not listed (needs active=true) → NOT MEASURED (never re-run)" });
    // a set-up slip in trial 2 (the restore after (i) missed, so (ii)'s tab is not in front): d is not measured, and
    // two measured trials at d ≈ 0 must not decide "the event ends the wait" (the verifier's M2 case).
    const ds = [12, swPre("ii", { active: false }).measured ? 5 : NaN, 3];
    expect(swMeasured(ds)).toBe(2);
    expect(swOutcome(ds)).toBe("undetermined");
    expect(swOutcome([1000, NaN, 980])).toBe("undetermined");
    expect(swOutcome([12, 5, 3])).toBe("the event ends the wait");
  });
});

describe("R15-POP-2 (#211)", () => {
  it("the class of the popup's openerTabId", () => {
    expect(pop2Class([{ tab: "T9", openerTabId: 5 }], 5)).toBe("held opener");
    expect(pop2Class([{ tab: "T9", openerTabId: 6 }], 5)).toBe("another tab");
    expect(pop2Class([{ tab: "T9" }], 5)).toBe("none");
    expect(pop2Class([], 5)).toBe("no popup");
    expect(pop2Class([{ tab: "T9" }, { tab: "T10" }], 5)).toBe("several popups");
  });
  it("the reading: held opener and no grant is the product defect; other classes are records", () => {
    const ok = { reason: "opener", urlIsPopup: true, ms: 40 };
    expect(pop2Reading("held opener", ok).check?.pass).toBe(true);
    expect(pop2Reading("held opener", null).reading).toContain("PRODUCT DEFECT");
    expect(pop2Reading("held opener", null).check?.pass).toBe(false);
    expect(pop2Reading("held opener", { ...ok, ms: 6000 }).check?.pass).toBe(false);
    expect(pop2Reading("another tab", null).check).toBeNull();
    expect(pop2Reading("none", ok).reading).toContain("unexplained");
    expect(pop2Reading("no popup", null).reading).toContain("NOT MEASURED");
  });
});

describe("BBL-1 (#215)", () => {
  const out = (pressAt: string, lastAt: string, extra: string[] = []): string[] => [
    "2026-10-25T10:00:00.000Z bb-login: own window 123 opened",
    `${pressAt} bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)`,
    ...extra,
    `${lastAt} bb-login: done`,
  ];
  it("reads the press, the last line, the window and the bound line", () => {
    const t = bblTimes(out("2026-10-25T10:00:05.000Z", "2026-10-25T10:01:35.020Z", ["2026-10-25T10:01:35.010Z bb-login: after submit: bound of 90 s reached at 90.010 s from the press; …"]));
    expect(t).toEqual({ pressMs: Date.parse("2026-10-25T10:00:05.000Z"), lastMs: Date.parse("2026-10-25T10:01:35.020Z"), window: 123, boundLine: true, presses: 1 });
  });
  it("the four legs' rules", () => {
    const base = { pressMs: 0, presses: 1, submits: 1 };
    expect(bblVerdict("delayed-old", { ...base, exit: 4, lastMs: 13_000, boundLine: false }).pass).toBe(true);
    expect(bblVerdict("delayed-old", { ...base, exit: 0, lastMs: 13_000, boundLine: false }).pass).toBe(false);
    expect(bblVerdict("delayed-new", { ...base, exit: 0, lastMs: 16_000, boundLine: false }).pass).toBe(true);
    expect(bblVerdict("delayed-new", { ...base, exit: 0, lastMs: 16_000, boundLine: false, submits: 2 }).pass).toBe(false);
    expect(bblVerdict("stuck", { ...base, exit: 4, lastMs: 90_011, boundLine: true }).pass).toBe(true);
    expect(bblVerdict("stuck", { ...base, exit: 4, lastMs: 95_001, boundLine: true }).pass).toBe(false);
    expect(bblVerdict("elsewhere", { ...base, exit: 4, lastMs: 90_028, boundLine: true }).pass).toBe(true);
    expect(bblVerdict("elsewhere", { ...base, exit: 4, lastMs: 30_000, boundLine: false }).pass).toBe(false);
    expect(bblVerdict("elsewhere", { ...base, exit: 4, lastMs: 90_028, boundLine: true, presses: 2 }).pass).toBe(false);
  });
  it("serverHits counts the counter path's GET lines from an offset", () => {
    const log = [
      '127.0.0.1 - - [25/Oct/2026 10:00:01] "GET /submit-stuck?t=1 HTTP/1.1" 200 -',
      '127.0.0.1 - - [25/Oct/2026 10:00:02] "GET /submit-stuck-x HTTP/1.1" 404 -',
      '127.0.0.1 - - [25/Oct/2026 10:00:03] "GET /submit-stuck?t=2 HTTP/1.1" 200 -',
    ].join("\n");
    expect(serverHits(log, "/submit-stuck")).toBe(2);
    expect(serverHits(log, "/submit-stuck", 1)).toBe(1);
  });
});

describe("the scans (S7.6; #213: scheme://host, never a bare ://)", () => {
  it("counts URLs with a host, by class; a bare :// is not a URL", () => {
    const c = scan10(`a http://localhost:8080/x b chrome://extensions c chrome-extension://${OWN}/options.html d https://example.com e :// f ://x`, "", OWN);
    expect(c).toMatchObject({ urls: 4, urlsFixture: 3, urlsOther: 1 });
    expect(isFixture10(`http://${BLK_PATTERN}:8080/x`)).toBe(true);
    expect(isFixture10("http://localhost:9999/")).toBe(false);
    expect(isFixture10("ws://127.0.0.1:9234")).toBe(false);
  });
  it("counts the token, the pattern and the two markers", () => {
    const c = scan10(`tok123 x ${BLK_PATTERN.toUpperCase()} ${EXPR_MARKER}v ${SAVE_PREFIX}1m tok123`, "tok123", OWN);
    expect(c).toMatchObject({ token: 2, pattern: 1, expr: 1, path: 1 });
  });
  it("the scan line holds nothing a later scan would count (Run 14 F1)", () => {
    const line = scanLine10("committed file", scan10(`http://x.example/ ${BLK_PATTERN} ${EXPR_MARKER} ${SAVE_PREFIX}`, "", OWN), 3);
    const again = scan10(line, "", OWN);
    expect(again).toEqual({ urls: 0, urlsFixture: 0, urlsOther: 0, token: 0, pattern: 0, expr: 0, path: 0 });
  });
  it("the mode rules", () => {
    const zero = { urls: 0, urlsFixture: 0, urlsOther: 0, token: 0, pattern: 0, expr: 0, path: 0 };
    expect(scanVerdict10(zero, 0, "daemon").pass).toBe(true);
    expect(scanVerdict10({ ...zero, urls: 1, urlsFixture: 1 }, 0, "daemon").pass).toBe(false);
    expect(scanVerdict10({ ...zero, urls: 1, urlsFixture: 1 }, 0, "committed").pass).toBe(true);
    expect(scanVerdict10({ ...zero, path: 1 }, 0, "committed").pass).toBe(false);
    expect(scanVerdict10({ ...zero, path: 1, expr: 1 }, 0, "transcript").pass).toBe(true);
    expect(scanVerdict10({ ...zero, pattern: 1 }, 0, "transcript").pass).toBe(false);
    expect(scanVerdict10(zero, 1, "transcript").pass).toBe(false);
    expect(scanVerdict10(zero, 0, "console", 0)).toMatchObject({ pass: false, notMeasured: true });
    expect(scanVerdict10(zero, 0, "console", 2).pass).toBe(true);
    expect(scanVerdict10({ ...zero, token: 1 }, 0, "console", 2).pass).toBe(false);
  });
  it("a token not found is NOT MEASURED, never a pass (S7 prep fixer 1, the verifier's NIT)", () => {
    const zero = { urls: 0, urlsFixture: 0, urlsOther: 0, token: 0, pattern: 0, expr: 0, path: 0 };
    for (const mode of ["daemon", "transcript", "committed"] as const) expect(scanVerdict10(zero, 0, mode, 0, false)).toMatchObject({ pass: false, notMeasured: true });
    expect(scanVerdict10(zero, 0, "console", 2, false)).toMatchObject({ pass: false, notMeasured: true });
    expect(scanVerdict10({ ...zero, pattern: 1 }, 0, "daemon", 0, false)).toMatchObject({ pass: false });
    expect(scanVerdict10({ ...zero, pattern: 1 }, 0, "daemon", 0, false).notMeasured).toBeUndefined();
    expect(scanLine10("daemon file", zero, 0, false)).toContain(" token=not found ");
    expect(scanLine10("daemon file", zero, 0)).toContain(" token=0 ");
  });
});

describe("SAVE-64's memory record (a RECORD)", () => {
  it("the process with the largest rise", () => {
    const M = 1048576;
    const r = memRecord([
      { ms: 0, pid: 1, priv: 100 * M },
      { ms: 250, pid: 1, priv: 300 * M },
      { ms: 0, pid: 2, priv: 50 * M },
      { ms: 250, pid: 2, priv: 60 * M },
    ]);
    expect(r).toEqual({ pid: 1, baseMiB: 100, peakMiB: 300, deltaMiB: 200, atMs: 250, n: 2, pids: 2 });
    expect(memRecord([])).toBeNull();
  });
});

describe("actor turns (recipes/s9-actor.ts send's printed format)", () => {
  const turn = [
    "2026-10-25T10:00:00.000Z SENT to m: Call …",
    `2026-10-25T10:00:02.000Z TOOL mcp__chrome-agent-bridge__browser_evaluate {"tab":"T5","expression":"return window.${EXPR_MARKER}v['1m']","saveTo":"C:/T/sv/${SAVE_PREFIX}1m-mcp.txt"}`,
    "2026-10-25T10:00:03.000Z OUTPUT — 1 item(s): text",
    "    [1/1] Saved C:\\T\\sv\\s15v-1m-mcp.txt",
    `    [1/1] 1048576 bytes · string · sha256 ${"e".repeat(64)}`,
    "2026-10-25T10:00:04.000Z TOOL mcp__chrome-agent-bridge__browser_click {\"tab\":\"T6\"}",
    "2026-10-25T10:00:05.000Z OUTPUT (isError) — 1 item(s): text",
    `    [1/1] ${EXPECT10.mcpDisarmedAll}`,
    "2026-10-25T10:00:06.000Z SAYS done ⏎ two",
    "2026-10-25T10:00:06.100Z RESULT-OF-TURN success · done",
  ];
  it("parses the calls, their output items and the end of the turn", () => {
    const t = parseTurn(turn);
    expect(t.ended).toBe(true);
    expect(t.calls.length).toBe(2);
    expect(onlyText(t.calls[0])).toBe(`Saved C:\\T\\sv\\s15v-1m-mcp.txt\n1048576 bytes · string · sha256 ${"e".repeat(64)}`);
    expect(t.calls[0].isError).toBe(false);
    expect(t.calls[1].isError).toBe(true);
    expect(t.says).toEqual(["done\ntwo"]);
    expect(callsVerdict(t.calls, ["browser_evaluate", "browser_click"]).pass).toBe(true);
    expect(callsVerdict(t.calls, ["browser_evaluate"]).pass).toBe(false);
    expect(answerIs(t.calls[1], EXPECT10.mcpDisarmedAll, true).pass).toBe(true);
    expect(answerIs(t.calls[1], EXPECT10.mcpDisarmedAll, false).pass).toBe(false);
    expect(parseTurn(turn.slice(0, -1)).ended).toBe(false);
  });
  it("toolLine withholds the expression and the path", () => {
    const l = toolLine(parseTurn(turn).calls[0]);
    expect(l).toBe('TOOL browser_evaluate {"tab":"T5","expression":"<expr>","saveTo":"<saveTo>"}');
    expect(l).not.toContain(EXPR_MARKER);
    expect(l).not.toContain(SAVE_PREFIX);
  });
  it("the prompts: explicit tab and tool names, no backslash path, no value", () => {
    const p = PROMPTS.saveTo("T5", `return window.${EXPR_MARKER}v['1m']`, "C:\\T\\sv\\s15v-1m-mcp.txt");
    expect(p).toContain('tab "T5"');
    expect(p).toContain("mcp__chrome-agent-bridge__browser_evaluate");
    expect(p).toContain('saveTo "C:/T/sv/s15v-1m-mcp.txt"');
    expect(p).not.toContain("\\");
    expect(PROMPTS.mcpfClick("T3")).toContain('"name":"MCPF target"');
    expect(PROMPTS.mcpfClick("T3")).toContain("trusted true");
    expect(PROMPTS.capClick("T4", "Cap item 0900")).toContain('"name":"Cap item 0900"');
    const j = PROMPTS.jsd("T8", "C:\\T\\sv\\s15v-jsd.txt");
    for (const s of ['"1+1"', "asRef true", '"javascript:void(0)"', '"data:text/html,S15"', 'saveTo "C:/T/sv/s15v-jsd.txt"']) expect(j).toContain(s);
    for (const f of Object.values(PROMPTS)) expect(typeof f).toBe("function");
  });
});

describe("the CHECK line of a sha256 equality uses the real digest", () => {
  it("sha256Hex", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

describe("RET-1 (prepared, not run: G10-2)", () => {
  it("reads the daemon's retire line (source of daemon/src/intercept.ts)", () => {
    expect(src("daemon/src/intercept.ts")).toContain("`extension session changed: ${retired.length} handles retired`");
    expect(retiredCount(["2026-10-25T10:00:00Z extension session changed: 2 handles retired"])).toBe(2);
    expect(retiredCount(["2026-10-25T10:00:00Z extension resync: 5 tabs, 0 gone"])).toBeNull();
  });
  it("the pass rule", () => {
    const url = "http://localhost:8080/e2e-playground.html?s15=ret1";
    const good = { retired: 1, gone: { tab: "T9", lastUrl: url }, handle: "T9", url, after: { ok: false, code: "TAB_GONE", ms: 2 }, safetyEqual: true };
    expect(ret1Verdict(good).pass).toBe(true);
    expect(ret1Verdict({ ...good, retired: 0 }).pass).toBe(false);
    expect(ret1Verdict({ ...good, gone: null }).pass).toBe(false);
    expect(ret1Verdict({ ...good, after: { ok: true, ms: 2 } }).pass).toBe(false);
    expect(ret1Verdict({ ...good, after: { ok: false, code: "TAB_UNKNOWN", ms: 2 } }).pass).toBe(true);
    expect(ret1Verdict({ ...good, safetyEqual: false }).pass).toBe(false);
  });
});

// ── S7 prep fixer 1: the runner's structure (C1, M3, M1, m2) ───────────────────────────────────────────────

describe("the block runner: every row block is self-sufficient (C1, M3)", () => {
  const ps1 = (): string => src("recipes/s10-r15.ps1");
  const tabKeys = ["w", ...setupTabs().map((t) => t.key)];
  it("no dependency gap: every value, tab and state a row block needs is built in that block (or a framing block before it)", () => {
    expect(blockDependencyGaps(ps1(), tabKeys)).toEqual([]);
  });
  it("discriminates: the verifier's C1 runner (no 4m built on blk in saveblk) and M3's (off relying on jsd) have gaps", () => {
    const blocks = runnerBlocks(ps1());
    const saveblk = blocks.get("saveblk") ?? "";
    expect(saveblk).toContain("S10 save-build 4m --tab blk");
    const c1 = ps1().replace(saveblk, saveblk.replace("S10 save-build 4m --tab blk", "Say9 'no build'"));
    expect(blockDependencyGaps(c1, tabKeys)).toEqual(["saveblk: save-block needs 4m on blk, not built earlier in the block"]);
    const ttl = blocks.get("save-ttl") ?? "";
    const m3 = ps1().replace(ttl, ttl.replace("S10 save-build 4m", "Say9 'no build'"));
    expect(blockDependencyGaps(m3, tabKeys)).toEqual(["save-ttl: save-ttl --idle-s 330 needs 4m on save, not built earlier in the block"]);
    const off = blocks.get("off") ?? "";
    const m3off = ps1().replace(off, off.replace(/\r?\n.*S10 mcpf-off-prep.*/, "").replace("[void](Set-S9Switch $global:O -Which evaluate -On $false)", ""));
    const gaps = blockDependencyGaps(m3off, tabKeys);
    expect(gaps).toContain("off: jsd --state off needs JavaScript off, not produced earlier in the block (Set-S9Switch $global:O -Which evaluate -On $false)");
    expect(gaps).toContain("off: mcpf-off --actor off needs MCPF-1-off's page baseline, not produced earlier in the block (S10 mcpf-off-prep)");
    // a producer AFTER the call does not count (the state must exist when the call runs)
    const late = ["$Order = @('setup', 'x')", "$RowBlocks = @('x')", "function B-setup {", "  S10 setup", "}", "function B-x {", "  S10 jsd --state jsoff", "  [void](Set-S9Switch $global:O -Which evaluate -On $false)", "}", ""].join("\n");
    expect(blockDependencyGaps(late, tabKeys)).toEqual(["x: jsd --state jsoff needs JavaScript off, not produced earlier in the block (Set-S9Switch $global:O -Which evaluate -On $false)"]);
    const unknown = ps1().replace("S10 sw1", "S10 sw1-new");
    expect(blockDependencyGaps(unknown, tabKeys)).toEqual(["sw1: s10.ts sw1-new is not in S10_VALUE_NEEDS"]);
  });
  it("the table lists exactly the commands of recipes/s10.ts (but the G10-3 plan) and matches their source", () => {
    const s10 = src("recipes/s10.ts");
    const map = /const commands: Record<string, \(\) => Promise<unknown>> = \{([\s\S]*?)\n\};/.exec(s10)?.[1] ?? "";
    const entries = [...map.matchAll(/^\s*"?([a-z0-9-]+)"?: (?:\(\) => )?(cmd[A-Za-z0-9]+)/gm)].map((m) => ({ cmd: m[1], fn: m[2] }));
    expect(entries.length).toBeGreaterThan(30);
    expect(entries.map((e) => e.cmd).filter((c) => c !== "pp1-plan").sort()).toEqual(Object.keys(S10_VALUE_NEEDS).sort());
    const body = (fn: string): string => {
      const at = s10.indexOf(`async function ${fn}(`);
      const next = s10.slice(at + 1).search(/\n(async function|function|const) /);
      return s10.slice(at, at + 1 + next);
    };
    for (const { cmd, fn } of entries) {
      const b = body(fn);
      const needs = S10_VALUE_NEEDS[cmd];
      if (needs === undefined) continue;
      const reads = /pausedSave\(|pageDigest\(|cmdSave(Sdk|Mcp)\(/.test(b);
      if (needs === "args") continue;
      expect(needs.length > 0, `${cmd}: reads a page value but the table lists none`).toBe(reads);
      for (const n of needs) {
        expect(b, `${cmd} reads "${n.key}"`).toContain(`"${n.key}"`);
        const onTab = b.includes(`"${n.tab}"`) || (n.tab === "save" && /cmdSave(Sdk|Mcp)\(/.test(b));
        expect(onTab, `${cmd} reads it on tab ${n.tab}`).toBe(true);
      }
    }
  });
  it("runnerCalls reads S10 and S10Bg calls in order, comments skipped", () => {
    const calls = runnerCalls("  # S10 save-ttl\n  S10 save-build 4m --tab blk\n  $p = S10Bg 'save-block' @('save-block')\n  try { S10 prim } finally { x }\n");
    expect(calls.map((c) => c.text)).toEqual(["save-build 4m --tab blk", "save-block", "prim"]);
    expect(runnerLists(ps1()).order[0]).toBe("preflight");
  });
});

describe("the block runner: the clean-tree guards ignore only the steps dir (M1)", () => {
  const ps1 = (): string => src("recipes/s10-r15.ps1");
  it("one tracked-status function, excluding exactly the steps dir; preflight strict on it; build compares before/after", () => {
    const fn = /function Get-S15Tracked \{([\s\S]*?)\n\}/.exec(ps1())?.[1] ?? "";
    expect(fn).toContain("git status --porcelain --untracked-files=no -- . ':(exclude)docs/plans/2026-10-24-step10-step8-follow-ups-steps'");
    const blocks = runnerBlocks(ps1());
    expect(blocks.get("preflight")).toMatch(/\$st = @\(Get-S15Tracked\)\s*\r?\n\s*if \(\$st\.Count\) \{ Fail-S15/);
    const build = blocks.get("build") ?? "";
    const before = build.indexOf("$before = @(Get-S15Tracked)");
    const npm = build.indexOf("npm run build");
    const after = build.indexOf("$after = @(Get-S15Tracked)");
    expect(before).toBeGreaterThan(-1);
    expect(before).toBeLessThan(npm);
    expect(after).toBeGreaterThan(npm);
    expect(build).toContain("if (($before -join \"`n\") -ne ($after -join \"`n\")) { Fail-S15");
    // no other porcelain check is left in the runner
    expect(ps1().match(/git status --porcelain/g)?.length).toBe(1);
  });
});

describe("the block runner: every block's worst case fits under the tool's 600 s cap (m2)", () => {
  const ps1 = (): string => src("recipes/s10-r15.ps1");
  const num = (t: string, name: string): number => Number(new RegExp(`^\\$${name} = (\\d+)`, "m").exec(t)?.[1]);
  const table = (t: string, name: string): Map<string, number> =>
    new Map([...(new RegExp(`^\\$${name} = @\\{([^}]*)\\}`, "m").exec(t)?.[1] ?? "").matchAll(/'([a-z0-9-]+)' = (\d+)/g)].map((m) => [m[1], Number(m[2])]));
  it("each block's budget + its longest call outside a node script + the stop procedure's bound ≤ 570 s (30 s under the cap)", () => {
    const t = ps1();
    const def = num(t, "DefaultBudgetS");
    const defU = num(t, "DefaultUnwrappedS");
    const stop = num(t, "StopBoundS");
    const budget = table(t, "BudgetS");
    const unwrapped = table(t, "UnwrappedS");
    expect([def, defU, stop].every((n) => n > 0)).toBe(true);
    for (const k of [...budget.keys(), ...unwrapped.keys()]) expect(runnerLists(t).order).toContain(k);
    for (const b of runnerLists(t).order) expect((budget.get(b) ?? def) + (unwrapped.get(b) ?? defU) + stop, b).toBeLessThanOrEqual(570);
    // the deadline is set from the table at every block's start, and every node script runs through Invoke-S15Node
    expect(t).toContain("$global:S15Deadline = (Get-Date).AddSeconds($global:S15BudgetS)");
    expect(t).not.toMatch(/node --import tsx recipes|& node /);
  });
  it("actor turns are bounded so a block's turns fit its budget", () => {
    const s10 = src("recipes/s10.ts");
    expect(s10).toMatch(/const TURN_S = 75;/);
    expect(s10).toMatch(/const TURN_BIG_S = 240;/);
    const def = num(ps1(), "DefaultBudgetS");
    expect(4 * (75 + 5)).toBeLessThanOrEqual(def); // mcpf-click: the focus question + 3 trials (+ ~5 s each to spawn)
    expect(65 + 240 + 5).toBeLessThanOrEqual(def); // save-64-mcp: the 64m build's 60 s page bound + one big turn
  });
  it("MCPF-1's tally across its three blocks", () => {
    expect(mcpfTally({ click: 3, type: 3, press: 3 })).toEqual({ line: "tally click 3/3 · type 3/3 · press 3/3", check: { pass: true, why: "3/3 each" } });
    expect(mcpfTally({ click: 3, type: 2, press: 3 }).check).toEqual({ pass: false, why: "click 3/3, type 2/3, press 3/3" });
    expect(mcpfTally({ press: 3 })).toEqual({ line: "tally click not in this attempt · type not in this attempt · press 3/3", check: { pass: false, notMeasured: true, why: "click, type not run in this attempt" } });
  });
});

describe("which processes the wave may kill (S7 prep fixer 2, W1)", () => {
  const row = (pid: number, ppid: number, born: number, name = "node.exe", cmd = ""): ProcRow => ({ pid, ppid, born, name, cmd });
  // PID 100 is the wave's timed-out node call (born 1000). PID 100 was used before: an earlier holder's orphans still
  // carry ParentProcessId 100 — a Chrome browser process born 500 (its launcher has exited) and its renderer.
  const table: ProcRow[] = [
    row(100, 7, 1000, "node.exe", "node --import tsx recipes/s10.ts sw1"),
    row(101, 100, 1001, "cmd.exe"),
    row(102, 101, 1002, "claude.exe"),
    row(200, 100, 500, "chrome.exe", "chrome.exe"),
    row(201, 200, 600, "chrome.exe", "chrome.exe --type=renderer"),
    row(103, 100, 0, "node.exe"),
    row(104, 100, 1000, "conhost.exe"),
  ];
  it("a descendant is created no earlier than its parent, level by level (the orphans of a reused PID are excluded)", () => {
    expect(descendants(100, table).map((r) => r.pid)).toEqual([100, 101, 104, 102]);
    // the walk the runner used before (ParentProcessId only, s9-win.ps1 Get-ProcTree) takes the user's Chrome
    const naive = (root: number): number[] => {
      const ids = [root];
      for (let i = 0; i < ids.length; i++) for (const r of table) if (r.ppid === ids[i] && !ids.includes(r.pid)) ids.push(r.pid);
      return ids;
    };
    expect(naive(100)).toContain(200);
    expect(naive(100)).toContain(201);
    expect(descendants(999, table)).toEqual([]);
  });
  it("a child started after the tree was identified is found; a reused PID's own children are not", () => {
    const members = descendants(100, table); // 100, 101, 104, 102 (born 1000-1002)
    // after the kill pass: 100 and 101 are gone; 102 (claude) started a child before its kill; PID 101 was reused by an
    // unrelated process (born 5000) whose child (born 5001) must stay; the earlier orphans (Chrome 200/201) stay.
    const after: ProcRow[] = [
      row(200, 100, 500, "chrome.exe"),
      row(201, 200, 600, "chrome.exe"),
      row(110, 102, 1003, "node.exe", "node mcp/dist/index.js"),
      row(111, 110, 1004, "conhost.exe"),
      row(101, 9, 5000, "notepad.exe"),
      row(112, 101, 5001, "node.exe"),
      row(113, 101, 1002, "node.exe"), // started by the wave's 101 before 101 was killed and its PID reused
    ];
    expect(lateChildren(members, after).map((r) => r.pid).sort()).toEqual([110, 111, 113]);
    // a member still alive with its recorded creation time was not killed: its children are not "late"
    expect(lateChildren([row(300, 1, 10)], [row(300, 1, 10), row(301, 300, 11)])).toEqual([]);
    // unknown creation times exclude
    expect(lateChildren([row(300, 1, 0)], [row(301, 300, 11)])).toEqual([]);
    expect(lateChildren([row(300, 1, 10)], [row(301, 300, 0)])).toEqual([]);
    expect(lateChildren([], after)).toEqual([]);
  });
  it("a tree kill never takes chrome.exe, and only the images a node call starts", () => {
    expect(treeKillable(row(1, 0, 1, "chrome.exe")).ok).toBe(false);
    expect(treeKillable(row(1, 0, 1, "Chrome.EXE")).ok).toBe(false);
    for (const n of ["node.exe", "claude.exe", "cmd.exe", "conhost.exe", "esbuild.exe"]) expect(treeKillable(row(1, 0, 1, n)).ok).toBe(true);
    expect(treeKillable(row(1, 0, 1, "python.exe")).ok).toBe(false);
    expect(TREE_KILL_NAMES).not.toContain("chrome.exe");
  });
  it("the headless Chrome: its own profile under %TEMP%\\bridge-e2e\\s15, created after the launch stamp", () => {
    const temp = "C:\\Users\\u\\AppData\\Local\\Temp";
    const dir = `${temp}\\bridge-e2e\\s15\\idonly-profile`;
    const ok = row(300, 1, 2000, "chrome.exe", `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless=new --user-data-dir=${dir} --remote-debugging-port=9301`);
    expect(headlessKillable(ok, 1999, dir, temp).ok).toBe(true);
    expect(headlessKillable({ ...ok, cmd: ok.cmd.toUpperCase() }, 1999, dir, temp).ok).toBe(true);
    expect(headlessKillable({ ...ok, born: 1998 }, 1999, dir, temp).ok).toBe(false); // born before the launch
    expect(headlessKillable(ok, 0, dir, temp).ok).toBe(false); // no launch stamp recorded
    expect(headlessKillable({ ...ok, cmd: '"chrome.exe" --profile-directory=Default' }, 1999, dir, temp).ok).toBe(false); // the user's Chrome
    expect(headlessKillable(ok, 1999, "C:\\Users\\u\\AppData\\Local\\Google\\Chrome\\User Data", temp).ok).toBe(false); // not under s15
    expect(headlessKillable({ ...ok, name: "node.exe" }, 1999, dir, temp).ok).toBe(false);
    expect(headlessKillable({ ...ok, cmd: ok.cmd.replace("idonly-profile", "idonly-profile2") }, 1999, dir, temp).ok).toBe(false); // another dir
    expect(headlessKillable({ ...ok, cmd: `chrome.exe --type=renderer --user-data-dir="${dir}"` }, 1999, dir, temp).ok).toBe(true); // quoted
    expect(headlessKillable({ ...ok, cmd: `chrome.exe --user-data-dir=${dir}` }, 1999, dir, temp).ok).toBe(true); // last argument
  });
  it("a kill re-checks the recorded creation time (a reused PID is skipped)", () => {
    expect(sameProcess(1000, 1000)).toBe(true);
    expect(sameProcess(1000, 1001)).toBe(false);
    expect(sameProcess(0, 0)).toBe(false);
  });
  it("the PowerShell side mirrors these rules and no s10 kill path walks by ParentProcessId alone", () => {
    const win = src("recipes/s10-win.ps1");
    const runner = src("recipes/s10-r15.ps1");
    const ret1 = src("recipes/s10-ret1.ps1");
    expect(win).toContain("$c.Ppid -eq $p.Pid -and $p.Born -gt 0 -and $c.Born -gt 0 -and $c.Born -ge $p.Born");
    expect(win).toContain(`$S10TreeNames = @(${TREE_KILL_NAMES.map((n) => `'${n}'`).join(", ")})`);
    expect(win).toContain("$d.StartsWith($base)");
    expect(win).toContain("$Row.Born -ge $LaunchBorn");
    const code = (t: string): string => t.split("\n").filter((l) => !l.trimStart().startsWith("#")).join("\n");
    for (const t of [runner, ret1]) expect(code(t)).not.toMatch(/Get-ProcTree/);
    const stopPid = /function Stop-S15Pid[\s\S]*?\n\}/.exec(runner)?.[0] ?? "";
    expect(stopPid).toContain("SKIP $Id reused");
    expect(stopPid).toContain("if ($now -ne $Born)");
    expect(stopPid).toContain("$name -eq 'chrome.exe'");
    expect(stopPid.indexOf("SKIP $Id reused")).toBeLessThan(stopPid.indexOf("Stop-Process"));
    const tree = /function Stop-S15Tree[\s\S]*?\n\}/.exec(runner)?.[0] ?? "";
    expect(tree).toContain("Get-S10Descendants");
    expect(tree).toContain("Test-S10TreeKillable");
    expect(tree).toContain("Get-S10LateChildren $members (Get-S10ProcTable)");
    expect(win).toContain("$c.Born -gt 0 -and $c.Born -ge $m.Born -and $c.Born -lt $upper");
    expect(win).toContain("if ($holder.Count -and $holder[0].Born -eq $m.Born) { continue }");
    expect(win).toContain(`$cmd.Contains("--user-data-dir=$d ")`);
    expect(ret1).toContain("SKIP $bp reused");
    expect(ret1).toContain("SKIP $($x.Pid) reused");
    const hl = /function Stop-S15Headless[\s\S]*?\n\}/.exec(runner)?.[0] ?? "";
    expect(hl).toContain("Test-S10HeadlessKillable");
    expect(hl).not.toContain("Get-S10HeadlessPids");
    // every Stop-S15Pid call passes the creation time recorded when the wave identified the process
    for (const m of runner.matchAll(/Stop-S15Pid \(?[^\r\n]*/g)) if (!m[0].startsWith("Stop-S15Pid([int]")) expect(m[0], m[0]).toMatch(/-Born /);
  });
});

// S7 wave fixer 1 (after Run 15's Return 1, #221): the pin reader took an overflowed action (a narrow window) or a
// not-yet-built toolbar for "unpinned". These fail on the pre-fix code: no pinStep/pinNameMatches, B-window read
// Get-S9PinState once with no wait, and nothing overrode it for the restore's re-read.
describe("the toolbar pin reader (wave fixer 1)", () => {
  it("matches the action by its Name's first line, as a ToolbarActionView or a Button", () => {
    const armed = "Chrome Agent Bridge — armed (click to turn off)";
    expect(pinNameMatches(`${armed}\nHas access to this site`, "Button", "ToolbarActionView")).toBe(true);
    expect(pinNameMatches(`${armed}\r\nHas access to this site`, "ControlType.Button", "")).toBe(true);
    expect(pinNameMatches("Chrome Agent Bridge", "MenuItem", "ToolbarActionView")).toBe(true); // the manifest's default title, any type
    expect(pinNameMatches("Chrome Agent Bridge", "Pane", "")).toBe(false); // neither an action view nor a button
    expect(pinNameMatches("Agent Bridge E2E Playground", "Document", "")).toBe(false); // the fixture page
    expect(pinNameMatches("Other extension\nChrome Agent Bridge", "Button", "ToolbarActionView")).toBe(false); // not the first line
    expect(pinNameMatches("", "Button", "ToolbarActionView")).toBe(false);
  });
  it("waits, widens a narrow window once, and says unpinned only after the bound", () => {
    expect(PIN_WAIT_MS).toBeLessThanOrEqual(5000); // the brief's bound
    expect(pinStep({ found: 0, elapsedMs: 0, widthPx: 1936, widened: false })).toBe("wait"); // the old reader said unpinned here
    expect(pinStep({ found: 1, elapsedMs: 0, widthPx: 516, widened: false })).toBe("pinned");
    expect(pinStep({ found: 0, elapsedMs: PIN_WIDEN_AFTER_MS - 1, widthPx: 516, widened: false })).toBe("wait");
    expect(pinStep({ found: 0, elapsedMs: PIN_WIDEN_AFTER_MS, widthPx: 516, widened: false })).toBe("widen"); // measured: overflowed at 516 px
    expect(pinStep({ found: 0, elapsedMs: PIN_WIDEN_AFTER_MS, widthPx: 516, widened: true })).toBe("wait");
    expect(pinStep({ found: 0, elapsedMs: PIN_WAIT_MS, widthPx: 516, widened: true })).toBe("unpinned"); // still narrow after widening
    expect(pinStep({ found: 0, elapsedMs: PIN_WIDEN_AFTER_MS, widthPx: PIN_NARROW_PX, widened: false })).toBe("wait"); // wide: no widen
    expect(pinStep({ found: 0, elapsedMs: PIN_WAIT_MS, widthPx: 1936, widened: false })).toBe("unpinned"); // the human gate stays
    expect(PIN_WIDEN_TO_PX).toBeGreaterThanOrEqual(PIN_NARROW_PX);
  });
  it("the PowerShell side mirrors it, B-window and the s9 re-reads use it, and it never clicks", () => {
    const win = src("recipes/s10-win.ps1");
    const runner = src("recipes/s10-r15.ps1");
    const s9 = src("recipes/s9-win.ps1");
    const manifest = JSON.parse(src("extension/manifest.json")) as { name: string; action: { default_title: string } };
    expect(PIN_NAME).toBe(manifest.name);
    expect(manifest.action.default_title.startsWith(PIN_NAME)).toBe(true);
    expect(s9).toContain(`$S9Name = '${PIN_NAME}'`);
    expect(win).toContain(`$S10PinWaitMs = ${PIN_WAIT_MS}`);
    expect(win).toContain(`$S10PinWidenAfterMs = ${PIN_WIDEN_AFTER_MS}`);
    expect(win).toContain(`$S10PinNarrowPx = ${PIN_NARROW_PX}`);
    expect(win).toContain(`$S10PinWidenToPx = ${PIN_WIDEN_TO_PX}`);
    expect(win).toContain("$first.StartsWith($S9Name) -and (($_.Current.ClassName -eq 'ToolbarActionView') -or ($_.Current.ControlType -eq [Windows.Automation.ControlType]::Button))");
    expect(win).toContain("$step = if ($n -ge 1) { 'pinned' } elseif ((-not $widened) -and $width -lt $S10PinNarrowPx -and $ms -ge $S10PinWidenAfterMs -and $WaitMs -gt 0) { 'widen' } elseif ($ms -ge $WaitMs) { 'unpinned' } else { 'wait' }");
    expect(win).toMatch(/\nfunction Get-S9PinState\(\[long\]\$Hwnd\) \{ Get-S10PinState \$Hwnd \}/);
    // the override comes after the dot-source of s9-win.ps1, so it wins
    expect(win.indexOf('. "$PSScriptRoot\\s9-win.ps1"')).toBeGreaterThanOrEqual(0);
    expect(win.indexOf('. "$PSScriptRoot\\s9-win.ps1"')).toBeLessThan(win.indexOf("function Get-S9PinState"));
    const reader = /function Get-S10PinState[\s\S]*?\n\}/.exec(win)?.[0] ?? "";
    expect(reader).not.toBe("");
    for (const bad of ["Click-S9Element", "mouse_event", "SetCursorPos", "Invoke()", "Set-S9Pin", "keybd_event"]) expect(reader).not.toContain(bad);
    // verifier N1: the window identity is checked before any MoveWindow, and a mismatch moves nothing
    expect(reader).toContain("if (-not (Test-S9Live $Hwnd))");
    expect(reader.indexOf("if (-not (Test-S9Live $Hwnd))")).toBeLessThan(reader.indexOf("MoveWindow"));
    const bw = runnerBlocks(runner).get("window") ?? "";
    expect(bw).toContain("$global:PinnedBefore = Get-S10PinState $global:W");
    expect(bw).not.toContain("Get-S9PinState");
    // the human gate is unchanged
    expect(bw).toContain("Fail-S15 'HUMAN GATE (pinning): the toolbar button is not pinned and UI Automation cannot pin it; pinning by mouse click is not pre-approved (#192, #202) - the step agent asks the user once'");
  });
});

// Verifier N3 (wave fixer 1): PP1's MCP actor writes failure-report PNGs into a folder of the leg's own.
describe("PP1's actor failures folder (wave fixer 1, N3)", () => {
  it("mcpConfig puts BRIDGE_FAILURES_DIR into the server's env only when asked; the default config is unchanged", () => {
    const plain = mcpConfig("C:\\node\\node.exe", "C:\\repo\\mcp\\dist\\index.js");
    expect(plain).toEqual({ mcpServers: { "chrome-agent-bridge": { command: "C:\\node\\node.exe", args: ["C:\\repo\\mcp\\dist\\index.js"] } } });
    const dir = "C:\\Users\\u\\AppData\\Local\\Temp\\bridge-e2e\\s15\\pp1-failures\\leg";
    const withDir = mcpConfig("C:\\node\\node.exe", "C:\\repo\\mcp\\dist\\index.js", dir);
    expect(withDir.mcpServers["chrome-agent-bridge"].env).toEqual({ BRIDGE_FAILURES_DIR: dir });
    expect(Object.keys(withDir.mcpServers)).toEqual(["chrome-agent-bridge"]);
  });
  it("s9-actor.ts start takes --failures-dir (absolute), and the SDK and the MCP read BRIDGE_FAILURES_DIR", () => {
    const actor = src("recipes/s9-actor.ts");
    expect(actor).toContain('option("--failures-dir", "")');
    expect(actor).toContain("!isAbsolute(failuresDir)");
    expect(src("sdk/src/error.ts")).toContain("env.BRIDGE_FAILURES_DIR");
    expect(src("mcp/src/tools/registry.ts")).toContain("env: process.env,");
    const sheet = src("docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md");
    expect(sheet).toContain("--failures-dir");
    expect(sheet).toContain("pp1-failures");
  });
});

// ── S7 wave fixer 2 (Run 15 Return 2): the harness's evaluate wrapper, the actors' tool loading, SW-1R, the resume ──

describe("evalValue sends the harness's own page code as `return (<expr>);` (wave fixer 2, item 1)", () => {
  // The extension's path for an expression with a top-level `return`: wrapExpression → an async IIFE, awaited.
  const runWrapped = async (code: string): Promise<unknown> => {
    const w = wrapExpression(code);
    expect(w, "this helper only runs the wrapped path").not.toBe(code);
    return await (0, eval)(w);
  };
  const iife = "(() => { const v = 'visible'; return v; })()"; // the shape of SW-1's VISLOG_INSTALL
  it("the bug (Return 2): an IIFE with an inner `return` is wrapped by the extension and comes back undefined", async () => {
    expect(RETURN_RE.test(iife)).toBe(true);
    expect(await runWrapped(iife)).toBeUndefined();
  });
  it("the fix: harnessExpression makes the value the body's return value", async () => {
    expect(harnessExpression(iife)).toBe(`return (${iife});`);
    expect(await runWrapped(harnessExpression(iife))).toBe("visible");
    expect(await runWrapped(harnessExpression("1 + 1"))).toBe(2);
    expect(await runWrapped(harnessExpression("await Promise.resolve(7)"))).toBe(7); // save-build's `await …build()`
  });
  it("s10.ts evalValue uses it, and nothing else in s10.ts does (the measured expressions keep their form)", () => {
    const s10 = src("recipes/s10.ts");
    const body = s10.slice(s10.indexOf("async function evalValue("), s10.indexOf("async function safetyNow("));
    expect(body).toContain("expression: harnessExpression(expression)");
    expect(s10.match(/harnessExpression\(/g)?.length).toBe(1);
    // SW-1's VISLOG install is the IIFE with an inner `return` that met the bug
    const vis = s10.slice(s10.indexOf("const VISLOG_INSTALL ="), s10.indexOf("const VISLOG_READ ="));
    expect(vis).toContain("return document.visibilityState; })()");
    expect(s10).not.toMatch(/const valueExpr =/); // moved to s10-rules.ts, imported
  });
  it("SAVE-PRIM's exception (#217): the bare value is a primitive completion with NO `return`, never wrapped", () => {
    const bare = valueExpr("64m", true);
    expect(bare).toBe('window.__s10v["64m"]');
    expect(RETURN_RE.test(bare)).toBe(false);
    expect(wrapExpression(bare)).toBe(bare);
    expect(valueExpr("64m")).toBe('return window.__s10v["64m"]');
    const s10 = src("recipes/s10.ts");
    expect(s10).toContain('const r = await cmdSaveSdk("SAVE-PRIM", "64m", true);');
    expect(s10).toContain("tab.evaluateToFile(valueExpr(key, bare), { path: p, timeoutMs: 60_000 })");
  });
});

describe("the actors load the bridge tools directly: ENABLE_TOOL_SEARCH=false (wave fixer 2, item 2)", () => {
  it("actorEnv sets it only when asked; the default environment is the parent's, unchanged", () => {
    const base = { PATH: "x", OTHER: "y" };
    expect(actorEnv(base, true)).toEqual({ PATH: "x", OTHER: "y", ENABLE_TOOL_SEARCH: "false" });
    expect(actorEnv(base, false)).toBe(base);
    expect(base).toEqual({ PATH: "x", OTHER: "y" }); // not mutated
  });
  it("s9-actor.ts passes --no-tool-search to its host and the env to claude; Run 15's runner starts every actor with it and checks the start line", () => {
    const actor = src("recipes/s9-actor.ts");
    expect(actor).toContain('if (rest.includes("--no-tool-search")) hostArgs.push("--no-tool-search");');
    expect(actor).toContain("env: actorEnv(process.env, noToolSearch)");
    expect(actor).toContain('" · tool search off (ENABLE_TOOL_SEARCH=false)"');
    const ps1 = src("recipes/s10-r15.ps1");
    expect(ps1).toContain("$out = @(S9Actor start $Name --model sonnet --no-tool-search)");
    expect(ps1).toContain("if (-not ($out -match 'tool search off')) { Fail-S15");
    expect(ps1.match(/S9Actor start /g)?.length).toBe(1);
    const sheet = src("docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md");
    expect(sheet).toContain("node --import tsx recipes/s9-actor.ts start pp1 --failures-dir $pf --no-tool-search");
  });
});

describe("SW-1R: SW-1 re-measured under a new row ID (wave fixer 2, item 3)", () => {
  const plan = (): string[] => src("docs/e2e-test-plan.md").split(/\r?\n/);
  it("§4.22: the dated amendment, and SW-1R = SW-1's row with only the row ID, the block and the --row changed", () => {
    const l = plan();
    const sw1 = l.find((x) => x.startsWith("| SW-1 ★ |")) ?? "";
    const sw1r = l.find((x) => x.startsWith("| SW-1R ★ |")) ?? "";
    expect(sw1).not.toBe("");
    const want = sw1.replace("| SW-1 ★ |", "| SW-1R ★ |").split("`ROW SW-1 ").join("`ROW SW-1R ").replace("`-Block sw1`", "`-Block sw1r`").replace("`s10.ts sw1`", "`s10.ts sw1 --row SW-1R`");
    expect(sw1r).toBe(want);
    expect(sw1r).toContain("d ≥ 950 ms in 3/3"); // 0.8's thresholds, unchanged
    expect(sw1r).toContain("d ≤ 300 ms in 3/3");
    expect(l.indexOf(sw1r)).toBe(l.indexOf(sw1) + 1);
    expect(l).toContain("*Added 2026-10-25 (S7 Return 2, before any observation): SW-1 stopped in set-up on a helper bug (`evalValue`), before its first trial; it is recorded NOT MEASURED and re-measured as SW-1R.*");
  });
  it("the runner: sw1r right after sw1, a row block, accepted by -Block, running s10.ts sw1 --row SW-1R; s10.ts takes only SW-1 / SW-1R", () => {
    const ps1 = src("recipes/s10-r15.ps1");
    const { order, rowBlocks } = runnerLists(ps1);
    expect(order.indexOf("sw1r")).toBe(order.indexOf("sw1") + 1);
    expect(rowBlocks.indexOf("sw1r")).toBe(rowBlocks.indexOf("sw1") + 1);
    expect(ps1).toMatch(/\[ValidateSet\([^)]*'sw1', 'sw1r', 'pop2'/);
    const body = runnerBlocks(ps1).get("sw1r") ?? "";
    expect(runnerCalls(body).map((c) => c.text)).toEqual(["sw1 --row SW-1R"]);
    expect(body.replace(/SW-1R/g, "SW-1").replace("S10 sw1 --row SW-1", "S10 sw1")).toBe(runnerBlocks(ps1).get("sw1"));
    expect(SW_ROWS).toEqual(["SW-1", "SW-1R"]);
    expect(src("recipes/s10.ts")).toContain('const id = option("--row") ?? "SW-1";');
  });
});

describe("the resume after Return 2 (wave fixer 2, item 4)", () => {
  const CALL = "-Block reset -Attempt 2 -Skip bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,cap,sw1";
  it("the skip set = the row blocks up to sw1 (done or stopped in attempt 1), never sw1r; the sheet and the runner brief carry the same call", () => {
    const { order, rowBlocks } = runnerLists(src("recipes/s10-r15.ps1"));
    const upToSw1 = order.slice(0, order.indexOf("sw1") + 1).filter((b) => rowBlocks.includes(b));
    expect(CALL.split("-Skip ")[1].split(",")).toEqual(upToSw1);
    expect(upToSw1).not.toContain("sw1r");
    expect(src("docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md")).toContain(CALL);
    expect(src("docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-runner.md")).toContain(CALL);
  });
});

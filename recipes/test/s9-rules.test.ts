// Tests for recipes/s9-rules.ts — the pass rules and expected texts of Step 9's live rows (docs/e2e-test-plan.md
// §4.20), dry-run on known-good and known-bad inputs before the wave, and a drift test: every expected text is
// compared with the committed product constant it was copied from, so a wording change fails here first.
import { describe, expect, it } from "vitest";
import { safetyRefusalLine } from "@bridge/sdk/report";
import {
  DISARMED_ALL_MESSAGE,
  DISARMED_EVALUATE_MESSAGE,
  BLOCKED_TAB_MESSAGE,
  OWN_PAGE_MESSAGE,
  BLOCKED_URL_MESSAGE,
  EXTENSION_URL_MESSAGE,
} from "../../extension/src/safety.js";
import { CAPTURE_MOVED_MESSAGE } from "../../extension/src/tabs.js";
import { BADGE_TITLES, toggleLogLine } from "../../extension/src/badge.js";
import { analyzeBlockList, optionsStatus } from "../../extension/src/options-model.js";
import { safetyStatusLine } from "../../mcp/src/tools/registry.js";
import { safetyLogLine } from "../../daemon/src/intercept.js";
import { describeDebuggerError } from "../../extension/src/debugger-errors.js";
import {
  actorArgs,
  bannerLifetime,
  bannerLine,
  checkLine,
  CLASS_LINE_RE,
  classStepVerdict,
  concurrentVerdict,
  followUpVerdict,
  logHits,
  overlapArea,
  placementLine,
  placementVerdict,
  R14,
  R14_WRAPPER_SCHEMES,
  r14Url,
  rerunDelayMs,
  scrubAll,
  serverLogLine,
  serverLogVerdict,
  sideBySide,
  stopLine,
  urlClass,
  urlClassLine,
  consoleHits,
  consoleVerdict,
  consoleVerdictS16,
  r14TypeVerdict,
  safetyTupleLine,
  daemonSafetyLogLine,
  deltaMs,
  EMPTY_SHA256,
  EXPECT,
  extensionIdFromPath,
  isFixtureUrl,
  judge,
  lockVerdict,
  logLinesSince,
  mcpConfig,
  median,
  ownOptionsUrl,
  parseExpect,
  rowLine,
  s9Url,
  safetyDelivery,
  safetyLine,
  scanCounts,
  scanVerdict,
  scrubMessage,
  showUrl,
  snapshotFacts,
  summarizeNetwork,
  summarizeStatus,
  summarizeTabs,
  tabsLine,
  toolResultItems,
  typeVerdict,
  visibleSince,
  waitDisarmVerdict,
  type Outcome,
} from "../s9-rules.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ID = "cpnemjbgecfbeicldpaaegbhjgjgjfep";

describe("drift: expected texts equal the committed product constants", () => {
  it("refusal messages (extension/src/safety.ts, tabs.ts)", () => {
    expect(EXPECT.disarmedAll).toBe(DISARMED_ALL_MESSAGE);
    expect(EXPECT.disarmedEvaluate).toBe(DISARMED_EVALUATE_MESSAGE);
    expect(EXPECT.blockedTab).toBe(BLOCKED_TAB_MESSAGE);
    expect(EXPECT.ownPage).toBe(OWN_PAGE_MESSAGE);
    expect(EXPECT.blockedUrl).toBe(BLOCKED_URL_MESSAGE);
    expect(EXPECT.extensionUrl).toBe(EXTENSION_URL_MESSAGE);
    expect(EXPECT.captureMoved).toBe(CAPTURE_MOVED_MESSAGE);
  });

  it("the MCP lines (sdk safetyRefusalLine)", () => {
    expect(EXPECT.mcpDisarmedAll).toBe(safetyRefusalLine("DISARMED", { scope: "all" }));
    expect(EXPECT.mcpDisarmedEvaluate).toBe(safetyRefusalLine("DISARMED", { scope: "evaluate" }));
    expect(EXPECT.mcpDomainBlocked).toBe(safetyRefusalLine("DOMAIN_BLOCKED", undefined));
  });

  it("badge titles and the press log lines (extension/src/badge.ts)", () => {
    expect(EXPECT.titleOff).toBe(BADGE_TITLES.off);
    expect(EXPECT.titleJsOff).toBe(BADGE_TITLES.jsOff);
    expect(EXPECT.titleArmed).toBe(BADGE_TITLES.armed);
    expect(EXPECT.logDisarmed).toBe(toggleLogLine("disarmed"));
    expect(EXPECT.logArmed).toBe(toggleLogLine("armed"));
    expect(EXPECT.logIgnored).toBe(toggleLogLine("ignored"));
  });

  it("options page lines (extension/src/options-model.ts)", () => {
    expect(EXPECT.optArmed).toBe(optionsStatus({ armed: true, evaluate: true, blockList: "" }));
    expect(EXPECT.optJsOff).toBe(optionsStatus({ armed: true, evaluate: false, blockList: "" }));
    expect(EXPECT.optOff).toBe(optionsStatus({ armed: false, evaluate: true, blockList: "" }));
    expect(EXPECT.optSummaryZero).toBe(analyzeBlockList("").summary);
    expect(EXPECT.optSummaryOne).toBe(analyzeBlockList("localhost:8081").summary);
    expect(EXPECT.optSummaryOne).toBe(analyzeBlockList("bank.example").summary);
    const a = analyzeBlockList("bank.example\nnot a host!");
    expect(EXPECT.optSummaryOneInvalid).toBe(a.summary);
    // the <li> text options.ts builds: `Line ${line}: “${text.trim()}” — ${reason}`
    const li = a.invalid.map((l) => `Line ${l.line}: “${l.text.trim()}” — ${l.reason}`);
    expect(li).toEqual([EXPECT.optInvalidLine2]);
  });

  it("the Safety line and the daemon's log line", () => {
    for (const armed of [true, false])
      for (const evaluate of [true, false])
        for (const blockedCount of [0, 1, 2]) {
          const s = { armed, evaluate, blockedCount };
          expect(safetyLine(s)).toBe(safetyStatusLine(s));
          expect(daemonSafetyLogLine(s)).toBe(safetyLogLine(s));
        }
    expect(safetyLine(null)).toBe(safetyStatusLine(null));
    expect(safetyLine({ armed: false, evaluate: false, blockedCount: 1 })).toBe("Safety: DISARMED by the user · JavaScript off · 1 blocked site");
    expect(safetyLine({ armed: true, evaluate: true, blockedCount: 0 })).toBe("Safety: armed · JavaScript on · 0 blocked sites");
  });

  it("recipes/s9-win.ps1 carries the same three titles, in a UTF-8 BOM file (PS 5.1 reads it as UTF-8)", () => {
    const raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "s9-win.ps1"));
    expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const ps = raw.toString("utf8");
    expect(ps).toContain(`$S9TitleOff = '${EXPECT.titleOff}'`);
    expect(ps).toContain(`$S9TitleArmed = '${EXPECT.titleArmed}'`);
    expect(ps).toContain(`$S9TitleJsOff = '${EXPECT.titleJsOff}'`);
    expect(ps).toContain("$S9Id = 'cpnemjbgecfbeicldpaaegbhjgjgjfep'");
  });

  it("EMPTY_SHA256 is the sha256 of the empty string", () => {
    expect(createHash("sha256").update("", "utf8").digest("hex")).toBe(EMPTY_SHA256);
  });
});

describe("fixtures and ids", () => {
  it("extensionIdFromPath reproduces the id the reload script derives on this machine (§1 item 9)", () => {
    expect(extensionIdFromPath("C:\\Users\\aliev\\Projects\\chrome-remote-extention\\extension")).toBe(ID);
    expect(extensionIdFromPath("C:\\other")).toMatch(/^[a-p]{32}$/);
    expect(ownOptionsUrl(ID)).toBe(`chrome-extension://${ID}/options.html`);
  });

  it("s9Url and isFixtureUrl", () => {
    expect(s9Url("http://localhost:8081", "c")).toBe("http://localhost:8081/e2e-playground.html?s9=c");
    expect(isFixtureUrl("http://localhost:8083/dl/hello.txt")).toBe(true);
    expect(isFixtureUrl("http://localhost:8080")).toBe(true);
    expect(isFixtureUrl("http://localhost:80801/x")).toBe(false);
    expect(isFixtureUrl("https://bank.example/")).toBe(false);
    expect(isFixtureUrl(undefined)).toBe(false);
  });

  it("showUrl withholds everything but fixture, chrome://extensions and own pages", () => {
    expect(showUrl("http://localhost:8080/e2e-playground.html?s9=a")).toBe("http://localhost:8080/e2e-playground.html?s9=a");
    expect(showUrl("chrome://extensions/shortcuts")).toBe("chrome://extensions/shortcuts");
    expect(showUrl(`chrome-extension://${ID}/options.html`, ID)).toBe(`chrome-extension://${ID}/options.html`);
    expect(showUrl(`chrome-extension://${ID}/options.html`)).toBe("<non-fixture url withheld>");
    expect(showUrl("chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/x.html", ID)).toBe("<non-fixture url withheld>");
    expect(showUrl("https://mail.example.com/inbox")).toBe("<non-fixture url withheld>");
    expect(showUrl("")).toBe('""');
  });

  it("scrubMessage replaces only withheld URLs inside a message", () => {
    const m = 'Could not inject (Cannot access contents of url "https://secret.example/x?tok=1". Extension manifest …) on http://localhost:8080/a';
    const s = scrubMessage(m);
    expect(s).not.toContain("secret.example");
    expect(s).toContain("<non-fixture url withheld>");
    expect(s).toContain("http://localhost:8080/a");
    expect(scrubMessage(EXPECT.blockedTab)).toBe(EXPECT.blockedTab);
  });
});

const ok = (ms = 5): Outcome => ({ ok: true, ms });
const err = (code: string, message: string, data?: unknown): Outcome => ({ ok: false, code, message, data, ms: 7 });

describe("judge", () => {
  it("parses only known expectations", () => {
    expect(parseExpect("DISARMED:all")).toBe("DISARMED:all");
    expect(parseExpect("code:RESTRICTED_URL")).toBe("code:RESTRICTED_URL");
    expect(() => parseExpect("DISARMED")).toThrow();
    expect(() => parseExpect("code:lower")).toThrow();
  });

  it("DISARMED:all needs the code, the exact message and data {scope:all}", () => {
    expect(judge(err("DISARMED", EXPECT.disarmedAll, { scope: "all" }), "DISARMED:all").pass).toBe(true);
    expect(judge(err("DISARMED", EXPECT.disarmedAll, { scope: "evaluate" }), "DISARMED:all").pass).toBe(false);
    expect(judge(err("DISARMED", EXPECT.disarmedEvaluate, { scope: "all" }), "DISARMED:all").pass).toBe(false);
    expect(judge(err("DISARMED", EXPECT.disarmedAll), "DISARMED:all").pass).toBe(false);
    expect(judge(err("DEBUGGER_CANCELLED", "x"), "DISARMED:all").pass).toBe(false);
    expect(judge(ok(), "DISARMED:all").pass).toBe(false);
  });

  it("DISARMED:evaluate", () => {
    expect(judge(err("DISARMED", EXPECT.disarmedEvaluate, { scope: "evaluate" }), "DISARMED:evaluate").pass).toBe(true);
    expect(judge(err("DISARMED", EXPECT.disarmedAll, { scope: "all" }), "DISARMED:evaluate").pass).toBe(false);
  });

  it("DOMAIN_BLOCKED forms: the exact message and no data", () => {
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.blockedTab), "BLOCKED:tab").pass).toBe(true);
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.blockedTab, { host: "x" }), "BLOCKED:tab").pass).toBe(false);
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.blockedUrl), "BLOCKED:tab").pass).toBe(false);
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.blockedUrl), "BLOCKED:tab|url").pass).toBe(true);
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.blockedTab), "BLOCKED:tab|url").pass).toBe(true);
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.ownPage), "BLOCKED:own").pass).toBe(true);
    expect(judge(err("DOMAIN_BLOCKED", EXPECT.extensionUrl), "BLOCKED:ext").pass).toBe(true);
    expect(judge(err("DISARMED", EXPECT.extensionUrl), "BLOCKED:ext").pass).toBe(false);
  });

  it("ok, record and code:", () => {
    expect(judge(ok(), "ok").pass).toBe(true);
    expect(judge(err("X", "y"), "ok").pass).toBe(false);
    expect(judge(err("X", "y"), "record").pass).toBe(true);
    expect(judge(ok(), "record").pass).toBe(true);
    expect(judge(err("RESTRICTED_URL", "y"), "code:RESTRICTED_URL").pass).toBe(true);
    expect(judge(err("INTERNAL", "y"), "code:RESTRICTED_URL").pass).toBe(false);
    expect(judge(ok(), "code:RESTRICTED_URL").pass).toBe(false);
  });

  it("rowLine and checkLine print the message verbatim, data as JSON, URLs scrubbed", () => {
    expect(rowLine("SAFE-1", "snap", err("DISARMED", EXPECT.disarmedAll, { scope: "all" }))).toBe(
      `ROW SAFE-1 snap DISARMED ${EXPECT.disarmedAll} data {"scope":"all"} (7 ms)`,
    );
    expect(rowLine("SAFE-5", "nav", err("NAV_FAILED", "failed at https://x.example/a"))).toBe(
      "ROW SAFE-5 nav NAV_FAILED failed at <non-fixture url withheld> (7 ms)",
    );
    expect(rowLine("SAFE-6", "click", ok(12), "", 'counter "Click counter: 1"')).toBe('ROW SAFE-6 click ok counter "Click counter: 1" (12 ms)');
    expect(checkLine("SAFE-1", "snap", { pass: false, why: "w" })).toBe("CHECK SAFE-1 snap FAIL — w");
  });
});

describe("counts", () => {
  it("summarizeTabs counts hidden rows, titles, urls and 8081 urls", () => {
    const s = summarizeTabs([
      { tab: "T1", title: "a", url: "https://x.example/" },
      { tab: "T2", hidden: "disarmed" },
      { tab: "T3", hidden: "blocked" },
      { tab: "T4", title: "", url: "http://localhost:8081/e2e-playground.html?s9=c" },
    ]);
    expect(s).toEqual({ total: 4, hiddenDisarmed: 1, hiddenBlocked: 1, withTitle: 1, withUrl: 2, url8081: 1 });
    expect(tabsLine(s)).toBe("tabs total=4 hidden(disarmed)=1 hidden(blocked)=1 withTitle=1 withUrl=2 url8081=1");
  });

  it("summarizeStatus reads safety and the rows' urls", () => {
    const st = summarizeStatus({
      extensionConnected: true,
      safety: { armed: false, evaluate: true, blockedCount: 0 },
      tabs: [{ tab: "T1", tabId: 1 }, { tab: "T2", tabId: 2, url: "http://localhost:8081/x" }],
    });
    expect(st).toEqual({ safety: { armed: false, evaluate: true, blockedCount: 0 }, extensionConnected: true, rows: 2, rowsWithUrl: 1, rowsWith8081: 1 });
    expect(summarizeStatus({ safety: null }).safety).toBeNull();
    expect(summarizeStatus({ safety: { armed: "no" } }).safety).toBeNull();
    expect(summarizeStatus(undefined).rows).toBe(0);
  });

  it("summarizeNetwork counts 8081 in url, redirectUrl or initiator, and tab -1", () => {
    const n = summarizeNetwork({
      total: 9,
      entries: [
        { url: "http://localhost:8080/a", tabId: 3 },
        { url: "http://localhost:8083/a", redirectUrl: "http://localhost:8081/a", tabId: 3 },
        { url: "http://localhost:8080/b", initiator: "http://localhost:8081", tabId: -1 },
        { url: "http://localhost:8081/c", tabId: 4 },
      ],
    });
    expect(n).toEqual({ total: 9, returned: 4, any8081: 3, tabMinusOne: 1 });
  });

  it("snapshotFacts reads only the counter button", () => {
    expect(snapshotFacts({ elements: [{ role: "link", name: "Private" }, { role: "button", name: "Click counter: 3" }] })).toEqual({
      elements: 2,
      counter: "Click counter: 3",
    });
    expect(snapshotFacts({}).counter).toBeNull();
  });
});

describe("timed verdicts", () => {
  const disarmed = err("DISARMED", EXPECT.disarmedAll, { scope: "all" });

  it("median and deltaMs", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(Number.isNaN(median([]))).toBe(true);
    expect(deltaMs("2026-10-24T10:00:00.000Z", "2026-10-24T10:00:00.250Z")).toBe(250);
  });

  it("waitDisarmVerdict: DISARMED within 300 ms of the press", () => {
    expect(waitDisarmVerdict(disarmed, "2026-10-24T10:00:02.150Z", "2026-10-24T10:00:02.000Z").pass).toBe(true);
    const slow = waitDisarmVerdict(disarmed, "2026-10-24T10:00:02.400Z", "2026-10-24T10:00:02.000Z");
    expect(slow.pass).toBe(false);
    expect(slow.notDiscriminating).toBe(false);
    const early = waitDisarmVerdict(err("TIMEOUT", "t"), "2026-10-24T10:00:01.000Z", "2026-10-24T10:00:02.000Z");
    expect(early.notDiscriminating).toBe(true);
    expect(waitDisarmVerdict(disarmed, "2026-10-24T10:00:02.100Z", null).notDiscriminating).toBe(true);
    expect(waitDisarmVerdict(err("TIMEOUT", "t"), "2026-10-24T10:00:02.100Z", "2026-10-24T10:00:02.000Z").pass).toBe(false);
  });

  it("typeVerdict: DISARMED mid-way only", () => {
    expect(typeVerdict(disarmed, 412, 1000).pass).toBe(true);
    expect(typeVerdict(err("DEBUGGER_CANCELLED", "x"), 412, 1000)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(typeVerdict(ok(), 1000, 1000).notDiscriminating).toBe(true);
    expect(typeVerdict(disarmed, 0, 1000).notDiscriminating).toBe(true);
    expect(typeVerdict(disarmed, null, 1000).notDiscriminating).toBe(true);
  });

  it("lockVerdict: B refused, its tab never shown, press before B's reply", () => {
    const t = "2026-10-24T10:00:01.000Z";
    const reply = "2026-10-24T10:00:02.000Z";
    expect(lockVerdict(disarmed, reply, t, false).pass).toBe(true);
    expect(lockVerdict(disarmed, reply, t, true).pass).toBe(false);
    expect(lockVerdict(ok(), reply, t, false).pass).toBe(false);
    expect(lockVerdict(disarmed, reply, t, null).pass).toBe(false);
    expect(lockVerdict(disarmed, t, reply, false).notDiscriminating).toBe(true);
  });

  it("visibleSince reads a visibility log", () => {
    const log = [["hidden", 1000, "start"], ["visible", 2000, "change"]];
    expect(visibleSince(log, 1500)).toBe(true);
    expect(visibleSince(log, 2500)).toBe(false);
    expect(visibleSince("x", 0)).toBeNull();
  });
});

describe("log and evidence scans", () => {
  const token = "0123456789abcdef0123456789abcdef";

  it("scanCounts classifies :// and counts the token and the test patterns, printing neither", () => {
    const text = [
      "2026-10-24T10:00:00Z safety state: armed=false evaluate=true blocked=1",
      "fixture http://localhost:8080/e2e-playground.html?s9=a and chrome://extensions/shortcuts",
      `own chrome-extension://${ID}/options.html and other https://mail.example.com/x`,
      `token ${token} and localhost:8081 and localhost:8083 and bank.example, pid 18083`,
    ].join("\n");
    const c = scanCounts(text, token, ID);
    expect(c).toEqual({ scheme: 4, schemeFixture: 3, schemeOther: 1, token: 1, pattern8081: 1, colon8083: 1, raw8083: 2, bank: 1 });
    expect(scanCounts("x", "").token).toBe(0);
  });

  it("consoleHits and consoleVerdict: only the bridge's own lines may not carry a URL or pattern", () => {
    const text = [
      "safety: disarmed by the user",
      "[bridge] connection: up",
      "GET http://localhost:8081/dl/hello.txt?s9=5c2 net::ERR_ABORTED",
      "[bridge] download held 69 bytes",
    ].join("\n");
    const h = consoleHits(text);
    expect(h.hitLines).toEqual(["GET http://localhost:8081/dl/hello.txt?s9=5c2 net::ERR_ABORTED"]);
    expect(h.bridgeHitLines).toEqual([]);
    expect(h.pressLines).toEqual(["safety: disarmed by the user"]);
    expect(consoleVerdict(scanCounts(text, token), h).pass).toBe(true);
    const bad = "[bridge] fetch http://localhost:8081/x failed";
    expect(consoleVerdict(scanCounts(bad, token), consoleHits(bad)).pass).toBe(false);
    const other = "Failed to load https://real.example/";
    expect(consoleVerdict(scanCounts(other, token), consoleHits(other)).pass).toBe(false);
    expect(consoleVerdict(scanCounts(`x ${token}`, token), consoleHits("x")).pass).toBe(false);
  });

  it("consoleHits: a bridge line is recognised anywhere in the row (a DevTools prefix or source link first)", () => {
    const text = [
      "2 [bridge] fetch http://localhost:8081/x failed sw.js:12",
      "sw.js:183 safety: disarmed by the user",
      "10:00:00.123 [bridge] evaluate bank.example",
      "unsafety: http://localhost:8080/ fixture line, not the bridge's",
    ].join("\n");
    const h = consoleHits(text);
    expect(h.bridgeHitLines).toHaveLength(2);
    expect(h.pressLines).toEqual(["sw.js:183 safety: disarmed by the user"]);
    expect(consoleVerdict(scanCounts(text, token), h).pass).toBe(false);
  });

  it("consoleVerdict: an empty capture, or one without the disarm press line, is NOT MEASURED, never a pass", () => {
    for (const text of ["", "[bridge] connection: up\nsafety: armed by the user"]) {
      const v = consoleVerdict(scanCounts(text, token), consoleHits(text));
      expect(v.pass).toBe(false);
      expect(v.notMeasured).toBe(true);
    }
    const leak = "safety: disarmed by the user\n[bridge] evaluate http://localhost:8081/";
    const v = consoleVerdict(scanCounts(leak, token), consoleHits(leak));
    expect(v.pass).toBe(false);
    expect(v.notMeasured).toBeUndefined();
  });

  it("consoleVerdictS16 (prep fixer r1, F2): S1.6 as written - every count 0, whoever wrote the line", () => {
    const control = "safety: disarmed by the user";
    const chromeLine = `${control}\nGET http://localhost:8081/dl/hello.txt?s14=5c1 net::ERR_ABORTED`;
    // Run 13's console rule passes a Chrome-owned hit; S1.6's does not
    expect(consoleVerdict(scanCounts(chromeLine, token), consoleHits(chromeLine)).pass).toBe(true);
    const v = consoleVerdictS16(scanCounts(chromeLine, token), consoleHits(chromeLine));
    expect(v.pass).toBe(false);
    expect(v.notMeasured).toBeUndefined();
    expect(v.why).toContain("localhost:8081 1");
    for (const bad of [`${control}\nx :8083/`, `${control}\nbank.example`, `${control}\nhttps://real.example/`, `${control}\n${token}`]) {
      expect(consoleVerdictS16(scanCounts(bad, token), consoleHits(bad)).pass).toBe(false);
    }
    // a fixture URL on 8080 is not a count S1.6 names
    const fixture = `${control}\nGET http://localhost:8080/e2e-playground.html?s14=r3`;
    expect(consoleVerdictS16(scanCounts(fixture, token), consoleHits(fixture))).toMatchObject({ pass: true });
    // no positive control: NOT MEASURED, never a pass; a failure still wins
    const none = consoleVerdictS16(scanCounts("[bridge] connection: up", token), consoleHits("[bridge] connection: up"));
    expect(none).toMatchObject({ pass: false, notMeasured: true });
    expect(consoleVerdictS16(scanCounts("x localhost:8081", token), consoleHits("x localhost:8081")).notMeasured).toBeUndefined();
  });

  it("scanVerdict: daemon needs all zero; committed needs no token and no other ://", () => {
    const zero = scanCounts("2026-10-24T10:00:00Z safety state: armed=true evaluate=true blocked=0", token);
    expect(scanVerdict(zero, "daemon").pass).toBe(true);
    const fixture = scanCounts("http://localhost:8081/x localhost:8081", token);
    expect(scanVerdict(fixture, "daemon").pass).toBe(false);
    expect(scanVerdict(fixture, "committed").pass).toBe(true);
    expect(scanVerdict(scanCounts("https://real.example/", token), "committed").pass).toBe(false);
    expect(scanVerdict(scanCounts(`t ${token}`, token), "committed").pass).toBe(false);
  });

  it("logLinesSince keeps lines at or after the mark's whole second", () => {
    const lines = ["2026-10-24T10:00:00Z a", "2026-10-24T10:00:01Z b", "no stamp", "2026-10-24T10:00:02Z c"];
    expect(logLinesSince(lines, "2026-10-24T10:00:01.700Z")).toEqual(["2026-10-24T10:00:01Z b", "2026-10-24T10:00:02Z c"]);
  });
});

// ── Run 14 (Step 10 S1; docs/e2e-test-plan.md §4.21), written 2026-10-25 before any R14 row ran ─────────────

describe("R14: drift against the product and the fixture", () => {
  it("R14-5c expects SAFE-5c's own redirect-half text (BLOCKED_URL_MESSAGE)", () => {
    expect(EXPECT.blockedUrl).toBe(BLOCKED_URL_MESSAGE);
    expect(judge(err("DOMAIN_BLOCKED", BLOCKED_URL_MESSAGE), "BLOCKED:url").pass).toBe(true);
  });

  it("R14-POP-1's popup URL is the fixture's own `Open popup` link, on 8080", () => {
    const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "test-fixtures", "e2e-playground.html"), "utf8");
    expect(html).toContain('<a id="open-popup" href="e2e-playground.html?popup=1" target="_blank">Open popup</a>');
    expect(R14.popupUrl).toBe("http://localhost:8080/e2e-playground.html?popup=1");
  });

  it("R14-4b's 'another debugger' code is what the extension maps Chrome's string to", () => {
    expect(describeDebuggerError(new Error("Another debugger is already attached to the tab with id: 12.")).code).toBe(R14.anotherDebuggerCode);
    expect(describeDebuggerError(new Error("Detached while handling command.")).code).toBe("DEBUGGER_CANCELLED");
  });

  it("R14-REL-3's wrapper schemes are the extension's (safety-match.ts WRAPPER_SCHEMES)", () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "extension", "src", "safety-match.ts"), "utf8");
    expect(src).toContain('const WRAPPER_SCHEMES = new Set(["blob:", "filesystem:", "view-source:"]);');
    expect([...R14_WRAPPER_SCHEMES]).toEqual(["blob", "filesystem", "view-source"]);
  });

  it("recipes/s9-r14.ps1 is ASCII (PS 5.1 reads a BOM-less file as ANSI) and waits for the options text the product renders", () => {
    const raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "s9-r14.ps1"));
    expect([...raw].every((b) => b < 0x80)).toBe(true);
    const ps = raw.toString("utf8");
    expect(ps).toContain(`Wait-S9OptionsStatus $global:O '${EXPECT.optArmed}' 2000`);
    expect(ps).toContain(`S9 call R14-5c redirect download-file 'http://localhost:8083/dl/hello.txt?s14=5c2'`);
    expect(ps).toContain(`S9 call R14-REL-3 rel navigate-class r3 'view-source:/options.html' --expect record`);
    expect(ps).toContain("$global:S9PinUiaOnly = $true");
  });

  it("prep fixer r1 (F1): the stop procedure ends the background r14-type BEFORE Restore-S9All, by its identified PID", () => {
    const ps = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "s9-r14.ps1"), "utf8");
    expect(ps).toContain("$global:S14Pids['r14type'] = $p.Id");
    const start = ps.indexOf("function Invoke-S14Stop");
    const stop = ps.slice(start, ps.indexOf("\n}", start));
    expect(stop.indexOf("Stop-S14Background")).toBeGreaterThan(0);
    expect(stop.indexOf("Stop-S14Background")).toBeLessThan(stop.indexOf("Restore-S9All"));
  });

  it("prep fixer r1 (F3): block safe0 compares SAFE-0's tuple with the expected default before any reload", () => {
    const ps = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "s9-r14.ps1"), "utf8");
    const want = safetyTupleLine({ armed: true, evaluate: true, blockedCount: 0 });
    expect(ps).toContain(`$S14Default = '${want}'`);
    const b = ps.slice(ps.indexOf("function B-safe0"), ps.indexOf("function B-found"));
    expect(b.indexOf("found-state guard")).toBeGreaterThan(0);
    expect(b.indexOf("found-state guard")).toBeLessThan(b.indexOf("reload-extension.ps1"));
  });

  it("prep fixer r1 (N2): Set-S9BlockList -FromFile never prints a non-empty list's sha256", () => {
    const ps = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "s9-win.ps1"), "utf8");
    const f = ps.slice(ps.indexOf("function Set-S9BlockList"), ps.indexOf("function Invoke-S9OptionsButton"));
    expect(f).toContain("withheld(non-empty)");
    expect(f).not.toContain("sha256 $(Get-S9Sha256 $text)");
  });

  it("recipes/s9-redirect.py serves with a ThreadingHTTPServer (decisions.md #194, #197)", () => {
    const py = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "s9-redirect.py"), "utf8");
    expect(py).toContain("class Server(ThreadingHTTPServer):");
    expect(py).toContain("server = Server((\"127.0.0.1\", port), Redirect)");
    expect(py).not.toMatch(/\bHTTPServer\(\(/);
  });

  it("r14Url builds the wave's own markers", () => {
    expect(r14Url("http://localhost:8083", "5c2", "dl/hello.txt")).toBe("http://localhost:8083/dl/hello.txt?s14=5c2");
    expect(r14Url("http://localhost:8080", "r3")).toBe("http://localhost:8080/e2e-playground.html?s14=r3");
  });
});

describe("R14-REL-3: the URL class, never the URL", () => {
  it("classes wrapper, inner scheme and own page", () => {
    expect(urlClass(`view-source:chrome-extension://${ID}/options.html`, ID)).toEqual({ wrapper: "view-source", inner: "chrome-extension", own: true });
    expect(urlClass("view-source:chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/options.html", ID)).toEqual({ wrapper: "view-source", inner: "chrome-extension", own: false });
    expect(urlClass("view-source:file:///options.html", ID)).toEqual({ wrapper: "view-source", inner: "file", own: false });
    expect(urlClass("VIEW-SOURCE:HTTP://localhost:8080/x", ID)).toEqual({ wrapper: "view-source", inner: "http", own: false });
    expect(urlClass("view-source:/options.html", ID)).toEqual({ wrapper: "view-source", inner: "none", own: false });
    expect(urlClass(`chrome-extension://${ID}/options.html`, ID)).toEqual({ wrapper: "none", inner: "chrome-extension", own: true });
    expect(urlClass("about:blank", ID)).toEqual({ wrapper: "none", inner: "about", own: false });
    expect(urlClass("blob:https://x.example/1", ID)).toEqual({ wrapper: "blob", inner: "https", own: false });
    expect(urlClass("", ID)).toEqual({ wrapper: "none", inner: "none", own: false });
    expect(urlClass(`chrome-extension://${ID}/options.html`, "")).toEqual({ wrapper: "none", inner: "chrome-extension", own: false });
  });

  it("the class line has the agreed form and carries no URL", () => {
    const line = urlClassLine({ wrapper: "view-source", inner: "chrome-extension", own: true });
    expect(line).toBe("wrapper=view-source inner=chrome-extension own=yes");
    expect(CLASS_LINE_RE.test(line)).toBe(true);
    expect(CLASS_LINE_RE.test(urlClassLine(urlClass("view-source:file:///etc/x", ID)))).toBe(true);
    expect(CLASS_LINE_RE.test("wrapper=view-source inner=file own=maybe")).toBe(false);
    expect(urlClassLine(urlClass("view-source:https://secret.example/a?tok=1", ID))).not.toMatch(/secret|tok|:\/\//);
  });

  it("scrubAll withholds every URL form, own pages and wrappers included", () => {
    const m = `Cannot navigate to view-source:/options.html or view-source:chrome-extension://${ID}/options.html or about:blank or data:text/html,x or https://a.example/b`;
    const s = scrubAll(m);
    expect(s).not.toMatch(/options\.html|about:blank|data:text|a\.example|:\/\//);
    expect(s).toContain("<url withheld>");
    expect(scrubAll(EXPECT.extensionUrl)).toBe(EXPECT.extensionUrl);
    expect(scrubAll('DISARMED data {"scope":"all"} timed out: retry')).toBe('DISARMED data {"scope":"all"} timed out: retry');
  });

  it("classStepVerdict: exactly one class line in the agreed form, no URL in any printed line", () => {
    const ok1 = ["ROW R14-REL-3 rel ok (73 ms)", "ROW R14-REL-3 rel-class T5 wrapper=view-source inner=file own=no"];
    expect(classStepVerdict(ok1).pass).toBe(true);
    expect(classStepVerdict(["ROW R14-REL-3 rel ok (3 ms)", "ROW R14-REL-3 rel-class T5 hidden=blocked (no url to class)"]).pass).toBe(true);
    expect(classStepVerdict(["ROW R14-REL-3 rel ok (3 ms)"]).pass).toBe(false);
    expect(classStepVerdict([...ok1, "ROW R14-REL-3 rel-class T5 wrapper=none inner=http own=no"]).pass).toBe(false);
    expect(classStepVerdict([...ok1, "url http://localhost:8080/e2e-playground.html"]).pass).toBe(false);
    expect(classStepVerdict([...ok1, "now view-source:/options.html"]).pass).toBe(false);
    expect(classStepVerdict(["ROW R14-REL-3 rel-class T5 wrapper=view-source inner=file own=perhaps"]).pass).toBe(false);
  });

  it("classStepVerdict (prep fixer r1, F4): `not listed` and `hidden=disarmed` are NOT MEASURED; `hidden=blocked` passes, said so", () => {
    for (const l of ["ROW R14-REL-3 rel-class T5 not listed", "ROW R14-REL-3 rel-class T5 hidden=disarmed (no url to class)"]) {
      const v = classStepVerdict(["ROW R14-REL-3 rel ok (3 ms)", l]);
      expect(v.pass).toBe(false);
      expect(v.notMeasured).toBe(true);
    }
    const b = classStepVerdict(["ROW R14-REL-3 rel ok (3 ms)", "ROW R14-REL-3 rel-class T5 hidden=blocked (no url to class)"]);
    expect(b.pass).toBe(true);
    expect(b.notMeasured).toBeUndefined();
    expect(b.why).toContain("an own page whose URL the extension withholds");
    const odd = classStepVerdict(["ROW R14-REL-3 rel-class T5 hidden=other (no url to class)"]);
    expect(odd).toMatchObject({ pass: false });
    expect(odd.notMeasured).toBeUndefined();
    // a URL anywhere still FAILS, whatever the class line says
    expect(classStepVerdict(["url http://localhost:8080/", "ROW R14-REL-3 rel-class T5 not listed"]).notMeasured).toBeUndefined();
  });
});

describe("R14-3: the window placement rule", () => {
  const work = [{ left: 0, top: 0, right: 1920, bottom: 1032 }];
  const w = { rect: { left: 0, top: 0, right: 1152, bottom: 1032 }, minimized: false, visible: true };
  const o = { rect: { left: 1152, top: 0, right: 1920, bottom: 1032 }, minimized: false, visible: true };
  const occluders = 0;

  it("passes side by side (touching edges), on the work area, neither minimized, nothing above O", () => {
    expect(placementVerdict({ w, o, work, occluders })).toEqual({
      pass: true,
      why: "W and O do not overlap, both lie on a monitor's work area, neither is minimized, no window above O overlaps it",
    });
    expect(overlapArea(w.rect, o.rect)).toBe(0);
  });

  it("fails on an overlap, a minimized or hidden window, an empty rect, or a rect off every work area", () => {
    expect(placementVerdict({ w, o: { ...o, rect: { ...o.rect, left: 1100 } }, work, occluders }).why).toContain("overlap 52x1032");
    expect(placementVerdict({ w: { ...w, minimized: true }, o, work, occluders }).pass).toBe(false);
    expect(placementVerdict({ w, o: { ...o, visible: false }, work, occluders }).pass).toBe(false);
    expect(placementVerdict({ w, o: { ...o, rect: { left: 5, top: 5, right: 5, bottom: 9 } }, work, occluders }).pass).toBe(false);
    expect(placementVerdict({ w, o: { ...o, rect: { ...o.rect, right: 1930 } }, work, occluders }).why).toContain("O is not inside any monitor's work area");
    expect(placementVerdict({ w, o, work: [], occluders }).pass).toBe(false);
    const two = [...work, { left: 1920, top: 0, right: 3840, bottom: 1040 }];
    expect(placementVerdict({ w, o: { ...o, rect: { left: 2000, top: 10, right: 3000, bottom: 900 } }, work: two, occluders }).pass).toBe(true);
  });

  it("prep fixer r1 (F5): a window above O that overlaps it fails the guard; an unmeasured count is no pass", () => {
    expect(placementVerdict({ w, o, work, occluders: 1 })).toEqual({ pass: false, why: "1 window(s) above O overlap it (O is covered)" });
    expect(placementVerdict({ w, o, work, occluders: 2 }).pass).toBe(false);
    expect(placementVerdict({ w, o, work, occluders: -1 }).why).toContain("occluders not measured");
    expect(placementVerdict({ w, o, work } as unknown as Parameters<typeof placementVerdict>[0]).pass).toBe(false);
  });

  it("placementLine prints both rects, the minimized flags, the work areas and the occluder count (judged)", () => {
    expect(placementLine({ w, o, work, occluders: 0 })).toBe(
      "W [0,0,1152,1032] minimized=false visible=true · O [1152,0,1920,1032] minimized=false visible=true · work areas [0,0,1920,1032] · occluders above O 0",
    );
  });

  it("sideBySide splits a work area 60/40 with no overlap", () => {
    const s = sideBySide({ left: 0, top: 0, right: 1920, bottom: 1032 });
    expect(s.w).toEqual({ left: 0, top: 0, right: 1152, bottom: 1032 });
    expect(s.o).toEqual({ left: 1152, top: 0, right: 1920, bottom: 1032 });
    const odd = sideBySide({ left: -1280, top: 40, right: 0, bottom: 1024 });
    expect(overlapArea(odd.w, odd.o)).toBe(0);
    expect(odd.w.left).toBe(-1280);
    expect(odd.o.right).toBe(0);
  });
});

describe("R14-4b: k, the follow-up, the banner record, the re-run delay", () => {
  const disarmed = err("DISARMED", EXPECT.disarmedAll, { scope: "all" });

  it("the k range: 0 < k < 1000 passes, the ends are not discriminating", () => {
    expect(typeVerdict(disarmed, 1, 1000).pass).toBe(true);
    expect(typeVerdict(disarmed, 999, 1000).pass).toBe(true);
    expect(typeVerdict(disarmed, 1000, 1000).notDiscriminating).toBe(true);
    expect(typeVerdict(disarmed, 0, 1000).notDiscriminating).toBe(true);
    expect(typeVerdict(err("DEBUGGER_CANCELLED", "x"), 500, 1000)).toMatchObject({ pass: false, notDiscriminating: false });
  });

  it("r14TypeVerdict (prep fixer r1, F6): a press before the reply and the call still finishing is a FAIL", () => {
    const press = "2026-10-25T10:00:00.500Z";
    const reply = "2026-10-25T10:00:01.000Z";
    const late = "2026-10-25T10:00:01.200Z";
    expect(r14TypeVerdict(disarmed, 578, 1000, press, reply)).toEqual({ pass: true, notDiscriminating: false, why: ["DISARMED mid-way: typed 578 of 1000"] });
    // the defect the row exists to catch: the press landed during the call and the call still finished
    expect(r14TypeVerdict(ok(), 1000, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(ok(), 1000, 1000, press, reply).why.join(" ")).toContain("the call still finished");
    expect(r14TypeVerdict(disarmed, 1000, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(ok(), 400, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(ok(), null, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(ok(), 1000, 1000, reply, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    // NOT DISCRIMINATING only for a press after the reply
    expect(r14TypeVerdict(ok(), 1000, 1000, late, reply)).toMatchObject({ pass: false, notDiscriminating: true });
    expect(r14TypeVerdict(disarmed, 0, 1000, late, reply)).toMatchObject({ notDiscriminating: true });
    // the press before the first character: DISARMED with k = 0 is no defect, and no measurement of "mid-way"
    expect(r14TypeVerdict(disarmed, 0, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: true });
    // other failures stay FAILs
    expect(r14TypeVerdict(err("DEBUGGER_CANCELLED", "x"), 500, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(err("DEBUGGER_CANCELLED", "x"), 0, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(disarmed, null, 1000, press, reply)).toMatchObject({ pass: false, notDiscriminating: false });
    expect(r14TypeVerdict(disarmed, 500, 1000, null, reply)).toMatchObject({ pass: false, notDiscriminating: false });
  });

  it("followUpVerdict: ok and the page's input equals the text; an another-debugger error is named", () => {
    expect(followUpVerdict(ok(), R14.followUpText, R14.followUpText)).toEqual({ pass: true, why: 'ok, the page\'s input reads "R14ok" (no another-debugger error)' });
    expect(followUpVerdict(err(R14.anotherDebuggerCode, "x"), null, R14.followUpText).why).toContain("another debugger");
    expect(followUpVerdict(err("DISARMED", EXPECT.disarmedAll, { scope: "all" }), null, R14.followUpText).pass).toBe(false);
    expect(followUpVerdict(ok(), "R14o", R14.followUpText).pass).toBe(false);
    expect(followUpVerdict(ok(), null, R14.followUpText).pass).toBe(false);
  });

  it("bannerLifetime: gone between the last shown and the first absent poll", () => {
    const samples = [
      { ms: 0, shown: true },
      { ms: 260, shown: true },
      { ms: 13900, shown: true },
      { ms: 14150, shown: false },
      { ms: 20100, shown: false },
    ];
    const lt = bannerLifetime(samples);
    expect(lt).toEqual({ kind: "gone", lastShownMs: 13900, firstGoneMs: 14150, returned: 0, n: 5, spanMs: 20100, maxGapMs: 13640 });
    expect(bannerLine(lt, true, 20000)).toBe(
      "banner at press yes · gone between +13900 ms and +14150 ms after the press (last shown, first absent) · returned after gone 0 · polls 5 over 20100 ms (≥ 20000: yes), max gap 13640 ms (record)",
    );
  });

  it("bannerLifetime: still shown, never shown, a return after gone, no polls", () => {
    expect(bannerLifetime([{ ms: 0, shown: true }, { ms: 20000, shown: true }])).toMatchObject({ kind: "still-shown", lastMs: 20000 });
    expect(bannerLine(bannerLifetime([{ ms: 0, shown: true }, { ms: 20000, shown: true }]), true, 20000)).toContain("still shown at +20000 ms (lifetime ≥ 20000 ms)");
    expect(bannerLifetime([{ ms: 0, shown: false }, { ms: 300, shown: false }])).toMatchObject({ kind: "never-shown", n: 2 });
    const back = bannerLifetime([{ ms: 0, shown: true }, { ms: 250, shown: false }, { ms: 500, shown: true }, { ms: 750, shown: false }]);
    expect(back).toMatchObject({ kind: "gone", lastShownMs: 500, firstGoneMs: 750, returned: 1 });
    expect(bannerLifetime([])).toEqual({ kind: "not-polled" });
    expect(bannerLine({ kind: "not-polled" }, null, 20000)).toBe("banner at press not read · not polled (record)");
    // unsorted input is sorted by time first
    expect(bannerLifetime([{ ms: 500, shown: false }, { ms: 0, shown: true }])).toMatchObject({ kind: "gone", lastShownMs: 0, firstGoneMs: 500 });
  });

  it("rerunDelayMs: half the typing time when k = n, +400 ms when k = 0, none otherwise", () => {
    const s = "2026-10-25T10:00:00.000Z";
    expect(rerunDelayMs(1000, 1000, s, "2026-10-25T10:00:02.400Z", 400)).toBe(1200);
    expect(rerunDelayMs(0, 1000, s, "2026-10-25T10:00:01.000Z", 400)).toBe(800);
    expect(rerunDelayMs(578, 1000, s, "2026-10-25T10:00:01.000Z", 400)).toBeNull();
    expect(rerunDelayMs(1000, 1000, s, "2026-10-25T10:00:00.050Z", 400)).toBe(100);
    expect(rerunDelayMs(1000, 1000, "x", "y", 400)).toBeNull();
  });
});

describe("R14-5c: the positive control and the server-log counts", () => {
  it("concurrentVerdict: every request answered 302 within the bound", () => {
    expect(concurrentVerdict([{ status: 302, ms: 12 }, { status: 302, ms: 15 }], 2, 1000).pass).toBe(true);
    expect(concurrentVerdict([{ status: 302, ms: 12 }, { status: null, ms: 5000 }], 2, 1000).why).toContain("1 of 2");
    expect(concurrentVerdict([{ status: 302, ms: 12 }, { status: 302, ms: 1001 }], 2, 1000).pass).toBe(false);
    expect(concurrentVerdict([{ status: 302, ms: 12 }], 2, 1000).pass).toBe(false);
    expect(concurrentVerdict([{ status: 200, ms: 12 }, { status: 302, ms: 12 }], 2, 1000).pass).toBe(false);
  });

  it("logHits counts lines naming the key as a whole query parameter", () => {
    const log = [
      "2026-10-25T10:00:00.000Z GET /dl/hello.txt?s14=5c2",
      '127.0.0.1 - - [25/Oct/2026 10:00:00] "GET /dl/hello.txt?s14=5c2 HTTP/1.1" 200 -',
      "2026-10-25T10:00:00.000Z GET /dl/hello.txt?s14=5c20",
      "2026-10-25T10:00:00.000Z GET /dl/hello.txt?x=1&s14=5c1",
      "2026-10-25T10:00:00.000Z GET /dl/hello.txt?xs14=5c1",
    ].join("\r\n");
    expect(logHits(log, "s14=5c2")).toBe(2);
    expect(logHits(log, "s14=5c1")).toBe(1);
    expect(logHits("", "s14=5c1")).toBe(0);
  });

  it("serverLogVerdict: 5c1 never requested; 5c2's hop and its target each requested once (#140's limit)", () => {
    const good = { hop5c1: 0, target5c1: 0, hop5c2: 1, target5c2: 1 };
    expect(serverLogVerdict(good).pass).toBe(true);
    expect(serverLogLine(good)).toBe("server-log s14=5c1 8083=0 8081=0 · s14=5c2 8083=1 8081=1");
    expect(serverLogVerdict({ ...good, target5c1: 1 }).pass).toBe(false);
    expect(serverLogVerdict({ ...good, hop5c2: 0 }).pass).toBe(false);
    expect(serverLogVerdict({ ...good, target5c2: 0 }).pass).toBe(false);
    expect(serverLogVerdict({ ...good, target5c2: 2 }).pass).toBe(false);
  });
});

describe("STOP lines", () => {
  it("stopLine begins with STOP: and scrubs URLs", () => {
    expect(stopLine("s9.ts call: SET-UP: no tab")).toBe("STOP: s9.ts call: SET-UP: no tab");
    expect(stopLine("failed at https://x.example/a")).toBe("STOP: failed at <url withheld>");
  });
});

describe("MCP actors", () => {
  it("the config names only chrome-agent-bridge and carries no token or env", () => {
    const c = mcpConfig("C:\\node\\node.exe", "C:\\repo\\mcp\\dist\\index.js");
    expect(Object.keys(c.mcpServers)).toEqual(["chrome-agent-bridge"]);
    expect(c.mcpServers["chrome-agent-bridge"]).toEqual({ command: "C:\\node\\node.exe", args: ["C:\\repo\\mcp\\dist\\index.js"] });
    expect(JSON.stringify(c)).not.toMatch(/token|env/i);
  });

  it("actorArgs: strict config, the bridge's tools only", () => {
    const a = actorArgs("sonnet", "C:\\cfg.json");
    expect(a).toContain("--strict-mcp-config");
    expect(a[a.indexOf("--mcp-config") + 1]).toBe("C:\\cfg.json");
    expect(a[a.indexOf("--allowedTools") + 1]).toBe("mcp__chrome-agent-bridge");
    expect(a[a.indexOf("--model") + 1]).toBe("sonnet");
  });

  it("toolResultItems and safetyDelivery", () => {
    const line = "Safety: armed · JavaScript on · 0 blocked sites";
    const two = [{ type: "text", text: "Daemon: connected\nExtension: connected" }, { type: "text", text: line }];
    expect(toolResultItems(two)).toEqual({ count: 2, types: ["text", "text"], texts: ["Daemon: connected\nExtension: connected", line] });
    expect(safetyDelivery(two, line)).toEqual({ where: "item", index: 1 });
    expect(safetyDelivery(`Daemon: connected\n${line}`, line)).toEqual({ where: "line", index: 0 });
    expect(safetyDelivery([{ type: "text", text: "Daemon: connected" }], line)).toEqual({ where: "absent", index: -1 });
  });
});

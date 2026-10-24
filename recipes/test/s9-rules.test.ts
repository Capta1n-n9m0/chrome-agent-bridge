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
import {
  actorArgs,
  checkLine,
  consoleHits,
  consoleVerdict,
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

// Tests for recipes/s11b-rules.ts sections H2b-H2d: the worker-console expressions, their parsers, the pre-type
// pattern check, the regex fragment builder and its proof against rulesOf, and B17 stored's judge.
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import manifest from "../../extension/manifest.json";
import {
  H119,
  REGEX_FRAGMENTS_SRC,
  REGEX_LABELS,
  REGEX_NOT_MEASURED,
  STOP_CONSOLE_PATTERN,
  STORED_ACK,
  ctxExpression,
  expectedRegexes,
  judgeStored,
  manifestExpression,
  parseCtxLine,
  parseManifestLine,
  parseRegexLines,
  parseRulesLine,
  parseRulesSamplesLine,
  parseStoredAck,
  preTypeCheck,
  regexExpression,
  regexProof,
  rulesExpression,
  rulesSampleExpression,
  rulesTimedExpression,
  parseRulesTimedLine,
  storedExpression,
} from "../s11b-rules.js";

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
const CTX = { token: "tok-" + "Z9y8x7w6", alias: "alias7.localhost", profilePath: "C:\\Users\\someone\\AppData\\Local\\Chrome" };
const TEXT = "line-one.test\nline-two.test:9000\n*.third.test";

/** Runs a console expression against a fake `chrome` and `console`; returns what it printed and what it evaluated to. */
async function runExpr(expr: string, chromeObj: unknown, extra: Record<string, unknown> = {}): Promise<{ out: string[]; value: unknown }> {
  const out: string[] = [];
  const value = runInNewContext(expr, { chrome: chromeObj, console: { log: (s: string) => out.push(s) }, Date, Math, Promise, setTimeout, ...extra });
  await new Promise((r) => setTimeout(r, 400));
  return { out, value };
}

describe("manifest expression (the loaded manifest's own facts)", () => {
  it("prints dnrWithHostAccess=true staticRuleSets=absent for extension/manifest.json, and evaluates to undefined", async () => {
    const r = await runExpr(manifestExpression(), { runtime: { getManifest: () => manifest } });
    expect(r.value).toBeUndefined();
    expect(r.out).toEqual(["MANIFEST dnrWithHostAccess=true staticRuleSets=absent"]);
  });
  it("reads false and present from a manifest that says so", async () => {
    const m = { permissions: ["tabs"], declarative_net_request: { rule_resources: [{ id: "r", enabled: true, path: "r.json" }] } };
    expect((await runExpr(manifestExpression(), { runtime: { getManifest: () => m } })).out).toEqual(["MANIFEST dnrWithHostAccess=false staticRuleSets=present"]);
  });
  it("the product manifest has the permission and no static rule sets", () => {
    expect(manifest.permissions).toContain("declarativeNetRequestWithHostAccess");
    expect("declarative_net_request" in manifest).toBe(false);
  });
});

describe("rules, samples and ctx expressions", () => {
  it("RULES <n>", async () => {
    const dnr = { getSessionRules: async () => [1, 2, 3] };
    const r = await runExpr(rulesExpression(), { declarativeNetRequest: dnr });
    expect(r.value).toBeUndefined();
    expect(r.out).toEqual(["RULES 3"]);
  });
  it("RULES samples=[…] min max, sampled in the console", async () => {
    let n = 0;
    const dnr = { getSessionRules: async () => Array(n++ < 2 ? 2 : 0).fill(0) };
    const r = await runExpr(rulesSampleExpression(20, 100), { declarativeNetRequest: dnr });
    expect(r.value).toBeUndefined();
    expect(r.out).toHaveLength(1);
    const p = parseRulesSamplesLine(r.out[0]!)!;
    expect(p.max).toBe(2);
    expect(p.min).toBe(0);
    expect(p.samples.length).toBeGreaterThanOrEqual(2);
  });
  it("bad sampler bounds and labels throw", () => {
    expect(() => rulesSampleExpression(0, 100)).toThrow();
    expect(() => rulesSampleExpression(100, 50)).toThrow();
    expect(() => ctxExpression("bad label", "rd7")).toThrow();
    expect(() => ctxExpression("rd7", "Bad Tag")).toThrow();
  });
  it("CTX <label> tabs/count: finds the tagged tabs by url or pendingUrl and counts TAB contexts of those tabs only (the options window never)", async () => {
    const seen: unknown[] = [];
    const tabs = [{ id: 7, url: "x/?s11b=rd7p" }, { id: 8, pendingUrl: "y/?s11b=rd7" }, { id: 9, url: "z/?s11b=rd8" }, { id: 5, url: "options" }];
    const rt = { getContexts: async (f: unknown) => (seen.push(f), [{ tabId: 5 }, { tabId: 7 }, { tabId: 7 }, { tabId: 8 }, { tabId: 9 }]) };
    const r = await runExpr(ctxExpression("rd7", "rd7"), { runtime: rt, tabs: { query: async () => tabs } });
    expect(r.value).toBeUndefined();
    // n1: the query value is compared whole, so the setup tab `rd7p` (tab 7) is not the row's tab: only tab 8 matches.
    expect(r.out).toEqual(["CTX rd7 tabs=1", "CTX rd7 count=1"]);
    expect(seen).toEqual([{ contextTypes: ["TAB"] }]);
  });
  it("the typed ctx text holds no scheme separator and passes the pre-type check", () => {
    const e = ctxExpression("rd7", "rd7");
    expect(e).not.toContain("://");
    expect(e).not.toContain("s11b=rd7");
    expect(preTypeCheck(e, CTX)).toBeNull();
  });
  it("the timed sampler prints its clock, and the parser gives each sample its epoch time", async () => {
    const dnr = { getSessionRules: async () => [1, 2] };
    const r = await runExpr(rulesTimedExpression(20, 100), { declarativeNetRequest: dnr });
    expect(r.value).toBeUndefined();
    const p = parseRulesTimedLine(r.out[0]!)!;
    expect(p.samples.length).toBeGreaterThanOrEqual(2);
    expect(p.samples.every((x) => x.n === 2 && x.t >= p.t0)).toBe(true);
    expect(parseRulesTimedLine("RULES timed t0=1000 [0:2,100:0]")).toEqual({ t0: 1000, samples: [{ t: 1000, n: 2 }, { t: 1100, n: 0 }] });
    expect(parseRulesTimedLine(rulesTimedExpression(100, 1000))).toBeNull();
    expect(() => rulesTimedExpression(0, 10)).toThrow();
  });
});

describe("parsers take only a whole line of the exact form", () => {
  const typed = [manifestExpression(), rulesExpression(), rulesSampleExpression(100, 1000), ctxExpression("rd7", "rd7"), rulesTimedExpression(100, 1000), regexExpression()];
  it("the echoed input never parses as output", () => {
    const dump = typed.join("\r\n");
    expect(parseManifestLine(dump)).toBeNull();
    expect(parseRulesLine(dump)).toBeNull();
    expect(parseRulesSamplesLine(dump)).toBeNull();
    expect(parseCtxLine(dump, "rd7")).toBeNull();
    expect(parseRulesTimedLine(dump)).toBeNull();
    expect(parseRegexLines(dump)).toBeNull();
    expect(parseStoredAck(storedExpression(8123, 1000))).toBe(false);
  });
  it("output lines among echo and noise parse; padded, prefixed or suffixed lines do not", () => {
    const dump = ["> " + typed[0], "MANIFEST dnrWithHostAccess=true staticRuleSets=absent", "RULES 0", "undefined", "CTX rd7 count=0", ""].join("\r\n");
    expect(parseManifestLine(dump)).toMatchObject({ dnrWithHostAccess: true, staticRuleSets: "absent" });
    expect(parseRulesLine(dump)).toEqual({ line: "RULES 0", n: 0 });
    expect(parseCtxLine(dump, "rd7")).toEqual({ line: "CTX rd7 count=0", count: 0 });
    expect(parseCtxLine(dump, "rd8")).toBeNull();
    for (const bad of ["x RULES 0", "RULES 0 x", "RULES -1", "RULES 0.5", "RULES"]) expect(parseRulesLine(bad)).toBeNull();
    expect(parseManifestLine("MANIFEST dnrWithHostAccess=maybe staticRuleSets=absent")).toBeNull();
  });
  it("a samples line whose min or max disagrees with its samples is rejected", () => {
    expect(parseRulesSamplesLine("RULES samples=[2,2,0] min=0 max=2")).toMatchObject({ samples: [2, 2, 0], min: 0, max: 2 });
    expect(parseRulesSamplesLine("RULES samples=[2,2,0] min=1 max=2")).toBeNull();
    expect(parseRulesSamplesLine("RULES samples=[] min=0 max=0")).toBeNull();
  });
});

describe("pre-type pattern check", () => {
  it("returns the STOP line for each RD-LOGS pattern", () => {
    const samples = ["a://b", "see localhost:8085 here", "x" + "a".repeat(24) + "y", "the bank.example site", "h 127.0.0.1 h", CTX.token, CTX.alias, CTX.profilePath];
    for (const s of samples) expect(preTypeCheck(`x ${s} y`, CTX)).toBe(STOP_CONSOLE_PATTERN);
    expect(STOP_CONSOLE_PATTERN).toBe("STOP: console input holds a pattern");
  });
  it("is case-insensitive for hosts and a run of 23 a is clean", () => {
    expect(preTypeCheck("BANK.EXAMPLE")).toBe(STOP_CONSOLE_PATTERN);
    expect(preTypeCheck("a".repeat(23))).toBeNull();
    expect(preTypeCheck("plain text", CTX)).toBeNull();
  });
  it("every expression the helpers build passes it (with a token, alias and profile path set)", () => {
    const all = [manifestExpression(), rulesExpression(), rulesSampleExpression(100, 5000), ctxExpression("rd7", "rd7"), rulesTimedExpression(100, 5000), regexExpression(), storedExpression(8123, 20000)];
    for (const e of all) {
      expect(e.startsWith("void ")).toBe(true);
      expect(e).not.toContain("\n");
      expect(preTypeCheck(e, CTX)).toBeNull();
    }
  });
});

describe("regex fragment builder (RD-REGEX)", () => {
  it("the typed text holds no pattern literal", () => {
    expect(preTypeCheck(REGEX_FRAGMENTS_SRC)).toBeNull();
    expect(REGEX_FRAGMENTS_SRC).not.toContain("://");
    expect(REGEX_FRAGMENTS_SRC).not.toContain("bank.example");
    expect(REGEX_FRAGMENTS_SRC).not.toMatch(/a{24}/);
  });
  it("in-process proof: five regexes equal rulesOf's by length and sha256", () => {
    expect(regexProof()).toBe("equal");
    const built = runInNewContext(REGEX_FRAGMENTS_SRC) as Array<[string, string]>;
    const want = expectedRegexes();
    expect(built.map((p) => p[0])).toEqual([...REGEX_LABELS]);
    expect(built.map((p) => p[1].length)).toEqual([want["bank443-schemes"].length, want["bank443-explicit"].length, 119, 120, 121]);
    expect(want["bank443-schemes"].startsWith("^(?:http|ws)s")).toBe(true);
    expect(want["bank443-explicit"]).toContain(":443");
    expect(want.h119).toContain(H119.replace(":8085", "").split(".").join("\\."));
  });
  it("a changed fragment source is NOT MEASURED", () => {
    expect(regexProof(REGEX_FRAGMENTS_SRC.replace('["80","85"]', '["80","86"]'))).toBe(REGEX_NOT_MEASURED);
    expect(regexProof("throw new Error('x')")).toBe(REGEX_NOT_MEASURED);
    expect(regexProof("[]")).toBe(REGEX_NOT_MEASURED);
    expect(regexProof("42")).toBe(REGEX_NOT_MEASURED);
  });
  it("the console expression prints the five REGEX lines with the sheet's labels and no regex text", async () => {
    const calls: Array<{ regex: string; isCaseSensitive: boolean }> = [];
    const dnr = { isRegexSupported: async (o: { regex: string; isCaseSensitive: boolean }) => (calls.push(o), { isSupported: o.regex.length <= 119 }) };
    const r = await runExpr(regexExpression(), { declarativeNetRequest: dnr });
    expect(r.value).toBeUndefined();
    expect(calls.every((c) => c.isCaseSensitive === false)).toBe(true);
    const want = expectedRegexes();
    expect(calls.map((c) => c.regex)).toEqual(REGEX_LABELS.map((l) => want[l]));
    expect(r.out).toEqual([
      `REGEX bank443-schemes supported=true len=${want["bank443-schemes"].length}`,
      `REGEX bank443-explicit supported=true len=${want["bank443-explicit"].length}`,
      "REGEX h119 supported=true len=119",
      "REGEX h120 supported=false len=120",
      "REGEX h121 supported=false len=121",
    ]);
    expect(parseRegexLines(r.out.join("\n"))!.map((x) => x.label)).toEqual([...REGEX_LABELS]);
    expect(parseRegexLines(r.out.slice(1).join("\n"))).toBeNull();
  });
});

describe("B17 stored", () => {
  it("builds its URL from fragments, bounded, and prints only the fixed acknowledgement (run against fakes)", async () => {
    const expr = storedExpression(8123, 300);
    expect(expr).not.toContain("127.0.0.1");
    expect(expr).not.toContain("://");
    let stored: unknown;
    const posts: Array<{ url: string; init: { method: string; mode: string; headers: Record<string, string>; body: string } }> = [];
    const chromeObj = { storage: { local: { get: async (k: string) => ({ [k]: stored }) } } };
    const fetchFake = async (url: string, init: never) => void posts.push({ url, init });
    setTimeout(() => (stored = TEXT), 120);
    const r = await runExpr(expr, chromeObj, { fetch: fetchFake });
    expect(r.value).toBeUndefined();
    expect(r.out).toEqual([STORED_ACK]);
    expect(posts.map((p) => p.init.body)).toEqual(["", TEXT]);
    expect(posts[0]!.url).toBe("http" + ":" + "//127.0.0.1:8123/");
    expect(posts[0]!.init).toMatchObject({ method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" } });
  });
  it("reads the key the product writes", async () => {
    const { SAFETY_KEYS } = await import("../../extension/src/safety-state.js");
    expect(SAFETY_KEYS.blockList).toBe("safety.blockList");
    expect(storedExpression(8123, 100)).toContain(`"${SAFETY_KEYS.blockList}"`);
  });
  it("the ack parses as a whole line only", () => {
    expect(parseStoredAck(`undefined\r\n${STORED_ACK}\r\n`)).toBe(true);
    expect(parseStoredAck(`${STORED_ACK} x`)).toBe(false);
  });
  it("judges by hash in the helper, and prints the fixed line", () => {
    expect(judgeStored([TEXT], TEXT)).toEqual({ matched: true, line: "STORED match=yes lines=3" });
    expect(judgeStored(["old.test", TEXT], TEXT).matched).toBe(true);
    expect(judgeStored([TEXT, "old.test"], TEXT)).toEqual({ matched: false, line: "STORED match=no lines=1" });
    expect(judgeStored([], TEXT)).toEqual({ matched: false, line: "STORED match=no lines=0" });
    expect(judgeStored([TEXT + " "], TEXT).matched).toBe(false);
  });
  it("hash-not-printed: neither the sha256 nor a line of the text appears in the STORED line or the typed expression", () => {
    const line = judgeStored([TEXT], TEXT).line;
    const expr = storedExpression(8123, 20000);
    for (const hay of [line, expr, STORED_ACK]) {
      for (const h of [sha(TEXT), sha(TEXT).toUpperCase()]) expect(hay).not.toContain(h);
      for (const l of TEXT.split("\n")) expect(hay).not.toContain(l);
    }
    expect(line).toMatch(/^STORED match=(yes|no) lines=\d+$/);
  });
});

/**
 * Step 11b S1: the DNR rule builder (`extension/src/safety-dnr.ts`) against the gate's matcher.
 *
 * The case table is `docs/plans/2026-10-26-step11b-block-list-redirects-steps/stage0-s1-cases.md` (rows 1–50 are
 * `safety-match.test.ts`'s 50 cases; P = ports, I = IP literals, S = `*.`, A = anchoring and userinfo), plus X rows
 * added here so that each of the three mutants of the verifier focus (a dot-less suffix, a port ignored, `*.` matching
 * the bare host) turns at least one row red. Reserved names only (`.example`, `.test`, RFC 2606/6761).
 *
 * Chrome is emulated by the facts measured at Stage 0 (`Stage0.md` §4, §6 item 7):
 * - `requestDomains`: the request host or a subdomain of it, dot boundary only, the port ignored, IP literals
 *   suffix-matched like names, a trailing-dot URL host matching (one dot dropped); an entry ending in `.` or holding
 *   `:` or `*` matches nothing.
 * - `regexFilter`: run on the canonical URL (WHATWG `href`, a default port absent), case-insensitive; the userinfo is
 *   unmeasured, so a regex row must agree with and without it.
 * - Only http/https/ws/wss URLs make a request a rule can see (`view-source:` by its inner URL); any other row is n/a.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseBlockList, parsePatternLine, isUrlBlocked } from "../src/safety-match.js";
import {
  rulesOf,
  countRules,
  fitsCaps,
  type DnrRule,
  type DnrScope,
} from "../src/safety-dnr.js";

type Row = [id: string, pattern: string, url: string | null, expected: "match" | "no" | "invalid" | "ignored"];

const ROWS: Row[] = [
  ["1", "bank.example", "https://bank.example/", "match"],
  ["2", "bank.example", "https://www.bank.example/a", "match"],
  ["3", "bank.example", "https://notbank.example/", "no"],
  ["4", "bank.example", "https://bank.example.evil.test/", "no"],
  ["5", "*.bank.example", "https://bank.example/", "no"],
  ["6", "*.bank.example", "https://a.b.bank.example/", "match"],
  ["7", "BANK.EXAMPLE", "https://Bank.Example/", "match"],
  ["8", "bank.example.", "https://bank.example/", "match"],
  ["9", "bank.example", "https://bank.example./", "match"],
  ["10", "bank.example:8443", "https://bank.example:8443/", "match"],
  ["11", "bank.example:8443", "https://bank.example/", "no"],
  ["12", "bank.example:443", "https://bank.example/", "match"],
  ["13", "bank.example", "http://bank.example:8080/", "match"],
  ["14", "localhost:8081", "http://localhost:8081/x", "match"],
  ["15", "localhost:8081", "http://localhost:8080/x", "no"],
  ["16", "localhost:8081", "http://app.localhost:8081/", "match"],
  ["17", "127.0.0.1", "http://127.0.0.1:8081/", "match"],
  ["18", "127.0.0.1", "http://localhost:8081/", "no"],
  ["19", "127.0.0.1", "http://2130706433/", "match"],
  ["20", "*.127.0.0.1", null, "invalid"],
  ["21", "[::1]:8081", "http://[::1]:8081/", "match"],
  ["22", "::1", null, "invalid"],
  ["23", "bücher.example", "https://xn--bcher-kva.example/", "match"],
  ["24", "xn--bcher-kva.example", "https://bücher.example/", "match"],
  ["25", "   bank.example   ", "https://bank.example/", "match"],
  ["26", "", null, "ignored"],
  ["27", "# my bank", null, "ignored"],
  ["28", "bank example", null, "invalid"],
  ["29", "*bank.example", null, "invalid"],
  ["30", "*", null, "invalid"],
  ["31a", "bank.example:0", null, "invalid"],
  ["31b", "bank.example:70000", null, "invalid"],
  ["32", "https://bank.example/login?x=1", "https://www.bank.example/", "match"],
  ["33", "bank.example", "https://user:pw@bank.example/", "match"],
  ["34", "bank.example", "blob:https://bank.example/uuid", "match"],
  ["35", "bank.example", "view-source:https://bank.example/", "match"],
  ["36a", "bank.example", "about:blank", "no"],
  ["36b", "bank.example", "data:text/html,x", "no"],
  ["37", "bank.example", "wss://bank.example/socket", "match"],
  ["38", "example", "https://bank.example/", "match"],
  ["39", "bank.example", "chrome-extension://abcdefghijklmnopabcdefghijklmnop/options.html", "no"],
  ["40", "extensions", "chrome://extensions", "no"],
  ["41", "ponmlkjihgfedcbaponmlkjihgfedcba", "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba/page.html", "no"],
  ["42", "my_host.example", "https://my_host.example/", "match"],
  ["43", "bank.example", "filesystem:https://bank.example/temporary/x", "match"],
  ["44", "bank.example", "file://bank.example/share/x", "match"],
  ["45", "bank.example:445", "file://bank.example/share/x", "no"],
  ["46", "bank.example", "file:///C:/x", "no"],
  ["47", "https://bank.example:443/", "https://bank.example:8443/", "match"],
  ["48", "bank.example:443", "https://bank.example:8443/", "no"],
  ["49", "https://bank.example:8443/x", "https://bank.example:8443/", "match"],
  ["50", "https://bank.example:8443/x", "https://bank.example/", "no"],
  ["P1a", "bank.example:80", "http://bank.example/", "match"],
  ["P1b", "bank.example:80", "https://bank.example/", "no"],
  ["P1c", "bank.example:80", "http://bank.example:80/", "match"],
  ["P2a", "bank.example:443", "http://bank.example:443/", "match"],
  ["P2b", "bank.example:443", "wss://bank.example/", "match"],
  ["P2c", "bank.example:443", "ws://bank.example/", "no"],
  ["P3a", "bank.example:8443", "https://bank.example:8443?x", "match"],
  ["P3b", "bank.example:8443", "https://bank.example:84430/", "no"],
  ["P3c", "bank.example:8443", "https://bank.example.:8443/", "match"],
  ["P4a", "localhost:8081", "ws://localhost:8081/", "match"],
  ["P4b", "localhost:8081", "http://localhost:18081/", "no"],
  ["P4c", "localhost:8081", "http://localhost:808/", "no"],
  ["P5", "localhost", "http://localhost:9234/", "match"],
  ["P6", "https://bank.example/", "http://bank.example:8080/", "match"],
  ["P7", "xn--bcher-kva.example:8443", "https://bücher.example:8443/", "match"],
  ["P8a", "my_host.example:8443", "https://my_host.example:8443/", "match"],
  ["P8b", "my_host.example:8443", "https://myxhost.example:8443/", "no"],
  ["P9", "bank.example:8443", "ftp://bank.example:8443/", "match"],
  ["I1a", "127.0.0.1:8081", "http://127.0.0.1:8081/", "match"],
  ["I1b", "127.0.0.1:8081", "http://127.0.0.1:8082/", "no"],
  ["I1c", "127.0.0.1:8081", "http://localhost:8081/", "no"],
  ["I2a", "127.0.0.1", "http://127.0.0.2/", "no"],
  ["I2b", "127.0.0.1", "http://127.0.0.10/", "no"],
  ["I2c", "127.0.0.1", "http://127.0.0.1.example/", "no"],
  ["I2d", "127.0.0.1", "http://0x7f.1/", "match"],
  ["I3", "127.0.0.1", "http://[::ffff:127.0.0.1]/", "no"],
  ["I4a", "[::1]", "http://[::1]:9/", "match"],
  ["I4b", "[::1]", "http://[::2]/", "no"],
  ["I5", "[::1]:8081", "http://[::1]:8082/", "no"],
  ["I6", "[0:0:0:0:0:0:0:1]", "http://[::1]/", "match"],
  ["I7", "[::ffff:127.0.0.1]", "http://[::ffff:7f00:1]/", "match"],
  ["I8", "2130706433", "http://127.0.0.1/", "match"],
  ["I9a", "127.0.0.1", "http://evil.test/?h=127.0.0.1", "no"],
  ["I9b", "127.0.0.1", "http://evil.test/127.0.0.1", "no"],
  ["S1a", "*.bank.example", "https://www.bank.example/", "match"],
  ["S1b", "*.bank.example", "https://xbank.example/", "no"],
  ["S1c", "*.bank.example", "https://a.bank.example./", "match"],
  ["S2a", "*.bank.example:8443", "https://a.bank.example:8443/", "match"],
  ["S2b", "*.bank.example:8443", "https://bank.example:8443/", "no"],
  ["S2c", "*.bank.example:8443", "https://a.bank.example/", "no"],
  ["S3a", "*.bank.example", "https://evil.test/#.bank.example", "no"],
  ["S3b", "*.bank.example", "https://evil.test/x.bank.example", "no"],
  ["S4a", "*.localhost:8081", "http://app.localhost:8081/", "match"],
  ["S4b", "*.localhost:8081", "http://localhost:8081/", "no"],
  ["A1a", "bank.example", "https://evil.test/?u=https://bank.example/", "no"],
  ["A1b", "bank.example", "https://evil.test@bank.example/", "match"],
  ["A1c", "bank.example", "https://bank.example@evil.test/", "no"],
  ["A2a", "bank.example:8443", "https://evil.test/?u=https://bank.example:8443/", "no"],
  ["A2b", "bank.example:8443", "https://bank.example:8443@evil.test/", "no"],
  ["A2c", "bank.example:8443", "https://u:p@bank.example:8443/", "match"],
  ["A3a", "example", "https://example/", "match"],
  ["A3b", "example", "https://example.example.evil.test/", "no"],
  // Added in S1: each mutant of the verifier focus turns one of these red.
  ["X1", "bank.example:8443", "https://notbank.example:8443/", "no"], // dot-less suffix, port form
  ["X2", "*.bank.example", "https://xbank.example:8443/", "no"], // dot-less suffix, `*.` form
  ["X3", "bank.example:8443", "http://bank.example:8080/", "no"], // port ignored
  ["X4", "127.0.0.1:8081", "http://127.0.0.1/", "no"], // port ignored, IP form
  ["X5", "*.bank.example", "http://bank.example:8080/", "no"], // `*.` on the bare host, other port
  ["X6", "*.localhost", "http://localhost/", "no"], // `*.` on the bare host, single label
  ["X7", "*.localhost", "http://a.localhost:1/", "match"],
  ["X8", "[::1]", "http://[::1]/", "match"],
];

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const TAB: DnrScope = { kind: "tab", tabId: 42 };
const DL: DnrScope = { kind: "download", extensionId: OWN_ID };

// ---- Chrome emulation (Stage0.md §4) ----

const REQUEST_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);

/** The request URL a rule would see, or null when the URL makes no request a rule can see. */
function requestUrl(url: string): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol === "view-source:") return requestUrl(url.slice("view-source:".length));
  return REQUEST_SCHEMES.has(u.protocol) ? u : null;
}

function domainsMatch(domains: readonly string[], u: URL): boolean {
  let host = u.hostname.toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1); // measured: a trailing-dot URL host matches
  return domains.some(
    (d) => !d.endsWith(".") && !d.includes(":") && !d.includes("*") && (host === d || host.endsWith("." + d)),
  );
}

function regexMatches(re: string, u: URL): boolean {
  const r = new RegExp(re, "i");
  const forms = [u.href];
  if (u.username !== "" || u.password !== "") {
    const bare = new URL(u.href);
    bare.username = "";
    bare.password = "";
    forms.push(bare.href);
  }
  const results = forms.map((f) => r.test(f));
  expect(new Set(results).size, `regex disagrees with and without userinfo: ${u.href}`).toBe(1);
  return results[0]!;
}

interface Req {
  url: URL;
  tabId: number;
  type: string;
  initiator?: string;
}

function ruleMatches(rule: DnrRule, req: Req): boolean {
  const c = rule.condition;
  if (!c.tabIds.includes(req.tabId)) return false;
  if (!c.resourceTypes.includes(req.type as never)) return false;
  if (c.initiatorDomains && (req.initiator === undefined || !c.initiatorDomains.includes(req.initiator))) return false;
  if (c.requestDomains) return domainsMatch(c.requestDomains, req.url);
  if (c.regexFilter !== undefined) return regexMatches(c.regexFilter, req.url);
  return true;
}

const blocks = (rules: DnrRule[], req: Req) => rules.some((r) => ruleMatches(r, req));
const tabReq = (url: URL): Req => ({ url, tabId: 42, type: "main_frame" });
const dlReq = (url: URL): Req => ({ url, tabId: -1, type: "xmlhttprequest", initiator: OWN_ID });

// ---- Tests ----

describe("S1 case table: the matcher agrees with the table", () => {
  it("has at least 60 rows", () => expect(ROWS.length).toBeGreaterThanOrEqual(60));
  it.each(ROWS)("%s %j %j → %s", (_id, pattern, url, expected) => {
    if (url === null) expect(parsePatternLine(pattern).kind).toBe(expected);
    else expect(isUrlBlocked(url, parseBlockList(pattern))).toBe(expected === "match");
  });
});

describe("S1 equivalence: the produced rules block exactly what isUrlBlocked blocks", () => {
  it.each(ROWS)("%s %j %j", (_id, pattern, url) => {
    const list = parseBlockList(pattern);
    const tabRules = rulesOf(list, TAB, 1);
    const dlRules = rulesOf(list, DL, 1);
    if (url === null) {
      expect(tabRules).toEqual([]); // invalid and ignored lines make no rule
      expect(dlRules).toEqual([]);
      return;
    }
    const u = requestUrl(url);
    if (u === null) return; // n/a: no request a rule can see (blob:, file:, data:, chrome:, an invalid port …)
    const want = isUrlBlocked(url, list);
    expect(blocks(tabRules, tabReq(u))).toBe(want);
    expect(blocks(dlRules, dlReq(u))).toBe(want);
  });

  it("one list of every valid pattern agrees on every row URL, both scopes", () => {
    const list = parseBlockList(ROWS.map((r) => r[1]));
    const tabRules = rulesOf(list, TAB, 100);
    const dlRules = rulesOf(list, DL, 100);
    for (const [, , url] of ROWS) {
      if (url === null) continue;
      const u = requestUrl(url);
      if (u === null) continue;
      const want = isUrlBlocked(url, list);
      expect(blocks(tabRules, tabReq(u)), url).toBe(want);
      expect(blocks(dlRules, dlReq(u)), url).toBe(want);
    }
  });

  it("the n/a rows are only URLs with no http(s)/ws(s) request", () => {
    const na = ROWS.filter(([, , url]) => url !== null && requestUrl(url) === null).map((r) => r[0]);
    expect(na).toEqual(["34", "36a", "36b", "39", "40", "41", "43", "44", "45", "46", "P3b", "P9"]);
  });
});

describe("S1 scopes", () => {
  const list = parseBlockList(["bank.example", "*.bank.example", "bank.example:8443", "bank.example:443", "127.0.0.1"]);
  const u = new URL("https://bank.example:8443/");

  it("tab rules: tabIds [tabId], resourceTypes exactly [main_frame], no initiator", () => {
    const rules = rulesOf(list, TAB, 1);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.condition.tabIds).toEqual([42]);
      expect(r.condition.resourceTypes).toEqual(["main_frame"]);
      expect(r.condition.initiatorDomains).toBeUndefined();
    }
    expect(blocks(rules, { url: u, tabId: 43, type: "main_frame" })).toBe(false);
    expect(blocks(rules, { url: u, tabId: 42, type: "sub_frame" })).toBe(false);
  });

  it("download rules: tabIds [-1], the own initiator, resourceTypes exactly [xmlhttprequest] (never untyped)", () => {
    const rules = rulesOf(list, DL, 1);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      if (r.condition.tabIds.includes(-1)) expect(r.condition.resourceTypes).toEqual(["xmlhttprequest"]);
      expect(r.condition.tabIds).toEqual([-1]);
      expect(r.condition.initiatorDomains).toEqual([OWN_ID]);
    }
    // The offscreen socket (Stage0.md §4 F-d): a websocket request from the own extension is never blocked.
    expect(blocks(rules, { url: new URL("ws://127.0.0.1:9234/"), tabId: -1, type: "websocket", initiator: OWN_ID })).toBe(false);
    expect(blocks(rules, { url: u, tabId: -1, type: "xmlhttprequest", initiator: "other" })).toBe(false);
  });

  it("every rule blocks, priority 1, ids contiguous from idBase, count known in advance", () => {
    for (const scope of [TAB, DL]) {
      const rules = rulesOf(list, scope, 7);
      expect(rules.map((r) => r.id)).toEqual(rules.map((_, i) => 7 + i));
      expect(rules.every((r) => r.action.type === "block" && r.priority === 1)).toBe(true);
      expect(countRules(list).rules).toBe(rules.length);
      expect(countRules(list).regexRules).toBe(rules.filter((r) => r.condition.regexFilter !== undefined).length);
    }
  });

  it("refuses a bad idBase, a bad tabId or an empty extension id (no pattern in the message)", () => {
    expect(() => rulesOf(list, TAB, 0)).toThrow(/idBase/);
    expect(() => rulesOf(list, TAB, 1.5)).toThrow(/idBase/);
    expect(() => rulesOf(list, { kind: "tab", tabId: -1 }, 1)).toThrow(/tabId/);
    expect(() => rulesOf(list, { kind: "download", extensionId: "" }, 1)).toThrow(/extensionId/);
    expect(() => rulesOf(list, { kind: "download", extensionId: "bank.example" }, 1)).toThrow(/extensionId/);
  });

  it("an empty list, or one of invalid/ignored lines only, makes no rule", () => {
    for (const l of [parseBlockList(""), parseBlockList(["# x", "*", "bank example", ""])]) {
      expect(rulesOf(l, TAB, 1)).toEqual([]);
      expect(countRules(l)).toEqual({ rules: 0, regexRules: 0 });
    }
  });
});

describe("S1 guards", () => {
  const all = parseBlockList(ROWS.map((r) => r[1]));
  const rules = [...rulesOf(all, TAB, 1), ...rulesOf(all, DL, 1000)];

  it("requestDomains entries are canonical hosts: no trailing dot, `:`, `*`, upper case; never an IP literal", () => {
    const doms = rules.flatMap((r) => r.condition.requestDomains ?? []);
    expect(doms.length).toBeGreaterThan(0);
    for (const d of doms) {
      expect(d).toMatch(/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/);
      expect(d).not.toMatch(/^\d{1,3}(?:\.\d{1,3}){3}$/);
    }
    expect(rules.every((r) => (r.condition.requestDomains === undefined) !== (r.condition.regexFilter === undefined))).toBe(true);
  });

  it("RE2 subset: no lookaround, no backreference; anchored; case-insensitive", () => {
    const res = rules.flatMap((r) => (r.condition.regexFilter === undefined ? [] : [r]));
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) {
      const re = r.condition.regexFilter!;
      expect(re).not.toMatch(/\(\?<?[=!]/);
      expect(re).not.toMatch(/\\[1-9]|\\k</);
      expect(re.startsWith("^")).toBe(true);
      expect(r.condition.isUrlFilterCaseSensitive).toBe(false);
    }
  });

  /**
   * Chrome compiles a `regexFilter` with RE2, Latin-1, a 2 KiB memory cap, and rejects a bigger one (Stage0.md §1 (4):
   * 9 hosts in one alternation accepted, 10 `memoryLimitExceeded`). Calibrated in S1-fixer.md with google-re2: the
   * window that reproduces 9/10 in Latin-1 is 2016–2128 bytes; at 2016 every regex this module makes of up to 119
   * characters compiled, the shortest that failed had 120. A host past the budget (about 70 characters with a port)
   * makes Chrome reject the rule, which fails closed (phase doc 0.5).
   */
  const REGEX_LEN_BUDGET = 119;

  it("every regex of a realistic pattern stays within the calibrated size budget (labels ≤ 63)", () => {
    const label63 = `${"a".repeat(30)}k${"s".repeat(32)}.example`; // 71 characters
    const realistic = parseBlockList([
      ...ROWS.map((r) => r[1]),
      "bank.example:443", "*.bank.example:443", "bank.example:80", "bank.example:21", "accounts.google.com:443",
      "*.portal.corporate-bank.example:443", "*.login.microsoftonline.com:65535",
      "[1234:5678:9abc:def0:1234:5678:9abc:def0]:65535", "[::ffff:127.0.0.1]:443", "255.255.255.255:65535",
      `*.${label63}`, `${label63}:65535`, `${label63}:443`, `*.${label63}:443`, `*.${label63}:80`,
    ]);
    const res = rulesOf(realistic, TAB, 1).flatMap((r) => r.condition.regexFilter ?? []);
    expect(res.length).toBeGreaterThan(30);
    for (const re of res) expect(re.length, re).toBeLessThanOrEqual(REGEX_LEN_BUDGET);
  });

  it("no pattern text outside the rule objects: counts and errors carry none; the module never logs or calls chrome", () => {
    const hosts = all.patterns.map((p) => p.host);
    const out = JSON.stringify([countRules(all), fitsCaps([countRules(all)], { sessionRules: 5000, regexRules: 1000 })]);
    for (const h of hosts) expect(out).not.toContain(h);
    const src = readFileSync(new URL("../src/safety-dnr.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/\bconsole\.|\bchrome\./);
  });
});

describe("S1 caps (Stage0.md §4: 5000 session rules, 1000 regex rules)", () => {
  const CAPS = { sessionRules: 5000, regexRules: 1000 };
  // Ports from 1000 up: none is a default port (21, 80, 443 make two regex rules each, F1 fix).
  const ports = (n: number) => parseBlockList(Array.from({ length: n }, (_, i) => `h${i}.example:${1000 + i}`));
  const plain = (n: number) => parseBlockList(Array.from({ length: n }, (_, i) => `h${i}.example`));

  it("plain hosts share one rule; each `*.`, port or IP pattern is one regex rule (duplicates once)", () => {
    expect(countRules(plain(6000))).toEqual({ rules: 1, regexRules: 0 });
    expect(countRules(ports(3))).toEqual({ rules: 3, regexRules: 3 });
    expect(countRules(parseBlockList(["127.0.0.1", "2130706433", "a.example", "b.example"]))).toEqual({ rules: 2, regexRules: 1 });
  });

  it("a default port (21, 80, 443) is two regex rules: no port on its schemes, and the explicit port", () => {
    for (const p of ["bank.example:443", "*.bank.example:80", "127.0.0.1:21", "[::1]:443"]) {
      expect(countRules(parseBlockList(p)), p).toEqual({ rules: 2, regexRules: 2 });
    }
    const list = parseBlockList(["a.example", "bank.example:443", "BANK.example.:443", "*.bank.example:80", "b.example:8443"]);
    expect(countRules(list)).toEqual({ rules: 6, regexRules: 5 });
    const rules = rulesOf(list, TAB, 11);
    expect(rules.map((r) => r.id)).toEqual([11, 12, 13, 14, 15, 16]);
  });

  it("the regex cap counts across live calls", () => {
    expect(fitsCaps([countRules(ports(1000))], CAPS)).toBe(true);
    expect(fitsCaps([countRules(ports(1001))], CAPS)).toBe(false);
    expect(fitsCaps([countRules(ports(500)), countRules(ports(500))], CAPS)).toBe(true);
    expect(fitsCaps([countRules(ports(500)), countRules(ports(501))], CAPS)).toBe(false);
  });

  it("the session-rule cap counts across live calls", () => {
    const one = countRules(parseBlockList(["a.example", "b.example:1"])); // 2 rules, 1 regex
    expect(fitsCaps(Array(2500).fill(one), { sessionRules: 5000, regexRules: 5000 })).toBe(true);
    expect(fitsCaps(Array(2501).fill(one), { sessionRules: 5000, regexRules: 5000 })).toBe(false);
    expect(fitsCaps([], CAPS)).toBe(true);
  });
});

/**
 * Step 9 S1.3: the block-list matcher's case table — the 50 cases of
 * docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md §5, verbatim, reserved names only
 * (`.example`, `.test`, RFC 2606/6761). Written and committed before the matcher (S1.3 reads `git log`
 * order; decisions.md · 2026-10-24 · The block-list grammar (#135); · Stricter exit checks for Step 9 (#141)).
 *
 * Cases 39–41 (this extension's pages, `chrome://`, another extension's pages) are rule 7, outside the
 * pattern list: here they are tested through the matcher's URL helpers and the list (which never
 * matches them); `safety-gate.test.ts` tests them again through `safetyDecision`.
 */
import { describe, it, expect } from "vitest";
import {
  parsePatternLine,
  parseBlockList,
  isUrlBlocked,
  isExtensionUrl,
  isOwnExtensionPage,
} from "../src/safety-match.js";

/** A made-up extension id (32 letters a–p, the shape Chrome derives); not any real extension's. */
const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const OTHER_ID = "ponmlkjihgfedcbaponmlkjihgfedcba";

type Expect = "match" | "no" | "invalid" | "ignored";

interface Case {
  n: number;
  pattern: string;
  /** The URL(s) tested; none for a line that is invalid or ignored. */
  urls: string[];
  expected: Expect;
}

/** stage0-audit.md §5, cases 1–38 and 42–50 (39–41 below). */
const CASES: Case[] = [
  { n: 1, pattern: "bank.example", urls: ["https://bank.example/"], expected: "match" },
  { n: 2, pattern: "bank.example", urls: ["https://www.bank.example/a"], expected: "match" },
  { n: 3, pattern: "bank.example", urls: ["https://notbank.example/"], expected: "no" },
  { n: 4, pattern: "bank.example", urls: ["https://bank.example.evil.test/"], expected: "no" },
  { n: 5, pattern: "*.bank.example", urls: ["https://bank.example/"], expected: "no" },
  { n: 6, pattern: "*.bank.example", urls: ["https://a.b.bank.example/"], expected: "match" },
  { n: 7, pattern: "BANK.EXAMPLE", urls: ["https://Bank.Example/"], expected: "match" },
  { n: 8, pattern: "bank.example.", urls: ["https://bank.example/"], expected: "match" },
  { n: 9, pattern: "bank.example", urls: ["https://bank.example./"], expected: "match" },
  { n: 10, pattern: "bank.example:8443", urls: ["https://bank.example:8443/"], expected: "match" },
  { n: 11, pattern: "bank.example:8443", urls: ["https://bank.example/"], expected: "no" },
  { n: 12, pattern: "bank.example:443", urls: ["https://bank.example/"], expected: "match" },
  { n: 13, pattern: "bank.example", urls: ["http://bank.example:8080/"], expected: "match" },
  { n: 14, pattern: "localhost:8081", urls: ["http://localhost:8081/x"], expected: "match" },
  { n: 15, pattern: "localhost:8081", urls: ["http://localhost:8080/x"], expected: "no" },
  { n: 16, pattern: "localhost:8081", urls: ["http://app.localhost:8081/"], expected: "match" },
  { n: 17, pattern: "127.0.0.1", urls: ["http://127.0.0.1:8081/"], expected: "match" },
  { n: 18, pattern: "127.0.0.1", urls: ["http://localhost:8081/"], expected: "no" },
  { n: 19, pattern: "127.0.0.1", urls: ["http://2130706433/"], expected: "match" },
  { n: 20, pattern: "*.127.0.0.1", urls: [], expected: "invalid" },
  { n: 21, pattern: "[::1]:8081", urls: ["http://[::1]:8081/"], expected: "match" },
  { n: 22, pattern: "::1", urls: [], expected: "invalid" },
  { n: 23, pattern: "bücher.example", urls: ["https://xn--bcher-kva.example/"], expected: "match" },
  { n: 24, pattern: "xn--bcher-kva.example", urls: ["https://bücher.example/"], expected: "match" },
  { n: 25, pattern: "   bank.example   ", urls: ["https://bank.example/"], expected: "match" },
  { n: 26, pattern: "", urls: [], expected: "ignored" },
  { n: 27, pattern: "# my bank", urls: [], expected: "ignored" },
  { n: 28, pattern: "bank example", urls: [], expected: "invalid" },
  { n: 29, pattern: "*bank.example", urls: [], expected: "invalid" },
  { n: 30, pattern: "*", urls: [], expected: "invalid" },
  // Case 31 has two lines: both invalid.
  { n: 31, pattern: "bank.example:0", urls: [], expected: "invalid" },
  { n: 31, pattern: "bank.example:70000", urls: [], expected: "invalid" },
  { n: 32, pattern: "https://bank.example/login?x=1", urls: ["https://www.bank.example/"], expected: "match" },
  { n: 33, pattern: "bank.example", urls: ["https://user:pw@bank.example/"], expected: "match" },
  { n: 34, pattern: "bank.example", urls: ["blob:https://bank.example/uuid"], expected: "match" },
  { n: 35, pattern: "bank.example", urls: ["view-source:https://bank.example/"], expected: "match" },
  { n: 36, pattern: "bank.example", urls: ["about:blank", "data:text/html,x"], expected: "no" },
  { n: 37, pattern: "bank.example", urls: ["wss://bank.example/socket"], expected: "match" },
  { n: 38, pattern: "example", urls: ["https://bank.example/"], expected: "match" },
  { n: 42, pattern: "my_host.example", urls: ["https://my_host.example/"], expected: "match" },
  { n: 43, pattern: "bank.example", urls: ["filesystem:https://bank.example/temporary/x"], expected: "match" },
  { n: 44, pattern: "bank.example", urls: ["file://bank.example/share/x"], expected: "match" },
  { n: 45, pattern: "bank.example:445", urls: ["file://bank.example/share/x"], expected: "no" },
  { n: 46, pattern: "bank.example", urls: ["file:///C:/x"], expected: "no" },
  { n: 47, pattern: "https://bank.example:443/", urls: ["https://bank.example:8443/"], expected: "match" },
  { n: 48, pattern: "bank.example:443", urls: ["https://bank.example:8443/"], expected: "no" },
  { n: 49, pattern: "https://bank.example:8443/x", urls: ["https://bank.example:8443/"], expected: "match" },
  { n: 50, pattern: "https://bank.example:8443/x", urls: ["https://bank.example/"], expected: "no" },
];

describe("block-list matcher: stage0-audit.md §5 case table (S1.3)", () => {
  it("covers cases 1–50 (39–41 in their own block below)", () => {
    const numbers = new Set(CASES.map((c) => c.n));
    for (const n of [39, 40, 41]) numbers.add(n);
    expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  for (const c of CASES) {
    const label = `case ${c.n}: ${JSON.stringify(c.pattern)} ${c.urls.length ? "vs " + c.urls.join(", ") : ""} → ${c.expected}`;
    it(label, () => {
      const line = parsePatternLine(c.pattern);
      const list = parseBlockList(c.pattern);
      if (c.expected === "invalid" || c.expected === "ignored") {
        expect(line.kind).toBe(c.expected);
        // Invalid and ignored lines are kept for the options page but never counted (F23).
        expect(list.blockedCount).toBe(0);
        expect(list.patterns).toHaveLength(0);
        // …and match nothing, not even the URL their text names.
        expect(isUrlBlocked("https://bank.example/", list)).toBe(false);
        expect(isUrlBlocked("http://127.0.0.1/", list)).toBe(false);
        expect(isUrlBlocked("http://[::1]/", list)).toBe(false);
        return;
      }
      expect(line.kind).toBe("valid");
      expect(list.blockedCount).toBe(1);
      for (const url of c.urls) expect(isUrlBlocked(url, list)).toBe(c.expected === "match");
    });
  }
});

describe("rule 7 cases 39–41: extension pages and chrome:// are outside the list (S1.3)", () => {
  /** Every pattern from the table that is valid, so "no list pattern" is shown for a full list too. */
  const fullList = parseBlockList(CASES.map((c) => c.pattern).join("\n"));
  const emptyList = parseBlockList("");

  it("case 39: this extension's own page is an own page (blocked by rule 7, not by the list)", () => {
    const url = `chrome-extension://${OWN_ID}/options.html`;
    expect(isOwnExtensionPage(url, OWN_ID)).toBe(true);
    expect(isExtensionUrl(url)).toBe(true);
    expect(isUrlBlocked(url, emptyList)).toBe(false);
  });

  it("case 40: chrome://extensions is not blocked by any list pattern, not an extension page", () => {
    const url = "chrome://extensions";
    expect(isUrlBlocked(url, fullList)).toBe(false);
    // Not even a pattern spelling its WHATWG "host": a chrome: URL has no host for the matcher (rule 5).
    expect(isUrlBlocked(url, parseBlockList("extensions"))).toBe(false);
    expect(isExtensionUrl(url)).toBe(false);
    expect(isOwnExtensionPage(url, OWN_ID)).toBe(false);
  });

  it("case 41: another extension's page is an extension URL (navigation refused) but not an own page", () => {
    const url = `chrome-extension://${OTHER_ID}/page.html`;
    expect(isExtensionUrl(url)).toBe(true);
    expect(isOwnExtensionPage(url, OWN_ID)).toBe(false);
    expect(isUrlBlocked(url, fullList)).toBe(false);
    // A pattern spelling the other id as a host never matches an extension URL (rule 5: no host).
    expect(isUrlBlocked(url, parseBlockList(OTHER_ID))).toBe(false);
  });
});

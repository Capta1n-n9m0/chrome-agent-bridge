/**
 * Step 9 S1: matcher cases beyond stage0-audit.md §5's table — the dot boundary under attack, the
 * per-line result the options page reads (S2b), and edge forms of rules 2–5. Reserved names only.
 */
import { describe, it, expect } from "vitest";
import {
  parseBlockList,
  parsePatternLine,
  isUrlBlocked,
  urlHost,
  urlScheme,
  isExtensionUrl,
  isOwnExtensionPage,
} from "../src/safety-match.js";

const blocks = (pattern: string, url: string) => isUrlBlocked(url, parseBlockList(pattern));

describe("dot boundary: never substring, never dot-less endsWith", () => {
  it.each([
    ["bank.example", "https://xbank.example/"],
    ["bank.example", "https://bank.examplex/"],
    ["bank.example", "https://bank-example.test/"],
    ["bank.example", "https://ank.example/"],
    ["bank.example", "https://example/"],
    ["bank.example", "https://evil.test/bank.example"],
    ["bank.example", "https://evil.test/?u=https://bank.example/"],
    ["bank.example", "https://bank.example@evil.test/"],
    ["*.bank.example", "https://xbank.example/"],
    ["127.0.0.1", "http://127.0.0.10/"],
    ["127.0.0.1", "http://1127.0.0.1.test/"],
    ["0.0.1", "http://10.0.0.1/"],
  ])("%s does not block %s", (p, u) => {
    expect(blocks(p, u)).toBe(false);
  });

  it("an IP literal matches only itself, never as a suffix", () => {
    expect(blocks("10.0.0.1", "http://10.0.0.1/")).toBe(true);
    expect(blocks("10.0.0.1", "http://110.0.0.1/")).toBe(false);
    expect(blocks("[::1]", "http://[::1]:9/")).toBe(true);
    expect(blocks("[::1]", "http://[::2]/")).toBe(false);
    expect(blocks("[0:0::1]", "http://[::1]/")).toBe(true); // canonical IPv6
  });
});

describe("the per-line result (for the options page and blockedCount)", () => {
  it("keeps every line in order with its kind; counts only valid ones", () => {
    const list = parseBlockList("bank.example\n\n# note\nbad line\n*.sub.test:8443\r\n*");
    expect(list.lines.map((l) => l.kind)).toEqual(["valid", "ignored", "ignored", "invalid", "valid", "invalid"]);
    expect(list.blockedCount).toBe(2);
    expect(list.patterns).toEqual([
      { host: "bank.example", subdomainsOnly: false, ip: false },
      { host: "sub.test", subdomainsOnly: true, ip: false, port: 8443 },
    ]);
  });

  it("accepts an array of lines too", () => {
    expect(parseBlockList(["a.example", "b c"]).blockedCount).toBe(1);
  });

  it.each([
    "bank..example",
    ".bank.example",
    "bank.example..",
    "bank.example:",
    "bank.example:80:80",
    "bank.example/path",
    "*.*.bank.example",
    "*.",
    "[::1",
    "[zz::1]",
    "*.[::1]",
    "999.1.1.1",
    "ftp://bank.example/",
    "bank.example:-1",
    "bank.example:08x",
    "http://",
    "https://*.bank.example/",
  ])("%j is invalid", (line) => {
    expect(parsePatternLine(line).kind).toBe("invalid");
  });

  it("a pasted ws/wss URL is reduced like http/https; user info and path dropped", () => {
    expect(parsePatternLine("wss://chat.bank.example:9443/socket")).toMatchObject({ kind: "valid", pattern: { host: "chat.bank.example", port: 9443 } });
    expect(parsePatternLine("https://u:p@bank.example/x#y")).toMatchObject({ kind: "valid", pattern: { host: "bank.example" } });
    expect((parsePatternLine("https://u:p@bank.example/x#y") as { pattern: object }).pattern).not.toHaveProperty("port");
  });

  it("a numeric IPv4 form typed as a pattern is canonicalised (rule 4)", () => {
    expect(parsePatternLine("2130706433")).toMatchObject({ kind: "valid", pattern: { host: "127.0.0.1", ip: true } });
  });
});

describe("urlHost / urlScheme (rule 5)", () => {
  it("effective ports and hostless URLs", () => {
    expect(urlHost("http://a.example/")).toEqual({ host: "a.example", ip: false, port: 80 });
    expect(urlHost("wss://a.example/")).toEqual({ host: "a.example", ip: false, port: 443 });
    expect(urlHost("file://srv.example/x")).toEqual({ host: "srv.example", ip: false });
    for (const u of ["about:blank", "data:text/html,x", "file:///C:/x", "chrome://extensions", "javascript:1", "mailto:a@b.example", "not a url", ""]) {
      expect(urlHost(u)).toBeNull();
    }
  });

  it("nested wrappers are unwrapped (bounded)", () => {
    expect(blocks("bank.example", "view-source:blob:https://bank.example/u")).toBe(true);
    expect(urlHost("blob:blob:blob:blob:blob:blob:https://a.example/")).toBeNull();
  });

  it("urlScheme follows the URL parser's pre-steps", () => {
    expect(urlScheme("  JavaScript:1")).toBe("javascript:");
    expect(urlScheme("java\tscript:1")).toBe("javascript:");
    expect(urlScheme("\u0000data:x")).toBe("data:");
    expect(urlScheme("/relative")).toBeNull();
  });
});

// S1 fixer r1, finding 4: rule 7 unwraps blob:/filesystem:/view-source: (as rule 5 does) and compares the
// scheme and the host case-insensitively. Stricter only: a URL that is not an extension page is unchanged.
describe("rule 7: wrapped and upper-case extension URLs (fixer r1, finding 4)", () => {
  const ID = "abcdefghijklmnopabcdefghijklmnop";
  const OTHER = "ponmlkjihgfedcbaponmlkjihgfedcba";

  it.each([
    `view-source:chrome-extension://${ID}/options.html`,
    `blob:chrome-extension://${ID}/0b1c2d3e-uuid`,
    `filesystem:chrome-extension://${ID}/temporary/x.html`,
    `VIEW-SOURCE:blob:chrome-extension://${ID}/u`,
    `CHROME-EXTENSION://${ID.toUpperCase()}/options.html`,
    `Chrome-Extension://${ID}/options.html`,
    `view-source:CHROME-EXTENSION://${ID.toUpperCase()}/options.html`,
  ])("%s is this extension's page and an extension URL", (u) => {
    expect(isExtensionUrl(u)).toBe(true);
    expect(isOwnExtensionPage(u, ID)).toBe(true);
  });

  it.each([
    `view-source:chrome-extension://${OTHER}/page.html`,
    `blob:chrome-extension://${OTHER}/uuid`,
    `filesystem:chrome-extension://${OTHER}/temporary/x`,
  ])("%s is an extension URL, not this extension's page", (u) => {
    expect(isExtensionUrl(u)).toBe(true);
    expect(isOwnExtensionPage(u, ID)).toBe(false);
  });

  it.each([
    "view-source:https://a.example/",
    "blob:https://a.example/uuid",
    "filesystem:https://a.example/temporary/x",
    "https://chrome-extension.example/",
    `https://a.example/?next=chrome-extension://${ID}/options.html`,
    "chrome://extensions",
    "",
  ])("%s is not an extension URL", (u) => {
    expect(isExtensionUrl(u)).toBe(false);
    expect(isOwnExtensionPage(u, ID)).toBe(false);
  });
});

// S1 fixer r1, finding 8: a textarea value may end its lines with CRLF, CR or LF.
describe("parseBlockList splits on CRLF, CR and LF (fixer r1, finding 8)", () => {
  it.each([
    ["CR", "bank.example\r*.sub.test"],
    ["CRLF", "bank.example\r\n*.sub.test"],
    ["LF", "bank.example\n*.sub.test"],
  ])("%s: two valid lines", (_n, text) => {
    const l = parseBlockList(text);
    expect(l.blockedCount).toBe(2);
    expect(l.lines.map((x) => x.kind)).toEqual(["valid", "valid"]);
    expect(l.lines.map((x) => x.text)).toEqual(["bank.example", "*.sub.test"]);
  });
  it("mixed endings and a blank line between them", () => {
    const l = parseBlockList("a.example\r\rb.example\r\nc.example\n");
    expect(l.blockedCount).toBe(3);
    expect(l.lines.map((x) => x.kind)).toEqual(["valid", "ignored", "valid", "valid", "ignored"]);
  });
});

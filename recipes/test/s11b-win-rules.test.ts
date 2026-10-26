// The pure rules of recipes/s11b-win.ps1 (Step 11b S4-helpers H6). The PowerShell mirror is tied in s11b-win-static.test.ts.
import { describe, expect, it } from "vitest";
import { preTypeCheck } from "../s11b-rules.js";
import {
  allowedS11bUrl, consoleWindowOk, escapeSendKeys, fileUnderRoot, markerExpression, markerLine, S11B_PRINTABLE_RE, S11B_SAMPLER_IDS, tailAfterMarker,
} from "../s11b-win-rules.js";

describe("Open-S11bWindow allow-list (RD-6)", () => {
  it("admits exactly 8083 and 8081 on localhost and 127.0.0.1", () => {
    for (const u of ["http://localhost:8083/e2e-playground.html?s11b=rd6", "http://127.0.0.1:8081/x", "http://localhost:8083", "http://127.0.0.1:8083/"]) expect(allowedS11bUrl(u), u).toBe(true);
  });
  it("refuses every other port, host, scheme and trick", () => {
    const bad = [
      "http://localhost:8084/", "http://localhost:8085/", "http://localhost:8080/", "http://localhost:80831/", "http://localhost:8083@evil.test/",
      "http://evil.test:8083/", "http://sub.localhost:8083/", "https://localhost:8083/", "file:///C:/x.html", "about:blank", "chrome://extensions",
      "chrome-extension://abc/options.html", "http://localhost:8083.evil.test/", "", "http://localhost/",
    ];
    for (const u of bad) expect(allowedS11bUrl(u), u).toBe(false);
  });
});

describe("file under ROOT (F-FILETAB)", () => {
  const root = "C:\\wave\\root";
  it("admits a file strictly inside, any case, either slash", () => {
    expect(fileUnderRoot(root, "C:\\wave\\root\\s11b-file.html")).toBe(true);
    expect(fileUnderRoot(root, "c:/WAVE/Root/sub/a.html")).toBe(true);
    expect(fileUnderRoot(root + "\\", "C:\\wave\\root\\a.html")).toBe(true);
  });
  it("refuses outside, parent, sibling-prefix, dotdot escapes, ROOT itself, drive roots, relative and UNC", () => {
    const bad = [
      "C:\\wave\\other\\a.html", "C:\\wave\\rootx\\a.html", "C:\\wave\\root\\..\\other\\a.html", "C:\\wave\\root", "C:\\wave\\root\\", "C:\\wave", "D:\\wave\\root\\a.html",
      "a.html", "\\\\server\\share\\root\\a.html", "",
    ];
    for (const f of bad) expect(fileUnderRoot(root, f), f).toBe(false);
    expect(fileUnderRoot("C:\\", "C:\\a.html")).toBe(false);
    expect(fileUnderRoot("C:", "C:\\a.html")).toBe(false);
    expect(fileUnderRoot("rel\\root", "rel\\root\\a.html")).toBe(false);
    expect(fileUnderRoot("", "C:\\a.html")).toBe(false);
  });
});

describe("console eval rules", () => {
  it("the typing target is the wave's recorded DevTools window only", () => {
    expect(consoleWindowOk("DevTools", true)).toBe(true);
    expect(consoleWindowOk("<DevTools window>", true)).toBe(true);
    expect(consoleWindowOk("DevTools", false)).toBe(false);
    expect(consoleWindowOk("Agent Bridge E2E Playground", true)).toBe(false);
    expect(consoleWindowOk("<other window>", true)).toBe(false);
  });
  it("the marker expression holds no RD-LOGS pattern (the helper adds no pattern of its own)", () => {
    expect(preTypeCheck(markerExpression(1793049681406), { token: "tok-secret", alias: "alias7", profilePath: "C:\\Users\\x" })).toBeNull();
    expect(markerLine(5)).toBe("S11B-MARK 5");
  });
  it("only text after the LAST whole-line marker counts: an older identical result or the echo never does", () => {
    const lines = ["RULES 0", "S11B-MARK 7", "RULES 0", '> void console.log("S11B-MARK 7")', "S11B-MARK 8", "RULES 2"];
    expect(tailAfterMarker(lines, 8)).toEqual(["RULES 2"]);
    expect(tailAfterMarker(lines, 7)).toEqual(["RULES 0", '> void console.log("S11B-MARK 7")', "S11B-MARK 8", "RULES 2"]);
    expect(tailAfterMarker(lines, 9)).toBeNull();
    expect(tailAfterMarker(['> void console.log("S11B-MARK 9")'], 9)).toBeNull();
    expect(tailAfterMarker(["S11B-MARK 9"], 9)).toEqual([]);
  });
  it("SendKeys escape wraps metacharacters and refuses non-ASCII or multi-line text", () => {
    expect(escapeSendKeys("a+b^c%d~e(f)g{h}i[j]")).toBe("a{+}b{^}c{%}d{~}e{(}f{)}g{{}h{}}i{[}j{]}");
    expect(escapeSendKeys("plain text 123")).toBe("plain text 123");
    expect(escapeSendKeys("caf\u00e9")).toBeNull();
    expect(escapeSendKeys("a\nb")).toBeNull();
  });
  it("prints B17's sheet lines and nothing the console echoes", () => {
    const good = [
      "MANIFEST dnrWithHostAccess=true staticRuleSets=absent", "RULES 0", "RULES samples=[1,1] min=1 max=1", "CTX t1 count=0", "REGEX h119 supported=true len=119",
      "STORED match=yes lines=1", "STOREDAT 1793049681406", "ROW RD-0 (a) PASS: x", "STOP: console input holds a pattern", "NOT MEASURED: no RULES line in the console dump (nothing was read)",
      "FALLBACK: console eval unavailable",
    ];
    for (const l of good) expect(S11B_PRINTABLE_RE.test(l), l).toBe(true);
    for (const l of ["> void (async()=>{ RULES 0", " RULES 0", "undefined", "Error: boom", "  at C:\\Users\\x\\a.ts:1", "S11B-MARK 5", "STOREDPOLL done"]) expect(S11B_PRINTABLE_RE.test(l), l).toBe(false);
  });
  it("the sampler ids are builder 5's eight", () => {
    expect(S11B_SAMPLER_IDS).toHaveLength(8);
    expect(new Set(S11B_SAMPLER_IDS).size).toBe(8);
  });
});

// Tests for recipes/s11-win-rules.ts — the pure half of recipes/s11-win.ps1 (Step 11 S5-win, Run 16; §4.23).
// Written before the module (test-first). The .ps1 itself is covered by recipes/test/s11-win-static.test.ts.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  addLine,
  allowedWindowUrl,
  foundJson,
  lineCount,
  occluderVerdict,
  restoreCheck,
  samplerResult,
  sha256Utf8,
  signalFile,
  signalNamesFor,
  toggleReading,
  validHwnd,
} from "../s11-win-rules.js";
import { EMPTY_SHA256 } from "../s11-rules.js";

describe("sha256Utf8 and lineCount (mirror Get-S9Sha256 and the PowerShell line count)", () => {
  it("hashes UTF-8 without a BOM", () => {
    expect(sha256Utf8("")).toBe(EMPTY_SHA256);
    expect(sha256Utf8("a\nb")).toBe(createHash("sha256").update(Buffer.from("a\nb", "utf8")).digest("hex"));
    expect(sha256Utf8("é")).toBe(createHash("sha256").update(Buffer.from([0xc3, 0xa9])).digest("hex"));
  });
  it("counts non-blank lines, LF or CRLF", () => {
    expect(lineCount("")).toBe(0);
    expect(lineCount("a\r\n\r\n b \n")).toBe(2);
    expect(lineCount("   \n\n")).toBe(0);
  });
});

describe("addLine (found text + one line of the wave's own)", () => {
  it("adds to an empty text without a leading newline", () => {
    expect(addLine("", "R")).toBe("R");
  });
  it("keeps the found text as a prefix, byte for byte", () => {
    const found = "C:\\a\nC:\\b";
    const next = addLine(found, "R");
    expect(next.startsWith(found)).toBe(true);
    expect(next).toBe("C:\\a\nC:\\b\nR");
  });
  it("does not double a trailing newline and keeps CRLF", () => {
    expect(addLine("a\n", "R")).toBe("a\nR");
    expect(addLine("a\r\nb\r\n", "R")).toBe("a\r\nb\r\nR");
    expect(addLine("a\r\nb", "R")).toBe("a\r\nb\r\nR");
    expect(addLine("a  ", "R")).toBe("a  \nR"); // trailing spaces stay, byte for byte
    expect(addLine("a\n\n", "R")).toBe("a\n\nR"); // a trailing blank line stays
    expect(addLine("a \r\n\r\n", "R")).toBe("a \r\n\r\nR");
  });
  it("refuses a line that holds a newline", () => {
    expect(() => addLine("a", "x\ny")).toThrow();
  });
});

describe("restoreCheck: equality by hash, a line without the text or the hash", () => {
  const found = "C:\\Users\\someone\\secret\nD:\\x";
  it("equal when the read-back is the found text exactly", () => {
    const r = restoreCheck("uploadfolders", found, found);
    expect(r.equal).toBe(true);
    expect(r.line).toBe("RESTORE uploadfolders lines=2 hash=equal");
  });
  it("DIFFERENT for one changed character, a changed newline, or a trailing space", () => {
    for (const b of [found.replace("D", "E"), found.replace("\n", "\r\n"), found + " ", ""]) {
      const r = restoreCheck("blocklist", found, b);
      expect(r.equal).toBe(false);
      expect(r.line).toContain("hash=DIFFERENT");
    }
  });
  it("never puts the text, a fragment or either hash in the line", () => {
    for (const b of [found, found + "x"]) {
      const { line } = restoreCheck("uploadfolders", found, b);
      expect(line).not.toContain("secret");
      expect(line).not.toContain("someone");
      expect(line).not.toContain(sha256Utf8(found));
      expect(line).not.toContain(sha256Utf8(b));
    }
  });
});

describe("foundJson (the S5-actor contract: {armed, evaluate, blocklist, uploadfolders, toggle})", () => {
  it("has exactly the contract's keys, hashes included (the file lives outside the repo)", () => {
    const j = foundJson({ armed: true, evaluate: true, blockText: "x.example", foldersText: "", toggle: "off" });
    expect(Object.keys(j)).toEqual(["armed", "evaluate", "blocklist", "uploadfolders", "toggle"]);
    expect(j.blocklist).toEqual({ lines: 1, sha256: sha256Utf8("x.example") });
    expect(j.uploadfolders).toEqual({ lines: 0, sha256: EMPTY_SHA256 });
    expect(j.toggle).toBe("off");
  });
});

describe("toggleReading (UP-0: no or conflicting stateful element is unreadable)", () => {
  it("one stateful candidate gives its state", () => {
    expect(toggleReading([{ name: "Allow access to file URLs", state: "on" }])).toBe("on");
    expect(toggleReading([{ name: "Allow access to file URLs", state: "off" }, { name: "Allow access to file URLs", state: "none" }])).toBe("off");
  });
  it("none, only stateless, or conflicting is unreadable", () => {
    expect(toggleReading([])).toBe("unreadable");
    expect(toggleReading([{ name: "Allow access to file URLs", state: "none" }])).toBe("unreadable");
    expect(toggleReading([{ name: "Allow access to file URLs", state: "on" }, { name: "Allow access to file URLs", state: "off" }])).toBe("unreadable");
  });
  it("agreeing duplicates count as one reading; other names are ignored", () => {
    expect(toggleReading([{ name: "Allow access to file URLs", state: "on" }, { name: "Allow access to file URLs", state: "on" }])).toBe("on");
    expect(toggleReading([{ name: "Allow in Incognito", state: "on" }])).toBe("unreadable");
  });
});

describe("signal files (S5-actor's contract, in $S11_OUT)", () => {
  it("builds <name>.ready / <name>.pressed under the out folder", () => {
    expect(signalFile("C:\\o", "UP-1-sample", "ready")).toBe("C:\\o\\UP-1-sample.ready");
    expect(signalFile("C:\\o", "UP-RACE-A-loop-done", "ready")).toBe("C:\\o\\UP-RACE-A-loop-done.ready");
    expect(signalFile("C:\\o", "UP-RACE-A", "pressed")).toBe("C:\\o\\UP-RACE-A.pressed");
  });
  it("refuses a name that could leave the folder or is not a signal", () => {
    for (const n of ["", "..\\x", "a/b", "a b", "UP-1.ready", "-x", "C:x"]) expect(() => signalFile("C:\\o", n, "ready")).toThrow();
    expect(() => signalFile("C:\\o", "UP-1", "done" as never)).toThrow();
  });
  it("lists the names each row uses", () => {
    expect(signalNamesFor("UP-1")).toEqual(["UP-1-sample", "UP-1-sampled"]);
    expect(signalNamesFor("UP-7")).toEqual(["UP-7-a", "UP-7-a-done", "UP-7-b", "UP-7-b-done", "UP-7-c", "UP-7-c-done"]);
    expect(signalNamesFor("UP-7J")).toEqual(["UP-7J", "UP-7J-done"]);
    expect(signalNamesFor("UP-DEVT")).toEqual(["UP-DEVT", "UP-DEVT-done"]);
    expect(signalNamesFor("UP-RACE-B")).toEqual(["UP-RACE-B", "UP-RACE-B-loop-done"]);
    expect(signalNamesFor("UP-6")).toEqual(["UP-6-sample", "UP-6-sampled"]);
    expect(signalNamesFor("SW-2")).toEqual([]);
  });
});

describe("samplerResult (the banner sampler's .pressed content)", () => {
  it("seen when any sample counted the banner, none otherwise", () => {
    expect(samplerResult([0, 0, 0])).toBe("none");
    expect(samplerResult([0, 1, 0])).toBe("seen");
    expect(samplerResult([])).toBe("none");
  });
});

describe("argument checks", () => {
  it("validHwnd takes a positive integer only", () => {
    expect(validHwnd(264778)).toBe(true);
    for (const v of [0, -1, 1.5, NaN, Infinity]) expect(validHwnd(v)).toBe(false);
  });
  it("allowedWindowUrl: fixtures on 8081/8084, the extensions page, this extension's pages; nothing else", () => {
    const id = "abcdefghijklmnopabcdefghijklmnop";
    for (const u of [
      "http://127.0.0.1:8081/s11-upload.html",
      "http://localhost:8084/s11-csp.html",
      "http://alias.localhost:8081/s11-upload.html",
      "chrome://extensions/?id=" + id,
      "chrome://extensions",
      `chrome-extension://${id}/options.html`,
      "about:blank",
    ])
      expect(allowedWindowUrl(u, id), u).toBe(true);
    for (const u of [
      "https://example.com/",
      "http://127.0.0.1:9234/",
      "http://127.0.0.1:8080/x",
      "http://evil.example:8081/",
      "file:///C:/x",
      "chrome://settings",
      "chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/options.html",
      "http://127.0.0.1:8081.evil.example/",
      "http://localhost.evil.example:8081/",
    ])
      expect(allowedWindowUrl(u, id), u).toBe(false);
  });
});

describe("occluderVerdict (the guard: any occluder fails unless owned by a driver window and clear of what is read)", () => {
  const read = [{ left: 100, top: 100, right: 300, bottom: 200 }];
  it("no occluder is clear", () => {
    expect(occluderVerdict([], read).ok).toBe(true);
  });
  it("a foreign occluder fails", () => {
    const v = occluderVerdict([{ rect: { left: 0, top: 0, right: 10, bottom: 10 }, owner: "other", rootOwner: "other" }], read);
    expect(v.ok).toBe(false);
    expect(v.foreign).toBe(1);
  });
  it("an owned occluder clear of every read rect is exempt; over one it fails", () => {
    const away = { rect: { left: 500, top: 0, right: 700, bottom: 25 }, owner: "O", rootOwner: "O" };
    const over = { rect: { left: 250, top: 150, right: 400, bottom: 175 }, owner: "O", rootOwner: "O" };
    expect(occluderVerdict([away], read).ok).toBe(true);
    expect(occluderVerdict([over], read).ok).toBe(false);
    expect(occluderVerdict([away], []).ok).toBe(false); // no read rects given: nothing is exempt
  });
});

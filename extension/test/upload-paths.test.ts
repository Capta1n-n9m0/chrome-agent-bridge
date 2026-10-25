/**
 * Step 11 S2 — the upload-folder matcher (`extension/src/upload-paths.ts`), exit check S2.1. Written before the
 * matcher. Every row of `docs/plans/2026-10-25-step11-file-upload-steps/stage0-matcher-cases.txt` (74 rows) is a
 * case here under its number, plus the Stage 0 verifier's rows (M1: a POSIX path holding `\`; N2: folder lines with
 * `/` separators, `..`, a UNC or `\\?\` prefix) and #249's added classes (decisions.md · 2026-10-25 · Stage 0:
 * matcher details — a POSIX path with a backslash is refused; ASCII-only case folding (#249)).
 *
 * Dated note 2026-10-25 (S2 builder): row 66 (`/home/u/Up/..\x`) is in the table as `REFUSE DOTSEG` "`\`
 * normalised to `/` first"; #249 replaced that normalisation: a POSIX-shaped path holding `\` is refused outright,
 * so its class here is `BACKSLASH`. The outcome (refused) is the table's.
 *
 * Each row asserts the outcome (allowed or not) and, for a refusal by shape, the refusal class
 * (`uploadPathRefusalClass`); an `OUTSIDE` row has a well-formed shape (class null) and is still refused.
 */
import { describe, it, expect } from "vitest";
import {
  EMPTY_UPLOAD_FOLDERS,
  UPLOAD_MAX_PATHS,
  UPLOAD_MAX_PATH_CHARS,
  parseUploadFolderLine,
  parseUploadFolders,
  uploadPathAllowed,
  uploadPathRefusalClass,
  uploadPathsAllowed,
} from "../src/upload-paths.js";

const W = [String.raw`C:\Up`, String.raw`D:\Data\Shared\ `.trimEnd()];
const P = ["/home/u/Up", "/srv/drop/"];

type Expect = "ALLOW" | "OUTSIDE" | string;
interface Row {
  n: number | string;
  list: "W" | "P" | "W+P" | string[];
  path: string;
  expect: Expect;
}

const r = String.raw;
const LONG_NAME = "a".repeat(4100);

const ROWS: Row[] = [
  { n: 1, list: "W", path: r`C:\Up\a.txt`, expect: "ALLOW" },
  { n: 2, list: "W", path: r`C:\Up\sub\deep\a.txt`, expect: "ALLOW" },
  { n: 3, list: "W", path: r`c:\up\A.TXT`, expect: "ALLOW" },
  { n: 4, list: "W", path: r`C:\UP\a.txt`, expect: "ALLOW" },
  { n: 5, list: "W", path: "C:/Up/a.txt", expect: "ALLOW" },
  { n: 6, list: "W", path: r`C:\Up/sub\a.txt`, expect: "ALLOW" },
  { n: 7, list: "W", path: r`D:\Data\Shared\x.bin`, expect: "ALLOW" },
  { n: 8, list: "W", path: r`D:\Data\Shared\sub\x.bin`, expect: "ALLOW" },
  { n: 9, list: "W", path: r`C:\Up\résumé.pdf`, expect: "ALLOW" },
  { n: 10, list: "W", path: r`C:\Up\%2e%2e\x`, expect: "ALLOW" },
  { n: 11, list: "W", path: r`C:\Up\a b\c.txt`, expect: "ALLOW" },
  { n: 12, list: "W", path: r`C:\Up`, expect: "OUTSIDE" },
  { n: 13, list: "W", path: r`C:\Up\ `.trimEnd(), expect: "TRAILSEP" },
  { n: 14, list: "W", path: r`C:\Uploads\a.txt`, expect: "OUTSIDE" },
  { n: 15, list: "W", path: r`C:\Up.old\a.txt`, expect: "OUTSIDE" },
  { n: 16, list: "W", path: r`C:\a.txt`, expect: "OUTSIDE" },
  { n: 17, list: "W", path: r`D:\Up\a.txt`, expect: "OUTSIDE" },
  { n: 18, list: "W", path: r`D:\Data\Sharedx\y`, expect: "OUTSIDE" },
  { n: 19, list: "W", path: r`D:\Data\a.txt`, expect: "OUTSIDE" },
  { n: 20, list: "W", path: r`Up\a.txt`, expect: "RELATIVE" },
  { n: 21, list: "W", path: r`C:Up\a.txt`, expect: "RELATIVE" },
  { n: 22, list: "W", path: r`\Up\a.txt`, expect: "RELATIVE" },
  { n: 23, list: "W", path: r`.\a.txt`, expect: "RELATIVE" },
  { n: 24, list: "W", path: r`C:\Up\..\Secret\a.txt`, expect: "DOTSEG" },
  { n: 25, list: "W", path: r`C:\Up\sub\..\a.txt`, expect: "DOTSEG" },
  { n: 26, list: "W", path: r`C:\Up\.\a.txt`, expect: "DOTSEG" },
  { n: 27, list: "W", path: "C:/Up/../Secret/a.txt", expect: "DOTSEG" },
  { n: 28, list: "W", path: r`\\server\share\Up\a.txt`, expect: "UNC" },
  { n: 29, list: "W", path: "//server/share/Up/a.txt", expect: "UNC" },
  { n: 30, list: "W", path: r`\\?\C:\Up\a.txt`, expect: "PREFIX" },
  { n: 31, list: "W", path: r`\\.\C:\Up\a.txt`, expect: "PREFIX" },
  { n: 32, list: "W", path: r`\\?\UNC\server\share\a.txt`, expect: "PREFIX" },
  { n: 33, list: "W", path: r`\??\C:\Up\a.txt`, expect: "PREFIX" },
  { n: 34, list: "W", path: r`C:\Up\a.txt:secret`, expect: "ADS" },
  { n: 35, list: "W", path: r`C:\Up\a.txt::$DATA`, expect: "ADS" },
  { n: 36, list: "W", path: "C:\\Up\\a\u0000.txt", expect: "CTRL" },
  { n: 37, list: "W", path: "C:\\Up\\a\u0009.txt", expect: "CTRL" },
  { n: 38, list: "W", path: "C:\\Up\\a\u001F.txt", expect: "CTRL" },
  { n: 39, list: "W", path: "", expect: "EMPTY" },
  { n: 40, list: "W", path: r`C:\Up\\a.txt`, expect: "EMPTYSEG" },
  { n: 41, list: "W", path: "C:\\Up\\sub\\", expect: "TRAILSEP" },
  { n: 42, list: "W", path: r`C:\Up\CON`, expect: "DEVICE" },
  { n: 43, list: "W", path: r`C:\Up\nul.txt`, expect: "DEVICE" },
  { n: 44, list: "W", path: r`C:\Up\COM1`, expect: "DEVICE" },
  { n: 45, list: "W", path: r`C:\Up\a.txt.`, expect: "DOTSPACE" },
  { n: 46, list: "W", path: r`C:\Up\sub \a.txt`, expect: "DOTSPACE" },
  { n: 47, list: "W", path: r`C:\Up\...\a.txt`, expect: "DOTSPACE" },
  { n: 48, list: "W", path: r` C:\Up\a.txt`, expect: "PAD" },
  { n: 49, list: "W", path: "C:\\Up\\" + LONG_NAME, expect: "LONG" },
  { n: 50, list: [...W, r`C:\Uk`], path: "C:\\U\u212A\\a.txt", expect: "OUTSIDE" },
  { n: 51, list: [...W, r`C:\üp`], path: r`C:\ÜP\a.txt`, expect: "OUTSIDE" },
  { n: 52, list: "W", path: "file:///C:/Up/a.txt", expect: "RELATIVE" },
  { n: 53, list: "P", path: "/home/u/Up/a.txt", expect: "ALLOW" },
  { n: 54, list: "P", path: "/home/u/Up/sub/a.txt", expect: "ALLOW" },
  { n: 55, list: "P", path: "/srv/drop/x", expect: "ALLOW" },
  { n: 56, list: "P", path: "/home/u/up/a.txt", expect: "OUTSIDE" },
  { n: 57, list: "P", path: "/home/u/UP/a.txt", expect: "OUTSIDE" },
  { n: 58, list: "P", path: "/home/u/Uploads/a.txt", expect: "OUTSIDE" },
  { n: 59, list: "P", path: "/home/u/Up", expect: "OUTSIDE" },
  { n: 60, list: "P", path: "/home/u/Up/../.ssh/id_ed25519", expect: "DOTSEG" },
  { n: 61, list: "P", path: "/home/u/Up/./a", expect: "DOTSEG" },
  { n: 62, list: "P", path: "/home/u/Up//a", expect: "EMPTYSEG" },
  { n: 63, list: "P", path: "home/u/Up/a", expect: "RELATIVE" },
  { n: 64, list: "P", path: "~/Up/a", expect: "RELATIVE" },
  { n: 65, list: "P", path: "/home/u/Up/a\u0000", expect: "CTRL" },
  // Row 66: the table's DOTSEG by normalisation; #249 refuses any `\` in a POSIX path (see the header note).
  { n: 66, list: "P", path: r`/home/u/Up/..\x`, expect: "BACKSLASH" },
  { n: 67, list: "P", path: "/home/u/Up/a:b.txt", expect: "ALLOW" },
  { n: 68, list: "W+P", path: r`C:\Up\a.txt`, expect: "ALLOW" },
  { n: 69, list: "W+P", path: "/home/u/Up/a.txt", expect: "ALLOW" },
  { n: 70, list: "W+P", path: "/C:/Up/a.txt", expect: "OUTSIDE" },
  { n: 71, list: [], path: r`C:\Up\a.txt`, expect: "OUTSIDE" },
  { n: 72, list: [r`C:\ `.trimEnd()], path: r`C:\Up\a.txt`, expect: "OUTSIDE" },
  { n: 73, list: ["/"], path: "/etc/passwd", expect: "OUTSIDE" },
  { n: 74, list: ["Up"], path: r`C:\Up\a.txt`, expect: "OUTSIDE" },

  // Stage 0 verifier M1 (#249): a file named `Up\x` in /home/u is outside /home/u/Up; never normalised.
  { n: "M1", list: "P", path: r`/home/u/Up\x`, expect: "BACKSLASH" },
  { n: "M1b", list: "P", path: r`/home/u/Up/sub\a.txt`, expect: "BACKSLASH" },
  // Stage 0 verifier N2: folder lines with `/` separators, `..`, a UNC or `\\?\` prefix.
  { n: "N2a", list: ["C:/Up"], path: r`C:\Up\a.txt`, expect: "ALLOW" },
  { n: "N2b", list: [r`C:\Up\..\X`], path: r`C:\X\a.txt`, expect: "OUTSIDE" },
  { n: "N2c", list: [r`C:\Up\..\X`], path: r`C:\Up\a.txt`, expect: "OUTSIDE" },
  { n: "N2d", list: [r`\\srv\s`], path: r`\\srv\s\a.txt`, expect: "UNC" },
  { n: "N2e", list: [r`\\?\C:\Up`], path: r`C:\Up\a.txt`, expect: "OUTSIDE" },
  { n: "N2f", list: ["/home/u/../u/Up"], path: "/home/u/Up/a.txt", expect: "OUTSIDE" },

  // #249's added classes, and the S2 builder's (design-local; Proposed decisions in S2-builder.md).
  { n: "X1", list: "W", path: r`C:\Up\a.txt `, expect: "PAD" },
  { n: "X2", list: "W", path: "C:\\Up\\a.txt\u00A0", expect: "PAD" },
  { n: "X3", list: "W", path: "C:\\Up\\a\u007F.txt", expect: "CTRL" },
  { n: "X4", list: "W", path: "C:\\Up\\a\u0085.txt", expect: "CTRL" },
  { n: "X5", list: "W", path: r`C:\Up\LPT9.log`, expect: "DEVICE" },
  { n: "X6", list: "W", path: r`C:\Up\aux .txt`, expect: "DEVICE" },
  { n: "X7", list: "W", path: r`C:\Up\CONIN$`, expect: "DEVICE" },
  { n: "X8", list: "W", path: r`C:\Up\COM¹`, expect: "DEVICE" },
  { n: "X9", list: "W", path: r`C:\Up\con\a.txt`, expect: "DEVICE" },
  { n: "X10", list: "W", path: r`C:\Up\console.txt`, expect: "ALLOW" },
  { n: "X11", list: "W", path: r`C:\Up\a?.txt`, expect: "BADCHAR" },
  { n: "X12", list: "W", path: r`C:\Up\a*.txt`, expect: "BADCHAR" },
  { n: "X13", list: "W", path: r`C:\Up\a<b>.txt`, expect: "BADCHAR" },
  { n: "X14", list: "W", path: r`C:\Up\a|b.txt`, expect: "BADCHAR" },
  { n: "X15", list: "W", path: r`C:\Up\a"b.txt`, expect: "BADCHAR" },
  { n: "X16", list: "W", path: "//?/C:/Up/a.txt", expect: "PREFIX" },
  { n: "X17", list: "W", path: "//./C:/Up/a.txt", expect: "PREFIX" },
  { n: "X18", list: "W", path: "C:\\Up\\" + "a".repeat(UPLOAD_MAX_PATH_CHARS - 6), expect: "ALLOW" },
  { n: "X19", list: "W", path: "C:\\Up\\" + "a".repeat(UPLOAD_MAX_PATH_CHARS - 5), expect: "LONG" },
  { n: "X20", list: "W", path: r`C:\ `.trimEnd(), expect: "TRAILSEP" },
  { n: "X21", list: "P", path: "/", expect: "TRAILSEP" },
  { n: "X22", list: "P", path: "/srv/drop", expect: "OUTSIDE" },
  { n: "X23", list: "P", path: "/srv/drop/", expect: "TRAILSEP" },
  { n: "X24", list: "P", path: "/srv/drop/a.txt/", expect: "TRAILSEP" },
  { n: "X25", list: "P", path: "/home/u/Up/../Up/a.txt", expect: "DOTSEG" },
  { n: "X26", list: "W", path: "C:\\Up\\a\u2028.txt", expect: "ALLOW" },
  { n: "X27", list: "W", path: r`1:\Up\a.txt`, expect: "RELATIVE" },
  { n: "X28", list: "W", path: r`CC:\Up\a.txt`, expect: "RELATIVE" },
  { n: "X29", list: "P", path: "/home/u/Up/.hidden", expect: "ALLOW" },
  { n: "X30", list: "P", path: "/home/u/Up/a. ", expect: "PAD" },
  { n: "X31", list: "P", path: "/home/u/Up/a.", expect: "ALLOW" },
  { n: "X32", list: "W", path: r`C:\Up\.hidden`, expect: "ALLOW" },
  { n: "X33", list: "W", path: r`c:\Up\a.txt`, expect: "ALLOW" },
  { n: "X34", list: "W", path: r`C:\Up` + "\u0130" + r`\a.txt`, expect: "OUTSIDE" },
];

function listOf(row: Row): string[] {
  if (Array.isArray(row.list)) return row.list;
  if (row.list === "W") return W;
  if (row.list === "P") return P;
  return [...W, ...P];
}

const SHAPE_CLASSES = new Set([
  "RELATIVE", "DOTSEG", "UNC", "PREFIX", "ADS", "CTRL", "EMPTY", "EMPTYSEG", "TRAILSEP", "DEVICE", "DOTSPACE", "PAD",
  "LONG", "BACKSLASH", "BADCHAR",
]);

describe("S2.1 — the matcher's case table (stage0-matcher-cases.txt rows 1–74, M1, N2, #249's classes)", () => {
  it("the table holds every stage0 row, at least 40 rows, and both Windows and POSIX cases", () => {
    const numbered = ROWS.filter((x) => typeof x.n === "number").map((x) => x.n);
    expect(numbered).toEqual(Array.from({ length: 74 }, (_, i) => i + 1));
    expect(ROWS.length).toBeGreaterThanOrEqual(40);
    expect(ROWS.some((x) => x.path.startsWith("/"))).toBe(true);
    expect(ROWS.some((x) => /^[A-Za-z]:/.test(x.path))).toBe(true);
    // Every refusal class of phase doc 0.4 and #249 has at least one row.
    for (const c of [...SHAPE_CLASSES, "OUTSIDE"]) expect(ROWS.some((x) => x.expect === c), c).toBe(true);
  });

  for (const row of ROWS) {
    const label = `row ${row.n}: ${JSON.stringify(row.path.length > 60 ? row.path.slice(0, 40) + "…" : row.path)} → ${row.expect}`;
    it(label, () => {
      const folders = parseUploadFolders(listOf(row).join("\n"));
      const allowed = uploadPathAllowed(row.path, folders);
      expect(allowed).toBe(row.expect === "ALLOW");
      const cls = uploadPathRefusalClass(row.path);
      if (SHAPE_CLASSES.has(row.expect)) expect(cls).toBe(row.expect);
      else expect(cls).toBeNull();
    });
  }
});

describe("S2.1 — folder lines", () => {
  it("a folder line is valid only as an absolute, well-formed, non-root folder; one trailing separator is allowed", () => {
    for (const ok of [r`C:\Up`, "C:/Up", r`D:\Data\Shared\ `.trimEnd(), "/home/u/Up", "/srv/drop/", r`c:\up`]) {
      expect(parseUploadFolderLine(ok).kind, ok).toBe("valid");
    }
    for (const bad of [
      r`C:\ `.trimEnd(), "C:/", "C:", "/", "Up", r`C:Up`, r`\Up`, r`C:\Up\..\X`, r`C:\Up\.`, r`\\srv\s`, r`\\?\C:\Up`,
      r`\\.\C:\Up`, "//srv/s", r`C:\Up\\`, r`C:\Up\\X`, "/home/u//Up", r`/home/u\Up`, r`C:\CON`, r`C:\Up.`,
      " C:\\Up", "C:\\Up ", "/home/u/Up\t", "C:\\U\u0000p", r`C:\Up:x`, r`C:\U?p`, "~/Up", "file:///C:/Up",
      "/" + "a".repeat(UPLOAD_MAX_PATH_CHARS),
    ]) {
      expect(parseUploadFolderLine(bad).kind, JSON.stringify(bad)).toBe("invalid");
    }
    for (const ignored of ["", "   ", "# C:\\Up", "#comment"]) expect(parseUploadFolderLine(ignored).kind).toBe("ignored");
  });

  it("S2 verifier MINOR 1 (#249): a POSIX folder line ending in `\\` is refused, never normalised", () => {
    for (const bad of ["/home/u/Up\\", "/srv/drop\\", "/\\"]) {
      expect(parseUploadFolderLine(bad).kind, JSON.stringify(bad)).toBe("invalid");
    }
    for (const ok of ["D:\\Data\\Shared\\", "C:/Up/", "C:\\Up/", "/srv/drop/", "/home/u/Up/"]) {
      expect(parseUploadFolderLine(ok).kind, ok).toBe("valid");
    }
    const f = parseUploadFolders("/home/u/Up\\");
    expect(f.count).toBe(0);
    expect(uploadPathAllowed("/home/u/Up/x", f)).toBe(false);
  });

  it("parseUploadFolders splits CRLF, CR and LF, keeps every line in order, and counts the valid folders only", () => {
    const f = parseUploadFolders(["C:\\Up", "Up", "# c", "/srv/drop/", "", "C:\\"].join("\r\n").replace("\r\n/srv", "\r/srv"));
    expect(f.lines.map((l) => l.kind)).toEqual(["valid", "invalid", "ignored", "valid", "ignored", "invalid"]);
    expect(f.count).toBe(2);
    expect(f.folders).toHaveLength(2);
  });

  it("the empty list: nothing is allowed", () => {
    expect(EMPTY_UPLOAD_FOLDERS.count).toBe(0);
    expect(uploadPathAllowed(r`C:\Up\a.txt`, EMPTY_UPLOAD_FOLDERS)).toBe(false);
    expect(uploadPathAllowed("/home/u/Up/a.txt", parseUploadFolders(""))).toBe(false);
    expect(Object.isFrozen(EMPTY_UPLOAD_FOLDERS)).toBe(true);
  });

  it("a Windows path is matched only against Windows folders, a POSIX path only against POSIX folders", () => {
    // `/C/Up/a` is POSIX-shaped; no Windows folder holds it, whatever the letters.
    expect(uploadPathAllowed("/C/Up/a.txt", parseUploadFolders(r`C:\Up`))).toBe(false);
    expect(uploadPathAllowed(r`C:\home\u\Up\a`, parseUploadFolders("/home/u/Up"))).toBe(false);
  });
});

describe("S2.1 — paths as the gate receives them (fails closed on every malformed input, #249)", () => {
  const folders = parseUploadFolders([r`C:\Up`, "/home/u/Up"].join("\n"));
  const ok1 = r`C:\Up\a.txt`;
  const ok2 = "/home/u/Up/b.txt";

  it("a non-string path is never allowed", () => {
    for (const v of [undefined, null, 1, true, {}, [ok1], { toString: () => ok1 }, new String(ok1)]) {
      expect(uploadPathAllowed(v, folders)).toBe(false);
      expect(uploadPathRefusalClass(v)).toBe("NOTSTRING");
    }
  });

  it("uploadPathsAllowed: an array of 1–20 strings, each allowed", () => {
    expect(UPLOAD_MAX_PATHS).toBe(20);
    expect(uploadPathsAllowed([ok1], folders)).toBe(true);
    expect(uploadPathsAllowed([ok1, ok2], folders)).toBe(true);
    expect(uploadPathsAllowed(Array(20).fill(ok1), folders)).toBe(true);
  });

  it("uploadPathsAllowed refuses: not an array, empty, more than 20, a non-string entry, one path outside, a hole", () => {
    expect(uploadPathsAllowed(undefined, folders)).toBe(false);
    expect(uploadPathsAllowed(null, folders)).toBe(false);
    expect(uploadPathsAllowed(ok1, folders)).toBe(false);
    expect(uploadPathsAllowed({ 0: ok1, length: 1 }, folders)).toBe(false);
    expect(uploadPathsAllowed([], folders)).toBe(false);
    expect(uploadPathsAllowed(Array(21).fill(ok1), folders)).toBe(false);
    expect(uploadPathsAllowed([ok1, 5], folders)).toBe(false);
    expect(uploadPathsAllowed([ok1, null], folders)).toBe(false);
    expect(uploadPathsAllowed([ok1, r`C:\Uploads\x`], folders)).toBe(false);
    expect(uploadPathsAllowed([r`C:\Uploads\x`, ok1], folders)).toBe(false);
    // eslint-disable-next-line no-sparse-arrays
    expect(uploadPathsAllowed([ok1, , ok2], folders)).toBe(false);
    expect(uploadPathsAllowed([ok1], EMPTY_UPLOAD_FOLDERS)).toBe(false);
  });

  it("a folder list that is not a parsed list (undefined) allows nothing", () => {
    expect(uploadPathsAllowed([ok1], undefined)).toBe(false);
    expect(uploadPathAllowed(ok1, undefined)).toBe(false);
  });
});

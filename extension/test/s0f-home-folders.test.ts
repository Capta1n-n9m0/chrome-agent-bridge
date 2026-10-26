/**
 * Step 11b S0F-a — a home folder, or a folder that holds home folders, is refused as an Upload folder (phase doc
 * `docs/plans/2026-10-26-step11b-block-list-redirects.md` 0.11; decisions.md #288 item 3b, #296; the case table is
 * Stage 0's draft, `…-steps/stage0-audit.md` §5). One shared pure predicate (`isHomeFolder`, applied in
 * `parseUploadFolderLine`) serves both callers, and this one table is run through both:
 * - the options page's model (`analyzeUploadFolders`): the line is invalid, with its own reason naming no path;
 * - the gate's matcher (`parseUploadFolders` + `uploadPathAllowed`, and the stored key through `SafetyStore`): a
 *   home line is never used, even when it is already in storage (fails closed).
 * Written before the predicate. Fixture-like paths only.
 */
import { describe, it, expect } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { UPLOAD_HOME_REASON, UPLOAD_SSH_WARNING, analyzeUploadFolders } from "../src/options-model.js";
import { isHomeFolder, parseUploadFolderLine, parseUploadFolders, uploadPathAllowed } from "../src/upload-paths.js";
import { SafetyStore } from "../src/safety-state.js";
import { uploadRefusal } from "../src/safety.js";

const r = String.raw;

/** Refused as a home folder or a folder that holds home folders. */
const HOME = [
  r`C:\Users`, "C:\\Users\\", r`c:\users`, "C:/Users", "C:\\USERS\\", r`D:\Users`,
  r`C:\Users\fixture-home`, "C:\\Users\\fixture-home\\", "c:/users/FIXTURE-HOME", r`C:\Users\Public`, r`C:\Users\Default`,
  r`C:\Documents and Settings`, r`C:\Documents and Settings\fixture-home`, r`C:\DOCUME~1`, r`C:\DOCUME~1\fixture-home`,
  r`c:\docume~2`,
  "/home", "/home/", "/home/fixture-home", "/home/fixture-home/", "/HOME/fixture-home",
  "/Users", "/Users/fixture-home", "/users/fixture-home", "/USERS",
  "/root", "/root/", "/ROOT", "/var/root", "/private/var/root",
  "/System/Volumes/Data/Users", "/System/Volumes/Data/Users/fixture-home", "/var/home", "/var/home/fixture-home",
];

/** Valid and used, no warning. */
const ALLOWED = [
  r`C:\Uſers\fixture-home`, r`C:\Users\fixture-home\Uploads`, r`C:\Users\fixture-home\Documents\share`,
  r`C:\Users\fixture-home\AppData`, r`C:\Users.old`, r`C:\Data\Users`, r`C:\DOCUME~X`, r`C:\DOCUME~1x`,
  "/home/fixture-home/uploads", "/root/uploads", "/Users/fixture-home/Shared", "/var/root/uploads",
  "/srv/drop", "/homework", "/home2/fixture-home", "/rooted", "/var/homes/fixture-home", "/private/var/home",
];

/** Valid and used, with the `.ssh` warning (0.11: it stays a warning). */
const SSH = [r`C:\Users\fixture-home\.ssh`, "/home/fixture-home/.ssh"];

/** Invalid for another reason, as before. */
const OTHER_INVALID = ["C:\\", "C:", r`\\server\share\Users\fixture-home`, r`\\?\C:\Users\fixture-home`, "/"];

/** A file directly inside the line's folder. */
function fileIn(line: string): string {
  const win = /^[A-Za-z]:/.test(line);
  const body = line.endsWith("/") || (win && line.endsWith("\\")) ? line.slice(0, -1) : line;
  return `${body}${win && !body.includes("/") ? "\\" : "/"}fixture-file.bin`;
}

describe("S0F-a — the home predicate (parseUploadFolderLine / isHomeFolder)", () => {
  it("every home line is invalid and marked home; never a folder", () => {
    for (const line of HOME) {
      const l = parseUploadFolderLine(line);
      expect(l, line).toEqual({ kind: "invalid", text: line, home: true });
    }
  });

  it("allowed and .ssh lines are valid and not home; other invalid lines are not marked home", () => {
    for (const line of [...ALLOWED, ...SSH]) {
      const l = parseUploadFolderLine(line);
      expect(l.kind, line).toBe("valid");
      if (l.kind === "valid") expect(isHomeFolder(l.folder), line).toBe(false);
    }
    for (const line of OTHER_INVALID) expect(parseUploadFolderLine(line), line).toEqual({ kind: "invalid", text: line });
  });
});

describe("S0F-a — caller 1, the options page: a home line is invalid with its own reason", () => {
  it("each home line: invalid, the home reason, not counted as a folder, no warning", () => {
    for (const line of HOME) {
      const a = analyzeUploadFolders(line);
      expect(a.folderCount, line).toBe(0);
      expect(a.invalid, line).toEqual([{ line: 1, text: line, status: "invalid", reason: UPLOAD_HOME_REASON }]);
      expect(a.warned, line).toEqual([]);
      expect(a.summary, line).toBe("No upload folder: every upload is refused. 1 invalid line is not used (marked below).");
    }
  });

  it("allowed lines are valid with no warning; .ssh lines keep their warning; other invalid lines keep their reason", () => {
    for (const line of ALLOWED) {
      const a = analyzeUploadFolders(line);
      expect(a.folderCount, line).toBe(1);
      expect(a.lines, line).toEqual([{ line: 1, text: line, status: "valid" }]);
    }
    for (const line of SSH) {
      expect(analyzeUploadFolders(line).warned, line).toEqual([{ line: 1, text: line, status: "valid", warning: UPLOAD_SSH_WARNING }]);
    }
    for (const line of OTHER_INVALID) {
      const a = analyzeUploadFolders(line);
      expect(a.invalid[0]?.reason, line).not.toBe(UPLOAD_HOME_REASON);
    }
  });

  it("the home reason names no path", () => {
    expect(UPLOAD_HOME_REASON).toBe(
      "a home folder, or a folder that holds home folders, is never allowed: every file in it (keys, tokens, documents) could be uploaded. Allow a folder inside it instead",
    );
    expect(UPLOAD_HOME_REASON).not.toMatch(/[\\/]/);
  });
});

describe("S0F-a — caller 2, the gate's matcher: a home line is never used, also from storage", () => {
  it("a file inside a home line is refused; inside an allowed line it is allowed", () => {
    for (const line of HOME) expect(uploadPathAllowed(fileIn(line), parseUploadFolders(line)), line).toBe(false);
    for (const line of [...ALLOWED, ...SSH]) expect(uploadPathAllowed(fileIn(line), parseUploadFolders(line)), line).toBe(true);
  });

  it("a deeper file under a refused home is refused too (no line is used); beside an allowed line only that line counts", () => {
    const f = parseUploadFolders([r`C:\Users\fixture-home`, "/home/fixture-home", r`D:\Drop`].join("\n"));
    expect(f.count).toBe(1);
    expect(uploadPathAllowed(r`C:\Users\fixture-home\Uploads\a.bin`, f)).toBe(false);
    expect(uploadPathAllowed("/home/fixture-home/uploads/a.bin", f)).toBe(false);
    expect(uploadPathAllowed(r`D:\Drop\a.bin`, f)).toBe(true);
  });

  it("a home line already in storage.local: the store hands the gate no folder for it, and uploadRefusal refuses", async () => {
    const stored: Record<string, unknown> = {};
    const s = new SafetyStore({ get: async () => ({ ...stored }), set: async () => {}, extensionId: "abcdefghijklmnopabcdefghijklmnop", now: () => 0 });
    for (const line of HOME) {
      stored["safety.uploadFolders"] = line;
      const v = await s.read();
      expect(v.ctx.uploadFolders?.count, line).toBe(0);
      expect(uploadRefusal({ tabId: 7, ref: "e1", paths: [fileIn(line)] }, v.ctx)?.code, line).toBe(ErrorCodes.UPLOAD_REFUSED);
    }
    stored["safety.uploadFolders"] = r`C:\Users\fixture-home\Uploads`;
    expect(uploadRefusal({ paths: [r`C:\Users\fixture-home\Uploads\a.bin`] }, (await s.read()).ctx)).toBeNull();
  });
});

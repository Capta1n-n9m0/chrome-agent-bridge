/**
 * Step 11 S3 — S3.4's model half (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.4; decisions.md #250,
 * #257): the "Upload folders" box's analysis (`analyzeUploadFolders`, over S2's own parser): a root and a relative
 * line refused and marked by line number with a reason; a home folder, a folder holding homes and a `.ssh` folder
 * warned, never refused; the standing warning names the home folder, `bridge.token` and `.ssh`; the page glue
 * (`options.ts`) and `options.html` agree on the box's element ids. Reserved, fixture-like paths only.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  UPLOAD_FOLDERS_WARNING,
  UPLOAD_HOME_WARNING,
  UPLOAD_INVALID_REASON,
  UPLOAD_PAD_REASON,
  UPLOAD_RELATIVE_REASON,
  UPLOAD_ROOT_REASON,
  UPLOAD_SSH_WARNING,
  analyzeUploadFolders,
  writeFailedMessage,
} from "../src/options-model.js";
import { parseUploadFolders } from "../src/upload-paths.js";

const lines = (...l: string[]) => l.join("\n");

describe("analyzeUploadFolders — invalid lines marked with a reason (#257); validity is S2's parser", () => {
  it("empty: no folder, every upload refused", () => {
    const a = analyzeUploadFolders("");
    expect(a.folderCount).toBe(0);
    expect(a.summary).toBe("No upload folder: every upload is refused.");
    expect(a.invalid).toEqual([]);
  });

  it("a filesystem root is refused, in every spelling", () => {
    for (const root of ["C:\\", "C:/", "c:", "/", "//"]) {
      const a = analyzeUploadFolders(root);
      expect(a.folderCount, root).toBe(0);
      expect(a.invalid, root).toEqual([{ line: 1, text: root, status: "invalid", reason: UPLOAD_ROOT_REASON }]);
    }
  });

  it("a relative line, a padded line and another malformed line, each with its reason, by 1-based line number", () => {
    const text = lines(String.raw`D:\Shared\Drop`, "# a comment", "", String.raw`Drop\Files`, " /srv/drop", String.raw`\\server\share`, "/srv/up/");
    const a = analyzeUploadFolders(text);
    expect(a.lines.map((l) => l.status)).toEqual(["valid", "ignored", "ignored", "invalid", "invalid", "invalid", "valid"]);
    expect(a.invalid.map((l) => [l.line, l.reason])).toEqual([
      [4, UPLOAD_RELATIVE_REASON],
      [5, UPLOAD_PAD_REASON],
      [6, UPLOAD_INVALID_REASON],
    ]);
    expect(a.folderCount).toBe(2);
    expect(a.summary).toBe("2 upload folders. 3 invalid lines are not used (marked below).");
    // never a second grammar: the count is S2's parser's
    expect(a.folderCount).toBe(parseUploadFolders(text).count);
  });

  it("one folder, one invalid line: singular wording", () => {
    expect(analyzeUploadFolders(lines("/srv/drop", "drop")).summary).toBe("1 upload folder. 1 invalid line is not used (marked below).");
  });
});

describe("analyzeUploadFolders — the broad-folder warnings (#250): warned, never refused", () => {
  it("a home folder, a folder that holds homes, and /root are warned", () => {
    for (const f of [String.raw`C:\Users\Wave`, String.raw`C:\Users`, "d:\\users\\wave\\", "/home/wave", "/home", "/Users/wave", "/root"]) {
      const a = analyzeUploadFolders(f);
      expect(a.folderCount, f).toBe(1);
      expect(a.warned, f).toEqual([{ line: 1, text: f, status: "valid", warning: UPLOAD_HOME_WARNING }]);
    }
  });

  it("a .ssh folder or a folder inside one is warned as holding private keys", () => {
    for (const f of [String.raw`C:\Users\Wave\.ssh`, String.raw`C:\Users\Wave\.SSH\keys`, "/home/wave/.ssh"]) {
      expect(analyzeUploadFolders(f).warned[0]?.warning, f).toBe(UPLOAD_SSH_WARNING);
    }
  });

  it("a narrow folder is not warned (inside a home included)", () => {
    for (const f of [String.raw`C:\Users\Wave\Uploads`, "/home/wave/drop", String.raw`D:\Shared\Drop`, "/srv/drop", "/root2"]) {
      expect(analyzeUploadFolders(f).warned, f).toEqual([]);
    }
  });

  it("the standing warning names the home folder, bridge.token and .ssh, and the shell limit", () => {
    expect(UPLOAD_FOLDERS_WARNING).toBe(
      "An agent may upload any file inside these folders to any site it can open. Allow only folders that hold files you mean to share. Never allow your home folder, or any folder that holds bridge.token or a .ssh folder. An agent that can also run programs on this computer can put any file into an allowed folder.",
    );
  });

  it("a failed save names the box and keeps the text", () => {
    expect(writeFailedMessage("uploadFolders")).toBe("Could not save the upload folders (storage write failed). Your text is kept; try Save again.");
  });
});

describe("the options page's Upload folders box: options.ts and options.html agree", () => {
  const html = readFileSync(fileURLToPath(new URL("../options.html", import.meta.url)), "utf8");
  const ts = readFileSync(fileURLToPath(new URL("../src/options.ts", import.meta.url)), "utf8");

  it("every id options.ts looks up exists in options.html, the upload box's included", () => {
    const ids = [...ts.matchAll(/getElementById\("([\w-]+)"\)/g)].map((m) => m[1]!);
    for (const id of ["uploadfolders", "save-uploadfolders", "uploadfolders-warning", "uploadfolders-invalid", "uploadfolders-warned", "uploadfolders-summary"]) {
      expect(ids).toContain(id);
    }
    for (const id of ids) expect(html, id).toContain(`id="${id}"`);
  });

  it("the box is saved through writeSafety with { uploadFolders: text } and analysed by the model", () => {
    expect(ts).toMatch(/save\("uploadFolders", \{ uploadFolders: text \}, foldersErrorEl\)/);
    expect(ts).toMatch(/analyzeUploadFolders\(foldersEl\.value\)/);
    expect(ts).not.toMatch(/console\./);
  });
});

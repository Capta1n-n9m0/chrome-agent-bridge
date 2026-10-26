// Tests for recipes/s11b-rules.ts section H2a: table K17 of docs/e2e-test-plan.md 4.24, each text tied to the product
// constant it names. A mismatch here is a STOP before liveA (the sheet says so), never an edit of either side.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BLOCKED_TAB_MESSAGE,
  BLOCKED_URL_MESSAGE,
  DISARMED_ALL_MESSAGE,
  FILE_PAGE_MESSAGE,
  FILE_URL_MESSAGE,
  OWN_PAGE_MESSAGE,
  UPLOAD_REFUSED_MESSAGE,
} from "../../extension/src/safety.js";
import { UPLOAD_TARGET_REQUIRED_MESSAGE } from "../../extension/src/handlers/upload.js";
import { describeDebuggerError } from "../../extension/src/debugger-errors.js";
import { primitiveSaveText, STRINGIFY_FAILED_MESSAGE } from "../../extension/src/evaluate/save.js";
import { toWireError } from "../../extension/src/errors.js";
import { uploadProbeRefusal } from "../../extension/src/upload-exists.js";
import {
  UPLOAD_FOLDERS_WARNING,
  UPLOAD_HOME_REASON,
  UPLOAD_RELATIVE_REASON,
  UPLOAD_ROOT_REASON,
  analyzeUploadFolders,
  blockListLongHostWarning,
  blockListRuleWarnings,
} from "../../extension/src/options-model.js";
import { prepareUpload } from "../../sdk/src/upload.js";
import { H119, H120, H121, K17, K17_TEXT, k17Caps, k17NewtabLate, k17OptItem, k17OptSum, k17RawDir, k17RawMissing, longHost } from "../s11b-rules.js";

const src = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("K17 texts equal the product constants", () => {
  it("the DOMAIN_BLOCKED, DISARMED, UPLOAD_REFUSED and BAD_PARAMS texts", () => {
    expect(K17["K-url"].message).toBe(BLOCKED_URL_MESSAGE);
    expect(K17["K-tab"].message).toBe(BLOCKED_TAB_MESSAGE);
    expect(K17["K-own"].message).toBe(OWN_PAGE_MESSAGE);
    expect(K17["K-filepage"].message).toBe(FILE_PAGE_MESSAGE);
    expect(K17["K-fileurl"].message).toBe(FILE_URL_MESSAGE);
    expect(K17["K-disarmed"].message).toBe(DISARMED_ALL_MESSAGE);
    expect(K17["K-disarmed"].data).toEqual({ scope: "all" });
    expect(K17["K-gate"].message).toBe(UPLOAD_REFUSED_MESSAGE);
    expect(K17["K-notarget"].message).toBe(UPLOAD_TARGET_REQUIRED_MESSAGE);
    for (const k of ["K-url", "K-tab", "K-own", "K-filepage", "K-fileurl"] as const) expect(K17[k].code).toBe("DOMAIN_BLOCKED");
  });
  it("K-devt is describeDebuggerError's text", () => {
    const d = describeDebuggerError(new Error("Another debugger is already attached to the tab with id: 1."));
    expect({ code: d.code, message: d.message }).toEqual({ code: K17["K-devt"].code, message: K17["K-devt"].message });
  });
  it("K-undef, K-cycle by the product; K-node and K-map by its source table", () => {
    expect(() => primitiveSaveText({ type: "undefined" })).toThrow(K17["K-undef"].message);
    expect(K17["K-cycle"].message).toBe(STRINGIFY_FAILED_MESSAGE);
    const save = src("../../extension/src/evaluate/save.ts");
    expect(save).toContain(`node: "${K17["K-node"].message}"`);
    expect(save).toContain(`map: "${K17["K-map"].message}"`);
  });
  it("K-missing and K-relative are the SDK preflight's refusals", async () => {
    await expect(prepareUpload(["C:\\nonexistent-s11b\\missing.bin"])).rejects.toThrow(K17["K-missing"].message.replace("paths[0]", "paths[0]"));
    await expect(prepareUpload(["s11-1k.bin"])).rejects.toThrow(K17["K-relative"].message);
    for (const k of ["K-missing", "K-relative"] as const) expect(K17[k].code).toBe("BAD_PARAMS");
  });
  it("K-raw-missing and K-raw-dir are uploadProbeRefusal's texts for any index", () => {
    for (const i of [0, 1, 7]) {
      expect(k17RawMissing(i).message).toBe(uploadProbeRefusal(i, "missing").message);
      expect(k17RawDir(i).message).toBe(uploadProbeRefusal(i, "folder").message);
      expect(uploadProbeRefusal(i, "missing").code).toBe(k17RawMissing(i).code);
    }
    expect(k17RawMissing(1).message).toContain("paths[1]");
  });
  it("K-fetch is a plain Error mapped to INTERNAL; K-newtab-late is waitForLoad's template", () => {
    const w = toWireError(new Error(K17["K-fetch"].message));
    expect({ code: w.code, message: w.message }).toEqual({ code: "INTERNAL", message: "Failed to fetch" });
    expect(src("../../extension/src/tabs.ts")).toContain("`Timed out waiting for tab ${tabId} to load`");
    expect(k17NewtabLate(42)).toBe("Timed out waiting for tab 42 to load");
  });
});

describe("K17 options texts", () => {
  it("K-opt-stand, K-opt-home, K-opt-root and K-opt-rel equal options-model", () => {
    expect(K17_TEXT["K-opt-stand"]).toBe(UPLOAD_FOLDERS_WARNING);
    expect(K17_TEXT["K-opt-home"]).toBe(UPLOAD_HOME_REASON);
    expect(K17_TEXT["K-opt-root"]).toBe(UPLOAD_ROOT_REASON);
    expect(K17_TEXT["K-opt-rel"]).toBe(UPLOAD_RELATIVE_REASON);
  });
  it("K-opt-sum equals analyzeUploadFolders' summary for every singular and plural case", () => {
    const home = "C:\\Users\\fixture-home";
    const cases: Array<[string, number, number]> = [
      ["", 0, 0],
      ["C:\\w\\a", 1, 0],
      ["C:\\w\\a\nC:\\w\\b", 2, 0],
      [`C:\\w\\a\n${home}`, 1, 1],
      [`C:\\w\\a\n${home}\n/root\nrelative\\x`, 1, 3],
      [`${home}`, 0, 1],
    ];
    for (const [text, valid, invalid] of cases) {
      const a = analyzeUploadFolders(text);
      expect([a.folderCount, a.invalidCount]).toEqual([valid, invalid]);
      expect(k17OptSum(valid, invalid)).toBe(a.summary);
    }
  });
  it("K-opt-item has the options page's template, and K-opt-home is what a home line gets", () => {
    expect(src("../../extension/src/options.ts")).toContain("`Line ${l.line}: “${l.text}” — ${l.reason}`");
    const a = analyzeUploadFolders("C:\\w\\a\nC:\\Users\\fixture-home\nrelative\\x");
    expect(a.invalid.map((l) => k17OptItem(l.line, l.text, l.reason!))).toEqual([
      k17OptItem(2, "C:\\Users\\fixture-home", K17_TEXT["K-opt-home"]),
      k17OptItem(3, "relative\\x", K17_TEXT["K-opt-rel"]),
    ]);
  });
});

describe("K-caps and the long-host fixtures", () => {
  it("the hosts have the sheet's regex lengths (119, 120, 121)", () => {
    expect([H119, H120, H121].map((h) => 47 + h.replace(":8085", "").length)).toEqual([119, 120, 121]);
    expect(longHost(22)).toBe(H119);
    expect(H119.endsWith(":8085")).toBe(true);
  });
  it("k17Caps equals blockListLongHostWarning", () => {
    expect(k17Caps([2])).toBe(blockListLongHostWarning([2]));
    expect(k17Caps([2, 3])).toBe(blockListLongHostWarning([2, 3]));
    expect(k17Caps([5])).toBe("Line 5: a very long site name with a port or *. may make a rule Chrome rejects; while it is saved, agent navigations and downloads may be refused.");
  });
  it("blockListRuleWarnings on H119, H120, H121 gives none, `Line 2`, `Lines 2, 3` (the sheet's pre-computed items)", () => {
    expect(blockListRuleWarnings(H119)).toEqual([]);
    expect(blockListRuleWarnings(`${H119}\n${H120}`)).toEqual([k17Caps([2])]);
    expect(blockListRuleWarnings(`${H119}\n${H120}\n${H121}`)).toEqual([k17Caps([2, 3])]);
  });
});

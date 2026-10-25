import { describe, it, expect, expectTypeOf } from "vitest";
import {
  UPLOAD_FILES_MAX_PATHS,
  isUploadFilesParams,
  type ActionTarget,
  type UploadFilesParams,
  type UploadFilesResult,
} from "../src/protocol.js";

/**
 * Step 11 S2 — `uploadFiles`'s wire types and guard (phase doc 0.6; spec §10's Step 11 note; decisions.md ·
 * 2026-10-25 · Step 11: the wire method `uploadFiles`, no visibility lock, no focus (#238)). The guard is a shape
 * check for the handler (S3); the safety gate tests `paths` on its own and fails closed (#249).
 */

describe("uploadFiles: the types", () => {
  it("params are an action target plus 1–20 paths; the result is a count with the cap flag", () => {
    expectTypeOf<UploadFilesParams>().toMatchTypeOf<ActionTarget & { paths: string[] }>();
    expectTypeOf<UploadFilesResult>().toEqualTypeOf<{ files: number; pastSnapshotCap?: true }>();
    expect(UPLOAD_FILES_MAX_PATHS).toBe(20);
  });
});

describe("isUploadFilesParams", () => {
  const P = ["C:\\Up\\a.txt"];
  it("accepts a ref or a locator with 1–20 non-empty string paths", () => {
    expect(isUploadFilesParams({ ref: "e3", paths: P })).toBe(true);
    expect(isUploadFilesParams({ locator: { css: "#f" }, paths: P })).toBe(true);
    expect(isUploadFilesParams({ ref: "e3", paths: Array(20).fill("/a/b") })).toBe(true);
    // The tab fields ride beside the method's own (a client's `tab`, the extension's `tabId`).
    expect(isUploadFilesParams({ ref: "e3", paths: P, tab: "T3" })).toBe(true);
    expect(isUploadFilesParams({ ref: "e3", paths: P, tabId: 7 })).toBe(true);
  });

  it("refuses a missing or doubled target", () => {
    expect(isUploadFilesParams({ paths: P })).toBe(false);
    expect(isUploadFilesParams({ ref: "e3", locator: { css: "#f" }, paths: P })).toBe(false);
    expect(isUploadFilesParams({ ref: "", paths: P })).toBe(false);
    expect(isUploadFilesParams({ ref: 3, paths: P })).toBe(false);
    expect(isUploadFilesParams({ locator: { css: "" }, paths: P })).toBe(false);
  });

  it("refuses paths that are not an array of 1–20 non-empty strings", () => {
    for (const paths of [undefined, null, "C:\\Up\\a.txt", {}, [], Array(21).fill("/a"), ["/a", 1], ["/a", ""], [null], [["/a"]]]) {
      expect(isUploadFilesParams({ ref: "e3", paths }), JSON.stringify(paths)).toBe(false);
    }
    // eslint-disable-next-line no-sparse-arrays
    expect(isUploadFilesParams({ ref: "e3", paths: ["/a", , "/b"] })).toBe(false);
  });

  it("refuses a non-object", () => {
    for (const v of [undefined, null, 1, "x", [], [{ ref: "e3", paths: P }]]) expect(isUploadFilesParams(v)).toBe(false);
  });
});

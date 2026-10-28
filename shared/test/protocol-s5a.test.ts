/**
 * Step 12 S5a — `isUploadFilesParams` accepts an optional boolean `chooser` (spec §10's Step 12 S5a note; #325, #336);
 * absent, it answers as before.
 */
import { describe, it, expect } from "vitest";
import { isUploadFilesParams } from "../src/protocol.js";

const P = ["/srv/wave/a.txt"];

describe("isUploadFilesParams — chooser", () => {
  it("only a boolean passes (absent as before); any other value fails; chooser does not excuse a bad target or paths", () => {
    expect(isUploadFilesParams({ ref: "e3", paths: P, chooser: true })).toBe(true);
    expect(isUploadFilesParams({ locator: { css: "#b" }, paths: P, chooser: false })).toBe(true);
    expect(isUploadFilesParams({ ref: "e3", paths: P })).toBe(true);
    for (const chooser of [null, "true", 1, 0, {}, []]) {
      expect(isUploadFilesParams({ ref: "e3", paths: P, chooser }), JSON.stringify(chooser)).toBe(false);
    }
    expect(isUploadFilesParams({ paths: P, chooser: true })).toBe(false);
    expect(isUploadFilesParams({ ref: "e3", paths: [], chooser: true })).toBe(false);
  });
});

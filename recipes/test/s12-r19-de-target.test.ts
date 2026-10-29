// liveD19 fix round 1: R19-VERSION's locator must target the c1 page's visible file input. `#in` there carries `hidden`, and the locator walk
// prunes hidden subtrees, so a locator on it answers LOCATOR_NOT_FOUND on every build (same class as decisions #368/#370).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const TS = rd("recipes/s12-r19-de.ts");
const FIX = rd("test-fixtures/s12-chooser.js");

describe("R19-VERSION target", () => {
  it("IN is the visible file input #vis and the file has no #in locator", () => {
    const line = TS.split("\n").filter((l) => /const R = "R19-VERSION"/.test(l));
    expect(line).toHaveLength(1);
    expect(line[0]).toContain('IN = { css: "#vis" }');
    expect(TS).not.toMatch(/css:\s*"#in"/);
    expect(TS).not.toContain('"#in"');
  });
  it("in the c1 fixture #vis is a visible file input and #in is hidden", () => {
    const vis = /var VIS = '([^\n]*)';/.exec(FIX)?.[1] ?? "";
    const hid = /var HID = '([^\n]*)';/.exec(FIX)?.[1] ?? "";
    expect(vis).toMatch(/<input id="vis" type="file"/);
    expect(vis).not.toMatch(/\bhidden\b/);
    expect(hid).toMatch(/<input id="in" type="file"/);
    expect(hid).toMatch(/\bhidden\b/);
    expect(FIX).toMatch(/c1: BTN \+ HID \+ VIS,/);
  });
});

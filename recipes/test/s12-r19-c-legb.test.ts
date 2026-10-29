// liveC19 fix round 1: R19-CHOOSE-MCP leg b must target the c1 page's visible file input. `#in` there carries `hidden`, and the locator walk prunes hidden
// subtrees, so a locator on it answers LOCATOR_NOT_FOUND on every build (same class as decision #368).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const TS = rd("recipes/s12-r19-c.ts");
const FIX = rd("test-fixtures/s12-chooser.js");

describe("R19-CHOOSE-MCP leg b target", () => {
  it("leg b's locator is the visible file input #vis, never the hidden #in", () => {
    const line = TS.split("\n").filter((l) => /leg\(R, "b", await mcpLeg\(/.test(l));
    expect(line).toHaveLength(1);
    expect(line[0]).toContain('locator: { css: "#vis" }');
    expect(line[0]).not.toContain('"#in"');
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

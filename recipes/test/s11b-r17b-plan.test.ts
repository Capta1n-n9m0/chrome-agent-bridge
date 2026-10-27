// Tests of Run 17b's pure plan (recipes/s11b-r17b-plan.ts) against section 4.25 of docs/e2e-test-plan.md. Nothing here touches Chrome, a
// daemon or a port.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALL_BLOCKS, EXPECTED, EXTRA_BLOCKS, FRAMING_BLOCKS, NOT_RUN_LINE, NOT_RUN_NOT_EMPTY, ROW_BLOCKS, STOP_MAP, WAITS_FOR_G11_3, firstLine, liveBGate, needsFileAccess, sliceBlocks } from "../s11b-r17b-plan.js";
import { STOP_MAP as R17_STOPS } from "../s11b-r17-plan.js";
import { judgeCtl } from "../s11b-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const doc = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
const sheet = doc.slice(doc.indexOf("### 4.25 R17B rows"), doc.indexOf("*Known limits, recorded before the run:* the investigation"));
const order = (text: string): string[] => [...new Set([...text.matchAll(/R17B-[A-Z0-9]+(?:-[A-Z0-9]+)*/g)].map((m) => m[0]))];

describe("the block list against section 4.25", () => {
  const rows = sheet.split(/\r?\n/).filter((l) => /^\| R17B-/.test(l));
  it("names each table row's block as the Helper column's `R17B <block>`, in the table's order", () => {
    expect(rows.length).toBe(14);
    const ids = rows.map((l) => /^\| (R17B-[A-Z0-9-]+)/.exec(l)![1]!);
    for (const l of rows) {
      const id = /^\| (R17B-[A-Z0-9-]+)/.exec(l)![1]!;
      expect(/`R17B (r17b-[a-z0-9-]+)`/.exec(l)![1], id).toBe(id.toLowerCase());
    }
    expect(ROW_BLOCKS.map((r) => r.row).filter((r) => ids.includes(r)).sort()).toEqual([...ids].sort()); // the slice order differs from the table's (NEWTAB-REFUSED runs after G1)
  });
  it("puts each table row in the slices of its Live column, G1 rows in G1", () => {
    for (const l of rows) {
      const c = l.split("|").map((x) => x.trim());
      const b = ROW_BLOCKS.find((r) => r.row === /^(R17B-[A-Z0-9-]+)/.exec(c[1]!)![1])!;
      expect(b.slices, b.row).toEqual([/\bA\b/.test(c[2]!) ? "A" : "", /\bB\b/.test(c[2]!) ? "B" : ""].filter(Boolean));
      expect(Boolean(b.g1), b.row).toBe(/G1/.test(c[2]!));
    }
  });
  it("names every carried row of the sheet's carried paragraph, and only those", () => {
    const carried = sheet.slice(sheet.indexOf("*Carried rows"), sheet.indexOf("**Helpers needed"));
    const ids = order(carried.slice(0, carried.indexOf("Not repeated")));
    const inTable = rows.map((l) => /^\| (R17B-[A-Z0-9-]+)/.exec(l)![1]!);
    for (const r of ROW_BLOCKS.filter((x) => x.carried)) expect(inTable.includes(r.row) || ids.includes(r.row), r.row).toBe(true);
    expect(ids.filter((i) => !ROW_BLOCKS.some((r) => r.row === i))).toEqual([]);
  });
  it("has no duplicate block and the sheet's prologue", () => {
    expect(new Set(ALL_BLOCKS).size).toBe(ALL_BLOCKS.length);
    expect([...FRAMING_BLOCKS]).toEqual(["preflight", "servers", "files", "window", "reload", "console", "teardown"]);
    expect(EXTRA_BLOCKS).toEqual(["r17b-history", "g1-open", "g1-close", "root-add"]);
  });
});

describe("the slice orders equal 'Slices and order'", () => {
  const at = sheet.indexOf("Order of liveA17B:");
  const aText = sheet.slice(at, sheet.indexOf("liveB17B: R17B-0"));
  const bText = sheet.slice(sheet.indexOf("liveB17B: R17B-0"), sheet.indexOf("A row that changes the safety state"));
  const rowsOf = (s: "A" | "B"): string[] => sliceBlocks(s).filter((b) => /^r17b-/.test(b) && b !== "r17b-history").map((b) => b.toUpperCase());
  it("liveA17B: the sheet's rows in its order, the histories after R17B-BACK-NOACT, G1 between its open and close", () => {
    const withoutBuild = aText.replace(/then the helper builds[^;]*;/, "");
    expect(order(withoutBuild)).toEqual(rowsOf("A"));
    const a = sliceBlocks("A");
    expect(a.indexOf("r17b-history")).toBe(a.indexOf("r17b-back-noact") + 1);
    expect(a.indexOf("g1-open")).toBe(a.indexOf("r17b-history") + 1);
    expect(a.indexOf("g1-close")).toBe(a.indexOf("r17b-disarm") + 1);
    expect(a.indexOf("r17b-newtab-refused")).toBe(a.indexOf("g1-close") + 1);
    expect(a.slice(-3)).toEqual(["r17b-restore", "r17b-logs", "teardown"]);
  });
  it("liveB17B: R17B-0, ROOT added, the F-RAW rows, then the sheet's named rows", () => {
    const named = order(bText).filter((x) => !/^R17B-F-RAW/.test(x) && x !== "R17B-UP-OPT"); // UP-OPT is named only as the way ROOT is added
    expect(rowsOf("B").filter((x) => !/^R17B-F-RAW/.test(x))).toEqual(named);
    const b = sliceBlocks("B");
    expect(b.slice(b.indexOf("r17b-0"), b.indexOf("r17b-up-race-a"))).toEqual(["r17b-0", "root-add", "r17b-f-raw", "r17b-f-raw-2", "r17b-f-raw-dir", "r17b-f-raw-enc", "r17b-f-raw-ok"]);
  });
});

describe("the G11-3 branch", () => {
  it("OFF writes the seven liveB rows NOT RUN and does not start liveB17B; unreadable is a STOP", () => {
    expect(liveBGate("on")).toEqual({ start: true, exit: 0 });
    expect(liveBGate("off")).toEqual({ start: false, exit: 3 });
    expect(liveBGate("unreadable")).toEqual({ start: false, exit: 2 });
    expect(WAITS_FOR_G11_3.length).toBe(7);
    expect(NOT_RUN_LINE).toBe("NOT RUN — waits for G11-3");
    expect(sheet).toContain(NOT_RUN_LINE);
    for (const r of WAITS_FOR_G11_3) {
      expect(sheet, r).toContain(r);
      expect(needsFileAccess(r.toLowerCase()), r).toBe(true);
    }
    expect(needsFileAccess("root-add")).toBe(true);
    expect(needsFileAccess("r17b-rd-2")).toBe(false);
  });
});

describe("expected texts by key, compared with the sheet", () => {
  it("each text (placeholders as written) is in section 4.25", () => {
    for (const [k, v] of Object.entries(EXPECTED)) expect(sheet, k).toContain(v);
    expect(sheet).toContain(NOT_RUN_NOT_EMPTY);
  });
  it("the first line joins the MANIFEST text to the BUILD text, one line", () => {
    const l = firstLine(`${EXPECTED.manifest}\r`, EXPECTED.build);
    expect(l).toBe(`${EXPECTED.manifest} ${EXPECTED.build}`);
    expect(l).not.toMatch(/[\r\n]/);
    expect(sheet).toContain(`\`MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank\``);
    expect(l).toBe("MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank");
  });
});

describe("the STOP map", () => {
  it("every entry states a STOP of section 4.25 (or the preflight / clean-tree lines) and ids are unique", () => {
    expect(new Set(STOP_MAP.map((s) => s.id)).size).toBe(STOP_MAP.length);
    for (const s of STOP_MAP) expect(sheet, s.id).toContain(s.phrase);
  });
  it("the sheet's own STOP lines each have an entry (the #311 additions and the lines of the Helper column)", () => {
    const ids = STOP_MAP.map((s) => s.id);
    for (const id of ["activation-target", "act-refused", "rd2-blocked", "newtab-load-blocked", "setup-back-refused", "fwd-first", "samedoc-refused", "empty-refused", "console-unavailable", "build-not-s6", "toggle-unreadable", "unpinned-disarm"]) expect(ids).toContain(id);
  });
  it("the rest are Run 17's, which the reused blocks keep (their ids exist in its map)", () => {
    for (const id of ["unpinned", "rules-stuck", "restore-mismatch", "log-hit", "stuck-disarm"]) expect(R17_STOPS.map((s) => s.id)).toContain(id);
  });
});

describe("B17 ctl --skip (R17B-CTL: 8088 and 8089 are not started)", () => {
  const two = [{ status: 302, ms: 20 }, { status: 302, ms: 30 }];
  const base = { idleSocket: true, flip: [200, 302] as const, ctlBlocked: 1 };
  it("a skipped port prints no line and is no miss; an unskipped missing port is a STOP", () => {
    const ok = judgeCtl({ ...base, ports: { 8083: two, 8086: two }, skipped: [8088, 8089] });
    expect(ok.verdict.pass).toBe(true);
    expect(ok.lines.filter((l) => l.startsWith("ROW RD-CTL concurrent")).length).toBe(2);
    const miss = judgeCtl({ ...base, ports: { 8083: two, 8086: two } });
    expect(miss.verdict.pass).toBe(false);
  });
});

// recipes/s11b-r17b-plan.ts: the pure part of Run 17b's block runner (recipes/s11b-r17b.ps1; docs/e2e-test-plan.md section 4.25).
// Written 2026-10-27 by S7-helpers builder H3 (Sonnet 5.5). Nothing here touches Chrome, the daemon or a port. The block list, the two
// slice orders, the G11-3 branch, the STOP map and the expected texts live here, tied to the .ps1 and to the sheet by
// recipes/test/s11b-r17b-plan.test.ts and s11b-r17b-static.test.ts. Carried rows run Run 17's block logic (the .ps1 reads those blocks
// from s11b-r17.ps1 by its parser; that file is not edited) under the R17B id.
export type Slice = "A" | "B";
export interface RowBlock {
  /** The sheet's row id (section 4.25, without the star or the parenthesis). */
  row: string;
  /** The -Block value: the id lower-cased (the sheet's Helper column `R17B <block>`). */
  block: string;
  slices: readonly Slice[];
  /** Run inside group G1 (list = found + BLK, saved once). */
  g1?: true;
  /** Carried row: the Run 17 block whose logic it runs. */
  carried?: string;
}
const rb = (row: string, slices: readonly Slice[], o: { g1?: true; carried?: string } = {}): RowBlock => ({ row, block: row.toLowerCase(), slices, ...o });

/** The sheet's rows with a live slice, in the sheet's table order and then the carried rows in its order of mention. */
export const ROW_BLOCKS: readonly RowBlock[] = Object.freeze([
  rb("R17B-0", ["A", "B"]), rb("R17B-UP-L1", ["A"], { carried: "r17-up-l1" }), rb("R17B-CTL", ["A"]), rb("R17B-ACT-CTL", ["A"]),
  rb("R17B-BACK-NOACT", ["A"]), rb("R17B-RD-2", ["A"], { g1: true }), rb("R17B-NEWTAB-PLAIN", ["A"], { g1: true }), rb("R17B-NEWTAB-LOAD", ["A"], { g1: true }),
  rb("R17B-BACK", ["A"], { g1: true }), rb("R17B-FWD", ["A"], { g1: true }), rb("R17B-BACK-SAMEDOC", ["A"], { g1: true }), rb("R17B-DISARM", ["A"], { g1: true }),
  rb("R17B-NEWTAB-REFUSED", ["A"]), rb("R17B-BACK-EMPTY", ["A"]), rb("R17B-RD-DL-SOCKET", ["A"], { carried: "rd-dl-socket" }),
  rb("R17B-UP-OPT", ["A"], { carried: "r17-up-opt" }), rb("R17B-UP-6", ["A"], { carried: "r17-up-6" }), rb("R17B-UP-7", ["A"], { carried: "r17-up-7" }),
  rb("R17B-SAVE-REFUSE", ["A"], { carried: "r17-save-refuse" }),
  rb("R17B-F-RAW", ["B"], { carried: "f-raw" }), rb("R17B-F-RAW-2", ["B"], { carried: "f-raw-2" }), rb("R17B-F-RAW-DIR", ["B"], { carried: "f-raw-dir" }),
  rb("R17B-F-RAW-ENC", ["B"], { carried: "f-raw-enc" }), rb("R17B-F-RAW-OK", ["B"], { carried: "f-raw-ok" }),
  rb("R17B-UP-RACE-A", ["B"], { carried: "r17-up-race-a" }), rb("R17B-UP-DEVT", ["B"], { carried: "r17-up-devt" }),
  rb("R17B-RESTORE", ["A", "B"], { carried: "rd-restore" }), rb("R17B-LOGS", ["A", "B"], { carried: "rd-logs" }),
]);
/** The row order the sheet's "Slices and order" gives: liveA17B's rows where the history set-ups come after R17B-BACK-NOACT. */
export const FRAMING_BLOCKS: readonly string[] = Object.freeze(["preflight", "servers", "files", "window", "reload", "console", "teardown"]);
/** Steps that are not rows: the activated histories for R17B-BACK/-FWD/-BACK-SAMEDOC, G1's save and restore, liveB17B's ROOT-added step. */
export const EXTRA_BLOCKS: readonly string[] = Object.freeze(["r17b-history", "g1-open", "g1-close", "root-add"]);

export function sliceBlocks(s: Slice): string[] {
  const rows = ROW_BLOCKS.filter((r) => r.slices.includes(s)).map((r) => r.block);
  if (s === "A") {
    rows.splice(rows.indexOf("r17b-rd-2"), 0, "r17b-history", "g1-open");
    rows.splice(rows.indexOf("r17b-newtab-refused"), 0, "g1-close");
  } else rows.splice(rows.indexOf("r17b-0") + 1, 0, "root-add");
  return [...FRAMING_BLOCKS.slice(0, 6), ...rows, "teardown"];
}
export const ALL_BLOCKS: readonly string[] = Object.freeze(["liveA17B", "liveB17B", "plan", ...FRAMING_BLOCKS, ...EXTRA_BLOCKS, ...ROW_BLOCKS.map((r) => r.block)]);
/** The block names of Run 17 the .ps1 reads by its parser and runs unchanged (carried rows and G1). */
export const R17_BLOCKS_USED: readonly string[] = Object.freeze([...ROW_BLOCKS.flatMap((r) => (r.carried ? [r.carried] : [])), "g1-open", "g1-close", "root-add", "window", "reload", "console", "files", "teardown"]);

/** G11-3 (#245): the seven liveB17B rows that wait for the file-URL toggle. */
export const WAITS_FOR_G11_3: readonly string[] = Object.freeze(["R17B-F-RAW", "R17B-F-RAW-2", "R17B-F-RAW-DIR", "R17B-F-RAW-ENC", "R17B-F-RAW-OK", "R17B-UP-RACE-A", "R17B-UP-DEVT"]);
export const needsFileAccess = (block: string): boolean => block === "root-add" || WAITS_FOR_G11_3.some((r) => r.toLowerCase() === block);
/** liveB17B starts only when the toggle reads ON; OFF: exit 3 (not run); unreadable: a STOP. */
export function liveBGate(toggle: "on" | "off" | "unreadable"): { start: boolean; exit: 0 | 2 | 3 } {
  return toggle === "on" ? { start: true, exit: 0 } : { start: false, exit: toggle === "unreadable" ? 2 : 3 };
}
/** The sheet's text (em dash); the .ps1 builds the dash with [char]0x2014 to stay ASCII. */
export const NOT_RUN_LINE = "NOT RUN — waits for G11-3";
export const NOT_RUN_NOT_EMPTY = "NOT RUN — found list not empty";

/** Expected texts of section 4.25 by key (placeholders as the sheet writes them); compared with the sheet by the test. */
export const EXPECTED = Object.freeze({
  manifest: "MANIFEST dnrWithHostAccess=true staticRuleSets=absent",
  build: "BUILD disk-s6-names=2/2 created-url=about:blank",
  s6: "S6 commit=ancestor",
  ctlSlow: "CTL 8087 slow answered after <ms> ms",
  actHist: "HIST act-ctl built=3 pages activated=3",
  actAck: "ACT act-ctl n=3 ok",
  disarmedLog: "safety: disarmed by the user",
  stopActivation: "STOP: activation target is not a wave fixture page",
});
/** R17B-0's first line of the record: the MANIFEST text joined to the BUILD text, one line. */
export const firstLine = (manifest: string, build: string): string => `${manifest.trim()} ${build.trim()}`;

/**
 * The STOP map: STOPs of the sheet that a block of the .ps1 detects itself (marker `# STOP-MAP <id>` on that line). `phrase` is a text of
 * section 4.25 that states it. Every other STOP is Run 17's (the reused blocks and functions carry its markers; the sheet: "As 4.24's").
 */
export interface StopEntry { id: string; where: string; phrase: string }
const S = (id: string, where: string, phrase: string): StopEntry => ({ id, where, phrase });
export const STOP_MAP: readonly StopEntry[] = Object.freeze([
  S("port-foreign", "preflight", "stops on a holder the wave did not start"),
  S("tree-dirty", "preflight", "from a clean tree"),
  S("console-unavailable", "r17b-0", "A console that cannot evaluate is a **STOP** here"),
  S("build-not-s6", "r17b-0", "else STOP before any state change"),
  S("created-url", "r17b-0", "any other value is a **STOP** before any state change"),
  S("toggle-unreadable", "Read-S17Early", "an unreadable toggle is a STOP"),
  S("ctl-missed", "r17b-ctl", "any control missing is a STOP"),
  S("setup-back-refused", "r17b-history", "any set-up `back` of R17B-FWD"),
  S("activation-target", "r17b-history", "an activation on anything but a wave fixture page"),
  S("act-refused", "r17b-act-ctl", "**A refusal is a STOP**"),
  S("rd2-blocked", "r17b-rd-2", "**a blocked hit is a STOP**"),
  S("newtab-plain-differs", "r17b-newtab-plain", "A different code or message is a STOP"),
  S("newtab-load-blocked", "r17b-newtab-load", "R17B-RD-2 or any other covered call showing one blocked hit"),
  S("fwd-first", "r17b-fwd", "R17B-FWD's first `forward` P0 → P1"),
  S("samedoc-refused", "r17b-back-samedoc", "R17B-BACK-SAMEDOC's `back`"),
  S("empty-refused", "r17b-back-empty", "R17B-BACK-EMPTY; R17B-BACK and"),
  S("unpinned-disarm", "r17b-disarm", "unpinned is a STOP, never a mouse click"),
  S("any-stop-line", "Invoke-S17Block", "A helper may be fixed only between rows, never past a STOP line"),
]);
/** The ports Run 17b starts (8088 and 8089 are not started; 8090 never; 8080 unused). */
export const PORTS_USED: readonly number[] = Object.freeze([8081, 8083, 8085, 8086, 8087, 8091]);

// recipes/s11b-r17-plan.ts: the pure part of Run 17's block runner (recipes/s11b-r17.ps1; docs/e2e-test-plan.md section 4.24).
// Written 2026-10-27 by S4-helpers builder H7 (Sonnet 5.5) on recipes/s11-r16-plan.ts's model. Nothing here touches Chrome, the
// daemon or a port. The .ps1 stays thin: the block list, the two slice orders, the G11-3 gate, the ports table and the STOP map
// live here and are tied to the .ps1 and to the sheet by recipes/test/s11b-r17-plan.test.ts and s11b-r17-static.test.ts.
export type Slice = "A" | "B";
export interface RowBlock {
  /** The sheet's row id (section 4.24 first column, without the star, the tags or the parenthesis). */
  row: string;
  /** The -Block value (the sheet's Helper column: `R17 <block>`). */
  block: string;
  slices: readonly Slice[];
  /** Run inside group G1 (list = found + BLK, saved once). */
  g1?: true;
}
const rb = (row: string, slices: readonly Slice[], g1?: true): RowBlock => ({ row, block: row.toLowerCase().replace(/^rd-(\d)/, "rd$1"), slices, ...(g1 ? { g1 } : {}) });

/** The sheet's rows with a live slice, in the sheet's order. */
export const ROW_BLOCKS: readonly RowBlock[] = Object.freeze([
  rb("RD-0", ["A", "B"]), rb("R17-UP-L1", ["A"]), rb("RD-CTL", ["A"]), rb("F-FILETAB", ["A"]), rb("F-HOME", ["A"]), rb("RD-CAPS-WARN", ["A"]),
  rb("RD-REGEX", ["A"]), rb("RD-1", ["A"], true), rb("RD-6", ["A"], true), rb("RD-2", ["A"], true), rb("RD-3", ["A"], true),
  rb("RD-DL-ERR", ["A"], true), rb("RD-DL-HOP", ["A"], true), rb("RD-7", ["A"], true), rb("RD-8", ["A"], true), rb("RD-BACK", ["A"], true),
  rb("RD-FWD", ["A"], true), rb("RD-BACK-SAMEDOC", ["A"], true), rb("RD-REBUILD-NARROW", ["A"], true), rb("RD-DISARM", ["A"], true),
  rb("RD-4", ["A"]), rb("RD-5", ["A"]), rb("RD-5B", ["A"]), rb("RD-BACK-EMPTY", ["A"]), rb("RD-DL-SOCKET", ["A"]),
  rb("R17-UP-OPT", ["A"]), rb("R17-UP-6", ["A"]), rb("R17-UP-7", ["A"]), rb("R17-SAVE-REFUSE", ["A"]),
  rb("F-RAW", ["B"]), rb("F-RAW-2", ["B"]), rb("F-RAW-DIR", ["B"]), rb("F-RAW-ENC", ["B"]), rb("F-RAW-OK", ["B"]),
  rb("R17-UP-RACE-A", ["B"]), rb("R17-UP-DEVT", ["B"]), rb("RD-RESTORE", ["A", "B"]), rb("RD-LOGS", ["A", "B"]),
]);

/**
 * Framing blocks (prologue and teardown): ledger lines, not rows. reload BEFORE console (H8): a reload ends the service worker and that
 * detaches its DevTools window, so a console opened before the reload would read nothing. The sheet requires only that the capture
 * start before RD-0 and that RULES 0 be read on the build just reloaded; Run 16's slices also reloaded first.
 */
export const FRAMING_BLOCKS: readonly string[] = Object.freeze(["preflight", "servers", "files", "window", "reload", "console", "teardown"]);
/** Steps that are not rows: RD-BACK's and RD-FWD's history build, G1's save and restore, liveB's ROOT-added step. */
export const EXTRA_BLOCKS: readonly string[] = Object.freeze(["history", "g1-open", "g1-close", "root-add"]);
/** `-Block plan`: prints both slice orders, runs nothing. */
export const PLAN_BLOCKS: readonly string[] = Object.freeze(["plan"]);

/** The liveA / liveB orders of "Slices and order". */
export function sliceBlocks(s: Slice): string[] {
  const rows = ROW_BLOCKS.filter((r) => r.slices.includes(s)).map((r) => r.block);
  const at = (b: string): number => rows.indexOf(b);
  if (s === "A") {
    rows.splice(at("rd1"), 0, "history", "g1-open");
    rows.splice(at("rd4"), 0, "g1-close");
  } else rows.splice(at("rd0") + 1, 0, "root-add");
  return [...FRAMING_BLOCKS.slice(0, 6), ...rows, "teardown"];
}
export const ALL_BLOCKS: readonly string[] = Object.freeze([
  "liveA", "liveB", ...PLAN_BLOCKS, ...FRAMING_BLOCKS, ...EXTRA_BLOCKS, ...ROW_BLOCKS.map((r) => r.block),
]);
export const G1_BLOCKS: readonly string[] = Object.freeze(ROW_BLOCKS.filter((r) => r.g1).map((r) => r.block));

/** G11-3 (#245): the seven liveB rows that wait for the file-URL toggle (the sheet writes each `NOT RUN - waits for G11-3`). */
export const WAITS_FOR_G11_3: readonly string[] = Object.freeze(["F-RAW", "F-RAW-2", "F-RAW-DIR", "F-RAW-ENC", "F-RAW-OK", "R17-UP-RACE-A", "R17-UP-DEVT"]);
export function needsFileAccess(block: string): boolean {
  return block === "root-add" || WAITS_FOR_G11_3.some((r) => r.toLowerCase() === block);
}
/** liveB starts only when the toggle reads ON; OFF: exit 3 (not run); unreadable: a STOP. */
export function liveBGate(toggle: "on" | "off" | "unreadable"): { start: boolean; exit: 0 | 2 | 3 } {
  return toggle === "on" ? { start: true, exit: 0 } : { start: false, exit: toggle === "unreadable" ? 2 : 3 };
}
export const NOT_RUN_LINE = "NOT RUN - waits for G11-3";

/** RD-0's console result: 10 is helper H6's FALLBACK code. FALLBACK is not a STOP; RD-CAPS-WARN's typing runs first as (a'). */
export function rd0Branch(consoleCode: number): "console" | "fallback" | "stop" | "fail" {
  return consoleCode === 10 ? "fallback" : consoleCode === 2 ? "stop" : consoleCode === 0 ? "console" : "fail";
}

/** Blocks written but not yet built into the .ps1 (they print NOT BUILT and exit 3). H8 built the last eight: none is left. */
export const NOT_BUILT: readonly string[] = Object.freeze([]);

export interface PortRow { port: number; use: string; py: string | null }
/** Section 4.24's ports table. `{EXTID}` is the extension id. 8090 is never bound; 8080 is not used. */
export const PORTS: readonly PortRow[] = Object.freeze([
  { port: 8081, use: "allowed pages", py: "-m http.server 8081 --bind 127.0.0.1 --directory test-fixtures" },
  { port: 8083, use: "redirect to 8085", py: "-I recipes/s9-redirect.py 8083 http://localhost:8085" },
  { port: 8085, use: "blocked fixture BLK", py: "-m http.server 8085 --bind 127.0.0.1 --directory test-fixtures" },
  { port: 8086, use: "4 s delay then 302 to 8085", py: "-I recipes/s11b-delay.py 8086 4 http://localhost:8085" },
  { port: 8087, use: "slow allowed, 3 s", py: "-I recipes/s11b-slow.py 8087 3 test-fixtures" },
  { port: 8088, use: "redirect to the own page", py: "-I recipes/s9-redirect.py 8088 chrome-extension://{EXTID}" },
  { port: 8089, use: "redirect to file:", py: "-I recipes/s9-redirect.py 8089 file://" },
  { port: 8090, use: "closed port", py: null },
  { port: 8091, use: "flip: 200 once, then 302", py: "-I recipes/s11b-flip.py 8091 http://localhost:8085" },
]);
export const UNUSED_PORTS: readonly number[] = Object.freeze([8080]);

/**
 * The STOP map: every STOP of the sheet, the block that detects it (the marker `STOP-MAP <id>` stands on that line of the .ps1) and
 * its exit. Every stop ends the wave through the one stop procedure (restore first, read-back, own PIDs, ledger, exit 2).
 */
export interface StopEntry { id: string; stop: string; block: string; exit: 2; /** Set when the detection is not built: the line prints NOT MEASURED instead of stopping. */ gap?: string }
const S = (id: string, stop: string, block: string, gap?: string): StopEntry => ({ id, stop, block, exit: 2, ...(gap ? { gap } : {}) });
export const STOP_MAP: readonly StopEntry[] = Object.freeze([
  S("port-foreign", "a port held by a program the wave did not start (8090 held at all)", "preflight"),
  S("tree-dirty", "a tracked file changed outside the steps dir", "preflight"),
  S("unpinned", "the toolbar button is not pinned (human gate)", "window"),
  S("toggle-unreadable", "the file-URL toggle is unreadable", "rd0"),
  S("found-unarmed", "the found state is not armed with JavaScript on", "rd0"),
  S("found-blocks", "the found block list matches a fixture URL", "rd0"),
  S("l1-allowed", "a found Upload folders text allows ROOT or OUTSIDE (UP-L1)", "r17-up-l1"),
  S("ctl-missed", "a positive control of RD-CTL missed", "rd-ctl"),
  S("covered-proceeds", "a covered call proceeds after its rules failed to install", "rd1"),
  S("rules-stuck", "RULES > 0 after a reply", "rd1"),
  S("covered-proceeds-3", "a covered download call proceeds (RD-3)", "rd3"),
  S("covered-proceeds-hop", "a covered download call proceeds (RD-DL-HOP)", "rd-dl-hop"),
  S("covered-proceeds-rd5", "a covered call proceeds after the stored list read back holding BLK (RD-5)", "rd5"),
  S("covered-proceeds-rd5b", "a covered call proceeds although the list changed during it (RD-5b)", "rd5b"),
  S("human-browsing", "RD-6 reads 0 blocked hits (the human's browsing changed)", "rd6"),
  S("own-rendered", "RD-7: an extension context in the tab (CTX count above 0; the UIA read of the options heading is not built)", "rd7"),
  S("file-rendered", "RD-8: a file: document rendered", "rd8"),
  S("stuck-rule-hit", "RD-4 reads 0 blocked hits (a stuck rule)", "rd4"),
  S("answer-changed", "a bridge call on a page with no redirect answers differently (RD-BACK-EMPTY)", "rd-back-empty"),
  S("log-hit", "a pattern, URL, rule or token in a log (RD-LOGS non-zero count)", "rd-logs"),
  S("restore-mismatch", "the restore read-back differs from the found state", "rd-restore"),
  S("console-input", "a console input holds a pattern", "rd-regex"),
  S("stuck-narrow", "RD-REBUILD-NARROW: RULES above 0 after the reply", "rd-rebuild-narrow"),
  S("unpinned-disarm", "RD-DISARM: the toolbar button is not pinned or not armed (human gate)", "rd-disarm"),
  S("stuck-disarm", "RD-DISARM: RULES above 0 after the reply", "rd-disarm"),
  S("stuck-rd5", "RD-5: RULES above 0 after the reply", "rd5"),
  S("stuck-rd5b", "RD-5b: RULES above 0 after the reply", "rd5b"),
  S("stuck-socket", "RD-DL-SOCKET: RULES above 0 after the loop", "rd-dl-socket"),
  S("rules-stuck-empty", "RD-BACK-EMPTY: a rule existed during a history call", "rd-back-empty"),
  S("any-stop-line", "any STOP line or throw after the first state change", "ANY"),
]);
export function stopPlan(i: { changed: boolean; inRestore: boolean }): { restore: boolean; exit: 2 } {
  return { restore: i.changed && !i.inRestore, exit: 2 };
}

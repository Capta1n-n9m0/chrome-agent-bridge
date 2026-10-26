// recipes/s11-r16-plan.ts: the pure part of Run 16's block runner (recipes/s11-r16.ps1; docs/e2e-test-plan.md section 4.23).
// Written 2026-10-26 by the S5-runner builder (Sonnet 5.5). Nothing here touches Chrome, the daemon or a port. The .ps1 stays
// thin: this file holds the row -> block table, the slice order, the G11-3 gate, the stop/restore decision, the port rule and the
// static scan that extends recipes/s11-win-rules.ts scanPs1Output to the sources and sinks decisions.md #279 names.
import { UP_WAITING_ROWS } from "./s11-rules.js";
import { scanPs1Output } from "./s11-win-rules.js";

export type Slice = "A" | "B";
export interface RowBlock {
  /** The sheet's row ID (section 4.23 first column, without the star or the RECORD tag). */
  row: string;
  /** The -Block value that runs this row alone. */
  block: string;
  /** The slices whose "Live" column names the row (UP-0, UP-RESTORE and UP-LOGS run in both). */
  slices: readonly Slice[];
}
const rb = (row: string, slices: readonly Slice[]): RowBlock => ({ row, block: row.toLowerCase(), slices });

/** Every sheet row that has a live slice, in the sheet's order. UP-CLICK (not run, #251) has none. */
export const ROW_BLOCKS: readonly RowBlock[] = Object.freeze([
  rb("UP-L1", ["A"]), rb("UP-0", ["A", "B"]), rb("UP-OPT", ["A"]), rb("UP-FA", ["A"]), rb("UP-6", ["A"]), rb("UP-7", ["A"]),
  rb("SAVE-REFUSE-R", ["A"]), rb("SW-2", ["A"]),
  rb("UP-1", ["B"]), rb("UP-2", ["B"]), rb("UP-3", ["B"]), rb("UP-4", ["B"]), rb("UP-5", ["B"]), rb("UP-6B", ["B"]), rb("UP-8", ["B"]),
  rb("UP-9", ["B"]), rb("UP-PATCH", ["B"]), rb("UP-TWICE", ["B"]), rb("UP-RAW", ["B"]), rb("UP-NAV", ["B"]), rb("UP-DEVT", ["B"]),
  rb("UP-STALE", ["B"]), rb("UP-7J", ["B"]), rb("UP-RACE-A", ["B"]), rb("UP-RACE-B", ["B"]),
  rb("UP-RESTORE", ["A", "B"]), rb("UP-LOGS", ["A", "B"]),
]);

/** Framing blocks: their lines go to the framing ledger, not to the run record (the record's first line is UP-L1's, S5.2). */
export const FRAMING_BLOCKS: readonly string[] = Object.freeze(["preflight", "servers", "files", "window", "prestale", "reload", "setup", "console", "teardown"]);
/** liveB's own step "ROOT added as UP-OPT does" (no new row). */
export const EXTRA_BLOCKS: readonly string[] = Object.freeze(["root-add"]);

const PROLOGUE_A = ["preflight", "servers", "files", "window", "reload", "setup", "console"];
const PROLOGUE_B = ["preflight", "servers", "files", "window", "prestale", "reload", "setup", "console"];
/** The blocks of a slice, in order: prologue, rows (liveB: root-add after UP-0), teardown. */
export function sliceBlocks(s: Slice): string[] {
  const rows = ROW_BLOCKS.filter((r) => r.slices.includes(s)).map((r) => r.block);
  if (s === "B") rows.splice(rows.indexOf("up-0") + 1, 0, "root-add");
  return [...(s === "A" ? PROLOGUE_A : PROLOGUE_B), ...rows, "teardown"];
}
/** Every valid -Block value (the .ps1's ValidateSet is tied to this list by a test). */
export const ALL_BLOCKS: readonly string[] = Object.freeze(["liveA", "liveB", ...FRAMING_BLOCKS, ...EXTRA_BLOCKS, ...ROW_BLOCKS.map((r) => r.block)]);

/** A block that needs Chrome's file access: the 17 rows of the G11-3 list (section 4.23) and liveB's root-add. */
export function needsFileAccess(block: string): boolean {
  if (block === "root-add") return true;
  const r = ROW_BLOCKS.find((x) => x.block === block);
  return r !== undefined && UP_WAITING_ROWS.includes(r.row);
}

/** G11-3 (#245): liveB starts only when UP-0 read the toggle ON. OFF: the 17 rows are NOT RUN (s11.ts `found` prints them), exit 3. */
export function liveBGate(toggle: "on" | "off" | "unreadable"): { start: boolean; exit: 0 | 2 | 3 } {
  if (toggle === "on") return { start: true, exit: 0 };
  return { start: false, exit: toggle === "unreadable" ? 2 : 3 };
}

/** A line the wave treats as a STOP (decisions.md #193): it begins with `STOP:` and has no prefix. */
export const isStopLine = (l: string): boolean => /^STOP:/.test(l);

/**
 * The stop procedure's decision. After the first state change (`changed`) the safety state is restored and read back; a stop
 * met inside the restore itself (or the restore block) never restores a second time. Every path ends non-zero (exit 2), and a
 * STOP printed during the restore is the end of the wave too (decisions.md #279, NIT-N5).
 */
export function stopPlan(i: { changed: boolean; inRestore: boolean }): { restore: boolean; exit: 2 } {
  return { restore: i.changed && !i.inRestore, exit: 2 };
}
/** The restore's own outcome inside the stop procedure: a false return, a throw or any STOP line printed during it is a failed restore. */
export function restoreFailed(i: { returned: boolean | null; threw: boolean; stopsBefore: number; stopsAfter: number }): boolean {
  return i.threw || i.returned !== true || i.stopsAfter > i.stopsBefore;
}

export type PortHolder = { own: boolean; daemon: boolean };
/** #251 / #273: 8081 and 8084 free or held by the wave's own servers; 9234 free or held by the daemon. */
export function portVerdict(port: number, holders: readonly PortHolder[]): "free" | "ours" | "foreign" {
  if (holders.length === 0) return "free";
  const okFor = (h: PortHolder): boolean => (port === 9234 ? h.daemon : h.own);
  return holders.every(okFor) ? "ours" : "foreign";
}
export const WAVE_PORTS: readonly number[] = Object.freeze([8081, 8084, 9234]);

/** Section 4.23 / #279: the extended static scan of s11-r16.ps1. One violation string per problem, never the line's text. */
export const VETTED_NODE_OUTPUT = "# vetted-node-output";
export const VETTED_FILE_WRITE = "# vetted-file-write";
export const VETTED_CLIXML = "# vetted-clixml";
/** The runner's own paths and the wave's folder: a line that only names one of them would reach stdout (the block's pipeline). */
const SENSITIVE_VAR = String.raw`(?:Root|FoundJson|FoundDir|DaemonLog|NowJson|OptJson|Record|GlobalsFile|Framing|env:\w+)`;
export function scanR16(src: string): string[] {
  const bad: string[] = [];
  const lines = src.split(/\r?\n/);
  const nodeSites = lines.filter((l) => l.includes(VETTED_NODE_OUTPUT)).length;
  const writeSites = lines.filter((l) => l.includes(VETTED_FILE_WRITE)).length;
  if (nodeSites !== 1) bad.push(`expected exactly one ${VETTED_NODE_OUTPUT} site, found ${nodeSites}`);
  if (writeSites > 1) bad.push(`expected at most one ${VETTED_FILE_WRITE} site, found ${writeSites}`);
  const clixmlSites = lines.filter((l) => l.includes(VETTED_CLIXML)).length;
  if (clixmlSites !== 1) bad.push(`expected exactly one ${VETTED_CLIXML} site, found ${clixmlSites}`);
  // The vetted lines print / write text made by s11.ts's own builders (or the daemon log slice for the scanner); they are exempt
  // from the safe-variable check only, and counted above. Everything else goes through scanPs1Output.
  const rest = lines.map((l) => (l.includes(VETTED_NODE_OUTPUT) || l.includes(VETTED_FILE_WRITE) || l.includes(VETTED_CLIXML) ? "" : l)).join("\n");
  // Fail-S16 is Stop9 with a throw: its message is scanned like any other STOP line.
  bad.push(...scanPs1Output(rest.replace(/Fail-S16/g, "Stop9")));
  lines.forEach((l, i) => {
    const code = l.replace(/^\s*#.*$/, "");
    const at = `line ${i + 1}`;
    if (/Get-S11FoundText|Get-S11Box|Get-S11Alias|Get-S9Text/.test(code)) bad.push(`${at}: reads a text source (#279) the runner must not touch`);
    if (/Tee-Object|\[IO\.File\]::(WriteAllText|AppendAllText|WriteAllLines|AppendAllLines|WriteAllBytes)|Write-S11Pressed|Out-File|Add-Content|Set-Content|Out-String|Out-Host|Out-Default/.test(code) && !l.includes(VETTED_FILE_WRITE))
      bad.push(`${at}: writes through a sink #279 names`);
    if (/Export-Clixml|Export-Csv/.test(code) && !l.includes(VETTED_CLIXML)) bad.push(`${at}: writes through a sink #279 names (Export-*)`);
    // Show-S16 is the one printing site: any other call may pass only s11.ts's own lines ($out) or the reload script's ([string[]]$o).
    if (/Show-S16/.test(code) && !/^\s*function (Show-S16|Say9|Stop9)/.test(code) && !l.includes(VETTED_NODE_OUTPUT) && !/^\s*Show-S16 (\$out|\(\[string\[\]\]\$o\))\s*$/.test(code))
      bad.push(`${at}: Show-S16 called with an argument that is not vetted`);
    if (new RegExp(String.raw`^\s*"?\$${SENSITIVE_VAR}(\.\w+)?"?\s*$`, "i").test(code)) bad.push(`${at}: a bare path variable in a block's output`);
    if (/\$env:(USERPROFILE|APPDATA|LOCALAPPDATA|HOME|TEMP|TMP)\b/.test(code) && /\b(Say9|Stop9|Write-Host|throw)\b/.test(code) && !l.includes(VETTED_NODE_OUTPUT))
      bad.push(`${at}: prints a profile or temp path`);
    if (/bridge\.token|BRIDGE_TOKEN/i.test(code)) bad.push(`${at}: names the token`);
  });
  return bad;
}

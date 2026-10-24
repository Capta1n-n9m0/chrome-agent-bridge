// recipes/blackboard/export-grades.ts — Step 8 row SDK-7 (docs/e2e-test-plan.md §4.19; phase doc 0.7
// item 2): the first deterministic job — the course's gradebook read through `bb.all` via `evaluate`,
// written to ./exports/<course>-<UTC date>.json (gitignored). Written 2026-10-23 before any run.
//
// Read-only by construction (recipes/blackboard/readonly.ts, tested): the page code calls only `bb.all`
// on `/gradebook/columns` and `/gradebook/columns/<id>/users` under the course's public v2 API; any
// other op throws here before anything reaches the page, and the page dispatcher refuses it again.
// The export is canonical (sorted keys, columns by id, grades by userId, no timestamp), so the MCP leg
// (`--mcp-plan`, then recipes/blackboard/assemble-mcp.ts) can be compared byte for byte by sha256.
//
// What it needs open: as boot-bb.ts — Chrome logged in to https://ada.blackboard.com, the course id (or
// URL) as the argument; it opens and closes its own tab (`--keep-open` leaves it open, bb loaded, for the
// MCP leg) and loads bb.js itself. Dry run: `--dry-run` on the localhost fixture with stub-bb.js (fake
// data), written to exports/dry-<course>-<date>.json.
//
// It prints counts, byte sizes, sha256 and the file path — never a grade, a name or a Blackboard URL.
//
// How it fails: `REFUSED — …`, exit 2 (as boot-bb.ts; also an existing export file without
// --overwrite); `FAILED — …`, exit 1 (a bridge error; the page export's own error, shown only when it is
// one of the recipe's `bridge:` messages or an HTTP status; a transfer whose length, bytes or sha256
// differs from the page's; the timeout).
//
//   npm run recipe -- recipes/blackboard/export-grades.ts <course-id|course-url|course-key> [--overwrite] [--keep-open] [--timeout <s>] [--bbjs <path>]
//   npm run recipe -- recipes/blackboard/export-grades.ts <course-id> --dry-run
//   npm run recipe -- recipes/blackboard/export-grades.ts <course-id> --mcp-plan     (prints the MCP leg's expressions; connects to nothing)
//
// Held-export mode (added 2026-10-23, decision #103, before S6.3's re-run; recipes/blackboard/held.ts):
// `--hold` makes the SDK leg build the export ONCE under the key `held-<course>`, read it as before, and
// leave it in page memory with the tab open (--keep-open semantics); `--mcp-plan --hold` prints STATUS
// and CHUNK on that same key and no START, so the MCP leg reads the same export and never rebuilds it;
// `--drop-held <T#>` deletes the held copy after both reads (then s6.ts close-bb-tab as before). The page
// code is the same START/STATUS/CHUNK/drop as before (readonly.ts): only who starts it and the key change.
//   npm run recipe -- recipes/blackboard/export-grades.ts <course> --hold [--overwrite] [--timeout <s>] [--bbjs <path>] [--dry-run]
//   npm run recipe -- recipes/blackboard/export-grades.ts <course> --mcp-plan --hold
//   npm run recipe -- recipes/blackboard/export-grades.ts <course> --drop-held <T#> [--dry-run]
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BridgeError, connect, type Tab } from "@bridge/sdk";
import { chunkRanges, exportFileName, MCP_CHUNK_CHARS, MCP_MAX_CHARS, mcpLegPlan, SDK_CHUNK_CHARS, sha256Hex, verifyTransfer } from "./export-file.js";
import { checkHoldFlags, parseBbArgs, parseCourseArg, refuseKeyDryRun, Refusal } from "./guard.js";
import { checkHeldTab, droppedLine, heldFoundLine, heldKey, heldLine, keptHeldLine, mcpPlanLines, type HeldStatus } from "./held.js";
import { chunkExpression, dropExpression, exportKey, startExpression, statusExpression } from "./readonly.js";
import { bootBb, describeSource, openCourse, prepare, REPO, resolveCourse } from "./session.js";
import { listTabs } from "../t5-lib.js";

const NAME = "export-grades";
const say = (msg: string): void => console.log(`${new Date().toISOString()} ${NAME}: ${msg}`);
const HELP = `recipes/blackboard/export-grades.ts <course-id|course-url|course-key> [--overwrite] [--keep-open] [--timeout <s>] [--bbjs <path>]
recipes/blackboard/export-grades.ts <course-id> --dry-run [--fixture-origin http://localhost:<port>]
recipes/blackboard/export-grades.ts <course-id> --mcp-plan
recipes/blackboard/export-grades.ts <course> --hold [--dry-run]   |   <course> --mcp-plan --hold   |   <course> --drop-held <T#> [--dry-run]
Reads the course gradebook (read-only) into exports/<course>-<date>.json; prints counts and sha256 only.`;

interface Status {
  state: string;
  length?: number;
  bytes?: number;
  sha256?: string;
  columns?: number;
  grades?: number;
  error?: string;
}

/** The page export's error as it may be printed: our own `bridge:` messages, else the HTTP status only. */
function safeError(e: string | undefined): string {
  if (!e) return "unknown error";
  if (e.startsWith("bridge: ")) return e;
  const m = /^(\d{3}) /.exec(e);
  return m ? `HTTP ${m[1]} from Blackboard (body withheld)` : "error (message withheld: it may carry page data)";
}

// The plan's lines moved unchanged to held.ts (mcpPlanLines, #103), which adds the held plan (no START).
function mcpPlan(arg: string | undefined, held: boolean): void {
  for (const line of mcpPlanLines(parseCourseArg(arg), { held })) console.log(line);
}

/** `--drop-held <T#>` (#103): the held export found, deleted, and STATUS gone after; the tab stays open. */
async function dropHeld(course: string | undefined, handle: string, dryRun: boolean): Promise<void> {
  const arg = parseCourseArg(course);
  refuseKeyDryRun(arg, dryRun);
  const key = heldKey(arg.label);
  const client = await connect({ name: NAME, failureReports: false });
  try {
    const row = (await listTabs(client)).find((t) => t.tab === handle);
    checkHeldTab(row, handle, arg, dryRun);
    const tab = await client.claim(handle);
    say(heldFoundLine(key, handle, await tab.evaluate<HeldStatus | null>(statusExpression(key))));
    const r = await tab.evaluate<unknown>(dropExpression(key));
    say(droppedLine(key, handle, r, await tab.evaluate<HeldStatus | null>(statusExpression(key))));
    await tab.release();
    say(`released ${handle} (left open: close it with s6.ts close-bb-tab ${handle})`);
  } finally {
    client.close();
  }
}

async function waitDone(tab: Tab, key: string, timeoutS: number): Promise<Status> {
  const deadline = Date.now() + timeoutS * 1000;
  let last = "";
  while (Date.now() < deadline) {
    const s = await tab.evaluate<Status | null>(statusExpression(key));
    if (!s) throw new Error("the export entry vanished from the page (did the tab navigate?)");
    if (s.state !== "running") return s;
    if (last !== "running") say("export running in the page …");
    last = s.state;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`the export did not finish within ${timeoutS} s (--timeout)`);
}

async function main(): Promise<void> {
  const args = parseBbArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  checkHoldFlags(args);
  if (args.mcpPlan) {
    refuseKeyDryRun(parseCourseArg(args.course), args.dryRun);
    mcpPlan(args.course, args.hold);
    return;
  }
  if (args.dropHeld !== undefined) {
    await dropHeld(args.course, args.dropHeld, args.dryRun);
    return;
  }
  const p = prepare(args);
  const file = join(REPO, "exports", exportFileName(p.label, new Date(), { dryRun: p.dryRun, leg: "sdk" }));
  if (existsSync(file) && !args.overwrite) throw new Refusal(`${relative(REPO, file)} exists — pass --overwrite to replace it`);
  say(`course ${p.label}; source ${describeSource(p)}${p.dryRun ? "; DRY RUN" : ""}`);
  // failureReports off: a report would save a screenshot and a snapshot of a Blackboard page.
  const client = await connect({ name: NAME, failureReports: false });
  let tab: Tab | undefined;
  try {
    const courseId = await resolveCourse(client, p, say);
    tab = await openCourse(client, p, courseId, say);
    const version = await bootBb(tab, p, courseId, say);
    say(`bb.VERSION = ${version ?? "(none)"}`);
    if (version === null) throw new Error("bb did not load (no bb.VERSION)");
    const key = args.hold ? heldKey(p.label) : exportKey("sdk", p.label);
    const t0 = Date.now();
    await tab.evaluate(startExpression(key, p.label, { bbC: courseId }), { timeoutMs: 15_000 });
    const s = await waitDone(tab, key, args.timeoutS);
    if (s.state !== "done") throw new Error(`the page export failed: ${safeError(s.error)}`);
    say(`page export done in ${Date.now() - t0} ms: ${s.columns} columns, ${s.grades} grade records, ${s.bytes} bytes, sha256 ${s.sha256}`);
    {
      const plan = mcpLegPlan(s.length!);
      say(`MCP leg size: ${s.length} characters → ${plan.chunks} chunk(s) of ${MCP_CHUNK_CHARS}; measurable: ${plan.measurable ? "yes" : `no (over the pre-registered cap of ${MCP_MAX_CHARS} characters)`}`);
    }
    let text = "";
    const ranges = chunkRanges(s.length!, SDK_CHUNK_CHARS);
    for (const [a, b] of ranges) {
      const part = await tab.evaluate<string>(chunkExpression(key, a, b), { timeoutMs: 30_000 });
      if (typeof part !== "string" || part.length !== b - a) throw new Error(`chunk [${a}, ${b}) came back with ${typeof part === "string" ? part.length : "no"} characters`);
      text += part;
    }
    verifyTransfer(text, { length: s.length!, bytes: s.bytes!, sha256: s.sha256! });
    say(`pulled ${ranges.length} chunk(s); length, bytes and sha256 equal the page's: yes`);
    if (!args.hold) await tab.evaluate(dropExpression(key));
    mkdirSync(join(REPO, "exports"), { recursive: true });
    const tmp = `${file}.part`;
    writeFileSync(tmp, text, "utf8");
    renameSync(tmp, file);
    say(`written ${relative(REPO, file)} — ${Buffer.byteLength(text, "utf8")} bytes, sha256 ${sha256Hex(text)}`);
    say(`SDK-7 (SDK leg${p.dryRun ? ", dry run" : ""}) PASS — ${s.columns} columns, ${s.grades} grade records; file sha256 = page sha256`);
    if (args.hold) {
      say(heldLine(key, tab.handle, p.label));
      say(keptHeldLine(tab.handle));
      tab = undefined;
    } else if (args.keepOpen) {
      say(`kept ${tab.handle} open with bb loaded for the MCP leg (run with --mcp-plan for its expressions); released when this script exits`);
      tab = undefined;
    }
  } finally {
    if (tab) {
      await tab.close().catch(() => {});
      say(`closed ${tab.handle}`);
    }
    client.close();
  }
}

main().catch((err: unknown) => {
  if (err instanceof Refusal) {
    say(`REFUSED — ${err.message}`);
    process.exitCode = 2;
  } else if (err instanceof BridgeError) {
    say(`FAILED — ${err.code}: ${err.message}`);
    process.exitCode = 1;
  } else {
    say(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
});

// recipes/blackboard/assemble-mcp.ts — SDK-7's MCP leg, second half (docs/e2e-test-plan.md §4.19): reads
// the MCP actor's transcript (Claude's <session>.jsonl, or t5-actor.ts's out.jsonl), takes the verbatim
// `browser_evaluate` results of the export key's status and chunk expressions (export-grades.ts
// --mcp-plan), reassembles the export, checks it against the page's length/bytes/sha256 the actor saw,
// and writes exports/<course>-<UTC date>-mcp.json. Written 2026-10-23 before any run; connects to nothing.
//
// What it needs: the transcript path and the course id. It prints counts, sizes, sha256 and the path —
// never the data. How it fails: `FAILED — …` and exit 1 (no status, a missing or bad chunk, a mismatch,
// an existing file without --overwrite); exit 2 on bad arguments.
//
//   npm run recipe -- recipes/blackboard/assemble-mcp.ts <transcript.jsonl> <course-id|course-key> [--overwrite]
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { assemble, exportFileName, sha256Hex, verifyTransfer } from "./export-file.js";
import { parseCourseArg, Refusal } from "./guard.js";
import { exportKey } from "./readonly.js";
import { parseTranscriptChunks } from "./transcript.js";
import { REPO } from "./session.js";

const say = (msg: string): void => console.log(`${new Date().toISOString()} assemble-mcp: ${msg}`);

function main(): void {
  const args = process.argv.slice(2);
  const overwrite = args.includes("--overwrite");
  const pos = args.filter((a) => !a.startsWith("--"));
  if (args.includes("--help") || pos.length !== 2) {
    console.log("recipes/blackboard/assemble-mcp.ts <transcript.jsonl> <course-id|course-key> [--overwrite]");
    if (!args.includes("--help")) process.exitCode = 2;
    return;
  }
  const [transcript, courseArg] = pos as [string, string];
  const course = parseCourseArg(courseArg).label;
  const key = exportKey("mcp", course);
  const r = parseTranscriptChunks(readFileSync(transcript, "utf8").split(/\r?\n/), key);
  say(`transcript: status ${r.status ? "found" : "missing"}, ${r.chunks.length} chunk result(s), ${r.errors.length} bad result(s)`);
  for (const e of r.errors) say(`bad result: ${e}`);
  if (!r.status) throw new Error(`no "done" status result for ${key} in the transcript`);
  const text = assemble(r.chunks, r.status.length);
  verifyTransfer(text, r.status);
  const file = join(REPO, "exports", exportFileName(course, new Date(), { dryRun: false, leg: "mcp" }));
  if (existsSync(file) && !overwrite) throw new Refusal(`${relative(REPO, file)} exists — pass --overwrite`);
  mkdirSync(join(REPO, "exports"), { recursive: true });
  writeFileSync(`${file}.part`, text, "utf8");
  renameSync(`${file}.part`, file);
  say(`written ${relative(REPO, file)} — ${Buffer.byteLength(text, "utf8")} bytes, sha256 ${sha256Hex(text)} (= the page's: yes)`);
}

try {
  main();
} catch (err) {
  say(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = err instanceof Refusal ? 2 : 1;
}

// S6b probe counter: for one tool name, finds its tool_use blocks in a Claude Code jsonl file
// (`claude -p --output-format stream-json` output, or a session transcript), the tool_result(s)
// answering them, and counts the image parts inside each tool_result's content. Prints one
// JSON line. Reads the file named on the command line; writes only to stdout; no network.
//   node count-images.mjs <file.jsonl> <tool name, e.g. mcp__probe__probe_v3>
import { readFileSync } from "node:fs";

const [file, tool] = process.argv.slice(2);
if (!file || !tool) {
  console.error("usage: node count-images.mjs <file.jsonl> <tool name>");
  process.exit(2);
}

/** Every object in `v` (depth first), `v` included. */
function* objects(v) {
  if (Array.isArray(v)) for (const x of v) yield* objects(x);
  else if (v && typeof v === "object") {
    yield v;
    for (const x of Object.values(v)) yield* objects(x);
  }
}
const countImages = (v) => [...objects(v)].filter((o) => o.type === "image").length;

const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
const entries = [];
let badLines = 0;
for (const l of lines) {
  try {
    entries.push(JSON.parse(l));
  } catch {
    badLines++;
  }
}

const ids = new Set();
for (const e of entries) for (const o of objects(e)) if (o.type === "tool_use" && o.name === tool) ids.add(o.id);

const results = [];
let toolUseResultImages = 0; // transcript-only sibling field holding the raw tool output (informational)
const answers = [];
let sessionId = null;
for (const e of entries) {
  if (sessionId === null && typeof e.session_id === "string") sessionId = e.session_id;
  if (sessionId === null && typeof e.sessionId === "string") sessionId = e.sessionId;
  let mine = false;
  for (const o of objects(e)) {
    if (o.type === "tool_result" && ids.has(o.tool_use_id)) {
      mine = true;
      const content = Array.isArray(o.content) ? o.content : [{ type: "text-string" }];
      results.push({
        tool_use_id: o.tool_use_id,
        is_error: o.is_error === true,
        content_types: content.map((c) => c.type),
        image_parts: countImages(o.content),
      });
    }
    if (o.type === "text" && typeof o.text === "string" && /COLOUR:/i.test(o.text)) answers.push(o.text.trim());
  }
  if (mine && e.toolUseResult !== undefined) toolUseResultImages += countImages(e.toolUseResult);
  if (e.type === "result" && typeof e.result === "string") answers.push(`[result] ${e.result.trim()}`);
}

console.log(
  JSON.stringify({
    file,
    tool,
    session_id: sessionId,
    lines: lines.length,
    bad_lines: badLines,
    tool_uses: ids.size,
    tool_results: results,
    images_in_tool_results: results.reduce((n, r) => n + r.image_parts, 0),
    images_in_toolUseResult: toolUseResultImages,
    raw_image_tokens: (readFileSync(file, "utf8").match(/"type":\s*"image"/g) ?? []).length,
    answers: [...new Set(answers)],
  }),
);

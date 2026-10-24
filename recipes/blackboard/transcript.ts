// recipes/blackboard/transcript.ts — reads SDK-7's MCP leg back from a Claude transcript (Step 8 S6).
// The MCP actor ran `browser_evaluate` with the expressions export-grades.ts --mcp-plan printed; this
// finds, for one export key, the status result and every chunk result, verbatim, by matching the exact
// expressions of recipes/blackboard/readonly.ts. A chunk whose output was truncated, is an error, or has
// the wrong length is reported, never used. Pure; written 2026-10-23 with its tests.
import { chunkExpression, statusExpression } from "./readonly.js";

export interface TranscriptChunks {
  status?: { state: string; length: number; bytes: number; sha256: string; columns?: number; grades?: number };
  chunks: Array<{ start: number; end: number; text: string }>;
  errors: string[];
}

interface Block {
  type?: string;
  id?: string;
  name?: string;
  input?: { expression?: unknown };
  tool_use_id?: string;
  is_error?: boolean;
  content?: unknown;
}

function blocksOf(line: string): Block[] {
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return [];
  }
  // t5-actor.ts wraps each stream-json line as {"t": …, "m": <line>}.
  const o = obj && typeof obj === "object" && "m" in (obj as object) ? (obj as { m: unknown }).m : obj;
  const content = (o as { message?: { content?: unknown } } | null)?.message?.content;
  return Array.isArray(content) ? (content as Block[]) : [];
}

function resultText(b: Block): string {
  if (typeof b.content === "string") return b.content;
  if (Array.isArray(b.content)) {
    return (b.content as Array<{ type?: string; text?: string }>)
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
  }
  return "";
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseTranscriptChunks(lines: string[], key: string): TranscriptChunks {
  // The exact chunkExpression text, with its two numbers as groups (the template has "slice(1, 2)" once).
  const chunkRe = new RegExp(`^${escapeRe(chunkExpression(key, 1, 2)).replace("slice\\(1, 2\\)", "slice\\((\\d+), (\\d+)\\)")}$`);
  const status = statusExpression(key);
  const calls = new Map<string, { kind: "status" } | { kind: "chunk"; start: number; end: number }>();
  const out: TranscriptChunks = { chunks: [], errors: [] };
  for (const line of lines) {
    for (const b of blocksOf(line)) {
      if (b.type === "tool_use" && typeof b.id === "string" && typeof b.input?.expression === "string") {
        if (!/browser_evaluate$/.test(String(b.name))) continue;
        const expr = b.input.expression.trim();
        if (expr === status) calls.set(b.id, { kind: "status" });
        const m = chunkRe.exec(expr);
        if (m) calls.set(b.id, { kind: "chunk", start: Number(m[1]), end: Number(m[2]) });
      } else if (b.type === "tool_result" && typeof b.tool_use_id === "string") {
        const call = calls.get(b.tool_use_id);
        if (!call) continue;
        const text = resultText(b);
        if (b.is_error) {
          out.errors.push(`${b.tool_use_id}: the call failed`);
          continue;
        }
        if (call.kind === "status") {
          try {
            const s = JSON.parse(text);
            if (s && s.state === "done" && typeof s.length === "number" && typeof s.sha256 === "string") out.status = s;
          } catch {
            out.errors.push(`${b.tool_use_id}: the status output is not JSON`);
          }
          continue;
        }
        // The last chunk may come back shorter (asked past the end; `assemble` checks the total); a
        // longer or empty one, or one with a newline (a truncated output), is never data.
        if (text.includes("\n") || text.length === 0 || text.length > call.end - call.start) {
          out.errors.push(`${b.tool_use_id}: chunk [${call.start}, ${call.end}) came back with ${text.length} characters${text.includes("\n") ? " and a newline (truncated?)" : ""}`);
          continue;
        }
        out.chunks.push({ start: call.start, end: call.end, text });
      }
    }
  }
  return out;
}

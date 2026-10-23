// Tests for recipes/blackboard/export-file.ts (file names, chunk ranges, reassembly, hashes) and
// recipes/blackboard/transcript.ts (the MCP leg of SDK-7 read back from a Claude transcript).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assemble,
  chunkRanges,
  exportFileName,
  isInside,
  MCP_CHUNK_CHARS,
  MCP_MAX_CHARS,
  mcpLegPlan,
  sha256Hex,
  verifyTransfer,
} from "../blackboard/export-file.js";
import { parseTranscriptChunks } from "../blackboard/transcript.js";
import { chunkExpression, statusExpression } from "../blackboard/readonly.js";

describe("exportFileName", () => {
  const d = new Date(Date.UTC(2026, 9, 23, 23, 30));
  it("<course>-<UTC date>.json for the SDK leg", () => {
    expect(exportFileName("_5_1", d, { dryRun: false, leg: "sdk" })).toBe("_5_1-2026-10-23.json");
  });
  it("-mcp for the MCP leg, dry- for a dry run", () => {
    expect(exportFileName("_5_1", d, { dryRun: false, leg: "mcp" })).toBe("_5_1-2026-10-23-mcp.json");
    expect(exportFileName("_5_1", d, { dryRun: true, leg: "sdk" })).toBe("dry-_5_1-2026-10-23.json");
  });
  it("refuses a course that is not an id", () => {
    expect(() => exportFileName("../x", d, { dryRun: false, leg: "sdk" })).toThrow();
  });
  // Added 2026-10-23 (S6 fixer r1, #96): a key-named course is filed under its label, never its id.
  it("a lower-case key label names the file (pp1-<date>.json); a dry run takes an id only", () => {
    expect(exportFileName("pp1", d, { dryRun: false, leg: "sdk" })).toBe("pp1-2026-10-23.json");
    expect(exportFileName("pp1", d, { dryRun: false, leg: "mcp" })).toBe("pp1-2026-10-23-mcp.json");
    expect(() => exportFileName("pp1", d, { dryRun: true, leg: "sdk" })).toThrow();
    expect(() => exportFileName("PP1", d, { dryRun: false, leg: "sdk" })).toThrow();
  });
});

describe("the MCP leg's size (S6 fixer r1: chunks ≤ 8000 characters, a pre-registered cap)", () => {
  it("chunks are at most 8000 characters", () => {
    expect(MCP_CHUNK_CHARS).toBeLessThanOrEqual(8000);
  });
  it("mcpLegPlan: measurable up to MCP_MAX_CHARS (30 chunks), else not measured", () => {
    expect(MCP_MAX_CHARS).toBe(30 * MCP_CHUNK_CHARS);
    expect(mcpLegPlan(626)).toEqual({ measurable: true, chunks: 1 });
    expect(mcpLegPlan(MCP_MAX_CHARS)).toEqual({ measurable: true, chunks: 30 });
    expect(mcpLegPlan(MCP_MAX_CHARS + 1)).toEqual({ measurable: false, chunks: 31 });
    expect(() => mcpLegPlan(-1)).toThrow();
  });
});

describe("isInside", () => {
  it("is true only for a path under the root", () => {
    expect(isInside("C:\\repo", "C:\\repo\\exports\\a.json")).toBe(true);
    expect(isInside("C:\\repo", "C:\\Users\\me\\.chrome-agent-bridge\\failures\\x.png")).toBe(false);
    expect(isInside("C:\\repo", "C:\\repo-other\\x")).toBe(false);
    expect(isInside("/repo", "/repo/a/b")).toBe(true);
    expect(isInside("/repo", "/repo/../etc")).toBe(false);
  });
});

describe("chunks", () => {
  it("chunkRanges covers [0, length) contiguously", () => {
    expect(chunkRanges(0, 10)).toEqual([]);
    expect(chunkRanges(25, 10)).toEqual([
      [0, 10],
      [10, 20],
      [20, 25],
    ]);
    expect(() => chunkRanges(5, 0)).toThrow();
  });
  it("MCP chunks stay under the MCP's 20 000-character output cap", () => {
    expect(MCP_CHUNK_CHARS).toBeLessThan(20_000);
  });
  it("assemble needs contiguous chunks from 0 to the length; identical duplicates are fine", () => {
    expect(assemble([{ start: 3, text: "def" }, { start: 0, text: "abc" }, { start: 0, text: "abc" }], 6)).toBe("abcdef");
    expect(() => assemble([{ start: 0, text: "abc" }], 6)).toThrow(/missing/);
    expect(() => assemble([{ start: 0, text: "abc" }, { start: 4, text: "ef" }], 6)).toThrow(/missing|gap/);
    expect(() => assemble([{ start: 0, text: "abc" }, { start: 0, text: "abd" }, { start: 3, text: "def" }], 6)).toThrow(/differ/);
  });
});

describe("verifyTransfer", () => {
  it("passes when length, bytes and sha256 match the page's", () => {
    const text = '{"a":"é"}';
    const sha = createHash("sha256").update(text, "utf8").digest("hex");
    expect(sha256Hex(text)).toBe(sha);
    expect(() => verifyTransfer(text, { length: text.length, bytes: Buffer.byteLength(text), sha256: sha })).not.toThrow();
  });
  it("fails on any mismatch", () => {
    const text = "abc";
    expect(() => verifyTransfer(text, { length: 4, bytes: 3, sha256: sha256Hex(text) })).toThrow(/length/);
    expect(() => verifyTransfer(text, { length: 3, bytes: 4, sha256: sha256Hex(text) })).toThrow(/bytes/);
    expect(() => verifyTransfer(text, { length: 3, bytes: 3, sha256: "0".repeat(64) })).toThrow(/sha256/);
  });
});

/** One transcript line as Claude Code writes it. */
function assistant(id: string, expression: string): string {
  return JSON.stringify({
    type: "assistant",
    message: { content: [{ type: "tool_use", id, name: "mcp__chrome-agent-bridge__browser_evaluate", input: { expression } }] },
  });
}
function result(id: string, text: string, isError = false): string {
  return JSON.stringify({
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: id, is_error: isError, content: [{ type: "text", text }] }] },
  });
}

describe("parseTranscriptChunks", () => {
  const key = "mcp-_5_1";
  const status = { state: "done", length: 7, bytes: 7, sha256: sha256Hex("abcdefg"), columns: 1, grades: 2 };
  it("reads the status and the chunk results of the key, in any order", () => {
    const lines = [
      assistant("s1", statusExpression(key)),
      result("s1", JSON.stringify(status, null, 2)),
      assistant("c2", chunkExpression(key, 4, 7)),
      assistant("c1", chunkExpression(key, 0, 4)),
      result("c1", "abcd"),
      result("c2", "efg"),
    ];
    const r = parseTranscriptChunks(lines, key);
    expect(r.errors).toEqual([]);
    expect(r.status).toMatchObject({ length: 7, sha256: status.sha256 });
    expect(assemble(r.chunks, r.status!.length)).toBe("abcdefg");
  });
  it("accepts t5-actor's wrapped lines ({t, m})", () => {
    const wrap = (l: string): string => JSON.stringify({ t: "2026-10-23T00:00:00Z", m: JSON.parse(l) });
    const r = parseTranscriptChunks([wrap(assistant("c1", chunkExpression(key, 0, 3))), wrap(result("c1", "abc"))], key);
    expect(r.chunks).toEqual([{ start: 0, end: 3, text: "abc" }]);
  });
  it("records a truncated, errored or wrong-length chunk as an error, never as data", () => {
    const lines = [
      assistant("c1", chunkExpression(key, 0, 4)),
      result("c1", "abcd\n… [truncated: 5 more chars]\n(output truncated — narrow the expression)"),
      assistant("c2", chunkExpression(key, 4, 7)),
      result("c2", "PAGE_ERROR: x", true),
      assistant("c3", chunkExpression(key, 7, 9)),
      result("c3", "xyz"),
    ];
    const r = parseTranscriptChunks(lines, key);
    expect(r.chunks).toEqual([]);
    expect(r.errors.length).toBe(3);
  });
  it("accepts a short last chunk (asked past the end) and assembles to the status length", () => {
    const lines = [assistant("c1", chunkExpression(key, 0, 4)), result("c1", "abcd"), assistant("c2", chunkExpression(key, 4, 8)), result("c2", "efg")];
    const r = parseTranscriptChunks(lines, key);
    expect(r.errors).toEqual([]);
    expect(assemble(r.chunks, 7)).toBe("abcdefg");
  });
  it("ignores other keys and other tools", () => {
    const lines = [assistant("c1", chunkExpression("sdk-_5_1", 0, 3)), result("c1", "abc"), "not json", ""];
    const r = parseTranscriptChunks(lines, key);
    expect(r.chunks).toEqual([]);
    expect(r.status).toBeUndefined();
  });
});

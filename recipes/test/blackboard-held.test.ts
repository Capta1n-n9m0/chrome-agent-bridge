// Tests for recipes/blackboard/held.ts — SDK-7's held-export mode (decision #103, 2026-10-23, written before
// the code): the plan in hold mode has no START and reads the held key; the drop expression removes the
// held copy so STATUS answers null; the printed lines; the flags; the pre-#103 plan unchanged.
// The page side runs in node:vm against recipes/blackboard/stub-bb.js, as blackboard-readonly.test.ts does.
import { readFileSync } from "node:fs";
import { createHash, webcrypto } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { checkHoldFlags, parseBbArgs, parseCourseArg, Refusal } from "../blackboard/guard.js";
import { checkHeldTab, droppedLine, heldFoundLine, heldKey, heldLine, keptHeldLine, mcpPlanLines } from "../blackboard/held.js";
import { chunkExpression, dropExpression, exportKey, PAGE_EXPORT_SRC, startExpression, statusExpression } from "../blackboard/readonly.js";
import { RETURN_RE } from "../../extension/src/evaluate/wrap.js";

const here = dirname(fileURLToPath(import.meta.url));
const STUB = readFileSync(join(here, "..", "blackboard", "stub-bb.js"), "utf8");
const DRY_SHA = "92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c";

function page(course: string): vm.Context {
  const ctx: Record<string, unknown> = { crypto: webcrypto, TextEncoder, console: { log() {} }, setTimeout, Date };
  ctx.window = ctx;
  ctx.BB_COURSE = course;
  const context = vm.createContext(ctx);
  vm.runInContext(STUB, context);
  return context;
}

async function evaluate(context: vm.Context, expression: string): Promise<unknown> {
  const code = RETURN_RE.test(expression) ? `(async () => {\n${expression}\n})()` : expression;
  return await vm.runInContext(code, context);
}

async function waitDone(context: vm.Context, key: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < 200; i++) {
    const s = (await evaluate(context, statusExpression(key))) as Record<string, unknown> | null;
    if (s && s.state !== "running") return s;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("export did not finish");
}

/** The plan's section after `header` up to the next section header (lines ending in ":" with no "(" first). */
function section(lines: string[], header: string): string[] {
  const i = lines.indexOf(header);
  if (i < 0) return [];
  const out: string[] = [];
  for (const l of lines.slice(i + 1)) {
    if (l === "STATUS:" || l === "START:" || l.startsWith("CHUNK (")) break;
    out.push(l);
  }
  return out;
}

describe("heldKey", () => {
  it("held-<course>, for an id and a key label; nothing else", () => {
    expect(heldKey("pp1")).toBe("held-pp1");
    expect(heldKey("_1_1")).toBe("held-_1_1");
    expect(exportKey("held", "pp1")).toBe("held-pp1");
    for (const bad of ["PP1", "../x", ""]) expect(() => heldKey(bad), bad).toThrow();
  });
});

describe("the MCP plan in hold mode (#103): no START, the held key", () => {
  const lines = mcpPlanLines(parseCourseArg("pp1"), { held: true });
  const text = lines.join("\n");
  it("has no START section and no START expression", () => {
    expect(lines).not.toContain("START:");
    expect(text).not.toContain("bridgeGradesExport");
    expect(text).not.toContain(PAGE_EXPORT_SRC.slice(0, 40));
  });
  it("STATUS and the two CHUNK lines are the held key's exact expressions", () => {
    expect(section(lines, "STATUS:")).toEqual([statusExpression("held-pp1")]);
    const c = lines.findIndex((l) => l.startsWith("CHUNK ("));
    expect(lines.slice(c + 1)).toEqual([chunkExpression("held-pp1", 0, 8000), chunkExpression("held-pp1", 8000, 16000)]);
    expect(text).not.toContain('"mcp-pp1"');
    expect(text).not.toContain('"sdk-pp1"');
  });
  it("says it is the held plan, and carries no course id", () => {
    expect(lines[0]).toBe("# SDK-7 MCP leg for course pp1, held export (#103) — paste into the actor's prompt (S6-wave-sheet.md, SDK-7)");
    expect(lines[1]).toBe("# key held-pp1; chunk size 8000 characters (the MCP prints a string result raw, capped at 20 000); at most 600000 characters (75 chunks), else the MCP leg is not measured");
    expect(lines[2]).toBe("# no START: the SDK leg (--hold) built the export once and holds it in its tab; this leg only reads it (M1 = select the tab + the first STATUS)");
    expect(/_\d+_\d+/.test(text)).toBe(false);
    expect(lines).toHaveLength(8);
  });
});

describe("the pre-#103 plan is unchanged", () => {
  it("pp1: START (bbC null), STATUS and CHUNK on mcp-pp1, as export-grades.ts printed it", () => {
    const k = "mcp-pp1";
    expect(mcpPlanLines(parseCourseArg("pp1"), { held: false })).toEqual([
      "# SDK-7 MCP leg for course pp1 — paste into the actor's prompt (S6-wave-sheet.md, SDK-7)",
      "# key mcp-pp1; chunk size 8000 characters (the MCP prints a string result raw, capped at 20 000); at most 600000 characters (75 chunks), else the MCP leg is not measured",
      "# a course key: START carries no course id; it runs only on the tab the SDK leg kept open (--keep-open), which carries the label mark",
      "START:",
      startExpression(k, "pp1", { bbC: null }),
      "STATUS:",
      statusExpression(k),
      "CHUNK (for start = 0, 8000, 16000, … while start < length; end = start + 8000):",
      chunkExpression(k, 0, 8000),
      chunkExpression(k, 8000, 16000),
    ]);
  });
  it("an id: no key comment, START with bb.C = the id", () => {
    const lines = mcpPlanLines(parseCourseArg("_1_1"), { held: false });
    expect(lines).toHaveLength(9);
    expect(lines[2]).toBe("START:");
    expect(lines[3]).toBe(startExpression("mcp-_1_1", "_1_1"));
  });
});

describe("one held export read by both legs, then dropped (node:vm, the stub)", () => {
  it("SDK reads and the plan's STATUS/CHUNK read the same text; the drop leaves STATUS null and CHUNK missing", async () => {
    const ctx = page("_1_1");
    const key = heldKey("_1_1");
    await evaluate(ctx, startExpression(key, "_1_1", { bbC: "_1_1" }));
    const s = await waitDone(ctx, key);
    expect(s).toMatchObject({ state: "done", length: 626, bytes: 627, sha256: DRY_SHA });
    const sdk = (await evaluate(ctx, chunkExpression(key, 0, 100_000))) as string;
    // the MCP leg: only the plan's expressions, no START
    const lines = mcpPlanLines(parseCourseArg("_1_1"), { held: true });
    const status = (await evaluate(ctx, section(lines, "STATUS:")[0]!)) as Record<string, unknown>;
    expect(status).toEqual(s);
    const c = lines.findIndex((l) => l.startsWith("CHUNK ("));
    const mcp = (await evaluate(ctx, lines[c + 1]!)) as string;
    expect(mcp).toBe(sdk);
    expect(createHash("sha256").update(mcp, "utf8").digest("hex")).toBe(DRY_SHA);
    // only one export was ever built in the page
    expect(Object.keys((ctx as unknown as { __bridgeExport: object }).__bridgeExport)).toEqual([key]);
    expect(await evaluate(ctx, dropExpression(key))).toBe("dropped");
    expect(await evaluate(ctx, statusExpression(key))).toBeNull();
    expect(await evaluate(ctx, chunkExpression(key, 0, 8000))).toEqual({ missing: true });
  });
});

describe("the printed lines", () => {
  it("heldLine and keptHeldLine name the key, the handle and the drop command", () => {
    expect(heldLine("held-pp1", "T391", "pp1")).toBe(
      "held export under key held-pp1 in T391 (page memory, built once; the MCP leg reads it: --mcp-plan --hold; drop it after both reads: pp1 --drop-held T391)",
    );
    expect(keptHeldLine("T391")).toBe("kept T391 open with bb loaded and the export held for the MCP leg; released when this script exits");
  });
  it("heldFoundLine: a done export; null or not done throws", () => {
    expect(heldFoundLine("held-pp1", "T5", { state: "done", length: 626, bytes: 627, sha256: DRY_SHA })).toBe(
      `held export held-pp1 in T5: done, 626 characters, 627 bytes, sha256 ${DRY_SHA}`,
    );
    expect(() => heldFoundLine("held-pp1", "T5", null)).toThrow(/no held export under key held-pp1 in T5/);
    expect(() => heldFoundLine("held-pp1", "T5", { state: "running" })).toThrow(/"running", not done/);
  });
  it("droppedLine: 'dropped' and STATUS null after; anything else throws", () => {
    expect(droppedLine("held-pp1", "T5", "dropped", null)).toBe("dropped the held export held-pp1 from T5; STATUS on held-pp1 now: gone (null)");
    expect(() => droppedLine("held-pp1", "T5", "dropped", { state: "done" })).toThrow(/still answers state "done"/);
    expect(() => droppedLine("held-pp1", "T5", undefined, null)).toThrow(/not "dropped"/);
  });
});

describe("checkHeldTab (the drop acts only on the recipe's unheld course tab)", () => {
  const ada = "https://ada.blackboard.com/ultra/courses/_1_1/outline";
  it("live: unheld and on an ada course page", () => {
    expect(() => checkHeldTab({ url: ada }, "T5", parseCourseArg("pp1"), false)).not.toThrow();
    expect(() => checkHeldTab(undefined, "T5", parseCourseArg("pp1"), false)).toThrow(/no open tab T5/);
    expect(() => checkHeldTab({ url: ada, owner: "claude-code #1" }, "T5", parseCourseArg("pp1"), false)).toThrow(/held by/);
    expect(() => checkHeldTab({ url: "http://localhost:8080/e2e-playground.html" }, "T5", parseCourseArg("pp1"), false)).toThrow(/not on an ada course page/);
  });
  it("dry run: the fixture page opened for that course id, never ada", () => {
    const dry = "http://localhost:8080/e2e-playground.html?s6=bb-dry-_1_1";
    expect(() => checkHeldTab({ url: dry }, "T5", parseCourseArg("_1_1"), true)).not.toThrow();
    expect(() => checkHeldTab({ url: dry.replace("bb-dry-_1_1", "bb-dry-other") }, "T5", parseCourseArg("_1_1"), true)).toThrow(Refusal);
    expect(() => checkHeldTab({ url: ada }, "T5", parseCourseArg("_1_1"), true)).toThrow(Refusal);
  });
  it("its messages carry no URL", () => {
    try {
      checkHeldTab({ url: "https://mail.example.com/secret?t=1" }, "T5", parseCourseArg("pp1"), false);
    } catch (e) {
      expect(String(e)).not.toContain("example.com");
    }
  });
});

describe("the flags (#103)", () => {
  it("--hold and --drop-held parse; defaults off", () => {
    expect(parseBbArgs(["pp1"])).toMatchObject({ hold: false });
    expect(parseBbArgs(["pp1"]).dropHeld).toBeUndefined();
    expect(parseBbArgs(["pp1", "--hold"]).hold).toBe(true);
    expect(parseBbArgs(["pp1", "--mcp-plan", "--hold"])).toMatchObject({ mcpPlan: true, hold: true });
    expect(parseBbArgs(["pp1", "--drop-held", "T391"]).dropHeld).toBe("T391");
  });
  it("--drop-held needs a T<n> handle", () => {
    expect(() => parseBbArgs(["pp1", "--drop-held"])).toThrow(Refusal);
    expect(() => parseBbArgs(["pp1", "--drop-held", "391"])).toThrow(Refusal);
    expect(() => parseBbArgs(["pp1", "--drop-held", "T1x"])).toThrow(Refusal);
  });
  it("--drop-held runs alone; --hold with --mcp-plan or --keep-open is allowed", () => {
    for (const extra of [["--hold"], ["--mcp-plan"], ["--keep-open"], ["--overwrite"], ["--bbjs", "x.js"]]) {
      expect(() => checkHoldFlags(parseBbArgs(["pp1", "--drop-held", "T5", ...extra])), extra.join(" ")).toThrow(Refusal);
    }
    expect(() => checkHoldFlags(parseBbArgs(["_1_1", "--drop-held", "T5", "--dry-run"]))).not.toThrow();
    expect(() => checkHoldFlags(parseBbArgs(["pp1", "--hold", "--keep-open"]))).not.toThrow();
    expect(() => checkHoldFlags(parseBbArgs(["pp1", "--mcp-plan", "--hold"]))).not.toThrow();
    expect(() => checkHoldFlags(parseBbArgs(["pp1"]))).not.toThrow();
  });
});

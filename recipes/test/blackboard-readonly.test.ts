// Tests for recipes/blackboard/readonly.ts — the read-only allowlist and the page-side export
// (Step 8 S6, phase doc 0.7: the first Blackboard jobs are read-only). The page function runs here in a
// node:vm context against recipes/blackboard/stub-bb.js, so the whole export flow is exercised offline.
import { readFileSync } from "node:fs";
import { createHash, webcrypto } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  chunkExpression,
  courseConfirmPath,
  courseGetExpression,
  courseLookupPath,
  EXPORT_FORMAT,
  exportKey,
  PAGE_EXPORT_SRC,
  READ_ALLOWLIST,
  READ_FUNCTIONS,
  requireReadOp,
  resolvePath,
  startExpression,
  statusExpression,
  validateAllowlist,
} from "../blackboard/readonly.js";
import { RETURN_RE } from "../../extension/src/evaluate/wrap.js";

const here = dirname(fileURLToPath(import.meta.url));
const STUB = readFileSync(join(here, "..", "blackboard", "stub-bb.js"), "utf8");

/** A fresh page-like global with the stub loaded for `course`. */
function page(course: string, opts: { loadStub?: boolean } = {}): vm.Context {
  const ctx: Record<string, unknown> = { crypto: webcrypto, TextEncoder, console: { log() {} }, setTimeout, Date };
  ctx.window = ctx;
  ctx.BB_COURSE = course;
  const context = vm.createContext(ctx);
  if (opts.loadStub !== false) vm.runInContext(STUB, context);
  return context;
}

/** Runs an expression as the extension would: a `return`-bearing one inside an async IIFE. */
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

describe("the allowlist", () => {
  it("names only GET-only bb functions", () => {
    expect([...READ_FUNCTIONS].sort()).toEqual(["all", "get"]);
    for (const op of Object.values(READ_ALLOWLIST)) expect(READ_FUNCTIONS).toContain(op.fn);
  });
  it("is exactly the gradebook reads export-grades uses", () => {
    expect(Object.keys(READ_ALLOWLIST).sort()).toEqual(["columnGrades", "columns"]);
    expect(READ_ALLOWLIST.columns).toEqual({ fn: "all", path: "/gradebook/columns" });
    expect(READ_ALLOWLIST.columnGrades).toEqual({ fn: "all", path: "/gradebook/columns/{col}/users" });
    expect(Object.isFrozen(READ_ALLOWLIST)).toBe(true);
  });
  it("validateAllowlist accepts it and refuses write functions or odd paths", () => {
    expect(() => validateAllowlist(READ_ALLOWLIST)).not.toThrow();
    for (const fn of ["post", "patch", "put", "del", "grade", "clearGrade", "column", "deleteColumn", "gradeFeedback"]) {
      expect(() => validateAllowlist({ x: { fn, path: "/gradebook/columns" } as never }), fn).toThrow(/not a read/);
    }
    expect(() => validateAllowlist({ x: { fn: "all", path: "/announcements" } })).toThrow(/path/);
    expect(() => validateAllowlist({ x: { fn: "all", path: "/gradebook/columns/../x" } })).toThrow(/path/);
    expect(() => validateAllowlist({ x: { fn: "all", path: "https://evil/gradebook/columns" } })).toThrow(/path/);
  });
  it("requireReadOp throws for anything outside it — before any page call", () => {
    expect(requireReadOp("columns")).toBe(READ_ALLOWLIST.columns);
    for (const bad of ["post", "grade", "toString", "__proto__", "constructor", "discover", "state"]) {
      expect(() => requireReadOp(bad), bad).toThrow(/not in the read-only allowlist/);
    }
  });
  it("startExpression refuses an op outside the allowlist", () => {
    expect(() => startExpression("k", "_1_1", ["columns", "grade"])).toThrow(/not in the read-only allowlist/);
  });
  it("resolvePath fills a validated column id only", () => {
    expect(resolvePath(READ_ALLOWLIST.columns)).toBe("/gradebook/columns");
    expect(resolvePath(READ_ALLOWLIST.columnGrades, "_33_1")).toBe("/gradebook/columns/_33_1/users");
    expect(() => resolvePath(READ_ALLOWLIST.columnGrades, "_33_1/../../x")).toThrow(/column id/);
    expect(() => resolvePath(READ_ALLOWLIST.columnGrades)).toThrow(/column id/);
    expect(() => resolvePath(READ_ALLOWLIST.columns, "_1_1")).toThrow(/takes no/);
  });
});

describe("the expressions", () => {
  it("status and chunk expressions carry no `return` (so the extension does not wrap them)", () => {
    expect(RETURN_RE.test(statusExpression("sdk-_1_1"))).toBe(false);
    expect(RETURN_RE.test(chunkExpression("sdk-_1_1", 0, 100))).toBe(false);
  });
  it("the start expression returns its value explicitly (it is wrapped)", () => {
    expect(startExpression("sdk-_1_1", "_1_1").startsWith("return (")).toBe(true);
  });
  it("names the key and the range literally", () => {
    expect(chunkExpression("mcp-_1_1", 16000, 32000)).toBe(
      '((e) => (e && typeof e.text === "string") ? e.text.slice(16000, 32000) : ({ missing: true }))((window.__bridgeExport || {})["mcp-_1_1"])',
    );
    expect(() => chunkExpression("mcp-_1_1", 10, 5)).toThrow();
  });
  it("the page code is a literal source string: no keepNames helper (tsx adds __name to String(fn))", () => {
    expect(PAGE_EXPORT_SRC.startsWith("function bridgeGradesExport(cfg) {")).toBe(true);
    expect(startExpression("k", "_1_1")).not.toMatch(/__name|__async|__publicField/);
    // It parses on its own as a function expression.
    expect(() => new vm.Script(`(${PAGE_EXPORT_SRC})`)).not.toThrow();
  });
  it("a chunk with no finished export answers {missing: true}, never throws (no PAGE_ERROR report on Blackboard)", async () => {
    const ctx = page("_42_1");
    expect(await evaluate(ctx, chunkExpression("sdk-_42_1", 0, 10))).toEqual({ missing: true });
  });
  it("exportKey", () => {
    expect(exportKey("sdk", "_1_1")).toBe("sdk-_1_1");
    expect(exportKey("mcp", "_1_1")).toBe("mcp-_1_1");
  });
});

describe("the page-side export against the stub", () => {
  it("builds the canonical export and its sha256", async () => {
    const ctx = page("_42_1");
    const started = await evaluate(ctx, startExpression("sdk-_42_1", "_42_1"));
    expect(started).toEqual({ state: "running", key: "sdk-_42_1" });
    const s = await waitDone(ctx, "sdk-_42_1");
    expect(s.state).toBe("done");
    const text = (await evaluate(ctx, chunkExpression("sdk-_42_1", 0, s.length as number))) as string;
    expect(text.length).toBe(s.length);
    expect(Buffer.byteLength(text, "utf8")).toBe(s.bytes);
    expect(createHash("sha256").update(text, "utf8").digest("hex")).toBe(s.sha256);
    const obj = JSON.parse(text);
    expect(obj.format).toBe(EXPORT_FORMAT);
    expect(obj.course).toBe("_42_1");
    expect(obj.bbVersion).toMatch(/^stub-/);
    expect(s.columns).toBe(obj.columns.length);
    expect(s.grades).toBe(obj.columns.reduce((n: number, c: { grades: unknown[] }) => n + c.grades.length, 0));
    // sorted by column id and user id
    const ids = obj.columns.map((c: { column: { id: string } }) => c.column.id);
    expect(ids).toEqual([...ids].sort());
    // the stub's column with a malformed id is skipped and counted
    expect(obj.columnsSkipped).toBe(1);
  });
  it("is deterministic: two runs give the same bytes (the SDK leg and the MCP leg compare by hash)", async () => {
    const ctx = page("_42_1");
    await evaluate(ctx, startExpression("sdk-_42_1", "_42_1"));
    await evaluate(ctx, startExpression("mcp-_42_1", "_42_1"));
    const a = await waitDone(ctx, "sdk-_42_1");
    const b = await waitDone(ctx, "mcp-_42_1");
    expect(a.sha256).toBe(b.sha256);
  });
  it("touches only bb.all, bb.P2, bb.C and bb.VERSION", async () => {
    const ctx = page("_42_1");
    const touched = new Set<string>();
    vm.runInContext(
      "window.__realBb = window.bb; window.bb = new Proxy(window.__realBb, { get(t, k) { window.__touched.push(String(k)); return t[k]; } });",
      Object.assign(ctx, { __touched: [] as string[] }),
    );
    await evaluate(ctx, startExpression("sdk-_42_1", "_42_1"));
    await waitDone(ctx, "sdk-_42_1");
    for (const k of (ctx as unknown as { __touched: string[] }).__touched) touched.add(k);
    expect([...touched].sort()).toEqual(["C", "P2", "VERSION", "all"]);
    expect(((ctx as unknown as { bb: { writes: number } }).bb as { writes: number }).writes).toBe(0);
  });
  it("refuses when bb is on another course", async () => {
    const ctx = page("_43_1");
    await evaluate(ctx, startExpression("sdk-_42_1", "_42_1"));
    const s = await waitDone(ctx, "sdk-_42_1");
    expect(s.state).toBe("error");
    expect(s.error).toMatch(/^bridge: bb is on another course/);
  });
  it("refuses when bb is not loaded", async () => {
    const ctx = page("_42_1", { loadStub: false });
    await evaluate(ctx, startExpression("sdk-_42_1", "_42_1"));
    const s = await waitDone(ctx, "sdk-_42_1");
    expect(s.state).toBe("error");
    expect(s.error).toMatch(/^bridge: bb is not loaded/);
  });
  it("the page-side dispatcher refuses an op the node side did not allow", async () => {
    const ctx = page("_42_1");
    // A hand-made cfg without columnGrades: the export must fail on the page, not call anything else.
    const expr = startExpression("sdk-_42_1", "_42_1", ["columns"]);
    await evaluate(ctx, expr);
    const s = await waitDone(ctx, "sdk-_42_1");
    expect(s.state).toBe("error");
    expect(s.error).toMatch(/^bridge: read op not allowed: columnGrades/);
  });
  it("the stub refuses every write function", () => {
    const ctx = page("_42_1");
    for (const fn of ["post", "patch", "put", "del", "grade", "clearGrade", "column", "deleteColumn"]) {
      expect(() => vm.runInContext(`window.bb.${fn}('/x', {})`, ctx), fn).toThrow(/stub: write refused/);
    }
  });
});

// ── Added 2026-10-23 by the S6 fixer (round 1), decision #96: course "pp1" ──────────────────────────────

describe("the dry-run export is unchanged by the label/bbC split (SDK-7D's pre-registered hash)", () => {
  it("_1_1 still gives 627 bytes, sha256 92fe62ab…a49c, 2 columns, 4 grades", async () => {
    const ctx = page("_1_1");
    await evaluate(ctx, startExpression("sdk-_1_1", "_1_1"));
    const s = await waitDone(ctx, "sdk-_1_1");
    expect(s).toMatchObject({
      state: "done",
      bytes: 627,
      length: 626,
      columns: 2,
      grades: 4,
      sha256: "92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c",
    });
  });
});

describe("a labelled course (a key like pp1): the export never carries the resolved id", () => {
  it("the SDK leg (bbC = the resolved id) exports under the label; the id is only in the start expression", async () => {
    const ctx = page("_42_1");
    const expr = startExpression("sdk-pp1", "pp1", { bbC: "_42_1" });
    await evaluate(ctx, expr);
    const s = await waitDone(ctx, "sdk-pp1");
    expect(s.state).toBe("done");
    const text = (await evaluate(ctx, chunkExpression("sdk-pp1", 0, s.length as number))) as string;
    expect(JSON.parse(text).course).toBe("pp1");
    expect(text).not.toContain("_42_1");
  });
  it("the SDK leg refuses a tab whose bb is on another course", async () => {
    const ctx = page("_43_1");
    await evaluate(ctx, startExpression("sdk-pp1", "pp1", { bbC: "_42_1" }));
    const s = await waitDone(ctx, "sdk-pp1");
    expect(s.state).toBe("error");
    expect(s.error).toBe("bridge: bb is on another course than pp1");
  });
  it("the MCP leg (no id: bbC null) runs only on a tab the SDK leg booted for that label, and matches its bytes", async () => {
    const ctx = page("_42_1");
    vm.runInContext('window.__bridgeCourseLabel = "pp1";', ctx);
    await evaluate(ctx, startExpression("sdk-pp1", "pp1", { bbC: "_42_1" }));
    const mcpExpr = startExpression("mcp-pp1", "pp1", { bbC: null });
    expect(mcpExpr).not.toMatch(/_42_1/);
    await evaluate(ctx, mcpExpr);
    const a = await waitDone(ctx, "sdk-pp1");
    const b = await waitDone(ctx, "mcp-pp1");
    expect(b.state).toBe("done");
    expect(b.sha256).toBe(a.sha256);
  });
  it("the MCP leg refuses a tab without the label mark (not booted by the SDK leg)", async () => {
    const ctx = page("_42_1");
    await evaluate(ctx, startExpression("mcp-pp1", "pp1", { bbC: null }));
    const s = await waitDone(ctx, "mcp-pp1");
    expect(s.state).toBe("error");
    expect(s.error).toMatch(/^bridge: this tab was not booted for course pp1/);
  });
  it("a labelled start requires bbC to be given (an id or null) and refuses a bad one", () => {
    expect(() => startExpression("sdk-pp1", "pp1")).toThrow(/bbC/);
    expect(() => startExpression("sdk-pp1", "pp1", { bbC: "pp2" })).toThrow(/bbC/);
  });
  it("exportKey takes an id or a lower-case key label, nothing else", () => {
    expect(exportKey("sdk", "pp1")).toBe("sdk-pp1");
    expect(exportKey("mcp", "pp1")).toBe("mcp-pp1");
    for (const bad of ["PP1", "pp1/x", "../x", "pp-1", ""]) expect(() => exportKey("sdk", bad), bad).toThrow();
  });
});

describe("course resolution: one read-only GET, only the id comes back", () => {
  it("the lookup paths are fixed v3 course reads", () => {
    expect(courseLookupPath("pp1")).toBe("/learn/api/public/v3/courses/courseId:pp1?fields=id");
    expect(courseConfirmPath("_42_1")).toBe("/learn/api/public/v3/courses/_42_1?fields=id");
    expect(() => courseLookupPath("pp1/../x")).toThrow();
    expect(() => courseLookupPath("_1_1")).toThrow();
    expect(() => courseConfirmPath("pp1")).toThrow();
  });
  it("courseGetExpression refuses any path that is not one of the two", () => {
    for (const bad of [
      "/learn/api/public/v3/courses/courseId:pp1",
      "/learn/api/public/v1/users/me",
      "/learn/api/public/v2/courses/_1_1/gradebook/columns",
      "https://evil.example/learn/api/public/v3/courses/_1_1?fields=id",
      "/learn/api/public/v3/courses/_1_1?fields=id&x=1",
    ]) {
      expect(() => courseGetExpression(bad), bad).toThrow(/not a course lookup/);
    }
  });

  /** A page whose fetch records each call and answers from `routes`. */
  function lookupPage(routes: Record<string, { status: number; body: unknown }>): { ctx: vm.Context; calls: Array<{ url: string; init: unknown }> } {
    const calls: Array<{ url: string; init: unknown }> = [];
    const ctx = vm.createContext({
      fetch: async (url: string, init: unknown) => {
        calls.push({ url, init });
        const r = routes[url] ?? { status: 404, body: { status: 404 } };
        return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
      },
    });
    return { ctx, calls };
  }

  it("a GET with credentials, no body; answers {status, id} with a validated _N_N id only", async () => {
    const path = courseLookupPath("pp1");
    const { ctx, calls } = lookupPage({ [path]: { status: 200, body: { id: "_42_1", name: "SECRET TITLE", courseId: "x" } } });
    const r = await evaluate(ctx, courseGetExpression(path));
    expect(r).toEqual({ status: 200, id: "_42_1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(path);
    expect(calls[0]!.init).toEqual({ method: "GET", credentials: "include", headers: { Accept: "application/json" } });
  });
  it("a 404, a 401 or a body without a valid id gives id null (never the body)", async () => {
    const path = courseLookupPath("pp1");
    expect(await evaluate(lookupPage({}).ctx, courseGetExpression(path))).toEqual({ status: 404, id: null });
    expect(await evaluate(lookupPage({ [path]: { status: 401, body: { message: "SECRET" } } }).ctx, courseGetExpression(path))).toEqual({ status: 401, id: null });
    expect(await evaluate(lookupPage({ [path]: { status: 200, body: { id: "<script>" } } }).ctx, courseGetExpression(path))).toEqual({ status: 200, id: null });
  });
  it("never throws in the page (a throw would be a PAGE_ERROR with a report)", async () => {
    const ctx = vm.createContext({ fetch: async () => { throw new Error("network down"); } });
    expect(await evaluate(ctx, courseGetExpression(courseLookupPath("pp1")))).toEqual({ status: 0, id: null });
  });
});

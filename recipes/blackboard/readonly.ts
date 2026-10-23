// recipes/blackboard/readonly.ts — the read-only allowlist of bb.js calls and the page-side export of
// recipes/blackboard/export-grades.ts (Step 8 S6, phase doc 0.7: "chosen because it is read-only").
// Written 2026-10-23 with its tests (recipes/test/blackboard-readonly.test.ts), which run the page code
// in node:vm against recipes/blackboard/stub-bb.js.
//
// Read-only by construction:
// - the only bb.js functions the export may call are `bb.all` and `bb.get`, both GET-only in bb.js
//   (`call('GET', …)`; `bb.all` follows `paging.nextPage` with GET), on the paths in READ_ALLOWLIST,
//   relative to `bb.P2` (`/learn/api/public/v2/courses/<course>`);
// - the node side builds the page code only from ops that pass `requireReadOp` — any other name throws
//   before anything is sent to the page;
// - the page code carries the allowed ops as data and its dispatcher refuses any op it was not given,
//   any function but `all`/`get`, and any column id that is not `_N_N`;
// - the page code (PAGE_EXPORT_SRC) touches `bb.all`, `bb.P2`, `bb.C` and `bb.VERSION` only (pinned by a test with a Proxy).
//
// The export is canonical (keys sorted, columns by id, grades by userId) and holds no timestamp, so two
// exports of unchanged data are byte-identical — SDK-7 compares the SDK leg and the MCP leg by sha256.
// The text stays in the page at `window.__bridgeExport[<key>]`; callers pull it in chunks.

export const READ_FUNCTIONS = Object.freeze(["all", "get"] as const);
export type ReadFunction = (typeof READ_FUNCTIONS)[number];

export interface ReadOp {
  /** The bb.js function: GET-only. */
  fn: ReadFunction;
  /** A path under `bb.P2`; `{col}` is replaced by a validated column id. */
  path: string;
}

export const READ_ALLOWLIST: Readonly<Record<string, ReadOp>> = Object.freeze({
  columns: Object.freeze({ fn: "all", path: "/gradebook/columns" }) as ReadOp,
  columnGrades: Object.freeze({ fn: "all", path: "/gradebook/columns/{col}/users" }) as ReadOp,
});

export const EXPORT_FORMAT = "bridge-grades/1";
const COLUMN_ID_RE = /^_\d+_\d+$/;
const PATH_RE = /^\/gradebook\/columns(\/\{col\}\/users)?$/;

/** Throws unless every op calls a GET-only function on a gradebook read path. */
export function validateAllowlist(list: Readonly<Record<string, ReadOp>>): void {
  for (const [name, op] of Object.entries(list)) {
    if (!(READ_FUNCTIONS as readonly string[]).includes(op.fn)) throw new Error(`op ${name}: ${String(op.fn)} is not a read function`);
    if (!PATH_RE.test(op.path)) throw new Error(`op ${name}: path is not an allowed gradebook read path`);
  }
}

validateAllowlist(READ_ALLOWLIST);

/** The allowlisted op of that name; anything else throws (nothing reaches the page). */
export function requireReadOp(name: string): ReadOp {
  if (!Object.prototype.hasOwnProperty.call(READ_ALLOWLIST, name)) {
    throw new Error(`bb op "${name}" is not in the read-only allowlist (${Object.keys(READ_ALLOWLIST).join(", ")})`);
  }
  return READ_ALLOWLIST[name]!;
}

/** The op's path with `{col}` filled (node side; the page dispatcher applies the same rule). */
export function resolvePath(op: ReadOp, col?: string): string {
  if (!op.path.includes("{col}")) {
    if (col !== undefined) throw new Error("this op takes no column id");
    return op.path;
  }
  if (col === undefined || !COLUMN_ID_RE.test(col)) throw new Error("bad column id (expected _N_N)");
  return op.path.replace("{col}", col);
}

/** A course as the recipes print and file it: an id `_N_N`, or a lower-case key label (`pp1`, #96). */
export const COURSE_LABEL_RE = /^(_\d+_\d+|[a-z][a-z0-9]{0,31})$/;

/** `held` (added 2026-10-23, #103): the one export the SDK leg builds with `--hold` and both legs read. */
export function exportKey(leg: "sdk" | "mcp" | "held", course: string): string {
  if (!COURSE_LABEL_RE.test(course)) throw new Error("not a course id or label");
  return `${leg}-${course}`;
}

interface PageConfig {
  key: string;
  /** The label the export carries (`_N_N` for an id given on the command line, else the key label). */
  course: string;
  /** The id `bb.C` must equal, or null: then the tab must carry the SDK leg's label mark (MCP leg). */
  bbC: string | null;
  format: string;
  ops: Record<string, ReadOp>;
}

/**
 * The page function, as JavaScript source text. It is a string, not `String(fn)` of a TypeScript
 * function: tsx compiles with esbuild's keepNames, which wraps inner functions in a module-level
 * `__name(…)` helper, so `String(fn)` run under tsx is not self-contained in the page (found
 * 2026-10-23 by running the --mcp-plan output in node:vm: `ReferenceError: __name is not defined`;
 * vitest does not add keepNames, so its tests passed). A literal string ships the same bytes under
 * tsx and vitest. It uses only `globalThis`, `crypto.subtle` and `TextEncoder`; it starts the export and
 * returns at once; the result lands in `globalThis.__bridgeExport[cfg.key]`. No template literals or
 * `${` inside (String.raw below).
 */
export const PAGE_EXPORT_SRC = String.raw`function bridgeGradesExport(cfg) {
  var g = globalThis;
  var store = g.__bridgeExport || (g.__bridgeExport = {});
  var entry = { state: "running" };
  store[cfg.key] = entry;
  var colRe = /^_\d+_\d+$/;
  function fail(m) { throw new Error("bridge: " + m); }
  function read(name, col) {
    var op = Object.prototype.hasOwnProperty.call(cfg.ops, name) ? cfg.ops[name] : undefined;
    if (!op) return Promise.reject(new Error("bridge: read op not allowed: " + name));
    if (op.fn !== "all" && op.fn !== "get") return Promise.reject(new Error("bridge: read function not allowed: " + op.fn));
    var path = op.path;
    if (path.indexOf("{col}") >= 0) {
      if (!colRe.test(String(col))) return Promise.reject(new Error("bridge: bad column id"));
      path = path.replace("{col}", String(col));
    }
    var bb = g.bb;
    return bb[op.fn](bb.P2 + path);
  }
  function canon(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
    var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort();
    return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + canon(v[k]); }).join(",") + "}";
  }
  function byKey(a, b, k) {
    var x = String(a[k]), y = String(b[k]);
    return x < y ? -1 : x > y ? 1 : 0;
  }
  (async function () {
    try {
      var bb = g.bb;
      if (!bb || typeof bb.all !== "function") fail("bb is not loaded — run the boot step first");
      if (cfg.bbC) {
        if (bb.C !== cfg.bbC) fail("bb is on another course than " + cfg.course);
      } else if (g.__bridgeCourseLabel !== cfg.course) {
        fail("this tab was not booted for course " + cfg.course + " (run the SDK leg with --keep-open first)");
      }
      var cols = await read("columns");
      if (!Array.isArray(cols)) fail("the columns read did not return a list");
      var valid = cols.filter(function (c) { return c && colRe.test(String(c.id)); });
      var results = new Array(valid.length);
      var next = 0;
      async function worker() {
        while (next < valid.length) {
          var i = next++;
          var gs = await read("columnGrades", String(valid[i].id));
          if (!Array.isArray(gs)) fail("a grades read did not return a list");
          results[i] = gs.slice().sort(function (a, b) { return byKey(a, b, "userId"); });
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
      var columns = valid
        .map(function (c, i) { return { column: c, grades: results[i] }; })
        .sort(function (a, b) { return byKey(a.column, b.column, "id"); });
      var grades = 0;
      for (var j = 0; j < columns.length; j++) grades += columns[j].grades.length;
      var text = canon({
        format: cfg.format,
        course: cfg.course,
        bbVersion: String(bb.VERSION),
        columnsSkipped: cols.length - valid.length,
        columns: columns,
      });
      var bytes = new TextEncoder().encode(text);
      var digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      var hex = "";
      for (var d = 0; d < digest.length; d++) hex += (digest[d] < 16 ? "0" : "") + digest[d].toString(16);
      entry.text = text;
      entry.length = text.length;
      entry.bytes = bytes.length;
      entry.sha256 = hex;
      entry.columns = columns.length;
      entry.grades = grades;
      entry.state = "done";
    } catch (e) {
      entry.error = String((e && e.message) || e).slice(0, 200);
      entry.state = "error";
    }
  })();
  return { state: "running", key: cfg.key };
}`;

/**
 * The expression that starts an export in the tab (`return (…)`, so the extension's `return` wrapper
 * hands back the value). Every op name must pass `requireReadOp`, else this throws and nothing is sent.
 */
export function startExpression(
  key: string,
  course: string,
  optsOrOps: { bbC?: string | null; ops?: string[] } | string[] = {},
): string {
  const opts = Array.isArray(optsOrOps) ? { ops: optsOrOps } : optsOrOps;
  const opNames = opts.ops ?? ["columns", "columnGrades"];
  if (!COURSE_LABEL_RE.test(course)) throw new Error("not a course id or label");
  // An id given on the command line is its own label and bb.C must equal it (the pre-#96 behaviour, so
  // SDK-7D's bytes are unchanged). A key label needs bbC said explicitly: the resolved id (SDK leg) or
  // null (MCP leg: the tab must carry the label mark the SDK leg set).
  let bbC: string | null;
  if (COLUMN_ID_RE.test(course)) bbC = course;
  else if (opts.bbC === undefined) throw new Error("a labelled course needs bbC (the resolved id, or null for the MCP leg)");
  else bbC = opts.bbC;
  if (bbC !== null && !COLUMN_ID_RE.test(bbC)) throw new Error("bbC is not a course id");
  const ops: Record<string, ReadOp> = {};
  for (const name of opNames) ops[name] = { ...requireReadOp(name) };
  validateAllowlist(ops);
  const cfg: PageConfig = { key, course, bbC, format: EXPORT_FORMAT, ops };
  return `return (${PAGE_EXPORT_SRC})(${JSON.stringify(cfg)});`;
}

// ── Course lookup (added 2026-10-23, S6 fixer round 1, #96) ──────────────────────────────────────────
// Read-only: one `fetch` with method GET, same-origin (the resolver tab is checked to be on ada first),
// on one of two fixed v3 course paths asking only for `id`. It answers `{status, id}`, where `id` is a
// validated `_N_N` or null — never the body, a title or a URL. It never throws in the page (a throw would
// be a PAGE_ERROR, and the SDK's report — off in these recipes anyway — would capture the page).

const COURSE_KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,31}$/;
const LOOKUP_PATH_RE = /^\/learn\/api\/public\/v3\/courses\/(courseId:[A-Za-z][A-Za-z0-9]{0,31}|_\d+_\d+)\?fields=id$/;

/** `GET /learn/api/public/v3/courses/courseId:<key>?fields=id` — the course whose courseId is the key. */
export function courseLookupPath(key: string): string {
  if (!COURSE_KEY_RE.test(key)) throw new Error("not a course key");
  return `/learn/api/public/v3/courses/courseId:${key}?fields=id`;
}

/** `GET /learn/api/public/v3/courses/<id>?fields=id` — confirms an id read from the skill's table. */
export function courseConfirmPath(id: string): string {
  if (!COLUMN_ID_RE.test(id)) throw new Error("not a course id");
  return `/learn/api/public/v3/courses/${id}?fields=id`;
}

export function courseGetExpression(path: string): string {
  if (!LOOKUP_PATH_RE.test(path)) throw new Error("not a course lookup path");
  const p = JSON.stringify(path);
  return [
    "let status = 0, id = null;",
    "try {",
    `  const r = await fetch(${p}, { method: "GET", credentials: "include", headers: { Accept: "application/json" } });`,
    "  status = r.status;",
    "  if (r.ok) {",
    "    const j = await r.json().catch(() => null);",
    "    if (j && typeof j.id === \"string\" && /^_\\d+_\\d+$/.test(j.id)) id = j.id;",
    "  }",
    "} catch (e) { status = 0; }",
    "return { status: status, id: id };",
  ].join("\n");
}

/** The export's state without its text. No `return` in it, so the extension sends it unwrapped. */
export function statusExpression(key: string): string {
  const k = JSON.stringify(key);
  return (
    `((e) => e ? ({ state: e.state, length: e.length, bytes: e.bytes, sha256: e.sha256, columns: e.columns, grades: e.grades, error: e.error }) : null)` +
    `((window.__bridgeExport || {})[${k}])`
  );
}

/**
 * One chunk of the export's text, `[start, end)`. No `return`. It never throws: with no finished export
 * under the key it returns `{missing: true}` (an object, so neither leg can mistake it for text). A
 * throw would be a `PAGE_ERROR`, and the MCP attaches a screenshot and a snapshot of the page — a
 * Blackboard page — to that report (S5 contract), which these recipes must never cause.
 */
export function chunkExpression(key: string, start: number, end: number): string {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) throw new Error("bad chunk range");
  return (
    `((e) => (e && typeof e.text === "string") ? e.text.slice(${start}, ${end}) : ({ missing: true }))` +
    `((window.__bridgeExport || {})[${JSON.stringify(key)}])`
  );
}

/** Drops the export's text from the page (after a successful pull). No `return`. */
export function dropExpression(key: string): string {
  return `(delete (window.__bridgeExport || {})[${JSON.stringify(key)}], "dropped")`;
}

// recipes/blackboard/guard.ts — the pure guards of the Blackboard recipes (Step 8 S6, phase doc 0.7):
// the course argument, the origin guard (before connecting, and again on the loaded page), the flags,
// and what the bb.js source declares. Written 2026-10-23 with its tests (recipes/test/blackboard-guard.test.ts).
//
// Rules (S6 stage-local rulings, S6.ledger.md):
// - a recipe runs only on https://ada.blackboard.com, on the course named on the command line; with
//   no course it refuses;
// - `--dry-run` accepts only http://localhost:<port> or http://127.0.0.1:<port> (the fixture page with
//   recipes/blackboard/stub-bb.js) and never Blackboard;
// - no message here carries a URL: a refusal names the rule, never the page (CLAUDE.md, never log a URL).

export const ADA_ORIGIN = "https://ada.blackboard.com";
export const COURSE_ID_RE = /^_\d+_\d+$/;
export const DEFAULT_FIXTURE_ORIGIN = "http://localhost:8080";
export const DEFAULT_TIMEOUT_S = 300;
/** The marker recipes/blackboard/stub-bb.js carries; a real run refuses a source that has it. */
export const STUB_MARKER = "BRIDGE-STUB-BB";

/** A refusal: the recipe stops before (or instead of) acting; exit code 2. */
export class Refusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Refusal";
  }
}

/** The course id from `_NNN_N` or an ada course URL; refuses anything else, and no argument. */
export function parseCourse(arg: string | undefined): string {
  if (arg === undefined || arg === "") {
    throw new Refusal("no course given — pass the course id (e.g. _12345_1) or its https://ada.blackboard.com/ultra/courses/<id>/… URL; the recipe never picks a course or a tab itself");
  }
  if (COURSE_ID_RE.test(arg)) return arg;
  let url: URL;
  try {
    url = new URL(arg);
  } catch {
    throw new Refusal("the course argument is neither a course id (_NNN_N) nor a URL");
  }
  if (url.origin !== ADA_ORIGIN) throw new Refusal(`the course URL is not on ${ADA_ORIGIN}`);
  const m = /^\/ultra\/courses\/(_\d+_\d+)(\/|$)/.exec(url.pathname);
  if (!m) throw new Refusal("the course URL has no /ultra/courses/<id> path");
  return m[1]!;
}

// ── Course keys (added 2026-10-23 by the S6 fixer, round 1; decision #96: the user names the course "pp1").
// A key is letters and digits, starting with a letter (no `_`, `.`, `-`, `:`, `/`, space). It is resolved
// to the course id on https://ada.blackboard.com by one read-only GET (readonly.ts courseGetExpression);
// the resolved id is kept in memory, never printed, written to a file name or recorded — the recipes
// print and file the course under its lower-case label (`pp1`).
export const COURSE_KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

export type CourseArg = { kind: "id"; id: string; label: string } | { kind: "key"; key: string; label: string };

/** A course id (`_N_N`), an ada course URL (→ its id), or a short course key; refuses anything else. */
export function parseCourseArg(arg: string | undefined): CourseArg {
  if (arg !== undefined && COURSE_KEY_RE.test(arg)) return { kind: "key", key: arg, label: arg.toLowerCase() };
  if (arg === undefined || arg === "") {
    throw new Refusal("no course given — pass the course id (e.g. _12345_1), its https://ada.blackboard.com/ultra/courses/<id>/… URL, or its short key (e.g. pp1); the recipe never picks a course or a tab itself");
  }
  let id: string;
  try {
    id = parseCourse(arg);
  } catch (err) {
    if (err instanceof Refusal && /neither a course id/.test(err.message)) {
      throw new Refusal("the course argument is neither a course id (_NNN_N), a URL, nor a short course key (letters and digits)");
    }
    throw err;
  }
  return { kind: "id", id, label: id };
}

/** A key is resolved only on ada: a dry run (localhost stub) takes a course id. */
export function refuseKeyDryRun(c: CourseArg, dryRun: boolean): void {
  if (dryRun && c.kind === "key") throw new Refusal(`a course key (${c.label}) is resolved only on ${ADA_ORIGIN}; a dry run takes a course id (_N_N)`);
}

/**
 * The page a key is resolved from: a public JSON API page on ada (no course, no student data on it), so
 * the lookup `fetch` runs same-origin with the user's cookies. A login redirect changes its address.
 */
export const RESOLVER_PATH = "/learn/api/public/v1/system/version";
export const RESOLVER_PAGE = `${ADA_ORIGIN}${RESOLVER_PATH}`;

/** After the resolver page loaded: still exactly that page on ada, else refused (the URL never printed). */
export function checkResolverTab(href: unknown): void {
  const url = parseUrl(href);
  if (url.origin !== ADA_ORIGIN || url.pathname !== RESOLVER_PATH) {
    throw new Refusal(`the resolver tab left ${ADA_ORIGIN}${RESOLVER_PATH} (a login page?) — log in to Blackboard in Chrome, then run the recipe again`);
  }
}

/**
 * The course id for `key` from the blackboard-ultra skill's course table (references/ada-instance.md,
 * read-only): the one table row whose repo folder (the last segment of the first `…` path in the "Repo"
 * cell) starts with `<key>-`, case-insensitively, and whose "Course id" cell is a backticked `_N_N`. No
 * row → null; two or more → refused. The message never names an id.
 */
export function courseIdFromSkillTable(markdown: string, key: string): string | null {
  if (!COURSE_KEY_RE.test(key)) throw new Refusal("not a course key");
  const rows = markdown.split(/\r?\n/).filter((l) => /^\s*\|.*\|\s*$/.test(l));
  let idCol = -1;
  let repoCol = -1;
  const found: string[] = [];
  for (const row of rows) {
    const cells = row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (idCol < 0) {
      const i = cells.findIndex((c) => /^course id$/i.test(c));
      const r = cells.findIndex((c) => /^repo\b/i.test(c));
      if (i >= 0 && r >= 0) {
        idCol = i;
        repoCol = r;
      }
      continue;
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const idCell = /^`(_\d+_\d+)`$/.exec(cells[idCol] ?? "");
    const pathCell = /`([^`]+)`/.exec(cells[repoCol] ?? "");
    if (!idCell || !pathCell) continue;
    const folder = pathCell[1]!.split(/[\\/]/).filter(Boolean).pop() ?? "";
    if (folder.toLowerCase().startsWith(`${key.toLowerCase()}-`)) found.push(idCell[1]!);
  }
  if (found.length > 1) throw new Refusal(`the skill's course table has ${found.length} rows for course key ${key.toLowerCase()} — ambiguous`);
  return found[0] ?? null;
}

function requireCourse(id: string): void {
  if (!COURSE_ID_RE.test(id)) throw new Refusal("not a course id");
}

/** The page the real recipes open: the course outline on ada. */
export function courseUrl(id: string): string {
  requireCourse(id);
  return `${ADA_ORIGIN}/ultra/courses/${id}/outline`;
}

function isLocalOrigin(url: URL): boolean {
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port !== "";
}

/** The page a dry run opens: the localhost fixture, marked for this course. */
export function dryRunUrl(id: string, fixtureOrigin: string): string {
  requireCourse(id);
  let origin: URL;
  try {
    origin = new URL(fixtureOrigin);
  } catch {
    throw new Refusal("--fixture-origin is not a URL");
  }
  if (!isLocalOrigin(origin)) throw new Refusal("a dry run uses only http://localhost:<port> or http://127.0.0.1:<port>");
  return `${origin.origin}/e2e-playground.html?s6=bb-dry-${id}`;
}

function parseUrl(href: unknown): URL {
  if (typeof href !== "string") throw new Refusal("the tab's address could not be read");
  try {
    return new URL(href);
  } catch {
    throw new Refusal("the address is not a URL");
  }
}

/** Before connecting: the URL the recipe will open must fit the mode. */
export function checkTargetUrl(href: string, dryRun: boolean): void {
  const url = parseUrl(href);
  if (dryRun) {
    if (!isLocalOrigin(url)) throw new Refusal("a dry run opens only http://localhost:<port> or http://127.0.0.1:<port> pages, never Blackboard");
    return;
  }
  if (url.origin !== ADA_ORIGIN) throw new Refusal(`a real run opens only ${ADA_ORIGIN} (use --dry-run for the localhost stub)`);
}

/**
 * After the page loaded (redirects followed): the tab must still be the course on ada (a login page,
 * another course or another site is refused), or in a dry run the fixture page opened for this course.
 */
export function checkLoadedTab(href: unknown, dryRun: boolean, course: string, label: string = course): void {
  const url = parseUrl(href);
  if (dryRun) {
    if (!isLocalOrigin(url)) throw new Refusal("the dry-run tab is not on a localhost page");
    if (url.searchParams.get("s6") !== `bb-dry-${course}`) throw new Refusal("the dry-run tab is not the page opened for this course");
    return;
  }
  if (url.origin !== ADA_ORIGIN) {
    throw new Refusal(`the tab left ${ADA_ORIGIN} (a login page?) — log in to Blackboard in Chrome, then run the recipe again`);
  }
  const m = /^\/ultra\/courses\/(_\d+_\d+)(\/|$)/.exec(url.pathname);
  if (!m || m[1] !== course) throw new Refusal(`the tab is not on course ${label} — check the course id`);
}

/** Whether `href` is a course page on ada (`/ultra/courses/<id>…`); never throws, never prints. */
export function isAdaCoursePage(href: unknown): boolean {
  if (typeof href !== "string") return false;
  try {
    const url = new URL(href);
    return url.origin === ADA_ORIGIN && /^\/ultra\/courses\/_\d+_\d+(\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

export interface BbArgs {
  course?: string;
  dryRun: boolean;
  bbjs?: string;
  fixtureOrigin: string;
  keepOpen: boolean;
  overwrite: boolean;
  timeoutS: number;
  mcpPlan: boolean;
  help: boolean;
  /** export-grades.ts (#103): build the export once and hold it in the page for both legs. */
  hold: boolean;
  /** export-grades.ts (#103): drop the held export from this tab (`T<n>`) after both reads. */
  dropHeld?: string;
}

const VALUE_FLAGS = new Set(["--bbjs", "--fixture-origin", "--timeout", "--drop-held"]);
const BOOL_FLAGS = new Set(["--dry-run", "--keep-open", "--overwrite", "--mcp-plan", "--hold", "--help", "-h"]);

/** The flags of boot-bb.ts and export-grades.ts (each uses its own subset; unknown flags are refused). */
export function parseBbArgs(argv: string[]): BbArgs {
  const out: BbArgs = {
    dryRun: false,
    fixtureOrigin: DEFAULT_FIXTURE_ORIGIN,
    keepOpen: false,
    overwrite: false,
    timeoutS: DEFAULT_TIMEOUT_S,
    mcpPlan: false,
    help: false,
    hold: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (VALUE_FLAGS.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Refusal(`${a} needs a value`);
      i++;
      if (a === "--bbjs") out.bbjs = v;
      else if (a === "--fixture-origin") out.fixtureOrigin = v;
      else if (a === "--drop-held") {
        if (!/^T\d+$/.test(v)) throw new Refusal("--drop-held needs the tab handle the SDK leg printed (T<n>)");
        out.dropHeld = v;
      } else {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 3600) throw new Refusal("--timeout is whole seconds from 1 to 3600");
        out.timeoutS = n;
      }
    } else if (BOOL_FLAGS.has(a)) {
      if (a === "--dry-run") out.dryRun = true;
      else if (a === "--keep-open") out.keepOpen = true;
      else if (a === "--overwrite") out.overwrite = true;
      else if (a === "--mcp-plan") out.mcpPlan = true;
      else if (a === "--hold") out.hold = true;
      else out.help = true;
    } else if (a.startsWith("-")) {
      throw new Refusal(`unknown flag ${a}`);
    } else if (out.course === undefined) {
      out.course = a;
    } else {
      throw new Refusal("one course only");
    }
  }
  return out;
}

/**
 * export-grades.ts's mode combinations (#103): `--drop-held` runs alone (the course, and `--dry-run` for the
 * stub); `--hold` builds and keeps the export (it implies --keep-open), `--mcp-plan --hold` plans the reads.
 */
export function checkHoldFlags(a: BbArgs): void {
  if (a.dropHeld !== undefined && (a.hold || a.mcpPlan || a.keepOpen || a.overwrite || a.bbjs !== undefined)) {
    throw new Refusal("--drop-held runs alone: the course and the handle (and --dry-run for the stub)");
  }
}

/** The `VERSION` a bb.js source declares (`const VERSION = '…'`), or null. */
export function declaredVersion(src: string): string | null {
  const m = /\bconst\s+VERSION\s*=\s*(['"])([^'"]+)\1/.exec(src);
  return m ? m[2]! : null;
}

export function isStubSource(src: string): boolean {
  return src.includes(STUB_MARKER);
}

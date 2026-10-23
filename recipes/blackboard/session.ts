// recipes/blackboard/session.ts — the shared steps of boot-bb.ts and export-grades.ts (Step 8 S6,
// phase doc 0.7): check the arguments and read the bb.js source before connecting; resolve a course key
// (e.g. "pp1", decision #96) to its id on ada by a read-only GET; open the course in a tab of the
// recipe's own (background); check the loaded page's origin and course; load bb.js by `evaluate` (no
// 8765 server, no `(0, eval)(await fetch…)`). Written 2026-10-23; key resolution added the same day by
// the S6 fixer (round 1).
//
// Never prints a URL, a title or page content of a Blackboard page; prints counts, versions, the course
// label and the tab's handle only. A course given as a key is printed and filed under its label; the
// id it resolves to stays in memory (never printed, logged or written to a file name). The pure rules
// are in guard.ts and readonly.ts (tested).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { BridgeClient, Tab } from "@bridge/sdk";
import {
  checkLoadedTab,
  checkResolverTab,
  checkTargetUrl,
  courseIdFromSkillTable,
  courseUrl,
  declaredVersion,
  dryRunUrl,
  isStubSource,
  parseCourseArg,
  refuseKeyDryRun,
  Refusal,
  RESOLVER_PAGE,
  type BbArgs,
  type CourseArg,
} from "./guard.js";
import { courseConfirmPath, courseGetExpression, courseLookupPath } from "./readonly.js";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "..", "..");
export const SKILL_DIR = join(homedir(), ".claude", "skills", "blackboard-ultra");
export const SKILL_BB_JS = join(SKILL_DIR, "scripts", "bb.js");
/** The skill's instance notes, whose course table maps a course to its id (read-only; #96). */
export const SKILL_COURSE_TABLE = join(SKILL_DIR, "references", "ada-instance.md");
export const STUB_BB_JS = join(HERE, "stub-bb.js");
const READY_TIMEOUT_MS = 30_000;

export interface Prepared {
  arg: CourseArg;
  /** What the recipe prints and files the course under: the id given, or the key's lower-case label. */
  label: string;
  dryRun: boolean;
  fixtureOrigin: string;
  bbjsPath: string;
  source: string;
  declared: string | null;
  sourceSha: string;
}

/** Everything that can be refused before connecting: the course, the mode's origin, the bb.js source. */
export function prepare(args: BbArgs): Prepared {
  const arg = parseCourseArg(args.course);
  refuseKeyDryRun(arg, args.dryRun);
  // A key is resolved on the ada resolver page first; an id opens its course page directly.
  const firstUrl = arg.kind === "key" ? RESOLVER_PAGE : args.dryRun ? dryRunUrl(arg.id, args.fixtureOrigin) : courseUrl(arg.id);
  checkTargetUrl(firstUrl, args.dryRun);
  const bbjsPath = resolve(args.bbjs ?? (args.dryRun ? STUB_BB_JS : SKILL_BB_JS));
  let source: string;
  try {
    source = readFileSync(bbjsPath, "utf8");
  } catch {
    throw new Refusal(`cannot read the bb.js source at ${bbjsPath}`);
  }
  if (!args.dryRun && isStubSource(source)) throw new Refusal("a real run refuses the stub bb.js (BRIDGE-STUB-BB) — pass the skill's bb.js");
  return {
    arg,
    label: arg.label,
    dryRun: args.dryRun,
    fixtureOrigin: args.fixtureOrigin,
    bbjsPath,
    source,
    declared: declaredVersion(source),
    sourceSha: createHash("sha256").update(source, "utf8").digest("hex"),
  };
}

export function describeSource(p: Prepared): string {
  return `${basename(p.bbjsPath)} (declares VERSION ${p.declared ?? "?"}, sha256 ${p.sourceSha.slice(0, 12)}…)`;
}

async function waitComplete(tab: Tab): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let state = "";
  while (Date.now() < deadline) {
    state = await tab.evaluate<string>("document.readyState").catch(() => "");
    if (state === "complete") return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Refusal(`the page did not finish loading within ${READY_TIMEOUT_MS / 1000} s`);
}

/**
 * The course id. An id given on the command line is returned as is. A key is resolved in a background
 * tab of the recipe's own on the ada resolver page (a public JSON page): (1) `GET …/v3/courses/
 * courseId:<key>?fields=id`; on a 404, (2) the skill's course table (ada-instance.md) names the id, and
 * `GET …/v3/courses/<id>?fields=id` must answer 200 with the same id. 401/403 = not logged in. Every
 * outcome but a resolved id is a refusal (exit 2). Prints `course: <label> (resolved)` and the source,
 * never the id.
 */
export async function resolveCourse(client: BridgeClient, p: Prepared, say: (m: string) => void): Promise<string> {
  if (p.arg.kind === "id") return p.arg.id;
  const key = p.arg.key;
  const tab = await client.newTab(RESOLVER_PAGE);
  say(`opened ${tab.handle} (background) on the ada resolver page for course ${p.label}`);
  try {
    await waitComplete(tab);
    checkResolverTab(await tab.evaluate<string>("location.href"));
    const get = async (path: string): Promise<{ status: number; id: string | null }> =>
      (await tab.evaluate<{ status: number; id: string | null }>(courseGetExpression(path), { timeoutMs: 15_000 })) ?? { status: 0, id: null };
    const first = await get(courseLookupPath(key));
    say(`course lookup by courseId → HTTP ${first.status}${first.id ? ", an id" : ", no id"}`);
    if (first.status === 401 || first.status === 403) {
      throw new Refusal(`not logged in to Blackboard (HTTP ${first.status}) — log in to https://ada.blackboard.com in Chrome, then run the recipe again`);
    }
    let id: string | null = null;
    let source = "";
    if (first.status === 200 && first.id) {
      id = first.id;
      source = "courseId lookup";
    } else if (first.status === 404) {
      let table = "";
      try {
        table = readFileSync(SKILL_COURSE_TABLE, "utf8");
      } catch {
        throw new Refusal(`course ${p.label} did not resolve: no course has courseId ${p.label}, and the skill's course table cannot be read`);
      }
      const fromTable = courseIdFromSkillTable(table, key);
      if (!fromTable) throw new Refusal(`course ${p.label} did not resolve: no course has courseId ${p.label}, and the skill's course table has no row for it`);
      const confirm = await get(courseConfirmPath(fromTable));
      say(`course confirm by id (from the skill's table) → HTTP ${confirm.status}${confirm.id === fromTable ? ", the same id" : ", not the same id"}`);
      if (confirm.status !== 200 || confirm.id !== fromTable) {
        throw new Refusal(`course ${p.label} did not resolve: the id in the skill's course table was not confirmed by Blackboard (HTTP ${confirm.status})`);
      }
      id = fromTable;
      source = "the skill's course table, confirmed by GET";
    } else {
      throw new Refusal(`course ${p.label} did not resolve (HTTP ${first.status})`);
    }
    say(`course: ${p.label} (resolved; by ${source}; the id is not printed)`);
    return id;
  } finally {
    await tab.close().catch(() => {});
    say(`closed ${tab.handle} (the resolver tab)`);
  }
}

/**
 * Opens the course page in a new background tab leased to this client, waits for it to load, and
 * checks where it landed (a login redirect or another course is refused, and the tab — ours — closed).
 */
export async function openCourse(client: BridgeClient, p: Prepared, courseId: string, say: (m: string) => void): Promise<Tab> {
  const tab = await client.newTab(p.dryRun ? dryRunUrl(courseId, p.fixtureOrigin) : courseUrl(courseId));
  say(`opened ${tab.handle} (background) for course ${p.label}${p.dryRun ? " — dry run on the localhost fixture" : ""}`);
  try {
    await waitComplete(tab);
    checkLoadedTab(await tab.evaluate<string>("location.href"), p.dryRun, courseId, p.label);
    say(`${tab.handle} loaded; origin and course checked`);
    return tab;
  } catch (err) {
    await tab.close().catch(() => {});
    say(`closed ${tab.handle} (the recipe's own tab)`);
    throw err;
  }
}

/**
 * Loads bb.js into the tab by evaluate and returns `bb.VERSION` as the page reports it. It also marks
 * the tab with the course label (`window.__bridgeCourseLabel`): SDK-7's MCP leg, which never sees the
 * id, runs only on a tab carrying that mark (readonly.ts, bbC null).
 */
export async function bootBb(tab: Tab, p: Prepared, courseId: string, say: (m: string) => void): Promise<string | null> {
  await tab.evaluate(`window.BB_COURSE = ${JSON.stringify(courseId)}; window.__bridgeCourseLabel = ${JSON.stringify(p.label)}; null`);
  // bb.js contains `return`, so the extension runs it inside an async function: `return (…)` keeps its value.
  const body = p.source.trim().replace(/;\s*$/, "");
  const loaded = await tab.evaluate<unknown>(`return (\n${body}\n);`, { timeoutMs: 30_000 });
  say(`bb.js evaluated: ${typeof loaded === "string" ? JSON.stringify(loaded) : "(no string result)"}`);
  const version = await tab.evaluate<string | null>("(window.bb && window.bb.VERSION) || null");
  return typeof version === "string" ? version : null;
}

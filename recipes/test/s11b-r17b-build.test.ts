// Step 11b S7-helpers H2: Run 17b's build proof, tab watcher and timed newTab (docs/e2e-test-plan.md section 4.25): the BUILD parser and
// judge, the TABWATCH parser, judge and in-console listener (run in a vm with a fake chrome), newtab-timed's judge, the CLI ops, and each
// new expected text compared with the sheet.
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { main, SUBCOMMANDS } from "../s11b";
import {
  buildLine, countS6Names, judgeBuild, judgeNewtabTrial, judgeTabwatch, NEWTAB_HOLD_MS, pageClassOf, parseBuildLine, parseTabwatchLine, parseTabwatchStarted, s6CommitLine, S6_COMMIT,
  tabwatchLine, tabwatchReadExpression, tabwatchStartExpression, withOpened,
} from "../s11b-r17b-build";
import { latLine, preTypeCheck } from "../s11b-rules";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sheet = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "s11b-r17b-build-"));

let out: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
});
afterEach(() => {
  out = [];
});
afterAll(() => spy.mockRestore());
const run = async (...argv: string[]): Promise<{ code: number; text: string }> => {
  out = [];
  const code = await main(argv);
  return { code, text: out.join("\n") };
};
/** The sheet's `<…>` placeholders as a regular expression, so a line form is compared with the sheet's own template. */
const templateRe = (t: string): RegExp => new RegExp("^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]*\\\|[^>]*>/g, "\\S+").replace(/<[^>]+>/g, "\\S+") + "$");

describe("the BUILD line, the S6 commit line and the judge (R17B-0 (e))", () => {
  it("prints the sheet's texts and parses its own line back", () => {
    expect(buildLine(2, "about:blank")).toBe("BUILD disk-s6-names=2/2 created-url=about:blank");
    expect(s6CommitLine(true)).toBe("S6 commit=ancestor");
    expect(s6CommitLine(false)).toBe("S6 commit=not-ancestor");
    expect(parseBuildLine(`> echo\n${buildLine(2, "other")}\n`)).toMatchObject({ names: 2, createdUrl: "other" });
    for (const bad of ["BUILD disk-s6-names=3/2 created-url=other", "BUILD disk-s6-names=2/2 created-url=http", " x BUILD disk-s6-names=2/2 created-url=other", "BUILD disk-s6-names=2/2"]) expect(parseBuildLine(bad), bad).toBeNull();
  });
  it("counts the two names, not their occurrences", () => {
    expect(countS6Names("openBehindRules settleBlank settleBlank")).toBe(2);
    expect(countS6Names("settleBlank")).toBe(1);
    expect(countS6Names("nothing")).toBe(0);
  });
  it("passes only on 2/2 names, an ancestor and created-url about:blank; every other case is a STOP", () => {
    expect(judgeBuild({ names: 2, ancestor: true, createdUrl: "about:blank" })).toMatchObject({ pass: true });
    for (const i of [{ names: 1, ancestor: true, createdUrl: "about:blank" as const }, { names: 2, ancestor: false, createdUrl: "about:blank" as const }, { names: 2, ancestor: true, createdUrl: "other" as const }, { names: 2, ancestor: true, createdUrl: null }])
      expect(judgeBuild(i), JSON.stringify(i)).toMatchObject({ pass: false, stop: true });
  });
  it("the S6 commit is db3f82e and is an ancestor of HEAD in this tree", () => {
    expect(S6_COMMIT).toBe("db3f82e");
    expect(sheet).toContain(`git merge-base --is-ancestor ${S6_COMMIT} HEAD`);
  });
});

describe("the TABWATCH line and judge (R17B-RD-2, R17B-NEWTAB-PLAIN, R17B-NEWTAB-LOAD)", () => {
  it("parses a whole line only (the echoed input never counts), with or without reply-ms", () => {
    expect(parseTabwatchLine("TABWATCH created-url=about:blank completes=1 first-complete-ms=40")).toMatchObject({ createdUrl: "about:blank", completes: 1, firstCompleteMs: 40, replyMs: null });
    expect(parseTabwatchLine("TABWATCH created-url=other completes=2 first-complete-ms=none reply-ms=3100")).toMatchObject({ createdUrl: "other", completes: 2, firstCompleteMs: null, replyMs: 3100 });
    for (const bad of ['> console.log("TABWATCH created-url="+s.cls', "TABWATCH created-url=http completes=1 first-complete-ms=4", "TABWATCH none", "x TABWATCH created-url=other completes=1 first-complete-ms=1"]) expect(parseTabwatchLine(bad), bad).toBeNull();
    expect(parseTabwatchStarted("TABWATCH started")).toBe(true);
    expect(parseTabwatchStarted("> void ... console.log(\"TABWATCH started\")")).toBe(false);
  });
  it("NEWTAB-PLAIN judges about:blank; RD-2 and NEWTAB-LOAD only record", () => {
    const blank = parseTabwatchLine("TABWATCH created-url=about:blank completes=1 first-complete-ms=5")!;
    const other = parseTabwatchLine("TABWATCH created-url=other completes=1 first-complete-ms=5")!;
    expect(judgeTabwatch("R17B-NEWTAB-PLAIN", blank).pass).toBe(true);
    expect(judgeTabwatch("R17B-NEWTAB-PLAIN", other)).toMatchObject({ pass: false });
    expect(judgeTabwatch("R17B-NEWTAB-PLAIN", other).stop).toBeUndefined();
    for (const r of ["R17B-RD-2", "R17B-NEWTAB-LOAD"]) for (const t of [blank, other]) expect(judgeTabwatch(r, t).pass, r).toBe(true);
  });
  it("its line form equals the sheet's template", () => {
    const tmpl = /`(TABWATCH created-url=<about:blank\|other> completes=<n> first-complete-ms=<ms> reply-ms=<ms>)`/.exec(sheet)?.[1];
    expect(tmpl).toBeDefined();
    expect(tabwatchLine({ createdUrl: "about:blank", completes: 1, firstCompleteMs: 12 }, 3105)).toMatch(templateRe(tmpl!));
    const short = /`(TABWATCH created-url=<about:blank or other>)`/.exec(sheet);
    expect(short).not.toBeNull();
    expect(sheet).toContain("`BUILD disk-s6-names=<n>/2 created-url=<about:blank|other>`");
    expect(buildLine(2, "other")).toMatch(templateRe("BUILD disk-s6-names=<n>/2 created-url=<about:blank|other>"));
    expect(sheet).toContain("`MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`");
    expect(sheet).toContain("`S6 commit=ancestor`");
    expect(sheet).toContain("`LAT R17B-BACK-SAMEDOC <ms> ms`");
    expect(latLine("R17B-BACK-SAMEDOC", 812)).toMatch(templateRe("LAT R17B-BACK-SAMEDOC <ms> ms"));
  });
});

describe("the in-console listener (static check, then run in a vm with a fake chrome)", () => {
  const start = tabwatchStartExpression();
  const read = tabwatchReadExpression();
  it("carries no URL or title output path and no pattern", () => {
    for (const e of [start, read]) {
      expect(preTypeCheck(e)).toBeNull();
      expect(e).not.toMatch(/\.title\b/);
      expect(e.startsWith("void ")).toBe(true);
      expect(e.includes("\n")).toBe(false);
      // every console.log argument: fixed words, counters and milliseconds only
      const args = [...e.matchAll(/console\.log\(((?:[^()]|\([^()]*\))*)\)/g)].map((m) => m[1]!);
      expect(args.length).toBeGreaterThan(0);
      for (const a of args) {
        expect(a, a).not.toMatch(/\.(url|pendingUrl|title)\b|\bci\b|\bt\./);
        const idents = a.replace(/"[^"]*"/g, "").match(/[A-Za-z_$][\w$.]*/g) ?? [];
        for (const id of idents) expect(["s", "s.cls", "s.n", "s.first", "s.id", "null"], `${a} -> ${id}`).toContain(id);
      }
    }
    // the only place an url property is read: compared with the blank literal, never concatenated
    for (const m of start.matchAll(/[\w.]*(?:pendingUrl|\.url)\b[^,;}]*/g)) expect(m[0], m[0]).toMatch(/"about:blank"|&&|\|\|/);
  });

  const SECRET = "http://localhost:8087/slow/secret-page";
  function world() {
    const listeners: { created: Array<(t: unknown) => void>; updated: Array<(id: number, ci: Record<string, unknown>) => void> } = { created: [], updated: [] };
    const rm = <T,>(a: T[], f: T): void => void a.splice(a.indexOf(f), 1);
    const lines: string[] = [];
    const chrome = {
      tabs: {
        onCreated: { addListener: (f: never) => listeners.created.push(f), removeListener: (f: never) => rm(listeners.created, f) },
        onUpdated: { addListener: (f: never) => listeners.updated.push(f), removeListener: (f: never) => rm(listeners.updated, f) },
      },
    };
    const ctx = createContext({ chrome, console: { log: (s: string) => lines.push(String(s)) }, Date });
    return {
      listeners, lines,
      eval: (e: string) => void runInContext(e, ctx),
      created: (t: object) => listeners.created.slice().forEach((f) => f(t)),
      upd: (id: number, ci: Record<string, unknown>) => listeners.updated.slice().forEach((f) => f(id, ci)),
    };
  }
  it("S6 path: a blank tab, one blank complete, then the navigation: about:blank, completes=1", () => {
    const w = world();
    w.eval(start);
    expect(w.lines).toEqual(["TABWATCH started"]);
    w.created({ id: 7, pendingUrl: "about:blank", url: "" });
    w.upd(9, { status: "complete" }); // another tab: ignored
    w.upd(7, { status: "complete" });
    w.upd(7, { status: "loading", url: SECRET });
    w.upd(7, { status: "complete" });
    w.eval(read);
    const t = parseTabwatchLine(w.lines[1]!);
    expect(t).toMatchObject({ createdUrl: "about:blank", completes: 1 });
    expect(t!.firstCompleteMs).toBeGreaterThanOrEqual(0);
    expect(w.lines.join("\n")).not.toContain("localhost");
    expect(w.lines.join("\n")).not.toContain("secret");
    expect(w.listeners.created).toHaveLength(0); // the read removes both listeners
    expect(w.listeners.updated).toHaveLength(0);
  });
  it("N1: a doubled blank complete counts twice; pre-S6: the navigation url is the class other", () => {
    const w = world();
    w.eval(start);
    w.created({ id: 3, pendingUrl: "about:blank" });
    w.upd(3, { status: "complete" });
    w.upd(3, { status: "complete" });
    w.upd(3, { status: "loading" }); // a loading after a complete starts the navigation
    w.upd(3, { status: "complete" });
    w.eval(read);
    expect(parseTabwatchLine(w.lines[1]!)).toMatchObject({ createdUrl: "about:blank", completes: 2 });
    const p = world();
    p.eval(start);
    p.created({ id: 4, pendingUrl: SECRET });
    p.upd(4, { status: "loading", url: SECRET });
    p.upd(4, { status: "complete" });
    p.eval(read);
    expect(parseTabwatchLine(p.lines[1]!)).toMatchObject({ createdUrl: "other", completes: 0 });
    expect(p.lines.join("\n")).not.toContain("secret");
  });
  it("a tab whose pendingUrl is absent reads its url; a restart replaces the earlier listener; no tab created prints none", () => {
    const w = world();
    w.eval(start);
    w.eval(start);
    expect(w.listeners.created).toHaveLength(1);
    expect(w.listeners.updated).toHaveLength(1);
    w.created({ id: 1, url: "about:blank" });
    w.eval(read);
    expect(parseTabwatchLine(w.lines.at(-1)!)).toMatchObject({ createdUrl: "about:blank", firstCompleteMs: null });
    const n = world();
    n.eval(start);
    n.eval(read);
    expect(n.lines.at(-1)).toBe("TABWATCH none");
  });
});

describe("newtab-timed's judge and page class (R17B-NEWTAB-LOAD)", () => {
  const page = "playground" as const;
  it("passes when the reply came after the hold and the page loaded, with blocked 0 and RULES 0", () => {
    expect(judgeNewtabTrial({ answer: "ok", ms: NEWTAB_HOLD_MS, page, blocked: 0, rulesAfter: 0 }).pass).toBe(true);
    expect(judgeNewtabTrial({ answer: "ok", ms: 3120, page, blocked: 0, rulesAfter: 0 }).pass).toBe(true);
  });
  it("fails a reply before 3 000 ms and a snapshot that is not the page; a refusal or an error answer fails", () => {
    expect(judgeNewtabTrial({ answer: "ok", ms: 2999, page, blocked: 0, rulesAfter: 0 })).toMatchObject({ pass: false });
    expect(judgeNewtabTrial({ answer: "ok", ms: 3500, page: "about:blank", blocked: 0, rulesAfter: 0 })).toMatchObject({ pass: false });
    expect(judgeNewtabTrial({ answer: "INTERNAL", ms: 3500, page: null })).toMatchObject({ pass: false });
  });
  it("a blocked hit or a rule left behind is a STOP; a missing input is NOT MEASURED, never a pass", () => {
    expect(judgeNewtabTrial({ answer: "ok", ms: 3500, page, blocked: 1, rulesAfter: 0 })).toMatchObject({ pass: false, stop: true });
    expect(judgeNewtabTrial({ answer: "ok", ms: 3500, page, blocked: 0, rulesAfter: 2 })).toMatchObject({ pass: false, stop: true });
    expect(judgeNewtabTrial({ answer: "ok", ms: 3500, page })).toMatchObject({ pass: false, notMeasured: true });
  });
  it("classifies the snapshot without printing it: blank, the playground (title or elements), other", () => {
    expect(pageClassOf({ url: "about:blank", title: "", elements: 0 })).toBe("about:blank");
    expect(pageClassOf({ url: "http://localhost:8087/x", title: "Agent Bridge E2E Playground", elements: 0 })).toBe("playground");
    expect(pageClassOf({ url: "http://localhost:8087/x", title: "", elements: 12 })).toBe("playground");
    expect(pageClassOf({ url: "http://localhost:8087/x", title: "", elements: 0 })).toBe("other");
  });
  it("records a handle as s9's newtab --as does: into opened (once) and tabs", () => {
    const s = withOpened({ id: "x", tabs: { a: "T1" }, opened: ["T1"] }, "T5", "nl1");
    expect(s).toEqual({ id: "x", tabs: { a: "T1", nl1: "T5" }, opened: ["T1", "T5"] });
    expect(withOpened(s, "T5", "nl1").opened).toEqual(["T1", "T5"]);
  });
});

describe("the CLI ops", () => {
  it("lists the new subcommands", () => {
    for (const s of ["tabwatch", "build-proof", "newtab-timed"]) expect(SUBCOMMANDS).toContain(s);
  });
  it("tabwatch writes either expression with --expr, parses the read with --reply-ms and judges --row", async () => {
    const f = join(tmp, "tw.expr");
    let r = await run("tabwatch", "--mode", "start", "--expr", f);
    expect(r.code).toBe(0);
    expect(readFileSync(f, "utf8")).toBe(tabwatchStartExpression());
    r = await run("tabwatch", "--mode", "read", "--expr", f);
    expect(readFileSync(f, "utf8")).toBe(tabwatchReadExpression());
    const d = join(tmp, "tw.dump");
    writeFileSync(d, "> echo\nTABWATCH created-url=about:blank completes=1 first-complete-ms=22\nundefined\n");
    r = await run("tabwatch", "--mode", "read", "--read", d, "--reply-ms", "3101", "--row", "R17B-NEWTAB-PLAIN");
    expect(r.code).toBe(0);
    expect(r.text).toContain("TABWATCH created-url=about:blank completes=1 first-complete-ms=22 reply-ms=3101");
    expect(r.text).toContain("ROW R17B-NEWTAB-PLAIN PASS");
    writeFileSync(d, "nothing\n");
    r = await run("tabwatch", "--mode", "read", "--read", d);
    expect(r.code).toBe(3);
    expect(r.text).toContain("NOT MEASURED: no TABWATCH line");
    r = await run("tabwatch", "--read", d);
    expect(r.code).toBe(2);
  });
  it("build-proof prints BUILD and S6 lines from the file on disk, git and a tabwatch read, and stops on a miss", async () => {
    const sw = join(tmp, "sw.js");
    const tw = join(tmp, "tw.txt");
    const head = execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
    writeFileSync(sw, "function openBehindRules(){} function settleBlank(){}");
    writeFileSync(tw, "TABWATCH created-url=about:blank completes=1 first-complete-ms=9\n");
    let r = await run("build-proof", "--sw", sw, "--ref", head, "--tabwatch", tw);
    expect(r.code).toBe(0);
    expect(r.text).toContain("BUILD disk-s6-names=2/2 created-url=about:blank");
    expect(r.text).toContain("S6 commit=ancestor");
    writeFileSync(tw, "TABWATCH created-url=other completes=1 first-complete-ms=9\n");
    r = await run("build-proof", "--sw", sw, "--ref", head, "--tabwatch", tw);
    expect(r.code).toBe(2);
    expect(r.text).toContain("BUILD disk-s6-names=2/2 created-url=other");
    writeFileSync(sw, "function openBehindRules(){}");
    r = await run("build-proof", "--sw", sw, "--ref", head, "--tabwatch", tw);
    expect(r.code).toBe(2);
    r = await run("build-proof", "--sw", sw, "--ref", head);
    expect(r.text).not.toContain("BUILD ");
    expect(r.code).toBe(2);
    r = await run("build-proof", "--ref", "not-hex");
    expect(r.code).toBe(2);
  });
  it("newtab-timed --dry plans without connecting; a non-fixture url or a bad key is a STOP", async () => {
    let r = await run("newtab-timed", "--row", "R17B-NEWTAB-LOAD-1", "--url", "http://localhost:8087/slow/e2e-playground.html?s11b=bnl1", "--as", "nl1", "--dry");
    expect(r.code).toBe(0);
    expect(r.text).toBe("PLAN newtab-timed ok row=R17B-NEWTAB-LOAD-1 as=nl1");
    r = await run("newtab-timed", "--row", "R17B-NEWTAB-LOAD-1", "--url", "http://example.org/x", "--as", "nl1", "--dry");
    expect(r.code).toBe(2);
    r = await run("newtab-timed", "--row", "x", "--url", "http://localhost:8087/slow/p", "--as", "n l", "--dry");
    expect(r.code).toBe(2);
  });
  it("the wiring prints LAT of the reply before the snapshot (static slice of newtabTimed)", () => {
    const src = readFileSync(join(REPO, "recipes", "s11b.ts"), "utf8");
    const body = src.slice(src.indexOf("async function newtabTimed"));
    expect(body.indexOf("latLine(row, r.ms)")).toBeGreaterThan(0);
    expect(body.indexOf("latLine(row, r.ms)")).toBeLessThan(body.indexOf("tab.snapshot()"));
    expect(body.indexOf("withOpened(")).toBeLessThan(body.indexOf("tab.snapshot()"));
  });
});

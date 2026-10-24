/**
 * Step 9 S2b: the toolbar button's wiring in `sw.ts` (S2.4 at S2b's close; decisions.md · 2026-10-24 · The
 * shortcut is `_execute_action` (#142); · A re-arm right after a disarm is ignored (#144), F42).
 * - One `chrome.action.onClicked.addListener(…)`, a statement at the SourceFile level (a listener registered
 *   inside a function or a callback would miss the click that wakes the worker), calling `safety.toggle`.
 * - No `commands.onCommand` anywhere in `extension/src` (the shortcut arrives as `action.onClicked`).
 * - The badge is re-derived at the worker start (a top-level `badge.refresh()`, not awaited) and on every
 *   safety-key change (a top-level `storage.onChanged` listener that calls it).
 * Each check is shown failing on a mutation of the source text (in memory).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const SW_TEXT = readFileSync(join(SRC, "sw.ts"), "utf8");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

function parse(text: string): ts.SourceFile {
  return ts.createSourceFile("sw.ts", text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

/** Every call `chrome.action.onClicked.addListener(…)` in the file, and whether it is a top-level statement. */
export function onClickedSites(text: string): Array<{ topLevel: boolean; text: string }> {
  const sf = parse(text);
  const top = new Set<ts.Node>(sf.statements.filter(ts.isExpressionStatement).map((s) => s.expression));
  const out: Array<{ topLevel: boolean; text: string }> = [];
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && n.expression.getText(sf).replace(/\s+/g, "") === "chrome.action.onClicked.addListener") {
      out.push({ topLevel: top.has(n), text: n.getText(sf) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Any reference to `onClicked` / `onCommand` / `chrome.commands` (code only: the AST ignores comments). */
function references(text: string, name: string): number {
  const sf = parse(text);
  let n = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name) n++;
    if (ts.isStringLiteral(node) && node.text === name) n++;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

/** Top-level expression statements whose text matches. */
function topLevelStatements(text: string, re: RegExp): string[] {
  const sf = parse(text);
  return sf.statements.filter((s) => ts.isExpressionStatement(s) && re.test(s.getText(sf))).map((s) => s.getText(sf));
}

describe("action.onClicked in sw.ts", () => {
  it("exactly one registration, a top-level statement, calling safety.toggle through the badge", () => {
    const sites = onClickedSites(SW_TEXT);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.topLevel).toBe(true);
    expect(sites[0]!.text).toMatch(/safety\.toggle\(\)/);
    expect(sites[0]!.text).toMatch(/badge\.press\(/);
    expect(references(SW_TEXT, "onClicked")).toBe(1);
  });

  it("mutation: the registration moved into a function is caught", () => {
    const moved = SW_TEXT.replace(/^chrome\.action\.onClicked\.addListener\(/m, "function later() { chrome.action.onClicked.addListener(") + "\n";
    const fixed = moved.replace(/(chrome\.action\.onClicked\.addListener\([\s\S]*?\);)/, "$1 }");
    const sites = onClickedSites(fixed);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.topLevel).toBe(false);
  });

  it("mutation: a registration inside a callback is caught", () => {
    const sites = onClickedSites(SW_TEXT + "\nvoid Promise.resolve().then(() => chrome.action.onClicked.addListener(() => {}));\n");
    expect(sites).toHaveLength(2);
    expect(sites.filter((s) => !s.topLevel)).toHaveLength(1);
  });

  it("the toggle is reached from the onClicked listener only (not from the router or a message)", () => {
    const sf = parse(SW_TEXT);
    const toggles: ts.Node[] = [];
    const visit = (n: ts.Node): void => {
      if (ts.isPropertyAccessExpression(n) && n.name.text === "toggle" && n.expression.getText(sf) === "safety") toggles.push(n);
      ts.forEachChild(n, visit);
    };
    visit(sf);
    expect(toggles).toHaveLength(1);
    let p: ts.Node | undefined = toggles[0];
    while (p && p.parent !== sf) p = p.parent;
    expect(p!.getText(sf)).toMatch(/^chrome\.action\.onClicked\.addListener\(/);
  });
});

describe("no commands.onCommand anywhere in extension/src (#142: _execute_action arrives as action.onClicked)", () => {
  const files = walk(SRC);

  it("no onCommand and no chrome.commands reference in code", () => {
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      const rel = relative(SRC, f);
      expect(references(text, "onCommand"), rel).toBe(0);
      const sf = parse(text);
      let commands = 0;
      const visit = (n: ts.Node): void => {
        if (ts.isPropertyAccessExpression(n) && n.name.text === "commands" && n.expression.getText(sf) === "chrome") commands++;
        ts.forEachChild(n, visit);
      };
      visit(sf);
      expect(commands, rel).toBe(0);
    }
  });

  it("mutation: an onCommand listener is caught", () => {
    expect(references(SW_TEXT + "\nchrome.commands.onCommand.addListener(() => {});\n", "onCommand")).toBe(1);
  });
});

describe("the badge is re-derived at every worker start and on every safety change (F42, #144)", () => {
  it("a top-level `void badge.refresh();` (not awaited)", () => {
    expect(topLevelStatements(SW_TEXT, /^void badge\.refresh\(\);$/)).toHaveLength(1);
  });

  it("a top-level storage.onChanged listener refreshes the badge on a safety-key change", () => {
    const hits = topLevelStatements(SW_TEXT, /^chrome\.storage\.onChanged\.addListener\(/).filter((s) => /badge\.refresh\(\)/.test(s));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatch(/touchesSafety\(changes\)/);
  });

  it("mutation: the start-up refresh moved into a function is caught", () => {
    const mutated = SW_TEXT.replace(/^void badge\.refresh\(\);$/m, "function start() { void badge.refresh(); }");
    expect(topLevelStatements(mutated, /^void badge\.refresh\(\);$/)).toHaveLength(0);
  });
});

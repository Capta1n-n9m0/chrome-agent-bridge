/**
 * Step 9 S2a: static checks over the service worker's source.
 * - S2.4 (#141): no `await` (or `for await`) whose nearest enclosing function is the source file — a module
 *   service worker must not use top-level `await` (CLAUDE.md), parsed with the TypeScript compiler API.
 * - The router in `sw.ts` is the gated one: no `new Router(`; `const router = new GatedRouter(`.
 * - The safety state is written only through `safety-state.ts`, and no router handler can reach it (S3.3's
 *   `storage.local.set` half, carried by S2a/S2b per #147; forbidden fix: a wire path that changes the state).
 * - Listener placement: `storage.onChanged` and `runtime.onMessage` at the top level; `setAccessLevel` after
 *   every listener registration, guarded and not awaited (#139, V7).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const SW = join(SRC, "sw.ts");

/** Every `await` / `for await` whose nearest enclosing function-like node is the source file. */
export function topLevelAwaits(source: string): string[] {
  const sf = ts.createSourceFile("sw.ts", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const hits: string[] = [];
  const visit = (node: ts.Node, inFunction: boolean): void => {
    const fn =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node);
    const inside = inFunction || fn;
    if (!inside) {
      if (ts.isAwaitExpression(node)) hits.push(`await at ${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      if (ts.isForOfStatement(node) && node.awaitModifier) hits.push(`for await at ${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
    }
    ts.forEachChild(node, (c) => visit(c, inside));
  };
  visit(sf, false);
  return hits;
}

function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("S2.4 — no top-level await in sw.ts (TypeScript AST)", () => {
  it("sw.ts has none", () => {
    expect(topLevelAwaits(readFileSync(SW, "utf8"))).toEqual([]);
  });

  it("the scan finds the pre-registered mutation, an indented continuation, and a for await", () => {
    const src = readFileSync(SW, "utf8");
    expect(topLevelAwaits(src + '\nconst st = await chrome.storage.local.get("armed");\n')).toHaveLength(1);
    expect(topLevelAwaits(src + "\nconst x = [\n  await Promise.resolve(1),\n];\n")).toHaveLength(1);
    expect(topLevelAwaits(src + "\nfor await (const y of []) {}\n")).toHaveLength(1);
    expect(topLevelAwaits(src + "\nif (true) { await 1; }\n")).toHaveLength(1);
  });

  it("an await inside any function does not count", () => {
    expect(topLevelAwaits("async function f() { await 1; }\nconst g = async () => { await 2; };\nclass C { async m() { await 3; } }")).toEqual([]);
  });
});

describe("sw.ts constructs only the gated router", () => {
  const src = code(readFileSync(SW, "utf8"));

  it("no `new Router(`", () => {
    expect(src).not.toMatch(/\bnew\s+Router\s*\(/);
  });

  it("the variable `router` is a GatedRouter, constructed once", () => {
    expect(src.match(/\bnew\s+GatedRouter\s*\(/g)).toHaveLength(1);
    expect(src).toMatch(/\bconst\s+router\s*=\s*new\s+GatedRouter\s*\(/);
  });

  it("every registration is the plain `router.on(\"name\", …)` form (S1's scan stays meaningful)", () => {
    expect(src).not.toMatch(/router\s*\[/);
    expect(src).not.toMatch(/\.on\.(call|apply|bind)\s*\(/);
    expect(src.match(/\brouter\.on\(\s*"[A-Za-z]+"\s*,/g)).toHaveLength(23);
  });

  it("the handlers it registers come from ./handlers/ only", () => {
    const names = [...src.matchAll(/\brouter\.on\(\s*"[A-Za-z]+"\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g)].map((m) => m[1]!);
    expect(names).toHaveLength(23);
    const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)];
    for (const n of names) {
      const from = imports.find(([, list]) => list!.split(",").some((x) => x.trim().split(/\s+as\s+/).pop() === n));
      expect(from?.[2], n).toMatch(/^\.\/handlers\//);
    }
  });
});

describe("the safety state is written only through safety-state.ts", () => {
  const files = walk(SRC);

  it("the stored key names appear in safety-state.ts only", () => {
    for (const f of files) {
      if (f.endsWith("safety-state.ts")) continue;
      const text = readFileSync(f, "utf8");
      expect(text, relative(SRC, f)).not.toMatch(/safety\.(armed|evaluate|blockList)/);
    }
  });

  it("only sw.ts and the options page import safety-state's store and setter; no handler does", () => {
    for (const f of files) {
      const rel = relative(SRC, f).replace(/\\/g, "/");
      const text = code(readFileSync(f, "utf8"));
      const imports = /from\s*"\.\.?\/(?:[\w-]+\/)*safety-state(?:\.js)?"/.test(text);
      if (!imports) continue;
      const allowed = rel === "sw.ts" || rel === "options.ts" || /^safety(-[\w-]+)?\.ts$/.test(rel);
      const typeOnly = /import\s+type\s*\{[^}]*\}\s*from\s*"\.\.?\/(?:[\w-]+\/)*safety-state(?:\.js)?"/.test(text) &&
        !/import\s*\{[^}]*\}\s*from\s*"\.\.?\/(?:[\w-]+\/)*safety-state(?:\.js)?"/.test(text);
      expect(allowed || typeOnly, rel).toBe(true);
      if (rel.startsWith("handlers/")) expect(typeOnly, rel).toBe(true);
    }
  });

  it("no handler calls storage.local.set; the call sites are sw.ts and options.ts", () => {
    for (const f of files) {
      const rel = relative(SRC, f).replace(/\\/g, "/");
      const n = (code(readFileSync(f, "utf8")).match(/storage\.local\.set\s*\(/g) ?? []).length;
      if (rel === "sw.ts" || rel === "options.ts") continue;
      expect(n, rel).toBe(0);
    }
  });

  it("sw.ts registers no action, command or runtime-message path that writes the state (the toggle stays off the wire)", () => {
    const src = code(readFileSync(SW, "utf8"));
    // The toggle is called only by S2b's `action.onClicked` (none yet) — never from the router or a message.
    const onMessage = src.slice(src.indexOf("chrome.runtime.onMessage.addListener"));
    const body = onMessage.slice(0, onMessage.indexOf("\n});"));
    expect(body).not.toMatch(/toggle|writeSafety|storage\.local\.set/);
  });
});

describe("listener placement (#139, V7; CLAUDE.md: listeners at the top level)", () => {
  const raw = readFileSync(SW, "utf8");
  const src = code(raw);
  const sf = ts.createSourceFile("sw.ts", raw, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

  /** Statement index (top level) of each `<expr>.addListener(` call statement. */
  function topLevelCalls(match: RegExp): number[] {
    const out: number[] = [];
    sf.statements.forEach((st, i) => {
      if (ts.isExpressionStatement(st) && match.test(st.expression.getText(sf))) out.push(i);
    });
    return out;
  }

  it("storage.onChanged and runtime.onMessage listeners are top-level statements", () => {
    expect(topLevelCalls(/^chrome\.storage\.onChanged\.addListener\(/).length).toBeGreaterThanOrEqual(1);
    expect(topLevelCalls(/^chrome\.runtime\.onMessage\.addListener\(/)).toHaveLength(1);
  });

  it("setAccessLevel(TRUSTED_CONTEXTS) is called after the last top-level addListener, in a try, not awaited", () => {
    const listeners = topLevelCalls(/\.addListener\(/);
    const idx = sf.statements.findIndex((st) => /setAccessLevel/.test(st.getText(sf)));
    expect(idx).toBeGreaterThan(Math.max(...listeners));
    const st = sf.statements[idx]!;
    expect(ts.isTryStatement(st)).toBe(true);
    expect(st.getText(sf)).toMatch(/TRUSTED_CONTEXTS/);
    expect(st.getText(sf)).toMatch(/\.catch(\?\.)?\(/);
    expect(st.getText(sf)).not.toMatch(/\bawait\b/);
    expect(src.match(/setAccessLevel/g)).toHaveLength(1);
  });

  it("the relay sender is checked before the router sees a message", () => {
    const i = src.indexOf("chrome.runtime.onMessage.addListener");
    const body = src.slice(i, src.indexOf("\n});", i));
    expect(body).toMatch(/acceptRelaySender\(/);
    expect(body.indexOf("acceptRelaySender(")).toBeLessThan(body.indexOf("router.handle("));
  });
});

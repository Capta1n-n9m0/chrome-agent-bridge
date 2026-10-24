/**
 * Step 9 S2c (decisions.md · 2026-10-24 · A fix stage S2c before S4 … (#189); #183): the badge's read of the
 * stored `armed` switch (S2b verifier F5) asks `storage.local` for the safety keys only — never `get(null)`,
 * which would also hand the worker the token. The helper lives in `safety-state.ts` (the only module that may
 * name the keys, `safety-writers.test.ts`); `sw.ts` injects `chrome.storage.local.get`.
 * - `readStoredArmed(get)`: `get` is called once with exactly `SAFETY_KEY_NAMES`; wrong-typed values throw.
 * - Static: no `chrome.storage.local.get(null)` / `get(undefined)` / `get()` anywhere in `extension/src` (also
 *   through `as`, `!` or parentheses).
 * - Static (S2c fixer 1, verifier F2): in `sw.ts`, `storedArmed` is exactly `() => readStoredArmed((k) =>
 *   chrome.storage.local.get([...k]))` — forwarding the keys it is given and nothing else; and every
 *   `storage.local.get(…)` in `sw.ts` either forwards exactly its arrow's own keys parameter (`[...k]`) or names
 *   literal keys none of which is a safety key.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";
import { SAFETY_KEY_NAMES, readStoredArmed } from "../src/safety-state.js";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

describe("readStoredArmed — the badge's stored read asks for the safety keys only", () => {
  it("calls get once with exactly SAFETY_KEY_NAMES (an array, no null, no extra key)", async () => {
    const get = vi.fn(async (keys: readonly string[]) => {
      void keys;
      return { "safety.armed": false, token: "should-never-be-asked-for" } as Record<string, unknown>;
    });
    expect(await readStoredArmed(get)).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    const arg = get.mock.calls[0]![0];
    expect(Array.isArray(arg)).toBe(true);
    expect([...arg]).toEqual([...SAFETY_KEY_NAMES]);
    expect(arg).not.toContain("token");
    expect(arg).not.toContain("port");
  });

  it("a missing key is the default (armed); a wrong-typed value rejects (unknown, as before)", async () => {
    expect(await readStoredArmed(async () => ({}))).toBe(true);
    await expect(readStoredArmed(async () => ({ "safety.armed": "yes" }))).rejects.toThrow();
  });
});

/** `x as T`, `<T>x`, `x!`, `(x)`, `x satisfies T` → `x`. */
function unwrap(e: ts.Expression): ts.Expression {
  while (ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
  return e;
}

/** A missing, `null`, `undefined` or `void …` argument: the whole area. */
function isWholeArea(a: ts.Expression | undefined): boolean {
  if (a === undefined) return true;
  const u = unwrap(a);
  return u.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(u) && u.text === "undefined") || ts.isVoidExpression(u);
}

/** Every `chrome.storage.local.get(…)` call in `extension/src` whose first argument is missing, null or undefined. */
function wholeAreaReads(): string[] {
  const out: string[] = [];
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
    });
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).replace(/\\/g, "/");
    const sf = ts.createSourceFile(rel, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && n.expression.getText(sf).replace(/\s+/g, "") === "chrome.storage.local.get") {
        if (isWholeArea(n.arguments[0])) out.push(`${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

describe("static — no whole-area storage.local read in extension/src (#183)", () => {
  it("no chrome.storage.local.get(null), get(undefined) or get()", () => {
    expect(wholeAreaReads()).toEqual([]);
  });
});

/**
 * True when `call` is `….storage.local.get([...p])` with `p` the sole parameter of the arrow function whose
 * expression body is `call` — a pure forward of the keys the caller was given.
 */
function isKeysForward(call: ts.CallExpression): boolean {
  if (call.arguments.length !== 1) return false;
  const arr = call.arguments[0]!;
  if (!ts.isArrayLiteralExpression(arr) || arr.elements.length !== 1) return false;
  const el = arr.elements[0]!;
  if (!ts.isSpreadElement(el) || !ts.isIdentifier(el.expression)) return false;
  const fn = call.parent;
  if (!ts.isArrowFunction(fn) || fn.body !== call || fn.parameters.length !== 1) return false;
  const p = fn.parameters[0]!;
  return ts.isIdentifier(p.name) && p.name.text === el.expression.text && p.dotDotDotToken === undefined && p.initializer === undefined;
}

/** Literal keys (a string, an identifier constant, or an array of those); null when the argument is anything else. */
function literalKeys(a: ts.Expression, sf: ts.SourceFile): string[] | null {
  const one = (e: ts.Expression): string | null =>
    ts.isStringLiteralLike(e) ? e.text : ts.isIdentifier(e) && e.text !== "undefined" ? `<ident ${e.getText(sf)}>` : null;
  const u = unwrap(a);
  if (ts.isArrayLiteralExpression(u)) {
    const ks = u.elements.map((e) => one(e));
    return ks.every((k): k is string => k !== null) ? ks : null;
  }
  const k = one(u);
  return k === null ? null : [k];
}

/** Problems with the `storage.local.get` reads in `sw.ts`'s source text (empty: none). */
function swStorageReadProblems(text: string): string[] {
  const sf = ts.createSourceFile("sw.ts", text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out: string[] = [];
  const at = (n: ts.Node) => `sw.ts:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  let glue = 0;
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && /(^|\.)storage\.local\.get$/.test(n.expression.getText(sf).replace(/\s+/g, ""))) {
      const a = n.arguments[0];
      if (isWholeArea(a)) out.push(`${at(n)} whole-area read`);
      else if (!isKeysForward(n)) {
        const ks = literalKeys(a!, sf);
        if (ks === null) out.push(`${at(n)} keys neither forwarded exactly nor literal`);
        else if (ks.some((k) => k.startsWith("safety.") || /SAFETY/.test(k))) out.push(`${at(n)} a safety key read outside the glue`);
      }
    }
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === "storedArmed") {
      glue++;
      const init = n.initializer;
      const inner = ts.isArrowFunction(init) && ts.isCallExpression(init.body) && init.body.arguments.length === 1 ? init.body.arguments[0]! : undefined;
      const ok =
        ts.isArrowFunction(init) &&
        init.parameters.length === 0 &&
        ts.isCallExpression(init.body) &&
        init.body.expression.getText(sf) === "readStoredArmed" &&
        inner !== undefined &&
        ts.isArrowFunction(inner) &&
        ts.isCallExpression(inner.body) &&
        inner.body.expression.getText(sf).replace(/\s+/g, "") === "chrome.storage.local.get" &&
        isKeysForward(inner.body);
      if (!ok) out.push(`${at(n)} storedArmed is not () => readStoredArmed((k) => chrome.storage.local.get([...k]))`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (glue !== 1) out.push(`storedArmed glue found ${glue} times, expected 1`);
  return out;
}

describe("static — sw.ts's storage.local reads forward the keys they are given, nothing more (S2c fixer 1, F2)", () => {
  const swText = readFileSync(join(SRC, "sw.ts"), "utf8");
  const GLUE = "storedArmed: () => readStoredArmed((keys) => chrome.storage.local.get([...keys])),";

  it("sw.ts as it stands passes: storedArmed forwards exactly its keys; no other read names a safety key", () => {
    expect(swText.split(GLUE).length).toBe(2); // the glue text the mutations below replace
    expect(swStorageReadProblems(swText)).toEqual([]);
  });

  it.each([
    ["get(null)", "storedArmed: () => readStoredArmed(() => chrome.storage.local.get(null)),"],
    ["get(undefined as any)", "storedArmed: () => readStoredArmed(() => chrome.storage.local.get(undefined as any)),"],
    ["get() with no keys", "storedArmed: () => readStoredArmed(() => chrome.storage.local.get()),"],
    ['get(["token", ...keys])', 'storedArmed: () => readStoredArmed((keys) => chrome.storage.local.get(["token", ...keys])),'],
    ['get([...keys, "port"])', 'storedArmed: () => readStoredArmed((keys) => chrome.storage.local.get([...keys, "port"])),'],
    ["get(keys) passed through unspread", "storedArmed: () => readStoredArmed((keys) => chrome.storage.local.get(keys as string[])),"],
    ["a fixed safety key list instead of the forward", 'storedArmed: () => readStoredArmed(() => chrome.storage.local.get(["safety.armed"])),'],
    ["the pre-S2c whole-area read", "storedArmed: () => chrome.storage.local.get(null).then((raw) => parseStoredSafety(raw).armed),"],
  ])("a mutation of the glue fails it: %s", (_label, mutated) => {
    expect(swStorageReadProblems(swText.replace(GLUE, mutated)).length).toBeGreaterThan(0);
  });

  it("another read in sw.ts that names a safety key, reads the whole area or spreads extra keys fails it", () => {
    const marker = "chrome.storage.local.get(MARKER_KEY)";
    expect(swText.split(marker).length).toBe(2);
    expect(swStorageReadProblems(swText.replace(marker, 'chrome.storage.local.get(["safety.armed"])')).length).toBeGreaterThan(0);
    expect(swStorageReadProblems(swText.replace(marker, "chrome.storage.local.get(undefined as any)")).length).toBeGreaterThan(0);
    expect(swStorageReadProblems(swText.replace(marker, "chrome.storage.local.get([MARKER_KEY, ...extra])")).length).toBeGreaterThan(0);
  });
});

/**
 * Step 11 S3 — the shipped page functions of an upload are closure-free (S3 verifier NIT 3). Three sources leave the
 * service worker as text and run in a page: the isolated-world finder (`UPLOAD_FINDER_SRC`, by `Runtime.evaluate`)
 * and the content-script mark and unmark calls (`UPLOAD_MARK_PAGE_FN`, `UPLOAD_UNMARK_PAGE_FN`, serialised by
 * `chrome.scripting.executeScript`). A name they take from the module around them (a constant, an import, or a
 * bundler helper such as esbuild's `keepNames` `__name(visit, "visit")`, which `npx tsx` inserts) is undefined
 * there and throws.
 *
 * The check: each source is type-checked alone with only the ES and DOM libraries. A name with no declaration is an
 * error, and every name that resolves outside the source must be in a short expected list of page globals. It runs on
 * the sources as vitest loads them, and on the sources as an esbuild bundle with the build's own options
 * (`extension/build.mjs`: bundle, target chrome116); a `keepNames` bundle is the mutant that must be caught.
 */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { build, type BuildOptions } from "esbuild";
import { fileURLToPath } from "node:url";
import { UPLOAD_FINDER_SRC, UPLOAD_MARK_PAGE_FN, UPLOAD_UNMARK_PAGE_FN } from "../src/upload-files.js";

const UNRESOLVED_CODES = new Set([2304, 2552, 2580, 2581, 2582, 2591, 2592, 2593, 2662, 2663]);
const FILE = "/virtual/shipped-page-fn.ts";
const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
  types: [],
  noEmit: true,
  strict: false,
  noImplicitAny: false,
};

/** The names a function source uses but does not declare: `unresolved` (no declaration) and `globals` (from a lib). */
function outsideNames(src: string): { unresolved: string[]; globals: string[] } {
  const text = `export const shipped = (${src});\n`;
  const host = ts.createCompilerHost(OPTIONS);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, lang, ...rest) =>
    name === FILE ? ts.createSourceFile(name, text, lang, true) : getSourceFile(name, lang, ...rest);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === FILE || fileExists(name);
  const program = ts.createProgram([FILE], OPTIONS, host);
  const sf = program.getSourceFile(FILE)!;
  const unresolved = program
    .getSemanticDiagnostics(sf)
    .filter((d) => UNRESOLVED_CODES.has(d.code) && d.start !== undefined)
    .map((d) => text.slice(d.start!, d.start! + d.length!));
  const checker = program.getTypeChecker();
  const globals = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      const isMemberName =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node);
      const sym = isMemberName ? undefined : checker.getSymbolAtLocation(node);
      if (sym?.declarations?.length && sym.declarations.every((d) => d.getSourceFile().fileName !== FILE)) {
        globals.add(node.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { unresolved: [...new Set(unresolved)].sort(), globals: [...globals].sort() };
}

/** What each shipped source may take from the page: nothing else. */
const EXPECTED = {
  finder: ["String", "document"],
  mark: ["window"],
  unmark: ["window"],
};

type Shipped = { finder: string; mark: string; unmark: string };

const ENTRY = fileURLToPath(new URL("../src/upload-files.ts", import.meta.url));

/** The three sources as the extension's build ships them (format aside: the function bodies are the same). */
async function bundled(extra: BuildOptions = {}): Promise<Shipped> {
  const out = await build({
    entryPoints: [ENTRY],
    bundle: true,
    target: "chrome116",
    format: "iife",
    globalName: "__s3ClosureFree",
    write: false,
    logLevel: "silent",
    ...extra,
  });
  const code = out.outputFiles[0]!.text;
  const mod = new Function(`${code}\nreturn __s3ClosureFree;`)() as {
    UPLOAD_FINDER_SRC: string;
    UPLOAD_MARK_PAGE_FN: () => unknown;
    UPLOAD_UNMARK_PAGE_FN: () => unknown;
  };
  return { finder: mod.UPLOAD_FINDER_SRC, mark: String(mod.UPLOAD_MARK_PAGE_FN), unmark: String(mod.UPLOAD_UNMARK_PAGE_FN) };
}

function expectClosureFree(s: Shipped): void {
  for (const key of ["finder", "mark", "unmark"] as const) {
    expect(outsideNames(s[key]), key).toEqual({ unresolved: [], globals: EXPECTED[key] });
  }
}

describe("the shipped upload page functions are closure-free (S3 verifier NIT 3)", () => {
  it("the check discriminates: a helper call, a module constant and a page global outside the list are caught", () => {
    const helper = UPLOAD_FINDER_SRC.replace(/\btry\s*\{\s*visit\(document\)/, '__name(visit, "visit");\n  $&');
    expect(helper).not.toBe(UPLOAD_FINDER_SRC);
    expect(outsideNames(helper).unresolved).toEqual(["__name"]);
    expect(outsideNames("(m) => m === UPLOAD_MARK_ATTR").unresolved).toEqual(["UPLOAD_MARK_ATTR"]);
    expect(outsideNames("(m) => location.href + m")).toEqual({ unresolved: [], globals: ["location"] });
    expect(outsideNames("(m) => { const x = 1; return [m, x]; }")).toEqual({ unresolved: [], globals: [] });
  });

  it("as vitest loads them", () => {
    expectClosureFree({ finder: UPLOAD_FINDER_SRC, mark: String(UPLOAD_MARK_PAGE_FN), unmark: String(UPLOAD_UNMARK_PAGE_FN) });
  });

  it("as the extension's esbuild bundle ships them", async () => {
    expectClosureFree(await bundled());
  });

  it("a keepNames bundle (the tsx failure) is caught", async () => {
    const s = await bundled({ keepNames: true });
    expect(outsideNames(s.finder).unresolved).toContain("__name");
  });
});

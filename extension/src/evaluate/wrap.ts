/**
 * `replMode` already gives top-level `await`, `let`/`const` re-declaration and the completion value of
 * a multi-statement script, so the wrapper exists for exactly one reason: a bare `return` is a syntax
 * error outside a function, and agents write it.
 *
 * This is a **heuristic**, not a parser: a false positive only costs the completion-value behaviour
 * (the script runs inside an async IIFE, so the last expression is no longer returned), a false
 * negative costs a `SyntaxError` the agent sees and can fix.
 */

/** A `return` statement: the word, not preceded by `.` and not part of a longer identifier. */
export const RETURN_RE = /(^|[^.\w$])return\b/;

/** Blanks out string/template literals and comments so the regex can't trip over their contents. */
function stripLiterals(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += " ";
      i++;
      while (i < code.length) {
        if (code[i] === "\\") {
          out += "  ";
          i += 2;
          continue;
        }
        if (code[i] === quote) break;
        out += code[i] === "\n" ? "\n" : " ";
        i++;
      }
      out += " ";
      i++;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? code.length : end + 2;
      for (; i < stop; i++) out += code[i] === "\n" ? "\n" : " ";
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** `code` unchanged, or wrapped in an async IIFE when it contains a top-level `return`. */
export function wrapExpression(code: string): string {
  if (!RETURN_RE.test(stripLiterals(code))) return code;
  return `(async () => {\n${code}\n})()`;
}

import { describe, it, expect } from "vitest";
import { wrapExpression, RETURN_RE } from "../src/evaluate/wrap.js";

const wrapped = (code: string) => `(async () => {\n${code}\n})()`;

describe("wrapExpression", () => {
  it("leaves a plain expression alone", () => {
    expect(wrapExpression("document.title")).toBe("document.title");
  });

  it("leaves a multi-statement script alone (replMode returns the completion value)", () => {
    expect(wrapExpression("const a = 1; a + 1")).toBe("const a = 1; a + 1");
  });

  it("leaves top-level await alone", () => {
    expect(wrapExpression("await fetch('/x')")).toBe("await fetch('/x')");
  });

  it("wraps a script that uses return in an async IIFE", () => {
    const code = "const r = await fetch('/x'); return r.status";
    expect(wrapExpression(code)).toBe(wrapped(code));
    expect(wrapExpression("return 1")).toBe(wrapped("return 1"));
    expect(wrapExpression("  return 1;  ")).toBe(wrapped("  return 1;  "));
  });

  it("does not mistake an identifier or a method named return for a statement", () => {
    expect(wrapExpression("returnValue")).toBe("returnValue");
    expect(wrapExpression("x.return()")).toBe("x.return()");
    expect(wrapExpression("myReturn + 1")).toBe("myReturn + 1");
  });

  it("ignores the word return inside strings and comments", () => {
    expect(wrapExpression(`"please return this"`)).toBe(`"please return this"`);
    expect(wrapExpression(`'return'`)).toBe(`'return'`);
    expect(wrapExpression("`a return b`")).toBe("`a return b`");
    expect(wrapExpression("document.title // return the title")).toBe("document.title // return the title");
    expect(wrapExpression("/* return */ document.title")).toBe("/* return */ document.title");
  });

  it("still wraps when the return follows a string or a comment", () => {
    const code = `const s = "no return here"; // ok\nreturn s.length`;
    expect(wrapExpression(code)).toBe(wrapped(code));
  });

  it("returns an empty expression unchanged", () => {
    expect(wrapExpression("")).toBe("");
  });

  it("exports the heuristic regex", () => {
    expect(RETURN_RE.test("return 1")).toBe(true);
    expect(RETURN_RE.test("returnValue")).toBe(false);
  });
});

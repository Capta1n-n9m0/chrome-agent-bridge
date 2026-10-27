/**
 * Step 12 S3a, C3.1 as rewritten (stage0-audit.md F2, §5; stage0-audit-2.md G-9): the extension's safety table and the
 * daemon's method table name the same methods. The daemon forwards an unlisted method that carries `tab` as a tab
 * method, so without this test a method missing from `daemon/src/methods.ts` would pass every other test.
 */
import { describe, it, expect } from "vitest";
import { METHOD_CLASSES } from "../src/safety.js";
import { FREE_METHODS, TAB_METHODS } from "../../daemon/src/methods.js";

/** The extension methods the daemon intercepts by name rather than by table (`classify`). */
const INTERCEPTED = ["newTab", "closeTab", "listTabs"];

describe("C3.1 — METHOD_CLASSES and the daemon's tables", () => {
  const extension = Object.keys(METHOD_CLASSES).sort();
  const daemon = [...TAB_METHODS, ...FREE_METHODS, ...INTERCEPTED].sort();

  it("every METHOD_CLASSES method is in the daemon's tables, and every daemon-forwarded method in METHOD_CLASSES", () => {
    expect(extension.filter((m) => !daemon.includes(m))).toEqual([]);
    expect(daemon.filter((m) => !extension.includes(m))).toEqual([]);
    expect(daemon).toEqual(extension);
  });

  it("consoleMessages: class evaluate (#334) and a tab method (lease-checked, no lock)", () => {
    expect(METHOD_CLASSES.consoleMessages).toBe("evaluate");
    expect(TAB_METHODS.has("consoleMessages")).toBe(true);
  });
});

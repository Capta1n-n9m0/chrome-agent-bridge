// Step 14 S2b: the pure decisions of `npm run bridge-update` (scripts/bridge/lib.mjs).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LIFECYCLE_NAMES, newestMtime, npmCli, pullOutcome, reloadStep, UPDATE_DONE } from "../bridge/lib.mjs";

describe("the pull", () => {
  it("a dirty tree stops before any pull", () => {
    expect(pullOutcome({ dirty: true })).toMatchObject({ kind: "dirty", stop: true, line: expect.stringMatching(/commit or stash/) });
  });
  it("exit 0 with HEAD moved → updated; unchanged → current; neither stops", () => {
    expect(pullOutcome({ dirty: false, code: 0, before: "a", after: "b" })).toMatchObject({ kind: "updated", stop: false });
    expect(pullOutcome({ dirty: false, code: 0, before: "a", after: "a" })).toMatchObject({ kind: "current", stop: false });
  });
  it("a non-fast-forward pull stops with its own line; any other failure stops too", () => {
    const nf = pullOutcome({ dirty: false, code: 128, output: "fatal: Not possible to fast-forward, aborting." });
    expect(nf).toMatchObject({ kind: "notff", stop: true, line: expect.stringMatching(/fast-forward/) });
    expect(pullOutcome({ dirty: false, code: 1, output: "fatal: unable to access" })).toMatchObject({ kind: "fail", stop: true });
  });
});

describe("the reload (recipes/reload-extension.ps1)", () => {
  it("--no-reload → skipped with the by-hand hint", () => {
    expect(reloadStep({ noReload: true })).toMatchObject({ action: "skip", line: expect.stringMatching(/reload/) });
  });
  it("exit 0 → done; exit 2 → one re-run (#99), then a hint, not a failure (#431)", () => {
    expect(reloadStep({ code: 0, attempt: 1 }).action).toBe("done");
    expect(reloadStep({ code: 2, attempt: 1 }).action).toBe("retry");
    expect(reloadStep({ code: 2, attempt: 2 })).toMatchObject({ action: "hint", line: expect.stringMatching(/by hand/) });
  });
  it("any other exit (1, 3, 4, 5, a missing powershell) → fail naming the code", () => {
    for (const code of [1, 3, 4, 5, null]) expect(reloadStep({ code, attempt: 1 })).toMatchObject({ action: "fail", line: expect.stringContaining(String(code)) });
  });
  it("the closing hint names /mcp and the daemon handover by the next client", () => {
    expect(UPDATE_DONE).toMatch(/\/mcp/);
    expect(UPDATE_DONE).toMatch(/next client/);
  });
});

describe("npm without a shell (npm-cli.js run by this node)", () => {
  const cli = (d: string) => String.raw`${d}\node_modules\npm\bin\npm-cli.js`;
  const node = String.raw`C:\a\node.exe`, A = String.raw`C:\a`, B = String.raw`C:\b`, X = String.raw`C:\x`;
  it("npm_execpath under npm run; else npm-cli.js beside node.exe, then beside a PATH shim; none → null", () => {
    expect(npmCli({ npm_execpath: cli(X) }, node, () => false)).toBe(cli(X));
    expect(npmCli({ PATH: B }, node, (f) => f === cli(A))).toBe(cli(A));
    expect(npmCli({ Path: `${X};${B}` }, node, (f) => f === cli(B))).toBe(cli(B));
    expect(npmCli({ npm_execpath: String.raw`C:\n\npm.cmd`, PATH: "" }, node, () => false)).toBeNull();
  });
});

describe("newest mtime under a file or folder (injected stat)", () => {
  it("walks folders, null when missing", () => {
    const tree: Record<string, { m: number; kids?: string[] }> = { a: { m: 1, kids: ["b", "c"] }, "a/b": { m: 5 }, "a/c": { m: 3, kids: ["d"] }, "a/c/d": { m: 9 } };
    const fs = { stat: (f: string) => (tree[f] ? { mtimeMs: tree[f].m, isDirectory: () => !!tree[f].kids } : null),
      list: (f: string) => tree[f].kids!, join: (a: string, b: string) => `${a}/${b}` };
    expect(newestMtime("a", fs)).toBe(9);
    expect(newestMtime("a/b", fs)).toBe(5);
    expect(newestMtime("zz", fs)).toBeNull();
  });
});

describe("root package.json", () => {
  it("has doctor and bridge-update, none an npm lifecycle name (#427)", () => {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"));
    expect(pkg.scripts).toMatchObject({ doctor: expect.any(String), "bridge-update": expect.any(String) });
    expect(Object.keys(pkg.scripts).filter((n) => LIFECYCLE_NAMES.includes(n))).toEqual([]);
  });
});

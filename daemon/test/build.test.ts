import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildHash } from "../src/build.js";

describe("buildHash", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("is the sha256 hex of the file's bytes, stable across calls", () => {
    dir = mkdtempSync(path.join(tmpdir(), "bridge-build-"));
    const file = path.join(dir, "index.js");
    writeFileSync(file, "abc");
    const expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(buildHash(file)).toBe(expected);
    expect(buildHash(file)).toBe(expected);
  });

  it("changes when a byte of the file changes", () => {
    dir = mkdtempSync(path.join(tmpdir(), "bridge-build-"));
    const file = path.join(dir, "index.js");
    writeFileSync(file, "abc");
    const before = buildHash(file);
    writeFileSync(file, "abd");
    expect(buildHash(file)).not.toBe(before);
    expect(buildHash(file)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws for a missing file (the entry turns that into a logged exit 1)", () => {
    dir = mkdtempSync(path.join(tmpdir(), "bridge-build-"));
    expect(() => buildHash(path.join(dir!, "nope.js"))).toThrow();
  });
});

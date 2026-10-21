import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findWorkspaceRoot, resolveToken } from "../src/token.js";

const SECRET = "s3cr3t-token-value";

let root: string;

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value));
}

/** root/{package.json (workspaces), sdk/src, sdk/package.json, mcp/dist} */
function makeTree(): void {
  writeJson(path.join(root, "package.json"), { name: "root", workspaces: ["sdk", "mcp"] });
  mkdirSync(path.join(root, "sdk", "src"), { recursive: true });
  mkdirSync(path.join(root, "mcp", "dist"), { recursive: true });
  writeJson(path.join(root, "sdk", "package.json"), { name: "@bridge/sdk" });
  writeJson(path.join(root, "mcp", "package.json"), { name: "@bridge/mcp" });
}

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "bridge-token-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("findWorkspaceRoot", () => {
  it("walks up to the first package.json that has a workspaces field", () => {
    makeTree();
    expect(findWorkspaceRoot(path.join(root, "sdk", "src"))).toBe(path.resolve(root));
    expect(findWorkspaceRoot(path.join(root, "mcp", "dist"))).toBe(path.resolve(root));
    expect(findWorkspaceRoot(root)).toBe(path.resolve(root));
  });

  it("skips a package.json that does not parse", () => {
    makeTree();
    writeFileSync(path.join(root, "sdk", "package.json"), "{ not json");
    expect(findWorkspaceRoot(path.join(root, "sdk", "src"))).toBe(path.resolve(root));
  });

  it("returns null when no workspace root exists above the start directory", () => {
    mkdirSync(path.join(root, "a", "b"), { recursive: true });
    expect(findWorkspaceRoot(path.join(root, "a", "b"))).toBeNull();
  });

  it("terminates at the filesystem root (dirname(dir) === dir)", () => {
    const visited: string[] = [];
    const start = path.join(path.parse(root).root, "x", "y", "z");
    const result = findWorkspaceRoot(start, (file) => {
      visited.push(file);
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    expect(result).toBeNull();
    // x/y/z, x/y, x, and the root itself — then it stops.
    expect(visited).toHaveLength(4);
    expect(visited[3]).toBe(path.join(path.parse(root).root, "package.json"));
  });
});

describe("resolveToken", () => {
  it("BRIDGE_TOKEN in the environment wins over bridge.token", () => {
    makeTree();
    writeFileSync(path.join(root, "bridge.token"), "from-file\n");
    expect(resolveToken({ env: { BRIDGE_TOKEN: "from-env" }, startDir: path.join(root, "sdk", "src") })).toBe(
      "from-env",
    );
  });

  it("an empty or whitespace BRIDGE_TOKEN does not count", () => {
    makeTree();
    writeFileSync(path.join(root, "bridge.token"), "from-file");
    expect(resolveToken({ env: { BRIDGE_TOKEN: "   " }, startDir: path.join(root, "sdk", "src") })).toBe(
      "from-file",
    );
  });

  it("reads bridge.token at the workspace root from a nested directory, trimmed", () => {
    makeTree();
    writeFileSync(path.join(root, "bridge.token"), `  ${SECRET}\r\n`);
    expect(resolveToken({ env: {}, startDir: path.join(root, "sdk", "src") })).toBe(SECRET);
  });

  it("finds it from the bundled location (mcp/dist)", () => {
    makeTree();
    writeFileSync(path.join(root, "bridge.token"), SECRET);
    expect(resolveToken({ env: {}, startDir: path.join(root, "mcp", "dist") })).toBe(SECRET);
  });

  it("ignores a bridge.token inside a nested package", () => {
    makeTree();
    writeFileSync(path.join(root, "sdk", "bridge.token"), SECRET);
    writeFileSync(path.join(root, "sdk", "src", "bridge.token"), SECRET);
    expect(() => resolveToken({ env: {}, startDir: path.join(root, "sdk", "src") })).toThrow(/BRIDGE_TOKEN/);
  });

  it("missing → throws naming the env var and the absolute bridge.token path at the root", () => {
    makeTree();
    let message = "";
    try {
      resolveToken({ env: {}, startDir: path.join(root, "sdk", "src") });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("BRIDGE_TOKEN");
    expect(message).toContain(path.join(path.resolve(root), "bridge.token"));
  });

  it("an empty bridge.token counts as missing", () => {
    makeTree();
    writeFileSync(path.join(root, "bridge.token"), " \n");
    expect(() => resolveToken({ env: {}, startDir: root })).toThrow(/bridge\.token/);
  });

  it("no workspace root → the message says so and names BRIDGE_TOKEN", () => {
    mkdirSync(path.join(root, "loose"), { recursive: true });
    const start = path.join(root, "loose");
    expect(() => resolveToken({ env: {}, startDir: start })).toThrow(/BRIDGE_TOKEN/);
    expect(() => resolveToken({ env: {}, startDir: start })).toThrow(/no workspace root found above/);
  });

  it("never puts the token value in a message (nested token present, root token missing)", () => {
    makeTree();
    writeFileSync(path.join(root, "sdk", "bridge.token"), SECRET);
    try {
      resolveToken({ env: { BRIDGE_TOKEN: "" }, startDir: path.join(root, "sdk") });
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).not.toContain(SECRET);
    }
  });
});

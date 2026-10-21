import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveDaemonPath } from "../src/paths.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "bridge-paths-"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ workspaces: ["daemon", "sdk", "mcp"] }));
  mkdirSync(path.join(root, "sdk", "src"), { recursive: true });
  mkdirSync(path.join(root, "mcp", "dist"), { recursive: true });
  mkdirSync(path.join(root, "daemon", "dist"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const daemonFile = () => path.join(path.resolve(root), "daemon", "dist", "index.js");

describe("resolveDaemonPath", () => {
  it("resolves <workspace root>/daemon/dist/index.js from sdk/src", () => {
    writeFileSync(daemonFile(), "// daemon");
    expect(resolveDaemonPath({ env: {}, startDir: path.join(root, "sdk", "src") })).toBe(daemonFile());
  });

  it("resolves the same file from the bundled location (mcp/dist)", () => {
    writeFileSync(daemonFile(), "// daemon");
    expect(resolveDaemonPath({ env: {}, startDir: path.join(root, "mcp", "dist") })).toBe(daemonFile());
  });

  it("a missing daemon/dist/index.js throws 'daemon not built — run `npm run build`' naming the path", () => {
    expect(() => resolveDaemonPath({ env: {}, startDir: path.join(root, "sdk", "src") })).toThrow(
      `daemon not built — run \`npm run build\` (looked for ${daemonFile()})`,
    );
  });

  it("BRIDGE_DAEMON overrides the workspace path and is resolved with path.resolve", () => {
    writeFileSync(daemonFile(), "// daemon");
    const other = path.join(root, "elsewhere.js");
    writeFileSync(other, "// other daemon");
    const relative = path.relative(process.cwd(), other);
    expect(resolveDaemonPath({ env: { BRIDGE_DAEMON: relative }, startDir: path.join(root, "sdk", "src") })).toBe(
      path.resolve(other),
    );
  });

  it("a missing BRIDGE_DAEMON file throws naming the path and the env var", () => {
    writeFileSync(daemonFile(), "// daemon");
    const missing = path.join(root, "nope.js");
    let message = "";
    try {
      resolveDaemonPath({ env: { BRIDGE_DAEMON: missing }, startDir: root, platform: "linux" });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("daemon not built");
    expect(message).toContain(path.resolve(missing));
    expect(message).toContain("BRIDGE_DAEMON");
    expect(message).not.toContain("native Windows path");
  });

  it("on win32 a Git-Bash style BRIDGE_DAEMON (/c/...) gets a hint to use a native Windows path", () => {
    expect(() =>
      resolveDaemonPath({ env: { BRIDGE_DAEMON: "/c/no/such/daemon/index.js" }, startDir: root, platform: "win32" }),
    ).toThrow(/native Windows path/);
  });

  it("a directory is not a daemon file", () => {
    mkdirSync(daemonFile(), { recursive: true });
    expect(() => resolveDaemonPath({ env: {}, startDir: root })).toThrow(/daemon not built/);
  });

  it("no workspace root and no BRIDGE_DAEMON → throws saying so", () => {
    const loose = mkdtempSync(path.join(os.tmpdir(), "bridge-loose-"));
    try {
      expect(() => resolveDaemonPath({ env: {}, startDir: loose })).toThrow(/no workspace root found above/);
    } finally {
      rmSync(loose, { recursive: true, force: true });
    }
  });
});

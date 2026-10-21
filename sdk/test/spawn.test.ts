import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashDaemon, spawnDaemon } from "../src/spawn.js";

describe("spawnDaemon (decision 0.8)", () => {
  it("spawns process.execPath detached, stdio ignored, hidden, with BRIDGE_TOKEN/BRIDGE_PORT, then unref()s", () => {
    const child = { unref: vi.fn(), on: vi.fn() };
    const spawn = vi.fn((..._args: unknown[]) => child);
    spawnDaemon(
      { daemonPath: "/repo/daemon/dist/index.js", port: 9234, token: "tkn" },
      { spawn, execPath: "/usr/bin/node-real", env: { PATH: "/bin", BRIDGE_PORT: "1" } },
    );

    expect(spawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = spawn.mock.calls[0] as [string, string[], Record<string, unknown>];
    expect(cmd).toBe("/usr/bin/node-real");
    expect(args).toEqual(["/repo/daemon/dist/index.js"]);
    expect(opts).toEqual({
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { PATH: "/bin", BRIDGE_TOKEN: "tkn", BRIDGE_PORT: "9234" },
    });
    expect(child.unref).toHaveBeenCalledTimes(1);
    // An async spawn error must not become an unhandled 'error' event.
    expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
    const onError = child.on.mock.calls.find((c) => c[0] === "error")?.[1] as (e: Error) => void;
    expect(() => onError(new Error("spawn ENOENT"))).not.toThrow();
  });

  it("defaults to process.execPath", () => {
    const child = { unref: vi.fn(), on: vi.fn() };
    const spawn = vi.fn((..._args: unknown[]) => child);
    spawnDaemon({ daemonPath: "d.js", port: 1, token: "t" }, { spawn });
    expect(spawn.mock.calls[0][0]).toBe(process.execPath);
  });
});

describe("hashDaemon (decision 0.5)", () => {
  it("is the sha256 hex of the file", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "bridge-hash-"));
    try {
      const file = path.join(dir, "index.js");
      writeFileSync(file, "console.log('daemon')\n");
      const expected = createHash("sha256").update("console.log('daemon')\n").digest("hex");
      await expect(hashDaemon(file)).resolves.toBe(expected);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

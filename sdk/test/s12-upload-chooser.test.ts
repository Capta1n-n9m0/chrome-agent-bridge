// Step 12 S5b (phase doc 0.7, exit check E5.3; decisions.md #325, #336, #353): `Tab.upload(target, paths,
// {chooser})`. Without `chooser` (or with `null`) the `uploadFiles` params are exactly today's; a boolean is sent as
// given; any other value is refused `BAD_PARAMS` before any call or file read (the shared guard accepts only a
// boolean, so `null` is never sent). The SDK's eight values are unchanged.
import { describe, it, expect, expectTypeOf, vi, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BridgeError, ErrorCodes } from "@bridge/shared";
import { BridgeClient } from "../src/client.js";
import { Tab, type TabHost } from "../src/tab.js";
import type { UploadOptions } from "../src/index.js";

const SENTINEL_DIR = "SENTINEL-CHOOSER-DIR-K7P";

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function fileWith(content: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "bridge-s12ch-"));
  dirs.push(root);
  mkdirSync(path.join(root, SENTINEL_DIR));
  const file = path.join(root, SENTINEL_DIR, "a.txt");
  writeFileSync(file, content);
  return file;
}

function hostTab() {
  const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const host: TabHost = {
    call: vi.fn(async (method: string, params: Record<string, unknown> = {}) => {
      calls.push({ method, params });
      return { files: (params.paths as unknown[]).length };
    }),
    generation: () => 1,
  };
  return { tab: new Tab(host, "T3", 1), calls, host };
}

describe("S5b Tab.upload {chooser}", () => {
  it("without chooser, or with chooser undefined or null, the params are exactly today's (no chooser key)", async () => {
    const file = fileWith("x");
    const real = await realpath(file);
    for (const options of [undefined, {}, { timeoutMs: 5000 }, { chooser: undefined }, { chooser: null }] as Array<UploadOptions | undefined>) {
      const { tab, calls } = hostTab();
      await tab.upload("e1", file, options);
      expect(calls).toEqual([{ method: "uploadFiles", params: { ref: "e1", paths: [real], tab: "T3" } }]);
      expect(Object.keys(calls[0]!.params)).toEqual(["ref", "paths", "tab"]);
    }
  });

  it("chooser: true is sent; chooser: false is sent as false", async () => {
    const file = fileWith("x");
    const real = await realpath(file);
    const a = hostTab();
    await a.tab.upload("e9", file, { chooser: true });
    expect(a.calls).toEqual([{ method: "uploadFiles", params: { ref: "e9", paths: [real], chooser: true, tab: "T3" } }]);
    const c = hostTab();
    await c.tab.upload("e9", file, { chooser: false });
    expect(c.calls[0]!.params).toEqual({ ref: "e9", paths: [real], chooser: false, tab: "T3" });
  });

  it("any other chooser value is BAD_PARAMS before any call or file read, naming no path", async () => {
    const missing = path.join(os.tmpdir(), SENTINEL_DIR, "missing.txt");
    for (const bad of ["yes", 1, 0, {}, []]) {
      const { tab, host } = hostTab();
      const err = await tab.upload("e1", missing, { chooser: bad } as unknown as UploadOptions).then(() => null, (e: unknown) => e as BridgeError);
      expect(err, JSON.stringify(bad)).toBeInstanceOf(BridgeError);
      expect(err!.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err!.message).toBe("upload: chooser must be true or false");
      expect(host.call).not.toHaveBeenCalled();
    }
  });

  it("client.upload hands chooser to the cursor's Tab.upload; UploadOptions gains an optional boolean; eight values", async () => {
    const upload = vi.fn(async () => ({ files: [] }));
    const client = Object.create(BridgeClient.prototype) as BridgeClient;
    (client as unknown as { tab: () => unknown }).tab = () => ({ upload });
    await client.upload("e2", "/x", { chooser: true });
    expect(upload).toHaveBeenCalledWith("e2", "/x", { chooser: true });
    expectTypeOf<UploadOptions["chooser"]>().toEqualTypeOf<boolean | undefined>();
    expect(Object.keys(await import("../src/index.js"))).toHaveLength(8);
  });
});

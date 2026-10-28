// Step 11 S4 (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.8; exit checks S4.1, S4.2; decisions.md ·
// 2026-10-25 · Step 11: `Tab.upload`'s signature and result (#240); Stage 0 F8): `Tab.upload` and its cursor mirror
// `client.upload`. A client preflight runs before any call — every path absolute, existing, a regular file, readable —
// and a refusal is `BAD_PARAMS` with zero calls. What is sent is `fs.promises.realpath` of each file (F8: it
// canonicalises case and 8.3 names and resolves a junction), so the extension's folder rule sees the real path. The
// result is `{files: [{name, bytes, sha256}]}` from the bytes the client read. The preflight is a convenience, never
// the security boundary (the folder rule is the extension's). No refusal message names a path.
import { describe, it, expect, expectTypeOf, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BridgeError, ErrorCodes, type Locator, type WelcomeMessage } from "@bridge/shared";
import { BridgeClient, type Timers } from "../src/client.js";
import type { Knocked } from "../src/knock.js";
import type { Target } from "../src/locator.js";
import { Tab, type TabHost } from "../src/tab.js";
import { prepareUpload } from "../src/upload.js";
import type { UploadOptions, UploadResult } from "../src/index.js";
import { FakeConnection } from "./fakes.js";

/** A directory name that must never appear in a message or a frame other than the paths themselves. */
const SENTINEL_DIR = "SENTINEL-UPLOAD-DIR-Q8Z";

let cleanups: Array<() => void> = [];
afterEach(() => {
  for (const c of cleanups.reverse()) c();
  cleanups = [];
});

function tempDir(): string {
  const d = mkdtempSync(path.join(os.tmpdir(), "bridge-s11u-"));
  cleanups.push(() => rmSync(d, { recursive: true, force: true }));
  return d;
}

/** A file under `<temp>/<SENTINEL_DIR>/` with `content`; returns its path as created. */
function fileWith(content: string | Buffer, name = "report.txt"): string {
  const dir = path.join(tempDir(), SENTINEL_DIR);
  mkdirSync(dir);
  const file = path.join(dir, name);
  writeFileSync(file, content);
  return file;
}

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (err) {
    return err as BridgeError;
  }
  throw new Error("expected a rejection");
}

function welcome(over: Partial<WelcomeMessage> = {}): WelcomeMessage {
  return { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true, ...over };
}
const noTimers: Timers = { setTimeout: () => ({}), clearTimeout: () => {} };

/** A connected client over a scripted daemon; `uploadReply` answers `uploadFiles`. */
async function connectedClient(uploadReply: (params: Record<string, unknown>) => unknown = (p) => ({ files: (p.paths as unknown[]).length })) {
  const conn = new FakeConnection((m, c) => {
    if (typeof m.method !== "string") return;
    const p = (m.params ?? {}) as Record<string, unknown>;
    let r: unknown = { ok: true };
    if (m.method === "tabs.claim") r = { tab: "T3" };
    if (m.method === "uploadFiles") r = uploadReply(p);
    c.emit({ id: m.id, result: r });
  });
  const knock = vi.fn(async (): Promise<Knocked> => ({ conn, welcome: welcome() }));
  const client = new BridgeClient({ knock, timers: noTimers, failureReports: false });
  await client.connect();
  return { client, conn };
}

const sent = (conn: FakeConnection) =>
  conn.sent.filter((f) => typeof f.method === "string").map((f) => ({ method: f.method, params: f.params, timeoutMs: f.timeoutMs }));

/** A Tab over a recording host (generation 1). */
function hostTab(reply: (method: string, params: Record<string, unknown>) => unknown = (_m, p) => ({ files: (p.paths as unknown[]).length })) {
  const calls: Array<{ method: string; params: Record<string, unknown>; options?: { timeoutMs?: number } }> = [];
  const host: TabHost = {
    call: vi.fn(async (method: string, params: Record<string, unknown> = {}, options?: { timeoutMs?: number }) => {
      calls.push({ method, params, ...(options ? { options } : {}) });
      return reply(method, params);
    }),
    generation: () => 1,
  };
  return { tab: new Tab(host, "T3", 1), calls, host };
}

// ---------------------------------------------------------------- S4.1: refusals with no call

describe("S4.1 the preflight refuses before any call (BAD_PARAMS, zero calls)", () => {
  const cases: Array<[string, () => unknown]> = [
    ["a relative path", () => path.join(SENTINEL_DIR, "report.txt")],
    ["a missing file", () => path.join(tempDir(), SENTINEL_DIR, "missing.txt")],
    ["a directory", () => {
      const d = path.join(tempDir(), SENTINEL_DIR);
      mkdirSync(d);
      return d;
    }],
    ["an empty string", () => ""],
    ["an empty list", () => []],
    ["21 paths (over the cap of 20)", () => Array.from({ length: 21 }, () => fileWith("x"))],
    ["a non-string entry", () => [fileWith("x"), 42]],
    ["one good path and one missing", () => [fileWith("x"), path.join(tempDir(), SENTINEL_DIR, "gone.txt")]],
  ];

  for (const [what, make] of cases) {
    it(`${what}: Tab.upload refuses BAD_PARAMS, makes no call, and names no path`, async () => {
      const { tab, host } = hostTab();
      const paths = make();
      const err = await rejection(tab.upload("e1", paths as string[]));
      expect(err).toBeInstanceOf(BridgeError);
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(host.call).not.toHaveBeenCalled();
      expect(err.message).not.toContain(SENTINEL_DIR);
      expect(err.message).not.toContain(os.tmpdir());
    });
  }

  it("the same refusal through client.upload sends nothing past the claim", async () => {
    const { client, conn } = await connectedClient();
    await client.claim("T3");
    const before = sent(conn).length;
    const err = await rejection(client.upload("e1", "relative.txt"));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(sent(conn)).toHaveLength(before);
  });

  it("a bad target is refused before the files are read, with no call", async () => {
    const { tab, host } = hostTab();
    const err = await rejection(tab.upload({ name: "x" } as unknown as Target, fileWith("x")));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(host.call).not.toHaveBeenCalled();
  });

  it("a stale Tab (from before a 4002 reconnect) refuses TAB_UNKNOWN with no call", async () => {
    const host = { call: vi.fn(), generation: () => 2 };
    const tab = new Tab(host, "T3", 1);
    const err = await rejection(tab.upload("e1", fileWith("x")));
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    expect(host.call).not.toHaveBeenCalled();
  });

  it("client.upload without a cursor: NO_CURSOR and nothing sent", async () => {
    const { client, conn } = await connectedClient();
    const err = await rejection(client.upload("e1", fileWith("x")));
    expect(err.code).toBe(ErrorCodes.NO_CURSOR);
    expect(sent(conn)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- S4.1: the real path, the hash

describe("S4.1 what is sent is the real path; the result is what the client read", () => {
  it("one file: uploadFiles {ref, paths: [realpath], tab}; result {name, bytes, sha256} equals the file's", async () => {
    const content = Buffer.from("hello upload\né", "utf8");
    const file = fileWith(content);
    const { tab, calls } = hostTab();
    const r = await tab.upload("e7", file);
    expect(calls).toEqual([{ method: "uploadFiles", params: { ref: "e7", paths: [await realpath(file)], tab: "T3" } }]);
    expect(r).toEqual({ files: [{ name: "report.txt", bytes: content.length, sha256: sha(content) }] });
  });

  it("a locator target and several paths, in order; timeoutMs is the call's", async () => {
    const a = fileWith("aaa", "a.txt");
    const b = fileWith(Buffer.alloc(3 * 1024 * 1024 + 17, 9), "b.bin");
    const { tab, calls } = hostTab();
    const locator: Locator = { role: "button", name: "Attach" };
    const r = await tab.upload(locator, [a, b], { timeoutMs: 45_000 });
    expect(calls).toEqual([
      { method: "uploadFiles", params: { locator, paths: [await realpath(a), await realpath(b)], tab: "T3" }, options: { timeoutMs: 45_000 } },
    ]);
    expect(r.files.map((f) => f.name)).toEqual(["a.txt", "b.bin"]);
    expect(r.files[1]).toEqual({ name: "b.bin", bytes: 3 * 1024 * 1024 + 17, sha256: sha(Buffer.alloc(3 * 1024 * 1024 + 17, 9)) });
  });

  it("a path through a junction (a directory link) is sent as the real path behind it", async () => {
    const root = tempDir();
    const real = path.join(root, "real-target");
    mkdirSync(real);
    writeFileSync(path.join(real, "inside.txt"), "behind the link");
    const link = path.join(root, "the-link");
    symlinkSync(real, link, "junction");
    // Remove the link itself before the recursive delete (never let a delete follow it; root CLAUDE.md gotcha).
    cleanups.push(() => {
      try {
        unlinkSync(link);
      } catch {
        rmSync(link, { force: true });
      }
    });
    const viaLink = path.join(link, "inside.txt");
    const { tab, calls } = hostTab();
    const r = await tab.upload("e1", viaLink);
    const sentPath = (calls[0]!.params.paths as string[])[0]!;
    expect(sentPath).toBe(await realpath(path.join(real, "inside.txt")));
    expect(sentPath).not.toContain("the-link");
    expect(sentPath).toContain("real-target");
    expect(r.files[0]!.sha256).toBe(sha("behind the link"));
  });

  it.runIf(process.platform === "win32")("F8: the sent path is canonical (fs.promises.realpath), not the given case", async () => {
    const file = fileWith("case", "MixedCase.TXT");
    const lowered = file.toLowerCase();
    const { tab, calls } = hostTab();
    await tab.upload("e1", lowered);
    const sentPath = (calls[0]!.params.paths as string[])[0]!;
    expect(sentPath).toBe(await realpath(file));
    expect(sentPath.endsWith("MixedCase.TXT")).toBe(true);
    // realpathSync (JS) keeps the given case — the preflight must not use it (Stage 0 F8).
    expect(realpathSync(lowered)).not.toBe(sentPath);
  });

  it("no focusTab is sent: the upload is not trusted input", async () => {
    const { client, conn } = await connectedClient();
    await client.claim("T3");
    await client.upload("e1", fileWith("x"));
    expect(sent(conn).map((f) => f.method)).toEqual(["tabs.claim", "uploadFiles"]);
  });

  it("client.upload mirrors the cursor Tab: the same frames", async () => {
    const file = fileWith("same");
    const viaTab = await connectedClient();
    const viaClient = await connectedClient();
    const r1 = await (await viaTab.client.claim("T3")).upload({ css: "#f" }, [file], { timeoutMs: 9000 });
    await viaClient.client.claim("T3");
    const r2 = await viaClient.client.upload({ css: "#f" }, [file], { timeoutMs: 9000 });
    expect(sent(viaClient.conn)).toStrictEqual(sent(viaTab.conn));
    expect(r2).toEqual(r1);
  });

  it("a reply with pastSnapshotCap emits one warning event and still resolves the result", async () => {
    const { client } = await connectedClient((p) => ({ files: (p.paths as unknown[]).length, pastSnapshotCap: true }));
    const seen: unknown[] = [];
    client.on("warning", (w) => seen.push(w));
    const tab = await client.claim("T3");
    const r = await tab.upload({ text: "Attach" }, fileWith("w"));
    expect(seen).toEqual([{ tab: "T3", method: "uploadFiles", kind: "pastSnapshotCap" }]);
    expect(r.files).toHaveLength(1);
  });
});

// ---------------------------------------------------------------- failure reports

describe("UPLOAD_REFUSED gets no failure report; an attach-set code does", () => {
  function reportingTab(code: string) {
    const calls: string[] = [];
    const failures = tempDir();
    const host: TabHost = {
      call: async (method: string) => {
        calls.push(method);
        if (method === "uploadFiles") throw new BridgeError(code, `refused (${code})`);
        if (method === "snapshot") return { url: "http://127.0.0.1/", title: "t", elements: [], truncated: false };
        if (method === "networkRequests") return { entries: [] };
        throw new BridgeError(ErrorCodes.INTERNAL, "no screenshot here");
      },
      generation: () => 1,
      failureReports: () => ({
        timers: { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
        env: { BRIDGE_FAILURES_DIR: failures },
        homedir: () => failures,
        now: () => 0,
      }),
    };
    return { tab: new Tab(host, "T3", 1), calls };
  }

  it("UPLOAD_REFUSED rejects with its code and makes no other call", async () => {
    const { tab, calls } = reportingTab(ErrorCodes.UPLOAD_REFUSED);
    const err = await rejection(tab.upload("e1", fileWith("x")));
    expect(err.code).toBe(ErrorCodes.UPLOAD_REFUSED);
    expect(calls).toEqual(["uploadFiles"]);
  });

  it("REF_STALE gets the usual failure report (a snapshot is read)", async () => {
    const { tab, calls } = reportingTab(ErrorCodes.REF_STALE);
    const err = await rejection(tab.upload("e1", fileWith("x")));
    expect(err.code).toBe(ErrorCodes.REF_STALE);
    expect(calls[0]).toBe("uploadFiles");
    expect(calls).toContain("snapshot");
  });
});

// ---------------------------------------------------------------- prepareUpload (shared with the MCP)

describe("prepareUpload: the preflight the SDK and the MCP share", () => {
  it("accepts a single string or a list and answers real path, name, bytes, sha256 per file", async () => {
    const a = fileWith("one", "one.txt");
    expect(await prepareUpload(a)).toEqual([{ path: await realpath(a), name: "one.txt", bytes: 3, sha256: sha("one") }]);
    expect(await prepareUpload([a, a])).toHaveLength(2);
  });

  it("an empty file is a file (0 bytes, the empty hash)", async () => {
    const e = fileWith("", "empty.txt");
    expect(await prepareUpload([e])).toEqual([{ path: await realpath(e), name: "empty.txt", bytes: 0, sha256: sha("") }]);
  });

  it("names the failing entry by its index, never by its path", async () => {
    const good = fileWith("g");
    const err = await rejection(prepareUpload([good, path.join(tempDir(), SENTINEL_DIR, "nope.txt")]));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toContain("paths[1]");
    expect(err.message).not.toContain(SENTINEL_DIR);
    expect(err.message).not.toContain("nope.txt");
  });
});

// ---------------------------------------------------------------- S4.2: the surface

describe("S4.2 the surface: eight values; Tab.upload and client.upload pinned (type equality; checked by tsc)", () => {
  it("still exactly eight values; UploadOptions and UploadResult are types only", async () => {
    const sdk = await import("../src/index.js");
    expect(Object.keys(sdk).sort()).toEqual(
      ["BridgeClient", "BridgeError", "ErrorCodes", "Tab", "connect", "downloadToFile", "formatNetwork", "formatSnapshot"].sort(),
    );
  });

  it("the signatures and shapes, written out literally (phase doc 0.8, #240)", () => {
    // Re-pinned 2026-10-28 (Step 12 S5b; #325, #336, #353): gains exactly `chooser?: boolean` (was `{ timeoutMs?: number }`).
    expectTypeOf<UploadOptions>().toEqualTypeOf<{ timeoutMs?: number; chooser?: boolean }>();
    expectTypeOf<UploadResult>().toEqualTypeOf<{ files: { name: string; bytes: number; sha256: string }[] }>();
    expectTypeOf<Tab["upload"]>().toEqualTypeOf<
      (target: Target, paths: string | string[], options?: UploadOptions) => Promise<UploadResult>
    >();
    expectTypeOf<BridgeClient["upload"]>().toEqualTypeOf<
      (target: Target, paths: string | string[], options?: UploadOptions) => Promise<UploadResult>
    >();
  });
});

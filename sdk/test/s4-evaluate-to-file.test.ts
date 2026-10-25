// Step 10 S4 (phase doc 0.4, amended by Stage 0 F11, F12, V8; decisions.md #205, #207): the SDK half of
// `browser_evaluate {saveTo}` — `Tab.evaluateToFile` (and its `BridgeClient` mirror on the cursor, F21) over
// `evaluateSaveStart` / `evaluateSaveChunk` / `evaluateSaveEnd`. The file rules are checked before any wire
// call; the bytes go to `<path>.part` (opened "wx"), then a rename; `.part` is removed on every failure; the
// end is sent best-effort on every exit after a start. No message carries any part of the value.
import { describe, it, expect, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BridgeError, ErrorCodes, type WelcomeMessage } from "@bridge/shared";
import { BridgeClient, type Timers } from "../src/client.js";
import type { Knocked } from "../src/knock.js";
import { Tab } from "../src/tab.js";
import { SAVE_CHUNK_BYTES, SAVE_TRANSFER_MS, checkSaveTarget, saveEvaluateToFile } from "../src/evaluate-save.js";
import { FakeConnection } from "./fakes.js";

const SENTINEL = "SENTINEL-VALUE-K7P2";
let dirs: string[] = [];
function tempDir(): string {
  const d = mkdtempSync(path.join(os.tmpdir(), "bridge-s4-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

type Frame = { method: string; params: Record<string, unknown>; timeoutMs?: number };

/**
 * A raw `call` that plays the extension's store for one value: start → {id, bytes, kind}, chunks of base64,
 * end. `fail` hooks let a test refuse a step.
 */
function fakeExtension(value: string, o: { kind?: "string" | "json"; failStart?: unknown; failChunkAt?: number; chunkErr?: unknown; lieBytes?: number; emptyAt?: number } = {}) {
  const bytes = Buffer.from(new TextEncoder().encode(value));
  const frames: Frame[] = [];
  let chunks = 0;
  const call = vi.fn(async (method: string, params: Record<string, unknown> = {}, options?: { timeoutMs?: number }) => {
    frames.push({ method, params, ...(options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}) });
    if (method === "evaluateSaveStart") {
      if (o.failStart) throw o.failStart;
      return { id: "es1-abc", bytes: o.lieBytes ?? bytes.length, kind: o.kind ?? "string" };
    }
    if (method === "evaluateSaveChunk") {
      chunks++;
      if (o.failChunkAt === chunks) throw o.chunkErr ?? new BridgeError(ErrorCodes.INTERNAL, "Unknown or expired evaluateSave id: es1-abc");
      if (o.emptyAt === chunks) return { data: "" };
      const off = Number(params.offset);
      const len = Math.min(Number(params.length), SAVE_CHUNK_BYTES);
      return { data: bytes.subarray(off, off + len).toString("base64") };
    }
    if (method === "evaluateSaveEnd") return { released: true };
    throw new Error(`unexpected ${method}`);
  });
  return { call, frames, bytes, methods: () => frames.map((f) => f.method) };
}

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (err) {
    return err as BridgeError;
  }
  throw new Error("expected a rejection");
}

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

describe("saveEvaluateToFile — the happy path", () => {
  it("writes the value's UTF-8 to the path, returns {path, bytes, kind, sha256}, sends end, leaves no .part", async () => {
    const dir = tempDir();
    const target = path.join(dir, "out.txt");
    const value = `${SENTINEL}-é€😀-` + "y".repeat(2 * SAVE_CHUNK_BYTES + 17);
    const ext = fakeExtension(value);
    const r = await saveEvaluateToFile(ext.call, "T3", "return big", { path: target, timeoutMs: 2000 });
    expect(r).toEqual({ path: target, bytes: ext.bytes.length, kind: "string", sha256: sha(ext.bytes) });
    expect(readFileSync(target).equals(ext.bytes)).toBe(true);
    expect(readdirSync(dir)).toEqual(["out.txt"]);
    expect(ext.frames[0]).toEqual({
      method: "evaluateSaveStart",
      params: { expression: "return big", timeoutMs: 2000, tab: "T3" },
      timeoutMs: 2000 + SAVE_TRANSFER_MS + 5000,
    });
    const chunkFrames = ext.frames.filter((f) => f.method === "evaluateSaveChunk");
    expect(chunkFrames).toHaveLength(3);
    for (const f of chunkFrames) expect(f.params).toEqual({ id: "es1-abc", offset: f.params.offset, length: SAVE_CHUNK_BYTES, tab: "T3" });
    expect(ext.frames[ext.frames.length - 1]).toEqual({ method: "evaluateSaveEnd", params: { id: "es1-abc", tab: "T3" } });
    expect(JSON.stringify(r)).not.toContain(SENTINEL);
  });

  it("a BOM is never added; an empty string makes an empty file; the default page timeout is 10 s", async () => {
    const dir = tempDir();
    const target = path.join(dir, "empty.json");
    const ext = fakeExtension("", { kind: "json" });
    const r = await saveEvaluateToFile(ext.call, "T1", "''", { path: target });
    expect(r.bytes).toBe(0);
    expect(readFileSync(target).length).toBe(0);
    expect(ext.methods()).toEqual(["evaluateSaveStart", "evaluateSaveEnd"]);
    expect(ext.frames[0]!.params.timeoutMs).toBe(10_000);

    const t2 = path.join(dir, "a.txt");
    await saveEvaluateToFile(fakeExtension("abc").call, "T1", "x", { path: t2 });
    expect(readFileSync(t2).toString("hex")).toBe("616263");
  });

  it("overwrite:true replaces an existing file", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    writeFileSync(target, "old");
    await saveEvaluateToFile(fakeExtension("new").call, "T1", "x", { path: target, overwrite: true });
    expect(readFileSync(target, "utf8")).toBe("new");
  });
});

// S4 fixer round 1, verifier finding 5: a file created at the target after the check and before the finish.
describe("saveEvaluateToFile — a file appearing at the target during the save (the rename race)", () => {
  /** The fake extension, with a file written at `target` while the first chunk is pulled. */
  function racing(target: string, value = "fresh-value") {
    const ext = fakeExtension(value);
    const inner = ext.call.getMockImplementation()!;
    let planted = false;
    ext.call.mockImplementation(async (method: string, params: Record<string, unknown> = {}, options?: { timeoutMs?: number }) => {
      if (method === "evaluateSaveChunk" && !planted) {
        planted = true;
        writeFileSync(target, "someone-else");
      }
      return inner(method, params, options);
    });
    return ext;
  }

  it("overwrite not set: refused BAD_PARAMS \"exists\", the new file untouched, .part gone, end sent", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = racing(target);
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toMatch(/exists/);
    expect(readFileSync(target, "utf8")).toBe("someone-else");
    expect(readdirSync(dir)).toEqual(["f.txt"]);
    expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
  });

  it("overwrite:true: the file that appeared is replaced", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = racing(target);
    const r = await saveEvaluateToFile(ext.call, "T1", "x", { path: target, overwrite: true });
    expect(r.bytes).toBe(Buffer.byteLength("fresh-value"));
    expect(readFileSync(target, "utf8")).toBe("fresh-value");
    expect(readdirSync(dir)).toEqual(["f.txt"]);
  });

  for (const code of ["EPERM", "ENOTSUP", "EXDEV", "ENOSYS"]) {
    it(`link unsupported (${code}): the fallback re-checks and still refuses the file that appeared`, async () => {
      const dir = tempDir();
      const target = path.join(dir, "f.txt");
      const ext = racing(target);
      let links = 0;
      const link = async () => {
        links++;
        throw Object.assign(new Error(`${code}: link not supported`), { code });
      };
      const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }, { link }));
      expect(links).toBe(1);
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err.message).toMatch(/exists/);
      expect(readFileSync(target, "utf8")).toBe("someone-else");
      expect(readdirSync(dir)).toEqual(["f.txt"]);
      expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
    });
  }

  it("link unsupported, no file appeared: the fallback renames and the save succeeds", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension("abc");
    let links = 0;
    const link = async () => {
      links++;
      throw Object.assign(new Error("EPERM: operation not permitted, link"), { code: "EPERM" });
    };
    const r = await saveEvaluateToFile(ext.call, "T1", "x", { path: target }, { link });
    expect(links).toBe(1);
    expect(r.sha256).toBe(sha(Buffer.from("abc")));
    expect(readFileSync(target, "utf8")).toBe("abc");
    expect(readdirSync(dir)).toEqual(["f.txt"]);
  });

  it("another link error (not \"unsupported\") fails the save with .part removed and the target untouched", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension("abc");
    const link = async () => {
      throw Object.assign(new Error("EIO: i/o error, link"), { code: "EIO" });
    };
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }, { link }));
    expect(err.message).toMatch(/EIO/);
    expect(readdirSync(dir)).toEqual([]);
    expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
  });
});

// S4 fixer round 2, verifier finding R1-1: after a successful hard link, `<path>.part` is a second name holding the
// whole value; a failed removal must be retried, and no success is reported while it remains.
describe("saveEvaluateToFile — the .part removal after a successful link (R1-1)", () => {
  /** An `rm` seam that fails the first `failures` removals of `.part` files, then removes for real. */
  function flakyRm(failures: number) {
    let partCalls = 0;
    const rmSeam = async (file: string) => {
      if (file.endsWith(".part")) {
        partCalls++;
        if (partCalls <= failures) throw Object.assign(new Error("EBUSY: resource busy or locked, unlink"), { code: "EBUSY" });
      }
      rmSync(file, { force: true });
    };
    return { rm: rmSeam, partCalls: () => partCalls };
  }

  it("the first removal fails, the retry succeeds: the save succeeds with no .part left", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension("abc");
    const seam = flakyRm(1);
    const r = await saveEvaluateToFile(ext.call, "T1", "x", { path: target }, { rm: seam.rm });
    expect(seam.partCalls()).toBe(2);
    expect(r.sha256).toBe(sha(Buffer.from("abc")));
    expect(readFileSync(target, "utf8")).toBe("abc");
    expect(readdirSync(dir)).toEqual(["f.txt"]);
    expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
  });

  it("both removals fail: no success is reported while .part remains (INTERNAL naming .part), end sent", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension(`${SENTINEL}-abc`);
    const seam = flakyRm(Infinity);
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }, { rm: seam.rm }));
    expect(seam.partCalls()).toBe(2);
    expect(err).toBeInstanceOf(BridgeError);
    expect(err.code).toBe(ErrorCodes.INTERNAL);
    expect(err.message).toContain(`${target}.part`);
    expect(err.message).toMatch(/could not be removed/);
    expect(err.message).not.toContain(SENTINEL);
    // The requested file stays (complete, the asked-for result); the .part is the one the error names.
    expect(readFileSync(target, "utf8")).toBe(`${SENTINEL}-abc`);
    expect(readdirSync(dir).sort()).toEqual(["f.txt", "f.txt.part"]);
    expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
  });

  it("overwrite:true (rename) and the link-unsupported fallback never call the .part removal", async () => {
    const dir = tempDir();
    const t1 = path.join(dir, "a.txt");
    const s1 = flakyRm(Infinity);
    await saveEvaluateToFile(fakeExtension("abc").call, "T1", "x", { path: t1, overwrite: true }, { rm: s1.rm });
    expect(s1.partCalls()).toBe(0);
    const t2 = path.join(dir, "b.txt");
    const s2 = flakyRm(Infinity);
    const link = async () => {
      throw Object.assign(new Error("EPERM: operation not permitted, link"), { code: "EPERM" });
    };
    await saveEvaluateToFile(fakeExtension("abc").call, "T1", "x", { path: t2 }, { rm: s2.rm, link });
    expect(s2.partCalls()).toBe(0);
    expect(readdirSync(dir).sort()).toEqual(["a.txt", "b.txt"]);
  });
});

describe("saveEvaluateToFile — the file rules (F11): BAD_PARAMS before any wire call, no file left", () => {
  it("a relative path", async () => {
    const ext = fakeExtension("v");
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: "rel/out.txt" }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toMatch(/absolute/);
    expect(ext.call).not.toHaveBeenCalled();
  });

  it("a path ending in a separator, and an existing directory", async () => {
    const dir = tempDir();
    for (const p of [dir + path.sep, dir]) {
      const ext = fakeExtension("v");
      const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: p, overwrite: true }));
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(ext.call).not.toHaveBeenCalled();
    }
    expect(readdirSync(dir)).toEqual([]);
  });

  it("a missing parent directory: nothing is created", async () => {
    const dir = tempDir();
    const ext = fakeExtension("v");
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: path.join(dir, "no", "such", "f.txt") }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toMatch(/parent directory/);
    expect(existsSync(path.join(dir, "no"))).toBe(false);
    expect(ext.call).not.toHaveBeenCalled();
  });

  it("an existing file without overwrite: left as it was", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    writeFileSync(target, "keep");
    const ext = fakeExtension("v");
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toMatch(/overwrite/);
    expect(readFileSync(target, "utf8")).toBe("keep");
    expect(ext.call).not.toHaveBeenCalled();
  });

  it("an existing <path>.part (opened \"wx\"): refused, the .part left as it was", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    writeFileSync(`${target}.part`, "someone else's");
    const ext = fakeExtension("v");
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target, overwrite: true }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toMatch(/\.part/);
    expect(readFileSync(`${target}.part`, "utf8")).toBe("someone else's");
    expect(existsSync(target)).toBe(false);
    expect(ext.call).not.toHaveBeenCalled();
  });

  it("checkSaveTarget normalises an absolute file path", () => {
    const dir = tempDir();
    expect(checkSaveTarget(path.join(dir, "a", "..", "b.txt"))).toBe(path.join(dir, "b.txt"));
    expect(() => checkSaveTarget("")).toThrow(BridgeError);
  });
});

describe("saveEvaluateToFile — failures remove .part (V8, mid-write)", () => {
  it("the start is refused (DISARMED): no file, no .part, no end (there is no id)", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension("v", { failStart: new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" }) });
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }));
    expect(err.code).toBe(ErrorCodes.DISARMED);
    expect(readdirSync(dir)).toEqual([]);
    expect(ext.methods()).toEqual(["evaluateSaveStart"]);
  });

  it("the store was lost (a worker restart): the pull's refusal surfaces, .part removed, end sent", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension("v".repeat(3 * SAVE_CHUNK_BYTES), { failChunkAt: 2 });
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }));
    expect(err.code).toBe(ErrorCodes.INTERNAL);
    expect(err.message).toMatch(/Unknown or expired evaluateSave id/);
    expect(readdirSync(dir)).toEqual([]);
    expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
  });

  it("an empty chunk before the end, and a size mismatch, fail with .part removed", async () => {
    for (const o of [{ emptyAt: 1 }, { lieBytes: 2 }]) {
      const dir = tempDir();
      const target = path.join(dir, "f.txt");
      const ext = fakeExtension("abcdef", o);
      const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x", { path: target }));
      expect(err).toBeInstanceOf(Error);
      expect(readdirSync(dir)).toEqual([]);
      expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
    }
  });

  it("a write error mid-file: .part removed, end sent, the message names no part of the value", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension(SENTINEL.repeat(200_000));
    let writes = 0;
    const err = await rejection(
      saveEvaluateToFile(ext.call, "T1", "x", { path: target }, {
        open: async (p, flags) => {
          const fh = await open(p, flags);
          const write = fh.write.bind(fh);
          (fh as unknown as { write: unknown }).write = async (b: Uint8Array) => {
            if (++writes === 2) throw new Error("ENOSPC: no space left on device, write");
            return write(b);
          };
          return fh;
        },
      }),
    );
    expect(err.message).toMatch(/ENOSPC/);
    expect(err.message).not.toContain(SENTINEL);
    expect(readdirSync(dir)).toEqual([]);
    expect(ext.methods().at(-1)).toBe("evaluateSaveEnd");
  });

  it("a page error from the start never names the path's contents, and leaves nothing", async () => {
    const dir = tempDir();
    const target = path.join(dir, "f.txt");
    const ext = fakeExtension("v", { failStart: new BridgeError(ErrorCodes.PAGE_ERROR, "TypeError: x is not a function", { name: "TypeError" }) });
    const err = await rejection(saveEvaluateToFile(ext.call, "T1", "x()", { path: target }));
    expect(err.code).toBe(ErrorCodes.PAGE_ERROR);
    expect(readdirSync(dir)).toEqual([]);
  });
});

// ---------------------------------------------------------------- Tab and the client mirror (F21)

function welcome(over: Partial<WelcomeMessage> = {}): WelcomeMessage {
  return { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true, ...over };
}
const noTimers: Timers = { setTimeout: () => ({}), clearTimeout: () => {} };

async function connectedClient(value: string) {
  const bytes = Buffer.from(value);
  const conn = new FakeConnection((m, c) => {
    if (typeof m.method !== "string") return;
    const p = (m.params ?? {}) as Record<string, unknown>;
    let r: unknown = { ok: true };
    if (m.method === "tabs.claim") r = { tab: "T3" };
    if (m.method === "evaluateSaveStart") r = { id: "es9", bytes: bytes.length, kind: "json" };
    if (m.method === "evaluateSaveChunk") r = { data: bytes.subarray(Number(p.offset), Number(p.offset) + SAVE_CHUNK_BYTES).toString("base64") };
    if (m.method === "evaluateSaveEnd") r = { released: true };
    c.emit({ id: m.id, result: r });
  });
  const knock = vi.fn(async (): Promise<Knocked> => ({ conn, welcome: welcome() }));
  const client = new BridgeClient({ knock, timers: noTimers });
  await client.connect();
  return { client, conn };
}

const sent = (conn: FakeConnection) =>
  conn.sent.filter((f) => typeof f.method === "string").map((f) => ({ method: f.method, params: f.params, timeoutMs: f.timeoutMs }));

describe("Tab.evaluateToFile and BridgeClient.evaluateToFile", () => {
  it("the Tab sends the three methods on its handle and returns the outcome", async () => {
    const { client, conn } = await connectedClient('{"a":1}');
    const tab = await client.claim("T3");
    const dir = tempDir();
    const r = await tab.evaluateToFile("({a:1})", { path: path.join(dir, "a.json") });
    expect(r).toEqual({ path: path.join(dir, "a.json"), bytes: 7, kind: "json", sha256: sha(Buffer.from('{"a":1}')) });
    expect(sent(conn).map((f) => f.method)).toEqual(["tabs.claim", "evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd"]);
  });

  it("the client mirrors the cursor Tab: same frames; NO_CURSOR and nothing sent without one", async () => {
    const bare = await connectedClient("1");
    const err = await rejection(bare.client.evaluateToFile("1", { path: path.join(tempDir(), "x.json") }));
    expect(err.code).toBe(ErrorCodes.NO_CURSOR);
    expect(sent(bare.conn)).toHaveLength(0);

    const viaTab = await connectedClient("1");
    const viaClient = await connectedClient("1");
    const d1 = tempDir();
    const d2 = tempDir();
    await (await viaTab.client.claim("T3")).evaluateToFile("1", { path: path.join(d1, "x.json"), timeoutMs: 3000 });
    await viaClient.client.claim("T3");
    await viaClient.client.evaluateToFile("1", { path: path.join(d2, "x.json"), timeoutMs: 3000 });
    expect(sent(viaClient.conn)).toStrictEqual(sent(viaTab.conn));
  });

  it("a stale Tab (from before a 4002 reconnect) refuses itself with no call and no file", async () => {
    const host = { call: vi.fn(), generation: () => 2 };
    const tab = new Tab(host, "T3", 1);
    const dir = tempDir();
    const err = await rejection(tab.evaluateToFile("1", { path: path.join(dir, "x.json") }));
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    expect(host.call).not.toHaveBeenCalled();
    expect(readdirSync(dir)).toEqual([]);
  });

  it("a file-rule refusal on a Tab makes no call", async () => {
    const { client, conn } = await connectedClient("1");
    const tab = await client.claim("T3");
    const before = sent(conn).length;
    const err = await rejection(tab.evaluateToFile("1", { path: "relative.json" }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(sent(conn)).toHaveLength(before);
  });
});

describe("the exported surface", () => {
  it("still exactly eight values; the new names are types only", async () => {
    const sdk = await import("../src/index.js");
    expect(Object.keys(sdk).sort()).toEqual(
      ["BridgeClient", "BridgeError", "ErrorCodes", "Tab", "connect", "downloadToFile", "formatNetwork", "formatSnapshot"].sort(),
    );
  });

  it("the MCP's door: @bridge/sdk/download also carries saveEvaluateToFile and checkSaveTarget", async () => {
    const door = await import("../src/download.js");
    expect(door.saveEvaluateToFile).toBe(saveEvaluateToFile);
    expect(door.checkSaveTarget).toBe(checkSaveTarget);
  });
});


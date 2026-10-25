// @vitest-environment jsdom
/**
 * Step 10 S4: the `evaluateSaveStart` / `evaluateSaveChunk` / `evaluateSaveEnd` handlers through a stubbed
 * `chrome` (tabs.get, debugger.attach/detach/sendCommand over the fake CDP). The value's bytes are its UTF-8
 * as `TextEncoder` makes it (F12: a lone surrogate becomes U+FFFD); slices are base64 of ≤ 1 MiB, as
 * `downloadChunk`'s; the start result carries `{id, bytes, kind}` and never the value.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { BridgeError, toWireError } from "../src/errors.js";
import type { HandlerSafety } from "../src/safety-call.js";
import {
  clearEvaluateSaves,
  dropEvaluateSavesForTab,
  evaluateSaveChunk,
  evaluateSaveEnd,
  evaluateSaveStart,
} from "../src/handlers/evaluate-save.js";
import { SAVE_CHUNK_BYTES } from "../src/evaluate-save-store.js";
import { FakeCdp } from "./s4-fake-cdp.js";

let cdp: FakeCdp;
let log: string[];

beforeEach(() => {
  log = [];
  cdp = new FakeCdp(() => undefined);
  vi.stubGlobal("chrome", {
    tabs: { get: vi.fn(async (id: number) => ({ id, url: "http://localhost:8080/e2e-playground.html", discarded: false })) },
    debugger: {
      attach: vi.fn(async () => void log.push("attach")),
      detach: vi.fn(async () => void log.push("detach")),
      sendCommand: vi.fn(async (_t: unknown, method: string, params: Record<string, unknown>) => cdp.send(method, params)),
    },
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  clearEvaluateSaves();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fakeCall(o: { refuseAt?: number } = {}) {
  let n = 0;
  const refused: Array<() => void> = [];
  const call = {
    effect: vi.fn(async () => {
      log.push("effect");
      if (++n === o.refuseAt) throw new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" });
    }),
    checkFinalUrl: vi.fn(async () => {}),
    onRefused: vi.fn((fn: () => void) => refused.push(fn)),
    redactRows: vi.fn(async () => []),
    networkFilter: vi.fn(async () => () => true),
  };
  return { call: call as unknown as HandlerSafety, raw: call, refuse: () => refused.forEach((f) => f()) };
}

async function pullAll(tabId: number, id: string, bytes: number): Promise<Buffer> {
  const parts: Buffer[] = [];
  let off = 0;
  while (off < bytes) {
    const { data } = await evaluateSaveChunk({ tabId, id, offset: off, length: SAVE_CHUNK_BYTES });
    const b = Buffer.from(data, "base64");
    expect(b.length).toBeGreaterThan(0);
    expect(b.length).toBeLessThanOrEqual(SAVE_CHUNK_BYTES);
    parts.push(b);
    off += b.length;
  }
  return Buffer.concat(parts);
}

describe("evaluateSaveStart → chunks → end", () => {
  it("a string value: {id, bytes, kind} only; the slices rejoin its UTF-8 bytes", async () => {
    const value = "SENTINEL-VALUE-é€😀-" + "x".repeat(3 * SAVE_CHUNK_BYTES);
    cdp.completion = () => Promise.resolve(value);
    const f = fakeCall();
    const start = await evaluateSaveStart({ tabId: 5, expression: "return v" }, f.call);
    const expected = Buffer.from(new TextEncoder().encode(value));
    expect(start).toEqual({ id: start.id, bytes: expected.length, kind: "string" });
    expect(Object.keys(start).sort()).toEqual(["bytes", "id", "kind"]);
    expect(JSON.stringify(start)).not.toContain("SENTINEL");
    expect((await pullAll(5, start.id, start.bytes)).equals(expected)).toBe(true);
    expect(await evaluateSaveEnd({ tabId: 5, id: start.id })).toEqual({ released: true });
    await expect(evaluateSaveChunk({ tabId: 5, id: start.id, offset: 0 })).rejects.toThrow(/Unknown or expired evaluateSave id/);
  });

  it("the gate's effect check runs before the debugger attaches; a refusal there touches nothing", async () => {
    cdp.completion = () => Promise.resolve("v");
    const ok = fakeCall();
    await evaluateSaveStart({ tabId: 5, expression: "1" }, ok.call);
    expect(log.slice(0, 2)).toEqual(["effect", "attach"]);
    expect(log[log.length - 1]).toBe("detach");

    log = [];
    cdp.calls.length = 0;
    await expect(evaluateSaveStart({ tabId: 5, expression: "1" }, fakeCall({ refuseAt: 1 }).call)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log).toEqual(["effect"]);
    expect(cdp.calls).toEqual([]);
  });

  it("a lone surrogate becomes U+FFFD (TextEncoder, F12)", async () => {
    cdp.completion = () => Promise.resolve("a\ud800b");
    const start = await evaluateSaveStart({ tabId: 5, expression: "1" });
    expect(start.bytes).toBe(5);
    expect((await pullAll(5, start.id, start.bytes)).toString("hex")).toBe("61efbfbd62");
  });

  it("an object value is JSON (kind json); a refused value stores nothing", async () => {
    cdp.completion = () => ({ a: [1, 2] });
    const start = await evaluateSaveStart({ tabId: 5, expression: "1" });
    expect(start.kind).toBe("json");
    expect((await pullAll(5, start.id, start.bytes)).toString("utf8")).toBe('{"a":[1,2]}');
    expect(clearEvaluateSaves()).toBe(1);

    cdp.completion = () => Promise.resolve(undefined);
    await expect(evaluateSaveStart({ tabId: 5, expression: "1" })).rejects.toMatchObject({ code: ErrorCodes.BAD_PARAMS });
    cdp.completion = () => document.body;
    await expect(evaluateSaveStart({ tabId: 5, expression: "1" })).rejects.toMatchObject({ code: ErrorCodes.BAD_PARAMS });
    expect(clearEvaluateSaves()).toBe(0);
  });

  it("a reply the post-check refuses releases the held bytes (as downloadStart, F24)", async () => {
    cdp.completion = () => Promise.resolve("held");
    const f = fakeCall();
    const start = await evaluateSaveStart({ tabId: 5, expression: "1" }, f.call);
    expect(f.raw.onRefused).toHaveBeenCalledTimes(1);
    f.refuse();
    await expect(evaluateSaveChunk({ tabId: 5, id: start.id, offset: 0 })).rejects.toThrow(/Unknown or expired/);
  });

  it("an empty expression is BAD_PARAMS with no call; the pulls need an integer tabId", async () => {
    await expect(evaluateSaveStart({ tabId: 5, expression: "  " })).rejects.toMatchObject({ code: ErrorCodes.BAD_PARAMS });
    expect(cdp.calls).toEqual([]);
    await expect(evaluateSaveChunk({ id: "x", offset: 0 })).rejects.toMatchObject({ code: ErrorCodes.BAD_PARAMS });
    await expect(evaluateSaveEnd({ id: "x" })).rejects.toMatchObject({ code: ErrorCodes.BAD_PARAMS });
  });
});

describe("the store is keyed by the tab that filled it", () => {
  it("a chunk naming another tab is refused as an unknown id (INTERNAL); an end naming another tab releases nothing", async () => {
    cdp.completion = () => Promise.resolve("mine");
    const start = await evaluateSaveStart({ tabId: 5, expression: "1" });
    const err = await evaluateSaveChunk({ tabId: 6, id: start.id, offset: 0 }).catch((e: unknown) => e);
    expect(toWireError(err)).toEqual({ code: ErrorCodes.INTERNAL, message: `Unknown or expired evaluateSave id: ${start.id}` });
    expect(await evaluateSaveEnd({ tabId: 6, id: start.id })).toEqual({ released: false });
    expect(Buffer.from((await evaluateSaveChunk({ tabId: 5, id: start.id, offset: 0 })).data, "base64").toString()).toBe("mine");
  });

  it("dropEvaluateSavesForTab (tab closed or replaced) and clearEvaluateSaves (disarm, JavaScript off)", async () => {
    cdp.completion = () => Promise.resolve("a");
    const a = await evaluateSaveStart({ tabId: 5, expression: "1" });
    const b = await evaluateSaveStart({ tabId: 6, expression: "1" });
    expect(dropEvaluateSavesForTab(5)).toBe(1);
    await expect(evaluateSaveChunk({ tabId: 5, id: a.id, offset: 0 })).rejects.toThrow(/Unknown or expired/);
    expect((await evaluateSaveChunk({ tabId: 6, id: b.id, offset: 0 })).data).toBe(Buffer.from("a").toString("base64"));
    expect(clearEvaluateSaves()).toBe(1);
    await expect(evaluateSaveChunk({ tabId: 6, id: b.id, offset: 0 })).rejects.toThrow(/Unknown or expired/);
  });
});

describe("no log line carries the value or the expression", () => {
  it("the handlers log nothing", async () => {
    const lines: string[] = [];
    for (const m of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void lines.push(a.map(String).join(" ")));
    }
    cdp.completion = () => Promise.resolve("SENTINEL-VALUE-QQ");
    const s = await evaluateSaveStart({ tabId: 5, expression: "'SENTINEL-EXPR-QQ'" });
    await evaluateSaveChunk({ tabId: 5, id: s.id, offset: 0 });
    await evaluateSaveEnd({ tabId: 5, id: s.id });
    expect(lines).toEqual([]);
  });
});

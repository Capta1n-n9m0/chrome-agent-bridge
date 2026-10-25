/**
 * Step 10 S4 (phase doc 0.4 (B); decisions.md #205): the extension-side store `browser_evaluate {saveTo}`
 * fills and the SDK pulls in 1 MiB slices. Pure, injected clock. Entries are keyed by `id` AND the tab
 * that filled them; an unknown, expired, lost or other-tab id is refused as `downloadChunk` refuses an
 * unknown id (a plain Error → `INTERNAL` on the wire).
 */
import { describe, it, expect } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { toWireError } from "../src/errors.js";
import {
  EvaluateSaveStore,
  SAVE_CHUNK_BYTES,
  SAVE_MAX_ENTRIES,
  SAVE_MAX_TOTAL_BYTES,
  SAVE_MAX_VALUE_BYTES,
  SAVE_TTL_MS,
  javaScriptOff,
} from "../src/evaluate-save-store.js";

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill);

function clock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

describe("EvaluateSaveStore — caps (contract-level, recorded in the S4 report)", () => {
  it("TTL 5 min, 8 entries, 1 MiB slices, 256 MiB per value and in total", () => {
    expect(SAVE_TTL_MS).toBe(5 * 60_000);
    expect(SAVE_MAX_ENTRIES).toBe(8);
    expect(SAVE_CHUNK_BYTES).toBe(1_048_576);
    expect(SAVE_MAX_VALUE_BYTES).toBe(256 * 1024 * 1024);
    expect(SAVE_MAX_TOTAL_BYTES).toBe(256 * 1024 * 1024);
  });
});

describe("EvaluateSaveStore — put / chunk / release", () => {
  it("holds bytes under an opaque id for the tab that filled it; chunks are clamped to the end", () => {
    const s = new EvaluateSaveStore();
    const id = s.put(7, bytes(10), "string");
    expect(typeof id).toBe("string");
    expect(s.chunk(id, 7, 0, 4)).toEqual(bytes(4));
    expect(s.chunk(id, 7, 8, 4)).toEqual(bytes(2));
    expect(s.chunk(id, 7, 10, 4)).toEqual(new Uint8Array(0));
    expect(s.size).toBe(1);
  });

  it("a slice is never more than 1 MiB, whatever length is asked", () => {
    const s = new EvaluateSaveStore();
    const id = s.put(1, bytes(3 * SAVE_CHUNK_BYTES), "json");
    expect(s.chunk(id, 1, 0, 8 * SAVE_CHUNK_BYTES).length).toBe(SAVE_CHUNK_BYTES);
    expect(s.chunk(id, 1, 0, Number.NaN).length).toBe(SAVE_CHUNK_BYTES);
    expect(s.chunk(id, 1, 0, 0).length).toBe(SAVE_CHUNK_BYTES);
    expect(s.chunk(id, 1, 5, 3).length).toBe(3);
  });

  it("an unknown id, and an id named with another tab, are refused with download's message shape (INTERNAL)", () => {
    const s = new EvaluateSaveStore();
    const id = s.put(7, bytes(3), "string");
    for (const [badId, tab] of [["nope", 7], [id, 8]] as const) {
      let err: unknown;
      try {
        s.chunk(badId, tab, 0, 3);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe(`Unknown or expired evaluateSave id: ${badId}`);
      expect(toWireError(err).code).toBe(ErrorCodes.INTERNAL);
    }
    // The other tab's attempt did not consume or release the entry.
    expect(s.chunk(id, 7, 0, 3)).toEqual(bytes(3));
  });

  it("a bad offset is refused (plain Error, as download)", () => {
    const s = new EvaluateSaveStore();
    const id = s.put(1, bytes(3), "string");
    expect(() => s.chunk(id, 1, -1, 1)).toThrow(/Invalid offset/);
    expect(() => s.chunk(id, 1, 4, 1)).toThrow(/Invalid offset/);
    expect(() => s.chunk(id, 1, 1.5, 1)).toThrow(/Invalid offset/);
  });

  it("release drops the entry only for its own tab", () => {
    const s = new EvaluateSaveStore();
    const id = s.put(7, bytes(3), "string");
    expect(s.release(id, 8)).toBe(false);
    expect(s.size).toBe(1);
    expect(s.release(id, 7)).toBe(true);
    expect(s.release(id, 7)).toBe(false);
    expect(() => s.chunk(id, 7, 0, 1)).toThrow(/Unknown or expired evaluateSave id/);
  });
});

describe("EvaluateSaveStore — TTL, eviction, the byte cap", () => {
  it("an entry expires after the TTL; a pull refreshes it", () => {
    const c = clock();
    const s = new EvaluateSaveStore({ now: c.now });
    const a = s.put(1, bytes(3), "string");
    const b = s.put(1, bytes(3), "string");
    c.advance(SAVE_TTL_MS - 1);
    s.chunk(b, 1, 0, 1); // refreshed
    c.advance(2);
    expect(() => s.chunk(a, 1, 0, 1)).toThrow(/Unknown or expired/);
    expect(s.chunk(b, 1, 0, 1)).toEqual(bytes(1));
    c.advance(SAVE_TTL_MS);
    expect(s.size).toBe(0);
  });

  it("at most 8 entries: the oldest goes first", () => {
    const s = new EvaluateSaveStore();
    const ids = Array.from({ length: 9 }, () => s.put(1, bytes(1), "string"));
    expect(s.size).toBe(8);
    expect(() => s.chunk(ids[0]!, 1, 0, 1)).toThrow(/Unknown or expired/);
    expect(s.chunk(ids[8]!, 1, 0, 1)).toEqual(bytes(1));
  });

  it("a value over the per-value cap is refused BAD_PARAMS before anything is stored", () => {
    const s = new EvaluateSaveStore({ maxValueBytes: 10, maxTotalBytes: 20 });
    const kept = s.put(1, bytes(5), "string");
    let err: { code?: string; message?: string } | undefined;
    try {
      s.put(1, bytes(11), "string");
    } catch (e) {
      err = e as { code?: string; message?: string };
    }
    expect(err?.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err?.message).toMatch(/over the .* limit/);
    expect(s.size).toBe(1);
    expect(s.chunk(kept, 1, 0, 5)).toEqual(bytes(5));
  });

  it("the total cap evicts the oldest entries until the new value fits", () => {
    const s = new EvaluateSaveStore({ maxValueBytes: 10, maxTotalBytes: 20 });
    const a = s.put(1, bytes(8), "string");
    const b = s.put(1, bytes(8), "string");
    expect(s.totalBytes).toBe(16);
    const c = s.put(2, bytes(10), "json");
    expect(s.totalBytes).toBe(18);
    expect(() => s.chunk(a, 1, 0, 1)).toThrow(/Unknown or expired/);
    expect(s.chunk(b, 1, 0, 1)).toEqual(bytes(1));
    expect(s.chunk(c, 2, 0, 1)).toEqual(bytes(1));
  });
});

describe("EvaluateSaveStore — the drops (disarm, JavaScript off, tab close/replace)", () => {
  it("dropAll empties the store and says how many went", () => {
    const s = new EvaluateSaveStore();
    const a = s.put(1, bytes(2), "string");
    s.put(2, bytes(2), "json");
    expect(s.dropAll()).toBe(2);
    expect(s.size).toBe(0);
    expect(s.totalBytes).toBe(0);
    expect(() => s.chunk(a, 1, 0, 1)).toThrow(/Unknown or expired/);
  });

  it("dropTab drops only that tab's entries", () => {
    const s = new EvaluateSaveStore();
    const a = s.put(1, bytes(2), "string");
    const b = s.put(2, bytes(2), "string");
    const c = s.put(1, bytes(2), "string");
    expect(s.dropTab(1)).toBe(2);
    expect(() => s.chunk(a, 1, 0, 1)).toThrow(/Unknown or expired/);
    expect(() => s.chunk(c, 1, 0, 1)).toThrow(/Unknown or expired/);
    expect(s.chunk(b, 2, 0, 1)).toEqual(bytes(1, 7));
    expect(s.totalBytes).toBe(2);
  });

  it("javaScriptOff: the memory copy has JavaScript off, or is unknown or unreadable (fail closed)", () => {
    expect(javaScriptOff({ armed: true, evaluate: false, blockList: "" })).toBe(true);
    expect(javaScriptOff({ armed: false, evaluate: false, blockList: "" })).toBe(true);
    expect(javaScriptOff({ unreadable: true })).toBe(true);
    expect(javaScriptOff(null)).toBe(true);
    expect(javaScriptOff({ armed: true, evaluate: true, blockList: "" })).toBe(false);
    expect(javaScriptOff({ armed: false, evaluate: true, blockList: "x.example" })).toBe(false);
  });

  it("composed as sw.ts does: a SafetyStore change that turns JavaScript off drops the store; one that keeps it on does not", async () => {
    const { SafetyStore } = await import("../src/safety-state.js");
    const s = new EvaluateSaveStore();
    const safety = new SafetyStore({ get: async () => ({}), set: async () => {}, extensionId: "x", now: () => 0 });
    await safety.start();
    const onChanged = (changes: Record<string, unknown>) => {
      safety.applyChanges(changes);
      if (javaScriptOff(safety.memory)) s.dropAll();
    };
    s.put(1, bytes(2), "string");
    onChanged({ "safety.blockList": { newValue: "a.example" } });
    expect(s.size).toBe(1);
    onChanged({ "safety.evaluate": { oldValue: true, newValue: false } });
    expect(s.size).toBe(0);
  });
});

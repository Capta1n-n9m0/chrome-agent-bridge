/**
 * Step 10 S4 (phase doc 0.4, transport (B); decisions.md #205): the store `evaluateSaveStart` fills and
 * `evaluateSaveChunk` / `evaluateSaveEnd` read and drop — `browser_evaluate {saveTo}`'s bytes held in the
 * service worker's memory between the start and the last pull, as `DownloadStore` holds a download.
 *
 * - Entries are keyed by an opaque `id` AND the tab that filled them: a pull naming another tab, an unknown or
 *   expired id, or an id lost to a worker restart (the store lives in memory only) is refused exactly as
 *   `downloadChunk` refuses an unknown id — a plain `Error` (`INTERNAL` on the wire), message
 *   `Unknown or expired evaluateSave id: <id>`, which says nothing about the other tab.
 * - TTL 5 min (refreshed by each pull), at most 8 entries, at most 256 MiB per value and 256 MiB in total
 *   (the oldest entries go first to make room); a value over the per-value cap is refused `BAD_PARAMS` before
 *   anything is stored. Slices are at most 1 MiB.
 * - `dropAll()` runs at a disarm and when JavaScript is turned off; `dropTab(tabId)` when the tab closes or is
 *   replaced (`sw.ts`).
 *
 * Pure (injected clock), no `chrome.*`, no log call: nothing here can print the value.
 */
import type { EvaluateSaveKind } from "@bridge/shared";
import { BridgeError, ErrorCodes } from "./errors.js";
import type { MemoryState } from "./safety-state.js";

/** One pull's ceiling and default: 1 MiB (base64 ≈ 1.37 MB on the wire). */
export const SAVE_CHUNK_BYTES = 1_048_576;
export const SAVE_TTL_MS = 5 * 60_000;
export const SAVE_MAX_ENTRIES = 8;
/** The largest value one save may hold, in UTF-8 bytes. */
export const SAVE_MAX_VALUE_BYTES = 256 * 1024 * 1024;
/** Every held value together, in bytes. */
export const SAVE_MAX_TOTAL_BYTES = 256 * 1024 * 1024;

/** The refusal of a value over the cap. Names the limit only — never the value or its size. */
export function tooLargeError(maxBytes: number = SAVE_MAX_VALUE_BYTES): BridgeError {
  return new BridgeError(
    ErrorCodes.BAD_PARAMS,
    `The value is over the ${Math.floor(maxBytes / (1024 * 1024))} MiB limit of a save to a file — select less in the expression; nothing was saved`,
  );
}

interface Held {
  tabId: number;
  bytes: Uint8Array;
  kind: EvaluateSaveKind;
  expiresAt: number;
}

export interface EvaluateSaveStoreOptions {
  ttlMs?: number;
  maxEntries?: number;
  maxValueBytes?: number;
  maxTotalBytes?: number;
  now?: () => number;
}

export class EvaluateSaveStore {
  private held = new Map<string, Held>();
  private seq = 0;
  private total = 0;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly maxValueBytes: number;
  private readonly maxTotalBytes: number;
  private readonly now: () => number;

  constructor(o: EvaluateSaveStoreOptions = {}) {
    this.ttlMs = o.ttlMs ?? SAVE_TTL_MS;
    this.maxEntries = o.maxEntries ?? SAVE_MAX_ENTRIES;
    this.maxValueBytes = o.maxValueBytes ?? SAVE_MAX_VALUE_BYTES;
    this.maxTotalBytes = o.maxTotalBytes ?? SAVE_MAX_TOTAL_BYTES;
    this.now = o.now ?? Date.now;
  }

  /** Holds `bytes` for `tabId`; `BAD_PARAMS` (nothing stored) when over the per-value cap. */
  put(tabId: number, bytes: Uint8Array, kind: EvaluateSaveKind): string {
    if (bytes.length > this.maxValueBytes || bytes.length > this.maxTotalBytes) throw tooLargeError(this.maxValueBytes);
    this.sweep();
    while (this.held.size > 0 && (this.held.size >= this.maxEntries || this.total + bytes.length > this.maxTotalBytes)) {
      this.delete(this.held.keys().next().value as string);
    }
    const id = `es${++this.seq}-${this.now().toString(36)}`;
    this.held.set(id, { tabId, bytes, kind, expiresAt: this.now() + this.ttlMs });
    this.total += bytes.length;
    return id;
  }

  /** Bytes [offset, offset + length) of the entry `id` filled by `tabId`, at most 1 MiB; refreshes its TTL. */
  chunk(id: string, tabId: number, offset: number, length: number): Uint8Array {
    this.sweep();
    const h = this.held.get(id);
    if (!h || h.tabId !== tabId) throw new Error(`Unknown or expired evaluateSave id: ${id}`);
    if (!Number.isInteger(offset) || offset < 0 || offset > h.bytes.length) {
      throw new Error(`Invalid offset ${offset} for a ${h.bytes.length}-byte save`);
    }
    const len = Math.min(Math.max(1, Math.floor(length) || SAVE_CHUNK_BYTES), SAVE_CHUNK_BYTES);
    h.expiresAt = this.now() + this.ttlMs;
    return h.bytes.subarray(offset, Math.min(offset + len, h.bytes.length));
  }

  /** Drops the entry `id` if `tabId` filled it. */
  release(id: string, tabId: number): boolean {
    const h = this.held.get(id);
    if (!h || h.tabId !== tabId) return false;
    return this.delete(id);
  }

  /** Every entry (a disarm, JavaScript turned off). Returns how many went. */
  dropAll(): number {
    const n = this.held.size;
    this.held.clear();
    this.total = 0;
    return n;
  }

  /** Every entry `tabId` filled (the tab closed or was replaced). Returns how many went. */
  dropTab(tabId: number): number {
    let n = 0;
    for (const [id, h] of this.held) {
      if (h.tabId === tabId && this.delete(id)) n++;
    }
    return n;
  }

  get size(): number {
    this.sweep();
    return this.held.size;
  }

  get totalBytes(): number {
    this.sweep();
    return this.total;
  }

  private delete(id: string): boolean {
    const h = this.held.get(id);
    if (!h) return false;
    this.held.delete(id);
    this.total -= h.bytes.length;
    return true;
  }

  private sweep(): void {
    const t = this.now();
    for (const [id, h] of this.held) if (h.expiresAt <= t) this.delete(id);
  }
}

/**
 * Whether the safety state's memory copy (`SafetyStore.memory`, after a `storage.onChanged` batch) has JavaScript
 * off — or is unknown or unreadable (fail closed). `sw.ts` then drops the store (#205). Reads the memory copy, not
 * the storage keys: only `safety-state.ts` names those (`safety-writers.test.ts`).
 */
export function javaScriptOff(memory: MemoryState | null): boolean {
  return memory === null || memory.unreadable === true || memory.evaluate !== true;
}

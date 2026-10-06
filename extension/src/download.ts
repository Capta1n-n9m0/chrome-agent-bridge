// Pure helpers for `browser_download`: the byte store the service worker keeps between
// `downloadStart` and `downloadEnd`, base64 encoding without Buffer, and the filename a response
// suggests. No chrome.* here — the handler in handlers/download.ts does the fetch.

/** Bytes per `downloadChunk` the server asks for by default (~1.37 MB as base64 on the wire). */
export const DEFAULT_CHUNK_BYTES = 1024 * 1024;
/** Hard cap so one chunk never approaches the runtime-messaging limit. */
export const MAX_CHUNK_BYTES = 8 * 1024 * 1024;

interface Held {
  bytes: Uint8Array;
  expiresAt: number;
}

/**
 * Downloads held in the worker's memory, keyed by an opaque id. Entries expire after `ttlMs` so an
 * abandoned transfer (server crashed mid-pull) cannot pin memory; at most `maxEntries` are kept and
 * the oldest goes first.
 */
export class DownloadStore {
  private held = new Map<string, Held>();
  private seq = 0;

  constructor(
    private readonly ttlMs = 5 * 60_000,
    private readonly maxEntries = 8,
    private readonly now: () => number = Date.now,
  ) {}

  put(bytes: Uint8Array): string {
    this.sweep();
    while (this.held.size >= this.maxEntries) {
      const oldest = this.held.keys().next().value as string;
      this.held.delete(oldest);
    }
    const id = `dl${++this.seq}-${this.now().toString(36)}`;
    this.held.set(id, { bytes, expiresAt: this.now() + this.ttlMs });
    return id;
  }

  /** Bytes [offset, offset + length), clamped to the end; refreshes the entry's TTL. */
  chunk(id: string, offset: number, length: number): Uint8Array {
    this.sweep();
    const h = this.held.get(id);
    if (!h) throw new Error(`Unknown or expired download id: ${id}`);
    if (!Number.isInteger(offset) || offset < 0 || offset > h.bytes.length) {
      throw new Error(`Invalid offset ${offset} for a ${h.bytes.length}-byte download`);
    }
    const len = Math.min(Math.max(1, Math.floor(length) || DEFAULT_CHUNK_BYTES), MAX_CHUNK_BYTES);
    h.expiresAt = this.now() + this.ttlMs;
    return h.bytes.subarray(offset, Math.min(offset + len, h.bytes.length));
  }

  release(id: string): boolean {
    return this.held.delete(id);
  }

  get size(): number {
    this.sweep();
    return this.held.size;
  }

  private sweep(): void {
    const t = this.now();
    for (const [id, h] of this.held) if (h.expiresAt <= t) this.held.delete(id);
  }
}

/** Base64 of a byte array, in slices so `String.fromCharCode` never gets too many arguments. */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const SLICE = 0x8000;
  for (let i = 0; i < bytes.length; i += SLICE) {
    bin += String.fromCharCode(...bytes.subarray(i, i + SLICE));
  }
  return btoa(bin);
}

/** `type/subtype` of a content-type header, lower-cased, without parameters. */
export function bareContentType(header: string | null | undefined): string {
  return (header ?? "").split(";")[0].trim().toLowerCase();
}

/**
 * The filename a response suggests: RFC 6266 `filename*` (RFC 5987, percent-encoded) wins over
 * `filename`, which wins over the last path segment of the final URL. Returns "" when there is
 * nothing usable. The name is not sanitised here — the server decides what may be written.
 */
export function suggestedFilename(contentDisposition: string | null | undefined, finalUrl: string): string {
  const cd = contentDisposition ?? "";
  const star = /filename\*\s*=\s*([^;]+)/i.exec(cd);
  if (star) {
    const v = star[1].trim().replace(/^"(.*)"$/, "$1");
    const m = /^[\w!#$%&+.^`|~-]*'[^']*'(.*)$/.exec(v);
    try {
      const name = decodeURIComponent(m ? m[1] : v);
      if (name) return name;
    } catch {
      // malformed percent-encoding: fall through to the plain parameter
    }
  }
  const plain = /filename\s*=\s*("((?:[^"\\]|\\.)*)"|[^;]+)/i.exec(cd);
  if (plain) {
    const name = plain[2] !== undefined ? plain[2].replace(/\\(.)/g, "$1") : plain[1].trim();
    if (name) return name;
  }
  try {
    const seg = new URL(finalUrl).pathname.split("/").filter(Boolean).pop() ?? "";
    return seg ? decodeURIComponent(seg) : "";
  } catch {
    return "";
  }
}

import { describe, it, expect } from "vitest";
import { DownloadStore, MAX_CHUNK_BYTES, bareContentType, suggestedFilename, toBase64 } from "../src/download.js";

describe("suggestedFilename", () => {
  it("prefers RFC 5987 filename* and percent-decodes it once", () => {
    const cd = "inline; filename*=UTF-8''1.%20Introduction%20to%20Applied%20Statistics%20%28slide%29.pdf";
    expect(suggestedFilename(cd, "https://x.example/12695125")).toBe("1. Introduction to Applied Statistics (slide).pdf");
  });

  it("falls back to a quoted filename, unescaping backslashes", () => {
    expect(suggestedFilename('attachment; filename="a \\"b\\".pdf"', "https://x/y")).toBe('a "b".pdf');
  });

  it("accepts an unquoted filename", () => {
    expect(suggestedFilename("attachment; filename=report.csv", "https://x/y")).toBe("report.csv");
  });

  it("uses filename* over filename when both are present", () => {
    expect(suggestedFilename("attachment; filename=\"plain.pdf\"; filename*=UTF-8''f%C3%BCr.pdf", "https://x/y")).toBe("für.pdf");
  });

  it("falls back to the final URL's last path segment, decoded", () => {
    expect(suggestedFilename(null, "https://h/a/b/Week%201.pdf?sig=abc")).toBe("Week 1.pdf");
  });

  it("survives malformed percent-encoding and an unusable URL", () => {
    expect(suggestedFilename("attachment; filename*=UTF-8''%E0%A4%A; filename=ok.txt", "")).toBe("ok.txt");
    expect(suggestedFilename(undefined, "not a url")).toBe("");
    expect(suggestedFilename("", "https://h/")).toBe("");
  });
});

describe("bareContentType", () => {
  it("drops parameters and lower-cases", () => {
    expect(bareContentType("Application/PDF; charset=binary")).toBe("application/pdf");
    expect(bareContentType(null)).toBe("");
  });
});

describe("toBase64", () => {
  it("matches Node's encoder, including inputs larger than one slice", () => {
    const big = new Uint8Array(0x8000 * 2 + 7).map((_, i) => (i * 31) & 0xff);
    expect(toBase64(big)).toBe(Buffer.from(big).toString("base64"));
    expect(toBase64(new Uint8Array())).toBe("");
  });
});

describe("DownloadStore", () => {
  it("returns clamped chunks and releases", () => {
    const s = new DownloadStore();
    const id = s.put(new Uint8Array([1, 2, 3, 4, 5]));
    expect([...s.chunk(id, 0, 2)]).toEqual([1, 2]);
    expect([...s.chunk(id, 3, 100)]).toEqual([4, 5]);
    expect([...s.chunk(id, 5, 10)]).toEqual([]);
    expect(s.release(id)).toBe(true);
    expect(() => s.chunk(id, 0, 1)).toThrow(/Unknown or expired/);
  });

  it("rejects offsets outside the data", () => {
    const s = new DownloadStore();
    const id = s.put(new Uint8Array(3));
    expect(() => s.chunk(id, -1, 1)).toThrow(/Invalid offset/);
    expect(() => s.chunk(id, 4, 1)).toThrow(/Invalid offset/);
  });

  it("caps a chunk at MAX_CHUNK_BYTES", () => {
    const s = new DownloadStore();
    const id = s.put(new Uint8Array(MAX_CHUNK_BYTES + 10));
    expect(s.chunk(id, 0, MAX_CHUNK_BYTES * 2).length).toBe(MAX_CHUNK_BYTES);
  });

  it("expires entries after the TTL, and access refreshes it", () => {
    let t = 0;
    const s = new DownloadStore(100, 8, () => t);
    const id = s.put(new Uint8Array(1));
    t = 90;
    s.chunk(id, 0, 1); // refresh → expires at 190
    t = 150;
    expect(s.size).toBe(1);
    t = 190;
    expect(s.size).toBe(0);
  });

  it("evicts the oldest entry beyond maxEntries", () => {
    const s = new DownloadStore(60_000, 2);
    const a = s.put(new Uint8Array(1));
    s.put(new Uint8Array(1));
    s.put(new Uint8Array(1));
    expect(s.size).toBe(2);
    expect(() => s.chunk(a, 0, 1)).toThrow(/Unknown or expired/);
  });
});

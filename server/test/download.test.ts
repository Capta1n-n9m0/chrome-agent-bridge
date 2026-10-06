import { describe, it, expect, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadToFile, resolveTarget, sanitizeFilename, CHUNK_BYTES } from "../src/download.js";

describe("sanitizeFilename", () => {
  it("keeps ordinary names, including spaces, commas and parentheses", () => {
    expect(sanitizeFilename("3. Data Collection, Research Design, and Sampling.pdf")).toBe(
      "3. Data Collection, Research Design, and Sampling.pdf",
    );
  });

  it("drops directory parts so a name cannot escape the folder", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\win.ini")).toBe("win.ini");
    expect(sanitizeFilename("..")).toBe("");
  });

  it("replaces reserved and control characters and trims trailing dots/spaces", () => {
    expect(sanitizeFilename('a<b>c:d"e|f?g*h\u0001.txt. ')).toBe("a_b_c_d_e_f_g_h_.txt");
  });

  it("prefixes Windows device names and caps the length, keeping the extension", () => {
    expect(sanitizeFilename("CON.txt")).toBe("_CON.txt");
    const long = sanitizeFilename("x".repeat(300) + ".pdf");
    expect(long.length).toBe(200);
    expect(long.endsWith(".pdf")).toBe(true);
  });
});

describe("resolveTarget", () => {
  const abs = path.resolve("/tmp/dl");
  const never = () => false;

  it("requires an absolute path", () => {
    expect(() => resolveTarget("rel/file.pdf", "", never)).toThrow(/absolute/);
  });

  it("uses a file path as given", () => {
    expect(resolveTarget(path.join(abs, "a.pdf"), "ignored.pdf", never)).toBe(path.join(abs, "a.pdf"));
  });

  it("joins the sanitised suggestion onto a directory (trailing separator or existing dir)", () => {
    expect(resolveTarget(abs + path.sep, "../x.pdf", never)).toBe(path.join(abs, "x.pdf"));
    expect(resolveTarget(abs, "y.pdf", (p) => p === abs)).toBe(path.join(abs, "y.pdf"));
  });

  it("falls back to a default name when nothing usable is suggested", () => {
    expect(resolveTarget(abs + "/", "", never)).toBe(path.join(abs, "download"));
  });
});

describe("downloadToFile", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });

  function fakeExtension(bytes: Buffer, filename = "file.bin") {
    const calls: string[] = [];
    const call = async (method: string, params?: Record<string, unknown>) => {
      calls.push(method);
      if (method === "downloadStart") {
        return { id: "d1", size: bytes.length, status: 200, contentType: "application/pdf", filename, redirected: true, finalHost: "s3.example" };
      }
      if (method === "downloadChunk") {
        const off = Number(params!.offset);
        const len = Number(params!.length);
        return { data: bytes.subarray(off, off + len).toString("base64") };
      }
      if (method === "downloadEnd") return { released: true };
      throw new Error(`unexpected ${method}`);
    };
    return { call, calls };
  }

  it("pulls every chunk, writes the file atomically and hashes it", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "dl-"));
    const bytes = Buffer.alloc(CHUNK_BYTES * 2 + 123, 7);
    bytes[5] = 1;
    const { call, calls } = fakeExtension(bytes, "Week 1.pdf");
    const r = await downloadToFile(call, { url: "https://x/y", path: dir + path.sep });
    expect(r.path).toBe(path.join(dir, "Week 1.pdf"));
    expect(r.size).toBe(bytes.length);
    expect(r.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    expect(readFileSync(r.path).equals(bytes)).toBe(true);
    expect(calls.filter((c) => c === "downloadChunk").length).toBe(3);
    expect(calls.at(-1)).toBe("downloadEnd");
    expect(readdirSync(dir)).toEqual(["Week 1.pdf"]);
  });

  it("refuses to overwrite unless asked, and still releases the bytes", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "dl-"));
    const target = path.join(dir, "a.pdf");
    writeFileSync(target, "old");
    const { call, calls } = fakeExtension(Buffer.from("new"));
    await expect(downloadToFile(call, { url: "https://x/y", path: target })).rejects.toThrow(/overwrite/);
    expect(calls.at(-1)).toBe("downloadEnd");
    const ok = await downloadToFile(fakeExtension(Buffer.from("new")).call, { url: "https://x/y", path: target, overwrite: true });
    expect(readFileSync(ok.path, "utf8")).toBe("new");
  });

  it("removes the .part file when a chunk fails", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "dl-"));
    const call = async (method: string) => {
      if (method === "downloadStart") return { id: "d", size: 10, status: 200, contentType: "", filename: "f", redirected: false, finalHost: "h" };
      if (method === "downloadChunk") return { data: "" };
      return {};
    };
    await expect(downloadToFile(call, { url: "https://x/y", path: path.join(dir, "f") })).rejects.toThrow(/empty chunk/);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("writes an empty file for a zero-byte download", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "dl-"));
    const r = await downloadToFile(fakeExtension(Buffer.alloc(0)).call, { url: "https://x/y", path: path.join(dir, "nested", "e.txt") });
    expect(readFileSync(r.path).length).toBe(0);
  });
});

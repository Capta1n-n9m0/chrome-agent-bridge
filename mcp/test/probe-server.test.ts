// Pins the S6b probe server's result shapes (mcp/test/probe/image-probe-server.mjs): the server is
// spawned over stdio exactly as Claude Code would spawn it, every tool is called, and each result's
// isError flag, content order and PNG colour are checked against the pre-registered rows
// (docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6b-probe-rows.md).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = fileURLToPath(new URL("./probe/image-probe-server.mjs", import.meta.url));

/** Decodes an 8-bit RGB, non-interlaced, filter-0 PNG; returns the set of distinct pixel colours. */
function pngColours(b64: string): { width: number; height: number; colours: Set<string> } {
  const buf = Buffer.from(b64, "base64");
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  let off = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect([data[8], data[9], data[12]]).toEqual([8, 2, 0]);
    } else if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = 1 + width * 3;
  expect(raw.length).toBe(stride * height);
  const colours = new Set<string>();
  for (let y = 0; y < height; y++) {
    expect(raw[y * stride]).toBe(0);
    for (let x = 0; x < width; x++) {
      const p = y * stride + 1 + x * 3;
      colours.add("#" + raw.subarray(p, p + 3).toString("hex"));
    }
  }
  return { width, height, colours };
}

type Part = { type: string; text?: string; data?: string; mimeType?: string; resource?: { mimeType?: string; blob?: string } };

const FAIL = "LOCATOR_NOT_FOUND: probe failure";
const ROWS: Record<string, { isError: boolean; shape: string[]; colour: string; text?: string }> = {
  probe_v1: { isError: false, shape: ["image"], colour: "#ff0000" },
  probe_v2: { isError: false, shape: ["text", "image"], colour: "#00a000", text: `${FAIL} (this is an error report)` },
  probe_v3: { isError: true, shape: ["text", "image"], colour: "#0000ff", text: FAIL },
  probe_v4: { isError: true, shape: ["image", "text"], colour: "#ffd700", text: FAIL },
  probe_v5: { isError: true, shape: ["image"], colour: "#800080" },
  probe_v6: { isError: true, shape: ["text", "resource"], colour: "#ff8000", text: FAIL },
};

describe("S6b image probe server", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ name: "probe-test", version: "0.0.1" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER], stderr: "pipe" }));
  });

  afterAll(async () => {
    await client.close();
  });

  it("lists exactly the six zero-argument probe tools, none naming a colour", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(Object.keys(ROWS));
    for (const t of tools) {
      expect(JSON.stringify(t)).not.toMatch(/red|green|blue|yellow|purple|orange|colou?r/i);
    }
  });

  for (const [name, row] of Object.entries(ROWS)) {
    it(`${name}: isError ${row.isError}, content [${row.shape.join(", ")}], a 64x64 ${row.colour} PNG`, async () => {
      const res = (await client.callTool({ name, arguments: {} })) as { isError?: boolean; content: Part[] };
      expect(res.isError === true).toBe(row.isError);
      expect(res.content.map((p) => p.type)).toEqual(row.shape);
      const text = res.content.find((p) => p.type === "text");
      expect(text?.text).toBe(row.text);
      if (row.text) expect(row.text).not.toMatch(/red|green|blue|yellow|purple|orange|colou?r/i);
      const img = res.content.find((p) => p.type === "image");
      const b64 = img ? (expect(img.mimeType).toBe("image/png"), img.data) : res.content.find((p) => p.type === "resource")?.resource?.blob;
      if (!img) expect(res.content.find((p) => p.type === "resource")?.resource?.mimeType).toBe("image/png");
      const png = pngColours(b64 as string);
      expect([png.width, png.height]).toEqual([64, 64]);
      expect([...png.colours]).toEqual([row.colour]);
    });
  }
});

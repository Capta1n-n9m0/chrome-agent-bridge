// S6b probe: a stand-in stdio MCP server that returns small solid-colour PNGs in different
// tool-result shapes, to learn which shapes deliver an image to a `claude -p` actor (REP-1).
// Plain ESM, no build. Not a vitest test (vitest collects only **/test/**/*.test.ts), and no test
// imports it: mcp/test/probe-server.test.ts spawns it over stdio like Claude Code does.
// It opens no socket and touches no browser, daemon or port; stdout carries MCP frames only.
// Rows and PASS rules: docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6b-probe-rows.md
import { deflateSync } from "node:zlib";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const SIZE = 64;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A SIZE x SIZE solid PNG, 8-bit RGB, of colour `hex` ("#rrggbb"), as base64. */
function solidPng(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  // [10..12] compression, filter, interlace: 0
  const row = Buffer.alloc(1 + SIZE * 3); // filter byte 0, then pixels
  for (let x = 0; x < SIZE; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: SIZE }, () => row));
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png.toString("base64");
}

// Fixed colours, registered in S6b-probe-rows.md. Names and texts never reveal them.
const COLOURS = {
  probe_v1: "#ff0000", // red
  probe_v2: "#00a000", // green
  probe_v3: "#0000ff", // blue
  probe_v4: "#ffd700", // yellow
  probe_v5: "#800080", // purple
  probe_v6: "#ff8000", // orange
};

const FAIL = "LOCATOR_NOT_FOUND: probe failure";
const img = (name) => ({ type: "image", data: solidPng(COLOURS[name]), mimeType: "image/png" });

const RESULTS = {
  // V1 positive control: success, [image] only (browser_screenshot's shape).
  probe_v1: () => ({ content: [img("probe_v1")] }),
  // V2 candidate fix: success, [text, image], the text's first line states the code.
  probe_v2: () => ({
    content: [{ type: "text", text: `${FAIL} (this is an error report)` }, img("probe_v2")],
  }),
  // V3 the bridge's exact failure shape: isError, [text, image].
  probe_v3: () => ({ isError: true, content: [{ type: "text", text: FAIL }, img("probe_v3")] }),
  // V4 isError, [image, text] (image first).
  probe_v4: () => ({ isError: true, content: [img("probe_v4"), { type: "text", text: FAIL }] }),
  // V5 isError, [image] only.
  probe_v5: () => ({ isError: true, content: [img("probe_v5")] }),
  // V6 isError, [text, embedded resource carrying the PNG as a blob].
  probe_v6: () => ({
    isError: true,
    content: [
      { type: "text", text: FAIL },
      {
        type: "resource",
        resource: { uri: "probe://v6/image.png", mimeType: "image/png", blob: solidPng(COLOURS.probe_v6) },
      },
    ],
  }),
};

const server = new McpServer({ name: "probe", version: "0.0.1" });
for (const [name, result] of Object.entries(RESULTS)) {
  const n = name.slice(-1);
  server.registerTool(name, { description: `Probe tool ${n}. Takes no arguments and returns a probe result.` }, async () =>
    result(),
  );
}

// Exit with the session: no probe process outlives its client.
process.stdin.on("end", () => process.exit(0));
process.stdin.on("close", () => process.exit(0));

await server.connect(new StdioServerTransport());

// Step 13 S4 (phase doc 0.6, exit check T4.1; decisions.md #389): the second chooser call's DEBUGGER_DEVTOOLS reaches
// the agent as the bare message with `isError: true`, through a real `tools/call` over the MCP SDK's in-memory transport.
// The text is pinned here, not imported: `extension/test/s5a-chooser.test.ts` pins the same literal on the extension side.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import { registerTools, type ToolBridge } from "../src/tools/registry.js";

const CHOOSER_BUSY = "uploadFiles: another file chooser upload is still running on this tab; retry after it ends";

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

describe("S4 the second-chooser refusal at the MCP", () => {
  it("DEBUGGER_DEVTOOLS with the chooser-busy text prints as the bare message, isError: true, naming no DevTools", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "bridge-s13busy-"));
    dirs.push(root);
    const file = path.join(root, "n.txt");
    writeFileSync(file, "abc");
    const bridge: ToolBridge = {
      hasClient: true,
      reason: null,
      call: async () => {
        throw new BridgeError(ErrorCodes.DEBUGGER_DEVTOOLS, CHOOSER_BUSY);
      },
      status: async () => ({}),
    };
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge, undefined, { actorName: "me" });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "t", version: "0" });
    await server.connect(serverSide);
    await client.connect(clientSide);
    try {
      const res = await client.callTool({ name: "browser_upload_file", arguments: { ref: "e1", paths: [file], tab: "T3", chooser: true } });
      expect(res.isError).toBe(true);
      expect(res.content).toEqual([{ type: "text", text: CHOOSER_BUSY }]);
      expect(JSON.stringify(res.content)).not.toMatch(/devtools/i);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

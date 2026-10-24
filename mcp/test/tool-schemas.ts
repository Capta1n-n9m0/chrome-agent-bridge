// Step 10 S2 (exit check S2.3, Stage 0 F15): the MCP tool list as a client sees it — each tool's `name`
// and `inputSchema` from a real `tools/list` over the MCP SDK's in-memory transport (the same JSON-Schema
// conversion the server sends to Claude Code). Tool descriptions are left out on purpose (they change by
// design); per-parameter `.describe()` texts stay, since they are part of the input schema.
//
// Capture (run once, at f45e3bf's mcp/ code; never regenerated after S2's code change):
//   npx tsx mcp/test/tool-schemas.ts > mcp/test/fixtures/tool-schemas-f45e3bf.json
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type ToolBridge } from "../src/tools/registry.js";

/** `value` with every object's keys sorted, recursively (arrays keep their order). */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** `[{name, inputSchema}]` sorted by name, keys sorted: what `tools/list` returns, minus descriptions. */
export async function captureToolSchemas(): Promise<Array<{ name: string; inputSchema: unknown }>> {
  const bridge: ToolBridge = {
    hasClient: false,
    reason: "schema capture",
    call: async () => {
      throw new Error("schema capture: no calls");
    },
    status: async () => {
      throw new Error("schema capture: no calls");
    },
  };
  const server = new McpServer({ name: "schema-capture", version: "0" });
  registerTools(server, bridge, undefined, { actorName: "schema-capture" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "schema-capture", version: "0" });
  await server.connect(serverSide);
  await client.connect(clientSide);
  try {
    const { tools } = await client.listTools();
    return tools
      .map((t) => ({ name: t.name, inputSchema: sortKeys(t.inputSchema) }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } finally {
    await client.close();
    await server.close();
  }
}

/** The fixture's exact text: two-space JSON plus a final newline. */
export async function toolSchemasJson(): Promise<string> {
  return `${JSON.stringify(await captureToolSchemas(), null, 2)}\n`;
}

// Run directly (tsx): print the fixture text.
if (process.argv[1] && /tool-schemas\.ts$/.test(process.argv[1])) {
  process.stdout.write(await toolSchemasJson());
}

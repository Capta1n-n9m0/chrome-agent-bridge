import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { Bridge } from "./bridge.js";
import { WsHost } from "./wsHost.js";
import { registerTools } from "./tools/registry.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const bridge = new Bridge();
  const host = new WsHost(bridge, config);
  const port = await host.listen();
  console.error(`[chrome-bridge] WebSocket host listening on 127.0.0.1:${port}`);

  const server = new McpServer({ name: "chrome-agent-bridge", version: "0.1.0" });
  registerTools(server, bridge);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("[chrome-bridge] fatal:", err);
  process.exit(1);
});

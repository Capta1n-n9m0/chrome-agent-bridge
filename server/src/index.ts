import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { Bridge } from "./bridge.js";
import { WsHost } from "./wsHost.js";
import { startWsHost } from "./startup.js";
import { registerTools } from "./tools/registry.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const bridge = new Bridge();

  // Bring up the WebSocket host, but never let a busy port crash the MCP server.
  // An orphaned bridge instance (or a second Claude session) can hold the port;
  // if so we still connect the stdio transport so the client sees a healthy
  // server, and warn that browser tools are unavailable until the port is free.
  const host = new WsHost(bridge, config);
  const started = await startWsHost(host);
  if (started.ok) {
    console.error(`[chrome-bridge] WebSocket host listening on 127.0.0.1:${started.port}`);
  } else {
    console.error(
      `[chrome-bridge] WARNING: could not bind the WebSocket on 127.0.0.1:${config.port} ` +
        `(${started.error.message}). Another bridge instance is probably still running — ` +
        `browser tools will not work until it is closed (end other Claude sessions, or kill ` +
        `the stale "node …/server/dist/index.js" process). The MCP server will stay up.`,
    );
  }

  const server = new McpServer({ name: "chrome-agent-bridge", version: "0.1.0" });
  registerTools(server, bridge);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("[chrome-bridge] fatal:", err);
  process.exit(1);
});

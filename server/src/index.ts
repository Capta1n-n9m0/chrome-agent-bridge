import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { Bridge } from "./bridge.js";
import { WsHost } from "./wsHost.js";
import { startWsHost } from "./startup.js";
import { registerTools } from "./tools/registry.js";

const BIND_RETRY_MS = 5000;

async function main(): Promise<void> {
  const config = loadConfig();
  const bridge = new Bridge();

  // Bring up the WebSocket host, but never let a busy port crash the MCP server.
  // An orphaned bridge instance (or a second Claude session) can hold the port;
  // if so we still connect the stdio transport so the client sees a healthy
  // server, tell the agent *why* through every tool error (and browser_status),
  // and keep retrying the bind so the session heals itself once the port frees up.
  const host = new WsHost(bridge, config);
  const onListening = (port: number): void => {
    bridge.hostState = { listening: true, port };
    bridge.setUnavailableReason(null);
    console.error(`[chrome-bridge] WebSocket host listening on 127.0.0.1:${port}`);
  };
  const started = await startWsHost(host, { retryMs: BIND_RETRY_MS, onRecovered: onListening });
  if (started.ok) {
    onListening(started.port);
  } else {
    bridge.hostState = { listening: false, port: config.port };
    const reason =
      `WebSocket port ${config.port} is busy (${started.error.message}): another chrome-agent-bridge ` +
      `instance is probably still running — end other Claude sessions or kill the stale ` +
      `"node …/server/dist/index.js" process. This server retries the bind every ${BIND_RETRY_MS / 1000}s ` +
      `and recovers automatically once the port is free.`;
    bridge.setUnavailableReason(reason);
    console.error(`[chrome-bridge] WARNING: ${reason}`);
  }

  const server = new McpServer({ name: "chrome-agent-bridge", version: "0.1.0" });
  registerTools(server, bridge);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("[chrome-bridge] fatal:", err);
  process.exit(1);
});

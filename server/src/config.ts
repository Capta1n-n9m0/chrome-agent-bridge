export interface Config {
  port: number;
  token: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.BRIDGE_PORT ?? "9234");
  const token = env.BRIDGE_TOKEN ?? "";
  if (!token) {
    throw new Error(
      "BRIDGE_TOKEN is required. Set it in the MCP server config and in the extension options page.",
    );
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`BRIDGE_PORT must be a valid port number, got: ${env.BRIDGE_PORT}`);
  }
  return { port, token };
}

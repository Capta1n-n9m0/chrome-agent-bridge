import type { WsHost } from "./wsHost.js";

export type WsHostStart = { ok: true; port: number } | { ok: false; error: Error };

/**
 * Bring up the WebSocket host without ever throwing. A busy port (EADDRINUSE —
 * e.g. an orphaned bridge instance is still running, or a second Claude session
 * is active) must NOT crash the MCP server: the stdio transport has to stay up so
 * the client sees a healthy server instead of "failed to connect".
 */
export async function startWsHost(host: WsHost): Promise<WsHostStart> {
  try {
    const port = await host.listen();
    return { ok: true, port };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

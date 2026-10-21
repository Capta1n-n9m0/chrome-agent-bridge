// The MCP's own configuration. The token and port are not read here any more: `connect()` from
// @bridge/sdk resolves them (BRIDGE_TOKEN wins, else `bridge.token` at the workspace root; BRIDGE_PORT,
// default 9234) — phase-doc decision 0.10.

/**
 * The actor name the daemon lists in `daemon.status` and its log. It carries the MCP's own process
 * id, not `ppid`: under the nvm-windows shim the parent is the shim (decisions.md · 2026-10-21 ·
 * The actor name carries the MCP's own process id).
 */
export function actorName(pid: number = process.pid): string {
  return `claude-code #${pid}`;
}

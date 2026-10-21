export type WsHostStart = ({ ok: true; port: number } | { ok: false; error: Error }) & {
  /** Cancel any pending bind retry (shutdown / tests). */
  stop(): void;
};

export interface StartOptions {
  /** How often to retry a failed bind. `0` disables retrying. Default 5000. */
  retryMs?: number;
  /** Called once a retry succeeds after an initial failure. */
  onRecovered?: (port: number) => void;
}

/**
 * Bring up the WebSocket host without ever throwing. A busy port (EADDRINUSE —
 * e.g. an orphaned bridge instance is still running, or a second Claude session
 * is active) must NOT crash the MCP server: the stdio transport has to stay up so
 * the client sees a healthy server instead of "failed to connect".
 *
 * The failure is reported immediately (stdio doesn't wait), and the bind is retried
 * on a timer so the session heals itself once the other instance exits — no restart.
 */
export async function startWsHost(
  host: { listen(): Promise<number> },
  options: StartOptions = {},
): Promise<WsHostStart> {
  const retryMs = options.retryMs ?? 5000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const stop = (): void => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  try {
    const port = await host.listen();
    return { ok: true, port, stop };
  } catch (error) {
    if (retryMs > 0) scheduleRetry();
    return { ok: false, error: error as Error, stop };
  }

  function scheduleRetry(): void {
    timer = setTimeout(async () => {
      timer = undefined;
      if (stopped) return;
      try {
        const port = await host.listen();
        if (!stopped) options.onRecovered?.(port);
      } catch {
        if (!stopped) scheduleRetry();
      }
    }, retryMs);
  }
}

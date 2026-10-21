import type { EventEmitter } from "node:events";

export interface LifecycleOptions {
  /** The MCP stdio input. `end`/`close` means the client closed the pipe or died. */
  stdin: EventEmitter;
  /** The MCP stdio output. An `error` (EPIPE) means nobody is reading any more. */
  stdout: EventEmitter;
  /** Where termination signals arrive — `process` in production. */
  signals: EventEmitter;
  /** Release resources (WS port, timers). Errors and hangs are tolerated. */
  shutdown: (reason: string) => Promise<void> | void;
  exit: (code: number) => void;
  /** The parent pid at startup. `<= 1` disables the parent watch. */
  parentPid: number;
  currentParentPid: () => number;
  isAlive: (pid: number) => boolean;
  /** Parent-watch interval. Default 2000. */
  pollMs?: number;
  /** Exit anyway if `shutdown` hasn't settled by then. Default 3000. */
  forceExitMs?: number;
}

const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"] as const;

/**
 * Make the server exit when its Claude session goes away. Without this the WebSocket server keeps
 * the event loop alive after the client is gone, and the orphan holds port 9234 so the next
 * session's bridge can't bind.
 *
 * Triggers, any of which is enough: stdin EOF/close (the normal case on every OS), a stdout error,
 * a termination signal, or the parent process disappearing. The parent watch covers launchers
 * that sit between Claude and node (the nvm-windows `node.exe` shim, `npx`, a shell) and can be
 * killed without the pipe closing: on Windows a dead parent's pid stays our `ppid`, on Linux/macOS
 * we get re-parented to init or a subreaper, so we check both.
 */
export function installLifecycle(options: LifecycleOptions): { dispose(): void } {
  const { stdin, stdout, signals, parentPid } = options;
  let shuttingDown = false;

  const trigger = (reason: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    dispose();
    let exited = false;
    const exitOnce = (): void => {
      if (exited) return;
      exited = true;
      clearTimeout(force);
      options.exit(0);
    };
    const force = setTimeout(exitOnce, options.forceExitMs ?? 3000);
    force.unref?.();
    Promise.resolve()
      .then(() => options.shutdown(reason))
      .catch(() => {})
      .then(exitOnce);
  };

  const onStdinEnd = (): void => trigger("stdin ended (MCP client disconnected)");
  const onStdinClose = (): void => trigger("stdin closed (MCP client disconnected)");
  const onStdoutError = (): void => trigger("stdout error (MCP client gone)");
  const signalHandlers = SIGNALS.map((sig) => [sig, () => trigger(`received ${sig}`)] as const);

  stdin.on("end", onStdinEnd);
  stdin.on("close", onStdinClose);
  stdout.on("error", onStdoutError);
  for (const [sig, handler] of signalHandlers) signals.on(sig, handler);

  let poll: ReturnType<typeof setInterval> | undefined;
  if (parentPid > 1) {
    poll = setInterval(() => {
      if (options.currentParentPid() !== parentPid || !options.isAlive(parentPid)) {
        trigger(`parent process ${parentPid} exited`);
      }
    }, options.pollMs ?? 2000);
    poll.unref?.();
  }

  function dispose(): void {
    if (poll) clearInterval(poll);
    poll = undefined;
    stdin.off("end", onStdinEnd);
    stdin.off("close", onStdinClose);
    stdout.off("error", onStdoutError);
    for (const [sig, handler] of signalHandlers) signals.off(sig, handler);
  }

  return { dispose };
}

/** Signal 0 tests for existence without delivering anything. EPERM means it exists but isn't ours. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

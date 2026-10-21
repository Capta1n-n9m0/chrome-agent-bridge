// The MCP's connection to the bridge daemon, supervised so that a failure never crashes the MCP
// (the no-crash rule `startup.ts` used to keep for the WebSocket bind). One `connect()` at a time:
// the next attempt is scheduled 5 s after the previous one settles. While a client is held, the same
// 5 s tick probes it with `client.connect()` — zero wire traffic: it resolves at once on an open
// client and rejects at once with the stored failure on one whose connection closed with a code other
// than 4002 (decision #15). The SDK exports no failure event, so the probe is how the MCP notices.
// A tool call that rejects with NOT_CONNECTED probes too, so a dead client is dropped right away.
import { BridgeError, ErrorCodes, type BridgeClient, type CallOptions } from "@bridge/sdk";

export const RETRY_MS = 5000;
/** The reason shown before the first attempt has settled. */
export const CONNECTING_REASON = "connecting to the bridge daemon…";
const STOPPED_REASON = "the MCP server is shutting down";

/** The part of `BridgeClient` the link uses. */
export type LinkClient = Pick<BridgeClient, "call" | "status" | "close"> & { connect(): Promise<unknown> };

export interface LinkTimers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** Real timers that never keep the process alive (the lifecycle decides when the MCP exits). */
export const unrefTimers: LinkTimers = {
  setTimeout: (fn, ms) => {
    const t = setTimeout(fn, ms);
    t.unref?.();
    return t;
  },
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface LinkOptions {
  connect: () => Promise<LinkClient>;
  retryMs?: number;
  timers?: LinkTimers;
  /** Called when the stored reason changes: a message, or null once connected. */
  onChange?: (reason: string | null) => void;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class BridgeLink {
  private readonly connectFn: () => Promise<LinkClient>;
  private readonly retryMs: number;
  private readonly timers: LinkTimers;
  private readonly onChange?: (reason: string | null) => void;
  private client: LinkClient | null = null;
  private storedReason: string | null = null;
  private timer: unknown = null;
  private started = false;
  private stopped = false;

  constructor(options: LinkOptions) {
    this.connectFn = options.connect;
    this.retryMs = options.retryMs ?? RETRY_MS;
    this.timers = options.timers ?? unrefTimers;
    this.onChange = options.onChange;
  }

  /** Whether a client is held (it may still turn out to have failed; the next probe tells). */
  get hasClient(): boolean {
    return this.client !== null;
  }

  /** Why there is no client: the last failure's message; null before the first failure or when connected. */
  get reason(): string | null {
    return this.storedReason;
  }

  /** Runs the first attempt. */
  start(): void {
    if (this.started || this.stopped) return;
    this.started = true;
    this.attempt();
  }

  call(method: string, params?: Record<string, unknown>, options?: CallOptions): Promise<unknown> {
    return this.through((c) => c.call(method, params, options));
  }

  /** `daemon.status` through the current client. */
  status(): Promise<unknown> {
    return this.through((c) => c.status());
  }

  /** Stops retrying and closes the client, including one a still-running `connect()` returns later. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    this.timer = null;
    const c = this.client;
    this.client = null;
    c?.close();
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private async through(fn: (c: LinkClient) => Promise<unknown>): Promise<unknown> {
    const c = this.client;
    if (!c) {
      const why = this.stopped ? STOPPED_REASON : (this.storedReason ?? CONNECTING_REASON);
      throw new BridgeError(ErrorCodes.NOT_CONNECTED, why);
    }
    try {
      return await fn(c);
    } catch (err) {
      if (err instanceof BridgeError && err.code === ErrorCodes.NOT_CONNECTED) void this.probe(c);
      throw err;
    }
  }

  private setReason(reason: string | null): void {
    if (reason === this.storedReason) return;
    this.storedReason = reason;
    this.onChange?.(reason);
  }

  /** True if `c` is still usable; otherwise drops it (if still current) and stores why. */
  private async probe(c: LinkClient): Promise<boolean> {
    try {
      await c.connect();
      return true;
    } catch (err) {
      if (this.client === c) {
        this.client = null;
        c.close();
        if (!this.stopped) this.setReason(messageOf(err));
      }
      return false;
    }
  }

  private attempt(): void {
    if (this.stopped) return;
    this.connectFn().then(
      (c) => {
        if (this.stopped) {
          c.close();
          return;
        }
        this.client = c;
        this.setReason(null);
        this.schedule();
      },
      (err: unknown) => {
        if (this.stopped) return;
        this.setReason(messageOf(err));
        this.schedule();
      },
    );
  }

  private schedule(): void {
    if (this.stopped) return;
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, this.retryMs);
  }

  private async tick(): Promise<void> {
    if (this.stopped) return;
    const c = this.client;
    if (c && (await this.probe(c))) {
      this.schedule();
      return;
    }
    this.attempt();
  }
}

/**
 * Step 11b S3b (phase doc 0.6; #293 as amended by #296): recognises a `downloadStart` whose fetch its own block-list
 * rules stopped on a hop. Pure: `sw.ts` hands every `webRequest.onErrorOccurred` event to `offer` inside the existing
 * listener, before `ingest` (which drops blocked hosts, stage0-audit F6); a covered call opens a watch with the list of
 * its own gate read (the list its rules were built from) for the life of its fetch, and closes it at the post-check.
 *
 * An event counts only when it is the worker's own request (tab -1, `xmlhttprequest`, initiated by this extension:
 * Stage0.md §4, #290 (3)), Chrome blocked it (`net::ERR_BLOCKED_BY_CLIENT`), and the watch's list blocks its URL
 * (`isUrlBlocked`, tested in memory). Only the time of the last hit is kept, and a hit counts only within the settle
 * window of the fetch's rejection (S3b fixer): no URL is stored, returned or logged. No log call here.
 */
import { isUrlBlocked, type BlockList } from "./safety-match.js";

export const BLOCKED_BY_CLIENT = "net::ERR_BLOCKED_BY_CLIENT";
/** How long a failed fetch waits for its blocked-hop event: the order of the two is not measured (Run 17). */
export const HOP_SETTLE_MS = 300;

/** The fields of a `webRequest.onErrorOccurred` event the recogniser reads. */
export interface HopEvent {
  tabId?: unknown;
  type?: unknown;
  initiator?: unknown;
  error?: unknown;
  url?: unknown;
}

/** One call's watch. */
export interface HopWatch {
  /** True once a blocked hop of this call was seen. */
  blocked(): boolean;
  /**
   * Called at the fetch's rejection. Resolves true at once on a hit seen at most `ms` before (or once one arrives),
   * else false after `ms` or at `close`. An older hit (another download's hop earlier in a long fetch) does not count.
   */
  settle(ms?: number): Promise<boolean>;
  /** Ends the watch; idempotent. */
  close(): void;
}

class Watch implements HopWatch {
  /** When the last hit was seen (a timestamp only), or -1. */
  hitAt = -1;
  private wakers: Array<() => void> = [];

  constructor(
    readonly list: BlockList,
    private readonly live: Set<Watch>,
    private readonly now: () => number,
  ) {}

  blocked(): boolean {
    return this.hitAt >= 0;
  }

  mark(): void {
    this.hitAt = this.now();
    this.wake();
  }

  settle(ms = HOP_SETTLE_MS): Promise<boolean> {
    const since = this.now() - ms;
    const recent = () => this.hitAt >= 0 && this.hitAt >= since;
    if (recent() || !this.live.has(this)) return Promise.resolve(recent());
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wakers = this.wakers.filter((w) => w !== done);
        resolve(recent());
      }, ms);
      const done = () => {
        clearTimeout(timer);
        resolve(recent());
      };
      this.wakers.push(done);
    });
  }

  close(): void {
    this.live.delete(this);
    this.wake();
  }

  private wake(): void {
    const ws = this.wakers;
    this.wakers = [];
    for (const w of ws) w();
  }
}

export class BlockedHopWatcher {
  private readonly live = new Set<Watch>();
  private readonly origin: string;

  constructor(
    extensionId: string,
    private readonly now: () => number = Date.now,
  ) {
    this.origin = `chrome-extension://${extensionId}`;
  }

  /** Open watches (for tests). */
  get size(): number {
    return this.live.size;
  }

  open(list: BlockList): HopWatch {
    const w = new Watch(list, this.live, this.now);
    this.live.add(w);
    return w;
  }

  /** One `onErrorOccurred` event. Synchronous, never throws, keeps nothing of the event. */
  offer(d: HopEvent | null | undefined): void {
    try {
      if (this.live.size === 0 || !d) return;
      if (d.tabId !== -1 || d.type !== "xmlhttprequest" || d.error !== BLOCKED_BY_CLIENT || d.initiator !== this.origin) return;
      const url = d.url;
      if (typeof url !== "string") return;
      for (const w of this.live) if (isUrlBlocked(url, w.list)) w.mark();
    } catch {
      // the ingest that follows must run whatever happens here
    }
  }
}

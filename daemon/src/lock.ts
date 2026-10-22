// Step 7 T2 — the visibility lock (phase doc 0.4; spec §6.4; decisions.md #44). One daemon-wide FIFO
// mutex, taken for one call by the screen-needing methods. Pure: injected clock and timers.
//
// Invariants (integrity floor): FIFO; released only on the holder's completion, timeout or
// disconnect; every acquisition's `release()` is idempotent and can never free a later holder.
import { BridgeError, ErrorCodes } from "@bridge/shared";

type TimerHandle = unknown;

export interface VisibilityLockOptions {
  /** A client's display name for `LOCK_TIMEOUT {holder}`. */
  nameOf: (clientId: string) => string;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

interface Waiter {
  clientId: string;
  grant: (release: () => void) => void;
  fail: (err: Error) => void;
  timer: TimerHandle;
}

export class VisibilityLock {
  /** The current acquisition's token; a release with another token is a no-op. */
  private current: { token: number; clientId: string } | undefined;
  private nextToken = 1;
  private readonly queue: Waiter[] = [];
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => TimerHandle;
  private readonly clearTimer: (handle: TimerHandle) => void;

  constructor(private readonly options: VisibilityLockOptions) {
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** The holder's client id, if the lock is held. */
  holder(): string | undefined {
    return this.current?.clientId;
  }

  /**
   * Wait in FIFO order until `deadline` (epoch ms). Resolves with this acquisition's `release()`;
   * rejects `LOCK_TIMEOUT {holder}` at the deadline. Uncontended, it is granted at once.
   */
  acquire(clientId: string, deadline: number): Promise<() => void> {
    if (!this.current && this.queue.length === 0) return Promise.resolve(this.take(clientId));
    const wait = deadline - this.now();
    if (wait <= 0) return Promise.reject(this.timeoutError());
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        clientId,
        grant: resolve,
        fail: reject,
        timer: undefined,
      };
      waiter.timer = this.setTimer(() => {
        const i = this.queue.indexOf(waiter);
        if (i < 0) return; // already granted or dropped
        this.queue.splice(i, 1);
        reject(this.timeoutError());
      }, wait);
      this.queue.push(waiter);
    });
  }

  /**
   * A client disconnected: drop its waiters (rejected), then free the lock if it holds it — so the
   * next holder is never the departing client. Its late `release()` is then a no-op.
   */
  releaseAllOf(clientId: string): void {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const w = this.queue[i];
      if (w.clientId !== clientId) continue;
      this.queue.splice(i, 1);
      this.clearTimer(w.timer);
      w.fail(new BridgeError(ErrorCodes.NOT_CONNECTED, "client disconnected"));
    }
    if (this.current?.clientId === clientId) this.free(this.current.token);
  }

  private take(clientId: string): () => void {
    const token = this.nextToken++;
    this.current = { token, clientId };
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.free(token);
    };
  }

  private free(token: number): void {
    if (this.current?.token !== token) return;
    this.current = undefined;
    const next = this.queue.shift();
    if (!next) return;
    this.clearTimer(next.timer);
    next.grant(this.take(next.clientId));
  }

  private timeoutError(): BridgeError {
    const holder = this.current ? this.options.nameOf(this.current.clientId) : "unknown";
    return new BridgeError(
      ErrorCodes.LOCK_TIMEOUT,
      `timed out waiting for the visibility lock, held by ${JSON.stringify(holder)}`,
      { holder },
    );
  }
}

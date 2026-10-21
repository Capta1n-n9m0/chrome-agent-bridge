// Idle exit (phase-doc decision 0.6, spec §9.6): armed while the daemon has zero clients, cancelled
// as soon as one connects; fires `onIdle` after `ms` of uninterrupted zero. The extension does not
// count — the caller feeds this from the client registry only. Pure apart from the injected timers.

type TimerHandle = ReturnType<typeof setTimeout>;

/** Node's `setTimeout` maximum (2^31 - 1 ms); a larger delay warns and fires after 1 ms. */
export const MAX_IDLE_MS = 2_147_483_647;

export interface IdleTimerOptions {
  ms: number;
  onIdle: () => void;
  /** Clock for `deadline()`. Default `Date.now`. */
  now?: () => number;
  setTimeout?: (fn: () => void, ms: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
}

export class IdleTimer {
  private handle: TimerHandle | undefined;
  private due: number | null = null;
  private done = false;
  private readonly now: () => number;
  private readonly setT: (fn: () => void, ms: number) => TimerHandle;
  private readonly clearT: (handle: TimerHandle) => void;

  constructor(private readonly options: IdleTimerOptions) {
    if (!Number.isInteger(options.ms) || options.ms < 1 || options.ms > MAX_IDLE_MS) {
      throw new RangeError(`IdleTimer ms must be a whole number from 1 to ${MAX_IDLE_MS}`);
    }
    this.now = options.now ?? Date.now;
    this.setT = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearT = options.clearTimeout ?? ((h) => clearTimeout(h));
  }

  /** True while a fire is pending. */
  get armed(): boolean {
    return this.handle !== undefined;
  }

  /** True once `onIdle` has run (it runs at most once per timer). */
  get fired(): boolean {
    return this.done;
  }

  /** Epoch ms at which the pending fire is due, or null when not armed. */
  deadline(): number | null {
    return this.due;
  }

  /**
   * Feed the current client count. 0 arms the timer (a timer already armed keeps its deadline);
   * anything above 0 cancels it. No effect after firing or `dispose()`.
   */
  update(count: number): void {
    if (this.done) return;
    if (count > 0) {
      this.cancel();
      return;
    }
    if (this.handle !== undefined) return;
    this.due = this.now() + this.options.ms;
    this.handle = this.setT(() => {
      this.handle = undefined;
      this.due = null;
      if (this.done) return;
      this.done = true;
      this.options.onIdle();
    }, this.options.ms);
  }

  /** Cancel any pending fire and ignore every later update. */
  dispose(): void {
    this.cancel();
    this.done = true;
  }

  private cancel(): void {
    if (this.handle !== undefined) this.clearT(this.handle);
    this.handle = undefined;
    this.due = null;
  }
}

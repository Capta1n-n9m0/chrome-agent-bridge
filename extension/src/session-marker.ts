/**
 * The extension's session marker (Step 8 S2b.5; decisions.md · 2026-10-23 · The extension hello carries
 * an optional session marker (#74), amended by · The session marker's mechanism (#80)).
 *
 * The marker stays the same across service-worker restarts and extension reloads and changes when Chrome
 * restarts, so the daemon can retire every handle when Chrome's tab ids may have been reused. Pure: no
 * `chrome.*` (the service worker hands in a store, a random source and a delay), so every event order is
 * unit-tested. The marker travels in the hello only; it is never logged.
 *
 * - `storage.session` holds a marker → reuse it at once (a worker restart: `storage.session` survives it
 *   and is emptied by an extension reload and by Chrome exiting).
 * - else one bound of `MARKER_WAIT_MS` starts (at the `storage.session` miss, the start of `resolve()`):
 *   - `runtime.onStartup` seen (before or within the bound) → fresh (Chrome started); it wins over
 *     `onInstalled`;
 *   - `runtime.onInstalled` with any reason but "install"/"update" (e.g. "chrome_update") → fresh at once;
 *   - `runtime.onInstalled` "install"/"update" (an extension reload, or a Chrome start whose
 *     `onInstalled` happens to come first) → keep waiting for `onStartup` until the same bound ends; only
 *     then reuse `storage.local`'s marker (fresh when there is none). An extension reload therefore sends
 *     its hello up to `MARKER_WAIT_MS` later (S2b fixer 1, verifier F1: no hello with the old marker on a
 *     Chrome start whose `onInstalled` precedes `onStartup`);
 *   - no event before the bound ends → fresh (costs leases, never safety).
 * The chosen marker is written to both stores. An `onStartup` that arrives after a reused marker was
 * chosen (later than the bound) rotates to a fresh one (`onRotate`) — the backstop, so a Chrome restart
 * is never kept.
 */

/** The key the marker is stored under, in `storage.session` and `storage.local`. */
export const MARKER_KEY = "sessionMarker";
/** How long `current()` waits for `onStartup`/`onInstalled` when `storage.session` has no marker. */
export const MARKER_WAIT_MS = 2000;

export type MarkerSource = "worker-restart" | "reload" | "chrome-start" | "chrome-update" | "no-event" | "rotated";

export interface MarkerChoice {
  marker: string;
  source: MarkerSource;
}

export interface MarkerInputs {
  /** `storage.session`'s marker, if any. */
  session?: string;
  /** `storage.local`'s marker, if any. */
  local?: string;
  /** `runtime.onStartup` was seen. */
  startup: boolean;
  /** `runtime.onInstalled` was seen, with its reason. */
  installed?: string;
}

/** onInstalled reasons that mean "the extension was reloaded or updated, Chrome kept running". */
const RELOAD_REASONS = new Set(["install", "update"]);

/** The choice, as a pure function of what was seen. */
export function chooseMarker(input: MarkerInputs, fresh: () => string): MarkerChoice {
  if (input.session) return { marker: input.session, source: "worker-restart" };
  if (input.startup) return { marker: fresh(), source: "chrome-start" };
  if (input.installed !== undefined) {
    if (!RELOAD_REASONS.has(input.installed)) return { marker: fresh(), source: "chrome-update" };
    return { marker: input.local || fresh(), source: "reload" };
  }
  return { marker: fresh(), source: "no-event" };
}

export interface MarkerStore {
  getSession(): Promise<string | undefined>;
  getLocal(): Promise<string | undefined>;
  /** Write the marker to `storage.session` and `storage.local`. */
  setBoth(marker: string): Promise<void>;
}

export interface SessionMarkerDeps {
  store: MarkerStore;
  /** A fresh random marker (the service worker uses `crypto.randomUUID()`). */
  random: () => string;
  /** Resolves after `ms` (the service worker uses `setTimeout`). */
  delay: (ms: number) => Promise<void>;
  /** Default `MARKER_WAIT_MS`. */
  waitMs?: number;
  /** Told the new marker when a late `onStartup` rotates it; the worker reconnects with it. */
  onRotate?: (marker: string) => void;
}

export class SessionMarker {
  private startupSeen = false;
  private installedReason: string | undefined;
  private wake: () => void = () => {};
  private readonly signal: Promise<void>;
  private wakeStartup: () => void = () => {};
  private readonly startupSignal: Promise<void>;
  private value: Promise<string> | undefined;
  private chosen: MarkerChoice | undefined;

  constructor(private readonly deps: SessionMarkerDeps) {
    this.signal = new Promise<void>((resolve) => {
      this.wake = resolve;
    });
    this.startupSignal = new Promise<void>((resolve) => {
      this.wakeStartup = resolve;
    });
  }

  /** `runtime.onStartup` fired (call synchronously from a top-level listener). */
  startup(): void {
    this.startupSeen = true;
    this.wake();
    this.wakeStartup();
    const reused = this.chosen && (this.chosen.source === "worker-restart" || this.chosen.source === "reload");
    if (reused) this.rotate();
  }

  /** `runtime.onInstalled` fired with `reason` (call synchronously from a top-level listener). */
  installed(reason: string | undefined): void {
    if (this.installedReason === undefined) this.installedReason = reason ?? "";
    this.wake();
  }

  /** The marker for this worker's hello; resolved once, then memoised (a rotation replaces it). */
  current(): Promise<string> {
    this.value ??= this.resolve();
    return this.value;
  }

  private async resolve(): Promise<string> {
    const { store } = this.deps;
    let session: string | undefined;
    try {
      session = await store.getSession();
    } catch {
      session = undefined; // unreadable: a miss, never a crash
    }
    if (!session && !this.startupSeen) {
      // One bound for the whole wait, never restarted.
      const bound = this.deps.delay(this.deps.waitMs ?? MARKER_WAIT_MS);
      if (this.installedReason === undefined) await Promise.race([this.signal, bound]);
      // A reload reason alone is not enough: a Chrome start may deliver onInstalled before onStartup, so
      // keep waiting for onStartup until the same bound ends (S2b fixer 1, verifier F1).
      if (!this.startupSeen && this.installedReason !== undefined && RELOAD_REASONS.has(this.installedReason)) {
        await Promise.race([this.startupSignal, bound]);
      }
    }
    let local: string | undefined;
    if (!session && !this.startupSeen && this.installedReason !== undefined && RELOAD_REASONS.has(this.installedReason)) {
      try {
        local = await store.getLocal();
      } catch {
        local = undefined;
      }
    }
    // Read the flags after every await: an event that arrived meanwhile counts.
    const choice = chooseMarker(
      { session: session || undefined, local: local || undefined, startup: this.startupSeen, installed: this.installedReason },
      this.deps.random,
    );
    this.chosen = choice;
    try {
      await store.setBoth(choice.marker);
    } catch {
      // not persisted: the next worker start chooses again (fresh at worst — costs leases, never safety)
    }
    // A late onStartup during the write already rotated: hand out the rotated marker.
    return this.chosen.marker;
  }

  private rotate(): void {
    const marker = this.deps.random();
    this.chosen = { marker, source: "rotated" };
    this.value = Promise.resolve(marker);
    this.deps.store.setBoth(marker).catch(() => {});
    this.deps.onRotate?.(marker);
  }
}

/**
 * Step 12 S4a (phase doc 0.6 with its Stage 0 note; decisions.md #324 as amended by #335; #321 Q3 (a)): the kept
 * debugger session, pure. Attach, detach, `getTargets`, the timers and the tab check are injected; there is no
 * `chrome.*` and no log call. Unit-tested in `extension/test/debugger-keeper.test.ts`. S4b wires it.
 *
 * - At most one session per tab. The first use attaches; a later use that does not overlap reuses it; a use that
 *   overlaps one in flight (or attaching) on the same tab answers as today — Chrome's own "Another debugger is already
 *   attached" text through the caller's `mapError` (`DEBUGGER_DEVTOOLS`) — and attaches nothing (#335).
 * - The keeper never attaches a tab it holds, so Chrome's "Another debugger…" on a held tab while no call runs is the
 *   keeper's own state and is never seen (m2 D5).
 * - Idle detach `KEEPER_IDLE_MS` after the last use ends.
 * - Every kept session, idle or busy, is recorded in the `DebuggerSessions` registry from before its attach until
 *   after its detach (F3), so the disarm's `detachAll` detaches it and marks it killed; an idle killed session is
 *   forgotten without a second detach, and a use in flight ends with the disarm's refusal.
 * - A session killed (a disarm, or a refusing recheck) while its attach was pending is detached again as soon as the
 *   attach lands: the kill's detach may have reached Chrome first (verifier F1 P1/P2). A kill after the attach landed
 *   needs no second detach, and the use's end sends none: by then a newer session may be kept on the tab (verifier-2 N1).
 * - The call's gate re-check (`guard.effect()`) runs before EVERY use, the reused ones too. A refusal means no use; a
 *   refusal other than `JS_DISABLED`/`UPLOAD_REFUSED` (class rules that say nothing about the tab), or any other
 *   failure, also detaches the tab's session (fail closed). If another call's use is busy on the tab, a
 *   `DISARMED`/`DOMAIN_BLOCKED` refusal ends that use with the refusal; any other failure detaches when it ends (F2).
 * - After the use that attached a session, and before the session is kept idle, the tab check runs once: a page
 *   that became refused before the session entered the keeper (where `recheckTab` cannot see it) is caught (F1 P5).
 * - Detach on: the tab's page becoming refused (`recheckTab`, from `tabs.onUpdated`), a safety change
 *   (`recheckAll`, from `storage.onChanged`; F4), close or replace (`tabGone`), any error of a use (a timeout or a
 *   broken command may leave state behind, G-10), `KeptUse.drop()` (a failed clean-up on success). Chrome's
 *   `onDetach` (any reason) forgets the session (not one whose attach is pending, V3-1); since the event cannot name
 *   which session it ends, `getTargets` is then read, bounded, and a tab still attached (or unread) is detached (a late
 *   event must not orphan a newer session, F3; V3-2). A use after
 *   any of these attaches again.
 * - A use waits for a pending detach on its tab, at most `KEEPER_DETACH_WAIT_MS`, then goes on (F5); the re-check
 *   runs after that wait (S4b V3).
 * - `sweep()` at worker start detaches every `attached: true` tab target (a session survives a worker stop, m2 D4c;
 *   no `extensionId` filter is possible, #335), ignoring failures; uses wait for it.
 */
import { isRefusal, refusalError, safetyDecision, type SafetyRefusal } from "./safety.js";
import { resolveTabTarget } from "./safety-call.js";
import type { SafetyView } from "./safety-state.js";
import type { DebuggerSession, DebuggerSessions, EffectGuard } from "./safety-debugger.js";
import { ErrorCodes } from "./errors.js";

/** The idle bound (#321 Q3 (a)). */
export const KEEPER_IDLE_MS = 5000;

/** How long a use waits for a pending detach on its tab before it goes on (F5). */
export const KEEPER_DETACH_WAIT_MS = 1000;

export interface KeeperTimers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

/** The part of `chrome.debugger.TargetInfo` the sweep reads. */
export interface KeeperTargetInfo {
  tabId?: number;
  attached: boolean;
}

export interface KeeperDeps {
  attach(tabId: number): Promise<void>;
  detach(tabId: number): Promise<void>;
  getTargets(): Promise<readonly KeeperTargetInfo[]>;
  timers: KeeperTimers;
  /** The registry the disarm's `detachAll` reads (`debuggerSessions` in `debugger.ts`). */
  sessions: DebuggerSessions;
  /**
   * The tab's state and page now: a refusal (disarmed, blocked, own page, `file:`) or null. A throw counts as a refusal.
   * It runs on a fresh use's reply path and the keeper does not bound it: S4b must make it settle promptly (`tabs.get`
   * plus the state read, each bounded; a timeout throws, so it refuses) (verifier-2 N3).
   */
  tabCheck(tabId: number): Promise<SafetyRefusal | null>;
}

/** Handed to each use's work. */
export interface KeptUse {
  /**
   * The session's state could not be reset (a failed clean-up): detach when this use ends. The session outlives the
   * call, so every clean-up that today relies on "the detach that follows" must call this when it fails — S4b's
   * obligation (verifier F4): `evaluate/call.ts`'s quiet `Debugger.disable`, `console-messages.ts`'s `Runtime.disable`,
   * trusted input's focus-emulation off, and any state a use leaves in the session (`upload-files.ts`'s isolated world).
   */
  drop(): void;
}

export interface KeeperUseOptions {
  /** The call's gate re-check, run before every use. */
  guard?: EffectGuard;
  /** Today's mapping of a debugger failure (`describeDebuggerError` with the caller's `what`). */
  mapError(err: unknown): Error;
}

interface Kept {
  readonly record: DebuggerSession;
  busy: boolean;
  /** Chrome's attach for this entry has resolved (verifier-2 N2). */
  attached: boolean;
  drop: boolean;
  timer: unknown;
}

/** Class rules of one call: they refuse the use but say nothing about the tab, so the session is kept. */
const KEEP_ON: ReadonlySet<string> = new Set([ErrorCodes.JS_DISABLED, ErrorCodes.UPLOAD_REFUSED]);
/** Refusals about the tab or the state: they end another call's use in flight on the tab (F2). */
const KILL_ON: ReadonlySet<string> = new Set([ErrorCodes.DISARMED, ErrorCodes.DOMAIN_BLOCKED]);

const UNREADABLE: SafetyRefusal = { code: ErrorCodes.DISARMED, message: "The safety state could not be read." };

const codeOf = (err: unknown): string => {
  const c = err instanceof Error ? (err as { code?: unknown }).code : undefined;
  return typeof c === "string" ? c : "";
};

export class DebuggerKeeper {
  private readonly kept = new Map<number, Kept>();
  private readonly detaching = new Map<number, Promise<void>>();
  private ready: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: KeeperDeps) {}

  /** `"busy"` while a use runs or attaches, `"idle"` while kept between uses, else `"none"`. */
  state(tabId: number): "none" | "idle" | "busy" {
    const k = this.live(tabId);
    return k ? (k.busy ? "busy" : "idle") : "none";
  }

  get size(): number {
    return [...this.kept.keys()].filter((id) => this.live(id)).length;
  }

  /** Run `fn` on the tab's kept session, attaching first if there is none. */
  async use<T>(tabId: number, fn: (u: KeptUse) => Promise<T>, opts: KeeperUseOptions): Promise<T> {
    const { sessions } = this.deps;
    if (sessions.refused) throw refusalError(sessions.refused);
    await this.ready;
    // S4b fixer (V3): the re-check comes after the wait on a pending detach, so a refusal that lands during the wait
    // refuses the use; a newer detach that began during the re-check is waited for and the re-check runs again (one
    // whose bound already expired is not waited for twice, F5)
    for (;;) {
      await this.settled(tabId);
      const waited = this.detaching.get(tabId);
      try {
        await opts.guard?.effect();
      } catch (err) {
        await this.guardFailed(tabId, err);
        throw err;
      }
      const now = this.detaching.get(tabId);
      if (!now || now === waited) break;
    }
    let k = this.live(tabId);
    if (k?.busy) throw opts.mapError(new Error(`Another debugger is already attached to the tab with id: ${tabId}.`));
    const fresh = !k;
    if (k) {
      this.deps.timers.clear(k.timer);
      k.timer = undefined;
      k.busy = true;
    } else {
      k = { record: sessions.begin(tabId), busy: true, attached: false, drop: false, timer: undefined };
      this.kept.set(tabId, k);
      try {
        await this.deps.attach(tabId);
      } catch (err) {
        this.forget(tabId, k);
        throw k.record.killed ? refusalError(k.record.killed) : opts.mapError(err);
      }
      k.attached = true;
      // F1 P1/P2: killed while the attach was pending; the kill's detach may have preceded it
      if (k.record.killed) await this.detachTab(tabId, k.record);
    }
    const mine = k;
    try {
      if (mine.record.killed) throw refusalError(mine.record.killed);
      const out = await fn({ drop: () => void (mine.drop = true) });
      if (mine.record.killed) throw refusalError(mine.record.killed);
      return out;
    } catch (err) {
      mine.drop = true;
      if (mine.record.killed) throw refusalError(mine.record.killed);
      throw opts.mapError(err);
    } finally {
      if (fresh && !mine.drop && !mine.record.killed && this.kept.get(tabId) === mine) {
        const refusal = await this.check(tabId); // F1 P5: refused before the entry existed
        // V3-3: only while still its own; whoever unmapped it sent its detach, and a newer entry passed its own guard
        if (refusal && this.kept.get(tabId) === mine) await this.release(tabId, refusal);
      }
      mine.busy = false;
      const own = this.kept.get(tabId) === mine;
      if (mine.record.killed) {
        if (own) this.forget(tabId, mine); // its detach was sent by the kill (or above); N1: none here
      } else if (own) {
        if (mine.drop) await this.release(tabId, null);
        else mine.timer = this.deps.timers.set(() => void this.idleEnd(tabId, mine), KEEPER_IDLE_MS);
      }
    }
  }

  /**
   * `chrome.debugger.onDetach` (any reason): Chrome ended a session on the tab; forget it, no detach. The event does
   * not say which session, so a late one could name a newer session (F3): read `getTargets` and detach the tab if it
   * still reads attached (a no-op "not attached" when the attached client is DevTools). Uses wait for it, at most
   * `KEEPER_DETACH_WAIT_MS`; a session whose attach resolved meanwhile is not detached — Chrome would have refused
   * that attach had an orphan still been attached (verifier-2 N2). The `getTargets` read is bounded by the same
   * `KEEPER_DETACH_WAIT_MS`, set before any waiter's bound: on a timeout the tab is detached (fail closed) before a
   * waiter's attach is issued, and a late answer is ignored (verifier-3 V3-2). An entry whose attach is still pending
   * is not forgotten: no event can be about a session whose attach has not answered, and should Chrome have ended it in
   * that gap, the use's first command fails and the error path releases it (verifier-3 V3-1).
   */
  onDetach(tabId: number, _reason: string): void {
    const k = this.kept.get(tabId);
    if (!k || !k.attached) return;
    this.forget(tabId, k);
    void this.track(
      tabId,
      (async () => {
        let attached = true;
        let h: unknown;
        const bound = new Promise<null>((r) => (h = this.deps.timers.set(() => r(null), KEEPER_DETACH_WAIT_MS)));
        try {
          const targets = await Promise.race([this.deps.getTargets(), bound]);
          if (targets) attached = targets.some((t) => t.tabId === tabId && t.attached);
        } catch {
          // unreadable: detach anyway (fail closed)
        } finally {
          this.deps.timers.clear(h);
        }
        if (attached && !this.kept.get(tabId)?.attached) await this.deps.detach(tabId);
      })(),
    );
  }

  /** The tab closed, or was replaced (its removed id): drop its session. */
  async tabGone(tabId: number): Promise<void> {
    await this.release(tabId, null);
  }

  /** The tab's page changed: detach if the tab check refuses it now. */
  async recheckTab(tabId: number): Promise<void> {
    if (!this.live(tabId)) return;
    const refusal = await this.check(tabId);
    if (refusal) await this.release(tabId, refusal);
  }

  /** A safety change (the block list, the switches): re-check every kept tab. */
  async recheckAll(): Promise<void> {
    await Promise.all([...this.kept.keys()].map((id) => this.recheckTab(id)));
  }

  /** The start-up sweep: detach every attached tab target. Resolves with how many detaches succeeded. */
  sweep(): Promise<number> {
    const run = (async () => {
      let targets: readonly KeeperTargetInfo[];
      try {
        targets = await this.deps.getTargets();
      } catch {
        return 0;
      }
      const ids = targets.filter((t) => t.attached && typeof t.tabId === "number" && !this.kept.has(t.tabId)).map((t) => t.tabId!);
      const done = await Promise.all(ids.map((id) => this.deps.detach(id).then(() => 1, () => 0)));
      return done.reduce<number>((a, b) => a + b, 0);
    })();
    this.ready = run.catch(() => 0);
    return run;
  }

  /** A kept entry not killed by a disarm; a killed one is forgotten here (detachAll already detached it). */
  private live(tabId: number): Kept | undefined {
    const k = this.kept.get(tabId);
    if (k?.record.killed && !k.busy) {
      this.forget(tabId, k);
      return undefined;
    }
    return k;
  }

  /** The tab check; a throw is a refusal (fail closed). */
  private async check(tabId: number): Promise<SafetyRefusal | null> {
    try {
      return await this.deps.tabCheck(tabId);
    } catch {
      return UNREADABLE;
    }
  }

  /**
   * A call's guard refused or failed. Not busy: detach unless the refusal is a class rule. Busy with another call's
   * use (F2): that call's own guard passed, so a refusal about the tab ends it with the refusal, and any other failure
   * leaves its answer and detaches when it ends.
   */
  private async guardFailed(tabId: number, err: unknown): Promise<void> {
    const code = codeOf(err);
    if (KEEP_ON.has(code)) return;
    const k = this.kept.get(tabId);
    if (!k?.busy) return this.release(tabId, null);
    if (!KILL_ON.has(code)) {
      k.drop = true;
      return;
    }
    const e = err as Error & { data?: unknown };
    await this.release(tabId, { code, message: e.message, data: e.data } as SafetyRefusal);
  }

  /** Wait for a pending detach on the tab, at most `KEEPER_DETACH_WAIT_MS` each (F5). */
  private async settled(tabId: number): Promise<void> {
    for (;;) {
      const p = this.detaching.get(tabId);
      if (!p) return;
      let h: unknown;
      const bound = new Promise<boolean>((r) => (h = this.deps.timers.set(() => r(false), KEEPER_DETACH_WAIT_MS)));
      await Promise.race([p.then(() => true), bound]);
      this.deps.timers.clear(h);
      // S4b (V4-1): on a bound expiry too, a newer pending detach that replaced `p` is waited for (its own bound)
      if (this.detaching.get(tabId) === p) return;
    }
  }

  private async idleEnd(tabId: number, k: Kept): Promise<void> {
    if (this.kept.get(tabId) !== k || k.busy) return;
    if (k.record.killed) this.forget(tabId, k);
    else await this.release(tabId, null);
  }

  /** Take the entry out of the map, with its timer. The registry record stays. */
  private unmap(tabId: number, k: Kept): void {
    this.deps.timers.clear(k.timer);
    k.timer = undefined;
    if (this.kept.get(tabId) === k) this.kept.delete(tabId);
  }

  /** Forget the entry: no timer, out of the registry. Chrome's side is not touched. */
  private forget(tabId: number, k: Kept): void {
    this.unmap(tabId, k);
    this.deps.sessions.end(k.record);
  }

  /**
   * Detach the tab's session, if kept. A use in flight ends with `refusal` when one is given. The entry leaves the
   * map at once; its registry record stays until the detach settles, and a new use on the tab waits for it.
   */
  private async release(tabId: number, refusal: SafetyRefusal | null): Promise<void> {
    const k = this.kept.get(tabId);
    if (!k) return;
    if (refusal && !k.record.killed) k.record.killed = refusal;
    this.unmap(tabId, k);
    await this.detachTab(tabId, k.record);
  }

  /** Detach the tab, ignoring failures; the record leaves the registry once the detach settles. */
  private detachTab(tabId: number, record: DebuggerSession): Promise<void> {
    return this.track(
      tabId,
      (async () => this.deps.detach(tabId))(),
      record,
    );
  }

  /** Hold `work` as the tab's pending detach (uses wait for it); then end `record`, if given. */
  private async track(tabId: number, work: Promise<unknown>, record?: DebuggerSession): Promise<void> {
    const p = work.then(
      () => {},
      () => {},
    );
    this.detaching.set(tabId, p);
    try {
      await p;
    } finally {
      if (this.detaching.get(tabId) === p) this.detaching.delete(tabId);
      if (record) this.deps.sessions.end(record);
    }
  }
}

// --- S4b: the pure parts of the wiring (`debugger.ts`, `sw.ts`) ------------------------------------------------------

/** How long the keeper's tab check may take before it counts as a refusal (#347 item 8, verifier-2 N3). */
export const KEEPER_TAB_CHECK_MS = 1000;

/** `p`, or a rejection after `ms`: bounds a dependency at its source (`tabCheck`, the sweep's `getTargets`). */
export function within<T>(p: Promise<T>, ms: number, timers: KeeperTimers): Promise<T> {
  let h: unknown;
  const late = new Promise<never>((_, reject) => (h = timers.set(() => reject(new Error("timed out")), ms)));
  late.catch(() => {});
  return Promise.race([p, late]).finally(() => timers.clear(h));
}

/**
 * One use's CDP commands (S4a F4: every clean-up that relied on "the detach that follows"). A command that fails, or
 * is still pending when the use ends (a lost race, a bounded quiet disable), leaves the session's state unknown, so
 * the use drops its session: `Debugger.disable`, `Runtime.disable`, focus emulation off, a release of an object.
 */
export class UseCommands {
  private pending = 0;
  private ended = false;
  constructor(private readonly use: KeptUse) {}

  track<T>(p: Promise<T>): Promise<T> {
    this.pending++;
    p.then(
      () => void this.pending--,
      () => {
        this.pending--;
        if (!this.ended) this.use.drop();
      },
    );
    return p;
  }

  end(): void {
    this.ended = true;
    if (this.pending > 0) this.use.drop();
  }
}

/** `tabs.onUpdated`: a change after which a kept tab is re-checked (its page may now be refused). */
export function pageChanged(change: { url?: string; status?: string }): boolean {
  return change.url !== undefined || change.status === "loading";
}

/** The reads `keptTabRefusal` needs (`sw.ts`'s `callDeps`). */
export interface TabCheckDeps {
  readState(): Promise<SafetyView>;
  getTab(tabId: number): Promise<{ url?: string; pendingUrl?: string }>;
  replacedBy(tabId: number): number | undefined;
  lastUrl(tabId: number): string | undefined;
}

/**
 * The keeper's `tabCheck`: the gate of a class-`tab` call on the tab now (phase `effect`): disarmed, an own page, a
 * `file:` page or a blocked one refuses; JavaScript off does not (the evaluate is refused by its own guard). A state
 * that cannot be read throws, which the keeper counts as a refusal.
 */
export async function keptTabRefusal(deps: TabCheckDeps, tabId: number): Promise<SafetyRefusal | null> {
  const view = await deps.readState();
  const target = await resolveTabTarget(deps, tabId);
  const d = safetyDecision("snapshot", { tabId }, target, view.switches, view.ctx, "effect");
  return isRefusal(d) ? d : null;
}

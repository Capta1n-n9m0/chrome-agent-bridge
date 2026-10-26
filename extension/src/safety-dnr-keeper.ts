/**
 * Step 11b S2: the DNR rule keeper. Keeps the session rules equal to the block list for the covered calls in flight
 * (phase doc 0.5 as amended by #296; decisions.md #292). Pure: the two DNR calls and the caps are injected (`sw.ts`
 * passes the real API), no log call.
 *
 * - **Per call.** A covered call (`dnrScopeOf`: `navigate`, `back`, `forward` on their tab; `downloadStart` from the
 *   worker; `newTab` is not covered, #295) installs its rules once, on its first `install` (the first `effect()`;
 *   F7: `effect()` is shared and runs twice for a download), and removes them on `release` (after the post-check, on
 *   every path). Ids come from one counter that only grows, so two calls never share an id and a released id is never
 *   reused while the worker lives.
 * - **One source.** Rules come only from S1's `rulesOf` on a `BlockList` handed in by the caller: the call's own gate
 *   read at install, the listener's fresh read at a rebuild. The keeper keeps no copy of a list.
 * - **On change.** `rebuild(list)` replaces every live call's rules in one atomic update; `rebuild(null)` (the state
 *   unreadable) changes no rule and refuses every live call's reply. A call made before a rebuild whose install comes
 *   after it is refused: its list may predate the change (`mark`).
 * - **Start-up.** Every session rule found is removed before any install or rebuild runs (`ready`); a failed clear is
 *   retried by the next install or rebuild, and covered calls are refused meanwhile.
 * - **Fails closed.** A rejected install, a list past the caps (summed over the live calls) or an unsynced keeper
 *   refuses the call with `stateUnreadableRefusal()` before its effect; a rejected rebuild leaves Chrome's previous
 *   rules in force (the update is atomic, Stage0.md §4), refuses every live call's reply and every new covered call
 *   until a rebuild succeeds. Chrome's rejection text is dropped: no refusal carries it.
 * - **Order at the post-check.** The caller awaits `release()` before it reads `refusal()`: a rebuild queued but not yet
 *   run has not set the refusal, and `release` settles only after it (S2 verifier V1).
 * - **Disarm** never lifts a live call's rules (#296, F8); `sweep()` removes only rules no live call owns (a release
 *   whose removal was rejected). Every later update the keeper sends (install, release, rebuild, sweep) retries those
 *   too, in the same atomic update.
 * - An empty list (the default) makes no API call (F15).
 * - **S3a (#301).** After a rejected rebuild, once no covered call is live (the last release, or the next install),
 *   the keeper retries the start-up clear and is synced again if it succeeds. Each DNR call is bounded
 *   (`timeoutMs`, 5 s by default); past it the call counts as rejected. A timed-out install's ids are kept as orphans
 *   (Chrome may still apply it), removed by the next update; a timed-out rebuild's new ids join each live call's own,
 *   removed at that call's release.
 */
import { countRules, fitsCaps, rulesOf, type DnrCaps, type DnrCounts, type DnrRule, type DnrScope } from "./safety-dnr.js";
import { methodClass, refusalError, stateUnreadableRefusal, type SafetyRefusal } from "./safety.js";
import type { BlockList } from "./safety-match.js";

/** The subset of `updateSessionRules`' argument the keeper sends. */
export interface DnrUpdate {
  removeRuleIds?: number[];
  addRules?: DnrRule[];
}

export interface DnrKeeperDeps {
  /** `declarativeNetRequest.updateSessionRules`: atomic; rejects on an invalid rule, a duplicate id or a cap. */
  updateSessionRules(update: DnrUpdate): Promise<void>;
  /** `declarativeNetRequest.getSessionRules`. */
  getSessionRules(): Promise<ReadonlyArray<{ id: number }>>;
  /** `MAX_NUMBER_OF_SESSION_RULES` / `MAX_NUMBER_OF_REGEX_RULES`, read at run time. */
  caps(): DnrCaps;
  /** `chrome.runtime.id`: the download rules' initiator. */
  extensionId: string;
  /** The bound on each DNR call, in ms (default `DNR_TIMEOUT_MS`). */
  timeoutMs?: number;
}

export const DNR_TIMEOUT_MS = 5_000;

/** A DNR call past its bound: it may still apply later. */
class DnrTimeout extends Error {}

/** Which rule scope a call needs, or null: it installs nothing. Keyed on the method class (F7), plus back/forward (#296). */
export function dnrScopeOf(method: string, params: Record<string, unknown>, extensionId: string): DnrScope | null {
  const cls = methodClass(method);
  if (cls === "downloadStart") return { kind: "download", extensionId };
  if (cls !== "navigate" && method !== "back" && method !== "forward") return null;
  const t = params.tabId;
  return typeof t === "number" && Number.isSafeInteger(t) && t >= 0 ? { kind: "tab", tabId: t } : null;
}

/** One call's handle. Every method is safe on an uncovered call (it does nothing). */
export interface DnrCall {
  /** Re-reads the keeper's epoch: call right before the gate read whose list `install` will take (optional). */
  mark(): void;
  /** Installs the call's rules once; later calls return the first one's outcome. Throws the state-unreadable refusal. */
  install(list: BlockList): Promise<void>;
  /**
   * The refusal that must replace the call's reply (a rebuild failed or the state became unreadable), or null. Read
   * it only after `await release()`: a rebuild already queued sets it when it runs, and `release` queues behind it.
   */
  refusal(): SafetyRefusal | null;
  /**
   * Removes the call's rules and any orphans (a timed-out add's ids, the refused call's own included); once; never
   * rejects. Settles after every rebuild queued before it: await it first.
   */
  release(): Promise<void>;
  /** True while the call's rules are in force (installed, non-empty, not released): `back`/`forward` wait on it. */
  holding(): boolean;
}

interface Live {
  scope: DnrScope;
  ids: number[];
  counts: DnrCounts;
}

const NONE: DnrCounts = { rules: 0, regexRules: 0 };
const MAX_ID = 2 ** 31 - 1;

export class DnrKeeper {
  private tail: Promise<void> = Promise.resolve();
  private started: Promise<void> | null = null;
  private cleared = false;
  private rebuildFailed = false;
  private nextId = 1;
  private epochNo = 0;
  private readonly live = new Map<Handle, Live>();
  /** Ids whose removal was rejected: no live call owns them. */
  private orphans: number[] = [];
  private orphanCounts: DnrCounts = NONE;

  constructor(private readonly deps: DnrKeeperDeps) {}

  /** The start-up clear, run once; never rejects. Every install and rebuild runs after it. */
  get ready(): Promise<void> {
    if (!this.started) this.started = this.enqueue(() => this.clear());
    return this.started;
  }

  /** Bumped by every `rebuild`. */
  get epoch(): number {
    return this.epochNo;
  }

  /** False after a failed clear or a failed rebuild, until one succeeds: covered calls are refused. */
  get synced(): boolean {
    return this.cleared && !this.rebuildFailed;
  }

  /** The call's handle; with `only`, a call of another scope gets an inert one (S3a wires the tab half only). */
  call(method: string, params: Record<string, unknown>, only?: DnrScope["kind"]): DnrCall {
    const scope = dnrScopeOf(method, params, this.deps.extensionId);
    return new Handle(this, only !== undefined && scope?.kind !== only ? null : scope);
  }

  /** The block list changed (`null`: the state cannot be read). Never rejects. */
  rebuild(list: BlockList | null): Promise<void> {
    this.epochNo++;
    void this.ready;
    return this.enqueue(async () => {
      if (list === null) return this.refuseLive();
      if (!this.cleared) await this.clear();
      if (!this.cleared) return this.refuseLive();
      const entries = [...this.live.entries()];
      const next = entries.map(([, l]) => ({ scope: l.scope, counts: countRules(list) }));
      const removeRuleIds = [...entries.flatMap(([, l]) => l.ids), ...this.orphans];
      const addRules: DnrRule[] = [];
      const ids: number[][] = [];
      try {
        if (!fitsCaps(next.map((n) => n.counts), this.deps.caps())) throw new Error("caps");
        for (const n of next) {
          const base = this.take(n.counts.rules);
          const rules = n.counts.rules === 0 ? [] : rulesOf(list, n.scope, base);
          ids.push(rules.map((r) => r.id));
          addRules.push(...rules);
        }
        if (removeRuleIds.length > 0 || addRules.length > 0) await this.update(removeRuleIds, addRules);
      } catch (e) {
        // S3a fixer 2 (V2-M1): a timed-out rebuild may land late, leaving only its new ids on the live calls' tabs, so
        // each call keeps its new ids beside its old ones (counts summed) and they leave only at its own release
        if (e instanceof DnrTimeout) {
          entries.forEach(([h, l], i) =>
            this.live.set(h, { scope: l.scope, ids: [...l.ids, ...ids[i]], counts: sum([l.counts, next[i].counts]) }),
          );
        }
        this.rebuildFailed = true;
        return this.refuseLive();
      }
      this.dropOrphans();
      entries.forEach(([h], i) => this.live.set(h, { scope: next[i].scope, ids: ids[i], counts: next[i].counts }));
      this.rebuildFailed = false;
    });
  }

  /** At a disarm: removes only rules no live call owns. Never rejects; no API call when there are none. */
  sweep(): Promise<void> {
    return this.enqueue(async () => {
      if (this.orphans.length === 0) return;
      try {
        await this.update(this.orphans, []);
        this.dropOrphans();
      } catch {
        // kept: the next update retries them
      }
    });
  }

  /** @internal */
  installFor(h: Handle, scope: DnrScope, list: BlockList, mark: number): Promise<void> {
    if (mark !== this.epochNo) return Promise.reject(refused());
    void this.ready;
    return this.enqueue(async () => {
      if (h.released) throw refused(); // released before its install ran: nothing goes in
      if (!this.cleared) await this.clear();
      await this.resyncIfIdle();
      if (!this.synced) throw refused();
      const counts = countRules(list);
      if (counts.rules === 0) {
        this.live.set(h, { scope, ids: [], counts });
        return;
      }
      let rules: DnrRule[] = [];
      try {
        if (!fitsCaps([...this.liveCounts(), this.orphanCounts, counts], this.deps.caps())) throw new Error("caps");
        rules = rulesOf(list, scope, this.take(counts.rules));
        await this.update([...this.orphans], rules); // retries the orphans in the same atomic update
      } catch (e) {
        if (e instanceof DnrTimeout) this.addOrphans(rules.map((r) => r.id), counts);
        throw refused();
      }
      this.dropOrphans();
      this.live.set(h, { scope, ids: rules.map((r) => r.id), counts });
    });
  }

  /** @internal */
  releaseFor(h: Handle): Promise<void> {
    return this.enqueue(async () => {
      const l = this.live.get(h);
      this.live.delete(h);
      const ids = l?.ids ?? [];
      // S3a fixer M1: the orphans too, even when the call holds none (its own add may have timed out and landed late)
      if (ids.length > 0 || this.orphans.length > 0) {
        try {
          await this.update([...ids, ...this.orphans], []);
          this.dropOrphans();
        } catch {
          this.addOrphans(ids, l?.counts ?? NONE);
        }
      }
      await this.resyncIfIdle();
    });
  }

  /** @internal */
  holdsFor(h: Handle): boolean {
    return (this.live.get(h)?.ids.length ?? 0) > 0;
  }

  /** #301 (a): after a rejected rebuild with no covered call live, a clear that succeeds is the rebuild that succeeds. */
  private async resyncIfIdle(): Promise<void> {
    if (!this.rebuildFailed || this.live.size > 0) return;
    await this.clear();
    if (this.cleared) this.rebuildFailed = false;
  }

  private addOrphans(ids: number[], c: DnrCounts): void {
    if (ids.length === 0) return;
    this.orphans.push(...ids);
    this.orphanCounts = { rules: this.orphanCounts.rules + c.rules, regexRules: this.orphanCounts.regexRules + c.regexRules };
  }

  private async clear(): Promise<void> {
    try {
      const ids = (await this.bounded(this.deps.getSessionRules())).map((r) => r.id);
      if (ids.length > 0) await this.bounded(this.deps.updateSessionRules({ removeRuleIds: ids }));
      this.cleared = true; // orphans stay listed: a timed-out add may still land after this read (#301 (b))
    } catch {
      this.cleared = false;
    }
  }

  private refuseLive(): void {
    for (const h of this.live.keys()) h.refused = true;
  }

  private liveCounts(): DnrCounts[] {
    return [...this.live.values()].map((l) => l.counts);
  }

  private dropOrphans(): void {
    this.orphans = [];
    this.orphanCounts = NONE;
  }

  /** The base of `n` fresh ids. Past the id space, throws (the caller fails closed). */
  private take(n: number): number {
    const base = this.nextId;
    if (base + n > MAX_ID) throw new Error("ids");
    this.nextId += n;
    return base;
  }

  private update(removeRuleIds: number[], addRules: DnrRule[]): Promise<void> {
    const u: DnrUpdate = {};
    if (removeRuleIds.length > 0) u.removeRuleIds = removeRuleIds;
    if (addRules.length > 0) u.addRules = addRules;
    return this.bounded(this.deps.updateSessionRules(u));
  }

  /** Rejects with `DnrTimeout` past the bound (#301 (b)); the late outcome is dropped. */
  private bounded<T>(p: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bound = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new DnrTimeout()), this.deps.timeoutMs ?? DNR_TIMEOUT_MS);
    });
    p.catch(() => {});
    return Promise.race([p, bound]).finally(() => clearTimeout(timer));
  }

  /** Runs `op` after every earlier one; one failure never stops the chain. */
  private enqueue(op: () => Promise<void>): Promise<void> {
    const run = this.tail.then(op);
    this.tail = run.catch(() => {});
    return run;
  }
}

function sum(cs: DnrCounts[]): DnrCounts {
  return cs.reduce((a, c) => ({ rules: a.rules + c.rules, regexRules: a.regexRules + c.regexRules }), NONE);
}

/** The fail-closed refusal (#292): the existing state-unreadable one; never Chrome's text. */
function refused(): Error {
  return refusalError(stateUnreadableRefusal());
}

class Handle implements DnrCall {
  released = false;
  refused = false;
  private installing: Promise<void> | null = null;
  private markNo: number;

  constructor(
    private readonly keeper: DnrKeeper,
    private readonly scope: DnrScope | null,
  ) {
    this.markNo = keeper.epoch;
  }

  mark(): void {
    if (!this.installing) this.markNo = this.keeper.epoch;
  }

  install(list: BlockList): Promise<void> {
    if (!this.scope) return Promise.resolve();
    if (!this.installing) this.installing = this.keeper.installFor(this, this.scope, list, this.markNo);
    return this.installing;
  }

  refusal(): SafetyRefusal | null {
    return this.refused ? stateUnreadableRefusal() : null;
  }

  release(): Promise<void> {
    if (!this.scope || this.released) return Promise.resolve();
    this.released = true;
    return this.keeper.releaseFor(this);
  }

  holding(): boolean {
    return this.scope !== null && !this.released && this.keeper.holdsFor(this);
  }
}

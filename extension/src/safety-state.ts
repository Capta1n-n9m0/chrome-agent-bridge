/**
 * Step 9 (Phase E): the human's safety state — where it is stored, how a call reads it, the in-memory copy
 * the webRequest ingest uses, the toggle the toolbar button and the shortcut call, the options page's
 * setter, and the decision to send the `safetyState` event. Pure: storage, the clock and the extension id
 * are injected, so all of it is unit-tested (`extension/test/safety-state.test.ts`); `sw.ts` wires it.
 *
 * - Stored in `chrome.storage.local` under `SAFETY_KEYS` (never `port`, `token` or the session marker, F36),
 *   so a reload or a Chrome restart never re-arms what the human disarmed. Missing keys mean the defaults:
 *   armed, JavaScript on, an empty block list (phase doc 0.2's F10 note).
 * - Every gated call reads storage itself (`read()`, after `ready`), and a read that fails, or finds a key of
 *   the wrong type, rejects, so the caller refuses (fails closed) (decisions.md · 2026-10-24 · The state is
 *   read per call, fails closed, and is locked to trusted contexts (#139)).
 * - The toggle updates the in-memory copy before it writes, and a disarm held in memory wins over a read
 *   that still says armed (the write in flight). A re-arm within 1 000 ms of the last disarm is ignored; a
 *   disarm never is (decisions.md · 2026-10-24 · A re-arm right after a disarm is ignored (#144)). A re-arm whose
 *   write is rejected puts the memory copy back to disarmed and rejects (S2c, #189; #174).
 * - Nothing here is reachable from the router: only the worker's own listeners and the options page call it.
 *
 * No log call here, and nothing that could print a pattern (phase doc 0.7).
 */
import { ErrorCodes, type SafetyState } from "@bridge/shared";
import { DISARMED_ALL_MESSAGE, type SafetyContext, type SafetyRefusal, type SafetySwitches } from "./safety.js";
import { EMPTY_BLOCK_LIST, parseBlockList, type BlockList } from "./safety-match.js";

/** The `storage.local` keys of the safety state. Written only through this module (`toStorageItems`). */
export const SAFETY_KEYS = Object.freeze({
  armed: "safety.armed",
  evaluate: "safety.evaluate",
  blockList: "safety.blockList",
} as const);

export const SAFETY_KEY_NAMES: readonly string[] = Object.freeze([SAFETY_KEYS.armed, SAFETY_KEYS.evaluate, SAFETY_KEYS.blockList]);

/** The stored state, as typed values. `blockList` is the options page's text, one pattern per line. */
export interface StoredSafety {
  armed: boolean;
  evaluate: boolean;
  blockList: string;
}

export const DEFAULT_STORED_SAFETY: Readonly<StoredSafety> = Object.freeze({ armed: true, evaluate: true, blockList: "" });

/** The kill switch's refusal (`DISARMED {scope:"all"}`), for the disarm actions (#133). */
export const DISARMED_ALL: SafetyRefusal = Object.freeze({
  code: ErrorCodes.DISARMED,
  message: DISARMED_ALL_MESSAGE,
  data: Object.freeze({ scope: "all" as const }),
});

/** A re-arm by the button or the shortcut within this long of the last disarm is ignored (#144). */
export const REARM_GUARD_MS = 1000;

/** The message of every read failure: names no key's value, so never a pattern. */
const UNREADABLE = "safety state unreadable";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * The stored state from what `storage.local.get` returned. A missing key is its default; a present key of
 * the wrong type throws (the caller fails closed).
 */
export function parseStoredSafety(raw: unknown): StoredSafety {
  if (!isRecord(raw)) throw new Error(UNREADABLE);
  const out: StoredSafety = { ...DEFAULT_STORED_SAFETY };
  const armed = raw[SAFETY_KEYS.armed];
  const evaluate = raw[SAFETY_KEYS.evaluate];
  const list = raw[SAFETY_KEYS.blockList];
  if (armed !== undefined) {
    if (typeof armed !== "boolean") throw new Error(UNREADABLE);
    out.armed = armed;
  }
  if (evaluate !== undefined) {
    if (typeof evaluate !== "boolean") throw new Error(UNREADABLE);
    out.evaluate = evaluate;
  }
  if (list !== undefined) {
    if (typeof list !== "string") throw new Error(UNREADABLE);
    out.blockList = list;
  }
  return out;
}

/** A partial change as `storage.local` items. The only place the key names are mapped. */
export function toStorageItems(change: Partial<StoredSafety>): Record<string, unknown> {
  const items: Record<string, unknown> = {};
  if (change.armed !== undefined) items[SAFETY_KEYS.armed] = change.armed;
  if (change.evaluate !== undefined) items[SAFETY_KEYS.evaluate] = change.evaluate;
  if (change.blockList !== undefined) items[SAFETY_KEYS.blockList] = change.blockList;
  return items;
}

/**
 * The options page's setter (S2b): writes at once, never debounced (#144: the options page's switch is a
 * deliberate control). `set` is `chrome.storage.local.set`. The worker learns the change through
 * `storage.onChanged` and reads storage on every call anyway.
 */
export async function writeSafety(set: (items: Record<string, unknown>) => Promise<void>, change: Partial<StoredSafety>): Promise<void> {
  await set(toStorageItems(change));
}

/**
 * The stored `armed` switch, read for the badge (S2b verifier F5), asking `storage.local` for the safety keys
 * only — never the whole area, which holds the token too (S2c, #183). `get` is `chrome.storage.local.get`. A
 * wrong-typed value throws (the caller treats it as unknown).
 */
export async function readStoredArmed(get: (keys: readonly string[]) => Promise<Record<string, unknown>>): Promise<boolean> {
  return parseStoredSafety(await get(SAFETY_KEY_NAMES)).armed;
}

/** True when a `storage.onChanged` batch touches a safety key. */
export function touchesSafety(changes: Record<string, unknown>): boolean {
  return SAFETY_KEY_NAMES.some((k) => Object.prototype.hasOwnProperty.call(changes, k));
}

/** What the gate needs from the state: the two switches, the context (own id + parsed list), the count. */
export interface SafetyView {
  switches: SafetySwitches;
  ctx: SafetyContext;
  /** Valid patterns only (F23). */
  blockedCount: number;
}

/** The reported state (#132): never the patterns. */
export function reportOf(view: SafetyView): SafetyState {
  return { armed: view.switches.armed, evaluate: view.switches.evaluate, blockedCount: view.blockedCount };
}

/** The view used when the state cannot be read: disarmed, JavaScript off, no pattern (fail closed). */
export function failClosedView(extensionId: string): SafetyView {
  return { switches: { armed: false, evaluate: false }, ctx: { extensionId, blockList: EMPTY_BLOCK_LIST }, blockedCount: 0 };
}

/** The in-memory copy: a stored state, or `unreadable` (a wrong-typed value arrived). */
export type MemoryState = (StoredSafety & { unreadable?: false }) | { unreadable: true };

/**
 * What a toggle did. `"write-failed"` (S2a fixer r1, verifier finding 4): a disarm whose `storage.local`
 * write failed twice (one retry). The memory copy stays disarmed — every call is refused and the ingest drops
 * for this worker's lifetime — but storage still holds the old value, so a worker restart would read it back.
 * The caller (S2b's button/shortcut) must show it: the badge stays OFF and says the switch was not saved.
 */
export type ToggleOutcome = "disarmed" | "armed" | "ignored" | "write-failed";

export interface SafetyStoreDeps {
  /** `chrome.storage.local.get(keys)`. */
  get(keys: readonly string[]): Promise<Record<string, unknown>>;
  /** `chrome.storage.local.set(items)`. */
  set(items: Record<string, unknown>): Promise<void>;
  /** `chrome.runtime.id`. */
  extensionId: string;
  now(): number;
  /** Runs synchronously on every transition of the memory copy to disarmed (detach, clear downloads). */
  onDisarm?(): void;
  /** Runs synchronously on every transition of the memory copy from disarmed to armed. */
  onArm?(): void;
}

/**
 * The worker's handle on the state. `start()` loads the memory copy once (the `ready` promise every read
 * awaits); `read()` reads storage per call; `toggle()` is the button's and the shortcut's; `applyChanges()`
 * is `storage.onChanged`'s; `ingestView()` is the webRequest ingest's synchronous view.
 */
export class SafetyStore {
  private mem: MemoryState | null = null;
  private started: Promise<void> | null = null;
  private lastDisarmAt = Number.NEGATIVE_INFINITY;
  private chain: Promise<unknown> = Promise.resolve();
  private lastText: string | null = null;
  private lastList: BlockList = EMPTY_BLOCK_LIST;
  /** Counts `storage.onChanged` batches that touched `safety.armed` (S2c fixer 1: the failed arm's revert). */
  private armedChanges = 0;

  constructor(private readonly deps: SafetyStoreDeps) {}

  /** The memory copy (null before the first load). */
  get memory(): MemoryState | null {
    return this.mem;
  }

  /** Loads the memory copy once; never rejects (a failed read leaves it unknown). */
  start(): Promise<void> {
    if (!this.started) {
      this.started = this.deps
        .get(SAFETY_KEY_NAMES)
        .then((raw) => {
          if (this.mem !== null) return; // a change or a toggle got there first: it is newer
          let next: MemoryState;
          try {
            next = parseStoredSafety(raw);
          } catch {
            next = { unreadable: true };
          }
          this.apply(next, "load");
        })
        .catch(() => {});
    }
    return this.started;
  }

  /** The `ready` promise: the first load. */
  get ready(): Promise<void> {
    return this.start();
  }

  /**
   * The state for one gate run: storage read now, after `ready`. Rejects when it cannot be read (the
   * caller refuses with `stateUnreadableRefusal`). A disarm held in memory wins (its write may be in flight).
   */
  async read(): Promise<SafetyView> {
    await this.start();
    const stored = parseStoredSafety(await this.deps.get(SAFETY_KEY_NAMES));
    // A failed first load is filled by the first read that succeeds (verifier finding 6), so the ingest's
    // view does not stay unknown for the worker's lifetime.
    if (this.mem === null) this.apply({ ...stored }, "load");
    const m = this.mem;
    if (m !== null && (m.unreadable === true || m.armed === false)) stored.armed = false;
    return this.viewOf(stored);
  }

  /** The webRequest ingest's view, synchronous: null until the state is first known (events are held). */
  ingestView(): SafetyView | null {
    const m = this.mem;
    if (m === null) return null;
    if (m.unreadable === true) return failClosedView(this.deps.extensionId);
    return this.viewOf(m);
  }

  /**
   * `storage.onChanged` for the local area: the new values over the memory copy (a removed key is its
   * default; a wrong-typed value makes the copy fail closed).
   */
  applyChanges(changes: Record<string, unknown>): void {
    if (!touchesSafety(changes)) return;
    if (Object.prototype.hasOwnProperty.call(changes, SAFETY_KEYS.armed)) this.armedChanges++;
    const base: StoredSafety = this.mem === null || this.mem.unreadable === true ? { ...DEFAULT_STORED_SAFETY } : { ...this.mem };
    const merged: Record<string, unknown> = {
      [SAFETY_KEYS.armed]: base.armed,
      [SAFETY_KEYS.evaluate]: base.evaluate,
      [SAFETY_KEYS.blockList]: base.blockList,
    };
    for (const k of SAFETY_KEY_NAMES) {
      if (!Object.prototype.hasOwnProperty.call(changes, k)) continue;
      const c = changes[k];
      merged[k] = isRecord(c) ? c.newValue : undefined;
    }
    let next: MemoryState;
    try {
      next = parseStoredSafety(merged);
    } catch {
      next = { unreadable: true };
    }
    this.apply(next, "change");
  }

  /**
   * The toolbar button and the shortcut: armed → disarmed at once; disarmed → armed unless the last disarm
   * was under `REARM_GUARD_MS` ago ("ignored"). The memory copy (and `onDisarm`/`onArm`) change before the
   * write. Calls are serialised. A state that cannot be read toggles toward disarmed.
   */
  toggle(): Promise<ToggleOutcome> {
    const run = this.chain.then(() => this.toggleOnce());
    this.chain = run.catch(() => {});
    return run;
  }

  private async toggleOnce(): Promise<ToggleOutcome> {
    let current: MemoryState | null = this.mem;
    if (current === null) {
      try {
        current = parseStoredSafety(await this.deps.get(SAFETY_KEY_NAMES));
      } catch {
        current = { unreadable: true };
      }
      if (this.mem === null) this.apply(current, "load");
      current = this.mem ?? current;
    }
    const armedNow = current.unreadable !== true && current.armed;
    if (armedNow) {
      this.apply({ ...(current as StoredSafety), armed: false }, "toggle");
      return this.writeDisarm();
    }
    if (current.unreadable === true) {
      // Unreadable: the safe direction is to (re)write disarmed.
      this.apply({ unreadable: true }, "toggle");
      return this.writeDisarm();
    }
    if (this.deps.now() - this.lastDisarmAt < REARM_GUARD_MS) return "ignored";
    const armedChangesAtApply = this.armedChanges;
    this.apply({ ...current, armed: true }, "toggle");
    try {
      await this.deps.set(toStorageItems({ armed: true }));
    } catch (err) {
      // S2c (#189, S2b.md §6 finding 1): a rejected arm write must not leave memory armed while storage says
      // OFF. Memory's `armed` goes back to false (fail closed; `onDisarm` fires), the other fields as they are
      // in memory now (a newer block list or JavaScript switch stands), unless a storage change that touched
      // `safety.armed` landed meanwhile (storage itself spoke about `armed`; the copy already reflects it).
      // Not by object identity: `applyChanges` merges over the copy, so a change to another key carries the
      // unsaved `armed: true` forward (S2c verifier F1). An unreadable copy stays unreadable. `lastDisarmAt` is
      // not moved: the human did not disarm, so the next press is a retry. A failed arm still rejects (#174).
      const now = this.mem;
      if (this.armedChanges === armedChangesAtApply && now !== null && now.unreadable !== true && now.armed) {
        this.apply({ ...now, armed: false }, "revert");
      }
      throw err;
    }
    return "armed";
  }

  /**
   * A disarm's write: retried once; a second failure is `"write-failed"`. The memory copy is never
   * re-armed here (verifier finding 4).
   */
  private async writeDisarm(): Promise<ToggleOutcome> {
    const items = toStorageItems({ armed: false });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.deps.set(items);
        return "disarmed";
      } catch {
        // retry once
      }
    }
    return "write-failed";
  }

  /** `"revert"`: a failed arm write undone (S2c) — a transition to disarmed that is not the human's disarm. */
  private apply(next: MemoryState, source: "load" | "change" | "toggle" | "revert"): void {
    const prev = this.mem;
    this.mem = next;
    const wasArmed = prev === null ? null : prev.unreadable !== true && prev.armed;
    const nowArmed = next.unreadable !== true && next.armed;
    if (!nowArmed && wasArmed !== false) {
      if (source !== "load" && source !== "revert") this.lastDisarmAt = this.deps.now();
      this.deps.onDisarm?.();
    } else if (nowArmed && wasArmed === false) {
      this.deps.onArm?.();
    }
  }

  private viewOf(s: StoredSafety): SafetyView {
    if (s.blockList !== this.lastText) {
      this.lastText = s.blockList;
      this.lastList = s.blockList === "" ? EMPTY_BLOCK_LIST : parseBlockList(s.blockList);
    }
    const blockList = this.lastList;
    return {
      switches: { armed: s.armed, evaluate: s.evaluate },
      ctx: { extensionId: this.deps.extensionId, blockList },
      blockedCount: blockList.blockedCount,
    };
  }
}

/** The extension → daemon frame (#132): exactly the three fields, no `id`. */
export function safetyStateFrame(state: SafetyState): string {
  return JSON.stringify({
    event: "safetyState",
    params: { armed: state.armed, evaluate: state.evaluate, blockedCount: state.blockedCount },
  });
}

/**
 * When to send `safetyState` (S3's handoff): each time the connection comes up, and on every change of any
 * of the three fields while it is up; never while it is down. `offer` returns the frame to send, or null.
 */
export class SafetyReporter {
  private up = false;
  private last: SafetyState | null = null;

  connectionUp(): void {
    this.up = true;
    this.last = null;
  }

  connectionDown(): void {
    this.up = false;
    this.last = null;
  }

  offer(state: SafetyState): string | null {
    if (!this.up) return null;
    const l = this.last;
    if (l && l.armed === state.armed && l.evaluate === state.evaluate && l.blockedCount === state.blockedCount) return null;
    this.last = { armed: state.armed, evaluate: state.evaluate, blockedCount: state.blockedCount };
    return safetyStateFrame(state);
  }
}

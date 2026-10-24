/**
 * Step 9 (Phase E): the debugger session registry (Stage 0 F6; decisions.md · 2026-10-24 · In-flight work
 * at disarm and on a newly blocked tab (#137) item 2; exit check S2.2). Pure: attach and detach are
 * injected, so the registry and `runWithDebugger` (the logic `withDebugger` in `debugger.ts` runs) are
 * unit-tested (`extension/test/safety-debugger.test.ts`).
 *
 * - Every session is recorded from before its attach until after its detach.
 * - At a disarm, `detachAll` marks every recorded session killed, detaches each, and refuses new sessions
 *   until `refuse(null)` (re-armed).
 * - `runWithDebugger` re-checks the call's gate before attaching, refuses while refused, and turns any error
 *   (or result) of a killed session into the disarm's refusal, so the agent reads `DISARMED`, not
 *   `DEBUGGER_CANCELLED` ("Detached while handling command").
 *
 * Never logs (phase doc 0.7).
 */
import { refusalError, type SafetyRefusal } from "./safety.js";

export interface DebuggerSession {
  readonly tabId: number;
  /** The refusal of the disarm that detached this session, or null. */
  killed: SafetyRefusal | null;
}

export class DebuggerSessions {
  private readonly live = new Set<DebuggerSession>();
  private refusal: SafetyRefusal | null = null;

  /** While set, `begin` throws it (the state is disarmed). Null re-allows sessions. */
  refuse(r: SafetyRefusal | null): void {
    this.refusal = r;
  }

  get refused(): SafetyRefusal | null {
    return this.refusal;
  }

  get size(): number {
    return this.live.size;
  }

  /** Records a session about to attach; throws the refusal while refused. */
  begin(tabId: number): DebuggerSession {
    if (this.refusal) throw refusalError(this.refusal);
    const s: DebuggerSession = { tabId, killed: null };
    this.live.add(s);
    return s;
  }

  end(s: DebuggerSession): void {
    this.live.delete(s);
  }

  /**
   * The disarm: refuse new sessions, mark every recorded one killed and detach each (a failing detach —
   * already detached — does not stop the others). Resolves with how many sessions were detached.
   */
  async detachAll(r: SafetyRefusal, detach: (tabId: number) => Promise<void>): Promise<number> {
    this.refusal = r;
    const all = [...this.live];
    for (const s of all) s.killed = r;
    await Promise.all(
      all.map(async (s) => {
        try {
          await detach(s.tabId);
        } catch {
          // already detached, or the tab is gone
        }
      }),
    );
    return all.length;
  }
}

export interface DebuggerRunDeps {
  attach(tabId: number): Promise<void>;
  detach(tabId: number): Promise<void>;
  sessions: DebuggerSessions;
  /** Today's mapping of a debugger failure (`describeDebuggerError`'s code and message). */
  mapError(err: unknown): Error;
}

/** The call's effect check (`HandlerSafety.effect`), run before attaching. */
export interface EffectGuard {
  effect(): Promise<void>;
}

/**
 * Attach, run, always detach — as `withDebugger` did before Step 9 (an attach failure detaches nothing) —
 * plus the registry: re-check the gate, then record the session; a session killed by a disarm ends with the
 * disarm's refusal, whatever `fn` did.
 */
export async function runWithDebugger<T>(deps: DebuggerRunDeps, tabId: number, fn: () => Promise<T>, guard?: EffectGuard): Promise<T> {
  if (deps.sessions.refused) throw refusalError(deps.sessions.refused);
  await guard?.effect();
  const s = deps.sessions.begin(tabId);
  try {
    await deps.attach(tabId);
  } catch (err) {
    deps.sessions.end(s);
    throw s.killed ? refusalError(s.killed) : deps.mapError(err);
  }
  try {
    if (s.killed) throw refusalError(s.killed); // a disarm landed while attaching
    const out = await fn();
    if (s.killed) throw refusalError(s.killed);
    return out;
  } catch (err) {
    if (s.killed) throw refusalError(s.killed);
    throw deps.mapError(err);
  } finally {
    deps.sessions.end(s);
    try {
      await deps.detach(tabId);
    } catch {
      /* already detached */
    }
  }
}

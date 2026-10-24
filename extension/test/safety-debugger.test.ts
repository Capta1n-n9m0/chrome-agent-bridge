/**
 * Step 9 S2a, exit check S2.2 (#141's wording): the debugger session registry is pure and unit-tested —
 * disarm detaches every recorded session; `withDebugger` refuses to attach while refused; a detach-caused
 * error becomes `DISARMED` (#137 item 2; Stage 0 F6). `runWithDebugger` is the logic `withDebugger` runs,
 * with attach/detach injected.
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { DebuggerSessions, runWithDebugger } from "../src/safety-debugger.js";
import { DISARMED_ALL } from "../src/safety-state.js";
import { BridgeError } from "../src/errors.js";

function fakes() {
  const log: string[] = [];
  const attached = new Set<number>();
  const deps = {
    attach: vi.fn(async (tabId: number) => {
      log.push(`attach ${tabId}`);
      attached.add(tabId);
    }),
    detach: vi.fn(async (tabId: number) => {
      log.push(`detach ${tabId}`);
      if (!attached.delete(tabId)) throw new Error("Debugger is not attached to the tab");
    }),
    sessions: new DebuggerSessions(),
    mapError: (err: unknown) => new BridgeError(ErrorCodes.DEBUGGER_CANCELLED, err instanceof Error ? err.message : String(err)),
  };
  return { log, attached, deps };
}

describe("DebuggerSessions", () => {
  it("records a session from begin to end", () => {
    const s = new DebuggerSessions();
    const a = s.begin(1);
    const b = s.begin(2);
    expect(s.size).toBe(2);
    s.end(a);
    expect(s.size).toBe(1);
    s.end(b);
    s.end(b);
    expect(s.size).toBe(0);
  });

  it("detachAll detaches every recorded session, marks each killed, and refuses new ones", async () => {
    const s = new DebuggerSessions();
    const a = s.begin(1);
    const b = s.begin(2);
    const c = s.begin(2);
    const detach = vi.fn(async () => {});
    expect(await s.detachAll(DISARMED_ALL, detach)).toBe(3);
    expect(detach.mock.calls.map((x) => x[0]).sort()).toEqual([1, 2, 2]);
    for (const x of [a, b, c]) expect(x.killed).toEqual(DISARMED_ALL);
    expect(s.refused).toEqual(DISARMED_ALL);
    expect(() => s.begin(3)).toThrow(BridgeError);
  });

  it("a failing detach (already detached) does not stop the others", async () => {
    const s = new DebuggerSessions();
    s.begin(1);
    s.begin(2);
    const detach = vi.fn(async (id: number) => {
      if (id === 1) throw new Error("not attached");
    });
    await s.detachAll(DISARMED_ALL, detach);
    expect(detach).toHaveBeenCalledTimes(2);
  });

  it("refuse(null) lets sessions begin again (re-armed)", async () => {
    const s = new DebuggerSessions();
    await s.detachAll(DISARMED_ALL, async () => {});
    s.refuse(null);
    expect(() => s.begin(1)).not.toThrow();
  });

  it("begin while refused throws the refusal as a BridgeError with its code and data", () => {
    const s = new DebuggerSessions();
    s.refuse(DISARMED_ALL);
    try {
      s.begin(1);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeError);
      expect(err).toMatchObject({ code: ErrorCodes.DISARMED, data: { scope: "all" } });
    }
  });
});

describe("runWithDebugger", () => {
  it("armed: attach → fn → detach, the result returned, the session recorded only meanwhile", async () => {
    const f = fakes();
    let during = -1;
    const out = await runWithDebugger(f.deps, 7, async () => {
      during = f.deps.sessions.size;
      return 42;
    });
    expect(out).toBe(42);
    expect(during).toBe(1);
    expect(f.deps.sessions.size).toBe(0);
    expect(f.log).toEqual(["attach 7", "detach 7"]);
  });

  it("refuses to attach while refused (no attach call at all)", async () => {
    const f = fakes();
    f.deps.sessions.refuse(DISARMED_ALL);
    await expect(runWithDebugger(f.deps, 7, async () => 1)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(f.deps.attach).not.toHaveBeenCalled();
  });

  it("re-checks the call's gate before attaching; a refusal there means no attach", async () => {
    const f = fakes();
    const guard = { effect: vi.fn(async () => {
      throw new BridgeError(ErrorCodes.DOMAIN_BLOCKED, "blocked");
    }) };
    await expect(runWithDebugger(f.deps, 7, async () => 1, guard)).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(guard.effect).toHaveBeenCalledTimes(1);
    expect(f.deps.attach).not.toHaveBeenCalled();
    expect(f.deps.sessions.size).toBe(0);
  });

  it("a disarm mid-session: the session is detached and its error becomes DISARMED (not DEBUGGER_CANCELLED)", async () => {
    const f = fakes();
    const p = runWithDebugger(f.deps, 7, async () => {
      await f.deps.sessions.detachAll(DISARMED_ALL, f.deps.detach); // the human pressed OFF
      throw new Error("Detached while handling command."); // what sendCommand then throws
    });
    const err = await p.catch((e) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED, data: { scope: "all" } });
    expect(f.log.filter((l) => l === "detach 7").length).toBeGreaterThanOrEqual(1);
    expect(f.attached.size).toBe(0);
    expect(f.deps.sessions.size).toBe(0);
  });

  it("a disarm mid-session whose fn still resolves: DISARMED, not the result", async () => {
    const f = fakes();
    const p = runWithDebugger(f.deps, 7, async () => {
      await f.deps.sessions.detachAll(DISARMED_ALL, f.deps.detach);
      return "captured pixels";
    });
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
  });

  it("a disarm while attach is in flight: the late attach is detached at once, DISARMED", async () => {
    const f = fakes();
    let finishAttach!: () => void;
    f.deps.attach.mockImplementation(async (tabId: number) => {
      await new Promise<void>((r) => (finishAttach = r));
      f.log.push(`attach ${tabId}`);
      f.attached.add(tabId);
    });
    const fn = vi.fn(async () => 1);
    const p = runWithDebugger(f.deps, 7, fn);
    await Promise.resolve();
    await f.deps.sessions.detachAll(DISARMED_ALL, async () => {}); // nothing attached yet
    finishAttach();
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(fn).not.toHaveBeenCalled();
    expect(f.attached.size).toBe(0); // detached in the finally
  });

  it("an ordinary failure keeps today's mapping (mapError), unchanged", async () => {
    const f = fakes();
    const err = await runWithDebugger(f.deps, 7, async () => {
      throw new Error("Detached while handling command.");
    }).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DEBUGGER_CANCELLED });
  });

  it("an attach failure is mapped and nothing is detached (today's sequence)", async () => {
    const f = fakes();
    f.deps.attach.mockImplementation(async () => {
      throw new Error("Another debugger is already attached to the tab");
    });
    await expect(runWithDebugger(f.deps, 7, async () => 1)).rejects.toMatchObject({ code: ErrorCodes.DEBUGGER_CANCELLED });
    expect(f.deps.detach).not.toHaveBeenCalled();
    expect(f.deps.sessions.size).toBe(0);
  });

  it("a session begun after a re-arm is not affected by the earlier disarm", async () => {
    const f = fakes();
    await f.deps.sessions.detachAll(DISARMED_ALL, async () => {});
    f.deps.sessions.refuse(null);
    await expect(runWithDebugger(f.deps, 7, async () => "ok")).resolves.toBe("ok");
  });
});

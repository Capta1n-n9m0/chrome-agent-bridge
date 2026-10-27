/**
 * Step 12 S4a (phase doc 0.6 and § S4; decisions.md #324 as amended by #335; exit checks D4.1–D4.3, D4.2 as extended
 * in stage0-audit.md §5): the kept debugger session, pure. A fake Chrome counts attaches and detaches and answers as
 * Chrome 156 does (m2 D5: a second attach on an attached tab throws "Another debugger is already attached…"); a fake
 * clock drives the idle bound.
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { DebuggerKeeper, KEEPER_DETACH_WAIT_MS, KEEPER_IDLE_MS, type KeeperDeps } from "../src/debugger-keeper.js";
import { DebuggerSessions } from "../src/safety-debugger.js";
import { DISARMED_ALL } from "../src/safety-state.js";
import { describeDebuggerError } from "../src/debugger-errors.js";
import { refusalError, type SafetyRefusal } from "../src/safety.js";
import { BridgeError } from "../src/errors.js";

const BLOCKED: SafetyRefusal = { code: ErrorCodes.DOMAIN_BLOCKED, message: "blocked (test)" };
const JS_OFF: SafetyRefusal = { code: ErrorCodes.JS_DISABLED, message: "js off (test)" };

/** Today's mapping (`withDebugger`'s `mapError`). */
const mapError = (err: unknown): Error => {
  const d = describeDebuggerError(err, "Test");
  return new BridgeError(d.code, d.message, d.data);
};

function fakeClock() {
  let now = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let next = 1;
  return {
    timers: {
      set: (fn: () => void, ms: number) => {
        const id = next++;
        timers.set(id, { at: now + ms, fn });
        return id;
      },
      clear: (h: unknown) => void timers.delete(h as number),
    },
    async advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
        await flush();
      }
      now = end;
      await flush();
    },
    pending: () => timers.size,
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function setup(over: Partial<KeeperDeps> = {}) {
  const attached = new Set<number>();
  const clock = fakeClock();
  const sessions = new DebuggerSessions();
  let check: (tabId: number) => Promise<SafetyRefusal | null> = async () => null;
  const deps: KeeperDeps = {
    attach: vi.fn(async (tabId: number) => {
      if (attached.has(tabId)) throw new Error(`Another debugger is already attached to the tab with id: ${tabId}.`);
      attached.add(tabId);
    }),
    detach: vi.fn(async (tabId: number) => {
      if (!attached.delete(tabId)) throw new Error(`Debugger is not attached to the tab with id: ${tabId}.`);
    }),
    getTargets: vi.fn(async () => []),
    timers: clock.timers,
    sessions,
    tabCheck: (tabId: number) => check(tabId),
    ...over,
  };
  const keeper = new DebuggerKeeper(deps);
  const guard = { effect: vi.fn(async () => {}) };
  const ok = (tabId: number, v: unknown = "ok") => keeper.use(tabId, async () => v, { guard, mapError });
  return {
    attached,
    clock,
    sessions,
    deps,
    keeper,
    guard,
    ok,
    attaches: () => (deps.attach as ReturnType<typeof vi.fn>).mock.calls.length,
    detaches: () => (deps.detach as ReturnType<typeof vi.fn>).mock.calls.length,
    setCheck: (f: (tabId: number) => Promise<SafetyRefusal | null>) => (check = f),
  };
}

/** A use that runs until `release()` is called. */
function held(t: ReturnType<typeof setup>, tabId: number) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const p = t.keeper.use(tabId, async () => {
    await gate;
    return "held";
  }, { guard: t.guard, mapError });
  p.catch(() => {});
  return { p, release };
}

describe("D4.1 — one attach for N sequential uses; idle detach at the bound", () => {
  it("five non-overlapping uses attach once and never map the keeper's own attachment to DEBUGGER_DEVTOOLS", async () => {
    const t = setup();
    for (let i = 0; i < 5; i++) expect(await t.ok(7, i)).toBe(i);
    expect(t.attaches()).toBe(1);
    expect(t.detaches()).toBe(0);
    expect(t.keeper.state(7)).toBe("idle");
  });

  it("detaches exactly at KEEPER_IDLE_MS (5 s) after the last use ends, not before", async () => {
    expect(KEEPER_IDLE_MS).toBe(5000);
    const t = setup();
    await t.ok(7);
    await t.clock.advance(4999);
    expect(t.detaches()).toBe(0);
    expect(t.keeper.state(7)).toBe("idle");
    await t.clock.advance(1);
    expect(t.detaches()).toBe(1);
    expect(t.attached.has(7)).toBe(false);
    expect(t.keeper.state(7)).toBe("none");
  });

  it("a use inside the bound restarts it", async () => {
    const t = setup();
    await t.ok(7);
    await t.clock.advance(4000);
    await t.ok(7);
    await t.clock.advance(4999);
    expect(t.detaches()).toBe(0);
    await t.clock.advance(1);
    expect(t.detaches()).toBe(1);
    expect(t.attaches()).toBe(1);
  });

  it("no idle timer runs while a use is in flight", async () => {
    const t = setup();
    const h = held(t, 7);
    await flush();
    await t.clock.advance(60_000);
    expect(t.detaches()).toBe(0);
    h.release();
    expect(await h.p).toBe("held");
    expect(t.clock.pending()).toBe(1);
  });

  it("a use after the idle detach attaches again", async () => {
    const t = setup();
    await t.ok(7);
    await t.clock.advance(KEEPER_IDLE_MS);
    expect(await t.ok(7, "again")).toBe("again");
    expect(t.attaches()).toBe(2);
  });

  it("each tab has its own session", async () => {
    const t = setup();
    await t.ok(1);
    await t.ok(2);
    await t.ok(1);
    expect(t.attaches()).toBe(2);
    expect(t.keeper.size).toBe(2);
  });
});

describe("the overlap rule (#335): a use overlapping one in flight answers as today", () => {
  it("answers DEBUGGER_DEVTOOLS with no second attach; the first use completes", async () => {
    const t = setup();
    const h = held(t, 7);
    await flush();
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.DEBUGGER_DEVTOOLS });
    expect(t.attaches()).toBe(1);
    h.release();
    expect(await h.p).toBe("held");
    expect(t.keeper.state(7)).toBe("idle");
  });

  it("also while the first use is still attaching", async () => {
    let finish!: () => void;
    const t = setup({ attach: vi.fn(() => new Promise<void>((r) => (finish = r))) });
    const first = t.ok(7, "first");
    await flush();
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.DEBUGGER_DEVTOOLS });
    finish();
    expect(await first).toBe("first");
    expect(t.attaches()).toBe(1);
  });
});

describe("registration (F3): kept sessions are in the registry, idle or busy", () => {
  it("an idle kept session counts in DebuggerSessions until it detaches", async () => {
    const t = setup();
    await t.ok(7);
    expect(t.sessions.size).toBe(1);
    await t.clock.advance(KEEPER_IDLE_MS);
    expect(t.sessions.size).toBe(0);
  });
});

describe("D4.2 — each detach trigger", () => {
  it("disarm: detachAll detaches an idle kept session; the next use is refused with no attach; after re-arm it attaches again", async () => {
    const t = setup();
    await t.ok(7);
    expect(await t.sessions.detachAll(DISARMED_ALL, t.deps.detach)).toBe(1);
    expect(t.attached.has(7)).toBe(false);
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(t.attaches()).toBe(1);
    t.sessions.refuse(null);
    expect(await t.ok(7, "rearmed")).toBe("rearmed");
    expect(t.attaches()).toBe(2);
    expect(t.attached.has(7)).toBe(true);
  });

  it("disarm during a use: that use ends DISARMED, whatever it returned", async () => {
    const t = setup();
    const h = held(t, 7);
    await flush();
    await t.sessions.detachAll(DISARMED_ALL, t.deps.detach);
    h.release();
    await expect(h.p).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(t.keeper.state(7)).toBe("none");
    expect(t.clock.pending()).toBe(0);
  });

  it.each([
    ["blocked", BLOCKED],
    ["own extension page", { code: ErrorCodes.DOMAIN_BLOCKED, message: "own page (test)" } as SafetyRefusal],
    ["file: page", { code: ErrorCodes.DOMAIN_BLOCKED, message: "file page (test)" } as SafetyRefusal],
  ])("the tab's page becomes %s (recheckTab, from tabs.onUpdated): detach", async (_name, refusal) => {
    const t = setup();
    await t.ok(7);
    t.setCheck(async () => refusal);
    await t.keeper.recheckTab(7);
    expect(t.attached.has(7)).toBe(false);
    expect(t.keeper.state(7)).toBe("none");
    expect(t.sessions.size).toBe(0);
  });

  it("a block-list change (recheckAll, from storage.onChanged) detaches only the kept tabs it blocks", async () => {
    const t = setup();
    await t.ok(1);
    await t.ok(2);
    t.setCheck(async (id) => (id === 2 ? BLOCKED : null));
    await t.keeper.recheckAll();
    expect([...t.attached]).toEqual([1]);
    expect(t.keeper.state(1)).toBe("idle");
    expect(t.keeper.state(2)).toBe("none");
  });

  it("a block-list change that blocks a tab mid-use ends that use with the refusal", async () => {
    const t = setup();
    const h = held(t, 7);
    await flush();
    t.setCheck(async () => BLOCKED);
    await t.keeper.recheckAll();
    expect(t.attached.has(7)).toBe(false);
    h.release();
    await expect(h.p).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("a tab check that fails (state unreadable) detaches: fail closed", async () => {
    const t = setup();
    await t.ok(7);
    t.setCheck(async () => {
      throw new Error("storage read failed");
    });
    await t.keeper.recheckAll();
    expect(t.attached.has(7)).toBe(false);
  });

  it("a recheck of a tab the keeper does not hold does nothing", async () => {
    const t = setup();
    const tabCheck = vi.fn(async () => BLOCKED);
    t.setCheck(tabCheck);
    await t.keeper.recheckTab(9);
    await t.keeper.recheckAll();
    expect(tabCheck).not.toHaveBeenCalled();
    expect(t.detaches()).toBe(0);
  });

  it.each([["close (tabs.onRemoved)"], ["replace (tabs.onReplaced, the removed id)"]])("%s: the session is dropped; a failing detach is ignored", async () => {
    const t = setup();
    await t.ok(7);
    t.attached.delete(7); // Chrome already ended it with the tab
    await t.keeper.tabGone(7);
    expect(t.detaches()).toBe(1);
    expect(t.keeper.state(7)).toBe("none");
    expect(t.sessions.size).toBe(0);
    expect(t.clock.pending()).toBe(0);
  });

  it.each([["canceled_by_user"], ["target_closed"], ["replaced_with_devtools"]])(
    "onDetach %s: the session is forgotten without a detach; the next use attaches again",
    async (reason) => {
      const t = setup();
      await t.ok(7);
      t.attached.delete(7); // Chrome ended it
      t.keeper.onDetach(7, reason);
      expect(t.keeper.state(7)).toBe("none");
      expect(t.sessions.size).toBe(0);
      expect(t.detaches()).toBe(0);
      expect(await t.ok(7, "next")).toBe("next");
      expect(t.attaches()).toBe(2);
    },
  );

  it("onDetach mid-use: the use's own failure reads as today (DEBUGGER_CANCELLED); nothing is detached after it", async () => {
    const t = setup();
    let fail!: (e: Error) => void;
    const p = t.keeper.use(7, () => new Promise((_, rej) => (fail = rej)), { guard: t.guard, mapError });
    await flush();
    t.attached.delete(7);
    t.keeper.onDetach(7, "canceled_by_user");
    fail(new Error("Detached while handling command."));
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.DEBUGGER_CANCELLED });
    expect(t.detaches()).toBe(0);
    expect(t.keeper.state(7)).toBe("none");
  });

  it("a call timeout (any error of the use) drops the session; the next use attaches again", async () => {
    const t = setup();
    await t.ok(7);
    const timedOut = t.keeper.use(7, async () => {
      throw new BridgeError(ErrorCodes.TIMEOUT, "Timed out after 1s");
    }, { guard: t.guard, mapError });
    await expect(timedOut).rejects.toMatchObject({ code: ErrorCodes.TIMEOUT });
    expect(t.attached.has(7)).toBe(false);
    expect(t.detaches()).toBe(1);
    await t.ok(7);
    expect(t.attaches()).toBe(2);
  });

  it("a failed clean-up (use.drop()) detaches when the use ends; its result stands", async () => {
    const t = setup();
    const out = await t.keeper.use(7, async (u) => {
      u.drop();
      return 42;
    }, { guard: t.guard, mapError });
    expect(out).toBe(42);
    expect(t.attached.has(7)).toBe(false);
    expect(t.keeper.state(7)).toBe("none");
  });

  it("a release waits out: a use right after a detach starts waits for it instead of reading DEBUGGER_DEVTOOLS", async () => {
    let finishDetach!: () => void;
    const t = setup();
    const realDetach = t.deps.detach;
    t.deps.detach = vi.fn((id: number) => new Promise<void>((r) => (finishDetach = () => void realDetach(id).then(r))));
    await t.ok(7);
    t.setCheck(async () => BLOCKED);
    const rechecking = t.keeper.recheckTab(7);
    await flush();
    t.setCheck(async () => null);
    const next = t.ok(7, "after");
    await flush();
    finishDetach();
    await rechecking;
    expect(await next).toBe("after");
    expect(t.attaches()).toBe(2);
  });

  it("an attach failure records no session and maps as today; the next use attaches again", async () => {
    let fail = true;
    const t = setup();
    const real = t.deps.attach;
    t.deps.attach = vi.fn(async (id: number) => {
      if (fail) throw new Error("Cannot attach to this target.");
      return real(id);
    });
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.RESTRICTED_URL });
    expect(t.sessions.size).toBe(0);
    expect(t.keeper.state(7)).toBe("none");
    fail = false;
    expect(await t.ok(7, "ok2")).toBe("ok2");
  });
});

describe("the start-up sweep (m2 D4c; #335)", () => {
  it("detaches every attached tab target (targets carry no extensionId), ignores 'not attached', skips the rest", async () => {
    const t = setup({
      getTargets: vi.fn(async () => [
        { type: "page", tabId: 3, attached: true },
        { type: "page", tabId: 4, attached: false },
        { type: "page", tabId: 5, attached: true },
        { type: "background_page", attached: true },
        { type: "page", tabId: 6, attached: true },
      ]),
    });
    t.attached.add(3);
    t.attached.add(5); // 6 reads attached but is gone by the time we detach: "not attached", ignored
    expect(await t.keeper.sweep()).toBe(2);
    expect((t.deps.detach as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).sort()).toEqual([3, 5, 6]);
    expect(t.attached.size).toBe(0);
  });

  it("a use waits for the sweep, so an orphan from the old worker never reads as DEBUGGER_DEVTOOLS", async () => {
    let answer!: (v: { type: string; tabId: number; attached: boolean }[]) => void;
    const t = setup({ getTargets: vi.fn(() => new Promise((r) => (answer = r))) });
    t.attached.add(7); // the old worker's session, still attached
    const sweeping = t.keeper.sweep();
    const p = t.ok(7, "fresh");
    await flush();
    expect(t.attaches()).toBe(0);
    answer([{ type: "page", tabId: 7, attached: true }]);
    await sweeping;
    expect(await p).toBe("fresh");
    expect(t.attaches()).toBe(1);
  });

  it("a failing getTargets ends the sweep at 0 and lets uses run", async () => {
    const t = setup({ getTargets: vi.fn(async () => Promise.reject(new Error("no"))) });
    expect(await t.keeper.sweep()).toBe(0);
    expect(await t.ok(7)).toBe("ok");
  });
});

describe("D4.3 — the gate re-check before every use", () => {
  it("the guard runs once per use, before the use's work, including on a reused session", async () => {
    const t = setup();
    const order: string[] = [];
    t.guard.effect.mockImplementation(async () => void order.push("check"));
    for (let i = 0; i < 3; i++) await t.keeper.use(7, async () => void order.push("use"), { guard: t.guard, mapError });
    expect(order).toEqual(["check", "use", "check", "use", "check", "use"]);
    expect(t.attaches()).toBe(1);
  });

  it("a refusing re-check on a kept session: no use, and a blocked tab's session is detached", async () => {
    const t = setup();
    await t.ok(7);
    t.guard.effect.mockRejectedValueOnce(refusalError(BLOCKED));
    const fn = vi.fn(async () => "ran");
    await expect(t.keeper.use(7, fn, { guard: t.guard, mapError })).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(fn).not.toHaveBeenCalled();
    expect(t.attached.has(7)).toBe(false);
    expect(t.keeper.state(7)).toBe("none");
  });

  it("a disarmed re-check detaches; JavaScript off refuses the use but keeps the session (the tab is not blocked)", async () => {
    const t = setup();
    await t.ok(7);
    t.guard.effect.mockRejectedValueOnce(refusalError(JS_OFF));
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.JS_DISABLED });
    expect(t.keeper.state(7)).toBe("idle");
    t.guard.effect.mockRejectedValueOnce(refusalError(DISARMED_ALL));
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(t.attached.has(7)).toBe(false);
  });

  it("while the registry refuses, no guard, no attach", async () => {
    const t = setup();
    t.sessions.refuse(DISARMED_ALL);
    await expect(t.ok(7)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(t.guard.effect).not.toHaveBeenCalled();
    expect(t.attaches()).toBe(0);
  });
});

/** Chrome's attach completes only when `finish()` is called; the tab reads attached from then on. */
function deferAttach(t: ReturnType<typeof setup>) {
  let finish!: () => void;
  t.deps.attach = vi.fn((id: number) => new Promise<void>((r) => (finish = () => (t.attached.add(id), r()))));
  return () => finish();
}

/** Every attached tab reads `attached: true`, as `chrome.debugger.getTargets` does. */
const liveTargets = (t: ReturnType<typeof setup>) => vi.fn(async () => [...t.attached].map((tabId) => ({ tabId, attached: true })));

describe("S4a fixer round 1 (verifier F1, F2, F3, F5): no session is left attached outside the keeper's reach", () => {
  it("F1 P1: a disarm while the attach is pending leaves no session attached once the attach lands", async () => {
    const t = setup();
    const finish = deferAttach(t);
    const p = t.ok(7);
    p.catch(() => {});
    await flush();
    await t.sessions.detachAll(DISARMED_ALL, t.deps.detach); // Chrome: "not attached" yet, ignored
    finish();
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(t.attached.has(7)).toBe(false);
    expect(t.sessions.size).toBe(0);
  });

  it("F1 P2: a refusing recheck while the attach is pending leaves no session attached on the blocked tab", async () => {
    const t = setup();
    const finish = deferAttach(t);
    const p = t.ok(7);
    p.catch(() => {});
    await flush();
    t.setCheck(async () => BLOCKED);
    await t.keeper.recheckTab(7);
    finish();
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(t.attached.has(7)).toBe(false);
  });

  it("F1 P5: the page becomes blocked after the guard's read but before the entry exists: no idle session stays", async () => {
    const t = setup();
    t.guard.effect.mockImplementationOnce(async () => {
      t.setCheck(async () => BLOCKED); // tabs.onUpdated lands with a blocked URL; the keeper holds nothing yet
      await t.keeper.recheckTab(7);
    });
    await t.ok(7);
    expect(t.attached.has(7)).toBe(false);
    expect(t.keeper.state(7)).toBe("none");
    expect(t.sessions.size).toBe(0);
    expect(t.clock.pending()).toBe(0);
  });

  it("F1 P5: the tab check runs once per attach, not on a reused session (the entry covers those)", async () => {
    const t = setup();
    const tabCheck = vi.fn(async () => null);
    t.setCheck(tabCheck);
    for (let i = 0; i < 3; i++) await t.ok(7);
    expect(tabCheck).toHaveBeenCalledTimes(1);
    expect(t.keeper.state(7)).toBe("idle");
  });

  it("F2: another call's unexpected guard failure on a busy tab leaves the busy use's answer; the session detaches when it ends", async () => {
    const t = setup();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const a = t.keeper.use(7, async () => {
      await gate;
      if (!t.attached.has(7)) throw new Error("Detached while handling command.");
      return "a";
    }, { guard: t.guard, mapError });
    await flush();
    const failing = { effect: async () => Promise.reject(new Error("unexpected guard failure")) };
    await expect(t.keeper.use(7, async () => "b", { guard: failing, mapError })).rejects.toThrow("unexpected guard failure");
    release();
    expect(await a).toBe("a");
    expect(t.attached.has(7)).toBe(false);
    expect(t.keeper.state(7)).toBe("none");
  });

  it("F2: another call's DOMAIN_BLOCKED re-check on a busy tab ends the busy use with that refusal (decision 3)", async () => {
    const t = setup();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const a = t.keeper.use(7, async () => {
      await gate;
      if (!t.attached.has(7)) throw new Error("Detached while handling command.");
      return "a";
    }, { guard: t.guard, mapError });
    a.catch(() => {});
    await flush();
    const refusing = { effect: async () => Promise.reject(refusalError(BLOCKED)) };
    await expect(t.keeper.use(7, async () => "b", { guard: refusing, mapError })).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    release();
    await expect(a).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(t.attached.has(7)).toBe(false);
  });

  it("F3 P4: a late onDetach for an ended session does not orphan the newer one: it is detached, and a disarm finds nothing attached", async () => {
    const t = setup();
    t.deps.getTargets = liveTargets(t);
    await t.ok(7, 1); // session 1 kept
    t.attached.delete(7); // Chrome ended session 1 (Cancel); its onDetach is still queued
    await t.keeper.use(7, async () => Promise.reject(new Error("Debugger is not attached to the tab with id: 7.")), { guard: t.guard, mapError }).catch(() => {});
    await t.ok(7, 3); // session 2 attached and kept
    expect(t.attached.has(7)).toBe(true);
    t.keeper.onDetach(7, "canceled_by_user"); // the late event for session 1
    await flush();
    await t.sessions.detachAll(DISARMED_ALL, t.deps.detach);
    expect(t.attached.has(7)).toBe(false);
  });

  it("F3: a use right after onDetach waits for its check and attaches cleanly", async () => {
    const t = setup();
    t.deps.getTargets = liveTargets(t);
    await t.ok(7);
    t.keeper.onDetach(7, "canceled_by_user"); // late or wrong: the tab still reads attached
    expect(await t.ok(7, "next")).toBe("next");
    expect(t.attaches()).toBe(2);
    expect(t.keeper.state(7)).toBe("idle");
  });

  it("F5: the wait for a pending detach is bounded (KEEPER_DETACH_WAIT_MS); the use then goes on", async () => {
    expect(KEEPER_DETACH_WAIT_MS).toBe(1000);
    const t = setup();
    await t.ok(7);
    t.deps.detach = vi.fn(() => new Promise<void>(() => {})); // a detach that never settles
    void t.keeper.tabGone(7);
    t.attached.delete(7);
    const p = t.ok(7, "after");
    await flush(); // the use reaches its wait
    await t.clock.advance(KEEPER_DETACH_WAIT_MS - 1);
    expect(t.attaches()).toBe(1);
    await t.clock.advance(1);
    expect(await p).toBe("after");
    expect(t.attaches()).toBe(2);
  });
});

/** A use that issues one CDP command: it fails as Chrome does when the tab's session is gone. */
const cdpUse = (t: ReturnType<typeof setup>, tabId: number, v: unknown) =>
  t.keeper.use(tabId, async () => {
    if (!t.attached.has(tabId)) throw new Error(`Debugger is not attached to the tab with id: ${tabId}.`);
    return v;
  }, { guard: t.guard, mapError });

describe("S4a fixer round 2 (verifier-2 N1, N2): a stale detach never removes a newer kept session", () => {
  it("N1 A1: a killed use that ends after a newer session was kept leaves it attached; the next sequential call answers", async () => {
    const t = setup();
    const a = held(t, 7); // a long use in a wait that sends no CDP command
    await flush();
    t.setCheck(async () => Promise.reject(new Error("tabs.get failed"))); // a transient tab-check failure kills A
    await t.keeper.recheckTab(7);
    t.setCheck(async () => null);
    expect(await t.ok(7, "b")).toBe("b"); // B attaches fresh and is kept
    expect(t.keeper.state(7)).toBe("idle");
    a.release();
    await expect(a.p).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    await flush();
    expect(t.attached.has(7)).toBe(true);
    expect(t.keeper.state(7)).toBe("idle");
    expect(await cdpUse(t, 7, "c")).toBe("c");
    expect(t.attaches()).toBe(2);
    expect(t.sessions.size).toBe(1);
  });

  it("N2 A2: an onDetach whose getTargets answers after the wait bound does not detach the session attached meanwhile", async () => {
    const t = setup();
    await t.ok(7);
    t.attached.delete(7); // Chrome really ended it
    let answer!: () => void;
    t.deps.getTargets = vi.fn(() => new Promise<{ tabId: number; attached: boolean }[]>((r) => (answer = () => r([...t.attached].map((tabId) => ({ tabId, attached: true }))))));
    t.keeper.onDetach(7, "canceled_by_user");
    const b = t.ok(7, "b");
    await flush();
    await t.clock.advance(KEEPER_DETACH_WAIT_MS);
    expect(await b).toBe("b"); // B attached after the bound
    answer(); // getTargets now reads B's session as attached
    await flush();
    expect(t.attached.has(7)).toBe(true);
    expect(t.keeper.state(7)).toBe("idle");
    expect(await cdpUse(t, 7, "c")).toBe("c");
    expect(t.attaches()).toBe(2);
  });
});

/** Chrome's attach in two steps: `land()` makes the tab read attached in Chrome, `reply()` resolves the call. */
function manualAttach(t: ReturnType<typeof setup>, tabId = 7) {
  let reply!: () => void;
  t.deps.attach = vi.fn(() => new Promise<void>((r) => (reply = r)));
  return { land: () => void t.attached.add(tabId), reply: () => reply() };
}

describe("S4a fixer round 3 (verifier-3 V3-1, V3-2, V3-3)", () => {
  it("V3-1 Q2: a late onDetach while the next attach is pending keeps that entry; a disarm then reaches its session", async () => {
    const t = setup();
    t.deps.getTargets = liveTargets(t);
    await t.ok(7, "x");
    t.attached.delete(7); // Chrome ended X (Cancel); its onDetach is still queued
    await cdpUse(t, 7, "fails").catch(() => {}); // X's use fails, X released
    const att = manualAttach(t);
    const a = t.ok(7, "a");
    await flush(); // A's attach pending
    t.keeper.onDetach(7, "canceled_by_user"); // the late event for X
    await flush(); // getTargets, if read, answers before A's attach lands
    att.land();
    att.reply();
    expect(await a).toBe("a");
    expect(t.sessions.size).toBe(1);
    await t.sessions.detachAll(DISARMED_ALL, t.deps.detach);
    expect(t.attached.has(7)).toBe(false);
  });

  it("V3-2 Q1b: onDetach's getTargets is bounded; a late answer that reads the next session attached does not detach it", async () => {
    const t = setup();
    await t.ok(7);
    t.attached.delete(7); // Chrome really ended it
    let answer!: () => void;
    t.deps.getTargets = vi.fn(() => new Promise<{ tabId: number; attached: boolean }[]>((r) => (answer = () => r([...t.attached].map((tabId) => ({ tabId, attached: true }))))));
    t.keeper.onDetach(7, "canceled_by_user");
    const att = manualAttach(t);
    const b = t.ok(7, "b");
    await flush();
    await t.clock.advance(KEEPER_DETACH_WAIT_MS); // the check times out first and detaches; then B attaches
    att.land(); // B's attach lands in Chrome ...
    answer(); // ... getTargets answers and reads it attached ...
    await flush();
    att.reply(); // ... then B's attach reply arrives
    expect(await b).toBe("b");
    expect(await cdpUse(t, 7, "c")).toBe("c");
    expect(t.clock.pending()).toBe(1); // B's idle timer only: the check's bound is cleared
  });

  it("V3-3 Q3: a slow post-attach check that answers after A was released does not release the newer session B", async () => {
    const t = setup();
    let slow!: (r: SafetyRefusal | null) => void;
    t.setCheck(() => new Promise((r) => (slow = r)));
    const a = t.ok(7, "a");
    await flush(); // A awaits its post-attach check
    t.setCheck(async () => BLOCKED);
    await t.keeper.recheckTab(7); // A released
    t.setCheck(async () => null);
    const b = held(t, 7); // the page is allowed again: B attaches fresh and is busy
    await flush();
    expect(t.keeper.state(7)).toBe("busy");
    slow(BLOCKED); // A's stale check answers
    await a.catch(() => {});
    b.release();
    expect(await b.p).toBe("held");
    expect(t.attached.has(7)).toBe(true);
  });
});

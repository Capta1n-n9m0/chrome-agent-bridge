/**
 * Step 12 S4b (phase doc 0.6 and § S4; decisions.md #324, #335, #347; exit checks D4.1–D4.3): the keeper wired.
 * - The pure wiring parts: `within` (the source bound, #347 item 8), `UseCommands` (a failed or unfinished command
 *   drops the session, S4a F4), `pageChanged`, `keptTabRefusal` (the keeper's tab check).
 * - `withDebugger` through `keepSessions` over a fake `chrome.debugger` (one attach per tab, as Chrome 156, m2 D5):
 *   one attach for sequential calls, the idle detach, the disarm's `detachAll` reaching a kept session, the gate
 *   re-check before a reused session, a failed clean-up, the bounded tab check and sweep.
 * - V4-1 (S4a-verifier4.md, probe T6): a waiter whose bound came from an earlier slow detach waits for the newer one.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { DebuggerKeeper, KEEPER_DETACH_WAIT_MS, UseCommands, keptTabRefusal, pageChanged, within, type KeeperDeps } from "../src/debugger-keeper.js";
import { debuggerSessions, evaluateFunctionInPage, fullPageScreenshot, keepSessions, runTrustedInput } from "../src/debugger.js";
import { consoleMessages } from "../src/handlers/console.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DebuggerSessions } from "../src/safety-debugger.js";
import { DISARMED_ALL, failClosedView, type SafetyView } from "../src/safety-state.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import { describeDebuggerError } from "../src/debugger-errors.js";
import { refusalError, type SafetyRefusal } from "../src/safety.js";
import { BridgeError } from "../src/errors.js";

const BLOCKED: SafetyRefusal = { code: ErrorCodes.DOMAIN_BLOCKED, message: "blocked (test)" };
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const realTimers = { set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>) };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  debuggerSessions.refuse(null);
});

describe("S4b pure wiring parts", () => {
  it("within: passes the value through, and rejects after its bound", async () => {
    vi.useFakeTimers();
    await expect(within(Promise.resolve(3), 1000, realTimers)).resolves.toBe(3);
    const late = within(new Promise<number>(() => {}), 1000, realTimers);
    late.catch(() => {});
    await vi.advanceTimersByTimeAsync(1000);
    await expect(late).rejects.toThrow("timed out");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("UseCommands: a failed command, or one still pending at the end, drops; settled ones do not; late ones are ignored", async () => {
    const mk = () => {
      const u = { drop: vi.fn() };
      return { u, c: new UseCommands(u) };
    };
    const a = mk();
    await a.c.track(Promise.resolve(1));
    a.c.end();
    expect(a.u.drop).not.toHaveBeenCalled();
    const b = mk();
    await b.c.track(Promise.reject(new Error("x"))).catch(() => {});
    expect(b.u.drop).toHaveBeenCalledTimes(1);
    const c = mk();
    let rej!: (e: unknown) => void;
    c.c.track(new Promise((_r, j) => (rej = j))).catch(() => {});
    c.c.end();
    expect(c.u.drop).toHaveBeenCalledTimes(1);
    rej(new Error("late"));
    await flush();
    expect(c.u.drop).toHaveBeenCalledTimes(1);
  });

  it("pageChanged: a URL change or a load start", () => {
    expect([pageChanged({ url: "http://a/" }), pageChanged({ status: "loading" }), pageChanged({ status: "complete" }), pageChanged({})]).toEqual([true, true, false, false]);
  });

  it("keptTabRefusal: disarmed, blocked, own or file: refuses; JavaScript off does not; an unreadable state throws", async () => {
    const view = (o: Partial<SafetyView["switches"]> = {}, list = ""): SafetyView => ({
      switches: { armed: true, evaluate: true, ...o },
      ctx: { extensionId: "ext", blockList: list ? parseBlockList(list) : EMPTY_BLOCK_LIST },
      blockedCount: 0,
    });
    const deps = (v: SafetyView | null, url: string) => ({
      readState: async () => (v ? v : Promise.reject(new Error("unreadable"))),
      getTab: async () => ({ url }),
      replacedBy: () => undefined,
      lastUrl: () => undefined,
    });
    const code = async (v: SafetyView | null, url: string) => (await keptTabRefusal(deps(v, url), 7))?.code ?? null;
    expect(await code(view(), "http://ok.test/")).toBe(null);
    expect(await code(view({ evaluate: false }), "http://ok.test/")).toBe(null);
    expect(await code(view({ armed: false }), "http://ok.test/")).toBe(ErrorCodes.DISARMED);
    expect(await code(failClosedView("ext"), "http://ok.test/")).toBe(ErrorCodes.DISARMED);
    expect(await code(view({}, "bad.test"), "http://bad.test/x")).toBe(ErrorCodes.DOMAIN_BLOCKED);
    expect(await code(view(), "chrome-extension://ext/options.html")).toBe(ErrorCodes.DOMAIN_BLOCKED);
    expect(await code(view(), "file:///C:/x.html")).toBe(ErrorCodes.DOMAIN_BLOCKED);
    await expect(code(null, "http://ok.test/")).rejects.toThrow("unreadable");
  });
});

/** `chrome.debugger` as Chrome 156 answers it: one attach per tab; `fail` makes a command throw. */
function fakeChrome(fail: (method: string, params: Record<string, unknown>) => boolean = () => false, reply: (method: string, params: Record<string, unknown>) => unknown = () => ({ data: "AAAA" })) {
  const attached = new Set<number>();
  const n = { attach: 0, detach: 0, sent: [] as string[] };
  let targets: () => Promise<unknown> = async () => [...attached].map((tabId) => ({ tabId, attached: true }));
  vi.stubGlobal("chrome", {
    debugger: {
      attach: vi.fn(async ({ tabId }: { tabId: number }) => {
        n.attach++;
        if (attached.has(tabId)) throw new Error(`Another debugger is already attached to the tab with id: ${tabId}.`);
        attached.add(tabId);
      }),
      detach: vi.fn(async ({ tabId }: { tabId: number }) => {
        n.detach++;
        if (!attached.delete(tabId)) throw new Error(`Debugger is not attached to the tab with id: ${tabId}.`);
      }),
      getTargets: vi.fn(() => targets()),
      sendCommand: vi.fn(async ({ tabId }: { tabId: number }, method: string, params: Record<string, unknown> = {}) => {
        if (!attached.has(tabId)) throw new Error(`Debugger is not attached to the tab with id: ${tabId}.`);
        n.sent.push(method);
        if (fail(method, params)) throw new Error("Internal error");
        return reply(method, params);
      }),
    },
  });
  return { attached, n, setTargets: (f: () => Promise<unknown>) => (targets = f) };
}

const allow = { effect: vi.fn(async () => {}) };
const detachAll = () => debuggerSessions.detachAll(DISARMED_ALL, (tabId) => chrome.debugger.detach({ tabId }));

describe("S4b withDebugger through the keeper (D4.1–D4.3 through the wiring)", () => {
  it("D4.1: sequential calls share one attach, answers unchanged; the detach comes 5 s after the last", async () => {
    vi.useFakeTimers();
    const c = fakeChrome();
    keepSessions(async () => null);
    expect(await fullPageScreenshot(7, allow)).toBe("data:image/png;base64,AAAA");
    expect(await fullPageScreenshot(7, allow)).toBe("data:image/png;base64,AAAA");
    expect(c.n).toMatchObject({ attach: 1, detach: 0 });
    await vi.advanceTimersByTimeAsync(4999);
    expect(c.n.detach).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(c.n.detach).toBe(1);
    expect(c.attached.size).toBe(0);
  });

  it("D4.2: the disarm's detachAll reaches an idle kept session; the next call is refused and attaches nothing", async () => {
    vi.useFakeTimers();
    const c = fakeChrome();
    keepSessions(async () => null);
    await fullPageScreenshot(7, allow);
    expect(c.attached.has(7)).toBe(true);
    expect(await detachAll()).toBe(1);
    expect(c.attached.has(7)).toBe(false);
    await expect(fullPageScreenshot(7, allow)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(c.n.attach).toBe(1);
  });

  it("D4.3: a reused session re-checks the gate first; a refusal sends nothing and detaches", async () => {
    vi.useFakeTimers();
    const c = fakeChrome();
    keepSessions(async () => null);
    await fullPageScreenshot(7, allow);
    const refuse = { effect: vi.fn(async () => Promise.reject(refusalError(BLOCKED))) };
    await expect(fullPageScreenshot(7, refuse)).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(refuse.effect).toHaveBeenCalledTimes(1);
    expect(c.n.sent).toEqual(["Page.captureScreenshot"]);
    expect(c.attached.has(7)).toBe(false);
  });

  it("a failed clean-up (focus emulation off) detaches when the call ends, not 5 s later; the answer is today's", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = fakeChrome((m, p) => m === "Emulation.setFocusEmulationEnabled" && p.enabled === false);
    keepSessions(async () => null);
    expect(await runTrustedInput(7, { kind: "click", x: 1, y: 1 }, { focusEmulation: true }, allow)).toBe(true);
    await flush();
    expect(c.n.detach).toBe(1);
    expect(c.attached.size).toBe(0);
  });

  it("the tab check never settling is bounded at 1 s: the call answers, the session is detached", async () => {
    vi.useFakeTimers();
    const c = fakeChrome();
    keepSessions(() => new Promise(() => {}));
    const shot = fullPageScreenshot(7, allow);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await shot).toBe("data:image/png;base64,AAAA");
    expect(c.attached.size).toBe(0);
  });

  it("the start-up sweep detaches a tab left attached; a getTargets that never answers holds calls 1 s at most", async () => {
    vi.useFakeTimers();
    const c = fakeChrome();
    c.attached.add(9);
    expect(await keepSessions(async () => null).sweep()).toBe(1);
    expect(c.attached.has(9)).toBe(false);
    c.setTargets(() => new Promise(() => {}));
    void keepSessions(async () => null).sweep();
    const shot = fullPageScreenshot(7, allow);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await shot).toBe("data:image/png;base64,AAAA");
  });
});

describe("V4-1: a waiter whose bound came from an earlier slow detach waits for the newer pending detach", () => {
  it("probe T6 (Chrome first in first out): D answers, and the next call is not cancelled", async () => {
    vi.useFakeTimers();
    const attached = new Set<number>();
    type Op = { kind: string; tabId?: number; res: (v?: unknown) => void; rej: (e: unknown) => void };
    const q: Op[] = [];
    const op = (kind: string, tabId?: number) => new Promise<any>((res, rej) => q.push({ kind, tabId, res, rej }));
    const step = async (kind?: string) => {
      const [o] = q.splice(kind ? q.findIndex((x) => x.kind === kind) : 0, 1);
      if (o!.kind === "attach") attached.has(o!.tabId!) ? o!.rej(new Error(`Another debugger is already attached to the tab with id: ${o!.tabId}.`)) : (attached.add(o!.tabId!), o!.res());
      else if (o!.kind === "detach") attached.delete(o!.tabId!) ? o!.res() : o!.rej(new Error("Debugger is not attached"));
      else o!.res([...attached].map((tabId) => ({ tabId, attached: true })));
      await flush();
    };
    const deps: KeeperDeps = {
      attach: (id) => op("attach", id),
      detach: (id) => op("detach", id),
      getTargets: () => op("targets"),
      timers: realTimers,
      sessions: new DebuggerSessions(),
      tabCheck: async () => null,
    };
    const keeper = new DebuggerKeeper(deps);
    const mapError = (err: unknown) => {
      const d = describeDebuggerError(err, "Test");
      return new BridgeError(d.code, d.message, d.data);
    };
    const cdp = (v: string) =>
      keeper.use(7, async () => {
        if (!attached.has(7)) throw new Error("Detached while handling command.");
        return v;
      }, { mapError });
    const settle = async <T,>(p: Promise<T>) => {
      let done = false;
      p.then(() => (done = true), () => (done = true));
      for (let i = 0; i < 50 && !done; i++) {
        await flush();
        if (q.length) await step();
      }
      return p.then((v) => v, (e: { code?: string }) => e.code);
    };
    expect(await settle(cdp("x"))).toBe("x");
    attached.delete(7); // X ended
    void keeper.tabGone(7); // its detach, slow (queued)
    await flush();
    const k = cdp("k");
    k.catch(() => {});
    await vi.advanceTimersByTimeAsync(KEEPER_DETACH_WAIT_MS); // K's bound: K's attach queued
    await step("attach");
    expect(await k).toBe("k");
    const d = cdp("d");
    d.catch(() => {});
    await vi.advanceTimersByTimeAsync(200);
    attached.delete(7); // Chrome ends K
    keeper.onDetach(7, "canceled_by_user");
    await vi.advanceTimersByTimeAsync(800); // D's bound on X's detach
    await vi.advanceTimersByTimeAsync(200); // the check's bound: its detach
    while (q.length) await step();
    expect(await settle(d)).toBe("d");
    expect(await settle(cdp("e"))).toBe("e");
  });
});

describe("S4b fixer (V1): the worker's wiring of the keeper (sw.ts, read statically)", () => {
  const SW = readFileSync(fileURLToPath(new URL("../src/sw.ts", import.meta.url)), "utf8");
  const lines = (text: string) => text.split(/\r?\n/);
  /** The lines from the first one starting with `head` up to the next line equal to `end`. */
  const body = (head: string, end = "});") => {
    const all = lines(SW);
    const i = all.findIndex((l) => l.startsWith(head));
    expect(i).toBeGreaterThanOrEqual(0);
    return all.slice(i, all.indexOf(end, i)).join("\n");
  };
  /** `stmt` as a code line of `text` (never a comment): at `indent`, or else indented. */
  const line = (text: string, stmt: string, indent?: string) =>
    expect(lines(text).some((l) => (indent === undefined ? /^\s+\S/.test(l) && l.trim() === stmt : l === indent + stmt)), stmt).toBe(true);

  it("keepSessions and the sweep run at the top level; each listener forwards its event to the keeper", () => {
    line(SW, "const keeper = keepSessions((tabId) => keptTabRefusal(callDeps, tabId));", "");
    line(SW, "void keeper.sweep();", "");
    line(body('  if (area === "local" && touchesSafety(changes)) {', "  }"), "void keeper.recheckAll();", "    ");
    line(body("chrome.tabs.onRemoved.addListener((tabId) => {"), "void keeper.tabGone(tabId); // Step 12 S4b: its kept debugger session goes");
    line(body("chrome.tabs.onReplaced.addListener("), "void keeper.tabGone(removedTabId); // Step 12 S4b");
    line(body("chrome.tabs.onUpdated.addListener("), "if (pageChanged(change)) void keeper.recheckTab(tabId); // Step 12 S4b: blocked, own or file: now → detach");
    line(body("chrome.debugger.onDetach.addListener("), 'if (typeof source.tabId === "number") keeper.onDetach(source.tabId, reason);');
  });
});

describe("S4b fixer (V2): console's Runtime.disable and evaluate's Debugger.disable run through the installed keeper", () => {
  const call = { effect: vi.fn(async () => {}), networkFilter: async () => () => true };
  const evalReply = (m: string, p: Record<string, unknown>) =>
    m === "Runtime.evaluate"
      ? { result: p.expression === "globalThis" ? { type: "object", objectId: "g" } : { type: "function", objectId: "fn" } }
      : m === "Runtime.callFunctionOn"
        ? { result: { type: "number", value: 3 } }
        : {};

  it.each([[false, 0], [true, 1]])("consoleMessages, Runtime.disable fails: %s → detaches at the call's end: %s", async (fails, detaches) => {
    vi.useFakeTimers();
    const c = fakeChrome((m) => fails && m === "Runtime.disable");
    Object.assign(globalThis.chrome, { tabs: { get: async (id: number) => ({ id, url: "http://ok.test/" }) }, runtime: { id: "ext" } });
    keepSessions(async () => null);
    const r = consoleMessages({ tabId: 7 }, call as never);
    await vi.advanceTimersByTimeAsync(100);
    expect(await r).toEqual({ entries: [] });
    await flush();
    expect(c.n.sent).toEqual(["Runtime.enable", "Runtime.disable"]);
    expect(c.n).toMatchObject({ attach: 1, detach: detaches });
  });

  it.each([[false, 0], [true, 1]])("an args evaluate, Debugger.disable fails: %s → detaches at the call's end: %s", async (fails, detaches) => {
    vi.useFakeTimers();
    const c = fakeChrome((m) => fails && m === "Debugger.disable", evalReply);
    keepSessions(async () => null);
    expect(await evaluateFunctionInPage(7, "(a) => a", "{}", 5000, {} as never, allow)).toMatchObject({ kind: "json", value: 3 });
    await flush();
    expect(c.n.sent.at(-1)).toBe("Debugger.disable");
    expect(c.n).toMatchObject({ attach: 1, detach: detaches });
  });
});

describe("S4b fixer (V3): the re-check runs after the wait on a pending detach", () => {
  it("a refusal that lands during the wait refuses the use: no attach, no side effect", async () => {
    vi.useFakeTimers();
    const order: string[] = [];
    let release!: () => void;
    let blocked = false;
    const keeper = new DebuggerKeeper({
      attach: async () => void order.push("attach"),
      detach: () => new Promise<void>((r) => (release = r)),
      getTargets: async () => [],
      timers: realTimers,
      sessions: new DebuggerSessions(),
      tabCheck: async () => null,
    });
    const guard = {
      effect: async () => {
        if (blocked) throw refusalError(BLOCKED);
      },
    };
    const opts = { guard, mapError: (e: unknown) => e as Error };
    const fx = async () => void order.push("SIDE EFFECT");
    await keeper.use(7, fx, opts);
    void keeper.tabGone(7); // a slow detach
    const second = keeper.use(7, fx, opts);
    second.catch(() => {});
    await flush();
    blocked = true; // the block list changes during the wait
    await keeper.recheckAll(); // the tab has no kept entry while it detaches
    release();
    await expect(second).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(order).toEqual(["attach", "SIDE EFFECT"]);
  });

  it("a detach that begins during the re-check is waited for and the re-check runs again (N1, probe P-LOOP)", async () => {
    const order: string[] = [];
    let attached = false, guards = 0, slow: (() => void) | null = null, release!: () => void;
    const keeper = new DebuggerKeeper({
      attach: async () => {
        if (attached) throw new Error("Another debugger is already attached to the tab with id: 7."); // as Chrome
        order.push((attached = true) && "attach");
      },
      detach: () => new Promise<void>((r) => (release = () => ((attached = false), order.push("detached"), r()))),
      getTargets: async () => [], timers: realTimers, sessions: new DebuggerSessions(), tabCheck: async () => null,
    });
    const guard = { effect: async () => void (++guards === 2 && (await new Promise<void>((r) => (slow = r)))) };
    const opts = { guard, mapError: (e: unknown) => e as Error };
    await keeper.use(7, async () => void order.push("fx1"), opts); // kept idle
    const second = keeper.use(7, async () => void order.push("fx2"), opts);
    second.catch(() => {});
    await flush();
    void keeper.tabGone(7); // the detach begins while the second re-check awaits
    slow!();
    await flush();
    release();
    await expect(second).resolves.toBeUndefined();
    expect({ order, guards }).toEqual({ order: ["attach", "fx1", "detached", "attach", "fx2"], guards: 3 });
  });
});

/**
 * Step 11b S6 (#311 item 2, #312): `newTab` with a URL that is not `about:blank` opens the tab on `about:blank`, holds
 * the tab's block-list rules (a `navigate`-class keeper handle for the new id), then navigates. Exit checks E6.1–E6.3:
 * the order create → install resolved → navigate → release on success, refusal, error and timeout; a rejecting
 * install opens nothing and leaves no tab; `newTab` without a URL, with `about:blank` or without a `call` is today's.
 * Pure: `chrome.tabs` is a stub, the keeper a fake handle or the real `DnrKeeper` over a fake DNR. Reserved names only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { BLANK_SETTLE_MS, openBehindRules, opensBehindRules, settleBlank, type BlankTabs, type OpenSteps } from "../src/newtab-open.js";
import { newTab } from "../src/handlers/tabs.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { DnrKeeper, type DnrCall, type DnrUpdate } from "../src/safety-dnr-keeper.js";
import { STATE_UNREADABLE_MESSAGE, refusalError, stateUnreadableRefusal } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import type { SafetyView } from "../src/safety-state.js";
import type { DnrRule } from "../src/safety-dnr.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const URL_A = "http://localhost:8083/redirect";
const NEW_ID = 99;

let log: string[];

beforeEach(() => {
  log = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe("opensBehindRules: which newTab takes the about:blank sequence", () => {
  it("a URL other than about:blank only", () => {
    expect(opensBehindRules(URL_A)).toBe(true);
    expect(opensBehindRules(undefined)).toBe(false);
    expect(opensBehindRules("about:blank")).toBe(false);
  });
});

describe("openBehindRules: the pure sequence", () => {
  function steps(o: { hold?: () => Promise<void>; navigateFails?: boolean; loadFails?: boolean } = {}): OpenSteps {
    return {
      create: async () => (log.push("create"), NEW_ID),
      settleBlank: () => {
        log.push("settle");
        return { done: Promise.resolve().then(() => void log.push("settled")), cancel: () => void log.push("cancel") };
      },
      holdRules: async (id) => {
        log.push(`hold ${id}`);
        if (o.hold) await o.hold();
        log.push("held");
      },
      waitLoad: async () => {
        log.push("arm");
        await Promise.resolve();
        if (o.loadFails) throw new Error("Timed out waiting for tab 99 to load");
        log.push("loaded");
      },
      navigate: async () => {
        log.push("navigate");
        if (o.navigateFails) throw new Error("Invalid url");
      },
      remove: async (id) => void log.push(`remove ${id}`),
    };
  }

  it("success: create → settle started → hold resolved → settled → arm the load → navigate → loaded; returns the id", async () => {
    expect(await openBehindRules(steps())).toBe(NEW_ID);
    expect(log).toEqual(["create", "settle", "hold 99", "held", "settled", "arm", "navigate", "loaded"]);
  });

  it("never navigates before the hold resolves (the E6.1 mutant)", async () => {
    const gate = deferred();
    const p = openBehindRules(steps({ hold: () => gate.promise }));
    await flush();
    expect(log).toEqual(["create", "settle", "hold 99", "settled"]);
    gate.resolve();
    await p;
    expect(log.indexOf("navigate")).toBeGreaterThan(log.indexOf("held"));
  });

  it("a hold that throws: the tab is removed, nothing navigates, the same error is rethrown", async () => {
    const err = new Error("refused");
    await expect(openBehindRules(steps({ hold: async () => Promise.reject(err) }))).rejects.toBe(err);
    expect(log).toEqual(["create", "settle", "hold 99", "settled", "cancel", "remove 99"]);
  });

  it("a navigation call that throws: the tab is removed, the error passes unchanged", async () => {
    await expect(openBehindRules(steps({ navigateFails: true }))).rejects.toThrow("Invalid url");
    expect(log).toContain("remove 99");
  });

  it("a load timeout keeps the tab, as today, and passes the error unchanged", async () => {
    await expect(openBehindRules(steps({ loadFails: true }))).rejects.toThrow("Timed out waiting for tab 99 to load");
    expect(log).not.toContain("remove 99");
  });

  it("a remove that fails does not replace the hold's error", async () => {
    const s = steps({ hold: async () => Promise.reject(new Error("refused")) });
    s.remove = async () => Promise.reject(new Error("No tab with id: 99."));
    await expect(openBehindRules(s)).rejects.toThrow("refused");
  });
});

// --- The handler with a real CallSafety, a fake chrome.tabs and a fake keeper handle -------------------------------

function view(o: { armed?: boolean; list?: string } = {}): SafetyView {
  const blockList = o.list ? parseBlockList(o.list) : EMPTY_BLOCK_LIST;
  return { switches: { armed: o.armed ?? true, evaluate: true }, ctx: { extensionId: OWN_ID, blockList }, blockedCount: blockList.blockedCount };
}

/**
 * `neverLoads`: no `complete` at all (the blank tab reads `complete` through `get`). `urlNeverLoads`: the blank tab's
 * own `complete` fires at +0 ms, the URL's never (V1). `urlLoadMs`: the URL's `complete` fires that late, logged.
 * `blankSilent`: the blank tab never reports `complete` and `get` says `loading`.
 */
function stubTabs(
  o: { navigateFails?: boolean; neverLoads?: boolean; urlNeverLoads?: boolean; urlLoadMs?: number; blankSilent?: boolean; onNavigate?: () => void } = {},
) {
  const listeners = new Set<(id: number, info: { status?: string }) => void>();
  const fire = (id: number, ms = 0, note?: string) =>
    setTimeout(() => {
      if (note) log.push(note);
      listeners.forEach((l) => l(id, { status: "complete" }));
    }, ms);
  const tabs = {
    create: vi.fn(async (props: { url?: string; active?: boolean }) => {
      log.push(`create ${props.url ?? "-"} ${props.active}`);
      if (props.url && !o.neverLoads && !o.blankSilent) fire(NEW_ID);
      return { id: NEW_ID };
    }),
    get: vi.fn(async () => ({ status: o.neverLoads ? "complete" : "loading" })),
    update: vi.fn(async (id: number, props: { url?: string }) => {
      log.push(`update ${props.url}`);
      o.onNavigate?.();
      if (o.navigateFails) throw new Error("Invalid url");
      if (!o.neverLoads && !o.urlNeverLoads) fire(id, o.urlLoadMs ?? 0, o.urlLoadMs ? "url-complete" : undefined);
    }),
    remove: vi.fn(async (id: number) => void log.push(`remove ${id}`)),
    onUpdated: { addListener: vi.fn((l) => listeners.add(l)), removeListener: vi.fn((l) => listeners.delete(l)) },
  };
  vi.stubGlobal("chrome", { tabs });
  return tabs;
}

function fakeRules(o: { installFails?: boolean; gate?: Promise<void>; refusedAfterRelease?: boolean } = {}): DnrCall {
  let released = false;
  return {
    mark: () => void log.push("mark"),
    install: async () => {
      log.push("install");
      if (o.gate) await o.gate;
      if (o.installFails) throw refusalError(stateUnreadableRefusal());
      log.push("installed");
    },
    refusal: () => (o.refusedAfterRelease && released ? stateUnreadableRefusal() : null),
    release: async () => {
      await Promise.resolve();
      released = true;
      log.push("release");
    },
    holding: () => false,
  };
}

function deps(o: { states?: SafetyView[]; rules?: DnrCall | ((id: number) => DnrCall) } = {}): CallSafetyDeps {
  let n = 0;
  return {
    readState: async () => {
      log.push("read");
      const s = o.states ?? [view()];
      return s[Math.min(n++, s.length - 1)]!;
    },
    getTab: async () => Promise.reject(new Error("unused")),
    replacedBy: () => undefined,
    lastUrl: () => undefined,
    dnrForTab: o.rules
      ? (id) => {
          log.push(`dnrForTab ${id}`);
          return typeof o.rules === "function" ? o.rules(id) : o.rules!;
        }
      : undefined,
  };
}

/** As the gated router runs a call: receipt, the handler, then the post-check on every path. */
async function run(params: Record<string, unknown>, d: CallSafetyDeps) {
  const call = new CallSafety("newTab", params, d);
  expect(await call.receipt()).toBe("allow");
  let out: unknown;
  let err: unknown;
  try {
    out = await newTab(params, call);
  } catch (e) {
    err = e;
  }
  const refusal = await call.post();
  return { out, err: err as { code?: string; message?: string } | undefined, refusal };
}

const HEAD = ["read", "read", "create about:blank false", "dnrForTab 99", "mark", "read"];

describe("newTab with a URL: about:blank → rules → navigate (E6.1)", () => {
  it("success: the order, and the reply is today's {id}", async () => {
    stubTabs();
    const r = await run({ url: URL_A }, deps({ rules: fakeRules() }));
    expect(r).toEqual({ out: { id: NEW_ID }, err: undefined, refusal: null });
    expect(log).toEqual([...HEAD, "install", "installed", `update ${URL_A}`, "read", "release"]);
  });

  it("the navigation waits for the install to resolve (a navigate-first mutant is red)", async () => {
    const tabs = stubTabs();
    const gate = deferred();
    const p = run({ url: URL_A }, deps({ rules: fakeRules({ gate: gate.promise }) }));
    await flush();
    expect(log).toEqual([...HEAD, "install"]);
    expect(tabs.update).not.toHaveBeenCalled();
    gate.resolve();
    expect((await p).out).toEqual({ id: NEW_ID });
    expect(log.indexOf(`update ${URL_A}`)).toBeGreaterThan(log.indexOf("installed"));
  });

  it("refusal at the re-check after creation: no install, no navigation, the tab removed, released", async () => {
    stubTabs();
    const r = await run({ url: URL_A }, deps({ states: [view(), view(), view({ armed: false })], rules: fakeRules() }));
    expect(r.err?.code).toBe(ErrorCodes.DISARMED);
    expect(log).toEqual([...HEAD, "remove 99", "read", "release"]);
  });

  it("error: the navigation call fails — the tab removed, Chrome's error unchanged, released", async () => {
    stubTabs({ navigateFails: true });
    const r = await run({ url: URL_A }, deps({ rules: fakeRules() }));
    expect(r.err?.message).toBe("Invalid url");
    expect(log).toEqual([...HEAD, "install", "installed", `update ${URL_A}`, "remove 99", "read", "release"]);
  });

  it("timeout: the load never completes — the tab kept as today, released after the timeout", async () => {
    vi.useFakeTimers();
    stubTabs({ neverLoads: true });
    const p = run({ url: URL_A }, deps({ rules: fakeRules() }));
    await vi.advanceTimersByTimeAsync(30_000);
    const r = await p;
    expect(r.err?.message).toBe(`Timed out waiting for tab ${NEW_ID} to load`);
    expect(log).toEqual([...HEAD, "install", "installed", `update ${URL_A}`, "read", "release"]);
  });

  it("a rebuild refusal is read after the release settles (S2-builder.md §7)", async () => {
    stubTabs();
    const r = await run({ url: URL_A }, deps({ rules: fakeRules({ refusedAfterRelease: true }) }));
    expect(r.refusal).toMatchObject({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE });
  });
});

describe("the blank tab's own load never ends the URL's wait (S6 verifier V1)", () => {
  it("the blank's complete lands after the rules are held and the URL never loads: timeout, not {id}", async () => {
    vi.useFakeTimers();
    stubTabs({ urlNeverLoads: true });
    const p = run({ url: URL_A }, deps({ rules: fakeRules() }));
    await vi.advanceTimersByTimeAsync(30_000);
    const r = await p;
    expect(r.out).toBeUndefined();
    expect(r.err?.message).toBe(`Timed out waiting for tab ${NEW_ID} to load`);
    expect(log).toEqual([...HEAD, "install", "installed", `update ${URL_A}`, "read", "release"]);
  });

  it("the URL's complete comes later: the reply and the release come after it", async () => {
    vi.useFakeTimers();
    stubTabs({ urlLoadMs: 50 });
    const p = run({ url: URL_A }, deps({ rules: fakeRules() }));
    await vi.advanceTimersByTimeAsync(50);
    expect((await p).out).toEqual({ id: NEW_ID });
    expect(log).toEqual([...HEAD, "install", "installed", `update ${URL_A}`, "url-complete", "read", "release"]);
  });

  it("a blank tab that never reports complete does not hang: the URL opens after the bound", async () => {
    vi.useFakeTimers();
    const tabs = stubTabs({ blankSilent: true });
    const p = run({ url: URL_A }, deps({ rules: fakeRules() }));
    await vi.advanceTimersByTimeAsync(BLANK_SETTLE_MS - 1);
    expect(tabs.update).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(tabs.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // the URL's own complete, at +0 ms after the update
    expect((await p).out).toEqual({ id: NEW_ID });
  });
});

describe("settleBlank", () => {
  function fakeTabs(get: () => Promise<{ status?: string }>) {
    const listeners = new Set<(id: number, info: { status?: string }) => void>();
    const tabs: BlankTabs = {
      get: vi.fn(get),
      onUpdated: { addListener: (l) => void listeners.add(l), removeListener: (l) => void listeners.delete(l) },
    };
    return { tabs, listeners, fire: (id: number, status = "complete") => listeners.forEach((l) => l(id, { status })) };
  }
  const settled = async (p: Promise<void>) => {
    let done = false;
    void p.then(() => (done = true));
    await flush();
    return done;
  };

  it("arms the listener before get: a complete fired while get is pending ends it", async () => {
    let answer!: (t: { status?: string }) => void;
    const f = fakeTabs(() => new Promise((r) => (answer = r)));
    const s = settleBlank(NEW_ID, f.tabs);
    expect(f.listeners.size).toBe(1);
    f.fire(7);
    f.fire(NEW_ID, "loading");
    expect(await settled(s.done)).toBe(false);
    f.fire(NEW_ID);
    expect(await settled(s.done)).toBe(true);
    expect(f.listeners.size).toBe(0);
    answer({ status: "loading" });
  });

  it("get says complete, or get fails: ends at once, listener dropped", async () => {
    for (const get of [async () => ({ status: "complete" }), async () => Promise.reject(new Error("No tab with id: 99."))]) {
      const f = fakeTabs(get);
      expect(await settled(settleBlank(NEW_ID, f.tabs).done)).toBe(true);
      expect(f.listeners.size).toBe(0);
    }
  });

  it("no complete ever: ends at the bound; cancel ends it early", async () => {
    vi.useFakeTimers();
    const f = fakeTabs(async () => ({ status: "loading" }));
    const s = settleBlank(NEW_ID, f.tabs, 100);
    await vi.advanceTimersByTimeAsync(99);
    expect(await settled(s.done)).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await settled(s.done)).toBe(true);
    const c = settleBlank(NEW_ID, f.tabs, 100);
    c.cancel();
    expect(await settled(c.done)).toBe(true);
    expect(f.listeners.size).toBe(0);
  });
});

describe("a rejecting install (E6.2)", () => {
  it("0 navigations, the blank tab removed, DISARMED with STATE_UNREADABLE_MESSAGE, released", async () => {
    const tabs = stubTabs();
    const r = await run({ url: URL_A }, deps({ rules: fakeRules({ installFails: true }) }));
    expect(r.err).toMatchObject({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } });
    expect(tabs.update).not.toHaveBeenCalled();
    expect(tabs.remove).toHaveBeenCalledWith(NEW_ID);
    expect(log).toEqual([...HEAD, "install", "remove 99", "read", "release"]);
  });
});

describe("with the real keeper, wired as sw.ts wires it", () => {
  function keeper(reject = false) {
    let rules = new Map<number, DnrRule>();
    const k = new DnrKeeper({
      updateSessionRules: async (u: DnrUpdate) => {
        if (reject && u.addRules) throw new Error("rejected");
        const next = new Map(rules);
        for (const id of u.removeRuleIds ?? []) next.delete(id);
        for (const r of u.addRules ?? []) next.set(r.id, r);
        rules = next;
      },
      getSessionRules: async () => [...rules.values()],
      caps: () => ({ sessionRules: 5000, regexRules: 1000 }),
      extensionId: OWN_ID,
    });
    return { k, rules: () => [...rules.values()] };
  }

  it("the new tab's rules are in force when it navigates and gone after the post-check", async () => {
    const { k, rules } = keeper();
    let atNavigate: DnrRule[] = [];
    stubTabs({ onNavigate: () => (atNavigate = rules()) });
    const d = deps({ states: [view({ list: "blocked.example" })], rules: (id) => k.call("navigate", { tabId: id }) });
    const r = await run({ url: URL_A }, d);
    expect(r.out).toEqual({ id: NEW_ID });
    expect(atNavigate.length).toBeGreaterThan(0);
    expect(atNavigate.every((x) => JSON.stringify(x.condition).includes(`[${NEW_ID}]`))).toBe(true);
    expect(rules()).toEqual([]);
  });

  it("a rejected update: nothing opens, the tab removed, the existing refusal", async () => {
    const { k } = keeper(true);
    const tabs = stubTabs();
    const d = deps({ states: [view({ list: "blocked.example" })], rules: (id) => k.call("navigate", { tabId: id }) });
    const r = await run({ url: URL_A }, d);
    expect(r.err).toMatchObject({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE });
    expect(tabs.update).not.toHaveBeenCalled();
    expect(tabs.remove).toHaveBeenCalledWith(NEW_ID);
  });
});

describe("today's path is unchanged (E6.3)", () => {
  it("no URL: one create {url: undefined}, no keeper handle", async () => {
    const tabs = stubTabs();
    const r = await run({}, deps({ rules: fakeRules() }));
    expect(r.out).toEqual({ id: NEW_ID });
    expect(tabs.create).toHaveBeenCalledWith({ url: undefined, active: false });
    expect(log).not.toContain("dnrForTab 99");
  });

  it("about:blank: one create {url: about:blank}, no keeper handle, no update", async () => {
    const tabs = stubTabs();
    const r = await run({ url: "about:blank", active: true }, deps({ rules: fakeRules() }));
    expect(r.out).toEqual({ id: NEW_ID });
    expect(tabs.create).toHaveBeenCalledWith({ url: "about:blank", active: true });
    expect(tabs.update).not.toHaveBeenCalled();
    expect(log).not.toContain("dnrForTab 99");
  });

  it("no call (tests, a call without holdRulesFor): one create {url}, no update", async () => {
    const tabs = stubTabs();
    expect(await newTab({ url: URL_A })).toEqual({ id: NEW_ID });
    expect(await newTab({ url: URL_A }, { effect: async () => {} } as never)).toEqual({ id: NEW_ID });
    expect(tabs.create.mock.calls).toEqual([[{ url: URL_A, active: false }], [{ url: URL_A, active: false }]]);
    expect(tabs.update).not.toHaveBeenCalled();
  });
});

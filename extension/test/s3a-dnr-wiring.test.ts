/**
 * Step 11b S3a: the rule keeper wired into one gated call (`safety-call.ts`) and into `sw.ts` (#292, #296, #301).
 * - `effect()`: mark, the re-check, then the install from the re-check's own list; a refused re-check installs nothing.
 * - `post()`: release on every path (a gate throw included), awaited before the keeper's refusal is read.
 * - The keeper's `only` filter: S3a hands `CallSafety` a live handle for the tab scope only.
 * - `sw.ts` statically: one keeper at the top level, the start-up `ready`, the rebuild inside the existing safety
 *   `storage.onChanged` listener, `sweep()` in `onDisarm`, the tab-only handle, the listener count unchanged (19).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { DnrKeeper, type DnrCall, type DnrUpdate } from "../src/safety-dnr-keeper.js";
import { STATE_UNREADABLE_MESSAGE, stateUnreadableRefusal } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST, type BlockList } from "../src/safety-match.js";
import type { SafetyView } from "../src/safety-state.js";
import type { DnrRule } from "../src/safety-dnr.js";
import type { HandlerSafety } from "../src/safety-call.js";
import { back, forward } from "../src/handlers/history.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ALLOWED = "http://localhost:8080/e2e-playground.html";
const LIST = parseBlockList("bank.example");

function view(o: { armed?: boolean; list?: BlockList } = {}): SafetyView {
  const blockList = o.list ?? EMPTY_BLOCK_LIST;
  return { switches: { armed: o.armed ?? true, evaluate: true }, ctx: { extensionId: OWN_ID, blockList }, blockedCount: blockList.blockedCount };
}

function deps(state: () => SafetyView, o: { replacedThrows?: boolean } = {}): CallSafetyDeps {
  return {
    readState: vi.fn(async () => state()),
    getTab: vi.fn(async (id: number) => {
      if (id !== 7 || o.replacedThrows) throw new Error("No tab");
      return { url: ALLOWED };
    }),
    replacedBy: () => {
      if (o.replacedThrows) throw new Error("wiring slip");
      return undefined;
    },
    lastUrl: () => undefined,
  };
}

/** A DnrCall that records the order of what the call does with it. */
function recorder(log: string[], refusal: () => ReturnType<DnrCall["refusal"]> = () => null): DnrCall & { lists: BlockList[] } {
  const lists: BlockList[] = [];
  return {
    lists,
    mark: () => void log.push("mark"),
    install: async (l) => {
      lists.push(l);
      log.push("install");
    },
    refusal: () => {
      log.push("refusal");
      return refusal();
    },
    release: async () => {
      await Promise.resolve();
      log.push("release");
    },
    holding: () => log.includes("install") && !log.includes("release"),
  };
}

describe("CallSafety.effect with a DNR handle", () => {
  it("marks before the re-check's read, installs that read's list after it", async () => {
    const log: string[] = [];
    const d = deps(() => (log.push("read"), view({ list: LIST })));
    const dnr = recorder(log);
    const c = new CallSafety("navigate", { tabId: 7, url: ALLOWED }, d, dnr);
    await c.effect();
    expect(log).toEqual(["mark", "read", "install"]);
    expect(dnr.lists).toEqual([LIST]);
    expect(c.holdsRules()).toBe(true);
  });

  it("a refused re-check (disarmed, blocked target) installs nothing", async () => {
    const log: string[] = [];
    const dnr = recorder(log);
    await expect(new CallSafety("navigate", { tabId: 7, url: ALLOWED }, deps(() => view({ armed: false })), dnr).effect()).rejects.toMatchObject({ code: "DISARMED" });
    await expect(new CallSafety("navigate", { tabId: 7, url: "https://www.bank.example/" }, deps(() => view({ list: LIST })), dnr).effect()).rejects.toMatchObject({ code: "DOMAIN_BLOCKED" });
    expect(log.filter((x) => x === "install")).toEqual([]);
  });

  it("an install that refuses rejects effect() with the state-unreadable refusal, so the side effect never runs", async () => {
    const keeper = new DnrKeeper({
      updateSessionRules: async () => {
        throw new Error("Chrome said no about bank.example");
      },
      getSessionRules: async () => [],
      caps: () => ({ sessionRules: 5000, regexRules: 1000 }),
      extensionId: OWN_ID,
    });
    const c = new CallSafety("back", { tabId: 7 }, deps(() => view({ list: LIST })), keeper.call("back", { tabId: 7 }, "tab"));
    const err = await c.effect().then(() => null, (e: unknown) => e);
    expect(err).toMatchObject({ code: "DISARMED", message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } });
    expect(String((err as Error).message)).not.toContain("bank");
  });
});

describe("CallSafety.post with a DNR handle", () => {
  it("releases before it reads the keeper's refusal; the gate's own refusal wins", async () => {
    const log: string[] = [];
    const ok = new CallSafety("navigate", { tabId: 7, url: ALLOWED }, deps(() => view()), recorder(log, () => stateUnreadableRefusal()));
    expect(await ok.post()).toEqual(stateUnreadableRefusal());
    expect(log).toEqual(["release", "refusal"]);
    const log2: string[] = [];
    const off = new CallSafety("navigate", { tabId: 7, url: ALLOWED }, deps(() => view({ armed: false })), recorder(log2));
    expect(await off.post()).toMatchObject({ code: "DISARMED" });
    expect(log2).toEqual(["release"]);
  });

  it("releases when the gate throws (a wiring slip), and the throw still reaches the router", async () => {
    const log: string[] = [];
    const c = new CallSafety("forward", { tabId: 8 }, deps(() => view(), { replacedThrows: true }), recorder(log));
    await expect(c.post()).rejects.toThrow("wiring slip");
    expect(log).toEqual(["release"]);
  });

  it("without a handle (every uncovered call) post() answers as before", async () => {
    const c = new CallSafety("snapshot", { tabId: 7 }, deps(() => view()));
    expect(await c.post()).toBeNull();
    expect(c.holdsRules()).toBe(false);
  });

  it("with the real keeper: a list change mid-call whose rebuild fails refuses the reply; no rule is left", async () => {
    const rules = new Map<number, DnrRule>();
    let reject = false;
    const keeper = new DnrKeeper({
      updateSessionRules: async (u: DnrUpdate) => {
        if (reject) throw new Error("no");
        for (const id of u.removeRuleIds ?? []) rules.delete(id);
        for (const r of u.addRules ?? []) rules.set(r.id, r);
      },
      getSessionRules: async () => [...rules.values()],
      caps: () => ({ sessionRules: 5000, regexRules: 1000 }),
      extensionId: OWN_ID,
    });
    const c = new CallSafety("navigate", { tabId: 7, url: ALLOWED }, deps(() => view({ list: LIST })), keeper.call("navigate", { tabId: 7 }, "tab"));
    await c.effect();
    expect(rules.size).toBeGreaterThan(0);
    reject = true;
    await keeper.rebuild(parseBlockList("other.example"));
    reject = false;
    expect(await c.post()).toEqual(stateUnreadableRefusal());
    expect(rules.size).toBe(0);
  });
});

describe("DnrKeeper.call(…, only)", () => {
  it("S3a's tab-only handle: navigate/back/forward live, downloadStart and the rest inert", async () => {
    const updates: DnrUpdate[] = [];
    const keeper = new DnrKeeper({
      updateSessionRules: async (u) => void updates.push(u),
      getSessionRules: async () => [],
      caps: () => ({ sessionRules: 5000, regexRules: 1000 }),
      extensionId: OWN_ID,
    });
    const dl = keeper.call("downloadStart", { url: ALLOWED }, "tab");
    await dl.install(LIST);
    expect(updates).toEqual([]);
    for (const m of ["navigate", "back", "forward"]) {
      const h = keeper.call(m, { tabId: 7 }, "tab");
      await h.install(LIST);
      expect(h.holding(), m).toBe(true);
      await h.release();
    }
    expect(updates.length).toBe(6);
  });
});

describe("back/forward's settle wait ends promptly (S3a fixer N1)", () => {
  type L = (...a: never[]) => void;
  function stubChrome(status: string) {
    const updated = new Set<L>();
    const removed = new Set<L>();
    const ev = (s: Set<L>) => ({ addListener: (l: L) => void s.add(l), removeListener: (l: L) => void s.delete(l) });
    vi.stubGlobal("chrome", {
      tabs: {
        get: async (id: number) => ({ id, status }),
        goBack: async () => {},
        goForward: async () => {},
        onUpdated: ev(updated),
        onRemoved: ev(removed),
      },
    });
    return { updated, removed };
  }
  afterEach(() => void vi.unstubAllGlobals());
  const holding = { effect: async () => {}, holdsRules: () => true } as unknown as HandlerSafety;

  it("the tab not loading after the call: no listener is left", async () => {
    const { updated, removed } = stubChrome("complete");
    await back({ tabId: 7 }, holding);
    await forward({ tabId: 7 }, holding);
    expect(updated.size + removed.size).toBe(0);
  });

  it("the tab closed mid-wait: the call answers {ok:true} at once and no listener is left", async () => {
    const { updated, removed } = stubChrome("loading");
    const t0 = Date.now();
    const p = back({ tabId: 7 }, holding);
    await new Promise((r) => setTimeout(r, 10));
    for (const l of [...removed]) (l as (id: number) => void)(7);
    expect(await p).toEqual({ ok: true });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(updated.size + removed.size).toBe(0);
  });
});

describe("sw.ts wiring (static)", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/sw.ts", import.meta.url)), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("one keeper, constructed at the top level with the API read at call time; its start-up clear started", () => {
    expect(code.match(/new DnrKeeper\(/g)).toHaveLength(1);
    expect(code).toMatch(/^const dnrKeeper = new DnrKeeper\(/m);
    expect(code).toMatch(/^void dnrKeeper\.ready;/m);
    expect(code).toContain("chrome.declarativeNetRequest");
  });

  it("the listener count is unchanged (19); the rebuild sits in the safety storage.onChanged listener", () => {
    expect(code.match(/addListener\(/g)).toHaveLength(19);
    const i = code.indexOf("if (area === \"local\" && touchesSafety(changes)) {");
    const j = code.indexOf("ingestGate.flush();", i);
    expect(i).toBeGreaterThan(0);
    expect(code.slice(i, j)).toContain("dnrKeeper.rebuild(v.ctx.blockList)");
    expect(code.slice(i, j)).toContain("dnrKeeper.rebuild(null)");
    expect(code.match(/dnrKeeper\.rebuild\(/g)).toHaveLength(2);
  });

  it("onDisarm sweeps (never clears a live call's rules); the router's factory hands each call its handle (S3b: no filter)", () => {
    const d = code.indexOf("onDisarm:");
    expect(code.slice(d, code.indexOf("onArm:", d))).toContain("void dnrKeeper.sweep();");
    expect(code).toContain("new CallSafety(method, params, callDeps, dnrKeeper.call(method, params))");
  });
});

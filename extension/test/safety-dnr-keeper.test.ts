/**
 * Step 11b S2: the DNR rule keeper (`extension/src/safety-dnr-keeper.ts`) against a fake that holds session rules the
 * way Stage 0 measured Chrome (`Stage0.md` §4): an update is atomic (a rejected one changes nothing), a duplicate id
 * rejects. Exit checks D2.1–D2.4 of the phase doc, plus ids, rebuilds, the empty list and Chrome's text.
 */
import { describe, it, expect } from "vitest";
import { parseBlockList } from "../src/safety-match.js";
import { countRules, rulesOf, type DnrRule } from "../src/safety-dnr.js";
import { STATE_UNREADABLE_MESSAGE, stateUnreadableRefusal, type SafetyRefusal } from "../src/safety.js";
import { BridgeError, ErrorCodes } from "../src/errors.js";
import { GatedRouter } from "../src/router.js";
import type { GatedCall } from "../src/safety-call.js";
import { DnrKeeper, dnrScopeOf, type DnrUpdate } from "../src/safety-dnr-keeper.js";

const EXT = "abcdefghijklmnopabcdefghijklmnop";
const SENTINEL = "zz-sentinel-pattern.example";
const LIST_A = parseBlockList(["a.example", "*.b.example", "c.example:8443"]); // 3 rules: domains + 2 regexes
const LIST_B = parseBlockList(["d.example"]);
const EMPTY = parseBlockList([]);

class FakeDnr {
  rules = new Map<number, DnrRule>();
  updates: DnrUpdate[] = [];
  reject: ((u: DnrUpdate) => boolean) | null = null;
  gets = 0;
  async updateSessionRules(u: DnrUpdate): Promise<void> {
    this.updates.push(u);
    if (this.reject?.(u)) throw new Error(`Rule with id 3 has invalid regexFilter for ${SENTINEL}`);
    const next = new Map(this.rules);
    for (const id of u.removeRuleIds ?? []) next.delete(id);
    for (const r of u.addRules ?? []) {
      if (next.has(r.id)) throw new Error("duplicate id");
      next.set(r.id, r);
    }
    this.rules = next;
  }
  async getSessionRules(): Promise<DnrRule[]> {
    this.gets++;
    return [...this.rules.values()];
  }
}

function setup(caps = { sessionRules: 5000, regexRules: 1000 }) {
  const fake = new FakeDnr();
  const keeper = new DnrKeeper({
    updateSessionRules: (u) => fake.updateSessionRules(u),
    getSessionRules: () => fake.getSessionRules(),
    caps: () => caps,
    extensionId: EXT,
  });
  return { fake, keeper };
}

const nav = (tabId = 7) => ["navigate", { tabId, url: "https://x.example/" }] as const;

async function refusedWith(p: Promise<unknown>): Promise<BridgeError> {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(BridgeError);
  return err as BridgeError;
}

function expectUnreadable(err: BridgeError) {
  expect(err.code).toBe(ErrorCodes.DISARMED);
  expect(err.message).toBe(STATE_UNREADABLE_MESSAGE);
  expect(err.data).toEqual({ scope: "all" });
  expect(JSON.stringify({ m: err.message, d: err.data, s: String(err) })).not.toContain(SENTINEL);
}

describe("dnrScopeOf: install keyed on the method class (F7), newTab uncovered (#295)", () => {
  it("navigate, back, forward → the tab; downloadStart → the download; the rest → none", () => {
    expect(dnrScopeOf("navigate", { tabId: 3 }, EXT)).toEqual({ kind: "tab", tabId: 3 });
    expect(dnrScopeOf("back", { tabId: 3 }, EXT)).toEqual({ kind: "tab", tabId: 3 });
    expect(dnrScopeOf("forward", { tabId: 3 }, EXT)).toEqual({ kind: "tab", tabId: 3 });
    expect(dnrScopeOf("downloadStart", { url: "https://x.example/" }, EXT)).toEqual({ kind: "download", extensionId: EXT });
    for (const m of ["newTab", "snapshot", "focusTab", "closeTab", "click", "evaluate", "uploadFiles", "listTabs"]) {
      expect(dnrScopeOf(m, { tabId: 3 }, EXT)).toBeNull();
    }
    expect(dnrScopeOf("navigate", {}, EXT)).toBeNull();
  });
});

describe("D2.4: the start-up clear", () => {
  it("removes every pre-existing session rule before the first call's rules go in", async () => {
    const { fake, keeper } = setup();
    for (const id of [1, 2, 900]) fake.rules.set(id, { id } as DnrRule);
    const call = keeper.call(...nav());
    await call.install(LIST_A);
    expect(fake.updates[0]).toEqual({ removeRuleIds: [1, 2, 900] });
    expect([...fake.rules.values()].every((r) => r.condition !== undefined)).toBe(true);
    expect(fake.rules.size).toBe(countRules(LIST_A).rules);
    await call.release();
    expect(fake.rules.size).toBe(0);
  });

  it("a failed clear refuses covered calls until a clear succeeds; nothing found → no update", async () => {
    const { fake, keeper } = setup();
    fake.rules.set(5, { id: 5 } as DnrRule);
    fake.reject = () => true;
    expectUnreadable(await refusedWith(keeper.call(...nav()).install(LIST_A)));
    fake.reject = null;
    const ok = keeper.call(...nav());
    await ok.install(LIST_A);
    expect(fake.rules.has(5)).toBe(false);
    await ok.release();
    expect(fake.rules.size).toBe(0);
    const fresh = setup();
    await fresh.keeper.ready;
    expect(fresh.fake.updates).toEqual([]);
  });
});

describe("install: once per call, keyed on the class", () => {
  it("a second install adds nothing; an uncovered call installs nothing", async () => {
    const { fake, keeper } = setup();
    const call = keeper.call("downloadStart", { url: "https://x.example/" });
    await call.install(LIST_A);
    await call.install(LIST_A); // checkFinalUrl's effect()
    expect(fake.updates.length).toBe(1);
    expect([...fake.rules.values()].every((r) => r.condition.tabIds[0] === -1)).toBe(true);
    const snap = keeper.call("snapshot", { tabId: 7 });
    await snap.install(LIST_A);
    await snap.release();
    expect(fake.updates.length).toBe(1);
    await call.release();
    expect(fake.rules.size).toBe(0);
  });

  it("an empty list makes no API call: install, rebuild, release", async () => {
    const { fake, keeper } = setup();
    const call = keeper.call(...nav());
    await call.install(EMPTY);
    await keeper.rebuild(EMPTY);
    await call.release();
    expect(fake.updates).toEqual([]);
  });

  it("D2.2: a rejecting install refuses DISARMED/STATE_UNREADABLE before the effect, without Chrome's text", async () => {
    const { fake, keeper } = setup();
    fake.reject = (u) => (u.addRules ?? []).length > 0;
    let effects = 0;
    const call = keeper.call(...nav());
    const effect = async () => {
      await call.install(LIST_A);
      effects++;
    };
    expectUnreadable(await refusedWith(effect()));
    expectUnreadable(await refusedWith(effect())); // the same answer on a second effect()
    expect(effects).toBe(0);
    expect(fake.rules.size).toBe(0);
    await call.release();
    expect(fake.rules.size).toBe(0);
  });

  it("past the caps (summed over live calls) fails closed with no API call", async () => {
    const { fake, keeper } = setup({ sessionRules: 4, regexRules: 1000 });
    const one = keeper.call(...nav(1));
    await one.install(LIST_A); // 3 rules
    const n = fake.updates.length;
    expectUnreadable(await refusedWith(keeper.call(...nav(2)).install(LIST_A)));
    expect(fake.updates.length).toBe(n);
    const fits = keeper.call(...nav(3));
    await fits.install(LIST_B); // 1 rule: 4 in all
    await Promise.all([one.release(), fits.release()]);
    expect(fake.rules.size).toBe(0);
    const regexCapped = setup({ sessionRules: 5000, regexRules: 1 });
    expectUnreadable(await refusedWith(regexCapped.keeper.call(...nav()).install(LIST_A)));
    expect(regexCapped.fake.updates).toEqual([]);
  });

  it("a list change after the call was made and before its install refuses the install (its read may be stale)", async () => {
    const { fake, keeper } = setup();
    const call = keeper.call(...nav());
    await keeper.rebuild(LIST_B);
    expectUnreadable(await refusedWith(call.install(LIST_A)));
    expect(fake.rules.size).toBe(0);
    const late = keeper.call(...nav());
    late.mark();
    await late.install(LIST_B);
    await late.release();
    expect(fake.rules.size).toBe(0);
  });
});

describe("ids: concurrent calls never share or leak", () => {
  it("parallel installs get disjoint ranges; released ids are gone and never reused", async () => {
    const { fake, keeper } = setup();
    const calls = [1, 2, 3, 4, 5].map((t) => keeper.call(...nav(t)));
    await Promise.all(calls.map((c, i) => c.install(i % 2 ? LIST_A : LIST_B)));
    const ids = [...fake.rules.keys()];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(3 * 2 + 1 * 3);
    for (const i of calls.keys()) {
      const own = [...fake.rules.values()].filter((r) => r.condition.tabIds[0] === i + 1);
      expect(own.length).toBe(countRules(i % 2 ? LIST_A : LIST_B).rules);
    }
    await Promise.all(calls.map((c) => c.release()));
    expect(fake.rules.size).toBe(0);
    const next = keeper.call(...nav(9));
    await next.install(LIST_A);
    expect([...fake.rules.keys()].some((id) => ids.includes(id))).toBe(false);
    await next.release();
    expect(fake.rules.size).toBe(0);
  });

  it("a release that overtakes its own install leaves nothing", async () => {
    const { fake, keeper } = setup();
    const call = keeper.call(...nav());
    const installing = call.install(LIST_A).catch(() => {});
    await call.release();
    await installing;
    expect(fake.rules.size).toBe(0);
  });
});

describe("rebuild on a list change", () => {
  it("rebuilds every live call's rules in one atomic update, empty → non-empty included", async () => {
    const { fake, keeper } = setup();
    const a = keeper.call(...nav(1));
    const b = keeper.call(...nav(2));
    await a.install(LIST_A);
    await b.install(EMPTY);
    const n = fake.updates.length;
    await keeper.rebuild(LIST_B);
    expect(fake.updates.length).toBe(n + 1);
    const strip = (r: DnrRule) => ({ ...r, id: 0 });
    const held = [...fake.rules.values()].map(strip);
    expect(held).toEqual(
      expect.arrayContaining([...rulesOf(LIST_B, { kind: "tab", tabId: 1 }, 1), ...rulesOf(LIST_B, { kind: "tab", tabId: 2 }, 1)].map(strip)),
    );
    expect(held.length).toBe(2);
    expect(a.refusal()).toBeNull();
    await keeper.rebuild(EMPTY);
    expect(fake.rules.size).toBe(0);
    await Promise.all([a.release(), b.release()]);
    expect(fake.rules.size).toBe(0);
  });

  it("D2.3: a rejecting rebuild keeps the previous rules, refuses live replies and new calls until a good rebuild", async () => {
    const { fake, keeper } = setup();
    const live = keeper.call(...nav(1));
    await live.install(LIST_A);
    const before = new Map(fake.rules);
    fake.reject = () => true;
    await keeper.rebuild(LIST_B);
    expect(fake.rules).toEqual(before);
    expect(keeper.synced).toBe(false);
    expect(live.refusal()).toEqual(stateUnreadableRefusal());
    expect(JSON.stringify(live.refusal())).not.toContain(SENTINEL);
    fake.reject = null;
    const n = fake.updates.length;
    const blocked = keeper.call(...nav(2));
    expectUnreadable(await refusedWith(blocked.install(LIST_B)));
    expect(fake.updates.length).toBe(n);
    await keeper.rebuild(LIST_B);
    expect(keeper.synced).toBe(true);
    const ok = keeper.call(...nav(3));
    await ok.install(LIST_B);
    expect(ok.refusal()).toBeNull();
    expect(live.refusal()).not.toBeNull(); // its reply stays refused
    await Promise.all([live.release(), ok.release(), blocked.release()]);
    expect(fake.rules.size).toBe(0);
  });

  it("an unreadable state (null) keeps the rules, refuses live replies, makes no API call", async () => {
    const { fake, keeper } = setup();
    const live = keeper.call(...nav(1));
    await live.install(LIST_A);
    const n = fake.updates.length;
    await keeper.rebuild(null);
    expect(fake.updates.length).toBe(n);
    expect(fake.rules.size).toBe(3);
    expect(live.refusal()).toEqual(stateUnreadableRefusal());
    await live.release();
    expect(fake.rules.size).toBe(0);
  });
});

describe("disarm and orphans", () => {
  it("a disarm (sweep) never lifts a live call's rules; it removes only rules no live call owns", async () => {
    const { fake, keeper } = setup();
    const live = keeper.call(...nav(1));
    const gone = keeper.call(...nav(2));
    await live.install(LIST_A);
    await gone.install(LIST_B);
    fake.reject = () => true;
    await gone.release(); // removal rejected: an orphan
    expect(fake.rules.size).toBe(4);
    fake.reject = null;
    await keeper.sweep();
    expect([...fake.rules.values()].every((r) => r.condition.tabIds[0] === 1)).toBe(true);
    expect(fake.rules.size).toBe(3);
    const n = fake.updates.length;
    await keeper.sweep(); // nothing orphaned: no call
    expect(fake.updates.length).toBe(n);
    await live.release();
    expect(fake.rules.size).toBe(0);
  });

  it("V4: an install's update retries the orphans in the same update, so no rule outlives its call past it", async () => {
    const { fake, keeper } = setup();
    const gone = keeper.call(...nav(2));
    await gone.install(LIST_B);
    const orphanIds = [...fake.rules.keys()];
    fake.reject = () => true;
    await gone.release(); // removal rejected: an orphan
    fake.reject = null;
    const next = keeper.call(...nav(1));
    await next.install(LIST_A);
    expect(fake.updates.at(-1)?.removeRuleIds).toEqual(orphanIds);
    expect([...fake.rules.values()].every((r) => r.condition.tabIds[0] === 1)).toBe(true);
    expect(fake.rules.size).toBe(3);
    await next.release();
    expect(fake.rules.size).toBe(0);
  });
});

describe("V5: an install after its call's release", () => {
  it("installs nothing and leaves zero rules", async () => {
    const { fake, keeper } = setup();
    const call = keeper.call(...nav());
    await call.release();
    expectUnreadable(await refusedWith(call.install(LIST_A)));
    expect(fake.rules.size).toBe(0);
    expect(fake.updates.filter((u) => (u.addRules ?? []).length > 0)).toEqual([]);
  });
});

/** The real router over a GatedCall that installs in `effect()` and releases after the post-check (S3's shape). */
function routed(keeper: DnrKeeper, post: () => SafetyRefusal | null, handler: Parameters<GatedRouter["on"]>[1]) {
  const router = new GatedRouter((method, params) => {
    const dnr = keeper.call(method, params);
    return {
      receipt: async () => "allow",
      effect: () => dnr.install(LIST_A),
      checkFinalUrl: () => dnr.install(LIST_A),
      onRefused: () => {},
      runRefused: () => {},
      redactRows: async () => [],
      networkFilter: async () => () => true,
      post: async () => {
        try {
          return post() ?? dnr.refusal();
        } finally {
          await dnr.release();
        }
      },
    } satisfies GatedCall;
  });
  router.on("navigate", handler);
  return async () => (await router.handle(JSON.stringify({ id: "1", method: "navigate", params: { tabId: 4 } })))!;
}

describe("D2.1: a rule removed on each of five paths (the real GatedRouter)", () => {
  const off: SafetyRefusal = { code: ErrorCodes.DISARMED, message: "off", data: { scope: "all" } };
  const paths = { success: undefined, refusal: "DOMAIN_BLOCKED", error: "INTERNAL", timeout: "TIMEOUT", disarm: "DISARMED" };

  for (const [path, want] of Object.entries(paths)) {
    it(path, async () => {
      const { fake, keeper } = setup();
      let during = 0;
      const post = () => (path === "refusal" ? { code: ErrorCodes.DOMAIN_BLOCKED, message: "blocked" } : path === "disarm" ? off : null);
      const send = routed(keeper, post, async (_p, call) => {
        await call.effect();
        during = fake.rules.size;
        if (path === "error") throw new Error("boom");
        if (path === "timeout") throw new BridgeError(ErrorCodes.TIMEOUT, "slow");
        if (path === "disarm") throw new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" });
        return { ok: true };
      });
      const reply = JSON.parse(await send());
      expect(during).toBe(3);
      expect(fake.rules.size).toBe(0);
      expect(reply.error?.code).toBe(want);
    });
  }

  it("a rejecting install never reaches the wire with Chrome's text", async () => {
    const { fake, keeper } = setup();
    fake.reject = (u) => (u.addRules ?? []).length > 0;
    let effects = 0;
    const send = routed(keeper, () => null, async (_p, call) => {
      await call.effect();
      effects++;
      return { ok: true };
    });
    const raw = await send();
    expect(raw).not.toContain(SENTINEL);
    expect(JSON.parse(raw).error).toEqual({ code: "DISARMED", message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } });
    expect(effects).toBe(0);
    expect(fake.rules.size).toBe(0);
  });
});

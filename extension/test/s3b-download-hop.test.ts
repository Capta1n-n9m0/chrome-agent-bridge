/**
 * Step 11b S3b: the download half of the rule keeper (#293, #296) and #302's narrowed rebuild.
 * - `BlockedHopWatcher` (`safety-hop.ts`): only the worker's own blocked request whose URL the call's list blocks
 *   counts; nothing of the event is kept.
 * - `CallSafety`: a `downloadStart` holding rules opens one watch at its first `effect()` and closes it at `post()`.
 * - `downloadStart`: a fetch failure with a blocked hop answers `DOMAIN_BLOCKED` with the block message, no `data`;
 *   any other fetch failure keeps today's answer.
 * - `rebuildsRules` (`safety-state.ts`): only a block-list edit or an unreadable state rebuilds.
 * - `sw.ts` statically: the recogniser reads `onErrorOccurred` before `ingest`; the rebuild is guarded.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ErrorCodes } from "@bridge/shared";
import { BlockedHopWatcher, BLOCKED_BY_CLIENT, HOP_SETTLE_MS } from "../src/safety-hop.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { DnrKeeper, type DnrUpdate } from "../src/safety-dnr-keeper.js";
import type { DnrRule } from "../src/safety-dnr.js";
import { BLOCKED_URL_MESSAGE } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST, type BlockList } from "../src/safety-match.js";
import { rebuildsRules, type SafetyView } from "../src/safety-state.js";
import { downloadStart, clearDownloads } from "../src/handlers/download.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${OWN_ID}`;
const LIST = parseBlockList("bank.example");
const HOP = "https://www.bank.example/statement.pdf?sig=SECRET-TOKEN-XYZ";
const ALLOWED = "http://localhost:8080/dl/hello.txt";
const hopEvent = (o: Record<string, unknown> = {}) => ({
  tabId: -1,
  type: "xmlhttprequest",
  initiator: ORIGIN,
  error: BLOCKED_BY_CLIENT,
  url: HOP,
  ...o,
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearDownloads();
});

describe("BlockedHopWatcher", () => {
  it("the worker's own blocked request whose URL the list blocks is a hit", async () => {
    const w = new BlockedHopWatcher(OWN_ID);
    const watch = w.open(LIST);
    w.offer(hopEvent());
    expect(watch.blocked()).toBe(true);
    expect(await watch.settle(10_000)).toBe(true);
  });

  it("any other event is not: another tab, type, error, initiator, or a URL the list does not block", async () => {
    for (const o of [
      { tabId: 5 },
      { type: "main_frame" },
      { error: "net::ERR_CONNECTION_REFUSED" },
      { initiator: "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba" },
      { initiator: undefined },
      { url: "https://elsewhere.example/x" },
      { url: "https://notbank.example/x" },
      { url: 42 },
    ]) {
      const w = new BlockedHopWatcher(OWN_ID);
      const watch = w.open(LIST);
      w.offer(hopEvent(o));
      expect(watch.blocked(), JSON.stringify(o)).toBe(false);
      expect(await watch.settle(5)).toBe(false);
    }
  });

  it("settle waits for a hit that arrives later; close ends the watch and its wait", async () => {
    const w = new BlockedHopWatcher(OWN_ID);
    const a = w.open(LIST);
    const p = a.settle(10_000);
    setTimeout(() => w.offer(hopEvent()), 5);
    expect(await p).toBe(true);
    const b = w.open(LIST);
    const q = b.settle(10_000);
    b.close();
    expect(await q).toBe(false);
    a.close();
    expect(w.size).toBe(0);
    w.offer(hopEvent());
    expect(b.blocked()).toBe(false);
  });

  it("each watch tests its own list; offer never throws", () => {
    const w = new BlockedHopWatcher(OWN_ID);
    const empty = w.open(EMPTY_BLOCK_LIST);
    const own = w.open(LIST);
    for (const bad of [null, undefined, {}, { get tabId(): number { throw new Error("x"); } }]) expect(() => w.offer(bad as never)).not.toThrow();
    w.offer(hopEvent());
    expect([empty.blocked(), own.blocked()]).toEqual([false, true]);
  });

  it("keeps no URL: nothing reachable from the watcher holds the event's URL after a hit", () => {
    const w = new BlockedHopWatcher(OWN_ID);
    const watch = w.open(LIST);
    w.offer(hopEvent());
    const seen = new Set<unknown>();
    const strings: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === "string") return void strings.push(v);
      if (typeof v !== "object" || v === null || seen.has(v)) return;
      seen.add(v);
      const items = v instanceof Set || v instanceof Map ? [...v.entries()] : Object.values(v);
      for (const x of items) walk(x);
    };
    walk(w);
    walk(watch);
    expect(strings.some((s) => s.includes("SECRET-TOKEN-XYZ") || s.includes("statement.pdf"))).toBe(false);
  });

  it("the module (static): no log call, and no field is assigned from the URL", () => {
    const src = readFileSync(fileURLToPath(new URL("../src/safety-hop.ts", import.meta.url)), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(code).not.toMatch(/console\.|\blog\(/);
    expect(code).not.toMatch(/this\.\w+\s*=[^;]*\burl\b/);
  });
});

function view(list: BlockList): SafetyView {
  return { switches: { armed: true, evaluate: true }, ctx: { extensionId: OWN_ID, blockList: list }, blockedCount: list.blockedCount };
}

/** A fake DNR that keeps the rule set as Chrome would. */
function fakeDnr() {
  const rules = new Map<number, DnrRule>();
  const updates: DnrUpdate[] = [];
  const keeper = new DnrKeeper({
    updateSessionRules: async (u) => {
      updates.push(u);
      for (const id of u.removeRuleIds ?? []) rules.delete(id);
      for (const r of u.addRules ?? []) rules.set(r.id, r);
    },
    getSessionRules: async () => [...rules.values()],
    caps: () => ({ sessionRules: 5000, regexRules: 1000 }),
    extensionId: OWN_ID,
  });
  return { rules, updates, keeper };
}

function callFor(method: string, params: Record<string, unknown>, list: BlockList, keeper: DnrKeeper, watcher: BlockedHopWatcher) {
  const watchHops = vi.fn((l: BlockList) => watcher.open(l));
  const deps: CallSafetyDeps = {
    readState: async () => view(list),
    getTab: async () => ({ url: ALLOWED }),
    replacedBy: () => undefined,
    lastUrl: () => undefined,
    watchHops,
  };
  return { call: new CallSafety(method, params, deps, keeper.call(method, params)), watchHops };
}

describe("CallSafety: a download's watch", () => {
  it("opens once at the first effect (the second, checkFinalUrl's, adds none) and closes at post", async () => {
    const { keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID);
    const { call, watchHops } = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w);
    await call.effect();
    await call.checkFinalUrl(ALLOWED);
    expect(watchHops).toHaveBeenCalledTimes(1);
    expect(watchHops.mock.calls[0][0]).toBe(LIST);
    expect(w.size).toBe(1);
    expect(await call.post()).toBeNull();
    expect(w.size).toBe(0);
  });

  it("no watch with an empty list (no rule held) or for a navigate", async () => {
    const { keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID);
    const a = callFor("downloadStart", { url: ALLOWED }, EMPTY_BLOCK_LIST, keeper, w);
    await a.call.effect();
    expect(await a.call.hopBlocked()).toBe(false);
    const b = callFor("navigate", { tabId: 7, url: ALLOWED }, LIST, keeper, w);
    await b.call.effect();
    expect(a.watchHops).not.toHaveBeenCalled();
    expect(b.watchHops).not.toHaveBeenCalled();
    await a.call.post();
    await b.call.post();
  });
});

describe("downloadStart: a blocked hop and other fetch failures", () => {
  it("end to end: typed download rules installed, the hop event seen, DOMAIN_BLOCKED with the block message and no data, no rule left", async () => {
    const { rules, keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID);
    const { call } = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w);
    let atFetch: DnrRule[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        atFetch = [...rules.values()];
        w.offer(hopEvent()); // Chrome blocks the redirect hop: the event, then the rejection
        throw new TypeError("Failed to fetch");
      }),
    );
    const err = await downloadStart({ url: ALLOWED }, call).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED, message: BLOCKED_URL_MESSAGE });
    expect(err.message).toBe("That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user.");
    expect(err.data).toBeUndefined();
    expect(atFetch.length).toBeGreaterThan(0);
    for (const r of atFetch) {
      expect(r.condition.resourceTypes).toEqual(["xmlhttprequest"]);
      expect(r.condition.tabIds).toEqual([-1]);
      expect(r.condition.initiatorDomains).toEqual([OWN_ID]);
    }
    await call.post();
    expect(rules.size).toBe(0);
  });

  it("the event after the rejection still counts (the bounded settle)", async () => {
    const { keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID);
    const { call } = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        setTimeout(() => w.offer(hopEvent()), 20);
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(downloadStart({ url: ALLOWED }, call)).rejects.toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED, message: BLOCKED_URL_MESSAGE });
    await call.post();
  });

  it("a fetch failure with no blocked hop keeps today's answer (the same error as with no call)", async () => {
    const failing = () => vi.fn(async () => Promise.reject(new TypeError("Failed to fetch")));
    vi.stubGlobal("fetch", failing());
    const today = await downloadStart({ url: ALLOWED }).catch((e) => e);
    const { keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID);
    const { call } = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w);
    vi.stubGlobal("fetch", failing());
    w.offer(hopEvent({ error: "net::ERR_NAME_NOT_RESOLVED" })); // not a block
    const now = await downloadStart({ url: ALLOWED }, call).catch((e) => e);
    expect(now).toBeInstanceOf(TypeError);
    expect([now.constructor, now.message, now.code]).toEqual([today.constructor, today.message, today.code]);
    await call.post();
  });
});

describe("S3b fixer: only a rejected fetch asks, and only a recent hit counts", () => {
  it("a 404 or a body-read error keeps today's answer, data included, with no wait, while another call's hop was seen", async () => {
    const { keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID);
    const other = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w).call;
    await other.effect();
    const notFound = () => new Response("nf", { status: 404, statusText: "Not Found", headers: { "content-type": "text/html" } });
    const badBody = () => ({ ok: true, status: 200, url: ALLOWED, headers: new Headers(), arrayBuffer: () => Promise.reject(new Error("body read")) });
    for (const answer of [notFound, badBody]) {
      vi.stubGlobal("fetch", vi.fn(async () => answer()));
      const today = await downloadStart({ url: ALLOWED }).catch((e) => e);
      const { call } = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w);
      vi.stubGlobal("fetch", vi.fn(async () => (w.offer(hopEvent()), answer())));
      const t0 = Date.now();
      const now = await downloadStart({ url: ALLOWED }, call).catch((e) => e);
      expect(Date.now() - t0).toBeLessThan(150);
      expect([now.constructor, now.message, now.code, now.data]).toEqual([today.constructor, today.message, today.code, today.data]);
      await call.post();
    }
    expect(await other.post()).toBeNull();
  });

  it("another download's blocked hop older than the settle window does not rename a genuine network failure", async () => {
    let t = 0;
    const { keeper } = fakeDnr();
    const w = new BlockedHopWatcher(OWN_ID, () => t);
    const b = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w).call;
    const a = callFor("downloadStart", { url: ALLOWED }, LIST, keeper, w).call;
    await b.effect();
    vi.stubGlobal("fetch", vi.fn(async () => { w.offer(hopEvent()); t += HOP_SETTLE_MS + 1; throw new TypeError("Failed to fetch"); }));
    const err = await downloadStart({ url: ALLOWED }, a).catch((e) => e);
    expect(err).toBeInstanceOf(TypeError);
    await a.post();
    await b.post();
  });

  it("a hit exactly HOP_SETTLE_MS before the rejection still counts", async () => {
    let t = 1000;
    const w = new BlockedHopWatcher(OWN_ID, () => t);
    const watch = w.open(LIST);
    w.offer(hopEvent());
    t += HOP_SETTLE_MS;
    expect(await watch.settle()).toBe(true);
    t += 1;
    expect(await watch.settle(0)).toBe(false);
  });
});

describe("rebuildsRules (#302): only a block-list edit or an unreadable state", () => {
  const ok = { armed: true, evaluate: true, blockList: "bank.example", uploadFolders: "" };
  const ch = (k: string, oldValue: unknown, newValue: unknown) => ({ [k]: { oldValue, newValue } });
  it("a switch or Upload-folders change alone does not rebuild", () => {
    expect(rebuildsRules(ch("safety.evaluate", true, false), ok)).toBe(false);
    expect(rebuildsRules(ch("safety.armed", true, false), ok)).toBe(false);
    expect(rebuildsRules(ch("safety.uploadFolders", "", "C:\\x"), ok)).toBe(false);
    expect(rebuildsRules(ch("safety.blockList", "a.example", "a.example"), ok)).toBe(false);
    expect(rebuildsRules(ch("safety.blockList", undefined, ""), ok)).toBe(false);
    // unreadable -> readable through another key: new calls install from their own reads, so no rebuild is owed
    expect(rebuildsRules(ch("safety.evaluate", "yes", true), ok)).toBe(false);
  });
  it("a list edit, a removed list, a malformed change or an unreadable state rebuilds", () => {
    expect(rebuildsRules(ch("safety.blockList", "", "bank.example"), ok)).toBe(true);
    expect(rebuildsRules(ch("safety.blockList", "bank.example", undefined), ok)).toBe(true);
    expect(rebuildsRules({ "safety.blockList": 5 }, ok)).toBe(true);
    expect(rebuildsRules(ch("safety.evaluate", true, "yes"), { unreadable: true })).toBe(true);
  });
});

describe("sw.ts wiring (static, S3b)", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/sw.ts", import.meta.url)), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  it("the recogniser reads onErrorOccurred inside the existing listener, before ingest", () => {
    const i = code.indexOf("chrome.webRequest.onErrorOccurred.addListener(");
    const body = code.slice(i, code.indexOf("ALL_URLS", i));
    expect(body.indexOf("hopWatcher.offer(d);")).toBeGreaterThan(0);
    expect(body.indexOf("hopWatcher.offer(d);")).toBeLessThan(body.indexOf('ingest("onErrorOccurred"'));
    expect(code.match(/new BlockedHopWatcher\(/g)).toHaveLength(1);
    expect(code).toContain("watchHops: (list) => hopWatcher.open(list)");
  });
  it("the rebuild runs only when rebuildsRules says so; every covered call gets its handle", () => {
    expect(code).toMatch(/if \(rebuildsRules\(changes, safety\.memory\)\) void safety\.read\(\)\.then\(/);
    expect(code).toContain("new CallSafety(method, params, callDeps, dnrKeeper.call(method, params))");
  });
});

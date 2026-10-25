/**
 * Step 10 S4.3 (phase doc 0.4 (B), amended by Stage 0 F4, F6; decisions.md #205): the three new methods
 * `evaluateSaveStart`, `evaluateSaveChunk`, `evaluateSaveEnd` are classified `"evaluate"`, so the kill
 * switch, the JavaScript switch and the block list refuse each one at receipt and at the post-check, exactly
 * as `evaluate`. JavaScript off: each new method's refusal EQUALS `evaluate`'s own refusal for the same state
 * (asserted by equality, so S4b changes no text here). The store is emptied at a disarm, at JavaScript off,
 * on the tab's close or replacement, and after the TTL (`s4-save-store.test.ts`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ErrorCodes } from "@bridge/shared";
import { GatedRouter } from "../src/router.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { METHOD_CLASSES, methodClass, routerMethodNames, safetyDecision, DISARMED_ALL_MESSAGE, type SafetyTarget } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import { SafetyStore, type SafetyView } from "../src/safety-state.js";
import { clearEvaluateSaves, evaluateSaveChunk, evaluateSaveStart } from "../src/handlers/evaluate-save.js";
import { FakeCdp } from "./s4-fake-cdp.js";

const NEW_METHODS = ["evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd"] as const;
const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ALLOWED = "http://localhost:8080/e2e-playground.html";
const BLOCKED = "https://www.bank.example/account";
const SW = readFileSync(fileURLToPath(new URL("../src/sw.ts", import.meta.url)), "utf8");

function view(o: { armed?: boolean; evaluate?: boolean; list?: string } = {}): SafetyView {
  const blockList = o.list ? parseBlockList(o.list) : EMPTY_BLOCK_LIST;
  return { switches: { armed: o.armed ?? true, evaluate: o.evaluate ?? true }, ctx: { extensionId: OWN_ID, blockList }, blockedCount: blockList.blockedCount };
}

function harness(state: () => SafetyView, tabs: Record<number, { url?: string }>) {
  const deps: CallSafetyDeps = {
    readState: async () => state(),
    getTab: async (id: number) => {
      const t = tabs[id];
      if (!t) throw new Error(`No tab with id: ${id}.`);
      return t;
    },
    replacedBy: () => undefined,
    lastUrl: () => undefined,
  };
  const router = new GatedRouter((method, params) => new CallSafety(method, params, deps));
  const calls: string[] = [];
  for (const m of ["evaluate", ...NEW_METHODS]) {
    router.on(m, async () => {
      calls.push(m);
      return { ok: true };
    });
  }
  return { router, calls };
}

const params = (m: string): Record<string, unknown> =>
  m === "evaluate" || m === "evaluateSaveStart" ? { tabId: 7, expression: "1" } : { tabId: 7, id: "es1-x", offset: 0 };

async function reply(router: GatedRouter, m: string): Promise<{ error?: unknown; result?: unknown }> {
  return JSON.parse((await router.handle(JSON.stringify({ id: "1", method: m, params: params(m) })))!);
}

describe("S4.3 — the table and the router scan", () => {
  it("each new method is classified evaluate (an entry for the new methods only)", () => {
    for (const m of NEW_METHODS) expect(METHOD_CLASSES[m]).toBe("evaluate");
    expect(methodClass("evaluate")).toBe("evaluate");
  });

  it("sw.ts registers each with a string-literal router.on; the scan still finds no non-literal name", () => {
    const { names, nonLiteral } = routerMethodNames(SW);
    expect(nonLiteral).toEqual([]);
    for (const m of NEW_METHODS) expect(names).toContain(m);
    expect([...names].sort()).toEqual(Object.keys(METHOD_CLASSES).sort());
  });
});

describe("S4.3 — refusals equal evaluate's (by equality)", () => {
  const targets: SafetyTarget[] = [
    { kind: "live", urls: [ALLOWED] },
    { kind: "live", urls: [BLOCKED] },
    { kind: "replaced", urls: [BLOCKED] },
    { kind: "gone", lastUrl: BLOCKED },
    { kind: "gone" },
  ];
  it("safetyDecision: every state × target × phase gives the new methods evaluate's decision", () => {
    const ctx = { extensionId: OWN_ID, blockList: parseBlockList("bank.example") };
    let n = 0;
    for (const armed of [true, false]) {
      for (const evaluate of [true, false]) {
        for (const t of targets) {
          for (const phase of ["receipt", "effect", "post"] as const) {
            const want = safetyDecision("evaluate", {}, t, { armed, evaluate }, ctx, phase);
            for (const m of NEW_METHODS) {
              expect(safetyDecision(m, {}, t, { armed, evaluate }, ctx, phase), `${m} ${armed} ${evaluate} ${t.kind} ${phase}`).toEqual(want);
              n++;
            }
          }
        }
      }
    }
    expect(n).toBe(2 * 2 * 5 * 3 * 3);
  });

  it("JavaScript off: each new method's wire refusal equals evaluate's; no handler runs", async () => {
    const { router, calls } = harness(() => view({ evaluate: false }), { 7: { url: ALLOWED } });
    const want = (await reply(router, "evaluate")).error;
    expect(want).toMatchObject({ code: ErrorCodes.DISARMED }); // at S4: DISARMED {scope:"evaluate"}; after S4b: JS_DISABLED
    for (const m of NEW_METHODS) expect((await reply(router, m)).error, m).toEqual(want);
    expect(calls).toEqual([]);
  });

  it("disarmed: DISARMED {scope:\"all\"} for each; no handler runs", async () => {
    const { router, calls } = harness(() => view({ armed: false }), { 7: { url: ALLOWED } });
    for (const m of NEW_METHODS) {
      expect((await reply(router, m)).error).toEqual({ code: ErrorCodes.DISARMED, message: DISARMED_ALL_MESSAGE, data: { scope: "all" } });
    }
    expect(calls).toEqual([]);
  });

  it("a blocked tab refuses each pull (DOMAIN_BLOCKED), as evaluate", async () => {
    const { router, calls } = harness(() => view({ list: "bank.example" }), { 7: { url: BLOCKED } });
    const want = (await reply(router, "evaluate")).error;
    expect(want).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    for (const m of NEW_METHODS) expect((await reply(router, m)).error, m).toEqual(want);
    expect(calls).toEqual([]);
  });

  it("the tab becomes blocked during a pull: the post-check replaces the reply", async () => {
    const tabs: Record<number, { url?: string }> = { 7: { url: ALLOWED } };
    const deps: CallSafetyDeps = {
      readState: async () => view({ list: "bank.example" }),
      getTab: async (id) => tabs[id]!,
      replacedBy: () => undefined,
      lastUrl: () => undefined,
    };
    const router = new GatedRouter((method, p) => new CallSafety(method, p, deps));
    router.on("evaluateSaveChunk", async () => {
      tabs[7] = { url: BLOCKED };
      return { data: "QUJD" };
    });
    const out = await reply(router, "evaluateSaveChunk");
    expect(out.result).toBeUndefined();
    expect(out.error).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
  });

  it("armed, JavaScript on, an empty list: each new method reaches its handler", async () => {
    const { router, calls } = harness(() => view(), { 7: { url: ALLOWED } });
    for (const m of NEW_METHODS) expect((await reply(router, m)).result).toEqual({ ok: true });
    expect(calls).toEqual([...NEW_METHODS]);
  });
});

describe("S4.3 — the store is dropped at disarm, JavaScript off and tab close (wiring in sw.ts)", () => {
  let cdp: FakeCdp;
  beforeEach(() => {
    cdp = new FakeCdp(() => Promise.resolve("held"));
    vi.stubGlobal("chrome", {
      tabs: { get: vi.fn(async (id: number) => ({ id, url: ALLOWED, discarded: false })) },
      debugger: {
        attach: vi.fn(async () => {}),
        detach: vi.fn(async () => {}),
        sendCommand: vi.fn(async (_t: unknown, method: string, p: Record<string, unknown>) => cdp.send(method, p)),
      },
    });
  });
  afterEach(() => {
    clearEvaluateSaves();
    vi.unstubAllGlobals();
  });

  it("a disarm (the SafetyStore's onDisarm, as sw.ts wires it) empties the store", async () => {
    const start = await evaluateSaveStart({ tabId: 7, expression: "1" });
    const stored: Record<string, unknown> = {};
    const safety = new SafetyStore({
      get: async () => ({ ...stored }),
      set: async (items) => void Object.assign(stored, items),
      extensionId: OWN_ID,
      now: () => 100_000,
      onDisarm: () => void clearEvaluateSaves(),
    });
    await safety.start();
    expect(await safety.toggle()).toBe("disarmed");
    await expect(evaluateSaveChunk({ tabId: 7, id: start.id, offset: 0 })).rejects.toThrow(/Unknown or expired evaluateSave id/);
  });

  it("sw.ts: onDisarm clears the store; the storage.onChanged listener clears it when JavaScript turns off", () => {
    const onDisarm = /onDisarm:\s*\(\)\s*=>\s*\{([\s\S]*?)\n  \},/.exec(SW)?.[1] ?? "";
    expect(onDisarm).toContain("clearDownloads();");
    expect(onDisarm).toContain("clearEvaluateSaves();");
    expect(SW).toMatch(/chrome\.storage\.onChanged\.addListener\(\(changes, area\) => \{[\s\S]*?safety\.applyChanges\(changes\);[\s\S]*?if \(javaScriptOff\(safety\.memory\)\) clearEvaluateSaves\(\);/);
  });

  it("sw.ts: the tab's close and replacement drop its entries (top-level tabs listeners)", () => {
    // `\r?\n`: the working copy may have CRLF line ends (core.autocrlf).
    expect(SW).toMatch(/chrome\.tabs\.onRemoved\.addListener\(\(tabId\) => \{\r?\n  networkLog\.forgetTab\(tabId\);\r?\n  dropEvaluateSavesForTab\(tabId\);/);
    expect(SW).toMatch(/chrome\.tabs\.onReplaced\.addListener\(\(addedTabId, removedTabId\) => \{\r?\n  dropEvaluateSavesForTab\(removedTabId\);/);
  });

  it("sw.ts: the three methods are registered", () => {
    expect(SW).toContain('router.on("evaluateSaveStart", evaluateSaveStart);');
    expect(SW).toContain('router.on("evaluateSaveChunk", evaluateSaveChunk);');
    expect(SW).toContain('router.on("evaluateSaveEnd", evaluateSaveEnd);');
  });
});

/**
 * Step 9 S2a, exit check S2.1 (with #141's stricter wording): no handler runs before the gate — a test over
 * the gated router with a disarmed state: zero handler calls; also for an unknown method, bad JSON and a
 * handler that throws before its first await. Also: `GatedRouter.on` throws on a method with no safety class
 * (S1.1's second half, #147); a refusal at the post-check replaces the reply; a throw from the gate is
 * `INTERNAL`, never an allow; the state is read per call and an unreadable state refuses (#139).
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { GatedRouter, Router } from "../src/router.js";
import { CallSafety, type CallSafetyDeps, type HandlerSafety } from "../src/safety-call.js";
import { METHOD_CLASSES, STATE_UNREADABLE_MESSAGE, DISARMED_ALL_MESSAGE } from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import type { SafetyView } from "../src/safety-state.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ALLOWED = "http://localhost:8080/e2e-playground.html";
const BLOCKED = "https://www.bank.example/account";

function view(o: { armed?: boolean; evaluate?: boolean; list?: string } = {}): SafetyView {
  const blockList = o.list ? parseBlockList(o.list) : EMPTY_BLOCK_LIST;
  return { switches: { armed: o.armed ?? true, evaluate: o.evaluate ?? true }, ctx: { extensionId: OWN_ID, blockList }, blockedCount: blockList.blockedCount };
}

function harness(state: () => SafetyView | Promise<SafetyView>, tabs: Record<number, { url?: string }> = { 7: { url: ALLOWED } }) {
  const deps: CallSafetyDeps = {
    readState: vi.fn(async () => state()),
    getTab: vi.fn(async (id: number) => {
      const t = tabs[id];
      if (!t) throw new Error(`No tab with id: ${id}.`);
      return t;
    }),
    replacedBy: () => undefined,
    lastUrl: () => undefined,
  };
  const router = new GatedRouter((method, params) => new CallSafety(method, params, deps));
  return { router, deps, tabs };
}

const req = (id: string, method: string, params: Record<string, unknown> = { tabId: 7, url: ALLOWED }) =>
  JSON.stringify({ id, method, params });

describe("S2.1 — the gate runs before any handler code", () => {
  it("disarmed: every one of the 23 methods but listTabs is refused, and zero handlers are called", async () => {
    const { router } = harness(() => view({ armed: false }));
    const calls: string[] = [];
    for (const m of Object.keys(METHOD_CLASSES)) {
      router.on(m, async () => {
        calls.push(m);
        return { ok: true };
      });
    }
    for (const m of Object.keys(METHOD_CLASSES)) {
      if (m === "listTabs") continue;
      const out = JSON.parse((await router.handle(req("1", m)))!);
      expect(out.error, m).toEqual({ code: ErrorCodes.DISARMED, message: DISARMED_ALL_MESSAGE, data: { scope: "all" } });
    }
    expect(calls).toEqual([]);
    expect(Object.keys(METHOD_CLASSES)).toHaveLength(23);
  });

  it("disarmed: a handler that throws synchronously, before any await, is never entered", async () => {
    const { router } = harness(() => view({ armed: false }));
    const sync = vi.fn((): Promise<unknown> => {
      throw new Error("prologue ran");
    });
    router.on("click", sync);
    const out = JSON.parse((await router.handle(req("2", "click")))!);
    expect(out.error.code).toBe(ErrorCodes.DISARMED);
    expect(sync).not.toHaveBeenCalled();
  });

  it("armed: the same synchronous throw is caught and answered (the router does not crash)", async () => {
    const { router } = harness(() => view());
    router.on("click", () => {
      throw new Error("prologue ran");
    });
    const out = JSON.parse((await router.handle(req("3", "click")))!);
    expect(out.error).toEqual({ code: ErrorCodes.INTERNAL, message: "prologue ran" });
  });

  it("an unknown method: UNKNOWN_METHOD in any state, with no state read and no handler", async () => {
    for (const armed of [true, false]) {
      const { router, deps } = harness(() => view({ armed }));
      const h = vi.fn(async () => ({}));
      router.on("click", h);
      const out = JSON.parse((await router.handle(req("4", "nope")))!);
      expect(out).toEqual({ id: "4", error: { code: ErrorCodes.UNKNOWN_METHOD, message: "unknown method: nope" } });
      expect(h).not.toHaveBeenCalled();
      expect(deps.readState).not.toHaveBeenCalled();
    }
  });

  it("a classified method with no handler registered: UNKNOWN_METHOD, no state read", async () => {
    const { router, deps } = harness(() => view({ armed: false }));
    const out = JSON.parse((await router.handle(req("5", "snapshot")))!);
    expect(out.error.code).toBe(ErrorCodes.UNKNOWN_METHOD);
    expect(deps.readState).not.toHaveBeenCalled();
  });

  it("bad JSON, a frame without id/method, an event frame: null, no state read, no handler", async () => {
    const { router, deps } = harness(() => view({ armed: false }));
    const h = vi.fn(async () => ({}));
    router.on("snapshot", h);
    expect(await router.handle("not json")).toBeNull();
    expect(await router.handle(JSON.stringify({ foo: 1 }))).toBeNull();
    expect(await router.handle(JSON.stringify({ method: "snapshot" }))).toBeNull();
    expect(await router.handle(JSON.stringify({ event: "snapshot", params: {} }))).toBeNull();
    expect(await router.handle("null")).toBeNull();
    expect(h).not.toHaveBeenCalled();
    expect(deps.readState).not.toHaveBeenCalled();
  });

  it("an unreadable state refuses with the unreadable message and runs no handler (fail closed, #139)", async () => {
    const { router } = harness(() => Promise.reject(new Error("storage broke")));
    const h = vi.fn(async () => ({}));
    router.on("snapshot", h);
    router.on("listTabs", h);
    for (const m of ["snapshot", "listTabs"]) {
      const out = JSON.parse((await router.handle(req("6", m)))!);
      expect(out.error).toEqual({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } });
    }
    expect(h).not.toHaveBeenCalled();
  });

  it("a throw from the gate itself (a wiring slip) is INTERNAL, never an allow", async () => {
    const h = vi.fn(async () => ({ ok: true }));
    const router = new GatedRouter(() => ({
      receipt: async () => {
        throw new Error('safety gate: target "none" is not valid for method "click"');
      },
      post: async () => null,
      runRefused: () => {},
      effect: async () => {},
      checkFinalUrl: async () => {},
      onRefused: () => {},
      redactRows: async (r) => r.map((x) => x.row),
      networkFilter: async () => () => true,
    }));
    router.on("click", h);
    const out = JSON.parse((await router.handle(req("7", "click")))!);
    expect(out.error.code).toBe(ErrorCodes.INTERNAL);
    expect(h).not.toHaveBeenCalled();
  });

  it("a throw from the post-check is INTERNAL too, never the handler's result", async () => {
    const router = new GatedRouter(() => ({
      receipt: async () => "allow" as const,
      post: async () => {
        throw new Error("safety gate: no target given");
      },
      runRefused: () => {},
      effect: async () => {},
      checkFinalUrl: async () => {},
      onRefused: () => {},
      redactRows: async (r) => r.map((x) => x.row),
      networkFilter: async () => () => true,
    }));
    router.on("snapshot", async () => ({ secret: "page text" }));
    const out = JSON.parse((await router.handle(req("8", "snapshot")))!);
    expect(out.error.code).toBe(ErrorCodes.INTERNAL);
    expect(JSON.stringify(out)).not.toContain("page text");
  });

  it("the state is read per call: a disarm between two calls refuses the second", async () => {
    let s = view();
    const { router } = harness(() => s);
    const h = vi.fn(async () => ({ ok: true }));
    router.on("snapshot", h);
    expect(JSON.parse((await router.handle(req("9", "snapshot")))!).result).toEqual({ ok: true });
    s = view({ armed: false });
    expect(JSON.parse((await router.handle(req("10", "snapshot")))!).error.code).toBe(ErrorCodes.DISARMED);
    expect(h).toHaveBeenCalledTimes(1);
  });
});

describe("the post-check replaces the reply (#137)", () => {
  it("a disarm during the handler: its result is not sent, DISARMED is, and the cleanups run", async () => {
    let s = view();
    const { router } = harness(() => s);
    const released = vi.fn();
    router.on("downloadStart", async (_p, call) => {
      call.onRefused(released);
      s = view({ armed: false }); // the human pressed OFF while the fetch ran
      return { id: "dl1", size: 3 };
    });
    const out = JSON.parse((await router.handle(req("11", "downloadStart", { url: ALLOWED })))!);
    expect(out.error.code).toBe(ErrorCodes.DISARMED);
    expect(out.result).toBeUndefined();
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("an error reply is refused too (it can carry page data, e.g. locator candidates)", async () => {
    let s = view();
    const { router } = harness(() => s);
    router.on("click", async () => {
      s = view({ armed: false });
      const e = new Error("no match") as Error & { code?: string };
      throw e;
    });
    const out = JSON.parse((await router.handle(req("12", "click")))!);
    expect(out.error.code).toBe(ErrorCodes.DISARMED);
  });

  it("a tab the human navigated onto a blocked site during the call: DOMAIN_BLOCKED", async () => {
    let list = "";
    const { router, tabs } = harness(() => view({ list }));
    router.on("snapshot", async () => {
      tabs[7] = { url: BLOCKED };
      list = "bank.example";
      return { elements: [] };
    });
    const out = JSON.parse((await router.handle(req("13", "snapshot")))!);
    expect(out.error.code).toBe(ErrorCodes.DOMAIN_BLOCKED);
  });

  it("armed, JS on, empty list: a tab gone during the call keeps today's reply (V3)", async () => {
    const { router, tabs } = harness(() => view());
    router.on("evaluate", async () => {
      delete tabs[7]; // window.close()
      return { kind: "undefined" };
    });
    const out = JSON.parse((await router.handle(req("14", "evaluate", { tabId: 7, expression: "window.close()" })))!);
    expect(out).toEqual({ id: "14", result: { kind: "undefined" } });
  });

  it("listTabs is never refused at the post-check; its rows come redacted from the handler", async () => {
    let s = view();
    const { router } = harness(() => s);
    router.on("listTabs", async (_p, call) => {
      s = view({ armed: false });
      return { tabs: await call.redactRows([{ row: { id: 1, title: "T", url: ALLOWED, active: true, windowId: 1 } }]) };
    });
    const out = JSON.parse((await router.handle(req("15", "listTabs", {})))!);
    expect(out.result).toEqual({ tabs: [{ id: 1, active: true, windowId: 1, hidden: "disarmed" }] });
  });
});

describe("the handler receives the call's safety (HandlerSafety)", () => {
  it("an effect check inside the handler refuses mid-call and the side effect after it never runs", async () => {
    let s = view();
    const { router } = harness(() => s);
    const sideEffect = vi.fn();
    router.on("click", async (_p, call: HandlerSafety) => {
      s = view({ armed: false });
      await call.effect();
      sideEffect();
      return { ok: true };
    });
    const out = JSON.parse((await router.handle(req("16", "click")))!);
    expect(out.error.code).toBe(ErrorCodes.DISARMED);
    expect(sideEffect).not.toHaveBeenCalled();
  });

  it("a void result is { ok: true }, as the core router does", async () => {
    const { router } = harness(() => view());
    router.on("scroll", async () => undefined);
    expect(JSON.parse((await router.handle(req("17", "scroll")))!)).toEqual({ id: "17", result: { ok: true } });
  });
});

describe("GatedRouter.on — every method must have a safety class (S1.1 second half, #147)", () => {
  it("throws on an unclassified name and registers nothing", () => {
    const { router } = harness(() => view());
    expect(() => router.on("ping", async () => ({}))).toThrow(/no safety class/);
    expect(() => router.on("toString", async () => ({}))).toThrow(/no safety class/);
    expect(() => router.on("__proto__", async () => ({}))).toThrow(/no safety class/);
  });

  it("accepts every classified router method", () => {
    const { router } = harness(() => view());
    for (const m of Object.keys(METHOD_CLASSES)) expect(() => router.on(m, async () => ({}))).not.toThrow();
  });

  it("the core Router stays the ungated dispatch, unchanged (its own tests register unclassified names)", async () => {
    const r = new Router();
    r.on("ping", async () => ({ pong: true }));
    expect(JSON.parse((await r.handle(JSON.stringify({ id: "1", method: "ping" })))!)).toEqual({ id: "1", result: { pong: true } });
  });
});

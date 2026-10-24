/**
 * Step 9 S2a: the action handlers re-check the gate right before each first side effect (#137 item 1, V17):
 * every `ensureContent` and every `callInPage` of an action is preceded by `call.effect()`, a refusal there
 * stops the handler before the page is touched, and the trusted path re-checks before the debugger attaches
 * (`withDebugger`). With no `call` (the core router, the existing tests) nothing is added.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { BridgeError } from "../src/errors.js";
import type { HandlerSafety } from "../src/safety-call.js";

const m = vi.hoisted(() => ({ pageTab: vi.fn(), targetTab: vi.fn(), ensureContent: vi.fn(), callInPage: vi.fn() }));
vi.mock("../src/tabs.js", () => ({ pageTab: m.pageTab, targetTab: m.targetTab }));
vi.mock("../src/inject.js", () => ({ ensureContent: m.ensureContent, callInPage: m.callInPage }));

import * as actions from "../src/handlers/actions.js";
import { snapshot } from "../src/handlers/perceive.js";
import { locate } from "../src/handlers/locate.js";
import { evaluate } from "../src/handlers/evaluate.js";
import { back, forward } from "../src/handlers/history.js";
import { debuggerSessions } from "../src/debugger.js";
import { DISARMED_ALL } from "../src/safety-state.js";

let log: string[];

function fakeCall(refuseAt?: number): HandlerSafety & { effect: ReturnType<typeof vi.fn> } {
  let n = 0;
  return {
    effect: vi.fn(async () => {
      log.push("effect");
      if (++n === refuseAt) throw new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" });
    }),
    checkFinalUrl: async () => {},
    onRefused: () => {},
    redactRows: async (r) => r.map((x) => x.row),
    networkFilter: async () => () => true,
  };
}

beforeEach(() => {
  log = [];
  m.pageTab.mockImplementation(async () => ({ id: 7, windowId: 1, active: true }));
  m.targetTab.mockImplementation(async () => ({ id: 7, windowId: 1, active: true }));
  m.ensureContent.mockImplementation(async () => {
    log.push("inject");
  });
  m.callInPage.mockImplementation(async (_tabId: number, fn: unknown) => {
    const name = /__agentBridge!?\.(\w+)/.exec(String(fn))?.[1] ?? "inline";
    log.push(`page:${name}`);
    if (name === "centerForInput") return { x: 1, y: 2 };
    if (name === "locate") return { ref: "e9", role: "button", name: "Go" };
    if (name === "click" && failClick) throw new BridgeError(ErrorCodes.REF_STALE, "stale");
    return { ok: true };
  });
  failClick = false;
  vi.stubGlobal("chrome", {
    debugger: {
      attach: vi.fn(async () => log.push("attach")),
      detach: vi.fn(async () => log.push("detach")),
      sendCommand: vi.fn(async (_t: unknown, method: string) => {
        log.push(`cdp:${method}`);
        return {};
      }),
    },
    tabs: {
      goBack: vi.fn(async () => log.push("goBack")),
      goForward: vi.fn(async () => log.push("goForward")),
    },
  });
  debuggerSessions.refuse(null);
});
let failClick = false;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("every page touch is preceded by an effect check", () => {
  it("click (untrusted): effect → inject, effect → click", async () => {
    await actions.click({ tabId: 7, ref: "e1" }, fakeCall());
    expect(log).toEqual(["effect", "inject", "effect", "page:click"]);
  });

  it("click with a locator: the locate is a page call too", async () => {
    await actions.click({ tabId: 7, locator: { role: "button", name: "Go" } }, fakeCall());
    expect(log).toEqual(["effect", "inject", "effect", "page:locate", "effect", "page:click"]);
  });

  it("click escalating to trusted input: re-checked before centerForInput and before the attach", async () => {
    failClick = true;
    await actions.click({ tabId: 7, ref: "e1" }, fakeCall());
    expect(log.slice(0, 6)).toEqual(["effect", "inject", "effect", "page:click", "effect", "page:centerForInput"]);
    const attach = log.indexOf("attach");
    expect(log[attach - 1]).toBe("effect");
  });

  it("type (trusted): effect before focusForTyping and before the attach", async () => {
    await actions.type({ tabId: 7, ref: "e1", text: "a", trusted: true }, fakeCall());
    expect(log.slice(0, 5)).toEqual(["effect", "inject", "effect", "page:focusForTyping", "effect"]);
    expect(log[5]).toBe("attach");
  });

  it("scroll, hover, selectOption, pressKey (synthetic): effect → inject, effect → page", async () => {
    for (const [fn, p] of [
      [actions.scroll, { tabId: 7 }],
      [actions.hover, { tabId: 7, ref: "e1" }],
      [actions.selectOption, { tabId: 7, ref: "e1", values: ["a"] }],
      [actions.pressKey, { tabId: 7, key: "Enter" }],
    ] as const) {
      log = [];
      await (fn as (p: Record<string, unknown>, c: HandlerSafety) => Promise<unknown>)(p, fakeCall());
      expect(log[0]).toBe("effect");
      expect(log[1]).toBe("inject");
      expect(log[2]).toBe("effect");
      expect(log[3]).toMatch(/^page:/);
    }
  });

  it("pressKey (trusted, no target): effect before the attach", async () => {
    await actions.pressKey({ tabId: 7, key: "Enter", trusted: true }, fakeCall());
    expect(log[0]).toBe("effect");
    expect(log[1]).toBe("attach");
  });

  it("snapshot and locate: effect → inject, effect → page", async () => {
    await snapshot({ tabId: 7 }, fakeCall());
    expect(log).toEqual(["effect", "inject", "effect", "page:snapshot"]);
    log = [];
    await locate({ tabId: 7, locator: { css: "#x" } }, fakeCall());
    expect(log).toEqual(["effect", "inject", "effect", "page:locate"]);
  });

  it("back/forward: effect before goBack/goForward", async () => {
    await back({ tabId: 7 }, fakeCall());
    await forward({ tabId: 7 }, fakeCall());
    expect(log).toEqual(["effect", "goBack", "effect", "goForward"]);
  });

  it("evaluate: the debugger attach is re-checked", async () => {
    (globalThis as unknown as { chrome: { debugger: { sendCommand: ReturnType<typeof vi.fn> } } }).chrome.debugger.sendCommand.mockImplementation(
      async (_t: unknown, method: string) => {
        log.push(`cdp:${method}`);
        if (method === "Runtime.evaluate") return { result: { type: "number", value: 1 } };
        return {};
      },
    );
    await evaluate({ tabId: 7, expression: "1" }, fakeCall());
    expect(log[0]).toBe("effect");
    expect(log[1]).toBe("attach");
  });
});

describe("a refusal at an effect check stops the handler before the side effect", () => {
  it("click: refused at the first check → nothing injected, nothing clicked", async () => {
    const err = await actions.click({ tabId: 7, ref: "e1" }, fakeCall(1)).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log).toEqual(["effect"]);
  });

  it("click: refused at the second check → injected, but no click", async () => {
    await actions.click({ tabId: 7, ref: "e1" }, fakeCall(2)).catch(() => {});
    expect(log).toEqual(["effect", "inject", "effect"]);
  });

  it("a refusal on the content path is not escalated to trusted input", async () => {
    const err = await actions.click({ tabId: 7, ref: "e1" }, fakeCall(2)).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log).not.toContain("attach");
  });

  it("type (untrusted): a refusal before the page call is not escalated", async () => {
    const err = await actions.type({ tabId: 7, ref: "e1", text: "x" }, fakeCall(2)).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log).not.toContain("attach");
  });

  it("while the session registry refuses (disarmed), the trusted path never attaches", async () => {
    debuggerSessions.refuse(DISARMED_ALL);
    const err = await actions.pressKey({ tabId: 7, key: "Enter", trusted: true }, fakeCall()).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log).not.toContain("attach");
  });
});

describe("without a call (the core router, today's tests) nothing is added", () => {
  it("click", async () => {
    await actions.click({ tabId: 7, ref: "e1" });
    expect(log).toEqual(["inject", "page:click"]);
  });
});

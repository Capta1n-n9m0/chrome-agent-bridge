/**
 * Stage FE (Step 8): the real `click`/`type`/`pressKey` handlers, driven with `inject.js`/`tabs.js`
 * mocked and a stub `chrome.debugger` (`fe-harness.ts`). Exit check FE.2 (stricter, stage0-audit.md
 * F19): without `focusEmulation: true` the handler's whole log equals the one recorded on the FE
 * parent commit (`fixtures/fe-cdp-baseline.json`); with it the order is attach → enable → (type: focus)
 * → `Input.*` → disable in a `finally` → detach (decisions.md · 2026-10-23 · Stage 0's build-level
 * rulings … (#85) item 3), and the disable also runs after a failing input command.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  installHarness,
  BASELINE_CASES,
  errorShape,
  staleRef,
  detachedMidCommand,
  type LogEntry,
  type RecordedCase,
} from "./fe-harness.js";

const m = vi.hoisted(() => ({ pageTab: vi.fn(), ensureContent: vi.fn(), callInPage: vi.fn() }));
vi.mock("../src/tabs.js", () => ({ pageTab: m.pageTab }));
vi.mock("../src/inject.js", () => ({ ensureContent: m.ensureContent, callInPage: m.callInPage }));

import * as actions from "../src/handlers/actions.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/fe-cdp-baseline.json", import.meta.url), "utf8")) as {
  baseCommit: string;
  cases: RecordedCase[];
};

/** Spies a stray window focus / tab activation would hit; the option path must touch neither. */
function addWindowSpies(): { windowsUpdate: ReturnType<typeof vi.fn>; tabsUpdate: ReturnType<typeof vi.fn> } {
  const c = (globalThis as unknown as { chrome: Record<string, unknown> }).chrome;
  const windowsUpdate = vi.fn();
  const tabsUpdate = vi.fn();
  c.windows = { update: windowsUpdate };
  c.tabs = { update: tabsUpdate };
  return { windowsUpdate, tabsUpdate };
}

async function run(handler: "click" | "type" | "pressKey", params: Record<string, unknown>) {
  try {
    return { result: await actions[handler]({ ...params }) };
  } catch (e) {
    return { error: errorShape(e) };
  }
}

/** Compact view of a log for readable sequence assertions. */
function ops(log: LogEntry[]): string[] {
  return log.map((e) => {
    switch (e.op) {
      case "page":
        return `page:${e.name}`;
      case "sendCommand": {
        const p = e.params as Record<string, unknown>;
        if (e.method === "Emulation.setFocusEmulationEnabled") return p.enabled ? "enable" : "disable";
        return `${e.method}:${String(p.type)}${p.key !== undefined ? `:${String(p.key)}` : ""}`;
      }
      default:
        return e.op;
    }
  });
}

const ENABLE = { method: "Emulation.setFocusEmulationEnabled", params: { enabled: true } };
const DISABLE = { method: "Emulation.setFocusEmulationEnabled", params: { enabled: false } };

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the fixture", () => {
  it("was recorded on the FE parent commit and holds the six baseline cases", () => {
    expect(fixture.baseCommit).toBe("637a808700cc8b3a1969030562235bd5cdfbec43");
    expect(fixture.cases.map((c) => c.name)).toEqual(BASELINE_CASES.map((c) => c.name));
  });
});

describe("without focusEmulation: the whole log equals the pre-FE recording", () => {
  for (const c of BASELINE_CASES) {
    for (const fe of [undefined, false, "true", 1] as const) {
      it(`${c.name} (focusEmulation: ${JSON.stringify(fe)})`, async () => {
        const log = installHarness(m, c.opts());
        const params = fe === undefined ? c.params : { ...c.params, focusEmulation: fe };
        const out = await run(c.handler, params);
        const rec = fixture.cases.find((x) => x.name === c.name)!;
        expect(JSON.stringify(log)).toBe(JSON.stringify(rec.log));
        if (rec.error) expect(out.error).toEqual(rec.error);
        else expect(out.result).toStrictEqual(rec.result);
      });
    }
  }

  it("type with a character keys.ts rejects: the characters before it are sent, then today's error (FE verifier F1)", async () => {
    // The pre-FE trustedType sent "a", "b" and then threw at the emoji inside the session (verifier probe).
    const log = installHarness(m);
    const out = await run("type", { tabId: 7, ref: "e2", text: "ab\u{1F600}c", trusted: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "page:focusForTyping",
      "attach",
      "Input.dispatchKeyEvent:keyDown:a",
      "Input.dispatchKeyEvent:keyUp:a",
      "Input.dispatchKeyEvent:keyDown:b",
      "Input.dispatchKeyEvent:keyUp:b",
      "detach",
    ]);
    expect(out.error?.code).toBe("DEBUGGER_ATTACH");
    expect(out.error?.message).toMatch(/^\[chrome\.debugger\] unsupported key "\u{1F600}"/u);
  });

  it("an unsupported key still fails inside the session with today's mapping", async () => {
    const log = installHarness(m);
    const out = await run("pressKey", { tabId: 7, key: "F13", trusted: true });
    expect(ops(log)).toEqual(["pageTab", "attach", "detach"]);
    expect(out.error?.code).toBe("DEBUGGER_ATTACH");
    expect(out.error?.message).toMatch(/^\[chrome\.debugger\] unsupported key "F13"/);
  });
});

describe("with focusEmulation: true on the trusted path", () => {
  it("click: centerForInput, attach, enable, press, release, disable, detach → focusEmulation 'on'", async () => {
    const log = installHarness(m);
    const spies = addWindowSpies();
    const out = await run("click", { tabId: 7, ref: "e1", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "page:centerForInput",
      "attach",
      "enable",
      "Input.dispatchMouseEvent:mousePressed",
      "Input.dispatchMouseEvent:mouseReleased",
      "disable",
      "detach",
    ]);
    // The input commands are the recorded ones, unchanged.
    const recorded = fixture.cases.find((x) => x.name === "click trusted")!.log.filter((e) => e.op === "sendCommand");
    const sent = log.filter((e) => e.op === "sendCommand");
    expect(JSON.stringify(sent.slice(1, -1))).toBe(JSON.stringify(recorded));
    expect(sent[0]).toMatchObject(ENABLE);
    expect(sent[sent.length - 1]).toMatchObject(DISABLE);
    expect(out.result).toStrictEqual({ ok: true, focusEmulation: "on" });
    expect(spies.windowsUpdate).not.toHaveBeenCalled();
    expect(spies.tabsUpdate).not.toHaveBeenCalled();
  });

  it("type: the focus step moves inside the session, after the enable (#85 item 3)", async () => {
    const log = installHarness(m);
    const spies = addWindowSpies();
    const out = await run("type", { tabId: 7, ref: "e2", text: "a.\n", submit: true, trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "attach",
      "enable",
      "page:focusForTyping",
      "Input.dispatchKeyEvent:keyDown:a",
      "Input.dispatchKeyEvent:keyUp:a",
      "Input.dispatchKeyEvent:keyDown:.",
      "Input.dispatchKeyEvent:keyUp:.",
      "Input.dispatchKeyEvent:keyDown:Enter",
      "Input.dispatchKeyEvent:keyUp:Enter",
      "Input.dispatchKeyEvent:keyDown:Enter",
      "Input.dispatchKeyEvent:keyUp:Enter",
      "disable",
      "detach",
    ]);
    const recorded = fixture.cases.find((x) => x.name === "type trusted submit")!.log.filter((e) => e.op === "sendCommand");
    const sent = log.filter((e) => e.op === "sendCommand");
    expect(JSON.stringify(sent.slice(1, -1))).toBe(JSON.stringify(recorded));
    expect(log.find((e) => e.op === "page")).toEqual({ op: "page", name: "focusForTyping", tabId: 7, args: ["e2"] });
    expect(out.result).toStrictEqual({ ok: true, focusEmulation: "on" });
    expect(spies.windowsUpdate).not.toHaveBeenCalled();
    expect(spies.tabsUpdate).not.toHaveBeenCalled();
  });

  it("pressKey: attach, enable, the key, disable, detach — no focus step", async () => {
    const log = installHarness(m);
    const spies = addWindowSpies();
    const out = await run("pressKey", { tabId: 7, key: "ArrowDown", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "attach",
      "enable",
      "Input.dispatchKeyEvent:keyDown:ArrowDown",
      "Input.dispatchKeyEvent:keyUp:ArrowDown",
      "disable",
      "detach",
    ]);
    expect(out.result).toStrictEqual({ ok: true, focusEmulation: "on" });
    expect(spies.windowsUpdate).not.toHaveBeenCalled();
    expect(spies.tabsUpdate).not.toHaveBeenCalled();
  });

  it("click's escalation after a content failure also takes the option", async () => {
    const log = installHarness(m, { pageThrows: { click: staleRef() } });
    const out = await run("click", { tabId: 7, ref: "e1", focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "page:click",
      "page:centerForInput",
      "attach",
      "enable",
      "Input.dispatchMouseEvent:mousePressed",
      "Input.dispatchMouseEvent:mouseReleased",
      "disable",
      "detach",
    ]);
    expect(out.result).toStrictEqual({ ok: true, focusEmulation: "on" });
  });

  it("type's escalation after a content failure also takes the option", async () => {
    const log = installHarness(m, { pageThrows: { type: staleRef() } });
    const out = await run("type", { tabId: 7, ref: "e2", text: "ok", focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "page:type",
      "attach",
      "enable",
      "page:focusForTyping",
      "Input.dispatchKeyEvent:keyDown:o",
      "Input.dispatchKeyEvent:keyUp:o",
      "Input.dispatchKeyEvent:keyDown:k",
      "Input.dispatchKeyEvent:keyUp:k",
      "disable",
      "detach",
    ]);
    expect(out.result).toStrictEqual({ ok: true, focusEmulation: "on" });
  });

  it("a content-path success returns {ok:true} as today: no debugger, no 'on'", async () => {
    for (const [handler, params, name] of [
      ["click", { tabId: 7, ref: "e1", focusEmulation: true }, "page:click"],
      ["type", { tabId: 7, ref: "e2", text: "x", focusEmulation: true }, "page:type"],
    ] as const) {
      const log = installHarness(m);
      const out = await run(handler, params);
      expect(ops(log)).toEqual(["pageTab", "ensureContent", name]);
      expect(out.result).toStrictEqual({ ok: true });
    }
  });
});

describe("the runner: disable runs in a finally, and the input's own error surfaces", () => {
  const failingInput = { when: (method: string) => method.startsWith("Input."), error: detachedMidCommand() };
  const recordedFailure = () => fixture.cases.find((x) => x.name === "click trusted, first Input.* throws")!.error!;

  it("click: a throwing Input.* → attach, enable, the failing input, disable, detach; the mapped input error", async () => {
    const log = installHarness(m, { sendThrows: failingInput });
    const out = await run("click", { tabId: 7, ref: "e1", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "page:centerForInput",
      "attach",
      "enable",
      "Input.dispatchMouseEvent:mousePressed",
      "disable",
      "detach",
    ]);
    expect(out.error).toEqual(recordedFailure());
  });

  it("type and pressKey: same shape", async () => {
    let log = installHarness(m, { sendThrows: failingInput });
    let out = await run("type", { tabId: 7, ref: "e2", text: "ab", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "attach",
      "enable",
      "page:focusForTyping",
      "Input.dispatchKeyEvent:keyDown:a",
      "disable",
      "detach",
    ]);
    expect(out.error).toEqual(recordedFailure());

    log = installHarness(m, { sendThrows: failingInput });
    out = await run("pressKey", { tabId: 7, key: "Tab", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual(["pageTab", "attach", "enable", "Input.dispatchKeyEvent:keyDown:Tab", "disable", "detach"]);
    expect(out.error).toEqual(recordedFailure());
  });

  it("a failing disable after a failing input does not mask the input's error", async () => {
    // The input fails with DevTools' wording, the disable with the cancel wording: the input's wins.
    const log = installHarness(m, {
      sendThrows: {
        when: (method) => method.startsWith("Input."),
        error: new Error("Another debugger is already attached to the tab with id: 7."),
      },
    });
    const c = (globalThis as unknown as { chrome: { debugger: { sendCommand: ReturnType<typeof vi.fn> } } }).chrome;
    const inner = c.debugger.sendCommand.getMockImplementation()!;
    c.debugger.sendCommand.mockImplementation(async (t: unknown, method: string, params: { enabled?: boolean }) => {
      if (method === "Emulation.setFocusEmulationEnabled" && params.enabled === false) {
        await inner(t, method, params).catch(() => {});
        throw detachedMidCommand();
      }
      return inner(t, method, params);
    });
    const out = await run("click", { tabId: 7, ref: "e1", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "page:centerForInput",
      "attach",
      "enable",
      "Input.dispatchMouseEvent:mousePressed",
      "disable",
      "detach",
    ]);
    expect(out.error?.code).toBe("DEBUGGER_DEVTOOLS");
  });

  it("a failing disable after a successful input: the call succeeds 'on' and still detaches (proposed decision)", async () => {
    const log = installHarness(m, {
      sendThrows: {
        when: (method, params) => method === "Emulation.setFocusEmulationEnabled" && (params as { enabled: boolean }).enabled === false,
        error: detachedMidCommand(),
      },
    });
    const out = await run("click", { tabId: 7, ref: "e1", trusted: true, focusEmulation: true });
    expect(ops(log).slice(-2)).toEqual(["disable", "detach"]);
    expect(out.result).toStrictEqual({ ok: true, focusEmulation: "on" });
    // One warning, naming a code only (no Chrome message, which could carry anything).
    expect(console.warn).toHaveBeenCalledWith(
      "[bridge] focus emulation: disable failed; detach clears it:",
      "DEBUGGER_CANCELLED",
    );
  });

  it("a failing enable sends no input; the error is the enable's, mapped", async () => {
    const log = installHarness(m, {
      sendThrows: {
        when: (method, params) => method === "Emulation.setFocusEmulationEnabled" && (params as { enabled: boolean }).enabled === true,
        error: new Error("'Emulation.setFocusEmulationEnabled' wasn't found"),
      },
    });
    const out = await run("click", { tabId: 7, ref: "e1", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual(["pageTab", "ensureContent", "page:centerForInput", "attach", "enable", "disable", "detach"]);
    expect(out.error).toEqual({
      name: "BridgeError",
      code: "DEBUGGER_ATTACH",
      message: "[chrome.debugger] 'Emulation.setFocusEmulationEnabled' wasn't found",
    });
  });

  it("type with the option and a rejected character: a, b sent, then disable in the finally, detach", async () => {
    const log = installHarness(m);
    const out = await run("type", { tabId: 7, ref: "e2", text: "ab\u{1F600}c", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual([
      "pageTab",
      "ensureContent",
      "attach",
      "enable",
      "page:focusForTyping",
      "Input.dispatchKeyEvent:keyDown:a",
      "Input.dispatchKeyEvent:keyUp:a",
      "Input.dispatchKeyEvent:keyDown:b",
      "Input.dispatchKeyEvent:keyUp:b",
      "disable",
      "detach",
    ]);
    expect(out.error?.code).toBe("DEBUGGER_ATTACH");
    expect(out.error?.message).toMatch(/^\[chrome\.debugger\] unsupported key "\u{1F600}"/u);
  });

  it("type: a failing focus step → no input, disable, detach; the page's own error, unwrapped", async () => {
    const log = installHarness(m, { pageThrows: { focusForTyping: staleRef() } });
    const out = await run("type", { tabId: 7, ref: "e2", text: "ab", trusted: true, focusEmulation: true });
    expect(ops(log)).toEqual(["pageTab", "ensureContent", "attach", "enable", "page:focusForTyping", "disable", "detach"]);
    // Exactly what the pre-FE code surfaced when focusForTyping failed before attaching.
    expect(out.error).toEqual({ name: "BridgeError", code: "REF_STALE", message: "Element ref e1 is stale" });
  });
});

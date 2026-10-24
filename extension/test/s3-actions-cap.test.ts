/**
 * Step 10 S3 (phase doc 0.3; decisions.md #117): an action resolved from a locator whose `locate` said
 * `pastSnapshotCap: true` carries the same flag on its reply, on every branch the handler can take
 * (content path, trusted CDP path, the content-failure escalation, focus emulation). A ref target or an
 * unflagged locator gives today's reply, key for key. `locate` passes the flag through; `waitFor
 * {locator}` carries none (F18). `inject.js`, `tabs.js` and `debugger.js` are mocked, as in
 * `s2-actions.test.ts`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BridgeError } from "../src/errors.js";

const m = vi.hoisted(() => ({
  pageTab: vi.fn(),
  ensureContent: vi.fn(),
  callInPage: vi.fn(),
  runTrustedInput: vi.fn(),
}));
vi.mock("../src/tabs.js", () => ({ pageTab: m.pageTab }));
vi.mock("../src/inject.js", () => ({ ensureContent: m.ensureContent, callInPage: m.callInPage }));
vi.mock("../src/debugger.js", () => ({ runTrustedInput: m.runTrustedInput }));

import * as actions from "../src/handlers/actions.js";
import { locate } from "../src/handlers/locate.js";
import { pollLocator } from "../src/handlers/locator-wait.js";

const LOCATOR = { role: "button", name: "Save" };
const FOUND = { ref: "e9", role: "button", name: "Save" };
const FLAGGED = { ...FOUND, pastSnapshotCap: true as const };

let locateAnswer: () => unknown;
let failContent: Set<string>;
let emulated: boolean;

function pageFnName(fn: unknown): string {
  const r = /__agentBridge!?\.(\w+)/.exec(String(fn));
  return r ? r[1] : "<inline>";
}

beforeEach(() => {
  locateAnswer = () => FLAGGED;
  failContent = new Set();
  emulated = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.pageTab.mockImplementation(async () => ({ id: 7 }));
  m.ensureContent.mockImplementation(async () => {});
  m.callInPage.mockImplementation(async (_tabId: number, fn: unknown) => {
    const name = pageFnName(fn);
    if (name === "locate") return locateAnswer();
    if (failContent.has(name)) throw new BridgeError("REF_STALE", "gone");
    if (name === "centerForInput") return { x: 10, y: 20 };
    return { ok: true };
  });
  m.runTrustedInput.mockImplementation(async () => emulated);
});
afterEach(() => {
  vi.restoreAllMocks();
});

type Handler = "click" | "type" | "hover" | "scroll" | "selectOption" | "pressKey";
interface Case {
  label: string;
  handler: Handler;
  params: Record<string, unknown>;
  setup?: () => void;
}

/** Every branch an action with a target can take. */
const BRANCHES: Case[] = [
  { label: "click, content path", handler: "click", params: {} },
  { label: "click, trusted", handler: "click", params: { trusted: true } },
  { label: "click, trusted with focus emulation", handler: "click", params: { trusted: true, focusEmulation: true }, setup: () => (emulated = true) },
  { label: "click, content failure escalated to CDP", handler: "click", params: {}, setup: () => failContent.add("click") },
  { label: "type, content path", handler: "type", params: { text: "hi" } },
  { label: "type, trusted", handler: "type", params: { text: "hi", trusted: true } },
  { label: "type, trusted with focus emulation", handler: "type", params: { text: "hi", trusted: true, focusEmulation: true }, setup: () => (emulated = true) },
  { label: "type, content failure escalated to CDP", handler: "type", params: { text: "hi" }, setup: () => failContent.add("type") },
  { label: "hover", handler: "hover", params: {} },
  { label: "scroll", handler: "scroll", params: { direction: "up" } },
  { label: "selectOption", handler: "selectOption", params: { values: ["B"] } },
  { label: "pressKey with a target, synthetic", handler: "pressKey", params: { key: "Enter" } },
  { label: "pressKey with a target, trusted", handler: "pressKey", params: { key: "Enter", trusted: true } },
  { label: "pressKey with a target, trusted with focus emulation", handler: "pressKey", params: { key: "Enter", trusted: true, focusEmulation: true }, setup: () => (emulated = true) },
];

/** Today's reply for the branch (what a ref target answers). */
async function baseline(c: Case): Promise<unknown> {
  c.setup?.();
  return actions[c.handler]({ tabId: 7, ref: "e1", ...c.params });
}

describe("S3 a flagged locator: the action's reply carries pastSnapshotCap: true", () => {
  for (const c of BRANCHES) {
    it(c.label, async () => {
      const today = (await baseline(c)) as Record<string, unknown>;
      c.setup?.();
      const r = await actions[c.handler]({ tabId: 7, locator: LOCATOR, ...c.params });
      expect(r).toEqual({ ...today, pastSnapshotCap: true });
      expect(Object.keys(r as object)).toEqual([...Object.keys(today), "pastSnapshotCap"]);
    });
  }
});

describe("S3 a ref target or an unflagged locator: today's reply, key for key", () => {
  for (const c of BRANCHES) {
    it(`${c.label}: ref and unflagged locator answer identically`, async () => {
      const today = (await baseline(c)) as Record<string, unknown>;
      expect("pastSnapshotCap" in today).toBe(false);
      locateAnswer = () => FOUND;
      c.setup?.();
      const r = (await actions[c.handler]({ tabId: 7, locator: LOCATOR, ...c.params })) as Record<string, unknown>;
      expect(r).toEqual(today);
      expect(Object.keys(r)).toEqual(Object.keys(today));
    });
  }

  it("the replies themselves are today's shapes", async () => {
    expect(await actions.click({ tabId: 7, ref: "e1" })).toEqual({ ok: true });
    emulated = true;
    expect(await actions.click({ tabId: 7, ref: "e1", trusted: true, focusEmulation: true })).toEqual({ ok: true, focusEmulation: "on" });
  });

  it("pressKey without a target is untouched by locate", async () => {
    expect(await actions.pressKey({ tabId: 7, key: "Enter" })).toEqual({ ok: true });
    expect(await actions.pressKey({ tabId: 7, key: "Enter", trusted: true })).toEqual({ ok: true });
  });

  it("scroll with neither ref nor locator: today's reply", async () => {
    expect(await actions.scroll({ tabId: 7 })).toEqual({ ok: true });
  });
});

describe("S3 the locate handler passes the flag through", () => {
  it("flagged → flagged", async () => {
    expect(await locate({ tabId: 7, locator: LOCATOR })).toEqual(FLAGGED);
  });
  it("unflagged → exactly {ref, role, name}", async () => {
    locateAnswer = () => FOUND;
    const r = await locate({ tabId: 7, locator: LOCATOR });
    expect(Object.keys(r).sort()).toEqual(["name", "ref", "role"]);
  });
});

describe("S3 / F18: waitFor {locator} carries no flag", () => {
  it("a flagged locate makes the wait resolve exactly {ok: true}", async () => {
    const r = await pollLocator({
      state: "visible",
      timeoutMs: 1000,
      attempt: async () => FLAGGED,
      reinject: async () => {},
      now: () => 0,
      sleep: async () => {},
    });
    expect(r).toEqual({ ok: true });
    expect(Object.keys(r)).toEqual(["ok"]);
  });
});

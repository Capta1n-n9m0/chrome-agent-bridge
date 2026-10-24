/**
 * Step 8 S2 (phase doc 0.2; exit check S2.3; stage0-audit.md F23, F34): every action takes `ref | locator`
 * through one `resolveTarget`, and the `locate` wire method. `inject.js`, `tabs.js` and `debugger.js`
 * are mocked; every call lands in one ordered log, page calls by their `__agentBridge` method name.
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
import { resolveTarget } from "../src/handlers/target.js";

type Entry = string;
let log: Entry[];
let pageArgs: Array<{ name: string; args: unknown[] }>;
let locateAnswer: () => unknown;
let trustedOpts: Array<{ input: unknown; opts: { focusEmulation: boolean; focus?: () => Promise<unknown> } }>;

function pageFnName(fn: unknown): string {
  const r = /__agentBridge!?\.(\w+)/.exec(String(fn));
  return r ? r[1] : "<inline>";
}

const LOCATOR = { role: "button", name: "Save" };
const FOUND = { ref: "e9", role: "button", name: "Save" };

beforeEach(() => {
  log = [];
  pageArgs = [];
  trustedOpts = [];
  locateAnswer = () => FOUND;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.pageTab.mockImplementation(async (_p: unknown, method: string) => {
    log.push(`pageTab:${method}`);
    return { id: 7 };
  });
  m.ensureContent.mockImplementation(async () => {
    log.push("ensureContent");
  });
  m.callInPage.mockImplementation(async (_tabId: number, fn: unknown, args: unknown[] = []) => {
    const name = pageFnName(fn);
    log.push(`page:${name}`);
    pageArgs.push({ name, args });
    if (name === "locate") return locateAnswer();
    if (name === "centerForInput") return { x: 10, y: 20 };
    return { ok: true };
  });
  m.runTrustedInput.mockImplementation(async (_tabId: number, input: unknown, opts: { focusEmulation: boolean }) => {
    log.push(`trusted:${(input as { kind: string }).kind}`);
    trustedOpts.push({ input, opts });
    return false;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a rejection");
}

const argsOf = (name: string) => pageArgs.filter((c) => c.name === name).map((c) => c.args);

/** Each action, its params besides the target, and the page method plus the args it must receive. */
const CASES: Array<{ handler: "click" | "type" | "hover" | "scroll" | "selectOption"; params: Record<string, unknown>; page: string; args: (ref: string) => unknown[] }> = [
  { handler: "click", params: {}, page: "click", args: (r) => [r] },
  { handler: "type", params: { text: "hi" }, page: "type", args: (r) => [r, "hi", false] },
  { handler: "hover", params: {}, page: "hover", args: (r) => [r] },
  { handler: "scroll", params: { direction: "up" }, page: "scroll", args: (r) => [r, "up"] },
  { handler: "selectOption", params: { values: ["B"] }, page: "selectOption", args: (r) => [r, ["B"]] },
];

describe("S2.3 actions with a ref: the sequence is unchanged (no locate)", () => {
  for (const c of CASES) {
    it(`${c.handler} {ref}`, async () => {
      await actions[c.handler]({ tabId: 7, ref: "e1", ...c.params });
      expect(log).toEqual([`pageTab:${c.handler}`, "ensureContent", `page:${c.page}`]);
      expect(argsOf(c.page)).toEqual([c.args("e1")]);
    });
  }
});

describe("S2.3 actions with a locator: locate first, the locator as its own argument, then the resolved ref", () => {
  for (const c of CASES) {
    it(`${c.handler} {locator}`, async () => {
      await actions[c.handler]({ tabId: 7, locator: LOCATOR, ...c.params });
      expect(log).toEqual([`pageTab:${c.handler}`, "ensureContent", "page:locate", `page:${c.page}`]);
      expect(argsOf("locate")).toEqual([[LOCATOR]]);
      expect(argsOf(c.page)).toEqual([c.args("e9")]);
    });
  }

  it("click {locator, trusted} measures the resolved ref, then trusted input", async () => {
    await actions.click({ tabId: 7, locator: LOCATOR, trusted: true });
    expect(log).toEqual(["pageTab:click", "ensureContent", "page:locate", "page:centerForInput", "trusted:click"]);
    expect(argsOf("centerForInput")).toEqual([["e9"]]);
  });

  it("click {locator}: a failed content click escalates with the resolved ref", async () => {
    m.callInPage.mockImplementationOnce(async (_t: number, fn: unknown, args: unknown[]) => {
      log.push(`page:${pageFnName(fn)}`);
      pageArgs.push({ name: pageFnName(fn), args });
      return FOUND;
    });
    m.callInPage.mockImplementationOnce(async (_t: number, fn: unknown, args: unknown[]) => {
      log.push(`page:${pageFnName(fn)}`);
      pageArgs.push({ name: pageFnName(fn), args });
      throw new BridgeError("REF_STALE", "gone");
    });
    await actions.click({ tabId: 7, locator: LOCATOR });
    expect(log).toEqual(["pageTab:click", "ensureContent", "page:locate", "page:click", "page:centerForInput", "trusted:click"]);
    expect(argsOf("centerForInput")).toEqual([["e9"]]);
  });

  it("type {locator, trusted} focuses the resolved ref before attaching", async () => {
    await actions.type({ tabId: 7, locator: LOCATOR, text: "x", trusted: true });
    expect(log).toEqual(["pageTab:type", "ensureContent", "page:locate", "page:focusForTyping", "trusted:type"]);
    expect(argsOf("focusForTyping")).toEqual([["e9"]]);
  });

  it("type {locator, trusted, focusEmulation} hands a focus step on the resolved ref to the session", async () => {
    await actions.type({ tabId: 7, locator: LOCATOR, text: "x", trusted: true, focusEmulation: true });
    expect(log).toEqual(["pageTab:type", "ensureContent", "page:locate", "trusted:type"]);
    await trustedOpts[0]!.opts.focus!();
    expect(argsOf("focusForTyping")).toEqual([["e9"]]);
  });

  it("scroll with neither ref nor locator scrolls the page, no locate (unchanged)", async () => {
    await actions.scroll({ tabId: 7 });
    expect(log).toEqual(["pageTab:scroll", "ensureContent", "page:scroll"]);
    expect(argsOf("scroll")).toEqual([[undefined, "down"]]);
  });
});

describe("S2.3 pressKey: additive target", () => {
  it("without a target, synthetic: no extra page call (unchanged)", async () => {
    await actions.pressKey({ tabId: 7, key: "Enter" });
    expect(log).toEqual(["pageTab:pressKey", "ensureContent", "page:<inline>"]);
    expect(pageArgs).toEqual([{ name: "<inline>", args: ["Enter"] }]);
  });

  it("without a target, trusted: no ensureContent, no page call (unchanged)", async () => {
    await actions.pressKey({ tabId: 7, key: "Enter", trusted: true });
    expect(log).toEqual(["pageTab:pressKey", "trusted:pressKey"]);
  });

  it("{ref}: focus(ref), then the synthetic key", async () => {
    await actions.pressKey({ tabId: 7, key: "Backspace", ref: "e1" });
    expect(log).toEqual(["pageTab:pressKey", "ensureContent", "page:focus", "page:<inline>"]);
    expect(argsOf("focus")).toEqual([["e1"]]);
    expect(argsOf("<inline>")).toEqual([["Backspace"]]);
  });

  it("{locator}: locate, focus(resolved ref), then the synthetic key", async () => {
    await actions.pressKey({ tabId: 7, key: "Enter", locator: LOCATOR });
    expect(log).toEqual(["pageTab:pressKey", "ensureContent", "page:locate", "page:focus", "page:<inline>"]);
    expect(argsOf("locate")).toEqual([[LOCATOR]]);
    expect(argsOf("focus")).toEqual([["e9"]]);
  });

  it("{ref, trusted}: focus before attaching, then trusted input with the same options as today", async () => {
    await actions.pressKey({ tabId: 7, key: "Enter", ref: "e1", trusted: true, focusEmulation: true });
    expect(log).toEqual(["pageTab:pressKey", "ensureContent", "page:focus", "trusted:pressKey"]);
    expect(trustedOpts[0]).toEqual({ input: { kind: "pressKey", key: "Enter" }, opts: { focusEmulation: true } });
  });

  it("{locator, trusted}: locate, focus, trusted input", async () => {
    await actions.pressKey({ tabId: 7, key: "Tab", locator: LOCATOR, trusted: true });
    expect(log).toEqual(["pageTab:pressKey", "ensureContent", "page:locate", "page:focus", "trusted:pressKey"]);
    expect(argsOf("focus")).toEqual([["e9"]]);
  });

  it("{ref, locator} → BAD_PARAMS before any page call", async () => {
    const e = await rejection(actions.pressKey({ tabId: 7, key: "Enter", ref: "e1", locator: LOCATOR }));
    expect(e.code).toBe("BAD_PARAMS");
    expect(pageArgs).toEqual([]);
    expect(log).toEqual([]);
  });
});

describe("S2.3 / F23: a locator failure never reaches the content action or trusted input", () => {
  for (const code of ["LOCATOR_NOT_FOUND", "LOCATOR_AMBIGUOUS"]) {
    for (const handler of ["click", "type"] as const) {
      for (const trusted of [false, true]) {
        it(`${handler} {locator${trusted ? ", trusted" : ""}}: ${code} → rejected with it, nothing else`, async () => {
          const data = code === "LOCATOR_NOT_FOUND" ? { candidates: [] } : { matches: [] };
          locateAnswer = () => {
            throw new BridgeError(code, "no luck", data);
          };
          const e = await rejection(actions[handler]({ tabId: 7, locator: LOCATOR, text: "x", trusted }));
          expect(e.code).toBe(code);
          expect(e.data).toEqual(data);
          expect(log).toEqual([`pageTab:${handler}`, "ensureContent", "page:locate"]);
          expect(m.runTrustedInput).not.toHaveBeenCalled();
        });
      }
    }
  }
});

describe("S2.3 resolveTarget validation", () => {
  for (const c of CASES) {
    it(`${c.handler} {ref, locator} → BAD_PARAMS, no page call`, async () => {
      const e = await rejection(actions[c.handler]({ tabId: 7, ref: "e1", locator: LOCATOR, ...c.params }));
      expect(e.code).toBe("BAD_PARAMS");
      expect(e.message).toBe("pass exactly one of ref / locator");
      expect(pageArgs).toEqual([]);
      expect(log).toEqual([]); // fix round 1 (nit 5): checked before pageTab / ensureContent
      expect(m.runTrustedInput).not.toHaveBeenCalled();
    });
  }

  for (const bad of [{}, { role: 3 }, { css: "a", exact: true }, { role: "button", text: "x" }, "button", [LOCATOR], { css: "a", nth: -1 }]) {
    it(`an invalid locator ${JSON.stringify(bad)} → BAD_PARAMS with no page call`, async () => {
      const e = await rejection(actions.click({ tabId: 7, locator: bad, trusted: true }));
      expect(e.code).toBe("BAD_PARAMS");
      expect(pageArgs).toEqual([]);
      expect(log).toEqual([]); // fix round 1 (nit 5): checked before pageTab / ensureContent
      expect(m.runTrustedInput).not.toHaveBeenCalled();
    });
  }

  it("null ref / null locator count as absent", async () => {
    expect(await resolveTarget(7, { ref: "e1", locator: null })).toBe("e1");
    expect(await resolveTarget(7, { ref: null, locator: LOCATOR })).toBe("e9");
    expect(await resolveTarget(7, {})).toBeUndefined();
    expect(argsOf("locate")).toEqual([[LOCATOR]]);
  });

  it("the locator crosses as its own top-level argument (F34), never nested in an object", async () => {
    await resolveTarget(7, { locator: { text: "Hello", nth: 0 } });
    const args = argsOf("locate")[0]!;
    expect(args).toHaveLength(1);
    expect(args[0]).toEqual({ text: "Hello", nth: 0 });
  });
});

describe("S2.6 the locate handler", () => {
  it("pageTab('locate') → ensureContent → locate(locator) → {ref, role, name}", async () => {
    expect(await locate({ tabId: 7, locator: LOCATOR })).toEqual(FOUND);
    expect(log).toEqual(["pageTab:locate", "ensureContent", "page:locate"]);
    expect(argsOf("locate")).toEqual([[LOCATOR]]);
  });

  it("an invalid or missing locator → BAD_PARAMS, no page call", async () => {
    for (const p of [{ tabId: 7 }, { tabId: 7, locator: { nope: 1 } }, { tabId: 7, locator: null }]) {
      const e = await rejection(locate(p));
      expect(e.code).toBe("BAD_PARAMS");
    }
    expect(pageArgs).toEqual([]);
    expect(log).toEqual([]); // fix round 1 (nit 5): checked before pageTab / ensureContent
  });

  it("a LOCATOR_NOT_FOUND passes through with its data", async () => {
    locateAnswer = () => {
      throw new BridgeError("LOCATOR_NOT_FOUND", "no button", { candidates: [{ ref: "e2", role: "button", name: "Sav" }] });
    };
    const e = await rejection(locate({ tabId: 7, locator: LOCATOR }));
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect(e.data).toEqual({ candidates: [{ ref: "e2", role: "button", name: "Sav" }] });
  });
});

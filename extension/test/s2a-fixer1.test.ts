/**
 * Step 9 S2a, fixer round 1 — tests for the verifier's findings 1, 3, 4, 5 and 6
 * (`docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a-verifier.md` §2):
 * 1 (CRITICAL) a relative or scheme-less `navigate`/`newTab` URL is tested as the URL Chrome opens — under
 *   `chrome-extension://<id>/`, so refused `DOMAIN_BLOCKED` (#138) — at receipt and at the effect check;
 * 3 the offscreen document acts only on messages from this extension's own non-tab contexts;
 * 4 a toggle disarm whose `storage.local` write fails is retried once, then reported `"write-failed"`, and the
 *   memory copy stays disarmed;
 * 5 `SafetyReporter` on an up→up sequence; `listTabs` has no post-check even when the state turns unreadable;
 * 6 a failed first load of the memory copy is filled by the next successful `read()`.
 * Pure: storage, tabs and the clock are injected. Reserved names only.
 */
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { CallSafety, callTargets, extensionBaseUrl, resolveOpenUrl, type CallSafetyDeps } from "../src/safety-call.js";
import { acceptOffscreenSender } from "../src/relay-sender.js";
import { EXTENSION_URL_MESSAGE } from "../src/safety.js";
import { EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import { SafetyReporter, SafetyStore, type SafetyView } from "../src/safety-state.js";
import { BridgeError } from "../src/errors.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const BASE = `chrome-extension://${OWN_ID}/`;
const ALLOWED = "http://localhost:8080/x";

function view(o: { armed?: boolean; unreadable?: boolean } = {}): SafetyView {
  return {
    switches: { armed: o.armed ?? true, evaluate: true },
    ctx: { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST },
    blockedCount: 0,
  };
}

function deps(readState?: () => Promise<SafetyView>): CallSafetyDeps {
  return {
    readState: readState ?? (async () => view()),
    getTab: async (id: number) => {
      if (id !== 7) throw new Error(`No tab with id: ${id}.`);
      return { url: ALLOWED };
    },
    replacedBy: () => undefined,
    lastUrl: () => undefined,
  };
}

async function effectError(c: CallSafety): Promise<unknown> {
  try {
    await c.effect();
    return null;
  } catch (e) {
    return e;
  }
}

// ------------------------------------------------------------------------------------------------
// Finding 1 — the URL Chrome will open
// ------------------------------------------------------------------------------------------------

describe("finding 1: navigate/newTab are tested by the URL Chrome opens (#138)", () => {
  const RELATIVE = ["/options.html", "../options.html", "options.html", "example.com"];
  const cases: Array<[string, Record<string, unknown>]> = [];
  for (const url of RELATIVE) {
    cases.push(["navigate", { tabId: 7, url }]);
    cases.push(["newTab", { url }]);
  }

  for (const [method, params] of cases) {
    it(`${method} ${JSON.stringify(params.url)}: DOMAIN_BLOCKED at receipt`, async () => {
      const d = await new CallSafety(method, params, deps()).receipt();
      expect(d).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: EXTENSION_URL_MESSAGE });
    });

    it(`${method} ${JSON.stringify(params.url)}: DOMAIN_BLOCKED at the effect check`, async () => {
      const e = await effectError(new CallSafety(method, params, deps()));
      expect(e).toBeInstanceOf(BridgeError);
      expect((e as BridgeError).code).toBe(ErrorCodes.DOMAIN_BLOCKED);
      expect((e as BridgeError).message).toBe(EXTENSION_URL_MESSAGE);
    });
  }

  for (const method of ["navigate", "newTab"]) {
    it(`${method} ${JSON.stringify(ALLOWED)} (absolute, allowed): unchanged — allowed at receipt, effect and post`, async () => {
      const params = method === "navigate" ? { tabId: 7, url: ALLOWED } : { url: ALLOWED };
      const c = new CallSafety(method, params, deps());
      expect(await c.receipt()).toBe("allow");
      expect(await effectError(c)).toBeNull();
      expect(await c.post()).toBeNull();
    });
  }

  it("callTargets passes an absolute URL through as the caller wrote it (no reply changes for it)", () => {
    expect(callTargets("navigate", { tabId: 7, url: " http://localhost:8080/x" }, null, undefined, OWN_ID)).toEqual([
      { kind: "gone" },
      { kind: "own", url: " http://localhost:8080/x" },
    ]);
    expect(callTargets("newTab", { url: "javascript:alert(1)" }, null, undefined, OWN_ID)).toEqual([
      { kind: "own", url: "javascript:alert(1)" },
    ]);
  });

  it("callTargets resolves a relative newTab/navigate URL under the extension's base; downloadStart is untouched", () => {
    expect(callTargets("newTab", { url: "/options.html" }, null, undefined, OWN_ID)).toEqual([{ kind: "own", url: `${BASE}options.html` }]);
    expect(callTargets("navigate", { tabId: 7, url: "x.html" }, null, undefined, OWN_ID)).toEqual([
      { kind: "gone" },
      { kind: "own", url: `${BASE}x.html` },
    ]);
    expect(callTargets("downloadStart", { url: "/f.pdf" }, null, undefined, OWN_ID)).toEqual([{ kind: "own", url: "/f.pdf" }]);
    expect(callTargets("newTab", {}, null, undefined, OWN_ID)).toEqual([{ kind: "own" }]);
  });

  it("without a known id a relative URL still resolves to a chrome-extension: URL (fails closed)", async () => {
    const t = callTargets("newTab", { url: "/options.html" }, null);
    expect(t).toHaveLength(1);
    expect((t[0] as { url: string }).url.startsWith("chrome-extension:")).toBe(true);
  });

  describe("resolveOpenUrl (pure)", () => {
    it("the base is the extension's root, as chrome.runtime.getURL('') gives it", () => {
      expect(extensionBaseUrl(OWN_ID)).toBe(BASE);
    });

    it("an absolute URL comes back as written", () => {
      for (const u of [ALLOWED, " http://localhost:8080/x", "javascript:alert(1)", "data:text/html,x", "chrome-extension://zzzz/x", "localhost:8080/x"]) {
        expect(resolveOpenUrl(u, BASE), u).toBe(u);
      }
    });

    it("a relative or scheme-less URL resolves under the base", () => {
      expect(resolveOpenUrl("/options.html", BASE)).toBe(`${BASE}options.html`);
      expect(resolveOpenUrl("../options.html", BASE)).toBe(`${BASE}options.html`);
      expect(resolveOpenUrl("options.html", BASE)).toBe(`${BASE}options.html`);
      expect(resolveOpenUrl("example.com", BASE)).toBe(`${BASE}example.com`);
      expect(resolveOpenUrl("?x", BASE)).toBe(`${BASE}?x`);
      expect(resolveOpenUrl("//evil.example/x", BASE).startsWith("chrome-extension:")).toBe(true);
    });

    it("a string the URL parser rejects even against the base is tested as the base itself (refused)", () => {
      expect(resolveOpenUrl("http://exa mple.com", BASE)).toBe(BASE);
      expect(resolveOpenUrl("http://[", BASE)).toBe(BASE);
    });
  });
});

// ------------------------------------------------------------------------------------------------
// Finding 3 — the offscreen document's sender check
// ------------------------------------------------------------------------------------------------

describe("finding 3: acceptOffscreenSender — only this extension's non-tab contexts reach the socket", () => {
  it("accepts the service worker (this extension's id, no tab)", () => {
    expect(acceptOffscreenSender({ id: OWN_ID, url: `${BASE}dist/sw.js` }, OWN_ID)).toBe(true);
  });

  it("refuses a content script or an extension page in a tab, another extension, no id, no sender", () => {
    expect(acceptOffscreenSender({ id: OWN_ID, tab: { id: 3 }, url: "http://localhost:8080/" }, OWN_ID)).toBe(false);
    expect(acceptOffscreenSender({ id: OWN_ID, tab: { id: 3 }, url: `${BASE}options.html` }, OWN_ID)).toBe(false);
    expect(acceptOffscreenSender({ id: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" }, OWN_ID)).toBe(false);
    expect(acceptOffscreenSender({}, OWN_ID)).toBe(false);
    expect(acceptOffscreenSender(undefined, OWN_ID)).toBe(false);
    expect(acceptOffscreenSender({ id: "" }, "")).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------------
// Finding 4 — a failed disarm write
// ------------------------------------------------------------------------------------------------

function store(o: { setFailures: number }) {
  const data: Record<string, unknown> = {};
  let failures = o.setFailures;
  const deps = {
    get: vi.fn(async (keys: readonly string[]) => {
      const out: Record<string, unknown> = {};
      for (const k of keys) if (k in data) out[k] = data[k];
      return out;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      if (failures > 0) {
        failures--;
        throw new Error("storage set failed");
      }
      Object.assign(data, items);
    }),
    extensionId: OWN_ID,
    now: () => 1_000_000,
    onDisarm: vi.fn(),
    onArm: vi.fn(),
  };
  return { data, deps, s: new SafetyStore(deps) };
}

describe("finding 4: a disarm whose write fails", () => {
  it("one failed write is retried once and the disarm is saved", async () => {
    const { data, deps, s } = store({ setFailures: 1 });
    await s.start();
    expect(await s.toggle()).toBe("disarmed");
    expect(deps.set).toHaveBeenCalledTimes(2);
    expect(Object.values(data)).toEqual([false]);
  });

  it("two failed writes: 'write-failed', memory stays disarmed, every read says disarmed", async () => {
    const { data, deps, s } = store({ setFailures: 2 });
    await s.start();
    expect(await s.toggle()).toBe("write-failed");
    expect(deps.set).toHaveBeenCalledTimes(2);
    expect(data).toEqual({}); // storage still says armed (the default)
    expect(s.memory).toMatchObject({ armed: false });
    expect(deps.onDisarm).toHaveBeenCalledTimes(1);
    expect(deps.onArm).not.toHaveBeenCalled();
    expect((await s.read()).switches.armed).toBe(false);
    expect(s.ingestView()!.switches.armed).toBe(false);
  });

  it("an unreadable state's disarm write gets the same retry and outcome", async () => {
    const { data, deps, s } = store({ setFailures: 2 });
    data["safety.armed"] = "garbage";
    await s.start();
    expect(await s.toggle()).toBe("write-failed");
    expect(deps.set).toHaveBeenCalledTimes(2);
    expect(s.memory).toEqual({ unreadable: true });
  });

  it("after a write-failed disarm the next toggle still works (the chain is not stuck)", async () => {
    const { deps, s } = store({ setFailures: 2 });
    await s.start();
    expect(await s.toggle()).toBe("write-failed");
    // The guard window has passed only if the clock moved; it did not, so a re-arm is ignored (#144).
    expect(await s.toggle()).toBe("ignored");
    expect(deps.set).toHaveBeenCalledTimes(2);
  });
});

// ------------------------------------------------------------------------------------------------
// Finding 5 — two untested lines
// ------------------------------------------------------------------------------------------------

describe("finding 5a: SafetyReporter on up → up (a lost ws-status false)", () => {
  it("a second connection-up sends the state again, unchanged or not", () => {
    const r = new SafetyReporter();
    const A = { armed: true, evaluate: true, blockedCount: 0 };
    r.connectionUp();
    expect(r.offer(A)).not.toBeNull();
    r.connectionUp(); // no connectionDown in between
    expect(r.offer(A)).not.toBeNull();
  });
});

describe("finding 5b: listTabs has no post-check, even when the state turns unreadable before the reply", () => {
  it("the rows were redacted under a successful read; the post step reads nothing and refuses nothing", async () => {
    let fail = false;
    const readState = vi.fn(async () => {
      if (fail) throw new Error("unreadable");
      return view();
    });
    const c = new CallSafety("listTabs", {}, deps(readState));
    expect(await c.receipt()).toBe("allow");
    await c.redactRows([]);
    fail = true;
    const calls = readState.mock.calls.length;
    expect(await c.post()).toBeNull();
    expect(readState.mock.calls.length).toBe(calls);
  });
});

// ------------------------------------------------------------------------------------------------
// Finding 6 — a failed first load is retried
// ------------------------------------------------------------------------------------------------

describe("finding 6: a failed first load is filled by the next successful read()", () => {
  it("ingestView is null after the failed load, and set after a read succeeds", async () => {
    let fail = true;
    const deps = {
      get: vi.fn(async () => {
        if (fail) throw new Error("storage get failed");
        return { "safety.armed": true };
      }),
      set: vi.fn(async () => {}),
      extensionId: OWN_ID,
      now: () => 0,
    };
    const s = new SafetyStore(deps);
    await s.start();
    expect(s.ingestView()).toBeNull();
    fail = false;
    await s.read();
    expect(s.ingestView()).not.toBeNull();
    expect(s.ingestView()!.switches.armed).toBe(true);
  });

  it("a stored disarm found by that read fills memory disarmed and runs onDisarm", async () => {
    let fail = true;
    const onDisarm = vi.fn();
    const deps = {
      get: vi.fn(async () => {
        if (fail) throw new Error("storage get failed");
        return { "safety.armed": false };
      }),
      set: vi.fn(async () => {}),
      extensionId: OWN_ID,
      now: () => 0,
      onDisarm,
    };
    const s = new SafetyStore(deps);
    await s.start();
    fail = false;
    await s.read();
    expect(s.memory).toMatchObject({ armed: false });
    expect(onDisarm).toHaveBeenCalledTimes(1);
  });
});

describe("finding 3: offscreen.ts runs the sender check before it reads the message", () => {
  it("acceptOffscreenSender(sender, chrome.runtime.id) is the listener's first statement", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../src/offscreen.ts", import.meta.url), "utf8");
    const i = src.indexOf("chrome.runtime.onMessage.addListener(");
    expect(i).toBeGreaterThan(-1);
    const body = src.slice(i);
    const check = body.indexOf("if (!acceptOffscreenSender(sender, chrome.runtime.id)) return false;");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(body.indexOf("msg?.target"));
    expect(check).toBeLessThan(body.indexOf("msg.type"));
  });
});

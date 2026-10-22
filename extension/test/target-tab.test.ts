import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { humansTab, targetTab, pageTab, resetFallbackWarnings } from "../src/tabs.js";
import { listTabs, closeTab, selectTab } from "../src/handlers/tabs.js";
import { screenshot } from "../src/handlers/perceive.js";
import { navigate } from "../src/handlers/navigate.js";
import { resolveNetworkScope } from "../src/network-scope.js";
import { BridgeError } from "../src/errors.js";

type Tab = Partial<chrome.tabs.Tab> & { id: number };

const NO_NORMAL =
  "No normal Chrome window is focused (a DevTools or popup window may have focus) — click a normal Chrome window and retry";

/** A fake `chrome` with tabs in windows; window 1 is the last-focused normal window. */
function fakeChrome(opts: { tabs?: Tab[]; lastFocused?: number | "reject" | "none" } = {}) {
  const tabs: Tab[] = opts.tabs ?? [
    { id: 11, windowId: 1, active: true, title: "Human", url: "http://localhost:8080/a" },
    { id: 12, windowId: 1, active: false, title: "Bg", url: "http://localhost:8080/b" },
    { id: 21, windowId: 2, active: true, title: "Other window", url: "http://localhost:8080/c" },
  ];
  const noTab = (id: number) => new Error(`No tab with id: ${id}.`);
  const chrome = {
    windows: {
      getLastFocused: vi.fn(async () => {
        if (opts.lastFocused === "reject") throw new Error("No last-focused window");
        if (opts.lastFocused === "none") return {};
        return { id: opts.lastFocused ?? 1, type: "normal" };
      }),
      update: vi.fn(async () => ({})),
    },
    tabs: {
      get: vi.fn(async (id: number) => {
        const t = tabs.find((x) => x.id === id);
        if (!t) throw noTab(id);
        return t;
      }),
      query: vi.fn(async (q: { active?: boolean; windowId?: number }) =>
        tabs.filter((t) => (q.active === undefined || t.active === q.active) && (q.windowId === undefined || t.windowId === q.windowId)),
      ),
      update: vi.fn(async (id: number) => {
        if (!tabs.find((x) => x.id === id)) throw noTab(id);
        return {};
      }),
      remove: vi.fn(async (id: number) => {
        if (!tabs.find((x) => x.id === id)) throw noTab(id);
      }),
      captureVisibleTab: vi.fn(async () => "data:image/png;base64,AAAA"),
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  };
  vi.stubGlobal("chrome", chrome);
  return chrome;
}

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a rejection");
}

beforeEach(() => resetFallbackWarnings());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("humansTab (#43)", () => {
  it("is the active tab of the last-focused normal window, asked for with windowTypes [normal]", async () => {
    const c = fakeChrome();
    expect((await humansTab()).id).toBe(11);
    expect(c.windows.getLastFocused).toHaveBeenCalledWith({ windowTypes: ["normal"] });
    const arg = c.windows.getLastFocused.mock.calls[0] as unknown[];
    expect(JSON.stringify(arg)).not.toMatch(/"focused"/);
  });

  it("names a DevTools/popup window as the likely cause when no normal window is found", async () => {
    fakeChrome({ lastFocused: "reject" });
    await expect(humansTab()).rejects.toThrow(NO_NORMAL);
    fakeChrome({ lastFocused: "none" });
    await expect(humansTab()).rejects.toThrow(NO_NORMAL);
    fakeChrome({ lastFocused: 9 });
    const e = await rejection(humansTab());
    expect(e.message).toBe(NO_NORMAL);
    expect(e).not.toBeInstanceOf(BridgeError); // INTERNAL on the wire (F21: no dedicated code)
  });
});

describe("targetTab (plan 0.1)", () => {
  it("an integer tabId → chrome.tabs.get(tabId), no fallback, no warning", async () => {
    const c = fakeChrome();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await targetTab({ tabId: 12 }, "click")).id).toBe(12);
    expect(c.tabs.get).toHaveBeenCalledWith(12);
    expect(c.windows.getLastFocused).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("a non-numeric or non-integer tabId → BAD_PARAMS (T1.3)", async () => {
    fakeChrome();
    for (const tabId of ["12", "T3", 1.5, null, true, {}]) {
      const e = await rejection(targetTab({ tabId }, "click"));
      expect(e).toBeInstanceOf(BridgeError);
      expect(e.code).toBe("BAD_PARAMS");
      expect(e.message).toBe("tabId must be an integer");
    }
  });

  it("\"No tab with id\" → TAB_UNKNOWN", async () => {
    fakeChrome();
    const e = await rejection(targetTab({ tabId: 999 }, "click"));
    expect(e.code).toBe("TAB_UNKNOWN");
    expect(e.message).toBe("No tab with id: 999.");
  });

  it("a string tab without tabId (an unresolved handle, F17) → BAD_PARAMS, never the fallback", async () => {
    const c = fakeChrome();
    const e = await rejection(targetTab({ tab: "T3" }, "click"));
    expect(e.code).toBe("BAD_PARAMS");
    expect(e.message).toBe("got a tab handle — the bridge daemon is older than the extension; run npm run build and reconnect");
    expect(c.windows.getLastFocused).not.toHaveBeenCalled();
  });

  it("absent → the human's tab, warning once per method with the method name and nothing from params", async () => {
    fakeChrome();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = { ref: "e5-secret-ref", url: "http://localhost:8080/secret" };
    expect((await targetTab(p, "click")).id).toBe(11);
    await targetTab(p, "click");
    await targetTab({}, "snapshot");
    expect(warn).toHaveBeenCalledTimes(2);
    const first = warn.mock.calls[0]!.map(String).join(" ");
    expect(first).toContain("click");
    expect(first).not.toContain("e5-secret-ref");
    expect(first).not.toContain("http");
    expect(warn.mock.calls[0]!.length).toBe(1);
    expect(warn.mock.calls[1]!.map(String).join(" ")).toContain("snapshot");
  });

  it("pageTab refuses a discarded tab; targetTab does not", async () => {
    fakeChrome({ tabs: [{ id: 30, windowId: 1, active: false, discarded: true }, { id: 11, windowId: 1, active: true }] });
    expect((await targetTab({ tabId: 30 }, "navigate")).id).toBe(30);
    await expect(pageTab({ tabId: 30 }, "snapshot")).rejects.toThrow(
      "The tab was discarded by Chrome's Memory Saver — call browser_navigate or focus it to reload",
    );
    expect((await pageTab({ tabId: 11 }, "snapshot")).id).toBe(11);
  });
});

describe("closeTab / selectTab (F4)", () => {
  it("closeTab with neither tabId nor id → BAD_PARAMS and closes nothing", async () => {
    const c = fakeChrome();
    const e = await rejection(closeTab({}));
    expect(e.code).toBe("BAD_PARAMS");
    expect(c.tabs.remove).not.toHaveBeenCalled();
  });

  it("selectTab with neither → BAD_PARAMS", async () => {
    const c = fakeChrome();
    expect((await rejection(selectTab({}))).code).toBe("BAD_PARAMS");
    expect(c.tabs.update).not.toHaveBeenCalled();
  });

  it("reads tabId, else the Step 6 id", async () => {
    const c = fakeChrome();
    await closeTab({ tabId: 12 });
    expect(c.tabs.remove).toHaveBeenLastCalledWith(12);
    await closeTab({ id: 21 });
    expect(c.tabs.remove).toHaveBeenLastCalledWith(21);
    await selectTab({ id: 12 });
    expect(c.tabs.update).toHaveBeenLastCalledWith(12, { active: true });
  });

  it("non-integer → BAD_PARAMS; unknown id → TAB_UNKNOWN", async () => {
    fakeChrome();
    expect((await rejection(closeTab({ tabId: "12" }))).code).toBe("BAD_PARAMS");
    expect((await rejection(closeTab({ id: 999 }))).code).toBe("TAB_UNKNOWN");
    expect((await rejection(selectTab({ tabId: 999 }))).code).toBe("TAB_UNKNOWN");
  });
});

describe("listTabs current marker (F8)", () => {
  it("marks exactly the human's tab current; active keeps its per-window meaning", async () => {
    fakeChrome();
    const { tabs } = await listTabs();
    expect(tabs.filter((t) => t.current === true).map((t) => t.id)).toEqual([11]);
    expect(tabs.filter((t) => t.active).map((t) => t.id)).toEqual([11, 21]);
    expect("current" in tabs.find((t) => t.id === 21)!).toBe(false);
  });

  it("still lists when the resolver fails, with no current tab", async () => {
    fakeChrome({ lastFocused: "reject" });
    const { tabs } = await listTabs();
    expect(tabs).toHaveLength(3);
    expect(tabs.some((t) => "current" in t)).toBe(false);
  });
});

describe("screenshot (viewport) with an explicit background tabId", () => {
  it("refuses instead of capturing another tab", async () => {
    const c = fakeChrome();
    await expect(screenshot({ tabId: 12 })).rejects.toThrow(
      "a viewport screenshot of a background tab needs the Step 7 capture switch — pass fullPage:true for now",
    );
    expect(c.tabs.captureVisibleTab).not.toHaveBeenCalled();
  });
  it("captures an explicit active tab, and the fallback as before", async () => {
    const c = fakeChrome();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await screenshot({ tabId: 21 })).toEqual({ dataUrl: "data:image/png;base64,AAAA" });
    expect(c.tabs.captureVisibleTab).toHaveBeenLastCalledWith(2, { format: "png" });
    await screenshot({});
    expect(c.tabs.captureVisibleTab).toHaveBeenLastCalledWith(1, { format: "png" });
  });
});

describe("navigate codes", () => {
  it("missing url → BAD_PARAMS with the unchanged text", async () => {
    fakeChrome();
    const e = await rejection(navigate({ tabId: 11 }));
    expect(e.code).toBe("BAD_PARAMS");
    expect(e.message).toBe("navigate requires a url");
  });
  it("a tabs.update rejection → NAV_FAILED {error}", async () => {
    const c = fakeChrome();
    c.tabs.update.mockRejectedValueOnce(new Error("Cannot navigate to a chrome:// URL"));
    const e = await rejection(navigate({ tabId: 11, url: "chrome://settings" }));
    expect(e.code).toBe("NAV_FAILED");
    expect(e.message).toBe("Cannot navigate to a chrome:// URL");
    expect(e.data).toEqual({ error: "Cannot navigate to a chrome:// URL" });
  });
});

describe("resolveNetworkScope (#40, #52)", () => {
  const fallback = vi.fn(async () => 11);
  beforeEach(() => fallback.mockClear());

  it("form 1: an integer tabId → that tab, label the number, no fallback", async () => {
    expect(await resolveNetworkScope({ tabId: 42 }, fallback)).toEqual({ scope: 42, label: 42 });
    expect(await resolveNetworkScope({ tabId: 42, scope: "all", tab: "all" }, fallback)).toEqual({ scope: 42, label: 42 });
    expect(fallback).not.toHaveBeenCalled();
  });
  it("form 1: a non-integer tabId → BAD_PARAMS", async () => {
    expect((await rejection(resolveNetworkScope({ tabId: "42" }, fallback))).code).toBe("BAD_PARAMS");
  });
  it("form 2: scope \"all\" → all", async () => {
    expect(await resolveNetworkScope({ scope: "all" }, fallback)).toEqual({ scope: "all", label: "all" });
    expect(fallback).not.toHaveBeenCalled();
  });
  it("form 3 (legacy tab): \"all\", an integer, \"active\"/absent → as before", async () => {
    expect(await resolveNetworkScope({ tab: "all" }, fallback)).toEqual({ scope: "all", label: "all" });
    expect(await resolveNetworkScope({ tab: 7 }, fallback)).toEqual({ scope: 7, label: 7 });
    expect(await resolveNetworkScope({ tab: "active" }, fallback)).toEqual({ scope: 11, label: "active" });
    expect(await resolveNetworkScope({ tab: null }, fallback)).toEqual({ scope: 11, label: "active" });
    expect(fallback).toHaveBeenCalledTimes(2);
  });
  it("neither tabId nor scope nor tab → the 0.1 fallback", async () => {
    expect(await resolveNetworkScope({}, fallback)).toEqual({ scope: 11, label: "active" });
    expect(fallback).toHaveBeenCalledOnce();
  });
  it("form 3: anything else → BAD_PARAMS with the unchanged text", async () => {
    const e = await rejection(resolveNetworkScope({ tab: "T3" }, fallback));
    expect(e.code).toBe("BAD_PARAMS");
    expect(e.message).toBe('Invalid tab: T3 — use "active", "all" or a tab id');
  });
});

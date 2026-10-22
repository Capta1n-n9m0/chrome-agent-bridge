import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { activateForCapture, resetCaptureState } from "../src/tabs.js";
import { BridgeError } from "../src/errors.js";

type Tab = { id: number; windowId: number; active: boolean };
type Listener = (info: { tabId: number; windowId: number }) => void;

/**
 * A fake `chrome` for the switch-capture sequence. Every call is appended to `log` with the fake
 * clock's time, so tests can assert order and spacing. `tabs.update(id, {active:true})` makes `id`
 * the window's active tab and, unless `fireActivated` is false, fires `onActivated` after 10 ms.
 */
function fakeChrome(opts: { state?: string; fireActivated?: boolean; capture?: () => Promise<string> } = {}) {
  const tabs: Tab[] = [
    { id: 11, windowId: 1, active: true },
    { id: 12, windowId: 1, active: false },
    { id: 13, windowId: 1, active: false },
    { id: 21, windowId: 2, active: true },
    { id: 22, windowId: 2, active: false },
  ];
  const log: string[] = [];
  const at = () => Date.now();
  const listeners = new Set<Listener>();
  const chrome = {
    windows: {
      get: vi.fn(async (id: number) => {
        log.push(`windows.get ${id} @${at()}`);
        return { id, state: opts.state ?? "normal" };
      }),
      update: vi.fn(async () => ({})),
    },
    tabs: {
      query: vi.fn(async (q: { active?: boolean; windowId?: number }) =>
        tabs.filter((t) => (q.active === undefined || t.active === q.active) && (q.windowId === undefined || t.windowId === q.windowId)),
      ),
      update: vi.fn(async (id: number, props: { active?: boolean }) => {
        log.push(`update ${id} @${at()}`);
        const t = tabs.find((x) => x.id === id);
        if (!t) throw new Error(`No tab with id: ${id}.`);
        if (props.active) {
          for (const o of tabs) if (o.windowId === t.windowId) o.active = o.id === id;
          if (opts.fireActivated !== false) {
            setTimeout(() => {
              log.push(`activated ${id} @${at()}`);
              for (const l of [...listeners]) l({ tabId: id, windowId: t.windowId });
            }, 10);
          }
        }
        return t;
      }),
      captureVisibleTab: vi.fn(async (windowId: number) => {
        const active = tabs.find((t) => t.windowId === windowId && t.active)!;
        log.push(`capture ${windowId}:${active.id} @${at()}`);
        return opts.capture ? opts.capture() : `data:image/png;base64,${active.id}`;
      }),
      onActivated: {
        addListener: vi.fn((l: Listener) => listeners.add(l)),
        removeListener: vi.fn((l: Listener) => listeners.delete(l)),
      },
    },
  };
  vi.stubGlobal("chrome", chrome);
  return { chrome, log, tabs, listeners };
}

const tab = (id: number, windowId: number) => ({ id, windowId }) as chrome.tabs.Tab;
/** The `log` entries without their times, minus the restore's own onActivated (not awaited by design). */
const steps = (log: string[]) => log.map((l) => l.replace(/ @\d+$/, "")).filter((s) => s !== "activated 11");
const timeOf = (log: string[], prefix: string, nth = 0) =>
  Number(log.filter((l) => l.startsWith(prefix))[nth]!.split("@")[1]);

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  resetCaptureState();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("activateForCapture (plan 0.5, F10, F19)", () => {
  it("a minimized window → WINDOW_MINIMIZED before anything is switched or captured", async () => {
    const { chrome } = fakeChrome({ state: "minimized" });
    const p = activateForCapture(tab(12, 1));
    p.catch(() => {});
    await vi.runAllTimersAsync();
    const e = await p.then(() => null, (err: unknown) => err as BridgeError);
    expect(e).toBeInstanceOf(BridgeError);
    expect(e!.code).toBe("WINDOW_MINIMIZED");
    expect(e!.message).toBe(
      `Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"`,
    );
    expect(chrome.tabs.query).not.toHaveBeenCalled();
    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(chrome.tabs.captureVisibleTab).not.toHaveBeenCalled();
  });

  it("an already active tab: no switch, a capture, no restore", async () => {
    const { chrome, log } = fakeChrome();
    const p = activateForCapture(tab(11, 1));
    await vi.runAllTimersAsync();
    expect(await p).toBe("data:image/png;base64,11");
    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(chrome.tabs.onActivated.addListener).not.toHaveBeenCalled();
    expect(steps(log)).toEqual(["windows.get 1", "capture 1:11"]);
  });

  it("a background tab: update(target) → activated → 50 ms → capture → update(prev)", async () => {
    const { chrome, log, listeners } = fakeChrome();
    const p = activateForCapture(tab(12, 1));
    await vi.runAllTimersAsync();
    expect(await p).toBe("data:image/png;base64,12");
    expect(steps(log)).toEqual(["windows.get 1", "update 12", "activated 12", "capture 1:12", "update 11"]);
    expect(chrome.tabs.update).toHaveBeenNthCalledWith(1, 12, { active: true });
    expect(chrome.tabs.update).toHaveBeenNthCalledWith(2, 11, { active: true });
    // The 50 ms frame wait runs after the activation.
    expect(timeOf(log, "capture") - timeOf(log, "activated")).toBe(50);
    expect(listeners.size).toBe(0);
  });

  it("listens for onActivated before switching", async () => {
    const { chrome } = fakeChrome();
    const p = activateForCapture(tab(12, 1));
    await vi.runAllTimersAsync();
    await p;
    expect(chrome.tabs.onActivated.addListener.mock.invocationCallOrder[0]!).toBeLessThan(
      chrome.tabs.update.mock.invocationCallOrder[0]!,
    );
  });

  it("proceeds after 1 s when onActivated never fires, then waits 50 ms", async () => {
    const { log, listeners } = fakeChrome({ fireActivated: false });
    const p = activateForCapture(tab(12, 1));
    await vi.advanceTimersByTimeAsync(1049);
    expect(steps(log)).toEqual(["windows.get 1", "update 12"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(steps(log)).toEqual(["windows.get 1", "update 12", "capture 1:12", "update 11"]);
    expect(timeOf(log, "capture") - timeOf(log, "update 12")).toBe(1050);
    expect(await p).toBe("data:image/png;base64,12");
    expect(listeners.size).toBe(0);
  });

  it("never calls chrome.windows.update", async () => {
    const { chrome } = fakeChrome();
    const ps = [activateForCapture(tab(12, 1)), activateForCapture(tab(22, 2)), activateForCapture(tab(11, 1))];
    await vi.runAllTimersAsync();
    await Promise.all(ps);
    expect(chrome.windows.update).not.toHaveBeenCalled();
  });

  it("two captures in one window never overlap: the second switches only after the first's restore", async () => {
    const { log } = fakeChrome();
    const a = activateForCapture(tab(12, 1));
    const b = activateForCapture(tab(13, 1));
    await vi.runAllTimersAsync();
    expect([await a, await b]).toEqual(["data:image/png;base64,12", "data:image/png;base64,13"]);
    expect(steps(log)).toEqual([
      "windows.get 1",
      "update 12",
      "activated 12",
      "capture 1:12",
      "update 11",
      "windows.get 1",
      "update 13",
      "activated 13",
      "capture 1:13",
      "update 11",
    ]);
  });

  it("the next capture in a window waits for a slow restore to settle", async () => {
    const { chrome, log } = fakeChrome();
    const real = chrome.tabs.update.getMockImplementation()!;
    chrome.tabs.update.mockImplementation(async (id: number, props: { active?: boolean }) => {
      if (id === 11) await new Promise((r) => setTimeout(r, 3000)); // the restore is slow
      return real(id, props);
    });
    const a = activateForCapture(tab(12, 1));
    const b = activateForCapture(tab(13, 1));
    await vi.advanceTimersByTimeAsync(100);
    expect(await a).toBe("data:image/png;base64,12"); // returned before the restore settled
    expect(log.filter((l) => l.startsWith("windows.get"))).toHaveLength(1);
    await vi.runAllTimersAsync();
    await b;
    expect(timeOf(log, "windows.get", 1)).toBeGreaterThanOrEqual(timeOf(log, "update 11"));
  });

  it("captures (any window) are spaced at least 500 ms apart", async () => {
    const { log } = fakeChrome();
    const ps = [activateForCapture(tab(11, 1)), activateForCapture(tab(21, 2)), activateForCapture(tab(11, 1))];
    await vi.runAllTimersAsync();
    await Promise.all(ps);
    const times = log.filter((l) => l.startsWith("capture")).map((l) => Number(l.split("@")[1]));
    expect(times).toHaveLength(3);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(500);
    expect(times[2]! - times[1]!).toBeGreaterThanOrEqual(500);
  });

  it("the spacing wait comes before the switch, not while the tab is shown", async () => {
    const { log } = fakeChrome();
    const a = activateForCapture(tab(21, 2)); // already active, captures at once
    const b = activateForCapture(tab(12, 1)); // must wait 500 ms, then switch
    await vi.runAllTimersAsync();
    await Promise.all([a, b]);
    expect(timeOf(log, "update 12") - timeOf(log, "capture 2:21")).toBeGreaterThanOrEqual(500);
    expect(timeOf(log, "capture 1:12") - timeOf(log, "update 12")).toBe(60); // 10 ms activation + 50 ms frame
  });

  it("Chrome's quota error is retried once after 500 ms", async () => {
    let n = 0;
    const { chrome, log } = fakeChrome({
      capture: async () => {
        n += 1;
        if (n === 1) throw new Error("This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.");
        return "data:image/png;base64,OK";
      },
    });
    const p = activateForCapture(tab(11, 1));
    await vi.runAllTimersAsync();
    expect(await p).toBe("data:image/png;base64,OK");
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledTimes(2);
    expect(timeOf(log, "capture", 1) - timeOf(log, "capture", 0)).toBe(500);
  });

  it("a second quota error, or any other capture error, is thrown (no more retries)", async () => {
    const quota = new Error("This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.");
    const { chrome } = fakeChrome({ capture: async () => Promise.reject(quota) });
    const p = activateForCapture(tab(11, 1));
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toBe(quota);
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledTimes(2);

    resetCaptureState();
    const other = new Error("Cannot access contents of the page");
    const f = fakeChrome({ capture: async () => Promise.reject(other) });
    const q = activateForCapture(tab(11, 1));
    q.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(q).rejects.toBe(other);
    expect(f.chrome.tabs.captureVisibleTab).toHaveBeenCalledTimes(1);
  });

  it("restores the previous tab when the capture fails, and the next capture still runs", async () => {
    let fail = true;
    const { log } = fakeChrome({
      capture: async () => {
        if (fail) {
          fail = false;
          throw new Error("Cannot access contents of the page");
        }
        return "data:image/png;base64,second";
      },
    });
    const a = activateForCapture(tab(12, 1));
    a.catch(() => {});
    const b = activateForCapture(tab(13, 1));
    await vi.runAllTimersAsync();
    await expect(a).rejects.toThrow("Cannot access contents of the page");
    expect(await b).toBe("data:image/png;base64,second");
    expect(steps(log).slice(0, 5)).toEqual(["windows.get 1", "update 12", "activated 12", "capture 1:12", "update 11"]);
  });

  it("a restore that fails (the previous tab closed) is swallowed", async () => {
    const { chrome } = fakeChrome();
    const real = chrome.tabs.update.getMockImplementation()!;
    chrome.tabs.update.mockImplementation(async (id: number, props: { active?: boolean }) => {
      if (id === 11) throw new Error("No tab with id: 11.");
      return real(id, props);
    });
    const a = activateForCapture(tab(12, 1));
    const b = activateForCapture(tab(13, 1));
    await vi.runAllTimersAsync();
    expect(await a).toBe("data:image/png;base64,12");
    expect(await b).toBe("data:image/png;base64,13");
  });

  it("a target Chrome no longer has → TAB_UNKNOWN, and the window's chain is released", async () => {
    const { log } = fakeChrome();
    const a = activateForCapture(tab(99, 1)); // no such tab in the fake
    a.catch(() => {});
    const b = activateForCapture(tab(12, 1));
    await vi.advanceTimersByTimeAsync(5000); // well inside the 30 s bound: released by the failure itself
    const e = await a.then(() => null, (err: unknown) => err as BridgeError);
    expect(e).toBeInstanceOf(BridgeError);
    expect(e!.code).toBe("TAB_UNKNOWN");
    expect(e!.message).toBe("No tab with id: 99.");
    expect(await b).toBe("data:image/png;base64,12");
    expect(log.filter((l) => l.startsWith("windows.get"))).toHaveLength(2);
  });

  it("a window with no active tab: the target is activated and captured, nothing is restored", async () => {
    const { chrome, log, tabs } = fakeChrome();
    for (const t of tabs) if (t.windowId === 1) t.active = false;
    const p = activateForCapture(tab(12, 1));
    await vi.runAllTimersAsync();
    expect(await p).toBe("data:image/png;base64,12");
    expect(steps(log)).toEqual(["windows.get 1", "update 12", "activated 12", "capture 1:12"]);
    expect(chrome.tabs.update).toHaveBeenCalledTimes(1);
  });

  it("a capture that never settles frees the window's chain 30 s after it started, not before (V2)", async () => {
    let n = 0;
    const { log } = fakeChrome({
      capture: () => {
        n += 1;
        return n === 1 ? new Promise<string>(() => {}) : Promise.resolve("data:image/png;base64,next");
      },
    });
    const a = activateForCapture(tab(12, 1)); // hangs in captureVisibleTab
    const b = activateForCapture(tab(13, 1));
    let aSettled = false;
    void a.then(() => (aSettled = true), () => (aSettled = true));
    await vi.advanceTimersByTimeAsync(29_999);
    expect(log.filter((l) => l.startsWith("windows.get"))).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(log.filter((l) => l.startsWith("windows.get"))).toHaveLength(2);
    expect(timeOf(log, "windows.get", 1) - timeOf(log, "windows.get", 0)).toBe(30_000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await b).toBe("data:image/png;base64,next");
    expect(aSettled).toBe(false); // the caller's own promise is unchanged; the daemon times it out
  });

  it("a normally settled link clears its 30 s bound (no timer left behind)", async () => {
    fakeChrome();
    const p = activateForCapture(tab(12, 1));
    await vi.advanceTimersByTimeAsync(5000); // not runAllTimers, which would fire the 30 s bound itself
    await p;
    expect(vi.getTimerCount()).toBe(0);
  });
});

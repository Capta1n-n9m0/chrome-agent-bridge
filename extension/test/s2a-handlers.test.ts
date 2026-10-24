/**
 * Step 9 S2a: handler wiring that reaches `chrome.*` through stubs — downloadStart's final-URL check and the
 * release of a refused reply's bytes (#140, F8, F24), the store cleared at a disarm (#137 item 4), listTabs
 * redaction with `pendingUrl` (#134), the `seconds` wait cut by the 100 ms re-check (F5's build choice), the
 * network-idle and text waits' checks, the network query filter, and the capture verification of the switch
 * screenshot (Stage 0 F11). With no `call`, every handler behaves as today (the existing tests).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { BridgeError } from "../src/errors.js";
import type { HandlerSafety } from "../src/safety-call.js";
import { downloadStart, downloadChunk, clearDownloads } from "../src/handlers/download.js";
import { listTabs, focusTab, newTab, closeTab } from "../src/handlers/tabs.js";
import { waitFor } from "../src/handlers/wait.js";
import { navigate } from "../src/handlers/navigate.js";
import { activateForCapture, resetCaptureState, CAPTURE_MOVED_MESSAGE } from "../src/tabs.js";

const BLOCKED = "https://www.bank.example/statement.pdf";
const ALLOWED = "http://localhost:8080/file.pdf";

let log: string[];

function fakeCall(o: { refuseAt?: number; finalBlocked?: boolean; redact?: (r: { row: unknown; pendingUrl?: string }[]) => unknown[] } = {}) {
  let n = 0;
  const refused: Array<() => void> = [];
  const call = {
    effect: vi.fn(async () => {
      log.push("effect");
      if (++n === o.refuseAt) throw new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" });
    }),
    checkFinalUrl: vi.fn(async (url: string) => {
      log.push("checkFinalUrl");
      if (o.finalBlocked && url === BLOCKED) throw new BridgeError(ErrorCodes.DOMAIN_BLOCKED, "blocked");
    }),
    onRefused: vi.fn((fn: () => void) => refused.push(fn)),
    redactRows: vi.fn(async (rows: { row: unknown; pendingUrl?: string }[]) => (o.redact ? o.redact(rows) : rows.map((r) => r.row))),
    networkFilter: vi.fn(async () => () => true),
  };
  return { call: call as unknown as HandlerSafety, raw: call, refuse: () => refused.forEach((f) => f()) };
}

beforeEach(() => {
  log = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  clearDownloads();
});

describe("downloadStart — the final URL after redirects (#140)", () => {
  it("a blocked final URL: refused as soon as fetch resolves, the body is not read, nothing is held", async () => {
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(3));
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: { signal: AbortSignal }) => {
        signal = init.signal;
        return { ok: true, status: 200, statusText: "OK", url: BLOCKED, redirected: true, headers: new Headers(), arrayBuffer } as unknown as Response;
      }),
    );
    const f = fakeCall({ finalBlocked: true });
    const err = await downloadStart({ url: ALLOWED }, f.call).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(signal?.aborted).toBe(true);
    expect(f.raw.onRefused).not.toHaveBeenCalled();
  });

  it("effect before the fetch; checkFinalUrl after it; a refused reply releases the held bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        log.push("fetch");
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }),
    );
    const f = fakeCall();
    const res = await downloadStart({ url: ALLOWED }, f.call);
    expect(log).toEqual(["effect", "fetch", "checkFinalUrl"]);
    expect(await downloadChunk({ id: res.id, offset: 0, length: 3 })).toEqual({ data: "AQID" });
    f.refuse(); // the post-check refused the reply (e.g. the human disarmed during the fetch)
    await expect(downloadChunk({ id: res.id, offset: 0, length: 3 })).rejects.toThrow(/Unknown or expired/);
  });

  it("refused before the fetch: no request is made", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(downloadStart({ url: ALLOWED }, fakeCall({ refuseAt: 1 }).call)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clearDownloads drops every held download (a disarm)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 })));
    const a = await downloadStart({ url: ALLOWED });
    expect(clearDownloads()).toBe(1);
    await expect(downloadChunk({ id: a.id })).rejects.toThrow(/Unknown or expired/);
  });
});

describe("tab handlers", () => {
  function stubTabs(tabs: Array<Record<string, unknown>>) {
    vi.stubGlobal("chrome", {
      windows: {
        getLastFocused: vi.fn(async () => ({ id: 1 })),
        update: vi.fn(async () => log.push("windows.update")),
      },
      tabs: {
        query: vi.fn(async (q: { active?: boolean; windowId?: number }) =>
          tabs.filter((t) => (q.active === undefined || t.active === q.active) && (q.windowId === undefined || t.windowId === q.windowId)),
        ),
        get: vi.fn(async (id: number) => tabs.find((t) => t.id === id)),
        update: vi.fn(async () => log.push("tabs.update")),
        create: vi.fn(async () => {
          log.push("tabs.create");
          return { id: 99 };
        }),
        remove: vi.fn(async () => log.push("tabs.remove")),
        onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    });
  }

  it("listTabs hands every row with its pendingUrl to the redaction, and returns what it gives", async () => {
    stubTabs([
      { id: 1, title: "A", url: ALLOWED, active: true, windowId: 1 },
      { id: 2, title: "B", url: ALLOWED, pendingUrl: BLOCKED, active: false, windowId: 1 },
    ]);
    const f = fakeCall({ redact: (rows) => rows.map((r) => (r.pendingUrl ? { hidden: "blocked" } : r.row)) });
    const out = await listTabs({}, f.call);
    expect(f.raw.redactRows.mock.calls[0]![0]).toEqual([
      { row: { id: 1, title: "A", url: ALLOWED, active: true, windowId: 1, current: true } },
      { row: { id: 2, title: "B", url: ALLOWED, active: false, windowId: 1 }, pendingUrl: BLOCKED },
    ]);
    expect(out.tabs[1]).toEqual({ hidden: "blocked" });
  });

  it("listTabs without a call: today's rows, no pendingUrl on the wire", async () => {
    stubTabs([{ id: 2, title: "B", url: ALLOWED, pendingUrl: BLOCKED, active: false, windowId: 1 }]);
    const out = await listTabs();
    expect(out.tabs).toEqual([{ id: 2, title: "B", url: ALLOWED, active: false, windowId: 1 }]);
  });

  it("focusTab, newTab, closeTab, navigate: effect before the chrome call; a refusal stops it", async () => {
    stubTabs([{ id: 7, url: ALLOWED, active: true, windowId: 1 }]);
    await focusTab({ tabId: 7 }, fakeCall().call);
    expect(log).toEqual(["effect", "windows.update", "tabs.update"]);
    log = [];
    await newTab({}, fakeCall().call);
    expect(log).toEqual(["effect", "tabs.create"]);
    log = [];
    await closeTab({ tabId: 7 }, fakeCall().call);
    expect(log).toEqual(["effect", "tabs.remove"]);
    log = [];
    for (const p of [focusTab({ tabId: 7 }, fakeCall({ refuseAt: 1 }).call), newTab({}, fakeCall({ refuseAt: 1 }).call), closeTab({ tabId: 7 }, fakeCall({ refuseAt: 1 }).call)]) {
      await expect(p).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    }
    await expect(navigate({ tabId: 7, url: ALLOWED }, fakeCall({ refuseAt: 1 }).call)).rejects.toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log).toEqual(["effect", "effect", "effect", "effect"]);
  });
});

describe("waitFor re-checks in the worker", () => {
  it("seconds: cut by a 100 ms re-check loop; the refusal ends it early", async () => {
    vi.useFakeTimers();
    const f = fakeCall({ refuseAt: 4 });
    const p = waitFor({ tabId: 7, seconds: 60 }, f.call).catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const err = await p;
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(f.raw.effect).toHaveBeenCalledTimes(4);
  });

  it("seconds: armed, it still waits the full time and answers ok", async () => {
    vi.useFakeTimers();
    const f = fakeCall();
    let done = false;
    const p = waitFor({ tabId: 7, seconds: 1 }, f.call).then((r) => {
      done = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await p).toEqual({ ok: true });
  });

  it("seconds without a call: today's single sleep", async () => {
    vi.useFakeTimers();
    const p = waitFor({ seconds: 0.5 });
    await vi.advanceTimersByTimeAsync(500);
    expect(await p).toEqual({ ok: true });
  });
});

describe("the switch capture verifies the captured tab (Stage 0 F11)", () => {
  function fake(o: { moveAfterShow?: boolean } = {}) {
    const tabs = [
      { id: 11, windowId: 1, active: true },
      { id: 12, windowId: 1, active: false },
    ];
    const listeners = new Set<(i: { tabId: number }) => void>();
    vi.stubGlobal("chrome", {
      windows: { get: vi.fn(async (id: number) => ({ id, state: "normal" })) },
      tabs: {
        query: vi.fn(async (q: { active?: boolean; windowId?: number }) =>
          tabs.filter((t) => (q.active === undefined || t.active === q.active) && (q.windowId === undefined || t.windowId === q.windowId)),
        ),
        update: vi.fn(async (id: number) => {
          log.push(`update ${id}`);
          for (const t of tabs) t.active = t.id === id;
          setTimeout(() => {
            for (const l of [...listeners]) l({ tabId: id });
            if (o.moveAfterShow && id === 12) for (const t of tabs) t.active = t.id === 11; // the human switched back
          }, 1);
          return {};
        }),
        captureVisibleTab: vi.fn(async () => {
          const active = tabs.find((t) => t.active)!;
          log.push(`capture ${active.id}`);
          return `data:image/png;base64,${active.id}`;
        }),
        onActivated: { addListener: (l: (i: { tabId: number }) => void) => listeners.add(l), removeListener: (l: (i: { tabId: number }) => void) => listeners.delete(l) },
      },
    });
  }

  beforeEach(() => resetCaptureState());

  it("an effect check before the switch and before the capture", async () => {
    fake();
    const f = fakeCall();
    const url = await activateForCapture({ id: 12, windowId: 1 } as chrome.tabs.Tab, f.call);
    expect(url).toBe("data:image/png;base64,12");
    expect(log.indexOf("effect")).toBeLessThan(log.indexOf("update 12"));
    expect(log.lastIndexOf("effect")).toBeLessThan(log.indexOf("capture 12"));
    expect(f.raw.effect).toHaveBeenCalledTimes(2);
  });

  it("a refusal before the switch: the human's window is never switched", async () => {
    fake();
    const err = await activateForCapture({ id: 12, windowId: 1 } as chrome.tabs.Tab, fakeCall({ refuseAt: 1 }).call).catch((e) => e);
    expect(err).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(log.some((l) => l.startsWith("update"))).toBe(false);
  });

  it("the window showed another tab at the capture: the image is discarded, OFFSCREEN", async () => {
    fake({ moveAfterShow: true });
    const err = await activateForCapture({ id: 12, windowId: 1 } as chrome.tabs.Tab, fakeCall().call).catch((e) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect(err).toMatchObject({ code: ErrorCodes.OFFSCREEN, message: CAPTURE_MOVED_MESSAGE });
    expect(String(err.message)).not.toContain("data:");
  });

  it("without a call: no verification (today's capture)", async () => {
    fake({ moveAfterShow: true });
    expect(await activateForCapture({ id: 12, windowId: 1 } as chrome.tabs.Tab)).toBe("data:image/png;base64,11");
  });
});

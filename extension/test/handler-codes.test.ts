import { describe, it, expect, vi, afterEach } from "vitest";
import { raceTimeout } from "../src/debugger.js";
import { timeoutMessage } from "../src/debugger-errors.js";
import { downloadStart } from "../src/handlers/download.js";
import { evaluate } from "../src/handlers/evaluate.js";
import { waitFor } from "../src/handlers/wait.js";
import { BridgeError } from "../src/errors.js";
import { screenshot } from "../src/handlers/perceive.js";
import { CDP_HIDDEN_MESSAGE, CDP_MINIMIZED_MESSAGE, cdpCaptureRefusal } from "../src/tabs.js";

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a rejection");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("raceTimeout → TIMEOUT", () => {
  it("rejects with a BridgeError TIMEOUT and the unchanged message", async () => {
    vi.useFakeTimers();
    const pending = rejection(raceTimeout(new Promise(() => {}), 1000));
    await vi.advanceTimersByTimeAsync(1000);
    const e = await pending;
    expect(e).toBeInstanceOf(BridgeError);
    expect(e.code).toBe("TIMEOUT");
    expect(e.message).toBe(timeoutMessage(1000));
  });
});

describe("downloadStart codes", () => {
  it("a non-http URL → BAD_PARAMS with the unchanged text, no fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const e = await rejection(downloadStart({ url: "file:///etc/passwd" }));
    expect(e.code).toBe("BAD_PARAMS");
    expect(e.message).toBe("browser_download requires an absolute http(s) URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an HTTP error status → DOWNLOAD_HTTP {status, contentType}", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404, statusText: "Not Found", headers: { "content-type": "Text/HTML; charset=utf-8" } })),
    );
    const e = await rejection(downloadStart({ url: "http://localhost:8080/missing.pdf" }));
    expect(e.code).toBe("DOWNLOAD_HTTP");
    expect(e.message).toBe("HTTP 404 Not Found");
    expect(e.data).toEqual({ status: 404, contentType: "text/html" });
  });
});

describe("evaluate: empty expression → BAD_PARAMS", () => {
  it("rejects before touching any tab", async () => {
    for (const expression of ["", "   ", undefined, 42]) {
      const e = await rejection(evaluate({ expression }));
      expect(e.code).toBe("BAD_PARAMS");
      expect(e.message).toBe('browser_evaluate requires a non-empty "expression" string');
    }
  });
});

describe("cdpCaptureRefusal (T5b fix 2: refuse what CDP was measured to hang on)", () => {
  it("a minimized window → WINDOW_MINIMIZED, whether or not the tab is active", () => {
    for (const active of [true, false, undefined]) {
      const e = cdpCaptureRefusal({ active }, "minimized");
      expect(e).toBeInstanceOf(BridgeError);
      expect(e!.code).toBe("WINDOW_MINIMIZED");
      expect(e!.message).toBe(CDP_MINIMIZED_MESSAGE);
    }
  });

  it("a tab in the background of its window → OFFSCREEN", () => {
    for (const state of ["normal", "maximized", "fullscreen", undefined]) {
      for (const active of [false, undefined]) {
        const e = cdpCaptureRefusal({ active }, state);
        expect(e).toBeInstanceOf(BridgeError);
        expect(e!.code).toBe("OFFSCREEN");
        expect(e!.message).toBe(CDP_HIDDEN_MESSAGE);
      }
    }
  });

  it("the active tab of a visible window → no refusal", () => {
    for (const state of ["normal", "maximized", "fullscreen", undefined]) expect(cdpCaptureRefusal({ active: true }, state)).toBeNull();
  });

  it("the messages say what to do", () => {
    expect(CDP_MINIMIZED_MESSAGE).toMatch(/restore the window/);
    expect(CDP_MINIMIZED_MESSAGE).toMatch(/focusTab/);
    expect(CDP_HIDDEN_MESSAGE).toMatch(/default mode/);
    expect(CDP_HIDDEN_MESSAGE).toMatch(/focusTab/);
  });
});

describe("screenshot {mode:\"cdp\"}: a hidden or minimized tab is refused before the debugger attaches", () => {
  function fakeChrome(tab: { id: number; windowId: number; active: boolean }, state: string) {
    const chrome = {
      tabs: { get: vi.fn(async () => ({ ...tab })) },
      windows: { get: vi.fn(async (id: number) => ({ id, state })) },
      debugger: {
        attach: vi.fn(async () => {}),
        detach: vi.fn(async () => {}),
        sendCommand: vi.fn(async () => ({ data: "AAAA" })),
      },
    };
    vi.stubGlobal("chrome", chrome);
    return chrome;
  }

  it("minimized → WINDOW_MINIMIZED, no attach", async () => {
    const chrome = fakeChrome({ id: 7, windowId: 3, active: true }, "minimized");
    const e = await rejection(screenshot({ tabId: 7, mode: "cdp" }));
    expect(e.code).toBe("WINDOW_MINIMIZED");
    expect(chrome.windows.get).toHaveBeenCalledWith(3);
    expect(chrome.debugger.attach).not.toHaveBeenCalled();
  });

  it("a background tab → OFFSCREEN, no attach", async () => {
    const chrome = fakeChrome({ id: 7, windowId: 3, active: false }, "normal");
    const e = await rejection(screenshot({ tabId: 7, mode: "cdp" }));
    expect(e.code).toBe("OFFSCREEN");
    expect(chrome.debugger.attach).not.toHaveBeenCalled();
  });

  it("the active tab of a visible window is captured through CDP as before", async () => {
    const chrome = fakeChrome({ id: 7, windowId: 3, active: true }, "normal");
    expect(await screenshot({ tabId: 7, mode: "cdp" })).toEqual({ dataUrl: "data:image/png;base64,AAAA" });
    expect(chrome.debugger.attach).toHaveBeenCalledTimes(1);
    expect(chrome.debugger.detach).toHaveBeenCalledTimes(1);
  });

  it("fullPage is not refused (unmeasured; left as it was)", async () => {
    const chrome = fakeChrome({ id: 7, windowId: 3, active: false }, "normal");
    expect(await screenshot({ tabId: 7, mode: "cdp", fullPage: true })).toEqual({ dataUrl: "data:image/png;base64,AAAA" });
    expect(chrome.windows.get).not.toHaveBeenCalled();
  });
});

describe("waitFor: no text/seconds/networkIdle → BAD_PARAMS", () => {
  it("rejects with the unchanged text", async () => {
    const e = await rejection(waitFor({}));
    expect(e.code).toBe("BAD_PARAMS");
    expect(e.message).toBe("browser_wait_for requires one of text, seconds or networkIdle");
  });
});

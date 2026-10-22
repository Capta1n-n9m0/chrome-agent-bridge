import { describe, it, expect, vi, afterEach } from "vitest";
import { raceTimeout } from "../src/debugger.js";
import { timeoutMessage } from "../src/debugger-errors.js";
import { downloadStart } from "../src/handlers/download.js";
import { evaluate } from "../src/handlers/evaluate.js";
import { waitFor } from "../src/handlers/wait.js";
import { BridgeError } from "../src/errors.js";

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

describe("waitFor: no text/seconds/networkIdle → BAD_PARAMS", () => {
  it("rejects with the unchanged text", async () => {
    const e = await rejection(waitFor({}));
    expect(e.code).toBe("BAD_PARAMS");
    expect(e.message).toBe("browser_wait_for requires one of text, seconds or networkIdle");
  });
});

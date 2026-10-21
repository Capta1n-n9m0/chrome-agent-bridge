import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExtensionConnection } from "../src/connection.js";
import { BridgeError } from "@bridge/shared";

describe("ExtensionConnection", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends a request with an incrementing id and resolves on matching response", async () => {
    const sent: string[] = [];
    const conn = new ExtensionConnection((d) => sent.push(d), 1000);

    const p = conn.call("navigate", { url: "https://example.com" });
    expect(JSON.parse(sent[0])).toEqual({ id: "1", method: "navigate", params: { url: "https://example.com" } });

    conn.handleMessage(JSON.stringify({ id: "1", result: { ok: true } }));
    await expect(p).resolves.toEqual({ ok: true });
  });

  it("rejects on an error response", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("click", { ref: "e1" });
    conn.handleMessage(JSON.stringify({ id: "1", error: { message: "ref not found" } }));
    await expect(p).rejects.toThrow("ref not found");
  });

  it("rejects on timeout", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("navigate", {});
    vi.advanceTimersByTime(1001);
    await expect(p).rejects.toThrow(/Timed out/);
  });

  it("ignores responses with unknown ids", () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    expect(() => conn.handleMessage(JSON.stringify({ id: "999", result: 1 }))).not.toThrow();
  });

  it("rejectAll fails every pending call", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("navigate", {});
    conn.rejectAll("disconnected");
    await expect(p).rejects.toThrow("disconnected");
  });

  it("uses a per-call timeoutMs when given", async () => {
    const conn = new ExtensionConnection(() => {}, 30_000);
    const p = conn.call("evaluate", { expression: "1+1" }, { timeoutMs: 20 });
    vi.advanceTimersByTime(21);
    await expect(p).rejects.toThrow("Timed out after 20ms calling evaluate");
  });

  it("falls back to the constructor default when no per-call timeout is given", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("evaluate", {});
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(501);
    await expect(p).rejects.toThrow("Timed out after 1000ms calling evaluate");
  });
});

describe("ExtensionConnection error codes (decision 0.4)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("an error response with a code rejects with a BridgeError keeping code and data", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("click", { ref: "e1" });
    conn.handleMessage(JSON.stringify({ id: "1", error: { code: "REF_STALE", message: "stale", data: { ref: "e1" } } }));
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect(err).toMatchObject({ code: "REF_STALE", message: "stale", data: { ref: "e1" } });
  });

  it("a v1 {message} error becomes INTERNAL with the same message", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("click", { ref: "e1" });
    conn.handleMessage(JSON.stringify({ id: "1", error: { message: "ref not found" } }));
    await expect(p).rejects.toMatchObject({ name: "BridgeError", code: "INTERNAL", message: "ref not found" });
  });

  it("a timeout is TIMEOUT with today's text", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("navigate", {});
    const settled = p.catch((e: unknown) => e);
    vi.advanceTimersByTime(1000);
    const err = await settled;
    expect(err).toBeInstanceOf(BridgeError);
    expect(err).toMatchObject({ code: "TIMEOUT", message: "Timed out after 1000ms calling navigate" });
  });

  it("rejectAll is NOT_CONNECTED keeping the reason text", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("navigate", {});
    conn.rejectAll("extension disconnected");
    await expect(p).rejects.toMatchObject({ name: "BridgeError", code: "NOT_CONNECTED", message: "extension disconnected" });
  });
});

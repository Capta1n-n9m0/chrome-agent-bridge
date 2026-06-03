import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExtensionConnection } from "../src/connection.js";

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
});

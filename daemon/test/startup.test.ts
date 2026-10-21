import { describe, it, expect, afterEach, vi } from "vitest";
import { Bridge } from "../src/bridge.js";
import { WsHost } from "../src/wsHost.js";
import { startWsHost } from "../src/startup.js";

describe("startWsHost", () => {
  const hosts: WsHost[] = [];
  afterEach(async () => {
    await Promise.all(hosts.map((h) => h.close()));
    hosts.length = 0;
  });

  it("returns ok with the bound port on success", async () => {
    const host = new WsHost(new Bridge(), { port: 0, token: "t" });
    hosts.push(host);
    const result = await startWsHost(host);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.port).toBeGreaterThan(0);
  });

  it("returns ok:false WITHOUT throwing when the port is already in use", async () => {
    const first = new WsHost(new Bridge(), { port: 0, token: "t" });
    hosts.push(first);
    const port = await first.listen();

    const second = new WsHost(new Bridge(), { port, token: "t" });
    hosts.push(second);
    const result = await startWsHost(second); // must NOT throw — a busy port can't crash the server
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/EADDRINUSE|address already in use/i);
  });
});

describe("startWsHost bind retry", () => {
  it("keeps retrying a busy port on a timer and reports recovery", async () => {
    vi.useFakeTimers();
    try {
      const busy = Object.assign(new Error("listen EADDRINUSE: address already in use 127.0.0.1:9234"), { code: "EADDRINUSE" });
      const listen = vi.fn<() => Promise<number>>()
        .mockRejectedValueOnce(busy)
        .mockRejectedValueOnce(busy)
        .mockResolvedValue(9234);
      const recovered: number[] = [];
      const result = await startWsHost({ listen }, { retryMs: 5000, onRecovered: (port) => recovered.push(port) });
      expect(result.ok).toBe(false); // reported immediately — stdio must not wait
      expect(listen).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(listen).toHaveBeenCalledTimes(2);
      expect(recovered).toEqual([]);

      await vi.advanceTimersByTimeAsync(5000);
      expect(listen).toHaveBeenCalledTimes(3);
      expect(recovered).toEqual([9234]);

      await vi.advanceTimersByTimeAsync(50_000); // retry loop must stop after success
      expect(listen).toHaveBeenCalledTimes(3);
      result.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stop() cancels a pending retry", async () => {
    vi.useFakeTimers();
    try {
      const listen = vi.fn<() => Promise<number>>().mockRejectedValue(new Error("EADDRINUSE"));
      const result = await startWsHost({ listen }, { retryMs: 1000 });
      result.stop();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(listen).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not schedule retries when the first bind succeeds", async () => {
    vi.useFakeTimers();
    try {
      const listen = vi.fn<() => Promise<number>>().mockResolvedValue(1);
      const result = await startWsHost({ listen }, { retryMs: 1000 });
      expect(result.ok).toBe(true);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(listen).toHaveBeenCalledTimes(1);
      result.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

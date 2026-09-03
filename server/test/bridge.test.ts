import { describe, it, expect } from "vitest";
import { Bridge } from "../src/bridge.js";
import { ExtensionConnection } from "../src/connection.js";

describe("Bridge", () => {
  it("throws a clear error when no extension is connected", async () => {
    const bridge = new Bridge();
    await expect(bridge.call("navigate", {})).rejects.toThrow(/not connected/i);
  });

  it("delegates to the current connection", async () => {
    const bridge = new Bridge();
    const sent: string[] = [];
    const conn = new ExtensionConnection((d) => sent.push(d), 1000);
    bridge.setConnection(conn);
    const p = bridge.call("navigate", { url: "x" });
    conn.handleMessage(JSON.stringify({ id: "1", result: "done" }));
    await expect(p).resolves.toBe("done");
  });

  it("reports connection status", () => {
    const bridge = new Bridge();
    expect(bridge.isConnected()).toBe(false);
    bridge.setConnection(new ExtensionConnection(() => {}));
    expect(bridge.isConnected()).toBe(true);
    bridge.setConnection(null);
    expect(bridge.isConnected()).toBe(false);
  });
});

describe("Bridge unavailable reason (port busy etc.)", () => {
  it("surfaces the reason instead of the generic not-connected error", async () => {
    const bridge = new Bridge();
    bridge.setUnavailableReason("WebSocket port 9234 is busy (EADDRINUSE)");
    await expect(bridge.call("navigate", {})).rejects.toThrow(/port 9234 is busy/);
    await expect(bridge.call("navigate", {})).rejects.not.toThrow(/not connected/i);
  });

  it("clearing the reason restores the generic message", async () => {
    const bridge = new Bridge();
    bridge.setUnavailableReason("busy");
    bridge.setUnavailableReason(null);
    await expect(bridge.call("navigate", {})).rejects.toThrow(/not connected/i);
    expect(bridge.unavailableReason()).toBeNull();
  });

  it("a live connection wins over a stale reason", async () => {
    const bridge = new Bridge();
    bridge.setUnavailableReason("busy");
    const conn = new ExtensionConnection(() => {}, 1000);
    bridge.setConnection(conn);
    const p = bridge.call("navigate", {});
    conn.handleMessage(JSON.stringify({ id: "1", result: "ok" }));
    await expect(p).resolves.toBe("ok");
  });

  it("exposes host state for diagnostics, defaulting to not listening", () => {
    const bridge = new Bridge();
    expect(bridge.hostState).toEqual({ listening: false, port: null });
    bridge.hostState = { listening: true, port: 9234 };
    expect(bridge.hostState.port).toBe(9234);
  });
});

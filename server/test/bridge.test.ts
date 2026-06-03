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

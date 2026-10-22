// BridgeClient's typed daemon events (Step 7 T4): `tabGone`, `leaseGranted`, `extensionStatus`.
import { describe, it, expect, vi } from "vitest";
import type { WelcomeMessage } from "@bridge/shared";
import { BridgeClient } from "../src/client.js";
import type { Knocked } from "../src/knock.js";
import { FakeConnection } from "./fakes.js";

function welcome(over: Partial<WelcomeMessage> = {}): WelcomeMessage {
  return { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true, ...over };
}

async function connected() {
  const conn = new FakeConnection();
  const client = new BridgeClient({ knock: async (): Promise<Knocked> => ({ conn, welcome: welcome() }) });
  await client.connect();
  return { client, conn };
}

describe("BridgeClient typed events", () => {
  it("delivers tabGone params to on('tabGone')", async () => {
    const { client, conn } = await connected();
    const got = vi.fn();
    client.on("tabGone", got);
    conn.emit({ event: "tabGone", params: { tab: "T3", lastUrl: "http://localhost:8080/x", lastTitle: "X" } });
    expect(got).toHaveBeenCalledTimes(1);
    expect(got).toHaveBeenCalledWith({ tab: "T3", lastUrl: "http://localhost:8080/x", lastTitle: "X" });
  });

  it("delivers leaseGranted params to on('leaseGranted')", async () => {
    const { client, conn } = await connected();
    const got = vi.fn();
    client.on("leaseGranted", got);
    conn.emit({ event: "leaseGranted", params: { tab: "T7", reason: "opener", url: "" } });
    expect(got).toHaveBeenCalledWith({ tab: "T7", reason: "opener", url: "" });
  });

  it("delivers extensionStatus params to on('extensionStatus') and still updates extensionConnected", async () => {
    const { client, conn } = await connected();
    const got = vi.fn();
    client.on("extensionStatus", got);
    conn.emit({ event: "extensionStatus", params: { connected: false } });
    expect(got).toHaveBeenCalledWith({ connected: false });
    expect(client.extensionConnected).toBe(false);
  });

  it("routes each event only to its own listeners", async () => {
    const { client, conn } = await connected();
    const gone = vi.fn();
    const lease = vi.fn();
    const ext = vi.fn();
    client.on("tabGone", gone);
    client.on("leaseGranted", lease);
    client.on("extensionStatus", ext);
    conn.emit({ event: "leaseGranted", params: { tab: "T7", reason: "opener", url: "" } });
    expect(lease).toHaveBeenCalledTimes(1);
    expect(gone).not.toHaveBeenCalled();
    expect(ext).not.toHaveBeenCalled();
  });

  it("does not deliver a malformed frame to the typed listener (the shared guards decide)", async () => {
    const { client, conn } = await connected();
    const gone = vi.fn();
    const lease = vi.fn();
    const ext = vi.fn();
    const raw = vi.fn();
    client.on("tabGone", gone);
    client.on("leaseGranted", lease);
    client.on("extensionStatus", ext);
    client.on("event", raw);
    conn.emit({ event: "tabGone", params: { tab: 3 } }); // tab must be a string
    conn.emit({ event: "tabGone", params: { tab: "T3", lastUrl: null } }); // optional, but mistyped
    conn.emit({ event: "leaseGranted", params: { tab: "T7", reason: "claimed", url: "" } }); // reason is "opener"
    conn.emit({ event: "leaseGranted", params: { tab: "T7", reason: "opener" } }); // url missing
    conn.emit({ event: "extensionStatus", params: { connected: "yes" } });
    expect(gone).not.toHaveBeenCalled();
    expect(lease).not.toHaveBeenCalled();
    expect(ext).not.toHaveBeenCalled();
    expect(raw).toHaveBeenCalledTimes(5); // the untyped stream is unchanged
    expect(client.extensionConnected).toBe(true);
  });

  it("returns an unsubscribe", async () => {
    const { client, conn } = await connected();
    const got = vi.fn();
    const off = client.on("tabGone", got);
    off();
    conn.emit({ event: "tabGone", params: { tab: "T3" } });
    expect(got).not.toHaveBeenCalled();
  });

  it("dispatches synchronously: frames delivered in one read all reach a listener that unsubscribes in its callback", async () => {
    // ws emits several frames from one TCP read synchronously (CLAUDE.md gotcha). A typed listener
    // must see each frame in order, with no promise in between.
    const { client, conn } = await connected();
    const seen: string[] = [];
    const off = client.on("tabGone", (p) => {
      seen.push(p.tab);
      if (p.tab === "T2") off();
    });
    const after = vi.fn();
    client.on("leaseGranted", after);
    conn.emit({ event: "tabGone", params: { tab: "T1" } });
    conn.emit({ event: "tabGone", params: { tab: "T2" } });
    conn.emit({ event: "leaseGranted", params: { tab: "T9", reason: "opener", url: "" } });
    conn.emit({ event: "tabGone", params: { tab: "T3" } });
    expect(seen).toEqual(["T1", "T2"]); // no microtask was needed, and T3 came after the unsubscribe
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("keeps on('event') and on('reconnected') working beside the typed listeners", async () => {
    const conns = [new FakeConnection(), new FakeConnection()];
    let i = 0;
    const client = new BridgeClient({
      knock: async (): Promise<Knocked> => ({ conn: conns[i++], welcome: welcome({ clientId: `c${i}` }) }),
    });
    await client.connect();
    const raw = vi.fn();
    const reconnected = vi.fn();
    const gone = vi.fn();
    client.on("event", raw);
    client.on("reconnected", reconnected);
    client.on("tabGone", gone);
    conns[0].fireClose(4002, "upgrading");
    await new Promise<void>((r) => setImmediate(r));
    expect(reconnected).toHaveBeenCalledTimes(1);
    conns[1].emit({ event: "tabGone", params: { tab: "T1" } });
    expect(raw).toHaveBeenCalledTimes(1);
    expect(gone).toHaveBeenCalledWith({ tab: "T1" });
  });
});

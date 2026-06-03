import { describe, it, expect, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../src/bridge.js";
import { WsHost } from "../src/wsHost.js";

describe("WsHost", () => {
  let host: WsHost | undefined;
  afterEach(async () => {
    await host?.close();
    host = undefined;
  });

  function connect(port: number): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });
  }

  function waitUntil(pred: () => boolean, timeoutMs = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (pred()) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error("waitUntil timed out"));
        setTimeout(tick, 5);
      };
      tick();
    });
  }

  it("accepts a valid token and routes a call to the extension", async () => {
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: "secret" });
    const port = await host.listen();

    const ws = await connect(port);
    ws.send(JSON.stringify({ type: "hello", token: "secret" }));
    ws.on("message", (raw) => {
      const req = JSON.parse(raw.toString());
      if (req.method) ws.send(JSON.stringify({ id: req.id, result: { echoed: req.method } }));
    });

    await waitUntil(() => bridge.isConnected());
    await expect(bridge.call("navigate", { url: "x" })).resolves.toEqual({ echoed: "navigate" });
    ws.close();
  });

  it("keeps the newest connection when an old socket closes after reconnect", async () => {
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: "secret" });
    const port = await host.listen();

    const wsA = await connect(port);
    wsA.send(JSON.stringify({ type: "hello", token: "secret" }));
    await waitUntil(() => bridge.isConnected());
    const connA = bridge.currentConnection();

    const wsB = await connect(port);
    wsB.send(JSON.stringify({ type: "hello", token: "secret" }));
    wsB.on("message", (raw) => {
      const req = JSON.parse(raw.toString());
      if (req.method) wsB.send(JSON.stringify({ id: req.id, result: { via: "B" } }));
    });
    await waitUntil(() => bridge.currentConnection() !== null && bridge.currentConnection() !== connA);

    const aClosed = new Promise<void>((resolve) => wsA.on("close", () => resolve()));
    wsA.close();
    await aClosed;
    await waitUntil(() => true); // let the close handler run a tick
    await new Promise((r) => setTimeout(r, 20));

    expect(bridge.isConnected()).toBe(true);
    await expect(bridge.call("navigate", {})).resolves.toEqual({ via: "B" });
    wsB.close();
  });

  it("closes connections that send a bad token", async () => {
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: "secret" });
    const port = await host.listen();
    const ws = await connect(port);
    const closed = new Promise<number>((resolve) => ws.on("close", (code) => resolve(code)));
    ws.send(JSON.stringify({ type: "hello", token: "wrong" }));
    await expect(closed).resolves.toBeGreaterThan(0);
    expect(bridge.isConnected()).toBe(false);
  });
});

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

    await new Promise((r) => setTimeout(r, 50));
    await expect(bridge.call("navigate", { url: "x" })).resolves.toEqual({ echoed: "navigate" });
    ws.close();
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

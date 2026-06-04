import { describe, it, expect, afterEach } from "vitest";
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

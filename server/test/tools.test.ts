import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/tools/registry.js";
import { Bridge } from "../src/bridge.js";

function fakeBridge(handler: (method: string, params?: Record<string, unknown>) => Promise<unknown>): Bridge {
  const bridge = new Bridge();
  vi.spyOn(bridge, "call").mockImplementation((m, p) => handler(m, p));
  return bridge;
}

describe("registerTools", () => {
  it("registers browser_navigate which calls bridge.navigate and returns text", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { url: (p as Record<string, unknown>).url };
    });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    registerTools(server, bridge);

    // SDK v1.29.x stores tools under _registeredTools[name].handler
    const tool = (server as unknown as Record<string, Record<string, { handler: (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown> }>>)._registeredTools["browser_navigate"];
    expect(tool).toBeDefined();
    const res = await tool.handler({ url: "https://example.com" }, {});
    expect(calls).toEqual([["navigate", { url: "https://example.com" }]]);
    expect((res as { content: Array<{ text: string }> }).content[0].text).toContain("https://example.com");
  });
});

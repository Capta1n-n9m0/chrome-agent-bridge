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

describe("perception tools", () => {
  it("browser_snapshot returns the snapshot text", async () => {
    const bridge = fakeBridge(async () => ({ text: 'url: x\n- button "Go" [ref=e1]', count: 1 }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_snapshot"];
    const res = await tool.handler({}, {});
    expect(res.content[0].text).toContain("[ref=e1]");
  });

  it("browser_screenshot returns image content", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const bridge = fakeBridge(async () => ({ dataUrl: png }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_screenshot"];
    const res = await tool.handler({}, {});
    expect(res.content[0].type).toBe("image");
    expect(res.content[0].mimeType).toBe("image/png");
    expect(res.content[0].data.startsWith("iVBOR")).toBe(true);
  });
});

describe("action tools", () => {
  it("browser_click forwards the ref to bridge.click", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_click"];
    await tool.handler({ ref: "e5" }, {});
    expect(calls).toEqual([["click", { ref: "e5", trusted: false }]]);
  });

  it("browser_type forwards trusted:false when the flag is omitted", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    await (server as any)._registeredTools["browser_type"].handler({ ref: "e5", text: "hi" }, {});
    expect(calls).toEqual([["type", { ref: "e5", text: "hi", submit: false, trusted: false }]]);
  });

  it("browser_type forwards trusted:true when asked", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    await (server as any)._registeredTools["browser_type"].handler(
      { ref: "e5", text: "hi", submit: true, trusted: true },
      {},
    );
    expect(calls).toEqual([["type", { ref: "e5", text: "hi", submit: true, trusted: true }]]);
  });

  it("browser_press_key forwards trusted:false when the flag is omitted", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    await (server as any)._registeredTools["browser_press_key"].handler({ key: "Enter" }, {});
    expect(calls).toEqual([["pressKey", { key: "Enter", trusted: false }]]);
  });

  it("browser_press_key forwards trusted:true when asked", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    await (server as any)._registeredTools["browser_press_key"].handler({ key: "Enter", trusted: true }, {});
    expect(calls).toEqual([["pressKey", { key: "Enter", trusted: true }]]);
  });

  it("browser_list_tabs renders the tab list as text", async () => {
    const bridge = fakeBridge(async () => ({ tabs: [{ id: 1, title: "A", url: "http://a", active: true }] }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_list_tabs"];
    const res = await tool.handler({}, {});
    expect(res.content[0].text).toContain("[1]");
    expect(res.content[0].text).toContain("A");
  });
});

describe("wait tool", () => {
  it("browser_wait_for forwards text to bridge.waitFor", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_wait_for"];
    await tool.handler({ text: "Welcome" }, {});
    expect(calls).toEqual([["waitFor", { text: "Welcome" }]]);
  });
});

describe("browser_status", () => {
  function statusTool(bridge: Bridge) {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    return (server as any)._registeredTools["browser_status"];
  }

  it("reports a busy port without touching the bridge", async () => {
    const bridge = new Bridge();
    const call = vi.spyOn(bridge, "call");
    bridge.hostState = { listening: false, port: 9234 };
    bridge.setUnavailableReason("WebSocket port 9234 is busy (EADDRINUSE): another instance is running");
    const res = await statusTool(bridge).handler({}, {});
    const out = res.content[0].text as string;
    expect(out).toMatch(/9234/);
    expect(out).toMatch(/not listening/i);
    expect(out).toMatch(/extension: not connected/i);
    expect(out).toMatch(/EADDRINUSE/);
    expect(call).not.toHaveBeenCalled();
  });

  it("reports listening + not connected when Chrome hasn't dialed in", async () => {
    const bridge = new Bridge();
    bridge.hostState = { listening: true, port: 9234 };
    const res = await statusTool(bridge).handler({}, {});
    const out = res.content[0].text as string;
    expect(out).toMatch(/listening on 127\.0\.0\.1:9234/);
    expect(out).toMatch(/extension: not connected/i);
  });

  it("includes the active tab when connected", async () => {
    const bridge = fakeBridge(async (m) => {
      expect(m).toBe("listTabs");
      return {
        tabs: [
          { id: 1, title: "Other", url: "https://other.test/", active: false },
          { id: 7, title: "Playground", url: "http://localhost:8080/e2e-playground.html", active: true },
        ],
      };
    });
    bridge.hostState = { listening: true, port: 9234 };
    bridge.setConnection(new (await import("../src/connection.js")).ExtensionConnection(() => {}));
    const res = await statusTool(bridge).handler({}, {});
    const out = res.content[0].text as string;
    expect(out).toMatch(/extension: connected/i);
    expect(out).toMatch(/\[7\] Playground — http:\/\/localhost:8080\/e2e-playground\.html/);
  });
});

describe("browser_evaluate", () => {
  function evalTool(handler: (m: string, p?: any, o?: any) => Promise<unknown>) {
    const bridge = new Bridge();
    vi.spyOn(bridge, "call").mockImplementation((m, p, o) => handler(m, p, o));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    return (server as any)._registeredTools["browser_evaluate"];
  }

  it("sends the default timeout and returns the description as text", async () => {
    const calls: Array<[string, any, any]> = [];
    const tool = evalTool(async (m, p, o) => {
      calls.push([m, p, o]);
      return { kind: "json", value: 2, description: "2", truncated: false };
    });
    const res = await tool.handler({ expression: "1+1" }, {});
    expect(calls).toEqual([["evaluate", { expression: "1+1", timeoutMs: 10_000 }, { timeoutMs: 15_000 }]]);
    expect(res.content[0].text).toBe("2");
  });

  it("gives the server 5s more than the page timeout", async () => {
    const calls: Array<[string, any, any]> = [];
    const tool = evalTool(async (m, p, o) => {
      calls.push([m, p, o]);
      return { kind: "undefined", description: "undefined", truncated: false };
    });
    await tool.handler({ expression: "x", timeoutMs: 30_000 }, {});
    expect(calls).toEqual([["evaluate", { expression: "x", timeoutMs: 30_000 }, { timeoutMs: 35_000 }]]);
  });

  it("appends a hint when the output was truncated", async () => {
    const tool = evalTool(async () => ({ kind: "json", value: [1], description: "[1]", truncated: true }));
    const res = await tool.handler({ expression: "big" }, {});
    const out = res.content[0].text as string;
    expect(out.startsWith("[1]")).toBe(true);
    expect(out.endsWith("(output truncated — narrow the expression, e.g. pick fields or slice the array)")).toBe(true);
  });

  it("appends a hint for a DOM node result", async () => {
    const tool = evalTool(async () => ({ kind: "node", description: "<body>", truncated: false }));
    const res = await tool.handler({ expression: "document.body" }, {});
    const out = res.content[0].text as string;
    expect(out.startsWith("<body>")).toBe(true);
    expect(out.endsWith("(DOM node — use browser_snapshot refs to act on it)")).toBe(true);
  });

  it("propagates a bridge error as a thrown error", async () => {
    const tool = evalTool(async () => {
      throw new Error("Error: boom\n    at <anonymous>:1:5");
    });
    await expect(tool.handler({ expression: "throw new Error('boom')" }, {})).rejects.toThrow(/Error: boom/);
  });
});

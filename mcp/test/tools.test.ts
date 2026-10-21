import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type ToolBridge } from "../src/tools/registry.js";
import { BridgeLink } from "../src/link.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";

type Handler = (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) => Promise<unknown>;

/** A fake BridgeClient (as the tools see it): a client is held; `call` goes to `handler`. */
function fakeBridge(handler: Handler, status: () => Promise<unknown> = async () => ({})) {
  return {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(handler),
    status: vi.fn(status),
  } satisfies ToolBridge;
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

  it("browser_wait_for forwards seconds unchanged", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const res = await (server as any)._registeredTools["browser_wait_for"].handler({ seconds: 2 }, {});
    expect(calls).toEqual([["waitFor", { seconds: 2 }]]);
    expect(res.content[0].text).toBe("Waited 2s");
  });

  it("browser_wait_for forwards networkIdle + idleMs", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true, idleAfterMs: 812 };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const res = await (server as any)._registeredTools["browser_wait_for"].handler(
      { networkIdle: true, idleMs: 800 },
      {},
    );
    expect(calls).toEqual([["waitFor", { networkIdle: true, idleMs: 800 }]]);
    expect(res.content[0].text).toBe("Network idle for 800ms");
  });

  it("browser_wait_for networkIdle reports the default idleMs", async () => {
    const bridge = fakeBridge(async () => ({ ok: true }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const res = await (server as any)._registeredTools["browser_wait_for"].handler({ networkIdle: true }, {});
    expect(res.content[0].text).toBe("Network idle for 500ms");
  });

  it("browser_wait_for accepts the networkIdle schema and rejects a bad idleMs", () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, fakeBridge(async () => ({ ok: true })));
    const shape = (server as any)._registeredTools["browser_wait_for"].inputSchema.shape;
    expect(shape.networkIdle.safeParse(true).success).toBe(true);
    expect(shape.idleMs.safeParse(800).success).toBe(true);
    expect(shape.idleMs.safeParse(50).success).toBe(false);
    expect(shape.idleMs.safeParse(20000).success).toBe(false);
    expect(shape.idleMs.safeParse(undefined).success).toBe(true);
  });
});

describe("browser_status", () => {
  function statusTool(bridge: ToolBridge) {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    return (server as any)._registeredTools["browser_status"];
  }

  const daemonStatus = (extensionConnected: boolean) => ({
    build: "abc123def456",
    uptime: 42_400,
    extensionConnected,
    clients: [
      { id: "c1", name: "claude-code #4242", since: 1 },
      { id: "c2", name: "export-grades.ts", since: 2 },
    ],
    port: 9234,
  });

  it("reports the stored reason without calling anything when there is no daemon", async () => {
    const bridge = {
      hasClient: false,
      reason: "a pre-Step-6 bridge server holds port 9234 — end the old session",
      call: vi.fn(async () => ({})),
      status: vi.fn(async () => ({})),
    };
    const res = await statusTool(bridge).handler({}, {});
    const out = res.content[0].text as string;
    expect(out).toBe(
      "Daemon: not connected\nProblem: a pre-Step-6 bridge server holds port 9234 — end the old session",
    );
    expect(bridge.call).not.toHaveBeenCalled();
    expect(bridge.status).not.toHaveBeenCalled();
  });

  it("reports the daemon, its clients by name, and the extension not connected", async () => {
    const bridge = fakeBridge(async () => ({ tabs: [] }), async () => daemonStatus(false));
    const res = await statusTool(bridge).handler({}, {});
    const out = res.content[0].text as string;
    expect(out).toBe(
      [
        "Daemon: connected on 127.0.0.1:9234 (build abc123def456, up 42s)",
        "Clients (2): claude-code #4242, export-grades.ts",
        "Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?",
      ].join("\n"),
    );
    expect(bridge.call).not.toHaveBeenCalled();
  });

  it("includes the client names and the active tab when connected", async () => {
    const bridge = fakeBridge(
      async (m) => {
        expect(m).toBe("listTabs");
        return {
          tabs: [
            { id: 1, title: "Other", url: "https://other.test/", active: false },
            { id: 7, title: "Playground", url: "http://localhost:8080/e2e-playground.html", active: true },
          ],
        };
      },
      async () => daemonStatus(true),
    );
    const res = await statusTool(bridge).handler({}, {});
    const out = res.content[0].text as string;
    expect(out).toMatch(/Clients \(2\): claude-code #4242, export-grades\.ts/);
    expect(out).toMatch(/extension: connected/i);
    expect(out).toMatch(/\[7\] Playground — http:\/\/localhost:8080\/e2e-playground\.html/);
  });
});

describe("browser_evaluate", () => {
  function evalTool(handler: (m: string, p?: any, o?: any) => Promise<unknown>) {
    const bridge = fakeBridge(handler);
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

describe("network tools", () => {
  function netTool(name: string, handler: (m: string, p?: any) => Promise<unknown>) {
    const bridge = fakeBridge(handler);
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    return (server as any)._registeredTools[name];
  }

  it("browser_network_requests calls networkRequests with no defaults injected and returns result.text", async () => {
    const calls: Array<[string, any]> = [];
    const tool = netTool("browser_network_requests", async (m, p) => {
      calls.push([m, p]);
      return { entries: [], total: 0, pending: 0, recordingSince: 1, text: "Network — active tab: showing 0 of 0" };
    });
    const res = await tool.handler({}, {});
    expect(calls).toEqual([["networkRequests", {}]]);
    expect(res.content[0].text).toBe("Network — active tab: showing 0 of 0");
  });

  it("browser_network_requests passes every param through verbatim", async () => {
    const calls: Array<[string, any]> = [];
    const tool = netTool("browser_network_requests", async (m, p) => {
      calls.push([m, p]);
      return { entries: [], total: 0, pending: 0, recordingSince: 1, text: "ok" };
    });
    const params = { filter: "/api/", types: ["xhr"], failedOnly: true, limit: 10, includeHeaders: true, tab: "all" };
    await tool.handler(params, {});
    expect(calls).toEqual([["networkRequests", params]]);
  });

  it("browser_network_requests passes an id lookup through", async () => {
    const calls: Array<[string, any]> = [];
    const tool = netTool("browser_network_requests", async (m, p) => {
      calls.push([m, p]);
      return { entries: [], total: 1, pending: 0, recordingSince: 1, text: "[1043] GET http://localhost:8080/ok.json" };
    });
    const res = await tool.handler({ id: "1043" }, {});
    expect(calls).toEqual([["networkRequests", { id: "1043" }]]);
    expect(res.content[0].text).toContain("[1043]");
  });

  it("browser_network_requests propagates a bridge error", async () => {
    const tool = netTool("browser_network_requests", async () => {
      throw new Error("Invalid regex filter: /(/ — Unterminated group");
    });
    await expect(tool.handler({ filter: "/(/" }, {})).rejects.toThrow(/Invalid regex filter/);
  });

  it("browser_network_clear calls networkClear and reports the count", async () => {
    const calls: Array<[string, any]> = [];
    const tool = netTool("browser_network_clear", async (m, p) => {
      calls.push([m, p]);
      return { cleared: 7 };
    });
    const res = await tool.handler({}, {});
    expect(calls).toEqual([["networkClear", {}]]);
    expect(res.content[0].text).toBe("Cleared 7 requests.");
  });

  it("browser_network_clear passes tab through", async () => {
    const calls: Array<[string, any]> = [];
    const tool = netTool("browser_network_clear", async (m, p) => {
      calls.push([m, p]);
      return { cleared: 0 };
    });
    await tool.handler({ tab: "all" }, {});
    expect(calls).toEqual([["networkClear", { tab: "all" }]]);
  });
});

describe("no daemon (connect() failing)", () => {
  const REASON = "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 9234)";

  /** Minimal valid arguments for every tool except browser_status. */
  const ARGS: Record<string, Record<string, unknown>> = {
    browser_navigate: { url: "https://example.com" },
    browser_snapshot: {},
    browser_screenshot: {},
    browser_click: { ref: "e1" },
    browser_type: { ref: "e1", text: "hi" },
    browser_press_key: { key: "Enter" },
    browser_scroll: {},
    browser_hover: { ref: "e1" },
    browser_select_option: { ref: "e1", values: ["a"] },
    browser_back: {},
    browser_forward: {},
    browser_list_tabs: {},
    browser_select_tab: { id: 1 },
    browser_new_tab: {},
    browser_close_tab: { id: 1 },
    browser_wait_for: { seconds: 1 },
    browser_evaluate: { expression: "1" },
    browser_download: { url: "https://example.com/f.pdf", path: "/nonexistent-dir-for-test/f.pdf" },
    browser_network_requests: {},
    browser_network_clear: {},
  };

  async function linkWithFailingConnect() {
    const connect = vi.fn(async () => {
      throw new BridgeError(ErrorCodes.NOT_CONNECTED, REASON);
    });
    const link = new BridgeLink({
      connect,
      timers: { setTimeout: () => 0, clearTimeout: () => {} },
    });
    link.start();
    await new Promise<void>((r) => setImmediate(r));
    return { link, connect };
  }

  it("registers all 21 tools and a tool call carries the stored reason", async () => {
    const { link, connect } = await linkWithFailingConnect();
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, link);
    const tools = (server as any)._registeredTools as Record<string, { handler: Function }>;
    expect(Object.keys(tools)).toHaveLength(21);
    expect(connect).toHaveBeenCalledTimes(1);
    await expect(tools["browser_snapshot"].handler({}, {})).rejects.toThrow(REASON);
    const status = await tools["browser_status"].handler({}, {});
    expect(status.content[0].text).toBe(`Daemon: not connected\nProblem: ${REASON}`);
  });

  it("every tool except browser_status surfaces the stored reason", async () => {
    const { link } = await linkWithFailingConnect();
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, link);
    const tools = (server as any)._registeredTools as Record<string, { handler: Function }>;
    const names = Object.keys(tools).filter((n) => n !== "browser_status");
    expect(names.sort()).toEqual(Object.keys(ARGS).sort());
    for (const name of names) {
      const err = await Promise.resolve(tools[name].handler(ARGS[name], {})).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err, name).toBeInstanceOf(BridgeError);
      expect((err as BridgeError).message, name).toBe(REASON);
    }
  });
});

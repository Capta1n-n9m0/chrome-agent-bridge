import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type ToolBridge } from "../src/tools/registry.js";
import { BridgeLink } from "../src/link.js";
import { TabCursor, lostNotice } from "../src/cursor.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";

type Params = Record<string, unknown>;
type Handler = (method: string, params?: Params, options?: { timeoutMs?: number }) => Promise<unknown>;
type Call = [string, Params | undefined];

/**
 * A fake BridgeClient (as the tools see it): a client is held; `call` goes to `handler`, except
 * `tabs.claim {active:true}`, which the fake answers itself with the human's tab (`human()`, "T1"
 * unless a test changes it) — the daemon's first-touch claim. Every call, claims included, is
 * recorded in `calls` (Step 7 T4: the fake records tab resolution).
 */
function fakeBridge(handler: Handler = async () => ({ ok: true }), status: () => Promise<unknown> = async () => ({})) {
  const calls: Call[] = [];
  let human = "T1";
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params, options?: { timeoutMs?: number }) => {
      calls.push([method, params]);
      if (method === "tabs.claim" && params?.active === true) return { tab: human };
      return handler(method, params, options);
    }),
    status: vi.fn(status),
  } satisfies ToolBridge;
  return {
    bridge,
    calls,
    /** The calls other than the first-touch claim. */
    work: () => calls.filter(([m, p]) => !(m === "tabs.claim" && p?.active === true)),
    claims: () => calls.filter(([m, p]) => m === "tabs.claim" && p?.active === true).length,
    setHuman(tab: string) {
      human = tab;
    },
  };
}

type ToolHandler = (args: Params, extra: Params) => Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>; isError?: boolean }>;

function tools(bridge: ToolBridge, cursor?: TabCursor) {
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(server, bridge, cursor);
  // SDK v1.29.x stores tools under _registeredTools[name].handler
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: ToolHandler; inputSchema?: { shape: Record<string, { safeParse(v: unknown): { success: boolean } }> } }> })._registeredTools;
  return {
    registered,
    run: (name: string, args: Params = {}) => registered[name].handler(args, {}),
  };
}

const textOf = (res: { content: Array<{ text?: string }> }) => res.content[0].text as string;

const heldError = new BridgeError(
  ErrorCodes.TAB_HELD,
  'tab T1 is held by "claude-code #4412" since 10:01:33 — use browser_new_tab, or browser_list_tabs to pick a free tab',
  { owner: "claude-code #4412", since: 0 },
);

describe("registerTools", () => {
  it("registers browser_navigate which calls navigate on the claimed tab and returns text", async () => {
    const f = fakeBridge(async (_m, p) => ({ url: p?.url }));
    const res = await tools(f.bridge).run("browser_navigate", { url: "https://example.com" });
    expect(f.calls).toEqual([
      ["tabs.claim", { active: true }],
      ["navigate", { url: "https://example.com", tab: "T1" }],
    ]);
    expect(textOf(res)).toBe("Navigated active tab to https://example.com");
  });

  it("registers 22 tools", () => {
    expect(Object.keys(tools(fakeBridge().bridge).registered)).toHaveLength(22);
  });
});

describe("perception tools", () => {
  it("browser_snapshot renders the snapshot result with formatSnapshot", async () => {
    const f = fakeBridge(async () => ({
      url: "http://x/",
      title: "X",
      elements: [{ ref: "e1", role: "button", name: "Go", depth: 0 }],
      truncated: false,
    }));
    const res = await tools(f.bridge).run("browser_snapshot");
    expect(f.work()).toEqual([["snapshot", { tab: "T1" }]]);
    expect(textOf(res)).toBe('url: http://x/   title: "X"\n- button "Go" [ref=e1]');
  });

  it("browser_screenshot returns image content", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const f = fakeBridge(async () => ({ dataUrl: png }));
    const res = await tools(f.bridge).run("browser_screenshot");
    expect(f.work()).toEqual([["screenshot", { fullPage: false, tab: "T1" }]]);
    expect(res.content[0].type).toBe("image");
    expect(res.content[0].mimeType).toBe("image/png");
    expect(res.content[0].data!.startsWith("iVBOR")).toBe(true);
  });
});

describe("action tools", () => {
  it("browser_click forwards the ref to click", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_click", { ref: "e5" });
    expect(f.work()).toEqual([["click", { ref: "e5", trusted: false, tab: "T1" }]]);
  });

  it("browser_type forwards trusted:false when the flag is omitted", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_type", { ref: "e5", text: "hi" });
    expect(f.work()).toEqual([["type", { ref: "e5", text: "hi", submit: false, trusted: false, tab: "T1" }]]);
  });

  it("browser_type forwards trusted:true when asked", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_type", { ref: "e5", text: "hi", submit: true, trusted: true });
    expect(f.work()).toEqual([["type", { ref: "e5", text: "hi", submit: true, trusted: true, tab: "T1" }]]);
  });

  it("browser_press_key forwards trusted:false when the flag is omitted", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_press_key", { key: "Enter" });
    expect(f.work()).toEqual([["pressKey", { key: "Enter", trusted: false, tab: "T1" }]]);
  });

  it("browser_press_key forwards trusted:true when asked", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_press_key", { key: "Enter", trusted: true });
    expect(f.work()).toEqual([["pressKey", { key: "Enter", trusted: true, tab: "T1" }]]);
  });

  it("the other tab-touching tools send their params plus the tab, with today's result texts", async () => {
    const f = fakeBridge();
    const t = tools(f.bridge);
    expect(textOf(await t.run("browser_scroll", {}))).toBe("Scrolled");
    expect(textOf(await t.run("browser_hover", { ref: "e2" }))).toBe("Hovered e2");
    expect(textOf(await t.run("browser_select_option", { ref: "e3", values: ["a", "b"] }))).toBe("Selected a, b in e3");
    expect(textOf(await t.run("browser_back"))).toBe("Went back");
    expect(textOf(await t.run("browser_forward"))).toBe("Went forward");
    expect(f.work()).toEqual([
      ["scroll", { direction: "down", tab: "T1" }],
      ["hover", { ref: "e2", tab: "T1" }],
      ["selectOption", { ref: "e3", values: ["a", "b"], tab: "T1" }],
      ["back", { tab: "T1" }],
      ["forward", { tab: "T1" }],
    ]);
    expect(f.claims()).toBe(1);
  });
});

describe("tab resolution (T4.4)", () => {
  it("a tool call with `tab` passes it through and claims nothing", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_click", { ref: "e5", tab: "T9" });
    expect(f.calls).toEqual([["click", { ref: "e5", trusted: false, tab: "T9" }]]);
  });

  it("an explicit `tab` does not move the cursor", async () => {
    const f = fakeBridge();
    const t = tools(f.bridge);
    await t.run("browser_click", { ref: "e1" }); // claims T1
    await t.run("browser_click", { ref: "e2", tab: "T9" });
    await t.run("browser_click", { ref: "e3" });
    expect(f.work().map(([, p]) => p?.tab)).toEqual(["T1", "T9", "T1"]);
    expect(f.claims()).toBe(1);
  });

  it("without `tab` the active tab is claimed on first touch and kept, even when the human's tab changes", async () => {
    const f = fakeBridge();
    const t = tools(f.bridge);
    await t.run("browser_hover", { ref: "e0" });
    f.setHuman("T5"); // the human switches tabs
    await t.run("browser_click", { ref: "e1" });
    await t.run("browser_press_key", { key: "Enter" });
    expect(f.calls[0]).toEqual(["tabs.claim", { active: true }]);
    expect(f.claims()).toBe(1);
    expect(f.work().map(([, p]) => p?.tab)).toEqual(["T1", "T1", "T1"]);
  });

  it("concurrent first touches send one claim", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const calls: Call[] = [];
    const bridge: ToolBridge = {
      hasClient: true,
      reason: null,
      call: vi.fn(async (m: string, p?: Params) => {
        calls.push([m, p]);
        if (m === "tabs.claim") {
          await gate;
          return { tab: "T2" };
        }
        return { ok: true };
      }),
      status: vi.fn(async () => ({})),
    };
    const t = tools(bridge);
    const a = t.run("browser_click", { ref: "e1" });
    const b = t.run("browser_hover", { ref: "e2" });
    const c = t.run("browser_press_key", { key: "Enter" });
    release();
    await Promise.all([a, b, c]);
    expect(calls.filter(([m]) => m === "tabs.claim")).toHaveLength(1);
    expect(calls.filter(([m]) => m !== "tabs.claim").map(([, p]) => p?.tab)).toEqual(["T2", "T2", "T2"]);
  });

  it("a TAB_HELD from the first-touch claim is the tool's error and names the owner", async () => {
    const bridge: ToolBridge = {
      hasClient: true,
      reason: null,
      call: vi.fn(async () => {
        throw heldError;
      }),
      status: vi.fn(async () => ({})),
    };
    const err = await tools(bridge).run("browser_snapshot").then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe(ErrorCodes.TAB_HELD);
    expect((err as BridgeError).message).toContain("claude-code #4412");
    expect(bridge.call).toHaveBeenCalledTimes(1); // nothing ran after the failed claim
  });

  it("a TAB_HELD on an explicit tab renders the owner's actor name", async () => {
    const f = fakeBridge(async () => {
      throw heldError;
    });
    await expect(tools(f.bridge).run("browser_click", { ref: "e1", tab: "T1" })).rejects.toThrow('held by "claude-code #4412"');
  });

  it("a failed first-touch claim leaves no cursor: the next call claims again", async () => {
    let n = 0;
    const calls: Call[] = [];
    const bridge: ToolBridge = {
      hasClient: true,
      reason: null,
      call: vi.fn(async (m: string, p?: Params) => {
        calls.push([m, p]);
        if (m === "tabs.claim" && n++ === 0) throw heldError;
        if (m === "tabs.claim") return { tab: "T4" };
        return { ok: true };
      }),
      status: vi.fn(async () => ({})),
    };
    const t = tools(bridge);
    await expect(t.run("browser_click", { ref: "e1" })).rejects.toThrow("claude-code #4412");
    await t.run("browser_click", { ref: "e1" });
    expect(calls).toEqual([
      ["tabs.claim", { active: true }],
      ["tabs.claim", { active: true }],
      ["click", { ref: "e1", trusted: false, tab: "T4" }],
    ]);
  });

  it("TAB_GONE on the cursor's tab passes through and the cursor is kept (no silent move to the human's tab)", async () => {
    const gone = new BridgeError(ErrorCodes.TAB_GONE, "tab T1 was closed — call listTabs to pick another tab", { tab: "T1" });
    const f = fakeBridge(async () => {
      throw gone;
    });
    const t = tools(f.bridge);
    await expect(t.run("browser_click", { ref: "e1" })).rejects.toThrow("tab T1 was closed");
    await expect(t.run("browser_click", { ref: "e1" })).rejects.toThrow("tab T1 was closed");
    expect(f.claims()).toBe(1);
    expect(f.work().map(([, p]) => p?.tab)).toEqual(["T1", "T1"]);
  });

  it("an explicit stale handle's TAB_UNKNOWN passes through", async () => {
    const f = fakeBridge(async () => {
      throw new BridgeError(ErrorCodes.TAB_UNKNOWN, "unknown tab handle T9 — call listTabs");
    });
    await expect(tools(f.bridge).run("browser_snapshot", { tab: "T9" })).rejects.toThrow("unknown tab handle T9 — call listTabs");
    expect(f.claims()).toBe(0);
  });

  it("every tab-touching tool's schema has an optional string `tab`; the others have none", () => {
    const { registered } = tools(fakeBridge().bridge);
    const tabTouching = [
      "browser_navigate", "browser_snapshot", "browser_screenshot", "browser_click", "browser_type",
      "browser_press_key", "browser_scroll", "browser_hover", "browser_select_option", "browser_back",
      "browser_forward", "browser_wait_for", "browser_evaluate", "browser_select_tab", "browser_close_tab",
      "browser_focus_tab", "browser_network_requests", "browser_network_clear",
    ];
    for (const name of Object.keys(registered)) {
      const shape = registered[name].inputSchema?.shape ?? {};
      if (tabTouching.includes(name)) {
        expect(shape.tab, name).toBeDefined();
        expect(shape.tab.safeParse("T3").success, name).toBe(true);
        expect(shape.tab.safeParse(undefined).success, name).toBe(true);
        expect(shape.tab.safeParse(3).success, name).toBe(false); // the numeric form is gone (F3)
      } else {
        expect(shape.tab, name).toBeUndefined();
      }
    }
    expect(tabTouching.filter((n) => registered[n])).toHaveLength(18);
  });
});

describe("cursor lost to a daemon restart", () => {
  it("the next untargeted call re-claims and its result gets one notice line, once", async () => {
    const f = fakeBridge();
    const cursor = new TabCursor(f.bridge);
    const t = tools(f.bridge, cursor);
    await t.run("browser_click", { ref: "e1" });
    cursor.markLost();
    f.setHuman("T6");
    const res = await t.run("browser_click", { ref: "e2" });
    expect(textOf(res)).toBe(`${lostNotice("T6")}\nClicked e2`);
    expect(textOf(await t.run("browser_click", { ref: "e3" }))).toBe("Clicked e3");
    expect(f.claims()).toBe(2);
  });

  it("puts the notice in its own text item before a screenshot's image", async () => {
    const f = fakeBridge(async () => ({ dataUrl: "data:image/png;base64,AAAA" }));
    const cursor = new TabCursor(f.bridge);
    const t = tools(f.bridge, cursor);
    await t.run("browser_screenshot");
    cursor.markLost();
    const res = await t.run("browser_screenshot");
    expect(res.content).toEqual([
      { type: "text", text: lostNotice("T1") },
      { type: "image", data: "AAAA", mimeType: "image/png" },
    ]);
  });

  it("a first-ever claim gives no notice", async () => {
    const f = fakeBridge();
    const cursor = new TabCursor(f.bridge);
    cursor.markLost();
    expect(textOf(await tools(f.bridge, cursor).run("browser_click", { ref: "e1" }))).toBe("Clicked e1");
  });

  it("an explicit-tab call after the loss neither re-claims nor takes the notice", async () => {
    const f = fakeBridge();
    const cursor = new TabCursor(f.bridge);
    const t = tools(f.bridge, cursor);
    await t.run("browser_click", { ref: "e1" });
    cursor.markLost();
    expect(textOf(await t.run("browser_click", { ref: "e2", tab: "T3" }))).toBe("Clicked e2");
    expect(f.claims()).toBe(1);
    expect(textOf(await t.run("browser_click", { ref: "e3" }))).toBe(`${lostNotice("T1")}\nClicked e3`);
  });

  it("if the call after the re-claim fails, the notice moves to the next result", async () => {
    let fail = false;
    const f = fakeBridge(async () => {
      if (fail) throw new Error("boom");
      return { ok: true };
    });
    const cursor = new TabCursor(f.bridge);
    const t = tools(f.bridge, cursor);
    await t.run("browser_click", { ref: "e1" });
    cursor.markLost();
    fail = true;
    await expect(t.run("browser_click", { ref: "e2" })).rejects.toThrow("boom");
    fail = false;
    expect(textOf(await t.run("browser_click", { ref: "e3" }))).toBe(`${lostNotice("T1")}\nClicked e3`);
    expect(textOf(await t.run("browser_click", { ref: "e4" }))).toBe("Clicked e4");
  });
});

describe("tab tools", () => {
  it("browser_list_tabs prints `T3* [owner] Title — url`, `*` from `current`", async () => {
    const f = fakeBridge(async () => ({
      tabs: [
        { id: 11, tab: "T1", title: "Inbox", url: "https://mail.test/", active: true },
        { id: 12, tab: "T3", title: "Playground", url: "http://localhost:8080/e2e-playground.html", active: true, current: true, owner: "claude-code #4412" },
        { id: 13, tab: "T4", title: "Export", url: "http://localhost:8080/export", active: false, owner: "export-grades.ts" },
      ],
    }));
    const res = await tools(f.bridge).run("browser_list_tabs");
    expect(textOf(res)).toBe(
      [
        "T1  Inbox — https://mail.test/",
        "T3* [claude-code #4412] Playground — http://localhost:8080/e2e-playground.html",
        "T4  [export-grades.ts] Export — http://localhost:8080/export",
      ].join("\n"),
    );
    expect(f.calls).toEqual([["listTabs", undefined]]); // free: no claim
  });

  it("browser_select_tab sends tabs.claim {tab} — never selectTab or focusTab — and moves the cursor", async () => {
    const f = fakeBridge(async (m, p) => (m === "tabs.claim" ? { tab: p?.tab } : { ok: true }));
    const t = tools(f.bridge);
    const res = await t.run("browser_select_tab", { tab: "T5" });
    expect(textOf(res)).toBe("Selected tab T5 (now this session's tab; not brought on screen — browser_focus_tab shows it)");
    await t.run("browser_click", { ref: "e1" });
    expect(f.calls).toEqual([
      ["tabs.claim", { tab: "T5" }],
      ["click", { ref: "e1", trusted: false, tab: "T5" }],
    ]);
    expect(f.calls.some(([m]) => m === "selectTab" || m === "focusTab")).toBe(false);
  });

  it("browser_select_tab of a tab held by another actor fails with the owner's name and keeps the cursor", async () => {
    const f = fakeBridge(async (m) => {
      if (m === "tabs.claim") throw heldError;
      return { ok: true };
    });
    const t = tools(f.bridge);
    await t.run("browser_click", { ref: "e1" }); // cursor T1
    await expect(t.run("browser_select_tab", { tab: "T7" })).rejects.toThrow('held by "claude-code #4412"');
    await t.run("browser_click", { ref: "e2" });
    expect(f.work().filter(([m]) => m === "click").map(([, p]) => p?.tab)).toEqual(["T1", "T1"]);
  });

  it("browser_select_tab and browser_close_tab without `tab` return a tool error and call nothing", async () => {
    const f = fakeBridge();
    const t = tools(f.bridge);
    const sel = await t.run("browser_select_tab", {});
    expect(sel.isError).toBe(true);
    expect(textOf(sel)).toBe("browser_select_tab needs tab: a handle from browser_list_tabs");
    const close = await t.run("browser_close_tab", {});
    expect(close.isError).toBe(true);
    expect(textOf(close)).toBe("browser_close_tab needs tab: a handle from browser_list_tabs");
    expect(f.calls).toEqual([]);
  });

  it("browser_close_tab sends closeTab {tab} and leaves the cursor alone", async () => {
    const f = fakeBridge();
    const t = tools(f.bridge);
    await t.run("browser_click", { ref: "e1" }); // cursor T1
    expect(textOf(await t.run("browser_close_tab", { tab: "T1" }))).toBe("Closed tab T1");
    await t.run("browser_click", { ref: "e2" });
    expect(f.work()).toEqual([
      ["click", { ref: "e1", trusted: false, tab: "T1" }],
      ["closeTab", { tab: "T1" }],
      ["click", { ref: "e2", trusted: false, tab: "T1" }],
    ]);
    expect(f.claims()).toBe(1);
  });

  it("browser_focus_tab sends focusTab on the cursor (claimed on first touch) or on `tab`", async () => {
    const f = fakeBridge();
    const t = tools(f.bridge);
    expect(textOf(await t.run("browser_focus_tab", {}))).toBe("Focused tab T1");
    expect(textOf(await t.run("browser_focus_tab", { tab: "T8" }))).toBe("Focused tab T8");
    await t.run("browser_click", { ref: "e1" });
    expect(f.calls).toEqual([
      ["tabs.claim", { active: true }],
      ["focusTab", { tab: "T1" }],
      ["focusTab", { tab: "T8" }],
      ["click", { ref: "e1", trusted: false, tab: "T1" }], // focusing T8 did not move the cursor
    ]);
  });

  it("browser_new_tab sends newTab {url, active:true} and the new tab becomes this session's tab", async () => {
    const f = fakeBridge(async (m) => (m === "newTab" ? { id: 412, tab: "T5" } : { ok: true }));
    const t = tools(f.bridge);
    const res = await t.run("browser_new_tab", { url: "http://localhost:8080/e2e-playground.html" });
    expect(textOf(res)).toBe("Opened tab T5");
    await t.run("browser_click", { ref: "e1" });
    expect(f.calls).toEqual([
      ["newTab", { url: "http://localhost:8080/e2e-playground.html", active: true }],
      ["click", { ref: "e1", trusted: false, tab: "T5" }],
    ]);
  });

  it("browser_new_tab without a url still passes active:true", async () => {
    const f = fakeBridge(async () => ({ id: 412, tab: "T5" }));
    await tools(f.bridge).run("browser_new_tab", {});
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0][0]).toBe("newTab");
    expect(f.calls[0][1]).toMatchObject({ active: true });
  });
});

describe("wait tool", () => {
  it("browser_wait_for forwards text to waitFor", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_wait_for", { text: "Welcome" });
    expect(f.work()).toEqual([["waitFor", { text: "Welcome", tab: "T1" }]]);
  });

  it("browser_wait_for forwards seconds unchanged", async () => {
    const f = fakeBridge();
    const res = await tools(f.bridge).run("browser_wait_for", { seconds: 2 });
    expect(f.work()).toEqual([["waitFor", { seconds: 2, tab: "T1" }]]);
    expect(textOf(res)).toBe("Waited 2s");
  });

  it("browser_wait_for forwards networkIdle + idleMs", async () => {
    const f = fakeBridge(async () => ({ ok: true, idleAfterMs: 812 }));
    const res = await tools(f.bridge).run("browser_wait_for", { networkIdle: true, idleMs: 800 });
    expect(f.work()).toEqual([["waitFor", { networkIdle: true, idleMs: 800, tab: "T1" }]]);
    expect(textOf(res)).toBe("Network idle for 800ms");
  });

  it("browser_wait_for networkIdle reports the default idleMs", async () => {
    const res = await tools(fakeBridge().bridge).run("browser_wait_for", { networkIdle: true });
    expect(textOf(res)).toBe("Network idle for 500ms");
  });

  it("browser_wait_for accepts the networkIdle schema and rejects a bad idleMs", () => {
    const shape = tools(fakeBridge().bridge).registered["browser_wait_for"].inputSchema!.shape;
    expect(shape.networkIdle.safeParse(true).success).toBe(true);
    expect(shape.idleMs.safeParse(800).success).toBe(true);
    expect(shape.idleMs.safeParse(50).success).toBe(false);
    expect(shape.idleMs.safeParse(20000).success).toBe(false);
    expect(shape.idleMs.safeParse(undefined).success).toBe(true);
  });
});

describe("browser_status", () => {
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
    const res = await tools(bridge).run("browser_status");
    expect(textOf(res)).toBe(
      "Daemon: not connected\nProblem: a pre-Step-6 bridge server holds port 9234 — end the old session",
    );
    expect(bridge.call).not.toHaveBeenCalled();
    expect(bridge.status).not.toHaveBeenCalled();
  });

  it("reports the daemon, its clients by name, and the extension not connected", async () => {
    const f = fakeBridge(async () => ({ tabs: [] }), async () => daemonStatus(false));
    const res = await tools(f.bridge).run("browser_status");
    expect(textOf(res)).toBe(
      [
        "Daemon: connected on 127.0.0.1:9234 (build abc123def456, up 42s)",
        "Clients (2): claude-code #4242, export-grades.ts",
        "Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?",
      ].join("\n"),
    );
    expect(f.bridge.call).not.toHaveBeenCalled();
  });

  it("includes the client names and the human's tab (`current`) by handle when connected", async () => {
    const f = fakeBridge(
      async (m) => {
        expect(m).toBe("listTabs");
        return {
          tabs: [
            // active in its own window, but not the human's tab: must not be named (#43)
            { id: 1, tab: "T1", title: "Other", url: "https://other.test/", active: true },
            { id: 7, tab: "T3", title: "Playground", url: "http://localhost:8080/e2e-playground.html", active: true, current: true },
          ],
        };
      },
      async () => daemonStatus(true),
    );
    const out = textOf(await tools(f.bridge).run("browser_status"));
    expect(out).toMatch(/Clients \(2\): claude-code #4242, export-grades\.ts/);
    expect(out).toMatch(/extension: connected/i);
    expect(out.split("\n").at(-1)).toBe("Active tab: [T3] Playground — http://localhost:8080/e2e-playground.html");
    expect(f.claims()).toBe(0); // status claims nothing
  });
});

describe("browser_evaluate", () => {
  function evalTool(handler: Handler) {
    const f = fakeBridge(handler);
    const calls: Array<[string, unknown, unknown]> = [];
    f.bridge.call.mockImplementation(async (m: string, p?: Params, o?: { timeoutMs?: number }) => {
      if (m === "tabs.claim") return { tab: "T1" };
      calls.push([m, p, o]);
      return handler(m, p, o);
    });
    return { run: (args: Params) => tools(f.bridge).run("browser_evaluate", args), calls };
  }

  it("sends the default timeout and returns the description as text", async () => {
    const t = evalTool(async () => ({ kind: "json", value: 2, description: "2", truncated: false }));
    const res = await t.run({ expression: "1+1" });
    expect(t.calls).toEqual([["evaluate", { expression: "1+1", timeoutMs: 10_000, tab: "T1" }, { timeoutMs: 15_000 }]]);
    expect(textOf(res)).toBe("2");
  });

  it("gives the server 5s more than the page timeout", async () => {
    const t = evalTool(async () => ({ kind: "undefined", description: "undefined", truncated: false }));
    await t.run({ expression: "x", timeoutMs: 30_000 });
    expect(t.calls).toEqual([["evaluate", { expression: "x", timeoutMs: 30_000, tab: "T1" }, { timeoutMs: 35_000 }]]);
  });

  it("appends a hint when the output was truncated", async () => {
    const t = evalTool(async () => ({ kind: "json", value: [1], description: "[1]", truncated: true }));
    const out = textOf(await t.run({ expression: "big" }));
    expect(out.startsWith("[1]")).toBe(true);
    expect(out.endsWith("(output truncated — narrow the expression, e.g. pick fields or slice the array)")).toBe(true);
  });

  it("appends a hint for a DOM node result", async () => {
    const t = evalTool(async () => ({ kind: "node", description: "<body>", truncated: false }));
    const out = textOf(await t.run({ expression: "document.body" }));
    expect(out.startsWith("<body>")).toBe(true);
    expect(out.endsWith("(DOM node — use browser_snapshot refs to act on it)")).toBe(true);
  });

  it("propagates a bridge error as a thrown error", async () => {
    const t = evalTool(async () => {
      throw new Error("Error: boom\n    at <anonymous>:1:5");
    });
    await expect(t.run({ expression: "throw new Error('boom')" })).rejects.toThrow(/Error: boom/);
  });
});

describe("network tools", () => {
  const T0 = 1_700_000_000_000;
  const entry = (over: Params = {}) => ({
    id: "1042",
    tabId: 412,
    url: "http://localhost:8080/e2e-playground.html",
    method: "GET",
    type: "main_frame",
    startedAt: T0,
    endedAt: T0 + 4,
    durationMs: 4,
    status: 200,
    responseSize: 13_106,
    ...over,
  });

  it("browser_network_requests with no tab queries this session's tab and keeps the 'active tab' label (NET-1)", async () => {
    vi.useFakeTimers({ now: T0 + 1500 });
    try {
      const f = fakeBridge(async () => ({ entries: [entry({ tab: "T1" })], total: 1, pending: 0, recordingSince: T0 - 3_595_000 }));
      const res = await tools(f.bridge).run("browser_network_requests", {});
      expect(f.calls).toEqual([
        ["tabs.claim", { active: true }],
        ["networkRequests", { tab: "T1" }],
      ]);
      expect(textOf(res).split("\n")).toEqual([
        "Network — active tab: showing 1 of 1 (recording since 59m56s ago; 0 pending)",
        "[1042]  1.5s ago   GET     200  document    4ms  12.8 KB  http://localhost:8080/e2e-playground.html",
        "Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('browser_network_requests maps tab:"active" to the cursor like an omitted tab', async () => {
    const f = fakeBridge(async () => ({ entries: [], total: 0, pending: 0, recordingSince: Date.now() }));
    const res = await tools(f.bridge).run("browser_network_requests", { tab: "active", limit: 5 });
    expect(f.work()).toEqual([["networkRequests", { tab: "T1", limit: 5 }]]);
    expect(textOf(res)).toMatch(/^No requests recorded for active tab /);
  });

  it('browser_network_requests passes "all" and a handle through, labelled as asked, the all-scope column by handle', async () => {
    const f = fakeBridge(async (_m, p) =>
      p?.tab === "all"
        ? { entries: [entry({ tab: "T3" }), entry({ id: "7", tabId: -1 })], total: 2, pending: 0, recordingSince: Date.now() }
        : { entries: [entry({ tab: "T3" })], total: 1, pending: 0, recordingSince: Date.now() },
    );
    const t = tools(f.bridge);
    const all = textOf(await t.run("browser_network_requests", { tab: "all", filter: "/api/", types: ["xhr"], failedOnly: true, limit: 10, includeHeaders: true }));
    const one = textOf(await t.run("browser_network_requests", { tab: "T3" }));
    expect(f.calls).toEqual([
      ["networkRequests", { tab: "all", filter: "/api/", types: ["xhr"], failedOnly: true, limit: 10, includeHeaders: true }],
      ["networkRequests", { tab: "T3" }],
    ]);
    expect(all.split("\n")[0]).toMatch(/^Network — all tabs: showing 2 of 2 /);
    expect(all).toContain("tab:T3 ");
    expect(all).toContain("tab:-1");
    expect(all).not.toContain("tab:412");
    expect(one.split("\n")[0]).toMatch(/^Network — tab T3: showing 1 of 1 /);
  });

  it("browser_network_requests passes an id lookup through without claiming, rendered with formatEntry", async () => {
    const f = fakeBridge(async () => ({ entries: [entry({ id: "1043", type: "xmlhttprequest" })], total: 1, pending: 0, recordingSince: 1 }));
    const res = await tools(f.bridge).run("browser_network_requests", { id: "1043" });
    expect(f.calls).toEqual([["networkRequests", { id: "1043" }]]);
    expect(textOf(res).split("\n")[0]).toBe("[1043] GET http://localhost:8080/e2e-playground.html");
  });

  it("browser_network_requests propagates a bridge error", async () => {
    const f = fakeBridge(async () => {
      throw new Error("Invalid regex filter: /(/ — Unterminated group");
    });
    await expect(tools(f.bridge).run("browser_network_requests", { filter: "/(/" })).rejects.toThrow(/Invalid regex filter/);
  });

  it("browser_network_clear clears this session's tab and reports the count", async () => {
    const f = fakeBridge(async () => ({ cleared: 7 }));
    const res = await tools(f.bridge).run("browser_network_clear", {});
    expect(f.calls).toEqual([
      ["tabs.claim", { active: true }],
      ["networkClear", { tab: "T1" }],
    ]);
    expect(textOf(res)).toBe("Cleared 7 requests.");
  });

  it('browser_network_clear passes "all" and a handle through, and maps "active" to the cursor', async () => {
    const f = fakeBridge(async () => ({ cleared: 0 }));
    const t = tools(f.bridge);
    await t.run("browser_network_clear", { tab: "all" });
    await t.run("browser_network_clear", { tab: "T4" });
    await t.run("browser_network_clear", { tab: "active" });
    expect(f.calls).toEqual([
      ["networkClear", { tab: "all" }],
      ["networkClear", { tab: "T4" }],
      ["tabs.claim", { active: true }],
      ["networkClear", { tab: "T1" }],
    ]);
  });

  it("browser_network_clear's TAB_HELD for the all scope names the owner", async () => {
    const f = fakeBridge(async () => {
      throw heldError;
    });
    await expect(tools(f.bridge).run("browser_network_clear", { tab: "all" })).rejects.toThrow("claude-code #4412");
  });
});

describe("no daemon (connect() failing)", () => {
  const REASON = "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 9234)";

  /** Minimal valid arguments for every tool except browser_status. */
  const ARGS: Record<string, Params> = {
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
    browser_select_tab: { tab: "T1" },
    browser_focus_tab: {},
    browser_new_tab: {},
    browser_close_tab: { tab: "T1" },
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

  it("registers all 22 tools and a tool call carries the stored reason", async () => {
    const { link, connect } = await linkWithFailingConnect();
    const t = tools(link);
    expect(Object.keys(t.registered)).toHaveLength(22);
    expect(connect).toHaveBeenCalledTimes(1);
    await expect(t.run("browser_snapshot")).rejects.toThrow(REASON);
    expect(textOf(await t.run("browser_status"))).toBe(`Daemon: not connected\nProblem: ${REASON}`);
  });

  it("every tool except browser_status surfaces the stored reason", async () => {
    const { link } = await linkWithFailingConnect();
    const t = tools(link);
    const names = Object.keys(t.registered).filter((n) => n !== "browser_status");
    expect(names.sort()).toEqual(Object.keys(ARGS).sort());
    for (const name of names) {
      const err = await Promise.resolve(t.run(name, ARGS[name])).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err, name).toBeInstanceOf(BridgeError);
      expect((err as BridgeError).message, name).toBe(REASON);
    }
  });
});

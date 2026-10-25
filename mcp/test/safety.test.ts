// Step 9 S3 — the MCP's half of the safety state (phase doc 0.3, 0.5, 0.6; decisions.md · 2026-10-24 #132
// the `Safety:` line, #133 `DISARMED {scope}`, #134 hidden rows; exit checks S3.2 and S3.3 (#141, #147)).
import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import { registerTools, type RegisterToolsOptions, type ToolBridge } from "../src/tools/registry.js";

type Params = Record<string, unknown>;
type Handler = (method: string, params?: Params, options?: { timeoutMs?: number }) => Promise<unknown>;
type Content = { type: string; text?: string; data?: string };
type Result = { content: Content[]; isError?: boolean };
type ToolHandler = (args: Params, extra: Params) => Promise<Result>;

const ME = "claude-code #4242";
const PLAY = "http://localhost:8080/e2e-playground.html";

function fakeBridge(handler: Handler = async () => ({ ok: true }), status: () => Promise<unknown> = async () => ({})) {
  const calls: Array<[string, Params | undefined]> = [];
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params, options?: { timeoutMs?: number }) => {
      calls.push([method, params]);
      if (method === "tabs.claim" && params?.active === true) return { tab: "T1" };
      return handler(method, params, options);
    }),
    status: vi.fn(status),
  } satisfies ToolBridge;
  return { bridge, calls };
}

function tools(bridge: ToolBridge, options?: RegisterToolsOptions) {
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(server, bridge, undefined, { actorName: ME, ...options });
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: ToolHandler }> })._registeredTools;
  return { registered, run: (name: string, args: Params = {}) => registered[name].handler(args, {}) };
}

const textOf = (res: Result) => res.content[0]!.text as string;

const statusWith = (safety: unknown) => async () => ({
  build: "b",
  uptime: 1000,
  extensionConnected: true,
  clients: [{ id: "c1", name: ME, since: 1 }],
  port: 9234,
  ...(safety === undefined ? {} : { safety }),
});

const plainRows = { tabs: [{ id: 101, tab: "T1", title: "Play", url: PLAY, active: true, current: true }] };

// ── S3.2: the Safety line ────────────────────────────────────────────────────────────────────────

describe("S3.2 — browser_status's Safety line", () => {
  async function safetyItem(safety: unknown): Promise<Result> {
    const f = fakeBridge(async (m) => (m === "listTabs" ? plainRows : { ok: true }), statusWith(safety));
    return tools(f.bridge).run("browser_status");
  }

  const cases: Array<[unknown, string]> = [
    [{ armed: true, evaluate: true, blockedCount: 0 }, "Safety: armed · JavaScript on · 0 blocked sites"],
    [{ armed: true, evaluate: false, blockedCount: 1 }, "Safety: armed · JavaScript off · 1 blocked site"],
    [{ armed: false, evaluate: true, blockedCount: 2 }, "Safety: DISARMED by the user · JavaScript on · 2 blocked sites"],
    [{ armed: false, evaluate: false, blockedCount: 1 }, "Safety: DISARMED by the user · JavaScript off · 1 blocked site"],
    [null, "Safety: not reported (reload the extension)"],
    [undefined, "Safety: not reported (reload the extension)"], // a daemon older than Step 9
    [{ armed: "yes" }, "Safety: not reported (reload the extension)"],
  ];
  for (const [safety, line] of cases) {
    it(`${JSON.stringify(safety) ?? "no field"} → ${line}`, async () => {
      const res = await safetyItem(safety);
      expect(res.content).toHaveLength(2);
      expect(res.content[1]).toEqual({ type: "text", text: line });
      // The first item is today's text, line for line.
      expect(textOf(res).split("\n")).toEqual([
        "Daemon: connected on 127.0.0.1:9234 (build b, up 1s)",
        `Clients (1): ${ME}`,
        "Extension: connected",
        `Active tab: [T1] Play — ${PLAY}`,
        "Cursor: none yet — the first tab tool claims the human's active tab",
      ]);
    });
  }

  it("with the extension not connected, no Safety line (today's three lines)", async () => {
    const f = fakeBridge(async () => ({}), async () => ({ ...(await statusWith(null)()), extensionConnected: false }));
    const res = await tools(f.bridge).run("browser_status");
    expect(res.content).toHaveLength(1);
  });
});

// ── hidden rows (#134, F13) ──────────────────────────────────────────────────────────────────────

describe("hidden rows render as (hidden: …), never undefined", () => {
  const rows = {
    tabs: [
      { id: 101, tab: "T1", active: true, current: true, hidden: "disarmed" },
      { id: 102, tab: "T2", active: false, hidden: "blocked", owner: "export.ts" },
      { id: 103, tab: "T3", title: "Play", url: PLAY, active: false },
    ],
  };

  it("browser_list_tabs", async () => {
    const f = fakeBridge(async (m) => (m === "listTabs" ? rows : { ok: true }));
    const out = textOf(await tools(f.bridge).run("browser_list_tabs"));
    expect(out).toBe(
      ["T1* (hidden: the bridge is off)", "T2  [export.ts] (hidden: blocked site)", `T3  Play — ${PLAY}`].join("\n"),
    );
    expect(out).not.toContain("undefined");
  });

  it("browser_status: Active tab, Cursor and Human's active tab lines", async () => {
    const f = fakeBridge(async (m) => (m === "listTabs" ? rows : { ok: true }), statusWith({ armed: false, evaluate: true, blockedCount: 1 }));
    const t = tools(f.bridge);
    expect(textOf(await t.run("browser_status")).split("\n").slice(3)).toEqual([
      "Active tab: [T1] (hidden: the bridge is off)",
      "Cursor: none yet — the first tab tool claims the human's active tab",
    ]);
    await t.run("browser_select_tab", { tab: "T2" });
    const lines = textOf(await t.run("browser_status")).split("\n");
    expect(lines.slice(3)).toEqual([
      "Active tab: [T1] (hidden: the bridge is off)",
      "Cursor: T2 (hidden: blocked site) (held by export.ts)",
      "Human's active tab: T1 (hidden: the bridge is off) — not mine; call browser_use_active_tab to work there",
    ]);
    for (const l of lines) expect(l).not.toContain("undefined");
  });

  it("browser_status: the human's tab hidden and held by another actor", async () => {
    const held = { tabs: [{ ...rows.tabs[0], owner: "claude-code #9" }, rows.tabs[2]] };
    const f = fakeBridge(async (m) => (m === "listTabs" ? held : { ok: true }), statusWith(null));
    const t = tools(f.bridge);
    await t.run("browser_select_tab", { tab: "T3" });
    const lines = textOf(await t.run("browser_status")).split("\n");
    expect(lines.at(-1)).toBe("Human's active tab: T1 (hidden: the bridge is off) — held by claude-code #9, not mine");
  });
});

// ── S3.2: the one plain line for the two codes ───────────────────────────────────────────────────

describe("S3.2 — DISARMED and DOMAIN_BLOCKED become one plain error line, never a failure report", () => {
  const ALL = "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it back on; do not retry.";
  const JS =
    "DISARMED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.";
  const BLOCKED =
    "DOMAIN_BLOCKED: the user has blocked this site for the bridge in Chrome. Stop and ask the user; do not retry, and do not try to reach the site another way.";

  function refusing(code: string, data?: unknown) {
    const attach = vi.fn(async () => {});
    const f = fakeBridge(async (m) => {
      if (m === "listTabs") return plainRows;
      if (m === "tabs.claim") return { tab: "T1" };
      throw new BridgeError(code, `refused by the extension (${code})`, data);
    });
    return { f, t: tools(f.bridge, { attach }), attach };
  }

  const toolCalls: Array<[string, Params]> = [
    ["browser_navigate", { url: "https://example.com/" }],
    ["browser_snapshot", {}],
    ["browser_screenshot", {}],
    ["browser_click", { ref: "e1" }],
    ["browser_click", { ref: "e1", tab: "T5" }],
    ["browser_type", { ref: "e1", text: "x" }],
    ["browser_press_key", { key: "Enter" }],
    ["browser_wait_for", { text: "x" }],
    ["browser_focus_tab", {}],
    ["browser_new_tab", { url: "https://example.com/" }],
    ["browser_close_tab", { tab: "T2" }],
    ["browser_network_requests", {}],
    ["browser_network_requests", { id: "7" }],
    ["browser_network_clear", { tab: "all" }],
    ["browser_download", { url: "https://example.com/f", path: "C:\\tmp\\f" }],
  ];

  for (const [name, args] of toolCalls) {
    it(`${name} ${JSON.stringify(args)}: DISARMED {scope:"all"} → the one line, isError, no attach`, async () => {
      const { t, attach } = refusing("DISARMED", { scope: "all" });
      const res = await t.run(name, args);
      expect(res).toEqual({ isError: true, content: [{ type: "text", text: ALL }] });
      expect(attach).not.toHaveBeenCalled();
    });
  }

  it("browser_evaluate refused DISARMED {scope:'evaluate'} → the JavaScript line, which differs from 'all'", async () => {
    const { t } = refusing("DISARMED", { scope: "evaluate" });
    const res = await t.run("browser_evaluate", { expression: "1" });
    expect(res).toEqual({ isError: true, content: [{ type: "text", text: JS }] });
    expect(JS).not.toBe(ALL);
  });

  it("DISARMED with no valid scope reads as 'all'", async () => {
    const { t } = refusing("DISARMED");
    expect(textOf(await t.run("browser_snapshot"))).toBe(ALL);
  });

  it("DOMAIN_BLOCKED → its line, isError, no attach, no image", async () => {
    const { t, attach } = refusing("DOMAIN_BLOCKED");
    const res = await t.run("browser_click", { ref: "e1", tab: "T4" });
    expect(res).toEqual({ isError: true, content: [{ type: "text", text: BLOCKED }] });
    expect(attach).not.toHaveBeenCalled();
  });

  it("any other error still reaches the MCP server as a throw (unchanged)", async () => {
    const { t } = refusing("TAB_HELD", { owner: "x", since: 0 });
    await expect(t.run("browser_click", { ref: "e1" })).rejects.toMatchObject({ code: "TAB_HELD" });
    const bad = refusing(ErrorCodes.INTERNAL);
    await expect(bad.t.run("browser_new_tab", {})).rejects.toMatchObject({ code: "INTERNAL" });
  });
});

// ── S3.3 (MCP half): the tool list is Step 8's ──────────────────────────────────────────────────

describe("S3.3 — no tool added, removed or renamed", () => {
  const STEP8_TOOLS = [
    "browser_status",
    "browser_use_active_tab",
    "browser_navigate",
    "browser_snapshot",
    "browser_screenshot",
    "browser_click",
    "browser_type",
    "browser_press_key",
    "browser_scroll",
    "browser_hover",
    "browser_select_option",
    "browser_back",
    "browser_forward",
    "browser_list_tabs",
    "browser_select_tab",
    "browser_focus_tab",
    "browser_new_tab",
    "browser_close_tab",
    "browser_wait_for",
    "browser_evaluate",
    "browser_download",
    "browser_network_requests",
    "browser_network_clear",
  ];

  // Amended 2026-10-25 (Step 11 S4; decisions.md #241, phase doc 0.9): the list gains exactly one tool,
  // `browser_upload_file`, registered right after `browser_select_option`; Step 8's 23 keep their order.
  it("the 23 tool names, in registration order, are Step 8's; Step 11 adds browser_upload_file after browser_select_option", () => {
    const names = Object.keys(tools(fakeBridge().bridge).registered);
    expect(names.filter((n) => n !== "browser_upload_file")).toEqual(STEP8_TOOLS);
    expect(names).toHaveLength(24);
    expect(names.indexOf("browser_upload_file")).toBe(names.indexOf("browser_select_option") + 1);
  });

  it("no tool name speaks of arming, disarming, the safety state or blocking", () => {
    for (const name of Object.keys(tools(fakeBridge().bridge).registered)) {
      expect(name).not.toMatch(/arm|disarm|setSafety|safety|block/i);
    }
  });
});

// ── Step 10 S4b.3 (phase doc 0.12 with Stage 0 F17; decisions.md #202 changed #133): JS_DISABLED ──────

describe("S4b.3 — JS_DISABLED becomes one plain error line, never a failure report", () => {
  const JS_DISABLED_LINE =
    "JS_DISABLED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.";
  const OLD_JS =
    "DISARMED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.";

  function refusing(code: string, data?: unknown) {
    const attach = vi.fn(async () => {});
    const f = fakeBridge(async (m) => {
      if (m === "listTabs") return plainRows;
      if (m === "tabs.claim") return { tab: "T1" };
      throw new BridgeError(code, `refused by the extension (${code})`, data);
    });
    return { f, t: tools(f.bridge, { attach }), attach };
  }

  const saveDir = mkdtempSync(path.join(os.tmpdir(), "bridge-s4b-"));
  const cases: Array<[string, Params]> = [
    ["browser_evaluate", { expression: "1" }],
    ["browser_evaluate", { expression: "1", tab: "T5" }],
    ["browser_evaluate", { expression: "document.body", asRef: true, tab: "T5" }],
    ["browser_evaluate", { expression: "1", saveTo: path.join(saveDir, "v.txt"), tab: "T5" }],
    ["browser_navigate", { url: "javascript:void 0", tab: "T5" }],
    ["browser_new_tab", { url: "data:text/html,x" }],
  ];

  for (const [name, args] of cases) {
    it(`${name} ${JSON.stringify(Object.keys(args))}: JS_DISABLED → the one line, isError, no attach, no image`, async () => {
      const { t, attach } = refusing(ErrorCodes.JS_DISABLED);
      const res = await t.run(name, args);
      expect(res).toEqual({ isError: true, content: [{ type: "text", text: JS_DISABLED_LINE }] });
      expect(attach).not.toHaveBeenCalled();
    });
  }

  it("the saveTo leg writes nothing (no file, no .part) when JS_DISABLED refuses the start", async () => {
    const { t } = refusing(ErrorCodes.JS_DISABLED);
    const dir = mkdtempSync(path.join(os.tmpdir(), "bridge-s4b-"));
    await t.run("browser_evaluate", { expression: "1", saveTo: path.join(dir, "v.txt") });
    expect(readdirSync(dir)).toEqual([]);
  });

  it("F17: an old extension's DISARMED {scope:'evaluate'} still reads as the JavaScript-off line", async () => {
    const { t, attach } = refusing("DISARMED", { scope: "evaluate" });
    const res = await t.run("browser_evaluate", { expression: "1", tab: "T5" });
    expect(res).toEqual({ isError: true, content: [{ type: "text", text: OLD_JS }] });
    expect(OLD_JS.slice("DISARMED: ".length)).toBe(JS_DISABLED_LINE.slice("JS_DISABLED: ".length));
    expect(attach).not.toHaveBeenCalled();
  });
});

// ── Step 11 S2 (phase doc 0.5; spec §10's Step 11 note; decisions.md #237): UPLOAD_REFUSED ─────────────────
// The tool browser_upload_file comes in S4; S2 lays only the rendering: withSafetyRefusals turns the code, from any
// tool, into the SDK's one plain line, never a failure report.

describe("S2.3 — UPLOAD_REFUSED becomes one plain error line, never a failure report", () => {
  // 2026-10-25: wording changed by ruling #263 (was: "UPLOAD_REFUSED: that file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders), so the bridge will not upload it. Stop and ask the user; do not retry with another path.").
  const UPLOAD_LINE =
    "UPLOAD_REFUSED: the bridge will not upload that file — either it is not in a folder the user allows for uploads in Chrome (extension options → Upload folders), or the user has not turned on \"Allow access to file URLs\" for the extension (chrome://extensions → the extension's Details). Stop and ask the user; do not retry with another path.";

  for (const [name, args] of [
    ["browser_click", { ref: "e1", tab: "T5" }],
    ["browser_click", { ref: "e1" }],
    ["browser_snapshot", { tab: "T5" }],
  ] as Array<[string, Params]>) {
    it(`${name} ${JSON.stringify(Object.keys(args))}: UPLOAD_REFUSED → the one line, isError, no attach`, async () => {
      const attach = vi.fn(async () => {});
      const f = fakeBridge(async (m) => {
        if (m === "listTabs") return plainRows;
        if (m === "tabs.claim") return { tab: "T1" };
        throw new BridgeError(ErrorCodes.UPLOAD_REFUSED, "refused by the extension (sentinel-folder-Q2)");
      });
      const res = await tools(f.bridge, { attach }).run(name, args);
      expect(res).toEqual({ isError: true, content: [{ type: "text", text: UPLOAD_LINE }] });
      expect(textOf(res)).not.toContain("sentinel");
      expect(attach).not.toHaveBeenCalled();
    });
  }
});

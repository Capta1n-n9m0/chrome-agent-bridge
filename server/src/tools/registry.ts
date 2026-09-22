import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bridge } from "../bridge.js";
import type { EvalEnvelope, NetworkRequestsResult } from "@bridge/shared";

const DEFAULT_EVAL_TIMEOUT_MS = 10_000;
/** The extension races its own timer at `timeoutMs`; give the server a little more before it gives up. */
const SERVER_TIMEOUT_SLACK_MS = 5_000;
/** Mirrors the extension's default quiet period for `browser_wait_for { networkIdle: true }`. */
const DEFAULT_NETWORK_IDLE_MS = 500;

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

export function registerTools(server: McpServer, bridge: Bridge): void {
  server.tool(
    "browser_status",
    "Diagnose the bridge: is the WebSocket host listening, is the extension connected, and which tab is active. Call this first when other browser tools fail.",
    {},
    async () => {
      const { listening, port } = bridge.hostState;
      const lines = [
        listening
          ? `WebSocket host: listening on 127.0.0.1:${port}`
          : `WebSocket host: NOT listening${port !== null ? ` (port ${port})` : ""}`,
      ];
      const reason = bridge.unavailableReason();
      if (reason) lines.push(`Problem: ${reason}`);
      if (!bridge.isConnected()) {
        lines.push("Extension: not connected — is Chrome or Safari open with the Agent Bridge extension enabled and its token/port set?");
        return text(lines.join("\n"));
      }
      lines.push("Extension: connected");
      const { tabs } = (await bridge.call("listTabs")) as {
        tabs: Array<{ id: number; title: string; url: string; active: boolean }>;
      };
      const active = tabs.find((t) => t.active);
      lines.push(active ? `Active tab: [${active.id}] ${active.title} — ${active.url}` : "Active tab: none");
      return text(lines.join("\n"));
    },
  );

  server.tool(
    "browser_navigate",
    "Navigate the active browser tab to a URL.",
    { url: z.string().url().describe("Absolute URL to navigate to") },
    async ({ url }) => {
      await bridge.call("navigate", { url });
      return text(`Navigated active tab to ${url}`);
    },
  );

  server.tool("browser_snapshot", "Capture an accessibility snapshot of the active tab with element refs.", {}, async () => {
    const result = (await bridge.call("snapshot")) as { text: string };
    return text(result.text);
  });

  server.tool(
    "browser_screenshot",
    "Capture a screenshot of the active tab's viewport.",
    { fullPage: z.boolean().optional().describe("Capture the full scrollable page (Milestone 4)") },
    async ({ fullPage }) => {
      const result = (await bridge.call("screenshot", { fullPage: fullPage ?? false })) as { dataUrl: string };
      const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, "");
      return { content: [{ type: "image" as const, data: base64, mimeType: "image/png" }] };
    },
  );

  server.tool(
    "browser_click",
    "Click the element with the given ref. In Chrome, trusted=true forces real CDP input (and shows the debugging banner); Safari supports the default DOM-event path only.",
    { ref: z.string(), trusted: z.boolean().optional() },
    async ({ ref, trusted }) => {
      await bridge.call("click", { ref, trusted: trusted ?? false });
      return text(`Clicked ${ref}`);
    },
  );

  server.tool(
    "browser_type",
    "Type text into the element with the given ref. Optionally submit. In Chrome, trusted=true sends real CDP keystrokes for sites that ignore synthetic input; Safari supports the default DOM-event path only.",
    { ref: z.string(), text: z.string(), submit: z.boolean().optional(), trusted: z.boolean().optional() },
    async ({ ref, text: value, submit, trusted }) => {
      await bridge.call("type", { ref, text: value, submit: submit ?? false, trusted: trusted ?? false });
      return text(`Typed into ${ref}`);
    },
  );

  server.tool(
    "browser_press_key",
    "Press a key (e.g. Enter, Escape, Tab) on the focused element. In Chrome, trusted=true sends a real CDP keystroke; Safari supports the default DOM-event path only.",
    { key: z.string(), trusted: z.boolean().optional() },
    async ({ key, trusted }) => {
      await bridge.call("pressKey", { key, trusted: trusted ?? false });
      return text(`Pressed ${key}`);
    },
  );

  server.tool(
    "browser_scroll",
    "Scroll to a ref, or scroll the page up/down.",
    { ref: z.string().optional(), direction: z.enum(["up", "down"]).optional() },
    async ({ ref, direction }) => {
      await bridge.call("scroll", { ref, direction: direction ?? "down" });
      return text("Scrolled");
    },
  );

  server.tool("browser_hover", "Hover the element with the given ref.", { ref: z.string() }, async ({ ref }) => {
    await bridge.call("hover", { ref });
    return text(`Hovered ${ref}`);
  });

  server.tool(
    "browser_select_option",
    "Select option(s) in a <select> by value or visible label.",
    { ref: z.string(), values: z.array(z.string()).min(1) },
    async ({ ref, values }) => {
      await bridge.call("selectOption", { ref, values });
      return text(`Selected ${values.join(", ")} in ${ref}`);
    },
  );

  server.tool("browser_back", "Navigate the active tab back in history.", {}, async () => {
    await bridge.call("back");
    return text("Went back");
  });

  server.tool("browser_forward", "Navigate the active tab forward in history.", {}, async () => {
    await bridge.call("forward");
    return text("Went forward");
  });

  server.tool("browser_list_tabs", "List all open tabs.", {}, async () => {
    const { tabs } = (await bridge.call("listTabs")) as {
      tabs: Array<{ id: number; title: string; url: string; active: boolean }>;
    };
    const lines = tabs.map((t) => `[${t.id}]${t.active ? "*" : " "} ${t.title} — ${t.url}`);
    return text(lines.join("\n"));
  });

  server.tool("browser_select_tab", "Make a tab active by id (the new control target).", { id: z.number() }, async ({ id }) => {
    await bridge.call("selectTab", { id });
    return text(`Selected tab ${id}`);
  });

  server.tool("browser_new_tab", "Open a new tab and make it active.", { url: z.string().url().optional() }, async ({ url }) => {
    const { id } = (await bridge.call("newTab", { url })) as { id: number };
    return text(`Opened tab ${id}`);
  });

  server.tool("browser_close_tab", "Close a tab by id.", { id: z.number() }, async ({ id }) => {
    await bridge.call("closeTab", { id });
    return text(`Closed tab ${id}`);
  });

  server.tool(
    "browser_wait_for",
    "Wait until text appears on the active tab, wait a number of seconds, or `networkIdle:true` to wait until the tab has made no network request for `idleMs` (default 500). Network idle is activity-based, so a long-poll or EventSource left hanging will not block it; a tab that has recorded no requests at all (nothing since capture started, e.g. right after the extension reloaded) counts as idle and returns immediately.",
    {
      text: z.string().optional().describe("Text to wait for in the page's visible text (up to 10s)."),
      seconds: z.number().optional().describe("Fixed wait, in seconds (max 60)."),
      networkIdle: z
        .boolean()
        .optional()
        .describe("Wait until the active tab has made no network request for `idleMs` (up to 10s)."),
      idleMs: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe("Quiet period that counts as idle, in ms. Default 500. Only used with networkIdle."),
    },
    async ({ text: waitText, seconds, networkIdle, idleMs }) => {
      await bridge.call("waitFor", { text: waitText, seconds, networkIdle, idleMs });
      if (networkIdle) return text(`Network idle for ${idleMs ?? DEFAULT_NETWORK_IDLE_MS}ms`);
      return text(waitText ? `Waited for text: ${waitText}` : `Waited ${seconds ?? 0}s`);
    },
  );

  server.tool(
    "browser_evaluate",
    "Run JavaScript in the active tab's page context and return the result. Results are JSON where possible; DOM nodes, functions and errors come back as short descriptions — use browser_snapshot refs to act on elements. Output is capped (~20k chars, 100 items per array, depth 6). Chrome uses CDP and shows its debugging banner; Safari uses MAIN-world script injection and may be limited by the page's Content Security Policy.",
    {
      expression: z
        .string()
        .min(1)
        .describe("JavaScript to evaluate in the page. The last expression's value is returned; top-level await and a bare `return` both work."),
      timeoutMs: z
        .number()
        .int()
        .min(100)
        .max(60000)
        .optional()
        .describe("Default 10000. Also bounds the server-side wait."),
    },
    async ({ expression, timeoutMs }) => {
      const pageTimeoutMs = timeoutMs ?? DEFAULT_EVAL_TIMEOUT_MS;
      const envelope = (await bridge.call(
        "evaluate",
        { expression, timeoutMs: pageTimeoutMs },
        { timeoutMs: pageTimeoutMs + SERVER_TIMEOUT_SLACK_MS },
      )) as EvalEnvelope;
      const lines = [envelope.description];
      if (envelope.kind === "node") lines.push("(DOM node — use browser_snapshot refs to act on it)");
      if (envelope.truncated) lines.push("(output truncated — narrow the expression, e.g. pick fields or slice the array)");
      return text(lines.join("\n"));
    },
  );

  const tabTarget = z
    .union([z.literal("active"), z.literal("all"), z.number().int()])
    .optional()
    .describe('Which tab: "active" (default), "all" for every tab, or a tab id from browser_list_tabs.');

  server.tool(
    "browser_network_requests",
    "List recent network requests made by the active tab — method, status, type, duration, size, URL — captured continuously with no debugger banner, like the DevTools Network panel with 'Preserve log'. Newest 50 by default, printed oldest first. `filter` matches the URL (substring or /regex/), `types` narrows by resource type (xhr, script, image, document, …), `failedOnly` keeps network errors and 4xx/5xx. Pass `id` for one request's headers and request-body summary. Response bodies are not available (use browser_evaluate to re-fetch if you need one). Call browser_network_clear before an action to see only what it caused.",
    {
      tab: tabTarget,
      filter: z.string().optional().describe("Match the URL: a case-insensitive substring, or /regex/flags when wrapped in slashes."),
      types: z.array(z.string()).optional().describe("Resource types to keep: xhr, fetch, document, frame, script, stylesheet, image, font, media, websocket, ping, other."),
      failedOnly: z.boolean().optional().describe("Keep only network errors and responses with status >= 400."),
      limit: z.number().int().min(1).max(500).optional().describe("How many of the newest matching requests to print. Default 50."),
      includeHeaders: z.boolean().optional().describe("Keep the (redacted) headers on the returned entries. The printed table never shows headers — use `id` to read one request's headers."),
      id: z.string().optional().describe("Show one request in full — headers and request-body summary — by its id from a previous listing."),
    },
    async (params) => {
      const { text: out } = (await bridge.call("networkRequests", params)) as NetworkRequestsResult;
      return text(out);
    },
  );

  server.tool(
    "browser_network_clear",
    'Forget the recorded network requests for the active tab (or `tab:"all"`). Use it right before an action so the next browser_network_requests shows only what that action caused.',
    { tab: tabTarget },
    async (params) => {
      const { cleared } = (await bridge.call("networkClear", params)) as { cleared: number };
      return text(`Cleared ${cleared} requests.`);
    },
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bridge } from "../bridge.js";

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

export function registerTools(server: McpServer, bridge: Bridge): void {
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
    "Click the element with the given ref. Set trusted=true to force real CDP input (shows the debugging banner).",
    { ref: z.string(), trusted: z.boolean().optional() },
    async ({ ref, trusted }) => {
      await bridge.call("click", { ref, trusted: trusted ?? false });
      return text(`Clicked ${ref}`);
    },
  );

  server.tool(
    "browser_type",
    "Type text into the element with the given ref. Optionally submit. Set trusted=true to send real CDP keystrokes (shows the debugging banner) for sites that ignore synthetic input; the trusted path selects the field's existing text and replaces it.",
    { ref: z.string(), text: z.string(), submit: z.boolean().optional(), trusted: z.boolean().optional() },
    async ({ ref, text: value, submit, trusted }) => {
      await bridge.call("type", { ref, text: value, submit: submit ?? false, trusted: trusted ?? false });
      return text(`Typed into ${ref}`);
    },
  );

  server.tool(
    "browser_press_key",
    "Press a key (e.g. Enter, Escape, Tab) on the focused element. Set trusted=true to send a real CDP keystroke (shows the debugging banner) for sites that ignore synthetic input.",
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
    "Wait until text appears on the active tab, or wait a number of seconds.",
    { text: z.string().optional(), seconds: z.number().optional() },
    async ({ text: waitText, seconds }) => {
      await bridge.call("waitFor", { text: waitText, seconds });
      return text(waitText ? `Waited for text: ${waitText}` : `Waited ${seconds ?? 0}s`);
    },
  );
}

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
}

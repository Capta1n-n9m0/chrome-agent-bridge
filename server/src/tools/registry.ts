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
}

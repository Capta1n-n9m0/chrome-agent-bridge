import { activeTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { fullPageScreenshot } from "../debugger.js";
import { browserApi, hasDebuggerApi } from "../browser-api.js";

export async function snapshot(): Promise<{ text: string; count: number }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  return callInPage(tab.id!, () => window.__agentBridge!.snapshot());
}

export async function screenshot(params: Record<string, unknown>): Promise<{ dataUrl: string }> {
  const tab = await activeTab();
  if (params.fullPage === true) {
    if (!hasDebuggerApi()) {
      throw new Error("Full-page screenshots are not available in Safari; call browser_screenshot without fullPage for the visible viewport.");
    }
    return { dataUrl: await fullPageScreenshot(tab.id!) };
  }
  const dataUrl = await browserApi.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  return { dataUrl };
}

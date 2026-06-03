import { activeTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";

export async function snapshot(): Promise<{ text: string; count: number }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  return callInPage(tab.id!, () => window.__agentBridge!.snapshot());
}

export async function screenshot(params: Record<string, unknown>): Promise<{ dataUrl: string }> {
  const tab = await activeTab();
  // Viewport capture — no debugger banner. fullPage is handled in Milestone 4.
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  void params;
  return { dataUrl };
}

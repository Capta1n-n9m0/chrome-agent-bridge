import { pageTab, targetTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { fullPageScreenshot } from "../debugger.js";

export async function snapshot(p: Record<string, unknown>): Promise<{ text: string; count: number }> {
  const tab = await pageTab(p, "snapshot");
  await ensureContent(tab.id!);
  return callInPage(tab.id!, () => window.__agentBridge!.snapshot());
}

export async function screenshot(params: Record<string, unknown>): Promise<{ dataUrl: string }> {
  if (params.fullPage === true) {
    const tab = await pageTab(params, "screenshot");
    return { dataUrl: await fullPageScreenshot(tab.id!) };
  }
  const tab = await targetTab(params, "screenshot");
  // `captureVisibleTab` captures whatever its window shows. Until T3's capture switch exists, an
  // explicit background tab is refused rather than silently answered with another tab's pixels.
  if (params.tabId !== undefined && !tab.active) {
    throw new Error(
      "a viewport screenshot of a background tab needs the Step 7 capture switch — pass fullPage:true for now",
    );
  }
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  return { dataUrl };
}

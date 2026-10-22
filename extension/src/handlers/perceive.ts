import type { SnapshotResult } from "@bridge/shared";
import { activateForCapture, cdpCaptureRefusal, pageTab, targetTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { fullPageScreenshot, viewportScreenshot } from "../debugger.js";

export async function snapshot(p: Record<string, unknown>): Promise<SnapshotResult> {
  const tab = await pageTab(p, "snapshot");
  await ensureContent(tab.id!);
  return callInPage(tab.id!, () => window.__agentBridge!.snapshot());
}

/**
 * `fullPage` → CDP beyond the viewport, as before (whatever `mode` says). `mode:"cdp"` → CDP of the
 * viewport: no tab switch, the debugger banner; only the active tab of a window that is not minimized
 * (`cdpCaptureRefusal`). Anything else is the `switch` mode (#50): the tab is
 * shown in its window just long enough for `captureVisibleTab`, then the previous tab comes back.
 */
export async function screenshot(params: Record<string, unknown>): Promise<{ dataUrl: string }> {
  // Truthy, exactly the daemon's rule (`takesLock` in daemon/src/methods.ts): the extension switches
  // tabs only in the cases the daemon takes the visibility lock for (T3 verifier V1).
  if (params.fullPage) {
    const tab = await pageTab(params, "screenshot");
    return { dataUrl: await fullPageScreenshot(tab.id!) };
  }
  if (params.mode === "cdp") {
    const tab = await pageTab(params, "screenshot");
    // Refused before the debugger attaches (no banner): CDP hangs on both (T5b fix 2; Run 8).
    const win = await chrome.windows.get(tab.windowId);
    const refusal = cdpCaptureRefusal(tab, win.state);
    if (refusal) throw refusal;
    return { dataUrl: await viewportScreenshot(tab.id!) };
  }
  const tab = await targetTab(params, "screenshot");
  return { dataUrl: await activateForCapture(tab) };
}

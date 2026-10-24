import { targetTab, waitForLoad } from "../tabs.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { HandlerSafety } from "../safety-call.js";

export async function navigate(params: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true; url: string }> {
  const url = String(params.url ?? "");
  if (!url) throw new BridgeError(ErrorCodes.BAD_PARAMS, "navigate requires a url");
  const tab = await targetTab(params, "navigate");
  await call?.effect(); // Step 9: before tabs.update, and before the load listener is armed (#137)
  const loaded = waitForLoad(tab.id!); // arm the listener BEFORE navigating
  loaded.catch(() => {}); // a failed update below must not leave this rejection unhandled
  try {
    await chrome.tabs.update(tab.id!, { url });
    await loaded;
  } catch (err) {
    // The text is Chrome's (or the load timeout's), unchanged; `data.error` repeats it.
    const message = err instanceof Error ? err.message : String(err);
    throw new BridgeError(ErrorCodes.NAV_FAILED, message, { error: message });
  }
  return { ok: true, url };
}

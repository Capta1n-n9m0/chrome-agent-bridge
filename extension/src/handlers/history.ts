import { targetTab } from "../tabs.js";
import type { HandlerSafety } from "../safety-call.js";

// Step 9: `call?.effect()` right before the navigation (#137).
export async function back(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  const tab = await targetTab(p, "back");
  await call?.effect();
  await chrome.tabs.goBack(tab.id!);
  return { ok: true };
}

export async function forward(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  const tab = await targetTab(p, "forward");
  await call?.effect();
  await chrome.tabs.goForward(tab.id!);
  return { ok: true };
}

import { targetTab } from "../tabs.js";

export async function back(p: Record<string, unknown>): Promise<{ ok: true }> {
  const tab = await targetTab(p, "back");
  await chrome.tabs.goBack(tab.id!);
  return { ok: true };
}

export async function forward(p: Record<string, unknown>): Promise<{ ok: true }> {
  const tab = await targetTab(p, "forward");
  await chrome.tabs.goForward(tab.id!);
  return { ok: true };
}

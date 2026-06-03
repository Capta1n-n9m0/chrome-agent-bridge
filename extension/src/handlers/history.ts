import { activeTab } from "../tabs.js";

export async function back(): Promise<{ ok: true }> {
  const tab = await activeTab();
  await chrome.tabs.goBack(tab.id!);
  return { ok: true };
}

export async function forward(): Promise<{ ok: true }> {
  const tab = await activeTab();
  await chrome.tabs.goForward(tab.id!);
  return { ok: true };
}

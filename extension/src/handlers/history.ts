import { activeTab } from "../tabs.js";
import { browserApi } from "../browser-api.js";

export async function back(): Promise<{ ok: true }> {
  const tab = await activeTab();
  await browserApi.tabs.goBack(tab.id!);
  return { ok: true };
}

export async function forward(): Promise<{ ok: true }> {
  const tab = await activeTab();
  await browserApi.tabs.goForward(tab.id!);
  return { ok: true };
}

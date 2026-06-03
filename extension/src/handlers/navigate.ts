import { activeTab, waitForLoad } from "../tabs.js";

export async function navigate(params: Record<string, unknown>): Promise<{ ok: true; url: string }> {
  const url = String(params.url ?? "");
  if (!url) throw new Error("navigate requires a url");
  const tab = await activeTab();
  const loaded = waitForLoad(tab.id!); // arm the listener BEFORE navigating
  await chrome.tabs.update(tab.id!, { url });
  await loaded;
  return { ok: true, url };
}

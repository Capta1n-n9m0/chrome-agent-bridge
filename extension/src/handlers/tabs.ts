import { waitForLoad } from "../tabs.js";

export async function listTabs(): Promise<{ tabs: Array<{ id: number; title: string; url: string; active: boolean }> }> {
  const tabs = await chrome.tabs.query({});
  return {
    tabs: tabs
      .filter((t) => t.id !== undefined)
      .map((t) => ({ id: t.id!, title: t.title ?? "", url: t.url ?? "", active: t.active ?? false })),
  };
}

export async function selectTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  const id = Number(p.id);
  const tab = await chrome.tabs.get(id);
  if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(id, { active: true });
  return { ok: true };
}

export async function newTab(p: Record<string, unknown>): Promise<{ id: number }> {
  const url = p.url ? String(p.url) : undefined;
  const tab = await chrome.tabs.create({ url, active: true });
  if (url) await waitForLoad(tab.id!);
  return { id: tab.id! };
}

export async function closeTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  await chrome.tabs.remove(Number(p.id));
  return { ok: true };
}

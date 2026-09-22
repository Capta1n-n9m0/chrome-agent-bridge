import { waitForLoad } from "../tabs.js";
import { browserApi } from "../browser-api.js";

export async function listTabs(): Promise<{ tabs: Array<{ id: number; title: string; url: string; active: boolean }> }> {
  const tabs = await browserApi.tabs.query({});
  return {
    tabs: tabs
      .filter((t) => t.id !== undefined)
      .map((t) => ({ id: t.id!, title: t.title ?? "", url: t.url ?? "", active: t.active ?? false })),
  };
}

export async function selectTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  const id = Number(p.id);
  const tab = await browserApi.tabs.get(id);
  if (tab.windowId >= 0) await browserApi.windows.update(tab.windowId, { focused: true });
  await browserApi.tabs.update(id, { active: true });
  return { ok: true };
}

export async function newTab(p: Record<string, unknown>): Promise<{ id: number }> {
  const url = p.url ? String(p.url) : undefined;
  const tab = await browserApi.tabs.create({ url, active: true });
  if (url) await waitForLoad(tab.id!);
  return { id: tab.id! };
}

export async function closeTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  await browserApi.tabs.remove(Number(p.id));
  return { ok: true };
}

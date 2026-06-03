import { activeTab } from "../tabs.js";
import { callInPage } from "../inject.js";

export async function waitFor(p: Record<string, unknown>): Promise<{ ok: true }> {
  if (typeof p.seconds === "number") {
    const secs = Math.min(Math.max(p.seconds, 0), 60);
    await new Promise((r) => setTimeout(r, secs * 1000));
    return { ok: true };
  }
  const needle = String(p.text ?? "");
  if (!needle) throw new Error("browser_wait_for requires either text or seconds");
  const tab = await activeTab();
  // Poll the page (in its own context) for the text, up to 10s. The func is async;
  // chrome.scripting.executeScript awaits its returned promise. It always resolves to a
  // defined object so callInPage's "no result" guard never trips.
  const res = await callInPage<{ found: boolean }>(
    tab.id!,
    async (text) => {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if ((document.body?.innerText ?? "").includes(text as string)) return { found: true };
        await new Promise((r) => setTimeout(r, 200));
      }
      return { found: false };
    },
    [needle],
  );
  if (!res.found) throw new Error(`Timed out waiting for text: "${needle}"`);
  return { ok: true };
}

import { activeTab } from "../tabs.js";
import { callInPage } from "../inject.js";
import { log, ready } from "../network-state.js";

/** Quiet period that counts as idle when the caller does not say. */
const DEFAULT_IDLE_MS = 500;
const MIN_IDLE_MS = 100;
const MAX_IDLE_MS = 10_000;
/** The same 10 s ceiling the text form uses. */
const WAIT_CEILING_MS = 10_000;
const POLL_MS = 100;

export async function waitFor(p: Record<string, unknown>): Promise<{ ok: true; idleAfterMs?: number }> {
  if (p.networkIdle === true) return waitForNetworkIdle(p);
  if (typeof p.seconds === "number") {
    const secs = Math.min(Math.max(p.seconds, 0), 60);
    await new Promise((r) => setTimeout(r, secs * 1000));
    return { ok: true };
  }
  const needle = String(p.text ?? "");
  if (!needle) throw new Error("browser_wait_for requires one of text, seconds or networkIdle");
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

/**
 * Activity-based idle: no `chrome.webRequest` event for the active tab in the last `idleMs`.
 * Deliberately *not* pending-based — a long poll or EventSource stays pending for its whole life
 * and would hang a Playwright-style `networkidle` forever (plan §0.6).
 *
 * A tab the log has seen no activity for at all reports `lastActivityAt === 0` and is therefore
 * idle at once. That is also what happens right after a service-worker restart, since
 * `lastActivity` is in-memory only and is not part of the serialised `storage.session` blob.
 */
async function waitForNetworkIdle(p: Record<string, unknown>): Promise<{ ok: true; idleAfterMs: number }> {
  await ready;
  const requested = Number(p.idleMs ?? DEFAULT_IDLE_MS);
  const idleMs = Number.isFinite(requested)
    ? Math.min(Math.max(requested, MIN_IDLE_MS), MAX_IDLE_MS)
    : DEFAULT_IDLE_MS;
  const tab = await activeTab();
  const startedAt = Date.now();
  const deadline = startedAt + WAIT_CEILING_MS;
  for (;;) {
    const last = log.lastActivityAt(tab.id!);
    const quietFor = last === 0 ? Infinity : Date.now() - last;
    if (quietFor >= idleMs) return { ok: true, idleAfterMs: Date.now() - startedAt };
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for network idle: no ${idleMs}ms quiet period in 10s`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

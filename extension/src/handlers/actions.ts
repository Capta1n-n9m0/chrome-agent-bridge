import { activeTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { withDebugger, trustedClick } from "../debugger.js";

async function inActiveTab<T>(fn: (...args: unknown[]) => T, args: unknown[]): Promise<T> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  return callInPage(tab.id!, fn, args);
}

export async function click(p: Record<string, unknown>): Promise<{ ok: true }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  const trusted = p.trusted === true;
  if (!trusted) {
    try {
      await callInPage(tab.id!, (ref) => window.__agentBridge!.click(ref as string), [p.ref]);
      return { ok: true };
    } catch {
      // fall through to trusted input
    }
  }
  const { x, y } = await callInPage<{ x: number; y: number }>(
    tab.id!,
    (ref) => window.__agentBridge!.centerOf(ref as string),
    [p.ref],
  );
  await withDebugger(tab.id!, () => trustedClick(tab.id!, x, y));
  return { ok: true };
}

export const type = (p: Record<string, unknown>) =>
  inActiveTab(
    (ref, value, submit) => window.__agentBridge!.type(ref as string, value as string, submit as boolean),
    [p.ref, p.text, p.submit ?? false],
  );

export const scroll = (p: Record<string, unknown>) =>
  inActiveTab(
    (ref, dir) => window.__agentBridge!.scroll(ref as string | undefined, dir as string),
    [p.ref, p.direction ?? "down"],
  );

export const hover = (p: Record<string, unknown>) =>
  inActiveTab((ref) => window.__agentBridge!.hover(ref as string), [p.ref]);

export const selectOption = (p: Record<string, unknown>) =>
  inActiveTab(
    (ref, values) => window.__agentBridge!.selectOption(ref as string, values as string[]),
    [p.ref, p.values],
  );

export const pressKey = (p: Record<string, unknown>) =>
  inActiveTab((key) => {
    const el = (document.activeElement ?? document.body) as HTMLElement;
    for (const t of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: key as string, bubbles: true }));
    return { ok: true };
  }, [p.key]);

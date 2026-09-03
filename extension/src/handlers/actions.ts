import { activeTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { withDebugger, trustedClick, trustedType, trustedPressKey } from "../debugger.js";

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
    } catch (err) {
      console.warn("[bridge] content-script click failed; escalating to CDP trusted input:", err);
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

/**
 * Synthetic typing sets `.value` and always "succeeds", so unlike click there is no observable
 * failure to escalate on — `trusted:true` is the way in to real CDP keystrokes. The content path is
 * still tried first when untrusted, and a throw there (stale ref) falls through to the trusted path.
 */
export async function type(p: Record<string, unknown>): Promise<{ ok: true }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  const ref = p.ref as string;
  const value = p.text as string;
  const submit = p.submit === true;
  const trusted = p.trusted === true;
  if (!trusted) {
    try {
      await callInPage(
        tab.id!,
        (r, v, s) => window.__agentBridge!.type(r as string, v as string, s as boolean),
        [ref, value, submit],
      );
      return { ok: true };
    } catch (err) {
      console.warn("[bridge] content-script type failed; escalating to CDP trusted input:", err);
      // fall through to trusted input
    }
  }
  // Focus + select-all in the page, then replace the selection with real keystrokes.
  await callInPage(tab.id!, (r) => window.__agentBridge!.focusForTyping(r as string), [ref]);
  await withDebugger(tab.id!, async () => {
    await trustedType(tab.id!, value);
    if (submit) await trustedPressKey(tab.id!, "Enter");
  });
  return { ok: true };
}

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

export async function pressKey(p: Record<string, unknown>): Promise<{ ok: true }> {
  const key = p.key as string;
  if (p.trusted === true) {
    const tab = await activeTab();
    await withDebugger(tab.id!, () => trustedPressKey(tab.id!, key));
    return { ok: true };
  }
  return inActiveTab((k) => {
    const el = (document.activeElement ?? document.body) as HTMLElement;
    for (const t of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: k as string, bubbles: true }));
    return { ok: true };
  }, [key]);
}

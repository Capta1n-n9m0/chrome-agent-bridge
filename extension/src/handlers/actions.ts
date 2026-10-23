import { pageTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { runTrustedInput } from "../debugger.js";
import { codeOf } from "../errors.js";

/**
 * A trusted-path result: `focusEmulation: "on"` exactly when the input ran under CDP focus emulation
 * (stage FE), so a stale extension — which ignores the unknown param — is detectable (#71).
 */
type ActionResult = { ok: true; focusEmulation?: "on" };
function trustedResult(emulated: boolean): ActionResult {
  return emulated ? { ok: true, focusEmulation: "on" } : { ok: true };
}

async function inTargetTab<T>(
  p: Record<string, unknown>,
  method: string,
  fn: (...args: unknown[]) => T,
  args: unknown[],
): Promise<T> {
  const tab = await pageTab(p, method);
  await ensureContent(tab.id!);
  return callInPage(tab.id!, fn, args);
}

export async function click(p: Record<string, unknown>): Promise<ActionResult> {
  const tab = await pageTab(p, "click");
  await ensureContent(tab.id!);
  const trusted = p.trusted === true;
  if (!trusted) {
    try {
      await callInPage(tab.id!, (ref) => window.__agentBridge!.click(ref as string), [p.ref]);
      return { ok: true };
    } catch (err) {
      // The code only: Chrome's raw message can carry a URL.
      console.warn("[bridge] content-script click failed; escalating to CDP trusted input:", codeOf(err));
      // fall through to trusted input
    }
  }
  const { x, y } = await callInPage<{ x: number; y: number }>(
    tab.id!,
    (ref) => window.__agentBridge!.centerForInput(ref as string),
    [p.ref],
  );
  // centerForInput only scrolls and measures (it focuses nothing), so it stays before attaching.
  return trustedResult(await runTrustedInput(tab.id!, { kind: "click", x, y }, { focusEmulation: p.focusEmulation === true }));
}

/**
 * Synthetic typing sets `.value` and always "succeeds", so unlike click there is no observable
 * failure to escalate on — `trusted:true` is the way in to real CDP keystrokes. The content path is
 * still tried first when untrusted, and a throw there (stale ref) falls through to the trusted path.
 */
export async function type(p: Record<string, unknown>): Promise<ActionResult> {
  const tab = await pageTab(p, "type");
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
      // The code only: Chrome's raw message can carry a URL.
      console.warn("[bridge] content-script type failed; escalating to CDP trusted input:", codeOf(err));
      // fall through to trusted input
    }
  }
  // Focus + select-all in the page, then replace the selection with real keystrokes. With focus
  // emulation the focus step runs inside the debugger session, after the enable (decisions.md ·
  // 2026-10-23 · Stage 0's build-level rulings … (#85) item 3); without it, before attaching, as before.
  const focusEmulation = p.focusEmulation === true;
  const focus = () => callInPage(tab.id!, (r) => window.__agentBridge!.focusForTyping(r as string), [ref]);
  if (!focusEmulation) await focus();
  return trustedResult(await runTrustedInput(tab.id!, { kind: "type", text: value, submit }, { focusEmulation, focus }));
}

export const scroll = (p: Record<string, unknown>) =>
  inTargetTab(
    p,
    "scroll",
    (ref, dir) => window.__agentBridge!.scroll(ref as string | undefined, dir as string),
    [p.ref, p.direction ?? "down"],
  );

export const hover = (p: Record<string, unknown>) =>
  inTargetTab(p, "hover", (ref) => window.__agentBridge!.hover(ref as string), [p.ref]);

export const selectOption = (p: Record<string, unknown>) =>
  inTargetTab(
    p,
    "selectOption",
    (ref, values) => window.__agentBridge!.selectOption(ref as string, values as string[]),
    [p.ref, p.values],
  );

export async function pressKey(p: Record<string, unknown>): Promise<ActionResult> {
  const key = p.key as string;
  if (p.trusted === true) {
    const tab = await pageTab(p, "pressKey");
    // No focus step: a key goes to the page's focused element (FE-3's row names how it is focused).
    return trustedResult(await runTrustedInput(tab.id!, { kind: "pressKey", key }, { focusEmulation: p.focusEmulation === true }));
  }
  return inTargetTab(p, "pressKey", (k) => {
    const el = (document.activeElement ?? document.body) as HTMLElement;
    for (const t of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: k as string, bubbles: true }));
    return { ok: true };
  }, [key]);
}

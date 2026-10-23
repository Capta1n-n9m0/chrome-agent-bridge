import { pageTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { runTrustedInput } from "../debugger.js";
import { codeOf } from "../errors.js";
import { checkTarget, resolveTarget } from "./target.js";

/**
 * A trusted-path result: `focusEmulation: "on"` exactly when the input ran under CDP focus emulation
 * (stage FE), so a stale extension — which ignores the unknown param — is detectable (#71).
 */
type ActionResult = { ok: true; focusEmulation?: "on" };
function trustedResult(emulated: boolean): ActionResult {
  return emulated ? { ok: true, focusEmulation: "on" } : { ok: true };
}

/**
 * `checkTarget` (params only, no page call) → pageTab → ensureContent → `resolveTarget` (Step 8:
 * `ref | locator`) → the page call, whose args are built from the resolved ref. With a `ref` (or
 * neither) nothing is added to the page-call sequence.
 */
async function inTargetTab<T>(
  p: Record<string, unknown>,
  method: string,
  fn: (...args: unknown[]) => T,
  args: (ref: string | undefined) => unknown[],
): Promise<T> {
  checkTarget(p);
  const tab = await pageTab(p, method);
  await ensureContent(tab.id!);
  const ref = await resolveTarget(tab.id!, p);
  return callInPage(tab.id!, fn, args(ref));
}

export async function click(p: Record<string, unknown>): Promise<ActionResult> {
  checkTarget(p);
  const tab = await pageTab(p, "click");
  await ensureContent(tab.id!);
  // Before the content-path try: a LOCATOR_* / BAD_PARAMS from resolution never escalates (F23).
  const target = await resolveTarget(tab.id!, p);
  const trusted = p.trusted === true;
  if (!trusted) {
    try {
      await callInPage(tab.id!, (ref) => window.__agentBridge!.click(ref as string), [target]);
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
    [target],
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
  checkTarget(p);
  const tab = await pageTab(p, "type");
  await ensureContent(tab.id!);
  // Before the content-path try: a LOCATOR_* / BAD_PARAMS from resolution never escalates (F23).
  const ref = (await resolveTarget(tab.id!, p)) as string;
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
    (ref) => [ref, p.direction ?? "down"],
  );

export const hover = (p: Record<string, unknown>) =>
  inTargetTab(p, "hover", (ref) => window.__agentBridge!.hover(ref as string), (ref) => [ref]);

export const selectOption = (p: Record<string, unknown>) =>
  inTargetTab(
    p,
    "selectOption",
    (ref, values) => window.__agentBridge!.selectOption(ref as string, values as string[]),
    (ref) => [ref, p.values],
  );

/** The synthetic key: keydown/keyup on the page's focused element. */
const syntheticKey = (k: unknown) => {
  const el = (document.activeElement ?? document.body) as HTMLElement;
  for (const t of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: k as string, bubbles: true }));
  return { ok: true as const };
};

/**
 * Without `ref`/`locator` exactly as before Step 8: the key goes to the page's focused element. With a
 * target (an additive extension feature; the SDK's surface sends none yet): pageTab → ensureContent →
 * `resolveTarget` → the content script's `focus(ref)` (plain `el.focus()`, no selection change) → the
 * same synthetic or trusted path. The focus runs before attaching.
 */
export async function pressKey(p: Record<string, unknown>): Promise<ActionResult> {
  const key = p.key as string;
  checkTarget(p);
  if (p.ref !== undefined && p.ref !== null) return pressKeyAt(p, key);
  if (p.locator !== undefined && p.locator !== null) return pressKeyAt(p, key);
  if (p.trusted === true) {
    const tab = await pageTab(p, "pressKey");
    // No focus step: a key goes to the page's focused element (FE-3's row names how it is focused).
    return trustedResult(await runTrustedInput(tab.id!, { kind: "pressKey", key }, { focusEmulation: p.focusEmulation === true }));
  }
  return inTargetTab(p, "pressKey", syntheticKey, () => [key]);
}

async function pressKeyAt(p: Record<string, unknown>, key: string): Promise<ActionResult> {
  const tab = await pageTab(p, "pressKey");
  await ensureContent(tab.id!);
  const ref = await resolveTarget(tab.id!, p);
  await callInPage(tab.id!, (r) => window.__agentBridge!.focus(r as string), [ref]);
  if (p.trusted === true) {
    return trustedResult(await runTrustedInput(tab.id!, { kind: "pressKey", key }, { focusEmulation: p.focusEmulation === true }));
  }
  return callInPage(tab.id!, syntheticKey, [key]);
}

import { pageTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";
import { runTrustedInput } from "../debugger.js";
import { codeOf } from "../errors.js";
import { checkTarget, resolveTargetCapped, withCapFlag } from "./target.js";
import type { HandlerSafety } from "../safety-call.js";

/**
 * A trusted-path result: `focusEmulation: "on"` exactly when the input ran under CDP focus emulation
 * (stage FE), so a stale extension — which ignores the unknown param — is detectable (#71).
 */
type ActionResult = { ok: true; focusEmulation?: "on"; pastSnapshotCap?: true };
function trustedResult(emulated: boolean): ActionResult {
  return emulated ? { ok: true, focusEmulation: "on" } : { ok: true };
}

/*
 * Step 9: `call` is the gated router's per-call safety. `call?.effect()` re-checks the state and the tab
 * right before each page touch (`ensureContent`, each `callInPage`) and the trusted path re-checks before
 * the debugger attaches (`withDebugger`) (decisions.md · 2026-10-24 · In-flight work at disarm and on a newly
 * blocked tab (#137), V17). A refusal there is thrown outside the content-path `try`, so it is never
 * escalated to trusted input. Without `call` (the core router, the tests) nothing is added.
 */

/**
 * `checkTarget` (params only, no page call) → pageTab → ensureContent → `resolveTarget` (Step 8:
 * `ref | locator`) → the page call, whose args are built from the resolved ref. With a `ref` (or
 * neither) nothing is added to the page-call sequence. Step 10 S3 (#117): a locator that `locate` found
 * past the snapshot's cap adds `pastSnapshotCap: true` to the reply (`withCapFlag`), on every branch.
 */
async function inTargetTab<T>(
  p: Record<string, unknown>,
  method: string,
  fn: (...args: unknown[]) => T,
  args: (ref: string | undefined) => unknown[],
  call?: HandlerSafety,
): Promise<T> {
  checkTarget(p);
  const tab = await pageTab(p, method);
  await call?.effect();
  await ensureContent(tab.id!);
  const { ref, pastSnapshotCap } = await resolveTargetCapped(tab.id!, p, call);
  await call?.effect();
  return withCapFlag(await callInPage(tab.id!, fn, args(ref)), pastSnapshotCap);
}

export async function click(p: Record<string, unknown>, call?: HandlerSafety): Promise<ActionResult> {
  checkTarget(p);
  const tab = await pageTab(p, "click");
  await call?.effect();
  await ensureContent(tab.id!);
  // Before the content-path try: a LOCATOR_* / BAD_PARAMS from resolution never escalates (F23).
  const { ref: target, pastSnapshotCap } = await resolveTargetCapped(tab.id!, p, call);
  const trusted = p.trusted === true;
  if (!trusted) {
    await call?.effect(); // outside the try: a refusal is never escalated
    try {
      await callInPage(tab.id!, (ref) => window.__agentBridge!.click(ref as string), [target]);
      return withCapFlag<ActionResult>({ ok: true }, pastSnapshotCap);
    } catch (err) {
      // The code only: Chrome's raw message can carry a URL.
      console.warn("[bridge] content-script click failed; escalating to CDP trusted input:", codeOf(err));
      // fall through to trusted input
    }
  }
  await call?.effect();
  const { x, y } = await callInPage<{ x: number; y: number }>(
    tab.id!,
    (ref) => window.__agentBridge!.centerForInput(ref as string),
    [target],
  );
  // centerForInput only scrolls and measures (it focuses nothing), so it stays before attaching.
  return withCapFlag(
    trustedResult(await runTrustedInput(tab.id!, { kind: "click", x, y }, { focusEmulation: p.focusEmulation === true }, call)),
    pastSnapshotCap,
  );
}

/**
 * Synthetic typing sets `.value` and always "succeeds", so unlike click there is no observable
 * failure to escalate on — `trusted:true` is the way in to real CDP keystrokes. The content path is
 * still tried first when untrusted, and a throw there (stale ref) falls through to the trusted path.
 */
export async function type(p: Record<string, unknown>, call?: HandlerSafety): Promise<ActionResult> {
  checkTarget(p);
  const tab = await pageTab(p, "type");
  await call?.effect();
  await ensureContent(tab.id!);
  // Before the content-path try: a LOCATOR_* / BAD_PARAMS from resolution never escalates (F23).
  const resolved = await resolveTargetCapped(tab.id!, p, call);
  const ref = resolved.ref as string;
  const value = p.text as string;
  const submit = p.submit === true;
  const trusted = p.trusted === true;
  if (!trusted) {
    await call?.effect(); // outside the try: a refusal is never escalated
    try {
      await callInPage(
        tab.id!,
        (r, v, s) => window.__agentBridge!.type(r as string, v as string, s as boolean),
        [ref, value, submit],
      );
      return withCapFlag<ActionResult>({ ok: true }, resolved.pastSnapshotCap);
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
  const focus = async () => {
    await call?.effect();
    return callInPage(tab.id!, (r) => window.__agentBridge!.focusForTyping(r as string), [ref]);
  };
  if (!focusEmulation) await focus();
  return withCapFlag(
    trustedResult(await runTrustedInput(tab.id!, { kind: "type", text: value, submit }, { focusEmulation, focus }, call)),
    resolved.pastSnapshotCap,
  );
}

export const scroll = (p: Record<string, unknown>, call?: HandlerSafety) =>
  inTargetTab(
    p,
    "scroll",
    (ref, dir) => window.__agentBridge!.scroll(ref as string | undefined, dir as string),
    (ref) => [ref, p.direction ?? "down"],
    call,
  );

export const hover = (p: Record<string, unknown>, call?: HandlerSafety) =>
  inTargetTab(p, "hover", (ref) => window.__agentBridge!.hover(ref as string), (ref) => [ref], call);

export const selectOption = (p: Record<string, unknown>, call?: HandlerSafety) =>
  inTargetTab(
    p,
    "selectOption",
    (ref, values) => window.__agentBridge!.selectOption(ref as string, values as string[]),
    (ref) => [ref, p.values],
    call,
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
export async function pressKey(p: Record<string, unknown>, call?: HandlerSafety): Promise<ActionResult> {
  const key = p.key as string;
  checkTarget(p);
  if (p.ref !== undefined && p.ref !== null) return pressKeyAt(p, key, call);
  if (p.locator !== undefined && p.locator !== null) return pressKeyAt(p, key, call);
  if (p.trusted === true) {
    const tab = await pageTab(p, "pressKey");
    // No focus step: a key goes to the page's focused element (FE-3's row names how it is focused).
    return trustedResult(await runTrustedInput(tab.id!, { kind: "pressKey", key }, { focusEmulation: p.focusEmulation === true }, call));
  }
  return inTargetTab(p, "pressKey", syntheticKey, () => [key], call);
}

async function pressKeyAt(p: Record<string, unknown>, key: string, call?: HandlerSafety): Promise<ActionResult> {
  const tab = await pageTab(p, "pressKey");
  await call?.effect();
  await ensureContent(tab.id!);
  const { ref, pastSnapshotCap } = await resolveTargetCapped(tab.id!, p, call);
  await call?.effect();
  await callInPage(tab.id!, (r) => window.__agentBridge!.focus(r as string), [ref]);
  if (p.trusted === true) {
    return withCapFlag(
      trustedResult(await runTrustedInput(tab.id!, { kind: "pressKey", key }, { focusEmulation: p.focusEmulation === true }, call)),
      pastSnapshotCap,
    );
  }
  await call?.effect();
  return withCapFlag<ActionResult>(await callInPage(tab.id!, syntheticKey, [key]), pastSnapshotCap);
}

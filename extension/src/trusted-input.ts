/**
 * The CDP steps of one trusted input (Step 8 stage FE; decisions.md · 2026-10-23 · Stage FE measures
 * focus emulation before `policy.ts` is set (#71), amended by #78 and by #85 item 3).
 *
 * Pure (no `chrome.*`), so it is unit-tested under node. Without `focusEmulation` it returns exactly
 * the `Input.*` commands the pre-FE `trustedClick` / `trustedType` / `trustedPressKey` sent — asserted
 * against `extension/test/fixtures/fe-cdp-baseline.json`, recorded on the FE parent commit. With it:
 * `Emulation.setFocusEmulationEnabled {enabled:true}` → (for `type`) the focus step → the input
 * commands → `{enabled:false}`, the last marked `cleanup`: the runner (`runTrustedInput` in
 * `debugger.ts`) iterates `trustedInputBody` and sends `trustedInputCleanup` in a `finally`, also after
 * a failing input command or a rejected character. Nothing here focuses a
 * window or activates a tab: emulation is per debugger session (stage0-audit.md §8).
 */
import { keyEventParams, type KeyEventParams } from "./keys.js";

export type TrustedInput =
  | { kind: "click"; x: number; y: number }
  | { kind: "type"; text: string; submit: boolean }
  | { kind: "pressKey"; key: string };

/**
 * `cdp`: one `chrome.debugger.sendCommand`. `focus`: `type`'s content-script `focusForTyping`, which
 * moves inside the debugger session after the enable when the option is on (#85 item 3); without the
 * option the handler runs it before attaching, as before. `cleanup`: run in the runner's `finally`.
 */
export type TrustedStep =
  | { op: "cdp"; method: string; params: { [key: string]: unknown }; cleanup?: true }
  | { op: "focus" };

export const FOCUS_EMULATION_ENABLE = {
  method: "Emulation.setFocusEmulationEnabled",
  params: { enabled: true },
} as const;
export const FOCUS_EMULATION_DISABLE = {
  method: "Emulation.setFocusEmulationEnabled",
  params: { enabled: false },
} as const;

/** The whole list: `trustedInputBody` followed by `trustedInputCleanup` (what the tests compare). */
export function trustedInputSteps(input: TrustedInput, focusEmulation: boolean): TrustedStep[] {
  return [...trustedInputBody(input, focusEmulation), ...trustedInputCleanup(focusEmulation)];
}

/**
 * The steps before the cleanup, yielded lazily: each character's key params are computed only when the
 * runner reaches it, so a character `keyEventParams` rejects (a non-BMP one) throws after the keys
 * before it were sent — exactly the pre-FE `trustedType` (FE verifier finding 1).
 */
export function* trustedInputBody(input: TrustedInput, focusEmulation: boolean): Generator<TrustedStep> {
  if (focusEmulation) {
    yield { op: "cdp", method: FOCUS_EMULATION_ENABLE.method, params: { ...FOCUS_EMULATION_ENABLE.params } };
    if (input.kind === "type") yield { op: "focus" };
  }
  yield* inputCommands(input);
}

/** What the runner sends in its `finally`: the disable, when the option is on. */
export function trustedInputCleanup(focusEmulation: boolean): TrustedStep[] {
  return focusEmulation
    ? [{ op: "cdp", method: FOCUS_EMULATION_DISABLE.method, params: { ...FOCUS_EMULATION_DISABLE.params }, cleanup: true }]
    : [];
}

function* inputCommands(input: TrustedInput): Generator<TrustedStep> {
  switch (input.kind) {
    case "click":
      yield* clickCommands(input.x, input.y);
      return;
    case "type":
      for (const ch of input.text) {
        // A "\n" becomes a genuine Enter — a char-`text`-only event can't express it.
        yield* keyCommands(keyEventParams(ch === "\n" || ch === "\r" ? "Enter" : ch));
      }
      if (input.submit) yield* keyCommands(keyEventParams("Enter"));
      return;
    case "pressKey":
      yield* keyCommands(keyEventParams(input.key));
      return;
  }
}

function clickCommands(x: number, y: number): TrustedStep[] {
  // Coords are CSS pixels of the layout viewport — exactly getBoundingClientRect's space, with no
  // scaling. Measured at zoom 1.0/1.5 and DPR 1/1.25/1.5: the event's clientX,clientY came back
  // identical to what was sent every time, so Chrome folds in both page zoom and DPR itself.
  // The caller must ensure the point is on screen (see centerForInput) — CDP does not clamp, and a
  // point past the viewport edge hit-tests the root element and does nothing.
  return [
    { op: "cdp", method: "Input.dispatchMouseEvent", params: { type: "mousePressed", x, y, button: "left", clickCount: 1, buttons: 1 } },
    { op: "cdp", method: "Input.dispatchMouseEvent", params: { type: "mouseReleased", x, y, button: "left", clickCount: 1, buttons: 0 } },
  ];
}

function keyCommands(p: KeyEventParams): TrustedStep[] {
  // The same literal as the pre-FE `dispatchKey` (members and order), undefined members included:
  // `sendCommand` drops them when it serialises the params.
  const base = { key: p.key, code: p.code, windowsVirtualKeyCode: p.windowsVirtualKeyCode, text: p.text, modifiers: p.modifiers };
  return [
    { op: "cdp", method: "Input.dispatchKeyEvent", params: { ...base, type: "keyDown" } },
    { op: "cdp", method: "Input.dispatchKeyEvent", params: { ...base, type: "keyUp" } },
  ];
}

/**
 * CDP `Input.dispatchKeyEvent` parameters for a key name or a single character.
 *
 * Pure table — no `chrome.*` — so it runs under node in the unit tests. Named keys (Enter, Tab, …)
 * need a `windowsVirtualKeyCode`: a `text`-only event can't express them. Printable characters carry
 * `text`, which is what actually inserts the character into a focused field.
 */
export interface KeyEventParams {
  key: string;
  code: string;
  windowsVirtualKeyCode?: number;
  text?: string;
  modifiers?: number;
}

/** CDP modifier bitmask: Alt=1, Ctrl=2, Meta=4, Shift=8. */
const SHIFT = 8;

const NAMED: Record<string, KeyEventParams> = {
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  Backspace: { key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 },
  Delete: { key: "Delete", code: "Delete", windowsVirtualKeyCode: 46 },
  Home: { key: "Home", code: "Home", windowsVirtualKeyCode: 36 },
  End: { key: "End", code: "End", windowsVirtualKeyCode: 35 },
  PageUp: { key: "PageUp", code: "PageUp", windowsVirtualKeyCode: 33 },
  PageDown: { key: "PageDown", code: "PageDown", windowsVirtualKeyCode: 34 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
};

export function keyEventParams(key: string): KeyEventParams {
  const named = NAMED[key];
  if (named) return { ...named };

  if (key.length !== 1) {
    throw new Error(`unsupported key "${key}" — supported named keys: ${Object.keys(NAMED).join(", ")}`);
  }

  const upper = key.toUpperCase();
  const params: KeyEventParams = { key, code: codeFor(key, upper), text: key };
  // A character's ASCII code equals its virtual key code only for A-Z, 0-9 and space. Punctuation
  // uses OEM virtual keys, and sending the ASCII value instead makes Chrome act on the wrong key —
  // "." (46) is VK_DELETE, which swallowed the character. For those, `text` alone is correct.
  if (/[a-zA-Z0-9 ]/.test(key)) params.windowsVirtualKeyCode = upper.charCodeAt(0);
  // Shift is what a real keyboard would be holding for an uppercase letter; sites that read
  // `event.shiftKey` (or re-derive the character) need it.
  if (/[A-Z]/.test(key)) params.modifiers = SHIFT;
  return params;
}

function codeFor(ch: string, upper: string): string {
  if (/[a-zA-Z]/.test(ch)) return `Key${upper}`;
  if (/[0-9]/.test(ch)) return `Digit${ch}`;
  if (ch === " ") return "Space";
  return "";
}

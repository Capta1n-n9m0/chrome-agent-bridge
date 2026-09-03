import { keyEventParams, type KeyEventParams } from "./keys.js";

const PROTOCOL = "1.3";

async function send(tabId: number, method: string, params: { [key: string]: unknown } = {}): Promise<unknown> {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

export async function withDebugger<T>(tabId: number, fn: () => Promise<T>): Promise<T> {
  await chrome.debugger.attach({ tabId }, PROTOCOL);
  try {
    return await fn();
  } finally {
    try {
      await chrome.debugger.detach({ tabId });
    } catch {
      /* already detached */
    }
  }
}

export async function trustedClick(tabId: number, x: number, y: number): Promise<void> {
  // Coords are CSS pixels of the layout viewport — exactly getBoundingClientRect's space, with no
  // scaling. Measured at zoom 1.0/1.5 and DPR 1/1.25/1.5: the event's clientX,clientY came back
  // identical to what was sent every time, so Chrome folds in both page zoom and DPR itself.
  // The caller must ensure the point is on screen (see centerForInput) — CDP does not clamp, and a
  // point past the viewport edge hit-tests the root element and does nothing.
  await send(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, buttons: 1 });
  await send(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, buttons: 0 });
}

/**
 * Real keystrokes for each character of `text`. A "\n" becomes a genuine Enter — a char-`text`-only
 * event can't express it. Assumes the target is already focused (and, for replace-semantics, that its
 * contents are selected) — see `focusForTyping` in the content script.
 */
export async function trustedType(tabId: number, text: string): Promise<void> {
  for (const ch of text) {
    if (ch === "\n" || ch === "\r") {
      await trustedPressKey(tabId, "Enter");
      continue;
    }
    await dispatchKey(tabId, keyEventParams(ch));
  }
}

/** One real key press/release, e.g. "Enter", "Tab", "ArrowDown". */
export async function trustedPressKey(tabId: number, key: string): Promise<void> {
  await dispatchKey(tabId, keyEventParams(key));
}

async function dispatchKey(tabId: number, p: KeyEventParams): Promise<void> {
  // Spread into a fresh literal: sendCommand wants an index-signature type, which the interface lacks.
  const base = { key: p.key, code: p.code, windowsVirtualKeyCode: p.windowsVirtualKeyCode, text: p.text, modifiers: p.modifiers };
  await send(tabId, "Input.dispatchKeyEvent", { ...base, type: "keyDown" });
  await send(tabId, "Input.dispatchKeyEvent", { ...base, type: "keyUp" });
}

export async function fullPageScreenshot(tabId: number): Promise<string> {
  return withDebugger(tabId, async () => {
    const result = (await send(tabId, "Page.captureScreenshot", {
      captureBeyondViewport: true,
      format: "png",
    })) as { data: string };
    return `data:image/png;base64,${result.data}`;
  });
}

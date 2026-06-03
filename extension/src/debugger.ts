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
  // Coords are CSS pixels from getBoundingClientRect — the space CDP Input expects.
  // devicePixelRatio scaling is not applied; correct on 1x displays (DPR handling is future work).
  await send(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, buttons: 1 });
  await send(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, buttons: 0 });
}

// Available for a future trusted-typing escalation path; not yet wired into the type handler.
export async function trustedType(tabId: number, text: string): Promise<void> {
  for (const ch of text) {
    await send(tabId, "Input.dispatchKeyEvent", { type: "keyDown", text: ch });
    await send(tabId, "Input.dispatchKeyEvent", { type: "keyUp", text: ch });
  }
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

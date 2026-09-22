/**
 * Safari exposes the standard WebExtension namespace as `browser`; Chromium exposes `chrome`.
 * Both implement the Promise-based MV3 methods this project uses. Keep the choice in one place so
 * the shared handlers can be bundled for either browser.
 */
type BrowserGlobal = typeof globalThis & {
  browser?: typeof chrome;
  chrome?: typeof chrome;
};

const globals = globalThis as BrowserGlobal;

export const browserApi: typeof chrome = globals.browser ?? globals.chrome!;

export function hasDebuggerApi(api: Partial<typeof chrome> | undefined = browserApi): boolean {
  return typeof api?.debugger?.attach === "function" && typeof api?.debugger?.sendCommand === "function";
}

export function browserName(api: Partial<typeof chrome> | undefined = browserApi): "Chrome" | "Safari" {
  return hasDebuggerApi(api) ? "Chrome" : "Safari";
}

// Step 7 T2 — the daemon's one method table (decisions.md #39; #53 for the lock class). Step 8 S2b
// removed the Step 6 compatibility forms (#41, #54, #81, #85 item 4): the Step 6 alias of `focusTab` is
// gone from this table and refused by the tab layer itself.
// Every extension method is in exactly one class; a new extension method must enter this table.

/**
 * Tab-carrying and lease-checked: resolved to a numeric `tabId` before forwarding. Step 10 S4 (decisions.md #205;
 * Stage 0 F4): `browser_evaluate {saveTo}`'s three `evaluateSave*` methods are here — the start and each pull
 * carry the tab, so only its holder can pull; no visibility lock.
 */
export const TAB_METHODS: ReadonlySet<string> = new Set([
  "navigate",
  "snapshot",
  "screenshot",
  "click",
  "type",
  "scroll",
  "hover",
  "selectOption",
  "pressKey",
  "back",
  "forward",
  "waitFor",
  "evaluate",
  "locate",
  "networkClear",
  "focusTab",
  "evaluateSaveStart",
  "evaluateSaveChunk",
  "evaluateSaveEnd",
]);

/** Free (no lease check), forwarded. `networkRequests` still has its scope resolved (#40). */
export const FREE_METHODS: ReadonlySet<string> = new Set([
  "networkRequests",
  "downloadStart",
  "downloadChunk",
  "downloadEnd",
]);

/** Handled by the daemon itself, never forwarded (`daemon.*` too). */
export const DAEMON_METHODS: ReadonlySet<string> = new Set(["tabs.claim", "tabs.release"]);

/**
 * Methods the daemon answers `UNKNOWN_METHOD` itself, before any resolution or lease check (decisions.md
 * · 2026-10-23 · #85 item 4): a Step 7 extension still answers them, so dropping them from the table
 * alone would forward them as unlisted tab methods without the visibility lock (Stage 0 F10).
 */
export const REMOVED_METHODS: ReadonlyMap<string, string> = new Map([
  ["selectTab", "was removed in Step 8 — call focusTab"],
]);

/** Methods whose `tab` is a scope: a handle, "all", or "active"/absent (#40, #81). */
export const NETWORK_METHODS: ReadonlySet<string> = new Set(["networkRequests", "networkClear"]);

/**
 * `untargeted` (S2b, #81 F8): an unlisted method that names no tab — refused `BAD_PARAMS "tab is
 * required"`, never forwarded (before S2b it was forwarded free and acted on the human's tab unchecked).
 */
export type MethodClass = "daemon" | "tab" | "closeTab" | "newTab" | "listTabs" | "free" | "untargeted";

function hasTab(params: Record<string, unknown> | undefined): boolean {
  return params !== undefined && params.tab !== undefined;
}

export function classify(method: string, params: Record<string, unknown> | undefined): MethodClass {
  if (method.startsWith("daemon.") || DAEMON_METHODS.has(method)) return "daemon";
  if (method === "closeTab") return "closeTab";
  if (method === "newTab") return "newTab";
  if (method === "listTabs") return "listTabs";
  if (TAB_METHODS.has(method)) return "tab";
  if (FREE_METHODS.has(method)) return "free";
  // Unlisted: with a `tab` it is resolved and lease-checked; without one it is refused.
  return hasTab(params) ? "tab" : "untargeted";
}

/**
 * Needs-screen methods take the visibility lock: `screenshot` unless `mode === "cdp"` or `fullPage`
 * (an unknown mode falls on the locking side, #50), and `focusTab` (#53).
 */
export function takesLock(method: string, params: Record<string, unknown> | undefined): boolean {
  if (method === "focusTab") return true;
  if (method !== "screenshot") return false;
  return params?.mode !== "cdp" && !params?.fullPage;
}

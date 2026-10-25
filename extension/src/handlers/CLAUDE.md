# extension/src/handlers/ — Handler runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply. `extension/CLAUDE.md` holds the key files and the service-worker gotchas.

- **`browser_download` fetches from the service worker, not the page.** The `<all_urls>` host
  permission exempts the extension's `fetch` from CORS, so a cross-origin redirect (Blackboard →
  signed S3) is followed — the page cannot do that. The bytes are held in a `DownloadStore`
  (TTL 5 min, 8 entries) and pulled by the SDK's `downloadToFile` in 1 MB `downloadChunk` calls (base64) so no single
  runtime message or WS frame grows with the file. The final URL is never returned or logged (it is
  usually signed) — only its host.
- **Every handler takes `tabId`; nothing in `extension/src/handlers` calls `activeTab()`** (T1.2 grep,
  T1 report). `targetTab(p, method)`: integer → `chrome.tabs.get`, "No tab with id" → `TAB_UNKNOWN`,
  non-integer → `BAD_PARAMS`, a string `tab` (a handle an old daemon forwarded) → `BAD_PARAMS`, absent →
  `BAD_PARAMS "<method> requires tabId"`; `grep -rn "targetTab({}" extension/src` is empty. Don't
  restore the fallback (a Step 8 forbidden fix), and don't make the daemon omit `tabId`.
- **`newTab` opens in the background unless `active: true` is passed** (`handlers/tabs.ts`; T3.4). The MCP's rule for `browser_new_tab` is in `mcp/CLAUDE.md`. Don't change the extension's default back.
- **`screenshot {mode:"cdp"}` hung on a hidden or minimized tab, so it now refuses.** Run 8: a
  background tab → `TIMEOUT` after 35 s with the banner up, and the next `evaluate` on another tab got
  a transient `DEBUGGER_DEVTOOLS` (SCREEN-2); a minimized window → `TIMEOUT` after 25 s (SCREEN-4).
  Since T5b, `cdpCaptureRefusal` answers before attaching: `OFFSCREEN` for a tab not active in its
  window, `WINDOW_MINIMIZED` for a minimized window, both in 3 ms with no banner (Run 9 R9-SCREEN-2,
  R9-SCREEN-4; decisions.md · 2026-10-23 · T5b's three fixes). `cdp` mode is useful only for a tab
  already in front of a visible window.

Redirects onto blocked hosts (the block list is not a network firewall) are in `extension/CLAUDE.md`, Safety gate.

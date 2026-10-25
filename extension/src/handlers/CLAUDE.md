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
- **`newTab` opens in the background unless `active: true` is passed** (`handlers/tabs.ts`; T3.4). The
  MCP's `browser_new_tab` sends `active: true` only when the cursor is set and `listTabs` shows its tab
  as `current` (the human is watching this session's tab); otherwise — a session's first tab, a lost
  cursor, a failed listing — it opens in the background and says ` (in the background —
  browser_focus_tab shows it)`. Don't change the extension's default back.
- **`screenshot {mode:"cdp"}` hung on a hidden or minimized tab, so it now refuses.** Run 8: a
  background tab → `TIMEOUT` after 35 s with the banner up, and the next `evaluate` on another tab got
  a transient `DEBUGGER_DEVTOOLS` (SCREEN-2); a minimized window → `TIMEOUT` after 25 s (SCREEN-4).
  Since T5b, `cdpCaptureRefusal` answers before attaching: `OFFSCREEN` for a tab not active in its
  window, `WINDOW_MINIMIZED` for a minimized window, both in 3 ms with no banner (Run 9 R9-SCREEN-2,
  R9-SCREEN-4; decisions.md · 2026-10-23 · T5b's three fixes). `cdp` mode is useful only for a tab
  already in front of a visible window.
- **`navigate`/`newTab` are gated on the URL Chrome will open**, so a relative URL that resolves to this
  extension's `options.html` is refused, not just `chrome-extension://…` written out (S2a round-1
  CRITICAL, #175; measured in Run 13 SAFE-REL-1, PASS). `view-source:` of a relative own-page path
  answered `ok` (SAFE-REL-3 `rel`, recorded) — it resolves against the page's origin, not the extension
  (`wrapper=view-source inner=http own=no`, Run 14 R14-REL-3; #196 answered); every later call on such a tab is
  refused.
- **Chrome refuses a `javascript:` navigation through the bridge itself**: `NAV_FAILED JavaScript URLs are
  not allowed in API based extension navigations. …`, page unchanged (Run 13 SAFE-6c, JavaScript on,
  record). With JavaScript off the gate refuses first (Run 13: `DISARMED`, scope `evaluate`, SAFE-6; since Step 10
  S4b `JS_DISABLED` with no `data`, measured live in Run 15 JSD; #202, #219).
- **The block list is not a network firewall.** A redirect hop of a bridge `navigate` or `downloadStart`
  onto a blocked host is still requested; the post-check refuses the reply and a download drops its bytes
  (`downloadStart` checks its own URL, then `res.url`, #140, #154). The post-redirect download check is
  measured live: a download redirected onto a blocked host was refused `DOMAIN_BLOCKED` in 76 ms with no file, and
  the server saw the hop and the target each requested once (Run 14 R14-5c, on the threaded `s9-redirect.py`;
  S1.md Findings 4).
  A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).

# Chrome Real-Profile Agent Bridge — Design Spec

- **Date:** 2026-06-04
- **Status:** Approved (implementation not started)
- **Owner:** alievabbas1@gmail.com

---

## 1. Background & motivation

We want to **automate the current Chrome browser running the default profile** — the one that
is already logged in everywhere — and drive it with an AI agent (Claude).

Since **Chrome 136 (May 2025)**, Chrome deliberately ignores `--remote-debugging-port` and
`--remote-debugging-pipe` when launched against the **default user-data-dir**. This was a
security fix (preventing malware/other processes from trivially attaching CDP to a user's real,
logged-in profile). The side effect: the classic "attach Playwright/Puppeteer/Selenium over CDP
to my real profile" workflow no longer works.

The clean modern workaround is a **Chrome extension**, because an extension runs *inside* the
real profile. Critically, the extension can still reach CDP-level control through the
`chrome.debugger` API (`Input.dispatchMouseEvent`, `Page.captureScreenshot`, etc.) — so we
don't lose CDP power, we just source it from inside the profile instead of from a launch flag.

> Mental model: **"Playwright MCP, but pointed at your real logged-in Chrome instead of a
> throwaway browser."**

## 2. Goals & non-goals

### Goals
- Let Claude (via MCP) **perceive and operate** the user's real, logged-in Chrome.
- Control the **active tab**, with the ability to **list and switch between tabs**.
- Hybrid perception: token-efficient accessibility snapshot by default, screenshots on demand.
- Reliable actions: content-script events by default, escalate to trusted `chrome.debugger`
  input when needed.
- Minimal install friction (no OS-level native-host manifest/registry setup).

### Non-goals (YAGNI)
- A CDP-compatible wire protocol for reusing Puppeteer/Playwright libraries.
- A Native Messaging host.
- Multi-user / remote-over-network control (localhost only).
- A polished packaged Chrome Web Store extension (we load unpacked).
- Recording/replay, test-runner features, or a GUI dashboard.

## 3. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Use case | **AI agent control** | Open-ended tasks driven by Claude. |
| Controller | **MCP server (for Claude)** | Fits existing Claude Code / Claude Desktop setup. |
| Perception | **Hybrid** (accessibility snapshot + on-demand screenshot) | Token-efficient, but not blind to canvas/visual pages. |
| Action method | **Content-script first, `chrome.debugger` fallback** | No banner / fast by default; trusted input when a site needs it. |
| Channel | **WebSocket-out (Approach A), Node/TypeScript** | No OS setup, cross-platform, shared TS types, mature MCP SDK. |
| Tab targeting | **Active tab + tab-switching tools (option a)** | Matches how the user works; see §10 for the safety trade-off. |

## 4. Architecture / topology

```
┌──────────┐   MCP/stdio   ┌─────────────────┐   ws://127.0.0.1:<port>   ┌──────────────────────┐
│  Claude  │ ◄──────────► │   MCP Server    │ ◄──────────────────────► │  Chrome Extension    │
│ (client) │   tools       │   (Node/TS)     │   JSON req/resp + token   │  (your real profile) │
└──────────┘               │  hosts WS server│                           │  MV3 service worker  │
                           └─────────────────┘                           └──────────┬───────────┘
                                                                                     │ chrome.tabs / .scripting
                                                                                     │ chrome.debugger (CDP)
                                                                                     ▼
                                                                            ┌──────────────────┐
                                                                            │  Your open tabs  │
                                                                            └──────────────────┘
```

- Claude owns the long-lived **MCP server** (stdio transport). The server **hosts** the
  localhost WebSocket.
- The **extension is the WebSocket client** that dials *out* — this solves the "extensions
  can't open listening sockets" constraint and lets the server restart without reconfiguring
  the extension (the extension just reconnects).

## 5. Components

### 5.1 Chrome extension (MV3, loaded unpacked into the real profile)
- **Service worker** — WebSocket client; command router; per-tab `chrome.debugger` attach/detach;
  keepalive logic.
- **Content scripts** (injected on demand via `chrome.scripting.executeScript`) — build the
  accessibility snapshot + `ref → element` map; perform content-script actions
  (click/type/scroll/hover/select); resolve refs.
- **Options page** — stores the shared token + server port in `chrome.storage`.
- **Offscreen document** (Phase 5) — robust home for the WebSocket so MV3 service-worker culling
  cannot drop the connection; relays commands to the service worker.
- **Permissions:** `debugger`, `tabs`, `scripting`, `activeTab`, `alarms`, `storage`,
  `offscreen`, host permissions `<all_urls>`.

### 5.2 MCP server (Node/TypeScript)
- **WS host** — binds `127.0.0.1`, performs the token handshake, accepts a single extension
  connection, correlates request/response by `id`, enforces per-call timeouts.
- **Tool layer** — the MCP tools Claude sees (§7), each translating a tool call into a wire
  command and awaiting the response.
- **Shared types** — protocol message definitions imported by both halves.

## 6. Wire protocol (over WebSocket)

Request/response, correlated by `id`:

```jsonc
// server → extension
{ "id": "7", "method": "click", "params": { "ref": "e12" } }

// extension → server (success)
{ "id": "7", "result": { "ok": true } }

// extension → server (failure)
{ "id": "7", "error": { "message": "ref e12 not found; re-snapshot" } }
```

Connection handshake (first message from extension):

```jsonc
{ "type": "hello", "token": "<shared-secret>" }
```

The server rejects connections with a missing/invalid token and closes the socket.

## 7. MCP tool surface (what Claude gets)

| Tool | Purpose |
|---|---|
| `browser_navigate(url)` | Navigate the active tab. |
| `browser_snapshot()` | Accessibility snapshot of the active tab (refs + url/title). |
| `browser_screenshot(fullPage?)` | Viewport screenshot; full-page when requested. |
| `browser_click(ref)` | Click the element bound to `ref`. |
| `browser_type(ref, text, submit?)` | Type into `ref`; optionally submit. |
| `browser_press_key(key)` | Press a key (e.g., `Enter`, `Escape`). |
| `browser_scroll(ref?, direction?)` | Scroll to a ref or in a direction. |
| `browser_select_option(ref, values)` | Select dropdown option(s). |
| `browser_hover(ref)` | Hover an element. |
| `browser_wait_for(text?, seconds?)` | Wait for text to appear or for a duration. |
| `browser_back()` / `browser_forward()` | History navigation. |
| `browser_list_tabs()` | List open tabs (id, title, url, active flag). |
| `browser_select_tab(id)` | Make a tab active (the new control target). |
| `browser_new_tab(url?)` | Open a new tab and make it active. |
| `browser_close_tab(id)` | Close a tab. |

## 8. Perception model (hybrid)

- **`browser_snapshot`** — the content script walks the accessibility/DOM tree, emits a compact
  text outline with **stable refs**, and keeps an in-memory `ref → element` map. Each call
  refreshes the map. Example:

  ```
  url: https://example.com/login   title: "Sign in"
  - textbox "Email" [ref=e4]
  - textbox "Password" [ref=e5]
  - button "Sign in" [ref=e6]
  - link "Forgot password?" [ref=e7]
  ```

  Token-efficient; Claude acts by `ref` rather than coordinates.

- **`browser_screenshot`** — `chrome.tabs.captureVisibleTab` for the viewport (no banner);
  escalates to `chrome.debugger` `Page.captureScreenshot` for full-page capture. Used on demand
  for canvas/visual-heavy pages the snapshot can't represent.

## 9. Action model + fallback

Actions (`click`, `type`, `hover`, `select`, `scroll`) default to the **content-script path**:
resolve `ref → element`, `scrollIntoView`, perform the native interaction and dispatch the
appropriate input events. No banner, fast, works on the large majority of sites.

**Escalation to `chrome.debugger` trusted input** triggers when any of:
1. the tool is called with an explicit `trusted: true` hint, **or**
2. a content-script action is detected as ineffective (e.g., the element is guarded by
   `isTrusted` checks and nothing changed), **or**
3. the operation inherently needs it (drag, canvas interaction, native file pickers).

Escalation attaches the debugger to the target tab, computes element coordinates from its
bounding box, and dispatches real `Input.*` CDP events. This is the path that shows the
"an extension is debugging this browser" banner.

## 10. Tab targeting & safety

**Decision (option a):** the agent operates on the **currently active tab** of the
last-focused normal window, and can **list/switch/open/close tabs** via the tab tools.

**Safety trade-off (explicitly accepted):** because the agent drives whatever tab is active,
it could act on a sensitive tab (banking, email). The mitigations we rely on:
- The localhost-only WebSocket + shared token gate who can issue commands.
- The `chrome.debugger` banner is a visible "automation is active" signal when trusted input
  is in use.
- The extension is loaded unpacked and only runs when the user has it enabled.

A future optional **arm/disarm toggle** (require explicit enable before the agent can act) is
noted as a possible enhancement but is **out of scope** for the initial build.

## 11. MV3 keepalive

- **MVP:** persistent WebSocket held in the service worker + `chrome.alarms` (~25s) ping +
  exponential-backoff reconnect. Active command traffic keeps the service worker alive; alarms
  cover idle gaps; reconnect handles culling.
- **Phase 5 hardening:** move the WebSocket into an **offscreen document** (immune to
  service-worker culling), which relays commands to the service worker for the
  `chrome.tabs`/`chrome.debugger` work.

## 12. Security model

- WebSocket bound to **`127.0.0.1` only** + **shared-secret token**, configured in both the
  extension options page and the server config.
- This is load-bearing: anything that can reach the socket *with the token* can drive the
  logged-in browser. The token is treated as a secret (gitignored; not logged).
- The `chrome.debugger` banner doubles as a visible automation indicator.

## 13. Error handling

- Per-call timeouts on the server; tool calls return clear errors on timeout.
- "extension not connected — is Chrome open and the bridge enabled?" when no extension socket.
- Graceful handling of `chrome.debugger` attach failures (e.g., DevTools already open on the
  target tab → surface a clear message, don't hang).
- Auto-reconnect with backoff when the socket drops.
- Ref-not-found / stale-snapshot errors instruct Claude to re-`snapshot`.

## 14. Repository layout (npm workspaces)

```
chrome-remote-extention/
  extension/   manifest.json, sw.ts, content/{snapshot,actions}.ts, options.*, offscreen.* (ph5)
  server/      src/{index,ws,protocol}.ts, src/tools/*.ts
  shared/      protocol types (imported by both halves)
  docs/        specs/ and other documentation
```

## 15. Testing strategy

- **Server protocol/correlation:** unit tests with a mock WebSocket (id correlation, timeouts,
  token rejection).
- **Snapshot builder:** jsdom fixture DOMs → expected text outline + ref map.
- **Tool layer:** mock-extension responder asserting the wire messages each tool emits.
- **Manual E2E checklist:** load extension unpacked → run server → register MCP in Claude →
  drive a known test page (navigate, snapshot, click, type, switch tab).

## 16. Milestones (each independently demoable)

1. **Walking skeleton** — token handshake + `browser_navigate` round-trips
   Claude → server → extension → tab. Proves the channel + basic keepalive.
2. **Perception** — `browser_snapshot` + `browser_screenshot`.
3. **Actions** — click/type/scroll/select/hover + back/forward + tab tools (content-script path).
4. **Trusted input** — `chrome.debugger` escalation + full-page screenshot.
5. **Hardening** — offscreen keepalive, reconnection UX, options/security page, install docs.

## 17. Open questions & risks

- **`chrome.debugger` conflicts:** only one debugger client per tab; conflicts with manually
  opened DevTools. Surface clearly; consider auto-detach when idle.
- **MV3 service-worker culling edge cases:** validated/hardened in Milestone 5.
- **Snapshot fidelity on complex SPAs:** heuristic accessibility walk may miss custom widgets;
  screenshots are the fallback. May need iteration on the snapshot algorithm.
- **Coordinate accuracy for trusted input** under device-pixel-ratio / zoom — handle in
  Milestone 4.

## 18. Out of scope (explicit)

CDP-compatible protocol, Native Messaging host, network/remote control, Web Store packaging,
arm/disarm safety toggle, recording/replay, GUI dashboard.

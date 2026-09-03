# Setup & Usage

This bridge lets an MCP client (e.g. Claude) drive your **real, logged-in Chrome**
(default profile). It has two halves: a Node MCP server that hosts a localhost
WebSocket, and a Chrome extension (loaded into your real profile) that connects to it.

## Prerequisites

- Node.js 20+ and npm
- Google Chrome 116+

## 1. Build

```bash
npm install
npm run build
```
This produces `server/dist/index.js` and the extension bundles in `extension/dist/`.

## 2. Choose a shared token

Pick any random secret string (e.g. `openssl rand -hex 16`). The MCP server and the
extension must use the **same** token. Treat it like a password — anything that can
reach the WebSocket with this token can drive your logged-in browser.

## 3. Register the MCP server with your client

Add this to your MCP client config (Claude Desktop / Claude Code), substituting your
token and the absolute path to this repo:

```json
{
  "mcpServers": {
    "chrome-agent-bridge": {
      "command": "node",
      "args": ["C:/Users/aliev/Projects/chrome-remote-extention/server/dist/index.js"],
      "env": { "BRIDGE_TOKEN": "<your-token>", "BRIDGE_PORT": "9234" }
    }
  }
}
```

To try it without an MCP client, use the inspector:
```bash
# PowerShell
$env:BRIDGE_TOKEN="<your-token>"; npx @modelcontextprotocol/inspector node server/dist/index.js
```

## 4. Load the extension into your real profile

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Open the extension's **Options** (Details → Extension options, or the puzzle-piece menu).
5. Set **Port** = `9234` and **Token** = `<your-token>`, then **Save**.

Open the extension's **service worker** console (chrome://extensions → the extension →
"service worker"). You should see `[bridge] connection: up`.

## 5. Use it

With the MCP server running and the extension connected, call the tools from your client:

| Tool | What it does |
|---|---|
| `browser_navigate(url)` | Navigate the active tab |
| `browser_snapshot()` | Accessibility outline of the active tab with element refs |
| `browser_screenshot(fullPage?)` | Screenshot (viewport; full-page via CDP when `fullPage:true`) |
| `browser_click(ref, trusted?)` | Click a ref; `trusted:true` forces real CDP input (shows the debugging banner) |
| `browser_type(ref, text, submit?, trusted?)` | Type into a ref, optionally submit; `trusted:true` sends real CDP keystrokes (shows the debugging banner) |
| `browser_press_key(key, trusted?)` | Press a key on the focused element; `trusted:true` sends a real CDP keystroke (shows the debugging banner) |
| `browser_scroll(ref?, direction?)` | Scroll to a ref or up/down |
| `browser_hover(ref)` | Hover a ref |
| `browser_select_option(ref, values)` | Select option(s) in a `<select>` |
| `browser_back()` / `browser_forward()` | History navigation |
| `browser_wait_for(text?, seconds?)` | Wait until text appears on the active tab, or for N seconds |
| `browser_list_tabs()` | List open tabs |
| `browser_select_tab(id)` | Make a tab active (the new control target) |
| `browser_new_tab(url?)` / `browser_close_tab(id)` | Open / close tabs |

Typical loop: `browser_snapshot()` to see refs → act by ref (`browser_click`, `browser_type`)
→ snapshot again to see the result.

## The debugging banner

When trusted input is used (`browser_click`, `browser_type` or `browser_press_key` with
`trusted:true`, or full-page screenshots), Chrome shows an "an extension is debugging this
browser" banner on that tab. This is expected and clears when the action finishes. Default
clicks/typing use synthetic events and do **not** show the banner.

Reach for `trusted:true` when a site ignores synthetic input — some editors, canvas apps and
anti-automation checks test `event.isTrusted`. Trusted typing focuses the field and selects
its contents first, then replaces the selection with real keystrokes, so it overwrites rather
than appends; it never assigns `.value`.

## Security notes

- The WebSocket binds to `127.0.0.1` only and requires the shared token.
- The agent acts on whatever tab is **active** — it can touch sensitive tabs (banking,
  email). Be aware of what's focused when you let it run.

## Troubleshooting

- **MCP server "Failed to connect" in Claude Code:** usually a previous Claude session left an
  orphaned bridge server still holding the port. Check with (PowerShell)
  `Get-NetTCPConnection -LocalPort 9234 -State Listen`, then kill the stale `node …/server/dist/index.js`
  process (`Stop-Process -Id <pid> -Force`). The server now treats a busy port as non-fatal — it
  still connects to Claude Code and logs a `WARNING: could not bind the WebSocket …` to stderr — so
  the *MCP* connection won't crash, but **browser tools stay unavailable until the port is free**.
  Only run one Claude session driving the bridge at a time.
- **"Extension not connected"** from a tool: make sure Chrome is open, the extension is
  enabled, and the Options token/port match the server's `BRIDGE_TOKEN`/`BRIDGE_PORT`.
  Check the service-worker console for `connection: up`. (If the server logged the port-bind
  WARNING above, that's the real cause — free the port.)
- **A tool errors with "restricted URL"**: the active tab is a `chrome://` page, the New
  Tab page, or the Chrome Web Store, where extensions can't run. Switch to a normal page.
- **`chrome.debugger` attach fails**: another debugger (e.g. open DevTools) is attached to
  that tab. Close DevTools and retry.
- **Connection drops when idle**: the offscreen document should keep it alive; if it still
  drops, reload the extension from `chrome://extensions`.
- **"ref … is outside the viewport after scrolling"**: a `trusted:true` action could not bring
  the element on screen (a fixed overlay, a scroll container that will not move, or a viewport
  too small for it). CDP dispatches at absolute viewport coordinates and does not clamp, so
  rather than click nothing the bridge reports this. Close the overlay, scroll manually, or use
  the default (non-trusted) action, which targets the element directly and needs no coordinates.
  Note that page zoom and HiDPI scaling need no correction — coordinates are CSS pixels and
  Chrome accounts for both.

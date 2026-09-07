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
      "args": ["<absolute-path-to-repo>/server/dist/index.js"],
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
| `browser_status()` | Diagnose the bridge: WebSocket host listening? extension connected? active tab. Call it first when other tools fail |
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
| `browser_evaluate(expression, timeoutMs?)` | Run JavaScript in the active tab’s page context and return the result (shows the debugging banner) |
| `browser_network_requests(tab?, filter?, types?, failedOnly?, limit?, includeHeaders?, id?)` | List the network requests the tab has made — method, status, type, duration, size, URL — captured continuously with no banner; `id` shows one request's headers and body summary |
| `browser_network_clear(tab?)` | Forget the recorded network requests, so the next `browser_network_requests` shows only what your next action caused |

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

## Running JavaScript

`browser_evaluate(expression, timeoutMs?)` runs an expression in the active tab's **page context**,
the same as typing it into the DevTools console: it sees the page's own globals, cookies and
`localStorage`, and it is **not** limited by the page's `script-src` CSP (it goes through CDP, not
`eval`).

**What comes back.** The value of the last expression, shaped for reading:

- plain data → pretty JSON you can reuse; `Map`/`Set`/`Date`/`RegExp`/`BigInt` get readable forms;
- a DOM node → a short description (`<button id="counter"> "Click counter: 0"`) plus a hint to use
  `browser_snapshot` refs to act on it — nodes are never returned as handles;
- a function → its source head; an `Error` (or a rejected promise) → a tool error with the message
  and a trimmed stack;
- cycles become `[Circular]`, and nested `undefined`/functions stay visible as `"undefined"` /
  `"[Function: name]"` rather than being dropped by JSON.

**Limits.** Depth 6, 100 items per array/object, 5 000 characters per string *nested inside* a
serialised object, and 20 000 characters of output in total. When anything is cut the output ends
with `(output truncated — …)`. Note that `maxString` (5 000) applies only to strings inside an
object: a **top-level** string is a primitive that never reaches the in-page serialiser, so it is
capped by the 20 000-character total instead.

**`return` and `await`.** Top-level `await` works, and so does a multi-statement script whose last
expression is the value (`const a = 1; a + 1` → `2`). A bare `return` is also accepted: the bridge
wraps the code in an async function when it spots a `return` keyword. That is a regex heuristic, not
a parser — a false positive only costs you the completion-value behaviour.

**Errors.** Thrown exceptions and rejected promises arrive as tool errors with the message and
stack. A syntax error arrives as a plain `SyntaxError: …` with **no** line/column information (under
`replMode` Chrome reports it as an exception object, not a compile-time position).

**Timeouts.** `timeoutMs` defaults to 10 000 and is clamped to 100…60 000; the server waits 5 s
longer, so a long evaluate is not cut short by the bridge's own call timeout. On expiry the debugger
detaches and you get `Timed out after Ns …` — but **work the page already started keeps running**
(a `fetch` in flight is not cancelled).

**The banner.** Every call attaches `chrome.debugger`, so Chrome shows the "an extension is debugging
this browser" banner for the duration, exactly like `trusted:true` input.

**`userGesture`.** The expression runs with transient user activation, so popups, autoplay and other
gesture-gated APIs work — but activation is **not window focus**. Anything gated on
`document.hasFocus()`, notably `navigator.clipboard.writeText`, still fails with `NotAllowedError`
while the Chrome window is in the background, which is the normal state while an agent drives it.
Focus the window (e.g. `browser_select_tab`) if you need those.

**It reads the DOM, not the accessibility tree.** `document.querySelectorAll("button")` lists hidden
and `aria-hidden` elements that `browser_snapshot` deliberately prunes. Useful, but don't treat the
two as the same view of the page.

## Security notes

- The WebSocket binds to `127.0.0.1` only and requires the shared token.
- The agent acts on whatever tab is **active** — it can touch sensitive tabs (banking,
  email). Be aware of what's focused when you let it run.
- **`browser_evaluate` is the sharpest tool here.** It runs with the full authority of the
  logged-in page, plus a user gesture — anything you could do in that tab's DevTools console the
  agent can do: read tokens out of `localStorage`, call authenticated APIs with the page's cookies,
  submit forms, open popups, write the clipboard. The localhost bind and the shared token remain the
  only boundary; there is no per-domain allow-list yet (an arm/disarm toggle is on the roadmap).
  Neither the expression nor its result is ever logged — the service worker records only the
  expression's length.

## Troubleshooting

- **Start with `browser_status`.** It tells you which half is broken: the WebSocket host (port
  busy), the extension (not connected), or neither (then look at the active tab it reports).
- **"WebSocket port 9234 is busy (EADDRINUSE)"** from `browser_status` or any tool: a previous
  Claude session left an orphaned bridge server holding the port. Find it with (PowerShell)
  `Get-NetTCPConnection -LocalPort 9234 -State Listen` and kill the stale `node …/server/dist/index.js`
  process (`Stop-Process -Id <pid> -Force`). Nothing else to do: the server retries the bind every
  5 s and the extension reconnects on its own, so tools start working within ~15 s of the port
  freeing up. The MCP connection itself never crashes on a busy port. Only run one Claude session
  driving the bridge at a time.
- **"Extension not connected"** from a tool: make sure Chrome is open, the extension is
  enabled, and the Options token/port match the server's `BRIDGE_TOKEN`/`BRIDGE_PORT`.
  Check the service-worker console for `connection: up`.
- **Chrome was killed / crashed while connected**: the server pings the extension every 30 s and
  drops a socket that misses a pong, so within ~60 s tools report "not connected" instead of
  timing out for 30 s each. Relaunch Chrome and it reconnects by itself.
- **A tool errors with "restricted URL"**: the active tab is a `chrome://` page, the New
  Tab page, or the Chrome Web Store, where extensions can't run. Switch to a normal page.
- **"Chrome DevTools (or another extension) is already attached to this tab"**: Chrome allows
  one debugger per tab, and DevTools wins. Close DevTools on that tab and retry the trusted action.
- **"The debugging session was cancelled mid-action"**: someone clicked **Cancel** on the
  "is debugging this browser" banner while a trusted action was running (the service-worker console
  logs `debugger detached … canceled_by_user`). Just retry.
- **Connection drops when idle**: the offscreen document should keep it alive; if it still
  drops, reload the extension from `chrome://extensions`.
- **"ref … is outside the viewport after scrolling"**: a `trusted:true` action could not bring
  the element on screen (a fixed overlay, a scroll container that will not move, or a viewport
  too small for it). CDP dispatches at absolute viewport coordinates and does not clamp, so
  rather than click nothing the bridge reports this. Close the overlay, scroll manually, or use
  the default (non-trusted) action, which targets the element directly and needs no coordinates.
  Note that page zoom and HiDPI scaling need no correction — coordinates are CSS pixels and
  Chrome accounts for both.

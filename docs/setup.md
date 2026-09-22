# Setup & Usage

This bridge lets an MCP client (e.g. Claude) drive your **real, logged-in Chrome or Safari**
profile. It has two halves: a Node MCP server that hosts a localhost WebSocket, and a browser
extension loaded into your real profile that connects to it.

## Prerequisites

- Node.js 20+ and npm
- Google Chrome 116+, or macOS Safari 17+ with Xcode

## 1. Build

```bash
npm install
npm run build
```
This produces `server/dist/index.js`, the Chrome bundles in `extension/dist/`, and a standalone
Safari Web Extension bundle in `extension/dist/safari/`.

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

## 4A. Chrome: load the extension into your real profile

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Open the extension's **Options** (Details → Extension options, or the puzzle-piece menu).
5. Set **Port** = `9234` and **Token** = `<your-token>`, then **Save**.

Open the extension's **service worker** console (chrome://extensions → the extension →
"service worker"). You should see `[bridge] connection: up`.

## Safari (macOS)

Safari extensions are installed through a containing macOS app. Generate the local Xcode project:

```bash
npm run package:safari
```

This builds `extension/dist/safari/` and creates the ignored `safari-app/` directory. Open the
generated Xcode project, leave both targets on **Sign to Run Locally** (an Apple Developer account
is not required), choose the **Safari Agent Bridge** macOS scheme, and Run. Then:

1. In Safari, open **Settings → Extensions** and enable **Safari Agent Bridge**.
2. Grant it access to **All Websites**. Safari 17+ requires this explicit website-access grant.
3. Open the extension's Options page, set port `9234` and the same token used by the MCP server,
   then Save.
4. Keep Safari running. `browser_status()` should report `Extension: connected`.

The generated Xcode project copies the built resources, so rerun `npm run package:safari` after
moving or deleting an older `safari-app/` directory when you need a fresh package.

Safari uses a persistent Manifest V2 background page because WebKit does not yet provide the
offscreen document used by the Chrome MV3 build. The shared handlers use the standard `browser.*`
API, while Chrome continues to use `chrome.*` through the same compatibility layer.

### Safari limitations

- `trusted:true` click/type/key input is unavailable: Safari Web Extensions expose no equivalent to
  `chrome.debugger`. Use the default DOM-event path.
- `browser_screenshot({fullPage:true})` is unavailable; viewport screenshots work.
- `browser_evaluate` uses Safari's MAIN-world script injection. Common expressions, statement-list
  completion values, top-level-await expressions, return values, and structured serialization work,
  but a strict page Content Security Policy may block dynamic evaluation. Unlike Chrome, Safari
  cannot terminate a synchronously stuck script through CDP.
- Safari may expose a somewhat different set of `webRequest` fields. Sensitive headers, including
  Cookie and Set-Cookie if Safari supplies them, are redacted at ingest.

## 5. Use it

With the MCP server running and the extension connected, call the tools from your client:

| Tool | What it does |
|---|---|
| `browser_status()` | Diagnose the bridge: WebSocket host listening? extension connected? active tab. Call it first when other tools fail |
| `browser_navigate(url)` | Navigate the active tab |
| `browser_snapshot()` | Accessibility outline of the active tab with element refs |
| `browser_screenshot(fullPage?)` | Screenshot; `fullPage:true` is Chrome-only |
| `browser_click(ref, trusted?)` | Click a ref; `trusted:true` is Chrome-only CDP input |
| `browser_type(ref, text, submit?, trusted?)` | Type into a ref, optionally submit; `trusted:true` is Chrome-only CDP input |
| `browser_press_key(key, trusted?)` | Press a key; `trusted:true` is Chrome-only CDP input |
| `browser_scroll(ref?, direction?)` | Scroll to a ref or up/down |
| `browser_hover(ref)` | Hover a ref |
| `browser_select_option(ref, values)` | Select option(s) in a `<select>` |
| `browser_back()` / `browser_forward()` | History navigation |
| `browser_wait_for(text?, seconds?, networkIdle?, idleMs?)` | Wait until text appears on the active tab, for N seconds, or — with `networkIdle:true` — until the tab has made no network request for `idleMs` (default 500, max 10 s wait) |
| `browser_list_tabs()` | List open tabs |
| `browser_select_tab(id)` | Make a tab active (the new control target) |
| `browser_new_tab(url?)` / `browser_close_tab(id)` | Open / close tabs |
| `browser_evaluate(expression, timeoutMs?)` | Run JavaScript in the active tab’s page context and return the result |
| `browser_network_requests(tab?, filter?, types?, failedOnly?, limit?, includeHeaders?, id?)` | List the network requests the tab has made — method, status, type, duration, size, URL — captured continuously with no banner; `id` shows one request's headers and body summary |
| `browser_network_clear(tab?)` | Forget the recorded network requests, so the next `browser_network_requests` shows only what your next action caused |

Typical loop: `browser_snapshot()` to see refs → act by ref (`browser_click`, `browser_type`)
→ snapshot again to see the result.

## The Chrome debugging banner

When trusted input is used (`browser_click`, `browser_type` or `browser_press_key` with
`trusted:true`, or full-page screenshots), Chrome shows an "an extension is debugging this
browser" banner on that tab. This is expected and clears when the action finishes. Default
clicks/typing use synthetic events and do **not** show the banner.

Reach for `trusted:true` when a site ignores synthetic input — some editors, canvas apps and
anti-automation checks test `event.isTrusted`. Trusted typing focuses the field and selects
its contents first, then replaces the selection with real keystrokes, so it overwrites rather
than appends; it never assigns `.value`.

## Running JavaScript

On Chrome, `browser_evaluate(expression, timeoutMs?)` runs an expression in the active tab's **page context**,
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

Safari uses the MAIN-world scripting fallback described in [Safari limitations](#safari-limitations),
so it shows no debugger banner and does not have all of CDP's console semantics.

**`userGesture`.** The expression runs with transient user activation, so popups, autoplay and other
gesture-gated APIs work — but activation is **not window focus**. Anything gated on
`document.hasFocus()`, notably `navigator.clipboard.writeText`, still fails with `NotAllowedError`
while the Chrome window is in the background, which is the normal state while an agent drives it.
Focus the window (e.g. `browser_select_tab`) if you need those.

**It reads the DOM, not the accessibility tree.** `document.querySelectorAll("button")` lists hidden
and `aria-hidden` elements that `browser_snapshot` deliberately prunes. Useful, but don't treat the
two as the same view of the page.

## Inspecting network requests

`browser_network_requests()` lists what the tab has been talking to. Capture is **always on** and
banner-free — the extension observes `chrome.webRequest`, so there is no `chrome.debugger` attach and
no "extension is debugging this browser" banner — and it behaves like the DevTools Network panel with
**Preserve log** ticked: the log is per **tab** and a navigation does *not* clear it.

**What a line shows.** One line per request, oldest first, newest 50 by default:

```
Network — active tab: showing 3 of 212 (recording since 3m12s ago; 1 pending)
[3893]  2.8s ago   GET     200  document    5ms  12.9 KB  http://localhost:8080/e2e-playground.html
[3894]  2.8s ago   GET     200  xhr         3ms  28 B     http://localhost:8080/ok.json
[3899]  2.8s ago   GET     ERR  xhr         2.0s  —       http://127.0.0.1:9999/  net::ERR_CONNECTION_REFUSED
Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.
```

Id, age, method, status (`ERR` for a network failure, `···` while pending), resource type, duration,
size (`content-length` when the server sent one) and the URL, with the `net::ERR_*` or a redirect's
`→ <target>` after it. A redirect chain is one line per hop: `3900`, then `3900:2`.

**The workflow that answers "what did my click do":** `browser_network_clear()` → act →
`browser_network_requests()`. Clearing the active tab does not reset `recording since`; only
`browser_network_clear({tab:"all"})` does.

**Waiting for the tab to go quiet.** `browser_wait_for({networkIdle: true})` returns once the active
tab has made no request for `idleMs` (default 500, `100`…`10000`), giving up after 10 s. It reads the
same log, so it is *activity*-based, not pending-based: a long poll, an EventSource or a request to a
black-hole address stays pending for its whole life and does **not** block it. A tab the log has
recorded nothing for — including right after the extension's service worker restarts, since the
last-activity timestamp is in memory only — counts as idle and returns immediately.

**Narrowing.** `filter` matches the URL as a case-insensitive substring, or as a regex when you wrap
it in slashes (`"/ok\\.json|nope/"`, flags allowed: `"/OK/i"`). `types` keeps the resource types you
name and accepts the DevTools aliases (`xhr`/`fetch` → `xmlhttprequest`, `document` → `main_frame`,
`frame` → `sub_frame`). `failedOnly` keeps network errors and status ≥ 400. `limit` is clamped to
1…500. `tab` takes a tab id from `browser_list_tabs`, or `"all"` (which adds a `tab:<id>` column).

**One request in full.** `browser_network_requests({id: "3894"})` prints that request's headers and
request-body summary:

```
[3894] GET http://localhost:8080/ok.json
type: xhr   initiator: http://localhost:8080   started 5.8s ago   took 3ms
status: 200 OK   from cache: no   ip: ::1   size: 28 B
request headers:
  accept: */*
response headers:
  content-type: application/json
```

This is the **only** way to see headers: `includeHeaders` keeps them on the structured result, but
the text the tool prints is the table, which has no header columns. Ids are the browser's request ids and
are only unique **within a capture session** — if the extension's service worker restarts, the
counter can start low again, so an id from an older listing may fail to resolve or (rarely) point at
a different request. Look the id up soon after the listing that gave it to you.

**What is not available.** Response bodies (re-fetch with `browser_evaluate` if you need one),
request bodies beyond a ≤ 2 KB redacted summary, WebSocket frames, transfer size and the timing
breakdown (DNS/TLS/TTFB). Also note:

- A network-level status is not the same as a successful `fetch()`. An opaque `no-cors` response is a
  perfectly good 200 here while the page can read nothing from it, and a 200 whose JSON the page then
  rejects still logs as 200. Conversely, a CORS-blocked `fetch` shows up as `net::ERR_FAILED` on
  current Chrome, not as the response the server actually sent.
- Requests a site's own service worker makes are not attributable to a tab; they land in a `tabId -1`
  bucket, visible only with `tab:"all"`.
- Streams (EventSource, long polls) stay `pending` for their whole life; the header's `N pending`
  counts only requests started in the last 30 s.
- `data:` / `blob:` URLs never touch the network and never appear.

**Bounds.** 500 entries per tab and 2 000 in total; when the total cap is hit the oldest entry of the
*largest* tab is evicted, so one chatty background tab cannot push the tab you care about out of the
log. Closing a tab forgets its entries. The log lives in the extension's session storage and is gone
when the browser exits or the extension is reloaded.

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
- **Network capture records URLs, and URLs carry secrets.** `browser_network_requests` keeps the
  **whole query string** — that is what makes it useful for debugging an API — so an
  `?access_token=…` in a URL will reach the model, the same way `browser_evaluate` can read
  `localStorage`. Clear the log (`browser_network_clear({tab:"all"})`) after working on a sensitive
  tab if that matters to you.
- **On Chrome, cookies never enter the extension.** The `webRequest` listeners deliberately omit
  `extraHeaders`, so Chrome does not hand over `Cookie` / `Set-Cookie` at all. Safari's exact fields
  can differ; `cookie` and `set-cookie` are therefore also in the ingest-time redaction list.
  In both browsers, `authorization`, `x-api-key`, `x-csrf-token` and any header whose name contains
  `token`, `secret` or `session` are replaced with `<redacted>` **at ingest**, so only the redacted
  form is ever stored; form fields named like `password`, `token`, `secret`, `otp` or `code` are
  redacted in the request-body summary the same way. Headers and bodies are returned only when you
  ask for them (`includeHeaders`, or an `id` lookup).
- **Nothing network-related is logged.** The service-worker console prints entry *counts* only —
  never a URL, a header value or a body — and the server writes nothing about network entries to
  stderr.

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
- **"Extension not connected"** from a tool: make sure Chrome or Safari is open, the extension is
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

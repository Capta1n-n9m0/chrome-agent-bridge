# Setup & Usage

This bridge lets an MCP client (e.g. Claude) drive your **real, logged-in Chrome**
(default profile). It has three parts: a Node **daemon** that hosts a localhost WebSocket,
a Chrome extension (loaded into your real profile) that connects to it, and the MCP server
your client runs, which connects to the daemon as one of its clients.

## Prerequisites

- Node.js 20+ and npm
- Google Chrome 116+

## 1. Build

```bash
npm install
npm run build
```
This produces `mcp/dist/index.js` (the MCP server), `daemon/dist/index.js` (the daemon) and the
extension bundles in `extension/dist/`.

**End every pre-Step-6 session first.** A Claude session started before this version runs the old
bridge server, which holds port 9234 itself. While one is open the new MCP cannot connect: its tools
say a pre-Step-6 bridge server holds the port. End that session (or restart Claude Code) once.

## 2. Choose a shared token

Pick any random secret string (e.g. `openssl rand -hex 16`). The daemon, every client and the
extension must use the **same** token. Treat it like a password — anything that can
reach the WebSocket with this token can drive your logged-in browser.

Clients find the token in this order: the `BRIDGE_TOKEN` environment variable wins; without it, the
file `bridge.token` at the repo root (gitignored — never commit it). The repo root is the first
directory above the code whose `package.json` has `"workspaces"`; leading and trailing whitespace in
the file is ignored. With a `bridge.token` in place, scripts need no environment variable and the
MCP config's `BRIDGE_TOKEN` is optional. The daemon a client starts gets that client's token and port.

Every client must also use the **same** `BRIDGE_PORT` (default `9234`), the port set in the
extension's Options. A client on another port starts a second daemon there, which the extension
never reaches; that client then fails with `Extension not connected — …`.

## 3. Register the MCP server with your client

Add this to your MCP client config (Claude Desktop / Claude Code), substituting your
token and the absolute path to this repo:

```json
{
  "mcpServers": {
    "chrome-agent-bridge": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/mcp/dist/index.js"],
      "env": { "BRIDGE_TOKEN": "<your-token>", "BRIDGE_PORT": "9234" }
    }
  }
}
```

### Upgrading a machine that ran the bridge before Step 6

Step 6 (2026-10-22) moved the MCP entry from `server/dist/index.js` to `mcp/dist/index.js`. The old
path no longer exists, and the build does not touch your client config, so do this once on every
machine that used the bridge before:

1. **End every Claude session that uses the bridge.** A pre-Step-6 server still holding port 9234
   takes a new client's hello as the extension and breaks that old session; a new client gives up
   after 2 s with a `VERSION` error naming this cause.
2. **Update and build:** `git pull`, then `npm install` (it relinks the five workspaces) and
   `npm run build`. Check that `mcp/dist/index.js` and `daemon/dist/index.js` exist.
3. **Point the MCP config at the new entry.** In Claude Code the user-level entry lives under
   `mcpServers` in `~/.claude.json` (on Windows `%USERPROFILE%\.claude.json`); a project-level one
   lives in the repo's `.mcp.json`. Change only the path in `args`:
   `<absolute-path-to-repo>/server/dist/index.js` → `<absolute-path-to-repo>/mcp/dist/index.js`.
   Leave `env` as it is: `BRIDGE_TOKEN` there still wins over a `bridge.token` file. Instead of
   editing the file you can re-register the server with the CLI:
   ```bash
   claude mcp remove chrome-agent-bridge -s user
   claude mcp add chrome-agent-bridge -s user -e BRIDGE_TOKEN=<your-token> -e BRIDGE_PORT=9234 -- node <absolute-path-to-repo>/mcp/dist/index.js
   ```
   For Claude Desktop, edit `claude_desktop_config.json` the same way.
4. **Reconnect:** run `/mcp` in Claude Code (or start a new session).
5. **Check:** `browser_status` now starts with `Daemon: connected on 127.0.0.1:9234 (build …)` and
   lists this session as `claude-code #<pid>` under `Clients`. The extension needs **no** reload:
   it is unchanged in Step 6. *Corrected 2026-10-23 (Step 7 propagator): that holds only for Step 6.
   Step 7 changed the extension, so after upgrading past Step 7, reload it (§4). An unreloaded
   extension gets every tab call refused with `VERSION` and a reload hint (decisions.md · 2026-10-22 ·
   A stale extension is refused for tab calls, detected by its hello).*

Every client on a machine must use the same `BRIDGE_PORT`; see [The daemon](#the-daemon).

You do not start the daemon yourself. The first client to connect (usually this MCP server)
starts it in the background; later clients join it. It **outlives the Claude session on purpose**,
so the next session and any script reuse it, and it exits on its own after 10 minutes with no
clients. Its log is `~/.chrome-agent-bridge/daemon.log`. See [The daemon](#the-daemon) below.

To try it without an MCP client, use the inspector:
```bash
# PowerShell
$env:BRIDGE_TOKEN="<your-token>"; npx @modelcontextprotocol/inspector node mcp/dist/index.js
```

## 4. Load the extension into your real profile

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Open the extension's **Options** (Details → Extension options, or the puzzle-piece menu).
5. Set **Port** = `9234` and **Token** = `<your-token>`, then **Save**.

Open the extension's **service worker** console (chrome://extensions → the extension →
"service worker"). You should see `[bridge] connection: up`.

**After rebuilding the extension** (`npm run build`), Chrome keeps running the old code until the
extension is reloaded (chrome://extensions → ↻ on the Chrome Agent Bridge card). On Windows,
`powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1` does that by UI
automation in a window of its own and verifies it; see `docs/e2e-test-plan.md` §1 item 9.

## 5. Use it

With the daemon running and the extension connected, call the 22 tools from your client. Every tool
marked *tab* also takes an optional `tab` argument — see [Tabs](#tabs) below; without it the tool
acts on **this session's tab**.

| Tool | What it does |
|---|---|
| `browser_status()` | Diagnose the bridge: daemon connected (build, clients by name)? extension connected? the human's active tab, by handle. Call it first when other tools fail |
| `browser_navigate(url)` *tab* | Navigate the tab |
| `browser_snapshot()` *tab* | Accessibility outline of the tab with element refs |
| `browser_screenshot(fullPage?)` *tab* | Screenshot (viewport; full-page via CDP when `fullPage:true`). A viewport shot of a background tab shows that tab for about 1.5 s, then puts your tab back — see [Screenshots](#screenshots) |
| `browser_click(ref, trusted?)` *tab* | Click a ref; `trusted:true` forces real CDP input (shows the debugging banner) |
| `browser_type(ref, text, submit?, trusted?)` *tab* | Type into a ref, optionally submit; `trusted:true` sends real CDP keystrokes (shows the debugging banner) |
| `browser_press_key(key, trusted?)` *tab* | Press a key on the focused element; `trusted:true` sends a real CDP keystroke (shows the debugging banner) |
| `browser_scroll(ref?, direction?)` *tab* | Scroll to a ref or up/down |
| `browser_hover(ref)` *tab* | Hover a ref |
| `browser_select_option(ref, values)` *tab* | Select option(s) in a `<select>` |
| `browser_back()` / `browser_forward()` *tab* | History navigation |
| `browser_wait_for(text?, seconds?, networkIdle?, idleMs?)` *tab* | Wait until text appears on the tab, for N seconds, or — with `networkIdle:true` — until the tab has made no network request for `idleMs` (default 500, max 10 s wait) |
| `browser_list_tabs()` | List open tabs: handle, `*` on the human's active tab, the holding actor, title — URL |
| `browser_select_tab(tab)` | Make `tab` this session's tab: claims it, **without** bringing it on screen |
| `browser_focus_tab()` *tab* | Bring the tab on screen and focus its window — the only tool that changes what you see |
| `browser_new_tab(url?)` / `browser_close_tab(tab)` | Open a tab (it becomes active and this session's tab) / close a tab by handle |
| `browser_evaluate(expression, timeoutMs?)` *tab* | Run JavaScript in the tab's page context and return the result (shows the debugging banner) |
| `browser_network_requests(tab?, filter?, types?, failedOnly?, limit?, includeHeaders?, id?)` | List the network requests the tab has made — method, status, type, duration, size, URL — captured continuously with no banner; `id` shows one request's headers and body summary |
| `browser_network_clear(tab?)` | Forget the recorded network requests, so the next `browser_network_requests` shows only what your next action caused |
| `browser_download(url, path, overwrite?, timeoutMs?)` | Save a URL to disk with the profile's cookies (fetched by the extension's service worker: no CORS, cross-origin redirects followed). `path` is absolute — a file, or a directory to use the response's filename. Reports size, type and sha256 |

*Superseded 2026-10-22: was 21 tools that all acted on "the active tab", with `browser_select_tab(id)`
making a tab active and `browser_new_tab`/`browser_close_tab` reporting Chrome tab ids, because Step 7
T4 gave every tab-touching tool a `tab` argument, ids became handles, `browser_select_tab` claims
without showing and `browser_focus_tab` is new.*

Typical loop: `browser_snapshot()` to see refs → act by ref (`browser_click`, `browser_type`)
→ snapshot again to see the result.

### Tabs

Several clients can share the bridge — Claude sessions and scripts — each on its own tab. Tabs are
named by **handles** (`T1`, `T2`, …) that the daemon hands out; `browser_list_tabs` shows them:

```
T1  Inbox — https://mail.example/
T3* [claude-code #4412] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html
T4  [export-grades.ts] Export — http://localhost:8080/export
```

`*` marks the tab you (the human) are looking at: the active tab of the last-focused normal Chrome
window. `[name]` is the actor that holds the tab; a Claude session is `claude-code #<pid>`, where
`<pid>` is its MCP server's process id.

- **This session's tab.** A tool called without `tab` acts on this session's tab. The first such call
  claims the tab you are looking at and keeps it: switching tabs in Chrome afterwards does not move it.
  `browser_select_tab({tab})` and `browser_new_tab()` move it; passing `tab` to one call does not.
- **`tab`** takes a handle from `browser_list_tabs`. A tab held by another actor is refused, with the
  holder's name: `tab T3 is held by "export-grades.ts" since 12:01:33 — use browser_new_tab, or
  browser_list_tabs to pick a free tab`. A closed tab gives `tab T3 was closed — call listTabs to pick
  another tab`; this session's tab is then not replaced silently — pick another one.
- **`browser_select_tab({tab})`** claims the tab for this session and makes it this session's tab. It
  does **not** bring it on screen: the human's view stays as it is. `browser_focus_tab()` brings this
  session's tab (or `tab`) on screen and focuses its window. Both need `tab` to be free or yours.
- **A daemon restart** (a new build, or the daemon was stopped) renumbers the handles. The next call
  without `tab` claims the tab you are looking at again, and its result starts with one line:
  `Note: the bridge daemon restarted, so this session's tab was lost; it now holds T2 (the active tab).`
  An old handle passed as `tab` gets `unknown tab handle T9 — call listTabs`.
- **The network tools** keep two extra values for `tab`: `"all"` (every tab) and `"active"` (the same
  as leaving it out: this session's tab).

### Owners (leases)

Each tab has at most one owner, the actor named in `[name]`. An actor owns a tab it opened
(`browser_new_tab`, or `newTab` from a script), a tab it claimed (its first untargeted call, or
`browser_select_tab`), and a tab that a page in one of its tabs opened itself (a `target=_blank`
link or a popup — "click Export, a new tab appears" lands with the clicker; a script gets a
`leaseGranted` event for it). A tab you open yourself is unowned until someone claims it.

- Any call on a tab another actor owns fails at once with `TAB_HELD` and the owner's name; nobody
  waits for a tab. Reading the network log is the exception: `browser_network_requests` works on any
  tab, while `browser_network_clear` on another actor's tab — or `{tab:"all"}` while anyone else owns a
  tab — is refused.
- An owner keeps its tabs until its connection ends: ending a Claude session or a script frees them.
  A script can also give one up (`tabs.release`).
- A closed tab's handle answers `tab T3 was closed …` for an hour; a Chrome Memory-Saver discard does
  not lose the handle (Chrome gives the tab a new id, the daemon follows it), but calls into the
  discarded page fail until `browser_focus_tab` or `browser_navigate` reloads it.

### What you see while actors work

- **Nothing moves on its own.** Actors work in background tabs. A script's `newTab` opens its tab in
  the background; Claude's `browser_new_tab` opens it in front (the tab you then look at). No call
  brings a Chrome window to the front except `browser_focus_tab` (a script's `focusTab`).
- **A viewport screenshot of a background tab flashes it.** The bridge switches the tab's window to
  it, captures, and switches back: your tab is hidden for about 1.5 s (measured 1.49–1.59 s, Step 7
  Runs 8 and 9). The window is not brought to the front (the foreground window stayed the same in Run 9). If you
  switch tabs in that window during the flash, the bridge leaves your choice alone instead of
  switching back (barring a race of a few milliseconds).
  Screenshots from several actors take turns, one at a time.
- **Trusted input needs the tab in front.** `trusted:true` on a background tab returns `Clicked …` /
  `Typed …` but the page receives nothing (measured in Step 7, also with Chrome's anti-throttling
  flags). Call `browser_focus_tab` first, or use the default synthetic input. The same holds for
  anything that needs window focus, such as a clipboard write in `browser_evaluate`.

### Screenshots

- **Default (`switch`) mode**, the only one `browser_screenshot` uses for the viewport: the flash
  above, no banner. A minimized window is refused with `WINDOW_MINIMIZED`: restore the window and retry. (The
  message still suggests `mode:"cdp"`, which refuses a minimized window too; Step 8 rewrites it.) A window entirely covered by other windows cannot be captured: the call times
  out after 35 s, and the bridge puts your tab back after about 30 s.
- **`fullPage:true`** goes through CDP (`chrome.debugger`): the debugging banner shows while it runs.
- **`mode:"cdp"`** (scripts only: `client.call("screenshot", {tab, mode: "cdp"})`) captures through
  CDP without switching tabs, with the banner. It works only on a tab that is already in front of a
  window that is not minimized: a background tab is refused with `OFFSCREEN` and a minimized window
  with `WINDOW_MINIMIZED`, at once, because Chrome never returns a CDP capture of a hidden tab.

## The daemon

One daemon per machine holds the extension's socket; every Claude session and every script is a
client of it. It runs `node <repo>/daemon/dist/index.js`, listens on `127.0.0.1` only, and has no
console window or output — the log is its only voice.

**The log.** `~/.chrome-agent-bridge/daemon.log`, one line per event, `YYYY-MM-DDTHH:MM:SSZ <message>`
in UTC: `start pid=…`, `config pid=… port=… idleMs=… build=…`, `listening on 127.0.0.1:9234`,
`client + "claude-code #1234" (1 client)`, `client - …`, and `exit <code> (<why>) …` with counts. It
holds counts, ids and names only; a line that would contain a URL or the token is replaced by
`[line withheld: contained a URL or the token]`. On start the file is cut back to its last 1 MiB.

**Which build is running.** The build id is the sha256 of `daemon/dist/index.js`. `browser_status`
prints it on its first line (`Daemon: connected on 127.0.0.1:9234 (build <sha256>, up <s>s)`), the
log prints it in the `config` line, and an SDK script gets it from `client.status()` (`daemon.status`).
Compare it with `sha256sum daemon/dist/index.js`, or `Get-FileHash daemon\dist\index.js` in
PowerShell (which prints the same hex in upper case). After `npm run build` changes that file, the
next client to connect asks the old daemon to step down (`daemon.shutdown`), starts the new one, and
the other clients reconnect to it on their own. A `/mcp` reconnect counts as a new client.

**Stopping it by hand.** There is no stop command. The daemon exits by itself after
`BRIDGE_DAEMON_IDLE_MS` (default `600000`, 10 minutes) with no clients — Chrome's extension does not
count as a client. To stop it sooner, stop its process:

```powershell
# Windows (PowerShell): the process listening on the bridge port
Get-NetTCPConnection -LocalPort 9234 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess }
```
```bash
# Linux / macOS: the node process running the daemon file
pkill -f daemon/dist/index.js
```

The PowerShell line does nothing when no daemon is listening. The `pkill` pattern matches the
default daemon file; a daemon started from a `BRIDGE_DAEMON` path (below) needs that path instead.

An open Claude session's MCP starts a new daemon 5 s after the connection drops; a running script
gets an error instead. End the sessions (and any script that would call `connect()` again) first if you want it to stay stopped. The daemon also answers a `daemon.shutdown` request (reply `{ok:true}`, then
it closes every client with code 4002 and exits 0); that is how a newer build replaces an older one,
and connected clients treat 4002 as "reconnect", so it is not a stop button either.

**Development override.** `BRIDGE_DAEMON` points clients at a different daemon file instead of
`<repo>/daemon/dist/index.js`. On Windows give a native path (`C:\…\index.js`): Node reads a Git Bash
path such as `/c/Users/…` as `C:\c\Users\…`. Every client on the machine must point at the same build:
a client with a different one replaces the running daemon (once per connect), and the clients
already connected then fail with a `VERSION` error when they reconnect.

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

`browser_evaluate(expression, timeoutMs?)` runs an expression in the **page context** of this
session's tab (or `tab`; *superseded 2026-10-22: was "the active tab's", because of Step 7 T4's tab
argument*),
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

**Timeouts.** `timeoutMs` defaults to 10 000 and is clamped to 100…60 000; the daemon waits 5 s
longer (the SDK client 1 s more), so a long evaluate is not cut short by the bridge's own call timeout. On expiry the debugger
detaches and you get `Timed out after Ns …` — but **work the page already started keeps running**
(a `fetch` in flight is not cancelled).

**The banner.** Every call attaches `chrome.debugger`, so Chrome shows the "an extension is debugging
this browser" banner for the duration, exactly like `trusted:true` input.

**`userGesture`.** The expression runs with transient user activation, so popups, autoplay and other
gesture-gated APIs work — but activation is **not window focus**. Anything gated on
`document.hasFocus()`, notably `navigator.clipboard.writeText`, still fails with `NotAllowedError`
while the Chrome window is in the background, which is the normal state while an agent drives it.
Focus the window (`browser_focus_tab`) if you need those. *Superseded 2026-10-22: was "(e.g.
`browser_select_tab`)", because since Step 7 T4 `browser_select_tab` no longer changes the screen.*

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
1…500. `tab` takes a handle from `browser_list_tabs`, or `"all"` (which adds a `tab:<handle>` column;
a request no tab can be named for, such as a site's service worker, shows `tab:-1`). Without `tab`
the listing is this session's tab and its header still reads `Network — active tab: …`. *Superseded
2026-10-22: was "a tab id … a `tab:<id>` column", because Step 7 T4 shows handles, never Chrome ids.*

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
the text the tool prints is the table, which has no header columns. Ids are Chrome's `requestId`s and
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
when Chrome exits or the extension is reloaded.

## Security notes

- The WebSocket binds to `127.0.0.1` only and requires the shared token.
- A Claude session's first call without `tab` claims **the tab you are looking at** and keeps acting
  on it, and any actor can claim any unowned tab by handle — so it can touch sensitive tabs (banking,
  email). Be aware of what is in front when a session starts, and what is unowned. *Superseded
  2026-10-23: was "the agent acts on whatever tab is active", because since Step 7 a session keeps its
  own tab and other tabs are reached by handle.*
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
- **Cookies never enter the extension.** The `webRequest` listeners deliberately omit
  `extraHeaders`, so Chrome does not hand over `Cookie` / `Set-Cookie` at all — stronger than
  redacting them. (The same omission costs us `Referer` and `Origin`, which is an accepted trade.)
  On top of that, `authorization`, `x-api-key`, `x-csrf-token` and any header whose name contains
  `token`, `secret` or `session` are replaced with `<redacted>` **at ingest**, so only the redacted
  form is ever stored; form fields named like `password`, `token`, `secret`, `otp` or `code` are
  redacted in the request-body summary the same way. Headers and bodies are returned only when you
  ask for them (`includeHeaders`, or an `id` lookup).
- **Nothing network-related is logged.** The service-worker console prints entry *counts* only —
  never a URL, a header value or a body — and neither the MCP nor the daemon writes anything about network
  entries (the daemon's log holds counts, ids and names only).

## Troubleshooting

- **Start with `browser_status`.** It tells you which part is broken: the daemon
  (`Daemon: not connected` plus a `Problem:` line), the extension (not connected), or neither (then
  look at the active tab it reports).
- **"No welcome from 127.0.0.1:9234 within 2 s after hello: a pre-Step-6 bridge server holds port
  9234"** from `browser_status` or any tool: an old Claude session still runs the previous bridge
  server. End that session, or stop the process listening on the port (`Stop-Process -Id
  (Get-NetTCPConnection -LocalPort 9234 -State Listen).OwningProcess` in PowerShell). The MCP never
  crashes on this; it retries every 5 s and connects on its own once the port is free.
- **Tools report a different build than you just built, or `VERSION`**: see
  [Which build is running](#the-daemon). Two checkouts or a `BRIDGE_DAEMON` override on the same
  port fight over the one daemon; point every client at the same `daemon/dist/index.js`.
- **"Could not reach the bridge daemon on 127.0.0.1:9234 within 10 s … — see …daemon.log"**: the
  daemon did not start or did not bind. Read the last lines of `~/.chrome-agent-bridge/daemon.log`
  (for example `cannot listen on port …`, or no `start` line at all when node could not run the file).
- **"Extension not connected"** from a tool: make sure Chrome is open, the extension is
  enabled, and the Options token/port match the bridge token (`BRIDGE_TOKEN` or `bridge.token`) and `BRIDGE_PORT` the daemon uses.
  Check the service-worker console for `connection: up`.
- **Chrome is closed**: `browser_status` shows `Daemon: connected …` and `Extension: not
  connected — …`, and every other tool fails at once with `Extension not connected — is Chrome open
  and the Chrome Agent Bridge extension enabled?`. Open Chrome and the next call works — nothing
  restarts. (*Superseded 2026-10-22: was "`Daemon: not connected` with `Problem: Extension not
  connected — … (waited 15000 ms on port 9234)`", with tools saying `connecting to the bridge
  daemon…` for ~15 s and a new attempt about every 20 s, because the MCP now connects to the daemon
  without waiting for the extension (decisions.md · 2026-10-22 #27).*)
- **Chrome was killed / crashed while connected**: the daemon pings the extension every 30 s and
  drops a socket that misses a pong, so within ~60 s tools report "not connected" instead of
  timing out for 30 s each. Relaunch Chrome and it reconnects by itself.
- **A tool errors with "restricted URL"**: the tab is a `chrome://` page, the New
  Tab page, or the Chrome Web Store, where extensions can't run. Navigate it to a normal page, or
  pick another tab (`browser_select_tab`). *Superseded 2026-10-22: was "the active tab … Switch to a
  normal page", because since Step 7 T4 tools act on this session's tab, not on whatever is active.*
- **A tool errors with `tab T3 is held by "…"`**: another actor (named in the message) holds that
  tab. Open your own (`browser_new_tab`) or pick a free one from `browser_list_tabs`. The first call
  of a session fails this way when another actor already holds the tab you are looking at.
- **"No normal Chrome window is focused (a DevTools or popup window may have focus)"**: there is no
  normal Chrome window to take "the tab you are looking at" from. Click a normal Chrome window and
  retry. (A focused DevTools window alone does not cause it: the bridge reads the last-focused
  *normal* window.)
- **`VERSION` with "the Chrome extension is an older build — reload it at chrome://extensions"**: the
  daemon was rebuilt but Chrome still runs the old extension. Reload it (§4).
- **`trusted:true` "succeeds" but nothing happens on the page**: the tab is in the background (see
  [What you see](#what-you-see-while-actors-work)); `browser_focus_tab` first.
- **A screenshot fails with `TIMEOUT` after 35 s**: the tab's window is entirely covered by other
  windows, so Chrome produces no frame to capture; uncover it (your tab is put back after ~30 s).
- **"The tab was discarded by Chrome's Memory Saver"**: Chrome unloaded the tab; `browser_focus_tab`
  or `browser_navigate` reloads it.
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

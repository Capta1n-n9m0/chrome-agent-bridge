# End-to-End Test Plan

- **Date:** 2026-06-04
- **Scope:** Validate the Chrome Agent Bridge against a **real Chrome instance + real MCP client**.
- **Why manual:** these paths can't be unit-tested — they need the actual browser, the extension
  loaded in a real profile, and a live MCP connection. The 46 automated tests cover logic/protocol;
  this plan covers the rest.

Each test has an **ID**, **objective**, **steps** (as MCP tool calls), and an **expected result**.
Record outcomes in the [Results template](#results-template). A run "passes" when all **must-pass**
(★) cases pass.

---

## 1. Environment & preconditions

1. **Versions:** Chrome ≥ 116, Node ≥ 20.
2. **Build:** from the repo root — `npm install && npm run build`. Confirm
   `mcp/dist/index.js`, `daemon/dist/index.js` and `extension/dist/{sw,options,offscreen,content}.js`
   exist. (*Amended 2026-10-22, Step 6 D5: was `server/dist/index.js`.*)
3. **Token:** choose a secret, e.g. `openssl rand -hex 16`. Call it `<TOKEN>`.
   *Note 2026-10-22 (Step 6 D6): for the Step 6 daemon wave (§4.12, §4.13), item 8 replaces this
   item — the token is generated into `bridge.token` at the repo root.*
4. **Register the MCP server** in your client (see `docs/setup.md` §3) with env
   `BRIDGE_TOKEN=<TOKEN>`, `BRIDGE_PORT=9234`. (Or run the inspector:
   `$env:BRIDGE_TOKEN="<TOKEN>"; npx @modelcontextprotocol/inspector node mcp/dist/index.js`.)
   The MCP starts the daemon (`daemon/dist/index.js`) on its first connect; it keeps running after
   the session ends.
   *Note 2026-10-22 (Step 6 D6): for the Step 6 daemon wave, item 8 replaces the env part — the MCP
   entry has **no** `BRIDGE_TOKEN` (the token comes from `bridge.token`) and points at
   `mcp/dist/index.js`.*
5. **Load the extension:** `chrome://extensions` → Developer mode → Load unpacked → select
   `extension/`.
6. **Configure the extension:** open its Options, set Port `9234` + Token `<TOKEN>`, Save.
   *Note 2026-10-22 (Step 6 D6): for the Step 6 daemon wave, item 8 replaces the token part — the
   Options get the token from `bridge.token`.*
7. **Serve the fixture** (for the deterministic cases) from the repo root:
   - `python -m http.server 8080 --directory test-fixtures` → fixture at
     `http://localhost:8080/e2e-playground.html`
   - or `npx http-server test-fixtures -p 8080`.
   Using `http://localhost` avoids the "allow file URLs" toggle and lets the extension inject.
8. **Step 6 daemon wave (§4.12 MUX rows, §4.13 DL rows)** — *added 2026-10-22, Step 6 D6, before
   any run; revised the same day by the D6 fixer.* Everything below runs in **Windows PowerShell
   from the repo root**. If `node` / `npx` is not found there, first run
   `$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"`. Each step is tagged
   **[UI]** / **[SH]** / **[USER]** (defined at the top of §4.12, with the automation cautions
   A1–A10).
   - **One token for everyone — `bridge.token`.** Generating it is **[SH]**; pasting it into the
     Options and editing the Claude Code config are **[USER]** (A8). The daemon, the MCP and `recipes/hello.ts` all get
     the token from `@bridge/sdk` (`sdk/src/token.ts`): a non-empty `BRIDGE_TOKEN` environment
     variable wins (trimmed); otherwise `bridge.token` in the workspace root (the first folder above
     the SDK's own code whose `package.json` has `"workspaces"`, i.e. the repo root), trimmed. A
     daemon the SDK starts gets the starter's token through its environment (`sdk/src/spawn.ts`). So
     the wave uses the file, and nobody sets `BRIDGE_TOKEN`:
     ```powershell
     git check-ignore bridge.token          # must print: bridge.token  (the file is never committed)
     $b = New-Object byte[] 16
     [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
     [IO.File]::WriteAllText("$PWD\bridge.token", (($b | ForEach-Object { $_.ToString('x2') }) -join ''))
     Remove-Variable b
     Get-Content .\bridge.token -Raw | Set-Clipboard   # paste into the extension's Options → Token, Save
     Set-Clipboard -Value 'cleared'
     ```
     Nothing above prints the token. `Set-Clipboard 'cleared'` replaces only the current clipboard
     entry: with Windows **clipboard history** (Win+V) or **sync across devices** on (Settings →
     System → Clipboard; `(Get-ItemProperty HKCU:\Software\Microsoft\Clipboard -ErrorAction SilentlyContinue).EnableClipboardHistory`
     prints `1` when history is on), the token stays in the history, or leaves the machine. Then
     either clear it there (Win+V → the entry's **…** → Delete, or Settings → Clipboard → **Clear**),
     or skip the clipboard: run `notepad .\bridge.token` and type the token into the Options by hand
     (**[USER]**), then close Notepad without saving. Then remove `BRIDGE_TOKEN` from the MCP server's `env` in the
     Claude Code config (items 3–4) — if it stays, it wins over the file for the MCP and for the daemon
     the MCP starts, and a recipe reading the file is refused (`close 4001`). Check the shell too:
     `Test-Path Env:BRIDGE_TOKEN` must print `False`.
   - **MCP path [USER]:** the Claude Code config points at `mcp/dist/index.js` (gate G6-2);
     reconnect with `/mcp` after changing it.
   - **Helpers [SH]** (paste once per PowerShell window; the first line makes `—` in a program's
     output readable, A9):
     ```powershell
     [Console]::OutputEncoding = [Text.Encoding]::UTF8
     $log = "$HOME\.chrome-agent-bridge\daemon.log"
     function Get-BridgeLog([int]$n = 10) { Get-Content $log -Tail $n -Encoding UTF8 }
     function Get-BridgeDaemon { Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'daemon[\\/]dist[\\/]index\.js' } | Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine }
     function Get-BridgeProcs { Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='claude.exe'" | Select-Object ProcessId, ParentProcessId, Name, CommandLine | Format-Table -Wrap -AutoSize }
     function Get-DaemonBuild { (Get-FileHash .\daemon\dist\index.js -Algorithm SHA256).Hash.ToLower() }
     function Get-DriverChain { $ids = @(); $p = $PID; for ($i = 0; $p -and $i -lt 32; $i++) { $ids += $p; $p = (Get-CimInstance Win32_Process -Filter "ProcessId=$p").ParentProcessId }; $ids }
     function Get-ProcTree([int]$Root) { $all = @(Get-CimInstance Win32_Process); $ids = @($Root); $i = 0; while ($i -lt $ids.Count) { $c = $ids[$i]; $ids += @($all | Where-Object { $_.ParentProcessId -eq $c -and $ids -notcontains $_.ProcessId } | ForEach-Object { $_.ProcessId }); $i++ }; $ids }
     function Test-SafeToKill([int]$Root) { $chain = Get-DriverChain; $hit = @(Get-ProcTree $Root | Where-Object { $chain -contains $_ }); if ($hit.Count) { "UNSAFE: the tree of $Root contains driver PID(s) $($hit -join ', ')" } else { "safe: the tree of $Root does not contain the driver" } }
     ```
     `Get-BridgeDaemon` lists the daemon (its command line ends in `daemon\dist\index.js`); unrelated
     `node.exe` processes (e.g. a codex `host-daemon.mjs`) do not match. `Get-DaemonBuild` is the
     build the daemon reports (`build <sha256>`, the sha256 of `daemon/dist/index.js`).
     `Get-BridgeLog <n>` prints the log's last `<n>` lines (read as UTF-8). `Get-DriverChain` lists
     the PowerShell window's own pid and its ancestors — when a driver runs the shell steps, its own
     processes (A2); `Get-ProcTree <pid>` lists a process and its descendants, as `taskkill /T`
     walks them (by `ParentProcessId`); `Test-SafeToKill <pid>` prints `safe: …` or `UNSAFE: …`.
   - **No daemon running** (a precondition of MUX-1, MUX-4, MUX-6, MUX-7): **[UI]** end every
     Claude session that uses the bridge first (a live MCP starts a new daemon within ~5 s), then
     **[SH]** `Get-BridgeDaemon | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }` and check
     `Get-BridgeDaemon` prints nothing. A daemon stopped this way writes no `exit` line to the log.
     (The filter matches only `daemon\dist\index.js` command lines, so it never hits a driver, A2.)
   - **Recipe:** `npx tsx recipes/hello.ts [holdMs]` connects as `hello-recipe` (`RECIPE_NAME`
     overrides the name, `HOLD_MS` or the first argument keeps it connected that many ms), calls
     `listTabs`, prints one timestamped line per step, and exits 0, or prints
     `… FAILED after <ms> ms — <code>: <message>` and exits 1 (`$LASTEXITCODE`). After a hold it calls
     `daemon.status` again and prints `still connected after the hold — clients (<n>)`; if the
     connection dropped during the hold, that call fails and the recipe prints `FAILED` and exits 1,
     never `OK`. It never prints the token or a URL.
   - **DL fixtures:** `test-fixtures/dl/hello.txt` (69 bytes, no line ending, so Git's `autocrlf`
     cannot change it; sha256 `0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce`) is
     served by the item-7 server. DL-2 also needs `test-fixtures/redirect_server.py 8081
     http://localhost:8080/dl/hello.txt`: it binds `127.0.0.1:8081`, answers `GET /page` with a
     small HTML page (200), and every other GET with `302` to that URL, with no CORS headers.
   - **Fixture servers with log files [SH]** (instead of two visible windows, so a driver can read
     their request logs; both servers write one line per request to stderr). This block **replaces**
     item 7's server for the wave: do not also start item 7's server (or stop it first). Both use
     port 8080: the second either fails to bind or binds beside the first and answers some of the
     requests, and then `http8080.log` misses lines that DL-2 judges:
     ```powershell
     $out = "$env:TEMP\bridge-e2e"; New-Item -ItemType Directory -Force $out | Out-Null
     $web = Start-Process -PassThru -WindowStyle Hidden -FilePath python -ArgumentList '-I', '-m', 'http.server', '8080', '--bind', '127.0.0.1', '--directory', 'test-fixtures' -RedirectStandardError "$out\http8080.log"
     $redir = Start-Process -PassThru -WindowStyle Hidden -FilePath python -ArgumentList '-I', 'test-fixtures/redirect_server.py', '8081', 'http://localhost:8080/dl/hello.txt' -RedirectStandardError "$out\redirect8081.log"
     Get-Content "$out\redirect8081.log" -Tail 5    # DL-2's fixture log; "$out\http8080.log" is the item-7 server's
     Stop-Process -Id $web.Id, $redir.Id             # at the end of the wave
     ```
     `--bind 127.0.0.1` keeps the item-7 server off the LAN; `localhost:8080` still reaches it when
     `localhost` resolves to `127.0.0.1` (if the playground does not load, drop `--bind`, as item 7
     does).
   - **Step 7 wave (§4.14)** — *added 2026-10-22 by Step 7 T5, before any run:* the same helpers, plus
     `recipes/t5.ts`, `recipes/t5-actor.ts`, `recipes/t5-png.ts` and `recipes/t5-win.ps1` (§4.14); the
     order of work is the wave sheet `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md`.
     `python` here is `$HOME\miniconda3\python.exe` (not on PowerShell's PATH; W1 finding 3).
   - **Where to look:** Claude Code does not show the MCP's stderr, so the evidence is
     `browser_status`, the recipe's output, the process listings and `daemon.log` (lines are
     `<UTC time, whole seconds> <message>`).
9. **Reloading the extension by UI automation** — *added 2026-10-23, stage RELOAD-AUTO (decisions.md ·
   2026-10-23 · The driver may reload the extension by UI automation, … (#64)); measured on Windows 11,
   Chrome 156, English UI.* After `npm run build` changes `extension/dist`, Chrome runs the old code
   until the extension is reloaded (CLAUDE.md gotcha). A driver with shell access reloads it with
   **[SH]**, from the repo root in Windows PowerShell:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1   # -DryRun: find only
   $LASTEXITCODE   # 0 reloaded and verified; 2 nothing pressed; 3 pressed, not verified; 4 own window left open; 5 dry run found the button; 1 script error
   ```
   What it does: it opens **one** Chrome window of its own (`chrome.exe --new-window about:blank` — Chrome
   opens a `chrome://` URL given on the command line as a New Tab page instead, so the script types
   `chrome://extensions` into **that window's** address bar by UIA `ValuePattern.SetValue` and sends one
   Enter only while that window is in the foreground and its address bar has the focus). In the page's
   accessibility tree (Chrome builds it when a UIA client asks; no `--force-renderer-accessibility`
   was needed) every card is flattened into a run of siblings that starts at a text with AutomationId
   `name`. The script takes the run whose name is `Chrome Agent Bridge` **and** whose ID line is the ID
   Chrome derives from the path of `extension/` (sha256 of the absolute path as UTF-16LE, first 16 bytes,
   nibbles as `a`–`p`: `cpnemjbgecfbeicldpaaegbhjgjgjfep` on this machine), and in it the one Button
   with AutomationId `dev-reload-button` (raw-view parent `itemsList`). Anything else — a new window not on `about:blank` (then it is not closed either), no or two such
   cards, no or two buttons, another page, Chrome not running, more than one new window — presses
   nothing and exits 2. The browser's own toolbar Reload (AutomationId `view_…`), **Update**
   (`updateNow`, reloads every unpacked extension), the toggles (`enableToggle`, `devMode`), Remove,
   Details and Errors are never pressed. It invokes the button once, then verifies two ways: UIA sees
   the card's "Inspect views" change (for ~0.1–0.4 s it reads `service worker (Inactive)` and the
   offscreen document's `1 more…` link is gone), and, if a daemon is running, `daemon.log` gets a new
   `extension resync: <n> tabs, <m> gone` line (the extension's socket came back; it appeared in the
   same second as the press). It then closes its window (WM_CLOSE) and checks it is gone. It prints no
   title or URL of any other window and never reads the token. A **daemon running** before the press
   makes the check stronger (start one with any client, e.g. `npx tsx recipes/hello.ts`).
   **Then prove the build** with the wave's stale-extension check (RELOAD-1's `npx tsx recipes/t5.ts
   check`, and for a T5b-or-later build a call only that build answers, e.g. `screenshot {mode:"cdp"}`
   on a background tab → `OFFSCREEN` in < 1 s). Limits: Developer mode must already be on (the button
   exists only then; the script never switches it); the new window opens in Chrome's last-used
   profile, so with several profiles the card may be missing (exit 2); the card name and AutomationIds
   are language-independent, the `(Inactive)` text is not (it is only one of the two checks). Without a
   UIA-capable shell, the fallback is keyboard navigation in one's own `chrome://extensions` window
   (not built; Tab order through the cards is long and fragile). A future extension method calling
   `chrome.runtime.reload()` would make a reload of an already-current extension a single call (not
   built: it is an extension change).

**Fixture reference:** `test-fixtures/e2e-playground.html` exposes a sticky `status:` line that
updates on every interaction (so `browser_snapshot` / `browser_screenshot` can verify outcomes), a
labeled form, a synthetic-friendly counter button, a **trusted-only** button (flips only on a real
`isTrusted` event), a hover target, a jump link, a 1.5 s **async** loader, a long region with a
`BOTTOM MARKER` for scroll / full-page screenshots, and a **Perception fidelity** section (open +
closed shadow roots, a same-origin iframe, four hidden decoys, and the extra roles). For §4.7 it also
defines `window.__playground` in the **page** context — `{version, items, secret(), big: [0…499],
node: <button#counter>}` plus a `self` back-reference (a cycle) — so one `browser_evaluate` call
exercises every branch of the in-page serialiser (function, DOM node, over-`maxItems` array, cycle).

**Network fixtures:** `test-fixtures/ok.json` and `test-fixtures/redir/index.html` back §4.8 —
`ok.json` is the small JSON body the XHR cases fetch, and `python -m http.server` answers
`GET /redir` with a `301` to `/redir/`, which gives the redirect-hop case without any server code.
The playground's **Network** section has one button per NET case. `python -m http.server` serves
straight from disk, so new fixture files need no restart.

**CSP fixture:** `test-fixtures/e2e-playground-csp.html` (served alongside it at
`http://localhost:8080/e2e-playground-csp.html`) is a small page carrying
`<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">` — no
`'unsafe-eval'`. It has the same `window.__playground`, a counter button, and an `#eval-probe` line
that records what happens when the **page itself** calls `new Function("return 1")()`. EVAL-12 uses
it to show that `browser_evaluate` (CDP `Runtime.evaluate`) is not bound by the page CSP that blocks
the page's own eval. `python -m http.server` picks up the new file without a restart.

## 2. Diagnostics (where to look when something fails)

- **Extension service-worker console:** `chrome://extensions` → the extension → "service worker".
  Expect `[bridge] connection: up`. Errors from handlers surface here.
- **MCP stderr:** the terminal/inspector running the MCP server. Expect
  `[chrome-bridge] connected to the bridge daemon`; on a failure it prints
  `[chrome-bridge] bridge daemon unavailable (retrying every 5 s): <reason>`.
- **Daemon log:** `~/.chrome-agent-bridge/daemon.log` (the daemon runs with no stdio). Expect a
  `listening on 127.0.0.1:9234` line after its `start` and `config` lines.
  (*Amended 2026-10-22, Step 6 D5: was "Server stderr … Expect the `WebSocket host listening on
  127.0.0.1:9234` line"; the WebSocket host now lives in the daemon.*)
- **MCP client tool output:** the text/image each tool returns, or an error envelope.
- **Offscreen document:** `chrome://extensions` → the extension → it may list "offscreen.html"
  as an active view; its console shows WS activity.

## 3. Smoke test (run this first) ★

| ID | Objective | Steps | Expected |
|---|---|---|---|
| SMOKE-1 | The whole loop works | With everything from §1 running, call `browser_navigate {"url":"http://localhost:8080/e2e-playground.html"}` | Active tab loads the playground; tool returns "Navigated active tab to …". SW console shows `connection: up`. |
| SMOKE-2 | Perception works | `browser_snapshot` | Returns a text outline including `textbox "Email address" [ref=…]`, `button "Sign in" [ref=…]`, `combobox "Favorite fruit" [ref=…]`. The `status:` line is a non-interactive `<div>` and is **not** in the snapshot by design — read it with `browser_screenshot`. |

If SMOKE-1/2 fail, stop and debug connection/injection before the rest.

## 4. Test cases

### 4.1 Connection & handshake

| ID | Objective | Steps | Expected |
|---|---|---|---|
| CONN-1 ★ | Extension connects | Start the MCP server (it starts the daemon if none runs), ensure token set in Options | SW console: `connection: up`. (*Amended 2026-10-22, Step 6 D5: was "Start server"; the extension connects to the daemon.*) |
| CONN-2 ★ | Not-connected error is clear | (a) With it connected, disable the extension, then call any tool and `browser_status`; re-enable it. (b) Close Chrome, restart the MCP server (`/mcp` reconnect), call `browser_status` at once, then again after ~20 s; then open Chrome | (a) The tool fails with `Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?`; `browser_status` shows `Daemon: connected …` and `Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?`. (b) Both times `browser_status` shows `Daemon: connected …` and `Extension: not connected — …`, with no `Problem:` line; any other tool fails at once with `Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?`. After Chrome opens, the next call works without restarting anything. (*Superseded 2026-10-22: was "for the first ~15 s `Daemon: not connected` + `Problem: connecting to the bridge daemon…`, then `Daemon: not connected` + `Problem: Extension not connected — … (waited 15000 ms on port 9234)`, with a retry about every 20 s", because the MCP now connects without waiting for the extension (decisions.md · 2026-10-22 #27).*) (*Amended 2026-10-22, Step 6 D5: was "Stop the server (or disable the extension), then call any tool". Stopping the MCP leaves no tool to call, and stopping the daemon gives `The connection to the bridge daemon closed …` before the next retry starts a new one — that case is CONN-3 (b).*) |
| CONN-3 ★ | Reconnect after a restart | With it connected, (a) restart the MCP server (`/mcp` reconnect); (b) stop the daemon (end its `node …/daemon/dist/index.js` process) and call `browser_status` within 5 s, then again after ~20 s | (a) The daemon keeps port 9234 and the extension's socket: the SW logs **no** `connection: down`; `browser_status` shows a new `claude-code #<pid>` in its client list and `browser_snapshot` works at once. (b) The SW logs `connection: down`; the MCP stores the reason (`Daemon: not connected` + `Problem: The connection to the bridge daemon closed …`) and its 5 s retry starts a new daemon; the SW logs `connection: up` and a subsequent `browser_snapshot` works without touching the extension. (*Amended 2026-10-22, Step 6 D5: an MCP restart no longer restarts the WebSocket host.*) |
| CONN-4 | Wrong token rejected | In Options set a wrong token, Save | SW logs `connection: down`/retries; tools return not-connected. Restore the correct token → reconnects. |
| CONN-5 | Idle keepalive (offscreen) | Connect, then leave Chrome idle / switch away for 3+ minutes (then repeat with 6+) | A `browser_snapshot` afterward still works (the offscreen document kept the socket alive). SW console shows no `connection: down` in between. |
| CONN-6 | Dead Chrome is detected fast (heartbeat) | With it connected, kill Chrome outright (Task Manager → end all `chrome.exe`, or close every window), then call `browser_status` once a minute | Within ~60 s (two 30 s heartbeat intervals) the tool reports `Extension: not connected` — **not** a 30 s timeout per call. The heartbeat and its "stopped answering pings" message are the **daemon's** now; the daemon runs with no stdio and does not write this message to `daemon.log`, so it is seen only when the daemon is started by hand in a terminal. Relaunch Chrome → the extension reconnects on its own; `browser_snapshot` works without restarting anything. (*Amended 2026-10-22, Step 6 D5: was "the server stderr logs 'stopped answering pings'".*) |
| CONN-7 | A pre-Step-6 server on the port is explained and self-heals | Stop the daemon. Start a pre-Step-6 server first: check out a pre-Step-6 commit in a second worktree, build it, and in a terminal run `set BRIDGE_TOKEN=<token> && node server/dist/index.js` there (leave it running). Then reconnect this session's MCP server (`/mcp`) and call `browser_status`, then `browser_snapshot` | `browser_status` says `Daemon: not connected` + `Problem: No welcome from 127.0.0.1:9234 within 2 s after hello: a pre-Step-6 bridge server holds port 9234. End the old Claude session …`; `browser_snapshot` fails with that same reason (not the generic "not connected"); the MCP does not crash. Ctrl-C the old server → within ~5 s (the MCP's retry) plus the daemon start and the extension reconnect, `browser_status` reports the daemon and the extension connected and `browser_snapshot` works. (*Amended 2026-10-22, Step 6 D5: the MCP no longer binds the port, so the busy-port self-heal is gone; decisions.md · 2026-10-22 #13.*) |
| STAT-1 ★ | `browser_status` happy path | `browser_status` | Four lines: `Daemon: connected on 127.0.0.1:9234 (build <hash>, up <n>s)`, `Clients (<n>): claude-code #<pid>[, …]`, `Extension: connected`, `Active tab: [<T#>] title — url` (the playground; `<T#>` is a handle such as `T1`). (*Amended 2026-10-22, Step 6 D5: was three lines starting `WebSocket host: listening on 127.0.0.1:9234`.*) *Superseded 2026-10-22: was `[id]`, a Chrome tab id, because Step 7 T4 prints the daemon's handle.* *Corrected 2026-10-23 (Step 8 S5), before any run of the S5 build: was "Four lines", because S5 adds this session's tab after the unchanged `Active tab:` line — a fifth line `Cursor: none yet — the first tab tool claims the human's active tab` when no tab tool has run in the session, else `Cursor: <T#> "<title>" — <url> (held by me)`; and a sixth, `Human's active tab: <T#> "<title>" — not mine; call browser_use_active_tab to work there`, only when the human's tab is not the cursor's (§4.18 CUR-2).* |

### 4.2 Navigation

| ID | Objective | Steps | Expected |
|---|---|---|---|
| NAV-1 ★ | Navigate normal page | `browser_navigate {"url":"https://example.com"}` | Active tab shows example.com; tool confirms. |
| NAV-2 | Navigate fast/cached page | Navigate to the playground twice in a row | Both calls return promptly (no ~30 s hang — validates the load-listener-before-navigate fix). |
| NAV-3 | Restricted URL is handled | Manually focus a `chrome://settings` tab, then call `browser_snapshot` | Tool returns a clear "restricted URL (chrome://, New Tab, Web Store)…" error, not a hang/crash. |

### 4.3 Perception

| ID | Objective | Steps | Expected |
|---|---|---|---|
| PERC-1 ★ | Refs + roles | On the playground, `browser_snapshot` | Lists textbox/combobox/button/link entries with `[ref=eN]`. |
| PERC-2 ★ | Label-based naming | Inspect the snapshot text | Email input is `textbox "Email address"` (via `<label for>`); password is named "Password" (via `aria-labelledby`); search shows its placeholder. |
| PERC-3 ★ | Viewport screenshot | `browser_screenshot` | Returns a PNG of the current viewport that renders in the client. |
| PERC-4 | Full-page screenshot + banner | `browser_screenshot {"fullPage":true}` | Returns a taller PNG that includes the `BOTTOM MARKER`; the "extension is debugging this browser" banner appears briefly, then clears. |
| PERC-5 ★ | Shadow DOM | `browser_snapshot`, look in the "Perception fidelity" section | `button "Shadow button"` is listed (open root); `Sealed button` is **not** (closed root). Clicking the shadow ref sets `status: shadow button clicked`. |
| PERC-6 ★ | Same-origin iframe | `browser_snapshot` | `button "Iframe button"` is listed. `browser_click` on its ref sets `status: iframe button clicked (isTrusted = false)`. |
| PERC-7 | Iframe trusted click | `browser_click {"ref":"<iframe button>","trusted":true}` | The iframe's own line reads `iframe: TRUSTED click` — i.e. the frame-offset coordinates landed inside the frame, not on the page behind it. |
| PERC-8 ★ | Hidden variants | `browser_snapshot` | None of the four decoys appear: `Decoy: aria-hidden`, `Decoy: inert`, `Decoy: display none ancestor`, `Decoy: zero size`. |
| PERC-9 | Extra roles | `browser_snapshot` | Lists `spinbutton "Quantity"`, `slider "Volume"`, `listbox "Tags"`, `textbox "Notes editor"`, `tab "Details tab"`, and `button "Disabled action" [ref=eN] [disabled]`. |

### 4.4 Actions (content-script path)

| ID | Objective | Steps | Expected |
|---|---|---|---|
| ACT-1 ★ | Type into a field | snapshot → `browser_type {"ref":"<email ref>","text":"a@b.com"}` | Email field shows the text; `status:` line reads `email = a@b.com` (verify via another snapshot). |
| ACT-2 ★ | Click a button | `browser_click {"ref":"<counter ref>"}` | Counter increments; `status: counter = 1`. |
| ACT-3 | Type + submit | `browser_type {"ref":"<email ref>","text":"x@y.com","submit":true}` | `status: form submitted (email = x@y.com)`. |
| ACT-4 | Select option | `browser_select_option {"ref":"<fruit ref>","values":["Banana"]}` | `status: fruit = b`. (Also try `["c"]` by value.) |
| ACT-5 | Hover | `browser_hover {"ref":"<hover-target ref>"}` | `status: hovered`. |
| ACT-6 | Scroll | `browser_scroll {"direction":"down"}` then `browser_screenshot` | Viewport shows lower content / `BOTTOM MARKER` region. |
| ACT-7 | Press key | Focus a field via click, then `browser_press_key {"key":"Enter"}` | No error; if on the form field, behaves as Enter. |
| ACT-8 | Stale ref guidance | Navigate away and back, then act on an old ref | Tool returns "ref … not found — call browser_snapshot to re-snapshot". |

### 4.5 Trusted input (chrome.debugger)

| ID | Objective | Steps | Expected |
|---|---|---|---|
| TRUST-1 ★ | Synthetic click is ignored by the trusted-only button | `browser_click {"ref":"<trusted-only ref>"}` (default) | `status: synthetic click ignored`. (Confirms default path is synthetic.) |
| TRUST-2 ★ | Trusted click works | `browser_click {"ref":"<trusted-only ref>","trusted":true}` | Debugging banner appears; `status: TRUSTED click received`; banner clears after. |
| TRUST-3 | DevTools open on the tab | Open DevTools on the tab (F12, docked), then `browser_click {…,"trusted":true}` | **Chrome ≥ 152 (measured 2026-09-03):** the trusted click simply works — `status: TRUSTED click received` — because Chrome now lets an extension debugger attach alongside DevTools. **Older Chrome:** attach throws "Another debugger is already attached…", which the tool must surface as "Chrome DevTools (or another extension) is already attached to this tab — … Close DevTools on that tab and retry." (not a raw CDP string, not a 30 s timeout); closing DevTools → retry succeeds. Either outcome passes; record which. |
| TRUST-8 | Cancelled debugging session | `browser_type {"ref":"<trusted-input ref>","text":"<~200 chars>","trusted":true}`, and while the banner is up click its **Cancel** | Tool returns "The debugging session was cancelled mid-action … retry the action."; SW console logs `debugger detached … reason: canceled_by_user`. Retrying without cancelling works. |
| TRUST-4 ★ | Trusted typing replaces the field contents | On `#trusted-input`: `browser_type {"ref":"<ref>","text":"hi","trusted":true}`, then again with `"text":"yo"` | First: `status: TRUSTED input = hi`, field shows `hi`. Second: field shows `yo`, **not** `hiyo` (proves select-all-then-replace). |
| TRUST-5 ★ | Trusted key press | Click `#trusted-input` (default click focuses it), then `browser_press_key {"key":"Enter","trusted":true}` | `status: TRUSTED key = Enter`. |
| TRUST-6 | Trusted typing + submit | `browser_type {"ref":"<email ref>","text":"x@y.com","submit":true,"trusted":true}` | `status: form submitted (email = x@y.com)`. |
| TRUST-7 | Zoom-correct trusted click | Set Chrome zoom to 150 % (Ctrl +), then `browser_click {"ref":"<trusted-only ref>","trusted":true}` and re-run PERC-7 | `status: TRUSTED click received`; the iframe click still lands. Reset zoom to 100 % after. |

### 4.6 Tabs & history

| ID | Objective | Steps | Expected |
|---|---|---|---|
| TAB-1 ★ | List tabs | `browser_list_tabs` | One line per open tab, `<T#><*| > [<holder>] <title> — <url>`: each starts with a handle (`T1`, `T2`, …); the tab on screen in the last-focused normal window is marked `*`; a held tab shows its holder (`[claude-code #<pid>]` for this session once it has touched the tab). *Superseded 2026-10-22: was "Lists open tabs with ids; the active one marked `*`", because Step 7 T4 shows handles and holders and `*` marks the human's tab (#43).* |
| TAB-2 ★ | Select a tab without showing it | Open a second tab manually and switch back to the playground tab; `browser_list_tabs`; `browser_select_tab {"tab":"<other T#>"}`, then `browser_snapshot`; watch the screen throughout | `Selected tab <T#> (now this session's tab; not brought on screen — browser_focus_tab shows it)`; the snapshot's `url:` line is the other tab's; **the screen does not change** (the playground stays on screen); `browser_list_tabs` now shows `[claude-code #<pid>]` on `<T#>`. *Superseded 2026-10-22: was "`browser_select_tab {"id":<other>}` … Snapshot reflects the newly active tab (control target followed the switch)", because in Step 7 T4 `browser_select_tab` claims the tab and moves this session's tab without activating it (spec §8.3).* |
| TAB-3 | New tab | `browser_new_tab {"url":"https://example.com"}` | New active tab opens to example.com; tool returns `Opened tab <T#>` (a handle); the next untargeted tool acts there. *Superseded 2026-10-22: was "tool returns its id", because Step 7 T4 returns handles.* *Corrected 2026-10-23 (Step 8 S5), before any run of the S5 build: was "New active tab … returns `Opened tab <T#>`", because phase doc 0.6's rule now decides: when this session's tab is the tab on screen (run TAB-3 after a tool has claimed the tab you look at), the new tab opens in front and the text stays `Opened tab <T#>`; otherwise — including a session's first tool call — it opens in the background and returns `Opened tab <T#> (in the background — browser_focus_tab shows it)`. Either way the next untargeted tool acts there (§4.18 CUR-3).* |
| TAB-4 | Close tab | `browser_close_tab {"tab":"<T#>"}` | `Closed tab <T#>`; that tab closes. `browser_close_tab {}` returns `browser_close_tab needs tab: a handle from browser_list_tabs` and closes nothing. *Superseded 2026-10-22: was `browser_close_tab {"id":<id>}`, because Step 7 T4 takes handles and gives `browser_close_tab` no default tab (#57).* |
| TAB-5 | Focus a tab | After TAB-2 (this session's tab is the other tab, not on screen): `browser_focus_tab {}` | `Focused tab <T#>`; that tab comes on screen and its window is focused; it stays on screen afterwards (not restored). *Added 2026-10-22 (Step 7 T4): `browser_focus_tab` is the only tool that changes what the human sees.* |
| HIST-1 | Back/forward | Navigate A → B, then `browser_back`, then `browser_forward` | Tab returns to A, then forward to B. |

### 4.7 Evaluate (`browser_evaluate`, CDP `Runtime.evaluate`)

Every case shows Chrome's "extension is debugging this browser" banner while it runs; the banner
clearing afterwards is part of each expectation. Run EVAL-1…11 and EVAL-13…22 on the **main**
fixture and EVAL-12 on the **CSP** fixture.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| EVAL-1 ★ | Basic expression + banner | `browser_evaluate {"expression":"document.title"}` | `Agent Bridge E2E Playground`; banner appears and clears. |
| EVAL-2 ★ | Object serialisation | `window.__playground` | Pretty JSON: `items`, `version`; `secret` shown as `"[Function: secret]"`; `node` shown as `<button id="counter">…`; `self` as `"[Circular]"`; `big` cut at 100 with `… 400 more`; trailing "output truncated" hint. |
| EVAL-3 ★ | Top-level await, page cookies | `(await fetch('/e2e-playground.html')).status` | `200`. |
| EVAL-4 ★ | `return` form | `const r = await fetch('/e2e-playground.html'); return r.status` | `200`. |
| EVAL-5 ★ | Thrown error | `throw new Error("boom")` | Tool error containing `Error: boom` and an `at` stack line; **not** a 30 s hang. |
| EVAL-6 | Rejected promise | `await Promise.reject(new TypeError("nope"))` | Tool error containing `TypeError: nope`. |
| EVAL-7 | Syntax error | `foo(` | Tool error naming the `SyntaxError`. Under `replMode` Chrome 152 supplies a real exception object, so `formatException` takes the `description` branch: `SyntaxError: Unexpected end of input` — no `Uncaught` prefix and no line/col (the `text` + `(line L, col C)` branch is the non-replMode shape and stays unit-tested). |
| EVAL-8 ★ | Async timeout | `await new Promise(r => setTimeout(r, 20000))` with `timeoutMs: 1000` | Fails in ~1 s with `Timed out after 1s…`; banner gone; the next tool call works. |
| EVAL-9 | Sync timeout | `while(true){}` with `timeoutMs: 1000` | Same outcome as EVAL-8 (CDP `timeout` terminated it); the tab is still responsive afterwards. **Record which CDP branch fired** — `exceptionDetails` "Execution was terminated" vs. a raw command error (pins the open box in plan E2.2). |
| EVAL-10 | Long timeout beats the server default | `await new Promise(r => setTimeout(r, 35000)); 1` with `timeoutMs: 40000` | Returns `1` after ~35 s — proves the per-call timeout (would otherwise fail at 30 s with "Timed out … calling evaluate"). |
| EVAL-11 | Completion value + REPL re-declare | `const a = 1; a + 1` twice in a row | `2` both times (second call would be `SyntaxError: Identifier 'a' has already been declared` without `replMode`). |
| EVAL-12 ★ | CSP bypass | On `http://localhost:8080/e2e-playground-csp.html`: `new Function("return 1")()` | `1`. For contrast, the fixture's own `#eval-probe` line reads `page eval: BLOCKED — EvalError: …` — the same call from page code is refused by the page CSP, so the CDP path is demonstrably not subject to it. |
| EVAL-13 ★ | Page-context DOM action | `document.querySelector('#counter').click(); document.querySelector('#count').textContent` | `"1"` (or the current count); `status: counter = N` on screen. |
| EVAL-14 | Node list | `document.querySelectorAll('button')` | Array of `<button id="…">…` descriptions; the `(DOM node — …)` hint is **absent** (it's a list, kind json). |
| EVAL-15 | Single node | `document.body` | `<body …>` description + the `(DOM node — use browser_snapshot refs to act on it)` hint. |
| EVAL-16 | DevTools open | Open DevTools on the tab, then EVAL-1 | Same rule as TRUST-3: Chrome ≥ 152 just works; older Chrome returns the "one debugger per tab" message. Record which. |
| EVAL-17 | Banner cancelled mid-run | EVAL-8 with `timeoutMs: 20000`, click the banner's **Cancel** | "The debugging session was cancelled mid-action…" within a second, not the timeout. |
| EVAL-18 | Restricted URL | Focus `chrome://extensions`, then EVAL-1 | "browser_evaluate is not available here: the active tab is a restricted URL…" |
| EVAL-19 | Big string | `'x'.repeat(50000)` | Cut, with the truncation hint. Note which limit applies: a **top-level** string is a CDP primitive that never reaches the in-page serialiser, so `maxString` (5 000) does not apply — the total `maxChars` cap does: 20 000 chars + `… [truncated: 30000 more chars]`. `maxString` applies to strings **nested** inside a serialised object. |
| EVAL-20 | `userGesture` | `navigator.clipboard.writeText("hi").then(() => "ok")` | `ok` (would reject without a user gesture on most pages). |
| EVAL-21 | Isolation | `typeof window.__agentBridge` | `"undefined"` — the content-script world is not visible to page code. |
| EVAL-22 | Regression smoke | ACT-2, TRUST-2, PERC-4 | Still pass (the `withDebugger` signature change and the `describeDebuggerError` wording change didn't regress them). |

### 4.8 Network (`browser_network_requests` / `browser_network_clear`)

Capture is **always on** and banner-free (`chrome.webRequest` observers, no `chrome.debugger`), per
tab, with *Preserve log* semantics — navigation does not clear it. The fixture's **Network** section
(`test-fixtures/e2e-playground.html`) has one button per case; each reports the *fetch's* own outcome
on the status line, which is deliberately not always the same as the *network* entry (NET-8).
Supporting fixtures: `test-fixtures/ok.json` (`{"ok":true,"items":[1,2,3]}`) and
`test-fixtures/redir/index.html` — `python -m http.server` answers `GET /redir` with `301 → /redir/`,
giving the redirect case for free. Both are picked up without restarting the server.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| NET-1 ★ | Always-on capture, no banner | Navigate to the fixture, then `browser_network_requests {}` | The `document` GET (200) plus any assets; **no** debugging banner at any point; ids present. |
| NET-2 ★ | XHR + id lookup | Click **Fetch JSON**; query; then `{"id": "<that id>"}` | Line `GET 200 xhr … 118 B …/ok.json`; the detail shows `content-type: application/json`, request headers **without any `cookie` key** (§0.4 of the plan), `initiator: http://localhost:8080`. |
| NET-3 | 4xx | **Fetch 404**; `{"failedOnly": true}` | Exactly the `404 …/nope` line (the 200s are filtered out). |
| NET-4 ★ | Body summary + redaction | **POST form**; `{"id": …}` | `POST 501`; `request body: user=a&password=<redacted>`. |
| NET-5 | Network error | **Fetch unreachable**; query | `ERR … http://127.0.0.1:9999/ net::ERR_CONNECTION_REFUSED`. (Port 9 is on Chrome's blocked list — it fails with `net::ERR_UNSAFE_PORT` before reaching the network, hence 9999.) |
| NET-6 | Redirect hops | **Fetch redirect**; query | Two lines with ids `N` and `N:2`: `301 … /redir → /redir/` then `200 … /redir/`. |
| NET-7 | Pending | **Fetch black hole**; query within 5 s; query again after ~25 s | First `··· (pending)` and `1 pending` in the header; later `ERR … net::ERR_CONNECTION_TIMED_OUT` and `0 pending`. |
| NET-8 | Cross-origin | **Fetch cross-origin**; query | An entry for `https://example.com/` whose outcome differs from the page's: on Chrome 152 the CORS block fires `onErrorOccurred`, so the line reads `ERR … net::ERR_FAILED` while the page's status line reports a `TypeError`. (Older Chrome logged a `200` here; either way the log's view is not the `fetch`'s view.) |
| NET-9 ★ | Filters | `{"filter":"/nope\|ok\\.json/"}`; `{"filter":"/(/"}`; `{"types":["xhr"]}`; `{"limit":2}` | The regex returns only those URLs; the bad regex is a clear `Invalid regex filter` error; `types` drops the document/assets; `limit:2` prints the two newest in chronological order with `showing 2 of N`. |
| NET-10 ★ | Logged-in site privacy | Open a site you are signed into (GitHub), act once, `{"includeHeaders": true}` and an `id` lookup | **No `cookie` / `set-cookie` header at all** on any entry; any `authorization` shows `<redacted>`; record whether `referer`/`origin` appear; the SW console contains counts only — **no URL**. |
| NET-11 ★ | SW culling soak | **Fetch JSON**; leave Chrome untouched ≥ 3 min (verify the SW stopped — "service worker (inactive)" on `chrome://extensions`); **Fetch JSON** again; query | **Both** fetches listed with ids from before and after the restart — proves the write-through + merge; `rehydrated N entries` appears once in the SW console. |
| NET-12 | Tab lifecycle | `browser_new_tab` to the fixture, **Fetch JSON** there, `{"tab":"all"}`; close that tab; `{"tab":"all"}` again | The second tab's entries appear with a `tab:<T#>` column (its handle), then vanish after the close; the first tab's entries are intact. *Superseded 2026-10-22: was `tab:<id>`, a Chrome tab id, because Step 7 T4 prints handles (Stage 0 audit F12).* *Corrected 2026-10-23 (Step 8 S5), before any run of the S5 build: `browser_new_tab` may now open the tab in the background (TAB-3's note); click **Fetch JSON** there with `browser_click {"locator":{"role":"button","name":"Fetch JSON"}}` or switch to the tab first — the expected entries are unchanged.* |
| NET-13 | Clear | `browser_network_clear {}` → `Cleared N requests.`; query | `No requests recorded …` until the next request; `recording since` unchanged (only `"all"` resets it). |
| NET-14 | Cap + responsiveness | `browser_evaluate` a loop of 600 `fetch('/ok.json?i='+i)` (or click **Fetch 20×** ~25 times); query with `{"limit": 500}` | Header shows `showing 500 of 500`; the oldest ids are gone; Chrome and the fixture stay responsive; no quota warning in the SW console (or exactly one, followed by a working query). |
| NET-15 | Regression smoke | ACT-2, TRUST-2, EVAL-1, WAIT-1 | Still pass — the manifest change and the new top-level listeners did not disturb the router or `withDebugger`. |
| NET-16 | *(Part N6 only)* Network idle | **Fetch JSON** then `browser_wait_for {"networkIdle": true}`; **Fetch black hole** then the same; then start an 8 s burst of fetches with `browser_evaluate` and wait with `idleMs` 500 and 2000; finally a 20 s burst and wait | The first two return **immediately** — by the time an agent's next call arrives the tab has already been quiet longer than `idleMs`, and the pending black-hole request does not block it (activity-based, not pending-based). During a burst the wait blocks until the burst stops, returning `idleMs` after the last request (500 vs 2000 measurably apart). A burst longer than the 10 s ceiling errors with `Timed out waiting for network idle: no 500ms quiet period in 10s`. |

### 4.9 Waiting

| ID | Objective | Steps | Expected |
|---|---|---|---|
| WAIT-1 ★ | Wait for text | Click the "Load message in 1.5s" button, then `browser_wait_for {"text":"Async content loaded!"}` | Returns success once the text appears (within ~1.5 s). |
| WAIT-2 | Wait seconds | `browser_wait_for {"seconds":2}` | Returns after ~2 s. |
| WAIT-3 | Timeout | `browser_wait_for {"text":"this never appears"}` | After ~10 s, returns a clear "Timed out waiting for text" error. |

### 4.10 Security

| ID | Objective | Steps | Expected |
|---|---|---|---|
| SEC-1 ★ | Localhost-only bind | From another device on the LAN, try to connect to `ws://<this-machine-ip>:9234` | Connection refused (server binds `127.0.0.1` only). |
| SEC-2 | Token required | Connect a raw WS client to `127.0.0.1:9234` and send a hello with a wrong/absent token | Server closes the socket; no commands accepted. |

### 4.11 Real-world premise validation ★

| ID | Objective | Steps | Expected |
|---|---|---|---|
| REAL-1 ★ | Drive a site you're already logged into | Navigate to a site where you're signed in (email, dashboard, etc.); `browser_snapshot`; read/act on something that requires your session | The page shows your **logged-in** state and the agent can perceive/act on it — proving the bridge drives the *real default profile*, not a fresh one. |
| REAL-2 | Multi-step task | A short real task: navigate → snapshot → type into a search/field → click → wait_for → snapshot the result | Completes end to end without manual intervention. |

### 4.12 Daemon multiplexing (Step 6: MUX-1…MUX-9, optional MUX-10)

*Added 2026-10-22 by Step 6 stage D6, before any run (gate G6-2: the user's wave); revised the same
day by the D6 fixer (verifier findings 1–11, and the user's note that the wave may be driven by UI
automation). Setup: §1 item 8 (token file, helpers `$log` / `Get-BridgeLog` / `Get-BridgeDaemon` /
`Get-BridgeProcs` / `Get-DaemonBuild` / `Get-DriverChain` / `Test-SafeToKill`, the recipe). Run the
rows in order; the multi-line commands are in the block under the table, keyed by row. `<sha>` is
`Get-DaemonBuild`'s output; `<ts>` a timestamp; `<…>` any value of that kind.*

**Who does each step.** Every step carries one tag:

- **[UI]** — UI automation can do it: desktop automation (computer use) or a browser driver (Claude
  in Chrome style). Opening and closing Chrome, clicking in `chrome://extensions`, opening the
  extension's service-worker console (`chrome://extensions` → the extension's **service worker**
  link) and reading its lines, starting or ending a Claude Code window, typing a prompt into a
  Claude session and reading the reply.
- **[SH]** — a shell command an agent can run in Windows PowerShell from the repo root: process
  listings, `Stop-Process` / `taskkill`, starting the recipe or a fixture server, reading
  `daemon.log`.
- **[USER]** — needs the user's own keyboard or judgement: the token, the Claude Code config, and
  any step a caution below reserves.

"[UI] `browser_status` in S1" means: in Claude session S1 type
`Call browser_status once and show its output verbatim. Do nothing else.` and read the reply. Other
tool calls are typed the same way, with the JSON given in the row. The judge compares the **tool
output** (not the model's paraphrase of it) with Expected. Every Expected item is a literal text, a
count, or a comparison of two values the steps print, so an automated run can mark PASS/FAIL from
text or a screenshot.

**Automation cautions** (cited per row as A1…A10):

- **A1 — the driver must not be a bridge client.** A driver that is itself a Claude Code session
  with the chrome-agent-bridge MCP configured is one more `claude-code #<pid>` client: it changes
  every `Clients (<n>)` line and every `(<n> clients)` count in the log (MUX-1, MUX-2, MUX-3, MUX-5,
  MUX-8), keeps the daemon from idling (MUX-4), and can spawn the daemon itself, becoming its parent
  (MUX-1, MUX-4, MUX-6, MUX-7). Run the driver without the bridge MCP (its `/mcp` lists no
  `chrome-agent-bridge`). Check before the wave **[SH]**: the command under "Driver check" below
  prints nothing. If it cannot be avoided, record the driver's MCP pid as `<X>`, add
  `claude-code #<X>` to every expected client list and count, and skip MUX-4, MUX-6 and MUX-7 (their
  preconditions cannot hold).
- **A2 — kills target identified PIDs only, never the driver.** PIDs come from command lines
  (`mcp\dist\index.js`, `daemon\dist\index.js`), the parent chain, and the pid printed in
  `claude-code #<M>`. Never kill by name (`taskkill /IM node.exe`, `Stop-Process -Name node`).
  Before every `Stop-Process` / `taskkill` in MUX-7 run `Test-SafeToKill <pid>`; it must print
  `safe: …`. `UNSAFE: …` means the target's tree contains the driver's own process
  (`Get-DriverChain`): stop and ask the user. `Test-SafeToKill` checks only the driver's
  **ancestor chain** (its shell, `claude.exe`, the hosting terminal): it does not see the driver's
  descendants (its own MCP servers and their children) or sibling sessions (S1…S5, or any other
  Claude session the user has open), so `safe: …` only means "this kill does not take down the
  driver itself". It is not a check that the PID is the intended target: confirm that from the
  `<M>` / `<P>` / `<D>` derivation (MUX-7), and make sure the user has no unrelated Claude session
  open during MUX-7 (A1 already requires the driver to have no bridge MCP of its own).
- **A3 — closing Chrome kills a driver that lives in it.** MUX-8 (and CONN-2 (b), CONN-6) close
  Chrome; a browser driver running inside that Chrome dies with it. Do those steps with desktop
  automation, or have the user do them.
- **A4 — the active tab is part of the measurement.** The bridge acts on the active tab, and
  `browser_status` / `listTabs` print it. A browser driver that opens, focuses or switches a tab in
  the same Chrome between a row's steps changes what is measured. Sensitive rows: MUX-1
  (`Active tab`), MUX-2 (both snapshots are of the same tab), MUX-3 (`listTabs` active id =
  `browser_status`'s), MUX-9 (every action targets the playground tab), DL-1 (a) ("the active tab
  does not change"), DL-2 (a) (`browser_evaluate` runs in the active tab). In these rows the driver
  touches Chrome only to read the service-worker console (its own DevTools window, not a tab) or to
  take a screenshot; a desktop driver does not click the tab strip.
- **A5 — any client disturbs the idle timer.** In MUX-4, from the recipe's exit to the daemon's
  exit nothing may connect to the daemon — no `browser_status`, no recipe, no driver status check
  through the bridge (a connect cancels the idle timer, `daemon/src/idle.ts`). Observe only with
  `daemon.log` and the process listing **[SH]**.
- **A6 — DevTools on the page blocks the debugger.** The page's own DevTools is a debugger on that
  tab; before Chrome 152, `browser_evaluate` and trusted clicks then fail with "Another debugger is
  already attached…" (TRUST-3, EVAL-16). In MUX-9 and DL-2 (a), open the page console only after
  the tool call has returned, and close it before the next call. The service-worker console does
  not have this effect.
- **A7 — timed checks are measured by the shell, not by eye.** Steps with a time bound (MUX-4,
  MUX-7 (b), (c), (e)) are judged by the loops in the command block, which print elapsed seconds; a
  UI driver's own latency (screenshots, typing) is not part of the measurement. MUX-8's time is
  the recipe's own `<ms>`.
- **A8 — the token never enters the driver.** Generating `bridge.token` is **[SH]** and prints
  nothing; putting it into the extension's Options is **[USER]**. A driver never reads
  `bridge.token`, the clipboard, or `$env:BRIDGE_TOKEN`. A screenshot of a terminal is safe only
  because no command of this plan prints the token; D6.3 prints counts.
- **A9 — Windows PowerShell 5.1 and `—`.** The recipe's lines and some log lines contain `—`
  (U+2014). PowerShell 5.1 decodes a program's output with the console code page and reads a file
  without a byte-order mark as ANSI, so `—` turns into `â€"` and the text no longer matches. §1
  item 8's helpers set `[Console]::OutputEncoding` to UTF-8 and read files with `-Encoding UTF8`;
  every command below does the same. Judge only text read that way.
- **A10 — the debugging banner is transient.** It shows while a trusted click or `browser_evaluate`
  runs and clears after. A desktop driver judges "banner appeared" from a screenshot of the Chrome
  window taken while the call is in flight, and "cleared" / "no banner" from one taken ≥ 5 s after
  the reply. If it cannot capture the window during the call, that sub-check is **[USER]**.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| MUX-1 ★ | The first knock starts the daemon | **[UI]** end every Claude session; **[SH]** no daemon running (§1 item 8). **[UI]** Chrome open with the extension enabled; **[SH]** the item-7 fixture served. **[UI]** start Claude Code (session S1) in the repo; **[UI]** `browser_status` in S1 (again after ~15 s if the extension line says not connected: with decision #27 the MCP reports the daemon at once and the extension once it has connected). **[SH]** `Get-BridgeDaemon`; `Get-BridgeProcs`; `Get-BridgeLog 8`. *Automation caution: A1 (the driver's own MCP would be client 1 and could be the daemon's parent), A4.* | `browser_status` prints four lines: `Daemon: connected on 127.0.0.1:9234 (build <sha>, up <n>s)`, `Clients (1): claude-code #<M>`, `Extension: connected`, `Active tab: [<T#>] <title> — <url>` (*superseded 2026-10-22: was `[<id>]`, because Step 7 T4 prints a handle*) and, since Step 8 S5, a fifth line `Cursor: none yet — the first tab tool claims the human's active tab` (S1 has run no tab tool yet; *corrected 2026-10-23 (Step 8 S5), before any run of the S5 build: was "four lines", because S5 adds the `Cursor:` line*), where `<sha>` equals `Get-DaemonBuild`. `<M>` is the pid printed in `claude-code #<M>` — the MCP's own `node.exe`; its parent, the nvm shim, has the same `mcp\dist\index.js` command line, so the command line alone does not identify `<M>`. `Get-BridgeProcs` lists `<M>`. `Get-BridgeDaemon` lists **exactly one** process, `ParentProcessId` = `<M>`. The log's newest lines, in order: `start pid=<D>`, `config pid=<D> port=9234 idleMs=600000 build=<sha>`, `listening on 127.0.0.1:9234`, `client + "claude-code #<M>" (1 client)`, with `<D>` = the listed daemon pid. |
| MUX-2 ★ | A second Claude session connects alongside | **[UI]** with S1 still open, start a second Claude Code session S2 in another terminal, in the repo. **[UI]** `browser_status` in S1 and S2; **[UI]** in S1, `browser_navigate {"url":"http://localhost:8080/e2e-playground.html"}`; **[UI]** `browser_snapshot` in S1, then in S2. **[SH]** `Get-BridgeDaemon`; `Get-BridgeLog 3`. *Automation caution: A1, A4 (nothing may switch the tab between the two snapshots).* | Both `browser_status` print the same `build <sha>` and `Clients (2): claude-code #<M1>, claude-code #<M2>` (the same order in both). Both snapshots contain `textbox "Email address" [ref=…]` and `button "Sign in" [ref=…]` — the same active tab (tab leases arrive in Step 7). `Get-BridgeDaemon`: exactly one process, the same `<D>` as MUX-1. Log: `client + "claude-code #<M2>" (2 clients)`; no `start` line after MUX-1's. |
| MUX-3 ★ | A script works while Claude is connected | With S1 and S2 connected: **[SH]** run the MUX-3 commands below (the recipe in the background with a 60 s hold, output to `mux3.out`). **[SH]** wait until `mux3.out` contains `holding the connection`; then **[UI]** `browser_status` in S1. **[SH]** after the recipe exits: its exit code and output (the block prints them). **[UI]** `browser_status` in S1 again; **[SH]** `Get-BridgeLog 3`. *Automation caution: A1, A4.* | `mux3.out`, in order: `<ts> hello-recipe: connecting (pid <n>)`; `<ts> hello-recipe: connected in <ms> ms as client c<k> — daemon build <sha>, proto 2`; `<ts> hello-recipe: daemon.status — port 9234, up <n>s, extension connected, clients (3): claude-code #<M1>, claude-code #<M2>, hello-recipe`; `<ts> hello-recipe: listTabs — <n> tab(s); active: [<id>] <title>` (the same tab as `browser_status`'s `Active tab`: the recipe still prints the Chrome tab id, `browser_status` prints the handle `[<T#>]`, so compare the titles; *superseded 2026-10-22: was "the same `<id>` as", because Step 7 T4 prints handles in `browser_status` and `recipes/hello.ts` was not changed*); `<ts> hello-recipe: holding the connection for 60000 ms — call browser_status now`; `<ts> hello-recipe: still connected after the hold — clients (3)`; `<ts> hello-recipe: closed after <ms> ms — OK`. `mux3.err` empty; exit code `0`. During the hold, `browser_status` prints `Clients (3): claude-code #<M1>, claude-code #<M2>, hello-recipe`; afterwards `Clients (2): claude-code #<M1>, claude-code #<M2>`. Log: `client + "hello-recipe" (3 clients)`, then `client - "hello-recipe" (2 clients)`; no new `start` line. (The recipe prints `FAILED` and exits 1 if its connection dropped during the hold.) |
| MUX-4 | Idle exit after the last client leaves | **[UI]** end **every** Claude session (`/exit`). **[SH]** stop the daemon (§1 item 8; it was started with the default 600000 ms). **[UI]** open the service-worker console. **[SH]** run the MUX-4 commands below: the recipe starts a fresh daemon with `BRIDGE_DAEMON_IDLE_MS=20000` set in **the recipe's** environment (the SDK passes the starter's whole environment to the daemon it spawns, `sdk/src/spawn.ts`), takes `$t0` from the recipe's own `closed after … — OK` timestamp, and polls until the daemon process is gone (`$t1`); its last step waits until 30 s after `$t1` and runs `Get-BridgeDaemon` again. **[UI]** read the service-worker console after `$t1`. *Automation caution: A1, A5 (do not call `browser_status` or anything else that connects until the block has finished, i.e. printed its `… s after $t1` line), A7.* | The recipe's last line is `<ts> hello-recipe: closed after <ms> ms — OK`. Log, in order: `config pid=<D> port=9234 idleMs=20000 build=<sha>`, …, `client - "hello-recipe" (0 clients)` at **T0**, `idle for 20000 ms with no clients — shutting down` at **T1**, `exit 0 (shutdown 1001) clients=0 extensionEvents=<n> ignoredClientFrames=<n>`. **T1 − T0 = 19, 20 or 21 s** (log stamps are whole seconds; the timer is armed when the client count drops to 0, `daemon/src/idle.ts`). The block's `$t1 − $t0` (recipe close → process gone) is **19.5–22.0 s** (20 s, plus up to 1 s of close grace, plus the 250 ms poll). Service-worker console: a `[bridge] connection: down` line, then further `connection: down` lines as each reconnect attempt fails (backoff 0.5 s doubling to 10 s). `Get-BridgeDaemon` prints nothing when checked ≥ 30 s after `$t1` (nothing starts a daemon again): the block's last step prints `<s> s after $t1: Get-BridgeDaemon lists 0 process(es)` with `<s>` ≥ 30.0, and no process row after it. |
| MUX-5 | Handover to a new build, MCP follows | **[UI]** one Claude session S1 connected to a running daemon; **[UI]** `browser_status` → note `build <old>` and `up <n>s`; **[SH]** `Get-BridgeDaemon` → pid `<D1>`. **[SH]** change the build: `Add-Content -Path .\daemon\dist\index.js -Value "// MUX-5 marker $(Get-Date -Format o)"`, then `Get-DaemonBuild` → `<new>`. **[SH]** `npx tsx recipes/hello.ts`. **[UI]** within 15 s, `browser_status` and then `browser_snapshot` in S1 (no `/mcp`). **[SH]** `Get-BridgeDaemon`; `Get-BridgeLog 15`. **[UI]** the service-worker console. **[SH] Undo:** `npm run build --workspace daemon` (regenerates the file; `Get-DaemonBuild` returns to `<old>`, and the next client hands over again). *Automation caution: A1 (a driver's MCP would be one more client the old daemon logs and the new daemon must accept).* | Recipe: `connected in <ms> ms as client c<k> — daemon build <new>, proto 2` with `<new>` ≠ `<old>`, then `daemon.status — port 9234, up 0s` or `up 1s` (a fresh daemon), and `… — OK`; exit 0. The SDK prints no "upgraded" message (none exists); the handover shows as `<new>`, the reset uptime, the new pid and the log. **Log** (lines from several processes interleave; only these constraints are judged): (1) the old daemon `<D1>` writes `client + "hello-recipe" (2 clients)`, then a `client - "…"` line for each of its clients, then `exit 0 (shutdown 4002) clients=0 extensionEvents=<n> ignoredClientFrames=<n>` — every old-daemon `client -` line comes before that `exit` line; (2) after it, one or two `start pid=…` / `config pid=… port=9234 idleMs=600000 build=<new>` pairs, possibly interleaved, the second starter's `start` possibly first; `<D2>` is the pid whose `config` line comes before `listening on 127.0.0.1:9234` and equals `Get-BridgeDaemon`'s pid; (3) exactly one `listening on 127.0.0.1:9234` after the `exit` line; (4) if there are two starters, the other one writes `port 9234 in use — another daemon owns it` and `exit 0 (port in use)` (the MCP's reconnect started one too and lost the bind); (5) `client + "hello-recipe" (…)` and `client + "claude-code #<M>" (…)` after `listening`, in either order. S1's `browser_status`: `Daemon: connected on 127.0.0.1:9234 (build <new>, up <n>s)`, its client still `claude-code #<M>` (the MCP reconnected on 4002 without `/mcp`); `browser_snapshot` returns a snapshot (no error). `Get-BridgeDaemon`: exactly one, pid `<D2>` ≠ `<D1>`. Service-worker console: `connection: down` then `connection: up`. *Informs decisions #22, #23, #24.* |
| MUX-6 ★ | Two scripts race with no daemon | **[UI]** end every Claude session; **[SH]** stop the daemon; `Get-BridgeDaemon` prints nothing. **[SH]** run the MUX-6 commands below (two recipes started back to back with `Start-Process`, names `race-a` and `race-b`). *Automation caution: A1 (a driver's MCP would start the daemon first, and the race would not happen).* | **Judged by the process listing:** after both exit, `Get-BridgeDaemon` lists **exactly one** process. Both exit codes 0; each `.out` file ends with `<ts> race-a: closed after <ms> ms — OK` / `… race-b: …`; both `.err` files are empty. Log since the run: exactly one `listening on 127.0.0.1:9234`; one `start pid=…` (the second recipe found the first's daemon), or two, the loser writing `port 9234 in use — another daemon owns it` and `exit 0 (port in use)` (the race was exercised — record which); `client + "race-a" …` and `client + "race-b" …`. *Informs decision #25 (a lost bind race must not lose a log line).* |
| MUX-7 | The daemon vs. the death of the session that spawned it | Four kill methods in this order, plus an optional fifth; commands below. PIDs per session S<i>, from **[SH]** `Get-BridgeProcs` and `Get-BridgeDaemon`: `<M>` = the pid printed in that session's `claude-code #<M>` (**[UI]** `browser_status`); `<P>` = `<M>`'s `ParentProcessId` (the nvm shim if it is a `node.exe` with the same command line; if it is `claude.exe` there is no shim — record that, skip (c), and use `<M>` for `<P>` in (a) and (d)); `<D>` = `Get-BridgeDaemon`, whose `ParentProcessId` names the MCP that spawned it. Before each kill, **[SH]** `Test-SafeToKill <pid>` prints `safe: …` (A2). **(b) normal end:** **[UI]** end every session; **[SH]** stop the daemon; **[UI]** start S1 (it spawns `<D>`, parent `<M1>`); **[UI]** `/exit` in S1, then at once **[SH]** the (b) poll, then `Get-Process -Id <P1> -ErrorAction SilentlyContinue`. **(c) shim alone:** **[UI]** start S2 (it connects to `<D>`, no spawn); **[SH]** `Stop-Process -Id <P2> -Force` and the (c) poll; then **[UI]** `/mcp` in S2 and `browser_status`. **(a) tree kill while the MCP lives:** **[UI]** end all sessions; **[SH]** stop the daemon; **[UI]** start S3 (it spawns `<D3>`, parent `<M3>`); **[SH]** `taskkill /PID <P3> /T /F`. **(d, contrast) tree kill of a session that did not spawn the daemon:** **[SH]** no daemon; **[UI]** start S4; **[SH]** wait until `Get-BridgeDaemon` lists `<D4>` with `ParentProcessId` = `<M4>` (only then); **[UI]** start S5; **[SH]** `taskkill /PID <P5> /T /F`. **(e, optional — informs decision #15) a daemon killed under a live session:** with S4 still open, **[SH]** `Stop-Process -Id <D4> -Force` and the (e) poll; **[UI]** ≥ 20 s later, `browser_status` in S4 (no `/mcp`). After each of (a)–(e): **[SH]** `Get-Process -Id <daemon pid> -ErrorAction SilentlyContinue`, `Get-BridgeLog 5`. *Automation caution: A1 (a driver's MCP would be a session in every tree and could own the daemon), A2 (exclude the driver: `Get-DriverChain` lists its own processes; `Test-SafeToKill` refuses a tree that contains one), A7.* | **(b)** The (b) poll ends (prints `(b) M1 alive: False; waited <s> s` with `<s>` ≤ 10.0: `<M1>` gone), and `Get-Process -Id <P1> -ErrorAction SilentlyContinue` prints nothing (`<P1>` gone too; with no shim, skip this check); **`<D>` is still alive** (`Get-Process -Id <D>` lists it); log: `client - "claude-code #<M1>" (0 clients)` and no `exit` line. **(c)** The (c) poll prints ≤ 4.5 s (`mcp/src/lifecycle.ts` polls its parent every 2 s); `<D>` alive; log `client - "claude-code #<M2>" (0 clients)`; after `/mcp`, S2's `browser_status` shows a new `claude-code #<pid>` connected to the same `<D>` (no new `start` line). **(a)** Per the Stage 0 measurement (`stage0-audit.md` F3: Windows keeps a detached child's `ParentProcessId`, so `taskkill /T` walks into it): `taskkill` prints a `SUCCESS: The process with PID <D3> (child process of PID <M3>) has been terminated.` line and **`<D3>` is gone**; no `exit` line in the log (a hard kill); service-worker console `connection: down`. This is the expected, measured behaviour, not a pass for "survives". **(d)** `taskkill`'s output names no `<D4>`; `<D4>` is **alive** (its parent is S4's MCP, not in S5's tree); S4's `browser_status` prints `Daemon: connected …` and `Extension: connected`. **(e)** The (e) poll lists a new daemon pid `<D5>` ≠ `<D4>` within ≤ 12.0 s (the MCP's 5 s retry, plus spawn and knock), `ParentProcessId` = `<M4>`; log: `start pid=<D5>` and `client + "claude-code #<M4>" (1 client)`, no `exit` line for `<D4>`; S4's `browser_status`: `Daemon: connected on 127.0.0.1:9234 (build <sha>, up <n>s)`, `Clients (1): claude-code #<M4>`, `Extension: connected` — without `/mcp`. *(b) and (a) inform decision #14: if `<D>` dies in (b), Claude Code ends MCP servers with a tree kill. If MUX-7 fails ((b), (c) or (d) not as expected), the fallback (a double spawn through a short-lived launcher) is built as a Step 7 prerequisite (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions; superseded: "the user's call"). (e) informs #15 (on a close other than 4002 the MCP reconnects on its 5 s retry).* |
| MUX-8 ★ | No Chrome: a script fails clearly, then recovers | Daemon up (S4 from MUX-7 or any session started it). **[UI, desktop driver or USER]** close Chrome completely (A3); **[SH]** `Get-Process chrome -ErrorAction SilentlyContinue` prints nothing (if not, turn off "Continue running background apps" and close again). **[SH]** `npx tsx recipes/hello.ts`; `$LASTEXITCODE`. **[UI]** meanwhile, `browser_status` in the connected session. **[UI, desktop driver or USER]** open Chrome; **[UI]** wait for the service worker's `connection: up`; **[SH]** run the recipe again. *(Optional)* **[UI, desktop driver or USER]** close Chrome again; **[SH]** start the recipe; **[UI, desktop driver or USER]** open Chrome within ~10 s. *Automation caution: A3 (a browser driver dies with Chrome), A1.* | First run, after ~15 s: `<ts> hello-recipe: FAILED after <ms> ms — NOT_CONNECTED: Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 9234)` with `<ms>` from 15000 to 16500; exit code 1 (the `NOT_CONNECTED` code: decision #21); log `client + "hello-recipe" (…)` and ~15 s later `client - "hello-recipe" (…)`. The connected session's `browser_status` meanwhile prints `Daemon: connected …` and `Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?` (decision #27: the MCP stays connected to the daemon while Chrome is closed; *corrected 2026-10-23 (Step 8 S5), before any run of the S5 build: was silent on it — that branch gets no `Cursor:` line, so this text is unchanged; once Chrome is back, `browser_status` ends with `Active tab: …` then `Cursor: …` as STAT-1 states*). Second run: the MUX-3 lines without the hold lines (`connecting`, `connected in …`, `daemon.status — …`, `listTabs — …`, `closed after <ms> ms — OK`), exit 0. Optional run: `… — OK`, exit 0, `closed after <ms>` under 15000 ms. *Informs decisions #21 and #27.* |
| MUX-9 ★ | Regression smoke through the daemon | In a session whose `browser_status` shows `Daemon: connected …` and `Extension: connected`: **[UI]** `browser_navigate {"url":"http://localhost:8080/e2e-playground.html"}` (a fresh load, so the counter starts at 0); `browser_snapshot` → refs. **ACT-1:** **[UI]** `browser_type {"ref":"<email ref>","text":"a@b.com"}`, then `browser_screenshot` (the `status:` line is not in a snapshot). **ACT-2:** **[UI]** `browser_click {"ref":"<counter ref>"}`, `browser_screenshot`. **TRUST-2:** **[UI]** `browser_click {"ref":"<trusted-only ref>","trusted":true}`, `browser_screenshot`; banner per A10. **EVAL-1:** **[UI]** `browser_evaluate {"expression":"document.title"}`; banner per A10. **NET-1** (written out as Run 6 ran it; §4.8's row omits the clear): **[UI]** `browser_network_clear {}`; `browser_navigate {"url":"http://localhost:8080/e2e-playground.html"}`; `browser_network_requests {}`; banner check per A10. Then **DL-1** (§4.13) — this **is** the DL-1 run: its evidence is recorded once, under DL-1, and DL-1 is not run again. *Automation caution: A4 (nothing may switch the tab during the row), A6, A10.* | Each matches its **last recorded run** (D6.4): **ACT-1** — `status: email = a@b.com` (Run 2, 2026-09-03; Run 3 marked it P without text). **ACT-2** — `status: counter = 1` (Run 6, NET-15). **TRUST-2** — `status: TRUSTED click received`, banner appeared and cleared (Run 6, NET-15). **EVAL-1** — `Agent Bridge E2E Playground` (text: Run 6, NET-15), banner appeared and cleared (banner: Run 5). **NET-1** — `Cleared <n> requests.`, then `Network — active tab: showing 1 of 1 (recording since <t> ago; 0 pending)` and `[<id>]  <t> ago   GET     200  document    <n>ms  12.6 KB  http://localhost:8080/e2e-playground.html`, no banner (Run 6; the fixture is still 12 914 bytes). *Corrected 2026-10-22 (Step 7 T5, before any run): the size is now **`12.8 KB`** — T1's popup link grew the fixture from 12 914 to 13 106 bytes (13 106 / 1024 = 12.80), and the size is the served `Content-Length` (decisions.md · 2026-10-22 · NET-1's expected size follows the fixture to `12.8 KB` (#56)); every other part of the NET-1 text is unchanged.* *Corrected 2026-10-22 (W1): was `12.9 KB`, Run 6's figure, which came from a CRLF checkout of the fixture (13 168 bytes); the 12 914-byte LF file prints `12.6 KB`, and `.gitattributes` now pins `test-fixtures/*.html` to LF (decisions.md · 2026-10-22 · The user rules on the W1 proposals).* **DL-1** — its own expected text (no earlier run). |
| MUX-10 | *(Optional)* A pre-Step-6 server on the port: the SDK side | CONN-7 covers the MCP side; this is the recipe's. **[UI]** end every session; **[SH]** stop the daemon. **[SH]** in a second worktree of a pre-Step-6 commit: `git worktree add ..\bridge-v1 1a92d95`, then `npm install` and `npm run build` there. **[SH]** in a **separate** PowerShell window, in `..\bridge-v1`: `$env:BRIDGE_TOKEN = (Get-Content <repo>\bridge.token -Raw).Trim(); node server\dist\index.js` (same token, so the old server accepts the hello; nothing is printed; the variable lives only in that window). **[SH]** here: `npx tsx recipes/hello.ts`; `$LASTEXITCODE`; `Get-BridgeDaemon`. **[SH]** stop the old server (Ctrl-C in its window, or `Stop-Process` on the `node.exe` whose command line contains `bridge-v1\server\dist\index.js`, after `Test-SafeToKill`), close that window; run the recipe again. **[SH] Cleanup:** `git worktree remove ..\bridge-v1` (if it refuses because of build output, check `git -C ..\bridge-v1 status --short --untracked-files=no` prints nothing, then add `--force`); `git worktree list` no longer shows `bridge-v1`; `Test-Path Env:BRIDGE_TOKEN` here prints `False`. *Automation caution: A2, A8.* | ``<ts> hello-recipe: FAILED after <ms> ms — VERSION: No welcome from 127.0.0.1:9234 within 2 s after hello: a pre-Step-6 bridge server holds port 9234. End the old Claude session (or stop the old `node …/server/dist/index.js`) and try again.`` with `<ms>` from 2000 to 3000; exit code 1; `Get-BridgeDaemon` prints nothing (no spawn, no handover). After the old server stops, the rerun starts a daemon and ends `… — OK`, exit 0. *Informs decision #13.* |

**Driver check** (before the wave, when a driver runs it — A1): prints nothing when the driver has
no bridge MCP of its own.

```powershell
$chain = Get-DriverChain
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match '(mcp|server)[\\/]dist[\\/]index\.js' -and $chain -contains $_.ParentProcessId } | Select-Object ProcessId, ParentProcessId, CommandLine
```

**Commands** (PowerShell, repo root; helpers from §1 item 8):

```powershell
# MUX-3 — the recipe in the background, so browser_status can be called during its 60 s hold
$out = "$env:TEMP\bridge-e2e"; New-Item -ItemType Directory -Force $out | Out-Null
$p = Start-Process -PassThru -NoNewWindow -FilePath node -ArgumentList '--import', 'tsx', 'recipes/hello.ts', '60000' `
  -RedirectStandardOutput "$out\mux3.out" -RedirectStandardError "$out\mux3.err"
$null = $p.Handle   # keeps ExitCode readable after exit
while (-not $p.HasExited -and -not (Select-String -Path "$out\mux3.out" -SimpleMatch -Pattern 'holding the connection' -Quiet)) { Start-Sleep -Milliseconds 500 }
if ($p.HasExited) { 'MUX-3 FAIL: the recipe exited before its hold' } else { 'now call browser_status in S1' }
$p | Wait-Process
'exit code: {0}' -f $p.ExitCode
Get-Content "$out\mux3.out" -Encoding UTF8; Get-Content "$out\mux3.err" -Encoding UTF8

# MUX-4 — idle exit. No Claude session running; no daemon running.
$t1 = $null                                        # no stale $t1 from an earlier run
$env:BRIDGE_DAEMON_IDLE_MS = "20000"
$o = npx tsx recipes/hello.ts
Remove-Item Env:BRIDGE_DAEMON_IDLE_MS
$o
$closed = @($o | Where-Object { $_ -match 'closed after \d+ ms' })
if ($closed.Count -ne 1) {
  'MUX-4 FAIL: the recipe printed no "closed after" line'
} else {
  $t0 = [DateTimeOffset]::Parse(($closed[0] -split ' ')[0], [Globalization.CultureInfo]::InvariantCulture)
  while (Get-BridgeDaemon) { Start-Sleep -Milliseconds 250 }
  $t1 = [DateTimeOffset]::UtcNow
  "{0:o}  ->  {1:o}  =  {2:N1} s" -f $t0.UtcDateTime, $t1.UtcDateTime, ($t1 - $t0).TotalSeconds
}
Get-BridgeLog 8
# the last MUX-4 check: wait until 30 s after $t1, then no daemon may be running
if ($t1) {
  $left = 30 - ([DateTimeOffset]::UtcNow - $t1).TotalSeconds
  if ($left -gt 0) { Start-Sleep -Milliseconds ([int]($left * 1000)) }
  $late = @(Get-BridgeDaemon)
  '{0:N1} s after $t1: Get-BridgeDaemon lists {1} process(es)' -f ([DateTimeOffset]::UtcNow - $t1).TotalSeconds, $late.Count   # expected: >= 30.0 s, 0
  $late                                            # expected: nothing
}

# MUX-6 — race. No Claude session running; Get-BridgeDaemon prints nothing.
$out = "$env:TEMP\bridge-e2e"; New-Item -ItemType Directory -Force $out | Out-Null
$procs = foreach ($n in 'race-a', 'race-b') {
  $env:RECIPE_NAME = $n
  $p = Start-Process -PassThru -NoNewWindow -FilePath node -ArgumentList '--import', 'tsx', 'recipes/hello.ts' `
    -RedirectStandardOutput "$out\$n.out" -RedirectStandardError "$out\$n.err"
  $null = $p.Handle   # keeps ExitCode readable after exit
  $p
}
Remove-Item Env:RECIPE_NAME
$procs | Wait-Process
$procs | Select-Object Id, ExitCode
Get-BridgeDaemon                                   # the evidence: exactly one row
Get-Content "$out\race-a.out", "$out\race-b.out" -Encoding UTF8; Get-Content "$out\race-a.err", "$out\race-b.err" -Encoding UTF8
Get-BridgeLog 12

# MUX-7 — PIDs and kills (fill in <…> from Get-BridgeProcs / Get-BridgeDaemon / browser_status)
Get-BridgeProcs
Get-BridgeDaemon
Get-DriverChain                                    # the driver's own processes: never a target (A2)
Test-SafeToKill <pid>                              # before every kill: must print "safe: ..."
Get-Process -Id <D> -ErrorAction SilentlyContinue  # after each kill: listed = alive
# (b) run right after typing /exit in S1
$s = Get-Date; while ((Get-Process -Id <M1> -ErrorAction SilentlyContinue) -and ((Get-Date) - $s).TotalSeconds -lt 10) { Start-Sleep -Milliseconds 200 }
'(b) M1 alive: {0}; waited {1:N1} s' -f [bool](Get-Process -Id <M1> -ErrorAction SilentlyContinue), ((Get-Date) - $s).TotalSeconds
Get-Process -Id <P1> -ErrorAction SilentlyContinue # (b) the shim: expected no output (gone too)
# (c) the nvm shim alone
Stop-Process -Id <P2> -Force; $s = Get-Date
while ((Get-Process -Id <M2> -ErrorAction SilentlyContinue) -and ((Get-Date) - $s).TotalSeconds -lt 10) { Start-Sleep -Milliseconds 200 }
'(c) M2 alive: {0}; waited {1:N1} s' -f [bool](Get-Process -Id <M2> -ErrorAction SilentlyContinue), ((Get-Date) - $s).TotalSeconds
# (a) the MCP's whole tree while the MCP lives
taskkill /PID <P3> /T /F
# (d) a tree that did not spawn the daemon (only after Get-BridgeDaemon shows <D4> with parent <M4>)
taskkill /PID <P5> /T /F
# (e, optional) the daemon killed under a live session; polls up to 15 s for a new one
Stop-Process -Id <D4> -Force; $s = Get-Date
do { Start-Sleep -Milliseconds 250; $d = @(Get-BridgeDaemon | Where-Object { $_.ProcessId -ne <D4> }) } until ($d.Count -ge 1 -or ((Get-Date) - $s).TotalSeconds -gt 15)
'(e) waited {0:N1} s' -f ((Get-Date) - $s).TotalSeconds; $d
```

**Log hygiene before the log is attached (exit check D6.3).** All three steps are **[SH]**; the
token is read into a variable and never printed (A8). At the end of the wave, copy the log and
count — never print — the matches in the copy that becomes the evidence:

```powershell
$ev = "$env:TEMP\bridge-e2e\daemon-wave.log"; Copy-Item $log $ev
(Select-String -Path $ev -SimpleMatch -Pattern '://' | Measure-Object).Count                  # expected 0
$t = (Get-Content .\bridge.token -Raw).Trim()
(Select-String -Path $ev -SimpleMatch -Pattern $t | Measure-Object).Count                     # expected 0
Remove-Variable t
(Select-String -Path $ev -SimpleMatch -Pattern '[line withheld:' | Measure-Object).Count      # expected 0
```

Expected: `0`, `0`, `0`. A non-zero first or second count fails D6.3 and the log is **not**
attached. A withheld line (`[line withheld: contained a URL or the token]`) means the daemon tried
to log one; record it as a finding, with the line before it.

### 4.13 Download (`browser_download`: DL-1, DL-2)

*Added 2026-10-22 by Step 6 stage D6, before any run (decisions.md · 2026-10-21 · Step 6 writes
the DL rows for browser_download before its D6 wave); revised the same day by the D6 fixer. Fixtures:
§1 items 7 and 8. Replace `<you>` with your Windows user name (**[SH]** `$env:TEMP` must print
`C:\Users\<you>\AppData\Local\Temp`; if it prints another folder, use that folder in the `path`
arguments, backslashes doubled in JSON). Tags as in §4.12. The tool's output format is
`mcp/src/tools/registry.ts` (`browser_download`); the extension logs `[bridge] download held <n>
bytes` and never the URL. DL-1 runs once, as the last step of MUX-9.*

| ID | Objective | Steps | Expected |
|---|---|---|---|
| DL-1 ★ | A plain download is saved with its sha256 | (0) **[SH]** reset the target: `Remove-Item -Recurse -Force "$env:TEMP\bridge-e2e\dl1" -ErrorAction SilentlyContinue; Test-Path "$env:TEMP\bridge-e2e\dl1"`. (a) **[UI]** `browser_status` (before); **[UI]** `browser_download {"url":"http://localhost:8080/dl/hello.txt","path":"C:\\Users\\<you>\\AppData\\Local\\Temp\\bridge-e2e\\dl1\\"}`; **[UI]** `browser_status` (after); **[UI]** service-worker console; banner per A10. (b) **[SH]** `Get-FileHash "$env:TEMP\bridge-e2e\dl1\hello.txt" -Algorithm SHA256`; `Get-ChildItem "$env:TEMP\bridge-e2e\dl1" -Name`. (c) **[UI]** repeat (a) unchanged. (d) **[UI]** repeat (a) with `"overwrite":true`. *Automation caution: A4 (the active tab is judged in (a)), A10.* | (0) `False`. (a) Exactly two lines: `Saved C:\Users\<you>\AppData\Local\Temp\bridge-e2e\dl1\hello.txt` and `69 bytes · text/plain · sha256 0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce` — no `(followed redirects …)` line, no `Warning:` line; no debugging banner; both `browser_status` calls print the same line `Active tab: [<T#>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html` (the MUX-9 playground tab, the same handle before and after: the download opened no tab and switched none; *superseded 2026-10-22: was `[<id>]`, because Step 7 T4 prints a handle*); service-worker console `[bridge] download held 69 bytes`. (b) Hash `0A6B99CA15C2A72AD024D78D94D3980833B77EFDA41AF17D0571D21FEE2956CE`; the listing is exactly `hello.txt` (no `hello.txt.part`). (c) The tool fails with `C:\Users\<you>\AppData\Local\Temp\bridge-e2e\dl1\hello.txt exists — pass overwrite:true to replace it`. (d) The two lines of (a) again. |
| DL-2 ★ | A cross-origin redirect is followed by the service-worker fetch, which the page could not do | (0) **[SH]** reset the target: `Remove-Item -Recurse -Force "$env:TEMP\bridge-e2e\dl2" -ErrorAction SilentlyContinue; Test-Path "$env:TEMP\bridge-e2e\dl2"`. **[SH]** the redirect fixture runs (§1 item 8: `127.0.0.1:8081`; `/page` is a small same-origin HTML page, every other path a `302` to `http://localhost:8080/dl/hello.txt`, no CORS headers). (a) **[UI]** `browser_navigate {"url":"http://127.0.0.1:8081/page"}`; `browser_evaluate {"expression":"fetch('/page').then(r => r.status)"}`; `browser_evaluate {"expression":"fetch('/dl2').then(r => r.status)"}`; **[SH]** the fixture's log (§1 item 8). (b) **[UI]** `browser_download {"url":"http://127.0.0.1:8081/dl2","path":"C:\\Users\\<you>\\AppData\\Local\\Temp\\bridge-e2e\\dl2\\"}`. (c) **[SH]** `Get-FileHash "$env:TEMP\bridge-e2e\dl2\hello.txt" -Algorithm SHA256`. *Automation caution: A4, A6 (open the page console, if at all, only after (a)'s second evaluate has returned).* | (0) `False`. (a) The first evaluate returns `200`; the second returns a tool error containing `TypeError: Failed to fetch`; the fixture's log has a `"GET /dl2 HTTP/1.1" 302 -` line. **What the contrast proves:** the page can fetch from its own origin (`/page` → 200), and `/dl2` is a URL of that same origin, so the only thing that stops the page is the cross-origin `302` to `localhost:8080`, whose response carries no `Access-Control-Allow-Origin` — the Blackboard → signed-S3 shape `browser_download` exists for. (The item-7 server may also log a `GET /dl/hello.txt`: the browser followed the redirect, then refused the response to the page. Recorded, not judged.) (b) Three lines: `Saved C:\Users\<you>\AppData\Local\Temp\bridge-e2e\dl2\hello.txt`, `69 bytes · text/plain · sha256 0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce`, `(followed redirects to localhost:8080)`. The file is named `hello.txt`, not `dl2`: the name comes from the final URL's last segment (no `content-disposition`), which proves the redirect was followed. The fixture's log has another `"GET /dl2 HTTP/1.1" 302 -` line and the item-7 server's log a `"GET /dl/hello.txt HTTP/1.1" 200` line. (c) The hash of DL-1 (b). |

### 4.14 Multi-actor tabs (Step 7: RELOAD-1, RESOLVER-1, LEASE-1…7, SCREEN-1…5, BG-1…4)

*Added 2026-10-22 by Step 7 stage T5, before any run (exit check T5.1; the PASS rules of the Stage 0
audit's "Lens (d)", pre-registered by decisions.md · 2026-10-22 · Stage 0's check sharpenings and T5
PASS rules (#48), copied here and only made stricter). The driver runs every step itself (decisions.md
· 2026-10-22 · Live E2E waves are run by Claude end to end (#33)); the order, the set-up and the commands
are in the wave sheet
[`T5-wave-sheet.md`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md). Tags as in
§4.12 ([UI] / [SH] / [USER]); cautions A1–A10 of §4.12 hold, plus B1–B6 below.*

**Tools of this section** (all in `recipes/`, written before the run; `npx tsc --noEmit -p recipes`
exit 0):
- `t5.ts <command>` — the SDK-side steps (one command per row; its header lists them). Every line is
  `<ts> <name>: <message>`, the format of `recipes/hello.ts`; a row's verdict is its own
  `… PASS` / `… FAIL` line, computed from the conditions written below, and the driver also checks
  the conditions against the printed lines. It prints only fixture URLs.
- `t5-actor.ts start <name> --tools <list>|send|end <name>` — a headless Claude session (`claude -p --model sonnet
  --allowedTools mcp__chrome-agent-bridge__<each listed tool>`, stream-json input) that stays connected
  between prompts, so its leases outlive one turn. Each actor is allowed only the bridge tools its rows
  use (the wave sheet lists them), and the driver checks every `TOOL …` line against the step: an
  extra or different call makes the row invalid (recorded, rerun). `send` prints each tool call (`TOOL …`) and its output
  (`OUTPUT:` / `OUTPUT (isError):`, then the text verbatim) with times. The actor's client name is
  `claude-code #<pid>`; below `<A>`, `<B>`, … stand for the pid in actor A's, B's, … name, which the
  driver confirms is a `node.exe` in that actor's process tree (`Get-ProcTree <claude pid>`; the
  "process-tree check" below).
- `t5-png.ts` — reads a PNG's size and the colour at a pixel (`--transcript` for an actor's images).
- `t5-win.ps1` — window handles, topmost, minimize, close by `WM_CLOSE`, the `PrintWindow` capture
  loop, UI Automation for `chrome://` pages.

**Markers.** Every tab a row uses is a fixture page `http://localhost:8080/e2e-playground.html?t5=<marker>`
(below: `…?t5=<marker>`), opened by the driver in **its own** Chrome windows (`Open-T5Window`) or by a
script (`newTab`). `t5.ts find <marker>` prints its handle. Colour bars (`t5.ts mark`, or a script)
make each capture identifiable by one pixel: `t5-png.ts` names the colour at (20, 20).

**Cautions B1–B6** (in addition to A1–A10):
- **B1 — the human's tab must be the driver's.** "The human's tab" is the active tab of the
  last-focused normal Chrome window (#43). Before every row whose actor makes an untargeted call or
  opens a tab, **[SH]** `npx tsx recipes/t5.ts find --current` must print `<T#> fixture` — run it
  **immediately before** each actor prompt that makes an untargeted first touch or calls
  `browser_new_tab`, not only at the start of the row; if it prints `not a fixture page`, focus the
  driver's window (`Set-T5Foreground`) and check again. A script refuses to start otherwise
  (`… FAILED — Error: SET-UP: the human's tab is not a fixture page …`, exit 2). If an actor's output
  ever shows a `url:` that is not a fixture URL, stop the row at once, record only "non-fixture tab
  touched — row invalid", and do not copy that output anywhere.
- **B2 — evidence shows fixture pages only** (T5.4). `browser_list_tabs` and `browser_status` print
  every tab; the run record copies only fixture lines and writes `[<n> non-fixture lines omitted]`
  for the rest. `t5-win.ps1` names only the wave's own windows (anchored titles; an extension's
  console `DevTools - chrome-extension://…`); any other window prints as `<other window>` or
  `<DevTools window>`. Window captures (`PrintWindow` frames) show Chrome's frame (bookmarks bar,
  profile and extension icons): they are judged by their band numbers and viewed by the driver, never
  committed uncropped; a capture of `chrome://discards` is never kept.
- **B3 — no DevTools window focused during a row** (LESSONS; MUX-5), except RESOLVER-1, which needs one
  and closes it before the next row.
- **B4 — the driver's windows must be uncovered** for SCREEN-1/2/3/5 and BG rows: Chrome marks the
  tabs of a fully covered window `hidden`, which would fake a flash. `Set-T5Topmost <hwnd>` (no
  activation) keeps a window on top; the scripts refuse with exit 3 (`SET-UP: the human's tab reports
  visibilityState hidden …`) if the human's tab is not `visible`.
- **B5 — one-turn sessions drop their leases.** `claude -p "<prompt>"` exits after its turn and the
  daemon releases its leases; rows where a lease must be seen by another actor use `t5-actor.ts`.
- **B6 — end actors, never tree-kill them.** `t5-actor.ts end <name>` closes the session's stdin, so
  its MCP exits normally; a tree kill of the daemon's spawner kills the daemon (#14, MUX-7 (a)).

| ID | Objective | Steps | Expected |
|---|---|---|---|
| RELOAD-1 ★ | The reloaded extension is the new build (the run's first recorded line) | **[USER]** the extension reload (`chrome://extensions` → ↻ on Chrome Agent Bridge), the only [USER] step of the wave. Then: **[SH]** `Get-DaemonBuild` (the sha256 recorded at the T5 build) and `npx tsx recipes/t5.ts check`, with the driver's window W0 on `…?t5=check` focused (B1). | `connected as client c<k> — daemon build <sha>, proto 2, extension connected` with `<sha>` = the build recorded in the T5 ledger; `listTabs — <n> tab(s); human's tab (current): <T#> (fixture page)`; `listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1`; `snapshot <T#> — elements: yes (<n>); text field: absent`; `focusTab <T#> — ok`; `CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab`. **Any** `CHECK FAIL — …` line (e.g. `VERSION: the Chrome extension is an older build — reload it at chrome://extensions (↻ on Chrome Agent Bridge)`, `UNKNOWN_METHOD: unknown method: focusTab`, `windowId on every tab: no`, `elements: no`) means the reload did not take: stop and ask the user again (G7-2); no other row runs. *Covers kickoff §7 T5 item 2 and decisions.md #41/#42.* |
| RESOLVER-1 | "The human's tab" while a DevTools window has focus (#43; deferred G7-1 item) | Driver window Wr on `…?t5=resolver`. **[UI]** open `chrome://extensions` in its own window We, invoke **this** extension's **service worker** link (`Invoke-T5Uia <We> 'service worker' 'Chrome Agent Bridge'`, anchored to its card) → a DevTools window Wd opens; `Close-T5Window <We>`; `Set-T5Foreground <Wr>`, then `Set-T5Foreground <Wd>` (DevTools last focused, Wr the last-focused normal window). **[UI]** a fresh actor R: `browser_status`, then `browser_snapshot {}`. **[UI]** `Close-T5Window <Wd>`; `Set-T5Foreground <Wr>`. | `browser_status`'s last line `Active tab: [<T#>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=resolver`; the snapshot's first line `url: http://localhost:8080/e2e-playground.html?t5=resolver   title: "Agent Bridge E2E Playground"` — the same tab — and neither output contains `No normal Chrome window is focused` or `No active tab`. `Get-T5Foreground` before R's calls prints the DevTools window (`DevTools - chrome-extension://…`). Anything else is a FAIL of the resolver, recorded, never re-tuned (Stage 0 Lens (d)). |
| LEASE-1 ★ | Two Claude sessions: a held tab is refused, a new tab is one's own, both act in parallel | Driver window W1 on `…?t5=lease1` (B1). **[SH]** `t5-actor.ts start A`, `start B`. **[UI]** A: `browser_snapshot {}`. **[UI]** B: `browser_snapshot {}`. **[UI]** B: `browser_new_tab {"url":"http://localhost:8080/e2e-playground.html?t5=lease1-b"}`. **[UI]** both at once (two `send`s started within 1 s): A and B each `browser_click` on the `Click counter` button's ref from its own snapshot (B snapshots its new tab first), then `browser_snapshot {}`. **[UI]** A: `browser_list_tabs`. | A's first snapshot: `url: http://localhost:8080/e2e-playground.html?t5=lease1   title: "Agent Bridge E2E Playground"` and `button "Click counter: 0" [ref=e<N>]`. B's snapshot is an error, exactly `tab <T#a> is held by "claude-code #<A>" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab` (`<A>` = A's MCP pid, by the process-tree check). B's new tab: `Opened tab <T#b>`, `<T#b>` ≠ `<T#a>`. Parallel step: each prints `Clicked e<N>` and a snapshot of **its own** tab — A's `url: …?t5=lease1`, B's `url: …?t5=lease1-b` — each with `button "Click counter: 1"` (neither `0` nor `2`: no action reached the other's tab); the two `send` start times are recorded. A's list: `<T#a>  [claude-code #<A>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease1` and `<T#b>* [claude-code #<B>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease1-b` (`*` on whichever is the human's tab: B's `browser_new_tab` activates its tab, 0.8). Evidence names both actors. *Corrected 2026-10-23 (Step 8 S5), for runs of the S5 build only (Run 8's record stands): B has no cursor when it opens its tab (its claim was refused), so `browser_new_tab` opens `<T#b>` in the background and prints `Opened tab <T#b> (in the background — browser_focus_tab shows it)`; `*` stays on `<T#a>` unless the human switched.* |
| LEASE-2 ★ | A script and Claude at the same time: no interleaving | Driver window W2 on `…?t5=lease2-claude` (B1, B4). **[SH]** `t5.ts find lease2-claude` → `<T#c>`; **[SH]** actor C started; **[UI]** C: `browser_select_tab {"tab":"<T#c>"}`. **[SH]** `npx tsx recipes/t5.ts lease2` in the background, output to `lease2.out`; when it prints `typing started`, **[UI]** C: `browser_snapshot {}`, `browser_wait_for {"seconds":3}`, `browser_snapshot {}`, `browser_wait_for {"seconds":3}`, `browser_snapshot {}` (one prompt). | C: `Selected tab <T#c> (now this session's tab; not brought on screen — browser_focus_tab shows it)`. Script: `opened <T#s> for lease2-script (active), leased to t5-lease2`; `typing started — 30 trusted type calls into e<N>, one every 1500 ms`; no `type <i>/30 →` error line; `typing ended — 30/30 type calls ok, <s> s (<t0> → <t1>)` with `<s>` ≥ 30.0; `final value "lease2abcdefghijklmnopqrstuvwx"; final status "status: TRUSTED input = lease2abcdefghijklmnopqrstuvwx"`; `LEASE-2 script PASS — value exact: yes; status exact: yes; calls ok: 30/30; typing ≥ 30 s: yes`. C: three snapshot outputs, none an error, each starting `url: http://localhost:8080/e2e-playground.html?t5=lease2-claude   title: "Agent Bridge E2E Playground"`, none showing `lease2-script`; all three output times lie between `<t0>` and `<t1>` (stricter than Stage 0: the snapshots must overlap the typing). |
| LEASE-3 ★ | The opener rule: a popup is leased to the clicker, which is told | Driver window W3 on `…?t5=lease3-home` (B1). **[SH]** `npx tsx recipes/t5.ts lease3` in the background (`lease3.out`). When it prints `holding the opener lease`, **[UI]** an actor (C or a fresh one): `browser_list_tabs`. | Script: `opened <T#o> for lease3 (active), leased to t5-lease3`; `click e<N> (synthetic) — ok`; `after the synthetic click: leaseGranted … ; popup tabs: …` (recorded either way); if no event **and no popup tab**, the same two lines for the **trusted** click (a popup without an event is `LEASE-3 FAIL — the synthetic click opened a popup but no leaseGranted arrived within 5 s`, not a reason to retry); then `LEASE-3 PASS (<synthetic|trusted> click) — event tab <T#p>, reason opener, url the popup URL; listTabs owner of <T#p>: "t5-lease3"` — the event is `{"tab":"<T#p>","reason":"opener","url":"http://localhost:8080/e2e-playground.html?popup=1"}`. The actor's list has `<T#p>[*| ] [t5-lease3] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?popup=1`. Recorded: which click opened the popup, its `opener` id (T1 deferral: synthetic click, `openerTabId` under noopener). The event's arrival is the live proof of the offscreen relay's event frame (deferred G7-1 item). |
| LEASE-4 ★ | Disconnect releases: B can claim A's tab once A ends | After LEASE-1 (A and B running). **[UI]** B: `browser_select_tab {"tab":"<T#a>"}`. **[SH]** `t5-actor.ts end A`; `Get-BridgeLog 5`. **[UI]** B: `browser_select_tab {"tab":"<T#a>"}`, `browser_list_tabs`, `browser_snapshot {}`. | First select: error `tab <T#a> is held by "claude-code #<A>" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab`. `end A` prints `actor A ended after <ms> ms: … exit code 0`; the log has `client - "claude-code #<A>" (1 client)` (only B is left). Second select: `Selected tab <T#a> (now this session's tab; not brought on screen — browser_focus_tab shows it)`; the list's `<T#a>` line shows `[claude-code #<B>]`; the snapshot starts `url: http://localhost:8080/e2e-playground.html?t5=lease1`. Evidence names both actors. |
| LEASE-5 ★ | `TAB_GONE`: a leased tab closed by hand reports its last URL and title | Driver window W5 on `…?t5=lease5`, alone in its window. **[SH]** `npx tsx recipes/t5.ts lease5` in the background (`lease5.out`). When it prints `close the window titled "T5 LEASE5 target" now`, **[UI]** `Close-T5Window <hwnd>` (the window whose title is `T5 LEASE5 target - Google Chrome`, `Get-T5ChromeWindows`). | `holding <T#> (chrome id <n>, active in its window[, current], owner "t5-lease5"); title set to "T5 LEASE5 target"`; `event tabGone {"tab":"<T#>","lastUrl":"http://localhost:8080/e2e-playground.html?t5=lease5","lastTitle":"T5 LEASE5 target"}`; `snapshot <T#> → TAB_GONE: tab <T#> was closed — call listTabs to pick another tab · data {"tab":"<T#>","lastUrl":"http://localhost:8080/e2e-playground.html?t5=lease5","lastTitle":"T5 LEASE5 target"}`; `LEASE-5 PASS`. (The MCP shows only the message; the last URL and title travel in the event and the error's `data`, which only an SDK client sees.) |
| LEASE-6 | A leased background tab through a Memory-Saver discard and a reload (#45, F7) | Driver window W6 on `…?t5=lease6-home` (B1). **[SH]** `npx tsx recipes/t5.ts lease6` in the background (`lease6.out`). When it prints `discard <T#> now`, **[UI]** open `chrome://discards` in its own window Wx and invoke the discard action in the row titled `T5 LEASE6 target` (`Invoke-T5Uia <Wx> 'discard' 'T5 LEASE6 target'`, or computer use); then `Close-T5Window <Wx>`, `Set-T5Foreground <W6>`. The script reloads the tab itself (`focusTab`). | `before: <T#> (chrome id <id1>, background, owner "t5-lease6"); title "T5 LEASE6 target"`; a `while discarded: snapshot <T#> → …` line (recorded; as built `INTERNAL: The tab was discarded by Chrome's Memory Saver — call browser_navigate or focus it to reload`, F18); `focusTab <T#> (reloads the discarded tab) — ok`; `after reload: snapshot <T#> → ok (<n> elements), url http://localhost:8080/e2e-playground.html?t5=lease6`; then exactly one of `LEASE-6 PASS (a) — same chrome id, no replacement; the handle works after the reload` or `LEASE-6 PASS (b) — new chrome id <id2> (was <id1>), the same handle: tabReplaced was applied` (both PASS, #45; the row reports which). `LEASE-6 FAIL — …` (the handle gone, a new handle for the tab, or the snapshot failing after the reload) is a FAIL. `LEASE-6 not measured — no discard seen …` and `LEASE-6 not measured — the snapshot failed without a discard …` (the `while discarded:` line must carry `The tab was discarded by Chrome's Memory Saver`, else nothing was discarded) are set-up failures, not results. *The plan's "the SW console shows the replaced event" is not checked: the service worker logs no tab event (no URL rule), and opening its console disturbs the row (LESSONS); the handle and chrome id show the same fact.* |
| LEASE-7 ★ | A human-opened tab is unheld; `browser_select_tab` claims it | Driver window W7 on `…?t5=lease7-home`; no actor holds a tab in it. **[UI]** `Set-T5Foreground <W7>`, then `Open-T5Tab http://localhost:8080/e2e-playground.html?t5=lease7-human` (a new tab "by the human", no opener). **[UI]** an actor (B): `browser_list_tabs`; `browser_select_tab {"tab":"<T#h>"}`; `browser_list_tabs`. | First list: `<T#h>* Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease7-human` — `*` and **no** `[…]` holder. Select: `Selected tab <T#h> (now this session's tab; not brought on screen — browser_focus_tab shows it)`. Second list: `<T#h>* [claude-code #<B>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease7-human`. |
| SCREEN-1 ★ | Default-mode screenshot of a background leased tab; the flash measured | Driver window Ws on `…?t5=screen-human`, uncovered (`Set-T5Topmost`, B4), its tab current (B1). **[SH]** `npx tsx recipes/t5.ts screen1` (3 runs). **Flash method (pre-registered):** page-side `visibilitychange` timestamps (`performance.timeOrigin + performance.now()`) on the human's tab and on the target, installed by the script before each run; flash = the human tab's `visible` time minus its `hidden` time. | `human <T#h> (cyan bar), target <T#x> (magenta bar, background, leased to t5-screen1)`; per run `k`: `run k: call <ms> ms; image <w>x<h>, pixel(20,20) #ff00ff (magenta), …`; `run k: human tab hidden +<a> ms, visible again +<b> ms → flash <b−a> ms; target visible …, hidden …`; `run k: after — human <T#h> (…, active in its window, current); target <T#x> (…, background, …)`; `run k: PASS`; finally `SCREEN-1 PASS — flash per run <f1>, <f2>, <f3> ms; median <m> ms (method: …)`. Per run PASS = the image is the target (magenta at (20,20)), the human's tab visible again ≤ 2000 ms after the call started, and afterwards the human's tab active and current, the target in the background. Stricter than Stage 0: three runs, all must pass. The flash is reported as a number whatever it is; over 1000 ms is a finding (`finding: flash over 1 s`), not a FAIL. |
| SCREEN-2 ★ | `mode:"cdp"`: no switch, the banner, the target's image | As SCREEN-1's set-up. (Through the SDK: `browser_screenshot` has no `mode` argument in Step 7.) **[SH]** start the capture loop on Ws (`t5-win.ps1 -Capture -Hwnd <Ws> -Seconds 25 -IntervalMs 200`), then `npx tsx recipes/t5.ts screen2` (it waits 5 s before the call). **[SH]** `t5-png.ts <OUT>\screen2.png`; view it. | `screen2`: `call <t0> → <t1> (<ms> ms)`; `image <w>x<h>, pixel(20,20) #ff00ff (magenta), …`; `human tab hidden: never; target visible: never; after — human … active in its window …; target … background …`; `SCREEN-2 (Chrome side) PASS — no tab switch: yes; image is the target: yes; …`. Banner: at least one frame with a time between `<t0>` and `<t1>` + 1 s whose `band` differs from the frames before `<t0>`, and viewing it shows Chrome's "started debugging this browser" bar. The image shows the target page: the magenta `SCREEN-2 TARGET` bar and, below it, the heading `Agent Bridge E2E Playground` (viewed). |
| SCREEN-3 ★ | Simultaneous screenshots by several actors: each correct, serialised | (a) As SCREEN-1's set-up. **[SH]** `npx tsx recipes/t5.ts screen3` (three SDK clients `t5-screen3-a/b/c`, each with its own background tab, red / lime / blue, all three calls fired in the same tick). (b) **[SH]** `t5.ts open screen3-d --bar red`, `t5.ts open screen3-e --bar lime` (background tabs, released when the script exits); actors D and E: `browser_select_tab` on `<T#d>` / `<T#e>`; then both at once: `browser_screenshot {}`; **[SH]** `t5-png.ts --transcript <D's out.jsonl>` and E's. | (a) For each of a, b, c: `<T#>: call +<s> ms → +<e> ms ok; image …, pixel(20,20) <hex> (<own colour>), …; own colour: yes; visible +<v> ms → hidden +<h> ms`; `target visible intervals overlap: none; human tab hidden 3 time(s); after — human … active in its window, current`; `human tab changes after the calls: hidden +…, visible +…, hidden +…, visible +…, hidden +…, visible +…; alternating hidden/visible ×3: yes; each target inside its own hidden span: yes` (the targets share one window, so serialisation is judged on the human's tab: three switch-and-restore cycles, each restore before the next switch, F19); `SCREEN-3 (a) PASS — three captures all succeeded, each its own tab: yes, serialised: yes`. A capture-quota error (`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`, F10) is a FAIL and is recorded with its text. (b) Both outputs are images (no `(isError)`); D's image at (20,20) is `red`, E's `lime`. Evidence names every actor. *Watch item (T3 verifier V4): a `focusTab` racing a timed-out capture's restore — recorded if seen, not provoked.* |
| SCREEN-4 | A minimized window: `WINDOW_MINIMIZED`; and what `mode:"cdp"` does there | (Through the SDK, as SCREEN-2.) **[UI]** window W4 = `Open-T5Window …?t5=screen4`; **[SH]** `t5.ts mark screen4 magenta`; **[UI]** `Hide-T5Window <W4>` → `True`. **[SH]** `npx tsx recipes/t5.ts screen4`; then `Test-T5Minimized <W4>`. | `claimed <T#> (screen4, in the minimized window)`; `default mode → WINDOW_MINIMIZED: Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"`; *Superseded 2026-10-23: expected text was `Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"`, because decisions.md · 2026-10-23 · T5b's three fixes (#63) rewrote the switch-mode message (Step 8 S2b) to `Chrome's window is minimized, so the tab cannot be captured — restore the window, or call focusTab first`.* `SCREEN-4 default mode PASS-as-designed …`; `Test-T5Minimized` after the call prints `True` (the window was not restored). The `mode:"cdp"` line is **recorded, no pass/fail**: `image … (recorded: rendered / blank)` with its pixel and colour count, or `<code>: <message> (recorded: error)`. Recorded either way (STOP rules: continues anyway). |
| SCREEN-5 ★ | Two windows: the target in the unfocused window is captured without focusing it | **[UI]** W5 = `Open-T5Window …?t5=screen5-target`; `Open-T5Tab …?t5=screen5-front` (a tab of W5, now active there); Wh = `Open-T5Window …?t5=screen5-human` (focused last: the human's tab); `Move-T5Window` the two side by side, `Set-T5Topmost` both (B4). **[SH]** `Get-T5Foreground` (before); `npx tsx recipes/t5.ts screen5`; `Get-T5Foreground` (after). | `before — … layout as required: yes`; `image …, pixel(20,20) #ff00ff (magenta), …`; `after — human <T#h> (…, current); front <T#f> (…, active in its window); target <T#t> (…, background, …)`; `SCREEN-5 (Chrome side) PASS — image is the target: yes; human's tab still current: yes; front restored: yes …`. `Get-T5Foreground` prints the same `Hwnd` before and after, and it is not W5's (no window was focused). |
| BG-1 ★ | Trusted click into a background tab (recorded either way; a Step 8 input) | Driver window Wb on `…?t5=bg-human`, uncovered, current (B1, B4). **[SH]** `npx tsx recipes/t5.ts bg1 --then-focus`. | PASS = `click e<N> trusted → ok (<ms> ms)`; `target status "status: TRUSTED click received"; …; target visibilityState hidden`; `human tab hidden during the call: no; after — human … active in its window, current; target … background …`; `BG-1 PASS — exact; background throughout: yes; human's tab unchanged: yes` (the script's PASS also requires the target `hidden` when read). On FAIL the text is recorded, and so is the line `BG-1 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)` (see the wave sheet: T5.2's retry is returned as a proposed decision). The `--then-focus` line (`informational, not the T5.2 retry — after focusTab …`) is recorded either way. |
| BG-2 ★ | Trusted typing into a background tab (recorded either way; a Step 8 input) | As BG-1: `npx tsx recipes/t5.ts bg2 --then-focus`. | PASS = `type e<N> "bg2typed" trusted → ok (<ms> ms)`; `target status "status: TRUSTED input = bg2typed"; field value "bg2typed"; target visibilityState hidden`; the human's-tab line as BG-1; `BG-2 PASS — exact; …`. FAIL handling as BG-1. |
| BG-3 ★ | Clipboard write needs focus: refused in the background, works after `browser_focus_tab` | As BG-1's set-up. **[SH]** `t5.ts open bg3` (a background tab, unheld once the script exits); `t5.ts info bg3` → `background`. **[UI]** actor F: `browser_select_tab {"tab":"<T#>"}`; `browser_evaluate {"expression":"navigator.clipboard.writeText('t5-bg3').then(() => 'ok')"}`; `browser_focus_tab {}`; the same `browser_evaluate` again. | Select: `Selected tab <T#> (…)`. First evaluate: an error (`OUTPUT (isError)`) containing `NotAllowedError` or `Document is not focused`. Focus: `Focused tab <T#>`. Second evaluate: `ok`. (The user's clipboard then holds `t5-bg3`.) |
| BG-4 ★ | `waitFor {text}` and `networkIdle` on a background tab (timers throttled but fine) | As BG-1's set-up. **[SH]** `npx tsx recipes/t5.ts bg4`. | `… target <T#> (background, visibilityState hidden); the text is added 2000 ms after the arm`; `waitFor {text} → ok after <t> ms` with 1900 ≤ `<t>` ≤ 10000; `fetch /ok.json → 200; waitFor {networkIdle} → ok after <n> ms` with `<n>` ≤ 10000; `BG-4 PASS — text after <t> ms, network idle after <n> ms; target still background: yes`. The elapsed times are recorded. (A frozen tab, F18, cannot be provoked from the bridge; not measured.) |

**Regression and designed-change rows in the same wave** (decisions.md · 2026-10-22 · Which rows T5.3
counts as regression rows (#60)), run by one actor in a driver window on the plain fixture URL
`http://localhost:8080/e2e-playground.html`, in the MUX-9 form:
- **Regression (T5.3: the same expected text as the last recorded run):** PERC-1…4 (Run 2's lines:
  `textbox "Email address" [ref=e1]`, `textbox "Password" [ref=e2]`, `textbox "Search query" [ref=e3]`,
  `combobox "Favorite fruit" [ref=e4]`, `button "Sign in" [ref=e5]`, `link "Jump to bottom" [ref=e9]`; a viewport PNG; a taller
  `fullPage:true` PNG with `BOTTOM MARKER` and the banner per A10), ACT-1…3 (`status: email = a@b.com`,
  `status: counter = 1`, `status: form submitted (email = x@y.com)`), TRUST-2, EVAL-1 and NET-1
  exactly as MUX-9 states them, with NET-1's size `12.8 KB` (the dated note on MUX-9).
- **Deferred from T1 (G7-1):** ACT-8 — `ref e<N> not found — call browser_snapshot to re-snapshot`.
- **Designed changes (run against their dated expected text, reported as such, not as regression):**
  MUX-1, STAT-1, DL-1 (as §4.13 states it, run after MUX-9), TAB-1…5 (TAB-3 opens `http://localhost:8080/e2e-playground.html?t5=tab3` in place of
  `https://example.com`, because evidence may show fixture pages only, T5.4), MUX-3 (with
  `recipes/hello.ts` reading `current`, so its `active:` tab is the tab `browser_status` names; since every
  driver tab has the same title, the recipe's `[<id>]` is also compared with `t5.ts info <marker>`'s
  `chrome id` for the tab whose handle `browser_status` prints), NET-12.

**Log hygiene** at the end of the wave: §4.12's block (copy `daemon.log`, count `://`, the token and
withheld lines without printing them); expected `0`, `0`, `0`, else the log is not attached.

### 4.15 Run 9 rows (Step 7 T5b re-check and the corrected checks; decisions.md #62, #63)

*Added 2026-10-23 before any Run 9 measurement (decisions.md · 2026-10-23 · The user rules on Run 8:
fix stage T5b, then Run 9 (#62); · T5b's three fixes (#63), commit `12ecb65`). Run 8's results (§5
Run 8) stay as recorded. The order and set-up are in the wave sheet
[`T5-wave-sheet.md`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md) § "Run 9". §4.14's
tools, markers and cautions B1–B6 apply; tags as in §4.12.*

**The corrected image check (SCREEN-1, SCREEN-3, SCREEN-5), stated before the run.** `recipes/t5-png.ts`
`describeBar` (used by `t5.ts … --hue` and `t5-png.ts --hue` / `--transcript <file> --hue`) samples the
colour bar on its row y = 24 at three points right of the label — x = w/2, 3w/4 and w − 20 (the label
ends before x = 300) — and names each by a **hue rule**: a channel is *high* at ≥ 150 and *low* at
≤ 100; magenta = R high, G low, B high; cyan = R low, G and B high; red = R high, G and B low; lime =
G high, B low, R ≤ 180; blue = R and G low, B high; yellow = R and G high, B low; else `other`. The image
is that colour only when all three probes agree (else `mixed`). Why: Run 8's probe (20,20) sat on the
label's text and its ±24 tolerance failed on colour-managed captures (`#dd00fa` for `#ff00ff`). *Disclosure:
the thresholds were chosen with Run 8's informational readings known (`#dd00fa`, `#d92424`, `#8fff3d`,
`#3300f8`); lime's `R ≤ 180` (rather than "low") exists to admit Run 8's `#8fff3d`. No row's wrong image classifies as the expected colour under these thresholds (prereg verifier, synthetic tests). Run 9 is a new measurement, and Run 8's images are not re-judged.*

**RESOLVER-1's corrected title rule.** Chrome titles the service-worker DevTools window `DevTools`, which
`t5-win.ps1` prints as `<DevTools window>`. The rule: `Get-T5Foreground` prints `Hwnd` = the DevTools
window's handle and `Title` `<DevTools window>`; that window is this extension's console when the
find-only `Find-T5Uia <Wd> 'sw.js','[bridge]'` (counts only, invokes nothing) prints a count ≥ 1 for each.

**Discriminating the new build.** RELOAD-1's check cannot tell a T5b extension from a T3 one; R9-SCREEN-2
can: a stale extension hangs to `TIMEOUT` (Run 8) where the new one answers `OFFSCREEN` in < 1 s. A
`TIMEOUT` there means the reload did not take: stop and ask again.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| R9-RELOAD-1 ★ | The reloaded extension and the T5b daemon (first recorded line) | **[USER]** the extension reload. **[SH]** `Get-DaemonBuild`; `npx tsx recipes/t5.ts check` in a driver window on `…?t5=check` (B1). | `Get-DaemonBuild` = `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974`; the check's lines as RELOAD-1 (§4.14) with `daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974` and `CHECK PASS — …`. |
| R9-SCREEN-2 ★ | T5b fix 2: `mode:"cdp"` on a background tab refuses at once, no banner | Driver window Ws on `…?t5=screen-human`, topmost, current. **[SH]** start the capture loop on Ws (`-Seconds 40 -IntervalMs 200`), then `npx tsx recipes/t5.ts r9-cdp --hue` (it waits 10 s before the call). | `call <t0> → <t1>: screenshot <T#> mode:"cdp" → OFFSCREEN: The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first in <ms> ms` with `<ms>` < 1000; `human tab hidden: never; target visible: never`; `the human's active tab <T#> by mode:"cdp" → image …, bar probes … → cyan (hue rule) …` (the active tab of a visible window still captures); `R9 SCREEN-2 (Chrome side) PASS — …`. Banner: every frame from `<t0>` − 1 s to `<t1>` + 0.5 s has the band of the frames in the second before `<t0>`, and the frame at `<t0>` viewed shows no "started debugging this browser" bar (the script's own debugger use resumes 1 s after `<t1>`; the band change it causes then shows the capture loop working). A `TIMEOUT` instead of `OFFSCREEN` ⇒ stale extension (stop). |
| R9-SCREEN-4 | T5b fix 2: `mode:"cdp"` in a minimized window refuses at once | **[UI]** W4 on `…?t5=screen4`, `Hide-T5Window` → `True`. **[SH]** `npx tsx recipes/t5.ts r9-cdp --minimized`; `Test-T5Minimized <W4>`. | `… screenshot <T#> mode:"cdp" → WINDOW_MINIMIZED: Chrome's window is minimized, so CDP cannot capture the tab — restore the window, or call focusTab first in <ms> ms` with `<ms>` < 1000; `R9 SCREEN-4 cdp PASS — …`; `Test-T5Minimized` → `True`. |
| R9-LEASE-3 ★ | T5b fix 3: `leaseGranted.url` is the popup's url; the popup is held for another client as soon as it exists | As LEASE-3 (§4.14): driver window on `…?t5=lease3-home`, B1; **[SH]** `npx tsx recipes/t5.ts lease3 --race` in the background (a second SDK client `t5-lease3-other` polls `listTabs` every ~20 ms from the click and snapshots the popup the moment it appears); during its hold **[UI]** actor C: `browser_list_tabs`, then `browser_select_tab {"tab":"<T#p>"}`. | `after the synthetic click: leaseGranted {"tab":"<T#p>","reason":"opener","url":"http://localhost:8080/e2e-playground.html?popup=1"} after <ms> ms; …` with `<ms>` ≤ 2500 (the daemon polls at most 2 s); `other client: popup <T#p> seen <n> ms after the click; its snapshot → TAB_HELD: tab <T#p> is held by "t5-lease3" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab · data {"owner":"t5-lease3","since":<epoch ms>}; leaseGranted had already arrived: <yes|no>` — the `TAB_HELD` is required; `no` shows the hold before the event (T5b §9), `yes` is recorded as "ordering not exercised" (not a FAIL); `LEASE-3 PASS (synthetic click) — event tab <T#p>, reason opener, url the popup URL; listTabs owner of <T#p>: "t5-lease3"` (if the synthetic click opens no popup, the trusted line and `PASS (trusted click)` count the same, as in §4.14). C's list: `<T#p>[*| ] [t5-lease3] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?popup=1`; C's select: (isError) `tab <T#p> is held by "t5-lease3" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab`. |
| R9-RESTORE | T5b fix 1: a hung default-mode capture restores the previous tab at the 30 s bound, before the 35 s `TIMEOUT` | Induced as in Run 8 SCREEN-5's first attempt, in the driver's own windows: **[UI]** Wr9 = `Open-T5Window …?t5=restore-target`, `Open-T5Tab …?t5=restore-front` (active in Wr9); Wc = `Open-T5Window …?t5=cover`; Wc maximized over Wr9's monitor and `Set-T5Topmost <Wc>` (Wr9 fully covered). **[SH]** `npx tsx recipes/t5.ts r9-restore`. | `before — … layout as required: yes`; `screenshot <T#t> → TIMEOUT: Timed out after 35000ms calling screenshot after <ms> ms`; `target active from +<a> ms; front active again +<b> ms; after — front <T#f> (…, active in its window …); target <T#t> (…, background, …)` with 25000 ≤ `<b>` < 35000; `R9 RESTORE PASS — …`. If the capture does not hang (`R9 RESTORE not measured — the capture did not hang …`), the row is **not measured** (set-up), neither PASS nor FAIL. *Not run: T5b §9's second sub-check (a `focusTab` during the hang keeps the target in front) — the FIFO visibility lock (`daemon/src/lock.ts`) queues a `focusTab` behind the hung capture until its 35 s deadline, after the 30 s restore, so it cannot act during the hang through the daemon; it stays unit-tested (T5b).* |
| R9-SCREEN-1 ★ | SCREEN-1 under the corrected image check; the flash measured again | As SCREEN-1 (§4.14). **[SH]** `npx tsx recipes/t5.ts screen1 --hue`. | Per run: `run k: call <ms> ms; image <w>x<h>, bar probes … → magenta (hue rule) → …`; `run k: human tab hidden +<a> ms, visible again +<b> ms → flash <f> ms; …`; `run k: after — human … active in its window, current; target … background …`; `run k: PASS` for k = 1, 2, 3; then `SCREEN-1 PASS — flash per run <f1>, <f2>, <f3> ms; median <m> ms (…)`. Same conditions as §4.14 (visible again ≤ 2000 ms after the call started); the flash is reported as a number, over 1 s a finding. |
| R9-SCREEN-3 ★ | SCREEN-3 under the corrected image check | (a) As SCREEN-3 (a): `npx tsx recipes/t5.ts screen3 --hue`. (b) As SCREEN-3 (b) (actors D, E on `open screen3-d --bar red` / `open screen3-e --bar lime`; both `browser_screenshot {}` at once); **[SH]** `npx tsx recipes/t5-png.ts --transcript <D's out.jsonl> --hue` and E's. | (a) each of a, b, c: `… ok; image …, bar probes … → <red|lime|blue> (hue rule) …; own colour: yes; …`; the alternation line `… alternating hidden/visible ×3: yes; each target inside its own hidden span: yes`; `SCREEN-3 (a) PASS — three captures all succeeded, each its own tab: yes, serialised: yes`. (b) both outputs are images; D's last image `→ red (hue rule)`, E's `→ lime (hue rule)`. |
| R9-SCREEN-5 ★ | SCREEN-5 under the corrected image check | As SCREEN-5 (§4.14), with `Move-T5Window` (now un-maximizing) placing the windows side by side: `Get-T5ChromeWindows` shows the two rects not overlapping before the run. **[SH]** `Get-T5Foreground`; `npx tsx recipes/t5.ts screen5 --hue`; `Get-T5Foreground`. | `before — … layout as required: yes`; `image …, bar probes … → magenta (hue rule) …`; `after — human … current; front … active in its window; target … background …`; `SCREEN-5 (Chrome side) PASS — …`; `Get-T5Foreground` prints the same `Hwnd` before and after, not W5's. |
| R9-RESOLVER-1 | RESOLVER-1 under the corrected title rule | As RESOLVER-1 (§4.14). | `Get-T5Foreground` before and after R's calls: `Hwnd` = Wd's handle, `Title` `<DevTools window>`; the find-only `Find-T5Uia <Wd> 'sw.js','[bridge]'` (a literal substring match, counts only) prints a count ≥ 1 for each; R's `browser_status` last line `Active tab: [<T#>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=resolver` and the snapshot's first line `url: http://localhost:8080/e2e-playground.html?t5=resolver   title: "Agent Bridge E2E Playground"`, neither containing `No normal Chrome window is focused` or `No active tab`. |
| R9-NET-1 ★ | NET-1 with Chrome's cache bypassed | Actor S on a driver window on the plain URL `http://localhost:8080/e2e-playground.html` (its tab selected). **[UI]** S: `browser_network_clear {}`. **[UI]** a hard reload of that tab by keyboard in the driver's own window (`Set-T5Foreground <hwnd>` must print `True` and `Get-T5Foreground` must name that window's handle, else no keys are sent; then SendKeys `^+r`) — it bypasses the cache, replacing MUX-9's `browser_navigate`, which Run 8 showed is served from the cache. **[UI]** S: `browser_network_requests {}`, then `browser_network_requests {"id":"<id>"}`. **[SH]** the 8080 server's log. Capture loop for the banner. | `Cleared <n> requests.`; then `Network — active tab: showing 1 of 1 (recording since <t> ago; 0 pending)` and `[<id>]  <t> ago   GET     200  document    <n>ms  12.8 KB  http://localhost:8080/e2e-playground.html`; the id lookup contains `from cache: no` and `content-length: 13106`; the server log has a new `"GET /e2e-playground.html HTTP/1.1" 200` at the reload's time; no banner (A10). |

### 4.16 BG-FLAGS rows (Step 7: background input with Chrome restarted under flags; decisions.md #64 (2))

*Added 2026-10-23 by stage BG-FLAGS, before Chrome was touched and before any BG-FLAGS measurement
(decisions.md · 2026-10-23 · The driver may reload the extension by UI automation, and restart Chrome
with flags for the background-input test (#64) (2); · 2026-10-22 · BG-1/BG-2's focus-emulation retry
cannot run in this wave; T5.2 reports it unmet if they fail (#61); · 2026-10-23 · The user rules on
Run 8: fix stage T5b, then Run 9 (#62) item (4)). Run 8's BG results (§5 Run 8) stay
as recorded. The order and set-up are in the wave sheet
[`T5-wave-sheet.md`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md) § "BG-FLAGS
(Run 10)". §4.14's tools, markers and cautions B1–B6 apply; tags as in §4.12.*

**The question.** Run 8: a trusted click / trusted typing into a background tab answers `ok` in 5–10 ms
and the page receives nothing; after `focusTab` both work (BG-1/BG-2 FAIL). Is Chrome's background
throttling the cause? This stage measures it **with no code change**: Chrome is restarted with flags
that disable renderer backgrounding, and BG-1/BG-2 are run again exactly as written. Focus emulation
proper (`Emulation.setFocusEmulationEnabled`) needs a bridge method that does not exist; adding it is
Step 8's (#62 (4)) and is **not** done here — BGF-1/BGF-2 record only whether these flags alone change
the outcome.

**The flag set** (as the stage brief gives it; unchanged):
`--disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling`.
What each does: the first keeps a background tab's renderer process at normal priority; the second
stops Chrome treating a covered window's tabs as backgrounded; the third stops the 1 s timer clamp of
background pages. None of them makes a background tab *visible* or *focused* — so `document.visibilityState`
of a background tab is still expected to read `hidden`, which BG-1/BG-2's PASS rule requires anyway.

**New helpers** (written before the run; Windows PowerShell 5.1; counts only — none prints a title or URL):
- `recipes/bgf-count.ps1 [-CloseBlank -Expect <N>]` — one line: `chrome.exe` processes, browser processes,
  browser windows (visible `Chrome_WidgetWin_1` windows of `chrome.exe` titled `… - Google Chrome`),
  how many minimized, tabs (UIA elements of ControlType `TabItem` **and** ClassName `Tab` per window —
  the tab strip only; a page's `role="tab"` elements are also `TabItem`s, with an empty ClassName, and
  are not counted (prereg verifier finding 1, measured: the user's window read 2 `TabItem`s = 1 `Tab` +
  1 web element); total and the per-window list sorted), `blank windows` (windows titled exactly
  `about:blank - Google Chrome` with one tab) and the browser process's switches (names only).
  `-CloseBlank -Expect <N>` closes the blank window (WM_CLOSE) only when exactly one exists **and** there
  are exactly N + 1 browser windows, then counts again; otherwise it closes nothing.
- `recipes/bgf-quit.ps1` — quits Chrome **gracefully**: opens one window of its own on `about:blank`
  (as `recipes/reload-extension.ps1` does), checks its address bar reads `about:blank`, sets it to
  `chrome://quit` and sends one Enter only while that window is in front with its address bar focused
  (Chrome's own Exit: every window closes and the session is saved), then waits ≤ 60 s for no
  `chrome.exe` to remain. **It never kills `chrome.exe`**: exit 3 if Chrome is still running, and the
  driver stops. Exit 2 = nothing sent.
- `recipes/bgf-launch.ps1 -Exe <chrome.exe> -ArgLine '<args>'` — starts Chrome outside the driver's job
  object (the driver's shell runs in one; limit flags `0x800`, measured) with the user's default
  environment (`CreateEnvironmentBlock`; the driver's session variables are not passed on) and no
  inherited handles, in a new process group (`CREATE_NEW_PROCESS_GROUP`, so no console Ctrl+C of the
  driver reaches it), as a desktop shortcut would. Exit 2 = refused, nothing started.

**The restart and restore procedure (both restarts).** Pre-registered, because it is the user's real
Chrome (integrity floor):
0. **Precondition (restart 1 only):** the pre-flight check's `listTabs — <k> tab(s)` (one check
   window open) equals T + 1 — the two tab counts agree. Otherwise `bgf-count.ps1` may get a set-up fix
   (recorded with its diff) and the first count is taken again; if they still disagree ⇒ STOP before
   any restart.
1. All the driver's own windows are closed; `bgf-count` must print the same `browser windows`, `tabs`
   and per-window list as the stage's first count (N windows, T tabs, list P), with `blank windows 0`
   — else ⇒ STOP (no quit). Chrome's path and version are recorded
   (`C:\Program Files\Google\Chrome\Application\chrome.exe`, file version `156.0.8078.48` measured
   at 23:12Z).
2. `bgf-quit.ps1` → `QUIT OK - no chrome.exe process remains, <s> s after the Enter`, exit 0. Exit 3
   ⇒ **STOP** (nothing is forced; the record says so). Exit 2 ⇒ nothing was sent: step 1's count is
   taken again (a window the script left open would change it ⇒ STOP), then one rerun; a second exit 2
   ⇒ STOP.
3. `bgf-launch.ps1 -Exe 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgLine '<args>'` with
   `<args>` = `--restore-last-session` followed by the flag set (restart 1) or `--restore-last-session`
   alone (restart 2) → `bgf-launch: started pid <p> …; in job: False; …`.
4. `bgf-count` every 2 s until two results in a row are equal and show ≥ N browser windows, at most 60 s
   (at 60 s the last count is judged as it stands).
   The quit window is in the saved session, so it may come back: **expected** N + 1 windows with
   `blank windows 1`, or N windows with `blank windows 0`. Then `bgf-count -CloseBlank -Expect N` (only
   if blank = 1 and windows = N + 1) closes that one window. **Restore PASS** = the final count prints exactly N browser windows,
   T tabs, per-window list P, `blank windows 0`, and `browser switches: [<args>]` (the flags present
   after restart 1; only `--restore-last-session` after restart 2). Anything else — fewer or more
   windows or tabs, a different list, two blank windows — ⇒ **STOP all further steps** and report it
   plainly; the driver does not try to repair the user's session (nothing is reopened or closed). The
   record then names what the STOP leaves behind: whether Chrome runs, with which switches, and whether
   the driver's blank window is still open.
5. `npx tsx recipes/t5.ts check` in a driver window on `…?t5=check` → `CHECK PASS — …` (the extension
   reconnects to the daemon by itself after a restart; its `listTabs — <k> tab(s)` must equal the
   pre-flight check's `<k>`, taken with the same one check window open — a second, independent tab
   count). Only if it fails with the extension not connected after 30 s: `reload-extension.ps1`
   (#65), then the check once more; a second failure ⇒ STOP (restart 1: then restart 2 runs at once to
   take the flags off; restart 2: report).
At the end Chrome must be as it was: N windows, T tabs, list P, none of the three flags (the first
count's switches were `[]`), `t5.ts check` passing. Two harmless differences are expected and recorded:
the command line keeps `--restore-last-session` (a one-shot switch), and the browser process is no
longer in a job object (the original one was, with its parent gone).

**Validity of BGF-0…5.** BGF-1…4 count only if `bgf-count`, run right before them, prints the three
flags in `browser switches`; BGF-0 and BGF-5 only if it prints none of them. Otherwise the row is
**not run (set-up)**, neither PASS nor FAIL.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| BGF-0 | Baseline before restart 1: BG-1/BG-2 still fail on this build without flags (informational; makes the comparison discriminating) | Driver window Wb on `…?t5=bg-human`, topmost, current (B1, B4). **[SH]** `npx tsx recipes/t5.ts bg1 --then-focus`; `cleanup --keep bg-human`; B1; `bg2 --then-focus`; `cleanup --keep bg-human`. | Recorded either way, judged by BG-1's / BG-2's rules (§4.14). Run 8 recorded both `FAIL` (`ok` in 5–10 ms, `status: idle`). |
| BGF-1 ★ | BG-1 under the flag set: trusted click into a background tab | Restart 1 done (Restore PASS) and the check passed. Driver window Wb on `…?t5=bg-human`, `Set-T5Topmost`, current (B1, B4); `bgf-count` shows the flags. **[SH]** `npx tsx recipes/t5.ts bg1 --then-focus`. | BG-1's rule (§4.14), copied: PASS = `click e<N> trusted → ok (<ms> ms)`; `target status "status: TRUSTED click received"; …; target visibilityState hidden`; `human tab hidden during the call: no; after — human … active in its window, current; target … background …`; `BG-1 PASS — exact; background throughout: yes; human's tab unchanged: yes` (the script's PASS also requires the target `hidden` when read). On FAIL the text is recorded, and so is the script's line `BG-1 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)` (focus emulation is Step 8's, #62 (4)). The `--then-focus` line (`informational, not the T5.2 retry — after focusTab …`) is recorded either way. |
| BGF-2 ★ | BG-2 under the flag set: trusted typing into a background tab | As BGF-1, after `cleanup --keep bg-human` and B1 again: `npx tsx recipes/t5.ts bg2 --then-focus`. | BG-2's rule (§4.14), copied: PASS = `type e<N> "bg2typed" trusted → ok (<ms> ms)`; `target status "status: TRUSTED input = bg2typed"; field value "bg2typed"; target visibilityState hidden`; the human's-tab line as BG-1; `BG-2 PASS — exact; …`. FAIL handling as BGF-1. |
| BGF-3 | Control under the flags: clipboard write needs focus (BG-3) | As BG-3 (§4.14) in Wb: **[SH]** `t5.ts open bg3`; `t5.ts info bg3` → `background`. **[UI]** actor F (`--tools 'browser_select_tab,browser_evaluate,browser_focus_tab'`): `browser_select_tab {"tab":"<T#>"}`; `browser_evaluate {"expression":"navigator.clipboard.writeText('t5-bg3').then(() => 'ok')"}`; `browser_focus_tab {}`; the same `browser_evaluate` again. | BG-3's rule, copied: Select: `Selected tab <T#> (…)`. First evaluate: an error (`OUTPUT (isError)`) containing `NotAllowedError` or `Document is not focused`. Focus: `Focused tab <T#>`. Second evaluate: `ok`. (The user's clipboard then holds `t5-bg3`.) |
| BGF-4 | Control under the flags: `waitFor {text}` and `networkIdle` on a background tab (BG-4) | As BGF-1's set-up. **[SH]** `npx tsx recipes/t5.ts bg4`. | BG-4's rule, copied: `… target <T#> (background, visibilityState hidden); the text is added 2000 ms after the arm`; `waitFor {text} → ok after <t> ms` with 1900 ≤ `<t>` ≤ 10000; `fetch /ok.json → 200; waitFor {networkIdle} → ok after <n> ms` with `<n>` ≤ 10000; `BG-4 PASS — text after <t> ms, network idle after <n> ms; target still background: yes`. The elapsed times are recorded (Run 8: 3746 ms / 552 ms; with the timer clamp off, `<t>` nearer 2000 ms is expected but not required). |
| BGF-5 | After restart 2 (no flags): BG-1/BG-2 once more (informational) | Restart 2 done (Restore PASS, `browser switches: [--restore-last-session]`), the check passed; Wb as BGF-1. **[SH]** `bg1 --then-focus`; `cleanup --keep bg-human`; B1; `bg2 --then-focus`. | Recorded either way, judged by BG-1's / BG-2's rules. |

**Reading the result (pre-registered).** The flags **change** BG-1 (resp. BG-2) iff BGF-0's row FAILs,
BGF-1 (BGF-2) PASSes, and BGF-5's row FAILs again. BGF-1/BGF-2 FAIL ⇒ "the flags alone do not change
the outcome" (background throttling is not the cause on its own; focus emulation stays Step 8's
question). BGF-1/BGF-2 PASS but BGF-5 also PASSes ⇒ "not attributable to the flags" (the restart or
something else changed it). BGF-0 PASS ⇒ the baseline no longer reproduces Run 8: recorded, and the
flags' effect is "not determinable"; the same reading if BGF-0, BGF-1/BGF-2 or BGF-5 is not run. One
trial per condition (as in Run 8); a single PASS/FAIL is reported as such. Every outcome is fine;
nothing is re-tuned after the measurement.

### 4.17 FE rows (Step 8: focus emulation for trusted input; decisions.md #71, #78, #85 item 3)

*Added 2026-10-23 by Step 8 stage FE's builder, before any FE build was loaded and before any FE row
ran (exit check FE.4; decisions.md · 2026-10-23 · Stage FE measures focus emulation before `policy.ts`
is set (#71), amended by · FE's rows and outcome table, amended before anything is measured (#78) and
· Stage 0's build-level rulings: SDK-1's recipe, S3.5's control, the stage split (#85) item 3). The
order, the set-up and the commands are in the wave sheet
[`FE-wave-sheet.md`](plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/FE-wave-sheet.md).
§4.14's markers and cautions B1–B6 apply; tags as in §4.12. Run 8's and Run 10's BG results stay as
recorded.*

**The question.** Trusted CDP input into a background tab answers `ok` and the page receives nothing
(BG-1/BG-2, Run 8; BGF-1/BGF-2, Run 10). Stage FE adds `focusEmulation: true` to `click`/`type`/`pressKey`
on the trusted path (explicit `trusted:true`, or click/type's escalation after a content-action
failure): in the same debugger session the extension sends `Emulation.setFocusEmulationEnabled
{enabled:true}`, then (for `type`) focuses the field, then the unchanged `Input.*` commands, then
`{enabled:false}` in a `finally`, then detaches; it focuses no window and activates no tab, and the
result carries `focusEmulation: "on"`. Without the param every call is unchanged. These rows measure
whether the page then receives the input, and what the human sees. By Chromium's source the target
page reads `visible` while emulation is on (stage0-audit.md F1, §8; unconfirmed for Chrome 156): that is
recorded as an observation, not judged.

**Tools of this section** (in `recipes/`, written before the run; `npx tsc --noEmit -p
recipes/tsconfig.fe.json` exit 0; `npx tsx recipes/fe.ts selftest` → `SELFTEST PASS — 79/79 checks as
expected`, the dry run of every rule on canned good and bad inputs, connecting to nothing):
- `fe.ts <command>` — one command per row (its header lists them). Every line is `<ts> <name>:
  <message>` (the t5 format); each row prints its own `… PASS` / `… FAIL` line, computed by the pure
  functions of `fe-rules.ts`, and appends one JSON record per FE-0, positive control, capture judgement
  and trial to `$FE_OUT\fe-results.jsonl` (handles, window ids, the fixture's status line, field value
  and visibility logs — never a URL or a title). `fe.ts verdict` re-computes every rule from that file
  and prints the outcome by the table below. It prints only fixture URLs (none, in practice).
- `fe-win.ps1 -Hwnd <Wf> -Seconds <s> -IntervalMs 50 -Csv <file> [-StopFile <file>]` — the window-capture
  loop: one `PrintWindow` capture of the driver's window every ~50 ms (~140 ms per frame was measured
  on a scratch window at `-IntervalMs 100`), writing per frame the time, the **foreground window's
  handle**, the size, and the colours of the uniform rows at the top of the window (three probes per
  row, right of the bars' labels); no image is written and no title printed. `fe.ts frames <csv> --for
  positive|block` judges it.
- Each trial runs on a **fresh background fixture tab** `…?t5=<row>-<kind>-<k>` opened by the script
  (`newTab`, `active:false`, leased to the script) in the driver's window and closed after the trial,
  so no trial can read an earlier trial's status line (#78). The human's tab is the driver's
  `…?t5=fe-human` tab (cyan bar `HUMAN`); each target gets a magenta bar `<row> TARGET`. Both carry the
  `visibilitychange` logger (`VISLOG_INSTALL`, page-side epoch timestamps as SCREEN-1). During each call a
  `listTabs` poller (lock-free) reads every 25 ms, from 50 ms before the call to 50 ms after it.

**Order** (the wave sheet's): reload (exit 0) → FE-0 → FE-5 first → the positive control → FE-1, FE-2,
FE-3 under one capture loop → FE-5 last → FE-3c (observation) → `verdict`.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| FE-0 ★ | The loaded extension is the FE build (the run's first row after `recipes/reload-extension.ps1` exit 0) | Driver window Wf on `…?t5=fe-human`, current (B1), uncovered (B4). **[SH]** `Get-DaemonBuild`; `npx tsx recipes/fe.ts check`. | `fe-check: connected as client c<k> — daemon build <sha>, proto 2, extension connected` (`<sha>` = `Get-DaemonBuild`, recorded); `fe-check: human <T#h> (fixture page); target <T#x> (background, leased to fe-check)`; `fe-check: click e<N> trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (<ms> ms)`; `fe-check: FE-0 PASS — the result carries focusEmulation "on": the extension is the FE build`. PASS = the result carries `focusEmulation: "on"`. A stale extension ignores the param and answers `ok {"ok":true}` → `FE-0 FAIL — no focusEmulation "on" in the result ⇒ stop, reload, re-check (not an outcome; #78)`: **FAIL is not an outcome** — stop, reload, re-check; no other row runs before an FE-0 PASS. Whether the target received the click is not judged here. |
| FE-5 ★ | Control: BG-1 and BG-2 exactly as §4.14, **without** the option, on the same build; run **first** (before FE-1) and **last** (after FE-3) | As FE-0's set-up. **[SH]** `npx tsx recipes/fe.ts control --phase first`; later `… control --phase last`. Three BG-1 trials (trusted click on `Trusted-only button`) then three BG-2 trials (trusted `type "bg2typed"` into `Trusted-only input`), each on a fresh tab. | Per trial: `fe-5: FE-5 (<phase>) BG-<1\|2> trial <k>: …` lines as FE-1's (with no `focusEmulation:true` and a result `ok {"ok":true}`), then `fe-5: FE-5 (<phase>) BG-<1\|2> trial <k>: BG-<1\|2>'s rule <PASS\|FAIL>; received input: <yes\|no>`; finally `fe-5: FE-5 control (<phase>) — BG-1 received input in <a>/3 trials, BG-2 in <b>/3; control <holds\|VOID (received input)>`. "Received input" = the target's status line is not `status: idle` **or** its field is not empty, read after the call (any page-side effect counts). **FE-5 "passes" — voids the comparison — if the control receives input in ANY trial of either block** (#78); expected (Runs 8, 10): `holds`, `0/3` and `0/3` twice. |
| FE-PC ★ | Positive control (#78 item 3): the human's-tab logger, and the capture loop, see a real switch | As FE-0's set-up. **[SH]** start `fe-win.ps1 -Hwnd <Wf> -Seconds 30 -IntervalMs 50 -Csv $FE_OUT\frames-positive.csv` in the background; after 3 s, `npx tsx recipes/fe.ts positive` (one default-mode `screenshot` of a background magenta target, 1 s after installing the logger); when the loop has ended, `npx tsx recipes/fe.ts frames $FE_OUT\frames-positive.csv --for positive`. | `fe-positive: human <T#h> (cyan bar); target <T#x> (magenta bar, background, leased to fe-positive)`; `fe-positive: screenshot <T#x> (default mode) → ok; call <t0> → <t1> (<ms> ms)`; `fe-positive: human tab hidden +<a> ms, visible again +<b> ms`; `fe-positive: POSITIVE (page timestamps) PASS — the human's-tab logger saw hidden → visible`. Then `fe-frames: <n> frames; frames showing magenta <m>, cyan <c>` and `fe-frames: POSITIVE (capture loop) PASS — a frame during the flash shows the target's magenta bar; none before` (rule: ≥ 1 frame in [`<t0>`, `<t1>` + 500 ms] shows magenta, and ≥ 1 frame in the 3 s before `<t0>`, none of them magenta). **If the page part FAILs**, FE-4's page-timestamp clause is not discriminating: recorded, and **the run stops and escalates** (no FE-1…FE-3). **If the capture part FAILs**, FE-4's "no window capture shows the target" clause is void: recorded, **the run stops and escalates** — the clause is never silently dropped. |
| FE-1 ★ | BG-1 with `focusEmulation:true`: trusted click into a background tab | Capture loop running for the block (wave sheet). **[SH]** `npx tsx recipes/fe.ts fe1` — three trials, each on a fresh tab. | Per trial `k`: `fe-1: FE-1 trial <k>: human <T#h>; target <T#x> (background, leased to fe-1); target visibilityState hidden`; `fe-1: FE-1 trial <k>: click e<N> trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (<ms> ms)`; `fe-1: FE-1 trial <k>: target status "status: TRUSTED click received"; field value ""; target visibilityState hidden (read after the call returned)`; `fe-1: FE-1 trial <k>: human's side — listTabs reads <n> polls (<m> overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS`; `fe-1: FE-1 trial <k>: observation — target page visible +<v> ms, hidden again +<h> ms (start hidden; read after the call hidden)`; `fe-1: FE-1 trial <k>: PASS`. Row: `fe-1: FE-1 PASS — 3/3 trials PASS; FE-4 trials 3/3 PASS (the window clauses: frames --for block)`. **PASS rule per trial** = BG-1's (§4.14), copied, with the option added: the call returns without error and its result carries `focusEmulation: "on"`; the status line exactly `status: TRUSTED click received`; the target's `visibilityState` `hidden` **as read after the call returned** (#78 item 1); the human's tab not `hidden` from 50 ms before the call; afterwards the human's tab active in its window and `current`, the target in the background. A failing trial prints `FAIL — <the clauses that failed>`. FE-1 PASSes only if **all three** trials PASS. |
| FE-2 ★ | BG-2 with `focusEmulation:true`: trusted typing into a background tab | As FE-1: `npx tsx recipes/fe.ts fe2`. | As FE-1 with `fe-2`/`FE-2`, the call line `type e<N> "bg2typed" trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (<ms> ms)` and the status line `target status "status: TRUSTED input = bg2typed"; field value "bg2typed"; target visibilityState hidden (read after the call returned)`. **PASS rule per trial** = BG-2's (§4.14), copied, with the option added: as FE-1's, with the status line exactly `status: TRUSTED input = bg2typed` **and** the field value exactly `bg2typed`. All three trials must PASS. (The extension focuses the field inside the debugger session, after the enable, #85 item 3.) |
| FE-3 ★ | Trusted `pressKey` with `focusEmulation:true` into the background tab's trusted-only input | As FE-1: `npx tsx recipes/fe.ts fe3`. **Focus step** (in the same trial, before the pressKey): `evaluate` of `el.focus()` on `#trusted-input` (the bridge's `evaluate`, its own debugger session, ended before the pressKey's), which returns whether `document.activeElement` is then `#trusted-input`. **Key**: `ArrowLeft` (`keys.ts` sends it with `windowsVirtualKeyCode` 37 and no `text`; in an empty field it changes no value, so no `input` event overwrites the keydown's status). | As FE-1 with `fe-3`/`FE-3`; the first line ends `; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes`; the call line `pressKey ArrowLeft trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (<ms> ms)`; the status line `target status "status: TRUSTED key = ArrowLeft"; field value ""; target visibilityState hidden (read after the call returned)`. **PASS rule per trial** = PASS = `status: TRUSTED key = ArrowLeft`, with FE-1's other clauses (no error, `focusEmulation: "on"`, target `hidden` after the call, the human's tab and the target afterwards). A focus step that prints `no` is recorded; the trial is judged by the same rule (it FAILs if the key did not arrive). All three trials must PASS. *Whether `el.focus()` sets `document.activeElement` in a hidden tab is unmeasured; the line records it.* |
| FE-4 ★ | The human's side over **all** trials of FE-1…FE-3 (#78 item 1) | The capture loop runs from before FE-1 to after FE-3 (`-StopFile`), Wf in the foreground (`Set-T5Foreground` → `True` before the loop starts). **[SH]** after FE-3: `npx tsx recipes/fe.ts frames $FE_OUT\frames-block.csv --for block`; `npx tsx recipes/fe.ts verdict`. | Per trial (FE-1…FE-3 lines above): `… → FE-4 trial PASS`: in every `listTabs` read (before, each poll, after) the human's tab is `current`; every window's active tab is the one it was before the call; the target is never `active`; the human's tab's logger shows no `hidden` at any time since it was installed for that trial (stricter than BG's "from the call"); a failed poll fails the trial. Block: `fe-frames: FE-4 (window capture over 9 trials, <n> frames) PASS — no frame shows the target; the foreground window never changed` — no frame from 500 ms before the first call to 1500 ms after the last shows the target's magenta bar, and the foreground window's handle is the same in every frame of that span. The block capture is **void** (⇒ escalate, as the positive control) unless every call has a frame within 1000 ms before and after it and no gap over 1000 ms around it. Verdict line: `fe-verdict: FE-4: trials 9/9 PASS; window capture PASS (no frame shows the target; foreground constant) → PASS`. **The debugging banner is expected and is not a FAIL.** **Observation, not a PASS clause:** the target's own page visibility (each trial's `observation —` line; expected by Chromium's source: `visible` while the option is on, `hidden` again after the call). |
| FE-3c | *Extra observation, not in the outcome table (proposed by the FE builder):* does FE-3 discriminate? FE-3 without the option | After FE-5 last. **[SH]** `npx tsx recipes/fe.ts fe3 --control` (same focus step and key, no `focusEmulation`). | Per trial as FE-3 without `focusEmulation:true`; finally `fe-3c: FE-3c observation (not in the outcome table) — without the option the key reached the page in <n>/3 trials`. Recorded either way. If `<n>` > 0, FE-3's PASS says nothing about emulation — recorded and listed for the user; the table is still read as written. |

**The outcome table** (copied verbatim from kickoff §7 / phase doc Stage FE, with #78's precedence;
not changed here). The session agent records the matching decision, "The background-input policy",
citing the rows, and S3 sets `sdk/src/policy.ts` from it:
- **(A) FE-1, FE-2, FE-3 PASS in all trials and FE-4 PASS** → policy `"focusEmulation"`: the SDK's
  trusted actions send `focusEmulation: true`; no `focus()`, no flash; the MCP's trusted tools do the
  same (S5).
- **(B) FE-1 and FE-2 FAIL, or FE-4 FAIL** (the human saw something) → policy `"focusFirst"`: the
  plan's fallback (0.4; #66 "Revisit if") — `Tab.click/type/pressKey({trusted:true})` call `focus()`
  first, and the docs say the tab comes to the front and stays there.
- **(C) mixed** (one input kind passes all trials, another fails; FE-4 PASS) → per kind: the passing
  kinds use emulation, the failing kinds `focus()` first; recorded per kind.
- A trial that passes once and fails once counts as FAIL for that kind (no best-of-three).
- FE-5 passing (the control no longer fails) voids the comparison: record it, read the policy as (B),
  and list it for me.
- **Precedence (#78 item 2):** FE-5 void → (B); else FE-4 FAIL → (B); else every kind passes all trials
  → (A); else no kind passes → (B); else (C). FE-0 FAIL is "stop, reload, re-check", not an outcome.
  FE-5 "passes" if the control receives input in any trial; FE-5 runs first and last. Each trial uses a
  fresh fixture tab or a reset status line. FE-4 is judged over all trials of FE-1…3.
- *#78 item (4), verbatim, for S3:* "(4) Under (A)/(C), the SDK sends `focusEmulation: true` on every
  trusted-capable click/type (it cannot see the extension's automatic escalation); (C) is a per-kind map
  in `policy.ts`; `type {submit}` takes the stricter of type and pressKey. Under (B), the MCP's trusted
  tools keep today's behaviour (no automatic focus; `browser_focus_tab` stays an explicit call) and only
  the SDK's `Tab` focuses first."

`fe.ts verdict` applies exactly this, after three gates that are not outcomes (each prints `STOP — …`
and exits 1): the last FE-0 record PASSes and precedes every trial; the positive control's two parts
PASS; the block capture is not void. Every recorded trial counts — a re-run adds trials, it never
replaces them — and fewer than three recorded trials for a row (or for an FE-5 block and kind) prints
`INCOMPLETE — … no outcome`. Its last line is one of `OUTCOME (A) — …`, `OUTCOME (B) — FE-5 void: …`,
`OUTCOME (B) — FE-4 FAIL: …`, `OUTCOME (B) — no kind passes: …`, `OUTCOME (C) — per kind: click <p>,
type <p>, pressKey <p>; type {submit} takes the stricter of type and pressKey: <p> (#78 item 4)`.

**Evidence rules.** Fixture pages only (the repo is public, B2): the run record copies the scripts'
lines; `fe-results.jsonl` and the two frames CSVs carry no URL, title or image and are attached as
`FE-run-results.txt`, `FE-frames-positive.txt`, `FE-frames-block.txt`; no window image is kept. If any
output shows a non-fixture URL, stop the row, record only "non-fixture tab touched — row invalid".
**Log hygiene** at the end: §4.12's block (copy `daemon.log`, count `://`, the token and withheld lines
without printing them); expected `0`, `0`, `0`, else the log is not attached; attached as
`FE-daemon-log.txt` (`*.log` is gitignored).

### 4.18 MCP cursor and tools (Step 8 S5: CUR-1…3, LOC-1, LOC-2, ASREF-1, REP-1)

*Added 2026-10-23 by Step 8 stage S5's builder, before any run (exit check S5.4). Not yet run. They
need the S5 build loaded (extension reloaded, MCP reconnected — G8-2) and use only the fixture page
`http://localhost:8080/e2e-playground.html` (item 7); a second fixture tab is the same URL with
`?s5=b`. One Claude session (a headless actor, §4.14) unless a row says otherwise; `<T#a>`/`<T#b>` are
the handles `browser_list_tabs` prints.*

| ID | What | Steps | Expected |
|---|---|---|---|
| CUR-1 ★ | The cursor does not follow the human; `browser_use_active_tab` moves it | Fixture tab `<T#a>` on screen. Fresh session: `browser_snapshot {}` (claims `<T#a>`). **[UI]** open `…?s5=b` in a new tab yourself and stay on it (`<T#b>`). `browser_snapshot {}`; then `browser_use_active_tab {}`; then `browser_snapshot {}`. | First and second snapshots both start `url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"` (the cursor stayed on `<T#a>` although the human moved). `browser_use_active_tab`: exactly `Now using <T#b> (the human's active tab) as this session's tab`. Third snapshot: `url: http://localhost:8080/e2e-playground.html?s5=b …`. |
| CUR-2 ★ | The divergence line in `browser_status` | During CUR-1, after the second snapshot (human on `<T#b>`, cursor on `<T#a>`): `browser_status`; after `browser_use_active_tab`: `browser_status` again. | First: the STAT-1 lines with `Active tab: [<T#b>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?s5=b`, then `Cursor: <T#a> "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html (held by me)`, then `Human's active tab: <T#b> "Agent Bridge E2E Playground" — not mine; call browser_use_active_tab to work there`. Second: `Cursor: <T#b> "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?s5=b (held by me)` as the last line; no `Human's active tab:` line. |
| CUR-3 ★ | `browser_new_tab`'s activation rule, both branches | (a) Cursor on the tab on screen (after CUR-1: `<T#b>` on screen): `browser_new_tab {"url":"http://localhost:8080/e2e-playground.html?s5=c"}`; watch the screen. (b) **[UI]** switch Chrome to another tab (`<T#a>`); `browser_new_tab {"url":"http://localhost:8080/e2e-playground.html?s5=d"}`; watch the screen; `browser_snapshot {}`. (c) Fresh session, no tool called yet: `browser_new_tab {"url":"http://localhost:8080/e2e-playground.html?s5=e"}`. | (a) `Opened tab <T#c>`; the `?s5=c` tab comes on screen. (b) `Opened tab <T#d> (in the background — browser_focus_tab shows it)`; **the screen does not change** (`<T#a>` stays); the snapshot's url is `…?s5=d` (the cursor moved). (c) `Opened tab <T#e> (in the background — browser_focus_tab shows it)`; the screen does not change (Stage 0 F26). No `focusTab` in any branch. |
| LOC-1 ★ | Click and type by locator | Fixture tab, this session's tab: `browser_type {"locator":{"role":"textbox","name":"Email address"},"text":"a@b.com"}`; `browser_click {"locator":{"role":"button","name":"Click counter"}}`; `browser_snapshot {}`. Then `browser_click {"ref":"e1","locator":{"text":"Sign in"}}`. | `Typed into textbox "Email address"`; `Clicked button "Click counter"`; the snapshot has `textbox "Email address"` with value `a@b.com` (or the page's `status:` line `status: email = a@b.com`, by screenshot) and `button "Click counter: 1"`. The last call is a tool error, exactly `browser_click takes ref or locator, not both`, and the counter stays at 1. |
| LOC-2 | Wait for a locator to be hidden | Fixture tab: `browser_click {"locator":{"role":"button","name":"Load message in 1.5s"}}`; at once `browser_wait_for {"locator":{"text":"Async content loaded!"}}`; then `browser_evaluate {"expression":"document.getElementById('async-area').textContent = ''"}`; `browser_wait_for {"locator":{"text":"Async content loaded!"},"state":"hidden"}`. | `Waited for text "Async content loaded!" to be visible` within about 1.5–3 s; then `Waited for text "Async content loaded!" to be hidden` at once. `browser_wait_for {"state":"hidden","text":"x"}` (optional) is the tool error `browser_wait_for: state is only used with locator`. |
| ASREF-1 ★ | `browser_evaluate {asRef}` then `browser_click {ref}` | Fixture tab: `browser_evaluate {"expression":"document.getElementById('counter')","asRef":true}`; `browser_click {"ref":"<the e-number printed>"}`; `browser_snapshot {}`. | The evaluate result has the line `[ref=e<N>] — pass it as ref to browser_click etc.`; the click prints `Clicked e<N>`; the snapshot shows `button "Click counter: <previous + 1>"`. `browser_evaluate {"expression":"1+1","asRef":true}` (optional) prints `2` then `(no ref: the result is not an element)`. |
| REP-1 ★ | A failure report with an image | Fixture tab, this session's tab, in the background (**[UI]** another tab on screen in the same window): `browser_click {"locator":{"role":"button","name":"No such button"}}`. Watch the screen. | The result is an error with two parts: text starting `LOCATOR_NOT_FOUND: ` naming the locator, with a `Screenshot: <home>\.chrome-agent-bridge\failures\<time>-<T#>.png` line and a snapshot window of the fixture (`button "Sign in" [ref=…]` among it), and an **image** of the fixture page. The fixture tab flashes on screen for about 1.5 s and the previous tab comes back. The PNG exists at that path (delete it after the row; never commit it). A `TAB_HELD` (optional: a second session clicking the first's tab) still reads as the plain one-line error, with no image. Note (S5 fixer, 2026-10-23): a page exception in `browser_evaluate` (optional: `{"expression":"null.x"}`) is a `PAGE_ERROR` report too — image, renumbered refs, the flash on a background tab — and the full multi-line message follows the report under `Full message:`. |

### 4.19 S6 rows (Step 8: SDK-1…8, SM-0, SM-1)

*Added 2026-10-23 by Step 8 stage S6's builder, before the S6 build was loaded and before any S6 row ran
(exit check S6.1). Expected text is written from the code (`sdk/src/tab.ts`, `sdk/src/error.ts`,
`extension/src/content/locate.ts`, `mcp/src/tools/registry.ts`, the fixture; file:line in
`…-steps/S6-builder.md` and in the headers of `recipes/s6-rules.ts`). The driver runs the wave end to end
(decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end (#33)); order, set-up, actor
prompts and pass rules: [`S6-wave-sheet.md`](plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md).
Tags, cautions A1–A10 (§4.12) and B1–B6 (§4.14) hold. `<ts> <name>: ` opens every script line and is
left out below. Every tab is a fixture tab: `…?s6=<marker>` opened by a script in the background, or a
driver window `…?t5=<marker>` (`Open-T5Window`); `<T#…>` are handles.*

**Tools** (`recipes/`, written before the run; `npx tsc --noEmit -p recipes/tsconfig.s6.json` exit 0;
their rules are tested by `npx vitest run recipes/`): `sdk-login.ts` (SDK-1), `s6.ts <command>` (the
stale check, SDK-2…5, SM-0, SM-1 (`sm1`, `sm1-log`), the helpers `peek`, `daemon-shutdown` and `close-bb-tab`),
`blackboard/boot-bb.ts` (SDK-6), `blackboard/export-grades.ts` + `blackboard/assemble-mcp.ts` (SDK-7);
the PowerShell scripts `bb-login.ps1` (SDK-6/SDK-7's login step), `bgf-quit.ps1`, `bgf-launch.ps1`,
`bgf-count.ps1` (SM-1's restart, from BG-FLAGS) and `reload-extension.ps1`. *(SM-1, `bb-login.ps1` and the
`pp1` course key added 2026-10-23 by the S6 fixer r1, before any run.)* Run each with
`npm run recipe -- <file> [args]`. Exit 0 = PASS, 1 = FAIL or a bridge error (`FAILED — …`), 2 = set-up
or refusal, 3 = not measured.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| S6-STALE ★ | The loaded extension is the S6 build (the first recorded line after the reload exit; S6.1 as reworded by #84) | After `recipes/reload-extension.ps1` exits `0`: **[SH]** `npm run recipe -- recipes/s6.ts stale-check`. | `s6-stale-check: connected — daemon build <sha>, extension connected` (`<sha>` = `Get-DaemonBuild`); `opened <T#> (background) at http://localhost:8080/e2e-playground.html?s6=stale`; `locate <T#> {role:"button", name:"Sign in"} → ok {"ref":"e<N>","role":"button","name":"Sign in"} (<ms> ms)`; `STALE-CHECK NEW BUILD — the loaded extension answers locate: it is the S2-or-later build`; exit 0. **Stale outcomes** (either ⇒ run the reload once more, exit `0` required, then this check once more; a second STALE ⇒ STOP, no other row runs): the FE-era extension answers `locate <T#> … → UNKNOWN_METHOD: unknown method: locate (<ms> ms)` and `STALE-CHECK STALE — the loaded extension is older than S2 (unknown method: locate) — the reload did not take` (`extension/src/router.ts:28`); a daemon refusal prints `… → VERSION: …` and `STALE-CHECK STALE — the daemon refuses the loaded extension (VERSION) — the reload did not take`. Anything else is `STALE-CHECK UNEXPECTED — …`: recorded, STOP. *Added 2026-10-23 (S6 fixer r1, before any run): a bridge error before `locate` answers (e.g. `NOT_CONNECTED`) prints `FAILED — <code>: <message>` and then `STALE-CHECK FAILED — a bridge error before locate answered: neither NEW BUILD nor STALE — STOP the live part and report`, exit 1: recorded, STOP, no rerun. The check tells an S2-or-later extension from the FE-era one (the only other build that was loaded); that it is the S6 build follows from step 1's main-tree build and step 4's daemon-build check.* |
| SDK-1 ★ | The SDK flow end to end against the fixture while a Claude session works on another tab (S6.2: the command is `npm run recipe -- recipes/sdk-login.ts`, #85/#86) | Actor A holds driver window W1's `…?t5=sdk1-claude` tab (A: `browser_snapshot {}`). **[SH]** `npm run recipe -- recipes/sdk-login.ts`. **[UI]** A: `browser_snapshot {}`. **[SH]** `Get-BridgeLog 4`. | Script, in order: `sdk-login: connected — daemon build <first 12 hex>…, extension connected`; `opened <T#s> (background) at http://localhost:8080/e2e-playground.html?s6=sdk1`; `locate {role:"button", name:"Sign in"} → e<N> button "Sign in"`; `click e<N> → ok`; `waitFor {text:"form submitted"} → ok after <ms> ms`; `status line: "status: form submitted (email = )"`; `closed <T#s>`; `SDK-1 PASS — located button "Sign in", clicked, the page says "status: form submitted (email = )" (<ms> ms in all)`; exit 0. A's two snapshots: both start `url: http://localhost:8080/e2e-playground.html?t5=sdk1-claude   title: "Agent Bridge E2E Playground"`, both with `button "Sign in" [ref=e<N>]`, neither an error. Log: `client + "sdk-login" (<n> clients)` then `client - "sdk-login" (<n−1> clients)`. The screen does not change (the tab opens in the background, 0.6/T3.4). |
| SDK-2 ★ | `LOCATOR_NOT_FOUND` report: a misspelt name names the nearest candidates, saves a screenshot, prints the snapshot window | Driver window Ws on `…?t5=s6-human`, uncovered, current (B1, B4). **[SH]** `npm run recipe -- recipes/s6.ts sdk2`. | `opened <T#> (background) at …?s6=sdk2`; `click {role:"button", name:"Sgin in"} → LOCATOR_NOT_FOUND: no button named "Sgin in". Nearest: button "Sign in", button "Disabled action", button "Load message in 1.5s", button "Shadow button", button "Trusted-only button".`; `candidates (5): button "Sign in", button "Disabled action", button "Load message in 1.5s", button "Shadow button", button "Trusted-only button"`; `screenshotPath: C:\Users\<you>\.chrome-agent-bridge\failures\<ISO with :/. as ->-<T#>.png; exists: yes; outside the repo: yes`; `attachErrors: []`; then between `--- report (<k> lines) ---` and `--- end report ---` the report (≤ 60 lines): line 1 = `LOCATOR_NOT_FOUND: ` + the message above; `Nearest candidates:`; five lines `  - button "Sign in" [ref=e<a>]`, … in the order above (refs of the attached snapshot); `Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.`; `url: http://localhost:8080/e2e-playground.html?s6=sdk2   title: "Agent Bridge E2E Playground"`; the fixture's snapshot lines (`- textbox "Email address" [ref=e1]` … `- button "Sign in" [ref=e5]` …); `Screenshot: <the same path>`; then `Network: no failed requests among the tab's last <n> entries.` **or** `Failed requests (1 of the tab's last <n>):` with a `404 … favicon.ico` row (recorded either way, R9-NET-1); finally `SDK-2 PASS — LOCATOR_NOT_FOUND names button "Sign in" first; screenshot saved outside the repo; the report shows the snapshot window`. The human's tab (Ws) is hidden for about 1.5 s during the call (0.5 accepts the flash). PASS rule: `sdk2Verdict` (`recipes/s6-rules.ts`) — code, message start, first candidate `button "Sign in"`, the report's `Nearest candidates:` / candidate / snapshot / `Screenshot:` lines, the PNG exists outside the repo, no attach error. Candidates 2–5 in another order are a `finding:` line, not a FAIL (STOP rules: "a `nearest()` ranking that looks odd … continues anyway"). After the row: delete the PNG (never commit it). |
| SDK-3 ★ | `LOCATOR_AMBIGUOUS` lists the matches; `nth` picks one | As SDK-2. **[SH]** `npm run recipe -- recipes/s6.ts sdk3`. | `locate {role:"button", name:"Fetch"} → LOCATOR_AMBIGUOUS: 7 elements match button named "Fetch"; pass nth (0-based) to pick one, or narrow the locator.`; `matches (7): "Fetch JSON", "Fetch 404", "Fetch redirect", "Fetch unreachable", "Fetch black hole", "Fetch cross-origin", "Fetch 20×"`; the report has `Matches (7):` and seven lines `  - "Fetch JSON"` … (no role, no ref: `remapRefs`), the snapshot window and a `Screenshot:` line (a second ~1.5 s flash); `locate {role:"button", name:"Fetch", nth:1} → e<N> button "Fetch 404"`; `click {role:"button", name:"Fetch", nth:0} → ok`; `status line: "status: fetch ok.json -> 200"`; `SDK-3 PASS — 7 matches listed; nth:1 is Fetch 404; nth:0 clicked Fetch JSON`. Delete the PNG after the row. |
| SDK-4 ★ | `waitFor({locator:{text}})` on the delayed message; `state:"hidden"` after removing it (decisions.md · 2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text} locator (#7)) | **[SH]** `npm run recipe -- recipes/s6.ts sdk4`. | `click {role:"button", name:"Load message in 1.5s"} → ok`; `waitFor {locator:{text:"Async content loaded!"}} → ok after <a> ms` with 1200 ≤ `<a>` ≤ 5000 (the page's 1500 ms timer, in a background tab whose timers Chrome may throttle to 1 s steps); `evaluate: #async-area emptied`; `waitFor {locator:{text:"Async content loaded!"}, state:"hidden"} → ok after <b> ms` with `<b>` ≤ 1000; `SDK-4 PASS — visible after <a> ms, hidden after <b> ms`. (The status line `status: async content loaded` has no `!`, so it never matches.) |
| SDK-5 ★ | `evaluateRef('#email')` → ref → `click({trusted:true})` lands (isTrusted reporter), under the SDK policy `focusFirst` (#89) | Driver window Ws current (B1). **[SH]** `npm run recipe -- recipes/s6.ts sdk5`. **[UI]** afterwards `Set-T5Foreground <Ws>`; B1 again. | `before: <T#> is the human's tab (current): no`; `evaluateRef("document.querySelector('#email')") → e<N>`; `elements still carrying data-__bridge-mark: 0`; `click e<N> {trusted:true} → ok (<ms> ms; policy focusFirst sends focusTab first, #89)`; `status line: "status: hit at <x>,<y> exp <ex>,<ey> on=email (isTrusted=true)"; document.activeElement: #email`; `after: <T#> is the human's tab (current): yes (informational: focusFirst leaves it in front)`; `SDK-5 PASS — trusted click on e<N> reached #email (isTrusted=true); no mark left`. The fixture tab comes to the front of Ws and stays until the script closes it (the designed `focusFirst` behaviour, #89; no restore). `isTrusted=false`, `on=` anything but `email`, or a non-zero mark count is a FAIL. |
| SDK-6 | `boot-bb.ts` on a live course tab → `bb.VERSION`; the skill's old boot not used. **On the user's course "pp1"** (decisions.md · 2026-10-23 · The user grants the pp1 course for SDK-6/SDK-7 and one Chrome restart for SM-1 (#96)) | (dry run, no user needed — row SDK-6D) **[SH]** `npm run recipe -- recipes/blackboard/boot-bb.ts _1_1 --dry-run`. (live) **[SH]** `Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue` (nothing). **[UI]** the login step (wave sheet "SDK-6/SDK-7 live"): `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1; $LASTEXITCODE` — its own window on `https://ada.blackboard.com/`; Chrome's autofill fills a login form and the script invokes the one sign-in button once; no snapshot, screenshot, evaluate or value read of any login page, nothing typed. **[SH]** `npm run recipe -- recipes/blackboard/boot-bb.ts pp1`; the 8765 check again. | **SDK-6D:** `course _1_1; source stub-bb.js (declares VERSION stub-2026-10-23, sha256 <12 hex>…); DRY RUN`; `opened <T#> (background) for course _1_1 — dry run on the localhost fixture`; `<T#> loaded; origin and course checked`; `bb.js evaluated: "bb loaded"`; `bb.VERSION = stub-2026-10-23`; `SDK-6 (dry run) PASS — bb.VERSION stub-2026-10-23 from the stub, loaded by evaluate (no 8765 server)`; `closed <T#>`; exit 0. **Login step:** `bb-login: … after load: on ada.blackboard.com: <yes/no>; sign-in buttons: <n>` and then `LOGGED IN …` or `SIGNED IN - autofill + one submit …`, exit `0`. Exit `4` (`WAITS FOR THE USER …`: SSO, MFA, a picker, empty autofill, an unknown page) ⇒ SDK-6 and SDK-7 are recorded **"waits for the user"**, nothing retried, nothing typed; exit `2` (nothing touched) ⇒ the step once more, then the same. **SDK-6 (live, pp1):** `course pp1; source bb.js (declares VERSION <V>, sha256 <12 hex>…)` with `<V>` the VERSION the skill's `bb.js` declares at run time (`2026-10-18` when this row was written); `opened <T#r> (background) on the ada resolver page for course pp1`; `course lookup by courseId → HTTP <s>, <an id \| no id>`; then either (a) `HTTP 200, an id` and `course: pp1 (resolved; by courseId lookup; the id is not printed)`, or (b) `HTTP 404, no id`, `course confirm by id (from the skill's table) → HTTP 200, the same id` and `course: pp1 (resolved; by the skill's course table, confirmed by GET; the id is not printed)` — the branch is recorded; `closed <T#r> (the resolver tab)`; `opened <T#> (background) for course pp1`; `<T#> loaded; origin and course checked`; `bb.js evaluated: "bb loaded"`; `bb.VERSION = <V>`; `SDK-6 PASS — bb.VERSION <V> from the skill's bb.js, loaded by evaluate (no 8765 server)`; `closed <T#>`; exit 0; both 8765 checks print nothing. A refusal (exit 2) is recorded, not a FAIL of the bridge, and ends SDK-6/SDK-7 as **"waits for the user"**: `REFUSED — not logged in to Blackboard (HTTP 401\|403) …`, `REFUSED — course pp1 did not resolve …`, `REFUSED — the resolver tab left … (a login page?) …`, `REFUSED — the tab left https://ada.blackboard.com (a login page?) …`. `FAILED — <code>: …` or `SDK-6 FAIL — …` (exit 1) is a FAIL. No line carries the course id, a course title, a URL of a Blackboard page or page content (the recipe prints the label `pp1` only). *Rewritten 2026-10-23 by the S6 fixer (round 1), before any run, for #96: was "Needs the user's course … Without the user's course: waits for the user", with a course id or URL argument only.* |
| SDK-7 | `export-grades.ts` → JSON written; byte-compare with the same data pulled through the MCP `browser_evaluate` path (S6.3). **On the user's course "pp1"** (#96) | (dry run — row SDK-7D) **[SH]** `npm run recipe -- recipes/blackboard/export-grades.ts _1_1 --dry-run`. (live, after SDK-6 in the same login) **[SH]** failures folder before: `@(Get-ChildItem "$HOME\.chrome-agent-bridge\failures" -Filter *.png -ErrorAction SilentlyContinue).Name` (kept in a variable; the count recorded). `npm run recipe -- recipes/blackboard/export-grades.ts pp1 --keep-open` (the SDK leg; prints `<T#>`); `… export-grades.ts pp1 --mcp-plan > "$env:S6_OUT\sdk7-plan.txt"` (connects to nothing); `Select-String -Path "$env:S6_OUT\sdk7-plan.txt" -Pattern '_\d+_\d+' -Quiet` → `False`. If the SDK leg printed `measurable: yes`: actor M (wave sheet P-SDK7-M) selects `<T#>` and runs the START, STATUS and CHUNK expressions verbatim with `browser_evaluate`; **[SH]** `npm run recipe -- recipes/blackboard/assemble-mcp.ts <M's out.jsonl> pp1`. **[SH]** failures folder after: the names not in the before list are this row's (count recorded; each deleted by its full path, never opened, attached or copied); `Get-FileHash exports\pp1-<date>.json, exports\pp1-<date>-mcp.json -Algorithm SHA256`; `git check-ignore -v exports\pp1-<date>.json exports\pp1-<date>-mcp.json`; `npm run recipe -- recipes/s6.ts close-bb-tab <T#>` → `closed <T#> (the Blackboard recipe's course tab)` (it closes only an unheld ada course tab). | **SDK-7D:** `bb.VERSION = stub-2026-10-23`; `page export done in <ms> ms: 2 columns, 4 grade records, 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c`; `MCP leg size: 626 characters → 1 chunk(s) of 8000; measurable: yes`; `pulled 1 chunk(s); length, bytes and sha256 equal the page's: yes`; `written exports\dry-_1_1-<YYYY-MM-DD>.json — 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c`; `SDK-7 (SDK leg, dry run) PASS — 2 columns, 4 grade records; file sha256 = page sha256`; `closed <T#>`. (Measured offline 2026-10-23 by running the tsx-built START expression for `_1_1` against `stub-bb.js` in node:vm: 626 characters, 627 bytes — the stub's one `é` — sha256 `92fe62ab…a49c`; re-measured unchanged by the S6 fixer after the label split. *The `MCP leg size:` line was added by the S6 fixer r1, before any run.*) **SDK-7 (live, pp1), SDK leg:** `course pp1; source bb.js (…)`, the resolution lines of SDK-6 (same branch), `opened <T#> (background) for course pp1`, `<T#> loaded; origin and course checked`, `bb.js evaluated: "bb loaded"`, `bb.VERSION = <V>`, at most one `export running in the page …`, `page export done in <ms> ms: <c> columns, <g> grade records, <b> bytes, sha256 <H>` (`<c>` ≥ 1, `<g>` ≥ 0, `<H>` 64 hex), `MCP leg size: <L> characters → <k> chunk(s) of 8000; measurable: <yes \| no (over the pre-registered cap of 240000 characters)>`, `pulled <n> chunk(s); length, bytes and sha256 equal the page's: yes` (`<n>` = ⌈`<L>`/100 000⌉), `written exports\pp1-<YYYY-MM-DD>.json — <b> bytes, sha256 <H>`, `SDK-7 (SDK leg) PASS — <c> columns, <g> grade records; file sha256 = page sha256`, `kept <T#> open with bb loaded for the MCP leg (run with --mcp-plan for its expressions); released when this script exits`; exit 0. **MCP leg** (only when `measurable: yes`; `no` ⇒ the MCP leg and S6.3 are recorded **"not measured — <L> characters over the cap"**, the SDK leg is still judged): `Selected tab <T#> (now this session's tab; not brought on screen — browser_focus_tab shows it)`; START → the pretty-printed `{"state": "running", "key": "mcp-pp1"}`; STATUS until its output has `"state": "done"` with `"length": <L>`, `"bytes": <b>`, `"sha256": "<H>"`, `"columns": <c>`, `"grades": <g>` — the SDK leg's values; `<k>` CHUNK outputs, each one line of JSON text, the last one shorter unless `<L>` is a multiple of 8000; `assemble-mcp: transcript: status found, <k> chunk result(s), 0 bad result(s)`; `written exports\pp1-<YYYY-MM-DD>-mcp.json — <b> bytes, sha256 <H> (= the page's: yes)`; exit 0. **S6.3:** the two `Get-FileHash` values are equal (= `<H>` upper-case); `git check-ignore -v` prints `.gitignore:<n>:exports/` for both paths; the hash is recorded, neither file is committed. **Failures folder:** 0 new PNGs expected (the status and chunk expressions never throw; the SDK legs run with reports off); a non-zero count is recorded as a finding (count only) and those files are deleted. FAIL: the SDK leg's `FAILED — …`/`FAIL` (exit 1), a STATUS `"state": "error"`, an assemble `FAILED — …`, or two different hashes. Refusals and the login outcomes as SDK-6 (**"waits for the user"**). Recorded: counts, sizes, the hash, handles, the resolution branch — never a grade, a name, a title, a URL or the course id. *Rewritten 2026-10-23 by the S6 fixer (round 1), before any run, for #96: was "Needs the user's course `<C>` … Without the user's course: waits for the user", with 16 000-character MCP chunks and no failures-folder step.* |
| SDK-8 ★ | MCP cursor: Claude on its tab, the human switches, Claude's click lands on its own tab; "use this tab" → `browser_use_active_tab` → status shows the new cursor (phase doc 0.6; Stage 0 note: the "human's" tab is the driver's `?t5=sdk8-human`) | **[UI]** Wa = `Open-T5Window …?t5=sdk8-actor`; `Set-T5Foreground <Wa>`; B1. **[SH]** actor C started (`t5-actor.ts`, tools `browser_snapshot,browser_click,browser_status,browser_use_active_tab`). C: prompt S8-1 (snapshot). **[UI]** Wh = `Open-T5Window …?t5=sdk8-human`; `Set-T5Foreground <Wh>`; B1 must print the `sdk8-human` tab. C: prompt S8-2 (click by locator, snapshot). **[SH]** `npm run recipe -- recipes/s6.ts peek sdk8-human`. C: prompt S8-3 (status). C: prompt S8-4 ("use this tab", then status). | S8-1: snapshot starts `url: http://localhost:8080/e2e-playground.html?t5=sdk8-actor   title: "Agent Bridge E2E Playground"` (`<T#a>` claimed on first touch). S8-2: `Clicked button "Click counter"`; snapshot starts `url: …?t5=sdk8-actor` and has `button "Click counter: 1"`. peek: `peek <T#h> (?t5=sdk8-human, current: yes): button "Click counter: 0"; released`. S8-3: `Daemon: connected on 127.0.0.1:9234 (build <sha>, up <n>s)`, `Clients (<n>): …claude-code #<C>…`, `Extension: connected`, `Active tab: [<T#h>] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=sdk8-human`, `Cursor: <T#a> "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?t5=sdk8-actor (held by me)`, `Human's active tab: <T#h> "Agent Bridge E2E Playground" — not mine; call browser_use_active_tab to work there` (`mcp/src/tools/registry.ts:294-323`). S8-4: the transcript shows a `browser_use_active_tab` call (not chosen by the prompt's wording: the prompt does not name it) answering exactly `Now using <T#h> (the human's active tab) as this session's tab` (`registry.ts:337`); the status that follows ends with `Cursor: <T#h> "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?t5=sdk8-human (held by me)` and has no `Human's active tab:` line. Any tool call outside the actor's list, or the click landing on `<T#h>` (peek shows `Click counter: 1`), is a FAIL. |
| SM-0 ★ | An extension reload keeps held handles (the session marker survives a reload; decisions.md #80; makes SM-1 discriminating) | **[SH]** `npm run recipe -- recipes/s6.ts sm0 --hold 120` in the background, output to `sm0.out`; when it prints `holding <T#a> for 120 s — run recipes/reload-extension.ps1 now`, **[SH]** `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1; $LASTEXITCODE`; after the script ends, `Get-BridgeLog 12`. | Reload: exit `0`. Script: `opened <T#a> (background) at …?s6=sm0`; `holding <T#a> for 120 s — run recipes/reload-extension.ps1 now`; `event +<ms> ms extensionStatus {"connected":false}` then `event +<ms> ms extensionStatus {"connected":true}`; `still holding <T#a> (+30 s; extension connected)` … `(+120 s; …)`; `snapshot <T#a> after the hold → ok (<n> elements), url http://localhost:8080/e2e-playground.html?s6=sm0`; `listTabs: <T#a> owner "s6-sm0"`; `SM-0 PASS — the reload kept <T#a>: no tabGone, the snapshot answered, still owned by s6-sm0`; no `event … tabGone` line. Log (from the reload on): a new `extension resync: <n> tabs, <g> gone` line and **no** `extension session changed: … handles retired` line (`daemon/src/intercept.ts:180,203`). `SM-0 NOT MEASURED — no extension disconnect and reconnect during the hold …` (exit 3) means the reload did not happen inside the hold: not a result; run again. |
| SM-1 | A held handle across a Chrome restart → `tabGone`, never a live handle on a reused id. **One Chrome restart, granted** (decisions.md · 2026-10-23 · The user grants the pp1 course for SDK-6/SDK-7 and one Chrome restart for SM-1 (#96)); MUX-8 runs inside the same quit window | *Pre-registered by Stage 0 (stage0-audit.md F5, phase doc S6 notes), copied verbatim:* a recipe holds fixture tab `T<a>` and records `daemon.status` (tab, tabId, owner); `chrome://quit` typed into the driver's window; relaunch with `recipes/bgf-launch.ps1` **without flags**; `bgf-count.ps1` equal before and after. *Procedure written 2026-10-23 by the S6 fixer (round 1), before any run, from BG-FLAGS (Run 10, `BG-FLAGS-run-record.md`); what the pre-registered text leaves open is resolved as R1–R6 in `…-steps/S6-fixer1.md` (proposed decisions):* (1) **[SH]** every other actor ended but MUX-8's X (started, no tool called); every driver window closed; `Get-BridgeDaemon` → pid `<D>`. (2) **[UI]** `$Wm = Open-T5Window "${U}sm1"` — `T<a>` is that driver window's tab (R1). (3) **[SH]** `bgf-count.ps1` → count C1 (`N` windows, `T` tabs, the per-window list). (4) **[SH]** `npm run recipe -- recipes/s6.ts sm1` in the background (`*> sm1.out`); wait for its `holding <T#a> …` line. (5) **[SH]** `$Q = [DateTime]::UtcNow.ToString('o')`; `bgf-quit.ps1` (its own `about:blank` window; `chrome://quit` into its address bar; Enter) → exit `0` `QUIT OK` (`3` ⇒ STOP, nothing killed; `2` ⇒ nothing sent, once more). (6) MUX-8's first run and X's `browser_status` (MUX-8 note below). (7) **[SH]** `bgf-launch.ps1 -Exe <chrome.exe> -ArgLine '--restore-last-session'` (R2). (8) **[SH]** `bgf-count.ps1` every 2 s until two equal readings, then `bgf-count.ps1 -CloseBlank -Expect N`. (9) wait for `sm1.out`'s verdict; if it shows no `extension back` line 120 s after the launch, `reload-extension.ps1` once (exit `0` required, else STOP), recorded with the time (R5). (10) **[SH]** `npm run recipe -- recipes/s6.ts sm1-log --since $Q`; `Get-BridgeDaemon` → pid. (11) MUX-8's second run. (12) **[SH]** `npx tsx recipes/t5.ts cleanup` (closes the restored, unheld `?t5=sm1` tab, hence its window) and `bgf-count.ps1` → the count before step 2. | *Pre-registered PASS, copied verbatim:* PASS = within 30 s of the extension's hello, `daemon.log` has exactly one `extension session changed: <n> handles retired` with `<n>` ≥ 1 and no marker value; the recipe receives exactly one `tabGone {tab: T<a>}`, whose `lastUrl` is the pre-restart page's; its next `snapshot {tab: T<a>}` → `TAB_GONE`; `listTabs` shows no tab owned by the recipe, and every handle is greater than every pre-restart handle; the daemon's pid is unchanged. FAIL on any live `T<a>` after the restart, whatever tab it names. *As printed (S6 fixer r1):* `sm1.out`: `daemon.status before: <T#a> tabId <n> owner "s6-sm1" url http://localhost:8080/e2e-playground.html?t5=sm1; <k> live handle(s), highest T<m>; uptime <u> ms; build <12 hex>…`; `holding <T#a> — quit Chrome now (chrome://quit), run MUX-8, relaunch; waiting up to 900 s …`; `event +<ms> ms extensionStatus {"connected":false}`; zero or more `still holding …`; `event +<ms> ms extensionStatus {"connected":true}`; `extension back at +<ms> ms; waiting up to 30 s for tabGone <T#a>`; exactly one `event +<ms> ms tabGone {"tab":"<T#a>","lastUrl":"http://localhost:8080/e2e-playground.html?t5=sm1",…}` (events for other handles may follow; they do not count); `snapshot <T#a> after the restart → TAB_GONE: <message>`; `listTabs after: <n> tab(s); handles <all above T<m>>; owned by s6-sm1: 0`; `daemon.status after: uptime <u'> ms (+<d> ms over <e> ms); build <same 12 hex>…; reconnected: no`; `SM-1 PASS — exactly one tabGone <T#a> (lastUrl http://localhost:8080/e2e-playground.html?t5=sm1); snapshot → TAB_GONE; no tab owned by s6-sm1; every handle above T<m>; same daemon`; exit 0 (`sm1Verdict`, `recipes/s6-rules.ts`). `sm1-log`: the lines `<ts> extension session changed: <n> handles retired` (`<n>` ≥ 1) and `<ts'> extension resync: <t> tabs, <g> gone` (`<ts'>` − `<ts>` ≤ 30 s), then `SM-1 LOG PASS — …`, exit 0 (`sm1LogVerdict`; R3). `Get-BridgeDaemon` before = after (`<D>`). Counts: after `-CloseBlank`, the windows, tabs and per-window list equal C1 and the switches read `[--restore-last-session]` (the quit window comes back blank and is closed, as in Run 10; R4); after step 12 they equal the count before step 2. `SM-1 NOT MEASURED` (exit 3: the extension did not come back within the hold) is recorded as **not measured** — SM-1 is not rerun, the grant is for one restart (R6). *Rewritten 2026-10-23 by the S6 fixer (round 1), before any run, for #96: was "Without a grant: not run — needs a Chrome restart grant", with no recipe.* |

**Also run in this wave** (rows written elsewhere; expected text unchanged unless a dated note says so):
- The S5 MCP rows of §4.18 — CUR-1, CUR-2, CUR-3, LOC-1, LOC-2, ASREF-1, REP-1 — and the rows S5 re-dated
  for the S5 build: STAT-1, MUX-1, TAB-3, LEASE-1, NET-12 (their *Corrected 2026-10-23 (Step 8 S5)* notes).
  **MUX-8 runs inside SM-1's quit window** — the one restart of #96 (*corrected 2026-10-23 by the S6 fixer
  r1, before any run: was "not run — needs a Chrome restart grant"*). Its row's steps map onto SM-1's: actor
  X (`t5-actor.ts`, tools `browser_status` only) is started before SM-1's step 5 and calls nothing until the
  quit; after `QUIT OK` (SM-1 step 5): **[SH]** `Get-Process chrome -ErrorAction SilentlyContinue` prints
  nothing; `npx tsx recipes/hello.ts *> "$env:S6_OUT\mux8-1.out"; $LASTEXITCODE`; **[UI]** while it waits,
  X: `browser_status {}`; then SM-1 step 7 (the relaunch). After the extension is back (SM-1's `extension
  back` line): **[UI]** `$W8 = Open-T5Window "${U}mux8"`, `Set-T5Foreground $W8.Hwnd` → `True`, B1 →
  `<T#> fixture` (so the "active" tab the recipe prints is a fixture page, B2); **[SH]** `npx tsx
  recipes/hello.ts *> "$env:S6_OUT\mux8-2.out"; $LASTEXITCODE`; `Close-T5Window $W8.Hwnd`; `A end X`.
  Expected text: MUX-8's own (§4.12), with its dated S5 correction — first run `FAILED after <ms> ms —
  NOT_CONNECTED: Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?
  (waited 15000 ms on port 9234)`, `<ms>` 15000–16500, exit 1; X's status `Daemon: connected …` and
  `Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its
  token/port set?` (no `Cursor:` line); second run the MUX-3 lines without the hold lines, its `active:`
  line naming the fixture page, `closed after <ms> ms — OK`, exit 0; log `client + "hello-recipe" (…)`
  then `client - "hello-recipe" (…)` for each run. **The optional run is not run** (it needs a second
  restart; the grant is for one). `hello.ts` claims no tab and only lists, so SM-1's held recipe and its
  log clause are not touched by it (the second run's `listTabs` may mint handles for restored tabs; each
  is still above every pre-restart handle, which SM-1 checks).
- The regression smoke across Steps 6–8 (S6.5): MUX-2, LEASE-1, SCREEN-1, ACT-1, ACT-2, ACT-3, TRUST-2,
  EVAL-1, NET-1, DL-1, with the expected text of their last recorded run (wave sheet §"Regression rows";
  MUX-2 carries the dated note below).
- *Corrected 2026-10-23 (Step 8 S6 builder), MUX-2, before any run of a Step 7+ build: was "Both snapshots
  contain `textbox "Email address" …` and `button "Sign in" …` — the same active tab", because since Step 7
  the first session's untargeted `browser_navigate`/`browser_snapshot` claims the human's tab
  (one lease per tab, `TAB_HELD`: Step 7 phase doc `2026-10-21-step7-multi-actor-tabs.md` and its as-built;
  the refusal text is decisions.md · 2026-10-22 · T2's daemon details (#57); Run 8 LEASE-1 measured it), so S2's
  untargeted snapshot of that tab is refused with `tab <T#> is held by "claude-code #<M1>" since
  <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab`; and both `browser_status`
  outputs gain `Cursor: none yet — the first tab tool claims the human's active tab` (S5; decisions.md ·
  2026-10-23 · S5's MCP details … (#95) item 2). Run 7's record stands.*

**REP-0 — added 2026-10-23 (S6 resume, #97), before its run.** *Written by S6 builder r2 from the code
(`recipes/s6.ts rep0`, `recipes/s6-rules.ts rep0Verdict`, dry-run by `recipes/test/s6-rules.test.ts`) for
decisions.md · 2026-10-23 · A probe of the failure-report screenshot runs before any row that could attach a
non-fixture tab (#97), on the S6 live verifier's MINOR-1 (`…-steps/S6-live-verifier.md`): SDK-2/SDK-3's reports,
screenshot included, came back 180–190 ms after the call, where a switch capture hid the human's tab for
~1.5 s in Runs 8/9 (R9-SCREEN-1), so the report's capture may not switch and could show the window's visible
tab instead of the failed one. Run order and the gate: `S6-wave-sheet.md` § "Resumed run".*

| ID | Objective | Steps | Expected |
|---|---|---|---|
| REP-0 ★ | The failure report's screenshot switches to the failed (background) tab and shows it, not the tab on screen | Driver window Ws on `…?t5=s6-human`, uncovered, current (the sheet's step 5; B1 → `<T#h> fixture`); `$env:S6_OUT` set (an existing directory outside the repo); no other client holds `<T#h>`. **[SH]** `Rcp recipes/s6.ts rep0` (= `npm run -s recipe -- recipes/s6.ts rep0`). The recipe: sets `BRIDGE_FAILURES_DIR` to a fresh `$env:S6_OUT\rep0-failures-<epoch>` (before it connects; the user's `~\.chrome-agent-bridge\failures` is not used); refuses (exit 2, nothing opened) unless the current tab is the `s6-human` fixture; opens its probe tab `…?s6=rep0` in the background and refuses (exit 2) unless it is inactive and in `<T#h>`'s window; paints a blue bar on `<T#h>` and a magenta bar on the probe (t5-lib `barExpression`, by `evaluate` — the CDP banner shows while each runs) and refuses unless `<T#h>` reads `visible` and the probe `hidden`. Then (1) **control A**: a default-mode `screenshot` of `<T#h>` (on screen: no switch), read by the hue rule; (2) **the probe**: page-side `visibilitychange` logs (`VISLOG_INSTALL`) on both tabs, then `click {role:"button", name:"No such button"}` on the probe tab through the SDK with failure reports on, timed `t0`/`t1`; 2.5 s later both logs are read; the report PNG is read, judged and deleted at once; (3) **control B** (the positive control, after the probe so that the report's capture is the first switch to a freshly opened background tab, as in SDK-2/SDK-3, with no earlier restore in flight): fresh logs, then an explicit default-mode `tab.screenshot()` of the same background probe tab (known to switch, R9-SCREEN-1), timed `c0`/`c1`, read the same way; the control images are kept in memory only. Finally it closes its probe tab and empties and removes its failures directory. **[SH]** the failures-folder rule around it (`$F0`/`$F1` on `$Fail`: 0 new files expected, since the report goes to `$env:S6_OUT`). | `<ts> s6-rep0: ` opens each line. `connected — daemon build <sha>, extension connected; failure reports on, BRIDGE_FAILURES_DIR = <S6_OUT>\rep0-failures-<epoch>`; `opened <T#p> (background) at http://localhost:8080/e2e-playground.html?s6=rep0`; `human <T#h> (?t5=s6-human, current); probe <T#p> (background, same window, leased to s6-rep0)`; `bars: human <T#h> blue (visibilityState visible); probe <T#p> magenta (visibilityState hidden)`; `control A (the human tab <T#h>, on screen): <n> bytes, <w>x<h>, bar probes (<x1>,24) #<hex> (<x2>,24) #<hex> (<x3>,24) #<hex> → blue (hue rule) (expected blue; kept in memory only)`; `click {role:"button", name:"No such button"} → LOCATOR_NOT_FOUND: no button named "No such button".<…> (<ms> ms, report included)`; `screenshotPath: <S6_OUT>\rep0-failures-<epoch>\<ISO with :/. as ->-<T#p>.png; attachErrors: []`; `report PNG: <n> bytes, <w>x<h>, bar probes … → magenta (hue rule) (expected magenta); deleted: yes`; `report call: probe <T#p> visible +<a> ms, hidden again +<b> ms; human <T#h> hidden +<c> ms, visible again +<d> ms → flash <f> ms (informational; call <ms> ms)`; `after the report: human active, current; probe background (informational)`; `control B (tab.screenshot() of the background probe <T#p>): <n> bytes, … → magenta (hue rule) (expected magenta; kept in memory only)`; `control B call: <ms> ms; probe visible +<a'> ms; human hidden +<c'> ms, visible again +<d'> ms (informational)`; `REP-0 PASS — the report's capture switched to the failed tab (visible +<a> ms inside the <ms> ms call) and its PNG shows the probe's magenta bar; controls: the explicit screenshot switched and read magenta, the human tab read blue`; `closed <T#p> (the probe tab)`; `failures directory: 0 file(s) deleted, directory removed`; exit 0. **Rule** (`rep0Verdict`, written before the run): **PASS** = the probe tab logged a `visible` *change* inside [`t0` − 50 ms, `t1` + 50 ms] (the 50 ms clock slack is t5.ts screen1's, Runs 8/9) **and** the report PNG reads magenta by the hue rule. **FAIL** (exit 1, `REP-0 FAIL — <reasons>`) = no such `visible` change (the capture did not switch; a change outside the window is named with its offset), or the PNG reads anything but magenta (blue is named as "the human's tab, not the failed one"; also `mixed`, `other`, unreadable), or no screenshot (no `screenshotPath`, a `screenshot:` line in `attachErrors`, or a PNG that was not read), or a trigger other than `LOCATOR_NOT_FOUND`. **NOT DISCRIMINATING** (exit 3, `REP-0 NOT DISCRIMINATING — <reasons>`) = a control failed — control B did not log a probe `visible` change inside [`c0` − 50, `c1` + 50] ms, its PNG did not read magenta, or it errored; control A did not read blue or errored — or the probe was not `hidden` when its log was installed; it outranks FAIL, and the probe's own reasons follow as `also: …`. The step agent treats NOT DISCRIMINATING as FAIL for the gate and escalates. Set-up refusals are exit 2 (`FAILED — SET-UP: …`): nothing measured, fix and rerun (both recorded). Only a verdict line (`REP-0 PASS`, `REP-0 FAIL` or `REP-0 NOT DISCRIMINATING`) is a result: a `FAILED — …` line with no such verdict line (exit 1 or 2; a set-up or bridge error before the verdict) measured nothing, and the row is rerun after the set-up is fixed, both runs recorded. *(2026-10-23, S6 fixer 2, verifier r2 MINOR-3, before any REP-0 run: an exit 1 with no verdict line was indistinguishable by exit code from `REP-0 FAIL`.)* **Informational, not in the rule:** the report call's duration, the human tab's hidden → visible offsets (the flash), the state after the report. **Method:** Run 9's — the hue rule on three probes of the 48-px bar off its label (`t5-png.ts describeBar`; colour-managed captures read `#dd00fa` for magenta) and page-side `visibilitychange` timestamps (`performance.timeOrigin + performance.now()`) on the probe tab and on the human fixture tab. *2026-10-23 (S6 resume, verifier r2 MAJOR-1, before any REP-0 run): the human tab's colour was cyan, changed to blue because default-mode captures shift cyan/lime's red channel past the hue rule (Run 9 lime → #8fff3d; CDP cyan → #97fdfd) and blue read correctly in Run 9.* **Gate:** on REP-0 FAIL or NOT DISCRIMINATING the rows whose failure report could attach a non-fixture page are **not run** and are recorded "not run — gated by REP-0", and the failure returns as a proposed decision (a code fix in a later stage, never in the wave): **REP-1** (#97 names it; its report is designed to attach while another tab is on screen), **TAB-3** (its session's tab is `https://example.com`, a non-fixture page: an attach-set failure of its `browser_snapshot` would report on it), and **SDK-7's MCP leg** with S6.3's byte-compare (actor M's `browser_evaluate` on the Blackboard course tab: a `PAGE_ERROR` or `TIMEOUT` there is reported, with an image, by the MCP's `failureReport`, `mcp/src/tools/registry.ts:216-238`). Every other remaining row still runs: its reports can only name a fixture tab (the failed tab is a fixture, and a capture that did not switch shows the visible tab of a driver window), or it takes no report at all — the SDK legs of SDK-6/SDK-7 (`failureReports: false`, `recipes/blackboard/boot-bb.ts:41`, `export-grades.ts:106`), `s6.ts close-bb-tab` (reports off since S6 builder r2), and the raw-call recipes `t5.ts` (SCREEN-1), `s6.ts sm1`, `hello.ts` (MUX-8). Per-row reasons: `…-steps/S6-builder-r2.md` §3. |

## 5. Results template

Copy this and fill it in during the run:

```
Date: ____  Chrome version: ____  Node: ____  OS: ____

SMOKE-1 [ ]   SMOKE-2 [ ]
CONN-1 [ ] CONN-2 [ ] CONN-3 [ ] CONN-4 [ ] CONN-5 [ ] CONN-6 [ ] CONN-7 [ ] STAT-1 [ ]
NAV-1 [ ]  NAV-2 [ ]  NAV-3 [ ]
PERC-1 [ ] PERC-2 [ ] PERC-3 [ ] PERC-4 [ ] PERC-5 [ ] PERC-6 [ ] PERC-7 [ ] PERC-8 [ ] PERC-9 [ ]
ACT-1 [ ] ACT-2 [ ] ACT-3 [ ] ACT-4 [ ] ACT-5 [ ] ACT-6 [ ] ACT-7 [ ] ACT-8 [ ]
TRUST-1 [ ] TRUST-2 [ ] TRUST-3 [ ] TRUST-4 [ ] TRUST-5 [ ] TRUST-6 [ ] TRUST-7 [ ] TRUST-8 [ ]
TAB-1 [ ] TAB-2 [ ] TAB-3 [ ] TAB-4 [ ] HIST-1 [ ]
CUR-1 [ ] CUR-2 [ ] CUR-3 [ ] LOC-1 [ ] LOC-2 [ ] ASREF-1 [ ] REP-1 [ ]
EVAL-1 [ ] EVAL-2 [ ] EVAL-3 [ ] EVAL-4 [ ] EVAL-5 [ ] EVAL-6 [ ] EVAL-7 [ ] EVAL-8 [ ] EVAL-9 [ ] EVAL-10 [ ] EVAL-11 [ ]
EVAL-12 [ ] EVAL-13 [ ] EVAL-14 [ ] EVAL-15 [ ] EVAL-16 [ ] EVAL-17 [ ] EVAL-18 [ ] EVAL-19 [ ] EVAL-20 [ ] EVAL-21 [ ] EVAL-22 [ ]
NET-1 [ ] NET-2 [ ] NET-3 [ ] NET-4 [ ] NET-5 [ ] NET-6 [ ] NET-7 [ ] NET-8 [ ]
NET-9 [ ] NET-10 [ ] NET-11 [ ] NET-12 [ ] NET-13 [ ] NET-14 [ ] NET-15 [ ] NET-16 [ ]
WAIT-1 [ ] WAIT-2 [ ] WAIT-3 [ ]
SEC-1 [ ] SEC-2 [ ]
REAL-1 [ ] REAL-2 [ ]
RELOAD-1 [ ] RESOLVER-1 [ ]   (Step 7, §4.14)
LEASE-1 [ ] LEASE-2 [ ] LEASE-3 [ ] LEASE-4 [ ] LEASE-5 [ ] LEASE-6 [ (a) | (b) ] LEASE-7 [ ]
SCREEN-1 [ ] (flash ____ ms) SCREEN-2 [ ] SCREEN-3 (a) [ ] (b) [ ] SCREEN-4 [ ] (cdp: ____) SCREEN-5 [ ]
BG-1 [ ] BG-2 [ ] BG-3 [ ] BG-4 [ ]
R9-RELOAD-1 [ ] R9-SCREEN-2 [ ] R9-SCREEN-4 [ ] R9-LEASE-3 [ ] R9-RESTORE [ | not measured ]   (Run 9, §4.15)
R9-SCREEN-1 [ ] (flash ____ ms) R9-SCREEN-3 (a) [ ] (b) [ ] R9-SCREEN-5 [ ] R9-RESOLVER-1 [ ] R9-NET-1 [ ]
S6-STALE [ ] SDK-1 [ ] SDK-2 [ ] SDK-3 [ ] SDK-4 [ ] SDK-5 [ ] SDK-6D [ ] SDK-6 [ | waits for the user ] SDK-7D [ ] SDK-7 [ | waits for the user ] (hash ____ ; MCP leg [ | not measured ])   (Step 8 S6, §4.19)
SDK-8 [ ] SM-0 [ ] SM-1 [ | not measured ] (SM-1 log [ ]; counts equal [ ]; daemon pid same [ ])

Failures / notes (TC id → what happened → SW-console / server-stderr excerpt):
- …
```

### Run 2 — 2026-09-03 (Phase C verification of commit `39e6cb4`)

```
Date: 2026-09-03  Chrome version: 152.0.7977.75 (Official Build, 64-bit)  Node: 20+  OS: Windows 11 Pro 26200
Display: 24" 1920×1080, OS scaling 100%, Chrome zoom 100% → DPR 1

SMOKE-1 [P]   SMOKE-2 [P]
PERC-1 [P] PERC-2 [P] PERC-3 [P] PERC-4 [P] PERC-5 [P] PERC-6 [P] PERC-7 [P] PERC-8 [P] PERC-9 [P]
ACT-1 [P] ACT-2 [P]
(other rows not re-run this pass — see Run 1, 2026-06-04, in §0 of docs/progress-and-roadmap.md)
```

Scope: PERC-5…9 (never run live before) plus a regression smoke over PERC-1…4 / ACT-1…2 to confirm
the Phase C snapshot rewrite didn't regress the earlier pass. **All 13 cases passed on the first
attempt; no code changes were needed.** Service-worker console clean (no errors) for the whole run.

Evidence per case:

- **PERC-1/2** — first snapshot: `textbox "Email address" [ref=e1]`, `textbox "Password" [ref=e2]`
  (via `aria-labelledby`), `textbox "Search query" [ref=e3]` (via placeholder),
  `combobox "Favorite fruit" [ref=e4]`, `button "Sign in" [ref=e5]`, `link "Jump to bottom" [ref=e9]`.
- **PERC-3/4** — viewport PNG renders; `fullPage:true` returns a taller PNG containing `BOTTOM MARKER`.
  The debugging banner appeared for the full-page capture and cleared afterwards.
- **ACT-1/2** — `browser_type e1 "a@b.com"` → `status: email = a@b.com`;
  `browser_click e6` → snapshot `Click counter: 1`, screenshot `status: counter = 1`.
- **PERC-5 ★** — `button "Shadow button" [ref=e10]` listed; `Sealed button (must not be listed)` absent
  from the snapshot even though the screenshot shows it *rendered* (so the exclusion is the closed-root
  rule, not a missing element). Click → `status: shadow button clicked`. The fixture attaches that
  listener to the button *inside* the open root and gives the host `<div>` none, so the RefMap held the
  shadow element, not the host.
- **PERC-6 ★** — `button "Iframe button" [ref=e11]` present on the **first** snapshot (no frame-population
  timing issue). Click → `status: iframe button clicked (isTrusted = false)`, frame `<p>`:
  `iframe: synthetic click`.
- **PERC-7** — `browser_click {ref:e11, trusted:true}` → frame `<p>`: `iframe: TRUSTED click`,
  `status: iframe button clicked (isTrusted = true)`. The banner appeared and cleared. Frame-offset
  `centerOf` is therefore correct **at 100% zoom / DPR 1**; HiDPI and non-100% zoom remain unverified
  (see Phase D / the "Trusted-click coordinates" limitation).
- **PERC-8 ★** — none of the four decoys appear in any snapshot. `Decoy: aria-hidden` and `Decoy: inert`
  are *visibly rendered* in the screenshot, so their exclusion is semantic pruning rather than absence.
  `Decoy: zero size` carries no `aria-hidden`/`inert`/`display:none`, so only the zero-size filter can
  drop it — confirming the `hasLayout(doc)` gate behaves correctly in real Chrome, which the jsdom unit
  tests cannot prove.
- **PERC-9** — snapshot lists `spinbutton "Quantity" [ref=e12]`, `slider "Volume" [ref=e13]`,
  `listbox "Tags" [ref=e14]`, `textbox "Notes editor" [ref=e15]` (contenteditable),
  `tab "Details tab" [ref=e16]`, `button "Disabled action" [ref=e17] [disabled]`.
  `browser_type e12 "7"` → `status: qty = 7`; `browser_click e16` → `status: role=tab clicked`.

Failures / notes:
- None. One documentation defect found and fixed in this commit: SMOKE-2 previously expected the
  `status:` text in the snapshot; Phase C snapshots list only interactive elements, so that line is
  screenshot-only.

### Run 3 — 2026-09-03 (Phase D verification of commits `4400a21` + `c2ceec5`)

```
Date: 2026-09-03  Chrome version: 152  Node: 20+  OS: Windows 11 Pro 26200
Display: 1920-px-wide window. Run across three conditions:
  (a) OS scaling 100%, Chrome zoom 100%  → DPR 1,    innerWidth 1920
  (b) OS scaling 100%, Chrome zoom 150%  → DPR 1.5,  innerWidth 1280
  (c) OS scaling 125%, Chrome zoom 100%  → DPR 1.25, innerWidth 1536

TRUST-4 [P] TRUST-5 [P] TRUST-6 [P] TRUST-7 [P]
ACT-1 [P] ACT-7 [P]                       (regression: default paths unchanged)
PERC-7 [P]                                (re-run under 150% zoom)
```

Evidence:
- **TRUST-4** — synthetic first as a control: `status: synthetic input ignored`. Then
  `trusted:true` with `"hi"` → `status: TRUSTED input = hi` and the field reads `hi`, having
  replaced the pre-existing `nope`. Again with `"yo"` → field reads `yo`, **not** `hiyo`, proving
  select-all-then-replace.
- **TRUST-5** — `browser_press_key {"key":"Enter","trusted":true}` → `status: TRUSTED key = Enter`.
- **TRUST-6** — failed on the first attempt and surfaced two real defects (both fixed in
  `4400a21`): the field read `x@ycom` because `.` was sent as `windowsVirtualKeyCode` 46 =
  `VK_DELETE`, and `#email` sat outside the `<form>` so no real Enter could submit it. After the
  fixes: `status: form submitted (email = x@y.com)` with the `.` intact.
- **TRUST-7** — at 150 % zoom the hit pad previously reported `hit at 635,755 exp 635,755 on=HTML`:
  correct coordinates, off-screen, hit nothing. After `c2ceec5`: `hit at 635,331 exp 635,331
  on=hit-pad`. `#trusted-only` and PERC-7's iframe button both hit under zoom too.
- **ACT-7** — no error; the `status:` line is unchanged because a synthetic `el.click()` does not
  move focus, so the synthetic keydown lands on `<body>`. Pre-existing behaviour, not a Phase D
  regression.

Zoom/DPR measurements (the D2 spike) are tabulated in
`docs/plans/2026-09-03-step2-phase-d-action-fidelity.md`, "Spike results".

Failures / notes:
- No open failures. Both defects found were fixed and re-verified in the same session.
- TRUST-3 (debugger-vs-DevTools conflict) still deferred.

### Run 4 — 2026-09-03 (Phase B robustness: commits `7e35ff9`, `d9a0ba0`, `458f291`)

```
Date: 2026-09-03  Chrome version: 152  Node: 20+  OS: Windows 11 Pro 26200
Display: 1920-px window, Chrome zoom left at 150% from Run 3 (DPR 1.5, innerWidth 1280) — irrelevant to these cases

STAT-1 [P]  TRUST-3 [P*]  TRUST-8 [P]  CONN-6 [P]  CONN-7 [P]  CONN-5 [P]
(* passed via the Chrome ≥ 152 branch — see below)
```

Scope: the 17th tool, the debugger-error UX, dead-Chrome detection, port-busy self-healing, and the
long-deferred idle-keepalive soak. **All six pass; no code changes needed after the three commits.**

Evidence per case:

- **STAT-1** — `browser_status` → `WebSocket host: listening on 127.0.0.1:9234` / `Extension: connected` /
  `Active tab: [1108099065] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html`.
- **TRUST-3** — with DevTools docked on the tab (the viewport screenshot was visibly narrower), a
  `trusted:true` click on `#trusted-only` **succeeded**: `status: TRUSTED click received`. Chrome 152 lets
  an extension debugger attach alongside DevTools, so the "one debugger per tab" conflict this case was
  written for no longer happens. `describeDebuggerError`'s DevTools branch stays as a defensive path for
  older Chrome / other debugger extensions; it is unit-tested but could not be triggered live. The case
  text now accepts either outcome.
- **TRUST-8** — a ~600-character `browser_type {trusted:true}`; Cancel clicked on the banner mid-typing →
  tool error: "The debugging session was cancelled mid-action (the 'is debugging this browser' banner's
  Cancel was clicked, or DevTools took over the tab) — retry the action." SW console:
  `[bridge] debugger detached from tab 1108099065 reason: canceled_by_user`. Retry typed `retry ok` →
  `status: TRUSTED input = retry ok`.
- **CONN-6** — all `chrome.exe` ended. The *first* `browser_status` poll already said `Extension: not
  connected` — Chrome's exit closed the TCP socket cleanly, so the server saw `close` immediately and the
  heartbeat was never needed (it covers a *hung* peer, which only the unit test exercises). After relaunch,
  `browser_status` showed connected + the restored tab and `browser_snapshot` worked; the server was not
  restarted.
- **CONN-7** — orphan `node server/dist/index.js` started first, then `/mcp` reconnect. `browser_status`:
  `WebSocket host: NOT listening (port 9234)` + `Problem: WebSocket port 9234 is busy (listen EADDRINUSE:
  address already in use 127.0.0.1:9234): another chrome-agent-bridge instance is probably still running …
  retries the bind every 5s …`; `browser_snapshot` failed with that same text (not the generic "not
  connected"). Orphan Ctrl-C'd → the next `browser_status` (well under 15 s later) was listening +
  connected, and `browser_snapshot` worked. Nothing restarted.
- **CONN-5** — Chrome left untouched from 22:42:08. Checks at 22:45:38 (+3.5 min) and 22:51:43 (+6 min
  more, 9.5 min total idle): `browser_status` connected, `browser_snapshot` instant, no reconnect delay.
  The offscreen-document socket survives MV3 service-worker culling.

Failures / notes:
- None. One expectation was wrong rather than the code: TRUST-3 assumed Chrome still enforces one
  debugger per tab; Chrome 152 does not.


### Run 5 — 2026-09-07 (Step 4 `browser_evaluate`: commits `8a13b30`, `d2c7a8a`, `0757542`, `376e4dd`)

```
Date: 2026-09-07  Chrome version: 152.0.0.0 (UA-CH brand "Google Chrome" 152)  Node: 20+  OS: Windows 11 Pro 26200
Display: 1536-px innerWidth, DPR 1.25 (OS scaling 125%), Chrome zoom 100%
Fixtures: http://localhost:8080/e2e-playground.html and .../e2e-playground-csp.html

EVAL-1 [P] EVAL-2 [P] EVAL-3 [P] EVAL-4 [F -> P] EVAL-5 [P] EVAL-6 [P] EVAL-7 [P*]
EVAL-8 [P] EVAL-9 [P] EVAL-10 [P] EVAL-11 [P] EVAL-12 [P] EVAL-13 [P] EVAL-14 [P] EVAL-15 [P]
EVAL-16 [-] EVAL-17 [-] EVAL-18 [P] EVAL-19 [P*] EVAL-20 [F -> P] EVAL-21 [P] EVAL-22 [P]

20 of 22 run, 20 passed. EVAL-4 and EVAL-20 failed on the first pass, were fixed in `376e4dd`, and
passed on a re-run against the rebuilt extension (see "Re-run" below).
(* passed against a corrected expectation — see the EVAL-7 / EVAL-19 rows in §4.7)
(- EVAL-16 and EVAL-17 deliberately not run: both need a human at the keyboard, and TRUST-3 /
   TRUST-8 already exercise the same two Chrome behaviours — an extension debugger attaching
   alongside DevTools, and a mid-action Cancel on the banner — through the very same `withDebugger`
   that `browser_evaluate` uses. Accepted as coverage by the maintainer on 2026-09-07.)
```

**One real defect found and fixed** (`fix(extension): unwrap a promise-valued completion value`):
`Runtime.evaluate {awaitPromise: true}` unwraps exactly **one** promise level, and under
`replMode: true` that level is Chrome's own async wrapper around the script. So any expression whose
*completion value* is itself a promise came back as `Promise {}` — including the
`(async () => { … })()` form `wrapExpression` emits for a bare `return` (EVAL-4) and any
`p.then(…)` (EVAL-20). `evaluateInPage` now resolves such a result with a second
`Runtime.awaitPromise` on the same deadline, gated by the new pure `pendingPromiseId(raw)`
(4 unit tests). Both cases were re-run against the rebuilt extension and pass — see "Re-run" below.

Evidence per case:

- **EVAL-1 ★** — `document.title` → `Agent Bridge E2E Playground`. Banner appeared and cleared.
- **EVAL-2 ★** — `window.__playground` → pretty JSON with `"version": "1"`, `"items": [1,2,3]`,
  `"secret": "[Function: secret]"`, `"node": "<button id=\"counter\"> \"Click counter: 0\""`,
  `"self": "[Circular]"`, and `big` cut after element `99` with `"… 400 more"` as its last element,
  then `(output truncated — narrow the expression, e.g. pick fields or slice the array)`. Every
  serialiser branch behaved in real Chrome exactly as the jsdom unit tests predicted.
- **EVAL-3 ★** — `(await fetch('/e2e-playground.html')).status` → `200`.
- **EVAL-4 ★** — `const r = await fetch('/e2e-playground.html'); return r.status` → **`Promise {}`**,
  not `200`. Root-caused live: `await (async () => (await fetch('/e2e-playground.html')).status)()`
  — which the `\breturn\b` heuristic leaves unwrapped — returned `200`, and
  `await (async () => { … r.status })()` returned `undefined`, so `await` *was* being honoured and
  the missing piece was a second unwrap. Fixed as above; **passes on re-run**.
- **EVAL-5 ★** — `throw new Error("boom")` → tool error `[chrome.debugger] Error: boom` +
  `    at <anonymous>:1:7`. Immediate, not a 30 s hang.
- **EVAL-6** — `await Promise.reject(new TypeError("nope"))` → `TypeError: nope` + `at <anonymous>:1:22`.
- **EVAL-7** — `foo(` → `SyntaxError: Unexpected end of input`. Clear, but with neither the `Uncaught`
  prefix nor a line/col: under `replMode` Chrome hands back a real `exception` object, so
  `formatException` takes its `description` branch rather than the `text` + position branch. The
  §4.7 expectation was corrected rather than the code — both branches stay unit-tested.
- **EVAL-8 ★** — `await new Promise(r => setTimeout(r, 20000))` with `timeoutMs: 1000` → in ~1 s,
  `Timed out after 1s — the debugger was detached; page-side work already started (e.g. a fetch)
  continues`. The next call (`document.title`) worked immediately; the banner was gone.
- **EVAL-9** — `while(true){}` with `timeoutMs: 1000` → the identical `Timed out after 1s …` message,
  and **the tab was fully responsive straight afterwards** (`document.title + document.readyState`
  returned instantly). *Which CDP branch:* the two branches are byte-identical to the agent by design
  (`timeoutMessage(ms)` is shared by `raceTimeout` and the `isExecutionTerminated` re-map), so the
  message cannot discriminate. What this run does pin: (a) Chrome 152 **does** honour
  `Runtime.evaluate.timeout` for synchronous code — V8 execution really was terminated, or the
  renderer main thread would still have been spinning and the next evaluate could not have run at
  all; and (b) the branch that *reports* is the bridge-side `raceTimeout`, because its deadline is
  set before `withDebugger` attaches (~100 ms) and so always expires before CDP's own timer, which
  starts only when evaluation begins. Both paths are implemented and render identically, so no code
  change was needed — this is the behaviour plan task E2.2 asked to pin.
- **EVAL-10** — `await new Promise(r => setTimeout(r, 35000)); 1` with `timeoutMs: 40000` → `1` after
  ~35 s. The per-call timeout (`bridge.call(…, {timeoutMs: 45000})`) beats the old fixed 30 s
  connection timeout, which would have failed with "Timed out after 30000ms calling evaluate".
- **EVAL-11** — `const a = 1; a + 1` → `2`, and `2` again on an immediate repeat. `replMode` gives
  both the completion value and `const` re-declaration.
- **EVAL-12 ★** — on the CSP fixture, `new Function("return 1")()` → `1`. (The `\breturn\b` heuristic
  correctly left it unwrapped — the word is inside a string literal.) The page's own `#eval-probe`
  line reads `page eval: BLOCKED — EvalError: Evaluating a string as JavaScript violates the
  following Content Security Policy directive because 'unsafe-eval' is not an allowed source of
  script: script-src 'self' 'unsafe-inline'`. Same call, same page: refused from page code, allowed
  over CDP. Design option A (`executeScript` + `new Function`) would have failed here.
- **EVAL-13 ★** — `document.querySelector('#counter').click(); document.querySelector('#count').textContent`
  → `1`; the counter and the `status:` line both moved.
- **EVAL-14** — `document.querySelectorAll('button')` → `NodeList [ "<button id=\"submit-btn\"> \"Sign
  in\"", … ]`, ten node descriptions — including the four decoys, because the serialiser walks the
  DOM rather than the a11y tree. Correct, and a useful contrast with `browser_snapshot`. No
  `(DOM node — …)` hint: kind is json.
- **EVAL-15** — `document.body` → `<body> "Agent Bridge E2E Playground status: counter = 1 Form Email
  address Password Favo…"` followed by `(DOM node — use browser_snapshot refs to act on it)`.
- **EVAL-16 / EVAL-17** — deliberately not run: both need a human at the keyboard (open DevTools on
  the tab; click the banner's Cancel mid-run). TRUST-3 and TRUST-8 already cover those two Chrome
  behaviours for the trusted-input path, and `browser_evaluate` reaches them through the same
  `withDebugger` — the attach and the detach-reason handling are shared code, not per-tool. The
  maintainer accepted that as coverage on 2026-09-07; re-open these two if `withDebugger` ever grows
  a per-caller attach path.
- **EVAL-18** — a `chrome://extensions` tab made active, then `document.title` → `browser_evaluate is
  not available here: the active tab is a restricted URL (chrome://, the New Tab page, or the Chrome
  Web Store) where extensions can't attach a debugger. (Cannot access a chrome:// URL)`. The E2.1
  `what`-threading works: the message names `browser_evaluate`, not "Trusted input".
- **EVAL-19** — `'x'.repeat(50000)` → 20 000 `x`s + `… [truncated: 30000 more chars]` + the
  truncation hint. The limit that applied is `maxChars`, not `maxString`; §4.7 corrected.
- **EVAL-20** — `navigator.clipboard.writeText("hi").then(() => "ok")` → **`Promise {}`** — the same
  defect as EVAL-4. `userGesture` itself stayed unproven on this pass; **passes on re-run**.
- **EVAL-21** — `JSON.stringify([typeof window.__agentBridge, typeof window.__playground])` →
  `["undefined","object"]`. The ISOLATED-world content script is invisible to page code and the
  page's own globals are visible, so `browser_evaluate` really is running in MAIN.
- **EVAL-22** — regression smoke after the `withDebugger(…, what)` signature change: `browser_click e6`
  → `count=1` (ACT-2); `browser_click {e7, trusted:true}` → `status: TRUSTED click received`
  (TRUST-2); `browser_screenshot {fullPage:true}` → a taller PNG containing `BOTTOM MARKER` (PERC-4).
  No regressions.

#### Re-run after `376e4dd` (rebuilt extension, reloaded) — 2026-09-07

```
EVAL-4 [P]  EVAL-20 [P]           (the two cases the fix targets)
EVAL-3 [P]  EVAL-14 [P]           (smoke: the unwrap must not disturb the paths that already worked)
```

- **EVAL-4 ★** — `const r = await fetch('/e2e-playground.html'); return r.status` → **`200`**. The
  `(async () => { … })()` wrapper's promise is now resolved by the follow-up `Runtime.awaitPromise`.
- **EVAL-20** — took two attempts, and the first one is the more interesting result:
  `navigator.clipboard.writeText("hi").then(() => "ok")` first returned a *tool error*,
  `NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.` That is
  the fix working — the promise was resolved (well, rejected) and its rejection surfaced as an error
  instead of the old silent `Promise {}`. The cause was environmental: the Chrome **window** did not
  have OS focus while the agent drove it from a terminal, and `document.hasFocus()` is a separate
  requirement from transient activation that no `Runtime.evaluate` option can satisfy. A direct probe
  confirmed the split — `{"hasFocus":false,"userActivationActive":true,"userActivationSticky":true}`
  — i.e. `userGesture: true` **was** granting activation all along. After `browser_select_tab` gave
  the window focus, the verbatim expression returned **`ok`**.
- **EVAL-3 ★** — `(await fetch('/e2e-playground.html')).status` → `200`, unchanged.
- **EVAL-14** — `document.querySelectorAll('button')` → the same ten node descriptions as before: a
  non-promise object still routes to the in-page serialiser, untouched by the unwrap.
- Extra smoke, not a numbered case: `Promise.resolve({a: 1, b: [2, 3]})` → the pretty JSON for
  `{a, b}`, proving the unwrapped value then goes through the serialiser exactly like a direct one.

**Note for the docs (and for anyone writing EVAL-20 again):** `userGesture: true` supplies transient
activation, not window focus. Clipboard writes, and any other API that calls `document.hasFocus()`,
still fail with `NotAllowedError` when Chrome is in the background — which is the normal state while
an agent drives it. That is a Chrome rule, not a bridge limitation, and the error message says so
clearly enough to act on.

Failures / notes:
- One code defect (the promise-valued completion value) — fixed with a unit test in `376e4dd`, and
  both affected cases pass on the re-run below. No open failures.
- Two plan expectations were wrong rather than the code (EVAL-7, EVAL-19); §4.7 corrected to match
  what Chrome 152 actually does.
- EVAL-16 and EVAL-17 remain unrun (human interaction required).
- Environment note: port 9234 was initially held by orphaned `node server/dist/index.js` processes
  from earlier Claude sessions. `browser_status` diagnosed it exactly as CONN-7 describes, and the run
  started once they were closed — one session at a time really is a hard constraint.

### Run 6 — 2026-09-07 (Step 5 network inspection: commits `69682cd`, `d64d0fe`, `fdb0378`)

```
Date: 2026-09-07  Chrome version: 152.0.7977.82 (uaFullVersion)  Node: 20+  OS: Windows 11 Pro 26200
Fixtures: python -m http.server 8080 --directory test-fixtures

NET-1 [P] NET-2 [P] NET-3 [P] NET-4 [P] NET-5 [P*] NET-6 [P] NET-7 [P] NET-8 [P*]
NET-9 [P] NET-10 [P] NET-11 [P*] NET-12 [P] NET-13 [P] NET-14 [P] NET-15 [P]
NET-16 [P*] (added 2026-09-07, Part N6, commit `feat: browser_wait_for networkIdle`)
(only the NET rows were re-run this pass; ACT-2 / TRUST-2 / EVAL-1 / WAIT-1 re-run as NET-15)
```

Evidence (tool output, trimmed):

**NET-1** — always-on capture, no banner. `browser_network_clear {}` → `Cleared 6 requests.`,
navigate, `browser_network_requests {}`:

```
Network — active tab: showing 1 of 1 (recording since 5m02s ago; 0 pending)
[3893]  2.8s ago   GET     200  document    5ms  12.9 KB  http://localhost:8080/e2e-playground.html
```

*Note 2026-10-22 (W1): `12.9 KB` here is a CRLF working copy of the fixture (13 168 bytes); the
LF file (12 914 bytes) prints `12.6 KB`, proven by a live probe (decisions.md · 2026-10-22 · NET-1's
`12.9 KB` came from a CRLF copy of the fixture, proven by a live probe).*

No debugging banner at any point (capture is `chrome.webRequest`; the banner only appeared for the
`browser_evaluate` calls used to read the status line).

**NET-2** — **Fetch JSON**, then `{"id":"3894"}`:

```
[3894]  2.8s ago   GET     200  xhr         3ms  28 B    http://localhost:8080/ok.json
---
[3894] GET http://localhost:8080/ok.json
type: xhr   initiator: http://localhost:8080   started 5.8s ago   took 3ms
status: 200 OK   from cache: no   ip: ::1   size: 28 B
request headers:
  sec-ch-ua-platform / user-agent / sec-ch-ua / dnt / sec-ch-ua-mobile / accept
response headers:
  server / date / content-type: application/json / content-length: 28 / last-modified
```

No `cookie` key on the request (extraHeaders omitted, §0.4); `initiator` correct. Size is 28 B, not
the plan's illustrative 118 B (the fixture body is 28 bytes).

**NET-3** — **Fetch 404**, `{"failedOnly": true}`:

```
Network — active tab: showing 1 of 1 (recording since 5m22s ago; 0 pending)
[3895]  3.2s ago   GET     404  xhr         3ms  335 B   http://localhost:8080/nope
```

**NET-4** — **POST form**, `{"id":"3896"}`:

```
[3896] POST http://localhost:8080/e2e-playground.html
status: 501 Unsupported method ('POST')   from cache: no   ip: ::1   size: 357 B
request headers: … content-type: application/x-www-form-urlencoded;charset=UTF-8 …
request body:
  password=<redacted>&user=a
```

Redaction confirmed. Field order is `password` then `user` — `formData` key order, not the order the
form sent them; harmless.

**NET-5** — **Fetch unreachable**:

```
[3899]  2.8s ago   GET     ERR  xhr        2.0s  —       http://127.0.0.1:9999/  net::ERR_CONNECTION_REFUSED
```

`P*`: the fixture originally used the plan's `http://127.0.0.1:9/`, which Chrome refuses before it
reaches the network — `net::ERR_UNSAFE_PORT` (port 9 is on Chrome's blocked-port list). The fixture
now uses port **9999**, which produces the intended `net::ERR_CONNECTION_REFUSED`. Both shapes prove
the `onErrorOccurred` path.

**NET-6** — **Fetch redirect**, `{"filter":"redir"}`:

```
[3900]  2.8s ago   GET     301  xhr         2ms  0 B     http://localhost:8080/redir  → http://localhost:8080/redir/
[3900:2]  2.8s ago   GET     200  xhr         3ms  38 B    http://localhost:8080/redir/
```

Both hops present with the `:2` suffix. Cosmetic: `[3900:2]` is 8 chars against the 6-wide id column,
so that row's later columns shift right by two characters.

**NET-7** — **Fetch black hole**, queried immediately and again after 25 s:

```
[3901]  2.9s ago   GET     ···  xhr        (pending)     http://10.255.255.1/          (header: 1 pending)
[3901]  34.7s ago  GET     ERR  xhr        21.0s  —      http://10.255.255.1/  net::ERR_CONNECTION_TIMED_OUT   (header: 0 pending)
```

**NET-8** — **Fetch cross-origin** (`https://example.com/`); page status line reads
`fetch cross-origin -> TypeError: Failed to fetch`:

```
[3902]  3.1s ago   GET     ERR  xhr        696ms  —       https://example.com/  net::ERR_FAILED
```

`P*`: the entry is **not** a 200. In Chrome 152 a CORS-blocked response fires `onErrorOccurred` with
`net::ERR_FAILED`, so this case does not demonstrate the plan's "a network-level 200 is not a
successful fetch" claim (§0.6). The claim still holds in principle (opaque/`no-cors` responses, and
CORS failures on older Chrome), but §0.6 and the docs should not cite a plain cross-origin `fetch()`
as the example. Recorded for Part N5.

**NET-9** — filters:

```
{"filter":"/nope|ok\\.json/"}   → showing 2 of 2: …/ok.json (200), …/nope (404)
{"filter":"/(/"}                → error: Invalid regex filter: /(/ — Invalid regular expression: /(/: Unterminated group
{"types":["xhr"]}               → showing 9 of 9, all xhr; the document + favicon entries are gone
{"limit":2}                     → showing 2 of 11, the two newest, oldest-first
```

**NET-10** — logged-in site (github.com), `{"includeHeaders": true, "limit": 5}` and an `id` lookup on
one of the tab's own XHRs:

```
Network — active tab: showing 5 of 308 (recording since 7m23s ago; 0 pending)
[4210]  2.8s ago   POST    204  ping       199ms  —       https://collector.github.com/github/collect
[4211]  2.6s ago   GET     404  xhr        246ms  —       https://github.com/github-copilot/chat/entitlement
… (3 more xhr 200s)
```

The `id` detail of a 200 XHR listed:
- **no `cookie` and no `set-cookie` header on any entry** — §0.4's strongest claim holds against a
  real logged-in session;
- **no `authorization` header appeared at all** on the entries inspected (GitHub authenticates by
  cookie), so the `<redacted>` path was not exercised against a live site — it is unit-tested;
- **`referer` and `origin` are absent** from the stored request headers — they are `extraHeaders`-class
  headers on this Chrome, so omitting `extraHeaders` costs them. This is the §0.4 follow-up flag:
  record it, do not add `extraHeaders` in v1;
- response headers that *are* stored are ordinary ones (`content-type`, `etag`, `cache-control`,
  `strict-transport-security`, …).
- SW console: not readable from the agent side (`chrome://extensions` is a restricted URL). Source
  audit of `extension/src/{sw,network-state,handlers/network}.ts` shows the only network-related
  console calls are `[bridge] network: rehydrated N entries` and two quota warnings carrying **counts
  only** — no URL, header or body is ever logged. A human spot-check of the SW console is still the
  belt-and-braces confirmation.

**NET-11** — service-worker culling soak. **The worker never idles out on its own**: the bridge's
25 s keepalive alarm keeps it alive indefinitely, so the soak was run by force-stopping the worker
from `chrome://serviceworker-internals` (the card then reads "service worker (Inactive)"). On the
next event the worker restarted and its console printed, exactly once:

```
[bridge] network: rehydrated 4 entries
```

The worker was force-stopped a second time, then woken by `browser_snapshot`; `browser_click`
(**Fetch JSON**) and `browser_network_requests {}` gave:

```
Network — active tab: showing 6 of 6 (recording since 12m56s ago; 0 pending)
[356]   2m00s ago  GET     200  document    2ms  —       https://www.google.com/search/warmup.html
[361]   2m00s ago  GET     200  font        4ms  38.6 KB  https://fonts.gstatic.com/s/googlesans/…woff2
[374]   1m58s ago  GET     200  document    4ms  12.6 KB  http://localhost:8080/e2e-playground.html
[375]   1m58s ago  GET     404  image       2ms  335 B   http://localhost:8080/favicon.ico
[376]   1m55s ago  GET     200  xhr         3ms  28 B    http://localhost:8080/ok.json
[377]   2.6s ago   GET     200  xhr         1ms  28 B    http://localhost:8080/ok.json
```

`P*` — the claim is proven, but not with the entry the case scripts. Entries **376** (recorded before
the second force-stop) and **377** (recorded after the restart) are listed together in one query, and
`recording since` is still 12m56s, i.e. the `netlog:meta` written at the start of the run survived
several worker restarts. What is missing is the pre-soak entry `[4820]`: **its tab was closed during
the soak** (the user opened `chrome://extensions` and `chrome://serviceworker-internals`, and the
fixture was reopened as a new tab — `browser_list_tabs` afterwards shows tab `1108101486` gone), so
`chrome.tabs.onRemoved` → `forgetTab` dropped that bucket exactly as designed. That is NET-12's
behaviour, not a write-through failure.

"**rehydrated 4 entries**" vs. the single entry left in the active tab is **expected, not a
discrepancy**: rehydrate reads `storage.session.get(null)` and merges *every* `netlog:<tabId>` key, so
the number is the whole log across all tabs at that moment — by then the original tab's bucket had
been forgotten and the replacement tab had recorded four entries (its Google warm-up pair plus the
fixture document and favicon).

Two further observations from this case:
- After the worker churn, Chrome's `webRequest` `requestId` counter restarted low (…4820 → 181, 356,
  374 …). Entry ids are therefore only unique/stable **within a capture session** — an id from an
  earlier listing may not resolve later, and can in principle be reused. Worth a sentence in
  `docs/setup.md`.
- The write-through's real value is protection against a **forced stop or crash** of the service
  worker (and against Chrome's own culling on machines where the keepalive alarm is throttled), not
  against routine idle culling — which the keepalive already prevents — and not against a Chrome
  exit, which clears `storage.session` by design (a stated non-goal).


**NET-12** — `browser_new_tab` → fixture → **Fetch JSON** → `{"tab":"all","filter":"ok.json"}`, then
close that tab and repeat:

```
[3894]  tab:1108101486  3m05s ago  GET  200  xhr  3ms  28 B  http://localhost:8080/ok.json
[4219]  tab:1108101495  3.2s ago   GET  200  xhr  3ms  28 B  http://localhost:8080/ok.json
--- after browser_close_tab 1108101495 ---
[3894]  tab:1108101486  3m11s ago  GET  200  xhr  3ms  28 B  http://localhost:8080/ok.json
```

`chrome.tabs.onRemoved` → `forgetTab` works; the surviving tab is untouched.

**NET-13** — `browser_network_clear {}` → `Cleared 11 requests.`; then:

```
No requests recorded for active tab (recording since 8m27s ago). Reload or act on the page, then query again.
```

`recording since` is unchanged across the clear (8m20s → 8m27s of real elapsed time) — only
`tab:"all"` resets it.

**NET-14** — `browser_evaluate` issuing 600 `fetch('/ok.json?i='+i)`, then
`{"limit":500,"types":["xhr"]}`:

```
Network — active tab: showing 500 of 500 (recording since 8m50s ago; 0 pending)
[4320]  … http://localhost:8080/ok.json?i=100
…
… [truncated: 289 more lines — narrow with filter/limit]
```

The per-tab cap held at exactly 500, `i=0…99` were evicted (oldest-first), the 20 000-char cap cut
the text with the documented footer, and Chrome, the fixture and the bridge stayed responsive
throughout. No quota warning observed in the tool path (the SW console needs a human glance).

**NET-15** — regression smoke: ACT-2 (`status: counter = 1`), TRUST-2 (trusted click →
`status: TRUSTED click received`, banner appeared and cleared), EVAL-1 (`document.title` →
`Agent Bridge E2E Playground`), WAIT-1 (`browser_wait_for {"text":"Async content loaded!"}` returned
in ~1.5 s). The manifest permission and the six new top-level `webRequest` listeners disturbed
neither the router nor `withDebugger`.

**NET-16** — `browser_wait_for {"networkIdle": true}` (Part N6, run 2026-09-07 after a rebuild +
extension reload + `/mcp`). The `networkIdle`/`idleMs` parameters were present on the reconnected
server's `browser_wait_for` schema.

*(a) after a completed fetch.* `browser_network_clear {}` → `Cleared 13 requests.`, click
**Fetch JSON**, then `browser_wait_for {"networkIdle": true}` → `Network idle for 500ms`. Wall-clock
sandwich (`date` → tool → `date`) 4.51 s against a 4.31 s baseline for a no-op `browser_status` in
the same sandwich, i.e. **~0.2 s of actual waiting — it returned at once**. That is the expected
behaviour, not a miss: an agent's next tool call arrives whole seconds after the click, by which time
the tab has already been quiet for longer than `idleMs`. The plan's "~0.5 s" is unobservable through
an agent round-trip.

*(b) with a request still pending.* Click **Fetch black hole** (`http://10.255.255.1/`), then
`browser_wait_for {"networkIdle": true}` → `Network idle for 500ms`, sandwich 4.66 s (again ~0.3 s of
real waiting). The log taken straight afterwards proves the request was genuinely in flight:

```
Network — active tab: showing 2 of 2 (recording since 1m39s ago; 1 pending)
[790]   53.7s ago  GET     200  xhr         2ms  28 B    http://localhost:8080/ok.json
[791]   9.2s ago   GET     ···  xhr        (pending)     http://10.255.255.1/
```

This is the case the design turns on (§0.6): a pending stream does **not** block `networkIdle`,
because idle is defined by the last *event*, not by the pending count.

*(c) the poll loop actually blocks — and `idleMs` is honoured.* Round-trip latency makes (a)/(b)
unable to show the wait doing any work, so activity was generated with a known end time:

```
browser_evaluate: window.__burstEnd = Date.now() + 8000;
                  (function tick(){ if (Date.now() < window.__burstEnd) {
                     fetch('/ok.json?b=' + Date.now()); setTimeout(tick, 250); } })();
→ "burst started at 1788798899985, ends at 1788798907985"
browser_wait_for {"networkIdle": true}            → Network idle for 500ms   (returned by t=…909914)
```

The wait was issued *during* the burst and returned 1 929 ms after the burst's last fetch (that
figure includes the post-return round-trip to the clock). Repeating with an identical 8 s burst
(`ends at 1788798927663`) and `{"networkIdle": true, "idleMs": 2000}` → `Network idle for 2000ms`,
returning 3 577 ms after the burst end. The **1 648 ms difference matches the 1 500 ms extra
`idleMs`** within one round-trip of noise — the poll loop is real and `idleMs` is what it waits for.

*(d) the 10 s ceiling.* A 20 s burst, then `browser_wait_for {"networkIdle": true}`:

```
Error: Timed out waiting for network idle: no 500ms quiet period in 10s
```

Verdict **P\*** — passes on substance, with the §4.8 expectation rewritten: the "~0.5 s / ~2 s"
timings in the plan are only observable when the wait is issued while the tab is still busy.

Failures / notes:
- `includeHeaders: true` has **no visible effect** through the MCP tool: the tool returns
  `result.text`, and `formatEntries` renders only the table — headers are attached to
  `result.entries`, which the MCP layer never prints. Headers are therefore reachable only via the
  `id` form. Not a wire-shape bug; either the formatter should render them under each line when
  asked, or the parameter's description should say "use `id` to see headers". Flagged for Part N5.
- `net::ERR_UNSAFE_PORT` (NET-5) and CORS → `net::ERR_FAILED` (NET-8): Chrome-behaviour findings, see
  above.
- `referer` / `origin` absent without `extraHeaders` (NET-10): the §0.4 follow-up flag is now
  evidence-backed.

### Run 7 — 2026-10-22 (Step 6 daemon, wave W1: MUX-1…MUX-10, DL-1, DL-2)

*Skeleton written 2026-10-22 by Step 6 stage D6, before any measurement; filled the same day by
wave W1 (gate G6-2). Full evidence, row by row (every command and the text it printed):
[`W1-run-record.md`](plans/2026-10-21-step6-daemon-and-protocol-v2-steps/W1-run-record.md); the
daemon log of the whole wave: [`W1-daemon-log.txt`](plans/2026-10-21-step6-daemon-and-protocol-v2-steps/W1-daemon-log.txt).*

```
Date: 2026-10-22  Chrome version: 156.0.8078.48  Node: v25.2.1  OS: Windows 11 Pro 10.0.26300  Commit: fef70ff
MCP config path: mcp/dist/index.js [x]   bridge.token at the repo root [x]   BRIDGE_TOKEN unset everywhere [x]
Daemon build at the start (Get-DaemonBuild): 795fb769aeae5dbd2345c51a39b26f352bfaedc169ef97c0e157e20400a337bd
Driver: none (by hand) [x] MUX-1…8   desktop automation [ ]  browser driver [ ]   headless Claude sessions + window capture [x] MUX-9…10, DL, MUX-5 re-measurements
        driver check printed nothing (A1) [x]  (after the driver session was relaunched with no bridge MCP)
Steps done by the user ([USER], and any [UI] step the driver could not do): every [UI] step of MUX-1…MUX-8
        (sessions S1…S5, /exit, /mcp, closing and reopening Chrome, the service-worker console)

MUX-1 [P] MUX-2 [P] MUX-3 [P] MUX-4 [P] MUX-5 [F: snapshot sub-check; re-measured, see below] MUX-6 [P]
MUX-7 (a) [as Stage 0] (b) [P] (c) [P, 2nd attempt] (d) [P] (e, optional) [P]   MUX-8 [P] MUX-9 [P*]   MUX-10 (optional) [P]
DL-1 [P; SW-console line not observed] DL-2 [P]
D6.3 log hygiene: '://' count 0  token count 0  withheld-line count 0   (148 lines)
```
*P\* — NET-1 printed `12.6 KB` where the row expects `12.9 KB`; the expectation is wrong (below).*

Evidence (command → observed text; the run record has every line):
- **MUX-1** — `browser_status`: `Daemon: connected on 127.0.0.1:9234 (build 795fb769…, up 15s)` / `Clients (1): claude-code #14996` / `Extension: connected` / `Active tab: [1108125907] New Tab — chrome://newtab/` · `Get-BridgeDaemon`: one row, 21144, parent 14996 · log tail: `start pid=21144`, `config pid=21144 port=9234 idleMs=600000 build=795fb769…`, `listening on 127.0.0.1:9234`, `client + "claude-code #14996" (1 client)`
- **MUX-2** — both `browser_status`: `Clients (2): claude-code #14996, claude-code #17384`, same build · both snapshots: `textbox "Email address" [ref=e1]`, `button "Sign in" [ref=e5]` on `http://localhost:8080/e2e-playground.html` · log: `client + "claude-code #17384" (2 clients)`, no new `start`
- **MUX-3** — `mux3.out`: the seven lines in order, ending `still connected after the hold — clients (3)` and `closed after 60027 ms — OK`; `mux3.err` empty; exit code 0 · during the hold: `Clients (3): claude-code #14996, claude-code #17384, hello-recipe`, active `[1108125907]` = `listTabs`'s · after: `Clients (2): …` · log: `client + "hello-recipe" (3 clients)`, `client - "hello-recipe" (2 clients)`
- **MUX-4** — T0 `09:10:57Z client - "hello-recipe" (0 clients)` · T1 `09:11:17Z idle for 20000 ms with no clients — shutting down`, then `exit 0 (shutdown 1001) clients=0 extensionEvents=0 ignoredClientFrames=0` · T1 − T0: 20 s · `$t1 − $t0`: 20.2 s · SW console: `connection: down` repeated (55× after the exit) · `30.1 s after $t1: Get-BridgeDaemon lists 0 process(es)`
- **MUX-5** — `<old>` 795fb769… / `<new>` d74f5913… · recipe: `daemon build d74f5913…`, `up 0s`, `— OK`, exit 0 · log constraints (1)–(5) hold (old daemon `exit 0 (shutdown 4002)`, two starters, the loser `port 9234 in use`) · `browser_status` after: `build d74f5913…`, `claude-code #21044` (no `/mcp`) · **`browser_snapshot`: `No active tab in the last-focused window` — FAIL**: Chrome's last-focused window was the service-worker DevTools window opened for MUX-4 (`activeTab()` asks for the last-focused window, `extension/src/tabs.ts:2`). pids `<D1>` 10964 → `<D2>` 31944. SW console `down`, `up`. Re-measured twice by the driver on a headless session; the last one (R3): status before `build 795fb769…`, recipe `build 8db1207d…`, `up 0s`; status after `build 8db1207d…`, same `claude-code #11268`; snapshot returned (no error), 16.9 s after the recipe (the row says within 15 s)
- **MUX-6** — `Get-BridgeDaemon` (the evidence): one process, 2456, parent 22364 · exit codes: 0, 0 · `.out`: `race-a: closed after 302 ms — OK` / `race-b: closed after 289 ms — OK`; `.err` empty · start lines: two (2456, 23260); the loser wrote `port 9234 in use — another daemon owns it` and `exit 0 (port in use)`
- **MUX-7** — PIDs: S1 M 21408 / P 11584 / D 6872; S2 M 21864 / P 34584; S2′ M 16492 / P 14996 / D 31436; S3 M 28880 / P 4856 / D3 2576; S4 M 31352 / P 25696 / D4 30296; S5 M 10872 / P 16460 · (b): `(b) M1 alive: False; waited 0.0 s`, `Get-Process -Id 11584` nothing, D alive, `client - "claude-code #21408" (0 clients)`, no `exit` · (c): `(c) M2 alive: False; waited 0.2 s`; the first attempt's `/mcp` came after D had idled out (10 min), so it was repeated: `/mcp` → `Clients (1): claude-code #19796` on the same daemon, no `start` · (a): `SUCCESS: The process with PID 2576 (child process of PID 28880) has been terminated.`, D3 gone, no `exit` line · (d): `taskkill` names 19040, 10872, 16460 only; D4 alive; S4 `Daemon: connected …`, `Extension: connected` · (e): `(e) waited 3.3 s`, new 20360, parent 31352; S4 `Clients (1): claude-code #31352`, `Extension: connected`, no `/mcp`
- **MUX-8** — failing run: `FAILED after 15029 ms — NOT_CONNECTED: Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 9234)`, exit 1 · session meanwhile: `Daemon: connected …`, `Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?` · recovering run: `closed after 19 ms — OK`, exit 0 · optional run: `closed after 3672 ms — OK`, exit 0
- **MUX-9** — ACT-1: `status: email = a@b.com` · ACT-2: `status: counter = 1` · TRUST-2: `status: TRUSTED click received`, banner captured during the call and gone 6 s after · EVAL-1: `Agent Bridge E2E Playground`, banner during, gone after · NET-1: `Cleared 15 requests.`, `Network — active tab: showing 1 of 1 (recording since 59m55s ago; 0 pending)`, `[47]    1.5s ago   GET     200  document    4ms  12.6 KB  http://localhost:8080/e2e-playground.html`, no banner · DL-1: recorded under **DL-1**
- **MUX-10** — `FAILED after 2016 ms — VERSION: No welcome from 127.0.0.1:9234 within 2 s after hello: a pre-Step-6 bridge server holds port 9234. …`, exit 1, `Get-BridgeDaemon` empty; after the old server stopped: `closed after 340 ms — OK`, exit 0; worktree removed
- **DL-1** — (0) `False` · (a) `Active tab: [1108126126] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html` before and after; `Saved C:\Users\aliev\AppData\Local\Temp\bridge-e2e\dl1\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce`; no banner; SW console not observed · (b) `0A6B99CA…2956CE`, `hello.txt` · (c) `…\dl1\hello.txt exists — pass overwrite:true to replace it` · (d) the two lines again
- **DL-2** — (0) `False` · (a) `/page` → `200`; `/dl2` → tool error `[chrome.debugger] TypeError: Failed to fetch`; fixture log `"GET /dl2 HTTP/1.1" 302 -` · (b) `Saved …\dl2\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca…` / `(followed redirects to localhost:8080)`; 8080 log `"GET /dl/hello.txt HTTP/1.1" 200 -` · (c) the hash of DL-1 (b)

Decisions this run informs: #14 (MUX-7 (a), (b)) — **stands**: the daemon survives a normal end, a
shim kill and a tree kill of a session that did not spawn it, and dies only in a tree kill of its own
spawner's tree (as Stage 0 measured), so no launcher is built (decisions.md · 2026-10-22 · The user
rules on the seven Step 6 open decisions); #15 (MUX-7 (e)) — confirmed, twice; #21 (MUX-8) —
confirmed; #22, #23, #24 (MUX-5) — the handover, the 4002 reconnect and the losing starter behave as
built; #25 (MUX-4, MUX-6) — no log line lost in the bind race; #27 (MUX-8, MUX-1) — confirmed; #13
(MUX-10) — confirmed.

Failures / notes:
- **MUX-5's snapshot sub-check failed** (test set-up: a DevTools window had focus); re-measured, see
  above. Proposed for the user's ruling in the as-built (wave W1 section).
- **NET-1's expected `12.9 KB` is an error in the row.** The fixture is 12 914 bytes with LF line
  ends; the formatter divides by 1024 (`extension/src/network-log.ts:259`), so `12.6 KB` is right, and
  Run 6's own later line `[374] … 12.6 KB` shows the same page. Run 6's NET-1 `12.9 KB` fits a CRLF copy
  (13 168 bytes → 12.86 KB) under `core.autocrlf=true`, or a version of the fixture edited during Run 6
  (the W1 verifier's note; not proven either way).
- **DL-1's `[bridge] download held 69 bytes`** was not observed: the service-worker console was not open
  in the autonomous part (opening it moves the last-focused window, see MUX-5).
- Findings (no code changed): `browser_status`'s active tab and the action tools' active tab can
  differ; a daemon spawned through `Start-Process -NoNewWindow` kept the caller's output pipe open
  until it exited; five wave-sheet nits. All in the run record § Findings.

### Run 8 — 2026-10-22 (Step 7 multi-actor tabs, wave T5: RELOAD-1, RESOLVER-1, LEASE-1…7, SCREEN-1…5, BG-1…4, regression and designed-change rows)

*Rows and expected text written before the run (commit `e7e56ff`, §4.14); run the same day by the
driver with headless actors (decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end
(#33)). Full evidence, row by row (every command and the text it printed):
[`T5-run-record.md`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-run-record.md); the daemon log of
the wave: [`T5-daemon-log.txt`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-daemon-log.txt).*

```
Date: 2026-10-22  Chrome version: 156.0.8078.48  Node: v25.2.1  OS: Windows 11 Pro 10.0.26300  Commit: 19e8971 (rows at e7e56ff)
Daemon build (Get-DaemonBuild): ee86adea97f873f43d0001dcbae60f3b10717ffd327dbcdccbf8395fbca2c5c5
First line: the user's "I reloaded the extention." (19:36:39Z); no /mcp — every actor a fresh headless session
Driver: headless actors (t5-actor.ts, Sonnet) + SDK scripts (recipes/t5.ts) + window helpers (t5-win.ps1); driver check printed nothing (A1)

RELOAD-1 [P]  RESOLVER-1 [F as written: instrument — the stricter title sub-check; the Stage 0 rule met]
LEASE-1 [P] LEASE-2 [P] LEASE-3 [F: url sub-check only] LEASE-4 [P] LEASE-5 [P] LEASE-6 [P (b)] LEASE-7 [P]
SCREEN-1 [F as written: instrument] (flash 1509 / 1486 / 1493 ms, median 1493 ms; page-side visibilitychange)
SCREEN-2 [F: mode:"cdp" on a hidden tab → TIMEOUT 35 s]  SCREEN-3 (a) [F as written: instrument; serialised] (b) [F as written: instrument]
SCREEN-4 [P-as-designed] (cdp: TIMEOUT 25 s)  SCREEN-5 [F as written: instrument; capture worked unfocused]
BG-1 [F] BG-2 [F] (focus-emulation retry not run, #61)  BG-3 [P] BG-4 [P]
Regression (T5.3): PERC-1 [P] PERC-2 [P] PERC-3 [P] PERC-4 [P] ACT-1 [P] ACT-2 [P] ACT-3 [P] TRUST-2 [P] EVAL-1 [P] NET-1 [F: 12.6 KB from Chrome's cache]
Designed changes (#60): MUX-1 [P] STAT-1 [P] TAB-1 [P] TAB-2 [P] TAB-3 [P] TAB-4 [P] TAB-5 [P] MUX-3 [P] NET-12 [P] DL-1 [P; SW-console line not observed]
G7-1 deferrals: ACT-8 [P]; offscreen relay's event frame [P] (LEASE-3, LEASE-5)
Log hygiene: '://' count 0  token count 0  withheld-line count 0   (200 lines)
```

Evidence in short (the run record has every line):
- **RELOAD-1** — `CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab`; build `ee86adea…`.
- **LEASE-1** — B: `tab T7 is held by "claude-code #15352" since 19:50:38 — use browser_new_tab, or browser_list_tabs to pick a free tab`; B `Opened tab T8`; parallel clicks → each `button "Click counter: 1"` on its own URL; list `T7  [claude-code #15352] …?t5=lease1`, `T8* [claude-code #25152] …?t5=lease1-b`.
- **LEASE-2** — `30/30 type calls ok, 43.8 s`; `final value "lease2abcdefghijklmnopqrstuvwx"`; C's three snapshots inside the typing window, all `url: …?t5=lease2-claude`.
- **LEASE-3** — `leaseGranted {"tab":"T15","reason":"opener"}` after 31 ms from a *synthetic* click (opener id set); owner `t5-lease3` in both listings; the event's `url` is `""` where the row expected the popup URL.
- **LEASE-4** — refusal, then `client - "claude-code #15352" (1 client)`, then `Selected tab T7 …` and `[claude-code #25152]`.
- **LEASE-5** — `event tabGone {"tab":"T17","lastUrl":"http://localhost:8080/e2e-playground.html?t5=lease5","lastTitle":"T5 LEASE5 target"}`; `TAB_GONE: tab T17 was closed — call listTabs to pick another tab · data {…same…}`.
- **LEASE-6** — `PASS (b) — new chrome id 1108126396 (was 1108126391), the same handle: tabReplaced was applied`; while discarded: `INTERNAL: The tab was discarded by Chrome's Memory Saver — call browser_navigate or focus it to reload`.
- **LEASE-7** — `T10* Agent Bridge E2E Playground — …?t5=lease7-human` (no holder) → `Selected tab T10 …` → `T10* [claude-code #25152] …`.
- **SCREEN-1** — three runs: the human's tab hidden +5–6 ms and visible again +1491–1514 ms; flash 1509 / 1486 / 1493 ms; human active and current after, target background after. The image check as written failed: the probe pixel (20,20) is on the bar's label (`#6b0000`), and the capture is colour-managed (`#dd00fa` off the label). The viewed image is the target.
- **SCREEN-2** — `screenshot T23 mode:"cdp" → TIMEOUT: Timed out after 35000ms calling screenshot`; the banner was up from the set-up evaluates before the call to the end of the capture loop (20:00:48.8, 23 s into the call); then `DEBUGGER_DEVTOOLS` on the human's tab, clear about 20 s later.
- **SCREEN-3** — (a) all three succeeded, no quota error; the human's tab hidden/visible 3× alternating, each target inside its own span (serialised); colour check as SCREEN-1 (informational: red / lime / blue each its own). (b) both actors got images; colours as (a).
- **SCREEN-4** — `WINDOW_MINIMIZED: Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"`; window still minimized; `mode:"cdp"` → `TIMEOUT … 25000ms`.
- **SCREEN-5** — capture of a background tab in the unfocused window in 1546 ms; front restored, human's tab current, OS foreground unchanged (the human's window); colour check as SCREEN-1. First attempt (window covered, set-up fault): `TIMEOUT` and the target left active ≥ 49 s.
- **BG-1/BG-2** — `click e7 trusted → ok (5 ms)` / `type e11 "bg2typed" trusted → ok (10 ms)`, status `status: idle`; both work after `focusTab` (informational).
- **BG-3** — `[chrome.debugger] NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.` → `Focused tab T40` → `ok`.
- **BG-4** — `waitFor {text} → ok after 3746 ms`; `waitFor {networkIdle} → ok after 552 ms`.
- **RESOLVER-1** — with this extension's service-worker DevTools window in front: `Active tab: [T41] … ?t5=resolver` and the snapshot `url: …?t5=resolver` — the Stage 0 rule (#48) is met. The row's stricter sub-check expected `Get-T5Foreground` to print `DevTools - chrome-extension://…`; Chrome titles the window `DevTools`, so it printed `<DevTools window>` (the foreground was confirmed by window handle). Judged as written: FAIL (instrument), like the SCREEN image checks; for the user's ruling.
- **NET-1** — `[2985]  1.6s ago   GET     200  document    3ms  12.6 KB  http://localhost:8080/e2e-playground.html` (expected `12.8 KB`); its detail: `from cache: yes`, `content-length: 12914`, `date: … 09:04:00 GMT` — W1's copy from Chrome's HTTP cache; the request never reached the server.
- The rest — as their rows (TAB-2: `Selected tab T3 (now this session's tab; not brought on screen — browser_focus_tab shows it)`, the screen unchanged; MUX-3: the recipe's `[1108126308]` = `browser_status`'s `[T3]`; ACT-8: `ref e6 not found — call browser_snapshot to re-snapshot`; DL-1: `Saved …\dl1\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca…2956ce`, no banner).

Exit checks: **T5.1** met (rows before the run; the reload as the first line). **T5.2** — every row recorded with its text; SCREEN-1's flash is a measured number with its method; BG-1 and BG-2 FAIL, and their `setFocusEmulationEnabled` retry is **not met** (#61: no method sends it). **T5.3 not met:** NET-1 failed (Chrome's cache); the other regression rows passed. **T5.4** met (no committed evidence shows a real site; no images committed).

Failures / notes: the four SCREEN image-check FAILs and RESOLVER-1's title sub-check are an instrument fault in the pre-written check, not observed misbehaviour, and are proposed for a re-run with a corrected probe; the real failures are SCREEN-2 (`cdp` hangs on a hidden tab), BG-1/BG-2 (silent no-op), LEASE-3's empty `url`, and NET-1 (cache). Set-up fixes during the wave (helpers only) and the findings are in the run record.

### Run 9 — 2026-10-23 (Step 7: T5b re-check and the corrected checks, §4.15)

*Rows, expected text and corrected checks committed before any measurement (`b4ea752`); run by the
driver with headless actors and SDK scripts, the user not present (decisions.md · 2026-10-23 #62–#65).
Full evidence: [`T5-run9-record.md`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-run9-record.md);
daemon log: [`T5-run9-daemon-log.txt`](plans/2026-10-21-step7-multi-actor-tabs-steps/T5-run9-daemon-log.txt).
Run 8 above is unchanged.*

```
Date: 2026-10-23 (UTC 2026-10-22 22:52–23:02)  Chrome 156.0.8078.48  Node v25.2.1  Windows 11 Pro 10.0.26300  Commit: 15320a6 (rows at b4ea752)
Daemon build: 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974 (T5b, 12ecb65)
First line: extension reloaded by recipes/reload-extension.ps1 (RELOAD-AUTO 15320a6; #64/#65), user not present — run once more at step 0: exit 0, worker restart and resync seen

R9-RELOAD-1 [P]  R9-SCREEN-2 [F as written: the active-tab positive control (cyan read #97fdfd → other); OFFSCREEN in 3 ms, no switch, no banner]
R9-SCREEN-4 [P] (WINDOW_MINIMIZED in 3 ms)  R9-LEASE-3 [P] (url after 45 ms; TAB_HELD for another client before the event)  R9-RESTORE [P] (previous tab back at +30026 ms; TIMEOUT at 35119 ms)
R9-SCREEN-1 [P] (flash 1588 / 1557 / 1556 ms, median 1557 ms)  R9-SCREEN-3 (a) [P] (b) [P]  R9-SCREEN-5 [P]  R9-RESOLVER-1 [P]
R9-NET-1 [F as written: `showing 2 of 2` — the hard reload re-fetched favicon.ico; the document line 12.8 KB, from cache: no, content-length 13106]
Log hygiene: '://' count 0  token count 0  withheld-line count 0   (81 lines)
```

Evidence in short (the record has every line):
- **R9-RELOAD-1** — `daemon build 490f1c60…, proto 2, extension connected` … `CHECK PASS — …`.
- **R9-SCREEN-2** — `screenshot T28 mode:"cdp" → OFFSCREEN: The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first in 3 ms`; `human tab hidden: never; target visible: never`; banner band constant from t0 − 1 s to t1 + 0.5 s, no bar in the frame at t0; the active tab's CDP image came back but its bar reads `#97fdfd` (R = 151 > the rule's ≤ 100), so `… → other (hue rule)` and the script's line `R9 SCREEN-2 (Chrome side) FAIL — … the active tab still captures (cyan): no`.
- **R9-SCREEN-4** — `… → WINDOW_MINIMIZED: Chrome's window is minimized, so CDP cannot capture the tab — restore the window, or call focusTab first in 3 ms`; still minimized.
- **R9-LEASE-3** — `other client: popup T44 seen 44 ms after the click; its snapshot → TAB_HELD: tab T44 is held by "t5-lease3" since 22:58:18 — … · data {"owner":"t5-lease3","since":1792709898582}; leaseGranted had already arrived: no`; `leaseGranted {"tab":"T44","reason":"opener","url":"http://localhost:8080/e2e-playground.html?popup=1"} after 45 ms`; C's select → `tab T44 is held by "t5-lease3" since 22:58:18 — …`.
- **R9-RESTORE** — `screenshot T39 → TIMEOUT: Timed out after 35000ms calling screenshot after 35119 ms`; `front active again +30026 ms`; `R9 RESTORE PASS — …`.
- **R9-SCREEN-1/3/5** — every image `→ magenta|red|lime|blue (hue rule)` as its own tab; SCREEN-3 serialised; SCREEN-5's foreground window unchanged (`2821048`, not W5).
- **R9-RESOLVER-1** — foreground `{"Hwnd":4197312,"Title":"<DevTools window>"}` before and after; `'sw.js': 19 element(s)`, `'[bridge]': 54 element(s)`; `Active tab: [T46] … ?t5=resolver`; snapshot `url: …?t5=resolver`.
- **R9-NET-1** — `[5020]  5.8s ago   GET     200  document    4ms  12.8 KB  http://localhost:8080/e2e-playground.html` plus `[5021]  5.7s ago   GET     404  image       3ms  460 B   http://localhost:8080/favicon.ico` under `showing 2 of 2`; `from cache: no`; server `"GET /e2e-playground.html HTTP/1.1" 200`; no banner.

Failures / notes: two FAILs as written, both in the pre-registered checks themselves, with the row's
substance met (R9-SCREEN-2's positive control; R9-NET-1's request count), for the user's ruling. The
T5b fixes hold live (the record's finding 1). The flash is still ~1.5 s.

### Run 10 (BG-FLAGS) — 2026-10-23 (Step 7: background input with Chrome restarted under flags, §4.16)

*Rows, flag set and restart/restore procedure committed before Chrome was touched (`00249de`); run by
the driver, the user not present (decisions.md · 2026-10-23 · The driver may reload the extension by UI
automation, and restart Chrome with flags for the background-input test (#64) (2)). Full evidence:
[`BG-FLAGS-run-record.md`](plans/2026-10-21-step7-multi-actor-tabs-steps/BG-FLAGS-run-record.md); daemon
log: [`BG-FLAGS-daemon-log.txt`](plans/2026-10-21-step7-multi-actor-tabs-steps/BG-FLAGS-daemon-log.txt).
Runs 8 and 9 above are unchanged.*

```
Date: 2026-10-23 (UTC 2026-10-22 23:25–23:31)  Chrome 156.0.8078.48  Node v25.2.1  Windows 11 Pro 10.0.26300  Commit: 00249de
Daemon build: 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974 (T5b, 12ecb65)  No product code changed; no extension reload needed
Flags (restart 1): --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling
Counts (windows / tabs / per window): first 1 / 1 / [1]; after restart 1 1 / 1 / [1] (+ the quit window, closed); after restart 2 1 / 1 / [1] (+ the quit window, closed); final 1 / 1 / [1], switches [--restore-last-session]

BGF-0 (no flags) BG-1 [F] BG-2 [F]   BGF-1 ★ [F]   BGF-2 ★ [F]   BGF-3 [P]   BGF-4 [P] (2065 ms / 543 ms)   BGF-5 (no flags) BG-1 [F] BG-2 [F]
Restore: restart 1 PASS, restart 2 PASS (chrome://quit, 0.5 s each; never killed)   t5.ts check: PASS before, after restart 1, after restart 2
Log hygiene: '://' count 0  token count 0  withheld-line count 0   (66 lines)
```

Evidence in short (the record has every line):
- **BGF-1** (flags) — `click e7 trusted → ok (15 ms)`; `target status "status: idle"; field value ""; target visibilityState hidden`; `BG-1 FAIL — …`; after `focusTab` → `status: TRUSTED click received`.
- **BGF-2** (flags) — `type e11 "bg2typed" trusted → ok (12 ms)`; `status: idle`, field `""`; `BG-2 FAIL — …`; after `focusTab` → `bg2typed`.
- **BGF-0 / BGF-5** (no flags, before / after) — the same FAILs (`ok` in 5 / 9 ms and 13 / 12 ms).
- **BGF-3** — `NotAllowedError: … Document is not focused.` → `Focused tab T14` → `ok`. **BGF-4** — `waitFor {text} → ok after 2065 ms` (Run 8: 3746 ms), `networkIdle` after 543 ms.

Result (§4.16 reading rule): **the flags alone do not change the outcome** — trusted input into a
background tab is still a silent no-op with renderer backgrounding and background throttling disabled;
focus emulation stays Step 8's question (#62 (4)). Chrome ended as it started (1 window, 1 tab, no flags).

### Run 11 (FE) — 2026-10-23 (Step 8: focus emulation for trusted input, §4.17)

*Rows, rules and tools committed before the build was loaded (`6398f27`); FE build `6742c1f`; run by the
driver, the user not present (decisions.md #33). Full evidence:
[`FE-run-record.md`](plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/FE-run-record.md); attached
`FE-daemon-log.txt`, `FE-run-results.txt`, `FE-frames-positive.txt`, `FE-frames-block.txt` beside it.
Runs 8–10 above are unchanged.*

```
Date: 2026-10-23 (UTC 08:34–08:39)  Chrome 156.0.8078.48  Node v25.2.1  Windows 11 Pro 10.0.26300  HEAD: 257dd8d
Daemon build: 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e   reload-extension.ps1: exit 0 (RELOAD OK)

FE-0 [P]   FE-5 first [holds 0/3, 0/3]   FE-PC page [P] capture [P]   FE-1 [F 0/3]   FE-2 [F 2/3]   FE-3 [F 0/3]
FE-4 [P] (trials 9/9; window capture 71 frames, no target, foreground constant)   FE-5 last [holds 0/3, 0/3]   FE-3c 0/3 (observation)
Log hygiene: '://' count 0  token count 0  withheld-line count 0   (37 lines)
```

Evidence in short (the record has every line):
- **FE-0** — `click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (21 ms)`; `FE-0 PASS — the result carries focusEmulation "on": the extension is the FE build`.
- **FE-5 first / last** — every BG-1/BG-2 trial `→ ok {"ok":true}` in 5–12 ms, `status: idle`, field `""`; `control holds` both times.
- **FE-PC** — `screenshot T11 (default mode) → ok … (1635 ms)`; `human tab hidden +5 ms, visible again +1619 ms`; `POSITIVE (page timestamps) PASS`; `295 frames; frames showing magenta 16, cyan 279`; `POSITIVE (capture loop) PASS`.
- **FE-1** — `click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"}` (18/23/34 ms); `target status "status: idle"` ×3; `FE-1 FAIL — 0/3 trials PASS`.
- **FE-2** — trials 1, 2 `status: TRUSTED input = bg2typed`, field `bg2typed` (PASS); trial 3 `status: TRUSTED input = ped`, field `ped` (FAIL); `FE-2 FAIL — 2/3 trials PASS`.
- **FE-3** — focus step `document.activeElement is #trusted-input: yes` ×3; `pressKey ArrowLeft trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"}`; `status: idle` ×3; `FE-3 FAIL — 0/3 trials PASS`.
- **FE-4** — every trial `human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS`; `FE-4 (window capture over 9 trials, 71 frames) PASS — no frame shows the target; the foreground window never changed`.
- **FE-3c** — `without the option the key reached the page in 0/3 trials`.
- **Observation** — with the option the target page logged `visible` +3–7 ms and `hidden again` +14–39 ms in all 9 trials, and read `hidden` after every call: emulation was off after each call (#88's Revisit-if not met).

`fe-verdict: OUTCOME (B) — no kind passes: policy "focusFirst"`

### Run 12 (S6) — 2026-10-23 (Step 8: SDK-1…8, SM-0, SM-1, the S5 MCP rows and the regression smoke, §4.19)

*Rows, rules and tools committed before the build was loaded (`23b878f`); run by the driver, the user not
present (decisions.md #33). **Stopped at SDK-1 (step 8) by a permission-classifier denial** (`[PII Data
Handling]`, on an actor send of a fixture-page snapshot prompt): reported, not retried; the rows after it
were not run, no Blackboard page was opened and Chrome was not restarted. Full evidence:
[`S6-run-record.md`](plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-run-record.md); daemon log
`S6-daemon-log.txt` beside it (wave sheet: [`S6-wave-sheet.md`](plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md)).*

```
Date: 2026-10-23 (UTC 13:14–13:19)  Chrome 156  Node v25.2.1  OS Windows 11 Pro 10.0.26300  HEAD: 23b878f (rows at 23b878f)
Daemon build: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f   reload-extension.ps1: exit 0   S6-STALE: STALE-CHECK NEW BUILD (the first recorded line)

S6-STALE [P] SDK-1 [not complete: script PASS, actor's 2nd snapshot denied] SDK-2 [P] SDK-3 [P] SDK-4 [P] (1998 / 9 ms) SDK-5 [P] SDK-6D [P] SDK-6 [not run] SDK-7D [P] SDK-7 [not run] (hash — ; MCP leg not run)
SDK-8 [not run] SM-0 [not run] SM-1 [not run] (Chrome not restarted)
S5 rows: CUR-1 CUR-2 CUR-3 LOC-1 LOC-2 ASREF-1 REP-1 STAT-1 MUX-1 TAB-3 NET-12 MUX-8 [all not run]
Regression (S6.5): MUX-2 LEASE-1 SCREEN-1 ACT-1 ACT-2 ACT-3 TRUST-2 EVAL-1 NET-1 DL-1 [all not run]
Log hygiene: '://' count 0  token count 0  withheld-line count 0   (36 lines; course ids 0, ada.blackboard 0)
S6.4 git status: only the record, the log .txt, this plan and S6.ledger.md (no exports/, no PNG)
```

Evidence in short (the record has every line):
- **S6-STALE** — `locate T2 {role:"button", name:"Sign in"} → ok {"name":"Sign in","ref":"e1","role":"button"} (9 ms)`; `STALE-CHECK NEW BUILD …`.
- **SDK-2** — `LOCATOR_NOT_FOUND: no button named "Sgin in". Nearest: button "Sign in", …`; report 40 lines; PNG outside the repo (deleted). **SDK-3** — 7 matches; `nth:1 → e23 button "Fetch 404"`; `status: fetch ok.json -> 200`.
- **SDK-4** — visible after 1998 ms, hidden after 9 ms. **SDK-5** — `status: hit at 149,295 exp 953,754 on=email (isTrusted=true)`; `#email`; mark 0.
- **SDK-6D / SDK-7D** — `bb.VERSION = stub-2026-10-23`; `627 bytes, sha256 92fe62ab…a49c`; `Get-FileHash` equal.
- **SDK-1** — `SDK-1 PASS — located button "Sign in", clicked, … (118 ms in all)`; actor SA's first snapshot of `?t5=sdk1-claude`; log `client + "sdk-login" (2 clients)` / `client - "sdk-login" (1 client)`; SA's second snapshot not sent (classifier denial).

**Part 2 — resumed run (2026-10-23, 14:38–15:10 UTC).** *Run by the Part 2 driver under the wave sheet's
"Resumed run" section (decisions.md #96, #97, #98); no code change since `23b878f`, so no build; the first
recorded result line is the stale check (NEW BUILD, no reload). REP-0 passed, so nothing was gated. No
permission or classifier denial. SM-0's reload exited 2 (nothing pressed) and was not retried (integrity floor,
#65); the Blackboard login exited 4. One Chrome restart (SM-1 + MUX-8). Record: `S6-run-record.md` § "Part 2";
`S6-daemon-log.txt` now covers both parts (171 lines).*

```
Date: 2026-10-23 (UTC 14:38–15:10)  Chrome 156  Node v25.2.1  OS Windows 11 Pro 10.0.26300  HEAD: bc78ded (rows at 23b878f, REP-0 at bc78ded)
Daemon build: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f   reload: none needed (S6-STALE: STALE-CHECK NEW BUILD, the first recorded line)

S6-STALE [P] REP-0 [P] (report call 1344 ms; probe visible +20 ms; PNG magenta; controls A blue, B magenta) SDK-1 [P] (rerun whole)
SDK-6 [waits for the user] SDK-7 [waits for the user] (bb-login.ps1 exit 4; MCP leg and S6.3 not run) SDK-8 [P]
SM-0 [not measured: reload exit 2, nothing pressed; waits for the user] SM-1 [F] (recipe PASS; SM-1 LOG FAIL — 0 handles retired) MUX-8 [P]
S5 rows: CUR-1 [P] CUR-2 [P] CUR-3 [P] LOC-1 [F: value clause not observable as written] LOC-2 [P] ASREF-1 [P; optional 1+1 clause differs]
         REP-1 [F: no image part reached the actor] STAT-1 [P] MUX-1 [P] TAB-3 [P] (background branch) NET-12 [P]
Regression (S6.5): MUX-2 [P] LEASE-1 [P] SCREEN-1 [P] (1576 / 1456 / 1465 ms, median 1465) ACT-1 [P] ACT-2 [P] ACT-3 [P] TRUST-2 [P] EVAL-1 [P] NET-1 [P] DL-1 [P]
Chrome restart: 1 (chrome://quit 15:08:19Z, relaunch --restore-last-session 15:08:51Z; counts equal; no reload needed)
Log hygiene: '://' count 0  token count 0  withheld-line count 0   (171 lines; course ids 0, ada.blackboard 0)
S6.4 git status: only the record, the log .txt, this plan and S6.ledger.md (no exports/, no PNG)
```

*2026-10-23 (step agent, live verifier r2 N1): ASREF-1 above is FAIL (optional clause; required clauses PASS) —
step-agent ruling: the sheet says "§4.18's Expected column, exactly" and P-ASREF1 ran the optional call. Part 2
counts (the step agent's): 23 PASS, 4 FAIL (LOC-1, ASREF-1, REP-1, SM-1), 1 not measured (SM-0), 2 waits for the
user (SDK-6, SDK-7 live).*

Evidence in short (Part 2; the record has every line):
- **REP-0** — `report call: probe T132 visible +20 ms, hidden again +1345 ms; human T131 hidden +16 ms, visible again +1348 ms → flash 1331 ms`; `REP-0 PASS — the report's capture switched to the failed tab …`.
- **SM-1** — `event +10064 ms tabGone {"tab":"T216",…}` came at the quit, 14 ms before `extensionStatus {"connected":false}`; after the relaunch `extension session changed: 0 handles retired`, `snapshot T216 after the restart → TAB_GONE`, daemon pid 14400 unchanged; `SM-1 LOG FAIL — 0 handles retired (≥ 1 expected)`.
- **REP-1** — the `LOCATOR_NOT_FOUND` report text, `Screenshot: …\failures\…-T205.png` (deleted) and the snapshot window arrived; the actor's tool result held no image block.
- **LOC-1** — `Typed into textbox "Email address"`, `Clicked button "Click counter"`, `button "Click counter: 1"`, `browser_click takes ref or locator, not both`; the snapshot prints no values and the status line read `status: counter = 1`.
- **MUX-8** — `FAILED after 15020 ms — NOT_CONNECTED: …`, exit 1; X: `Extension: not connected — …`; run 2 `closed after 19 ms — OK`.

## 6. Exit criteria

- **All ★ must-pass cases pass** → the bridge is proven end-to-end; merge `feat/agent-bridge` → `main`.
- Any ★ failure → capture the diagnostics (§2) into the notes and we fix before merging.
- Non-★ failures are logged as roadmap items (see `docs/progress-and-roadmap.md`) unless they block a ★ case.

# Wave W1 — run record (D6 E2E: MUX-1…10, DL-1, DL-2), 2026-10-22

Evidence for Run 7 in `docs/e2e-test-plan.md` §5. Every line below is a command and the text it
printed (tool outputs are copied from the session transcripts, `~/.claude/projects/<repo>/<session>.jsonl`,
not from a model's paraphrase). Times are UTC unless marked local (UTC+4). The daemon log of the
whole wave is [`W1-daemon-log.txt`](W1-daemon-log.txt) (D6.3 counts 0 / 0 / 0, below).

## Set-up

- Date 2026-10-22 · Chrome 156.0.8078.48 · Node v25.2.1 · Windows 11 Pro 10.0.26300 · commit `fef70ff`.
- `npm run build` exit 0 · `npm run typecheck` exit 0 · `npm test` → 542 passed, 42 files.
- `Get-DaemonBuild` at the start: `795fb769aeae5dbd2345c51a39b26f352bfaedc169ef97c0e157e20400a337bd`.
- Token: `bridge.token` did not exist; the MCP entry in `~/.claude.json` still had `BRIDGE_TOKEN` and
  `BRIDGE_PORT` in its `env`. By the user's choice (Windows clipboard history was on), a script copied
  that value into `bridge.token` (it printed only `32 chars`) and removed the `env` block; the
  extension's Options already held the same token, so nothing was pasted. `git check-ignore bridge.token`
  → `bridge.token`; `Test-Path Env:BRIDGE_TOKEN` → `False`.
- Driver (A1): this Claude Code session was itself a bridge client (user-scope MCP entry); the user
  relaunched it with `claude --continue --strict-mcp-config --mcp-config <scratch>\no-mcp.json`. The
  driver check then printed nothing.
- Fixtures: `python` is not on PowerShell's PATH here, so the §1 item 8 commands ran with
  `$HOME\miniconda3\python.exe` (Python 3.14.7): 8080 (pid 10824) `200 12914` for the playground;
  8081 (pid 26096) `200` for `/page`.
- The pre-wave daemon (pid 33860) was stopped (`Test-SafeToKill` → safe). It had survived the `/exit`
  of the session that spawned it (informal, before MUX-7).
- Who did what: MUX-1…MUX-8 — the user typed every [UI] step into sessions S1…S5; the driver ran
  every [SH] step and read the tool outputs from the transcripts. From MUX-9 on, on the user's
  instruction ("complete tests autonomously"), the driver ran everything: each [UI] step is a headless
  `claude -p --model sonnet --allowedTools mcp__chrome-agent-bridge` turn in the repo (one session id
  resumed across a row); screenshots returned by `browser_screenshot` were viewed by the driver;
  banner checks (A10) used captures of Chrome's window taken every 0.5 s with `PrintWindow` (works when
  the window is covered), compared by a pixel signature of the band under the bookmarks bar and viewed.
  For MUX-8's optional run the driver launched Chrome itself (`Start-Process chrome.exe`, no flags),
  with the user's approval.

## MUX-1 — PASS
- S1 `browser_status` (09:01:09):
  `Daemon: connected on 127.0.0.1:9234 (build 795fb769aeae5dbd2345c51a39b26f352bfaedc169ef97c0e157e20400a337bd, up 15s)` /
  `Clients (1): claude-code #14996` / `Extension: connected` / `Active tab: [1108125907] New Tab — chrome://newtab/`.
- `Get-BridgeDaemon`: one row, `ProcessId 21144`, `ParentProcessId 14996`.
- `Get-BridgeProcs`: `claude.exe` 2612 → `node` 2740 (nvm shim, `mcp/dist/index.js`) → `node` 14996
  (`mcp/dist/index.js`) → `node` 21144 (`daemon\dist\index.js`).
- `Get-BridgeLog 8` (newest): `09:00:54Z start pid=21144` / `config pid=21144 port=9234 idleMs=600000 build=795fb769…` /
  `listening on 127.0.0.1:9234` / `client + "claude-code #14996" (1 client)`.

## MUX-2 — PASS
- S2 `browser_status` (09:02:59): `… (build 795fb769…, up 125s)` / `Clients (2): claude-code #14996, claude-code #17384` / `Extension: connected`.
- S1 `browser_status` (09:03:14): `… up 140s` / `Clients (2): claude-code #14996, claude-code #17384`.
- S1 `browser_navigate` → `Navigated active tab to http://localhost:8080/e2e-playground.html`.
- S1 snapshot (09:04:18) and S2 snapshot (09:04:23) both: `url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"`,
  `- textbox "Email address" [ref=e1]`, `- button "Sign in" [ref=e5]`.
- `Get-BridgeDaemon`: 21144 (parent 14996). Log: `09:02:38Z client + "claude-code #17384" (2 clients)`; no `start` after MUX-1's.

## MUX-3 — PASS
The §4.12 block, verbatim (background; the user sent the prompt when `holding the connection` appeared).
```
2026-10-22T09:07:34.960Z hello-recipe: connecting (pid 7404)
2026-10-22T09:07:34.975Z hello-recipe: connected in 15 ms as client c3 — daemon build 795fb769aeae5dbd2345c51a39b26f352bfaedc169ef97c0e157e20400a337bd, proto 2
2026-10-22T09:07:34.977Z hello-recipe: daemon.status — port 9234, up 400s, extension connected, clients (3): claude-code #14996, claude-code #17384, hello-recipe
2026-10-22T09:07:34.981Z hello-recipe: listTabs — 2 tab(s); active: [1108125907] Agent Bridge E2E Playground
2026-10-22T09:07:34.982Z hello-recipe: holding the connection for 60000 ms — call browser_status now
2026-10-22T09:08:34.985Z hello-recipe: still connected after the hold — clients (3)
2026-10-22T09:08:34.987Z hello-recipe: closed after 60027 ms — OK
```
- `exit code: 0`; `mux3.err` 0 bytes.
- S1 during the hold (09:07:47): `Clients (3): claude-code #14996, claude-code #17384, hello-recipe`; `Active tab: [1108125907] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html` (same id as `listTabs`).
- S1 after (09:08:52): `Clients (2): claude-code #14996, claude-code #17384`.
- Log: `09:07:34Z client + "hello-recipe" (3 clients)` / `09:08:34Z client - "hello-recipe" (2 clients)`; no `start`.

## MUX-4 — PASS
- Pre: S1 and S2 `/exit` (`09:09:47Z client - "claude-code #17384" (1 client)`, `09:09:51Z client - "claude-code #14996" (0 clients)`);
  daemon 21144 still alive after its spawner's exit; stopped.
- The block, verbatim:
```
2026-10-22T09:10:54.613Z hello-recipe: connecting (pid 2160)
2026-10-22T09:10:57.942Z hello-recipe: connected in 3329 ms as client c1 — daemon build 795fb769…, proto 2
2026-10-22T09:10:57.943Z hello-recipe: daemon.status — port 9234, up 3s, extension connected, clients (1): hello-recipe
2026-10-22T09:10:57.946Z hello-recipe: listTabs — 2 tab(s); active: [1108125802] Extensions - Chrome Agent Bridge
2026-10-22T09:10:57.946Z hello-recipe: closed after 3333 ms — OK
2026-10-22T09:10:57.9460000Z  ->  2026-10-22T09:11:18.1484380Z  =  20.2 s
… log …
30.1 s after $t1: Get-BridgeDaemon lists 0 process(es)
```
- Log: `09:10:54Z start pid=12716` / `config pid=12716 port=9234 idleMs=20000 build=795fb769…` / `listening` /
  `client + "hello-recipe" (1 client)` / **T0** `09:10:57Z client - "hello-recipe" (0 clients)` /
  **T1** `09:11:17Z idle for 20000 ms with no clients — shutting down` / `09:11:17Z exit 0 (shutdown 1001) clients=0 extensionEvents=0 ignoredClientFrames=0`.
- T1 − T0 = 20 s; `$t1 − $t0` = 20.2 s; no process row after the 30.1 s line.
- Service-worker console (user; Chrome folds repeats into a count): 7× `connection: down`, `up`, 5× `down`, `up`, 55× `down` (the last run: after the idle exit, one per failed reconnect).
- The 3329 ms connect: the extension was still in reconnect backoff after the pre-row daemon stop (not judged).

## MUX-5 — first run FAIL (one sub-check); two re-measurements
**Run 1 (with the user).** S1 (M 21044) `browser_status` (09:24:39): `… build 795fb769…, up 17s` /
`Clients (1): claude-code #21044` / `Active tab: [1108125802] Extensions - Chrome Agent Bridge — chrome://extensions/?id=<extension id>`.
`Get-BridgeDaemon` → D1 10964 (parent 21044). Marker appended; `Get-DaemonBuild` → `d74f591352952d7f7547ef604be58f280100f6218e1d783404ab2b8443fcb7d8`.
- Recipe: `connected in 555 ms as client c2 — daemon build d74f5913…, proto 2` / `daemon.status — port 9234, up 0s, extension connected, clients (2): claude-code #21044, hello-recipe` / `listTabs — 2 tab(s); active: [1108125802] Extensions - Chrome Agent Bridge` / `closed after 560 ms — OK`; exit 0.
- S1, one prompt sent right after: `browser_status` (09:25:18) `Daemon: connected on 127.0.0.1:9234 (build d74f5913…, up 9s)` / `Clients (1): claude-code #21044` / `Extension: connected`;
  **`browser_snapshot` (09:25:19) → tool error `No active tab in the last-focused window`** (expected: a snapshot).
- Log: `09:25:09Z client + "hello-recipe" (2 clients)` / `client - "claude-code #21044" (1 client)` / `client - "hello-recipe" (0 clients)` /
  `exit 0 (shutdown 4002) clients=0 extensionEvents=0 ignoredClientFrames=0` / `start pid=31944` / `config pid=31944 … build=d74f…` /
  `start pid=13804` / `config pid=13804 … build=d74f…` / `listening on 127.0.0.1:9234` / `port 9234 in use — another daemon owns it` /
  `exit 0 (port in use) …` / `client + "claude-code #21044" (1 client)` / `client + "hello-recipe" (2 clients)` / `client - "hello-recipe" (1 client)`.
  Constraints (1)–(5) hold. `Get-BridgeDaemon`: D2 31944 (parent 21044) ≠ D1: the MCP's reconnect won the bind.
- Service-worker console (user): `down`, then `up`.
- Cause of the snapshot error: `browser_status` takes `Active tab` from `listTabs` (the first active tab
  of any window); `browser_snapshot` uses `activeTab()` = `tabs.query({active:true, lastFocusedWindow:true})`
  (`extension/src/tabs.ts:2`). Chrome's last-focused window was the service-worker DevTools window the
  user had opened for MUX-4 (confirmed by the user), which has no tab. The error text is the extension's,
  so the call crossed the new daemon.
- Supplementary, after the user clicked the playground tab (09:30:00): `browser_snapshot` → `url: http://localhost:8080/e2e-playground.html …`, `textbox "Email address" [ref=e1]`, `button "Sign in" [ref=e5]`.
- Undo: `npm run build --workspace daemon` → `Get-DaemonBuild` `795fb769…` again.

**Re-measurement R2 (driver, headless session).** Prompt: status → Bash sleep 25 → status → snapshot.
The trigger fired on the prompt text, so the handover (recipe `connected in 553 ms … build 39ff2d45…`, `up 0s`, `clients (2): hello-recipe, claude-code #32812`, `— OK`)
came before the first status (11:28:39: `build 39ff2d45…, up 2s`, `Clients (1): claude-code #32812`). Snapshot (11:29:18) → `url: http://127.0.0.1:8081/page   title: "DL-2 redirect page"` — no error, but 41 s after the recipe. Log: the old daemon logs `client + "claude-code #32812"` at 11:28:26, then `client -`, `exit 0 (shutdown 4002)`; the same MCP reconnects to the new one.

**Re-measurement R3 (driver, headless session `0ed46b4e`).** Prompt: status → Bash `sleep 8` (background) → status → snapshot; the handover is triggered after the first status result.
- `browser_status` (11:30:22.691): `Daemon: connected on 127.0.0.1:9234 (build 795fb769…, up 14s)` / `Clients (1): claude-code #11268` / `Extension: connected` / `Active tab: [1108126126] DL-2 redirect page — http://127.0.0.1:8081/page`.
- D1 15664 (parent 11268). Marker → `8db1207d80135b265aa45d0cdf1ac9bfb493f5a81bc04ebb02886ff90c1a9b00`. Recipe: `11:30:25.026Z … connected in 529 ms as client c1 — daemon build 8db1207d…, proto 2` / `daemon.status — port 9234, up 0s, extension connected, clients (2): hello-recipe, claude-code #11268` / `closed after 532 ms — OK`; exit 0.
- `browser_status` (11:30:40.479): `Daemon: connected on 127.0.0.1:9234 (build 8db1207d…, up 16s)` / `Clients (1): claude-code #11268` / `Extension: connected` (no `/mcp`; a headless session cannot run one).
- `browser_snapshot` (11:30:41.891) → `url: http://127.0.0.1:8081/page   title: "DL-2 redirect page"` (no error).
- Both calls came 15.4 s and 16.9 s after the recipe closed (the session's own sleep and notify latency), 1–2 s past the row's "within 15 s".
- Log: `11:30:24Z client + "hello-recipe" (2 clients)` / `client - "hello-recipe" (1 client)` / `client - "claude-code #11268" (0 clients)` / `exit 0 (shutdown 4002) …` /
  `start pid=1152` / `start pid=8528` / two `config … build=8db1207d…` / `listening on 127.0.0.1:9234` / `port 9234 in use — another daemon owns it` / `exit 0 (port in use) …` /
  `client + "hello-recipe" (1 client)` / `client + "claude-code #11268" (2 clients)`. `Get-BridgeDaemon` → D2 8528 (parent 11268) ≠ D1.
- Undo: `npm run build --workspace daemon` → `795fb769…`; D2 stopped.

## MUX-6 — PASS (the race was exercised)
- Pre: S1 `/exit` (`09:31:15Z client - "claude-code #21044" (0 clients)`); daemon stopped; `Get-BridgeDaemon` empty.
- The block, verbatim: `Id/ExitCode` → `28704 0`, `34752 0`.
- `race-a.out`: `09:31:39.278Z race-a: connecting (pid 22364)` … `connected in 293 ms as client c1 …` … `clients (1): race-a` … `09:31:39.580Z race-a: closed after 302 ms — OK`.
- `race-b.out`: `09:31:39.303Z race-b: connecting (pid 16656)` … `connected in 280 ms as client c2 …` … `clients (1): race-b` … `09:31:39.592Z race-b: closed after 289 ms — OK`. Both `.err` 0 bytes.
- **`Get-BridgeDaemon`** (a separate `Format-List` call; see findings): `ProcessId 2456`, `ParentProcessId 22364` — exactly one.
- Log: `start pid=2456` / `config pid=2456 …` / `listening on 127.0.0.1:9234` / `start pid=23260` / `config pid=23260 …` / `port 9234 in use — another daemon owns it` / `exit 0 (port in use) clients=0 …` /
  `client + "race-a" (1 client)` / `client + "race-b" (2 clients)` / `client - "race-a" (1 client)` / `client - "race-b" (0 clients)`.

## MUX-7 — PASS ((b), (c), (d), (e) as expected; (a) as Stage 0 measured)
- **(b)** S1: `claude.exe` 16496 → P1 11584 (shim) → M1 21408 → D 6872 (parent 21408); `browser_status` `Clients (1): claude-code #21408`. After `/exit`: `(b) M1 alive: False; waited 0.0 s` (the poll started a few seconds after the `/exit`); `Get-Process -Id 11584` → nothing; `Get-Process -Id 6872` → listed. Log `09:40:32Z client - "claude-code #21408" (0 clients)`; no `exit` line.
- **(c) attempt 1:** S2: P2 34584 → M2 21864, connected to D 6872 (`09:42:02Z client + "claude-code #21864" (1 client)`, no `start`). `Test-SafeToKill 34584` → safe; `Stop-Process`; `(c) M2 alive: False; waited 0.2 s`; D alive; `09:42:45Z client - "claude-code #21864" (0 clients)`. The `/mcp` step was not done in S2: the user opened a new session (`claude.exe` 18252) about 11 min later, and D 6872 had meanwhile idled out by design (`09:52:45Z idle for 600000 ms with no clients — shutting down`, `exit 0 (shutdown 1001) …`). That session's first MCP, `claude-code #20604` (the pid is a reuse — the pre-wave session's MCP had the same number), spawned daemon 31436 (`09:53:45Z start pid=31436` … `client + "claude-code #20604" (1 client)`; `Get-BridgeDaemon` → parent 20604); the user's `/mcp` there replaced it with `claude-code #16492` (`09:53:50Z client - "claude-code #20604"`, `client + "claude-code #16492" (1 client)`).
- **(c) attempt 2 — PASS:** the new session (`claude.exe` 18252): P 14996 → M 16492, connected to daemon 31436, which it had not spawned. `Test-SafeToKill 14996` → safe; `Stop-Process`; `(c) M2 alive: False; waited 0.2 s`; 31436 alive; `09:56:50Z client - "claude-code #16492" (0 clients)`. `/mcp` in the same session (shown failed, then reconnected) → `browser_status` (09:57:16): `Daemon: connected on 127.0.0.1:9234 (build 795fb769…, up 212s)` / `Clients (1): claude-code #19796` / `Extension: connected`; log `09:57:12Z client + "claude-code #19796" (1 client)`; no `start`.
- **(a):** S3 (`claude.exe` 26152) had connected to 31436 before the driver stopped it (~10:00:33); S3's MCP then spawned D3 2576 (`10:00:38Z start pid=2576` … `client + "claude-code #28880" (1 client)`, parent M3 28880) — an unplanned instance of (e). P3 4856. `Get-ProcTree 4856` → `4856 8208 28880 2576`; `Test-SafeToKill 4856` → safe. `taskkill /PID 4856 /T /F`:
  `SUCCESS: The process with PID 2576 (child process of PID 28880) has been terminated.` /
  `SUCCESS: The process with PID 8208 (child process of PID 4856) has been terminated.` /
  `SUCCESS: The process with PID 28880 (child process of PID 4856) has been terminated.` /
  `SUCCESS: The process with PID 4856 (child process of PID 26152) has been terminated.`
  `Get-Process -Id 2576` → nothing (D3 gone); no `exit` line in the log; service-worker console `connection: down` (user).
- **(d):** S4 (`claude.exe` 1480): P4 25696 → M4 31352 → D4 30296 (parent 31352). S5 (`claude.exe` 18508): P5 16460 → M5 10872 (`Clients (2): claude-code #31352, claude-code #10872`). `Get-ProcTree 16460` → `16460 19040 10872`; safe; `taskkill /PID 16460 /T /F` → `SUCCESS` lines for 19040, 10872, 16460 only. D4 30296 alive; `10:03:56Z client - "claude-code #10872" (1 client)`. S4 `browser_status` (10:04:32): `Daemon: connected on 127.0.0.1:9234 (build 795fb769…, up 170s)` / `Clients (1): claude-code #31352` / `Extension: connected`.
- **(e):** `Test-SafeToKill 30296` → safe; `Stop-Process -Id 30296 -Force`; poll → `(e) waited 3.3 s`, `ProcessId 20360`, `ParentProcessId 31352`. Log `10:05:02Z start pid=20360` … `client + "claude-code #31352" (1 client)`; no `exit` for 30296. S4 `browser_status` (10:07:44, no `/mcp`): `Daemon: connected on 127.0.0.1:9234 (build 795fb769…, up 162s)` / `Clients (1): claude-code #31352` / `Extension: connected`.
- Also measured, outside the row: before MUX-10 the driver ended S4 with `taskkill /PID 1480 /T /F`, which also ended D 20360 (`SUCCESS: The process with PID 20360 (child process of PID 31352) …`) — the (a) pattern again.

## MUX-8 — PASS (including the optional run)
- Chrome closed by the user (a first try left the service-worker DevTools window open: 8 `chrome` processes); then `Get-Process chrome` → 0.
- Failing run: `2026-10-22T10:11:35.849Z hello-recipe: connecting (pid 15352)` /
  `2026-10-22T10:11:50.878Z hello-recipe: FAILED after 15029 ms — NOT_CONNECTED: Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 9234)`; `exit 1`.
  Log `10:11:35Z client + "hello-recipe" (2 clients)` / `10:11:50Z client - "hello-recipe" (1 client)`.
- S4 meanwhile (10:11:46): `Daemon: connected on 127.0.0.1:9234 (build 795fb769…, up 404s)` / `Clients (2): claude-code #31352, hello-recipe` /
  `Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?`.
- Recovering run (user reopened Chrome): `connected in 15 ms as client c3 …` / `daemon.status — port 9234, up 610s, extension connected, clients (2): claude-code #31352, hello-recipe` / `listTabs — 1 tab(s); active: [1108125967] New Tab` / `closed after 19 ms — OK`; exit 0.
- Optional run (driver launched Chrome 2.9 s after the recipe started): `10:19:25.579Z connecting (pid 26920)` / Chrome launched `10:19:28.440Z` / `10:19:29.241Z … connected in 3662 ms as client c4` / `listTabs — 1 tab(s); active: [1108126126] New Tab` / `closed after 3672 ms — OK`; exit 0.

## MUX-9 — PASS (NET-1's size reads `12.6 KB`, not the expected `12.9 KB`: an error in the expectation)
Headless session `3d618657`, one prompt per group:
- P1 (11:17:22–11:17:56): `Navigated active tab to http://localhost:8080/e2e-playground.html`; snapshot refs `e1` textbox "Email address", `e6` button "Click counter: 0", `e7` button "Trusted-only button"; `browser_type` → `Typed into e1`; screenshot shows **`status: email = a@b.com`** (ACT-1); `browser_click e6` → `Clicked e6`; screenshot shows **`status: counter = 1`** (ACT-2).
- P2 (11:18:04–11:18:23): `browser_click e7 trusted` → `Clicked e7`; screenshot **`status: TRUSTED click received`** (TRUST-2). Window capture 11:18:18.127: `"Chrome Agent Bridge" started debugging this browser` [Cancel]; 11:18:29.110 (6 s after the reply): no banner.
- P3 (11:18:36–11:18:53): `browser_evaluate document.title` → **`Agent Bridge E2E Playground`** (EVAL-1). Capture 11:18:50.445: banner; 11:19:01.411: none.
- P4 (11:19:07–11:19:29), NET-1: `Cleared 15 requests.` / `Navigated active tab to …` /
  `Network — active tab: showing 1 of 1 (recording since 59m55s ago; 0 pending)` /
  `[47]    1.5s ago   GET     200  document    4ms  12.6 KB  http://localhost:8080/e2e-playground.html` /
  `Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.` No banner (band unchanged 11:19:07–11:19:29).
- NET-1's size: the fixture is 12 914 bytes with LF line ends (254 lines); the formatter divides by 1024 (`extension/src/network-log.ts:259`) → `12.6 KB`, and Run 6's own later line `[374] … 12.6 KB` shows the same page. Run 6's NET-1 `12.9 KB` fits a CRLF copy (12 914 + 254 = 13 168 bytes → 12.86 KB) under `core.autocrlf=true`; the W1 verifier notes that a version of the fixture edited during Run 6 would fit too, so the cause is not proven. The row's expected text ("still 12 914 bytes" and `12.9 KB`) contradicts itself. The footer line comes from `network-log.ts:302`; Run 6 quoted the block without it.

## DL-1 — PASS (the service-worker console line was not observed)
- (0) `Test-Path …\dl1` → `False`.
- (a) 11:20:03–11:20:26: `browser_status` → `Active tab: [1108126126] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html`;
  `browser_download` → `Saved C:\Users\aliev\AppData\Local\Temp\bridge-e2e\dl1\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce` (two lines);
  `browser_status` → the same `Active tab` line. No banner (band unchanged 11:20:00–11:21:23). The service-worker console was not open (nobody at the keyboard; opening it would also have taken the last-focused window, see MUX-5).
- (b) `Get-FileHash` → `0A6B99CA15C2A72AD024D78D94D3980833B77EFDA41AF17D0571D21FEE2956CE`; `Get-ChildItem -Name` → `hello.txt`.
- (c) tool error `C:\Users\aliev\AppData\Local\Temp\bridge-e2e\dl1\hello.txt exists — pass overwrite:true to replace it`.
- (d) `overwrite:true` → the two lines of (a) again; the active tab unchanged; listing `hello.txt`.

## DL-2 — PASS
- (0) `Test-Path …\dl2` → `False`.
- (a) session `1d2490d2`: `Navigated active tab to http://127.0.0.1:8081/page`; `fetch('/page')…` → `200`; `fetch('/dl2')…` → tool error `[chrome.debugger] TypeError: Failed to fetch` / `    at <anonymous>:1:1`.
  `redirect8081.log`: `"GET /page HTTP/1.1" 200 -` (navigation), `"GET /favicon.ico HTTP/1.1" 302 -`, `"GET /page HTTP/1.1" 200 -`, `"GET /dl2 HTTP/1.1" 302 -`. The 8080 log's `GET /dl/hello.txt 200` at that moment came from the favicon redirect (recorded, not judged).
- (b) `Saved C:\Users\aliev\AppData\Local\Temp\bridge-e2e\dl2\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca…2956ce` / `(followed redirects to localhost:8080)`. Fixture log `"GET /dl2 HTTP/1.1" 302 -`; 8080 log `"GET /dl/hello.txt HTTP/1.1" 200 -`.
- (c) hash `0A6B99CA…2956CE` (= DL-1 (b)); listing `hello.txt`.

## MUX-10 — PASS
- Pre: S4 and S5 ended by the driver (`taskkill`, `Test-SafeToKill` safe); no daemon; nothing on 9234.
- `git worktree add ..\bridge-v1 1a92d95`; `npm install` exit 0; `npm run build` exit 0.
- The old server in its own minimized PowerShell, which read the token from `bridge.token` itself (nothing printed); its output: `[chrome-bridge] WebSocket host listening on 127.0.0.1:9234`; Chrome connected to it within 7 s.
- Recipe: ``2026-10-22T11:26:13.037Z hello-recipe: FAILED after 2016 ms — VERSION: No welcome from 127.0.0.1:9234 within 2 s after hello: a pre-Step-6 bridge server holds port 9234. End the old Claude session (or stop the old `node …/server/dist/index.js`) and try again.`` (the message's own backticks around `node …/server/dist/index.js` are single, `sdk/src/knock.ts`); `exit 1`; `Get-BridgeDaemon` → nothing.
- The old `node` was found by its port (its command line is relative, `server\dist\index.js`), stopped after `Test-SafeToKill`; rerun: `connected in 336 ms as client c1 … up 0s …` / `closed after 340 ms — OK`; exit 0.
- Cleanup: `git worktree remove` refused (`package-lock.json` modified by `npm install`), `--force` deregistered it, `Remove-Item` removed the folder; `git worktree list` → main only; `Test-Path Env:BRIDGE_TOKEN` → `False`.

## D6.3 — PASS
`Copy-Item daemon.log …\daemon-wave.log` at the end (148 lines) → `://` count **0**, token count **0**, `[line withheld:` count **0**. Attached as `W1-daemon-log.txt`.

## Findings (no code changed)
1. **`browser_status`'s active tab and the action tools' active tab can differ** (MUX-5): `listTabs` marks the first active tab of any window, `activeTab()` asks for the last-focused window. With a DevTools window focused, status names a tab and every action fails with `No active tab in the last-focused window`.
2. **A daemon spawned through `Start-Process -NoNewWindow` kept the driver's output pipe open** (MUX-6): the tool call that ran the block returned only when the driver stopped that daemon (measured by correlation). A foreground `npx tsx recipes/hello.ts` whose daemon kept running returned at once (MUX-10's rerun). So the spawned daemon can inherit a handle a caller marked inheritable.
3. **Wave-sheet nits:** MUX-6's block prints `Get-BridgeDaemon` as an empty row under the `Id, ExitCode` table (add `| Format-List`); MUX-10's stop-by-command-line pattern does not match the relative `server\dist\index.js`; MUX-10's worktree removal needs `--force` and a `Remove-Item` after `npm install`; `python` may not be on PowerShell's PATH; `Start-Process -ArgumentList '-Command', '<string with spaces>'` is split by PowerShell 5.1 (use `-File`).

## Follow-up — NET-1 size probe (2026-10-22, after the wave, at the user's request)
- No committed fixture fits `12.9 KB` in LF: `git cat-file -s` per version → ac469da 12 914 B
  (254 lines; CRLF 13 168 B), 1e9e0ee 10 692 B, c2ceec5 10 153 B, 4400a21 9 942 B.
- Two copies of today's fixture served by `python -m http.server 8090 --bind 127.0.0.1` from a temp
  folder: `lf.html -> HTTP 200, Content-Length 12914, body 12914 bytes`;
  `crlf.html -> HTTP 200, Content-Length 13168, body 13168 bytes`.
- A headless session (12:00:05–12:00:42Z): `browser_network_clear` → `Cleared 7 requests.`; navigate
  both; `browser_network_requests` →
  `[255]   6.3s ago   GET     200  document    5ms  12.6 KB  http://127.0.0.1:8090/lf.html` /
  `[256]   6.2s ago   GET     404  image       5ms  460 B   http://127.0.0.1:8090/favicon.ico` /
  `[257]   3.8s ago   GET     200  document    6ms  12.9 KB  http://127.0.0.1:8090/crlf.html`.
- So the displayed size is the response's `Content-Length`, and Run 6's `12.9 KB` was a CRLF working
  copy. `git ls-files --eol test-fixtures/e2e-playground.html` → `i/lf w/lf` today. Nothing was cut
  short (decisions.md · 2026-10-22 · NET-1's `12.9 KB` came from a CRLF copy of the fixture, proven by
  a live probe).

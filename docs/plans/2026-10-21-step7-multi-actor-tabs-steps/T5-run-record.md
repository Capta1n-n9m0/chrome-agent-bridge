# Wave T5 — run record (Step 7 E2E: §4.14 rows, regression and designed-change rows), 2026-10-22

Evidence for Run 8 in `docs/e2e-test-plan.md` §5. Each line below is a command and the text it printed.
Tool outputs are copied from the actors' stream (`recipes/t5-actor.ts send`, the `OUTPUT:` lines; the
same text is in each session's transcript `~/.claude/projects/<repo>/<session>.jsonl`), never from a
model's paraphrase; script lines are the scripts' own output. Times are UTC. The daemon log of the wave
is [`T5-daemon-log.txt`](T5-daemon-log.txt) (200 lines; hygiene 0 / 0 / 0, below). The expected text is
`docs/e2e-test-plan.md` §4.14 and the wave sheet `T5-wave-sheet.md`, committed in `e7e56ff` before any
row ran. Window captures and screenshots were viewed by the driver and are not committed (they show
Chrome's frame, B2).

**B2 omission:** one Chrome window existed before the wave and was not opened, touched or captured by it:
a tab `T1` on `http://127.0.0.1:8090/crlf.html` (W1's NET-1-probe copy of the fixture, its server long
gone). Its line in every `browser_list_tabs` output below is written `[1 pre-existing line omitted]`.

## First line of the run

- 2026-10-22, the user (relayed by the session agent): **"I reloaded the extention."** — received by the
  driver 19:36:39Z. No `/mcp`: every actor is a fresh headless session that loads the new
  `mcp/dist/index.js` (T5.1).

## Set-up (step 0)

- HEAD `19e8971` (the session agent's T5-close commit on top of `e7e56ff` / `87c75c5`); tree clean but
  `journal.md`. Chrome 156.0.8078.48 · Node v25.2.1 · Windows 11 Pro 10.0.26300.
- `Get-DaemonBuild` → `ee86adea97f873f43d0001dcbae60f3b10717ffd327dbcdccbf8395fbca2c5c5` (= the T5 build);
  `Get-BridgeDaemon` → nothing; nothing listening on 9234; `Test-Path Env:BRIDGE_TOKEN` → `False`;
  `git check-ignore bridge.token` → `bridge.token`; driver check (A1) → nothing; no `mcp/dist` process.
- Fixture server: `$HOME\miniconda3\python.exe -I -m http.server 8080 --bind 127.0.0.1 --directory test-fixtures`
  (pid 11440); `Invoke-WebRequest http://localhost:8080/e2e-playground.html` → `200 13106`.
- Actors: `t5-actor.ts start <name> --tools <list>`; every actor ended with `exit code 0` (`t5-actor.ts
  status` at the end). Each actor's first use of a tool is preceded by a `ToolSearch` call that loads
  that tool's schema (Claude Code's deferred tools); it acts on nothing and is not a bridge call, so it
  is not counted against the step's tool list.
- **Set-up fixes during the wave** (helpers only; no judged line changed):
  1. LEASE-1 first attempt: `--tools browser_snapshot,browser_click,browser_list_tabs` unquoted in
     PowerShell became an array and only the first tool was allowed; A and B were ended and restarted with
     quoted lists, and the row was run again from its first step.
  2. LEASE-5 first attempt: `t5.ts lease5` printed `FAILED — Error: evaluate returned kind undefined:
     undefined` before measuring. Cause: the extension wraps an expression that contains `return` in an
     async function body (EVAL-4's form), so the helper's IIFE value was lost. Fix in
     `recipes/t5-lib.ts` `evalJson`: send `return (<expr>);`. The row was run again in a new window.
  3. SCREEN-5 first attempt: `Move-T5Window` did not move the maximized windows (the target window was
     left fully under the human window, B4 broken). Fix in `recipes/t5-win.ps1`: un-maximize first. The
     first attempt's observation is kept as a finding (below); the row was run again.
  4. `chrome://discards` and `chrome://extensions` do not open from `chrome.exe --new-window`; a New Tab
     opens instead. The sheet's fallback (address bar by SendKeys in the driver's own window) was used.

## RELOAD-1 — PASS (19:37:35)
`npx tsx recipes/t5.ts check` (driver window W0 on `…?t5=check`):
```
t5-check: connected as client c1 — daemon build ee86adea97f873f43d0001dcbae60f3b10717ffd327dbcdccbf8395fbca2c5c5, proto 2, extension connected
t5-check: listTabs — 2 tab(s); human's tab (current): T2 (fixture page)
t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
t5-check: snapshot T2 — elements: yes (29); text field: absent
t5-check: focusTab T2 — ok
t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
```
The daemon it started (26432) was stopped (`Test-SafeToKill` → safe) for MUX-1.

## Designed-change rows (#60)

**MUX-1 — PASS · STAT-1 — PASS.** Actor S1 (claude 26300; MCP `claude-code #5620`, whose parent is
claude.exe 26300 — no nvm shim in this set-up). `browser_status` (19:38:09):
```
Daemon: connected on 127.0.0.1:9234 (build ee86adea97f873f43d0001dcbae60f3b10717ffd327dbcdccbf8395fbca2c5c5, up 18s)
Clients (1): claude-code #5620
Extension: connected
Active tab: [T2] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=check
```
`Get-BridgeDaemon` → one process 23664, parent 5620. Log: `start pid=23664`, `config pid=23664 port=9234
idleMs=600000 build=ee86adea…`, `listening on 127.0.0.1:9234`, `client + "claude-code #5620" (1 client)`, followed by two lines the row does not judge: `extension resync: 2 tabs, 0 gone` and the driver's own `client + "t5-find" (2 clients)` / `client - "t5-find" (1 client)` (B1 check).

**TAB-1 — PASS.** `browser_list_tabs` → `[1 pre-existing line omitted]` /
`T2* Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=check`.

**TAB-2 — PASS.** Second tab by `Open-T5Tab …?t5=tab2` (T3), back to T2 by Ctrl+1 (`t5.ts info`: `check: T2
(…, active in its window, current)`, `tab2: T3 (…, background)`). S1: list (`T2*`, `T3 `) →
`browser_select_tab {"tab":"T3"}` → `Selected tab T3 (now this session's tab; not brought on screen —
browser_focus_tab shows it)` → snapshot `url: http://localhost:8080/e2e-playground.html?t5=tab2   title:
"Agent Bridge E2E Playground"` → list `T2* …?t5=check` / `T3  [claude-code #5620] …?t5=tab2`. After:
`check: T2 (…, active in its window, current)` — the screen did not change. (The model's own retelling of
the snapshot garbled two lines; the OUTPUT text is the record.)

**TAB-5 — PASS.** `browser_focus_tab {}` → `Focused tab T3`; then `tab2: T3 (…, active in its window,
current, owner "claude-code #5620")`, `check: T2 (…, background)`.

**TAB-3 — PASS.** `browser_new_tab {"url":"http://localhost:8080/e2e-playground.html?t5=tab3"}` →
`Opened tab T4`; the next untargeted `browser_snapshot` → `url: …?t5=tab3`; `tab3: T4 (…, active in its
window, current, owner "claude-code #5620")`.

**TAB-4 — PASS.** `browser_close_tab {"tab":"T4"}` → `Closed tab T4`; `browser_close_tab {}` → (isError)
`browser_close_tab needs tab: a handle from browser_list_tabs`; list → `T2  …?t5=check`, `T3* [claude-code
#5620] …?t5=tab2` (no T4).

**NET-12 — PASS.** `browser_new_tab …?t5=net12` → `Opened tab T5`; click `Fetch JSON` (e22) → `Clicked
e22`; `{"tab":"all"}` →
```
Network — all tabs: showing 4 of 4 (recording since 5m50s ago; 0 pending)
[2959]  tab:T2    3m28s ago  GET     200  document    8ms  12.8 KB  http://localhost:8080/e2e-playground.html?t5=check
[2971]  tab:T3    2m09s ago  GET     200  document    6ms  12.8 KB  http://localhost:8080/e2e-playground.html?t5=tab2
[2973]  tab:T5    16.1s ago  GET     200  document    6ms  12.8 KB  http://localhost:8080/e2e-playground.html?t5=net12
[2974]  tab:T5    1.9s ago   GET     200  xhr         3ms  28 B    http://localhost:8080/ok.json
```
`browser_close_tab {"tab":"T5"}` → `Closed tab T5`; `{"tab":"all"}` → `showing 2 of 2`, only the T2 and T3
lines.

**MUX-3 — PASS.** S2 (`claude-code #2564`) connected; `recipes/hello.ts 60000` in the background:
```
hello-recipe: connecting (pid 7680)
hello-recipe: connected in 16 ms as client c12 — daemon build ee86adea…, proto 2
hello-recipe: daemon.status — port 9234, up 258s, extension connected, clients (3): claude-code #5620, claude-code #2564, hello-recipe
hello-recipe: listTabs — 3 tab(s); active: [1108126308] Agent Bridge E2E Playground
hello-recipe: holding the connection for 60000 ms — call browser_status now
hello-recipe: still connected after the hold — clients (3)
hello-recipe: closed after 60029 ms — OK
```
`mux3.err` empty; exit code 0. S1 during the hold: `Clients (3): claude-code #5620, claude-code #2564,
hello-recipe`, `Active tab: [T3] … ?t5=tab2`; after: `Clients (2): claude-code #5620, claude-code #2564`.
The recipe's `[1108126308]` is T3's chrome id (`t5.ts info tab2` → `T3 (chrome id 1108126308, …)`), the
tab `browser_status` names. Log: `client + "hello-recipe" (3 clients)`, `client - "hello-recipe" (2 clients)`.

## Regression rows (T5.3) and ACT-8 — S1 on the plain URL (window W_r, tab T6)

- **PERC-1/2 — PASS.** After `browser_select_tab {"tab":"T6"}` and `browser_navigate` (`Navigated active
  tab to http://localhost:8080/e2e-playground.html`): `textbox "Email address" [ref=e1]`, `textbox
  "Password" [ref=e2]`, `textbox "Search query" [ref=e3]`, `combobox "Favorite fruit" [ref=e4]`,
  `button "Sign in" [ref=e5]`, `link "Jump to bottom" [ref=e9]`.
- **ACT-1 — PASS.** `browser_type e1 "a@b.com"` → `Typed into e1`; screenshot: `status: email = a@b.com`.
- **ACT-2 — PASS.** `browser_click e6` → `Clicked e6`; screenshot `status: counter = 1`; snapshot
  `button "Click counter: 1" [ref=e6]`.
- **PERC-3 — PASS.** viewport PNG 1920x959 renders.
- **TRUST-2 — PASS.** `browser_click {"ref":"e7","trusted":true}` (19:45:02.157) → `Clicked e7`;
  screenshot `status: TRUSTED click received`. Capture loop (250 ms) on W_r: band 106 → 90 at 19:45:02.353,
  back to 106 at 19:45:07.457; the viewed frame shows `"Chrome Agent Bridge" started debugging this
  browser [Cancel]`.
- **EVAL-1 — PASS.** `browser_evaluate {"expression":"document.title"}` → `Agent Bridge E2E Playground`;
  band 90 from 19:45:17.944 to 19:45:22.679, 106 after.
- **PERC-4 — PASS.** `browser_screenshot {"fullPage":true}` → a 1905x2776 PNG with `BOTTOM MARKER — visible
  only after scrolling or in a full-page screenshot.` at its foot; band 90 from 19:45:31.523 to 19:45:37.837.
- **NET-1 — FAIL (as written).** `browser_network_clear {}` → `Cleared 2 requests.`; navigate →
  `Navigated active tab to http://localhost:8080/e2e-playground.html`; `browser_network_requests {}` →
  ```
  Network — active tab: showing 1 of 1 (recording since 11m18s ago; 0 pending)
  [2985]  1.6s ago   GET     200  document    3ms  12.6 KB  http://localhost:8080/e2e-playground.html
  Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.
  ```
  No banner (41 frames, band 106 throughout). Expected `12.8 KB` (#56) — got `12.6 KB`. Cause, measured:
  the request never reached the server (`http8080.log` has plain-URL GETs only at 23:37:22 and 23:43:44
  local = 19:37:22 and 19:43:44Z, none at 19:44:12, 19:46:25 or 19:46:42); an informational
  `browser_network_requests {"id":"2985"}` shows `status: 200 OK   from cache: yes`, `date: Thu, 22 Oct
  2026 09:04:00 GMT`, `content-length: 12914`, `last-modified: Mon, 07 Sep 2026 15:43:58 GMT`. Chrome
  served the pre-T1 fixture from its HTTP cache (heuristic freshness from W1's 09:04 fetch). The bridge
  reported what Chrome did; the row's URL is cache-prone. Not re-run (it would hit the same cache; clearing
  it would touch the user's profile).
  *The same cached page served PERC-1/2 and ACT-1/2/3 and TRUST-2: it has no `link "Open popup"`; their
  expected texts do not depend on it.*
- **ACT-3 — PASS.** `browser_type {"ref":"e1","text":"x@y.com","submit":true}` → `Typed into e1`;
  screenshot `status: form submitted (email = x@y.com)`.
- **ACT-8 — PASS** (G7-1 deferral). Navigate `…?t5=act8`, navigate back, `browser_click {"ref":"e6"}` →
  (isError) `ref e6 not found — call browser_snapshot to re-snapshot`.
- **DL-1 — PASS.** (0) `False`. (a) `browser_status` before and after: `Active tab: [T6] Agent Bridge E2E
  Playground — http://localhost:8080/e2e-playground.html`; download → `Saved
  C:\Users\<you>\AppData\Local\Temp\bridge-e2e\dl1\hello.txt` / `69 bytes · text/plain · sha256
  0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce`. (b)
  `0A6B99CA15C2A72AD024D78D94D3980833B77EFDA41AF17D0571D21FEE2956CE`, listing `hello.txt`. (c) (isError)
  `C:\Users\<you>\AppData\Local\Temp\bridge-e2e\dl1\hello.txt exists — pass overwrite:true to replace it`.
  (d) the two lines again. The capture loop had ended before (a), so (a) was repeated after a reset under
  a new capture (127 frames, band 106 throughout: no banner) with the same two lines. The service-worker
  console line was not observed (as W1; opening the console moves focus).

## LEASE rows

**LEASE-1 — PASS** (second attempt; set-up fix 1). Actors A (claude 17956 → MCP `claude-code #15352`,
`Get-ProcTree 17956` = `17956,13140,15352,29896`) and B (claude 13496 → MCP `#25152`). W1 on `…?t5=lease1`
(T7).
- A `browser_snapshot {}` (19:50:38) → `url: http://localhost:8080/e2e-playground.html?t5=lease1   title:
  "Agent Bridge E2E Playground"`, `button "Click counter: 0" [ref=e6]`.
- B `browser_snapshot {}` → (isError) `tab T7 is held by "claude-code #15352" since 19:50:38 — use
  browser_new_tab, or browser_list_tabs to pick a free tab`.
- B `browser_new_tab {"url":"…?t5=lease1-b"}` → `Opened tab T8`; snapshot `url: …?t5=lease1-b`,
  `button "Click counter: 0" [ref=e6]`.
- Parallel (sends 19:51:44.570 A, 19:51:44.674 B): A `Clicked e6`, snapshot `url: …?t5=lease1`, `button
  "Click counter: 1" [ref=e6]`; B `Clicked e6`, snapshot `url: …?t5=lease1-b`, `button "Click counter: 1"
  [ref=e6]` (snapshots 19:51:56.317 and 19:51:56.248).
- A `browser_list_tabs` → `[1 pre-existing line omitted]` / `T7  [claude-code #15352] … ?t5=lease1` /
  `T8* [claude-code #25152] … ?t5=lease1-b`.
- First attempt (invalid set-up, kept for the record): the same refusal text appeared, `tab T7 is held by
  "claude-code #17612" since 19:49:50 — …`, with A = #17612 in A's tree.

**LEASE-4 — PASS.** B `browser_select_tab {"tab":"T7"}` → (isError) `tab T7 is held by "claude-code
#15352" since 19:50:38 — …`; `t5-actor.ts end A` → `actor A ended after 508 ms: … exit code 0`; log
`client - "claude-code #15352" (1 client)`; B `browser_select_tab {"tab":"T7"}` → `Selected tab T7 (now
this session's tab; not brought on screen — browser_focus_tab shows it)`; list `T7  [claude-code #25152] …
?t5=lease1`; snapshot `url: http://localhost:8080/e2e-playground.html?t5=lease1   …`.

**LEASE-7 — PASS.** W7 on `…?t5=lease7-home` (T9), `Open-T5Tab …?t5=lease7-human` (T10, active, current).
B: list `T10* Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease7-human` (no
holder); `browser_select_tab {"tab":"T10"}` → `Selected tab T10 (…)`; list `T10* [claude-code #25152]
Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease7-human`.

**LEASE-2 — PASS.** W2 on `…?t5=lease2-claude` (T11, topmost); actor C (`claude-code #26184`):
`browser_select_tab {"tab":"T11"}` → `Selected tab T11 (…)` (then one set-up `browser_wait_for
{"seconds":1}` → `Waited 1s`, so the measured prompt did not spend time loading schemas). Script:
```
t5-lease2: opened T12 for lease2-script (active), leased to t5-lease2
t5-lease2: typing started — 30 trusted type calls into e11, one every 1500 ms
t5-lease2: typing ended — 30/30 type calls ok, 43.8 s (2026-10-22T19:54:24.556Z → 2026-10-22T19:55:08.306Z)
t5-lease2: final value "lease2abcdefghijklmnopqrstuvwx"; final status "status: TRUSTED input = lease2abcdefghijklmnopqrstuvwx"
t5-lease2: LEASE-2 script PASS — value exact: yes; status exact: yes; calls ok: 30/30; typing ≥ 30 s: yes
```
C's three snapshots, outputs at 19:54:29.095, 19:54:35.336, 19:54:43.449 (inside the typing window), each
`url: http://localhost:8080/e2e-playground.html?t5=lease2-claude   title: "Agent Bridge E2E Playground"`.

**LEASE-3 — FAIL (url sub-check only).** W3 on `…?t5=lease3-home`. Script:
```
t5-lease3: opened T14 for lease3 (active), leased to t5-lease3
t5-lease3: click e10 (synthetic) — ok
t5-lease3: after the synthetic click: leaseGranted {"tab":"T15","reason":"opener","url":"<non-fixture url withheld>"} after 31 ms; popup tabs: T15 (chrome id 1108126364, active in its window, current, owner "t5-lease3") opener 1108126361
t5-lease3: note: the event's url is empty (F33: tabCreated before the URL was set) — a FAIL of the url sub-check only
t5-lease3: LEASE-3 FAIL (synthetic click) — event tab T15, reason opener, url <non-fixture url withheld>; listTabs owner of T15: "t5-lease3"
t5-lease3: holding the opener lease for 90000 ms — call browser_list_tabs now
t5-lease3: after the hold: T15 (chrome id 1108126364, active in its window, current, owner "t5-lease3")
```
(`<non-fixture url withheld>` is how `showUrl` prints the empty string; the note line says it is empty.)
C `browser_list_tabs` → `T14  [t5-lease3] … ?t5=lease3` / `T15* [t5-lease3] Agent Bridge E2E Playground —
http://localhost:8080/e2e-playground.html?popup=1`. So: the synthetic click opened the popup, Chrome set
`openerTabId` (1108126361 = T14), the grant and the event arrived (the offscreen relay's live event frame,
a G7-1 deferral), and the owner shows in both listings; only the event's `url` is `""` where the row
expected the popup URL (the protocol allows `""`, `shared/src/protocol.ts` `LeaseGrantedParams`; the row
was stricter).

**LEASE-5 — PASS** (second attempt; set-up fix 2). W5 on `…?t5=lease5`, closed by `Close-T5Window` (its hwnd
3017620 = the window titled `T5 LEASE5 target - Google Chrome`) at 19:57:42.509:
```
t5-lease5: holding T17 (chrome id 1108126380, active in its window, current, owner "t5-lease5"); title set to "T5 LEASE5 target"
t5-lease5: close the window titled "T5 LEASE5 target" now — waiting up to 180 s for tabGone
t5-lease5: event tabGone {"tab":"T17","lastUrl":"http://localhost:8080/e2e-playground.html?t5=lease5","lastTitle":"T5 LEASE5 target"}
t5-lease5: snapshot T17 → TAB_GONE: tab T17 was closed — call listTabs to pick another tab · data {"tab":"T17","lastUrl":"http://localhost:8080/e2e-playground.html?t5=lease5","lastTitle":"T5 LEASE5 target"}
t5-lease5: LEASE-5 PASS
```

**LEASE-6 — PASS (b).** W6 on `…?t5=lease6-home`; `chrome://discards` in its own window (address-bar
fallback), the row `T5 LEASE6 target` → its actions cell's second invokable group, **Urgent Discard**
(`[Load] [Urgent Discard] [Proactive Discard] [Freeze]`), invoked by UI Automation at 19:58:51.06:
```
t5-lease6: before: T19 (chrome id 1108126391, background, owner "t5-lease6"); title "T5 LEASE6 target"
t5-lease6: while discarded: snapshot T19 → INTERNAL: The tab was discarded by Chrome's Memory Saver — call browser_navigate or focus it to reload
t5-lease6: while discarded: listTabs T19 → T19 (chrome id 1108126396, background, owner "t5-lease6"); the lease6 tab → T19 (chrome id 1108126396, background, owner "t5-lease6")
t5-lease6: focusTab T19 (reloads the discarded tab) — ok
t5-lease6: after reload: snapshot T19 → ok (29 elements), url http://localhost:8080/e2e-playground.html?t5=lease6
t5-lease6: after reload: listTabs T19 → T19 (chrome id 1108126396, active in its window, current, owner "t5-lease6"); the lease6 tab → T19 (chrome id 1108126396, active in its window, current, owner "t5-lease6")
t5-lease6: LEASE-6 PASS (b) — new chrome id 1108126396 (was 1108126391), the same handle: tabReplaced was applied
```
A discard on Chrome 156 **does** replace the tab id (Stage 0 F7's "probably keeps the id" was wrong); the
handle survived through `tabReplaced`. #45's revisit trigger ("LEASE-6 shows a new id") is met.

## SCREEN rows

The pre-written image check — "magenta at (20,20)", a ±24 tolerance per channel — is an **instrument
fault** in all SCREEN rows: (20,20) lies on the bar's black label text (`#6b0000`, anti-aliased "S" over
magenta), and the capture is colour-managed (the bar off the label reads `#dd00fa` for `#ff00ff`, outside
±24). The rows are judged as written (FAIL); an **informational** probe at (1900,20) (or (900,20) for
SCREEN-5's 944-px image) and the viewed images show which tab each image is.

**SCREEN-1 — FAIL as written (instrument); flash measured.** Ws on `…?t5=screen-human` (T21, topmost):
```
t5-screen1: human T21 (cyan bar), target T22 (magenta bar, background, leased to t5-screen1)
run 1: call 1520 ms; image 1920x903, pixel(20,20) #6b0000 (other) … ; human tab hidden +6 ms, visible again +1514 ms → flash 1509 ms; target visible +10 ms, hidden +1512 ms; after — human T21 (…, active in its window, current); target T22 (…, background, …); FAIL (finding: flash over 1 s)
run 2: call 1496 ms; … #6b0000 …; hidden +5 ms, visible again +1491 ms → flash 1486 ms; target visible +8 ms, hidden +1488 ms; after as run 1; FAIL (finding: flash over 1 s)
run 3: call 1504 ms; … #6b0000 …; hidden +6 ms, visible again +1498 ms → flash 1493 ms; target visible +9 ms, hidden +1496 ms; after as run 1; FAIL (finding: flash over 1 s)
SCREEN-1 FAIL — flash per run 1509, 1486, 1493 ms; median 1493 ms (method: page-side visibilitychange timestamps on the human's tab)
```
Every other condition held in all three runs (human visible again ≤ 2000 ms after the call started;
human active and current after; target background). Informational (1900,20): `#dd00fa` ×3; the viewed
image shows the magenta `SCREEN-1 TARGET` bar over the playground. **Flash: median 1493 ms** — over 1 s.

**SCREEN-2 — FAIL.** `t5.ts screen2` (T23 background; capture loop on Ws):
```
t5-screen2: human T21, target T23 (background) — capturing with mode:"cdp" in 5000 ms (start the capture loop now)
t5-screen2: screenshot T23 mode:"cdp" → TIMEOUT: Timed out after 35000ms calling screenshot
t5-screen2: call 2026-10-22T20:00:25.675Z → 2026-10-22T20:01:00.687Z (35012 ms)
t5-screen2: FAILED — DEBUGGER_DEVTOOLS: Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry.
```
A CDP viewport capture of a hidden tab never returned; the banner (band 90) was up from the script's set-up evaluates (20:00:20.9, before the call) to the end of the capture loop (20:00:48.8, 23 s into the 35 s call);
the script's next `evaluate` (on the human's tab, reading its log) got `DEBUGGER_DEVTOOLS`. 17–25 s later
`t5.ts mark` evaluated on both T21 and T23 normally (`visibilityState visible` / `hidden`).

**SCREEN-3 — (a) FAIL as written (instrument); serialised. (b) FAIL as written (instrument).**
(a):
```
t5-screen3-a: T24: call +0 ms → +1617 ms ok; image 1920x903, pixel(20,20) #690800 (other) …; own colour: no; visible +9 ms → hidden +1607 ms
t5-screen3-b: T25: call +0 ms → +2495 ms ok; image …, pixel(20,20) #453900 (other) …; own colour: no; visible +1627 ms → hidden +2484 ms
t5-screen3-c: T26: call +0 ms → +3873 ms ok; image …, pixel(20,20) #190000 (other) …; own colour: no; visible +2505 ms → hidden +3863 ms
t5-screen3: target visible intervals overlap: none; human tab hidden 3 time(s); after — human T21 (…, active in its window, current)
t5-screen3: human tab changes after the calls: hidden +5 ms, visible +1610 ms, hidden +1623 ms, visible +2488 ms, hidden +2502 ms, visible +3866 ms; alternating hidden/visible ×3: yes; each target inside its own hidden span: yes
t5-screen3: SCREEN-3 (a) FAIL — three captures all succeeded, each its own tab: no, serialised: yes
```
No quota error (F10). Informational (1900,20): a `#d92424` (red), b `#8fff3d` (lime), c `#3300f8` (blue) —
each its own bar. (b) D (`select T27`, red) and E (`select T28`, lime), sends 20:03:26.834 / 20:03:26.923:
both `browser_screenshot {}` outputs are images (no error; calls 20:03:31.787–33.454 and 35.695–37.326, so
model latency kept them from overlapping); `t5-png.ts --transcript` (20,20): D `#690800`, E `#453900`
(other); informational (1900,20): D `#d92424`, E `#8fff3d`. T3 verifier V4 (focus vs a timed-out restore):
not seen.

**SCREEN-4 — PASS-as-designed; `cdp`: error.** W4 on `…?t5=screen4` (T29), `mark screen4 magenta`,
`Hide-T5Window` → `True`:
```
t5-screen4: claimed T29 (screen4, in the minimized window)
t5-screen4: default mode → WINDOW_MINIMIZED: Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"
t5-screen4: SCREEN-4 default mode PASS-as-designed (the window must still be minimized: check with Get-T5ChromeWindows)
t5-screen4: mode:"cdp" → TIMEOUT: Timed out after 25000ms calling screenshot (recorded: error)
```
`Test-T5Minimized` after → `True`.

**SCREEN-5 — FAIL as written (instrument)** (second attempt; set-up fix 3). W5 (target T33 background,
front T34 active) at 1920,0 960x1040; Wh (human T35) at 2880,0 960x1040; both topmost.
```
t5-screen5: before — human T35 (…, active in its window, current) window 1108126473; front T34 (…, active in its window) window 1108126465; target T33 (…, background) window 1108126465; layout as required: yes
t5-screen5: call 1546 ms
t5-screen5: image 944x855, pixel(20,20) #6b0000 (other), 4 colours in an 8x8 grid
t5-screen5: after — human T35 (…, active in its window, current); front T34 (…, active in its window); target T33 (…, background, owner "t5-screen5")
t5-screen5: SCREEN-5 (Chrome side) FAIL — image is the target: no; human's tab still current: yes; front restored: yes
```
`Get-T5Foreground` before and after: `Hwnd 2362304` (Wh, the human's window), not W5 (2493374) — no window
was focused. Informational (900,20): `#dd00fa`.
**First attempt (set-up fault, finding kept):** with W5 fully covered, `screenshot T30 → TIMEOUT: Timed out
after 35000ms calling screenshot`; afterwards `front T31 (…, background); target T30 (…, active in its
window, …)` — and still so at 20:05:44 (49 s after the call): **a capture that hangs never restores the
previous tab**.

## BG rows (W_b on `…?t5=bg-human`, T36, topmost)

**BG-1 — FAIL** (recorded; T5.2's retry not run, #61):
```
t5-bg1: human T36; target T37 (background, leased to t5-bg1); target visibilityState hidden
t5-bg1: click e7 trusted → ok (5 ms)
t5-bg1: target status "status: idle"; field value ""; target visibilityState hidden
t5-bg1: human tab hidden during the call: no; after — human T36 (…, active in its window, current); target T37 (…, background, owner "t5-bg1")
t5-bg1: BG-1 FAIL — expected "status: TRUSTED click received"; background throughout: yes; human's tab unchanged: yes
t5-bg1: BG-1 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
t5-bg1: informational, not the T5.2 retry — after focusTab T37: action → ok; status "status: TRUSTED click received"; value ""
```
**BG-2 — FAIL** (recorded; retry not run, #61):
```
t5-bg2: human T36; target T38 (background, leased to t5-bg2); target visibilityState hidden
t5-bg2: type e11 "bg2typed" trusted → ok (10 ms)
t5-bg2: target status "status: idle"; field value ""; target visibilityState hidden
t5-bg2: human tab hidden during the call: no; after — human T36 (…, active in its window, current); target T38 (…, background, owner "t5-bg2")
t5-bg2: BG-2 FAIL — expected "status: TRUSTED input = bg2typed"; background throughout: yes; human's tab unchanged: yes
t5-bg2: BG-2 focus-emulation retry: not run — …
t5-bg2: informational, not the T5.2 retry — after focusTab T38: action → ok; status "status: TRUSTED input = bg2typed"; value "bg2typed"
```
The trusted input call returns `ok` in 5–10 ms and the hidden page receives nothing — a silent no-op.

**BG-4 — PASS.**
```
t5-bg4: human T36; target T39 (background, visibilityState hidden); the text is added 2000 ms after the arm
t5-bg4: waitFor {text} → ok after 3746 ms
t5-bg4: fetch /ok.json → 200; waitFor {networkIdle} → ok after 552 ms
t5-bg4: BG-4 PASS — text after 3746 ms, network idle after 552 ms; target still background: yes
```
**BG-3 — PASS.** `t5.ts open bg3` → `opened T40 for bg3 (background)`; `info` → `background`. Actor F
(`claude-code #22144`): `browser_select_tab {"tab":"T40"}` → `Selected tab T40 (…)`;
`browser_evaluate {"expression":"navigator.clipboard.writeText('t5-bg3').then(() => 'ok')"}` → (isError)
`[chrome.debugger] NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not
focused.` / `    at <anonymous>:1:21`; `browser_focus_tab {}` → `Focused tab T40`; the same evaluate → `ok`.

## RESOLVER-1 — FAIL as written (instrument: the stricter title sub-check); the Stage 0 rule met (G7-1 deferral)
Wq on `…?t5=resolver` (T41); `chrome://extensions` in We (address-bar fallback); `Invoke-T5Uia We 'service
worker' 'Chrome Agent Bridge'` → `invoked: ControlType.Hyperlink 'service worker,'` → a DevTools window
Wd (hwnd 9505982) whose UI shows `JavaScript context: ⚙ sw.js` and `[bridge] connection: …` lines (this
extension's console); We closed; `Set-T5Foreground Wq`, then `Set-T5Foreground Wd`; `Get-T5Foreground`
→ hwnd 9505982 = Wd before and after R's calls. Actor R (`claude-code #30716`):
```
Daemon: connected on 127.0.0.1:9234 (build ee86adea…, up 1935s)
Clients (1): claude-code #30716
Extension: connected
Active tab: [T41] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=resolver
```
and `browser_snapshot {}` → `url: http://localhost:8080/e2e-playground.html?t5=resolver   title: "Agent
Bridge E2E Playground"`; no `No normal Chrome window is focused` / `No active tab`. *\*Note: the row's
stricter sub-check quoted the DevTools title as `DevTools - chrome-extension://…`; Chrome titles this
window just `DevTools`, so `Get-T5Foreground` prints `<DevTools window>`; the foreground was confirmed by
handle. The Stage 0 rule itself is met; the row is judged as written, like the SCREEN image checks (wave verifier note 1), and goes to the user for a ruling.* Wd closed after the row.

## Close-down and log hygiene
- Every actor ended `exit code 0`; `t5.ts cleanup` closed every T5 tab; only the pre-existing window
  remains. Fixture server 11440 and daemon 23664 stopped after `Test-SafeToKill` → `safe: …`; no daemon or
  `mcp/dist` process left.
- `daemon.log` copied; the wave's part starts at `2026-10-22T19:37:35Z start pid=26432` (200 lines) →
  `://` count **0**, token count **0**, `[line withheld:` count **0**. Attached as `T5-daemon-log.txt`.
  No `legacy client` line.

## Findings (no code changed)
1. **NET-1's row is cache-prone:** the plain URL's page came from Chrome's HTTP cache (W1's 12 914-byte
   copy, `from cache: yes`), so the size cannot follow the fixture. Proposed: a fresh `?t5=net1` URL or a
   check of `from cache: no` in the row.
2. **The pre-written SCREEN image check was wrong:** the probe pixel sits on the label text and the
   capture is colour-managed. Proposed: re-run SCREEN-1/3/5 with the probe off the label and a hue test,
   before the user's ruling on these rows.
3. **SCREEN-1's flash is ~1.5 s** (1509/1486/1493 ms): the human's tab goes hidden 5–6 ms after the call
   and visible again ~1.5 s later. 1.5 s ≈ the 1000 ms activation wait running to its limit + 50 ms + the
   capture, which suggests `onActivated` does not end the wait (unconfirmed; T6/Step 8 to look).
4. **`mode:"cdp"` on a hidden tab hangs** (SCREEN-2: 35 s to `TIMEOUT`, banner up throughout, then a
   transient `DEBUGGER_DEVTOOLS` on another tab; SCREEN-4: 25 s in a minimized window). `Page.captureScreenshot`
   never returns for a hidden page.
5. **A hung `captureVisibleTab` never restores the previous tab** (SCREEN-5's first attempt: target left
   active ≥ 49 s). The restore runs only after the capture settles; the 30 s chain release does not restore.
5a. **A default-mode capture of a tab in a fully covered window hangs to `TIMEOUT`** (SCREEN-5's first
   attempt, 35 s; `captureVisibleTab` does not return for an occluded window).
6. **Trusted input into a background tab is a silent no-op** (BG-1/BG-2: `ok` in 5–10 ms, nothing
   received); it works after `focusTab`. Step 8's `sdk/src/policy.ts` input: trusted input needs the tab in
   front (or focus emulation, which no method can send — #61).
7. **A discard replaces the tab id on Chrome 156** (LEASE-6 (b)); #45's revisit trigger met; the spec §3
   rationale stands as originally written.
8. **`leaseGranted.url` is `""` for a link popup** (LEASE-3; F33): `tabCreated` fires before the URL is set.
9. `chrome.exe --new-window chrome://…` opens a New Tab, not the page (helper note).

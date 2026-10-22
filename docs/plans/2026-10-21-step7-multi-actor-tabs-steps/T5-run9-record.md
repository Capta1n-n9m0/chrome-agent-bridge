# Wave T5 — Run 9 record (T5b re-check and the corrected checks), 2026-10-23

Evidence for Run 9 in `docs/e2e-test-plan.md` §5. Each line below is a command and the text it printed.
Tool outputs come from the actors' stream (`recipes/t5-actor.ts send`, the `OUTPUT:` lines) and script
lines are the scripts' own output. Times are UTC (the server log's times are local, UTC+4). The rows, their expected text and the
corrected checks were committed in `b4ea752` (§4.15, the wave sheet's "Run 9") before any Run 9
measurement. The daemon log of Run 9 is [`T5-run9-daemon-log.txt`](T5-run9-daemon-log.txt) (81 lines,
hygiene 0 / 0 / 0). Run 8's record (`T5-run-record.md`) and results are untouched. No images are
committed. The pre-existing window (W1's `127.0.0.1:8090/crlf.html` probe copy) was again left
untouched; its `browser_list_tabs` line is written `[1 pre-existing line omitted]` (B2).

## First line of the run

- **Extension reloaded by `recipes/reload-extension.ps1` (RELOAD-AUTO `15320a6`; decisions.md #64/#65),
  user not present.** The session agent's stage RELOAD-AUTO reloaded it first, then the driver ran the
  script once more at step 0 (22:52:48Z), so the run starts from a fresh worker:
  ```
  reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\<you>\Projects\chrome-remote-extention\extension)
  reload-extension: daemon running: yes (pid 26572)
  reload-extension: own window 1245592 opened
  reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
  reload-extension: pressed the reload button of the card
  reload-extension: UIA: the card's service worker restart seen: yes; inspect views now: service worker, |  1 more…
  reload-extension: daemon.log: new line '2026-10-22T22:52:50Z extension resync: 2 tabs, 0 gone'
  reload-extension: RELOAD OK - the extension reconnected to the daemon after the press at 22:52:50.674Z; now run the stale-extension check
  reload-extension: own window 1245592 closed
  ```
  exit code `0`. No `/mcp`: every actor is a fresh headless session.

## Set-up (step 0)
- HEAD `15320a6`; tree clean but `docs/decisions.md` and `journal.md` (the session agent's). Chrome
  156.0.8078.48 · Node v25.2.1 · Windows 11 Pro 10.0.26300.
- `Get-DaemonBuild` → `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974`; running daemon
  26572 (`config pid=26572 port=9234 idleMs=600000 build=490f1c60…`, ours, kept for the run);
  `Test-Path Env:BRIDGE_TOKEN` → `False`; driver check → nothing; no `mcp/dist` process.
- Fixture server (miniconda, pid 12308): `200 13106`.
- Actors started with quoted tool lists; every actor ended `exit code 0`. Each actor's `ToolSearch`
  calls load tool schemas only (not bridge calls).
- No set-up fix was needed in Run 9; no helper changed.

## R9-RELOAD-1 — PASS (22:53:12)
```
t5-check: connected as client c10 — daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, proto 2, extension connected
t5-check: listTabs — 2 tab(s); human's tab (current): T26 (fixture page)
t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
t5-check: snapshot T26 — elements: yes (29); text field: absent
t5-check: focusTab T26 — ok
t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
```

## R9-SCREEN-2 — FAIL as written (the positive-control sub-check); the refusal itself as expected
Ws on `…?t5=screen-human` (T27, topmost), capture loop 200 ms. `npx tsx recipes/t5.ts r9-cdp --hue`:
```
t5-r9-cdp: human T27, target T28 (background, leased to t5-r9-cdp) — the call starts in 10000 ms (start the capture loop now)
t5-r9-cdp: call 2026-10-22T22:53:38.932Z → 2026-10-22T22:53:38.935Z: screenshot T28 mode:"cdp" → OFFSCREEN: The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first in 3 ms
t5-r9-cdp: human tab hidden: never; target visible: never
t5-r9-cdp: the human's active tab T27 by mode:"cdp" → image 1920x903, bar probes (960,24) #97fdfd (1440,24) #97fdfd (1900,24) #97fdfd → other (hue rule) → …\t5\r9-cdp-active.png
t5-r9-cdp: R9 SCREEN-2 (Chrome side) FAIL — OFFSCREEN with the exact message in < 1000 ms: yes; no tab switch: yes; the active tab still captures (cyan): no; banner: judged from the capture loop between the call's two times
```
Banner: frames from 22:53:37.932 to 22:53:39.435 all have band 102, the same as the four frames in the
second before t0; the frame at t0 (`frame-225339.069`), viewed, shows no debugger bar; the band changes
to 90 at 22:53:40.140, when the script's own debugger use resumes. **What failed:** the active tab *did*
capture by CDP (an image came back), but its cyan bar reads `#97fdfd` in the colour-managed image: R = 151,
just above the hue rule's "low" bound (≤ 100), so the rule names it `other`. That is the pre-registered
check's limit, not the bridge's. Judged as written: FAIL. The stale-build discriminator is met (an
`OFFSCREEN` in 3 ms, not a hang).

## R9-SCREEN-1 — PASS
`npx tsx recipes/t5.ts screen1 --hue`:
```
t5-screen1: human T27 (cyan bar), target T29 (magenta bar, background, leased to t5-screen1)
run 1: call 1589 ms; image 1920x903, bar probes (960,24) #dd00fa (1440,24) #dd00fa (1900,24) #dd00fa → magenta (hue rule) …
run 1: human tab hidden +6 ms, visible again +1594 ms → flash 1588 ms; target visible +9 ms, hidden +1592 ms
run 1: after — human T27 (chrome id 1108126715, active in its window, current); target T29 (chrome id 1108126723, background, owner "t5-screen1")
run 1: PASS (finding: flash over 1 s)
run 2: call 1557 ms; … → magenta (hue rule) …; hidden +6 ms, visible again +1563 ms → flash 1557 ms; …; PASS (finding: flash over 1 s)
run 3: call 1557 ms; … → magenta (hue rule) …; hidden +6 ms, visible again +1563 ms → flash 1556 ms; …; PASS (finding: flash over 1 s)
t5-screen1: SCREEN-1 PASS — flash per run 1588, 1557, 1556 ms; median 1557 ms (method: page-side visibilitychange timestamps on the human's tab)
```

## R9-SCREEN-3 — (a) PASS · (b) PASS
(a) `npx tsx recipes/t5.ts screen3 --hue`:
```
t5-screen3-a: T30: call +0 ms → +1590 ms ok; image 1920x903, bar probes (960,24) #d92424 (1440,24) #d92424 (1900,24) #d92424 → red (hue rule) …; own colour: yes; visible +10 ms → hidden +1593 ms
t5-screen3-b: T31: call +0 ms → +2863 ms ok; image …, bar probes … #8fff3d … → lime (hue rule) …; own colour: yes; visible +1612 ms → hidden +2866 ms
t5-screen3-c: T32: call +0 ms → +4039 ms ok; image …, bar probes … #3300f8 … → blue (hue rule) …; own colour: yes; visible +2885 ms → hidden +4043 ms
t5-screen3: target visible intervals overlap: none; human tab hidden 3 time(s); after — human T27 (chrome id 1108126715, active in its window, current)
t5-screen3: human tab changes after the calls: hidden +6 ms, visible +1596 ms, hidden +1608 ms, visible +2869 ms, hidden +2881 ms, visible +4046 ms; alternating hidden/visible ×3: yes; each target inside its own hidden span: yes
t5-screen3: SCREEN-3 (a) PASS — three captures all succeeded, each its own tab: yes, serialised: yes
```
(b) `open screen3-d --bar red` → T33, `open screen3-e --bar lime` → T34; D (`select T33`) and E (`select
T34`) → `Selected tab T33 (…)` / `Selected tab T34 (…)`; both `browser_screenshot {}` at once (sends
22:55:53.365 / .428; calls 22:55:56.193–57.802 and 22:55:57.331–59.300, overlapping) → `[image 48044
base64 chars]` / `[image 47772 base64 chars]`; `t5-png.ts --transcript <D> --hue` → `image 2: 1920x959,
bar probes (960,24) #d92424 (1440,24) #d92424 (1900,24) #d92424 → red (hue rule)`; E → `… #8fff3d … → lime
(hue rule)` (each stream holds its one image twice; both copies read the same).

## R9-SCREEN-4 — PASS
W4 on `…?t5=screen4`, `Hide-T5Window` → `True`. `npx tsx recipes/t5.ts r9-cdp --minimized`:
```
t5-r9-cdp: call 2026-10-22T22:56:22.581Z → 2026-10-22T22:56:22.584Z: screenshot T35 mode:"cdp" → WINDOW_MINIMIZED: Chrome's window is minimized, so CDP cannot capture the tab — restore the window, or call focusTab first in 3 ms
t5-r9-cdp: R9 SCREEN-4 cdp PASS — WINDOW_MINIMIZED with the exact message in < 1000 ms: yes (the window must still be minimized: Test-T5Minimized)
```
`Test-T5Minimized` → `True`.

## R9-SCREEN-5 — PASS
W5 (target T36 background, front T37 active) at `1920,0 960x1040`; Wh (human T38) at `2880,0 960x1040`
(rects not overlapping); both topmost. `Get-T5Foreground` before → `{"Hwnd":2821048,…}` (Wh).
```
t5-screen5: before — human T38 (…, active in its window, current) window 1108126764; front T37 (…, active in its window) window 1108126756; target T36 (…, background) window 1108126756; layout as required: yes
t5-screen5: call 1521 ms
t5-screen5: image 944x855, bar probes (472,24) #dd00fa (708,24) #dd00fa (924,24) #dd00fa → magenta (hue rule) …
t5-screen5: after — human T38 (…, active in its window, current); front T37 (…, active in its window); target T36 (…, background, owner "t5-screen5")
t5-screen5: SCREEN-5 (Chrome side) PASS — image is the target: yes; human's tab still current: yes; front restored: yes (the OS foreground window is judged by the driver)
```
`Get-T5Foreground` after → `{"Hwnd":2821048,…}`; W5 is 9440498.

## R9-RESTORE — PASS
Wr9 (`restore-target` T39 background, `restore-front` T40 active), covered by Wc on `…?t5=cover`
(maximized, topmost, same rect `1912,-8 1936x1096`); `mark restore-front yellow` → `visibilityState
hidden` (the window is covered). `npx tsx recipes/t5.ts r9-restore`:
```
t5-r9-restore: before — front T40 (chrome id 1108126779, active in its window); target T39 (chrome id 1108126775, background); layout as required: yes
t5-r9-restore: screenshot T39 → TIMEOUT: Timed out after 35000ms calling screenshot after 35119 ms
t5-r9-restore: target active from +507 ms; front active again +30026 ms; after — front T40 (chrome id 1108126779, active in its window); target T39 (chrome id 1108126775, background, owner "t5-r9-restore")
t5-r9-restore: R9 RESTORE PASS — previous tab back between 25 s and 35 s after the call (before the TIMEOUT): yes; front active and target background afterwards: yes
```
(Run 8 SCREEN-5's first attempt left the target active ≥ 49 s; T5b fix 1 works.)

## R9-LEASE-3 — PASS
W3 on `…?t5=lease3-home`; actor C (`browser_list_tabs,browser_select_tab`). `npx tsx recipes/t5.ts lease3 --race`:
```
t5-lease3: opened T43 for lease3 (active), leased to t5-lease3
t5-lease3: click e10 (synthetic) — ok
t5-lease3: other client: popup T44 seen 44 ms after the click; its snapshot → TAB_HELD: tab T44 is held by "t5-lease3" since 22:58:18 — use browser_new_tab, or browser_list_tabs to pick a free tab · data {"owner":"t5-lease3","since":1792709898582}; leaseGranted had already arrived: no
t5-lease3: after the synthetic click: leaseGranted {"tab":"T44","reason":"opener","url":"http://localhost:8080/e2e-playground.html?popup=1"} after 45 ms; popup tabs: T44 (chrome id 1108126800, active in its window, current, owner "t5-lease3") opener 1108126797
t5-lease3: LEASE-3 PASS (synthetic click) — event tab T44, reason opener, url the popup URL; listTabs owner of T44: "t5-lease3"
t5-lease3: holding the opener lease for 90000 ms — call browser_list_tabs now
t5-lease3: after the hold: T44 (chrome id 1108126800, active in its window, current, owner "t5-lease3")
```
C: `browser_list_tabs` → `[1 pre-existing line omitted]` / `T42  … ?t5=lease3-home` / `T43  [t5-lease3] …
?t5=lease3` / `T44* [t5-lease3] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?popup=1`;
`browser_select_tab {"tab":"T44"}` → (isError) `tab T44 is held by "t5-lease3" since 22:58:18 — use
browser_new_tab, or browser_list_tabs to pick a free tab`. The hold was seen **before** the event
(`leaseGranted had already arrived: no`): the ordering was exercised.

## R9-NET-1 — FAIL as written (an extra favicon line); the cache bypass and the size as expected
Wn on the plain URL (T45, topmost); actor S (`browser_select_tab,browser_network_clear,browser_network_requests`):
`browser_select_tab {"tab":"T45"}` → `Selected tab T45 (…)`; `browser_network_clear {}` → `Cleared 1
requests.`; `Set-T5Foreground` → `True`, `Get-T5Foreground` = Wn (3279800); SendKeys `^+r` at 23:00:34.607;
`browser_network_requests {}` →
```
Network — active tab: showing 2 of 2 (recording since 7m49s ago; 0 pending)
[5020]  5.8s ago   GET     200  document    4ms  12.8 KB  http://localhost:8080/e2e-playground.html
[5021]  5.7s ago   GET     404  image       3ms  460 B   http://localhost:8080/favicon.ico
Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.
```
`{"id":"5020"}` → `status: 200 OK   from cache: no   ip: 127.0.0.1   size: 12.8 KB`, `content-length:
13106`, `date: Thu, 22 Oct 2026 23:00:34 GMT`. Server log: `"GET /e2e-playground.html HTTP/1.1" 200 -` at
`[23/Oct/2026 03:00:34]` (local = 23:00:34Z). No banner (112 frames, band 106). **What failed:** the
pre-written header `showing 1 of 1` — the hard reload also re-requested `favicon.ico` (404), so the tab
recorded two requests. The document line is exactly as expected (`12.8 KB`), `from cache: no`, and the
server served it; judged as written: FAIL.

## R9-RESOLVER-1 — PASS
Wq on `…?t5=resolver` (T46); `chrome://extensions` in We (address bar, guarded); `Invoke-T5Uia We
'service worker' 'Chrome Agent Bridge'` → `invoked: ControlType.Hyperlink 'service worker,'`; Wd = hwnd
4197312 (`<DevTools window>`); `Find-T5Uia Wd 'sw.js','[bridge]'` → `'sw.js': 19 element(s)`, `'[bridge]':
54 element(s)`; We closed; `Set-T5Foreground Wq` → `True`, `Set-T5Foreground Wd` → `True`;
`Get-T5Foreground` before → `{"Hwnd":4197312,"Title":"<DevTools window>"}`. Actor R (`claude-code #33500`):
```
Daemon: connected on 127.0.0.1:9234 (build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, up 1754s)
Clients (1): claude-code #33500
Extension: connected
Active tab: [T46] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=resolver
```
`browser_snapshot {}` → `url: http://localhost:8080/e2e-playground.html?t5=resolver   title: "Agent Bridge
E2E Playground"`. `Get-T5Foreground` after → the same `{"Hwnd":4197312,…}`. Wd then closed.

## Close-down and log hygiene
- Every actor ended `exit code 0`; `t5.ts cleanup` closed every T5 tab and the driver closed its windows;
  only the pre-existing window remains. Server 12308 and daemon 26572 stopped after `Test-SafeToKill` →
  `safe: …`; no daemon or `mcp/dist` process left.
- `daemon.log` from `2026-10-22T22:52:50Z extension resync: 2 tabs, 0 gone` (the step-0 reload) to the
  end: 81 lines → `://` **0**, token **0**, `[line withheld:` **0**; attached as `T5-run9-daemon-log.txt`.
  Its only line that is not a client `+`/`-` is that resync line.

## Findings (no code changed)
1. The **T5b fixes hold live:** `cdp` refuses a background tab (`OFFSCREEN`) and a minimized window
   (`WINDOW_MINIMIZED`) in 3 ms with no banner; a hung capture restores the previous tab at +30.0 s;
   `leaseGranted.url` is the popup URL after 45 ms, and the popup is held for another client before the
   event arrives.
2. **The flash is still ~1.5 s** (median 1557 ms; Run 8 1493 ms): finding 3 of Run 8 stands.
3. **The pre-registered checks failed twice more on themselves:** (a) the hue rule's "low ≤ 100" names a
   colour-managed cyan (`#97fdfd`, R = 151) `other` (R9-SCREEN-2's positive control); (b) a hard reload
   also re-fetches the favicon, so NET-1's `showing 1 of 1` cannot hold under that bypass. Both rows'
   substance was met; both are recorded FAIL as written for the user's ruling.
4. The reload script ran clean in the live wave (exit 0, worker restart and resync verified).

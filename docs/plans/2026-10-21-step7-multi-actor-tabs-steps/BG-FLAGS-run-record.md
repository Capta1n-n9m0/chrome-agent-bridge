# BG-FLAGS — Run 10 record (background input with Chrome restarted under flags), 2026-10-23

Evidence for Run 10 in `docs/e2e-test-plan.md` §5. Each block below is the command and the text it
printed, copied from the driver's shell output. Times are UTC (2026-10-22 23:25–23:31Z; local date
2026-10-23). The rows, their expected text, the flag set and the restart/restore procedure were committed in
`00249de` (§4.16, the wave sheet's "BG-FLAGS (Run 10)") before Chrome was touched. The daemon log of the
run is [`BG-FLAGS-daemon-log.txt`](BG-FLAGS-daemon-log.txt) (66 lines; hygiene 0 / 0 / 0). No images
were taken. No product code changed.

**About the user's Chrome, counts only.** One browser window with one tab existed before the run and was
never named, captured, typed into or closed by the driver. (`Get-T5ChromeWindows`, which prints only
the wave's own titles, prints it as a fixture title: it is W1's old `127.0.0.1:8090/crlf.html` probe
copy of the fixture, seen in Runs 8 and 9. It is not counted as a driver window.)

Shell set-up for every block: the §1 item 8 helpers, `. .\recipes\t5-win.ps1`, nvm's node on `Path`,
`Count` = `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-count.ps1`, `T5` =
`npx tsx recipes/t5.ts`, `$U` = `http://localhost:8080/e2e-playground.html?t5=`.

## Pre-flight (step 0) — 23:25:49Z

```
HEAD 00249de
build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974
daemon: 0
9234 listen: 0
BRIDGE_TOKEN: False
ignored: bridge.token
driver mcp procs: 0
node v25.2.1
chrome 156.0.8078.48          (C:\Program Files\Google\Chrome\Application\chrome.exe)
2026-10-22T23:25:51.044Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: []
fixture server pid 22316       ($HOME\miniconda3\python.exe -I -m http.server 8080 --bind 127.0.0.1 --directory test-fixtures)
fixture 200 13106
```
**First count: N = 1 window, T = 1 tab, P = [1], no switches.** Before the pre-registration (23:12Z,
a read-only process query; the original's "created" time is local, UTC+4):
```
my pid 24280 in job: True
browser process pid 8044 created 10/22/2026 14:19:28 parent 26956 (gone) in job: True; flags: []
explorer pid 3220 in job: False
my job LimitFlags: 0x800  (0x2000 = KILL_ON_JOB_CLOSE, 0x800 = BREAKAWAY_OK, 0x1000 = SILENT_BREAKAWAY_OK)
```

Helper test (set-up): `chrome.exe --new-window about:blank`, then `Count`, `Count -CloseBlank -Expect 1`:
```
2026-10-22T23:26:05.100Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: []
2026-10-22T23:26:05.804Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: []
bgf-count: -CloseBlank: closed the blank window 4590528 (WM_CLOSE); gone: yes
2026-10-22T23:26:06.122Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: []
```
The blank window is recognised; no set-up fix was needed.

## Check before (step 1) — W0 on `…?t5=check` (hwnd 5049582)
```
2026-10-22T23:26:20.674Z t5-check: connected as client c1 — daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, proto 2, extension connected
2026-10-22T23:26:20.679Z t5-check: listTabs — 2 tab(s); human's tab (current): T2 (fixture page)
2026-10-22T23:26:20.680Z t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
2026-10-22T23:26:20.689Z t5-check: snapshot T2 — elements: yes (29); text field: absent
2026-10-22T23:26:20.692Z t5-check: focusTab T2 — ok
2026-10-22T23:26:20.693Z t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
```
Daemon pid 15000 spawned by the check. `k` = 2 = T + 1: **restart 1's precondition (§4.16 step 0) met**.

## BGF-0 — baseline, no flags — FAIL / FAIL (as Run 8)
Wb on `…?t5=bg-human` (hwnd 1903300, topmost). Validity: `browser switches: []`.
```
2026-10-22T23:26:47.801Z bgf-count: chrome.exe processes 11; browser processes 1; browser windows 3 (minimized 0); tabs 3 (per window, sorted: 1,1,1); blank windows 0; browser switches: []
T3 fixture
2026-10-22T23:26:50.008Z t5-bg1: human T3; target T4 (background, leased to t5-bg1); target visibilityState hidden
2026-10-22T23:26:50.024Z t5-bg1: click e7 trusted → ok (5 ms)
2026-10-22T23:26:50.036Z t5-bg1: target status "status: idle"; field value ""; target visibilityState hidden
2026-10-22T23:26:50.036Z t5-bg1: human tab hidden during the call: no; after — human T3 (chrome id 1108126838, active in its window, current); target T4 (chrome id 1108126842, background, owner "t5-bg1")
2026-10-22T23:26:50.036Z t5-bg1: BG-1 FAIL — expected "status: TRUSTED click received"; background throughout: yes; human's tab unchanged: yes
2026-10-22T23:26:50.036Z t5-bg1: BG-1 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
2026-10-22T23:26:50.074Z t5-bg1: informational, not the T5.2 retry — after focusTab T4: action → ok; status "status: TRUSTED click received"; value ""
2026-10-22T23:26:51.169Z t5-cleanup: closed T2 (check)
2026-10-22T23:26:51.194Z t5-cleanup: closed T4 (bg1)
T3 fixture
2026-10-22T23:26:53.395Z t5-bg2: human T3; target T5 (background, leased to t5-bg2); target visibilityState hidden
2026-10-22T23:26:53.415Z t5-bg2: type e11 "bg2typed" trusted → ok (9 ms)
2026-10-22T23:26:53.426Z t5-bg2: target status "status: idle"; field value ""; target visibilityState hidden
2026-10-22T23:26:53.426Z t5-bg2: human tab hidden during the call: no; after — human T3 (chrome id 1108126838, active in its window, current); target T5 (chrome id 1108126847, background, owner "t5-bg2")
2026-10-22T23:26:53.426Z t5-bg2: BG-2 FAIL — expected "status: TRUSTED input = bg2typed"; background throughout: yes; human's tab unchanged: yes
2026-10-22T23:26:53.426Z t5-bg2: BG-2 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
2026-10-22T23:26:53.481Z t5-bg2: informational, not the T5.2 retry — after focusTab T5: action → ok; status "status: TRUSTED input = bg2typed"; value "bg2typed"
2026-10-22T23:26:54.571Z t5-cleanup: closed T5 (bg2)
2026-10-22T23:26:55.671Z t5-cleanup: closed T3 (bg-human)
```
(`cleanup --keep bg-human` also closed W0's check tab, so W0 closed with it; the last `cleanup` closed Wb.)

## Restart 1 — with the flag set — Restore PASS

Step 1, all driver windows closed:
```
2026-10-22T23:27:05.618Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: []
```
= N, T, P, blank 0. Step 2, `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-quit.ps1`:
```
2026-10-22T23:27:13.829Z bgf-quit: own window 4721612 opened
2026-10-22T23:27:14.273Z bgf-quit: sent Enter on chrome://quit in my own window
2026-10-22T23:27:14.795Z bgf-quit: QUIT OK - no chrome.exe process remains, 0.5 s after the Enter
exit 0
chrome.exe now: 0
```
Step 3, `bgf-launch.ps1 -Exe 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgLine '--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling'`:
```
bgf-launch: started pid 22700 (parent 18144, this script, which now exits); in job: False; user default environment; args: --restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling
exit 0
```
Step 4, the 2 s poll (stable at the second count), then `Count -CloseBlank -Expect 1`:
```
2026-10-22T23:27:27.136Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
2026-10-22T23:27:29.843Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
2026-10-22T23:27:37.447Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
bgf-count: -CloseBlank: closed the blank window 17567016 (WM_CLOSE); gone: yes
2026-10-22T23:27:37.752Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
```
N + 1 windows with blank 1 (the quit window came back, as expected), closed → **1 window, 1 tab, [1],
blank 0, the flags present: Restore PASS.** Step 5, W0 on `…?t5=check` (hwnd 396552):
```
2026-10-22T23:27:49.691Z t5-check: connected as client c9 — daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, proto 2, extension connected
2026-10-22T23:27:49.694Z t5-check: listTabs — 2 tab(s); human's tab (current): T9 (fixture page)
2026-10-22T23:27:49.694Z t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
2026-10-22T23:27:49.704Z t5-check: snapshot T9 — elements: yes (29); text field: absent
2026-10-22T23:27:49.707Z t5-check: focusTab T9 — ok
2026-10-22T23:27:49.707Z t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
```
`k` = 2 = the pre-flight `k`. The extension reconnected by itself (`daemon.log`
`2026-10-22T23:27:25Z extension resync: 2 tabs, 0 gone`); no reload was needed.

## BGF-1, BGF-2, BGF-4 — under the flags
Wb on `…?t5=bg-human` (hwnd 7867284, topmost). Validity: each `Count` before a row prints the three flags.
```
2026-10-22T23:28:06.791Z bgf-count: chrome.exe processes 11; browser processes 1; browser windows 3 (minimized 0); tabs 3 (per window, sorted: 1,1,1); blank windows 0; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
T10 fixture
```
**BGF-1 — FAIL** (as written; the flags do not change it):
```
2026-10-22T23:28:08.976Z t5-bg1: human T10; target T11 (background, leased to t5-bg1); target visibilityState hidden
2026-10-22T23:28:09.024Z t5-bg1: click e7 trusted → ok (15 ms)
2026-10-22T23:28:09.052Z t5-bg1: target status "status: idle"; field value ""; target visibilityState hidden
2026-10-22T23:28:09.053Z t5-bg1: human tab hidden during the call: no; after — human T10 (chrome id 1108127020, active in its window, current); target T11 (chrome id 1108127024, background, owner "t5-bg1")
2026-10-22T23:28:09.053Z t5-bg1: BG-1 FAIL — expected "status: TRUSTED click received"; background throughout: yes; human's tab unchanged: yes
2026-10-22T23:28:09.053Z t5-bg1: BG-1 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
2026-10-22T23:28:09.107Z t5-bg1: informational, not the T5.2 retry — after focusTab T11: action → ok; status "status: TRUSTED click received"; value ""
2026-10-22T23:28:10.218Z t5-cleanup: closed T9 (check)
2026-10-22T23:28:10.245Z t5-cleanup: closed T11 (bg1)
2026-10-22T23:28:10.996Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 0; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
T10 fixture
```
**BGF-2 — FAIL** (as written):
```
2026-10-22T23:28:13.177Z t5-bg2: human T10; target T12 (background, leased to t5-bg2); target visibilityState hidden
2026-10-22T23:28:13.200Z t5-bg2: type e11 "bg2typed" trusted → ok (12 ms)
2026-10-22T23:28:13.213Z t5-bg2: target status "status: idle"; field value ""; target visibilityState hidden
2026-10-22T23:28:13.213Z t5-bg2: human tab hidden during the call: no; after — human T10 (chrome id 1108127020, active in its window, current); target T12 (chrome id 1108127029, background, owner "t5-bg2")
2026-10-22T23:28:13.213Z t5-bg2: BG-2 FAIL — expected "status: TRUSTED input = bg2typed"; background throughout: yes; human's tab unchanged: yes
2026-10-22T23:28:13.213Z t5-bg2: BG-2 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
2026-10-22T23:28:13.280Z t5-bg2: informational, not the T5.2 retry — after focusTab T12: action → ok; status "status: TRUSTED input = bg2typed"; value "bg2typed"
2026-10-22T23:28:14.369Z t5-cleanup: closed T12 (bg2)
2026-10-22T23:28:15.103Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 0; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
T10 fixture
```
**BGF-4 — PASS** (control):
```
2026-10-22T23:28:17.271Z t5-bg4: human T10; target T13 (background, visibilityState hidden); the text is added 2000 ms after the arm
2026-10-22T23:28:19.336Z t5-bg4: waitFor {text} → ok after 2065 ms
2026-10-22T23:28:19.884Z t5-bg4: fetch /ok.json → 200; waitFor {networkIdle} → ok after 543 ms
2026-10-22T23:28:19.886Z t5-bg4: BG-4 PASS — text after 2065 ms, network idle after 543 ms; target still background: yes
2026-10-22T23:28:20.955Z t5-cleanup: closed T13 (bg4)
```
(Run 8, no flags: 3746 ms / 552 ms.)

## BGF-3 — PASS (control, under the flags)
```
2026-10-22T23:28:29.118Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 0; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
2026-10-22T23:28:30.230Z t5-open: opened T14 for bg3 (background)
bg3: T14 (chrome id 1108127037, background), window 1108127019
2026-10-22T23:28:33.099Z actor F: started — host pid 17292, claude pid 27188, model sonnet, tools mcp__chrome-agent-bridge__browser_select_tab mcp__chrome-agent-bridge__browser_evaluate mcp__chrome-agent-bridge__browser_focus_tab; files in C:\Users\<you>\AppData\Local\Temp\bridge-e2e\actors\F
```
(The Windows user name in the actor's path is written `<you>`.) Actor F (session
`297f9fb0-016d-4c57-8cc9-36e8bec01a05`), one prompt per call; the `TOOL` and `OUTPUT`
lines of `t5-actor.ts send` (the echoed `SENT` line lost its quotes to PowerShell's argument passing;
the `TOOL` lines show the exact arguments):
```
2026-10-22T23:28:47.880Z TOOL ToolSearch {"query":"select:mcp__chrome-agent-bridge__browser_select_tab","max_results":1}
2026-10-22T23:28:49.026Z TOOL mcp__chrome-agent-bridge__browser_select_tab {"tab":"T14"}
2026-10-22T23:28:49.039Z OUTPUT:
    Selected tab T14 (now this session's tab; not brought on screen — browser_focus_tab shows it)
2026-10-22T23:28:55.966Z TOOL mcp__chrome-agent-bridge__browser_evaluate {"expression":"navigator.clipboard.writeText('t5-bg3').then(() => 'ok')"}
2026-10-22T23:28:55.985Z OUTPUT (isError):
    [chrome.debugger] NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.
        at <anonymous>:1:21
2026-10-22T23:29:02.367Z TOOL mcp__chrome-agent-bridge__browser_focus_tab {}
2026-10-22T23:29:02.388Z OUTPUT:
    Focused tab T14
2026-10-22T23:29:08.780Z TOOL mcp__chrome-agent-bridge__browser_evaluate {"expression":"navigator.clipboard.writeText('t5-bg3').then(() => 'ok')"}
2026-10-22T23:29:08.797Z OUTPUT:
    ok
```
(The `ToolSearch` call loads a tool schema only; it is not a bridge call. In `daemon.log` the actor's
client is `claude-code #3200`.) The user's clipboard holds
`t5-bg3`. Then:
```
2026-10-22T23:29:23.073Z actor F ended after 506 ms: 2026-10-22T23:29:22.978Z exit code 0
2026-10-22T23:29:28.131Z t5-cleanup: closed T10 (bg-human)
2026-10-22T23:29:28.171Z t5-cleanup: closed T14 (bg3)
2026-10-22T23:29:29.908Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: [--restore-last-session --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-background-timer-throttling]
```
`t5-actor.ts status`, F's line (the other lines are earlier runs' actors, all `ended … exit code 0`):
```
F: {"host":17292,"claude":27188,"model":"sonnet","tools":["mcp__chrome-agent-bridge__browser_select_tab","mcp__chrome-agent-bridge__browser_evaluate","mcp__chrome-agent-bridge__browser_focus_tab"],"started":"2026-10-22T23:28:32.945Z"} · ended (2026-10-22T23:29:22.978Z exit code 0)
```

## Restart 2 — without the flags — Restore PASS
Step 1 is the last count above (= N, T, P, blank 0). Steps 2–4:
```
2026-10-22T23:29:41.082Z bgf-quit: own window 789762 opened
2026-10-22T23:29:41.518Z bgf-quit: sent Enter on chrome://quit in my own window
2026-10-22T23:29:42.037Z bgf-quit: QUIT OK - no chrome.exe process remains, 0.5 s after the Enter
exit 0
chrome.exe now: 0
bgf-launch: started pid 31092 (parent 34688, this script, which now exits); in job: False; user default environment; args: --restore-last-session
exit 0
2026-10-22T23:29:45.310Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: [--restore-last-session]
2026-10-22T23:29:48.062Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: [--restore-last-session]
2026-10-22T23:29:56.607Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 1; browser switches: [--restore-last-session]
bgf-count: -CloseBlank: closed the blank window 13044732 (WM_CLOSE); gone: yes
2026-10-22T23:29:56.918Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: [--restore-last-session]
```
**1 window, 1 tab, [1], blank 0, only `--restore-last-session`: Restore PASS.** Step 5, W0 (hwnd 1183004):
```
2026-10-22T23:30:00.430Z t5-check: connected as client c23 — daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, proto 2, extension connected
2026-10-22T23:30:00.434Z t5-check: listTabs — 2 tab(s); human's tab (current): T18 (fixture page)
2026-10-22T23:30:00.434Z t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
2026-10-22T23:30:00.445Z t5-check: snapshot T18 — elements: yes (29); text field: absent
2026-10-22T23:30:00.448Z t5-check: focusTab T18 — ok
2026-10-22T23:30:00.448Z t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
```

## BGF-5 — after restart 2, no flags — FAIL / FAIL
Wb (hwnd 1248300, topmost). Validity: `browser switches: [--restore-last-session]`.
```
2026-10-22T23:30:03.577Z bgf-count: chrome.exe processes 11; browser processes 1; browser windows 3 (minimized 0); tabs 3 (per window, sorted: 1,1,1); blank windows 0; browser switches: [--restore-last-session]
T19 fixture
2026-10-22T23:30:05.769Z t5-bg1: human T19; target T20 (background, leased to t5-bg1); target visibilityState hidden
2026-10-22T23:30:05.803Z t5-bg1: click e7 trusted → ok (13 ms)
2026-10-22T23:30:05.839Z t5-bg1: target status "status: idle"; field value ""; target visibilityState hidden
2026-10-22T23:30:05.839Z t5-bg1: human tab hidden during the call: no; after — human T19 (chrome id 1108127208, active in its window, current); target T20 (chrome id 1108127212, background, owner "t5-bg1")
2026-10-22T23:30:05.839Z t5-bg1: BG-1 FAIL — expected "status: TRUSTED click received"; background throughout: yes; human's tab unchanged: yes
2026-10-22T23:30:05.839Z t5-bg1: BG-1 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
2026-10-22T23:30:05.887Z t5-bg1: informational, not the T5.2 retry — after focusTab T20: action → ok; status "status: TRUSTED click received"; value ""
2026-10-22T23:30:06.992Z t5-cleanup: closed T18 (check)
2026-10-22T23:30:07.014Z t5-cleanup: closed T20 (bg1)
T19 fixture
2026-10-22T23:30:09.218Z t5-bg2: human T19; target T21 (background, leased to t5-bg2); target visibilityState hidden
2026-10-22T23:30:09.243Z t5-bg2: type e11 "bg2typed" trusted → ok (12 ms)
2026-10-22T23:30:09.256Z t5-bg2: target status "status: idle"; field value ""; target visibilityState hidden
2026-10-22T23:30:09.256Z t5-bg2: human tab hidden during the call: no; after — human T19 (chrome id 1108127208, active in its window, current); target T21 (chrome id 1108127217, background, owner "t5-bg2")
2026-10-22T23:30:09.256Z t5-bg2: BG-2 FAIL — expected "status: TRUSTED input = bg2typed"; background throughout: yes; human's tab unchanged: yes
2026-10-22T23:30:09.256Z t5-bg2: BG-2 focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)
2026-10-22T23:30:09.324Z t5-bg2: informational, not the T5.2 retry — after focusTab T21: action → ok; status "status: TRUSTED input = bg2typed"; value "bg2typed"
2026-10-22T23:30:10.424Z t5-cleanup: closed T21 (bg2)
2026-10-22T23:30:11.529Z t5-cleanup: closed T19 (bg-human)
2026-10-22T23:30:13.257Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: [--restore-last-session]
```

## Close-down (step 7) — 23:30:30Z
```
15000 safe: the tree of 15000 does not contain the driver
stopped 15000                       (the daemon)
22316 safe: the tree of 22316 does not contain the driver
stopped 22316                       (the fixture server)
daemon now: 0; 9234: 0; 8080: 0
start line 464 of 529               (daemon.log: from "start pid=15000")
lines 66; '://' 0; token 0; withheld 0
2026-10-22T23:30:33.082Z bgf-count: chrome.exe processes 9; browser processes 1; browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: [--restore-last-session]
```
Browser process at the end: pid 31092, started 23:29:42Z, parent gone (the launcher), **not in a job**,
switches `[--restore-last-session]`. The token was compared in memory and never printed.

## Result (the §4.16 reading rule)

| Row | Verdict |
|---|---|
| BGF-0 (baseline, no flags) | BG-1 FAIL, BG-2 FAIL (`ok` in 5 / 9 ms, `status: idle`) |
| BGF-1 ★ (flags) | **FAIL** (`ok` in 15 ms, `status: idle`, target `hidden`) |
| BGF-2 ★ (flags) | **FAIL** (`ok` in 12 ms, `status: idle`, field `""`) |
| BGF-3 (flags, control) | PASS (`NotAllowedError … Document is not focused` → `Focused tab T14` → `ok`) |
| BGF-4 (flags, control) | PASS (text after 2065 ms, network idle after 543 ms) |
| BGF-5 (after, no flags) | BG-1 FAIL, BG-2 FAIL (`ok` in 13 / 12 ms) |

BGF-1/BGF-2 FAIL ⇒ **"the flags alone do not change the outcome"**: with renderer backgrounding,
occluded-window backgrounding and background timer throttling all disabled, trusted input into a
background tab is still answered `ok` and the page receives nothing; after `focusTab` it works, as
before. Background throttling is not the cause on its own; focus emulation stays Step 8's question
(#62 (4)). One trial per condition.

Facts beside the verdicts (not judged): the background target still reads `visibilityState hidden`
under the flags; BG-4's delayed text arrived after 2065 ms under the flags, against 3746 ms in Run 8
(consistent with the timer clamp being off; one trial each); `chrome://quit` took 0.5 s both times and the quit window came back in each
restore, as pre-registered; the extension reconnected on its own both times (`daemon.log`
`23:27:25Z` and `23:29:43Z extension resync: 2 tabs, 0 gone`).

Chrome's final state: as at the start — 1 window, 1 tab, the same per-window list, no flags; the two
pre-stated harmless differences (`--restore-last-session` on the command line; not in a job object).

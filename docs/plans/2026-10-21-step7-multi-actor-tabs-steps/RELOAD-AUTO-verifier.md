# RELOAD-AUTO — independent verifier

Written 2026-10-23 (run times below are UTC, 2026-10-22T22:4x) by the independent verifier (Claude Opus 5.5).
Authority: decisions.md · 2026-10-23 · The driver may reload the extension by UI automation … (#64).
Deliverables audited: `recipes/reload-extension.ps1` (new, untracked), `docs/e2e-test-plan.md` §1
item 9, `docs/setup.md` §4 paragraph (working-tree diff against HEAD b4ea752).

## Verdict: PASS-with-notes

The script pressed only the Chrome Agent Bridge card's reload button, in its own window, and closed
that window. The stale-extension check and the T5b probe pass after the reload. Every doubt path I
tried pressed nothing and exited 2. Findings: 0 CRITICAL, 0 MAJOR, 4 MINOR, 2 NIT. There is also one
deviation of my own (the extension was reloaded **twice** instead of once, see "Verifier deviation").

## Checks

### 1. Pre-state

```
> (Get-FileHash .\daemon\dist\index.js -Algorithm SHA256).Hash.ToLower()
490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974
> Get-ChildItem .\extension\dist  (name, LastWriteTimeUtc)
content.js 2026-10-22T21:44:20.9875714Z
offscreen.js 2026-10-22T21:44:20.9785510Z
options.js 2026-10-22T21:44:20.9785510Z
sw.js 2026-10-22T21:44:20.9790744Z
daemon pid 26572          (node …daemon\dist\index.js, already running)
python pid 9924           (fixture server, the step agent's; left alone)
> Get-T5ChromeWindows
   Hwnd Title                                       Minimized Rect
4787250 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
 658614 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
```

### 2. ID derivation, done independently

I wrote my own Node script (`crypto.createHash("sha256")` over `Buffer.from(path, "utf16le")`, first
16 bytes, each nibble mapped to `a`+n). It shares no code with `Get-UnpackedId`:

```
> node extid.cjs
C:\Users\aliev\Projects\chrome-remote-extention\extension cpnemjbgecfbeicldpaaegbhjgjgjfep
```

This equals the script's ID and the doc's. Chrome's own page shows the same ID: the script prints
`card found: ID cpnem…` only when exactly one text element of the card ends in that ID (lines
114–119). With `-ExtensionId aaaa…` the same page reports `with ID aaaa…: 0` (check 5).

### 3. Dry run

```
> powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1 -DryRun
2026-10-22T22:42:05.775Z reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
2026-10-22T22:42:05.932Z reload-extension: daemon running: yes (pid 26572)
2026-10-22T22:42:06.363Z reload-extension: own window 1969074 opened
2026-10-22T22:42:07.521Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-22T22:42:07.523Z reload-extension: dry run - nothing pressed
2026-10-22T22:42:07.734Z reload-extension: own window 1969074 closed
exit 0
```
Nothing was pressed: no `extension resync` line appeared in daemon.log. But the exit code is 0, not 2
(finding 2).

### 4. The real reload (pre-registered pass rule: exit 0, `RELOAD OK`, a new daemon.log resync line timestamped at or after the press, `own window <h> closed`)

These two runs were meant as negative checks. My wrapper dropped their parameters, so both ran as
plain real reloads (see "Verifier deviation"). Both meet the pass rule:

```
2026-10-22T22:42:16.835Z reload-extension: own window 5442452 opened
2026-10-22T22:42:18.012Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-22T22:42:18.019Z reload-extension: pressed the reload button of the card
2026-10-22T22:42:21.600Z reload-extension: UIA: the card's service worker restart seen: yes; inspect views now: service worker, |  1 more…
2026-10-22T22:42:21.916Z reload-extension: daemon.log: new line '2026-10-22T22:42:18Z extension resync: 3 tabs, 0 gone'
2026-10-22T22:42:21.921Z reload-extension: RELOAD OK - the extension reconnected to the daemon after the press at 22:42:18.014Z; now run the stale-extension check
2026-10-22T22:42:22.127Z reload-extension: own window 5442452 closed
exit 0
======
2026-10-22T22:42:23.563Z reload-extension: own window 2231534 opened
2026-10-22T22:42:24.737Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-22T22:42:24.746Z reload-extension: pressed the reload button of the card
2026-10-22T22:42:28.375Z reload-extension: UIA: the card's service worker restart seen: yes; inspect views now: service worker, |  1 more…
2026-10-22T22:42:28.702Z reload-extension: daemon.log: new line '2026-10-22T22:42:24Z extension resync: 3 tabs, 0 gone'
2026-10-22T22:42:28.704Z reload-extension: RELOAD OK - the extension reconnected to the daemon after the press at 22:42:24.739Z; now run the stale-extension check
2026-10-22T22:42:28.922Z reload-extension: own window 2231534 closed
exit 0
```
(Each run's first two lines, the ID and `daemon running: yes (pid 26572)`, are the same as in check 3
and are left out here.) daemon.log afterwards gained exactly these two lines and nothing else:
```
2026-10-22T22:42:18Z extension resync: 3 tabs, 0 gone
2026-10-22T22:42:24Z extension resync: 3 tabs, 0 gone
```
Each resync line falls in the same whole second as its press, which matches the doc's "appeared in the
same second as the press". Both runs: **PASS**.

### 5. Proof that the new build is loaded (own fixture window, foreground)

```
own window: 2362606 Agent Bridge E2E Playground - Google Chrome
foreground: True
--- npx tsx recipes/t5.ts check
2026-10-22T22:43:02.468Z t5-check: connected as client c6 — daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, proto 2, extension connected
2026-10-22T22:43:02.472Z t5-check: listTabs — 3 tab(s); human's tab (current): T14 (fixture page)
2026-10-22T22:43:02.472Z t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
2026-10-22T22:43:02.481Z t5-check: snapshot T14 — elements: yes (29); text field: absent
2026-10-22T22:43:02.485Z t5-check: focusTab T14 — ok
2026-10-22T22:43:02.485Z t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
exit 0
foreground: True
--- npx tsx …scratchpad\t5b-probe.mts   (read first: one background newTab, screenshot cdp, closeTab)
2026-10-22T22:43:03.907Z reload-probe: newTab T15 (background)
2026-10-22T22:43:05.426Z reload-probe: screenshot T15 mode:"cdp" → OFFSCREEN: The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first in 3 ms
2026-10-22T22:43:05.426Z reload-probe: PROBE PASS — the extension refuses cdp on a background tab (T5b build)
2026-10-22T22:43:05.434Z reload-probe: closeTab T15 — ok
exit 0
Close-T5Window 2362606
--- Get-T5ChromeWindows after
   Hwnd Title                                       Minimized Rect
4787250 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
 658614 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
```
`CHECK PASS` printed and no `CHECK FAIL`. `PROBE PASS` printed (OFFSCREEN in 3 ms, under 1000 ms). No
window of mine is left, and the two other windows are untouched (same handles and rects as before).
**PASS.** This shows the extension still runs the T5b build after the reload. It cannot tell a reload
from no reload, because the dist files did not change; the resync lines in check 4 are what show the
reload happened.

### 6. Negative checks (direct invocation, `-DryRun` added as a safeguard)

```
--- wrong -ExtensionId
… extension Chrome Agent Bridge, ID aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
… own window 4262846 opened
2026-10-22T22:43:39.636Z reload-extension: cards named 'Chrome Agent Bridge': 1; with ID aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: 0 (need exactly 1) - nothing pressed
… own window 4262846 closed
exit 2
--- wrong -Name 'Chrome Agent BridgeX'
2026-10-22T22:43:56.807Z reload-extension: cards named 'Chrome Agent BridgeX': 0; with ID cpnemjbgecfbeicldpaaegbhjgjgjfep: 0 (need exactly 1) - nothing pressed
… own window 2755532 closed
exit 2
--- wrong -ExtensionDir .\shared
2026-10-22T22:43:57.508Z reload-extension: no manifest.json in C:\Users\aliev\Projects\chrome-remote-extention\shared - nothing pressed
exit 2
--- new daemon.log lines since start:
(none)
```
**PASS.** All three exit 2 and print "nothing pressed", with no resync line and no window left behind.
The failure exits from the card wait take about 16 s each (`TimeoutSec` 15).

### 7. Post-state

```
daemon\dist\index.js sha256 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974   (unchanged)
extension\dist mtimes unchanged (same four values as in check 1)
daemon pid 26572 still running (not killed; left to idle out)
git status: the deliverables plus this file; nothing committed
```

### 8. Code audit (recipes/reload-extension.ps1, 237 lines, read in full)

- **What it can invoke:** the only `Invoke()` is at line 199, on `$btn`. To get there, `$btn` must be
  the single Button with AutomationId `dev-reload-button` inside the span of the single card whose
  `name` text equals `$Name` and that holds exactly one element ending in the ID (lines 113–123). Its
  raw-view parent must be `itemsList` (line 190), it must have an Invoke pattern (line 192), and the
  page must be `chrome://extensions/` (line 182). The other UIA writes are `SetFocus` and `SetValue`
  on the address bar of `$H` (lines 162–163). Nothing else is invoked, toggled or written. Note: card
  membership comes from the order of the flattened tree, since `itemsList` is the parent of every
  card's elements. This was measured, not guaranteed, but the name+ID+single-button conjunction makes
  a wrong pick fail closed.
- **Keys:** Enter (line 170) is sent only after `GetForegroundWindow() == $H` and the focused element
  is the address bar (lines 165–169). The ALT tap at line 160 is sent **before** `SetForegroundWindow`,
  so it goes to whichever window is in the foreground (finding 1).
- **Other windows:** `Get-ChromeWindows` reads titles only to test them for emptiness and never prints
  them (line 80). The script prints no title or URL; the only card text it prints is the "Inspect
  views" link names of its own card. Closing goes only to `$H` (line 231), but `$H` is identified only
  by diffing the window list (finding 3).
- **Doubt paths:** every `return` before line 199 sets `$script:exit = 2` and prints "nothing
  pressed". The top-level `Quit 2` calls (lines 131, 136, 137, 148) come before any window is opened.
  `exit $script:exit` (line 237) runs after `finally`. An exception under `$ErrorActionPreference =
  'Stop'` still runs `finally` (the close) and ends `-File` with exit 1 (I reasoned this out; I did
  not measure it). One exception: `-DryRun` exits 0 (finding 2).
- **Token:** never read. `daemon.log` is read only for resync lines, and the daemon already withholds
  lines that contain the token or `://`.
- **Doc vs code:** item 9 and the setup.md paragraph match the code and the measurements: the ID, the
  AutomationIds, ~1 s to the card, the resync in the same second, the window closed. The two
  mismatches are findings 2 and 4.

## Findings

1. **MINOR** — `recipes/reload-extension.ps1:160`: the ALT down/up from `keybd_event` is sent before
   `SetForegroundWindow`, so it goes to whatever window is in the foreground at that moment. That can be
   a window of the user's (in Chrome a lone Alt focuses the app menu; in other apps it activates the
   menu bar). The effect is harmless and nothing is typed, but it contradicts the header's "never
   touches another window" (line 24) and the doc's "only while that window is in the foreground". In
   practice `chrome.exe --new-window` usually brings the new window to the front first. Same pattern
   in `recipes/t5-win.ps1` `Set-T5Foreground` (not this stage's). Fix: send the tap only if
   `GetForegroundWindow()` is not already `$H`, and say in the doc that the tap goes to the
   current foreground window.
2. **MINOR** — `recipes/reload-extension.ps1:195` against lines 27–28 and e2e-test-plan item 9's
   `$LASTEXITCODE` line: `-DryRun` returns with `$script:exit` still 0, so a dry run exits 0, the code
   documented as "reloaded and verified" (measured, check 3). A driver that branches on the exit code
   would mistake a dry run for a reload. Fix: exit 2 on a dry run, or document a separate code.
3. **MINOR** — `recipes/reload-extension.ps1:144–149, 154–163, 231`: "my window" is just the first
   visible titled `Chrome_WidgetWin_1` window that was not in the list before (the poll stops at the
   first ≥ 1). Before setting the address bar and posting WM_CLOSE, nothing checks that the window is
   the `about:blank` one it opened. If the user (or Chrome's session restore, or a Chrome popup with a
   title) opens a window during that ~0.3–15 s, it would be taken as "mine": its address bar would be
   set and, on every path including exit 2, it would be closed. The Enter is still guarded, but the
   close is not. Fix: before line 162, read the address bar's value and the title (`about:blank`) and
   exit 2 **without closing** if they differ.
4. **MINOR** — `recipes/reload-extension.ps1:141, 220–221`: any `extension resync` line written after
   the line count at line 141 is accepted, including one written **before** the press (the window
   opening and the card wait take 1–2 s). An unrelated reconnect in that interval would make the
   check pass even if the reload did nothing. The doc (item 9) says "after the press". Fix: parse the
   line's timestamp and require it to be ≥ the press time truncated to whole seconds. In this run
   both lines were in the press's second (check 4).
5. **NIT** — `recipes/reload-extension.ps1:165–170`: there is a check-then-act gap of a few ms
   between the foreground/focus check and the Enter.
6. **NIT** — `recipes/reload-extension.ps1:234`: exit 4 replaces only exit 0. If a run ends with 2 or 3
   and its window stays open, the exit code does not say so; only the message line does. Acceptable,
   but the doc's "4 own window left open" reads as unconditional.

## Verifier deviation (mine, not the deliverable's)

The brief allowed one real reload, and I pressed the reload button **twice** (22:42:18Z and
22:42:24Z). I meant to run the wrong-ID and wrong-name negatives through a wrapper (`vrun.ps1 -Extra
'-ExtensionId','aaaa…'` via `powershell -File`). Windows PowerShell's `-File` did not pass the array
on, so the script ran with its defaults and did real, verified reloads. Both presses went to the
correct button through the script, as #64 permits. Nothing else was pressed and no other window was
touched. Side effect: an extension reload empties `storage.session`, so the network log was cleared
twice instead of once. I then re-ran the negatives directly with `-DryRun` added as a safeguard
(check 6). This shows the procedure is safe to repeat. It also shows that a wrapper that forwards
parameters through `powershell -File` can silently drop them, so a driver should call the script
directly.

Evidence files (scratchpad, not committed):
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad\v-dry.txt`,
`…\v-badid.txt`, `…\v-badname.txt` (the two real reloads), `…\v-proof.txt`, `…\v-neg.txt`.

## Fix round 1 re-check

Re-checked 2026-10-23 (run times UTC 2026-10-22T22:48–22:49), only the items fix round 1 touched.
`recipes/reload-extension.ps1` is now 260 lines; I re-read all of it.

### Verdict after fix round 1: PASS-with-notes

Findings 1–4 are fixed. One NIT is left over from finding 3 (R1 below). I accept that NITs 5 and 6 stay
as they are: the check-then-act gap is a few ms, and the exit-4 message line is printed in every case.

### Code review of the fixes

- **m1 (finding 1), fixed.** Lines 173–178: the ALT tap and `SetForegroundWindow` run only when
  `GetForegroundWindow()` is not already `$H`, and the comment says where the tap lands. Both live
  runs below went through without needing the tap (Chrome had already brought the window to the front).
- **m2 (finding 2), fixed.** Line 212 sets `$script:exit = 5` before `return`. The header (lines 28–32)
  and item 9's `$LASTEXITCODE` line both list `5 dry run found the button`. Measured below: exit 5.
- **m3 (finding 3), fixed.** Lines 167–172 poll the address bar's value for up to 5 s and require
  `about:blank` before any focus, ALT, typing or key. If it is anything else, `$script:own = $false`,
  and the `finally` (lines 252–258) posts no WM_CLOSE. I reviewed this path in the code only: it cannot
  be triggered safely on the live profile. Item 9 says the window is not closed in that case.
  **R1 (NIT), left over:** line 164 (no address bar found) returns with `$script:own` still `$true`,
  so a new window that has no `OmniboxViewViews`, and so was never shown to be `about:blank`, is still
  sent WM_CLOSE. Nothing is typed into it. A window the user opened would almost always have an
  address bar, which is why this is a NIT. Fix if wanted: set `$script:own = $false` on that path too.
- **m4 (finding 4), fixed.** Line 216 truncates the press time to the whole UTC second. Lines 240–242
  parse each new line's `…Z` stamp with `InvariantCulture` + `AdjustToUniversal` and keep only lines
  `-ge` that second. Both sides are UTC `DateTime`s, so the comparison is valid. Measured below: the
  line taken is stamped `22:48:50Z` for a press at `22:48:50.743Z`.

### Dry run (direct call)

```
> powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1 -DryRun
2026-10-22T22:48:31.990Z reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
2026-10-22T22:48:32.158Z reload-extension: daemon running: yes (pid 26572)
2026-10-22T22:48:32.584Z reload-extension: own window 10030018 opened
2026-10-22T22:48:33.452Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-22T22:48:33.454Z reload-extension: dry run - card and button found, nothing pressed
2026-10-22T22:48:33.671Z reload-extension: own window 10030018 closed
exit 5
--- daemon.log tail (no new resync line)
2026-10-22T22:43:05Z client - "reload-probe" (0 clients)
--- Get-T5ChromeWindows: 4787250, 658614 only
```
**PASS**: exit 5, nothing pressed, no window of mine left.

### Exactly one real run (direct call, no wrapper)

```
> powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1
2026-10-22T22:48:49.238Z reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
2026-10-22T22:48:49.417Z reload-extension: daemon running: yes (pid 26572)
2026-10-22T22:48:49.860Z reload-extension: own window 8719602 opened
2026-10-22T22:48:50.743Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-22T22:48:50.754Z reload-extension: pressed the reload button of the card
2026-10-22T22:48:54.388Z reload-extension: UIA: the card's service worker restart seen: yes; inspect views now: service worker, |  1 more…
2026-10-22T22:48:54.713Z reload-extension: daemon.log: new line '2026-10-22T22:48:50Z extension resync: 3 tabs, 0 gone'
2026-10-22T22:48:54.716Z reload-extension: RELOAD OK - the extension reconnected to the daemon after the press at 22:48:50.743Z; now run the stale-extension check
2026-10-22T22:48:54.937Z reload-extension: own window 8719602 closed
exit 0
--- daemon.log tail
2026-10-22T22:43:05Z client - "reload-probe" (0 clients)
2026-10-22T22:48:50Z extension resync: 3 tabs, 0 gone
```
**PASS**: exit 0, `RELOAD OK`, resync line at the press second, own window closed. I pressed the
reload button exactly once in this round.

### Proof (own fixture window 3673036, foreground True)

```
2026-10-22T22:49:00.146Z t5-check: connected as client c8 — daemon build 490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974, proto 2, extension connected
2026-10-22T22:49:00.150Z t5-check: listTabs — 3 tab(s); human's tab (current): T22 (fixture page)
2026-10-22T22:49:00.150Z t5-check: listTabs fields — handle on every tab: yes; windowId on every tab: yes; current tabs: 1
2026-10-22T22:49:00.160Z t5-check: snapshot T22 — elements: yes (29); text field: absent
2026-10-22T22:49:00.163Z t5-check: focusTab T22 — ok
2026-10-22T22:49:00.163Z t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab
exit 0
2026-10-22T22:49:01.610Z reload-probe: newTab T23 (background)
2026-10-22T22:49:03.121Z reload-probe: screenshot T23 mode:"cdp" → OFFSCREEN: The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first in 2 ms
2026-10-22T22:49:03.122Z reload-probe: PROBE PASS — the extension refuses cdp on a background tab (T5b build)
2026-10-22T22:49:03.129Z reload-probe: closeTab T23 — ok
exit 0
Close-T5Window 3673036
--- Get-T5ChromeWindows after: 4787250, 658614 only (untouched)
```
**PASS**: CHECK PASS (no CHECK FAIL), PROBE PASS (OFFSCREEN in 2 ms).

Evidence files: `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad\v-f1-dry.txt`,
`…\v-f1-real.txt`, `…\v-f1-proof.txt`.

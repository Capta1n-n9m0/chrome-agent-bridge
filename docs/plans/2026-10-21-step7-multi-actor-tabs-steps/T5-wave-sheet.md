# T5 — wave sheet (Step 7 live E2E, gate G7-2)

Written 2026-10-22 by the T5 step agent, **before any measurement**. The rows, their expected text and
their PASS rules are in `docs/e2e-test-plan.md` §4.14 (and §4.6/§4.8/§4.12/§4.13 for the regression and
designed-change rows); this sheet gives the order, the set-up and who does each step. Nothing here
loosens a row: where the two differ, the row wins. Model: Step 6's
`…step6-daemon-and-protocol-v2-steps/D6.md` § "Wave sheet" and `W1-run-record.md`.

**Tags.** **[UI]** UI automation the driver does itself: its own Chrome windows (`t5-win.ps1`),
`chrome://` pages by UI Automation or computer use, prompts to headless actors (`t5-actor.ts`).
**[SH]** a shell command in Windows PowerShell from the repo root. **[USER]** the user's keyboard —
**only** the extension reload (decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end
(#33)).

**Standing rules** (kickoff §7 "T5, how the wave runs"; common brief LESSONS; binding):
- The driver is no bridge client (launched with `--strict-mcp-config` and an empty MCP config); the
  §4.12 driver check prints nothing.
- The driver opens **its own** Chrome windows on fixture pages (`Open-T5Window`, i.e.
  `chrome.exe --new-window <fixture URL>`) and never acts in, captures or names the user's own windows
  or tabs; B1 (`t5.ts find --current` → `<T#> fixture`) before every row that relies on the human's tab.
- Fixtures: `$HOME\miniconda3\python.exe -I -m http.server 8080 --bind 127.0.0.1 --directory test-fixtures`
  (8081 only if a second server is needed; this wave needs none).
- Actors: `t5-actor.ts` sessions (headless `claude -p --model sonnet --allowedTools
  mcp__chrome-agent-bridge`, kept alive between prompts, B5) and `tsx` SDK scripts (`recipes/t5.ts`).
  Plain one-turn `claude -p` sessions only where no lease must outlive the turn. Every `start` names the
  actor's tools (`--tools`, below); the driver checks each `TOOL …` line of a `send` against the step.
  Tool lists: S1 `browser_status,browser_list_tabs,browser_select_tab,browser_focus_tab,browser_new_tab,browser_close_tab,browser_navigate,browser_snapshot,browser_screenshot,browser_click,browser_type,browser_evaluate,browser_network_clear,browser_network_requests,browser_download`;
  S2 `browser_status`; A `browser_snapshot,browser_click,browser_list_tabs`;
  B `browser_snapshot,browser_new_tab,browser_click,browser_select_tab,browser_list_tabs`;
  C `browser_select_tab,browser_snapshot,browser_wait_for,browser_list_tabs`;
  D, E `browser_select_tab,browser_screenshot`; F `browser_select_tab,browser_evaluate,browser_focus_tab`;
  R `browser_status,browser_snapshot`.
- Outputs are read verbatim from `t5-actor.ts send`'s output (stream-json) or the session transcript
  (`~/.claude/projects/C--Users-aliev-Projects-chrome-remote-extention/<session>.jsonl`), never from a
  model's paraphrase.
- Kill only a PID for which `Test-SafeToKill <pid>` printed `safe: …`; never PID 22152 (an unrelated
  codex `node.exe`); end actors with `t5-actor.ts end`, never a tree kill (B6).
- Never leave a DevTools window focused during a row (B3; RESOLVER-1 is the one exception, closed
  before the next row).
- Evidence shows fixture pages only (T5.4, B2); logs are attached as `.txt`; the token is never read
  or printed.
- A failed row is recorded, never fixed in the wave. A helper-script bug (`t5-win.ps1`, `t5-actor.ts`,
  a `t5.ts` set-up path) may be fixed during the wave and is recorded as a set-up fix with its diff; a
  row's expected text, its PASS rule and the judged lines of `t5.ts` are never changed after the run
  starts. Anything that needs a product code change returns as a proposed decision (the wave loop).

## The reload request (the only [USER] step)

Sent once, after the T5 commit and the main-tree `npm run build` (`T5-autonomous.md` has the exact
text and the build id). Until the user answers, the wave does not start; with no answer it stops at
G7-2 with this package ready.

## SCREEN-1's flash method (chosen before the run)

Page-side `visibilitychange` timestamps. Before each of three runs, `t5.ts screen1` installs a log on
the human's tab and on the target (`performance.timeOrigin + performance.now()`, high-resolution epoch
ms; `t5-lib.ts` `VISLOG_INSTALL`) and reads both logs 1.5 s after the call. **Flash = the human tab's
`visible` time − its `hidden` time.** The script also prints the target's visible interval and the
call's duration. Why this method: it is the finest available (sub-millisecond, measured inside Chrome)
and needs no DevTools; the `PrintWindow` loop (≥ 200 ms per frame) is far too coarse for a ~1 s event
and is used only for the banner (SCREEN-2). Precondition (B4): the human's tab reports `visible` when
the log is installed — a covered window would report `hidden` and fake a flash; the script refuses
(exit 3) rather than measure that.

## Order of work

0. **Pre-flight** [SH]
   - `git status --short` clean at the T5 commit; `git log -1 --format=%h` recorded.
   - Load the §1 item 8 helpers, then `. .\recipes\t5-win.ps1`;
     `$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"`.
   - `Get-DaemonBuild` equals the build id in `T5.ledger.md`; `Get-BridgeDaemon` prints nothing;
     nothing listens on 9234 (`Get-NetTCPConnection -LocalPort 9234 -State Listen -ErrorAction SilentlyContinue`).
   - `Test-Path Env:BRIDGE_TOKEN` → `False`; `git check-ignore bridge.token` → `bridge.token`.
   - The §4.12 driver check prints nothing (A1).
   - Start the fixture server (as §1 item 8, with miniconda's Python), output to
     `$env:TEMP\bridge-e2e\http8080.log`; `Invoke-WebRequest http://localhost:8080/e2e-playground.html`
     → 200, 13 106 bytes.
   - `$env:T5_OUT = "$env:TEMP\bridge-e2e\t5"`; record `chrome.exe`'s version and `node -v`.
1. **The first recorded line: the reload and RELOAD-1.**
   - Record the user's reload answer with its time, and "no `/mcp`: every actor is a fresh headless
     session that loads the new `mcp/dist/index.js`" (T5.1).
   - [UI] `$w0 = Open-T5Window 'http://localhost:8080/e2e-playground.html?t5=check'`.
   - [SH] **RELOAD-1**: `npx tsx recipes/t5.ts check` (it starts the daemon; its parent, the script,
     exits — the daemon stays). `CHECK FAIL` ⇒ stop, ask the user to reload again; nothing else runs.
2. **Designed-change rows (#60), part 1** — actor S1.
   - **MUX-1**: [SH] stop the daemon (`Get-BridgeDaemon` → `Test-SafeToKill` → `Stop-Process`), check
     nothing runs; [SH] `t5-actor.ts start S1`; [UI] S1 `browser_status`; [SH] `Get-BridgeDaemon`,
     `Get-BridgeProcs`, `Get-BridgeLog 8`. Judged against MUX-1's dated text (S1 is `claude-code #<M>`;
     the daemon's parent is S1's MCP).
   - **STAT-1**: the same `browser_status` output, against STAT-1's dated text (`Active tab: [<T#>] …`).
   - **TAB-1…5** in S1, in W0 (TAB-2's second tab by `Open-T5Tab …?t5=tab2`; "switch back" by
     `Set-T5Foreground $w0.Hwnd` then Ctrl+1 via SendKeys, or record that the driver used
     `browser_focus_tab` on the playground tab instead; TAB-3 with `…?t5=tab3` for example.com, T5.4).
   - **NET-12** in S1 (`…?t5=net12` for the second tab).
   - **MUX-3**: [SH] B1; `t5-actor.ts start S2`; the MUX-3 block of §4.12 (recipe with a 60 s hold); [UI]
     `browser_status` in S1 during and after the hold. With S1 and S2 connected the expected clients
     are `claude-code #<M1>, claude-code #<M2>, hello-recipe`. Compare the recipe's `[<id>]` with
     `t5.ts info check` (W0's tab) `chrome id`, and `browser_status`'s handle with that line's handle.
3. **Regression rows (T5.3) and ACT-8** — S1, in a fresh driver window on the plain URL.
   - [UI] `$wr = Open-T5Window 'http://localhost:8080/e2e-playground.html'`; B1.
   - The MUX-9 sequence (navigate, snapshot, ACT-1, ACT-2, TRUST-2, EVAL-1, NET-1 with the clear) with
     the banner checks by the capture loop (A10), NET-1's size `12.8 KB`; PERC-1…4 and ACT-3; ACT-8
     (navigate away to `…?t5=act8` and back, then click an old ref); then **DL-1** (§4.13) — needs only
     the 8080 server.
   - S1 holds the plain-URL tab now: next, [SH] `t5-actor.ts end S1`, `end S2`;
     `npx tsx recipes/t5.ts cleanup`; close `$wr` and the TAB/NET-12 windows (`Close-T5Window`).
4. **LEASE-1, LEASE-4, LEASE-7** — actors A, B.
   - [UI] `$w1 = Open-T5Window '…?t5=lease1'`; B1. [SH] `start A`, `start B`.
   - LEASE-1 as §4.14 (the parallel step: two `send`s started with `Start-Job`, both outputs to files).
   - LEASE-4 directly after (B, then `end A`, then B).
   - LEASE-7: [UI] `$w7 = Open-T5Window '…?t5=lease7-home'`; `Set-T5Foreground $w7.Hwnd`;
     `Open-T5Tab '…?t5=lease7-human'`; B's three calls. Then `end B`; `cleanup`; close `$w1`, `$w7`.
5. **LEASE-2** — actor C and the script.
   - [UI] `$w2 = Open-T5Window '…?t5=lease2-claude'`; `Set-T5Topmost $w2.Hwnd`; B1.
   - [SH] `find lease2-claude` → `<T#c>`; `start C`; [UI] C `browser_select_tab`.
   - [SH] `lease2` in the background to `lease2.out`; poll for `typing started`; [UI] at once C's
     three-snapshot prompt; [SH] wait for the script's exit; read `lease2.out`.
   - Judge the snapshot times against `<t0>`/`<t1>` from the `typing ended` line.
6. **LEASE-3** — the script, then C's `browser_list_tabs` during its hold.
   - [UI] `$w3 = Open-T5Window '…?t5=lease3-home'`; B1; [SH] `lease3` in the background; when it
     prints `holding the opener lease`, [UI] C `browser_list_tabs`. Then `end C`, `cleanup`, close
     `$w2`, `$w3`.
7. **LEASE-5.**
   - [UI] `$w5 = Open-T5Window '…?t5=lease5'` (alone in its window); [SH] `lease5` in the background;
     when it prints `close the window titled …`, [UI] `Get-T5ChromeWindows` → the `T5 LEASE5 target -
     Google Chrome` handle (it must equal `$w5.Hwnd`) → `Close-T5Window`. Read `lease5.out`.
8. **LEASE-6.**
   - [UI] `$w6 = Open-T5Window '…?t5=lease6-home'`; B1; [SH] `lease6` in the background.
   - When it prints `discard <T#> now`, [UI] `$wx = Open-T5Window 'chrome://discards'` (if Chrome
     refuses a `chrome://` URL on the command line, open it from `$w6`'s address bar by SendKeys
     `^l`, the URL, `{ENTER}` in a new tab of `$wx`), then `Invoke-T5Uia $wx.Hwnd 'discard'
     'T5 LEASE6 target'` (or computer use); `Close-T5Window $wx.Hwnd`; `Set-T5Foreground $w6.Hwnd`.
   - The script detects the discard, reloads the tab with `focusTab` and prints the outcome.
   - If UI Automation cannot reach the discard action and no computer use is available, LEASE-6 is
     recorded as **not run (set-up)**, with the reason — not as a FAIL, and not as a PASS.
   - `cleanup`; close `$w5` (already closed) and `$w6`.
9. **SCREEN-1, SCREEN-2, SCREEN-3** — one human window.
   - [UI] `$ws = Open-T5Window '…?t5=screen-human'`; `Set-T5Topmost $ws.Hwnd`; B1.
   - [SH] SCREEN-1: `screen1` (three runs; the flash method above).
   - [SH] SCREEN-2: start the capture loop
     `Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-File','recipes\t5-win.ps1','-Capture','-Hwnd',$ws.Hwnd,'-Seconds','25','-IntervalMs','200','-OutDir',"$env:TEMP\bridge-e2e\frames-screen2"`,
     then `screen2` (it waits 5 s); judge the frames between its two printed times; view
     `screen2.png` (`t5-png.ts` first).
   - [SH] SCREEN-3 (a): `screen3`. (b): `open screen3-d --bar red`, `open screen3-e --bar lime`;
     `start D`, `start E`; [UI] each `browser_select_tab`; then both `browser_screenshot {}` at once
     (two jobs); [SH] `t5-png.ts --transcript` on each actor's `out.jsonl`. `end D`, `end E`.
   - `cleanup --keep screen-human`.
10. **SCREEN-4.**
    - [UI] `$w4 = Open-T5Window '…?t5=screen4'`; [SH] `mark screen4 magenta`; [UI]
      `Hide-T5Window $w4.Hwnd` → `True`.
    - [SH] `screen4`; `Test-T5Minimized $w4.Hwnd` → `True`. [UI] `Show-T5Window $w4.Hwnd`; close
      `$w4`.
11. **SCREEN-5.**
    - [UI] `$w5t = Open-T5Window '…?t5=screen5-target'`; `Open-T5Tab '…?t5=screen5-front'` (lands
      in `$w5t`, the last-focused window); `$w5h = Open-T5Window '…?t5=screen5-human'`.
    - `Move-T5Window` both side by side (e.g. 0,0 960x1000 and 960,0 960x1000); `Set-T5Topmost` both.
    - [SH] `Get-T5Foreground`; `screen5`; `Get-T5Foreground`. `cleanup`; close both windows;
      `Set-T5Topmost -Off` on `$ws`.
12. **BG-1, BG-2, BG-4, BG-3.**
    - [UI] `$wb = Open-T5Window '…?t5=bg-human'`; `Set-T5Topmost $wb.Hwnd`; B1.
    - [SH] `bg1 --then-focus`; `cleanup --keep bg-human`; B1 again (a `focusTab` moved the human's
      tab); `bg2 --then-focus`; `cleanup --keep bg-human`; B1; `bg4`.
    - BG-3: [SH] `open bg3`; `info bg3` → `background`; `start F`; [UI] F's four calls; `end F`.
    - `cleanup`; close `$wb`.
    - If BG-1 or BG-2 FAIL: the row records the text and the "retry not run" line; T5.2's
      `setFocusEmulationEnabled` retry needs a bridge method that does not exist, so it returns as
      proposed decision "BG-1/BG-2's focus-emulation retry needs a CDP pass-through" (the wave loop),
      for the session agent — never a code change in the wave. Because T5.2 is a pre-registered exit
      check, this is also an **escalation** (common.md ESCALATION list: an exit check) in the T5 report.
13. **RESOLVER-1** (last of the live rows, because it opens DevTools).
    - [UI] `$wq = Open-T5Window '…?t5=resolver'`; [SH] `start R` (no call yet).
    - [UI] `$we = Open-T5Window 'chrome://extensions'` (as LEASE-6 if the command line refuses it);
      `Invoke-T5Uia $we.Hwnd 'service worker' 'Chrome Agent Bridge'` → a DevTools window `$wd` (`Get-T5ChromeWindows`);
      `Close-T5Window $we.Hwnd`; `Set-T5Foreground $wq.Hwnd`; `Set-T5Foreground $wd.Hwnd`;
      `Get-T5Foreground` → `DevTools - chrome-extension://…`.
    - [UI] R: `browser_status`; R: `browser_snapshot {}`.
    - [UI] `Close-T5Window $wd.Hwnd`; `Set-T5Foreground $wq.Hwnd`; `end R`; close `$wq`.
14. **Close-down and evidence.**
    - [SH] `t5-actor.ts status` → every actor ended; `cleanup`; close every driver window still open
      (own handles only).
    - Stop the fixture server; stop the daemon (`Test-SafeToKill` first).
    - [SH] the log-hygiene block (§4.12, D6.3's form) on a copy of `daemon.log` → `0`, `0`, `0`; then
      attach it as `T5-daemon-log.txt`.
    - Copy the fixture-only evidence images to the steps dir if wanted: script captures (`$env:T5_OUT`)
      show only fixture pages; `PrintWindow` frames show Chrome's frame (bookmarks bar, icons) and are
      never committed uncropped; a `chrome://discards` capture is never kept (T5.4, B2).
15. **Record.**
    - `T5-run-record.md` (every command and the text it printed, from `send` outputs, script outputs
      and transcripts; non-fixture lines omitted per B2).
    - §5 **Run 8** in `docs/e2e-test-plan.md` (date, Chrome, Node, OS, commit, build id, the template
      lines with P/F, the SCREEN-1 flash number and its method, LEASE-6's outcome, SCREEN-4's `cdp`
      result, BG-1/BG-2 PASS/FAIL).
    - A fresh verifier (model "opus") re-reads the record against the expected text written here
      before the run, and greps the attached log for `://` and the token without printing them.
16. **Report.** `T5.md` per the report schema: verdicts per row, the BG findings for Step 8
    (`sdk/src/policy.ts`), proposed decisions (the wave loop), the test count unchanged (934 / 59).

## Pre-registered PASS rules (source and strictness)

| Row | Stage 0 Lens (d) rule (#48) | §4.14 (stricter where marked) |
|---|---|---|
| LEASE-2 | 30-char string typed at a slow trusted pace; box holds exactly it; Claude's 3 snapshots succeed and never show the script's tab | same, plus: the status line exact, 30/30 calls ok, typing ≥ 30 s, all three snapshots inside the typing window (stricter) |
| LEASE-6 | F7's two-way rule: (a) same id, handle works → PASS; (b) new id with `tabReplaced`, handle works → PASS; else FAIL; record a still-discarded tab's answer | same; (b) is shown by "new chrome id, the same handle"; the post-reload snapshot must return the lease6 URL and the lease must still be the script's (stricter) |
| SCREEN-1 | image is the target; human's tab active again within 2 s; flash a number (> 1 s a finding) | same, three runs all passing; "active again" also checked by `listTabs` (active and current) (stricter) |
| SCREEN-2 | no tab switch (human logs no `hidden`); banner seen in the capture loop; image shows the target's title text | same, plus the target logs no `visible`, the image's magenta bar, and the heading viewed (stricter) |
| SCREEN-4 | default → `WINDOW_MINIMIZED` without un-minimizing; `cdp` recorded (rendered / blank / error, exact text) | same, the exact message text (stricter) |
| BG-1 / BG-2 | `isTrusted` reporter shows `true` / typed string exact, on a background tab, human's tab unchanged; FAIL recorded then retried with `setFocusEmulationEnabled` | same, plus the target proven hidden and still background afterwards; the retry is **not runnable** (no method) — recorded as not run and returned as a proposed decision |
| BG-3 | first evaluate `NotAllowedError` (or the document-focus message); after `browser_focus_tab` succeeds | same |
| BG-4 | `waitFor {text}` finds a text added after 2 s, `networkIdle` returns, both within 10 s on a background tab; times recorded | same, plus text found no earlier than 1.9 s and the tab still background (stricter) |
| RESOLVER-1 | DevTools window focused: `browser_status` and `browser_snapshot` name and act on the same fixture tab, no `No … window` error | same, plus `Get-T5Foreground` shows the DevTools window before the calls (stricter) |

Rows without a Stage 0 rule (LEASE-1, -3, -4, -5, -7, SCREEN-3, SCREEN-5, RELOAD-1) have their
expected text in §4.14, written from the code's own strings (`daemon/src/intercept.ts`,
`mcp/src/tools/registry.ts`, `extension/src/tabs.ts`) before the run.

## Deferred G7-1 items and where the wave covers them

| T1 / T3 deferral | Covered by |
|---|---|
| build + reload against the daemon of the day | RELOAD-1 |
| the offscreen relay's live event frame | LEASE-3 (`leaseGranted` needs `tabCreated`), LEASE-5 (`tabGone` needs `tabRemoved`) |
| F8's DevTools-focused resolver check | RESOLVER-1 |
| ACT-8's text | the regression block (ACT-8) |
| LEASE-3 with `trusted:true` (synthetic click, `openerTabId`) | LEASE-3 (synthetic first, then trusted; both recorded) |
| NET-1's size | MUX-9's NET-1, `12.8 KB` (#56 note) |
| T3 verifier V4 (a timed-out capture's restore undoing a later `focusTab`) | watch item in SCREEN-3; recorded if seen |

## Run 9 (written 2026-10-23, before any Run 9 measurement)

Rows and expected text: `docs/e2e-test-plan.md` §4.15 (decisions.md #62, #63). Standing rules, tags and
cautions as above. The extension reload is again the only [USER] step. Every actor is started with a
**quoted** tool list (Run 8 set-up fault 1). Order (cheap discriminators first):

0. **Pre-flight** as step 0 above, with `Get-DaemonBuild` =
   `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974` (T5b, commit `12ecb65`).
1. **R9-RELOAD-1** (the first recorded line: the user's reload answer, then `t5.ts check`).
2. **R9-SCREEN-2** in a topmost window on `…?t5=screen-human`, the capture loop running; a `TIMEOUT`
   ⇒ the reload did not take: stop and ask again.
3. **R9-SCREEN-1** (`screen1 --hue`), **R9-SCREEN-3** (a) (`screen3 --hue`) and (b) (actors D, E with
   `--tools 'browser_select_tab,browser_screenshot'`), in the same window; `cleanup --keep screen-human`
   between them.
4. **R9-SCREEN-4** (`r9-cdp --minimized`), then **R9-SCREEN-5** (`screen5 --hue`; check the two rects
   do not overlap before the run).
5. **R9-RESTORE**: Wr9 (`restore-target` + `restore-front` active) covered by a topmost maximized Wc on
   the same monitor; `r9-restore`; then un-topmost and close both. "Not measured" if the capture does not
   hang.
6. **R9-LEASE-3** (`lease3 --race`; actor C with `--tools 'browser_list_tabs,browser_select_tab'`).
7. **R9-NET-1** (actor S with `--tools 'browser_select_tab,browser_network_clear,browser_network_requests'`;
   a fresh window on the plain URL; the hard reload by `^+r` in that window, only after `Set-T5Foreground`
   printed `True` and `Get-T5Foreground` names that window; the capture loop for A10).
8. **R9-RESOLVER-1** last (it opens DevTools); the console is confirmed with the find-only
   `Find-T5Uia <Wd> 'sw.js','[bridge]'` (counts only).
9. Close-down, log hygiene (`://`, token, withheld = 0) on the Run 9 part of `daemon.log`, attached as
   `T5-run9-daemon-log.txt`; `T5-run9-record.md`; §5 **Run 9**; a fresh verifier; commit.

A failed row is recorded, never fixed in the wave. Helper bugs may be fixed and recorded as set-up fixes;
`t5.ts`'s judged lines and the §4.15 texts do not change after step 1 starts.

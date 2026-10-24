# Step 9 S4 — wave sheet (Run 13: the SAFE rows of `docs/e2e-test-plan.md` §4.20)

Written 2026-10-24 by the S4 prep builder, after the rows were committed (`049a72a`, exit check S4.1) and before
the Step 9 build was loaded. The rows and their expected text are §4.20; this sheet is only the order, the commands
and the record template. **The helpers were not run against Chrome by their author** (the prep stage may not touch
Chrome): blocks 1–6 are their live smoke. A helper bug found live is fixed in `recipes/` and recorded as a set-up
fix; it never changes a row's expected text or pass rule (forbidden fix: editing a row's expected text after its
run).

*Amended 2026-10-24 by the S4 prep fixer r1, before anything ran (`S4-prep-verifier.md` findings 1–7,
`S4-prep-fixer1.md`): the stop rule below runs `Restore-S9All` on any stop or helper throw; block 8 is a guard
(found state ≠ armed + JS on + empty list → STOP before any toggle, so nothing of the user's list is ever saved;
`-SaveTo`/`-FromFile` of the found list are gone); actor M ends after SAFE-5 and M2 serves SAFE-9 (SAFE-5d's
`snapC` would otherwise meet M's lease, `TAB_HELD`); the read-backs in blocks 33 and 40 are stored reads
(`Read-S9StoredState`: a fresh options page) cross-checked with `daemon.status`; SAFE-7d reads the card's enable
toggle before and after.*

**Gates and stops.** G9-1: the wave is the driver's, run end to end (#33), on the driver's own windows only; the
safety state is restored and read back (block 40); a restore that fails stops the run and the step agent asks the
user. G9-2: pinning the button by UIA (block 9); if `Set-S9Pin` fails, stop and the step agent asks the user once.
Stop also on: a reload exit other than 0 after one re-run on exit 2; a Chrome restart; a port-9234 holder that is
not our daemon; any count of the token, or of a non-fixture `://`, in a file about to be committed. A failed row
is recorded and the wave goes on. Kill only PIDs `Test-SafeToKill` calls safe.

**On any stop, and on any helper throw, from block 4 on — in this order** (prep fixer r1, S4-prep-verifier
finding 1; `storage.local` outlives reloads and Chrome restarts, so an abandoned wave would leave the user's
Chrome disarmed, JavaScript off or a pattern blocked):
1. record the stop (block, command, the message verbatim) in `S4-run-record.md`;
2. `$ok = Restore-S9All -Why '<block>: <reason>'` (`recipes/s9-win.ps1`, the one entry point; idempotent — it
   re-reads before every press, so calling it twice presses nothing). It runs, in order: the safety restore
   (armed, JavaScript on, the block list empty — the found state block 8's guard verified) **and its read-back**
   (a fresh options page, i.e. the stored state; `daemon.status` through `s9.ts wait-safety`; the toolbar title),
   then the pin state found at block 9, W's keyboard layout recorded at block 4 (`$L0`), and the driver windows
   (D, O, E, W closed; the window count back to `$WinStart`). Before block 8 has run, or when block 8's guard
   stopped the wave, it leaves the safety state untouched (nothing was toggled) and restores only the desk;
3. the rest of block 43 as far as it runs (actors ended, `S9 cleanup`, `S9 daemon-shutdown`, servers stopped);
4. `$ok` is `$false` → **STOP that escalates** (G9-1; integrity floor: "a safety state left different from the one
   found"): record the last `STATE` / `RESTORE` lines; the step agent asks the user; nothing more is pressed in
   Chrome. This includes a Chrome restart (Restore-S9All then does not touch Chrome: a restart needs a fresh grant)
   and an options page that cannot be reopened.

After a helper throw and a restore that returned `$true`, the step agent decides whether the helper bug is fixed in
`recipes/` (a set-up fix, recorded) and the wave resumes from the start of the interrupted section with its
preconditions re-established, or the wave ends. **Not stops** (pre-registered): a row's `CHECK … FAIL` (`S9` exit
1: recorded, the wave goes on); `S9` exit 3 (`NOT DISCRIMINATING` / `NOT MEASURED`: recorded; the one re-run where
the row says so); block 12's throw (the console half is NOT MEASURED). `S9` exit 2 (`FAILED — SET-UP: …`) is a
helper throw.

**Never printed or committed:** the token (`bridge.token` is read only inside `s9.ts`'s scans), the block-list
text as found (only its line count and sha256), any title or URL of the user's tabs (every SDK listing is counts),
the actor transcripts whole (they stay in `%TEMP%\bridge-e2e\s9-actors`; only lines quoted in the record, after
`s9.ts scan-file <extract> --mode committed` passes).

## 0. Set-up (Windows PowerShell 5.1, repo root; one window for the whole wave)

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
$PY = "$HOME\miniconda3\python.exe"
$env:S9_OUT = "$env:TEMP\bridge-e2e\s9"; New-Item -ItemType Directory -Force $env:S9_OUT | Out-Null
$SCR = 'C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad'
$REC = '.\docs\plans\2026-10-24-step9-phase-e-safety-steps\S4-run-record.md'
. .\recipes\s9-win.ps1
function S9 { node --import tsx recipes/s9.ts @args }                       # foreground SDK step
function S9Bg([string]$Name) {                                              # background SDK step (timed rows)
  Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $PWD -FilePath node `
    -ArgumentList (@('--import', 'tsx', 'recipes/s9.ts') + $args) `
    -RedirectStandardOutput "$env:S9_OUT\$Name.out" -RedirectStandardError "$env:S9_OUT\$Name.err" }
function S9Out([string]$Name) { Get-Content "$env:S9_OUT\$Name.out" -Encoding UTF8 }
function M([string]$Prompt) { node --import tsx recipes/s9-actor.ts send M $Prompt }   # actor M, one turn (blocks 13-32)
function M2([string]$Prompt) { node --import tsx recipes/s9-actor.ts send M2 $Prompt } # actor M2, one turn (blocks 36-37)
$OFF = $S9TitleOff; $ARMED = $S9TitleArmed; $JSOFF = $S9TitleJsOff   # set in s9-win.ps1 (a UTF-8 BOM file, so the em dash survives PS 5.1)
```

`S9Bg` output goes to a file, never the caller's pipe (CLAUDE.md: a spawned daemon once held a PowerShell pipe).
Actor prompts carry no double quotes (PowerShell 5.1 strips embedded `"` from native arguments): they name handles
in words, e.g. `call browser_select_tab with tab T12`.

The record: append each block's printed lines, verbatim, to `S4-run-record.md` (template at the end), with the
block number. Record UTC times as printed.

## Pre-reload (the "pre-build state" of S4.2)

1. **Environment.** `git rev-parse --short HEAD` (expect the S4 helpers commit), `git status --short` (clean but
   the S4 ledger/briefs), `netstat -ano | findstr ":9234 :8080 :8081 :8083"` (all free; 8082 is SystemSettings.exe,
   not ours), `Get-BridgeDaemon` (none), `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select ProcessId,
   ParentProcessId` (record; the Codex `host-daemon.mjs` PID 22152 is not ours), `$WinStart =
   (Get-S9ChromeWindows).Count`, `$S9ChromeStart = Get-S9ChromeStart` (record both: Restore-S9All reads them),
   `Get-S9KeyboardLayouts`. Record: "the extension in Chrome runs a pre-Step-9 build (S4 ledger); it has
   no safety state to read; absent keys parse as armed / JS on / empty list (#171)".
2. **Build.** `npm run build` (exit 0) then `git status --short` (no tracked file changed). `npx tsc --noEmit -p
   recipes/tsconfig.s9.json` (exit 0).
3. **Fixture servers** (127.0.0.1 only; logs outside the repo):
   ```powershell
   $web  = Start-Process -PassThru -WindowStyle Hidden -FilePath $PY -ArgumentList '-I','-m','http.server','8080','--bind','127.0.0.1','--directory','test-fixtures' -RedirectStandardError "$env:S9_OUT\http8080.log"
   $web1 = Start-Process -PassThru -WindowStyle Hidden -FilePath $PY -ArgumentList '-I','-m','http.server','8081','--bind','127.0.0.1','--directory','test-fixtures' -RedirectStandardError "$env:S9_OUT\http8081.log"
   $red  = Start-Process -PassThru -WindowStyle Hidden -FilePath $PY -ArgumentList '-I','recipes/s9-redirect.py','8083' -RedirectStandardOutput "$env:S9_OUT\redirect8083.log"
   ```
   Record the three PIDs.
4. **Driver window W.** `$W = Open-S9Window 'http://localhost:8080/e2e-playground.html?s9=w'`; `$L0 = Get-S9Layout
   $W` (record; the layout Restore-S9All puts back). From here on, the stop rule above applies.
5. **Tabs and daemon.** `S9 setup` (the first client spawns the daemon on 9234: `Get-BridgeDaemon` → record its PID
   `$D9`). Expect `driver tab w = <T#w> (current), title set to "S9 W human tab"` and four `opened …` lines.
6. **Per-call cost before.** `S9 perf --label before` (SAFE-PERF, on the pre-Step-9 extension).

## The reload and the first two lines (S4.2)

7. ```powershell
   $WaveStart = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ'); "wave start $WaveStart"
   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1; "exit $LASTEXITCODE"
   S9 safe0
   ```
   **Record line 1** = the reload's exit (0; one re-run on exit 2, any other exit stops the run). **Record line 2**
   = `S9 safe0`'s output (SAFE-0). Then `Get-BridgeLog 8` (the `extension resync` and `safety state: armed=true
   evaluate=true blocked=0` lines, for SAFE-0's delay).

## Found state, button, shortcut, console

8. **SAFE-11 (start) and the found-state guard.** `S9 probe --row SAFE-11-start`;
   `$O = Open-S9ChromePage 'chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html'`;
   `$FoundOk = Test-S9FoundState $O` (a stored read of O — `STATE …` — plus `daemon.status` through `wait-safety
   --armed true --evaluate true --count 0`; sets `$S9Found`); `Set-S9Foreground $W`. Write the STATE line into the
   ledger's "Found state" too. **Guard (pre-registered, prep fixer r1):** `$FoundOk` is `$false` (anything but
   armed, JavaScript on, an empty list — on O or in `daemon.status`) → STOP before block 14: every toggle below is a
   blind press and the restore targets that state. Nothing has been changed and nothing is saved (the user's list
   is never copied); run the stop rule (Restore-S9All restores only the desk) and the step agent asks the user.
9. **SAFE-PIN (G9-2).** `$PinnedBefore = Get-S9PinState $W`; if `$false`: `Set-S9Pin $W -Pin` (a `$false` result
   stops the run). `Get-S9ActionTitle $W`; `Get-S9BadgePixels $W` (record).
10. **SAFE-PERF after.** `S9 perf --label after`.
11. **SAFE-2 (a).** `$E = Open-S9ChromePage 'chrome://extensions/shortcuts'`; `Read-S9Shortcuts $E`.
12. **Console (SAFE-10 set-up).** `Set-S9Omnibox $E 'chrome://extensions'`; `$D = Open-S9WorkerConsole $E`;
    `Set-S9Foreground $W`. On a throw: record "worker console not opened → SAFE-10 console half NOT MEASURED".
13. **Actor M.** `node --import tsx recipes/s9-actor.ts start M` (record pids). No prompt yet. `Set-S9Foreground $W`.

## Toggles

14. **SAFE-1 (1)–(3).**
    ```powershell
    Invoke-S9ActionButton $W; Wait-S9ActionTitle $W $OFF 1000
    S9 wait-safety --armed false --row SAFE-1
    S9 call SAFE-1 snap snapshot a --expect DISARMED:all
    S9 call SAFE-1 eval evaluate a --expect DISARMED:all
    S9 call SAFE-1 tabs tabs
    S9 call SAFE-1 status status
    S9 call SAFE-1 net network --expect DISARMED:all
    M 'Call browser_status, then browser_snapshot with no arguments, then browser_list_tabs. Do nothing else and do not retry.'
    ```
15. **SAFE-1 (4)** (≥ 1.5 s after block 14's press):
    ```powershell
    Invoke-S9ActionButton $W; Wait-S9ActionTitle $W $ARMED 1000
    S9 wait-safety --armed true --row SAFE-1
    S9 call SAFE-1 snap2 snapshot a --expect ok
    M 'Call browser_snapshot with no arguments, then browser_status. Do nothing else.'
    ```
16. **SAFE-1b.** `Invoke-S9ActionButton $W -Times 2 -GapMs 200`; `S9 call SAFE-1b snap snapshot a --expect
    DISARMED:all`; `Get-S9ActionTitle $W`; `Start-Sleep -Milliseconds 1500`; `Invoke-S9ActionButton $W`;
    `Wait-S9ActionTitle $W $ARMED 1000`; `S9 call SAFE-1b snap2 snapshot a
    --expect ok`.
17. **SAFE-2 (b, c)** — only if block 11 printed `SHORTCUT assigned` (else record "SAFE-2 (c) not measured").
    `$L17 = Get-S9Layout $W`; `Send-S9Shortcut $W`; `Wait-S9ActionTitle $W $OFF 1000`; `S9 call SAFE-2 snap
    snapshot a --expect DISARMED:all`; `Start-Sleep -Milliseconds 1500`; `Send-S9Shortcut $W`; `Wait-S9ActionTitle $W
    $ARMED 1000`; `S9 call SAFE-2 snap2 snapshot a --expect ok`. If a `layout before/after` pair differs:
    record it (SAFE-2 fails on that clause), then `Restore-S9Layout $W $L17`.
18. **SAFE-3.** `Set-S9Switch $O -Which armed -On $false`; `Wait-S9ActionTitle $W $OFF 1000`; `S9 call SAFE-3
    snap snapshot a --expect DISARMED:all`; `Read-S9OptionsLines $O`; `Start-Sleep -Milliseconds 1500`;
    `Invoke-S9ActionButton $W`; `Wait-S9ActionTitle $W $ARMED 1000`; `Read-S9OptionsLines $O`;
    `Read-S9SafetyState $O`; `Set-S9Foreground $W`.
19. **SAFE-6, SAFE-6b.**
    ```powershell
    Set-S9Switch $O -Which evaluate -On $false; Wait-S9ActionTitle $W $JSOFF 1000
    Read-S9OptionsLines $O; Set-S9Foreground $W
    S9 call SAFE-6 eval evaluate a --expect DISARMED:evaluate
    S9 call SAFE-6 asref evaluate-asref a --expect DISARMED:evaluate
    S9 call SAFE-6 snap0 snapshot a --expect ok
    S9 call SAFE-6 click click-counter a --expect ok
    M 'Call browser_evaluate with the expression 1+1, then browser_status. Do nothing else and do not retry.'
    S9 call SAFE-6b js navigate a 'javascript:void 0' --expect DISARMED:evaluate
    S9 call SAFE-6b data navigate a 'data:text/html,<p>s9</p>' --expect DISARMED:evaluate
    Invoke-S9ActionButton $W; Wait-S9ActionTitle $W $OFF 1000
    Start-Sleep -Milliseconds 1500
    Invoke-S9ActionButton $W; Wait-S9ActionTitle $W $JSOFF 1000
    Set-S9Switch $O -Which evaluate -On $true; Wait-S9ActionTitle $W $ARMED 1000
    Set-S9Foreground $W
    ```
20. **SAFE-6c (record).** `S9 call SAFE-6c js navigate a 'javascript:void 0' --expect record`; `S9 call SAFE-6c snap
    snapshot a --expect ok`.
21. **SAFE-7, SAFE-REL-1.**
    ```powershell
    S9 call SAFE-7 nav navigate a own-options --expect BLOCKED:ext
    S9 call SAFE-7 new newtab own-options --expect BLOCKED:ext
    S9 call SAFE-7 other navigate a chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/x.html --expect BLOCKED:ext
    S9 call SAFE-REL-1 slash navigate a /options.html --expect BLOCKED:ext
    S9 call SAFE-REL-1 bare newtab options.html --expect BLOCKED:ext
    S9 call SAFE-REL-1 host navigate a bank.example --expect BLOCKED:ext
    ```
22. **SAFE-7b** (before REL-3, so O's tab is the only own page): `S9 call SAFE-7b tabs tabs`; `S9 call SAFE-7b snap
    snapshot blocked1 --expect BLOCKED:own`; `… shot screenshot blocked1 --expect BLOCKED:own`; `… eval evaluate
    blocked1 --expect BLOCKED:own`; `… focus focus blocked1 --expect BLOCKED:own`; `Read-S9SafetyState $O` (equal to
    block 8); `[long][S9Win]::GetForegroundWindow() -ne $O` → `True` (the refused focus did not bring O forward).
23. **SAFE-REL-3.** `S9 call SAFE-REL-3 abs navigate a view-source:chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
    --expect BLOCKED:ext`; `S9 call SAFE-REL-3 open newtab http://localhost:8080/e2e-playground.html?s9=r3 --as r3
    --expect ok`; `S9 call SAFE-REL-3 rel navigate r3 view-source:/options.html --expect record`; `S9 call SAFE-REL-3
    tabs tabs`; only if the `rel-after` line says `hidden=blocked`: `S9 call SAFE-REL-3 rel-snap snapshot r3 --expect
    BLOCKED:own` (and r3 is closed by `Close-S9Tab` at block 43).
24. **SAFE-7d.** `Get-S9CardEnabled $E` (E is on `chrome://extensions` since block 12; expect `on`); `S9 call
    SAFE-7d nav navigate b5 chrome://extensions --expect record`; if `ok`: `S9 call SAFE-7d click click-counter b5
    --expect code:RESTRICTED_URL`; `S9 call SAFE-7d back navigate b5 http://localhost:8080/e2e-playground.html?s9=b5
    --expect ok`; `Get-S9CardEnabled $E` (equal to the first read); `Set-S9Foreground $W`.
25. **SAFE-POP-1.** `S9 pop1`.
26. **SAFE-CAP-1 (record).** `$p = S9Bg cap1 cap1`; `Invoke-S9WhenReady -Row SAFE-CAP-1 -DelayMs 300 -Action {
    Select-S9Tab $W 'S9 W' }`; `$p.WaitForExit(); S9Out cap1`.

## Timed rows (the script waits on `$env:S9_OUT\<row>.ready`, the driver presses OFF, then ON)

27. **SAFE-4 (a).** `$p = S9Bg safe4a safe4a`; `Invoke-S9PressWhenReady $W -Row SAFE-4a -DelayMs 2000 -RearmAfterMs
    1500`; `$p.WaitForExit(); S9Out safe4a`.
28. **SAFE-4c.** As 27 with `safe4c` / `-Row SAFE-4c`.
29. **SAFE-4 (b).** `$p = S9Bg safe4type safe4-type`; `Invoke-S9PressWhenReady $W -Row SAFE-4-type -DelayMs 400
    -WatchBanner -RearmAfterMs 1500`; `$p.WaitForExit(); S9Out safe4type`; `Select-S9Tab $W 'S9 W'`. On `NOT
    DISCRIMINATING`: one re-run with `-DelayMs` set from the printed times (e.g. half the measured typing time), no
    other change.
30. **SAFE-4b.** `$p = S9Bg safe4b safe4b`; `Invoke-S9PressWhenReady $W -Row SAFE-4b -DelayMs 0 -RearmAfterMs 1500`;
    `$p.WaitForExit(); S9Out safe4b`; `Select-S9Tab $W 'S9 W'`. On `NOT DISCRIMINATING`: one re-run.

## Blocked sites

31. **SAFE-OPT-1.** `Set-S9BlockList $O -Lines @('bank.example', 'not a host!')`; `Read-S9OptionsLines $O
    -ShowInvalid`; `S9 wait-safety --count 1 --row SAFE-OPT-1`.
32. **SAFE-5.** `Set-S9BlockList $O -Lines @('localhost:8081')`; `S9 wait-safety --count 1 --row SAFE-5`; then
    ```powershell
    S9 call SAFE-5 snap snapshot c --expect BLOCKED:tab
    S9 call SAFE-5 eval evaluate c --expect BLOCKED:tab
    S9 call SAFE-5 shot screenshot c cdp --expect BLOCKED:tab
    S9 call SAFE-5 nav navigate a http://localhost:8081/e2e-playground.html?s9=a5 --expect BLOCKED:url
    S9 call SAFE-5 new newtab http://localhost:8081/e2e-playground.html?s9=n5 --expect BLOCKED:url
    S9 call SAFE-5 snapA snapshot a --expect ok
    S9 call SAFE-5 tabs tabs
    S9 call SAFE-5 net network --filter localhost:8081
    S9 call SAFE-5 netall network
    S9 call SAFE-5 status status        # if rowsWith8081 > 0: Start-Sleep 2; run it once more (#167)
    ```
    `S9 id` is not needed; M (handles from block 5's output):
    `M 'Call browser_select_tab with tab <T#c>, then browser_snapshot with no arguments. Do nothing else and do not retry.'`;
    `M 'Call browser_select_tab with tab <T#w>. Do nothing else.'`. Then **end M** (prep fixer r1, S4-prep-verifier
    finding 2: M's `browser_select_tab` claimed `<T#c>`, the MCP has no release tool, and a lease dies only with its
    connection — `daemon/src/leases.ts` — so SAFE-5d's `snapC` would otherwise answer `TAB_HELD`):
    `node --import tsx recipes/s9-actor.ts end M`; `S9 wait-alone --row SAFE-5` (expect `wait-alone reached
    clients=1`; its exit 2 is a helper throw). M's transcript is extracted at block 43.
33. **SAFE-5b, SAFE-5c, SAFE-5d.**
    ```powershell
    S9 call SAFE-5b nav navigate b5 http://localhost:8083/e2e-playground.html?s9=b5b --expect 'BLOCKED:tab|url'
    S9 call SAFE-5b snap snapshot b5 --expect BLOCKED:tab
    S9 call SAFE-5b net network --filter localhost:8081
    S9 call SAFE-5b netall network
    S9 call SAFE-5c direct download http://localhost:8081/dl/hello.txt?s9=5c1 --expect BLOCKED:url
    S9 call SAFE-5c redirect download http://localhost:8083/dl/hello.txt?s9=5c2 --expect BLOCKED:url
    S9 call SAFE-5c chunk chunk s9-none --expect record
    S9 call SAFE-5d netall network
    S9 call SAFE-5d net network --filter localhost:8081
    foreach ($k in 's9=b5b','s9=5c1','s9=5c2') { foreach ($f in 'http8081.log','redirect8083.log') {
      "$k in ${f}: " + @(Select-String -Path "$env:S9_OUT\$f" -SimpleMatch $k).Count } }
    Set-S9BlockList $O -Lines @()              # the found list is empty (block 8's guard)
    S9 wait-safety --armed true --evaluate true --count 0 --row SAFE-5d
    S9 call SAFE-5d snapC snapshot c --expect ok
    Read-S9StoredState $O                      # STORED: a fresh options page; count=0 lines=0 sha256 equal to block 8's
    Set-S9Foreground $W
    ```
34. **SAFE-8.** `S9 nonce` twice → `$n1`, `$n2`. `Invoke-S9ActionButton $W`; `Wait-S9ActionTitle $W $OFF
    1000`; `Set-S9Omnibox $E "http://localhost:8080/e2e-playground.html?n8=$n1"`; `Start-Sleep 3`; `Set-S9Foreground
    $W`; `Invoke-S9ActionButton $W`; `Wait-S9ActionTitle $W $ARMED 1000`; `S9 call SAFE-8 off network
    --filter "n8=$n1"`. Control: `Set-S9Omnibox $E "http://localhost:8080/e2e-playground.html?n8=$n2"`; `Start-Sleep
    3`; `Set-S9Foreground $W`; `S9 call SAFE-8 on network --filter "n8=$n2"`.

## Console read, reload while disarmed, restore, scans

35. **SAFE-10 console half** (before the reload closes D). `Read-S9WorkerConsole $D -Out "$SCR\s9-console.txt"`;
    `S9 scan-file "$SCR\s9-console.txt" --mode console`. The file stays in the scratchpad (never committed).
36. **SAFE-9 set-up.** `node --import tsx recipes/s9-actor.ts start M2` (record pids; a fresh actor, since M ended at
    block 32; no prompt yet). `Invoke-S9ActionButton $W`; `Set-S9Switch $O -Which evaluate -On $false`;
    `Set-S9BlockList $O -Lines @('bank.example')`; `S9 wait-safety --armed false --evaluate false --count 1 --row
    SAFE-9`.
37. **SAFE-9 reload.** `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1; "exit
    $LASTEXITCODE"` (one re-run on exit 2; any other exit stops the run — the restore then waits for the user).
    Then `S9 wait-safety --armed false --evaluate false --count 1 --timeout 10000 --row SAFE-9`; `Wait-S9ActionTitle
    $W $OFF 5000`; `M2 'Call browser_status. Do nothing
    else.'`; `S9 call SAFE-9 snap snapshot a --expect DISARMED:all`; `Get-BridgeLog 6`. Record whether O and D are
    still open (`[S9Win]::IsWindow([IntPtr]$O)`, then — only if it is — whether `Get-S9DocUrl $O` still reads the options page); if O's
    page is gone, `Close-S9Window $O` (if the window remains) and `$O = Open-S9ChromePage
    'chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html'`.
38. *(reserved)*
39. *(reserved)*
40. **SAFE-11 (restore and read back; G9-1).**
    ```powershell
    $RestoredOk = Restore-S9Safety             # the safety half of Restore-S9All: reopens O if the reload closed it
    S9 probe --row SAFE-11-end
    ```
    `Restore-S9Safety` waits 1.5 s, turns `armed` and `evaluate` on with the options switches (each pressed only
    if off), saves an empty list only if the stored one is not, then reads back: `STORED read` + `STATE …` from a
    fresh options page, `ROW SAFE-11-end wait-safety reached safety armed=true evaluate=true blockedCount=0`, the
    toolbar title, and `RESTORE safety read-back: stored page equal true, daemon.status equal true, title armed
    true`. Every value equal to block 8's (armed, evaluate, count, lines, sha256, status; the title the found one).
    `$RestoredOk` is `$false`: STOP (the stop rule: `Restore-S9All`, which retries it once, then escalate).
41. **SAFE-10 log half.** `S9 scan-log --since $WaveStart --copy
    .\docs\plans\2026-10-24-step9-phase-e-safety-steps\S4-daemon-log.txt` (the copy is written only when every count
    is 0).
42. **SAFE-OPT-2.** `Invoke-S9OptionsButton $O -Id shortcuts`; `Start-Sleep 2`; `Get-S9DocUrl $O` (expect
    `chrome://extensions/shortcuts`; "nothing happens" = the old URL = FAIL).

## Teardown

43. `node --import tsx recipes/s9-actor.ts end M2` (M ended at block 32); for each of `M`, `M2`: `node --import tsx
    recipes/s9-actor.ts extract <name> --out "$SCR\s9-actor-<name>.txt"`; `S9 scan-file "$SCR\s9-actor-<name>.txt"
    --mode committed` (if it fails, no transcript line is quoted until the offending lines are identified and left
    out). `S9 cleanup`; if SAFE-REL-3 left r3 on the options page: `Close-S9Tab $W 'Chrome Agent Bridge'`.
    `$DeskOk = Restore-S9Desk` (the desk half of Restore-S9All: unpins only if `$PinnedBefore` was `$false`, puts
    `$L0` back, closes D, O, E, W, and checks the window count equals `$WinStart`; `$false` = STOP, escalate).
    `S9 daemon-shutdown` (only clients gone); `Get-BridgeDaemon` empty. `Stop-Process -Id $web.Id, $web1.Id, $red.Id`
    (each `Test-SafeToKill` first). `netstat -ano | findstr ":9234 :8080 :8081 :8083"` empty.
44. **Files to commit with the record** (each after `S9 scan-file <file> --mode committed` PASS): `S4-run-record.md`,
    `S4-daemon-log.txt`. Never the console capture, a transcript whole, a screenshot, or `$env:S9_OUT`'s logs.

## Record template (`S4-run-record.md`)

```
# Step 9 S4 — Run 13 record (§4.20)

Runner: <model> · Chrome <version> · Node <v> · HEAD <sha> · wave start <ISO>
PIDs: daemon <D9> · http8080 <p> · http8081 <p> · redirect8083 <p> · actor M host <p> claude <p> MCP <p> · actor M2 host <p> claude <p> MCP <p>

## Pre-reload state (blocks 1–6)
<lines>

## Lines (one per observation)
<UTC time> · <row> · <block> · `<observed text, verbatim>` · <PASS | FAIL | record | NOT DISCRIMINATING | NOT MEASURED> vs §4.20
L1: … · reload · 7 · `exit 0` · PASS
L2: … · SAFE-0 · 7 · `ROW SAFE-0 …` · …
…

## Found state and restore (S4.4)
start: STATE … (block 8) · end: STATE … (block 40) · equal: <yes|no>

## Set-up fixes (helper changes made live; none may change a row's expected text)
- …

## Counts (SAFE-10; printed as counts only)
daemon.log: SCAN … · console: SCAN … · this record: SCAN … · S4-daemon-log.txt: SCAN …
```

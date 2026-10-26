# S5-win builder report (Step 11, Run 16: the Windows UI Automation helpers)

Model: Claude Sonnet 5.5, effort medium. Start 2026-10-25 21:24 UTC, end 2026-10-25 21:34 UTC (`date -u`). Context use about 130k tokens. Layers followed: brief, then §4.23 (lines 1445-1552 only), then S5-actor's signal contract.

## 1. Verdict
DONE. Nothing was run against real Chrome (no UIA call on a live window, no daemon, no reload, no launch). Port 9234 untouched.

## 2. Outputs
Files (uncommitted): `recipes/s11-win.ps1` (412 lines by `wc -l`, cap 500), `recipes/s11-win-rules.ts`, `recipes/test/s11-win-rules.test.ts`, `recipes/test/s11-win-static.test.ts`, `recipes/tsconfig.s11.json` (include extended).

Commands and results:
- `npm run typecheck`: exit 0 (shared, daemon, sdk, mcp, extension).
- `npx tsc --noEmit -p recipes/tsconfig.s11.json`: exit 0, no output.
- `npm run build`: `built extension → dist/`.
- `npm test`: Test Files 150 passed (150); Tests 3738 passed (3738). Before → after: 3699 → 3738 (+39: 22 in s11-win-rules.test.ts, 17 in s11-win-static.test.ts).
- Parse (c), run as a test (spawns `powershell.exe`, `[System.Management.Automation.Language.Parser]::ParseFile`): output `PARSE OK`, zero errors. The test returns early only if powershell.exe cannot start.

Design: the file dot-sources `s10-win.ps1` (so `s9-win.ps1`), reusing without edit: Open-S10MarkedWindow, Wait-S10StableWindows, Set-S9Omnibox, Get-S9Options, Set-S9Switch, Park-S9Cursor, Get-S9OccluderIds, Invoke-S9ActionButton, Get-S10PinState, Test-S9DaemonSafety, Test-S9Banner, Test-S9Live. The salvage draft was used only as a pattern (options-page reads, the read-only toggle reader, F12); no `s11.ts` subcommand it called is needed. Pure rules live in `s11-win-rules.ts` and are mirrored in PowerShell (tied by the static test).

## 3. Step → helper map

| §4.23 step (UI Automation / options page) | Helper in `s11-win.ps1` |
|---|---|
| Open the wave's own window(s), marked; only those are acted on | `Open-S11Window` (stable window set, marker window, URL allow-list, recorded in `$global:S11Own`), `Open-S11Options`, `Open-S11Extensions`, `Test-S11Own` / `Assert-S11Own`, `Close-S11Window`, `Close-S11All` |
| UP-0 found state: armed, JavaScript, both boxes as counts and hash; texts kept outside the repo; `found.json` | `Read-S11State`, `Read-S11Stored`, `Save-S11Found` (guards a folder inside the repo; writes the actor's `found.json`) |
| UP-0 file-URL toggle, READ ONLY (G11-3, #245) | `Read-S11FileAccess` (reads ToggleState; prints `TOGGLE reading on/off/unreadable`; unreadable prints `STOP:`) |
| UP-OPT: ROOT added, saved, second window follows, typed invalid and home lines, revert, stored-while-typing | `Invoke-S11Opt` (writes OptObs plus `foundCount` and `firstTypedLine` to a JSON for `optVerdict`), `Set-S11Box`, `Add-S11Line` |
| UP-7 (a) arm off / on | `Invoke-S11Row UP-7-a` with `Set-S11Flag` (read back from a fresh page) |
| UP-7 (b) block list = found + alias, restored | `Invoke-S11Row UP-7-b` with `Set-S11BoxVerified`, `Get-S11Alias` |
| UP-7 (c) Upload folders = found (ROOT out), then ROOT back | `Invoke-S11Row UP-7-c` with `Set-S11BoxVerified` |
| UP-7J JavaScript off / on | `Invoke-S11Row UP-7J` |
| UP-DEVT F12 into window X, F12 again | `Invoke-S11Row UP-DEVT`, `Send-S11DevTools` |
| UP-RACE-A toolbar press 1.5 s after ready, again 1.6 s later; wait loop-done | `Invoke-S11Race A`, `Invoke-S11ButtonPair` (pinned and armed-title checks) |
| UP-RACE-B block list edit 1.5 s after ready, restore on loop-done | `Invoke-S11Race B` |
| Banner sampler (UP-1, UP-6, UP-6B, UP-FA) | `Invoke-S11Sampler` (`-sample` / `-sampled` signals; `.pressed` = `seen` or `none`) |
| Signal files (S5-actor contract) | `Get-S11Signal`, `Wait-S11Ready` (consumes `.ready`), `Write-S11Pressed`, `Clear-S11Signals`, `Invoke-S11Change` (ready, Do, pressed; done.ready, Undo, done.pressed) |
| Occluder and cursor-park guards | `Enter-S11Guards` (park, cursor inside W, foreign occluders fail; owned ones exempt only clear of the read rects) |
| SW-2 set-up: W in front, cursor parked | `Set-S11Front` |
| UP-RESTORE: press pair, fresh options page, only-where-differs restore, read-back by hash, daemon.status, title; found files deleted after a match | `Restore-S11Safety` |
| UP-L1 `foundcheck`, UP-LOGS `scan`, SW-2 / save / upload steps | not UI Automation: the actor's (`s11.ts`). The worker-console capture UP-LOGS needs is s9's `Open-S9WorkerConsole` / `Read-S9WorkerConsole`, reused, not rewritten |

## 4. Static tests (exit criteria)
- (a) `s11-win-static.test.ts`: no `.Toggle(` anywhere in the file; `TogglePattern` and the text "file URLs" appear only inside `Read-S11FileAccess` (comments excluded); that function contains no Toggle/Invoke/click/SetValue/SetFocus/keys/mouse/Set-S9Switch call; the only switch helper takes `armed`/`evaluate` by ValidateSet. A mutated body that adds `.Toggle()` is shown caught.
- (b) `scanPs1Output` (in `s11-win-rules.ts`): for every output statement (Say9, Stop9, Write-Host/Output/Warning/Error, echo, throw) it takes the statement text, and allows only `$` variables on a safe list (counts, flags, handles, row and box names). It rejects any other variable, `$env:`, text-returning calls (Get-S11Box, Get-S11Alias, ReadAllText, Get-S9Text, Get-Content), element values, titles/URLs, exception messages, an odd quote count, a bare text variable left in the pipeline, and a text-returning call neither assigned nor hashed. Tested on 18 known-bad lines (each flagged) and 7 known-good lines (each clean); the real file returns no violation; the safe list is itself checked to hold no text/folder/pattern/path/hash/token name; the token is not named in code outside comments and the options page's standing-text constant.
- Restore-by-hash pure part: `restoreCheck` (equal / DIFFERENT for one changed character, newline change, trailing space, empty; the line holds no text, fragment or hash), `addLine` (found text stays a byte-exact prefix, CRLF kept), `foundJson`, `toggleReading`, signal names, URL allow-list, occluder verdict. The PowerShell mirrors are tied by string checks in the static test (`$S11Warning`, `$S11Typed`, `(8081|8084)`, the name rule, suffixes).

## 5. Deviations
- The brief said "restore-by-hash tested on its pure part": done; the PowerShell side (`Set-S11BoxVerified`, `Restore-S11Safety`) is covered only statically (reads `-eq $want`, deletes found files only after `$ok`), because it needs a live window.
- `Invoke-S11Row` calls `Test-S9DaemonSafety` (it starts the SDK via `s9.ts wait-safety`); that only happens in a live run.

## 6. Findings / open points for the next slice (S5-runner)
- Untested until live (by design): the UIA exposure of the file-URL toggle on this Chrome (the sheet's known limit), the title of the `chrome://extensions/?id=` window (`Format-S9Title` accepts `Extensions - <letters>`), and `Open-S11Window`'s need for a 5 s quiet window set on first use.
- `Enter-S11Guards` and `Set-S11Front` use `$global:W` (s9's `Park-S9Cursor` needs it); the runner must set it to the wave's front window. `Get-S9OccluderIds` reads the globals `W`, `E`, `D`, `O` for owner names.
- `Invoke-S11Opt` needs `$global:S11Found` (from `Save-S11Found`) and stores `$global:S11RootText`, which `UP-7-c` and the restore use; the runner must call them in that order.
- `Invoke-S11Row` and the UP-RACE helper expect UP-RACE-A's button window to hold the pinned toolbar button; an unpinned button prints `STOP:` and returns `$false`.
- Sampler runs in the driver's own loop (no child process), so it cannot run while the driver does another UI action; the actor's contract allows this (the sampler wraps one actor call).
- PowerShell trap kept in mind: variable names are case-insensitive (`$O` / `$o`); no helper reuses a name with a different case for a different value.

## 7. Handoff
Nothing running. No PIDs, no scratch outside the repo. Files are uncommitted for the step agent to commit after the verifier's verdict. `journal.md` carries the session agent's earlier uncommitted line; it is not mine.

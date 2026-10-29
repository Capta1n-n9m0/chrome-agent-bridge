# S5-drivers-A fixer, round 2 (liveA20 driver, slice A1)

Sonnet, medium. Offline only: no daemon, Chrome, reload or live run.

| # | Result | How | Test |
|---|---|---|---|
| 1 | fixed | `s13-r20.ps1` builds the manifest path with `Join-Path (Split-Path -Parent $PSScriptRoot) 'extension\manifest.json'` and reads with `-ErrorAction Stop`; the catch is silent, so no path reaches any stream | the fallback cases now expect exactly `disk=yes` and no path/json text on any line; a mutant with the old broken path went red (2 tests), then restored |
| 2a | fixed | `clickGate` always gives round k's click signal (content `go`, or `skip` when the guard is not `fg`) and returns `skip`/`unsent`/`{at}`; later rounds after an unsent click give `skip`. PowerShell `Invoke-R19StepB` reads the ready content (`Read-R20Ready`) and `Invoke-R20PopClick` answers `unsent` on `skip` without touching UIA. A skipped round has no wait; the leg ends NOT DISCRIMINATING (not counted), not a 120 s throw | `clickGate` test (signal given each time, content), `judgePop` skip case, PS `clickSkip` (presses `unsent`, no UIA call) |
| 2b | fixed | `Invoke-R20PopClick` answers `sent <epoch ms>` stamped right after `Send-S12MouseClick`; `popRound` takes t0 from it (`stampOf`) and starts the 2.5 s wait after the trigger returns; `inMs` clamped at 0 | `stampOf` test, PS `clickSent` (stamp >= the click's end time) |
| 3 | fixed | with no `--enabled`, `proof` prints `CHECK R20-0 enabled-source=reachability (...; not read from the console)` (`ENABLED_UNREAD_20`); LOADED20 keeps its yes/no form | constant test (names source, no `enabled=` claim) |
| 4 | not done: one-window record kept | W2 needs a new window step, a signal and a `listTabs`+`claim` handshake that cannot be exercised offline; the sheet's one-window record stays (the unjoined line). Route 1 from the verifier remains open for the session agent | none |

Sizes: code 620 lines (172 + 140 + 308; was 601, limit ~630); tests grew.
Counts: `npm test` 5768 -> 5772 (242 files, none removed); `npm run typecheck`, all eight `recipes/tsconfig*.json` and `npm run build` exit 0, run after the last edit. `git status --porcelain` shows only lane files. Local path / user-name grep over S5-drivers-A* and the new recipes files: 0 hits.
Gotcha met: in a PS test, `New-R20PopSteps ... | Where-Object` hands the whole array to the filter (the function returns `, $list`); assign first.

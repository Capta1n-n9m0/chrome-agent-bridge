# S5-liveA20 fixer 1 (fix round 1 of 3)

Role: fixer (agent-rules §6). Lane: `recipes/s13-r20.ps1` and its test only. No live block was run.

## Findings fixed
- F1 (cause of the STOP): R20's `preflight` and `servers` blocks did not create `$LogDir`, so `Start-R17Srv`'s cmd redirect into `<S11_OUT>\logs\p<port>.txt` failed and python never started.
- F2: `$global:S16Mark` was never set, but R20-LOGS reads `Select-Object -Skip $global:S16Mark`.
- F3: the dist-file, Chrome-running and python-found checks, and the post-start own-server `Test-S16Port` check, were missing.

## Diff (recipes/s13-r20.ps1, `Register-R20Blocks`, about lines 104-122)
- `preflight` is now multi-line: `Assert-R17TreeClean`; the three dist-file checks; Chrome running; python found; `Set-R20Port` and the 9234 check (unchanged); `New-Item -ItemType Directory -Force $LogDir | Out-Null`; `$global:S16Mark = ...` (daemon.log line count, 0 if the file is absent); `Assert-R19CaptureFree` (unchanged). Fail texts are Run 19's.
- `servers`: the port re-check, `Start-R17Srv` and `Test-R17Listens` with their texts are unchanged. Added `New-Item ... $LogDir` before the start, and after the listen check `if (-not (Test-S16Port $global:R20Port)) { Fail-S16 "port ... is not held by the wave's own server" }`, using R20's port, not 8081.
- `Assert-S12Patched` is not added. R20 needs no patched fixture (it serves `test-fixtures` as is), and the rows do not read the S12 patch. This is my reading, not a measurement.
- The PREFLIGHT `Say9` line of Run 19 (which prints "ports 8081 free") was not restored, since it names a fixed port; R20 had none and keeps none.

## Test (recipes/test/s13-r20-ps.test.ts)
New `describe` with 2 source-level tests (it reads the ps1 text; `S13_R20_PS1` can point it at another copy):
1. preflight holds the `$LogDir` creation, the `S16Mark` set from `$DaemonLog`, the three dist paths, the Chrome and python fail texts, `Set-R20Port`, `Assert-R19CaptureFree`.
2. servers creates `$LogDir` before `Start-R17Srv`, checks `Test-S16Port $global:R20Port`, and holds no `8081`.

Red: run against `git show HEAD:recipes/s13-r20.ps1` (copy in `$TEMP`, so the main tree was not touched): 2 failed, 30 passed. Evidence: `S5-liveA20-fixer1-red.txt`.
Green: `npx vitest run recipes/test/s13-r20-ps.test.ts`: 32 passed.

## Checks
- `npm test`: 5798 tests, 243 files (with only the ps1 edit) -> 5800 passed, 243 files after the two new tests. All green.
- Recipes typechecks: `tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`: all exit 0.
- `S11_OUT=<TEMP>/bridge-e2e/s20-fix1-plan powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-a.ps1 -Block plan`: exit 0, printed `PLAN liveA20: preflight servers files ... r20-restore r20-logs` (`S5-liveA20-fixer1-plan.txt`).

## Not done / notes
- The ps1 blocks themselves are still not exercised by a behavioural test (they need Chrome, a port, git). The tests are source checks; the live re-run is the real proof.
- The untracked attempt-1 evidence files in the steps dir were left as they are. No commit.

# S5-liveA20 ledger (step agent, Claude Opus 5.5, medium)

- 16:22Z start: `git status --short` empty; HEAD `a32cb8c`. Nothing listening on 9234 or 8080-8089. `-Block plan` liveA20:
  preflight servers files window reload console r20-0 r20-pop-bg r20-pop-fg r20-pop-other r20-pop-none r20-args-order
  r20-con-desc r20-con-notea r20-con-cap r20-args-3 r20-con-4 r20-con-floor r20-con-notea-b r20-args-old r20-restore
  r20-logs (22 blocks). Budgets: attempts 0 of 3; fix rounds 0 of 3 (per slice, #367).
- Next: runner attempt 1 (Sonnet, medium), out `$TEMP/bridge-e2e/s20-live/a1` (fresh), `-Att 1`.
- liveA20 att1 (runner Sonnet medium; out `$TEMP/bridge-e2e/s20-live/a1`; HEAD a32cb8c; build `built extension → dist/`):
  exit 2 at 16:24:15Z. Only `PORT 8081 … listed=119` printed; `STOP: the fixture server did not answer` ->
  `STOP throw-after-state` -> `RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a` (matched). No ROW, no
  state change, no window opened; reload block never ran. Teardown exit 0 `CHECK clean PASS`. 9234 and 8080-8089 free.
  Attempts 1 of 3. Runner report `S5-liveA20-runner-att1.md`.
- Diagnosis (step agent, 16:30Z): helper defect. `recipes/s13-r20.ps1:104-110` (R20's own preflight and servers) drop
  R19's `New-Item -ItemType Directory -Force $LogDir` (s12-r19.ps1:83, :89), so `Start-R17Srv`'s cmd redirect into
  `<S11_OUT>\logs\p8081.txt` fails and python never starts. Same command by hand into an existing dir: LISTENS in 4 s
  (own PIDs killed). R20's preflight also drops R19's `$global:S16Mark` (daemon-log mark used by R20-LOGS,
  s13-r20.ps1:208), the dist, Chrome and python checks, and servers' `Test-S16Port` own-server check.
- Next: fix round 1 of 3 (fixer Sonnet medium -> `S5-liveA20-fixer1.md`; verifier Opus medium -> `S5-liveA20-verifier1.md`).
- Fix round 1 (1 of 3): fixer DONE (`S5-liveA20-fixer1.md`): s13-r20.ps1 preflight/servers restored (LogDir, S16Mark,
  dist/Chrome/python checks, own-server port check); 2 source tests red on HEAD, green after; npm test 5798 -> 5800, 243
  files; eight recipes tsconfigs exit 0; `-Block plan` exit 0. Verifier Opus medium started -> `S5-liveA20-verifier1.md`.
- Fix round 1 verifier (Opus medium): FAIL (`S5-liveA20-verifier1.md`): the round-1 diff confirmed correct (npm test 5800,
  243 files; 8 recipes tsconfigs 0; plan 22 blocks), but F1 BLOCKER: `s13-r20-a.ps1` lacks Run 19's top-level
  `$FixtureHuman`, `$Fix81`, `$Blk`, `$EncName` (s12-r19.ps1:46-49) read by reused `files`/`window` -> attempt 2 would
  stop in `files`. F2 MAJOR latent: reused `window` and `r17b-0` hard-code 8081 while R20's port is chosen at run time.
  Ruling (step agent, conservative): F2 option (a): preflight fails before any state change when `$global:R20Port -ne 8081`.
- Next: fix round 2 of 3 (fixer Sonnet medium -> `S5-liveA20-fixer2.md`; verifier Opus -> `S5-liveA20-verifier2.md`).
- Fix round 2 (2 of 3): fixer DONE (`S5-liveA20-fixer2.md`): s13-r20-a.ps1 gains the four R19 top-level vars and the
  `root-add` guard; preflight fails when the chosen port is not 8081 (F2 (a)); 4 source tests (parity derived from
  s12-r19.ps1), red 5 failed on HEAD; npm test 5800 -> 5804, 243 files; 8 tsconfigs 0; plan exit 0 (step agent re-ran).
  Verifier2 Opus medium started -> `S5-liveA20-verifier2.md`.
- Fix round 2 verifier (Opus medium): PASS-with-notes (`S5-liveA20-verifier2.md`): F1, F2 fixed; npm test 5804, 243
  files; 8 tsconfigs 0; plan exit 0; static walk preflight→R20-0 found nothing with S11_OUT set. M1 MINOR latent
  (s11-win.ps1 fixes `$S11Out` before the S11_OUT default; runner always sets S11_OUT — accepted as a note). Two home
  paths redacted to <home> in fixer1-red and runner-att1. Next: committer, then attempt 2 (`-Att 2`, fresh S11_OUT).
- Fix rounds 1-2 committed `3c6def3` (verifier PASS-with-notes). Fix rounds used 2 of 3.
- liveA20 att2 started (runner Sonnet medium; out `$TEMP/bridge-e2e/s20-live/a2`; `-Att 2`; stdout
  `$TEMP/bridge-e2e/s20-live-a2-stdout.txt`, exit file `s20-live-a2.exit`). Attempts 2 of 3.
- liveA20 att2 (runner Sonnet medium; out `$TEMP/bridge-e2e/s20-live/a2`; HEAD 3c6def3; build clean): 16:58:39Z-17:01:39Z,
  exit 2. `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`; ROW R20-0 PASS,
  POP-BG FAIL, POP-FG FAIL, POP-OTHER FAIL (unjoined NOT MEASURED), POP-NONE PASS, ARGS-ORDER RECORD, CON-DESC PASS,
  CON-CAP PASS, ARGS-3 PASS, CON-4 PASS, CON-FLOOR PASS; CON-NOTEA a-legs PASS (no ROW: the row ends with leg b). STOP in
  r20-con-notea-b before its state change: `window 30346380 is not on this extension's options page` (s9-win.ps1:605, from
  Set-S11Box via Set-R19BlockAdd on O) -> `STOP throw-after-state` -> `RETURN 1 after-stop=throw-after-state
  restored=yes readback=equal` (matched). Not reached: NOTEA ROW, ARGS-OLD, RESTORE's DIALOGS, R20-LOGS. Teardown exit 0
  `CHECK clean PASS`; the wave left `node … s13-r20-a2.ts con-notea-b` running (runner killed it, the wave's own).
  9234 daemon only; 8080-8089 free. Attempts 2 of 3.
- Step-agent notes on the POP FAILs (not judged here, for S5-record): `granted-to=A others=0` in every bg/fg/third
  round (no popup-lease-wrong), but `held-call=ok` printed while each ANSWER line reads `TAB_HELD control=TAB_HELD
  own=ok`, and `console-new=95/90/129` from whole-capture line counts (`Get-R20ConsoleCount`, s13-r20.ps1:155). Both
  look like reader questions on rows already run: not touched by a fix round (integrity floor; escalated in the report).
- Diagnosis of the STOP: Set-S11Box/Set-S9Switch read O's document without reloading it; the last fresh options load
  of O was ARGS-3's restore STATE read (17:01:08); after CON-4/CON-FLOOR's toolbar presses the UIA doc URL no longer
  read as the options page. Cause not proven. Fix round 3 (last): before the block add and before its restore, load O
  fresh via Read-S11Stored (as every other state step does); print O's url-class on a failure; stop the row's actor
  on a STOP if it is in R20's lane.
- Fix round 3 (3 of 3, last): fixer DONE (`S5-liveA20-fixer3.md`): `Invoke-R20OptionsStep` (fresh Read-S11Stored of O
  before the NOTEA-b change, undo and -Restore; url-class CHECK on the failure, rethrow); orphan cause not proven, outside
  lane (s11b-r17.ps1 Stop-S16Pid: no exit check, /F without /T); 3 source tests red on HEAD; npm test 5804 -> 5807,
  243 files; 8 tsconfigs 0; plan exit 0. Verifier3 Opus medium started -> `S5-liveA20-verifier3.md`.
- Fix round 3 verifier (Opus medium): PASS-with-notes (`S5-liveA20-verifier3.md`): npm test 5807, 243 files; 8
  tsconfigs 0; plan exit 0; static walk NOTEA-b → ARGS-OLD → RESTORE → LOGS found no dropped setup or stale read. N1, N2
  MINOR; N3 MAJOR out of lane: the orphan is the real node under the nvm shim (`taskkill /F` without `/T`,
  s11b-r17.ps1:94), only after an actor-row STOP. Fix rounds 3 of 3 used. Next: committer, then attempt 3 (last).
- Redacted the capture's window-title line (profile display name, as #283) to <user> in S5-liveA20-console-att2-1.txt; the runner's scan missed it.

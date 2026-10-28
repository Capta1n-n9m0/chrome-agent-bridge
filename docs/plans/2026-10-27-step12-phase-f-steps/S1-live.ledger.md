# S1-live ledger (step agent, Claude Opus 5.5, medium)

- 2026-10-28 start: `git status --short` empty; HEAD `e1e68e00ec53a589738c7b376d2246c2411c362d`. 9234 and 8080-8089 not
  listening. `-Block plan` printed liveA18 and liveB18 orders (both end in `teardown`).
- Fix rounds used: 0 of 3. Runner attempts: liveA18 0, liveB18 0 (max 3 each, phase doc § S1).
- liveA18 att1 (runner Sonnet; out `$TEMP/bridge-e2e/s12-live/a1`): build from e1e68e0 clean; exit 2. Passed before the
  stop: R18-0, UP-L1 (console clause pending), R18-BANNER-CTL slice=A PASS (neg none, pos seen). STOP line:
  `STOP: the wave ended (an exception in block r18-up-opt (ParameterBindingArgumentTransformationException; ... Get-S9Options))`
  -> return matched (runner returned). Restore read-back: `RESTORE uploadfolders lines=0 hash=equal`, stored page,
  daemon.status, title equal. Not a failed-restore STOP -> teardown run by step agent with a1: exit 0, CHECK clean PASS.
  Daemon PID 35188 (node, wave-spawned) left on 9234 for the next attempt.
- Diagnosis (step agent): `recipes/s12-win.ps1` `$S12OptPairs` replaces Invoke-S11Opt's poll with `$o2 = Wait-S12O2 $O2 ...`;
  PowerShell names are case-insensitive, so `$o2` overwrites the window handle `$O2`, and the next `Get-S9Options $O2`
  fails [long] binding (the `$o`/`$global:O` trap class, recipes/CLAUDE.md). Helper defect between rows -> fix round 1.
- Fix round 1 (fixer Sonnet, verifier Opus PASS-with-notes; S1-live-fixer.md, S1-live-verifier.md): `$o2` -> `$o2Res`
  in `$S12OptPairs`; behavioural test red on old file. Committed `b8b493d`. Fix rounds used: 1 of 3.
- liveA18 att2 next: rebuild at b8b493d (product code unchanged), fresh out `$TEMP/bridge-e2e/s12-live/a2`, `-Att 2`.
- liveA18 att2 (runner Sonnet; out `$TEMP/bridge-e2e/s12-live/a2`; HEAD b8b493d, build clean): exit 2. STOP lines:
  `CHECK R18-LOGS scan actors FAIL: STOP: a non-zero count (...)` after `SCAN actors: ://=1 (fixture 1, other 0) token=0
  sentinel=0 profile=2`, then `STOP: the wave ended (an exception in block r18-logs (RuntimeException: node s11b scan18
  ended in a STOP))` -> return matched (runner returned). Restore read back equal (`RESTORE armed=equal evaluate=equal
  blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; R18-RESTORE PASS slice=A). Not a failed-restore STOP:
  teardown by step agent, exit 0, CHECK clean PASS.
- Step agent's reading of profile=2 (actor turn file sv-cycle, the lines `resultLines` keeps): (1) the MCP failure
  report's `[1/3] Screenshot: <HOME>\.chrome-agent-bridge\failures\...png` (product output of browser_evaluate's
  PAGE_ERROR on the saveTo cycle leg); (2) Claude Code's own `[3/3] [Image: source: <HOME>\.claude\projects\...]`.
  Neither is a helper defect fixable between rows: excluding them weakens a pre-registered log scan (agent-rules §2),
  and the product is out of lane. A re-run measures the same. -> ESCALATE to the session agent; liveB18 not started.
- Daemon PID 9816 (repo daemon/dist/index.js, wave-spawned) stopped by `recipes/s9.ts daemon-shutdown`; nothing listens
  on 9234 or 8080-8089 (20:52Z). Fix rounds used: 1 of 3. Attempts: liveA18 2, liveB18 0.
- 2026-10-27 20:56Z liveB18 (new step agent, Claude Opus 5.5, medium; ruling #349): `git status --short` empty; HEAD
  `4a46a22bcc1d20ad0b893647091c8fa16b232936` (docs only since b8b493d). `npm run build` -> `built extension → dist/`, tree
  clean after. 9234 and 8080-8089 not listening. Out `$TEMP/bridge-e2e/s12-live/b1` (fresh, empty), `-Att 1`. Runner Sonnet next.
- 2026-10-28 liveB18 att1 (runner Sonnet; out `$TEMP/bridge-e2e/s12-live/b1`): exit 0, no STOP; `CHECK rows n=19 verdict=FAIL`. The liveB18 step agent stalled (ended its turn on the running runner; #350). No listener on 9234 or 8080-8089 at 03:05Z (session agent). Attempts used: liveA18 2, liveB18 1; fix rounds 1 of 3. S1-live closed; S1-record next.

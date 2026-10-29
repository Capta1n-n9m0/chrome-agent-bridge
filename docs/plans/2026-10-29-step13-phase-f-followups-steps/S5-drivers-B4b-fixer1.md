# S5-drivers-B4b fixer, round 1

Model and effort: Sonnet, medium. Nothing ran against Chrome, a daemon, a fixture server or a port; no commit.

## 1. Verdict

DONE. F1 to F4 and NIT-1 to NIT-3 are fixed. None disputed. No pass rule or expected text changed.

## 2. Outputs

- `recipes/s13-r20-b-defs.ps1`: `Test-R20NodeAlive` now treats a PID whose start time differs from `$global:S16Born['node']` as gone (Run 17 records it in `Set-S16Pid`, read in `Stop-S16Pid`). `Invoke-R20Serve($Handlers, $BudgetS = 600, $IdleS = 120)` throws `serve exceeded its budget of <n> s` or `no ready signal for serve within the bound (<n> s)` (idle bound since the start or the last answer). `Invoke-R20Ch` passes `s = 600` in its serve step.
- `recipes/s13-r20.ps1` line 183: the `serve` branch passes `$S.s` (default 600) and `$S.i` (default 120) to `Invoke-R20Serve`. Nothing else changed there; the `val` branch is untouched.
- `recipes/test/s13-r20-b-ps.test.ts`: 28 → 32 tests. New: born check, serve bounds with a live silent process (idle, budget, reused PID returns), r20-0b rotates an existing evidence file, root flag stays False when the wrapped `root-add` throws, teardown copy text order. `outside-file-reached-page` added to `SLICE_B_STOPS` (13 reasons now); the per-reason test titles say they prove the pairing only.
- New lines: about 14 in the defs file, about 45 in the test, 0 net in `s13-r20.ps1`; stage total stays well under 1.5 x 600.
- Counts: `npm test` **5934 passed / 248 files** (start 5930 / 248; +4 tests, none removed). `npm run typecheck`, all eight `recipes/tsconfig*.json`, `npm run build`, `node scripts/doc-check.mjs`: exit 0 (`S5-drivers-B4b-fixer1-gates.txt`).
- Mutants and F1's red proof, all on scratch copies outside the repo with `S13_R20_REPO`, no node_modules junction: `S5-drivers-B4b-fixer1-mutants.txt`. The old unbounded loop: red (the silent live process was never answered, the run hit its 180 s spawn limit). `no-idle-bound`, `no-budget-bound`, `no-born-check`, `no-rotate-in-0b` (2 failed), `teardown-no-copy`, `root-flag-first`: each 1 or 2 failed, all killed. (The first `teardown-no-copy` try did not change the file; the redo is the valid line.)

## 3. Verifier verdict

Not applicable (fixer). Findings answered: F1 fixed with test; F2 fixed; F3 fixed (three mutants now killed); F4 in section 8; NIT-1 and NIT-3 below and in the test title; NIT-2 left (cosmetic, already noted by the builder).

## 4. Deviations

None. `recipes/s13-r20.ps1` and its dispatch line were edited because the serve step's bounds have to reach `Invoke-R20Serve` (inside the lane `recipes/s13-*.ps1`).

## 5. Proposed decisions

### 2026-10-30 · S5-drivers-B4b: `outside-file-reached-page` is a STOP no slice-B reader raises
**Decided:** The sheet (section 4.28) lists `outside-file-reached-page` for R20-CHOOSE-* and R20-VERSION, and `STOP_REASONS_20` knows it, so the pairing check accepts it. No slice-B actor raises it: `s13-r20-b.ts` sends only files from the wave's own folder (`fileOf`, under ROOT, added by `root-add` before those rows), so it has no reader that looks for an outside file on the page. The reader that raises it is Run 19's (`s12-r19-c.ts`: `outsideReached`, `outsideDigestHit`), which slice B does not call. If the reason appears anyway (a future reader), the how-to says escalate and do not commit the record. **Why:** keeping the reason in the list costs nothing and the sheet lists it; inventing a reader would add a pass rule. **Instead of:** adding a new outside-file check to slice B (a pass rule the sheet does not state). **Revisit if:** a slice-B row is changed to send a path outside ROOT. **By:** Claude (proposed)

### 2026-10-30 · S5-drivers-B4b: the ROOT guard in R20-VERSION is a defensive NOT RUN reason (NIT-1)
**Decided:** `R20-VERSION NOT RUN -- ROOT is not in the Upload folders` stays as a defensive guard. It is unreachable in liveB20: `root-add` always runs first and a failing `root-add` throws, which STOPs the wave. The sheet's up-front list names only "old build cannot be loaded"; this reason is not added to it, and NOT RUN never counts as a pass, so it cannot flatter a result. **Instead of:** dropping the guard. **Revisit if:** a block order lets VERSION run without `root-add`. **By:** Claude (proposed)

## 6. Findings

- Measured (PowerShell 5.1, test): `Get-Process -Id` stays true for a reused PID; the start time compare is what tells the wave's own node apart (Run 17's `S16Born`). A silent live child with the old loop never returned (verifier's hang probe, again here as the red proof).
- Nothing else new.

## 7. Handoff

Nothing is running; no PID, log or watcher. Scratch copies are in the session scratchpad. The step agent copies section 8 below into the builder's report section 8, then starts a fresh verifier on F1 to F4.

## 8. How to run liveB20

**Ready to run** once this stage's commit and the session agent's bookkeeping are committed.

- **Command.** From the repo root, from **Git Bash** (python is on Git Bash's PATH), **in the background** (a slice outlasts the 600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-b.ps1 -Block liveB20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`.
  - `-Block plan` prints the order and runs nothing.
  - `-Block teardown -Att <k>` cleans up after the slice or a return (see the exception under Resume). **Run it with the attempt's own `S11_OUT`** (the one that attempt used, not a fresh one): the globals file, the capture and `r20-pop3-evidence.txt` are read from it, and with another folder the evidence copy silently copies nothing. It also copies the -3 evidence file into the steps dir.
  - Exit codes: 0 done, 2 STOP, 3 not run.
- **Prerequisites:**
  - A clean tree at a committed HEAD (every bookkeeping edit committed), then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found.
  - Port 9234 free or held by the daemon; **port 8081 free** (the `servers` block starts the fixture server; the actors' URLs hard-code 8081).
  - ROOT: the `root-add` block adds the wave's own folder `<S11_OUT>\wave\root` to the Upload folders after the -3 rows; nothing to do by hand.
  - **The old build `63c771c`** for R20-VERSION: network for the scratch worktree's own `npm ci`, which lives under `S11_OUT` (the code refuses one inside the repo).
  - Window X (the wave's window) in front for the UIA click of R20-POP-OTHER-3's `human` leg; the screen must hold room for two windows side by side of at least 500 x 400 each (R20-G2-1's `uncovered` leg), otherwise that leg is NOT MEASURED.
- **Expected first record lines (R20-0B):** `MANIFEST ...`, then exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, then R20-0's remaining lines, `HEAD <sha> tree=clean`, the S4 line and `ROW R20-0B PASS slice=B`.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveB20.txt` (`-att<k>` for a later attempt); the -3 rows' counts in `S13-live-evidence-liveB20-pop3[-att<k>].txt` (written at R20-LOGS or at teardown). In `S11_OUT`: the console segments `console-liveB20-<k>.txt`, the actors file `actors-liveB20.jsonl`, the scan inputs and `r20-pop3-evidence.txt`. The window rectangles' answers stay in `S11_OUT`; only the printed `RECT` lines reach the record.
- **What each STOP return means** (every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=... readback=...`, and the runner returns):
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0B, before any state change): rebuild and reload, new attempt.
  - `popup-lease-wrong` (the -3 rows): a product defect; escalate.
  - `existing-tool-changed` (R20-VERSION's control upload, with the old build loaded): escalate; the swap restores HEAD first.
  - `chooser-interception-left-on` (a CHOOSE row's control upload failed): check the safety state first; escalate.
  - `outside-file-reached-page` (listed by the sheet for the CHOOSE rows and R20-VERSION; no slice-B reader raises it, the actors send only files under ROOT): if it appears, escalate and do not commit the record until it is understood.
  - `dialog-left-open`, `devtools-left-open` (a native dialog or a DevTools window left on screen): close it only with the user.
  - `old-build-left-loaded` (the swap could not restore HEAD, reload it and prove it): check which build is loaded before anything else.
  - `not-restored` (the read-back differs from R20-0B's by count or hash): escalate; never retry past it.
  - `text-leak` (R20-LOGS: a name, path, sentinel or token count above 0): escalate and do not commit the record.
  - `throw-after-state` (a helper or environment throw after the first state change; the restore ran first). Includes R20-G2-1's `wb-unknown` (B's window not found), and a **hung slice-B actor row**: the serve step throws `no ready signal for serve within the bound (120 s)` when the actor neither asks for a step nor exits for 120 s, or `serve exceeded its budget of 600 s` for the row; the runner then kills the actor (only the wave's own node, by recorded start time), restores, and returns. A slice that never exits cannot happen any more: it returns as this STOP. What to do: read the actor's capture in `S11_OUT`, note the row as not measured by the record's own lines, fix a helper only between rows, then teardown and a new attempt.
- **R20-VERSION's NOT RUN outcomes** (printed as `ROW R20-VERSION NOT RUN ...`): (1) the old build `63c771c` cannot be loaded, either because its reload failed twice (exit 2 twice) or because its own proof reads neither `keys=sorted` nor `perm=no`; (2) ROOT is not in the Upload folders (a defensive guard, unreachable while `root-add` runs first). Both are recorded as NOT RUN, never a pass, and the wave goes on to R20-RESTORE and R20-LOGS; the swap's `finally` has already restored HEAD and printed `LOADED20 rerun=<k>`. A failed restore of HEAD is the STOP `old-build-left-loaded`, not a NOT RUN.
- **Resume after a return:** run `-Block teardown -Att <k>` with that attempt's own `S11_OUT`; fix a helper only between rows, never past a STOP line; a new attempt takes `-Att <k+1>` and a fresh `S11_OUT` (at most three per slice). **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user. A leg that ends NOT MEASURED, NOT DISCRIMINATING, NOT RUN or RECORD is recorded and the wave goes on.

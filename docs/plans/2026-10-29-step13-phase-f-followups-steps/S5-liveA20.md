# S5-liveA20 — Run 20, live slice A (step report)

Step agent: Claude Opus 5.5, medium. Runners, fixers and committers Sonnet medium; verifiers Opus medium.
READ (as briefed): `S5-drivers-A2.md` §6, §8; `S5-drivers-A.md` §7; `docs/e2e-test-plan.md` §4.28 (lines 1938-2002); the
phase doc § S5, Exit checks, Human gates, STOP rules; `recipes/CLAUDE.md`; root `CLAUDE.md`. Ledger: `S5-liveA20.ledger.md`.

## 1. Verdict

**DONE.** Attempt 3 of 3 ran the whole slice, exit 0: final record `S13-live-record-liveA20-att3.txt`, 15 ids with one
`ROW` each (`CHECK rows20 rows=15 warns=0 stop-return=0`). Fix rounds used: 3 of 3. Rows are not judged here (S5-record).

## 2. Outputs

| Attempt | HEAD | Exit | Ended at | Record | Runner report |
|---|---|---|---|---|---|
| 1 | a32cb8c | 2 | `servers`, before R20-0 | `S13-live-record-liveA20.txt` | `S5-liveA20-runner-att1.md` |
| 2 | 3c6def3 | 2 | `r20-con-notea-b`, before its state change | `S13-live-record-liveA20-att2.txt` | `S5-liveA20-runner-att2.md` |
| 3 | 10db89d | 0 | the end (R20-LOGS) | `S13-live-record-liveA20-att3.txt` | `S5-liveA20-runner-att3.md` |

**Attempt 3, rows as printed:** R20-0 PASS; R20-POP-BG FAIL; R20-POP-FG FAIL; R20-POP-OTHER FAIL (with `ROW R20-POP-OTHER
unjoined NOT MEASURED — no unjoined tab can be made`); R20-POP-NONE PASS; R20-ARGS-ORDER RECORD; R20-CON-DESC PASS;
R20-CON-CAP PASS; R20-ARGS-3 PASS; R20-CON-4 PASS; R20-CON-FLOOR PASS; R20-CON-NOTEA PASS; R20-ARGS-OLD PASS;
R20-RESTORE PASS; R20-LOGS PASS.

- **R5.2:** `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered` (second line, after
  `MANIFEST …`); old build `LOADED20 keys=sorted nested=sorted elem=sorted perm=yes listener=no enabled=yes args=VERSION`;
  back on HEAD `LOADED20 rerun=1 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`.
- **R5.4:** `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`,
  `RESTORECHECK stored=equal differs-by=none`, `RESTOREHEAD ok`; `DIALOGS liveA20 native=0 devtools=0 wave-windows-open=1`.
- **R5.5:** `SCAN20` console, daemon, evidence: `name=0 sentinel=0 token=0`; actors: `browser_new_tab` and
  `browser_snapshot` 0/0/0, `browser_evaluate name=0 sentinel=2 token=0`, `browser_console_messages name=0 sentinel=13
  token=0`.
- **R5.6:** STOP/RETURN pairs, all matched: att1 `STOP throw-after-state` → `RETURN 1 after-stop=throw-after-state
  restored=n/a readback=n/a`; att2 `STOP throw-after-state` → `RETURN 1 after-stop=throw-after-state restored=yes
  readback=equal`; att3 none.
- **Fix rounds** (each Sonnet fixer, Opus verifier): round 1 `S5-liveA20-fixer1.md` / `-verifier1.md` FAIL (a second
  dropped setup found) → round 2 `-fixer2.md` / `-verifier2.md` PASS-with-notes, committed `3c6def3`; round 3
  `-fixer3.md` / `-verifier3.md` PASS-with-notes, committed `10db89d`. `npm test` 5798 → 5807 passed, 243 files; the
  eight recipes tsconfigs exit 0. Only `recipes/s13-r20.ps1`, `recipes/s13-r20-a.ps1`, `recipes/test/s13-r20-ps.test.ts`
  changed; no expected text, STOP rule, pass rule or judge.

## 3. Verifier verdicts

`S5-liveA20-verifier1.md` FAIL; `-verifier2.md` PASS-with-notes (M1 MINOR: `S11_OUT` must be set, which every run does);
`-verifier3.md` PASS-with-notes (N1, N2 MINOR; N3 MAJOR out of lane, below).

## 4. Deviations

- The R20 helpers had never run live before attempt 1. Two of the three fix rounds restored Run 19 setup that R20's own
  blocks had dropped: the log dir, the daemon-log mark and the preflight checks (round 1); four top-level variables
  (round 2). Round 2 also makes preflight refuse any port other than 8081, because the reused Run 17 window and R20-0
  pages hard-code it. That is the step agent's conservative ruling on verifier1 F2.
- Round 3 loads the wave's options window fresh before NOTEA-b's block edit, its undo and its restore. Why it was off
  the options page after the toolbar rows in attempt 2 is not proven.
- I redacted two committed evidence files by hand: home paths in `S5-liveA20-fixer1-red.txt` and
  `S5-liveA20-runner-att1.md`, and the `DevTools - <profile name>` title line in `S5-liveA20-console-att2-1.txt` (#283).

## 5. Proposed decisions

### 2026-10-29 · S5-liveA20: R20's preflight refuses a port other than 8081
**Decided:** liveA20's preflight fails before any state change when the chosen fixture port is not 8081. **Why:** the
reused Run 17 `window` block and R20-0's `r17b-0` hard-code 8081 (verifier1 F2). **Instead of:** recording it as a known
limit. **Revisit if:** 8081 is often held, or a later slice reuses the chooser. **By:** Claude (proposed)

## 6. Findings (for S5-record and the session agent; not judged here)

1. **POP-BG, -FG, -OTHER FAIL in attempts 2 and 3, the same way.** Every bg, fg and third leg prints
   `granted-to=A others=0` and an in-ms of 60-95 (no `popup-lease-wrong`). The FAIL comes from two clauses:
   - `held-call=ok`, printed while each round's `ANSWER … TAB_HELD control=TAB_HELD own=ok` shows B's call refused.
   - `console-new=95/90/129`. That count is the whole worker-console capture's line count, read before and after the
     leg (`Get-R20ConsoleCount`, `recipes/s13-r20.ps1` ~155), not only lines between a popup and its grant.

   Both look like reader questions on rows that have already run. The step agent changed neither (integrity floor:
   never re-tune after a FAIL). They need a ruling. POP-OTHER's `human` leg reads `granted-to=none`. POP-OTHER also
   prints `CHECK … third b-window=W (sheet: W2)`.
2. **`DIALOGS … wave-windows-open=1` at R20-RESTORE**, while §4.28 expects 0. The window is the options window that
   `rd-restore` opened afresh (`Write-R19Dialogs` counts `$global:O`, `recipes/s12-r19-c.ps1:58`). Teardown closed it at
   17:31:22Z. The row's own judge printed PASS.
3. **N3, harness, out of lane.** After a STOP inside an actor row, `Stop-S16Pid` kills only the nvm `node.exe` shim
   (`taskkill /F` without `/T`, `recipes/s11b-r17.ps1:94`). The real node, the actor, survives. Measured by verifier3.
   In attempt 2 the runner killed the survivor. A clean run leaves none, and attempt 3 left none. A fix belongs in
   Run 17's helper (kill the shim's direct child first) and needs a ruling.
4. **Candidate gotcha** (recipes/CLAUDE.md, Run 20's helper facts):
   - A block runner that replaces a reused block must carry over that block's setup lines and the entry script's
     top-level variables. `s13-r20-ps.test.ts` now derives that list from `s12-r19.ps1`.
   - UIA can read the wave's options window as off the options page after toolbar presses; load it fresh before setting
     a box.
   - The worker-console capture's first line is the DevTools window title, which carries the profile name.

## 7. Handoff

Nothing of the wave is running. 9234 is held only by the daemon (PID 35332); 8080-8089 are free. No orphan was found
after attempt 3. Teardown closed every wave window: no native dialog, DevTools or options window is left on screen, as
far as the runner could see. The safety state is as found, by count and hash. `git worktree list` shows the main tree
only. A scratch `old-wt` folder remains under `$TEMP/bridge-e2e/s20-live/a3`, outside the repo. Nothing needs the user's
keyboard. The user or session agent needs to rule on finding 1 (POP readers) and finding 3 (the orphan fix).

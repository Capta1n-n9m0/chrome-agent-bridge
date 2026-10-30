# S5-liveC20 — Run 20, live slice C: the DevTools rows (step report)

Step agent: Claude Opus 5.5, medium. Runner and committer Sonnet medium; verifier Opus medium. No fixer was needed.
READ (as briefed): `docs/agent-rules.md`; the phase doc § 0.8, S5, Exit checks, Human gates, STOP rules; decisions #399,
#405, #413–#417; `docs/e2e-test-plan.md` §4.28 lines 1952, 1988–2014; `S5-drivers-C.md` §5–§8; `S5-drivers-C4.md`;
`S5-liveB20.md` and its ledger; `S5-liveA20.md` and its ledger. Ledger: `S5-liveC20.ledger.md`.

## 1. Verdict

**DONE, with one escalation.** Attempt 1 of 3 ran the whole slice, exit 0, at HEAD `777400d`: record
`S13-live-record-liveC20.txt`, 8 ids with one `ROW` each (`CHECK rows20 rows=8 warns=0 stop-return=0`). Fix rounds
used: 0 of 3. The verifier gave PASS-with-notes. The escalation: R20-0C read the DevTools dock side as `unread`. Under
the sheet's own rule, that made the five DevTools rows NOT RUN, so #369's two conditions are still unmeasured. It also
meets #413's Revisit-if, which is agent-rules §3 item 8, so this stage made no helper fix and no second attempt (§6).

## 2. Outputs

| Attempt | HEAD | Exit | Ended at | Record | Runner report |
|---|---|---|---|---|---|
| 1 | 777400d | 0 | the end (R20-LOGS) | `S13-live-record-liveC20.txt` (97 lines) | `S5-liveC20-runner-att1.md` |

**Run details:** build `built extension → dist/`, reload exit 0. The run lasted 02:50:35Z–02:52:06Z, and teardown
printed `CHECK clean PASS`. Raw output went to `$TEMP/bridge-e2e/s20-liveC/a1` (outside the repo; not committed).

**Rows as printed (the verifier re-derived the same verdict for each):**
- R20-0C: PASS.
- R20-DEVT-UNDOCK, R20-DEVT-EARLY, R20-UP-DEVT, R20-KEEP-4 and R20-SWEEP-HELD: NOT RUN, "dock side unreadable, it could
  not be restored".
- R20-RESTORE: NOT MEASURED, by #416's form ("found side unread, nothing changed").
- R20-LOGS: PASS.
- `FLAG debugging-flag=no` (RECORD). Found dock side: `DOCK R20-0C side=unread`, read back as `unread`.

**Exit checks:**
- **R5.2:** `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered` (second line,
  after `MANIFEST …`), `HEAD 777400df57e3 tree=clean`, `S4 commit=ancestor`, `ROW R20-0C PASS slice=C`.
- **R5.3:** every row's verdict was judged by its pre-written text (verifier1 §3).
- **R5.4:** `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`,
  `RESTORECHECK stored=equal differs-by=none`, `DIALOGS C native=0 devtools=0 wave-windows-open=1` (F1 below).
- **R5.5:** `SCAN20` console, daemon and evidence all read `name=0 sentinel=0 token=0`. There is no actors file,
  because no actor row ran. The verifier's own re-scan of the repo files and the raw out dir found the token 0 and the
  user's name 0. The one exception is the capture's raw title line (outside the repo), which the scanned file drops.
- **R5.6:** no STOP and no RETURN in the record or the ledger.

**State after:** 9234 is held only by the daemon (PID 30016). 8080–8089 are free. There are 0 DevTools-titled windows,
and the worktree list shows the main tree only. One unrelated node process was left untouched. The dock side is as
found: no dock change ran (verifier1 traced `$global:R20CDockChanged`). Teardown closed the capture window, the options
window and window X.

## 3. Verifier verdict

`S5-liveC20-verifier1.md`: **PASS-with-notes**, with three MINOR findings and two NITs:
- **F1 (MINOR):** `wave-windows-open=1` is the options window that rd-restore opened. Slices A and B and Run 19 print
  the same. It needs the ruling the A and B notes already ask for.
- **F2 (MINOR):** `Restore-R20CDock` drops the `remaining` count from its DevTools close. A docked pane left open by
  the read-back would not STOP. Nothing remained: teardown closed X about 44 s later.
- **F3 (MINOR):** the dock read prints no line naming which UIA step gave `unread`.
- **N1 (NIT):** the empty-string sha256 is printed on the STATE lines.
- **N2 (NIT):** the raw capture file holds the profile title line, so it must never be committed.

## 4. Deviations

None from the procedure. I did not start a helper fix for the unread dock side, although the brief allows fixes
between attempts, because a met Revisit-if is an agent-rules §3 item 8 escalation (§4 precedence).

## 5. Proposed decisions

### 2026-10-30 · liveC20: the unread dock side goes to the user; the record is committed as it stands
**Decided:** (for the user) the attempt-1 record is committed. Its five DevTools rows are NOT RUN by the sheet's rule,
and it is not re-run. The options:
- (a) Accept it: #369's two conditions stay unmeasured live, and #374 item 3's reword waits.
- (b) A recipes-only follow-up adds F3's counts-only diagnostic and, once a live read shows which UIA step fails, a
  corrected dock reader. It also adds F2's `remaining` check. Then liveC20 runs again as attempt 2, with 2 attempts and
  3 fix rounds left. The record would be a new file; no expected text changes.

**Why:** the reader cannot be fixed without first measuring the real UIA names on Chrome 156. That measurement means
opening DevTools in a wave window under a new helper, which is a change in substance that #413's Revisit-if returns to
the user. **Instead of:** guessing new UIA names in a fixer. **Revisit if:** — **By:** Claude (proposed, for user
review)

## 6. Findings

1. **#413's Revisit-if is met in substance (agent-rules §3 item 8).** Twice, at R20-0C and at R20-RESTORE's read-back:
   - The opener reached DevTools through the menu (`CHECK devtools-menu step=menu-button|more-tools|developer-tools
     found=yes`).
   - DevTools opened **docked** (`CHECK devtools-ui method=uia-menu found=pane`).
   - The Dock side reader still gave `unread`.

   The cause is one of three: the Customize button was not found once, the four Dock side items were not each matched
   by name, or no single pressed state was readable. Which one is not recorded (F3).
2. **Runtime fact (candidate for `recipes/CLAUDE.md`, Run 20 helper facts):** on Chrome 156 in the user's profile
   (2026-10-30), DevTools opened from the app menu on a fixture page in a wave window docks as a pane inside that window.
   UIA finds the pane, but `Read-S13DockSide`'s Customize-menu reading does not yield a side.
3. `FLAG debugging-flag=no`: this Chrome runs without `--enable-unsafe-extension-debugging`, so the Stage 0 controls,
   which were measured with the flag, have not been checked here.
4. `DIALOGS … wave-windows-open=1` is now carried across all three slices (F1).

## 7. Handoff

Nothing of the wave is running. 9234 is held by the daemon only (PID 30016), and 8080–8089 are free. No watcher is left.
The five liveB20 files remain untracked and untouched (#417). The raw out dir `$TEMP/bridge-e2e/s20-liveC/a1` stays
outside the repo; never commit it, because its `console-liveC20-1.txt` holds the profile title. The user needs to rule
on §5 (the unread dock side) and on F1. Nothing needs the user's keyboard.

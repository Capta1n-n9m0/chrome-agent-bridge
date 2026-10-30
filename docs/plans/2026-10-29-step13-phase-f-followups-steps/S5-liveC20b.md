# S5-liveC20b — liveC20: the dock reader measured and fixed, then attempt 2 (step report)

Step agent: Claude Opus 5.5, medium. Fixers, live runners and committers ran on Sonnet, medium. Verifiers ran on Opus,
medium. The stage resumed liveC20 from `S5-liveC20.ledger.md` (its "S5-liveC20b" section) under decision #418.
Attempt 1 (`3f19f28`) was not redone or re-judged.

## 1. Verdict

**DONE.** The dock side can be read by UI Automation, so #418's Revisit-if is not met. The reader was fixed and
attempt 2 ran the whole slice: exit 0, no STOP, no RETURN. The verifier gave PASS-with-notes, and the record is fit to
commit. R20-RESTORE printed PASS, but by the literal pass rule it re-derives to **FAIL**: the `DIALOGS … wave-windows-open=1`
count (F1), which #418 sends to the user with #417.

## 2. Outputs

**Commits** (all Sonnet committers, explicit pathspecs):
- `95e0abc`: the counts-only `CHECK dock-read` line, the R20-RESTORE close check (attempt-1 verifier F2), and the
  `-Block dockdiag` instrument.
- `dfbac13`: dockdiag read 1 recorded, and a chooser for the measured Customize button pair.
- `e614e0c`: dockdiag read 2 recorded. The dock change now presses the measured Group, the Escape goes into X only,
  and an undock window is registered by a bounded poll.
- The attempt-2 record commit is made after this report. Its hash goes into the journal.

**Test count:** 6016 → 6030 passed, 251 files (`npm test`, re-run by verifiers 3, 4 and 5 and the attempt-2 verifier's
tree). After each fix, typecheck, the eight recipe tsconfigs, build, doc-check and `-Block plan` exited 0 (verifiers 1–5).

**What UI Automation showed** (Chrome 156, DevTools docked in the wave's window X; evidence
`S13-live-evidence-liveC20-dockdiag.txt` and `…-dockdiag2.txt`, records `S13-live-record-dockdiag{,-att2}.txt`):
1. **Read 1.** The name `Customize and control DevTools` matched **two** Button elements, stable over 8.4 s:
   - the opener, ClassName `toolbar-button main-menu`, which offers ExpandCollapse only;
   - an inner icon, ClassName ` icon only-icon `, which offers Invoke only.

   `Open-S13Customize` needed exactly one, so it skipped. **That is why attempt 1 read `unread`.** The instrument also
   needed exactly one, so it invoked nothing.
2. **Read 2,** after the chooser. Expanding the opener (try 1) opened DevTools' soft menu in X's own tree, with no new
   window. Each Dock side kind appears as two elements:
   - a Group, ClassName `toolbar-button`, which offers Invoke;
   - a nested Button, ClassName `only-icon primary-toggle icon`, which offers Toggle.

   "Dock to right" read Toggle=On and the other three Off. The real reader printed
   `CHECK dock-read row=DOCKDIAG windows=0 pane=yes customize=2 invoked=yes items=4 kinds=u1l1b1r1 pressed-readable=4 pressed=1 try=1`
   and `DOCK DOCKDIAG side=right`.
3. **Gap found from read 2.** `Set-S13DockSide` pressed the Toggle-only Button through an Invoke/ExpandCollapse
   helper, so every dock change would have failed. It now invokes the one same-named Group; failing that, it toggles a
   Button only when it reads Off; otherwise it presses nothing. Attempt 2 then undocked and docked as asked.

**Attempt 2** (HEAD `e614e0c`, build `built extension → dist/`, reload exit 0, about 04:26–04:28Z, exit 0, teardown
`CHECK clean PASS`). Record: `S13-live-record-liveC20-att2.txt` (174 lines). Runner report: `S5-liveC20-runner-att2.md`.

| Row | Printed | Re-derived (verifier2) |
|---|---|---|
| R20-0C | PASS (`DOCK R20-0C side=right`, `CHECK gate-dock side-readable=yes`) | PASS |
| R20-DEVT-UNDOCK | PASS (`leg=undock answer=ok`) | PASS |
| R20-DEVT-EARLY | PASS (`leg=undocked answer=ok`, `leg=docked answer=ok`) | PASS |
| R20-UP-DEVT, R20-KEEP-4, R20-SWEEP-HELD | NOT RUN — no DevTools condition refused | NOT RUN |
| finding | `both conditions answer ok; #374 item 3's reword waits for the user` | correct (#414 (6)) |
| FLAG | `debugging-flag=no` | RECORD |
| R20-RESTORE | PASS | **FAIL** by the literal rule (`wave-windows-open=1`); every other clause passes |
| R20-LOGS | PASS | PASS |

**#369's two conditions:**
- **DevTools undocked:** the bridge's call answered ok. The controls show the condition held:
  `windows=1 title=ok attached=yes` before the call, and `attached=no` before the open.
- **DevTools docked:** the call answered ok, with `attached=no` → `attached=yes`.

Neither condition was refused.

**Exit checks:** `CHECK rows20 rows=8 warns=0 stop-return=0`. R5.2, R5.4, R5.5 and R5.6 are met, and R5.3 holds with
R20-RESTORE as FAIL. The scans for the token, the user's name, home paths, title lines and URLs read 0 in every repo
file (runner and verifier).

## 3. Verifier verdicts

| Verifier | Verdict | Findings |
|---|---|---|
| `S5-liveC20b-verifier1.md` (fixer 1) | PASS-with-notes | 5 MINOR: one late search, user text from Chrome's UI, NEWWIN, ARIA state, a STOP hiding a left pane. All fixed by fixer 1b |
| `S5-liveC20b-verifier2.md` (fixer 1b) | PASS-with-notes | F4 Legacy/Aria reads n/a on PS 5.1 (accepted: the Toggle pattern sufficed); N1–N4 |
| `S5-liveC20b-verifier3.md` (fixer 2) | PASS-with-notes | N1: an Escape could go to the wave's own DevTools window (fixed by fixer 3) |
| `S5-liveC20b-verifier4.md` (fixer 3) | PASS-with-notes | M1: a late undock title (fixed by fixer 4); M2 unmeasured, fails safe |
| `S5-liveC20b-verifier5.md` (fixer 4) | PASS-with-notes | N1: `Set-S13DockSide` returns an array when it registers a window. Callers read `.done`/`.now`, so nothing breaks. Not fixed |
| `S5-liveC20-verifier2.md` (attempt 2) | PASS-with-notes | F1: R20-RESTORE FAIL by the literal rule; 4 NIT |

## 4. Deviations

1. **Two diagnostic reads, not one.** Read 1 was cut short by the instrument itself: it required a unique button and
   so invoked nothing. Neither the menu nor the items were measured. Read 2 ran the same instrument in the same window
   after the chooser fix. Both reads were under the same grant, and each changed no dock side and no safety state
   (`remaining=0`, teardown clean).
2. **Fix rounds counted as 1 of 3.** All the fixer work ran between attempt 1 and attempt 2, so by agent-rules §7 it is
   one round. In that round, five fixer passes (1, 1b, 2, 3, 4) each had its own Opus verifier. If each pass is counted
   as a round instead, the stage used 5. That would exceed the three-round cap, and the session agent should know it.
3. **Two notes accepted without a fix:** verifier2 F4 and verifier5 N1. Each is harmless for the current callers.

## 5. Proposed decisions

### 2026-10-30 · liveC20 attempt 2 stands; R20-RESTORE is FAIL by the literal DIALOGS rule, like liveA20 and liveB20
**Decided:** (for the session agent) commit the attempt-2 record as it stands. The verdicts are as re-derived:
- R20-RESTORE is FAIL (`wave-windows-open=1` is the restore's own options window).
- #369's two DevTools conditions are measured: both answered ok, and neither was refused.
- No attempt 3.

**Why:** the slice is complete. The only failing clause is the count #418 left to the user, and it is the same in all
three slices. **Instead of:** an attempt 3 that would print the same line. **Revisit if:** the user rules F1 (the
options window counted after it is closed), in which case R20-RESTORE is re-measured as a new row. **By:** Claude
(proposed)

## 6. Findings

1. **Runtime fact (candidate for `recipes/CLAUDE.md`, Run 20 helper facts),** measured 2026-10-30 on Chrome 156 with
   DevTools docked in a wave window:
   - DevTools toolbar buttons are nested pairs with one name: the outer `toolbar-button` and an inner icon. For the main
     menu, the outer offers ExpandCollapse and the inner offers Invoke.
   - The main menu opens in the window's own UIA tree.
   - The Dock side items are a Group with Invoke plus a Button with Toggle. The pressed side reads Toggle=On.
   - Pressing the Group's Invoke undocks and docks.
2. **#369 measured live:** on this build, DevTools undocked and DevTools docked (opened first) both left the bridge's
   debugger call answering ok. The finding line says #374 item 3's reword waits for the user.
3. **F1 holds in every slice:** `DIALOGS … wave-windows-open=1`. The R20-RESTORE judge in
   `recipes/s13-r20-c-defs.ps1:165-171` never checks the count, so it printed PASS (verifier2 F1).

## 7. Handoff

- Nothing of the wave is running. 9234 is held by the daemon (PID 1952), 8080–8089 are free, and there are 0 DevTools
  windows. One unrelated node process (27060) was left untouched. The worktree list shows the main tree only.
- The raw out dirs `$TEMP/bridge-e2e/s20-liveC/{diag,diag2,a2}` stay outside the repo. Never commit
  `a2/console-liveC20-1.txt`: it holds the profile title.
- The six liveB20 files remain untracked (#417).
- For the user: F1 (with #417), and #374 item 3's reword now that both conditions answered ok.

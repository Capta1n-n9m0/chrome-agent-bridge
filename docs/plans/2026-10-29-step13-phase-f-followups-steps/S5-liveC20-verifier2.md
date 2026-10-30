# S5-liveC20 verifier 2: the liveC20 record, attempt 2

Verifier: Claude Opus 5.5, effort medium. Read-only. HEAD `e614e0c`. I wrote only this file.

## 1. Verdict

**PASS-with-notes.** The record is complete and true to the raw output. Seven of the 8 rows re-derive to the verdict
printed. **R20-RESTORE is the one exception: it printed PASS, but by the literal pass rule it is FAIL** ("`DIALOGS` all
0"; the record prints `wave-windows-open=1`). This is the same defect liveB20's verifier read as FAIL (#417), and #418
sends it to the user unchanged. The record states the count truthfully, so the FAIL can be re-derived from it. The
defect is in the judge, not the evidence, and it was not introduced by this attempt (F1). R5.2, R5.4, R5.5 and R5.6
are met. R5.3 is met only if R20-RESTORE is carried as FAIL, never as its printed PASS. **#369's two conditions were
both measured, and both answered `ok`** (§4). The record is fit to commit.

## 2. Outputs (what I checked, with commands)

- **Record:** `…-steps/S13-live-record-liveC20-att2.txt`, 174 lines, UTF-8, 0 CR (`file`, `grep -c $'\r'`).
- **Raw sink:** `$TEMP/bridge-e2e/s20-liveC/a2/rows20-liveC20.txt`. With timestamps stripped and `diff`ed against the
  record, the only difference is the record's last line, `CHECK rows20 rows=8 warns=0 stop-return=0` (the aggregator's).
- **Runner files:** stdout `s20-liveC-a2-stdout.txt` is 297 lines; its `ROW`/`CHECK` lines match the record.
  `s20-liveC-a2.exit` = `0`. The stdout's last line is `SLICE liveC20 done: calls with a failed check 0, not measured
  1`. The "not measured 1" is `gate-cond`'s exit 3, which is how it prints the three NOT RUN rows
  (`recipes/s13-r20-c-defs.ps1:109-113`). It is not a row verdict.
- **Git:**
  - `git rev-parse HEAD` → `e614e0c4f113…`, equal to the record's `HEAD e614e0c4f113 tree=clean` (l.20).
  - `git merge-base --is-ancestor b3cbe84 HEAD` → exit 0, equal to `S4 commit=ancestor` (l.21).
  - `git status --porcelain`, filtered to paths outside the steps dir → empty. The tracked tree is clean outside the
    steps dir; the only tracked change is the ledger.
- **ROW ids:** `grep -o -E '(^|: )ROW R20-[A-Z0-9-]+' | sort | uniq -c` gives exactly one each for R20-0C, -DEVT-UNDOCK,
  -DEVT-EARLY, -UP-DEVT, -KEEP-4, -SWEEP-HELD, -RESTORE and -LOGS. That is 8 ids, matching `CHECK rows20 rows=8`.
- **STOP/RETURN:** 0 in the record (`grep -n -E 'STOP|RETURN'`). The ledger's 5 matches are all prose ("No STOP", the
  attempt-1 `text-leak` remark, verifier notes), not STOP lines.

## 3. The rows

| Row | Printed | Re-derived | Basis |
|---|---|---|---|
| R20-0C | PASS | **PASS** | l.4 is `MANIFEST …`. l.5 is exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered` (R5.2's text, character for character). Then come RD-0 (a)(c)(d) PASS, `RULES 0`, `STATE armed=true evaluate=true …`, `TOGGLE reading on`, `FOUNDLIST blocks-fixtures=no`, R17B-0 (e)(f) PASS, `HEAD e614e0c4f113 tree=clean` and `S4 commit=ancestor`; the last two I re-ran in git. The DevTools read: l.27 is `found=pane`, l.29 is `CHECK dock-read … windows=0 pane=yes customize=2 invoked=yes items=4 kinds=u1l1b1r1 pressed-readable=4 pressed=1 try=1`, l.30 is `DOCK R20-0C side=right`, l.31 is `CHECK gate-dock side-readable=yes`. With exactly one of four readable buttons pressed and no fixture window, #413's rule yields a side, and the side is readable. F12 closed the pane (l.28) under `Invoke-R20CGuarded`, with no `devtools-left-open`. |
| R20-DEVT-UNDOCK | PASS | **PASS** | Each step checked against the sheet: (1) earlier attach: `ANSWER … undock earlier ok` (#414 (2): a value other than 2 would be NOT MEASURED). (2) `IDLE … since-attach-ms=20015`, which is ≥ 20 000. (3) `CTRL20 … when=before-open windows=0 title=none attached=no targets=29`. (4) The open went pane → undock: l.42 `found=pane`, then the side change, and `open=ok`, which needs `opened` and the read-back to equal `undock` (`Open-R20CDevt`, defs l.35). (5) `CTRL20 … when=after-open windows=1 title=ok attached=yes targets=31`, read before the call. (6) `DEVT20 … answer=ok value=ok exact=n/a devtools-windows-after=0`, the expected line exactly. (7) The window was closed (l.48). The control passed and the call answered `ok` with 2, so the row is PASS (matches Stage 0). |
| R20-DEVT-EARLY | PASS | **PASS** | **Leg `undocked`:** before-open `windows=0 title=none attached=no`, so the bridge had not attached. After-open `windows=1 title=ok attached=yes`. Then `answer=ok value=ok`, and `devtools-windows-after=0`. **Leg `docked`:** before-open `windows=n/a title=n/a attached=no`, after-open `… attached=yes`, which the sheet judges "by `attached=yes` alone". Then `answer=ok value=ok`. Both legs PASS, each printed, so the row (the worse of its two legs) is PASS. |
| R20-UP-DEVT | NOT RUN | **NOT RUN** | No leg refused: no `finding=devtools-refuses` line. l.105 matches the sheet's text `ROW R20-UP-DEVT NOT RUN — no DevTools condition refused` character for character. |
| R20-KEEP-4 | NOT RUN | **NOT RUN** | Same (l.106). |
| R20-SWEEP-HELD | NOT RUN | **NOT RUN** | Same (l.107). No reload ran, so there is no `LOADED20 rerun` line, as expected. |
| Finding line | — | **correct** | l.108 `CHECK R20-DEVT finding: both conditions answer ok; #374 item 3's reword waits for the user` is the sheet's finding text. #414 (6) prints it only when every DEVT leg passed, and all 3 legs did. |
| FLAG | RECORD | **RECORD** | l.32 `FLAG debugging-flag=no`, printed once, after DOCK and gate-dock (#415 (1)). It changes no verdict. The rows' own controls settle the no-flag case, and here they read attached=yes. |
| R20-RESTORE | PASS | **FAIL** (literal rule) | **Clauses that pass:**<br>- Dock: two opens, both `found=pane` (l.113, l.118), each closed by F12 with no `devtools-left-open` line (the F2 close check, defs l.177-187). Then `CHECK dock-read row=R20-RESTORE … pressed=1` (l.120) and `DOCK R20-RESTORE side=right`, equal to `DOCK R20-0C side=right`. No STOP.<br>- Safety: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (l.153), the UP-RESTORE stored and daemon PASS lines, `RULES 0` (l.161), `RESTORECHECK stored=equal differs-by=none` (l.163).<br>- `native=0 devtools=0`.<br>**The clause that fails:** l.164 `DIALOGS C native=0 devtools=0 wave-windows-open=1`. The sheet's pass rule says "`DIALOGS` all 0", and its expected text is `wave-windows-open=0`. So the row is **FAIL**, not a STOP, because the open window is the restore's own options window, neither a dialog nor DevTools (F1). |
| R20-LOGS | PASS | **PASS** | `SCAN20 console/daemon/evidence: name=0 sentinel=0 token=0` (l.169-171). `CAPSEG liveC20 seg=1 saved=yes` (l.166). The control line is present (`control-disarmed-last=3`, l.168); I re-counted 3 `safety: disarmed by the user` lines in `console-liveC20-all.txt`. There is no actors file (l.172; see N2). |

**Exit checks:**
- **R5.2:** met (R20-0C).
- **R5.4:** met. The four items are equal by count and hash; the only hash value printed is the sha256 of empty input
  (0 lines).
- **R5.5:** met. My own scans agree (§5).
- **R5.6:** met. No STOP line, no RETURN line, `stop-return=0`.
- **R5.3:** met as re-derived here, with R20-RESTORE = FAIL.

## 4. #369's two DevTools conditions

- **DevTools undocked: answered `ok`, not refused.**
  - Measured twice: after an earlier attach (UNDOCK, past the 20 s idle) and before the bridge's first attach (EARLY
    `undocked`).
  - In each, the bridge-independent control proves the condition held at the call. Before the open, no window and no
    attachment. After the open and before the call, exactly one DevTools window titled for the fixture (`windows=1
    title=ok`) and the tab's target attached (`attached=yes`, targets 29 → 31).
  - Neither leg is NOT MEASURED or NOT DISCRIMINATING.
- **DevTools docked (opened before the first attach): answered `ok`, not refused.**
  - The control proves what the sheet asks of a docked leg: `attached=no` before the open, `attached=yes` after it,
    before the call.
  - That it was docked at the call is shown by three things outside the CTRL20 line:
    1. `open=ok`, which requires the read-back to equal `right`: no fixture DevTools window and exactly one Dock side
       button pressed (`Open-R20CDevt`, `Set-S13DockSide`, `recipes/s13-devt.ps1:221-222`).
    2. The close went by F12 into X with no window closed (l.89).
    3. R20-RESTORE's next open found a pane (l.113).
  - Not NOT MEASURED (attached=yes) and not RECORD (the control was read).
- Run 19 (#369) measured docked DevTools after an earlier attach. Run 20 now adds undocked DevTools (both orders) and
  docked DevTools opened first. All of them answered `ok`. This is the phase doc's "Continues anyway, recorded" case:
  "#369's two DevTools conditions both fail to refuse". #374 item 3's reword waits for the user.

## 5. Independent scans (counts only)

I read the token (`bridge.token`), the user's name (`git config user.name`, full and each part) and the Windows user
folder name into shell variables, and never printed them.

| File(s) | token | full name | part 1 | part 2 | folder | home path | `DevTools - ` | URL |
|---|---|---|---|---|---|---|---|---|
| record (att2) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `S5-liveC20-runner-att2.md` | 0 | 0 | 0 | 0 | 0 | 0 | 1* | 0 |
| `S5-liveC20.ledger.md` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| stdout `s20-liveC-a2-stdout.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| raw out dir: 12 files + `logs/p8081.txt` | 0 | 0 | 1** | 0 | 0 | 0 | 1** | 1*** |

\* Runner report l.80 is its own hygiene sentence quoting the pattern, not a title.<br>
\** Both are line 1 of `console-liveC20-1.txt`: the capture window's profile title line (the #283 gotcha). The scanned
`console-liveC20-all.txt` reads 0, because the driver dropped 3 title lines (l.167). The file is outside the repo and is
expected there; it must never be committed.<br>
\*** `logs/p8081.txt` holds the fixture server's own `http://127.0.0.1:8081` banner. It is outside the repo.

The evidence to be committed (record, runner report, ledger) holds 0 home paths, 0 name parts, 0 tokens, 0 title
lines and 0 URLs. The record names windows only by url-class words (`own-page`, `fixture`, `about-blank`).

## 6. Did the fix round (95e0abc, dfbac13, e614e0c) let a row pass that should not?

I read `git diff 3f19f28 e614e0c -- recipes/s13-devt.ps1 recipes/s13-r20-c-defs.ps1 recipes/s13-r20-c.ps1 recipes/s13-r20-c.ts`. **No.**

- **The side rule is unchanged.** `ConvertTo-S13DockSide` and `Get-S13Pressed` are not in the diff, so the side is still
  `unread` unless one fixture window exists, or none exists and exactly one Dock side button reads pressed.
- **What changed is how the menu is reached and pressed:**
  - the Customize button chooser for the measured nested pair (`Get-S13CustomizeTries`; 0 or more than 2 matches
    choose none);
  - a poll for the items;
  - `Press-S13DockKind`, which presses the one invokable Group or else Toggles only a button that reads Off;
  - `Register-S13NewDevtWindows`.
  Each of these either finds the real element or leaves the side `unread`. None can make a read succeed on a wrong
  state.
- **The judged item set is still type Button/MenuItem/RadioButton.** The Groups are not judged, and
  `kinds=u1l1b1r1 pressed=1` shows one of four judged states On.
- **The reader discriminates in this run.** The undock leg's read-back took `undock` from a window, and the docked
  leg's read-back took `right` only after that window was gone.
- **`CHECK dock-read` (`dockReadLine`, `recipes/s13-r20-c.ts:229-236`) is a CHECK line, never a ROW.** Its values are
  regex-limited to counts and fixed words, and it feeds no gate (`gate-dock` still takes `--dock`, the side word). It
  cannot change a verdict, and `CHECK rows20` counts ROW lines only.
- **The R20-RESTORE close check (`Close-R20CChecked`) only adds STOPs** (`devtools-left-open`). It removes none and
  changes no verdict text. `Write-R20CDialogs` and the `dialogs` judge are untouched, which is why F1 persists.
- **No expected text, pass rule or `§4.28` line changed** in these commits (the diff touches no `docs/e2e-test-plan.md`).

## 7. Findings

**F1, MINOR (for the record; the row's verdict is FAIL). R20-RESTORE printed PASS against the literal "`DIALOGS` all 0".**
- **Where:** record l.164-165. `recipes/s13-r20-c-defs.ps1:165-171`: `Write-R20CDialogs` STOPs on `native` or
  `devtools` only, and passes `wave-windows-open` to the line unjudged.
- **Evidence:** `DIALOGS C native=0 devtools=0 wave-windows-open=1`, then `ROW R20-RESTORE PASS slice=C`. The window
  counted is the options window the restore opened (47055704, l.123), which teardown closes later.
- **History:** this is attempt 1's F1. liveB20's verifier read the same line as FAIL, and liveA20's PASS is to be read
  as FAIL in S5-record (#417). #418 keeps the count unchanged and sends it to the user.
- **My re-derived verdict by the literal rule is FAIL.** It is not a STOP, because the window is neither a dialog nor
  DevTools. Every other R20-RESTORE clause passes.
- **Why MINOR and not MAJOR for this record:** the record prints the raw count truthfully, so nothing is hidden. The
  defect predates this attempt and is already before the user.
- **Fix:** none in this record. S5-record must carry R20-RESTORE (C) as FAIL unless the user rules otherwise, together
  with the A and B readings.

**N1, NIT. No `RESTORED: …` line.** §4.28 l.1978 lists `RESTORED: …` among R20-RESTORE's expected lines. The record
prints `RESTORE armed=equal …` and `RESTORE read-back: …` instead, and liveB20's record does the same (`grep RESTORED` →
0). The pass rule judges the four items, `RULES 0` and `DIALOGS`, and all of those are present. It is a form carried from
Run 19, with no effect on a verdict.

**N2, NIT. The SDK actor's results are not a scanned stream.** The actors file `actors-<slice>.jsonl` is written only by
the MCP actor (`recipes/s12-r19-a.ts:146`), so slice C prints `CHECK R20-LOGS no actor results file`. Yet slice C's SDK
actor did call `tab.evaluate` (`2`, five times). The values are the fixed number `2`, so they cannot carry the name or
the token. No verdict changes, since the pass rule's NOT MEASURED triggers are the control line and CAPSEG only. A later
sheet could say explicitly that SDK actors are covered by the evidence stream.

**N3, NIT. No teardown file for attempt 2.** Attempt 1 saved `s20-liveC-a1-td.txt`. For attempt 2 the teardown result
(`CHECK clean PASS`, windows closed) is the runner's claim only. Nothing is left open at the restore by the record's own
lines (devtools=0, F2 close checks silent).

**N4, NIT. STATE lines print the empty-input sha256** (l.9, l.143, l.148), while the sheet says "hashes not printed".
This is the same as attempt 1's N1, and it reveals nothing.

## 8. Deviations, proposed decisions

None. I followed §4.28's literal pass rules and #413-#418 over the drivers' how-to (agent-rules §4). I did not re-judge
attempt 1.

## 9. Handoff

I started nothing and touched no process, port, Chrome window or file except this report. **Fit to commit:** the
record, `S5-liveC20-runner-att2.md`, the ledger and this report. Do not commit the raw out dir: its
`console-liveC20-1.txt` holds the profile title line.

**For the user:**
- R20-RESTORE (C) re-derives as FAIL on `wave-windows-open=1` alone (F1, with #417).
- #369: undocked and docked DevTools both answered `ok`, and the controls proved each condition held.

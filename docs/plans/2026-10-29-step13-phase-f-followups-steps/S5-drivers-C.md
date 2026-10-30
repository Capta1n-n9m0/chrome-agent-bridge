# S5-drivers-C: liveC20's drivers, the DevTools rows (step report)

Step agent: Opus, medium. Children: Sonnet builders, fixers and committers; Opus verifiers; all at medium.

## 1. Verdict

**DONE.** The stage was split at the start into C1, C2 and C3, because the scope was plainly over ~600 lines
(agent-rules §7). liveC20 can be run from §8 below. Nothing ran against Chrome, a daemon, a fixture server, a port or
UIA on a real window; the only script run was `-Block plan`.

## 2. Outputs

- **C1** `803d02d`: `recipes/s13-devt.ps1` (DevTools opened in window X by Run 19's app-menu opener; the dock side set
  and read by UIA; the bridge-independent control `CTRL20`, from DevTools window titles and `chrome.debugger.getTargets()`
  in the worker-console capture; close-and-count; FLAG from the process list) and `recipes/test/s13-devt-ps.test.ts`.
  467 lines. Tests 5934 → 5951, files 248 → 249.
- **C2** `34e640b`: `recipes/s13-r20-c.ts`, the actor of R20-DEVT-UNDOCK, R20-DEVT-EARLY, the three conditional rows,
  and the two NOT RUN gates (`gate-dock`, `gate-cond`), on `s13-forms.ts`'s judges. It also adds `recipes/test/s13-r20-c.test.ts`
  and tsconfig entries. Tests 5951 → 5977, files 249 → 250.
- **C3** `8dafe79`: the entry script `recipes/s13-r20-c.ps1` and the blocks `recipes/s13-r20-c-defs.ps1`
  (R20-0C with the found dock side, FLAG, the rows through the bounded `serve` step, R20-RESTORE's dock restore and
  read-back, R20-LOGS), with `recipes/test/s13-r20-c-ps.test.ts`. It makes additive edits: `condFor`/`pickRefusing` in
  `s13-r20-c.ts`; a `flag`/`dock` hook in the shared `s13-r20.ts`, with slices A and B unchanged and their tests green;
  and the C1 test for the Escape guard. The serve step's two functions are read from `s13-r20-b-defs.ps1` by the parser,
  and that file is never dot-sourced. About 590 new lines plus 80 changed; the overrun past 600 is tests. Tests 5977 → 6013,
  files 250 → 251.
- Gates at C3 verifier2 (re-derived there): `npm test` 6013 passed / 251 files; `npm run typecheck`, all eight
  `recipes/tsconfig*.json`, `npm run build`, `node scripts/doc-check.mjs` exit 0; `-Block plan` exit 0 with §4.28's
  order: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt
  r20-keep-4 r20-sweep-held r20-restore r20-logs. No test removed.
- READ list given to the children: agent-rules; recipes/CLAUDE.md; phase doc lines 134–157, 251–331; decisions #369,
  #383, #391, #395, #399, #403, #405, #408, #411, #412; e2e plan §4.28 lines 1938–1966 and 1988–2000, plus the rows
  R18-UP-DEVT, R19-KEEP-4, R19-SWEEP-HELD by grep; S5-sheet §5–§7, S5-helpers §7, S5-drivers-B2 §7, S5-drivers-B4; the
  s13 recipes and tests; Run 17/19 helpers read-only.

## 3. Verifier verdicts

- C1: `S5-drivers-C1-verifier.md` **FAIL**. F1 MAJOR: an adopted undocked DevTools window was not live for `Test-S9Live`,
  so every undocked leg would STOP `devtools-left-open` and R20-RESTORE could not dock back. It also had F2, F3 and F5
  (MINOR) and F4, F6 and F7. → `-fixer1` → `-verifier2.md` **PASS-with-notes**, 1 of 3 rounds. N1 and N2 were carried
  into C3 and done there.
- C2: `S5-drivers-C2-verifier.md` **FAIL**, with four MAJORs: KEEP-4's idle bound was not judged; a failed open was
  ignored; the conditional rows read no before-open control; and a no-refusal finding was printed that nobody observed.
  → `-fixer1` → `-verifier2.md` **FAIL**. G1 MAJOR: the conditional rows did not re-create the refusing condition.
  → `-fixer2` → `-verifier3.md` **PASS-with-notes**, 2 of 3 rounds. H1–H3 were carried into C3 and done there.
- C3: `S5-drivers-C3-verifier.md` **FAIL**. F1 CRITICAL: the serve step's functions were not loaded by slice C, and a
  green suite hid it because every row test stubs `Invoke-R19Row`. → `-fixer1` → `-verifier2.md` **PASS-with-notes**,
  1 of 3 rounds. Verifier2 ran a parser-only closure check of slice C's whole load chain: all 309 command names are
  defined, and the check flags F1 when the fix is removed. Open notes: N1 MINOR (the entry's STOP-on-missing-serve
  branch has no test), N2–N4 NIT. N4: exit code 3 is documented but never returned, which is true of slices A and B too.

## 4. Deviations

- Three slices instead of two. Each had its own builder → verifier → fixer cycle and commit.
- C3 slightly over its cap; the overrun is tests, within 1.5 times the cap (agent-rules §7). C3 added a small
  `sweep-held --phase close` to the C2 actor (H3), which its verifier accepted.
- Some red proofs were by construction where a fixer said a copy could not run. Every verifier then ran red and mutants
  on copies outside the main tree, with no `node_modules` junction (#395, #220). C1 verifier1's definitions-only probe
  was refused by the classifier and was not retried.
- The `recipes/CLAUDE.md` Key-files line is left to the session agent (§7).

## 5. Proposed decisions (for the session agent to record)

### 2026-10-30 · S5-drivers-C1: the unstated cases of liveC20's DevTools helpers
**Decided:** The dock side is `unread` unless exactly one DevTools window is titled for the fixture (`undock`), or none
is and exactly one of the four Dock side buttons reads pressed. `attached` is `unread` unless exactly one page target
carries the tab's marker; `targets` is the total count, and 0 when unread. FLAG reads browser processes only. A dock
change is refused while a DevTools window the wave did not open exists. `Close-S13DevTools`'s per-row `remaining`
counts the wave's own DevTools windows, any window titled for the fixture port, and the pane, never a human DevTools on
another page. The slice-end `DIALOGS C … devtools=` count is separate and counts every DevTools window but the
capture. **Why:** each is the strict reading. The narrower per-row count avoids a STOP the wave did not cause, while the
slice-end count stays as wide as §4.28. **Instead of:** guessing a side or a target. **Revisit if:** liveC20 shows the
DevTools UIA names differ (they are not measured on Chrome 156; a mismatch reads `unread`, so the rows are NOT RUN,
never passed). **By:** Claude (proposed by S5-drivers-C1; verifier2 PASS-with-notes)

### 2026-10-30 · S5-drivers-C2: how the DEVT and conditional rows read the unstated cases
**Decided:** (1) The finding `devtools-refuses` is the line `CHECK <row> finding=devtools-refuses leg=<label>`.
(2) UNDOCK's earlier attach not answering 2, or an idle under 20 000 ms, makes the leg NOT MEASURED. An `ok` with a
value other than 2 is FAIL. A conditional call that is not refused while its control passes is FAIL. A `close` answer
that is not a count is the STOP `devtools-left-open`. (3) An `open` answered anything but `ok` makes the leg RECORD
`devtools-control-unreadable`, docked or undocked. (4) KEEP-4: both legs are NOT MEASURED when the open took
`KEEPER_IDLE_MS` (product constant) or longer, counted from before the kept session's first call. KEEP-4 reads no
before-open control, because its own first step keeps a session. Its docked leg has no bridge-independent control and
is RECORD. (5) UP-DEVT and SWEEP-HELD read a before-open control and re-create the refusing leg's condition
(`--cond earlier` for UNDOCK's leg: the earlier attach and the ≥ 20 000 ms idle; `none` for EARLY's legs). When more
than one leg refused, they run once, under the first in sheet order. (6) The "both conditions answer ok" finding is
printed only when every DEVT leg passed; otherwise a counts-only `CHECK R20-DEVT no-refusal legs-pass=<n> legs-other=<n>`.
**Why:** each is the strict reading. None changes an expected text or a pass rule; every new branch is stricter or ends
NOT MEASURED or RECORD. **Instead of:** an unjudged `open-ms`, an assumed `attached=no`, condition 2 for every leg, or an
unobserved finding. **Revisit if:** a UIA docked-pane reader is accepted as a docked leg's window clause; the user wants
one conditional run per refusing leg. **By:** Claude (proposed by S5-drivers-C2 builder and fixers; verifier3
PASS-with-notes)

### 2026-10-30 · S5-drivers-C3: liveC20's PowerShell side
**Decided:** (1) The record runs: R20-0C's ROW, then `DOCK R20-0C`, then the five NOT RUN rows if the side is unread,
then the one `FLAG` line. (2) A docked leg uses R20-0C's found side when it is bottom, right or left, else bottom.
R20-RESTORE always sets the found side back. (3) The three conditional rows are gated by one `gate-cond` call, which
prints the chosen leg and condition. (4) The serve step's `Invoke-R20Serve` and `Test-R20NodeAlive` are read from
`s13-r20-b-defs.ps1` by the parser and never dot-sourced (that file overrides `Format-S9Title` and resets `R19Xk`). A
missing one is a STOP before any state change. (5) KEEP-4's dock side is set in an earlier DevTools session, so its
open needs no dock change. **Why:** strict and order-neutral; no verdict depends on line order. **Instead of:** a hook
inside `Invoke-R20Zero`; dot-sourcing slice B. **Revisit if:** never needed. **By:** Claude (proposed by
S5-drivers-C3; verifier2 PASS-with-notes)

### Needs the session agent's ruling before liveC20 (C3 verifier F2, not changed)
With R20-0C's found side `unread`, no DevTools row changes the dock side: every one prints NOT RUN. R20-RESTORE still
reads the side back, and `dockRestoreVerdict` makes an unread side the STOP `not-restored`. So the slice ends before
R20-LOGS, and R5.5 cannot be met for slice C even though nothing changed. That is the sheet's literal wording ("a
different or unread side is the STOP `not-restored`"), and it was left as written. One option for a dated note before
the run: NOT MEASURED "found side unread, nothing changed" when no dock change ran, and the STOP only when one did.

## 6. Findings

- **For the session agent:** `Write-R19Dialogs` passes the full slice name, so slices A and B print `DIALOGS liveA20 …`
  and `DIALOGS liveB20 …` where §4.28 writes `DIALOGS A` and `DIALOGS B`. Slice C prints the letter. The C3 builder found
  this and both C3 verifiers confirmed it. Slices A and B's records were not judged.
- **Proposed dated note on §4.28 (C3 verifier F4):** R20-RESTORE counts every DevTools window but the wave's
  worker-console capture. R20-LOGS then saves the capture, and teardown or a STOP closes it, as in slices A and B. That
  is the only order in which R20-LOGS can read the capture. (Wording: `S5-drivers-C3-fixer1.md` §4.)
- **Not measured, decided by the live run:** the DevTools UIA names (Customize menu, Dock side buttons, their toggle
  state) are from memory, not measured on Chrome 156. A mismatch reads `unread`, so the rows are NOT RUN by the sheet's
  own rule, never a false pass.
- **Measured (PowerShell 5.1, unit tests):** one object assigned from `if (...) { @(obj) }` has an empty `.Count`; write
  `@(if ...)` (C1 builder). A `.GetNewClosure()` block cannot see stubs defined inside a test's script block; they must
  be `function global:` (C3 builder).
- **Carried NITs:** after a STOP in a DEVT row the dock preference may stay changed; the record's `DOCK R20-0C` names it
  and §8 says so (C3 F7). SWEEP-HELD still reloads after a RECORD control; there is no verdict effect (F6). FLAG follows
  the gate's NOT RUN rows (F5).

## 7. Handoff

- Nothing is running; no PID, watcher or port. Scratch copies are in the session scratchpad only.
- Before liveC20, the session agent: rules on §5's last item (F2) and on the §4.28 dated note (F4); records the three
  decisions above; adds the `recipes/CLAUDE.md` Key-files line below; and commits every bookkeeping edit (the clean-tree
  guard).
- **Proposed `recipes/CLAUDE.md` Key-files line** (added to the Step 13 S5 list): `s13-devt.ps1` (liveC20's DevTools
  helpers: the opener, the dock side set and read by UIA, the bridge-independent control from window titles and
  `getTargets()`, close-and-count, FLAG) and `s13-r20-c.{ts,ps1}` and `s13-r20-c-defs.ps1` (slice C's actor, entry script
  and blocks: the DEVT and conditional rows, FLAG, R20-RESTORE's dock read-back. The entry script reads
  `Invoke-R20Serve` and `Test-R20NodeAlive` from `s13-r20-b-defs.ps1` with the parser and never dot-sources that file
  whole.)
- The runner reads §8.

## 8. How to run liveC20

**Ready to run** once this stage's commits and the session agent's bookkeeping are committed, and F2 is ruled.

- **Command.** From the repo root, from **Git Bash**, **in the background** (a slice outlasts the 600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-c.ps1 -Block liveC20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`. `-Block plan` prints the order and runs nothing.
  - `-Block teardown -Att <k>` cleans up after the slice or a return. Run it with the attempt's own `S11_OUT`.
  - Exit codes: 0 done, 2 STOP (the header's 3 is never returned, C3 verifier2 N4). Before the first state change, the
    entry script itself can print `STOP: ...` and exit 2 when a Run 17 block or one of the serve step's two functions
    was not read from its file. Fix the file and run again.
- **Prerequisites:**
  - A clean tree at a committed HEAD, then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found. The
    `FLAG` line records whether Chrome runs with `--enable-unsafe-extension-debugging`. Without the flag, the Stage 0
    controls may not hold, and the rows' own control reads settle it.
  - Port 9234 free or held by the daemon; **port 8081 free** (the preflight refuses any other port).
  - Window X is the wave's own window, in front, on the fixture page. Nobody else uses the keyboard and mouse.
  - **No DevTools window of the user's own may be open during the slice, on any page.** R20-RESTORE and the slice-end
    count include every window titled `DevTools…` except the wave's worker-console capture. One of the user's prints as
    `devtools=1`, which is the STOP `devtools-left-open`. No network is needed (no old build).
- **Expected first record lines (R20-0C):** `MANIFEST ...`, then exactly
  `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, then R20-0's remaining
  lines, `HEAD <sha> tree=clean`, the S4 line and `ROW R20-0C PASS slice=C`. Next come
  `DOCK R20-0C side=<bottom|right|left|undock|unread>` and `CHECK gate-dock side-readable=yes`. If the side is unread,
  the five `ROW … NOT RUN — dock side unreadable, it could not be restored` lines come here instead. Then
  `FLAG debugging-flag=<yes|no|unread>`.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveC20.txt`
  (`-att<k>` for a later attempt). In `S11_OUT`: the console segments `console-liveC20-<k>.txt` (one more after
  SWEEP-HELD's reload), `actors-liveC20.jsonl` and the scan inputs.
- **The worker-console capture window.** The wave opens it at the start. It is saved at R20-LOGS (and around
  SWEEP-HELD's reload) and closed only at teardown or at a STOP, never in R20-RESTORE, because R20-LOGS must still read
  it. R20-RESTORE's DevTools count leaves it out.
- **What each STOP return means** (every `STOP <reason>` is followed by
  `RETURN <seq> after-stop=<reason> restored=... readback=...`, and the runner returns):
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0C, before any state change): rebuild and reload,
    then a new attempt.
  - `devtools-left-open`: a DevTools window or pane is still open after a row, a close could not be read, or one of the
    user's DevTools windows was found at R20-RESTORE. Close it only with the user.
  - `dialog-left-open`: a native dialog on a wave window. Close it only with the user.
  - `old-build-left-loaded` (SWEEP-HELD: the build proof after the reload failed): check which build is loaded before
    anything else.
  - `not-restored`: the safety read-back differs, or the dock side read back differs from `DOCK R20-0C` or is unread
    (see F2, §5). The line `CHECK R20-RESTORE found-side=<s> read-back=<s>` names the found side, so the user can set
    it by hand in a tab's DevTools (Customize and control, Dock side). Never retry past it. If `restored=no`, run
    neither teardown nor a re-run.
  - `text-leak` (R20-LOGS): escalate, and do not commit the record.
  - `throw-after-state`: a helper or environment throw after the first state change; the restore ran first. It covers
    a hung actor (`no ready signal for serve within the bound (120 s)` or `serve exceeded its budget of 600 s`) and a
    refused gate. Read the actor's capture in `S11_OUT`, fix a helper only between rows, then teardown and a new attempt.
  - After any STOP in a DEVT row the dock preference may stay changed. Take the found side from the `DOCK R20-0C` line.
- **NOT RUN outcomes** (printed by the actor in the sheet's own words): with an unread side, the five rows
  R20-DEVT-UNDOCK, R20-DEVT-EARLY, R20-UP-DEVT, R20-KEEP-4 and R20-SWEEP-HELD. When no DEVT leg refused, the three
  conditional rows, followed by the finding line if every leg passed, or by its counts otherwise. Each is recorded,
  never a pass, and the wave goes on to R20-RESTORE. A leg that ends NOT MEASURED, NOT DISCRIMINATING or RECORD is
  recorded, and the wave goes on.
- **Resume after a return:** run `-Block teardown -Att <k>` with that attempt's own `S11_OUT`. Fix a helper only
  between rows, never past a STOP line. A new attempt takes `-Att <k+1>` and a fresh `S11_OUT`, at most three per
  slice. **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user.

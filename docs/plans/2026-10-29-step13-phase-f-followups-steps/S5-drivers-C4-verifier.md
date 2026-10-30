# S5-drivers-C4 verifier report (Opus, effort medium)

## 1. Verdict
**PASS-with-notes.** No CRITICAL or MAJOR finding. Two MINOR findings and one NIT. Every exit check is 0, and every new
test was proven red on a scratch worktree. Nothing was edited or committed, and no daemon, Chrome or live run was started.

## 2. Outputs (re-run from the main tree, the change uncommitted)
- `npm test`: `Test Files 251 passed (251)`, `Tests 6016 passed (6016)`, exit 0. This matches the builder's 6016 / 251
  (start 6013, +3 tests).
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` exit 0 under
  `npx tsc --noEmit -p` (`ls recipes/tsconfig*.json` lists eight). `npm run build`: exit 0. `node scripts/doc-check.mjs`:
  exit 0.
- `git diff --numstat docs/e2e-test-plan.md` reads `6 0`, so the plan diff is additions only. The diff holds no local
  path and no user name (`git diff | grep -ic "<user>|C:\\Users|/c/Users"` reads 0).
- Red proof: `git worktree add --detach <scratch>/wt HEAD`, then `npm ci` there (no junction into the main tree; the five
  `node_modules/@bridge/*` junctions pointed inside the worktree). I copied only the three changed test files from the
  tree into it, so the code stayed at HEAD, and ran
  `npx vitest run recipes/test/s13-forms.test.ts recipes/test/s13-r20-b-ps.test.ts recipes/test/s13-r20-c-ps.test.ts`.
  Result: `5 failed | 113 passed (118)`, and each failure is the expected one:
  - s13-forms "#416: an unread found side with no dock change is NOT MEASURED…" fails with
    `expected 'STOP not-restored' to be 'NOT MEASURED'`.
  - s13-r20-c-ps "#416: found unread and --changed exactly no…" fails with `{ lines: [ …(3) ], exit: 2 }` against `exit: +0`.
  - s13-r20-c-ps "R20-RESTORE: Open, Set…": the node line lacks `--changed yes`.
  - s13-r20-c-ps "#416: an unread found side with no dock change goes on…" fails with
    `expected [ 'FLAG0 True', … ] to include 'FLAG0 False'`. Under HEAD's code no `Register-R20CBlocks` reset exists,
    so the flag carries the earlier test's `$true`.
  - **DIALOGS B (the builder did not run this one red):** s13-r20-b-ps "the restore closes WA…" fails on its
    `restoreLabel` assertion. HEAD printed `--slice liveB20` three times, where the test expects
    `--slice B … --devtools 0`, `--slice liveB20 …` and `--slice B … --devtools 2`.
  - The worktree was removed with `cmd /c rmdir` on each `@bridge` junction (PowerShell), then
    `git worktree remove --force`. Afterwards `git worktree list` shows the main tree only, and the main tree's
    `node_modules/.bin` is intact (42 entries).

## 4. Deviations
None by me. The builder's deviation is to print a `ROW R20-RESTORE dock NOT MEASURED …` note instead of a CHECK line
alone. I audited it under F1 and judge it acceptable.

## 5. Proposed decisions
None.

## 6. Findings

### Audit of the attack points (no finding unless stated)

**(a) The extra `ROW` line and "exactly one `ROW` per id and slice" (§4.28 l.1952).** On the NOT MEASURED path the
record of slice C gets two lines that start with `ROW R20-RESTORE`:
- the note `ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed` (recipes/s13-r20.ts:154);
- the row's own line `ROW R20-RESTORE NOT MEASURED slice=C`, from `Write-R19RowLine` (s12-r19-lib.ps1:46), because
  `R20-RESTORE` is in the R20 `$R19Multi` (recipes/s13-r20.ps1:16).

What I checked:
- **The verdict.** `$R19VerdictRe` (s12-r19-lib.ps1:21) allows up to two tokens before the verdict, so `dock` is taken
  and the note is judged NOT MEASURED. The R20 `Get-R19Verdict` override (s13-r20.ps1:22) filters out only `unjoined`
  notes, so this note counts. The rank order (s12-r19-lib.ps1:20) puts NOT MEASURED above PASS, so the row is
  NOT MEASURED unless a STOP or FAIL wins.
- **No STOP.** The node call exits 0, so `Invoke-R19Node` returns 0, and `Restore-R20CDock`'s `-eq 2` test
  (s13-r20-c-defs.ps1:173) does not fire. The block goes on to `rd-restore`, `Invoke-R20RestoreCheck` and
  `Write-R20CDialogs`, then R20-LOGS.
- **The aggregator.** `aggregateRows20` (s13-r20.ts:49-61) requires a verdict word right after the id. The note's
  remainder starts with `dock`, so it is skipped, and the code raises no "row printed twice" warning. The STOP-pairing
  check (s13-r20.ts:38) is not involved, because no STOP is printed.
- **Precedent.** The sheet already defines a `ROW <id> <leg> <VERDICT>` leg-note line beside the row's one ROW line:
  `ROW R20-POP-OTHER unjoined NOT MEASURED …` (e2e plan l.1968) and its `-3` twin (l.2008). The aggregator's docstring
  names it as "not a row". So "exactly one ROW per id and slice" is read at the id-plus-verdict level, and the
  builder's form fits it.
- **No cleaner existing form.** The `LEG <id> …` lines are mapped to ROW only inside `Complete-R19Row`
  (s12-r19-a.ps1:64), not in `Invoke-R19RowBlock`. A CHECK line is never judged. Using either would need a change to the
  shared Run 19 runner or a new override, which is more code than the note.

Severity: the form holds, so there is no MAJOR finding. Two documentation gaps remain (F1, F2).

**(b) The flag.** I grepped every `Open-S13DevTools`, `Set-S13DockSide` and `Open-R20CDevt` call in
`recipes/s13-r20-c*.ps1`, `s13-r20.ps1` and `s13-r20-b-defs.ps1`. The only dock-changing paths are these:
- `Open-R20CDevt` with a non-empty side, which sets the flag first (s13-r20-c-defs.ps1:34). It is reached from every
  `open` handler (:44). UP-DEVT and SWEEP-HELD pass `Get-R20CSide`, which is never empty, so they set it too.
- KEEP-4's `-Pre`, which sets the flag first (:120).
- The restore's own `Set-S13DockSide`, which sets the flag first (:171).

The plain opens at :70 (R20-0C) and :172 (the read-back) cannot change the side (s13-devt.ps1:162 returns before
`Set-S13DockSide`). The flag resets in the globals line (:6) and in `Register-R20CBlocks` (:186). Strictness holds:
main fills `o` verbatim (s13-r20.ts:160), and `o.changed !== "no"` (:153) means only exactly `no` counts as unchanged.
The test covers missing, empty, `No`, `false` and `yes`.

The only error is on the conservative side, which is the right side: the flag is set even when
`Set-S13DockSide` would find the side already equal. With an unread found side, `devtRowGate` makes every DEVT row
NOT RUN and `Set-S13DockSide` refuses on an unread current side (s13-devt.ps1:142). So the NOT MEASURED path is
reachable exactly when #416 intends.

**(c) DIALOGS B.** `Write-R20Dialogs` (s13-r20.ps1:240-247) is `Write-R19Dialogs` (s12-r19-c.ps1:55-62) line for line,
except for the `--slice` value. Same counts, same two STOPs. Slice A's registration `{ Invoke-R20Restore }`
(s13-r20.ps1:165) passes no label, so it still calls `Write-R19Dialogs`. Only `Invoke-R20BRestore`
(s13-r20-b-defs.ps1:89) passes `'B'`, and slice C has its own `Write-R20CDialogs`. `dialogsLine` already takes a
one-letter slice (slice C prints `C`).

**(d) The notes.** They are placed after the #407 table (l.2008) and before `## 5.`, and all three match #416's items
(1)–(3) in substance. No existing text is edited. No path and no name appear.

**(e) Item 4, the capture order.** I checked every file:line the builder cites. `Get-S13Titles` is at
s13-devt.ps1:64-65, with the comment at :63. `Get-R20CDevtCount` is at s13-r20-c-defs.ps1:156 and `Write-R20CDialogs`
at :157-164. `Invoke-R20Logs` is at s13-r20.ps1:258, and its first call is `Save-R19Seg 'end'` (:259). `r20-logs` is
registered at s13-r20-c-defs.ps1:195. `Close-S16Windows` is at s11b-r17.ps1:321-324 and closes `$global:D`. The STOP
path's `Save-R19Seg 'end'` is at s12-r19-lib.ps1:82. The teardown block at s11b-r17.ps1:862 calls `Close-S16Windows`
(:865) and is reused through `Set-R19Reused` (s13-r20.ps1:128). All correct.

**(f) Runner notes.** The three corrections the builder proposes for S5-drivers-C.md §8 are right. The current
`not-restored` bullet ("…or is unread (see F2, §5)") is now wrong for the no-change case, and the "NOT RUN outcomes"
bullet needs the NOT MEASURED continuation. S5-drivers-B4.md §8 has no DIALOGS line, so nothing there reads wrong, and
the `DIALOGS B …` runner note is a fair addition. One addition would make the C notes complete (F1): in the NOT MEASURED
case, the row's own line reads `ROW R20-RESTORE NOT MEASURED slice=C`, and the reason appears only on the note and
CHECK lines above it.

### F1 (MINOR): the row's own ROW line carries no reason, and the new note does not say which line is the row's
- **Where:** recipes/s13-r20.ts:154; s12-r19-lib.ps1:46; docs/e2e-test-plan.md:2010.
- **Evidence:** #416 says the clause prints NOT MEASURED "found side unread, nothing changed". The row's own line is
  built by `Write-R19RowLine` as `ROW R20-RESTORE NOT MEASURED slice=C`. The reason appears only in the CHECK line and
  the `ROW R20-RESTORE dock …` note. The dated note at l.2010 calls that line "the note" but does not say, as the sheet
  does for `unjoined` (l.1968: "…and does not change the row's verdict"), that it is a leg note and not the row's one
  ROW line. A record writer applying l.1952 literally could read two ROW lines for one id and slice.
- **Suggested fix:** in the not-yet-committed note at l.2010, after "the note `ROW R20-RESTORE dock NOT MEASURED …`",
  add "(a leg note like R20-POP-OTHER's `unjoined` line, not the row's one `ROW` line; the row's own line then reads
  `ROW R20-RESTORE NOT MEASURED slice=C`)". Add the same sentence to the S5-drivers-C.md §8 runner note. No code change
  is needed.

### F2 (MINOR): the DIALOGS-B test covers a stub path, not the B slice's restore block end to end
- **Where:** recipes/test/s13-r20-b-ps.test.ts:179-184, 192-194.
- **Evidence:** the `restoreLabel` T calls the real `Invoke-R20Restore 'B'` directly. The `restore` T stubs
  `Invoke-R20Restore` and checks only that `Invoke-R20BRestore` calls it, not that it passes `'B'`. The
  `Invoke-R20BRestore` → `'B'` link is pinned only by reading the code. The red proof shows that dropping the label
  inside `Invoke-R20Restore` is caught. Removing the `'B'` at s13-r20-b-defs.ps1:89 alone would leave
  `restoreLabel` green: `restoreLabel` calls `'B'` itself, and the `restore` T's stub prints no argument.
- **Suggested fix:** have the `restore` T's stub print its `$Label` (e.g. `RESTORE hwnd-null=… label=$Label`) and
  expect `label=B`.

### F3 (NIT): sentence case in the three notes
- **Where:** docs/e2e-test-plan.md:2010, 2012, 2014.
- **Evidence:** each note ends "…. no expected text or pass rule other than the one named here changes…", a sentence
  that starts with a lowercase "no". The earlier notes (l.1954) write "No expected text…".
- **Suggested fix:** capitalise "No" in all three notes before they are committed.

No new runtime fact. LF/CRLF warnings on the touched files come from `core.autocrlf=true` (the HEAD blobs are LF); they
are not a finding.

## 7. Handoff
No processes started. The scratch worktree is removed, and the main tree is untouched apart from `npm run build`'s
gitignored `dist/`. The tree still holds the builder's 9 modified files and report, plus this report, all uncommitted.
A fixer, if one is sent, can address F1 and F3 (text only) and F2 (one stub line and one assertion).

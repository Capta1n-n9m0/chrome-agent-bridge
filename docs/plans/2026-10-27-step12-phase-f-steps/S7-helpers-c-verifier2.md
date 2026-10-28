# S7-helpers-c verifier report, round 2

Verifier: Claude Opus 5.5, medium. Fresh. Read and run only: no repo file edited (this report and its evidence excepted),
nothing committed, no Chrome, daemon or real UIA driven, no worktree made, `npm run build` not run. Mutants and probes ran
on scratch copies in the session scratchpad (`v2/`). Evidence: [`S7-helpers-c-verifier2-evidence.txt`](S7-helpers-c-verifier2-evidence.txt) (V1–V8).
Scope: only the items the round-1 fixer touched (F1–F4, F7, F8, F10), against HEAD `d1eaefd` plus the uncommitted files.

## 1. Verdict
**PASS-with-notes.** All three round-1 MAJORs are fixed, and no new MAJOR appeared. The four mutant classes are red. The
suite passed in all ten of my runs. Six MINOR and three NIT notes remain, listed below. One more item goes to the step
agent: the fixer's single failing run is **an unexplained firing** (agent-rules §3 item 8). I could not reproduce it or
identify the test (§6, M5).

## 2. Outputs
- Sizes (`wc -l`, V1; all five files are new): code 53 + 193 + 103 = **349** (cap 400); tests 258 + 280 = **538** (cap 600).
- `npx vitest run recipes/test` (V2): **1351 passed / 59 files**. It passed in three serial runs and in two runs started
  at the same time (load). Each took about 67 s. This matches the fixer's count: round 1's 1343 plus 8, none removed.
- `recipes/test/s12-ps-c.test.ts` + `s12-forms-c.test.ts` alone, five runs (V3): 49 passed each time.
- `npx tsc --noEmit -p` on `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0 each. `npm run typecheck`: exit 0.
- `git status --short` afterwards shows only the nine untracked stage files. No `_mut-oldbuild-*` file is left in
  `recipes/test/`.

## 3. Per round-1 item

**F1: fixed.**
- **On success** (V5, "success"): `restored=false removed=true`. No `npm run build` runs at the repo, and the old build
  stays in `extension/dist/`.
- **Mutants:**
  - Putting back the round-1 rule (`if (touched)`) makes the happy path rebuild HEAD. The suite's new assertion
    (`s12-forms-c.test.ts:142`) catches it.
  - The "skips the restore on a throw" mutant (`if (false)`) leaves the copy-throw path with no restore. Its suite test is
    green, which means the mutant is red, and V5 confirms it.
- **When the copy throws:** the restore runs before the worktree removal, and the error comes out.
- **Not every throw after dist is touched restores** (V5). Three paths leave the old build in `dist/` and throw without a
  HEAD rebuild: a link that `rmdir` cannot remove, `git worktree remove` exiting non-zero, and `git worktree remove`
  throwing. This is safe only if S7-helpers-d calls the swap *inside* the try whose finally calls `restoreHead`, which
  the fixer's handoff states. But it contradicts the file's own header (`s12-oldbuild.ts:4`, "When a step fails after
  dist was touched, swapOldBuild itself rebuilds HEAD"). Two of those paths also print the wrong message (M1).
- **The junction mutants:**
  - The suite's two `removeWorktree` mutants are red: links not removed first, and git deleting while a link is left.
  - On a real junction, removing `replaceDir`'s link check makes it delete without throwing, which turns the real-I/O
    test red (V5, m3). Node's `rmSync` did not follow the junction there: the target survived.

**F2: fixed.**
- `s12-win-c.ps1:44` now calls `[S9Geo]::Rect`, and `S9Geo.Rect(IntPtr)` exists (`s9-win.ps1:105`).
- The new `realtypes` group:
  - It compiles the real `S9Win` and `S9Geo` text from `s9-win.ps1` in `powershell.exe` 5.1, then dot-sources
    `s12-win-c.ps1` again so the real `Get-S12WindowRect` replaces the stub, and calls it.
  - Its mutant `[S9Win]::Rect` throws, so the test goes red. It passed in every run.
- The `[S9…]::` members the file names are exactly `S9Geo::Rect` and `S9Win::keybd_event` (grep), and the test checks
  both. The `$S9UIA` calls (`FromHandle`, `FromPoint`) are `AutomationElement` statics.

**F3: fixed for the round-1 risk.**
- **The search list:** `Get-S12ClickSearchHwnds` returns exactly `@($Hwnd)`. `Find-S12ClickTarget` walks only that list
  (`s12-win-c.ps1:46-57`). `Find-S12UiaByName` and `Get-S12SearchHwnds` are no longer called on the click path.
- **The order in `Invoke-S12HumanClick`** (`:157-170`):
  1. own-window assert;
  2. fixture URL;
  3. target in X;
  4. point inside X's rectangle;
  5. foreground = X;
  6. `Get-S12WindowAtPoint == X`;
  7. only then `Send-S12MouseClick`.
- **No mouse input before or without the FromPoint check:** `Send-S12MouseClick` has one call site (`:167`), and every
  earlier failure returns or throws before it. The only input before the check is `Set-S9Foreground`'s ALT tap (round-1
  F9, existing practice).
- **The window-level compare:**
  - It climbs `ControlViewWalker` to the element whose parent is the desktop root and compares that element's
    `NativeWindowHandle` with X. A point on a child HWND of X (the render widget) therefore resolves to X, which is
    correct.
  - A desktop or unreadable point gives 0, so no click. Another top-level window gives its own HWND, so no click.
  - It does not false-pass for an unowned window. The limit for windows *owned by X* is in M3.
- **Mutants:** "Escape to any foreground window" and "dialog not owned by X" (owner filter, and the three per-primitive
  owner checks) are red. So are "no at-point check" and "the wide search swapped into the call".

**F4: fixed.** The PowerShell rule at `:191` equals `closerprobeVerdict` (`s12-forms-c.ts:50-53`) in all five cases
(opened × closed × after). Closed=no prints only the closer's own STOP (`$stopped`). The `late-dialog` test and its
mutant (the old guard) are red as claimed.

**F7: fixed.** Before any command, `swapOldBuild` refuses a `tmp` equal to the repo or under it, and the case-insensitive
path is refused too (V8). One edge case slips through (N2).

**F8: fixed.** On the success path a stuck link throws, git removal is skipped, and the message names the STOP. Two
residues are in M1 and M2.

**F10: partly fixed, as claimed.** A failed probe prints one `STOP:` line (tested for `left` and `late-dialog`). The
`Stop9`/`Say9` prefix question is left to -d's aggregator, which is reasonable given `recipes/CLAUDE.md`'s Run 17 fact.

## 4. Deviations
None. As in round 1, `npm run build` was not run, because the diff touches only `recipes/` and `docs/` and a build would
rewrite the live extension's `dist/`.

## 5. Proposed decisions
None.

## 6. Findings

**M1 · MINOR · `recipes/s12-oldbuild.ts:66-75`: the in-swap restore does not cover a failed worktree removal, and two
messages are wrong.**
- The restore check (`:67`) runs before `removeWorktree` (`:71`). A removal failure after a good copy therefore never
  triggers the in-swap rebuild. Three cases show it (V5):
  - `git worktree remove` throwing gives "the restore (HEAD rebuild) failed: STOP old-build-left-loaded". No restore was
    attempted.
  - `git worktree remove` exiting 1 with no link left gives "a link is left".
  - The header (`:4`) promises a rebuild on any failure after dist was touched.
- This is safe under the runner contract (restoreHead in a finally that encloses the swap). But the rule now depends on
  S7-helpers-d wrapping the call itself, and not only the rows.
- Fix (either one):
  - run the worktree removal first and the restore check after it, so any failure after `touched` rebuilds HEAD; or
  - change the header and the messages to say that removal failures leave dist to the runner.
- In both cases, word the "restore failed" message only for a restore that actually ran.

**M2 · MINOR · `recipes/s12-oldbuild.ts:71-75`: when a step fails and a link is also stuck, the stuck worktree is
silent.**
- In the "copy throws + stuck link" case (V5) only `copy` is thrown. The worktree and its `.git/worktrees` entry stay with
  no message.
- Fix: append the removal failure to the thrown error.

**M3 · MINOR · `recipes/s12-win-c.ps1:59-70,157-167`: the FromPoint check is window-level. It is weaker than
`Click-S9Element`, and the cursor is not parked.**
- The check accepts any element whose top-level ancestor is X. It is not compared with the target button, as in
  `Click-S9Element` (`s9-win.ps1:404-405`).
- If UIA lists windows owned by X under X, an X-owned popup over the point would pass the check. Examples are a tooltip
  or hover card under a resting cursor, Chrome's no-activate bubble, or a native dialog of X left from a prior leg. Not
  measured here (no real UIA).
- Neither the cursor park (round-1 F3(a), `Park-S9Cursor`) nor a "no dialog owned by X before the click" precondition
  was added.
- The likely result is a click into Chrome's own UI for X, so the row reads `opened=no` (NOT MEASURED), not input to a
  window the wave did not open. But a click into a leftover native dialog of X is input to a dialog.
- Fix:
  - `Park-S9Cursor` before the guards;
  - require `Get-S12DialogCount $Hwnd -eq 0` before the click;
  - preferably compare the element at the point with `$el` (or its descendant), as `Click-S9Element` does.

**M4 · MINOR · `recipes/test/s12-ps-c.test.ts:37,218`: the real `Find-S12ClickTarget` is never run by a test.**
- PRE stubs `Find-S12ClickTarget` after dot-sourcing, so a mutant that makes it iterate `Get-S12SearchHwnds` survives the
  suite. V6 runs that mutant: the real function then reads windows 9001 and 9002, and no test notices.
- The test `LIST 7` checks only `Get-S12ClickSearchHwnds` in isolation.
- The code is right today, but the "X only" property is not pinned.
- Fix: run the real `Find-S12ClickTarget` with a fake `$S9UIA` class that logs `FromHandle`, as V6 does. Assert that it
  reads X only.

**M5 · MINOR (escalation item, agent-rules §3 item 8) · the fixer's one failing full run is unexplained.**
- I ran the full suite five times (three serial, two at the same time) and the two stage files alone five times. Every
  run passed (V2, V3).
- The fixer's report names no test, file or message ("a single failure in the same group").
- Reading the code turned up no mechanism I could confirm:
  - The new PowerShell tests call `spawnSync` synchronously. Under vitest 2.1.9's `withTimeout`, the timer is set only
    after a synchronous body returns (`node_modules/@vitest/runner/dist/index.js:37-48`), so the 5 s default test timeout
    cannot fail them.
  - The watchdog test uses a stubbed clock.
  - The swap mutants write uniquely named files and delete them.
- Status: **not identified, not explained**. The step agent should treat it as an unexplained firing and keep the
  fixer's run output if it still exists.

**M6 · MINOR · `recipes/s12-oldbuild.ts:20,73-75`: `SwapResult.restored` is always `false` when the swap returns.**
- On success `restored` is never set. On any restore the swap throws instead of returning.
- The field invites a runner check that cannot fire.
- Fix: drop it, or document it as always false.

**N1 · NIT · `recipes/s12-win-c.ps1:61`: `System.Windows.Point` is not loaded by `s9-win.ps1`'s `Add-Type` alone.**
- It is loaded once a UIA `BoundingRectangle` type is touched (V7). `Get-S12ElementRect` does that just before, as
  `Click-S9Element` does, so it works live.
- A failure there is caught and returns 0, so no click is sent and the row reads NOT MEASURED. That is safe.

**N2 · NIT · `recipes/s12-oldbuild.ts:40`: `rel.startsWith("..")` accepts a folder inside the repo whose name starts
with `..`.**
- V8: `C:\repo\..scratch` is not refused.
- Fix: `rel === ".." || rel.startsWith(".." + sep)`.

**N3 · NIT · F10's remainder (the prefixes) stays with -d's aggregator, as the fixer says.**

## 7. Handoff
- Nothing is running. No worktree and no process were left.
- Scratch files are in the session scratchpad's `v2/`, outside the repo.
- For -d:
  - Call `swapOldBuild` inside the try whose finally calls `restoreHead` (M1, M2).
  - Treat `Invoke-S12HumanClick`'s `opened=no` as possibly a refused click (round-1 handoff).
- M3 and M4 can go in a later round or to -d's owner. Neither blocks the exit criteria.

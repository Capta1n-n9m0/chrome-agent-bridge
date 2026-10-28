# S7-helpers-c verifier report

Verifier: Claude Opus 5.5, medium. Read and run only; no repo file edited, nothing committed, no Chrome, daemon or real UIA
driven, no worktree made. Mutants ran on scratch copies in the session scratchpad. Evidence:
[`S7-helpers-c-verifier-evidence.txt`](S7-helpers-c-verifier-evidence.txt) (E1–E10).

## 1. Verdict
**FAIL**: three MAJOR findings (F1–F3). The line forms, the closer's owner rule and the four required mutants are
sound. But the old-build swap cannot leave an old build loaded. The human-style click throws on every live call. And
that click is not guarded against landing in a window the wave did not open.

## 2. Outputs
- Sizes (`wc -l`, E1): code 53 + 99 + 165 = **317** (cap 400); tests 244 + 228 = **472** (cap 600). Within the caps.
- `npx vitest run recipes/test` (E2): before 1302 tests / 57 files (brief, d1eaefd), after **1343 / 59**, all passed. That
  is +41 tests in the two new files, none removed. It matches the builder's count.
- `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json`: exit 0 each. `npm run typecheck`: exit 0 (E3).
- `npm test` (main tree): 5243 passed, 225 files, exit 0. No tracked change afterwards.
- `npm run build`: **not run**. The diff touches only `recipes/` and `docs/`, which the build does not compile. Building
  in the main tree would rewrite the live extension's gitignored `extension/dist/` mid-phase. § Every stage's build check
  is therefore not re-derived by me (recorded, not a finding).
- Forms vs §4.27 by key: I read the sheet myself (`docs/e2e-test-plan.md:1808` items (21)–(24), (26), (27), (30);
  `:1810` item (33)). Each formatter in `recipes/s12-forms-c.ts:17-48` prints the sheet's keys in the sheet's order:
  `CHOOSE`, `DIALOG`, `LATE`, `HUMAN`, `G2`, `G2TYPE` (with the literal `sent=40`), `VERSIONCH` (`VERSION` passes the code
  rule), `DIALOGS` and `CLOSERPROBE`. The PowerShell `CLOSERPROBE` line (`recipes/s12-win-c.ps1:162`) also matches. The
  tests parse the sheet at test time, so a stub (empty or swapped key) fails the matcher. **Every form matches.**
- Mutants (E6, E7): all four required mutants are red when I re-ran them, plus variants:
  - Escape to any foreground window: M1a and M1b red.
  - A dialog not owned by X: M2a, M2b and M2c red.
  - The restore skipped on a throw: M3a and M3b red.
  - Following or deleting through a junction: M4a–M4e red. M4a and M4b run on a real junction, so the reparse check
    works here: Node's `lstatSync().isSymbolicLink()` reports a Windows junction (mount point), and the target survived.

## 3. Verifier verdict
FAIL (this file).

## 4. Deviations
`npm run build` was not run (see §2). Nothing else.

## 5. Proposed decisions
None. F3 is reported for the step agent and session agent to rule (the brief: "report, do not rule").

## 6. Findings

**F1 · MAJOR · `recipes/s12-oldbuild.ts:59-63` (and the happy-path test `recipes/test/s12-forms-c.test.ts:142-143`): the swap
undoes itself before it returns.**
- The `finally` block runs the restore (`npm run build` at the repo) whenever `touched` is set. It does this on success
  too, so `swapOldBuild` copies the old dist and then rebuilds HEAD over it before returning.
- The test asserts this order: `calls[3]` = replace, `calls[4]` = `npm run build @repo` (E8).
- Effect: the runner can never reload while the old build is in `extension/dist/`. liveD19/liveE19 (ARGS-OLD, VERSION)
  would run against HEAD. R19-0's re-run would show the wrong build, so the old-build rows would be lost, not wrongly
  passed.
- #356 (2) asks for the restore at the **end of the old-build slice**, and on any failure. It does not ask for the
  restore inside the swap. The builder's own handoff (`S7-helpers-c-builder.md:63-67`) describes `restoreHead` as "after
  the old build's rows", which contradicts the code.
- Fix:
  - Restore inside `swapOldBuild` only when a step failed after `touched`.
  - On success, return with the old dist in place (worktree already removed).
  - Leave the end-of-slice restore to `restoreHead`, which the runner calls in its own `finally`.
  - Change the happy-path test to assert no repo build, and keep M3's red test on the failure path.

**F2 · MAJOR · `recipes/s12-win-c.ps1:44`: `[S9Win]::Rect` does not exist, so `Invoke-S12HumanClick` throws on every
live call.**
- `Rect` lives on `S9Geo` (`recipes/s9-win.ps1`, S9Geo block). Compiling the S9Win type gives "Method invocation failed
  because [S9Win] does not contain a method named 'Rect'" (E5).
- The unit test stubs `Get-S12WindowRect` (`s12-ps-c.test.ts:38`), so no test reaches the line.
- Live effect: the `Invoke-S12HumanClick` call at line 136 is outside any `try`. `Invoke-S12CloserProbe` therefore
  throws. The `finally` still closes X, but no `CLOSERPROBE` line prints. R19-CLOSER, CHOOSE-4, CHOOSE-DISARM's second
  half and HUMAN all fail at the first click (a throw after state, not a measurement).
- Fix: `[S9Geo]::Rect`. Add one static test that every `[S9Win]::`/`[S9Geo]::` member named in `s12-win-c.ps1` exists in
  `s9-win.ps1`'s type text (the class of bug a stub hides).

**F3 · MAJOR (for the step agent and session agent to rule; not ruled here) · `recipes/s12-win-c.ps1:131-143`: the
human-style click can reach a window the wave did not open.**
- (a) **No FromPoint check.** The click goes to the centre of the found element after three checks: X is foreground, the
  point is inside X's *window rect*, and the URL is on 8081. Unlike `Click-S9Element` (`recipes/s9-win.ps1:397-410`), it
  never confirms that UIA's element at that point is the target. Any topmost window over that point receives the
  `mouse_event` down/up. Examples: another app's always-on-top window, a toast, the auto-hidden taskbar strip, or
  Chrome's topmost no-activate popup (`recipes/CLAUDE.md`, "Occlusion guards meet windows you did not open").
  `recipes/CLAUDE.md` binds "a mouse click at a `FromPoint`-verified point in the driver's own window". The cursor is
  not parked either.
- (b) **The target search is not limited to X.** `Find-S12UiaByName` (`recipes/s12-win-b.ps1:14-27`) searches X, then
  every visible Chrome window not in `$global:S12Before`. If liveC19 runs with `S12Before` unset, that is every Chrome
  window of the user's.
  - The click helper therefore reads the user's pages' UIA trees whenever X shows no match yet, for example while X's
    page is still loading.
  - It can take a "Choose File" button there as its target. If the user's window overlaps X's rect, the bounds check
    passes.
- (c) Within the grant? The click itself is what the sheet prescribes: R19-CLOSER and CHOOSE-4 call for "a real mouse
  click at the centre of `#vis`, not through the bridge", in the wave's own window on a fixture. That falls under #33 and
  § Human gates (Carried). What (a) and (b) allow, input to or reads of a window the wave did not open, is outside that
  description.
- Suggested fix:
  - Search X only: `$S9UIA::FromHandle(X)` plus the existing `Find-S12DialogButton`-style walk, never
    `Get-S12SearchHwnds`.
  - Click through `Click-S9Element` (park, foreground, FromPoint compare), or add the same FromPoint compare.
  - Add a stub test where FromPoint returns another element → no click.

**F4 · MINOR · `recipes/s12-win-c.ps1:163` vs `recipes/s12-forms-c.ts:51`: the PowerShell probe and the TS verdict
disagree on `opened=no native-after>0`.**
- The TS verdict returns the STOP `dialog-left-open`. The PowerShell guard `if ($opened -and …)` prints no STOP and
  returns `$false`, which the caller reads as NOT MEASURED. That happens when a dialog owned by X appears after the
  3 000 ms wait, and nothing then closes it.
- Fix: have PowerShell take the TS rule. If any dialog owned by X is present at the end, STOP whatever `opened` says.

**F5 · MINOR · `recipes/s12-win-c.ps1:148-164`: a dialog Chrome gives a different owner is invisible to the probe, so
nothing closes it.**
- If the live owner is not X (the builder's own live assumption, report §6), `opened=no` reads NOT MEASURED and the
  window is left. The "never touch" rule is right. But § Human gates says "a native dialog the wave causes is closed by
  the wave", and form (30)'s end-of-slice read must then report it.
- Fix: take a snapshot of all visible `#32770` handles before the click. If a new one appears whose owner is not X,
  print a STOP (`dialog-left-open`) without touching it.

**F6 · MINOR · `docs/plans/2026-10-27-step12-phase-f-steps/S7-helpers-c-builder.md:20,39`: the claim "No
`recipes/tsconfig*.json` includes any `s12*` file" is false.**
- `npx tsc --listFilesOnly -p recipes/tsconfig.s6.json` lists all four new TS files (`s12-forms-c.ts`, `s12-oldbuild.ts`,
  `test/s12-forms-c.test.ts`, `test/s12-ps-c.test.ts`), through its `test/*.test.ts` glob and their imports (E4). The
  other six configs list none.
- S7-helpers-b's report is right. The seven-tsconfig exit check does cover them.
- Fix: correct the report. No code change.

**F7 · MINOR · `recipes/s12-oldbuild.ts:22-25`: "outside the repo" is not enforced.**
- `worktreePath` joins whatever `tmp` the caller passes. The test checks only its own constants (`TMP` ≠ `REPO_DIR`).
- Fix: in `swapOldBuild`, refuse when `resolve(wt)` lies under `resolve(o.repo)`, and test it.

**F8 · MINOR · `recipes/s12-oldbuild.ts:64-67`: a stuck link leaves the worktree with no error.**
- `swapOldBuild` returns `worktreeRemoved: false` and does not throw. The scratch worktree and its `.git/worktrees` entry
  stay behind unless the runner reads the flag.
- Fix: the runner must print a `CHECK`/STOP on `worktreeRemoved=false` (contract for -d), or the function throws after
  the restore.

**F9 · NIT · `recipes/s12-win-c.ps1:81` (via `recipes/s9-win.ps1:269`): `Set-S9Foreground` taps ALT into the current
foreground window before it switches.**
- That is a key event to whatever window is in front, which may not be the wave's. This is existing practice since
  Run 13, so it is noted only because the brief asks about every input.
- The Escape itself is safe: it is sent only after `GetForegroundWindow() == dialog` (an unavoidable micro-race).

**F10 · NIT · `recipes/s12-win-c.ps1:115,162-163`: the probe's line forms carry extra text.**
- A failed probe prints two `STOP:` lines (the closer's and the probe's) for one return.
- Both use `Stop9`'s `STOP: <reason>: … (at …)`, not form (31)'s bare `STOP <reason>`.
- `CLOSERPROBE` goes through `Say9`, so it carries the `<ISO time> s9-win: ` prefix (`recipes/CLAUDE.md` Run 17 fact:
  judges need both forms).
- For -d's aggregator; or print one STOP from the probe only.

Checked and sound:
- The owner rule: `GW_OWNER` = X, `#32770`, visible, and re-checked inside every acting primitive.
- The Escape target: owned + foreground-checked.
- The watchdog: no new step after 5 000 ms; the watchdog test is bounded ≤ 1 100 ms.
- The `$o`/`$global:O` trap: top-level names are `$S12…`. The function locals `$x`, `$w`, `$e` shadow no global that a
  callee reads unqualified (grep of `s9/s10/s11/s11b/s12-win*.ps1`, `s11b-r17.ps1`, `s12-r18-lib.ps1`).
- `realSwapIO.replaceDir` refuses a dist that holds a link.
- `cmd /c rmdir` is used per link, and `git worktree remove` runs only when no link is left.
- The swap never runs "Load unpacked" and does not reload (the runner calls `recipes/reload-extension.ps1`).
- `extension/` outside `src/`/`test/` (the manifest, the HTML pages) is identical between `3ab9207`/`63c771c` and HEAD
  (E9), so swapping `dist/` alone is coherent.
- No title, URL, path or token is printed (the URL is matched, never echoed).

npm test (main tree): `Test Files 225 passed (225)`, `Tests 5243 passed (5243)`, exit 0. Afterwards `git status --short`
shows no tracked change, only the untracked stage files.

## 7. Handoff
- Nothing is running: no worktree, no process.
- Scratch files (scratchpad `mut/`, `rectcheck.ps1`, `vitest-recipes.txt`, `typecheck.txt`, `npmtest.txt`) sit
  outside the repo.
- A fixer round needs F1–F3 (F3 after the step agent rules on it). F4–F8 are cheap and should go in the same round.
- A fresh verifier re-checks:
  - F1: the success path leaves the old dist; the failure path restores.
  - F2: the method exists.
  - F3: the stubbed FromPoint mismatch sends no click; the search is X only.
  - F4/F5: verdict parity.

# S7-helpers-c: the chooser and G2 line forms, the dialog closer, the old-build swap (step report)

Step agent: Opus 5.5, medium. The builder and fixer ran on Sonnet, medium. The verifiers ran on Opus, medium, and the committer on Sonnet, medium.

The brief's READ list:
- `docs/e2e-test-plan.md` §4.27 only, including the dated note of 2026-10-28 at its Open items.
- Phase doc § S7, R7.1–R7.6 and § Human gates.
- `S7-helpers-a.md` §7, `S7-helpers-b.md` §7, `S7-sheet.md` §7, `S5a.md` §7, `S6-G2.md` and `Stage0-measurer2.md` E4.
- decisions #353–#358 and decisions-archive/step10.md #220.
- The root CLAUDE.md worktree gotcha and `recipes/CLAUDE.md`.

Layer followed: brief → #357 / #356 (2) → §4.27 (forms by key).

## 1. Verdict
DONE. One fix round was used (of three).

## 2. Outputs
- **Commit:** the committer reports the hash. It is written here after the commit and left uncommitted for the session agent.
- **Code:**
  - `recipes/s12-forms-c.ts` holds forms (21)–(24), (26) with `G2TYPE`, (27), (30), (33) and `closerprobeVerdict`.
  - `recipes/s12-win-c.ps1` holds the closer `Close-S12Dialog`: owner X, then `WindowPattern.Close`, then Cancel, then Escape to the dialog of X only, under a 5 000 ms watchdog. It also holds `Invoke-S12CloserProbe` and `Invoke-S12HumanClick`. The click searches X only and sends nothing unless FromPoint gives X.
  - `recipes/s12-oldbuild.ts` holds `swapOldBuild` and `restoreHead`, both over an injected `SwapIO`. The worktree must be outside the repo, links are removed with `cmd /c rmdir`, and a surviving link refuses `git worktree remove`.
- **Tests:** `recipes/test/s12-forms-c.test.ts` and `recipes/test/s12-ps-c.test.ts`.
- **Size (`wc -l`, step agent):** code 53 + 193 + 103 = 349 lines (cap 400). Tests 258 + 280 = 538 lines (cap 600).
- **`npx vitest run recipes/test`:** 1302 tests, 57 files at `d1eaefd` (step agent) → 1351 tests, 59 files (verifier2, five full runs).
- **Typechecks:** all seven `npx tsc --noEmit -p recipes/tsconfig*.json` and `npm run typecheck` exit 0 (verifier2). `tsconfig.s6.json` covers the new TS files. The builder's claim that no tsconfig covers them is wrong (verifier F6).
- **Not run:** `npm test` and `npm run build`. No product code changed, and a build in the main tree would rewrite the loaded extension's `dist/`. Verifier1 ran `npm test`: 5243 passed, 225 files.
- **Leaf reports:**
  - `S7-helpers-c-builder.md`
  - `-verifier.md` (+ evidence)
  - `-fixer.md`
  - `-verifier2.md` (+ evidence)

## 3. Verifier verdict
- **Verifier 1 (`S7-helpers-c-verifier.md`): FAIL.** It found three MAJORs:
  - F1: the swap's `finally` rebuilt HEAD on success too, so the old build was never loaded.
  - F2: `[S9Win]::Rect` does not exist (it is `S9Geo`), and the tests stubbed it.
  - F3: the human-style click had no FromPoint check and searched other Chrome windows.

  It also found MINORs F4, F5, F7 and F8 and NITs F9 and F10. The forms, the counts and the four mutant classes were already as required.
- **Step agent's ruling on F3:** take the conservative direction the brief already sets. No input may reach a window the wave did not open, so the click searches X only, and a FromPoint check must give X before any mouse event.
- **Fixer 1:** fixed F1–F4, F7 and F8 and half of F10. It recorded F5, F6 and F9.
- **Verifier 2 (`S7-helpers-c-verifier2.md`): PASS-with-notes.** The MAJORs are fixed, and the four mutant classes are red:
  - Escape to any foreground window.
  - A dialog not owned by X.
  - Skipping the restore on a throw.
  - Following a junction.

  Its MINOR notes are M1–M5 below.

## 4. Deviations
None. I accepted the MINORs without a second fix round. They bind S7-helpers-d's runner, which the Handoff states, and none of them lets input reach a window the wave did not open.

## 5. Proposed decisions
### 2026-10-28 · The old-build swap leaves the old build loaded; the runner restores HEAD
**Decided:** `swapOldBuild` leaves the old commit's build in `extension/dist/` on success. It rebuilds HEAD itself only when the copy fails. `restoreHead` is a separate call, which the S7-helpers-d runner makes in its own `finally` around each old-build slice, followed by a reload. A `false` from `restoreHead` is the STOP `old-build-left-loaded`.
**Why:** #356 (2) loads the old build for the slice and ends the slice by rebuilding HEAD. A swap that restored on success would test nothing (verifier F1).
**Instead of:** a restore in the swap's own `finally` on every path.
**Revisit if:** S7-helpers-d cannot wrap the swap in its `finally`.
**By:** Claude (proposed)

### 2026-10-28 · The human-style click touches only window X
**Decided:** `Invoke-S12HumanClick` searches X alone. It sends no mouse event unless the FromPoint window at the click point is X; otherwise the probe reads `opened=no` (NOT MEASURED).
**Why:** the brief requires that nothing touch another window of the user's, and agent-rules §3 item 3 says the same (verifier F3).
**Instead of:** a search across Chrome windows and a click without a check.
**Revisit if:** CLOSERPROBE prints `opened=no` live because Chrome's chooser button is not found in X.
**By:** Claude (step agent's ruling)

## 6. Findings
- **M1 (MINOR, verifier2).** Three throw paths leave the old build in `dist/` with no rebuild: a stuck link, `git worktree remove` exiting non-zero, and `git worktree remove` throwing. This contradicts the header comment of `recipes/s12-oldbuild.ts`, and two of those paths word their error wrongly. One says the restore failed when no restore ran; the other says a link is left when none is. It is safe only under the runner rule in the Handoff below.
- **M2 (MINOR).** If a step fails and a link is also stuck, the leftover worktree is not reported.
- **M3 (MINOR).** The FromPoint check compares windows, not the target element. A popup owned by X could pass it, and the cursor is not parked. This could not be measured without real UIA.
- **M4 (MINOR).** No test runs the real `Find-S12ClickTarget`, so a mutant that widens its search survives the suite (verifier2 showed it on a scratch copy).
- **M5 (unexplained firing, agent-rules §3 item 8; for the session agent).** The round-1 fixer saw one failing test in one full `npx vitest run recipes/test` run, in `s12-ps-c.test.ts`. It did not record which test. The failure did not recur in the fixer's next two runs or in verifier2's ten runs (five full, five of the stage files alone), and verifier2 found no mechanism. It is recorded here, not explained.
- **F5 (MINOR, recorded).** A dialog that Chrome gives a different owner goes undetected. This is the safe failure: the closer touches nothing it cannot prove is X's.
- **F9 (NIT, recorded).** The existing `Set-S9Foreground` sends an ALT tap to whatever window is in front.
- **F10 (NIT).** The probe's form lines keep the `Say9` time prefix, and a failure prints one `STOP:` line. §4.27 does not say whether a form line must be bare; S7-helpers-d's aggregator decides.
- **Wording in §4.27 (not edited).** Form (33) sits in the "Banner rule" paragraph, not in "Line forms (part B)". "The window's own close pattern" is read as the pattern on the dialog window.
- **Live assumptions only CLOSERPROBE can settle.** Chrome's file dialog is `#32770` with `GW_OWNER` = X, and the input is a UIA Button named "Choose File*".
- No new runtime fact: nothing ran against Chrome.

## 7. Handoff (to S7-helpers-d)
Nothing is running: there are no PIDs, servers or worktrees. Verifier scratch is in the session scratchpad.

**Load order.**
- PowerShell: `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, `s12-win.ps1`, `s12-win-b.ps1`, `s12-win-c.ps1`, then `Assert-S12Patched`. The probe needs `New-S16Window` from the block runner.
- TypeScript: `recipes/s12-forms-c.ts` and `recipes/s12-oldbuild.ts`.

**TypeScript entry points.** Signatures are in the files.
- `chooseLine(row, label, {answer, exact|null, files, change, clicks, bytesEqual|null, dialog, ms})`
- `dialogLine(row, {leg, before, afterClick, afterClose, ms, change})`
- `lateLine(row, {openerMs: 4900|5100, opened, dialog})`
- `humanLine(row, {received, dialog, files})`
- `g2Line(row, {aReplyMs, bReplyMs, gapMs, holderAfterReplyMs, aEffect, b})`
- `g2typeLine({round, got, bCalls, bOk, bLockTimeout})`: `lost` = 40 − `got`, and it throws if `got` > 40.
- `versionchLine(row, {leg, code, hint, files, exact})`
- `dialogsLine(slice, {native, devtools, waveWindowsOpen})`
- `closerprobeLine(method, {opened, closed|null, ms, nativeAfter})` and `closerprobeVerdict(...)`, which returns `"pass" | "not-measured" | "STOP dialog-left-open"`.
- `swapOldBuild(realSwapIO(), {repo, commit, tmp})`, with `tmp` outside the repo. It returns `{restored, worktreeRemoved, steps}`.
- `restoreHead(io, repo)` returns a bool.
- `removeWorktree`, `worktreePath`, `distOf`, `realSwapIO` and the `SwapIO` type.

**Runner rule for the old-build slices (binding, M1).** Call `swapOldBuild` *inside* a try whose `finally` calls `restoreHead` and then `recipes/reload-extension.ps1`. Any throw from the swap may leave the old build in `dist/`. Run `recipes/reload-extension.ps1` after the swap, then the rows, then that `finally`. A `false` from `restoreHead` is the STOP `old-build-left-loaded`, then the R19-0 re-run proof (#356 (2)).

**PowerShell entry points** (`recipes/s12-win-c.ps1`):
- `Invoke-S12CloserProbe [-Url]` returns `$true` on a pass. It returns `$false` both for NOT MEASURED and after a STOP; tell them apart by the `STOP: dialog-left-open` line or by `CLOSERPROBE ... opened=no`.
- `Close-S12Dialog <hwnd> [<WatchdogMs=5000>]` returns `{Closed, Ms, Method(none|close|cancel|escape), Left}`.
- `Get-S12DialogCount <hwnd>`, `Get-S12OwnedDialogs <hwnd>`, and `Wait-S12DialogOpen <hwnd> [<MaxMs=3000>]`.
- `Invoke-S12HumanClick <hwnd>` returns a bool. It is used for CHOOSE-4, CHOOSE-DISARM and HUMAN, and acts only on X, which must be on an 8081 page and in front. `$false` can mean a refused click.
- `$S12CloserMethod` = `'uia-owner'` and `$S12CloserWatchdogMs` = 5000.

Needs the user's keyboard: nothing.

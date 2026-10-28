# S7-helpers-c builder report

Builder: Claude Sonnet 5.5, medium. Nothing committed. No live run, no Chrome, no daemon, no real UIA call, no worktree made.

## 1. Task
Line forms (21)-(24), (26), (27), (30), (33); the native file-dialog closer and the row-less CLOSERPROBE; the old-build swap and restore (#356 (2)).

## 2. Files
- `recipes/s12-forms-c.ts`: `chooseLine`, `dialogLine`, `lateLine`, `humanLine`, `g2Line`, `g2typeLine`, `versionchLine`, `dialogsLine`, `closerprobeLine`, `closerprobeVerdict`, `CLOSER_WATCHDOG_MS`.
- `recipes/s12-win-c.ps1`: the closer, the human-style click, `Invoke-S12CloserProbe`.
- `recipes/s12-oldbuild.ts`: the swap and restore over an injected `SwapIO`.
- `recipes/test/s12-forms-c.test.ts`, `recipes/test/s12-ps-c.test.ts`.
- No fixture or product change.

## 3. Size (`wc -l`)
Code: s12-forms-c.ts 53, s12-win-c.ps1 165, s12-oldbuild.ts 99 = 317 (cap 400). Tests: 244 + 228 = 472 (cap 600).

## 4. Results
- Forms: every form is compared with the sheet's own paragraphs, parsed at test time (the -b method), by key and order. (33) is read from the "Banner rule" paragraph, the others from "Line forms (part B)". A swapped key, a missing key, a text where a count belongs, `opener-ms=5000` and a bad `received` fail the matcher. Values are counts or fixed codes; a text, a negative or a fraction throws.
- `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json`: exit 0 each. My four files are in no tsconfig (see §6), so I checked them with a temporary tsconfig that I deleted: exit 0. `npm run typecheck`: exit 0.
- `npx vitest run recipes/test`: before 1302 tests, 57 files (brief) -> after 1343 tests, 59 files (all passed). `npm test` and `npm run build` were not run: no product code changed.

## 5. Mutants proved red
Each is a test that runs the mutant through the same predicate as the real-code test; the predicate fails on the mutant.
1. A closer that sends Escape to any foreground window (the foreground check deleted from `Send-S12DialogEscape`): `escape-wrong-fg` shows an `esckey` line. Red.
2. A closer that acts on a dialog not owned by X, by three mutants. (a) `Get-S12OwnedDialogs` lists every dialog: red on the foreign-dialog and two-owner cases. (b) The owner re-check deleted from `Send-S12DialogEscape`: red. (c) The same deletion from `Invoke-S12DialogCancel`: red. The same deletion from `Invoke-S12DialogClosePattern` is also red.
3. A swap that skips the restore on a throw (`if (touched && failure === null)`): after a copy throw the HEAD rebuild is missing. Red. The real code runs the restore before rethrowing and removes the worktree after it.
4. A swap that follows or deletes through a junction. (a) The `cmd /c rmdir` loop deleted: `git worktree remove` runs with a link still present. Red. (b) The "link left, do not remove" guard deleted: git is called with a stuck link. Red.
- Real-fs test: `realSwapIO().reparsePoints` finds a junction without descending, and `replaceDir` refuses a dist that holds one. The junction's target file survives.
- The mutants of the swap are written as temporary copies of the real source under `recipes/test/`. Each is imported and then deleted.

## 6. Findings
- The closer's design: the dialog is a visible top-level `#32770` window with `GW_OWNER` = X. Close pattern = `WindowPattern.Close` on the dialog, Cancel = the dialog's Button named `Cancel*`, Escape = foreground-checked key. A `Wait` of 700 ms follows each step, all inside the 5 000 ms watchdog. The closer takes no new step once the watchdog passes (a step in flight, including a UIA call, is not interrupted).
- **Live assumptions the unit tests cannot prove** (CLOSERPROBE decides): Chrome's file dialog has class `#32770` and `GW_OWNER` = the window X; Chrome's input is a Button named "Choose File" in the UIA tree (the human click uses that name). No click is sent if the target is missing, the point lies outside X, or X is not in front. An `opened=no` result then reads as NOT MEASURED, per the sheet.
- `g2typeLine` derives `lost` = 40 - `got` and throws if `got` > 40. The sheet gives `sent=40` as a literal.
- `npm ci` in the worktree creates workspace links (`node_modules/@...`). The cleanup therefore removes every link with `cmd /c rmdir` (the "link removed first" rule) and refuses `git worktree remove` if any survives. It does not refuse on first sight of a link.
- The swap's copy replaces `extension/dist` as a whole: `rmSync` on dist and `cpSync` from the worktree's dist. `replaceDir` refuses if dist holds a link. A failed swap returns the error after the restore.
- Wording: the sheet's (33) sits in the "Banner rule" paragraph, not in "Line forms (part B)". The paragraph for (33) calls the closer's first step "the window's own close pattern". I read it as the pattern on the dialog window. No edit was made to the sheet.
- No `recipes/tsconfig*.json` includes any `s12*` file, so the seven-tsconfig exit check does not cover them. That is a gap in the check, not something I fixed.
- `s12-ps-c.test.ts` prints raw PowerShell output when `S12PS_DEBUG` is set (a debugging aid).

## 7. Handoff (to S7-helpers-d)
Load order: PowerShell `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, `s12-win.ps1`, `s12-win-b.ps1`, `s12-win-c.ps1`, then `Assert-S12Patched`. `New-S16Window` must exist (block runner) for the probe. TypeScript: `recipes/s12-forms-c.ts`, `recipes/s12-oldbuild.ts`.

PowerShell (`recipes/s12-win-c.ps1`):
- `Invoke-S12CloserProbe [-Url]` -> `$true` on pass. It prints `CLOSERPROBE ...` through `Say9` and a STOP line (`dialog-left-open`) on failure. On `opened=no` it returns `$false` with no STOP. It opens its own window on the chooser fixture and closes it in a `finally`.
- `Close-S12Dialog <hwnd> [<WatchdogMs=5000>]` -> `{Closed, Ms, Method(none|close|cancel|escape), Left}`; prints a STOP line when a dialog is left.
- `Get-S12DialogCount <hwnd>`; `Get-S12OwnedDialogs <hwnd>`; `Wait-S12DialogOpen <hwnd> [<MaxMs=3000>]` -> the count.
- `Invoke-S12HumanClick <hwnd>` -> bool (the human-style click for CHOOSE-4, CHOOSE-DISARM and HUMAN; X must be own, on an 8081 page, in front).
- `$S12CloserMethod` = `'uia-owner'`, `$S12CloserWatchdogMs` = 5000.

TypeScript:
- `chooseLine(row, label, {answer, exact|null, files, change, clicks, bytesEqual|null, dialog, ms})`
- `dialogLine(row, {leg, before, afterClick, afterClose, ms, change})`
- `lateLine(row, {openerMs: 4900|5100, opened, dialog})`
- `humanLine(row, {received, dialog, files})`
- `g2Line(row, {aReplyMs, bReplyMs, gapMs, holderAfterReplyMs, aEffect, b})`
- `g2typeLine({round, got, bCalls, bOk, bLockTimeout})`
- `versionchLine(row, {leg, code, hint, files, exact})`
- `dialogsLine(slice, {native, devtools, waveWindowsOpen})`
- `closerprobeLine(method, {opened, closed|null, ms, nativeAfter})`
- `closerprobeVerdict({opened, closed, nativeAfter})` -> `"pass" | "not-measured" | "STOP dialog-left-open"`
- `swapOldBuild(io, {repo, commit, tmp})` -> `{restored, worktreeRemoved, steps}`. It throws after the cleanup on any failed step. A failed restore throws "...STOP old-build-left-loaded".
- `restoreHead(io, repo)` -> bool
- `removeWorktree(io, repo, wt)` -> bool
- `worktreePath(tmp, commit)`, `distOf(root)`, `realSwapIO()`, and the `SwapIO` type.
- The runner calls `recipes/reload-extension.ps1` after the swap and after the restore.

# S5-win verifier report (Step 11, Run 16: the Windows UI Automation helpers)

Model: Claude Opus 5.5. Start 2026-10-25T21:34:40Z, end 2026-10-25T21:44:39Z (`date -u`). Layers read: agent-rules §6,
§4.23 lines 1445–1552, recipes/CLAUDE.md, S5-actor.md, the signal sections of S5-actor-builder/-fixer, decisions #243,
#245, #273, #277, #278, s9-win.ps1 / s10-win.ps1 (the helpers it calls), `recipes/s11.ts` (signals, `found`,
`restore-check`, `race`), `recipes/s11-rules.ts` (`optVerdict`, `upload1Verdict`), `extension/options.html`,
`extension/src/options.ts`. Nothing ran against Chrome: no UIA call, no daemon, no reload, no launch. Port 9234 free
before (21:34Z) and after (21:44Z) (`netstat -ano | grep 9234`: empty).

## 1. Verdict
**FAIL**: one MAJOR (the banner sampler stops at the reply, so it never samples the 4 s after it that the sheet's
banner clauses judge). Everything else is MINOR or NIT. Exit checks 2, 4 (PowerShell side), 5, 6, 7 and 8 hold. Exit
check 1 holds except for the sampler (MAJOR-1) and two small gaps (MINOR-2, MINOR-3). Exit check 3 holds for the real
file, though the scanner itself has blind spots (MINOR-5).

## 2. Every-stage checks (re-run by me)
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p recipes/tsconfig.s11.json`: exit 0. `npm run build`: exit 0,
  `built extension → dist/`.
- `npm test`: `Test Files 150 passed (150)`, `Tests 3738 passed (3738)`. The journal records 3699 / 148 at the
  S5-actor commit. 3738 − 3699 = 39 = 22 (`s11-win-rules.test.ts`) + 17 (`s11-win-static.test.ts`), shown by
  `npx vitest run` on the two files. This matches the builder's claim.
- ParseFile, run myself: `errors=0 tokens=4326`. `wc -l recipes/s11-win.ps1` = 412 (the cap is 500). The file is ASCII
  with CRLF line ends.
- Lane: `git status` shows only the five builder files plus `journal.md`, which holds the session agent's line. `git
  diff` touches nothing in s9-win.ps1, s10-win.ps1, `docs/e2e-test-plan.md` or product code.
- Dot-sourcing has no side effects. I listed the top-level statements of s9/s10/s11 with the AST. They are
  `[Console]::OutputEncoding`, `Add-Type`, a default for `$env:S9_OUT`, and variable assignments
  (`$global:S9ParkCache = @{}`, `$global:S11Own`). No UIA call, no process start, no window touched.

## 3. Mutation runs (scratch copies, `npx vitest run --root <scratchpad>/sw`; control 39/39 green)

| Mutant | Result |
|---|---|
| M1 `; $tp.Toggle()` inside `Read-S11FileAccess` | 2 failed: caught |
| M2 `GetCurrentPattern([...TogglePattern]::Pattern).Toggle()` in `Close-S11All` | 1 failed: caught |
| M4 `Say9 "found $ft"` | 1 failed: caught |
| M6 `Say9 "x $($global:S11Found.foldersSha)"` | 1 failed: caught |
| M11 `Assert-S11Own` removed from `Set-S11Box` | 1 failed: caught |
| M10 `restoreCheck` compares lengths instead of hashes | 1 failed: caught |
| M5 `Write-S9Raw $ft` / M5b `[Console]::WriteLine($ft)` | 39 passed: **missed** |
| M7 `$lines = Get-S11Box ...; Say9 "n $lines"` (a text put in a safe-listed name) | 39 passed: **missed** |
| M8 the `Stop9` on a read-back mismatch removed from `Set-S11BoxVerified` | 39 passed: **missed** |
| M8b `$equal = $true -or ($got -eq $want)` | 39 passed: **missed** |
| M9 `$page = $true` in `Restore-S11Safety` | 39 passed: **missed** |
| M12 `addLine` returns `found.trimEnd() + nl + line` | 39 passed: **missed** |

## 4. Findings

**MAJOR-1: the banner sampler stops the moment the reply arrives, so the sheet's "after the reply" window is never
sampled.** `recipes/s11-win.ps1:75-79`: the loop ends as soon as `<Row>-sampled.ready` exists, and the actor writes
that file right after the call returns (`recipes/s11.ts:364-369`). §4.23 judges the time after the reply:
- UP-1: "the sampler sees … within 4 s of the reply" (`s11-rules.ts:260`, `banner4s`).
- UP-6: "no banner before or in any sample after".
- UP-FA: "no banner before or after".

The banner appears after the attach and lingers for seconds (R14-4b). An upload takes milliseconds, and one
`Test-S9Banner` pass (a FindAll over the whole tree with TrueCondition) is slow. So UP-1 can record a false FAIL, and
UP-6, UP-6B and UP-FA can record a false "no banner". A failed row is never re-run.
Fix: once `-sampled.ready` is seen, keep polling for 4 000 ms before writing `-sampled.pressed`. This stays inside
the actor's 30 s wait. Record the number of polls before and after the reply, and tie the 4 000 ms to the sheet in the
static test.

**MINOR-1: UP-RACE-A's timing is not the sheet's +1.5 s / +1.6 s (#278 keeps that timing).**
`Invoke-S11Race` (`:338-341`) sleeps 1 500 ms and only then runs the pin read (up to 5 s), the title read and, on the
first click, `Park-S9Cursor`, which spawns `node … s9.ts park-point`. Inside `Invoke-S11ButtonPair` (`:298-301`) the
second press follows `Wait-S9ActionTitle` (up to 2 s) and only then `Start-Sleep 1600`. So the presses land late by a
variable amount.
Fix: do the pin and title checks before `Wait-S11Ready`, warm the park cache, and time the second press from the first
press's timestamp.

**MINOR-2: UP-RESTORE has no helper that writes the `--now` JSON the actor's `restore-check --found --now` reads**
(`s11.ts:870`). `Restore-S11Safety` judges in PowerShell only. Also, `-Btn` defaults to 0 (`:390`), which silently
skips the press pair and the title check that the sheet requires; that press pair is UP-LOGS's console control.
Fix: write `now.json` in the `found.json` shape from the final `Read-S11Stored`, and make `-Btn` mandatory.

**MINOR-3: liveB's "ROOT added as UP-OPT does (no new row)" has no named helper.** It can be built from
`Add-S11Line` and `Set-S11BoxVerified`. Separately, `UP-7-c`'s Undo uses `$global:S11RootText` unguarded (`:326-327`).
If that global is `$null`, the Undo saves an empty Upload folders box and the read-back says "equal".
Fix: add `Add-S11Root` (it sets `S11RootText`), and throw in `UP-7-c` when `S11RootText` is empty.

**MINOR-4: the static test does not tie the PowerShell restore to its hash comparison and STOP** (M8, M8b and M9
survive). It only checks that the text `-eq $want` is present and that `Remove-Item` comes after `$ok = `. The PS code
itself is right (`:183-187`, `:401-410`).
Fix: assert that the `$equal = ($got -eq $want)` line exists, that the `if (-not $equal) { Stop9` line exists, and
that `$page` compares all four fields.

**MINOR-5: the output scanner has blind spots.** `SINK` (`s11-win-rules.ts:124`) omits `Write-S9Raw`,
`[Console]::Write*`, `Out-File`, `Add-Content` and `Set-Content` (M5 and M5b missed). Its check is by variable name, so
a text assigned to a safe-listed name passes (M7). The real file has no such line: I read every output site
(`:65, 83, 94, 99, 111, 148, 175, 185-186, 197-198, 208, 216, 235-236, 286, 295, 297, 307, 310, 331, 364, 371, 373-374,
380, 392-393, 406, 409-410` and the throws). I also read the s9/s10 helpers they call (`Set-S9Omnibox` prints only
allow-listed URLs; `Get-S9ActionTitle`, `Wait-S9ActionTitle` and `Click-S9Element` print only this extension's
button name; occluders print the class and process name, as #213 allows).
Fix: add those sinks, and have the `TEXT_CALLS` check refuse an assignment to a `SAFE_VARS` name.

**MINOR-6: two files that hold the user's text or its hash have weak guards.**
- `Save-S11Found` (`:205`) checks "outside the repo" with a plain string `StartsWith`. A relative `$Dir` (`docs\x`) or
  a path with forward slashes passes, and `New-Item` then resolves it against the current location.
- `Invoke-S11Opt` writes `$ObsJson` (`:285`) with no guard. That file holds `setSha`, `storedSha` and
  `storedWhileTypingSha`, the sha256 of the user's found text plus ROOT, and §4.23 allows the sha256 "only inside the
  restore comparison", never committed.
Fix: `[IO.Path]::GetFullPath` plus a case-insensitive prefix check on both, or write the obs into `$S11Out`.

**MINOR-7: `Find-S11Texts` can double-count the UP-OPT items** (`:124-127`). It collects both `ListItem` and `Text`.
If Chrome names a `<li>` from its content, the `li` and its static-text child both match, and `invalidItems` /
`warnedItems` would hold duplicates. `optVerdict` compares the arrays exactly, so that would be a false FAIL.
Evidence that `<li>` names are empty is indirect: s9's `Read-S9OptionsLines` uses `Get-S9Text`, which falls back to
the descendants. This is unmeasured on Chrome 156.
Fix: drop a Text match whose parent is a matching ListItem, or match Text only.

**MINOR-8: `Invoke-S11ButtonPair` does not check its own end state** (`:298-303`). `Wait-S9ActionTitle` only prints on
a timeout. If the first press did not land, the second press disarms, and the function still returns `$true`. Race A's
daemon check and Restore's later reads catch this downstream.
Fix: return `$false` and print a STOP unless the final title reads armed.

**MINOR-9: guard strength.**
- `Open-S11Window` checks for a running Chrome only on its first call (`:100`). If Chrome has exited, a later call
  runs `Start-Process chrome.exe`, which is a Chrome launch (a human gate).
- `Close-S11Window` and `Test-S11Own` rely on `Test-S9Live`. With the broadened titles of the s11 `Format-S9Title`
  (`:17`: `Extensions - [A-Za-z ]+`, `S11 [A-Za-z ]+`, `Chrome Agent Bridge .* Options`, `New Tab`), that proof is
  weaker than #223's (title recorded at pick time, or the marker/options URL). A reused handle on a user's "New Tab"
  window would pass.

The marking scheme itself is sound per the recipes/CLAUDE.md gotchas: a stable window set first, a per-call GUID
marker, the handle recorded, and URLs only from an allow-list.
Fix: check `Get-Process chrome` on every open, and tighten the title patterns to `Extensions - Chrome Agent Bridge` and
`Chrome Agent Bridge . Options`.

**NIT-1:** the "discriminating" test (`s11-win-static.test.ts:59-62`) is a tautology: it tests the mutated string
against the regex, not the file-level assertion. The real check does discriminate (M1, M2). The builder's §4(a)
"shown caught" overstates what that test shows.
**NIT-2:** the `addLine` tests miss a found text with trailing spaces or a trailing blank line (M12 survives).
**NIT-3:** the armed-title prefix `Substring(0,27)` also matches the "armed, JavaScript off" title (`:297`, `:404`).
**NIT-4:** `Read-S11State` defaults `count` to `'0'` when no summary is found (`:147`; s9 used `'?'`), which makes a
STOP from the daemon check fail for an unclear reason.
**NIT-5:** `Restore-S11Safety` has a `Start-Sleep 1500` after the read that serves no purpose (`:395`). The
`Invoke-S11Row` comment mentions a `$Btn` parameter that does not exist (`:314`).
**NIT-6:** .NET IO exceptions carry full paths under the user profile. The runner must not print `$_` from these
helpers.

## 5. My step → helper map (from §4.23)

| Sheet step given to the driver | Helper | Status |
|---|---|---|
| UP-L1 preflight: the found Upload folders text for `foundcheck` | `Save-S11Found` (writes `found-uploadfolders.txt`) | ok (run before UP-L1) |
| UP-0: stored state, texts kept outside the repo, `found.json` | `Read-S11Stored`, `Save-S11Found` | ok (MINOR-6) |
| UP-0: file-URL toggle read in window E, read only | `Open-S11Extensions`, `Read-S11FileAccess` | ok |
| UP-OPT: O2, set + save, poll O2, typed lines, revert, stored read | `Invoke-S11Opt` | ok (MINOR-6, MINOR-7) |
| UP-FA / UP-6 / UP-6B / UP-1: banner sampler | `Invoke-S11Sampler` | **gap: no after-reply window (MAJOR-1)** |
| UP-1 / SW-2: W in front, cursor parked | `Set-S11Front` | ok |
| UP-7 (a) (b) (c), UP-7J: change, read back, restore | `Invoke-S11Row`, `Set-S11Flag`, `Set-S11BoxVerified` | ok (MINOR-3) |
| UP-DEVT: window X, F12 with the foreground checked, F12 again, X closed | `Open-S11Window`, `Invoke-S11Row UP-DEVT`, `Close-S11Window` | ok |
| UP-RACE-A: two presses at +1.5 s / +1.6 s | `Invoke-S11Race A` | timing off (MINOR-1) |
| UP-RACE-B: block-list edit at +1.5 s, restored on loop-done | `Invoke-S11Race B` | ok |
| liveB: ROOT added again | none named | MINOR-3 |
| UP-RESTORE: press pair, fresh page, restore where it differs, read-back by hash, daemon.status, title | `Restore-S11Safety` | ok, but no `now.json`, optional `-Btn` (MINOR-2) |
| UP-LOGS: worker console capture | s9 `Open-/Read-S9WorkerConsole`, reused | ok |
| Pinned button (human gate) | `Get-S10PinState` in `Invoke-S11ButtonPair` | ok |
| Occluder and cursor guards | `Enter-S11Guards` (WEDO globals; s11 windows not in them count as foreign: a false STOP, the safe direction) | ok |
| Signals | `Wait-S11Ready`, `Write-S11Pressed`, `Invoke-S11Change`, `Clear-S11Signals` | ok; they match `s11.ts:346-378, 763` |

## 6. Proposed decisions
None. Every fix above stays inside the slice.

## 7. Handoff
Nothing running. The scratch copies are in `<scratchpad>/sw` (outside the repo). One older folder, `<scratchpad>/mut`,
was left by an earlier agent; when vitest ran against it, it ran that agent's copy of `s11-actor.test.ts`, which
failed on its environment. That folder is not mine and I did not delete it. Port 9234 was free afterwards. A fresh
verifier should re-check MAJOR-1 and any MINOR the fixer touches.

# S7-live liveD19 verifier, fix round 2 of 3

Model Opus 5.5, effort medium. Read and ran only. Nothing against Chrome, a daemon or port 9234. Raw output:
`S7-live-D-verifier2-evidence.txt` beside this file. HEAD `2015b25`; the change is uncommitted in the tree.

## 1. Verdict
**PASS-with-notes.** The fix does what #371 asks: a segment save before a reload closes the capture window D and the
chrome://extensions window E by handle (`Test-S9Live` + `Close-S9Window`), as `Close-S16Windows` does. Traced from code,
R19-RESTORE's `DIALOGS` reads `devtools=0` after liveD19's two reloads. The new checks fail on HEAD's lib. Three
mutants survive (the live guard, the failed-save branch, the close-after-save order). They are MINOR: the shipped code
is right on each, but no test holds it there.

## 2. Outputs
- `npm test` (tree): `Test Files 235 passed (235)`, `Tests 5596 passed (5596)`, exit 0. `recipes/test/s12-r19.test.ts`
  alone: `Tests 58 passed (58)`. HEAD's file has 50 CHECKS/MUTANTS entry lines and the tree has 54 (+2 checks, +2
  mutants). So 5592 → 5596 holds. The fixer's per-file numbers, "52 -> 56", are wrong: it is 54 → 58 (NIT 3).
- `npm run typecheck` exit 0. `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
- Lib sha256 `87d820af…` before the mutants and after the byte-exact restore. `git diff --stat` at the end shows only
  the fixer's lib and test change and the ledger. The ledger went from 4 to 8 added lines during my run; I did not write
  them, so it was the step agent.

## 3. Check 1: the fix from code
**The trace (liveD19: prologue … `console`, `r19-0`, `r19-old-args`, `r19-restore`, `r19-logs`, `teardown`;
`s12-r19-lib.ps1:12`):**
1. The prologue `console` block (`s11b-r17.ps1:428-433`) opens E0 (`Open-S9ChromePage`) and D0 (`Open-S9WorkerConsole $E`).
   Neither enters `S11Own`.
2. `Invoke-R19Swapped` (`s12-r19-lib.ps1:124`), in the try: `Save-R19Seg 'reload'` saves seg 1, then
   `Close-R19CaptureWindows` closes D0 and E0 and sets both globals to 0. Then the swap and the reload, which opens and
   closes its own window (`reload-extension.ps1` header items 2 and 5, line 149 `--new-window about:blank`, line 180
   omnibox set). `Open-R19Seg` re-runs the console block, which opens E1 and D1. Then the rows.
3. In the finally: restore-head; `Save-R19Seg 'reload'` saves seg 2 and closes D1 and E1; the reload;
   `Open-R19Seg` opens E2 and D2; the rerun proof.
4. R19-RESTORE (`:229-235`) → `Write-R19Dialogs` (`s12-r19-c.ps1:55-62`). The DevTools count is
   `Get-R19DevToolsCount` (`s12-r19-c.ps1:53`): top-level Chrome windows whose title starts `^DevTools`, **except
   `$global:D`**. `--windows` counts only `R19Xk` and `O`.
   - Open at the read: D2, which is excluded as the current D, and E2, whose title is Extensions, not DevTools.
   - So `devtools=0`. Before the fix, D0 and D1 stayed open, and they are the two windows that read `devtools=2`
     in attempt 1.
   - With the HEAD code, the E leftovers never counted toward DIALOGS. Closing them is tidiness, which #371 also asks for.
5. `r19-logs` runs `Save-R19Seg 'end'`, which saves seg 3 and does not close. Teardown's `Close-S16Windows`
   (`s11b-r17.ps1:321-325`) closes D2 and E2 by the same predicate. The Stop-R19 path (`:82-84`) does the same.

**The reload does not need E.** `reload-extension.ps1` opens its own window and types `chrome://extensions` into it
(lines 149, 161-180, 196-199), and it never reads a caller's window. No R19 file reads `$global:E` (grep over
`recipes/s12-r19*.ps1`: only the lib's new function). `Restore-S9Desk` (`s9-win.ps1:1107`), which reads E, is not
called by any R19 file. liveB19's one reload (`s12-r19-b.ps1:61-64`) re-reads only `$global:D` after `Open-R19Seg`.

**PowerShell 5.1 pitfalls in `Close-R19CaptureWindows` (`s12-r19-lib.ps1:112-118`):**
- **Scope.** `Get-Variable -Scope Global -ValueOnly` and `Set-Variable -Scope Global` read and write the globals by
  name. A caller local `$d`/`$e` (case-insensitive, recipes/CLAUDE.md) cannot shadow them. The obvious alternative,
  `$D` with dynamic scope, would have been exposed to that.
- **Locals.** The new locals are `$r19w`/`$r19h`, both R19-prefixed. `Test-S9Live($h)` and `Close-S9Window([long]$Hwnd)`
  take parameters and read only `$global:` names, so nothing is shadowed.
- **A missing global.** `-ErrorAction Ignore` (PowerShell 3.0 and later) on a global that does not exist yields
  `$null`, and `[long]$null` is 0, so the window is skipped. The tests exercise this: `$global:E` is unset in the
  `segs` scenario, and only one CLOSE-CAPTURE prints there.
- **Header and encoding.** The header lists the new helper `Close-S9Window` (line 5). `file` reports "ASCII text".

**The fixer's open item (the early return at `:102` when D is not live):**
- **Can a liveD19/liveE19 path reach it with E live?** Only through a failure. `Open-R19Seg` can assign `$global:E`
  and then throw inside `Open-S9WorkerConsole`, which leaves D = 0 (the earlier close cleared it). The next
  `Save-R19Seg 'reload'` (the finally's) then returns early, and the next `Open-R19Seg` overwrites E. That orphans an
  Extensions window that `Close-S16Windows` will not close.
- **Does it make DIALOGS read `devtools>0`?** No. E's title is not `^DevTools`, and `--windows` does not count E. A
  stray DevTools window that a throwing `Open-S9WorkerConsole` might leave is a separate, earlier issue.
- **The normal path.** It never reaches the early return with E live: D is live at both saves.
- **One more case.** A D that is alive but fails `Test-S9Live` (owner or title changed) would stay open and count.
  That is the same predicate as line 102 and `Close-S16Windows`, and attempt 1 showed D passing it.
- Severity: MINOR 2.

## 4. Check 2: the new tests would have caught attempt 1
I put HEAD's lib (`git show HEAD:recipes/s12-r19-lib.ps1`) in place, ran the tree's test with
`-t "capture windows|segments"`, then restored the lib byte-exact. Result: both new checks fail with
`real: expected false to be true`, and `segments` stays green. Evidence: "REVERT".

## 5. Check 3: mutants
Each mutant was applied in place by `scratchpad/mut.mjs` (an exact, single-occurrence replace), run with the same
filter, then the lib was restored. The "the mutated text exists" failures in the output are the fixer's own mutant rows,
whose from-text a mutant removed. They are noise, not kills.

| # | Mutant | Result | Evidence |
|---|---|---|---|
| M1 | `else { Close-S11Window $global:D; $global:D = 0 }` (attempt 1 again) | **killed** | both capture checks `× … real: expected false to be true` |
| M2 | close D, not E (`'D'` only) | **killed** | both capture checks × |
| M3 | close E, not D (`'E'` only) | **killed** | both capture checks × |
| M4 | drop the `Test-S9Live` guard (`if ($r19h) { Close-S9Window … }`) | **survived** | `Tests 5 passed \| 53 skipped` |
| M5 | skip the close when the save failed (`elseif ($saved)`) | **survived** | both capture checks ✓ |
| M6 | close before the save (close moved ahead of `Save-S11bConsole`) | **survived** | both capture checks ✓, `segments` ✓ |
| M7 (extra) | do not clear the globals (drop `Set-Variable … 0`) | **killed** | `capCloseOne` × |

## 6. Check 4: no test dropped or weakened
- `git diff --numstat -- recipes/test/s12-r19.test.ts`: `22 0` (22 lines added, none deleted or changed). Every
  HEAD case, check name, mutant row and assertion is still there, word for word.
- **The added stub.** The new `Close-S9Window` stub prints `CLOSE-CAPTURE`, like the `Close-S11Window` stub. Two
  existing checks key on that text:
  - `segments` checks `indexOf("CLOSE-CAPTURE") < indexOf("CONSOLE-REOPEN")`.
  - `swapBlock`'s filter keeps CLOSE-CAPTURE lines, but the swap checks match only NODE, RELOAD, ROWS and CAUGHT
    lines, never CLOSE-CAPTURE.
- **Same meaning, not trivially satisfied.** In the lib, `Close-S9Window`'s only caller is `Close-R19CaptureWindows`,
  and `Close-S11Window`'s only caller is `$global:O` in R19-RESTORE (`:231`), which the `segs` scenario does not run.
  So CLOSE-CAPTURE still means "the capture close ran, after the save and before the reopen".
- **A fragility (NIT 4).** `$global:E` is not reset by `T`, and it carries across scenarios in one PowerShell run.
  `capClose` leaves it at 29 and `capCloseOne` clears it to 0 before the later scenarios run, so nothing leaks today.

## 7. Check 6: lane
Changed tracked files: `recipes/s12-r19-lib.ps1` and `recipes/test/s12-r19.test.ts`, plus the steps-dir ledger. The
fixer's report is untracked. The lib is ASCII-only.

## 8. Findings

**MINOR 1: three behaviours of the new close are untested (M4, M5, M6 survive)** — `recipes/test/s12-r19.test.ts:80,125-141`.
- **What the tests cannot see.** The stub `Test-S9Live` always returns `$true`, `Save-S11bConsole` always succeeds,
  and it ignores its handle. So the tests never observe:
  - (a) the guard that keeps a reused handle from being closed. This is the protective check in `Test-S9Live`, the
    reason the other close paths use it.
  - (b) the stated choice to close the windows even when the save failed. Without it, D stays open and the DIALOGS
    STOP returns.
  - (c) the save happening before the close. Without that order, the segment is saved from a closed window and lost,
    and R19-LOGS reads NOT MEASURED.
- **Evidence:** §5 rows M4, M5 and M6.
- **Suggested fix.** In `capCloseOne`-style scenarios:
  - Stub `Test-S9Live` to return `$false` for one handle and expect that handle missing from `CLOSED9`.
  - Have `Save-S11bConsole` throw and expect `CAPSEG … saved=no` with `CLOSED9 8,9`.
  - Have `Save-S11bConsole` print `SAVE $h` and require `SAVE 8` before the first `CLOSE-CAPTURE`.
- Each scenario gets a mutant row.

**MINOR 2: an E window can be orphaned on the early-return path** — `recipes/s12-r19-lib.ps1:102`.
- **What happens.** If `Open-R19Seg` throws after the console block has set `$global:E` but before D is set, the next
  `Save-R19Seg 'reload'` returns before `Close-R19CaptureWindows`. The following `Open-R19Seg` then overwrites E, and
  `Close-S16Windows` cannot close the orphan.
- **How likely.** Reachable only on a failure that already ends in the STOP old-build-left-loaded, or in a throw. It
  does not affect `DIALOGS devtools` (§3).
- **Suggested fix.** For a `$Before` other than 'end', call `Close-R19CaptureWindows` on the early-return path too, or
  have the console block close a live `$global:E` before it opens a new one. This can wait for the next round; it is
  not needed for attempt 2.

**NIT 3: the fixer's per-file test count** — `S7-live-D-fixer2.md` §Counts says "s12-r19.test.ts 52 -> 56". The measured
numbers are 54 → 58 (`Tests 58 passed (58)`; entry lines 50 → 54). The 5592 → 5596 total is right.

**NIT 4: `$global:E` is not reset per scenario** — `recipes/test/s12-r19.test.ts:98-101` (`T`) resets D and not E, so the
order of scenarios decides E. Suggested fix: add `$global:E = 0` to `T`'s reset line.

No CRITICAL or MAJOR. Security boundary untouched (recipes only; nothing logs a URL, title or path; the new close
prints only the handle via `Close-S9Window`'s existing `window <h> closed` line).

## 9. Proposed decisions
None. The fix's choice to close the windows even when the save failed is the conservative one, because a capture that
stays open is the STOP. I agree with it as written.

## 10. Handoff
No process left running: every command finished, and the vitest and npm runs exited. The lib was restored byte-exact
(sha256 `87d820af…`). The scratch files `mut.mjs`, `lib.orig.ps1` and `lib.head.ps1` are in the session scratchpad,
untracked.

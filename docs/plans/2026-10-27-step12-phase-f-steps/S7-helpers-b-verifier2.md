# S7-helpers-b verifier report, round 2 (after fix round 1)

Model and effort: Claude Opus 5.5, medium. Read and run only. The only files this round added are this report and
`S7-helpers-b-verifier2-evidence.txt`. Both in-place mutant sets were restored, and `sha256sum -c` passed on both files.
Scope: MAJOR-1, MINOR-3 and the timeline NITs only, as the brief asked. MINOR-2 (`end-ms=never`) is out of scope.

## 1. Verdict
**FAIL**, on one exit check: "the six MINOR-3 mutants now killed". **Two of them still survive: M28 and P6.** Both are
MINOR test gaps, and the code itself is correct. MAJOR-1 is fixed, and I proved it under PowerShell 5.1.

## 2. Outputs (re-derived)
| Check | Result |
|---|---|
| `npx vitest run recipes/test` | **1301 passed, 57 files**, the same as the fixer's figure. The two slice files: 59 tests, 2 files. Before the slice: 1301 − 59 = 1242 tests and 57 − 2 = 55 files, matching the step agent's figure |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| `npm run typecheck` | exit 0 |
| Size (`wc -l`) | 116 + 95 = **211 code lines** (cap 400); 263 + 213 = **476 test lines** (cap 600) |
| `s12-forms-b.ts` | byte-identical to round 0 (sha `5b1b8d83…`). So `attached` still comes only from `attachedFrom(r.answer)`, and form (15)'s formatter is untouched |

## 3. MAJOR-1: fixed (evidence §1)
I wrote my own stub: a compiled C# element whose `Invoke()`/`Expand()` throw a real `COMException` 0x80004005 (E_FAIL). I
ran it against the real `Invoke-S12UiaElement`, `Open-S12DevToolsMenu`, `Send-S12Escape`, `Invoke-S12DevProbe` and
`Get-S12SearchHwnds`, under `powershell.exe` 5.1 `-File`, once with `Continue` and once with `Stop`.
- **A throwing press.** Invoke and Expand each return `False`. The opener prints `step=menu-button found=no` and never
  `found=yes`. It sends one Escape (2 key events) to X only, after the own-window and foreground checks.
- **No throw.** The DEVPROBE pair completes and X is closed (`CLOSEWIN 7`). No error record is printed, so no `At <path>` line
  reaches the console.
- **A throwing find.** The real `Find-S12UiaByName` with `FromHandle` throwing `ElementNotAvailableException` gives the same
  result.
- **Search scope.** With `S12Before = 7,8` and windows `7,8,30`, it searches `7,30`: X first, then only windows that are new
  since the press. That is `Set-S9Pin`'s rule (`s9-win.ps1:436-439`).
- **Keys and windows.** The file still holds no F12 or Ctrl+Shift+I code. The only key is Escape, sent to X, which the page
  must have checked as an 8081 fixture. The DevTools window is recorded as the wave's own only when it is found.

## 4. MINOR-3 mutants (evidence §2)
**Killed:** M19, M23, P3, P4, P5 (Invoke and Expand variants), plus my extra mutant P8 (a find that throws skips the Escape).

### MINOR-A: M28 survives
`recipes/s12-forms-b.ts:101`; `recipes/test/s12-forms-b.test.ts:248-258`.

**The mutant.** I loosened `CAP_MARK` from `more lines, the newest — narrow` to `more lines,.* narrow`, the round-0 mutant. All
32 tests in the file still pass.

**Why the new test misses it.**
- The `formatConsole` case is a positive check, so the looser regexp accepts it too.
- Neither look-alike exercises the loosened part: `foo narrow]` lacks `with level/limit`, and the other has a trailing ` x`.
- The product's regexp is still a copy of the SDK text.

**Fix (any one of these):**
- Add a look-alike that matches only the loose form, for example `… [truncated: 5 more lines, foo — narrow with level/limit]`,
  expecting `marker=no`.
- Or build `CAP_MARK` from the SDK's marker text.

### MINOR-B: P6 survives
`recipes/s12-win-b.ps1:21`; `recipes/test/s12-ps-b.test.ts:62`.

**The mutant.** I replaced `$S9UIA::FromHandle([IntPtr]$w)` with `$S9UIA::RootElement`, so the search covers the whole
desktop. This is the round-0 P6, adapted to the new loop. All 27 tests pass.

**Why the new test misses it.** B13/`find-uses-scopes` checks only the `foreach` text by a regexp. No test sees which root the
finder walks, so a search that reaches the user's own windows goes undetected.

**Fix.**
- Stub `$S9UIA` with a `FromHandle` that records each handle and returns an element with a stub `FindAll`.
- Assert that `FromHandle` is called for exactly the `Get-S12SearchHwnds` list and nothing else.
- Assert that a match in a new window is returned.

## 5. NITs
- **NIT-4, the stamp before the read.** Fixed; B9 is red under the mutant. `Format-S12Timeline` and the `PRESSED` text are
  unchanged (`fmt` gives `5:1,9:0`), and `parseTimeline` is untouched, so form (15)'s input and output are as before.
- **NIT-5, the start line.** `TIMELINE <Row> started` is a `Say9` console line, not part of the signal text, so it does not
  affect parsing.
- **The F12 docked-pane close.** Leaving it unfixed is **acceptable as a recorded NIT**, for three reasons:
  - It lives in `s12-win.ps1`'s `Close-S12DevTools`, outside this slice's lane.
  - It runs only when DevTools was found as a pane.
  - A failure ends in the `devtools-left-open` STOP with X left open, by design.

  The session agent should carry it into the Run 19 sheet's note on the menu method.
- **A new NIT.** After a miss at step 1, no menu is open, so the Escape reaches the fixture page in X. That is still inside the
  lane (own window, 8081 fixture), but "sends no key" now means "no key except a closing Escape". The method's description
  could say so.

## 6. Handoff
Nothing is running. Scratch files are in `<scratchpad>/v2b/`: `proof.ps1`, `mut2.mjs`, and their outputs. A round-2 fixer
touches only the two test files, plus `s12-forms-b.ts:101` if it chooses the constant route. A fresh verifier then re-runs M28
and P6.

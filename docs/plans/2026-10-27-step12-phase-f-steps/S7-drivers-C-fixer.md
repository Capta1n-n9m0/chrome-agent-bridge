# S7-drivers-C fixer (round 1)

Model and effort: Sonnet 5.5, medium. Role: fixer (agent-rules section 6). Nothing ran against Chrome, a daemon or a port.

## Result
All findings fixed; none disputed. Every verifier mutant kind is now red (section 3). All seven recipe tsconfigs exit 0.
`npx vitest run recipes/test`: 64 files, 1606 passed. `npm run typecheck`: exit 0. `npm test`: 230 files, 5506 passed.
`npm run build`: exit 0 (`built extension -> dist/`).
Size (wc -l): code 501 (`s12-r19-c.ts`) + 139 (`s12-r19-c.ps1`) + 22 added lines in `s12-r19.ps1`, `-a.ps1`, `-lib.ps1` = 662 of 750;
tests 460 of 600.

## 1. Findings (file:line are in the files as they now stand)
- **MAJOR-1.** The wants and STOPs moved into pure, tested code.
  - `WANT` and `REFUSE_LEGS` tables (`s12-r19-c.ts:101-114`); every row judges against its entry.
  - One `stopWhen` (the only `new StopWhy`), `stopOnDialog`, `chooseLegPrecond`.
  - Tests: "each row's wants are the sheet's clauses" (every key of every want is in its §4.27 row text, LABEL together with CHOOSE-1's
    "As R19-CHOOSE-1 per leg"; REFUSE's four texts; each row uses its `WANT` entry; JSOFF uses `MSG.jsOff`, DISARM `MSG.disarmed`;
    exactly one `new StopWhy`, no printed `STOP` line, the call sites present).
  - PowerShell stub `Invoke-R19Row` and `Invoke-R19Steps` now honour steps, `-Restore` and `R19Changed` as the real ones do; checks P9
    (every row's failure path, closer on W and X), P19a-f (re-arm order, DISARM/JSOFF/MCP-d restores), P8b (clicks aimed at X only),
    P15 (the human step's STOP).
  - Verifier mutants re-run, all red: M1a-d (TS `tsmut.py`: "1 failed" each, also an inline-want and a size-based `outsideReached`),
    M2a/M2b (TS static, and P15 for `Invoke-R19HumanDialog`), M3a "DISARM restore without re-arm" (P19b), M3b "JSOFF no -Restore"
    (P19d), M3c "MCP d finally without `Restore-R19Js`" (P19e), M4a/b "MCP finally without `Close-R19Dialogs`" (P9:McpLegs, P9:McpD),
    M5a "click step on `$global:W`" (P8b). The test file runs 23 named PowerShell mutants (in parallel, one `beforeAll`).
  - Note: the mutant "DISARM drops the re-arm step" is red through the order check (`TB:False,TB:True,CLICK:55`), not by the count,
    because the restore also re-arms after a dropped undo.
- **MAJOR-2.** `outsideReached` = any file on the refused page, or `bytesEqual === true` (`s12-r19-c.ts:42`). CHOOSE-2's outside leg
  runs on its own page opened with `#sum=<sha256 of s11-out.bin>` and is read with the digest wait (`choose2`). HUMAN: `outsideDigestHit`,
  the page URL gets the digest from PowerShell (`Get-R19OutSumFrag`, STOP `throw-after-state` if the file is missing). Tests: the
  `outsideReached` cases (same size, different digest), P21, P22.
- **MAJOR-3.** `mcpCodeOf` / `judgeMcpErr` (`s12-r19-c.ts:84-95`) accept the failure report: `isError` text, or no `isError` with the code on
  line 1 and `The call failed (<CODE>).` as the last line (`mcp/src/tools/registry.ts:68-70`, `:332-337`). The old test line that pinned
  "isError required" now pins the real shape and the registry text; CHOOSE line's code comes from `mcpCodeOf`.
- **MINOR-1.** CHOOSE-FRAME gets a `dialog` leg (a dialog FAILs the row); both RECORD rows print `ROW <id> RECORD` through
  `$global:R19RecordRows` in `Complete-R19Row` (`s12-r19-a.ps1`, one line). This follows the verifier's section 5 proposal, which is
  still unruled. Tests: the real `Complete-R19Row` is extracted by the parser and run (RECORD, FAIL, PASS cases).
- **MINOR-2.** CHOOSE-1's first label is `sdk`, the second `ref`.
- **MINOR-3.** `chooseLegPrecond` per CHOOSE-4 leg; DISARM's dialog leg requires `DISARMED`; an unmet precondition is NOT MEASURED
  (a dialog left open is still the STOP). `CHECK ... precondition=met|not-met` printed.
- **MINOR-4.** `Invoke-R19HumanDialog` answers `unsent` when `Invoke-S12HumanClick` did not return `$true`; `parseDlg` reads it, the
  legs are NOT MEASURED (HUMAN too). Tests: P14, the `judgeDialog`/`parseDlg` cases.
- **MINOR-5.** `judgeG2` requires `a === "ok"`; A's code is printed (`CHECK ... a=<code>`).
- **MINOR-6.** Not an edit: the two readings need rulings (see section 2).
- **MINOR-7.** The page's `late` key is read and printed (`CHECK R19-CHOOSE-LATE <ms> late=<yes|no|error>`). `opened` stays files/dialog based:
  `late=yes` only says `click()` returned.
- **MINOR-8.** `dialogs` actor command prints form (30); `Write-R19Dialogs` (native count over W/X, DevTools windows other than the
  capture window `$global:D`, wave windows open = X and O) runs at the end of R19-RESTORE for liveC19 only
  (`s12-r19-lib.ps1`, one line), STOP `dialog-left-open` / `devtools-left-open` on a nonzero count. Tests: P16-P18, the static hook check.
  **liveA19 / liveB19's DIALOGS line, if section 4.27 needs one there (R19-RESTORE lists it for every slice), is unowned.**
- **MINOR-9.** `Invoke-R19G2` calls `Set-S11Front $global:W` first (test P20).
- **NIT-1.** The JSOFF control prints `CHECK ... control clicks=not-measured dialog=not-measured`.
- **NIT-2.** KEPT prints the failed call's code.
- **NIT-3.** LATE's watch is 9 500 ms from the call's start (`LATE_WATCH_MS`: the click's lead up to 1 500 ms + 8 000 ms after the click;
  reading the page during the wait is avoided on purpose, an `evaluate` during a chooser call might meet the keeper). Test pins both numbers.

## 2. For the step agent
- MINOR-6 rulings still open: CHOOSE-JSOFF's "the same through the MCP" is MCP leg d; CHOOSE-KEPT's "(fresh load each)" runs on one page.
- Needs a ruling: the RECORD print form (verifier section 5), now implemented.
- Test timing: `s12-r19-c.test.ts` takes about 50 s (one PowerShell per mutant, in parallel); `recipes/test` as a whole is slower than before.

## 3. Files changed
`recipes/s12-r19-c.ts`, `recipes/s12-r19-c.ps1`, `recipes/test/s12-r19-c.test.ts`; one line each in `recipes/s12-r19-a.ps1`
(`Complete-R19Row`) and `recipes/s12-r19-lib.ps1` (`Invoke-R19Restore`). Scratch scripts (mutants) are in the session scratchpad only.

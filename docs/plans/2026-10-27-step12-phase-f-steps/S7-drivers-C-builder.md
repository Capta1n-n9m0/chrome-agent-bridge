# S7-drivers-C builder: liveC19's row drivers (the file chooser and G2)

Model and effort: Sonnet 5.5, medium.

## 1. Verdict
DONE. Every block of liveC19's order has a registered driver (static test). Nothing ran against Chrome, a daemon or a port.

## 2. Outputs
- Test count (`npx vitest run recipes/test`): before 63 files / 1553 tests, after 64 files / 1589 tests (+36: 34 new tests, 2 from `s12-r19-c.ps1` in the static file's per-file checks). `npm test`: 230 files, 5489 passed.
- `npm run typecheck`: exit 0 (no errors). `npm run build`: `built extension → dist/` (exit 0). `npx tsc --noEmit -p recipes/<each of tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b>.json`: all exit 0.
- Size (`wc -l`): code `recipes/s12-r19-c.ts` 453 + `recipes/s12-r19-c.ps1` 118 = 571 lines (+ 20 registration lines in `s12-r19.ps1`) against 750; tests `recipes/test/s12-r19-c.test.ts` 320 against 600.
- Files created: `recipes/s12-r19-c.ts`, `recipes/s12-r19-c.ps1`, `recipes/test/s12-r19-c.test.ts`.
- Files changed: `recipes/s12-r19.ps1` (dot-sources `-c.ps1`, 17 `$global:R19Blocks[...]` registrations, the old "no driver yet" comment replaced), `recipes/s12-r19-b.ts` (the word `export` added to eight existing helpers: `code`, `ROOT`, `State`, `state`, `fileOf`, `ev`, `timeline`, `withTab`), `recipes/test/s12-r19-static.test.ts` (`s12-r19-c.ps1` added to the two file lists), `recipes/tsconfig.s11b.json` (the two new files in `include`, so they are typechecked).
- No `test-fixtures/` change: every liveC19 page element exists (`s12-chooser.*`, the playground's `g2a`/`g2b` section).
- Registered: r19-choose-1, -label, -refuse, -2, -3, -choose-mcp (legs a-c, e, no ROW), -kept, -frame, -human, -late, r19-keep-overlap-b, r19-choose-4, -disarm, -jsoff, r19-choose-mcp-d (leg d, prints the one ROW with the held lines), r19-g2-1, r19-g2-2. R19-0, BANNER-CTL, CLOSERPROBE, RESTORE, LOGS were already registered and are reused.

## 3. Verifier verdict
None yet (a fresh Opus verifier is the step agent's).

## 4. Deviations
None from the brief. The `export` additions to `-b.ts` and the tsconfig/static-test edits are lane-internal (recipes/).

## 5. Proposed decisions (design-local, for the step agent)
- **`dialog=` is read after the call's reply** (and after the reporter read), by UIA over window W and window X, and the closer closes what it finds so the next leg starts clean. The sheet says "during the call"; a dialog that is still open after the reply is counted, one that opened and closed itself is not.
- **R19-CHOOSE-4's and DISARM's `change` is the dialog's own delta** (page `change` after the close minus before the click). Leg a's call already set a file (`change=1`), so a literal "change after the close" cannot be 0 there.
- **R19-CHOOSE-2 (b) uses the raw wire call.** The SDK refuses a missing file itself (`upload: paths[0] does not exist`, K-missing, no wire call), so only a raw `uploadFiles` reaches the extension's text the sheet quotes; the carried F-RAW rows do the same.
- **CHOOSE-DISARM without a proved human click** runs its first half and prints `LEG … dialog NOT MEASURED`; R19-CHOOSE-4 and R19-CHOOSE-HUMAN print `ROW … NOT MEASURED — the human-style click opens no dialog` without running (a click not proved `$true`, including "CLOSERPROBE never ran", counts as not proved).
- **R19-G2-1's second variant (SDK default policy) is a `CHECK … variant=focusFirst` line**, recorded and not judged. G2-2's `got` is 40 on an exact match, else `min(39, length)`, so any difference counts as a loss.
- **R19-CHOOSE-LATE `opened`** = a file reached the page or a dialog showed.

## 6. Findings
- **§4.27 wording (not edited):** (1) R19-CHOOSE-1 says size 1 000, but `recipes/s11.ts` makes `s11-1k.bin` 1 024 bytes; the drivers judge against the size in `state.json`. (2) R19-CHOOSE-2 (b)'s extension text is unreachable through `tab.upload` (above). (3) R19-CHOOSE-4 `change=0` in leg a (above). (4) The JSOFF control's CHOOSE line needs `change`/`clicks`; the control page has no `__s12ch`, so `change` is `__s11`'s `changeEvents` and `clicks=0`. (5) R19-CHOOSE-1 "the ref call: `files=1 change=1` again on a fresh load" is read as one fresh page per call. (6) "CLOSERPROBE before every row that can raise a native dialog" is run once, as the runner's order has it.
- **First-run risks (unmeasured):** the dialogs' owner is assumed W or X (a tab opened by `newTab` is assumed to land in W); G2's B tab is opened first so it lands in W, and its default screenshot needs that tab active; the MCP error lines are assumed to start with the code; the MCP actor reads the reporter through `browser_evaluate` (regex on three comma-joined counts); `val` steps are matched to the actor's `sig` order by id, so an actor that dies early leaves the driver waiting as in -a/-b.
- Tests: the PowerShell side has 10 named mutants (closer not run, left dialog not a STOP, human step with no dialog or reading the count too early, closer skipped on failure, unproved click not gated, DISARM re-arm dropped, MCP leg d printing no ROW, legs a-c printing a ROW, MCP actor STOP dropped), each turning its check red.

## 7. Handoff
- Nothing running. No commit made. Files to stage: the three created files and the four changed ones in §2.
- S7-drivers-DE still owes liveD19's and liveE19's rows (`r19-old-args`, `r19-old-version` still print `NOT RUN`).
- Before S7-live: the step agent rules on §5 and §6.

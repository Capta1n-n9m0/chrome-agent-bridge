# S1-helpers-b fixer report (round 1 of 3)

Model and effort: Sonnet 5.5, medium. No Chrome, daemon, port 9234 or build. No `git stash`, `checkout --` or `reset`. Mutants were applied by a script that restores the exact original text (s11-win.ps1 compared byte for byte after).

## 1. Verdict
All eight findings are closed with tests that go red on their mutants. **DONE-PARTIAL on size only** (section 2): total new lines are over 1.5x the cap. The step agent must rule whether to accept it or split.

## 2. Outputs and numbers
- `npx vitest run recipes/test`: 1104 / 50 files before (re-run first) -> **1122 / 51 files** after.
- `npm test`: **4856 passed, 204 files** (S3a's files included; no failure).
- `tsc --noEmit -p`: seven `recipes/tsconfig*.json` exit 0; shared, daemon, sdk, mcp, extension exit 0.
- `Parser::ParseFile`: 0 errors and 0 non-ASCII bytes for s12-win.ps1, s11b-win.ps1, s11-win.ps1, s11b-r17b.ps1.
- Size (insertions, `git diff --numstat HEAD -- recipes` plus the two new test files): code **252** (s11-win 3, build 5, r17b-rules 18, r17b.ps1 2, s11b-win 1, s11b 85, s12-rules 49, s12-win 89), tests **350** (s11-win-static 3, r17b-fix 22, s12-helpers-b 197, s12-helpers-b-fix 128). Total 602 against the cap 350 (1.5x = 525). Code alone is under 350. The fixer added about 82 code and 168 test lines on top of the builder's 170 and 182.

## 3. Findings
- **F1 (scanner), fixed in the lane.** `scan18` and `isFixture18` in `recipes/s12-rules.ts` reuse `scanText` (token, sentinel, profile counted as `S11 scan` counts them); the `://` count takes only `scheme://host` matches and classes them by section 4.26's definition (8081 only). New `s11b scan18 --what console|daemon|actors|other [--file f]` prints `SCAN <what>: ://=<n> (fixture <n>, other <n>) token=<n> sentinel=<n> profile=<n>` and `CHECK R18-LOGS scan <what> ...` (exit 2 on a non-zero count, 3 on NOT MEASURED). s9-rules.ts untouched. `scan` and `scan18` share one text loader (`scanTextOf`). Tests: SCAN lines, own page, `127.0.0.1:8081` give other 0; 8084, `127.0.0.1:9234`, example.com, another extension id each give other; CLI form. Mutants red: port regex widened to 8081|8084 (3 tests), URL count +1 (pattern did not match, not run; the table test covers it).
- **F2 (raw-l1), fixed.** `raw-l1` is now the row's whole raw-call step: `daemon.status.build` check, ONE `raw-root` and ONE `raw-outside` call, each printing `S11 l1`'s CHECK (`CHECK UP-L1 <step> ...`, via the exported `judgeError`, `refusalPageJudge`, `buildJudge`, `checkLine`, and `all` by dynamic import) plus that call's `RAW R18-UP-L1 ...` line, then `ROW UP-L1 <verdict>` and a STOP on any failing step (an allowed upload included), as `S11 l1`. `l1Step` is exported and tested for a K-gate refusal and an allowed upload. Static ties to `S11 l1`'s source: calls array, method and params, build check, judge, one `uploadFiles` call site. Everything needed was already exported; s11.ts not edited. Mutant: dropping the STOP red (M24); a second call site is red by the count tie.
- **F3, fixed.** The patched `Invoke-S12Opt` runs with stubs: fi = 1 gives `OPT observed standing x1 invalid items 4 warned items 0`; a page with a warned found item gives `invalid items 3 warned items 1`. `raceLoopDone(toCap, outcomes)` is a pure helper (119 refusals end the default rule, not `--to-cap`; 120 end it) and the loop's call is tied. The `newtabTimed` call site is tied (`not.toContain` of the old call plus the CHECK branch). Two-match case of `Get-S12PatchedFunction` throws. Red: M8, M9, M5, M21, M15 (each 1 test; all five were green before).
- **F4, fixed.** `aggregateRows` takes everything between `ROW ` and the verdict word. Tests: the SAVE-REFUSE-R sdk-leg / mcp-leg pair gives two ids, no WARN; a true duplicate warns once and counts at the worse verdict. Mutant (old `ROW (\S+)`) red.
- **F5, fixed.** CLI tests (`main` with `--from` temp files): `rows18` (WARN plus CHECK), `leg-line` (PASS, FAIL, STOP gives FAIL, none gives NOT MEASURED), `raw-l1 --dry`, and the STOP path through `l1Step` (a daemon would be needed for the command itself). Red: M22 (FAIL mapped to PASS), M23 (WARNs dropped), M24.
- **F6, fixed twice over.** `realIo.signal` writes `<name>.ready.tmp` and renames it. `Read-S12ReplyMs` in s12-win.ps1 retries an empty or half-written read for 200 ms before giving 0 (then the existing STOP). PowerShell test: an empty file filled by the first sleep reads 12345; never filled reads 0. Mutant (retry 0 ms) red.
- **F7, fixed.** The comment at `s11b-win.ps1:352` now says `$S11Warning` holds the same S0F-a text. Run 16's runner (`s11-r16.ps1` -> `Invoke-S11Opt`) is retired for UP-OPT: its `judgeOpt` expects Run 16's texts and counts, so a re-run would fail on helper text. No code change for Run 16.
- **F8, fixed.** `Get-S12UrlClass` now matches the scanner: `(127.0.0.1|(label.)*localhost):8081` followed by `/`, `?`, `#` or end; `chrome://extensions` and the own id likewise bounded. A test runs the PowerShell function and `isFixture18` over one 11-URL table (8084, 9234, https, `chrome://extensionsx`, other extension id, https on 8081 included). Mutant (single-label subdomain) red.

Mutant runs (change, tests red, restored): M5, M8, M9, M15, M21, M22, M23, M24, F4, F6, F1, F8 all RED. A bogus extra mutant (M2x) left a non-zero exit with 39 passed; it is not claimed.

## 4. Deviations
- Size over 1.5x (section 2); stated, not hidden.
- `S11 l1` is no longer used in R18-UP-L1 (the ruling). s12-rules.ts now imports s11-rules (header comment updated); the s6 typecheck still passes.
- The fix tests are a new file `recipes/test/s12-helpers-b-fix.test.ts` (backslash-safe via Write); the PowerShell-run ones are in s12-helpers-b.test.ts.

## 5. Proposed decision
2026-10-27 · A bare `://` is not a URL; the Run 18 scan uses section 4.26's fixture definition. **Decided:** `s11b scan18` counts only `scheme://host` matches and classes them as the sheet's "fixture" (8081 only, no 8084, no 8083). **Why:** Run 17b's committed-mode FAIL came from the helpers' own `SCAN ...: ://=<n>` text, not from the own-page URL (s9's scanner already counted that); s9's `FIXTURE_ORIGINS` also lacks `127.0.0.1:8081`. **Instead of:** editing s9-rules.ts. **By:** Claude (proposed). The sheet's "Aggregator fixes" clause about the own page is a wording finding for the step agent.

## 6. Final file list for the committer
Changed: recipes/s11-win.ps1, recipes/s11b-win.ps1, recipes/s11b-r17b-build.ts, recipes/s11b-r17b-rules.ts, recipes/s11b-r17b.ps1, recipes/s11b.ts, recipes/s12-rules.ts, recipes/s12-win.ps1, recipes/test/s11-win-static.test.ts, recipes/test/s11b-r17b-fix.test.ts.
New: recipes/test/s12-helpers-b.test.ts, recipes/test/s12-helpers-b-fix.test.ts, this report (and the builder and verifier files already listed).

## 7. Handoff for S1-helpers-c (supersedes the builder's)
Load order: dot-source s9-win.ps1, s11-win.ps1, s11b-win.ps1, then s12-win.ps1, then `Assert-S12Patched`.
- **R18-UP-L1:** `S11 foundcheck`, then `s11b raw-l1` only (never `S11 l1`). It needs the s11 state with the `l1` tab. Prints `CHECK UP-L1 build ...`, per call `CHECK UP-L1 raw-root|raw-outside ...` then `RAW R18-UP-L1 <label> code=... key=... data=...`, then `ROW UP-L1 <verdict>` (the runner maps it to `ROW R18-UP-L1` as the R17B carried-row path maps it). Exit 2 on any failing step, an allowed upload included.
- **R18-UP-OPT:** `Invoke-S12Opt $O $Root $ObsJson`; prints `OPT observed ...` and `OPT O2 ...`; then `Get-S11bOptObs` as in the R17 block.
- **R18-UP-RACE-A:** actor `s11b race --to-cap`; driver `Invoke-S12RaceA $Btn`. The loop-done file now holds the last reply epoch ms, written atomically; the driver reads it with `Read-S12ReplyMs` (200 ms retry); ON is pressed 1 600 ms after it and `RACE ON pressed <ms> after last reply` printed.
- **R18-BANNER-CTL:** unchanged from the builder's note (`bannerctl-judge` needs `--violations`, the sum of the two CHECK numbers).
- **R18-SAVE-REFUSE legs:** capture each leg's record lines to a file outside the repo; `s11b leg-line --row R18-SAVE-REFUSE --leg sdk-leg|mcp-leg --from <file>`. The leg ROW lines (`ROW SAVE-REFUSE-R sdk-leg ...`) now aggregate as two ids with no WARN; the row's single `ROW` line is the runner's.
- **Aggregation:** `s11b rows18 --from <record lines file>`.
- **R18-LOGS scans:** `s11b scan18 --what console|daemon|actors|other [--file f]` for each of console, `daemon.log` copy, actors; use it instead of `s11b scan` and `S9 scan-file` for Run 18's record. Commit text only after a passing scan.
- **G-23, HIST/ACT:** as the builder's note (`newtab-timed` prints a CHECK for the interim verdict; `r17b-history` lines go to the record).

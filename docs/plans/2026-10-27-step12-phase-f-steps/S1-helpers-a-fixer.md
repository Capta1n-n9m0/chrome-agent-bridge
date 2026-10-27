# S1-helpers-a fixer, round 1

Model: Sonnet 5.5, effort medium. Leaf agent: no agent spawned, nothing committed. `npm run build` not run in the main tree (it would bundle S2a's uncommitted extension code). No Chrome, daemon or port touched.

## Per finding

- **F1 (MAJOR).** New `recipes/test/s12-ps.test.ts` (152 lines) runs the real PowerShell from vitest (s11-r16-runner pattern: stubbed `Say9`, `Stop9`, `Assert-S11Outside`, `Save-S11bConsole`, `Start-Sleep`, UI detectors; dot-sources `s12-win.ps1`; `Get-S12NowMs` stubbed so the 14 999/15 000 boundary is exact). Four groups, 16 checks, all true on the real file: `Save-S12Console` and `Assert-S12CaptureFree` (absent/blank saved; text STOP + throw, no save, text never in any output), `Test-S12Idle` and `Wait-S12Idle` (14 999 STOP+false, 15 000 IDLE+true, missing STOP with no IDLE line; waits 15 000/11 000/none), the legs, `Open/Close-S12DevTools`. `it.skipIf(!hasPs)`. Chosen: run the PS (not TS-calls). The TS twins `captureStop`/`idleCheck`/`idleWaitMs` stay as spec tests only.
  Mutants, each a permanent test that applies the text change to the PS and expects its check to turn false (all 13 ran red, i.e. each mutant test passes only because the check flipped): M10 (capture STOP `-ne`->`-eq`), M11 (capture throw removed), M15 (`-lt`->`-le`), M16 (no `return $false` after the idle STOP), M17 (unknown stamp returns true), F4 (no `Assert-S12Tail` in `Test-S12Idle`), M-wait (unknown stamp not waited), F2 (idle STOP back in the neg leg), M18 (neg unknown guard removed), F6 (result not global), M19 (fixture check removed), F9 (8084 allowed), M20 (`Close-S12DevTools` never STOPs).
- **F2.** `s12-win.ps1` `Invoke-S12BannerLeg`: the STOP for idle < 15 000 is gone; the leg measures and prints; the judge FAILs. Kept: an unknown stamp in the neg leg is still a STOP before the window (there is no number to print). `Wait-S12Idle` unchanged (waits the full 15 s on an unknown stamp). Tested (neg at 5 000 runs the sampler and records idle=5000; unknown stops).
- **F3.** `s12-helpers.test.ts` `s11bTies(text)`: neg branch holds no `session(`/`bcall(`/`connect`; `devtLines(devtSlice, ctl1.err?.code ?? "ok", ctl2...)`; exactly one `bcall(c, "evaluate", { tab: h, expression: "1", ...`; the judge ends `bump(ls[2]!.includes(" PASS ") ? 0 : 1)`. A test feeds mutants of the file text to it: M21 (forced `DEBUGGER_DEVTOOLS`), M22 (a bcall in the neg leg), M23 (expression "2"), M26 (`bump(0)`), F11 (late validation): each returns its problem. No tsconfig change.
- **F4.** `Test-S12Idle` calls `Assert-S12Tail` first (`s12-win.ps1`). Tested with `$S11SampleTailMs = 4000` (throws, STOP); mutant F4 red.
- **F5.** No code. See Handoff.
- **F6.** `Invoke-S12BannerLeg` also leaves its result in `$global:S12Leg` (Leg, IdleMs, Polls, Banner). `s11b.ts` `bannerctl` prints `CHECK bannerctl-<leg> violations=<n>`; for pos, `ANSWER R18-BANNER-CTL pos` is `VIOLATION` when n > 0 and no error code, so the judge FAILs it (answer != ok). Static tie on the `evaluate` leg; the PS global is tested.
- **F7.** New `Assert-S12CaptureFree <slice>` (STOP + throw when the raw path holds text; returns the path); `Save-S12Console` calls it. Tested; mutant M11 red.
- **F8.** `extension/src/evaluate/wrap.ts` at HEAD: `wrapExpression` returns `code` unchanged unless it holds a top-level `return`, so the bare `1` evaluates to 1. `s11b.ts` now sends `expression: "1"` as §4.26 writes. No deviation.
- **F9.** `Open-S12DevTools` requires `^http://(127\.0\.0\.1|localhost):8081/` (no `Test-S11Url`). Tested (about:blank, :8084 get no key); mutants M19, F9 red.
- **F10.** Committed and raw names are each checked against §4.26 for both slices, and `-att2` is checked; the parse test is `it.skipIf(!hasPs)`.
- **F11.** `devt` computes `devtSlice` (`sliceOf`) and `devtRow` (`rowOpt(a, ["R17-UP-DEVT","R18-UP-DEVT"])`) before any call, right after the dry check. Static tie, before the upload; mutant red.

## Checks

- `npx vitest run recipes/test`: before 48 files / 1072 passed; after `Test Files 49 passed (49)`, `Tests 1090 passed (1090)`.
- Seven recipes tsconfigs (tsconfig, .fe, .s6, .s9, .s10, .s11, .s11b): all exit 0.
- `npm test`: first run `2 failed | 4766 passed (4768)` (names not captured); an immediate re-run `Tests 4768 passed (4768)`, `Test Files 198`. I did not establish what the first failures were (likely load: the full suite takes ~160 s of test time). Reported, not acted on.
- `npm run typecheck`: no error output, run to its end (the S2a caveat did not bite this time).
- `s12-win.ps1`: `Parser::ParseFile` errors=0; 0 non-ASCII bytes.

## Files and size (for the committer)

`recipes/s12-rules.ts` 52 (unchanged), `recipes/s12-win.ps1` 140, `recipes/s11b.ts` (slice additions +48/-1 vs HEAD), `recipes/test/s12-helpers.test.ts` 165, `recipes/test/s12-ps.test.ts` 152, plus the builder, verifier, evidence and this report. New lines in the slice: 52 + 140 + 165 + 152 + 49 = **558** (code about 270; tests 317), over 450 but under the 675 (1.5x) allowance for test-heavy slices.

## Deviations

- Neg leg with an unknown stamp stays a STOP (the ruling removed only the under-15 000 STOP; the unknown case has no measured idle to print).
- `Get-S12NowMs` was added so the clock is injectable (not asked; needed for exact boundary tests).

## Proposed decisions

None beyond the verifier's (guards tested in the language that runs them), which this round applies.

## Handoff for S1-helpers-b and the R18 runner (supersedes the builder's section 7)

- Dot-source order: s9-win, s11-win, s11b-win, then s12-win.ps1. Name no top-level runner variable with an S12 prefix.
- The runner's process wrapper must call `Set-S12AttachStamp` after every actor process (any call that can attach the debugger). A forgotten call overstates the idle and no guard fires. S1-helpers-b should test that the wrapper does it.
- Prologue, before R18-0: `Assert-S12CaptureFree 'liveA18'` (and liveB18 before its slice). An attempt after the first uses a fresh out folder (raw names have no `-attN`).
- Console capture: `Save-S12Console $D 'liveA18'` after R18-RESTORE just before the console window closes; then `s11b console-line --slice liveA18 --file <out>\console-liveA18.txt`; then the scan. Committed copy `S1-live-console-liveA18.txt` (`-att2` later).
- Banner control per slice, before the first banner row: open `http://localhost:8081/e2e-playground.html?s12=bc` and keep the handle; `Wait-S12Idle`; neg: `Invoke-R17Node 's11b' @('bannerctl','--leg','neg') { [void](Invoke-S12BannerLeg 'neg' @($hwnd)) }` and read `$global:S12Leg` (IdleMs, Polls, Banner) afterwards (Invoke-R17Node returns only the exit code); `Set-S12AttachStamp`; pos: same with `--leg pos --tab <handle>`, answer from the `ANSWER R18-BANNER-CTL pos <ok|CODE|VIOLATION>` line, polls and banner from `$global:S12Leg`; `Set-S12AttachStamp`; then `s11b bannerctl-judge --slice liveA18 --idle-ms <neg IdleMs> --neg-polls .. --neg-banner .. --pos-answer .. --pos-polls .. --pos-banner ..` (exit 0 PASS, 1 FAIL). An idle under 15 000 reaches the judge and FAILs the row.
- Before each banner row's first call: `Wait-S12Idle`, then `if (-not (Test-S12Idle '<row>')) { throw 'stop' }` (it also checks the sampler tail is 0). Use `Invoke-S12Sampler` where a row calls `Invoke-S11Sampler`.
- DevTools row: `Invoke-R17Node 's11b' @('devt','--slice','liveB18','--row','R18-UP-DEVT') { [void](Invoke-S12DevtRow $X) }`; window X must be on the 8081 upload fixture. `--row` is R17-UP-DEVT or R18-UP-DEVT.
- S1-helpers-b still owns the VERDICT_LINE and aggregator changes, the RAW and OPT lines, and the runner.
- Re-verify: re-run the mutant tests in `s12-ps.test.ts` and the five `s11bTies` mutants.

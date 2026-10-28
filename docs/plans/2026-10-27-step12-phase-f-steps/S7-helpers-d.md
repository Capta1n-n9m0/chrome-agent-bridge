# S7-helpers-d: Run 19's block runner (step report; step agent Opus 5.5, medium)

## 1. Verdict
**DONE-PARTIAL.** The runner's orchestration is built, verified and committed. The row drivers are not built. 40 of §4.27's rows, and the DEVPROBE probe, print `NOT RUN — no driver built`, so every DevTools row stays NOT RUN and never passes. Code is 519 lines against a cap of 400 (#344 (4)). Code alone over the cap is DONE-PARTIAL by agent-rules §7. Nothing ran against Chrome, the daemon or port 9234.

## 2. Outputs
- New: `recipes/s12-r19.ps1` (entry, 99 lines), `recipes/s12-r19-lib.ps1` (sequencer, STOP/RETURN, old-build swap finally, UP-OPT gate, capture segments, R19-0, closer, restore, logs; 242), `recipes/s12-r19.ts` (forms (28) (29) (31) (32), aggregator, `proof`/`proofExit`, `swap`, `restore-head`, `daemonlog`, `scan-actors`, `rows19`; 178).
- Tests: `recipes/test/s12-r19.test.ts` (292 lines: stubbed sequencer checks, mutants, and the realistic-layer suite that uses the real `Invoke-R17Node` with only `Start-Process` faked) and `recipes/test/s12-r19-static.test.ts` (242 lines: forms by key, ASCII, no `SilentlyContinue`, every called entry point exists, slice order against the sheet).
- Edited: `recipes/s12-oldbuild.ts`, M1's three error wordings only.
- Counts are from verifier2's runs: `npx vitest run recipes/test` 1351 / 59 files before, 1433 / 61 after (three runs). `npm test` 5333 passed, 227 files. `npm run typecheck` exit 0. All seven `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0. `npm run build` exit 0 (same HEAD; no wave runs).
- Mutants red: skipped restore on throw, swap without the finally restore, STOP without RETURN, row out of order, R19-UP-OPT without the investigator's report, plus the fixer's 7 F1 mutants and the F5 one.
- **M5 (#359):** 23 runs reported, no failures. Verifier1 ran `s12-ps-c.test.ts` 20 times alone (26/26 each) and the full recipes suite 3 times (1411/1411). Verifier2 repeated both on the post-fix tree: 20 times alone (26/26 each) and 3 full runs (1433/1433). The builder and fixer each ran it 3 more times (26/26). No recurrence, so no fix round for M5.
- Commit: see the committer line under §7.

## 3. Verifier verdict
- Round 1, `S7-helpers-d-verifier.md` (Opus, medium): **FAIL** on F1 (MAJOR). The tests stubbed `Invoke-R17Node` to return only an exit code. With the real one, a stale build, a failed restore-head and a failed re-proof printed `throw-after-state`, LOADED was printed twice and before MANIFEST, liveD19 could not reach R19-ARGS-OLD, R19-LOGS stopped before its ROW lines, and M1's wording never reached the record. Also F2, F3 (MINOR) and F4–F6 (NIT).
- Fix round 1, `S7-helpers-d-fixer.md` (Sonnet, medium): fixed F1, F2, F3, F5 and F6. F4 is a note for this report.
- Round 2, `S7-helpers-d-verifier2.md` (Opus, medium): **PASS-with-notes**. Notes carried, unfixed:
  - **N-1 (MINOR):** the mutant at `recipes/test/s12-r19.test.ts:248` turns red only because its replacement text contains `$'` and the mutated file fails to parse. The guard is real: the correct mutant is also caught. Fix: `replace(from, () => to)` at `:241` and `:268`, plus a parse check for each mutant.
  - **N-2 (NIT):** a proof that crashes is labelled "stale".
  - **N-3 (NIT):** the re-proof after the old-build slices demands every count, where §4.27 asks only for `args=answered`.
  - **N-4 (NIT):** the `swap` catch can print a raw fs path. `Show-S16` masks it as `<PROFILE>`, but the comment says it names no path.
  - **N-5 (NIT):** on an R17b-0 STOP inside R19-0, the held LOADED line never reaches the record.

  The next driver slice should fix N-1 to N-5.

## 4. Deviations
- DONE-PARTIAL. The brief said the runner calls S7-helpers-a/-b/-c's entry points to run the rows, but those slices built line forms, UIA helpers, fixtures and the swap, not row drivers. S7-helpers-b.md §7 says so for CLOSERPROBE helpers, KEEP-3, KEEPSEQ/KEEPEND and the runner.
- **F4** (verifier1, accepted): Run 18's `Invoke-R18UpOpt`, `Up6`, `Raw`, `BannerCtl` and `UpDevt` (`recipes/s12-r18-lib.ps1`) map onto R19 rows but cannot run them as they stand. They hard-code `R18-` ids, use a 15 000 ms idle wait where §4.27 asks for 20 000, and `bannerctl-judge` accepts only the liveA18/liveB18 slices. DEVPROBE has its window procedure (`Invoke-S12DevProbe`) and `devprobe()` in `recipes/s12-forms-b.ts`, but no command calls `devprobe()`. These are the base for the driver slices.
- Code is 519 lines against the 400 cap. The tests (534) are within their 600.

## 5. Proposed decisions
### 2026-10-28 · The row drivers for Run 19 are their own slices
**Decided:** S7-helpers-d ships the orchestration only. The drivers go to new slices before S7-live, split per Run 19 slice so each fits the cap. **Why:** no earlier slice built them, and they need about 40 rows of work. **Instead of:** growing this slice past 1.5 times its cap. **Revisit if:** the session agent prefers to run S7-live with NOT RUN rows. **By:** Claude (proposed; for the session agent)

### 2026-10-28 · A throw before any state change is printed `STOP throw-after-state`
**Decided:** §4.27's reason list has no reason for this case, so it prints `restored=n/a readback=n/a`. **Why:** the list is exhaustive. **Instead of:** adding a 14th reason. **Revisit if:** the session agent wants a separate word. **By:** Claude (proposed; builder)

Verifier2 accepts this decision now that F1 sends the escalation reasons to their own words.

### 2026-10-28 · R19-UP-OPT's investigator report is `docs/plans/2026-10-27-step12-phase-f-steps/S7-up-opt-investigator.md`
**Decided:** the gate needs that file committed (`git log -1 -- <path>` non-empty). Otherwise it prints `ROW R19-UP-OPT NOT RUN — the UP-OPT investigator's report is absent or not committed (Open item 14)`, and `root-add` runs instead. **Why:** §4.27 names no file. **By:** Claude (proposed; builder)

## 6. Findings
- Wording in §4.27 (none edited; details in `S7-helpers-d-builder.md` §6):
  - **W1:** R19-0's "LOADED is the second line" against R17b-0's two `Show-S16` calls. The runner holds LOADED and prints it right after MANIFEST.
  - **W2:** `texts=` in the CONSOLE line is undefined. The runner prints the stream's line count.
  - **W3:** the guard prints `STOP: <message>` (with a colon) as well as the sheet's `STOP <reason>`.
  - **W4:** R19-CHOOSE-MCP spans two liveC19 blocks.
  - **W5:** the `[Image: source:` form is in no committed test, so Open item 15 stands. It is pinned by regex. The `Screenshot:` form is pinned against `sdk/src/error.ts:423` and `sdk/test/failure-report.test.ts:531`.
  - **W6:** R19-F-RAW, -2 and -DIR share one table cell.
- M2–M4 of S7-helpers-c.md do not bind the runner. They bind `Invoke-S12HumanClick` / `Find-S12ClickTarget`, which only the unbuilt drivers reach.
- No new runtime fact: nothing ran live.

## 7. Handoff
- Nothing running: no PIDs, servers or worktrees. `extension/dist/` was rebuilt at the same HEAD.
- **Before S7-live:** the drivers for R19-BANNER-CTL, ARGS-*, CON-* (incl. CON-BANNER, CON-MCP, CON-CAP), UP-OPT, UP-6, F-RAW*, KEEP-*, CON-KEPT, KEEP-OVERLAP, DEVPROBE (a command that calls `devprobe()`), SWEEP-HELD (it must call `Save-R19Seg`/`Open-R19Seg` around its reload), UP-DEVT, DEVT-NOFLAG, CHOOSE-* (split as W4), G2-*, ARGS-OLD and VERSION, plus N-1 to N-5.
  - Register each driver in `s12-r19.ps1` as `$global:R19Blocks['<block>'] = { ... }`.
  - MCP drivers write `actors-<slice>.jsonl` (one `{"tool","text"}` per tool result) into `$S11_OUT`.
  - The UP-OPT investigator's report must be committed before liveB19.
- **S7-live command sequence** (Git Bash, each in the background, a fresh `S11_OUT` outside the repo per attempt, and `-Att <n>`):
  1. `S11_OUT=<dir> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r19.ps1 -Block plan` prints the five orders.
  2. Run `-Block liveA19`, then `liveB19`, `liveC19`, `liveD19`, `liveE19`, each with `-Att <n>`. Exit 0 means done; exit 2 means STOP.
  3. Run `-Block teardown` only after a slice stopped, and never after a failed-restore STOP.
  - Each slice runs: preflight, servers, files, window, reload, console, r19-0, the slice's rows, r19-restore, r19-logs, teardown.
  - liveD19 runs r19-old-args: swap to `3ab9207`, reload, the `UNKNOWN_METHOD` LOADED proof, the row, then the finally (restore-head, save segment, reload, reopen console, re-proof).
  - liveE19 runs r19-old-version the same way at `63c771c`.
- **Output files** (`$S11_OUT`):
  - `r19-framing.txt`, `r19-globals.clixml`
  - `console-liveA19.txt`, `console-liveC19.txt`, `console-liveB19-<k>.txt`, `console-liveD19-<k>.txt`, `console-liveE19-<k>.txt`, `console-<slice>-all.txt`
  - `daemon-slice-<slice>.txt`, `rows19-<slice>.txt`, `actors-<slice>.jsonl`
  - `old-wt\` (scratch worktree, removed by the swap)
  - Record: `docs/plans/2026-10-27-step12-phase-f-steps/S7-live-record-<slice>[-att<n>].txt`
  - The preflight refuses a capture path (any segment k=1..3) that already holds text.
- **STOP lines.** Every STOP is `STOP <reason>` followed by `RETURN <seq> after-stop=<reason> restored=<yes|no|n/a> readback=<equal|n/a>`. The guard's own `STOP: <message>` may come before it.
  - `old-build-left-loaded`: R19-0's proof shows UNKNOWN_METHOD or VERSION (before any state change, `n/a`); or, in the old-build finally, a failed segment save, restore-head, reload, console reopen or re-proof. The message names the stale extension.
  - `throw-after-state`: any other throw, including one before the first state change (`n/a`).
  - `dialog-left-open`: CLOSERPROBE left a native dialog.
  - `text-leak`: R19-LOGS found a token, sentinel, profile path or non-fixture URL in the console or daemon stream, or a DAEMONLOG probe above 0. The ROW lines and `rows19` print first.
  - Reachable only by the future drivers through `Stop-R19`: `attach-after-disarm`, `attach-on-refused-page`, `kept-session-used`, `dialog-not-opened`, `outside-file-reached-page`, `args-ran-js-off`, `existing-tool-changed`, `devtools-left-open`, `not-restored`.
  - Other lines: `ROW R19-UP-OPT NOT RUN — the UP-OPT investigator's report is absent or not committed (Open item 14)`, `ROW R19-CON-FILE NOT RUN — waits for G11-3`, `ROW <id> NOT RUN — no driver built`, `CHECK devprobe NOT RUN — no driver built`, `CAPSEG <slice> seg=<k> saved=<yes|no> before=<reload|end>`, `CONSOLE <slice> segments=…`, `WAVE stopping: …`.
- Fix rounds used: 1 of 3. Needs the user's keyboard: nothing.
- Briefs' READ lists: as the step brief; the verifiers also read the builder and fixer reports as claims to audit.
- Committer: (hash below)

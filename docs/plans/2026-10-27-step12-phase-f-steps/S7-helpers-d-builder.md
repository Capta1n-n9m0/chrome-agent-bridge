# S7-helpers-d builder: Run 19's block runner (Sonnet 5.5, medium)

## 1. Verdict
**DONE-PARTIAL.** The runner's orchestration is built and tested. The row drivers are not. No S7-helpers-a/-b/-c entry point drives an SDK or MCP row (they are line forms, UIA helpers, fixtures, and the swap), so for 40 of §4.27's rows the runner prints `ROW <id> NOT RUN — no driver built (S7-helpers-d DONE-PARTIAL)`. Code is 492 lines (167 `s12-r19.ts`, 226 lib, 99 entry; about 50 of the entry are r18's copied prologue) against a cap of 400. Tests are 426 lines (cap 600). Code alone over the cap is DONE-PARTIAL by §7.

## 2. Outputs (nothing committed)
- New: `recipes/s12-r19.ts` (forms (28) (29) (31) (32), `checkStopReturn`, `dedupeRulesOnly`/`aggregateSlice`, `scanToolText`/`scanActors`, `capturePath`/`capsegLine`, commands `proof`, `swap`, `restore-head`, `daemonlog`, `scan-actors`, `rows19`), `recipes/s12-r19-lib.ps1` (sequencer, STOP/RETURN, swap finally, gates, capture segments, R19-0, closer, restore, logs), `recipes/s12-r19.ps1` (entry; dot-sources r18's lib only for `Get-R18Defs`).
- Tests: `recipes/test/s12-r19.test.ts` (PowerShell with stubs: 23 checks green on the real lib and red on a stub lib, plus 8 mutants), `recipes/test/s12-r19-static.test.ts` (28: forms by key, parse/ASCII/no SilentlyContinue, every called command and node subcommand exists, slice order against the sheet).
- Edited: `recipes/s12-oldbuild.ts` (M1 wording only, see §4).
- `npx vitest run recipes/test`: 1351 tests / 59 files (before) → 1411 / 61 after. `npm test`: 227 files, 5311 passed. `npm run typecheck` exit 0. `npm run build`: `built extension → dist/` (exit 0).
- `npx tsc --noEmit -p`: tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b all exit 0.
- `npx vitest run recipes/test/s12-ps-c.test.ts` three times: 26 passed, 26 passed, 26 passed. (M5 did not recur. The one full run in which two old-wording tests failed was my own M1 change, fixed before the final runs.)
- Mutants red (each turns its named check red, `s12-r19.test.ts`): skipped restore on throw; swap without the finally restore; STOP without a RETURN; row out of order; R19-UP-OPT running without the report; R19-0 not first; LOADED not released after MANIFEST; re-proof skipped.

## 4. Deviations and what was done for M1–M4
- **No row drivers** (above). Probes `DEVPROBE` has no CLI actor either (`s12-forms-b.ts devprobe()` exists, nothing calls it): the runner prints `CHECK devprobe NOT RUN — no driver built`, so every DevTools row stays NOT RUN, never a pass.
- **M1 (done).** `swapOldBuild`'s three post-touch throws now say what happened: `WORDING.link` ("the scratch worktree could not be removed: a link is left in it ... no HEAD rebuild ran: call restoreHead"), `WORDING.gitExit` (git exited non-zero, no link left), `WORDING.removeThrew` (removal threw before any restore was attempted; no longer says "the restore failed"). A restore that ran and failed keeps its own wording. Pinned in `s12-r19-static.test.ts`. The old tests in `s12-forms-c.test.ts` still pass (the phrase "worktree could not be removed" is kept).
- **M1 runner rule (done).** `Invoke-R19Swapped`: `try { save segment; swap; reload; rows } finally { restore-head; save segment; reload; reopen console; re-proof }`. A failed restore-head, a failed reload, or a failed re-proof is `STOP old-build-left-loaded` with RETURN (message names the stale extension). Tests: rows throw, swap fails, clean run, stale proof, restore-head fails.
- **M2** (leftover worktree unreported when a step and a link both fail): does not bind the runner; the runner only sees the thrown message. Not changed.
- **M3** (FromPoint compares windows, not elements): binds only `Invoke-S12HumanClick`, which the runner reaches only through drivers not built. Not changed; the runner never clicks.
- **M4** (no test runs the real `Find-S12ClickTarget`): same, not the runner's. Not changed.
- Size: code over cap by 92 lines (1.23x), tests under.

## 5. Proposed decisions
### 2026-10-28 · A throw before any state change is still printed `STOP throw-after-state`
**Decided:** §4.27's 13 reasons have none for a throw before the first state change; the runner prints `throw-after-state` with `restored=n/a readback=n/a`. **Why:** the list is exhaustive; inventing a reason would break the form check. **Instead of:** a 14th reason. **Revisit if:** the session agent wants a separate word. **By:** Claude (proposed)
### 2026-10-28 · R19-UP-OPT's report is `docs/plans/2026-10-27-step12-phase-f-steps/S7-up-opt-investigator.md`
**Decided:** the gate needs that file to exist, be non-empty and be tracked by git (`git ls-files`). Absent: `ROW R19-UP-OPT NOT RUN — the UP-OPT investigator's report is absent or not committed (Open item 14)`, and `root-add` then runs (UP-OPT normally adds ROOT; without it the later upload rows need it). **Why:** §4.27 names no file; the checker naming rule gives this one. **By:** Claude (proposed)

## 6. Findings (wording in §4.27, none edited)
- W1. R19-0's "LOADED is the second line": R17b-0's block prints MANIFEST and its other lines in two `Show-S16` calls. The runner reads the build first, then releases LOADED through a temporary `Show-S16` wrapper right after the MANIFEST line (tested). It reads the page before any state change, as the sheet says, but also opens a tab before R17b-0 does.
- W2. `CONSOLE <slice> segments=<k> capture=… texts=<n> …`: `texts=` has no definition; the runner prints the stream's line count. R18's `console-line` command only accepts slices `liveA18/liveB18` and was not reused.
- W3. Form (31): the guard line printed by `Stop9` is `STOP: <message>` (with a colon); the sheet's `STOP <reason>` line is printed by the runner in addition. `S16Stops` counts only the colon form.
- W4. R19-CHOOSE-MCP spans two blocks in liveC19 (legs a-c,e, then leg d after JS off). The runner has block `r19-choose-mcp` (silent) and `r19-choose-mcp-d` (prints the one ROW). A driver for it must follow that split.
- W5. The `[Image: source:` form is in no committed test (Open item 15 stands); it is pinned by regex against the Step 8 run records and #349, the `Screenshot:` form against `sdk/src/error.ts:423` and `sdk/test/failure-report.test.ts:531`. A `BRIDGE_FAILURES_DIR` outside `.chrome-agent-bridge\failures` makes the line count as `profile-other`.
- W6. The slice bullets say "R19-F-RAW, -2, -DIR" and the table has one cell for three ids; tests accept that.
- No new runtime fact: nothing ran against Chrome.

## 7. Handoff (to S7-live and the next builder)
Nothing running: no PIDs, servers, worktrees. `extension/dist/` was rebuilt by `npm run build` (same HEAD).

**Still to build (the remaining part):** the drivers for R19-BANNER-CTL, ARGS-*, CON-* (incl. CON-BANNER, CON-MCP, CON-CAP), UP-OPT, UP-6, F-RAW*, KEEP-*, CON-KEPT, KEEP-OVERLAP, DEVPROBE, SWEEP-HELD, UP-DEVT, DEVT-NOFLAG, CHOOSE-*, G2-*, ARGS-OLD, VERSION. Register each in `s12-r19.ps1` as `$global:R19Blocks['<block>'] = { ... }`; the sequencer, gates, console-clause deferral (`Invoke-R19RowBlock ... -Defer`), STOP/RETURN and the segment helpers (`Save-R19Seg`/`Open-R19Seg`; SWEEP-HELD must call them around its reload) are ready. MCP drivers must write `actors-<slice>.jsonl` (one `{"tool","text"}` per line, tool results only) into `$S11_OUT` for R19-LOGS' actor scan.

**Commands** (Git Bash, per slice; each in the background, `S11_OUT` outside the repo, a fresh one and `-Att <n>` per attempt):
`S11_OUT=<dir> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r19.ps1 -Block <slice> [-Att n]` with `<slice>` in order `liveA19`, `liveB19`, `liveC19`, `liveD19`, `liveE19`. `-Block plan` prints the five orders; `-Block teardown` only after a slice stopped and never after a failed-restore STOP. Exit 0 done, 2 STOP. The UP-OPT investigator's report must be committed before liveB19.
Per slice order (printed by `plan`): preflight, servers, files, window, reload, console, r19-0, then the slice's rows, r19-restore, r19-logs, teardown. liveD19: r19-old-args = swap to `3ab9207`, reload, `LOADED ... UNKNOWN_METHOD` proof line, row, then the finally. liveE19: r19-old-version = `63c771c`.

**Files written** (`$S11_OUT`): `r19-framing.txt`, `r19-globals.clixml`, `console-liveA19.txt`, `console-liveC19.txt`, `console-liveB19-<k>.txt`, `console-liveD19-<k>.txt`, `console-liveE19-<k>.txt`, `console-<slice>-all.txt`, `daemon-slice-<slice>.txt`, `rows19-<slice>.txt`, `old-wt\` (scratch worktree, removed by the swap). Record: `docs/plans/2026-10-27-step12-phase-f-steps/S7-live-record-<slice>[-att<n>].txt`. The preflight refuses a capture path (any segment k=1..3) that already holds text.

**STOP lines the runner can print** (always `STOP <reason>` then `RETURN <seq> after-stop=<reason> restored=<yes|no|n/a> readback=<equal|n/a>`):
- `throw-after-state`: any throw not named below (restored `yes`/`no`/`n/a`).
- `old-build-left-loaded`: R19-0's proof says the build is not this one (UNKNOWN_METHOD/VERSION, before any state change, `n/a`); `restore-head` failed; the reload after it failed; the re-proof (`LOADED rerun=<k>`) failed (the message names the stale extension).
- `dialog-left-open`: CLOSERPROBE left a native dialog (`opened=no` alone is not a STOP; `R19HumanClick` becomes false).
- `text-leak`: R19-LOGS: a token, sentinel, profile path or non-fixture URL in the console or daemon stream, or a DAEMONLOG probe above 0 (the row and rows19 print first).
- Reachable by a driver through `Stop-R19 '<reason>' '<why>'`, no driver uses them yet: `attach-after-disarm`, `attach-on-refused-page`, `kept-session-used`, `dialog-not-opened`, `outside-file-reached-page`, `args-ran-js-off`, `existing-tool-changed`, `devtools-left-open`, `not-restored`.
Other lines: `ROW <id> NOT RUN — the UP-OPT investigator's report is absent or not committed`, `ROW R19-CON-FILE NOT RUN — waits for G11-3`, `CAPSEG <slice> seg=<k> saved=<yes|no> before=<reload|end>`, `CONSOLE <slice> segments=...`, `WAVE stopping: ...`.

Needs the user's keyboard: nothing. Models: Sonnet, medium.

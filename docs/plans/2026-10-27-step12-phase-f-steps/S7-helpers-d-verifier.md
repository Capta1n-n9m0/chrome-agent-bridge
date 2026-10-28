# S7-helpers-d verifier: Run 19's block runner (Opus 5.5, medium)

Audited the uncommitted work: `recipes/s12-r19.ps1`, `recipes/s12-r19-lib.ps1`, `recipes/s12-r19.ts`,
`recipes/test/s12-r19.test.ts`, `recipes/test/s12-r19-static.test.ts`, and the M1 diff in `recipes/s12-oldbuild.ts`.
Claims audited: `S7-helpers-d-builder.md`. Nothing live was run (no Chrome, no daemon, no port 9234, no reload).
Raw output: `S7-helpers-d-verifier-evidence.txt`.

## 1. Verdict
**FAIL**: one MAJOR (F1). The lib's logic is right when tested against its own stubs, and every mutant the brief names
turns red. But the stub of `Invoke-R17Node` in `s12-r19.test.ts` does not behave like the real one. When I ran the lib
with the real `Invoke-R17Node` (read from `s11b-r17.ps1` with the runner's own parser, only `Start-Process` faked), four
paths the brief requires came out wrong. The DONE-PARTIAL claim is accurate (F4).

## 2. Outputs (re-derived)
- Before: `npx vitest run recipes/test --exclude recipes/test/s12-r19.test.ts --exclude recipes/test/s12-r19-static.test.ts`
  gives `59 passed (59)`, `1351 passed (1351)`. After: `npx vitest run recipes/test` gives `61 passed (61)`,
  `1411 passed (1411)` (three times). The two new files alone: 2 files, 60 tests. The builder's 1351/59 → 1411/61 is
  confirmed.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
- Size: code is 167 (`s12-r19.ts`) + 226 (lib) + 99 (entry) = 492 lines, plus the M1 diff (+10/-3), against a cap of
  400. Tests are 184 + 242 = 426 lines (cap 600). Code alone is over the cap, so the slice is DONE-PARTIAL by
  agent-rules §7, as the builder states.
- I did not re-run `npm test`, `npm run build` or `npm run typecheck`. The slice touches only `recipes/`, and the build
  writes `extension/dist`, which this verifier leaves alone. The recipes-scoped checks above are the ones the brief
  names.

## 3. Findings

**F1 (MAJOR): the real `Invoke-R17Node` throws on a node exit of 2, or on an exit of 1 with no ROW/CHECK line. It also
prints node's stdout itself. The runner assumes neither.** `recipes/s11b-r17.ps1:130` (`Show-S16 $out`), `:137`
(`if ($n -eq 2 ...) { throw "node $Name ended in a STOP" }`), `:139` (an exit of 1 with no ROW/CHECK line throws). The
test stub (`recipes/test/s12-r19.test.ts:49-52`) only returns the code. The commands `proof`, `restore-head`,
`daemonlog`, `scan-actors` and `rows19` all return 2 for their failing case (`recipes/s12-r19.ts:130,149,150,155,162`),
and `proof` returns 1 for wrong counts with only a `LOADED` line. Evidence (`realnode.ps1`, raw output in the evidence
file):
- (a) **R19-0 with a stale build** (`zeroStale`): the record shows `WAVE stopping: an exception in block r19-0 (node s12-r19 proof ended in a STOP)`, then
  `STOP throw-after-state`, then `RETURN 1 after-stop=throw-after-state ...`. The sheet's `old-build-left-loaded`
  never prints (`s12-r19-lib.ps1:135` cannot be reached for a code of 2), and the message does not name the stale
  extension. A count mismatch (exit 1) also throws, so R19-0 is a STOP and never a `ROW R19-0 FAIL`.
- (b) **R19-0 when it passes** (`zeroGood`): `SHOW LOADED ...`, then `SHOW MANIFEST ...`, then `SHOW LOADED ...`
  again. `LOADED` goes into the record before `MANIFEST` and is printed twice, which breaks §4.27's "the second line of
  the slice's record, one line, exactly" (R7.2). The buffering at `s12-r19-lib.ps1:137-141` cannot help, because
  `Invoke-R17Node` has already printed the line.
- (c) **liveD19 can never reach R19-ARGS-OLD** (`oldProof`). The old-build proof inside the rows
  (`s12-r19.ps1:95`) is expected to answer `UNKNOWN_METHOD`, which is exit 2, so it throws. The finally then restores
  HEAD, reloads and re-proves (correct), but the slice ends `STOP throw-after-state`. When a driver is built it will
  never run.
- (d) **When restore-head or the re-proof fails** (`headFails`, `rerunFails`), the run ends `STOP throw-after-state`,
  not `old-build-left-loaded`, and nothing names the stale extension. When `restore-head` fails, the `$okHead`
  assignment at `s12-r19-lib.ps1:114` throws, so the reload and re-proof in the same finally are skipped. That is
  harmless in itself (dist still holds the old build), but the label is wrong, and #356 (2) / #359 M1 require "a failed
  proof is a STOP that ... names the stale extension". The handoff (§7 of the builder report) lists these as
  `old-build-left-loaded` lines. In the real runner they are not.
- (e) **R19-LOGS when a leak is found** (`logsLeak`, a DAEMONLOG probe above 0): `STOP throw-after-state` comes before
  the pending console-clause rows, `ROW R19-LOGS` and `rows19` have printed. The `$codes[...] -eq 2` test at
  `s12-r19-lib.ps1:225` is dead code. The builder's handoff ("text-leak ... the row and rows19 print first") is not what
  the real runner does. `scan18` (`recipes/s11b.ts:472`, `bump(... 2)`) behaves the same way.
- (f) As a result, M1's new wording never reaches the record. A failing `swap` dies as an unhandled rejection (exit 1,
  the message and stack trace go to `node-err.txt`), and the record shows only `node s12-r19 swap exited 1 with no ROW
  or CHECK line`.

The safety direction holds in every case: each path STOPs, restores the state when it was changed, and prints a
matched RETURN. But the reasons are wrong, and so are R7.2's line order and liveD19's reachability.
**Fix:** make `proof`, `restore-head`, `daemonlog`, `scan-actors` and `rows19` print their verdict line and exit 0 (or
3), and let the lib decide from `$global:R17Out` (the way R18-0's lines are read). Alternatively, call them through a
wrapper that catches the `ended in a STOP` throw and maps it to `Stop-R19 '<reason>'`. Buffer `LOADED` by running
`proof` with a `Show-S16` that collects instead of printing. Catch `swapOldBuild`'s error in `main` and print its
message (no path is in it). Wrap each step of the finally in its own `try` so that a throw from `restore-head` or
`Save-R19Seg` still ends in `Stop-R19 'old-build-left-loaded'`. **In the tests**, use the real `Invoke-R17Node` (read
by `Get-R18Defs`) with only `Start-Process` faked, as `realnode.ps1` does, and add these six scenarios with real exit
codes.

**F2 (MINOR): a throw at any step inside the finally skips the rest of the finally.** `s12-r19-lib.ps1:113-118`.
Only the reload is in its own `try`. If `Save-R19Seg 'reload'` throws (a capture file that already holds text,
`:97`), the reload and the re-proof are skipped while the old build is loaded, and the STOP is `throw-after-state`.
**Fix:** as in F1 (a `try` per step; any failure ends in `Stop-R19 'old-build-left-loaded'`).

**F3 (MINOR): the stub covers the lib, not the entry.** The `r19-0`, `r19-old-args` and `r19-logs` blocks as
`s12-r19.ps1:90-96` registers them were never run by a test with a realistic node layer. That is how F1 got through.
Covered by F1's test fix.

**F4 (NIT): the DONE-PARTIAL claim is accurate, but its reasoning is incomplete.** Existing entry points checked:
- Run 18's `Invoke-R18UpOpt`, `Invoke-R18Up6`, `Invoke-R18Raw`, `Invoke-R18BannerCtl` and `Invoke-R18UpDevt`
  (`recipes/s12-r18-lib.ps1:192-259`) map to R19-UP-OPT, -UP-6, -F-RAW*, -BANNER-CTL and -UP-DEVT. None can drive the R19
  rows as they are:
  - they hard-code `R18-` ids;
  - their idle bound is `$S12IdleMinMs = 15000` (`recipes/s12-win.ps1:10`, `IDLE_MIN_MS` in `s12-rules.ts:5`), while
    §4.27 asks for 20 000 ms, and per leg for UP-6;
  - `bannerctl-judge` accepts only `liveA18`/`liveB18` (`s12-rules.ts:8`).
- DEVPROBE has its window procedure (`Invoke-S12DevProbe`, `recipes/s12-win-b.ps1:67`) but no actor command that runs
  `devprobe()`.
- CLOSERPROBE is wired (`Invoke-R19Closer` → `Invoke-S12CloserProbe`).

So 40 rows NOT RUN is honest. The builder's report should still name the R18 drivers as the base for the next builder
(parameterise the id, the idle and the slice) rather than say no entry point exists. The size rule binds in any case:
the code is 492 lines (167 + 226 + 99) against a cap of 400, which is DONE-PARTIAL by §7.

**F5 (NIT): `Test-R19UpOptReport` uses `git ls-files`, which also lists a file that is staged but not committed.**
`s12-r19-lib.ps1:148`. In practice it is covered, because the preflight's `Assert-R17TreeClean` refuses a staged
change. `git cat-file -e HEAD:<path>` would state "committed" directly.

**F6 (NIT): in `proof`, `args=other` (a build that ignores `args`) and an `ERROR` read also exit 2, a STOP**
(`s12-r19.ts:130`). The sheet makes a STOP only of `UNKNOWN_METHOD` or `VERSION`, and treats the rest as R19-0
discrimination, which is a FAIL. The runner errs on the safe side. Make it match the sheet when F1 is fixed.

## 4. Checks that passed
- **M1** (`s12-oldbuild.ts`): the three wordings are correct for their paths. `removeThrew` applies only when the
  restore never ran, and a restore that ran and failed keeps its own wording. The `restoreHead` comment is true. Pinned
  in `s12-r19-static.test.ts:116-147`.
- **Runner rule** (#356, #359): the swap is inside a `try` whose `finally` calls `restore-head`, then the reload
  (`$R17Blocks['reload']` = `reload-extension.ps1`, one re-run on exit 2), then the re-proof. Shown on the clean,
  rows-throw and swap-fails paths. The F1/F2 gaps are in labelling, not in skipping the restore.
- **Slice orders** match §4.27's bullets: R19-0 comes first after the Prologue; DEVPROBE, then CLOSERPROBE, comes
  before every B row; CLOSERPROBE comes after BANNER-CTL and before CHOOSE-1 in C; SWEEP-HELD is last before RESTORE;
  RESTORE then LOGS end every slice; D and E hold their single old-build row.
- **Mutants**, re-run on scratch copies with my own harness (`mut/h.ps1`); each one is distinguishable:
  - skipped restore on throw: `restored=no` instead of `RESTORE-CALLED` / `restored=yes readback=equal`;
  - swap without the finally: no `restore-head`, no reload, no re-proof;
  - STOP without RETURN: no `RETURN` line;
  - row out of order: `args-2` before `args-1`;
  - UP-OPT without the report: `RAN r19-up-opt` with no report file.
  The builder's 8 mutants also pass inside the suite.
- **Static checks**: ASCII and no `SilentlyContinue` in both `.ps1` files (the `.ts` files hold one `…` each in a
  comment). No top-level variable shadows a global the helpers read: the names are the same as `s12-r18.ps1`'s, plus
  `$UpOptReport` and the `$r19*` loop variables. The PS 5.1 `$o`/`$global:O` trap is avoided. Printed values are counts,
  ids, leaf file names and a short HEAD. No token, URL, profile path or text is printed. The `--tmp` path is refused
  inside the repo.
- **Forms**: (28) DAEMONLOG, (29) SCANTOOL/SCAN actors with `shot-line`/`image-line` counted apart and `profile-all`,
  (31) STOP + RETURN, and (32) FIX all match §4.27 by key (the static test reads the templates from the sheet).
  `dedupeRulesOnly` drops only a byte-identical `ROW RULES` line. Console-clause rows settle before `ROW R19-LOGS`, but
  only on the path where no scan fails (F1 (e)).

## 5. On the builder's proposed decisions
- **`throw-after-state` for a throw before any state change, printed `restored=n/a`**: safe, and consistent with
  §4.27's "`throw-after-state` (any slice)" and its fixed list of 13 reasons. The R7.6 pairing is unaffected. It is
  not unsafe. Note, though, that F1 currently routes `old-build-left-loaded` and `text-leak` into this reason too,
  which hides the escalation #356 (2) requires. Accept the decision only together with the F1 fix.
- **The report path `S7-up-opt-investigator.md`, with `root-add` running when the report is absent**: consistent with
  §4.27 (R19-UP-OPT is "the wave's first Upload-folders change, ROOT stays added until R19-RESTORE"; the B rows after it
  need ROOT) and with the phase doc's naming rule (`<STAGE>-<role>.md`). `root-add` edits only the wave's own options
  window and is restored by R19-RESTORE, so it is not unsafe. One side effect for the driver to keep in mind:
  `R19RootAdded` is set whenever a registered `r19-up-opt` block returns without a throw, whether or not ROOT was
  actually saved.

## 6. M5 (#359)
**No recurrence.** `npx vitest run recipes/test/s12-ps-c.test.ts` run 20 times alone: 20 of 20 gave `26 passed
(26)`, 0 failed. The full `npx vitest run recipes/test` run 3 times: each gave `61 passed (61)`, `1411 passed (1411)`,
with no failing test title. Raw output is in the evidence file. Recorded with the counts, as #359 asks.

## 7. Handoff
Nothing is running. Scratch files are in the session scratchpad (`h/realnode.ps1`, `mut/`), outside the repo. No repo
file was edited apart from this report and its evidence file. Fix round: F1 (with its test change), F2, and optionally
F5 and F6.

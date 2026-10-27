# S7-helpers verifier report (Step 11b, Run 17b's live helpers)

Model: Opus 5.5, medium effort. Read and run only; the main tree was not edited (this report is the one file written).
A scratch `git worktree` (detached at `d68d14c`, `npm ci`, no junction to the main tree) held the mutants; it was removed
afterwards. Its node_modules held only npm's own workspace links into the worktree. The main tree's `node_modules/@bridge` links and
the package sources are still intact. No live run. Chrome, the daemon and port 9234 were not touched.

## 1. Verdict

**FAIL**: three MAJOR findings (F1–F3). In each, the runner's `ROW` verdict line for a judged or RECORD row disagrees
with the row's pass rule in §4.25, so a live runner who records from the sheet would write a wrong verdict. All
exit checks hold. The activation guard, the `--activate` STOP in place of NOT BUILT, the strict first call, the
R17B-0 first line, the press timed from the reply and the slice order are right and tested (27 mutants, 25
killed; the 2 survivors are explained in §3).

## 2. Exit checks (re-derived)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 (`built extension → dist/`) |
| Recipes tsconfigs | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| Tests after | `npm test` (main tree) | **4639 passed, 189 files**, exit 0 |
| Tests before | `npx vitest run` in the scratch worktree at `d68d14c` | **4560 tests, 184 files** (9 red in `s11-r16-runner.test.ts`: the known CRLF worktree gotcha, `recipes/CLAUDE.md`) |
| None removed | per-file count diff, before vs after | the 184 old files have identical counts. New files: `s11b-r17b-build` 21, `-hist` 23, `-plan` 13, `-press` 11, `-static` 11 (= +79) |
| Tree after build | `git status --short` | only the stage's 6 modified + 12 new files |
| Forbidden paths | `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp` | empty |
| Token / real URL / pattern | grep of the new files and the `+` lines of the diff | no token. URLs are 127.0.0.1/localhost fixtures and `chrome://extensions`. The tests' negative cases use reserved names (`example.org`, `example.test`). No list pattern. |

## 3. Tests fail without the change (mutation, scratch worktree)

Script `<scratchpad>/mut.mjs` (one exact replacement per mutant, the named test file run, then restored). Killed:
M1 guard ignores `opened` (2 red), M2 guard allows any port, M3 `--activate` keeps NOT BUILT, M4 FWD first-of-pair
not strict, M5 the strict STOP line removed from `historyCall`, M6 `history` passes `activate=false` to the set-up
outcome, M7 activation without the guard, M8 ON timed from OFF (2), M9 the PowerShell delay 1000 instead of 1600,
M10 `judgeBuild` accepts `other` (2), M11 tabwatch prints the url (4), M12 tabwatch counts `complete` after the
navigation (2), M13 an early reply passes, M14 the snapshot before `LAT`, M15 first line not joined, M16 a NOT BUILT
path reintroduced (2), M17 history without `--activate`, M18 DISARM read-back count = found (not +1), M19/M20 slice
order swapped (ps1, plan), M21/M22 `judgeCtl` skip ignored / over-broad, M23 G11-3 OFF exits 0, M25 histories via
`S11 make`, M26 NEWTAB-REFUSED blank-left as a row.
Survivors: **M24** (`build-proof` without `-StopOnFail`) is equivalent: `judgeBuild` STOPs exit 2, and
`Invoke-R17Node` throws on exit 2 with or without the switch. **M27** (R17B-RD-2 drops its `redirect=1` clause)
survives because no test pins how the runner's rows are made from their clauses (see F2).

## 4. Findings

### F1 — MAJOR — R17B-NEWTAB-PLAIN can never PASS: its page clause reads a title that S9's output never holds
`recipes/s11b-r17b.ps1:234`: `$page = if (($global:R17Out -join "`n") -match 'Agent Bridge E2E Playground') {0} else {3}`.
`R17Out` is the S9 `snapshot` call's output, and that line is `ROW <id> snap ok <T> elements=<n> counter=<…> (<ms> ms)`
(`recipes/s9.ts:499-506`, `rowLine` in `recipes/s9-rules.ts:218`). No title or heading is printed, by design. The
clause is therefore always 3, and `Write-R17Row` prints `NOT MEASURED` for a judged ★ row. H3 flagged this risk
(its Finding 3) without checking it.
**Fix:** judge the page from the snapshot line itself. The playground has the `Click counter:` button
(`test-fixtures/e2e-playground.html:56`), so `counter="Click counter: …"` (≠ `none`) or `elements>0` works. Add a
static test.

### F2 — MAJOR — R17B-RD-2's ROW leaves out the judged answer clause and the snapshot clause
`recipes/s11b-r17b.ps1:217-227`. The `newtab` call is `[void](Call9 … 'ok')`. When the answer is not `ok`, S9 prints
`CHECK R17B-RD-2 open FAIL` and exits 1 (`check()`, `recipes/s9.ts:183-188`), but that exit code is not in `$codes`.
`$codes` holds only hits, RULES and tabwatch, so the record can read `CHECK … FAIL` and then
`ROW R17B-RD-2 PASS (by 3 clause checks)`. The sheet judges "the answer exactly `{id, tab}` (an `INTERNAL` with
`K-newtab-late`, or any code, is 'NOT as pre-written', recorded, row fails)". It also judges
"`snapshot` K-tab when the row is hidden", which is not checked at all. M27 shows the clause composition is untested.
**Fix:** add Call9's exit code to `$codes`. Judge the snapshot through `Invoke-R17Row … tabs-hidden`, or with a small
judge over the `tabs` and `snap` lines. Pin the clause list with a static test.

### F3 — MAJOR — R17B-NEWTAB-REFUSED prints PASS on the branch the sheet says is NOT MEASURED
`recipes/s11b-r17b.ps1:263-266`. The sheet says: if the gate refuses before any tab is made (`BAD_PARAMS` or
`DOMAIN_BLOCKED`, no `TABWATCH` created event), "the judged clause is NOT MEASURED (path not reached), not a pass".
The runner discards the tabwatch read (`[void](Read-R17bWatch)`; with no tab, the read prints
`NOT MEASURED: no TABWATCH line …` and exits 3) and does not look at the answer code. Equal tab counts then print
`ROW R17B-NEWTAB-REFUSED PASS`. The same happens when the console is unavailable (`$w` false).
**Fix:** keep the read's exit code. Print NOT MEASURED (path not reached) when the read gives 3, or when the answer is
`BAD_PARAMS`/`DOMAIN_BLOCKED`, or when `$w` is false. Test it statically.

### F4 — MINOR — when R17B-0 STOPs, the record holds none of R17B-0's lines, the STOP reason included
`recipes/s11b-r17b.ps1:155-187`. Every R17B-0 line, `STOP:` lines included, goes to
`%S11_OUT%\r17b-0-lines.txt`. On a STOP, `throw` or `Invoke-R17Node` throws before lines 179-186 copy anything, and
`Stop-S16Wave` writes only `WAVE stopping: … (stop)` to the record. The terminal still shows the reason (Show-S16
`Write-Host`), but D7.7 matches each STOP line to a return in the ledger.
**Fix:** in the `finally`, copy `^(STOP: |ROW |BUILD |S6 commit=|MANIFEST )` lines from `$sc` to the record when the
block did not finish.

### F5 — MINOR — R17B-ACT-CTL's "each reply under 12 000 ms" is judged only for the second call of each pair
`judge-history` gets `ms` from `HISTREPLY`, which is the last call (`recipes/s11b.ts` `historyCall`;
`judgeR17bRow` in `recipes/s11b-r17b-rules.ts:84`). The first `back` and first `forward` are only in `LAT` lines.
**Fix:** let `historyCall` judge every call's `ms` against 12 000 for ACT-CTL, or call the four separately.

### F6 — MINOR — carried rows and R17B-CTL print Run 17 ids in their ROW lines
The carried blocks print `ROW R17-UP-OPT …`, `ROW RD-RESTORE …`, `ROW RD-LOGS …`, each after a
`CARRIED R17B-… as R17 block …` line. R17B-CTL prints `ROW RD-CTL …` and then `ROW R17B-CTL 8087 …`. The sheet says
"the id only changes". A runner can still record R17B rows from the CARRIED pairing, but it must translate, and
R17B-UP-L1's ROW (from `s11 l1`) does not reflect its re-judged console clause (it depends on R17B-LOGS' `SCAN`, as
the sheet says). Usable, error-prone.
**Fix:** after each carried block, print a `ROW <R17B id> = <R17 id> <verdict>` line, or have the runner instructions
name the mapping. Do not edit Run 17's file.

### F7 — MINOR — R17B-NEWTAB-REFUSED: a leftover blank tab is a STOP in the helper, a failed row in the sheet (H3 §6.5)
The row text says "a leftover blank tab fails the row". The STOP paragraph (and the phase doc's #311 STOP) covers
"a blank tab left after a **refused install**". A `javascript:` refusal of `tabs.update` comes after a successful
install, so the row's own rule governs. The helper is stricter: it stops the wave, which cannot flatter a result,
but it departs from a pre-registered rule.
**Classification:** a sheet ambiguity. Either align the helper with the row (`ROW … FAIL` and continue), or have the
step or session agent record a decision before the run. Never resolve it by editing the sheet.

### F8 — MINOR — sheet issues the helpers worked around (report only; do not edit the sheet)
(a) R17B-CTL: the steps say the 8085 counter uses tag `s11b=bctl`, but the expected text is "the four lines of
`RD-CTL`", which `B17 ctl` prints with tag `ctl` (H3 §6.1). The helper keeps `ctl`. The wave's 8085 log is fresh, so
the count still discriminates. Acceptable.
(b) The `TABWATCH` template lists `reply-ms` among the listener's values. The worker cannot see the reply, so the
helper appends its own `LAT` (H2 §6.1 and its proposed decision). Acceptable.
(c) H2 §6.2 is inaccurate but harmless: `CALLT` is printed right after the reply (`recipes/s11b.ts:1056`), not at
process end. I measured that a file written by a running `Start-Process -RedirectStandardOutput` child can be read
while the child runs: `running=True lines=1`, PowerShell 5.1 probe.

### F9 — NIT — H3's `B17 ctl --skip`: no weakening, one ordering change
Only 8088 and 8089 can be skipped (8083 and 8086 are always probed). A skipped port that did answer is still judged.
Without `--skip`, `judgeCtl` behaves as before: M21 and M22 are killed, and the R17 tests pass unchanged. One change:
the default request order is now 8083, 8086, 8088, 8089 (was 8083, 8088, 8089, 8086). The printed lines and their
order are unchanged.

### F10 — NIT — H2's line cap 440 → 480 (`recipes/test/s11b-win-static.test.ts:36`): accept
The file is 466 lines (432 at HEAD). This is a size guard, not a protective check: the ASCII check and
`scanS11bOutput` are untouched and still pass. The S4-helpers verifier accepted 400 → 440 on the same grounds
(`S4-helpers-verifier.md:212`).

### F11 — NIT — robustness and small differences
(a) The runner reads `s11b-r17.ps1` without checking `$er` or the function count. Only the block count ≥ 40 is
checked. I measured 0 parse errors, 49 functions and 49 blocks, and every top-level variable the reused code needs is
mirrored in the runner. Suggest `$er.Count -eq 0` and exact counts.
(b) The activation sends `return (1);` through the existing `ev` (wrapped by `evaluate/wrap.ts`, then CDP
`Runtime.evaluate {userGesture:true}`, `debugger.ts:186`), not the literal `1`. Same method and gesture.
(c) Each history tab starts on an unactivated `…?s11b=<key>0` page before the plan's pages. No row's back or forward
reaches it.
(d) R17B-0's manifest read stops on exit 1 with the text "cannot evaluate or printed a STOP". It is stricter than
RD-0 (which counts a fail) but the message is misleading.
(e) R17B-BACK-NOACT prints two `ROW` lines (from `back` and from `judge-history`).
(f) The tabwatch reads in NEWTAB-LOAD and NEWTAB-REFUSED are `[void]`. A STOP there would be lost, but their
expressions are constants that pass `preTypeCheck`.

## 5. Audit items that hold (evidence)

- **Activation guard (1).** `isActivationTarget` requires the handle in `opened`, `http:`, no userinfo, host
  127.0.0.1/localhost, and port 8081/8091 (`s11b-r17b-rules.ts:13-22`). `guardedActivate` runs before every
  `evaluate` (M1, M2, M7 killed). The guard reads the URL from `tabs()` after each navigate. The `opened` list is read
  from `state.json` (S9_OUT = S11_OUT). Every history tab comes from `New-R17Tab`, which is
  `S9 call … newtab --as`, and that op calls `noteOpened` (`recipes/s9.ts:549-556`). No `s11` command runs between
  opening the tabs and building the histories.
- **STOP mapping (2).** With `--activate`, a refused set-up `back` is rethrown (`histSetupBackOutcome`) and ends as a
  STOP with exit 2. A strict R17B call that is not `ok`, the first of a `--times 2` pair included, returns
  `refusedStop` before the old row FAIL. `Invoke-R17Node` throws on exit 2 with or without `-StopOnFail`, so every
  such STOP reaches `Stop-S16Wave` (exit 2). No NOT BUILT path is reachable: `$NotBuilt` and `R17FwdNotBuilt` are
  absent, and BACK-NOACT's `p3` has no set-up back. RD-* behaviour is unchanged: no per-file test count changed, the
  old tests pass, and `history` without `--activate` gives the same `--dry` output and the same NOT BUILT call.
- **No URL in output (3).** The tabwatch expressions pass `preTypeCheck`, print only the fixed words, counts and ms
  (vm test, M11 killed), and contain no `://` (the R17B-LOGS `scan17` counts `://` only). The new lines are
  `BUILD`, `S6 commit=`, `TABWATCH`, `HIST`, `ACT`, `LAT`, `RECORD page=<class>`, `CTL 8087` and `PRESS ON … $ms`:
  labels and numbers only.
- **R17B-0 (4).** The joined line is exactly `MANIFEST … BUILD disk-s6-names=<n>/2 created-url=<c>` and is written
  first to the record (M15). `build-proof` STOPs on fewer than 2 names, on a missing ancestor, on a missing read, or
  on `other` (M10). Before it run only the read-only steps and the one `b0` tab the sheet allows; there is no safety
  change.
- **Press after the reply (5).** OFF is pressed at ready + 1000 ms, as before. ON is pressed at reply + 1600 ms, with
  the reply taken from the `CALLT` line of `node-out.txt`; `Invoke-R17Node` deletes that file before each call, so no
  stale line is read. With no reply, ON is pressed at once and a STOP follows. Fake-clock tests and the PS twin are
  killed by M8 and M9.
- **Runner (6).** Order of liveA17B and liveB17B equals "Slices and order" (M19, M20). G1 runs through Run 17's
  `g1-open`/`g1-close` → `Set-S11BoxVerified` (read back by hash, `s11-win.ps1:194-202`). DISARM's read-back count is
  found + 1 (M18). G11-3: OFF writes the seven `NOT RUN — waits for G11-3` rows before any state change and exits 3;
  an unreadable toggle is a STOP (M23). The preflight refuses Run 17's leftover `r17-globals.clixml`.

## 6. Proposed decisions

### 2026-10-27 · R17B-NEWTAB-REFUSED's leftover blank tab: a failed row, as the row says
**Decided:** the helper prints `ROW R17B-NEWTAB-REFUSED FAIL` and the wave continues. **Why:** the row's pass rule says
a leftover blank tab fails the row. The STOP paragraph covers a refused *install*, which a `javascript:` refusal is
not. **Instead of:** H3's STOP. **Revisit if:** the session agent reads #314's STOP as covering any refused `newTab`
step. **By:** Claude (proposed, for the step agent)

## 7. Handoff

Fixer scope: F1–F3 (MAJOR), and F4–F7 if the step agent wants them in the same round. The fixes are to
`recipes/s11b-r17b.ps1` and its static test only. The mutation script and logs are in the scratchpad
(`mut.mjs`, `mut.log`, `wt-base.log`, `test.log`, `exits.log`). No processes left. The scratch worktree has been
removed and `git worktree list` shows only the main tree.

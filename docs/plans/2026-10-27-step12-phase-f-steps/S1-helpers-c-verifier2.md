# S1-helpers-c verifier 2 (after fix round 1): Run 18's block runner

Model and effort: Claude Opus 5.5, medium. Read and run only. Nothing drove Chrome, the daemon or port 9234; the only
runner invocation was `-Block plan`. Mutants were made only in copies in the session scratchpad. Command output:
`S1-helpers-c-verifier2-evidence.txt` (beside this file).

## 1. Verdict
**FAIL.** One MAJOR finding: F2 is fixed only against line forms that no helper prints (G1). On the lines that `s11b raw`
and `s11b up6` really print, the new rule never fires, so the runner still prints `ROW R18-F-RAW FAIL` and `ROW R18-UP-6 FAIL`
where §4.26 rules NOT MEASURED. F1 and F3–F10, n2 and n5 are closed. The `Invoke-R18Raw` `$Row` fix is confirmed. Two new
MINOR findings and three NITs follow.

## 2. Outputs (numbers from my own commands)
- `npx vitest run recipes/test`: 54 files, **1201** passed. The count went 1131 (HEAD set, verifier 1) → 1170 (builder) → 1201
  (fixer), which matches the fixer.
- All seven `npx tsc --noEmit -p recipes/tsconfig*.json`: exit 0. `npm run typecheck`: exit 0. `npm test`: 210 files, **5000**
  passed on the first run. The fixer reported 4997. The extra 3 came from S4a's in-flight untracked `extension/test/zz-s4af3-p*.test.ts`,
  which were present during my run and have been deleted since. `npm run build`: `built extension → dist/`. No tracked file changed.
- Both `.ps1` files: 0 parse errors (PS 5.1), ASCII, `SilentlyContinue` 0, and no `&&`, `||`, `??` or `?.`.
- Size, counted as non-blank, non-comment lines. Code: 84 + 262 = **346**, against a cap of 400. Tests: 344 + 144 = **488**,
  against a cap of 600. Both are within the cap.
- `-Block plan`: exit 0. Both orders are unchanged and match the sheet.

## 3. Findings of verifier 1, re-checked
| Item | Closed? | Evidence |
|---|---|---|
| F1 entry untested | **Closed** (one residual: G2) | The block bodies are now lib functions. My lib mutants E1 (2 red), E2 (2), E4 (1), E7 (1), E7b, where the flag is set after the first call (1), E9 (1) and E11 (1) are all red. E10 (`exit 0`) is red on the static assertion `exit main code`. |
| F2 banner rows NOT MEASURED | **Not closed** (G1) | `bv.ps1`: real-form lines with `R18Ctl=FAIL` give `banner verdict=FAIL` for F-RAW and for UP-6 |
| F3 attach stamp | Closed | `Set-R18Reused` wraps the six reused blocks. `rd-restore` and `r17b-0` run stamped, and devt `setup` goes through `Invoke-R18Node` (`lib:70, 92, 248, 256`). The mutants "rd-restore unstamped" and "reload not stamped" (entry) are red. The handoff gives every slice and attempt a fresh `S11_OUT`. |
| F4 handoff and python probe | Closed | The handoff line is a Git Bash line (`s12-r18.ps1:5`). In PS 5.1, `Get-Command … -ErrorAction Ignore` returned `count=0` with no throw. `python` is on Git Bash's PATH. The entry mutant `-ErrorAction Stop` is red. |
| F5 `-Att` and record guard | Closed | `Get-R18RecordName` gives `S1-live-record-liveB18-att2.txt`. A record that holds text is a STOP before `Load-S16` (`lib:280`). The mutants "record check skipped" and "Att ignored" are red. |
| F6 `rows18` | Closed | It runs last in `Invoke-R18Logs`, over a copy outside the repo (`lib:274-275`). The mutant "rows18 over the live record" is red. |
| F7 `EVIDENCE` key | Closed | `lib:267`. The test asserts that no `CONSOLE evidence` line is printed. |
| F8 deferred rows | Closed (NIT n-c) | A `CHECK <row> console-clause pending R18-LOGS` line is printed at the row's own time, and the rows' `ROW` lines are flushed after `ROW R18-LOGS`. The mutant "SAVE-REFUSE printed at once" is red. |
| F9 process stop | Closed | V8, with `Stop-S16All` dropped, now gives 2 red (it gave 0 before). |
| F10 globals before `Load-S16` | Closed for a slice run (residual: G3) | `lib:281`. The mutant "globals loaded before the check" is red. |
| n2 | Closed | `lib:79` sets `S9_RAW=$Record` before `Stop9`. The mutant is red. |
| n5 | Closed | `s12-r18.ps1:60` uses `-ErrorAction Ignore` and prints a STOP line, then exits 2. The mutant is red. |

**Verifier 1's set on the new files:** V1 gives 4 red, V2 3, V3 2, V4 1, V5 1, V6 1, V7 10, V8 2, V9 1, V10 1, V11 2 and V13 1.
V12 survives, as before (n1, harmless). The brief's three required mutants are still red: restore skipped on a throw (V1), the
R18-0 list check skipped (V2), and a row out of order (V3, V4, V5). Restore in liveB: `orderB` includes `r18-restore`, and V4
is red. The toggle is only read: the "toggle pressed" mutant is red, and `Read-S11FileAccess` is the only `FileAccess` name. The
new print sites (`EVIDENCE …`, `CHECK … pending …`, the banner NOT MEASURED text and the two Main STOPs) carry no path, token,
folder text, block-list text or non-HEAD hash.

**`Invoke-R18Raw` and `$Row`:** the call is now `raw --row F-RAW`, `F-RAW-2` and `F-RAW-DIR`. This is what `s11b raw` needs,
because `rowOpt(a, RAW_ROWS)` (`recipes/s11b.ts:1115-1119`) accepts only the bare ids, so `R18-F-RAW` would have been refused.
The sampler id (`-Ids @($RawId)`) matches `windowed(…, row, …)`'s `F-RAW-sample` signal. My mutant `--row "R18-$RawId"` is red.

**`slice=` on single-slice banner rows: no conflict.** §4.26's form `ROW <id> <verdict>[ …]` allows trailing text. The sheet
requires `slice=` only for rows run in both slices; it does not forbid it on others. `aggregateRows` (`s11b-r17b-rules.ts:155-169`)
keys on `id|slice` by `/ slice=([AB])\b/` anywhere in the line. On the real module, `ROW R18-UP-6 NOT MEASURED (banner clause: …) slice=A`
parses as id `R18-UP-6`. A second `ROW R18-UP-6 … slice=A` prints `WARN row printed twice: R18-UP-6`. The pending `CHECK` line
is not counted (`agg.ts` output in the evidence file).

## 4. Deviations
None. To run the mutants, I converted the real `s12-r18.test.ts` mechanically into a node harness in the scratchpad: it reads
the lib from an environment variable, and the vitest wrapper is dropped. On the real lib it gives `TOTAL RED 0`. The entry
mutants were checked against every ENTRY-touching assertion of `s12-r18-static.test.ts`, written as predicates.

## 5. Proposed decisions
None.

## 6. Findings

**G1 — MAJOR — F2's rule never fires on the helpers' real lines** (`recipes/s12-r18-lib.ps1:17, 43-47`; tests
`recipes/test/s12-r18.test.ts:133-134, 152`). `Get-R18BannerVerdict` converts a FAIL only when at least one line matches
`$R18ClauseRe` = `CHECK \S+ (FAIL|…)`, and every such line is a banner clause. Neither banner helper prints such a line:
- `s11b raw` (`s11b.ts:1118-1150`) prints `ANSWER`, `LEAKS F-RAW <n>` and one `ROW F-RAW FAIL: F-RAW: banner seen` (`finalRow`).
  It prints no CHECK line, so `$bad` is empty and the verdict stays FAIL.
- `s11b up6` (`s11b.ts:1106-1110`) prints `CHECK R17-UP-6 outside FAIL: outside: banner seen`. The label has two tokens, so
  `CHECK \S+ ` is followed by `outside` and the line does not match. `$bad` is empty and the verdict stays FAIL.

Evidence (`bv.ps1`, the real lib, `R18Ctl=FAIL`): `F-RAW real form: … banner verdict=FAIL`, `UP-6 real form: … banner verdict=FAIL`.
The tests pass only because their fixtures (`CHECK F-RAW-s FAIL: s: banner seen`, `CHECK U-s …`) use a single-token form
that no helper prints. The record would therefore still carry `ROW R18-UP-6 FAIL slice=A` and `ROW R18-F-RAW FAIL slice=B`
under a failed control, which is the contradiction F2 named.

Suggested fix:
- Read the clauses the helpers actually print. For UP-6, accept a multi-token label, e.g.
  `CHECK \S+(?: \S+){0,2}? (FAIL|NOT MEASURED|…)(?=[ :]|$)`, the way `VERDICT_LINE` does.
- For F-RAW*, take the helper's own `ROW <id> FAIL: <why>` line as the clause, and require `LEAKS <row> 0`. `worst()`
  reports only the first failing clause (the refusal step), so a non-zero leak count would otherwise hide behind a "banner seen".
- Build the test fixtures from the helpers' real shapes, ideally generated with `row17Line` and `checkLine`'s rule, so that
  a change of wording turns the tests red.

**G2 — MINOR — R18-UP-6's idle wait and IDLE guard are untested** (`lib:187-191`). In mutant E2u, `Invoke-R18Up6` calls
`Invoke-R18Node 's11b' @('up6')` directly, without `Invoke-R18Banner`. That means no front, no `Wait-S12Idle` and no IDLE
STOP, and the mutant survives every check (0 red). E2 covers only F-RAW (`rawIdle`, `rawBusy`). UP-6 is liveA's only banner
row. Fix: add `up6Idle` and `up6Busy` scenarios (`WAIT-IDLE` before `NODE s11b up6`; when not idle, no `NODE` line and the
block throws), plus a mutant.

**G3 — MINOR — `-Block teardown` after a failed-restore STOP presses the restore again.** Handoff step 4 says to run
`-Block teardown` after any exit 2. Teardown skips the globals guard by design (`lib:280-281`). `Load-S16` then restores
`S16Changed=True`, while `S16InRestore` is not in `$Persist` and starts out false. Run 17's teardown block refuses with a
`Fail-S16`, and `Stop-R18Wave` then calls `Restore-R18State`. Evidence (`td.ps1`): `STOP: teardown refused …` →
`RESTORE-PRESSED R18-RESTORE` → `RET 2`. After the STOP `the restore failed … the wave is over`, which escalates to the user,
this presses the options page again without the user. That is the residue of F10's concern. Fix: either the handoff says
"after a STOP naming the restore failed, do not run teardown; return to the user", or `Stop-R18Wave` skips the restore when
the slice is `teardown`.

**NITs.**
- n-a: `-Block teardown` names its record `S1-live-record-teardown.txt` in the steps dir (`s12-r18.ps1:30`). A STOP in
  teardown writes there through `Stop-R18Wave` (`S9_RAW = $Record`), which leaves a stray file in the steps dir. This was
  already so before the fix. Point teardown's record at the framing file.
- n-b: the mutant "r17b-0 runs unstamped" (`lib:92`) survives. It is harmless, because every later reused block stamps.
- n-c: after a STOP before R18-LOGS, the record holds `CHECK R18-UP-L1 console-clause pending R18-LOGS` and no `ROW` line for
  R18-UP-L1 or R18-SAVE-REFUSE. §4.26 then rules R18-UP-L1 FAIL ("does not run"), which S1-record must apply. When R18-LOGS
  itself is FAIL, R18-UP-L1 keeps its own verdict; the sheet names only NOT MEASURED or not run, so this is consistent with
  the sheet.
- `rows18`'s `CHECK rows n=… verdict=…` also counts the helpers' internal `ROW` lines (`ROW F-RAW …`, `ROW R17-UP-6 …`). Its
  verdict can therefore read FAIL while the R18 row reads NOT MEASURED. It is a CHECK line, not a row verdict. No action is
  needed beyond saying so in S1-record.

**Handoff audit (fixer §7):** the command sequence, the `-Att` naming, the output names and the exit codes match the code.
Every STOP text the list names occurs exactly once in the two files, and Run 17's tree guard comes from `s11b-r17.ps1:269`.
One correction is needed: step 4 (G3).

## 7. Handoff
Nothing is left running: no PID, watcher or worktree. The scratch harness, the mutants (`v2/mut/`) and their outputs are in
the session scratchpad. For the fixer: G1 first, re-verified with a scenario built from the real `s11b raw` and `up6` line
forms, then G2 and G3. A fresh verifier re-checks G1–G3 and the counts.

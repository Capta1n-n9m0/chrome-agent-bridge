# S5-drivers-A2 verifier, round 2 (re-check after fixer 2)

Model and effort: Claude Opus 5.5, medium. I only read and ran files. No main-tree file was edited, reverted, stashed or moved. The red
proofs ran on a scratch copy of `recipes/*.ps1` outside the repo, which the test reads through `S13_R20_REPO`, and in memory. No daemon,
Chrome, reload or live run. Evidence: `S5-drivers-A2-verifier3.txt`.

## 1. Verdict

**PASS-with-notes.** N1, N2 and N3 are closed, and each new test is red against the pre-fix code. The three changed expectations are as
strong as before. Every exit check passes. There are three new NITs, and nothing is MINOR or above.

## 2. Exit checks (re-derived)

| Check | Result |
|---|---|
| `npm test` = 5772 + n, none removed | **243 files, 5798 passed**, exit 0 (the fixer's claim holds; +2 over round 1's 5796) |
| `npm run typecheck`; all eight `recipes/tsconfig*.json`; `npm run build` | all exit 0 |
| `git status --short` after the build | only the lane's 11 recipes files and the `S5-drivers-A2-*` stage docs |
| Size (cap 600) | numstat insertions 246, plus 61 + 175 + 103 untracked = **585** (the fixer's count holds) |
| No `recipes/s12-*` or `s13-forms.ts` edit | `git diff --stat 76f4f5e -- 'recipes/s12-*' recipes/s13-forms.ts` is empty |
| No home path or user name | a grep for the name, login, e-mail and home path over the lane files and all `S5-drivers-A2*` files finds nothing (exit 1) |

## 3. Round-1 findings

### N1 (MAJOR): closed

The fix is at `recipes/s13-r20.ps1:17`: `$R19DeferRe = '(?!)'`, an empty negative lookahead. It never matches.

**I tested the ruling against the sources, and it holds:**
- In §4.28, rows l.1968–1975 (ARGS-ORDER, ARGS-3, CON-DESC, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR, ARGS-OLD) contain no `daemon.log`, scan or
  worker-console clause in their expected text or pass rule. Their `sentinel=` and `entries=` counts are reads from the page or the SDK.
- §4.28 preamble l.1942 names "a count of `daemon.log` or the worker console" only as a kind of evidence. It does not add a clause to every
  row.
- R20-LOGS (l.1977) does mention the ARGS-ORDER and ARGS-OLD values: it allows `sentinel>0` on the actors' lines for those values. That is
  part of R20-LOGS's own pass rule and of its STOP `text-leak`, not a clause of the ARGS rows. Its "else NOT MEASURED for the slice" reads as
  the R20-LOGS row's own verdict.
- The only slice-A clause on the worker console is the POP rows' `console-new`, and the POP rows judge it inline.
- The phase doc (l.251–332), `S5-drivers-A.md`, `S5-helpers.md` and decisions #395 and #399–#402 contain no deferral rule ("defer",
  "pending" and "console clause" find nothing relevant).
- No other deferral path is reachable in Run 20. `Invoke-R19RowBlock -Defer` (`s12-r19-lib.ps1:47`) has no `-Defer` caller in any `s13-*`
  file. Nothing in `s13-*` or the newly dot-sourced `s12-r19-c.ps1` assigns `$R19DeferRe` after line 17.

**Red proof.** I ran a scratch copy with the old pattern `^R20-(ARGS|CON)-[A-Z0-9]`. Three tests fail: `carry` ("expected … to include
'ROW R20-CON-NOTEA FAIL'"), `recordRow`, and the new "no slice-A ARGS or CON row is deferred …". The unmutated copy, run as a control,
fails only two tests, and these two fail in both copies. They are copy-environment failures (the console fallback and the proof readings),
and both pass in the main tree (30/30).

**The claim that a STOP before R20-LOGS now drops no ROW line holds.** `stopBeforeLogs` expects exactly one `ROW` line each for ARGS-3 and
CON-4, and `ROW R20-CON-4 RECORD`. It is red with the old pattern.

### N2 (MINOR): closed

The two lines are at `recipes/s13-r20-a.ps1:8–9`:
- "EXCEPTION: after a STOP that names a failed restore (restored=no, "the wave is over"): never run -Block teardown or re-run; return to the
  user."
- "A slice is longer than the tool's 600 s cap: run it in the background."

Both match `s12-r19.ps1` l.10–11, and the file is ASCII. In memory, with those two lines removed from the header, the test's regexes give
`false false`. With the lines in, they give `true true`.

### N3 (MINOR): closed

`recipes/s13-r20-a2.ts:91–92` prints `CHECK R20-CON-CAP line-chars=<min>-<max>`. It measures only the lines that match `/s12-cap-\d+:/`,
which is the same filter `s13-forms.ts:125` uses and the fixture's form (`test-fixtures/s12-console.js:63`), so the marker is excluded. It
prints counts only, and no verdict changes. The tests (`s13-r20-a2.test.ts:45–46`) pin `1943-1943` and a mixed `1942-1943`. They are red
on the pre-fix code by construction, because the pre-fix `lines[1]` was the `sdk-entries` CHECK line.

## 4. The changed expectations (none weaker)

- **`carry`:** `PEND FAIL` became `ROW R20-CON-NOTEA FAIL`. Both are an exact array element: the same verdict, now checked on the line the
  runner actually reads.
- **`noteaNoHandle`:** `PEND NOT MEASURED` became `ROW R20-CON-NOTEA NOT MEASURED`. Same strength.
- **`recordRow`:** `PEND RECORD` / `PEND2 PASS` became `ROW … RECORD` and `ROW … PASS`, and the order is no longer pinned. It is still
  discriminating:
  - If the RECORD flag stays on (the `finally` restore removed), the output has two RECORD lines and no PASS line, so the test is red.
  - If the RECORD flag is ignored, there is no RECORD line, so the test is red.
- **`logsOk` and `logsOwnFail`:** unchanged. They seed `R19Pending` by hand.

## 5. What the fixes left behind

**The R20-LOGS settle loop (`s13-r20.ps1:214–215`) is harmless.** In a live slice-A run `R19Pending` stays empty, so the loop does nothing.
Its only effect is the reset to `[ordered]@{}`. It stays correct if a B or C slice sets its own pattern, and `logsOk` / `logsOwnFail` still
pin its "own FAIL stays FAIL" rule. It cannot change a slice-A verdict, so it is not misleading in effect. The wording around it is stale;
see V3-1.

### V3-1 NIT: test names and dead `PEND` prints still describe the deferral

- `recipes/test/s13-r20-ps.test.ts:239` is named "… (worst leg wins, settled at R20-LOGS)".
- `:249` is named "… settles the deferred rows …".
- The `carry`, `noteaNoHandle` and `recordRow` bodies (`:115`, `:116`, `:129`) still print `PEND …` lines that nothing asserts.

**Fix:** rename the two tests (for example, "settled at the row"; "settles any rows a slice deferred"). Either drop the `PEND` prints or
assert `PEND ` (empty) as a second pin that nothing was deferred.

### V3-2 NIT: `stopBeforeLogs` does not assert that the STOP fired

`recipes/test/s13-r20-ps.test.ts:289–290` checks the ROW lines but not a `STOP old-build-left-loaded` / `RETURN` line. The test does tell
the two patterns apart: it is red with the old one. But a stub of `Stop-R19` that printed nothing would go unnoticed.

**Fix:** add `expect(returns(o.stopBeforeLogs!)[0]).toBe("STOP old-build-left-loaded")`, or the equivalent.

### V3-3 NIT: an unreachable CHECK text in the inherited `Complete-R19Row`

`s12-r19-a.ps1:67` still prints "console-clause pending R19-LOGS". Slice A can no longer reach that line. This is not A2's file (s12 is
read-only) and nothing is needed. I note it only so that a reader of the B/C drivers knows a deferred Run 20 row would print the Run 19
row name in that CHECK.

## 6. Proposed decisions

None.

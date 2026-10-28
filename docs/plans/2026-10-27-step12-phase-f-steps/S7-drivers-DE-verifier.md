# S7-drivers-DE verifier report

Model Opus 5.5, effort medium. Read and run only. No tracked file was edited. Every mutant was restored byte for byte, and
the sha256 of `git diff HEAD` plus the three new files is the same before and after
(`9c840143…`). No Chrome, no daemon, no port 9234, no reload script. Raw output:
`S7-drivers-DE-verifier-evidence.txt`.

## 1. Verdict
**PASS-with-notes.** 2 MINOR, 5 NIT. Every exit check holds.

## 2. Outputs (re-derived)
- `npm test`, main tree: **232 files, 5558 passed**, exit 0. This matches the builder's after count (5520 → 5558, +38:
  36 in the new file and 2 from the widened DIALOGS and static loops).
- A scratch worktree at HEAD `6b3b5e5`, with `git diff HEAD -- recipes` and the three new files applied and its own
  `npm ci`: `npm run build` exit 0. `npm test` gives 5549 passed and 9 failed, all 9 in
  `recipes/test/s11-r16-runner.test.ts`. That is the known CRLF-worktree gotcha (`recipes/CLAUDE.md`), and the main tree
  has 0 failures.
- `npm run typecheck` exit 0. All seven `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`
  exit 0.
- **The new tests fail without the change.** In the worktree I put the lib, the entry script and `s12-r19.ts` back at
  HEAD and kept the new files: **10 failed, 26 passed (36)**. The failures are N-4, the give-up frame, the six frame
  mutants (their text is absent at HEAD), the registration lines and DIALOGS for D and E. The 26 that still pass are the
  pure judges, which do not depend on the edited files.
- **Sizes:** new code is 117 (`s12-r19-de.ts`) + 20 (`s12-r19-de.ps1`) = 137 lines, plus 16 lines added in lib, entry
  and ts, so **153 code lines**. Tests are 227 new + 9 changed = **236**. Both are well under the brief's 750 / 600 and
  under #360's 400 / 600.

## 3. Coverage against §4.27 (lines 1791, 1846, 1854, 1856, 1858)
- **liveD19** order (`s12-r19-lib.ps1:12`): `r19-0`, `r19-old-args`, `r19-restore`, `r19-logs` and teardown are all
  registered. `r19-old-args` runs `Invoke-R19Swapped '3ab9207' { Invoke-R19OldArgs } 'R19-ARGS-OLD'`
  (`s12-r19.ps1:140`).
  - The old build's proof runs first. Only `LOADED … consoleMessages=UNKNOWN_METHOD` lets the row run; anything else is
    `ROW R19-ARGS-OLD NOT RUN — old build not loadable` (`s12-r19-de.ps1:9-11`).
  - The legs are sdk `{n:1}`, mcp `{n:1}`, ref, file, raw `client.call("evaluate",{expression:"(a) => a",args:1,tab})`
    (the sheet's form) and the control (no `args`) with its raw twin (`s12-r19-de.ts:55-77`).
  - Printed form (20): `OLD R19-ARGS-OLD leg=… code=… hint=… forwarded=…`.
  - Wants: `VERSION`, hint `===` `ARGS_RELOAD_HINT` (MCP: contains), raw `forwarded=no`; control `ok`, no hint, twin
    `kind:"function"`. The hint constants are imported from `daemon/src/intercept.ts:41-45` and pinned to the sheet's
    quotes.
- **liveE19** (`:13`, `s12-r19.ps1:141`): commit `63c771c`, page `s12=c1`, target `#in` (the file input).
  - Legs: sdk, mcp, raw `uploadFiles {tab, locator, paths:[ROOT\s11-1k.bin], chooser:true}`; control upload without
    `chooser`; `evaluate "(a) => a" {args:7}`.
  - Printed form (27): `VERSIONCH`.
  - Wants: `VERSION`, hint, `exact` (`===` `CHOOSER_RELOAD_HINT` on sdk and raw, contains on mcp), page `files=0` and
    `clicks=0`, no path (`rawLeaks` of ROOT, the sentinel and the file name); control `ok`, `files=1`, no hint; args
    answers 7.
- **NOT RUN on "exit 2 twice":** both rows pass a row id to the frame (§3 (a) below).
- **STOPs:** `old-build-left-loaded` is still the frame's `finally` (unchanged, `s12-r19-lib.ps1:125-134`). The actor
  throws only `StopWhy` words from `STOP_REASONS` (static test). `outside-file-reached-page` cannot arise, since only
  ROOT files are used (I agree with the builder's §6).
- **DIALOGS** (form 30) at R19-RESTORE now covers all five slices (`:225`; #363, #364).
- **N-4:** `swapFailText` (`s12-r19.ts:151`) passes only `swap: …` wording; every `WORDING` value is checked
  separator-free.

## 4. The attacks
**(a) The give-up reset (`s12-r19-lib.ps1:114, 120-124`).**
- **Detection.** The line `reload-extension.ps1 exit 2 (attempt 2)` is printed only by the reload block's loop
  (`s11b-r17.ps1:434-441`). On that path the loop ends with n=2 and goes straight to `Fail-S16`, so neither
  `Set-S9Foreground` nor `s11 setup` runs. The script's own lines are `Say`-prefixed with an ISO time
  (`reload-extension.ps1:68`), so `Show-S16` never counts them as `^STOP:`. The only STOP the reset clears is therefore
  the one `Fail-S16` STOP the sheet turns into NOT RUN.
- **What still throws.** Exit 3, any other failure, a give-up line from an earlier reload (`-Skip $r19n0`), and the
  no-row-id call (S7-helpers-d's frame tests, unchanged). Tests and mutants cover each of these.
- **The finally.** It is untouched and still runs on every path. With a give-up followed by a failing re-proof, the
  frame prints `STOP:old-build-left-loaded` and throws (harness in the evidence file). My finally-skip mutant was
  killed (8 failed), and an early return in the finally was killed (55).
- **Verdict on (a):** no protective check is weakened (agent-rules §2). The reset applies a pre-registered rule
  (§4.27 line 1791 and 1846: "exit 2 twice … NOT RUN"). It cannot swallow a STOP printed by the rows (they never ran) or
  by the finally (that comes after it).

**(b) ROOT added in liveE19.** `Add-R19RootOnce` runs the Run 17 `root-add` block, which sets `S16Changed`, before the
swap and after R19-0. R19-0 captured the found values first (`R19-0 after a state change … refused`, `:145`).
R19-RESTORE's `rd-restore` puts the Upload folders back and reads them back by sha (`s11-win.ps1:470-474`), the same
path liveB19 and liveC19 use. A STOP in between restores through `Stop-R19Wave` because `S16Changed` is set. Nothing is
printed beyond counts. Mechanically this is correct. **It is a sheet deviation** (MINOR-1).

**(c) ARGS-OLD.**
- **Gate.** It holds (mutant killed).
- **Raw legs.** They really bypass the SDK: `x.c.call` is the client's wire call, the same as
  `mcp/test/s12-args-cross.test.ts:156`.
- **Forwarding daemon.** Its raw leg answers `ok`, which gives `forwarded=yes` and FAIL. That case is killed by
  mutants and by unit tests.
- **The other discrimination mutants.** `files=1`, a non-VERSION answer, a missing hint, a message that is not `===`,
  and a path in the text are each killed (evidence).
- **The gap.** An answer-detecting daemon that forwards, then rewrites the answer into `VERSION` with the same constant,
  is **not** caught live (MINOR-2).

**(d) Edits to existing tests.**
- `s12-helpers-e.test.ts`, `s12-r19-c.test.ts` and `s12-r19-static.test.ts` only widen their lists (stronger checks).
- `s12-r19.test.ts`:
  - Adds stubs for the three new functions. They reproduce the old placeholders (proof, then `NOT RUN`), so the frame
    tests at `:118`, `:174`, `:218` and `:225` still check what they checked.
  - Re-pins the N-4 regex to `swapFailText(e)`. The behaviour moved to unit tests (`s12-r19-de.test.ts:106-115`).
    The mutant "catch bypasses swapFailText" is killed by 2 tests.
- `tsconfig.s11b.json` adds two includes.
- No assertion is weakened, and the test count only rises.

## 5. Mutants (my own; all KILLED, see the evidence file)

| Mutant | Result |
|---|---|
| raw `forwarded` always `no` | killed |
| judge ignores `forwarded` | killed |
| ARGS accepts non-VERSION | killed |
| ARGS hint by fragment | killed |
| VERSION accepts `files=1` | killed |
| VERSION drops the hint | killed |
| VERSION drops `exact` | killed |
| VERSION accepts non-VERSION | killed |
| VERSION accepts a path in the text | killed |
| finally-skip | killed (8) |
| finally early return | killed (55) |
| `old-build-left-loaded` printed without throw (STOP without RETURN) | killed (6) |
| any reload failure excused | killed (6) |
| finally STOP skipped on give-up | killed (1) |
| DIALOGS missing for D and E | killed (3) |
| DIALOGS missing for E | killed (2) |
| N-4 path print | killed |
| N-4 catch bypass | killed (2) |
| proof gate accepts `answered` | killed (2) |
| VERSION without ROOT add | killed |
| VERSION frame without row id | killed |

## 6. Findings

**MINOR-1 — liveE19 changes the Upload folders, and the sheet does not say so.**
- **Where:** `recipes/s12-r19.ps1:141`, `recipes/s12-r19-de.ps1:15-19`. Against §4.27 line 1854: the liveE19 bullet has
  no "ROOT added", while B and C have one.
- **What:** R19-VERSION's control (`files=1`) needs ROOT among the Upload folders. Without it, the control is refused by
  the gate. The builder added ROOT inside the row's block instead of adding `root-add` to the order. The mechanism is
  correct (§4 (b)), but code and sheet now differ (agent-rules §4: "never diverge silently"), and the slice's
  safety-state footprint grows.
- **Fix:** the step agent rules on the builder's Proposed decision 1 and writes a dated §4.27 note, before any Run 19
  observation, saying "liveE19: ROOT added (inside r19-old-version, before the swap)". Alternatively, put `root-add`
  after `r19-0` in `$R19Order.liveE19` and update the pinned order tests.

**MINOR-2 — R19-ARGS-OLD's `forwarded=no` is read from the answer only (a spec attack, not a builder defect).**
- **Where:** `recipes/s12-r19-de.ts:29, 69-71`; §4.27 line 1791, Discrimination.
- **What:** the sheet says an answer-detecting build "forwards the call … (the raw leg then answers `ok` with
  `kind: "function"` …: `forwarded=yes`)". A daemon that forwards and then turns the answer into `VERSION` with
  `ARGS_RELOAD_HINT` would print `forwarded=no` and PASS. The live leg cannot see forwarding. Today the proof is the
  unit test (`mcp/test/s12-args-cross.test.ts`, `ext.evaluateCalls()` equal to `[]`).
- **Fix:** for the session agent. Either a dated note saying the raw leg discriminates a forwarding daemon but not one
  that rewrites the answer (that rests on the unit test), or a page-side witness (a raw expression with a page side
  effect, read back by a no-`args` call). The witness would change the sheet's expression, so it is a sheet change, not
  a builder fix.

**NIT-1 — the reset restores the count instead of checking it.**
- **Where:** `s12-r19-lib.ps1:122`.
- **What:** `$global:S16Stops = $r19s0` resets the count; it does not check that exactly one STOP was added. That is
  equivalent today (§4 (a)).
- **Fix:** `if ($global:S16Stops -ne $r19s0 + 1) { throw }` before the reset, so a future second STOP in the reload
  block is not cleared silently.

**NIT-2 — a guard STOP line stays in the record on a give-up.**
- **Where:** `s11b-r17.ps1:441`, via the frame.
- **What:** on a give-up, the record keeps `STOP: the reload script exited 2 after one re-run on exit 2 …`, then the
  `NOT RUN` row, with no RETURN. `checkStopReturn` (`s12-r19.ts:30-49`) matches only `STOP <reason>`, so R7.6 does not
  misfire. But a live runner told to return on "a guard printing STOP" (agent-rules §6) could stop there.
- **Fix:** say so in Run 19's runner brief, or have the frame print a `CHECK … reload gave up` line.

**NIT-3 — no `npm run build` result in the builder's report.**
- **Where:** `S7-drivers-DE-builder.md` §2.
- **What:** the report quotes no `npm run build` result (agent-rules §6, Builder). My worktree build exited 0.

**NIT-4 — `rawForwarded` duplicates a helper with different rules.**
- **Where:** `s12-r19-de.ts:29` against `s12-forms.ts:39`.
- **What:** `rawForwarded` (any `ok` means yes) duplicates `forwardedFrom` (`ok` plus `kind:"function"`) with
  different semantics. It is stricter, so safe, but there are now two definitions of one printed word.
- **Fix:** use one of them, or note why there are two.

**NIT-5 — no test for a give-up followed by a failing finally.**
- **Where:** `recipes/test/s12-r19-de.test.ts:128`.
- **What:** the stubbed `Invoke-R19Rerun` always returns `$true`, so no test covers "give-up, then the finally fails,
  then STOP `old-build-left-loaded`". I proved that path by harness (evidence file).
- **Fix:** add the scenario.

## 7. Proposed decisions
None of my own. The builder's Proposed decision 2 (give-up read from the record line) is sound as built. Proposed
decision 1 needs the ruling in MINOR-1.

## 8. Handoff
- **Gotcha candidate (measured here, 2026-10-29).** From Git Bash, `cmd //c rmdir "<win path>"` on the worktree's
  `node_modules/@bridge/*` junctions printed "The system cannot find the file specified". `git worktree remove --force`
  then failed with "Directory not empty", after deleting the junctions' in-tree targets. PowerShell's `cmd /c rmdir`
  removed them. The junctions pointed inside the worktree, the main tree's `node_modules/@bridge` (5 entries) was
  intact, and the leftover had 0 reparse points before it was deleted.
- No processes are left running, and the scratch worktree is pruned.

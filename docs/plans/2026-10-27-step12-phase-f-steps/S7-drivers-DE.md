# S7-drivers-DE: liveD19's and liveE19's row drivers, the old-build rows (step report; step agent Opus 5.5, medium)

## 1. Verdict
**DONE.** Every block of liveD19's and liveE19's order (`recipes/s12-r19-lib.ps1:12-13`) has a driver. `r19-old-args` (R19-ARGS-OLD, `3ab9207`) and `r19-old-version` (R19-VERSION, `63c771c`) run inside the existing old-build frame `Invoke-R19Swapped`, whose finally (restore HEAD, segment, reload, re-proof) is unchanged. A static test proves every liveD19/E19 block has a driver. liveD19 and liveE19 now print `DIALOGS` at R19-RESTORE. N-4 is fixed. The verifier's verdict is **PASS-with-notes** at round 1, with no fix round. The stage was not split: it came in far under the cap. Nothing ran against Chrome, the daemon or port 9234.

## 2. Outputs
- New files: `recipes/s12-r19-de.ts` (actors and pure judges; the reload hints are imported from `daemon/src/intercept.ts`), `recipes/s12-r19-de.ps1` (drivers), `recipes/test/s12-r19-de.test.ts` (36 tests).
- Edited files:
  - `recipes/s12-r19.ps1`: the registrations.
  - `recipes/s12-r19-lib.ps1`: `Invoke-R19Swapped` takes an optional row id for the `NOT RUN — old build not loadable` give-up, and `Write-R19Dialogs` runs for all five slices.
  - `recipes/s12-r19.ts`: the N-4 fix. The `swap` catch prints only `swap: …` wording, else `error`.
  - `recipes/tsconfig.s11b.json`.
  - Four existing test files: `s12-r19.test.ts`, `s12-r19-c.test.ts`, `s12-helpers-e.test.ts`, `s12-r19-static.test.ts`. The verifier found that no assertion was weakened.
- Counts:
  - `npm test`: 231 files / 5520 passed before, 232 files / 5558 passed after (the builder's count; the verifier re-ran it in the main tree and got the same).
  - `npx vitest run recipes`: 1620 → 1658.
  - `npm run typecheck` and all seven `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0 (both agents).
  - `npm run build` exit 0 (the verifier, in its clean scratch worktree).
- Sizes, from the verifier: **153 code lines** against a cap of 750, and **236 test lines** against a cap of 600.
- Mutants: the verifier ran 21 and killed all 21. They covered the discrimination forms (raw `forwarded=yes`, non-VERSION, `files=1`, hint missing, message not `===`, control not ok, a path in the text), a skipped or early-returning finally, a STOP without a throw, DIALOGS missing for D/E, the N-4 path print, the proof gate and the ROOT add. With the change reverted, 10 of the 36 new tests fail.
- Commit: `test(e2e): S7-drivers-DE — liveD19's and liveE19's row drivers (verifier: PASS-with-notes)`. The hash is in the step agent's return.

## 3. Verifier verdict
- Builder: `S7-drivers-DE-builder.md` (Sonnet, medium). DONE.
- Round 1: `S7-drivers-DE-verifier.md` and its `-evidence.txt` (Opus, medium). **PASS-with-notes.**
  - (a) The give-up reset clears only the reload block's own `Fail-S16` STOP on the exit-2-twice path. Exit 3, other wording, and a call with no row id still throw. The finally always runs, and a give-up followed by a failing re-proof still STOPs `old-build-left-loaded`. No protective check is weakened.
  - (b) ROOT in liveE19: R19-0 records the found values first. R19-RESTORE restores them and reads them back by hash; only counts are printed.
  - **MINOR-1:** liveE19 adding ROOT is not in the sheet. It needs a ruling and a dated §4.27 note (§5).
  - **MINOR-2:** a daemon that forwarded the raw call and then rewrote the answer into `VERSION` with the same hint would pass live. Only the unit test (`mcp/test/s12-args-cross.test.ts`) proves nothing is forwarded. This is a sheet question, not a code defect.
  - **NITs:** the reset should assert that exactly one STOP was added; on a give-up the record keeps a guard `STOP:` line before the NOT RUN row (a runner must know it is not a returning STOP); the builder reported no build result; `rawForwarded` duplicates `forwardedFrom`; no test covers a give-up followed by a failing finally.
- Fix rounds used: 0 of 3. The notes are carried. None affects a want or a STOP, and MINOR-1 and MINOR-2 are the session agent's to rule.

## 4. Deviations
- None from the brief. The stage was not split (153 code lines against 750).
- The builder's edits to existing test files are within the lane (`recipes/test/*`).

## 5. Proposed decisions (for the session agent)
### 2026-10-29 · liveE19 adds ROOT to the Upload folders inside the R19-VERSION block
**Decided:** `r19-old-version` adds `<ROOT>` once on the current build before the swap, and R19-RESTORE restores it. The slice's order is unchanged. A dated §4.27 note, written before Run 19, says "liveE19: ROOT added". **Why:** R19-VERSION's control upload without `chooser` must be `ok` with `files=1`, which needs `<ROOT>` among the Upload folders, and the sheet's liveE19 bullet does not add it. **Instead of:** a `root-add` entry in liveE19's order (the pinned `orderE` tests would change). **Revisit if:** the sheet puts `root-add` in liveE19's order. **By:** Claude (proposed; builder §5, verifier MINOR-1)

### 2026-10-29 · An old build's reload give-up is read from the reload block's record line
**Decided:** the frame turns `reload-extension.ps1 exit 2 (attempt 2)` into `ROW <id> NOT RUN — old build not loadable`, and resets the one guard STOP the reload block added. Every other reload failure throws, and the finally is unchanged. **Why:** §4.27 says the row is NOT RUN when the old build cannot be loaded within one re-run. **Instead of:** copying the reload loop into the frame. **Revisit if:** the reload block's wording changes; also take the verifier's NIT and assert that exactly one STOP was added. **By:** Claude (proposed; builder)

### 2026-10-29 · The raw leg's `forwarded=no` is proved by the unit test, not live
**Decided:** a dated §4.27 note says R19-ARGS-OLD's raw leg cannot tell "not forwarded" from "forwarded, then rewritten to VERSION with the same hint". That proof is `mcp/test/s12-args-cross.test.ts` B2.3. **Why:** the sheet's discrimination sentence overstates the live leg (verifier MINOR-2). **Revisit if:** a daemon-side forward counter is built. **By:** Claude (proposed; for the session agent)

### Carried from the builder (`S7-drivers-DE-builder.md` §5), none disputed
- MCP legs check the hint with `includes`, because the tool wraps the message. The SDK and raw legs check with `===`.
- The raw leg's `forwarded=yes` covers any `ok` answer, including a silent forward that returns `undefined`.
- The control's raw twin is a `CHECK … control raw-twin kind=` line.
- `outside-file-reached-page` has no use in either row: only `<ROOT>` files are used, and they are refused before anything is read.

## 6. Findings
- No pre-registered check failed. No new runtime fact: nothing ran live.
- **Gotcha candidate (process, verifier):** from Git Bash, `cmd //c rmdir` did not find the scratch worktree's `node_modules/@bridge/*` junctions, and `git worktree remove --force` then failed with "Directory not empty". PowerShell's `cmd /c rmdir` removed them. Of the #364 gotcha candidate, the session agent's call. `recipes/s12-oldbuild.ts` runs `cmd /c rmdir` from node, not through Git Bash, so it is not affected; this is unmeasured live.
- In a CRLF scratch worktree, `s11-r16-runner.test.ts` had 9 failures, the known worktree gotcha; the main tree has none.
- First-run risk: the MCP VERSION text format is checked offline only.

## 7. Handoff
- Nothing is running. The verifier's scratch worktree is removed and pruned, and `wtv` was not touched.
- **Next:** the UP-OPT investigator / Run 19 (liveA19–E19), as the resume plan says. Before liveE19 the session agent rules on §5 (1) and writes the §4.27 notes for §5 (1) and (3). A live runner should know that on a reload give-up the record holds a guard `STOP:` line followed by `ROW … NOT RUN — old build not loadable`, with no RETURN, by design.
- Briefs' READ lists were as the step brief. The verifier also read the builder report as claims to audit.
- Needs the user's keyboard: nothing.

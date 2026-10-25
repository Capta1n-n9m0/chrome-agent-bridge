# S5-rules — step report (Step 11, stage S5, slice S5-rules)

Step agent: Claude Opus 5.5. UTC 2026-10-25T20:33Z – 20:56Z.

## 1. Verdict

**DONE.** Final verifier verdict: **PASS-with-notes** (`S5-rules-verifier2.md`), after one fix round.

## 2. Outputs

- `recipes/s11-rules.ts` (532 lines, 442 of code by verifier 1's count): §4.23's row builders and judges, with no I/O,
  process, clock or logging. `foundcheck` imports `parseUploadFolders` and `uploadPathsAllowed` from
  `extension/src/upload-paths.ts`. The row → function map is in `S5-rules-builder.md`.
- `recipes/tsconfig.s11.json`; `recipes/test/s11-rules.test.ts` (47 tests).
- `recipes/tsconfig.s6.json`: one added `exclude` entry (`test/s11-rules.test.ts`). See Deviations.
- Counts, as re-derived by verifier 2 in a clean copy (HEAD `42d1ce8` plus these four files, own `npm ci`):
  - `npm test`: 147 files, 3672 passed. That is 3668 after the build, plus 4 fixer tests.
  - `npm run typecheck`: exit 0. `npm run build`: exit 0.
  - All six recipes configs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`) exit 0 under `npx tsc --noEmit -p`.
- Exit criteria:
  - **Byte equality:** verifier 1 compared the sheet with the code by script, 78 equal and 0 different. That covers
    every expected-text table entry plus UP-L1, UP-0, UP-FA, UP-OPT, UP-5, SAVE-REFUSE-R, SW-2 and UP-LOGS. Verifier 2
    re-ran the comparison on the fixed code with the same result.
  - **SW-2:** every branch is tested with a warm-up trial present.
  - **Mutants:** a threshold change, the warm-up counted and a broken hash compare all go red, as do others listed
    in the verifier reports.

## 3. Verifier verdicts

| Round | Agent | Model / effort | UTC | Verdict | Findings |
|---|---|---|---|---|---|
| build | builder | Sonnet 5.5 / medium | ~20:33–20:45 (approx., file times); context ~90k tokens | DONE | — |
| 1 | verifier | Opus 5.5 / default | 20:40–20:47 | **FAIL** | MAJOR 1 (the s11 test broke `tsconfig.s6.json`, 36 errors); MINOR 2 (`<OUTSIDE>`-only STOP untested); MINOR 3 (UP-LOGS "fixture URL" undefined in sheet); NITs (`judgeError` echoes `data`; no `mcpOkText` drift test; two SW-2 inputs untested) |
| fix | fixer | Sonnet 5.5 / medium | 20:47–20:49 | DONE | closed MAJOR 1, MINOR 2, the `mcpOkText` and SW-2-input NITs; left MINOR 3 and `judgeError` as briefed |
| 2 | verifier2 | Opus 5.5 / default | 20:49–20:54 | **PASS-with-notes** | MINOR 1 (new SW-2 not-measured-warm-up rule has no sheet text); NIT 1 (drift test's `join` check not anchored to the upload handler); NIT 2 (four trials, one not measured, untested) |

Sonnet built the slice and Opus verified it. Round 1 found one MAJOR, a config side effect the builder never checked:
the builder ran only the s11 config, not the other five recipes configs.

## 4. Deviations

- **Outside the slice's three files:** `recipes/tsconfig.s6.json` gained one `exclude` line, authorized by the step
  agent.
  - **Why:** the new test is otherwise swept into the s6 config by its `test/*.test.ts` glob, which is the gotcha in
    `recipes/CLAUDE.md`. The s9 and s10 tests are already excluded the same way.
  - The change is mechanical and in the same package. Revert it if the session agent wants that lane kept strictly.
- **The builder's start time** comes from file times, not `date -u`.

## 5. Proposed decisions

### 2026-10-25 · SW-2: an unmeasured warm-up, or a trial count other than three, gives NOT MEASURED
**Decided:** `sw2` (`recipes/s11-rules.ts:413`) returns NOT MEASURED when the warm-up trial was itself not measured, or
when the list does not hold exactly three measured trials. The outcome and S5b are computed as before, and no non-pass
becomes a pass. **Why:** §4.23 (line 1500) is silent on both cases, and the fixer pinned the conservative reading.
**Instead of:** the literal reading of "recorded and excluded", which would let SW-2 pass with an unmeasured warm-up.
**Revisit if:** the session agent prefers the literal reading. Either way, §4.23 needs a dated note stating the rule
before Run 16 runs (agent-rules §2: pass rules are written before the measurement). **By:** Claude (proposed)

### 2026-10-25 · UP-LOGS: which URLs count as fixture
**Decided:** none; this is for the session agent. §4.23 never defines a "fixture" URL for the UP-LOGS counters.
- **The code's reading:** any loopback port is fixture, and `chrome-extension://` counts as "other".
- **Step 10's reading (`recipes/s10-rules.ts:117-125`):** listed the fixture ports and counted `chrome://extensions`
  and the extension's own pages as fixture.

**Why:** under the code's reading, a page of the extension itself could trigger a STOP the wave did not need.
**Instead of:** the step agent picking a reading, which would be a pass rule chosen without the sheet.
**Revisit if:** — . **By:** Claude (proposed; a dated §4.23 note before liveA, then align `s11-rules.ts` if needed)

## 6. Findings

- **Sheet gaps, to be closed by dated §4.23 notes before Run 16:**
  - SW-2's unmeasured-warm-up case (verifier 2, MINOR 1).
  - The UP-LOGS fixture set (verifier 1, MINOR 3).
- **The builder's other §4.23 ambiguities** (UP-0's empty-hash text, UP-OPT's home line index, SAVE-REFUSE-R's MCP
  control case, the `ROW`/`CHECK` line shapes): verifier 1 judged all four reasonable readings. The `ROW`/`CHECK`
  shapes are proposed by the builder, because the sheet quotes neither.
- **Open NITs**, none blocking:
  - `judgeError` prints the observed `data` as is.
  - The drift test's `join` anchor (verifier 2, NIT 1).
  - The untested case of four trials with one not measured (verifier 2, NIT 2).
- **Process:** the builder's mutant loop left stray files `350` and `900` in the repo root. It removed them, and the
  fixer's `git status` showed none.

## 7. Handoff

- Nothing running. The verifiers' scratch copies are deleted, after removing their junctions.
- Evidence is in this session's scratchpad (`vcheck/`, `v2/ev/`), which is not committed.
- **Next slices:**
  - **S5-actor** (the SDK script): uses these builders as its single source of expected text.
  - **S5-driver** (the PowerShell driver).

  Both proposed decisions above need a ruling and a §4.23 note before liveA.

# S5-drivers-C2 verifier, round 3: liveC20's actor

Model and effort: Opus 5.5, medium. I only read and ran things. Nothing ran against Chrome, a daemon or a port.
Evidence: `S5-drivers-C2-verifier3-evidence.txt` (the mutant method, 9 mutants and their results).
Scope: what fixer2 changed for verifier2's G1, G2 and G3, plus a regression check and an audit of fixer2's §3 (the C3 interface).

## 1. Verdict
**PASS-with-notes.** G1, G2 and G3 are fixed. All gates pass. I found two MINOR points and one NIT (H1 to H3). None of them
changes a verdict the actor prints today.

## 2. Outputs (re-derived)
- `npm test`: **Test Files 250 passed (250); Tests 5977 passed (5977)**. That is 5974 + 3, all 3 in
  `recipes/test/s13-r20-c.test.ts`, which now holds 26 tests (`m00_base`).
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json`: exit 0.
  `npm run build`: exit 0. `node scripts/doc-check.mjs`: "Checked 38 living docs (6 closed phase docs skipped …)", exit 0.
  Its two information lists (the CLAUDE.md test count, and the next-session-prompt status) were there before fixer2.
- `git status --short` lists only the two tsconfig edits, the actor, its test, and the C2 reports and evidence. This
  report and its evidence file are new.
- Privacy: no `C:\Users`, user name or `AppData` in the two code files (grep exit 1) or in my evidence file (0 hits).
- Diff checked line by line. I compared verifier2's own unmutated copy (`mut2/base` in the session scratchpad, its
  imports normalised) with the current actor. The only changes are:
  - the header line;
  - `afterGate`'s comment (G3);
  - `EARLIER_NM_*`, `earlierVerdict`, `condOf` and `earlierAttach` (new);
  - `devtLeg`'s inline earlier block, replaced by `earlierAttach`;
  - `needCond`;
  - the earlier step in `upDevt` and in `sweepHeld` phase 1;
  - `cond=` in the two CHECK lines;
  - `export` on `gateCmd`.

  Nothing else moved.
- Mutants: 9, run on copies outside the repo with no `node_modules` and no links (`find -type l` = 0).
  - Killed (5): **f4d** ("expected 'CHECK R20-DEVT finding: …' to be 'CHECK R20-DEVT no-refusal legs-pass=1…'"),
    e3 (`condOf` always `none`), e4 (idle ignored), e5 (no throw on a bad `--cond`), e7 (`<` made `<=`).
  - Survived (3): e1 (UP-DEVT's earlier step removed), e2 (SWEEP-HELD's earlier step removed) and e6 (`earlierAttach`
    a no-op). See H1.

## 3. The checks the brief named

**G1: fixed, and consistent with §4.28.**
- UNDOCK's leg is "undocked DevTools after an earlier attach", with "(1) `evaluate "1 + 1"` answers `2` … (2) … `IDLE ≥ 20 000 ms`" (line 1990).
  The conditional rows run "Under the **refusing leg's** DevTools state, opened by the same method" (line 1992).
- With `--cond earlier`, `upDevt` (`s13-r20-c.ts:127`) and `sweepHeld` phase 1 (`:166`) run `earlierAttach` (`:73-79`)
  before `ctl0`. That is the same evaluate, value check and `idle()` that `devtLeg` runs (`:84`).
- The before-open control is then read after the idle. `condGate` keeps its rule that `attached=yes` before the open is
  NOT MEASURED, as in R20-DEVT-UNDOCK.
- The two NOT MEASURED texts are byte-identical to the old inline ones (diff above). Their order also holds: the value
  is checked first, and `idle()` runs only after a 2.
- `--cond` is strict. `condOf` throws `HelperDefect` on a missing value, an empty value, `Earlier` or `yes` (tested).
  `run()` passes a HelperDefect on (`s12-r19-a.ts:87-90`), and `main` prints `STOP: HelperDefect` with exit 2.
- In both rows `needCond` is read before `x.open`, so a bad `--cond` stops before any state change.
- KEEP-4 takes no `--cond`, as ruled: its own first step keeps a session.
- Sweep phase 2 never reads `--cond` (`:164`).

**The mapping (UNDOCK `undock` → `--leg undocked --cond earlier`; EARLY `undocked` → `undocked none`; EARLY `docked` → `docked none`)** is correct for
the sheet. Each DEVT leg's condition is reproduced, and no pair outside these three is asked for. It is not strict in
code, though: see H2.

**"First refusing leg in sheet order"** is independent of any result seen (§2 integrity floor). The sheet says "the
refusing leg" (singular) and never covers two refusals, so this is a design-local choice, rightly left to the step
agent. I support it. It is not implemented anywhere yet: `gateCond("undock,docked")` prints only `refusing-legs=2`. See H2.

**G2: fixed.** The new test (`test:186-198`) drives `cmds["gate-cond"]` through argv and captures `console.log`. It
kills f4d.

**G3: fixed.** `:34` now names SWEEP-HELD phase 2 only.

**No regressions:**
- `devtLeg`'s behaviour is unchanged. The block was extracted; the texts, order and early return are the same.
- `parseCtl`, `condGate`, `keep4Gate`, `upDevtLegs`, `keep4Legs`, `sweepVerdict`, `gateDock`, `gateCond` and the exit codes
  are untouched.
- The 23 tests from round 2 pass unchanged.

**§3 of fixer2's report against the code.** These match:
- the commands;
- the step ids (UP-DEVT `ctl0, open, ctl1, ctl2, close`; KEEP-4 `open, ctl1, close`; SWEEP-HELD phase 1 `ctl0, open, ctl1`,
  phase 2 `ctl2, check, close`);
- the answer forms;
- the LEG labels on the earlier path (`control` for UP-DEVT, `control-pre` for SWEEP-HELD);
- `STOP: HelperDefect` on a bad `--cond`;
- the `cond=` CHECK line;
- `gateCmd` exported.

The earlier path also prints `ANSWER <row> <label> earlier <code>` and `IDLE <row> since-attach-ms=<n>`. §3 leaves these
out, but they are only informational. One gap remains: H3.

Fixer2's §2 says its red proof was "by construction (no copy run: a copy has no `node_modules`)". That premise is wrong.
A copy runs under the main tree's vitest, as verifier2 did and as I did here. The construction argument holds for
`earlierVerdict` and `condOf`, but it says nothing about the wiring (H1).

## 4. Deviations
None.

## 5. Proposed decisions
None new. I agree with fixer2's two proposals: `--cond` chosen by the refusing leg, and the first refusing leg in sheet
order. The second should be printed by the actor (H2).

## 6. Findings

**H1 MINOR: no test covers the earlier-attach wiring into the conditional rows.** `s13-r20-c.ts:127`, `:166`, `:74-78`.
- Mutants e1 (the UP-DEVT line deleted), e2 (the SWEEP-HELD line deleted) and e6 (`earlierAttach` returns at once) all
  pass the 26 tests (evidence).
- So a regression that brings back G1's very fault would stay green.
- This follows the repo's testing philosophy: the async actor glue runs only live, and `devtLeg`'s earlier block was
  never unit-tested either. The live record would show it, because a `cond=earlier` row prints `ANSWER … earlier` and
  `IDLE … since-attach-ms=`.

**Fix (either):**
- C3's row judge checks that a `cond=earlier` CHECK line comes with an `IDLE <row>` line ≥ `IDLE_MIN_MS_19` before
  `ctl0`; or
- a pure exported pre-open plan (`preOpenSteps(cond) → ["earlier","idle"] | []`) that the rows follow, tested against
  the sheet.

**H2 MINOR: the mapping from refusing leg to `--leg`/`--cond`, and the first-in-sheet-order choice, live only in prose.**
- `s13-r20-c.ts:101`, `:71` and `:203-207`.
- The actor accepts `--leg docked --cond earlier`, a condition that no DEVT leg measured.
- `gate-cond` names only the count of refusing legs, so C3 must re-derive both the choice and the mapping in PowerShell.
  A slip there re-opens G1 under a different name.

**Fix:**
- A pure exported `condFor(label)` that maps `undock` to `{leg:"undocked",cond:"earlier"}`, `undocked` to
  `{undocked,none}` and `docked` to `{docked,none}`, and anything else to HelperDefect.
- `gate-cond` prints `CHECK gate-cond run=yes refusing-legs=<n> under=<first label in sheet order> leg=<state> cond=<c> not-rerun=<others>`,
  which C3 copies.
- One test each.

This can also go to C3 and C3's verifier, if the step agent prefers.

**H3 NIT: §3 does not say what C3 does when `sweep-held --phase 1` exits 3.**
- Exit 3 comes from `condGate` NOT MEASURED, or from the new earlier-path NOT MEASURED at `:166`.
- On the earlier path, the marker tab stays open (it was opened with `keep`) and DevTools was never opened.
- If C3 then reloaded and ran phase 2 anyway, it would cost an extension reload for nothing. Phase 2's `afterGate` would
  read NOT MEASURED, so no false verdict, but the reload is wasted.

**Fix:** state in C3's interface that on phase 1 exit 3, C3 skips the reload and phase 2, closes the marker tab, and
carries phase 1's verdict into the ROW.

## 7. Handoff
- The step agent decides whether H1 and H2 go to a fixer now or into C3's brief. Both are MINOR, so neither blocks this
  slice's commit.
- Files to commit: the actor, its test, the two tsconfig edits, and the C2 reports and evidence, this report included.
- Nothing is left running. My copies are in the session scratchpad (`mut3`), outside the repo.

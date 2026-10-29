# Step 12 close-out builder (docs)

Claude Opus 5.5, medium effort. Role: builder (docs), `docs/agent-rules.md` §6. No code was touched and nothing was
committed (the session agent commits).

## 1. Verdict

**DONE.** All three tasks are done. Two items are left to the session agent, as the brief said: root `CLAUDE.md` lines 17–18,
which are inside the Current state block, and the commit.

## 2. Outputs, per file

- **`docs/plans/2026-10-27-step12-phase-f.md`, § As built only.**
  - A new **S8** block: `87aa919`, verifier PASS after two fix rounds, the counts 25 / 28 / 27 (26), 5596 tests in 235 files,
    doc-check exit 0.
  - A new **Gate checklist · 2026-10-29**: 40 lines, one for each exit check (Every stage, Z.1, R1.1–R1.7, B2.1–B2.4,
    C3.1–C3.4, D4.1–D4.4, E5.1–E5.3, G6.1–G6.4, G6.5–G6.8, R7.1–R7.6, S8.1) and each human gate (G12-0–G12-3, Carried).
    Each line gives its evidence from the stage reports or the run records.
  - The checklist's top line says plainly that **not every item is met**:
    - G6.1–G6.4 were not run (G1 waits for G12-2, #337).
    - G12-2 is open.
    - G12-1 is not granted, and nothing is pushed.
  - Three checks are met although rows inside them failed. Each failing row is recorded as a finding:
    - R1.4/R1.6 (#349, #351);
    - G6.8 (R19-G2-1 FAIL);
    - R7.3.
- **`docs/decisions.md`.**
  - The Log entries #321–#373 (53 entries) are moved out.
  - The Log section now holds a two-line note pointing to `decisions-archive/step12.md`.
  - A `step12.md` row is added to the Archive table.
  - The Open decisions intro now says where the full entries are. Its lines are unchanged.
  - Standing decisions is unchanged.
  - The file went from 14 834 words to about 3 150.
- **`docs/decisions-archive/step12.md` (new).** It has step11b.md's header form, and the 53 entries newest first, verbatim:
  `diff` against `git show HEAD:docs/decisions.md` from line 201 shows no difference.
- **`CLAUDE.md` (root).**
  - Line 88: the tool count is now 25.
  - Line 113: the test count is now 5596 / 235 (`npm test` 2026-10-29, S8).
  - The worktree gotcha gains a pointer for the `@bridge/*` junctions (#364, #365).
  - The Current state block is not touched.
- **`mcp/CLAUDE.md`.**
  - The tool count is now 25 (lines 9 and 52), and `browser_console_messages` is added with the three #214 deltas.
  - The stale focus/input-gap sentence is replaced by a pointer to G2 (#338, #354, R19-G2-1/2).
  - Two new gotchas: the MCP's own refusal lines (#373), and the 20 000-character console cap that keeps the oldest lines
    (#355, R19-CON-CAP).
- **`sdk/CLAUDE.md`.**
  - Key files: Step 12's `Tab` additions, and `format/console-messages.ts`, which is on the format subpath only.
  - A pointer bullet for the sorted keys.
  - The "no `console.`" gotcha was already there (S3b), so it was not added again.
- **`extension/CLAUDE.md`.**
  - 28 router methods, with `consoleMessages` (class `evaluate`, #334) and `handlers/console.ts`.
  - The hello `features`, `debugger-keeper.ts` and `evaluate/call.ts`.
  - The docked-DevTools measurement is added beside the "one debugger per tab" claim, which is kept (#369).
- **`extension/src/CLAUDE.md`.**
  - The header now also binds `console-messages.ts` and `debugger-keeper.ts`.
  - Uploads: the chooser facts (REFUSE `dis` #370, KEPT FAIL).
  - A new section, "Console read and the kept session": no preview on replayed args (CON-NOTEA), frames (CON-FRAME), the
    second `Runtime.enable` (#352, CON-KEPT), the keeper's idle detach (KEEP-2, KEEP-1's ND), and Run 18's banner `seen`
    not reproduced.
- **`extension/src/evaluate/CLAUDE.md`.** The `returnByValue` sorted-keys gotcha (Stage 0 §B, R19-ARGS-1, #373).
- **`daemon/CLAUDE.md`.**
  - Key files: `consoleMessages`, `trustedFocus`, `TRUSTED_SETTLE_MS`, and the feature/`VERSION` work in `intercept.ts`.
  - Two gotchas: the trusted-input hold (G2-1/G2-2), and the rule that a feature belongs to its socket's hello (#332, #355).
- **`recipes/CLAUDE.md`.** One "Run 19's helper facts" bullet covering #364–#373.
- **`docs/progress-and-roadmap.md`.**
  - The Date is now 2026-10-29.
  - A Step 12 lead is added to the Status line, with the counts, the Run 18/19 records, "G1 waits for G12-2" and "not
    pushed", plus a dated superseded note.
  - A Step 12 row is added to the § 1 milestone table.

The word counts are all within budget: root 2151 / 3000, extension 3428 / 3500, recipes 2734, daemon 1860, sdk 1643, mcp
1139, `extension/src/` 978 / 1200, evaluate 441. Line endings match each file's HEAD blob (LF).

## 3. doc-check

`node scripts/doc-check.mjs` exits 0. It reports two findings:
- `CLAUDE.md:17` says 24 tools and `:18` says 27 router methods. Both lines are in the Current state block, which the session
  agent writes.
- The test count stated is now 5596.

The word-budget finding for `decisions.md` is gone, and no decision-number or dead-path finding appeared.

## 4. Deviations

- **Gotchas placed by the code they bind (skill §4), not as the proposals named them.**
  - The sorted-keys fact is in `extension/src/evaluate/CLAUDE.md`, with a pointer from `sdk/`.
  - The console and keeper facts are in `extension/src/CLAUDE.md`, because those files sit flat in `src/` and
    `extension/CLAUDE.md` had 182 words of budget left.
- **The cited sources are named by file and function, not by line number,** because line numbers move.

## 5. Not placed / for the session agent

- **Root lines 17–18 (Current state).**
- **`shared/CLAUDE.md`.** The proposals do not name it. Its Key files do not yet list Step 12's `protocol.ts` additions:
  the `args` guard, the console entry type, and `FEATURE_*`.
- **No Standing-decisions lines were added for Step 12.** Any Step 12 rule that should stand would need the session agent's
  choice.
- **The MCP tool description still says "frames are not read".** That is product code, so it is noted as a follow-up only.

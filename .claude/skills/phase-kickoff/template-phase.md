# Phase kickoff — anatomy

Sections in this order. About 1.5k words in total. Every section points; none restates a rule
from `docs/agent-rules.md`, the `long-run` skill, the phase doc or a `CLAUDE.md` file.

1. **How to start the session** (above the line): the working directory and the launch command
   (the driver is not a bridge client: `claude --strict-mcp-config --mcp-config <empty config>`).
2. **Opening** (one paragraph): "You are the SESSION AGENT for Step N — <plain title>", what the
   step delivers in two or three sentences, and "AUTONOMOUS — I am away; do not block on me".
3. **First checks** (numbered, each checkable): the precondition (decisions ruled, by date +
   title); the environment re-checked and dated (baseline commit, `npm test` count, typecheck and
   build, port 9234, loaded extension vs `dist/`); any one-time check the step needs.
4. **Binding documents**, in reading order, each with what to take from it: the phase doc (the
   work, risk tiers, exit checks, human gates, STOP rules, forbidden fixes), the design spec
   sections, the earlier as-built sections it builds on, the decisions that bind (date + title),
   `docs/agent-rules.md`, the `long-run` and `step-agent` skills.
5. **This phase's settings**: the form (three levels, unless a reason is given), parallel lanes,
   the steps dir, grants for live work beyond the standing ones, and any deviation from
   `agent-rules.md` (normally none). Models, fix rounds and commits are `agent-rules.md`'s: point,
   don't state.
6. **Stage 0 — spec audit**: one line pointing to the phase doc's Stage 0, which holds the lenses
   (code citations executed, not read; counts recomputed; blind spots with a seed list;
   testability), the re-execution of the previous phase's contracts, and its exit check. Before
   it: record the phase doc's proposed decisions so the audit can attack them. After it: the
   stage split in the journal.
7. **Close-out**: the `long-run` §5 end of phase, and what follows this step on the roadmap.

## Bookkeeping invariants (carry into every phase)

- One commit per stage close, one per phase close; exact file lists.
- The run journal `docs/plans/<phase>-steps/journal.md` is append-only; pre-registered exit checks
  always precede the results they govern.
- Every stage report states the test count before → after.
- Anything that changed what the user must do (`docs/setup.md`) or how a tool behaves
  (`docs/e2e-test-plan.md` rows) is updated in the same stage.
- At each stage close the session agent writes that stage's **As built** block into the phase doc
  (format: `docs/docs-writing-guide.md` § Phase doc). There is no separate as-built file from
  Step 11 on.

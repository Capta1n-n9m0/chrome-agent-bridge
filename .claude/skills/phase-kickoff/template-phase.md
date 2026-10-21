# Phase kickoff — anatomy

Distilled from the exp3-CAFRL build kickoffs (2026-06/07) and FinetuneCV's temporal-phase
kickoffs (2026-08/10); ported here 2026-10-21. Sections in this order. The worked example
of the full form is `~/Projects/FinetuneCV/docs/temporal-extension/next-session-prompt.md`
on `expr`.

1. **Opening.** Task + the binding phase doc (`docs/plans/<date>-stepN-*.md`) + the design of
   record (`docs/specs/…-design.md`) + lineage ("the workflow of the `long-run` skill") +
   autonomy declaration ("AUTONOMOUS — I am away; do not block on me", listing the
   user-reserved exceptions and human gates: extension reload, live E2E, push) + the goal +
   the baseline state (clean commit hash; `npm test` count; typecheck and build green;
   whether the loaded extension matches `dist/`).
   State precedence: pre-registered rules > phase doc > the skills. Name the model every
   agent runs.
2. **Agent contract.** Cite the `long-run` skill (context discipline, agent tree, decision
   rules, stop list, waiting and revival). Paste the `step-agent` STEP BRIEF TEMPLATE +
   ESCALATION list, extended with this phase's pre-registered rules and its steps dir
   (`docs/plans/<phase>-steps/`). Say whether this is a two- or three-level run.
3. **Reading order.** Numbered: the design spec first, then the phase doc, then
   `docs/decisions.md` entries that bind (date + title), then earlier as-built registers,
   then `CLAUDE.md` (gotchas + testing philosophy), then `docs/setup.md` /
   `docs/e2e-test-plan.md` where the stage touches them. Include the verified environment
   facts with the date checked.
4. **Stage 0 — spec audit** (one agent, before any code). Four lenses:
   (a) *code-cite compliance* — every `file:line`, function, message type or Chrome/CDP/MCP
   API the plan cites exists and behaves as stated: executed or confirmed live (run the
   test, call the function, read the SDK source), not just read;
   (b) *internal consistency* — recompute every stated count/shape/budget from the real
   repo (tool count, test count, message kinds, timeouts, port/handshake facts);
   (c) *blind spots* — what the plan never states; seed the list with this repo's known
   risks (Windows vs POSIX lifecycle, port-9234 contention and orphans, the manual
   extension reload, MV3 worker culling, one session at a time, token handling, the
   `unknown method` symptom) and instruct "extend this list";
   (d) *testability* — every exit check executable and discriminating, pass rules
   **written down before any measurement**; which checks are unit, which are E2E rows that
   need the user's keyboard.
   Also re-examine the previous phase's as-built contracts by execution.
   Output: findings ranked by severity, tagged plan-side or code-side; all resolved before
   stage 1. Then the session agent records the split into 2–6 stages in the run journal.
5. **SPEC-DISCREPANCY PROTOCOL** (verbatim in every brief). Intent beats procedure; trace up
   the doc chain (phase doc → design spec → `CLAUDE.md` facts) and say so; the deepest
   consistent layer wins. Stakes pick who resolves: mechanical → the fixer documents it;
   design-local → the session agent records a decision (with the rejected option);
   contract-level → `long-run` §3. Code and spec never diverge silently: amend the doc in
   place with a dated note. Verifiers report findings with commands and output; they never
   rewrite the spec.
6. **Decisions and integrity floor.** Point to `long-run` §3 (build vs contract decisions,
   the conservative rule, records in `docs/decisions.md`). Name the **integrity floor** — the
   only items that wait for the user (`long-run` §4 plus anything phase-specific) — and the
   standing rule: never resolve in the direction that flatters a result already seen.
7. **Stages.** Numbered; each with deliverables, the phase doc's exit checks, a budget
   slice and the verifier's focus. Parallelism stated per stage (file-disjoint packages ⇒
   may run concurrently; a shared port or process ⇒ serialised, say why). Verifiers re-run
   everything, re-derive counts, attack the spec as well as the code, and prove new tests
   discriminate. Add a cross-package verifier where `server/`, `extension/` and `shared/`
   interact (protocol changes always do).
8. **Close-out contract.** Measured numbers into the phase doc; the **as-built register**
   `docs/plans/<phase>-asbuilt.md` per [`asbuilt.md`](asbuilt.md), which the next phase's
   stage-0 audit re-examines by execution; gate checklist; propagator; the E2E rows that
   still need the user's keyboard listed plainly; then the `session-closeout` skill and
   this skill again for the next kickoff.
9. **STOP RULES.** The specific failures that stop the gate (not the write-up), what
   continues anyway, and the named **forbidden fixes** (weakening a test, guard, timeout or
   the token gate to make a check pass; binding anything but `127.0.0.1`; logging a URL to
   "debug"). Final report leads with "Decisions taken while you were away" (date + title),
   then gate measurements, then open decisions, then what needs the user. Close: "I trust
   you — decide well and leave a trail we can audit."

## Bookkeeping invariants (carry into every phase)

- One commit per stage close, one per phase close; exact file lists; never `dist/`, never
  the token.
- The run journal `docs/plans/<phase>-steps/journal.md` is append-only; pre-registered exit
  checks always precede the results they govern; estimates and actuals side by side.
- Every stage report states the test count before → after.
- Anything that changed what the user must do (`docs/setup.md`) or how a tool behaves
  (`docs/e2e-test-plan.md` rows) is updated in the same stage.

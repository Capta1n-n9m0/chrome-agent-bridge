# Procedure area, cleanup pass 2026-10-29

Area cleaner (Procedure), Sonnet, medium. Scope: `git diff 510b407..HEAD` (HEAD db7da74) over `.claude/skills/*/SKILL.md`
(only `step-agent` changed), `docs/agent-rules.md`, `docs/docs-writing-guide.md`, `docs/plans/next-session-prompt.md`,
`docs/plans/handoffs.md`, and the briefs and kickoff text in `docs/plans/2026-10-27-step12-phase-f.md`. doc-check output
(`doc-check.txt`) raises nothing in this area (its only item is `CLAUDE.md:117  5596 passed`, State's). Read only.

## Findings

1. **`docs/plans/next-session-prompt.md` is a dead resume kickoff, still the live file.**
   - Where: whole file (title line 1; lines 9-17, 31-36, 79-103).
   - Wrong: it tells a fresh session to "resume at S7-drivers-C", to avoid committing the uncommitted S7-drivers-C work,
     and to run Run 19, S7-record, S8 and the close-out. All of that is done. Commit `db7da74` closed Step 12.
   - Evidence: prompt line 1 "Step 12: Phase F, ergonomics — resume at S7-drivers-C"; line 25 "The tree is not clean, on
     purpose ... Do not commit, stash or revert". Root `CLAUDE.md` Current state: "Step 12 built and Run 19 recorded; the
     gate waits for the user ... The next step is the user's to name." `git status` at pass start: only
     `docs/cleanup/2026-10-29-evidence/` is untracked. Last touch of the prompt: `7b5ff69 docs: Step 12 resume kickoff at
     S7-drivers-C`.
   - Fix: replace it with a one-line "no kickoff pending; the next step is the user's to name; see the root Current
     state", or write the next kickoff once the user names the step (`phase-kickoff` § Procedure). The old text stays in
     git. Needs-the-user for what the next step is; a mechanical stub is safe meanwhile.

2. **The same kickoff pastes rules and numbers it should point to.**
   - Where: `next-session-prompt.md:40-44` (§2 item 1), `:35` (§1 item 4), `:32-33` (§1 item 3), `:67-71` (§3 stall
     paragraph), `:72` (caps).
   - Wrong: `phase-kickoff` SKILL.md and `template-phase.md` say "A kickoff that restates any of them creates a second
     copy that drifts" and "Models, fix rounds and commits are `agent-rules.md`'s: point, don't state."
   - Evidence, prompt side: "Opus builds and fixes contract and safety code and runs every verifier, and Sonnet does
     recipes, fixtures, docs and live runners. Every agent runs at medium effort ... and gets three fix rounds per
     stage"; "54 since Step 11b's push"; "the fixer reported 5506 passed, 230 files"; "expect `9b14658`". Rule side:
     `agent-rules.md:143-148` holds the model split, effort and fix-round rules, and `agent-rules.md` §1 says "Numbers come
     from their source: ... never from a brief or a summary". The numbers already disagree with the record (CLAUDE.md:
     90 commits unpushed; 5596 passed).
   - Fix: when finding 1 is acted on, rewrite the file pointing to `agent-rules.md` §6-§8 and drop the pasted counts and
     hashes ("numbers only from `<file>`"). Mechanical.

3. **The in-turn wait rule (#286, #350) is not in the step-brief template, though the root Current state says it must be
   the first line of every step brief.**
   - Where: `.claude/skills/step-agent/SKILL.md:29-43` (STEP BRIEF template); `.claude/skills/phase-kickoff/template-phase.md`
     (no mention); `docs/agent-rules.md:167-170` (§8).
   - Evidence, one side: root `CLAUDE.md` ("How agents run"): "The first line of every step brief is the in-turn wait
     rule (#286, #350): a step agent that ends its turn on a child stalls the stage." `next-session-prompt.md:70`: "Put
     #286 as the first line of every step brief." Other side: the STEP BRIEF template starts "You are the STEP AGENT for
     stage <STAGE> ..." with no wait line. `agent-rules.md` §8 states the rule but never says it goes first in a brief.
     `grep "first line"` finds it only in the two places that paste it.
   - Wrong: the rule exists in prose and in CLAUDE.md, but the one place an agent copies a brief from does not carry it.
     This stalled the stage twice (#350; `next-session-prompt.md:67-69`).
   - Fix: add one line to the template, as a pointer: "First line: a step agent never ends its turn while a child runs
     (`agent-rules.md` §8, #286)." Then CLAUDE.md can say "see the step-agent skill". Mechanical for the template; the
     CLAUDE.md wording is State's.

4. **Fix-round budget: "per stage" (rules) against "per slice" (CLAUDE.md, #367); the phase doc sets nothing.**
   - Where: `docs/agent-rules.md:149-151` (§7); root `CLAUDE.md` Current state "How agents run"; phase doc
     `2026-10-27-step12-phase-f.md:318`.
   - Evidence: rules: "at most three per stage (#320), counted per stage and never reset by a new attempt ... A live
     stage's limit on runner attempts is set in its phase doc." CLAUDE.md: "three fix rounds per stage (per slice in a
     live wave, #367)". Decision (`decisions-archive/step12.md:160`, #367): "three attempts and three fix rounds **per
     slice**. Each slice has its own step agent". The phase doc line 318 says only "Runner attempts: at most three (§7's
     rounds apply)" for Run 18, and S7 sets no limit for Run 19.
   - Wrong: #367 is a standing refinement that lives only in a decision entry and CLAUDE.md, not in the rules file every
     agent reads. A stage and a slice are the same unit only if each slice is a stage, which the rules never say.
   - Fix: in `agent-rules.md` §7 add "a live wave that runs one step agent per slice counts rounds and attempts per
     slice (#367)", and have the phase doc's S7 cite it. This changes a rule, so it needs-the-user (or the session agent
     under `long-run` §3), then mechanical.

5. **`agent-rules.md` §6 leaf-agent list omits the roles it added in this diff.**
   - Where: `docs/agent-rules.md:134`.
   - Evidence: "Leaf agents (builder, verifier, fixer, runner, committer, area cleaner) never spawn agents." The same diff
     adds line 130 "Checker, investigator, auditor, measurer (read-only leaves ...)". The step-agent LEAF BRIEF ROLE line
     (SKILL.md:48) now lists those four as leaf roles.
   - Fix: add "checker, investigator, auditor, measurer" to the parenthesis. Mechanical.

6. **`step-agent` SKILL.md "Size" bullet has a fragile cross-reference and a run-on.**
   - Where: `.claude/skills/step-agent/SKILL.md:19-21`.
   - Evidence: "a builder over it reports DONE-PARTIAL, unless it is the accepted overrun of `agent-rules.md` §7." The
     rule it points to (`agent-rules.md:156-159`) is conditional (up to 1.5 times, one coherent piece, extra is tests,
     stated under Deviations; code alone over the cap is DONE-PARTIAL). "Accepted" reads as if the builder decides; the
     step agent accepts after the fact.
   - Fix: reword to "... reports DONE-PARTIAL; `agent-rules.md` §7 says when a finished overrun may still be accepted",
     and put the clause on its own line. Mechanical, low value.

7. **Commit trailer: the docs agree with each other; the harness text does not, and the skills do not warn.**
   - Where: `docs/agent-rules.md:204-205`; root `CLAUDE.md` Conventions (lines 165-166); `step-agent/SKILL.md:41`
     (`trailer: <trailer>`); `session-closeout/SKILL.md:59`.
   - Evidence: rules §10 "End with exactly one trailer, `Co-Authored-By: Claude <model> <noreply@anthropic.com>` ... and no
     `Claude-Session` line"; CLAUDE.md "no `Claude-Session:` line (the user's instruction since Step 10 S7)". This
     session's harness attribution reminder asks for a `Claude-Session:` line as well. The docs rule binds (the reminder
     itself defers to the user's CLAUDE.md), so there is no doc drift, only a trap for a committer agent briefed from the
     harness text. The STEP BRIEF's `trailer: <trailer>` leaves the form to the session agent each time.
   - Fix: none needed in the docs. Optional: STEP BRIEF OUTPUT line says "trailer per `agent-rules.md` §10" rather than a
     free placeholder, so a committer cannot be handed the harness variant. Mechanical, optional.

8. **Phase doc header status is stale against the same doc's As built (cross-area, for Plan drift or State).**
   - Where: `docs/plans/2026-10-27-step12-phase-f.md:3` and `:8`.
   - Evidence: "**Status:** In progress; G12-0 ruled 2026-10-27 (#321); Stage 0 done (`de8ea69`)" and "Steps dir: ... (created
     at kickoff)", while the doc's § As built has S7 and S8 blocks and a gate checklist, and CLAUDE.md says "Step 12 built
     and Run 19 recorded". The PRECONDITION block (lines 10-17) also still reads as live.
   - Fix: update the Status line to the current state (a living phase doc until the user closes the gate). Mechanical.

9. **Briefs and kickoff text inside the phase doc: no pasted-rule violations found.**
   - Where: phase doc "Stages" preamble (`:279`), § S7 and § S8.
   - Evidence: `:279` "Models, effort, fix rounds and the size cap: `agent-rules.md` §6-§7 (#289, #271, #320)" points rather
     than pastes. Stage 0's "27 router methods, 27 codes, 24 tools" (`:~276`) are counts, but they are the Stage 0 audit's
     own input at the start commit and are historical to that stage. No finding.

## Checked and clean

- `agent-rules.md` against `long-run` SKILL.md: §8 "Only the session agent ends its turn on a running child" and long-run §2
  "You may end your turn on a running step agent (`agent-rules.md` §8)" agree. long-run §3-§5 point to rules sections that
  exist (§3, §4, §5, §7, §8).
- `docs-writing-guide.md` diff (handoffs.md "its old entries; new ones are added at the top") matches `handoffs.md`'s new
  header ("reopened 2026-10-27, #320"; "Older entries are history").
- `handoffs.md` carries only the W2 and earlier wave prompts, which are records; their pasted rule text is not drift.
- `phase-kickoff/template-phase.md` (398 words) and the kickoff budget (about 1.5k) are met by the template; the existing
  prompt is 1410 words, inside budget but see findings 1-2.
- `session-closeout` §7 points to `agent-rules.md` §10 for the trailer; no restatement.
- `cleanup-pass` SKILL.md area-cleaner brief matches `agent-rules.md` §6 (leaf cleaners never spawn; report form §9).

## Counts

Raised 8 (1-8; 9 is a no-finding note). Mechanical: 2, 3 (template), 5, 6, 7, 8. Needs-the-user: 1 (the next step), 4 (rule change).

---
name: phase-kickoff
description: Write the self-contained prompt that starts the next session of multi-session work in this repo. Two kinds — a PHASE kickoff for an autonomous build step (spec audit, stages, verifiers, stop rules; Steps 6–8 and later), and a WAVE handoff for a bounded work package executed by a fresh session (a docs refresh, an E2E pass, a release). Use at a phase or wave close, when pausing mid-phase (resume point), or when the user asks for a "next session prompt", "handoff prompt", "kickoff", or "prompt for the next step".
---

# Kickoff and handoff prompts

A fresh session reads only the prompt plus its reading list, so the prompt must be
self-contained. Pick the kind:

| Kind | Use for | Template | Output |
|---|---|---|---|
| **Phase** | an autonomous build step with stages, verifiers and a gate (Step 6, 7, 8, …) | [`template-phase.md`](template-phase.md) | overwrite `docs/plans/next-session-prompt.md` (the old version stays in git) |
| **Wave** | a bounded work package whose surfaced decisions return to the user: a docs/setup refresh, a live E2E pass, a README or release pass | [`template-wave.md`](template-wave.md) | prepend to `docs/plans/handoffs.md` (newest first) and show it in a fenced block |

Both end in an **as-built** written by the executing session: format in
[`asbuilt.md`](asbuilt.md).

## The wave loop

1. The closing session writes a wave prompt (this skill) and archives it.
2. A **fresh execution session** runs it and appends an as-built to the named record doc,
   ending with **Proposed decisions — for the user**. It does not settle them.
3. Whoever reviews the as-built (the next session, or the same session if the user is
   present) puts each proposed decision to the user as an option question with a
   recommendation. If the user leaves one unanswered, apply the recommendation as a default
   and flag it for veto. Record every ratified decision in `docs/decisions.md`.
4. Commit, then write the next prompt. Nothing a previous wave ratified reopens.

A wave that edits at scale or will not fit one context runs under the `long-run` contract
with step agents (see the template). A phase-sized wave done by one agent is a known
failure mode (exp3 W4a, 2026-10-17, reverted).

## Procedure

1. **Gather state** (read, don't re-derive): the design spec, the phase doc, `docs/decisions.md`
   (open decisions and recent entries), the last as-built or step reports, open user
   questions, environment facts re-checked and dated: Node and npm versions, Chrome version,
   OS, whether port 9234 is free, whether the loaded extension matches `dist/` (an
   `unknown method` error means it does not), the baseline commit and what passes
   (`npm test` count, `npm run typecheck`, `npm run build`).
2. **Write the prompt** from the template, sections in order. Plain language: name the
   phase or wave in words; cite decisions by date + title; gloss any unavoidable code.
3. **Paste, don't paraphrase,** the binding blocks: for a phase, the STEP BRIEF TEMPLATE +
   ESCALATION list (`step-agent` skill, extended with this phase's rules), the
   SPEC-DISCREPANCY PROTOCOL, the INTEGRITY FLOOR and the STOP RULES; for a wave, the
   standing constraints. Cite the `long-run` skill for roles and waiting.
4. **Carry lessons forward:** every failure mode hit in the closing phase or wave becomes a
   named LESSON in the briefs or scope items it affects. The `CLAUDE.md` runtime gotchas
   are the standing lesson list; a new one goes there too (via `session-closeout`).
5. **Resume point** (pausing mid-phase or mid-wave): add a top `RESUME POINT` block — what
   is done (with commits), the next stage, open user decisions, what is running (nothing,
   normally: say so), whether the loaded extension matches `dist/`.
6. **Check:** every path the prompt cites exists (`ls`); every decision it cites exists in
   `docs/decisions.md` under that date + title; the prompt says which docs are binding and
   which model every agent runs.
7. Commit with the closeout (`session-closeout` skill), or alone as
   `docs: <phase or wave> kickoff`.

---
name: phase-kickoff
description: Write the prompt that starts the next session of multi-session work in this repo. Two kinds — a PHASE kickoff for an autonomous build step (spec audit, stages, verifiers, gates; Step 11 and later), and a WAVE handoff for a bounded work package executed by a fresh session (a docs refresh, an E2E pass, a release). Use at a phase or wave close, when pausing mid-phase (resume point), or when the user asks for a "next session prompt", "handoff prompt", "kickoff", or "prompt for the next step".
---

# Kickoff and handoff prompts

A fresh session reads the prompt plus the files it points to. **The prompt points; it does not
paste.** Rules live in `docs/agent-rules.md`, the session agent's contract in the `long-run` skill,
the work and its pre-registered rules (exit checks, human gates, STOP rules, forbidden fixes) in the
phase doc, measured facts in the package `CLAUDE.md` files. A kickoff that restates any of them
creates a second copy that drifts. **Budget: about 1.5k words** for a phase kickoff.

| Kind | Use for | Template | Output |
|---|---|---|---|
| **Phase** | an autonomous build step with stages, verifiers and a gate | [`template-phase.md`](template-phase.md) | overwrite `docs/plans/next-session-prompt.md` (the old one stays in git) |
| **Wave** | a bounded work package whose surfaced decisions return to the user | [`template-wave.md`](template-wave.md) | prepend to `docs/plans/handoffs.md` (newest first) |

## The wave loop

1. The closing session writes a wave prompt (this skill).
2. A **fresh execution session** runs it and writes its as-built into the named record doc, ending
   with **Proposed decisions — for the user**. It does not settle them.
3. The reviewing session puts each proposed decision to the user as an option question with a
   recommendation; an unanswered one takes the recommendation as a default, flagged for veto.
   Ratified ones go to `docs/decisions.md`.
4. Commit, then write the next prompt. Nothing a previous wave ratified reopens.

A wave that edits at scale or will not fit one context runs under the `long-run` contract.

## Procedure

1. **Gather state** (read, don't re-derive): the phase doc, `docs/decisions.md` (Open decisions,
   standing decisions), the last as-built and step reports, open user questions.
2. **Make the phase doc carry the work:** stages with a **risk tier** each (`agent-rules.md` §7),
   exit checks, human gates, STOP rules and forbidden fixes. If one of these is missing, it goes
   into the phase doc, not the kickoff.
3. **Write the prompt** from the template. Plain language; cite decisions by date + title.
4. **New lessons** from the closing phase go where they bind: a measured runtime fact into the
   package `CLAUDE.md` it concerns (via `session-closeout`), a process rule into `agent-rules.md`,
   a phase-specific rule into the phase doc. The kickoff only points at them.
5. **Resume point** (pausing mid-phase): a top `RESUME POINT` block: what is done (commits), the
   next stage, open user decisions, what is running (normally nothing: say so), whether the loaded
   extension matches `dist/`.
6. **Check:** every path the prompt cites exists; every decision it cites exists under that date +
   title; `node scripts/doc-check.mjs` is clean for the prompt; the word count is within budget.
7. Commit with the closeout, or alone as `docs: <phase or wave> kickoff`.

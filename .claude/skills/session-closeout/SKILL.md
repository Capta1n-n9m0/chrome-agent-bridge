---
name: session-closeout
description: End-of-session bookkeeping for this repo — update (or create) the doc entry, record decisions in docs/decisions.md, update docs/progress-and-roadmap.md, refresh the dated Current state block in CLAUDE.md, put a new runtime gotcha into the right package CLAUDE.md, update memory, run the cleanup pass, and commit with an informative body. Use when finishing significant work, at a stage/phase/wave completion, after an execution session's as-built, or when the user says "wrap up", "close out", "document this", "write it up", "update the docs", or "commit this session".
---

# Session closeout

Record outcomes and decisions, not narration: `git log` holds the blow-by-blow, so the commit body
says what changed and why. Conventions: `docs/docs-writing-guide.md`.

## 1. Doc entry: update before you create

1. **The active phase doc** the session advanced: status line, measured numbers, the stage's
   **As built** block.
2. **Reference docs** whose truth changed: `docs/setup.md` (what the user must do, the tool list),
   `docs/e2e-test-plan.md` (rows for new `chrome.*` glue; run evidence), `README.md` (public summary).
3. **A new plan or spec** only for a new step or a distinct piece of work.

Every number cites its command or source file; reports and logs are linked, never pasted.

## 2. Decisions: `docs/decisions.md`

Add every decision the session settled, newest first, in the docs-guide format. Waiting ones go
under **Open decisions** with options and a recommendation. A decision that becomes a standing
rule gets a line under **Standing decisions**. Subagents never write this file; copy accepted
entries from their reports. When a phase closes, move its entries to the archive
(`docs/decisions-archive/`) and keep only the open and standing ones here.

## 3. `docs/progress-and-roadmap.md`

Header status line (date, test count, tool count, what is live); one short dated block per
milestone (extend an existing one if the milestone continues); flip the roadmap row.

## 4. `CLAUDE.md` files

- **Root Current state:** update when a stage or phase completes, the resume point moves, or the
  workstream changes. Overwrite it in place: no "Superseded" notes in any `CLAUDE.md`; the history
  is in `decisions.md` and git.
- **A runtime fact learned the hard way** becomes one bullet in the `CLAUDE.md` of the code an agent
  would edit to break it (#232; `recipes/` for live-run and Windows tooling facts), with a one-line
  pointer from every other package it binds, stated as measured, with the date. A rule that binds every package goes
  into the root's short invariant list. The story stays in the phase doc.
- Update Key files, Commands and counts where they changed. Keep each file within its budget
  (`scripts/doc-check.mjs` reports it).

## 5. Memory

The auto-memory directory is outside the repo. Add or update only for durable feedback or facts
the repo does not hold. Never status.

## 6. Cleanup pass

If the session changed docs, `CLAUDE.md` files or skills, run the **`cleanup-pass`** skill
(quick pass; a full pass at a phase close). It runs after §1–§5, so it checks the updated records.
At a phase close, `phase-kickoff` follows it, before the commit. If the phase stops at an unmet gate, the kickoff waits for the user's ruling (`long-run` §5).

## 7. Commit

Format and trailer: `docs/agent-rules.md` §10. The body states what changed, why, and the
decisions taken (date + title). Push only when the user asks.

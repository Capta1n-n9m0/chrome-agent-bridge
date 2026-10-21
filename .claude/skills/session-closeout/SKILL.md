---
name: session-closeout
description: End-of-session bookkeeping for this repo — update (or create) the doc entry, record decisions in docs/decisions.md, update docs/progress-and-roadmap.md, refresh the dated Current state block in CLAUDE.md, add any new runtime gotcha, update memory, and commit with an informative body. Use when finishing significant work, at a stage/phase/wave completion, after an execution session's as-built, or when the user says "wrap up", "close out", "document this", "write it up", "update the docs", or "commit this session".
---

# Session closeout

Record outcomes and decisions, not narration: `git log` holds the blow-by-blow, so the
commit body must say what changed and why. Conventions: `docs/docs-writing-guide.md`.

## 1. Doc entry — update before you create

Pick the target in this order:
1. **Active phase doc** the session advanced (`docs/plans/<date>-stepN-*.md`) and its
   as-built register (`…-asbuilt.md`): update in place — status line, measured numbers, a
   dated subsection only if prose is needed. Execution sessions of a wave append their
   as-built (`phase-kickoff` skill, `asbuilt.md`).
2. **Reference docs** the work changed the truth of: `docs/setup.md` (anything the user
   must do or configure, the tool list), `docs/e2e-test-plan.md` (rows for new `chrome.*`
   glue; evidence of runs), `README.md` (only the public one-screen summary).
3. **New plan or spec** (`docs/plans/YYYY-MM-DD-<kebab>.md`, `docs/specs/YYYY-MM-DD-<kebab>-design.md`)
   — only for a new step or a distinct piece of work, never "session N of the same work".

Always: Outcome summary on top; every number cites its command or source file; verifier
reports and logs go to the steps dir or an `*-evidence/` folder and are linked; changed
text is superseded in place with a dated note.

## 2. Decisions — `docs/decisions.md`

Add every decision the session settled (by the user, or by Claude under delegated
authority), newest first, in the docs-guide format:

```
### YYYY-MM-DD · <plain title> (#N)
**Decided:** … **Why:** … **Instead of:** … **Revisit if:** … **By:** user | Claude (ratified YYYY-MM-DD)
```

Plain language: short sentences, no undefined acronyms. Decisions still waiting for the
user go under **Open decisions** at the top, with options and a recommendation. Docs and
commit messages cite decisions by date + title, never by number alone. Subagents never
write this file — copy accepted entries from their reports.

## 3. `docs/progress-and-roadmap.md`

Update the header status line (date, test count, tool count, what is live). Add one short
dated block for a milestone at the top of its section, or extend the existing block if the
session continued a listed milestone. Flip the roadmap table row. Keep it a record of
outcomes, not a diary.

## 4. `CLAUDE.md` — Current state + gotchas

- Update the **Current state** block when a stage/phase/wave completes, the resume point
  moves, or the active workstream changes: active workstream, where it stands, the next
  action, the resume doc path. When a workstream finishes, reduce it to one line + pointer.
- A runtime fact learned the hard way (something Chrome, CDP, the MCP SDK, Windows or Node
  did that the code now works around) becomes **one bullet in "Runtime gotchas"**, stated
  as a measured fact with the date. The story stays in the phase doc.
- Update the Key files / Commands / test count lines if they changed. Never paste results
  tables, narratives or audit stories into `CLAUDE.md`.

## 5. Memory

This repo's memory is the auto-memory directory outside the repo (its index is `MEMORY.md`).
Update the existing project memory (status + resume pointer, ≤ ~300 words) rather than
adding one; add a new file only for a new durable fact or feedback not recorded in the
repo. Keep its one-line index entry in sync.

## 6. Commit

Exact file list (never `dist/`, never `bridge.token` or `.env`, never `git add -A`), message
`<type>(<scope>): <what>` (`feat`, `fix`, `docs`, `test`, `chore`; scope `server`,
`extension`, `shared`, `daemon`, `sdk`, `mcp` or none) with a body that states what changed,
why, and the decisions taken (date + title), plus the session's Co-Authored-By /
Claude-Session trailers. Never push unless the user asks. If a phase or wave closed or
paused, run the `phase-kickoff` skill first so the next prompt lands in the same commit.

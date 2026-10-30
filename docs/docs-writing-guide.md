# Docs Writing Guide

How we write and maintain docs in this repository. The goal is a small record that stays
current, not a pile that keeps growing. Ported 2026-10-21 from the user's research repos.

## Where things live (one source of truth for each)

| Place | Holds | Never holds |
|---|---|---|
| `CLAUDE.md` (root) | what the project is, the architecture map, a dated **Current state** block, commands, the invariants that bind every package, conventions, the skills and docs index | results tables, narratives, history, rationale, package gotchas |
| `<package>/CLAUDE.md` (`extension/`, `daemon/`, `sdk/`, `mcp/`, `shared/`, `recipes/`; `extension/src/{content,evaluate,handlers}/` for deeper extension files) | that package's Key files and the **Runtime gotchas** of its code: a gotcha lives with the code an agent would edit to break it, and the other packages it binds get a one-line pointer (decisions.md · 2026-10-25 · Gotchas follow the code they bind (#232)); `recipes/` holds the live-run and Windows tooling facts. Claude Code loads one the first time an agent opens a file in that folder (probed 2026-10-25) | another package's gotchas (a pointer only); history |
| `docs/agent-rules.md` | the standing rules for every subagent; briefs point to it | rules restated elsewhere |
| `docs/specs/<date>-*-design.md` | the design of record: what and why, the decided shape of a step | how it went, status |
| `docs/plans/<date>-stepN-*.md` | one phase doc per roadmap step: how, stages (with risk tier), exit checks, status line, measured results, and an **As built** block per stage; beside it `…-steps/` (journal, step and verifier reports, ledgers of waiting stages, evidence). Steps 6–10 kept a separate `…-asbuilt.md` | design rationale (link the spec) |
| `docs/plans/next-session-prompt.md` · `handoffs.md` | the next phase kickoff · the wave prompt archive | state (it lives in the docs they point to) |
| `docs/decisions.md` | Open decisions, Standing decisions (one line each), and the entries of the current step (format below) | the discussion that led to it (link it) |
| `docs/decisions-archive/` | the full entries of closed steps, numbers unchanged | — |
| `docs/cleanup/` | one report per cleanup pass (`cleanup-pass` skill) | fixes (they are in the docs) |
| `docs/progress-and-roadmap.md` | status header, one short block per milestone, the roadmap table | step-by-step narration |
| `docs/setup.md` · `docs/e2e-test-plan.md` · `README.md` | reference: install/usage + the tool list · the manual suite and its run evidence · the public one-screen summary | plans, decisions |
| Memory (auto-memory dir, outside the repo) | cross-session facts and feedback that are **not** in the repo | anything a doc or `git log` already records |
| `git log` | the blow-by-blow: what changed, when, why (so commit bodies must say why) | — |

Never duplicate across these places. Point to the source instead.

## Doc types

1. **Phase docs** (`docs/plans/`), living and updated in place. One per roadmap step,
   carrying its **Status** line and measured results. Every session that moves the work
   forward updates this doc rather than starting a new one.
2. **Design specs** (`docs/specs/`), the design of record. Changes go there first, as dated
   in-place amendments.
3. **Reference docs**, living material about how things are (`setup.md`, `e2e-test-plan.md`,
   this guide, `README.md`).
4. **Records**: as-built registers, steps dirs, the decisions archive, closed phase docs (the full
   list below). `decisions.md` and `progress-and-roadmap.md` are logs kept true: living.

**Records and living docs.** Living docs are kept true: the `CLAUDE.md` files, `docs/agent-rules.md`,
the skills, the guide, `setup.md`, `e2e-test-plan.md` (§1–§4), `README.md`, `recipes/README.md`,
`decisions.md`, the roadmap, open phase docs and the kickoff. Records are what happened and are not
rewritten: closed phase docs, steps dirs, as-built files, `docs/decisions-archive/`, `handoffs.md` (its old entries; new ones are added at the top),
`e2e-test-plan.md` §5 run records, `docs/cleanup/`. A record that misleads gets a dated note, never an edit.

## Rules

1. **Update before you create.** Look for the doc this work belongs to first: the active
   phase doc, then the reference doc whose truth changed, and only then a new plan or spec.
   The `session-closeout` skill follows this order.
2. **Keep it short.** About 1–1.5k words per plan section, and per agent report. Raw logs go
   to the steps dir or an evidence folder and are linked, never pasted in. Word budgets for
   `CLAUDE.md` files, skills, kickoffs and `decisions.md` are in `scripts/doc-check.mjs`.
3. **Every number cites its source**: the command that produced it (`npm test` → 301
   passed) or the file it came from.
4. **Summary on top.** A doc opens with Date, Status and 3–5 **Outcome** bullets. When the
   doc closes, rewrite the summary as the final word.
5. **Supersede, don't append.** Edit the text in place and leave a dated marker:
   `*Superseded 2026-10-21: was X, because Y.*` No growing "Update" sections at the end.
   **Exception:** files every agent loads (`CLAUDE.md` files, `docs/agent-rules.md`, skills) are
   overwritten in place with no marker; their history is in `decisions.md` and `git log`.
6. **Write plainly.** Short sentences. Spell out abbreviations on first use. No internal
   codes a reader would have to look up; if one is unavoidable (a stage ID like `S3`, an E2E
   row like `TRUST-4`), pair it with its title the first time it appears in a doc.
7. **Measured facts stay measured.** A gotcha in a `CLAUDE.md` file states what was observed, where,
   and when. Don't soften or generalise one without a new measurement.
8. **The repo is public.** No private hostnames, tokens, personal URLs or captured page
   content in docs, fixtures or evidence.
9. **No local path or user name in new docs.** Committed docs do not carry the local absolute path or the user's name:
   write `<repo>`, `~` or `<user>`. Files already committed and git history are left as they are; `LICENSE` keeps the
   name (decisions.md · 2026-10-29 · The user rules Step 12's gate; Step 12 closes (#374)). The clone command keeps
   the public GitHub URL, since it must work as pasted (decisions.md · 2026-10-30 · The user rules Step 14's gate;
   Step 14 closes (#442)).

## Decisions

One log, `docs/decisions.md`, newest first:

```markdown
### 2026-10-21 · Steps 6–8 run under the long-run contract (#1)
**Decided:** One or two plain sentences saying what we will do.
**Why:** The reason, in plain words.
**Instead of:** The option we turned down, and why.
**Revisit if:** What would make us reopen it.
**By:** user | Claude (ratified YYYY-MM-DD)
```

- **Cite a decision by date and title**, for example "decisions.md · 2026-10-21 · Steps 6–8
  run under the long-run contract". The `#N` number is optional and only helps sorting.
  A number alone is enough where the sentence states the decision; otherwise cite date + title.
- Subagents never write to `decisions.md`. Their reports carry **Proposed decisions** in
  this format, and the session agent records the ones the user (or the delegated rule)
  accepts.
- A decision waiting for the user is listed under **Open decisions** at the top of the
  file, with the options and a recommendation.
- A decision that still governs how we work or what the product promises is listed under
  **Standing decisions**: one line, its date + title, and where its full entry lives.
- When a step closes, its entries move to `docs/decisions-archive/` with their numbers unchanged;
  `decisions.md` keeps an index of which numbers live in which archive file.
- Decisions recorded inside the design specs and plans before 2026-10-21 stay where they
  are. When one matters again, restate it here as a dated entry and point back.

## `docs/progress-and-roadmap.md`

Header: date, branch, status (tests, tools, what is live, last E2E). Then one short dated
block per milestone, newest first within its section, each pointing at its phase doc. If a
session continues a milestone that is already listed, edit that block instead of adding a
new one. The detail is in the linked doc and in `git log`.

## Templates

### Phase doc header

```markdown
# Step N — <plain title>

**Date:** YYYY-MM-DD (range if several sessions) · **Status:** Planned | In progress | Paused | Complete
**Design of record:** docs/specs/<file>.md · **Steps dir:** <file>-steps/

## Outcome
- 3–5 bullets; every number with its source.

## Decisions
- One line each, cited by date + title; full entries live in decisions.md.

## Stages
### S1 — <plain name> (<budget>, risk: low | standard, <order/parallel>)
…

## Exit checks (pre-registered)
…

## As built
### S1 — <plain name> · YYYY-MM-DD · verifier: PASS | PASS-with-notes · commit <hash> · models <builder/verifier>
- **Contracts (binding forward):** interfaces and invariants later work relies on, each with the
  test or command that proves it.
- **Decisions:** date + title, one line each. **Deviations:** what, why.
- **Numbers:** test count before → after; estimate vs actual time.
- **Needs the user:** keyboard items, open decisions.
(At the phase close: the gate checklist, item → met? → evidence.)

## Open items
- What is left, who decides, what would trigger a revisit; what needs the user's keyboard.
```

### Debugging note (inside the phase doc or its steps dir)

```markdown
## Debug: <symptom in a few words>

**Date:** YYYY-MM-DD · **Status:** Fixed | Mitigated | Open

## Symptom      — exact error text or wrong behaviour, where, how often
## Root cause   — file:function, wrong value, why it happened
## Fix          — what changed (paths, commit) and how it was verified
## Guard        — the test/check/rule that stops it recurring, or "none" + why
## Dead ends    — one line each: hypothesis → what ruled it out
```

**Every fixed runtime defect also adds one bullet to the Runtime gotchas of the package's
`CLAUDE.md`** (the measured fact and the invariant to keep). The note holds the story.

## Style

- Present tense for what code does, past tense for what happened.
- Backticks for paths, flags, config keys, functions, message names.
- Tables for comparisons. State results; don't editorialize.

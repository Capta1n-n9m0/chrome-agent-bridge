# Docs Writing Guide

How we write and maintain docs in this repository. The goal is a small record that stays
current, not a pile that keeps growing. Ported 2026-10-21 from the user's research repos.

## Where things live (one source of truth for each)

| Place | Holds | Never holds |
|---|---|---|
| `CLAUDE.md` | what the project is, the architecture map, a dated **Current state** block, commands, the **Runtime gotchas** (measured facts), conventions, the skills index | results tables, narratives, history, rationale |
| `docs/specs/<date>-*-design.md` | the design of record: what and why, the decided shape of a step | how it went, status |
| `docs/plans/<date>-stepN-*.md` | one phase doc per roadmap step: how, stages, exit checks, status line, measured results; beside it `…-asbuilt.md` (contracts + deviations) and `…-steps/` (ledgers, briefs, reports, evidence) | design rationale (link the spec) |
| `docs/plans/next-session-prompt.md` · `handoffs.md` | the next phase kickoff · the wave prompt archive | state (it lives in the docs they point to) |
| `docs/decisions.md` | every decision, in plain language (format below) | the discussion that led to it (link it) |
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
4. **Records**: `decisions.md`, `progress-and-roadmap.md`, as-built registers, steps dirs.

## Rules

1. **Update before you create.** Look for the doc this work belongs to first: the active
   phase doc, then the reference doc whose truth changed, and only then a new plan or spec.
   The `session-closeout` skill follows this order.
2. **Keep it short.** About 1–1.5k words per plan section. Verifier reports, audits and
   logs go to the steps dir or an evidence folder next to the doc and are linked, never
   pasted in.
3. **Every number cites its source**: the command that produced it (`npm test` → 301
   passed) or the file it came from.
4. **Summary on top.** A doc opens with Date, Status and 3–5 **Outcome** bullets. When the
   doc closes, rewrite the summary as the final word.
5. **Supersede, don't append.** Edit the text in place and leave a dated marker:
   `*Superseded 2026-10-21: was X, because Y.*` No growing "Update" sections at the end.
6. **Write plainly.** Short sentences. Spell out abbreviations on first use. No internal
   codes a reader would have to look up; if one is unavoidable (a stage ID like `S3`, an E2E
   row like `TRUST-4`), pair it with its title the first time it appears in a doc.
7. **Measured facts stay measured.** A `CLAUDE.md` gotcha states what was observed, where,
   and when. Don't soften or generalise one without a new measurement.
8. **The repo is public.** No private hostnames, tokens, personal URLs or captured page
   content in docs, fixtures or evidence.

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
  Never cite a decision by number alone.
- Subagents never write to `decisions.md`. Their reports carry **Proposed decisions** in
  this format, and the session agent records the ones the user (or the delegated rule)
  accepts.
- A decision waiting for the user is listed under **Open decisions** at the top of the
  file, with the options and a recommendation.
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
**Design of record:** docs/specs/<file>.md · **As-built:** <file>-asbuilt.md · **Steps dir:** <file>-steps/

## Outcome
- 3–5 bullets; every number with its source.

## Decisions
- One line each, cited by date + title; full entries live in decisions.md.

## Stages
…

## Exit checks (pre-registered)
…

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

**Every fixed runtime defect also adds one bullet to `CLAUDE.md` "Runtime gotchas"** (the
measured fact and the invariant to keep). The note holds the story.

## Style

- Present tense for what code does, past tense for what happened.
- Backticks for paths, flags, config keys, functions, message names.
- Tables for comparisons. State results; don't editorialize.

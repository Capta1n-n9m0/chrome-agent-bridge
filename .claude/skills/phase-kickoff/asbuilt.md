# As-built records

Written by the session that did the work, so the next session (and the user) can audit
what actually happened. Decisions themselves live in `docs/decisions.md`; an as-built only
cites them by date + title.

## Phase — `docs/plans/<phase>-asbuilt.md`

(e.g. `docs/plans/2026-10-21-step6-asbuilt.md`, beside its phase doc.) Maintained only by
the session agent, one section per stage, appended at stage close and never rewritten
afterwards (corrections are dated notes). Each stage section:

```markdown
## Stage <k> — <plain name> · YYYY-MM-DD · verifier: PASS | PASS-with-notes · commit <hash>

### Contracts (binding forward)
- Interfaces, message types, invariants the next stage/phase relies on — each with the
  check that proves it (test name or command).

### Decisions taken
- decisions.md · YYYY-MM-DD · <title> — one line on what it changed here.

### Deviations from the phase doc
- What differs, why, where the phase doc now carries a dated note.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
(test count before → after; time; files touched; anything the plan budgeted)

### Needs the user's keyboard
- Extension reload, MCP reconnect, live E2E rows (by ID in docs/e2e-test-plan.md) that
  this stage could not run.

### Open decisions for the user
- Contract decisions taken by the conservative rule, waiting for review (also listed
  under Open decisions in decisions.md).
```

At phase end, append the gate checklist (item → met? → evidence) and the propagator's
correction ledger.

## Wave — appended to the workstream's record doc

(The prompt names the record doc; default `docs/plans/handoffs.md` gets the prompt and the
phase doc or `docs/progress-and-roadmap.md` gets the as-built.)

```markdown
## <Wave name> as-built — <plain title> (YYYY-MM-DD)

### What changed, by scope item
1. … (files, what, where it landed)

### Every behaviour or number that moved
| Item | Was | Now | Source |
|---|---|---|---|

### Builds and checks
- Exit checks (a)… with results; test counts, typecheck/build output tails, E2E rows run.

### Deliberately left for later
- Item → why → which later wave or decision owns it.

### Proposed decisions — for the user (surfaced, not decided)
### YYYY-MM-DD · <plain title>
**Options:** A … / B … **Recommendation:** … **Why:** … **Revisit if:** …
```

The reviewing session copies each ratified one into `decisions.md` (`By: user`, or
`By: Claude (ratified YYYY-MM-DD)` when the recommendation was accepted as a default) and
adds a one-line ratification note atop the surfaced list it answers.

---
name: step-agent
description: Templates for the stage level of a long autonomous run in this repo — the STEP BRIEF the session agent hands a step agent, the ledger, the step-report schema with Proposed decisions, the ESCALATION list, and the builder / verifier / fixer / propagator prompts (in role-prompts.md). Use when spawning a step agent or any builder/verifier/fixer/propagator, when acting as one, or when resuming one from its ledger.
---

# Step agent kit

Roles, waiting and revival rules: the **`long-run`** skill. Role prompts for level-2 agents
and the propagator: [`role-prompts.md`](role-prompts.md). Ledgers, reports, briefs and
evidence live in the phase's steps dir: `docs/plans/<phase>-steps/` (e.g.
`docs/plans/2026-10-21-step6-steps/`); the kickoff names it.

## STEP BRIEF TEMPLATE (session agent → step agent)

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of <PHASE> of the
chrome-agent-bridge repo (C:\Users\aliev\Projects\chrome-remote-extention; Git Bash shell;
checks: `npm run typecheck`, `npm test`, `npm run build`). Read CLAUDE.md first — its
"Runtime gotchas" are measured facts and bind.
Model: <as the kickoff states>; every agent you spawn: model "<same>".
GOAL: <one paragraph>.   INPUTS: <phase-doc stage texts verbatim; design-spec sections that
bind; as-built register so far; prior step reports; PIDs of anything running>.
EXIT CRITERIA: <checkable list; pass rules written down before anything is measured>.
WAITING: you hold long waits yourself — run the job in the background, end your turn, get
re-invoked by its completion; never a foreground sleep loop. A notice that a child is
"waiting on its own background work" is NOT completion: end your turn and wait for its
hand-back report. Your builders/verifiers/fixers finish in one go and never wait.
HOW YOU WORK: a builder does the work (role-prompts.md §Builder; failing test first for
pure logic). Then an INDEPENDENT verifier (never the builder; treats the builder report as
claims to audit; re-runs typecheck/test/build from a clean tree, re-derives counts, attacks
the spec as well as the code, checks the CLAUDE.md invariants, checks that new tests fail
without the change). FAIL → fixer → the verifier re-checks only the affected items. At most
2 fix rounds, then escalate. Level-2 agents must NOT spawn agents. Read their outputs and
the resulting files yourself before accepting.
LEDGER: keep <steps-dir>/<STAGE>.ledger.md current after every substep. If respawned,
resume from it.
AUTHORITY: decide mechanical and stage-local design questions. Put each one in your report
under "Proposed decisions" in the decisions.md format (below). Never edit decisions.md,
the as-built register or CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <ESCALATION list + phase additions>.
OUTPUT: <steps-dir>/<STAGE>.md per the report schema.
Commit your stage's code/docs via a builder: exact file list (never dist/, never
bridge.token or .env, never `git add -A`), message
"<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)" with a body that says
why, plus the session's Co-Authored-By / Claude-Session trailers; on git index.lock, wait
and retry. Never push.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — verbatim from the kickoff>  <INTEGRITY FLOOR — verbatim>
<LESSONS relevant to this stage>
```

Scopes for commit messages: `server`, `extension`, `shared`, `daemon`, `sdk`, `mcp`, `docs`,
`test`, or none for cross-cutting changes (`feat: …`), as in `git log`.

## Ledger (`<STAGE>.ledger.md`)

Append-only, one line per milestone: UTC timestamp · substep · state (started / done /
failed) · artifacts (commit hash for code; path + sha256 for evidence files) · PIDs + log
paths for anything running · watcher state · next substep. For a long job: launched (PID),
first health check, watcher started, exit observed, close checks. It is the recovery path
after outages and respawns. Timestamps come from `date -u`, never estimates.

## Step report schema (`<STAGE>.md`)

1. **Verdict** — DONE | DONE-PARTIAL | BLOCKED | ESCALATE
2. **Outputs** — commits, files, evidence paths + sha256; measured numbers (test counts,
   timings, sizes) with the command that produced them
3. **Verifier verdict** — PASS | PASS-with-notes | FAIL, path to the verifier's own file
4. **Deviations from the phase doc** — what, why
5. **Proposed decisions** — one block each:
   ```
   ### YYYY-MM-DD · <plain title>
   **Decided:** … **Why:** … **Instead of:** … **Revisit if:** … **By:** Claude (proposed)
   ```
   Contract decisions with no pre-stated rule are marked "for user review".
6. **Findings** — pre-registered FAILs reported, never re-tuned; new runtime gotchas worth a
   `CLAUDE.md` bullet, stated as measured facts
7. **Handoff** — PIDs, log paths, watcher state, what the next stage needs, what needs the
   user's keyboard (extension reload, MCP reconnect, live E2E)

## ESCALATION list (default; the kickoff may extend it)

A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a fact of the design of record;
- an effect outside its own stage (another package — `server/`, `extension/`, `shared/` —,
  a later stage, a shared script, the wire protocol);
- any integrity-floor item, or anything on the `long-run` §4 stop list;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (e.g. `unwrapResult`
  treating null OR undefined as failure, the content script as an IIFE, no top-level `await`
  in the service worker, `webRequest` listeners at the top level, never logging URLs);
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if"
  trigger being met;
- an unexplained port-9234 conflict or an orphan process it did not start;
- anything that needs the real Chrome profile (extension reload, live E2E) unless granted;
- a permission or classifier denial;
- 2 failed fix rounds;
- a check that cannot be made discriminating.

---
name: long-run
description: Operating contract for the session agent of an autonomous multi-agent run in this repo — a build step (Step 6 daemon, Step 7 multi-actor, Step 8 SDK, …), a soak or E2E campaign, or any job that spans hours or sessions. Covers context discipline, the agent tree (session agent → step agent → builder/verifier/fixer, plus the end-of-phase propagator), how decisions are taken while the user is away, the exhaustive list of reasons to stop, and waiting/revival rules. Use when acting as the orchestrator of a step or phase, launching anything long, or writing a kickoff for one.
---

# Long-run contract (session agent)

Ported 2026-10-21 from the user's research repos on `expr` (FakeDetectResearch
`.claude/skills/long-run`, merged there from exp3-cafrl's build procedure and FinetuneCV's
temporal Phases A/B). Formats for briefs, ledgers, reports and role prompts: the
**`step-agent`** skill. Kickoff prompts: **`phase-kickoff`**. Bookkeeping: **`session-closeout`**.
Writing rules: `docs/docs-writing-guide.md`.

**Vocabulary in this repo:** a *phase* is one roadmap step (`docs/plans/<date>-stepN-*.md` is
its *phase doc*); the *design of record* is `docs/specs/<date>-*-design.md`; a *stage* is one
unit of the phase, owned by one step agent.

**Precedence when documents disagree:** pre-registered rules (exit checks and pass rules
written before measurement, STOP rules) > the phase doc > this contract. Spec vs plan vs code
conflicts go through the SPEC-DISCREPANCY PROTOCOL of the kickoff.

**Model:** every agent at every level runs the model the kickoff names, stated once there
and repeated in every brief.

## 1. Context discipline

Your context must survive a run that may fail and need fixes. So:
- **You only:** read the phase doc and step reports, write markdown (run journal, as-built
  register, `docs/decisions.md`, status lines, memory), and run bounded read-only checks
  (`git status`, `git log --oneline -5`, `ls`, `tail -n 30`, a port check on 9234, a process
  listing for stray `node` instances).
- **You never:** write feature code, run or kill the server/daemon, run the test suite in
  your own context, read diffs line by line, or pull build/test logs into context. Delegate
  all of it; read summaries.
- **One exception:** if a stage still fails after the fix rounds (§2), you may investigate
  and fix it yourself. That is itself recorded as a decision, with the root cause.
- Stay lean regardless of whether auto-compact is on: a compaction mid-phase loses the
  thread of decisions that only you hold.

## 2. Agent tree

| Level | Who | Does | Never |
|---|---|---|---|
| 0 | **Session agent** (you) | spot-checks the Stage-0 spec audit; splits the phase into 2–6 stages and writes that split to the run journal before stage 1; one step agent per stage; accepts or re-dispatches; records decisions; keeps the as-built register; gate checklist; final report | spawns builders/verifiers/fixers directly in a three-level run |
| 1 | **Step agent** | owns one stage end to end, including any long wait: builder → independent verifier → fixer, **at most 2 fix rounds** (the verifier re-checks only the affected items); ledger; step report; commits its files | phase-level decisions (it proposes them) |
| 1 | **Propagator** (end of phase only) | compares the as-built register with the phase doc; finds assumptions in the plan, in later step plans, in `CLAUDE.md` and `docs/setup.md` that the as-built broke; writes dated correction notes in place; returns a correction ledger | edits code |
| 2 | **Builder / verifier / fixer** | one scoped task, finishes in one go | spawns agents; holds long waits |

- **Two-level form:** when the whole phase fits one session comfortably and no stage holds a
  long wait, the session agent may run builder → verifier → fixer itself, one fresh agent
  each. Everything else holds. **Three-level form** for a phase that spans a day or more
  (Steps 6–8 each do) or has any stage that waits. The kickoff says which.
- Stages run **sequentially**. Concurrent step agents only on file-disjoint lanes (e.g.
  `server/` vs `extension/`) that share no port and no running process, and the kickoff
  must say so. Only one thing may own port 9234 at a time.
- Every agent is fresh and shares no context: every prompt is self-contained.
- Agent transcripts are ephemeral. Anything worth keeping lands in a report, the run
  journal or the as-built register **during the stage**.

## 3. Decisions while the user is away

Everything is decided and written down; nothing is silently parked. Subagents put
**Proposed decisions** in their reports (format in `step-agent`); only you write
`docs/decisions.md` (format: `docs/docs-writing-guide.md` § Decisions).
- **Build decisions** (module layout, internal API shapes, defaults the plan left open,
  plain plan defects, test structure): you decide, record with `By: Claude`, continue. If
  both options stay reachable through a flag or an option, decide and move on.
- **Contract decisions** (the wire protocol and its version, the SDK's public surface, MCP
  tool names and schemas, error codes, anything the design spec marks as decided, the
  security boundary, compatibility promises such as "one session at a time"):
  - a pre-stated rule in the spec or plan covers it → apply the rule mechanically;
  - no rule covers it → choose the option that (a) keeps the security boundary at least as
    strict, (b) keeps every existing tool and test behaving identically, (c) can be undone.
    Record it and list it under **Open decisions** in `decisions.md` and in the as-built
    register, so the user reviews it at the gate. It does not block the run.
- Evidence before opinion: our own docs, tests and code first (`CLAUDE.md` runtime gotchas
  are measured facts, not opinions), then at most one targeted web search if an external
  fact (Chrome/CDP/MCP SDK behaviour) decides it. Record the source.
- Never resolve a decision in the direction that flatters a result already seen.
- Pass rules are written down before the measurement runs. Failures are reported, never
  re-tuned. Forbidden fix: weakening a protective check (a test, a guard, a timeout, the
  token gate) to make it pass.

## 4. When to stop and wait for the user (exhaustive)

1. A pre-registered STOP or anomaly rule fires that says "escalate".
2. A human gate written into the phase doc is reached (prepare the decision package, stop).
   **Standing human gates in this repo:** loading or reloading the extension in the real
   Chrome profile and reconnecting the MCP (`npm run build` → `chrome://extensions` ↻ →
   `/mcp`), and any live E2E pass that drives the user's real logged-in profile, unless the
   kickoff grants it explicitly.
3. An action would be destructive or irreversible outside the run's own outputs: pushing,
   tagging, publishing (npm, a GitHub release), rewriting git history, deleting files outside
   the repo, touching the user's Chrome profile data (cookies, logins, the human's tabs),
   committing or logging the token.
4. Any loosening of the security boundary: the `127.0.0.1` bind, the token gate, "never log
   URLs, header values or bodies from the service worker". Always the user's call.
5. Permission or classifier denials no agent can fix. Agents cannot edit permission
   settings; the user applies allow-lists.

Anything else, including a surprising result that trips no rule, is recorded and the run
continues. A phase doc may add a start-of-phase input check; mid-phase this list holds.

## 5. Waiting rules

Long waits are rare here (a soak test, a daemon idle-exit check, a multi-minute suite), but
the rules hold whenever one exists:
- **The step agent holds the wait.** Run the job with the Bash tool's `run_in_background`
  (it re-invokes the agent on exit), or start a background shell watcher that polls the PID
  or a `.done` marker at most every 120 s, is silent until exit, and exits on completion or
  a fatal marker. Then **end the turn**. Never a foreground sleep loop.
- **Builders, verifiers and fixers never wait.**
- **"Waiting on its own background work" is NOT completion.** An agent receiving that
  notice about a child ends its turn and waits for the real hand-back. Put this sentence
  in every brief at every level.
- If a step agent is silent past (expected job time + 1 h), read its ledger.

## 6. Revival

If a step agent hands back without a verdict, or its child's report lands at you:
1. `SendMessage` the step agent (attach the stray report). First choice.
2. Otherwise spawn a fresh step agent: "resume from your ledger `<steps-dir>/<stage>.ledger.md`".
   Never redo completed substeps.

## 7. End of phase

Gate checklist item by item (an unmet item means the phase is not closed) → propagator →
`session-closeout` skill (docs, roadmap, Current state, memory, commit) → `phase-kickoff`
skill for the next kickoff. Final report leads with **decisions taken while the user was
away** (cited by date + title), then the gate measurements (test counts, E2E rows, timings
with their source), then open decisions, then what needs the user's keyboard (extension
reload, live E2E, push).

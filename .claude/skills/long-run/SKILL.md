---
name: long-run
description: Operating contract for the session agent of an autonomous multi-agent run in this repo — a build step (Step 11 file upload, …), a live E2E campaign, or any job that spans hours or sessions. Covers context discipline, the agent tree (session agent → step agent → builder/verifier/fixer), how decisions are taken while the user is away, revival, and the end of a phase. Use when acting as the orchestrator of a step or phase, launching anything long, or writing a kickoff for one.
---

# Long-run contract (session agent)

The rules every agent follows (integrity floor, stop list, spec discrepancies, roles, models,
waiting, report, commits) are in **`docs/agent-rules.md`**, and they bind you too. This skill adds
only what the session agent does. Briefs: the **`step-agent`** skill. Kickoffs: **`phase-kickoff`**.
Bookkeeping: **`session-closeout`**. Docs at a phase close: **`cleanup-pass`**.

**Vocabulary:** a *phase* is one roadmap step (`docs/plans/<date>-stepN-*.md`, its *phase doc*);
the *design of record* is `docs/specs/<date>-*-design.md`; a *stage* is one unit of the phase,
owned by one step agent.

**Precedence:** `docs/agent-rules.md` §4.

## 1. Context discipline

- **You only:** read the phase doc and step reports, write markdown (journal, phase doc,
  `docs/decisions.md`, `CLAUDE.md` Current state), and run bounded read-only checks (`git status`,
  `git log --oneline -5`, `ls`, `tail -n 30`, a port check on 9234, a process listing).
- **You never:** write feature code, run or kill the daemon, run the test suite, read diffs line by
  line, or pull logs into context. Delegate; read summaries.
- **One exception:** a stage that still fails after its fix rounds; you may investigate it
  yourself, recorded as a decision with the root cause.

## 2. Agent tree

| Level | Who | Does |
|---|---|---|
| 0 | **Session agent** (you) | Stage 0 audit first; writes the stage split (stages sized by `agent-rules.md` §7, risk tier each) to the journal before stage 1; one step agent per stage; accepts or re-dispatches; records decisions; writes each stage's as-built into the phase doc; gate checklist; final report |
| 1 | **Step agent** | owns one stage end to end (`agent-rules.md` §6); proposes decisions, never records them |
| 2 | **Builder / verifier / fixer / live runner** | one scoped task, done in one go |

- Three levels by default: it keeps each agent's context small. Stages run sequentially;
  concurrent step agents only on file-disjoint lanes that share no port and no process, as the
  kickoff says. A live stage runs alone. Only one thing owns port 9234 at a time.
- Every agent is fresh and shares no context. Anything worth keeping lands in a report, the
  journal or the phase doc **during the stage**.
- **Briefs stay small** (`step-agent` skill): they point to files and never paste rules, spec or
  plan text, or numbers. Over ~1k words means something was pasted.

## 3. Decisions while the user is away

Everything is decided and written down; nothing is silently parked. Subagents propose
(`agent-rules.md` §5); only you write `docs/decisions.md`.
- **Build decisions** (module layout, internal shapes, defaults the plan left open, plain plan
  defects, test structure): decide, record `By: Claude`, continue.
- **Contract decisions** (`agent-rules.md` §4): a pre-stated rule applies mechanically; otherwise
  take the conservative option, record it, and list it under **Open decisions** for the gate. It
  does not block the run.
- Stop only on the `agent-rules.md` §3 list.

## 4. Revival

Fresh agents, never resumed ones (#225, `agent-rules.md` §8). If a step agent hands back without a
verdict, spawn a new one: "resume from `<steps-dir>/<stage>.ledger.md` (or the partial report)".
Never redo completed substeps.

## 5. End of phase

1. The gate checklist, item by item, in the phase doc's § As built. An unmet item means the phase
   is not closed.
2. The **`session-closeout`** skill. Its order is the one order: records and Current state, then a
   **full** `cleanup-pass` (it also checks what later plans, `docs/setup.md` and the `CLAUDE.md` files
   assumed that the as-built broke), then **`phase-kickoff`** for the next step, then the commit.
3. Final report: **decisions taken while the user was away** (date + title), then the gate
   measurements with their sources, then open decisions, then what needs the user's keyboard
   (extension reload, live E2E, push).

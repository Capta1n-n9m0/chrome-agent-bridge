---
name: step-agent
description: Brief templates for the stage level of a long autonomous run in this repo — the STEP BRIEF the session agent hands a step agent, the leaf brief a step agent hands a builder, verifier, fixer or live runner, and the ledger format. Use when spawning a step agent or any builder/verifier/fixer/runner, when acting as one, or when resuming one from its ledger.
---

# Step agent kit

Roles, report format, models, waiting and commits: **`docs/agent-rules.md`**. The session agent's
side: the **`long-run`** skill. Ledgers, reports and evidence live in the phase's steps dir
`docs/plans/<phase>-steps/`; the kickoff names it.

## Brief rules

A brief points; it does not paste.
- **Must not contain:** rules from `agent-rules.md`, phase-doc or spec text, numbers copied from a
  record (write "numbers only from `<file>`"), lessons (point to the package `CLAUDE.md` or the
  phase doc section that holds them).
- **Over ~1k words is a warning sign:** something was pasted.
- **Verifiers get the same READ list as the builder**, plus the builder's report labelled "claims
  to audit". They read the phase doc and spec themselves.
- Briefs are not saved as files. The report names the brief's READ list.
- Pass `model` on every `Agent` call (`agent-rules.md` §7), and `effort: "high"` for Sonnet.

## STEP BRIEF (session agent → step agent)

```
You are the STEP AGENT for stage <STAGE> ("<plain name>") of Step <N> (<plain title>) of the
chrome-agent-bridge repo. Read docs/agent-rules.md first; it applies in full except the
deviations below. Your role: §6 Step agent.
RISK: low | standard → models per agent-rules.md §7.
GOAL: <one paragraph: what, and why it matters>.
READ: <phase doc § stage, with its exit-check IDs>, <spec §§ that bind>, <as-built sections of
earlier stages it builds on>, <prior step reports>. DO NOT READ: <run records, raw logs>.
EXIT CRITERIA: the phase doc's exit checks <IDs>; <any stage-specific addition>.
LANE: <files/packages it may change>. Anything outside escalates.
DEVIATIONS from agent-rules.md: <only the differences, or "none">.
RUNNING NOW: <PIDs, or "nothing">.
OUTPUT: <steps-dir>/<STAGE>.md. Commit via the builder, message per agent-rules.md §10, trailer:
<trailer>.
```

## LEAF BRIEF (step agent → builder / verifier / fixer / runner)

```
ROLE: builder | verifier | fixer | live runner — stage <STAGE> of Step <N>, chrome-agent-bridge.
Read docs/agent-rules.md first (your role: §6 <role>); it applies in full except the deviations.
GOAL: <one paragraph>.
READ: <same list as the step brief, narrowed to the task>. <Verifier: + "claims to audit:
<builder report path>". Fixer: + "findings: <verifier report path> items <n>">.
EXIT CRITERIA: <exit-check IDs from the phase doc>.
LANE: <files>.
DEVIATIONS: <or "none">.
OUTPUT: <steps-dir>/<STAGE>-<role>[n].md. Commit: yes (trailer: …) | no.
```

## Ledger (`<STAGE>.ledger.md`): stages that hold a wait only

Append-only, one line per milestone: UTC time (`date -u`) · substep · state (started / done /
failed) · artifacts (commit hash; evidence path) · PIDs and log paths · watcher state · next
substep. It is the recovery path after outages and respawns.

## What a stage leaves in the steps dir

`<STAGE>.md` (step report), `<STAGE>-verifier.md` (and `-verifier2.md` after a fix round),
fixer reports only if a fix round ran, a ledger only for a waiting stage, and evidence the
phase doc asks for (run records, logs as `.txt`). Nothing else: no brief copies, no raw dumps
pasted into reports.

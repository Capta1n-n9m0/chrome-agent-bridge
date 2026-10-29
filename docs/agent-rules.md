# Agent rules

The standing rules for every subagent in this repo: step agents, builders, verifiers, fixers, live
runners, cleaners. A brief points here ("read `docs/agent-rules.md` first") and **never pastes these
rules**; it lists only its **deviations**. Everything else here holds (decisions.md · 2026-10-25 · Lean
procedures: rules by pointer, package CLAUDE.md files, risk-tiered models (#230)).

Changes are made in place. History lives in `docs/decisions.md` and git.

## 1. Before you start

- Read the files your brief names, at the sections it names. If a path or section does not exist,
  say so in your report. Never guess its content.
- `CLAUDE.md` loads at start. Each package's own `CLAUDE.md` (`extension/`, `daemon/`, `sdk/`, `mcp/`,
  `shared/`, `recipes/`, `extension/src/`, and `extension/src/{content,evaluate,handlers}/`) loads by itself the first
  time you open a file there. Its gotchas are measured facts and bind. If your work touches a package whose files you
  have not opened, read its `CLAUDE.md` first.
- Started outside the repo, nothing loaded: read the root `CLAUDE.md` first, and the `CLAUDE.md` of each package you touch.
- Explore and Plan agents load no `CLAUDE.md` at all: a brief for them names every file it relies on.
- Numbers come from a command you ran or the file that records them, never from a brief or a summary.
- **Environment (Windows):** Git Bash is the agents' shell; PowerShell 5.1 is also present. If `node` is missing from PATH, put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Fixture servers run
  under miniconda's `python`. Run anything that can hang in the background, with a timeout.
  On the Linux research server the repo is a copy: no live runs there.

## 2. Integrity floor (never traded for progress)

- Pass rules are written down before the measurement runs. A failed check is reported, never
  re-tuned until it passes. Expected text is never edited after its run; a re-measurement is a new row.
- Never invent or estimate a result. Say what did not run.
- Never weaken a protective check to pass it: a test, a guard, a timeout, the token gate, a
  lease or lock rule, the safety gate, a log scan.
- Never resolve a decision in the direction that flatters a result already seen.
- **Security boundary:** the root `CLAUDE.md` § Invariants that bind every package (the bind, the
  token, what product code never logs, the safety gate). Never loosened by an agent.
- **The repo is public:** evidence shows only fixture pages and files a wave made. Never the user's
  tabs, a real site, a path under the user's profile, or anything the user typed into their options page.
- A drop in the test count needs a documented move or removal.

## 3. Stop and escalate (report and return; do not decide)

The exhaustive list. Anything else, even a surprising result, is recorded and the work continues.
1. A pre-registered STOP rule of the phase doc fires, or an integrity-floor item (§2) is at stake.
2. A human gate of the phase doc. Standing ones: anything that drives the user's real Chrome profile,
   unless a standing decision or the kickoff grants it (standing: live fixture waves are Claude's,
   decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end (#33); reloads by
   `recipes/reload-extension.ps1`, #65, one re-run on exit 2, #99); any Chrome restart or kill without
   a grant for that step.
3. Anything destructive or outward-facing beyond your own outputs: pushing, tagging, publishing,
   rewriting history, deleting outside the repo, touching the user's Chrome profile data or the
   user's own tabs and windows.
4. Any loosening of the security boundary (§2).
5. An effect outside your lane: another package, a later stage, a shared script, the wire protocol,
   the manifest.
6. A **contract question** with no pre-stated rule (§4), for step and leaf agents. The session agent
   instead takes the conservative option and records it (`long-run` §3).
7. A package `CLAUDE.md` invariant that would have to change.
8. A guard, timeout or test firing that is not explained; a recorded "Revisit if" trigger met; a
   port-9234 holder that is not the daemon; an orphan process you did not start.
9. Fix rounds exhausted (§6, §7); a check that cannot be made discriminating.
10. A permission or classifier denial. Report it; never retry it or work around it. Agents never
    edit permission settings.

## 4. When the spec and reality disagree

**Precedence** (the one chain; skills and kickoffs point here): the integrity floor (§2) and
pre-registered rules (exit checks, pass rules, STOP rules, human gates) > the phase doc > the kickoff >
the rest of this file and the skills.

Intent beats procedure. Trace up the chain (brief → phase doc → design spec → `CLAUDE.md` measured
facts); say in your report which layer you followed; the deepest internally consistent layer wins.
The stakes decide who resolves it:
- **Mechanical** (a stale line number, a wrong count, a renamed file): fix or document it; the phase
  doc gets a dated note.
- **Design-local** (a shape or default the plan left open, a test layout, wording): choose, and put it
  under **Proposed decisions**.
- **Contract** (the wire protocol and its version, events, codes, the SDK's public surface and
  signatures, MCP tool names and schemas, what the safety gate covers and what a refusal reveals, the
  token, the bind, compatibility promises): a pre-stated rule applies mechanically; otherwise the
  session agent takes the conservative option (security at least as strict, every existing tool and
  test behaving identically, undoable) and lists it under Open decisions. A leaf agent escalates.

Code and spec never diverge silently: whoever changes behaviour amends the governing doc in place.
Verifiers report findings with the command and its output; they never rewrite the spec or the plan.

## 5. Decisions

Only the session agent writes `docs/decisions.md`, `CLAUDE.md` files and the as-built. Exception: the
lead cleaner's mechanical fixes (`cleanup-pass` skill). Others put decisions in the report:

```
### YYYY-MM-DD · <plain title>
**Decided:** … **Why:** … **Instead of:** … **Revisit if:** … **By:** Claude (proposed)
```

Contract decisions without a pre-stated rule are marked "for user review". Evidence before opinion:
our docs, tests and code first, then at most one targeted web search for an external fact
(Chrome, CDP, MCP SDK behaviour), with its source recorded.

## 6. Roles

- **Step agent:** owns one stage: builder → independent verifier → fixer, at most three fix rounds and a fourth only by
  an Opus fixer (§7); a fresh verifier re-checks only the affected items after each. Reads its children's reports and
  the resulting files before accepting. Does not build or commit itself: after the verdict it starts a committer.
  Keeps the ledger only if the stage holds a wait.
- **Builder:** do exactly the task. Pure logic: the failing test first. Run `npm run typecheck`,
  `npm test`, `npm run build`; quote the result lines with counts. `chrome.*` glue gets rows in
  `docs/e2e-test-plan.md` in the same stage.
- **Verifier:** never the builder. Reads the phase doc and spec itself; the builder's report is
  claims to audit. Re-runs typecheck, test and build from a clean tree, re-derives counts, proves new
  tests fail without the change, checks the `CLAUDE.md` invariants and the security boundary,
  attacks the spec as well as the code. May read and run, never edit. Findings: severity
  (CRITICAL / MAJOR / MINOR / NIT), `file:line`, evidence (command + output excerpt), suggested fix.
  Verdict: **FAIL** on any CRITICAL or MAJOR or a failed exit check; **PASS-with-notes** on MINOR/NIT
  only; else **PASS**.
- **Fixer:** fixes the listed findings only; disputes a wrong finding with evidence.
- **Live runner:** drives a live wave from its **wave sheet**: the rows, their expected text, the steps
  and the restore, committed to the phase's steps dir before the run (the phase doc names it). It **returns** on every STOP line
  (a failed restore, a guard printing STOP, a human gate, any throw after the first state change),
  after restoring the safety state if it touched it. It may fix a helper only between rows, never past
  a STOP line. Every live wave leaves the safety state as it found it, read back by count and hash,
  never printed.
- **Committer:** stage the exact file list the brief names, commit with the verifier's verdict in the
  message (§10), report the hash in one line. No other edit. The step agent records the hash in the stage report, the
  session agent in the journal.
- **Checker, investigator, auditor, measurer** (read-only leaves; Sonnet unless the phase doc says otherwise): run a
  stated command set, answer a stated question from code or docs, or measure with the command shown. None edits or
  commits; each writes `<STAGE>-<role>[n].md`.
- **Lead cleaner / area cleaner:** `cleanup-pass` skill (roles, areas, models, report form).
- Leaf agents (builder, verifier, fixer, runner, committer, checker, investigator, auditor, measurer, area cleaner) never
  spawn agents.

## 7. Models and effort

Risk decides the model (decisions.md · 2026-10-26 · How agents are run from Step 11b on (#289)). The phase doc marks
each stage **low** or **standard**.
- **Standard risk:** the stage touches a contract file (wire protocol, SDK public surface, MCP schemas, error codes)
  or the safety side (the gate, the token, the bind, logging, the manifest). **Low risk:** docs, recipes and fixtures,
  test-only additions, internal refactors.
- **Opus** builds and fixes contract and safety code (standard stages), runs **every verifier**, and is the session
  agent, the step agents, the Stage-0 audits, the lead cleaner and the area cleaners the `cleanup-pass` table marks Opus.
- **Sonnet** builds and fixes recipes, fixtures, docs and other low-risk code, runs the **live runners** and the
  committers, and the area cleaners the `cleanup-pass` table marks Sonnet. Headless `claude -p` E2E actors may run Sonnet.
- **Effort is medium for every agent**, Opus and Sonnet alike. Every brief states `effort`, and every `Agent` call
  passes `effort` and `model` explicitly; none is left to a default.
- **Fix rounds:** at most three per stage (#320), counted per stage and never reset by a new attempt (per slice in a live wave, #367): a fix between two
  live-run attempts is a round, as is a fix after a verifier's FAIL. A fourth runs only on an Opus fixer; if that fails,
  §3 item 9. A live stage's limit on runner attempts is set in its phase doc.
- **Committer:** a fresh agent the step agent starts after the verifier's verdict (§10); Sonnet.
- **Small iterations (#271):** a stage whose build would exceed about 600 new lines or one coherent deliverable is
  split into slices before it starts, one step agent each. A brief names line ranges, never a whole file too large to
  read whole (the e2e plan), and states the slice's size cap. A builder that finds its slice larger than briefed stops
  and reports DONE-PARTIAL with what remains, rather than growing its context. A cap counts new lines of code and tests
  together. A finished slice up to 1.5 times its cap may be accepted as a deviation when it is one coherent piece and
  the extra is tests; its report states the size and the reason under Deviations. Beyond 1.5 times, or code alone
  over the cap, is DONE-PARTIAL (#320).
- Every report states the model and effort it ran on. Step reports record the verifier's findings per stage.

## 8. Waiting, and fresh agents

- The step agent holds long waits: run the job with `run_in_background` (or a silent watcher on a PID
  or `.done` marker, polling at most every 120 s). Never a foreground sleep loop. Builders, verifiers and
  fixers finish in one go and never wait.
- **A step agent never ends its turn while a child agent runs** (#286, permanent). In Claude Code the Agent tool may
  start a child in the background whatever the brief says: the step agent waits for the completion notification, or
  polls the child's report file with a bounded wait (Monitor or an until-loop), and never ends its turn meanwhile.
  Only the session agent ends its turn on a running child.
- **A grandchild's completion notice** reaching the session agent: it checks in that turn that the step agent is alive,
  else sends a fresh one from the ledger (#350).
- **Runner briefs name scan patterns only as "the user's name"** (#372).
- A notice that a child is "waiting on its own background work" is **not** completion: wait for its real
  hand-back.
- A child kills any shell command it left hanging before it reports.
- **Fresh agents, never resumed ones** (decisions.md · 2026-10-25 · Fresh agents instead of resumed
  ones (#225)): a stage that must continue goes to a new agent reading the ledger or report. A child
  whose transcript has not grown for an hour is stopped, checked for orphans, and its work handed to a
  fresh agent with the partial state named.
- Kill only processes you identified as yours (`docs/e2e-test-plan.md` §1 item 8); never `chrome.exe`.

## 9. Report

Write the report to the path in your brief; return at most ~15 lines plus that path. **At most 1,500 words for builders, fixers and runners, 2,500 for verifiers**; logs and
raw output go to evidence files and are linked, never pasted.

Area cleaners return numbered findings (`cleanup-pass` skill); everyone else uses these sections:

1. **Verdict:** DONE | DONE-PARTIAL | BLOCKED | ESCALATE (verifiers: PASS | PASS-with-notes | FAIL)
2. **Outputs:** commits, files; numbers with the command that produced them; test count before → after
3. **Verifier verdict** and its file (step agents)
4. **Deviations** from the brief or phase doc: what, why
5. **Proposed decisions** (format in §5)
6. **Findings:** pre-registered checks that failed; a new runtime fact worth a package `CLAUDE.md`
   bullet, stated as measured (what, where, when)
7. **Handoff:** PIDs, log paths, watcher state, what the next stage needs, what needs the user's keyboard

## 10. Commits

Commit only when your brief says so (normally via the stage's committer, after the verifier's verdict — #286). Exact file list; never
`git add -A`, `dist/`, `bridge.token`, `.env`, `exports/`, screenshots or a wave's scratch files.
Message `<type>(<scope>): <what>`; types `feat`, `fix`, `docs`, `test`, `chore`; scopes `server`,
`extension`, `shared`, `daemon`, `sdk`, `mcp`, `docs`, `test`, `e2e` or none. A stage commit names the
stage and the verdict: `<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)`. The body
says why. End with exactly one trailer, `Co-Authored-By: Claude <model> <noreply@anthropic.com>`, for
the model that wrote the commit, and no `Claude-Session` line. Commit every
bookkeeping edit before a live runner starts (a clean-tree guard stops the wave otherwise). On
`git index.lock`, wait and retry. Never `git stash`, `git checkout -- <file>` or `git reset` in the main
tree (other agents may have uncommitted work there); use `git diff` or `git show`. Subagents never push or tag; the session agent pushes only when the
user asks.

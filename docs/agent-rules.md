# Agent rules

The standing rules for every subagent in this repo: step agents, builders, verifiers, fixers, live
runners, cleaners. A brief points here ("read `docs/agent-rules.md` first") and **never pastes these
rules**; it lists only its **deviations**. Everything else here holds. Created 2026-10-25 from the
`long-run`/`step-agent` skills, `role-prompts.md` and the Step 10/11 kickoffs' common blocks, which
this file replaces (decisions.md · 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md
files, risk-tiered models (#230)).

Changes are made in place. The history lives in `docs/decisions.md` and git; there is no per-phase copy.

## 1. Before you start

- Read the files your brief names, at the sections it names. If a path or section does not exist,
  say so in your report. Never guess its content.
- `CLAUDE.md` loads at start. Each package's own `CLAUDE.md` (`extension/`, `daemon/`, `sdk/`, `mcp/`,
  `shared/`, `recipes/`, and `extension/src/{content,evaluate,handlers}/`) loads by itself the first time you open a file in that package. Its gotchas
  are measured facts and bind. If your work touches a package whose files you have not opened, read
  its `CLAUDE.md` before deciding anything about it.
- Numbers come from their source: a command you ran or the file that records them. Never from a
  brief or a summary.
- **Environment (Windows, the development machine):** Git Bash is the agents' shell; Windows
  PowerShell 5.1 is also present. If `node` is missing from PATH, put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Fixture servers run
  under miniconda's `python`. Run anything that can hang in the background with a timeout.
  On the Linux research server the repo is a copy for docs and host tests only: no live runs there.

## 2. Integrity floor (never traded for progress)

- Pass rules are written down before the measurement runs. A failed check is reported, never
  re-tuned until it passes. Expected text is never edited after its run; a re-measurement is a new row.
- Never invent or estimate a result. If something did not run, say so.
- Never weaken a protective check to make it pass: a test, a guard, a timeout, the token gate, a
  lease or lock rule, the safety gate, a log scan.
- Never resolve a decision in the direction that flatters a result already seen.
- **Security boundary:** bind only `127.0.0.1`; the token is never committed, printed or logged;
  never log a URL, title, header value, body, path, locator text, evaluated value or block-list pattern
  from product code; every router method passes the safety gate; nothing on the wire changes the
  safety state.
- **The repo is public:** evidence shows only fixture pages and files a wave made. Never the user's
  tabs, a real site, a path under the user's profile, or anything the user typed into their options page.
- A drop in the test count needs a documented move or removal.

## 3. Stop and escalate (report and return; do not decide)

The exhaustive list. Anything else, including a surprising result that trips none of these, is
recorded and the work continues.
1. A pre-registered STOP rule of the phase doc fires, or an integrity-floor item (§2) is at stake.
2. A human gate of the phase doc. Standing ones: anything that drives the user's real Chrome profile
   (extension reload, live E2E) unless the kickoff grants it; any Chrome restart or kill without a grant.
3. Anything destructive or outward-facing outside your own outputs: pushing, tagging, publishing,
   rewriting history, deleting outside the repo, touching the user's Chrome profile data or the
   user's own tabs and windows.
4. Any loosening of the security boundary (§2).
5. An effect outside your lane: another package, a later stage, a shared script, the wire protocol,
   the manifest.
6. A **contract question** with no pre-stated rule (§4).
7. A package `CLAUDE.md` invariant that would have to change.
8. A guard, timeout or test firing that is not explained; a recorded "Revisit if" trigger met; a
   port-9234 holder that is not the daemon; an orphan process you did not start.
9. Two failed fix rounds; a check that cannot be made discriminating.
10. A permission or classifier denial. Report it; never retry it or work around it. Agents never
    edit permission settings.

## 4. When the spec and reality disagree

Intent beats procedure. Trace up the chain (brief → phase doc → design spec → `CLAUDE.md` measured
facts) and say in your report which layer you followed; the deepest internally consistent layer wins.
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
lead cleaner's mechanical fixes (`cleanup-pass` skill). Everyone else puts decisions in the report:

```
### YYYY-MM-DD · <plain title>
**Decided:** … **Why:** … **Instead of:** … **Revisit if:** … **By:** Claude (proposed)
```

Contract decisions without a pre-stated rule are marked "for user review". Evidence before opinion:
our docs, tests and code first, then at most one targeted web search for an external fact
(Chrome, CDP, MCP SDK behaviour), with its source recorded.

## 6. Roles

- **Step agent:** owns one stage: builder → independent verifier → fixer, at most 2 fix rounds (the
  verifier re-checks only the affected items). Reads its children's reports and the resulting files
  before accepting. Does not build or commit itself. Keeps the ledger only if the stage holds a wait.
- **Builder:** do exactly the task. Pure logic: the failing test first. Run `npm run typecheck`,
  `npm test`, `npm run build` and quote the result lines with counts. `chrome.*` glue is not
  unit-tested; it gets rows in `docs/e2e-test-plan.md` in the same stage.
- **Verifier:** never the builder. Reads the phase doc and spec itself; the builder's report is
  claims to audit. Re-runs typecheck, test and build from a clean tree, re-derives counts, proves new
  tests fail without the change, checks the package `CLAUDE.md` invariants and the security boundary,
  attacks the spec as well as the code. May read and run, never edit. Findings: severity
  (CRITICAL / MAJOR / MINOR / NIT), `file:line`, evidence (command + output excerpt), suggested fix.
  Verdict: **FAIL** on any CRITICAL or MAJOR or a failed exit check; **PASS-with-notes** on MINOR/NIT
  only; else **PASS**.
- **Fixer:** fixes the listed findings and touches nothing else; disputes a wrong finding with evidence.
- **Live runner:** drives a live wave from a committed wave sheet. It **returns** on every STOP line
  (a failed restore, a guard printing STOP, a human gate, any throw after the first state change),
  after restoring the safety state if it touched it. It may fix a helper only between rows, never past
  a STOP line. Every live wave leaves the safety state as it found it, read back by count and hash,
  never printed.
- **Lead cleaner / area cleaner:** `cleanup-pass` skill.
- Leaf agents (builder, verifier, fixer, runner, area cleaner) never spawn agents.

## 7. Models

Risk decides the model (decisions.md · 2026-10-25 · Lean procedures … (#230)). The phase doc marks each
stage **low** or **standard**.
- **Low risk:** the stage touches no contract file (wire protocol, SDK public surface, MCP schemas,
  error codes) and nothing on the safety side (the gate, the token, the bind, logging, the manifest):
  docs, recipes and fixtures, test-only additions, internal refactors.
- **Builder and fixer on a low-risk stage: Sonnet, effort high.** If two Sonnet fix rounds fail, the
  next fix round runs on Opus.
- **Everything else on Opus:** session and step agents, every verifier, Stage-0 audits, live runners,
  builders and fixers of standard stages, the lead cleaner and the higher-risk area cleaners.
- Headless `claude -p` E2E actors may run Sonnet.
- Every report states the model it ran on. Step reports record the verifier's findings per stage, so
  Sonnet-built and Opus-built stages can be compared.

## 8. Waiting, and fresh agents

- The step agent holds long waits: run the job with `run_in_background` (or a silent watcher on a PID
  or `.done` marker, polling at most every 120 s), end the turn, get re-invoked on exit. Never a
  foreground sleep loop. Builders, verifiers and fixers finish in one go and never wait.
- A notice that a child is "waiting on its own background work" is **not** completion: end your turn
  and wait for its real hand-back.
- **Fresh agents, never resumed ones** (decisions.md · 2026-10-25 · Fresh agents instead of resumed
  ones (#225)): a stage that must continue goes to a new agent reading the ledger or report. A child
  whose transcript has not grown for an hour is stopped, checked for orphans, and its work handed to a
  fresh agent with the partial state named.
- Kill only processes you identified as yours (`docs/e2e-test-plan.md` §1 item 8); never `chrome.exe`.

## 9. Report

Write the report to the path in your brief, then return at most ~15 lines plus that path. Keep it to
what the next reader needs: **about 1.5k words at most**; logs and raw output go to evidence files
and are linked, never pasted.

1. **Verdict:** DONE | DONE-PARTIAL | BLOCKED | ESCALATE (verifiers: PASS | PASS-with-notes | FAIL)
2. **Outputs:** commits, files; numbers with the command that produced them; test count before → after
3. **Verifier verdict** and its file (step agents)
4. **Deviations** from the brief or phase doc: what, why
5. **Proposed decisions** (format in §5)
6. **Findings:** pre-registered checks that failed; a new runtime fact worth a package `CLAUDE.md`
   bullet, stated as measured (what, where, when)
7. **Handoff:** PIDs, log paths, watcher state, what the next stage needs, what needs the user's keyboard

## 10. Commits

Commit only when your brief says so (normally via the stage's builder). Exact file list; never
`git add -A`, `dist/`, `bridge.token`, `.env`, `exports/`, screenshots or a wave's scratch files.
Message `<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)`; types `feat`, `fix`,
`docs`, `test`, `chore`; scopes `server`, `extension`, `shared`, `daemon`, `sdk`, `mcp`, `docs`,
`test`, `e2e` or none. The body says why. End with the one trailer the session gives you. Commit every
bookkeeping edit before a live runner starts (a clean-tree guard stops the wave otherwise). On
`git index.lock`, wait and retry. Never push, never tag.

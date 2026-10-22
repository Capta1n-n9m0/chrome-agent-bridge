# Wave handoff prompts (newest first)

Format: `.claude/skills/phase-kickoff/template-wave.md`. Phase kickoffs live in
`next-session-prompt.md`, not here.

## W1 — the Step 6 live E2E wave: MUX and DL rows (written 2026-10-22; precondition: the D7 docs commit is made, `npm run build` is run, and the MCP config points at `<repo>/mcp/dist/index.js`)

*Run 2026-10-22: done — as-built in `2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` § "W1 as-built", Run 7 in `docs/e2e-test-plan.md`; six proposals wait in `docs/decisions.md` → Open decisions.*

*Status 2026-10-22: the three preconditions are met on the user's main machine (D7 committed as 0cf6cb5, built, config updated); the wave itself is deferred by the user to a later session. Review `docs/plans/2026-10-22-step6-open-decisions-review.md` before or during it.*

```
Dear Claude, let's run wave W1: the live end-to-end (E2E) wave of Step 6 (the daemon, protocol v2,
and the daemon/sdk/mcp split), human gate G6-2. Working dir:
C:\Users\aliev\Projects\chrome-remote-extention (Git Bash; node is not on PATH — prefix
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`; checks: npm run
typecheck, npm test, npm run build). I am present: this session drives my real, logged-in Chrome
profile with me, row by row, and may use UI automation where the wave sheet tags a step [UI]. Limits:
no code change, no protocol change, no extension change or reload, nothing pushed. No ratified
decision reopens (docs/decisions.md). A failed row is recorded, never "fixed" in the same session;
anything that needs a code change returns to me as a proposed decision. If context runs short, stop
at a clean row boundary, write the run record for what was measured, and list the remainder.

HOW THIS SESSION RUNS: two-level form (long-run §2). You run the rows with me, in the wave sheet's
order. At the end a fresh verifier agent (model "opus", Claude Opus 5.5) re-reads the run record
against the rows' pre-written expected text and greps the attached daemon.log for "://" and the
token without printing them (exit check D6.3).

READ FIRST, in this order:
1. CLAUDE.md — Current state, Architecture, Runtime gotchas (the daemon ones are new).
2. docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/D6.md — the "Wave sheet" (steps 0–14,
   each tagged [UI] / [SH] / [USER]) and cautions A1–A10. This is the procedure.
3. docs/e2e-test-plan.md — §1 item 8 (wave set-up: the token only from bridge.token, created by a
   command that prints nothing, BRIDGE_TOKEN unset), rows MUX-1…10 and DL-1/2 with their expected
   text, the §5 "Run 7" skeleton you fill in.
4. docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md — what was built, the contracts,
   "Open decisions", "Needs the user's keyboard", the gate checklist.
5. docs/decisions.md — the user's ruling (2026-10-22 #31) on #13, #14, #15, #21, #22, #24, #27, and
   #30 (the wave's set-up). Rows MUX-7 → #14, MUX-8 → #21 and #27, MUX-10 → #13 measure them.
6. docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md — exit checks D6.1–D6.4, STOP rules.

SCOPE:
1. Check the preconditions and say which hold: D7's docs committed (`git status` clean except
   expected files); `npm run build` done; MCP config at `<repo>/mcp/dist/index.js` and reconnected;
   port 9234 free or held only by our daemon (`netstat -ano | grep :9234`); a `bridge.token` file
   exists (never print it); the extension's Options token matches.
2. Run MUX-1…9, DL-1, DL-2 (and MUX-10 if I agree) per the wave sheet. Record each result in the
   §5 "Run 7" record: the command, the observed text, PASS/FAIL against the pre-written expectation.
   MUX-6 evidence is a process listing; MUX-4 evidence is two timestamps.
3. MUX-9 (regression smoke) passes with the same expected text as each row's last recorded run.
4. The open decisions were ratified on 2026-10-22 (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions); the
   rows confirm them. RULED: if MUX-7 passes, #14 stands; if it fails ((b), (c) or (d) not as
   expected), the double spawn becomes a Step 7 prerequisite item, not a fix in this wave — record
   the result and add the item to the Step 7 plan. Any other row that contradicts a ratified
   decision: put it to me as an option question with the measurement.

STANDING CONSTRAINTS: the 127.0.0.1 bind and the token gate are unchanged; the token is never
committed, printed or pasted (grep for it by count only); nothing is pushed, tagged or published; the
extension is not reloaded or modified; the repo is public, so no private URLs, hostnames or
credentials enter docs or evidence (daemon.log excerpts are grepped for "://" first); CLAUDE.md stays
lean (state + pointers + gotchas). Kill only processes the wave sheet names, after its safety check.

IF ANYTHING BLOCKS: record the exact error, surface options with a recommendation, stop that row;
never improvise a change to get past a check. An "unknown method" error means the loaded extension
is stale for some other reason: report it.

EXIT CHECKS:
(a) D6.2 — every row has a result with the command and the observed text; MUX-6 by a process
    listing; MUX-4 by two timestamps.
(b) D6.3 — the attached daemon.log excerpt contains no "://" and not the token (both counts 0).
(c) D6.4 — MUX-9's rows pass with the same expected text as their last recorded run.
(d) `git diff -- extension/` empty; `npm test` still 542 passed.

WHEN DONE: append the wave as-built to docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md
(format .claude/skills/phase-kickoff/asbuilt.md § Wave), ending with "Proposed decisions — for the
user"; fill the roadmap's "E2E results" part of the Step 6 block and flip its status; update the
phase doc's Outcome with what D6 measured and its Status to closed if the gate checklist is met;
run session-closeout; commit ("docs: Step 6 E2E results"). Then write the Step 7 phase kickoff
(phase-kickoff skill, overwrite docs/plans/next-session-prompt.md).
```

## W0 — ratify the Step 6–8 plan findings and write the Step 6 kickoff (written 2026-10-21; precondition: the long-run skills are committed at 77794a5 and the three rewritten plans sit uncommitted in the working tree)

```
Dear Claude, let's run wave W0: ratify the findings in the rewritten Step 6–8 plans with me, then
write the Step 6 kickoff. Working dir: C:\Users\aliev\Projects\chrome-remote-extention (Git Bash;
checks: npm run typecheck, npm test, npm run build). I am present for this session: it is
conversational, not autonomous. Limits: no code changes, no extension work, nothing pushed without
my go. The chrome-agent-bridge MCP is not needed for this wave (it failed to connect in the last
session with CONNECTION_CLOSED; ignore that). If context runs short, stop at a clean sub-boundary,
record what landed in docs/decisions.md and CLAUDE.md Current state, and list the remainder.

HOW THIS SESSION RUNS: two-level form (long-run §2). You do the reading and the writing yourself;
spawn one fresh verifier agent for the exit checks at the end. Every path you cite exists (ls it).

READ FIRST, in this order:
1. CLAUDE.md — Current state, Skills & workflow, Runtime gotchas.
2. docs/docs-writing-guide.md — the decision format and "supersede, don't append".
3. .claude/skills/phase-kickoff/SKILL.md + template-phase.md + asbuilt.md; .claude/skills/long-run/SKILL.md
   §2–§4; .claude/skills/step-agent/SKILL.md (the STEP BRIEF and ESCALATION list you will paste).
4. docs/decisions.md — one entry so far: 2026-10-21 "Steps 6–8 run under the long-run contract".
5. The three plans, now phase docs: docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md,
   …step7-multi-actor-tabs.md, …step8-sdk-surface-and-mcp-cursor.md. Read each fully; the "Open items"
   section of each holds the findings for item 2 below.
6. docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md §8.3 (actor names), §9.3 (bind is the lock),
   §10 (error codes), §12 (open questions).
7. docs/e2e-test-plan.md — only the list of row-ID families (ACT, TRUST, PERC, CONN, EVAL, NET, …) to
   settle the DL-1 finding.

STATE OF THE TREE: `git status` shows the three plans modified and uncommitted. A subagent rewrote
them on 2026-10-21 into the phase-doc format (header, Outcome, Decisions, Stages with lanes and
verifier focus, pre-registered Exit checks, Human gates, STOP rules, Open items). The rewrite was
verified: only those three files changed and every original checkbox line survived (43 / 42 / 32).
Treat the Open items as the subagent's findings: claims to check against the files they cite, not facts.

SCOPE
1. Review the plan rewrite with me. Show `git diff --stat` and the new section list of one plan;
   do not paste whole files. Then commit the three plans as
   "docs: restructure Step 6-8 plans as phase docs" with the session trailers, on my go.
2. Put every finding in the three "Open items → Findings for the Stage-0 audit" sections to me as
   an option question with a recommendation, grouped as:
   (a) quick rulings — the actor name (`#<pid>` per the spec vs `process.ppid` in the plan; note
       the nvm-shim gotcha makes ppid the shim); `selectTab` removed vs kept as an alias (Step 7);
       Step 6 "connection.ts (unchanged)" vs decision 0.4; who adds the `extensionStatus` event
       (now exit check D2.7); the `DL-1` regression row that does not exist (add DL rows for
       browser_download to the E2E plan, or drop the cite); the Step 7 fixture "open popup"
       button nobody adds; the Step 8 "delayed button" the fixture lacks; the Step 7 actions.ts
       call-site count; Step 8 S7's "args-less evaluate" vs the roadmap's Phase F item;
   (b) blind spots — two clients with different BRIDGE_DAEMON paths handing the daemon back and
       forth; tab handles renumbering after a daemon restart and what the cursor / TAB_UNKNOWN do.
   One question at a time or in small groups; recommend, don't lecture. For each ruling: record it
   in docs/decisions.md (newest first, By: user, or By: Claude (ratified 2026-…) when my default is
   accepted), and amend the affected plan text in place with a dated note
   (*Superseded 2026-…: was X, because Y.*), keeping the plan's checkbox lines intact. Anything I
   defer stays under Open items for the Stage-0 audit, marked "deferred by the user on <date>".
3. Gather the environment facts the kickoff needs and date them: `node -v`, `npm -v`, Chrome
   version (ask me), whether port 9234 is free, `npm test` count and `npm run typecheck` /
   `npm run build` on the committed baseline, the baseline commit hash after item 1.
4. Run the phase-kickoff skill, phase kind, for Step 6 → write docs/plans/next-session-prompt.md
   per template-phase.md, sections 1–9 in order. It must: name the model every agent runs (ask me;
   the research repos pin Opus, this machine runs Fable 5.1); declare the three-level form with
   one step agent per stage D0–D7, D0 ∥ D1 and D4 ∥ D2/D3 as the plan's dependency graph allows,
   D6 split off as a wave with me (gate G6-2); paste the STEP BRIEF TEMPLATE and ESCALATION list
   from the step-agent skill extended with the plan's lane grants (D1 = whole repo, no behaviour
   change) and gates G6-1…G6-3; carry the Stage-0 audit lenses with the repo's seeded blind spots
   and the findings that were deferred; paste the SPEC-DISCREPANCY PROTOCOL, the INTEGRITY FLOOR
   and the STOP RULES + forbidden fixes from the plan; LESSONS: the CLAUDE.md gotchas that touch
   lifecycle/ports/paths, plus two from this wave — "a subagent's report is a claim: verify by
   diff before accepting" and "the building session's own MCP connection dies at D1; do not run
   Step 6 from a session that needs the bridge". Then check every path it cites with ls and every
   decision it cites against decisions.md.
5. session-closeout: decisions.md (done in 2), docs/progress-and-roadmap.md (status line: plans
   restructured, Step 6 kickoff written, nothing built), CLAUDE.md Current state (next action:
   paste docs/plans/next-session-prompt.md into a fresh session; the file now exists), memory
   (the project memory's "next" line), then one commit "docs: Step 6 kickoff + plan rulings" with
   the trailers. Push only if I say so.

STANDING CONSTRAINTS: the security boundary (127.0.0.1 bind, token gate) is not discussed as a
tradeoff; the token is never printed; nothing is pushed, tagged or published without my go; the
repo is public, so no private hostnames or credentials enter the docs; CLAUDE.md stays lean
(state + pointers + gotchas); no ratified decision reopens.

IF ANYTHING BLOCKS: record the exact problem, give me options with a recommendation, stop that
branch. Never edit a plan's design decision to make a finding disappear.

EXIT CHECKS (the verifier agent runs them, edits nothing):
(a) the three plans are committed and `git status` is clean apart from untracked scratch;
(b) every ruling from item 2 appears once in docs/decisions.md in the guide's format and is
    reflected in the plan with a dated note; deferred items are marked as such under Open items;
(c) docs/plans/next-session-prompt.md exists, has the nine template sections in order, names the
    model, and every path and decision it cites exists;
(d) CLAUDE.md Current state names next-session-prompt.md as the next action and its date is today;
(e) the final commit's file list contains no dist/, no bridge.token, no .env.

WHEN DONE: tell me in ≤ 10 lines what was ruled, what was deferred, and that the next session starts
by pasting docs/plans/next-session-prompt.md.
```

# Wave handoff prompts (newest first)

Format: `.claude/skills/phase-kickoff/template-wave.md`. Phase kickoffs live in
`next-session-prompt.md`, not here.

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

# Procedure area — cleanup pass 2026-10-30-2

Area cleaner (Sonnet, medium). Read only. Scope: `git diff dffb405..HEAD`. The five skills (`.claude/skills/*/SKILL.md`,
plus `phase-kickoff/template-*.md` read for the budget) were **not changed** in the diff (`git diff --stat -- .claude`
is empty). `docs/plans/next-session-prompt.md` and the Step 14 steps dir were. Checked: skills against
`docs/agent-rules.md` §6–§10, the kickoff against the `phase-kickoff` rules (points, never pastes), the steps dir
against `step-agent` "What a stage leaves". Commit trailers on all ten commits since `dffb405` read
`Co-Authored-By: Claude Opus 5.5 <…>` with no `Claude-Session` line: clean (§10).

## Findings

1. **`docs/plans/next-session-prompt.md` is Step 14's kickoff and Step 14 is built; it is now a stale start prompt.**
   - Evidence: "Step 13 is committed but maybe not pushed (G13-1). Check `git status` and `git log origin/main..HEAD`"
     (journal: "Step 13 is already on GitHub (the G13-1 question is moot)"); "First record the phase doc's proposed
     decisions (0.2–0.7) in `docs/decisions.md`, numbered from 421" (recorded as #421–#432); "the `npm test` count (expect
     6030 in 251 files" (now 6089 in 255, `CLAUDE.md` Commands).
   - Fix: leave as is until the user rules #432 and G14-1, then `phase-kickoff` overwrites it with the next step's
     prompt (`long-run` §5, `session-closeout` §6). Until then no session should be started from it. Optionally a
     one-line header "Executed 2026-10-30; superseded at the next kickoff". Needs the user (their ruling; a header line is
     mechanical if the lead wants it).

2. **The kickoff pastes numbers and a decision range that go stale** (`phase-kickoff`: "The prompt points; it does not
   paste", `step-agent` "numbers copied from a record").
   - Evidence, `next-session-prompt.md` §1 item 3: "expect 6030 in 251 files, but re-derive it", "all eight
     `recipes/tsconfig*.json`"; §4 "numbered from 421"; §3 "Lanes: S1 may run beside S2".
   - Fix for the next kickoff (not a rewrite of this one): write "re-derive the counts, compare with `CLAUDE.md`
     Commands" and let the phase doc hold the lane and the decision numbers. Mechanical, applies when the file is
     overwritten. Low severity; the "re-derive it" clause already guards it.

3. **Kickoff says "Deviations from `docs/agent-rules.md`: none", but the run used a form the rules do not describe.**
   - Evidence: kickoff §3 "Deviations … none" and "Form: two levels"; phase doc 0.2 "Two levels, not three: the session
     agent runs each stage with one builder and one verifier"; journal: "S1 committed b2c45b7 by the session agent: the
     Sonnet committer stopped on the user's path in evidence"; "S2a committed 329b518 by the session agent", then S2b, S3,
     S4, S5 the same. `agent-rules.md` §10: the stage's committer is "a fresh agent the step agent starts after the
     verifier's verdict (§10); Sonnet" (§7); `long-run` §1 gives the session agent "markdown and bounded read-only
     checks" and no committing; `long-run` §2 says three levels by default.
   - So the session agent stood in for the step agent and did the commit itself on every stage but a failed one. It is
     defensible (the committer's stop was correct and later stages were small), but it is an unrecorded deviation from
     §6–§7, and nothing in `agent-rules.md` or `long-run` defines the two-level form (who commits, whether `<STAGE>.md`
     is written, who holds the ledger).
   - Fix: either one sentence in `agent-rules.md` §6 or `long-run` §2 ("in a two-level phase the session agent takes the
     step agent's duties; it may commit a stage itself when a committer cannot, and says so in the journal"), or record the
     deviation in the phase doc. Needs the user (it changes a rule file).

4. **No stage reports `<STAGE>.md` for S1–S5; only builder/verifier/fixer reports exist.**
   - Evidence: `step-agent` "What a stage leaves in the steps dir: `<STAGE>.md` (step report); the leaf reports …".
     The dir holds `Stage0.md`, `S1-builder.md` … `S5-verifier3.md`, `S4-runner.md`, `S4-rehearsal.md`, but no `S1.md`
     … `S5.md`. `agent-rules.md` §6: "The step agent records the hash in the stage report"; the hashes are in
     `journal.md` only.
   - Cause is finding 3 (no step agent in a two-level phase). Fix: with the rule in finding 3, state that the journal
     line replaces the stage report. Needs the user with 3; not worth backfilling.

5. **Two extra record files break the "nothing else" list, and S4 has two names for the same role.**
   - Evidence: `step-agent`: "Nothing else: no brief copies, no raw dumps". `S3-doc-section.md` (345 words, a doc draft)
     and `S5-claude-md-proposals.md` (212 words, proposals for the lead) are neither a report nor evidence. `S4-runner.md`
     is the runner report; `S4-rehearsal.md` is the run record the phase doc asked for (926 words), so this part is
     consistent with "evidence the phase doc asks for (run records …)".
   - Fix: none needed for the records (they are history and were used: the doc section went into `setup.md`, the
     proposals into `CLAUDE.md`). Add to `step-agent` "What a stage leaves": "a draft section or proposal file a builder
     hands to a doc stage" if the pattern should be allowed. Needs the user (small rule change); otherwise accept.

6. **Skills' "Stage 0" and role vocabulary are consistent with the rules; no pasted rules found.** Checked: `long-run`
   (points to `agent-rules.md` §3/§4/§5/§7/§8; "Briefs stay small"), `step-agent` (the brief templates state `effort`
   medium and the #286 first line; they quote `agent-rules.md` §7 only by reference), `phase-kickoff` (budget about 1.5k
   words: the Step 14 kickoff is about 950 words, within it), `session-closeout` (§6 "If the phase stops at an unmet
   gate, the kickoff waits for the user's ruling", matching `long-run` §5 and what happened), `cleanup-pass` (table
   matches `agent-rules.md` §7's Opus/Sonnet split: Procedure Sonnet). No finding. One nit, mechanical and optional:
   `cleanup-pass` brief template writes the output as `<docs/cleanup/<date>-evidence/<area>.md>` with the angle
   brackets around the whole path, while this pass's brief gave the plain path; harmless.

7. **A test fixture in evidence carries a person-like name, not the user's.**
   - Evidence: `S1-fixer1-red.txt:7` "expected 'C:Usersİlham.chrome-agent-bridge\fail…'". The name is the fixer's fake
     home for the `İ` test, not the user's (the user's name appears nowhere in the Step 14 dir or the phase doc: grep for
     the user name and `C:\Users` returns only this fixture line). The path form is fine for `docs/docs-writing-guide.md`
     (a test input, not a local path). No action; recorded so the lead does not re-raise it.

8. **Carried from the journal, for the gate (not a rule drift): commit 6e22e3b still holds one evidence line with the
   checkout's absolute path.** Already in `CLAUDE.md` Current state ("redacted in b2c45b7; squashing it before the push
   is the user's call"). Listed here only because `docs/docs-writing-guide.md` and #374 say committed docs carry no local
   path: it is a standing user decision, needs the user (squash or accept). No new finding.

## Counts
Raised 8 (incl. 3 no-action records). Mechanical: 2 (optional, at the next kickoff). Needs the user: 1 (stale kickoff, by design), 3, 4, 5, 8.
No skill, template or brief pasted rules from `agent-rules.md`; the drift is the undocumented two-level form (3, 4).

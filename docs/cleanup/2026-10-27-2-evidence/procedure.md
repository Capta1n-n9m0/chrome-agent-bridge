# Procedure area cleaner — cleanup pass 2026-10-27 (second), base c1a78b1

Sonnet 5.5, medium. Read only apart from this file. Evidence dir: `docs/plans/2026-10-26-step11b-block-list-redirects-steps/` ("steps dir" below).
The skills (`cleanup-pass`, `long-run`, `step-agent`, `phase-kickoff` + two templates, `session-closeout`) and `docs/agent-rules.md`
were not changed since c1a78b1 (`git log c1a78b1..HEAD -- .claude docs/agent-rules.md docs/docs-writing-guide.md docs/plans/handoffs.md` is empty).
I grepped them for pasted rules, models, efforts and numbers: no skill pastes a number that disagrees with agent-rules.md
(each says "medium" and points to §7). No new drift in what changed. The findings below are gaps the Step 11b stages S6–S8 exposed.

## Findings

1. **`step-agent` SKILL, "What a stage leaves in the steps dir" (and agent-rules §6): roles in use are unnamed.**
   - Journal lines name roles the rules never define: `env-check · checker`, `S4-investigation · investigator`,
     `Stage0-auditor.md`, `Stage0-measurer.md`, `Stage0-measurer2.md`. Quote (journal.md): "env-check · checker · Sonnet · medium".
   - The skill's report-name list covers builder, verifier, fixer, runner only. No committer report exists in S6–S8 (none of the
     committers wrote a file), yet §6 and the LEAF BRIEF both define a committer. See P18 draft.
   - Fix: needs-the-user (P18, rule wording).
2. **Where a committer's hash is recorded is inconsistent across S6–S8.**
   - `S7-helpers.md:9`: "The commit hash is in the committer's hand-back." `S7-record.md:72`: "Committed via a Sonnet committer (hash in
     the session". S7-live.md and the ledger do carry hashes (ledger: "fix 1 committed · 6f3413c"). The journal carries them for all stages
     (written by the session agent).
   - A step report that points to "the hand-back" points at nothing durable: the hand-back is not saved. Fix: P18 draft. Needs-the-user.
3. **Size cap overrun recurred; no rule says how to account for it.**
   - `S6.md:30`: "Size ≈ 575 lines (≈ 430 tests) against" the ~400 cap; `S6.md:59-60`: "Size over the ~400 cap (≈ 575, mostly tests); not split — one
     coherent piece." Verdict was still DONE (PASS-with-notes). Earlier: S2 647 vs about 500 (previous report P16).
   - §7 says a builder that finds its slice larger than briefed "stops and reports DONE-PARTIAL". Two stages in a row ran past it and were
     accepted as a deviation. Fix: P16 draft. Needs-the-user.
   - Related but not a defect: `S7-helpers.md:23` "line cap 440 → 480" is a guard inside a test file, not a stage cap.
4. **Fix rounds across a live-run loop.**
   - Counts from S6–S8 (fixer reports in the steps dir): S6 1; S7-sheet 2 (`-fixer`, `-fixer2`); S7-helpers 3 (the third, `S7-helpers-fixer3.md`,
     is "Opus 5.5 ... (agent-rules §7, third round)", as §7 requires); S7-live 1 fixer + 2 runner attempts; S7-record 2; S8 2 (`S8-fixer`, `S8-fixer2`).
     All within §7. Earlier waves: S4-live 11 fixer spawns, 8 runners.
   - S7-live's single fixer ran because attempt 1 "failed (exit 2) ... STOP in R17B-0 ... before any state change"; the ledger calls it
     "not a pre-registered STOP (a throw before the first state change, no row measured) → helper fix". The step agent chose to count it as fix
     round 1 of the stage, and the unit (fix then re-attempt) worked. It was never written down. P17 draft. Needs-the-user.
5. **`S7-live.ledger.md` stamps out of order** (already noted by `S7-record.md:67`): line 5 "07:10Z fix 1 ... done" precedes line 6 "06:56Z fix 1 committed".
   The ledger is append-only, so the order is the order written; the stamps were estimated. Rule 1 of the ledger (skill: "UTC time (`date -u`)")
   was not followed. Fix: mechanical for the skill (add "read from `date -u`, never estimated" is already there; the stage did not read it). Nothing to
   change in the skill; the journal even carries the same confession at 2026-10-26T16:26Z ("clock estimated, not read"). Suggest nothing; recurrence is 2 in 2 runs,
   so a one-line addition to the ledger paragraph is optional: "if you cannot read the clock, write `~` before the time".
6. **P15 did not recur in S6–S8, but the pointer is still dead.** No wave prompt was written in S6–S8 (no commit touches `handoffs.md` since c1a78b1). The five
   pointers to it remain: `CLAUDE.md:169`, `phase-kickoff/SKILL.md:17`, `template-wave.md:3`, `docs-writing-guide.md:15` and `:41`. Needs-the-user (P15 draft).
7. **`docs/plans/next-session-prompt.md` is stale** (known): header still says "Next session — Step 11b". One line only, as stated by the lead; mechanical when the
   Step 12 kickoff is written (phase-kickoff overwrites it).
8. **Briefs and skills paste nothing new.** `step-agent` Brief rules, `template-phase.md:19` ("Models, fix rounds and commits are `agent-rules.md`'s: point")
   hold. S6–S8 step reports state Model/effort in line 3-4 as §7 requires. No finding.

## P15–P18 drafts

### P15 — where wave prompts go

Evidence: no wave prompt was written in S6–S8; Step 11b's resume used the phase kickoff file only. `handoffs.md` last entry W2 (2026-10-24),
header "Historical record (closed 2026-10-25)". Cheapest option: keep one file, reopen it. Alternative (a per-wave file) multiplies paths; wave prompts are
rare (zero in the last 3 stages), so one archive file is enough.

Recommended: reopen `docs/plans/handoffs.md` (do not change the five pointers).
- File: `docs/plans/handoffs.md`, line 3.
- Replace: `*Historical record (closed 2026-10-25); current procedures: `docs/agent-rules.md` and the skills.*`
- With: `*Wave prompts, newest first. Rules for the agents that run them: `docs/agent-rules.md` and the skills. The entries below are history; the format is `.claude/skills/phase-kickoff/template-wave.md`.*`
- File: `docs/docs-writing-guide.md`, line 41, drop `handoffs.md` from the list of "never rewritten" records only if the guide means the old entries; add after it "(old entries; new ones are prepended)".

Needs-the-user: yes (choice of file). Alternative if the user prefers: a wave prompt is a section of the phase doc's steps dir `…-steps/wave-<n>.md`; then change the four pointers
(`phase-kickoff/SKILL.md:17`, `template-wave.md:3`, `CLAUDE.md:169`, `docs-writing-guide.md:15`).

### P16 — when a size-cap overrun may be accepted

Evidence: S2 647 vs ~500; S6 about 575 vs ~400, accepted "one coherent piece". Both were mostly tests. Both reported DONE. The rule gives only DONE-PARTIAL.

- File: `docs/agent-rules.md`, §7, bullet "Small iterations (#271)".
- Anchor: after the sentence ending "...rather than growing its context."
- Insert: ` A cap counts new lines of code and tests together. A finished slice up to 1.5 times its cap may be accepted as a deviation when it is one coherent piece and the extra is tests; the report states the size and why in § Deviations. Over 1.5 times, or code over its cap, is DONE-PARTIAL.`
- Also `.claude/skills/step-agent/SKILL.md`, Brief rules, bullet "Size": change "a builder over it reports DONE-PARTIAL" to "a builder over it reports DONE-PARTIAL (or the accepted overrun of `agent-rules.md` §7)".
- Check against evidence: S6 575/400 = 1.44 (accepted), S2 647/500 = 1.29 (accepted). Both would pass. Needs-the-user: yes (the 1.5 figure is a choice).

### P17 — fix rounds per stage or per attempt

Evidence: S6–S8: at most 3 fixers in any stage, all counted per stage. S7-live: a helper fix between two runner attempts was counted as the stage's round 1.
S4-live (earlier): 11 fixers, 8 runners, which the §7 cap of two did not stop because each attempt was treated as a new start.

- File: `docs/agent-rules.md`, §7, bullet "Fix rounds".
- Replace: `- **Fix rounds:** at most two per stage. A third runs only on an Opus fixer; if that fails, §3 item 9.`
- With: `- **Fix rounds:** at most two per stage, counted per stage and never reset by a new attempt: a fix between two live-run attempts is one round, and so is any fix after a verifier's FAIL. A third runs only on an Opus fixer; if that fails, §3 item 9. A live stage also stops at three runner attempts (§3 item 9).`
- And §3 item 9: `9. Fix rounds exhausted (§6, §7); ...` leave as is.
- Needs-the-user: yes. It would have stopped S4-live well before attempt 7; the user may prefer to keep that freedom for live waves, then write instead: "A live stage's cap is set in its phase doc."

### P18 — roles and where the committer's hash goes

Evidence: journal lines use checker, investigator; Stage0 files use auditor, measurer; S6–S8 never saved a committer report; S7-helpers.md:9 and S7-record.md:72 point at a hand-back that was not saved; the journal and ledger do hold the hashes.

- File: `docs/agent-rules.md`, §6, after the Committer bullet (`- **Committer:** ...`).
- Insert: `- **Checker, auditor, measurer** (read-only leaves, Sonnet unless the phase doc says otherwise): a checker runs a stated command set and reports the output (the environment check); an auditor reads code or docs against a stated question (Stage 0); a measurer runs a stated measurement and reports numbers with the command. None edits or commits. Each writes \`<STAGE>-<role>[n].md\`.`
- Same bullet for the committer, append to the Committer bullet: ` Its hash goes into its one-line report; the step agent copies it into the stage report (§ Outputs) and the session agent into the journal. A report never says "in the hand-back".`
- File: `.claude/skills/step-agent/SKILL.md`, LEAF BRIEF `ROLE:` line: change `builder | verifier | fixer | live runner | committer` to `builder | verifier | fixer | live runner | committer | checker | auditor | measurer`; and "What a stage leaves": add "a committer's one-line report is not saved; its hash is in the stage report".
- Needs-the-user: yes (role definitions are rules).

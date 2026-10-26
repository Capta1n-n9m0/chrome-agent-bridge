# Procedure area cleaner — cleanup pass 2026-10-26

**Model:** Sonnet 5.5 (`claude-sonnet-5-5`); effort not shown to me by the harness. Read only except this file.
**Read:** `docs/agent-rules.md` (whole), the six skills and both phase-kickoff templates, `docs/plans/next-session-prompt.md`,
`docs/plans/handoffs.md` (head and headings), Step 11 `journal.md`, the step reports `Stage0.md`, `S1`–`S6`, `S5-liveA`,
`S5-liveB`, `S5-record` (headers, deviations, agent tables), word counts of all 82 reports in the steps dir, decisions
#270, #271, #286, #287 and #231, root `CLAUDE.md` Current state, the Step 11 phase doc's STOP rules.
**Scope note:** `git diff 965b1af..HEAD` touches only `docs/agent-rules.md` among the skill and rule files (+18 / −5:
#270, #271, #286). The skills, templates and kickoff did not change in Step 11, so their drift is against the new §7, §8
and §10 text. `doc-check` was not usable in my shell (no output); I did not rely on it.

Findings 1–16. "Mechanical" = the lead may apply it; "user" = a rule or a ruling is involved.

## Findings

**1. `docs/agent-rules.md:136-144` (§7): the model bullets contradict each other; #270 "replaces … where they differ" leaves the reader to diff them.**
Bullet 2: "**Builder and fixer on a low-risk stage: Sonnet, effort high.**" Bullet 3: "**Everything else on Opus:** …
live runners, builders and fixers of standard stages". Bullet 5: "builders, fixers and live runners run **Sonnet, effort
medium**, on every stage, low or standard … This replaces the two bullets above where they differ." After #270 both older
claims are wrong in full (Sonnet high exists nowhere for doers; no doer is Opus on a standard stage), and the only
remaining use of the low/standard tier for models is gone. The bullet also carries a date and a ruling number as a
status marker ("In force from Step 11 S5 (the user, 2026-10-25, #270)").
Fix: rewrite §7 in place (the file's own rule: "Changes are made in place"): doers (builders, fixers, live runners)
Sonnet medium; verifiers, step agents, session agent, Stage-0 audits and the lead cleaner Opus; area cleaners as the
`cleanup-pass` table says; headless actors may run Sonnet; cite #270 once. Keep the tier only where it still decides
something (fix rounds, finding 2). **Mechanical** (the user already ruled the content, #270).

**2. Fix-round count: §6, §3.9, the phase doc and #270 disagree for standard stages.**
`agent-rules.md:106-107`: "at most 2 fix rounds, 3 on a low-risk stage (§7)". `:143-144`: "Two failed Sonnet fix rounds →
a third on Opus, as above" under "on every stage, low or standard". For a standard stage the third (Opus) round is now
both forbidden (§6) and required (§7). The Step 11 phase doc copies the old text: `docs/plans/2026-10-25-step11-file-upload.md:532-534`
"after the fix rounds `docs/agent-rules.md` §6–§7 allow (2; 3 on a low-risk stage)". This is the old P1 reopened by #270.
Fix: one sentence in §6 ("two Sonnet rounds, then one Opus round, then §3 item 9", or keep 3-on-low-risk only and say
so in §7); the phase doc line becomes a bare pointer. **User** (it sets the fix-round budget of standard stages).

**3. `.claude/skills/step-agent/SKILL.md:22` still says `effort: "high"` for Sonnet.**
"Pass `model` on every `Agent` call (`agent-rules.md` §7), and `effort: "high"` for Sonnet." against `agent-rules.md:142`
"Sonnet, effort medium". The skill is the template the session agent copies. (`docs/plans/2026-10-25-lean-procedures.md:12`
and `:107` also say "Sonnet (effort high)", but that is a dated plan/record.)
Fix: "and the effort §7 names", with no number in the skill. **Mechanical.**

**4. Verifier effort is not set by any rule or template; verifiers ran at "low".**
`step-agent` line 22 passes `effort` only "for Sonnet". Step reports: S6.md §4 "verifier | Opus 5.5 | low (self-reported;
none passed)" (all three verifiers); journal line 50 and 75 ("the last two report effort low"); S5-record "the third
reports effort low". #286: "Not changed, for the user: briefs pass no `effort` for Opus verifiers, and three verifiers
reported running at 'low'." The verifier is the stage's independent check, so its depth is a quality setting nobody owns.
Fix: the user rules an effort for verifiers; then one clause in §7 and one in the `step-agent` brief rule. **User.**

**5. `agent-rules.md:190` (§10) and the `step-agent` templates: "normally via the stage's builder, after the verifier's verdict" is not what happens, and the committer role does not exist on paper.**
§10: "Commit only when your brief says so (normally via the stage's builder, after the verifier's verdict, so the message
carries it — #286)". §8: builders "finish in one go"; §6: the verifier runs after the builder. A builder cannot commit
after a verdict that comes after it ended. Practice: a separate committer agent — S3c.md:26 "by the commit agent after
this report", S5-record.md:21 "by a fresh Sonnet committer", S6.md:26 "the committer's reply", Stage0.md §2 "committer
(fixer role, commit only), Opus", journal line 19 "docs-commit agent Opus", line 49 "commit agent Sonnet medium". Its
model varies (Opus in Stage 0/S1, Sonnet from S3c) and §7 does not cover it ("builders, fixers and live runners").
`step-agent` STEP BRIEF still says "Commit via the builder"; LEAF BRIEF has no `committer` role.
Fix: add "Committer" to §6 (one task: stage the exact file list, commit with the verdict, no other edit), say its model
in §7, reword §10 and the STEP BRIEF line to "via a committer the step agent spawns after the verdict". **User** for the
committer's model and role; the wording is then mechanical.

**6. History and incident narrative inside the agent-loaded rules (`agent-rules.md:142`, `:157-160`, `:163-164`).**
Examples: "In force from Step 11 S5 (the user, 2026-10-25, #270)"; "a child's hand-back that arrives after its parent ended
the turn goes past the parent (Step 11 S5-liveA's first step agent)"; "(Step 11: a mistyped heredoc spun ~1.5k
CPU-seconds as an orphan)". `docs/docs-writing-guide.md:56-59` says rules are superseded in place and "their history is
in `decisions.md` and `git log`"; the last cleanup (P10) dropped a provenance sentence for the same reason. The rule in
each bullet stands without the story, and #286 holds it.
Fix: keep the rule and the number (`#286`), delete the incident clauses. **Mechanical.**

**7. `.claude/skills/long-run/SKILL.md:33` "stage split (2–6 stages, risk tier each)" vs #271 and what Step 11 ran.**
Step 11 ran Stage 0, S1, S2, S3, S3c, S4, S4b, S5 as nine slices (sheet, fixtures, rules, actor, win, runner, liveA, liveB,
record; #271 first said seven) and S6: 17 stage units, each with its own step agent (journal lines 18-75). `agent-rules.md:145-146` (#271): a stage over ~600 new lines is "split
into slices before it starts, one step agent each". The "2–6" bound is a number copied from the first Step 11 plan.
Fix: "stages sized by #271's rule (`agent-rules.md` §7)", no count. **Mechanical.**

**8. `step-agent` brief rules do not carry #271, and the size cap appears with three different numbers.**
`step-agent` § Brief rules say nothing of line ranges, the size cap or DONE-PARTIAL; they only warn "Over ~1k words" (the same
1k warning is also pasted in `long-run:42-43`, a duplicate). §7 says ~600 lines; journal lines 56 and 59 show briefs with
"hard cap 500 lines"; `decisions.md:330` records S5-actor's builder at 977 lines "did not stop at DONE-PARTIAL as #271
asks" (journal line 54: "977 lines vs ~600 brief, no DONE-PARTIAL"). So the rule was in force but not in the template
the briefs are written from. `agent-rules.md:146-147` also copies "`docs/e2e-test-plan.md` is ~460 KB" (a number that
drifts; the guide forbids numbers copied from records).
Fix: add one Brief-rule line: "Name line ranges; state the slice's size cap (`agent-rules.md` §7); a builder over it reports
DONE-PARTIAL"; drop the duplicate 1k line from `long-run`; in §7 say "a file too large to read whole (the e2e plan)". **Mechanical.**

**9. Waiting (#286) is in `agent-rules.md` §8 only; the briefs still carry a "foreground children" instruction the tool ignores, and `long-run` has no waiting text.**
Evidence: S5-record.md:80 "The brief asked for foreground children; the Agent tool started each child in the background
regardless"; S5-liveB.ledger.md:3 "children run as foreground Agent calls (brief deviation from agent-rules §8)"; journal line
65 "children in the foreground (deviation from §8, recorded for close-out)"; S6.md §7.4 the same. §8 now reads "The Agent tool
may start a child in the background whatever the brief says; then wait on the child's report file with a bounded wait", so
the brief line is both unnecessary and recorded as a "deviation" each time. `long-run` has no sentence on what the session
agent does while a step agent runs (§8: "Only the session agent ends its turn on a running child"), and journal line 57 records a
fixer's hand-back arriving "~5 h after its own end time" (S5-win).
Fix: add "Do not ask for foreground children" to the STEP BRIEF notes; one line in `long-run` §2: "you may end your turn on a
running step agent (`agent-rules.md` §8); a hand-back that does not come is revival (§4)". **Mechanical.**

**10. `agent-rules.md:171-176` (§9) "about 1.5k words at most" is exceeded by 23 of 82 reports in the Step 11 steps dir.**
`wc -w` over the dir minus ledgers, journal, proposals and the run record: 82 reports, 23 over 1,500 words, 6 over 2,000;
16 of 30 `*-verifier*.md` files are over 1,500 (largest `S5-liveB-verifier.md` 2,268, `S5-liveA-verifier.md` 2,115, `S2-builder.md`
2,059). Step reports are inside the limit (largest `S5-liveA.md` 1,930, `S2.md` 1,680). The rule is not being applied to
verifiers, whose reports carry command + output per finding by §6.
Fix: either state a verifier limit that fits (for example ~2.5k words with evidence in linked files) or enforce the 1.5k.
**User.**

**11. `.claude/skills/phase-kickoff/template-phase.md:28-38` "Bookkeeping invariants (carry into every phase)" restates rules and one is false in practice.**
"One commit per stage close, one per phase close; exact file lists" and "Every stage report states the test count
before → after" are `agent-rules.md` §10 and §9 item 2 (a second copy; the skill's own header says the template "restates
none"). The first is contradicted: S2 has four commits (`014a98d`, `ac31655`, `5827f32`, `8ab6923`), S5's seven slices each
committed, S5-liveA three (`e3152f9`, `ddc3955`, `3849585`).
Fix: replace the first two bullets with "commits: `agent-rules.md` §10; reports: §9"; keep the journal and the As-built
bullets (they are phase-doc conventions). **Mechanical.**

**12. `long-run` §5 and `session-closeout` have no branch for a phase that stops at its gate.**
`long-run:62-66`: "An unmet item means the phase is not closed." Nothing says what happens next. Step 11 stopped at the gate
(#287, phase doc § Gate checklist "**not met**"), yet the journal (line 76-79) runs the full cleanup pass and a kickoff for
the **next** step (#140) before the user has ruled the gate. `phase-kickoff` §Procedure step 5 has a "Resume point" for pausing
mid-phase but the next-step kickoff of an unclosed phase is not covered; the roadmap and Current state were left in a mixed
state ("Resume: the user rules Step 11's gate … **Next** … kickoff `docs/plans/next-session-prompt.md`").
Fix: add to `long-run` §5: "Gate unmet: closeout and a full cleanup run; the kickoff is written only for the user's ruling, or
for the next step if the user said so". The exact rule is the user's. **User.**

**13. Root `CLAUDE.md` Current state pastes rules instead of pointing (`CLAUDE.md:29-32`).**
"doers (builders, fixers, live runners) run Sonnet at medium effort, verifiers and step agents Opus (#270); a stage over ~600
new lines is split into slices (#271); a step agent never ends its turn on a running child, and commits carry the verifier's
verdict (#286)". These are `agent-rules.md` §7/§8/§10 sentences and will drift with finding 1, 2 or 5. The block's job is
the state ("what is done, the next stage") per `session-closeout` §4.
Fix: "Lean procedures (#230), amended in Step 11 (#270, #271, #286): `docs/agent-rules.md` §7, §8, §10; trial numbers:
`docs/plans/2026-10-25-lean-procedures.md` § Trial." **Mechanical.**

**14. `step-agent` SKILL § "What a stage leaves in the steps dir" omits builder reports and has inconsistent file naming in the dir.**
The list: "`<STAGE>.md`, `<STAGE>-verifier.md` (and `-verifier2.md` …), fixer reports only if a fix round ran, a ledger only for a
waiting stage". Builder reports are never named, yet the dir has 20+ `*-builder.md` (every stage) and LEAF OUTPUT uses
`<STAGE>-<role>[n].md`. Also `-verifier3.md` (S5-sheet, S5-record, S6), `-runner2.md`, `-fixer2.md` follow the pattern but are
not listed; Stage 0 is `Stage0.md` / `Stage0-verifier.md` / `stage0-*.txt` (mixed case), against the skill's `<STAGE>`.
Fix: list "builder, verifier, fixer, runner reports (`<STAGE>-<role>[n].md`)" and fix the case rule for Stage 0 (`Stage0` and
`stage0-…` evidence). **Mechanical** (skill text); renaming files is not needed.

**15. `docs/plans/next-session-prompt.md` is the Step 11 kickoff and now stale (expected; the #140 kickoff follows this pass).**
Root `CLAUDE.md:36-37` already points the reader at it for the next step: "**Next** … the block list stops redirected requests
(#140) — kickoff `docs/plans/next-session-prompt.md`". Until it is overwritten, a fresh session reads Step 11's text: §1.3
expected counts "23 tools, 26 codes, 26 router methods" (now 24 / 27 / 27, `CLAUDE.md:8-9`) and §3 "Models: by each stage's
risk … per `agent-rules.md` §7" (changed by #270). For the next kickoff: write expected counts as "read from `doc-check`",
not as numbers (the template's §3 says "re-checked and dated"; the Step 11 prompt wrote the values). **Mechanical** after the rewrite.

**16. `phase-kickoff/template-wave.md:3-4` and `:58-65` carry provenance and lessons from another project.**
"Distilled from the exp3 paper revision loop (2026-08 → 2026-10, `paper/revision-1/handoffs.md` on `expr`); ported here
2026-10-21" and "## Lessons carried from the exp3 waves". That is history in an agent-loaded template, and a path on a machine
the agent cannot reach. NIT; the four lessons themselves are rules and could stay under "Sizing a wave".
Fix: drop the provenance sentences and rename the heading. **Mechanical.**

## Previous report's procedure proposals (docs/cleanup/2026-10-25.md): status

| # | Status | Evidence |
|---|---|---|
| P1 fix rounds vs Opus third round | **Reopened** by #270 | Finding 2 |
| P2 live E2E / reload grants | Resolved | `agent-rules.md:49-52` "unless a standing decision or the kickoff grants it" with #33, #65, #99 |
| P3 contract question vs session agent | Resolved | `:59-60` "for step and leaf agents. The session agent instead takes the conservative option" |
| P4 end-of-phase order | Resolved | `long-run:67-68` "Its order is the one order"; `session-closeout:51-55` agree |
| P5 commit formats / push | Resolved | `:199-200` "Subagents never push or tag"; closeout §7 points to §10 (but see finding 5) |
| P6 RESUME POINT holds state | Resolved | `phase-kickoff` Procedure 5: state in Current state and journal, kickoff gets one line |
| P7 template-wave decision format / stop rule | Resolved | `template-wave.md:55` "format: docs/agent-rules.md §5, plus Options and a Recommendation"; item 5 points to §3 |
| P8 security boundary duplicate | Resolved | `agent-rules.md:37-38` points to the root invariants |
| P9 wave sheet, precedence chains, trailer decision | Resolved | `:120-121` defines the wave sheet; `:70-72` one precedence chain, skills point to §4; #231 exists (`decisions.md:830`) |
| P10 provenance sentence | Partly: the old sentence is gone, new incident history was added | Finding 6 |
| P11 kickoff restates risk/model map, trailer | Resolved in the Step 11 kickoff (`next-session-prompt.md:57-67` points) | but stale, finding 15 |
| P12 kickoff §4 lenses / forbidden fixes | Resolved | lenses now in the phase doc (`2026-10-25-step11-file-upload.md:350`); forbidden fixes cite "everything in `docs/agent-rules.md` §2" |
| P13 probe fallback; Explore/Plan agents | Resolved | `agent-rules.md:20` names Explore/Plan; the probe passed (journal lines 8-9, "§1 unchanged") |
| Prior trial: no cleaner role in the leaf template | Resolved | `cleanup-pass` carries its own area-cleaner brief; §9 has the findings exception |
| Prior S1: `handoffs.md` W0-W2 name `asbuilt.md` | Resolved | `handoffs.md:3` "Historical record (closed 2026-10-25)" |

## Smaller notes (not numbered findings)

- `cleanup-pass` table lists the area cleaners as "Sonnet, effort high". #270 moved only doers to medium, so that is
  consistent, but §7 never says what effort cleaners take; the table is the sole source. If the user wants #270 to cover
  cleaners, it is a one-word change there. The skill also says "Area cleaners … never edit" while the brief tells them to
  write an evidence file, and `How` step 4 does not name the `docs/cleanup/<date>-evidence/` directory.
- `journal.md` (uncommitted) ends with two "(running)" lines (close-out lead cleaner, trial measurement); the trial note at
  line 34 ("rule to fix at close-out") is now done by §10's amendment. Append-only: close them by new lines, not edits.
- Descriptions of `long-run` and `phase-kickoff` and `template-phase.md:1` name "Step 11" as the example; true until Step 11
  closes, then a stale example.
- Briefs and kickoff pointers held up: no stage report that I sampled shows a pasted rule, spec text or a copied number in a
  READ list (S6.md §8 lists files and ranges only). The only pastes found are findings 8, 11, 13 and the phase doc line in finding 2.

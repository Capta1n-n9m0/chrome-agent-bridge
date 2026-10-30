# Procedure area, cleanup pass 2026-10-30 (Sonnet, medium)

Scope read: `docs/agent-rules.md` (whole), the five `.claude/skills/*/SKILL.md`, `template-phase.md`, `docs/docs-writing-guide.md` (diff), `docs/plans/next-session-prompt.md`, the head of `docs/plans/handoffs.md`, a sample of Step 13 step reports (`kickoff-checker.md`, `S1.md`, `S6.md`). Step briefs are not saved as files (`step-agent` skill), so briefs were checked through the reports' headers. The six untracked liveB20 files were not opened.

Overall: agent-rules.md is internally consistent and the skills point to it instead of pasting it. The one real problem is the stale kickoff.

## Findings

1. **`docs/plans/next-session-prompt.md:1-93` (whole file) describes a state that no longer exists.**
   - Wrong: the prompt says "resumed at Run 20's slice B (after a power cut)" and orders B3, the #407 addendum, B4, drivers-C, liveB20, liveC20, S5-record, S6.
   - Evidence, prompt (line 1, 9-11): "Step 13, resumed at Run 20's slice B"; "The code stages (Stage 0-S4) are built. Run 20's first live slice (liveA20) is recorded. The last session was cut off by a power failure". HEAD: `2c2c214 docs(e2e): S5-record — Run 20 recorded`, `1b4483d docs: S6 — Step 13 docs`, `ee8928c ... Gate checklist ... Current state`. Root `CLAUDE.md:14`: "Step 13 built and Run 20 recorded; the gate waits for the user". Journal last lines: S6 DONE, close-out part 1 done, full cleanup pass started.
   - Also flagged by `doc-check.txt`: "Status text outside CLAUDE.md: docs/plans/next-session-prompt.md:15".
   - Fix: `phase-kickoff` and `long-run` §5 say no next kickoff is written until the user rules the gate, so the file should not drive a resume. Reduce it to a short pointer ("Step 13 is built; the gate waits for the user; read root Current state and the journal's last line"), or leave the file as is until the user rules and then overwrite it at the close. Do NOT write a Phase G kickoff.
   - Needs-the-user (which of the two), the stale-text part is otherwise mechanical.

2. **`docs/plans/next-session-prompt.md:26-27, 30-33` pastes numbers and file lists copied from records.**
   - Evidence: "expect 5872 in 245 files"; "(4 modified recipe files; `recipes/s13-win.ps1`, ... and the four B3 reports untracked)". Current record: `CLAUDE.md:115` "6030 passed, 251 files". `phase-kickoff` SKILL.md:8-12 and `step-agent` SKILL.md:15-17 forbid pasting numbers copied from a record ("write 'numbers only from <file>'").
   - Wrong on both counts: the numbers are out of date and, per the skill, should not be in a kickoff at all.
   - Fix: replace by "re-derive the `npm test` count and compare to the root Current state". Falls away if finding 1 is applied. Mechanical.

3. **`docs/plans/next-session-prompt.md:27` says "all eight `recipes/tsconfig*.json`" while root `CLAUDE.md:118` says seven (State-area cross-note).**
   - Evidence: `ls recipes/tsconfig*.json` gives 8 files (adds `tsconfig.s13.json`); `CLAUDE.md:118` "tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b cover the others; all seven exit 0, 2026-10-29". The prompt is right; the root is stale (S13 added a config).
   - Fix: update the root Commands line to include `.s13` and eight (the lead's state fix; the count is a number in a CLAUDE.md, so check it with `ls`). Mechanical.

4. **`docs/plans/next-session-prompt.md:78` "Write a resume point (this skill)" has no antecedent.**
   - Evidence: the sentence sits at the end of a paragraph naming `long-run` §5, `session-closeout` and `cleanup-pass`; "this skill" matches none. The resume-point rule is in `phase-kickoff` SKILL.md procedure step 5.
   - Fix: write "Write a resume point (`phase-kickoff` step 5)". Mechanical (moot if finding 1 removes the section).

5. **`docs/agent-rules.md:142-143 vs 149`: the committer's model is stated twice in §7.**
   - Evidence: line 142 "**Sonnet** builds and fixes recipes, ... runs the **live runners** and the committers"; line 149 "**Committer:** a fresh agent the step agent starts after the verifier's verdict (§10); Sonnet." The committer is also defined in §6 (line 123) and §10 (line 198).
   - Fix: delete line 149 (the model is on line 142, the role in §6). NIT, mechanical.

6. **`docs/agent-rules.md:170` "Runner briefs name scan patterns only as 'the user's name' (#372)" sits in §8 (Waiting, and fresh agents).**
   - Evidence: §8's other bullets are about waiting and fresh agents; this one concerns what a brief may contain. Related rules are in §6 Live runner (line 117-122) and §2 "The repo is public" (line 36).
   - Fix: move it to the Live runner bullet in §6 (or §2 next to "The repo is public"). Mechanical. Section references to §8 elsewhere cite only the wait rule, so no citation breaks (checked `.claude/skills` and `docs/agent-rules.md`: nothing points at #372's position).

7. **`docs/agent-rules.md:146-148` (§7 Fix rounds) is ambiguous about what counts as a round; Step 13 already tripped on it.**
   - Evidence, rules: "a fix between two live-run attempts is a round, as is a fix after a verifier's FAIL". Decision #419 (`docs/decisions.md:206`): "The step agent counted one round ('a fix between two attempts'); agent-rules §7 also counts 'a fix after a verifier's FAIL' as a round, so Claude counts it the strict way: five passes against a cap of three ... a breach of #320/#367".
   - The rule does not say whether several fixer passes between two attempts are one round or several.
   - Fix: add one sentence, e.g. "each fixer pass is one round, however many fall between two attempts". This changes a rule agents are held to, and #419 is an open decision at the gate, so wait for the user's ruling. Needs-the-user.

8. **`.claude/skills/cleanup-pass/SKILL.md:9 vs 26` the evidence directory is missing from the Reports line.**
   - Evidence: line 9 "Reports: `docs/cleanup/<YYYY-MM-DD>[-n].md`." Brief template line 26 "OUTPUT: <docs/cleanup/<date>-evidence/<area>.md>". The directory `docs/cleanup/2026-10-30-evidence/` exists and is the practice (untracked, so far).
   - Also line 17 "Area cleaners ... never edit" and line 27 "Read only; no commit" sit next to an OUTPUT that makes them write a file.
   - Fix: line 9 add "Area cleaners' findings: `docs/cleanup/<date>-evidence/<area>.md` (the one file they write)"; and say whether the evidence dir is committed or removed after the pass (this pass's dir is untracked, with no rule). The commit-or-delete part needs the user.

9. **`.claude/skills/step-agent/SKILL.md:43-44` the commit instruction repeats itself.**
   - Evidence: "message per\nagent-rules.md §10 (trailer per `agent-rules.md` §10)." The last edit (815255a..HEAD) replaced the pasted trailer text with a pointer but left the two pointers side by side.
   - Fix: "message and trailer per `agent-rules.md` §10." NIT, mechanical.

10. **Not findings, checked clean.**
    - Skills versus agent-rules: roles, §7 models, §8 in-turn wait, §10 commit format and `long-run` §5 / `session-closeout` §6 (kickoff waits for the gate) agree; every `§N` they cite exists and says what they claim.
    - `phase-kickoff` templates exist (`template-phase.md`, `template-wave.md`); the phase prompt is 1091 words, within the 1.5k budget.
    - `docs/docs-writing-guide.md` rule 9 (no local path or user name) is respected by the files in scope; `docs/plans/handoffs.md` entries carry a local path in old wave prompts, which rule 9 leaves as they are ("Files already committed ... are left as they are"). Step reports sampled (`kickoff-checker.md`, `S1.md`, `S6.md`) state model and effort and do not paste rules.
    - `doc-check.txt` other lines: `CLAUDE.md:28` dead path `docs/decisions-archive/step13.md` is the file the Current state says is future (created at Step 13's close), and `CLAUDE.md:115` 6030 matches the journal; both belong to the State area.

## Count

9 findings (1 needs the kickoff decision, 2 needs the user, rest mechanical or NIT); area clean otherwise.

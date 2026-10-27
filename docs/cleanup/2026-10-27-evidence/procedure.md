# Procedure area findings, cleanup pass 2026-10-27

Area cleaner: Procedure. Model and effort: Sonnet 5.5, medium. Read only; no other edits.
Base: `1c29942..HEAD`. Read: `docs/agent-rules.md`, the five `.claude/skills/*/SKILL.md`, both phase-kickoff templates,
`docs/docs-writing-guide.md`, `docs/plans/next-session-prompt.md`, `docs/plans/handoffs.md` (head), `docs/plans/2026-10-25-lean-procedures.md`,
and the Step 11b steps dir: `S0F-a.md`, `S1.md`, `S2.md`, `S3a.md`, `S4-helpers.md`, `S4-live.md`, `S5.md`, `journal.md`, plus `S0F-a-builder.md`.
Note: briefs are not saved as files (step-agent skill, "Briefs are not saved"), so no brief text could be audited directly. The stage reports record only each brief's READ list, and those point instead of pasting.

## Findings

1. **Commit author contradicts itself inside agent-rules.** `docs/agent-rules.md:190` vs `:127` and `:146`.
   - Says (§10): "Commit only when your brief says so (normally via the stage's builder, after the verifier's verdict, so the message carries it — #286)."
   - Says (§6 Committer, line 127): "one task: stage the exact file list the brief names, commit with the verifier's verdict in the message (§10)". §7 line 146: "Committer: a fresh agent the step agent starts after the verifier's verdict (§10); Sonnet." §6 Step agent: "Does not build or commit itself: after the verdict it starts a committer."
   - Practice follows §6/§7: S2.md, S3a.md and S4-helpers.md all list a "committer (Sonnet, medium)". A builder cannot commit after a verdict that comes after the build.
   - Fix: replace "normally via the stage's builder" in §10 with "normally via the stage's committer". Mechanical.

2. **Next-session kickoff is stale (confirmed, no rewrite proposed).** `docs/plans/next-session-prompt.md:1-9` is still Step 11b's kickoff ("you are the SESSION AGENT for Step 11b"). `git log` shows the step built through S5 and the close-out to the gate (HEAD `39619cc`, gate not met). Its first check 1 (line 19) and "Stage 0 ... before spawning" (line 77) describe work already done. Per the user's note, only confirmed. Needs the user's gate ruling first (`long-run` §5.1).

3. **Wave template and phase-kickoff skill send new wave prompts to a file that is closed.** `.claude/skills/phase-kickoff/SKILL.md:17` and `template-wave.md:3`, vs `docs/plans/handoffs.md:3` and `docs/docs-writing-guide.md:41`.
   - Skill: "prepend to `docs/plans/handoffs.md` (newest first)"; template: "New prompts go to `docs/plans/handoffs.md`, newest first."
   - File: "*Historical record (closed 2026-10-25); current procedures: `docs/agent-rules.md` and the skills.*" The guide lists `handoffs.md` among records that "are not rewritten", and its table (line 15) calls it "the wave prompt archive".
   - So a wave kickoff cannot be written by the documented path without editing a record. Also `CLAUDE.md:169` repeats the claim.
   - Fix: choose where wave prompts go now (a new file, or reopen `handoffs.md` and drop the "closed" banner) and amend all four places. Needs-the-user (it is a procedure choice); the wording fix afterwards is mechanical.

4. **Kickoff pastes rules the template says to point to.** `docs/plans/next-session-prompt.md:38-41` vs `template-phase.md:19-20` and `phase-kickoff/SKILL.md:8-12`.
   - Kickoff: "Note §7 as ruled in #289 (Opus builds and fixes contract and safety code — every code stage here — and runs every verifier; Sonnet does recipes, fixtures, docs and live runners; **every agent at medium effort, `model` and `effort` passed explicitly in every Agent call**; slices per #271) and §8 (a step agent never ends its turn on a running child; #286, permanent)."
   - Template: "Models, fix rounds and commits are `agent-rules.md`'s: point, don't state." Skill: "A kickoff that restates any of them creates a second copy that drifts."
   - Same pasted text with a number at `:54` ("never read whole (about 460 KB)").
   - Fix: reduce to "read `docs/agent-rules.md`, §7 and §8 included"; drop the byte count or cite its command. Mechanical, but the kickoff is being replaced anyway (finding 2), so best folded into the next kickoff.

5. **Phase doc restates §7 models, effort and size cap.** `docs/plans/2026-10-26-step11b-block-list-redirects.md:264-267`: "Models and effort by `agent-rules.md` §7 as ruled 2026-10-26 (#289): Opus builds and fixes the code stages ... Sonnet builds the live helpers and docs and runs the live runner; **every agent at medium effort, passed explicitly**. Each code stage stays under about 600 new lines (#271); a builder that finds more stops DONE-PARTIAL." This is the rule in `agent-rules.md:139-150`. Fix: keep "every code stage here is standard" and point to §7. Proposed edit of a phase doc, so needs-the-user (open phase doc).

6. **Cleanup-pass area-cleaner brief template omits model and effort.** `.claude/skills/cleanup-pass/SKILL.md:20-26`.
   - Template has ROLE, SCOPE, OUTPUT only.
   - Rule: `agent-rules.md:143-144`: "Every brief states `effort`, and every `Agent` call passes `effort` and `model` explicitly"; the `step-agent` leaf template has a "MODEL / EFFORT" line.
   - Fix: add a "MODEL / EFFORT: <per the table>, medium" line to the template. Mechanical.

7. **Step-agent skill's size rule is not enforced in the record, and a rule gap shows.** `agent-rules.md:147-150` ("A builder that finds its slice larger than briefed stops and reports DONE-PARTIAL") vs `S2.md` §4: "647 new lines at round 1 against the ~500 cap (682 after the fix round). The builder ... reported DONE with the overrun flagged instead of DONE-PARTIAL. Accepted." It was recorded as a deviation, so not a hidden breach, but the rule has no stated consequence or exception (a "one coherent module" is what the step agent accepted). Fix: either add to §7 "the step agent may accept an overrun of one coherent deliverable, recorded as a deviation" or leave it. Needs-the-user.

8. **Fix-round rule has no clause for live-run loops.** `agent-rules.md:106-108,145` ("at most two per stage; a third only on an Opus fixer; if that fails, §3 item 9") vs `S4-live.md:3-5`: "fixers 0/0b (Sonnet) ... helper fixers 1 (Sonnet), 2, 3, 3b, 4, 4b, 5, 5b (Opus) ... live runners 1–8". Eleven fixer spawns and eight runner attempts over one stage; the report does not say how §7's cap applied (the S4-helpers report does: "fixer 3 ... the third round §7 allows"). Fix: add a line to §7 or §8 on whether fix rounds count per stage or per live attempt, or have S4-live.md cite the ruling. Needs-the-user.

9. **Committer and "checker" roles are not fully covered by the step-agent skill.** `.claude/skills/step-agent/SKILL.md:45` (heading "LEAF BRIEF (step agent → builder / verifier / fixer / runner)") and `:66-70` ("What a stage leaves": reports for "builder, verifier, fixer and runner"), vs the role line `:48` that includes "committer", and the steps dir: `env-check.md` ("checker · Sonnet" in `journal.md`), `Stage0-auditor.md`, `Stage0-measurer.md`, `S4-investigation.md`. `S2.md` §2 says the commit hash is "in the session ledger / `git log`" and `S4-helpers.md` §1 "in the committer's hand-back": a committer leaves no file, so the stage report cannot cite the hash. Fix: add committer to the heading and say where its hash is recorded (the step report's Outputs); name the checker/auditor/measurer roles in `agent-rules.md` §6 or fold them under builder/verifier. Needs-the-user for the roles; the heading is mechanical.

10. **`lean-procedures` plan header and Outcome contradict #289.** `docs/plans/2026-10-25-lean-procedures.md:3` ("Status: In progress"), `:12` ("Sonnet (effort high) builds and fixes low-risk stages; Opus verifies everything"), `:73` and `:107` ("builder Sonnet high"), vs `agent-rules.md:143` ("Effort is medium for every agent") and the Results block at `:137-153` (Step 11 closed; the trial concluded). Every other stage L1–L4 is "done". Fix: dated marker per guide rule 5 (`*Superseded 2026-10-27: effort high was ruled medium, #270/#289*`) and status flipped to Complete or "Paused: Revisit-if of #230 with the user". Needs-the-user for the status (it carries an open "goes to the user" Revisit-if).

11. **Skill descriptions carry a stale example.** `.claude/skills/long-run/SKILL.md:3`: "a build step (Step 11 file upload, …)". Step 11 is closed; the live phase was 11b and next is 12. Harmless but it is the first thing a reader of the skill list sees. Fix: replace with a generic "a build step" wording. Mechanical.

## Checked and consistent (no finding)

- Commit trailer: `agent-rules.md:195-196` and `CLAUDE.md` Conventions agree (one `Co-Authored-By`, no `Claude-Session`); the skills contain neither (`step-agent` says only "trailer: <trailer>"; `session-closeout` points to §10). The session-level system reminder asks for a `Claude-Session` line, but the repo rule takes precedence (the reminder says so).
- Never-end-turn rule #286: `agent-rules.md:158-161`, `long-run:44-45` ("You may end your turn on a running step agent" is the session agent, consistent with "Only the session agent ends its turn"), `step-agent:19-21`. All three agree.
- Models/effort: `agent-rules.md` §7, `cleanup-pass` table (Sonnet/medium for the first three areas, Opus for Decisions and Plan drift), `step-agent` templates agree. Journal and the sampled stage reports (S0F-a, S2, S3a, S4-helpers, S4-live, S5) record "medium" everywhere, Opus on code/verifiers, Sonnet on doers and committers, as ruled.
- Skills point rather than paste: `long-run`, `step-agent`, `phase-kickoff`, `session-closeout` cite `agent-rules.md` sections instead of restating them; the one number in `phase-kickoff` (1.5k budget) matches `scripts/doc-check.mjs` (`next-session-prompt.md` 1500). The kickoff is 1,043 words (`wc -w`), within budget.
- Order at a phase close (`long-run` §5.2, `session-closeout` §6, `cleanup-pass` §How 3) is the same everywhere, including the unmet-gate exception added since the base.

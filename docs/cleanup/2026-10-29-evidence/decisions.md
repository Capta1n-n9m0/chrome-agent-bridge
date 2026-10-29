# Cleanup pass 2026-10-29 — area: Decisions

Area cleaner (Opus, medium). Scope: `git diff 510b407..HEAD` (HEAD `db7da74`); `docs/decisions.md`,
`docs/decisions-archive/` (index, `step12.md`, `step11b.md`), and every `#N` citation in the living docs (root and
package `CLAUDE.md` files, `docs/*.md`, `docs/plans/2026-10-27-step12-phase-f.md`, `README.md`). Read only.

## Checked and clean

- **Every `#N` citation resolves.** A script took every `#N` from the living docs above and matched it against the
  `### … (#N)` headings of all nine archive files: 0 unresolved. The only number with no entry is #265, which the
  index already skips (`step11.md`: "#230–#264, #266–#288").
- **The archive index is right.** Entry counts, number ranges and date ranges of all nine archive files match
  `decisions.md:190-197` (for example `step12.md`: 53 headings, #321–#373, 2026-10-27 → 2026-10-29; `step11b.md`: 32,
  #289–#320, 2026-10-26 → 2026-10-27).
- **#318 is closed and marked.** It left Open decisions in this diff. Its entry carries
  `*Ruled 2026-10-27 by the user (#320 item 1): option (a).*` (`step11b.md:50`). Every other Step 11b entry the user
  ruled carries its dated ruling note (#292, #293, #295, #300, #303, #307–#309). No Step 11b open item is left.
- **Date + title citations.** Every one in the living docs matches its heading, apart from the shortened forms with
  "…" and findings 4 and 5 below.

## Findings

1. **`docs/decisions.md:25` — #351 is still listed as open, but both of its items are resolved.**
   - Open line: "2026-10-28 · Run 18's findings … (#351, items 1 and 2: product findings)".
   - Item (1), UP-OPT: `step12.md:254-256` (#363) says "found the helper's poll is the cause, not the page … **No
     product finding.**" `docs/e2e-test-plan.md:3529` lists `R19-UP-OPT` under PASS.
   - Item (2), the banner FAILs: `step12.md:24` (#373) says "Run 18's banner FAILs (#351 (2)) are marked not
     reproduced: a 20 s idle and a passing control read none." `e2e-test-plan.md:3529` lists `R19-UP-6  R19-F-RAW, -2,
     -DIR` under PASS. `extension/src/CLAUDE.md:68` already says "did not reproduce … (R19-UP-6, R19-F-RAW family, #373)".
   - The entry heading still reads "the banner FAILs carried to Run 19" (`step12.md:449`), with no note that says what
     happened to them.
   - **Fix:** remove line 25 from Open decisions. Add a dated italic note at the end of the #351 entry, in the form
     `step11b.md` uses: `*Resolved 2026-10-29: (1) no product finding, the helper's poll (#363), R19-UP-OPT PASS; (2) not
     reproduced in Run 19 (#373); (3) became #369.*`
   - **Type:** mechanical for the note, which is stale status. Removing the Open line drops an item the user was meant
     to review, so the lead should name it in the report's "fixed" list.

2. **`docs/decisions.md:10-30` — open items that the entries leave for the user are missing from Open decisions.**
   - The root `CLAUDE.md:27-30` names two of them as open: "The Open decisions in `docs/decisions.md`, among them …
     #355 (the formatter cap)" and "#372: whether to redact the local path and name in committed docs." Neither #355
     nor #372 is on the Open list.
   - The archive header claims the list is complete: "The entries still open for the user are listed in
     `decisions.md` → Open decisions" (`step12.md:5-6`).
   - Entries that say "for user review" or "the user's call" but are not listed:
     - **#355** (`step12.md:372-385`): "keeping the oldest lines (for user review …)"; "the `chooser` texts and the
       null/non-boolean rule for user review"; S5c's "explicit `chooser: false` … refused too (stricter than needed; for
       user review…)". Also cited as open in `docs/setup.md:745` and `docs/progress-and-roadmap.md:883`.
     - **#354** (`step12.md:389`): "**Decided (contract-level, for user review):** S6-G2 …", plus "`.then(release,
       release)` … listed for the gate's fix list".
     - **#353** (`step12.md:407, 418`): "**Decided (texts for user review):** … (a) is named to the user at the gate as
       what they see."
     - **#372** (`step12.md:43-46`): "the question, redact the docs going forward or leave them, goes to the user with
       the push (G12-1)."
   - **Fix:** add four Open lines, for #353, #354, #355 and #372, each with its item named as on the existing lines.
   - **Type:** mechanical. These are pointers to decisions already recorded as open, and no substance changes.

3. **`docs/decisions.md:10-30` — the Open lines have no options or recommendation.**
   - The guide asks for them: "A decision waiting for the user is listed under **Open decisions** … with the options
     and a recommendation" (`docs-writing-guide.md:86-87`).
   - Only #369 (keep, reproduce or drop) and #373 (two readings) name options. The other lines are bare titles, for
     example line 16: "`consoleMessages`: read on demand, the entry shape, class `tab` (#323), amended by #333, #334".
     The removed #318 line shows the expected form: "Options: (a) … (recommended); (b) …; (c) hold."
   - The phase doc's gate checklist does not carry them either. It covers exit checks and G12-0/1/2 only.
   - **Fix:** the session agent writes the options and a recommendation per Open line, or one grouped gate question
     list in plain language.
   - **Type:** needs-the-user / session agent, because it means writing decision substance.

4. **`docs/decisions.md:58, 154, 181` — Standing lines that do not carry their entry's title.**
   - The guide asks for "one line, its date + title" (`docs-writing-guide.md:89-90`). Lines 58 and 154 are new in this
     diff; line 181 predates it.
     - Line 58 reads "Step 11b closes; three fix rounds per stage, …". The heading (`step11b.md:8`) is "The user rules
       #318 and the cleanup proposals; Step 11b closes (#320)".
     - Line 154 reads "A bridge `back`/`forward` reaches only pages a human or an activating call acted on (#308)". The
       heading (`step11b.md:175`) is "Run 17's STOP predates Step 11b: Chrome's `back` skips pages with no user
       activation; RD-DISARM's FAIL is the helper's timing (#308)".
     - Line 181 drops the heading's middle clause: "UP-6/UP-6B's banner FAIL is not product evidence"
       (`step11.md`, #284).
   - Line 153 (#295) is a summary on purpose ("#295 as ruled by #311"), and its heading is "`newTab` stays uncovered
     until the user rules…". It is acceptable as written.
   - **Fix:** quote the heading's title, then keep the summary after the dash.
   - **Type:** mechanical.

5. **`docs/decisions.md:27-29` — Open lines whose titles differ from their headings.**
   - Line 27 reads "control-2 judged against". The heading (`step12.md:183`) reads "control-2 is judged against the
     old build's measured answer; the MCP actor waits for its link".
   - Line 28 is "liveB19: docked DevTools on Chrome 156 does not refuse …; keep, reproduce or drop …". The heading
     (`step12.md:105`) is "liveB19 closed at attempt 3; docked DevTools on Chrome 156 does not refuse the bridge's
     debugger".
   - Line 29 is a question with no title. The heading is "Run 19's record accepted; its findings go to the user and a
     later recipes-only wave (#373)".
   - **Fix:** use the heading title (shortened with "…" is fine), and put the question after it.
   - **Type:** mechanical.

6. **`docs/decisions.md:32-182` — no Step 12 entry is in Standing, although some still govern.**
   - **#321** (`step12.md:849-866`) is the user's ruling of Step 12's scope. It includes product promises that still
     bind: "`back`: (a) Chrome's rule is kept"; "G2 … becomes one **blocking** action". Every earlier user gate ruling
     is listed (#202, #229, #288, #311, #320). `progress-and-roadmap.md:892` cites "#321, G12-0" as standing ("stays a
     limit").
   - **#350** (`step12.md:467-479`) is a process rule. The root `CLAUDE.md:35-36` treats it as standing: "The first line
     of every step brief is the in-turn wait rule (#286, #350)". Its second half, "when the session agent receives a
     grandchild's completion notice, it checks … whether the step agent is still alive", is in neither
     `agent-rules.md` §8 nor the skills (grep).
   - **#367**'s per-slice budget: "three attempts and three fix rounds **per slice**" (`step12.md:174-175`). The root
     `CLAUDE.md:35` cites it as standing. It reads against `agent-rules.md:149-150`: "at most three per stage (#320),
     counted per stage and never reset by a new attempt".
   - **#372**'s rule: "Runner briefs from here name scan patterns only as 'the user's name'" (`step12.md:47`). It is in
     no rule file (grep of `agent-rules.md` and `.claude/skills/*`).
   - **Fix:**
     - Add a Standing line for #321 under "How we work" or the product promises. This is mechanical, a pointer to a user
       ruling.
     - Add Standing lines for #350 and #372, or put their rules in `agent-rules.md` §8.
     - Reconcile #367 with §7: either "per slice in a live wave" goes into §7, or the user confirms it.
   - **Type:** #321's line is mechanical. #350, #367 and #372 are needs-the-user, because they change rules.

7. **`docs/plans/2026-10-27-step12-phase-f.md:625` — the gate checklist cites #351's banner FAILs with no Run 19
   outcome.**
   - Row R1.4 reads "met (5 rows FAIL with a passing control, #351)". This is true of Run 18. A reader at the gate
     cannot see that four of the five did not reproduce (#373) and that UP-OPT was the helper's poll (#363).
   - **Fix:** append "; in Run 19 R19-UP-OPT passed (#363) and the banner rows did not reproduce (#373)".
   - **Type:** mechanical, stale status.

8. **`docs/plans/next-session-prompt.md:1, 49-55` — a stale kickoff that cites decisions as live in `decisions.md`.**
   - The title reads "resume at S7-drivers-C". Line 49 tells the reader to read "`docs/decisions.md`: Open decisions,
     then the S7 chain … (#351); #356–#359 …". Those entries are now in `decisions-archive/step12.md`, and Step 12 is
     closed out.
   - The citations still resolve by date + title, but the prompt sends a fresh session to a resume point that is gone.
   - **Fix:** replace it, or mark it superseded by the close-out. This is the State area's call.
   - **Type:** mechanical pointer. The kickoff itself is the session agent's.

9. **`docs/e2e-test-plan.md:3505` — Run 18's record repeats a proposal that #351 narrowed, with no note.**
   - The record reads "keep the banner FAILs open with an attach-count instrument in Run 19".
   - #351 ruled the opposite (`step12.md:456-457`): "**No new product counter is built** to tell which call attached".
   - The sentence correctly reports the record's own section 6, so this is low priority.
   - **Fix (optional):** append "(ruled without the instrument, #351 (2))".
   - **Type:** mechanical.

## Counts

Raised 9: mechanical 6 (1, 2, 4, 5, 7, 9; 8 is a pointer for the State area), needs-the-user 2 (3; 6 except #321's
line). The script's summary is `docs/cleanup/2026-10-29-evidence/doc-check.txt`. It flags no decisions items, and its
count lines (25 tools, 28 methods, 27 codes) match the root `CLAUDE.md:17`.

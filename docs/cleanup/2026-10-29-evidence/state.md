# State area — cleanup pass 2026-10-29 (Sonnet, medium)

Base 510b407..HEAD db7da74. Counts checked: doc-check (25 tools, 28 router methods, 27 codes; test count 5596 matches
CLAUDE.md:117), `git rev-list --count origin/main..HEAD` = 91 at HEAD, 90 at HEAD~1. Not re-run: `npm test`
(doc-check compared against the stated count only).

1. **docs/plans/next-session-prompt.md:1,8-11,30-50 (whole file) — stale kickoff for a resume point that no longer exists.**
   Title: "Step 12: Phase F, ergonomics — resume at S7-drivers-C". Body: "What is left is **Run 19** … then the docs and
   the phase close"; "The tree is not clean, on purpose … S7-drivers-C's uncommitted work"; "Commits not pushed: 54".
   Against: CLAUDE.md Current state "Step 12 built and Run 19 recorded; the gate waits for the user"; journal "S8 … ended
   `87aa919`", "close-out … ended"; status shows only `docs/cleanup/2026-10-29-evidence/` untracked. Pasted into a
   fresh session it would send an agent to rebuild finished work. Fix: replace with the next kickoff when the user names
   the next step, or at minimum a one-paragraph "Step 12 closed 2026-10-29, no kickoff pending; see CLAUDE.md Current
   state". Needs-the-user (which step is next; the skill `phase-kickoff` writes it).

2. **docs/progress-and-roadmap.md:5 (Status) — "next: the phase close and the user's rulings on the open decisions".**
   Against: db7da74 is the close-out ("Step 12 close-out — gate checklist, Current state, CLAUDE.md gotchas, decisions
   archived"); CLAUDE.md says "The next step is the user's to name." Fix: "next: the user's rulings (G12-2, the Open
   decisions, #372) and the user naming the next step; the phase doc's gate checklist is written (2026-10-29)".
   Mechanical.

3. **docs/progress-and-roadmap.md:874 — "(Step 12 S8; Step 12 is built and Runs 18 and 19 have run, the close is the
   session agent's)".** The close is written (db7da74). Fix: "Step 12 closed its build 2026-10-29; the gate waits for the
   user" or drop the clause. Mechanical.

4. **docs/progress-and-roadmap.md:758-766 (§5 Roadmap "Updated" chain) — ends at "Updated 2026-10-27 (close): Step 11b
   closed (#320); next: Step 12 (Phase F)."** No dated note says Step 12 is built; only the Phase F paragraph at 874 and
   the §1 table row (173) do. Fix: append "*Updated 2026-10-29 (Step 12 close-out): Step 12 built, Runs 18 and 19 recorded,
   gate waits for the user; next: the user names it (Phase F follow-ups or Phase G).*" Mechanical.

5. **docs/progress-and-roadmap.md §1 (lines ~145-200) — no "Step 12" block, and the per-step test-count chain
   (lines ~183-194, "Updated … Step 11b — 4665 tests in 191 files") stops at Step 11b; line 196 "**24 tools**" heading of
   the tools list.** The Status line (5) and the table row (173) carry 25 tools / 5596 tests, so the list at 196
   contradicts them: "**24 tools** (superseded 2026-10-26: was 23 …)" vs Status "25 tools … 5596 unit tests green".
   Also :287 "**27 router methods**" is inside the Step 11 block (historic, fine). Fix: add "Updated 2026-10-29 (Step 12
   S8): 5596 tests in 235 files" to the chain; make line 196 "**25 tools**" with a "superseded 2026-10-29: was 24,
   because `browser_console_messages` was added" note and add `browser_console_messages` to that list (check the list
   at 196-200 names it). Mechanical (list check is the only reading needed).

6. **CLAUDE.md:26 and docs/plans/2026-10-27-step12-phase-f.md:657 — "90 commits are not pushed" / "lists 90 commits".**
   Against: `git rev-list --count origin/main..HEAD` = 91 at HEAD (90 at HEAD~1; the close-out commit adds one).
   A fixed count goes stale with every docs commit. Fix: "about 90 commits (91 at db7da74)" or "commits since
   Step 11b's push (`git rev-list --count origin/main..HEAD`)". Mechanical. (The phase doc row is dated
   2026-10-29 and was true when written; only CLAUDE.md:26 needs the change.)

7. **docs/plans/2026-10-27-step12-phase-f.md:3 — Status line "In progress; G12-0 ruled 2026-10-27 (#321); Stage 0 done
   (`de8ea69`)".** Against its own § Gate checklist (2026-10-29): "Not every item is met … G12-2 open for the user".
   Fix: "Built 2026-10-27/29; Run 18 and Run 19 recorded; gate checklist 2026-10-29: G6.1-G6.4 not run (G12-2, #337),
   G12-1 not granted; waits for the user". Mechanical.

8. **README.md:56 — "Step 12 (Phase F, ergonomics; built, Runs 18 and 19 run, not closed)".** "Not closed" is true
   (the user's gate), but after the close-out the repo's own words are "built and recorded; the gate waits for the
   user" (CLAUDE.md block, roadmap table). Low severity; keep unless the user rules otherwise. Optional wording fix:
   "built, Runs 18 and 19 recorded; waits for the user's rulings". Mechanical, optional.

9. **CLAUDE.md:120 - "all seven exit 0 at Step 11b S4-helpers" (unverified, low).** Step 12 changed `recipes/tsconfig.s11b.json` and added about 20 recipe files; `...-steps/S8.md` states no recipes-tsconfig result (grep: none). Fix: run the seven `tsc --noEmit -p recipes/tsconfig*.json`; if green, write "at Step 12 S8". Needs a command run, then mechanical.


10. **docs/plans/handoffs.md:1-8 — header says "reopened 2026-10-27, #320" and lists W2 as newest; the file ends at
    the 2026-10-24 wave.** Nothing in it is wrong about Step 12 (no wave was written). No finding beyond: confirm
    no handoff is owed for Step 12 (next-session-prompt.md carries it, see 1). No action.

11. **docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:20-28 (status header).** It stops at Step 11 ("24 tools
    … 27 router methods … not closed") with a correction pointing to the roadmap for current status. Since the
    pointer is in place and Step 12 notes are in §10 (checked by the header's chain), no change. Listed as checked,
    not a finding.

Checked and consistent: CLAUDE.md:17 (25 tools, 27 codes, 28 methods) vs doc-check; CLAUDE.md:92 "25 tools" (mcp);
CLAUDE.md:117 (5596 / 235) vs the roadmap Status and README:66; daemon/extension CLAUDE.md "28 router methods";
mcp/CLAUDE.md; docs/setup.md:137 "25 tools"; decisions range "#321–#373" in the Current state vs the phase doc and
journal; Run 19 verdict counts (42/5/5/3/3 over 58) identical in CLAUDE.md, roadmap Status, README and the phase doc.
No package CLAUDE.md carries a stale "24 tools"/"27 router methods" (grep).

# State area cleaner — cleanup pass 2026-10-30 (full, Step 13 close-out)

Read: root `CLAUDE.md`, `docs/progress-and-roadmap.md` (header, §1 Step 12/13 rows, §5 Phase F/G), the Step 13 phase doc
(header, § As built, Gate checklist, Follow-ups), `docs/decisions.md` (header, Open decisions), `docs/plans/next-session-prompt.md`,
`docs/plans/handoffs.md`, package `CLAUDE.md` status text, `README.md` numbers, `git log -70`, `doc-check.txt`.
Checked and consistent: the Current state block's Step 13 facts (commit ids S1 `8f6fc4d`, S2 `3ca60bd`, S3b `22d2217`,
S4 `b3cbe84`, record `2c2c214`, S6 `1b4483d`), the 34 verdicts (20+8+1+3+2), the open-item list (#417, #419, R20-ARGS-ORDER,
#385, #389, #374 item 3) in CLAUDE.md, roadmap line 5/174, phase doc Gate checklist and Open decisions; the test count 6030 /
251 files (no test file changed after `f6bafc5`: `git diff --stat f6bafc5..HEAD -- '*.test.ts'` is empty); counts 25/28/27.
`handoffs.md` holds only wave prompts up to W2 and names no Step 13 state: nothing to fix.

1. **`CLAUDE.md:28`** — a dead path (doc-check "Dead paths").
   - Wrong: "Step 13's close (decisions to `docs/decisions-archive/step13.md`)"; the file does not exist
     (`ls docs/decisions-archive` ends at `step12.md`) and the phase is not closed.
   - Fix: drop the backticked path and the archive clause: "**Next:** the user's rulings, then Step 13's close and a minimal
     Phase G for the user's own use; its kickoff waits for the ruling (`long-run` §5)."
   - Mechanical.

2. **`docs/plans/next-session-prompt.md` (whole file; doc-check flags `:15`)** — the spent resume kickoff, now false in
   every state claim.
   - Stale: title/`:1` "Step 13, resumed at Run 20's slice B (after a power cut)"; `:10` "Run 20's first live slice (liveA20)
     is recorded ... building the driver for slice B"; `:15` "**Resume:** read the root `CLAUDE.md` Current state ... journal's
     last RESUME POINT line is the plan"; §1 check 2 "The tree is B3 and nothing else" (B3 is committed, `39b51cd`); §3 "The
     remaining work" (close B3, #407 addendum, B4, drivers-C, liveB20, liveC20, record, S6 are all done: `39b51cd` ... `ee8928c`);
     §6 "G1.4 comes first" (met). Against: CLAUDE.md Current state "Step 13 built and Run 20 recorded; the gate waits for the user".
   - Fix: the file is the spent kickoff of a finished session and no later kickoff may be written before the user rules
     (`long-run` §5, user constraint). Replace its body with a short stub: one line saying "No kickoff is pending: Step 13's
     gate waits for the user's rulings (#417, #419, R20-ARGS-ORDER, #385, #389, #374 item 3); the next kickoff, a minimal Phase G,
     is written after them", and drop the stale resume prose (git history keeps it). That also clears the doc-check flag.
   - Needs the user only in this sense: it is a choice between stub and delete; the content is mechanical either way.

3. **`docs/plans/2026-10-29-step13-phase-f-followups.md:3`** — the phase doc's Status line.
   - Wrong: "**Status:** Planned; G13-0 met by #374". Against: the same doc's § As built (Stage 0, S1, S2, S3b, S4, S5, S6 built)
     and its Gate checklist ("The phase is not closed").
   - Fix: "**Status:** Built and Run 20 recorded (2026-10-30); not closed, the gate waits for the user (#417, #419, R20-ARGS-ORDER);
     G13-0 met by #374".
   - Mechanical.

4. **`docs/decisions.md:11-13`** (Open decisions) — the section opens "None" and then lists open decisions.
   - Wrong: "None. The user ruled Step 12's gate on 2026-10-29 ... every item listed here before was settled by it." followed at
     `:15` by "For Step 13's gate ... #385 ... #389 ... #417 ... #419 ... R20-ARGS-ORDER". A reader of the first word reads "nothing
     open"; CLAUDE.md says six items wait.
   - Fix: rewrite the lead as "Step 13's gate (the phase is not closed). Step 12's items were all settled by #374 ... The
     following wait for the user (contract-level; the run went on with the conservative option, recorded in the Log):". Also add
     #374 item 3 (the #369 reword), which is only inside the #419 bullet, as its own named item if the user wants it called out
     (CLAUDE.md names it separately).
   - Mechanical (wording); the content is unchanged.

5. **`CLAUDE.md` Reloads bullet (about line 46)** — the proof of the loaded build cites a closed step.
   - Wrong: "The loaded extension is the HEAD build, proven by liveE19's closing R19-0 re-run." Step 13 changed extension code
     after Run 19 (S1 `webNavigation` join, S2, S3b, S4), so R19-0 cannot prove today's build. Against:
     `S5-run-record.md` R5.2: "R20-0, 0B, 0C prove the loaded build ... `LOADED20 ... args=answered`" and R20-0B "HEAD a5476bfc78f4
     ... S4 commit=ancestor".
   - Fix: "The loaded extension is Step 13's build (S4 an ancestor), proven by Run 20's R20-0, R20-0B and R20-0C rows (R5.2); extension
     code has not changed since S4."
   - Mechanical (verify "no extension code after S4" with `git log --oneline b3cbe84..HEAD -- extension/src` before writing it).

6. **`CLAUDE.md:117`** (Commands, recipes typecheck line) — an old project count.
   - Wrong: "(tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b cover the others; all seven exit 0, 2026-10-29 cleanup pass". Against:
     `recipes/tsconfig.s13.json` exists, `recipes/CLAUDE.md:39` lists `.s13`, and the spent kickoff says "all eight".
   - Fix: add `.s13`, say "all eight exit 0, <date of the last run>" (the lead's gate run supplies the date and result; do not
     keep "2026-10-29" unless re-run).
   - Mechanical once the lead has the run.

7. **`docs/progress-and-roadmap.md:5`** — the Status line.
   - Not false but the lead item is a single paragraph carrying six steps of "Superseded ..." history (about 11 k characters) before
     the current claim's number line; the current Step 13 claim is correct. Not a state error; flagged for the Procedure/size
     reader only.
   - Fix: none required for accuracy; optional move of Steps 6–12 history into their step blocks, which already exist.
   - Needs the user (taste/size), low priority.

8. **`docs/progress-and-roadmap.md:174`** (Step 13 row) vs **`CLAUDE.md` Next** — consistent, but both say "S6 docs" without the later
   close-out commits (`ee8928c`, `7ff7036`, `cd955c0`: gate checklist, Open decisions, package CLAUDE.md facts). Not an error; only
   to note that the Current state block's "S6 docs done (`1b4483d`)" omits that the package CLAUDE.md facts were applied (`7ff7036`)
   and the #369 reword was not (it waits, #374 item 3). The block's #419 bullet already says the reword waits: no fix.
   - No change.

Count: 6 findings to fix (1-6), 2 notes (7-8, no change required).

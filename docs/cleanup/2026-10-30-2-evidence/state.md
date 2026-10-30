# State area (cleanup pass 2026-10-30-2)

Checked: CLAUDE.md Current state and Commands, docs/progress-and-roadmap.md header and rows, the Step 14 phase doc
(As built, gate checklist), README.md, docs/setup.md, docs/plans/next-session-prompt.md, package CLAUDE.md files,
git log. The 6089 count and every other number in the state block are true; the only defects are in README.md.

1. **README.md:96 and the Step 14 paragraph (:92-94): stale test count.**
   Says: "6030 unit tests green in 251 files (`npm test` 2026-10-30, HEAD `f6bafc5`)". CLAUDE.md:112 and
   progress-and-roadmap say 6089 passed, 255 files. doc-check only flags CLAUDE.md, so it missed this.
   Fix: "6089 unit tests green in 255 files (`npm test` 2026-10-30, Step 14)" plus a "Superseded 2026-10-30: was 6030 in
   251 files, because Step 14's tests landed" note in the file's own style. Mechanical.

2. **README.md:90: "Step 13's build is not pushed."**
   Contradicts CLAUDE.md:16 ("Step 13 was found on origin at Step 14's start") and `git log origin/main..HEAD`, which lists
   exactly 8 commits, b9ac1bf..9d2313d, all Step 14; 49e1908 (Step 13 close) is on origin.
   Fix: delete the sentence or write "Step 13 is pushed." Mechanical.

3. **README.md:92: "Step 14 (Phase G, your own devices; in progress)."**
   Contradicts CLAUDE.md:14 ("Step 14 built; the gate waits for the user") and the phase doc's Status ("Built; the gate
   waits for the user (#432, G14-1)"). Suggested: "built 2026-10-30, not pushed; the gate waits for the user (#432, the push)".
   Mechanical.

4. **CLAUDE.md:112 "6089 passed" (doc-check notice): confirmed correct, no change.**
   Sources: `S2b-verifier2.md:15` "npm test: 6089 passed, 255 files, exit 0"; `S3-verifier.md:28` main tree "255 files,
   6089 tests, exit 0, the same as at 6d06594"; `S5-verifier.md:30` clone "6080 passed, 9 failed (6089) in 255 files" (the 9
   known CRLF reds, a Follow-up). No code changed after S3 (S4, S5, close-out are docs). The doc-check notice is only
   the reminder that the number needs a source; the records above are it. No fix. Optional (needs the user): none.

5. **docs/plans/2026-10-30-step14-phase-g-own-devices.md:109, :189 name `docs/install.md`.**
   doc-check lists it as a path that does not exist. Line 189 already says "not made: the section went into
   `docs/setup.md`"; line 109 (the Stages table, the alternative) does not say it. Fix: add "(not made; see As built)" at
   :109, or accept the doc-check line as known (the S5 verifier did). Mechanical, low value.

6. **Checked, no defect.**
   - CLAUDE.md counts "25 tools, 27 codes (26 on the wire), 28 router methods" match doc-check.
   - progress-and-roadmap.md header (:5), the Step 14 row (:175) and CLAUDE.md state block agree: built, not pushed, gate
     on #432 and G14-1; Open decisions in docs/decisions.md holds exactly #432.
   - Phase doc Status line and gate checklist agree with the verifier files (all 10 rows have a source).
   - next-session-prompt.md is still Step 14's kickoff by design (its "expect 6030 in 251 files" and "Step 13 maybe not
     pushed" are kickoff-time statements; leave, to be replaced at the next kickoff).
   - No local path or user name found in CLAUDE.md, README.md, docs/setup.md, progress-and-roadmap.md, the phase doc,
     next-session-prompt.md or the package CLAUDE.md files (grep for `C:\Users` and the user name: no hits).
   - CLAUDE.md Commands lists `setup`, `doctor`, `bridge-update`; the Step 14 gotcha is in recipes/CLAUDE.md:202.
   - CLAUDE.md:15-24 note: the Stage 0 commit b9ac1bf still holds one absolute-path evidence line; the squash before the
     push is the user's call (needs the user; already recorded there, so listed here only as an open item for the push).

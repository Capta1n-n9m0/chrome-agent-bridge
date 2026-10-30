# S5 builder report (Step 14, docs)

Model: Sonnet, medium effort. 

1. **Verdict:** DONE (D5.1 awaits the verifier's walk on the scratch clone).
2. **Outputs:**
   - `docs/setup.md`: new first section "Install on a new device" (prerequisites, clone, `npm run setup` with its order,
     the one clipboard question, Win+V note, exit codes 0/1/2, `--dry-run`, `--replace-mcp`; Chrome steps as setup prints
     them; `/mcp`; `npm run doctor` with OK/HINT/FAIL and the #432 heuristic named; `npm run bridge-update`,
     `--no-reload`; pointer to scripts from any folder). Old §1–§4 moved under "Manual install (what setup does by
     hand)" as `###` headings keeping their numbers 1–4 (so "§N" still holds), the Step 6 upgrade history kept whole
     (now `####`). S3's section placed once, as "Scripts from any folder" under Writing a script (copy in S3-doc-section.md
     stays the source file). `start-bridge.sh`: one line in the manual section saying it is a macOS-only launcher, not
     the Windows way (choice: it was not explained anywhere; file kept).
   - Cross-references: `docs/e2e-test-plan.md` §3 pointer and setup.md's own §4 pointer now say "Manual install §N".
     Left unchanged: historical plan/as-built docs and `docs/plans/next-session-prompt.md` (point at the old numbers,
     which still hold). Root `CLAUDE.md:121` ("`docs/setup.md` §4") is the session agent's: see proposals.
   - `README.md`: Quick start (clone, setup, load extension, doctor, update); Step 13 paragraph rewritten to "closed
     2026-10-30, #420", Run 20 numbers as in root CLAUDE.md (24/4/1/3/2); a Step 14 in-progress paragraph.
   - `S5-claude-md-proposals.md` (three npm scripts, scripts typecheck, examples/, the §4 wording).
   - `S5-builder-doccheck.txt`: `node scripts/doc-check.mjs` exit 0; the only path finding is the planned
     `docs/install.md` (not created; the phase doc is untouched); the test-count line at CLAUDE.md:113 is the usual notice.
3. **Deviations:** none. No code, test, CLAUDE.md or phase-doc edit; build/test/typecheck not run (docs only).
4. **Findings:** the repo URL in the clone line is `origin`'s (a public GitHub URL, no user path). The README still
   carries its older "Corrected/Superseded" history lines; the test-count text there (6030/251) matches CLAUDE.md.
5. **Handoff:** verifier should follow only the new section on the scratch clone; the README quick start says
   "every line should say OK", true only with the extension loaded and a client connected (else a HINT, as the section says).

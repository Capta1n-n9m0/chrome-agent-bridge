# S8-fixer2 — Docs (Step 11b), fix round 2

Claude Sonnet 5.5, medium, 2026-10-27. Fixes N1–N4 of S8-verifier2. Lane files only. No commit; daemon untouched.

| Finding | Result |
|---|---|
| N1 | Fixed. setup.md: "holds the rules since Step 11b (below; measured on a redirect hop, R17B-BACK, R17B-FWD)". |
| N2 | Fixed. The progress Step 11b block is rewritten in place: no Superseded/Updated appendices; "D4.3 is part (ruled, #311)"; S6/S7 stages and Run 17b results folded into the sentences; one Corrected tag kept for the old "Next" label. |
| N3 | Fixed. Progress: "Not pushed since `ce1f06d` (push granted, #311)" (`git rev-parse --short origin/main` = ce1f06d); same wording in proposal (d). |
| N4 | Fixed after checking `handlers/history.ts` (`settleWait`, 10 s, when `call.holdsRules()`) and `recipes/CLAUDE.md:151` (Run 17's helper facts bullet exists): (b) says "while the call holds rules, wait for the load it starts, at most 10 s, #302"; (f) names a new "Run 17b's helper facts" group after line 151. |

## Outputs
- `node scripts/doc-check.mjs`: exit 0; "Checked 37 living docs (5 closed phase docs skipped for paths and status)."; only the known flag `CLAUDE.md:112  4535 passed` (session agent's, proposal (d)).

## Notes
- I did not verify "#302" in decisions.md (taken from the verifier's N4 text); the session agent should confirm before applying (b).
- The phase doc note for the session agent was not acted on (outside the lane).

# S8-fixer — Docs (Step 11b)

Claude Sonnet 5.5, medium, 2026-10-27. Fixes S8-verifier V1-V12. Same five files only. No commit; daemon untouched.

| Finding | Result |
|---|---|
| V1 | Fixed. setup.md back/forward bullet now reads as the verifier proposed: rules hold; measured once each on an activated history; no cite of the uncommitted helper file; R17B-ACT-CTL stays only in the paragraph about what `back` can reach. |
| V2 | Fixed. The upload-row sentence is deleted from setup.md. progress now says "not Step 11b claims; each fails on a helper or sheet defect or an unestablished banner reading (#318)". |
| V3 | Fixed. "one more entry (by design, #311; not measured)". |
| V4 | Fixed. One Superseded marker after the Redirects list covers the three dropped claims (newTab first request, back/forward not measured, "or back/forward can make Chrome load it"). |
| V5 | Fixed. Status line rewritten (gate accepted #311; S6 and Run 17b done; close waits on #318) with a Superseded marker; the stale "newTab escapes" and "gate awaits" clauses are marked superseded. |
| V6 | Fixed. Table row uses the proposed wording. |
| V7 | Fixed. Proposal (b) has exact insertions; new (f) gives three recipes bullets (global scope #317, one capture path #318, banner sampler, record §5 finding 4). No CLAUDE.md edited. |
| V8 | Fixed ("more calls"). |
| V9 | Fixed ("Since Step 11b, `browser_new_tab` with a URL opens a blank page first"). |
| V10 | Fixed. Comment re-wrapped; says newTab borrows a `navigate` handle via `callDeps.dnrForTab`. Comment only. |
| V11 | Fixed. (d) adds the push state and the 4665/191 count; progress says "Not pushed (S6-S8)". |
| V12 | Fixed ("message length equal"). |

## Outputs
- `node scripts/doc-check.mjs`: exit 0; "Checked 37 living docs"; only the known flag `CLAUDE.md:112  4535 passed` (the session agent's, proposal (d)).
- `npm run typecheck`: all five `tsc -p` projects, no errors.
- `npm run build`: "built extension → dist/".

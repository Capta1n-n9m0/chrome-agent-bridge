# S5-builder — docs

Claude Sonnet 5.5, medium effort. Docs only: no `npm test`, `typecheck` or `build` was run (nothing but `.md` changed).

## 1. Verdict
DONE (with one claim not written, see Deviations).

## 2. Outputs
`git diff --stat`: `S4-run-record.md` 2, `docs/progress-and-roadmap.md` 26, `docs/setup.md` 31; 39 insertions, 20
deletions (about 51 changed lines, under the 150 cap). New file: `S5-claude-md-proposals.md` (not counted).
`node scripts/doc-check.mjs`: exit 0; last line `Checked 36 living docs (5 closed phase docs skipped for paths and status).`
It warns that `extension/CLAUDE.md` is 3733 words against 3500 (not my change; the file is untouched).

Changed sentences and their citations:
- `docs/setup.md` Safety, "What the block list does not do": the old "a redirect hop is still requested" text is replaced by
  a "Redirects, since Step 11b" paragraph.
  - `navigate` and `downloadStart` hop never sent, blocked server 0 (was 1): RD-1, RD-3; before: Run 13 SAFE-5b, Run 14 R14-5c.
  - Rules follow the list: RD-4, RD-5, RD-5b.
  - `newTab` first request escapes: RD-2, #295.
  - `back`/`forward` hold rules while waiting: #302; redirect through them not measured: RD-BACK FAIL, RD-FWD NOT RUN, #308.
  - Human's own browsing unchanged: RD-6, #290 (0.4 (C)).
  - Page-started requests after the call: phase doc 0.9.
  - `back` limit (Chrome skips pages no human acted on; 26 of 26): #308.
  - The R14-5c sentence is shortened to the Run 14 fact only; its Superseded marker is kept.
- `docs/progress-and-roadmap.md`: the "Next — Step 11b" block rewritten in place as "Step 11b … built, gate not met": RD-1,
  RD-3, RD-6, RD-2 (#295), RD-BACK-EMPTY STOP (#307), cause #308, D4.3 and D4.6 not met (#309); with a dated correction.
  Also corrected two other stale statements of the old limit, both with a dated marker: Known limitations (~line 695;
  RD-1, RD-3, RD-2, #295) and the Phase E "Not built: blocking a redirect hop" (~line 798; RD-1, RD-3). The top Status line is untouched.
- `S4-run-record.md`: one dated correction paragraph (2026-10-27, S5) before "Judgment words", covering lines 35, 73 and
  122: the refused `back` started from the 8091 flip page. Checked against `recipes/s11b-rules.ts` `historyPlan("fwd")`
  (last URL is `localhost:8091/h/fwd`) and `S4-record-verifier2.md` M1. Judgment text not rewritten.
- `README.md`: states no redirect limit. Its only sentence is "The block list is not a network firewall", which is still
  true; no change. `docs/e2e-test-plan.md` §5 Run 17 entry (lines 3017-3097): no port 80xx or 809x appears; no change.
- Other setup.md sentences: grep "redirect" found the network-log lines (672-673), the `browser_download` row (161,
  "cross-origin redirects followed") and the Uploading section; none states the old limit. Line 1146 ("not a network
  firewall") stays true.

## 3. Verifier verdict
Not yet verified.

## 4. Deviations
- **Not written:** that a bridge `back` or `forward` whose hop lands on a blocked host is never sent. The brief listed it
  under RD-1/RD-3, but RD-1 is `navigate` and RD-3 is `downloadStart`. RD-BACK is FAIL (INTERNAL, and one request so not
  discriminating), RD-FWD is NOT RUN, RD-BACK-SAMEDOC and RD-BACK-EMPTY have no redirect. So setup.md says only that
  they hold the rules (#302, built) and that Run 17 did not measure a redirect through them.
- The e2e-test-plan §5 entry was not changed (no port named there).
- Extra edits outside the brief's list, same lane (`docs/progress-and-roadmap.md`): the two stale limit statements above.

## 5. Proposed decisions
None.

## 6. Findings
- `extension/CLAUDE.md` is over its word budget (3733 vs 3500); doc-check still exits 0. A rewrite of the firewall bullet
  (proposal (a)) is about the same length.
- The F1 pages: `S4-live-run7A-record.md` and `S4-live-runner6.md` do not name the port of the refused `back`; the evidence
  is the helper source (`historyPlan`) plus the verifier's reading, not a line of the record.

## 7. Handoff
`S5-claude-md-proposals.md` has (a) the firewall bullet, (b) the `back`/`forward` gotcha for
`extension/src/handlers/CLAUDE.md`, (c) four recipes candidates, (d) the two S3b NITs. Nothing running; nothing
committed.

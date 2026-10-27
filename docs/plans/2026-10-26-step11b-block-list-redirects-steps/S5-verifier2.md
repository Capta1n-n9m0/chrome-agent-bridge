# S5-verifier2 — docs, round 2

Claude Opus 5.5, medium effort. Read and run only; this report is the one file written. Re-checks only round 1's
MINOR 1–4 and NIT 1, 2, 5 (`S5-verifier.md`) as fixed by `S5-fixer.md`. NIT 3 and NIT 4 were left on purpose and are
not re-judged. Docs only: no typecheck, test or build.

## Verdict

**PASS-with-notes.** All seven items are fixed, and the fixes add no new problem. One NIT below is not caused by the
fixer.

## Items

| Item | Result | Evidence |
|---|---|---|
| MINOR 1 | fixed | `S4-run-record.md:12` now names "the RD-FWD row, attempt 6A's row and the STOP-rules row", with no line numbers. Rows 37, 75 and 124 are byte-identical to HEAD's 35, 73 and 122. Lines 13 onward are identical to HEAD's 11 onward (`diff`, empty). |
| MINOR 2 | fixed | Roadmap Step 11b paragraph: "Gate check D4.3 is part (RD-2's leak; the user rules which reading holds) and D4.6 is not met (#309)". This matches #309's heading "D4.3 part, D4.6 not met" and its text at `decisions.md:197`. |
| MINOR 3 | fixed | `setup.md:975-977`: `*Superseded 2026-10-27: was "A redirect hop is still requested … not built", because Step 11b built the rule (Run 17 RD-1, RD-3).*` This follows writing guide rule 5 ("was X, because Y"). |
| MINOR 4 | fixed | Known limitations (`progress-and-roadmap.md:696-699`) now reads `*Superseded 2026-10-27: was "a redirect hop … can still load a blocked host", because …*`. The new text "so can a `newTab`'s first request" is supported by RD-2 (blocked 1) and #295. The Phase E line now says "Not built: an allow-list mode", followed by a Superseded marker for the redirect item that keeps `newTab` uncovered (#295). The sentence no longer contradicts itself. |
| NIT 1 | fixed | "a pattern added just before or during a call counts (RD-5, RD-5b)". This matches RD-5 (a save within 1 000 ms before the call) and RD-5b (a save at 1 s during the call) at `e2e-test-plan.md:1632-1633`. |
| NIT 2 | fixed | "with the pattern removed, the same redirect loads (RD-4)" is the row's own wording ("BLK removed", `e2e-test-plan.md:1631`). The fixer did not add the optional #293 citation. "The same answers as before" is still supported by #293 (`decisions.md:417-423`), so leaving it out is acceptable. |
| NIT 5 | fixed | Proposal (a) now ties each baseline to its row: "before: 1 (`navigate` SAFE-5b, `downloadStart` R14-5c)". It flags that the `res.url` post-check clause (#140, #154) must be kept (rule 7) or moved to the handler's CLAUDE.md. |

## No new problem

- `node scripts/doc-check.mjs` exits 0. Its last line is `Checked 36 living docs (5 closed phase docs skipped for
  paths and status).` Its one warning, `extension/CLAUDE.md` over its word budget, is about a file S5 did not touch.
- No block-list pattern, token or user path appears. I searched the added lines of `git diff HEAD` and the new step
  files for `aliev`, `Users`, `bank.example`, a run of `a`, `alias7`, `8085` and `token`, and found nothing.
- The changes stay in lane. `git status --short` shows only `S4-run-record.md`, `docs/progress-and-roadmap.md` and
  `docs/setup.md` modified. The new files (`S5-builder.md`, `S5-claude-md-proposals.md`, `S5-fixer.md`,
  `S5-verifier.md`) are all in the steps directory.
- The size stays under the cap. numstat is 2+0, 17+12 and 24+9, which makes 64 lines. Adding the 71-line proposals
  file gives about 135, under ~150.

## Note

**NIT — `setup.md:996-998` (from the builder, not this round).** The last sentence of the old R14-5c paragraph, "and
the test server saw the redirect hop and the target each requested once", is gone with no marker. Its fact is still
stated in the new paragraph ("before Step 11b it saw 1 (… Run 14 R14-5c)"), so nothing measured is lost. A close-out
may add it to the marker at :975.

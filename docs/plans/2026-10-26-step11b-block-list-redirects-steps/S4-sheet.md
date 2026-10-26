# S4-sheet — Run 17's wave sheet (step report)

Step agent: Claude Opus 5.5, medium effort. Risk: low (docs slice). Children: builder Sonnet/medium, fixers Sonnet/medium
(two rounds), verifiers Opus/medium (three: the full check and two re-checks), committer Sonnet/medium.

## 1. Verdict
DONE. `docs/e2e-test-plan.md` §4.24 is Run 17's full wave sheet, written before any Run 17 observation (D4.1's
precondition). The commit hash is in the committer's hand-back to the session agent.

## 2. Outputs
- `docs/e2e-test-plan.md` §4.24 only (about 110 lines, under the ~350 cap): conventions and STOP lines, fixtures and
  ports, the expected-text table K17 (each text tied to a product constant), the rows with pass rules and the helper
  command for each, the order, the restore, and "Commands S4-helpers must provide". §4.20–§4.23 and §5 unchanged
  (verifier3 §2).
- Ports: picked from `netstat -ano`, all on 127.0.0.1/localhost, 8080 unused, redirector on 8083 (#197). Port list and
  evidence: `S4-sheet-builder.md`.
- `node scripts/doc-check.mjs`: exit 0 (verifier3). Its four findings are outside this slice (the planned
  `recipes/tsconfig.s11b.json`, the test counts, the `extension/CLAUDE.md` word budget).
- Leaf reports: `S4-sheet-builder.md`, `S4-sheet-verifier.md`, `S4-sheet-fixer.md`, `S4-sheet-verifier2.md`,
  `S4-sheet-fixer2.md`, `S4-sheet-verifier3.md`.

## 3. Verifier verdicts
- `S4-sheet-verifier.md`: **FAIL**. Three MAJOR findings: RD-7's STOP fired on the safe outcome; RD-DL-HOP's latency
  inference was backwards (`settle()` in `safety-hop.ts` returns early on the event); RD-REGEX's typed console input
  would trip RD-LOGS's pattern scan. There were also ten MINOR/NIT findings.
- `S4-sheet-fixer.md`: all 13 fixed.
- `S4-sheet-verifier2.md`: **PASS-with-notes**. N1 (the RD-0 fallback line printed `STOP`), N2 (two helpers missing
  from the list), N3 (five nits), and an F11 lane note on `s9-redirect.py --delay`.
- `S4-sheet-fixer2.md`: all fixed. The delayed redirector is now a new `s11b-delay` server, and
  `Open-S11bWindow` and `B17 stored` were added.
- `S4-sheet-verifier3.md`: **PASS-with-notes**. Two NITs remain, R3-1 and R3-2, both about the `B17 stored` helper.
  Neither can produce a false pass. They are carried to S4-helpers (§7).

## 4. Deviations
None from the brief. The placeholder rows from S0F-b, S3a and S3b were handled as follows (builder report has the map):
- Merged: RD-PERM and RD-START into RD-0, RD-NAV-HOP into RD-1, RD-REBUILD into RD-5b.
- Renamed: Run 16's carried rows under `R17-` ids. Run 16's §4.23 record is untouched.
- Dropped: none.

## 5. Proposed decisions
### 2026-10-27 · The delayed redirector for Run 17 is a new s11b server, not a change to s9-redirect.py
**Decided:** the S4-helpers list asks for a new `recipes/s11b-delay` server on 8086. `recipes/s9-redirect.py` stays
unchanged. **Why:** S4's helpers stay in their own `s11b-*` files. The `--delay` option had been proposed only in
`stage0-audit.md` and was never ruled. **Instead of:** adding a `--delay` flag to `s9-redirect.py`. **Revisit if:**
S4-helpers finds the two servers duplicate substantial code. **By:** Claude (proposed)

## 6. Findings (from the builder, confirmed by verifier 1)
- The RD-CAPS-WARN placeholder said "about 90 characters". The real bound is a 119-character regex; verifier 1 re-ran
  `blockListRuleWarnings` at lengths 119, 120 and 121.
- The RD-BACK placeholder could not work as written, because after a 302 the history entry holds the final URL. The
  sheet asks for a new "flip" redirector.
- S3a's placeholder assumed `back` answers `ok`. The sheet accepts `ok` or the block text, and judges the row by hit
  counts and timing.
- RD-5b is not defined in phase doc 0.10. It comes from `stage0-audit.md` F9. The phase doc may want a dated note
  (session agent).
- RD-0's manifest proof needs typing into the worker's DevTools console by UI Automation, and no committed helper does
  that yet. This is the main risk for S4-helpers. The sheet has a behaviour-only fallback that prints a non-STOP
  `FALLBACK` line.

## 7. Handoff
- Nothing is running.
- `journal.md` has an uncommitted edit that this slice did not make. It was left alone and not committed.
- S4-helpers builds the "Commands S4-helpers must provide" list at the end of §4.24, all in `recipes/s11b*` files.
  It should also settle:
  - **R3-1:** give `B17 stored` a fixed output text.
  - **R3-2:** compare hashes in the helper process, so no block-list hash reaches the console capture.

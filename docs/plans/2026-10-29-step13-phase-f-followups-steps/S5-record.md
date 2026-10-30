# S5-record — Run 20's record (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixer Sonnet 5.5, medium; verifiers Opus 5.5, medium; committer Sonnet
5.5, medium. Risk: low. No live action; nothing held a wait, so no ledger.

## 1. Verdict

**DONE.** Run 20's record is written: `S5-run-record.md` (this dir) and `docs/e2e-test-plan.md` §5 "Run 20 (S5)". The
commit hash is in the committer's one-line report and the session journal.

## 2. Outputs

- `S5-run-record.md` (new) and the §5 Run 20 entry (one hunk, +87/−0, additions only inside §5).
- 34 verdicts: 31 §4.28 ids (25 table ids other than the -3 rows, plus the conditional R20-KEEP-4 and R20-SWEEP-HELD,
  with R20-LOGS and R20-RESTORE counted once per slice A, B, C) and the three -3 rows of the #407 addendum.
- **Counts:** PASS 20, FAIL 8, NOT MEASURED 1, NOT RUN 3, RECORD 2, NOT DISCRIMINATING 0 (= 34). As printed: PASS 23,
  FAIL 5. The three R20-RESTORE rows print PASS and read FAIL by the DIALOGS clause (#417, #419). If R20-ARGS-ORDER is
  read by its pre-written rule (§4.28:1970 and #401), the count becomes PASS 21, RECORD 1; the printed RECORD is kept
  and the question goes to the user.
- **Gate exits:** G1.4 met (R20-POP-BG-3, liveness control 9 → 27 `evaluate` lines); R5.1 met; R5.2 met; R5.3 met with
  notes; R5.4 met for the state by count and hash, not met for the DIALOGS clause (all three slices); R5.5 met in A and
  C, **not met in B** (STOP `text-leak`, held under #417); R5.6 met (three STOPs, three RETURNs). The gate is stopped
  under the phase doc's STOP rules until the user rules.
- `node scripts/doc-check.mjs`: exit 0 (both verifiers). Private-text grep: 0 hits.
- Slice B's untracked files (`S13-live-record-liveB20.txt`, `S13-live-evidence-liveB20-pop3.txt`,
  `S5-liveB20-verifier1.md` and the other `S5-liveB20*` files) are cited by name as held pending the user's ruling
  (#417), untouched and not committed.

## 3. Verifier verdict

- Verifier 1 (`S5-record-verifier.md`): **PASS-with-notes**, 3 MINOR, 5 NIT. Every verdict re-derived; slice A
  re-derived first-hand (it had no record-level verifier).
- Fix round 1 of 3 (`S5-record-fixer1.md`): all 8 fixed, none disputed.
- Verifier 2 (`S5-record-verifier2.md`): **PASS-with-notes**, all 8 fixed; one new NIT-A, left open: the gate
  paragraph (record :234–236 and §5) cites "a safety state or text-leak item", but the state was restored and #417
  leaves open whether the leak is a log; the item that applies is a failed check after the fix rounds. The phrase came
  from the step agent's fixer guidance. It changes no verdict or count; not worth a second round.

## 4. Deviations

None from the brief. Fix round 1 was run on a PASS-with-notes verdict, for the record's accuracy.

## 5. Proposed decisions (for the user at the gate; nothing decided here)

- R20-ARGS-ORDER: keep the printed RECORD, or read it PASS by §4.28:1970 and #401 (the driver ranks RECORD over PASS
  by counting the `ref` leg #401 excludes, `recipes/s13-r20-a.ts:281`).
- The DIALOGS clause: the wave's own options window is counted before teardown closes it, in all three slices.
- #417 (text-leak: options a/b/c) and #419 (accept liveC20 attempt 2, or rule the DEVT rows NOT MEASURED).

## 6. Findings

- R20-G2-1 FAIL: B times out while A's window is covered (the row's own product finding).
- POP-OTHER-3 leg `human`: `popup-opened=no` three times, NOT MEASURED; G1 with no bridge caller is unproven live.
- #369: DEVT-UNDOCK and DEVT-EARLY (both legs) answer ok; neither condition refuses; UP-DEVT, KEEP-4, SWEEP-HELD NOT
  RUN. #374 item 3's reword waits for the user.
- The MCP's TIMEOUT reply carries the failure report's screenshot path: Run 18 (#349), Run 19 (#370), Run 20 (#417),
  never ruled.
- liveC20's fix-round breach (#419). Source conflicts the builder found (all recorded, none resolved):
  `S5-record-builder.md`.

## 7. Handoff

No processes started; no watchers left. The session agent records the commit hash in the journal. The user rules
#417, #419, the DIALOGS clause, R20-ARGS-ORDER and G1's human leg; then S6.

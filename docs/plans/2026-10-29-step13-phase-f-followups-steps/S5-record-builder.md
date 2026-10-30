# S5-record-builder: Run 20's record

Claude Sonnet 5.5, effort medium. Docs only; nothing run live, no agent spawned, no commit.

## 1. Verdict

**DONE.** Two outputs written, `node scripts/doc-check.mjs` exit 0.

## 2. Outputs

- New: `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-run-record.md` (339 lines).
- Edited: `docs/e2e-test-plan.md`, one new "### Run 20 (S5)" entry in §5 between the Run 19 entry and "## 6. Exit criteria" (81 lines added, 0 removed; `git diff --stat`).
- New lines in total 420, under the ~450 cap.
- doc-check: `Checked 38 living docs (6 closed phase docs skipped for paths and status).` exit 0 (its two listed items, `CLAUDE.md:114` test count and `next-session-prompt.md:15`, are pre-existing and not mine).
- Scan of both outputs (the record file, and the added lines of the plan) for `C:\Users`, `/c/Users`, `aliev`, `AppData`, `Users/`: 0 hits.
- Held files read, not changed, staged or moved: `S13-live-record-liveB20.txt`, `S13-live-evidence-liveB20-pop3.txt`, `S5-liveB20-verifier1.md` (and the three other untracked B files).

## 3. Derived id list and count

My derivation equals the brief's. §4.28 tables: slice A 15 ids, slice B 8, slice C 8 = 31 (27 distinct, R20-RESTORE and R20-LOGS once per slice), plus the three -3 rows of the #407 addendum = **34**. A leg (`unjoined`, `human`, `third`), `CLOSERPROBE` and `FLAG` are not counted separately.

## 4. Counts summary (34, as verified)

PASS 20 (A 10, B 6, C 4), FAIL 8 (A 4, B 3, C 1), NOT MEASURED 1, NOT RUN 3, RECORD 2, NOT DISCRIMINATING 0; 20+8+1+3+2+0 = 34.
As printed: PASS 23, FAIL 5 (the three R20-RESTORE rows printed PASS and read FAIL under #417 and #419).
FAIL: POP-BG, POP-FG, POP-OTHER, RESTORE A/B/C, G2-1, LOGS B. NOT MEASURED: POP-OTHER-3. NOT RUN: UP-DEVT, KEEP-4, SWEEP-HELD. RECORD: ARGS-ORDER, CHOOSE-KEPT.

## 5. Gate statuses

- G1.4 met (R20-POP-BG-3, B:28; liveness control 9 to 27, BE:1-2).
- R5.1 met (sheet `246c115`, notes `ee2eaa0`, `76f4f5e`, `a32cb8c`, `8ec2789`, `ae05349`; all before the respective slice's first line; additions only).
- R5.2 met (A3:5, B:5, C1:5, C2:5).
- R5.3 met with notes.
- R5.4 met for the state by count and hash; the DIALOGS clause fails in all three slices (R20-RESTORE FAIL).
- R5.5 not met in slice B (`name=1`, STOP `text-leak`, held); met in A and C.
- R5.6 met: three STOPs (A att1, A att2, B att1), three RETURNs.

## 6. Deviations

None from the brief. Verdicts for slice A are derived here (no record-level verifier); the record says so and asks the S5-record verifier to re-derive them first.

## 7. Proposed decisions

None. Proposals are listed "for the user" in the record's section 7.

## 8. Findings (source conflicts, reported not resolved)

1. R20-ARGS-ORDER prints RECORD (A3:90) because the driver's aggregate (`finish(R, [PASS, RECORD, RECORD])`, `recipes/s13-r20-a.ts`) takes RECORD over PASS, while #401 says the ref leg does not count and the sheet makes the MCP leg a record, leaving the SDK leg (PASS) as the discriminating clause. I kept RECORD as printed (safer); the PASS reading would give PASS 21, RECORD 1.
2. POP-OTHER-3 `third`: the step report says "W2 was not made", the verifier says the driver never tried (F5).
3. liveC20 fix rounds: step report counts 1, #419 counts 5 (#419 followed).
4. `S5-liveB20.md` lists R20-RESTORE PASS; `S5-liveB20-verifier1.md` F1 and #417 read FAIL (#417 followed).
5. Slice A att1's and att2's records were committed in `3c6def3` and `10db89d`, not with `ed66e36` (checked with `git log`); the record header says so.
6. liveA20's R20-ARGS-OLD old-build line prints `perm=yes` where the sheet expects `perm=no`; the same swap in slice B is explained by the verifier (F6: the loaded manifest stays HEAD's). Slice A has no verifier; noted in the record.

## 9. Handoff

Nothing running. The held slice-B files are still untracked. The record names the user's open items: #417, #419, the DIALOGS clause, G1's human leg, #374 item 3. A committer is needed after the S5-record verifier.

# S7-record — Run 17b's record (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixers: Sonnet, medium. Verifiers: Opus, medium. Docs only; no live run.

## 1. Verdict

DONE. Verifier verdict **PASS-with-notes** after two fix rounds (`S7-record-verifier3.md`).

## 2. Outputs

- `S7-run-record.md` (new): every §4.25 row judged from the raw records, D7.1–D7.7, #313's "Revisit if", findings.
- `docs/e2e-test-plan.md` §5: a new "Run 17b (S7)" entry directly after Run 17's (one added hunk; §4.24/§4.25 unchanged
  since `3cfbb95`, checked by verifiers 1–3).
- Verdict counts over 28 rows (numbers only from `S7-run-record.md` §1, re-counted by verifiers 2 and 3):
  PASS 16, RECORD 2, FAIL 7, NOT MEASURED 3, NOT RUN 0, NOT DISCRIMINATING 0.
- `node scripts/doc-check.mjs` exits 0 (verifier 3; its one note predates this stage).
- Leaf reports: `S7-record-builder.md`, `S7-record-verifier.md`, `S7-record-fixer1.md`, `S7-record-verifier2.md`,
  `S7-record-fixer2.md`, `S7-record-verifier3.md`. The builder report keeps its first counts (19/2/6/1); it is
  historical, superseded by fix round 1.

## 3. Verifier findings per round

- **Verifier 1 — FAIL** (2 MAJOR, 4 MINOR, 4 NIT). M1: the builder had judged R17B-LOGS PASS for liveA on the helper's
  code path, though liveA's console capture (holding R17B-DISARM's control line) was overwritten by liveB's; the sheet
  makes that NOT MEASURED, which makes R17B-UP-L1 FAIL, R17B-SAVE-REFUSE NOT MEASURED and D7.6 not met. M2: a "stable
  lag" finding on R17B-UP-OPT was not measured (the helper stops polling at 6 s and records no match). Minors: UP-OPT's
  stray line explained (Run 16's helper), SAVE-REFUSE's helper label cause, banner-FAIL causes trimmed to "not
  established", D7.4's set-up lines found in the framing file outside the repo.
- **Fixer 1** fixed all ten, disputed none. **Verifier 2 — PASS-with-notes**: n1 (the §5 entry's "differences from the
  step reports' tallies" paragraph wrong after the fix), n2 (a helper quote read as a measurement).
- **Fixer 2** fixed n1, n2. **Verifier 3 — PASS-with-notes**: one wording nit, no action.

## 4. Deviations

None. The stricter reading of M1 was adopted (integrity floor: decide against the result); the builder's original
19/2/6/1 reading stays in the record's §6 only as the alternative.

## 5. Exit checks D7.1–D7.7 (from `S7-run-record.md` §3)

D7.1 met; D7.2 met; **D7.3 met** (R17B-RD-2: redirect 1, blocked 0, answer `{id, tab}`, snapshot K-tab; Run 17: 1);
**D7.4 met** (R17B-BACK and R17B-FWD blocked 0 with K-tab, BACK-SAMEDOC and BACK-EMPTY `ok`; set-ups in the uncommitted
framing file); D7.5 met; **D7.6 not met** (R17B-LOGS NOT MEASURED: liveA's control line not retained); D7.7 met.

## 6. Proposed decisions

### 2026-10-27 · Run 17b's record: a helper's printed verdict is not evidence when the raw line it checks is gone
**Decided:** R17B-LOGS (liveA) is NOT MEASURED, so R17B-UP-L1 is FAIL per the sheet and R17B-SAVE-REFUSE NOT MEASURED;
D7.6 not met. **Why:** the pass rule names a console line; the capture holding it was overwritten, and the helper's check
accepts any disarm line, not R17B-DISARM's. **Instead of:** PASS on the helper's code path (19/2/6/1). **Revisit if:**
the user rules a unit-tested helper verdict counts as evidence. **By:** Claude (proposed, for user review)

## 7. Findings (for the session agent; stated as measured in `S7-run-record.md` §5)

1. A `back`/`forward` redirect hop onto a blocked host was stopped (R17B-BACK, R17B-FWD: blocked fixture 0 requests,
   answer K-tab, `RULES 0` after; once each). **#310's "Revisit if" is met.**
2. **#313's "Revisit if" is not met:** no `newTab` answered before its URL's load (five trials 3074–3102 ms on a 3 s
   page, each snapshot the page; every `newTab` read `about:blank` at create, `completes=1`, first complete 6–7 ms).
   The `tabs.get`-ahead-of-its-event case is NOT MEASURED.
3. Activation through the bridge's `evaluate` (`userGesture`) before leaving each page makes `back`/`forward` answer `ok`
   (4 of 4); without it `back` answers `INTERNAL` (1 of 1). Candidate `extension/CLAUDE.md` bullet.
4. A refused `javascript:` URL in `newTab` answers `INTERNAL` with Chrome's text and leaves no blank tab (S6).
5. The banner sampler reads positive on UP-6 legs the SDK refuses before any call; banner FAILs (UP-6, three F-RAW) have
   no established cause. R17B-UP-RACE-A's steps (ON 1.6 s after OFF) contradict its pass rule (P + 1 000 ms), the
   shape of Run 17's RD-DISARM; the row stays FAIL, a repair is a new row.
6. Helper/evidence gaps for a fix wave: liveA's console capture overwritten by liveB's (one path); history set-up lines
   only in the framing file; the aggregator's one-token row-id regex; the O2 poll records no match.
7. #316's "Revisit if" (helper lines the pass rule cannot read) is met. Ledger nit: `S7-live.ledger.md` line 7's stamp
   is out of order.

## 8. Handoff

Nothing running from this stage. The bridge daemon was left alone. Committed via a Sonnet committer (hash in the session
agent's return). Not pushed. The user's keyboard: the proposed decision in §6 and the triggers in §7 items 1, 2, 7.

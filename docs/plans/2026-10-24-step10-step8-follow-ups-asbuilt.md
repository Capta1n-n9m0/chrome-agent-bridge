# Step 10 — as-built register (the Step 8 follow-ups)

Phase doc `docs/plans/2026-10-24-step10-step8-follow-ups.md` · steps dir
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/` · format `.claude/skills/phase-kickoff/asbuilt.md`. Kept by the
session agent; one block per stage, appended at each stage close.

## Stage 0 — Spec audit · 2026-10-25 · verifier: PASS-with-notes · commit `9f91e5f` (rulings `b016712`)

### Contracts (binding forward)
- Step 9's "Contracts (binding forward)" and Step 8's C1–C7 re-executed on port 0 with a fake proto:2 extension:
  all held.
- Counts at `55ee4de` (code = `f45e3bf`): 23 router methods, 25 codes (24 on the wire), 23 tools, `npm test` 2720 /
  116; the Step 9 log scan has 54 sites, not 60 (F8).
- Measured on port 0: one result frame crosses daemon → client whole up to 99 MiB; above 100 MiB (`ws`'s default
  `maxPayload`) the extension socket closes with 1009 and every in-flight call fails `NOT_CONNECTED` (`CLAUDE.md`
  gotcha added).
- `activateForCapture`'s `onActivated` listener already ends the 1000 ms wait as written (0.8's premise was wrong).

### Decisions taken
- #204 (amended), #205–#209 (decisions.md · 2026-10-25 · Stage 0: …).

### Deviations from the phase doc
- 0.4's transport is (B) by the doc's own rule; 0.6's layout is a third option (Variant C, #208); 0.8's SW-1 is a
  differential row (#209). Applied as dated notes (`stage0-amendments.md`).

### Estimates vs actuals
- 1.5 h estimated; ~42 min for the audit, plus the amendments pass.

### Open decisions for the user
- #204 (contract-level parts), #205, #206, #207, #208.

## S1 — Run 14 (live): Step 9's follow-ups · 2026-10-25 · verifier: PASS-with-notes · commits `5f17d54`, `e321c1a`, `bfadbbc`, `111cb7b`, `f717682`

### Contracts (binding forward)
- The post-redirect `downloadStart` check refuses a redirect onto a blocked host live (`DOMAIN_BLOCKED`, no file);
  the hop and the target are both requested once (#140's documented limit).
- A disarm ends a running trusted `type` within 5 ms of the press; the debugger session is detached (a trusted call
  after re-arm works); Chrome's banner lingered ~5 s (record).
- `view-source:` + a relative own-page path resolves against the page's origin, not the extension.
- Safety state found armed, JavaScript on, empty list; read back equal by hash.

### Decisions taken
- #210–#213.

### Deviations from the phase doc
- R14-POP-1 FAIL (no `leaseGranted` for a popup of a claimed background opener) → R15-POP-2 (#211); R14-3 NOT
  MEASURED (an unidentified Chrome window covered the options page) → Run 15 (#212); R14-TEARDOWN FAIL on a scanner
  bug (#213). Four attempts, three returns, each correct under #193. The session agent dispatched the first runner
  with uncommitted bookkeeping; the clean-tree guard caught it.
- Tests 2720 → 2763 (+43, `recipes/test/s9-rules.test.ts`).

### Estimates vs actuals
- 1 h prep + 1 h live estimated; ~2 h 5 min wall clock (four attempts).

### Open decisions for the user
- None new.

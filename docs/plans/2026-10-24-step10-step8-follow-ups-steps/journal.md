# Step 10 run journal (session agent, append-only)

## 2026-10-24 — start

- Session agent: Opus 5.5, launched from the Step 10 kickoff (`kickoff.md` here, a byte copy of
  `docs/plans/next-session-prompt.md` at `1c43887`). Working tree clean at `1c43887`; port 9234 free
  (`netstat -ano`, 2026-10-24).
- G10-0: met. #192 ratified by the user in #202 (Run 13 stands; no re-run). The ruling does not pre-approve pinning
  by mouse click. #202 adds stage S4b (`JS_DISABLED`).
- Created this directory, `kickoff.md`, `briefs/common.md` (verbatim blocks cut from the kickoff by line range) and
  this journal.
- Recorded #203 (model, by the user via #69) and #204 (the phase doc's proposals, before Stage 0 so the audit can
  attack them); #204's contract-level parts listed under Open decisions for the user.
- Noticed for Stage 0: phase doc S4.3 pins "JavaScript off → `DISARMED {scope:"evaluate"}`" for (B)'s new methods,
  which S4b (after S4) then changes to `JS_DISABLED` — S4.3 must say which code holds at S4's close and S4b's
  test list must include it.
- Form: three-level. Next: Stage 0 (spec audit), alone.

## 2026-10-25 — Stage 0 closed (`9f91e5f`), rulings recorded

- Stage 0: DONE, verifier PASS-with-notes, no fixer. Counts re-derived: 23 router methods, 25 codes (24 on the wire),
  23 tools, `npm test` 2720 / 116, typecheck 0, build 0 with no tracked change; daemon build still `99bb55c5…` (Run 14
  measures Run 13's code). Every Step 9 contract and Step 8's C1–C7 HELD on port 0. Findings F1–F26 (MAJOR 7, MINOR
  14, NIT 5, no CRITICAL) + verifier notes V1–V9.
- Recorded: #205 (`saveTo` transport (B), tab-carrying pulls — the host leg drops the extension socket with 1009 above
  100 MiB), #206 (cap warning as a client `warning` event), #207 (stricter `saveTo` file rules), #208 (`release/step8`
  Variant C, base `70aa754`, close `a1932a8`) — all four open for the user; #209 (mechanical/stricter: 54 log sites,
  SW-1 differential because 0.8's premise was wrong, −7 tests at retirement, bb-login's 90 s from the press). #204 got
  a dated note. CLAUDE.md: F8's count notes and a new gotcha (one frame > 100 MiB closes the extension socket).
- Phase doc amendments applied by a docs builder (`stage0-amendments.md`).
- Stage split (Stage 0 §7, adopted): S1 Run 14 (live, alone, 1 h + 1 h) → S2 focus-first (1 h) ∥ S6 release branch
  (0.5 h) → S3 cap warning (2 h) ∥ S5 bb-login (1 h) → S4 saveTo (B) (3.5 h) → S4b JS_DISABLED (1.5 h) → S7 Run 15
  (live, alone, 1.5 h + 2 h) → S8 retirement + docs (1 h). S3/S4 proceed on the conservative choices (#205, #206)
  while the user has not ruled.

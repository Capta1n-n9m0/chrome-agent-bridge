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

## 2026-10-25 — S1 dispatched

- Stage 0 rulings committed (`b016712`). S1 (Run 14, live, alone) dispatched; pinning rule: already pinned → proceed, else the runner returns and the user is asked once.

## 2026-10-25 — S1 closed (`f717682`); S2 ∥ S6 dispatched

- S1: PASS-with-notes. R14-4b, R14-5c, R14-REL-3 PASS; R14-POP-1 FAIL; R14-3 NOT MEASURED; R14-TEARDOWN FAIL (scanner). Four attempts, three returns, all correct under #193; state read back equal. Tests 2720 → 2763. Recorded #210–#213; as-built register created.
- Lesson for me: commit every bookkeeping edit before dispatching a live runner (my uncommitted journal tripped the clean-tree guard, Return 1).
- Next: S2 (MCP focus-first) ∥ S6 (release/step8, separate worktree, Variant C per #208).
- S6 closed (`09fa604`, branch tip `db72e9a`, PASS-with-notes). S5 dispatched beside S2.
- S2 closed (`8ae1a95`, PASS-with-notes, 2807/117); #214. S3 dispatched beside S5. S4 must re-baseline the schema test under #127/#214; S8 carries S2's doc texts (setup.md, e2e-test-plan.md:306, policy.ts header).
- S5 closed (`34adfdc`, PASS-with-notes); #215. S8 carries its README row text and a gotcha candidate (PowerShell variable names ignore case).
- S3 closed (`89d6de7`, PASS-with-notes, 2989/122); #216. S4 dispatched (transport (B), #205/#207; schema re-baseline per #214).
- S4 closed (`6ba2d10`, PASS-with-notes, 3145/130); #217 (primitive leg, S7 measures SAVE-PRIM/SAVE-IDONLY), #218. S4b dispatched alone (S5, S6 already done).
- S4b closed (`2866c43` spec, `da16277`, PASS-with-notes, 3165/130); #219, #220 (node_modules junction lesson added to common.md). All code stages done; S7 (Run 15) next, alone.
- S7 closed (`c8169ff`, PASS-with-notes, 3280/132); #221–#227. S8 dispatched (retirement, docs, CLAUDE.md proposals).

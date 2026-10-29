# S5-drivers-B4 — step report (in progress)

Step agent: Opus, medium. Split at start into B4a (the -3 POP rows: actor, judges, PS readers, tests) and B4b (the
liveB20 entry script, slice-B wiring, RESTORE/LOGS, How to run liveB20): the scope is plainly over ~600 lines
(agent-rules §7).

## Progress
- B4a builder (Sonnet, medium) started; DONE, about 470 lines, 5899 tests / 247 files (`S5-drivers-B4a-builder.md`).
- B4a verifier (Opus, medium): PASS-with-notes, 0 fix rounds (`S5-drivers-B4a-verifier.md`). MINOR-1 (human leg's LEG
  word ND instead of NM; the row verdict is unaffected), MINOR-2 (proposed decision 1 and the every-round STOP not pinned by a test),
  MINOR-3 (the evidence file's first-hit rule spans attempts), NIT-1 (`$R20Pop3Evidence` script-scoped) are carried into
  B4b's builder (all in B4b's lane; B4b's verifier re-checks them). The verifier's red/mutant re-run was refused by the
  permission classifier (scratch copy with a junction), so red was shown by construction and the builder's evidence was audited.
- B4a committed (hash below, after the committer).

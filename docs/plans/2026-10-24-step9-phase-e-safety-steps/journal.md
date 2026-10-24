# Step 9 run journal (session agent, append-only)

## 2026-10-24 08:50Z — start

- Session agent: Opus 5.5, launched from the Step 9 kickoff (`kickoff.md` here, a byte copy of
  `docs/plans/next-session-prompt.md` at 59be263). Working tree clean at 59be263; port 9234 free
  (`netstat -ano`, 08:50Z).
- Created this directory, `briefs/common.md` (verbatim blocks cut from the kickoff by line range) and
  this journal.
- Recorded #130 (model, by the user via #69) and #131 (the phase doc's proposals, before Stage 0 so the
  audit can attack them); #131 listed under Open decisions for the user.
- Form: three-level (kickoff §2). Next: Stage 0 (spec audit), alone. Stage split and estimates follow
  the audit.

## 2026-10-24 — Stage 0 closed (0e72503), rulings recorded

- Stage 0: DONE, verifier PASS-with-notes after one fix round. Counts re-derived at a0700e0: 23 router
  methods, 23 codes, 23 tools, 1714 tests / 85 files, typecheck 0, build 0 with no tracked change. All
  seven Step 8 contracts HELD on port 0. 43 findings (2 CRITICAL, 14 MAJOR, 18 MINOR, 9 NIT); both
  CRITICALs are wrong plan premises (F1 one gate at receipt misses multi-step handlers; F2 listTabs-only
  redaction leaks via events and the daemon cache).
- Rulings: D1–D13 recorded as #132–#144 as proposed (each the stricter option; every refusal needs a
  disarmed state, JS off on evaluate, or a matching URL, so nothing changes while armed/JS on/empty list).
  Contract-level ones (#132–#141, #144) under Open decisions; #142, #143 build. #131 got a dated note.
- Stage split (#145): S0 0.75 h → (S1 2.5 h ∥ S3 2.5 h) → S2a 3 h → S2b 1.5 h → S4 1.5 + 2.5 h live → S5 1 h.
  S0's first deliverable pastes Stage 0's plan-side amendment texts into the phase doc.
- Next: S0 alone.

## 2026-10-24 — S0 closed (5dbbce7), S1 ∥ S3 dispatched

- S0: DONE, verifier PASS (round 2). Commits 3d3c4be (phase doc: 22 amendments, #141, #145), aabc3b4 and
  2cc0049 (spec §10/§6.5), 32e64a3, 5dbbce7 (shared code). Spec notes precede the code commit. Tests 1714/85
  → 1783/86; 62 new tests fail with the shared files stashed. Bundles differ only by the codes (+ the daemon's
  `tabRemoved` hidden check).
- Ruled: #146 (S0 build details), #147 (S1.1's router half closes at S2a; S2 checks per half), #148 (SDK
  `TabInfo` keeps string title/url, adds `hidden?` — open for the user).
- Next: S1 (extension/src/safety.ts) ∥ S3 (daemon/sdk/mcp), file-disjoint, both port 0.

## 2026-10-24 — S1 (2091f6b) and S3 (782b1d5) closed; S2a dispatched

- S1: DONE, PASS-with-notes after one fix round; matcher cases committed first (9722cd6). +473 tests.
- S3: DONE, PASS-with-notes; daemon/sdk/mcp 771/44 → 844/49. Full suite with both: 2329 / 96, 0 failures;
  typecheck and build 0.
- Recorded #149–#158 (S1) and #159–#168 (S3) as proposed; contract-level ones under Open decisions.
- Created the as-built register (Stage 0, S0, S1, S3).
- For S4: a row must read `browser_status`'s second text item (the `Safety:` line) from a live transcript (#162).
- Next: S2a (extension enforcement) alone; S2b after it.

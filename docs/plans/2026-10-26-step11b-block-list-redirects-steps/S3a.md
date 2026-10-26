# S3a — the rule keeper wired for tab navigations, and the manifest (step report)

Step agent: Opus, medium. Start commit `ecd254f` (D3.3's `<start>`). Builder, verifiers and fixers: Opus, medium;
committer: Sonnet, medium.

## 1. Verdict

**DONE.** Verifier verdicts: round 1 **PASS-with-notes** (`S3a-verifier.md`), after fix round 1 **PASS-with-notes**
(`S3a-verifier2.md`, new MINOR V2-M1), after fix round 2 **PASS** (`S3a-verifier3.md`, re-check of V2-M1 only). Stage
verdict carried in the commit: **PASS-with-notes** (M2, N2, N4 of round 1 stay open, below).

## 2. Outputs

- Spec §10 dated note (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`), committed first (D3.2).
- `extension/manifest.json` + `declarativeNetRequestWithHostAccess`; `manifest.test.ts` re-pinned with a dated note.
- `sw.ts`: keeper at the top level, start-up clear behind `ready`, rebuild inside the existing safety
  `storage.onChanged` block, `sweep()` on disarm. 19 listeners before and after; no new top-level `await`.
- `safety-call.ts`: tab rules for `navigate`/`back`/`forward` installed after the re-check, before the effect,
  released after the post-check on every path; `newTab` unchanged (#295); `downloadStart` inert until S3b.
- `safety-dnr-keeper.ts`: #301 (a) re-sync when the last live call ends, (b) 5 s bound per DNR call with a timed-out
  add's ids kept as orphans, plus the fixes M1 (a release also removes orphans) and V2-M1 (a timed-out rebuild's ids
  join the live calls, not the orphan list). `handlers/history.ts`: #301 (c), back/forward wait up to 10 s for their
  load only while holding rules (fix N1: the wait's listeners leave on complete, close, stop or the bound).
- `docs/e2e-test-plan.md` §4.24: nine placeholder rows after S0F-b's.
- Tests: 4111/159 → **4135/160** (`npm test`, verifier 3's run; baseline confirmed by verifier 1 at `ecd254f`); none
  removed, one manifest test re-pinned in place per 0.3. typecheck, build and the six recipes typechecks exit 0.
- D3.1 pass; D3.3 `git diff ecd254f -- daemon shared sdk mcp` empty; D3.4 count tests unchanged; D3.5 log-scan +0.
- Size: 494 lines code+tests at the build (157 code), about +113 in fix 1 and +34 in fix 2 — over the ~400 cap
  (N4), under the 600 split line.

## 3. Verifier findings per round

- Round 1: M1 (MINOR, a late-landing timed-out add outlived its refused call) — fixed; M2 (MINOR, rebuild on any
  safety-key change can refuse an unrelated navigate in a ms window, fails closed) — open, see 5; N1 (settle listener
  lingered) — fixed; N2 (back/forward may now take up to 10 s; a client timeout under 10 s could see `TIMEOUT`) — open,
  Run 17; N3 (orphan list kept by `clear()` untested) — fixed; N4 (size) — recorded here.
- Round 2: V2-M1 (MINOR, after M1 another call's release could remove a timed-out rebuild's ids) — fixed.
- Round 3: PASS, no new finding.

## 4. Deviations

- `back`/`forward` live in `extension/src/handlers/history.ts`, not `navigate.ts`/`tabs.ts`; edited there
  (mechanical; the lane meant "wherever back/forward live"). `navigate.ts` unchanged.
- Size over the ~400 cap without a DONE-PARTIAL (mostly tests); accepted as one coherent deliverable, as S2 (#301).

## 5. Proposed decisions (for the session agent)

- The builder's three in `S3a-builder.md` §5: rebuild on every safety-key change; back/forward wait ≤ 10 s only while
  holding rules; `DNR_TIMEOUT_MS = 5000` with orphans kept across `clear()`.
- **M2 needs a ruling** (verifier 1): the first of those changes the answer of an unrelated covered call on a page with
  no redirect in a few-ms race (fails closed, `DISARMED` "state unreadable"). The clean fix — rebuild only on a
  block-list change — needs `safety-state.ts`, outside this lane. Conservative options: grant the lane to a follow-up
  slice (S3b could take it), or accept and record.

## 6. Findings

- Unmeasured assumption (verifiers 2 and 3): the orphan and release logic assume Chrome applies one extension's
  `updateSessionRules` calls in the order sent. Not observable by Run 17; for the as-built.
- For Run 17: whether `tabs.get().status` reads `loading` right after `goBack`/`goForward` resolves
  (RD-BACK, RD-FWD, RD-BACK-SAMEDOC); N2's latency.

## 7. Handoff

Nothing running. Extension not reloaded (the new permission needs one reload, Run 17). Next: S3b (the download half).
Leaf reports: `S3a-builder.md`, `S3a-verifier.md`, `S3a-fixer.md`, `S3a-verifier2.md`, `S3a-fixer2.md`,
`S3a-verifier3.md`. `journal.md` left unstaged.

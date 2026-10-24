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

## S6 — The local `release/step8` branch · 2026-10-25 · verifier: PASS-with-notes · report commit `09fa604`

### Contracts (binding forward)
- Local branch `release/step8`, base `70aa754`, tip `db72e9a`, six commits carrying Step 8's six Part messages in
  order (Variant C, #208); `git diff a1932a8 release/step8` empty; all 60 Step 8 commits named once across the bodies.
  `main` not rewritten; no tag; no push. Intermediate trees do not build alone (Part 1 needs Part 2's type).

### Decisions taken
- None new (#208 applied).

### Deviations from the phase doc
- None beyond #208; 11 cherry-pick conflicts, all under `docs/`, resolved to the base.

### Estimates vs actuals
- 0.5 h estimated; ~8 min.

### Needs the user's keyboard
- G10-1: the annotated tag `step8` and any push. Undo: `git branch -D release/step8`.

### Open decisions for the user
- #208 (Variant C vs one squashed tree).

## S2 — The MCP's trusted tools focus first · 2026-10-25 · verifier: PASS-with-notes · commit `8ae1a95`

### Contracts (binding forward)
- With `trusted: true`, `browser_click` / `browser_type` / `browser_press_key` send `focusTab {tab}` on the resolved
  handle, then the action on the same handle; a `focusTab` error is the answer and the action is not sent; untrusted
  actions never focus; the cursor never moves on a focus. Tool names and input schemas byte-identical to `f45e3bf`
  (pinned by a `tools/list` baseline test, #214).
- Known limit (Stage 0 F19): focus and input are two calls; another actor's capture can come between.

### Decisions taken
- #214.

### Deviations from the phase doc
- `browser_focus_tab`'s description edited too (its "only tool" claim became false). Two existing tests in
  `mcp/test/tools.test.ts` now expect the `focusTab` call — the behaviour ordered by #106. Tests 2763/116 → 2807/117.
- Doc texts outside the lane (setup.md, e2e-test-plan.md:306, `sdk/src/policy.ts` header) proposed for S8.

### Estimates vs actuals
- 1 h estimated; ~18 min.

## S5 — `bb-login.ps1`'s condition-based wait · 2026-10-25 · verifier: PASS-with-notes · commit `34adfdc`

### Contracts (binding forward)
- One bound from the press (`-WaitSec`, default 90, a hard cap); exit 0 on the Blackboard host with no sign-in
  control on two clean scans and the address stable 4 s; exit 4 at the bound or when its window is gone; nothing
  pressed after the first press. Old parameters and exit codes unchanged (#215).

### Decisions taken
- #215.

### Deviations from the phase doc
- `sso-standin.html` gained a counted submit line; eight new fixtures. Tests 2807/117 unchanged (no TypeScript).
- The real-site scan time is unmeasured (needs G10-3).

### Estimates vs actuals
- 1 h estimated; ~2 h 45 min (one fix round on the hard bound).

## S3 — The 800-cap warning · 2026-10-25 · verifier: PASS-with-notes · commit `89d6de7`

### Contracts (binding forward)
- `LocateResult.pastSnapshotCap?: true` when the page has > 800 listable elements and the match comes after the 800th
  in walk order; an action resolved from such a locator carries the flag on its reply (every branch); absent
  otherwise, so ≤ 800 pages answer byte for byte as before. `waitFor {locator}` carries none.
- SDK: `client.on("warning", (w: BridgeWarning) => …)` with `{tab, method, kind: "pastSnapshotCap"}`, no locator or
  text; actions still resolve `undefined`; eight exported values, plus the type `BridgeWarning`.
- MCP: one line `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.`
  after the six action tools' answers. `a11y.ts`/`snapshot.ts` unchanged since `f45e3bf`.

### Decisions taken
- #216 (and #206 applied).

### Deviations from the phase doc
- Phase doc 0.3 got a dated mechanical note (801 size checks, not F18's 800). The pre-S1 snapshot capture holds 45
  fixtures, not 46 (`CLAUDE.md` and the kickoff say 46 — propagator). One exact `LocateResult` type pin changed on
  purpose; the old shape still pinned. Tests 2807/117 → 2989/122.
- Found, outside the lane: `npx tsc --noEmit -p recipes/tsconfig.s6.json` fails with 26 errors already at `2479301`
  (S8 investigates).

### Estimates vs actuals
- 2 h estimated; ~63 min.

### Open decisions for the user
- #206 (incl. `BridgeWarning`), #216 item 2.

# S5c — an old extension's `chooser` is refused `VERSION` (step report)

Step agent: Opus, effort medium. Children: builder, fixer and both verifiers Opus (medium); committer Sonnet (medium).
READ list given to the builder and verifiers: decisions #332, #342, #353, #355; spec §10's Step 12 S2a/S2b notes and
S5a's note (`git show 8eab22c`); `git show e481efe 9921715`; S2b.md §2, S5b.md §5; phase doc § Every stage; the
CLAUDE.md files of shared/, extension/src/, daemon/; docs/setup.md (the `older build` lines, the Uploads chooser
paragraph). Not read: run records, docs/e2e-test-plan.md.

## 1. Verdict

**DONE.** #355 is built, with one fix round.

## 2. Outputs

- Commits: spec note `d38b590`, then code `11a1210` (code, tests, setup.md, this slice's reports, and S5b.md's hash line).
- Spec: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10, one insert-only `Amended 2026-10-28 (Step 12 S5c)`
  item: the feature `"uploadChooser"`, the rule (key presence counts), the text.
- Code: `shared/src/protocol.ts` (`FEATURE_UPLOAD_CHOOSER = "uploadChooser"`), `extension/src/client.ts`
  (`EXTENSION_FEATURES` lists both features), `daemon/src/intercept.ts` (`CHOOSER_RELOAD_HINT`, a `chooserConnections`
  set filled in `extensionConnected`, and the refusal right after #332's `args` rule, before the tab and lease checks).
  `daemon/src/handshake.ts` and `wsHost.ts` unchanged (they already pass every feature string).
- The text: "the Chrome extension is an older build without the file chooser upload — reload it at chrome://extensions
  (↻ on Chrome Agent Bridge)". No path.
- Tests: new `daemon/test/s12-chooser-feature.test.ts` (5, in process: `chooser` `true`/`false`/`null` refused, nothing
  forwarded; without `chooser` forwarded unchanged; with the feature forwarded; the text names no path) and
  `daemon/test/s12-chooser-wire.test.ts` (3, real `WsHost` on port 0 with a fake extension: two featureless hellos
  refused with exact code and text, 0 `uploadFiles` frames received; without `chooser` forwarded; a hello with the
  feature forwards `chooser:true`). Hello assertions updated: `extension/test/tab-events.test.ts` (4 assertions, lines
  112, 120–122), `extension/test/s12-args-call.test.ts` (2 assertions and the titles). Verifier 1 found no hello
  assertion missed.
- `docs/setup.md`: S5b's interim sentence now gives the `VERSION` answer; the troubleshooting `VERSION` row names the
  chooser variant.
- `npm test`: 5103 passed / 218 files → 5111 / 220 (+8, none removed; verifier 1 and verifier 2). `npm run typecheck`,
  all seven recipes tsconfigs, `npm run build` exit 0; no tracked change after build; log sites +0, allowlist 54.
- Size (`git diff --numstat` plus the new files): code +20/−3 (cap 60); tests 125 (cap 90); docs 16.

## 3. Verifier verdict

- `S5c-verifier.md`: **PASS-with-notes**. All eight exit checks met; its own port-0 probe and two mutants (forward to a
  featureless extension; refuse even with the feature) red, files restored by hash. F1 MINOR (the committed test was
  in process only, not port 0), F2 MINOR (for user review: `chooser:false` to a stale extension is now refused),
  F3 NIT (a reconnect between check and forward, inherited from #332).
- Fix round 1 (`S5c-fixer.md`): F1, the port-0 test `s12-chooser-wire.test.ts`.
- `S5c-verifier2.md`: **PASS**, F1 closed; the new test red under the forwarding mutant and on the pre-slice daemon.

## 4. Deviations

- Tests 125 against 90: test-only, code 20 of 60, total 145 of 150, from the port-0 test the exit criteria asked for;
  accepted per agent-rules §7.
- Exit check "every new test fails on pre-slice code": 6 of 8 new or changed tests in the first file set and 2 of 3
  wire tests are red on the old code; the rest are controls of unchanged forwarding, each shown red by a mutant.
- The tree was not idle: another slice (S7-sheet) has uncommitted `docs/e2e-test-plan.md` and `S7-sheet-builder*.md`;
  not touched and not committed here.

## 5. Proposed decisions

**By: Claude (proposed)**, full text in `S5c-builder.md` §5:
1. **For user review (contract):** `chooser` counts whenever the key is present, `false` and `null` included, as
   `args` under #342. The SDK and MCP send `chooser:false` when given `false` (S5b), so that call to a stale extension
   is refused although the old build would have done the right thing; the refusal is safe and a reload fixes it
   (verifier F2; the alternative `chooser !== false` is also safe). The text `CHOOSER_RELOAD_HINT`.

## 6. Findings

No pre-registered check failed. No new runtime fact. F3 (NIT) stays as #332 left it.

## 7. Handoff

No processes left running. A live check needs the reloaded extension: until then a Step 12 daemon refuses `chooser`
to the loaded build with the new text. `shared/src/protocol.ts`'s `features` doc comment still gives only
`["evaluateArgs"]` as its example. Verifier 1 left a partial scratch folder `wt-s5c-verifier` in its session
scratchpad (worktree registration removed; main `node_modules` intact).

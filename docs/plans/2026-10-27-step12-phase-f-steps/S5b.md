# S5b — the file chooser: SDK option, MCP schema, setup; the console formatter's cap (step report)

Step agent: Opus, effort medium. Children: builder, fixer and both verifiers Opus (medium); committer Sonnet (medium).
READ list given to the builder and verifiers: phase doc §0.7, § S5, § Exit checks (Every stage, E5.1–E5.3); decisions
#325, #336, #342, #345, #353, #241 (decisions-archive/step11.md); `git show 8eab22c` (spec note); S5a.md §2, §5, §7;
S3b.md §5; `git show 9921715 beaa805`; sdk/src/upload.ts, sdk/src/format/network.ts; the CLAUDE.md files of sdk/ and
mcp/; docs/setup.md (Tools row, § Uploads). Verifiers also: `git show 2099c08` (extension and shared code).

## 1. Verdict

**DONE.** Item E is finished on the client side and #345 (2) is built, with one fix round.

## 2. Outputs

- Commit: `5a5cd46` (one commit: code, tests, setup.md, this slice's reports, and S5a.md's hash line).
- Code: `sdk/src/upload.ts` (`UploadOptions.chooser`, `chooserParam`: `undefined`/`null` send nothing, a boolean is
  sent, anything else `BAD_PARAMS "upload: chooser must be true or false"`), `sdk/src/tab.ts` (`Tab.upload` spreads it),
  `sdk/src/format/console-messages.ts` (`formatConsole` capped at 20 000 characters in `formatNetwork`'s form, oldest
  lines kept, one `… [truncated: …]` marker), `mcp/src/tools/registry.ts` (`browser_upload_file` gains `chooser`, sent
  only when given, and one description sentence).
- Tests: new `sdk/test/s12-upload-chooser.test.ts`, `sdk/test/s12-console-cap.test.ts`,
  `mcp/test/s12-upload-chooser.test.ts`; the #214 baseline change written out in `mcp/test/s2-focus-first.test.ts`
  (only `browser_evaluate`, `browser_console_messages`, `browser_upload_file` differ from the fixture); one type-pin
  line in `sdk/test/s11-upload.test.ts` (`UploadOptions` now has `chooser?`; judged permitted by verifier 1, as S2b's
  `args` pin).
- `docs/setup.md`: the Tools row, the quoted description, a chooser paragraph (what the human sees; needs the reloaded
  extension; not yet run live), the JavaScript-off sentence, four limit bullets (#353 (a)–(c) and S5a's V9).
- `npm test`: 5075 (base `7e26dab`) → 5087 in a clean worktree with only S5b's files (verifier 2), +12, none removed.
  Main tree after S6-G2 landed (`397a13d`) plus S5b: `Tests 5103 passed (5103)`, `Test Files 218 passed (218)`;
  `npm run typecheck` exit 0 (step agent, 2026-10-28).
- Typecheck, all seven `recipes/tsconfig*.json`, `npm run build` exit 0; no tracked change after the build; log sites
  +0, allowlist 54 (verifier 2).
- Size: code 62 of 150; tests 231 of 225 (test-only overrun within 1.5×, from F1's pin); docs ~31.

## 3. Verifier verdict

- `S5b-verifier.md` (+ evidence): **PASS-with-notes**. 9 of 11 new tests and the schema delta red on pre-slice code
  (the two "without chooser" tests pin today's params, green by design); 20 of 23 mutants red. F1 MINOR (cap size not
  pinned), F2 MINOR (property text read as a ban on a file input), F3 MINOR (no old-extension guard for `chooser`; out
  of lane), F4 NIT (setup.md stated the built path as measured), F5 NIT (the cut drops the newest lines, as
  `formatNetwork`).
- Fix round 1 (`S5b-fixer.md`): F1 (exact 20 000 / 20 001 test), F2 ("(a button or link; a file input works too)"),
  F3 (setup.md: reload the extension; flag left to the session agent), F4 (one clause: Run 19 checks it).
- `S5b-verifier2.md` (+ evidence): **PASS-with-notes**, F1–F4 closed, no new findings; F5 left for the user.

## 4. Deviations

- The tree was not idle: S6-G2 ran in parallel (daemon and spec files, committed `e467f48`, `ae123de`, `397a13d`
  during this slice). No shared files; verifiers ran S5b alone in a worktree; the combined tree passes (§2).
- One line of an existing test file changed (the `UploadOptions` type pin), needed by typecheck.
- Tests 231 against 225: test-only, accepted per agent-rules §7.
- The §4.27 placeholders (S5's plan line) were not in this slice's lane; the rows are listed in §7.

## 5. Proposed decisions

Full text in `S5b-builder.md` §5 and `S5b-fixer.md` §5; **By: Claude (proposed)**:
1. **For user review (contract):** the SDK's `chooser` rule (`null` = absent, never sent; a non-boolean refused
   `BAD_PARAMS` before the files are read) and the MCP texts: the description's added sentence and the `chooser`
   property text after F2.
2. **For user review:** `formatConsole`'s cap keeps the oldest lines and cuts the newest, as `formatNetwork` (F5).
3. **For the session agent to rule:** an extension built before S5a ignores `chooser` and answers as for a file input
   (loosens nothing; misleads). Now documented in setup.md; the alternative is a #332-style hello feature and a
   `VERSION` refusal in the daemon (daemon lane).

## 6. Findings

- No pre-registered check failed. Nothing ran against Chrome; no new runtime fact.
- The 9 `recipes/test/s11-r16-runner.test.ts` failures in scratch worktrees (CRLF `.ps1` checkout) recur; the main
  tree passes (as S5a §6).

## 7. Handoff

- Nothing running; no port bound; scratch worktrees removed. The loaded extension has neither S5a's nor S5b's build;
  MCP users need `/mcp` after the build.
- **Live rows for S7 (§4.27), fixture pages only — S5a's** (S5a.md §7): CHOOSE-1…9, CHOOSE-KEPT, CHOOSE-FRAME, the
  late-opener row, a human-style click during the wait (CHOOSE-1, -2, -5 first). **S5b's beside them:** an MCP
  `browser_upload_file {chooser: true}` row on a fixture button (answer form, no directory, banner, no dialog); the
  same with a file-input target and `chooser: true`; an SDK `tab.upload(…, {chooser: true})` row; a
  `chooser` call with JavaScript off (`JS_DISABLED`, CDP 0); a no-dialog target (`TIMEOUT` at 5 s); an upload without
  `chooser` unchanged (answer text equal to Run 16's form); `browser_console_messages` on a fixture logging over
  20 000 characters (the marker line, size ≤ 20 000; CON-MCP records it); and, if the session agent keeps F3 as
  documented, one row on an extension built before S5a (needs a reload in between; optional).

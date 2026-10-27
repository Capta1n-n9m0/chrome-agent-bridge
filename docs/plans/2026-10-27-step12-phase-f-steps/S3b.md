# Step 12 S3b — step report (console messages: SDK, formatter, MCP tool, Note A, the sentinel)

Step agent: Opus, medium. Builder, verifiers and fixer: Opus, medium; committer: Sonnet, medium. Risk: standard.
READ list given to every child: phase doc §0.5, §0.10, § S3, C3.1–C3.4, § Every stage, § STOP rules, the dated note
under § Stage 0; decisions #323, #333, #334, #342, #344; `git show 7b29b5d`; `S3a.md` §2, §5, §7, `S3a-builder.md` §2,
`S3a-verifier2.md` Note A; S2b's pattern (`9921715`); the CLAUDE.md files of sdk/, mcp/, extension/src/.

## 1. Verdict

**DONE.** One fix round (of three). C3.4 holds by command; C3.2 holds from the client side; Note A is fixed fail-closed.

## 2. Outputs

- Commit: see the committer's hash below (Outputs line filled by the step agent after the commit).
- Code (numbers from `S3b-builder.md` §2 and `S3b-fixer.md`): `Tab.consoleMessages(opts)` and the client mirror;
  `formatConsole` on the `@bridge/sdk/format` subpath (the eight values unchanged); `browser_console_messages {tab?,
  level?, limit?}`, the 25th tool; the #214 delta written out in `mcp/test/s2-focus-first.test.ts`; Note A in
  `extension/src/console-messages.ts` (a shortened stack part, and after F1 any non-string preview value ending in `…`,
  drops its entry); the daemon.log sentinel in `mcp/test/s12-console-cross.test.ts`; `docs/setup.md` row, count and
  the JavaScript-off sentences.
- Counts (verifier, own commands): 25 tools, 28 router methods, 27 codes (26 on the wire), log allowlist 54, log sites
  +0, sentinel 0 in daemon.log. MCP schema: only `browser_evaluate` and the new tool differ from the #214 fixture.
- Tests: 4856 → 4881 passed, 207 files (verifier2, `npx vitest run`); S3b's share +16 (builder +14, fixer +2); the rest
  is the S1-helpers-b lane's new recipes tests. None removed.
- Size: code 71 of 250 at build (fixer added a few lines), tests 302 of 375 at build plus the fixer's 2 cases.
- typecheck, all seven recipes tsconfigs, `npm run build`: exit 0, no tracked change after build.

## 3. Verifier verdict

- `S3b-verifier.md`: **PASS-with-notes** — F1 MINOR (Note A missed a cut before the stack), F2 MINOR (setup.md stale),
  F3 MINOR (JavaScript-off line says every other call works), F4 MINOR (formatter text uncapped), N1–N3 NITs.
- Fix round 1 (`S3b-fixer.md`): F1, F2, N1.
- `S3b-verifier2.md`: **PASS** on F1, F2, N1; no new findings.
- Stage verdict carried in the commit: **PASS-with-notes** (F3, F4, N2, N3 stay open for the session agent).

## 4. Deviations

- The formatter is exported on the `@bridge/sdk/format` subpath only, to keep the SDK's eight values (verifier agrees).
- The sentinel test lives in the MCP cross test, as S2b's did, not in `log-sentinel.test.ts` (N2).
- No daemon file changed: `consoleMessages` was already in `daemon/src/methods.ts` (S3a).
- `docs/setup.md` line 913 quotes the shipped `safety.ts:203` message verbatim and gained a sentence after it.

## 5. Proposed decisions

- `S3b-builder.md` §5: the formatter's line form and subpath export (contract-level, for user review); Note A covers
  descriptions too (safety).
- `S3b-verifier.md` §5: Note A covers any shortened non-string preview value (built in fix round 1).

## 6. Findings (for the session agent)

- **F3** (contract text, with #334): a refused `browser_console_messages` answers the shared JavaScript-off line,
  which says every other call still works (`sdk/src/error.ts:123`, `extension/src/safety.ts:203`). Needs a spec note
  or the class ruling.
- **F4**: `formatConsole` text is uncapped (up to about 200 × 2000 characters); `formatNetwork` caps at 20 000. Rule
  at the gate or measure in CON-MCP.
- Gotcha for `sdk/CLAUDE.md` (measured by the builder): `sdk/test/failure-report.test.ts` fails any `sdk/src` file
  containing `console.`, a module path like `./console.js` included.
- Stale outside the lane: `mcp/CLAUDE.md` ("24 MCP tools", lines 9 and 52) and the root `CLAUDE.md` counts.

## 7. Handoff

- **§4.27 live rows S3b adds** (beside `S3a.md` §7's ten plus verifier 1's two, and S3a's Note A row):
  CON-MCP, CON-JSOFF, CON-REFUSE, CON-NOTEA, CON-LOGS as `S3b-builder.md` §7 states them; CON-NOTEA adds a
  long-message case (the cut inside the message and inside `at`) to check F1's shape against real V8.
- No processes, no Chrome, port 9234 untouched. The S1-helpers-b lane's uncommitted recipes/ work and
  `docs/decisions.md` / `journal.md` edits are not S3b's and were not staged.

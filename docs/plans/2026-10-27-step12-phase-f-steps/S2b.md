# Step 12 S2b — step report (`args` for evaluate: the daemon's VERSION rule, the SDK options, the MCP tool)

Step agent: Opus, medium. Children: builder Opus/medium, verifier Opus/medium, fixer Opus/medium (round 1 of 3),
verifier2 Opus/medium, committer Sonnet/medium. READ list given to builder and verifiers: the step brief's READ list as
received (phase doc 0.4, 0.10, § S2, B2.1–B2.4, § Every stage, STOP rules, the Stage 0 dated note; decisions #322,
#327, #330–#332, #339, #341; decisions-archive/step10.md #214; `git show 3ab9207`; S2a.md §2/§5/§6/§7, S2a-builder.md
§2/§5; stage0-audit.md §4 F1, F10, F13, §5 B2.1/B2.3; the daemon/sdk/mcp/shared CLAUDE.md files).

## 1. Verdict

**DONE.** Item B is complete on S2a's base. Every exit criterion is met and verified: B2.1 (SDK/MCP side), B2.3,
B2.4, the sentinel, log sites +0, the schema delta, and § Every stage. Final verdict **PASS-with-notes**: round 1 found
MINOR and NIT items only; verifier2 PASSed the fixes.

## 2. Outputs

- Commit `9921715` `feat(mcp): S2b — evaluate args in the daemon, SDK and MCP (verifier: PASS-with-notes)`.
- Files (exact): `daemon/src/handshake.ts`, `daemon/src/wsHost.ts`, `daemon/src/intercept.ts` (the hello record
  `helloFeatures`, the per-socket feature set, the `VERSION` `ARGS_RELOAD_HINT` rule before any forward);
  `sdk/src/tab.ts`, `sdk/src/evaluate-save.ts`, `sdk/src/client.ts`; `mcp/src/tools/registry.ts`;
  `daemon/test/s12-args-feature.test.ts` (new), `mcp/test/s12-args-cross.test.ts` (new),
  `mcp/test/s2-focus-first.test.ts` (the written-out delta), `sdk/test/s3-signatures.test.ts`; `docs/setup.md`
  (the `browser_evaluate` row and the troubleshooting quote); reports `S2b.md`, `S2b-builder.md`, `S2b-verifier.md`,
  `S2b-fixer.md`, `S2b-verifier2.md`.
- Tests: before 4728 / 194 files (verifier, scratch worktree at `e481efe`, own `npm ci`); S2b adds +6 tests and 2 files,
  none removed. The main-tree full suite is not a clean number while the S1-helpers lane's uncommitted
  `recipes/test/s12-helpers.test.ts` is in flight (it failed to parse during the verifier's runs). `npx vitest run mcp
  sdk daemon` after the fix: 1121 passed / 64 files (fixer, verifier2).
- Per-package `tsc`, `npm run typecheck`, all seven `recipes/tsconfig*.json`, `npm run build`: exit 0; no tracked
  change from the build (verifier, verifier2). Log allowlist 54, log-scan 16/16, sentinel 0.
- Size (verifier2): code 89, tests 290, docs 3 = 382 against the 300 cap (1.27×), the extra being tests.

## 3. Verifier verdict

`S2b-verifier.md`: **PASS-with-notes**. Before-slice proof: 7 of the new tests failed on the pre-slice sources. 13
mutants were run, 12 of them red, including the daemon forwarding `args` to a featureless extension, the SDK skipping
the guard, and the MCP dropping `args`. Findings:
- F1 MINOR: the MCP `{args, saveTo}` leg was untested; mutant M7 survived. Fixed.
- F2 MINOR: the spec note `3ab9207` says "the reload hint", but the daemon sends a new text (`ARGS_RELOAD_HINT`), and
  the SDK adds a ninth refusal text the note does not list. Left for the session agent.
- F3 NIT: the `docs/setup.md` troubleshooting quote did not match the new text. Fixed.
- F4 NIT: the daemon's check runs before the tab-required and lease checks. Harmless.
- F5 NIT: `{args: undefined}` is refused because the key is present.

`S2b-verifier2.md`: **PASS** on F1 (M7 re-run red, file restored hash-identical) and F3 (both quotes word for word).

## 4. Deviations

- Size 382 vs 300: within §7's 1.5× tests-only allowance, accepted as one coherent piece (#341 form).
- `sdk/test/s3-signatures.test.ts` updated: it pins the two signatures 0.4 changes by design. It carries a dated
  exception line, and the verifier judged the edit justified.
- The daemon-side sentinel lives in `mcp/test/s12-args-cross.test.ts`. It counts the daemon's injected logger and every
  `console.*` line, not the `daemon.log` file, which is R19-LOGS' job. `log-sentinel.test.ts` is in extension/, outside
  this lane.
- Full `npm test` not green in the main tree only because of the S1-helpers lane's uncommitted recipes test (as briefed:
  re-run once, reported).

## 5. Proposed decisions

The builder's three, in `S2b-builder.md` §5:
- **The #214 baseline gains `browser_evaluate.args` as a written-out delta.** `S2B_ARGS_PROPERTY` is `{description}`
  only, and the fixture is not regenerated. Contract-level (MCP schema), **for user review**.
- **The daemon's refusal text and what "carrying args" means.** The text is `ARGS_RELOAD_HINT`, and the key's presence
  counts, `null` included.
- **The SDK refuses a non-string `fn` with `args`, and the MCP runs the guard itself.**

Per verifier F2, the session agent should add a dated line to spec §10 with both new texts when it rules the second and
third decisions. B2.4 then holds, because the note documents behaviour already verified and S2b changes no spec itself.

## 6. Findings

- No pre-registered check failed. No defect found in S2a's `shared/` or `extension/` code.
- The raw MCP tool handler throws a refusal, and the MCP SDK turns the throw into the `isError` result. The cross test
  asserts the throw.

## 7. Handoff

No processes, port 0 only, no Chrome. The MCP change needs `/mcp` or a fresh session. The daemon change takes effect at
the next client's build-id handover.

Live rows S7 needs in §4.27, none written here:
- The pause-terminate stop: an `args` call that loops past `timeoutMs` ends, and the page stays usable.
- No page global `args`, nor any function-declaration global, after the call.
- A CSP page (no `unsafe-eval`): an `args` call works or refuses as the spec note says.
- The round trip through the real extension: nested, Unicode, numbers, `null`, arrays.
- JS off: `JS_DISABLED` with `args`, before any CDP call.
- The old-extension `VERSION`: the S6 (pre-S2a) build loaded, then `evaluate` with `args` gets `ARGS_RELOAD_HINT` with
  nothing forwarded; tested through the SDK and the MCP.

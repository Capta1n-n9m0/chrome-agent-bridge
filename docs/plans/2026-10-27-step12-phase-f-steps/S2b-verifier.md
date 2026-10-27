# Step 12 S2b — verifier report (`args` for evaluate: the daemon's VERSION rule, the SDK, the MCP tool)

Model / effort: Opus, medium. Base `e481efe`, spec note `3ab9207`; the slice is uncommitted in the main tree. Read: phase doc
0.4, 0.10, § S2, exit checks, STOP rules, the dated note under § Stage 0; decisions #322, #327, #330–#332, #339, #341;
decisions-archive/step10.md #214; `git show 3ab9207`; S2a.md §2/§5–§7; S2a-builder.md §2/§5; stage0-audit.md F1, F10,
F13, F15, §5 rows B2.1/B2.3; daemon/, sdk/, mcp/ CLAUDE.md. Layer followed where they differ: the dated Stage 0 note and
#332 over 0.4's SDK-side `kind` mapping (`agent-rules.md` §4).

## 1. Verdict

**PASS-with-notes** (0 CRITICAL, 0 MAJOR, 2 MINOR, 3 NIT).

## 2. Outputs (re-derived)

- **Files of the slice** (`git diff --numstat`, `git status --short`): `daemon/src/{handshake,intercept,wsHost}.ts`,
  `sdk/src/{client,evaluate-save,tab}.ts`, `mcp/src/tools/registry.ts`, `mcp/test/s2-focus-first.test.ts`,
  `sdk/test/s3-signatures.test.ts`, `docs/setup.md` (one row), new `daemon/test/s12-args-feature.test.ts`,
  `mcp/test/s12-args-cross.test.ts`. No edit in `shared/`, `extension/` (`git diff --stat HEAD -- shared extension` empty);
  `recipes/s11b.ts` and the `recipes/s12*`, `recipes/test/s12*` files are S1-helpers' (S1-helpers-a-builder.md:13), not
  S2b's. The fixture `mcp/test/fixtures/tool-schemas-f45e3bf.json` is untouched.
- **Size:** code +89 (`git diff --numstat -- daemon/src sdk/src mcp/src`), tests +24 modified + 259 new (`wc -l`: 58 +
  201) = 283; total 372 = 1.24× the 300 cap (#339). Code alone is under the cap and the extra is tests: within §7's 1.5×
  tests-only allowance, as the builder states.
- **Tests before → after.** Before: a scratch worktree at `e481efe` with its own `npm ci` (no junction into the main
  tree): 4728 tests in 194 files; 9 failed, all in `recipes/test/s11-r16-runner.test.ts` (the worktree checks out `.ps1`
  files with CRLF, `core.autocrlf=true`; the same file passes in the main tree, where `s11-r16.ps1` is LF). After (main
  tree, run twice per the brief): run 1 4734 / 197 files, run 2 4768 / 198 files, both with one file failing to
  transform: `recipes/test/s12-helpers.test.ts:18:49 Unterminated regular expression` — S1-helpers' in-flight work,
  changing between the runs (a `recipes/test/s12-ps.test.ts` appeared). Per-file diff of the two JSON reports (script
  `scratchpad/cmp.js`): S2b adds exactly **+6** (`daemon/test/s12-args-feature.test.ts` 0 → 2,
  `mcp/test/s12-args-cross.test.ts` 0 → 3, `mcp/test/s2-focus-first.test.ts` 45 → 46); **none removed**; the one
  "removed" name is the schema test's title, renamed in place (same body plus the delta). The builder's 4744 → 4750 is
  the same +6 on a different S1-helpers state.
- **Typecheck / build:** `npx tsc --noEmit -p <pkg>/tsconfig.json` shared 0, daemon 0, sdk 0, mcp 0, extension 0;
  `npm run typecheck` 0; `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` all 0; `npm run build` 0 (`built
  extension → dist/`); `git status --short` identical before and after the build.
- **New tests fail on the pre-slice code:** the seven `src` files replaced by `git show HEAD:<file>`, the four test
  files run: `Tests 7 failed | 50 passed (57)` — all 5 new tests, the re-baselined schema test and the description
  test; the `s3-signatures` pins are type-level (checked by `tsc -p sdk`, which the builder reports red at 2 before the
  update). Files restored; `sha256sum -c` OK for all nine backed-up files.
- **Mutants** (`scratchpad/mutant.mjs`: apply, run the four test files, restore from backup, hash-check; every restore
  OK):

  | # | Mutant | Result |
  |---|---|---|
  | M1 | daemon forwards `args` to a featureless extension (`&& false`) | red: daemon test + B2.3 |
  | M2 | daemon treats `args: null` as absent (`p.args != null`) | red: daemon test + B2.3 |
  | M3 | `wsHost` passes `[]` instead of `helloFeatures(data)` | red: B2.1 |
  | M4 | SDK skips `checkEvaluateArgs` | red: guard test |
  | M5 | SDK accepts a non-string `fn` | red: guard test |
  | M6 | MCP omits `args` on the plain path | red: B2.1 + B2.3 |
  | M7 | MCP omits `args` on the `saveTo` path | **survives** (also the whole mcp+sdk+daemon suites, 64 files) — F1 |
  | M8 | MCP skips its own guard | red: guard test |
  | M9 | `evaluateRef` drops `args` | red: B2.3 |
  | M10 | `tab.evaluate` drops `args` | red: B2.1 + B2.3 |
  | M11 | `saveEvaluateToFile` drops `args` | red: B2.3 |
  | M12 | daemon accepts any connected socket (no per-socket feature) | red: daemon test + B2.3 |
  | M13 | MCP always spreads `{args}` (undefined) | red in the full mcp suite (8 saveTo tests) — the "without `args` unchanged" rule is guarded |

- **Exit checks.** B2.1 (SDK/MCP side): five values incl. nested/Unicode/`-0.5`/`1e21`/null properties/top-level `null`/
  empty containers/sentinel, through `tab.evaluate` and `browser_evaluate`, arrive as `{expression, timeoutMs, args,
  tabId}` with byte-equal JSON — pass. B2.3: hello without the feature → `VERSION` containing "reload it at
  chrome://extensions" on `tab.evaluate` (object and `null`), `evaluateRef`, `evaluateToFile` (no file), `client.evaluate`,
  raw `evaluate`/`evaluateSaveStart`, and `browser_evaluate`; 0 `evaluate*` frames forwarded; without `args` the call is
  forwarded unchanged and the raw answer keeps `kind: "function"` — pass. B2.4: `3ab9207` precedes; behaviour matches
  the note except for two texts the note does not carry (F2). Sentinel: 0 in the daemon's injected logger and every
  `console.*` line (per F15; `daemon.log` is R19-LOGS') — pass. Log sites +0: no log call in the added lines (grep of
  `git diff` `+` lines for `console.`/`log?.(`: none), `extension/test/log-allowlist.ts` 54 entries, `log-scan.test.ts`
  16/16. Schema: the baseline test checks 24 tools, every tool but `browser_evaluate` deep-equal to the fixture, and
  `browser_evaluate` equal to fixture + `EVALUATE_PROPERTIES` (incl. `args: {description}`), `required` unchanged — pass.
- **Security boundary:** every new message is fixed text (`ARGS_RELOAD_HINT`, the SDK's string-only refusal, the shared
  guard's texts); the daemon check runs after the proto check and before handle resolution and lease check, so it
  reveals nothing about a tab; no value, URL or path in any message or log. The SDK's public value surface is
  unchanged (`evaluateArgsParams` is not exported from `sdk/src/index.ts` or `download.ts`); only option types widen, as
  the spec note says.
- **`sdk/test/s3-signatures.test.ts` edit:** justified — it pins `evaluate`/`evaluateRef` signatures that 0.4 changes
  by design; edited with a dated exception line in the file's own exceptions list, in `sdk/test/`.

## 4. Deviations

- The full `npm test` did not exit 0 in the main tree on either run, only because of S1-helpers' uncommitted
  `recipes/test/s12-helpers.test.ts` (outside this lane; re-run once as briefed). S2b's own delta is counted per file.
- "Before" in the scratch worktree had 9 CRLF-only failures in `recipes/test/s11-r16-runner.test.ts`; counted as
  present tests (the count, not the pass state, is what the exit check compares).

## 5. Proposed decisions

None beyond the builder's three; F2 asks the session agent to carry two of them into the spec when it rules them.

## 6. Findings

**F1 · MINOR · `mcp/src/tools/registry.ts:851` — the MCP's `{args, saveTo}` leg is untested.** Mutant M7 (delete
`...argsPart,` from the `saveEvaluateToFile` options) leaves every test green: `node mutant2.mjs M7-full …` with
`TESTS="mcp sdk daemon"` → `Test Files 64 passed (64)`. The code is correct today; nothing pins it. *Fix:* add to the
B2.3 test in `mcp/test/s12-args-cross.test.ts` one call `browser_evaluate({expression: "(a) => a", args: SENTINEL,
saveTo: <root>/m.json, tab})` → rejects `VERSION`, 0 `evaluate*` frames, no file and no `.part` (without `args` the
call would reach the fake, so M7 turns red).

**F2 · MINOR · spec note `3ab9207` (docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md §10) vs
`daemon/src/intercept.ts:40-41` and `sdk/src/evaluate-save.ts:47`.** The note says the daemon answers "`VERSION` with
the reload hint"; the code sends a new text, `ARGS_RELOAD_HINT` ("…an older build without evaluate args — reload
it…"), not `RELOAD_HINT`. And the SDK adds a ninth fixed refusal (`args: pass the function source as a string, such as
"(a) => a.rows.length" — not a function`) beside the note's eight. Both are builder proposals (S2b-builder.md §5), not
silent, but the governing doc does not yet carry them (`agent-rules.md` §4: "code and spec never diverge silently").
*Fix (session agent, at the ruling):* a dated line under the §10 note quoting both texts and that `args` counts when
the key is present (incl. `null`).

**F3 · NIT · `docs/setup.md:1249`.** The troubleshooting row quotes "the Chrome extension is an older build — reload it
at chrome://extensions"; the new answer does not contain that substring ("older build without evaluate args — reload
it…"), so a user searching the error text misses the row. The tool row (`docs/setup.md:160`) does say an older extension
answers `VERSION`. *Fix:* widen the row's quote to "an older build… reload it at chrome://extensions", or name both texts.

**F4 · NIT · `daemon/src/intercept.ts:490-493`, order.** The args check sits before `resolveTarget`, so an `args` call
with no `tab` (or a held tab) on a featureless extension answers `VERSION`, not `BAD_PARAMS "tab is required"` /
`TAB_HELD`. It reveals less, not more, and an old extension must be reloaded anyway; recorded only so the order is a
choice, not an accident.

**F5 · NIT · `sdk/src/evaluate-save.ts:44`.** `"args" in options` makes `{args: undefined}` a refusal (the guard's
"holds undefined — … leave the key out"), so `tab.evaluate(src, {timeoutMs, args: maybe})` with `maybe` undefined
throws. Consistent with the spec's "without the key" and conservative (it never silently runs a function source as an
expression); worth one sentence in `sdk` docs or the `evaluate` JSDoc.

Not found: no defect in the daemon's per-socket feature record (M3, M12 red), the null case (M2 red), the guard order
(M4, M5, M8 red), or the "without `args` unchanged" promise (M13 red; the existing saveTo/evaluate suites green).

## 7. Handoff

No processes left; port 0 only; no Chrome. The scratch worktree is removed (its five workspace junctions, which pointed
inside the worktree, removed with `rmdir` first; `git worktree list` shows the main tree only; main `node_modules/.bin`
42 entries, `@asamuzakjp` present). All nine backed-up files hash-identical to their pre-verification state; the main
tree's `git status` changed only by S1-helpers' new `S1-helpers-a-fixer.md`. Evidence scripts and JSON reports:
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\3933cbe1-90a7-4fc5-83a1-3e97601ffc62\scratchpad\`
(`before.json`, `after2.json`, `cmp.js`, `mutant.mjs`, `mutant2.mjs`, `pre-slice.txt`).

# Step 14 S1 verifier 2: re-check after fix round 1 (the ~ path)

Model / effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6), fix-round re-check, affected items only (F1, N2, N3)
plus a regression run. Worked read-only in the main tree. Red proofs revert a fix **in memory only**: a vitest config in the
scratchpad adds a `transform` plugin (`enforce: "pre"`) that rewrites `sdk/src/error.ts` as vitest loads it. No file in the tree was
touched, and nothing was stashed or checked out.

## 1. Verdict: PASS

P1.1 holds: a home-folder path prints `~\…`, a non-home path is unchanged, and no other message changed. F1, N2 and N3 are fixed,
and each new test fails without its fix. Nothing in S1 regressed.

## 2. Outputs

| Check | Result | Evidence |
|---|---|---|
| F1 red: `.replace(/[A-Z]/g, …)` set back to `.toLowerCase()` | `s14-home-path.test.ts`: 1 failed (the U+0130 test: received `~\chrome-agent-bridge\failures\a.png`, the dot lost) / 5 passed | `S1-verifier2-red.txt` |
| N2 red: try/catch around `opts.homedir()` removed | `failure-report.test.ts`: 1 failed (the throwing-homedir test: `expected 'undefined' to be 'function'`, so the report was dropped) / 70 passed | `S1-verifier2-red.txt` |
| `npx vitest run sdk recipes/test/s12-r19-static.test.ts mcp/test/s5-cross.test.ts` | 31 files, 588 passed | `S1-verifier2-targeted.txt` |
| `tsc --noEmit` sdk, mcp, `recipes/tsconfig.s6.json` | all exit 0 | `S1-verifier2-tsc.txt` |
| `npm test` (main tree) | **253 files, 6055 passed, 0 failed** | `S1-verifier2-test.txt` |

Where the counts come from: the baseline is 6030 tests in 251 files. S1 adds the new file `sdk/test/s14-home-path.test.ts` (6 tests) and 2 tests in
`failure-report.test.ts` (the builder's end-to-end test and the fixer's N2 test; the file now has 71). That gives 6038 tests in 252 files. S2a adds
`scripts/test/s14-setup.test.ts` (17 tests), for 6055 tests in 253 files. I counted each file with its own vitest run. The fixer's 6051 came from an
earlier state of S2a's file.

## 3. The items

- **F1. Fixed.** `norm` now folds only ASCII `A-Z`, so its output is exactly as long as its input, and `p.slice(h.length + 1)` is aligned again.
  Probe (`S1-verifier2-probe.txt`) on the synthetic homes `İlham`, `Straße`, `Aydın`, `Ölçü`, `ÇAĞRI`, `ǅemal`, `Ωmega`, `用户` and `a😀b`:
  with the same case, with forward slashes, and with an ASCII-lowercased `c:\users`, each prints `~\.chrome-agent-bridge\failures\a.png`, and
  a sibling (`…x`) stays unchanged. When a path differs from the home only in a non-ASCII letter's case (`ölçü` against `Ölçü`, and `i̇lham`),
  it is left absolute. That fails safe, since `os.homedir()` and the default directory share their spelling. Folding never makes
  `STRASSE` match `Straße`, `AYDIN` match `Aydın`, or `ilham` match `İlham`. A POSIX `İ` home prints `~/.x/a.png`.
- **N2. Fixed.** `enrich` reads `opts.homedir()` inside try/catch. On a throw, `home` is undefined and the line prints the absolute path. The new
  test sets `BRIDGE_FAILURES_DIR` and a throwing `homedir`. It shows the report kept, `screenshotPath` absolute, and the absolute line printed.
  It fails when the try/catch is removed (above), so it is discriminating. The fixer had not shown this red run.
- **N3. Fixed.** Only the comment at `recipes/s12-r19.ts:53` and the static test's title changed. The pinned string is still
  `` tail.push(`Screenshot: ${homeAsTilde(input.screenshotPath, input.home)}`) `` (an exact substring, as strict as before), its other three
  pins are untouched, and `SHOT_LINE_RE` is unchanged.
- **Regression.** `git diff sdk/src/error.ts` shows only the fold change and the try/catch, compared with the version the first verifier read.
  No other message string changed, and no existing expectation was edited.

## 4. Findings
None. N1 (a UNC home is never shown as `~`; it fails safe) stays as the first verifier left it, with no change needed.

## 5. Deviations
None. Red proofs ran in memory, as described above. Evidence files have the user name and home path scrubbed.

## 6. Proposed decisions
None.

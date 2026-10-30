# S1 fixer, round 1

Findings fixed: F1, N2, N3 (N1 needs no change; `recipes/s6-rules.ts` left alone).

- F1: `homeAsTilde` (`sdk/src/error.ts`) now folds only ASCII A-Z, so the string length never changes. New test in
  `sdk/test/s14-home-path.test.ts` (home `C:\Users\İlham`, leading dot kept; both separators). Failing first: `S1-fixer1-red.txt`
  (the failure-report file in that run also failed to parse, a quoting slip of mine in the new N2 test, fixed afterwards).
- N2: `enrich` reads `opts.homedir()` inside try/catch; on a throw `home` is undefined and the line prints the absolute path.
  New test in `sdk/test/failure-report.test.ts` (throwing `homedir`, `BRIDGE_FAILURES_DIR` set: report kept, absolute path printed).
- N3: comment in `recipes/s12-r19.ts` and the title of the static test in `recipes/test/s12-r19-static.test.ts` reworded. The pinned
  text is unchanged and not loosened.

Results: `tsc` sdk 0, mcp 0, all eight recipes tsconfigs 0 (`S1-fixer1-tsc.txt`); `npm test`: 253 files, 6051 tests passed
(`S1-fixer1-test.txt`). Not committed.

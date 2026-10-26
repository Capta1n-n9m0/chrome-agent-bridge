# S4-helpers builder slice H1: fixture servers and the hit counter

Model Sonnet 5.5, effort medium. 2026-10-27.

## 1. Verdict
DONE.

## 2. Outputs
New files (586 lines in all, under the 600 cap), nothing committed, nothing else touched:
- `recipes/s11b-delay.py` (8086; args `[port] [seconds=4] [target=http://localhost:8085]`): sleeps, then 302 to target + path+query; GET and HEAD; logs on arrival `<UTC ISO> <METHOD> <path>` (the s9-redirect form).
- `recipes/s11b-flip.py` (8091; args `[port] [target]`): first GET of a path+query 200 (small page, `Cache-Control: no-store`), later GETs 302. A HEAD answers what a GET would but does not use up the first. Log `<UTC ISO> <METHOD> <path> <status>`.
- `recipes/s11b-slow.py` (8087; args `[port] [seconds=3] [dir=test-fixtures]`): `/slow/<name>` after the hold serves `<name>` from the dir, else from `<dir>/dl` (so `hello.txt` maps to `test-fixtures/dl/hello.txt`; checked it exists), 404 otherwise (a name with a slash, backslash or leading dot is 404). Log with status 200/404.
- `recipes/s11b-rules.ts`, section "H1" (H2 adds its own sections below): `parseLogLine`, `queryTag`, `countHits`, `hitsLine`, `flipCounts`.
- `recipes/tsconfig.s11b.json` (include: `s11b-rules.ts` and the two tests; H2-H5 extend it).
- `recipes/test/s11b-hits.test.ts` (12 tests, written first), `recipes/test/s11b-servers.test.ts` (12 tests).

All three servers: 127.0.0.1 only, stdlib only, `ThreadingHTTPServer` with `daemon_threads`, whole log lines under a lock, first line names the bound port (so port 0 works). A log line holds only the timestamp, method, path+query and (flip, slow) the status code. `s9-redirect.py` is unchanged.

Counter: three line forms (own form with optional status; `python -m http.server` stderr `"GET /p?q HTTP/1.1" 200 -`); banners and `code 404, message` notes parse to null. `queryTag` reads the `s11b` key of the query (exact; `rd1` never matches `rd10`; a lookalike key `xs11b`, a fragment, a favicon or an empty tag count 0). `hitsLine(tag, redirectLog, blockedLog)` prints `HITS <tag> redirect=<n> blocked=<n>`. `flipCounts` returns `{n200, n302, total}`.

Numbers:
- Baseline measured first (`npm test`): 161 files, 4158 passed.
- After: `Test Files 163 passed (163)`, `Tests 4182 passed (4182)` (+24, +2 files, none removed).
- `npx tsc --noEmit -p` on every `recipes/tsconfig*.json` (fe, base, s10, s11, s11b, s6, s9): all exit 0.
- `npm run typecheck` exit 0; `npm run build` exit 0; `git status --short` after the build: only the 7 new untracked files and the pre-existing `journal.md` edit (not mine).

Proofs in the tests (port 0, python found at miniconda):
- delay: a request with a 1 s delay took >= 950 ms and < 4 s, Location equals target + same path+query; two concurrent requests (one a HEAD) both answered in 950..1900 ms (threading).
- flip: 200 with no-store, then 302 twice, another query 200 again; counts `{n200:1,n302:2,total:3}` through the log; HEAD does not consume.
- slow: page and `hello.txt` fetched concurrently in 950..1900 ms, bodies equal the repo files; `/slow/nope.txt`, `/slow/..%2Fpackage.json` and a non-`/slow/` path are 404.

Dry run (flip on an ephemeral port, two curl GETs of `/h/back?s11b=bk`; answers 200, 302):
```
s11b flip on 127.0.0.1:21875 -> 200 once per path, then 302 to http://localhost:8085<same path> (threaded)
2026-10-26T20:54:08.853Z GET /h/back?s11b=bk 200
2026-10-26T20:54:08.912Z GET /h/back?s11b=bk 302
```
Test count lines: `Test Files 163 passed (163)` / `Tests 4182 passed (4182)`.

## 4. Deviations
None.

## 5. Proposed decisions
### 2026-10-27 · Log status is the code, and the delay log has no status
**Decided:** flip and slow print the numeric status after the path; the delay server prints no status (its answer is always 302, and its form stays the s9-redirect form the sheet's counter reads). **Why:** RD-CTL and RD-BACK need 200 versus 302 per request. **Instead of:** a status class (`2xx`/`3xx`), which also tells them apart but hides a 404 in the slow server. **Revisit if:** a sheet row needs a status from the delay server. **By:** Claude (proposed)

## 6. Findings
- Bash heredocs in this shell failed on a long script containing quotes (parse error, nothing written); the Write tool was used (matches the memory note).
- The slow server holds a 404 under `/slow/` for the full delay too (so a missing name cannot be told from a hit by timing).

## 7. Handoff
No process left running (the dry-run server was killed; test servers are killed in `afterAll`). H2 adds to `recipes/s11b-rules.ts` below the H1 section and extends the `include` of `recipes/tsconfig.s11b.json`. The `B17 hits` and `B17 ctl` commands (H3) should read logs through `countHits`, `hitsLine` and `flipCounts`; the `ctl` line `CTL 8091 flip 200 then 302` can be derived from `flipCounts(...)` equal to `{n200:1, n302:1}`.

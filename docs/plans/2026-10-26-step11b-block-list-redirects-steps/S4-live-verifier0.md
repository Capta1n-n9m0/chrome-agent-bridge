# S4-live substep 0 — verifier report (#306)

Model/effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6). Read and ran only; no repo file edited, nothing
live run. Scratch work (HEAD copy, mutants, ad-hoc script, sample captures) lives in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v0\`, not committed.

## 1. Verdict
**PASS-with-notes.** No CRITICAL or MAJOR finding. The exemption is no broader than #306: it holds only on the console
stream, only for a non-`[bridge]` line holding `net::ERR_BLOCKED_BY_CLIENT` that names `localhost:8085` and no other
counted pattern, non-fixture URL or `127.0.0.1`. Four MINOR/NIT notes, the first about the redactor's context.

## 2. Outputs (numbers from commands I ran)
- **(a) Every other occurrence still STOPs.**
  - Ad-hoc script `…\v0\adhoc.ts` ran 23 lines × 4 streams (console, daemon, actors, other) through `scan17` +
    `verdict17` with the console control present: **92 of 92 as expected**. A STOP on every stream for: a `[bridge]` line
    holding `ERR_BLOCKED_BY_CLIENT` and `localhost:8085` (prefix at start and mid-line); the same Chrome line on daemon,
    actors and other; a Chrome line that also names a 24-a run, `bank.example` (bare and as a URL), the alias (host and
    upper case), the token, the sentinel (mixed case), a profile path (`\`, `/`, `\\` forms), `https://real.test/`,
    `file:///…`, `http://127.0.0.1:8081/`, another extension's `chrome-extension://` URL; `localhost:8085` with bare
    `ERR_BLOCKED_BY_CLIENT`, with `net::ERR_FAILED`, and with no error form. Not a STOP on the console stream only:
    the plain Chrome line, the same line plus another fixture URL, and the same line plus this extension's own
    `chrome-extension://<id>/` URL.
  - **Mutation run** (each guard of `isChromeBlockedLine17` deleted in a scratch copy, the new test file run against it
    through a scratch vitest config alias): 11 of 11 mutants killed. Dropping the console-stream check fails 8 tests,
    the `[bridge]` check 2, the `127.0.0.1` check 1, the `localhost8085 > 0` check 1, the `net::ERR_BLOCKED_BY_CLIENT`
    check 2, and each of the seven terms `other`, `token`, `a24`, `bank`, `alias`, `sentinel`, `profile` 1 to 2. Every
    guard is pinned by at least one test.
  - CLI, offline, `S11_OUT` set to scratch: `scan --what console` on a capture with two Chrome lines →
    `SCAN console: ://=0 (fixture 0, other 0) … profile=0 chrome-blocked=2`, `ROW RD-LOGS PASS`, exit 0. The same file as
    `--what daemon` → `localhost:8085=2`, `STOP`, exit 2. A capture adding
    `[bridge] GET http://localhost:8085/hop net::ERR_BLOCKED_BY_CLIENT` → `localhost:8085=1 … chrome-blocked=1`, STOP,
    exit 2.
- **(b) Red without the change.** The new test file run against `git show HEAD:recipes/s11b-rules.ts` (scratch copy,
  imports made absolute; main tree untouched): **7 failed | 3 passed (10)**. The builder's claim matches. The three that
  pass on HEAD are STOP assertions that HEAD already satisfies. Their power against an over-broad exemption is shown by
  the mutation run above, not by HEAD. Now: 10 passed (10).
- **(c) §4.24.** `diff` of the `| RD-LOGS` row, HEAD against now: identical (`ROW-IDENTICAL`).
  `git diff HEAD --numstat docs/e2e-test-plan.md`: `2 0` (the note plus a blank line, after the table, at line 1650).
  The note words the category as #306 does: console only, Chrome's `net::ERR_BLOCKED_BY_CLIENT` form, BLK origin,
  counted as `chrome-blocked=<n>`, reported, not a STOP. Every other occurrence stays a STOP, with the four streams #306
  lists. Redacted to a label in committed evidence. On "suffix only when n > 0": I accept it. A count of 0 has nothing
  to report, the pinned Expected line stays byte-identical whenever Chrome logs nothing, and the note states the
  choice before any observation. So no pass rule moves after a result (§2). See N3.
- **(d) Redactor on the path.** `rd-logs` (`recipes/s11b-r17.ps1:843`) runs `redact-console` right after the console
  scan, which carries `-StopOnFail`. A STOP (exit 2) throws in `Invoke-R17Node` (line 137) before the redaction, so
  only a passing or NOT MEASURED capture gets an evidence copy. The input is `outsideRepo`-checked (CLI: an in-repo
  `--file` → `STOP: a file of this command lies inside the repo`, exit 2). Every console text the runner writes goes to
  `S11_OUT` (TEMP): `console.txt` (lines 312, 831), `Save-S11bConsole` dumps (`s11b-win.ps1:159`, `Assert-S11Outside`),
  `console-evidence.txt`. The steps dir gets only `S4-run-record.md` through `S9_RAW`, which receives node stdout:
  SCAN counts and `CONSOLE chrome-blocked lines redacted=<n>`, never a console line. The runner writes no raw console
  text into the repo. CLI check: `redact-console` on a two-Chrome-line capture → `redacted=2`, and both lines became
  `[chrome-blocked line redacted]` while the other lines were kept.
- **(e) Gates.** `npm test`: **`Test Files  178 passed (178)` / `Tests  4482 passed (4482)`**. Before was 4472/177
  (S4-helpers.md §2), so +10 tests and +1 file, none removed. All seven `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`:
  exit 0. `npm run typecheck`: exit 0. `npm run build`: exit 0. `git status --short` after the build: the same four
  modified lane files and three untracked files as before, so no tracked change from the build.
- **(f) Lane.** `git diff HEAD --stat`: `docs/e2e-test-plan.md` (+2), `recipes/s11b-r17.ps1` (+1), `recipes/s11b-rules.ts`
  (+32/−4), `recipes/s11b.ts` (+10/−2). New file: `recipes/test/s11b-chrome-blocked.test.ts`. Everything is inside the lane.
- Product side: the extension's only non-`[bridge]` console call is `extension/src/badge.ts:183`, which prints the fixed
  `LOG_LINES` strings. `net::ERR_BLOCKED_BY_CLIENT` appears in product code only as a compared constant
  (`extension/src/safety-hop.ts:14`, no log call). So no product log line can carry the Chrome form unprefixed.

## 4. Deviations
None. I ran the red-without check through a scratch vitest config (`--config <scratch>/head.config.mjs`, `resolve.alias`
of `../s11b-rules.js`) instead of a worktree, so the main tree was never checked out, stashed or reset.

## 5. Proposed decisions
None.

## 6. Findings

**N1 — MINOR — `recipes/s11b.ts:419`: the redactor's context is not the scan's context.** `redactConsole` passes
`{ token, sentinel: "", profile, consoleStream: true }`, with no `alias`, no `ownId` and an empty sentinel. `scan`
(line 412) passes the state.json sentinel, the alias and `ownId`. Ad-hoc output (`adhoc.ts`, DIVERGE lines):
```
DIVERGE chrome line + alias host: scan-counted=false redacted=true
DIVERGE chrome line + alias upper: scan-counted=false redacted=true
DIVERGE chrome line + sentinel: scan-counted=false redacted=true
DIVERGE chrome line + own ext url: scan-counted=true redacted=false
```
The first three cannot reach evidence, because the scan STOPs on those lines before the redactor runs. The fourth can.
A Chrome blocked line that also shows this extension's own `chrome-extension://<id>/` URL is counted `chrome-blocked`
(no STOP), but the evidence copy keeps it raw, which goes against #306's "redacted to a label in committed evidence".
Only fixture text is involved, so nothing private leaks. Whether DevTools' UIA text for a worker fetch includes the
full `chrome-extension://` source URL is unmeasured. *Fix:* build one `Scan17Ctx` (token, sentinel, alias, ownId,
profile) and pass it to both `scan` and `redact-console`, and give `redact-console` `--alias` like `scan`. Add a test
that, for every line, the redactor's choice equals `isChromeBlockedLine17` under the scan's context.

**N2 — MINOR — `recipes/s11b-r17.ps1:843`, note at `docs/e2e-test-plan.md:1650`: nothing names which console file may be
committed.** The evidence copy stays in `S11_OUT`, and no step copies it into the steps dir. A runner that later commits
console text by hand (as Run 16 did with `S5-liveB-console.txt`) could pick `console.txt` (raw, title lines already
dropped, Chrome lines unredacted) instead of `console-evidence.txt`. *Fix:* the step brief for the live runner, or a
later dated note, should say that the only console text that may be committed is `console-evidence.txt`, and only
after a passing console scan. Alternatively, `redact-console` could refuse to run unless the scan passed. Today it also
runs after a NOT MEASURED scan (exit 3 does not throw).

**N3 — NIT — `recipes/s11b-rules.ts:642`: `chrome-blocked=0` is never printed.** This is acceptable, as judged under
(c). The cost: a reader of the SCAN line cannot tell "measured, zero" from a scanner without the category. The commit
pins the scanner, so this is a reading aid only.

**N4 — NIT — `recipes/s11b.ts:420`, `recipes/tsconfig.s11b.json:4`.** `redact-console`'s `--out` is not checked
against the repo, unlike `--file`. It cannot write into the repo through the runner, which passes `S11_OUT`. The new
test is typechecked through `tsconfig.s6.json`'s `test/*.test.ts` glob (exit 0), not through the `tsconfig.s11b.json`
include list where the other s11b tests sit. *Fix (optional):* `outsideRepo` or a steps-dir check on `--out`, and add
the test to `tsconfig.s11b.json` and the `s6` exclude.

Residual (no finding): the exemption recognises Chrome's line by its text, so it relies on the logging invariant that
every product console line carries `[bridge]` or is a fixed `safety:` line. That holds today (grep above), and
`extension/test/log-scan.test.ts` guards it. This is #306's "Revisit if".

## 7. Handoff
No processes left running; nothing started against Chrome, the extension or the daemon (the CLI runs used scratch
files and a scratch `S11_OUT`). The builder's claims in `S4-live-builder0.md` checked out: the counts, 7/3 on HEAD,
10/10 now, the seven tsconfigs, typecheck and build. Whether to fix N1 (and N2's wording) before the live runner starts
is for the step agent. N1 is cheap and makes the evidence rule exact.

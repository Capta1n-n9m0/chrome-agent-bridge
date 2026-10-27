# S7-live — Run 17b, live (step report)

Step agent: Claude Opus 5.5, medium effort. Risk: live standard. Children: live runners 1–2 (Sonnet, medium), fixer 1
(Sonnet, medium), verifier 1 (Opus, medium), committers (Sonnet, medium). Ledger: `S7-live.ledger.md`.
READ list given to children: `docs/e2e-test-plan.md` §4.25 (lines 1677–1715) and §4.24's pass-rule, STOP, ports,
slices and helper paragraphs (1564–1588), §1; `recipes/CLAUDE.md`; `S7-helpers.md` §6; `S4-live.md` §4, §6, §7;
`recipes/s11b-r17b.ps1`.

## 1. Verdict
**DONE.** Attempt 2 ran both slices to their end with no STOP line (liveA17B exit 0, liveB17B exit 0; the file-URL
toggle read `on`, so liveB17B ran). Every §4.25 row has an observed line in `S7-live-run2A-record.md` or
`S7-live-run2B-record.md`. Judging is S7-record's; the words below are the helper's printed ROW lines, not judgments.

## 2. Outputs
- Attempt 1 (`S7-live-run1A-record.md`, `S7-live-runner1.md`): STOP inside R17B-0 after (a), (b) and the toggle read,
  before any state change — a helper exception (`ParameterArgumentTransformationError,Test-S11Own`). Cause, measured: in
  Windows PowerShell 5.1 a `-File` script's top-level scope is the global scope, so `s11b-r17b.ps1`'s top-level
  `$o = $Carried[$k]` overwrote `$global:O` (the options-window handle). Fix 1 `6f3413c` (renames only, plus
  `recipes/test/s11b-r17b-scope.test.ts`, red on the old file); tests 4663/190 → **4665/191** (fixer 1, verifier 1).
- Attempt 2 (`S7-live-runner2.md`): main-tree `npm run build` exit 0 at `6f3413c`, tree clean; reload by
  `recipes/reload-extension.ps1`; scratch `%TEMP%\bridge-e2e\s11b-r17b-2`.
- **First record line (D7.2), both slices:** `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD
  disk-s6-names=2/2 created-url=about:blank`; `S6 commit=ancestor`.
- Evidence: `S7-live-run2A-record.md` (607 lines), `S7-live-run2B-record.md` (265), `S7-live-run2-console.txt` (767,
  the redacted worker-console copy of liveB17B only; see §6).

### Rows (attempt 2, as printed)
| Row | Printed |
|---|---|
| R17B-0 | (a) PASS, `RULES 0`, (e)(f) PASS (2/2, ancestor, `created-url about:blank`) — both slices |
| R17B-UP-L1, R17B-CTL (8087 answered after 3066 ms) | PASS |
| R17B-ACT-CTL | PASS (`ok`, 12 ms each pair) |
| R17B-BACK-NOACT | RECORD: `INTERNAL`, 3 ms |
| R17B-RD-2 | PASS (5 clauses): `HITS bd2 redirect=1 blocked=0`; snapshot `DOMAIN_BLOCKED`; `TABWATCH created-url=about:blank completes=1 first-complete-ms=6` |
| R17B-NEWTAB-PLAIN | PASS (4 clauses), `HITS bnp blocked=0`, `created-url=about:blank` |
| R17B-NEWTAB-LOAD-1..5 | PASS (3 clauses each); LAT 3074, 3102, 3074, 3076, 3075 ms; `completes=1`, `first-complete-ms` 6 each. The op's own interim line reads `NOT MEASURED: … blocked or RULES after not given` before the runner's combined PASS line (by design, `s11b-r17b.ps1` r17b-newtab-load) |
| R17B-NEWTAB-REFUSED | PASS (count 18 before and after); RECORD `INTERNAL` "JavaScript URLs are not allowed in API based extension navigations. …", `created-url=about:blank` |
| R17B-BACK, R17B-FWD | PASS: blocked=0, 2 flip requests, answer `DOMAIN_BLOCKED` 37 ms (K-tab) |
| R17B-BACK-SAMEDOC | PASS, 10 ms |
| R17B-DISARM | PASS (4 clauses): exact refusal; samples 1 then 0; wait-safety reached `blockedCount=1`; `HITS bdd redirect=1 blocked=0` |
| R17B-BACK-EMPTY | PASS (`ok` 12 ms, 10 ms; `max=0`) |
| R17B-RD-DL-SOCKET, R17B-UP-7 | PASS |
| R17B-UP-OPT | FAIL: "O2 showed the saved text after 6105 ms, over 5 000 ms" |
| R17B-UP-6 | FAIL: "banner seen" on all five legs |
| R17B-SAVE-REFUSE | NOT MEASURED (0 verdict lines printed) |
| liveB: R17B-F-RAW, -F-RAW-2, -F-RAW-DIR | FAIL: "banner seen" |
| liveB: R17B-F-RAW-ENC, -F-RAW-OK | PASS |
| liveB: R17B-UP-RACE-A | FAIL: "98 call(s) started at or after P + 1 000 ms answered ok" |
| liveB: R17B-UP-DEVT | NOT MEASURED: DevTools was not attached |
| R17B-RESTORE (both slices) | PASS; `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true` |
| R17B-LOGS (both slices) | PASS; `SCAN console` and `SCAN daemon` all counts 0; `CONSOLE chrome-blocked lines redacted=0` |

### Exit checks
- **D7.2** met (first line above, both slices). **D7.5** met: RESTORE equal in both slices; afterwards `daemon.status`
  safety `armed=true evaluate=true blockedCount=0` (runner 2). **D7.7** met: attempt 1's one STOP line is return 1 in
  the ledger; attempt 2 printed none. D7.3, D7.4, D7.6 are S7-record's to judge from the records.

## 3. Verifier verdict
Fix 1: `S7-live-verifier1.md` **PASS-with-notes** (two NITs: the scope test checks one direction only — a top-level name
read implicitly by a loaded function is not caught; the verifier copied a file into `recipes/` and deleted it in the same
command, no trace).

## 4. Deviations
- Two attempts. Attempt 1's STOP was a throw before the first state change from a helper defect, which §4.24's STOP list
  does not name (it names "any throw after the first state change"); no row had been measured past R17B-0 (a)–(c). I
  read it as a framing failure, fixed the helper between attempts (verified, committed before use) and re-ran from the
  prologue in a fresh scratch dir. Attempt 2 re-measured R17B-0 (a)–(c); attempt 1's record stays as written.
- The helper writes its record to `…-steps/S7-run-record.md` (the S7-record stage's name); each runner moved it to
  `S7-live-run<n><slice>-record.md`.

## 5. Proposed decisions
### 2026-10-27 · Run 17b's attempt-1 helper throw before any state change is a framing failure, not a pre-registered STOP
**Decided:** fix the helper (`6f3413c`, verified) and re-run from the prologue as attempt 2. **Why:** §4.24's STOP rule
lists "any throw after the first state change"; this throw came before it, from a variable-scope defect, with no row
measured past R17B-0 (c). **Instead of:** returning for a ruling. **Revisit if:** S7-record reads attempt 1 as a
STOP that should have ended the run. **By:** Claude (proposed)

## 6. Findings
1. **Runtime fact (for `recipes/CLAUDE.md`):** under `powershell -File` (Windows PowerShell 5.1) the script's top level is
   the global scope: a top-level `$o = …` replaced `$global:O`, case-insensitively (measured by a scratch script by me and
   by verifier 1; Run 17b attempt 1). Block runners prefix top-level variables (`s11b-r17b.ps1`, guarded by
   `recipes/test/s11b-r17b-scope.test.ts`).
2. **Evidence gap:** the helper writes both slices' console capture to one path, so liveA17B's raw capture was
   overwritten by liveB17B's; liveA's R17B-LOGS `SCAN console` line (all 0) is in the run2A record.
3. **Scanner note:** `s9.ts scan-file --mode committed` prints `non-fixture :// 3`-style FAILs on both records; the only
   such text is the extension's own `chrome-extension://<id>/options.html` in `window … now shows` lines (the id already
   appears in committed docs).
4. For S7-record (recorded, not judged): the "banner seen" FAILs of R17B-UP-6 and the three F-RAW rows; R17B-UP-RACE-A's
   98 calls answered `ok` after P + 1 000 ms; R17B-UP-OPT's 6105 ms; R17B-SAVE-REFUSE printed no verdict line.

## 7. Handoff
Nothing of the wave running; ports 8080–8099 free; the bridge daemon (PID 2712, spawned by the SDK) left as designed.
Scratch outside the repo: `%TEMP%\bridge-e2e\s11b-r17b` (attempt 1, holds its `r17b-globals.clixml`; no state was
changed in it) and `%TEMP%\bridge-e2e\s11b-r17b-2` (attempt 2). The next stage is S7-record.

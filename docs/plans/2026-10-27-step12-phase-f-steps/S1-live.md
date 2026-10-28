# S1-live: Run 18, live (step report)

Step agent: Claude Opus 5.5, effort medium. Children: live runners and fixer Claude Sonnet 5.5, verifier Claude Opus 5.5,
committer Claude Sonnet 5.5, all at medium. Ledger: `S1-live.ledger.md`.

## 1. Verdict
**ESCALATE.** liveA18 attempt 2 stopped in R18-LOGS. The actors scan printed `profile=2`, and the scanner prints STOP on
any count above 0. The two matches are not a helper defect that can be fixed between rows (§6). liveB18 was not started.
The safety state was restored and read back equal in both attempts.

## 2. Outputs
- **Builds:** attempt 1 was built from `e1e68e0`, a clean tree. Attempt 2 was built from `b8b493d`, also clean. Both runs
  of `npm run build` ended with `built extension → dist/`, and no tracked file changed after either build. Product code
  is the same at both commits: `b8b493d` touches recipes only.
- **Fix commit:** `b8b493d` `fix(e2e): S1-live fix round 1 — UP-OPT's poll result no longer overwrites the O2 handle
  (verifier: PASS-with-notes)`.
- **Evidence files (steps dir):**
  - `S1-live-evidence-liveA18-att1.txt` and `S1-live-record-liveA18.txt`
  - `S1-live-evidence-liveA18-att2.txt`, `S1-live-record-liveA18-att2.txt` and `S1-live-console-liveA18-att2.txt`
  - The runner checked each with `s11b scan18 --what other` and every count was 0. Its reports are
    `S1-live-runner-liveA18-att1.md` and `S1-live-runner-liveA18-att2.md`.
- **Tests:** after the fix, `npm test` shows 5010 passed in 210 files (the fixer's and the verifier's runs). The seven
  recipes tsconfigs and `npm run typecheck` exit 0.

### liveA18, attempt 1 (out `$TEMP/bridge-e2e/s12-live/a1`, exit 2)
Rows as printed: RD-0 (a), RULES, RD-0 (c), RD-0 (d) and R17B-0 (e)(f) PASS; `ROW R18-0 PASS slice=A`; `ROW UP-L1 PASS`
(the console clause pending R18-LOGS); `ROW R18-BANNER-CTL PASS slice=A` (negative leg 17 polls, `banner=none`;
positive leg 16 polls, `banner=seen`).
STOP: `STOP: the wave ended (an exception in block r18-up-opt (ParameterBindingArgumentTransformationException; message
withheld (id ParameterArgumentTransformationError,Get-S9Options)))`. The runner returned.
Restore: `RESTORE uploadfolders lines=0 hash=equal`. The read-back found the stored page, `daemon.status` and the title
equal. Teardown then exited 0 with `CHECK clean PASS`.
Cause and fix round 1: the S12 patch stored `Wait-S12O2`'s result in `$o2`. PowerShell variable names ignore case, so
this overwrote the window handle `$O2`, the same trap as the `$o`/`$global:O` gotcha in recipes/CLAUDE.md. The fix
renames the result to `$o2Res`, and a behavioural test fails on the old file. The verifier gave PASS-with-notes
(`S1-live-verifier.md`).

### liveA18, attempt 2 (out `$TEMP/bridge-e2e/s12-live/a2`, exit 2)
Rows as printed:
- RD-0 (a), RULES, RD-0 (c), RD-0 (d) and R17B-0 (e)(f): PASS; `ROW R18-0 PASS slice=A`.
- `ROW UP-L1 PASS: all checks hold`. The console clause was pending, and R18-UP-L1's own ROW line was not reached.
- `ROW R18-BANNER-CTL PASS slice=A`: negative leg 17 polls, `banner=none`; positive leg 16 polls, `banner=seen`.
- `ROW R17-UP-OPT FAIL: O2 showed the saved text after 15136 ms, over 5 000 ms` / `ROW R18-UP-OPT FAIL`. The OPT line
  reads `shown=no polled-ms=15136`: in 15 s, O2 never showed the saved text.
- `ROW R17-UP-6 FAIL: outside: banner seen` / `ROW R18-UP-6 FAIL slice=A`, with a control that passed.
- `ROW SAVE-REFUSE-R sdk-leg PASS` and `ROW SAVE-REFUSE-R mcp-leg PASS`. R18-SAVE-REFUSE's own ROW line was not reached.
- `ROW UP-RESTORE PASS` and `ROW R18-RESTORE PASS slice=A`.

Restore read-back: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`.
The stored page, `daemon.status` and the title read back equal.

R18-LOGS, by count:
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- `SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile=2`, then `CHECK R18-LOGS scan actors FAIL: STOP: a
  non-zero count (non-fixture URL, token, sentinel or profile path)`.

STOP: `STOP: the wave ended (an exception in block r18-logs (RuntimeException: node s11b scan18 ended in a STOP))`. The
runner returned. No `CHECK rows` line was printed. Teardown then exited 0 with `CHECK clean PASS`.

### liveB18
Not started (see §6).

## 3. Verifier verdict
Fix round 1: **PASS-with-notes**, in `S1-live-verifier.md`.
- Note 1: the new test covers only the case where O2 shows the text at once. The verifier checked the 15 s path by hand.
- Note 2: recipes/CLAUDE.md:87 already records the case gotcha. Extend that line rather than add a new one.

## 4. Deviations
- The brief says to reload with the reload script. The runner's `reload` block runs `recipes/reload-extension.ps1`
  itself (S1-helpers-c §7), so the step agent ran no separate reload.
- liveA18 attempt 2 rebuilt at `b8b493d`, the fix commit, not at `e1e68e0`. Product code is the same at both commits.

## 5. Proposed decisions
None by the step agent. The escalation needs a session-agent ruling (§6).

## 6. Findings
- **The escalation: R18-LOGS actors `profile=2` (pre-registered as 0).** Both matches come from the turn file of the
  `sv-cycle` leg, in the lines `resultLines` keeps (the tool result):
  1. The MCP failure report's line `[1/3] Screenshot: <HOME>\.chrome-agent-bridge\failures\<stamp>-T<n>.png`. This is the
     product's `browser_evaluate` answer to the `PAGE_ERROR` (JSON cycle) on a `saveTo` call, so the failure report
     names a path under the user's profile.
  2. Claude Code's own line `[3/3] [Image: source: <HOME>\.claude\projects\…\tool-results\….png`, which the harness
     writes, not the product.

  Neither can be fixed between rows:
  - Dropping either line from the scan would weaken a pre-registered log scan (agent-rules §2).
  - Changing the failure report is product code, outside S1's lane.
  - A re-run would measure the same thing.

  The rulings needed: whether (1) is a product finding under §4.26's "no path under the user's profile" and the phase
  doc's "a path … in a log or committed evidence", or outside the rule, since a tool result is neither a log nor
  evidence; whether (2) is outside the scan's intent; and whether liveB18 (which runs no actor) may then run as attempt 1.
- **Product findings with a passing control** (recorded, not a STOP; §0.3): R18-UP-OPT FAIL (O2 did not show the saved
  text within 15 s); R18-UP-6 FAIL (`outside: banner seen`, with R18-BANNER-CTL PASS in the same slice).
- Neither attempt printed `R18-UP-L1` or `R18-SAVE-REFUSE` ROW lines: both print after R18-LOGS, which stopped.
- §1 R1.7: each STOP line is matched to a runner return in the ledger.

## 7. Handoff
- Nothing is running. The wave's daemon (PID 9816, `daemon/dist/index.js`) was stopped with
  `recipes/s9.ts daemon-shutdown`. At 20:52Z `netstat` showed nothing listening on 9234 or 8080-8089, and the
  teardowns had ended the fixture servers.
- The out dirs `$TEMP/bridge-e2e/s12-live/a1` and `a2` are outside the repo. `a2/actors` holds the turn files the
  ruling needs.
- Budget left: fix rounds 1 of 3 used; liveA18 has 1 attempt left, liveB18 has 3. A next liveA18 attempt needs `-Att 3`
  and a fresh `S11_OUT`. The extension loaded now is the `b8b493d` build.

## 8. liveB18 (added 2026-10-28 by the S1-record step agent)
This section was written afterwards. Sections 1-7 above are unchanged and describe the state when liveA18 escalated.

**liveB18, attempt 1** (runner Claude Sonnet 5.5, out `$TEMP/bridge-e2e/s12-live/b1`, HEAD `4a46a22`, build clean) ran to
the end: exit 0, no STOP line. Its last line is `SLICE liveB18 done: calls with a failed check 3, not measured 1 (the rows
are in the record)` and the rows check printed `CHECK rows n=19 verdict=FAIL`. Quoted from
`S1-live-evidence-liveB18-att1.txt` (line numbers in brackets):
- [72] `ROW R18-BANNER-CTL PASS slice=B`
- [79-80] `ROW F-RAW FAIL: F-RAW: banner seen` / `ROW R18-F-RAW FAIL slice=B`
- [87-88] `ROW F-RAW-2 FAIL: F-RAW-2: banner seen` / `ROW R18-F-RAW-2 FAIL slice=B`
- [95-96] `ROW F-RAW-DIR FAIL: F-RAW-DIR: banner seen` / `ROW R18-F-RAW-DIR FAIL slice=B`
- [223-224] `ROW UP-RACE-A PASS: every clause holds` / `ROW R18-UP-RACE-A PASS`
- [237] `ROW R18-UP-DEVT NOT MEASURED: DevTools was not attached`
- [245, 248] `ROW UP-RESTORE PASS: ...` / `ROW R18-RESTORE PASS slice=B`
- [257] `ROW R18-LOGS PASS slice=B`

Restore read back equal [242]: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0
hash=equal`. R18-LOGS slice B passed with [253] `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` and
[255] `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; the console line is [252] `CONSOLE liveB18
capture=console-liveB18.txt texts=677 control-disarmed=6`. No actor ran in liveB18. Helper note [258]: `WARN row printed
twice: RULES`.

Files committed now: `S1-live-runner-liveB18-att1.md`, `S1-live-evidence-liveB18-att1.txt`, `S1-live-record-liveB18.txt`,
`S1-live-console-liveB18.txt`.

**The stall.** The liveB18 step agent ended its turn while the runner was still running and never wrote this attempt up
(decisions.md #350). The session agent checked at 03:05Z on 2026-10-28 that nothing listened on 9234 or 8080-8089, so no
process was left. The runner had seen the daemon on 9234 at its end, which is by design (the daemon outlives sessions);
that daemon was gone by 03:05Z.

**Verdict for the whole of S1-live:** liveA18 escalated and was ruled (#349); liveB18 ran. The rows are judged in
`S1-run-record.md`.

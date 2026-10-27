# S1-live runner report: liveA18, attempt 2

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
ESCALATE: exit 2 (STOP) in block r18-logs, after every measuring block ran. Three rows FAILED (R17-UP-OPT / R18-UP-OPT, R17-UP-6 / R18-UP-6) and the actors log scan found non-zero counts. The restore passed and was read back. No `CHECK rows` line was printed.

## 2. Outputs
- HEAD b8b493de5505a67b574befcce933e349b54f26d6 (as expected). Tree clean before and after `npm run build` (only untracked files under the steps dir).
- Build: `built extension → dist/` (no error).
- Exit code: 2. Out dir: `$TEMP/bridge-e2e/s12-live/a2` (new). I did nothing after exit 2: no teardown, no re-run.
- Files (steps dir): S1-live-record-liveA18-att2.txt (171 lines; first line `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`), S1-live-evidence-liveA18-att2.txt (94 lines, filtered from runner-stdout, paths redacted), S1-live-console-liveA18-att2.txt (copy of `console-liveA18-evidence.txt`, which the runner wrote after its console scan passed), this report. `r18-framing.txt` ends at `BLOCK r18-logs start`.

## 3. ROW lines in order (as printed)
- `ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent`; `ROW RULES PASS: RULES 0`; `ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on`; `ROW RD-0 (d) PASS: the found list blocks no fixture URL`; `ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank` (the same five appear twice: preflight and R18-0).
- No `ROW R18-0 PASS slice=A` line appears in runner-stdout this time (attempt 1 printed one); I did not investigate.
- `ROW UP-L1 PASS: all checks hold` then `CHECK R18-UP-L1 console-clause pending R18-LOGS`
- `ROW R18-BANNER-CTL PASS slice=A`
- `ROW R17-UP-OPT FAIL: O2 showed the saved text after 15136 ms, over 5 000 ms`; `ROW R18-UP-OPT FAIL`
- `ROW R17-UP-6 FAIL: outside: banner seen`; `ROW R18-UP-6 FAIL slice=A`
- `ROW SAVE-REFUSE-R sdk-leg PASS: all checks hold`; `ROW SAVE-REFUSE-R mcp-leg PASS: all checks hold`; `CHECK R18-SAVE-REFUSE console-clause pending R18-LOGS`
- `ROW R18-BC close ok T2382 (16 ms)`
- `ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms`; `ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash`; `ROW RULES PASS: RULES 0`; `ROW R18-RESTORE PASS slice=A`
- Never printed: `CHECK rows n=… verdict=…`, any R18-UP-L1 or R18-SAVE-REFUSE final ROW (they print after R18-LOGS' row).

Failure detail (runner-stdout):
- UP-OPT: `OPT observed standing x1 invalid items 3 warned items 0`; `OPT O2 shown=no at=none polled-ms=15136`; then `TYPED uploadfolders reverted; stored equal`. Row text says O2 "showed the saved text after 15136 ms", while OPT says shown=no (poll ran the full 15 s without seeing it).
- UP-6: `IDLE R18-UP-6 since-attach-ms=27011`; `SAMPLER R17-UP-6-<case> … banner=seen` for outside (polls=16), missing (16), relative (17), raw-dotdot (16), raw-notarget (17); five `CHECK R17-UP-6 <case> FAIL: <case>: banner seen`.

## 4. R18-BANNER-CTL
- `CHECK bannerctl-neg violations=0`; `CHECK bannerctl-pos violations=0`; `ANSWER R18-BANNER-CTL pos ok`
- `BANNERCTL liveA18 leg=neg idle-ms=15064 polls=17 banner=none`; `BANNERCTL liveA18 leg=pos answer=ok polls=16 banner=seen`

## 5. Restore read-back (R18-RESTORE, normal path)
- Toggle pressed off then on (titles confirmed OFF, then armed).
- `BOX uploadfolders set (0 non-blank line(s); saved; text withheld)`; `RESTORE uploadfolders lines=0 hash=equal`
- `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; `RESTORE ok: the found texts (outside the repo) deleted after the read-back matched`
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `CHECK UP-RESTORE stored PASS`, `CHECK UP-RESTORE daemon PASS`.

## 6. R18-LOGS
- `CONSOLE window-title lines dropped=3`; `CONSOLE liveA18 capture=console-liveA18.txt texts=679 control-disarmed=3`
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` + `CHECK R18-LOGS scan console PASS: all counts zero`; `EVIDENCE console copy written (scan passed)`
- `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` + `CHECK R18-LOGS scan daemon PASS: all counts zero`
- **`SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile=2`** + `CHECK R18-LOGS scan actors FAIL: STOP: a non-zero count (non-fixture URL, token, sentinel or profile path)`. Two profile-path hits in the actors capture (`<OUT>\actors`: s11mcp files). I did not open them; the step agent should inspect (they are outside the repo, in the out dir).

## 7. STOP lines (runner-stdout, last)
- `s9-win: WAVE stopping: an exception in block r18-logs (RuntimeException: node s11b scan18 ended in a STOP)`
- `STOP: the wave ended (an exception in block r18-logs (RuntimeException: node s11b scan18 ended in a STOP)) (at 2026-10-27T20:49:44.452Z)` then `EXIT 2`
- This is not the failed-restore STOP: the restore had already passed. Per handoff §7 step 5 `-Block teardown` with `S11_OUT=<a2>` would be allowed before another attempt; I ran nothing (brief). The runner itself ended its own windows and `stopped own process srv8081`.

## 8. Scan of handed-over files (`recipes/s11b.ts scan18 --what other --file`)
- Evidence file: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` (PASS). Its own `SCAN actors` line is quoted from the runner, not a leak.
- Record file: same line, all zero, PASS.
- Console copy: same line, all zero, PASS.
- Nothing needed redaction.

## 9. Process listing
- Listening: 127.0.0.1:9234, PID 9816, `node.exe` (the daemon; PID 35188 from attempt 1 is gone, so the daemon was handed over). 8080-8089: nothing listening. Killed nothing. Chrome untouched by me.
- `r18-globals.clixml` remains in the a2 out dir: a later attempt needs `-Block teardown` with `S11_OUT=<a2>` first.
- Untracked files: this attempt's four outputs plus attempt 1's files and the ledger. A `S1-live-record-liveA18.txt` (attempt 1) still exists unchanged.

## 10. Handoff
Step agent decides: the UP-OPT failure (O2 not showing the saved text in 15 s; a product/helper question, not mine), the UP-6 banner-seen failure on all five cases, and the actors scan's two profile hits. Fix rounds: this is runner attempt 2.

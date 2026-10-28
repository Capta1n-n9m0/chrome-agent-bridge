# S7-live runner report: liveA19, attempt 1

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
ESCALATE: exit 2 (STOP) in block r19-args-1 (`STOPWHY existing-tool-changed`), 2 minutes into the slice. The safety state was never changed (no restore needed: `RETURN 1 after-stop=existing-tool-changed restored=n/a readback=n/a`). This is not a failed-restore STOP. R19-LOGS, R19-RESTORE and `CHECK rows` never ran. I did nothing after the exit: no teardown, no re-run.

## 2. Outputs
- HEAD 41690ed737e5bc53076bbc05ba30a442c2a59b73. Tree clean before and after build (only the untracked ledger).
- Build last line: `built extension → dist/`.
- Exit code: 2. Out dir: `$TEMP/bridge-e2e/s19-live/a1` (new). Stdout: `$TEMP/bridge-e2e/s19-live-a1-stdout.txt` (165 lines).
- Steps-dir files: `S7-live-record-liveA19.txt` (56 lines; first line `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`); `S7-live-evidence-liveA19-att1.txt` (95 lines, filtered stdout, 0 home/out paths left to replace); this report.
- No console evidence copy was written (the runner never reached R19-LOGS; no `*evidence*` file in the out dir). `console-liveA19.txt` exists in the out dir, unscanned; I wrote no console file.

## 3. ROW lines in order (as printed)
- `ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent`
- `ROW RULES PASS: RULES 0`
- `ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on`
- `ROW RD-0 (d) PASS: the found list blocks no fixture URL`
- `ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank` (these five appear twice: R19-0's own pass and the reused r17b-0 block)
- `ROW R19-0 PASS slice=A`
- `ROW R19-BANNER-CTL PASS slice=A` (`BANNERCTL liveA19 leg=neg idle-ms=20002 polls=16 banner=none`; `leg=pos answer=ok polls=16 banner=seen`; `ANSWER R19-BANNER-CTL pos ok`)
- `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`

## 4. R19-ARGS-1 (the block that stopped)
- `ARGS R19-ARGS-1 v1-sdk ok value-equal=no json-equal=yes`; v2, v3, v4, v5 sdk: `ok value-equal=yes json-equal=yes`
- `ARGS R19-ARGS-1 v1-mcp`, `v2-mcp`, `v3-mcp`, `v4-mcp`, `v5-mcp`: each `ERROR value-equal=no json-equal=no`
- `ARGS R19-ARGS-1 total table=5 value-equal=4 json-equal=5 via=sdk`; `total table=5 value-equal=0 json-equal=0 via=mcp`
- `ANSWER R19-ARGS-1 control-1 ok`; `ANSWER R19-ARGS-1 control-2 ok`
- No ROW line printed for R19-ARGS-1.

## 5. STOP and RETURN lines
- `STOPWHY existing-tool-changed`
- `STOP: R19-ARGS-1 stopped (existing-tool-changed) (at 2026-10-28T22:08:58.899Z)`
- `s9-win: WAVE stopping: an exception in block r19-args-1 (RuntimeException: stop existing-tool-changed)`
- `RETURN 1 after-stop=existing-tool-changed restored=n/a readback=n/a`
- `STOP: the wave ended (an exception in block r19-args-1 (RuntimeException: stop existing-tool-changed)) (at 2026-10-28T22:09:00.817Z)`
- The runner closed its own windows and `stopped own process srv8081`.

## 6. Restore, R19-LOGS, CHECK rows
- R19-RESTORE (RESTORE, DIALOGS, RULES lines): not printed, block not reached. The state read at start was `armed=true evaluate=true blocklist lines=0 uploadfolders lines=0` (hashes equal the empty hash); nothing was toggled afterwards.
- R19-LOGS (CONSOLE, SCAN, SCANTOOL, DAEMONLOG): not printed, not reached.
- `CHECK rows`: not printed.

## 7. Scans (`recipes/s11b.ts scan18 --what other --file`)
- Record: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- Evidence: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- Console: no file written, not scanned.
- Nothing redacted.

## 8. Listener check
After the run: `TCP 127.0.0.1:9234 LISTENING 38440`, nothing on 808x. PID 38440 is `node.exe` (nvm v25.2.1) running `<HOME>\Projects\chrome-remote-extention\daemon\dist\index.js`, the daemon. Before the run, nothing listened on 9234 or 808x. Killed nothing.

## 9. Handoff
- The out dir `a1` holds `r19-globals.clixml`; a later attempt needs a fresh S11_OUT and `-Att 2`, and per the runner header `-Block teardown` with `S11_OUT=<a1>` only if the step agent decides so (not a failed-restore case).
- For the step agent: why R19-ARGS-1 stopped. All five MCP-leg cases ended `ERROR` while the SDK leg answered. Details are in `$TEMP/bridge-e2e/s19-live/a1/node-err.txt` and `node-out.txt` (not read by me). Fix rounds: this is runner attempt 1.

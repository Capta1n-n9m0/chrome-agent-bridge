# S5-liveA20 runner, attempt 2

Model/effort: Sonnet, medium.

## 1. Verdict
DONE-PARTIAL. The script exited 2 (STOP `throw-after-state`) in block `r20-con-notea-b`, after 9 of the 15 ids. The restore succeeded (`restored=yes readback=equal`). Teardown ran (exit 0). Nothing past the STOP was run, and no helper was touched.

## 2. Outputs
- Preflight: `git status --short` showed only `S5-liveA20.ledger.md` modified (the step agent's own bookkeeping). The steps dir is excluded by the script's clean-tree guard, and the guard did not fire. HEAD was 3c6def3. Before the run, no listener on 9234 or 8080-8089.
- Build line: `built extension → dist/` (`npm run build`).
- Script exit code: 2. Start 2026-10-29T16:58:39Z, end 2026-10-29T17:01:39Z.
- Record (written by the script, unedited): `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveA20-att2.txt` (220 lines). It has 0 hits for the user's name and 0 for a home path.
- Evidence: `S5-liveA20-evidence-att2.txt` (stdout, redacted), `S5-liveA20-console-att2-1.txt` (console segment 1). Both have 0 hits for the user's name and a home path after redaction.
- Logs copied before teardown to `$TEMP/bridge-e2e/s20-live-a2-logs` (only `p8081.txt`).

## 3. Record lines, verbatim
```
MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank
LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered
```
ROW lines:
```
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
ROW RULES PASS: RULES 0
ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on
ROW RD-0 (d) PASS: the found list blocks no fixture URL
ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank
2026-10-29T16:59:52.411Z s9-win: ROW R20-0 PASS slice=A
2026-10-29T17:00:00.778Z s9-win: ROW R20-POP-BG FAIL
2026-10-29T17:00:08.979Z s9-win: ROW R20-POP-FG FAIL
ROW R20-POP-OTHER unjoined NOT MEASURED — no unjoined tab can be made
2026-10-29T17:00:31.817Z s9-win: ROW R20-POP-OTHER FAIL
2026-10-29T17:00:42.375Z s9-win: ROW R20-POP-NONE PASS
2026-10-29T17:00:47.007Z s9-win: ROW R20-ARGS-ORDER RECORD
2026-10-29T17:00:48.056Z s9-win: ROW R20-CON-DESC PASS
2026-10-29T17:01:00.079Z s9-win: ROW R20-CON-CAP PASS
2026-10-29T17:01:09.062Z s9-win: ROW R20-ARGS-3 PASS
2026-10-29T17:01:16.426Z s9-win: ROW R20-CON-4 PASS
2026-10-29T17:01:30.878Z s9-win: ROW R20-CON-FLOOR PASS
2026-10-29T17:01:37.173Z ROW R20-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
```
Not reached (no ROW line): R20-CON-NOTEA (the STOP came in its second block, `r20-con-notea-b`), and the other liveA20 ids after it. I did not compare these against the 15-id list: the run stopped, so the "exactly one ROW per id" check does not hold for this attempt.

POP/FAIL detail the script printed:
```
POP R20-POP-BG leg=bg n=3 granted-to=A in-ms=95 others=0 held-call=ok active-guard=bg console-new=95
LEG R20-POP-BG bg FAIL / CHECK R20-POP-BG clauses=1 failed=1
POP R20-POP-FG leg=fg n=3 granted-to=A in-ms=61 others=0 held-call=ok active-guard=fg console-new=90
CHECK R20-POP-FG compare R15-POP-2 (a) leaseGranted 150 ms in-ms=61
LEG R20-POP-FG fg FAIL / CHECK R20-POP-FG clauses=1 failed=1
POP R20-POP-OTHER leg=third n=3 granted-to=A in-ms=66 others=0 held-call=ok active-guard=bg console-new=129
LEG R20-POP-OTHER third FAIL
POP R20-POP-OTHER leg=human n=3 granted-to=none in-ms=n/a others=0 held-call=ok active-guard=fg console-new=0
LEG R20-POP-OTHER human FAIL / CHECK R20-POP-OTHER clauses=2 failed=2
```
I do not judge these. The failing clause names are not on the printed lines. The `CHECK R20-POP-OTHER third b-window=W (sheet: W2)` line is also in the record.

## 4. STOP / RETURN, verbatim
```
2026-10-29T17:01:31.622Z s9-win: WAVE stopping: an exception in block r20-con-notea-b (RuntimeException: window 30346380 is not on this extension's options page)
2026-10-29T17:01:31.622Z s9-win: STOP throw-after-state
2026-10-29T17:01:39.220Z s9-win: RETURN 1 after-stop=throw-after-state restored=yes readback=equal
```
The restore lines printed:
```
RESTORE read-back: stored page equal true, daemon.status equal true, title armed true
RESTORE ok: the found texts (outside the repo) deleted after the read-back matched
```
The state line, by count and hash only: `armed=true evaluate=true blocklist lines=0 sha256=e3b0c4... uploadfolders lines=0 sha256=e3b0c4...` (the empty-input hash, same as found).

## 5. Lines not produced
No `DIALOGS` line, no `SCAN20` line, no `R20-LOGS` line. The STOP came before the logs block. Because there is no `R20-LOGS` scan, text-leak counts for the console segment are covered only by my own scan of the redacted copies (0 hits for the user's name or a home path). The `R20-RESTORE` ROW above is the only restore line besides RESTORE/RETURN.

## 6. Teardown
`-Block teardown -Att 2` with the same `S11_OUT`: exit 0. It printed `CHECK clean PASS: the wave folder and state.json removed` and `SLICE teardown done: calls with a failed check 0, not measured 0 (the rows are in the record)`.

## 7. Ports and processes after
- 9234: held by the daemon (PID 31136), plus client connections from PID 12156 (not mine, not touched). 8080-8089: free.
- The wave's script left one orphan, `node --import tsx recipes\s13-r20-a2.ts con-notea-b --slice liveA20 --ctl absent` (PID 38600, started 17:01:30Z during my run). I killed it. No python is running. PID 22152 (a codex runtime) is not mine and was left.
- Windows: the script closed its four windows (12322184, 17697838, 30346380, 23660898). The toolbar button was found, pinned. I saw no native dialog, DevTools or options window left open, but I did not take a screenshot. The `DIALOGS` line that would confirm this was not produced.

## 8. Findings (for the session agent)
- The STOP is a helper or environment throw: `window 30346380 is not on this extension's options page`, raised in `r20-con-notea-b` right after `READY seen for R20-CON-NOTEA-block`. The window's page class sequence just before the restore shows `about-blank` and `own-page` alternating. The script was in its restore step, so this is the same window the block expected to be on the options page.
- Attempt 2 of 3 is used. Fix rounds used: 2 of 3 per the ledger. A third attempt would need a fix between attempts and a fresh `S11_OUT`.
- The ledger `S5-liveA20.ledger.md` is still uncommitted from before the run (not edited by me).
- New files from me: the record, evidence, console segment and this report, all uncommitted. Commit: no.

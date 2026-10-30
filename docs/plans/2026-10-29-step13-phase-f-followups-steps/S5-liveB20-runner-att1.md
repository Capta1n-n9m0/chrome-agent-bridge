# S5-liveB20 runner, attempt 1

Model Sonnet 5.5, effort medium. HEAD a5476bf (tree clean; an untracked ledger only). 9234: free at start (the daemon was spawned by the wave, pid 30016, still holds it); 8081 free.

## 1. Verdict
DONE-PARTIAL: exit 2, one STOP (`text-leak` at R20-LOGS). Start 2026-10-30T02:38:57Z, end 02:43:35Z, teardown 02:44:00Z (exit 0).

## 2. Outputs
- Build: `npm run build` ok; extension line `built extension → dist/`. Reload: first run exit 2 ("expected exactly 1 new Chrome window, found 2 - nothing pressed"), re-run exit 0 (RELOAD OK).
- Record: docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveB20.txt (298 lines); -3 evidence S13-live-evidence-liveB20-pop3.txt (teardown copied it). Both untracked, not committed.
- Raw run output: `$TEMP/bridge-e2e/s20-liveB/a1` (stdout, teardown text beside it as `s20-liveB-a1-*.txt`).

### Quoted lines
R20-0B:
- `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`
- `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`
- `HEAD a5476bfc78f4 tree=clean`
- `ROW R20-0B PASS slice=B`

POP and ROW lines:
- `POP R20-POP-BG-3 leg=bg n=3 granted-to=A in-ms=110 others=0 held-call=TAB_HELD holder=A active-guard=bg console-join=0 console-url=0` -> `ROW R20-POP-BG-3 PASS`
- `POP R20-POP-FG-3 leg=fg n=3 granted-to=A in-ms=54 others=0 held-call=TAB_HELD holder=A active-guard=fg console-join=0 console-url=0` -> `ROW R20-POP-FG-3 PASS`
- `POP R20-POP-OTHER-3 leg=third n=3 granted-to=A in-ms=57 others=0 held-call=TAB_HELD holder=A active-guard=bg console-join=0 console-url=0` (third PASS)
- `POP R20-POP-OTHER-3 leg=human n=0 granted-to=none in-ms=n/a others=0 held-call=n/a holder=n/a active-guard=fg console-join=unread console-url=unread` (leg NOT MEASURED)
- `ROW R20-POP-OTHER-3 unjoined NOT MEASURED — no unjoined tab can be made`; `ROW R20-POP-OTHER-3 NOT MEASURED`
- `ROW R20-CHOOSE-TWICE PASS`; `ROW R20-CHOOSE-KEPT RECORD`; `ROW R20-CHOOSE-REFUSE-DIS PASS`; `ROW R20-G2-1 FAIL`; `ROW R20-VERSION PASS`; `ROW R20-RESTORE PASS slice=B`; `ROW R20-LOGS FAIL slice=B`

Human leg CHECK lines (verbatim). Popups did not open, so granted-to=none was not a lease refusal; no popup existed:
- `CHECK R20-POP-OTHER-3 human round=1 popup-opened=no opener=none granted-to=none`
- `CHECK R20-POP-OTHER-3 human round=2 popup-opened=no opener=none granted-to=none`
- `CHECK R20-POP-OTHER-3 human round=3 popup-opened=no opener=none granted-to=none`
(READY lines show the three UIA clicks were sent; `CLOSERPROBE` later: `human-click sent=yes`.)

Liveness control: only `console-join=unread console-url=unread` on the human leg (no popup, so nothing to read). `control-disarmed-last=3` printed at `CONSOLE liveB20 segments=3`.

R20-G2-1: `G2 R20-G2-1 leg=covered a-reply=77 b-reply=35120 gap-ms=35043 ... b=TIMEOUT` -> `LEG R20-G2-1 covered FAIL`; uncovered leg PASS (gap 529 ms); `CHECK R20-G2-1 cause=capture of a covered window`; `CHECK R20-G2-1 clauses=2 failed=1`. The covered window B had `covered-by-others-px=2073600` (all windows maximized at the same rectangle).

R20-VERSION: `LOADED20 keys=sorted nested=sorted elem=sorted perm=yes listener=no enabled=yes args=answered`, `LOADED20 rerun=1 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, `RESTOREHEAD ok`.

Restore:
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`
- `RESTORECHECK stored=equal differs-by=none`
- `DIALOGS B native=0 devtools=0 wave-windows-open=1` (note: 1, not the 0 the B4 text predicted; the wave then closed windows 6229028, 331014, 37096718, 1051686 at stop)

SCAN20 (counts; name/sentinel/token):
- console 0/0/0; daemon 0/0/0; evidence 0/0/0
- actors browser_new_tab 0/0/0; browser_upload_file name=1/0/0; browser_evaluate 0/0/0; browser_close_tab 0/0/0
- `CHECK rows20 rows=11 warns=0 stop-return=0`

STOP / RETURN pairs:
- `STOP: R20-LOGS: the user name, the sentinel or the token is above 0 in a stream (text-leak)`
- `RETURN 1 after-stop=text-leak restored=n/a readback=n/a` (the restore itself had already passed at R20-RESTORE, UP-RESTORE PASS)

## 3. Verifier verdict
None (runner).

## 4. Deviations
None. I ran teardown because the RETURN read `restored=n/a`, not `no`. Teardown: exit 0, `CHECK clean PASS`, `SLICE teardown done: calls with a failed check 0, not measured 0`.

## 5. Proposed decisions
None.

## 6. Findings (not judged)
1. text-leak: the single name hit is in the actors file for `browser_upload_file`, line 4 of `actors-liveB20.jsonl`. It is the MCP tool's TIMEOUT answer, which includes a failure-report line `Screenshot: <home>/.chrome-agent-bridge/failur...` (a path under the user's home). That is the R20-CHOOSE-TWICE call-1 TIMEOUT path (the first browser_upload_file TIMEOUT). The record and -3 evidence have 0 hits. Whether this is a scanner expectation problem or a product finding (a home path in an MCP failure text) is for the session agent.
2. R20-POP-OTHER-3 human leg: no popup opened in any of 3 rounds after the UIA clicks (`popup-opened=no`), so the unjoined clause is NOT MEASURED. Not a lease finding.
3. R20-G2-1 covered leg: window B reply took 35 s with TIMEOUT; both windows were at the same maximized rectangle (px covered 2073600). Uncovered leg passed.
4. `DIALOGS B ... wave-windows-open=1` at R20-RESTORE.

## 7. Handoff
- State after: daemon pid 30016 alone holds 9234 (established client 27384 is not a node process in the node list); 8080-8089 free; the only other node.exe is a codex runtime (not ours, untouched); `git worktree list` shows only the main tree (old-wt gone); no wave window seen open; nothing killed.
- Redaction scan (record and -3 evidence): user name 0, home path 0, token 0, `DevTools - ` 0. No evidence copies made.
- Tracked tree unchanged; new untracked: the record, the pop3 evidence, this report (and the earlier ledger).

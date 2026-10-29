# S5-liveA20 runner, attempt 3 (Sonnet, medium)

**Verdict:** DONE. Script exit 0. HEAD 10db89d, tree clean before the run.

- Build: `built extension → dist/` (extension build line of `npm run build`).
- Run: 17:27:2x Z (first record line 17:27:23Z) to 17:30:57Z; teardown 17:31:22Z, exit 0 (`CHECK clean PASS`, `SLICE teardown done: calls with a failed check 0, not measured 0`).
- Record: S13-live-record-liveA20-att3.txt (340 lines); `CHECK rows20 rows=15 warns=0 stop-return=0`. Exactly 15 `ROW R20-*` lines.
- LOADED20 lines:
  - `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`
  - `LOADED20 keys=sorted nested=sorted elem=sorted perm=yes listener=no enabled=yes args=VERSION` (ARGS-OLD, old build)
  - `LOADED20 rerun=1 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered` (HEAD restored)
- ROW lines (as printed): R20-0 PASS slice=A; R20-POP-BG FAIL; R20-POP-FG FAIL; R20-POP-OTHER FAIL (with `ROW R20-POP-OTHER unjoined NOT MEASURED — no unjoined tab can be made`); R20-POP-NONE PASS; R20-ARGS-ORDER RECORD; R20-CON-DESC PASS; R20-CON-CAP PASS; R20-ARGS-3 PASS; R20-CON-4 PASS; R20-CON-FLOOR PASS; R20-CON-NOTEA PASS; R20-ARGS-OLD PASS; R20-RESTORE PASS slice=A; R20-LOGS PASS slice=A.
- The POP FAILs print `granted-to=A others=0` in every leg, but `held-call=ok` beside `ANSWER … TAB_HELD control=TAB_HELD own=ok`, and `console-new=95/90/129`. POP-FG also prints `CHECK … compare R15-POP-2 (a) leaseGranted 150 ms in-ms=60`. These are the same reader questions attempt 2 raised; not judged here.
- STOP/RETURN: none.
- Lines verbatim: `ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash`; `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `RESTORECHECK stored=equal differs-by=none`; `RESTOREHEAD ok`.
- `DIALOGS liveA20 native=0 devtools=0 wave-windows-open=1`
- SCAN20 (counts): console, daemon, evidence, actors browser_new_tab, actors browser_snapshot all name=0 sentinel=0 token=0; actors browser_evaluate name=0 sentinel=2 token=0; actors browser_console_messages name=0 sentinel=13 token=0 (the sentinel counts are in the actors file, as printed; R20-LOGS reads PASS).
- Teardown closed 3 wave windows and stopped srv8081 (own PID).
- After: 9234 held by one process (PID 35332, the daemon); 8080-8089 free. No node process matching s13-r20 / s12-r19 / s12-oldbuild (nothing killed). `git worktree list`: only the main tree, no `old-wt` leftover registered (a scratch dir `old-wt` remains under S11_OUT, outside the repo). Nothing left on screen that I could see; the tree has only my five untracked evidence/record files.
- Evidence (home path -> <home>, user name -> <user>; redaction scan over all five files: 0 hits): S5-liveA20-evidence-att3.txt, S5-liveA20-console-att3-1.txt, -2.txt, -3.txt (the DevTools window-title line redacted to `DevTools - <user>`). The record itself carries no home path and no user name (0 hits).
- No commit. Raw out dir: `$TEMP/bridge-e2e/s20-live/a3`.

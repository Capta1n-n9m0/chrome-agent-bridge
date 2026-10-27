# S4-live runner 7 (attempt 7), report
Model/effort: Sonnet 5.5, medium.

## Step 0 (teardown), verbatim
```
2026-10-27T02:31:11.104Z s9-win: BLOCK teardown start
CHECK clean PASS: the wave folder and state.json removed
2026-10-27T02:31:11.626Z s9-win: TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed
2026-10-27T02:31:11.628Z s9-win: BLOCK teardown done
```
Exit 0; r17-globals.clixml gone; run1, run3, run4, run5, run6 preserved (none removed).

## liveA: exit 2 (STOP in block `history` judge: judge-history, row RD-BACK-EMPTY)
Output %TEMP%\s4live-run7-liveA.out; record renamed to S4-live-run7A-record.md (0 lines match the user name).
STOP, verbatim (after G1 and after the list was restored by the runner):
`ROW RD-BACK-EMPTY STOP: answer INTERNAL, not ok: a call on a page with no redirect answers differently`
`STOP: RD-BACK-EMPTY: answer INTERNAL, not ok: a call on a page with no redirect answers differently`
`WAVE stopping: an exception in block liveA (RuntimeException: node s11b judge-history ended in a STOP)`
`STOP: the wave ended (...) (at 2026-10-27T02:37:24.826Z)`
The runner's own STOP path then restored: one toolbar press pair, options page re-read, `STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c442... uploadfolders lines=0 sha256=e3b0c442...` (the empty-text hash, equal to RD-0's), `ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 0 ms`, `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`, `RESTORE ok: the found texts (outside the repo) deleted after the read-back matched`. I ran no rd-restore (none needed). RD-RESTORE (own row) and RD-LOGS did not run as rows.
Root cause candidate (helper/product, step agent decides): every `back` on the history tabs answers INTERNAL (`Cannot find a next page in history.` at set-up in attempt 6; RD-BACK, RD-BACK-SAMEDOC, RD-BACK-EMPTY here answer INTERNAL in 5-6 ms, `<message len=35>`).

## Rows as the record prints them
- RD-0 (a) PASS (MANIFEST dnrWithHostAccess=true staticRuleSets=absent, first record line); RULES PASS (RULES 0); `TOGGLE reading on (candidates 1; on 1, off 0); nothing was pressed`; `STATE armed=true evaluate=true blocklist lines=0 ... uploadfolders valid=0 invalid=0`; RD-0 (c) PASS; `FOUNDLIST blocks-fixtures=no`, RD-0 (d) PASS.
- UP-L1 PASS (FOUNDCHECK root=not outside=not). RD-CTL PASS (`HITS ctl redirect=0 blocked=1`; 302 times 15/12, 3/4, 2/3, 4004/4004 ms).
- F-FILETAB: tabs, hidden row, snapshot, navigate, untouched, control all PASS. F-HOME PASS. RD-CAPS-WARN PASS.
- RD-REGEX: all five `REGEX ... supported=true` (h119, h120 len=120, h121 len=121, bank443-schemes, bank443-explicit); no PASS/FAIL (RECORD).
- HISTDIAG/HISTORY: `HIST setup-hb PASS`, `HIST setup-hf PASS`; `HISTORY back built navigations=2 backs=0`; `HISTDIAG fwd row=2 navigations=3 backs-done=0`; `HISTORY fwd set-up NOT BUILT at=back 1 INTERNAL "Cannot find a next page in history."`
- D4.3 lines:
  - RD-1: `CHECK RD-1 nav PASS — DOMAIN_BLOCKED, exact message, no data`; `LAT RD-1 94 ms`; `HITS rd1 redirect=1 blocked=0`; RULES 0 PASS (x2).
  - RD-6: `RD6 url=fixture-8085`; `HITS rd6 redirect=1 blocked=1`; RULES 0.
  - RD-2: answer open ok; snapshot K-tab (DOMAIN_BLOCKED, tab text); `HITS rd2 redirect=1 blocked=1` (RECORD).
  - RD-3: dl PASS (DOMAIN_BLOCKED exact, no file); control leg dl-ctl PASS (exact, no file); `LAT RD-3 10 ms`; `HITS rd3 redirect=1 blocked=0`; `HITS rd3c redirect=0 blocked=0`; RULES 0 PASS.
  - RD-4: setup PASS, nav PASS (ok); `HITS rd4 redirect=1 blocked=1`; RULES 0.
- RD-DL-ERR-1/2/3 PASS K-fetch (314, 312, 312 ms). RD-DL-HOP-1/2/3 PASS (K-url, no file, blocked=0; 9, 9, 9 ms).
- RD-7: `HITS rd7 redirect=1`, RULES 0 (answer/CTX lines in the record). RD-8: `HITS rd8 redirect=1`; snapshot INTERNAL (error page, not a file: render).
- RD-BACK: `HISTREPLY RD-BACK kind=INTERNAL ms=6`; `HITS bk blocked=0`; `FLIP bk n200=1 n302=0 total=1`; **ROW RD-BACK FAIL: answer INTERNAL is neither ok nor K-tab**.
- RD-FWD: **NOT MEASURED** (its history set-up was not built).
- RD-BACK-SAMEDOC: **FAIL: answer INTERNAL, not ok** (6 ms).
- RD-REBUILD-NARROW PASS (ok, 3126 ms; samples min=1 max=1; after 0).
- RD-DISARM: `RULES expect=1`; **CHECK RD-DISARM FAIL: code DOMAIN_BLOCKED, want DISARMED** (answer was K-tab text, 4035 ms); `RULES samples=[1,1,1,1]` / after=0 PASS; `HITS rdd redirect=1 blocked=0`; `wait-safety NOT reached ... blockedCount=1` (the state was later read back at blockedCount=0 by the restore).
- RD-5 PASS (GAP 369 ms, `HITS rd5 redirect=1 blocked=0`). RD-5b PASS (`RULES expect=1`, samples min=1, after 0, `HITS rd5b redirect=1 blocked=0`).
- RD-BACK-EMPTY: STOP (above).
Not reached: R17-UP-OPT, UP-6, UP-7, SAVE-REFUSE, RD-DL-SOCKET (RD-DL-SOCKET sits after RD-BACK-EMPTY), RD-LOGS.

## RD-LOGS, scans, evidence
RD-LOGS did not run: no SCAN lines, no chrome-blocked count. Earlier-attempt scans (run1, run3-run6) not run: they were ordered after liveA's RD-LOGS, and the STOP rule says return. Evidence: no S4-live-run7A-console.txt copied (RD-LOGS scan did not pass/run). Raw console.txt (1379 texts) left in %TEMP%\bridge-e2e\s11b, not copied.

## liveB
Not run (liveA exit 2; toggle read on). r17-globals.clixml REMAINS in %TEMP%\bridge-e2e\s11b with state.json, found/, wave/, console.txt (a STOP path does not run teardown); the step agent decides `-Block teardown`.

## Process/port check
netstat on 8081-8091: nothing. The runner stopped its own servers and closed its four windows. No process of mine left; SDK daemon may remain. `git status`: only the S4-live files (record run7A and this report new).

# S4-live attempt 4 runner report (Sonnet, medium)

**Verdict: BLOCKED. liveA exit 2 (STOP) at block rd-caps-warn. No liveB. No RD-LOGS ran.**

## Step 0 (teardown, once)
- `BLOCK teardown start` / `CHECK clean PASS: the wave folder and state.json removed` / `TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed` / `BLOCK teardown done`; exit 0, no STOP.
- r17-globals.clixml was gone after step 0. `bridge-e2e\s11b\run1\` and `\run3\` still exist (teardown removed neither).

## liveA (record renamed to S4-live-run4A-record.md, 78 lines)
Prologue: PREFLIGHT ok (head 4446d17, tree clean, ports free); SERVERS up; files made; window W; reload-extension exit 0 on attempt 1 (RELOAD OK); 7 setup tabs PASS (T1925..T1931); `STATECOMPAT nothing missing`; worker console open.

Rows as printed:
- RD-0 (a) PASS (`dnrWithHostAccess=true, staticRuleSets=absent`); `ROW RULES PASS: RULES 0`
- RD-0 (c) PASS: armed, JavaScript on, `TOGGLE reading on`; RD-0 (d) PASS (found list blocks no fixture URL)
- `STATE armed=true evaluate=true blocklist lines=0 ... uploadfolders lines=0` (found state both empty)
- UP-L1 PASS (`FOUNDCHECK root=not outside=not`)
- RD-CTL PASS (all controls hold; `CTL 8091 flip 200 then 302`; `HITS ctl redirect=0 blocked=1`)
- F-FILETAB PASS on tabs, hidden row, snapshot, navigate, untouched, control; `RECORD F-FILETAB tabCreated url-empty=NOT MEASURED`
- F-HOME PASS (summary and four K-opt-home items exact, work line valid, nothing stored)
- RD-CAPS-WARN: began (`BOX blocklist set (2 non-blank line(s); typed, NOT saved)`), then the block threw. No ROW line.

Not run: RD-CAPS-WARN verdict, RD-REGEX, RD-1 .. RD-6 (D4.3 lines: none exist), all later rows, RD-RESTORE, RD-LOGS, teardown. No chrome-blocked count.

## STOP (verbatim)
Block: `liveA`, inside `rd-caps-warn`, after `BOX blocklist set (2 non-blank line(s); typed, NOT saved; text withheld)` at 01:09:38.951Z:
```
WAVE stopping: an exception in block liveA (RuntimeException)
STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T01:09:42.191Z)
```
The exception text is not printed. Candidate site (not confirmed): `Get-S11bCaps` in recipes/s11b-win.ps1:94-107 (called from `Get-S11bCapsObs`, :374-376), which throws at :97 `the options page shows no block-list summary: not read` when UIA finds no `blocklist-summary`, or its list-item read at :101-102. Attempt 3 ended with the same STOP wording but earlier (F-FILETAB, per runner3). A helper defect for the step agent: the stop procedure prints only the exception type, never its message.

## Safety state
- Nothing in the wave saved a safety value (every box was typed, not saved; `S16Changed` is set by no block before rd-caps-warn), so the runner ran no restore and I ran no `-Block rd-restore`.
- Last read-back before the STOP (F-HOME, 01:09:38.393Z): `armed=true evaluate=true blocklist lines=0 sha256=e3b0c442...b855 uploadfolders lines=0 sha256=e3b0c442...b855`, equal to the found state. The block list was then typed (2 long hosts, unsaved) in options window 17107490, which the stop procedure closed. No read after that.
- r17-globals.clixml EXISTS again (the stop did not remove it); %TEMP%\bridge-e2e\s11b\console.txt, state.json, wave\, found\ remain.

## Earlier-attempt scans and evidence
- Not run: the brief puts them after liveA's RD-LOGS, which never ran; a STOP returns.
- No evidence copy made (RD-LOGS did not run; `console-evidence.txt` was not written).
- grep for `aliev` in S4-live-run4A-record.md: no hit. No other copy made.

## Process / port check
netstat on 8081-8091: nothing listening. Runner stopped its own servers srv8081/8083/8085-8089/8091 and closed its windows. Remaining node process 17656 is the SDK-spawned daemon. No runner/server/actor process of mine is left.

## Not run (G11-3 gate does not apply)
Toggle read on, so liveB would have run; it was not started because liveA exited 2.

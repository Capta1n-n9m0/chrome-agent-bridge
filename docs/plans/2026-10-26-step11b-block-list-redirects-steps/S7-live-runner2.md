# S7-live runner 2 report (Run 17b, attempt 2, live)

Model: Sonnet, effort medium. Date 2026-10-27. I record; the verdict words below are the record's own, printed by the helper. I did not judge or re-judge.

## 1. Verdict: DONE (no STOP in either slice; several rows printed FAIL or NOT MEASURED, recorded below)

## 2. Outputs
- Preconditions: HEAD 6f3413c; `git status --short` showed only the three untracked steps-dir files; `netstat`: 8080-8099 and 9234 free (no daemon).
- `npm run build`: exit 0; tracked tree clean after.
- `S11_OUT=%TEMP%\bridge-e2e\s11b-r17b-2`. liveA17B: exit **0**, log `%TEMP%\bridge-e2e\s11b-r17b-2\liveA17B.log` ("calls with a failed check 2, not measured 5"). liveB17B: exit **0** (toggle read `on`, so no G11-3 branch), log `...\liveB17B.log` ("failed check 4, not measured 1"). No STOP line in either.
- Records (moved, not copied): `S7-live-run2A-record.md` (607 lines), `S7-live-run2B-record.md` (265 lines), both untracked in the steps dir.
- First line of both records: `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`; then `S6 commit=ancestor`, `ROW R17B-0 (e)(f) PASS`.
- Found state (both slices): `armed=true evaluate=true blocklist lines=0 uploadfolders lines=0`, `TOGGLE reading on`, `FOUNDLIST blocks-fixtures=no`.

## 3. §4.25 rows (record's verdict word)

liveA17B:

| Row | Record |
|---|---|
| R17B-0 | `ROW RD-0 (a) PASS`, `(c) PASS`, `(d) PASS`, `ROW R17B-0 (e)(f) PASS`; `TABWATCH created-url=about:blank completes=1 first-complete-ms=6`; `RULES 0` |
| R17B-UP-L1 | PASS (its console-scan clause is judged by R17B-LOGS' SCAN line) |
| R17B-CTL | PASS; `CTL 8087 slow answered after 3066 ms` (`ROW R17B-CTL 8087 PASS`); `CTL 8091 flip 200 then 302` |
| R17B-ACT-CTL | PASS, twice (two printed verdicts): `HIST act-ctl built=3 pages activated=3`, `ACT act-ctl n=3 ok`, each call `ok`, 11-12 ms |
| R17B-BACK-NOACT | PASS (recorded): answer `INTERNAL`, reply 3 ms (printed twice) |
| R17B-RD-2 | PASS (recorded): open `ok` T2261; tabs row `hidden=blocked`; snapshot `DOMAIN_BLOCKED` (K-tab); `HITS bd2 redirect=1 blocked=0`; `RULES 0`; `TABWATCH created-url=about:blank completes=1 first-complete-ms=6` |
| R17B-NEWTAB-PLAIN | PASS: open `ok` T2262, snapshot `elements=29`, playground counter text; `HITS bnp blocked=0`; `created-url=about:blank`; `RULES 0` |
| R17B-NEWTAB-LOAD-1..5 | Each printed `ROW ... NOT MEASURED: reply and page hold; blocked or RULES after not given` (the helper's per-trial line) and then `s9-win: ROW R17B-NEWTAB-LOAD-<i> PASS (by 3 clause checks)`. LAT: 3074, 3102, 3074, 3076, 3075 ms; each `ANSWER ok`, `page=playground elements=29`, `HITS bnl<i> blocked=0`, `RULES 0`; TABWATCH each `created-url=about:blank completes=1 first-complete-ms=6`, reply-ms 3074/3102/3074/3076/3075 |
| R17B-NEWTAB-REFUSED | PASS (record's judged clause: tab-row count 18 before and after, equal); answer `INTERNAL "JavaScript URLs are not allowed in API based extension navigations. Use chrome.scripting.executeScript instead."` (36 ms); `TABWATCH created-url=about:blank completes=1 first-complete-ms=6` |
| R17B-BACK | PASS: answer `DOMAIN_BLOCKED` (K-tab), reply 37 ms; `HITS bbk blocked=0`; `FLIP bbk n200=1 n302=1 total=2`; `RULES 0`; status-after `NOT MEASURED (the SDK exposes no tab status)` |
| R17B-FWD | PASS: first `forward` (`LAT R17B-FWD-1`) 33 ms; second 37 ms, `DOMAIN_BLOCKED` (K-tab); `HITS bfw blocked=0`; 2 flip requests |
| R17B-BACK-SAMEDOC | PASS: `ok`, 10 ms |
| R17B-DISARM | PASS: `DISARMED` refusal with data, `LAT 4039 ms`; `RULES expect=1`, `RULES samples=[1,1,1] min=1 max=1`, `RULES after=0`; `HITS bdd redirect=1 blocked=0`; ON pressed 1577 ms after the reply; safety read back `armed=true evaluate=true blockedCount=1` (G1's state) |
| R17B-BACK-EMPTY | PASS: `back` `ok` 12 ms, `forward` `ok` 10 ms, `RULES samples=[0,0,0,0,0] max=0`; `HIST be built=2 pages activated=2` |
| R17B-RD-DL-SOCKET | PASS (2 verdict lines) |
| R17B-UP-OPT | **FAIL**: `O2 showed the saved text after 6105 ms, over 5 000 ms` |
| R17B-UP-6 | **FAIL**: all five legs `banner seen` (outside, missing, relative, raw-dotdot, raw-notarget) |
| R17B-UP-7 | PASS |
| R17B-SAVE-REFUSE | **NOT MEASURED** (`0 verdict lines, none printed`); its sub-rows `SAVE-REFUSE-R sdk-leg` and `mcp-leg` each printed PASS |
| R17B-RESTORE | PASS: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `RULES 0` |
| R17B-LOGS | PASS: `SCAN console: ://=0 token=0 localhost:8085=0 ... profile=0`; `SCAN daemon` all 0; `SCAN actors: ://=1 (fixture 1, other 0)` rest 0; `CONSOLE window-title lines dropped=3`, `chrome-blocked lines redacted=0`; 1675 console texts |

liveB17B (toggle on):

| Row | Record |
|---|---|
| R17B-0 | same first line; `(a)(c)(d)(e)(f)` PASS |
| R17B-F-RAW | **FAIL**: `F-RAW: banner seen` |
| R17B-F-RAW-2 | **FAIL**: `F-RAW-2: banner seen` |
| R17B-F-RAW-DIR | **FAIL**: `F-RAW-DIR: banner seen` |
| R17B-F-RAW-ENC | PASS |
| R17B-F-RAW-OK | PASS |
| R17B-UP-RACE-A | **FAIL**: `98 call(s) started at or after P + 1 000 ms answered ok` |
| R17B-UP-DEVT | **NOT MEASURED**: `DevTools was not attached` |
| R17B-RESTORE | PASS: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` |
| R17B-LOGS | PASS: `SCAN console` and `SCAN daemon` all 0 |

No `STOP` line anywhere (no blocked hit, no refused activated back/forward, no activation guard).

## 4. Restore (D7.5)
Both slices read back equal by count and hash (lines above). After the run, `daemon.status` safety: `armed=true evaluate=true blockedCount=0 extensionConnected=true` (counts only).

## 5. Evidence and scans
- Console copy: `S7-live-run2-console.txt` is the helper's redacted capture (`console.txt`) of **liveB17B only**. liveA17B's capture was overwritten by liveB17B in the same scratch dir (the helper uses one path); liveA's scan results are in its record, but its raw capture no longer exists. (Helper limitation, not fixed.)
- `s9.ts scan-file --mode committed`: console copy PASS (`://=0`, token 0). Run2A record: `CHECK SAFE-10 ... FAIL — non-fixture :// 3`; Run2B record: same FAIL, 3. The only non-fixture `://` in both is the extension's own `chrome-extension://<extension id>/options.html` in `window ... now shows` lines (A: 15 lines, B: 3). No other URL. token=0 in all three; token file contents grep: 0 matches in all three; no `C:\Users` or `/c/Users` path in the committed files (the helper printed `<PROFILE>`; I replaced nothing). No block-list or Upload-folder text printed.

## 6. Processes
- Started by the wave and ended by its own teardown: 6 fixture servers (8081, 8083, 8085, 8086, 8087, 8091); ports 8081-8099 free after both slices (netstat). The helper closed its windows.
- Left running: the bridge daemon (node PID 2712, listening on 9234), by design. Not mine and untouched: node 22152 (codex runtime), powershell 9332 (an IDE terminal). My watcher shells ended. No chrome.exe action.
- Logs: `%TEMP%\bridge-e2e\s11b-r17b-2\` (liveA17B.log/.exit, liveB17B.log/.exit, console.txt, daemon-slice.txt, r17b-framing.txt, actors\). `r17b-globals.clixml` not present afterwards.

## 7. Deviations / findings
- None from the brief. The watchers returned early on the first try only because the shell wrapper detached; I confirmed the `.exit` files and logs before proceeding.
- Observed for S7-record: the `NOT MEASURED` text on every `R17B-NEWTAB-LOAD-<i>` line ("blocked or RULES after not given") sits beside a `PASS (by 3 clause checks)` line for the same trial; the R17B-ACT-CTL and R17B-BACK-NOACT verdict lines are each printed twice. The helper's liveA/liveB console capture shares one file path.

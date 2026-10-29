# S7-live liveB19: Run 19 slice B, live (step report)

Step agent: Claude Opus 5.5, medium. Runners: Claude Sonnet 5.5, medium (`S7-live-runner-liveB19-att1.md`, `-att2.md`).
Fixer Sonnet 5.5 medium (`S7-live-B-fixer.md`), verifier Opus 5.5 medium (`S7-live-B-verifier.md`). Ledger:
`S7-live.ledger.md` (the liveB19 entries).

## 1. Verdict
**DONE.** Attempt 2 ran to its end with no STOP: `CHECK rows19 rows=24 warns=0 stop-return=0`, `SLICE liveB19 done:
calls with a failed check 0, not measured 0`, exit 0. R19-RESTORE PASS (equal to R19-0 by count and hash), R19-LOGS
PASS. No row FAIL. Three DevTools rows are NOT MEASURED by the sheet's pre-registered rule (`DEVPROBE … attached=no`),
and that `attached=no` has a helper cause found by the step agent (§6, proposal 1). Budget used: attempts 2 of 3, fix
rounds 1 of 3 (#367, per slice).

## 2. Outputs
- **Commits:** `2ca7383` att 1 evidence; `a40aa86` fix round 1 (verifier PASS-with-notes); att 2 evidence and this
  report in the commit after it (hash in the ledger and the session agent's journal).
- **Attempt 1** (HEAD `0f4392d`, out `$TEMP/bridge-e2e/s19-live/b1`, exit 2): `S7-live-record-liveB19.txt` (216 lines; att 1
  carries no suffix, as liveA19's), `S7-live-evidence-liveB19-att1.txt` (339), `S7-live-console-liveB19-att1-1.txt` (793).
- **Attempt 2** (HEAD `a40aa86`, out `…/b2`, exit 0, build `built extension → dist/`): `S7-live-record-liveB19-att2.txt`,
  `S7-live-evidence-liveB19-att2.txt`, `S7-live-console-liveB19-att2-1.txt`.
- **File scans** (`recipes/s11b.ts scan18 --what other`), every file of both attempts: `://=0 (fixture 0, other 0)
  token=0 sentinel=0 profile=0`. Window-title lines dropped from each console copy: 3. A search of every liveB19 file for
  the user's name, user folder or `Users\` paths: 0 (after the step agent redacted one line of the att 1 runner report,
  where the runner had written the profile display name as its grep pattern).
- **Tests:** npm test 5576 → 5577 (233 files; fix round 1's one new test), typecheck and 7 recipes tsconfigs exit 0
  (verifier's re-run).

### Attempt 1 rows as printed
`ROW R19-0 PASS slice=B` (RD-0 (a)(c)(d), RULES 0, R17B-0 (e)(f) PASS, twice); `DEVPROBE method=uia-menu answer=ok
ms=15383 attached=no`; `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=155 native-after=0`; `ROW R19-UP-OPT PASS`
(`OPT observed standing x1 invalid items 3 warned items 0`, `OPT O2 shown=yes at=360 polled-ms=362`, `OPT O2 front
after-save=yes before-conflict-read=yes`); `ROW R19-BANNER-CTL PASS slice=B` (neg `idle-ms=20004 polls=16 banner=none`,
pos `answer=ok polls=16 banner=seen`); `ROW R19-UP-6 PASS` (clauses=5 failed=0); `ROW R19-F-RAW PASS`, `-2`, `-DIR`
(clauses=2 failed=0 each). R19-KEEP-1: `KEEPSEQ R19-KEEP-1 calls=5 gap-ms=3000 answers=4/5 banner=continuous end-ms=9982
poll-ms=319` → STOP (below). Not reached: KEEP-2 onwards, R19-LOGS, the DIALOGS line.

### Attempt 2 rows as printed
- `ROW R19-0 PASS slice=B` (`LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`).
- `DEVPROBE method=uia-menu answer=ok ms=15365 attached=no` (after `CHECK devtools-menu step=menu-button found=no`).
- `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=123 native-after=0`.
- `ROW R19-UP-OPT PASS`: `OPT observed standing x1 invalid items 3 warned items 0`, `OPT O2 shown=yes at=362
  polled-ms=362`, `front after-save=yes before-conflict-read=yes` (the #363/#364 fix; Run 18's FAIL read `shown=no`).
- `ROW R19-BANNER-CTL PASS slice=B`: neg `idle-ms=20002 polls=16 banner=none`, pos `answer=ok polls=15 banner=seen`.
- `ROW R19-UP-6 PASS` (clauses=5 failed=0); `ROW R19-F-RAW PASS`, `ROW R19-F-RAW-2 PASS`, `ROW R19-F-RAW-DIR PASS`
  (clauses=2 failed=0 each).
- `ROW R19-KEEP-1 PASS banner-clause=NOT DISCRIMINATING`: `KEEPSEQ … calls=5 gap-ms=3000 answers=5/5 banner=continuous
  end-ms=10122 poll-ms=247`.
- `ROW R19-KEEP-2 PASS`: idle `end-ms` 10045/10020/10021 `next=ok`; ctl 5050/5161/5021 `next=BAD_PARAMS`; `medians
  idle=10021 ctl=5050 measured=yes`.
- `ROW R19-KEEP-3 PASS` (clauses=12 failed=0): `next=` DISARMED (disarm), DOMAIN_BLOCKED (block, nav-blocked, nav-own,
  nav-file), TAB_GONE (close), each `end-ms` 6177–6649; `leg=replace NOT RUN — no deterministic trigger is sourced`.
- `ROW R19-CON-KEPT PASS` (sdk PASS, mcp PASS, clauses=2 failed=0; its console clause judged in R19-LOGS).
- `ROW R19-KEEP-OVERLAP PASS slice=B`: `OVERLAP … leg=evaluate first=ok second=DEBUGGER_DEVTOOLS exact=yes`.
- `ROW R19-UP-DEVT NOT MEASURED — DevTools was not attached`; `ROW R19-KEEP-4 NOT MEASURED — …`; `ROW R19-DEVT-NOFLAG
  RECORD` (`DEVNOFLAG probe=ok kept-then-devtools=not-run`); `ROW R19-SWEEP-HELD NOT MEASURED — …` (so no extension reload
  ran and the capture stayed one segment: `CAPSEG liveB19 seg=1 saved=yes before=end`).
- `ROW R19-RESTORE PASS slice=B`: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0
  hash=equal`; `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; `ROW UP-RESTORE
  PASS`; `RULES 0`; `DIALOGS liveB19 native=0 devtools=0 wave-windows-open=1` (the last a record, #363).
- `ROW R19-LOGS PASS slice=B`: `SCAN console: ://=0 … token=0 sentinel=0 profile=0`; `SCAN daemon:` all 0; `DAEMONLOG
  liveB19 sentinel=0 console-text=0 args-text=0`; SCANTOOL `browser_new_tab` 0, `browser_close_tab` 0,
  `browser_console_messages sentinel=11` (the tool returns the fixture's console text by design, as liveA19's 25);
  `SCAN actors: ://=0 … token=0 sentinel=11 profile-other=0`.

### STOPs and returns (R7.6)
- Att 1: `STOPWHY existing-tool-changed` → `STOP: R19-KEEP-1 stopped (existing-tool-changed)` → `RETURN 1
  after-stop=existing-tool-changed restored=yes readback=equal` → `STOP: the wave ended (…)`. Restore read back equal by
  count and hash (block list and Upload folders 0 lines, empty-text hash; armed, JavaScript on). Teardown by the runner:
  `CHECK clean PASS`.
- Att 2: none (`stop-return=0`).

## 3. Verifier verdict
Fix round 1: **PASS-with-notes** (`S7-live-B-verifier.md`). Diagnosis confirmed from code; no other locator in
liveB19's drivers that the walk cannot match; 11 mutants, 8 killed; MINOR F1 (`title`/`meta`/`script` survive the test,
a test pin only), NIT F2 (the test reads only the first trusted click). Neither blocks.

## 4. Deviations
- **Two diagnostic probes the sheet does not have** (not rows, judge nothing), as liveA19's step agent did: one SDK script
  in the scratchpad, its own 8081 server and its own tab `s12-console.html?s12=con&probe=k1` (then `probe=k1h`), each
  tab closed, the daemon shut down and the server killed after. They printed only codes and booleans: `body` click
  `LOCATOR_NOT_FOUND`, `h1` click `ok`, the other four calls `ok` with the sheet's values.
- **A UIA read of a Chrome window the wave did not open**, name only, of one element (the app-menu button, ClassName
  `BrowserAppMenuButton`): name `Chrome`, patterns ExpandCollapse and ScrollItem. Nothing was clicked or sent there.
- **A leftover window closed by the step agent:** HWND 44303224, liveA19 att 2's W (marker-identified,
  `S7-live-evidence-liveA19-att2.txt:21-24`; that attempt's STOP left it "not live and the wave's own - not closed",
  line 275), open since then, 13 tabs, every title a fixture title or about:blank (read, not printed). Closed by UIA
  WindowPattern. One maximized window with a single New Tab remains, which no wave line names; left alone.
- **Carried MINOR-1 (verifier2), checked from code before attempt 1, no fix round:** KEEP-3's omnibox legs land on
  titles the guard knows. Confirmed live in att 2: every KEEP-3 nav leg printed its `KEEPEND`, and the row passed.

## 5. Proposed decisions
### 2026-10-29 · DEVPROBE's menu opener reads a button name Chrome 156 does not use; liveB19's three DevTools rows stand NOT MEASURED
**Decided:** R19-UP-DEVT, R19-KEEP-4 and R19-SWEEP-HELD stay `NOT MEASURED — DevTools was not attached` as printed (the
sheet's pre-registered rule for `attached=no`), and the record says the cause is the helper's: `Open-S12DevToolsMenu`
(`recipes/s12-win-b.ps1:51`) looks for a Button named `Customize and control*`, Chrome 156 names it `Chrome`
(`CHECK devtools-menu step=menu-button found=no`, both attempts). The button offers no Invoke pattern, and
`Invoke-S12UiaElement`'s fallback, ExpandCollapse.Expand(), answered E_FAIL live elsewhere (`s12-win-b.ps1:28-29`), so a
rename alone may not open the menu. A later wave (or a liveB19 re-measure as new rows) gets a recipes slice that
measures the menu path on a scratch window first (button name, a FromPoint-verified click, the `More tools` and
`Developer tools` item names). **Why:** the fix was outside this slice's fix scope (it does not end the slice) and needs
live UI exploration; the rows are not claimed. **Instead of:** a fix round now without a measured menu path; calling the
probe a product finding. **Revisit if:** the DevTools rows are needed for Step 12's exit (UP-DEVT is now NOT MEASURED
three runs running). **By:** Claude (proposed)

### 2026-10-29 · R19-KEEP-1's click target is the driver's, and `h1` is it
**Decided:** fix round 1 (`a40aa86`) changes the target of KEEP-1's trusted click from `{css: "body"}` to `{css:
"h1"}`. The sheet names only "a trusted `click`" answering `ok`, which is unchanged, as are the judge and the STOP.
**Why:** the locator walk starts at body's children (`extension/src/content/a11y.ts:176`, unchanged since Step 8), so
`body` answered `LOCATOR_NOT_FOUND` on every build. **Instead of:** an expected-value change (none was needed); an
escalation as #366 (there the sheet named the expression). **Revisit if:** the session agent reads the target as a sheet
constant. **By:** Claude (proposed)

## 6. Findings
- No pre-registered check failed in attempt 2. Att 1's STOP was a helper defect (§5), not a product result.
- `poll-ms=319` in att 1's KEEPSEQ is above the sheet's line form `poll-ms=<p≤250>`; att 2 read 247. No judge reads it;
  for S7-record.
- Gotcha candidates for `recipes/CLAUDE.md` (close-out): (1) a `{css}` locator never matches `body`, `html` or anything in
  `head` (the walk starts at body's children); (2) Chrome 156's app-menu button is UIA Button `Chrome`, ClassName
  `BrowserAppMenuButton`, ExpandCollapse and ScrollItem only; (3) a wave window left open by a STOP ("not live … not
  closed") outlives the slice and is still there for the next one: a step agent lists Chrome windows after each STOP.

## 7. Handoff
Nothing running: no listener on 9234 or 8080–8089, the daemon shut down by the att 2 runner, no repo node or python
process (node PID 22152 is an unrelated codex runtime). Safety state as found (att 2 read-back equal by count and hash).
No DevTools or wave window open. Next: liveC19 (a fresh step agent).

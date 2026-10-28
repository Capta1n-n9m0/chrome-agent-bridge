# S7-live ledger (step agent liveA19, Claude Opus 5.5, medium)

- 2026-10-28 22:06Z start (liveA19): `git status --short` empty; HEAD `41690ed737e5bc53076bbc05ba30a442c2a59b73`. Nothing
  listening on 9234 or 8080-8089. Node/python processes: one `node.exe` of a codex runtime under the user's cache (not
  this repo, no listener; left alone). `-Block plan` liveA19: preflight servers files window reload console r19-0
  r19-banner-ctl r19-args-1 … r19-con-file r19-restore r19-logs teardown (32 blocks).
- Budgets: runner attempts liveA19 0 of 3; fix rounds 0 of 3 (S7 counts per stage).
- Next: runner attempt 1 (Sonnet, medium), out `$TEMP/bridge-e2e/s19-live/a1` (fresh), `-Att 1`.
- liveA19 att1 (runner Sonnet, medium; out `$TEMP/bridge-e2e/s19-live/a1`; HEAD 41690ed, build clean): exit 2 at
  22:09:00Z, about 2 min in. Printed before the stop: the RD-0 sub-rows and R17B-0 PASS, `ROW R19-0 PASS slice=A`,
  `ROW R19-BANNER-CTL PASS slice=A`. In R19-ARGS-1: SDK `value-equal=4 json-equal=5`, MCP all five `ERROR`;
  `ANSWER … control-1 ok`, `ANSWER … control-2 ok`; then `STOPWHY existing-tool-changed` / `STOP: R19-ARGS-1 stopped
  (existing-tool-changed)` -> `RETURN 1 after-stop=existing-tool-changed restored=n/a readback=n/a` (matched; runner
  returned). No state change had run (liveA19's first one is ARGS-3's JS off), so restore n/a.
- Diagnosis (step agent): (1) actors-liveA19.jsonl: the scripted MCP client's first `browser_new_tab` answered
  `connecting to the bridge daemon…` (mcp/src/link.ts CONNECTING_REASON), `handleOf` gave "" and every
  `browser_evaluate` answered `unknown tab handle  — call listTabs` -> helper defect (no wait for the MCP link).
  (2) The STOP is control-2's judge `kind === "function"` for a raw `evaluate "function f() {}"`, copied from
  `mcp/test/s12-args-cross.test.ts:178`, which runs against a fake extension. A step-agent probe on the live build
  (fixture 127.0.0.1:8081, own tab, closed): `decl kind=undefined`, `paren kind=function`. The sheet's expected value
  is wrong for the real product; a judge change edits a pre-registered STOP's expected text after its run -> ESCALATE
  (agent-rules §3 item 1). No fix round spent.
- After: `-Block teardown` with a1 exit 0 (`CHECK clean PASS`); daemon PID 38440 stopped by `s9.ts daemon-shutdown`;
  nothing listening on 9234 or 8080-8089 (22:12Z). Attempts: liveA19 1 of 3; fix rounds 0 of 3.
- 2026-10-29 resume (fresh step agent, Opus 5.5 medium): HEAD `dd6cbc1` (#366 ruled), tree clean. Fix round 1 of 3 starts
  (fixer Sonnet medium -> `S7-live-fixer.md`; verifier Opus medium -> `S7-live-verifier.md`). Scope per #366: control-2
  `ok`-only + `CHECK R19-ARGS-1 control-2 kind=<k>`; ARGS-OLD raw twin `function f() {}`, kind recorded; MCP actor waits
  up to 15 s on the connecting reply (in `mcpOpen`, covers -a/-b/-c/-de MCP legs); empty handle throws a helper defect.
- Fix round 1 (1 of 3): fixer DONE (`S7-live-fixer.md`; npm test 5558 -> 5570, 232 files). Verifier Opus medium
  PASS-with-notes (`S7-live-verifier.md`): 5570 passed, typecheck and 7 recipes tsconfigs exit 0; new tests 12 red on
  HEAD's code; 15 mutants, 11 killed, 4 survived = MINOR F1-F4 (test pins only, accepted as notes, not a blocker).
  Next: committer, then attempt 2 from the fix commit.
- Fix round 1 committed `079a063` (verifier PASS-with-notes).
- liveA19 att2 (runner Sonnet medium; out `$TEMP/bridge-e2e/s19-live/a2`; HEAD 079a063, build clean): exit 2 at
  22:46:05Z, ~3 min in. R19-0 PASS, R19-BANNER-CTL PASS; R19-ARGS-1 `clauses=3 failed=1` (sdk value-equal=4 json-equal=5,
  mcp 5/5; control-2 ok, `kind=undefined`); ARGS-2/-GLOBAL/-CSP/-STOP, CON-1/-2/-REJ/-BIG/-NAV/-MCP/-CAP failed=0 (console
  clauses pending R19-LOGS). STOP in r19-con-banner: `window 44303224 is not one this wave opened (banner sampler)` ->
  `STOP throw-after-state` -> `RETURN 1 ... restored=n/a readback=n/a` (no state change yet; ARGS-3 comes later).
- Diagnosis (step agent): 44303224 is W itself (evidence line 24). conBanner opens `s12-console.html` ACTIVE in W
  (`s12-r19-a.ts:569`), so W's title became `S12 console fixture`, which Format-S9Title (`s11-win.ps1:16`) maps to
  `<other window>`; Test-S9Live then refuses W. Helper defect (first reached now: att1 stopped earlier). Not a product
  result; no restore needed.
- After: `-Block teardown` a2 exit 0 (`CHECK clean PASS`); daemon PID 35924 stopped (`s9.ts daemon-shutdown`); the
  con-banner driver PID 38644 had exited by itself; nothing on 9234/8080-8089. Attempts 2 of 3; fix rounds 1 of 3.
- Next: fix round 2 (Sonnet fixer -> `S7-live-fixer2.md`, Opus verifier -> `S7-live-verifier2.md`): Run 19's own titles
  (`S12 console fixture`, `S12 chooser fixture`, `S12 chooser frame`) taken as the wave's own in `s12-win.ps1`; then att3.
- Att2 evidence committed `491a794`. Fix round 2 (2 of 3): fixer DONE (`S7-live-fixer2.md`; `recipes/s12-win.ps1` +9,
  `recipes/test/s12-title.test.ts` new; npm test 5570 -> 5576, 233 files). Verifier Opus medium PASS-with-notes
  (`S7-live-verifier2.md`): diagnosis confirmed; non-S12 titles 0 differences over 10 inputs; 9 mutants killed; later
  slices' active titles now all known (KEEP-2, X windows, liveC19 would have hit the same). MINOR-1 (KEEP-3 nav-blocked
  error-page title, unmeasured) carried to liveB19. Next: committer, then att3 from the fix commit.
- Fix round 2 committed `922f757`. liveA19 att3 (runner Sonnet medium; out `$TEMP/bridge-e2e/s19-live/a3`; HEAD
  922f757): ran to its end, no STOP (`CHECK rows19 rows=32 warns=0 stop-return=0`; `SLICE liveA19 done: calls with a
  failed check 5, not measured 0`). FAIL: R19-ARGS-1, R19-ARGS-3 (mcp leg), R19-CON-NOTEA, R19-CON-4 (mcp leg),
  R19-CON-FLOOR; the 17 other R19 rows PASS; R19-RESTORE PASS (equal by count and hash), R19-LOGS PASS. Step agent
  stopped daemon PID 14348; nothing on 9234/8080-8089; 4 file scans all 0. Attempts 3 of 3; fix rounds 2 of 3.
  liveA19 closed; next: liveB19 (a fresh step agent).

## liveB19 (step agent liveB19, Claude Opus 5.5, medium)
- 2026-10-29 start (liveB19): `git status --short` empty; HEAD `0f4392d`. Nothing listening on 9234 or 8080-8089; one
  unrelated `node.exe` (PID 22152, a codex runtime under the user's cache, no listener; left alone); no python. `-Block
  plan` liveB19: preflight servers files window reload console r19-0 devprobe closerprobe r19-up-opt root-add
  r19-banner-ctl r19-up-6 r19-f-raw r19-f-raw-2 r19-f-raw-dir r19-keep-1 r19-keep-2 r19-keep-3 r19-con-kept
  r19-keep-overlap-a r19-up-devt r19-keep-4 r19-devt-noflag r19-sweep-held r19-restore r19-logs teardown (28 blocks).
- Carried MINOR-1 (verifier2) checked from code, no live step: KEEP-3's three omnibox legs land on titles the guard
  knows. `blocked` -> `http://s12blk.localhost:8081/s12-console.html` = `S12 console fixture` (s12-win.ps1:17; a human
  omnibox navigation gets no DNR rule, those exist only while a bridge navigate/newTab/back/forward/downloadStart runs,
  and liveA19 att3's R19-CON-3 loaded that host from the 8081 server); `own` -> options = `Chrome Agent Bridge — Options`
  (s11-win.ps1:17); `file` -> `S11 file fixture` (s11b-r17.ps1:416; `S11 [A-Za-z ]+`). Would not stop the slice; no fix
  round. If X is reported "not live" after `nav-blocked`, this reading is wrong and is the first cause to check.
- Budgets (#367, per slice): runner attempts 0 of 3; fix rounds 0 of 3.
- Next: runner attempt 1 (Sonnet, medium), out `$TEMP/bridge-e2e/s19-live/b1` (fresh), `-Att 1`.
- liveB19 att1 (runner Sonnet medium; out `$TEMP/bridge-e2e/s19-live/b1`; HEAD 0f4392d, build clean): exit 2 at
  23:29:08Z, ~6 min in. R19-0 PASS (all sub-rows); `DEVPROBE method=uia-menu answer=ok ms=15383 attached=no`;
  `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=155 native-after=0`; R19-UP-OPT PASS (`OPT O2 shown=yes at=360
  polled-ms=362`, `front after-save=yes before-conflict-read=yes`); R19-BANNER-CTL PASS; R19-UP-6 clauses=5 failed=0;
  R19-F-RAW, -2, -DIR clauses=2 failed=0 each. STOP in R19-KEEP-1: `KEEPSEQ … answers=4/5 banner=continuous end-ms=9982
  poll-ms=319` -> `STOPWHY existing-tool-changed` -> `RETURN 1 after-stop=existing-tool-changed restored=yes
  readback=equal`. Runner ran `-Block teardown` (`CHECK clean PASS`), stopped daemon PID 39140. Record file name is
  `S7-live-record-liveB19.txt` (att 1 carries no suffix, as liveA19's).
- Leftover window: the runner saw one Chrome window `S12 console fixture` (HWND 44303224) it did not open. It is
  liveA19 att2's W (`S7-live-evidence-liveA19-att2.txt:24`, marker-identified; att2's STOP left it "not live and the
  wave's own - not closed", line 275), open since 22:46Z: 13 tabs, every title a fixture title or about:blank (titles
  read by UIA, not printed). Step agent closed it by UIA WindowPattern.Close (a wave window; not the user's).
- Diagnosis (step agent): which call failed is not printed. Diagnostic probe (not a row; scratchpad script, own 8081
  server, own tab `s12-console.html?s12=con&probe=k1`, closed; daemon shut down, server killed after): `evaluate ok
  value2=true`, `console ok n=11`, `click-trusted LOCATOR_NOT_FOUND`, `shot-cdp ok buf=true`, `evaluate-args ok
  value7=true`. The driver's trusted click targets `{css: "body"}` (`s12-r19-b.ts:225`); the locator walk starts at
  `body`'s children (`extension/src/content/a11y.ts:176`, unchanged since Step 8), so `body` never matches on any build.
  The sheet names only "a trusted `click`" with answer `ok`; the target is the driver's. Helper defect, not a product
  result and not a sheet constant. Second probe with `{css: "h1"}`: `click-trusted-h1 ok`, the other four as before.
- Recorded, not judged: `poll-ms=319` against the sheet's line form `poll-ms=<p≤250>` (no judge reads it; for S7-record).
- Next: fix round 1 of 3 (Sonnet fixer -> `S7-live-B-fixer.md`; Opus verifier -> `S7-live-B-verifier.md`): KEEP-1's
  click target `h1`, a test that pins it. Attempts 1 of 3.
- Fix round 1 (1 of 3): fixer Sonnet medium DONE (`S7-live-B-fixer.md`; `s12-r19-b.ts:225` `body` -> `h1`, one new test;
  npm test 5576 -> 5577, 233 files). Verifier Opus medium PASS-with-notes (`S7-live-B-verifier.md`): diagnosis confirmed
  from code; no other unmatched locator in liveB19's drivers; 11 mutants, 8 killed, 3 survived (`title`/`meta`/`script`,
  MINOR F1, a test pin only); typecheck and 7 recipes tsconfigs exit 0. Next: committer (att1 evidence, then the fix),
  then att2 from the fix commit.
- DEVPROBE's `attached=no` has a helper cause, found by the step agent and not fixed (outside this slice's fix scope: it
  does not end the slice; the sheet pre-registers `attached=no` -> the three DevTools rows NOT MEASURED): the record
  prints `CHECK devtools-menu step=menu-button found=no`; `Open-S12DevToolsMenu` (`s12-win-b.ps1:51`) looks for a Button
  named `Customize and control*`, and Chrome 156's app-menu button (ClassName `BrowserAppMenuButton`, read by UIA, name
  only) is named `Chrome` and offers ExpandCollapse and ScrollItem, no Invoke. Proposal for the session agent.

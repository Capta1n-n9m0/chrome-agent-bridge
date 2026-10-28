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

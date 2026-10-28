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

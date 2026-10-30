# S5-liveB20 ledger (step agent, Claude Opus 5.5, medium)

- 02:37Z start: `git status --short` empty; HEAD `a5476bf`; `git worktree list` main only. Nothing listening on 9234 or
  8080-8089. `-Block plan` liveB20 exit 0: preflight servers files window reload console r20-0b r20-pop-bg-3
  r20-pop-fg-3 r20-pop-other-3 root-add closerprobe r20-choose-twice r20-choose-kept r20-choose-refuse-dis r20-g2-1
  r20-version r20-restore r20-logs (19 blocks). Budgets: attempts 0 of 3; fix rounds 0 of 3 (per slice, #367).
- Next: runner attempt 1 (Sonnet, medium), out `$TEMP/bridge-e2e/s20-liveB/a1` (fresh), `-Att 1`.
- 02:38Z runner att1 started (Sonnet medium; out `$TEMP/bridge-e2e/s20-liveB/a1`; stdout `$TEMP/bridge-e2e/s20-liveB-a1-stdout.txt`, exit file `s20-liveB-a1.exit`). Attempts 1 of 3. Watcher: the Agent completion notice; step agent polls the runner report with a bounded Monitor.
- liveB20 att1 (runner Sonnet medium; out `$TEMP/bridge-e2e/s20-liveB/a1`; HEAD a5476bf; build `built extension → dist/`;
  reload exit 2 then 0): 02:38:57Z-02:43:35Z, exit 2. R20-0B PASS (LOADED20 as written). Printed: POP-BG-3 PASS, POP-FG-3
  PASS, POP-OTHER-3 NOT MEASURED (third PASS; human 3 rounds popup-opened=no; unjoined NOT MEASURED), CHOOSE-TWICE PASS,
  CHOOSE-KEPT RECORD, CHOOSE-REFUSE-DIS PASS, G2-1 FAIL (covered leg b=TIMEOUT 35120 ms), VERSION PASS (rerun=1),
  RESTORE PASS (equal by count and hash; DIALOGS B wave-windows-open=1), LOGS FAIL. STOP `text-leak` (SCAN20 actors
  browser_upload_file name=1) -> `RETURN 1 after-stop=text-leak restored=n/a readback=n/a` (matched; restore had already
  passed). Teardown exit 0 `CHECK clean PASS`. 9234 daemon only (PID 30016); 8080-8089 free; worktree main only; no
  wave node left (one unrelated node, not the wave's, untouched). Attempts 1 of 3; fix rounds 0 of 3.
- Step agent check (02:50Z): the hit is actors line 4, the MCP `browser_upload_file` TIMEOUT answer of CHOOSE-TWICE call 1;
  its failure-report tail `Screenshot: <path under the user's home>` (`sdk/src/error.ts:423`). Product behaviour, not a
  helper defect; the scan is a pre-registered check (§4.28 R20-LOGS) and cannot be narrowed (agent-rules §2). Every
  re-run would reproduce it (call 1 times out by design). Pre-registered STOP -> ESCALATE (agent-rules §3 item 1;
  B4 §8: "escalate and do not commit the record"). No verifier, no commit. Record and evidence left untracked.

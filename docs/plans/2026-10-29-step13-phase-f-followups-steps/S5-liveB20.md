# S5-liveB20 — Run 20, live slice B (step report)

Step agent: Claude Opus 5.5, medium. Runner Sonnet medium. No verifier, fixer or committer was started (see §1).
READ (as briefed): `docs/agent-rules.md`; the phase doc § S5, Exit checks, Human gates, STOP rules; decisions #406–#416;
`docs/e2e-test-plan.md` §4.28 lines 1938–1980, 2002–2014; `S5-drivers-B4.md`; `S5-drivers-C4.md` §7; `S5-liveA20.md` and
its ledger. Ledger: `S5-liveB20.ledger.md`.

## 1. Verdict

**ESCALATE.** Attempt 1 ran the whole slice and ended in the pre-registered STOP `text-leak` at R20-LOGS (exit 2):
`SCAN20 actors browser_upload_file: name=1 sentinel=0 token=0`. §4.28 R20-LOGS expects `name=0 token=0` in the actors'
results and names a non-zero count the STOP `text-leak`; `S5-drivers-B4.md` §8 says "escalate and do not commit the
record". So: no verifier, no commit, no second attempt (agent-rules §3 item 1). The record and evidence stay untracked
in the steps dir for the session agent.

## 2. Outputs

| Attempt | HEAD | Exit | Ended at | Record | Runner report |
|---|---|---|---|---|---|
| 1 | a5476bf | 2 | R20-LOGS, STOP `text-leak` | `S13-live-record-liveB20.txt` (298 lines) | `S5-liveB20-runner-att1.md` |

-3 evidence: `S13-live-evidence-liveB20-pop3.txt`. Raw out dir: `$TEMP/bridge-e2e/s20-liveB/a1`. Attempts 1 of 3; fix
rounds 0 of 3.

**Rows as printed** (not verified: no verifier ran): R20-0B PASS; R20-POP-BG-3 PASS; R20-POP-FG-3 PASS; R20-POP-OTHER-3
NOT MEASURED (leg `third` PASS, leg `human` NOT MEASURED, `unjoined` NOT MEASURED as pre-declared); R20-CHOOSE-TWICE PASS;
R20-CHOOSE-KEPT RECORD; R20-CHOOSE-REFUSE-DIS PASS; R20-G2-1 FAIL; R20-VERSION PASS; R20-RESTORE PASS; R20-LOGS FAIL
(the STOP). `CHECK rows20 rows=11 warns=0 stop-return=0`.

- **R5.2:** `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, `HEAD a5476bfc78f4
  tree=clean`, `ROW R20-0B PASS slice=B`. Old build: `LOADED20 keys=sorted nested=sorted elem=sorted perm=yes listener=no
  enabled=yes args=answered`; back on HEAD `LOADED20 rerun=1 keys=page …`, `RESTOREHEAD ok`.
- **R5.4:** `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`,
  `RESTORECHECK stored=equal differs-by=none`. `DIALOGS B native=0 devtools=0 wave-windows-open=1`.
- **R5.5:** not met: console, daemon, evidence 0/0/0; actors `browser_new_tab`, `browser_evaluate`, `browser_close_tab`
  0/0/0; `browser_upload_file name=1`. Token 0 everywhere.
- **R5.6:** `STOP: R20-LOGS: … (text-leak)` → `RETURN 1 after-stop=text-leak restored=n/a readback=n/a` (matched; the
  restore had already passed at R20-RESTORE).

## 3. Verifier verdicts

None. A verifier was not started because the STOP forbids committing this record; the session agent decides whether the
record is verified as it stands (after a ruling) or the slice is re-run.

## 4. Deviations

None from the procedure. I did not run a verifier on the final record, which the brief asked for, because the
pre-registered STOP comes first (agent-rules §4 precedence).

## 5. Proposed decisions (for the session agent / the user)

### 2026-10-30 · liveB20's `text-leak`: a home path in the MCP failure report
**Decided:** (for the user) the `name=1` hit is product behaviour, not a helper defect: the MCP's TIMEOUT answer to
R20-CHOOSE-TWICE's call 1 (a timeout by design) ends with the failure report's `Screenshot: <path>` line
(`sdk/src/error.ts:423`), and that path sits under the user's home, which carries the user's name. Options: (a) the
product prints the screenshot path relative to, or with the home folder replaced by `~` (a product change, a later
stage); (b) accept the hit as outside the leak R20-LOGS targets (it is a tool reply to the client, not a log) — that
narrows a pre-registered check after its result and is forbidden to agents (agent-rules §2), so only the user can rule it;
(c) re-run slice B after (a). **Why:** every re-run reproduces it; no helper fix can remove it without narrowing the scan.
**Instead of:** a helper that skips failure-report lines. **Revisit if:** — **By:** Claude (proposed, for user review)

## 6. Findings

1. **G1.4 — R20-POP-BG-3 printed PASS**: `POP R20-POP-BG-3 leg=bg n=3 granted-to=A in-ms=110 others=0 held-call=TAB_HELD
   holder=A active-guard=bg console-join=0 console-url=0`; `console-new=95` RECORD. The console counts read 0 (not
   `unread`), so the liveness control (#410) held in legs `bg`, `fg` and `third`. Not yet verified.
2. **Leg `human` of R20-POP-OTHER-3:** all three clicks were sent (READY lines; `CLOSERPROBE human-click sent=yes`), but
   every round reads `popup-opened=no opener=none granted-to=none`, so the leg is NOT MEASURED. **No popup opened and was
   leased to nobody**: #407's Revisit-if is not met. The click does not open a popup in this setup; why is not proven
   (liveA20's human leg also printed `granted-to=none`). G1 without a bridge caller stays unproven live.
3. **R20-G2-1 covered leg FAIL**: `b=TIMEOUT b-reply=35120 gap-ms=35043` with B fully covered
   (`covered-by-others-px=2073600`, all three windows maximised at one rectangle); the uncovered leg PASS (gap 529 ms);
   `CHECK R20-G2-1 cause=capture of a covered window`. For the record stage to judge.
4. **`DIALOGS B … wave-windows-open=1`** at R20-RESTORE, where S5-drivers-C4 §7 expected 0; teardown closed the wave's
   windows.
5. **`CHECK R20-POP-OTHER-3 third b-window=W (sheet: W2)`**: W2 was not made; the leg was judged unchanged, as written.
6. The old build's proof reads `args=answered`, not liveA20's old-build `args=VERSION`; R20-VERSION's own legs printed PASS.
   For the verifier, if one runs.
7. Reload: `recipes/reload-extension.ps1` exit 2 ("found 2 new windows"), re-run exit 0 (#99).

## 7. Handoff

Nothing of the wave is running. 9234 is held only by the daemon (PID 30016); 8080–8089 are free; `git worktree list` shows
the main tree only (the scratch `old-wt` folder remains under the attempt's out dir, outside the repo). The only other
`node.exe` is not the wave's (untouched). Untracked in the steps dir: the record, the -3 evidence, the runner report,
this report and the ledger; the record and the -3 evidence scan 0 for the user's name, a home path, the token and a
DevTools profile title. Next: the user rules on §5; then either a verifier on this record and a commit, or a product fix
and a new attempt (`-Att 2`, fresh `S11_OUT`; 2 attempts and 3 fix rounds left).

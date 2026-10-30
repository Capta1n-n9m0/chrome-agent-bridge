# S5-liveB20 — verifier 1 (read-only check of the held record, #417)

Verifier: Claude Opus 5.5, medium. Started by the session agent directly (#417), no step agent. Lane: I only read files
and ran read-only commands. No daemon, Chrome, port or process was touched, and nothing was edited or committed.
READ: `docs/agent-rules.md`; the phase doc § S5, Exit checks, Human gates, STOP rules; decisions #385, #399–#417;
`docs/e2e-test-plan.md` §4.28 lines 1938–2014 (rows 1965, 1977–1987, 1995–2000, the dated notes 2002, 2010–2014,
the -3 rows 2006–2008); the steps dir's `S5-liveB20.md`, `S5-liveB20-runner-att1.md`, `S5-liveB20.ledger.md`,
`S13-live-record-liveB20.txt` (298 lines), `S13-live-evidence-liveB20-pop3.txt` (8 lines), `S5-drivers-C4.md` §7/§8,
`S5-liveA20.md`; the recipes `s13-r20.ps1`, `s13-r20-b.ts`, `s13-r20-b4.ts`, `s12-r19.ts`, `s12-r19-c.ps1`;
`sdk/src/error.ts`, `mcp/src/tools/registry.ts`; `extension/CLAUDE.md`; `docs/decisions-archive/step12.md` (#349,
#370, #373, #374); the attempt's out dir (`$TEMP/bridge-e2e/s20-liveB/a1`), its actors file read only through a
redacting script.

## 1. Verdict

**FAIL.** Two reasons, neither a fault of the runner:
- R20-LOGS's pre-registered check failed (R5.5 not met). The STOP `text-leak` fired as written.
- R20-RESTORE printed **PASS**, but its pass rule does not support that: it requires `DIALOGS` all 0, and the record
  reads `wave-windows-open=1` (F1, MAJOR).

Every other printed row verdict is supported by its rule. R5.4 (restore by count and hash) and R5.6 (STOP matched to
a RETURN) are met. The record and the -3 evidence are clean to commit: no home path, no user name, no token.

**Rows, verified:**

| Row | Printed | Verified |
|---|---|---|
| R20-0B | PASS | PASS |
| R20-POP-BG-3 | PASS | **PASS** (G1.4 met) |
| R20-POP-FG-3 | PASS | PASS |
| R20-POP-OTHER-3 | NOT MEASURED | NOT MEASURED |
| R20-CHOOSE-TWICE | PASS | PASS |
| R20-CHOOSE-KEPT | RECORD | RECORD |
| R20-CHOOSE-REFUSE-DIS | PASS | PASS |
| R20-G2-1 | FAIL | FAIL (a product finding by its pre-registered rule; see F3) |
| R20-VERSION | PASS | PASS |
| R20-RESTORE | PASS | **FAIL** on the DIALOGS clause; the state restore itself is equal (F1) |
| R20-LOGS | FAIL + STOP `text-leak` | FAIL + STOP `text-leak` |

## 2. Outputs

- This report. No commit, as briefed.
- Commands:
  - Scan of the record, the -3 evidence, the step report, the runner report and the ledger: 0 hits each for the
    user's name (from the git config and from the Windows user name), for a home-folder path pattern, and for the
    token (read from `bridge.token`, never printed).
  - `git status --short`: only untracked steps-dir files.
- The actors file (outside the repo): 9 tool results, one hit, on result 4 (below).

## 3. Verifier verdict

This report is the verifier verdict (FAIL).

## 4. Deviations

None. The brief allowed reading the actors file, and I did, through a script that replaced the home folder and the
name before printing. Its hit line is not quoted here.

## 5. Proposed decisions

### 2026-10-30 · R20-RESTORE's `wave-windows-open=1` reads FAIL on the DIALOGS clause, in slices A and B
**Decided:** (for the session agent / S5-record) R20-RESTORE (slice B) is FAIL on its `DIALOGS` clause, not PASS:
- §4.28 line 1978 says "`DIALOGS` all 0", and line 1987 expects `wave-windows-open=0`.
- The record reads `wave-windows-open=1` (record:275).
- The four state items are equal by count and hash, so R5.4 is met.
- It is not a STOP: the row's STOPs name a native dialog, a DevTools window, a state mismatch or an old build, and the
  window left open is the wave's own options window.

liveA20's `DIALOGS liveA20 … wave-windows-open=1` gets the same reading in S5-record.
**Why:** the expected text is not met, and a pass is never inferred from an unjudged clause (agent-rules §2).
**Instead of:** keeping the judge's PASS.
**Revisit if:** the user rules that `wave-windows-open` counts only windows left open after teardown.
**By:** Claude (proposed)

### 2026-10-30 · #417's write-up names #349 (a)
**Decided:** (for the session agent) the user's ruling on #417 should state that this is the third time this
failure-report path has been recorded, and that it was never ruled:
- Run 18 recorded it as #349 (a), "a product finding for the user".
- Run 19 recorded it again (#370: "the known #349 (a) item").
- #374 never ruled it.
- R20-LOGS dropped Run 19's carve-out for the `Screenshot:` line (`recipes/s12-r19.ts:52-54`) and made the name a STOP
  in the actors' results. So the hit was foreseeable for any slice whose MCP actor gets a failure report with a
  screenshot (F2).
**Why:** the user rules on the whole history, not on a hit presented as new.
**By:** Claude (proposed)

## 6. Findings

**F1 — MAJOR — R20-RESTORE's printed PASS is not supported.**
- Evidence: record:275 `DIALOGS B native=0 devtools=0 wave-windows-open=1`, then record:276
  `ROW R20-RESTORE PASS slice=B`. The rule is §4.28:1978 ("`DIALOGS` all 0"; the steps say "the wave's options windows
  closed"), and :1987 expects `wave-windows-open=0`. #416's DIALOGS note (:2014) changes only the label.
- Cause, from code: `Invoke-R20Restore` closes the options window O and then runs `rd-restore`. That opens a fresh O
  (window 1051686, record:227–259). `Write-R20Dialogs` then counts the live `$global:O` (`recipes/s13-r20.ps1:244`,
  `:250–253`). Teardown closed that window only at the STOP (record:295).
- The row judge never compares `wave-windows-open`, so `CHECK rows20 … warns=0` could not catch it.
- This is the same defect as liveA20 (`S5-liveA20.md:76`). `S5-drivers-C4.md:79` predicted 0 without a code change
  behind it.
- Fix (a later attempt, after a ruling): close O after the read-back and before the count. That is a fix round, never
  a re-judging of this record.

**F2 — STOP confirmed; its cause as stated is correct.**
- The scan: record:284 `SCAN20 actors browser_upload_file: name=1`. §4.28:1979 includes "each actor's tool results"
  and makes any `name` above 0 the STOP `text-leak`. The STOP is pre-registered, and #417's escalation is right.
- What the hit is: actors result 4, the MCP's reply to R20-CHOOSE-TWICE's MCP call 1, which times out by design.
- How the path gets there, from code:
  - `TIMEOUT` is an attach code (`sdk/src/error.ts:66`, `:105`).
  - The failures folder defaults to `path.join(homedir(), ".chrome-agent-bridge", "failures")` (`error.ts:165–170`).
  - `report()` prints `Screenshot: ${screenshotPath}` (`error.ts:423`).
  - The MCP returns `report()` as text with the image and no `isError` (`mcp/src/tools/registry.ts:314–341`).
- So the home path carries the user's name. Every re-run reproduces it.
- Notes:
  - (a) The phase doc's own STOP wording is narrower: "the user's name in a log or committed evidence" (phase doc §
    STOP rules). The actors' transcript is neither, and #349 used that reading in Run 18 ("not a phase STOP"). §4.28's
    rule is stricter and pre-registered, so the STOP stands. The narrower wording bears only on the user's option (b).
  - (b) **MINOR:** no slice-B helper passes `--failures-dir` / `BRIDGE_FAILURES_DIR` to the MCP actor (grep over
    `recipes/s12-r19*`, `recipes/s13*`: none). Earlier waves did, "so the user's `~/.chrome-agent-bridge/failures` is
    never touched" (`recipes/s6.ts:559–571`, `recipes/s9-rules.ts:567–572`). So the wave left one fixture-page PNG in
    the user's home failures folder (checked by `ls`; present). It holds only a fixture page, and nothing was
    committed. This is not a way around the hit: the wave's out dir is also under the home folder, so the path would
    still carry the name.

**F3 — R20-G2-1 FAIL: a product finding by its pre-registered rule; the cause label is not proven.**
- Covered leg: B ended `TIMEOUT` at 35 120 ms, not `LOCK_TIMEOUT`, so B "timed out" by #409 (1) (record:129).
- Uncovered leg: every clause passed (record:137): gap 529 ≥ 450, holder 457 ≥ 450, `a-effect=1`, `b=ok`.
- §4.28:1985 says exactly this case is "FAIL for `covered`, cause named 'capture of a covered window' (a product
  finding, proposed)". #409 (2)'s NOT DISCRIMINATING gate applies only to the uncovered leg's precondition
  (`recipes/s13-r20-b.ts:251–256`). So FAIL is right, and it is not an environment artefact the rules let one
  discount.
- The 35 s matches a measured runtime fact: a capture of a tab in a fully covered window hangs (`extension/CLAUDE.md`
  :195–200, `TIMEOUT` 35 119 ms in Run 9). That is a pre-existing limit of the default screenshot, not a G2-hold
  defect.
- **MINOR caveat:** the covered leg's own alone-control captured the same fully covered B (`covered-by-others-px`
  2073600 before and after, record:126, :132) in 581 ms (record:128). So "covered" alone does not make the capture
  hang. What differs is A's trusted click activating its window first. The record's cause line is the sheet's
  mechanical label and should be cited as such, "not established beyond the label".
- The z values A=1, X=1, B=2 (record:125–127) are recorded and not judged (NIT).

**F4 — POP rows (G1.4).**
- **R20-POP-BG-3 PASS is supported.** record:28 matches the expected line of §4.28:2006 field for field (`in-ms=110`
  ≤ 1000, `others=0`, `held-call=TAB_HELD holder=A`, `active-guard=bg`). The counted rounds require guard `bg`
  (`judgePop3`, `s13-r20-b4.ts:57`). The 0 counts are real, not `unread`: the liveness control holds, with evaluate
  pieces 9 → 27 (evidence:1–2). There are three `ANSWER` lines (record:25–27). **G1.4 is met.**
- FG-3 PASS (record:38, eval 27 → 45).
- OTHER-3 leg `third` PASS (record:55, eval 48 → 84).
- **Leg `human`:** three rounds `popup-opened=no` (record:58–60), `n=0`, `console-join=unread` (eval 84 → 84: no
  bridge call, so the control cannot hold; evidence:7–8). That is NOT MEASURED by #407 (3) and #410 (3), and by #411
  (1): fewer than 3 counted rounds with `human` gives NOT MEASURED. The judge ranks FAIL above "too few rounds", and
  no counted round exists, so no FAIL can arise.
- The clicks were sent: no `click-sent=no` line, and `Invoke-R20PopClick` returns `sent` only after the foreground and
  window-at-point guards (`s13-r20.ps1:189–198`).
- Why no tab appeared is not established. #407's Revisit-if is **not** met: no popup opened and went to nobody. The
  row's NOT MEASURED is right: the row needs every leg 3 of 3, and `unjoined` is pre-declared NOT MEASURED.
- NIT: the step report and the runner report cite `CLOSERPROBE human-click sent=yes` as support. That is the closer
  probe's separate click (record:77), not a POP click.
- The evidence's `human after lines=1063` is below `before 1068` (evidence:7–8). `console-new` therefore printed 0 by
  `max(0, …)`, which is RECORD and not judged.

**F5 — MINOR — leg `third` without W2 was never attempted.**
- The driver puts B's tab in W (`B.c.newTab(…, {active:false})`, `s13-r20-b4.ts:135`) and prints the fallback line
  unconditionally (`:15`, `:139`).
- §4.28:2008 allows the fallback "if it cannot" be made, and #407 asks for W2 "if it can be made". The driver never
  tries.
- The leg's discrimination does not depend on W2: it rests on C holding W's active tab, so a fallback to Chrome's
  opener would grant C. So the leg's PASS stands as written. For the record, the line means "not attempted", not
  "could not be made".

**F6 — R20-VERSION PASS still holds.**
- The old builds differ by design:
  - liveA20's ARGS-OLD loads `3ab9207`, a build without `evaluateArgs` (§4.28:1977), so the old build's proof read
    `args=VERSION`.
  - R20-VERSION loads `63c771c` (`$R19Commit['liveE19']`, `s13-r20-b-defs.ps1:107`). That build "has `evaluateArgs`,
    lacks `uploadChooser`" (§4.28:1986), so `args=answered` is the expected reading. The row's own control,
    "`evaluate` with `args` answers `7`", prints `CHECK R20-VERSION args=answered` (record:190).
- The old build is proved loaded by `keys=sorted` and `listener=no` (record:178).
- `perm=yes` on the old build is expected: the swap replaces `extension/dist` only (record:149). The loaded
  `manifest.json` stays HEAD's, which has `webNavigation`; `63c771c`'s has none (`git show`).
- All legs match their expected text (record:181–193). `LOADED20 rerun=1` reads as written (record:226), so there is
  no `old-build-left-loaded`.

**F7 — R5.4, R5.6, the remaining rows.**
- **Restore:**
  - The found state (record:9) equals the end state (record:259).
  - record:264 `RESTORE … hash=equal`, :265–267 `UP-RESTORE PASS`, :274 `RESTORECHECK stored=equal`; daemon.status
    equal (:262).
  - NIT: the reused Run 17 `STATE` lines print the SHA-256 of the empty list (record:9, :72, :247, :253, :259). That is
    the digest of empty input, so it reveals nothing beyond `lines=0`, but §4.28:1978 says hashes are not printed.
- **R5.6:**
  - One STOP (record:289, echoed at :291) matched by `RETURN 1 after-stop=text-leak` (:297), with no ROW in between.
  - record:298 `STOP: the wave ended …` is the framing line after the RETURN. Committed liveA20 records carry the same
    shape (`S13-live-record-liveA20.txt:2–4`).
  - `restored=n/a` is accurate: the state had already been restored and read back equal at R20-RESTORE.
  - `CHECK rows20 … stop-return=0` (:288) ran before the STOP, so it does not cover it.
- **R20-0B:** record:4–5, :7–21 as written.
- **CHOOSE-TWICE:**
  - Call 2: `DEBUGGER_DEVTOOLS`, 7 ms, `names-devtools=no`, `clicks=1`.
  - Call 1: `TIMEOUT` in 5037 ms, inside #408 (5)'s 4900–8000.
  - The MCP line is exact, and the control `c1 ok files=1` (record:82–88).
- **CHOOSE-KEPT:** leg `different` has `change=2 input=2 cancel=0 files=1 digest-differs=yes`. Leg `same` is RECORD,
  so the row is RECORD (#408 (2)).
- **REFUSE-DIS:** `btn` `TIMEOUT`, then `flip` `BAD_PARAMS` exact with `files=0 change=0`, so PASS (:107–111).
- **R20-LOGS:** the control line is in the last segment (`control-disarmed-last=3`). All three segments were saved, so
  the scan is measured. `sentinel=0` on every tool.

**F8 — `DIALOGS B wave-windows-open=1`:** the window is the options window `rd-restore` opened (F1). No native dialog
or DevTools window was open (`native=0 devtools=0`), so neither `dialog-left-open` nor `devtools-left-open` fires.
Teardown closed it (record:295).

## 7. Handoff

- Nothing running, nothing started. The record, the -3 evidence and the reports stay untracked.
- For the session agent and the user:
  - F1 changes slice B's tally to 6 PASS, 2 FAIL, 1 RECORD, 1 NOT MEASURED, plus R20-LOGS FAIL/STOP. liveA20's
    R20-RESTORE needs the same reading.
  - F2's history (#349 (a)) belongs in the #417 question.
  - F2 (b) and F5 are helper notes for any attempt 2.

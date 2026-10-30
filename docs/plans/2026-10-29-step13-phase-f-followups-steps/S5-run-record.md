# S5-run-record: Run 20 judged against §4.28

Written 2026-10-30 by the S5-record builder (Claude Sonnet 5.5, medium), docs only; nothing was run live. Every verdict
applies §4.28's own pass rules (`docs/e2e-test-plan.md` §4.28, rows committed in `246c115`, amended only by dated notes,
none of which deleted a line) to the committed records, with the rulings of `docs/decisions.md` #399-#419 applied as
recorded and not re-judged. Words are the sheet's: PASS, FAIL, RECORD, NOT RUN, NOT MEASURED, NOT DISCRIMINATING. A cause
is given only from evidence and marked as such. A verdict comes from the ROW lines and the verifier reports, never from a
runner's printed claim alone.

**Status of this record.** Slice A has no record-level verifier: `S5-liveA20-verifier1` to `-verifier3` checked the fixers'
diffs before the attempts, not the record. Slice A's "as verified" column below is therefore **derived here** from the ROW
lines and the sheet, and the S5-record verifier re-derives it first. Slice B's verdicts were checked by
`S5-liveB20-verifier1.md` (read-only, on the held record, #417). Slice C's were checked by `S5-liveC20-verifier1.md`
(attempt 1) and `S5-liveC20-verifier2.md` (attempt 2).

**Held.** Slice B's record, `S13-live-record-liveB20.txt` (298 lines), its -3 evidence `S13-live-evidence-liveB20-pop3.txt`
(8 lines) and `S5-liveB20-verifier1.md` (216 lines) are untracked and **held, uncommitted, pending the user's ruling on
#417** (as are `S5-liveB20.md`, `S5-liveB20-runner-att1.md` and `S5-liveB20.ledger.md`). They were read, not changed,
staged or moved. Every slice-B line number below points into the held file.

## 0. Header: slices, attempts, record files

| Slice | Attempt | HEAD | Exit | Record file | Record commit | Judged |
|---|---|---|---|---|---|---|
| liveA20 | 1 | `a32cb8c` | 2 | `S13-live-record-liveA20.txt` (4 lines) | `3c6def3` | no |
| liveA20 | 2 | `3c6def3` | 2 | `S13-live-record-liveA20-att2.txt` (220) | `10db89d` | no |
| liveA20 | **3** | `10db89d` | 0 | `S13-live-record-liveA20-att3.txt` (340) | `ed66e36` (2026-10-29 21:33 +04) | **yes** |
| liveB20 | **1** | `a5476bf` | 2 (`text-leak`) | `S13-live-record-liveB20.txt` (298) | **none, held (#417)** | **yes** |
| liveC20 | 1 | `777400d` | 0 | `S13-live-record-liveC20.txt` (97) | `3f19f28` (2026-10-30 06:59 +04) | recorded; superseded (#418, #419) |
| liveC20 | **2** | `e614e0c` | 0 | `S13-live-record-liveC20-att2.txt` (174) | `1a9032e` (2026-10-30 08:36 +04) | **yes, kept as the slice's record (#419)** |

Hashes checked with `git log -1`. Attempts per slice: A 3 of 3, B 1 of 3, C 2 of 3. Fix rounds: A 3 of 3
(`S5-liveA20.ledger.md`), B 0, C one by the step agent's count and **five by #419's** (section 6). Models: step agents
Claude Opus 5.5 medium; live runners, fixers and committers Sonnet medium; verifiers Opus medium. Run 20's wall clock:
slice A 2026-10-29 16:24Z-17:31Z, slice B 2026-10-30 02:39Z-02:43Z, slice C 02:50Z-02:52Z and 04:25Z-04:28Z. Two
diagnostic reads of the dock UI (`S13-live-record-dockdiag.txt`, `-att2.txt`; commits `dfbac13`, `e614e0c`) preceded
C attempt 2 and are not Run 20 rows.

**Aliases** (all in this steps dir). `A3:n` = line n of `S13-live-record-liveA20-att3.txt`; `A1`, `A2` = the attempt 1 and 2
files; `B:n` = `S13-live-record-liveB20.txt` (held); `BE:n` = `S13-live-evidence-liveB20-pop3.txt` (held); `C1:n`, `C2:n` =
`S13-live-record-liveC20.txt`, `…-att2.txt`. `V-B` = `S5-liveB20-verifier1.md` (held); `V-C1`, `V-C2` =
`S5-liveC20-verifier1.md`, `-verifier2.md`. Step reports: `S5-liveA20.md`, `S5-liveB20.md` (held), `S5-liveC20.md`,
`S5-liveC20b.md`.

## 1. The verdict list: 34 verdicts

**Derivation.** §4.28's two tables hold: slice A 15 ids (R20-0, POP-BG, -FG, -OTHER, -NONE, ARGS-ORDER, CON-DESC, CON-NOTEA,
CON-CAP, ARGS-3, CON-4, CON-FLOOR, ARGS-OLD, RESTORE, LOGS); slice B 8 ids (R20-0B, CHOOSE-TWICE, CHOOSE-KEPT,
CHOOSE-REFUSE-DIS, G2-1, VERSION, RESTORE, LOGS); slice C 8 ids (R20-0C, DEVT-UNDOCK, DEVT-EARLY, UP-DEVT, KEEP-4, SWEEP-HELD,
RESTORE, LOGS). 15 + 8 + 8 = **31** (27 distinct ids, with R20-RESTORE and R20-LOGS counted once per slice). Plus the three
-3 rows of the #407 addendum (R20-POP-BG-3, -FG-3, -OTHER-3, run in slice B): **34**. My derivation equals the brief's.
Not counted separately: a leg inside a row (`unjoined`, `human`, `third`, the dock clause of R20-RESTORE), the row-less
`CLOSERPROBE`, and the record line `FLAG`.

"ND" in Run 19's verdicts below means NOT DISCRIMINATING. Tallies are given *as verified*, with *as printed* where it differs. Where a column says "derived" there is no record-level
verifier for the row (slice A).

### 1a. Slice A (liveA20 attempt 3; `A3`)

| Id | As printed | As verified | ROW line | Checked by | Decision |
|---|---|---|---|---|---|
| R20-0 | PASS | PASS | A3:22 (LOADED20 A3:5) | derived | |
| R20-POP-BG | FAIL | **FAIL** | A3:31 (POP A3:28) | derived | #404, #406 stand |
| R20-POP-FG | FAIL | **FAIL** | A3:41 (POP A3:37) | derived | #404, #406 |
| R20-POP-OTHER | FAIL | **FAIL** (`unjoined` NOT MEASURED, A3:57) | A3:59 | derived | #404, #406, #407 |
| R20-POP-NONE | PASS | PASS | A3:65 | derived | |
| R20-ARGS-ORDER | RECORD | RECORD (as printed; §4.28:1970's pass rule and #401 give PASS: open for the user, conflict 1) | A3:90 | derived | #401 |
| R20-CON-DESC | PASS | PASS | A3:94 | derived | #403 |
| R20-CON-NOTEA | PASS | PASS (cut path NOT REACHABLE) | A3:206 | derived | #387 |
| R20-CON-CAP | PASS | PASS | A3:105 | derived | #398 |
| R20-ARGS-3 | PASS | PASS | A3:135 | derived | #400 |
| R20-CON-4 | PASS | PASS | A3:160 | derived | |
| R20-CON-FLOOR | PASS | PASS | A3:181 | derived | |
| R20-ARGS-OLD | PASS | PASS | A3:252 | derived | |
| R20-RESTORE | PASS | **FAIL** | A3:328 (DIALOGS A3:327) | `V-B` F1 reads the same defect in A | #416 (label), #417 |
| R20-LOGS | PASS | PASS | A3:339 | derived | |

Slice A: PASS 10, FAIL 4, RECORD 1 = 15 (as printed: PASS 11, FAIL 3, RECORD 1).

- **R20-0:** A3:5 is exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`,
  after `MANIFEST` (A3:4), then `RULES 0`, `STATE armed=true evaluate=true`, `TOGGLE reading on`, `FOUNDLIST
  blocks-fixtures=no`, `HEAD 10db89dee69a tree=clean`, `S4 commit=ancestor` (A3:7-21).
- **R20-POP-BG / -FG / -OTHER:** every `bg`, `fg` and `third` leg prints `granted-to=A others=0` and `in-ms` 94, 60, 63
  (A3:28, 37, 53), so the lease clause held. Each row FAILs on two clauses, as printed: `held-call=ok` where the sheet wants
  `TAB_HELD` equal to the control (the three `ANSWER … TAB_HELD control=TAB_HELD own=ok` lines show B was refused), and
  `console-new=95/90/129` where the sheet wants 0. #406 records that the first clause cannot pass by construction (the
  daemon's `TAB_HELD` message names a handle and a time) and that the second cannot be bounded from console lines. The FAILs
  stand. In `human`, `granted-to=none` with `console-new=0` (A3:55); the leg printed no `popup-opened` read (added by #407).
  POP-OTHER also prints `third b-window=W (sheet: W2)` (A3:49).
- **R20-POP-NONE:** `newtab` and `blocked` PASS (A3:60-64); `blocked` n=0, so Chrome blocked the popup and no RECORD branch applies.
- **R20-ARGS-ORDER:** SDK leg `value-equal=5 json-equal=5` (A3:72) against Run 19's 4 of 5; keyed object `keys=page nested=page
  elem=page json-equal=yes` (A3:73); controls `value=2`, `kind=function` (A3:85-86); `LEG sdk PASS` (A3:87). The `ref` leg is
  RECORD by #401 (`ANSWER … ref BAD_PARAMS`, A3:74-76); the MCP leg is RECORD by the sheet (A3:84, 88).
- **R20-CON-DESC:** `sentence-1=1 sentence-2=1 control-tool=read` (A3:91).
- **R20-CON-NOTEA:** allowed `entries=2 … sentinel=1 url=0 stack=0 marker=0` (A3:95); `pre entries=2` (A3:97); blocked
  `entries=0 … marker=0` (A3:202); `cut-path NOT REACHABLE (S3a not run)` (A3:204). The entry's text `Object` is not printed;
  the verdict rests on the driver's leg judge.
- **R20-CON-CAP:** `lines=10 body-chars=18278 marker=yes first-index=192 last-index=200` (A3:100): k = 9, the newest nine;
  `sdk-entries=200 limit3-lines=3 limit3-marker=no` (A3:102).
- **R20-ARGS-3:** all three code legs exact, `MCPLINE … text=exact lines=1` (A3:122-128), snapshot `ok`, `EFF before=1 after=1`
  (A3:132). The Run 19 FAIL (a reader looking for the extension's text) is cured: the reader matches the MCP's own line.
- **R20-CON-4:** `DISARMED exact=yes data=keys:scope same-as=snapshot` (A3:152), `MCPLINE … text=exact` (A3:155), after `ok` (A3:157).
- **R20-CON-FLOOR:** `disarmed-ticks=5 in-reply-disarmed=0 after-ticks=3 in-reply-after=3 exc-disarmed=4 … exc-after=3`
  (A3:177), waits `5000` and `3500` (A3:178): the preconditions Run 19 missed are made.
- **R20-ARGS-OLD:** old build proved by `keys=sorted nested=sorted elem=sorted … listener=no … args=VERSION` (A3:238); `perm=yes`
  there is not the sheet's `perm=no`: LOADED20 reads the loaded manifest, which stays HEAD's because a swap of `extension/dist`
  does not replace `extension/manifest.json` (`V-B` F6 on the same swap). The sheet's parenthetical was wrong; the old build is
  proved by `keys=sorted`, `listener=no` and `args=VERSION`, and R5.2 concerns R20-0, -0B and -0C only. sdk, ref, file, raw
  `code=VERSION hint=yes`, raw `forwarded=no`, MCP `text=exact`, control `ok` (A3:239-250); `clauses=6 failed=0`; the current
  build is back at A3:284 (`LOADED20 rerun=1 … args=answered`).
- **R20-RESTORE:** the four state items equal by count and hash (A3:316-319), `RULES 0` (A3:324), `RESTORECHECK stored=equal
  differs-by=none` (A3:326); `DIALOGS liveA20 native=0 devtools=0 wave-windows-open=1` (A3:327; the label is read as `DIALOGS A`
  under #416 (3)). The sheet's pass rule says "`DIALOGS` all 0" and its expected text `wave-windows-open=0`. The one open window
  is the options window `rd-restore` opened afresh (`S5-liveA20.md` §6 item 2; `V-B` F1). Printed PASS; **FAIL by the literal rule
  (#417)**. The sheet's expected text `RESTORED: …` (§4.28:1978) is not printed in any slice (`grep -n "RESTORED:"` on A3, B and
  C2 gives 0); it is a placeholder line and changes no verdict.
- **R20-LOGS:** `CONSOLE liveA20 segments=3 control-disarmed-last=3` (A3:331), console, daemon and evidence `name=0 sentinel=0
  token=0` (A3:332-334); actors: `browser_evaluate sentinel=2`, `browser_console_messages sentinel=13`, both allowed lines, 0 on
  the other tools (A3:335-338); `CAPSEG` seg 1-3 `saved=yes` (A3:207, 254, 329).

### 1b. Slice B (liveB20 attempt 1; `B`, held; verifier `V-B`)

| Id | As printed | As verified | ROW line | Checked by | Decision |
|---|---|---|---|---|---|
| R20-0B | PASS | PASS | B:22 (LOADED20 B:5) | `V-B` §1 | |
| R20-POP-BG-3 | PASS | **PASS (G1.4 met)** | B:32 (POP B:28; BE:1-2) | `V-B` §1, F4 | #407, #410, #411 |
| R20-POP-FG-3 | PASS | PASS | B:43 (POP B:38; BE:3-4) | `V-B` F4 | #407, #410 |
| R20-POP-OTHER-3 | NOT MEASURED | **NOT MEASURED** | B:66 (`third` B:55, 57; `human` B:58-63; `unjoined` B:64) | `V-B` F4 | #407, #410, #411 |
| R20-CHOOSE-TWICE | PASS | PASS | B:89 | `V-B` F7 | #389, #408 |
| R20-CHOOSE-KEPT | RECORD | RECORD | B:102 | `V-B` F7 | #408 (2) |
| R20-CHOOSE-REFUSE-DIS | PASS | PASS | B:113 | `V-B` F7 | #400, #408 (4) |
| R20-G2-1 | FAIL | **FAIL** (covered leg; product finding) | B:144 | `V-B` F3 | #409 |
| R20-VERSION | PASS | PASS | B:194 | `V-B` F6 | #409 (4) |
| R20-RESTORE | PASS | **FAIL** (DIALOGS clause) | B:276 (DIALOGS B:275) | `V-B` F1 | #416, #417 |
| R20-LOGS | FAIL + STOP `text-leak` | **FAIL + STOP `text-leak`** | B:287 (STOP B:289, 291) | `V-B` F2 | #417 |

Slice B: PASS 6, FAIL 3, RECORD 1, NOT MEASURED 1 = 11 (as printed: PASS 7, FAIL 2, RECORD 1, NOT MEASURED 1). The
verifier's slice verdict is **FAIL** (R20-RESTORE and R20-LOGS).

- **R20-0B:** B:5 is the exact `LOADED20` line; `HEAD a5476bfc78f4 tree=clean` (B:20); `S4 commit=ancestor` (B:21).
- **R20-POP-BG-3 (G1.4):** `leg=bg n=3 granted-to=A in-ms=110 others=0 held-call=TAB_HELD holder=A active-guard=bg console-join=0
  console-url=0` (B:28), three `ANSWER … TAB_HELD control=TAB_HELD own=ok` (B:25-27), `console-new=95` RECORD (B:29). The 0
  counts are measured, not `unread`: the liveness control holds, worker-console `evaluate` lines **9 → 27** (BE:1-2); FG
  27 → 45 (BE:3-4), `third` 48 → 84 (BE:5-6).
- **R20-POP-FG-3:** `in-ms=54` against R15-POP-2 (a)'s 150 ms (B:38, 41). **R20-POP-OTHER-3 `third`:** `in-ms=57 held-call=TAB_HELD
  holder=A console-join=0 console-url=0` (B:55). `V-B` F5: B's tab was left in window W, and the line `b-window=W (sheet: W2)`
  means "not attempted", not "could not be made"; the leg's discrimination rests on C holding W's active tab, so the PASS stands.
- **R20-POP-OTHER-3 `human`:** three clicks sent, each `popup-opened=no opener=none granted-to=none` (B:58-60); `n=0`,
  `console-join=unread` (B:61; BE:7-8 shows 84 → 84, no bridge call, so the control cannot hold); `LEG … NOT MEASURED` (B:63).
  #407 (3) and #411 (1): no popup is NOT MEASURED; a FAIL needs a popup that opened and went to nobody. `unjoined` NOT
  MEASURED as pre-declared (B:64).
- **R20-CHOOSE-TWICE:** call 1 `TIMEOUT … ms=5037`, call 2 `DEBUGGER_DEVTOOLS exact=yes … ms=7 names-devtools=no` (B:82-83), MCP
  `text=exact` (B:85), control `ok` (B:87). **R20-CHOOSE-KEPT:** leg `different` `change=2 input=2 cancel=0 digest-differs=yes`
  (B:94); leg `same` call 2 `input=1 change=1 cancel=1 digest-differs=no` (B:97) is the record: an identical second
  selection fires no `input` or `change`, and `cancel` fires. **R20-CHOOSE-REFUSE-DIS:** `btn` TIMEOUT, `flip` BAD_PARAMS exact,
  `self` TIMEOUT (B:107-110).
- **R20-G2-1:** `covered`: `a-reply=77 b-reply=35120 gap-ms=35043 … b=TIMEOUT`, B fully covered (`covered-by-others-px=2073600`,
  B:126, 129, 132): FAIL; `uncovered`: `gap-ms=529 holder-after-reply-ms=457 a-effect=1 b=ok` PASS (B:137-140); `cause=capture of
  a covered window` (B:141). The sheet's rule names exactly this case "FAIL for `covered`" (`V-B` F3).
- **R20-VERSION:** old build `keys=sorted … listener=no … args=answered` (B:178; the build `63c771c` has `evaluateArgs`), legs
  sdk, mcp (`text=exact`), raw, control PASS, `clauses=5 failed=0` (B:181-193), back on HEAD `rerun=1` (B:226).
- **R20-RESTORE:** state equal by count and hash (B:264-267, 274), `DIALOGS B native=0 devtools=0 wave-windows-open=1` (B:275).
  Printed PASS (B:276); FAIL by the literal rule, as in slice A (`V-B` F1).
- **R20-LOGS:** `CONSOLE liveB20 segments=3 control-disarmed-last=3` (B:279); console, daemon, evidence 0 (B:280-282);
  `SCAN20 actors browser_upload_file: name=1` (B:284); `ROW R20-LOGS FAIL` (B:287); `STOP text-leak` (B:289, 291). The hit is
  in the actors' transcript, outside the repo: the MCP's TIMEOUT reply to CHOOSE-TWICE's call 1 ends with the failure report's
  `Screenshot: <path>` line, a path under the user's home folder (`V-B` F2; #417). The record and the -3 evidence scan 0 for the
  name, the token and any home path.

### 1c. Slice C (liveC20 attempt 2, the slice's record; `C2`; attempt 1 `C1` beside it)

| Id | As printed | As verified | ROW line | Checked by | Decision |
|---|---|---|---|---|---|
| R20-0C | PASS | PASS | C2:22 (LOADED20 C2:5) | `V-C2` §3 | |
| R20-DEVT-UNDOCK | PASS | PASS | C2:58 | `V-C2` §3 | #413, #414 |
| R20-DEVT-EARLY | PASS (both legs) | PASS | C2:104 | `V-C2` §3 | #413, #414 |
| R20-UP-DEVT | NOT RUN | NOT RUN | C2:105 | `V-C2` §3 | #399, #419 |
| R20-KEEP-4 | NOT RUN | NOT RUN | C2:106 | `V-C2` §3 | #419 |
| R20-SWEEP-HELD | NOT RUN | NOT RUN | C2:107 | `V-C2` §3 | #419 |
| R20-RESTORE | PASS | **FAIL** (literal rule) | C2:165 (DIALOGS C2:164) | `V-C2` F1 | #416, #418, #419 |
| R20-LOGS | PASS | PASS | C2:173 | `V-C2` §3 | |

Slice C: PASS 4, FAIL 1, NOT RUN 3 = 8 (as printed: PASS 5, NOT RUN 3).

- **Attempt 1 (`C1`, HEAD `777400d`) stands as recorded (#418):** R20-0C PASS (C1:22); the five DevTools rows NOT RUN "dock side
  unreadable, it could not be restored" (C1:30-34); `DOCK R20-0C side=unread` (C1:29); R20-RESTORE NOT MEASURED in #416's form,
  "found side unread, nothing changed" (C1:44, 88); R20-LOGS PASS (C1:96); `FLAG debugging-flag=no` (C1:35). Verifier
  `V-C1`: PASS-with-notes, each of the 8 verdicts re-derived. Cause of the unread side: the dock reader needed exactly one
  button of the name and found two nested ones (`S5-liveC20b.md` §2).
- **Attempt 2:** `DOCK R20-0C side=right` after `CHECK dock-read … customize=2 invoked=yes items=4 … pressed=1 try=1` (C2:29-30);
  `FLAG debugging-flag=no` (C2:32). DEVT-UNDOCK: `IDLE since-attach-ms=20015`, controls `before-open windows=0 title=none
  attached=no`, `after-open windows=1 title=ok attached=yes`, `DEVT20 … answer=ok value=ok` (C2:50-55). DEVT-EARLY: both legs the
  same, `docked` judged by `attached=yes` alone (C2:90-101). The three conditional rows print `NOT RUN — no DevTools condition
  refused` (C2:105-107) and the finding line `both conditions answer ok; #374 item 3's reword waits for the user` (C2:108).
- **R20-RESTORE:** dock side read back `side=right` equal to R20-0C's (C2:121); state equal by count and hash (C2:153-163);
  `DIALOGS C native=0 devtools=0 wave-windows-open=1` (C2:164); printed PASS (C2:165) because the slice-C judge never checks the
  count; **FAIL by the literal rule** (`V-C2` F1; #419). Attempt 1 printed the same `wave-windows-open=1` (C1:87).
- **R20-LOGS:** console, daemon, evidence 0 (C2:169-171), `control-disarmed-last=3` (C2:168), `no actor results file in this
  slice` (C2:172) because no actor row ran.

### 1d. Counts summary (34 verdicts)

| Verdict | As verified | A | B | C | As printed |
|---|---|---|---|---|---|
| PASS | **20** | 10 | 6 | 4 | 23 |
| FAIL | **8** | 4 | 3 | 1 | 5 |
| NOT MEASURED | **1** | 0 | 1 | 0 | 1 |
| NOT RUN | **3** | 0 | 0 | 3 | 3 |
| RECORD | **2** | 1 | 1 | 0 | 2 |
| NOT DISCRIMINATING | **0** | 0 | 0 | 0 | 0 |
| **Total** | **34** | 15 | 11 | 8 | 34 |

20 + 8 + 1 + 3 + 2 + 0 = 34. The three printed-PASS rows read FAIL are the three R20-RESTORE rows (#417, #419), so PASS 23 → 20 and
FAIL 5 → 8. **FAIL, listed (8):** R20-POP-BG, R20-POP-FG, R20-POP-OTHER (sheet clauses, #406), R20-RESTORE A, B, C (the options
window), R20-G2-1 (covered-window capture), R20-LOGS B (`text-leak`). **NOT MEASURED (1):** R20-POP-OTHER-3. **NOT RUN (3):**
R20-UP-DEVT, R20-KEEP-4, R20-SWEEP-HELD. **RECORD (2):** R20-ARGS-ORDER (as printed), R20-CHOOSE-KEPT.

**Alternative tally for R20-ARGS-ORDER.** The row is counted RECORD as printed. By §4.28:1970's pass rule (the SDK leg judges the
row) and #401 (the `ref` leg does not count), it is PASS, and the tally would be PASS 21, RECORD 1, the rest unchanged
(21 + 8 + 1 + 3 + 1 + 0 = 34). No decision rules the row; it is open for the user (section 7).

## 2. The gate exits, one by one

| Exit | Status | Evidence |
|---|---|---|
| **G1.4** R20-POP-BG passes (judged on R20-POP-BG-3, #407) | **met** | B:28, 30-32: PASS, `granted-to=A in-ms=110 others=0 held-call=TAB_HELD holder=A active-guard=bg console-join=0 console-url=0` in 3 of 3 rounds; the zero console counts are real: the liveness control reads `evaluate` lines 9 → 27 (BE:1-2); `V-B` F4 re-derived it. liveA20's R20-POP-BG FAIL stands beside it (#404, #406). Note: the `human` leg is NOT MEASURED, so G1 with no bridge caller is unproven live (section 4). |
| **R5.1** §4.28 committed before the first observation | **met** | Sheet `246c115` (2026-10-29 16:37 +04); notes `ee2eaa0` (17:17), `76f4f5e` (18:48), `a32cb8c` (20:21); first liveA20 record line 2026-10-29 16:24:15Z = 20:24:15 +04, 2 min 36 s after `a32cb8c`. The #407 addendum `8ec2789` (2026-10-30 01:26 +04) and the #416 notes `ae05349` (06:36:08 +04) came later but before liveB20's first line, 06:39:22 +04, and liveC20's (06:50:56 and 08:25:52 +04). `git show --numstat` of each: additions only; `git diff 246c115 HEAD -- docs/e2e-test-plan.md` removes no line. Note: the addendum and #416 follow slice A's observations; they add rows and label rules and do not re-judge slice A (#407, #416). |
| **R5.2** R20-0, 0B, 0C prove the loaded build | **met** | Each slice's second record line (after `MANIFEST`) is exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`: A3:5, B:5, C1:5, C2:5. Old build proved (A3:238 `keys=sorted … listener=no args=VERSION`; B:178), current build back (A3:284, B:226 `rerun=1`). |
| **R5.3** each row judged by its pre-written text | **met, with notes** | One verdict per id (section 1). Notes: three printed PASS read FAIL (the DIALOGS clause); the POP FAILs stand though two of their clauses cannot pass (#406); R20-ARGS-ORDER prints RECORD where its discriminating leg PASSes (conflict 1); slice A is not verified at record level. |
| **R5.4** restore by hash in each slice | **met for the state; not met for the DIALOGS clause** | State items `armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` and `RESTORECHECK stored=equal differs-by=none` in A (A3:316, 326), B (B:264, 274) and C (C2:153, 163; C1:76, 86); slice C's dock side read back equal (C2:121). But `DIALOGS … wave-windows-open=1` in all three (A3:327, B:275, C2:164, C1:87): the wave's own options window, counted before teardown closes it (`V-B` F1, `V-C1` F1, `V-C2` F1). So R20-RESTORE is FAIL in A, B and C (#417, #419). |
| **R5.5** R20-LOGS by count per slice | **not met in slice B; met in A and C** | A: PASS (A3:339). **B: FAIL, STOP `text-leak`** (B:284, 287, 289): held under #417. C: PASS (C2:173; no actor results file). |
| **R5.6** every STOP matched to a RETURN | **met** | Three STOP events, each followed by one `RETURN` before any later row: liveA20 att1 `STOP throw-after-state` (A1:2) → `RETURN 1 … restored=n/a readback=n/a` (A1:3); att2 `STOP throw-after-state` (A2:185) → `RETURN 1 … restored=yes readback=equal` (A2:219); liveB20 att1 `STOP text-leak` (B:291; guard line B:289) → `RETURN 1 … restored=n/a readback=n/a` (B:297). The trailing `STOP: the wave ended` lines (A1:4, A2:220, B:298) frame the same events. A att3, C1, C2 and both dock diagnostics contain no STOP or RETURN (`grep`; `stop-return=0`). |

**Gate consequence.** Step 13's gate is **stopped** under the phase doc's STOP rule ("a pre-registered check fails after the
allowed fix rounds"; a safety state or text-leak item) until the user rules: R5.5 is not met in slice B (the text-leak STOP,
#417), and the three R20-RESTORE rows FAIL on the DIALOGS clause (#417, #419). The write-up continues; the gate does not close.

Run 20's stage exit also needs the verifier to re-derive these (section 8).

## 3. NOT MEASURED and NOT RUN

| Row | Verdict | Reason |
|---|---|---|
| R20-POP-OTHER-3 | NOT MEASURED | Leg `human`: three clicks sent, `popup-opened=no` ×3 (B:58-60), so no popup existed to judge; `console-join=unread` because no bridge call ran (BE:7-8). Leg `unjoined`: no such tab can be made (B:64, pre-declared). Leg `third` PASS. |
| R20-POP-OTHER `unjoined` (inside a FAIL row) | NOT MEASURED | "no unjoined tab can be made" (A3:57). |
| R20-UP-DEVT, R20-KEEP-4, R20-SWEEP-HELD | NOT RUN | The sheet runs them only if a DevTools condition refused; none did (C2:105-108). |
| liveC20 attempt 1: five DEVT rows; R20-RESTORE dock clause | NOT RUN; NOT MEASURED | Dock side unreadable (C1:30-34, 44); superseded for judging by attempt 2 (#419) and recorded. |
| R20-CON-NOTEA cut path | NOT REACHABLE | S3a not run (#387); a record, not a FAIL (A3:204). |
| R20-0 `perm`/`listener` | measured | The console read worked; no `unread` fallback was used. |

## 4. #369's two DevTools conditions, as measured

Run 19 could not reach them (R19-UP-DEVT, R19-KEEP-4, R19-SWEEP-HELD NOT MEASURED; docked DevTools after an earlier attach
answered `ok`, 31 of 31). Run 20, attempt 2 (`FLAG debugging-flag=no`, C2:32):

| Condition | Row / leg | Controls (bridge-independent) | Bridge call | Verdict |
|---|---|---|---|---|
| 1 (DevTools undocked, opened after an earlier attach, idle 20 015 ms) | R20-DEVT-UNDOCK | before `windows=0 title=none attached=no targets=29`; after `windows=1 title=ok attached=yes targets=31` (C2:53-54) | `ok`, value `ok` (C2:55) | PASS |
| 2a (opened before the first attach, undocked) | R20-DEVT-EARLY leg `undocked` | same controls (C2:92-93) | `ok` (C2:94) | PASS |
| 2b (opened before the first attach, docked) | R20-DEVT-EARLY leg `docked` | `attached=no` then `attached=yes` (C2:98-99) | `ok` (C2:100) | PASS |

Neither condition refused the bridge's debugger. This is the phase doc's "Continues anyway, recorded" case ("#369's two
DevTools conditions both fail to refuse"): **#374 item 3's reword of the "one debugger per tab" claim waits for the user.** The
three conditional rows are NOT RUN. Attempt 1 measured neither condition (dock side unreadable). Whether attempt 2 counts is the
user's call under #419 (section 7).

## 5. Run 19 rows re-measured (each names its R19 row, from §4.28's own text)

| R20 row | Re-measures | Run 19 verdict (S7-run-record; #374 item 4) | Run 20 verdict |
|---|---|---|---|
| R20-ARGS-ORDER | R19-ARGS-1 `value-equal` | FAIL (sorted keys); ND by #374 item 4 | RECORD; SDK leg PASS (`value-equal 5/5`, A3:72) |
| R20-ARGS-3 | R19-ARGS-3 | FAIL (wrong MCP expected text) | PASS (MCP line exact, A3:128) |
| R20-CON-4 | R19-CON-4 MCP leg | ND | PASS (A3:155) |
| R20-CON-FLOOR | R19-CON-FLOOR | ND (waits 3 s, 2.5 s) | PASS (waits 5000/3500, A3:177-178) |
| R20-ARGS-OLD | R19-ARGS-OLD MCP leg | ND | PASS (A3:247) |
| R20-VERSION | R19-VERSION MCP leg | ND | PASS (B:183) |
| R20-CON-NOTEA | R19-CON-NOTEA | FAIL (replayed object logs `Object`) | PASS as the documented limit (A3:95, #387) |
| R20-CON-CAP | R19-CON-CAP direction | PASS, oldest lines | PASS, newest lines (A3:100) |
| R20-CHOOSE-KEPT | R19-CHOOSE-KEPT | FAIL (`change` stayed 1) | RECORD: different file `change=2`; identical selection fires no `input`/`change`, `cancel` fires (B:94, 97) |
| R20-CHOOSE-REFUSE-DIS | R19-CHOOSE-REFUSE leg `dis` | ND (unreachable page) | PASS (B:107-110) |
| R20-G2-1 | R19-G2-1 | FAIL (B timed out ~35 s) | FAIL covered (35 120 ms), PASS uncovered (529 ms) (B:129, 137) |
| R20-DEVT-UNDOCK, -EARLY | #369 conditions 1 and 2 | not reached | PASS ×2; neither refused (section 4) |
| R20-UP-DEVT, -KEEP-4, -SWEEP-HELD | R19-UP-DEVT, R19-KEEP-4, R19-SWEEP-HELD | NOT MEASURED | NOT RUN (C2:105-107) |
| R20-RESTORE, R20-LOGS | R19-RESTORE, R19-LOGS | PASS | FAIL (RESTORE ×3), LOGS PASS ×2 / FAIL ×1 |

New rows with no R19 twin: R20-0, 0B, 0C (as R19-0), R20-POP-*, R20-POP-*-3, R20-CON-DESC, R20-CHOOSE-TWICE.

## 6. Findings

1. **R20-G2-1: a covered window's screenshot times out (product finding, proposed by the sheet).** With B's window fully covered
   and A's trusted input holding the lock, B's screenshot answered `TIMEOUT` at 35 120 ms; with the windows side by side it
   answered `ok` at 540 ms (B:129, 137). It matches the covered-window capture hang already in `extension/CLAUDE.md`. Caveat
   (`V-B` F3): the covered leg's own alone-control captured the same covered B in 581 ms (B:128), so "covered" alone does not
   hang it; what differs is A's click activating its window first. Treat the cause label as the sheet's, not proven.
2. **The human leg opened no popup (R20-POP-OTHER-3 `human`).** Three UI Automation clicks were sent and no tab appeared
   (`popup-opened=no` ×3). #407's Revisit-if (a popup opened and leased to nobody) is **not met**. Why no tab opened is not
   established. liveA20's `human` leg printed `granted-to=none` with `console-new=0` and no popup read (A3:55), so whether
   a popup opened there was not recorded. G1 for a popup with no bridge caller stays unproven live.
3. **`DIALOGS … wave-windows-open=1` in all three slices** (A3:327, B:275, C1:87, C2:164): the wave's own options window,
   opened afresh by `rd-restore` and counted before teardown closes it. None of the three judges compares the count, so each
   printed PASS. Read as FAIL by #417 and #419.
4. **The MCP's TIMEOUT reply carries `Screenshot: <path under the user's home>`.** Recorded as #349 (a) in Run 18 ("a product
   finding for the user"), again in Run 19 (#370, "the known #349 (a) item"; `recipes/s12-r19.ts:52-54` carried a carve-out),
   and now in Run 20 as a STOP because R20-LOGS was written without the carve-out (#417). It has never been ruled. Also
   (`V-B` F2 b): no slice-B helper passes a failures folder, so one fixture-page screenshot sits in the user's home failures
   folder; nothing was committed.
5. **liveC20 spent five fixer passes against a cap of three (#419).** Recorded in section 7.
6. **Pre-existing facts re-measured.** The key order of `evaluate`'s value is now the page's (`keys=page`, A3:5, A3:72); the
   console cap keeps the newest nine lines of 200 (A3:100); a replayed object still reads `Object`; the second chooser call's
   text names no DevTools (`DEBUGGER_DEVTOOLS` with its own text, B:83).
7. **Helper notes.** (a) `Stop-S16Pid` left the real node under the nvm shim after an actor-row STOP in liveA20 attempt 2
   (`S5-liveA20.md` §6 item 3); #405 and #408 made the kill a tree walk. (b) `STATE` lines print the sha256 of the empty list
   (`V-B` F7 NIT, `V-C1` N1), which reveals only `lines=0`. (c) The capture's first line holds the profile title and must never
   be committed (`V-C1` N2).

## 7. Source conflicts, and what is held or open for the user

**Source conflicts (reported, not resolved).**
1. **R20-ARGS-ORDER:** the row prints RECORD (A3:90) because the driver's aggregate takes RECORD over PASS
   (`recipes/s13-r20-a.ts`, `finish(R, [PASS, RECORD, RECORD])`). #401 says the ref leg "does not count toward the row", and the
   sheet makes the MCP leg a record, which would leave the discriminating SDK leg (PASS) as the row's verdict. As printed: RECORD;
   by §4.28:1970's pass rule and #401: PASS. This record keeps the printed RECORD in the count (no re-judging a printed verdict);
   the PASS reading would move the tally to PASS 21, RECORD 1. No decision rules it; open for the user (below).
2. **POP-OTHER-3 `third`:** `S5-liveB20.md` §6 item 5 says "W2 was not made"; `V-B` F5 reads the driver as never having tried.
3. **Fix rounds for liveC20:** `S5-liveC20b.md` §2 counts one round; #419 counts five and supersedes it.
4. **`V-B`'s Handoff (§7, `S5-liveB20-verifier1.md` line 213)** counts slice B as "6 PASS, 2 FAIL, 1 RECORD, 1 NOT MEASURED, plus
   R20-LOGS FAIL": 6/3/1/1 here, the same.
5. **`S5-liveB20.md` §2** lists R20-RESTORE as PASS; `V-B` F1 and #417 read it as FAIL. This record follows #417.
6. **#404's** "in every leg the lease clause held" was corrected by #406 to legs `bg`, `fg`, `third`; this record follows #406.

**Held or open for the user (not decided here).**
- **R20-ARGS-ORDER:** printed RECORD and counted so; by §4.28:1970's pass rule and #401 it is PASS (alternative tally PASS 21,
  RECORD 1). The user rules which reading stands.
- **The gate is stopped** until the user rules on #417 and on the DIALOGS clause (section 2, Gate consequence).
- **#417, slice B:** the record and its files stay uncommitted until the user rules. Options as written: (a) the product prints the
  screenshot path with the home folder as `~` or relative to the repo (a later changed message), then re-run slice B; (b) rule that
  a tool reply to the client is not the log R20-LOGS guards, so LOGS is a RECORD and the record is committed; (c) both, (b) for
  Run 20 and (a) in Phase G. #417 recommends (c). Until then slice B's R20-LOGS is FAIL.
- **#419, slice C:** accept attempt 2 as the slice's record (recommended) or rule the DEVT rows NOT MEASURED for the fix-round
  breach. The step agent counted one round; the strict count is five passes (1, 1b, 2, 3, 4) with no Opus fourth-round fixer.
- **The DIALOGS clause:** the three R20-RESTORE FAILs stand under #417 and #419. If the user rules that `wave-windows-open`
  counts only windows left open after teardown, R20-RESTORE is re-measured as a new row (`V-B`'s Revisit-if).
- **G1.4** is met on R20-POP-BG-3 as the user ruled in #407; whether the unmeasured human leg needs another route is open.
- **#374 item 3** (the "one debugger per tab" reword) waits for the user, now with both conditions measured.
- **Proposals (not decided):** (1) make `wave-windows-open` count after the options window closes, or give the judge the count
  (a fix round, then a new row); (2) pass a failures folder to the MCP actor in every slice; (3) a human-leg route that is not a
  UI Automation click, for G1 with no bridge caller; (4) record the DevTools UI facts (`S5-liveC20b.md` §6 item 1) in
  `recipes/CLAUDE.md`.

## 8. What the S5-record verifier should check first

Slice A's 15 verdicts (derived here, no record-level verifier), the R20-ARGS-ORDER conflict, that no line of this record or of the
Run 20 entry in `docs/e2e-test-plan.md` §5 carries a local path, the user's name or the token, and that the counts in section 1d
sum to 34.

# S7-sheet verifier — Run 19's wave sheet (`docs/e2e-test-plan.md` §4.27)

Claude Opus 5.5, medium effort. Role: verifier (`docs/agent-rules.md` §6). Docs stage, so no typecheck, test or build
was run (the brief's deviation). I edited nothing except this report and its evidence file.
Evidence: `docs/plans/2026-10-27-step12-phase-f-steps/S7-sheet-verifier-evidence.txt`.

**Note on HEAD.** The sheet was written at `372d091`, and every source was read with `git show 372d091:<path>`.
While I worked, HEAD moved to `e7958eb`: S5c landed as `d38b590` (spec note) and `11a1210` (code). This affects R19-VERSION only (MINOR-6).

Line numbers below are `docs/e2e-test-plan.md` lines in the working tree. §4.27 runs from 1768 to 1856.

## 1. Verdict

**FAIL**: 5 MAJOR, 8 MINOR, 4 NIT, no CRITICAL. The sheet is thorough, and most of it holds. The checks below are
about pass and STOP rules that cannot discriminate, and three gaps that need fixing before S7-helpers builds to the sheet.

## 2. The checks that hold

- **R7.1 (check 1).** §4.27 records no Run 19 observation. Part A ran only `netstat -ano`, `date -u` and
  `Get-NetTCPConnection`; part B ran only git and doc-check commands. Run 18's readings (15 136 ms, `profile=2`, the
  five `seen` legs) appear only as motivation, never as expected text. The provenance paragraph (1770) is honest, and
  it names S5c's work as unquoted.
- **Seeds (check 2).** All 0.11 seeds are present: R19-0, ARGS-1…3, CON-1…4, KEEP-1…4, CHOOSE-1…4, R19-LOGS and
  R19-RESTORE. The G2 rows are present, F is parked, and there is no G1 row (#337 holds).
  - #349 is a new row. It counts `shot-line` and `image-line` separately, names them, and adds `profile-other`.
  - #351 is honoured: (1) the investigator runs before R19-UP-OPT and the 5 000 ms bound is kept; (2) no counter is
    built; (3) a row-less `DEVPROBE` runs before any DevTools row; (4) the three helper fixes (a)–(c) are written as
    contract.
  - #352 gives CON-KEPT, SWEEP-HELD and DEVT-NOFLAG. #353 (a)–(d) gives HUMAN, LATE, DISARM and CHOOSE-1. #354 gives
    G2-1 and G2-2.
  - R19-G2-2 restates S6-G2-verifier's MINOR-4 clause in client terms, and says plainly what it cannot prove.
  - R19-VERSION follows #355 and marks S5c's texts as an open item.
- **Expected texts (check 3).** Every error and refusal text a pass rule compares by `===` is at `372d091`, character
  for character: the eight `ARGS_REFUSALS` texts and the size format, the ninth refusal, the not-a-function text, the
  six gate messages, `ARGS_RELOAD_HINT`, the chooser texts, the missing-file text, the console line form, the empty
  text, the cap marker and the MCP upload regex. The full list with file and line is in the evidence file
  (`node check.mjs`). The remaining misses are paraphrases or wrong citations (NIT-1, NIT-2).
- **Ports (check 6).** At 06:27 UTC, `netstat -ano` shows 8000 held (PID 27152) and nothing listening on 8001–8099 or
  9234. `Get-NetTCPConnection` shows 8082 Bound by PID 25896. Both match the sheet's 06:01 reading: 8081 is chosen,
  and 8080 and 8082 are avoided. Every page is on loopback; `*.localhost` follows the SAVE-BLOCK precedent.
- **Lane (check 8).** `git diff docs/e2e-test-plan.md` is one hunk, `@@ -1765,6 +1765,95 @@`: 89 insertions and 0
  removals, between §4.26's end and `## 5.`. `node scripts/doc-check.mjs` exits 0. It lists 4 dead paths (the S12
  fixtures S7-helpers will build) and count drifts from earlier stages (25 tools and 28 methods against 24 and 27 in
  the CLAUDE.md files). None of these is this lane's.
- **STOP mapping (check 5).** Every phase-doc STOP that binds Run 19 appears in 1774 or as a `STOP <reason>` (1808 (31),
  1853): R7.6 matching, RESTORE by count and hash (hashes not printed), R7.2 first in each slice, and R7.5 per slice.
  No line form prints a sentinel, text, path, URL, pattern or token. MAJOR-1 concerns how some of these STOPs are
  detected, not whether they are listed.

## 3. Findings

### MAJOR-1. The "attach" STOPs read a signal that cannot show an attach, and two rows trigger them by design

**Where:**
- 1774 (STOP rule: "or an attach the keeper's count shows").
- 1787 (R19-ARGS-3: "0 debugger attaches counted by the keeper").
- 1795 (R19-CON-3: "0 attaches counted").
- 1796, 1797, 1798 and 1799 (CON-4, -OWN, -FILE, -JSOFF).
- 1821 (R19-KEEP-3), 1829 and 1833 (CHOOSE-2, -JSOFF), 1834 (R19-CHOOSE-DISARM).
- 1853 (the `attach-after-disarm` and `attach-on-refused-page` reasons), and Open item 5 (1855).

**The signal is not there.** The keeper has no attach counter, and #351 (2) forbids building one. Builder B noted this,
and Open item 5 then tells the runner to read "the keeper's count" as "a banner sample positive". That changes a pass
rule quietly through an open item, while the row text still names a counter.

**The substitute does not discriminate.** `recipes/CLAUDE.md:159-161` records a measured fact: "the banner sampler
read positive on legs that send no call … so a positive reading does not show that the call raised the banner".
Run 18 read `seen` on all five R18-UP-6 legs while its control passed (#351 (2)). The sheet's own Open item 8 puts the
worst-case linger at 5 s kept plus up to 14 s, about 19 s. Even so:
- **R19-KEEP-3 (1821)** runs a CDP call, the event 1 000 ms later, and the refused call 1 000 ms after that. At that
  point the kept session has just been detached, and the banner lingers about 5.1 s (Stage 0). The banner window of
  the refused call will read `seen` on a correct build, which prints `STOP attach-after-disarm` or
  `attach-on-refused-page`. The same row also measures `end-ms` on that lingering banner, so it contradicts itself.
- **R19-CHOOSE-DISARM (1834)** presses the disarm during the call's own attached session. The window of the refused
  reply holds that session's linger, so the same false STOP fires.
- **Part A's refused-call clauses, and slice C's CHOOSE-2 and CHOOSE-JSOFF,** have no IDLE precondition. Slices A and
  C have no banner control (only liveB19 has R19-BANNER-CTL; #340's model is one control per slice). Each of these
  runs within seconds of a CDP call: ARGS-3's own control call, CON-NOTEA's read before CON-4, and CHOOSE-1/-LABEL/-REFUSE.

**Effect:** a correct build can STOP slices A, B and C.

**Fix:**
- Strike "counted by the keeper" from 1774, 1787 and 1795.
- Before every refused-call banner clause, require `IDLE ≥ 20 000 ms` since the last CDP reply, and add a BANNER-CTL to
  liveA19 and liveC19.
- Make a banner positive a STOP only with that idle in place and the slice control passing. Otherwise it is
  NOT MEASURED.
- In KEEP-3 and CHOOSE-DISARM, drop the banner STOP from the in-row refused call. Those rows' timing clauses already
  measure the banner end.
- If the session agent judges that no existing signal can make "attached after a disarm" discriminating live, that is
  `agent-rules.md` §3 item 9. Escalate it, and do not keep a STOP line that fires on the linger. The unit tests
  (gate at receipt, before the attach) remain the proof.

### MAJOR-2. R19-ARGS-OLD's `forwarded=0` can never fail

**Where:** 1791, and line form (7) at 1780.

`forwarded` is "read from the page effect counter" plus "the extension's received count".
- No received count exists.
- The row's calls (`evaluate` with `{n: 1}`, `evaluateRef`, `evaluateToFile`) carry no effect function.
- An old build evaluates the function source as an expression and never calls it (spec §10 S2a, phase doc 0.4). So
  even a forwarded effect function would not move the counter.

The clause passes on a daemon that forwards. The SDK and MCP legs do not separate "the daemon refused" from "the old
extension answered something that was mapped later".

**Fix:** add a raw `client.call("evaluate", {expression: "(a) => a", args, tab})` leg, as
`mcp/test/s12-args-cross.test.ts:156` does. The current daemon answers `VERSION`; a forwarding daemon returns
`kind: "function"` from the old worker. Then drop `forwarded`, or define it from an existing per-call `daemon.log`
line if one exists (#351 (2) allows those).

### MAJOR-3. R19-CON-FRAME's expected second read conflicts with Stage 0, and the row does not test S3a check 4

**Where:** 1801, and Open item 4 (1855).

`Stage0-measurer1.md:48` (C5): on the tab session, an "OOPIF 0 of 5 and same-origin iframe 5 of 5". An out-of-process
frame was built and measured, so Open item 4's "cannot be built on loopback" is wrong. The spec (§10, "the tab's own
target only; out-of-process frames are not read") reads in-process frames and drops them by the block-list filter.

The row expects `entries=2` with the pattern removed, citing the MCP description's shorthand "frames are not read".
That holds only if the `s12blk.localhost` frame inside a `localhost` page is out of process, and the sheet never says
whether it is:
- If it is out of process, both reads are trivially 2, and S3a check 4 ("a same-site iframe of a blocked host: its
  messages are dropped") is never exercised.
- If it is in process, the spec predicts 13 entries for the second read, and the written expectation is wrong.

**Fix:** split the row into two legs:
- An **in-process** leg: a same-site page and frame on two hosts, the pattern on the frame's host. Expect 2 with the
  pattern and 13 without it.
- An **OOPIF** leg: for example a `localhost` page with a `127.0.0.1` frame. Expect 2 and 2.

The helper should record whether the frame is out of process (or the sheet should state the site rule it relies on).
Correct Open item 4 to match.

### MAJOR-4. Two S3a handoff needs have no row and no stated reason

**Where:** check 2. `S3a.md` §7 says "plus verifier 1's two: an exception's replayed `timestamp` against the arm
floor; an object holding an Error logs no `at` line".
- R19-CON-FLOOR (1800) uses console ticks only, never an exception.
- R19-CON-NOTEA (1802) covers only a blocked host, where the entry is dropped whole. No row logs `{e: err}` on an
  allowed page and checks that the entry is present with `stack=0 url=0`. The reducer test pins
  `"Object {err: Error: boom}"`; `extension/test/s12-console-reduce.test.ts`, the case before line 157.

**Fix:** add an uncaught `Error` thrown while disarmed to CON-FLOOR's `tick` page, expected absent. Add a `notea`
control leg on an allowed host, with the entry present and 0 `at`/URL counts.

### MAJOR-5. Per-slice R19-LOGS (R7.5) is exposed to the extension reloads inside slices B, D and E

**Where:** 1844 (R19-LOGS), 1849 (liveB19 SWEEP-HELD reload), 1851 (liveD19 and liveE19: two reloads each), 1848
("No DevTools window opens in this slice"), and 1845 (`DIALOGS … devtools=0`).

The worker console capture is a DevTools window on the service worker
(`recipes/s11-r16.ps1:268`: `CONSOLE the worker console window is open`). Reloading the extension replaces that
worker. The sheet nowhere says the capture is saved before a reload and reopened after it. Without that, the slice's
`control-disarmed` line (written by R19-RESTORE's press) lands in no capture, and R19-LOGS is NOT MEASURED for three of
the five slices. Run 17b lost a capture the same way (#318).

Separately, liveA19's "no DevTools window" and RESTORE's `devtools=0` both conflict with the capture window. A helper
built to the letter could print `devtools-left-open`.

**Fix:**
- Write "capture segments": save before each reload, restart after it, judge the slice over all segments, with the
  control line in the last one.
- Exclude the wave's capture window by name from `DIALOGS` and from liveA19's sentence.

### MINOR

1. **R19-0's line order, and slices D and E (1784, 1851).** R19-0 says `LOADED …` is "the first line of the slice's
   record". But its steps run R18-0's reads first, and §4.26's first line is `MANIFEST …`. Say which line comes first,
   or that the helper buffers. In slices D and E, "the old-build proof replaces R19-0", so neither slice has a
   found-state read before the swap, and R19-RESTORE has no reference "R19-0 of the same slice" to compare against
   (R7.4). Keep R18-0's state lines in both slices.
2. **The line forms are incomplete for S7-helpers (check 7).**
   - CON form (8) has no `ordered` key (used by CON-1) and no `marker` key (CON-NOTEA). "The newest three" (CON-1's
     `limit=3`) cannot be expressed in the form.
   - CON-MCP, CHOOSE-1 and CHOOSE-MCP state "banner during the call" with no sampler step and no line.
   - CON-MCP's "for every existing tool (STOP if not)" names no calls.
   - KEEP-3's `next=TAB_GONE` has no source. It is right by `daemon/src/intercept.ts:589` (372d091), but that answer
     carries `data {lastUrl, lastTitle}`; print only the code.
   - "the args sentinel" (1844) is never defined beside `SENTINEL`.
3. **Fixture gaps.**
   - `test-fixtures/e2e-playground.html` has no `#tb`, no `window.__s12`, no `beat` and no `s12=` handling (grep: 0
     matches; its only counter is `#counter`). Yet R19-ARGS-STOP (`__s12.beat`), R19-G2-1 (a "click counter read by
     evaluate") and R19-G2-2 (`#tb`) need them, and the fixture list calls the page "the control tab, as Run 18".
   - CHOOSE-4 legs (b) and (c), and CHOOSE-DISARM, click `#vis`, which only `s12=c1` has. CHOOSE-4 also says "each on
     a fresh load of `s12=c1`" while legs (b) and (c) name `none` and `single`.
4. **The dialog-closer proof is ordered too late (Open item 12, 1850).** It gates only CHOOSE-4. CHOOSE-HUMAN and
   CHOOSE-LATE run earlier in liveC19 and can raise a native dialog. Gate the first row that can raise a dialog.
5. **CON-BANNER's after leg (1806).** It runs at 15 s, while Open item 8 gives about 19 s as the worst case, and a
   `seen` there is read as "a session kept past its bound" (a FAIL). Make it NOT MEASURED, or judge it against
   KEEP-2's idle median.
6. **S5c is now committed** (`11a1210`; `CHOOSER_RELOAD_HINT` at `daemon/src/intercept.ts:44-45`, HEAD
   `e7958eb`). Quote it into R19-VERSION (1843) before any observation, as Open item 6 allows.
7. **The carried banner rows' order (1849).** The brief reads #351 as "after the KEEP rows". The sheet puts R19-UP-6
   and F-RAW* before R19-KEEP-1. #351's text says "carried to Run 19 as new rows after S4b", a stage, so the sheet
   matches the decision's words. Placing them after KEEP-2 would let its measured linger inform their 20 s idle. This
   is for the session agent.
8. **R19-KEEP-1's banner clause (1819) admits it does not discriminate.** Record that clause as `NOT DISCRIMINATING`
   or RECORD, so that a `ROW … PASS` does not stand for "one attach for N calls". Only the answers-unchanged clause is
   a test.

### NIT

1. **Quotes and citations.**
   - "mangles JSON (keys sorted, null props dropped, top-level `null` → `undefined`)" is from `Stage0.md:63`, not the
     phase doc's As built.
   - "a real function result stays kind function" paraphrases `mcp/test/s12-args-cross.test.ts:176`.
   - "a shortened preview fails closed" is #344's title, not test line 157.
   - The texts of S3a's "check N" are in `S3a-builder.md` §7 (lines 165–171), not `S3a.md` §7. CON-LOGS is at
     `S3b-builder.md:157`.
2. **Line-number drift.** In `safety.ts`: 203→204, 212→213, 214→215, 197→198. `intercept.ts:40` is 41 at 372d091.
   The `s12-console-cap.test.ts:10` marker is at :32.
3. **R19-ARGS-CSP's discrimination (1789).** "fails on the page's own `rows`" is wrong: the call reads `a.rows`.
4. **R19-CON-NAV** tests Chrome's own clearing; acceptable as written.

## 4. Builder reports, audited

Both builders' quote lists match `372d091` except as NIT-1 and NIT-2 say. Builder B is right that the keeper counter
does not exist (`S7-sheet-builder2.md` §7 item 1), but its remedy, Open item 5, does not discriminate (MAJOR-1). Its
claim that S5c's texts were uncommitted was true at its HEAD and is stale now (MINOR-6).

## 5. Proposed decisions

### 2026-10-28 · Run 19's "attached" STOPs are judged on the banner only after a 20 s idle under a passing slice control
**Decided:** a banner positive on a refused call is a STOP only with `IDLE ≥ 20 000` and a passing BANNER-CTL in the
same slice; otherwise it is NOT MEASURED. KEEP-3 and CHOOSE-DISARM carry no in-row banner STOP. **Why:**
`recipes/CLAUDE.md:159-161` and Run 18's R18-UP-6 show a positive does not prove an attach, and #351 (2) bars an
attach counter. **Instead of:** a counter (G12-2); the current STOPs (they fire on a correct build). **Revisit if:** the
user wants the instrument. **By:** Claude (proposed)

## 6. Handoff

No processes started; no port bound; no file changed except this report and the evidence file. A fixer edits only
§4.27. After the fix, a fresh verifier re-checks MAJOR-1…5 and MINOR-1…3 and 6.

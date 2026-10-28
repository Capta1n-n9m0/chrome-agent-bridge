# Step 12 S6-G2 verifier: a trusted click or typing as one blocking action

Model / effort: Opus, medium. Role: verifier (agent-rules §6). Brief deviations: none. I edited no tracked file in the main
tree. Mutants ran only in a scratch worktree (`scratchpad/s6g2v-wt`, HEAD 7e26dab, `npm ci`, no junction). Raw output is in
`S6-G2-verifier-evidence.txt`.

## 1. Verdict
**PASS-with-notes.** Every exit check holds. Findings: 0 CRITICAL, 0 MAJOR, 4 MINOR, 3 NIT.

## 2. Exit checks (re-derived)

| Check | Result | Evidence |
|---|---|---|
| G6.5 `trustedFocus` predicate with its own table; `takesLock` unchanged | holds. `git diff` of `methods.ts` only appends lines, and `takesLock`'s body is untouched. The table test covers 19 rows. | diff; s6 file test 1 |
| G6.5 new rows `takesLock(click\|type\|pressKey,{trusted:true}) === false` in the existing table | holds (`methods.test.ts:120-121`) | M2 folding mutant: 3 red |
| G6.5 order and hold tests fail on the pre-slice code | holds. On HEAD with only the slice's tests: **13 of 14 red**. The one green test is "focusEmulation / untrusted take no lock", which guards unchanged behaviour, so green is right there. With only the predicate added (HEAD's `intercept.ts`): 12 red, 2 green (table + unchanged). | evidence § pre-slice |
| G6.5 a mutant releasing between focus and input is red | holds. M1 (`release()` after the `focusTab` forward): 7 red. | evidence § mutants |
| G6.6 every existing daemon lock / trusted-input test unchanged | holds. The only change to an existing test is the two added lines in `methods.test.ts`. Daemon: 289 passed / 23 files. | diff, after-run |
| G6.7 `LOCK_TIMEOUT` under contention in the spec note and a test | holds (spec §6.4 note, line 304, and §10. Test: "G6.7: under contention…") | |
| G6.8 Run 19 rows in the builder's Handoff | present (R19-G2-1, R19-G2-2). See MINOR-4. | builder §7 |
| Log sites +0, allowlist 54 | holds. No log call was added. `log-allowlist.ts` has 54 entries. log-scan passes (16 tests). | evidence |
| Every stage: `npm test` before → after | worktree HEAD **5075 tests / 214 files** → HEAD+slice **5089 / 215**: **+14 tests, +1 file**, none removed. The same 9 failures in `recipes/test/s11-r16-runner.test.ts` appear in both runs. They are specific to the worktree and identical before and after, so they are not a slice finding. Main tree (with S5b in flight): 5100 passed / 218 files. | evidence |
| typecheck, 7 recipes tsconfigs, build, clean status | all exit 0. `git status --short` is identical before and after `npm run build`. | evidence |
| Lane | holds. The slice's files are under `daemon/` and `docs/specs/` only. `intercept.ts` imports only `./methods.js` anew, and nothing new from shared/sdk/mcp/extension. | diff |
| Size cap (#344 (4)) | code 15 + 35 − 1 = **~50 lines** (cap 300). Tests 2 + 349 = **351** (cap 450). | numstat |

Mutant table (s6 + methods test files, 23 tests). Red means caught:
M1 release between focus and input **7**. M2 fold into `takesLock` **3**. M3 no pause **6**. M4 no re-check between forwards **2**.
M5 pause before reply **7**. M6 no pause on input error **1**. M8 no disconnect check between forwards **1**. M9 pause not cut at
deadline **2**. M10 no daemon `focusTab` **11**. M11 `focusEmulation:true` also locks **2**. **M7 / M7b (no lease re-check after the lock
wait): survived, 0 red** (MINOR-1).

## 3. The design question and the rules (judged)
- **The client's own `focusTab` first (#89, #106).** I accept the builder's answer. The extension's `focusTab`
  (`extension/src/handlers/tabs.ts:59-78`) runs `tabs.get` → `call.effect()` → `noteFocus` → `windows.update {focused}` → `tabs.update
  {active}`. Every step is idempotent on a tab already in front. The client's own call is a separate request, released at its
  reply, so there is no re-entrancy and no deadlock. The test pins two acquisitions. A pipelined client queues FIFO behind
  itself. On success the answer does not change. Cost: one extra round trip, plus up to 500 ms behind the caller's own previous pause.
- **Failure rules.** A focus failure, a disconnect, or a lease loss between the forwards: no input, released at once. That is right,
  since no input was sent and nothing needs to settle. A disconnect during the wait rejects the waiter (`releaseAllOf`). A disconnect
  during the pause frees the lock at once. The timer's later `release()` is a no-op, because it is token-guarded (`lock.ts` `take`/`free`)
  and its `done` flag is set. The test proves B keeps the lock.
- **Codes for a raw client.** `focusTab`, `click`, `type` and `pressKey` are all class `tab` in `extension/src/safety.ts:72-81`, so a gate
  refusal carries the same code. Only the message can differ, and only for a raw client (the builder's own flag holds).
- **Answers beyond `LOCK_TIMEOUT`.** For the SDK and the MCP, there is no change except in a race. See MINOR-2 for a raw client's
  side effect.

## 4. Findings

**MINOR-1. The lease re-check after the lock wait is untested.** `daemon/src/intercept.ts:547-548`. Mutant M7b deletes the
`checkLease` after `acquire`, and all 14 tests stay green. The spec note claims this re-check ("takes the visibility lock,
re-resolves and re-checks the lease"). Without it, if the tab is released and claimed by B during a long lock wait, the daemon
forwards a `focusTab` onto B's held tab before the between-forwards check answers `TAB_HELD`. That is a side effect on another
client's tab. The code is right today. Only the guard is missing.
*Evidence:* `applied M7b_no_lease_check_after_wait` → `Tests 14 passed (14)`.
*Fix:* add a test. B holds the lock (a screenshot is pending). A sends a trusted click. A releases T1 and B claims it. B's
screenshot resolves. Expect `TAB_HELD`, and `of("focusTab")` has length 0.

**MINOR-2. The note does not state a visible behaviour change for raw trusted inputs.** `docs/specs/…-design.md:286-307`.
A `click`/`type`/`pressKey` `{trusted:true}` sent without its own `focusTab` now brings its tab to the front and focuses the window.
That covers a raw client, `recipes/fe.ts:198-200`, `recipes/t5.ts:839-840`, and the SDK's `"none"` policy. Before, it answered
`ok` and did nothing on a background tab (Run 8 BG-1/BG-2). #338 rules the behaviour, so this is not a STOP. But the note lists
only `LOCK_TIMEOUT` as the changed answer. `sdk/src/policy.ts:36` (`"none"`: "send trusted input as is") and the F19 sentence in
`mcp/CLAUDE.md:54` ("Focus and input are two calls, so another actor's capture … can come between them") are now stale.
FE-5 / BG rows would no longer reproduce if re-run.
*Fix:* add one sentence to the §6.4 note: "a trusted input sent without its own `focusTab` now brings its tab to the front, as
`focusFirst` does". List `policy.ts:36` and `mcp/CLAUDE.md:54` for S8's doc pass. No code change.

**MINOR-3. The input can start after the caller's deadline.** `daemon/src/intercept.ts:549, 560`. The focus forward may run until
`deadline + 5000` (#44 slack). If it settles past `deadline`, the input is still forwarded with the remaining slack. Before this
slice, a forward always started before the deadline. Now a trusted click can begin after the deadline with a few ms of wait left.
The likely outcome is a `TIMEOUT` answer while the keys still land. The client's timer (`+6000`, `sdk/src/client.ts:56-59`) still
gets an answer, so no input lands after the client gave up. The pause is then 0 (`:562`), so the input also gets no settle hold.
*Fix (proposed):* after the focus, if `now() >= deadline`, answer `TIMEOUT` without forwarding the input, and release at once.
Write it into the §6.4 note. Alternatively, record in the note that the input may start inside the slack.

**MINOR-4. One expected clause of R19-G2-2 cannot be observed as written.** Builder §7, line 128. "No B screenshot is forwarded
between A's daemon `focusTab` and A's input reply." No log line or status field shows when the daemon forwards. A live runner
sees only client-side send and reply times.
*Fix (for S7-sheet):* state it in client-observable terms. No B screenshot sent after A's send replies before A's reply + 450 ms,
except one that held the lock before A's send. Also read `daemon.status.lock.holder` during the hold, as R19-G2-1 does.

**NIT-1. The pause timer is not injected.** `intercept.ts:563` uses the global `setTimeout`. TabLayer already injects `now` and
`sleep` (`:174-175`), and auditor 2's (ii-a) said "the pause timer injected for tests". With an injected `now` and real timers, the
pause length is computed on one clock and run on another. This is consistent with `VisibilityLock`'s default timer (TabLayer does not
inject it either), and the tests use vitest's fake timers, which fake both. *Fix:* `void this.sleep(pause).then(release)`.

**NIT-2. The builder's counts are off by one.** The new file has **14** tests, not 13, and adds **+14** to the full count. "13 of 13
red on pre-slice" is really 13 of 14, with one green by design. The mutant counts differ slightly (M2: 3, not 2). Nothing else changes.

**NIT-3. The pause is cut to 0 when the extension was slow.** `min(500, deadline − now)` skips the settle hold exactly when the input
settled late, for example with a short `timeoutMs`. Auditor 2 and #44 accept this, and m2 G2 shows the hazard sits before the input
(E6). Record it as a known edge, not a defect.

## 5. Proposed decisions (builder §5) attacked
- *Own `focusTab` stays harmless.* Agreed (§3).
- *A failed focus answers with its error and releases at once.* Agreed. The raw-client message change is flagged correctly, and
  MINOR-2 adds the focus side effect.
- *The pause is `min(500, deadline − now)`.* Agreed, with MINOR-3 and NIT-3 as amendments the user can see.

## 6. Handoff
- Processes: none left running. The worktree was deregistered with `git worktree remove --force`. Git could not delete the folder
  (open handles), so a residue `scratchpad/s6g2v-wt` stays outside the repo. Its only junctions point inside itself. Remove them
  with `cmd /c rmdir` if it is cleaned.
- Fixer scope: MINOR-1 (one test), MINOR-2 (one spec sentence), MINOR-3 (a choice: code plus a note, or a note only). MINOR-4 goes to
  S7-sheet.

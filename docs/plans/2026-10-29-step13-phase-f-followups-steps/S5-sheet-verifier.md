# S5-sheet verifier report (Step 13, Run 20's wave sheet)

Verifier: Claude Opus 5.5, medium. Read and run only; nothing edited but this report and `S5-sheet-verifier-doc-check.txt`.

## Verdict: FAIL (1 MAJOR, 7 MINOR, 3 NIT)

The sheet is close to done. Coverage, R19 names, expected texts, slices, the STOP lists and the DevTools control all
hold. The FAIL is one row: R20-CON-NOTEA's `blocked` leg can pass without the feature, which is the §2 integrity floor.
The fix is small and needs no new decision.

## Checks run

| # | Check | Result |
|---|---|---|
| 1 | `git diff --numstat docs/e2e-test-plan.md` | `58 0`, a single hunk `@@ -1937,0 +1938,58 @@`: only §4.28 is added, nothing deleted, no R18 or R19 row touched |
| 2 | Coverage of the § 0.8 seeds with #391's seven changes | All present: R20-0, POP-BG/FG/OTHER, ARGS-ORDER, CON-NOTEA, CON-CAP, CHOOSE-TWICE; re-measured ARGS-3, the MCP legs of CON-4, ARGS-OLD and VERSION, CON-FLOOR, CHOOSE-KEPT, G2-1, CHOOSE-REFUSE-DIS, DEVT-UNDOCK/-EARLY plus the conditional rows; LOGS and RESTORE. #391 (1)–(7) each applied. S3a was not built: the cut-path clause is pre-declared NOT REACHABLE. R20-0 proves the build by the SDK value's key order **and** the loaded manifest's `webNavigation` (read in the worker console), with the reload by `recipes/reload-extension.ps1`. LOGS names its patterns as "the user's name", the sentinel and the token, per slice, counts only. RESTORE is by count and hash, per slice |
| 3 | R19 ids named by the R20 rows | All exist in §4.27: ARGS-1, ARGS-3, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR, ARGS-OLD, CHOOSE-KEPT, CHOOSE-REFUSE, G2-1, VERSION, UP-DEVT, KEEP-4, SWEEP-HELD, CHOOSE-4, CLOSER. R18-UP-DEVT is in §4.26; R15-POP-2 is in §4.22 (l.1427) |
| 4 | Expected texts against source (grep) | All match character for character: `DISARMED_ALL_LINE` and `JS_DISABLED_LINE` (sdk/src/error.ts:119-124); `DISARMED_ALL_MESSAGE` and `JS_DISABLED_MESSAGE` (extension/src/safety.ts:197-204); `CHOOSER_BUSY_MESSAGE` (handlers/upload.ts:49); `CHOOSER_TIMEOUT_MESSAGE` (upload-files.ts:235); `DISABLED_INPUT_MESSAGE` (upload-target.ts:28); `ARGS_RELOAD_HINT` and `CHOOSER_RELOAD_HINT` (daemon/src/intercept.ts:41-45); K-devt (debugger-errors.ts:52); the #398 markers (sdk/src/format/console-messages.ts:43-44); both registry sentences (registry.ts:945); `OPENER_JOIN_HOLD_MS = 250`. CON-CAP's arithmetic holds: `console.log` maps to level `info`, a 30-character prefix, 2 030 per line, k = 9, 191 cut. The chooser path is not serialised by the daemon (`takesLock` is false for `uploadFiles`, methods.ts:84-88), so CHOOSE-TWICE's call 2 reaches the busy check. MCP legs read the MCP's own line and `isError` |
| 5 | Slices (#384) and the DevTools control | Three self-contained slices, each with its own proof row, RESTORE, LOGS, capture and `PORT` line. The control matches `stage0-m2-D.txt`: window title `DevTools - <host>:<port>/<path>?…` on 9 of 9 undocked legs and 0 on the docked ones; `probeSeesAfter attached:true` 11 of 11, `false` before. The conditional rule is sound (they run only under a leg that printed `devtools-refuses`, else NOT RUN plus the finding) |
| 6 | Pre-declared outcomes, STOP rules, gates | The unreachable or conditional outcomes are stated up front (sheet l.1993). The phase doc's STOP lines and forbidden fixes are carried (l.1946). G13-3 holds: fixture hosts only, ports by `netstat` plus `Get-NetTCPConnection`. DevTools opens only in X and is closed by the wave. Native dialogs are counted by `DIALOGS`. Exceptions: MAJOR-1, MINOR-4 |
| 8 | Paths, names, doc-check | No local path or user name in the diff. `node scripts/doc-check.mjs` reports no dead paths and no count mismatch (`S5-sheet-verifier-doc-check.txt`). The only flag is the pre-existing `CLAUDE.md:110 5596 passed`, not this sheet's |
| 9 | Helper split | The sizes are plausible, each slice ≤ ~600 lines. The old-text pins are flagged correctly (`s12-forms-b.ts:101` `CAP_MARK`, `s12-forms.ts:89` `CAP_MARKER`, `overlapExact` as used at `s12-r19-b.ts:50` and `s12-r19-c.ts:87`, `attachedFrom` at `s12-forms-b.ts:15`, `hasConsoleClause` at `s12-forms.ts:115`). One omission: MINOR-8 |

## Findings

**MAJOR-1: R20-CON-NOTEA's `blocked` leg can pass with nothing logged** (`docs/e2e-test-plan.md:1967`, also l.1958 and l.1990).
- **The leg can pass vacuously.** It expects `entries=0` after the pattern is added. Nothing in the row shows that the
  page logged the two `s12blk.localhost` objects before that.
- **The page's port is hard-coded.** `test-fixtures/s12-console.js:52` and `:55` load
  `http://s12blk.localhost:8081/s12-notea.js` and `http://localhost:8081/s12-noteaok.js`. The sheet picks `<P>` by
  netstat "from 8081 up" and says the scripts load from `<P>`.
- **What follows.** If `<P>` ≠ 8081, or the `s12blk` script fails to load for any other reason, the blocked leg prints
  `entries=0` and passes without the feature. The allowed leg then FAILs for the instrument.
- **The stated control does not match the order.** The row's "Control for the drop" says the allowed leg ran *with the
  pattern set*. The slice order runs the allowed leg early, before any block-list change, and the blocked leg later.
  Either way it reads a different page and host, so it cannot prove the `notea` script ran.
- **Fix:**
  - Add a read before the pattern on the `notea` page: `tab.consoleMessages()` must read `entries=2`, else the leg is
    NOT MEASURED "the blocked host's script did not log".
  - State that liveA20 needs `<P>` = 8081 for both legs (else the row is NOT MEASURED "fixture port"), or have S5-helpers
    add port-relative copies of these pages.
  - Make the control sentence and the slice order agree.

**MINOR-2: R20-DEVT-EARLY's steps skip the `before-open` control read** (l.1985). The control paragraph (l.1954) needs
`before-open attached=no` for a pass. For this row that read is also the proof of the condition itself: the bridge has
not attached. Its docked leg prints `windows=n/a title=n/a`, which the `CTRL20` form (l.1952 (7)) does not allow.
Fix: add step (0) `CTRL20 … when=before-open`, and allow `n/a` in the form.

**MINOR-3: the POP rows' background guard will likely fail after round 1** (l.1960, l.1962).
- **Cause.** A popup from O opens as the active tab of W. Closing it usually brings O, its opener, to the front.
- **Effect.** Rounds 2 and 3 then read `active-guard=fg`. The guard turns that into NOT DISCRIMINATING, so nothing is
  flattered, but the row is burned.
- **Fix:** B's `focusTab` on H (C's, for `third`) before every round, with the guard read after it.

**MINOR-4: the DevTools dock side stays changed in the user's profile.** DEVT-UNDOCK and the undocked legs change
DevTools' dock-side preference, which persists across windows. Stage 0 ran on a scratch profile. RESTORE (l.1972,
l.1987) does not set it back, and the conditional rows may end undocked. Fix: read the found dock side in R20-0C and
restore it in liveC20's R20-RESTORE (re-dock before the last close).

**MINOR-5: R20-LOGS cannot judge "0 for every other tool"** (l.1973). `SCAN20 actors:` prints one total
`sentinel=<n>`. Fix: one line per tool, like §4.27's `SCANTOOL`, with sentinel above 0 allowed only for the named tools.

**MINOR-6: the line-form contract to S5-helpers is incomplete** (l.1952). Rows print forms that neither list names:
- `CONCAP`, whose `lines=<k+1>` now counts the marker; §4.27 (25) has `lines=<k>`, so say it is redefined.
- `ARGS`, `KEEPDT`, `SWEEPHELD`, `S4 commit=ancestor` and `RESTORED:`.
- The judged `names-devtools=no` key of CHOOSE-TWICE, which `CHOOSE` (21) lacks.

Fix: list them, and define `CONCAP`'s change.

**MINOR-7: R20-CHOOSE-REFUSE-DIS's verdict is ambiguous** (l.1978). The row says it is "decided by `flip` and, if that
is a TIMEOUT, by `self`", and also that "If `flip` answers TIMEOUT … the row is RECORD". It does not say what
`flip`=TIMEOUT with `self`=`BAD_PARAMS` gives. Fix: one sentence. For example, `self` `BAD_PARAMS` exact = PASS; `self`
TIMEOUT = RECORD.

**MINOR-8: the helper split misses one MCP reader** (builder §7). `s12-r19-c.ts:94` `mcpCodeOf` and `:101`
`judgeMcpErr` read a code on line 1 and use `text.includes`. `s12-r19-de.ts:14,64,95` imports them. The list names only
"`s12-r19-a.ts`/`-de.ts`". Fix: name `s12-r19-c.ts` `mcpCodeOf`/`judgeMcpErr` as not reused.

**NIT-9:** the order of liveA20 differs between the header row (l.1958: ARGS-3, CON-NOTEA blocked, CON-4, CON-FLOOR)
and the bullet (l.1990: ARGS-3, CON-4, CON-FLOOR, CON-NOTEA blocked). Pick one.

**NIT-10:** l.1994 names `R20-CLOSER`, but no such id exists; it is the row-less `CLOSERPROBE`.

**NIT-11:** l.1972 says "All five state items" but lists four.

## The builder's deviations

- **No §5 skeleton:** accepted. §5 holds only post-run entries; Run 19's entry came in with `2f68f99`, the S7-record
  commit, not before the run.
- **ARGS-OLD in liveA20 and VERSION in liveB20:** accepted. It is consistent with #384's three slices (ARGS in A,
  chooser in B). Each ends with its own `LOADED20 rerun` and the STOP `old-build-left-loaded`.
- **No banner rows:** accepted. No R20 clause re-measures a banner. Run 19's banner clauses all stood (S7-run-record
  §1). The sheet says so (l.1942).
- **The builder's proposed reading** (a DevTools refusal = FAIL against the written `ok`, plus the finding, no STOP):
  sound, and it keeps the expected text unedited. Leave it for the gate.

## Re-check after a fix round

Re-check only MAJOR-1 and MINOR-2 to MINOR-8: l.1967, 1985, 1960, 1962, 1972, 1973, 1952, 1978 and builder §7. Re-run
`git diff --numstat` (0 deletions) and `node scripts/doc-check.mjs`.

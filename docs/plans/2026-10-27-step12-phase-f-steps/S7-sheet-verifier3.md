# S7-sheet verifier 3: spot check after fix round 2 (`docs/e2e-test-plan.md` §4.27)

Claude Opus 5.5, medium effort. Role: verifier (`docs/agent-rules.md` §6), a spot check of the nine findings of
`S7-sheet-verifier2.md` against `S7-sheet-fixer2.md`. Docs stage: no build, typecheck or test run (the brief's deviation).
I edited nothing except this report. §4.27 runs from line 1768 to 1861 (the sheet's lines are cited below as
`+n`, the n-th line of §4.27, so `+43` is file line 1810).

## 1. Verdict

**PASS-with-notes.** All nine findings are fixed. No CRITICAL, MAJOR or MINOR remains; three NITs are new. Exit checks:
- `node scripts/doc-check.mjs` exits 0. It reports 4 dead paths, all S12 fixtures at 1778/1812 that S7-helpers builds,
  and the known count drifts (code has 25 tools and 28 router methods; the docs say 24 and 27).
- `git diff --stat docs/e2e-test-plan.md`: `1 file changed, 94 insertions(+)`, one hunk `@@ -1767,0 +1768,94 @@`. The
  hunk ends at 1861, a blank line before `## 5. Results template` (1862). Nothing else in the file changed.

## 2. The nine findings

| Finding | Status | Evidence |
|---|---|---|
| MINOR-A | **Fixed** | Fixture `noteaok` (+11): the message is exactly `s12-noteaok`, followed by one plain `console.log` of `SENTINEL`. NOTEA allowed leg (+35) expects `entries=2 console=2 sentinel=1 url=0 stack=0 marker=1`. `entries=1 marker=0` is RECORD and NOT DISCRIMINATING: a build that drops Error objects and a V8 cut of the preview both print it. `entries=0` is a FAIL because the plain entry is missing, and a V8 cut cannot cause that. This is sound. The message bound makes a cut unlikely but cannot rule one out, because the preview still holds the stack line and the script URL. The RECORD clause covers that case, so a correct build cannot FAIL here. |
| MINOR-B | **Fixed** | liveB19 (+85) runs `CLOSERPROBE` right after `DEVPROBE` and before any row. R19-CLOSER's slice column (+62) names B and C. Open item 12 (+93) names both. See NIT-2 for liveE19. |
| MINOR-C | **Fixed; the merge is sound** | Neither +41 (form 31) nor +89 contains `chooser-interception-left-on` any more (grep finds 0). Map +89 lists `dialog-left-open` and R19-CLOSER. The map's opening says every `STOP` is followed by `RETURN … restored= readback=` before the next row. CHOOSE-4 (+67) prints `STOP dialog-not-opened` when `after-click=0` after 3 000 ms ("the interception is still on"), then restores and returns. Its legs (a) ok, (b) `TIMEOUT` and (c) a refusal raised after the interception was on each click 500 ms after the call ends. That is inside the keeper's 5 s hold, so it catches an interception left on after a TIMEOUT or a refusal. CHOOSE-DISARM (+70) covers the disarm exit. R19-CLOSER proves the click method first, and `opened=no` is NOT MEASURED, never this STOP. The phase doc's sentence (:433-434) joins "interception still on" and "dialog not opening on … CHOOSE-4" in one STOP, so one reason for both matches it. Some gaps are left: refusals that run before CHOOSE-4 are not followed by a click (NIT-1). |
| MINOR-D | **Fixed** | +43 (b): a re-run prints only `LOADED rerun=<k> …`, with no `ROW` and no preflight lines. Form (1) (+13) has `[rerun=<k> ]`. liveB19 (+85), liveD19 and liveE19 (+87) say so. R19-VERSION's `old-build-left-loaded` check reads the same `LOADED` line. |
| MINOR-E | **Fixed** | +43 (a) defines IDLE once, as the time since the last reply of any call other than `snapshot`, `listTabs` and `daemon.status`. ARGS-3 (+20), BANNER-CTL (+50), UP-6 (+51) and F-RAW (+52) all point to it. The two quotes match phase doc :172 and :174-175 word for word: "the first CDP call attaches, later calls reuse it" and "`withDebugger` and every caller (`extension/src/debugger.ts`) go through it". The superset is conservative: counting more calls only lengthens the idle. |
| NIT-A | **Fixed** | Capture segments, liveB19 and liveD19 now reopen the capture before the re-run. |
| NIT-B | **Fixed** | ARGS-1 says "the args sentinel" and gives no value. |
| NIT-C | **Fixed** | Open item 5 now raises the gap without a condition. |
| NIT-D | **Fixed** | +43 (c): a key left out means "not judged". |

## 3. New findings

### NIT

1. **The refusals before CHOOSE-4 are not followed by a click (+55, +65, +66, +68).**
   - These rows end with an interception on and no human-style click after them: KEEP-2's ctl leg (slice B, a
     single-input refusal), CHOOSE-2, CHOOSE-3 (`TIMEOUT`) and CHOOSE-REFUSE (`picker`, `dir`, `dis`).
   - CHOOSE-4 covers the same three kinds of exit, so the phase doc's STOP is still caught.
   - A build whose `picker`, `dir` or `dis` refusal leaves the interception on, while its single-file refusal does not,
     would pass live. The unit tests are left to catch it.
   - **Suggested fix:** record this as an open item, or add a leg (d) to CHOOSE-4 after one `CHOOSE-REFUSE` exit.
2. **liveE19 has `chooser: true` calls (R19-VERSION, +79) and no `CLOSERPROBE` (+87, Open item 12 +93).**
   - The dialog risk there is nil by design: the daemon refuses with `VERSION` before it forwards anything. A wrongly
     forwarded call reaches an old worker that uploads into the file input itself (`clicks=0`), and that opens no
     dialog.
   - The sheet does not give this reason.
   - **Suggested fix:** one clause in Open item 12, "liveE19 needs no closer: nothing is forwarded, and the target is
     the input itself".
3. **The S3a quote is stitched out of order (+11, +35).**
   - The sheet quotes "is unmeasured … a live row decides" from `S3a.md:66-68`.
   - The source has "a live row decides" in the title (:66) and "the shortening is unmeasured" in the Why (:68). The
     ellipsis implies the reverse order.
   - **Suggested fix:** quote the two parts separately.

## 4. Checks with no finding

- The changed lines quote no sentinel value, console text, `args` value, path, URL or token. `SENTINEL` and "the args
  sentinel" are named, never written out.
- No line outside the nine findings changed, judged from fixer2's table against the evidence for verifier 2's lines.
  The CON-FLOOR `:215` residual is left as it was, as fixer2 states.

## 5. Handoff

I started no process, bound no port, and changed no file except this report. The NITs do not need another fix round.
The committer can stage the sheet and the S7-sheet reports. The step agent may fold NIT-1 to NIT-3 into the sheet's
Open items when S7-helpers starts.

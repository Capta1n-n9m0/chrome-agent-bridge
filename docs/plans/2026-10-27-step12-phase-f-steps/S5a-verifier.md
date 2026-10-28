# Step 12 S5a — the native file chooser, the extension side: verifier report

Model / effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6). Date: 2026-10-28. Evidence:
`S5a-verifier-evidence.txt` (same folder). Layer followed: the phase doc (0.7, 0.10, the Stage 0 note, § S5, E5.1–E5.3,
§ Every stage, § STOP rules), decisions #325/#327/#335/#336/#344 (4)/#347/#352, `stage0-audit.md` §4 F9/F16 and §5 E5.2.
The builder's report was treated as claims to audit.

## 1. Verdict

**PASS-with-notes.** Every exit check holds, and so does every check in the brief. I found no CRITICAL or MAJOR issue
and nothing that trips a STOP rule. There are four MINOR findings and five NITs. Three of the MINORs are about the 5 s
window and live-unmeasured Chrome facts; one is the wording of the second-chooser refusal. None lets a file in from
outside the Upload folders, leaves the interception on after a call, or changes an existing answer.

## 2. Outputs: the exit checks, re-derived

- **Test count** (`npx vitest run --reporter=json`, compared per file):
  - Before: HEAD `3714eb5` in a scratch worktree had **5028 tests in 211 files**.
  - After: the main tree has **5072 passed (5072) in 214 files**.
  - That is +44, all in the three new files (41 + 2 + 1). No file's count changed and none was removed.
  - The HEAD worktree's 9 failures are all in `recipes/test/s11-r16-runner.test.ts`. They are a worktree checkout
    artefact (its `fnText` finds no function there), unrelated to the slice; the main tree passes that file (evidence §1).
- **Checks:** `npm run typecheck` exit 0. The seven `recipes/tsconfig*.json` exit 0. `npm run build` exit 0.
  `git status --short` was identical before and after the build (evidence §2).
- **Every new test fails on pre-slice code:**
  - With the three new files at HEAD: `Test Files 3 failed (3)`, `Tests 3 failed (3)`. `s5a-chooser.test.ts` fails at
    load, and the keeper and guard tests fail on behaviour.
  - With only the new pure module copied in (handler and gate left at HEAD): **14 red / 27 green of 41**. Red: every
    chooser handler row, the chooser leg of each E5.2 prologue row, and the GatedRouter `JS_DISABLED` row. Green: the
    pure `setFilesByChooser` and waiter rows (their code was copied in) and the input-path reference legs (evidence §3).
- **Mutants:** 17, each applied alone in the scratch worktree and restored, with the restore checked by `cmp`. **All
  17 are red** (evidence §4):
  - **E5.1:** **M1, the off step skipped on an error (sent only after success): 17 red.**
  - The domain and event mutants: M2 (no `Page.disable`) 20 red; M14 (no `Page.enable`) 24; M13 (no `userGesture`)
    23; M3 (an event before the arm accepted) 1; M4 (a child session's event accepted) 1.
  - The input rules: M5 (no `backendNodeId` check) 3; M6 (no `mode` check) 3; M7 (no `webkitdirectory` check) 1; M8
    (no `disabled` check) 1. M12 (the TIMEOUT path ending with `files: []`) 1.
  - The gate: M9 (the JavaScript rule removed) 2; M10 (the rule only for `true`) 1.
  - The prologue and the re-checks: M15 (the missing-file check skipped on the chooser path) 5; M16 (the effect check
    before the mark skipped) 1; M17 (no guard handed to `withDebugger`, so no keeper re-check) 1.
  - The lock: M11 (no per-tab chooser lock) 1.
- **E5.2, as rewritten:**
  - `uploadPrologue` (`handlers/upload.ts:125-134`) is the one prologue both paths call, in Step 11's order: the
    params, the tab, file access, the missing-file check. The input path then runs exactly HEAD's lines.
  - `describe.each(PATHS)` runs the same prologue and gate rows on both paths.
  - The chooser's own input rules (`mode`, `backendNodeId`, `webkitdirectory`, `disabled`) are tested on their own.
- **E5.3:**
  - `git diff --stat HEAD` over `extension/test`, `shared/test`, `daemon`, `sdk`, `mcp`, `extension/src/content`,
    `debugger.ts`, `debugger-keeper.ts` and `sw.ts` is empty.
  - 0 added `console.` lines. `log-scan.test.ts` and `log-sentinel.test.ts` pass in the full run, and
    `log-allowlist.ts` is untouched (54).
  - No chooser message carries a path; a test collects every answered text.
  - The handler diff's removed lines (`git diff HEAD -- extension/src/handlers/upload.ts | grep '^-'`) are only an
    import, a doc comment, `markInPage`'s signature (its default `func` is today's `UPLOAD_MARK_PAGE_FN`, its `args`
    cast only types) and the `uploadFiles` header. The input path is byte for byte today's.
- **JavaScript off:**
  - `JS_DISABLED` comes through `GatedRouter` with attach + `sendCommand` at 0, no `executeScript` and no probe.
  - Controls without `chooser`, or with `false` or `null`, upload.
  - The rule (`safety.ts:327`) sits beside the existing class-`evaluate` rule, after the disarm check and before the
    tab and folder tests, the same order `evaluate` has.
- **The no-chooser `TIMEOUT`:** it fires at exactly 5 s after the click's reply (not at 4 999 ms), unprefixed, with the
  off step sent.
- **A refusal after the click ends the chooser:**
  - The order is the off step → `Page.disable` → detach → unmark.
  - Through the keeper, the session is detached at once on a refusal and kept on success (`s5a-chooser-keeper.test.ts`).
  - `files: []` is never sent.
- **`Page.disable` on every path:** it runs in an unconditional `finally` (`upload-files.ts:458-462`). M2 is red.
- **No remote-object leak:** the click evaluates with `returnByValue: true`. `DOM.describeNode` and
  `DOM.setFileInputFiles` take `backendNodeId`, so no `objectId` or `objectGroup` is created. The isolated world is
  created per call, as today's finder does.
- **The kept session (S4b, #347, #352):**
  - The CDP leg goes through `withDebugger(…, "File upload", call)`, so the keeper re-check runs before the use (M17
    red).
  - The commands go through `send`, so they are tracked: a swallowed off or disable failure still drops the session
    (`UseCommands.track`).
  - Any thrown refusal sets `drop` and the session is detached (`debugger-keeper.ts:176-179`).
  - The listener is added inside the use and removed in a `finally`.
- **Size:** the code is 360 new lines (243 + 105 + 5 + 7) against the cap of 550. The tests are 730 lines against 825.
  The spec note adds 49.
- **Lane:** only `upload-files.ts`, `handlers/upload.ts`, `safety.ts` (one params rule and its doc comment),
  `shared/src/protocol.ts`, the three tests and the spec note. `content/upload-target.ts` is unchanged.
  `isUploadFilesParams` has no production caller (0 outside tests), so the guard's change is not a wire change.

## 4. Deviations

None from the brief. The builder's own deviations stand: no content method was added, because `content/index.ts` is
out of lane, and there are five new fixed texts. Both are judged below.

## 6. Findings

**V1 · MINOR · `handlers/upload.ts:199-205`, `upload-files.ts:351-354` — the human's own chooser can be taken as the
call's (brief (c)).**
- **What happens:** the waiter keeps the first top-level `Page.fileChooserOpened` after the arm. If the call's click
  opens nothing and the tab is in front, a file input the human clicks within the 5 s is intercepted. No dialog shows,
  and the agent's paths are set into whichever input the human clicked.
- **Before the arm:** a human chooser opened between the interception on and the click is intercepted, ignored, and
  freed only by the off step. The human's click silently does nothing.
- **Against the STOP rules:** the paths are still the call's own, already inside the Upload folders, and the
  interception is on only inside the call. So no STOP rule fires. But it is a "what the human sees" effect that the
  spec note does not mention. It is by construction only: the fake has no human.
- **Fix:** state it in the spec note's chooser section and in `docs/setup.md` (S5b) as a limit. Add a live row on a
  front fixture tab: a human-style click during the wait, and a record of which input received the files. Optionally,
  when the marked target is itself a file input or a `<label for>`, refuse an event whose `backendNodeId` is not that
  input's.

**V2 · MINOR · `upload-files.ts:438-448` — no gate re-check between the event and `DOM.setFileInputFiles`; a disarm
during the wait answers up to 5 s late (brief (c)).**
- **What happens:** the last gate check is the keeper's re-check before the use, before the click. A disarm detaches
  through `detachAll` (5–14 ms measured for trusted input, `extension/CLAUDE.md`). An event that lands in that gap
  still leads to a file set after the disarm. That window has the same size as today's input path, but the chooser
  makes the set depend on page timing.
- **The late answer:** after the detach, the waiter keeps waiting, so the call answers `DISARMED` only at 5 s.
- **Fix (in lane):** pass the call's `effect` into `ChooserDeps` and run it after the event, before `DOM.describeNode`.
  That is one storage read (~2 ms, Run 13 SAFE-PERF). Optionally, close the waiter when the session is killed (the
  keeper is out of lane, so this would be a note for a later slice).

**V3 · MINOR · spec §10 note (spec line ~910) — an unmeasured, uncited Chrome fact is stated as fact (F16).**
- **The claim:** the note says the page's transient activation "ends no later than the 5 s wait, so a chooser cannot
  open after the interception is off."
- **What backs it:** neither Stage 0 (Stage0-measurer2 E1–E8 has no late opener) nor a cited source. The margin is
  only the click's round trip plus the off step's latency. A foreground tab with a late opener (`setTimeout` 4.9 s
  after the click) would open Chrome's own dialog on the human's screen if the fact were wrong. That is a STOP-class
  outcome, which F16 named.
- **Fix:** mark the sentence "by construction, unmeasured" and cite Chromium's activation lifespan if it is relied on.
  Add a late-opener row before S5 ships (a front fixture tab, openers at about 4.9 s and about 5.1 s; pass rule: never
  Chrome's dialog). The builder's CHOOSE-3 has no late opener.

**V4 · MINOR · `handlers/upload.ts:165-167` — the second chooser call's text tells the agent to close DevTools (brief
(a)).**
- **What happens:** `ChooserTabs` answers `DEBUGGER_DEVTOOLS` "Chrome DevTools (or another extension) is already
  attached to this tab … Close DevTools on that tab and retry." It does so also while the first call is still in its
  prologue or mark, when no debugger is attached at all.
- **The ruling it stretches:** #335 rules "a second CDP call overlapping one in flight answers as today". This lock is
  wider than that: it applies to a non-CDP window. The keeper itself would give the same text once both calls reach
  `withDebugger`.
- **No fitting existing message:** I found none (`grep 'already'` over `extension/src`). A new code is forbidden, and a
  new message is contract-level.
- **Fix:** keep the builder's proposed decision ("for user review"), and widen its text to say the answer can come
  when no debugger is attached yet. The lock itself is needed: without it, a second chooser call's mark can overwrite
  the first's on the same element (M11 red).

**V5 · NIT · `handlers/upload.ts:48`, `shared/src/protocol.ts:703` — the new `CHOOSER_PARAM_MESSAGE` (brief (b)).**
- **The message:** it is a new `BAD_PARAMS` text that no decision names. It is not a forbidden fix (it makes no row
  pass), and the builder lists it under Proposed decisions for user review. That is the right handling.
- **A related inconsistency:** the handler and the gate treat `chooser: null` as absent, but `isUploadFilesParams`
  rejects `null`. The guard has no production caller, so nothing changes today. S5b's SDK and MCP must not send
  `null`.

**V6 · NIT · `upload-files.ts:419-437` (the world and the click), `:443` (`DOM.describeNode`) — the isolated-world click and the describe without
`DOM.enable` are unmeasured (brief (d)).**
- **What was measured:** Stage 0 m2 clicked by a main-world `Runtime.evaluate` with no `contextId`
  (`stage0-m2-src.txt:629, 666, 673`). It never ran `Page.createIsolatedWorld`, `DOM.describeNode` or `DOM.enable` (grep
  count 0, evidence §7).
- **Why it is only a NIT:** both fail closed, to `TIMEOUT` or the `INTERNAL` breakdown, with no file set and the
  interception off, so there is no safety exposure.
- **Fix:** make sure §4.27 carries CHOOSE-1, CHOOSE-2 and CHOOSE-5 as the first chooser rows. If the isolated world
  fails, #248's main-world trade-off must be re-ruled.

**V7 · NIT · `upload-files.ts:324-329` — the target is marked by a page function that reads `__agentBridge.refs` (brief
(e)).**
- **What it does:** the function hand-builds the content script's `REF_STALE` text, which duplicates
  `content/upload-target.ts:114` and can drift. It does not check `isConnected`, and it sweeps no stray marks.
- **Overlap with the input path:** an input-path upload that overlaps on the same tab sweeps the chooser's mark. The
  chooser then answers `REF_STALE` `UPLOAD_MARK_GONE_MESSAGE`, which fails closed.
- **Why it is only a NIT:** `executeScript` with `world: "ISOLATED"` shares the content script's world, and
  `UPLOAD_MARK_PAGE_FN` already relies on that.
- **Fix:** move it to a guarded content method in a slice whose lane holds `content/index.ts`.

**V8 · NIT · `s5a-chooser.test.ts:423-440` — E5.2's folder rows reach the gate through `safetyDecision` only.** No
`GatedRouter` row runs `chooser: true` with a path outside the Upload folders end to end, though the `JS_DISABLED` row
does go through `GatedRouter`. *Fix:* add one such row with a CDP counter at 0.

**V9 · NIT · a refusal from the post-check after the files were set.** JavaScript switched off, or a disarm, landing
after `DOM.setFileInputFiles` answers `JS_DISABLED` or `DISARMED` although the file reached the page. This is the same
class of behaviour as `evaluate` and today's upload. *Fix:* none needed; mention it in setup's chooser line (S5b).

**No new runtime fact:** nothing ran against Chrome.

## 5. Proposed decisions

### 2026-10-28 · S5a verifier: a gate re-check after the chooser event, before the files are set
**Decided:** `setFilesByChooser` takes the call's `effect` and runs it after `Page.fileChooserOpened`, before
`DOM.describeNode` (V2). **Why:** the 5 s wait makes the set depend on page timing; one read closes the
disarm-to-detach gap. **Instead of:** relying on the keeper's re-check before the click alone. **Revisit if:** the
read's cost shows in CHOOSE-1's timing. **By:** Claude (proposed)

## 7. Handoff

- Nothing is running.
- My scratch worktree is removed. Its `@bridge` junctions pointed inside the worktree and were deleted as links first.
  `git worktree list` shows main only, and the main tree's `node_modules/.bin` still has 42 entries.
- The main tree is as I found it; only `dist/` was rebuilt, which git ignores. I wrote only this report and its
  evidence file.
- A leftover folder from an earlier agent's session, `wt`, sits in the session scratchpad. It is not a registered
  worktree, and I left it untouched.
- **For the step agent:**
  - V1–V4 can be fixed in one round or accepted as notes.
  - V3's late-opener row and V1's human-click row belong in §4.27 before S5 closes.

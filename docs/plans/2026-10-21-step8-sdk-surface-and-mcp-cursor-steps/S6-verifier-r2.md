# S6 verifier r2: the `Rcp` rename, REP-0 and the resumed-run section (pre-run)

Independent level-2 verifier, 2026-10-23. The work under review is uncommitted in the working tree at
HEAD `430cbeb`. No live Chrome or bridge contact: no recipe that connects was run, and no reload script.
REP-0's set-up check was run through a scratch script that calls `isInside`. `s6.ts` itself was not run.

## Verdict: FAIL (1 MAJOR, 2 MINOR, 3 NIT)

The rename, the resumed-run section, the gate list, the tests and the hygiene all hold. The verdict logic
sees a switch: it cannot PASS unless the capture switched. One pre-registered expectation is very likely
wrong, though. Control A expects the human tab's **cyan** bar to read `cyan` under the hue rule, and the
measured colour management of this machine predicts `other`. That would make REP-0 NOT DISCRIMINATING by
its own control. REP-0 is single-shot ("never rerun or re-tuned"), so it must be fixed before commit.

## Findings

### MAJOR-1: control A's cyan bar very likely reads `other`, so REP-0 would end NOT DISCRIMINATING
`describeBar` uses `hueName`, which needs R ≤ 100 for cyan. My dry run (scratch `rep0-dry.ts`, synthetic
PNGs):
```
describeBar #ff00ff: magenta
describeBar #dd00fa: magenta      (magenta measured through the default capture, Run 8/9)
describeBar #00ffff: cyan
describeBar #97fdfd: other        (cyan measured through CDP, R9-SCREEN-2)
```
No record holds a default-mode (`captureVisibleTab`) capture of the cyan bar read by the hue rule.
`grep -rn "→ cyan\|cyan (hue" docs/plans` finds only a synthetic prereg test. The default captures that
were measured (T5-run9-record.md:84-86) all lift the low channels: red `#d92424`, **lime `#00ff00` →
`#8fff3d` (R = 143)**, blue `#3300f8`. Green-bearing colours gain about 140 in R, so `#00ffff` through the
default capture should land near R ≈ 140–150, as it did through CDP (151). That fails "R ≤ 100".
`rep0Verdict` then returns NOT DISCRIMINATING ("the human tab reads other, not cyan"). It outranks PASS,
exits 3, gates REP-1, TAB-3 and SDK-7's MCP leg, and cannot be rerun. Decisions #69 and common.md:236
already say colour checks should "name the nearest hue or use less saturated colours".
**Fix (before the expected text is committed):** give the human tab a colour that the hue rule has been
measured to name through the default capture: blue (`#3300f8` → blue) or red (`#d92424` → red), Run 9
t5-screen3. Alternatively, judge control A with FE's cyan rule (`recipes/fe-rules.ts classifyRgb`:
G, B ≥ 150, R ≤ 170, R ≤ min(G,B) − 60, which names `#97fdfd` cyan). Update `REP0_HUMAN_COLOUR`, the bar
call in `s6.ts`, the §4.19 row, the sheet row and the tests. The probe's magenta is fine (`#dd00fa` →
magenta).

### MINOR-2: a failure inside `openFixture` leaves the probe tab and the run directory behind
`const probe = await openFixture(client, "rep0")` (`recipes/s6.ts`, inside `rep0`) sits **before** the
`try { … } finally { probe.close(); rep0Cleanup(dir) }`. `openFixture` calls `tab.waitFor({text})` with
failure reports on. A `TIMEOUT` there writes a report PNG of the probe (a fixture) into
`$S6_OUT\rep0-failures-<epoch>` and leaves the probe tab open. Neither is cleaned up. The exposure is
fixture-only and outside the repo, but the "only its own tab closed and the directory removed" claim does
not hold on that path. Fix: move the `try` above `openFixture` (close only if opened), or clean up in an
outer `finally`.

### MINOR-3: a set-up bridge error exits 1, the same exit code as `REP-0 FAIL`
A bridge error during set-up exits 1 with `s6-rep0: FAILED — …`, before any verdict. Examples: an
`evalJson` failure on the bars, or `listTabs`. The sheet's R-e names outcomes by the text `REP-0 FAIL`
**and** exit 1. A driver who goes by the exit code alone would gate on an unmeasured run, and the sheet
does not say whether that run may be rerun. The error is fail-closed, so the risk is low. Suggest one R-e
sentence: "a `FAILED — …` line without a `REP-0 …` verdict line measured nothing: fix and rerun, both
recorded."

### NIT-4: the timing figure differs between documents
The e2e addendum and the `s6.ts` comment cite "180–190 ms" (from S6-live-verifier.md:158). #97 says
"190–220 ms". Both have a source, so nothing is wrong, but the figure is not the same everywhere.

### NIT-5: the safety of the ungated rows depends on B1 discipline
The rows left out of the gate are safe only if every `newTab` and cursor claim lands in a driver window.
`newTab` uses the last-focused window. A report that did not switch shows that window's visible tab. The
sheet's B1-before-every-script rule provides this, and I agree with the builder's argument (§3). I note
the dependency so that the live driver does not skip a B1.

### NIT-6 (info): the builder contacted the live bridge once during its own dry run (disclosed)
Builder §4 discloses one read-only contact (`listTabs`, exit 2). The bug behind it was
`isInside(root, root)`, and it is fixed. I re-checked the fix without connecting (check 2).

## Checks

**1. Rename.** Pass.
```
grep -nE '(^|[`; ])R +recipes/|function R ' S6-wave-sheet.md docs/e2e-test-plan.md recipes/README.md | wc -l  → 0
grep -o 'Rcp ' S6-wave-sheet.md | wc -l → 25          grep -c 'Rcp ' docs/e2e-test-plan.md → 1
git diff -U0 docs/e2e-test-plan.md | grep -c '^-[^-]' → 0   (additions only)
sheet: 22 removed lines; every one is the R→Rcp rewrite of a line in the additions, except one, which is
  re-flowed around the inserted dated note ("…never retried. *(2026-10-23: … #98 …)* Exit `1` is a result:"),
  with its original words kept.
```
The dated note under the set-up block is present ("renamed `Rcp` because PowerShell 5.1's built-in alias
`R` (Invoke-History) shadows it"). No pre-existing row's expected text or pass rule changed.

**2. REP-0 against #97.** Pass, except MAJOR-1 and MINOR-2. From the `git diff recipes/s6.ts` read:
- The probe is a background fixture tab `?s6=rep0`, refused unless inactive and in the human tab's window
  (`row.windowId !== human.windowId`).
- It refuses unless the current tab is `urlOf("s6-human")` and unheld. The bars must read human `visible`
  and probe `hidden`.
- `VISLOG_INSTALL` and `VISLOG_READ` run on **both** tabs around the report and control B, using
  `performance.timeOrigin + performance.now()`.
- The hue is read by `t5-png describeBar` (the Run 9 rule). The import does not run t5-png's CLI: it is
  guarded by `process.argv[1]` matching `t5-png.ts`.
- Control B is an explicit default-mode `probe.screenshot()` under the same rule. Control A is the
  human-tab capture.
- PASS needs a probe `visible` change in [t0−50, t1+50] **and** a magenta PNG. FAIL exits 1, NOT
  DISCRIMINATING exits 3, set-up exits 2.
- The report PNG is read, then `rmSync`. Control images stay as Buffers. `rep0Cleanup` empties and
  removes the run directory.
- The report captures in switch mode (`sdk/src/error.ts` `opts.call("screenshot", {tab})`), and
  `failuresDir` honours `BRIDGE_FAILURES_DIR`, which is set in PRECHECKS before `connect()`.
- The untrusted `click` sends no `focusTab` (`sdk/src/tab.ts:167` does so only when trusted and under
  `focusFirst`).
- Only the probe is closed.

The set-up check, as `s6.ts` computes it (scratch `inside.ts`, `REPO` derived the same way):
```
REPO\                       refused true      REPO\recipes      refused true
c:/users/…/chrome-remote-extention refused true  REPO\exports   refused true
%TEMP%\bridge-e2e\s6-run2   refused false     C:\Users\aliev\Projects  refused false
```

**3. Verdict dry run (my own inputs; scratch `rep0-dry.ts`).** The check discriminates.
```
good → PASS
no visible event → FAIL | … the capture did not switch
visible only 200 ms before t0 → FAIL (… at -200 ms, outside [0, 1550] ms ± 50 ms)
visible 60 ms after t1 → FAIL        visible 40 ms after t1 (inside slack) → PASS
start entry 'visible' only (no change) → NOT DISCRIMINATING (not hidden) ; also: never went visible
cyan PNG with visible event → FAIL (… the human's tab, not the failed one)     mixed PNG → FAIL
no screenshotPath → FAIL    screenshot attachError → FAIL    PNG not read → FAIL    code TIMEOUT → FAIL
network attachError only → PASS (by design: not a screenshot error)
fast 190 ms report, no switch, cyan → FAIL (both reasons)
control errored / control no visible / control cyan / human other / human errored /
probe not hidden at install / failing control + failing probe → NOT DISCRIMINATING (probe reasons as "also:")
```
**Could it PASS when the capture did not switch?** No. The probe shares the human tab's window, so a
capture without a switch shows that window's active tab. That tab carries the cyan bar, so a magenta PNG
requires the probe to have been the active tab. A `visible` change inside the call window is also
required, and the only thing in the call that activates a tab is the capture's switch. The click is
untrusted, so there is no `focusTab`. Discrimination is limited only by MAJOR-1: a control that fails
gives NOT DISCRIMINATING, never a false PASS.

**4. The gate list.** Pass. Failure reports come only from a `Tab` method with reports on, or from the
MCP's `attempt`→`failureReport` (`mcp/src/tools/registry.ts:216-245`, any handle, attach codes only,
`isAttachCode` = the 7 `ATTACH_CODES` in `sdk/src/error.ts:66-74`). Row by row:
- **No reports possible:**
  - `t5.ts` uses raw `client.call` only (`newTab` at t5.ts:133-134; no `Tab` method call).
  - `hello.ts` makes raw calls only.
  - `s6.ts sm1` uses `client.claim` and then only `client.call("snapshot", …)`, `client.status()` and
    events.
  - `boot-bb.ts:41` and `export-grades.ts:106` connect with `failureReports: false` (SDK-6 and the SDK-7
    SDK leg).
  - `close-bb-tab`: `connect({ name: who, ...(command === "close-bb-tab" ? { failureReports: false } : {}) })`.
    Its only `Tab` call is `claim(handle)` then `tab.close()`.
  - `bb-login.ps1` is UI only, with no bridge client.
- **Reports possible, fixture only:**
  - SDK-1 (`sdk-login.ts:29`, reports on) and SM-0 (`tab.snapshot()` on `?s6=sm0`).
  - Every actor prompt in the sheet's prompt table (lines 255-289) targets `localhost:8080` fixture tabs
    or the session's fixture cursor.
- **Non-fixture targets, all gated:**
  - P-TAB3 (`https://example.com`).
  - P-SDK7-M (the Blackboard course tab).
  - P-REP1 (by design).

  The gate holds exactly these three, with S6.3's byte-compare going with the MCP leg. I found no other
  row that needs it (NIT-5 records the B1 dependency).

**5. "Resumed run" section.** Pass.
- Steps 0–7 are not redone. Part 2 starts at R-a with a new `S6_OUT`, and R-a adds the `git log --stat
  23b878f..HEAD -- extension daemon mcp sdk shared` → nothing check (anything there ⇒ STOP).
- R-b: the stale check is the first recorded result line of Part 2. The reload runs only on `STALE` (exit
  0, else STOP), and a second `STALE`, `FAILED` or `UNEXPECTED` ⇒ STOP.
- R-c checks the daemon build and R-d the driver window.
- R-e runs REP-0 under the failures-folder rule, before step 8 (SDK-1) and so before every gated row
  (step 12 and the Blackboard section).
- SDK-1 is rerun whole with a fresh actor SA.
- The denial rule is there: record verbatim, stop that line, never retry or route around.
- The #98 note is there and cited, with dated pointers at both "one restart" sentences (the originals
  kept).
- Part 2 is appended under `## Part 2 — resumed run …`, and Part 1's lines stay as they are.

**6. Full suite in a clean worktree** (`git worktree add <scratchpad>/s6r2-verify HEAD`, with the 8
changed or new files copied in):
```
npm ci exit 0
Test Files  83 passed (83)
     Tests  1668 passed (1668)            (= 1654 + 14; git diff of the test file: 14 added it()/test())
npm run typecheck → exit 0
npx tsc --noEmit -p recipes/tsconfig.s6.json → exit 0
git worktree remove --force → left an undeletable node_modules; rm -rf + git worktree prune;
git worktree list → only the main tree
```

**7. Hygiene.** Pass.
```
token (bridge.token value) in git diff + S6-builder-r2.md: 0
blackboard-ultra skill course ids (17 distinct, _1_1 excluded): 0 hits
other _N_N matches: _1_1 (the dry-run stub, ×11) and one numeric literal (9_999_999-shaped in a test)
git status --untracked-files=all | grep -iE '\.png|exports/' → 0
```

## For the step agent
1. Fix MAJOR-1 before committing REP-0's expected text, and pick the human colour from a measured default
   capture.
2. Consider fixing MINOR-2 and MINOR-3 in the same pass.
3. Then send it to a short re-verify of the colour change and the 14 or more tests.

## Re-check r1 (after S6 fixer 2): PASS

Same rules as before: no live contact, no commit, no edits to the files under review. Only MAJOR-1,
MINOR-2 and MINOR-3 were re-checked.

- **MAJOR-1: fixed.** `recipes/s6-rules.ts:312` has `REP0_HUMAN_COLOUR = "blue"`. `s6.ts` paints the
  human bar with `barExpression(COLOURS[REP0_HUMAN_COLOUR], …)` and prints the colour from that constant.
  - The §4.19 row says `→ blue (hue rule) (expected blue` and `control A did not read blue`. It carries a
    dated disclosure ("the human tab's colour was cyan, changed to blue because … Run 9 lime → #8fff3d;
    CDP cyan → #97fdfd …").
  - The sheet's row says `control A (human tab blue)`. R-e has the dated note at :130.
  - `rep0Verdict` labels a report PNG in `REP0_HUMAN_COLOUR` as "the human's tab" (:390).
  - My dry run (scratch `rep0-dry.ts`, my own inputs, human control now blue):
    `#ff00ff magenta · #dd00fa magenta · #0000ff blue · #3300f8 blue · #d92424 red · #00ffff cyan ·
    #97fdfd other · #ffffff other`.
  - Good input gives PASS. Every bad case from the first round gives the same verdict as before. A human
    control that reads `cyan` or `other` now gives NOT DISCRIMINATING ("… not blue"). Blue and magenta
    differ in R (0x33 vs 0xdd), so the two bars cannot be confused.
- **MINOR-2: fixed.** The `try` in `rep0` now starts right after `rep0FailuresDir()`. `openFixture` is
  inlined, with `opened = probe` set straight after `client.newTab` returns, before `waitFor`.
  - The `finally` closes `opened` if it was set, then always runs `rep0Cleanup(dir)`.
  - Every path after the probe tab exists is covered: a `waitFor` timeout, a set-up refusal, an `evalJson`
    error, and the verdict.
- **MINOR-3: fixed.** The §4.19 row and the sheet's R-e (:127) both say: "Only a verdict line (`REP-0
  PASS`, `REP-0 FAIL` or `REP-0 NOT DISCRIMINATING`) is a result: a `FAILED — …` line with no such verdict
  line …" (measured nothing, rerun, both recorded).
- **No other row text changed.**
  - `git diff -U0 docs/e2e-test-plan.md | grep -c '^-[^-]'` → 0.
  - The sheet still has 22 removed lines. All are the `R`→`Rcp` rewrite, apart from the same one line
    re-flowed around the #98 note.
- **Commands:**
  - `npx vitest run recipes/` → 4 files, **138 passed** (134 + 4).
  - `npm run typecheck` → exit 0.
  - `npx tsc --noEmit -p recipes/tsconfig.s6.json` → exit 0.
  - The full suite was not re-run: only `recipes/` changed since check 6, which gave 1668, so it should
    now be 1672.

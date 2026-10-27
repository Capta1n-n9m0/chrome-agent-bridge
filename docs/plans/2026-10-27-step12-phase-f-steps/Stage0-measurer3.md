# Step 12 Stage 0 — measurer 3 (a bound for `args` calls: B7-R, B9, B10, B11)

Model / effort: Opus, medium. Chrome: branded 156.0.8078.48 (protocol 1.3, V8 15.6.75.19, `Browser.getVersion` over the
pipe), `--headless=new`, fresh profile. Pass rules: `stage0-m3-passrules.txt` (written before the first run, not edited
after). Setup and clean-up: `stage0-m3-setup.txt`. Source: `stage0-m3-src.txt`. Raw output: `stage0-m3-B.txt`. Every
page-side command went through the probe extension's `chrome.debugger.sendCommand`.

## 1. Verdict

**DONE.** All four questions were answered.
- **B9 (`$_`) fails.** A `chrome.debugger` client gets no command-line API at all.
- **B10 found a bounded form that passes.** `Debugger.enable` runs before the call. At the deadline the extension sends
  `Debugger.pause`, then `Debugger.resume {terminateOnResume: true}`. That ended the (i′) loop in 4 of 4 runs (3 on the plain
  page, 1 on the CSP page). It is proposed below for user review.
- **B11:** a wedged tab recovers only when it navigates to another site or to `about:blank`.

Clean-up was verified.

## 2. Outputs

Files in `docs/plans/2026-10-27-step12-phase-f-steps/`: `Stage0-measurer3.md`, `stage0-m3-passrules.txt`,
`stage0-m3-setup.txt`, `stage0-m3-src.txt`, `stage0-m3-B.txt`. No commit (brief). No product code was touched.

| Fact | Reading (leg, numbers; raw in `stage0-m3-B.txt`) | Against the pass rule |
|---|---|---|
| **B7-R** product-style evaluate on `while(true){}` | 5 of 5 runs answered with the command error `-32603 "Internal error"` in 1004–1013 ms. After each run the session answered (`1+1` → 2, call → 5). Recorded: `isExecutionTerminated` (`extension/src/debugger-errors.ts:99`) does not match "Internal error", so in the product only `raceTimeout`, which fires at the same `timeoutMs`, turns this into TIMEOUT (code reading, not measured). | **PASS** |
| **B9a** `$_` names the thunk | All 4 combinations (objectGroup `"console"` or none on the thunk step × replMode off/on) answer `ReferenceError: $_ is not defined`. Follow-up probe (cli.js): with `includeCommandLineAPI: true`, **every** command-line name (`$_`, `keys`, `$$`, `copy`, `$0`, `queryObjects`, `inspect`) is `undefined`. This holds with and without `Runtime.enable` and with replMode, and a console-group `Runtime.evaluate` or `callFunctionOn` does not set `$_` either. | **FAIL** (4 of 4) |
| **B9b** sync loop | Not reachable, because `$_()` throws within 2 ms. 1 recorded leg; the 3-run rule was not run (§4). | **FAIL** (follows from B9a) |
| **B9c / B9d** value, async | The ReferenceError above, in every leg. | **FAIL** (follows from B9a) |
| **B9e** no global | 987 → 987 own names, 0 added and 0 removed, in every leg (plain, CSP, loop). | PASS |
| **B9f** page cannot see `$_` | The page's interval and tick read `typeof $_ "undefined"` and `"$_" in globalThis false`, 0 of 2–3 entries otherwise. | PASS |
| **B9g** CSP page | Control `evalBlocked "yes"`. The same ReferenceError. | **FAIL** (B9a) |
| B9 shadow (recorded) | When the page defines `window.$_`, `"$_()"` **calls the page's function** and returns `"page-forged"`. A page accessor on `$_` ran once and returned `"page-accessor"`. The thunk's flag read `false` in both cases. Without the page's `$_` the call throws, so the flag is `false` there too. | Detection rule: **FAIL** (no case read `true`) |
| **B10** Debugger route (the candidate) | `Debugger.enable` → the (i′) loop → `Debugger.pause` → `Debugger.paused` (reason `"other"`) in 56–65 ms → `Debugger.resume {terminateOnResume:true}`. The pending `callFunctionOn` answers **`-32000 "Execution was terminated"` 59–66 ms after the pause**, in 3 of 3 runs on the plain page and 1 of 1 on the CSP page. Afterwards: the session answers. A follow-up (i′) call with V returns the sent JSON **exactly**. An async follow-up returns 3. `Debugger.disable` answers. The page's own interval keeps running. Globals 987 → 987. That message matches `isExecutionTerminated`'s regex (code reading). | **ENDS the loop: candidate** (3 of 3, plus the same-session check) |
| B10 other attempts | **(1)** `Debugger.enable` sent only while the loop runs: no reply in 3008 ms. Then `Debugger.pause` gets `-32000 "Debugger agent is not enabled"`. **(2)** `Debugger.pause` without enable: the same text, and then `resume` gets `"Can only perform operation while paused."`. **(3)** A pause, then detach and re-attach: the loop continues (`1+1` no reply). **(4)** A pause, then a plain resume: it continues. **(5)** `Debugger.evaluateOnCallFrame "throw …"` throws only inside that evaluation. A `Runtime.evaluate` while paused answers 2. **(6)** `setSkipAllPauses {skip:true}` also suppresses `Debugger.pause`: no paused event, so no route. **(7)** `setBreakpointsActive {active:false}`: a `debugger;` inside fn does not pause (it returns 7, with 0 paused events), and pause + terminate still ends the loop. **(8)** `Page.crash`: no reply in 3015 ms. The session stays dead and the tab reads `status "unloaded"`. **(9)** `Target.closeTarget` is accepted (`{}`) and closes the tab: the pending call gets "Detached while handling command.". That is a tab close, not a recovery. | (1)–(6), (8): **do not end** it. (7): **ends** it. (9): closes the tab |
| B10 recorded rows | **A loop after an `await`:** paused and terminated, and the session answers, but **the pending `callFunctionOn` never replied** (none in 3000 ms). So the extension's own `raceTimeout` must still bound the call. **A pause while fn is only awaiting** (`new Promise(() => {})`): `Debugger.pause` paused **the next JS to run, a page task**, 522–683 ms later. `Debugger.disable` (or a plain resume) released it, and the page's interval ran on. **Telling the two apart:** the fn object's `[[FunctionLocation]].scriptId` (`Runtime.getProperties`) equals the scriptId of the paused top frame in the loop case. It matches no frame in the idle case. Terminating only on a match ended the loop in the first case and left the page running in the second. | Recorded |
| **B11** recovery of a tab wedged by the (i′) loop | **`chrome.tabs.update` to another site recovers it in 110 and 110 ms; `Page.navigate` to another site in 117 and 117 ms.** The old renderer is gone, the pending call answers `"Inspected target navigated or closed"`, and a fresh session evaluates 2 with the expected href. **`chrome.tabs.update` to the same host, `chrome.tabs.reload` and `Page.navigate` to the same host do not recover it within 15000 ms** (2 of 2 each): the tab stays `loading`, a renderer burns 3.0 s of CPU per 3 s, and the fresh session gives no reply. `chrome.tabs.remove` ended every one (0 hot renderers after the close). Control (no recovery): 1 hot renderer, and 0 after the close. New row: **`chrome.tabs.update` to `about:blank` recovers it in 109 and 110 ms**, and the old renderer is gone. | Other site, `about:blank`: **RECOVER**. Same host, reload: **do not** |

## 3. Verifier verdict

Not applicable (measurer).

## 4. Deviations

- **B9b's three runs and the remaining B9g combinations were not run.** B9a failed in every combination, so `$_()` throws
  before any loop. One loop leg and one CSP combination were run and recorded.
- **B9 shadow leg:** the flag holder is the thunk itself (`th.ran`, read by the thunk's objectId). The pass rule said "returns
  {run}". The first run threw in my own setup ("Object reference chain is too long": a `returnByValue` of `window`) before it
  measured anything. It was re-run on a new host (`b9sh2`) after the fix.
- **B10's first batch is superseded.** A script defect (`startLoop` returned the pending promise, so every leg awaited the
  loop) gave no reading. That run's `pauseDetach` leg also threw in my `exc` helper. The legs were re-run, and pause-detach
  was re-run as `pauseDetach2`. All tabs from both runs were removed.
- **B11 host names:** `pageNavigateCross` and `pageNavigateSame` both started on `b11pagenavigate1/2` (a truncation collision).
  The cross legs' wedged renderers were already "gone" by CPU sample before the same-host legs began, so the readings stand.
  The cross legs' tabs (by then on `<host>x.test`) were not matched by the close script, so 4 were closed afterwards (all
  answered).
- **Not measured:**
  - whether a trusted CDP client gets the command-line API here (raw CDP to a page is outside the method), so whether
    `chrome.debugger` strips it or headless lacks it is open;
  - a windowed tab;
  - the cost of `Debugger.enable` on a page with many scripts (4 `scriptParsed` here, 1–2 ms);
  - `Debugger.enable` while a human's DevTools is open;
  - whether `setBreakpointsActive false` reaches beyond the agent's own session;
  - the product's `send` wrapping of the error text (the regex is unanchored for this alternative).

## 5. Proposed decisions

### 2026-10-27 · An `args` call is bounded by a debugger pause and terminate at the deadline
**Decided:** For `evaluate` with `args` (the (i′) form), the one `withDebugger` session runs these steps in order:
1. `Debugger.enable`, then `Debugger.setBreakpointsActive {active:false}` (a page's or fn's `debugger;` then does not pause).
2. Evaluate the source to a function object.
3. Read its `[[FunctionLocation]].scriptId` with `Runtime.getProperties`.
4. Run the (i′) `callFunctionOn`.
5. At `timeoutMs`, send `Debugger.pause`. If a `Debugger.paused` event arrives within a short wait, check its frames. If one
   of them has the fn's scriptId, send `Debugger.resume {terminateOnResume:true}`. The call then answers "Execution was
   terminated", which already maps to TIMEOUT. If no frame has that scriptId, send a plain `Debugger.resume`.
6. Always send `Debugger.disable` before the detach.

Today's `raceTimeout` stays, because a loop after an `await` is ended but its call never answers (B10). The paused event
carries page frames, so nothing from it is logged (the log-scan invariant).

**Why:** this was measured as ending a synchronous loop in 3 of 3 runs plus 1 on the CSP page. The pause took about 60 ms.
The session stayed usable, the next (i′) call was exact, no global was added, and the page went on running. It builds no
string from `args`. `$_` is not available to `chrome.debugger` (B9), and `terminateExecution` is refused (B7).

**Instead of:**
- **(a)** A documented limit plus a recovery hint. The fallback: "a synchronous infinite loop with `args` hangs the tab;
  navigate it to another site or to `about:blank`, or close it. A reload or a same-site navigation does not end it" (B11).
- **(b)** The phase doc's (ii), a lexical `args` binding, which is still unmeasured.

**Revisit if:**
- a `Debugger.enable` on a heavy page costs too much, or disturbs a human's DevTools session (not measured);
- the live row on a windowed tab differs;
- the user prefers (a) because it is simpler.

**By:** Claude (proposed, contract-level: it changes what the safety-relevant debugger session does; for user review)

### 2026-10-27 · Recovery advice for a wedged tab names a cross-site navigation, never a reload
**Decided:** Wherever the docs or a tool description tell an agent how to free a tab stuck in page script, they say: navigate
to `about:blank` or to another site, or close the tab. **Why:** B11 measured that `about:blank` and a cross-site navigation
recover the tab in about 110 ms, while a reload or a same-host navigation does not recover it within 15 s. **Instead of:** "reload the tab".
**Revisit if:** a windowed or same-process case differs. **By:** Claude (proposed)

## 6. Findings

- **B9's pass rule failed.** The command-line API (`$_` and every other name) is absent for a `chrome.debugger` client on
  Chrome 156, with `includeCommandLineAPI: true`. A page that defines its own `$_` is called instead (`stage0-m3-B.txt`, B9
  rows, 2026-10-27).
- **New runtime fact for `extension/CLAUDE.md` (measured 2026-10-27, Chrome 156, headless):**
  - Through `chrome.debugger`, `Debugger.enable`, `Debugger.pause` and `Debugger.resume {terminateOnResume:true}` are
    allowed. Together they end a synchronous loop that `Runtime.terminateExecution` cannot reach.
  - `Debugger.enable` must be sent before the loop starts: sent during it, it gets no reply.
  - `setSkipAllPauses` also suppresses `Debugger.pause`.
  - A `Debugger.pause` that finds no running script pauses the page's next task.
- **New runtime fact (B11):** a renderer wedged in a loop is not freed by a reload or a same-host navigation; it is freed by a
  cross-site or `about:blank` navigation, which swaps the process.
- B7-R confirms measurer 1's B7 control reading under a rule that accepts the command-error form: `-32603 "Internal error"`,
  5 of 5 runs.

## 7. Handoff

No processes are left: chrome, node, python and bash with "s12-stage0-m3" in the command line = 0. Fixture server PID 14996
was stopped by PID. Chrome closed by `Browser.close` (exit 0). The scratch root was deleted after a reparse-point check.
Ports 18520–18529 and 9234 are free. Measurer 2's processes were not touched. Nothing needs the user's keyboard.

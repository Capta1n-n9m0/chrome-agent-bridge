# Step 12 S2a — verifier report (`args` for evaluate: the guard, the call form, the bound, the hello feature)

Model / effort: Opus, medium. Commit: none (brief). Read-only on tracked files. Mutants were applied one at a time in the
main tree and each file was restored from a copy saved first; the restore was checked by `cmp` against that copy for all
13 slice files (no `DIFF` line), and `git status --short` matches the start state. The extra untracked
`recipes/s12-rules.ts` and `recipes/test/s12-helpers.test.ts` belong to S1-helpers-a, not to this slice. Layer followed:
the phase doc's Stage 0 note and #330–#332 over 0.4 (`agent-rules.md` §4).

## 1. Verdict

**PASS-with-notes.** Every exit criterion in the brief is met, and every required mutant (a)–(f) turns at least one test
red. The findings are MINOR and NIT only.

The size is a separate **process item for the step agent**. The slice is 1083 lines against a cap of 450, and §7 gives
no acceptance route beyond 1.5 times the cap (675). It is not a defect in the work (§4 below).

## 2. Outputs (commands run by me)

- **Before count:** taken in a scratch worktree at `HEAD` `3008f55` (S1-sheet, docs only, after the brief's
  `2286036`), with its own `npm ci` and no junction. `npx vitest run` gave `Test Files 191 (190 passed, 1 failed)`,
  `Tests 4665 (4656 passed, 9 failed)`. The 9 failures all sit in `recipes/test/s11-r16-runner.test.ts`
  (`fnText … expected null`, a regex on `\n}\n` over a `.ps1` that the worktree checkout turned into CRLF). They come
  from the checkout, not the code. The count before is therefore **4665 tests / 191 files**.
- **After (main tree):** `Test Files 194 passed (194)`, `Tests 4728 passed (4728)`, so **+63 tests and +3 files**.
  No test was removed. The diff of `log-sentinel.test.ts` is +44/−0. No existing evaluate, save or safety test file
  has a diff (`evaluate-*.test.ts`, `s4-save-*.test.ts`, `safety-*.test.ts` and `s2a-actions.test.ts` are all absent
  from `git diff HEAD --stat -- extension/test shared/test`).
- **Typecheck:** `npx tsc --noEmit -p <pkg>/tsconfig.json` exits 0 for shared, daemon, sdk, mcp and extension.
  `npm run typecheck` exits 0. All seven `recipes/tsconfig*.json` exit 0.
- **Build:** `npm run build` printed `built extension → dist/` and exited 0. `git status --short` afterwards shows no
  new tracked change.
- **New tests fail on the old code:** I copied the five new or edited test files and the engine helper into the
  worktree at HEAD and ran them. `s12-args-call` and `s12-args-cdp` fail at import (no `evaluate/call.js`).
  `protocol-step12` fails 22 of 23: the one that passes is "valid and absent", a control that the old `isHello`
  accepts. The new `log-sentinel` test fails, and both edited `tab-events` hello tests fail.
- **Gate surface is untouched:** `git diff HEAD --stat` is empty for `extension/src/safety*.ts`, `router.ts`,
  `daemon/`, `shared/src/codes.ts`, `extension/src/errors.ts`, `extension/test/log-allowlist.ts` and `manifest.json`.
- **Size, re-counted** (`git diff --numstat` plus `wc -l`):
  - Code: client.ts +8, debugger.ts +111/−23, save.ts +11/−2, evaluate-save.ts +9/−3, evaluate.ts +26/−5,
    protocol.ts +88, and the new call.ts 146. That is **399 added** (365 net).
  - Tests: log-sentinel +44, tab-events +4/−4, protocol-step12 90, s12-args-call 214, s12-args-cdp 254,
    s12-engine-cdp 78. That is **684**.
  - **Total 1083**, the same as the builder's figures. The cap is 450, so 1.5 times is 675. Stage0.md §6 estimated
    ~170 code and ~250 tests.

### Mutants (runner `…/scratchpad/mutants.mjs`, log `…/scratchpad/mutants.log`)

The tests run for each mutant were the five new or edited files. For `e*` I also ran the old evaluate, save and safety
files (667 tests), and for e2/e3 the full suite.

| Mutant | Result |
|---|---|
| (a) `args` string-built into the source expression | **red**, 10 (the six-steps test plus every round-trip row) |
| (a2) `args` built into the wrapper's `functionDeclaration` | **red**, 1 (`six steps`). With the engine CDP it **hung** vitest: the deadline test's override keys on `CALL_WRAPPER_SRC`, so the `while(true)` ran for real. I killed my own vitest PID tree and re-ran with `s12-args-call` only. |
| (b) terminate on any paused frame | **red**, 2 (plain-resume, no-location) |
| (c1) `Debugger.disable` only on success | **red**, 11 |
| (c2) disable skipped on the deadline path only | **red**, 5 |
| (c3) disable skipped on the not-a-function path | **red**, 1 |
| (d1) the size refusal echoes the JSON | **red**, 4 |
| (d2) the function refusal echoes `String(v)` | **red**, 1 |
| (d3) not-a-function echoes the value | **red**, 2 |
| (e1) without `args`, `asRef` loses the mark (the runner refactor) | **red**, 10 in `evaluate-asref.test.ts` |
| (e2) `serializerCall` gains `userGesture` (changes a no-args command) | **survives the full suite** (4728 passed); see F3 |
| (e3) `collectSaveText` drops its `evalRace` | **red** in the full suite only (`s1-own-refusals.test.ts` R.1, raceTimeout's TIMEOUT) |
| (e4) `p.args == null` (null is treated as absent) | **red**, 1 (null top-level) |
| (f) hello `features` dropped | **red**, 3 |
| (f2) `isHello` stops checking `features` | **red**, 1 |
| (g) `userGesture` dropped on the wrapper call | **red**, 1 |
| (h) `waitPaused` not filtered by tabId | **survives** (81 passed); see F1 |
| (i) the `onEvent` listener is never removed | **red**, 1 |
| (j) no parentheses around the source | **red**, 3 |
| (k) breakpoints left active | **red**, 6 |
| (l) `exceptionDetails` not checked on the source step | **red**, 1 |

## 3. Exit criteria

- **B2.1 (as rewritten, audit §5):** met.
  - `expectOnlyInWrapperArg` (`s12-args-cdp.test.ts:76-85`) asserts the wrapper call is the only one carrying the
    value, as `arguments[1].value`, and that no `expression` or `functionDeclaration` holds the sentinel.
  - The round-trip rows cover nested, Unicode, numbers, null in properties, arrays and key order (`:88-102`), plus
    null top-level (`:104`), `{args, asRef}` (`:126`) and `{args, saveTo}` (`:135`).
  - The refusals (undefined, function, BigInt, cycle, > 1 MiB) go through both handlers with attach 0 and send 0
    (`:159-179`). The full table is in `protocol-step12.test.ts`.
  - The live half ("no page global `args`") is R19-ARGS (S7), as the rewrite says. The fake test proves only that the
    parentheses add no global (mutant j is red).
- **B2.2:** met. The test (`s12-args-cdp.test.ts:218-253`) uses the real `GatedRouter` and `CallSafety` with
  JavaScript off. `evaluate {args}`, `{args, asRef}` and `evaluateSaveStart {args}` all answer exactly
  `{JS_DISABLED, JS_DISABLED_MESSAGE}` with attach, detach and send all 0. A control with JavaScript on attaches once.
- **Pause-terminate bound:** met.
  - `stopAtDeadline` (`call.ts:94-102`) terminates only when a frame's scriptId is the function's own; otherwise it
    sends a plain resume; with no paused event it sends nothing.
  - `Debugger.disable` sits in a `finally` (`call.ts:143-145`).
  - Mutants b, c1, c2, c3 and k are red.
  - The listener is installed before `Debugger.pause` is sent (`call.ts:96-97`), so the paused event cannot be missed.
- **Hello `features` in the shared guard:** met (`protocol.ts:186`; mutants f and f2 are red). Today's daemon parses
  the hello only through `isHello` (`daemon/src/handshake.ts:28`), which ignores unknown keys, so no STOP.
- **Logs:** `log-allowlist.ts` is unchanged and log-scan passes, so log sites are +0. The new sentinel test puts the
  sentinel in `args` and in the paused frame. It asserts 0 occurrences and that the capture is live
  (`log-sentinel.test.ts:626-668`).
- **§ Every stage:** met (§2).

## 4. Findings

**F1 · MINOR · `extension/test/s12-args-cdp.test.ts:192` — the tabId filter is not tested in a way that can fail.**
Mutant h (remove `source.tabId === tabId &&`, `debugger.ts:248`) leaves all 81 tests green. The other-tab event carries
the same `FN_SCRIPT` frame, so accepting it still terminates, and the outcome does not change. *Fix:* give the tab-99
event a different frame (`scriptId: "other"`), or send only the tab-99 event and expect no resume. Either way the test
then turns red when the filter is gone.

**F2 · MINOR (design-local) · `extension/src/evaluate/call.ts:48` — `(source\n)` refuses a trailing semicolon.**
I checked the forms in node (`(0,eval)(\`(${s}\n)\`)`):
- These all evaluate to a function: arrow, `async` arrow, `function (a){…}`, named `async function f`, a leading
  `/* */`, a trailing `// …`, and trailing newlines. A named declaration leaks no global (`typeof globalThis.f` is
  undefined).
- `"(a) => a.n;"` throws **SyntaxError**. The measured bare form (m1 run 5) would have accepted it.
- A crafted source can close the parenthesis: `0), (globalThis.__esc = 1), ((a) => a.n` evaluates to a function and
  runs its side effect at the source step.

Why the escape does not matter for safety: it is the agent's own code, under the same class `evaluate` gate check and
the same JS switch as a plain evaluate. `args` is not in that evaluate. CDP's `timeout` bounds that step. So it is not a
security finding. *Fix (S2b):* the tool description and the SDK doc say "a function source, no trailing `;`". Or the
extension strips one trailing `;` and whitespace before wrapping (a contract-adjacent choice, so record it).

**F3 · NIT (gap from before this slice) · `extension/src/debugger.ts:221-240` — no test pins the serialiser's
`callFunctionOn` params.** Mutant e2 survives the whole suite. "Byte for byte without `args`" therefore rests on
reading the code. I read it: the diff of `serializerCall` is a verbatim move of the old inline `callFn`, and
`collectSaveText` still sends the same `Runtime.evaluate` under `evalRace` (e3 is red in the full suite). *Fix
(optional, test-only):* one assertion on the serialiser call's exact params in a no-args evaluate test.

**F4 · NIT · `call.ts:123` — the extra `Runtime.evaluate "globalThis"` has no `timeout` and can be interfered with by
the page.**
- A page that sets `globalThis = 1` makes every `args` call answer INTERNAL `args: the page's global object could not
  be read`.
- A page that defines a `globalThis` getter that loops wedges the tab at a step the pause-terminate does not cover.
  Only the race ends the call.

It has no effect on the page's globals, and it matches the measured form (m1 run 5), so it is not a regression. *Fix
(optional):* run the wrapper with `objectId: fnId` (the function itself as `this`; the wrapper ignores `this`). That
drops the step. Or add `timeout` to it.

**F5 · MINOR (carry-forward) — the daemon.log leg of the `args` sentinel is missing.** Phase doc 0.10 says
`log-sentinel.test.ts` "asserts 0 occurrences in `daemon.log`". The new test captures the extension's console only.
The S4.5 sentinel (`log-sentinel.test.ts:386`) shows the daemon-leg pattern. The daemon is S2b's lane, so S2b's brief
should carry it.

**F6 · MINOR (carry-forward) — no e2e rows for the new `chrome.*` glue.** That glue is `waitPaused`,
`evaluateFunctionInPage` and `evaluateFunctionToSave` (`agent-rules.md` §6 Builder). The builder defers them to S7's
R19-ARGS. The phase doc's S2 list has "§4.27 placeholder rows", but Stage0.md §6's S2b row does not name them. *Fix:* the
S2b brief or the S7 sheet names rows for:
- the live pause-terminate of a `while(true)`;
- the plain resume when the function awaits forever;
- no page global after a call;
- a CSP page.

**F7 · NIT — the size, and which test lines could be trimmed** (asked by the brief; nothing trimmed). Lines that
duplicate another test without losing an exit-check row:
- `s12-args-call.test.ts:203-214` (12 lines): `helloFrame` sends features. It duplicates the four edited
  `tab-events.test.ts` assertions; mutant f is red in both.
- `protocol-step12.test.ts:87-89` (3 lines): a test of a constant.
- `s12-args-cdp.test.ts:109-114` (6 lines): "an object returned whole". It overlaps the "key order kept" row.
- `log-sentinel.test.ts:651-652` (2 lines): the oversize and function refusals. They throw before the handler's only
  log site, so they cannot reach a log line.

That is about 23 lines in all. With them the slice is still about 1060, well above 675. The size comes from honest
coverage of the six steps, every disable path and two CDP fakes, not from padding. The way §7 offers is a split: for
example, commit the code with `protocol-step12`, `s12-args-call` and the hello edits as S2a, and `s12-args-cdp`,
`s12-engine-cdp` and the sentinel as S2a-tests. Or a recorded decision (#320 / #339 "Revisit if: a slice reports
DONE-PARTIAL at its new cap"). This is the step agent's call. I do not grade it on the code.

## 5. The design questions the brief asked

1. **The parenthesised source:** keeps async, arrow, `function` and comments; refuses a trailing `;` (F2). The escape
   is possible but is the agent's own code under the same gate, with `args` not in it (F2).
2. **`exceptionDetails` before `result`:** yes on the source step (`call.ts:117`; mutant l is red). On the call reply it
   is checked by `shapeEvaluateResult` (`result.ts:122`) and by `collectSaveFromRaw` (`save.ts`, the first line after
   the raw value). The terminated text maps to TIMEOUT in both forms (`s12-args-cdp.test.ts:209-215`).
3. **`userGesture: true`** is on the wrapper call (`call.ts:134`; mutant g is red), as m1 B8 measured and audit F11
   asked. It is also on the source step, which is harmless.
4. **The listener:**
   - It is added at the deadline only and removed on both outcomes (`debugger.ts:244-259`; mutant i is red).
   - It is filtered by tabId, but that filter is untested (F1). It is not filtered by session; none is needed, because
     `extension/src` has no `setAutoAttach` or `sessionId` and Chrome allows one attach per tab per extension.
   - It is the only `chrome.debugger.onEvent` listener in `extension/src`, so `Debugger.enable`'s `scriptParsed` events
     go nowhere.
   - Of the paused event, only the scriptIds are compared: `stopAtDeadline` returns void, and the sentinel in the
     frame's `url` is absent from the logs.
5. **`globalThis` by `Runtime.evaluate`:** adds no global (it is a read). The page can interfere with it (F4).
6. **The four edited `tab-events.test.ts` assertions:** allowed in my reading. It is not an evaluate, save or safety
   test, no test is removed, and the change is the hello field that #332 requires. The rule against "an existing tool
   answering differently" concerns tools, not this frame. The step agent should list the file under "edited, not
   removed" in the stage report.
7. **The gate covers `args` the same way:** no safety, router, daemon or code file changed. `args` stays class
   `evaluate`, with no new method or code. The only new messages are the guard's texts and an INTERNAL text that holds
   no value; no existing message changed. The guard runs after the gate's check on receipt and before the tab read
   (`handlers/evaluate.ts:35`). The handler's one log line still logs only `expression.length` (`:39`).
8. **Size:** §2 and F7.

## 6. Proposed decisions

None of my own. On the builder's three: the refusal set is sound (d1/d2/d3 are red). The 500 ms bounds keep the stop
path at about 2 s or less, inside the daemon's +5 s. The parentheses decision should add "no trailing `;`" (F2).

## 7. Handoff

- No processes are left. Mutant a2's hung vitest tree (my own, PID 17928) was killed with `taskkill /T`. No port was
  used beyond port 0, and no Chrome was touched.
- The scratch worktree is unregistered (`git worktree list` shows main only). Leftover files may remain under
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\3933cbe1-90a7-4fc5-83a1-3e97601ffc62\scratchpad\wt`
  (its own `node_modules`, no junction).
- Evidence is in that scratchpad: `mutants.log`, `mutants-round1.log`, `main-test.log`, `wt-test.log`, `tsc.log`.
- For the next stages: F1 (test-only) can be fixed now. F2's doc sentence, F5 and F6 go into S2b's or S7's brief. F7
  needs the step agent's split-or-record call.

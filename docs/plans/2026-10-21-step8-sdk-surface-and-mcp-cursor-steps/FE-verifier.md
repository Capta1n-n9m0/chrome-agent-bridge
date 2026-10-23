# FE — verifier report (build part: focus emulation for trusted input), 2026-10-23

Independent verifier of stage FE's build part (Opus 5.5). Audited the builder's claims
(`FE-builder.md`) against the code, kickoff §7 FE, the phase doc's Stage FE and exit checks FE.1–FE.4
(with the *Ruled* notes and the *Stricter* F19/F20 clauses), decisions #71, #78, #84, #85 item 3, and
`stage0-audit.md` F1/F3/F4/F19/§8. Nothing touched Chrome, the extension, a daemon or a `connect()`. I did
not build in the main tree or edit any file there except this one.

**Method.** I made a clean worktree at `637a808` (`git worktree add …/scratchpad/fe-verify HEAD`), ran
`npm ci` and measured the baseline there. I then re-recorded the fixture on the original code
with **my own** recorder (its own `vi.mock`s and `chrome.debugger` stub, not `fe-harness.ts`). Next I
applied only FE's files: `git diff -- extension/src/debugger.ts extension/src/handlers/actions.ts
docs/e2e-test-plan.md | git -C <wt> apply`, plus copies of the 10 new files. With FE's files in
place I ran every check, and I took the mutation and revert runs in that same tree. Last, I
removed the worktree (`git worktree remove --force`; Windows left the directory behind, so I
deleted it with `rm -rf`; `git worktree list` now shows only the main tree). While I worked, S1
committed `e9e5e8c` and `682f73d`. Neither touches an FE file (`git diff --name-only 637a808
HEAD` has no debugger/actions/e2e/recipes/keys paths), and FE's two test files still pass in the
current main tree: `Test Files 2 passed`, `Tests 50 passed`.

## Counts

| | Test files | Tests | Command |
|---|---|---|---|
| Baseline (worktree at 637a808, before applying) | 60 | 1008 | `npx vitest run` → `Test Files 60 passed (60)`, `Tests 1008 passed (1008)` |
| After (FE's files applied) | 62 | 1058 | `npm test` → `Test Files 62 passed (62)`, `Tests 1058 passed (1058)` |
| Delta | +2 | +50 | = FE's new tests: `trusted-input.test.ts` 12, `fe-actions.test.ts` 38 (as claimed) |

Other checks, all with FE's files applied: `npm run typecheck` → exit 0. `npm run build` → exit 0
(`built extension → dist/`; `grep -c "^import\|^export" extension/dist/content.js` → 0;
`setFocusEmulationEnabled` appears in `dist/sw.js` 2×). `npx tsc --noEmit -p recipes` → exit 0.
`npx tsc --noEmit -p recipes/tsconfig.fe.json` → exit 0. `npx tsx recipes/fe.ts selftest` → exit 0,
`SELFTEST PASS — 72/72 checks as expected`.

## Exit checks

- **FE.1 — PASS.** 1058 ≥ 1008 + 50; typecheck green (above).
- **FE.2 — PASS.**
  - *The fixture is today's list.* My independent recorder (`scratchpad/zz-verify-record.test.ts`)
    drove the **original** handlers at 637a808 (before applying FE) through the six cases. All 6
    logs (pageTab, ensureContent, page calls with args, attach with `"1.3"`, each `sendCommand`
    with its params, detach) and all 6 results or errors deep-equal `fe-cdp-baseline.json`, case by
    case: `Tests 6 passed (6)`. The fixture's sha256 is `6881c15a…4923` and its `baseCommit` is
    `637a808…`, as the report says.
  - *The no-option path after the change.* The same recorder on the changed code, run with no
    option and with `focusEmulation` set to `false`, `"yes"`, `1` and `"true"`: `Tests 30 passed (30)`
    (6 cases × 5 variants, whole log equal). With `{focusEmulation:true}` the same comparison gives
    `6 failed`, so the comparison discriminates.
  - *The builder is pure and tested.* `trustedInputSteps` (`extension/src/trusted-input.ts:38`)
    makes no `chrome.*` call; it calls only the pure `keyEventParams`. Its 12 tests compare it
    with the fixture's `sendCommand` entries.
  - *The runner's error path.* `fe-actions.test.ts` asserts `attach, enable,
    Input.dispatchMouseEvent:mousePressed, disable, detach` with the fixture's `DEBUGGER_CANCELLED`
    error, and the same shape for type and pressKey. A failing disable after a failing input
    leaves the input's `DEBUGGER_DEVTOOLS` error in place.
- **FE.3 (with F20, read per #84) — PASS.**
  - `grep -rnE "windows\.update|focused\s*:" extension/src/debugger.ts; echo "exit $?"` → no
    output, `exit 1`. At 637a808: no output, `exit 1`.
  - `grep -rnE "windows\.update|tabs\.update|focused\s*:|focusTab|active\s*:\s*true"` over
    `debugger.ts`, `handlers/actions.ts` and `trusted-input.ts` → no output, `exit 1`. At 637a808
    (`git show 637a808:<path> | grep -nE …`): `debugger.ts` exit 1, `actions.ts` exit 1, and
    `trusted-input.ts` did not exist (`git cat-file -e` → 128). Same lines (none).
  - By reading: the option path calls only `chrome.debugger.{attach,sendCommand,detach}` and
    `callInPage(focusForTyping)`. It calls no `focusTab`, no `windows.*` and no `tabs.*`. The
    tests' spies on `windows.update`/`tabs.update` confirm it, and so does my probe, whose stub
    logs `WINDOWS.UPDATE`/`TABS.UPDATE`: neither appeared.
- **FE.4 (precondition: the rows are written and sound before the commit) — PASS, with notes.**
  §4.17 and the wave sheet meet #78 clause by clause (item 7 below). The table and the precedence
  are copied verbatim. `diff` of kickoff §7's table bullets against §4.17's is identical, and the
  precedence paragraph matches #78 (2). Findings 2–4 are open points to settle before the rows
  are committed. FE.4 itself (committed before the build is loaded) is the live part's to check.

## Attacks on the CDP sequence (items 3, 5, 6)

All claims below were checked with a probe test (`scratchpad/zz-probe.test.ts`) on the new code and on
the original:

| Case (new code) | Log | Result |
|---|---|---|
| type, option, `"a.\n"`+submit (test) | attach, enable, page:focusForTyping, a/a, ./., Enter/Enter ×2, disable, detach | `{ok:true, focusEmulation:"on"}` |
| enable throws (DevTools wording) | pageTab, attach, enable, **disable**, detach | `DEBUGGER_DEVTOOLS`; no input sent; no warning |
| enable and disable throw ("wasn't found") | pageTab, attach, enable, disable, detach | `DEBUGGER_ATTACH … 'Emulation.setFocusEmulationEnabled' wasn't found` |
| focus step throws a plain Error (option) | …, attach, enable, page:focusForTyping, disable, detach | the page's error unchanged (no code), as the original surfaced it before attaching |
| `focusEmulation: "yes"` / `1` | pageTab, attach, Tab down/up, detach | `{ok:true}`, today's path |
| click content-path success with the option | pageTab, ensureContent, page:click | `{ok:true}`, with no `"on"` |
| click/type escalation with the option (tests) | …, page:click/type, …, attach, enable, …, disable, detach | `"on"` |

Emulation is never left on. Once the enable is sent, the disable is always sent from the
`finally` (`debugger.ts:95-104`), and the session always detaches. A disable that itself fails
is warned and not thrown. The code relies on detach to clear emulation (stage0-audit §8,
unconfirmed for Chrome 156), and the builder's proposed decision says so.

**Mutations.** I applied each mutation to the copies in the worktree and ran
`fe-actions.test.ts` + `trusted-input.test.ts`:

| Mutation | Result |
|---|---|
| none (as built) | `50 passed` |
| empty cleanup list (no disable at all) | `11 failed` |
| disable only on success (not in a `finally`) | `5 failed` (the runner's error-path tests) |
| type's focus always before attach | `5 failed` |
| focus before enable in the builder | `5 failed` |
| always return "on" | `20 failed` |
| `!!p.focusEmulation` instead of `=== true` | `12 failed` |
| a disable error masks the input error (rethrow) | `2 failed` |

My first tries at the first two mutations were no-ops: a sed expression that left the code
unchanged, and a CRLF mismatch. I redid both; the table shows the redone runs.

**Revert (item 5).** I put the original `debugger.ts`/`actions.ts` back, deleted
`trusted-input.ts` and kept the tests:
- `trusted-input.test.ts` fails to load (`Failed to load url ../src/trusted-input.js`), so its 12
  tests cannot run.
- `fe-actions.test.ts` gives `11 failed` (every option case and every runner case). Its 27
  no-regression tests pass, as they should.
- With only the helper put back: `11 failed | 39 passed (50)`.

These match the builder's numbers.

**CLAUDE.md invariants (item 6).**
- The only new log line is `console.warn("[bridge] focus emulation: disable failed; detach clears
  it:", describeDebuggerError(err).code)` (`debugger.ts:101`). It logs a code only. A test asserts
  the exact arguments.
- No URL, title, body or token is logged.
- `chrome.debugger` use is unchanged: one `withDebugger` per input, `PROTOCOL "1.3"`.
- Input errors still go through `withDebugger` → `describeDebuggerError`: the fixture case gives
  `DEBUGGER_CANCELLED`, and the probe gives `DEBUGGER_DEVTOOLS` and `DEBUGGER_ATTACH`.
- The content script and `inject.ts` are untouched by FE.

## Rows (item 7)

Checked against #78:
- **FE-0** is the stale check. FAIL is "stop, reload, re-check, not an outcome". The verdict
  STOPs unless the **last** FE-0 passes and comes before every trial. The wave sheet escalates a
  second FAIL, which is stricter.
- **FE-5** runs first and last, three trials per kind per phase. "Received" means status ≠
  `status: idle` or a non-empty field. Any trial voids the comparison. Note that the fixture's
  document-level `mousedown` listener (`e2e-playground.html:177`) sets `status: hit at …`, so a
  bare mousedown also counts as received. That is the broader, conservative reading.
- **Positive control.** One default-mode screenshot while the human's-tab logger runs, judged on
  hidden → visible. If it fails, the run stops and escalates (the builder's choice; #78 leaves
  this open; conservative).
- **FE-1/FE-2** copy BG-1/BG-2's PASS rules (`e2e-test-plan.md:679-680`) and add the option:
  `focusEmulation:"on"`, the exact status (and the value for FE-2), the target `hidden` read
  after the call, the human's tab not hidden, the after-state.
- **Each trial** uses a fresh `newTab {active:false}`, closed after it.
  `VISLOG_INSTALL` restarts the log (`t5-lib.ts:138`), so FE-PC's `hidden` cannot leak into an
  FE-1 trial.
- **FE-3** names its focus step (`evaluate el.focus()`) and its key (`ArrowLeft`).
  `keys.ts:29` sends ArrowLeft with no `text`. The fixture's keydown listener
  (`e2e-playground.html:168-170`) sets `status: TRUSTED key = ArrowLeft`, and no `input` event
  follows an arrow key in an empty field, so nothing overwrites it.
- **FE-4** judges only what the human sees, over all FE-1…3 trials. The banner is not a FAIL, and
  the target's visibility is an observation (`targetObservation`).

No rule can never fail, and none can never pass. My own dry runs of `readOutcome` (scratch
`verify-verdicts.ts`, built independently of the selftest's `runOf`):

| Input | Expected | Got |
|---|---|---|
| V1 FE-1 FAIL + FE-2 FAIL + FE-3 PASS + FE-4 PASS | (C) by the precedence | **(C)** click/type focusFirst, pressKey focusEmulation |
| V2 FE-5 receives input (`hit at …`) in one trial of the **last** block only | (B) void | **(B)** FE-5 void |
| V3 FE-4 FAIL (human `hidden` in one trial, before the call), all else passing | (B) | **(B)** FE-4 FAIL |
| V4 a foreground change in the block capture | (B) | **(B)** FE-4 FAIL |
| V5 FE-1 results lack `"on"` though the status is exact | (C) | **(C)** click focusFirst |
| V6 FE-5 first block, field-only change | (B) void | **(B)** |
| V8 every kind fails at least one trial | (B) | **(B)** no kind passes |
| V9 only FE-3 fails one trial | (C), submit stricter | **(C)**, `type {submit}` → focusFirst |
| V10 target `visible` after the call in one FE-2 trial | (C) | **(C)** type focusFirst |
| V7 positive control FAILs, then a re-run passes | STOP (the rule says stop) | **(A)**: see Finding 2 |

`fe.ts` prints no URL or title. It strips `url`/`title` in `lite()` and prints handles, window
ids, status lines and codes only. The one URL it builds is the fixture's (`urlOf(marker)`,
`fe.ts:105`). `fe-win.ps1` prints no window title. The connecting commands compile (tsc above)
and read sensibly. `focusEmulation` reaches the extension because the daemon forwards params
unchanged apart from `tab` (`daemon/src/intercept.ts:360`). The connecting commands have never
run against Chrome.

## Lane (item 8)

The FE files in `git status` are `debugger.ts`, `actions.ts`, `trusted-input.ts`, the
`extension/test/fe-*`/`trusted-input` tests and the fixture, the `recipes/fe*` files,
`docs/e2e-test-plan.md` and the FE-* steps files. Nothing else is FE's: the other changes in the
tree were S1's, now committed.
- `git diff -U0 -- docs/e2e-test-plan.md` has one hunk, `@@ -854,0 +855,96 @@`, with no removed
  lines. All 96 added lines are a new `### 4.17`, placed before `## 5`.
- The `actions.ts` diff changes only the trusted branches, the import, the result type and a
  helper. The content paths are byte-identical.
- No other file still refers to the removed `trustedClick`/`trustedType`/`trustedPressKey`
  (grep), apart from historical plan docs.

## Findings

1. **MINOR — no-option command sequence changes for one error input (the builder's deviation 2).**
   `extension/src/debugger.ts:74` (`trustedInputSteps` builds the whole list before the first
   `send`).
   - Evidence: probe, trusted `type` of `"ab\u{1F600}c"` without the option. The original logs
     `page:focusForTyping, attach, keyDown:a, keyUp:a, keyDown:b, keyUp:b, detach`; the new code
     logs `page:focusForTyping, attach, detach`. Both end in `DEBUGGER_ATTACH [chrome.debugger]
     unsupported key "😀" …`.
   - Scope: only texts holding a character `keyEventParams` rejects, which means a non-BMP
     character. The error is identical, and none of the fixture's six cases is affected.
   - It breaks the letter of "without the param, today's command sequence is unchanged", on an
     error path. It is not silent: the builder disclosed it and proposed a decision. The code
     comment at `debugger.ts:68-69` does not say so.
   - Fix: either the session agent records the proposed decision ("Trusted `type` computes all its
     keystrokes before sending the first"), or the runner builds per character (a generator).
     Either way the ruling comes before the commit, because it touches a pre-registered clause.
2. **MINOR — the verdict reads only the last positive-control record, so a failed control
   followed by a passing re-run yields an outcome.** `recipes/fe-rules.ts:319-326`
   (`[...records].reverse().find(…"POS")`, and the same for `CAP positive`).
   - Evidence: V7 above (POS FAIL, then POS PASS) → `OUTCOME (A)`.
   - §4.17 and the wave sheet (step 6) say a failed positive control means "STOP and escalate"
     with no re-run, so the tool does not enforce the written rule. A procedural slip could turn
     a stopped run into an outcome, a looser reading than the one pre-registered.
   - Fix: `readOutcome` STOPs if **any** POS record fails `positiveVisPass` or any `CAP positive`
     record fails `positiveCapture`. Add a selftest case.
3. **MINOR — rule choices that need a ruling before FE.4's commit** (the builder's proposed
   decisions, `FE-builder.md` "Proposed decisions"):
   - FE-3's PASS adds FE-1's other clauses to "status: TRUSTED key = <key>" (stricter than kickoff
     §7).
   - FE-4 is turned into measurable clauses: any foreground change in the span fails it, whatever
     caused it; no `hidden` since the logger was installed; a failed poll fails the trial; a void
     capture STOPs.
   - FE-3c is added as an observation.
   - "Every recorded trial counts."

   Each choice is stricter or conservative, and none follows a measurement. They do touch
   pre-registered rules (ESCALATION list), so the session agent should record them before
   §4.17 is committed. Location: `docs/e2e-test-plan.md` §4.17 rows FE-3, FE-4, FE-3c; the
   wave sheet's "Re-runs".
4. **NIT — a trial whose evidence reads fail after the call is not recorded.**
   `recipes/fe.ts:216-223`: `record(t)` runs only after `READ_TARGET`, both `VISLOG_READ`s and
   the final `listTabs` succeed. A call that ran but whose reads threw leaves no trial in the
   verdict. The wave sheet only says such output is "listed for the verifier". Fix: record the
   trial with `err: "evidence read failed: …"`, counted as a FAIL for its kind (conservative), or
   state that rule in the sheet.
5. **NIT — a disable is sent after a failed enable** (`debugger.ts:95-104`; log `attach, enable,
   disable, detach`). It is harmless and errs on the safe side (emulation is never left in an
   unknown state), and its error is swallowed without a warning. It is tested. I recommend no
   change: this records the answer to "what happens there".
6. **NIT — the "Item 4 of #78, for S3" bullet in §4.17 paraphrases #78 item 4.** It drops "(it
   cannot see the extension's automatic escalation)" and "(no automatic focus;
   `browser_focus_tab` stays an explicit call)". It is labelled as S3's note, not as part of the
   table. Fix: copy #78 item 4 verbatim.
7. **NIT — `recipes/tsconfig.fe.json` duplicates the shared recipes config** (the builder's
   deviation 1). `npx tsc --noEmit -p recipes` does not check `fe.ts`. The wave sheet's pre-flight
   runs the FE config, so the new files are checked. Fix: at commit, either add `fe.ts` and
   `fe-rules.ts` to `recipes/tsconfig.json`'s include, or keep the extra config.

## Verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding. FE.1, FE.2 and FE.3 pass, and FE.4's
precondition passes. Findings 1–3 (MINOR) need the session agent's rulings or small fixes before the
rows and code are committed; findings 4–7 are NITs.

## Re-check round 1 (2026-10-23; the fixer's round 1 in `FE-builder.md`)

Re-checked only the items the fixer touched: F1, F2, F4 and F6. F3 was ruled by the step agent,
and F5 and F7 were left unchanged on purpose.

**Method.** A clean worktree at HEAD `682f73d`, which includes S1's commits. I ran `npm ci` and
measured the baseline there, then re-recorded on the original FE-free code with my own recorder.
Next I applied FE's files only: the diff of `debugger.ts`, `actions.ts` and `e2e-test-plan.md`
plus copies of the new files. The worktree is removed: `git worktree remove --force` failed on
Windows ("Directory not empty"), so I deleted the directory with `rm -rf`, ran `git worktree
prune`, and `git worktree list` now shows only the main tree.

**F1 — fixed.**
- The fixture's sha256 is still `6881c15abc00a75154e9dde8fc1cab9425e5b58b86050dbe057f6fc1687e4923`.
- My independent recorder still matches it:
  - on the original code at 682f73d: `Tests 6 passed (6)`;
  - after the fix, with no option and with `focusEmulation` `false`, `"yes"`, `1` and `"true"`:
    `Tests 30 passed (30)`.
- Probe, trusted `type "ab😀c"`:
  - **Without the option** the new code logs `pageTab, ensureContent, page:focusForTyping,
    attach, keyDown:a, keyUp:a, keyDown:b, keyUp:b, detach` and then `DEBUGGER_ATTACH
    [chrome.debugger] unsupported key "😀" …`. That is identical to the original code's log and
    error.
  - **With the option** it logs `attach, enable, page:focusForTyping, a↓ a↑ b↓ b↑, disable,
    detach`, with the same error. The disable runs in the `finally`.
- The other probe cases are unchanged: enable throws → `enable, disable, detach` with
  `DEBUGGER_DEVTOOLS`; a throwing focus step → the page's error, unchanged.
- How the fix works: `trustedInputBody` is a lazy generator, and the runner's loop over it sits
  inside the `try`. So a rejected character throws only after the earlier keys were sent, and
  the cleanup still runs. `actions.ts` is byte-identical to round 0.
- The new tests fail without the fix. I swapped in the round-0 `debugger.ts` and
  `trusted-input.ts` and kept the round-1 tests: `5 failed | 50 passed (55)`. The 5 failures are
  the 3 laziness tests in `trusted-input.test.ts` and the 2 rejected-character cases in
  `fe-actions.test.ts`. With the fix back: `55 passed`.

**F2 — fixed.**
- `readOutcome` now STOPs if **any** POS record fails (`fe-rules.ts:331-334`). It also judges each
  `CAP positive` record against the POS recorded before it, and any failure STOPs
  (`:335-345`).
- My dry runs (`scratchpad/verify-verdicts2.ts`):
  - V7, POS FAIL then POS PASS → `STOP — positive control FAIL …` (it was `(A)` in round 0);
  - new V13, POS PASS then POS FAIL → `STOP`;
  - V1–V6 and V8–V10 are unchanged: V1 still gives (C), V2 (B) for the void control, and so on.

**F4 — fixed.**
- The post-call readings in `fe.ts` (`:218-235`) run in a `try`. On failure the trial is still
  recorded with `readErr` and the line `evidence read failed — … (recorded; the trial counts as a
  FAIL)`.
- `readErr` fails both the trial rule and FE-4's trial rule (`fe-rules.ts:120`, `:179`). It also
  makes an FE-5 trial count as "received" (`:139`).
- My dry runs:
  - V11, one unreadable FE-5 trial in the last block → `OUTCOME (B) — FE-5 void`;
  - V12, one unreadable FE-3 trial → `OUTCOME (B) — FE-4 FAIL`, because it is counted, not
    dropped.
- Judgement: treating an unreadable control as received is the conservative side under #78. A
  control that cannot be read cannot show that it held, so the comparison is not discriminating.
  The void reads as (B), the plan's fallback, and it can never move the result toward (A).
- The cost: a single read failure in any FE-1…3 or FE-5 trial forces (B). That is strict, but it
  never flatters the result. Recorded here, no change asked.

**F6 — fixed.**
- §4.17:931-935 now quotes #78 item (4). I compared it whitespace-normalised against the text
  pulled from `decisions.md` (`scratchpad/item4.js`): `in e2e verbatim: true`.
- The e2e plan's diff is still one hunk with 0 removed lines.

**Counts and checks (worktree at 682f73d, with FE's files).**

| | Test files | Tests |
|---|---|---|
| Baseline at HEAD (FE files not yet applied) | 64 | 1080 |
| After (`npm test`) | 66 | 1135 |
| Delta | +2 | +55 |

The +55 is FE's tests: `trusted-input.test.ts` 15 and `fe-actions.test.ts` 40, as claimed.

Every other check passes:
- `npm run typecheck`, `npm run build`, `npx tsc --noEmit -p recipes` and
  `npx tsc --noEmit -p recipes/tsconfig.fe.json` → exit 0.
- `npx tsx recipes/fe.ts selftest` → `SELFTEST PASS — 79/79 checks as expected`, exit 0, 0
  `MISMATCH`.
- Both FE.3 greps → no output, `exit 1`.
- The only `console.` call in `debugger.ts` is still the warning that logs a code only (`:104`).

**Verdict (re-check round 1): PASS-with-notes.** (Only the NITs F5 and F7 remain open.) F1 and F2 (MINOR), and F4 and F6 (NIT), are fixed and
verified. F3 is ruled. F5 and F7 remain as NITs with no change asked. FE.1, FE.2 and FE.3 pass,
and FE.4's precondition passes.

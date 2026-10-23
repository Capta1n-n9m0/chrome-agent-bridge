# FE — builder report (build part: focus emulation for trusted input), 2026-10-23

Builder of stage FE's build part (Opus 5.5). Base commit `637a808700cc8b3a1969030562235bd5cdfbec43`
(`docs(step8): as-built register (Stage 0, S0); journal`). Nothing committed (the step agent asks for
the commit). Nothing touched Chrome, the extension, a daemon or a `connect()`; no `npm run build`.
Stage S1 was editing `extension/src/content/`, `extension/src/inject.ts` and its own tests in the same
tree throughout; none of its files was touched here.

## Files

| File | What |
|---|---|
| `extension/src/trusted-input.ts` (new) | The pure step-list builder `trustedInputSteps(input, focusEmulation)`, `FOCUS_EMULATION_ENABLE/DISABLE`, the `Input.*` command construction moved out of `debugger.ts` byte-for-byte. |
| `extension/src/debugger.ts` | `runTrustedInput(tabId, input, {focusEmulation, focus?})` — the runner (attach → steps → detach in `withDebugger`; the disable in a `finally`). `trustedClick`/`trustedType`/`trustedPressKey`/`dispatchKey` removed (their only caller was `actions.ts`; the builder replaces them). |
| `extension/src/handlers/actions.ts` | The trusted branches of `click`/`type`/`pressKey` call `runTrustedInput` and return `{ok:true, focusEmulation:"on"}` exactly when emulation was on; `type`'s `focusForTyping` moves inside the session when the option is on. The content paths are unchanged. |
| `extension/test/fe-harness.ts` (new) | The recording harness (mocked `tabs.js`/`inject.js`, stub `chrome.debugger`, one ordered log) and the six baseline cases. |
| `extension/test/fixtures/fe-cdp-baseline.json` (new) | Today's log, recorded once on the base commit; never regenerated. |
| `extension/test/trusted-input.test.ts` (new, 12 tests) | The builder, against the fixture. |
| `extension/test/fe-actions.test.ts` (new, 38 tests) | The real handlers: the no-option log = the fixture for every case and four non-`true` values; the option's order; the runner property; error precedence. |
| `recipes/fe-rules.ts` (new) | Every verdict rule as a pure function (trial rules, FE-5's "received", FE-4 per trial, the positive control, the colour classifier, the capture judgements, the outcome table). |
| `recipes/fe.ts` (new) | One command per row (`check`, `control --phase`, `positive`, `fe1`, `fe2`, `fe3 [--control]`, `frames`, `verdict`, `selftest`). |
| `recipes/fe-win.ps1` (new) | The window-capture loop (no images; per frame the time, the foreground handle, size and the uniform-row colours). |
| `recipes/tsconfig.fe.json` (new) | Type-checks `fe.ts`, `fe-rules.ts`, `t5-lib.ts` (see Deviations). |
| `docs/e2e-test-plan.md` | New §4.17 before §5 (96 lines added, none removed). |
| `docs/plans/…-steps/FE-wave-sheet.md` (new) | Set-up, order, commands, what to record, log hygiene, the `FE-run-record.md` skeleton. |

A commit needs an explicit pathspec: `extension/test/fixtures/` also holds S1's `snapshot-pre-s1.json`.

## 1. Today's list, recorded first (FE.2 stricter, F19)

Recorded before any source change (`git diff --stat HEAD -- extension/src` was empty) by a one-off
recorder test (`extension/test/zz-fe-record.test.ts`, run once with `FE_RECORD_BASE=$(git rev-parse
HEAD)`, then deleted) through `fe-harness.ts`. Six cases: `click {tabId:7, ref:"e1", trusted:true}`;
`type {tabId:7, ref:"e2", text:"a.\n", submit:true, trusted:true}`; `pressKey {tabId:7, key:"Tab",
trusted:true}`; click escalation (content `click` throws `REF_STALE`); type escalation (content `type`
throws); a click whose first `Input.*` throws `Detached while handling command.`.

- **sha256** `6881c15abc00a75154e9dde8fc1cab9425e5b58b86050dbe057f6fc1687e4923`
  (`extension/test/fixtures/fe-cdp-baseline.json`), **base commit** `637a808700cc8b3a1969030562235bd5cdfbec43`
  (stored in the fixture; asserted by a test).
- Summary of what it holds (matches stage0-audit F19's sequences): click → `pageTab, ensureContent,
  page:centerForInput, attach {tabId:7} "1.3", mousePressed, mouseReleased, detach`; type → `…,
  page:focusForTyping, attach,` a/a, `.`(`code:""`, no virtual key)/`.`, Enter/Enter (the `\n`), Enter/Enter
  (submit), `detach`; pressKey → `pageTab, attach, Tab down/up, detach` (no `ensureContent`); the
  failing case → `…, attach, mousePressed, detach` and `DEBUGGER_CANCELLED` with the unchanged message.

## 2. Pure builder, test first

Run against a stub module exporting the names with an empty list (so the failures are assertions, not a
missing module; a first run without the module failed with `Failed to load url ../src/trusted-input.js`):
```
 ❯ extension/test/trusted-input.test.ts (12 tests | 10 failed)
   × … without focusEmulation = the recorded pre-FE commands > click (10, 20)
   × … > type "a.\n" with submit      × … > type "ok" without submit (the escalation case)   × … > pressKey Tab
   × … with focusEmulation > the enable and disable commands are Emulation.setFocusEmulationEnabled true / false
   × … > click: enable → the same input commands → disable (marked cleanup)
   × … > type: enable → focus → the same input commands → disable
   × … > pressKey: enable → the key → disable, no focus step (it acts on the focused element)
   × … > only the disable is a cleanup step, and it is the last
   × … > an unsupported key still throws, before any step exists
      Tests  10 failed | 2 passed (12)
```
(The two that passed are negative checks an empty list satisfies: "no Emulation/focus step" and "`\r`
equals Enter".) After the implementation: `Tests 12 passed (12)`.

The handler tests (`fe-actions.test.ts`) were also written before `debugger.ts`/`actions.ts` changed:
`Tests 11 failed | 27 passed (38)` — every option and runner case failed; the 27 that passed are the
no-regression assertions (the 24 fixture comparisons, the unsupported key, the content-path success,
the fixture check). After: `38 passed`. Mutation checks: forcing emulation on in the runner → `24 failed
| 14 passed`; always focusing before attach in `type` → `4 failed | 34 passed`; both restored.

## 3. The option

Order with `focusEmulation: true`: attach → `Emulation.setFocusEmulationEnabled {enabled:true}` → (type)
`focusForTyping` page call → `Input.*` → `{enabled:false}` in a `finally` → detach. `click`'s
`centerForInput` stays before attach. `pressKey` has no focus step. The result is `{ok:true,
focusEmulation:"on"}` exactly when the enable ran (a failing enable fails the call); a content-path
success returns `{ok:true}`. `focusEmulation` absent, `false`, `"true"` or `1` → the whole log equals the
fixture (asserted, 24 tests). Error precedence (tested): a throwing `Input.*` → `attach, enable, the
failing input, disable, detach` and the input's mapped error (the fixture's `DEBUGGER_CANCELLED` text); a
disable that also throws does not mask it (`DEBUGGER_DEVTOOLS` from the input wins); a failing enable
sends no input and surfaces `DEBUGGER_ATTACH: [chrome.debugger] 'Emulation.setFocusEmulationEnabled'
wasn't found`; a failing `focusForTyping` inside the session → `attach, enable, page:focusForTyping,
disable, detach` and the page's own `REF_STALE` error unchanged (not re-wrapped as a debugger error),
exactly what the pre-FE code surfaced when it focused before attaching. The only new log line names a
code only. The comment cites stage0-audit §8 (detach clears emulation). No `chrome.windows`/`chrome.tabs`
call: the tests install spies on `windows.update`/`tabs.update` and assert neither is called.

Greps (before = at the base commit, before any change; the helper did not exist then, so the second
grep was run over the two existing files — over three paths it exits 2 on the missing file):
```
$ grep -rnE "windows\.update|focused\s*:" extension/src/debugger.ts; echo "exit $?"
exit 1                                   # before and after: no output, exit 1
$ grep -rnE "windows\.update|tabs\.update|focused\s*:|focusTab|active\s*:\s*true" extension/src/debugger.ts extension/src/handlers/actions.ts; echo "exit $?"
exit 1                                   # before
$ grep -rnE "windows\.update|tabs\.update|focused\s*:|focusTab|active\s*:\s*true" extension/src/debugger.ts extension/src/handlers/actions.ts extension/src/trusted-input.ts; echo "exit $?"
exit 1                                   # after (helper included)
```
`diff` of the saved before/after outputs: identical.

## Checks

- `npm run typecheck` → `tsc -p shared … && tsc -p extension/tsconfig.json`, **exit 0**.
- `npx vitest run extension/` → `Test Files 24 passed (24)`, `Tests 460 passed (460)` (this count includes
  S1's in-flight tests; at the first post-change run it was `22 files, 408 tests`). **New tests from this
  stage: 50** — `extension/test/trusted-input.test.ts` 12, `extension/test/fe-actions.test.ts` 38.
  (`fe-harness.ts` is a helper, not a test file.) The full-suite count is the verifier's.
- `npx tsc --noEmit -p recipes` → **exit 0**; `npx tsc --noEmit -p recipes/tsconfig.fe.json` → **exit 0**.
- `npx tsx recipes/fe.ts selftest` → 72 `ok — …` lines, last `fe-selftest: SELFTEST PASS — 72/72 checks as
  expected`, exit 0. It covers every trial clause (positive + one negative each), FE-5's "received", FE-4
  per trial (each clause), the positive control (page and capture), the colour classifier (6 positive,
  8 negative readings incl. Step 7's `#dd00fa`/`#97fdfd`), the block capture (pass, magenta frame,
  foreground change, gap → void, no trials → void), the table's every branch — (A); (B) FE-5 void; FE-5
  void winning over FE-4 FAIL; (B) FE-4 FAIL by a trial and by a capture frame; (B) no kind passes; (C) a
  single failed trial; (C) FE-1+FE-2 FAIL with FE-3 PASS (#78's precedence); (C) `type {submit}`'s
  stricter rule — the gates (FE-0 FAIL, FE-0 after a trial, positive page FAIL, capture positive FAIL,
  block void → STOP; two FE-3 trials → INCOMPLETE), and `verdict`'s file plumbing (JSONL + CSVs on disk;
  `--csv-block` override → (B); a missing capture file → STOP). Mutation checks: dropping the FE-5-void
  branch → `MISMATCH` ×2, `67/69`; best-of-three (`passed >= 2`) → `MISMATCH` ×2, `67/69`; restored.
- `fe-win.ps1`: PowerShell parser → 0 errors. Mechanics run against **a scratch window of my own** (a
  non-activating WinForms form with a magenta and a cyan band, never Chrome): `fe-win: 14 frames in 2.0 s`
  at `-IntervalMs 100`, each frame listing `#f800f8` and `#00f8f8`; `classifyRgb` on that CSV: `frames 14
  magenta 14 cyan 14`; the foreground handle stayed the other window's (the form took no focus). Re-run
  after adding `-StopFile`: same. Not run against Chrome (forbidden here): whether `PrintWindow` renders
  Chrome's page is what the live positive control checks.
- CLI set-up exits: no command → usage, exit 2; `verdict` without records → `SET-UP: no records …`, exit 2;
  `control` without `--phase` → exit 2.

## 4. Rows added (§4.17, before §5; dated italic header)

FE-0 (stale check), FE-5 (control, first and last), FE-PC (positive control: page timestamps + capture
loop), FE-1, FE-2, FE-3, FE-4 (over all FE-1…FE-3 trials), FE-3c (extra observation, not in the table);
the outcome table copied verbatim from kickoff §7 with #78's precedence and item 4; the gates
(`STOP`/`INCOMPLETE`); evidence rules and log hygiene. Every expected line is the script's printed line.

## Deviations

1. **`recipes/tsconfig.fe.json` instead of an edit to `recipes/tsconfig.json`.** The shared config lists
   its files explicitly, so `tsc -p recipes` does not check `fe.ts`; editing it is outside the lane. The
   step agent may add `"fe.ts", "fe-rules.ts"` to its `include` at commit (one line) and drop the extra
   config.
2. **An unsupported character in trusted `type`'s text now fails before any key is sent.** The builder
   computes the whole list inside the session, so a character `keyEventParams` rejects (a non-BMP
   character such as an emoji, `length 2`) fails with the same code and message as before
   (`DEBUGGER_ATTACH: [chrome.debugger] unsupported key "…" …`, attach then detach) but no longer after
   typing the characters before it. Not in the fixture's cases (nor reachable for `pressKey`, whose one
   key fails the same way as before — tested). Listed as a proposed decision below.
3. The second FE.3 grep's "before" covers two paths, since the helper did not exist yet (above).
4. FE-3's PASS rule carries FE-1's other clauses besides the status line (proposed decision below).

## Proposed decisions

### 2026-10-23 · A failing focus-emulation disable after a successful input is warned, not thrown
**Decided:** when `Emulation.setFocusEmulationEnabled {enabled:false}` fails after the `Input.*`
commands succeeded, the call still succeeds with `focusEmulation: "on"`, logs one line naming only the
code (`[bridge] focus emulation: disable failed; detach clears it: <CODE>`), and detaches as usual. After
a failing input the disable's error is swallowed and the input's error is returned.
**Why:** the input has already happened, so an error would invite a retry that repeats it; Chromium
clears emulation when the session detaches (`EmulationHandler::Disable()` from
`DevToolsSession::Dispose()`, stage0-audit.md §8), and FE-1/FE-2's "target `hidden` after the call"
would show it live if not.
**Instead of:** throwing the disable's error (a repeated click or keystroke); retrying the disable.
**Revisit if:** a live row reads the target `visible` after the call returned, or Chrome 156 is shown
not to clear emulation on detach.
**By:** Claude (proposed)

### 2026-10-23 · Trusted `type` computes all its keystrokes before sending the first
**Decided:** keep the builder's whole-list form: a text with a character `keyEventParams` rejects now
fails before any key is sent (same code and message, inside the session) instead of after the preceding
characters.
**Why:** the pure list is FE.2's design; failing atomically is no worse for any caller (the call fails
either way) and leaves the field untouched; the fixture's six cases are byte-identical.
**Instead of:** a lazy generator that reproduces the partial typing; a separate pre-check.
**Revisit if:** a caller relies on the partial text.
**By:** Claude (proposed)

### 2026-10-23 · FE-3's focus step, key and PASS clauses
**Decided:** FE-3 focuses `#trusted-input` with the bridge's `evaluate` of `el.focus()` in the same trial
(its own debugger session, ended before the pressKey's) and records whether `document.activeElement`
is then the field; the key is `ArrowLeft`; PASS = `status: TRUSTED key = ArrowLeft` with FE-1's other
clauses (no error, `focusEmulation: "on"`, the target `hidden` after the call, the human's tab active and
current and the target in the background afterwards). A `no` from the focus step is recorded and the
trial judged by the same rule.
**Why:** #85 item 3 asks the row to name its focus step; `evaluate` is independent of the mechanism under
test (a trusted click would conflate them); `ArrowLeft` sets the keydown status and changes no value, so
no `input` event overwrites it; the same clauses across FE-1/2/3 make (C)'s per-kind comparison fair.
**Instead of:** a trusted click as the focus step; PASS on the status line alone.
**Revisit if:** the focus step prints `no` in any trial.
**By:** Claude (proposed)

### 2026-10-23 · FE-3c: FE-3 without the option, an observation outside the table
**Decided:** after FE-5 last, `fe.ts fe3 --control` runs FE-3 without `focusEmulation` (three trials) and
records how often the key reached the page; it never feeds the outcome table.
**Why:** FE-5 controls only click and type; without a pressKey control a FE-3 PASS cannot show that
emulation, not the focus step, made the difference.
**Instead of:** no pressKey control; adding FE-3c to FE-5 (which would change the pre-written table).
**Revisit if:** FE-3c receives the key — then list it for the user beside the outcome.
**By:** Claude (proposed)

### 2026-10-23 · How FE-4's window clauses and the control are measured
**Decided:** `recipes/fe-win.ps1` captures the driver's window by `PrintWindow` every ~50 ms and records
the foreground window's handle per frame; FE-4 FAILs if any frame from 500 ms before the first FE-1 call
to 1500 ms after the last FE-3 call shows the target's magenta bar (§4.15's magenta rule) or if the
foreground handle changes in that span, whatever caused it; the capture is void (⇒ escalate) unless
every call has frames within 1 s before and after it with no gap over 1 s. Its positive control is the
FE-PC screenshot: ≥ 1 magenta frame in the flash and none in the 3 s before. FE-4's per-trial clauses:
the human's tab `current` in every `listTabs` read (25 ms poller + before/after), every window's active
tab unchanged, the target never active, no `hidden` in the human's log since its install (stricter than
BG's "from the call"); a failed poll fails the trial. FE-5's "received input" = status line not
`status: idle` or a non-empty field. The verdict counts every recorded trial (a re-run adds trials) and
prints `STOP`/`INCOMPLETE`, not an outcome, for an FE-0 that is not the last-passing precondition, a
failed positive control, a void capture, or fewer than three trials.
**Why:** #78 item 1 names "no window capture shows the target" and the foreground window; the brief asks
for a positive control for any capture loop; every choice is the stricter or conservative one (a void
or doubtful read leads to escalation or (B), never to (A)). The cyan rule (`G, B ≥ 150, R ≤ 170, R ≤
min(G,B) − 60`) is new and only a sanity read; thresholds chosen with Step 7's `#dd00fa`/`#97fdfd` known.
**Instead of:** no window capture (dropping a #78 clause); a capture without a control; judging only the
trials' own windows.
**Revisit if:** the positive control's capture part fails (the clause is then void and escalated), or a
foreground change unrelated to the bridge fails FE-4.
**By:** Claude (proposed)

## Unfinished / not done

- The live part (commit; main-tree build; reload; the rows; `FE-run-record.md`; a fresh verifier) is not
  this builder's and did not run. No FE result exists.
- `fe-win.ps1` and `fe.ts`'s connecting commands have never run against Chrome or a daemon; their first
  live use is the wave (helper bugs found then are set-up fixes, recorded, never a rule change).
- The full-suite `npm test` count is left to the verifier's clean worktree (shared tree, S1 in flight).

## Fixer round 1 (2026-10-23; verifier findings 1, 2, 4, 6 — `FE-verifier.md`)

Scope as given by the step agent: F1, F2, F4, F6 fixed; F3 ruled (no change); F5, F7 no change. Nothing
else touched; fixture not regenerated (sha256 still `6881c15abc00a75154e9dde8fc1cab9425e5b58b86050dbe057f6fc1687e4923`).
HEAD now `682f73d` (S1's commits `e9e5e8c`, `682f73d` touch no FE file).

- **F1 (MINOR) — fixed.** `extension/src/trusted-input.ts`: the builder is now a lazy generator
  `trustedInputBody(input, focusEmulation)` (enable, the `type` focus step, then each character's keys
  computed only when reached) plus `trustedInputCleanup(focusEmulation)` (the disable, or nothing);
  `trustedInputSteps` = `[...body, ...cleanup]`, so its 12 tests and the fixture comparison are unchanged.
  `extension/src/debugger.ts` `runTrustedInput` iterates the body and sends the cleanup in the `finally`
  (comments updated; the old "builds the whole list" sentence removed). The "Trusted `type` computes all
  its keystrokes before sending the first" proposed decision and deviation 2 above are withdrawn.
  Evidence, tests written first (red: `5 failed | 50 passed (55)`), then green:
  - `trusted-input.test.ts` +3: the body for `"ab😀c"` yields a/a, b/b then throws `unsupported key "😀"`
    (no option); with the option enable, focus, a/a, b/b then throws, and the cleanup is the disable; the
    list equals body + cleanup.
  - `fe-actions.test.ts` +2: no option → `pageTab, ensureContent, page:focusForTyping, attach, a↓ a↑ b↓ b↑,
    detach`, `DEBUGGER_ATTACH [chrome.debugger] unsupported key "😀" …` (the verifier's probe of the
    original); with the option → `…, attach, enable, page:focusForTyping, a↓ a↑ b↓ b↑, disable, detach`,
    same error.
  - All 24 no-option fixture comparisons still pass.
- **F2 (MINOR) — fixed.** `recipes/fe-rules.ts` `readOutcome`: STOP if **any** `POS` record fails
  `positiveVisPass`; every `CAP positive` record is judged against the `POS` recorded before it and any
  failure STOPs. Selftest +2: "a failed positive control, then a passing re-run → STOP" and the same for the
  capture control. Mutation (only the last `POS` checked) → `MISMATCH … got "A", want "STOP"`, `78/79`;
  restored.
- **F4 (NIT) — fixed.** `recipes/fe.ts` `inputTrial`: the post-call readings run in a `try`; on failure the
  trial is still recorded with `readErr: "<code>: <message>"` and the line `<tag>: evidence read failed —
  … (recorded; the trial counts as a FAIL)`. `fe-rules.ts`: `readErr` fails the trial rule and FE-4's
  trial rule, and makes an FE-5 control trial count as "received" (it cannot show nothing arrived — the
  conservative side, voiding to (B)). Selftest +5: trial FAIL, FE-4 FAIL, control received, FAIL even with
  good-looking fields, and a run with one unreadable FE-1 trial → `OUTCOME (B) — FE-4 FAIL` (counted, not
  dropped).
- **F6 (NIT) — fixed.** §4.17's bullet now quotes decisions.md #78 item (4) verbatim; a whitespace-normalised
  comparison of the two texts prints `verbatim: identical`. The selftest count in §4.17 and the wave sheet
  is now `79/79`.

Checks after the round: `npm run typecheck` → exit 0. `npx vitest run extension/` → `Test Files 24 passed
(24)`, `Tests 465 passed (465)`. FE's own tests: **55** (`trusted-input.test.ts` 15, `fe-actions.test.ts` 40),
50 + 5 new. `npx tsc --noEmit -p recipes/tsconfig.fe.json` → exit 0 (`-p recipes` also exit 0). `npx tsx
recipes/fe.ts selftest` → `SELFTEST PASS — 79/79 checks as expected`, exit 0. FE.3 greps: both no output,
`exit 1`.

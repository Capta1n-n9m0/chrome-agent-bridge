# S1-helpers-a verifier report

Model: Opus 5.5, effort medium. Leaf verifier: read and ran only. Nothing in the main tree was edited, nothing committed,
no agent spawned. No Chrome, daemon or port was touched. The PowerShell helpers were parse-checked and never executed;
the scoping probe used stub files.

## 1. Verdict

**FAIL.** One MAJOR (F1): the guards that actually run, which are PowerShell, can be inverted or removed with all 16 tests
still green. That covers the capture STOP §4.26 calls "the helper's unit-tested guards" and #340's idle STOP. The TS
twins that the tests do exercise (`captureStop`, `idleCheck`, `idleWaitMs`) are never called by any runtime code.
Everything else holds: every exit check passes, the line forms match, the lane and size are respected, and the security
items are clean. The rest are MINOR and NIT findings.

## 2. Outputs (re-derived)

| Check | Command | Result |
|---|---|---|
| Recipes tests, before | scratch worktree at HEAD `3ab9207`, `npx vitest run recipes/test` | 47 files, **1056** tests (9 failed, all in `s11-r16-runner.test.ts`: the known worktree CRLF gotcha, recipes/CLAUDE.md) |
| Recipes tests, after | main tree, `npx vitest run recipes/test` | **48 passed, 1072 passed**. +16, the new file's 16 `it`s. Matches the builder's 1056 → 1072 |
| Full suite | main tree, `npm test` | `Test Files 195 passed (195)`, `Tests 4744 passed (4744)`, exit 0. Matches the builder |
| Typecheck | main tree, `npm run typecheck` | **exit 2**, but only in `mcp/test/s12-args-cross.test.ts` (another agent's untracked file, which appeared during this check: TS2554/TS2353 on `args`). Per package: shared 0, daemon 0, sdk 0, extension 0, mcp 2 (that file). Scratch worktree (HEAD + the 4 slice files): `npm run typecheck` **exit 0** |
| Recipes tsconfigs | main tree, `npx tsc --noEmit -p recipes/<t>` for all seven | tsconfig, .fe, .s6, .s9, .s10, .s11, .s11b: **all exit 0**, no output |
| s6 covers the new test | `npx tsc --listFilesOnly -p recipes/tsconfig.s6.json \| grep s12` | lists `recipes/s12-rules.ts` and `recipes/test/s12-helpers.test.ts` (the `test/*.test.ts` glob, not excluded) |
| Build | scratch worktree, `npm run build` | **exit 0**; `git status --short` there showed only the 4 slice files. Not run in the main tree, whose `extension/dist` would have been built from other agents' uncommitted product code |
| Fails pre-slice | worktree with the test file only | `Failed to load url ../s12-rules.js`, 1 file failed. With `s12-rules.ts` added: still failing (`s12-win.ps1` read at load). With `s12-win.ps1` added: `1 failed \| 15 passed`, the s11b wiring test red. With `s11b.ts` added: `16 passed` |
| Size | `wc -l` + `git diff --stat` | 52 + 131 + 140 new + 44 added in `s11b.ts` = **367 new lines** (227 of them code), under the 450 cap |
| Lane | `git status --short recipes docs/plans/…-steps` | only `recipes/s11b.ts` (M), `recipes/s12-rules.ts`, `recipes/s12-win.ps1`, `recipes/test/s12-helpers.test.ts` and the builder's report (`journal.md` is the session agent's). `s11-win.ps1` was not touched |
| PS parse | `[System.Management.Automation.Language.Parser]::ParseFile` on `recipes/s12-win.ps1` | `errors=0`; `file` reports `ASCII text` |

Evidence: `docs/plans/2026-10-27-step12-phase-f-steps/S1-helpers-a-verifier-evidence.txt` (26 mutants, the scoping probe).
The worktree was removed with `git worktree remove --force`. Its five `node_modules/@bridge/*` links all pointed inside the
worktree and were unlinked first with `cmd /c rmdir`. Afterwards the main tree's `node_modules/.bin` still held 42 entries.
Note: before that I ran `npm ci` once in `scratchpad/wt`, a plain directory another agent had left in the shared
scratchpad (not a git worktree; its `node_modules` was a real directory, not a junction). Nothing else was touched there.

## 3. Checks, item by item

**2. Discrimination (26 mutants, evidence file).** The tests kill these: the 14 999 threshold (M1), `>=`→`>` (M2), `<`→`<=`
in `idleCheck` (M3), the PS tail 0→2500 (M4), the guard comparing against 4000 (M6), the per-slice path in TS and PS
(M7, M8), the inverted TS `captureStop` (M9), `attached=yes` for any non-ok code (M12), the control text in TS (M13) and
in `badge.ts` (M14), no title-line drop (M24) and the IDLE form (M25). These **survive**: M5 (no `throw` in
`Assert-S12Tail`), M10 (`Save-S12Console` STOP inverted), M11 (its `throw` removed), M15 (`-lt`→`-le` in `Test-S12Idle`),
M16 (no `return $false` after the idle STOP), M17 (an unknown stamp passes), M18 (the neg-leg guard removed), M19 (the
fixture-page check removed), M20 (`Close-S12DevTools` never STOPs), M21 (`s11b devt` passes a forced
`DEBUGGER_DEVTOOLS`), M22 (the neg leg makes a bridge call), M23 (the positive expression changed) and M26 (the judge
always exits 0). See F1 and F3.

**3. Line forms.** Each is checked against §4.26 line 1742, character by character:
- `CONSOLE <slice> capture=<name> texts=<n> control-disarmed=<n>`: `s12-rules.ts:29` ✓.
- Both `BANNERCTL` lines and `ROW R18-BANNER-CTL <PASS|FAIL> slice=<A|B>`: `:36–38` ✓.
- `IDLE <row> since-attach-ms=<n>`: `s12-win.ps1:50`, printed through `Say9`, so it carries the ISO/`s9-win:` prefix,
  as `SAMPLER` does ✓.
- `DEVT <slice> control1 <ok|CODE> attached=<yes|no>` and `DEVT <slice> control2 <ok|CODE>`: `s12-rules.ts:50–51` ✓.

`SAMPLER` is still printed by `Invoke-S11Sampler`, unchanged. `Invoke-S12Sampler` re-emits the same text via
`Write-Host` after `6>&1`, and `Write-S9Raw` and `S16Stops` already ran inside the original `Say9` ✓. `devt` without
`--slice`/`--row` prints exactly what it printed before (diff: the `DEVT` lines are under `if (a.opts.slice !== undefined)`;
`finalRow` defaults to `"R17-UP-DEVT"`) ✓. `devtJudges` is unchanged ✓.

**4. Banner window.**
- Actor side: `windowed()` (`s11b.ts:681–701`) sleeps `WINDOW_BEFORE_MS` = 500 after `-sample.pressed` and
  `WINDOW_AFTER_MS` = 2500 after the reply (`s11b-rules.ts:755–756`).
- PS side: with `$S11SampleTailMs = 0`, `Invoke-S11Sampler`'s do-while polls once after `-sampled.ready`.
- So the post-reply window drops from about 6.5 s to about 2.5 s plus at most two poll iterations. The 500 ms lead is kept.
  The neg leg uses the same window around an empty step ✓.
- Scoping, probed with stubs (evidence): in the documented order the override reaches `Invoke-S11Sampler`, also when
  called from another function and when the files are dot-sourced inside a function. In the wrong order
  `Invoke-S12Sampler`'s guard prints STOP, but a direct `Invoke-S11Sampler` call silently runs the 4 000 ms tail (F4).
- Negative leg: `bannerctl --leg neg` never calls `session()` and makes no connection; `@bridge/sdk` is imported only
  dynamically in `session()` ✓.
- Positive leg: connect and claim run before the window, then one `evaluate`, and the release runs after `windowed`
  returns ✓.
- The window's `violations` is computed but dropped in `bannerctl` (F6).
- `return (1);` goes through `wrapExpression` (`extension/src/evaluate/wrap.ts:58`) to `(async () => { return (1); })()`,
  which yields `1`. It takes the same debugger path and gives the same `ok`, so the pass rule is unaffected. It is still a
  wording deviation from §4.26's "the expression `1`" (F8).

**5. Idle guard.**
- `Test-S12Idle` prints IDLE and then a `STOP:` under 15 000 ms, or a `STOP:` with no IDLE line when the stamp is
  unknown. It never prints NOT MEASURED ✓.
- `Wait-S12Idle` waits for the remainder. On an unknown stamp it writes a stamp now and waits the full 15 s. That is
  conservative, because any earlier attach lies before "now", but it means `Test-S12Idle`'s unknown branch never fires
  after a wait.
- The stamp is written at actor-process end, which is later than any reply, so the measured idle is a lower bound. The
  neg-leg idle is read before node starts, also a lower bound ✓.
- The stamp can **overstate** the idle in one way: an attaching process after which the runner does not call
  `Set-S12AttachStamp` (F5).

**6. Capture.**
- `console-liveA18.txt` and `console-liveB18.txt` differ ✓.
- `Save-S12Console` runs `Assert-S11Outside`, then STOPs if the path holds non-blank text, before `Save-S11bConsole`
  (which overwrites with `WriteAllText`) ✓. The STOP text names the slice only ✓.
- `console-line` uses `outsideRepo` and prints the base name only ✓.
- `dropTitleLines` runs before both counts, tied to `s11b-rules.ts` by text ✓.
- `CONTROL_TEXT` is tied to `badge.ts` (M14 killed) ✓.
- The check runs only at save time (F7).

**7. DevTools helper.**
- `Open-S12DevTools` runs `Assert-S11Own`, then a fixture-URL check (F9), then `Send-S12Key` (`Assert-S11Own` plus
  `Set-S9Foreground`) for each key ✓.
- Attachment is never claimed in PS (there is no `attached=` anywhere in the PS file). `attached=yes` comes only from
  control 1's code (`s11b.ts`, `ctl1.err?.code`) ✓.
- `Close-S12DevTools` re-detects and prints `STOP: a DevTools window or pane is left open` ✓.
- The detector is unmeasured live (the builder's own finding). If it misses a docked pane, both open and close are blind
  to it and no STOP fires; control 1 still decides the row.

**8. Security and integrity.**
- Nothing prints a URL, title, path, folder, expression or token. The printed items are handles, counts, file names,
  `key=` and `found=window|pane|none`. The Stop9 texts hold no values.
- The PS file is ASCII and parses with 0 errors.
- Top-level assignments are only `$S11SampleTailMs` (the intended override) and `$S12IdleMinMs`.
- The new globals `S12Before`, `S12Dev` and `S12Left` collide with no `$global:` name in `recipes/*.ps1`.
- The locals shadow no script variable that a callee reads (`Test-S9Banner`'s `$root` is its own local).
- No protective check is weakened: `s11-win.ps1:30` and its 4000 pin test are untouched, and the shorter window is the
  pre-registered 2 500 ms (#340).

## 4. Findings

**F1 — MAJOR — the runtime guards are untested PS; the tested TS twins are dead code.**
Locations: `recipes/s12-win.ps1:47–53` (`Test-S12Idle`), `:65–71` (`Save-S12Console`), `:56–58`, `:113–122`;
`recipes/s12-rules.ts:14–15`, `:42–46`.
- Evidence: `grep -n "captureStop\|idleCheck\|idleWaitMs\|SAMPLE_TAIL_MS\|IDLE_MIN_MS" recipes/*.ts recipes/*.ps1`
  (excluding `s12-rules.ts`) returns nothing, so no runtime code calls them.
- Mutants M10, M11, M15, M16, M17, M18 and M20 leave `16 passed (16)`. Inverting the capture STOP (`-ne ''`→`-eq ''`) or
  letting an unknown idle pass (`return $true`) is not caught.
- §4.26 line 1738 pre-registers "The helper's unit-tested guards: … a capture path that already holds text is a STOP".
  #340 makes the idle STOP the only guard of the banner rows' idle. Both are tested only in a twin that never runs.
- Fix: run the PS functions in the test with stubbed helpers, the repo's own pattern ("pure PowerShell functions, run on
  the same cases as their TypeScript twins", `recipes/test/s11-r16-runner.test.ts`):
  - `Save-S12Console` with a temp `$S11Out`, stub `Assert-S11Outside`/`Save-S11bConsole`/`Stop9`: blank → saved;
    text → STOP and a throw, text not echoed.
  - `Test-S12Idle` with stamps at now−14 999, now−15 000 and missing: STOP / IDLE+true / STOP.
  - `Invoke-S12BannerLeg 'neg'` under 15 000 → throw before the sampler.
  - `Close-S12DevTools` with a stub detector that still sees DevTools → STOP and `$false`.

  Alternatively, make the PS call the tested TS. As things stand, a regression in what actually runs passes CI.

**F2 — MINOR — the neg leg's idle FAIL becomes a STOP.** Location: `recipes/s12-win.ps1:58`. §4.26's pass rule makes
`idle-ms` < 15 000 a FAIL of R18-BANNER-CTL; the helper STOPs instead (builder deviation 3). It is more conservative and
reachable only through a runner bug after `Wait-S12Idle`, but it changes the verdict class of a pre-registered clause.
Fix: a session-agent ruling (a #340-style note), or keep the FAIL path.

**F3 — MINOR — the `s11b.ts` wiring is untested.** Location: `recipes/s11b.ts` (bannerctl, bannerctl-judge, devt
`--slice`). M21 (forced `DEBUGGER_DEVTOOLS`, i.e. a false `attached=yes`), M22 (a bridge call in the neg leg), M23 (a
different expression) and M26 (the judge exits 0 on FAIL) survive. The builder's reason holds (s6 cannot typecheck an
import of `s11b.ts`, and tsconfigs are out of lane), but `recipes/test/s11b-r17-plan.test.ts` already imports `../s11b.js`
under `.s11b`. Fix: a test listed in `tsconfig.s11b.json` (needs a lane grant), or tighter static ties: the neg branch
holds no `session(`/`bcall(`, and `devtLines(` receives `ctl1.err?.code`.

**F4 — MINOR — the tail guard is not on the banner rows' path.** Location: `recipes/s12-win.ps1:12,16`. §4.26 routes
R18-UP-6 and R18-F-RAW* through `B17 up6`/`B17 raw` → `Invoke-S11bSamplerPasses` → `Invoke-S11Sampler`
(`s11b-win.ps1:313–315`), which bypasses `Assert-S12Tail`. In a wrong dot-source order, for example a later re-source of
`s11-win.ps1`, those rows silently get the 4 000 ms tail (probe: `tail=4000`, no STOP). Fix: call `Assert-S12Tail` from
`Test-S12Idle`, which precedes every banner row's first call.

**F5 — MINOR — the idle stamp depends on an unenforced runner convention.** Location: `recipes/s12-win.ps1:29`. Nothing
writes `last-attach.stamp` unless the runner calls `Set-S12AttachStamp` after every actor process. A forgotten call
overstates the idle, and the STOP does not fire. Fix: stamp inside the process wrapper (`Invoke-R17Node`'s successor in
S1-helpers-b) and test that it does; the handoff should state this.

**F6 — MINOR — the handoff is wrong about the leg results, and `violations` is dropped.** Locations: the builder report
§7 step 3; `recipes/s11b.ts` bannerctl. `Invoke-R17Node` (`s11b-r17.ps1:125,143`) keeps the driver's output in a local
`$res` and returns only the exit code, so "keep its returned IdleMs, Polls, Banner" cannot work as written. A global is
needed. `bannerctl` also ignores `r.violations`. With one call per process it is 0 by construction, but printing it would
make "no other bridge call in flight" evidence rather than an argument.

**F7 — MINOR — the capture STOP fires only at the slice's end, and attempt 2 is not handled.** Location:
`recipes/s12-win.ps1:65–68`. The text check runs at save time, after R18-RESTORE. A stale file in the out folder (an
attempt-2 run, since the raw name has no `-attN`) STOPs only after every row has run. Fix: check the path is free in the
prologue, before R18-0 (where §4.26 says the capture starts), and give the raw name an attempt suffix or require a fresh
out folder per attempt.

**F8 — NIT — the positive expression.** Location: `recipes/s11b.ts` bannerctl, `"return (1);"`. It evaluates to `1` by
the same path, but §4.26 says "the expression `1`". Use `"1"`, or record the deviation in the sheet's ledger.

**F9 — NIT — "fixture page" is wider than §4.26.** Location: `recipes/s12-win.ps1:99`. `Test-S11Url` also accepts
`about:blank`, `chrome://extensions` and port 8084. §4.26 drops 8084, and "window X on the fixture" means the 8081 upload
page. Fix: require `http://(127.0.0.1|localhost):8081/`.

**F10 — NIT — small test weaknesses.** Location: `recipes/test/s12-helpers.test.ts:27`, `:106`. Line 27's
`.replace("liveB18","liveB18")` is a no-op, and the committed-name check against the sheet is effectively only
`S1-live-console-liveB18`. Line 106 `return`s silently when PowerShell is missing; `it.skipIf` would be honest.

**F11 — NIT — `--row` and `--slice` checks.** Location: `recipes/s11b.ts` devt. `--row` takes any string (other
commands use `rowOpt`), and an invalid `--slice` is rejected only after DevTools and the upload have run. Fix: validate
both up front.

**Spec attack (no edit).**
- (a) The sampler window ends 2 500 ms after the reply **plus up to two poll iterations** (a full-tree UIA `FindAll` per
  window, `s9-win.ps1:768–770`). §4.26 says "to 2 500 ms". For the banner rows this is stricter, never looser; worth one
  sentence in the record.
- (b) `texts=<n>` in the `CONSOLE` form is not defined in §4.26. The builder defines it as non-blank lines after the
  title lines are dropped.
- (c) The pass rule's "idle-ms ≥ 15 000" is unreachable as a FAIL given the helper STOP (F2).
- (d) Whether Chrome 156 refuses `chrome.debugger` while DevTools is open, so that K-devt is reachable at all, is
  unmeasured. Run 16 recorded "DevTools never shown" and Run 17b "control1 ok". §4.26's known limits already cover this.

## 5. Proposed decisions

### 2026-10-27 · S1-helpers-a's runtime guards are tested by running the PowerShell
**Decided:** a helper guard that a sheet calls "unit-tested" is tested in the language that runs it: the PS function with
stubbed helpers, or PS that calls the tested TS. A TS twin no runtime calls does not count. **Why:** F1's mutants.
**Instead of:** static text ties alone. **Revisit if:** the PS stub harness cannot load `s12-win.ps1` without Chrome.
**By:** Claude (proposed)

## 6. Handoff

- No processes left. The scratch worktree is removed.
- The fixer's scope: F1 (MAJOR) and, at the step agent's choice, F4, F6, F7 and F8–F11. F2 needs a ruling. F3 needs a
  lane grant for `tsconfig.s11b.json`, or tighter static ties. F5 belongs to S1-helpers-b's runner, but its test could
  live here.
- The re-verify should re-run the mutants M10, M11, M15–M18 and M20 (and M5, M21–M23 and M26 if F3 or F4 are taken).

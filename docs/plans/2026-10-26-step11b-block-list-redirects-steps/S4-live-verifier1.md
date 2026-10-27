# S4-live verifier 1 (Opus, medium): the F-FILETAB helper fix between attempts

1. **Verdict: PASS-with-notes** (no CRITICAL or MAJOR; two MINOR, three NIT).

2. **Outputs** (read and run only; no repo file edited; nothing live, plan only)
- `git diff HEAD -- recipes/`: `recipes/s11b-r17.ps1` +4 lines at the head of `$Blocks['f-filetab']` (lines 474-477); `recipes/test/s11b-r17-static.test.ts` +16 lines (one new `describe`). Nothing else under `recipes/`. The ledger diff (+3) is the step agent's.
- `npm test`: `Test Files 178 passed (178)`, `Tests 4488 passed (4488)` (the fixer's claim of 4488/178 holds).
- `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` (base, fe, s6, s9, s10, s11, s11b): exit 0 each. `npm run typecheck`: exit 0.
- `powershell -File recipes/s11b-r17.ps1 -Block plan`: exit 0.
- `recipes/s11b-r17.ps1`: 0 bytes above 127 (node byte scan), ASCII only.
- `git status --short`: only the two lane files plus the steps-dir files that were there at the start.

3. **Check (1): the diagnosis is sound, from code**
- An own options page tab is listed hidden `"blocked"`: `extension/src/handlers/tabs.ts:23-40` lists every `chrome.tabs.query({})` tab through `redactRows`; `extension/src/safety.ts:316` returns `{ redact: "blocked" }` when `firstBlocked(target.urls, ctx)` is truthy, and `tabUrlBlocked` (`safety.ts:275-279`) returns `"own"` for `isOwnExtensionPage` (`safety-match.ts:267-273`: `chrome-extension://<this id>/...`). `$S9OptionsUrl` is this extension's options page, so O's tab is a hidden `blocked` row whenever O is open.
- O is open at F-FILETAB in liveA: `$SliceA` (`s11b-r17.ps1:26`) runs `rd0`, `r17-up-l1`, `rd-ctl`, `f-filetab`. `rd0` opens O by `Use-S16Options` (`:461`, `Save-S11Found (Use-S16Options) ...`); neither `r17-up-l1` (`s11.ts l1`, SDK calls on tab `l1`) nor `rd-ctl` (`s11b.ts:350`, plain HTTP gets) touches or closes a window. At HEAD the first window closed after RD-0 is the file window at the end of F-FILETAB.
- The count fits: attempt 1 read `hidden(blocked)=2` (`S4-live-run1-record.md:30`) = O + the file window's `file:` tab. A third hidden tab (the runner's reading that a pre-existing tab was hidden, `S4-live-runner1.md:23`) would have made 3. With O closed and the browser otherwise as in attempt 1, the count is 1.
- Other wave windows: E (`chrome://extensions`, `console` block) is not own (`chrome:` scheme, `isOwnExtensionPage` false) and not `file:`; it is hidden only if the found block list held a pattern matching host `extensions` (`isUrlBlocked` uses `urlHost`, `safety-match.ts:208-213`), which attempt 1's count rules out for this profile. D (the worker DevTools window): the handler sees only `chrome.tabs.query({})`; DevTools windows are not tabs in the `chrome.tabs` API (Chrome's documented behaviour, not provable from repo code), and attempt 1's count leaves no room for it. W and the setup tabs (`s11.ts:149-166` `tabUrl`): `http://127.0.0.1:8081/...` or the alias host on 8081, which RD-0 (d) `foundlist` STOPs on if the found list blocks them (`s11b.ts:886`). RD-0's E2 window is closed inside `rd0` (`:465`).

4. **Check (2): the fix closes only the wave's own window; PS 5.1 semantics**
- Guard: `Test-S11Own $global:O` (`s11-win.ps1:104`) is true only if the handle is a key of `$global:S11Own` (set only by `Open-S11Window`, `:117`) and live. `Close-S11Window` (`:123-127`) re-checks the same guard, then `Close-S9Window` (WM_CLOSE, waits up to 5 s) and removes the key. A user window can never pass.
- `$global:O = 0`: persisted by `Save-S16` (`$Persist` holds `O`; `0` is non-null so it is written, `:78-82`) and by `Invoke-S16Block`'s own `Save-S16` (`:875`). `S11Own` round-trips through Clixml as a hashtable with string keys; O's key is removed before the save.
- Later reopening: `Use-S16Options` (`:302-305`) calls `Test-S11Own 0` -> `ContainsKey("0")` false -> a new O. F-HOME (`:674`), RD-CAPS-WARN (`:238`), g1-open/close, rd5/rd5b, rd-dl-socket, r17-up-*, root-add and RD-RESTORE (`:828`) all go through `Use-S16Options`; no block reads `$global:O` directly besides `Use-S16Options` and the new lines (grep `global:O`).
- Teardown `Close-S16Windows` (`:316-320`): D and E by handle, then `Close-S11All` over `S11Own` keys; O = 0 is not there, the new O (if any) is. STOP procedure `Stop-S16Wave` (`:346-360`): at F-FILETAB `S16Changed` is false (no state change before G1), so no restore and no reopen; later, a restore reopens O through `Use-S16Options`. Correct.

5. **Check (3): no pass rule, judge, expected text or the s9.ts check changed.** `git diff HEAD` touches no `*-rules.ts`, no `recipes/s9.ts`, no `docs/e2e-test-plan.md`, no `Invoke-R17Row`/`Invoke-R17Judge` argument. `resolveTab`'s `blocked1` check (`s9.ts:251-256`) is unchanged.

6. **Check (4): the new test fails without the change.** Scratch copy of `git show HEAD:recipes/s11b-r17.ps1` and a node script with the test's exact logic (`unitOf`, the four indexes), in the scratchpad (`red.mjs`, `head-r17.ps1`), never git stash/checkout/reset:
  - HEAD text: `{"at":true,"guard":false,"closeAfterGuard":false,"openAfterClose":true,"saveBeforeOpen":true} FAIL`
  - working text: all five true, `PASS`.

7. **Check (5): other "exactly one hidden row" assumptions.** `blocked1` and `tabs-hidden` appear only in F-FILETAB (`s11b-r17.ps1:482-489`); `filetab` (`s11b.ts:714`, `judgeFileTabRows` `s11b-rules.ts:879-890`) runs only there; `judgeTabsHidden` (`s11b-rules.ts:869-875`) only there. The `untouched` `tabs2` step runs with O still closed (nothing in the block reopens it), so it sees the same one hidden row. The control tab `ft` is refused (K-fileurl) and stays on 8081. No later block lists tabs with a hidden count; R17-UP-OPT's O and O2 do not meet a hidden-count check. Only effect: one more `New-S16Window` at F-HOME.

8. **Findings**
- **MINOR-1** `recipes/s11b-r17.ps1:475` with `s11-win.ps1:123-127`, `s9-win.ps1:319-324`: if O does not close within 5 s, `Close-S9Window` prints `window ... did NOT close`, yet `Close-S11Window` still drops it from `S11Own` and the fix sets O = 0 and prints "closed the wave's options window". The window then stays open untracked (teardown never closes it) and F-FILETAB meets 2 hidden rows again -> the same SET-UP STOP (fails safe). Suggested fix: after the close, `if ([S9Win]::IsWindow([IntPtr]$h)) { Fail-S16 'O did not close; F-FILETAB not run' }` before `$global:O = 0`, or leave as is and let the runner read the `did NOT close` line. Not blocking.
- **MINOR-2** (pre-existing, outside the fix; residual risk for attempt 2): the sheet's "exactly one hidden row" also fails on any tab of the human's that is hidden at that moment (a host on the found block list, a `file:` tab, a `chrome-extension://<own id>` tab). Attempt 1's count shows none then; the outcome if one appears is the same SET-UP STOP, not a wrong verdict.
- **NIT-1** `recipes/test/s11b-r17-static.test.ts`: `expect(text.indexOf("Save-S16")).toBeLessThan(open)` passes also when `Save-S16` is absent (`-1 < open`; HEAD gives `saveBeforeOpen: true`). Suggested: `toBeGreaterThan(close)` as well. The test also does not pin `$global:O = 0`.
- **NIT-2** sheet vs helper (pre-existing): F-FILETAB's "else NOT MEASURED" is honoured by the `tabs` row (`ROW ... NOT MEASURED`, record line 33), but the next step's `blocked1` throws SET-UP, i.e. a STOP; consistent in effect (the dependent steps cannot run), worth one sentence in the record.
- **NIT-3** the fixer's report skips a red-before run; this verifier supplied it (item 6).
- No new runtime fact for a package `CLAUDE.md` (measured): none; the O-is-hidden fact follows from the S0F-a gate by construction.

9. **Handoff:** nothing running; scratch files only in the session scratchpad; the plan block wrote under `%TEMP%\r17plan` (outside the repo). Attempt 2 can run with the fix; MINOR-1's `did NOT close` line is the one to watch in F-FILETAB.

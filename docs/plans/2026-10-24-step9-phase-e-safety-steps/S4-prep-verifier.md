# Step 9 S4 — prep verifier report

Verifier: Opus 5.5, 2026-10-24, HEAD `e91e437` (base `3821d0f`). No Chrome, no build, no daemon, no bridge client,
nothing on 9234. The only file edits were two mutations of `recipes/s9-rules.ts`, each reverted with `git checkout`
(the tree was clean afterwards: only the three untracked S4 ledger/brief files, as at the start).

## Checks run

| # | Check | Result |
|---|---|---|
| 1 | S4.1 order | `git log`: `049a72a` (rows) → `e91e437` (helpers); `git show --stat 049a72a` → `docs/e2e-test-plan.md | 105 +++` only. Nothing live before. **OK** |
| 2 | Strings vs source | 31 strings grepped (`grep -rlF` over `extension/src`, `options.html`, `sdk/src`, `mcp/src`, `daemon/src`): all 6 refusal messages (`safety.ts`), 3 MCP lines (`sdk/src/error.ts`, exported through `@bridge/sdk/report`), 5 badge titles and 3 press lines (`badge.ts`), 3 options status lines and the invalid-line reason (`options-model.ts`), `Line N: “…” — …` (`options.ts:56`), `Safety: …` (`registry.ts:130`), `(hidden: the bridge is off)`, `Cursor: none yet — …`, `Selected tab …`, `safety state: armed=…` (`intercept.ts:68`), `CAPTURE_MOVED_MESSAGE`, `RESTRICTED_URL` prefix (`inject.ts`), `Save blocked sites` / `Change the keyboard shortcut` (`options.html`). Two not found verbatim, both explained: the OPT-1 summary is composed by `analyzeBlockList` (`options-model.ts:47-49`, composition matches); `Activate the extension` is Chrome's own label for `_execute_action` (manifest `suggested_key Alt+Shift+K`). **OK** |
| 2 | Merge completeness | stage0 §7: SAFE-0…11, 1b, 4b, 5b–5d, 6b, 6c, 7b–7d all present. S2a §7 rows 1–11 → SAFE-0, ACL-1, 4(b), 0 (log delay), POP-1, CAP-1, 4c, PERF, REL-1, REL-2, REL-3. S2b §7 rows 1–8 → SAFE-1/1b, 2, 6, 3/OPT-1, OPT-2, 9, UNIT, PIN. S2c §7 (nothing new). S3 §7: `Safety:` as item 2 from a live transcript (SAFE-1 (3), `SAFETY-DELIVERY`), MCP refusal lines (SAFE-1/5/6), `daemon.status` while disarmed without url (`rowsWithUrl=0`), the generation-count note (SAFE-9). Stage 0's four facts: SAFE-2 (a)/(c), WAKE, 7c, 6c. **OK**, with re-scopes in findings 7–8 |
| 2 | SAFE-0 a true stale check | Both signals exist only in a Step 9 build: a pre-Step-9 extension never sends `safetyState` (10 s poll → FAIL) and navigates to its options page (`ok` → FAIL). Read before any toggle. **OK** |
| 3 | Helpers safe | See findings 9–10; otherwise **OK**: windows by HWND diff (exactly one new window or throw), `Open-S9Window` fixture URLs only, `chrome://` / own pages via the omnibox of a verified `about:blank` window; the toolbar button by the `Chrome Agent Bridge` prefix and count = 1; tabs by ClassName `Tab` + prefix; options controls by AutomationId (switch also by name); Token field never read; list printed as count + sha256 only, invalid-line texts only with `-ShowInvalid` (block 31, the wave's own list); found text saved under the scratchpad, deleted after a match; kills via `Test-SafeToKill`; `http.server --bind 127.0.0.1`, `s9-redirect.py` binds `127.0.0.1`; `.ps1` has a UTF-8 BOM and sets `OutputEncoding`; prompts carry no `"`; page code is literal strings (`VISLOG`, `evaluate` expressions; no `String(fn)`); `Restore-S9Layout` taps only until the recorded layout returns (≤ 4). |
| 5 | Typecheck + tests | `npx tsc --noEmit -p recipes/tsconfig.s9.json` → `tsc-exit=0`. `npm test` → `Test Files 116 passed (116)`, `Tests 2718 passed (2718)`. Mutations (each reverted): `judge` without the DOMAIN_BLOCKED no-data rule → `× judge > DOMAIN_BLOCKED forms: the exact message and no data` (1 failed / 32); `waitDisarmVerdict` without the 300 ms bound → `× timed verdicts > waitDisarmVerdict: DISARMED within 300 ms of the press` (1 failed / 32). **OK** |
| 6 | Product untouched | `git diff --stat 3821d0f..HEAD -- extension daemon sdk mcp shared` → empty. **OK** |
| 7 | Token / URL counts | Token (read from `bridge.token` inside the shell, never echoed): 0 in each of the 10 committed S4 files and `docs/e2e-test-plan.md`. Schemes in the lines the two commits add (`git show … | grep "^+"`, hosts only, counted): `http://localhost` 55, `chrome://…` 33, `chrome-extension://` (own id, `aaaa…`, templates) 19, reserved `*.example` 8 (test inputs), `scheme://…` 1; no real site (`blackboard` 0). **OK** |

## Findings

1. **MAJOR — no pre-registered abort path that restores the safety state.** `S4-wave-sheet.md:10-15` lists the stops
   (pin failure, a reload exit ≠ 0, a Chrome restart, a 9234 holder, a token count) and says "a failed row is recorded
   and the wave goes on", but nothing says that a stop, or a helper `throw`, *after the first toggle (block 14)* must
   still run block 40's restore + read-back (and the pin, the keyboard layout, the windows) before the run ends.
   Only block 37 mentions it ("the restore then waits for the user"). `storage.local` persists across reloads and
   Chrome restarts (#171, LESSONS), so a wave abandoned at, say, block 36 leaves the user's Chrome disarmed, JS off
   and `bank.example` blocked — an integrity-floor item ("a safety state left different from the one found").
   Evidence: `grep -n -i "abort\|before stopping\|restore" S4-wave-sheet.md` → only lines 11, 124, 230, 237, 246, 293.
   **Fix:** add a pre-registered "on any stop or unhandled throw after block 14" rule: record the stop, then run
   block 40 (restore + read-back) and the pin/layout/window part of block 43; if block 40 itself cannot run (Chrome
   restarted, reload failed, O cannot be opened), record the state as last read and STOP for the user (G9-1).

2. **MAJOR — SAFE-5d's `snapC` will fail `TAB_HELD` for a wave-design reason.** Block 32 has actor M call
   `browser_select_tab` on `<T#c>`; that is `tabs.claim` (`mcp/src/tools/registry.ts:628`), granted on a blocked tab
   (#136), and the lease is kept: moving M's cursor back to `<T#w>` releases nothing (no release in
   `browser_select_tab`), and leases die only with the connection (`daemon/src/leases.ts:2`, `intercept.ts:432-435`);
   M runs until block 43. Block 33's `S9 call SAFE-5d snapC snapshot c --expect ok` is a new SDK client, and the
   daemon checks the lease on every tab call (`intercept.ts:488`, `checkLease` 546-554) → `TAB_HELD`, so the row's
   "unblocking restores today's behaviour" check fails without measuring the product. **Fix (before the run, a
   step change, not an expected-text change):** give M its own 8081 tab for SAFE-5 (e.g. `browser_new_tab` on
   `http://localhost:8081/…?s9=m5`, which M then holds), or run `snapC` on a tab M never claimed, or end M after its
   SAFE-5 leg and start M2 for SAFE-9.

3. **MINOR — the list hash "read back" reads what was just typed.** Blocks 33 and 40 run `Set-S9BlockList` and then
   `Read-S9SafetyState` on the same page: the sha256 is taken from the textarea the helper just set, not from
   storage, so it equals the start's by construction. Only `S9 probe`'s `blockedCount` reads storage, and it counts
   valid patterns only (an invalid line or whitespace left in storage is invisible). Block 40 also probes right
   after the save without waiting for the `safetyState` event, so a race can read the old count and stop the run
   falsely. **Fix:** reload O (`Set-S9Omnibox $O 'chrome-extension://<id>/options.html'`) before each final
   `Read-S9SafetyState`, and put `S9 wait-safety --armed <found> --evaluate <found> --count <found>` before
   `S9 probe --row SAFE-11-end`.

4. **MINOR — the toggles assume the found state.** §4.20 (line 1123) says any other found state "becomes SAFE-11's
   target", but every toggle in the sheet is a blind press (`Invoke-S9ActionButton` flips), and block 40 hard-codes
   ON / JS on / empty. If block 8 reads anything but `armed=true evaluate=true count=0`, the wave would invert it.
   **Fix:** pre-register "block 8 differs from the expected found state → STOP before block 14; the step agent asks".

5. **MINOR — §4.20's steps call `Set-S9BlockList -Text "…\n…"`, which does not exist.** `docs/e2e-test-plan.md`
   lines 1147, 1148, 1151, 1153, 1154; the function takes `-Lines <string[]>` / `-FromFile` (`recipes/s9-win.ps1`,
   `Set-S9BlockList`), and `\n` is literal in PowerShell. The wave sheet (blocks 31–40) uses `-Lines @(…)` correctly.
   **Fix:** a dated note in §4.20 that the sheet's commands are authoritative (steps column only; no expected text
   changes).

6. **MINOR — the console verdict can pass vacuously and depends on a line-start anchor.** `consoleHits` /
   `cmdScanFile` treat a line as bridge logging only if it *starts* with `[bridge]` or `safety: ` (`s9-rules.ts`
   `consoleHits`, `s9.ts:742`); how DevTools exposes a console row's name to UIA is unmeasured (a prefix such as a
   repeat count or source link would hide every bridge line, and fixture URLs are not "other", so a bridge line
   logging `localhost:8081` would then pass). `consoleVerdict` also passes on an empty capture. §4.20's expected
   `CONSOLE safety: …` lines make the live verifier catch absence, but the CHECK line does not. **Fix:** match the
   prefixes anywhere in the line, and make the console CHECK `NOT MEASURED` unless ≥ 1 `safety: disarmed by the user`
   line was found (a positive control).

7. **MINOR — SAFE-7d re-scoped without being listed as a deviation.** stage0-audit §7: "trusted `click` at a point →
   `RESTRICTED_URL` (debugger refused); extension card state unchanged". §4.20 line 1140 uses a locator click (the
   content-script injection is refused before any debugger attach) and replaces "card state unchanged" with "the
   bridge still answers". The API has no coordinate click, so the re-scope is reasonable, but it is absent from the
   builder's §4 Deviations, and the card proxy is weak. **Fix:** list it; read the card's enable toggle on E by UIA
   (`Find-S9Card` exists) before/after.

8. **NIT — SAFE-5c `chunk s9-none`** is a record; an unknown id errors whatever the store holds, so neither it nor
   stage0's version shows "no download store entry". Say so in the row.

9. **NIT — `Read-S9SafetyState` reads the checkboxes by AutomationId only** (`Get-S9Toggle`); §4.20 line 1123 says
   "by AutomationId and name". `Set-S9Switch` does check the name. Low risk (fixed ids in `options.html`).

10. **NIT — `Set-S9Pin` finds the toolbar's `Extensions` button by its bare name** (count must be exactly 1, so an
    ambiguous match — e.g. a bookmark named `Extensions` — fails safe as a G9-2 stop, not a wrong press).

11. **NIT — SAFE-ACL-1's reason** ("no bridge call runs there") is true but incomplete: DevTools' context picker
    could run code in a content-script world of a fixture tab. It is the same class as SAFE-REL-2 (code typed into
    an extension context), so "not measured" is consistent; the reason should say that rather than imply it is
    impossible.

## Deviations judged

- SAFE-0 without a toggle: **sound** (finding-free; both signals are Step-9-only, and the toggle moved to SAFE-1).
- 1000 characters for SAFE-4 (b): **sound**; the rule (0 < k < n, `DISARMED` not `DEBUGGER_CANCELLED`) is unchanged.
- `:8083` instead of a raw `8083` count: **sound**; the raw count is still printed.
- Console rule (Chrome's own network entries not bridge logging): **sound in intent**, weak in mechanics (finding 6).
- Transcripts outside the repo, quoted lines only after a count-grep: **sound**; #162's live read survives as the
  `SAFETY-DELIVERY` line per result.
- Not measured: SAFE-7c (needs a forbidden exemption or a new grant), SAFE-WAKE (keepalive + DevTools), SAFE-UNIT
  (needs a failing `storage.local.set`), SAFE-REL-2 (brief-sanctioned): **justified**. SAFE-ACL-1: justified by the
  same rule as REL-2 (finding 11).

## Verdict

**FAIL** — two MAJOR findings (1: no restore on an aborted wave; 2: a pre-registered row fails `TAB_HELD` by wave
design). Both are fixable in the wave sheet / helpers before anything runs, without changing an expected text.
Findings 3–7 should be fixed in the same pass.

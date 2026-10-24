# S1 prep builder — report (Step 10, stage S1, Run 14 prep)

Builder: Opus 5.5, level 2, 2026-10-25, at `b016712`. No agent spawned, no commit, no Chrome action, no daemon. The
only live process: the redirect server, run locally for its threading check (below), stopped by its own PID.

## 1. What I did

1. **`docs/e2e-test-plan.md` §4.21** (new, after §4.20's dated notes; `git diff f45e3bf -- docs/e2e-test-plan.md`: 65
   added lines, **0 removed** — §4.20 untouched). Rows R14-5c, R14-POP-1, R14-3, R14-4b, R14-REL-3, each quoting its
   0.10 bullet verbatim, with steps, the expected text character for character, the pass rule and what is a RECORD;
   the framing rows: R14-PRE (pre-flight, read-only), R14-SRV, R14-PIN (the pinning gate, before any state change),
   R14-SETUP, **SAFE-0 as L1 with §4.20's text unchanged** (S1.2), R14-FOUND (found state + guard), R14-5c-ctl (the
   positive control before R14-5c), R14-RESTORE (S1.4), R14-LOGS (S1.6), R14-TEARDOWN. The STOP RULE sentence of the
   brief, verbatim. Expected strings were taken from the helpers' printing code and the product constants, and the event
   / log order re-read in code (`intercept.ts:278` before `:243`, #195): SAFE-0's daemon-log order is a record, not a
   clause.
2. **Helpers** (`recipes/s9*` only):
   - `s9-redirect.py`: `ThreadingHTTPServer` (daemon threads), one log line written whole under a lock; port 8083 (#197).
   - `s9.ts`: ops `navigate-class` (R14-REL-3: the class line, `scrubAll` on every printed line — own pages and
     fixtures too — and `rel-snap` expecting `BLOCKED:own` when `own=yes` or `hidden=blocked`), `download-file` (the
     SDK's `downloadToFile`, then `exists=… part=…`); commands `pop14` (claim a → owner line → CHECK, all before the
     click; trusted fallback only when no tab opened — S4-live-verifier finding 11), `r14-type` (k from the page; the
     banner record from the driver's poll file; `RERUN-DELAY`; the trusted follow-up `R14ok` and its value read back),
     `redirect-probe` (an idle socket held, then 2 concurrent GETs), `server-logs`, `rect-check`; `wait-safety --guard`;
     **every throw is now one `STOP: …` line, exit 2** (Run 13: `FAILED — …`, exit 1 for an escaped bridge error).
   - `s9-rules.ts`: `R14` constants, `r14Url`, `stopLine`, `urlClass`/`urlClassLine`/`CLASS_LINE_RE`/`scrubAll`/
     `classStepVerdict`, `placementVerdict`/`placementLine`/`overlapArea`/`sideBySide`, `followUpVerdict`,
     `bannerLifetime`/`bannerLine`, `rerunDelayMs`, `concurrentVerdict`, `logHits`/`serverLogVerdict`/`serverLogLine`.
   - `s9-win.ps1` (UTF-8 BOM kept): `Stop9` (lines begin `STOP:`), `Write-S9Raw` (every `Say9`/`STATE`/s9.ts line also to
     `$env:S9_RAW`), `Set-S9Pin -UiaOnly` / `$global:S9PinUiaOnly` (Invoke, else ExpandCollapse; never the mouse — the
     desk restore's unpin too), the `S9Geo` type (GetWindowRect, work areas, MoveWindow, an occluder count),
     `Set-S9SideBySide` (W 60 % / O 40 % of W's monitor work area, O then W to the front), `Test-S9Placement`
     (→ `s9.ts rect-check`), `Wait-S9OptionsStatus` (the page as shown, polled ≤ 2000 ms), `Invoke-S9PressWhenReady
     -BannerOut -BannerForMs -BannerPollMs` (20 s, 250 ms, never stops early, JSON samples; Run 13's behaviour kept
     without `-BannerOut`); `Read-S9StoredState` now proves the old page gone after about:blank and `Set-S9Omnibox`
     accepts about:blank (S4-live-verifier finding 7); `Test-S9FoundState -Row`, `Restore-S9Safety/All -Row` (row
     labels), `Restore-S9All` and the found-state guard print `STOP:` lines; `STATE` prints a non-empty list's sha256 as
     `withheld(non-empty)` (compared in memory).
   - **`s9-r14.ps1` (new): the block runner.** The PowerShell tool keeps no state (Run 13 needed a scratchpad wrapper),
     and #193 wants one stop procedure: each call runs one block, in order, with the globals in a Clixml file; a guard
     or any throw → `STOP: block <b>: …` → `Restore-S9All` → tabs/daemon/servers stopped → wave marked stopped, every
     later block refused (exit 3); exit 2 = write the ledger and RETURN. Pre-flight checks the prep commit, a clean
     tracked tree, dist = Step 9's (five sha256s, unchanged by my `npm run build`), no bridge MCP process, 9234 / 8080 /
     8081 / 8083, Chrome running. ASCII only (PS 5.1).
   - `recipes/test/s9-rules.test.ts`: 24 new tests (failing first: 20 red before `s9-rules.ts` had the rules, the other
     4 pin existing rules / files), incl. drift tests against `BLOCKED_URL_MESSAGE`, the fixture's `Open popup` link,
     `describeDebuggerError` → `DEBUGGER_DEVTOOLS`, `safety-match.ts`'s `WRAPPER_SCHEMES`, `s9-r14.ps1` (ASCII; waits
     for `optionsStatus`'s `Bridge armed.`), and the threaded server.
3. **Wave sheet** `S1-wave-sheet.md`: the STOP RULE (same words), its mechanics, gates, 15 blocks in order with exact
   commands, which rows need the pinned button (R14-3, R14-4b; none uses `Alt+Shift+K`), PIDs to track, restore and
   read-back, end-of-wave clean-up, the files to commit, the record template (L1 = SAFE-0).
4. **Runner brief** `briefs/S1-runner.md`: modelled on Run 13's; the STOP RULE (same words; md5 of the sentence equal in
   the brief, the sheet, §4.21 and my brief); pre-flight, PINNING RULE, found-state guard; the ESCALATION list, LESSONS,
   SPEC-DISCREPANCY PROTOCOL and INTEGRITY FLOOR byte-copied from `briefs/S1-verbatim.md` (each `diff`-equal to
   `briefs/common.md`). `<PREP>` is for the step agent to fill.

## 2. Files (the exact commit list)

`docs/e2e-test-plan.md`, `recipes/s9-redirect.py`, `recipes/s9-rules.ts`, `recipes/s9-win.ps1`, `recipes/s9.ts`,
`recipes/s9-r14.ps1` (new), `recipes/test/s9-rules.test.ts`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-wave-sheet.md` (new),
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S1-runner.md` (new),
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-builder.md` (new).
Not mine (the step agent's, modified/untracked before I started): `briefs/common.md`, `journal.md`, `S1.ledger.md`,
`briefs/S1-prep-builder.md`, `briefs/S1-verbatim.md`.

## 3. Checks (run 2026-10-25)

- `npx tsc --noEmit -p recipes/tsconfig.s9.json` → 0; `npm run typecheck` → 0.
- `npm test` → **2744 passed, 116 files** (before: 2720 / 116). n = +24, all in `recipes/test/s9-rules.test.ts`
  (35 → 59); no test removed.
- `npm run build` → 0; `git status --short` shows no tracked change from the build; dist sha256 before = after
  (daemon `99bb55c5…`, sw `5a2888f7…`, content `bcb20e28…`, offscreen `a8beec6c…`, options `f8b52058…`, mcp `27d68aac…`).
- `git diff f45e3bf -- docs/e2e-test-plan.md`: additions only (0 `-` lines).
- Redirect server, local, no Chrome: threaded (8083) `302 in 29 ms, 302 in 14 ms` → `CHECK … PASS`; HEAD's
  single-threaded copy (18083) `no answer in 5010 ms, no answer in 5008 ms` → FAIL (it served both only after the idle
  socket closed). Both stopped by PID; ports left in TIME_WAIT only. So the positive control discriminates.
- PowerShell: both `.ps1` parse with 0 errors; `s9-win.ps1` dot-sources and compiles `S9Geo` (work areas read:
  `[0,0,1920,1080] [1920,0,3840,1080]`); the placement JSON → `rect-check` path dry-run PASS/FAIL (`overlap 48x1080`);
  `s9-r14.ps1`: `status`, the order refusal (exit 3), a guard STOP in `preflight` (exit 2, stop procedure ran with
  nothing to restore), refusal after a stop (exit 3), `reset` — all in a scratch `S9_OUT`, no window touched.
  `s9.ts server-logs` on sample logs PASS, and its missing-file path prints `STOP: … (exit 2)`.

## 4. Untested-live guesses for the runner (read before the wave)

1. **The toolbar button is probably NOT pinned now.** Run 13 pinned it by mouse and unpinned it at the end (`pin false
   -> false`), and Run 13 measured that UIA cannot pin (no Invoke; `Expand()` → E_FAIL). So block 3 will most likely
   print `STOP: … HUMAN GATE (pinning) …`. **The step agent should ask the user to pin the button before spawning the
   runner** (then `PinnedBefore=true` and nothing is unpinned at the end).
2. W at 60 % of a 1920-px work area (1152 px): pinned extension icons are expected to stay visible; if Chrome moves
   ours into the puzzle menu, `Invoke-S9ActionButton` throws → STOP.
3. `GetWindowRect` includes the invisible resize borders; the split makes the rects touch (overlap 0). The occluder
   count (record only) may count a transparent overlay window.
4. `Test-S9Banner` walks W's whole UIA tree; a poll may take > 250 ms — the actual spacing is recorded (`max gap`).
5. R14-5c: the service-worker fetch is aborted after the 8081 response headers. If Chrome logs that fetch in the
   worker's console with its URL, S1.6's console counts (`localhost:8081`, a fixture `://`) are not 0 — see proposed
   decision 5.
6. The python `http.server` log is on stderr (`http8081.err`); `logHits` matches `?s14=5c2` followed by a space.
7. The trusted follow-up `type` replaces the input's value (focus + select-all), so the reporter is `value === "R14ok"`.
8. Chrome's resolution of `view-source:/options.html` is unknown (Run 13: not an own page by the extension's own
   detector); the class line shows it without a URL.
9. A Chrome window's last size is remembered: after the wave, the user's next new window may open at W's 60 % size.

## 5. Deviations

- R14-3's page read: polled ≤ 2000 ms after the armed title (SAFE-3 read once, ~400 ms later). Written before any
  measurement; a FAIL gets one supplementary read (O to the front, RECORD) as Run 13 did.
- `recipes/README.md` does not list `s9-r14.ps1` or the new commands (outside my lane): a docs item for S8 / the
  propagator.
- The STOP procedure also ends the tabs, the daemon and the servers (beyond the sentence's restore + ledger), so a stop
  leaves no orphan; the sentence itself is unchanged.

## 6. Proposed decisions (decisions.md format, By: Claude unless noted)

1. **2026-10-25 · Run 14 runs through a block runner with the stop procedure in code.** Decided: `recipes/s9-r14.ps1`,
   one block per call, globals in Clixml, every guard/throw → `STOP:` → `Restore-S9All` → clean-up → later blocks
   refused. Why: the PowerShell tool keeps no state, and #193 needs one rule applied mechanically. Rejected: Run 13's
   ad-hoc scratchpad wrapper. Revisit if: a block is too long for one tool call.
2. **2026-10-25 · Every `s9.ts` throw is a STOP (exit 2).** Was exit 1 `FAILED — …` for an escaped bridge error. Why:
   #193's "any throw". Rejected: keeping exit 1 (a throw could pass as a row FAIL).
3. **2026-10-25 · A non-empty block list's sha256 is never printed.** The STATE line prints `withheld(non-empty)`;
   the comparison stays in memory. Why: the hash of a short list of the user's own sites can be guessed back; the
   found-state guard stops on a non-empty list anyway. Stricter only. (Contract-adjacent: S1.4's "sha256 … none
   printed" — the step agent may want it under Open decisions.)
4. **2026-10-25 · R14-3 polls the options page ≤ 2000 ms; R14-POP-1's trusted fallback only when no tab opened;
   R14-REL-3's `rel-snap` runs on `own=yes` too, and an `ok` there escalates.** Pre-registered here, before any run.
5. **(for the step agent / user) 2026-10-25 · S1.6's console clause and Chrome's own entries.** S1.6 says 0 for the
   test patterns in the worker console. If Chrome itself logs the aborted R14-5c fetch with its fixture URL, the rule as
   written FAILS on a line that is not the bridge's (Run 13's SAFE-10 rule tolerated Chrome's own entries as
   `CONSOLE-HIT`). I wrote S1.6 as stated (no loosening); a decision is needed only if it happens.
6. **2026-10-25 · Pinning: one UIA-only attempt before the gate.** Decided: `Set-S9Pin -UiaOnly` once, never the mouse;
   failure → the human gate. Why: the brief's "if UI Automation cannot pin it"; Run 13 measured it cannot.

## 7. Gotcha candidates

- about:blank exposes no document URL through UIA (`RootWebArea` absent/empty): Run 13's every stored read printed
  "did NOT reach about:blank" and never proved a fresh page (S4-live-verifier finding 7); now handled in `Set-S9Omnibox`
  / `Read-S9StoredState`.
- Python's `http.server` CLI is threaded, but a script using `HTTPServer` is not: one idle keep-alive connection
  blocks it (measured above: both requests answered only after the idle socket closed).
- PowerShell functions that `return` a value pollute callers that ignore it (`Set-S9Omnibox` must stay void: callers
  write `Set-S9Omnibox …; $h`).

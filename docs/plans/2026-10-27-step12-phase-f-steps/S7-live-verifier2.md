# S7-live fix round 2: verifier

Model Opus 5.5, effort medium. Read and run only. No edit outside this report, no commit, no Chrome, no live run, `wtv` not read.
Audited: `recipes/s12-win.ps1` (uncommitted, +9), `recipes/test/s12-title.test.ts` (new), against the evidence
`S7-live-evidence-liveA19-att2.txt` and the fixer's claims (`S7-live-fixer2.md`). This is S7-live's fix round 2 of 3 (agent-rules §7).

## 1. Verdict
**PASS-with-notes** (no CRITICAL or MAJOR; three NITs and one MINOR residual risk, §6).

## 2. Outputs (commands I ran, 2026-10-29)
- `npm test`: `Test Files 233 passed (233)`, `Tests 5576 passed (5576)`. Matches the fixer's after-count (+1 file, +6 tests).
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0. The new test is typechecked by
  `tsconfig.s6.json` only (`--listFiles`: 1 hit there, 0 in the other six).
- `recipes/s12-win.ps1` stays ASCII: 0 bytes above 127. Index and working copy both LF (`git ls-files --eol`: `i/lf w/lf`), so no mixed endings.
- The main tree was not touched: `git diff -- recipes/s12-win.ps1 | sha256sum` = `61b0782f…429dda` before and after my mutant runs (all
  mutants ran on copies in my scratchpad; see §2.2).

### 2.1 (e) Red without the change
The test, copied to the scratchpad with `REPO` read from an env var and run against copies of s9/s10/s11/s11b-win.ps1, the s12 fixtures and
`git show HEAD:recipes/s12-win.ps1`: **`Tests 2 failed | 4 passed (6)`** (the fixture-titles-return-themselves test and the static tie). With
the working-tree file: `6 passed (6)`. This matches the fixer's red/green claim.

### 2.2 (e) Mutants (each one a copy of the fixed file, same harness)
| # | Mutant | Result | Killed by |
|---|---|---|---|
| 0 | the alternation replaced by the wildcard `S12 .*` | 3 failed | near misses; static tie; no-wildcard |
| 1 | `\|S12 [a-z ]+` added to the alternation | 2 failed | near misses; no-wildcard |
| 2 | `S12 chooser frame` dropped | 2 failed | titles-return-themselves; static tie |
| 3 | `S12 console fixture` dropped | 2 failed | titles-return-themselves; static tie |
| 4 | delegation broken (`'<other window>'` instead of the prior function) | 1 failed | old titles unchanged |
| 5 | the capture line removed (`& $null`) | 2 failed | near misses; old titles unchanged |
| 6 | ` - Google Chrome` made mandatory | 1 failed | titles-return-themselves |
| 7 | `^` anchor removed | 1 failed | near misses (`xS12 console fixture`) |
| 8 | `$` anchor removed | 1 failed | near misses (doubled suffix, `fixtureX`) |

All 9 killed, including the 4 the brief names (0/1, 2/3, 4/5, 6).

## 4. Deviations
None from the brief. The mutants ran on scratch copies rather than by editing the main tree and restoring it (the brief allowed either); the
main tree's diff hash is unchanged (§2).

## 5. Proposed decisions
None.

## 6. Findings

### (a) The diagnosis holds
- **44303224 is W.** Evidence line 21: `LEG S11 open: my check window 44303224 ...`; line 24: `WINDOW W is 44303224`. Its banner samplers
  passed `Assert-S11Own` earlier in the same wave (line 128/130 R19-BANNER-CTL, line 233 R19-CON-MCP).
- **The title is the only failing check.** `Test-S9Live` (`recipes/s9-win.ps1:1052-1067`) is an `elseif` chain: not recorded → class →
  chrome.exe owner → owner pid → title. Line 263 prints `(title not one of the wave's own)`, so recorded-at-open, class, owner and pid all
  passed and only `Format-S9Title` returned `<other window>`. No other cause is in the evidence.
- **Why the neg sampler passed and the pos one stopped.** `Invoke-S11Sampler` (`recipes/s11-win.ps1:78-79`) asserts before waiting on its
  `-sample.ready` signal. The neg step's assert ran when the block started (W still on the kept `bc` playground tab from R19-BANNER-CTL,
  `s12-r19-a.ts:548`, title known). Then `conBanner` (`s12-r19-a.ts:569`) opened `s12-console.html` with `active=true` (`Ctx.open`,
  `s12-r19-a.ts:171`, `c.newTab(url, {active})`). The neg pass then sampled (line 262, `polls=17`), and the pos step's assert at 22:46:03.203
  met W titled after `<title>S12 console fixture</title>` (`test-fixtures/s12-console.html:9`), which s11's pattern does not list (it has
  `S11 [A-Za-z ]+` but no `S12`). The title text itself is withheld from the evidence, as it should be, so the exact string is inferred: the
  only active-tab change in W between the two asserts is conBanner's tab, and the page sets no `document.title` (grep of `test-fixtures`).
- **The fix would have prevented it.** After `s12-win.ps1`, `Format-S9Title 'S12 console fixture - Google Chrome'` returns the title
  (my run, check B). Test-S9Live then returns true, `$global:S11Own` already holds W, so `Assert-S11Own` passes. The suffix form is the one
  Chrome used in this run: the playground title passed with the same optional ` - Google Chrome` group.

### (b) Guard strength: not weakened beyond three exact fixture titles
- The override (`recipes/s12-win.ps1:15-19`) adds only `^(S12 console fixture|S12 chooser fixture|S12 chooser frame)( - Google Chrome)?$`
  and delegates everything else to the captured prior function. No wildcard. This is the pattern s10-win.ps1:21 and s11-win.ps1:16 already
  set for their own fixtures.
- **Every other title is unchanged.** My PS 5.1 run captured the prior function before dot-sourcing s12-win.ps1 and compared both on 10
  inputs: the options title with a real U+2014 (`Chrome Agent Bridge — Options - Google Chrome`, matched by s11's `.`), case variants,
  a trailing newline, `S11 anything goes`, `DevTools - x`, the empty string, `Inbox`, `about:blank - Google Chrome`, `S10 SAVE fixture`.
  Result: `nonS12 differences: 0`.
- **Dynamic scoping works.** `DevTools - chrome-extension://$S9Id/sw.js` still returns itself through the delegation (check A), so the
  prior function still reads `$S9Id` from the caller's scope. A call from inside a function scope also works (check G).
- **Re-dot-sourcing.** The `$global:S12PriorFormatTitle` guard is correct. In practice a second dot-source of s12-win.ps1 throws earlier,
  on the existing `patch of Set-S9Omnibox did not match exactly once` (pre-existing, not from this change), so no runner does it. Only
  s9/s10/s11/s12-win.ps1 define `Format-S9Title`. s12-win-b/-c.ps1, s11b-win.ps1 and the Run 17 functions that `s12-r19.ps1:54` re-creates
  from `s11b-r17.ps1` do not redefine it. Dot-sourcing s11-win.ps1 again after s12 would only drop the override, which fails safe.
- **A user's window.** Test-S11Own needs `$global:S11Own[hwnd]`, plus Test-S9Live's `$global:S9WinIds[hwnd]` recorded at open time, the
  `Chrome_WidgetWin_1` class and the recorded chrome pid. A user's window carrying one of these titles fails "not recorded at open time".
  The only remaining path is a window the wave opened and recorded that now shows a user's tab titled exactly like a repo fixture. That
  path already exists for every title s9/s10/s11 accept, and is negligible.
- **NIT-1** `recipes/s12-win.ps1:17`. `-match` is case-insensitive and `$` matches before a final `\n`, so `s12 CONSOLE fixture` and
  `S12 console fixture\n` are accepted (checks C, D). That is the same as the s9/s11 patterns, and the test's near-miss list has neither, so
  "Exact titles only" overstates it slightly. Suggested: leave it, or use `-cmatch` with `\z` if exactness matters (and add both to the
  near-miss test).
- **NIT-2** `recipes/s12-win.ps1:2`. The header still says "(it loads none; it edits none)" while the file now overrides `Format-S9Title`
  (as it already overrode `$S11SampleTailMs`). Suggested: name the override in the header.

### (c) Run 18's runner: harmless
`recipes/s12-r18.ps1:46-49` dot-sources s9, s11, s11b, s12 in the same order, so the override applies there too. No s12-r18*.ps1 file
references a title or relies on a refusal (grep: only `Test-S9Live $global:D` at `s12-r18-lib.ps1:136`, a DevTools window, unaffected).
In Run 18 the change can only let the restore close or type into a *recorded* window that shows an S12 fixture, which it would previously
have left open. Run 18 is closed. Its tests pass in the full run (5576/5576).

### (d) Later slices: no remaining unknown title found in W or X
I checked every page the B/C/DE drivers open with `active=true`, and every page shown in a wave window (W, X = `R19Xk`, the file window,
the options window). Each title is known:
- **liveA19's remaining rows.** `refuseRow` (`s12-r19-a.ts:381`) opens s12-console active, also on `s12blk.localhost` before the block is
  added: now known. `args3` opens the playground active (known). `conFrame`/`conNoteA`/`conFloor` open inactive tabs. CON-OWN/FILE use
  separate windows (options `Chrome Agent Bridge — Options`; the file window's title is `S11 …` by `s11b-win.ps1:78`).
- **liveB19.** `keep2` (`s12-r19-b.ts:237`) opens s12-console and s12-chooser active (both now known; **without this fix KEEP-2's
  `Invoke-R19Timeline` assert, `s12-r19-b.ps1:15`, would also have stopped**). `keep3` opens s12-console (`:264`). X (`Open-R19Xk`) shows
  s12-console for DEVPROBE, KEEP-3, KEEP-4 and SWEEP-HELD, and s11-upload for UP-DEVT. X is navigated to s12blk console, the options page
  and s11b-file. All known now. Before the fix, `Close-R19Xk`'s `Test-S11Own` would have left an s12-console X open.
- **liveC19.** X shows s12-chooser (`s12-r19-c.ps1:88,92,98,104`, now known) or the playground (`:138`). `s12-r19-c.ts:351` opens
  s12-chooser and s11-upload inactive, and `:427` opens the playground active. All known.
- **liveD19/E19.** `s12-r19-de.ts:56,82` open s12-chooser inactive. The proof tab (`s12-r19.ts:128`) opens inactive.
- **The only fixture title still unknown** is `Agent Bridge E2E Playground (CSP)` (`test-fixtures/e2e-playground-csp.html:12`; s11's
  pattern ends at `Playground( - Google Chrome)?$`). It is opened only by `argsCsp` (`s12-r19-a.ts:267`), inactive and alone in its row,
  and closed at the row's end. W never shows it, so it stops nothing as written.
- **MINOR-1 (residual risk, not established)** `s12-r19-b.ps1:104-109`. KEEP-3 `nav-blocked` navigates X by the omnibox to
  `s12blk.localhost` while that host is on the block list. If Chrome showed an error page there, X's title would be the host name, which is
  unknown. The timeline asserts only at its start, so this would not stop the row there. But `Close-R19Xk` would leave X open, and that
  shows up later as a window-count STOP. Per the root `CLAUDE.md`, Step 11b's DNR rules are installed only while a bridge
  navigate/newTab/back/forward/downloadStart runs, so a human omnibox navigation should load the page. I did not measure it. Suggested:
  nothing now. If liveB19 reports X "not live and the wave's own - not closed" after `nav-blocked`, this is the cause to check first.

### (e) Tests
Covered in §2.1–§2.2. **NIT-3** `recipes/test/s12-title.test.ts:40-43`. The static tie uses `toContain`, so a title left only in a comment
would satisfy it. The runtime test catches that case (mutant 3), so this costs nothing as long as powershell.exe is present. On a host
without it (the Linux copy), the 4 runtime tests skip and only the static pair runs.

## 7. Handoff
No processes left running (each powershell.exe and vitest call ran in the foreground and exited). Scratch files are only under my
scratchpad (`…\scratchpad\m\`, `chk.ps1`, `chk2.ps1`). Commit: `recipes/s12-win.ps1`, `recipes/test/s12-title.test.ts` with verdict
PASS-with-notes. NIT-1/2/3 and MINOR-1 need no fix round.

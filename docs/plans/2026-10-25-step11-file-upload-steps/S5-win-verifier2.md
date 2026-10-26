# S5-win verifier report, round 2 (Step 11, Run 16: the Windows UI Automation helpers)

Model: Claude Opus 5.5. Start 2026-10-26T03:29:49Z, end 2026-10-26T03:37Z (`date -u`). Scope: the affected items of
round 1 (`S5-win-verifier.md`), the fixer's claims (`S5-win-fixer.md`) and the code the fix added. Layers read:
agent-rules §6, §4.23 lines 1445–1552 (rows UP-FA, UP-6, UP-1, UP-6B, UP-RACE-A/B, UP-RESTORE), decisions #223, #278,
`recipes/s11.ts:346-378, 735-770, 869-884`, `recipes/s11-rules.ts:184-189`, the s9/s10 helpers called
(`Format-S9Title`, `Test-S9Live`, `Invoke-S9ActionButton`, `Click-S9Element`, `Wait-S9ActionTitle`, `Park-S9Cursor`,
`Set-S9Omnibox`, `Wait-S10StableWindows`, `Open-S10MarkedWindow`), `extension/src/options.ts:65-78`.
Nothing ran against Chrome: no UIA, no daemon, no reload, no launch. `netstat -ano | grep 9234`: empty at 03:29Z and
at 03:36Z.

## 1. Verdict
**PASS-with-notes.** MAJOR-1 is closed. Every round-1 MINOR is closed. MINOR-9's "New Tab" half is left open as a NIT.
New: one MINOR (a scanner blind spot; the real file is clean) and four NITs.

## 2. Every-stage checks (re-run by me)
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p recipes/tsconfig.s11.json`: exit 0. `npm run build`: exit 0,
  `built extension → dist/`.
- `npm test`: `Test Files 150 passed (150)`, `Tests 3746 passed (3746)`. This matches the fixer's claim (3738 → 3746).
- ParseFile: `errors=0 tokens=4785`. `wc -l recipes/s11-win.ps1` = 451 (the cap is 500). `file`: ASCII, CRLF.
- `git status`: only the lane files, plus `journal.md` and `tsconfig.s11.json`, which were modified before this
  round. I edited nothing in the repo except this report.
- The test that runs PowerShell code (`s11-win-static.test.ts:214-241`) extracts only the text of `Add-S11Line` and
  `Get-S11Lines`, two pure string functions. It runs them in `powershell -NoProfile -NonInteractive -Command` and
  never dot-sources the file. The other spawn is `Parser::ParseFile`, which parses and does not execute. Neither
  makes a UIA call or touches the desktop.
- Scratch copy for mutations: `<scratchpad>/v2/sw`, with control `47 passed (47)` (22 + 25). After the run it is
  byte-identical to the repo file (`cmp`).

## 3. Round-1 findings

| # | Status | Evidence |
|---|---|---|
| MAJOR-1 sampler | **closed** | `s11-win.ps1:88-92`: after `-sampled.ready` it polls `Test-S9Banner` for `$S11SampleTailMs = 4000` (`:30`), then answers (`:94`). The line reports polls after the reply (`:95`). The tail starts when the stop file is seen, which is after the reply, so the 4 s after the reply are covered. The actor waits `30_000` ms for `-sampled.pressed` (`s11.ts:369`). 4 s plus one or two passes fits. Mutants A (answer before the tail), B (tail without `Test-S9Banner`) and C (`4000`→`400`) are caught. C2 (the loop bound multiplied by 0) is missed: NIT-N2. |
| MINOR-1 race A timing | **closed** (NIT residual) | The pin and title checks and the park-cache warm-up run before `Wait-S11Ready` (`:372-375`). The first press waits until `t0+1500` (`:328`). The second press waits until `p1+GapMs`, measured from just before press 1 (`:329-331`). This matches the sheet's "1.5 s after the ready signal, pressed again 1.6 s later" (sheet row UP-RACE-A) and #278. Residual: each press lands one `Find-S9ActionButtons` (a FindAll over buttons) plus `Click-S9Element`'s foreground/FromPoint after its mark. So the 1.6 s gap holds, and both presses run late by the same unmeasured amount: NIT-N3. Mutants E (ignores `-At`) and F (gap after the title wait) are missed by the tests: NIT-N2. |
| MINOR-2 now.json, `-Btn` | **closed** | `:440-441` writes the `BoxState` shape (`s11-rules.ts:184-189`, read by `s11.ts:870-872`), as UTF-8 without a BOM. `-Btn` is `[Parameter(Mandatory)]` (`:429`). Mutant K is caught. |
| MINOR-3 Add-S11Root, UP-7-c | **closed** | `Add-S11Root` (`:256-260`) runs Assert, sets `S11RootText`, then a verified save. `UP-7-c` throws on an empty rooted text (`:359`). Mutant J is caught. Mutant M (Assert removed from `Add-S11Root`) is missed, because `Add-S11Root` is not in the "every window … Assert-S11Own" list (`static.test.ts:147`): NIT-N2. |
| MINOR-4 restore test | **closed** | `static.test.ts:156-167` pins `$equal = ($got -eq $want)`, the STOP, the four-field `$page`, `$ok = $page -and $daemon -and $title` and the Set-S11Flag read-back. The fixer's mutants match the round-1 M8, M8b and M9. |
| MINOR-5 scanner | **closed** (new gap, MINOR-N1) | My mutants run through `scanPs1Output` on the real file (control `[]`) are caught: `Write-S9Raw $ft`, `[Console]::WriteLine($ft)`, `$ft \| Out-File`, `$bt \| Write-Host`, `$lines = Get-S11Box …; Say9 "n $lines"`, and `-f` and `+` concatenation. **Function-line fix:** I patched a copy of the rules to the old "skip any `function` line" rule. On `function Show-X { Say9 "t $ft" }` and `function Show-Y([long]$Hwnd) { Write-S9Raw $bt }`, the current scanner reports 1 violation each and the old rule 0. A clean one-line function (`Get-S11Lines`) gives 0 under both. So the fix discriminates. |
| MINOR-6 outside the repo | **closed** | I ran the extracted `Assert-S11Outside` in PowerShell with `$S9Repo` set to the repo. Refused: `docs\x` (relative), the forward-slash path, the mixed-case path, the repo root. Allowed: `chrome-remote-extention2\x`, and `..` paths that leave the repo. The message carries no path. The returned full path is what `Save-S11Found` (`:220`) and `Invoke-S11Opt` (`:267`) then write to. Mutant P is caught. Mutant H (the prefix check neutered) and mutant O (the guard's return ignored) are missed by the tests: NIT-N2. |
| MINOR-7 double count | **closed by reading** (unmeasured live) | `:141` drops a Text whose ControlView parent is a ListItem matching the same regex. `options.ts:69-77` sets each `<li>` by one `textContent`, so there is a single Text child directly under the ListItem. Whether the `<li>` is named or not, each item counts once. The live UP-OPT counts remain the fixer's open item. Mutant I is untestable offline. |
| MINOR-8 pair end state | **closed** | `:333-334`: a title wait, then a STOP and `$false` unless the title equals `$S9TitleArmed`. Mutant N is caught. |
| MINOR-9 Chrome launch | **closed** | `:113`: `Get-Process chrome` runs on every call, before `Open-S10MarkedWindow` (the only `Start-Process`, `s10-win.ps1:343`). Mutant G is caught. What remains is the gap between the check and the start, and a chrome.exe of another profile counting as "running": NIT. |
| MINOR-9 titles | **closed in part**; "New Tab" is **NIT-N4** | `:17` replaced `Extensions - [A-Za-z ]+` with `Extensions - Chrome Agent Bridge` and replaced `.* Options` with `. Options`. Still matched: `Extensions`, `about:blank`, `New Tab` (all inherited unchanged from s9/s10 `Format-S9Title`, `s9-win.ps1:201-202`, `s10-win.ps1:22-23`), and `S11 [A-Za-z ]+`. |
| NIT-1…5 | closed | NIT-1: `readerReadsOnly` runs on the real body and two mutated bodies (`static.test.ts:41-65`). NIT-2: the trailing-space and trailing-blank-line cases, with a PowerShell vs `addLine` byte-for-byte check. NIT-3: `-eq $S9TitleArmed` (`:320, :334, :443`). NIT-4: `'-1'` (`:162`). NIT-5: the sleep and the comment. |
| NIT-6 | guidance only | unchanged, as the fixer said. |

## 4. New findings

**MINOR-N1: the scanner does not know `Get-S11FoundText`, and misses three ways to write a file.**
- `TEXT_CALLS` (`s11-win-rules.ts:123`) lacks `Get-S11FoundText`, which returns the user's found text. Two mutants
  pass with 0 violations: `Say9 "x $(Get-S11FoundText 'blocklist')"`, and a bare `Get-S11FoundText 'blocklist'` left
  in the pipeline.
- `SINK` (`:125`) lacks `Write-S11Pressed` (it writes a signal file the actor reads), `[IO.File]::WriteAllText` and
  `Tee-Object`. `[IO.File]::WriteAllText((Join-Path $S9Repo 'x.txt'), $ft, …)`, `Write-S11Pressed 'UP-0' $ft` and
  `$ft | Tee-Object …` all pass.
- A plain alias (`$lines = $ft; Say9 "n $lines"`) passes. This is inherent to a name-based scan.

The real file is clean. Every `Get-S11FoundText` call (`:258, 268, 352, 357, 376, 436, 437`) is assigned or passed as
an argument. The two `WriteAllText` writes of found texts go to `$Dir`, which `Assert-S11Outside` has normalised. Every
`Write-S11Pressed` content is `done`, `seen` or `none`.
Command: `npx tsx <scratchpad>/v2/scan-mut.ts` (output above, excerpt: `MISSED Get-S11FoundText printed`, `MISSED
WriteAllText into repo`, `MISSED Write-S11Pressed with text`, `MISSED Tee-Object`).
Fix: add `Get-S11FoundText` (and `Add-S11Line`) to `TEXT_CALLS`, and add `Write-S11Pressed`, `WriteAllText` and
`Tee-Object` to `SINK` with an allow-list for the known file writes.

**NIT-N2: the static test has gaps (the code is correct; I read each site).** The tests miss these mutants:
- C2: the tail bound multiplied by 0.
- E: `-At` ignored.
- F: the gap measured after the title wait.
- H: the `Assert-S11Outside` prefix check neutered.
- L: `.*` added to the title regex.
- M: `Add-S11Root` without Assert.
- O: `Assert-S11Outside`'s return value ignored.

The command was `node <scratchpad>/v2/mut.cjs`: 10 caught, 7 missed. Fix: run the extracted `Assert-S11Outside` in a
spawned PowerShell, as the `Add-S11Line` test does; add `Add-S11Root` to the Assert list; pin the `-lt $At` wait and
the `- $p1` gap lines; assert that the title regex has no `.*`.

**NIT-N3: timing residuals, worth recording in the wave rather than fixing.**
- (a) Race A: each press runs one UIA button find plus the click guards after its mark (`s9-win.ps1:360-367, 389-401`).
  The cursor-park cache was warmed before ready only for the current W rect.
- (b) The sampler's tail runs to at least 4 s plus one pass. A banner first seen in a pass that started just before
  4 s still counts as "within 4 s" for UP-1, which slightly favours PASS. The banner comes with the attach, before the
  reply, so the practical effect is nil.

The runner should record `polls` and `after the reply` from the SAMPLER line.

**NIT-N4: the "New Tab", `about:blank` and bare `Extensions` titles (MINOR-9, left open).** For a user's window to be
taken as the wave's own, three things must happen at once:
1. a window the wave recorded (`$global:S11Own`, `S9WinIds`) has closed;
2. Windows reuses its exact HWND for a new window of the same chrome.exe browser process;
3. that new window shows one of these titles.

This is the scheme accepted in s9 and s10 (#223 adds the marker at open time, which s11 uses). I rate it NIT, not
MINOR. Fix, if wanted after the live look: drop `New Tab` once Run 16 shows that no wave window ever carries it, and
record each window's title at open time (in `Open-S11Window`) as #223's reasoning suggests.

**NIT-N5:** `Restore-S11Safety` continues ("restoring the rest", `:432`) after `Test-S11ButtonReady` or
`Invoke-S11ButtonPair` has printed a `STOP:` line. This is correct under §6 (the runner restores, then returns on any
STOP line). The runner's sheet should say that a STOP printed during the restore still ends the wave.

## 5. Security and guards on the new code
- `Add-S11Root`, `now.json` and the mandatory `-Btn` print nothing secret.
- `now.json` holds hashes and goes to `$S11Out`, which `Save-S11Found` checked as outside the repo. `Restore` returns
  early unless `S11Found` exists, so that check has run.
- No toggle is pressed: `.Toggle(` appears nowhere, and `TogglePattern` and "file URLs" appear only in the reader
  (test `(a)`).
- The guards come before input. `Add-S11Root` asserts first. `Invoke-S11ButtonPair` asserts before any press.
  `Invoke-S11Race` B reaches the window only through `Set-S11Box`, which asserts. The token is not named in code (the
  static test).

## 6. Proposed decisions
None.

## 7. Handoff
Nothing is running. Port 9234 is free. My scratch files are in `<scratchpad>/v2` (`scan-mut.ts`, `fn-skip.ts`,
`rules-old.ts`, `mut.cjs`, `aso.ps1`, `sw/`, and the logs `typecheck.log`, `tsc11.log`, `test.log`, `build.log`). The
scratch copy uses no `node_modules` junction. The live items for Run 16 are the UP-OPT item counts (MINOR-7), the
titles windows actually carry (NIT-N4), and the press offsets (NIT-N3).

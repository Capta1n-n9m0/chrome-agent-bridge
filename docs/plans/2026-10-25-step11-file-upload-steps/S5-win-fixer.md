# S5-win fixer report (Step 11, Run 16: Windows UIA helpers)

Model: Claude Sonnet 5.5, effort medium. Start 2026-10-25T21:46Z, end about 22:10Z. Context use about 150k tokens. Nothing ran against Chrome (no UIA, no daemon, no reload, no launch); port 9234 untouched.

## 1. Verdict
DONE. Every finding is fixed; none was disputed. Each NIT is fixed or has a reason below.

## 2. Outputs
Files: `recipes/s11-win.ps1`, `recipes/s11-win-rules.ts`, `recipes/test/s11-win-static.test.ts`, `recipes/test/s11-win-rules.test.ts`. Uncommitted.
- `wc -l recipes/s11-win.ps1`: 412 → 451 (cap 500). ParseFile: `parse errors=0`. The file is ASCII.
- `npm test`: 3738 → 3746 passed (150 files). `npm run typecheck` is clean, `npx tsc --noEmit -p recipes/tsconfig.s11.json` exits 0, `npm run build` is clean.
- The s11-win tests went from 39 to 47 (22 rules + 25 static).

## 3. Findings
- **MAJOR-1 fixed.** `Invoke-S11Sampler` keeps polling `$S11SampleTailMs = 4000` after the reply signal, then answers. The line reports the polls after the reply. The static test checks the order: stop signal, then the Test-S9Banner tail, then the answer.
- **MINOR-1 fixed.** Race A's pin and title checks (`Test-S11ButtonReady`) and `Park-S9Cursor` now run before ready. The first press lands at ready + 1.5 s (`-At`). The second press is `$GapMs` (1600) after the first press's timestamp. Race B computes found and alias before ready. Not measured live.
- **MINOR-2 fixed.** `Restore-S11Safety` writes `now.json` in the `found.json` shape, for `s11.ts restore-check --found found.json --now now.json`. `-Btn` is mandatory. The unneeded 1500 ms sleep is gone (NIT-5).
- **MINOR-3 fixed.** New `Add-S11Root` (liveB; it sets `S11RootText`, then does a verified save). `UP-7-c` throws when the rooted text is empty.
- **MINOR-4 fixed.** The static test asserts the `$equal = ($got -eq $want)` line, the STOP on a mismatch, `$equal` as the return value, and the `$page` clause over all four fields. It also asserts `$ok = $page -and $daemon -and $title`, the RESTORE FAILED STOP, and the Set-S11Flag read-back.
- **MINOR-5 fixed.**
  - The scanner's sinks now include `Write-S9Raw`, `[Console]::Write/WriteLine/Error`, `Out-File`, `Add-Content` and `Set-Content`. A pipeline into a sink is scanned from its start.
  - A text call assigned to a name on the safe list is refused.
  - A one-line function's body is now scanned. The old rule skipped any line starting with `function`, which hid M5 and M7 (found while mutating, not in the verifier's report).
  - The safe list gained `post`.
- **MINOR-6 fixed.** `Assert-S11Outside` uses `GetFullPath` and an OrdinalIgnoreCase prefix check. It guards the Save-S11Found `$Dir` and `$S11Out`, and the `Invoke-S11Opt` `$ObsJson`. It throws without a path in the message.
- **MINOR-7 fixed.** `Find-S11Texts` drops a Text whose parent ListItem also matches. This is untested on Chrome 156 and needs a live look at the UP-OPT item counts.
- **MINOR-8 fixed.** `Invoke-S11ButtonPair` ends with a title check against `$S9TitleArmed` and returns `$false` with a STOP on a mismatch.
- **MINOR-9 fixed, in part.**
  - `Open-S11Window` checks `Get-Process chrome` on every call and never launches Chrome.
  - The titles are tightened to `Extensions - Chrome Agent Bridge` and `Chrome Agent Bridge . Options`.
  - "New Tab" is kept. A freshly opened wave window may show it, and I could not measure that offline. `Test-S9Live` still requires the recorded pid, the class, chrome.exe and the Format-S9Title match. If you want it dropped, that needs a live check first.
- **NIT-1 fixed.** The toggle test now runs one `readerReadsOnly()` check on the real body and on two mutated bodies (`.Toggle()` and an InvokePattern call).
- **NIT-2 fixed.** `addLine` tests added for trailing spaces and trailing blank lines (LF and CRLF). A new test runs the PowerShell `Add-S11Line` and `Get-S11Lines` (extracted, in a spawned powershell) against `addLine` and `lineCount` on 10 cases, byte for byte. This catches M12 on the PowerShell side.
- **NIT-3 fixed.** The checks now compare `-eq $S9TitleArmed`, so the "armed, JavaScript off" title no longer passes.
- **NIT-4 fixed.** The count defaults to `-1` when there is no summary.
- **NIT-5 fixed.** The sleep is removed and the stale `$Btn` comment on `Invoke-S11Row` corrected.
- **NIT-6 not changed.** This is guidance to the runner: do not print `$_` from these helpers. Our own throws carry no paths.

## 4. Mutation results
Scratch copy in the scratchpad; the node_modules junction was removed with `cmd rmdir`, and the main `node_modules` is intact.

| Mutant | Static tests |
|---|---|
| Control | 25 pass |
| `Write-S9Raw $ft` | caught |
| `[Console]::WriteLine($ft)` | caught |
| `$ft \| Out-File` | caught |
| A text call into the safe-listed `$lines` | caught |
| STOP on read-back mismatch removed | caught |
| `$equal = $true -or …` | caught |
| `$page = $true -or …` | caught |
| `.Toggle()` in the reader | caught (2 tests) |
| Sampler tail set to 0 | caught |
| Sampler tail loop removed | caught |
| `-Btn` optional | caught |
| ObsJson guard removed | caught |
| `Add-S11Line` trims the found text | caught |

## 5. Deviations and proposed decisions
No deviations. No proposed decisions.

## 6. Handoff
Nothing is running. A fresh verifier should re-check MAJOR-1, MINOR-1 (a code reading only) and the scanner change. The live items are the UP-OPT item counts (MINOR-7) and the "New Tab" title.

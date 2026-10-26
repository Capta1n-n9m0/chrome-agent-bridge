# S4-helpers fixer 3

Opus 5.5, medium, 2026-10-27. Fix round 3 of S4-helpers, against `S4-helpers-verifier3.md`. Lane: `recipes/s11b*`, `recipes/test/s11b-*`. Nothing drove Chrome, the daemon or a port. Layer followed: the sheet's §4.24 (RD-7, F-FILETAB) over the brief.

## Findings fixed

### m3-1 · RD-7: the console is probed just before the tab, and a loss at the CTX read is FALLBACK

`$Blocks['rd7']` in `recipes/s11b-r17.ps1` now runs as follows:
1. The fixer-2 guard (unchanged). If FALLBACK is already set, RD-7 prints NOT RUN and returns.
2. **The probe.** `Read-R17Rules` runs, then `R17Fallback` is checked again. If the probe fell back, the same `ROW RD-7 NOT RUN - …` line prints, `S16NM++` counts it, and the block returns. This happens before `New-R17Tab`, the navigate and every call.
   - The probe types nothing but what `B17 rules --expr` builds (pattern-checked by `preTypeCheck`), plus the console contract's own `S11B-MARK` marker. It goes through `Invoke-S11bConsoleEval $global:D 'rules' @() @('--expect', '0')`.
   - Before the tab no row call is in flight, so a `RULES` above 0 at the probe is a real stuck rule. It is the existing `rules-stuck` STOP.
3. At the CTX read, `if ($c -eq 10) { $global:R17Fallback = $true }`. A console lost there now counts as FALLBACK for every later row.
4. **NIT n3-2.** The CTX NOT MEASURED line now reads `CTX NOT MEASURED (see the line above)`, which is right for both the tabs=0 case and the no-line case.

The race the verifier named remains: the console can still be lost between the probe and the CTX read. That cannot be removed. It goes into S4-live's notes.

Tests (`recipes/test/s11b-fix-static.test.ts`, new describe "fixer 3: m3-1"):
- **Static.** Before `New-R17Tab` there is exactly one `Read-R17Rules` and there are exactly two NOT RUN guards. The probe stands before the re-check. Nothing else that types (`Enter-S11bConsoleText`, `SendKeys`, `Start-/Invoke-S11bConsoleEval`) stands before the tab. `Read-R17Rules` uses the `rules` console contract. The new CTX text is pinned, and the old one is gone.
- **Run in PowerShell with stubs (case 1).** A probe that falls back gives NOT RUN, with no `New-R17Tab` and no `Call9`.
- **Run in PowerShell with stubs (case 2).** A CTX eval that returns 10 leaves `R17Fallback = True`. One that returns 0 leaves it False and prints no CTX NOT MEASURED.
- The fixer-2 test "exactly one `return` before the tab" now expects two (the guard and the probe's re-check). It was changed, not removed.

### m3-2 · F-FILETAB: "no url, no title" is now judged over the SDK's own rows

- **`recipes/s11b-rules.ts`: new `judgeFileTabHidden(rows)`.** It takes the rows the SDK's `client.tabs()` returns (`hidden`, `url`, `title`) and isolates the hidden rows.
  - Zero hidden rows, or more than one, is NOT MEASURED (the sheet's "exactly one hidden row; else NOT MEASURED").
  - With exactly one, the row passes only on `hidden=blocked` with an empty or absent `url` and `title`. `hidden=disarmed`, a url or a title each fail.
  - It prints only labels and counts: `TABSHIDDEN F-FILETAB rows=<n> hidden=1 reason=<blocked|disarmed|other> url=<yes|no> title=<yes|no>`. No URL text and no title text is ever printed.
- **`recipes/s11b.ts`: new SDK subcommand `B17 filetab`.**
  - It uses the existing H5 `session()` pattern (client `s11b-filetab`, `failureReports: false`, `c.tabs()`). `--dry` prints `PLAN filetab ok …` without connecting.
  - It prints the TABSHIDDEN line and `ROW F-FILETAB tabs hidden row PASS|FAIL|NOT MEASURED: …`, with exit 0, 1 or 3 through the existing `judged()`.
  - `reportFileTabRows` is exported, so tests can inject rows.
- **`f-filetab` block.**
  - The block calls `[void](Invoke-R17Node 's11b' @('filetab'))` right after the `F-FILETAB tabs` judge, while the file window is still open. `Invoke-R17Node` already counts exit 1 as a failure and exit 3 as NOT MEASURED.
  - The misleading `RECORD F-FILETAB tabs hidden row … NOT MEASURED` line and its `S16NM++` are gone.
  - The `tabCreated url-empty` RECORD NOT MEASURED line is unchanged; it was not in the findings.
  - The ★ row can now PASS.

Tests:
- **Pure (`s11b-fix-rules.test.ts`, describe "fixer 3, m3-2").**
  - One hidden=blocked row with no url and no title passes, both with `""` and with the keys absent.
  - A url fails, and so does a title. Neither text appears in the line or the reason.
  - `hidden=disarmed` fails.
  - Zero hidden rows, and two, are each NOT MEASURED.
- **CLI.** `filetab` is in `SUBCOMMANDS`. `filetab --dry` prints only its PLAN line. `reportFileTabRows` prints the TABSHIDDEN line and the PASS, FAIL and NOT MEASURED ROW lines.
- **Static.** The `filetab` call stands in `f-filetab` after the tabs judge and before `Close-S11Window $FW`, and no `RECORD F-FILETAB tabs hidden` line remains. This replaces fixer 2's test that pinned the removed line; it was changed, not removed.

### NIT n3-1 · a CTX count above 0 is checked first

A new one-line CLI test in `s11b-cli.test.ts`: `CTX t1 tabs=0` plus `CTX t1 count=1` gives exit 2.

## Mutation proof

Each mutant was applied in the main tree, the 16 `s11b-*` files were run, and the file was restored from a copy. A `diff -q` after the last mutant was clean.

| Mutant | Result |
|---|---|
| RD-7 probe and its re-check removed | KILLED (1 file fails) |
| only the probe's `Read-R17Rules` line removed | KILLED |
| CTX `-eq 10` FALLBACK line removed | KILLED |
| `f-filetab`'s `@('filetab')` call removed | KILLED |
| `if (c.count > 0 && tabs !== 0)` (n3-1's surviving mutant) | KILLED |
| `judgeFileTabHidden` url check dropped | KILLED |
| title check dropped | KILLED |
| `hid.length !== 1` → `< 1` (two hidden rows judged) | KILLED |

## Exit criteria (measured)

| Check | Result |
|---|---|
| `npm test` | `Test Files 177 passed (177)`, `Tests 4472 passed (4472)`. That is +8 over 4464 (verifier 3's measurement on this tree), with none removed. The 16 `s11b-*` files alone: 314 (was 306). I did not re-run the suite before my first edit, so the base is verifier 3's figure, not my own. |
| `npx tsc --noEmit -p` on all 7 `recipes/tsconfig*.json` (fe, base, s10, s11, s11b, s6, s9) | exit 0 each |
| `.ps1` parse (`Parser::ParseFile`) | `s11b-r17.ps1 errors=0`, `s11b-win.ps1 errors=0` |
| `R17 -Block plan` | exit 0, `PLAN not built:` empty |
| `npm run typecheck`, `npm run build` | exit 0, exit 0 |
| `git status --short` after the build (tracked) | only `journal.md` and `recipes/tsconfig.s6.json`, both from before this fix |

## Notes for later stages

- **S4-live.** RD-7's leftover race: a console lost between the probe and the CTX read. RD-7 then has run its navigate with no stopper. The CTX NOT MEASURED line and the FALLBACK flag record it.
- **S4-live.** `B17 filetab` is a new SDK client (`s11b-filetab`) in the wave. It reads only `listTabs` and holds no tab.
- **S4-record.** F-FILETAB's `tabs` clause now has two lines: S9's totals judge (`ROW F-FILETAB tabs …`) and `ROW F-FILETAB tabs hidden row …`. Both are pass clauses of the ★ row.

## Handoff

- Nothing is left running. I started no Chrome, daemon, python or server.
- The scratch backups in `%TEMP%\fx3bak` and `%TEMP%\fx3*.py` are deleted.

# S4-helpers fixer 2

Sonnet, medium, 2026-10-27. Lane: `recipes/s11b*`, `recipes/test/s11b-*`. Nothing drove Chrome, the daemon or a port. Layer followed: the sheet's §4.24 (RD-7, RD-8, F-FILETAB) over the brief.

## Findings fixed

1. **M-new, RD-7 on FALLBACK (option a).** `$Blocks['rd7']` in `recipes/s11b-r17.ps1` now begins with
   `if ($global:R17Fallback) { Say9 'ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)'; $global:S16NM++; return }`.
   It runs before `New-R17Tab`, the navigate, `Call9` and any console eval, so a FALLBACK run makes no call and changes no state in the block. liveA continues. The block's closing UIA line now says the console CTX is the stopper. I left no `STOP-MAP` marker on the NOT RUN line, because a marker belongs on a line that stops.
   - Tests (`s11b-fix-static.test.ts`, new describe "M-new"): the guard line is present verbatim; it comes before `New-R17Tab`, `Call9` and `Invoke-S11bConsoleEval`; exactly one `return` stands before the tab opens.
   - Mutant: guard replaced by `if ($false)` makes 1 test file fail (killed).
2. **RD-8 needs no such guard.** Its STOP clause reads the page: `snapshot` text "This tab shows a local file" (the `file-rendered` STOP-MAP line). It does not call the console and never reads `R17Fallback`. A test pins both facts (`rd8` holds no `Invoke-S11bConsoleEval` and no `R17Fallback`, and holds the snapshot text).
3. **m-new-2, `B17 state` fixture.** The found Upload-folders text is now 3 valid and 1 invalid lines (the home-folder line became `C:\w\c`), and the test asserts `[3, 1]`. Mutant swapping `valid: f.folderCount, invalid: f.invalidCount` in `s11b.ts:435`: killed (1 file fails). It survived before.
4. **m-new-1, F-FILETAB "no url, no title".** Not isolable without product changes: S9's `tabs` summary prints only totals (`total`, `hidden(blocked)`, `withTitle`, `withUrl` over every tab, `s9-rules.ts:263`). Differencing totals against a baseline would depend on every other tab staying unchanged, which is a guess. The `f-filetab` block now prints `RECORD F-FILETAB tabs hidden row has no url, no title: NOT MEASURED (…cannot be isolated…)` and does `$global:S16NM++`. A static test pins the line and its reason. The judge `judgeFileTabRow` still judges exactly one hidden row.
5. **n-new-1, CTX over 0 tabs.** `B17 ctx --read`: a `count>0` is still a STOP (checked first); otherwise `tabs=0` prints `NOT MEASURED: CTX matched 0 tabs, so a count of 0 is not evidence (nothing was read)` and exits 3, so the `rd7` block prints its CTX NOT MEASURED and counts it. A missing `tabs` line behaves as before. Test in `s11b-cli.test.ts`: tabs=0 gives exit 3 with no ROW line; tabs=2 count=0 gives exit 0. Mutant (tabs check disabled): killed.
6. **n-new-2, stale `--tab` comment** at `s11b.ts:20` now documents `ctx --label <l> --tag <t>` and the tabs=0 rule.
7. **n-new-3, stored listener timing edge.** Documented in code (comment above the timeout in `storedListen`), not fixed. Fixing it would hold every no-poller failure open for `--for` + 1 s. Today's timings exclude it: the poller is typed within about 10 s of the listener start and the timeout is 30 s. The consequence if it happened is a logged failed request on a closed port, not a false pass. Carry it into S4-live's notes, as verifier 2 asked.

## Exit criteria (measured)

| Check | Result |
|---|---|
| `npm test` | `Test Files 177 passed (177)`, `Tests 4464 passed (4464)`. Re-measured before: 4460 / 177. +4 tests (1 cli, 3 static), none removed. The 16 `s11b-*` files alone: 306 (was 302). |
| `tsc --noEmit -p` for all 7 `recipes/tsconfig*.json` (fe, base, s10, s11, s11b, s6, s9) | exit 0 each |
| `.ps1` parse (`Parser::ParseFile`) | `s11b-r17.ps1 errors=0`, `s11b-win.ps1 errors=0` |
| `npm run typecheck`, `npm run build` | exit 0, exit 0 |
| `git status --short` after the build | tracked changes only `journal.md` and `recipes/tsconfig.s6.json` (both pre-existing, not this fix) |
| `R17 -Block plan` | exit 0 |

## Proposed decisions

### 2026-10-27 · RD-7 does not run without the console
**Decided:** on the console-FALLBACK branch RD-7 prints `ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)` and makes no call. **Why:** the sheet says only the UIA read can stop RD-7 without the console; it is not built, and `tabs.create` has no `windowId`, so the tab may sit in a window the human owns. A navigate with no stopper could render the own page unwatched. **Instead of:** building the UIA read tied to a wave window (option b). **Revisit if:** FALLBACK happens in a live run and RD-7 is wanted there, or the UIA read gets built. **By:** Claude (proposed)

## Handoff
- Nothing left running; no python or node process started by me remains.
- Open for later stages: the n1 sheet wording and n8 (S4-record, S4-live), the stored-listener edge note (S4-live).
- The sheet (§4.24) was not edited: its RD-7 text ("Without the console CTX is NOT MEASURED and only the UIA read can stop") still holds; the NOT RUN row is the helper's stricter reading of it.

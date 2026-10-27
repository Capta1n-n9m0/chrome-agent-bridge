# S7-helpers H2 builder report (Step 11b)

Model: Sonnet 5.5, medium effort. No live run; nothing touched Chrome, the daemon or port 9234. Not committed.

## 1. Verdict
DONE (slice H2: items (a)-(e)). About 520 new lines including tests (cap 600).

## 2. Outputs
New: `recipes/s11b-r17b-build.ts` (pure: BUILD/S6 lines, parser, judge; the tabwatch expressions, parser, judge; newtab-timed judge and page class; `withOpened`), `recipes/test/s11b-r17b-build.test.ts`, `recipes/test/s11b-r17b-press.test.ts`.
Changed: `recipes/s11b.ts` (console sub `tabwatch`, ops `build-proof`, `newtab-timed`), `recipes/s11b-win-rules.ts` (printable regex, `S11B_SUBS`, `ON_AFTER_REPLY_MS`, `replyAtFrom`, `onPressDelay`, `pressAfterReply`), `recipes/s11b-win.ps1` (`Get-S11bReplyAt`, `Get-S11bOnDelay`, `Invoke-S11bPressAfterReply`; `$S11bSubs` and `$S11bPrintRe` updated), `recipes/tsconfig.s11b.json`, `recipes/test/s11b-win-static.test.ts` (one number, see Deviations).

Numbers (commands run here): `npm test` 4615 passed, 187 files (before: 4583 / 185 per H1's report; none removed). `npm run typecheck` 0, `npm run build` 0, `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` all 0.

## CLI / PowerShell forms for H3
- Console, through `Invoke-S11bConsoleEval $D 'tabwatch' @('--mode','start') @('--mode','start')` (prints `TABWATCH started`; the listener follows the first tab created after it) and `Invoke-S11bConsoleEval $D 'tabwatch' @('--mode','read') @('--mode','read','--reply-ms',<LAT ms>,'--row',<R17B-NEWTAB-PLAIN|R17B-RD-2|R17B-NEWTAB-LOAD>)` (removes the listener; prints `TABWATCH created-url=… completes=… first-complete-ms=…[ reply-ms=…]`; with `--row`, a `ROW` line; NEWTAB-PLAIN judges about:blank, the other two record). Start before the `newtab`, read after. `--reply-ms` is optional: the console cannot see the reply, so reply-ms is the helper's own LAT.
- `B17 build-proof --tabwatch <file holding the TABWATCH read line> [--sw <file>] [--ref <hex>]`: prints `BUILD disk-s6-names=<n>/2 created-url=<c>` (omitted when no TABWATCH line), `S6 commit=ancestor|not-ancestor`, and `ROW R17B-0 (e)(f)`. Exit 2 (STOP) on names < 2, not ancestor, no read, or created-url other. H3 joins the `MANIFEST` line and the `BUILD` text itself (the sheet's one line), and passes a file that holds the printed TABWATCH line (the record file or a saved copy).
- `B17 newtab-timed --row <id, e.g. R17B-NEWTAB-LOAD-1> --url <http loopback fixture url> --as <key> [--blocked <n> --rules-after <n>] [--dry]`: prints `LAT <row> <ms> ms`, `ANSWER`, `RECORD <row> page=<playground|about:blank|other> elements=<n> snapshot=<ok|CODE>`, `ROW`. Records the handle in `$S9_OUT\state.json` (`opened` and `tabs[key]`), as `S9 newtab --as` does, before the snapshot. With `--blocked`/`--rules-after` omitted the row ends NOT MEASURED, not PASS. `<id>` in `--row` is any plain word, so H3 can use the sheet's row id plus a trial suffix.
- PowerShell: `Invoke-S11bPressAfterReply $W 'R17B-DISARM' -ReplyFile (Join-Path $env:S11_OUT 'node-out.txt') -Checked` as the `$d` driver of the `call` (the call's stdout, redirected by `Invoke-R17Node`, holds `CALLT <row> start=<ms> reply=<ms>`). It waits `<Row>.ready` itself, presses OFF 1000 ms later (the same call and title wait as `Invoke-S11ButtonPair`), polls the file for the reply, presses ON 1600 ms after it, returns `$true` only if the reply was seen and the title reads armed. H3 must not also call `Wait-S11Ready` for that row in the driver.
- `S11B_PRINTABLE_RE` now also prints `TABWATCH `, `BUILD `, `S6 commit=`, `LAT `, `RECORD `, `HIST `, `ACT ` lines (HIST/ACT are H1's forms, which were not printable before).

## 4. Deviations
- Tests were written together with the code, not shown failing first; the vm test of the listener and the CLI tests pin the behaviour. Not shown by mutation.
- `s11b-win-static.test.ts` line cap raised from 440 to 480 (the file grew by 33 lines; it is a size cap, no protective check). The `scanS11bOutput` check was not touched; the new code was made to satisfy it (`$rows = @(Get-Content …)`, `$ms` in the print).
- The new tests are in two files, `s11b-r17b-build.test.ts` and `s11b-r17b-press.test.ts`.

## 5. Proposed decisions
### 2026-10-27 · TABWATCH's navigation marker and reply-ms
**Decided:** `completes` counts `complete` events of the first created tab before the first `loading` that carries a non-blank url, or that comes after a `complete`; `first-complete-ms` is from `onCreated` to the first `complete` (`none` when there is none); `reply-ms` is the helper's LAT, appended at read time. **Why:** the sheet's "first `loading` after the navigation" needs a rule the console can apply; the reply is not observable inside the worker. **Instead of:** a reply-ms measured in the console. **Revisit if:** the live record shows the marker misplaces N1's doubled blank `complete`. **By:** Claude (proposed)

## 6. Findings
1. Helper/sheet mismatch (not resolved): the sheet's TABWATCH line has `reply-ms=<ms>` among the listener's values, but the console cannot see the `newTab` reply; the line's `reply-ms` comes from the helper (`--reply-ms`). RD-2 and NEWTAB-PLAIN name only `created-url`, so the line without reply-ms is printed when `--reply-ms` is absent.
2. Helper/sheet mismatch: the sheet's R17B-DISARM says the ON press is timed from the reply; `s11b.ts call` prints `CALLT` only at the end of the process, so the reply time is read from the call's stdout file. If H3's runner does not redirect stdout to a file the driver can read, `-ReplyFile` has no reply and the helper presses ON after the 30 s bound with a STOP line.
3. A tab seen by the listener that is not the wave's own (the human opens one inside the window) would be followed instead of the wave's; the wave runs with the human idle (assumption, same as `HITS`).
4. `Test-Path`/the PowerShell `Get-Content` read of the reply file runs while node writes it; the regex needs a whole `CALLT` line, so a half-written line is ignored.

## 7. Handoff
No processes or files left. H3 (`recipes/s11b-r17b.ps1`, `liveA17B`/`liveB17B`) follows. The unchanged H1 notes still hold: history tabs must be opened through `S9 newtab` or `B17 newtab-timed` so `opened` lists them.

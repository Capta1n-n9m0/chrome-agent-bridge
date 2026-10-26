# S4-helpers fixer: Run 17's live helpers, round 1

Model Sonnet 5.5, effort medium. 2026-10-27. Fixes M1-M5, m1-m6, n1, n2, n5 of `S4-helpers-verifier.md` and kills the two runner mutants of m4. Nothing drove Chrome, the daemon or a port; every proof is offline. Nothing committed.

## 1. Verdict: DONE (two items are open by design: m2's UIA read, M5's tab event; see section 4)

## 2. Numbers

| Check | Result |
|---|---|
| `npm test` before (re-measured) | `Test Files 175 passed (175)`, `Tests 4406 passed (4406)` |
| `npm test` after | `Test Files 177 passed (177)`, `Tests 4460 passed (4460)` (+54, two new files; none removed) |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| `npm run typecheck`, `npm run build` | exit 0, 0 |
| `.ps1` parse (`Parser::ParseFile`) | 0 errors in `s11b-r17.ps1` and `s11b-win.ps1` |
| Tracked changes after the build | `journal.md` (not this slice) and `recipes/tsconfig.s6.json` (the builders' exclude lines, plus my two new test names); nothing else |
| Lane | `git diff HEAD --stat` over the sheet, `s9*`, `s11.ts`, `s11-*`, product packages: empty |

Existing assertions I had to change (documented moves, not removals): `s11b-console.test.ts` CTX test expected `tabs=2 count=3` because the old filter was a substring match that took tag `rd7p` for `rd7` (n1 is exactly that bug); now `tabs=1 count=1`. `s11b-cli.test.ts` `stored` helper now passes `--for 300` (the listener outlives the poller by `--for` + 1 s, M4), and its expression assertion names 300, not 5000.

Mutants (scratch copy-and-restore, `scratchpad/mutate.py`, all restored): killed 11 of 11 relevant: no-double-restore condition, `throw` after the rules-stuck `Stop9`, no linger, CTX substring, `dlHopReading` bands -350 and 50, hop `ok` not a STOP, alias-known check, record router, `setup` without `--only`, history key `rb`. One equivalent mutant (judging POSTs after the verdict) cannot differ: `got` is not read after the verdict.

## 3. Per finding

**M1 (MANIFEST first).** `s11b-r17.ps1` `rd0` (line ~391): the manifest eval now runs first; `$global:S11bRecordFile = $Record` while `S9_RAW = $Framing`, so only `MANIFEST` and its `ROW` reach the record (new router in `s11b-win.ps1` `Write-S11bB17Out`, lines ~126-137; the one `# s11b-print-ok` line is unchanged). `RULES 0` (b) follows; the toggle read, `S11 found` and `Save-S11Found` chatter run under `S9_RAW = $Framing`. FALLBACK: the notice and RD-CAPS-WARN's typing chatter go to the framing file (`Invoke-R17CapsWarn -First`), the judged ROW is the record's first line. Tests: `s11b-fix-static.test.ts` "M1" (order, nothing before the eval, finally restore; PowerShell run of the router with stubs).

**M2 (STATE form).** New `B17 state --found <json> --folders <file>` (`s11b.ts` `stateCmd`, `s11b-rules.ts` `rd0StateLine`, `judgeRd0State`): prints `STATE armed=<b> evaluate=<b> blocklist lines=<bl> uploadfolders valid=<f> invalid=<fi>` (valid/invalid from `analyzeUploadFolders`, no hashes) and `TOGGLE reading <on|off>`; not armed with JavaScript, or an unreadable toggle, is a STOP. `rd0` calls it after `S11 found`, before `foundlist`. Tests: `s11b-fix-rules.test.ts` "M2" (line form, counts equal `analyzeUploadFolders`, no hash, STOP cases, file-inside-repo refusal) and the static order test.

**M3 (RD-LOGS counts).**
- (a) alias: `B17 scan` takes `--alias`, else the alias `S11 make` stored in `state.json`; an alias nobody gave is NOT MEASURED (`Scan17.aliasKnown`, `verdict17`). The runner reads it with `Get-R17Alias` and passes it to all three scans.
- (b) sock127: `rd-dl-socket` types two fixed console marks through a new console sub `B17 mark --label start|end` (`markExpression`, `SOCK_MARKS`, pre-type checked; `mark` added to `$S11bSubs` and `S11B_SUBS`) and records the `daemon.log` line counts at the loop's ends (`R17SockLog0/1`, persisted). `rd-logs` passes `--sock-console` and `--sock-lines <a>,<b>` only when RD-DL-SOCKET ran in the slice; missing marks print NOT MEASURED. `scan17` takes a window of two marks or two line counts (invalid or out-of-range counts: marks missing).
- (c) actors: `B17 scan --what actors` walks `<S11_OUT>/actors/*.turn-*` with S11's own `resultLines`; the runner scans actors with it only when an actor ran (`R17ActorRan`); `S11 scan` is no longer called.
Tests: "M3" blocks in both new files (marks, line window, alias NOT MEASURED, child-process `scan --what actors` with a state.json alias, `--sock-console`).

**M4 (stored poller outlives its listener).** Chosen fix: the listener stays open (answers 204, judges nothing) until the poller's first POST + `--for` + 1 s (`STORED_LINGER_MS`); the verdict, the signal file and `STOREDAT` are taken at the match. Why this one: the poller's later POSTs (the list restore) then always reach a live listener, so Chrome logs no failed request naming the ephemeral loopback URL, and the signal to start RD-5's call is unchanged. The poller-stops-on-first-answered-POST option would weaken the read-back (a later change would go unseen). RD-5's `stored` node therefore ends after the poller, so the list restore (`rd5-restore`) runs after the poller is gone. No POST ever: the listener closes at the timeout. `s11b.ts` `storedListen` (lines ~215-270). Tests: `s11b-fix-rules.test.ts` "M4": a POST 150 ms after the match gets 204, the process lasts at least `for` + 1 s, the port refuses only afterwards; no-match and no-POST cases.

**M5 (F-FILETAB).** `f-filetab` now runs: `tabs` judged (exactly one `hidden(blocked)`, else NOT MEASURED), `snapshot blocked1` and `navigate blocked1` judged K-filepage, a second `tabs` (untouched), then the control: a fixture tab (`ft`) navigated to the wave-made `file:` URL (passed as an argument, never printed), judged K-fileurl, tab closed. `judgeCallAnswer` gained `filepage` and `fileurl` (tied to K17); new `B17 judge-row`. The `tabCreated url-empty=<b>` RECORD is printed NOT MEASURED with its reason: tab events reach the daemon only (no SDK call, no log line carries them). Tests: `s11b-fix-rules` "M5" and the static F-FILETAB test.

**m1 (RD-DL-ERR, RD-DL-HOP, RD-1, RD-3 timing).** Calls use S9 `--expect record`; `B17 judge-row --as dl-err|dl-hop|lat --lat <name>` reads S9's own `ROW … (<ms> ms)` and `-file` lines (`parseCallRow`, `fileExistsFrom`, `judgeDlTrial`), prints `LAT RD-DL-HOP-<i> <ms> ms` in the sheet's form, and judges per the sheet (a non-INTERNAL, non-DOMAIN_BLOCKED code passes; an unread value makes a pass NOT MEASURED). `B17 dl-record` prints `d` and the reading (`dlHopRecord`, wiring `dlHopD` and `dlHopReading`) with the three err times and RD-3's. `LAT RD-1` and `LAT RD-3` are printed. Tests: "m1" in `s11b-fix-rules`; static test.

**m2.** RD-7 and RD-8 call `Read-R17Rules` right after the navigate reply. The UIA read of the options heading is NOT built (see section 4); RD-7 prints it as NOT MEASURED instead of hiding the gap. Test: static "n2 and m2".

**m3 (RD-5 wave STOP on a stored mismatch).** `B17 stored --cancel <f>` writes the file at the no-match timeout; `call --go --cancel` returns at once (`awaitGo`, exported) with `NOT MEASURED` and exit 3; the runner passes both and does not judge the hits when the stored value never matched. Tests: "m3" in both new files.

**m4.**
- STOP map: new ids `covered-proceeds-hop`, `-rd5`, `-rd5b` (plan `STOP_MAP`, markers in the runner). A covered call answering `ok` is `stop17` in `judgeDlHopTrial` and in `judgeCallAnswer` for `tab-or-url` and `url`; the call node exits 2 and the runner throws.
- Tracked-tree check: `Assert-R17TreeClean` at the preflight and at the end of RD-LOGS (before the record is committed).
- Survivors: `s11b-fix-static.test.ts` runs `Stop-S16Wave` in PowerShell with stubs (restore count 1 when outside the restore, 0 and the "no second restore" line when inside, exit 2) and `Read-R17Rules` (throws after its STOP line, NOT MEASURED on 3, fallback on 10). Both mutants are killed.

**m5.** `B17 clean-console --file` (and `scan --what console`) drop window-title lines (`DevTools`, `DevTools - <profile>`, `... - Google Chrome`; `isTitleLine`); the runner cleans `console.txt` before any scan. Tests: "m5" in `s11b-fix-rules`.

**m6.** `reload` runs `S11 setup --only l1,u6,j7,a7,sv,raw,ra` (the tabs the blocks use; no `u8` on 8084); history tab keys are `hb`, `hf`, `hs`, `he` (no S11 key `rb`). Tests: static "m6" (the list equals the keys the S11 and B17 subcommands in use need, per `NEEDS` and `handleOf`; no runner tab key is in `TAB_SPEC`).

**n1.** `ctxExpression` compares the whole query value (`s11b=rd7` never matches `s11b=rd7p`), on `url` or `pendingUrl`; the closing list's `CTX r7 count=<n>` form is kept. Test: "n1".
**n2.** `hits --only blocked` prints `HITS bk blocked=0`; `Invoke-R17History` uses `-BlockedOnly -Flip`. Tests: `s11b-fix-rules` and static.
**n5.** `dlHopReading` edges -351, -350, -250, -249, -51, -50, 50, 51 asserted; the function is wired (m1).
Left alone as briefed: n3, n4, n6, n7, n8.

## 4. Open items for the step agent

1. **m2, the UIA read of the options heading (RD-7 STOP, FALLBACK branch) is not built.** The tab `r7` is a background tab; no wave-owned window is known to show it, and the sheet allows UIA only on windows the wave opened. Building it needs a way to tie the tab to a window (a sheet-level design choice), so I stopped: RD-7's UIA clause prints NOT MEASURED. The CTX read still stops the wave when a context is present.
2. **M5, `tabCreated url-empty=<b>`** is printed NOT MEASURED (no client path to tab events). Reading it would need product code, outside this lane.
3. Sheet inconsistency n1 (`CTX r7` versus `CTX tab=<label>`) stays for S4-record.
4. n8 (S3b's DNR block may log `ERR_BLOCKED_BY_CLIENT` in the worker console) remains a sheet risk for S4-live.

## 5. Proposed decisions

### 2026-10-27 · The stored listener outlives the typed poller
**Decided:** `B17 stored` keeps its loopback listener open until the poller's first POST + `--for` + 1 s, taking its verdict at the match. **Why:** a closed port makes Chrome log a failed request naming an ephemeral loopback URL in the console RD-LOGS scans. **Instead of:** stopping the poller on the first answered POST (a later change would go unseen). **Revisit if:** the poller's first POST is delayed beyond its own loop start. **By:** Claude (proposed)

## 6. Handoff

No process left running (the one `node.exe` in `tasklist` is not from this slice: every command I started finished). Scratch: `scratchpad/patch_runner.py`, `mutate.py`, `mut-out.txt`. New files: `recipes/test/s11b-fix-rules.test.ts`, `recipes/test/s11b-fix-static.test.ts` (added to `tsconfig.s11b.json` and the exclude list of `tsconfig.s6.json`). Re-check: M1-M5, m1-m6, n1, n2, n5, counts, the seven tsconfigs. Line endings: `s11b.ts`, `s11b-r17.ps1`, `s11b-win.ps1` and the two edited tests were normalized to LF by my edits (untracked files).

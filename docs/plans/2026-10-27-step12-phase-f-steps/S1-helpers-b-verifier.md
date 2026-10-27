# S1-helpers-b verifier report

Model and effort: Opus 5.5, medium. Role: agent-rules §6 Verifier. I read and ran things only. No Chrome, no daemon, no port 9234,
no live run. I edited no repo file except this report and `S1-helpers-b-verifier-evidence.txt` (the raw output, cited below as
"ev."). Builds, mutants and HEAD baselines ran in my own worktree of `8a3053b` with the slice's 10 files copied in. That
worktree is removed. The main tree's `node_modules` is intact (`.bin` holds 42 entries).

## 1. Verdict

**FAIL.** Two MAJOR findings and one failed exit check (F3: four fixes have no test that goes red). Everything else holds:
- Line forms (5)–(8) match §4.26 by key, and a test checks each skeleton against the sheet's own text.
- F-b, the O2 poll, the race ON timing, HIST/ACT routing and the multi-token `VERDICT_LINE` are each built and proven by a
  red mutant.
- The numbers re-derive.

## 2. Numbers re-derived (ev.)

- `npx vitest run recipes/test`: **1090 / 49 files at HEAD → 1104 / 50 after** (+14). This matches the builder. The first
  HEAD run in a CRLF worktree gave the 9 known `s11-r16-runner` reds (recipes/CLAUDE.md gotcha), so I re-checked it out
  with LF.
- Typecheck (`tsc --noEmit -p`): exit 0 for all seven `recipes/tsconfig*.json` and all five packages, both in HEAD+slice
  and in the main tree. The new tests are in `tsconfig.s6.json`.
- `npm run build` (worktree): exit 0. Afterwards `git status` shows only the slice's files.
- Full `npm test` (main tree): **4830 passed, 203 files**. This matches the builder.
- `Parser::ParseFile`: 0 errors for `s12-win.ps1`, `s11-win.ps1` and `s11b-r17b.ps1`; 0 non-ASCII bytes.
- Size: code 170 + tests 182 (157 + 22 + 3) = **352**. This is confirmed. The 2 lines over the cap are tests, and the
  report states it.
- `s11-win.ps1` against HEAD: exactly 6 changed lines (3 out, 3 in): line 24 and lines 296–297. So the file is HEAD plus
  only the lane lines, whatever the `git checkout --` did.

## 3. Mutants (ev., `mut.mjs`; one change each, restored)

**Red (the fix is proven):**
- M1: `VERDICT_LINE` back to one token.
- M2: no WARN line.
- M3: the first verdict is kept instead of the worst.
- M27: the slice is ignored in the key.
- M4: `newtabTrialLine` always prints a ROW.
- M6: `r17b-history` is a framing block again.
- M7: `$S11Warning` back to Run 16's text.
- M10: the O2 poll stops at 6 s.
- M11: the poll does not stop on a match.
- M12: ON is timed from the OFF press.
- M13: ON waits 1 500 ms.
- M14: the patch never throws.
- M16: the own-page class reads `other`.
- M17: `bannerCtlPass` ignores violations.
- M18: the `VIOLATION` answer is back.
- M19: `--violations` is optional.
- M20: `rawLine` prints data values.
- M25: the `OPT` print is left unpatched.
- M26: the `OPT observed` form is wrong.

**Green (no test catches the change):**
- M5: `newtabTimed`'s call site reverted (the interim ROW is printed again).
- M8: the invalid-item regex back to the two typed lines.
- M9: the warned regex back to Run 16's.
- M15: a patch that matches twice is accepted.
- M21: `--to-cap` ignored in the loop condition.
- M22: `leg-line` maps FAIL to PASS.
- M23: `rows18` drops its WARN lines.
- M24: `raw-l1` no longer STOPs on an allowed upload.

## 4. Findings

### F1 MAJOR: the scanner item (S7-run-record §5 item 8) is still open, and the builder's "could not reproduce" is wrong
**Where:** `recipes/s9-rules.ts:442-452` (`scanCounts`), `:32` (`FIXTURE_ORIGINS`); §4.26, the last clause of "Aggregator
fixes".

**Evidence:** one command reproduces Run 17b's FAIL. `npx tsx recipes/s9.ts scan-file <S7-live-run2A-record.md> --mode
committed` prints:

```
://=18 (fixture 15, other 3) … CHECK SAFE-10 scan-committed FAIL — non-fixture :// 3
```

I classed every URL in the record with `showUrl` and the computed own id. Every own-page URL in run2A counts as fixture
(`id ok true`, 0 non-fixture). The 3 "other" hits are the bare `://` inside the record's own `SCAN console: ://=0 …`,
`SCAN daemon: ://=0 …` and `SCAN actors: ://=1 …` lines (lines 600, 603, 605). `scanCounts` counts any `://` that has no
scheme in front as other (`if (raw > scheme) scheme = raw`). Run2B's 3 are two bare `SCAN` lines plus
`http://127.0.0.1:8081/s11-upload.html?s11=xwin`, which s9's `FIXTURE_ORIGINS` lacks.

So the cause written in S7-run-record item 8, in §4.26 ("the extension's own page URL") and in the builder's §6 is wrong.
Making the `window … now shows` lines class-only does not remove these FAILs. A Run 18 record carries `SCAN …: ://=<n>`
lines by §4.26's own line forms, so its committed-mode scan will FAIL again. §4.26 says "text is committed only after a
passing scan", so this blocks the record's commit.

The literal clause ("counts the extension's own page as fixture") was already true at HEAD. §4.26's diagnosis is a
wording finding; I did not edit it.

**Fix (needs the step agent; `s9-rules.ts` is outside the lane):**
- **Ruling:** state that a scan of a committed record skips the helpers' own `SCAN`/`CHECK` lines, or counts a bare `://`
  apart from URLs.
- **Code:** add `http://127.0.0.1:8081` to s9's fixture origins, as §4.26's "fixture" definition and the new
  `Get-S12UrlClass` already do.
- **Test:** a test that scans a record holding `SCAN` lines.

### F2 MAJOR: `raw-l1` changes R18-UP-L1's steps (four raw calls, not two)
**Where:** `recipes/s11b.ts` `rawL1` (the new block after `bannerctlJudge`); `recipes/s11.ts:500` (`S11 l1` already makes
the row's two raw calls).

**Evidence:** `S11 l1` sends `raw-root` (s11-1k.bin, no target) and `raw-outside` (`#up-single`, s11-out.bin) and prints
the checks. `rawL1` then resets the page and sends the same two calls again (two more `evaluate` resets as well).

§4.26 says R18-UP-L1 is "As R17B-UP-L1 … word for word, with only the changes named". The named change is "the `RAW`
line (5) prints the raw codes **beside the checks**", so the codes of the same judged calls.

As built:
- The `RAW` codes belong to two unjudged calls, and the judged calls still print checks only. That is G-23's item 4 again.
- The row's step list gains two uploads. R1.4 asks that a carried row be judged against its named source, and §4.26
  allows changes only through #320's two re-writes.

**Fix:**
- Print `RAW` from inside `S11 l1`'s loop (`s11.ts:501-507`), with `rawLine` from `s12-rules.ts` on `r.err`. This needs
  `s11.ts` in the lane.
- Otherwise the step agent rules on the extra pair (agent-rules §3), and §4.26 is not edited.

### F3 MAJOR (failed exit check): four fixes have no test that fails on the pre-slice helper
The criterion is "each fix has a test that fails on the pre-slice helper".
- **G-23 item 3, the item regexes** (`s11-win.ps1:296-297`; M8 and M9 green). The `OPT observed … invalid items <fi+3>`
  count is never computed in a test. Only `Format-S12OptObserved 1 3 0` is printed. The code reads right (it counts every
  `Line n: “…” — ` item without `warning: `, so the found `fi` items plus the three typed ones, the home line included),
  but nothing proves it.
- **The race cap** (`s11b.ts:912`, M21 green). The test only greps that the string `"--to-cap"` exists.
- **G-23 item 1's call site** (`s11b.ts` `newtabTimed`, M5 green). `newtabTrialLine` is tested; its use is not.
- **The patch "exactly once" rule** (`s12-win.ps1` `Get-S12PatchedFunction`, M15 green). Only zero matches is tested.

**Fix:**
- Run the patched `Invoke-S12Opt` with stubbed `Get-S9Options`/`Find-S11Texts` over a page that holds fi = 1 found
  invalid item, the three typed items and one standing text, and assert
  `OPT observed standing x1 invalid items 4 warned items 0`.
- Factor the loop's end test into a pure helper (`--to-cap` → 120 calls), or run `race` with a fake io.
- Add a static tie or a run of the `newtabTimed` branch.
- Add a two-match case to the PS test.

### F4 MINOR: `aggregateRows` keys a multi-token id on its first token
**Where:** `recipes/s11b-r17b-rules.ts` `aggregateRows`, `const id = /ROW (\S+)/…`.

**Evidence (ev.):** `["ROW SAVE-REFUSE-R sdk-leg PASS", "ROW SAVE-REFUSE-R mcp-leg FAIL: x"]` gives
`{"verdict":"FAIL","n":1,"warns":["WARN row printed twice: SAVE-REFUSE-R"]}`. `S11 saverefuse-sdk/-mcp` print exactly these
ROW lines (`s11.ts:812, 829`). If they reach the record, `rows18` prints a false helper fault and merges the two legs.

**Fix:** take the id as everything between `ROW ` and the verdict word (the match `VERDICT_LINE` already makes), and add
a test.

### F5 MINOR: the new subcommands are untested
**Where:** `rows18`, `leg-line` and `raw-l1`'s STOP (M22, M23, M24 green); `s11b.ts`.

Each prints a sheet line or carries a STOP. **Fix:** CLI tests with `--from` files (the `s11b-r17b-build.test.ts` `run(...)`
pattern) and a dry or fake path for `raw-l1`.

### F6 MINOR: the loop-done signal can be read empty
**Where:** `s11b.ts:664-668` (`realIo.signal`: `writeFileSync` creates the file, then writes it) against `s12-win.ps1`
`Invoke-S12RaceA` (it reads as soon as `Test-Path` is true).

An empty read fails `TryParse`. The driver then prints a STOP, presses ON at once, and the row is lost. The window is
small but real (a 20 ms poll).

**Fix:** write to `.tmp` and rename in `signal`, or retry the parse for about 200 ms before the STOP.

### F7 MINOR: `$S11Warning` edit side effects are not listed
**Where:** `recipes/s11b-win.ps1:352`; `s11-rules.ts:450-451, 475-476`.

§4.26 does order the change at `s11-win.ps1:24, 275, 296`, so the edit is in scope. Two side effects are not listed:
- The comment at `s11b-win.ps1:352` ("Run 16's $S11Warning is the old text") is now false.
- Run 16's runner (`s11-r16.ps1` → `Invoke-S11Opt`) now writes S0F-a standing and item counts, while Run 16's
  `judgeOpt` still expects Run 16's `K["K-opt-stand"]` and exactly two invalid plus one warned item. A Run 16 re-run
  would FAIL on helper text.

Run 17b is not affected: its judge reads its own `Get-S11bTypedObs` and `$S11bStand`, and only `o2Ms` from the obs JSON.
The changed assertion at `s11-win-static.test.ts:134` is justified and listed.

**Fix:** update the comment, and add a one-line note in the report or the record that Run 16's runner is retired for
UP-OPT.

### F8 NIT: two fixture definitions in the helpers disagree
**Where:** `s12-win.ps1` `Get-S12UrlClass`.

It counts `127.0.0.1:8081` and `*.localhost:8081` as fixture; s9's scanner does not (see F1). The class words are a
proposed decision, which is fine. Align them with whatever F1's ruling picks.

### F9 NIT: process
- The builder's `git checkout -- recipes/s11-win.ps1` broke §10. I found no damage (§2: HEAD plus 6 lane lines).
- My own slips, stated for the record:
  - `git config core.autocrlf false` run inside my worktree wrote to the shared `.git/config`. I removed the key at once
    (`--unset`). The effective value is the system `true` again, and the main tree's `git status` is unchanged at 31
    entries.
  - Before I created my worktree, `npm ci` ran once in a pre-existing non-git folder `scratchpad/wt` that is not mine.
  - `scratchpad/mut.mjs` may have overwritten a file of the same name; my copy is the mutant runner.

## 5. Points the brief asked about

- **Line forms (5)–(8):** they match character for character. `s12-helpers-b.test.ts` asserts that each skeleton
  appears in §4.26 and that each output matches its regex. `RAW` prints data keys only; a key that is not a plain name
  prints `other` (M20 red).
- **F-b:** `answer=<ok|CODE>` plus `CHECK bannerctl-pos violations=<n>`. The judge needs `--violations`, and more than 0
  FAILs the row (M17–M19 red). `bannerCtlPass`'s `?? 0` default applies only to S1-helpers-a's callers; the CLI path
  makes the flag required.
- **Race:** ON is timed from the last reply's epoch in the loop-done signal, waits at least 1 600 ms, and prints the
  measured `onAt - reply`. The real driver is run with a stubbed clock (presses at 1 500 and 10 600 ms; M12, M13 red).
  The loop runs to 120 calls only with `--to-cap` (untested, F3).
- **Patching:**
  - The patches are built at load from the loaded function's text and throw on zero matches (tested).
  - The two-match case is untested (F3).
  - `Assert-S12Patched` catches a wrong load order.
  - `Invoke-S11Opt` itself is untouched by the patch, and nothing else dot-sources `s12-win.ps1` (grep). So Run 16 and
    Run 17b keep the original `Invoke-S11Opt`, `Set-S9Omnibox` and `Invoke-S11bRaceA`; only the lane lines (F7) differ.
- **O2:** polled to 15 000 ms and stops on a match. `o2Ms` = the match time, else the polled time, so the 5 000 ms bound
  is unchanged in `judgeUpOpt` (M10, M11 red).
- **HIST/ACT:** `r17b-history` now goes to `$Record`, tested by running the real `Set-S17Raw` (M6 red). The Run 17b plan,
  static and fix tests stay green.
- **`carriedVerdict` against `aggregateRows`:** the Run 18 path (`rows18`, `leg-line`) uses `aggregateRows`, which counts
  once. `carriedVerdict` still counts duplicates and is only Run 17b's. That is correct, apart from F4.
- **Handoff to S1-helpers-c:** usable (load order, entry points, exit codes). It needs revising after F2 and F4: the
  `raw-l1` step, and where the SAVE-REFUSE leg ROW lines go.

## 6. For the fixer

1. **F2 and F1 first:** both need the step agent, for the lane (`s11.ts`, `s9-rules.ts`) or a ruling.
2. **F3:** the tests listed under it.
3. **F4–F7.**
4. **Afterwards:** re-run M5, M8, M9, M15, M21–M24 and show them red.

# S7-drivers-A verifier, round 2: liveA19's row drivers after fix round 1

Model and effort: Opus 5.5, medium. Role: verifier (agent-rules §6). I only read and ran things; the repo is unchanged by me
(the sha256 hashes match before and after my in-place mutants). Nothing drove Chrome, the daemon or port 9234. Evidence:
`docs/plans/2026-10-27-step12-phase-f-steps/S7-drivers-A-verifier2-evidence.txt`.

## 1. Verdict
**FAIL.** M1, M2, M4, M5, m2–m7 and the `bc` deviation are fixed as claimed. M3's fix places both press times where
round 1 asked, but it makes the row's other two clauses likely false FAILs. N1 is new, caused by the fix. N2 was there
before and round 1 missed it. Both are MAJOR. There are also three MINOR findings and four NITs. Size (M6) is reported
in §2 and left to the step agent.

## 2. Outputs (re-derived)
| Command | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0, `built extension → dist/` |
| `npx vitest run recipes/test` | **1481 passed, 62 files** (claimed 1481 / 62: holds) |
| `npm test` | **5381 passed, 228 files** (claimed 5381 / 228: holds) |
| `powershell -File recipes/s12-r19.ps1 -Block plan` (5.1) | liveA19's order unchanged |
| Size (`wc -l`, `git diff HEAD --numstat`) | **code 722** (586 + 109 + 26 + 1) against a cap of 400 (1.8×); **tests 434** (422 + 11 + 1) against 600 |

`s12-r19-a.ps1` is ASCII (0 non-ASCII bytes). Its only top-level variable is `$R19DeferRe`. `recipes/s12-r19.ts`
(`scanActors`) is not in `git status`, so it is unchanged.

## 3. The round-1 findings, re-checked
- **M1: fixed. The dispute is ruled in §4.**
  - CON-3 now calls MCP `browser_snapshot` and judges the console text equal to it (`judgeMcpRefusal`, `s12-r19-a.ts:335-340`).
  - CON-JSOFF calls MCP `browser_evaluate "1"` and `browser_snapshot`. It judges the console text equal to the evaluate
    text, and judges that the snapshot answers.
  - CON-4 judges an error that carries `DISARMED_ALL_MESSAGE`. Its read after arming is `LEG R19-CON-4 after`, and it
    reads the cursor tab: `newTab` sets the cursor (`sdk/src/client.ts:381`), and the MCP tab is another client's.
  - Every clause is printed as a `LEG`, so it reaches the `ROW` through `Complete-R19Row`. Tests:
    `recipes/test/s12-r19-a.test.ts:219-229`.
- **M2: fixed.** `sent += d > 0 ? 1 : 0` (`:200`). `judgeArgs2` needs a total of 2 and each wire label exactly once
  (`:38-41`). Its test covers a third label on the wire, a missing wire label and a total of 11.
- **M3: fixed as asked, but see N1 and MINOR-1.** OFF is reported at `post`, after the off title is read
  (`s12-r19-a.ps1:18`). ON is reported at `pre`, just before `Invoke-S9ActionButton` (`:20`, `:72`). Scenario S15 and the
  mutant "ON stamped after the title read" hold.
- **M4: fixed, and the direction is conservative.** Details are in §5.
- **M5: met.** I re-ran the eight round-1 mutants in place, each with its own text (not the fixer's strings). Each was
  restored byte for byte, and the hashes match. Each PowerShell mutant parses (0 errors). **All eight are red**:
  - **IDLE taken from the first match:** red (S10).
  - **BANNER-CTL's idle read from the `-neg` id:** red (S12).
  - **Banner STOP printed by `Say9`:** red (S11).
  - **`Restore-R19Js`'s `not-restored` printed by `Say9`:** red (S14).
  - **`do` does not set `R19Changed`:** red (S8).
  - **`undo` does not run its restore:** red (S9).
  - **`Switch-R19Toolbar` returns at once:** red (S15).
  - **`conLegs` judges the `all` line for every read:** red. This is the mutant the fixer only reasoned about. The test
    "CON reads: each read is judged from its own line" goes red.

  Each PowerShell mutant also turned one of the fixer's own mutant tests red. That is expected: those tests look for
  the source text my mutation removed, so I did not count them.
- **m2: fixed** for the stateless actors (`run(..., stateless)`, `:121-146`). Only `crashLine` is unit-tested, as the
  fixer states.
- **m3: fixed.** Stamps follow `newTab`, `close`, `claim` and `release`. `IDLE_EXEMPT_TOOLS` is exactly snapshot,
  list_tabs and status.
- **m4: fixed.** The parameter is now `-StepList`, and all 10 registrations use it.
- **m5: fixed.** `judgeFrameB` needs `sentinel=2` and gives `RECORD` under a NOT DISCRIMINATING leg a.
- **m6: fixed.** Both banner functions now send `rc == 2` through `Stop-R19Actor` (S13 and its mutant).
- **m7: fixed.** ARGS-3's snapshot is now MCP `browser_snapshot` (`:404`).
- **The `bc` deviation: fixed.** The tab is opened with `keep`, its handle goes to `bc-tab.txt`, and R19-RESTORE's
  `Close-R19Bc` closes it. A stale `bc-tab.txt` cannot close a human tab: a handle number is never reused across
  daemons (`daemon/src/handle-mark.ts:1-8`), so a stale handle answers `TAB_UNKNOWN` and `closeBc` prints `gone`. The
  order inside R19-RESTORE is MINOR-3.
- **The new `Test-R19Armed` (`'safety: armed*'`): correct.** I checked it against `extension/src/badge.ts:71-75`. It
  matches `safety: armed by the user` and none of `disarmed by the user`, `re-arm ignored …`, `disarm not saved …` or
  `arm failed …`. The fixer is right that the old `'*armed*'` matched the disarmed title. See NIT-1.
- **The `s12-r19-lib.ps1` line breaks no S7-helpers-d test or contract.** It is guarded by the slice and by
  `Get-Command`. The static unresolved-names test now covers `s12-r19-a.ps1`, and the full suite is green.

## 4. The M1 dispute, ruled from the sheet's text
- **CON-OWN and CON-FILE: I uphold the dispute.** These rows' Steps column (`docs/e2e-test-plan.md:1797-1798`) names
  `tab.consoleMessages()` and the control `tab.snapshot()` only. Their expected `CONREF` line has no MCP field. A pass
  rule judges the steps the row takes, so "As R19-CON-3" brings in CON-3's code, message, control-equality, 0-entries
  and banner clauses, but no MCP call the row never makes. My round-1 reading went further than the text does.

  The fixer's second reason does not decide it: the actor could release the tab before an MCP claim, so `TAB_HELD` is
  not forced. I suggest a dated note so that Run 19's record does not reopen the question (NIT-3).
- **CON-4's MCP clause: acceptable.** CON-4's pass rule (`:1796`) has no MCP clause. Its Steps say only "and the MCP
  tool". An error carrying the exact disarmed message is a fair minimum. NIT-2 offers a stricter form.

## 5. M4: the redacted `list-tabs` record
- **Nothing from the list reaches the file.** `actorRecord` (`:96-100`) replaces the text with
  `list-tabs lines=<n> fixture-handle=<yes|no>`, built from a count and a fixed word. Every result goes through it
  (`:110`). The test shows that a non-fixture title, a URL and `://` are all absent, and that the record passes the
  unchanged `scanActors`.
- **What §4.27 judges from this probe is kept.** The sheet asks for "a tab list holding the page's handle"
  (`:1805`). The driver judges that on the raw text before writing the record (`:311`, `r.text.includes(mt)`).
  R19-LOGS's `other 0` still holds for this tool.
- **It is the conservative direction.** The record holds less, and no scanner exemption is added. The existing-tools
  clause behaves as before. **But the same leak class remains for `browser_status`** (MINOR-2), so the proposed decision
  should cover both tools.

## 6. New findings

**N1 MAJOR: CON-FLOOR's `disarmed-ticks ≥ 3` is now likely to fail.** `s12-r19-a.ts:468-471` with
`s12-forms.ts:73`. This comes from reading the code and estimating; I did not measure it.
- **Which ticks the judge counts:** those in `[off_post + 500, on_pre − 500)`.
- **How long that span is:** after the fix, `on_pre − off_post` is the actor's 3 000 ms sleep plus a few small
  latencies:
  - the actor's `.pressed` poll, ≤ 50 ms (`s11b.ts:688`);
  - the driver's ready poll, 20 ms (`s11-win.ps1:70`);
  - one UIA title read in `Test-R19Armed`, and `Set-S11Front`.

  That is about 3.1–3.6 s, so the judged span is about 2.1–2.6 s.
- **What follows:** the `tick` page logs once every 1 000 ms. A span of 2.1–2.6 s holds 2 ticks for certain and a third
  only sometimes, so the row FAILs on most runs.
- **Before the fix,** `on` came ≥ 700 ms later (the post-press sleep plus the title read), which gave about 3 ticks.
- **Why it is the sheet's problem as well:** "wait 3 s" with 500 ms margins on both sides cannot guarantee 3 ticks at
  1 Hz.
- **Fix:** have the actor wait disarmed for at least 4 500 ms. This changes a step, not a pass rule: more disarmed
  ticks make the test stronger. Record it as a Proposed decision for the session agent (or as a dated sheet note before
  the run). Add a pure test: build `floorCounts` from synthetic times with the driver's real offsets.

**N2 MAJOR (there before the fix; round 1 missed it): ticks logged after the read count as "must be in the reply".**
`s12-r19-a.ts:473-475`, `s12-forms.ts:74`.
- **Why:** `aft` has no upper bound. The tick and error lists are read *after* `consoleMessages()` returns. A tick
  logged between the read and the `ticks` evaluate is counted in `after-ticks` but cannot be in the reply, so
  `in-reply-after < after-ticks` → FAIL.
- **The sheet's clause** is "every tick logged ≥ 500 ms after the on title is in the reply". A tick logged after the
  reply cannot meet it. The gap is the end of the reply plus one evaluate round trip, against a 1 000 ms tick, so this
  happens on some share of runs (estimated; not measured).
- **Fix:** take `readAt = Date.now()` just before `entriesOf`. Keep only `ticks`/`excs` with `t < readAt` before
  `floorCounts`. A cut at the end keeps the `i + 1` tick numbers. Add a test with a tick after `readAt`.

**MINOR-1: the after-window starts at the ON *press*, while the sheet says the on *title*.** `floorCounts` takes one
`onMs`, and the driver now passes `pre` (`s12-r19-a.ps1:20`). The sheet sets the disarmed side up to "the on press" and
the after side from "≥ 500 ms after the on title". So this judge counts ticks in `[pre + 500, post + 500)` that the
sheet does not judge. It turns into a false FAIL only if arming lags the click by more than 500 ms. **Fix:** report
both times, or call `floorCounts` twice: `pre` for the disarmed counts, `post` for the after counts. This stays in the
lane; `s12-forms.ts` is not changed.

**MINOR-2: `browser_status` is written whole to `actors-liveA19.jsonl`, and it prints the human's active tab.**
`mcp/src/tools/registry.ts:420` prints `Active tab: [Tn] <title> — <url>`, and the CON-MCP probe calls it (`:310`).
`Set-S11Front $global:W` usually makes a wave tab the human's tab, so this is likely to be a fixture. That is not
guaranteed, and if it is not, the title and URL leak and `other > 0` fails R19-LOGS for every pending row. That is the
same class as M4. **Fix:** redact `browser_status` the same way (for example
`status lines=<n> extension=connected active=<fixture|other|none>`), and widen the proposed decision to "the
existing-tools probes that list the human's tabs".

**MINOR-3: `Close-R19Bc` runs before the safety restore inside R19-RESTORE.** `s12-r19-lib.ps1:217`.
- `Invoke-R19Node` rethrows "exceeded its budget" and "exited <n>" (`s11b-r17.ps1:135-141`). A throw there skips
  `Close-S11Window` and `rd-restore` in this block. The safety restore is then left to `Stop-R19Wave`'s
  `Restore-R19State`, and a tab close that only tidies up stops the wave.
- **Fix:** move the line after `Invoke-R19Stamped $R17Blocks['rd-restore']`, or wrap it in `try { } catch { Say9 … }`.

**NIT-1:** `Test-R19Armed` is correct but looser than its siblings, which compare `-ne $S9TitleArmed` exactly
(`s11-win.ps1:320`). Use `-eq $S9TitleArmed`.

**NIT-2:** CON-4 already fetches the MCP `browser_snapshot` (`:353`) but does not use it. Judging the console text
equal to it, as CON-3 does, costs nothing and matches `CONREF … same-as=snapshot`.

**NIT-3:** the -OWN/-FILE ruling in §4 deserves a dated note on §4.27, so that Run 19's record does not reopen it.

**NIT-4:**
- `fixture-handle` splits on whitespace, so a fixture that is the human's tab (`T2*`) records `no`. It is
  record-only, not judged.
- `r.text.includes(mt)` passes on an empty `mt` (when `handleOf` fails). Require `mt !== ""`.
- The `bannerCtlRow` actor writes `bc-tab.txt` in every slice, but `Close-R19Bc` runs in liveA19 only. The B/C drivers
  must call it.

## 7. Proposed decisions (for the session agent)
### 2026-10-28 · CON-FLOOR's disarmed wait is 4.5 s, not 3 s
**Decided:** the actor stays disarmed at least 4 500 ms between the OFF title and the ON press. **Why:** with 500 ms
margins on both sides, a 3 s wait judges about 2–2.6 s of 1 Hz ticks, so `disarmed-ticks ≥ 3` fails on most runs
(N1). **Instead of:** lowering the pass rule to ≥ 2, which would weaken it. **Revisit if:** the tick period changes.
**By:** Claude (proposed, for the session agent; before the run).

The fixer's `list-tabs` decision should be widened to `browser_status` (MINOR-2). The m1 decision (scripted stdio MCP
client) still stands as proposed.

## 8. Handoff
- No process is left running. Scratch files (`mut2.mjs`, `mut2.txt`, `checks.txt`) are in my scratchpad, outside the repo.
- **The next fixer:** N1, N2 and MINOR-1 are all in `conFloor`, so fix them together and add one pure test.
  MINOR-2 is in `actorRecord` and MINOR-3 is one line in `s12-r19-lib.ps1`.
- **The step agent:** M6 (722 code lines against 400) and the two proposed decisions.

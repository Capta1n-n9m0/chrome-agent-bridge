# S7-drivers-B fixer, round 1 (of 3)

Model and effort: Sonnet 5.5, medium. Nothing ran live: no daemon, Chrome, fixture server or port 9234. Lane: `recipes/s12-r19*`, `recipes/test/s12-r19*`, this report. No commit.

## 1. Verdict
**DONE.** F1 to F11 are all fixed; none disputed. Every mutant the verifier listed as surviving is now killed, and the ones it killed still are.

## 2. Outputs
- `npx vitest run recipes/test`: before 1530 tests / 63 files, **after `Tests 1553 passed (1553)`, `Test Files 63 passed (63)`** (+23, no file added).
- All 7 `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0. `npm run typecheck` exits 0. `npm run build` prints `built extension → dist/`. `npm test`: `Test Files 229 passed (229)`, `Tests 5453 passed (5453)` (was 5430).
- Size (`wc -l`, `git diff --numstat`): code `s12-r19-b.ts` 321 + `s12-r19-b.ps1` 156, plus the edited files (about 75 added) = about 550 (cap 750). Tests: `s12-r19-b.test.ts` 585 new, plus 26 added in `s12-r19-a.test.ts` and `s12-r19-static.test.ts` = 611. That is 11 over the 600 test cap taken alone; code and tests together are about 1,160 against 1,350, so it stays inside the cap as §7 counts it. The extra is tests.
- Mutants: run in place on the real files by `scratchpad/fx1/mutants.mjs` (the verifier's cases with their strings updated to the new code), each restored and sha-checked (`restored=true` on all 16; `sha256` of every `recipes/s12-r19*` and test file identical before and after the run).

## 3. Findings to fixes to tests
| Finding | Fix | Test (`recipes/test/s12-r19-b.test.ts` unless named) |
|---|---|---|
| F1 carried banner rows STOP | New `judgeBannerCarried` and `--kind carried` in `s12-r19-a.ts`: `seen` with IDLE ≥ 20 000 and control `pass` is FAIL (the `BANNERCALL` line keeps both counts); `none` with both is PASS; else NOT MEASURED; never a STOP. UP-6 and F-RAW* use `-Banner carried`. The no-call `record` kind now also obeys IDLE and the control (`judgeBannerNoCall(banner, idle, ctl)`). liveA19's `refused` path is untouched. | "F1: a carried row's banner…" (a `seen` leg is exit 1, no `STOPWHY`), the `record` test, scenarios R1 to R3 below |
| F2 capture window read as DevTools | After `Open-R19Seg`, `$global:D` joins `$global:S12Before`. `devtools-open` comes from `Test-R19DevOpen`, which reads X's own record `$global:S12Dev` (window by handle, pane by UIA with every known window excluded). | S2 (`before=100,200,800`), S3 (`VAL:no` with the capture window reopened and X's DevTools gone) |
| F3 nested node calls | SWEEP-HELD is two actor runs: `sweep-held --phase 1` (holds DevTools, prints `SWEEPPRE attached=<yes\|no>`, releases the tab), then at block level `Save-R19Seg`, reload, `Open-R19Seg`, the R19-0 re-run (`LOADED rerun=<k>` only), then `sweep-held --phase 2` through `Invoke-R19Row` (re-claims, judges). No node call nests; `Invoke-R17Node` and the s11b/s9/s11 scripts are untouched. `Invoke-R19DevRow` got an optional `-Run` block. | S1 (the full call order), mutant M5 |
| F4 OVERLAP leg a never overlapped | `overlapRun` starts the second call before awaiting the first; `judgeOverlap` also needs the first value `1`. | "F4" (an event log: first-start, gap, second-start, first-end), the `judgeOverlap` cases |
| F5 wrong call's word, and no NOT MEASURED | The `KEEPDT … leg=devtools next=` line prints `code(dv)`, or `not-run` when the poll never reached K-devt. `judgeKeep4(…, attached)` makes both legs NOT MEASURED when it did not. SWEEP-HELD: an unattached phase 1 prints `ROW … NOT MEASURED` and reloads nothing. | "F5", S4 |
| F6 surviving mutants | New tests listed in section 4. | M3 to M6, M8 to M12, M15 all red |
| F7 BANNER-CTL ignored | `keep1Decision(…, ctl)` and `judgeKeep2(…, ctl)`: a control other than `pass` makes KEEP-1's banner leg and KEEP-2's end clause NOT MEASURED (`measured=no`, so KEEP-3's medians are skipped). A wrong answer is still the STOP. | "F7" |
| F8 `next=ok` unread | The idle leg sets `next = code(<the call's answer>)`. | source check in "F8, F10, F11" |
| F9 exit code dropped | DEVPROBE and DEVT-NOFLAG read the actor's exit code; `2` goes to `Stop-R19Actor`. | K5 and its mutant |
| F10 MCP tab left open | `browser_close_tab {tab: mt}` at the end of CON-KEPT. | source check |
| F11 line forms | UP-6 prints `IDLE R19-UP-6 since-attach-ms=<n>` once per leg; the driver pairs the n-th line with the n-th leg (`Get-R19IdleOf -Nth`), and an own-id line (every liveA19 row) is still used first. `CALLS <id> calls-sent=<n>`. | R1 (`…,,21001` to `…,,21005` in leg order); sheet-quote check |

## 4. Tests added (23)
- Pure (6): F1, F7, F5, F4, `assertKept3` (M11; the throw moved into the exported `assertKept3`), the F8/F10/F11 source checks.
- Driver scenarios (4 tests, run with every helper stubbed, `RunSteps` runs each step body): R1 to R3 on the real `Invoke-R19Row` from `s12-r19-a.ps1` (kind `carried` for UP-6 and F-RAW, `record` for the `calls-sent=0` leg, `refused` for a liveA19 row, the actor name passed, the IDLE of leg n); K1 to K5 (KEEP-3's restore when the actor dies, its steps' undo calls, DevTools open and close, DEVT-NOFLAG's `--probe`/`--kept`, exit 2); S1 to S4 (SWEEP-HELD).
- 13 new in-suite mutants of those scenarios. Two older assertions were adjusted to the new code: `judgeOverlap` and `judgeBannerNoCall` got arguments, `-Banner carried`, `idle(idleRow)`; one old mutant was re-aimed ("reopens the capture before the reload").

## 5. Verifier mutants re-run (`vitest run` over the b, a and static test files as listed; all restored)
| Mutant | Result |
|---|---|
| S0 (all nine pure judges constant) | killed, 9 red |
| M1 | killed |
| M2 | killed |
| M3 KEEP-3 composite restore | **killed** (K1) |
| M4 nav-blocked undo | **killed** (K2) |
| M5 reload without the segments | **killed** (S1, S2) |
| M6 `--probe`/`--kept` swapped | **killed** (K4) |
| M7 | killed |
| M8 DevTools opened by another method | **killed** (K3) |
| M9 every banner leg `record` | **killed** (R1; a.test.ts alone stays green, b.test.ts carries it) |
| M10 UP-6 without `-Banner` | **killed** (R1) |
| M11 `kept-session-used` throw turned off | **killed** (`assertKept3` test) |
| M12 `devtools-open` constant | **killed** (S3) |
| M13, M14 | killed |
| M15 `Invoke-R19Row` ignores `-Actor` | **killed** (R1, R2) |

liveA19: `s12-r19-a.test.ts` is green (full run above), and its own in-suite mutants are red as before.

## 6. Deviations and proposed decisions
- **Test size** 611 against 600 (above); within the combined cap.
- **F11, `calls-sent`:** §4.27 gives `calls-sent=0` only as a token ("printed by the runner's own wrapper"), not a line form. I print `CALLS <id> calls-sent=<n>` (the id pairs it with the leg). Ambiguity recorded, §4.27 not edited.
- **F11, KEEP-4 "within 1 s":** the menu method takes about 3.6 s (`s12-win-b.ps1:52-58`); no code change, §4.27's wording is the gap. The polls keep the session alive, so the leg still discriminates. **KEEP-2's ctl leg** checks the code only, as the pass rule says; the quoted `SINGLE_FILE_INPUT_MESSAGE` text is not compared. No change.
- **SWEEP-HELD `devtools-open`** for a DevTools window is "X's DevTools window is still alive" (`Test-S9Live` on its handle), the closest UIA-free reading of "DevTools still open" after a reload; a docked pane is read by UIA.

### 2026-10-28 · Carried banner rows FAIL, never STOP
**Decided:** R19-UP-6 and R19-F-RAW* judge their banner clause as `carried` (FAIL with counts under IDLE ≥ 20 000 and a passing R19-BANNER-CTL). **Why:** §4.27's STOP map does not list them and the phase doc lets a carried row continue. **Instead of:** `attach-on-refused-page` STOP. **Revisit if:** the sheet's STOP map adds them. **By:** Claude (proposed; the step agent confirmed it).

## 7. Handoff
- Nothing running; scratch files only under `scratchpad/fx1/` (`mutants.mjs`, `mut-out.txt`, `add-tests.ts`). No orphan processes started.
- Needs a fresh verifier on F1 to F11 and M3 to M15; the two new actor commands' shapes (`sweep-held --phase 1|2`, `banner --kind carried`) have never run live.

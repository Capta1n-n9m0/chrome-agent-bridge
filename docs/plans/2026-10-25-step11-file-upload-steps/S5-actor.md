# S5-actor — Run 16's SDK actor (step report)

Step agent: Opus 5.5, 2026-10-25 20:56Z → 21:25Z (UTC). Risk: low (recipes only).
Brief's READ list: `docs/agent-rules.md`; `docs/e2e-test-plan.md` lines 1445–1550 (§4.23); `recipes/s11-rules.ts`,
`recipes/test/s11-rules.test.ts`; `recipes/CLAUDE.md`; decisions.md #262, #273, #274, #277; phase doc § 0.8 and
§ Exit checks S5.3–S5.6; style models `recipes/s10.ts`, `recipes/s9-actor.ts`; salvage `step11-s5-salvage/recipes/`.

## 1. Verdict

**DONE.** `recipes/s11.ts` has a subcommand for every §4.23 script step; `isFixture11` follows #277 (b). Final
verifier verdict PASS-with-notes. One size overrun (MINOR-6) recorded, not fixed.

## 2. Outputs

- `recipes/s11.ts` (new, 977 lines; `ROW_MAP`, `TAB_SPEC`, `NEEDS` exported), `recipes/test/s11-actor.test.ts` (new,
  24 tests), `recipes/s11-rules.ts` (`isFixture11`, `scanText` `ownId`, small builders), `recipes/test/s11-rules.test.ts`
  (+3 tests, one existing UP-LOGS case made stricter: `ws://localhost:9234` is no longer fixture), `recipes/tsconfig.s11.json`
  (include list).
- `npm test`: 147 files / 3672 tests → **148 files / 3699 tests** (verifier 2, re-derived). `npm run typecheck`, `npm
  run build`, and `npx tsc --noEmit -p` on recipes `tsconfig{,.fe,.s6,.s9,.s10,.s11}.json`: all exit 0 (verifier 2).
- Nothing ran live. Port 9234 free at the end (`netstat`, 21:22Z).

### Row → subcommand (from `ROW_MAP`; verifier 1 re-derived it from the sheet)

| Row | Subcommand | Row | Subcommand |
|---|---|---|---|
| UP-L1 | `foundcheck` + `l1` | UP-9 | `up9` |
| UP-0 | `found` (options page / toggle reading: driver) | UP-PATCH | `patch` |
| UP-OPT | driver (options page) | UP-TWICE | `twice` |
| UP-FA | `fa` | UP-RAW | `raw` |
| UP-6 | `up6` | UP-NAV | `nav` |
| UP-7 | `up7` (state changes: driver) | UP-DEVT | `devt` (F12: driver) |
| SAVE-REFUSE-R | `saverefuse-sdk` + `saverefuse-mcp` | UP-STALE | `stale` |
| SW-2 | `sw2` | UP-7J | `up7j` (state change: driver) |
| UP-1 … UP-5 | `up1` … `up5` | UP-RACE-A / -B | `race a` / `race b` (button / block list: driver) |
| UP-6B | `up6b` | UP-RESTORE | `restore-check` (the restore itself: driver) |
| UP-8 | `up8` | UP-LOGS | `scan` |
| UP-CLICK | not run (#251) | | plus `setup`, `clean` (test files, tabs, signals) |

## 3. Verifier verdicts

- Round 1 (`S5-actor-verifier.md`, Opus 5.5, 21:07Z → 21:15Z): **PASS-with-notes**, 6 MINOR, 4 NIT.
  MINOR-1 a tab subcommand connected (spawning the daemon) before checking its tab exists; MINOR-2 `scan --what actors`
  kept the actor's closing text; MINOR-3 UP-2's reporter wait 30 s against the sheet's 120 s; MINOR-4 SW-2 lacked the
  sheet's visibility log; MINOR-5 no "loop ended" signal for the race rows, and UP-DEVT's window needs focus at setup;
  MINOR-6 size 958 lines against ~600 (DONE-PARTIAL rule not followed). NIT-1 `judgeError` prints `data` JSON;
  NIT-2 signal files never cleaned; NIT-3 `fa` without `found`; NIT-4 local dates labelled UTC.
- Fix round 1 (`S5-actor-fixer.md`, Sonnet 5.5 medium, 21:16Z → 21:18Z): MINOR-1…5, NIT-2…4 fixed; MINOR-6, NIT-1 left.
- Round 2 (`S5-actor-verifier2.md`, Opus 5.5, 21:18Z → 21:23Z): **PASS-with-notes**; all fixed items resolved
  (MINOR-1 and MINOR-2 proved by mutation); 2 new NITs: NIT-5 the visibility log is one total over SW-2's four trials, not
  per trial; NIT-6 the fixer's contract has the driver restore on `loop-done` for both races, while the sheet times
  UP-RACE-A's second press at +1.6 s.

## 4. Agents

| Agent | Model, effort | UTC | Notes |
|---|---|---|---|
| builder | Sonnet 5.5, medium | 20:57 → 21:06 | ~150k context (its report); its report's date reads 2026-10-26 (local; NIT-4) |
| verifier 1 | Opus 5.5 (effort not passed) | 21:07 → 21:15 | |
| fixer | Sonnet 5.5, medium | 21:16 → 21:18 | |
| verifier 2 | Opus 5.5 (effort not passed) | 21:18 → 21:23 | |
| committer | Sonnet 5.5, medium | after 21:25 | commit only |

## 5. Deviations

- **Size:** 977 lines of `s11.ts` against "about 600; else DONE-PARTIAL". The builder finished instead of stopping.
  Accepted at this step: no row lacks a subcommand, verifier 1 found nothing dead or copied, and splitting finished work
  would cost more than it saves. For the Sonnet/Opus comparison (§7): the brief's size guide did not hold the builder.
- **Verifier 1 started the daemon** (against the brief): its dry check of `fa` with an empty `state.json` connected
  before refusing (the MINOR-1 defect). The daemon (PID 22108, command line checked as its own) took the user's
  extension's connection (`extension resync: 1 tabs, 0 gone`); **no tab call was made**. It stopped the process at
  21:15Z; 9234 free since. The fix makes every tab subcommand refuse before `connect()`, tested with a spy.

## 6. Proposed decisions

### 2026-10-25 · UP-LOGS counts bare `localhost` on 8081/8084 as fixture
**Decided:** `isFixture11` treats `http://localhost:8081|8084` as fixture, as `isFixture10` does. **Why:** #277 (b)
names `isFixture10`'s reading, and the sheet's UP-8 page is bare `localhost:8084`. **Instead of:** the literal
"127.0.0.1 and `*.localhost`" reading, which makes the wave's own page "other" (a STOP it causes itself).
**Revisit if:** a live slice logs a bare-`localhost` URL that is not a fixture. **By:** Claude (proposed; verifier 1)

### 2026-10-25 · UP-RACE-A follows the sheet's +1.6 s timing; only UP-RACE-B restores on `loop-done`
**Decided:** the driver slice presses UP-RACE-A's second press at the sheet's +1.6 s and uses `UP-RACE-x-loop-done.ready`
only for UP-RACE-B's restore; the actor works either way. **Why:** the sheet binds over the fixer's contract (NIT-6).
**Instead of:** restoring on `loop-done` for both. **Revisit if:** a dated §4.23 note before the run says otherwise.
**By:** Claude (proposed)

## 7. Findings

- Sheet gaps (no §4.23 edit made): it names no tabs for UP-5 and the race rows (`TAB_SPEC` adds `u5`, `ra`, `rb`, `a7`);
  it does not say when the driver writes `.pressed` in the race rows.
- Untested until live: UP-8's promise-form `evaluate`; which window a new tab lands in for SW-2 and UP-DEVT (`setup
  --only x` must run while window X is the last-focused normal window).
- NIT-1 (`judgeError` printing observed `data` JSON) left open; harmless with today's codes (verifier 1).

## 8. Handoff

- Nothing running. Port 9234 free. Scratch copies (`scratchpad/ctl`, `mut`, `fixture-mut.mjs`) are outside the repo.
- For S5-driver: the signal-file contract (`*.ready` / `*.pressed` in `$S11_OUT`, plus `UP-RACE-x-loop-done.ready`)
  is in `S5-actor-builder.md` and `S5-actor-fixer.md`; the driver owns every safety-state and upload-folder change,
  the options page, the toggle read, reloads and windows; NIT-6 above for RACE-A's timing.
- `journal.md` carries the session agent's uncommitted line; it is not in this slice's commit.

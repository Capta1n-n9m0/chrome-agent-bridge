# S5-actor fixer report (Step 11, Run 16)

Model: Sonnet 5.5, effort medium. Start 2026-10-25T21:16Z, end 2026-10-25T21:18Z (UTC, `date -u`). Nothing committed. No daemon connected or started; `netstat -ano | grep :9234` empty before and after; tests bind nothing (connect is a spy).

| Finding | Change | Where | Test |
|---|---|---|---|
| MINOR-1 | `NEEDS` table (subcommand to tab keys); `main` loads state and resolves every handle before the handler, so before `connect()`. `race` keys from its argument; bad argument still stops first. | recipes/s11.ts `NEEDS`, `main` (~l.945-965) | s11-actor.test.ts "a state without the subcommand's tabs stops before connecting": every `NEEDS` entry, race a/b, second key (sw2), `connectSpy` not called; plus "NEEDS names a subcommand that exists". Written first, fails without the preflight. |
| MINOR-2 | `resultLines` drops `RESULT-OF-TURN`. | s11.ts `resultLines` | existing resultLines test now has a path in the RESULT-OF-TURN line and asserts it is dropped. |
| MINOR-3 | `observe` takes `waitMs`; UP-2 passes 120 000. | s11.ts `observe`, `up2` | none (live glue). |
| MINOR-4 | SW-2 installs a `visibilitychange` log on w and sw before the warm-up and prints a RECORD check line with both counts after. | s11.ts `sw2` | none (page glue). |
| MINOR-5 | `signal("<id>-loop-done")` after the race loop, before waiting for `<id>.pressed`. | s11.ts `race` | none (driver signal). |
| NIT-2 | `clean` removes `*.ready` / `*.pressed` in `$S11_OUT`. | s11.ts `clean` | "clean removes the driver's .ready and .pressed files". |
| NIT-3 | `fa` stops "needs the found toggle" when `found` never ran. | s11.ts `fa` | in the MINOR-1 test. |
| NIT-4 | Header date now 2026-10-25 (UTC). | s11.ts l.1 | n/a |

## Driver-slice contract (MINOR-5 and its companion)
- UP-RACE-A/B: the actor writes `UP-RACE-x-loop-done.ready` when the loop ends. The driver restores the arming / block list on it, then writes `UP-RACE-x.pressed` (as before). It must not restore earlier (a restore before 5 refusals in a row runs the loop to 80 calls).
- UP-DEVT: `setup --only x` must run while the driver's window X is the last-focused normal window, else tab `x` is not in X (`extension/src/tabs.ts` newTab).

## Checks
- All six `npx tsc --noEmit -p recipes/tsconfig{.s11,,.fe,.s6,.s9,.s10}.json`: exit 0. `npm run typecheck`, `npm run build`: exit 0.
- `npm test`: Test Files 148 passed (148); Tests 3699 passed (3699) (baseline 3696; +3: s11-actor 21 to 24).
- `s11.ts`: 958 to 977 lines (+19 net).
- Not fixed, as instructed: MINOR-6, NIT-1. The verifier's proposed decision (bare `localhost` as fixture) is left to the step agent.

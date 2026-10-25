# S5-actor builder report (Step 11, Run 16)

Model: Sonnet 5.5 (claude-sonnet-5-5), effort medium (#270). Start 2026-10-26 20:57 UTC, end 21:06 UTC. Context used: about 150k tokens. Nothing committed.

## 1. Verdict

DONE, over the size guide. Every §4.23 row step the sheet gives to a script has a subcommand. `recipes/s11.ts` is 958 lines (about 900 of code, many of them wide), against "about 600". I finished rather than stopping at DONE-PARTIAL because no row lacks a subcommand. The verifier should treat the size as a finding.

## 2. Outputs

- `recipes/s11.ts` (new). Pure parts are exported: `parseArgs`, `ROW_MAP`, `TAB_SPEC`, `tabUrl`, `toPage`, `resultLines`, `all`, `resultJudge`, `whichError`, `SUBCOMMANDS`, `main`. It runs only when it is the entry script.
- `recipes/test/s11-actor.test.ts` (new, 21 tests).
- `recipes/s11-rules.ts`: `isFixture11` (#277 (b)) and `ScanCtx.ownId`. `scanText` now counts fixture with `isFixture11`. No new builder was needed.
- `recipes/test/s11-rules.test.ts`: 3 new tests. One existing UP-LOGS test changed: it counted `ws://localhost:9234` as fixture, which #277 (b) forbids, so it now uses 8081/8084 http URLs and `chrome://extensions`.
- `recipes/tsconfig.s11.json`: include list now `s11.ts`, `s11-rules.ts`, both tests.

Commands run:
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11}.json`: all exit 0.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0 ("built extension → dist/").
- `npm test`: "Test Files 148 passed (148)", "Tests 3696 passed (3696)". Before my work: 147 files and 3672 tests. This is derived, not re-run: 3696 minus 21 actor tests minus 3 new rules tests. The 3273 in the root `CLAUDE.md` is stale.
- Dry checks, no daemon, port 9234 free before and after (`netstat` count 0): `npm run recipe -- recipes/s11.ts` printed `STOP: unknown or missing subcommand; known: …`. `… up1` with an empty `S11_OUT` printed `STOP: no state.json — run \`make\` and \`setup\` first`. The unit tests prove no state-reading subcommand calls `connect` (it is mocked to throw and never called).

## 3. Row to subcommand map

| Row | Subcommand | Notes |
|---|---|---|
| UP-L1 | `foundcheck --text-file`, then `l1` | The found text is kept by the driver |
| UP-0 | `found --file <json>` | Prints `STATE`, `TOGGLE` and the 17 `NOT RUN` rows when OFF. Reading the options page and the toggle is the driver's (out of scope) |
| UP-OPT | driver only | Options page |
| UP-FA | `fa` | Prints `not run — the toggle is on` when `found` recorded ON |
| UP-6, UP-6B | `up6`, `up6b` | One banner sampler around each row |
| UP-7 | `up7` | State changes are the driver's, via signals `UP-7-a`, `UP-7-b`, `UP-7-c` |
| SAVE-REFUSE-R | `saverefuse-sdk`, `saverefuse-mcp` | MCP leg needs `actor-start` first |
| SW-2 | `sw2` | |
| UP-1 … UP-4, UP-8, UP-9 | `up1` … `up4`, `up8`, `up9` | |
| UP-5 | `actor-start`, `up5`, `actor-end` | |
| UP-PATCH, UP-TWICE, UP-RAW, UP-NAV, UP-STALE | `patch`, `twice`, `raw`, `nav`, `stale` | `setup --only stale` opens the stale tab before the reload |
| UP-DEVT | `devt` | F12 and DevTools are the driver's |
| UP-7J | `up7j` | JavaScript off and on are the driver's |
| UP-RACE-A, UP-RACE-B | `race a`, `race b` | Button presses and block-list edit are the driver's |
| UP-RESTORE | `restore-check --found --now [--daemon]` | The restore and the options-page read are the driver's |
| UP-LOGS | `scan --what console\|daemon\|actors\|other --file` | `actors` keeps only tool-result lines |
| UP-CLICK | none | Not run (#251); `ROW_MAP` says so |

Setup helpers: `make` (wave files, junction `s11-link`, sentinel and alias names generated, never printed), `clean`, `setup [--only a,b]`.

Driver contract (the next slice builds it): signal files `<OUT>\<name>.ready` and `.pressed`. The names are `UP-1-sample` and `UP-1-sampled` (banner sampler; `.pressed` content `seen` or anything else), `<row>` and `<row>-done` (state change, then restore), and `UP-RACE-A` / `UP-RACE-B`. The driver reads the alias and found state from `state.json`.

Outside the repo (`$S11_OUT`, default `%TEMP%\bridge-e2e\s11`): `state.json` holds the alias, the sentinel and the file hashes. The driver must write `found.json` as `{armed, evaluate, blocklist:{lines,sha256}, uploadfolders:{lines,sha256}, toggle}`.

## 4. Deviations

- Size over guide (see Verdict).
- SW-2 does not install or read the visibility log. The sheet lists it, but it is not in the pass rule and no builder prints it.
- The sampler, state changes and F12 go through signal files, because the sheet gives the UI parts to the driver.
- `isFixture11` accepts bare `localhost` as well as `*.localhost`, at 8081 and 8084 only. UP-8's page is `http://localhost:8084/`, so the stricter reading would make the wave's own page "other".
- Printed lines are only `s11-rules.ts` builders (`rowLine`, `checkLine`, `stateLine`, `restoreLine`, `logsLine`, `sw2().lines`, `foundcheck().line`) and `STOP:` lines. Some `why` strings inside them are written in `s11.ts`: fixture file names, byte counts and sha256 of the wave's own files, and codes. Non-`Stop` errors print only `STOP: unexpected <Class> (<code>)`, never the message.

## 5. Proposed decisions

None.

## 6. Findings

- Sheet defect, minor: UP-5 and the race rows need tabs the sheet never names (`u5`, `ra`, `rb`, `a7`); `TAB_SPEC` names them.
- Sheet defect, minor: UP-RACE says the toolbar button is pressed 1.5 s after the ready signal, but not when `.pressed` is written. I assumed the driver writes `.pressed` after the second press and the restore.
- UP-LOGS would count `ws://127.0.0.1:9234` as "other" under #277 (b), as `isFixture10` does. This is harmless only if `daemon.log` holds no URL (the invariant says it does not).
- Untested by design, because nothing ran live: the `evaluate` promise form in `up8` (`fetch(...).then`), `newTab` landing in the same window as `w` for SW-2, and whether `listTabs` rows carry `current` and `windowId` (taken from `s10.ts`'s use).
- Not measured: `s11.ts` has never connected to anything.

## 7. Handoff

The next slice (S5-driver, PowerShell) implements the signal contract in §3. The verifier should check the size, the `uploadPageJudge` calls with `id` (the `stray` check), and that no `console.log` bypasses `say`.

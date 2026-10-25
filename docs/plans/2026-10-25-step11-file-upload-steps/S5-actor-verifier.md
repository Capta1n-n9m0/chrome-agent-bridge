# S5-actor verifier report (Step 11, Run 16)

Model: Opus 5.5 (claude-opus-5-5). Start 2026-10-25T21:07Z, end 2026-10-25T21:15Z (UTC from `date -u`; the builder's
report and the `s11.ts` header say 2026-10-26, which is the local date, not UTC — NIT-4). Read only; nothing in the
tree edited; nothing committed. Read: `docs/agent-rules.md`; `docs/e2e-test-plan.md` §4.23 (lines 1445–1550) with its
#277 note; decisions #262, #273, #274, #277; phase doc 0.8 and exit checks S5.1–S5.7; `recipes/CLAUDE.md`,
`daemon/CLAUDE.md`, `extension/CLAUDE.md`; `recipes/s11.ts`, `s11-rules.ts` (diff), both tests, the builder's report;
parts of `s9-actor.ts`, `s10-rules.ts` (`isFixture10`, `parseTurn`), `daemon/src/{leases,intercept}.ts`,
`extension/src/handlers/tabs.ts`, `test-fixtures/s11-patched.*`.

## 1. Verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding; 6 MINOR, 4 NIT. Every exit criterion holds except the size guide
(item 7, MINOR). One process note the step agent must see: **my dry check started the daemon** (MINOR-1 below
explains how; it is a defect of the actor, not a run of a row).

## 2. Exit criteria, each with its evidence

1. **Row → subcommand map (my own, from the sheet's Steps column).** Every script step has a subcommand:
   UP-L1 `foundcheck`+`l1`; UP-0 `found` (the options-page and toggle reads are UI, the driver's); UP-FA `fa`; UP-6
   `up6`; UP-7 `up7`; SAVE-REFUSE-R `saverefuse-sdk`/`-mcp` (+`actor-start/end`); SW-2 `sw2`; UP-1…4, 6B, 8, 9, PATCH,
   TWICE, RAW, NAV, DEVT, STALE, 7J, RACE-A/B, UP-5, UP-RESTORE `restore-check`, UP-LOGS `scan`; file making `make`.
   Handed to the driver, and correctly so per the sheet: UP-OPT (options page, entirely UI), UP-0's reading, UP-7/7J/
   RACE state changes (options page O or the toolbar button), UP-DEVT's F12, the banner sampler (UI Automation), the
   restore itself and the toolbar title. UP-CLICK is not run (#251). **Gaps:** SW-2's "visibility log on w and sw"
   step is not done (MINOR-4); UP-2's reporter wait is 30 s, not the sheet's 120 s (MINOR-3).
2. **Printed lines.** `grep -n "console\.\|process\.std\|say(" recipes/s11.ts`: one sink, `say` (l.227); every call
   passes `checkLine`/`rowLine`/`stateLine`/`toggleLine`/`restoreLine`/`logsLine`/`foundcheck().line`/`sw2().lines`/
   `liveBPlan().lines`, or `STOP: …` (l.948). The SDK has no console writes (`grep` over `sdk/src/*.ts`: none). Error
   path: a non-`Stop` throw prints class + code only — dry run `foundcheck --text-file C:/no/such/dir/x.txt` printed
   `STOP: unexpected Error (ENOENT)`, no path. `Stop` texts carry only fixture names, keys and handles. Judges print
   codes and counts, never an observed message (`judgeError`, s11-rules.ts:74-81); `whichError` prints a key or a code
   with a length. `make` prints the wave files' byte counts and sha256 (allowed: "the sha256 recorded when the wave
   made the file"). The alias and the sentinel go only to `state.json` under `$S11_OUT`. Holds; NIT-1 on `data`.
3. **No safety or folder edit.** Bridge methods called (`grep -o 'call("…"'`): `daemon.status`, `evaluate`,
   `focusTab`, `listTabs`, `newTab`, `screenshot`, `snapshot`, `uploadFiles`, plus the SDK's `upload`,
   `evaluateToFile`, `claim`, `release`, `focus`. No `storage`, options page or settings file is touched. Holds.
4. **s9-actor reused.** `actor-start`/`actor-end`/`mcpRaw` spawn `recipes/s9-actor.ts` via its CLI (`start …
   --no-tool-search`, `send … --timeout`, `end`, `S9_ACTORS`; all exist, s9-actor.ts:13-16, 33); transcripts are
   parsed with `s10-rules`' `parseTurn`. Nothing copied. Holds.
5. **Builds and counts.** All six `npx tsc --noEmit -p recipes/tsconfig{.s11,,.fe,.s6,.s9,.s10}.json`: exit 0.
   `npm run typecheck` exit 0; `npm run build` exit 0 (`built extension → dist/`); `npm test` exit 0:
   `Test Files 148 passed (148)`, `Tests 3696 passed (3696)`. Per file (`npx vitest run` on the two): actor 21,
   rules 50; `git show HEAD:recipes/test/s11-rules.test.ts` has 47 `it(` → +3. HEAD baseline 3696 − 21 − 3 = 3672 in
   147 files, matching the builder. No drop.
6. **#277 (b).** `isFixture11` (s11-rules.ts:490-500): `http` only, host `127.0.0.1` or `(label.)*localhost` at port
   8081|8084 exactly, `chrome://extensions`, own `chrome-extension://<id>`. **Discrimination proven:** the HEAD fixture
   loop run in a scratch script (`scratchpad/fixture-mut.mjs`) over the new tests' inputs gives 10 mismatches (e.g.
   `http://127.0.0.1:8080/` fixture, `chrome://extensions` other, `chrome-extension://ownid/…` other), the scanText
   test gets 2 not 1, the UP-LOGS test 3 not 4 — every new test fails on the old logic. **Bare `localhost`:** #277
   says "127.0.0.1 and `*.localhost` aliases" but also "Step 10's reading (`isFixture10`)", whose set holds bare
   `localhost:8081`, and the sheet's own UP-8 page is `http://localhost:8084/`; counting it fixture is the consistent
   reading, not a loosening (it is 127.0.0.1 by Chrome's resolution). Accepted; it should be stated in a dated note
   (Proposed decision below). **The changed test** dropped `ws://localhost:9234` as fixture: required by (b) (not
   `http`, not 8081/8084), and the new assertions are stricter. Harmless live: `daemon.log` withholds every line with
   `://` (`daemon/CLAUDE.md`), and product code never logs URLs. Holds.
7. **Size.** `s11.ts` 958 lines, 868 non-blank non-comment, 52 lines over 140 characters, against "about 600" with a
   DONE-PARTIAL stop (#271). MINOR-6. No dead code (`tsc --noUnusedLocals --noUnusedParameters`: no `s11.ts` error);
   no duplication beyond one-line helpers (`sleep`, `sha256Hex`, `attempt`); in scope except the descriptive
   `ROW_MAP` and `whichError`, which are small and tested.
8. **Dry checks** (with `S11_OUT` in my scratchpad; `netstat -ano | grep -c 9234` = 0 before): no args and `bogus` →
   `STOP: unknown or missing subcommand; known: …` exit 2; `up1`, `l1 --daemon`, `scan --what console --file …` →
   `STOP: no state.json — run \`make\` and \`setup\` first` exit 2; `race c` → `STOP: race takes a or b`;
   `foundcheck` / `foundcheck --text-file` / `restore-check` / `scan` → their own `STOP:` lines; ENOENT as above.
   Offline: `make` (8 CHECK lines, junction resolves outside), `foundcheck` → `FOUNDCHECK root=not outside=not`,
   `found` (OFF) → STATE, TOGGLE, the 17 NOT RUN lines, exit 0; `restore-check` and `scan` gave their lines; `clean`
   removed everything through the junction. **Then `fa` (state present, toggle off, no tabs) connected before
   refusing**: `STOP: no tab "fa" in state.json — run \`setup\``, and `daemon.log` shows `listening on 127.0.0.1:9234`,
   `client + "s11-fa"`, `client - "s11-fa"`, `extension resync: 1 tabs, 0 gone` at 21:11:53–21:12:01Z. No tab call
   was made. I stopped the daemon (PID 22108, mine) at 21:15Z; see Handoff.

## 3. Findings

**MINOR-1 — handle refusals come after `connect()`.** s11.ts:298-311 with e.g. 515-516: every tab subcommand calls
`session()` (which runs `connect()`, spawning the daemon if none) before `handle()` can refuse a missing tab. Evidence
in 2.8. The unit test (s11-actor.test.ts:126-133) covers only a missing `state.json`. Fix: resolve every `handle(s,
…)` before `session(...)`, and add a test with a state that lacks tabs, asserting `connectSpy` not called.

**MINOR-2 — `scan --what actors` keeps `RESULT-OF-TURN` lines** (s11.ts:198). That line is the model's own closing
text (s9-actor.ts:165), not a tool result; the sheet scans tool results only. An actor that says "uploaded
…\s11-…\s11-sent.bin" would count the profile path and the sentinel → a false STOP. Fix: drop the `RESULT-OF-TURN`
alternative (keep the `OUTPUT` and `    [i/n]` lines; every line of an item carries the prefix, s9-actor.ts:176-177).

**MINOR-3 — UP-2's reporter wait is 30 s, the sheet says "at most 120 s".** `observe` → `readPage(c, h, id)` with
no `waitMs` (s11.ts:395, 316). A 57 MiB page-side hash that takes 30–120 s becomes a STOP instead of a judged row.
Fix: pass `waitMs` through `observe` and use 120 000 for UP-2.

**MINOR-4 — SW-2's "visibility log on w and sw" step is skipped** (s11.ts:828-859; builder deviation 2). The step is
in the pre-written Steps column, though not in the pass rule. Fix: install the page-side `visibilitychange` log on
both tabs before trial 0 and record it as a RECORD line, or have the session agent rule the omission in a dated note
before the run (it cannot change the outcome table).

**MINOR-5 — the driver contract has no "loop ended" signal for UP-RACE-B** (s11.ts:756-761). The sheet restores
the block list "after the loop", but the driver learns nothing when the loop ends; it can only wait for its own
timing, then write `.pressed`. Restoring early ends the blocked run before 5 refusals in a row (the loop then runs to
80 calls); late is harmless. Fix: `signal(\`${id}-loop-done\`)` after the loop, the driver restoring on it. Also for
the driver slice: UP-DEVT's "window X" — `newTab` opens in the last-focused normal window
(`extension/src/tabs.ts:9-15`), so `setup --only x` must run while the driver's window X is focused, or tab `x` is
not in X; the contract should say so. Other contract checks hold: every actor wait is bounded (`waitPressed` 120/30 s,
`readState` 30 s, `waitSafety` 10 s, setup 20 s, `spawnSync` 60/120 s, the race ≤ 80 calls, 5 refusals or
timeouts ending it); `signal` deletes `.pressed` before writing `.ready`, so a stale press is never read.

**MINOR-6 — size over the slice guide** (958 lines vs ~600, #271's DONE-PARTIAL rule not followed). The content is
in scope and not padded; the cost is review load and context. For the step agent: record it against the Sonnet
build (§7 comparison).

**NIT-1** — `judgeError` prints observed `data` JSON on a mismatch (s11-rules.ts:79). Today's codes carry
`{scope}`, `{name}`, `{owner, since}`; a `TAB_GONE` would carry a fixture `lastUrl`. Acceptable; count-only would be
safer.
**NIT-2** — `.ready` files are never removed, and `clean` leaves them (s11.ts:346-350, 438-444); a driver restarted
after a STOP could act on an old one. Have `clean` remove `*.ready`/`*.pressed`.
**NIT-3** — `fa` runs when `found` was never recorded (`s.toggle` undefined, s11.ts:514); it should STOP and ask for
`found` first.
**NIT-4** — dates: the builder report's "2026-10-26 20:57 UTC" and the file header's date are local dates.

**"Untested until live" claims, checked by reading:** `evaluate` awaits a returned promise (`awaitPromise: true`,
`extension/src/debugger.ts:184`), so UP-8's `fetch(...).then` form should work; `listTabs` rows carry `active` and
`windowId` (`extension/src/handlers/tabs.ts:8-16`) and the daemon's rows `current`, so SW-2's guard has its fields;
`newTab` opens in the background in the last-focused window, so `sw` lands beside `w` only if that window is the
focused one at `setup` (the guard STOPs otherwise). An unleased tab is callable by any client (`leases.ts:42-45`), so
UP-5's page reads beside the MCP actor (which never claims a targeted tab) and `raw`'s unclaimed calls are sound.
The patch fixture's reporter never calls `getAttribute` (only `s11-patched.js:5` patches it).

## 4. Proposed decisions

### 2026-10-25 · UP-LOGS counts bare `localhost` on 8081/8084 as fixture
**Decided:** `isFixture11` treats `http://localhost:8081|8084` as fixture, as `isFixture10` and UP-8's page do.
**Why:** #277 (b) names `isFixture10`'s reading, and the sheet's own UP-8 page is bare `localhost:8084`.
**Instead of:** the literal "127.0.0.1 and `*.localhost`" reading, which makes the wave's own page "other" (a STOP
it causes itself). **Revisit if:** a live slice logs a bare-`localhost` URL that is not a fixture.
**By:** Claude (proposed)

## 5. Handoff

- The daemon my `fa` dry check spawned (PID 22108, command line checked: `node …\daemon\dist\index.js`) had no
  clients from 21:12:01Z; at 21:15Z I stopped it (`Stop-Process`, mine by §8) rather than wait for its idle exit.
  Port 9234 then had no listener (`netstat`). The user's extension will reconnect when the next client spawns a
  daemon. Nothing else of mine is running.
- Scratch: `scratchpad/fixture-mut.mjs` (the old-logic check); the dry run's wave folder was removed by `clean`.
- For the fixer: MINOR-1…5 are small edits in `recipes/s11.ts` plus one test for MINOR-1 and MINOR-2.

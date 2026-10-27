# Step 12 S3a — builder report (console messages: shared type, reducer, collector, handler, both tables)

Model / effort: Opus, medium. Commit: none (brief).

## 1. Verdict

**DONE-PARTIAL (size only).** Everything in the brief is built and green; nothing remains to build. The slice is
770 new lines against a 450 cap: code 320 (under the cap), tests 450. That is over §7's 1.5× (675), so by the rule it
reports DONE-PARTIAL. Acceptance is the step agent's call under #341's Revisit-if (see §4, §5).

## 2. Outputs

**Spec-note commit (alone, first):**
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`: §10, the dated note "Amended 2026-10-27 (Step 12 S3a; …)"
  after the S2b note (+32 lines). It covers the method, the entry shape, the read, the filters and the class.

**Code commit:**
- new `extension/src/console-messages.ts`: `ConsoleCollectors` + the `consoleCollectors` singleton,
  `collectConsole`, `CONSOLE_SETTLE_MS`, `ArmFloor` + `consoleArmFloor`, `reduceConsole`. Pure, with no log call.
- new `extension/src/handlers/console.ts`: the `consoleMessages` handler, `CONSOLE_READ_TIMEOUT_MS`.
- `shared/src/protocol.ts`: `CONSOLE_LEVELS`, `ConsoleLevel`, `CONSOLE_TEXT_MAX`, `CONSOLE_ENTRIES_MAX`,
  `ConsoleEntry`, `ConsoleMessagesParams`, `ConsoleMessagesResult`, `ConsoleMessagesCheck`,
  `checkConsoleMessagesParams`.
- `extension/src/safety.ts`: one line, `consoleMessages: "evaluate"`.
- `extension/src/sw.ts`: two imports; the `router.on("consoleMessages", …)` line with a comment; the one top-level
  `chrome.debugger.onEvent` listener (placed after `onDetach`, before `setAccessLevel`); and `onArm` also calls
  `consoleArmFloor.armed()` (a deviation, §4).
- `daemon/src/methods.ts`: one line, `"consoleMessages"` in `TAB_METHODS`.
- new tests: `shared/test/protocol-step12-console.test.ts` (5), `extension/test/s12-console-reduce.test.ts` (19),
  `extension/test/s12-console-gate.test.ts` (9), `extension/test/s12-method-tables.test.ts` (2, the cross-table test).
- count and list updates that follow directly (no test removed): `extension/test/safety-gate.test.ts` (27 → 28 and the
  list), `extension/test/sw-static.test.ts` (27 → 28, twice), `extension/test/gated-router.test.ts` (27 → 28),
  `extension/test/s3a-dnr-wiring.test.ts` (top-level `addListener` 19 → 20), `daemon/test/methods.test.ts` (the list),
  `daemon/test/safety-surface.test.ts` (`STEP12_S3A_TAB_METHODS`).

`docs/decisions.md` and `journal.md` show as modified in the tree, but those edits are not mine.

**Sizes** (`wc -l` on the new files, `git diff --numstat` on the edited ones): code 216 + 43 + 48 + 1 + 1 + 11 = 320;
tests 126 + 243 + 27 + 37 + 17 (count edits) = 450; spec note 32.

**Test counts:**
- Full suite: `npx vitest run` before the slice gave 198 files, 4768 tests. `npm test` after gave 202 files, 4816 tests,
  all passed.
- My share is +4 files and +35 tests. The other +13 are the S1-helpers-a lane's `recipes/test` changes, which landed in
  between.
- Package-only after the slice: `npx vitest run extension daemon shared mcp sdk` gave 154 files and 3756 tests,
  all passed.

**Checks:**
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p` on each of `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0, all seven.
- `npm run build`: exit 0. `git status --short` after the build: no tracked change beyond the files above.

**Mutants** (each one changed, the tests re-run, then the file restored, `cmp` identical):
- Cross-table: removing the daemon line made 2 tests red; removing the `METHOD_CLASSES` line, 2 red; an extra
  extension-only method, 1 red; class `tab`, 2 red.
- Reducer: no cut-stack URLs, no floor, revoked ignored, no context origin, no-source kept, no stack cut, child session
  collected, text cap off. Every one of these turned at least one test red.
- The new files fail on the code before the slice: the modules and exports they import do not exist there. The
  cross-table test's second case fails there too: before the slice, neither table has `consoleMessages`.

### For S3b's handoff
- **Wire:** `consoleMessages {tab, level?, limit?}`. The daemon forwards `{tabId, level?, limit?}` as a tab method:
  lease-checked, no visibility lock.
- **Params:**
  - `level` is absent or one of `"error" | "warning" | "info" | "debug"`. A level keeps itself and every more severe
    level; absent means all four.
  - `limit` is an integer 1–200, default 200; the newest entries are kept.
  - The shared guard is `checkConsoleMessagesParams(p)`. It returns `{ok, level?, limit}` or `{ok:false, message}`.
- **Reply:** `{entries: ConsoleEntry[]}`, oldest first, newest last. Each entry is `{level, text, ts, kind}`:
  - `text` is at most 2000 characters; a cut text ends with `…`.
  - `ts` is ms since the epoch, from CDP.
  - `kind` is `"console"` or `"exception"`.
- **Refusals:**
  - `BAD_PARAMS` with no `data`: `consoleMessages: level must be one of "error", "warning", "info", "debug"` and
    `consoleMessages: limit must be an integer from 1 to 200`.
  - Class `evaluate`, so the gate's existing answers apply. Disarmed: `DISARMED {scope:"all"}` with
    `DISARMED_ALL_MESSAGE`. JavaScript off: `JS_DISABLED` with `JS_DISABLED_MESSAGE`. On a blocked, own or `file:`
    page: `DOMAIN_BLOCKED` with `BLOCKED_TAB_MESSAGE` / `OWN_PAGE_MESSAGE` / `FILE_PAGE_MESSAGE`.
  - Debugger failures go through `describeDebuggerError` with the caller name `"browser_console_messages"`, for
    example `DEBUGGER_DEVTOOLS` when DevTools is open. The 10 s bound gives today's `TIMEOUT` text.
  - Called outside the gate: `INTERNAL "consoleMessages runs only through the safety gate"`.
- **Counts after S3a:** 28 router methods, 27 codes (no code added), log sites unchanged (the `log-scan` tests are
  green and the allowlist is untouched).

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **Size:** 770 lines against 450. Code is under the cap; the extra is tests. Those tests are the exit checks' own rows:
  C3.2's six refusals through `GatedRouter`, C3.3's cases including F8's stack/URL-in-description case, the
  cross-table test, the collector's paths and the sentinel. Per §7 that is DONE-PARTIAL; #341's Revisit-if ("a later
  slice overruns the same way") is met.
- **`sw.ts` `onArm`:** besides the one `router.on` line and the one listener, `onArm` now also calls
  `consoleArmFloor.armed()`. The rule "drop entries before the latest arm" needs the arm time, and nothing recorded it
  before.
- **Tests in `daemon/test` and the count tests:** updated as direct consequences (listed in §2).
- **Reuse:** `withDebugger` and `raceTimeout` from `debugger.ts`, and `call.networkFilter()` from `safety-call.ts`
  (the block-list read afresh, as the network query does it). Neither file is edited.
- **The S2a note's form** was followed. No e2e rows were added, per the brief's deviation; the live checks are in §7.

## 5. Proposed decisions

### 2026-10-27 · S3a: the overrun is tests; accept as #341 did
**Decided:** S3a commits as one slice: 770 lines, code 320 under its 450 cap, tests 450. **Why:** nothing remains to
build, and the extra lines are exit-check rows. **Instead of:** trimming C3.2/C3.3 rows. **Revisit if:** S3b overruns
the same way; then the caps get a tests allowance. **By:** Claude (proposed)

### 2026-10-27 · S3a: `level` is a severity threshold, the reply is `{entries}`
**Decided:** levels `error > warning > info > debug`. `console.error` and `assert`, and every exception, are `error`;
`warning` is `warning`; `debug` is `debug`; every other console call is `info`. A level keeps itself and the more
severe levels; absent means all. The reply is an object `{entries}`, so fields can be added later. **Why:** the
phase doc left these open; this follows Playwright MCP's `browser_console_messages`. **Instead of:** raw CDP types,
exact-match filters, a bare array. **Revisit if:** S3b's formatter or the MCP schema wants something else.
**By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · S3a: the "latest arm" is worker memory, its start until an arm
**Decided:** `ArmFloor` holds the time of the last disarmed → armed transition `SafetyStore` reports (`onArm`). Until
the worker sees an arm, it holds the worker's own start. So after a worker restart, messages logged before it are
dropped, even if the bridge was armed throughout. **Why:** fails closed. Nothing stores the arm time; a new
`storage.local` key would touch the safety state's store. **Instead of:** persisting it in `storage.session`, or
keeping everything after an unknown arm. **Revisit if:** live runs show restarts losing wanted messages. (The 25 s
keepalive makes restarts rare.) **By:** Claude (proposed, safety)

### 2026-10-27 · S3a: what counts as an entry's source; no source is dropped
**Decided:** the sources are:
- every stack frame URL, the `parent` chain included;
- an exception's `url`;
- every URL in the stack part a description loses when it is cut;
- the execution context's origin, from `executionContextCreated`.

Every source must pass the filter (not blocked, not this extension's own page, not `file:`). An entry with no source
at all is dropped. The stack cut (at the first `\n<space>at `) applies to every object description, a logged Error
included, not only to exceptions. **Why:** G-7, F8 (a), (c). A same-site frame of a blocked host is caught by its
context's origin. **Instead of:** the top frame's URL only. **Revisit if:** live runs show that
`executionContextCreated` does not come within the settle, which would drop every entry. **By:** Claude (proposed,
safety)

### 2026-10-27 · S3a: a 100 ms settle and a 10 s bound
**Decided:** after `Runtime.enable` answers, wait 100 ms for the replay, then `Runtime.disable`. The whole read is
raced at 10 s. **Why:** Stage 0 did not measure whether the replay events arrive before `enable`'s answer; m1 waited
300–1500 ms. **Revisit if:** a live check gets fewer entries than the page logged. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed.
- No runtime fact was measured: no Chrome run, by the brief.
- Observed: `extension/src/sw.ts` already had one top-level `chrome.debugger.onDetach` listener. The new `onEvent`
  listener sits beside it, and `waitPaused` (S2a) still adds and removes its own per-call listener.

## 7. Handoff

There are no processes, no Chrome and no port 9234.

**Live checks the glue needs** (for S7 / §4.27; not written as rows):
1. A fixture page logs 10 messages before the call. `consoleMessages` returns them, with the 100 ms settle.
2. `executionContextCreated` for the main context arrives inside the call. Otherwise every entry drops as "no source".
3. Timestamps compare with `Date.now()`. A message logged while disarmed and then re-armed is dropped; one logged after
   the arm is kept.
4. A same-site iframe of a blocked host: its messages are dropped. An out-of-process frame: not read.
5. An uncaught error and an unhandled rejection: one entry each, with no stack and no URL. A rejection handled later
   (revoked) is absent.
6. A 1 MB message comes back as 2000 characters ending with `…`.
7. JavaScript off gives `JS_DISABLED`; disarmed gives `DISARMED`. A blocked, `file:` or own page gives `DOMAIN_BLOCKED`.
   None of these attaches, and no banner shows.
8. The banner appears during the call and clears afterwards. With DevTools open: `DEBUGGER_DEVTOOLS`.
9. A sentinel in the console text appears in the reply only. It is absent from the worker console and `daemon.log`
   (the daemon half is S3b's `log-sentinel` addition).
10. A navigation clears the store: 0 entries from the earlier page.

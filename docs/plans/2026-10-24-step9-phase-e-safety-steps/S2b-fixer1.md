# S2b — fixer round 1 report (Step 9, stage S2b)

Fixer r1, 2026-10-24, Claude Opus 5.5 (claude-opus-5-5). Brief: `briefs/S2b-fixer1.md`. Scope: the verifier's
F2, F3 and F5 only. F1, F4 and F6–F8 were left alone, as the step agent ruled. Nothing was committed. I did not
reload the extension, touch Chrome, start the real daemon or bind 9234. I made each on-disk mutation against a byte
backup in the scratchpad and restored it. `cmp` and `git diff --quiet` printed `restored-*` / `same-*` after each.

## F2 (MINOR): the log scan misses other output paths. **Fixed.**

Files: `extension/test/log-scan.ts` (the enumerator and its header), `extension/test/log-allowlist.ts` (+6 entries),
`extension/test/log-scan.test.ts` (+5 tests; the size test now expects 15/33/0/6).

The scan now enumerates these forms, in addition to the `console.*` calls, the `log(…)` / `….log(…)` calls and
`console` used as a value:
- `process.stdout` / `process.stderr` in any use. A `.write(…)` call is recorded as the call's text; any other use
  is recorded as "(as a value)". `process` itself used as a value (an alias, an argument, a destructuring) is a site
  too. A plain `process.env` / `process.pid` is not.
- `log` / `….log` / `…["log"]` used as a value: an alias (`const say = o.log`), an argument, a return value, a
  `{ log }` shorthand, or a destructuring (`const { log } = o`, `{ log: say }`, a destructured parameter). This is
  the treatment `console` already gets. `log.<member>` other than call/apply/bind is not a site, because the
  extension's network log is an object named `log` (`log.query(…)`, `log.clear(…)`). The test pins that this form
  is not a site.
- `.call` / `.apply` / `.bind` on a logger. A called invoker is recorded as the call's text; an uncalled one, as
  "(as a value)".
- **A logger injected under another name is caught when it uses a level name.** Any call of
  `warn`/`info`/`debug`/`trace`/`error` on anything but `console` is a site: `this.deps.warn?.(url)`,
  `options.error(url)`, a bare `debug(url)`, and `deps.info.call(…)` too. None exists in today's tree, so this rule
  has no false positive. A logger under an unrelated name from its origin (a parameter `say` filled by
  `(m) => logger.log(m)`) is not followed past that wrapper. The test's header comment (`log-scan.ts`) states this
  convention, and names the sentinel test as the backstop.

**New sites in today's tree** (6, all allowlisted with a note). None prints a URL, title, pattern or the token:
| file | site | what it prints |
|---|---|---|
| `daemon/src/handle-mark.ts` | `log (as a value): options.log ?? (() => {})` | nothing; copies the logger into the local `log` of the two `log(LOG_*)` entries |
| `daemon/src/wsHost.ts` | `log (as a value): log: options.log` | nothing; hands the logger to TabLayer (intercept.ts's `this.deps.log?.(…)` entries) |
| `daemon/src/wsHost.ts` | `log (as a value): log = this.options.log` | nothing; the local copy behind `log(\`extension error without code: …\`)` |
| `daemon/src/wsHost.ts` | `log (as a value): proto && log` | nothing; a truthiness test |
| `mcp/src/index.ts` | `process.stdout (as a value): stdout: process.stdout` | nothing; handed to `installLifecycle`, typed `EventEmitter`, which only listens for `error` (`lifecycle.ts:66,84`) |
| `mcp/src/index.ts` | `process (as a value): signals: process` | nothing; signal listeners only (`lifecycle.ts:67,85`) |

Note (not a finding against the lane): the MCP's stdout is its JSON-RPC channel. The MCP SDK's stdio transport writes
it inside `node_modules`, outside the scanned packages. Tool results on that channel carry page URLs and titles by
design. It is the API, not a log.

Red on restored temporary on-disk mutations (`npx vitest run extension/test/log-scan.test.ts -t "both ways"`).
The verifier ran these same forms against the first scan and both stayed green:
```
V3  mcp/src/index.ts  + const url = "u"; process.stderr.write(url);
    +   "mcp/src/index.ts | process.stderr.write(url)",      Tests  1 failed | 15 skipped (16)
V4  daemon/src/wsHost.ts  + const o = {…}; const say = o.log; say("u");
    +   "daemon/src/wsHost.ts | log (as a value): say = o.log",      Tests  1 failed | 15 skipped (16)
log.call  daemon/src/wsHost.ts  + declare const log: …; log.call(null, "u");
    +   "daemon/src/wsHost.ts | log.call(null, \"u\")",      Tests  1 failed | 15 skipped (16)
```
In the whole file, also red: `process.stdout.write(url)` in `mcp/src/index.ts` and `deps.warn?.("u")` in
`wsHost.ts` (each `Tests 4 failed | 12 passed (16)`: "both ways" plus the three in-memory tests that compare the
whole tree). Every run was restored, and the final output was `restored-both` / `same-mcp-daemon`.

## F3 (MINOR): the writers test misses aliases and destructuring of `chrome`. **Fixed.**

File: `extension/test/safety-writers.test.ts`: two new rules in `writerViolations`, a `CHROME_VALUE_ALLOWED` list
(empty, because no legitimate site exists in `extension/src`), a header line, and +6 in-memory mutation tests.
- `chrome` may appear only as the object of a property or element access. These are flagged: an alias, a
  destructuring source, an argument, a parenthesised use, and `globalThis.chrome` (`chrome` as a property name).
  Type positions (QualifiedName, TypeQuery, TypeReference) and declaration names are not values.
- Any binding element whose key is `storage` or `local` is flagged, nested ones included.
- Today's tree: `no violation in extension/src` is green. There are no false positives, so nothing needed
  allowlisting.

Red on restored temporary on-disk mutations of `extension/src/handlers/tabs.ts` (`-t "no violation"`; each run
`Failed Tests 1`):
```
W8   const c = chrome; void c.storage.local.set({});
     + "handlers/tabs.ts: chrome used other than as the object of a property access: c=chrome"
W9   const { storage: __s } = chrome; void __s.local.set({});
     + "handlers/tabs.ts: storage destructured: {storage:__s}"
W12  const { storage: { local: __l } } = chrome; void __l.set({});
     + "handlers/tabs.ts: storage destructured: {storage:{local:__l}}"
```
After the three runs: `restored-tabs`. The in-memory tests also cover these mutations: `local` destructured from
`chrome.storage`, `chrome` passed as an argument, and `globalThis.chrome…`.

## F5 (NIT): the `write-failed` title outlives a later saved OFF. **Fixed.**

Files: `extension/src/badge.ts` and `extension/src/sw.ts` (one constructor argument and one import name). Tests:
`extension/test/badge.test.ts` (+4).
- `BadgeModel.inputFor(read, storedArmed?)`: a `write-failed` note ends when the **stored** switch reads disarmed
  (`storedArmed === false`). The gate's `read()` cannot show this, because a disarm held in memory masks the stored
  value (#176). An unknown stored value (`undefined`, or a rejected read) keeps the note. This fails safe, because
  the title then over-warns rather than under-warns. `arm-failed` is not cleared by a stored disarm, since a stored
  disarm is what that title describes. A read that says disarmed is always `OFF`. Nothing in this change can
  produce an armed badge.
- `BadgeControllerDeps.storedArmed?()`. In `sw.ts`:
  `storedArmed: () => chrome.storage.local.get(null).then((raw) => parseStoredSafety(raw).armed)`. I used
  `get(null)` because `sw.ts` may not name the safety keys: the writers test allows `SAFETY_KEY_NAMES` only in
  `safety-state.ts` / `options.ts`. As a side effect, the read also loads `port`/`token` into a local value that is
  discarded at once and never logged. A wrong-typed value throws, which is treated as unknown. The call is a read
  only, so the writers test passes. It is not at the top level and does not `await` there (`sw-static` and
  `sw-action` are green).

Tests written first. The red output came before the change:
```
× BadgeModel … > F5: write-failed clears once storage itself reads disarmed (the OFF was saved later, …)
  AssertionError: expected { kind: 'write-failed' } to deeply equal { kind: 'state', armed: false, …(1) }
× BadgeController … > F5: after a write-failed press, a refresh whose stored read says disarmed drops the not-saved title; OFF stays
  Tests  2 failed | 32 passed (34)
```
Mutations, each restored (`restored-badge`):
- The clearing line deleted: the same 2 tests are red.
- The clearing line widened to any failure (`this.failure && storedArmed === false`): `F5: a stored disarm does
  not clear arm-failed` is red, 1 failed | 33 passed.

## Checks (before → after)

| Command | Before (verifier) | After |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `npm test` | 113 files, 2645 tests | **113 files, 2660 tests passed** (+15: badge +4, log-scan +5, safety-writers +6; none removed) |
| `npm run build` | exit 0 | exit 0 (`built extension → dist/`); `git status` lists only the four S2b tracked edits |

Files touched in this round: `extension/test/log-scan.ts`, `extension/test/log-allowlist.ts`,
`extension/test/log-scan.test.ts`, `extension/test/safety-writers.test.ts`, `extension/src/badge.ts`,
`extension/test/badge.test.ts`, `extension/src/sw.ts`, plus this report. Nothing was committed.

## Proposed decisions

- 2026-10-24 · The badge reads the stored `armed` switch to end a "not saved" title.
  Decided: `BadgeController` takes an optional `storedArmed()`. `sw.ts` fills it with
  `storage.local.get(null)` → `parseStoredSafety(…).armed`, and a `write-failed` note ends when that read says
  disarmed. Why: the gate's `read()` masks the stored value with the memory disarm (#176). Instead of: clearing the
  note from the `storage.onChanged` batch, which needs a key name in `sw.ts`/`badge.ts` that the writers test
  forbids, or a new helper in S2a's `safety-state.ts`, which is outside the lane. Revisit if: the token's presence
  in that read is unwanted. A `safety-state.ts` helper that reads only the safety keys would then replace it.
- 2026-10-24 · The log scan treats a level-name call on a non-`console` object as a logger.
  Decided: `warn`/`info`/`debug`/`trace`/`error` calls on anything but `console` are sites. Why: they catch an
  injected `deps.warn`, and there is no such call today. Instead of: stating a convention alone. Revisit if: a
  legitimate non-logger method with one of those names appears. Allowlist it with a note rather than narrowing the
  rule.

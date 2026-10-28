# S7-live fix round 1 — verifier report

Model Opus 5.5, effort medium. Read and ran only; no edit to the repo besides this report, no commit, no Chrome, no live
run, `wtv` not read. Sources read: `docs/agent-rules.md`, `recipes/CLAUDE.md`, decisions.md #366 (line 199), the dated
§4.27 note (`docs/e2e-test-plan.md:1913`), `S7-live-liveA19.md` §5–§6, the phase doc § STOP rules and forbidden fixes
(line 435), `mcp/src/link.ts`, `mcp/src/tools/registry.ts` (new_tab, close_tab, upload, onTab), the fixer's diff, and
the `.ps1` STOP path (`s12-r19-a.ps1`, `s12-r19-lib.ps1`, `s11b-r17.ps1` Invoke-R17Node/Show-S16, `-b/-c/-de.ps1`).

## 1. Verdict

**PASS-with-notes.** The four scoped items are implemented as #366 rules. Nothing outside that scope moved. There are
no CRITICAL or MAJOR findings. Four MINOR findings are test-coverage gaps, one of them a vacuous test. Three NITs.

## 2. Outputs (commands run from this tree)

- `npm test`: `Test Files 232 passed (232)`, `Tests 5570 passed (5570)`, exit 0. This matches the fixer's 5558 → 5570
  (+12). No test was removed. The one `twinIsFunction` test was rewritten as a `twinAnswered` test.
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
- The two target files: `Test Files 2 passed (2)`, `Tests 99 passed (99)`.
- **The new tests fail against HEAD.** I put `git show HEAD:recipes/s12-r19-{a,b,de}.ts` in place, kept the new tests,
  and ran the two files: `Tests 12 failed | 87 passed (99)`, exit 1. The 12 failures are exactly the 12 new or changed
  tests: control-2 ×3, callUntilLinked ×4, handle/catch/main ×3, de ×2. I then restored the fixer's files byte for
  byte.
- **Mutants:** 15 applied in place by `scratchpad/mutants.mjs`, each restored from its saved bytes. 11 were killed and
  4 survived (table below).
- **Tree check:** after every mutant and after the HEAD run, `git diff -- recipes | sha256sum` gave
  `ad9d1286…d632`, identical to the hash taken before. `git status --short` is unchanged.

| Mutant | Result |
|---|---|
| M1 control2Stops also requires `kind === "function"` | KILLED (2 failed) |
| M2 args1 stops printing the control-2 line | KILLED (1) |
| M3a `twinAnswered` body requires kind function | KILLED (1) |
| M3b twin call site passes `!c2.e && kind === "function"` | **SURVIVED** |
| M4a callUntilLinked never re-sends | KILLED (2) |
| M4b mcpOpen's predicate is `false && …includes(CONNECTING_REASON)` (retry disabled in the wiring) | **SURVIVED** |
| M5a LINK_WAIT_MS 5 000 | KILLED (1) |
| M5b bound ×1000 (effectively unbounded) | KILLED (1) |
| M5c bound `> LINK_WAIT_MS + LINK_POLL_MS` | KILLED (1) |
| M6 handleOf returns `""` | KILLED (1) |
| M7 catchDecision: HelperDefect on a stateless row becomes the crash leg | KILLED (1) |
| M8 CONNECTING_REASON retyped as a local `"…..."` | KILLED (1) |
| M9 `-b.ts:291` back to its inline `/T\d+/…?? ""` | **SURVIVED** (see F2) |
| M10 twin sends `(a) => a` again | KILLED (1) |
| M11 `run()` catch returns 1 on a HelperDefect instead of rethrowing | **SURVIVED** |

## 4. Deviations

None from the brief. I ran the mutants in place (the brief allows this) and checked restoration by diff hash.

## 5. Proposed decisions

None. #366 is already listed as open for the user. It is a correction after an observation, against the phase doc's
"editing a row's expected text after its run" forbidden fix. The fixer implemented the ruling and did not decide it.

## 6. Findings

### F1 · MINOR · the connecting retry's wiring in `mcpOpen` is untested (M4b survives)
`recipes/s12-r19-a.ts:146` passes `(x) => x.text.includes(CONNECTING_REASON)` to `callUntilLinked`. Disabling it
(`false && …`) keeps all 99 tests green. The static test only pins the import and the absence of a retyped phrase. It
does not pin the predicate's use, so item 3's live fix could be lost unseen.
**Suggested fix:** a static pin `expect(a).toContain("x.text.includes(CONNECTING_REASON)")`, and that `mcpOpen`'s
`call` wraps `callTool` in `callUntilLinked(`. Better still, extract the per-call body into a pure function that takes
the `callTool` stand-in.

### F2 · MINOR · the "no driver parses a handle with its own regex" test is vacuous (M9 survives)
`recipes/test/s12-r19-a.test.ts:525` checks `.not.toContain("T\d+")`. In a JS string literal `"\d"` is just `d`, so
the needle is `Td+`. `node -e 'console.log(JSON.stringify("T\d+"))'` prints `"Td+"`. Re-introducing the old inline
`/T\d+/.exec(...)?.[0] ?? ""` in `-b.ts` passes the test. Today the claim does hold: a grep of `-b/-c/-de.ts` finds no
inline handle regex, and all 8 R19 `handleOf` callers use the shared helper.
**Suggested fix:** use `"T\\d+"` (or `String.raw\`T\d+\``) as the needle.

### F3 · MINOR · `run()`'s use of `catchDecision` is not pinned (M11 survives)
`catchDecision` is tested and `main()` is tested with a command that throws directly. But a command that throws inside
`run()` is never exercised, because `run()` needs a live `connect()`. So `run()` could swallow a HelperDefect as exit 1
unseen. The current code is correct: `s12-r19-a.ts:174` `if (d.kind === "throw") throw x;`, and a rethrow from `catch`
still runs `finally`, which closes the tabs, the MCP client and the SDK client (JS semantics, lines 178–181).
**Suggested fix:** a static pin that `run()`'s catch is exactly `const d = catchDecision(...)` followed by
`if (d.kind === "throw") throw x;`.

### F4 · MINOR · the twin's call site is not pinned (M3b survives)
`recipes/s12-r19-de.ts:73` `twinAnswered(!c2.e)`. Adding a kind condition at the call site passes the tests, because
they pin only `twinAnswered`'s body, the expression and `control2Kind(c2.v)`.
**Suggested fix:** `expect(TS).toContain("twinAnswered(!c2.e)")`.

### N1 · NIT · the fixer's count of `-a.ts` `handleOf` callers is off by one
The fixer reports 5. `grep -n "handleOf(" recipes/s12-r19-a.ts` shows 6 call sites: lines 198, 329, 343, 359, 382
and 428. All 6 expect a handle (`browser_new_tab`), so the conclusion stands.

### N2 · NIT · the connecting test is a substring match on the whole answer text
`text.includes(CONNECTING_REASON)` would also re-send a `browser_evaluate` or `browser_console_messages` whose page
text contained the phrase, and that would re-run the call. The fixture pages never print it, so this is harmless here.
A stricter match would test the error form only (`isError && …`).

### N3 · NIT · the STOP word for a HelperDefect is `throw-after-state` even on a row that changed no state
This is the existing default of `Stop-R19Actor` (`s12-r19-a.ps1:32`), not new behaviour. The record still carries
`STOP: HelperDefect` just above it. On a row with a step list (ARGS-3, `s12-r19-a.ts:428` runs before the JS-off
step), a node that exits before its ready signal leaves the driver waiting up to `Wait-S11Ready`'s 120 s bound
(`s11-win.ps1:68`). The driver then throws, and that also ends as a clean `throw-after-state` stop. It is delayed but
still bounded.

### Checks (a)–(e), as asked

**(a) Scope.** The diff touches only:
- control-2's judge and its line (`s12-r19-a.ts:213-214`);
- the twin's expression, judge and line (`-de.ts:35-36, 72-74`);
- `callUntilLinked`/`mcpOpen` (`-a.ts:123-150`);
- `handleOf`/`HelperDefect`/`catchDecision` (`-a.ts:81-92, 173-176, 185`);
- one `-b.ts` call site (`:291`) plus its import.

Control-1's judge is unchanged (`c1.e || c1.v !== 2`), and so is the raw `args` leg's `(a) => a, args: 1`
(`-de.ts:69`). The SDK control `t.evaluate("(a) => a")` is also unchanged. No other pass rule, line form, expected
text or STOP rule moved. No `.ps1` changed. The sheet's R19-ARGS-1 row (`e2e-test-plan.md:1785`) still names
`kind: "function"`, and the dated note at 1913 supersedes it, as #366 says.

**(b) Logs.** `<k>` is `control2Kind`'s output: a value matching `^[a-z]+$`, else `other` or `none`. The kind comes from
the extension's fixed set (`extension/src/evaluate/result.ts`, `serialize.ts`: `undefined`, `json`, `function`,
`other`, `node`, `error`, `unserializable`), never from page text. A connecting answer adds one
`{"tool":…,"text":"NOT_CONNECTED…connecting to the bridge daemon…"}` record to `actors-<slice>.jsonl`. That record has
no URL, path, token or value. `scanActors` (`s12-r19.ts:69`) only counts token, profile, other-URL and sentinel hits,
and `s12-r19-lib.ps1:239` reads the file for that scan only. So the extra record is harmless.

**(c) No duplicated side effect.** `BridgeLink.through` (`mcp/src/link.ts:118-122`) throws `NOT_CONNECTED` with
`CONNECTING_REASON` before `fn` runs, and only while `client === null` and `storedReason === null`. That is the case
only before the first attempt settles: success sets the reason to `null` and holds a client, and failure stores a
message, which ends the retry. The tools the drivers call do nothing before `bridge.call`:
- `browser_new_tab` with no cursor skips `listTabs` and calls `cursor.set` only after `newTab` succeeds;
- `browser_close_tab` calls the bridge first;
- `browser_upload_file`'s `prepareUpload` only reads and hashes (`sdk/src/upload.ts:109`);
- the drivers pass an explicit `tab`, so `onTab` does not resolve the cursor.

Re-sending is therefore safe.

**(d) The `.ps1` side.** `main()` (`-a.ts:622`) prints `STOP: HelperDefect` and returns 2. From there:
1. `Show-S16` counts the line (`s11b-r17.ps1:59`).
2. `Invoke-R17Node` throws `ended in a STOP` (`:137`), and `Invoke-R19Node` maps that to 2 (`s12-r19-lib.ps1:57-62`).
3. `Invoke-R19Row` runs `$Restore` in its `finally` when `R19Changed`, then calls `Stop-R19Actor`. Finding no `STOPWHY`,
   that takes `throw-after-state` (in `STOP_REASONS`, `s12-r19.ts:20`) and calls `Stop-R19`, which throws.
4. The block runner's `Stop-R19Wave` (`s12-r19-lib.ps1:69-90`) prints `STOP throw-after-state`, runs the restore when
   `S16Changed`, and prints a matching `RETURN n after-stop=throw-after-state …`.

`checkStopReturn` matches only `^STOP <reason>$`, so the colon-form `STOP: HelperDefect` and `STOP: … (at …)` guard
lines create no unmatched STOP. This is the same path any other actor throw already took. The direct MCP callers
outside `Invoke-R19Row` handle `rc -eq 2` with `Stop-R19Actor`: `-c.ps1:122,132` and the `-b.ps1` sites. The two
`[void]` `Invoke-R19Node` calls (`-c.ps1:59` dialogs, `-de.ps1:9` proof) reach neither `handleOf` nor the MCP.

**(e) `finally`.** This holds, as F3 notes: the rethrow from `catch` still runs `finally`, which closes the tabs, then
`mcp?.close()`, then `c.close()`. MCP-opened tabs (`browser_new_tab`) are not in `tabs`, as before this round.

## 7. Handoff

Nothing is left running: the npm test, vitest and monitor background jobs all ended. The tree is back to the fixer's
state (diff hash `ad9d1286…d632`). Scratch files are in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\f4614b84-14d5-496f-a98a-0bd27c416061\scratchpad\`:
`mutants.mjs`, `npmtest.txt`, `head.txt` and `fixer\`. F1–F4 are test pins only. The step agent may take them in a
later round or accept them as notes; none blocks liveA19 attempt 2.

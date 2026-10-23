# S6b builder 1 — probe server + pre-registered rows (pre-run)

2026-10-23 · Claude Opus 5.5 · commit `201f5c8` · no `claude -p` was run; no model was called.

## Files built (committed in 201f5c8)
- `mcp/test/probe/image-probe-server.mjs` — stdio MCP server `probe`, tools `probe_v1`…`probe_v6`, each a
  64x64 solid PNG (zlib + own CRC32): V1 red ok [image]; V2 green ok [text, image] (`LOCATOR_NOT_FOUND:
  probe failure (this is an error report)`); V3 blue isError [text, image]; V4 yellow `#ffd700` isError
  [image, text]; V5 purple isError [image]; V6 orange isError [text, resource{blob png}]. No socket; exits
  on stdin end/close (checked: initialize from the scratch cwd answered, exit 0).
- `mcp/test/probe/count-images.mjs` — per-call counter for stream-json / transcript jsonl (not asked for by
  name; needed for exact, per-call counts).
- `mcp/test/probe-server.test.ts` — vitest self-check (7 tests): spawns the server over stdio with the SDK
  Client, checks tool list (no colour words), isError, content order, texts, PNG decoded via IDAT inflate to
  exactly one colour. A deliberately wrong colour (#fe0000) made it fail 1/7 (then restored).
- `docs/plans/…-steps/S6b-probe-rows.md` — purpose, environment, MCP config JSON, commands, counting,
  PASS rules, outcomes A–D, trial rule, hygiene, counter dry run.

Vitest collects only `**/test/**/*.test.ts` (vitest.config.ts) and tsconfig has no allowJs, so the `.mjs`
files are neither collected nor typechecked; no test imports them (the test spawns the server).

## Commands + output tails
```
$ npx vitest run mcp/test/probe-server.test.ts
 ✓ mcp/test/probe-server.test.ts (7 tests) 499ms
 Test Files  1 passed (1)   Tests  7 passed (7)   Duration 4.64s (tests 499ms)
$ npx vitest run mcp/
 Test Files  8 passed (8)   Tests  161 passed (161)   Duration 2.75s
$ npm run typecheck
 tsc -p shared … && tsc -p extension/tsconfig.json   → exit 0, no output
```
Full suite not run (per brief). Expected repo total moves by +7 tests / +1 file.

## Counter dry run (in the scratch dir `…\scratchpad\s6b-probe\dryrun\`)
- pos.jsonl (tool_result is_error, [text, image] + a decoy image for another tool_use_id):
  `"tool_uses":1, … "content_types":["text","image"],"image_parts":1, "images_in_tool_results":1,
  "images_in_toolUseResult":0, "raw_image_tokens":2`; `grep -c` = 2.
- neg.jsonl (tool_result content a bare string; image only in `toolUseResult`):
  `"content_types":["text-string"],"image_parts":0, "images_in_tool_results":0,
  "images_in_toolUseResult":1, "raw_image_tokens":1`; `grep -c` = 1.
Full lines pasted in the sheet §7.

## Deviations
- Added V6 (isError + embedded `resource` with an image blob): the one other MCP way to carry image bytes;
  cheap. Outcome table extended accordingly (B preference V4 > V6 > V2; V5-only ⇒ D, since V5 drops text).
- Added `count-images.mjs` and `--session-id` (pre-assigned uuid) to the commands for deterministic,
  per-call counting; transcript located with `find ~/.claude/projects -maxdepth 2 -name "$SID.jsonl"`.
- Prompt uses ASCII ` - ` for the brief's `—` (avoids any argv encoding doubt); prompt placed right after
  `-p` because `--mcp-config`/`--allowedTools` are variadic and would swallow a trailing prompt.
- The MCP config file must be written with the Write tool (Git Bash heredocs lose backslashes here).
- `raw_image_tokens`/`grep -c` over-count (the transcript's `toolUseResult` field also holds the raw
  output); IMAGE ARRIVED is decided only by images inside the call's `tool_result`. Note: REP-1's 0 was a
  raw count, so 0 there still means 0 in the tool_result.

## Proposed decisions
- 2026-10-23 · The probe decides IMAGE ARRIVED from the call's tool_result, not the raw file
  Decided: count `"type":"image"` only inside the tool_result answering the probe's tool_use; report the
  transcript's `toolUseResult` count separately. Why: `toolUseResult` records what the server sent, not
  what the model got; a raw grep would report an image the model never received. Instead of: the brief's
  plain `grep -c`. Revisit if: Claude Code's transcript format changes so tool_result content is not where
  the model input lives.
- 2026-10-23 · V6 (embedded resource) joins the probe
  Decided: add an isError variant carrying the PNG as an embedded resource blob. Why: cheap, and the only
  other MCP image carrier; if Claude Code filters only `image` blocks of errors it could pass. Instead of:
  V1–V5 only. Revisit if: Claude Code documents its error-result handling.
- 2026-10-23 · The probe actor keeps user settings (no `--bare`)
  Decided: isolate only the MCP set (`--strict-mcp-config`) and cwd; user hooks/CLAUDE.md still load. Why:
  matches the REP-1 actor apart from the MCP set. Instead of: `--bare`. Revisit if: V1 fails for a reason
  traceable to user settings.

## Unfinished
- ~~The probe itself~~ — ran later on the step agent's instruction (below). `S6b.ledger.md` is untracked and
  was not touched; this report is uncommitted.

## Probe run (on the step agent's instruction)
Record: `S6b-probe-record.md` (uncommitted). Images in the tool_result (transcript / out): V1 1/1, V2 1/1,
V3–V6 0/0; V1 and V2 seen (red, green); outcome **(A)**. The step agent re-counted 1,1,0,0,0,0.

## Fix (uncommitted; the verifier goes first)

### Diff summary (`git diff --stat`: 3 files, +131 / −13)
- `mcp/src/tools/registry.ts` (+44/−8):
  - `failureReport`: with a screenshot image block, returns `{ content: [{text: report + "\n" + failedLine(code)}, image] }`
    with **no `isError` key**; without one (no `screenshotPath`, or the read failed), today's
    `{ isError: true, content: [{text: report}] }` unchanged. Non-attach errors are still thrown (untouched).
  - `failedLine(code)` (exported): `The call failed (<CODE>). This result is not flagged as an error only so
    that the screenshot reaches you: Claude Code drops images from error results.` — one line, the code, no
    URL or title. The report's line 1 stays `<CODE>: …`; `Full message:` unchanged, before it.
  - `FAILURE_REPORTS` (a module `WeakSet`) marks every report `failureReport` returns, and `withNotice`'s copy
    of one; `isFailureReport(result)` (exported) reads it. Nothing extra on the wire.
  - `withNotice`: a marked report gets the notice as its **own last text item** (code line stays line 1);
    every other result keeps today's behaviour byte-identical.
- `mcp/test/tools.test.ts`: +4 tests, amendments below. `mcp/test/s5-cross.test.ts`: amendments below.

### Failing-first evidence (new tests run against the unchanged `registry.ts`)
```
 × … S6b: with a screenshot the report is a non-error result — report text plus the failure line, then the image
 × … S6b: a multi-line message keeps Full message, then the failure line last
 × … S6b: a re-claimed cursor's notice comes after a failure report (code line first); a normal result's placement is unchanged
 AssertionError: expected true to be false // Object.is equality      (x3: `"isError" in res`)
 Tests  3 failed | 1 passed | 94 skipped (98)
```
The 1 passing is "S6b: without a screenshot the report is still isError, text only, with no failure line" —
a regression guard, expected to pass before and after. After the src change and before the amendments,
exactly the four with-image `isError: true` assertions failed (tools.test.ts x3, s5-cross (c)):
`expected undefined to be true`; 161 passed.

### Amended lines
Reason on each: "decision S6b: Claude Code 2.1.309 drops images from isError results (S6b-probe-record.md outcome A)".
- tools.test.ts 1246 (title) "is returned as isError with report() text" → "is returned without isError, with report() text".
- tools.test.ts 1249 `expect(res.isError).toBe(true)` → `expect("isError" in res).toBe(false)`.
- tools.test.ts 1264 (title) "the lost-cursor notice still prefixes the report" → "… comes after the report".
- tools.test.ts 1267 `expect(res.isError).toBe(true)` → `expect("isError" in res).toBe(false)` (REF_STALE, with image).
- tools.test.ts 1276 `split("\n")[0]).toBe(lostNotice("T1"))` → line 1 is `LOCATOR_NOT_FOUND: no element matches
  button "Nope"`, and `content[2]` is the notice text item. Reason, additionally: the step agent's spec item 2
  (the code line stays first) — this assertion pinned the old placement and could not stand.
- tools.test.ts 1317 `expect(res.isError).toBe(true)` → `expect("isError" in res).toBe(false)` (PAGE_ERROR, with image).
- s5-cross.test.ts 225 `expect(res.isError).toBe(true)` → `expect("isError" in res).toBe(false)`, plus (added, not
  loosened) `expect(isFailureReport(res)).toBe(true)` and the report's last line `toBe(failedLine("LOCATOR_NOT_FOUND"))`.
- s5-cross.test.ts 184 (the `run` helper): `if (res.isError)` → `if (res.isError || isFailureReport(res))`, so a
  report without isError still throws there.
No other assertion changed. The no-image test (tools.test.ts 1283, `isError` true) is unchanged and passes.

### Readers of `isError` / "non-error = success"
- `mcp/src`: only `registry.ts` — `ToolResult`'s type, `toolError()` (validation errors, still `isError: true`),
  `failureReport`. `onTab` treats a returned result as success only for the cursor notice (consumed either way,
  as before; a thrown error restores it — unchanged). link.ts, cursor.ts, lifecycle.ts, index.ts, config.ts: none.
- `mcp/test/s5-cross.test.ts:184` helper — amended as above.
- Outside the lane, reported only: `recipes/t5-actor.ts:191` prints `OUTPUT (isError):` from `is_error`, so an E2E
  record of a failure report with a screenshot will show plain `OUTPUT:` — the code line and the failure line
  still identify it. `recipes/blackboard/transcript.ts:70` counts `is_error` results as failed `browser_evaluate`
  calls; a non-error report is still rejected there (its text is multi-line, so a chunk is refused for the
  newline, and a status call fails `JSON.parse`), with a less specific message. Neither needs a change for correctness.
- The notice on a **no-image** isError report also moved after the report (spec item 2 covers every failure
  report); without a notice that result is byte-identical to before.

### Checks
```
$ npx vitest run mcp/
 Test Files  8 passed (8)    Tests  165 passed (165)      (161 before; +4 new)
$ npm run typecheck   → exit 0
$ npm run build       → built mcp → dist/index.js, extension → dist/; exit 0
$ sha256sum daemon/dist/index.js mcp/dist/index.js   (before → after)
 daemon: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f → 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f (unchanged)
 mcp:    575400bd0bab766aeef04c36050425ec5b5a382cad83007e0c66952abaa9579f → a0489ac013ca0406008eb040bdb4cda3f7fad1ef01ed63646bf797653a17e109
```
The build also rewrote `extension/dist/` (no extension source changed). Full suite not run.

### Proposed decision (contract-level, for the user)

### 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result (proposed, for user review)
**Decided:** when an attach-eligible failure's report carries the screenshot, the MCP returns it with no
`isError` flag: content `[text, image]`, the text's first line `<CODE>: …` as before, followed by the line
`The call failed (<CODE>). This result is not flagged as an error only so that the screenshot reaches you
(some MCP clients, Claude Code 2.1.309 among them, drop images from error results).` A report without a
screenshot stays `isError: true`, one text item. A re-claimed cursor's notice becomes the last line of a
report's first text item (never an item of its own), so the code line stays first. *(Wording and notice
placement as amended by fixer round 1, verifier F1/F3.)*
**Why:** the S6b probe (`S6b-probe-record.md`; Claude Code 2.1.309, `--model sonnet`, one fresh session per
variant). Images inside the tool_result, transcript / out: V1 success [image] 1/1 (seen: red); V2 success
[text, image] 1/1 (seen: green, ERROR read as yes); V3 isError [text, image] — the bridge's shape — 0/0; V4
isError [image, text] 0/0; V5 isError [image] 0/0 (arrived as "Unknown error"); V6 isError [text, embedded
resource] 0/0. Claude Code flattens an isError result to its text; REP-1's missing image is this.
**Instead of:** keeping `isError` and losing the image (REP-1's state); V4 image-first and V6 embedded resource
(measured: 0 images); V5 image-only (measured 0, and it loses the text); a second tool call to fetch the image
(an extra round trip the model must think to make); a `resource_link` to the PNG (not measured; a link is not
an image the model sees).
**Cost:** other MCP clients lose the `isError` flag for these results and must read the code line or the last
line; the E2E driver's `(isError)` marker disappears for them (`recipes/t5-actor.ts`).
**Revisit if:** Claude Code passes images of isError results — re-run the probe (`mcp/test/probe/`,
`S6b-probe-rows.md`) after a Claude Code upgrade that touches MCP results, and restore `isError` if V3 arrives.
**By:** S6b builder 1 (Claude Opus 5.5), from the S6b step agent's spec; for the user's ruling.

## Fixer round 1 (S6b-verifier.md F1, F3; uncommitted)

**F1 — fixed.** `withNotice` (`registry.ts`): for a marked failure report, the notice is now appended inside the
report's first text item as its last line (`first.text + "\n" + notice`) — after `failedLine` on the image path,
after the report on the no-image path — never a separate item. Content stays `[text]` (isError) or
`[text, image]`. Other results unchanged (notice still prefixes the first text item; own item before an image).
The duplicate `const [first, ...rest]` was folded into one. Tests:
- tools.test.ts S6b notice test (renamed "… is the last line of a failure report's text (code line first, no
  extra item) …"): image path `toEqual` `[{text: report\nfailedLine\nnotice}, image]`, `toHaveLength(2)`, line 1
  = the code line, last line = `lostNotice("T1")`; no-image path `toEqual {isError: true, content: [{text:
  report\nnotice}]}`, `toHaveLength(1)`, same line checks; the normal-result check unchanged.
- tools.test.ts ~1276 (the S5.3 explicit-tab/notice test): `content[2]` notice item → the text's last line is
  the notice, and content types are `["text", "image"]`.

**F3 — fixed.** `failedLine(code)` now reads `The call failed (<CODE>). This result is not flagged as an error
only so that the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from
error results).` — one line, the code, no URL/title. The test copy in tools.test.ts updated; s5-cross imports
`failedLine` from src, so it follows. The proposed decision above quotes the new wording.

Checks after round 1:
```
$ npx vitest run mcp/   → Test Files 8 passed (8), Tests 165 passed (165)
$ npm run typecheck     → exit 0
$ npm run build         → built daemon, mcp, extension; exit 0
$ sha256sum             → daemon/dist/index.js 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f (unchanged)
                          mcp/dist/index.js    4b07b4643ea78c82146952bba66a23d9788049b6a481d79a740a01e714c63153
$ git diff --stat       → registry.ts +45/−?, s5-cross.test.ts 9, tools.test.ts 95; 3 files, +135 / −14
```

# S6b — the MCP failure report's image reaches the model (report)

Step agent: Claude Opus 5.5, 2026-10-23. Ledger: `S6b.ledger.md`. Brief: decisions.md · 2026-10-23 · S6's
findings ruled … (#99) item (2).

## 1. Verdict

**DONE.** The cause of REP-1 is measured: Claude Code 2.1.309 drops every image (and embedded resource) from an
`isError: true` tool result and passes only its text, as one string; images of non-error results arrive. The MCP
now returns a failure report that carries a screenshot as a non-error result whose first line is the code and
whose last report line says the call failed. This change in how a tool error is returned is contract-level and
is listed for the user (§5, first block). REP-1's live re-run is S6 Part 3's, after its row is re-registered
(§7).

## 2. Outputs

- `201f5c8` `test(mcp): S6b — image-in-error-result probe rows (pre-run)` — `mcp/test/probe/image-probe-server.mjs`
  (stand-in stdio MCP server, six tools, solid-colour PNGs it makes itself; no socket), `mcp/test/probe/count-images.mjs`
  (per-call image counter), `mcp/test/probe-server.test.ts` (7 tests pinning the probe's shapes and colours),
  `S6b-probe-rows.md` (rows, PASS rules, outcome table, counter dry run). Committed 19:38:36 local, before the
  first run file (19:39:39) and the transcripts (19:40:08–19:42:07) — verifier check 1.
- The fix commit (this report's commit): `mcp/src/tools/registry.ts`, `mcp/test/tools.test.ts`,
  `mcp/test/s5-cross.test.ts`, and the steps files `S6b.md`, `S6b.ledger.md`, `S6b-builder1.md`,
  `S6b-probe-record.md`, `S6b-verifier.md`.
- Evidence (sha256 at report time): `S6b-probe-rows.md` 948f11c9…678a (unchanged since 201f5c8);
  `S6b-probe-record.md` 4c7213be…a956. Transcripts and `vN.out.jsonl` stay outside the repo in
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\98d37e15-74d6-4e30-9f89-cd26d9d75a28\scratchpad\s6b-probe\`
  (session ids in `sessions.txt`), not committed.
- Counts (verifier, clean worktree): `npm test` at 201f5c8 **1679 passed, 84 files**; with the lane diff **1683
  passed, 84 files** (+4 new tests in `tools.test.ts`); `npx vitest run mcp/` 165 passed, 8 files;
  `npm run typecheck` exit 0; `npm run build` exit 0. Tool count 23 before and after
  (`grep -c "server.tool(" mcp/src/tools/registry.ts`).
- Failing-first (verifier): `registry.ts` reverted to 201f5c8 with the new tests kept → 9 failed (6 in
  `tools.test.ts`, s5-cross (a)(b)(c)), 156 passed; restored → 165/165. The one new test that passes on both is
  the no-image `isError` guard, by design.
- Builds: `daemon/dist/index.js` sha256 unchanged `597d6c28…34da3f` (no daemon handover); `extension/dist`
  byte-identical (no reload); the main tree's `mcp/dist/index.js` is the new bundle, sha256 `4b07b464…3153`.

## 3. Verifier verdict

**PASS-with-notes** — `S6b-verifier.md` (first pass: 2 MINOR, 4 NIT; re-check after fixer round 1: F1 and F3
resolved, counts 1683, failing-first holds). One fix round used. The verifier re-read all six transcripts with
its own dumper and derived outcome (A) independently; the step agent also re-counted them with the counter
(1, 1, 0, 0, 0, 0).

## 4. Deviations (and the step agent's rulings)

1. Probe V6 (the image as an embedded `resource` in an `isError` result) was added by the builder before the
   commit — accepted (cheap; the one other MCP form for image bytes).
2. The counter counts images only inside the call's own `tool_result`, not by `grep -c` (which also counts the
   transcript's `toolUseResult` copy of what the server sent) — accepted; dry-run with positive and negative
   controls before the commit.
3. The record is `S6b-probe-record.md` (the brief's name), not the sheet's `S6b-probe-run.md` — mechanical.
4. The cursor notice on a failure report moved from the first line to the last line of the report's text item,
   on the no-image `isError` path too, so the code line is first on every failure report. A no-image report
   with no notice is byte-identical to before. (Builder's first version made the notice a second text item;
   verifier F1: a second text item in an error result is unmeasured → fixer round 1 kept it in one item.)
5. S5.3's existing tests were amended only where they asserted `isError: true` on the with-image path
   (`tools.test.ts` 1249, 1267, 1317 and two titles; `s5-cross.test.ts` 225) and the notice placement
   (`tools.test.ts` ~1276, now tighter); `s5-cross.test.ts`'s helper (184) now also throws on a failure report.
   Reason on each: this stage's decision, S6b-probe-record.md outcome A. Verifier F5: nothing loosened.

## 5. Proposed decisions

### 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result (proposed, for user review)
**Decided:** when an attach-eligible failure's report carries the screenshot, the MCP returns it with no
`isError` flag: content `[text, image]`, the text's first line `<CODE>: …` as before, `Full message:` as before,
then the line `The call failed (<CODE>). This result is not flagged as an error only so that the screenshot
reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from error results).` A report without
a screenshot stays `isError: true`, one text item. A re-claimed cursor's notice becomes the last line of a
report's first text item, so the code line stays first. **Why:** the S6b probe (`S6b-probe-record.md`, Claude
Code 2.1.309, `--model sonnet`, one fresh session per variant; images inside the call's tool_result, transcript /
out): V1 success [image] 1/1, seen red; V2 success [text, image] 1/1, seen green, error read as yes; V3 isError
[text, image] (the bridge's shape) 0/0; V4 isError [image, text] 0/0; V5 isError [image] 0/0 (arrived as
"Unknown error"); V6 isError [text, embedded resource] 0/0. Claude Code flattens an isError result to its text.
**Instead of:** keeping `isError` and losing the image (REP-1's state); V4 image-first and V6 embedded resource
(measured 0 images); V5 (measured 0, and it loses the text); a second tool call to fetch the image; a
`resource_link` (unmeasured; a link is not an image the model sees). **Cost:** other MCP clients lose the
`isError` flag on these results and must read the code line or the last line; `recipes/t5-actor.ts:191` prints
`OUTPUT:` instead of `OUTPUT (isError):` for them; `recipes/blackboard/transcript.ts:70` still rejects them but
with a less specific message. **Revisit if:** a Claude Code upgrade passes images of isError results — re-run the
probe (`mcp/test/probe/`, `S6b-probe-rows.md`) and restore `isError` if V3 arrives. **By:** Claude (S6b step
agent; contract-level, for the user — conservative within the measured options: the flag is dropped only when an
image is present, the text is unchanged except one appended line, undoable in one function).

### 2026-10-23 · REP-1 is re-registered before S6 Part 3 (proposed)
**Decided:** before REP-1 re-runs, its expected text (`docs/e2e-test-plan.md` §4.18) gets a dated note:
"the result is an error" is read as — the text's line 1 is `LOCATOR_NOT_FOUND: …` and its last report line is
`The call failed (LOCATOR_NOT_FOUND). …` (then the notice line if the cursor was re-claimed); the tool result
carries no `is_error`; the actor's transcript holds ≥ 1 image part in that call's tool_result (count with
`mcp/test/probe/count-images.mjs`), and in the transcript Claude Code adds a third text part `[Image: source: …]`
after the image. The `Screenshot:` line, snapshot window, PNG-on-disk, flash and `TAB_HELD` clauses are
unchanged. **Why:** verifier F2 — the old "an error with two parts" cannot hold for the new shape; a check is
re-registered before its run, never re-read after. **Instead of:** re-reading the old text to pass.
**By:** Claude, for the session agent (row text is outside S6b's lane).

### 2026-10-23 · S6b probe method notes (proposed, mechanical)
**Decided:** (a) whether an image reached the model is counted inside that call's own `tool_result` only, never
by `grep -c` over the transcript; (b) V6 joined the probe; (c) probe sessions keep user settings (no `--bare`),
isolating only the MCP set and the cwd, to match the REP-1 actor. **Why:** builder 1's report; the dry run
showed `grep -c` over-counts. **By:** Claude (S6b).

## 6. Findings

| Row | Sent | Image parts, transcript / out | is_error | Model: COLOUR / ERROR | IMAGE ARRIVED | MODEL SAW IT |
|---|---|---|---|---|---|---|
| V1 | ok, [image], red | 1 / 1 | false | red / no | yes | yes |
| V2 | ok, [text, image], green | 1 / 1 | false | green / yes | yes | yes |
| V3 | isError, [text, image], blue | 0 / 0 | true | NO IMAGE / yes | no | no |
| V4 | isError, [image, text], yellow | 0 / 0 | true | NO IMAGE / yes | no | no |
| V5 | isError, [image], purple | 0 / 0 | true | NO IMAGE / yes | no | no |
| V6 | isError, [text, resource], orange | 0 / 0 | true | NO IMAGE / yes | no | no |

Outcome **(A)** by the pre-registered §5 table: positive control V1 passed; no isError variant delivered an
image; V2 delivered it with ERROR read as yes. One trial per variant, all exit 0; out.jsonl and transcripts
agree on every row.

1. Claude Code 2.1.309 turns an `isError` tool result into one plain string of its text parts; images and
   embedded resources are dropped, and the transcript's `toolUseResult` holds no image either. An isError result
   with no text arrives as `Unknown error`.
2. On a non-error result Claude Code saves each image under `~/.claude/projects/<proj>/<session>/tool-results/`
   and adds a text part `[Image: source: …]` after it, so every failure screenshot now also gets a copy there
   (the PNG in `~/.chrome-agent-bridge/failures/` is unchanged). Relevant to the "never commit a failure
   screenshot" rule: the copy lives in Claude Code's own session store, outside the repo.
3. The probe tools were deferred: each session called ToolSearch first; no effect on the result.
4. No pre-registered rule was re-tuned; the sheet is unchanged since 201f5c8; no permission or classifier denial;
   nothing touched port 9234, Chrome, the daemon or the bridge MCP; no probe server process was left.

## 7. Handoff (for S6 Part 3's REP-1 re-run)

- **Build:** none needed if the main tree is at this stage's commit — its `mcp/dist/index.js` is already the new
  bundle (sha256 `4b07b464…3153`); `daemon/dist/index.js` (`597d6c28…34da3f`) and `extension/dist` are unchanged,
  so no daemon handover and no extension reload follow from S6b. If any `mcp/src` change lands after this commit,
  run `npm run build` in the main tree first.
- **Actors:** each headless `claude -p` actor spawns its own MCP from `mcp/dist/index.js` at session start, so
  start **fresh** actor sessions; a session started (or resumed from one started) before the 19:47:44 local build
  runs the old bundle and returns the old `isError` shape.
- **Row text:** re-register REP-1 first (§5, second block). Judge "an error" by the code line and the failure
  line, not by `is_error` or `t5-actor.ts`'s `(isError)` marker (absent now); count image parts in the call's own
  tool_result.
- **Not mine, unchanged:** `recipes/t5-actor.ts:191`, `recipes/blackboard/transcript.ts:70` (verifier F4).
- PIDs: none running from this stage. Watchers: none.

## For the as-built register

- S6b: an attach-eligible MCP failure report **with** a screenshot is a non-error result `[text, image]`
  (line 1 `<CODE>: …`, last report line `failedLine(code)`); **without** one it stays `isError: true`, one text
  item; the cursor notice is the report text's last line (`mcp/src/tools/registry.ts`: `failureReport`,
  `withNotice`, `failedLine`, `isFailureReport`). Cause measured by the S6b probe (outcome A). Tests 1679 → 1683
  (84 files). Proposed for the user's ruling (§5).

## New CLAUDE.md gotcha candidate (measured)

- **Claude Code drops images from `isError: true` MCP tool results.** On 2.1.309 an error result reaches the
  model as one string of its text parts; image blocks (first, last or alone) and embedded resources are dropped
  (S6b probe V3–V6: 0 images; V1/V2 non-error: images arrive). That is why a failure report with a screenshot is
  returned without `isError` (`mcp/src/tools/registry.ts` `failureReport`). Re-run `S6b-probe-rows.md` after a
  Claude Code upgrade before changing it.

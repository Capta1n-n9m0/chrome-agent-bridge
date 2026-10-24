# S6b verifier — image-in-error probe and the non-error failure-report fix

2026-10-23 · independent verifier (Claude Opus 5.5) · HEAD `201f5c8` plus the main tree's uncommitted
lane diff (`mcp/src/tools/registry.ts`, `mcp/test/tools.test.ts`, `mcp/test/s5-cross.test.ts`). I edited
nothing in the main tree except this file. No model session was run. Chrome, the daemon and port 9234 were
not touched. The worktree was removed afterwards (`git worktree list` shows only the main tree).

**Verdict: PASS-with-notes.** Two MINOR findings and four NITs. No exit criterion failed.

## Counts

| Where | Test files | Tests | typecheck | build |
|---|---|---|---|---|
| Clean worktree at HEAD `201f5c8` (`npm ci`, `npm test`) | 84 passed | **1679** passed | — | ok |
| The same worktree plus the lane patch (`git apply`) | 84 passed | **1683** passed (+4) | exit 0 | ok |
| `npx vitest run mcp/` after the patch | 8 passed | 165 passed | | |
| Failing-first: `registry.ts` reverted to HEAD, new tests kept | 2 failed / 6 | 9 failed / 156 passed | | |

Exit criterion: 1683 ≥ 1679 + 4 new tests. Met.

## 1. Commit order (check 1)

```
$ git log --format='%h %ci %s' -3
201f5c8 2026-10-23 19:38:36 +0400 test(mcp): S6b — image-in-error-result probe rows (pre-run)
d808ae5 2026-10-23 19:32:08 +0400 docs(step8): S6 Part 2 ruled — decision #99; S6b for REP-1
24b5ce5 2026-10-23 19:28:22 +0400 test(e2e): S6 — Run 12 (S6) completed (verifier: PASS-with-notes)
$ git log --format='%h %ci' -- …/S6b-probe-rows.md      → 201f5c8 2026-10-23 19:38:36 +0400 (only commit)
$ git diff 201f5c8 -- …/S6b-probe-rows.md | wc -l      → 0
  S6b-probe-rows.md mtime 19:38:28 (before the commit)
```
Run artefacts in `$P` (`ls --full-time`): `probe-mcp.json` 19:39:39 (the first run file), then `v1.out.jsonl` 19:40:08,
`v2` 19:40:35, `v3` 19:40:55, `v4` 19:41:21, `v5` 19:41:44, `v6` 19:42:07. The transcripts' mtimes are each within
30 ms of the matching out.jsonl (19:40:08.24 … 19:42:07.76). The `dryrun/` dir is 19:36:31, before the commit, which
matches §7 of the sheet. **The rows predate the run, and the sheet has not been edited since.**

## 2. Probe transcripts, re-read independently (check 2)

`sessions.txt` lists v1…v6 with SIDs that match the record. Each transcript was found with
`find ~/.claude/projects -maxdepth 2 -name "<sid>.jsonl"`. I wrote my own dumper,
`…\scratchpad\verify-shape.cjs`. It prints, for every tool_use and tool_result, the content's shape, using types and
short text only. It also deep-counts every object with `type:"image"` anywhere in the block, in `toolUseResult` and in
the whole file. Excerpt (the transcript; out.jsonl is identical for each row):

```
v1 33 TOOL_RESULT …QWo is_error=undefined deepImagesInBlock=1 [IMAGE{base64/image/png}, text("[Image: source: C:\\Users\\aliev\\.claude\\projects\\…")]
   37 ASSISTANT_TEXT "COLOUR: red\nERROR: no"
v2 33 TOOL_RESULT …KT  is_error=undefined deepImagesInBlock=1 [text("LOCATOR_NOT_FOUND: probe failure (this is an error report)"), IMAGE{base64/image/png}, text("[Image: source: …")]
   37 ASSISTANT_TEXT "COLOUR: green\nERROR: yes (the tool reported \"LOCATOR_NOT_FOUND: probe failure\")"
v3 33 TOOL_RESULT …S7 is_error=true deepImagesInBlock=0 STRING "LOCATOR_NOT_FOUND: probe failure"
   toolUseResult deepImages=0 shape: "Error: LOCATOR_NOT_FOUND: probe failure"
   37 ASSISTANT_TEXT "COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")"
v4 33 … is_error=true deepImagesInBlock=0 STRING "LOCATOR_NOT_FOUND: probe failure"   → "COLOUR: NO IMAGE\nERROR: yes …"
v5 33 … is_error=true deepImagesInBlock=0 STRING "Unknown error"                     → "COLOUR: NO IMAGE\nERROR: yes (the tool returned \"Unknown error\" and no image)"
v6 33 … is_error=true deepImagesInBlock=0 STRING "LOCATOR_NOT_FOUND: probe failure"   → "COLOUR: NO IMAGE. ERROR: yes. …"
file total deep images: v1 2, v2 2, v3 0, v4 0, v5 0, v6 0   (out.jsonl and the transcript agree on every row)
```

Every session called ToolSearch first and got a `tool_reference` result. It is keyed to a different tool_use id and
carries no image.

### Derived table

| Row | Sent | Images in the call's tool_result (transcript / out) | is_error | COLOUR / ERROR | IMAGE ARRIVED | MODEL SAW IT |
|---|---|---|---|---|---|---|
| V1 | ok [image] red | 1 / 1 | absent | red / no | yes | yes |
| V2 | ok [text, image] green | 1 / 1 | absent | green / yes | yes | yes |
| V3 | isError [text, image] blue | 0 / 0 | true | NO IMAGE / yes | no | no |
| V4 | isError [image, text] yellow | 0 / 0 | true | NO IMAGE / yes | no | no |
| V5 | isError [image] purple | 0 / 0 | true | NO IMAGE / yes | no | no |
| V6 | isError [text, resource] orange | 0 / 0 | true | NO IMAGE / yes | no | no |

Rules from §5:
- The positive control V1 passed, so the probe discriminates.
- No isError variant arrived (V3–V6 all 0), and V1 and V2 arrived.
- V2 meets IMAGE ARRIVED, MODEL SAW IT and ERROR: yes.

**Derived outcome: (A)**, the same as the record's. The fix takes V2's shape. My table matches the record row for
row.

### Counter audit (`mcp/test/probe/count-images.mjs`)

- The counter recurses depth-first through every object in the tool_result's content. An `image` nested at any depth
  is counted. It is keyed to the tool_use id of the named tool, so the decoy and ToolSearch results are excluded.
- It would miss image bytes carried under another `type`, such as `document` or a resource. It would also miss a
  data-URI inside a string. Neither case can apply to V3–V6, whose content arrived as bare strings of 13–32
  characters. Had V6's resource arrived as non-text content, `content_types` would have shown it.
- `is_error` is printed as `false` when the field is absent (`o.is_error === true`), which is cosmetic. Success
  results carry no `is_error` key at all.
- The over-counting `raw_image_tokens` and `grep -c` were cross-checks only, as the sheet says.

**The counter is sound for this decision.**

## 3. Failing-first (check 4)

`registry.ts` was reverted to HEAD in the worktree, with the new tests kept:

```
$ npx vitest run mcp/
 × tools.test.ts … an attach-eligible error is returned without isError, …          expect("isError" in res).toBe(false) 1249
 × tools.test.ts … an explicit tab attaches on that tab; the lost-cursor notice comes after the report   1267
 × tools.test.ts … a multi-line message keeps its lines in a Full message block …   1320
 × tools.test.ts … S6b: with a screenshot the report is a non-error result …         1361
 × tools.test.ts … S6b: a multi-line message keeps Full message, then the failure line last   1376
 × tools.test.ts … S6b: a re-claimed cursor's notice comes after a failure report …  1395
 × s5-cross.test.ts (a), (b), (c)    — (a)/(b) at the run helper :185 (isFailureReport is not exported by the old src), (c) at :225
 Tests  9 failed | 156 passed (165)
```

The no-image regression guard ("S6b: without a screenshot … still isError") passes both before and after, as the
builder says. I restored `registry.ts`, and it matched the main tree apart from CRLF line endings
(`diff <(tr -d '\r' …)` printed nothing). The suite then gave 165/165.

## 4. Findings

### F1 — MINOR — the notice on a no-image `isError` report is now a separate text item, and nothing measured that it reaches the model
`mcp/src/tools/registry.ts:62-67` (`withNotice`, the `FAILURE_REPORTS` branch); pinned by
`mcp/test/tools.test.ts:1397-1414`.

**Evidence:**
- The new branch appends the notice as its own text item to every failure report, including the no-image result
  `{isError: true, content: [text(report), text(notice)]}`.
- The probe shows that Claude Code flattens an isError result to a bare string. V3, V4 and V6 kept only the
  report's text, and V5 became `"Unknown error"`.
- No variant sent two text items in an error result. Whether Claude Code joins them or keeps only the first is
  unmeasured.
- Before the change, the notice was prefixed inside the same text item, so it survived any flattening.
- The probe ruled only on the image path. The S6b goal does not require moving the notice on the no-image path.

**Suggested fix:** on the `isError` path, append the notice inside the report's text item (`report + "\n" + notice`)
so the code line stays first and one item still carries everything. Alternatively, add a V7 probe row
(isError, [text, text]) before relying on two items.

### F2 — MINOR — REP-1's registered expectation no longer matches the shape and must be re-registered before S6 Part 3
`docs/e2e-test-plan.md:969` (§4.18 REP-1), which I did not edit.

Each clause against the new shape:

| REP-1 clause | Status | Why |
|---|---|---|
| "The result is an error" | **Not met** | No `is_error` flag. The error is stated only by line 1 `LOCATOR_NOT_FOUND: …` and the new last line `The call failed (LOCATOR_NOT_FOUND). …`. |
| "with two parts" | **Met only at the MCP level** | The MCP sends [text, image]. In the actor's transcript Claude Code appends a third text part, `[Image: source: …\tool-results\…png]` (probe finding 2; seen in my V1/V2 dumps), so a transcript count reads 3. |
| text starting `LOCATOR_NOT_FOUND: ` naming the locator; the `Screenshot:` line; the snapshot window with `button "Sign in"` | Met | Report text unchanged. |
| an image of the fixture page | Expected met | That is the fix. |
| the 1.5 s flash; the PNG exists | Unaffected | |
| `TAB_HELD` reads as the plain one-line error with no image | Met | `TAB_HELD` is not in `ATTACH_CODES` (`sdk/src/error.ts:66-74`), so it is still thrown and becomes an `isError` result. |
| PAGE_ERROR note: "the full multi-line message follows the report under `Full message:`" | Met, with a change | The failure line now comes after the Full message block. |
| The failure line itself | Not registered | Must be added. |

**Suggested fix:** before Part 3, re-register REP-1 with a dated correction:
- "a non-error result (no is_error)";
- line 1 `LOCATOR_NOT_FOUND: …`;
- last text line exactly `failedLine("LOCATOR_NOT_FOUND")`;
- MCP content [text, image], and the transcript tool_result [text, image, text(`[Image: source: …]`)];
- the model sees the image (an image part ≥ 1 in the tool_result);
- `t5-actor` prints `OUTPUT:`, not `OUTPUT (isError):`.

### F3 — NIT — `failedLine` names Claude Code in a message every MCP client gets
`mcp/src/tools/registry.ts:54-56`. The exact text is `The call failed (<CODE>). This result is not flagged as an
error only so that the screenshot reaches you: Claude Code drops images from error results.`

It is one line and has a newline only before it. It contains the code and no URL, title, path or token. It is
accurate for Claude Code 2.1.309, but another client reads a claim about a different product. Acceptable. Consider
"some MCP clients drop images from error results" if the wording is revisited.

### F4 — NIT — out-of-lane readers of `is_error` (`recipes/t5-actor.ts:191`, `recipes/blackboard/transcript.ts:70`)

**`t5-actor.ts`:** prints `OUTPUT (isError):` only when `c.is_error`. A screenshot-carrying report will print
`OUTPUT:`, followed by the full text: the code line first and the failure line last. `textOf` prints the image as
`[image N base64 chars]`. Part 3's driver and anyone reading Run records must key on the code line and the failure
line, not the marker.

**`blackboard/transcript.ts`:** a `browser_evaluate` PAGE_ERROR/TIMEOUT report with a screenshot is no longer
counted as `the call failed`. It is still rejected for correctness, with a misleading message:
- a chunk call: `resultText` joins all text items, so it gets "came back with N characters and a newline
  (truncated?)";
- a status call: "the status output is not JSON".

No data corruption follows. A follow-up could also treat a text whose last line starts `The call failed (` as a
failure.

### F5 — NIT — the S5.3 test amendments
I read `git diff -- mcp/test`.

**Changed assertions:**
- `tools.test.ts:1249, 1267, 1320`: `isError` true → `"isError" in res` false. This is the documented change. It is
  strict, because it requires the key to be absent, not merely falsy.
- `tools.test.ts:1276`: the notice's line-1 assertion is replaced by line 1 = the code line plus
  `content[2]` = the notice. This is not loosened; it is tighter.
- `s5-cross.test.ts:225`: same as the first item, plus two added assertions: `isFailureReport` is true, and the last
  line is `failedLine(...)`.
- `s5-cross.test.ts:185`: the helper now throws on `res.isError || isFailureReport(res)`. This is sound. Without it,
  a non-error report would pass as a success in (a)/(b) helpers, and the change keeps the old "a failure throws"
  meaning.

Every other expectation in these tests (content length, types, `Screenshot:` line, image equality, tab routing) is
unchanged. Nothing was loosened beyond the documented isError change.

**One note:** `tools.test.ts:1354` re-declares `failedLine` locally instead of importing it. That is good as an
independent pin of the wording. `s5-cross` imports it, which is fine.

**On moving the notice on the no-image path:** the change is defensible for consistency ("code line first"), but see
F1 for the delivery risk.

### F6 — NIT — `npm test` count lines in docs will move
1679 → 1683 (+4, 84 files). The `CLAUDE.md` count (950) is already stale from earlier steps. This is for the
close-out, not S6b.

## 5. Attack on the fix (check 5), with no further findings

- **(a) Read as an error:**
  - Line 1 is still `<CODE>: …`. `report()` is unchanged; the probe's V2 analogue was read as ERROR: yes.
  - The appended line is one line. Its wording is in F3.
  - `Full message:` stays before it (test at :1376).
- **(b) The image:** `failureReport` (`registry.ts:252-258`) pushes exactly `readFile(err.screenshotPath)` as
  base64 `image/png`. `isError` is dropped only when that read succeeded (`content.length > 0`, :265-268). A read
  failure stays `isError` with the "could not be read" line, as before.
- **(c) The tool surface:**
  - `grep -c "server.tool(" mcp/src/tools/registry.ts` gives 23 at HEAD and 23 after the patch.
  - `git diff` touches no tool name, description or schema.
  - Non-attach errors still come back null from `failureReport` and are rethrown in `attempt` (:274-282,
    unchanged).
  - The no-image, no-notice result is byte-identical to HEAD. HEAD's `{isError, content:[text, ...[]]}` equals the
    new `{isError, content:[text]}`, which the test pins with `toEqual` at :1383.
  - The success path of `withNotice` is unchanged. The test at :1419-1423 pins `${notice}\nHovered e1`.
- **(c) WeakSet:**
  - Only objects created inside `failureReport` and `withNotice`'s fresh copy are marked. Every tool returns the
    `onTab`/`attempt`/`onNetworkScope` result directly (grep of :382-767), so no marked object is reused or
    re-wrapped.
  - It is a WeakSet, so nothing is retained. Nothing goes on the wire.
- **(d) No crash on a failed connect:**
  - `git diff --quiet HEAD -- mcp/src/link.ts` reports link.ts unchanged.
  - The link/no-daemon tests are inside the 165/165 mcp run and the 1683 suite.
- **(e) Logging:** the patch adds no `console.*` or log call (grep of the patch for `console|log(` returned
  nothing).

## 6. The build (check 7)

```
worktree HEAD build:      daemon 597d6c28…4da3f   mcp 575400bd…9579f
worktree HEAD + patch:    daemon 597d6c28…4da3f   mcp a0489ac0…7e109
main tree (built 19:47:44): daemon 597d6c28…4da3f mcp a0489ac0…7e109
extension/dist/{sw,offscreen,content,options}.js: worktree == main tree (first 16 hex of each sha256 equal)
```

- **Daemon:** the build id is unchanged, so there is no build handover and no 4002 for other clients.
- **Extension:** the dist is byte-identical, so no reload is needed.
- **MCP:** the main tree's `mcp/dist/index.js` is already the patched bundle (gitignored). A `t5-actor`
  `claude -p` actor spawns a fresh MCP from the user's configured entry (`<repo>/mcp/dist/index.js`,
  `recipes/t5-actor.ts:23-25`), so actors started from now on load it.

What Part 3 must do:
- Run `npm run build` again if `registry.ts` changes after this verification, for example a fix for F1.
- Start fresh actors. Any actor or Claude session started before 19:47:44 still runs the old bundle until `/mcp` or
  a new session.
- Check `mcp/dist/index.js` sha256 = `a0489ac0…` (or the rebuilt value) before REP-1.

## Re-check (fixer round 1)

2026-10-23 · same verifier · I used a fresh clean worktree at HEAD `201f5c8` with the main tree's current
`git diff -- mcp/` applied (`s6b-lane-r1.patch`). The worktree was removed afterwards; `git worktree list` shows
only the main tree.

**Is the diff confined to F1 and F3?** I diffed the round-1 patch against the patch I verified first. Only these
changed:

- **`failedLine` wording (F3):** now `The call failed (<CODE>). This result is not flagged as an error only so that
  the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from error results).`
  It is still one line, with the code and no URL, title, path or token.
- **`withNotice` (F1):** the failure-report branch now applies only when `first?.type === "text"`. It writes
  `${first.text}\n${notice}` into the first item and keeps `...rest`, and the copy stays marked in the WeakSet. The
  non-report branch is unchanged. `failureReport` always puts a text item first, so the fall-through can't happen.
- **Tests:** the comment and doc-comment updates, the `failedLine` literal in `tools.test.ts`, and the
  notice-placement assertions at :1276 and in the S6b cursor test. Both paths now pin exactly one text item whose
  line 1 is the code and whose last line is `lostNotice("T1")`. With an image the content is [text, image]; without
  one it is `{isError: true, content: [one text]}`.
- `failureReport`, `isFailureReport`, `s5-cross.test.ts` and the other assertions are byte-identical to what I
  verified before.

**Checks:**

```
npm ci → 0;  git apply → ok;  grep -c "server.tool(" mcp/src/tools/registry.ts → 23
npm test → Test Files 84 passed (84) · Tests 1683 passed (1683)       (baseline at HEAD: 1679)
npm run typecheck → exit 0;  npm run build → exit 0
sha256 daemon/dist/index.js 597d6c28…4da3f (unchanged from HEAD) · mcp/dist/index.js 4b07b464…63153
  (main tree mcp/dist/index.js is the same 4b07b464…, so it is already rebuilt with round 1)
failing-first, registry.ts reverted to HEAD:  Tests 9 failed | 156 passed (165)
  — the same 9 as before: tools.test.ts 6 (incl. "S6b: a re-claimed cursor's notice is the last line …"),
    s5-cross (a), (b), (c); restored → 165 passed
```

**Status of the findings:**
- **F1:** resolved. On both paths the notice now lives inside the single report text item, so an `isError`
  flattening keeps it, and the code line is still first.
- **F3:** resolved. The wording is client-agnostic.
- **F2:** still open, as a note for Part 3's re-registration. The failure line is the last line only when no cursor
  notice follows. With a re-claimed cursor the notice comes after it, so REP-1 should register "the failure line
  `failedLine(code)`, then the notice line when the cursor was re-claimed".
- **F4–F6:** unchanged.
- **The build:** for check 7, the expected MCP bundle sha for Part 3 is now `4b07b464…`, not `a0489ac0…`. The daemon
  and extension are unchanged.

**Final verdict: PASS-with-notes.** No CRITICAL or MAJOR findings, and the exit criteria are met. F2 and F4–F6
remain as notes.

# Step 13 S3b — builder report (the console texts)

**Verdict:** DONE. Role: builder (`docs/agent-rules.md` §6), Opus, medium. Not committed.

## What changed

1. **`formatConsole`** (`sdk/src/format/console-messages.ts`): the walk now runs from the newest row back, stopping at
   the first row that does not fit, so the kept lines are the contiguous newest block; they print oldest first. A cut
   text opens with one marker line, outside the cap (as before):
   - some lines kept: `… [truncated: <n> older lines cut — narrow with level/limit]`
   - no line fits (only reachable with a caller's own `maxChars`): `… [truncated: <n> lines cut, none fits — narrow with level/limit]`, alone.

   `<n>` = rows − kept. The JSDoc and the file header say the same. Text under the cap is unchanged.
2. **The frames sentence** (plan-drift finding 1's wording):
   - `mcp/src/tools/registry.ts` (`browser_console_messages`): "Messages of a frame in another site's process are not
     read (a same-site frame's are, and are dropped like the page's when its site is blocked);"
   - `sdk/src/tab.ts` (`Tab.consoleMessages` JSDoc): "…wherever `snapshot` is; messages of a frame in another site's
     process are not read (a same-site frame's are, and are dropped like the page's when its site is blocked)."
3. **The limit sentence** (#387), in the same MCP description after "are left out.": "An object logged before this
   call shows its class name only, not its contents." No other tool text changed. The description is not in the #214
   input-schema baseline, so there is no re-baseline.

## Tests

- `sdk/test/s12-console-cap.test.ts`: rewritten for the new direction, 4 → 6 tests. Covered: newest line always kept
  when it fits, even when an older line is shorter; the kept lines are oldest first and contiguous, ending at the newest
  (compared with `formatConsole(entries.slice(-k))`; a long middle line stops the walk and no older short line is kept
  past it); the marker is the first line; its count = lines cut (`kept + n = 200`, exact text with `n`); with no line
  fitting, the marker alone says `<n> lines cut, none fits` and has no "older"; text under the cap is unchanged (also at
  `maxChars` = its exact length); the 20 000 default boundary. Changed expectations: all four old tests (old marker and
  direction). None removed without a replacement: the four old cases are kept in the new direction, and two are added.
- `mcp/test/s12-upload-chooser.test.ts` (last test): changed expectation. The marker is the first line (the new
  wording's regex); the body after it is ≤ 20 000; the text ends with the newest entry (`199:`).
- `mcp/test/s12-console-cross.test.ts` (description test): changed expectation. It pins the new frames sentence in
  full, the old one absent, and the limit sentence.
- `recipes/test/s12-forms-b.test.ts` (CONCAP, "the marker is …" test): per #388 the real-formatter leg is now a
  literal of the OLD form (5 lines + `… [truncated: 25 more lines, the newest — narrow with level/limit]`), so Run 19's
  `concapStats` is still tested against the text Run 19 saw; the unused `formatConsole` import is removed.
  `recipes/s12-forms-b.ts` was not edited. The literal was checked equal to the pre-S3b formatter's output for the old
  test's input (30 × 900 characters, cap 5000): `git show HEAD:sdk/src/format/console-messages.ts` copied to the
  scratchpad and run there with tsx printed `literal equals pre-S3b formatConsole output: true` (main tree untouched, #395).

**Red run first** (`S3b-builder-red.txt`): with only the tests changed, `Tests 8 failed | 37 passed (45)`: all 6 cap
tests, the chooser file's console test and the description test; `s12-forms-b.test.ts` passed (32), as expected for a
literal of Run 19's form. The JSDoc frames sentence has no test (comment text).

## Checks (`S3b-builder-checks.txt`)

- `npm test`: `Test Files 237 passed (237)`, `Tests 5650 passed (5650)`. Baseline 5648 → 5650 (+2, all in
  `sdk/test/s12-console-cap.test.ts`). No test removed.
- `npm run typecheck` exit 0; all seven `recipes/tsconfig*.json` exit 0; `npm run build` exit 0.
- `git status --short` after the build: only the seven lane files plus this report's evidence files.

**Size:** `git diff --numstat` +82 / −45 across 7 files (code 17 added, tests 65 added), under the 200 cap.

## Other pins of the old marker or direction (grep outside node_modules, dist, docs; not edited, outside the lane)

- `recipes/s12-forms.ts:89` `CAP_MARKER` (Run 19's `conmcpStats`, the old marker) and `recipes/s12-forms-b.ts:101`
  `CAP_MARK` (Run 19's `concapStats`: the marker must be the **last** line). These are Run 19's frozen helpers (#388).
  Against the new text they read `truncated=no` / `marker=no`. Run 20's helpers (S5, new `recipes/s13*`) need the new
  form: the marker first, and the `older lines cut` / `lines cut, none fits` wordings. Their callers are
  `recipes/s12-r19-a.ts` and `s12-r19-b.ts`.
- `recipes/test/s12-forms.test.ts:175` passes a literal of the old marker to `conmcpStats`. It does not call the
  formatter, so it stays green and still tests Run 19's helper. Left alone.
- Docs that state the old direction or frames text (S6 / the session agent): `mcp/CLAUDE.md:62-65`,
  `extension/src/CLAUDE.md:61`, and `docs/setup.md` (Stage 0 audit: `:743-744`, `:163`, `:733-734`).

## Deviations

None from the brief. #395 followed: the red run is the new tests against the current code, and the old-formatter check
ran on a scratchpad copy. No daemon, no reload. Evidence holds no local path (checked with grep).

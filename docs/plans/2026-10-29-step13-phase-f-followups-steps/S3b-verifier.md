# Step 13 S3b — verifier report (the console texts)

**Verdict: PASS-with-notes.** Role: verifier (`docs/agent-rules.md` §6), Opus, medium. Read and run only; no tracked
file edited. Evidence: `S3b-verifier-evidence.txt` (same directory). Red proof and mutants ran only in a scratch git
worktree at HEAD `45de00c` with its own `npm ci`, removed safely afterwards (#395, #220).

Read myself: phase doc § 0.5, the dated note after Stage 0, § S3b, § Exit checks, § STOP rules and forbidden fixes;
`docs/decisions.md` #379, #387, #388, #395; `decisions-archive/step12.md` #374 items 6–7; plan-drift finding 1;
`stage0-audit-2.md` § 3 and row B14; `sdk/CLAUDE.md`, `mcp/CLAUDE.md`. The builder's report was audited as claims.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| `npm test` = 5648 + n, none removed | **PASS**: `Test Files 237 passed (237)`, `Tests 5650 passed (5650)`; +2, both in `sdk/test/s12-console-cap.test.ts` (4 → 6 `it`); `s12-upload-chooser` 4 → 4, `s12-console-cross` 3 → 3, `s12-forms-b` 32 → 32 | evidence § Main tree |
| `npm run typecheck` | exit 0 | |
| seven `recipes/tsconfig*.json` | all exit 0 (`tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`) | |
| `npm run build` | exit 0 | |
| `git status --short` after build | the 7 lane files (M) and the 3 builder evidence files (??) only | |
| New/changed tests red on HEAD | **PASS**: the four changed test files on HEAD's code: `Tests 8 failed \| 37 passed (45)` (all 6 cap tests, the chooser file's console test, the description test). `s12-forms-b` stays green there, as it must (a literal of Run 19's form). | evidence § Red proof |
| **C3.2** newest kept, count exact | **PASS** (below) | edge probes, mutants |
| **C3.3** frames sentence in both places + pinned test | **PASS** in the tree; "in one commit" is the committer's (all three files are in the change set) | `git diff` |
| Limit sentence (#387) | **PASS**: "An object logged before this call shows its class name only, not its contents." pinned by `toContain`; mutant M9 (sentence removed) is red | |

## C3.2 — the formatter (`sdk/src/format/console-messages.ts:34-44`)

The walk runs from `rows.length` down, adding `(start === rows.length ? 0 : 1) + row.length`, and breaks at the first
row that does not fit, so the kept lines are a contiguous newest block, `rows.slice(start)`, printed oldest first. The
marker count is `start` = rows − kept, exactly the oldest `start` lines (contiguity makes "older" literally true). With
no row kept, the marker counts `rows.length` and does not say "older" (B14). The marker stays outside the cap, as before
and as `FormatConsoleOptions.maxChars`'s doc says.

Edge cases probed (evidence § Edge probes):
- **Exactly at cap:** the whole text at `maxChars` = its length is unchanged, no marker; one character less cuts the
  oldest line only (`1 older lines cut`). Pinned by the test "text under the cap is unchanged; a line that fits exactly
  is kept…" (both boundaries) and the 20 000 / 20 001 default test.
- **Single entry:** fits → the line alone; `maxChars` one under → `1 lines cut, none fits`.
- **`maxChars` 0 / negative:** `N lines cut, none fits`, no crash.
- **Multi-line text:** line breaks print as `\n`, so one entry stays one line and the count stays exact.
- **Huge middle line:** blocks every older line (`2 older lines cut` + the newest) — contiguous, as Stage 0's audit
  required ("never skip a long row to fit an older short one").
- **Huge newest with small older lines:** nothing kept, `3 lines cut, none fits` (see MINOR-1 on the wording).
- **Worst case under the default** (200 entries of 2000 `\n`, printed 4000 characters each): `196 older lines cut`,
  4 kept, body 16 141 ≤ 20 000, the last kept line is entry 199. So "none fits" is unreachable under the default cap and
  from the MCP (a row is at most ~4 035 characters).
- **`NaN` maxChars:** no cap applied — same as HEAD (every comparison with `NaN` is false); not a regression.

Mutants (worktree, the cap file + the chooser file, 10 tests; all red): marker wording changed (6 red), count +1
(5 red), marker printed last (6 red), the old oldest-first walk with the new marker (6 red), skip a long row and keep
older short ones (1 red — the contiguity test), kept lines printed newest first (3 red), `>=` for `>` (3 red),
"none fits" marker saying "older" (1 red). The new code is green on the same files (10 passed).

## Marker wording against #374 item 6 / #379 / #388 / B14

- #374 item 6: "keeps the **newest** lines and says how many older lines were cut" → `… [truncated: <n> older lines
  cut — narrow with level/limit]`. Matches.
- #388: "the marker is the first line and counts the rows cut" → first line, `<n>` = rows − kept. Matches.
- B14 / Stage 0 audit § 3: with no line kept the marker must not say "older" → `<n> lines cut, none fits`. No "older";
  but see MINOR-1.
- The marker keeps the old marker's "… [truncated: … — narrow with level/limit]" frame, so a reader that looks for
  `truncated:` still finds it.

## C3.3 and the descriptions

- `mcp/src/tools/registry.ts`: `git diff` shows exactly one changed line, the `browser_console_messages` description
  (line 945). The frames sentence is plan-drift finding 1's wording verbatim; the limit sentence is placed after
  "are left out." No other tool text changed. The description is not in the #214 input-schema baseline (the schema
  tests pass unchanged), so no re-baseline.
- `sdk/src/tab.ts`: only the `Tab.consoleMessages` JSDoc changed (2 lines), same wording, lower-case start. Comment
  text, so no test pins it (as the builder says).
- `mcp/test/s12-console-cross.test.ts`: the old `toContain("Messages of the page's frames are not read")` became the
  new sentence in full plus `not.toContain` of the old one, plus the limit sentence. Red on HEAD.
- Truth of the sentences: the frames sentence matches R19-CON-FRAME (a same-site frame read, dropped when its host is
  blocked; an other-site frame not read) and the spec's "out-of-process frames are not read"; the class-name sentence is
  #387's text.

## The two outside pins (#388)

- `mcp/test/s12-upload-chooser.test.ts`: the last test now checks the marker is line 1 (new regex), the body after it
  ≤ 20 000, and that the text ends with entry 199. Comment and title updated; the other three tests unchanged.
- `recipes/test/s12-forms-b.test.ts`: only the CONCAP "marker is…" leg changed: the `formatConsole` import is removed
  and `real` is now a literal of five rows + `… [truncated: 25 more lines, the newest — narrow with level/limit]`.
  I re-derived it: HEAD's formatter source copied to the scratchpad, run on the old input (30 × 900, cap 5000):
  `literal === HEAD formatConsole: true`. HEAD's version of this test against the new formatter fails
  (`1 failed | 31 passed (32)`), so the change was needed. The three look-alike legs are unchanged.
  `recipes/s12-forms-b.ts` and `recipes/s12-forms.ts` are unedited (`git diff --quiet HEAD` on both).

## Grep of the whole repo for the old marker / direction / frames text

`git grep` for "more lines, the newest", "page's frames are not read", "frames' messages are not read", "frames are not
read", outside `node_modules` and `dist` (evidence holds the command):

- **Must change now (tests `npm test` runs, or product code):** none left. `sdk/test/s12-console-cap.test.ts`,
  `mcp/test/s12-upload-chooser.test.ts`, `mcp/test/s12-console-cross.test.ts`, `recipes/test/s12-forms-b.test.ts` are
  changed; `recipes/test/s12-forms.test.ts:175` and `recipes/test/s12-forms-b.test.ts:215,251,259` hold literals of the
  old marker fed to Run 19's helpers, not the formatter, and stay green. Only `mcp/src/tools/registry.ts:954` calls
  `formatConsole` in product code; nothing else parses its output.
- **Run 19 helpers (frozen, #388):** `recipes/s12-forms-b.ts:101` `CAP_MARK` (marker must be the last line) and
  `recipes/s12-forms.ts:89` `CAP_MARKER`. On the new text they read `marker=no` / `truncated=no`. **S5 impact:** Run 20's
  CON-CAP / CON-MCP rows need new helpers (marker first; `older lines cut` and `lines cut, none fits`); the R19 rows in
  `docs/e2e-test-plan.md:1809,1813,1851` are not edited (forbidden fix).
- **Docs for S6 / the session agent:** `mcp/CLAUDE.md:62-65` (says the output keeps the oldest lines, old marker, and
  "frames are not read"), `extension/src/CLAUDE.md:61`, `docs/setup.md:165` (tool row and its dated amendment), `:739`,
  `:749`. See NIT-2.
- **History (no change):** `docs/plans/2026-10-27-step12-phase-f-steps/*`, `docs/cleanup/2026-10-29*`, `stage0-a2-greps.txt`,
  `stage0-audit-2.md`, decisions entries, the spec line 899 (already says out-of-process).

## Findings

**MINOR-1 — "none fits" is not literally true when only the newest line is too long.**
`sdk/src/format/console-messages.ts:43`. Evidence: `formatConsole([e(0,"s"), e(1,"t"), e(2,"H"×500)], {maxChars: 100})`
→ `… [truncated: 3 lines cut, none fits — narrow with level/limit]`, while the two older lines would each fit. The cut is
right (contiguity is Stage 0's rule); the words over-claim. The JSDoc is exact ("when not even the newest line fits").
Reachable only with a caller's own `maxChars` below ~4 035 on the SDK format subpath — never from the MCP or the default
cap. Suggested fix: `… [truncated: <n> lines cut, the newest does not fit — narrow with level/limit]`, and the test's
`NONE_FITS` with it. Not blocking; the step agent may take it or record it.

**NIT-1 — "1 lines cut" / "1 older lines cut".** No singular form. Same as the old marker ("1 more lines") and
`formatNetwork`'s; consistent, so left as a note.

**NIT-2 — `mcp/CLAUDE.md:62-65` becomes false at this commit.** It is a binding "measured facts" file and will say
the output keeps the oldest lines with the old marker until S6. Planned (phase doc 0.5 gives docs to S6; only the
session agent writes `CLAUDE.md`), so a note for the session agent to carry, not a stage defect.

**NIT-3 — the dated amendment at `docs/setup.md:165` and the sentence at `:739`** now contradict the tool's own text in
the other direction; plan-drift finding 1 says to drop them when the text lands (S6).

## Builder's claims

All checked and true: counts (5650, +2, none removed), typecheck/recipes/build exit 0, the red run (`8 failed | 37
passed (45)`, reproduced exactly in the worktree), the literal's equality with HEAD's formatter, the outside pins and
doc list, size well under the 200 cap, no local path in its evidence (grep count 0). No log site added (the formatter
is pure; `extension/test/log-scan.test.ts` passed in the full run).

## Hygiene

Scratch worktree at HEAD under the session scratchpad; the four test files copied in there; mutants written there only.
Cleanup: its `node_modules/@bridge/*` junctions removed one by one with PowerShell `cmd /c rmdir` (0 left), then
`git worktree remove --force`; `git worktree list` shows only the main tree; the main tree's `node_modules/.bin/vitest`
and its five `@bridge` links are present. No daemon, no extension reload; tests bound port 0.

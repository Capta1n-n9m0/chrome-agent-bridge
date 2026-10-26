# S6 — Docs: builder report

**Model:** Sonnet 5.5 (medium effort). **UTC:** start 05:53:07, end 05:59:33 (2026-10-26). **Verdict: DONE.**
Diff: docs only (`git diff --stat`: `README.md`, `docs/progress-and-roadmap.md`, `docs/setup.md`, `recipes/README.md`, plus the
new `S6-claude-md-proposals.md` and this file; `journal.md` was already modified before S6 and is not mine). Nothing
committed.

## What changed

- **`docs/setup.md`** (+159 / -5 lines, under the ~250 cap): the tool count 23 → 24 and a `browser_upload_file` row in
  the tool list; the `Tab` methods list gains `upload`; a new `## Uploading files` section (SDK and MCP use, the two
  things the user must do in Chrome, which element receives the files, the answer is not proof, the refusal with both
  causes plus the sentence that malformed paths and `subst`/mapped-drive folders also refuse, the known limits); in
  Safety: `### Upload folders` (the box, its warning and reasons quoted) and `### The bridge never opens local files`
  (the `file:` pages the bridge refuses); the Safety intro names the fourth setting; the `saveTo` text that said
  refusals come out prefixed carries a dated "Superseded 2026-10-26 (Step 11 S1)" note (S1's behaviour: the bridge's
  own `saveTo` refusals unprefixed; page errors, `TIMEOUT` and raw Chrome errors keep the prefix; SAVE-REFUSE-R passed
  live) and the "Still 23 tools" note is dated.
- **`README.md`:** 24 tools, a Step 11 paragraph, the test count (3811 in 154 files, `npm test` run by this builder),
  Run 16's tally in the history sentence.
- **`recipes/README.md`:** two table rows for the `s11*` helpers and the `tsconfig.s11.json` line.
- **`docs/progress-and-roadmap.md`** (Phase D and Step 11 blocks only): the Status line leads with Step 11; the Phase D
  table row and the Phase D paragraph say D3 is built and E2E-run; a Step 11 row in the step table; the tools list
  (24, with `browser_upload_file`) and a test-count update line; a new `### Step 11 — D3 file upload` block (what
  exists, tests per stage from the phase doc's As built plus today's `npm test`, Run 16's tally and FAILs, known limits).
- **`S6-claude-md-proposals.md`:** per package, only what the grep found missing, each with a source and a place.

## Quotes: product text → source → doc

Each doc text was verified byte for byte by a script that loads the constants (the options/safety/upload messages and
`safetyRefusalLine` by import, the tool description by parsing its string literal) and checks `setup.md` contains them
(all `inDoc true`). Source lines are the string's line; where the constant is declared one line above, that line is
cited in the doc text instead (the doc cites the declaration).

| Quoted text | Source file:line | `docs/setup.md` line |
|---|---|---|
| `browser_upload_file` description | `mcp/src/tools/registry.ts:613` | 753 (code block) |
| `UPLOAD_REFUSED_MESSAGE` | `extension/src/safety.ts:225` (declared 224) | 790 (table) |
| `NO_FILE_ACCESS_MESSAGE` | `extension/src/upload-files.ts:38` (declared 37) | 791 (table) |
| the SDK/MCP `UPLOAD_REFUSED_LINE` | `sdk/src/error.ts:137` (declared 136) | 792 (table) |
| `UPLOAD_FOLDERS_WARNING` (box warning) | `extension/src/options-model.ts:101` (declared 100) | 994 (code block) |
| `UPLOAD_ROOT_REASON` | `options-model.ts:103` | 1005 |
| `UPLOAD_PAD_REASON` | `options-model.ts:104` | 1006 |
| `UPLOAD_RELATIVE_REASON` | `options-model.ts:105` | 1007 |
| `UPLOAD_INVALID_REASON` | `options-model.ts:107` | 1008 |
| `UPLOAD_HOME_WARNING` | `options-model.ts:109` | 1013 |
| `UPLOAD_SSH_WARNING` | `options-model.ts:110` | 1014 |
| summary `No upload folder: every upload is refused.` | `options-model.ts:163` | 1016 |
| `FILE_PAGE_MESSAGE` | `extension/src/safety.ts:217` | 1034 |
| `FILE_URL_MESSAGE` | `extension/src/safety.ts:219` | 1035 |
| the box label (`Folders agents may upload files from, …`) | `extension/options.html:51` | 990 area (grep count 1 in both files) |

The options page's conflict sentence (`options.ts:93`) is described, not quoted.

## Commands run (numbers come from these)

- `npm test`: `Test Files 154 passed (154)`, `Tests 3811 passed (3811)` (2026-10-26, working tree before any S6 commit).
- `node scripts/doc-check.mjs` after the edits: counts `tools: 24 · router methods: 27 · codes: 27`; no
  "Counts that differ from the code" section. Remaining lines are outside my files and lane:
  `CLAUDE.md:119  3273 passed`, `docs/decisions.md 10951 words (budget 10000)`, `extension/CLAUDE.md 3536 words (budget 3500)`.
  Before my edits it listed `docs/setup.md:131`, `docs/setup.md:170` and `README.md:23` as "says 23 tools, code has 24".
- Typecheck and build were not run (docs-only; no code touched).

## Follow-ups (for the session agent)

1. **The tool's description lacks the background-tab sentence** that #262's Revisit-if and #284 allow (Run 16 UP-1: the
   page received the file on a background tab). It says only "The tab is not brought to the front." Not edited (code is
   out of lane); a code change would also change the MCP schema baseline test for this tool's entry. When added,
   `docs/setup.md` line 753's quote must be refreshed (the verification script above re-checks it).
2. `CLAUDE.md:119` (root Commands line) says 3273 passed, 132 files; the true figure is 3811 / 154. The Current state block
   is the session-closeout's. The root Commands line also lists five recipes tsconfigs; `tsconfig.s11.json` makes six.
3. `shared/CLAUDE.md` still says "26 error codes … 25 on the wire" (27 / 26).
4. `subst`/mapped-drive folders and an unreadable file were never measured live; `setup.md` says so for the first.
5. `docs/setup.md`'s Safety section now has two new `###` headings; the `#upload-folders` and `#uploading-files` anchors
   are linked from its intro and from the new section; the README links `#uploading-files`.

## Layer followed

The brief and the phase doc's S6 text (§ Stage S6, S6.1) agree. No conflict between spec and code found; where decisions.md
and the code differ in wording (the extension's file-access message names the product; the SDK line says "the extension's
Details") both are quoted as the code has them.

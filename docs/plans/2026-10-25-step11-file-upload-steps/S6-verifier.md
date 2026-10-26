# S6 — Docs: verifier report

**Model:** Opus 5.5 (effort low). **UTC:** start 06:00:17, end 06:05 (2026-10-26). Read only; nothing edited
except this file; nothing committed.

## 1. Verdict: PASS-with-notes

S6.1 holds: all 15 quoted product texts are byte-identical to the code. Both refusal causes, the `file:` refusal, the
`saveTo` amendment, the counts and the known limits match the code and the as-built. No CRITICAL or MAJOR findings.
There are 5 MINOR and 4 NIT, all fixable in docs.

## 2. Outputs (numbers from my runs)

- `npm test` (working tree, 06:00Z): `Test Files 154 passed (154)`, `Tests 3811 passed (3811)`, exit 0. This
  matches README, roadmap and builder (3811 / 154).
- `node scripts/doc-check.mjs`: `tools: 24 · router methods: 27 · codes: 27`. There is no "Counts that differ"
  section. The only stale test count is `CLAUDE.md:119  3273 passed`, which is outside S6's files (the session
  agent's). The word budget is over in `docs/decisions.md` and `extension/CLAUDE.md`, also not S6's.
- `npx tsc --noEmit -p recipes/tsconfig.s11.json` exits 0 (the config `recipes/README.md` now names).
- `git status --short`: only `README.md`, `docs/progress-and-roadmap.md`, `docs/setup.md`, `recipes/README.md`,
  `journal.md` (one line, `S6 · step agent · … (running)`, the session/step agent's), plus the untracked
  `S6-builder.md` and `S6-claude-md-proposals.md`. These are docs only (check 4 holds).
- `git diff --numstat -- docs/setup.md`: `159 5`, under the ~250 cap.

## 3. Check 1 — S6.1, quotes byte for byte

The method was a script (`scratchpad/quotes.mjs`). It parses each constant's JS string literal from source with
`JSON.parse`, then tests `setup.md` for the exact text inside backticks or on its own line in a fence.

| Quote (setup.md) | Source | Result |
|---|---|---|
| `browser_upload_file` description (fence, 1151 chars) | `mcp/src/tools/registry.ts:613` | PASS |
| `UPLOAD_REFUSED_MESSAGE` | `extension/src/safety.ts:224-225` | PASS |
| `NO_FILE_ACCESS_MESSAGE` | `extension/src/upload-files.ts:37-38` | PASS |
| `UPLOAD_REFUSED_LINE` (SDK/MCP) | `sdk/src/error.ts:136-137` | PASS |
| `UPLOAD_FOLDERS_WARNING` (fence) | `extension/src/options-model.ts:100-101` | PASS |
| `UPLOAD_ROOT_REASON`, `_PAD_`, `_RELATIVE_`, `_INVALID_` | `options-model.ts:103-107` | PASS ×4 |
| `UPLOAD_HOME_WARNING`, `UPLOAD_SSH_WARNING` | `options-model.ts:109-110` | PASS ×2 |
| `FILE_PAGE_MESSAGE`, `FILE_URL_MESSAGE` | `extension/src/safety.ts:217, 219` | PASS ×2 |
| box label | `extension/options.html:51` | PASS |
| `Save upload folders` | `options.html` button | PASS |
| `No upload folder: every upload is refused.` | `options-model.ts:163` | PASS |

The cited line numbers point at the declaration line. The string sits one line lower for the four two-line
constants, and the builder's table says so. The MCP answer format (`Uploaded <n> file(s) to <target>:`, `<name> ·
<bytes> bytes · sha256 <hex>`) matches `registry.ts:634-635`.

Paraphrased where a quote was asked for: see MINOR 3.

## 4. Check 2 — accuracy against the code and the as-built

These hold:
- **Both causes.** The folder rule is `safety.ts`. The toggle is `fileAccessRefusal` in `upload-files.ts:41-42`.
- **The SDK preflight.** `sdk/src/upload.ts` checks: absolute, `realpath`, `isFile`, readable, the index in the
  message, `fs.promises.realpath`.
- **The target rule.** `content/upload-target.ts:25-31, 76-86`: disabled, `webkitdirectory`, single-file, many
  inputs, all `BAD_PARAMS`. `accept` is not referenced.
- **The `file:` refusal.** `safety.ts:353` (tab) and `:372` (navigate/newTab). The edges (`closeTab`/`focusTab`
  refused, `listTabs` rows kept, `downloadStart` keeps `BAD_PARAMS`) match decisions.md #259.
- **The folder-line rules.** `upload-paths.ts:151` ignores blank lines and lines starting with `#`, with the #257
  rules.
- **The conflict behaviour.** It matches `options.ts:93`.
- **The `saveTo` amendment.** `markOwnRefusal` is used in `evaluate/save.ts:129-130, 151, 223`. SAVE-REFUSE-R
  passed in Run 16 (as-built S5).
- **No failure report.** `UPLOAD_REFUSED` is not in `ATTACH_CODES`.
- **The tallies.** Run 16 is 19/3/3/4, with UP-6/UP-6B (#284) and UP-OPT 6061 ms (#285).
- **The stage table.** It matches the as-built.

## 5. Findings

**MINOR 1 — The table row's pipe breaks the tool table.** At `docs/setup.md:157` the row reads
`browser_upload_file(ref | locator, paths)` with an unescaped `|`. Every other row escapes it, as in
`grep -n '^| \`browser_' docs/setup.md` → `142:| \`browser_click(ref \| locator, …`. In GitHub's markdown the bare
`|` splits the cell, so the row renders with an extra column. **Fix:** `ref \| locator`.

**MINOR 2 — "test profile" is wrong.** `docs/setup.md:746` says "Run 16 found it already on in the test profile".
Run 16 ran in the user's real profile, the only profile this product drives (`docs/e2e-test-plan.md:1455, 2794`:
the toggle was read in the wave's window of the real Chrome). The sentence is wrong, and it describes the user's
own setting as a test fixture's. **Fix:** "Run 16 found it already on".

**MINOR 3 — Options texts are paraphrased where S6.1 asks for byte-for-byte quotes.**
- `setup.md:1015-1018` paraphrase the conflict message ("the page says so and Save replaces them with what you
  see"). The code is `options.ts:93`: `The saved folders were changed elsewhere while you were editing; Save
  replaces them with the text shown here.`
- The summary's other forms are paraphrased too: `<n> upload folder(s).` and `<n> invalid line(s) are not used
  (marked below).` (`options-model.ts:163-165`).

**Fix:** quote them, or say in a line that only the fixed texts are quoted.

**MINOR 4 — The "refused BAD_PARAMS" list and the malformed-paths sentence don't say which client.**
- `setup.md:775-777` lists "no paths, more than 20" among the `BAD_PARAMS` refusals "before the attach". That holds
  for the SDK only (`sdk/src/upload.ts` `prepareUpload`). The MCP's schema rejects these first (zod `min(1)`/`max(20)`,
  `registry.ts`), and a raw client gets `UPLOAD_REFUSED` at the gate. That raw-client path is #249: "a malformed
  `paths` (… more than 20) fails closed at the gate"; #257: "a malformed `paths` gets the same message".
- Likewise `setup.md:783` says relative paths and `..` parts "also refuse" in the `UPLOAD_REFUSED` section. From
  the SDK and the MCP a relative path is `BAD_PARAMS` from the preflight, and `..` is resolved by `realpath` before
  sending. Only a raw client meets the gate's refusal.

**Fix:** "from the SDK" / "a raw client gets `UPLOAD_REFUSED`".

**MINOR 5 — The roadmap misstates the known limits and the open rulings.**
- `docs/progress-and-roadmap.md:299` says "a refusal **names** which of the agent's paths are not allowed". The
  refusal names no path (`UPLOAD_REFUSED_MESSAGE`, #237). The phase doc's limit is that it *tells* (by trial). That
  wording contradicts the product's no-path promise. `setup.md:803` has it right ("tells").
- `progress-and-roadmap.md:266-267` lists the open rulings as "(#245, #247, #250, #257, #263, #268, #284's UP-RAW)"
  as if complete. decisions.md's Open decisions holds 20 entries: #235–#238, #240, #241, #243, #245, #247, #250,
  #254, #257, #259, #261, #263, #266, #268, #283, #284 (the `awk` over `## Open decisions`). The list misses #283,
  which must be ruled before any push.

**Fix:** "tells"; point at decisions.md's Open decisions instead of a partial list.

**NIT 1 — The decision citations in the roadmap Step 11 block are off.**
- "decisions #230–#285": Step 11's entries start at #233; #230–#232 are lean procedures.
- "(#240, #241)" for no focus / no lock: that is #238.
- "(#237, #269)" for the folder list: that is #236.

The block also cites decisions by number alone, against `docs/docs-writing-guide.md` § Decisions ("Never cite a
decision by number alone"), as earlier blocks also do.

**NIT 2 — The marker form departs from the guide.**
- `setup.md:605-609` keeps the Run 15 text and adds a "Superseded … : <new behaviour>" note. The guide's form is
  "*Superseded <date>: was X, because Y*" after an in-place edit. The record of Run 15's measurement can stay, but
  the current behaviour should be the main text.
- `setup.md:171` says "was 23 tools", but the text it replaces read "Still 23 tools".
- The `saveTo` note also omits that the save leg's `INTERNAL` breakdowns and the transfer timeout keep the prefix
  (#254), and "a page error" sits beside the unprefixed stringify `PAGE_ERROR`.

**NIT 3 — Two phrases will go stale.** "S6 (docs) is this change" (`progress-and-roadmap.md:5, 266`) is stale once
committed. Also, `setup.md:784-785` states the `subst` mechanism as fact. S4.md §6 says "likely … may never match".
Write "may".

**NIT 4 — Lane: the roadmap edits go a little past "Phase D and Step 11 blocks".**
- The Status line (`:5`), the tools list and the test-count line (`:193-199`) and the Step 11 table row are outside
  those blocks.
- They are needed for the counts (doc-check flagged 23 tools before), and the builder lists them.
- They are not called deviations. List them as one.

## 6. Check 5 — the proposals file

- **Coverage.** It covers root, `extension/`, `extension/src/content/` (none), `sdk/`, `mcp/`, `shared/`, `daemon/`
  and `recipes/`. It does not address `extension/src/handlers/CLAUDE.md`, whose Key files lack the new
  `handlers/upload.ts` (`grep -i upload extension/src/handlers/CLAUDE.md` → nothing). It does not address
  `extension/src/evaluate/` either. **Add a Key-files line or "none".**
- **Sources, opened and confirmed:**
  - `safety.ts:353/372`, `upload-files.ts:37-42`, `sdk/src/index.ts:39-40`, `shared/src/codes.ts:11-13,66`,
    `protocol.ts:578-606` and `daemon/src/methods.ts:9,32`.
  - The test files exist: `s11-upload`, `s4-upload-tool`, `s4-upload-cross`, `s2-upload-methods`, `s2-upload-gate`.
  - `S5-liveB.md:135`: "background tab: no focus needed (UP-1, Chrome 156)".
  - SW-2: `S5-run-record.md:180-192`, `d=[-24, 95, 68]`, warm-up 770 ms.
  - `S5-record.md` §6 (MINOR-5, NEW-1), `S5-win.md` §6, `S5-fixtures.md` §6 (8080 held by `Code.exe`).
  - `S5-liveA.md` §12 (8 px overhang), `S2.md` §6 (tests not type-checked), `S4.md` §6 and `stage0-audit.md` F8.
- **A citation that misses.** Extension #6 cites "`S3.md` § findings (NIT A)", but NIT A is in `S3.md` §3 (line
  20), not §6.
- **Placement (#232).** Placement follows the code each fact binds. The `file:` fact and the toggle fact go in
  `extension/CLAUDE.md` (top-level `safety.ts`, `upload-files.ts`). The realpath gotcha goes in `sdk/` (`upload.ts`).
  The schema note goes in `mcp/`.
- **Duplicates.** None found. A grep of every `CLAUDE.md` for `file:`, `realpath`, `UPLOAD_FILES_MAX_PATHS`,
  `browser_upload_file`, `isAllowedFileSchemeAccess`, `s11`, `overhang` and `display name` finds nothing.
  `uploadFiles` appears only in the extension Key files the file names as already present. `shared/CLAUDE.md:13`'s
  "26 error codes" is stale, as proposed.

## 7. Check 6 — integrity

- I scanned the added lines of the four docs and both new files for the user's name, `Users\` paths, `http`,
  domains and `blackboard`. Only an unchanged Blackboard sentence sits on an edited roadmap line (pre-existing).
  The example folder is `C:\Users\you\Uploads`. No token, pattern or profile data.
- On style, the guide is followed apart from NIT 1 and NIT 2.

## 8. Proposed decisions

None.

## 9. Handoff

Fixes are docs-only: setup.md lines 157, 746, 775-785 and 1015-1018; the roadmap Step 11 block; the proposals
file's handlers line. A fresh check need only re-run the quote script for any quote changed and re-read these
lines. The scratch script is
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\quotes.mjs`.

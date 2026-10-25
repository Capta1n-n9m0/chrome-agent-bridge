# S8 verifier report — retire the chunked MCP recipe; Step 10 docs

Verifier: Claude Opus 5.5, 2026-10-25. Brief `briefs/S8-verifier.md`. Change audited: the uncommitted main tree against
`312cadb` (14 tracked files: 12 modified, 2 deleted, plus the builder's two untracked S8 files). Offline: no daemon, no
Chrome. The only file I edited is this report.

## Method

- Two scratch worktrees at `312cadb` in the session scratchpad (`git worktree add`). The main tree's
  `git diff 312cadb --binary` (80 580 bytes, deletions included) was applied to `wt-after` and showed the same 14-path
  `git status` as the main tree. `npm ci` ran in each worktree (205 packages, real `node_modules`, no junction). Both
  worktrees were unregistered with `git worktree remove --force` and `git worktree prune`. Git could not delete the
  leftover `npm ci` files on disk ("Directory not empty"). They are in the scratchpad and are not junctions (`fsutil
  reparsepoint query` → "not a reparse point"), and I did not run a recursive delete. The main tree's
  `node_modules/.bin` is intact (42 entries).
- Ran `npm run typecheck`, `npx vitest run`, `npx vitest list`, every `recipes/tsconfig*.json` with `npx tsc --noEmit
  -p`, `npm run build` and `git status --porcelain` before and after the build. `wt-before` ran the same set except
  typecheck and build.

## Counts, before → after (my runs)

| Check | `312cadb` (wt-before) | S8 tree (wt-after) |
|---|---|---|
| `npm test` | 132 files, **3280** passed, exit 0 | 132 files, **3273** passed, exit 0 |
| `vitest list` lines | 3280 | 3273 |
| `npm run typecheck` | — | exit 0 |
| `npm run build` | — | exit 0; `git status --porcelain` identical before/after |
| `tsc -p recipes/tsconfig.fe.json` | 0 | 0 |
| `tsc -p recipes/tsconfig.json` | 0 | 0 |
| `tsc -p recipes/tsconfig.s10.json` | 0 | 0 |
| `tsc -p recipes/tsconfig.s6.json` | **exit 2, 29 errors** (26 `extension/src/tabs.ts`, 3 `extension/src/debugger.ts`) | 0 |
| `tsc -p recipes/tsconfig.s9.json` | 0 | 0 |

The count changed by 3280 − 3273 = **−7**, which matches 0.5's note.

## Checks

### 1. S8.1: PASS

Test names from `vitest list`, before vs after (`comm -23`). Only these went, and nothing was added:

```
recipes/test/blackboard-export-file.test.ts > chunks > assemble needs contiguous chunks from 0 to the length; identical duplicates are fine
recipes/test/blackboard-export-file.test.ts > parseTranscriptChunks > accepts a short last chunk (asked past the end) and assembles to the status length
recipes/test/blackboard-export-file.test.ts > parseTranscriptChunks > accepts t5-actor's wrapped lines ({t, m})
recipes/test/blackboard-export-file.test.ts > parseTranscriptChunks > ignores other keys and other tools
recipes/test/blackboard-export-file.test.ts > parseTranscriptChunks > reads the status and the chunk results of the key, in any order
recipes/test/blackboard-export-file.test.ts > parseTranscriptChunks > records a truncated, errored or wrong-length chunk as an error, never as data
recipes/test/blackboard-held.test.ts > the MCP plan in hold mode (#103): no START, the held key > a transcript of that plan is read back on the held key
```

That is 6 from `blackboard-export-file.test.ts` (the `assemble` test and 5 `parseTranscriptChunks` tests) and 1 from
`blackboard-held.test.ts`: exactly 0.5's set, and it matches the builder's list. None of the 7 covered anything that
remains. Each one called `assemble()` or `parseTranscriptChunks()`, both now deleted. The removed imports
(`chunkExpression`, `statusExpression`, the helpers `assistant()` and `result()`) were used only by those tests.
`chunkExpression` and `statusExpression` remain imported and pinned in `blackboard-held.test.ts`, and `mcpPlanLines` is
still pinned there.

My run of `grep -rn "assemble-mcp\|transcript.ts" recipes docs/setup.md` printed the same 7 lines as the builder's
report:

```
recipes/blackboard/export-file.ts:4:// *Retired 2026-10-25 (Step 10 S8): was "pure helpers of export-grades.ts and assemble-mcp.ts … chunk ranges and
recipes/blackboard/export-file.ts:5:// reassembly", because the chunked MCP leg (assemble-mcp.ts, transcript.ts and `assemble()`) is retired — the MCP
recipes/blackboard/export-grades.ts:10:// *Retired 2026-10-25 (Step 10 S8): was "(`--mcp-plan`, then recipes/blackboard/assemble-mcp.ts)", because the
recipes/README.md:45:*Retired 2026-10-25 (Step 10 S8): `blackboard/assemble-mcp.ts` (rebuilt SDK-7's MCP leg from an actor's transcript into
recipes/README.md:46:`exports/<course>-<date>-mcp.json`) and `blackboard/transcript.ts` (transcript parsing), with `export-file.ts`'s
recipes/test/blackboard-export-file.test.ts:3:// recipes/blackboard/transcript.ts (the MCP leg of SDK-7 read back from a Claude transcript)", because the chunked
recipes/test/blackboard-export-file.test.ts:5:// tests left with assemble-mcp.ts, transcript.ts and `assemble()`.*
```

Every hit is inside a dated `*Retired 2026-10-25 …*` note. `docs/setup.md` has none. CLAUDE.md gotchas: S8 does not
edit CLAUDE.md, and each proposed gotcha in `S8-claude-md-proposals.md` cites its source (check 7).

### 2. Retirement completeness: PASS, with finding 1

- Repo-wide grep for `assemble-mcp|transcript\.ts|parseTranscriptChunks|assemble(` (excluding `node_modules`, `dist`
  and `docs/plans/`) finds:
  - `CLAUDE.md:169–170`: the Key files list still names both files. CLAUDE.md is outside the lane, and the change is
    proposed in proposals (b) 7.
  - `docs/decisions.md`: history.
  - `docs/e2e-test-plan.md:1008` and `:1024`: §4.19's Tools paragraph and row SDK-7 (see finding 1).
  - `docs/progress-and-roadmap.md:217, 237`: the new Step 10 block, which reports the retirement.
  - The recipes files' dated notes.
- No `package.json` script names them, and no tsconfig does. `tsconfig.s6.json` uses the `blackboard/*.ts` glob.
  `--listFilesOnly` across all five recipes tsconfigs, before vs after, differs only by the two deleted files.
- `--mcp-plan` still exists. Its `HELP` line (`export-grades.ts:55`) now reads `… --mcp-plan   (the MCP leg's
  expressions; read the export with one browser_evaluate {saveTo}, never in chunks)`.

### 3. Byte-for-byte texts (#198): PASS

I joined `docs/setup.md`'s lines and searched for each quoted text, and searched the code for the same string:

| Text | setup.md | code |
|---|---|---|
| `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.` | found | `mcp/src/tools/registry.ts:39-40` `CAP_WARNING_LINE` |
| `browser_evaluate takes asRef or saveTo, not both — saveTo writes the value to a file, asRef returns a ref to an element` | found | `registry.ts:795` |
| `Paging bulk data through browser_evaluate in chunks is a test device only, never a supported pattern: pass saveTo to write a large value to a file instead.` | found | `registry.ts:761` |
| `Saved <path>` / `<bytes> bytes · <kind> · sha256 <hex>` | found | `registry.ts:801`; `kind` = `string`/`json` (`sdk/src/evaluate-save.ts`) |
| `JS_DISABLED`'s message | found, whole | `extension/src/safety.ts:183-184` `JS_DISABLED_MESSAGE` |
| `-WaitSec` (default 90) | `recipes/README.md` | `recipes/bb-login.ps1:87` param block; header step 6 `:48-59` |
| `evaluateToFile(expression, {path, overwrite?, timeoutMs?})` → `{path, bytes, kind, sha256}` | found | `sdk/src/tab.ts:328`, `sdk/src/evaluate-save.ts` `EvaluateToFileOptions`/`Result`; the cursor's copy at `sdk/src/client.ts:464` |
| `pastSnapshotCap: true`, `{tab, method, kind: "pastSnapshotCap"}`, `BridgeWarning`, `on("warning")`, "the action still resolves `undefined`" | found | `shared/src/protocol.ts:476`, `sdk/src/tab.ts:48-52, 190-198`, `sdk/src/client.ts:322` |

I also checked facts the builder did not cite:

- The `saveTo` file rules match `sdk/src/evaluate-save.ts` `checkSaveTarget` and the "wx" open of `<path>.part`:
  absolute path, no existing directory, parent must exist ("nothing is created"), an existing file needs
  `overwrite`, an existing `.part` is refused, and a failure leaves no file.
- The page-side refusals match `extension/src/evaluate/save.ts:48-57, 112-116`: undefined, function, symbol, Map, Set,
  DOM node.
- The store limits match `extension/src/evaluate-save-store.ts:22-29`: 5 min, 8 entries, 256 MiB, 1 MiB slices. It is
  dropped at a disarm, with JavaScript off, and on tab close or replace (header, lines 12–13).
- `METHOD_CLASSES` has 26 entries, with the three `evaluateSave*` methods in class `evaluate`. That is why "with
  `asRef` or `saveTo` too … refused `JS_DISABLED`" holds.
- The three trusted tools' descriptions (`registry.ts:492, 514, 538`) and `browser_focus_tab`'s (`:658`) agree with
  the setup.md table cells, which paraphrase and do not claim to quote. The cells use S2's proposed wording.
- `capped()` is applied only to click, type, press_key, scroll, hover and select_option (`registry.ts:507-603`), so
  "`browser_wait_for` … gives no such line" is right.
- The run figures setup.md and the roadmap quote match the stage reports and run records:
  - R14-4b: 5 ms, banner gone at +4.7 to +5.0 s (S1.md Findings 3).
  - R14-5c: S1.md row.
  - R15-POP-2: 150 ms (S7.md row).
  - R15-3R: 2 s (`Wait-S9OptionsStatus … 2000`, §4.22).
  - MCPF-1R: 9/9.
  - SAVE sizes, including 418 754 bytes (as-built § S7).
  - Run 15 tally 27/3/3/4 (decisions.md #226).

I found no mismatch.

### 4. History untouched: PASS

`git diff 312cadb -- docs/e2e-test-plan.md` is a single hunk at line 306 that adds 6 lines. It is a `*Note 2026-10-25
(Step 10 S8): …*` placed after §4.6's table (after row HIST-1, before `### 4.7`). No row, no run record and nothing in
§4.20–§4.22 changed.

In setup.md, README.md and the roadmap, every changed fact carries `*Superseded 2026-10-25: was "…", because …*` or
`*Updated 2026-10-25: …*`, with the old text quoted:

- setup.md has 12 of these notes: the tool table, "No call brings a Chrome window…", the trusted-input bullet, What
  Claude sees, Not for bulk data, the JavaScript switch, the redirect check, Troubleshooting ×2, and the R14-4b, POP
  and SAFE-3 updates.
- README.md has a `*Corrected 2026-10-25*` note.
- The roadmap has a status-line `*Superseded*` note and a dated note on the Step 9 milestone row.

### 5. Lane: PASS

- The 14 changed paths are all in the builder brief's lane.
- `sdk/src/policy.ts`: every one of the 13 changed lines (`-4/+9` in hunk `@@ -14,10 +14,15 @@`) starts with `//`, so
  it is a comment-only change.
- Nothing changed in `shared/`, `daemon/`, `mcp/`, `extension/`, `docs/decisions.md`, the as-built register or
  `CLAUDE.md` (`git status`).
- The deletions in `recipes/blackboard/` and `recipes/test/` are removals plus header and help-text edits, as amended
  by Stage 0 F9. `recipes/tsconfig.s6.json` is item 3's fix.

### 6. Item 3: PASS

- **Error count at `312cadb`:** 29 (26 `tabs.ts` + 3 `debugger.ts`, all chrome-name errors), which confirms "29, not
  26".
- **First import chain:** `recipes/test/s9-rules.test.ts:14` imports `extension/src/tabs.js`. That test file was
  created in `e91e437` (`git log -S'extension/src/tabs.js'` → `e91e437 2026-10-24 test(e2e): S4 — wave helpers (Step
  9)`, and the file is absent at `e91e437^`).
- **Second import chain:** `recipes/test/s10-rules.test.ts:15` imports `extension/src/handlers/evaluate-save.js`, which
  imports `../tabs.js` and `../debugger.js` (lines 2–3). `s10-rules.test.ts` was added in `b55048d`
  (`--diff-filter=A`), so this chain is the source of the 3 extra errors.
- **The fix:** `"exclude": ["test/s9-rules.test.ts", "test/s10-rules.test.ts", "test/s10-fixtures.test.ts"]`.
  - Each excluded test is included by a project that passes: `tsconfig.s9.json` includes `test/s9-rules.test.ts`, and
    `tsconfig.s10.json` includes `test/s10-rules.test.ts` and `test/s10-fixtures.test.ts`. All exit 0.
  - The union of files covered by all recipes tsconfigs is unchanged apart from the two deleted files.
  - `npm test` still runs the excluded tests: `vitest list` after shows s9-rules 78, s10-rules 106, s10-fixtures 9.
- **Shape:** I agree with the builder that an exclude is the right fix. Adding `"chrome"` to `types` (and DOM libs)
  would let the Step 8 recipes type against browser globals they must not use.

### 7. CLAUDE.md proposals: PASS, with NITs

- **Candidate coverage.** I opened each report's Findings section:
  - S1.md Findings 1–7 are A1–A7 and A9.
  - S2.md has no gotcha, only stale texts (A10).
  - S4.md §6 candidates 1–3 are A11–A13.
  - S4b.md Findings 1 is A14. Its Findings 2 (stale texts) was applied in setup.md.
  - S5.md Findings 3 is A15.
  - S7.md Findings 1–11 are A16, A17, A18, A2, A19, A20, A21, A11/A24, A22, A23 and A26.
  - Every cited figure matches its source: 571/1000 typed, 76 ms, SW-1R d = 101/1276/1421 ms, RET-1R 106 ms and
    3 handles, BBL-1 90006/90013 ms, 223×25 px, and Claude Code 2.1.310 (`S7-wave-fixer2.md`).
- **Counts:**
  - 26 codes: `shared/src/codes.ts` has 26 values, including `JS_DISABLED`, and `NO_CURSOR` is the SDK-only one.
  - 26 router methods: `METHOD_CLASSES`, matching `daemon/src/methods.ts:28-30`.
  - 23 tools: 23 distinct tool names in `registry.ts`.
  - 3273 tests in 132 files: my run.
  - 45 fixtures: `snapshot-pre-s1.json` has 45 entries. The correction's source is S3-verifier finding 5 and
    S3-builder item 2.
- **CLAUDE.md lines:** the anchors (`:104`, `:174`, `:202`, `:223`, `:593`) match CLAUDE.md as it is now, at 856
  lines.
- **New key files:** every file named in (b) 7 exists.

### 8. Roadmap block: PASS

Every hash in the Step 10 table resolves in `git log` to the named stage: `f45e3bf`, `9f91e5f`, `b016712`, `5f17d54`,
`f717682`, `09fa604`, `8ae1a95`, `34adfdc`, `89d6de7`, `6ba2d10`, `2866c43`, `da16277`, `b55048d`, `32cb5fc` and
`c8169ff`. The per-stage test counts match the as-built register: 2720 → 2763 → 2807 → 2989 → 3145 → 3165 → 3280, and
S8 = 3273 (my run).

### 9. No URL, token or student data: PASS

- **URLs:** the `://` strings in the patch's added lines are only `http://127.0.0.1:<port>/`, `http://localhost:8081`
  and bare `://` in prose. The S8 report and proposals contain the same kind only.
- **Token:** `bridge.token`'s value appears 0 times in the patch and 0 times in the S8 files (counted, never printed).
- **Course data:** course-id-like strings appear only on removed lines (`mcp-_5_1`, `sdk-_5_1`, invented test keys).
  The `ada…` host names in the README row were already there before S8.

## Findings

1. **MINOR: `docs/e2e-test-plan.md:1008` and `:1024` (§4.19, Tools paragraph and row SDK-7) still tell the reader to
   run the retired `assemble-mcp.ts`, with no dated pointer.**
   - **Evidence:** `sed -n 1024p docs/e2e-test-plan.md` contains `**[SH]** npm run recipe --
     recipes/blackboard/assemble-mcp.ts <M's out.jsonl> pp1` and `… assemble-mcp.ts <M's out.jsonl> pp1 --held`.
     Line 1008 lists `blackboard/assemble-mcp.ts` among the wave's tools. Neither has a Step 10 note.
   - **Why only MINOR:** the row is a pre-registered, already-run row that S8 may not edit, and the brief's S8.1 grep
     covers only `recipes` and `docs/setup.md`.
   - **Why it still matters:** check 2 asks that a doc telling someone to run these files carry a dated history note.
     The builder added one for TAB-5 but not for SDK-7, so a reader re-running SDK-7 now hits a missing file.
   - **Suggested fix:** one dated note after §4.19's table (outside the rows), like the TAB-5 note. For example: "*Note
     2026-10-25 (Step 10 S8): `assemble-mcp.ts` and `transcript.ts` are retired; SDK-7's MCP leg is now one
     `browser_evaluate {saveTo}` — §4.22 rows SAVE-FIX and PP1 (Run 15). The rows above stay as run.*"
2. **NIT: `docs/progress-and-roadmap.md:3` still says `- **Date:** 2026-10-24`,** while the status line beneath it now
   describes 2026-10-25. Suggested fix: update the date or add a dated note.
3. **NIT: `S8-builder.md` § Item 2 says "the roadmap and README carry 26".** README.md states no code count. It names
   `JS_DISABLED` only (`grep -n "on the wire\|error codes\|[0-9][0-9] codes" README.md` → nothing). The claim is
   wrong; the docs themselves are not.
4. **NIT: the "absent at `e91e437^`" wording in `S8-builder.md` item 3 is loose.** It says the import line is absent at
   `e91e437^`; in fact the whole `s9-rules.test.ts` file did not exist then. The conclusion is unaffected.
5. **NIT: setup.md says the store holds a value "at most 5 minutes".** The TTL is refreshed by each pull
   (`evaluate-save-store.ts:9`), so it is 5 minutes idle. Suggested fix: "5 minutes without a pull".
6. **NIT: product text inconsistency, outside S8's lane, for the record.**
   - **What:** `browser_evaluate`'s `saveTo` parameter description says "answer only the path, size and sha256"
     (`registry.ts`, the `saveTo` `.describe`). The tool description and the actual answer also include `kind`.
   - **Effect on setup.md:** none. It follows the tool description and the answer.
   - **Suggested fix:** a later stage aligns the parameter text. That is a schema change, so #214's baseline applies.

## Verdict

**PASS-with-notes.** S8.1 holds: exactly the 7 tests of 0.5's note went, 3280 → 3273; the grep finds only dated notes;
the proposed gotchas cite their sources. Typecheck, test, build and all five recipes tsconfigs exit 0 in a clean
`npm ci` worktree, and the build leaves `git status` unchanged. Every quoted text matches the code, and the lane is
respected (`policy.ts` changed in comments only). I found no CRITICAL or MAJOR issue: 1 MINOR (the §4.19 SDK-7 dated
pointer) and 5 NITs.

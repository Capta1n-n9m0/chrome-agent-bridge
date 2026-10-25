# S8 builder report — retire the chunked MCP recipe; Step 10 docs

Builder: Claude Opus 5.5, 2026-10-25. Brief `briefs/S8-builder.md`. Base `312cadb`. Offline: no daemon started, no
recipe run against the bridge, Chrome not touched. Nothing committed. The CLAUDE.md proposals are in
`S8-claude-md-proposals.md` (item 4); `CLAUDE.md`, `docs/decisions.md` and the as-built register are not edited.

## Verdict (builder's)

Done: items 1–4. Tests **3280 / 132 → 3273 / 132** (−7, exactly 0.5's set); typecheck, build and all five recipes
tsconfigs exit 0 (item 3 fixed in `recipes/tsconfig.s6.json`). Nothing escalated.

## 1. Built, per item

### Item 1 — the retirement (fixture leg passed: Run 15 SAVE rows and PP1 PASS, S7.md)

Importers checked first (`grep -rln "assemble-mcp\|transcript\.ts\|parseTranscriptChunks"` over the repo, without
`node_modules` and `docs/plans/`): only the files themselves, `export-file.ts`, `export-grades.ts` (a comment), the
two tests, `recipes/README.md`, plus history mentions in `CLAUDE.md`, `docs/decisions.md`, `docs/e2e-test-plan.md`. No
tsconfig names them (`tsconfig.s6.json` covers `blackboard/*.ts` by glob), no `package.json` script.

| File | Change |
|---|---|
| `recipes/blackboard/assemble-mcp.ts` | deleted (61 lines) |
| `recipes/blackboard/transcript.ts` | deleted (94 lines) |
| `recipes/blackboard/export-file.ts` | `assemble()` removed; header rewritten with a dated `*Retired 2026-10-25 …*` note. Nothing else became dead: `sha256Hex`, `verifyTransfer`, `chunkRanges`, `exportFileName`, `isInside`, `mcpLegPlan`, `MCP_*` are still used by `export-grades.ts`, `held.ts`, `s6.ts`, `s6-rules.ts` (see Deviations for `leg: "mcp"`) |
| `recipes/blackboard/export-grades.ts` | header (the MCP leg is one `browser_evaluate {saveTo}`; dated note), the usage comment and the `HELP` text's `--mcp-plan` line now name `browser_evaluate {saveTo}`. No code change |
| `recipes/blackboard/held.ts` | header: a dated `*Updated 2026-10-25 …*` note; `mcpPlanLines` unchanged (its lines are pinned by tests) |
| `recipes/test/blackboard-export-file.test.ts` | header (dated note); the imports `assemble`, `parseTranscriptChunks`, `chunkExpression`, `statusExpression` and the helpers `assistant()`/`result()` removed (used only by the removed tests); 6 tests removed |
| `recipes/test/blackboard-held.test.ts` | the `parseTranscriptChunks` import and 1 test removed |

**Removed tests, per file, by name (count −7):**

`recipes/test/blackboard-export-file.test.ts` — 17 → 11 `it(` (−6):
1. `chunks` › "assemble needs contiguous chunks from 0 to the length; identical duplicates are fine"
2. `parseTranscriptChunks` › "reads the status and the chunk results of the key, in any order"
3. `parseTranscriptChunks` › "accepts t5-actor's wrapped lines ({t, m})"
4. `parseTranscriptChunks` › "records a truncated, errored or wrong-length chunk as an error, never as data"
5. `parseTranscriptChunks` › "accepts a short last chunk (asked past the end) and assembles to the status length"
6. `parseTranscriptChunks` › "ignores other keys and other tools"

`recipes/test/blackboard-held.test.ts` — 17 → 16 `it(` (−1):
7. "the MCP plan in hold mode (#103): no START, the held key" › "a transcript of that plan is read back on the held key"

Counted by `git show HEAD:<file> | grep -cE '^\s*it\('` vs the working file; `npx vitest run` on the two files: 27 passed
(11 + 16).

**S8.1's grep, verbatim** (`grep -rn "assemble-mcp\|transcript.ts" recipes docs/setup.md`):

```
recipes/blackboard/export-file.ts:4:// *Retired 2026-10-25 (Step 10 S8): was "pure helpers of export-grades.ts and assemble-mcp.ts … chunk ranges and
recipes/blackboard/export-file.ts:5:// reassembly", because the chunked MCP leg (assemble-mcp.ts, transcript.ts and `assemble()`) is retired — the MCP
recipes/blackboard/export-grades.ts:10:// *Retired 2026-10-25 (Step 10 S8): was "(`--mcp-plan`, then recipes/blackboard/assemble-mcp.ts)", because the
recipes/README.md:45:*Retired 2026-10-25 (Step 10 S8): `blackboard/assemble-mcp.ts` (rebuilt SDK-7's MCP leg from an actor's transcript into
recipes/README.md:46:`exports/<course>-<date>-mcp.json`) and `blackboard/transcript.ts` (transcript parsing), with `export-file.ts`'s
recipes/test/blackboard-export-file.test.ts:3:// recipes/blackboard/transcript.ts (the MCP leg of SDK-7 read back from a Claude transcript)", because the chunked
recipes/test/blackboard-export-file.test.ts:5:// tests left with assemble-mcp.ts, transcript.ts and `assemble()`.*
```

Every hit is inside a dated note (`export-file.ts` 4–7, `export-grades.ts` 10–13, `README.md` 45–50,
`blackboard-export-file.test.ts` 2–5); `docs/setup.md` has none.

### Item 2 — docs

- **`docs/setup.md`** (169 lines changed): §3 item 5 (upgrade note: reload + `/mcp`; what a pre-Step-10 extension
  answers); §5 tool table (the three trusted tools, `browser_focus_tab`, `browser_evaluate`'s `saveTo`/`overwrite`;
  dated note); §Locators (the MCP cap warning line); §Owners (popup of a background opener, Runs 14/15); §What you
  see ("nothing moves on its own" now names trusted input; the trusted-input bullet rewritten per S2's proposal, with
  MCPF-1R and F19); Writing a script (the `Tab` method list gains `evaluateToFile`; `pastSnapshotCap` + `on("warning")`
  after the locator paragraph (S3's text); `evaluateToFile` sentence; "What Claude sees" per S2's L430–431 proposal);
  Running JavaScript ("Not for bulk data" → the `saveTo` paragraph with the answer form, file rules, refusals, store,
  the test-device sentence and Run 15's measurements (S4's text, expanded); the JavaScript switch → `JS_DISABLED`);
  Safety (the R14-4b banner update; the post-redirect check now measured live, R14-5c; SAFE-3 / R15-3R update);
  Troubleshooting (`JS_DISABLED`; the trusted-input entry per S2's L922–923 proposal). Every change of a stated fact
  carries `*Superseded 2026-10-25: was X, because Y.*` (or `*Updated …*` where a fact was added, not replaced).
  **Code count:** setup.md states no code count anywhere (`grep -n "codes" docs/setup.md` → only line 401's "Other
  codes (`TAB_HELD`, …)"), so nothing to change there; the roadmap and README carry 26.
- **`recipes/README.md`:** the export-grades row (hold/drop, `--mcp-plan`, `saveTo`); the pure-parts row (`held.ts` in,
  `transcript.ts` out); `bb-login.ps1` row with `-WaitSec` (S5.md's text, checked against the param block
  `bb-login.ps1:87` and header steps 6, lines 48–59); `s9-redirect.py` threaded; new rows `s9-r14.ps1`, `s10.ts` +
  `s10-rules.ts`, `s10-r15.ps1`, `s10-win.ps1`, `s10-mem.ps1`, `s10-ret1.ts` + `s10-ret1.ps1`; the dated retirement note;
  `tsconfig.s10.json` in the typecheck block.
- **`README.md`:** no per-tool table exists; added a Step 10 paragraph (the tool-visible changes), test count 3273 / 132,
  Runs 14–15, Run 13 ratified (#202); a dated correction note.
- **`docs/e2e-test-plan.md`:** one dated note after §4.6's table (after row HIST-1, before §4.7) on TAB-5's "the only
  tool that changes what the human sees". No row, run record or §4.20–§4.22 text touched (`git diff` = 6 added lines).
- **`sdk/src/policy.ts`:** header comment lines 17–20 per S2's proposal (also "only the SDK's `Tab` focuses first"
  on line 17, false since S2), with a superseded note. No code change.
- **`docs/progress-and-roadmap.md`:** status line (Step 10 first, counts 23 tools / 26 codes / 3273 tests); milestone
  table rows Step 9 (closed, #202) and Step 10; the quality note; a new **Step 10 block** (what exists; tests per stage
  with commits from the as-built register, S8 = "this commit", 3273 / 132; the 7 removed tests; Run 14; Run 15).

**Quoted user-visible texts and their sources** (all copied from the code at the working tree):

| Text quoted in the docs | Source |
|---|---|
| `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.` | `mcp/src/tools/registry.ts:39-40` (`CAP_WARNING_LINE`); appended only by `capped()` on click/type/press_key/scroll/hover/select_option (`:507, 531, 545, 565, 568, 583, 603`) — hence "`browser_wait_for` gives no such line" |
| `Saved <path>` / `<bytes> bytes · <kind> · sha256 <hex>` | `mcp/src/tools/registry.ts:801`; `<kind>` = `"string" \| "json"` (`shared/src/protocol.ts:388`) |
| `browser_evaluate takes asRef or saveTo, not both — saveTo writes the value to a file, asRef returns a ref to an element` | `mcp/src/tools/registry.ts:795` |
| `Paging bulk data through browser_evaluate in chunks is a test device only, never a supported pattern: pass saveTo to write a large value to a file instead.` | `mcp/src/tools/registry.ts:761` (end of the description) |
| "up to 256 MiB", "without the result caps", "produce a very large value with `return …`" | `mcp/src/tools/registry.ts:761`; `extension/src/evaluate-save-store.ts:27,29` |
| store: 5 minutes, 8 values, 1 MiB slices | `extension/src/evaluate-save-store.ts:23-25` (`SAVE_CHUNK_BYTES`, `SAVE_TTL_MS`, `SAVE_MAX_ENTRIES`), `:10` |
| trusted tools "first bring the tab to the front of its window … and leave it there" (paraphrase of) `With trusted=true the tab is first brought to the front of its window (as browser_focus_tab does) and is left there.` | `mcp/src/tools/registry.ts:492, 514, 538` |
| `browser_focus_tab` row (paraphrase of) `Bring this session's tab … on screen and focus its window. Trusted browser_click/browser_type/browser_press_key focus the same way first; it does not change this session's tab.` | `mcp/src/tools/registry.ts:658`; the setup.md cell is S2.md's proposed wording |
| `pastSnapshotCap: true`; `{tab, method, kind: "pastSnapshotCap"}`; `client.on("warning", …)` | `shared/src/protocol.ts:466-477`; `sdk/src/tab.ts:48-52`; `sdk/src/client.ts:322` |
| `tab.evaluateToFile(expression, {path, overwrite?, timeoutMs?})` → `{path, bytes, kind, sha256}` | `sdk/src/tab.ts:328`; `sdk/src/evaluate-save.ts:27-45` |
| page-side refusals: `undefined`, function, symbol, `Map`, `Set`, DOM node → `BAD_PARAMS`; `JSON.stringify` throw → `PAGE_ERROR` | `sdk/src/tab.ts:319-326` (doc comment); `extension/src/evaluate/save.ts:10-13, 49-67, 113-114`; decisions #207 |
| `JS_DISABLED` (no `data`) | `extension/src/safety.ts:183` (`JS_DISABLED_MESSAGE`); setup.md § Safety already quoted it (S4b) |
| `unknown method: evaluateSaveStart` (an extension not reloaded since Step 9) | `extension/src/router.ts:111` at `f45e3bf` and now (`unknown method: ${msg.method}`); `sdk/src/evaluate-save.ts:165` sends `evaluateSaveStart` first; `daemon/src/methods.ts:28-30` forwards it. **By reading**, not run |
| bb-login: `-WaitSec` default 90, exit 0 / exit 4 rules, "at once if its window is gone", 12 s redirect | `recipes/bb-login.ps1:87` (param block), `:48-59` (header step 6); `recipes/fixtures/sso-submit-delayed.html:6,20` (12 000 ms) |
| Run figures (MCPF-1R 9/9, R14-4b 5 ms / 4.7–5.0 s, R14-5c, R15-3R ≤ 2 s, R15-POP-2 150 ms, SAVE sizes) | S1.md and S7.md verdict tables; as-built § S1, § S7; `S7-run-record.md:118` (SAVE-64) |

### Item 3 — `recipes/tsconfig.s6.json`'s errors

**Before the fix** (`npx tsc --noEmit -p recipes/tsconfig.s6.json` at `312cadb`): exit 2, **29** errors — 26 in
`extension/src/tabs.ts`, 3 in `extension/src/debugger.ts`, all `TS2304/TS2503 Cannot find name/namespace 'chrome'`.
(Earlier reports said 26: S3.md, S4.md:174–175, S4b.md — they predate `b55048d`.)

**Cause, with evidence.** `recipes/tsconfig.s6.json` includes `"test/*.test.ts"` and inherits `types: ["node"]` from
`recipes/tsconfig.json` (no `chrome`). That glob also matches Step 9's and Step 10's rule tests, which import
chrome-typed extension modules:
- `recipes/test/s9-rules.test.ts:14` `import { CAPTURE_MOVED_MESSAGE } from "../../extension/src/tabs.js";` — added in
  `e91e437` (2026-10-24, "test(e2e): S4 — wave helpers (Step 9)"; `git log -S'extension/src/tabs.js' --
  recipes/test/s9-rules.test.ts`; the line is absent at `e91e437^`). → the 26 `tabs.ts` errors.
- `recipes/test/s10-rules.test.ts:15` `import { evaluateSaveStart } from "../../extension/src/handlers/evaluate-save.js";`
  → `handlers/evaluate-save.ts` imports `../tabs.js` and `../debugger.js` (`tsc --explainFiles`) — added in `b55048d`
  (S7 prep; the file did not exist at `b55048d^`). → the 3 `debugger.ts` errors (the `tabs.ts` ones are reported once).
- Attribution measured with temporary tsconfigs extending `tsconfig.s6.json` (removed after): excluding only
  `s9-rules.test.ts` → 26 + 3 remain (s10 also reaches `tabs.ts`); excluding only `s10-rules.test.ts` → 26
  (`tabs.ts`); excluding both → 0.
Both tests are already covered by their own projects, which carry `"types": ["node", "chrome"]` and DOM libs:
`recipes/tsconfig.s9.json` includes `test/s9-rules.test.ts`, `recipes/tsconfig.s10.json` includes
`test/s10-rules.test.ts` and `test/s10-fixtures.test.ts`. No scratch worktree was needed (git history + the per-file
attribution suffice), so none was made.

**Fix (in the lane: `recipes/tsconfig*.json`):** `recipes/tsconfig.s6.json` gains
`"exclude": ["test/s9-rules.test.ts", "test/s10-rules.test.ts", "test/s10-fixtures.test.ts"]` — each s9/s10 test is
typechecked by exactly the project built for it. (`s10-fixtures.test.ts` did not error under s6; excluded for the same
rule — see Deviations.) Vitest does not read these tsconfigs, so `npm test` is unaffected.

**After — every recipes tsconfig** (`npx tsc --noEmit -p <f>`, S8's tree):

```
=== npx tsc --noEmit -p recipes/tsconfig.fe.json
exit 0
=== npx tsc --noEmit -p recipes/tsconfig.json
exit 0
=== npx tsc --noEmit -p recipes/tsconfig.s10.json
exit 0
=== npx tsc --noEmit -p recipes/tsconfig.s6.json
exit 0
=== npx tsc --noEmit -p recipes/tsconfig.s9.json
exit 0
```

(Before the fix, the same loop gave fe 0, json 0, s10 0, **s6 exit 2 (29 errors)**, s9 0.)

### Item 4 — CLAUDE.md proposals

`S8-claude-md-proposals.md`: (a) 27 candidate rows from S1, S2 (none — stale texts only), S4, S4b, S5, S7 and their
live-verifier sub-reports, each with source, kind and a recommendation (10 edits to existing bullets, 7 new bullets, 6
skips); (b) codes 25 → 26 (25 on the wire), router methods 23 → 26 (`evaluateSaveStart/Chunk/End`, verified against
`METHOD_CLASSES` now vs `f45e3bf`), tools 23 (unchanged), tests 3273 / 132, the 45-fixture correction (verified:
`snapshot-pre-s1.json` is an array of 45 at HEAD and at its only commit `e9e5e8c`), the new key files (from `git diff
--diff-filter=A 1c43887..HEAD`), the recipes map (retired files out), and a full Current state block for the session
agent.

## 2. Checks — tails with counts

**Before** (`npm test` at `312cadb`, nothing changed yet):
```
 Test Files  132 passed (132)
      Tests  3280 passed (3280)
   Duration  28.60s
exit 0
```
(= the brief's expected 3280 / 132.)

**After** (S8's tree; all code/test/tsconfig edits made before this run, only docs edited after):
```
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
exit 0
---
 Test Files  132 passed (132)
      Tests  3273 passed (3273)
   Duration  29.25s
exit 0
---
built daemon → dist/index.js
built mcp → dist/index.js
built extension → dist/
exit 0
```
`git status --porcelain` before and after `npm run build`: identical (the build changed no tracked file). Final
status: `M README.md`, `docs/e2e-test-plan.md`, `docs/progress-and-roadmap.md`, `docs/setup.md`, `recipes/README.md`,
`recipes/blackboard/{export-file,export-grades,held}.ts`, `recipes/test/blackboard-{export-file,held}.test.ts`,
`recipes/tsconfig.s6.json`, `sdk/src/policy.ts`; `D recipes/blackboard/{assemble-mcp,transcript}.ts`; untracked the two
S8 files plus the step agent's `S8.ledger.md` and `briefs/S8-builder.md`. Every tracked change is mine.

## 3. Deviations

1. **`exportFileName`'s `leg: "mcp"` kept.** Its only caller with `"mcp"` was `assemble-mcp.ts`; removing the option
   would change the `exportFileName` tests (not among the 7), so the count would move beyond 0.5's note. Kept, and
   the export-file.ts note says why. A later cleanup could drop it with its two test expectations.
2. **`--mcp-plan`'s printed lines unchanged.** 0.5 says its *help text* names `browser_evaluate {saveTo}`; the printed
   plan (`mcpPlanLines`, START/STATUS/CHUNK) is pinned byte for byte by `blackboard-held.test.ts`, so only the `HELP`
   constant and the header comments changed.
3. **`s10-fixtures.test.ts` also excluded from `tsconfig.s6`** though it did not error there: one rule (s9/s10 tests
   belong to their own projects). It stays checked by `tsconfig.s10.json` (exit 0).
4. **setup.md beyond the brief's list**, each a stated fact Step 10 measured: the R14-4b banner, the post-redirect
   check (R14-5c), SAFE-3 / R15-3R, the popup lease (R15-POP-2), and a §3 upgrade note. Each is a dated note; the
   old text stays readable in the note.
5. **e2e-test-plan.md: S2's "Proposed texts" give no wording for `:306`** (only the location, S2.md Findings); the note
   is mine, placed after §4.6's table, outside every row.
6. **Item 3's error count is 29, not 26** — `b55048d` (S7 prep) added the s10 import chain after S3/S4/S4b counted.

## 4. Proposed decisions

### 2026-10-25 · S8: the s9/s10 rule tests leave `tsconfig.s6.json`'s glob
**Decided:** `recipes/tsconfig.s6.json` excludes `test/s9-rules.test.ts`, `test/s10-rules.test.ts` and
`test/s10-fixtures.test.ts`; each is typechecked only by `tsconfig.s9.json` / `tsconfig.s10.json`, which carry the
chrome types. **Why:** the errors come from the glob, not from the code; both tests already pass under their own
projects; the fix stays in `recipes/`. **Instead of:** adding `"chrome"` and the DOM libs to `tsconfig.s6.json` (it
would then typecheck Step 8 recipes against browser globals they must not use); narrowing the glob to
`test/blackboard-*.test.ts` + `test/s6-rules.test.ts` (equivalent today, but a new non-s9/s10 test would silently miss
every project). **Revisit if:** a new recipes test imports chrome-typed extension code — it needs its own project or an
exclude here. **By:** Claude (S8 builder).

### 2026-10-25 · S8: `exportFileName`'s `"mcp"` leg stays after the retirement
**Decided:** keep the `leg: "mcp"` option and its tests. **Why:** 0.5's retirement set is exactly 7 tests; removing a
still-working helper option would remove or edit more. **Instead of:** dropping the option and editing the
`exportFileName` tests. **Revisit if:** the recipes are cleaned up after the user's rulings; then drop it with its test
expectations, documented. **By:** Claude (S8 builder).

## 5. Not done / not run

- Nothing live (by design). The setup.md sentence on a pre-Step-10 extension (`unknown method: evaluateSaveStart`) is
  by reading the code, not run.
- `CLAUDE.md`, `docs/decisions.md`, the as-built register: not edited (proposals file only).
- The roadmap's §5 (Roadmap) and §3 (Verified vs not verified) are not rewritten for Step 10 — the brief named "the
  Step 10 block"; the session agent may extend §5 at the close.
